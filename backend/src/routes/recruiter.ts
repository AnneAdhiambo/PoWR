import express from "express";
import { recruiterService } from "../services/recruiterService";
import { dbService } from "../services/database";
import { requireRecruiter, RecruiterJwtPayload } from "../middleware/requireRecruiter";
import { Currency } from "../services/paymentService";

// Recruiter plan pricing (USD/month)
const RECRUITER_PLAN_PRICES: Record<string, number> = { pro: 49, enterprise: 299 };

async function fetchBtcPrice(): Promise<number> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
  const data = await res.json() as any;
  const price = data?.bitcoin?.usd;
  if (!price || typeof price !== "number") throw new Error("Could not fetch BTC price");
  return price;
}

async function fetchStxPrice(): Promise<number> {
  const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd");
  const data = await res.json() as any;
  const price = data?.blockstack?.usd;
  if (!price || typeof price !== "number") throw new Error("Could not fetch STX price");
  return price;
}

const router = express.Router();

// POST /api/recruiter/auth/signup
router.post("/auth/signup", async (req, res) => {
  try {
    const { email, password, company_name, company_size } = req.body;
    if (!email || !password || !company_name) {
      return res.status(400).json({ error: "Email, password, and company_name required" });
    }
    const result = await recruiterService.signup(email, password, company_name, company_size);
    res.json(result);
  } catch (error: any) {
    console.error("[Recruiter] Signup error:", error.message);
    const status = error.message.includes("already registered") ? 409 : 400;
    res.status(status).json({ error: error.message });
  }
});

// POST /api/recruiter/auth/login
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }
    const result = await recruiterService.login(email, password);
    res.json(result);
  } catch (error: any) {
    console.error("[Recruiter] Login error:", error.message);
    res.status(401).json({ error: error.message });
  }
});

// GET /api/recruiter/me
router.get("/me", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const recruiter = await dbService.getRecruiterById(recruiterId);
    if (!recruiter) return res.status(404).json({ error: "Recruiter not found" });
    res.json({
      recruiter: {
        id: recruiter.id,
        email: recruiter.email,
        companyName: recruiter.company_name,
        companySize: recruiter.company_size,
        plan: recruiter.plan,
        createdAt: recruiter.created_at,
        lastLogin: recruiter.last_login,
      },
    });
  } catch (error: any) {
    console.error("[Recruiter] Get me error:", error.message);
    res.status(500).json({ error: "Failed to get profile" });
  }
});

// GET /api/recruiter/search
router.get("/search", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId, role } = (req as any).recruiter as RecruiterJwtPayload;
    const recruiterRow = await dbService.getRecruiterById(recruiterId);
    if (!recruiterRow) return res.status(404).json({ error: "Recruiter not found" });

    const {
      skills,
      minScore,
      maxScore,
      activeWithin,
      hasOnChainProof,
      page,
      limit,
    } = req.query;

    const skillList = skills
      ? (skills as string).split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const result = await dbService.searchDevelopers({
      skills: skillList,
      minScore: minScore ? parseInt(minScore as string, 10) : undefined,
      maxScore: maxScore ? parseInt(maxScore as string, 10) : undefined,
      activeWithinDays: activeWithin ? parseInt(activeWithin as string, 10) : undefined,
      hasOnChainProof: hasOnChainProof === "true" ? true : hasOnChainProof === "false" ? false : undefined,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? Math.min(parseInt(limit as string, 10), 50) : 20,
    });

    res.json(result);
  } catch (error: any) {
    console.error("[Recruiter] Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// GET /api/recruiter/developer/:username
router.get("/developer/:username", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { username } = req.params;

    const recruiterRow = await dbService.getRecruiterById(recruiterId);
    if (!recruiterRow) return res.status(404).json({ error: "Recruiter not found" });

    // Check view limit for free plan
    const limitCheck = await recruiterService.checkViewLimit(recruiterId, recruiterRow.plan);
    if (!limitCheck.allowed) {
      return res.status(402).json({
        error: "View limit reached",
        upgradeRequired: true,
        viewsUsed: limitCheck.viewsUsed,
        viewsLimit: limitCheck.viewsLimit,
      });
    }

    const [profile, proofs, user] = await Promise.all([
      dbService.getProfileWithMeta(username),
      dbService.getBlockchainProofs(username),
      dbService.getUser(username),
    ]);

    if (!profile) {
      return res.status(404).json({ error: "Developer not found or no profile available" });
    }

    // Log the view
    await dbService.logRecruiterView(recruiterId, username);

    res.json({
      username,
      profile: profile.profile,
      lastAnalyzed: profile.lastAnalyzed,
      artifactsCount: profile.artifactsCount,
      proofs: proofs.map((p) => ({
        transactionHash: p.transactionHash,
        artifactHash: p.artifactHash,
        stacksBlockHeight: p.blockNumber,
        timestamp: p.timestamp,
        skillScores: p.skillScores,
        createdAt: p.createdAt,
      })),
      isVerified: proofs.length > 0,
      viewsRemaining: limitCheck.viewsLimit !== null
        ? limitCheck.viewsLimit - limitCheck.viewsUsed - 1
        : null,
    });
  } catch (error: any) {
    console.error("[Recruiter] Developer profile error:", error.message);
    res.status(500).json({ error: "Failed to load developer profile" });
  }
});

