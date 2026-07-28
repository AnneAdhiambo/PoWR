const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface SkillPoWScore {
  skill: string;
  score: number;
  percentile: number;
  confidence: number;
  artifactCount: number;
}

export interface PoWProfile {
  skills: SkillPoWScore[];
  overallIndex: number;
  artifactSummary: {
    repos: number;
    commits: number;
    pullRequests: number;
    mergedPRs: number;
  };
  summary?: string;
}

export interface Artifact {
  type: "repo" | "commit" | "pull_request";
  id: string;
  data: any;
  timestamp: string;
  repository?: {
    owner: string;
    name: string;
  };
}

export interface Proof {
  id?: number;
  transactionHash: string;
  artifactHash: string;
  stacksBlockHeight: number;
  blockNumber?: number;   // legacy field — use stacksBlockHeight
  timestamp: number;
  skillScores: number[];
  createdAt?: string;
}

export interface Badge {
  id: number;
  username: string;
  tokenId: number | null;
  skillType: number;
  tier: number;
  transactionHash: string | null;
  stacksPrincipal: string | null;
  mintedAt: string;
}

export interface GithubBadge {
  id: number;
  username: string;
  badgeKey: string;
  earnedAt: string;
  displayName: string;
  description: string;
}

export interface Job {
  id: number;
  recruiter_id?: number;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
  description?: string;
  tags?: string[];
  status?: string;
  public_slug?: string;
  department?: string;
  remote_policy?: string;
  seniority?: string;
  closing_date?: string;
  screening_questions?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Gig {
  id: number;
  recruiter_id?: number;
  title: string;
  client: string;
  location: string;
  rate?: string;
  duration?: string;
  description?: string;
  tags?: string[];
  status?: string;
  created_at?: string;
  updated_at?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(typeof window !== "undefined" && window.location.hostname ? { "X-PoWR-Hostname": window.location.hostname.replace(/\.powr\.localhost$/, ".powr.dev") } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || body.message || `API error: ${response.status}`);
    }

