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
      headers: {
        "Content-Type": "application/json",
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
    const url = accessToken
      ? `/api/user/profile?username=${username}&access_token=${accessToken}`
      : `/api/user/profile?username=${username}`;
    return this.request<PoWProfile>(url);
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
      `/api/user/skills?username=${username}&access_token=${accessToken}`
    );
  }

  async getUserArtifacts(username: string, accessToken?: string): Promise<{ artifacts: Artifact[] }> {
    const url = accessToken
      ? `/api/user/artifacts?username=${username}&access_token=${accessToken}`
      : `/api/user/artifacts?username=${username}`;
    return this.request<{ artifacts: Artifact[] }>(url);
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
        body: JSON.stringify({ username, access_token: accessToken, monthsBack }),
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

}

export const apiClient = new ApiClient();

