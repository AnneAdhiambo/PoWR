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
    const privateDatabase = databaseWithRows([[{ evidence_count: "2", total_points: "2.5", has_open_review: false }]]);
    const hidden = await new ReferralReliabilityService(privateDatabase).getSummary("anne");
    expect(hidden.visible).toBe(false);
    expect(hidden.score).toBeNull();

    const publicDatabase = databaseWithRows([[{ evidence_count: "3", total_points: "2.5", has_open_review: false }]]);
    const visible = await new ReferralReliabilityService(publicDatabase).getSummary("anne");
    expect(visible.visible).toBe(true);
    expect(visible.score).toBe(63);
  });

  it("counts independent referrals, applies decay, and suppresses open reviews", async () => {
    const database = databaseWithRows([[{
      evidence_count: "4",
      total_points: "3.2",
      has_open_review: true,
    }]]);
    const summary = await new ReferralReliabilityService(database).getSummary("anne");
    expect(summary).toMatchObject({ evidenceCount: 4, visible: false, suppressed: true, score: null });
    expect(database.query.mock.calls[0][0]).toContain("COUNT(DISTINCT l.referral_id)");
    expect(database.query.mock.calls[0][0]).toContain("POWER(");
    expect(database.query.mock.calls[0][0]).toContain("referral_anomaly_flags");
    expect(database.query.mock.calls[0][0]).toContain("referral_appeals");
  });

  it("bounds absolute monthly ledger impact under an advisory lock", async () => {
    const database = databaseWithRows([
      [],
      [{ total: "7.75" }],
      [{ id: "entry", points: "0.25" }],
    ]);
    const result = await new ReferralReliabilityService(database)
      .appendOutcomeEntry("referral", "outcome", "anne", "strong_performance");
    expect(result).toEqual({ id: "entry", points: "0.25" });
    expect(database.query.mock.calls[0][0]).toContain("pg_advisory_xact_lock");
    expect(database.query.mock.calls[1][0]).toContain("SUM(ABS(points))");
    expect(database.query.mock.calls[2][1][3]).toBe(0.25);
  });

  it("only returns accepted referrals belonging to the active organization", async () => {
    const database = databaseWithRows([
      [[{
        id: "referral-1",
        referrer_username: "anne",
        candidate_username: "dev",
        status: "accepted",
      }]],
      [{ evidence_count: "0", total_points: "0", has_open_review: false }],
    ]);
    database.query.mockReset()
      .mockResolvedValueOnce({ rows: [{
        id: "referral-1",
        referrer_username: "anne",
        candidate_username: "dev",
        status: "accepted",
      }] })
      .mockResolvedValueOnce({ rows: [{ evidence_count: "0", total_points: "0", has_open_review: false }] });
    await new ReferralService(database).listForOrganization(42);
    const [sql, values] = database.query.mock.calls[0];
    expect(sql).toContain("r.organization_id = $1 AND r.status = 'accepted'");
    expect(values).toEqual([42]);
  });

  it("consent decisions only update pending, unexpired invitations", async () => {
    const database = databaseWithRows([[{ id: "referral-1", status: "accepted" }]]);
    await new ReferralService(database).decideConsent("token", "candidate", "accept");
    const [sql, values] = database.query.mock.calls[0];
    expect(sql).toContain("status = 'pending_consent'");
    expect(sql).toContain("consent_expires_at > NOW()");
    expect(sql).toContain("candidate_username = $3");
    expect(values[0]).not.toBe("token");
    expect(values[2]).toBe("candidate");
  });

  it("stores only a consent token hash and returns the plaintext token once", async () => {
    const database = databaseWithRows([
      [{
        id: "referral-1",
        referrer_username: "anne",
        candidate_username: "candidate",
      }],
      [],
      [],
    ]);
    const referral = await new ReferralService(database).create({
      jobId: 4,
      referrerUsername: "anne",
      candidateUsername: "candidate",
    });
    const [sql, values] = database.query.mock.calls[0];
    expect(sql).toContain("consent_token_hash");
    expect(sql).not.toContain("consent_token)");
    expect(values[5]).toMatch(/^[a-f0-9]{64}$/);
    expect(referral.consentToken).toBeTruthy();
    expect(referral.consentToken).not.toBe(values[5]);
  });

  it("allows either referral party to withdraw an active referral", async () => {
    const database = databaseWithRows([[{ id: "referral-1", status: "withdrawn" }]]);
    const result = await new ReferralService(database).withdraw("candidate", "referral-1");
    expect(result).toEqual({ id: "referral-1", status: "withdrawn" });
    const [sql, values] = database.query.mock.calls[0];
    expect(sql).toContain("referrer_username = $2 OR candidate_username = $2");
    expect(sql).toContain("status IN ('pending_consent', 'accepted')");
    expect(values).toEqual(["referral-1", "candidate"]);
  });

  it("requires evidence and review before an adverse outcome affects reliability", async () => {
    const database = databaseWithRows([[{
      id: "outcome-1",
      referral_id: "referral-1",
      outcome_type: "performance_concern",
      review_status: "pending_review",
      referrer_username: "anne",
    }]]);
    const service = new ReferralService(database);
    await expect(service.recordOutcome(8, 2, "referral-1", "performance_concern", "", "too short"))
      .rejects.toThrow("at least 20 characters");
    expect(database.query).not.toHaveBeenCalled();

    const result = await service.recordOutcome(
      8,
      2,
      "referral-1",
      "performance_concern",
      "private",
      "Confirmed mismatch against documented role requirements.",
    );
    expect(result?.ledgerEntry).toBeNull();
    expect(database.query).toHaveBeenCalledTimes(1);
    expect(database.query.mock.calls[0][1][6]).toBe("pending_review");
  });

  it("requires a second authorized recruiter to approve adverse impact", async () => {
    const database = databaseWithRows([
      [{
        id: "outcome-1",
        referral_id: "referral-1",
        outcome_type: "performance_concern",
        referrer_username: "anne",
      }],
      [],
      [{ total: "0" }],
      [{ id: "ledger-1", points: "-1" }],
    ]);
    const result = await new ReferralService(database).reviewAdverseOutcome(8, 3, "outcome-1", true);
    expect(result?.ledgerEntry).toEqual({ id: "ledger-1", points: "-1" });
    expect(database.query.mock.calls[0][0]).toContain("recorded_by_recruiter_id <> $2");
    expect(database.query.mock.calls[1][0]).toContain("pg_advisory_xact_lock");
  });

  it("uses a unique offset conflict target for idempotent reversals", async () => {
    const database = databaseWithRows([
      [{ points: "-1" }],
      [{ id: "offset-1", points: "1" }],
    ]);
    const result = await new ReferralReliabilityService(database)
      .appendOffset("entry-1", "referral-1", "anne", "Appeal upheld");
    expect(result).toEqual({ id: "offset-1", points: "1" });
    expect(database.query.mock.calls[1][0]).toContain("ON CONFLICT (offsets_entry_id)");
  });
});
