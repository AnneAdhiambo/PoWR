"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ReferralReliabilityCard } from "../../components/referrals/ReferralReliabilityCard";
import { Button, Card, EmptyState, LoadingState, PageHeader, RecruiterPage, StatusBadge } from "../../components/ui";
import { Referral, referralApi } from "../../lib/referralApi";

export default function RecruiterReferralsPage() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    referralApi.recruiterList().then((data) => setReferrals(data.referrals)).catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, []);
  async function record(referral: Referral, outcome: string) {
    try {
      await referralApi.recordOutcome(referral.id, outcome);
      toast.success("Outcome recorded");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Unable to record outcome");
    }
  }
  return (
    <RecruiterPage className="max-w-6xl">
      <PageHeader eyebrow="Evidence-aware sourcing" title="Referrals" description="Review candidate-approved referrals and record verified outcomes separately from technical PoWR Scores." />
      {loading ? <LoadingState label="Loading referrals" /> : referrals.length === 0 ? (
        <EmptyState title="No accepted referrals" description="Referrals appear only after the candidate gives explicit consent." />
      ) : (
        <div className="space-y-5">
          {referrals.map((referral) => (
            <Card key={referral.id} className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-semibold text-white">{referral.candidate_username}</h2>
                  <StatusBadge tone="success">Candidate approved</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-gray-400">{referral.title} · referred by {referral.referrer_username}</p>
                {referral.relationship && <p className="mt-4 text-sm text-gray-300">{referral.relationship}</p>}
                {referral.evidence_note && <p className="mt-2 text-sm leading-6 text-gray-400">{referral.evidence_note}</p>}
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => record(referral, "interviewed")}>Interviewed</Button>
                  <Button size="sm" variant="outline" onClick={() => record(referral, "hired")}>Hired</Button>
                  <Button size="sm" variant="outline" onClick={() => record(referral, "retained_90_days")}>90-day retention</Button>
                  <Button size="sm" variant="outline" onClick={() => record(referral, "strong_performance")}>Strong performance</Button>
                </div>
              </div>
              <ReferralReliabilityCard summary={referral.reliability} />
            </Card>
          ))}
        </div>
      )}
    </RecruiterPage>
  );
}
