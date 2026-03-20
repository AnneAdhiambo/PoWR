import { getPublicKey, nip04, SimplePool, finalizeEvent } from "nostr-tools";

export const RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
];

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function sha256Identifier(identifier: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode("powr:nostr:v1:" + identifier);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(buf);
}

/**
 * Derive the Nostr public key for any identifier deterministically.
 * Does NOT require localStorage — purely from the identifier string.
 * This allows any party to compute another user's pubkey from their username.
 */
export async function getPubkeyForIdentifier(identifier: string): Promise<string> {
  const sk = await sha256Identifier(identifier);
  return getPublicKey(sk);
}

export async function getOrCreateKeypair(
  identifier: string
): Promise<{ sk: Uint8Array; pk: string }> {
  if (typeof window === "undefined") throw new Error("Client-side only");
  const storageKey = `nostr_sk_${identifier}`;
  const storedHex = localStorage.getItem(storageKey);
  let sk: Uint8Array;
  if (storedHex && storedHex.length === 64) {
    sk = hexToBytes(storedHex);
  } else {
    sk = await sha256Identifier(identifier);
    localStorage.setItem(storageKey, bytesToHex(sk));
  }
  const pk = getPublicKey(sk);
  return { sk, pk };
}

export async function sendDM(
  sk: Uint8Array,
  recipientPk: string,
  content: string,
  pool: SimplePool
): Promise<void> {
  const encrypted = await nip04.encrypt(sk, recipientPk, content);
  const event = finalizeEvent(
    {
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", recipientPk]],
      content: encrypted,
    },
    sk
  );
  await Promise.any(pool.publish(RELAYS, event));
}

export function subscribeDMs(
  pool: SimplePool,
  myPk: string,
  since: number,
  onMsg: (event: any) => void
): () => void {
  // Subscribe to incoming DMs (where I'm tagged) and outgoing DMs (sent by me)
  const incomingFilter = { kinds: [4], "#p": [myPk], since };
  const outgoingFilter = { kinds: [4], authors: [myPk], since };
  const sub1 = pool.subscribe(RELAYS, incomingFilter, { onevent: onMsg });
  const sub2 = pool.subscribe(RELAYS, outgoingFilter, { onevent: onMsg });
  return () => {
    sub1.close();
    sub2.close();
  };
}

export async function decryptDM(
  sk: Uint8Array,
  counterpartPk: string,
  content: string
): Promise<string> {
  return nip04.decrypt(sk, counterpartPk, content);
}
