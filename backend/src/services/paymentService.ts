import { dbService } from "./database";
import { subscriptionService, PlanType } from "./subscriptionService";

export type Currency = "stx" | "sbtc" | "usdcx";

export interface PaymentIntent {
  address: string;
  amount: string;
  currency: Currency;
  planType: PlanType;
  billingPeriod: number;
  network: "mainnet" | "testnet" | "devnet";
}

// SIP-010 token contract IDs per network
function getSbtcContract(): string {
  if (process.env.SBTC_CONTRACT_ADDRESS) return process.env.SBTC_CONTRACT_ADDRESS;
  return process.env.STACKS_NETWORK === "mainnet"
    ? "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token"
    : "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token";
}

function getUsdcxContract(): string {
  if (process.env.USDCX_CONTRACT_ADDRESS) return process.env.USDCX_CONTRACT_ADDRESS;
  return process.env.STACKS_NETWORK === "mainnet"
    ? "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx"
    : "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx";
}

// Monthly prices per plan for non-STX tokens
const TOKEN_PRICES: Record<string, { sbtc: number; usdcx: number }> = {
  basic: { sbtc: 0.0001, usdcx: 6 },
  pro: { sbtc: 0.00025, usdcx: 15 },
};

function getStacksApiUrl(): string {
  return process.env.STACKS_API_URL || "http://localhost:3999";
}

function getNetworkName(): "mainnet" | "testnet" | "devnet" {
  const n = process.env.STACKS_NETWORK || "devnet";
  if (n === "mainnet" || n === "testnet") return n;
  return "devnet";
}

export class PaymentService {
  private getPaymentAddress(): string {
    const address = process.env.PAYMENT_WALLET_ADDRESS;
    if (!address) {
      throw new Error("PAYMENT_WALLET_ADDRESS not configured");
    }
    return address;
  }

  async createPaymentIntent(
    planType: PlanType,
    billingPeriod: number = 1,
    currency: Currency = "stx"
  ): Promise<PaymentIntent> {
    const plan = subscriptionService.getPlan(planType);

    if (planType === "free") {
      throw new Error("Free plan does not require payment");
    }

    const address = this.getPaymentAddress();
    const DISCOUNTS: Record<number, number> = { 1: 0, 3: 0.10, 6: 0.20, 12: 0.30 };
    const months = [1, 3, 6, 12].includes(billingPeriod) ? billingPeriod : 1;
    const discount = DISCOUNTS[months] ?? 0;

    let amount: string;
    if (currency === "sbtc") {
      const monthly = TOKEN_PRICES[planType]?.sbtc ?? 0;
      const total = parseFloat((monthly * months * (1 - discount)).toFixed(8));
      amount = total.toString();
    } else if (currency === "usdcx") {
      const monthly = TOKEN_PRICES[planType]?.usdcx ?? 0;
      const total = Math.round(monthly * months * (1 - discount) * 100) / 100;
      amount = total.toString();
    } else {
      const monthlyStx = parseFloat(plan.priceInStx);
      amount = Math.round(monthlyStx * months * (1 - discount)).toString();
    }

    return {
      address,
      amount,
      currency,
      planType,
      billingPeriod: months,
      network: getNetworkName(),
    };
  }

  /**
   * Verify a SIP-010 token transfer (sBTC or USDCx) by inspecting the contract_call tx.
   */
  private async verifyTokenPayment(
    txId: string,
    expectedRecipient: string,
    expectedContractId: string,
    currency: "sbtc" | "usdcx"
  ): Promise<{
    verified: boolean;
    status: "pending" | "confirmed" | "failed" | "not_found";
    amount?: string;
    currency?: string;
    blockHeight?: number;
  }> {
    try {
      const apiUrl = getStacksApiUrl();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.HIRO_API_KEY) headers["x-api-key"] = process.env.HIRO_API_KEY;

      const normalizedTxId = txId.startsWith("0x") ? txId : `0x${txId}`;
      const res = await fetch(`${apiUrl}/extended/v1/tx/${normalizedTxId}`, { headers });

      if (res.status === 404) return { verified: false, status: "not_found" };
      if (!res.ok) return { verified: false, status: "failed" };

      const data = await res.json() as any;

      if (data.tx_status === "pending" || data.tx_status === "submitted") {
        return { verified: false, status: "pending" };
      }
      if (data.tx_status !== "success") return { verified: false, status: "failed" };
      if (data.tx_type !== "contract_call") return { verified: false, status: "failed" };

      const cc = data.contract_call;
      if (cc?.contract_id !== expectedContractId) {
        console.error(`Token contract mismatch: expected ${expectedContractId}, got ${cc?.contract_id}`);
        return { verified: false, status: "failed" };
      }
      if (cc?.function_name !== "transfer") {
        return { verified: false, status: "failed" };
      }

      // function_args: [amount, sender, recipient, memo]
      // Clarity repr for a principal is "'SP1234..." — strip the leading apostrophe before comparing
      const args: any[] = cc?.function_args ?? [];
      const recipientRepr: string = (args[2]?.repr ?? "").replace(/^'/, "");
      if (recipientRepr !== expectedRecipient) {
        console.error(`Recipient mismatch: expected ${expectedRecipient}, got ${args[2]?.repr}`);
        return { verified: false, status: "failed" };
      }

      // Parse amount: repr is like "u10000" → strip leading "u"
      const rawAmount = args[0]?.repr ?? "u0";
      const baseUnits = BigInt(rawAmount.replace(/^u/, "") || "0");
      const decimals = currency === "sbtc" ? 8 : 6;
      const amount = (Number(baseUnits) / Math.pow(10, decimals)).toFixed(decimals);

      return {
        verified: true,
        status: "confirmed",
        amount,
        currency,
        blockHeight: data.block_height,
      };
    } catch (error) {
      console.error("Token payment verification error:", error);
      return { verified: false, status: "failed" };
    }
  }

