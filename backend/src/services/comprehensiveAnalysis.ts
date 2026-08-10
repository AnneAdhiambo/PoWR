import axios from "axios";
import { GitHubService, GitHubRepo, GitHubRepoLanguages } from "./githubService";

export interface RepoAnalysis {
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  languages: GitHubRepoLanguages;
  stars: number;
  forks: number;
  createdAt: string;
  pushedAt: string;
  topics: string[];
  commitCount: number;
  role: "owner" | "fork-maintainer";
  isFork: boolean;
  archived: boolean;
  defaultBranch: string;
  license: string | null;
  sizeKb: number;
  openIssues: number;
  watchers: number;
  daysSincePush: number;
  activityScore: number;
  evidenceScore: number;
  evidenceSignals: string[];
}

export interface DeveloperProfile {
  username: string;
  totalRepos: number;
  totalCommits: number;
  totalPRs: number;
  totalMergedPRs: number;
  totalIssues: number;
  totalAdditions: number;
  totalDeletions: number;
  totalStars: number;
  accountAge: number; // years
  topLanguages: { language: string; bytes: number; percentage: number }[];
  repos: RepoAnalysis[];
  recentActivity: {
    commitsLast30Days: number;
    prsLast30Days: number;
    activeDays: number;
  };
  skillScores: {
    backend: number;
    frontend: number;
    devops: number;
    systems: number;
    overall: number;
  };
  confidence: number;
  analysisMethod: "ai" | "heuristic";
}

export class ComprehensiveAnalysisService {
  private accessToken: string;
  private geminiApiKey: string | null;
  private onProgress?: (stage: string, message: string, progress: number) => void | Promise<void>;

  constructor(
    accessToken: string,
    onProgress?: (stage: string, message: string, progress: number) => void | Promise<void>,
  ) {
    this.accessToken = accessToken;
    this.geminiApiKey = process.env.GEMINI_API_KEY || null;
    this.onProgress = onProgress;
  }

  private async reportProgress(stage: string, message: string, progress: number) {
    await this.onProgress?.(stage, message, progress);
  }

