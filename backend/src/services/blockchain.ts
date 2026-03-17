import { ethers } from "ethers";
import { Artifact } from "./artifactIngestion";
import { PoWProfile } from "./scoringEngine";
import {
  makeContractCall,
  broadcastTransaction,
  principalCV,
  uintCV,
  bufferCV,
  listCV,
  stringAsciiCV,
  PostConditionMode,
} from "@stacks/transactions";
import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";

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
  timestamp: number;
  skillScores: number[];
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

    // Create hash using keccak256 (ethers utility)
    const dataString = JSON.stringify(artifactData);
    const hash = ethers.keccak256(ethers.toUtf8Bytes(dataString));

    return hash;
  }

  /**
   * Extract skill scores from PoW profile
   */
  extractSkillScores(profile: PoWProfile): number[] {
    return profile.skills.map((skill) => Math.round(skill.score));
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
    userAddress?: string
  ): Promise<BlockchainProof> {
    console.log('[Blockchain] anchorSnapshot called with', artifacts.length, 'artifacts');
    this.ensureInitialized();

    if (!this.contract || !this.signer || !this.provider) {
      throw new Error("Blockchain service not configured. Set BLOCKCHAIN_PRIVATE_KEY in .env");
    }

    // Generate artifact hash
    const artifactHash = this.generateArtifactHash(artifacts);
    console.log('[Blockchain] Generated artifact hash:', artifactHash.substring(0, 20) + '...');

    // Extract skill scores
    const skillScores = this.extractSkillScores(profile);
    console.log('[Blockchain] Skill scores:', skillScores);
    const skillScoresBigInt = skillScores.map((score) => BigInt(score));

    // Use zero address if no user address provided
    const githubIdentity = userAddress
      ? ethers.getAddress(userAddress)
      : ethers.ZeroAddress;

    try {
      console.log('[Blockchain] Sending transaction to contract...');
      // Call the contract
      const tx = await this.contract.anchorSnapshot(
        artifactHash,
        skillScoresBigInt,
        githubIdentity
      );
      console.log('[Blockchain] Transaction sent! Hash:', tx.hash);

      // Wait for transaction confirmation
      console.log('[Blockchain] Waiting for confirmation...');
      const receipt = await tx.wait();

      if (!receipt) {
        throw new Error("Transaction receipt not found");
      }

      console.log('[Blockchain] ✅ Transaction confirmed in block:', receipt.blockNumber);

      // Get block to get timestamp
      const block = await this.provider!.getBlock(receipt.blockNumber);

      return {
        transactionHash: receipt.hash,
        artifactHash: artifactHash,
        blockNumber: receipt.blockNumber || 0,
        timestamp: block?.timestamp || Math.floor(Date.now() / 1000),
        skillScores,
      };
    } catch (error: any) {
      console.error("[Blockchain] ❌ Anchoring error:", error.message);
      if (error.code) console.error("[Blockchain] Error code:", error.code);
      throw new Error(`Failed to anchor snapshot: ${error.message}`);
    }
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
   * Verify if a hash has been anchored on-chain
   */
  async verifySnapshot(hash: string): Promise<boolean> {
    this.ensureInitialized();

    if (!this.contract && this.provider) {
      this.contract = new ethers.Contract(CONTRACT_ADDRESS, POW_REGISTRY_ABI, this.provider);
    }

    try {
      if (!this.contract) {
        throw new Error("Contract not initialized");
      }
      return await this.contract.verifySnapshot(hash);
    } catch (error: any) {
      console.error("Error verifying snapshot:", error);
      return false;
    }
  }

  /**
   * Check if EVM blockchain service is configured
   */
  isConfigured(): boolean {
    this.ensureInitialized();
    return !!this.signer && !!this.contract;
  }

  /**
   * Check if Stacks oracle key is configured for badge minting / proof anchoring
   */
  isStacksConfigured(): boolean {
    return !!(process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY);
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
    const oraclePrivateKey = process.env.STACKS_ORACLE_PRIVATE_KEY || process.env.ORACLE_PRIVATE_KEY;
    if (!oraclePrivateKey) {
      throw new Error("STACKS_ORACLE_PRIVATE_KEY not configured");
    }

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
    const oraclePrivateKey = process.env.ORACLE_PRIVATE_KEY;
    if (!oraclePrivateKey) {
      throw new Error("ORACLE_PRIVATE_KEY not configured");
    }

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

