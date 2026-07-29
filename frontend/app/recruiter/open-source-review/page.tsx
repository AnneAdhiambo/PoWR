"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, Check, GitPullRequest, X } from "phosphor-react";
import toast from "react-hot-toast";
import { openSourceApi } from "../../lib/openSourceApi";

export default function OpenSourceReviewPage() {
  const [claims, setClaims] = useState<any[]>([]);
  const [reason, setReason] = useState<Record<string, string>>({});

  const load = () => openSourceApi.reviewQueue().then((result) => setClaims(result.claims)).catch((error) => toast.error(error.message));
  useEffect(() => { void load(); }, []);

  const review = async (id: string, decision: string) => {
    const explanation = reason[id]?.trim();
    if (!explanation) return toast.error("Add a concise review reason");
    try {
      await openSourceApi.review(id, decision, explanation);
      toast.success(decision === "approved" ? "Street Points awarded" : "Review recorded");
      await load();
    } catch (error: any) { toast.error(error.message); }
  };

  return (
    <main className="min-h-screen bg-[#090a0d] p-6 text-white md:ml-60 md:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500">PoWR quality review</p>
        <h1 className="mt-3 text-4xl font-black">Open Source contributions</h1>
        <p className="mt-3 text-gray-500">Only merged contributions reach this queue. Review the public evidence before awarding Street Points.</p>
        <div className="mt-8 space-y-4">
          {claims.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-16 text-center text-gray-500">No merged contributions are waiting for review.</div> : claims.map((claim) => (
            <article key={claim.id} className="rounded-2xl border border-white/[0.08] bg-[#111318] p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div><div className="flex items-center gap-2 text-sm text-gray-500"><GitPullRequest /> @{claim.developer_username} · {claim.github_full_name}</div><h2 className="mt-2 text-xl font-bold">{claim.issue_title}</h2><div className="mt-2 text-sm capitalize text-gray-500">{claim.difficulty} · {claim.street_points} Street Points</div></div>
                <a href={claim.pull_request_url} target="_blank" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-400">Inspect merged PR <ArrowSquareOut /></a>
              </div>
              <pre className="mt-5 overflow-x-auto rounded-xl bg-black/30 p-4 text-xs text-gray-400">{JSON.stringify(claim.verification_snapshot, null, 2)}</pre>
              <textarea value={reason[claim.id] || ""} onChange={(event) => setReason({ ...reason, [claim.id]: event.target.value })} placeholder="Public review explanation" className="mt-4 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-orange-500/50" />
              <div className="mt-3 flex justify-end gap-2"><button onClick={() => void review(claim.id, "denied")} className="inline-flex items-center gap-2 rounded-lg border border-red-500/20 px-4 py-2 text-sm text-red-400"><X /> Deny</button><button onClick={() => void review(claim.id, "approved")} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black"><Check /> Approve</button></div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