// POST /api/recruiter/developer/:username/contact
router.post("/developer/:username/contact", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { username } = req.params;
    const { message } = req.body;

    const recruiterRow = await dbService.getRecruiterById(recruiterId);
    if (!recruiterRow) return res.status(404).json({ error: "Recruiter not found" });

    const limitCheck = await recruiterService.checkOutreachLimit(recruiterId, recruiterRow.plan);
    if (!limitCheck.allowed) {
      return res.status(402).json({
        error: recruiterRow.plan === "free"
          ? "Outreach requires a Pro plan"
          : "Monthly outreach limit reached",
        upgradeRequired: true,
      });
    }

    await dbService.createOutreach(recruiterId, username, message || "");
    res.json({ success: true, message: "Contact request sent" });
  } catch (error: any) {
    console.error("[Recruiter] Contact error:", error.message);
    res.status(500).json({ error: "Failed to send contact request" });
  }
});

// GET /api/recruiter/saved
router.get("/saved", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const pools = await dbService.getSavedPools(recruiterId);
    res.json({ pools });
  } catch (error: any) {
    console.error("[Recruiter] Get saved pools error:", error.message);
    res.status(500).json({ error: "Failed to get saved pools" });
  }
});

// POST /api/recruiter/saved
router.post("/saved", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Pool name required" });
    const pool = await dbService.createSavedPool(recruiterId, name);
    res.json({ pool });
  } catch (error: any) {
    console.error("[Recruiter] Create pool error:", error.message);
    res.status(500).json({ error: "Failed to create pool" });
  }
});

// GET /api/recruiter/saved/:poolId/members
router.get("/saved/:poolId/members", requireRecruiter, async (req, res) => {
  try {
    const poolId = parseInt(req.params.poolId, 10);
    const members = await dbService.getPoolMembers(poolId);
    res.json({ members });
  } catch (error: any) {
    console.error("[Recruiter] Get pool members error:", error.message);
    res.status(500).json({ error: "Failed to get pool members" });
  }
});

// POST /api/recruiter/saved/:poolId/members
router.post("/saved/:poolId/members", requireRecruiter, async (req, res) => {
  try {
    const poolId = parseInt(req.params.poolId, 10);
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    await dbService.addToPool(poolId, username);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Recruiter] Add to pool error:", error.message);
    res.status(500).json({ error: "Failed to add to pool" });
  }
});

// DELETE /api/recruiter/saved/:poolId/members/:username
router.delete("/saved/:poolId/members/:username", requireRecruiter, async (req, res) => {
  try {
    const poolId = parseInt(req.params.poolId, 10);
    const { username } = req.params;
    await dbService.removeFromPool(poolId, username);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Recruiter] Remove from pool error:", error.message);
    res.status(500).json({ error: "Failed to remove from pool" });
  }
});

