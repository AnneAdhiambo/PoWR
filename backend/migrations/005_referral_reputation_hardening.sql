CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE job_referrals
  ADD COLUMN IF NOT EXISTS consent_token_hash TEXT;

UPDATE job_referrals
SET consent_token_hash = encode(digest(consent_token::text, 'sha256'), 'hex')
WHERE consent_token_hash IS NULL;

ALTER TABLE job_referrals
  ALTER COLUMN consent_token_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_job_referrals_consent_token_hash
  ON job_referrals(consent_token_hash);

ALTER TABLE job_referrals
  DROP COLUMN IF EXISTS consent_token;

ALTER TABLE referral_outcomes
  ADD COLUMN IF NOT EXISTS evidence_note TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS reviewed_by_recruiter_id INTEGER REFERENCES recruiters(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE referral_outcomes
  DROP CONSTRAINT IF EXISTS referral_outcomes_review_status_check;

ALTER TABLE referral_outcomes
  ADD CONSTRAINT referral_outcomes_review_status_check
  CHECK (review_status IN ('pending_review', 'verified', 'rejected'));

ALTER TABLE referral_outcomes
  DROP CONSTRAINT IF EXISTS referral_outcomes_adverse_evidence_check;

ALTER TABLE referral_outcomes
  ADD CONSTRAINT referral_outcomes_adverse_evidence_check
  CHECK (
    outcome_type <> 'performance_concern'
    OR (
      evidence_note IS NOT NULL
      AND length(trim(evidence_note)) >= 20
      AND review_status IN ('pending_review', 'verified', 'rejected')
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_ledger_outcome
  ON referral_reputation_ledger(outcome_id)
  WHERE outcome_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_ledger_offset
  ON referral_reputation_ledger(offsets_entry_id)
  WHERE offsets_entry_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_open_appeal
  ON referral_appeals(ledger_entry_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_referral_appeals_open_referral
  ON referral_appeals(referral_id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_referral_anomalies_open_referrer
  ON referral_anomaly_flags(referrer_username)
  WHERE status = 'open';
