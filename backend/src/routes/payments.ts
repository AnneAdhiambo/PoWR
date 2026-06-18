import express from "express";
import { paymentService } from "../services/paymentService";
import { PlanType } from "../services/subscriptionService";

const router = express.Router();

// Create payment intent
router.post("/create", async (req, res) => {
  try {
    const { planType, billingPeriod } = req.body;
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    if (!planType || !["basic", "pro"].includes(planType)) {
      return res.status(400).json({ error: "Invalid plan type" });
    }

    const paymentIntent = await paymentService.createPaymentIntent(
      username as string,
      planType as PlanType,
      typeof billingPeriod === "number" ? billingPeriod : 1
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
    const { txHash, planType } = req.body;
    const { username } = req.query;

    if (!username || !txHash || !planType) {
      return res.status(400).json({ error: "Username, txHash (paymentHash), and planType required" });
    }

    const result = await paymentService.processPayment(
      username as string,
      txHash,
      planType as PlanType
    );

    if (result.success) {
      res.json({ success: true, message: "Payment verified and subscription activated" });
    } else {
      res.json({ success: false, status: result.status ?? "failed", message: result.message });
    }
  } catch (error: any) {
    console.error("Payment verification error:", error);
    res.status(500).json({ error: error.message || "Failed to verify payment" });
  }
});

// Get payment status
router.get("/status/:txHash", async (req, res) => {
  try {
    const { txHash } = req.params;
    const statusResult = await paymentService.verifyPayment(txHash);
    res.json(statusResult);
  } catch (error: any) {
    console.error("Payment status error:", error);
    res.status(500).json({ error: "Failed to get payment status" });
  }
});

// Mock pay an invoice for testing in development sandbox
router.post("/lightning/pay-mock", async (req, res) => {
  try {
    const { paymentHash } = req.body;
    if (!paymentHash) {
      return res.status(400).json({ error: "paymentHash is required" });
    }
    const result = await paymentService.payInvoiceMock(paymentHash);
    if (result.success) {
      res.json({ success: true, message: "Invoice marked as paid and service activated" });
    } else {
      res.status(400).json({ error: result.message || "Mock payment failed" });
    }
  } catch (error: any) {
    console.error("Mock pay error:", error);
    res.status(500).json({ error: error.message || "Mock payment failed" });
  }
});

export default router;
