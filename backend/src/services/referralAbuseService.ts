import { QueryExecutor } from "../types/referrals";

export class ReferralAbuseService {
  constructor(private readonly database: QueryExecutor) {}

  async inspect(referral: { id: string; referrer_username: string; candidate_username: string }) {
    await this.database.query(
      `INSERT INTO referral_anomaly_flags (referral_id, referrer_username, flag_type, details)
       SELECT $1, $2, 'reciprocal_pattern', jsonb_build_object('candidate', $3)
       WHERE EXISTS (
         SELECT 1 FROM job_referrals
         WHERE referrer_username = $3 AND candidate_username = $2
           AND created_at >= NOW() - INTERVAL '180 days'
       ) ON CONFLICT DO NOTHING`,
      [referral.id, referral.referrer_username, referral.candidate_username],
    );
    await this.database.query(
      `INSERT INTO referral_anomaly_flags (referral_id, referrer_username, flag_type, details)
       SELECT $1, $2, 'high_volume', jsonb_build_object('window_days', 30)
       WHERE (SELECT COUNT(*) FROM job_referrals
              WHERE referrer_username = $2 AND created_at >= NOW() - INTERVAL '30 days') > 20
       ON CONFLICT DO NOTHING`,
      [referral.id, referral.referrer_username],
    );
  }
}
