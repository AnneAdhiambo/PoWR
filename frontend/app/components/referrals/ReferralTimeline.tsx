import { Referral } from "../../lib/referralApi";

const labels: Record<string, string> = {
  pending_consent: "Waiting for candidate consent",
  accepted: "Candidate accepted",
  declined: "Candidate declined",
  expired: "Invitation expired",
  withdrawn: "Referral withdrawn",
  closed: "Referral closed",
};

export function ReferralTimeline({ referral }: { referral: Referral }) {
  return (
    <div className="flex items-start gap-3">
      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${referral.status === "accepted" ? "bg-emerald-400" : "bg-amber-400"}`} />
      <div>
        <p className="text-sm font-medium text-white">{labels[referral.status] || referral.status}</p>
        <p className="mt-1 text-xs text-gray-500">{referral.title} · {referral.company}</p>
      </div>
    </div>
  );
}
