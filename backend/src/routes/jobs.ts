import express from "express";
import { dbService } from "../services/database";
import { requireRecruiter, RecruiterJwtPayload } from "../middleware/requireRecruiter";

const router = express.Router();

// ── Jobs ─────────────────────────────────────────────────────────────────────

// GET /api/jobs — public
router.get("/jobs", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const offset = (page - 1) * limit;
    const result = await dbService.getJobs({ limit, offset });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/jobs/my — recruiter's own jobs
router.get("/jobs/my", requireRecruiter, async (req, res) => {
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
    const job = await dbService.getJobById(Number(req.params.id));
    if (!job) return res.status(404).json({ error: "Not found" });
    res.json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/jobs — requireRecruiter
router.post("/jobs", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { title, company, location, salary, type, description, tags } = req.body;
    if (!title || !company || !location) {
      return res.status(400).json({ error: "title, company, and location are required" });
    }
    const job = await dbService.createJob(recruiterId, { title, company, location, salary, type, description, tags });
    res.status(201).json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/jobs/:id — requireRecruiter
router.put("/jobs/:id", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const job = await dbService.updateJob(Number(req.params.id), recruiterId, req.body);
    if (!job) return res.status(404).json({ error: "Not found or unauthorized" });
    res.json({ job });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id — requireRecruiter
router.delete("/jobs/:id", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    await dbService.deleteJob(Number(req.params.id), recruiterId);
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
router.get("/gigs/my", requireRecruiter, async (req, res) => {
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
router.post("/gigs", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { title, client, location, rate, duration, description, tags } = req.body;
    if (!title || !client || !location) {
      return res.status(400).json({ error: "title, client, and location are required" });
    }
    const gig = await dbService.createGig(recruiterId, { title, client, location, rate, duration, description, tags });
    res.status(201).json({ gig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/gigs/:id — requireRecruiter
router.put("/gigs/:id", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const gig = await dbService.updateGig(Number(req.params.id), recruiterId, req.body);
    if (!gig) return res.status(404).json({ error: "Not found or unauthorized" });
    res.json({ gig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/gigs/:id — requireRecruiter
router.delete("/gigs/:id", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    await dbService.deleteGig(Number(req.params.id), recruiterId);
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
router.post("/user/nostr-pubkey", async (req, res) => {
  try {
    const { username, pubkey } = req.body;
    if (!username || !pubkey) {
      return res.status(400).json({ error: "username and pubkey required" });
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
