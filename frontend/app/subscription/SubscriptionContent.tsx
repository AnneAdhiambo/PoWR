"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { PlanCard, Plan } from "../components/subscription/PlanCard";
import {
  BillingPeriodSelector,
  BillingPeriod,
  calcStxTotal,
} from "../components/subscription/BillingPeriodSelector";
import { ConnectWalletButton } from "../components/subscription/ConnectWalletButton";
import { PaymentFlow } from "../components/subscription/PaymentFlow";
import { apiClient } from "../lib/api";
import { X } from "phosphor-react";
import toast from "react-hot-toast";


const defaultPlans: Plan[] = [
  {
    type: "free",
    name: "Free",
    price: 0,
    priceInCrypto: { stx: "0" },
    updateFrequency: "Twice monthly (1st & 15th)",
    features: [
      "Basic PoW profile",
      "Up to 10 on-chain proofs/day",
      "Public profile page",
    ],
  },
  {
    type: "basic",
    name: "Basic",
    price: 6,
    priceInCrypto: { stx: "20" },
    updateFrequency: "Weekly (every Monday)",
    features: [
      "All free features",
      "Unlimited on-chain proofs",
      "Weekly profile updates",
      "Priority support",
    ],
  },
  {
    type: "pro",
    name: "Pro",
    price: 15,
    priceInCrypto: { stx: "50" },
    updateFrequency: "Real-time (GitHub webhooks)",
    features: [
      "All basic features",
      "Real-time updates on commits/PRs",
      "Advanced analytics",
      "API access",
    ],
  },
];