  /**
   * Verify a Stacks STX transfer by checking the Stacks API.
   * Returns verified=true only if the tx is confirmed and sent to our payment address.
   */
  async verifyPayment(txId: string, currency: Currency = "stx"): Promise<{
    verified: boolean;
    status: "pending" | "confirmed" | "failed" | "not_found";
    amount?: string;
    currency?: string;
    blockHeight?: number;
  }> {
    if (currency === "sbtc") {
      return this.verifyTokenPayment(txId, this.getPaymentAddress(), getSbtcContract(), "sbtc");
    }
    if (currency === "usdcx") {
      return this.verifyTokenPayment(txId, this.getPaymentAddress(), getUsdcxContract(), "usdcx");
    }

    // STX native transfer
    try {
      const apiUrl = getStacksApiUrl();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (process.env.HIRO_API_KEY) headers["x-api-key"] = process.env.HIRO_API_KEY;

      // Normalise txId — Hiro API accepts with or without 0x prefix
      const normalizedTxId = txId.startsWith("0x") ? txId : `0x${txId}`;
      const res = await fetch(`${apiUrl}/extended/v1/tx/${normalizedTxId}`, { headers });

      if (res.status === 404) return { verified: false, status: "not_found" };
      if (!res.ok) return { verified: false, status: "failed" };

      const data = await res.json() as any;

      // Transaction exists but not yet mined
      if (data.tx_status === "pending" || data.tx_status === "submitted") {
        return { verified: false, status: "pending" };
      }

      if (data.tx_status !== "success") {
        return { verified: false, status: "failed" };
      }

      if (data.tx_type !== "token_transfer") {
        return { verified: false, status: "failed" };
      }

      const paymentAddress = this.getPaymentAddress();
      if (data.token_transfer?.recipient_address !== paymentAddress) {
        console.error(
          `Payment address mismatch: expected ${paymentAddress}, got ${data.token_transfer?.recipient_address}`
        );
        return { verified: false, status: "failed" };
      }

      const microStx = Number(data.token_transfer?.amount || 0);
      const stx = (microStx / 1_000_000).toFixed(6);

      return {
        verified: true,
        status: "confirmed",
        amount: stx,
        currency: "stx",
        blockHeight: data.block_height,
      };
    } catch (error) {
      console.error("Payment verification error:", error);
      return { verified: false, status: "failed" };
    }
  }

  async processPayment(
    username: string,
    txId: string,
    planType: PlanType,
    currency: Currency = "stx"
  ): Promise<{ success: boolean; status?: string; message?: string }> {
    try {
      const verification = await this.verifyPayment(txId, currency);
      if (!verification.verified) {
        if (verification.status === "pending" || verification.status === "not_found") {
          return { success: false, status: "pending", message: "Transaction is still pending confirmation" };
        }
        return { success: false, status: "failed", message: "Payment verification failed — transaction may have been rejected" };
      }

      const existing = await dbService.getPaymentTransaction(txId);
      if (existing && existing.status === "confirmed") {
        return { success: false, message: "Payment already processed" };
      }

      if (!existing) {
        await dbService.savePaymentTransaction(
          username,
          txId,
          verification.amount || "0",
          currency,
          planType,
          verification.blockHeight
        );
      }

      await dbService.updatePaymentTransactionStatus(txId, "confirmed", verification.blockHeight);
      await subscriptionService.upgradePlan(username, planType, txId);

      return { success: true };
    } catch (error: any) {
      console.error("Payment processing error:", error);
      return { success: false, message: error.message || "Payment processing failed" };
    }
  }

  async getPaymentStatus(txId: string): Promise<{
    status: "pending" | "confirmed" | "failed" | "not_found";
    transaction?: any;
  }> {
    const transaction = await dbService.getPaymentTransaction(txId);
    if (!transaction) {
      return { status: "not_found" };
    }
    return {
      status: transaction.status as "pending" | "confirmed" | "failed",
      transaction,
    };
  }
}

export const paymentService = new PaymentService();