  private async githubRequest(url: string, params: any = {}) {
    const response = await axios.get(url, {
      params,
      headers: {
        Authorization: `token ${this.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    return response.data;
  }

  async analyzeUser(username: string, monthsBack: number = 12): Promise<DeveloperProfile> {
    console.log(`[ANALYSIS] Starting comprehensive analysis for ${username}`);
    await this.reportProgress("github", "Reading your public GitHub activity…", 12);

    // Fetch everything in parallel for speed
    const [
      userInfo,
      repos,
      events,
      searchPRs,
      searchCommits,
      searchIssues,
    ] = await Promise.all([
      this.fetchUserInfo(username),
      this.fetchUserRepos(username),
      this.fetchUserEvents(username),
      this.searchUserPRs(username),
      this.searchUserCommits(username),
      this.searchUserIssues(username),
    ]);

    await this.reportProgress("repositories", `Reviewing ${repos.length} repositories and contribution history…`, 30);

    console.log(`[ANALYSIS] User: ${username}, Account created: ${userInfo.created_at}`);
    console.log(`[ANALYSIS] Repos: ${repos.length}, Events: ${events.length}`);
    console.log(`[ANALYSIS] Search results - PRs: ${searchPRs.total}, Commits: ${searchCommits.total}, Issues: ${searchIssues.total}`);

    // Calculate account age
    const accountAge = Math.floor(
      (Date.now() - new Date(userInfo.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    // Analyze repos with languages
    const ownedRepos = repos.filter((r: any) => r.owner.login.toLowerCase() === username.toLowerCase() && !r.archived);
    const repoAnalyses = await this.analyzeRepos(ownedRepos, username);
    await this.reportProgress("languages", "Mapping languages and engineering activity…", 50);
    
    // Aggregate languages
    const { topLanguages, totalBytes } = this.aggregateLanguages(repoAnalyses);
    console.log(`[ANALYSIS] Languages: ${topLanguages.slice(0, 5).map(l => `${l.language}(${l.percentage}%)`).join(', ')}`);

    // Count commits from events (more accurate for recent activity)
    const { commitsFromEvents, prsFromEvents, activeDays } = this.analyzeEvents(events, username);
    
    // Use search API totals (these are accurate)
    const totalCommits = searchCommits.total;
    const totalPRs = searchPRs.total;
    const totalMergedPRs = searchPRs.merged;
    const totalIssues = searchIssues.total;

    console.log(`[ANALYSIS] Totals - Commits: ${totalCommits}, PRs: ${totalPRs} (${totalMergedPRs} merged), Issues: ${totalIssues}`);

    // Calculate total stars
    const totalStars = repoAnalyses.reduce((sum, r) => sum + r.stars, 0);

    // Estimate additions/deletions from recent commits
    const { additions, deletions } = await this.estimateCodeChanges(username, events);
    await this.reportProgress("scoring", "Calculating contribution depth and delivery signals…", 64);

    // Calculate skill scores
    let skillScores: DeveloperProfile["skillScores"];
    let confidence: number;
    let analysisMethod: "ai" | "heuristic";

    const analysisData = {
      username,
      repos: repoAnalyses,
      topLanguages,
      totalCommits,
      totalPRs,
      totalMergedPRs,
      totalIssues,
      totalStars,
      accountAge,
      additions,
      deletions,
    };

    if (this.geminiApiKey) {
      try {
        await this.reportProgress("ai_analysis", "Building your evidence-based skill profile…", 70);
        const aiResult = await this.analyzeWithAI(analysisData);
        skillScores = aiResult.scores;
        confidence = aiResult.confidence;
        analysisMethod = "ai";
        console.log(`[ANALYSIS] AI scores: ${JSON.stringify(skillScores)}`);
      } catch (error) {
        console.error(`[ANALYSIS] AI failed:`, error);
        const result = this.analyzeWithHeuristics(analysisData);
        skillScores = result.scores;
        confidence = result.confidence;
        analysisMethod = "heuristic";
      }
    } else {
      const result = this.analyzeWithHeuristics(analysisData);
      skillScores = result.scores;
      confidence = result.confidence;
      analysisMethod = "heuristic";
    }

    await this.reportProgress("profile", "Preparing your PoWR profile…", 78);

    return {
      username,
      totalRepos: repoAnalyses.length,
      totalCommits,
      totalPRs,
      totalMergedPRs,
      totalIssues,
      totalAdditions: additions,
      totalDeletions: deletions,
      totalStars,
      accountAge,
      topLanguages,
      repos: repoAnalyses,
      recentActivity: {
        commitsLast30Days: commitsFromEvents,
        prsLast30Days: prsFromEvents,
        activeDays,
      },
      skillScores,
      confidence,
      analysisMethod,
    };
  }

  private async fetchUserInfo(username: string) {
    return this.githubRequest(`https://api.github.com/users/${username}`);
  }

  private async fetchUserRepos(username: string) {
    return this.githubRequest(`https://api.github.com/users/${username}/repos`, {
      sort: "updated",
      per_page: 100,
      type: "owner",
    });
  }

  private async fetchUserEvents(username: string) {
    try {
      return await this.githubRequest(`https://api.github.com/users/${username}/events/public`, {
        per_page: 100,
      });
    } catch {
      return [];
    }
  }

  private async searchUserPRs(username: string) {
    try {
      // Search for all PRs by user
      const allPRs = await this.githubRequest(`https://api.github.com/search/issues`, {
        q: `author:${username} type:pr`,
        per_page: 1,
      });
      
      // Search for merged PRs
      const mergedPRs = await this.githubRequest(`https://api.github.com/search/issues`, {
        q: `author:${username} type:pr is:merged`,
        per_page: 1,
      });

      return {
        total: allPRs.total_count || 0,
        merged: mergedPRs.total_count || 0,
      };
    } catch (error) {
      console.error(`[ANALYSIS] PR search failed:`, error);
      return { total: 0, merged: 0 };
    }
  }

  private async searchUserCommits(username: string) {
    try {
      const result = await this.githubRequest(`https://api.github.com/search/commits`, {
        q: `author:${username}`,
        per_page: 1,
      });
      return { total: result.total_count || 0 };
    } catch (error) {
      console.error(`[ANALYSIS] Commit search failed:`, error);
      return { total: 0 };
    }
  }

  private async searchUserIssues(username: string) {
    try {
      const result = await this.githubRequest(`https://api.github.com/search/issues`, {
        q: `author:${username} type:issue`,
        per_page: 1,
      });
      return { total: result.total_count || 0 };
    } catch (error) {
      return { total: 0 };
    }
  }

  private async analyzeRepos(repos: any[], username: string): Promise<RepoAnalysis[]> {
    const analyses: RepoAnalysis[] = [];
    
    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < repos.length; i += batchSize) {
      const batch = repos.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (repo) => {
          const [owner, repoName] = repo.full_name.split("/");
          let languages = {};
          let commitCount = 0;

          try {
            languages = await this.githubRequest(
              `https://api.github.com/repos/${owner}/${repoName}/languages`
            );
          } catch {}

          try {
            // Get commit count for this repo
            const commits = await this.githubRequest(
              `https://api.github.com/repos/${owner}/${repoName}/commits`,
              { author: username, per_page: 100 }
            );
            commitCount = Array.isArray(commits) ? commits.length : 0;
          } catch {}

          return {
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            language: repo.language,
            languages,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            createdAt: repo.created_at,
            pushedAt: repo.pushed_at,
            topics: repo.topics || [],
            commitCount,
            role: repo.fork ? "fork-maintainer" as const : "owner" as const,
            isFork: Boolean(repo.fork),
            archived: Boolean(repo.archived),
            defaultBranch: repo.default_branch || "main",
            license: repo.license?.spdx_id || null,
            sizeKb: repo.size || 0,
            openIssues: repo.open_issues_count || 0,
            watchers: repo.subscribers_count || repo.watchers_count || 0,
            ...this.repositoryEvidence(repo, languages, commitCount),
          };
        })
      );
      analyses.push(...results);
    }

    return analyses;
  }

