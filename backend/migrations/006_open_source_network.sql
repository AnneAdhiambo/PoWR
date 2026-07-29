CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS open_source_projects (
  id SERIAL PRIMARY KEY,
  github_full_name TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  description TEXT,
  primary_language TEXT,
  topics TEXT[] NOT NULL DEFAULT '{}',
  license_spdx TEXT,
  stars INTEGER NOT NULL DEFAULT 0,
  open_issues INTEGER NOT NULL DEFAULT 0,
  repository_url TEXT NOT NULL,
  contribution_guide_url TEXT,
  partner BOOLEAN NOT NULL DEFAULT FALSE,
  partner_guidance TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended', 'archived', 'rejected')),
  health_score INTEGER NOT NULL DEFAULT 50 CHECK (health_score BETWEEN 0 AND 100),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS open_source_project_nominations (
  id SERIAL PRIMARY KEY,
  github_full_name TEXT NOT NULL,
  nominated_by_username TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_reason TEXT,
  reviewed_by_recruiter_id INTEGER REFERENCES recruiters(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(github_full_name, nominated_by_username)
);

CREATE TABLE IF NOT EXISTS open_source_issues (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES open_source_projects(id) ON DELETE CASCADE,
  github_issue_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body_excerpt TEXT,
  issue_url TEXT NOT NULL,
  labels TEXT[] NOT NULL DEFAULT '{}',
  assignee_login TEXT,
  difficulty TEXT NOT NULL DEFAULT 'standard' CHECK (difficulty IN ('starter', 'standard', 'advanced', 'expert')),
  street_points INTEGER NOT NULL DEFAULT 10 CHECK (street_points IN (5, 10, 20, 30)),
  state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'closed', 'hidden')),
  published BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, github_issue_number)
);

CREATE TABLE IF NOT EXISTS open_source_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id INTEGER NOT NULL REFERENCES open_source_issues(id),
  developer_username TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMPTZ NOT NULL,
  pull_request_url TEXT,
  pull_request_number INTEGER,
  pull_request_author TEXT,
  merge_commit_sha TEXT,
  verification_snapshot JSONB,
  status TEXT NOT NULL DEFAULT 'interested' CHECK (
    status IN ('interested', 'pr_open', 'merged_pending_review', 'approved', 'denied', 'needs_information', 'revoked', 'expired', 'withdrawn')
  ),
  review_reason TEXT,
  private_review_notes TEXT,
  reviewed_by_recruiter_id INTEGER REFERENCES recruiters(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_open_source_active_claim
  ON open_source_claims(issue_id, developer_username)
  WHERE status NOT IN ('denied', 'revoked', 'expired', 'withdrawn');

CREATE TABLE IF NOT EXISTS street_point_ledger (
  id BIGSERIAL PRIMARY KEY,
  developer_username TEXT NOT NULL,
  claim_id UUID REFERENCES open_source_claims(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  offsets_entry_id BIGINT REFERENCES street_point_ledger(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_street_points_claim_award
  ON street_point_ledger(claim_id) WHERE claim_id IS NOT NULL AND points > 0;
CREATE UNIQUE INDEX IF NOT EXISTS uq_street_points_offset
  ON street_point_ledger(offsets_entry_id) WHERE offsets_entry_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS open_source_appeals (
  id SERIAL PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES open_source_claims(id),
  developer_username TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'upheld', 'rejected')),
  resolution TEXT,
  reviewed_by_recruiter_id INTEGER REFERENCES recruiters(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_open_source_projects_discovery ON open_source_projects(status, partner, primary_language, health_score DESC);
CREATE INDEX IF NOT EXISTS idx_open_source_issues_discovery ON open_source_issues(project_id, state, published, difficulty, street_points);
CREATE INDEX IF NOT EXISTS idx_open_source_claims_developer ON open_source_claims(developer_username, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_open_source_claims_review ON open_source_claims(status, updated_at ASC);
CREATE INDEX IF NOT EXISTS idx_street_points_developer ON street_point_ledger(developer_username, created_at DESC);
