"use client";

import React, { useEffect, useState } from "react";
import { X, Sparkle, Lightning, Shield, ArrowRight } from "phosphor-react";
import { PlanCard, Plan } from "./PlanCard";
import { apiClient } from "../../lib/api";

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  username?: string;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  username,
}) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && username) {
      loadPlans();
    }
  }, [isOpen, username]);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const [plansData, subscriptionData] = await Promise.all([
        apiClient.getSubscriptionPlans(),
        apiClient.getCurrentSubscription(username!),
      ]);

      setPlans(plansData.plans);
      setCurrentPlan(subscriptionData.subscription?.planType || "free");
    } catch (error) {
      console.error("Failed to load plans:", error);
      // Fallback to mock data
      setPlans([
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
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planType: string) => {
    onClose();
    window.location.href = `/subscription?plan=${planType}`;
  };

  if (!isOpen) return null;

  const benefits = [
    {
      icon: Lightning,
      title: "Real-time Updates",
      description: "Your profile updates instantly as you push code, merge PRs, and contribute to open source.",
    },
    {
      icon: Shield,
      title: "Onchain Verification",
      description: "All your proof of work is anchored on Base blockchain for permanent, verifiable records.",
    },
    {
      icon: Sparkle,
      title: "Better Opportunities",
      description: "Stand out to recruiters and clients with a verified, up-to-date proof of work profile.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl bg-[#0b0c0f] rounded-[20px] border border-[rgba(255,255,255,0.08)] shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 p-6 border-b border-[rgba(255,255,255,0.04)] bg-[#0b0c0f]/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white mb-2" style={{ fontWeight: 600 }}>
                Upgrade Your Plan
              </h2>
              <p className="text-sm text-gray-400" style={{ opacity: 0.7 }}>
                Unlock more frequent updates and advanced features to showcase your proof of work
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" weight="bold" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Why Upgrade Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {benefits.map((benefit, idx) => {
              const Icon = benefit.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-[16px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF5500] to-[#4d85f0] flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-white" weight="fill" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-xs text-gray-400" style={{ opacity: 0.7 }}>
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Current Plan Indicator */}
          {currentPlan && (
            <div className="p-4 rounded-[14px] bg-[rgba(255,85,0,0.1)] border border-[rgba(255,85,0,0.2)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Current Plan</p>
                  <p className="text-base font-semibold text-white capitalize">
                    {currentPlan === "free" ? "Free Plan" : currentPlan === "basic" ? "Basic Plan" : "Pro Plan"}
                  </p>
                </div>
                {currentPlan !== "pro" && (
                  <div className="flex items-center gap-2 text-xs text-[#FF5500]">
                    <span>Upgrade to unlock more</span>
                    <ArrowRight className="w-4 h-4" weight="regular" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Plans Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.type} className="relative">
                  {plan.type === "pro" && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-medium">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <PlanCard
                    plan={plan}
                    currentPlan={currentPlan}
                    onSelect={handleSelectPlan}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

