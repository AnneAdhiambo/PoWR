"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChatCircle } from "phosphor-react";

export default function RecruiterChatPage() {
  const router = useRouter();
  useEffect(() => { if (!localStorage.getItem("recruiter_token")) router.replace("/recruiter/auth"); }, []);
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Messages</h1>
        <p className="text-sm text-gray-500 mt-1">Chat with developers you've connected with</p>
      </div>
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ChatCircle className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
        <p className="text-gray-400 font-medium">No messages yet</p>
        <p className="text-sm text-gray-600 mt-1">Messages from developers will appear here after they accept your contact requests.</p>
      </div>
    </div>
  );
}
