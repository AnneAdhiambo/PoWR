import { describe, it, expect, beforeEach } from "vitest";
import { Cl, cvToJSON } from "@stacks/transactions";
import { initSimnet } from "@stacks/clarinet-sdk";

const simnet = await initSimnet();
const accounts = simnet.getAccounts();

const deployer = accounts.get("deployer")!;
const oracle   = accounts.get("wallet_1")!;
const dev1     = accounts.get("wallet_2")!;
const dev2     = accounts.get("wallet_3")!;
const attacker = accounts.get("wallet_4")!;

const CONTRACT = "powr-badges";

// Skill types
const BACKEND      = Cl.uint(0);
const FRONTEND     = Cl.uint(1);
const DEVOPS       = Cl.uint(2);
const ARCHITECTURE = Cl.uint(3);

// Tiers
const BRONZE = Cl.uint(1);
const SILVER = Cl.uint(2);
const GOLD   = Cl.uint(3);

describe("powr-badges", () => {
  // -----------------------------------------------------------------------
  // Oracle management
  // -----------------------------------------------------------------------

  describe("set-oracle", () => {
    it("owner can set oracle to wallet_1", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("non-owner cannot set oracle", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-oracle", [Cl.principal(oracle)], attacker
      );
      expect(result).toBeErr(Cl.uint(101)); // ERR-NOT-OWNER
    });

    it("get-oracle reflects the new oracle after rotation", () => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-oracle", [], deployer);
      expect(result).toBePrincipal(oracle);
    });
  });

  // -----------------------------------------------------------------------
  // Minting
  // -----------------------------------------------------------------------

  describe("mint-badge", () => {
    beforeEach(() => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
    });

    it("oracle mints a bronze backend badge; token-id is 1", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "mint-badge", [
        Cl.principal(dev1), BACKEND, BRONZE,
      ], oracle);
      expect(result).toBeOk(Cl.uint(1));
    });

    it("get-last-token-id increments after each mint", () => {
      simnet.callPublicFn(CONTRACT, "mint-badge", [Cl.principal(dev1), BACKEND, BRONZE], oracle);
      simnet.callPublicFn(CONTRACT, "mint-badge", [Cl.principal(dev1), FRONTEND, SILVER], oracle);
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-last-token-id", [], deployer);
      expect(result).toBeOk(Cl.uint(2));
    });

    it("non-oracle cannot mint a badge", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "mint-badge", [
        Cl.principal(dev1), BACKEND, BRONZE,
      ], attacker);
      expect(result).toBeErr(Cl.uint(100)); // ERR-NOT-ORACLE
    });

    it("rejects invalid skill-type (>= 4)", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "mint-badge", [
        Cl.principal(dev1), Cl.uint(99), BRONZE,
      ], oracle);
      expect(result).toBeErr(Cl.uint(105)); // ERR-INVALID-SKILL
    });

    it("rejects invalid tier 0", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "mint-badge", [
        Cl.principal(dev1), BACKEND, Cl.uint(0),
      ], oracle);
      expect(result).toBeErr(Cl.uint(104)); // ERR-INVALID-TIER
    });

    it("rejects invalid tier > 3", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "mint-badge", [
        Cl.principal(dev1), BACKEND, Cl.uint(4),
      ], oracle);
      expect(result).toBeErr(Cl.uint(104)); // ERR-INVALID-TIER
    });

    it("duplicate mint returns the existing token-id without minting a new one", () => {
      simnet.callPublicFn(CONTRACT, "mint-badge", [Cl.principal(dev1), BACKEND, BRONZE], oracle);

      // Second identical mint
      const { result } = simnet.callPublicFn(CONTRACT, "mint-badge", [
        Cl.principal(dev1), BACKEND, BRONZE,
      ], oracle);
      expect(result).toBeOk(Cl.uint(1)); // returns existing token-id

      // Token counter must still be 1
      const { result: lastId } = simnet.callReadOnlyFn(CONTRACT, "get-last-token-id", [], deployer);
      expect(lastId).toBeOk(Cl.uint(1));
    });

    it("different skill or tier = distinct badge and new token-id", () => {
      simnet.callPublicFn(CONTRACT, "mint-badge", [Cl.principal(dev1), BACKEND, BRONZE], oracle);
      const { result } = simnet.callPublicFn(CONTRACT, "mint-badge", [
        Cl.principal(dev1), BACKEND, SILVER, // same skill, higher tier
      ], oracle);
      expect(result).toBeOk(Cl.uint(2));
    });
  });

  // -----------------------------------------------------------------------
  // Soulbound enforcement
  // -----------------------------------------------------------------------

  describe("transfer (soulbound)", () => {
    beforeEach(() => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      simnet.callPublicFn(CONTRACT, "mint-badge", [Cl.principal(dev1), BACKEND, BRONZE], oracle);
    });

    it("transfer always fails with ERR-SOULBOUND regardless of caller", () => {
      // Attempt by the badge owner
      const { result: r1 } = simnet.callPublicFn(CONTRACT, "transfer", [
        Cl.uint(1), Cl.principal(dev1), Cl.principal(dev2),
      ], dev1);
      expect(r1).toBeErr(Cl.uint(103)); // ERR-SOULBOUND

      // Attempt by a third party
      const { result: r2 } = simnet.callPublicFn(CONTRACT, "transfer", [
        Cl.uint(1), Cl.principal(dev1), Cl.principal(dev2),
      ], attacker);
      expect(r2).toBeErr(Cl.uint(103));
    });

    it("ownership does not change after failed transfer", () => {
      simnet.callPublicFn(CONTRACT, "transfer", [
        Cl.uint(1), Cl.principal(dev1), Cl.principal(dev2),
      ], dev1);
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-owner", [Cl.uint(1)], deployer);
      expect(result).toBeOk(Cl.some(Cl.principal(dev1)));
    });
  });

  // -----------------------------------------------------------------------
  // Read-only helpers
  // -----------------------------------------------------------------------

  describe("has-badge", () => {
    beforeEach(() => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      simnet.callPublicFn(CONTRACT, "mint-badge", [Cl.principal(dev1), BACKEND, SILVER], oracle);
    });

    it("returns true when developer holds the badge", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT, "has-badge", [
        Cl.principal(dev1), BACKEND, SILVER,
      ], deployer);
      expect(result).toBeBool(true);
    });

    it("returns false for a badge the developer does not hold", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT, "has-badge", [
        Cl.principal(dev1), BACKEND, GOLD,
      ], deployer);
      expect(result).toBeBool(false);
    });

    it("returns false for a different developer", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT, "has-badge", [
        Cl.principal(dev2), BACKEND, SILVER,
      ], deployer);
      expect(result).toBeBool(false);
    });
  });

  describe("get-token-uri", () => {
    beforeEach(() => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      simnet.callPublicFn(CONTRACT, "mint-badge", [Cl.principal(dev1), DEVOPS, GOLD], oracle);
    });

    it("returns some URI for an existing token", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-token-uri", [Cl.uint(1)], deployer
      );
      expect(result).toBeOk(Cl.some(Cl.stringAscii("https://api.powr.dev/badges/metadata/")));
    });

    it("returns none for a non-existent token", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-token-uri", [Cl.uint(999)], deployer
      );
      expect(result).toBeOk(Cl.none());
    });
  });

  describe("get-badge-data", () => {
    beforeEach(() => {
      simnet.callPublicFn(CONTRACT, "set-oracle", [Cl.principal(oracle)], deployer);
      simnet.callPublicFn(CONTRACT, "mint-badge", [
        Cl.principal(dev1), ARCHITECTURE, GOLD,
      ], oracle);
    });

    it("returns badge metadata for an existing token", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-badge-data", [Cl.uint(1)], deployer
      );
      const json = cvToJSON(result);
      expect(json.value.value["skill-type"].value).toBe("3"); // ARCHITECTURE
      expect(json.value.value["tier"].value).toBe("3");       // GOLD
    });

    it("returns none for a non-existent token", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-badge-data", [Cl.uint(999)], deployer
      );
      expect(result).toBeNone();
    });
  });
});
