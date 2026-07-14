import { ethers } from "ethers";
import { Artifact } from "./artifactIngestion";
import { PoWProfile } from "./scoringEngine";
import {
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  cvToValue,
  principalCV,
  uintCV,
  bufferCV,
  listCV,
  stringAsciiCV,
  PostConditionMode,
  Cl,
} from "@stacks/transactions";
import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";

// ── Explorer URL helpers ────────────────────────────────────────────────────
const EXPLORER_BASE = "https://explorer.hiro.so";
const CHAIN_SUFFIX = process.env.STACKS_NETWORK === "mainnet" ? "" : "?chain=testnet";

export function explorerTxUrl(txId: string): string {
  return `${EXPLORER_BASE}/txid/${txId}${CHAIN_SUFFIX}`;
}

export function explorerBlockUrl(height: number): string {
  return `${EXPLORER_BASE}/block/${height}${CHAIN_SUFFIX}`;
}

export interface OnChainSnapshot {
  artifactHash: string;
  skillScores: number[];
  githubIdentity: string;
  anchoredAt: number;
}

export class BlockchainService {
  /**
   * Generate a hash of the artifact set for on-chain anchoring.
   * Uses keccak256 (via ethers' hashing utility) for a deterministic hash.
   */
  generateArtifactHash(artifacts: Artifact[]): string {
    const artifactData = artifacts.map((artifact) => ({
      id: artifact.id,
      type: artifact.type,
      timestamp: artifact.timestamp,
      repository: artifact.repository,
    }));

    // Sort by ID for consistency
    artifactData.sort((a, b) => a.id.localeCompare(b.id));

    const dataString = JSON.stringify(artifactData);
    const hash = ethers.keccak256(ethers.toUtf8Bytes(dataString));
    return hash.replace(/^0x/, "");
  }

  /**
   * Extract skill scores from PoW profile
   */
  extractSkillScores(profile: PoWProfile): number[] {
    return profile.skills.map((skill) => Math.min(100, Math.max(0, Math.round(skill.score))));
  }

  /**
   * Normalize a Stacks private key to a format accepted by @stacks/transactions.
   * Accepts 32-byte (64 hex chars) or 33-byte compressed (66 hex chars ending in 01).
   * If 66 chars but last byte != 01, strips the last byte.
   */
  private normalizePrivateKey(key: string): string {
    // Strip whitespace, 0x prefix, and any non-hex characters (e.g. embedded newlines)
    const clean = key.trim().replace(/^0x/i, "").toLowerCase().replace(/[^0-9a-f]/g, "");
    // Valid 33-byte compressed format (66 hex chars ending in 01) — pass through
    if (clean.length === 66 && clean.endsWith("01")) return clean;
    // Everything else: take the first 32 bytes (64 hex chars)
    return clean.slice(0, 64);
  }

  private network() {
    return process.env.STACKS_NETWORK === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;
  }

  /**
   * Whether the Stacks oracle key and registry contract are configured.
   */
  isConfigured(): boolean {
    return !!(
      process.env.STACKS_ORACLE_PRIVATE_KEY &&
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS &&
      process.env.STACKS_ORACLE_ADDRESS
    );
  }

  /**
   * Anchor a PoW snapshot to the Stacks powr-registry contract.
   * Uses the oracle key to call anchor-snapshot on behalf of the user.
   * Falls back to a mocked txId when no oracle key is configured, so profile
   * generation / demos keep working without live blockchain credentials.
   *
   * @param artifacts      Artifacts that were analyzed
   * @param profile        Generated PoW profile
   * @param username       GitHub username (stored as github-identity on-chain)
   * @param userPrincipal  Stacks principal of the developer (defaults to oracle address)
   */
  async anchorSnapshot(
    artifacts: Artifact[],
    profile: PoWProfile,
    username: string,
    userPrincipal?: string
  ): Promise<{ txId: string; artifactHash: string; skillScores: number[] }> {
    const artifactHash = this.generateArtifactHash(artifacts);
    const skillScores = this.extractSkillScores(profile).slice(0, 10);

    const rawKey = process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY;
    if (!rawKey) {
      console.log(`[Blockchain] Mocking snapshot anchor for ${username}`);
      const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      return { txId: `0x${randomHex}`, artifactHash, skillScores };
    }
    const oraclePrivateKey = this.normalizePrivateKey(rawKey);

    const contractAddress =
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS ||
      "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";
    const oracleAddress =
      process.env.STACKS_ORACLE_ADDRESS ||
      "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";

    const hashBytes = Buffer.from(artifactHash, "hex");

    const transaction = await makeContractCall({
      contractAddress,
      contractName: "powr-registry",
      functionName: "anchor-snapshot",
      functionArgs: [
        principalCV(userPrincipal || oracleAddress),
        bufferCV(hashBytes),
        listCV(skillScores.map((s) => uintCV(BigInt(s)))),
        stringAsciiCV(username.slice(0, 64)),
      ],
      senderKey: oraclePrivateKey,
      network: this.network(),
      postConditionMode: PostConditionMode.Allow,
    });

    const broadcastResponse = await broadcastTransaction({ transaction, network: this.network() });
    if ("error" in broadcastResponse) {
      throw new Error(
        `Stacks broadcast failed: ${broadcastResponse.error}${broadcastResponse.reason ? ` — ${broadcastResponse.reason}` : ""}`
      );
    }

    console.log(`[Blockchain] Proof anchored for ${username} txId=${broadcastResponse.txid}`);
    return { txId: broadcastResponse.txid, artifactHash, skillScores };
  }

