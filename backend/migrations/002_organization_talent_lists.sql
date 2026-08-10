CREATE TABLE IF NOT EXISTS organization_talent_lists (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  source_saved_pool_id INTEGER UNIQUE REFERENCES saved_pools(id) ON DELETE SET NULL,
  created_by_recruiter_id INTEGER REFERENCES recruiters(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS organization_talent_list_members (
  talent_list_id INTEGER NOT NULL REFERENCES organization_talent_lists(id) ON DELETE CASCADE,
  developer_username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (talent_list_id, developer_username)
);

INSERT INTO organization_talent_lists (organization_id, name, source_saved_pool_id, created_by_recruiter_id)
SELECT organization_id, name, id, recruiter_id
FROM saved_pools
WHERE organization_id IS NOT NULL
ON CONFLICT (source_saved_pool_id) DO NOTHING;

INSERT INTO organization_talent_list_members (talent_list_id, developer_username, added_at)
SELECT l.id, m.developer_username, m.added_at
FROM saved_pools p
JOIN organization_talent_lists l ON l.source_saved_pool_id = p.id
JOIN pool_members m ON m.pool_id = p.id
ON CONFLICT DO NOTHING;
