import express from "express";
import { rateLimit } from "../middleware/rateLimit";
import { requireDeveloper, DeveloperJwtPayload } from "../middleware/requireDeveloper";
import { requireOrganizationMember, requireOrganizationRole, requireRecruiter, RecruiterJwtPayload } from "../middleware/requireRecruiter";
import { openSourceService } from "../services/openSourceService";

const router = express.Router();
const writes = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, keyPrefix: "open-source-write" });
const fail = (error: any, res: express.Response) => res.status(error.status || 400).json({ error: error.message || "Open Source request failed" });

router.get("/open-source/projects", async (req, res) => {
  try {
    openSourceService.assertEnabled();
    res.json(await openSourceService.projects({
      q: String(req.query.q || "") || undefined,
      language: String(req.query.language || "") || undefined,
      partner: req.query.partner === undefined ? undefined : req.query.partner === "true",
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    }));
  } catch (error) { fail(error, res); }
});

router.get("/open-source/recommended", async (_req, res) => {
  try { res.json({ projects: await openSourceService.weeklyRecommended(3) }); }
  catch (error) { fail(error, res); }
});

router.get("/open-source/github-search", async (req, res) => {
  try { res.json({ projects: await openSourceService.searchGithub(String(req.query.q || "")) }); }
  catch (error) { fail(error, res); }
});

router.get("/open-source/developers/:username/repositories", async (req, res) => {
  try { res.json(await openSourceService.developerRepositories(req.params.username)); }
  catch (error) { fail(error, res); }
});

router.get("/open-source/projects/:id", async (req, res) => {
  try {
    openSourceService.assertEnabled();
    const project = await openSourceService.project(Number(req.params.id));
    project ? res.json({ project }) : res.status(404).json({ error: "Project not found" });
  } catch (error) { fail(error, res); }
});

router.post("/open-source/nominations", requireDeveloper, writes, async (req, res) => {
  try {
    openSourceService.assertEnabled();
    const user = (req as any).developer as DeveloperJwtPayload;
    res.status(201).json(await openSourceService.nominate(user.username, req.body.githubFullName, req.body.reason));
  } catch (error) { fail(error, res); }
});

router.post("/open-source/issues/:id/claims", requireDeveloper, writes, async (req, res) => {
  try {
    openSourceService.assertEnabled();
    const user = (req as any).developer as DeveloperJwtPayload;
    res.status(201).json(await openSourceService.claim(user.username, Number(req.params.id)));
  } catch (error) { fail(error, res); }
});

router.put("/open-source/claims/:id/pull-request", requireDeveloper, writes, async (req, res) => {
  try {
    openSourceService.assertEnabled();
    const user = (req as any).developer as DeveloperJwtPayload;
    res.json({ claim: await openSourceService.verify(user.username, req.params.id, req.body.pullRequestUrl) });
  } catch (error) { fail(error, res); }
});

router.get("/open-source/me/claims", requireDeveloper, async (req, res) => {
  try {
    const user = (req as any).developer as DeveloperJwtPayload;
    res.json({ claims: await openSourceService.claims(user.username) });
  } catch (error) { fail(error, res); }
});

router.post("/open-source/claims/:id/withdraw", requireDeveloper, writes, async (req, res) => {
  try {
    const user = (req as any).developer as DeveloperJwtPayload;
    res.json({ claim: await openSourceService.withdraw(user.username, req.params.id) });
  } catch (error) { fail(error, res); }
});

router.post("/open-source/claims/:id/appeals", requireDeveloper, writes, async (req, res) => {
  try {
    const user = (req as any).developer as DeveloperJwtPayload;
    res.status(201).json({ appeal: await openSourceService.appeal(user.username, req.params.id, String(req.body.reason || "")) });
  } catch (error) { fail(error, res); }
});

router.get("/open-source/profile/:username", async (req, res) => {
  try { res.json({ openSource: await openSourceService.profile(req.params.username) }); }
  catch (error) { fail(error, res); }
});

router.get("/open-source/admin/review-queue", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin"), async (_req, res) => {
  try { res.json({ claims: await openSourceService.queue() }); }
  catch (error) { fail(error, res); }
});

router.get("/open-source/admin/nominations", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin"), async (_req, res) => {
  try { res.json({ nominations: await openSourceService.nominations() }); }
  catch (error) { fail(error, res); }
});

router.post("/open-source/admin/nominations/:id/review", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin"), writes, async (req, res) => {
  try {
    const recruiter = (req as any).recruiter as RecruiterJwtPayload;
    res.json({ nomination: await openSourceService.reviewNomination(recruiter.recruiterId, Number(req.params.id), req.body.decision, req.body.reason) });
  } catch (error) { fail(error, res); }
});

router.post("/open-source/admin/claims/:id/review", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin"), writes, async (req, res) => {
  try {
    const recruiter = (req as any).recruiter as RecruiterJwtPayload;
    res.json({ claim: await openSourceService.review(recruiter.recruiterId, req.params.id, req.body.decision, req.body.reason, req.body.privateNotes) });
  } catch (error) { fail(error, res); }
});

router.post("/open-source/admin/projects/:id/sync", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin"), writes, async (req, res) => {
  try { res.json({ project: await openSourceService.sync(Number(req.params.id)) }); }
  catch (error) { fail(error, res); }
});

router.patch("/open-source/admin/projects/:id", requireRecruiter, requireOrganizationMember, requireOrganizationRole("owner", "admin"), writes, async (req, res) => {
  try { res.json({ project: await openSourceService.configureProject(Number(req.params.id), req.body) }); }
  catch (error) { fail(error, res); }
});

export default router;
