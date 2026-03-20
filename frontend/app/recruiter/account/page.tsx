"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { recruiterApiClient } from "../../lib/recruiterApi";
import { Crown, Check, Buildings, EnvelopeSimple, CreditCard, Lightning, ArrowRight } from "phosphor-react";
import toast from "react-hot-toast";


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
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
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
                  <span className="px-2 py-0.5 rounded-full text-xs bg-[rgba(255,85,0,0.15)] text-[#FF5500] border border-[#FF5500]/30 capitalize">
                    Active
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Billing card */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-4">Billing</p>
          <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[rgba(255,85,0,0.12)] flex items-center justify-center">
                  {recruiter?.plan === "free"
                    ? <CreditCard className="w-4.5 h-4.5 text-[#FF5500]" weight="fill" />
                    : <Lightning className="w-4.5 h-4.5 text-[#FF5500]" weight="fill" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white capitalize">{recruiter?.plan || "free"} Plan</p>
                  <p className="text-xs text-gray-500">
                    {recruiter?.plan === "free"
                      ? "10 profile views / month · No outreach"
                      : recruiter?.plan === "pro"
                      ? "Unlimited views · 50 outreach / month"
                      : "Unlimited everything · Team seats · API access"}
                  </p>
                </div>
              </div>
              {recruiter?.plan !== "free" && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Active
                </span>
              )}
            </div>

            {recruiter?.plan === "free" && (
              <div className="mb-4 p-3 rounded-lg bg-[rgba(255,85,0,0.06)] border border-[#FF5500]/15">
                <p className="text-xs text-gray-300 mb-2.5">Unlock unlimited access with Pro</p>
                <ul className="space-y-1.5 mb-0">
                  {["Unlimited profile views", "50 outreach messages / month", "Saved talent pools"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                      <Check className="w-3 h-3 text-[#FF5500] flex-shrink-0" weight="bold" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Link
              href="/recruiter/billing"
              className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                recruiter?.plan === "free"
                  ? "bg-[#FF5500] hover:bg-[#e04d00] text-white"
                  : "bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-gray-300 hover:text-white"
              }`}
            >
              {recruiter?.plan === "free" ? (
                <>Upgrade to Pro <ArrowRight className="w-3.5 h-3.5" weight="bold" /></>
              ) : (
                <>Manage Billing <ArrowRight className="w-3.5 h-3.5" weight="bold" /></>
              )}
            </Link>
          </div>
        </div>
    </div>
  );
}