  private repositoryEvidence(repo: any, languages: GitHubRepoLanguages, commitCount: number) {
    const pushedAt = new Date(repo.pushed_at || repo.updated_at || 0).getTime();
    const daysSincePush = Math.max(0, Math.floor((Date.now() - pushedAt) / 86400000));
    const languageCount = Object.keys(languages).length;
    const signals: string[] = [];
    let evidenceScore = 15;
    if (daysSincePush <= 30) { evidenceScore += 20; signals.push("active in the last 30 days"); }
    else if (daysSincePush <= 180) { evidenceScore += 10; signals.push("active in the last six months"); }
    if (commitCount >= 20) { evidenceScore += 20; signals.push("sustained commit history"); }
    else if (commitCount >= 5) { evidenceScore += 10; signals.push("repeat contribution history"); }
    if (languageCount >= 3) { evidenceScore += 8; signals.push("multi-language implementation"); }
    if ((repo.stargazers_count || 0) >= 10) { evidenceScore += 7; signals.push("external adoption signal"); }
    if ((repo.forks_count || 0) >= 3) { evidenceScore += 5; signals.push("downstream reuse signal"); }
    if (repo.has_issues) { evidenceScore += 5; signals.push("public issue workflow"); }
    if (repo.license?.spdx_id) { evidenceScore += 5; signals.push("declared open-source license"); }
    if (repo.archived) { evidenceScore -= 30; signals.push("archived repository"); }
    if (repo.fork) { evidenceScore -= 5; signals.push("fork; authorship requires commit-level evidence"); }
    const activityScore = Math.max(0, Math.min(100, Math.round(100 - Math.min(100, daysSincePush / 3) + Math.log10((commitCount || 0) + 1) * 8)));
    return { daysSincePush, activityScore, evidenceScore: Math.max(0, Math.min(100, evidenceScore)), evidenceSignals: signals };
  }

