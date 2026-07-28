import { NextFunction, Request, Response, Router } from "express";
import { requireDeveloper, DeveloperJwtPayload } from "../middleware/requireDeveloper";
import {
  OrganizationContext,
  RecruiterJwtPayload,
  requireOrganizationMember,
  requireOrganizationRole,
  requireRecruiter,
} from "../middleware/requireRecruiter";
import { referralService, referralsEnabled } from "../services/referralService";
import { ReferralOutcome } from "../types/referrals";

const router = Router();
const outcomes = new Set<ReferralOutcome>([
  "interviewed", "hired", "retained_90_days", "strong_performance",
  "performance_concern", "rejected", "job_closed", "candidate_withdrew",
]);

function requireReferralFeature(_req: Request, res: Response, next: NextFunction) {
  if (!referralsEnabled()) return res.status(404).json({ error: "Referral reputation is not enabled" });
  next();
}

router.use(requireReferralFeature);

router.post("/referrals", requireDeveloper, async (req, res) => {
  try {
    const developer = (req as any).developer as DeveloperJwtPayload;
    const jobId = Number(req.body.jobId);
    const candidateUsername = String(req.body.candidateUsername || "").trim();
    if (!Number.isInteger(jobId) || !candidateUsername) return res.status(400).json({ error: "jobId and candidateUsername are required" });
    const referral = await referralService.create({
      jobId,
      candidateUsername,
      referrerUsername: developer.username,
      relationship: String(req.body.relationship || "").trim().slice(0, 160),
      evidenceNote: String(req.body.evidenceNote || "").trim().slice(0, 2000),
    });
    res.status(201).json({ referral, consentUrl: `/referrals/${referral.consent_token}` });
  } catch (error: any) {
    const status = error?.code === "23505" ? 409 : error.message?.includes("Self-referrals") ? 400 : 404;
    res.status(status).json({ error: error.message || "Unable to create referral" });
  }
});

router.get("/referrals/mine", requireDeveloper, async (req, res) => {
  const developer = (req as any).developer as DeveloperJwtPayload;
  res.json({ referrals: await referralService.listForDeveloper(developer.username) });
});

router.get("/referrals/consent/:token", async (req, res) => {
  try {
    const referral = await referralService.consentPreview(req.params.token);
    if (!referral) return res.status(404).json({ error: "Referral invitation not found" });
    res.json({ referral });
  } catch {
    res.status(400).json({ error: "Invalid referral invitation" });
  }
});

router.post("/referrals/consent/:token", async (req, res) => {
  const decision = req.body.decision;
  if (decision !== "accept" && decision !== "decline") return res.status(400).json({ error: "Decision must be accept or decline" });
  try {
    const referral = await referralService.decideConsent(req.params.token, decision);
    if (!referral) return res.status(410).json({ error: "Referral invitation is expired or already answered" });
    res.json({ referral });
  } catch {
    res.status(400).json({ error: "Invalid referral invitation" });
  }
});

router.get("/recruiter/referrals", requireRecruiter, requireOrganizationMember, async (req, res) => {
  const organization = (req as any).organization as OrganizationContext;
  res.json({ referrals: await referralService.listForOrganization(organization.organizationId) });
});

router.post(
  "/recruiter/referrals/:referralId/outcomes",
  requireRecruiter,
  requireOrganizationMember,
  requireOrganizationRole("owner", "admin", "recruiter", "hiring_manager"),
  async (req, res) => {
    const outcome = req.body.outcome as ReferralOutcome;
    if (!outcomes.has(outcome)) return res.status(400).json({ error: "Invalid referral outcome" });
    const organization = (req as any).organization as OrganizationContext;
    const recruiter = (req as any).recruiter as RecruiterJwtPayload;
    const result = await referralService.recordOutcome(
      organization.organizationId,
      recruiter.recruiterId,
      req.params.referralId,
      outcome,
      String(req.body.privateNote || "").trim().slice(0, 2000),
    );
    if (!result) return res.status(404).json({ error: "Accepted referral not found in this organization" });
    res.status(201).json(result);
  },
);

router.post("/referrals/:referralId/appeals", requireDeveloper, async (req, res) => {
  const developer = (req as any).developer as DeveloperJwtPayload;
  const ledgerEntryId = String(req.body.ledgerEntryId || "");
  const reason = String(req.body.reason || "").trim();
  if (!ledgerEntryId || reason.length < 10) return res.status(400).json({ error: "Ledger entry and a clear reason are required" });
  const appeal = await referralService.appeal(developer.username, req.params.referralId, ledgerEntryId, reason);
  if (!appeal) return res.status(404).json({ error: "Eligible referral ledger entry not found" });
  res.status(201).json({ appeal });
});

router.post(
  "/recruiter/referrals/appeals/:appealId/resolve",
  requireRecruiter,
  requireOrganizationMember,
  requireOrganizationRole("owner", "admin"),
  async (req, res) => {
    const organization = (req as any).organization as OrganizationContext;
    const recruiter = (req as any).recruiter as RecruiterJwtPayload;
    const appeal = await referralService.resolveAppeal(
      organization.organizationId,
      recruiter.recruiterId,
      req.params.appealId,
      Boolean(req.body.uphold),
      String(req.body.note || "").trim().slice(0, 1000),
    );
    if (!appeal) return res.status(404).json({ error: "Open appeal not found in this organization" });
    res.json({ appeal });
  },
);

export default router;
