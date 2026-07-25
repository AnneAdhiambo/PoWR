# PoWR Recruiting Ecosystem Specification

**Status:** Proposed

## Purpose

PoWR will offer a multi-tenant recruiting product where an organization runs a
public careers site and private recruiter workspace on its own PoWR subdomain.
For example, `contoso.powr.dev/jobs` lists Contoso roles and
`contoso.powr.dev/recruiter` is Contoso's recruiting workspace.

The first release combines:

1. A public employer profile, jobs site, and developer application flow.
2. An organization-owned applicant tracking system for recruiters and hiring
   managers.
3. PoWR developer profiles, verified evidence, and Power Scores as transparent
   sourcing signals.

It is not initially a payroll, background-check, or HRIS product.

## Starting Point

| Existing capability | Required evolution |
| --- | --- |
| Recruiter signup/login and JWTs | Add organization memberships and roles. |
| Recruiter-owned jobs and gigs | Make each record organization-scoped. |
| Developer search by skill and Power Score | Add opt-in consent and job-specific matching. |
| Recruiter saved pools | Convert to shared organization talent lists. |
| Next.js recruiter pages | Add tenant context, pipeline, team, and careers pages. |

The current `jobs` and `gigs` tables use `recruiter_id`. This must change before
multi-person company workspaces can be safe and useful.

## Tenant Domains

Each organization has an internal ID, an immutable unique slug, display name,
and status: `pending`, `active`, `suspended`, or `archived`.

| Host and path | Experience |
| --- | --- |
| `powr.dev` | Marketing, global discovery, developer onboarding, company signup. |
| `contoso.powr.dev` | Contoso public employer profile. |
| `contoso.powr.dev/jobs` | Contoso active jobs. |
| `contoso.powr.dev/jobs/[job-slug]` | Job detail and application. |
| `contoso.powr.dev/recruiter` | Authenticated Contoso workspace. |

Implementation requirements:

1. Configure wildcard DNS and TLS for `*.powr.dev`.
2. Add Next.js middleware that reads `Host`, extracts the subdomain, resolves
   the tenant, and internally rewrites to `/_tenants/[slug]/...`.
3. Render a platform 404 for unknown or suspended tenants.
4. Use same-origin `/api` calls or a server-side proxy. The backend resolves the
   organization itself and never trusts a browser-supplied organization ID.
5. Reserve platform names such as `www`, `api`, `app`, `admin`, `auth`, `docs`,
   and `status`. Slugs allow lowercase letters, digits, and single hyphens.

Custom domains such as `careers.contoso.com` are deferred, but the data model
includes `organization_domains` so they can be introduced safely later.

## Access Model

| Role | Main permissions |
| --- | --- |
| Owner | Billing, domains, team, settings, all jobs and candidates. |
| Admin | Team, jobs, pipelines, lists, and reports. |
| Recruiter | Assigned jobs, sourcing, pipelines, and approved outreach. |
| Hiring manager | Assigned candidate review and pipeline feedback. |
| Interviewer | Assigned candidate packets and scorecards only. |
| Developer | Profile visibility, applications, evidence sharing, and referrals. |

The existing company-signup flow creates the organization and makes its creator
the owner and first recruiter. Every private request resolves this context:

```text
organizationId, organizationSlug, membershipRole, actorId, requestId
```

All queries include `organization_id`; cross-tenant private requests return
`404` so they do not leak resource existence.

## End-to-End Flows

### Company onboarding

1. A recruiter signs up with company name and desired slug.
2. PoWR creates the organization, domain record, and owner membership.
3. The owner publishes a profile with logo, summary, website, location,
   benefits, and social links.
4. The owner invites teammates and assigns roles.

### Job lifecycle

1. A recruiter creates a job draft in the tenant workspace.
2. The job includes title, department, type, locations and remote policy,
   compensation range, description, skills, seniority, questions, and close
   date.
3. An admin or hiring manager approves it when approval is configured.
4. Publishing assigns an immutable public slug and lists it on the company site
   and global PoWR discovery.
5. Pausing, closing, and archiving remove it from public listings but retain
   applications and audit history.

### Sourcing and pipeline

1. A recruiter opens an active job and selects **Source candidates**.
2. PoWR searches opt-in developers using skills, verified proofs, Power Score,
   work preferences, location/time zone, and recency.
3. Results explain matching skills, evidence, score summary, and missing
   requirements; a raw score never decides ranking.
4. Recruiters add candidates to shared talent lists or a job pipeline as
   `sourced`.
