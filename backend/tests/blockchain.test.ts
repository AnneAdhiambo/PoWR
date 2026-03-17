import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BlockchainService, explorerTxUrl, explorerBlockUrl } from "../src/services/blockchain";

// ---------------------------------------------------------------------------
// Mock @stacks/transactions so tests never hit the network
// ---------------------------------------------------------------------------
vi.mock("@stacks/transactions", () => ({
  makeContractCall: vi.fn(),
  broadcastTransaction: vi.fn(),
  fetchCallReadOnlyFunction: vi.fn(),
  AnchorMode: { Any: 3 },
  PostConditionMode: { Deny: 1 },
  ClarityType: { OptionalSome: 9, OptionalNone: 10, BoolTrue: 3 },
  Cl: {
    principal: (v: string) => ({ type: "principal", value: v }),
    buffer: (v: Buffer) => ({ type: "buffer", buffer: v }),
    uint: (v: number) => ({ type: "uint", value: BigInt(v) }),
    list: (v: any[]) => ({ type: "list", list: v }),
    stringAscii: (v: string) => ({ type: "string-ascii", data: v }),
  },
  cvToValue: vi.fn((cv: any) => {
    if (cv?.type === "bool-true") return true;
    if (cv?.type === "bool-false") return false;
    return cv;
  }),
}));

// Import mocked functions at module level (required — no await import inside describe)
import * as stacksTx from "@stacks/transactions";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const FAKE_ARTIFACTS = [
  { id: "repo-abc",    type: "repo" as const,   timestamp: "2024-01-01T00:00:00Z", repository: { owner: "alice", name: "abc" }, data: {} as any },
  { id: "commit-xyz", type: "commit" as const, timestamp: "2024-01-02T00:00:00Z", repository: { owner: "alice", name: "abc" }, data: {} as any },
];

