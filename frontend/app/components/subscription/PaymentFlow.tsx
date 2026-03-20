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
  CurrencyBtc,
  CurrencyDollar,
} from "phosphor-react";
import { transferStx, transferSip10Token, getConnectedAddress } from "../../lib/stacksProvider";
import { WalletPickerModal } from "./WalletPickerModal";
import { useBtcPrice } from "../../hooks/useBtcPrice";
import { useTokenBalance } from "../../hooks/useTokenBalance";

// Demo mode: simulates sBTC and USDCx payments without a real wallet or tokens
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
// Testnet address used as the demo "connected wallet"
const DEMO_ADDRESS = "STVNGSFM9S5N3BZCPV220SE51TBGZEEDPZVW30EA";

// Token contracts — mirrors backend defaults
const SBTC_CONTRACT =
  process.env.NEXT_PUBLIC_SBTC_CONTRACT_ADDRESS ||
  (process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet"
    ? "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token"
    : "ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token");

const USDCX_CONTRACT =
  process.env.NEXT_PUBLIC_USDCX_CONTRACT_ADDRESS ||
  (process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet"
    ? "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE.usdcx"
    : "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.usdcx");

// USD prices per plan per month — USDCx prices are the single source of truth
const USD_PRICES_MONTHLY: Record<string, number> = { basic: 6, pro: 15 };

const USDCX_PRICES: Record<string, number> = { basic: 6, pro: 15 };

const DISCOUNTS: Record<number, number> = { 1: 0, 3: 0.1, 6: 0.2, 12: 0.3 };

function calcUsdcxAmount(planType: string, billingPeriod: number): number {
  const monthly = USDCX_PRICES[planType] ?? 0;
  const discount = DISCOUNTS[billingPeriod] ?? 0;
  return monthly * billingPeriod * (1 - discount);
}

function calcSbtcAmount(planType: string, billingPeriod: number, btcPriceUsd: number): number {
  const usdMonthly = USD_PRICES_MONTHLY[planType] ?? 0;
  const discount = DISCOUNTS[billingPeriod] ?? 0;
  const usdTotal = usdMonthly * billingPeriod * (1 - discount);
  return usdTotal / btcPriceUsd;
}

interface PaymentFlowProps {
  paymentIntent: {
    address: string;
    amount: string;
    currency: "stx" | "sbtc" | "usdcx";
    planType: string;
    billingPeriod: number;
    network: string;
  };
  onPaymentVerified: (txHash: string) => void;
  onCancel: () => void;
  walletAddress?: string;
}

