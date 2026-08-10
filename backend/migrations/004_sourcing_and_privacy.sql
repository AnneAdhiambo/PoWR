CREATE TABLE IF NOT EXISTS developer_recruiting_preferences (
  developer_username TEXT PRIMARY KEY REFERENCES users(username) ON DELETE CASCADE,
  discoverable BOOLEAN NOT NULL DEFAULT FALSE,
  contactable BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO developer_recruiting_preferences (developer_username, discoverable, contactable)
SELECT username, TRUE, TRUE FROM profiles
ON CONFLICT (developer_username) DO NOTHING;

CREATE TABLE IF NOT EXISTS job_sourcing_requirements (
  job_id INTEGER PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_skills TEXT[] NOT NULL DEFAULT '{}',
  minimum_powr_score INTEGER,
  updated_by_recruiter_id INTEGER REFERENCES recruiters(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (minimum_powr_score IS NULL OR minimum_powr_score BETWEEN 0 AND 100)
);

CREATE TABLE IF NOT EXISTS sourcing_match_snapshots (
  id BIGSERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  developer_username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  powr_score INTEGER NOT NULL CHECK (powr_score BETWEEN 0 AND 100),
  job_match_score INTEGER NOT NULL CHECK (job_match_score BETWEEN 0 AND 100),
  explanation JSONB NOT NULL,
  created_by_recruiter_id INTEGER REFERENCES recruiters(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sourcing_match_snapshots_lookup
  ON sourcing_match_snapshots (organization_id, job_id, developer_username, created_at DESC);

CREATE TABLE IF NOT EXISTS job_sourced_candidates (
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  developer_username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  match_snapshot_id BIGINT NOT NULL REFERENCES sourcing_match_snapshots(id),
  sourced_by_recruiter_id INTEGER REFERENCES recruiters(id),
  status TEXT NOT NULL DEFAULT 'sourced'
    CHECK (status IN ('sourced', 'contacted', 'invited', 'declined', 'applied')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (job_id, developer_username)
);

ALTER TABLE organization_talent_list_members
  ADD COLUMN IF NOT EXISTS added_by_recruiter_id INTEGER REFERENCES recruiters(id),
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS match_snapshot_id BIGINT REFERENCES sourcing_match_snapshots(id);

CREATE OR REPLACE FUNCTION prevent_sourcing_snapshot_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'sourcing match snapshots are immutable';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sourcing_match_snapshots_immutable ON sourcing_match_snapshots;
CREATE TRIGGER sourcing_match_snapshots_immutable
BEFORE UPDATE OR DELETE ON sourcing_match_snapshots
FOR EACH ROW EXECUTE FUNCTION prevent_sourcing_snapshot_mutation();
