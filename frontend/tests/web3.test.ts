import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @stacks/transactions — no real network calls
// ---------------------------------------------------------------------------
vi.mock("@stacks/transactions", () => ({
  Cl: {
    buffer:     (v: Buffer) => ({ type: "buffer", buffer: v }),
    principal:  (v: string) => ({ type: "principal", value: v }),
    uint:       (v: number) => ({ type: "uint", value: BigInt(v) }),
  },
  ClarityType:        { OptionalSome: 9, OptionalNone: 10 },
  fetchCallReadOnlyFunction: vi.fn(),
  cvToValue:          vi.fn(),
}));

import * as stacksTx from "@stacks/transactions";
import {
  getExplorerTxUrl,
  getExplorerBlockUrl,
  getExplorerContractUrl,
  getNetworkLabel,
  verifyHashOnChain,
  getOnChainSnapshot,
} from "../app/lib/web3";

describe("web3 helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  // -------------------------------------------------------------------------
  // Explorer URL helpers

  describe("getExplorerTxUrl", () => {
    it("returns a Hiro Explorer URL with the txId", () => {
      const url = getExplorerTxUrl("0xdeadbeef");
      expect(url).toContain("explorer.hiro.so");
      expect(url).toContain("0xdeadbeef");
    });

    it("includes chain=testnet for non-mainnet", () => {
      delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
      expect(getExplorerTxUrl("0xabc")).toContain("chain=testnet");
    });

    it("omits chain param on mainnet", () => {
      process.env.NEXT_PUBLIC_STACKS_NETWORK = "mainnet";
      expect(getExplorerTxUrl("0xabc")).not.toContain("chain=");
      delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    });
  });

  describe("getExplorerBlockUrl", () => {
    it("returns a URL with the block height", () => {
      const url = getExplorerBlockUrl(1234);
      expect(url).toContain("explorer.hiro.so");
      expect(url).toContain("1234");
    });
  });

  describe("getNetworkLabel", () => {
    it("returns 'Stacks Mainnet' for mainnet", () => {
      process.env.NEXT_PUBLIC_STACKS_NETWORK = "mainnet";
      expect(getNetworkLabel()).toBe("Stacks Mainnet");
      delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    });

    it("returns 'Stacks Testnet' for testnet", () => {
      process.env.NEXT_PUBLIC_STACKS_NETWORK = "testnet";
      expect(getNetworkLabel()).toBe("Stacks Testnet");
      delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    });

    it("returns 'Stacks Devnet' by default", () => {
      delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
      expect(getNetworkLabel()).toBe("Stacks Devnet");
    });
  });

  describe("getExplorerContractUrl", () => {
    it("returns '#' when no contract address is configured", () => {
      delete process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS;
      expect(getExplorerContractUrl()).toBe("#");
    });
  });

  // -------------------------------------------------------------------------
  // verifyHashOnChain

  describe("verifyHashOnChain", () => {
    it("returns false when no contract address is set", async () => {
      delete process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS;
      expect(await verifyHashOnChain("a".repeat(64))).toBe(false);
    });

    it("returns true when hash is on-chain", async () => {
      process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.fetchCallReadOnlyFunction).mockResolvedValue({ type: "bool-true" } as any);
      vi.mocked(stacksTx.cvToValue).mockReturnValue(true);
      expect(await verifyHashOnChain("a".repeat(64))).toBe(true);
      delete process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS;
    });

    it("strips 0x prefix before converting to buffer", async () => {
      process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.fetchCallReadOnlyFunction).mockResolvedValue({ type: "bool-true" } as any);
      vi.mocked(stacksTx.cvToValue).mockReturnValue(true);
      await expect(verifyHashOnChain("0x" + "f".repeat(64))).resolves.toBe(true);
      delete process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS;
    });

    it("returns false on network error", async () => {
      process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.fetchCallReadOnlyFunction).mockRejectedValue(new Error("timeout"));
      expect(await verifyHashOnChain("a".repeat(64))).toBe(false);
      delete process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS;
    });
  });

  // -------------------------------------------------------------------------
  // getOnChainSnapshot

  describe("getOnChainSnapshot", () => {
    it("returns null when no contract address is set", async () => {
      delete process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS;
      expect(await getOnChainSnapshot("ST1XXX")).toBeNull();
    });

    it("returns null for an optional-none response", async () => {
      process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.fetchCallReadOnlyFunction).mockResolvedValue({
        type: stacksTx.ClarityType.OptionalNone,
      } as any);
      expect(await getOnChainSnapshot("ST1XXX")).toBeNull();
      delete process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS;
    });

    it("returns null on network error", async () => {
      process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS = "ST1XXX";
      vi.mocked(stacksTx.fetchCallReadOnlyFunction).mockRejectedValue(new Error("timeout"));
      expect(await getOnChainSnapshot("ST1XXX")).toBeNull();
      delete process.env.NEXT_PUBLIC_POWR_REGISTRY_CONTRACT_ADDRESS;
    });
  });
});
