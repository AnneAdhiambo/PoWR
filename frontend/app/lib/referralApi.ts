const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("recruiter_token") : null;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Referral request failed");
  return body;
}

export interface Referral {
  id: string;
  job_id: number;
  title: string;
  company: string;
  referrer_username: string;
  candidate_username: string;
  relationship?: string;
  evidence_note?: string;
  status: string;
  consent_expires_at?: string;
  reliability?: {
    score: number | null;
    evidenceCount: number;
    minimumEvidence: number;
    visible: boolean;
  };
}

export const referralApi = {
  create(data: { jobId: number; candidateUsername: string; relationship?: string; evidenceNote?: string }) {
    return request<{ referral: Referral; consentUrl: string }>("/api/referrals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  mine() {
    return request<{ referrals: Referral[] }>("/api/referrals/mine");
  },
  preview(token: string) {
    return request<{ referral: Referral }>(`/api/referrals/consent/${encodeURIComponent(token)}`);
  },
  decide(token: string, decision: "accept" | "decline") {
    return request<{ referral: Referral }>(`/api/referrals/consent/${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
  },
  recruiterList() {
    return request<{ referrals: Referral[] }>("/api/recruiter/referrals");
  },
  recordOutcome(referralId: string, outcome: string, privateNote?: string) {
    return request(`/api/recruiter/referrals/${referralId}/outcomes`, {
      method: "POST",
      body: JSON.stringify({ outcome, privateNote }),
    });
  },
  appeal(referralId: string, ledgerEntryId: string, reason: string) {
    return request(`/api/referrals/${referralId}/appeals`, {
      method: "POST",
      body: JSON.stringify({ ledgerEntryId, reason }),
    });
  },
  resolveAppeal(appealId: string, uphold: boolean, note: string) {
    return request(`/api/recruiter/referrals/appeals/${appealId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ uphold, note }),
    });
  },
};
