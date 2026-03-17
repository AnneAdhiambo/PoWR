import { describe, it, expect, beforeEach } from "vitest";
import { Cl, cvToJSON } from "@stacks/transactions";
import { initSimnet } from "@stacks/clarinet-sdk";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();

const deployer = accounts.get("deployer")!;
const oracle   = accounts.get("wallet_1")!;
const user     = accounts.get("wallet_2")!;
const attacker = accounts.get("wallet_3")!;

const CONTRACT = "powr-registry";

// Helpers
const sampleHash = Cl.bufferFromHex(
  "a".repeat(64) // 32-byte SHA-256 placeholder
);
const sampleSkills = Cl.list([
  Cl.uint(85), Cl.uint(72), Cl.uint(60), Cl.uint(90),
  Cl.uint(0),  Cl.uint(0),  Cl.uint(0),  Cl.uint(0),
  Cl.uint(0),  Cl.uint(0),
]);
const sampleIdentity = Cl.stringAscii("alice-dev");

describe("powr-registry", () => {
  // -----------------------------------------------------------------------
  // Oracle management
  // -----------------------------------------------------------------------

  describe("set-oracle", () => {
    it("owner can rotate the oracle to wallet_1", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("non-owner cannot rotate the oracle", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-oracle", [Cl.principal(oracle)], attacker
      );
      expect(result).toBeErr(Cl.uint(101)); // ERR-NOT-OWNER
    });

    it("get-oracle returns the updated oracle after rotation", () => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-oracle", [], deployer);
      expect(result).toBePrincipal(oracle);
    });
  });

  // -----------------------------------------------------------------------
  // Anchor snapshot (oracle-gated)
  // -----------------------------------------------------------------------

  describe("anchor-snapshot", () => {
    beforeEach(() => {
      // Rotate oracle to wallet_1 before each test
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
    });

    it("oracle can anchor a snapshot", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "anchor-snapshot", [
        Cl.principal(user),
        sampleHash,
        sampleSkills,
        sampleIdentity,
      ], oracle);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("non-oracle cannot anchor a snapshot", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "anchor-snapshot", [
        Cl.principal(user),
        sampleHash,
        sampleSkills,
        sampleIdentity,
      ], attacker);
      expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-ORACLE
    });

    it("rejects empty github-identity", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "anchor-snapshot", [
        Cl.principal(user),
        sampleHash,
        sampleSkills,
        Cl.stringAscii(""),
      ], oracle);
      expect(result).toBeErr(Cl.uint(103)); // ERR-INVALID-INPUT
    });

    it("second anchor for same user overwrites the previous snapshot", () => {
      const hash2 = Cl.bufferFromHex("b".repeat(64));
      simnet.callPublicFn(CONTRACT, "anchor-snapshot", [
        Cl.principal(user), sampleHash, sampleSkills, sampleIdentity,
      ], oracle);
      simnet.callPublicFn(CONTRACT, "anchor-snapshot", [
        Cl.principal(user), hash2, sampleSkills, Cl.stringAscii("alice-v2"),
      ], oracle);

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-snapshot", [Cl.principal(user)], deployer
      );
      const json = cvToJSON(result);
      expect(json.value.value["github-identity"].value).toBe("alice-v2");
    });
  });

  // -----------------------------------------------------------------------
  // Read-only queries
  // -----------------------------------------------------------------------

  describe("get-snapshot", () => {
    beforeEach(() => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      simnet.callPublicFn(CONTRACT, "anchor-snapshot", [
        Cl.principal(user), sampleHash, sampleSkills, sampleIdentity,
      ], oracle);
    });

    it("returns the stored snapshot for a known user", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-snapshot", [Cl.principal(user)], deployer
      );
      const json = cvToJSON(result);
      expect(json.value).not.toBeNull();
      expect(json.value.value["github-identity"].value).toBe("alice-dev");
    });

    it("returns none for an unknown user", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-snapshot", [Cl.principal(attacker)], deployer
      );
      expect(result).toBeNone();
    });
  });

  describe("verify-snapshot", () => {
    beforeEach(() => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      simnet.callPublicFn(CONTRACT, "anchor-snapshot", [
        Cl.principal(user), sampleHash, sampleSkills, sampleIdentity,
      ], oracle);
    });

    it("returns true for an anchored hash", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "verify-snapshot", [sampleHash], deployer
      );
      expect(result).toBeBool(true);
    });

    it("returns false for an unanchored hash", () => {
      const unknownHash = Cl.bufferFromHex("c".repeat(64));
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "verify-snapshot", [unknownHash], deployer
      );
      expect(result).toBeBool(false);
    });
  });

  describe("get-skill-scores", () => {
    beforeEach(() => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      simnet.callPublicFn(CONTRACT, "anchor-snapshot", [
        Cl.principal(user), sampleHash, sampleSkills, sampleIdentity,
      ], oracle);
    });

    it("returns the skill scores list for a known user", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-skill-scores", [Cl.principal(user)], deployer
      );
      const json = cvToJSON(result);
      expect(json.value).not.toBeNull();
      // First score should be 85
      expect(json.value.value[0].value).toBe("85");
    });

    it("returns none for an unknown user", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-skill-scores", [Cl.principal(attacker)], deployer
      );
      expect(result).toBeNone();
    });
  });
});
