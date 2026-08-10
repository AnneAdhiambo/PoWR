import { Card } from "../ui";

export function ReferralReliabilityCard({
  summary,
}: {
  summary?: { score: number | null; evidenceCount: number; minimumEvidence: number; visible: boolean };
}) {
  if (!summary?.visible) {
    return (
      <Card className="p-4">
        <p className="text-sm font-semibold text-white">Referral reliability</p>
        <p className="mt-2 text-sm text-gray-400">
          Private until {summary?.minimumEvidence || 3} verified outcomes. This never changes the developer&apos;s technical PoWR Score.
        </p>
        <p className="mt-3 text-xs text-gray-500">{summary?.evidenceCount || 0} verified outcomes recorded</p>
      </Card>
    );
  }
  return (
    <Card className="p-4">
      <p className="text-sm font-semibold text-white">Referral reliability</p>
      <div className="mt-3 flex items-end gap-2">
        <strong className="text-3xl text-[#FF5500]">{summary.score}</strong>
        <span className="pb-1 text-sm text-gray-500">/ 100</span>
      </div>
      <p className="mt-2 text-xs text-gray-500">Based on {summary.evidenceCount} verified hiring outcomes</p>
    </Card>
  );
}