// DELETE /api/recruiter/saved/:poolId
router.delete("/saved/:poolId", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const poolId = parseInt(req.params.poolId, 10);
    await dbService.deleteSavedPool(poolId, recruiterId);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[Recruiter] Delete pool error:", error.message);
    res.status(500).json({ error: "Failed to delete pool" });
  }
});

// ── Recruiter billing ──────────────────────────────────────────────────────

// POST /api/recruiter/billing/intent
// Returns a payment intent (address + amount) for the chosen plan + currency
router.post("/billing/intent", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { plan, currency } = req.body;

    if (!plan || !["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "plan must be 'pro' or 'enterprise'" });
    }

    const paymentAddress = process.env.PAYMENT_WALLET_ADDRESS;
    if (!paymentAddress) return res.status(500).json({ error: "Payment wallet not configured" });

    const usdMonthly = RECRUITER_PLAN_PRICES[plan];
    const network = (process.env.STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet") as "mainnet" | "testnet";

    const validCurrencies: Currency[] = ["stx", "sbtc", "usdcx"];
    const selectedCurrency: Currency = validCurrencies.includes(currency) ? currency : "stx";

    let amount: string;
    if (selectedCurrency === "usdcx") {
      amount = usdMonthly.toFixed(2);
    } else if (selectedCurrency === "sbtc") {
      const btcPrice = await fetchBtcPrice().catch(() => 87000);
      amount = (usdMonthly / btcPrice).toFixed(8);
    } else {
      // STX: live price from CoinGecko, fallback $0.30
      const stxPrice = await fetchStxPrice().catch(() => 0.30);
      amount = Math.round(usdMonthly / stxPrice).toString();
    }

    res.json({
      paymentIntent: {
        address: paymentAddress,
        amount,
        currency: selectedCurrency,
        planType: plan,
        billingPeriod: 1,
        network,
        usdTotal: usdMonthly, // canonical USD amount — frontend uses this for cross-currency display
      },
    });
  } catch (error: any) {
    console.error("[Recruiter] Billing intent error:", error.message);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
});

// POST /api/recruiter/billing/verify
// Verifies the on-chain payment and upgrades the recruiter's plan
router.post("/billing/verify", requireRecruiter, async (req, res) => {
  try {
    const { recruiterId } = (req as any).recruiter as RecruiterJwtPayload;
    const { txHash, plan, currency } = req.body;

    if (!txHash || !plan || !["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "txHash and valid plan required" });
    }

    const paymentAddress = process.env.PAYMENT_WALLET_ADDRESS;
    if (!paymentAddress) return res.status(500).json({ error: "Payment wallet not configured" });

    const validCurrencies: Currency[] = ["stx", "sbtc", "usdcx"];
    const selectedCurrency: Currency = validCurrencies.includes(currency) ? currency : "stx";

    // Demo mode: auto-approve demo_ txids
    if (process.env.DEMO_MODE === "true" && txHash.startsWith("demo_")) {
      console.log(`[DEMO] Auto-approving recruiter ${plan} upgrade for recruiter ${recruiterId}`);
      await dbService.updateRecruiterPlan(recruiterId, plan);
      return res.json({ success: true, plan });
    }

    // Real verification via Stacks API
    const { paymentService } = await import("../services/paymentService");
    const verification = await paymentService.verifyPayment(txHash, selectedCurrency);

    if (verification.status === "pending") {
      return res.json({ success: false, status: "pending", message: "Transaction still pending" });
    }
    if (!verification.verified) {
      return res.json({ success: false, status: "failed", message: "Payment verification failed" });
    }

    await dbService.updateRecruiterPlan(recruiterId, plan);
    res.json({ success: true, plan });
  } catch (error: any) {
    console.error("[Recruiter] Billing verify error:", error.message);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

export default router;
