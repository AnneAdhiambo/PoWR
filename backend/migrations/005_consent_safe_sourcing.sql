ALTER TABLE developer_recruiting_preferences
  ALTER COLUMN discoverable SET DEFAULT FALSE,
  ALTER COLUMN contactable SET DEFAULT FALSE;

UPDATE developer_recruiting_preferences
SET discoverable = FALSE,
    contactable = FALSE,
    updated_at = NOW()
WHERE discoverable = TRUE OR contactable = TRUE;

DELETE FROM organization_talent_list_members;
DELETE FROM job_sourced_candidates;
