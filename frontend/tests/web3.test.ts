import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  POW_REGISTRY_CONTRACT,
  getExplorerBlockUrl,
  getExplorerContractUrl,
  getExplorerTxUrl,
  getNetworkLabel,
  getOnChainSnapshot,
  verifyHashOnChain,
} from "../app/lib/web3";

describe("web3 helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_STACKS_NETWORK;
    delete process.env.NEXT_PUBLIC_STACKS_API_URL;
    vi.unstubAllGlobals();
  });

  describe("getExplorerTxUrl", () => {
    it("returns a Hiro Explorer URL with the txId", () => {
      const url = getExplorerTxUrl("0xdeadbeef");
      expect(url).toContain("explorer.hiro.so");
      expect(url).toContain("0xdeadbeef");
    });

    it("includes chain=testnet for non-mainnet", () => {
      expect(getExplorerTxUrl("0xabc")).toContain("chain=testnet");
    });

    it("omits the chain parameter on mainnet", () => {
      process.env.NEXT_PUBLIC_STACKS_NETWORK = "mainnet";
      expect(getExplorerTxUrl("0xabc")).not.toContain("chain=");
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
    it("returns Stacks Mainnet for mainnet", () => {
      process.env.NEXT_PUBLIC_STACKS_NETWORK = "mainnet";
      expect(getNetworkLabel()).toBe("Stacks Mainnet");
    });

    it("returns Stacks Testnet for testnet", () => {
      process.env.NEXT_PUBLIC_STACKS_NETWORK = "testnet";
      expect(getNetworkLabel()).toBe("Stacks Testnet");
    });

    it("returns Stacks Devnet by default", () => {
      expect(getNetworkLabel()).toBe("Stacks Devnet");
    });
  });

  describe("getExplorerContractUrl", () => {
    it("returns the deployed registry contract URL", () => {
      expect(getExplorerContractUrl()).toContain(POW_REGISTRY_CONTRACT);
    });
  });

  describe("verifyHashOnChain", () => {
    it("returns false for an invalid hash", async () => {
      expect(await verifyHashOnChain("invalid")).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it("returns true when Hiro confirms the hash", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ okay: true, result: "0x03" }),
      } as Response);

      expect(await verifyHashOnChain("a".repeat(64))).toBe(true);
    });

    it("strips the 0x prefix before encoding the hash buffer", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ okay: true, result: "0x03" }),
      } as Response);

      await expect(verifyHashOnChain(`0x${"f".repeat(64)}`)).resolves.toBe(true);
      const [, options] = vi.mocked(fetch).mock.calls[0];
      expect(JSON.parse(String(options?.body)).arguments[0]).toBe(
        `0x0200000020${"f".repeat(64)}`
      );
    });

    it("returns false on a network error", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("timeout"));
      expect(await verifyHashOnChain("a".repeat(64))).toBe(false);
    });
  });

  describe("getOnChainSnapshot", () => {
    it("returns null when the snapshot is absent", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ okay: false }),
      } as Response);

      expect(await getOnChainSnapshot("ST1XXX")).toBeNull();
    });

    it("returns null on a network error", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("timeout"));
      expect(await getOnChainSnapshot("ST1XXX")).toBeNull();
    });
  });
});
