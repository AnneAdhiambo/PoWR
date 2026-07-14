# Blockchain Integration - Complete Implementation

## ✅ What's Been Implemented

### 1. Clarity Smart Contracts (`contracts/`)
- **`powr-registry.clar`**: stores developer work proofs (artifact hash + skill
  scores + GitHub identity) per Stacks principal. Oracle-gated writes, free
  public reads (`get-snapshot`, `verify-snapshot`, `get-skill-scores`).
- **`powr-badges.clar`**: soulbound SIP-009 NFT badges minted per
  (skill-type, tier) once a developer crosses a threshold. `transfer` always
  fails — badges cannot be moved, only earned.
- 33 unit tests across both contracts (Clarinet simnet, via `@stacks/clarinet-sdk` + vitest).

### 2. Blockchain Service (`backend/src/services/blockchain.ts`)
- **Artifact Hash Generation**: keccak256 hash of the artifact set
- **Skill Score Extraction**: extracts scores from the PoW profile
- **`anchorSnapshot()`**: calls `anchor-snapshot` on `powr-registry` via the oracle key
- **`mintBadge()`**: calls `mint-badge` on `powr-badges` via the oracle key
- **`getSnapshot()` / `verifySnapshot()`**: free read-only calls, no gas
- Falls back to a mocked txId when no oracle key is configured, so profile
  generation and demos work without live blockchain credentials

### 3. Database Integration (`backend/src/services/database.ts`)
- **Table**: `blockchain_proofs` stores all on-chain proofs
- **Functions**: `saveBlockchainProof()`, `getBlockchainProofs()`, `getLatestBlockchainProof()`

### 4. Automatic Anchoring (`backend/src/routes/user.ts`, `schedulerService.ts`, `webhookService.ts`)
- Anchors automatically after profile generation (manual publish, scheduled updates, and webhook-triggered updates)
- Non-blocking: blockchain failures never fail profile generation
- Badge minting runs alongside anchoring once skill thresholds are crossed (`badgeService.ts`)

### 5. Frontend (`frontend/app/lib/web3.ts`, `frontend/app/components/dashboard/OnChainProofs.tsx`)
- **Proof Cards**: shows all on-chain proofs with details
- **Hiro Explorer Links**: direct links to view transactions
- **`@stacks/connect`**: wallet connection for linking a Stacks principal to a GitHub identity

## 🚀 How to Use

### Step 1: Get Stacks testnet STX

Fund the oracle wallet from the public faucet (no login required):

```bash
curl -X POST "https://api.testnet.hiro.so/extended/v1/faucets/stx?address=<ORACLE_ADDRESS>"
```

### Step 2: Configure Backend

Add to `backend/.env` (see `backend/BLOCKCHAIN_SETUP.md` for the full walkthrough):

```env
STACKS_NETWORK=testnet
STACKS_ORACLE_PRIVATE_KEY=your_oracle_private_key_hex
STACKS_ORACLE_ADDRESS=ST...
POWR_REGISTRY_CONTRACT_ADDRESS=ST3VEJ5TMJK30S4PK5WXP9J1W86FCDH6DY3K3DBG5
POWR_BADGES_CONTRACT_ADDRESS=ST3VEJ5TMJK30S4PK5WXP9J1W86FCDH6DY3K3DBG5
```

**Important**:
- Use a dedicated oracle wallet — never commit its private key to git
- This wallet pays gas for every anchor/mint call

### Step 3: Test It

1. Start backend: `cd backend && npm run dev`
2. Login to the app with GitHub
3. Generate/refresh your profile
4. Check the "On-Chain Proofs" section in the dashboard
5. Click through to the Hiro Explorer to see your transaction

## 📊 What Gets Anchored

When a profile is generated, the following is anchored on-chain via `anchor-snapshot`:

1. **Artifact Hash** (`buff 32`) — keccak256 of all analyzed artifacts (repos, commits, PRs)
2. **Skill Scores** (`list 10 uint`) — one score per skill category (0-100)
3. **GitHub Identity** (`string-ascii 64`) — GitHub username
4. **Anchored-at** (`uint`) — Stacks block height, set automatically by the contract

## 🔍 Viewing Proofs

- **In the Dashboard**: "On-Chain Proofs" section, with a link per snapshot
- **On the Hiro Explorer**: https://explorer.hiro.so/txid/\<txid\>?chain=testnet, or
  browse the contract directly at
  https://explorer.hiro.so/txid/ST3VEJ5TMJK30S4PK5WXP9J1W86FCDH6DY3K3DBG5.powr-registry?chain=testnet

## 💰 Gas Costs

- **Per snapshot/badge**: well under 1 STX
- **Frequency**: once per profile generation/refresh, once per badge earned
- **Optimization**: only anchors when the profile is actually updated

## 🛡️ Security Notes

1. **Oracle Key Security**: dedicated wallet, never committed, rotatable via `set-oracle` (owner-only) on both contracts
2. **Non-upgradeable contracts**: no admin escape hatch, no proxy pattern — the oracle can be rotated but the contract logic cannot change
3. **Error Handling**: blockchain failures don't break profile generation; all errors are logged

## 📝 Contract Functions

### `anchor-snapshot(user, artifact-hash, skill-scores, github-identity)`
- Anchors a PoW snapshot on-chain — oracle-only, called automatically after profile generation

### `get-snapshot(user)` / `get-skill-scores(user)`
- Read-only, free

### `verify-snapshot(artifact-hash)`
- Read-only, free — returns whether a hash has ever been anchored

### `mint-badge(recipient, skill-type, tier)`
- Oracle-only, idempotent — returns the existing token ID if already minted

## 🎯 Status

1. ✅ Clarity contracts written, tested, and deployed to Stacks testnet
2. ✅ Blockchain service anchors/mints/reads via `@stacks/transactions`
3. ✅ Database integration complete
4. ✅ Automatic anchoring on profile generation
5. ✅ Frontend display + wallet connect ready

The blockchain integration is live on Stacks testnet.