  private aggregateLanguages(repos: RepoAnalysis[]) {
    const languageBytes: { [key: string]: number } = {};
    let totalBytes = 0;

    for (const repo of repos) {
      for (const [lang, bytes] of Object.entries(repo.languages)) {
        languageBytes[lang] = (languageBytes[lang] || 0) + (bytes as number);
        totalBytes += bytes as number;
      }
    }

    const topLanguages = Object.entries(languageBytes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([language, bytes]) => ({
        language,
        bytes,
        percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
      }));

    return { topLanguages, totalBytes };
  }

  private analyzeEvents(events: any[], username: string) {
    let commitsFromEvents = 0;
    let prsFromEvents = 0;
    const activeDaysSet = new Set<string>();

    for (const event of events) {
      const date = new Date(event.created_at).toISOString().split("T")[0];
      activeDaysSet.add(date);

      if (event.type === "PushEvent") {
        commitsFromEvents += event.payload?.commits?.length || 0;
      } else if (event.type === "PullRequestEvent") {
        prsFromEvents++;
      }
    }

    return {
      commitsFromEvents,
      prsFromEvents,
      activeDays: activeDaysSet.size,
    };
  }

  private async estimateCodeChanges(username: string, events: any[]) {
    let additions = 0;
    let deletions = 0;

    // Sample a few recent commits to estimate
    const pushEvents = events.filter((e) => e.type === "PushEvent").slice(0, 5);
    
    for (const event of pushEvents) {
      const commits = event.payload?.commits || [];
      for (const commit of commits.slice(0, 3)) {
        try {
          const repoName = event.repo?.name;
          if (!repoName) continue;
          
          const details = await this.githubRequest(
            `https://api.github.com/repos/${repoName}/commits/${commit.sha}`
          );
          additions += details.stats?.additions || 0;
          deletions += details.stats?.deletions || 0;
        } catch {}
      }
    }

    // Extrapolate based on total commits
    const sampledCommits = pushEvents.reduce((sum, e) => sum + Math.min(3, e.payload?.commits?.length || 0), 0);
    if (sampledCommits > 0) {
      const avgAdditions = additions / sampledCommits;
      const avgDeletions = deletions / sampledCommits;
      // Estimate for recent activity (last 90 days worth)
      const estimatedCommits = events.filter((e) => e.type === "PushEvent")
        .reduce((sum, e) => sum + (e.payload?.commits?.length || 0), 0);
      additions = Math.round(avgAdditions * estimatedCommits);
      deletions = Math.round(avgDeletions * estimatedCommits);
    }

    return { additions, deletions };
  }

