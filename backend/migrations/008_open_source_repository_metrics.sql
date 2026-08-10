ALTER TABLE open_source_projects
  ADD COLUMN IF NOT EXISTS commit_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pull_request_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fork_count INTEGER NOT NULL DEFAULT 0;

INSERT INTO schema_migrations (version)
VALUES ('open_source_repository_metrics_v1')
ON CONFLICT (version) DO NOTHING;
