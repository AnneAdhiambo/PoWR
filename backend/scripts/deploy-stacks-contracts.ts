// One-off script: broadcasts powr-badges and powr-registry to Stacks testnet
// using the oracle key already configured in backend/.env. Run with:
//   npx ts-node scripts/deploy-stacks-contracts.ts
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { makeContractDeploy, broadcastTransaction, ClarityVersion } from "@stacks/transactions";
import { STACKS_TESTNET, STACKS_MAINNET } from "@stacks/network";

dotenv.config({ path: path.join(__dirname, "..", ".env") });

function normalizePrivateKey(key: string): string {
  const clean = key.trim().replace(/^0x/i, "").toLowerCase().replace(/[^0-9a-f]/g, "");
  if (clean.length === 66 && clean.endsWith("01")) return clean;
  return clean.slice(0, 64);
}

async function getNonce(address: string, apiUrl: string): Promise<bigint> {
  const res = await fetch(`${apiUrl}/v2/accounts/${address}?proof=0`);
  if (!res.ok) throw new Error(`Failed to fetch account info: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as any;
  return BigInt(data.nonce);
}

async function deployContract(
  contractName: string,
  filePath: string,
  senderKey: string,
  network: any,
  nonce: bigint
): Promise<string> {
  const codeBody = fs.readFileSync(filePath, "utf8");
  const transaction = await makeContractDeploy({
    contractName,
    codeBody,
    senderKey,
    network,
    clarityVersion: ClarityVersion.Clarity3,
    nonce,
  });
  const broadcastResponse = await broadcastTransaction({ transaction, network });
  if ("error" in broadcastResponse) {
    throw new Error(
      `Deploy of ${contractName} failed: ${broadcastResponse.error}${
        broadcastResponse.reason ? ` — ${broadcastResponse.reason}` : ""
      } ${JSON.stringify((broadcastResponse as any).reason_data ?? {})}`
    );
  }
  console.log(`${contractName} deployed. txId=${broadcastResponse.txid}`);
  return broadcastResponse.txid;
}

async function main() {
  const rawKey = process.env.STACKS_ORACLE_PRIVATE_KEY;
  const address = process.env.STACKS_ORACLE_ADDRESS;
  if (!rawKey || !address) {
    throw new Error("Missing STACKS_ORACLE_PRIVATE_KEY / STACKS_ORACLE_ADDRESS in backend/.env");
  }
  const senderKey = normalizePrivateKey(rawKey);
  const network = process.env.STACKS_NETWORK === "mainnet" ? STACKS_MAINNET : STACKS_TESTNET;
  const apiUrl = process.env.STACKS_API_URL || "https://api.testnet.hiro.so";

  const contractsDir = path.join(__dirname, "..", "..", "contracts");
  const startNonce = await getNonce(address, apiUrl);
  console.log(`Deploying from ${address}, starting nonce ${startNonce}`);

  await deployContract(
    "powr-badges",
    path.join(contractsDir, "powr-badges.clar"),
    senderKey,
    network,
    startNonce
  );
  await deployContract(
    "powr-registry",
    path.join(contractsDir, "powr-registry.clar"),
    senderKey,
    network,
    startNonce + 1n
  );

  console.log("\nBoth deploy transactions broadcast. Track them at:");
  console.log(`  https://explorer.hiro.so/address/${address}?chain=testnet`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
