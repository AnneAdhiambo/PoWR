import crypto from "crypto";
import { dbService } from "./database";
import { subscriptionService, PlanType } from "./subscriptionService";

export interface PaymentIntent {
  invoice: string;      // Bolt11 invoice string
  paymentHash: string;  // Payment hash to poll/verify
  amountSats: number;   // Amount in satoshis
  amountUsd: number;    // Amount in USD
  currency: "lightning";
  planType: PlanType;
  billingPeriod: number;
}

// USD prices per plan per month
const USD_PRICES: Record<string, number> = { basic: 6, pro: 15 };

async function fetchBtcPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    const data = await res.json() as any;
    const price = data?.bitcoin?.usd;
    if (!price || typeof price !== "number") throw new Error("Could not fetch BTC price");
    return price;
  } catch (err) {
    console.warn("[Payment] CoinGecko BTC price fetch failed, using fallback $67,500");
    return 67500;
  }
}

export class PaymentService {
  private generateMockBolt11(sats: number, paymentHash: string): string {
    // Generate a realistic looking Bolt11 invoice
    const randomHex = crypto.randomBytes(32).toString("hex");
    return `lnbc${sats}u1p${randomHex.slice(0, 10)}xxxxxx${paymentHash}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;
  }

  async createPaymentIntent(
    username: string,
    planType: PlanType,
    billingPeriod: number = 1
  ): Promise<PaymentIntent> {
    if (planType === "free") {
      throw new Error("Free plan does not require payment");
    }

    const DISCOUNTS: Record<number, number> = { 1: 0, 3: 0.10, 6: 0.20, 12: 0.30 };
    const months = [1, 3, 6, 12].includes(billingPeriod) ? billingPeriod : 1;
    const discount = DISCOUNTS[months] ?? 0;

    const usdMonthly = USD_PRICES[planType] ?? 0;
    const usdTotal = usdMonthly * months * (1 - discount);
    
    const btcPrice = await fetchBtcPriceUsd();
    const btcTotal = usdTotal / btcPrice;
    const amountSats = Math.round(btcTotal * 100_000_000);

    const paymentHash = crypto.randomBytes(32).toString("hex");
    const invoice = this.generateMockBolt11(amountSats, paymentHash);

    // Save pending transaction to DB for developer
    await dbService.savePaymentTransaction(
      username,
      paymentHash, // stored in tx_hash
      amountSats.toString(), // stored in amount
      "lightning", // stored in currency
      planType,
      0 // block number
    );

    return {
      invoice,
      paymentHash,
      amountSats,
      amountUsd: usdTotal,
      currency: "lightning",
      planType,
      billingPeriod: months,
    };
  }

  async createRecruiterPaymentIntent(
    recruiterId: number,
    plan: string,
    usdMonthly: number
  ): Promise<PaymentIntent> {
    const btcPrice = await fetchBtcPriceUsd();
    const btcTotal = usdMonthly / btcPrice;
    const amountSats = Math.round(btcTotal * 100_000_000);

    const paymentHash = crypto.randomBytes(32).toString("hex");
    const invoice = this.generateMockBolt11(amountSats, paymentHash);

    await dbService.saveRecruiterPaymentIntent(recruiterId, paymentHash, plan, amountSats, usdMonthly);

    return {
      invoice,
      paymentHash,
      amountSats,
      amountUsd: usdMonthly,
      currency: "lightning",
      planType: plan as PlanType,
      billingPeriod: 1,
    };
  }

  async verifyPayment(paymentHash: string): Promise<{
    verified: boolean;
    status: "pending" | "confirmed" | "failed" | "not_found";
    amount?: string;
    currency?: string;
  }> {
    // Check developer invoices
    const developerTx = await dbService.getPaymentTransaction(paymentHash);
    if (developerTx) {
      const isConfirmed = developerTx.status === "confirmed";
      return {
        verified: isConfirmed,
        status: isConfirmed ? "confirmed" : "pending",
        amount: developerTx.amount,
        currency: "lightning",
      };
    }

    // Check recruiter invoices
    const recruiterTx = await dbService.getRecruiterPaymentIntent(paymentHash);
    if (recruiterTx) {
      const isConfirmed = recruiterTx.status === "confirmed";
      return {
        verified: isConfirmed,
        status: isConfirmed ? "confirmed" : "pending",
        amount: recruiterTx.amount_sats.toString(),
        currency: "lightning",
      };
    }

    return { verified: false, status: "not_found" };
  }

  async processPayment(
    username: string,
    paymentHash: string,
    planType: PlanType
  ): Promise<{ success: boolean; status?: string; message?: string }> {
    try {
      const verification = await this.verifyPayment(paymentHash);
      if (!verification.verified) {
        return { success: false, status: "pending", message: "Invoice is still unpaid" };
      }

      await subscriptionService.upgradePlan(username, planType, paymentHash);
      return { success: true };
    } catch (error: any) {
      console.error("Payment processing error:", error);
      return { success: false, message: error.message || "Payment processing failed" };
    }
  }

  async payInvoiceMock(paymentHash: string): Promise<{ success: boolean; message?: string }> {
    // 1. Try developer invoice
    const developerTx = await dbService.getPaymentTransaction(paymentHash);
    if (developerTx) {
      if (developerTx.status === "confirmed") {
        return { success: false, message: "Invoice already paid" };
      }
      await dbService.updatePaymentTransactionStatus(paymentHash, "confirmed", 999999);
      await subscriptionService.upgradePlan(developerTx.username, developerTx.plan_type as PlanType, paymentHash);
      return { success: true };
    }

    // 2. Try recruiter invoice
    const recruiterTx = await dbService.getRecruiterPaymentIntent(paymentHash);
    if (recruiterTx) {
      if (recruiterTx.status === "confirmed") {
        return { success: false, message: "Invoice already paid" };
      }
      const confirmed = await dbService.confirmRecruiterPaymentIntent(paymentHash);
      if (!confirmed) return { success: false, message: "Invoice already paid" };
      await dbService.updateRecruiterPlan(confirmed.recruiter_id, confirmed.plan);
      return { success: true };
    }

    return { success: false, message: "Invoice not found" };
  }
}

export const paymentService = new PaymentService();