5. Developers apply, answer questions, and consent to share selected PoWR
   evidence with that organization.
6. Teams move candidates through `applied`, `screening`, `interview`,
   `assessment`, `offer`, `hired`, `rejected`, or `withdrawn`.
7. Every movement records actor, timestamp, reason code, and optional internal
   note; internal notes are never candidate-visible.

## Data Model

Use versioned PostgreSQL migrations instead of application-start schema updates.
New shared records use UUID primary keys and UTC timestamps.

| Table | Key fields |
| --- | --- |
| `organizations` | `id`, `slug`, `display_name`, `status`, `profile`, `created_by_recruiter_id` |
| `organization_domains` | `organization_id`, `hostname`, `kind`, `verified_at`, `is_primary` |
| `organization_members` | `organization_id`, `recruiter_id`, `role`, `status`, `invited_by`, `joined_at` |
| `organization_invitations` | `organization_id`, `email`, `role`, `token_hash`, `expires_at`, `accepted_at` |
| `audit_events` | `organization_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata` |
| `jobs` | `organization_id`, `created_by_member_id`, `public_slug`, `status`, role details |
| `job_members` | `job_id`, `member_id`, `role` |
| `job_skill_requirements` | `job_id`, `skill`, `importance`, `minimum_score` |
| `job_application_questions` | `job_id`, `question`, `type`, `required`, `position` |
| `applications` | `job_id`, `developer_username`, `source`, `status`, `profile_snapshot_id` |
| `pipeline_events` | `application_id`, `from_stage`, `to_stage`, `actor_member_id`, `reason_code`, `note` |
| `candidate_notes` | `organization_id`, `application_id`, `author_member_id`, `body`, `visibility` |
| `interview_scorecards` | `application_id`, `interviewer_member_id`, criteria and ratings |
| `candidate_consent` | `organization_id`, `developer_username`, `scope`, `granted_at`, `revoked_at` |
| `talent_lists` | `organization_id`, `name`, `created_by_member_id` |
| `talent_list_members` | `talent_list_id`, `developer_username`, `added_by_member_id`, `source` |
| `candidate_match_snapshots` | `job_id`, `developer_username`, match inputs, `score_version`, `explanation` |

Index tenant-private reads with `organization_id`; enforce one active
application per `(job_id, developer_username)`. Do not duplicate a developer's
full private profile into organization records.

## API Contract

Version new endpoints under `/api/v1`. Keep the current `/api/jobs` routes as
compatibility wrappers until clients migrate.

```text
GET  /api/v1/public/organizations/:slug
GET  /api/v1/public/organizations/:slug/jobs
GET  /api/v1/public/organizations/:slug/jobs/:jobSlug
POST /api/v1/public/organizations/:slug/jobs/:jobSlug/applications

POST /api/v1/organizations
GET  /api/v1/organizations/:slug/jobs
POST /api/v1/organizations/:slug/jobs
PATCH /api/v1/organizations/:slug/jobs/:jobId
POST /api/v1/organizations/:slug/jobs/:jobId/publish
POST /api/v1/organizations/:slug/jobs/:jobId/close
POST /api/v1/organizations/:slug/jobs/:jobId/sourcing/search
POST /api/v1/organizations/:slug/applications/:applicationId/stage
POST /api/v1/organizations/:slug/applications/:applicationId/notes
POST /api/v1/organizations/:slug/applications/:applicationId/outcome
GET  /api/v1/organizations/:slug/talent-lists
POST /api/v1/organizations/:slug/talent-lists
```

Application creation requires developer authentication, consent capture,
idempotency keys, rate limiting, and bot protection. Middleware passes a typed
`OrganizationContext` to controllers and services.

## Match Ranking

The job-match score is separate from a developer's global Power Score:

```text
jobMatch = skillFit + verifiedEvidenceFit + preferenceFit + activityFit
```

The UI exposes the input signals and lets recruiters change filters. It must
not use protected characteristics or proxies. Developers can opt out of
recruiter discovery; existing applications remain visible only by consent.

## Referral Reputation Graph (Follow-on)

Developers can recommend another developer for a specific job. An accepted
referral creates a graph edge. Only a verified, appealable outcome updates a
separate **referral reliability** signal; it never directly changes technical
skill scores.

Flow:

1. A developer recommends a candidate for a public job.
2. The candidate accepts or declines before the company sees the referral.
3. The recruiter can add an accepted referral to the job pipeline.
4. The organization records a reason-coded outcome at a defined milestone.
5. After the appeal period, an append-only ledger records a small, reversible
   referral reliability change for the referrer.

