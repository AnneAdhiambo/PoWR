const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || response.statusText);
  return body;
}

export interface OpenSourceIssue {
  id: number;
  github_issue_number: number;
  title: string;
  body_excerpt?: string;
  issue_url: string;
  labels: string[];
  assignee_login?: string;
  difficulty: "starter" | "standard" | "advanced" | "expert";
  street_points: number;
}

export interface OpenSourceProject {
  id: number;
  github_full_name: string;
  description?: string;
  primary_language?: string;
  topics: string[];
  license_spdx?: string;
  stars: number;
  repository_url: string;
  contribution_guide_url?: string;
  partner: boolean;
  partner_guidance?: string;
  health_score: number;
  available_issue_count: number;
  issues?: OpenSourceIssue[];
}

export const openSourceApi = {
  projects(query = "") {
    return request<{ projects: OpenSourceProject[] }>(`/api/open-source/projects${query ? `?q=${encodeURIComponent(query)}` : ""}`);
  },
  project(id: number) {
    return request<{ project: OpenSourceProject }>(`/api/open-source/projects/${id}`);
  },
  nominate(githubFullName: string, reason: string) {
    return request<{ nomination: any }>("/api/open-source/nominations", {
      method: "POST",
      body: JSON.stringify({ githubFullName, reason }),
    });
  },
  claim(issueId: number) {
    return request<{ claim: any; token: string; footer: string }>(`/api/open-source/issues/${issueId}/claims`, { method: "POST" });
  },
  verify(claimId: string, pullRequestUrl: string) {
    return request<{ claim: any }>(`/api/open-source/claims/${claimId}/pull-request`, {
      method: "PUT",
      body: JSON.stringify({ pullRequestUrl }),
    });
  },
  claims() {
    return request<{ claims: any[] }>("/api/open-source/me/claims");
  },
  profile(username: string) {
    return request<{ openSource: any }>(`/api/open-source/profile/${encodeURIComponent(username)}`);
  },
  reviewQueue() {
    return request<{ claims: any[] }>("/api/open-source/admin/review-queue");
  },
  review(claimId: string, decision: string, reason: string) {
    return request<{ claim: any }>(`/api/open-source/admin/claims/${claimId}/review`, {
      method: "POST",
      body: JSON.stringify({ decision, reason }),
    });
  },
};
