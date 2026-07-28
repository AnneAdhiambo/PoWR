export type ReferralStatus = "pending_consent" | "accepted" | "declined" | "expired" | "withdrawn" | "closed";

export type ReferralOutcome =
  | "interviewed"
  | "hired"
  | "retained_90_days"
  | "strong_performance"
  | "performance_concern"
  | "rejected"
  | "job_closed"
  | "candidate_withdrew";

export interface CreateReferralInput {
  jobId: number;
  referrerUsername: string;
  candidateUsername: string;
  relationship?: string;
  evidenceNote?: string;
}

export interface ReliabilitySummary {
  score: number | null;
  evidenceCount: number;
  minimumEvidence: number;
  totalPoints: number;
  visible: boolean;
}

export interface QueryExecutor {
  query<T = any>(text: string, values?: unknown[]): Promise<{ rows: T[]; rowCount?: number | null }>;
}