Fairness and abuse rules:

- A rejection alone is never a bad recommendation.
- A negative adjustment needs a verified quality signal, such as material
  misrepresentation or a confirmed early-performance mismatch, plus evidence,
  reason code, retention rules, and an appeal path.
- Start with a maximum `-0.5` to `+1.0` impact per referral on a 0-100 referral
  reliability subscore and a maximum three-point monthly movement.
- Decay old outcomes; require enough evidence before showing a subscore.
- Use `not_hired`, `role_changed`, `candidate_withdrew`, `hired`,
  `retained_90_days`, and `confirmed_mismatch`. Only the last may be negative.
- Detect self-referrals, reciprocal clusters, and high-volume spam; rate-limit
  and review suspicious graph activity.
- Never expose private employer feedback to referrers or candidates.

| Table | Key fields |
| --- | --- |
| `job_referrals` | `job_id`, `referrer_username`, `candidate_username`, `status`, `recommendation`, `accepted_at` |
| `referral_outcomes` | `referral_id`, `outcome`, `verified_by_member_id`, `evidence_reference`, `appeal_deadline` |
| `referral_reputation_ledger` | `referrer_username`, `referral_id`, `delta`, `reason`, `model_version`, `reversible_until` |
| `referral_graph_edges` | Privacy-filtered materialized graph edge and weighting data. |
| `referral_appeals` | `referral_id`, `actor_username`, `reason`, `status`, `resolution` |

The ledger is append-only; reversals add offsetting entries. Do not put private
hiring outcomes on-chain. Consider only future aggregates or hashes after a
privacy review.

## Delivery Plan

### Phase 0: Harden foundations

- Add a database migration runner.
- Fix production session handling, raw webhook validation, audit logging, and
  tenant authorization primitives.
- Build a wildcard-domain staging environment.

### Phase 1: Organization foundation

- Add organizations, domains, memberships, invitations, and audit events.
- Backfill one organization and owner membership for each existing recruiter
  company.
- Add and backfill `organization_id` on jobs and gigs; preserve legacy creator
  IDs during migration.
- Convert saved pools to organization talent lists.

### Phase 2: Careers sites and jobs

- Implement tenant middleware and public company/job pages.
- Add job drafting, validation, preview, publishing, pausing, closing, and
  archiving.

### Phase 3: Hiring workspace

- Add applications, consent, pipelines, notes, scorecards, team assignments,
  explainable sourcing, notifications, and analytics.

### Phase 4: Referral graph

- Ship referrals behind a feature flag, beginning with candidate acceptance.
- Add verified outcomes, appeals, abuse review, bounded ledger impacts, and
  monitoring before displaying referral reliability.

## Security and Release Criteria

- Require a production `JWT_SECRET`; remove the current fallback.
- Use short-lived tokens and refresh rotation or secure `httpOnly`, `SameSite`
  cookies.
- Enforce organization scope in middleware, services, and SQL predicates.
- Protect mutations with CSRF controls where cookie auth is used and rate-limit
  login, applications, outreach, and referrals.
- Treat notes, scorecards, application answers, referral evidence, and outcomes
  as confidential with defined retention and consent-revocation behavior.
- Preserve raw webhook payloads before validating signatures.
- Add tests for host resolution, role permissions, cross-tenant denial, job
  lifecycle, consent, and application idempotency.

The MVP is complete when an organization can manage a job at its subdomain,
multiple authorized recruiters can work a shared pipeline without tenant data
leaks, and an opt-in developer can apply and control the evidence they share.

## Repository Ownership

| Area | Expected work |
| --- | --- |
| `backend/src/services/database.ts` | Migrations and organization-scoped data access. |
| `backend/src/middleware` | Tenant resolution and membership authorization. |
| `backend/src/routes/jobs.ts` | Organization jobs and public tenant endpoints. |
| `backend/src/routes/recruiter.ts` | Organizations, teams, pipelines, and talent lists. |
| `backend/src/services/recruiterService.ts` | Secure sessions and organization onboarding. |
| `frontend/middleware.ts` | Wildcard host parsing and tenant rewrites. |
| `frontend/app` | Tenant careers pages and recruiter workspace. |
| `frontend/app/lib/recruiterApi.ts` | Versioned tenant-aware workspace API client. |
| `backend/tests`, `frontend/tests` | Tenant isolation, authorization, jobs, pipeline, and referral tests. |

