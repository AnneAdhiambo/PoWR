"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Wrench, Plus } from "phosphor-react";

export default function RecruiterGigsPage() {
  const router = useRouter();
  useEffect(() => { if (!localStorage.getItem("recruiter_token")) router.replace("/recruiter/auth"); }, []);
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Gigs</h1>
          <p className="text-sm text-gray-500 mt-1">Post short-term contracts and freelance work</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" weight="bold" />
          Post a Gig
        </button>
      </div>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <Wrench className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
        <p className="text-gray-400 font-medium">No gigs posted yet</p>
        <p className="text-sm text-gray-600 mt-1">Post contract work or freelance gigs for verified developers.</p>
      </div>
    </div>
  );
}