type PaymentMethod = "choose" | "stx" | "sbtc" | "usdcx" | "card";

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
  const [showWalletPicker, setShowWalletPicker] = useState(false);
  const [pendingTokenMethod, setPendingTokenMethod] = useState<"sbtc" | "usdcx" | null>(null);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(walletAddress ?? null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { btcPriceUsd, loading: btcLoading } = useBtcPrice();
  const { balance: usdcxBalanceRaw, loading: usdcxBalanceLoading } = useTokenBalance(
    connectedAddress,
    USDCX_CONTRACT
  );
  const { balance: sbtcBalanceRaw, loading: sbtcBalanceLoading } = useTokenBalance(
    connectedAddress,
    SBTC_CONTRACT,
    "sbtc"
  );

  // Hydrate connectedAddress from localStorage on mount (catches wallets connected before this component rendered)
  useEffect(() => {
    if (!connectedAddress) {
      const stored = localStorage.getItem("stacks_wallet_address");
      if (stored) setConnectedAddress(stored);
    }
  }, []);

  // Clean up polling on unmount
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const copyAddress = () => {
    navigator.clipboard.writeText(paymentIntent.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async (hashToVerify: string, currency: string, attempt = 0) => {
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
        currency
      );

      if (result.success) {
        setPending(false);
        setVerifying(false);
        onPaymentVerified(hashToVerify.trim());
        return;
      }

      if ((result as any).status === "pending") {
        if (attempt < MAX_POLLS) {
          setPending(true);
          setVerifying(false);
          setPollCount(attempt + 1);
          pollRef.current = setTimeout(
            () => handleVerify(hashToVerify, currency, attempt + 1),
            10_000
          );
        } else {
          setPending(false);
          setVerifying(false);
          setError("Transaction is taking longer than expected. Check the Stacks Explorer and paste the tx ID manually once confirmed.");
        }
        return;
      }

      setPending(false);
      setVerifying(false);
      setError(result.message || "Payment verification failed");
    } catch (err: any) {
      setPending(false);
      setVerifying(false);
      setError(err.message || "Failed to verify payment");
    }
  };

  // Returns address from state → localStorage → wallet API (in that order).
  // Only the last fallback can trigger a wallet prompt, so connected users go straight to signing.
  const resolveAddress = async (): Promise<string | null> => {
    if (connectedAddress) return connectedAddress;
    const stored = localStorage.getItem("stacks_wallet_address");
    if (stored) {
      setConnectedAddress(stored);
      return stored;
    }
    return getConnectedAddress();
  };

  const handlePayStx = async () => {
    setError(null);
    const addr = await resolveAddress();
    if (!addr) {
      setPendingTokenMethod(null);
      setShowWalletPicker(true);
      return;
    }
    const microStx = Math.round(parseFloat(paymentIntent.amount) * 1_000_000).toString();
    try {
      const txId = await transferStx(
        paymentIntent.address,
        microStx,
        `PoWR ${paymentIntent.planType} subscription`
      );
      setTxHash(txId);
      handleVerify(txId, "stx");
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.toLowerCase().includes("cancel")) {
        setError("Transaction cancelled.");
      } else {
        setError(err?.message || "Failed to send transaction.");
      }
    }
  };

  const handlePayToken = async (token: "sbtc" | "usdcx") => {
    setError(null);

    // Demo mode: skip real wallet, simulate broadcast + confirmation
    if (DEMO_MODE) {
      if (!connectedAddress) setConnectedAddress(DEMO_ADDRESS);
      const demoTxId = `demo_${token}_${Date.now()}`;
      setTxHash(demoTxId);
      setPending(true);
      setPollCount(1);
      setVerifying(false);
      // Simulate network delay then verify (backend auto-approves demo_ txids)
      pollRef.current = setTimeout(() => handleVerify(demoTxId, token), 3000);
      return;
    }

    const addr = await resolveAddress();
    if (!addr) {
      setPendingTokenMethod(token);
      setShowWalletPicker(true);
      return;
    }
    const amount =
      token === "sbtc"
        ? calcSbtcAmount(paymentIntent.planType, paymentIntent.billingPeriod, btcPriceUsd ?? 87000)
        : calcUsdcxAmount(paymentIntent.planType, paymentIntent.billingPeriod);
    const decimals = token === "sbtc" ? 8 : 6;
    const baseUnits = Math.round(amount * Math.pow(10, decimals)).toString();
    const contract = token === "sbtc" ? SBTC_CONTRACT : USDCX_CONTRACT;
    const assetName = token === "sbtc" ? "sbtc" : "usdcx";
    try {
      const txId = await transferSip10Token(
        contract,
        assetName,
        paymentIntent.address,
        baseUnits
      );
      setTxHash(txId);
      handleVerify(txId, token);
    } catch (err: any) {
      if (err?.code === 4001 || err?.message?.toLowerCase().includes("cancel")) {
        setError("Transaction cancelled.");
      } else {
        setError(err?.message || "Failed to send transaction.");
      }
    }
  };

  const handleWalletConnected = (address: string) => {
    setConnectedAddress(address);
    setShowWalletPicker(false);
    // Auto-proceed with the pending payment
    if (pendingTokenMethod) {
      const token = pendingTokenMethod;
      setPendingTokenMethod(null);
      setTimeout(() => handlePayToken(token), 0);
    } else {
      // was waiting for STX payment
      setPendingTokenMethod(null);
      setTimeout(() => handlePayStx(), 0);
    }
  };

  const handleStripe = async () => {
    setStripeLoading(true);
    setError(null);
    try {
      const { apiClient } = await import("../../lib/api");
      const username = localStorage.getItem("github_username") || "";
      const result = await apiClient.createStripeCheckout(username, paymentIntent.planType);
      if (result.url) window.location.href = result.url;
    } catch (err: any) {
      setError(err.message?.includes("not configured")
        ? "Card payments are not yet enabled. Please use STX."
        : err.message || "Failed to start card payment");
    } finally {
      setStripeLoading(false);
    }
  };

  const walletPickerModal = (
    <WalletPickerModal
      isOpen={showWalletPicker}
      onClose={() => { setShowWalletPicker(false); setPendingTokenMethod(null); }}
      onConnected={handleWalletConnected}
    />
  );

  // ── Payment method chooser ─────────────────────────────────────
  if (method === "choose") {
    const sbtcAmountCalc = calcSbtcAmount(paymentIntent.planType, paymentIntent.billingPeriod, btcPriceUsd ?? 87000);
    const sbtcAmountDisplay = btcPriceUsd
      ? sbtcAmountCalc.toFixed(8)
      : `~${sbtcAmountCalc.toFixed(8)} (est.)`;
    const usdcxAmount = calcUsdcxAmount(paymentIntent.planType, paymentIntent.billingPeriod);
    const usdTotal = (USD_PRICES_MONTHLY[paymentIntent.planType] ?? 0) *
      paymentIntent.billingPeriod *
      (1 - (DISCOUNTS[paymentIntent.billingPeriod] ?? 0));
    // USDCx has 6 decimals — convert raw balance to human-readable
    const usdcxBalanceHuman = usdcxBalanceRaw !== null ? usdcxBalanceRaw / 1_000_000 : null;
    const usdcxRequired = usdcxAmount;
    const usdcxSufficient = usdcxBalanceHuman !== null && usdcxBalanceHuman >= usdcxRequired;
    // sBTC has 8 decimals
    const sbtcBalanceHuman = sbtcBalanceRaw !== null ? sbtcBalanceRaw / 1e8 : null;
    const sbtcSufficient = sbtcBalanceHuman !== null && sbtcBalanceHuman >= sbtcAmountCalc;

    return (
      <>
        {walletPickerModal}
      <Card className="p-6 rounded-[16px]">
        <div className="flex items-center gap-3 mb-1">
          <h3 className="text-lg font-semibold text-white">Complete Payment</h3>
          {DEMO_MODE && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              Demo Mode
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-6 capitalize">
          {paymentIntent.planType} plan · {paymentIntent.billingPeriod} month{paymentIntent.billingPeriod > 1 ? "s" : ""}
        </p>

        <div className="space-y-3">
          {/* STX */}
          <button
            onClick={() => setMethod("stx")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,85,0,0.5)] hover:bg-[rgba(255,85,0,0.06)] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[rgba(255,85,0,0.15)] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#FF5500]" weight="fill" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Pay with STX</p>
              <p className="text-xs text-gray-500">{paymentIntent.amount} STX · Leather or Xverse</p>
            </div>
            <div className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)] group-hover:border-[#FF5500] transition-colors flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#FF5500] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {/* sBTC */}
          <button
            onClick={() => setMethod("sbtc")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(247,147,26,0.5)] hover:bg-[rgba(247,147,26,0.06)] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[rgba(247,147,26,0.15)] flex items-center justify-center flex-shrink-0">
              <CurrencyBtc className="w-5 h-5 text-[#F7931A]" weight="fill" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Pay with sBTC</p>
              <p className="text-xs text-gray-500">
                {sbtcAmountDisplay} sBTC · ≈ ${usdTotal.toFixed(2)} USD · Leather or Xverse
                {connectedAddress && sbtcBalanceLoading && " · checking balance..."}
                {connectedAddress && !sbtcBalanceLoading && sbtcBalanceHuman !== null && (
                  sbtcSufficient
                    ? ` · Balance: ${sbtcBalanceHuman.toFixed(8)} ✓`
                    : ` · Balance: ${sbtcBalanceHuman.toFixed(8)} (insufficient)`
                )}
              </p>
              {connectedAddress && !sbtcBalanceLoading && !sbtcSufficient && sbtcBalanceHuman !== null && (
                <a
                  href="https://app.stacks.co/bridge"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-[#F7931A] underline mt-0.5 inline-block"
                >
                  Bridge BTC → sBTC
                </a>
              )}
            </div>
            <div className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)] group-hover:border-[#F7931A] transition-colors flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#F7931A] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {/* USDCx */}
          <button
            onClick={() => setMethod("usdcx")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(39,117,202,0.5)] hover:bg-[rgba(39,117,202,0.06)] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[rgba(39,117,202,0.15)] flex items-center justify-center flex-shrink-0">
              <CurrencyDollar className="w-5 h-5 text-[#2775CA]" weight="fill" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Pay with USDCx</p>
              <p className="text-xs text-gray-500">
                {usdcxAmount.toFixed(2)} USDCx · USD-pegged
                {connectedAddress && usdcxBalanceLoading && " · checking balance..."}
                {connectedAddress && !usdcxBalanceLoading && usdcxBalanceHuman !== null && (
                  usdcxSufficient
                    ? ` · Balance: ${usdcxBalanceHuman.toFixed(2)} ✓`
                    : ` · Balance: ${usdcxBalanceHuman.toFixed(2)} (insufficient)`
                )}
              </p>
              {connectedAddress && !usdcxBalanceLoading && !usdcxSufficient && usdcxBalanceHuman !== null && (
                <a
                  href="https://bridge.stacks.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-[#2775CA] underline mt-0.5 inline-block"
                >
                  Bridge USDC → USDCx
                </a>
              )}
            </div>
            <div className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)] group-hover:border-[#2775CA] transition-colors flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#2775CA] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>

          {/* Card */}
          <button
            onClick={() => setMethod("card")}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] hover:border-[rgba(99,102,241,0.5)] hover:bg-[rgba(99,102,241,0.06)] transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-[rgba(99,102,241,0.15)] flex items-center justify-center flex-shrink-0">
              <CreditCard className="w-5 h-5 text-[#FF5500]/80" weight="fill" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">Pay with Card</p>
              <p className="text-xs text-gray-500">Credit / debit card via Stripe</p>
            </div>
            <div className="w-5 h-5 rounded-full border border-[rgba(255,255,255,0.15)] group-hover:border-[#FF5500] transition-colors flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-[#FF5500] opacity-0 group-hover:opacity-100 transition-opacity" />
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
      </>
    );
  }

  // ── Stripe / card ──────────────────────────────────────────────
  if (method === "card") {
    return (
      <>
        {walletPickerModal}
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
          <p className="text-xl font-bold text-white capitalize">{paymentIntent.planType} Plan</p>
          <p className="text-sm text-gray-400 mt-1">Billed via Stripe · secure checkout</p>
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
          className="w-full py-3 px-4 rounded-xl bg-[#FF5500] hover:bg-[#e04d00] disabled:bg-[#FF5500]/50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
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

        <p className="text-xs text-gray-600 text-center mt-3">Secured by Stripe · 256-bit encryption</p>
      </Card>
      </>
    );
  }

  // ── Token payment screen (sBTC or USDCx) ──────────────────────
  if (method === "sbtc" || method === "usdcx") {
    const isSbtc = method === "sbtc";

    const tokenAmount = isSbtc
      ? calcSbtcAmount(paymentIntent.planType, paymentIntent.billingPeriod, btcPriceUsd ?? 87000)
      : calcUsdcxAmount(paymentIntent.planType, paymentIntent.billingPeriod);
    const displayAmount = isSbtc
      ? `${tokenAmount.toFixed(8)} sBTC`
      : `${tokenAmount.toFixed(2)} USDCx`;
    const usdEquivalent = isSbtc
      ? (USD_PRICES_MONTHLY[paymentIntent.planType] ?? 0) *
        paymentIntent.billingPeriod *
        (1 - (DISCOUNTS[paymentIntent.billingPeriod] ?? 0))
      : tokenAmount;
    const amountHint = isSbtc
      ? btcPriceUsd ? `(≈ $${usdEquivalent.toFixed(2)} USD)` : ""
      : "(USD-pegged)";
    const accentColor = isSbtc ? "#F7931A" : "#2775CA";
    const TokenIcon = isSbtc ? CurrencyBtc : CurrencyDollar;
    const label = isSbtc ? "sBTC" : "USDCx";

    // USDCx-specific balance check on the payment screen
    const usdcxBalanceHumanOnScreen = !isSbtc && usdcxBalanceRaw !== null
      ? usdcxBalanceRaw / 1_000_000
      : null;
    const usdcxInsufficientOnScreen = !DEMO_MODE && !isSbtc &&
      usdcxBalanceHumanOnScreen !== null &&
      usdcxBalanceHumanOnScreen < tokenAmount;
    // sBTC balance check on the payment screen
    const sbtcBalanceHumanOnScreen = isSbtc && sbtcBalanceRaw !== null
      ? sbtcBalanceRaw / 1e8
      : null;
    const sbtcInsufficientOnScreen = !DEMO_MODE && isSbtc &&
      sbtcBalanceHumanOnScreen !== null &&
      sbtcBalanceHumanOnScreen < tokenAmount;

    return (
      <>
        {walletPickerModal}
      <Card className="p-6 rounded-[16px]">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setMethod("choose"); setError(null); setPending(false); setVerifying(false); }}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-400" weight="bold" />
          </button>
          <h3 className="text-lg font-semibold text-white">Pay with {label}</h3>
          {DEMO_MODE && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/25">
              Demo Mode
            </span>
          )}
        </div>
        {DEMO_MODE && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            <span className="mt-0.5">⚡</span>
            <span>No wallet needed — clicking Pay will simulate a real {label} transaction and confirm automatically.</span>
          </div>
        )}

        <div className="space-y-4">
          {/* Amount */}
          <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.05)]">
            <p className="text-xs text-gray-400 mb-1">Amount to Pay</p>
            <p className="text-2xl font-bold text-white">{displayAmount}</p>
            <p className="text-xs text-gray-400 mt-1">{amountHint}</p>
            {!isSbtc && usdcxBalanceHumanOnScreen !== null && (
              <p className="text-xs mt-1" style={{ color: usdcxInsufficientOnScreen ? "#f87171" : "#6ee7b7" }}>
                Your balance: {usdcxBalanceHumanOnScreen.toFixed(2)} USDCx
              </p>
            )}
            {isSbtc && sbtcBalanceHumanOnScreen !== null && (
              <p className="text-xs mt-1" style={{ color: sbtcInsufficientOnScreen ? "#f87171" : "#6ee7b7" }}>
                Your balance: {sbtcBalanceHumanOnScreen.toFixed(8)} sBTC
              </p>
            )}
          </div>

          {/* Insufficient balance warning */}
          {usdcxInsufficientOnScreen && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" weight="fill" />
              <div>
                <p className="text-sm font-medium text-red-300">Insufficient USDCx balance</p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  You need {tokenAmount.toFixed(2)} USDCx but only have {usdcxBalanceHumanOnScreen!.toFixed(2)}.{" "}
                  <a
                    href="https://bridge.stacks.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[#2775CA]"
                  >
                    Bridge USDC → USDCx
                  </a>
                </p>
              </div>
            </div>
          )}
          {sbtcInsufficientOnScreen && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25">
              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" weight="fill" />
              <div>
                <p className="text-sm font-medium text-red-300">Insufficient sBTC balance</p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  You need {tokenAmount.toFixed(8)} sBTC but only have {sbtcBalanceHumanOnScreen!.toFixed(8)}.{" "}
                  <a
                    href="https://app.stacks.co/bridge"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-[#F7931A]"
                  >
                    Bridge BTC → sBTC
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* Pending confirmation banner */}
          {pending && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <HourglassHigh className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" weight="fill" />
              <div>
                <p className="text-sm font-medium text-amber-300">Waiting for confirmation</p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  Transaction broadcast · checking every 10s (attempt {pollCount}/{MAX_POLLS})
                </p>
                {txHash && (
                  <a
                    href={`https://explorer.hiro.so/txid/${txHash.replace(/^0x/, "")}?chain=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-300 underline mt-1 inline-block"
                  >
                    View on Explorer ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Pay with wallet button */}
          <button
            onClick={() => handlePayToken(method)}
            disabled={verifying || pending || !!usdcxInsufficientOnScreen || !!sbtcInsufficientOnScreen}
            style={{ backgroundColor: verifying || pending || usdcxInsufficientOnScreen || sbtcInsufficientOnScreen ? undefined : accentColor }}
            className="w-full py-3 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2 hover:opacity-90"
          >
            <TokenIcon className="w-5 h-5" weight="fill" />
            {DEMO_MODE ? `Simulate ${label} Payment` : `Pay ${displayAmount} with Wallet`}
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
              className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-[#FF5500]"
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
              onClick={() => handleVerify(txHash, method)}
              disabled={verifying || pending || !txHash.trim()}
              className="flex-1 py-2.5 px-4 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] disabled:bg-[#FF5500]/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
      </>
    );
  }

  // ── STX flow ───────────────────────────────────────────────────
  return (
    <>
      {walletPickerModal}
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
          <p className="text-2xl font-bold text-white">{paymentIntent.amount} STX</p>
          <p className="text-xs text-gray-400 mt-1">
            Network: Stacks{" "}
            {process.env.NEXT_PUBLIC_STACKS_NETWORK === "mainnet" ? "Mainnet" : "Testnet"}
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
              {txHash && (
                <a
                  href={`https://explorer.hiro.so/txid/${txHash.replace(/^0x/, "")}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-300 underline mt-1 inline-block"
                >
                  View on Explorer ↗
                </a>
              )}
            </div>
          </div>
        )}

        {/* Pay with wallet button */}
        <button
          onClick={handlePayStx}
          disabled={verifying || pending}
          className="w-full py-3 px-4 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] disabled:bg-[#FF5500]/50 disabled:cursor-not-allowed text-white font-medium transition-colors flex items-center justify-center gap-2"
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
            className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white text-sm font-mono placeholder-gray-500 focus:outline-none focus:border-[#FF5500]"
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
            onClick={() => handleVerify(txHash, "stx")}
            disabled={verifying || pending || !txHash.trim()}
            className="flex-1 py-2.5 px-4 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] disabled:bg-[#FF5500]/50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
    </>
  );
};
