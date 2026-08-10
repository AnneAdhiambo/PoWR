import crypto from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { webhookService } from "../src/services/webhookService";

describe("GitHub webhook signatures", () => {
  afterEach(() => {
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("verifies the exact raw payload", () => {
    process.env.GITHUB_WEBHOOK_SECRET = "local-test-secret";
    const payload = Buffer.from('{"action":"push","commits":[]}');
    const signature = `sha256=${crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET).update(payload).digest("hex")}`;

    expect(webhookService.verifyWebhookSignature(payload, signature)).toBe(true);
    expect(webhookService.verifyWebhookSignature(Buffer.from('{"action":"push"}'), signature)).toBe(false);
  });

  it("rejects signatures when the secret is missing", () => {
    expect(webhookService.verifyWebhookSignature(Buffer.from("{}"), "sha256=invalid")).toBe(false);
  });
});
