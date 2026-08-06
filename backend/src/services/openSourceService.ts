import axios from "axios";
import crypto from "crypto";
import { Pool, PoolClient } from "pg";
import { CURATED_OPEN_SOURCE_PROJECTS } from "../data/openSourceProjects";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});
const POINTS: Record<string, number> = { starter: 8, standard: 15, advanced: 25, expert: 40 };

function headers() {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "PoWR-Open-Source-Network",
    ...(process.env.GITHUB_CATALOG_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_CATALOG_TOKEN}` } : {}),
  };
}

function hash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function githubTotal(response: any) {
  const link = String(response.headers?.link || "");
  const last = link.match(/[?&]page=(\d+)>; rel="last"/);
  return last ? Number(last[1]) : Array.isArray(response.data) ? response.data.length : 0;
}

function scoreIssue(issue: { title?: string; body?: string; comments?: number; created_at?: string }, labels: string[]) {
  const normalized = labels.map((label) => label.toLowerCase());
  const text = `${issue.title || ""} ${issue.body || ""}`.toLowerCase();
  let complexity = 2;
  if (normalized.some((label) => label.includes("good first") || label.includes("beginner") || label.includes("documentation"))) complexity = 1;
  if (normalized.some((label) => label.includes("enhancement") || label.includes("performance") || label.includes("refactor"))) complexity += 1;
  if (normalized.some((label) => label.includes("hard") || label.includes("expert") || label.includes("security") || label.includes("architecture"))) complexity = 4;
  if (/migration|concurrency|breaking change|distributed|compiler|security|performance/.test(text)) complexity += 1;
  if ((issue.comments || 0) >= 8) complexity += 1;
  if ((issue.body || "").length < 120) complexity -= 1;
  complexity = Math.max(1, Math.min(4, complexity));
  const level = (["starter", "standard", "advanced", "expert"] as const)[complexity - 1];
  const ageDays = issue.created_at ? Math.floor((Date.now() - new Date(issue.created_at).getTime()) / 86400000) : 0;
  const valueBonus = Math.min(10, Math.floor(Math.max(0, ageDays) / 90) * 2 + Math.min(4, issue.comments || 0));
  return { level, points: Math.min(50, POINTS[level] + valueBonus), complexity, value: Math.min(5, 1 + Math.floor(valueBonus / 2)) };
}

export class OpenSourceService {
  assertEnabled() {
    if (process.env.OPEN_SOURCE_NETWORK_ENABLED !== "true" && process.env.NODE_ENV === "production") {
      const error = new Error("Open Source Network is not enabled") as Error & { status?: number };
      error.status = 404;
      throw error;
    }
  }

  async seedCatalog() {
    for (const fullName of CURATED_OPEN_SOURCE_PROJECTS) {
      const [owner, name] = fullName.split("/");
      await pool.query(
        `INSERT INTO open_source_projects (github_full_name,owner,name,repository_url)
         VALUES ($1,$2,$3,$4) ON CONFLICT (github_full_name) DO NOTHING`,
        [fullName, owner, name, `https://github.com/${fullName}`],
      );
    }
  }

  async projects(filters: { q?: string; language?: string; partner?: boolean; page?: number; limit?: number }) {
    await this.seedCatalog();
    const values: unknown[] = [];
    const where = ["p.status='active'"];
    if (filters.q) {
      values.push(`%${filters.q}%`);
      where.push(`(p.github_full_name ILIKE $${values.length} OR p.description ILIKE $${values.length})`);
    }
    if (filters.language) {
      values.push(filters.language);
      where.push(`p.primary_language=$${values.length}`);
    }
    if (filters.partner !== undefined) {
      values.push(filters.partner);
      where.push(`p.partner=$${values.length}`);
    }
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, Math.min(50, filters.limit || 20));
    const count = await pool.query(`SELECT COUNT(*)::int AS total FROM open_source_projects p WHERE ${where.join(" AND ")}`, values);
    values.push(limit, (page - 1) * limit);
    const result = await pool.query(
      `SELECT p.*,
       (SELECT COUNT(*)::int FROM open_source_issues i WHERE i.project_id=p.id AND i.state='open' AND i.published) AS available_issue_count
       FROM open_source_projects p WHERE ${where.join(" AND ")}
       ORDER BY p.partner DESC,p.health_score DESC,p.stars DESC,p.github_full_name ASC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values,
    );
    const stale = result.rows.filter((row) => !row.last_synced_at).slice(0, limit);
    if (stale.length) {
      await Promise.all(stale.map(async (row) => {
        try {
          const repo = await axios.get(`https://api.github.com/repos/${row.github_full_name}`, { headers: headers() });
          Object.assign(row, {
            description: repo.data.description,
            primary_language: repo.data.language,
            topics: repo.data.topics || [],
            license_spdx: repo.data.license?.spdx_id,
            stars: repo.data.stargazers_count || 0,
            open_issues: repo.data.open_issues_count || 0,
            fork_count: repo.data.forks_count || 0,
            health_score: repo.data.archived ? 0 : Math.min(100, 40 + Math.round(Math.log10((repo.data.stargazers_count || 0) + 1) * 10)),
            last_synced_at: new Date().toISOString(),
          });
          await pool.query(`UPDATE open_source_projects SET description=$2,primary_language=$3,topics=$4,license_spdx=$5,
            stars=$6,open_issues=$7,fork_count=$8,health_score=$9,last_synced_at=NOW(),updated_at=NOW() WHERE id=$1`,
          [row.id, row.description, row.primary_language, row.topics, row.license_spdx, row.stars, row.open_issues, row.fork_count, row.health_score]);
        } catch { /* Keep the catalog available when GitHub throttles metadata requests. */ }
      }));
    }
    return { projects: result.rows, pagination: { page, limit, total: count.rows[0].total, pages: Math.ceil(count.rows[0].total / limit) } };
  }

  async weeklyRecommended(limit = 3) {
    await this.seedCatalog();
    const result = await pool.query(
      `SELECT p.*,(SELECT COUNT(*)::int FROM open_source_issues i WHERE i.project_id=p.id AND i.state='open' AND i.published) AS available_issue_count
       FROM open_source_projects p WHERE p.status='active'
       ORDER BY p.partner DESC,md5(p.github_full_name || to_char(date_trunc('week',NOW()),'IYYY-IW')) ASC LIMIT $1`,
      [Math.max(1, Math.min(3, limit))],
    );
    await Promise.all(result.rows.map(async (row) => {
      if (row.last_synced_at) return;
      try {
        const repo = await axios.get(`https://api.github.com/repos/${row.github_full_name}`, { headers: headers() });
        Object.assign(row, {
          description: repo.data.description,
          primary_language: repo.data.language,
          stars: repo.data.stargazers_count || 0,
          open_issues: repo.data.open_issues_count || 0,
          health_score: repo.data.archived ? 0 : Math.min(100, 40 + Math.round(Math.log10((repo.data.stargazers_count || 0) + 1) * 10)),
          last_synced_at: new Date().toISOString(),
        });
        await pool.query(`UPDATE open_source_projects SET description=$2,primary_language=$3,stars=$4,
          open_issues=$5,health_score=$6,last_synced_at=NOW(),updated_at=NOW() WHERE id=$1`,
        [row.id, row.description, row.primary_language, row.stars, row.open_issues, row.health_score]);
      } catch { /* Weekly recommendations still render if GitHub is unavailable. */ }
    }));
    return result.rows;
  }

  async searchGithub(query: string) {
    const q = query.trim();
    if (q.length < 2) return [];
    const response = await axios.get("https://api.github.com/search/repositories", {
      headers: headers(),
      params: { q: `${q} archived:false is:public`, sort: "stars", order: "desc", per_page: 12 },
    });
    const names = response.data.items.map((item: any) => item.full_name);
    const existing = names.length ? await pool.query("SELECT github_full_name,id,status FROM open_source_projects WHERE github_full_name=ANY($1)", [names]) : { rows: [] };
    const catalog = new Map(existing.rows.map((item: any) => [item.github_full_name.toLowerCase(), item]));
    return response.data.items.map((item: any) => ({
      github_full_name: item.full_name,
      description: item.description,
      repository_url: item.html_url,
      primary_language: item.language,
      stars: item.stargazers_count || 0,
      open_issues: item.open_issues_count || 0,
      forks: item.forks_count || 0,
      topics: item.topics || [],
      owner_avatar_url: item.owner?.avatar_url,
      already_listed: catalog.has(item.full_name.toLowerCase()),
      project_id: catalog.get(item.full_name.toLowerCase())?.id,
      nomination_eligible: true,
      instant_eligible: (item.stargazers_count || 0) >= 100,
    }));
  }

  async project(id: number): Promise<any> {
    const project = await pool.query("SELECT * FROM open_source_projects WHERE id=$1 AND status='active'", [id]);
    if (!project.rows[0]) return null;
    if (!project.rows[0].last_synced_at || (Number(project.rows[0].stars) > 0 && Number(project.rows[0].commit_count) === 0)) {
      try { return await this.sync(id); }
      catch (error: any) { console.warn(`[OPEN_SOURCE] Could not hydrate ${project.rows[0].github_full_name}: ${error.message}`); }
    }
    const issues = await pool.query(
      `SELECT * FROM open_source_issues WHERE project_id=$1 AND state='open' AND published
       ORDER BY street_points ASC,updated_at DESC`,
      [id],
    );
    const contributionStats = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE c.status='approved')::int AS verified_contributions,
       COUNT(DISTINCT c.developer_username) FILTER (WHERE c.status='approved')::int AS contributors,
       COALESCE(SUM(l.points) FILTER (WHERE c.status='approved'),0)::int AS awarded_points
       FROM open_source_claims c JOIN open_source_issues i ON i.id=c.issue_id
       LEFT JOIN street_point_ledger l ON l.claim_id=c.id WHERE i.project_id=$1`, [id]);
    return { ...project.rows[0], ...contributionStats.rows[0], issues: issues.rows };
  }

  async developerRepositories(username: string) {
    if (!/^[A-Za-z0-9-]{1,39}$/.test(username)) throw new Error("Invalid GitHub username");
    const token = process.env.GITHUB_CATALOG_TOKEN;
    let pinned: any[] = [];
    if (token) {
      try {
        const graph = await axios.post("https://api.github.com/graphql", {
          query: `query($login:String!){user(login:$login){pinnedItems(first:6,types:[REPOSITORY]){nodes{... on Repository{nameWithOwner description url stargazerCount forkCount primaryLanguage{name color} pushedAt isFork}}}}}`,
          variables: { login: username },
        }, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "PoWR-Repository-Analysis" } });
        pinned = (graph.data?.data?.user?.pinnedItems?.nodes || []).map((repo: any) => ({
          fullName: repo.nameWithOwner, description: repo.description, url: repo.url, stars: repo.stargazerCount,
          forks: repo.forkCount, language: repo.primaryLanguage?.name, languageColor: repo.primaryLanguage?.color,
          pushedAt: repo.pushedAt, fork: repo.isFork, pinned: true,
        }));
      } catch { pinned = []; }
    }
    const response = await axios.get(`https://api.github.com/users/${username}/repos`, {
      headers: headers(), params: { per_page: 100, sort: "pushed", direction: "desc", type: "owner" },
    });
    const active = response.data.filter((repo: any) => !repo.archived).map((repo: any) => ({
      fullName: repo.full_name, description: repo.description, url: repo.html_url, stars: repo.stargazers_count,
      forks: repo.forks_count, language: repo.language, pushedAt: repo.pushed_at, updatedAt: repo.updated_at,
      openIssues: repo.open_issues_count, fork: repo.fork, pinned: pinned.some((item) => item.fullName === repo.full_name),
      activityScore: Math.round(Math.max(0, 100 - (Date.now() - new Date(repo.pushed_at).getTime()) / 86400000) + Math.log10(repo.stargazers_count + 1) * 12),
    })).sort((a: any, b: any) => b.activityScore - a.activityScore).slice(0, 8);
    return { pinned, active, source: pinned.length ? "github-pinned-and-activity" : "public-activity" };
  }

  async sync(id: number): Promise<any> {
    const current = await pool.query("SELECT * FROM open_source_projects WHERE id=$1", [id]);
    const project = current.rows[0];
    if (!project) throw new Error("Project not found");
    const [repo, response, commits, pulls] = await Promise.all([
      axios.get(`https://api.github.com/repos/${project.github_full_name}`, { headers: headers() }),
      axios.get(`https://api.github.com/repos/${project.github_full_name}/issues`, { headers: headers(), params: { state: "open", per_page: 100, sort: "updated" } }),
      axios.get(`https://api.github.com/repos/${project.github_full_name}/commits`, { headers: headers(), params: { per_page: 1 } }).catch(() => ({ data: [], headers: {} })),
      axios.get(`https://api.github.com/repos/${project.github_full_name}/pulls`, { headers: headers(), params: { state: "all", per_page: 1 } }).catch(() => ({ data: [], headers: {} })),
    ]);
    await pool.query(
      `UPDATE open_source_projects SET description=$2,primary_language=$3,topics=$4,license_spdx=$5,
       stars=$6,open_issues=$7,contribution_guide_url=$8,health_score=$9,
       commit_count=$10,pull_request_count=$11,fork_count=$12,last_synced_at=NOW(),updated_at=NOW()
       WHERE id=$1`,
      [id, repo.data.description, repo.data.language, repo.data.topics || [], repo.data.license?.spdx_id,
        repo.data.stargazers_count || 0, repo.data.open_issues_count || 0,
        `https://github.com/${project.github_full_name}/blob/${repo.data.default_branch || "main"}/CONTRIBUTING.md`,
        repo.data.archived ? 0 : Math.min(100, 40 + Math.round(Math.log10((repo.data.stargazers_count || 0) + 1) * 10)),
        githubTotal(commits), githubTotal(pulls), repo.data.forks_count || 0],
    );
    for (const item of response.data.filter((issue: any) => !issue.pull_request)) {
      const labels = item.labels.map((label: any) => typeof label === "string" ? label : label.name);
      const rating = scoreIssue(item, labels);
      await pool.query(
        `INSERT INTO open_source_issues
         (project_id,github_issue_number,title,body_excerpt,issue_url,labels,assignee_login,difficulty,street_points,last_synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (project_id,github_issue_number) DO UPDATE SET
         title=EXCLUDED.title,body_excerpt=EXCLUDED.body_excerpt,labels=EXCLUDED.labels,
         assignee_login=EXCLUDED.assignee_login,difficulty=EXCLUDED.difficulty,
         street_points=EXCLUDED.street_points,state='open',last_synced_at=NOW(),updated_at=NOW()`,
        [id, item.number, item.title, String(item.body || "").slice(0, 1200), item.html_url, labels,
          item.assignee?.login || null, rating.level, rating.points],
      );
    }
    return this.project(id);
  }

  async nominate(username: string, fullName: string, reason?: string) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) throw new Error("Use owner/repository format");
    const github = await axios.get(`https://api.github.com/repos/${fullName}`, { headers: headers() });
    if (github.data.private || github.data.archived) throw new Error("Only active public repositories can be nominated");
    const autoApproved = Number(github.data.stargazers_count || 0) >= 100;
    const result = await pool.query(
      `INSERT INTO open_source_project_nominations (github_full_name,nominated_by_username,reason,status,review_reason,reviewed_at)
       VALUES ($1,$2,$3,$4,$5,CASE WHEN $4='approved' THEN NOW() ELSE NULL END)
       ON CONFLICT (github_full_name,nominated_by_username) DO UPDATE SET reason=EXCLUDED.reason,
       status=EXCLUDED.status,review_reason=EXCLUDED.review_reason,reviewed_at=EXCLUDED.reviewed_at
       RETURNING *`,
      [github.data.full_name, username, reason || null, autoApproved ? "approved" : "pending",
        autoApproved ? "Automatically admitted after GitHub verified 100 or more stars." : null],
    );
    let project = null;
    if (autoApproved) {
      const inserted = await pool.query(
        `INSERT INTO open_source_projects
         (github_full_name,owner,name,description,primary_language,topics,license_spdx,stars,open_issues,repository_url,status,health_score,last_synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active',$11,NOW())
         ON CONFLICT (github_full_name) DO UPDATE SET status='active',description=EXCLUDED.description,
         primary_language=EXCLUDED.primary_language,topics=EXCLUDED.topics,license_spdx=EXCLUDED.license_spdx,
         stars=EXCLUDED.stars,open_issues=EXCLUDED.open_issues,last_synced_at=NOW(),updated_at=NOW() RETURNING *`,
        [github.data.full_name, github.data.owner.login, github.data.name, github.data.description, github.data.language,
          github.data.topics || [], github.data.license?.spdx_id, github.data.stargazers_count || 0,
          github.data.open_issues_count || 0, github.data.html_url,
          Math.min(100, 40 + Math.round(Math.log10((github.data.stargazers_count || 0) + 1) * 10))],
      );
      project = inserted.rows[0];
    }
    return { nomination: result.rows[0], project, autoApproved };
  }

  async nominations() {
    const result = await pool.query(
      `SELECT * FROM open_source_project_nominations WHERE status='pending' ORDER BY created_at ASC`,
    );
    return result.rows;
  }

  async reviewNomination(recruiterId: number, nominationId: number, decision: "approved" | "rejected", reason: string) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE open_source_project_nominations SET status=$2,review_reason=$3,
         reviewed_by_recruiter_id=$4,reviewed_at=NOW() WHERE id=$1 AND status='pending' RETURNING *`,
        [nominationId, decision, reason, recruiterId],
      );
      const nomination = result.rows[0];
      if (!nomination) throw new Error("Pending nomination not found");
      if (decision === "approved") {
        const [owner, name] = nomination.github_full_name.split("/");
        await client.query(
          `INSERT INTO open_source_projects (github_full_name,owner,name,repository_url)
           VALUES ($1,$2,$3,$4) ON CONFLICT (github_full_name) DO UPDATE SET status='active',updated_at=NOW()`,
          [nomination.github_full_name, owner, name, `https://github.com/${nomination.github_full_name}`],
        );
      }
      await client.query("COMMIT");
      return nomination;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async configureProject(projectId: number, data: { partner?: boolean; partnerGuidance?: string; status?: string }) {
    const result = await pool.query(
      `UPDATE open_source_projects SET partner=COALESCE($2,partner),
       partner_guidance=COALESCE($3,partner_guidance),status=COALESCE($4,status),updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [projectId, data.partner ?? null, data.partnerGuidance ?? null, data.status ?? null],
    );
    if (!result.rows[0]) throw new Error("Project not found");
    return result.rows[0];
  }

  async claim(username: string, issueId: number) {
    const token = `powr_${crypto.randomBytes(24).toString("base64url")}`;
    const result = await pool.query(
      `INSERT INTO open_source_claims (issue_id,developer_username,token_hash,token_expires_at)
       SELECT i.id,$2,$3,NOW()+INTERVAL '30 days'
       FROM open_source_issues i JOIN open_source_projects p ON p.id=i.project_id
       WHERE i.id=$1 AND i.state='open' AND i.published AND p.status='active'
       ON CONFLICT (issue_id,developer_username) WHERE status NOT IN ('denied','revoked','expired','withdrawn')
       DO UPDATE SET token_hash=EXCLUDED.token_hash,token_expires_at=EXCLUDED.token_expires_at,updated_at=NOW()
       RETURNING id,issue_id,status,token_expires_at`,
      [issueId, username, hash(token)],
    );
    if (!result.rows[0]) throw new Error("Issue is unavailable");
    return { claim: result.rows[0], token, footer: `PoWR-Claim: ${token}` };
  }

  async verify(username: string, claimId: string, pullRequestUrl: string) {
    const match = pullRequestUrl.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)\/?$/);
    if (!match) throw new Error("Enter a valid public GitHub pull request URL");
    const found = await pool.query(
      `SELECT c.*,p.github_full_name FROM open_source_claims c
       JOIN open_source_issues i ON i.id=c.issue_id JOIN open_source_projects p ON p.id=i.project_id
       WHERE c.id=$1 AND c.developer_username=$2`,
      [claimId, username],
    );
    const claim = found.rows[0];
    if (!claim || claim.github_full_name.toLowerCase() !== match[1].toLowerCase()) throw new Error("Pull request does not match the claim");
    if (claim.pull_request_url && claim.pull_request_url !== pullRequestUrl) throw new Error("This claim token is already linked to another pull request");
    const response = await axios.get(`https://api.github.com/repos/${match[1]}/pulls/${match[2]}`, { headers: headers() });
    const pr = response.data;
    const token = String(pr.body || "").match(/PoWR-Claim:\s*(powr_[A-Za-z0-9_-]+)/i)?.[1];
    if (!token || hash(token) !== claim.token_hash) throw new Error("Matching PoWR claim token not found");
    if (pr.user?.login?.toLowerCase() !== username.toLowerCase()) throw new Error("Pull request author does not match your GitHub identity");
    const snapshot = {
      url: pr.html_url, title: pr.title, merged: Boolean(pr.merged_at), mergedAt: pr.merged_at,
      additions: pr.additions, deletions: pr.deletions, changedFiles: pr.changed_files,
      commits: pr.commits, author: pr.user?.login, base: pr.base?.ref, head: pr.head?.ref,
    };
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query("SELECT * FROM open_source_claims WHERE id=$1 AND developer_username=$2 FOR UPDATE", [claimId, username]);
      const current = locked.rows[0];
      if (!current) throw new Error("Claim not found");
      if (current.pull_request_url && current.pull_request_url !== pr.html_url) throw new Error("This claim token is already linked to another pull request");
      if (["denied", "revoked", "withdrawn", "expired"].includes(current.status)) throw new Error("This claim is no longer active");

      const merged = Boolean(pr.merged_at);
      let awardedPoints = 0;
      let status = merged ? "approved" : "pr_open";
      if (merged) {
        awardedPoints = await this.award(client, current, `Automatically awarded for verified merged PR ${pr.html_url}`);
      }
      const updated = await client.query(
        `UPDATE open_source_claims SET pull_request_url=$3,pull_request_number=$4,pull_request_author=$5,
         merge_commit_sha=$6,verification_snapshot=$7,status=$8,
         review_reason=CASE WHEN $8='approved' THEN $9 ELSE review_reason END,
         reviewed_at=CASE WHEN $8='approved' THEN NOW() ELSE reviewed_at END,updated_at=NOW()
         WHERE id=$1 AND developer_username=$2 RETURNING *`,
        [claimId, username, pr.html_url, Number(match[2]), pr.user?.login, pr.merge_commit_sha, JSON.stringify(snapshot), status,
          `System verified the merged PR and awarded ${awardedPoints} Street Points.`],
      );
      await client.query("COMMIT");
      return { ...updated.rows[0], awarded_points: awardedPoints };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async claims(username: string) {
    const result = await pool.query(
      `SELECT c.id,c.status,c.pull_request_url,c.pull_request_number,c.review_reason,c.token_expires_at,c.created_at,c.updated_at,
       i.id AS issue_id,i.title AS issue_title,i.issue_url,i.street_points,i.difficulty,p.id AS project_id,p.github_full_name,p.partner,
       COALESCE((SELECT SUM(l.points)::int FROM street_point_ledger l WHERE l.claim_id=c.id),0) AS awarded_points
       FROM open_source_claims c JOIN open_source_issues i ON i.id=c.issue_id
       JOIN open_source_projects p ON p.id=i.project_id WHERE c.developer_username=$1 ORDER BY c.created_at DESC`,
      [username],
    );
    return result.rows;
  }

  async withdraw(username: string, claimId: string) {
    const result = await pool.query(
      `UPDATE open_source_claims SET status='withdrawn',updated_at=NOW()
       WHERE id=$1 AND developer_username=$2 AND status IN ('interested','pr_open') RETURNING id,status`,
      [claimId, username],
    );
    if (!result.rows[0]) throw new Error("Claim cannot be withdrawn");
    return result.rows[0];
  }

  async appeal(username: string, claimId: string, reason: string) {
    if (reason.trim().length < 20) throw new Error("Appeal reason must be at least 20 characters");
    const result = await pool.query(
      `INSERT INTO open_source_appeals (claim_id,developer_username,reason)
       SELECT id,$2,$3 FROM open_source_claims
       WHERE id=$1 AND developer_username=$2 AND status IN ('denied','revoked')
       RETURNING *`,
      [claimId, username, reason.trim()],
    );
    if (!result.rows[0]) throw new Error("Only denied or revoked claims can be appealed");
    return result.rows[0];
  }

  async profile(username: string) {
    const summary = await pool.query(
      `SELECT COALESCE(SUM(points),0)::int AS street_points,
       COUNT(DISTINCT claim_id) FILTER (WHERE points>0)::int AS approved_contributions
       FROM street_point_ledger WHERE developer_username=$1`,
      [username],
    );
    const contributions = await pool.query(
      `SELECT c.pull_request_url,c.review_reason,c.reviewed_at,i.title AS issue_title,i.difficulty,
       i.street_points,p.github_full_name,p.partner FROM open_source_claims c
       JOIN open_source_issues i ON i.id=c.issue_id JOIN open_source_projects p ON p.id=i.project_id
       WHERE c.developer_username=$1 AND c.status='approved' ORDER BY c.reviewed_at DESC LIMIT 20`,
      [username],
    );
    return { ...summary.rows[0], contributions: contributions.rows };
  }

  async queue() {
    const result = await pool.query(
      `SELECT c.id,c.developer_username,c.pull_request_url,c.verification_snapshot,c.updated_at,
       i.title AS issue_title,i.street_points,i.difficulty,p.github_full_name
       FROM open_source_claims c JOIN open_source_issues i ON i.id=c.issue_id
       JOIN open_source_projects p ON p.id=i.project_id
       WHERE c.status IN ('needs_information','denied','revoked') ORDER BY c.updated_at ASC`,
    );
    return result.rows;
  }

  async review(recruiterId: number, claimId: string, decision: string, reason: string, privateNotes?: string) {
    if (!["denied", "needs_information", "revoked"].includes(decision)) throw new Error("Street Points are awarded automatically when a claimed PR is verified as merged");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT c.*,i.street_points FROM open_source_claims c JOIN open_source_issues i ON i.id=c.issue_id
         WHERE c.id=$1 FOR UPDATE`,
        [claimId],
      );
      const claim = result.rows[0];
      if (!claim) throw new Error("Claim not found");
      if (decision === "revoked") {
        if (claim.status !== "approved") throw new Error("Only automatically awarded contributions can be revoked");
        await this.reverse(client, claim, reason);
      }
      await client.query(
        `UPDATE open_source_claims SET status=$2,review_reason=$3,private_review_notes=$4,
         reviewed_by_recruiter_id=$5,reviewed_at=NOW(),updated_at=NOW() WHERE id=$1`,
        [claimId, decision, reason, privateNotes || null, recruiterId],
      );
      await client.query("COMMIT");
      return { id: claimId, status: decision };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  private async award(client: PoolClient, claim: any, reason: string): Promise<number> {
    const existing = await client.query("SELECT points FROM street_point_ledger WHERE claim_id=$1 AND points>0 LIMIT 1", [claim.id]);
    if (existing.rows[0]) return Number(existing.rows[0].points);
    const monthly = await client.query(
      `SELECT COALESCE(SUM(ABS(points)),0)::int total FROM street_point_ledger
       WHERE developer_username=$1 AND created_at>=NOW()-INTERVAL '30 days'`,
      [claim.developer_username],
    );
    const points = Math.min(claim.street_points, Math.max(0, 60 - monthly.rows[0].total));
    if (!points) return 0;
    const awarded = await client.query(
      `INSERT INTO street_point_ledger (developer_username,claim_id,points,reason)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING points`,
      [claim.developer_username, claim.id, points, reason],
    );
    return Number(awarded.rows[0]?.points || 0);
  }

  private async reverse(client: PoolClient, claim: any, reason: string) {
    const award = await client.query("SELECT * FROM street_point_ledger WHERE claim_id=$1 AND points>0 LIMIT 1", [claim.id]);
    if (award.rows[0]) {
      await client.query(
        `INSERT INTO street_point_ledger (developer_username,points,reason,offsets_entry_id)
         VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [claim.developer_username, -award.rows[0].points, reason, award.rows[0].id],
      );
    }
  }
}

export const openSourceService = new OpenSourceService();
