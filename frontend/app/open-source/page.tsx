"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, CheckCircle, GithubLogo, MagnifyingGlass, Medal, Plus, X } from "phosphor-react";
import toast from "react-hot-toast";
import { openSourceApi, OpenSourceIssue, OpenSourceProject } from "../lib/openSourceApi";

export default function OpenSourcePage() {
  const [projects, setProjects] = useState<OpenSourceProject[]>([]);
  const [selected, setSelected] = useState<OpenSourceProject | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<{ id: string; footer: string } | null>(null);
  const [prUrl, setPrUrl] = useState("");
  const [showNomination, setShowNomination] = useState(false);
  const [nomination, setNomination] = useState({ repository: "", reason: "" });

  const load = async () => {
    setLoading(true);
    try { setProjects((await openSourceApi.projects(query)).projects); }
    catch (error: any) { toast.error(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const languages = useMemo(() => new Set(projects.map((project) => project.primary_language).filter(Boolean)).size, [projects]);

  const openProject = async (project: OpenSourceProject) => {
    try { setSelected((await openSourceApi.project(project.id)).project); }
    catch (error: any) { toast.error(error.message); }
  };

  const chooseIssue = async (issue: OpenSourceIssue) => {
    try {
      const result = await openSourceApi.claim(issue.id);
      setClaim({ id: result.claim.id, footer: result.footer });
      await navigator.clipboard.writeText(result.footer);
      toast.success("Claim token copied. Add it to your PR description.");
    } catch (error: any) { toast.error(error.message); }
  };

  const verify = async () => {
    if (!claim || !prUrl) return;
    try {
      const result = await openSourceApi.verify(claim.id, prUrl);
      toast.success(result.claim.status === "merged_pending_review" ? "Merged contribution sent to PoWR review" : "Pull request linked");
      setPrUrl("");
    } catch (error: any) { toast.error(error.message); }
  };

  const submitNomination = async () => {
    try {
      await openSourceApi.nominate(nomination.repository, nomination.reason);
      setShowNomination(false);
      setNomination({ repository: "", reason: "" });
      toast.success("Project nomination sent to PoWR review");
    } catch (error: any) { toast.error(error.message); }
  };

  return (
    <main className="min-h-screen bg-[#090a0d] px-6 py-10 text-white lg:ml-60 lg:px-12">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Proof through community work</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Build reputation in the open.</h1>
            <p className="mt-4 max-w-2xl text-gray-400">Discover verified projects, choose meaningful issues, and turn merged pull requests into PoWR Street Points.</p>
          </div>
          <button onClick={() => setShowNomination(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold hover:bg-white/5">
            <Plus size={18} /> Nominate a project
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[[projects.length, "Curated projects"], [languages, "Languages"], [projects.filter((project) => project.partner).length, "PoWR partners"]].map(([value, label]) => (
            <div key={String(label)} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="text-3xl font-black">{value}</div><div className="mt-1 text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        <form onSubmit={(event) => { event.preventDefault(); void load(); }} className="mt-8 flex gap-3">
          <label className="relative flex-1">
            <MagnifyingGlass className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, languages, or technologies" className="w-full rounded-xl border border-white/10 bg-[#111318] py-3.5 pl-12 pr-4 text-sm outline-none focus:border-orange-500/60" />
          </label>
          <button className="rounded-xl bg-orange-500 px-6 text-sm font-bold text-black">Search</button>
        </form>

        {loading ? <div className="py-24 text-center text-gray-500">Loading curated projects…</div> : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <button key={project.id} onClick={() => void openProject(project)} className="group rounded-2xl border border-white/[0.08] bg-[#101216] p-6 text-left transition hover:-translate-y-0.5 hover:border-orange-500/35">
                <div className="flex items-start justify-between gap-4">
                  <GithubLogo size={28} className="text-gray-400" />
                  {project.partner && <span className="rounded-full bg-orange-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-400">PoWR Partner</span>}
                </div>
                <h2 className="mt-5 text-lg font-bold">{project.github_full_name}</h2>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-gray-500">{project.description || "Curated public project. Synchronize to load contribution opportunities."}</p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-gray-400">
                  {project.primary_language && <span className="rounded-lg bg-white/5 px-2.5 py-1">{project.primary_language}</span>}
                  <span className="rounded-lg bg-white/5 px-2.5 py-1">{project.available_issue_count || 0} issues</span>
                  <span className="rounded-lg bg-white/5 px-2.5 py-1">Health {project.health_score}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
          <div className="mx-auto my-8 max-w-4xl rounded-3xl border border-white/10 bg-[#101216] p-6 sm:p-8">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-widest text-orange-500">{selected.partner ? "PoWR partner project" : "Curated project"}</p><h2 className="mt-2 text-3xl font-black">{selected.github_full_name}</h2></div>
              <button aria-label="Close project" onClick={() => { setSelected(null); setClaim(null); }} className="rounded-lg p-2 hover:bg-white/5"><X size={22} /></button>
            </div>
            <p className="mt-4 text-gray-400">{selected.partner_guidance || selected.description || "Read the repository guidelines before beginning. PoWR interest does not reserve or assign this GitHub issue."}</p>
            <a href={selected.contribution_guide_url || selected.repository_url} target="_blank" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-400">Contribution guide <ArrowSquareOut /></a>
            <div className="mt-8 space-y-3">
              {(selected.issues || []).length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-gray-500">No synchronized issues yet.</div> : selected.issues?.map((issue) => (
                <article key={issue.id} className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div><a href={issue.issue_url} target="_blank" className="font-bold hover:text-orange-400">#{issue.github_issue_number} {issue.title}</a><p className="mt-2 line-clamp-2 text-sm text-gray-500">{issue.body_excerpt}</p></div>
                    <div className="shrink-0 text-right"><div className="text-2xl font-black text-orange-400">{issue.street_points}</div><div className="text-[10px] uppercase text-gray-600">Street Points</div></div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs capitalize text-gray-300">{issue.difficulty}</span>
                    {issue.assignee_login ? <span className="text-xs text-amber-400">Assigned on GitHub to @{issue.assignee_login}</span> : <span className="text-xs text-emerald-400">Unassigned on GitHub</span>}
                    <button onClick={() => void chooseIssue(issue)} className="ml-auto rounded-lg bg-orange-500 px-4 py-2 text-xs font-bold text-black">I want to contribute</button>
                  </div>
                </article>
              ))}
            </div>
            {claim && <div className="mt-8 rounded-2xl border border-orange-500/25 bg-orange-500/[0.06] p-5">
              <div className="flex items-center gap-2 font-bold"><CheckCircle className="text-orange-400" /> Your claim token</div>
              <code className="mt-3 block overflow-x-auto rounded-lg bg-black/40 p-3 text-sm text-orange-200">{claim.footer}</code>
              <p className="mt-2 text-xs text-gray-500">Add this footer to the PR description. Interest is non-exclusive unless GitHub assigns the issue to you.</p>
              <div className="mt-4 flex gap-2"><input value={prUrl} onChange={(event) => setPrUrl(event.target.value)} placeholder="https://github.com/owner/repo/pull/123" className="flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none" /><button onClick={() => void verify()} className="rounded-lg bg-white px-4 text-xs font-bold text-black">Check PR</button></div>
            </div>}
          </div>
        </div>
      )}

      {showNomination && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111318] p-6"><h2 className="text-xl font-bold">Nominate a public project</h2><p className="mt-2 text-sm text-gray-500">PoWR checks licensing, activity, contribution guidance, and issue quality.</p><input value={nomination.repository} onChange={(event) => setNomination({ ...nomination, repository: event.target.value })} placeholder="owner/repository" className="mt-5 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm" /><textarea value={nomination.reason} onChange={(event) => setNomination({ ...nomination, reason: event.target.value })} placeholder="Why should developers contribute here?" className="mt-3 min-h-28 w-full rounded-lg border border-white/10 bg-black/30 p-3 text-sm" /><div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowNomination(false)} className="px-4 py-2 text-sm text-gray-400">Cancel</button><button onClick={() => void submitNomination()} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-black">Submit</button></div></div></div>}
    </main>
  );
}
