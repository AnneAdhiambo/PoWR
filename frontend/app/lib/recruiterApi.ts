const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function getRecruiterToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("recruiter_token");
}

export function clearRecruiterSession() {
  if (typeof window === "undefined") return;
  ["recruiter_token", "recruiter_email", "recruiter_company", "recruiter_plan"].forEach((key) => localStorage.removeItem(key));
  localStorage.setItem("powr_session_event", `recruiter-logout:${Date.now()}`);
  window.dispatchEvent(new CustomEvent("powr:recruiter-logout"));
}

class RecruiterApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    behavior: { suppressUnauthorizedLogout?: boolean } = {},
  ): Promise<T> {
    const token = getRecruiterToken();
    const browserHostname = typeof window !== "undefined" ? window.location.hostname : "";
    const tenantHostname = browserHostname.endsWith(".powr.localhost")
      ? browserHostname.replace(/\.powr\.localhost$/, ".powr.dev")
      : browserHostname;
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(tenantHostname ? { "X-PoWR-Hostname": tenantHostname } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (response.status === 401 && !endpoint.startsWith("/api/recruiter/auth/") && !behavior.suppressUnauthorizedLogout) {
        clearRecruiterSession();
      }
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

  async getMe(options: { passive?: boolean } = {}) {
    return this.request<{ recruiter: any }>(
      "/api/recruiter/me",
      {},
      { suppressUnauthorizedLogout: options.passive },
    );
  }

  async logout() {
    try {
      await this.request<{ success: boolean }>("/api/recruiter/auth/logout", { method: "POST" });
    } finally {
      clearRecruiterSession();
    }
  }

  async getOrganizationProfile() {
    return this.request<{ organization: any }>("/api/recruiter/organization/profile");
  }

  async updateOrganizationProfile(data: {
    display_name: string;
    summary?: string;
    website?: string;
    location?: string;
    logo_url?: string;
    benefits?: string[];
    social_links?: Record<string, string>;
  }) {
    return this.request<{ organization: any }>("/api/recruiter/organization/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getTeamMembers() {
    return this.request<{ members: any[] }>("/api/recruiter/team/members");
  }

  async inviteTeamMember(email: string, role: string) {
    return this.request<{ invitation: any; token: string }>("/api/recruiter/team/invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async acceptTeamInvitation(token: string) {
    return this.request<{ accepted: boolean; organizationId: number; role: string }>("/api/recruiter/team/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async updateTeamMember(memberId: number, role: string) {
    return this.request<{ member: any }>(`/api/recruiter/team/members/${memberId}`, { method: "PATCH", body: JSON.stringify({ role }) });
  }

  async removeTeamMember(memberId: number) {
    return this.request<{ member: any }>(`/api/recruiter/team/members/${memberId}`, { method: "DELETE" });
  }

  async getApplications() {
    return this.request<{ applications: any[] }>("/api/recruiter/applications");
  }

  async updateApplicationStage(applicationId: number, stage: string) {
    return this.request<{ application: any }>(`/api/recruiter/applications/${applicationId}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
  }

  async addApplicationNote(applicationId: number, note: string) {
    return this.request<{ note: any }>(`/api/recruiter/applications/${applicationId}/notes`, {
      method: "POST",
      body: JSON.stringify({ note }),
    });
  }

  async saveApplicationScorecard(applicationId: number, score: number, recommendation: string, feedback?: string) {
    return this.request<{ scorecard: any }>(`/api/recruiter/applications/${applicationId}/scorecard`, {
      method: "PUT",
      body: JSON.stringify({ score, recommendation, feedback }),
    });
  }

  async convertApplicationToEmployee(applicationId: number, data: { start_date?: string; employment_type?: string; department?: string; manager_name?: string; onboarding_notes?: string }) {
    return this.request<{ employee: any }>(`/api/recruiter/applications/${applicationId}/convert-to-employee`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getEmployees() {
    return this.request<{ employees: any[] }>("/api/recruiter/employees");
  }

  async updateEmployee(employeeId: number, data: { employment_status?: string; start_date?: string; employment_type?: string; department?: string; manager_name?: string; onboarding_notes?: string }) {
    return this.request<{ employee: any }>(`/api/recruiter/employees/${employeeId}`, { method: "PATCH", body: JSON.stringify(data) });
  }

  async searchDevelopers(params: {
    jobId?: number;
    skills?: string[];
    minScore?: number;
    maxScore?: number;
    activeWithin?: number;
    hasOnChainProof?: boolean;
    page?: number;
    limit?: number;
  }) {
    const q = new URLSearchParams();
    if (params.jobId !== undefined) q.set("jobId", String(params.jobId));
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

  async createBillingIntent(plan: string) {
    return this.request<{ paymentIntent: any }>("/api/recruiter/billing/intent", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  }

  async verifyBillingPayment(txHash: string, plan: string) {
    return this.request<{ success: boolean; status?: string; message?: string; plan?: string }>(
      "/api/recruiter/billing/verify",
      {
        method: "POST",
        body: JSON.stringify({ txHash, plan }),
      }
    );
  }


  // Jobs CRUD
  async createJob(data: { title: string; company: string; location: string; salary?: string; type?: string; description?: string; tags?: string[]; department?: string; remote_policy?: string; seniority?: string; closing_date?: string; screening_questions?: string[]; status?: string }): Promise<{ job: any }> {
    return this.request("/api/jobs", { method: "POST", body: JSON.stringify(data) });
  }

  async getMyJobs(): Promise<{ jobs: any[] }> {
    return this.request("/api/jobs/my");
  }

  async updateJob(id: string, data: Partial<{ title: string; company: string; location: string; salary: string; type: string; description: string; tags: string[]; status: string; department: string; remote_policy: string; seniority: string; closing_date: string; screening_questions: string[] }>): Promise<{ job: any }> {
    return this.request(`/api/jobs/${id}`, { method: "PUT", body: JSON.stringify(data) });
  }

  async deleteJob(id: string): Promise<void> {
    await this.request(`/api/jobs/${id}`, { method: "DELETE" });
  }

  async updateJobSourcingRequirements(jobId: number, data: { requiredSkills: string[]; preferredSkills: string[]; minimumPowrScore?: number | null }) {
    return this.request<{ requirements: any }>(`/api/recruiter/jobs/${jobId}/sourcing-requirements`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async addSourcedCandidateToJob(jobId: number, username: string, matchSnapshotId: number) {
    return this.request<{ candidate: any }>(`/api/recruiter/jobs/${jobId}/sourced-candidates`, {
      method: "POST",
      body: JSON.stringify({ username, matchSnapshotId }),
    });
  }

  async duplicateJob(id: string): Promise<{ job: any }> {
    return this.request(`/api/jobs/${id}/duplicate`, { method: "POST" });
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
