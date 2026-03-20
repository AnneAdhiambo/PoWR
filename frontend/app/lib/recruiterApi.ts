const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getRecruiterToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("recruiter_token");
}

class RecruiterApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getRecruiterToken();
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const err = new Error(body.error || response.statusText) as any;
      err.status = response.status;
      err.upgradeRequired = body.upgradeRequired;
      throw err;
    }

    return response.json();
  }

  async signup(email: string, password: string, companyName: string, companySize?: string) {
    return this.request<{ token: string; recruiter: any }>("/api/recruiter/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, company_name: companyName, company_size: companySize }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ token: string; recruiter: any }>("/api/recruiter/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<{ recruiter: any }>("/api/recruiter/me");
  }

  async searchDevelopers(params: {
    skills?: string[];
    minScore?: number;
    maxScore?: number;
    activeWithin?: number;
    hasOnChainProof?: boolean;
    page?: number;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params.skills?.length) q.set("skills", params.skills.join(","));
    if (params.minScore !== undefined) q.set("minScore", String(params.minScore));
    if (params.maxScore !== undefined) q.set("maxScore", String(params.maxScore));
    if (params.activeWithin !== undefined) q.set("activeWithin", String(params.activeWithin));
    if (params.hasOnChainProof !== undefined) q.set("hasOnChainProof", String(params.hasOnChainProof));
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return this.request<{ developers: any[]; total: number }>(`/api/recruiter/search?${q}`);
  }

  async getDeveloperProfile(username: string) {
    return this.request<{
      username: string;
      profile: any;
      proofs: any[];
      isVerified: boolean;
      lastAnalyzed: string | null;
      artifactsCount: number;
      viewsRemaining: number | null;
    }>(`/api/recruiter/developer/${username}`);
  }

  async contactDeveloper(username: string, message: string) {
    return this.request<{ success: boolean; message: string }>(`/api/recruiter/developer/${username}/contact`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  async getSavedPools() {
    return this.request<{ pools: any[] }>("/api/recruiter/saved");
  }

  async createSavedPool(name: string) {
    return this.request<{ pool: any }>("/api/recruiter/saved", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getPoolMembers(poolId: number) {
    return this.request<{ members: string[] }>(`/api/recruiter/saved/${poolId}/members`);
  }

  async addToPool(poolId: number, username: string) {
    return this.request<{ success: boolean }>(`/api/recruiter/saved/${poolId}/members`, {
      method: "POST",
      body: JSON.stringify({ username }),
    });
  }

  async removeFromPool(poolId: number, username: string) {
    return this.request<{ success: boolean }>(`/api/recruiter/saved/${poolId}/members/${username}`, {
      method: "DELETE",
    });
  }

  async deleteSavedPool(poolId: number) {
    return this.request<{ success: boolean }>(`/api/recruiter/saved/${poolId}`, {
      method: "DELETE",
    });
  }

  // Jobs CRUD
  async createJob(data: { title: string; company: string; location: string; salary?: string; type?: string; description?: string; tags?: string[] }): Promise<{ job: any }> {
    return this.request("/api/jobs", { method: "POST", body: JSON.stringify(data) });
  }

  async getMyJobs(): Promise<{ jobs: any[] }> {
    return this.request("/api/jobs/my");
  }

  async updateJob(id: string, data: Partial<{ title: string; company: string; location: string; salary: string; type: string; description: string; tags: string[] }>): Promise<{ job: any }> {
    return this.request(`/api/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  async deleteJob(id: string): Promise<void> {
    await this.request(`/api/jobs/${id}`, { method: "DELETE" });
  }

  // Gigs CRUD
  async createGig(data: { title: string; client: string; location: string; rate?: string; duration?: string; description?: string; tags?: string[] }): Promise<{ gig: any }> {
    return this.request("/api/gigs", { method: "POST", body: JSON.stringify(data) });
  }

  async getMyGigs(): Promise<{ gigs: any[] }> {
    return this.request("/api/gigs/my");
  }

  async updateGig(id: string, data: Partial<{ title: string; client: string; location: string; rate: string; duration: string; description: string; tags: string[] }>): Promise<{ gig: any }> {
    return this.request(`/api/gigs/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  async deleteGig(id: string): Promise<void> {
    await this.request(`/api/gigs/${id}`, { method: "DELETE" });
  }
}

export const recruiterApiClient = new RecruiterApiClient();
