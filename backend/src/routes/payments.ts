import express from "express";
import { paymentService, Currency } from "../services/paymentService";
import { subscriptionService, PlanType } from "../services/subscriptionService";

const router = express.Router();

// Create payment intent
router.post("/create", async (req, res) => {
  try {
    const { planType, billingPeriod, currency } = req.body;
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    if (!planType || !["basic", "pro"].includes(planType)) {
      return res.status(400).json({ error: "Invalid plan type" });
    }

    const validCurrencies: Currency[] = ["stx", "sbtc", "usdcx"];
    const selectedCurrency: Currency = validCurrencies.includes(currency) ? currency : "stx";

    const paymentIntent = await paymentService.createPaymentIntent(
      planType as PlanType,
      typeof billingPeriod === "number" ? billingPeriod : 1,
      selectedCurrency
    );

    res.json({ paymentIntent });
  } catch (error: any) {
    console.error("Payment creation error:", error);
    res.status(500).json({ error: error.message || "Failed to create payment intent" });
  }
});

// Verify payment transaction
router.post("/verify", async (req, res) => {
  try {
    const { txHash, planType, currency } = req.body;
    const { username } = req.query;

    if (!username || !txHash || !planType) {
      return res.status(400).json({ error: "Username, txHash, and planType required" });
    }

    const validCurrencies: Currency[] = ["stx", "sbtc", "usdcx"];
    const selectedCurrency: Currency = validCurrencies.includes(currency) ? currency : "stx";

    const result = await paymentService.processPayment(
      username as string,
      txHash,
      planType as PlanType,
      selectedCurrency
    );

    if (result.success) {
      res.json({ success: true, message: "Payment verified and subscription activated" });
    } else {
      // Return 200 so the frontend can read the status without throwing.
      // 400 is reserved for malformed requests (missing params), not business-logic failures.
      res.json({ success: false, status: result.status ?? "failed", message: result.message });
    }
  } catch (error: any) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: error.message || "Failed to verify payment" });
  }
});

// Stripe checkout session
router.post("/stripe/checkout", async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({ error: "Stripe not configured" });
    }

    const { planType } = req.body;
    const { username } = req.query;

    if (!username || !planType) {
      return res.status(400).json({ error: "Username and planType required" });
    }

    // Stripe integration: install `stripe` package and configure STRIPE_SECRET_KEY
    // const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    // const prices = { basic: "price_xxx", pro: "price_yyy" };
    // const session = await stripe.checkout.sessions.create({ ... });
    // return res.json({ url: session.url });

    res.status(503).json({ error: "Stripe not configured" });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    res.status(500).json({ error: error.message || "Failed to create checkout session" });
  }
});

// Get payment status
router.get("/status/:txHash", async (req, res) => {
  try {
    const { txHash } = req.params;
    const status = paymentService.getPaymentStatus(txHash);
    res.json(status);
  } catch (error: any) {
    console.error("Payment status error:", error);
    res.status(500).json({ error: "Failed to get payment status" });
  }
});

export default router;


