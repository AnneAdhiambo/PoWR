import express from "express";
import { randomUUID } from "crypto";
import { dbService } from "../services/database";
import { requireRecruiter, requireOrganizationMember, requireOrganizationRole, RecruiterJwtPayload } from "../middleware/requireRecruiter";
import { DeveloperJwtPayload, requireDeveloper } from "../middleware/requireDeveloper";
import { rateLimit } from "../middleware/rateLimit";

const router = express.Router();
const applicationRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, keyPrefix: "job-application" });

function isTenantHostname(hostname: string): boolean {
  return hostname.endsWith(".powr.localhost") || hostname.endsWith(".powr.dev");
}

// ── Jobs ─────────────────────────────────────────────────────────────────────

// GET /api/jobs — public
router.get("/jobs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const developmentHostname = process.env.NODE_ENV === "development" && process.env.ALLOW_TENANT_HEADER === "true" ? req.headers["x-powr-hostname"] : undefined;
    const hostname = String(developmentHostname || req.hostname || "").toLowerCase().split(":")[0];
    const organization = await dbService.getOrganizationByHostname(hostname);
    if (isTenantHostname(hostname) && !organization) return res.status(404).json({ error: "Tenant not found" });
    const result = organization ? await dbService.getOrganizationJobs(organization.id, { limit, offset }) : await dbService.getJobs({ limit, offset });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/my — recruiter's own jobs
router.get("/jobs/my", requireRecruiter, requireOrganizationMember, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const jobs = await dbService.getJobsByRecruiter(recruiterId);
    res.json({ jobs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/:id — public
router.get("/jobs/:id", async (req, res) => {
  try {
    const developmentHostname = process.env.NODE_ENV === "development" && process.env.ALLOW_TENANT_HEADER === "true" ? req.headers["x-powr-hostname"] : undefined;
    const hostname = String(developmentHostname || req.hostname || "").toLowerCase().split(":")[0];
    const organization = await dbService.getOrganizationByHostname(hostname);
    if (isTenantHostname(hostname) && !organization) return res.status(404).json({ error: "Tenant not found" });
    const job = organization ? await dbService.getOrganizationJobByIdentifier(organization.id, req.params.id) : await dbService.getJobByIdentifier(req.params.id);
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/jobs/:id/applications", applicationRateLimit, requireDeveloper, async (req, res) => {
  try {
    const { username } = (req as any).developer as DeveloperJwtPayload;
    const { applicant_email, cover_note, consent_given, screening_answers, shared_evidence } = req.body;
    if (!applicant_email || consent_given !== true) return res.status(400).json({ error: "Applicant email and consent are required" });
    const application = await dbService.createJobApplication(Number(req.params.id), username, applicant_email, cover_note, consent_given, randomUUID(), screening_answers || {}, shared_evidence || []);
    if (!application) return res.status(404).json({ error: "Job is not accepting applications" });
    res.status(201).json({ application });
  } catch (err: any) {
    res.status(err.code === "23505" ? 409 : 500).json({ error: err.code === "23505" ? "You already applied to this job" : err.message });
  }
});

router.patch("/applications/self", async (req, res) => {
  try {
    const accessToken = String(req.headers["x-application-token"] || req.body.access_token || "");
    if (!accessToken || !["withdraw", "revoke_consent"].includes(req.body.action)) return res.status(400).json({ error: "Application token and valid action are required" });
    const application = await dbService.updateDeveloperApplication(accessToken, req.body.action);
    if (!application) return res.status(404).json({ error: "Application not found or action unavailable" });
    res.json({ application });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs — requireRecruiter
router.post("/jobs", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin", "recruiter"), async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { title, company, location, salary, type, description, tags, department, remote_policy, seniority, closing_date, screening_questions, status } = req.body;
    if (!title || !company || !location) {
      return res.status(400).json({ error: "title, company, and location are required" });
    }
    if (status !== undefined && !["draft", "active"].includes(status)) return res.status(400).json({ error: "New jobs must be drafts or published" });
    const job = await dbService.createJob(recruiterId, { title, company, location, salary, type, description, tags, department, remote_policy, seniority, closing_date, screening_questions, status });
    const organization = (req as any).organization as { organizationId: number };
    await dbService.recordAuditEvent(organization.organizationId, recruiterId, "job.created", "job", String(job.id), { title });
    res.status(201).json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobs/:id — requireRecruiter
router.put("/jobs/:id", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin", "recruiter"), async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const allowedStatuses = ["draft", "active", "paused", "closed", "archived"];
    if (req.body.status !== undefined && !allowedStatuses.includes(req.body.status)) return res.status(400).json({ error: "Invalid job status" });
    const job = await dbService.updateJob(Number(req.params.id), recruiterId, req.body);
    if (!job) return res.status(404).json({ error: "Not found or unauthorized" });
    const organization = (req as any).organization as { organizationId: number };
    await dbService.recordAuditEvent(organization.organizationId, recruiterId, "job.updated", "job", String(job.id), { fields: Object.keys(req.body) });
    res.json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/jobs/:id/duplicate", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin", "recruiter"), async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const job = await dbService.duplicateJob(Number(req.params.id), recruiterId);
    if (!job) return res.status(404).json({ error: "Not found or unauthorized" });
    const organization = (req as any).organization as { organizationId: number };
    await dbService.recordAuditEvent(organization.organizationId, recruiterId, "job.duplicated", "job", String(job.id), { sourceJobId: Number(req.params.id) });
    res.status(201).json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id — requireRecruiter
router.delete("/jobs/:id", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin", "recruiter"), async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const organization = (req as any).organization as { organizationId: number };
    const deleted = await dbService.deleteJob(Number(req.params.id), organization.organizationId);
    if (!deleted) return res.status(404).json({ error: "Job not found" });
    await dbService.recordAuditEvent(organization.organizationId, recruiterId, "job.deleted", "job", req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Gigs ─────────────────────────────────────────────────────────────────────

// GET /api/gigs — public
router.get("/gigs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const result = await dbService.getGigs({ limit, offset });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gigs/my — recruiter's own gigs
router.get("/gigs/my", requireRecruiter, requireOrganizationMember, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const gigs = await dbService.getGigsByRecruiter(recruiterId);
    res.json({ gigs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/gigs/:id — public
router.get("/gigs/:id", async (req, res) => {
  try {
    const gig = await dbService.getGigById(Number(req.params.id));
    if (!gig) return res.status(404).json({ error: "Not found" });
    res.json({ gig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gigs — requireRecruiter
router.post("/gigs", requireRecruiter, requireOrganizationMember, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { title, client, location, rate, duration, description, tags } = req.body;
    if (!title || !client || !location) {
      return res.status(400).json({ error: "title, client, and location are required" });
    }
    const gig = await dbService.createGig(recruiterId, { title, client, location, rate, duration, description, tags });
    const organization = (req as any).organization as { organizationId: number };
    await dbService.recordAuditEvent(organization.organizationId, recruiterId, "gig.created", "gig", String(gig.id), { title });
    res.status(201).json({ gig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gigs/:id — requireRecruiter
router.put("/gigs/:id", requireRecruiter, requireOrganizationMember, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const gig = await dbService.updateGig(Number(req.params.id), recruiterId, req.body);
    if (!gig) return res.status(404).json({ error: "Not found or unauthorized" });
    const organization = (req as any).organization as { organizationId: number };
    await dbService.recordAuditEvent(organization.organizationId, recruiterId, "gig.updated", "gig", String(gig.id), { fields: Object.keys(req.body) });
    res.json({ gig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gigs/:id — requireRecruiter
router.delete("/gigs/:id", requireRecruiter, requireOrganizationMember, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    await dbService.deleteGig(Number(req.params.id), recruiterId);
    const organization = (req as any).organization as { organizationId: number };
    await dbService.recordAuditEvent(organization.organizationId, recruiterId, "gig.deleted", "gig", req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Nostr pubkey ─────────────────────────────────────────────────────────────

// GET /api/user/nostr-pubkey/:username — public
router.get("/user/nostr-pubkey/:username", async (req, res) => {
  try {
    const pubkey = await dbService.getUserNostrPubkey(req.params.username);
    res.json({ pubkey });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/user/nostr-pubkey — developer registers pubkey after login
router.post("/user/nostr-pubkey", requireDeveloper, async (req, res) => {
  try {
    const { username } = (req as any).developer as DeveloperJwtPayload;
    const { pubkey } = req.body;
    if (!/^[0-9a-f]{64}$/i.test(String(pubkey || ""))) {
      return res.status(400).json({ error: "Valid pubkey required" });
    }
    const user = await dbService.getUser(username);
    if (!user) return res.status(404).json({ error: "User not found" });
    await dbService.updateUserNostrPubkey(username, pubkey);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
