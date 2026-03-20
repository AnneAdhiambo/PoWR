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

/** Returns Leather provider if installed, else null */
export function getLeatherProvider(): StacksProvider | null {
  return typeof window !== "undefined" ? (window as any).LeatherProvider ?? null : null;
}

/** Returns Xverse Stacks provider if installed, else null */
export function getXverseProvider(): StacksProvider | null {
  return typeof window !== "undefined"
    ? (window as any).XverseProviders?.StacksProvider ?? null
    : null;
}

async function connectProviderInternal(provider: StacksProvider): Promise<string | null> {
  const res = await provider.request("getAddresses");
  const addresses: any[] = res?.result?.addresses ?? res?.addresses ?? [];
  const stx = addresses.find((a) => a.symbol === "STX" && a.address?.startsWith("S"));
  return stx?.address ?? null;
}

export async function connectLeather(): Promise<string | null> {
  const p = getLeatherProvider();
  if (!p) throw new Error("Leather wallet not found. Please install it.");
  return connectProviderInternal(p);
}

export async function connectXverse(): Promise<string | null> {
  const p = getXverseProvider();
  if (!p) throw new Error("Xverse wallet not found. Please install it.");
  return connectProviderInternal(p);
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
 *  Uses stx_transferSip10Ft (Leather-native) first, falls back to stx_callContract (Xverse).
 *  Post-conditions are included on both paths to protect the user:
 *  the wallet enforces that exactly `amountBaseUnits` of the FT leaves the sender — nothing more. */
export async function transferSip10Token(
  contractId: string,
  assetName: string,
  recipient: string,
  amountBaseUnits: string
): Promise<string> {
  if (!recipient.startsWith("S")) {
    throw new Error(`Invalid payment address. Expected a Stacks address starting with "S".`);
  }

  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const { request } = await import("@stacks/connect");

  // Primary: stx_transferSip10Ft (Leather/Xverse handle post-conditions automatically)
  try {
    const res = await request("stx_transferSip10Ft", {
      asset: contractId,
      amount: Number(amountBaseUnits),
      recipient,
      network,
    } as any);
    const r = res as any;
    const txid = r?.result?.txid ?? r?.txid ?? r?.result?.txId ?? r?.txId;
    if (txid) return txid;
  } catch (e: any) {
    const msg = e?.message ?? "";
    if (
      msg.toLowerCase().includes("cancel") ||
      msg.toLowerCase().includes("reject") ||
      e?.code === 4001
    ) {
      throw new Error("Transaction cancelled.");
    }
    // method not supported — fall through to stx_callContract
  }

  // Fallback: stx_callContract with explicit post-condition.
  // Pc.principal(sender).willSendEq(amount).ft(contract, assetName) ensures the wallet
  // enforces that exactly this amount of the FT leaves the sender — protecting the user
  // from any contract that might attempt to transfer more.
  const senderAddress = await getConnectedAddress();
  if (!senderAddress) throw new Error("Connect your wallet first.");

  const { Cl, Pc } = await import("@stacks/transactions");

  const postCondition = Pc.principal(senderAddress)
    .willSendEq(BigInt(amountBaseUnits))
    .ft(contractId as `${string}.${string}`, assetName);

  const res2 = await request("stx_callContract", {
    contract: contractId,
    functionName: "transfer",
    functionArgs: [
      Cl.uint(BigInt(amountBaseUnits)),
      Cl.principal(senderAddress),
      Cl.principal(recipient),
      Cl.none(),
    ],
    postConditions: [postCondition],
    network,
  } as any);

  const r2 = res2 as any;
  const txid = r2?.result?.txid ?? r2?.txid ?? r2?.result?.txId ?? r2?.txId;
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
