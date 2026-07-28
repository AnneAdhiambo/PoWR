import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReferralReliabilityService } from "../src/services/referralReliabilityService";
import { ReferralService, referralsEnabled } from "../src/services/referralService";
import { QueryExecutor } from "../src/types/referrals";

function databaseWithRows(rowsByCall: any[][]): QueryExecutor & { query: ReturnType<typeof vi.fn> } {
  const query = vi.fn();
  rowsByCall.forEach((rows) => query.mockResolvedValueOnce({ rows, rowCount: rows.length }));
  return { query };
}

describe("referral reputation feature", () => {
  beforeEach(() => {
    delete process.env.REFERRAL_REPUTATION_ENABLED;
  });

  it("is disabled unless explicitly enabled", () => {
    expect(referralsEnabled()).toBe(false);
    process.env.REFERRAL_REPUTATION_ENABLED = "true";
    expect(referralsEnabled()).toBe(true);
    process.env.REFERRAL_REPUTATION_ENABLED = "TRUE";
    expect(referralsEnabled()).toBe(false);
  });

  it("prevents self-referrals before touching the database", async () => {
    const database = databaseWithRows([]);
    const service = new ReferralService(database);
    await expect(service.create({ jobId: 4, referrerUsername: "anne", candidateUsername: "anne" }))
      .rejects.toThrow("Self-referrals are not allowed");
    expect(database.query).not.toHaveBeenCalled();
  });

  it("does not create negative reputation for rejection, closure, or withdrawal", () => {
    const reliability = new ReferralReliabilityService(databaseWithRows([]));
    expect(reliability.pointsForOutcome("rejected")).toBeNull();
    expect(reliability.pointsForOutcome("job_closed")).toBeNull();
    expect(reliability.pointsForOutcome("candidate_withdrew")).toBeNull();
    expect(reliability.pointsForOutcome("performance_concern")).toBe(-1);
  });

  it("keeps reliability private until minimum evidence exists", async () => {
    const privateDatabase = databaseWithRows([[{ evidence_count: "2", total_points: "2.5" }]]);
    const hidden = await new ReferralReliabilityService(privateDatabase).getSummary("anne");
    expect(hidden.visible).toBe(false);
    expect(hidden.score).toBeNull();

    const publicDatabase = databaseWithRows([[{ evidence_count: "3", total_points: "2.5" }]]);
    const visible = await new ReferralReliabilityService(publicDatabase).getSummary("anne");
    expect(visible.visible).toBe(true);
    expect(visible.score).toBe(63);
  });

  it("bounds monthly positive ledger impact", async () => {
    const database = databaseWithRows([
      [{ total: "7.75" }],
      [{ id: "entry", points: "0.25" }],
    ]);
    const result = await new ReferralReliabilityService(database)
      .appendOutcomeEntry("referral", "outcome", "anne", "strong_performance");
    expect(result).toEqual({ id: "entry", points: "0.25" });
    expect(database.query.mock.calls[1][1][3]).toBe(0.25);
  });

  it("only returns accepted referrals belonging to the active organization", async () => {
    const database = databaseWithRows([
      [[{
        id: "referral-1",
        referrer_username: "anne",
        candidate_username: "dev",
        status: "accepted",
      }]],
      [{ evidence_count: "0", total_points: "0" }],
    ]);
    database.query.mockReset()
      .mockResolvedValueOnce({ rows: [{
        id: "referral-1",
        referrer_username: "anne",
        candidate_username: "dev",
        status: "accepted",
      }] })
      .mockResolvedValueOnce({ rows: [{ evidence_count: "0", total_points: "0" }] });
    await new ReferralService(database).listForOrganization(42);
    const [sql, values] = database.query.mock.calls[0];
    expect(sql).toContain("r.organization_id = $1 AND r.status = 'accepted'");
    expect(values).toEqual([42]);
  });

  it("consent decisions only update pending, unexpired invitations", async () => {
    const database = databaseWithRows([[{ id: "referral-1", status: "accepted" }]]);
    await new ReferralService(database).decideConsent("token", "accept");
    const [sql] = database.query.mock.calls[0];
    expect(sql).toContain("status = 'pending_consent'");
    expect(sql).toContain("consent_expires_at > NOW()");
  });
});
