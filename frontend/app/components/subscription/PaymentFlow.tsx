"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "../ui";
import {
  Copy,
  CheckCircle,
  XCircle,
  CircleNotch,
  Wallet,
  CreditCard,
  ArrowLeft,
  HourglassHigh,
} from "phosphor-react";
// @stacks/connect imported dynamically inside handlePay to avoid chunk eval crash

interface PaymentFlowProps {
  paymentIntent: {
    address: string;
    amount: string;
    currency: "stx";
    planType: string;
    network: string;
  };
  onPaymentVerified: (txHash: string) => void;
  onCancel: () => void;
  walletAddress?: string;
}

type PaymentMethod = "choose" | "stx" | "card";

const MAX_POLLS = 24; // 24 × 10s = 4 minutes max

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  paymentIntent,
  onPaymentVerified,
  onCancel,
  walletAddress,
}) => {
  const [method, setMethod] = useState<PaymentMethod>("choose");
  const [txHash, setTxHash] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [pending, setPending] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const copyAddress = () => {
    navigator.clipboard.writeText(paymentIntent.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePay = async () => {
    setError(null);
    const microStx = Math.round(
      parseFloat(paymentIntent.amount) * 1_000_000
    ).toString();

    try {
      // Dynamically import to avoid Turbopack chunk evaluation crash
      const { request } = await import("@stacks/connect");
      const result = await request("stx_transferStx", {
        recipient: paymentIntent.address,
        amount: microStx,
        memo: `PoWR ${paymentIntent.planType} subscription`,
      });
      const txId = (result as any).txid ?? (result as any).txId;
      if (txId) {
        setTxHash(txId);
        handleVerify(txId);
      }
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.toLowerCase().includes("cancel")) {
        setError("Transaction cancelled.");
      } else {
        setError(err?.message || "Failed to send transaction.");
      }
    }
  };

  const handleVerify = async (hashToVerify: string, attempt = 0) => {
    if (!hashToVerify.trim()) {
      setError("Please enter a transaction hash");
      return;
    }
    if (attempt === 0) {
      setVerifying(true);
      setPending(false);
      setPollCount(0);
      setError(null);
    }

    try {
      const { apiClient } = await import("../../lib/api");
      const username = localStorage.getItem("github_username") || "";
      const result = await apiClient.verifyPayment(
        username,
        hashToVerify.trim(),
        paymentIntent.planType,
        "stacks"
      );

      if (result.success) {
        setPending(false);
        setVerifying(false);
        onPaymentVerified(hashToVerify.trim());
        return;
      }

      // Transaction is pending on-chain — keep polling
      if ((result as any).status === "pending") {
        if (attempt < MAX_POLLS) {
          setPending(true);
          setVerifying(false);
          setPollCount(attempt + 1);
          pollRef.current = setTimeout(
            () => handleVerify(hashToVerify, attempt + 1),
            10_000
          );
        } else {
          setPending(false);
          setVerifying(false);
          setError("Transaction is taking longer than expected. Check the Stacks Explorer and paste the tx ID manually once confirmed.");
        }
        return;
      }

      // Definitive failure
      setPending(false);
      setVerifying(false);
      setError(result.message || "Payment verification failed");
    } catch (err: any) {
      setPending(false);
      setVerifying(false);
      setError(err.message || "Failed to verify payment");
    }
  };

  const handleStripe = async () => {
    setStripeLoading(true);
    setError(null);
    try {
      const { apiClient } = await import("../../lib/api");
      const username = localStorage.getItem("github_username") || "";
      const result = await apiClient.createStripeCheckout(
        username,
        paymentIntent.planType
      );
      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err: any) {
      setError(err.message?.includes("not configured")
        ? "Card payments are not yet enabled. Please use STX."
        : err.message || "Failed to start card payment");
    } finally {
      setStripeLoading(false);
    }
  };

  // ── Payment method chooser ─────────────────────────────────────
  if (method === "choose") {
    return (
      <Card className="p-6 rounded-[16px]">
        <h3 className="text-lg font-semibold text-white mb-1">
          Complete Payment
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          {paymentIntent.amount} STX · {paymentIntent.planType} plan
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setMethod("stx")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(59,118,239,0.5)] hover:bg-[rgba(59,118,239,0.06)] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[rgba(59,118,239,0.15)] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#3b76ef]" weight="fill" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Pay with STX</p>
              <p className="text-xs text-gray-500">
                {paymentIntent.amount} STX via Leather or Xverse
              </p>
            </div>
            <div className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)] group-hover:border-[#3b76ef] transition-colors flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#3b76ef] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          <button
            onClick={() => setMethod("card")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(99,102,241,0.5)] hover:bg-[rgba(99,102,241,0.06)] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-indigo-400" weight="fill" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Pay with Card</p>
              <p className="text-xs text-gray-500">
                Credit / debit card via Stripe
              </p>
            </div>
            <div className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)] group-hover:border-indigo-400 transition-colors flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="mt-4 w-full py-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </Card>
    );
  }

  // ── Stripe / card ──────────────────────────────────────────────
  if (method === "card") {
    return (
      <Card className="p-6 rounded-[16px]">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setMethod("choose"); setError(null); }}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" weight="bold" />
          </button>
          <h3 className="text-lg font-semibold text-white">Pay with Card</h3>
        </div>

        <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] mb-6">
          <p className="text-xs text-gray-400 mb-1">Amount</p>
          <p className="text-xl font-bold text-white capitalize">
            {paymentIntent.planType} Plan
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Billed via Stripe · secure checkout
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            <XCircle className="w-4 h-4 flex-shrink-0" weight="fill" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={handleStripe}
          disabled={stripeLoading}
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {stripeLoading ? (
            <>
              <CircleNotch className="w-5 h-5 animate-spin" weight="bold" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" weight="fill" />
              Continue to Checkout
            </>
          )}
        </button>

        <p className="text-xs text-gray-600 text-center mt-3">
          Secured by Stripe · 256-bit encryption
        </p>
      </Card>
    );
  }

  // ── STX flow ───────────────────────────────────────────────────
  return (
    <Card className="p-6 rounded-[16px]">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => { setMethod("choose"); setError(null); }}
          className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-400" weight="bold" />
        </button>
        <h3 className="text-lg font-semibold text-white">Pay with STX</h3>
      </div>

      <div className="space-y-4">
        {/* Amount */}
        <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.05)]">
          <p className="text-xs text-gray-400 mb-1">Amount to Pay</p>
          <p className="text-2xl font-bold text-white">
            {paymentIntent.amount} STX
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Network: Stacks{" "}
            {process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet"
              ? "Mainnet"
              : "Testnet"}
          </p>
        </div>

        {/* Pending confirmation banner */}
        {pending && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
            <HourglassHigh className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" weight="fill" />
            <div>
              <p className="text-sm font-medium text-amber-300">Waiting for confirmation</p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Transaction broadcast · checking every 10s (attempt {pollCount}/{MAX_POLLS})
              </p>
              <p className="text-xs text-amber-400/70 mt-0.5">
                Testnet blocks take ~30–60 seconds.
              </p>
            </div>
          </div>
        )}

        {/* Pay with wallet button */}
        <button
          onClick={handlePay}
          disabled={verifying || pending}
          className="w-full py-3 px-4 rounded-lg bg-[#3b76ef] hover:bg-[#3265cc] disabled:bg-[#3b76ef]/50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Wallet className="w-5 h-5" />
          Pay {paymentIntent.amount} STX with Wallet
        </button>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[rgba(255,255,255,0.1)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[#12141a] px-2 text-gray-500">Or enter tx manually</span>
          </div>
        </div>

        {/* Payment address */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(255,255,255,0.05)]">
          <code className="flex-1 text-xs text-gray-300 font-mono break-all">
            {paymentIntent.address}
          </code>
          <button
            onClick={copyAddress}
            className="flex-shrink-0 p-1.5 rounded hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-400" weight="fill" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" weight="regular" />
            )}
          </button>
        </div>

        {/* Tx hash input */}
        <div>
          <p className="text-xs text-gray-400 mb-2">Transaction ID (manual payment):</p>
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {error && !pending && (
            <div className="flex items-start gap-2 mt-2 text-xs text-red-400">
              <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" weight="fill" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-gray-300 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleVerify(txHash)}
            disabled={verifying || pending || !txHash.trim()}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {pending ? (
              <>
                <HourglassHigh className="w-4 h-4 animate-pulse" weight="fill" />
                Confirming...
              </>
            ) : verifying ? (
              <>
                <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
                Verifying...
              </>
            ) : (
              "Verify Transaction"
            )}
          </button>
        </div>
      </div>
    </Card>
  );
};
