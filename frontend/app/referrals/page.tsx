"use client";

import { useEffect, useState } from "react";
import { Card, EmptyState, LoadingState } from "../components/ui";
import { ReferDeveloperDialog } from "../components/referrals/ReferDeveloperDialog";
import { ReferralTimeline } from "../components/referrals/ReferralTimeline";
import { Referral, referralApi } from "../lib/referralApi";

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    referralApi.mine().then((data) => setReferrals(data.referrals)).finally(() => setLoading(false));
  }, []);
  return (
    <main className="min-h-screen bg-[#08090b] px-5 py-12 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF5500]">Referral reputation</p>
          <h1 className="mt-3 text-3xl font-semibold">Recommend work you know</h1>
          <p className="mt-3 max-w-2xl text-gray-400">Help a developer discover a relevant role. Their consent comes first, and hiring outcomes never alter technical PoWR Scores.</p>
          <Card className="mt-8 p-5">
            <h2 className="font-semibold">Your referrals</h2>
            <div className="mt-5 space-y-5">
              {loading ? <LoadingState label="Loading referrals" /> : referrals.length
                ? referrals.map((referral) => <ReferralTimeline key={referral.id} referral={referral} />)
                : <EmptyState title="No referrals yet" description="A private referral invitation will appear here." />}
            </div>
          </Card>
        </section>
        <Card className="h-fit p-5"><h2 className="mb-5 font-semibold">Refer a developer</h2><ReferDeveloperDialog /></Card>
      </div>
    </main>
  );
}
