"use client";

import { useEffect, useState } from "react";
import { ArrowSquareOut, GitBranch, Medal } from "phosphor-react";
import { openSourceApi } from "../../lib/openSourceApi";

export function OpenSourceEvidence({ username }: { username: string }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    openSourceApi.profile(username).then((result) => setData(result.openSource)).catch(() => setData(null));
  }, [username]);

  if (!data || (!data.street_points && !data.approved_contributions)) return null;

  return (
    <section className="mt-8 rounded-2xl border border-white/[0.08] bg-[#111318] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Open Source Evidence</p><h2 className="mt-2 text-2xl font-bold text-white">Verified community work</h2></div>
        <div className="flex gap-3">
          <div className="rounded-xl bg-orange-500/10 px-4 py-3 text-center"><div className="text-2xl font-black text-orange-400">{data.street_points}</div><div className="text-[10px] uppercase text-gray-500">Street Points</div></div>
          <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-center"><div className="text-2xl font-black text-white">{data.approved_contributions}</div><div className="text-[10px] uppercase text-gray-500">Approved PRs</div></div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {(data.contributions || []).map((contribution: any) => (
          <a key={contribution.pull_request_url} href={contribution.pull_request_url} target="_blank" className="rounded-xl border border-white/[0.07] bg-black/20 p-4 transition hover:border-orange-500/30">
            <div className="flex items-start justify-between gap-3"><GitBranch className="text-orange-400" size={21} /><span className="text-sm font-black text-orange-400">+{contribution.street_points}</span></div>
            <div className="mt-3 font-semibold text-white">{contribution.issue_title}</div>
            <div className="mt-1 text-xs text-gray-500">{contribution.github_full_name} · {contribution.difficulty}</div>
            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400"><Medal size={15} /> PoWR reviewed <ArrowSquareOut size={14} /></div>
          </a>
        ))}
      </div>
    </section>
  );
}
