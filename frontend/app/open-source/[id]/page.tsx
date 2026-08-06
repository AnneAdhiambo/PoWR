"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowSquareOut, CheckCircle, Coin, Copy, GithubLogo, GitPullRequest, Star, X } from "phosphor-react";
import toast from "react-hot-toast";
import { Sidebar } from "../../components/layout/Sidebar";
import { SquircleLoader } from "../../components/ui/SquircleLoader";
import { openSourceApi, OpenSourceIssue, OpenSourceProject } from "../../lib/openSourceApi";

const labelTone = (label: string) => {
  const value = label.toLowerCase();
  if (value.includes("bug") || value.includes("security")) return "border-rose-400/20 bg-rose-400/10 text-rose-300";
  if (value.includes("doc")) return "border-sky-400/20 bg-sky-400/10 text-sky-300";
  if (value.includes("good first") || value.includes("beginner")) return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  if (value.includes("feature") || value.includes("enhancement")) return "border-violet-400/20 bg-violet-400/10 text-violet-300";
  if (value.includes("performance")) return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  return "border-white/[0.08] bg-white/[0.04] text-[#a5abb5]";
};

export default function OpenSourceProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<OpenSourceProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [claim, setClaim] = useState<{ id: string; footer: string } | null>(null);
  const [prUrl, setPrUrl] = useState("");
  const [issueTab, setIssueTab] = useState<"available" | "claimed">("available");
  const [claims, setClaims] = useState<any[]>([]);
  const [claimPrUrls, setClaimPrUrls] = useState<Record<string, string>>({});
  const [verifyingClaim, setVerifyingClaim] = useState<string | null>(null);

  const loadClaims = () => openSourceApi.claims().then((data) => setClaims(data.claims)).catch(() => setClaims([]));

  useEffect(() => {
    setUsername(localStorage.getItem("github_username") || "");
    setEmail(localStorage.getItem("github_email") || "");
    openSourceApi.project(Number(id)).then((data) => setProject(data.project)).catch((error) => toast.error(error.message)).finally(() => setLoading(false));
    void loadClaims();
  }, [id]);

  const chooseIssue = async (issue: OpenSourceIssue) => {
    try {
      const result = await openSourceApi.claim(issue.id);
      setClaim({ id: result.claim.id, footer: result.footer });
      await navigator.clipboard.writeText(result.footer).catch(() => undefined);
      toast.success("Claim created. The verification token was copied.");
      await loadClaims();
    } catch (error: any) { toast.error(error.message); }
  };

  const verifyExistingClaim = async (claimId: string, existingUrl?: string) => {
    const url = (claimPrUrls[claimId] || existingUrl || "").trim();
    if (!url) { toast.error("Enter the GitHub pull request URL"); return; }
    try {
      setVerifyingClaim(claimId);
      const result = await openSourceApi.verify(claimId, url);
      toast.success(result.claim.status === "approved" ? `Merged PR verified · ${result.claim.awarded_points || 0} Street Points awarded` : "PR linked. Check again after it is merged.");
      await loadClaims();
    } catch (error: any) { toast.error(error.message); }
    finally { setVerifyingClaim(null); }
  };

  const verify = async () => {
    if (!claim || !prUrl.trim()) return;
    try {
      const result = await openSourceApi.verify(claim.id, prUrl.trim());
      toast.success(result.claim.status === "approved" ? `Merged PR verified · ${result.claim.awarded_points || 0} Street Points awarded` : "PR linked. PoWR will award points after GitHub records the merge.");
      setPrUrl("");
    } catch (error: any) { toast.error(error.message); }
  };

  if (loading || !project) return <div className="min-h-screen bg-[#0b0c0f] text-white"><Sidebar username={username} email={email || undefined} displayName={username} /><main className="ml-60 grid min-h-screen place-items-center"><SquircleLoader size={58} label="Loading project details" /></main></div>;
  const repo = project.repository_url || `https://github.com/${project.github_full_name}`;

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-white">
      <Sidebar username={username} email={email || undefined} displayName={username} />
      <main className="ml-60 min-h-screen px-7 py-7 xl:px-10">
        <Link href="/open-source" className="inline-flex items-center gap-2 text-xs text-[#8b909a] hover:text-white"><ArrowLeft /> Back to projects</Link>
        <section className="mt-6 rounded-2xl border border-white/[0.07] bg-[#101216] p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
            <div className="max-w-3xl"><div className="flex items-center gap-3"><GithubLogo size={30} className="text-[#8b909a]" /><h1 className="text-3xl font-semibold tracking-[-0.03em]">{project.github_full_name}</h1>{project.partner && <span className="rounded-full bg-[#ff6a1a]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#ff8a4c]">PoWR partner</span>}</div><p className="mt-4 text-sm leading-7 text-[#959aa4]">{project.description || "A curated public open-source project with GitHub-verifiable contribution opportunities."}</p>{project.partner_guidance && <p className="mt-3 border-l-2 border-[#ff6a1a] pl-3 text-xs leading-5 text-[#c2c5cb]">{project.partner_guidance}</p>}</div>
            <a href={repo} target="_blank" className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-xs font-semibold text-black transition-all hover:-translate-y-0.5 hover:bg-[#ffeadf] active:translate-y-0">Open on GitHub <ArrowSquareOut /></a>
          </div>
          <div className="mt-7 grid gap-px overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
            {[["Stars", Number(project.stars || 0).toLocaleString(), `${repo}/stargazers`],["Open issues", project.open_issues || project.available_issue_count || 0, `${repo}/issues`],["Available", project.available_issue_count || 0, `${repo}/issues?q=is%3Aissue+is%3Aopen`],["Pull requests", Number(project.pull_request_count || 0).toLocaleString(), `${repo}/pulls`],["Commits", Number(project.commit_count || 0).toLocaleString(), `${repo}/commits`],["Health", `${project.health_score || 0}/100`, repo]].map(([label, value, href]) => <a key={String(label)} href={String(href)} target="_blank" className="bg-[#0d0f13] p-4 hover:bg-[#12151a]"><div className="text-lg font-semibold">{value}</div><div className="mt-1 text-[11px] text-[#686e78]">{label}</div></a>)}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-[#9ba0aa]">{project.primary_language && <span className="rounded-full border border-white/[0.08] px-3 py-1">{project.primary_language}</span>}{project.license_spdx && <span className="rounded-full border border-white/[0.08] px-3 py-1">{project.license_spdx} license</span>}{(project.topics || []).slice(0, 6).map((topic) => <span key={topic} className="rounded-full border border-white/[0.08] px-3 py-1">{topic}</span>)}</div>
        </section>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="mb-4 flex items-center gap-1 border-b border-white/[0.07]">
              <button onClick={() => setIssueTab("available")} className={`cursor-pointer border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${issueTab === "available" ? "border-[#ff6a1a] text-white" : "border-transparent text-[#737985] hover:text-white"}`}>Available issues <span className="ml-1.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px]">{project.issues?.length || 0}</span></button>
              <button onClick={() => setIssueTab("claimed")} className={`cursor-pointer border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${issueTab === "claimed" ? "border-[#ff6a1a] text-white" : "border-transparent text-[#737985] hover:text-white"}`}>Claimed issues <span className="ml-1.5 rounded-full bg-[#ff6a1a]/10 px-2 py-0.5 text-[10px] text-[#ff9a64]">{claims.filter((item) => Number(item.project_id) === project.id).length}</span></button>
            </div>
            {issueTab === "available" ? <div className="overflow-hidden rounded-xl border border-white/[0.07]">
              {(project.issues || []).map((issue) => (
                <article key={issue.id} className="border-b border-white/[0.06] p-5 last:border-0">
                  <div className="flex gap-5"><div className="min-w-0 flex-1"><a href={issue.issue_url} target="_blank" className="text-sm font-semibold leading-6 hover:text-[#ff8a4c]">#{issue.github_issue_number} {issue.title}</a><div className="mt-3 flex flex-wrap gap-2">{issue.labels?.slice(0, 4).map((label) => <span key={label} className={`rounded-full border px-2.5 py-1 text-[10px] ${labelTone(label)}`}>{label}</span>)}<span className="rounded-full border border-[#ffb45e]/20 bg-[#ffb45e]/10 px-2.5 py-1 text-[10px] capitalize text-[#ffc47d]">{issue.difficulty}</span></div></div><div className="w-28 shrink-0 text-right"><div className="inline-flex items-center gap-1.5 text-lg font-semibold text-[#ff8a4c]"><Coin weight="fill" /> {issue.street_points}</div><div className="text-[9px] uppercase tracking-wide text-[#636974]">Street Points</div><button onClick={() => void chooseIssue(issue)} className="mt-3 cursor-pointer rounded-lg border border-[#ff6a1a] bg-[#ff6a1a] px-3 py-2 text-[11px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ff7b38] hover:shadow-[0_8px_24px_rgba(255,106,26,.2)] active:translate-y-0">Claim issue</button></div></div>
                </article>
              ))}
              {(project.issues || []).length === 0 && <div className="p-12 text-center text-sm text-[#717680]">No synchronized contribution issues are available yet.</div>}
            </div> : <div className="space-y-3">
              {claims.filter((item) => Number(item.project_id) === project.id).map((item) => {
                const complete = item.status === "approved";
                const inactive = ["withdrawn", "expired", "denied", "revoked"].includes(item.status);
                return <article key={item.id} className="rounded-xl border border-white/[0.08] bg-[#101216] p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><a href={item.issue_url} target="_blank" className="text-sm font-semibold hover:text-[#ff8a4c]">{item.issue_title}</a><span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase ${complete ? "bg-emerald-400/10 text-emerald-300" : inactive ? "bg-white/[0.06] text-[#777d88]" : "bg-amber-400/10 text-amber-300"}`}>{item.status.replaceAll("_", " ")}</span></div><div className="mt-2 flex gap-3 text-[11px]"><span className="capitalize text-[#a5abb4]">{item.difficulty}</span><span className="text-[#ff9a64]">{item.street_points} point bounty</span>{complete && <span className="text-emerald-300">+{item.awarded_points} awarded</span>}</div></div><div className="shrink-0 text-right"><div className="text-lg font-semibold text-[#ff9a64]"><Coin className="mr-1 inline" weight="fill" />{item.street_points}</div></div></div>
                  {!inactive && !complete && <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input value={claimPrUrls[item.id] ?? item.pull_request_url ?? ""} onChange={(event) => setClaimPrUrls((values) => ({ ...values, [item.id]: event.target.value }))} placeholder="https://github.com/owner/repo/pull/123" className="h-11 flex-1 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-xs outline-none transition focus:border-[#ff6a1a]/60" /><button onClick={() => void verifyExistingClaim(item.id, item.pull_request_url)} disabled={verifyingClaim === item.id} className="h-11 cursor-pointer rounded-lg bg-[#ff6a1a] px-5 text-xs font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ff7a35] active:translate-y-0 disabled:cursor-wait disabled:opacity-60">{verifyingClaim === item.id ? "Checking GitHub…" : item.pull_request_url ? "Check merge & claim points" : "Link PR & claim points"}</button></div>}
                  {complete && item.pull_request_url && <a href={item.pull_request_url} target="_blank" className="mt-4 inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200">View verified pull request <ArrowSquareOut /></a>}
                </article>;
              })}
              {claims.filter((item) => Number(item.project_id) === project.id).length === 0 && <div className="rounded-xl border border-dashed border-white/[0.1] p-12 text-center"><div className="text-sm font-semibold">No claimed issues in this project</div><button onClick={() => setIssueTab("available")} className="mt-3 cursor-pointer text-xs font-semibold text-[#ff8a4c] hover:text-[#ffab7e]">Browse available issues</button></div>}
            </div>}
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-white/[0.07] bg-[#101216] p-5"><GitPullRequest className="text-[#ff7a35]" size={24} /><h3 className="mt-3 text-sm font-semibold">Contribution path</h3><ol className="mt-4 space-y-3 text-xs leading-5 text-[#858b95]"><li><strong className="mr-2 text-white">1.</strong>Read the issue and project guidelines.</li><li><strong className="mr-2 text-white">2.</strong>Claim it to receive a unique public token.</li><li><strong className="mr-2 text-white">3.</strong>Add the token to your PR description.</li><li><strong className="mr-2 text-white">4.</strong>Submit the PR URL. A merge triggers verification and points.</li></ol><a href={project.contribution_guide_url || repo} target="_blank" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#ff8a4c]">Read contribution guide <ArrowSquareOut /></a></div>
            <div className="rounded-xl border border-white/[0.07] p-5"><Star className="text-[#777d88]" /><h3 className="mt-3 text-sm font-semibold">Public evidence only</h3><p className="mt-2 text-xs leading-5 text-[#747a85]">PoWR reads public GitHub metadata and the claim token. Multiple developers can claim the same issue; only each developer’s verified merged work can score.</p></div>
          </aside>
        </div>
      </main>
      {claim && <div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl border border-[#ff6a1a]/25 bg-[#111318] p-6 shadow-2xl"><div className="flex items-start justify-between"><div><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle className="text-[#ff7a35]" weight="fill" /> Issue claimed</div><h2 className="mt-2 text-xl font-semibold">Add this token to your PR</h2></div><button onClick={() => setClaim(null)} className="cursor-pointer rounded-lg p-2 text-[#747a85] transition hover:bg-white/[0.06] hover:text-white"><X /></button></div><button onClick={() => navigator.clipboard.writeText(claim.footer).then(() => toast.success("Token copied"))} className="mt-5 flex w-full cursor-pointer items-center justify-between rounded-xl border border-[#ff6a1a]/20 bg-[#ff6a1a]/[0.07] p-4 text-left transition hover:border-[#ff6a1a]/50 hover:bg-[#ff6a1a]/10"><code className="truncate text-xs text-[#ffb38c]">{claim.footer}</code><Copy className="shrink-0 text-[#ff8a4c]" /></button><div className="mt-5 flex gap-2"><input value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="Paste the GitHub pull request URL" className="h-11 flex-1 rounded-lg border border-white/[0.1] bg-black/20 px-3 text-xs outline-none focus:border-[#ff6a1a]/60" /><button onClick={() => void verify()} className="cursor-pointer rounded-lg bg-white px-4 text-xs font-semibold text-black transition hover:-translate-y-0.5 hover:bg-[#ffeadf] active:translate-y-0">Verify PR</button></div><div className="mt-4 text-[11px] text-[#717680]">The claim remains available here while you work. Points are awarded only after GitHub confirms the merge.</div></div></div>}
    </div>
  );
}