  private async analyzeWithAI(data: any): Promise<{ scores: DeveloperProfile["skillScores"]; confidence: number }> {
    const repoSummaries = data.repos.slice(0, 10).map((r: any) => ({
      name: r.name,
      description: r.description?.slice(0, 100),
      language: r.language,
      stars: r.stars,
      commits: r.commitCount,
    }));

    const prompt = `Analyze this GitHub developer profile and provide skill scores (0-100).

## Developer: ${data.username}
- Account Age: ${data.accountAge} years
- Total Repositories: ${data.repos.length}
- Total Commits (all-time): ${data.totalCommits.toLocaleString()}
- Total PRs: ${data.totalPRs} (${data.totalMergedPRs} merged)
- Total Issues Created: ${data.totalIssues}
- Stars Earned: ${data.totalStars}
- Lines Changed: +${data.additions.toLocaleString()} / -${data.deletions.toLocaleString()}

## Top Languages:
${data.topLanguages.map((l: any) => `- ${l.language}: ${l.percentage}%`).join('\n')}

## Key Repositories:
${JSON.stringify(repoSummaries, null, 2)}

## Score these skills (0-100):
1. **Backend Engineering** - APIs, databases, servers (Python, Java, Go, Node.js, Ruby)
2. **Frontend Engineering** - UI/UX, web apps (JavaScript, TypeScript, React, Vue, CSS)
3. **DevOps/Infrastructure** - CI/CD, cloud, containers (Docker, K8s, Terraform, AWS)
4. **Systems/Architecture** - Low-level, performance (C, C++, Rust, compilers)

Consider the evidence depth: commits, PRs, language expertise, project complexity.

RESPOND ONLY WITH JSON:
{"backend": <0-100>, "frontend": <0-100>, "devops": <0-100>, "systems": <0-100>, "confidence": <50-95>, "reasoning": "<brief>"}`;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 300 },
      },
      {
        headers: {
          "X-goog-api-key": this.geminiApiKey,
          "Content-Type": "application/json",
        },
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty AI response");

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const result = JSON.parse(jsonMatch[0]);
    console.log(`[AI] Reasoning: ${result.reasoning}`);

    const scores = {
      backend: Math.min(100, Math.max(0, result.backend || 0)),
      frontend: Math.min(100, Math.max(0, result.frontend || 0)),
      devops: Math.min(100, Math.max(0, result.devops || 0)),
      systems: Math.min(100, Math.max(0, result.systems || 0)),
      overall: 0,
    };
    scores.overall = Math.round((scores.backend + scores.frontend + scores.devops + scores.systems) / 4);

    return { scores, confidence: Math.min(95, Math.max(50, result.confidence || 70)) };
  }

  private analyzeWithHeuristics(data: any): { scores: DeveloperProfile["skillScores"]; confidence: number } {
    const backendLangs = ["Python", "Java", "Go", "Rust", "Ruby", "PHP", "C#", "Kotlin", "Scala"];
    const frontendLangs = ["JavaScript", "TypeScript", "HTML", "CSS", "Vue", "Svelte", "SCSS"];
    const devopsLangs = ["Shell", "Dockerfile", "HCL", "Makefile", "PowerShell", "Nix"];
    const systemsLangs = ["C", "C++", "Rust", "Assembly", "Zig"];

    let backend = 0, frontend = 0, devops = 0, systems = 0;

    // Language-based scoring (up to 50 points)
    for (const { language, percentage } of data.topLanguages) {
      const points = Math.min(25, percentage * 0.6);
      if (backendLangs.includes(language)) backend += points;
      if (frontendLangs.includes(language)) frontend += points;
      if (devopsLangs.includes(language)) devops += points;
      if (systemsLangs.includes(language)) systems += points;
    }

    // Repo-based scoring (up to 25 points)
    for (const repo of data.repos) {
      const name = repo.name.toLowerCase();
      const desc = (repo.description || "").toLowerCase();
      const boost = 2 + Math.min(3, repo.stars * 0.5);

      if (/api|backend|server|service/.test(name) || /rest|graphql|database|microservice/.test(desc)) backend += boost;
      if (/frontend|ui|web|app|dashboard/.test(name) || /react|vue|angular|next|nuxt/.test(desc)) frontend += boost;
      if (/deploy|docker|k8s|infra|ci|cd|terraform|ansible/.test(name) || /pipeline|devops|cloud|aws|gcp/.test(desc)) devops += boost;
      if (/kernel|driver|compiler|embedded|os/.test(name) || /low.level|performance|memory|assembly/.test(desc)) systems += boost;
    }

    // Activity-based boost (up to 25 points)
    const commitBoost = Math.min(15, data.totalCommits / 100);
    const prBoost = Math.min(10, data.totalMergedPRs / 5);
    backend += (commitBoost + prBoost) * 0.3;
    frontend += (commitBoost + prBoost) * 0.3;
    devops += (commitBoost + prBoost) * 0.2;
    systems += (commitBoost + prBoost) * 0.1;

    // Account age bonus (experienced developers)
    const ageBonus = Math.min(10, data.accountAge * 1.5);
    backend += ageBonus * 0.3;
    frontend += ageBonus * 0.3;

    const normalize = (score: number) => Math.min(100, Math.max(0, Math.round(score)));
    const scores = {
      backend: normalize(backend),
      frontend: normalize(frontend),
      devops: normalize(devops),
      systems: normalize(systems),
      overall: 0,
    };
    scores.overall = Math.round((scores.backend + scores.frontend + scores.devops + scores.systems) / 4);

    // Confidence based on data quality
    const confidence = Math.min(85, 45 + data.repos.length + Math.min(15, data.totalCommits / 50) + data.totalMergedPRs);

    console.log(`[HEURISTIC] Scores: ${JSON.stringify(scores)}, confidence: ${confidence}`);
    return { scores, confidence };
  }
}
