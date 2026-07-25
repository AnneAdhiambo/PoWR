# Database Migrations

The backend currently applies idempotent PostgreSQL schema migrations during
startup through `src/services/database.ts`. The migration marker is stored in
the `schema_migrations` table so future migrations can be tracked without
recreating organization data.

## Recruiting Organizations v1

The `recruiting_organizations_v1` migration creates:

- `organizations` and `organization_domains` for tenant identity;
- `organization_members` and `organization_invitations` for access control;
- `audit_events` for organization-scoped activity history; and
- organization references and indexes on `jobs`, `gigs`, and `saved_pools`.

For existing recruiters, the migration creates one organization per recruiter,
generates a deterministic slug with the recruiter ID suffix, creates a primary
`<slug>.powr.dev` domain, and makes the recruiter its owner. Existing jobs,
gigs, and saved pools are backfilled to that organization without changing
their legacy recruiter ownership.

## Local Verification

1. Set `DATABASE_URL` in `backend/.env`.
2. Start the backend with `npm run dev`.
3. Confirm the startup log reports successful PostgreSQL table initialization.
4. Verify the following records in PostgreSQL:

```sql
SELECT version FROM schema_migrations ORDER BY applied_at;
SELECT id, slug, display_name FROM organizations ORDER BY id;
SELECT organization_id, COUNT(*) FROM jobs GROUP BY organization_id;
SELECT organization_id, COUNT(*) FROM gigs GROUP BY organization_id;
```

The migration is safe to run repeatedly. It does not delete records or replace
existing organization assignments.
