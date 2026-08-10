import { createHash, randomUUID } from "crypto";
import { Pool } from "pg";
import { CreateReferralInput, QueryExecutor, QueryTransaction, ReferralOutcome } from "../types/referrals";
import { ReferralAbuseService } from "./referralAbuseService";
import { ReferralReliabilityService } from "./referralReliabilityService";

export function referralsEnabled() {
  return process.env.REFERRAL_REPUTATION_ENABLED === "true";
}

export class ReferralService {
  private readonly reliability: ReferralReliabilityService;
  private readonly abuse: ReferralAbuseService;

  constructor(private readonly database: QueryExecutor) {
    this.reliability = new ReferralReliabilityService(database);
    this.abuse = new ReferralAbuseService(database);
  }

  private hashConsentToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private async withTransaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T> {
    if (!this.database.connect) return work(this.database);
    const client = await this.database.connect() as QueryTransaction;
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async create(input: CreateReferralInput) {
    if (input.referrerUsername === input.candidateUsername) throw new Error("Self-referrals are not allowed");
    const token = randomUUID();
    const tokenHash = this.hashConsentToken(token);
    const result = await this.database.query<any>(
      `INSERT INTO job_referrals
       (organization_id, job_id, referrer_username, candidate_username, relationship, evidence_note, consent_token_hash)
       SELECT j.organization_id, j.id, $2, $3, $4, $5, $6
       FROM jobs j JOIN organizations o ON o.id = j.organization_id
       WHERE j.id = $1 AND j.status = 'active' AND o.status = 'active'
         AND EXISTS (SELECT 1 FROM users WHERE username = $3)
       RETURNING *`,
      [input.jobId, input.referrerUsername, input.candidateUsername, input.relationship || null, input.evidenceNote || null, tokenHash],
    );
    const referral = result.rows[0];
    if (!referral) throw new Error("Active job or candidate not found");
    await this.abuse.inspect(referral);
    return { ...referral, consentToken: token };
  }

  async consentPreview(token: string) {
    const tokenHash = this.hashConsentToken(token);
    await this.database.query(
      `UPDATE job_referrals SET status = 'expired', updated_at = NOW()
       WHERE consent_token_hash = $1 AND status = 'pending_consent' AND consent_expires_at <= NOW()`,
      [tokenHash],
    );
    const result = await this.database.query(
      `SELECT r.id, r.status, r.relationship, r.evidence_note, r.consent_expires_at,
              r.referrer_username, r.candidate_username, j.title, j.company
       FROM job_referrals r JOIN jobs j ON j.id = r.job_id WHERE r.consent_token_hash = $1`,
      [tokenHash],
    );
    return result.rows[0] || null;
  }

  async decideConsent(token: string, candidateUsername: string, decision: "accept" | "decline") {
    const tokenHash = this.hashConsentToken(token);
    const result = await this.database.query(
      `UPDATE job_referrals
       SET status = $2, consented_at = CASE WHEN $2 = 'accepted' THEN NOW() ELSE consented_at END,
           declined_at = CASE WHEN $2 = 'declined' THEN NOW() ELSE declined_at END, updated_at = NOW()
       WHERE consent_token_hash = $1 AND candidate_username = $3
         AND status = 'pending_consent' AND consent_expires_at > NOW()
       RETURNING id, status`,
      [tokenHash, decision === "accept" ? "accepted" : "declined", candidateUsername],
    );
    return result.rows[0] || null;
  }

  async withdraw(username: string, referralId: string) {
    const result = await this.database.query(
      `UPDATE job_referrals
       SET status = 'withdrawn', updated_at = NOW()
       WHERE id = $1 AND (referrer_username = $2 OR candidate_username = $2)
         AND status IN ('pending_consent', 'accepted')
       RETURNING id, status`,
      [referralId, username],
    );
    return result.rows[0] || null;
  }

  async listForDeveloper(username: string) {
    const result = await this.database.query(
      `SELECT r.id, r.job_id, r.referrer_username, r.candidate_username, r.status, r.created_at,
              j.title, j.company
       FROM job_referrals r JOIN jobs j ON j.id = r.job_id
       WHERE r.referrer_username = $1 OR r.candidate_username = $1
       ORDER BY r.created_at DESC`,
      [username],
    );
    return result.rows;
  }

  async listForOrganization(organizationId: number) {
    const result = await this.database.query<any>(
      `SELECT r.id, r.job_id, r.referrer_username, r.candidate_username, r.relationship,
              r.evidence_note, r.status, r.consented_at, r.created_at, j.title, j.company
       FROM job_referrals r JOIN jobs j ON j.id = r.job_id
       WHERE r.organization_id = $1 AND r.status = 'accepted'
       ORDER BY r.created_at DESC`,
      [organizationId],
    );
    return Promise.all(result.rows.map(async (row) => ({
      ...row,
      reliability: await this.reliability.getSummary(row.referrer_username),
    })));
  }

  async recordOutcome(
    organizationId: number,
    recruiterId: number,
    referralId: string,
    outcome: ReferralOutcome,
    privateNote?: string,
    evidenceNote?: string,
  ) {
    const adverse = outcome === "performance_concern";
    if (adverse && (!evidenceNote || evidenceNote.trim().length < 20)) {
      throw new Error("Adverse outcomes require at least 20 characters of evidence");
    }
    return this.withTransaction(async (executor) => {
      const inserted = await executor.query<any>(
        `INSERT INTO referral_outcomes
         (referral_id, outcome_type, private_employer_note, evidence_note, review_status, recorded_by_recruiter_id)
         SELECT r.id, $3, $4, $6, $7, $2 FROM job_referrals r
         WHERE r.id = $1 AND r.organization_id = $5 AND r.status = 'accepted'
         ON CONFLICT (referral_id, outcome_type) DO NOTHING
         RETURNING *, (SELECT referrer_username FROM job_referrals WHERE id = $1) AS referrer_username`,
        [
          referralId,
          recruiterId,
          outcome,
          privateNote || null,
          organizationId,
          evidenceNote?.trim() || null,
          adverse ? "pending_review" : "verified",
        ],
      );
      const recorded = inserted.rows[0];
      if (!recorded) return null;
      const ledgerEntry = adverse
        ? null
        : await this.reliability.appendOutcomeEntry(referralId, recorded.id, recorded.referrer_username, outcome, executor);
      return { outcome: recorded, ledgerEntry };
    });
  }

  async reviewAdverseOutcome(
    organizationId: number,
    recruiterId: number,
    outcomeId: string,
    approve: boolean,
  ) {
    return this.withTransaction(async (executor) => {
      const reviewed = await executor.query<any>(
        `UPDATE referral_outcomes o
         SET review_status = $3, reviewed_by_recruiter_id = $2, reviewed_at = NOW()
         FROM job_referrals r
         WHERE o.id = $1 AND o.referral_id = r.id AND r.organization_id = $4
           AND o.outcome_type = 'performance_concern' AND o.review_status = 'pending_review'
           AND o.recorded_by_recruiter_id <> $2
         RETURNING o.*, r.referrer_username`,
        [outcomeId, recruiterId, approve ? "verified" : "rejected", organizationId],
      );
      const outcome = reviewed.rows[0];
      if (!outcome) return null;
      const ledgerEntry = approve
        ? await this.reliability.appendOutcomeEntry(
          outcome.referral_id,
          outcome.id,
          outcome.referrer_username,
          outcome.outcome_type,
          executor,
        )
        : null;
      return { outcome, ledgerEntry };
    });
  }

  async appeal(username: string, referralId: string, ledgerEntryId: string, reason: string) {
    const result = await this.database.query(
      `INSERT INTO referral_appeals (referral_id, ledger_entry_id, appellant_username, reason)
       SELECT r.id, l.id, $1, $4 FROM job_referrals r
       JOIN referral_reputation_ledger l ON l.referral_id = r.id
       WHERE r.id = $2 AND l.id = $3 AND r.referrer_username = $1
       RETURNING *`,
      [username, referralId, ledgerEntryId, reason],
    );
    return result.rows[0] || null;
  }

  async resolveAppeal(organizationId: number, recruiterId: number, appealId: string, uphold: boolean, note: string) {
    const result = await this.database.query<any>(
      `UPDATE referral_appeals a SET status = $3, resolution_note = $4,
              resolved_by_recruiter_id = $2, resolved_at = NOW()
       FROM job_referrals r
       WHERE a.id = $1 AND a.referral_id = r.id AND r.organization_id = $5 AND a.status = 'open'
       RETURNING a.*, r.referrer_username`,
      [appealId, recruiterId, uphold ? "upheld" : "rejected", note, organizationId],
    );
    const appeal = result.rows[0];
    if (!appeal) return null;
    if (uphold) {
      await this.reliability.appendOffset(appeal.ledger_entry_id, appeal.referral_id, appeal.referrer_username, `Appeal upheld: ${note}`);
    }
    return appeal;
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

export const referralService = new ReferralService(pool as unknown as QueryExecutor);
