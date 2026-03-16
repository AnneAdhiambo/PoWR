"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus } from "phosphor-react";

export default function RecruiterJobsPage() {
  const router = useRouter();
  useEffect(() => { if (!localStorage.getItem("recruiter_token")) router.replace("/recruiter/auth"); }, []);
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">Post and manage job listings</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#3b76ef] hover:bg-[#3265cc] text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" weight="bold" />
          Post a Job
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Briefcase className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
        <p className="text-gray-400 font-medium">No jobs posted yet</p>
        <p className="text-sm text-gray-600 mt-1">Post your first job listing to start attracting verified talent.</p>
        <button className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#3b76ef] hover:bg-[#3265cc] text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" weight="bold" />
          Post a Job
        </button>
      </div>
    </div>
  );
}
