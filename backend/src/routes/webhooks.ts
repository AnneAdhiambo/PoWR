import express from "express";
import { webhookService } from "../services/webhookService";

const router = express.Router();

// GitHub webhook endpoint
router.post("/github", async (req, res) => {
  try {
    const signature = req.headers["x-hub-signature-256"] as string;
    const eventType = req.headers["x-github-event"] as string;

    if (!signature) {
      return res.status(401).json({ error: "Missing signature" });
    }

    // Verify webhook signature
    const payload = (req as any).rawBody as Buffer | undefined;
    if (!payload) {
      return res.status(400).json({ error: "Raw webhook payload unavailable" });
    }
    const isValid = webhookService.verifyWebhookSignature(payload, signature);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    // Process webhook event asynchronously
    webhookService
      .processWebhookEvent(req.body, eventType)
      .catch((error) => {
        console.error("Webhook processing error:", error);
      });

    // Respond immediately to GitHub
    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;


