import axios from "axios";
import crypto from "crypto";
import { Pool, PoolClient } from "pg";
import { CURATED_OPEN_SOURCE_PROJECTS } from "../data/openSourceProjects";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});
const POINTS: Record<string, number> = { starter: 5, standard: 10, advanced: 20, expert: 30 };

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

function difficulty(labels: string[]) {
  const normalized = labels.map((label) => label.toLowerCase());
  if (normalized.some((label) => label.includes("good first") || label.includes("beginner"))) return "starter";
  if (normalized.some((label) => label.includes("hard") || label.includes("expert"))) return "expert";
  if (normalized.some((label) => label.includes("enhancement") || label.includes("performance"))) return "advanced";
  return "standard";
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

  async projects(filters: { q?: string; language?: string; partner?: boolean }) {
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
    const result = await pool.query(
      `SELECT p.*,
       (SELECT COUNT(*)::int FROM open_source_issues i WHERE i.project_id=p.id AND i.state='open' AND i.published) AS available_issue_count
       FROM open_source_projects p WHERE ${where.join(" AND ")}
       ORDER BY p.partner DESC,p.health_score DESC,p.stars DESC,p.github_full_name ASC LIMIT 100`,
      values,
    );
    return result.rows;
  }

  async project(id: number) {
    const project = await pool.query("SELECT * FROM open_source_projects WHERE id=$1 AND status='active'", [id]);
    if (!project.rows[0]) return null;
    const issues = await pool.query(
      `SELECT * FROM open_source_issues WHERE project_id=$1 AND state='open' AND published
       ORDER BY street_points ASC,updated_at DESC`,
      [id],
    );
    return { ...project.rows[0], issues: issues.rows };
  }

  async sync(id: number) {
    const current = await pool.query("SELECT * FROM open_source_projects WHERE id=$1", [id]);
    const project = current.rows[0];
    if (!project) throw new Error("Project not found");
    const repo = await axios.get(`https://api.github.com/repos/${project.github_full_name}`, { headers: headers() });
    const response = await axios.get(`https://api.github.com/repos/${project.github_full_name}/issues`, {
      headers: headers(),
      params: { state: "open", per_page: 100, sort: "updated" },
    });
    await pool.query(
      `UPDATE open_source_projects SET description=$2,primary_language=$3,topics=$4,license_spdx=$5,
       stars=$6,open_issues=$7,contribution_guide_url=$8,health_score=$9,last_synced_at=NOW(),updated_at=NOW()
       WHERE id=$1`,
      [id, repo.data.description, repo.data.language, repo.data.topics || [], repo.data.license?.spdx_id,
        repo.data.stargazers_count || 0, repo.data.open_issues_count || 0,
        `https://github.com/${project.github_full_name}/blob/${repo.data.default_branch || "main"}/CONTRIBUTING.md`,
        repo.data.archived ? 0 : Math.min(100, 40 + Math.round(Math.log10((repo.data.stargazers_count || 0) + 1) * 10))],
    );
    for (const item of response.data.filter((issue: any) => !issue.pull_request)) {
      const labels = item.labels.map((label: any) => typeof label === "string" ? label : label.name);
      const level = difficulty(labels);
      await pool.query(
        `INSERT INTO open_source_issues
         (project_id,github_issue_number,title,body_excerpt,issue_url,labels,assignee_login,difficulty,street_points,last_synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
         ON CONFLICT (project_id,github_issue_number) DO UPDATE SET
         title=EXCLUDED.title,body_excerpt=EXCLUDED.body_excerpt,labels=EXCLUDED.labels,
         assignee_login=EXCLUDED.assignee_login,difficulty=EXCLUDED.difficulty,
         street_points=EXCLUDED.street_points,state='open',last_synced_at=NOW(),updated_at=NOW()`,
        [id, item.number, item.title, String(item.body || "").slice(0, 1200), item.html_url, labels,
          item.assignee?.login || null, level, POINTS[level]],
      );
    }
    return this.project(id);
  }

  async nominate(username: string, fullName: string, reason?: string) {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) throw new Error("Use owner/repository format");
    const result = await pool.query(
      `INSERT INTO open_source_project_nominations (github_full_name,nominated_by_username,reason)
       VALUES ($1,$2,$3)
       ON CONFLICT (github_full_name,nominated_by_username) DO UPDATE SET reason=EXCLUDED.reason
       RETURNING *`,
      [fullName, username, reason || null],
    );
    return result.rows[0];
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
    const response = await axios.get(`https://api.github.com/repos/${match[1]}/pulls/${match[2]}`, { headers: headers() });
    const pr = response.data;
    const token = String(pr.body || "").match(/PoWR-Claim:\s*(powr_[A-Za-z0-9_-]+)/i)?.[1];
    if (!token || hash(token) !== claim.token_hash) throw new Error("Matching PoWR claim token not found");
    if (pr.user?.login?.toLowerCase() !== username.toLowerCase()) throw new Error("Pull request author does not match your GitHub identity");
    const status = pr.merged_at ? "merged_pending_review" : "pr_open";
    const snapshot = {
      url: pr.html_url, title: pr.title, merged: Boolean(pr.merged_at), mergedAt: pr.merged_at,
      additions: pr.additions, deletions: pr.deletions, changedFiles: pr.changed_files,
      commits: pr.commits, author: pr.user?.login, base: pr.base?.ref, head: pr.head?.ref,
    };
    const updated = await pool.query(
      `UPDATE open_source_claims SET pull_request_url=$3,pull_request_number=$4,pull_request_author=$5,
       merge_commit_sha=$6,verification_snapshot=$7,status=$8,updated_at=NOW()
       WHERE id=$1 AND developer_username=$2 RETURNING *`,
      [claimId, username, pr.html_url, Number(match[2]), pr.user?.login, pr.merge_commit_sha, JSON.stringify(snapshot), status],
    );
    return updated.rows[0];
  }

  async claims(username: string) {
    const result = await pool.query(
      `SELECT c.id,c.status,c.pull_request_url,c.review_reason,c.token_expires_at,c.created_at,
       i.title AS issue_title,i.issue_url,i.street_points,i.difficulty,p.github_full_name,p.partner
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
       WHERE c.status IN ('merged_pending_review','needs_information') ORDER BY c.updated_at ASC`,
    );
    return result.rows;
  }

  async review(recruiterId: number, claimId: string, decision: string, reason: string, privateNotes?: string) {
    if (!["approved", "denied", "needs_information", "revoked"].includes(decision)) throw new Error("Invalid decision");
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
      if (decision === "approved") {
        if (claim.status !== "merged_pending_review") throw new Error("Only merged contributions can be approved");
        await this.award(client, claim, reason);
      }
      if (decision === "revoked") await this.reverse(client, claim, reason);
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

  private async award(client: PoolClient, claim: any, reason: string) {
    const monthly = await client.query(
      `SELECT COALESCE(SUM(ABS(points)),0)::int total FROM street_point_ledger
       WHERE developer_username=$1 AND created_at>=NOW()-INTERVAL '30 days'`,
      [claim.developer_username],
    );
    const points = Math.min(claim.street_points, Math.max(0, 60 - monthly.rows[0].total));
    if (!points) throw new Error("Rolling Street Point cap reached");
    await client.query(
      `INSERT INTO street_point_ledger (developer_username,claim_id,points,reason)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [claim.developer_username, claim.id, points, reason],
    );
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
