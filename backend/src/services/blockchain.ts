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

// PoWRegistry Contract ABI (simplified)
const POW_REGISTRY_ABI = [
  "function anchorSnapshot(bytes32 artifactHash, uint256[] memory skillScores, address githubIdentity) external",
  "function getSnapshot(address user) external view returns (tuple(bytes32 artifactHash, uint256[] skillScores, address githubIdentity, uint256 timestamp, bool exists))",
  "function verifySnapshot(bytes32 hash) external view returns (bool)",
  "function getSkillScores(address user) external view returns (uint256[] memory)",
  "event SnapshotAnchored(address indexed user, bytes32 indexed artifactHash, uint256 timestamp)",
] as const;

// Contract address from deployment
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x8fb4fF2123E9a11fC027c494551794fc75e76980";

// Base Sepolia RPC URL
const RPC_URL = process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

export interface BlockchainProof {
  transactionHash: string;
  artifactHash: string;
  blockNumber: number;
  stacksBlockHeight: number;
  timestamp: number;
  skillScores: number[];
  explorerUrl: string;
}

export class BlockchainService {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private initialized: boolean = false;

  constructor() {
    // Lazy initialization - don't initialize here since dotenv may not have loaded yet
  }

  /**
   * Lazy initialization - ensures provider, signer, and contract are initialized
   * This is called on first use, after dotenv.config() has run
   */
  private ensureInitialized(): void {
    if (this.initialized) return;

    this.initialized = true;
    this.provider = new ethers.JsonRpcProvider(RPC_URL);

    // Initialize signer if private key is available
    let privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;

    if (privateKey) {
      // Ensure private key has 0x prefix
      if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
      }

      try {
        this.signer = new ethers.Wallet(privateKey, this.provider);
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, POW_REGISTRY_ABI, this.signer);
        console.log(`[Blockchain] Initialized with wallet: ${this.signer.address}`);
      } catch (error: any) {
        console.error(`[Blockchain] Failed to initialize wallet:`, error.message);
        this.signer = null;
        this.contract = null;
      }
    } else {
      console.warn('[Blockchain] BLOCKCHAIN_PRIVATE_KEY not set - blockchain features disabled');
    }
  }

  /**
   * Generate a hash of the artifact set for on-chain anchoring
   * Uses keccak256 to create a deterministic hash
   */
  generateArtifactHash(artifacts: Artifact[]): string {
    // Create a deterministic representation of artifacts
    const artifactData = artifacts.map((artifact) => ({
      id: artifact.id,
      type: artifact.type,
      timestamp: artifact.timestamp,
      repository: artifact.repository,
    }));

    // Sort by ID for consistency
    artifactData.sort((a, b) => a.id.localeCompare(b.id));

    // Create hash using keccak256 (ethers utility) — return 64-char hex without 0x prefix
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
   * Anchor a PoW snapshot to the blockchain
   * @param artifacts Array of artifacts that were analyzed
   * @param profile The generated PoW profile
   * @param userAddress Optional wallet address of the user (can be zero address)
   * @returns Transaction hash and proof details
   */
  async anchorSnapshot(
    artifacts: Artifact[],
    profile: PoWProfile,
    userPrincipal?: string,
    username?: string
  ): Promise<BlockchainProof> {
    console.log("[Blockchain] anchorSnapshot called with", artifacts.length, "artifacts");

    const rawKey = process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY;
    if (!rawKey) {
      throw new Error("Blockchain service not configured. Set BLOCKCHAIN_PRIVATE_KEY in .env");
    }
    const oraclePrivateKey = this.normalizePrivateKey(rawKey);
    const contractAddress =
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS ||
      "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";
    const oracleAddress =
      process.env.STACKS_ORACLE_ADDRESS || "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";
    const network =
      process.env.STACKS_NETWORK === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;

    const artifactHash = this.generateArtifactHash(artifacts);
    const hashBytes = Buffer.from(artifactHash, "hex");
    const skillScores = this.extractSkillScores(profile).slice(0, 10);

    const txOptions = {
      contractAddress,
      contractName: "powr-registry",
      functionName: "anchor-snapshot",
      functionArgs: [
        Cl.principal(userPrincipal || oracleAddress),
        Cl.buffer(hashBytes),
        Cl.list(skillScores.map((s) => Cl.uint(s))),
        Cl.stringAscii((username || "").slice(0, 64)),
      ],
      senderKey: oraclePrivateKey,
      network,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network });

    if ("error" in broadcastResponse) {
      throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
    }

    const txId = broadcastResponse.txid;
    console.log(`[Blockchain] Proof anchored txId=${txId}`);

    // Fetch block height and timestamp from Stacks API
    const apiUrl = process.env.STACKS_API_URL || "https://api.testnet.hiro.so";
    let stacksBlockHeight = 0;
    let timestamp = Math.floor(Date.now() / 1000);
    try {
      const res = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);
      if (res.ok) {
        const data = await res.json() as any;
        stacksBlockHeight = data.block_height ?? 0;
        timestamp = data.burn_block_time ?? timestamp;
      }
    } catch { /* non-fatal */ }

    return {
      transactionHash: txId,
      artifactHash,
      blockNumber: stacksBlockHeight,
      stacksBlockHeight,
      timestamp,
      skillScores,
      explorerUrl: explorerTxUrl(txId),
    };
  }

  /**
   * Get snapshot from blockchain for a user address
   */
  async getSnapshot(userAddress: string): Promise<any> {
    this.ensureInitialized();

    if (!this.contract && this.provider) {
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, POW_REGISTRY_ABI, this.provider);
    }

    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }
      const snapshot = await this.contract.getSnapshot(userAddress);
      return {
        artifactHash: snapshot.artifactHash,
        skillScores: snapshot.skillScores.map((score: bigint) => Number(score)),
        githubIdentity: snapshot.githubIdentity,
        timestamp: Number(snapshot.timestamp),
        exists: snapshot.exists,
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
      const network =
        process.env.STACKS_NETWORK === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;
      const result = await fetchCallReadOnlyFunction({
        contractAddress,
        contractName: "powr-registry",
        functionName: "verify-snapshot",
        functionArgs: [Cl.buffer(Buffer.from(hash, "hex"))],
        network,
        senderAddress: contractAddress,
      });
      return cvToValue(result) === true;
    } catch (error: any) {
      console.error("Error verifying snapshot:", error);
      return false;
    }
  }

  /**
   * Check if Stacks oracle key and contract address are configured
   */
  isConfigured(): boolean {
    return !!(process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY) &&
      !!process.env.POWR_REGISTRY_CONTRACT_ADDRESS;
  }

  /**
   * Check if Stacks oracle key is configured for badge minting / proof anchoring
   */
  isStacksConfigured(): boolean {
    return !!(process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY);
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

  /**
   * Anchor a PoW snapshot to the Stacks powr-registry contract.
   * Uses the oracle key to call anchor-snapshot on behalf of the user.
   *
   * @param artifacts   Artifacts that were analyzed
   * @param profile     Generated PoW profile
   * @param username    GitHub username (stored as github-identity on-chain)
   * @param userPrincipal  Stacks principal of the developer (defaults to oracle address)
   */
  async anchorSnapshotStacks(
    artifacts: Artifact[],
    profile: PoWProfile,
    username: string,
    userPrincipal?: string
  ): Promise<{ txId: string; artifactHash: string; skillScores: number[] }> {
    const rawKey = process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY;
    if (!rawKey) {
      throw new Error("STACKS_ORACLE_PRIVATE_KEY not configured");
    }
    const oraclePrivateKey = this.normalizePrivateKey(rawKey);

    const contractAddress =
      process.env.POWR_REGISTRY_CONTRACT_ADDRESS ||
      "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";
    const oracleAddress =
      process.env.STACKS_ORACLE_ADDRESS ||
      "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";
    const network =
      process.env.STACKS_NETWORK === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;

    // Generate artifact hash (keccak256 hex → 32-byte buffer)
    const artifactHashHex = this.generateArtifactHash(artifacts);
    const hashBytes = Buffer.from(artifactHashHex.slice(2), "hex");

    // Extract skill scores (max 10 per contract)
    const skillScores = this.extractSkillScores(profile).slice(0, 10);

    const txOptions = {
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
      network,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network });

    if ("error" in broadcastResponse) {
      throw new Error(
        `Stacks broadcast failed: ${broadcastResponse.error}${broadcastResponse.reason ? ` — ${broadcastResponse.reason}` : ""}`
      );
    }

    console.log(
      `[Blockchain] Proof anchored for ${username} txId=${broadcastResponse.txid}`
    );
    return { txId: broadcastResponse.txid, artifactHash: artifactHashHex, skillScores };
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
    const rawMintKey = process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY;
    if (!rawMintKey) {
      throw new Error("ORACLE_PRIVATE_KEY not configured");
    }
    const oraclePrivateKey = this.normalizePrivateKey(rawMintKey);

    const contractAddress =
      process.env.POWR_BADGES_CONTRACT_ADDRESS ||
      "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";
    const network =
      process.env.STACKS_NETWORK === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;

    const txOptions = {
      contractAddress,
      contractName: "powr-badges",
      functionName: "mint-badge",
      functionArgs: [
        principalCV(recipient),
        uintCV(BigInt(skillType)),
        uintCV(BigInt(tier)),
      ],
      senderKey: oraclePrivateKey,
      network,
      postConditionMode: PostConditionMode.Allow,
    };

    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction({ transaction, network });

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
}

export const blockchainService = new BlockchainService();

