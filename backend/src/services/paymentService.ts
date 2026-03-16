import { dbService } from "./database";
import { subscriptionService, PlanType } from "./subscriptionService";

export interface PaymentIntent {
  address: string;
  amount: string;      // in STX (decimal)
  currency: "stx";
  planType: PlanType;
  billingPeriod: number;
  network: "mainnet" | "testnet" | "devnet";
}

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

  async createPaymentIntent(planType: PlanType, billingPeriod: number = 1): Promise<PaymentIntent> {
    const plan = subscriptionService.getPlan(planType);

    if (planType === "free") {
      throw new Error("Free plan does not require payment");
    }

    const address = this.getPaymentAddress();

    const DISCOUNTS: Record<number, number> = { 1: 0, 3: 0.10, 6: 0.20, 12: 0.30 };
    const months = [1, 3, 6, 12].includes(billingPeriod) ? billingPeriod : 1;
    const discount = DISCOUNTS[months] ?? 0;
    const monthlyStx = parseFloat(plan.priceInStx);
    const totalStx = Math.round(monthlyStx * months * (1 - discount));

    return {
      address,
      amount: totalStx.toString(),
      currency: "stx",
      planType,
      billingPeriod: months,
      network: getNetworkName(),
    };
  }

  /**
   * Verify a Stacks STX transfer by checking the Stacks API.
   * Returns verified=true only if the tx is confirmed and sent to our payment address.
   */
  async verifyPayment(txId: string): Promise<{
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
    planType: PlanType
  ): Promise<{ success: boolean; status?: string; message?: string }> {
    try {
      const verification = await this.verifyPayment(txId);
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
          "stx",
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
