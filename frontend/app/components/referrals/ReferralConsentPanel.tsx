"use client";

import { Button, Card } from "../ui";
import { Referral } from "../../lib/referralApi";

export function ReferralConsentPanel({
  referral,
  busy,
  onDecision,
}: {
  referral: Referral;
  busy: boolean;
  onDecision: (decision: "accept" | "decline") => void;
}) {
  const pending = referral.status === "pending_consent";
  return (
    <Card className="mx-auto max-w-xl p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FF5500]">Private referral invitation</p>
      <h1 className="mt-3 text-2xl font-semibold text-white">{referral.title}</h1>
      <p className="mt-1 text-sm text-gray-400">{referral.company}</p>
      <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.025] p-4">
        <p className="text-sm text-gray-300"><strong className="text-white">{referral.referrer_username}</strong> wants to recommend you for this role.</p>
        {referral.relationship && <p className="mt-3 text-sm text-gray-400">Relationship: {referral.relationship}</p>}
        {referral.evidence_note && <p className="mt-3 text-sm text-gray-400">{referral.evidence_note}</p>}
      </div>
      <p className="mt-5 text-sm leading-6 text-gray-400">
        PoWR will not show this referral to the employer unless you accept. Declining never affects either person&apos;s score or reputation.
      </p>
      {pending ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={busy} onClick={() => onDecision("accept")}>Accept referral</Button>
          <Button variant="outline" disabled={busy} onClick={() => onDecision("decline")}>Decline privately</Button>
        </div>
      ) : (
        <p className="mt-6 rounded-lg bg-white/[0.04] px-4 py-3 text-sm text-gray-300">This invitation is {referral.status}.</p>
      )}
    </Card>
  );
}
