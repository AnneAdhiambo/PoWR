ALTER TABLE open_source_issues
  DROP CONSTRAINT IF EXISTS open_source_issues_street_points_check;

ALTER TABLE open_source_issues
  ADD CONSTRAINT open_source_issues_street_points_check
  CHECK (street_points BETWEEN 1 AND 100);

INSERT INTO schema_migrations (version)
VALUES ('open_source_bounty_range_v1')
ON CONFLICT (version) DO NOTHING;
