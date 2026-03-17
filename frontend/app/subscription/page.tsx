"use client";

import dynamic from "next/dynamic";

// @stacks/connect accesses browser globals at module evaluation time.
// Excluding the entire subtree from SSR with ssr: false is the safest fix.
const SubscriptionContent = dynamic(() => import("./SubscriptionContent"), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-[#0b0c0f]" />,
});

export default function SubscriptionPage() {
  return <SubscriptionContent />;
}
