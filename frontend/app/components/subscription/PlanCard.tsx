"use client";

import React from "react";
import { Card } from "../ui";
import { Check } from "phosphor-react";
import {
  BillingPeriod,
  calcStxTotal,
  calcStxPerMonth,
} from "./BillingPeriodSelector";

export interface Plan {
  type: "free" | "basic" | "pro";
  name: string;
  price: number;
  priceInCrypto: {
    stx: string;
  };
  updateFrequency: string;
  features: string[];
}

interface PlanCardProps {
  plan: Plan;
  currentPlan?: string;
  onSelect: (planType: string) => void;
  loading?: boolean;
  billingPeriod?: BillingPeriod;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  currentPlan,
  onSelect,
  loading = false,
  billingPeriod = 1,
}) => {
  const isCurrentPlan = currentPlan === plan.type;
  const isFree = plan.type === "free";
  const monthlyStx = parseInt(plan.priceInCrypto?.stx ?? "0", 10);

  const totalStx = isFree ? 0 : calcStxTotal(monthlyStx, billingPeriod);
  const perMonthStx = isFree ? 0 : calcStxPerMonth(monthlyStx, billingPeriod);
  const savedStx = isFree ? 0 : monthlyStx * billingPeriod - totalStx;

  return (
    <Card
      className={`p-6 rounded-[16px] relative flex flex-col ${
        isCurrentPlan
          ? "border-2 border-[#FF5500]/60 bg-[rgba(255,85,0,0.06)]"
          : "border border-[rgba(255,255,255,0.04)]"
      } ${plan.type === "pro" ? "ring-1 ring-[#FF5500]/15" : ""}`}
    >
      {isCurrentPlan && (
        <div className="absolute top-4 right-4">
          <span className="text-xs px-2 py-1 rounded-full bg-[rgba(255,85,0,0.15)] text-[#FF5500] font-medium">
            Current
          </span>
        </div>
      )}

      {/* Price */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>

        {isFree ? (
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-white">Free</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-white">{perMonthStx}</span>
              <span className="text-sm text-gray-400">STX / mo</span>
            </div>

            {billingPeriod > 1 ? (
              <div className="mt-1.5 flex flex-col gap-0.5">
                <p className="text-xs text-gray-400">
                  Billed{" "}
                  <span className="text-white font-medium">{totalStx} STX</span>{" "}
                  every {billingPeriod} months
                </p>
                <p className="text-xs text-[#FF5500] font-medium">
                  You save {savedStx} STX
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-500 mt-1">≈ ${plan.price} USD / month</p>
            )}
          </>
        )}
      </div>

      {/* Update frequency */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-1">Update Frequency</p>
        <p className="text-sm text-white font-medium">{plan.updateFrequency}</p>
      </div>

      {/* Features */}
      <div className="mb-6 flex-1">
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check
                className="w-4 h-4 text-[#FF5500] mt-0.5 flex-shrink-0"
                weight="bold"
              />
              <span className="text-sm text-gray-300">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* CTA */}
      <button
        onClick={() => onSelect(plan.type)}
        disabled={isCurrentPlan || loading}
        className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-colors ${
          isCurrentPlan
            ? "bg-[rgba(255,255,255,0.05)] text-gray-400 cursor-not-allowed"
            : isFree
            ? "bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-white"
            : "bg-[#FF5500] hover:bg-[#e04d00] text-white"
        }`}
      >
        {loading
          ? "Processing..."
          : isCurrentPlan
          ? "Current Plan"
          : isFree
          ? "Select Free"
          : `Upgrade to ${plan.name}`}
      </button>
    </Card>
  );
};
