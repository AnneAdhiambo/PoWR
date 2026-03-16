import express from "express";
import { subscriptionService, PlanType } from "../services/subscriptionService";
import { dbService } from "../services/database";

const router = express.Router();

// Get available plans
router.get("/plans", async (req, res) => {
  try {
    const plans = await subscriptionService.getAvailablePlans();
    // Normalize to the shape the frontend Plan type expects
    const normalized = plans.map((p) => ({
      type: p.type,
      name: p.name,
      price: p.price,
      priceInCrypto: { stx: p.priceInStx },
      updateFrequency: p.updateFrequency,
      features: p.features,
    }));
    res.json({ plans: normalized });
  } catch (error: any) {
    console.error("Get plans error:", error);
    res.status(500).json({ error: "Failed to get plans" });
  }
});

// Get user's current subscription
router.get("/current", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const subscription = await subscriptionService.getUserPlan(username as string);
    const plan = subscription
      ? subscriptionService.getPlan(subscription.planType as PlanType)
      : subscriptionService.getPlan("free");

    res.json({
      subscription: subscription || {
        username: username as string,
        planType: "free",
        status: "active",
      },
      plan,
    });
  } catch (error: any) {
    console.error("Get subscription error:", error);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

// Upgrade subscription
router.post("/upgrade", async (req, res) => {
  try {
    const { planType, paymentTxHash } = req.body;
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    if (!planType || !["free", "basic", "pro"].includes(planType)) {
      return res.status(400).json({ error: "Invalid plan type" });
    }

    if (planType === "free") {
      await subscriptionService.cancelPlan(username as string);
      await dbService.createSubscription(username as string, "free");
      return res.json({ success: true, message: "Downgraded to free plan" });
    }

    if (!paymentTxHash) {
      return res.status(400).json({ error: "Payment transaction hash required" });
    }

    await subscriptionService.upgradePlan(
      username as string,
      planType as PlanType,
      paymentTxHash
    );

    res.json({ success: true, message: "Subscription upgraded successfully" });
  } catch (error: any) {
    console.error("Upgrade subscription error:", error);
    res.status(500).json({ error: error.message || "Failed to upgrade subscription" });
  }
});

// Cancel subscription
router.post("/cancel", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    await subscriptionService.cancelPlan(username as string);
    res.json({ success: true, message: "Subscription cancelled" });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

// Get next scheduled update date
router.get("/next-update", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const subscription = await subscriptionService.getUserPlan(username as string);
    if (!subscription) {
      return res.json({ nextUpdateDate: null });
    }

    res.json({
      nextUpdateDate: subscription.nextUpdateDate,
      planType: subscription.planType,
    });
  } catch (error: any) {
    console.error("Get next update error:", error);
    res.status(500).json({ error: "Failed to get next update date" });
  }
});

export default router;