const FAKE_PROFILE = {
  skills: [
    { skill: "backend",      score: 85, percentile: 90, confidence: 0.9, artifactCount: 10 },
    { skill: "frontend",     score: 72, percentile: 75, confidence: 0.8, artifactCount: 7  },
    { skill: "devops",       score: 60, percentile: 60, confidence: 0.7, artifactCount: 5  },
    { skill: "architecture", score: 90, percentile: 95, confidence: 0.9, artifactCount: 3  },
  ],
  overallIndex: 77,
  artifactSummary: { repos: 5, commits: 120, pullRequests: 30, mergedPRs: 25 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("BlockchainService", () => {
  let service: BlockchainService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BlockchainService();
  });

  afterEach(() => {
    delete process.env.STACKS_ORACLE_PRIVATE_KEY;
    delete process.env.POWR_REGISTRY_CONTRACT_ADDRESS;
    delete process.env.STACKS_NETWORK;
  });

  // -------------------------------------------------------------------------
  // generateArtifactHash

  describe("generateArtifactHash", () => {
    it("returns a 64-char hex string (32-byte SHA-256)", () => {
      const hash = service.generateArtifactHash(FAKE_ARTIFACTS);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("is deterministic — same input, different order = same hash", () => {
      const h1 = service.generateArtifactHash(FAKE_ARTIFACTS);
      const h2 = service.generateArtifactHash([...FAKE_ARTIFACTS].reverse());
      expect(h1).toBe(h2);
    });

    it("different artifacts produce different hashes", () => {
      const h1 = service.generateArtifactHash(FAKE_ARTIFACTS);
      const h2 = service.generateArtifactHash([{ ...FAKE_ARTIFACTS[0], id: "repo-different" }]);
      expect(h1).not.toBe(h2);
    });

    it("handles an empty artifact list without throwing", () => {
      expect(service.generateArtifactHash([])).toHaveLength(64);
    });
  });

  // -------------------------------------------------------------------------
  // extractSkillScores

  describe("extractSkillScores", () => {
    it("extracts rounded scores in order", () => {
      expect(service.extractSkillScores(FAKE_PROFILE)).toEqual([85, 72, 60, 90]);
    });

    it("clamps scores to 0-100", () => {
      const profile = {
        ...FAKE_PROFILE,
        skills: [
          { skill: "s1", score: 110, percentile: 99, confidence: 1, artifactCount: 1 },
          { skill: "s2", score: -5,  percentile: 0,  confidence: 0, artifactCount: 0 },
        ],
      };
      expect(service.extractSkillScores(profile)).toEqual([100, 0]);
    });

    it("rounds fractional scores", () => {
      const profile = { ...FAKE_PROFILE, skills: [{ skill: "s1", score: 72.7, percentile: 75, confidence: 0.9, artifactCount: 5 }] };
      expect(service.extractSkillScores(profile)).toEqual([73]);
    });
  });

  // -------------------------------------------------------------------------
  // isConfigured

  describe("isConfigured", () => {
    it("returns false when env vars are missing", () => {
      expect(service.isConfigured()).toBe(false);
    });

    it("returns true when both key and contract address are set", () => {
      process.env.STACKS_ORACLE_PRIVATE_KEY = "aa".repeat(32);
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
      expect(new BlockchainService().isConfigured()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // anchorSnapshot

  describe("anchorSnapshot", () => {
    it("throws when not configured", async () => {
      await expect(
        service.anchorSnapshot(FAKE_ARTIFACTS, FAKE_PROFILE, "ST1XXX", "alice")
      ).rejects.toThrow(/not configured/i);
    });

    it("broadcasts and returns a proof on success", async () => {
      process.env.STACKS_ORACLE_PRIVATE_KEY = "bb".repeat(32);
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";

      const fakeTxId = "0xdeadbeef" + "0".repeat(58);
      vi.mocked(stacksTx.makeContractCall).mockResolvedValue({} as any);
      vi.mocked(stacksTx.broadcastTransaction).mockResolvedValue({ txid: fakeTxId } as any);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tx_status: "success", block_height: 42, burn_block_time: 1700000000 }),
      });

      const proof = await new BlockchainService().anchorSnapshot(FAKE_ARTIFACTS, FAKE_PROFILE, "ST1XXX", "alice");

      expect(proof.transactionHash).toBe(fakeTxId);
      expect(proof.stacksBlockHeight).toBe(42);
      expect(proof.skillScores).toEqual([85, 72, 60, 90]);
      expect(proof.explorerUrl).toContain(fakeTxId);
    });

    it("throws when broadcast returns an error response", async () => {
      process.env.STACKS_ORACLE_PRIVATE_KEY = "bb".repeat(32);
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.makeContractCall).mockResolvedValue({} as any);
      vi.mocked(stacksTx.broadcastTransaction).mockResolvedValue({ error: "ContractNotFound", reason: "no such contract" } as any);

      await expect(new BlockchainService().anchorSnapshot(FAKE_ARTIFACTS, FAKE_PROFILE, "ST1XXX", "alice"))
        .rejects.toThrow(/Broadcast failed/i);
    });
  });

  // -------------------------------------------------------------------------
  // verifySnapshot

  describe("verifySnapshot", () => {
    it("returns false when contract address is not configured", async () => {
      expect(await service.verifySnapshot("a".repeat(64))).toBe(false);
    });

    it("returns true for a verified hash", async () => {
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.fetchCallReadOnlyFunction).mockResolvedValue({ type: "bool-true" } as any);
      vi.mocked(stacksTx.cvToValue).mockReturnValue(true);
      expect(await new BlockchainService().verifySnapshot("a".repeat(64))).toBe(true);
    });

    it("returns false when hash is not on-chain", async () => {
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.fetchCallReadOnlyFunction).mockResolvedValue({ type: "bool-false" } as any);
      vi.mocked(stacksTx.cvToValue).mockReturnValue(false);
      expect(await new BlockchainService().verifySnapshot("b".repeat(64))).toBe(false);
    });

    it("returns false on network error", async () => {
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.fetchCallReadOnlyFunction).mockRejectedValue(new Error("timeout"));
      expect(await new BlockchainService().verifySnapshot("c".repeat(64))).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // Explorer URL helpers

  describe("explorerTxUrl", () => {
    it("returns a Hiro Explorer URL containing the txId", () => {
      const url = explorerTxUrl("0xabc123");
      expect(url).toContain("explorer.hiro.so");
      expect(url).toContain("0xabc123");
    });
  });

  describe("explorerBlockUrl", () => {
    it("returns a Hiro Explorer URL containing the block height", () => {
      const url = explorerBlockUrl(500);
      expect(url).toContain("explorer.hiro.so");
      expect(url).toContain("500");
    });
  });
});
