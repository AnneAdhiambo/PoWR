"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card } from "../ui";
import {
  Copy,
  CheckCircle,
  CircleNotch,
  ArrowLeft,
  Lightning,
  CurrencyBtc,
  Clock,
} from "phosphor-react";
import toast from "react-hot-toast";

interface PaymentFlowProps {
  paymentIntent: {
    invoice: string;      // Bolt11 invoice string
    paymentHash: string;  // Payment hash to poll/verify
    amountSats: number;   // Amount in satoshis
    amountUsd: number;    // Amount in USD
    currency: "lightning";
    planType: string;
    billingPeriod: number;
    network?: string;
  };
  onPaymentVerified: (paymentHash: string) => void;
  onCancel: () => void;
  walletAddress?: string; // Kept for signature compatibility
  onVerify?: (paymentHash: string, currency: string) => Promise<{ success: boolean; status?: string; message?: string }>;
}

const MAX_POLLS = 60; // 60 * 5s = 5 minutes polling duration

export const PaymentFlow: React.FC<PaymentFlowProps> = ({
  paymentIntent,
  onPaymentVerified,
  onCancel,
  onVerify,
}) => {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [polling, setPolling] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll for payment confirmation
  useEffect(() => {
    startPolling();
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [paymentIntent.paymentHash]);

  const startPolling = (attempt = 0) => {
    if (attempt >= MAX_POLLS) {
      setPolling(false);
      setError("Payment window expired. Please create a new invoice.");
      return;
    }

    pollRef.current = setTimeout(async () => {
      try {
        let success = false;
        if (onVerify) {
          const res = await onVerify(paymentIntent.paymentHash, "lightning");
          success = res.success;
        } else {
          const { apiClient } = await import("../../lib/api");
          const username = localStorage.getItem("github_username") || "";
          const res = await apiClient.verifyPayment(
            username,
            paymentIntent.paymentHash,
            paymentIntent.planType,
            "lightning"
          );
          success = res.success;
        }

        if (success) {
          setPolling(false);
          onPaymentVerified(paymentIntent.paymentHash);
        } else {
          setPollCount(attempt + 1);
          startPolling(attempt + 1);
        }
      } catch (err) {
        console.error("Polling error:", err);
        setPollCount(attempt + 1);
        startPolling(attempt + 1);
      }
    }, 5000); // Poll every 5 seconds
  };

  const copyInvoice = () => {
    navigator.clipboard.writeText(paymentIntent.invoice);
    setCopied(true);
    toast.success("Invoice copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Pay using WebLN if available in the browser (e.g. Alby, GetAlby, Mutiny)
  const handlePayWebLN = async () => {
    const win = window as any;
    if (typeof win !== "undefined" && win.webln) {
      try {
        setVerifying(true);
        await win.webln.enable();
        await win.webln.sendPayment(paymentIntent.invoice);
        toast.success("Payment broadcasted via WebLN!");
        // Instantly check verification
        checkVerificationImmediate();
      } catch (err: any) {
        setVerifying(false);
        toast.error(err.message || "WebLN payment failed");
      }
    } else {
      toast.error("No WebLN wallet found. Please copy the invoice or scan the QR code.");
    }
  };

  const checkVerificationImmediate = async () => {
    setVerifying(true);
    try {
      let success = false;
      if (onVerify) {
        const res = await onVerify(paymentIntent.paymentHash, "lightning");
        success = res.success;
      } else {
        const { apiClient } = await import("../../lib/api");
        const username = localStorage.getItem("github_username") || "";
        const res = await apiClient.verifyPayment(
          username,
          paymentIntent.paymentHash,
          paymentIntent.planType,
          "lightning"
        );
        success = res.success;
      }

      if (success) {
        if (pollRef.current) clearTimeout(pollRef.current);
        onPaymentVerified(paymentIntent.paymentHash);
      } else {
        toast.error("Payment not detected yet. Keep polling...");
      }
    } catch (err: any) {
      toast.error(err.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  // Simulate payment on the backend in sandbox development environment
  const handleSimulatePayment = async () => {
    setSimulating(true);
    try {
      const isRecruiter = !!onVerify;
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      let endpoint = `${baseUrl}/api/payments/lightning/pay-mock`;
      let headers: HeadersInit = { "Content-Type": "application/json" };
      
      if (isRecruiter) {
        endpoint = `${baseUrl}/api/recruiter/billing/lightning/pay-mock`;
        const token = localStorage.getItem("recruiter_token");
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ paymentHash: paymentIntent.paymentHash }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Simulation failed");
      }

      toast.success("Simulation successful! Invoice paid.");
      if (pollRef.current) clearTimeout(pollRef.current);
      onPaymentVerified(paymentIntent.paymentHash);
    } catch (err: any) {
      toast.error(err.message || "Failed to simulate payment");
    } finally {
      setSimulating(false);
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=ffffff&bgcolor=0c0d10&data=${encodeURIComponent(
    paymentIntent.invoice
  )}`;

  return (
    <Card className="p-6 rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[#12141c] to-[#0c0d10] shadow-2xl relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF5500]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#F7931A]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 mb-5 border-b border-white/[0.05] pb-4">
        <button
          onClick={onCancel}
          className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" weight="bold" />
        </button>
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
            <Lightning className="w-5 h-5 text-[#F7931A]" weight="fill" />
            Bitcoin Lightning
          </h3>
          <p className="text-xs text-gray-400 capitalize">
            {paymentIntent.planType} plan · {paymentIntent.billingPeriod} month{paymentIntent.billingPeriod > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Amount Display */}
      <div className="mb-6 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
        <p className="text-xs text-gray-400 mb-1">Amount to Pay</p>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-2xl font-black text-white font-mono">
            {paymentIntent.amountSats.toLocaleString()}
          </span>
          <span className="text-xs font-bold text-[#F7931A]">sats</span>
        </div>
        <p className="text-xs text-gray-500 mt-1 font-medium">
          ≈ ${paymentIntent.amountUsd.toFixed(2)} USD
        </p>
      </div>

      {/* QR Code with scanning animation */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative p-3 rounded-2xl bg-[#0c0d10] border border-white/[0.08] shadow-inner group overflow-hidden">
          {/* Scanning line animation */}
          {polling && (
            <div className="absolute left-0 right-0 h-0.5 bg-[#F7931A] shadow-[0_0_10px_#F7931A] animate-[scan_3s_linear_infinite]" 
              style={{
                animationName: "scan",
                animationDuration: "3s",
                animationIterationCount: "infinite",
                animationTimingFunction: "linear"
              }}
            />
          )}
          <img
            src={qrCodeUrl}
            alt="Bitcoin Lightning Invoice QR Code"
            className="w-48 h-48 rounded-lg select-none pointer-events-none"
          />
        </div>
        
        {/* Status Indicator */}
        <div className="flex items-center gap-2 mt-4 text-xs">
          {polling ? (
            <>
              <CircleNotch className="w-3.5 h-3.5 text-[#F7931A] animate-spin" weight="bold" />
              <span className="text-gray-400 font-medium animate-pulse">
                Waiting for payment...
              </span>
            </>
          ) : (
            <span className="text-red-400 font-semibold">{error}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {/* Copy Invoice String */}
        <button
          onClick={copyInvoice}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all text-left group"
        >
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-0.5">
              Bolt11 Invoice
            </p>
            <p className="text-xs text-gray-300 font-mono truncate">
              {paymentIntent.invoice}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-white/[0.04] text-gray-400 group-hover:text-white transition-colors">
            {copied ? (
              <CheckCircle className="w-4 h-4 text-green-400" weight="fill" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </div>
        </button>

        {/* WebLN pay button */}
        <button
          onClick={handlePayWebLN}
          disabled={!polling || verifying}
          className="w-full py-3.5 px-4 rounded-xl bg-[#F7931A] hover:bg-[#e28212] disabled:opacity-50 disabled:cursor-not-allowed text-black font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#F7931A]/10 hover:shadow-[#F7931A]/20"
        >
          <Lightning className="w-4 h-4" weight="fill" />
          Pay with Wallet
        </button>

        {/* Sandbox Simulation Mode */}
        <div className="border-t border-white/[0.05] pt-4 mt-2">
          <div className="flex items-center gap-1.5 justify-center mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Local Dev Sandbox
            </p>
          </div>
          
          <button
            onClick={handleSimulatePayment}
            disabled={simulating || !polling}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            {simulating ? (
              <>
                <CircleNotch className="w-3.5 h-3.5 animate-spin" weight="bold" />
                Simulating...
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5" weight="fill" />
                Simulate Lightning Payment
              </>
            )}
          </button>
        </div>

        {/* Immediate check verification button */}
        <button
          onClick={checkVerificationImmediate}
          disabled={verifying || !polling}
          className="w-full py-2 text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors flex items-center justify-center gap-1"
        >
          <Clock className="w-3.5 h-3.5" />
          Check Payment Status
        </button>
      </div>

      {/* Inline styles for custom scan keyframes */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
    </Card>
  );
};
