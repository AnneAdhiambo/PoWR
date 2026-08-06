"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CaretLeft, CaretRight, Coin, GithubLogo, MagnifyingGlass, PushPin, Sparkle } from "phosphor-react";
import toast from "react-hot-toast";
import { Sidebar } from "../components/layout/Sidebar";
import { StreetScoreCircle } from "../components/ui/StreetScoreCircle";
import { SquircleLoader } from "../components/ui/SquircleLoader";
import { openSourceApi, OpenSourceProject } from "../lib/openSourceApi";

const PAGE_SIZE = 15;
const languageColor = (language?: string) => ({ TypeScript: "#3178c6", JavaScript: "#f1e05a", Rust: "#dea584", Go: "#00add8", Python: "#3572a5", Java: "#b07219", "C++": "#f34b7d", "C#": "#178600", Ruby: "#701516", PHP: "#4f5d95" }[language || ""] || "#8b909a");

export default function OpenSourcePage() {
  const [projects, setProjects] = useState<OpenSourceProject[]>([]);
  const [recommended, setRecommended] = useState<OpenSourceProject[]>([]);
  const [repositories, setRepositories] = useState<{ pinned: any[]; active: any[]; source: string }>({ pinned: [], active: [], source: "" });
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [streetPoints, setStreetPoints] = useState(0);
  const [githubProjects, setGithubProjects] = useState<any[]>([]);
  const [searchingGithub, setSearchingGithub] = useState(false);
  const [nominating, setNominating] = useState<string | null>(null);
  const [showAllGithub, setShowAllGithub] = useState(false);
  const catalogRequestRef = useRef(0);
  const githubRequestRef = useRef(0);

  useEffect(() => {
    const current = localStorage.getItem("github_username") || "";
    setUsername(current);
    setEmail(localStorage.getItem("github_email") || "");
    if (current) {
      openSourceApi.developerRepositories(current).then(setRepositories).catch(() => undefined);
      openSourceApi.profile(current).then((data) => setStreetPoints(Number(data.openSource.street_points || 0))).catch(() => undefined);
    }
    openSourceApi.recommended().then((data) => setRecommended(data.projects.slice(0, 3))).catch(() => undefined);
  }, []);

  useEffect(() => {
    const requestId = ++catalogRequestRef.current;
    setLoading(true);
    openSourceApi.projects({ query: submittedQuery, page, limit: PAGE_SIZE })
      .then((data) => {
        if (requestId !== catalogRequestRef.current) return;
        setProjects(data.projects);
        setPages(data.pagination.pages || 1);
        setTotal(data.pagination.total);
      })
      .catch((error) => { if (requestId === catalogRequestRef.current) toast.error(error.message); })
      .finally(() => { if (requestId === catalogRequestRef.current) setLoading(false); });
  }, [submittedQuery, page]);

  useEffect(() => {
    const nextQuery = query.trim();
    setShowAllGithub(false);
    const timer = window.setTimeout(() => {
      setPage(1);
      setSubmittedQuery(nextQuery);
      if (nextQuery.length < 2) {
        githubRequestRef.current += 1;
        setGithubProjects([]);
        setSearchingGithub(false);
        return;
      }
      const requestId = ++githubRequestRef.current;
      setSearchingGithub(true);
      openSourceApi.searchGithub(nextQuery)
        .then((data) => { if (requestId === githubRequestRef.current) setGithubProjects(data.projects); })
        .catch((error) => { if (requestId === githubRequestRef.current) toast.error(error.message); })
        .finally(() => { if (requestId === githubRequestRef.current) setSearchingGithub(false); });
    }, 320);
    return () => window.clearTimeout(timer);
  }, [query]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    const nextQuery = query.trim();
    setSubmittedQuery(nextQuery);
    setShowAllGithub(false);
    if (nextQuery.length >= 2) {
      setSearchingGithub(true);
      const requestId = ++githubRequestRef.current;
      openSourceApi.searchGithub(nextQuery).then((data) => { if (requestId === githubRequestRef.current) setGithubProjects(data.projects); }).catch((error) => toast.error(error.message)).finally(() => { if (requestId === githubRequestRef.current) setSearchingGithub(false); });
    } else setGithubProjects([]);
  };

  const nominate = async (project: any) => {
    try {
      setNominating(project.github_full_name);
      const result = await openSourceApi.nominate(project.github_full_name, `Discovered through PoWR GitHub search by @${username}`);
      if (result.autoApproved && result.project) {
        toast.success(`${project.github_full_name} passed the 100-star threshold and is now listed`);
        setGithubProjects((items) => items.map((item) => item.github_full_name === project.github_full_name ? { ...item, already_listed: true, project_id: result.project?.id } : item));
      } else {
        toast.success("Nomination submitted for PoWR review");
      }
    } catch (error: any) { toast.error(error.message); }
    finally { setNominating(null); }
  };

  const personalRepos = repositories.pinned.length ? repositories.pinned : repositories.active.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0b0c0f] text-white">
      <Sidebar username={username} email={email || undefined} displayName={username} />
      <main className="ml-60 min-h-screen px-7 py-7 xl:px-10">
        <header className="border-b border-white/[0.06] pb-5">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#ff6a1a]"><Sparkle weight="fill" /> Developer network</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Open source opportunities</h1>
            </div>
            <div className="flex items-center gap-6"><StreetScoreCircle points={streetPoints} size={76} /><div className="h-10 w-px bg-white/[0.08]" /><div><strong className="block text-xl text-white">{total || "105+"}</strong><span className="text-xs text-[#717680]">curated projects</span></div></div>
          </div>
        </header>

        {personalRepos.length > 0 && (
          <section className="border-b border-white/[0.06] py-6">
            <div className="mb-4 flex items-end justify-between">
              <h2 className="text-sm font-semibold">{repositories.pinned.length ? "Pinned repositories" : "Top active projects"}</h2>
              <a href={`https://github.com/${username}`} target="_blank" className="cursor-pointer text-xs text-[#a6abb4] transition-colors hover:text-[#ff8a4c]">View GitHub</a>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {personalRepos.slice(0, 4).map((repo) => (
                <a key={repo.fullName} href={repo.url} target="_blank" className="group cursor-pointer rounded-xl border border-white/[0.07] bg-gradient-to-br from-[#12151b] to-[#0e1014] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#ff6a1a]/30 hover:shadow-[0_12px_30px_rgba(0,0,0,.2)]">
                  <div className="flex items-center justify-between"><GithubLogo className="text-[#7f8490]" /><span className="text-[10px] text-[#717680]">{repo.pinned ? <><PushPin className="mr-1 inline" />Pinned</> : "Active"}</span></div>
                  <div className="mt-3 truncate text-sm font-semibold">{repo.fullName}</div>
                  <div className="mt-2 flex gap-3 text-[11px]"><span className="text-[#7dd3fc]">● {repo.language || "Multiple"}</span><span className="text-[#f8c15c]">★ {Number(repo.stars || 0).toLocaleString()}</span><span className="text-[#a78bfa]">⑂ {repo.openIssues || 0}</span></div>
                </a>
              ))}
            </div>
          </section>
        )}

        <div className="grid gap-8 py-7 xl:grid-cols-[minmax(0,1fr)_300px]">
          <section>
            <form onSubmit={search} className="mb-5 flex gap-2">
              <label className="relative flex-1"><MagnifyingGlass size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#646a75]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by project, language, or technology" className="h-11 w-full rounded-lg border border-white/[0.08] bg-[#101216] pl-11 pr-4 text-sm outline-none transition focus:border-[#ff6a1a]/60" /></label>
              <button className="cursor-pointer rounded-lg bg-[#ff6a1a] px-5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ff7a35] active:translate-y-0">Search</button>
            </form>

            {(searchingGithub || githubProjects.length > 0) && <section className="mb-7"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><GithubLogo className="text-[#737985]" /><h2 className="text-sm font-semibold">GitHub results</h2><span className="text-[10px] text-[#626873]">Outside PoWR</span>{searchingGithub && <SquircleLoader size={18} label="Searching GitHub" />}</div><span className="text-[10px] text-[#626873]">100+ stars qualify immediately</span></div><div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#0d0f13]">{searchingGithub && githubProjects.length === 0 ? <div className="space-y-1 p-3">{[0,1,2].map((item) => <div key={item} className="grid grid-cols-[1fr_100px_92px] gap-4 px-2 py-3"><div className="h-4 w-1/3 animate-pulse rounded bg-white/[0.06]" /><div className="h-3 animate-pulse rounded bg-white/[0.04]" /><div className="h-8 animate-pulse rounded-lg bg-white/[0.05]" /></div>)}</div> : githubProjects.slice(0, showAllGithub ? 8 : 4).map((project) => <div key={project.github_full_name} className="grid grid-cols-[minmax(0,1fr)_100px_92px] items-center gap-4 border-b border-white/[0.055] px-5 py-4 last:border-0 transition-colors hover:bg-white/[0.025]"><div className="min-w-0"><a href={project.repository_url} target="_blank" className="truncate text-sm font-semibold transition-colors hover:text-[#ff8a4c]">{project.github_full_name}</a><div className="mt-1.5 flex items-center gap-4 text-[10px]"><span className="flex items-center gap-1.5 text-[#9ba0aa]"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: languageColor(project.primary_language) }} />{project.primary_language || "Multiple"}</span><span className="text-[#e8b84f]">★ {Number(project.stars).toLocaleString()}</span><span className="text-[#9a82d8]">⑂ {Number(project.open_issues).toLocaleString()}</span>{project.instant_eligible && <span className="text-emerald-400">Eligible now</span>}</div></div><div className="text-right text-[10px] text-[#686e78]">{Number(project.forks || 0).toLocaleString()} forks</div>{project.already_listed ? <Link href={`/open-source/${project.project_id}`} className="cursor-pointer text-right text-[11px] font-semibold text-emerald-300 transition-colors hover:text-emerald-200">View project →</Link> : <button onClick={() => void nominate(project)} disabled={nominating === project.github_full_name} className="h-9 cursor-pointer rounded-lg bg-[#ff6a1a] px-3 text-[11px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#ff7a35] active:translate-y-0 disabled:cursor-wait disabled:opacity-60">{nominating === project.github_full_name ? "Checking…" : project.instant_eligible ? "Add project" : "Nominate"}</button>}</div>)}</div>{githubProjects.length > 4 && <button onClick={() => setShowAllGithub((value) => !value)} className="mt-3 cursor-pointer text-xs font-semibold text-[#8b909a] transition-colors hover:text-white">{showAllGithub ? "Show fewer results" : `Show ${Math.min(4, githubProjects.length - 4)} more GitHub results`} →</button>}</section>}

            <div className="relative overflow-hidden rounded-xl border border-white/[0.07]" aria-busy={loading}>
              {loading && projects.length > 0 && <div className="absolute right-4 top-3 z-10 rounded-lg border border-white/[0.07] bg-[#111318]/90 p-2 shadow-lg backdrop-blur"><SquircleLoader size={20} label="Updating project results" /></div>}
              <div className="grid grid-cols-[minmax(0,1fr)_110px_100px_32px] gap-4 bg-white/[0.025] px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#686e78]"><span>Project</span><span>Open issues</span><span>Health</span><span /></div>
              {loading && projects.length === 0 ? <div className="space-y-1 p-3">{Array.from({length: 6}).map((_, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_110px_100px_32px] gap-4 px-2 py-4"><div><div className="h-4 w-2/5 animate-pulse rounded bg-white/[0.07]" /><div className="mt-2 h-3 w-1/4 animate-pulse rounded bg-white/[0.04]" /></div><div className="h-4 animate-pulse rounded bg-white/[0.04]" /><div className="h-4 animate-pulse rounded bg-white/[0.04]" /></div>)}</div> : projects.map((project) => (
                <Link key={project.id} href={`/open-source/${project.id}`} className="grid cursor-pointer grid-cols-[minmax(0,1fr)_110px_100px_32px] gap-4 border-t border-white/[0.06] px-5 py-5 transition-all hover:bg-white/[0.035]">
                  <div className="min-w-0"><div className="flex items-center gap-2"><GithubLogo className="shrink-0 text-[#777d88]" /><h2 className="truncate text-sm font-semibold">{project.github_full_name}</h2>{project.partner && <span className="rounded bg-[#ff6a1a]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#ff8a4c]">Partner</span>}</div><div className="mt-2 flex gap-4 text-[11px]"><span className="text-[#67c7f5]">● {project.primary_language || "Multiple"}</span><span className="text-[#f6c65b]">★ {Number(project.stars || 0).toLocaleString()}</span><span className="text-[#a78bfa]">⑂ {Number(project.open_issues || project.available_issue_count || 0).toLocaleString()}</span></div></div>
                  <div className="self-center text-sm"><span className="font-semibold text-[#a78bfa]">{Number(project.open_issues || project.available_issue_count || 0).toLocaleString()}</span><span className="ml-1 text-[#686e78]">open</span></div>
                  <div className="self-center"><div className="mb-1 text-xs text-[#a2a7b0]">{project.health_score || 0}/100</div><div className="h-1.5 w-16 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.min(100, project.health_score || 0)}%` }} /></div></div>
                  <ArrowRight className="self-center text-[#646a75]" />
                </Link>
              ))}
              {!loading && projects.length === 0 && <div className="p-14 text-center text-sm text-[#717680]">No projects match that search.</div>}
            </div>

            <div className="mt-5 flex items-center justify-between"><span className="text-xs text-[#686e78]">{page} / {pages}</span><div className="flex gap-2"><button aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-white/[0.12] bg-[#12151a] text-[#d5d8de] transition-all hover:-translate-y-0.5 hover:border-[#ff6a1a]/50 hover:text-[#ff8a4c] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30"><CaretLeft /></button><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-[#ff6a1a]/35 bg-[#ff6a1a]/10 px-4 text-xs font-semibold text-[#ff9a64] transition-all hover:-translate-y-0.5 hover:border-[#ff6a1a] hover:bg-[#ff6a1a]/20 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-30">Show more <CaretRight /></button></div></div>
          </section>

          <aside>
            <div className="sticky top-7">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Recommended</h2><span className="text-[10px] text-[#626873]">Weekly</span></div>
              <div className="space-y-3">{recommended.map((project) => (
                <Link key={project.id} href={`/open-source/${project.id}`} className="block cursor-pointer rounded-xl border border-white/[0.07] bg-gradient-to-br from-[#13161c] to-[#0e1014] p-4 transition-all hover:-translate-y-0.5 hover:border-[#ff6a1a]/30"><div className="flex items-center justify-between"><GithubLogo className="text-[#777d88]" /><span className="text-[10px] font-semibold text-[#ff8a4c]">Recommended</span></div><h3 className="mt-3 truncate text-sm font-semibold">{project.github_full_name}</h3><div className="mt-3 flex items-center gap-3 text-[11px]"><span className="text-[#f6c65b]">★ {Number(project.stars || 0).toLocaleString()}</span><span className="text-[#a78bfa]">⑂ {Number(project.open_issues || 0).toLocaleString()}</span><span className="ml-auto text-[#686e78]">{project.health_score || 0}%</span></div></Link>
              ))}</div>
              <div className="mt-5 rounded-xl border border-[#ff6a1a]/15 bg-[#ff6a1a]/[0.05] p-4"><Coin size={22} className="text-[#ff7a35]" weight="fill" /><h3 className="mt-3 text-sm font-semibold">How bounties work</h3><p className="mt-2 text-xs leading-5 text-[#858b95]">Street Points reflect issue complexity and value. They are awarded automatically only after the claimed token appears on a merged public pull request.</p></div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
