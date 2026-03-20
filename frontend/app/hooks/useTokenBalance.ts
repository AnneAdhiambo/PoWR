import { useState, useEffect } from "react";

const STACKS_API =
  process.env.NEXT_PUBLIC_STACKS_NODE_URL ?? "https://api.testnet.hiro.so";

/**
 * Fetches the SIP-010 token balance for a given Stacks address.
 * Uses the Hiro /extended/v1/address/{address}/balances endpoint.
 * Returns balance in base units (e.g. micro-USDCx with 6 decimals).
 */
export function useTokenBalance(
  address: string | null,
  contractId: string // e.g. "ST1PQ....usdcx"
): { balance: number | null; loading: boolean } {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address || !contractId) return;

    setLoading(true);
    const apiBase = STACKS_API.replace(/\/$/, "");
    fetch(`${apiBase}/extended/v1/address/${address}/balances`, {
      headers: process.env.NEXT_PUBLIC_HIRO_API_KEY
        ? { "x-api-key": process.env.NEXT_PUBLIC_HIRO_API_KEY }
        : {},
    })
      .then((r) => r.json())
      .then((data) => {
        // Token key format: "{contract_address}.{contract_name}::{asset_name}"
        // e.g. "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx::usdcx"
        const tokens = data?.fungible_tokens ?? {};
        const assetName = contractId.split(".")[1]; // "usdcx" from "ST1...usdcx"
        const key = `${contractId}::${assetName}`;
        const raw = tokens[key]?.balance;
        setBalance(raw !== undefined ? Number(raw) : 0);
      })
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  }, [address, contractId]);

  return { balance, loading };
}
