CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS job_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  referrer_username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  candidate_username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  relationship TEXT,
  evidence_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending_consent'
    CHECK (status IN ('pending_consent', 'accepted', 'declined', 'expired', 'withdrawn', 'closed')),
  consent_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  consent_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  consented_at TIMESTAMPTZ,
  declined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (referrer_username <> candidate_username),
  UNIQUE (job_id, referrer_username, candidate_username)
);

CREATE INDEX IF NOT EXISTS idx_job_referrals_org_status ON job_referrals(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_job_referrals_referrer ON job_referrals(referrer_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_referrals_candidate ON job_referrals(candidate_username, created_at DESC);

CREATE TABLE IF NOT EXISTS referral_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES job_referrals(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL CHECK (outcome_type IN (
    'interviewed', 'hired', 'retained_90_days', 'strong_performance',
    'performance_concern', 'rejected', 'job_closed', 'candidate_withdrew'
  )),
  private_employer_note TEXT,
  recorded_by_recruiter_id INTEGER NOT NULL REFERENCES recruiters(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referral_id, outcome_type)
);

CREATE TABLE IF NOT EXISTS referral_reputation_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  referral_id UUID NOT NULL REFERENCES job_referrals(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES referral_outcomes(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('outcome', 'offset')),
  points NUMERIC(5,2) NOT NULL CHECK (points BETWEEN -2 AND 2 AND points <> 0),
  reason TEXT NOT NULL,
  offsets_entry_id UUID REFERENCES referral_reputation_ledger(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_ledger_referrer ON referral_reputation_ledger(referrer_username, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_referral_ledger_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'referral reputation ledger is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS referral_ledger_immutable ON referral_reputation_ledger;
CREATE TRIGGER referral_ledger_immutable
BEFORE UPDATE OR DELETE ON referral_reputation_ledger
FOR EACH ROW EXECUTE FUNCTION prevent_referral_ledger_mutation();

CREATE TABLE IF NOT EXISTS referral_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES job_referrals(id) ON DELETE CASCADE,
  ledger_entry_id UUID NOT NULL REFERENCES referral_reputation_ledger(id),
  appellant_username TEXT NOT NULL REFERENCES users(username),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'upheld', 'rejected')),
  resolution_note TEXT,
  resolved_by_recruiter_id INTEGER REFERENCES recruiters(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS referral_anomaly_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID REFERENCES job_referrals(id) ON DELETE CASCADE,
  referrer_username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('reciprocal_pattern', 'high_volume')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (referral_id, flag_type)
);