export default function SubscriptionContent() {
  const router = useRouter();
  // Read wallet address from localStorage — ConnectWalletButton writes it there.
  // Direct import of useStacksWallet/@stacks/connect is avoided to prevent
  // Turbopack chunk evaluation errors in production.
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem("stacks_wallet_address");
    if (stored) setWalletAddress(stored);
  }, []);
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentIntent, setPaymentIntent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(1);

  useEffect(() => {
    const storedUsername = localStorage.getItem("github_username");
    const storedEmail = localStorage.getItem("github_email");
    if (!storedUsername) { router.push("/auth"); return; }
    setUsername(storedUsername);
    setDisplayName(storedUsername);
    if (storedEmail) setUserEmail(storedEmail);
    loadSubscriptionData(storedUsername);
  }, [router]);

  const loadSubscriptionData = async (user: string) => {
    try {
      setLoading(true);
      const [plansData, subscriptionData] = await Promise.all([
        apiClient.getSubscriptionPlans().catch(() => ({ plans: defaultPlans })),
        apiClient.getCurrentSubscription(user).catch(() => ({ subscription: null, plan: null })),
      ]);
      if (plansData.plans?.length > 0) setPlans(plansData.plans);
      setCurrentSubscription(subscriptionData.subscription);
      setCurrentPlan(subscriptionData.subscription?.planType || "free");
    } catch {
      setPlans(defaultPlans);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planType: string) => {
    if (planType === "free") {
      try {
        toast.loading("Downgrading to free plan...", { id: "downgrade" });
        await apiClient.upgradeSubscription(username, "free").catch(() => {
          setCurrentPlan("free");
          setCurrentSubscription({ planType: "free", status: "active" });
        });
        toast.success("Downgraded to free plan", { id: "downgrade" });
      } catch (error: any) {
        toast.error(`Failed to downgrade: ${error.message}`, { id: "downgrade" });
      }
      return;
    }

    const planData = plans.find((p) => p.type === planType);
    const monthlyStx = parseInt(planData?.priceInCrypto?.stx ?? "0", 10);
    const totalStx = calcStxTotal(monthlyStx, billingPeriod).toString();

    try {
      toast.loading("Preparing payment...", { id: "payment-intent" });
      const result = await apiClient.createPaymentIntent(
        username, planType, "stx", billingPeriod
      );
      setPaymentIntent(result.paymentIntent);
      setSelectedPlan(planType);
      toast.dismiss("payment-intent");
    } catch {
      toast.dismiss("payment-intent");
      const paymentAddress = process.env.NEXT_PUBLIC_PAYMENT_WALLET_ADDRESS;
      if (!paymentAddress || !planData) {
        toast.error("Payment not available — PAYMENT_WALLET_ADDRESS not configured.");
        return;
      }
      setPaymentIntent({
        address: paymentAddress,
        amount: totalStx,
        currency: "stx" as const,
        planType,
        billingPeriod,
        network: process.env.NEXT_PUBLIC_STACKS_NETWORK || "testnet",
      });
      setSelectedPlan(planType);
    }
  };

  const handlePaymentVerified = async (txHash: string) => {
    try {
      toast.loading("Upgrading subscription...", { id: "upgrade" });
      await apiClient.upgradeSubscription(username, selectedPlan!, txHash);
      await loadSubscriptionData(username);
      setPaymentIntent(null);
      setSelectedPlan(null);
      toast.success("Subscription upgraded successfully!", { id: "upgrade" });
    } catch (error: any) {
      toast.error(`Failed to upgrade: ${error.message}`, { id: "upgrade" });
    }
  };

  const handleCancelPayment = () => {
    setPaymentIntent(null);
    setSelectedPlan(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c0f] flex">
        <Sidebar username={username} email={userEmail || undefined} displayName={displayName} />
        <div className="flex-1 ml-60 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c0f] flex">
      <Sidebar username={username} email={userEmail || undefined} displayName={displayName} />
      <div className="flex-1 ml-60 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Billing</h1>
              <p className="text-gray-400">
                Pay with STX. Lock in a longer period for a bigger discount.
              </p>
            </div>
            <ConnectWalletButton />
          </div>

          {paymentIntent ? (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Complete Payment</h2>
                <button
                  onClick={handleCancelPayment}
                  className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" weight="bold" />
                </button>
              </div>
              <PaymentFlow
                paymentIntent={paymentIntent}
                onPaymentVerified={handlePaymentVerified}
                onCancel={handleCancelPayment}
                walletAddress={walletAddress ?? undefined}
              />
            </div>
          ) : (
            <>
              {/* Current subscription banner */}
              {currentSubscription && currentPlan !== "free" && (
                <div className="mb-6 p-4 rounded-xl bg-[rgba(255,85,0,0.06)] border border-[rgba(255,85,0,0.2)] flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-400">Current Plan</p>
                    <p className="text-base font-semibold text-white capitalize">
                      {currentSubscription.planType}
                    </p>
                    {currentSubscription.nextUpdateDate && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Next update: {new Date(currentSubscription.nextUpdateDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {currentSubscription.status === "active" && (
                    <span className="px-3 py-1 rounded-full bg-[rgba(255,85,0,0.15)] text-[#FF5500] text-xs font-medium">
                      Active
                    </span>
                  )}
                </div>
              )}

              {/* Billing period selector */}
              <div className="mb-8 flex flex-col gap-2">
                <p className="text-sm text-gray-400">Billing period</p>
                <BillingPeriodSelector value={billingPeriod} onChange={setBillingPeriod} />
                {billingPeriod > 1 && (
                  <p className="text-xs text-[#FF5500] mt-1">
                    Paying {billingPeriod} months upfront — prices below reflect your discount.
                  </p>
                )}
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <PlanCard
                    key={plan.type}
                    plan={plan}
                    currentPlan={currentPlan}
                    onSelect={handleSelectPlan}
                    billingPeriod={billingPeriod}
                  />
                ))}
              </div>

              {/* Savings callout for multi-month */}
              {billingPeriod > 1 && (
                <p className="text-center text-xs text-gray-600 mt-6">
                  Prices are charged as a single STX transaction. No recurring charges.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
