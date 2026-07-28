import { QueryExecutor, ReferralOutcome, ReliabilitySummary } from "../types/referrals";

const OUTCOME_POINTS: Partial<Record<ReferralOutcome, number>> = {
  interviewed: 0.25,
  hired: 0.75,
  retained_90_days: 1.25,
  strong_performance: 1.5,
  performance_concern: -1,
};

export const NON_PENALIZING_OUTCOMES = new Set<ReferralOutcome>([
  "rejected",
  "job_closed",
  "candidate_withdrew",
]);

export class ReferralReliabilityService {
  static readonly MINIMUM_EVIDENCE = 3;
  static readonly MONTHLY_CAP = 8;

  constructor(private readonly database: QueryExecutor) {}

  pointsForOutcome(outcome: ReferralOutcome): number | null {
    if (NON_PENALIZING_OUTCOMES.has(outcome)) return null;
    return OUTCOME_POINTS[outcome] ?? null;
  }

  async appendOutcomeEntry(referralId: string, outcomeId: string, referrerUsername: string, outcome: ReferralOutcome) {
    const requestedPoints = this.pointsForOutcome(outcome);
    if (requestedPoints === null) return null;

    const monthly = await this.database.query<{ total: string }>(
      `SELECT COALESCE(SUM(points), 0)::text AS total
       FROM referral_reputation_ledger
       WHERE referrer_username = $1 AND created_at >= date_trunc('month', NOW())`,
      [referrerUsername],
    );
    const current = Number(monthly.rows[0]?.total || 0);
    const room = requestedPoints > 0
      ? Math.max(0, ReferralReliabilityService.MONTHLY_CAP - current)
      : Math.max(0, ReferralReliabilityService.MONTHLY_CAP + current);
    const points = Math.sign(requestedPoints) * Math.min(Math.abs(requestedPoints), room, 2);
    if (!points) return null;

    const result = await this.database.query(
      `INSERT INTO referral_reputation_ledger
       (referrer_username, referral_id, outcome_id, entry_type, points, reason)
       VALUES ($1, $2, $3, 'outcome', $4, $5)
       ON CONFLICT DO NOTHING RETURNING *`,
      [referrerUsername, referralId, outcomeId, points, `Verified referral outcome: ${outcome}`],
    );
    return result.rows[0] || null;
  }

  async appendOffset(entryId: string, referralId: string, referrerUsername: string, reason: string) {
    const source = await this.database.query<{ points: string }>(
      `SELECT points::text FROM referral_reputation_ledger
       WHERE id = $1 AND referral_id = $2 AND referrer_username = $3`,
      [entryId, referralId, referrerUsername],
    );
    if (!source.rows[0]) throw new Error("Ledger entry not found");
    const result = await this.database.query(
      `INSERT INTO referral_reputation_ledger
       (referrer_username, referral_id, entry_type, points, reason, offsets_entry_id)
       SELECT $1, $2, 'offset', $3, $4, $5
       WHERE NOT EXISTS (SELECT 1 FROM referral_reputation_ledger WHERE offsets_entry_id = $5)
       RETURNING *`,
      [referrerUsername, referralId, -Number(source.rows[0].points), reason, entryId],
    );
    return result.rows[0] || null;
  }

  async getSummary(referrerUsername: string): Promise<ReliabilitySummary> {
    const result = await this.database.query<{ evidence_count: string; total_points: string }>(
      `SELECT COUNT(DISTINCT outcome_id)::text AS evidence_count,
              COALESCE(SUM(points), 0)::text AS total_points
       FROM referral_reputation_ledger WHERE referrer_username = $1`,
      [referrerUsername],
    );
    const evidenceCount = Number(result.rows[0]?.evidence_count || 0);
    const totalPoints = Number(result.rows[0]?.total_points || 0);
    return {
      score: evidenceCount >= ReferralReliabilityService.MINIMUM_EVIDENCE
        ? Math.max(0, Math.min(100, Math.round(50 + totalPoints * 5)))
        : null,
      evidenceCount,
      minimumEvidence: ReferralReliabilityService.MINIMUM_EVIDENCE,
      totalPoints,
      visible: evidenceCount >= ReferralReliabilityService.MINIMUM_EVIDENCE,
    };
  }
}
