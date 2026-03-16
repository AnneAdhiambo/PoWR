"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChartBar } from "phosphor-react";

export default function RecruiterAnalyticsPage() {
  const router = useRouter();
  useEffect(() => { if (!localStorage.getItem("recruiter_token")) router.replace("/recruiter/auth"); }, []);
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Hiring pipeline insights and metrics</p>
      </div>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ChartBar className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
        <p className="text-gray-400 font-medium">Analytics coming soon</p>
        <p className="text-sm text-gray-600 mt-1">View profile view stats, outreach rates, and hiring funnel metrics here.</p>
      </div>
    </div>
  );
}