    return response.json();
  }

  async getUserProfile(username: string, accessToken?: string): Promise<PoWProfile> {
    return this.request<PoWProfile>(`/api/user/profile?username=${username}`);
  }

  async getPublicProfile(username: string): Promise<{
    username: string;
    profile: PoWProfile;
    proofs: Proof[];
    isVerified: boolean;
    lastAnalyzed: string | null;
  }> {
    return this.request(`/api/user/public/${username}`);
  }

  async getUserSkills(username: string, accessToken: string): Promise<{ skills: SkillPoWScore[] }> {
    return this.request<{ skills: SkillPoWScore[] }>(
      `/api/user/skills?username=${username}`
    );
  }

  async getUserArtifacts(username: string, accessToken?: string): Promise<{ artifacts: Artifact[] }> {
    return this.request<{ artifacts: Artifact[] }>(`/api/user/artifacts?username=${username}`);
  }

  async triggerAnalysis(
    username: string,
    accessToken: string,
    monthsBack?: number
  ): Promise<{ success: boolean; profile: PoWProfile; artifactsCount: number }> {
    return this.request<{ success: boolean; profile: PoWProfile; artifactsCount: number }>(
      `/api/user/analyze`,
      {
        method: "POST",
        body: JSON.stringify({ username, monthsBack }),
      }
    );
  }

  async getProofs(username: string): Promise<{ proofs: Proof[] }> {
    return this.request<{ proofs: Proof[] }>(`/api/user/proofs?username=${username}`);
  }

  async getProgress(username: string): Promise<{ stage: string; message: string; progress: number }> {
    return this.request<{ stage: string; message: string; progress: number }>(`/api/user/progress?username=${username}`);
  }

  async publishProof(username: string): Promise<{ success: boolean; proof?: Proof; message: string; upgradeRequired?: boolean }> {
    return this.request<{ success: boolean; proof?: Proof; message: string; upgradeRequired?: boolean }>(
      `/api/user/publish-proof`,
      {
        method: "POST",
        body: JSON.stringify({ username }),
      }
    );
  }

  async getAnalysisStatus(username: string): Promise<{
    hasProfile: boolean;
    hasUnpublished: boolean;
    lastAnalyzed: string | null;
    lastPublished: string | null;
    profile?: PoWProfile;
    artifactsCount?: number;
  }> {
    return this.request<{
      hasProfile: boolean;
      hasUnpublished: boolean;
      lastAnalyzed: string | null;
      lastPublished: string | null;
      profile?: PoWProfile;
      artifactsCount?: number;
    }>(`/api/user/analysis-status?username=${username}`);
  }

  // Subscription methods
  async getSubscriptionPlans(): Promise<{ plans: any[] }> {
    return this.request<{ plans: any[] }>("/api/subscription/plans");
  }

  async getCurrentSubscription(username: string): Promise<{ subscription: any; plan: any }> {
    return this.request<{ subscription: any; plan: any }>(`/api/subscription/current?username=${username}`);
  }

  async upgradeSubscription(username: string, planType: string, paymentTxHash?: string): Promise<{ success: boolean; message?: string }> {
    return this.request<{ success: boolean; message?: string }>(`/api/subscription/upgrade?username=${username}`, {
      method: "POST",
      body: JSON.stringify({ planType, paymentTxHash }),
    });
  }

  async cancelSubscription(username: string): Promise<{ success: boolean; message?: string }> {
    return this.request<{ success: boolean; message?: string }>(`/api/subscription/cancel?username=${username}`, {
      method: "POST",
    });
  }

  async getNextUpdateDate(username: string): Promise<{ nextUpdateDate: string | null; planType: string }> {
    return this.request<{ nextUpdateDate: string | null; planType: string }>(`/api/subscription/next-update?username=${username}`);
  }

  // Payment methods
  async createPaymentIntent(username: string, planType: string, currency: string = "stx", billingPeriod: number = 1): Promise<{ paymentIntent: any }> {
    return this.request<{ paymentIntent: any }>(`/api/payments/create?username=${username}`, {
      method: "POST",
      body: JSON.stringify({ planType, currency, billingPeriod }),
    });
  }

  async verifyPayment(username: string, txHash: string, planType: string, currency?: string): Promise<{ success: boolean; message?: string }> {
    return this.request<{ success: boolean; message?: string }>(`/api/payments/verify?username=${username}`, {
      method: "POST",
      body: JSON.stringify({ txHash, planType, currency }),
    });
  }

  async getPaymentStatus(txHash: string): Promise<{ status: string; transaction?: any }> {
    return this.request<{ status: string; transaction?: any }>(`/api/payments/status/${txHash}`);
  }

  async createStripeCheckout(username: string, planType: string): Promise<{ url: string }> {
    return this.request<{ url: string }>(`/api/payments/stripe/checkout?username=${username}`, {
      method: "POST",
      body: JSON.stringify({ planType }),
    });
  }

  async getUserBadges(username: string): Promise<{ skillBadges: Badge[]; achievements: GithubBadge[] }> {
    return this.request<{ skillBadges: Badge[]; achievements: GithubBadge[] }>(
      `/api/badges/${username}`
    );
  }

  async getJobs(params?: { page?: number; limit?: number }): Promise<{ jobs: Job[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return this.request<{ jobs: Job[]; total: number }>(`/api/jobs?${q}`);
  }

  async getTenantContext(): Promise<{ organization: { id: number; slug: string; display_name: string; profile?: { logoUrl?: string; primaryColor?: string } } }> {
    return this.request("/api/tenant/context");
  }

  async getJob(id: string): Promise<{ job: Job }> {
    return this.request(`/api/jobs/${id}`);
  }

  async applyToJob(id: string, data: { applicant_email: string; cover_note?: string; consent_given: boolean; screening_answers?: Record<string, string>; shared_evidence?: string[] }) {
    return this.request<{ application: any }>(`/api/jobs/${id}/applications`, { method: "POST", body: JSON.stringify(data) });
  }

  async getGigs(params?: { page?: number; limit?: number }): Promise<{ gigs: Gig[]; total: number }> {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    return this.request<{ gigs: Gig[]; total: number }>(`/api/gigs?${q}`);
  }

  async getUserNostrPubkey(username: string): Promise<string | null> {
    try {
      const data = await this.request<{ pubkey: string | null }>(`/api/user/nostr-pubkey/${username}`);
      return data.pubkey;
    } catch {
      return null;
    }
  }

  async registerNostrPubkey(username: string, pubkey: string): Promise<void> {
    await this.request("/api/user/nostr-pubkey", {
      method: "POST",
      body: JSON.stringify({ username, pubkey }),
    });
  }

  async getUserProjects(username: string): Promise<{ projects: any[] }> {
    return this.request<{ projects: any[] }>(`/api/user/projects?username=${username}`);
  }

}

export const apiClient = new ApiClient();

