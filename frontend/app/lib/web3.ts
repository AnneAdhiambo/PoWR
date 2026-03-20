// PoWR on-chain verification — Stacks / powr-registry contract
// Network: testnet (Hiro API)

const STACKS_NETWORK = process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet";
const HIRO_API_URL =
  process.env.NEXT_PUBLIC_STACKS_API_URL ||
  (STACKS_NETWORK === "mainnet"
    ? "https://api.hiro.so"
    : "https://api.testnet.hiro.so");

// Stacks contract — deployed by oracle address
export const POW_REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_POWR_REGISTRY_ADDRESS ||
  "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";

export const POW_REGISTRY_CONTRACT = `${POW_REGISTRY_ADDRESS}.powr-registry`;

// ─── Explorer URL helpers ─────────────────────────────────────────────────────

export function getNetworkLabel(): string {
  const net = process.env.NEXT_PUBLIC_STACKS_NETWORK;
  if (net === "mainnet") return "Stacks Mainnet";
  if (net === "testnet") return "Stacks Testnet";
  return "Stacks Devnet";
}

export function getExplorerTxUrl(txId: string): string {
  const id = txId.startsWith("0x") ? txId : `0x${txId}`;
  return `https://explorer.hiro.so/txid/${id}?chain=${STACKS_NETWORK}`;
}

export function getExplorerContractUrl(): string {
  return `https://explorer.hiro.so/contract/${POW_REGISTRY_CONTRACT}?chain=${STACKS_NETWORK}`;
}

export function getExplorerBlockUrl(blockHeight: number): string {
  return `https://explorer.hiro.so/block/${blockHeight}?chain=${STACKS_NETWORK}`;
}

// ─── On-chain verification ────────────────────────────────────────────────────

/**
 * Verify that an artifact hash has been anchored in the Stacks powr-registry
 * contract by calling the read-only `verify-snapshot` function via Hiro API.
 *
 * Clarity bufferCV encoding for (buff 32):
 *   0x02 (type byte) + 00000020 (big-endian uint32 length = 32) + 32 raw bytes
 */
export async function verifyHashOnChain(hash: string): Promise<boolean> {
  try {
    const hashHex = hash.startsWith("0x") ? hash.slice(2) : hash;
    if (hashHex.length !== 64) return false;

    // Clarity bufferCV: type byte 0x02 + big-endian uint32 length (32 = 0x00000020) + bytes
    const buffArg = `0x0200000020${hashHex}`;

    const res = await fetch(
      `${HIRO_API_URL}/v2/contracts/call-read/${POW_REGISTRY_ADDRESS}/powr-registry/verify-snapshot`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: POW_REGISTRY_ADDRESS,
          arguments: [buffArg],
        }),
      }
    );

    if (!res.ok) return false;
    const data = await res.json();
    // BoolCV true = "0x03", false = "0x04"
    return data.okay === true && data.result === "0x03";
  } catch (error) {
    console.error("Error verifying hash on-chain:", error);
    return false;
  }
}

/**
 * Fetch the full on-chain snapshot for a Stacks principal.
 */
export async function getOnChainSnapshot(principal: string): Promise<{
  artifactHash: string;
  skillScores: number[];
  githubIdentity: string;
  anchoredAt: number;
} | null> {
  try {
    // Encode principal as Clarity StandardPrincipalCV: 0x05 + length byte + ascii bytes
    const encoded = Buffer.from(principal, "ascii");
    const principalArg =
      "0x05" +
      encoded.length.toString(16).padStart(2, "0") +
      Buffer.from(principal).toString("hex");

    const res = await fetch(
      `${HIRO_API_URL}/v2/contracts/call-read/${POW_REGISTRY_ADDRESS}/powr-registry/get-snapshot`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: POW_REGISTRY_ADDRESS,
          arguments: [principalArg],
        }),
      }
    );

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.okay) return null;
    // Raw result parsing is complex; return null for now — verification is the key path
    return null;
  } catch (error) {
    console.error("Error fetching on-chain snapshot:", error);
    return null;
  }
}