  /**
   * Mint a soulbound skill badge on Stacks via the powr-badges contract.
   * Idempotent: contract returns existing tokenId if badge already exists.
   * @param recipient  Developer's Stacks principal
   * @param skillType  0=Backend 1=Frontend 2=DevOps 3=Architecture (contract validates < 4)
   * @param tier       1=Bronze 2=Silver 3=Gold
   * @returns txId and null tokenId (tokenId resolved asynchronously from chain)
   */
  async mintBadge(
    recipient: string,
    skillType: number,
    tier: number
  ): Promise<{ txId: string; tokenId: number | null }> {
    const rawKey = process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY;
    if (!rawKey) {
      console.log(`[Blockchain] Mocking badge mint for ${recipient} (skill: ${skillType}, tier: ${tier})`);
      const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      return {
        txId: `0x${randomHex}`,
        tokenId: Math.floor(Math.random() * 1000)
      };
    }
    const oraclePrivateKey = this.normalizePrivateKey(rawKey);

    const contractAddress =
      process.env.POWR_BADGES_CONTRACT_ADDRESS ||
      "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";

    const transaction = await makeContractCall({
      contractAddress,
      contractName: "powr-badges",
      functionName: "mint-badge",
      functionArgs: [
        principalCV(recipient),
        uintCV(BigInt(skillType)),
        uintCV(BigInt(tier)),
      ],
      senderKey: oraclePrivateKey,
      network: this.network(),
      postConditionMode: PostConditionMode.Allow,
    });

    const broadcastResponse = await broadcastTransaction({ transaction, network: this.network() });
    if ("error" in broadcastResponse) {
      throw new Error(
        `Stacks broadcast failed: ${broadcastResponse.error}${broadcastResponse.reason ? ` — ${broadcastResponse.reason}` : ""}`
      );
    }

    console.log(
      `[Blockchain] Badge minted for ${recipient} skill=${skillType} tier=${tier} txId=${broadcastResponse.txid}`
    );
    return { txId: broadcastResponse.txid, tokenId: null };
  }

  /**
   * Fetch the latest anchored snapshot for a Stacks principal via a read-only call.
   */
  async getSnapshot(userPrincipal: string): Promise<OnChainSnapshot | null> {
    const contractAddress = process.env.POWR_REGISTRY_CONTRACT_ADDRESS;
    if (!contractAddress) return null;

    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress,
        contractName: "powr-registry",
        functionName: "get-snapshot",
        functionArgs: [Cl.principal(userPrincipal)],
        network: this.network(),
        senderAddress: contractAddress,
      });

      // cvToValue resolves nested tuple/list entries via cvToJSON, so each
      // field comes back wrapped as { type, value } rather than a bare value.
      const decoded = cvToValue(result);
      if (!decoded) return null; // (optional none) — no snapshot for this user yet

      const fields = decoded.value;
      return {
        artifactHash: (fields["artifact-hash"].value as string).replace(/^0x/, ""),
        skillScores: fields["skill-scores"].value.map((s: any) => Number(s.value)),
        githubIdentity: fields["github-identity"].value,
        anchoredAt: Number(fields["anchored-at"].value),
      };
    } catch (error: any) {
      console.error("Error fetching snapshot:", error);
      return null;
    }
  }

  /**
   * Verify if a hash has been anchored on Stacks powr-registry
   */
  async verifySnapshot(hash: string): Promise<boolean> {
    const contractAddress = process.env.POWR_REGISTRY_CONTRACT_ADDRESS;
    if (!contractAddress) return false;
    try {
      const result = await fetchCallReadOnlyFunction({
        contractAddress,
        contractName: "powr-registry",
        functionName: "verify-snapshot",
        functionArgs: [Cl.buffer(Buffer.from(hash, "hex"))],
        network: this.network(),
        senderAddress: contractAddress,
      });
      return cvToValue(result) === true;
    } catch (error: any) {
      console.error("Error verifying snapshot:", error);
      return false;
    }
  }
}

export const blockchainService = new BlockchainService();
