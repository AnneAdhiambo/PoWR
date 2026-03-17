"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { recruiterApiClient } from "../../lib/recruiterApi";
import { Crown, Check, ArrowSquareOut, Buildings, EnvelopeSimple } from "phosphor-react";
import toast from "react-hot-toast";

const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "$49",
    period: "/month",
    features: [
      "50 profile views / month",
      "10 outreach messages / month",
      "Saved talent pools",
      "Blockchain-verified profiles",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "$99",
    period: "/month",
    features: [
      "Unlimited profile views",
      "100 outreach messages / month",
      "Advanced skill filtering",
      "Export profiles (PDF)",
      "Priority support",
    ],
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$299",
    period: "/month",
    features: [
      "Everything in Growth",
      "Team accounts (up to 10 seats)",
      "ATS export (JSON / webhook)",
      "API access",
      "Dedicated account manager",
    ],
  },
];

export default function RecruiterAccountPage() {
  const router = useRouter();
  const [recruiter, setRecruiter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    loadRecruiter();
  }, []);

  const loadRecruiter = async () => {
    setLoading(true);
    try {
      const { recruiter: data } = await recruiterApiClient.getMe();
      setRecruiter(data);
      localStorage.setItem("recruiter_plan", data.plan || "free");
    } catch (error: any) {
      toast.error("Failed to load account");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#3b76ef] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Account</h1>

        {/* Profile card */}
        {recruiter && (
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-5 mb-8">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Profile</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <EnvelopeSimple className="w-4 h-4 text-gray-500" weight="regular" />
                <span className="text-sm text-white">{recruiter.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Buildings className="w-4 h-4 text-gray-500" weight="regular" />
                <span className="text-sm text-white">{recruiter.companyName}</span>
                {recruiter.companySize && (
                  <span className="text-xs text-gray-500">({recruiter.companySize})</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Crown className="w-4 h-4 text-gray-500" weight="regular" />
                <span className="text-sm capitalize text-white">{recruiter.plan} plan</span>
                {recruiter.plan !== "free" && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[rgba(59,118,239,0.15)] text-[#3b76ef] border border-[#3b76ef]/30 capitalize">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing / plans */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Plans</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = recruiter?.plan === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-xl p-5 flex flex-col ${
                    isCurrent
                      ? "bg-[rgba(59,118,239,0.08)] border-2 border-[#3b76ef]/40"
                      : plan.highlight
                      ? "bg-[rgba(255,255,255,0.03)] border border-[rgba(59,118,239,0.2)]"
                      : "bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]"
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-[rgba(59,118,239,0.2)] text-[#3b76ef] font-semibold">
                      Current
                    </span>
                  )}
                  <h3 className="text-base font-semibold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-2xl font-bold text-white">{plan.price}</span>
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 flex-1 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-300">
                        <Check className="w-3.5 h-3.5 text-[#3b76ef] mt-0.5 flex-shrink-0" weight="bold" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCurrent}
                    onClick={() => toast("Stripe checkout coming soon")}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      isCurrent
                        ? "bg-[rgba(255,255,255,0.05)] text-gray-500 cursor-not-allowed"
                        : plan.highlight
                        ? "bg-[#3b76ef] hover:bg-[#3265cc] text-white"
                        : "border border-[#3b76ef]/30 text-[#3b76ef] hover:bg-[rgba(59,118,239,0.08)]"
                    }`}
                  >
                    {isCurrent ? "Current Plan" : `Get ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
}
