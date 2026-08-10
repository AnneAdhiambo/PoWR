"use client";

import { FormEvent, useState } from "react";
import { Button, Field, controlClassName } from "../ui";
import { referralApi } from "../../lib/referralApi";

export function ReferDeveloperDialog({ defaultJobId = "" }: { defaultJobId?: string }) {
  const [jobId, setJobId] = useState(defaultJobId);
  const [candidate, setCandidate] = useState("");
  const [relationship, setRelationship] = useState("");
  const [evidence, setEvidence] = useState("");
  const [consentUrl, setConsentUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await referralApi.create({
        jobId: Number(jobId),
        candidateUsername: candidate,
        relationship,
        evidenceNote: evidence,
      });
      setConsentUrl(`${window.location.origin}${result.consentUrl}`);
    } finally {
      setBusy(false);
    }
  }

  if (consentUrl) {
    return (
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
        <p className="font-medium text-emerald-300">Private invitation created</p>
        <p className="mt-2 break-all text-sm text-gray-300">{consentUrl}</p>
        <p className="mt-2 text-xs text-gray-500">Only the candidate should receive this expiring link.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Job ID" description="Referrals are always tied to a specific open role.">
        <input className={controlClassName} required inputMode="numeric" value={jobId} onChange={(event) => setJobId(event.target.value)} />
      </Field>
      <Field label="Developer username">
        <input className={controlClassName} required value={candidate} onChange={(event) => setCandidate(event.target.value)} />
      </Field>
      <Field label="How you know their work">
        <input className={controlClassName} maxLength={160} value={relationship} onChange={(event) => setRelationship(event.target.value)} />
      </Field>
      <Field label="Evidence for this recommendation" description="Describe work you observed directly.">
        <textarea className={`${controlClassName} min-h-28 resize-y`} maxLength={2000} value={evidence} onChange={(event) => setEvidence(event.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>{busy ? "Creating invitation…" : "Create private invitation"}</Button>
    </form>
  );
}
