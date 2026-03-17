"use client";

// Direct wallet provider calls — no @stacks/connect, no Stencil.js.
// Leather injects window.LeatherProvider, Xverse injects window.XverseProviders.
// Both implement the same stx_* request API so we treat them uniformly.

export interface StacksProvider {
  request(method: string, params?: Record<string, unknown>): Promise<any>;
}

export function getProvider(): StacksProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return (
    w.LeatherProvider ??
    w.XverseProviders?.StacksProvider ??
    w.StacksProvider ??
    null
  );
}

/** Returns the user's Stacks (STX) address, or null if not connected.
 *  Filters strictly for addresses starting with "S" (c32-encoded Stacks addresses)
 *  to avoid accidentally returning a Bitcoin address from the wallet. */
export async function getConnectedAddress(): Promise<string | null> {
  const provider = getProvider();
  if (!provider) return null;
  try {
    const res = await provider.request("getAddresses");
    const addresses: any[] =
      res?.result?.addresses ?? res?.addresses ?? [];
    const stx = addresses.find(
      (a) => a.symbol === "STX" && a.address?.startsWith("S")
    );
    return stx?.address ?? null;
  } catch {
    return null;
  }
}

/** Opens the wallet to request address access (connect). */
export async function connectWallet(): Promise<string | null> {
  const provider = getProvider();
  if (!provider) {
    throw new Error(
      "No Stacks wallet found. Please install Leather or Xverse."
    );
  }
  const res = await provider.request("getAddresses");
  const addresses: any[] = res?.result?.addresses ?? res?.addresses ?? [];
  const stx = addresses.find(
    (a) => a.symbol === "STX" && a.address?.startsWith("S")
  );
  return stx?.address ?? null;
}

/** Sends a SIP-010 fungible token transfer and returns the txid.
 *  Tries the wallet's dedicated stx_transferSip010Ft method first (Leather / Xverse),
 *  then falls back to stx_callContract with Clarity-encoded args. */
export async function transferSip10Token(
  contractId: string,
  assetName: string,
  recipient: string,
  amountBaseUnits: string
): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No Stacks wallet found. Please install Leather or Xverse.");
  }
  const senderAddress = await getConnectedAddress();
  if (!senderAddress || !senderAddress.startsWith("S")) {
    throw new Error("Could not get a Stacks address from your wallet. Please connect with Leather or Xverse and ensure a Stacks account is active.");
  }
  if (!recipient.startsWith("S")) {
    throw new Error(`Invalid payment address: ${recipient}. Expected a Stacks address starting with "S".`);
  }

  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";

  // Try wallet's high-level SIP-010 transfer method (Leather ≥ 6, Xverse)
  try {
    const res = await provider.request("stx_transferSip010Ft", {
      asset: `${contractId}::${assetName}`,
      amount: amountBaseUnits,
      recipient,
      network,
    });
    const txid = res?.result?.txid ?? res?.txid ?? res?.result?.txId ?? res?.txId;
    if (txid) return txid;
  } catch (e: any) {
    // Method not supported — fall through to stx_callContract
    if (!e?.message?.toLowerCase().includes("method") && !e?.code) throw e;
  }

  // Fallback: encode Clarity args manually and use stx_callContract
  const { standardPrincipalCV, uintCV, noneCV, serializeCV } = await import(
    "@stacks/transactions"
  );
  const toHex = (cv: any): string =>
    Buffer.from(serializeCV(cv)).toString("hex");

  const functionArgs = [
    toHex(uintCV(BigInt(amountBaseUnits))),
    toHex(standardPrincipalCV(senderAddress)),
    toHex(standardPrincipalCV(recipient)),
    toHex(noneCV()),
  ];

  const [contractAddress, contractName] = contractId.split(".");
  const res = await provider.request("stx_callContract", {
    contractAddress,
    contractName,
    functionName: "transfer",
    functionArgs,
    network,
  });

  const txid = res?.result?.txid ?? res?.txid ?? res?.result?.txId ?? res?.txId;
  if (!txid) throw new Error("Wallet did not return a transaction ID.");
  return txid;
}

/** Sends an STX transfer and returns the txid. */
export async function transferStx(
  recipient: string,
  amountMicroStx: string,
  memo: string
): Promise<string> {
  const provider = getProvider();
  if (!provider) {
    throw new Error(
      "No Stacks wallet found. Please install Leather or Xverse."
    );
  }
  const res = await provider.request("stx_transferStx", {
    recipient,
    amount: amountMicroStx,
    memo,
  });
  const txid = res?.result?.txid ?? res?.txid ?? res?.result?.txId ?? res?.txId;
  if (!txid) throw new Error("Wallet did not return a transaction ID.");
  return txid;
}
