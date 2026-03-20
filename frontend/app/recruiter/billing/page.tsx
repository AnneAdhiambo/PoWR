"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recruiterApiClient } from "../../lib/recruiterApi";
import { PaymentFlow } from "../../components/subscription/PaymentFlow";
import {
  Check, Crown, Lightning, Buildings, CreditCard,
  ChartBar, ChatCircle, ArrowRight, Sparkle, X,
} from "phosphor-react";
import toast from "react-hot-toast";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    priceLabel: "$0",
    period: "/month",
    tagline: "Get started — no card needed",
    features: [
      { text: "10 profile views / month", included: true },
      { text: "Skill & score filtering", included: true },
      { text: "Browse verified developer profiles", included: true },
      { text: "Outreach messages", included: false },
      { text: "Saved talent pools", included: false },
      { text: "Analytics dashboard", included: false },
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49,
    priceLabel: "$49",
    period: "/month",
    tagline: "For active hiring teams",
    highlight: true,
    badge: "Most Popular",
    features: [
      { text: "Unlimited profile views", included: true },
      { text: "Advanced skill & score filtering", included: true },
      { text: "50 outreach messages / month", included: true },
      { text: "Saved talent pools", included: true },
      { text: "Analytics dashboard", included: true },
      { text: "Priority support", included: true },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    priceLabel: "$299",
    period: "/month",
    tagline: "For large-scale recruitment ops",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "Unlimited outreach messages", included: true },
      { text: "Team accounts (up to 10 seats)", included: true },
      { text: "ATS export (JSON / webhook)", included: true },
      { text: "API access", included: true },
      { text: "Dedicated account manager", included: true },
    ],
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [recruiter, setRecruiter] = useState<any>(null);
  const [viewsUsed, setViewsUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  // Payment flow state
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);
  const [currency, setCurrency] = useState<"stx" | "sbtc" | "usdcx">("usdcx");
  const [intentLoading, setIntentLoading] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    load();
  }, []);

  const load = async () => {
    try {
      const { recruiter: data } = await recruiterApiClient.getMe();
      setRecruiter(data);
      localStorage.setItem("recruiter_plan", data.plan || "free");
      setViewsUsed(parseInt(localStorage.getItem("recruiter_views_used") || "0", 10));
    } catch {
      toast.error("Failed to load billing info");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planId: string) => {
    if (planId === recruiter?.plan || planId === "free") return;
    setIntentLoading(true);
    try {
      const { paymentIntent: intent } = await recruiterApiClient.createBillingIntent(planId, currency);
      setPendingPlan(planId);
      setPaymentIntent(intent);
    } catch (err: any) {
      toast.error(err.message || "Failed to start payment");
    } finally {
      setIntentLoading(false);
    }
  };

  const handlePaymentVerified = async (txHash: string) => {
    if (!pendingPlan) return;
    try {
      const result = await recruiterApiClient.verifyBillingPayment(txHash, pendingPlan, currency);
      if (result.success) {
        toast.success(`Upgraded to ${pendingPlan} plan!`);
        setPaymentIntent(null);
        setPendingPlan(null);
        // Refresh recruiter data so plan badge updates
        await load();
      } else if (result.status === "pending") {
        toast("Transaction pending — please wait and try again.");
      } else {
        toast.error(result.message || "Payment verification failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to verify payment");
    }
  };

  const handleCancelPayment = () => {
    setPaymentIntent(null);
    setPendingPlan(null);
  };

  const currentPlan = recruiter?.plan || "free";
  const FREE_LIMIT = 10;
  const usedPct = currentPlan === "free" ? Math.min((viewsUsed / FREE_LIMIT) * 100, 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Payment modal overlay ──────────────────────────────────────
  if (paymentIntent) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-md relative">
          <button
            onClick={handleCancelPayment}
            className="absolute -top-10 right-0 p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" weight="bold" />
          </button>
          <PaymentFlow
            paymentIntent={paymentIntent}
            onPaymentVerified={handlePaymentVerified}
            onCancel={handleCancelPayment}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-mono uppercase tracking-[0.15em] text-[#FF5500] mb-2">Billing & Plans</p>
        <h1 className="text-3xl font-black text-white tracking-tight">Upgrade your access</h1>
        <p className="text-gray-500 mt-1.5">Scale your hiring with verified on-chain developer profiles.</p>
      </div>

      {/* Currency selector */}
      <div className="mb-8 flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium">Pay with:</span>
        {(["usdcx", "stx", "sbtc"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              currency === c
                ? "bg-[#FF5500]/15 border-[#FF5500]/40 text-[#FF5500]"
                : "border-[rgba(255,255,255,0.08)] text-gray-500 hover:text-gray-300 hover:border-[rgba(255,255,255,0.15)]"
            }`}
          >
            {c === "usdcx" ? "USDCx" : c === "sbtc" ? "sBTC" : "STX"}
          </button>
        ))}
      </div>

      {/* Current plan usage card — free */}
      {currentPlan === "free" && (
        <div className="mb-8 p-5 rounded-2xl bg-[rgba(255,85,0,0.06)] border border-[#FF5500]/20">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-white">Free Plan Usage</p>
              <p className="text-xs text-gray-500 mt-0.5">Resets at the start of each month</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(255,85,0,0.15)] text-[#FF5500] border border-[#FF5500]/25">
              Free
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
            <span>Profile views</span>
            <span className={viewsUsed >= FREE_LIMIT ? "text-red-400 font-medium" : "text-white"}>
              {viewsUsed} / {FREE_LIMIT}
            </span>
          </div>
          <div className="h-1.5 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usedPct >= 100 ? "bg-red-500" : usedPct >= 70 ? "bg-amber-400" : "bg-[#FF5500]"}`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          {viewsUsed >= FREE_LIMIT && (
            <p className="text-xs text-red-400 mt-2">
              You've reached your monthly view limit. Upgrade to Pro for unlimited access.
            </p>
          )}
        </div>
      )}

      {/* Active plan cards */}
      {currentPlan === "pro" && (
        <div className="mb-8 p-5 rounded-2xl bg-[rgba(255,85,0,0.06)] border border-[#FF5500]/20 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,85,0,0.15)] flex items-center justify-center flex-shrink-0">
            <Lightning className="w-5 h-5 text-[#FF5500]" weight="fill" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Pro Plan — Active</p>
            <p className="text-xs text-gray-500">Unlimited profile views · 50 outreach messages / month</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            Active
          </span>
        </div>
      )}
      {currentPlan === "enterprise" && (
        <div className="mb-8 p-5 rounded-2xl bg-[rgba(255,85,0,0.06)] border border-[#FF5500]/20 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,85,0,0.15)] flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-[#FF5500]" weight="fill" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Enterprise Plan — Active</p>
            <p className="text-xs text-gray-500">Unlimited everything · API access · Team seats</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            Active
          </span>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const isUpgrade = plan.price > (PLANS.find(p => p.id === currentPlan)?.price ?? 0);

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl p-6 transition-all ${
                isCurrent
                  ? "bg-[rgba(255,85,0,0.06)] border-2 border-[#FF5500]/40"
                  : plan.highlight
                  ? "bg-[rgba(255,255,255,0.03)] border border-[#FF5500]/30"
                  : "bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]"
              }`}
            >
              {plan.badge && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold bg-[#FF5500] text-white uppercase tracking-wide shadow-lg shadow-[#FF5500]/30">
                  {plan.badge}
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-bold bg-[rgba(255,85,0,0.2)] text-[#FF5500] border border-[#FF5500]/40 uppercase tracking-wide">
                  Current Plan
                </span>
              )}

              <div className="mb-5">
                <h3 className="text-base font-bold text-white mb-0.5">{plan.name}</h3>
                <p className="text-xs text-gray-500">{plan.tagline}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-black text-white">{plan.priceLabel}</span>
                <span className="text-sm text-gray-500">{plan.period}</span>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f.text} className={`flex items-start gap-2.5 text-sm ${f.included ? "text-gray-300" : "text-gray-600"}`}>
                    <Check
                      className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${f.included ? "text-[#FF5500]" : "text-gray-700"}`}
                      weight="bold"
                    />
                    <span className={f.included ? "" : "line-through"}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={isCurrent || plan.id === "free" || intentLoading}
                onClick={() => handleUpgrade(plan.id)}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  isCurrent || plan.id === "free"
                    ? "bg-[rgba(255,255,255,0.05)] text-gray-500 cursor-not-allowed"
                    : plan.highlight
                    ? "bg-[#FF5500] hover:bg-[#e04d00] text-white shadow-lg shadow-[#FF5500]/20 hover:shadow-[#FF5500]/40"
                    : isUpgrade
                    ? "border border-[#FF5500]/40 text-[#FF5500] hover:bg-[rgba(255,85,0,0.08)]"
                    : "bg-[rgba(255,255,255,0.05)] text-gray-400 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                }`}
              >
                {intentLoading && pendingPlan === plan.id ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : isCurrent ? (
                  "Current Plan"
                ) : plan.id === "free" ? (
                  "Downgrade"
                ) : isUpgrade ? (
                  <>Upgrade to {plan.name} <ArrowRight className="w-3.5 h-3.5" weight="bold" /></>
                ) : (
                  `Switch to ${plan.name}`
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* What you unlock section */}
      {currentPlan === "free" && (
        <div className="rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Sparkle className="w-4 h-4 text-[#FF5500]" weight="fill" />
            <h2 className="text-sm font-semibold text-white">What you unlock with Pro</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Buildings, title: "Unlimited views", desc: "Browse every verified developer without monthly caps." },
              { icon: ChatCircle, title: "Direct outreach", desc: "Send up to 50 contact requests per month to top talent." },
              { icon: ChartBar, title: "Analytics", desc: "Track your search activity, shortlists, and response rates." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[rgba(255,85,0,0.1)] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-[#FF5500]" weight="fill" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600 text-center mt-6">
        Payments processed on-chain via Stacks · STX · sBTC · USDCx
      </p>
    </div>
  );
}
