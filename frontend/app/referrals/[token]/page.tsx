"use client";

import { use, useEffect, useState } from "react";
import { ReferralConsentPanel } from "../../components/referrals/ReferralConsentPanel";
import { ErrorState, LoadingState } from "../../components/ui";
import { Referral, referralApi } from "../../lib/referralApi";

export default function ReferralConsentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [referral, setReferral] = useState<Referral | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    referralApi.preview(token).then((data) => setReferral(data.referral)).catch((reason) => setError(reason.message));
  }, [token]);
  async function decide(decision: "accept" | "decline") {
    setBusy(true);
    try {
      const result = await referralApi.decide(token, decision);
      setReferral((current) => current ? { ...current, status: result.referral.status } : current);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to update this invitation");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="min-h-screen bg-[#08090b] px-5 py-16">
      {error ? <div className="mx-auto max-w-xl"><ErrorState title="Invitation unavailable" description={error} /></div>
        : !referral ? <LoadingState label="Loading private invitation" />
          : <ReferralConsentPanel referral={referral} busy={busy} onDecision={decide} />}
    </main>
  );
}
