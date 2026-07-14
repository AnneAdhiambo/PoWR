# Blockchain Integration Setup

## Overview

PoWR anchors proof-of-work snapshots to the **Stacks** blockchain (secured by
Bitcoin via Proof of Transfer) for tamper-proof reputation verification.

## What Gets Anchored On-Chain

- **Artifact Hash**: keccak256 hash of the analyzed artifact set (repos, commits, PRs)
- **Skill Scores**: Array of skill-specific PoW scores (0-100), up to 10 dimensions
- **GitHub Identity**: GitHub username (stored as a `string-ascii`)
- **Anchored-at block height**: Set automatically by the contract

**We do NOT store:**
- Code content
- Personal data
- Repository contents
- Full artifact data

## Contract Details

- **Registry contract**: `ST3VEJ5TMJK30S4PK5WXP9J1W86FCDH6DY3K3DBG5.powr-registry`
- **Badges contract**: `ST3VEJ5TMJK30S4PK5WXP9J1W86FCDH6DY3K3DBG5.powr-badges`
- **Network**: Stacks Testnet
- **Explorer**: https://explorer.hiro.so/?chain=testnet
- **Source**: `contracts/powr-registry.clar`, `contracts/powr-badges.clar`

Both contracts are oracle-gated: only the configured oracle principal can call
`anchor-snapshot` / `mint-badge`. All read-only functions (`get-snapshot`,
`verify-snapshot`, `get-skill-scores`, `has-badge`, ...) are public and free.

## Setup Instructions

### 1. Get an oracle wallet + testnet STX

The backend signs every anchor/mint transaction with a single "oracle" keypair.
Generate one (e.g. via `@stacks/wallet-sdk` or `clarinet console`), then fund it
from the public faucet:

```bash
curl -X POST "https://api.testnet.hiro.so/extended/v1/faucets/stx?address=<YOUR_ADDRESS>"
```

### 2. Configure Backend

Add to `backend/.env`:

```env
STACKS_NETWORK=testnet
STACKS_ORACLE_PRIVATE_KEY=your_oracle_private_key_hex
STACKS_ORACLE_ADDRESS=ST...your_oracle_address
POWR_REGISTRY_CONTRACT_ADDRESS=ST3VEJ5TMJK30S4PK5WXP9J1W86FCDH6DY3K3DBG5
POWR_BADGES_CONTRACT_ADDRESS=ST3VEJ5TMJK30S4PK5WXP9J1W86FCDH6DY3K3DBG5
STACKS_API_URL=https://api.testnet.hiro.so
```

**Important**:
- Never commit private keys to git
- Use a dedicated oracle wallet, not a personal one
- Keep enough testnet STX for gas (deploys cost ~0.6 STX each; anchor/mint calls are cheap)

If `STACKS_ORACLE_PRIVATE_KEY` is unset, `blockchainService.anchorSnapshot()` and
`mintBadge()` fall back to generating a mocked txId instead of failing — this
keeps local demos working without live credentials.

### 3. Deploying / redeploying the contracts

Clarinet's own `deployments apply` command expects a BIP39 mnemonic in
`settings/Testnet.toml`. Since the oracle key here is a raw private key (not
derived from a mnemonic we hold), contracts are deployed directly with
`@stacks/transactions` instead:

```bash
cd backend
npx ts-node scripts/deploy-stacks-contracts.ts
```

This broadcasts `powr-badges` then `powr-registry` from the oracle address
configured in `.env`, using sequential nonces fetched from the Stacks API.

### 4. How It Works

1. **Profile Generation**: When a user's profile is generated:
   - Artifacts are analyzed
   - Skill scores are calculated
   - Artifact hash is generated (keccak256 of artifact set)
   - `anchor-snapshot` is called on `powr-registry` by the oracle
2. **Automatic Anchoring**:
   - Happens automatically after profile generation (scheduled + webhook-triggered updates)
   - Non-blocking (won't fail profile generation if blockchain is unavailable)
   - Transaction ID is stored in the database
3. **Badges**: Skill badges are minted (soulbound, SIP-009) on `powr-badges` once a user
   crosses a skill threshold, gated the same way.
4. **Viewing Proofs**:
   - Users see all their on-chain proofs in the dashboard
   - Each proof links to the Hiro Explorer for verification

## Contract Functions

### `anchor-snapshot(user principal, artifact-hash (buff 32), skill-scores (list 10 uint), github-identity (string-ascii 64))`
- Anchors a PoW snapshot on-chain — oracle-only
- Called automatically after profile generation

### `get-snapshot(user principal)`
- Returns the latest snapshot for a principal — read-only, free

### `verify-snapshot(artifact-hash (buff 32))`
- Verifies if a hash has been anchored — read-only, free

### `mint-badge(recipient principal, skill-type uint, tier uint)`
- Mints a soulbound skill badge — oracle-only, idempotent

## Gas Costs

- **Per anchor/mint call**: a small fraction of a STX
- **Frequency**: once per profile generation/refresh, and once per badge earned
- **Optimization**: only anchors when the profile is actually updated

## Testing

### Test Blockchain Anchoring

1. Ensure the oracle wallet has testnet STX
2. Set `STACKS_ORACLE_PRIVATE_KEY` etc. in `backend/.env`
3. Generate a profile (login → dashboard → refresh analysis)
4. Check the dashboard for "On-Chain Proofs"
5. Click through to the Hiro Explorer to see the transaction

### Run the unit tests

```bash
cd backend
npx vitest run tests/blockchain.test.ts
```

## Troubleshooting

### "Blockchain not configured" (503 on `/publish-proof`)
- Set `STACKS_ORACLE_PRIVATE_KEY`, `STACKS_ORACLE_ADDRESS`, and
  `POWR_REGISTRY_CONTRACT_ADDRESS` in `backend/.env`, then restart the backend

### "Stacks broadcast failed: ..."
- Check the oracle wallet's STX balance
- Verify `POWR_REGISTRY_CONTRACT_ADDRESS` / `POWR_BADGES_CONTRACT_ADDRESS` match
  a contract that's actually deployed on `STACKS_NETWORK`
- Check `STACKS_API_URL` is reachable

### "No proofs showing"
- Verify the transaction succeeded on the explorer
- Check the database for stored proofs (`blockchain_proofs` table)

## Production Considerations

1. **Wallet Security**: dedicated oracle key, rotated via `set-oracle` if compromised
2. **Cost Management**: monitor oracle wallet STX balance; each anchor/mint is one tx
3. **Error Handling**: blockchain failures never block profile generation — logged and retried on next update

## Status

1. ✅ Contracts written (`powr-registry.clar`, `powr-badges.clar`) and unit-tested (33/33, Clarinet simnet)
2. ✅ Contracts deployed to Stacks testnet
3. ✅ Blockchain service anchors/mints/reads via `@stacks/transactions`
4. ✅ Automatic anchoring on profile generation (scheduled + webhook paths)
5. ✅ Frontend on-chain verification (`frontend/app/lib/web3.ts`, `@stacks/connect`)
