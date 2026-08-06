"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Briefcase, CheckCircle, Clock, MagnifyingGlass, Plus, Users, WarningCircle } from "phosphor-react";
import { Button, ErrorState, LoadingState, RecruiterPage, StatusBadge } from "../components/ui";
import { useRecruiterContext } from "../components/recruiter/RecruiterContext";
import { recruiterApiClient } from "../lib/recruiterApi";

interface DashboardJob { id: string | number; status?: string; title?: string }
interface DashboardApplication { id: number; job_id?: string | number; developer_username?: string; candidate_name?: string; job_title?: string; stage?: string; created_at?: string; powr_score?: number }
interface DashboardData { jobs: DashboardJob[]; applications: DashboardApplication[] }

interface DashboardAction {
  label: string;
  description: string;
  count: number;
}

const dashboardCardClassName = "overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0f12]";

function stageTone(stage?: string): "neutral" | "success" | "danger" | "warning" | "info" {
  if (stage === "hired") return "success";
  if (stage === "rejected") return "danger";
  if (stage === "offer") return "warning";
  if (stage === "interview") return "info";
  return "neutral";
}

function sentenceCase(value?: string) {
  if (!value) return "Draft";
  return value.charAt(0).toUpperCase() + value.slice(1).replaceAll("_", " ");
}

function candidateInitial(application: DashboardApplication) {
  const name = application.developer_username || application.candidate_name || "Candidate";
  return name.charAt(0).toUpperCase();
}

function applicationRecency(createdAt?: string) {
  if (!createdAt) return "Recently applied";
  const elapsedDays = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
  if (elapsedDays === 0) return "Applied today";
  if (elapsedDays === 1) return "Applied yesterday";
  if (elapsedDays < 7) return `Applied ${elapsedDays} days ago`;
  return `Applied ${new Date(createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export default function RecruiterDashboardPage() {
  const { organization, recruiter, role, canManageJobs } = useRecruiterContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setError("");
    try {
      const [{ jobs }, { applications }] = await Promise.all([
        recruiterApiClient.getMyJobs(),
        recruiterApiClient.getApplications(),
      ]);
      setData({ jobs, applications });
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your recruiting workspace");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, []);

  const toDos = useMemo(() => {
    const applications = data?.applications || [];
    const actions: DashboardAction[] = [
      {
        label: "Close hiring decisions",
        description: "Candidates waiting at offer stage",
        count: applications.filter((item) => item.stage === "offer").length,
      },
      {
        label: "Prepare interviews",
        description: "Interviews ready for coordination",
        count: applications.filter((item) => item.stage === "interview").length,
      },
      {
        label: "Review new applicants",
        description: "New applications awaiting review",
        count: applications.filter((item) => (item.stage || "applied") === "applied").length,
      },
    ];
    return actions.filter((item) => item.count > 0);
  }, [data]);

  const openRoles = data?.jobs.filter((job) => job.status === "active" || job.status === "published").length || 0;
  const newCandidates = data?.applications.filter((application) => (application.stage || "applied") === "applied").length || 0;
  const needsAttention = toDos.reduce((total, item) => total + item.count, 0);

  return (
    <RecruiterPage className="mx-auto max-w-[1280px] sm:px-8">
      <header className="flex flex-col justify-between gap-5 border-b border-white/[0.07] pb-7 lg:flex-row lg:items-end">
        <div>
          <p className="text-[13px] font-medium text-gray-500">{organization?.displayName || "Recruiting workspace"}</p>
          <h1 className="mt-2 text-[30px] font-medium tracking-tight text-white">Good to see you{recruiter?.email ? `, ${recruiter.email.split("@")[0]}` : ""}</h1>
          <p className="mt-2 text-sm leading-6 text-gray-400">Review hiring activity and work needing attention{role ? ` with your ${role.replace("_", " ")} access` : ""}.</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-nowrap">
          <Link href="/recruiter/search" className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-gray-300 hover:border-white/[0.18] hover:bg-white/[0.04] hover:text-white"><MagnifyingGlass size={16} />Search talent</Link>
          <Link href="/recruiter/applications" className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-gray-300 hover:border-white/[0.18] hover:bg-white/[0.04] hover:text-white"><Users size={16} />Review candidates</Link>
          {canManageJobs && <Link href="/recruiter/jobs/new" className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-orange-hover)]"><Plus size={17} weight="bold" />Post a job</Link>}
        </div>
      </header>

      <div className="mt-8">
        {error ? <ErrorState description={error} action={<Button variant="secondary" onClick={loadDashboard}>Try again</Button>} /> : !data ? (
          <LoadingState label="Loading hiring activity" />
        ) : (
          <div className="space-y-8">
            <section aria-label="Hiring overview" className="grid overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0f12] sm:grid-cols-3">
              {[
                { label: "Open roles", value: openRoles, description: "Currently hiring", href: "/recruiter/jobs", icon: Briefcase },
                { label: "New candidates", value: newCandidates, description: "Awaiting first review", href: "/recruiter/applications", icon: Users },
                { label: "Needs attention", value: needsAttention, description: needsAttention ? "Decisions and follow-ups" : "Nothing urgent", href: "/recruiter/applications", icon: WarningCircle },
              ].map((metric, index) => (
                <Link
                  key={metric.label}
                  href={metric.href}
                  className={`group flex min-h-[104px] items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/[0.025] sm:px-6 ${index > 0 ? "border-t border-white/[0.07] sm:border-l sm:border-t-0" : ""}`}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-400">{metric.label}</p>
                    <p className="mt-1 text-[26px] font-semibold leading-none tracking-tight text-white">{metric.value}</p>
                    <p className="mt-2 text-xs text-gray-600">{metric.description}</p>
                  </div>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${metric.label === "Needs attention" && metric.value > 0 ? "border-[#ff5500]/25 bg-[#ff5500]/10 text-[var(--brand-orange)]" : "border-white/[0.08] bg-white/[0.025] text-gray-500"}`}>
                    <metric.icon size={18} aria-hidden="true" />
                  </span>
                  <span className="sr-only">View {metric.label.toLowerCase()}</span>
                </Link>
              ))}
            </section>

            <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
              <section aria-labelledby="open-roles-title" className={dashboardCardClassName}>
                <div className="flex items-center justify-between px-5 pb-4 pt-5">
                  <div className="flex items-center gap-3">
                    <Briefcase size={19} className="text-gray-500" />
                    <div><h2 id="open-roles-title" className="text-[17px] font-semibold text-white">Open roles</h2><p className="mt-0.5 text-sm text-gray-500">Roles currently managed by your team</p></div>
                  </div>
                </div>
                {data.jobs.length === 0 ? (
                  <div className="border-t border-white/[0.07] px-5 py-8">
                    <p className="text-sm font-semibold text-white">Create your first role</p>
                    <p className="mt-1 text-sm text-gray-500">Publish a job and start receiving qualified candidates.</p>
                    {canManageJobs && <Link href="/recruiter/jobs/new" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--brand-orange)] hover:text-[var(--brand-orange-hover)]">Post a job <ArrowRight size={16} /></Link>}
                  </div>
                ) : (
                  <div className="border-t border-white/[0.07] divide-y divide-white/[0.06]">
                    {data.jobs.slice(0, 5).map((job) => {
                      const applicantCount = data.applications.filter((application) => String(application.job_id) === String(job.id)).length;
                      return (
                        <Link key={job.id} href="/recruiter/jobs" className="group flex min-h-[68px] items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/[0.025]">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.035] text-gray-500"><Briefcase size={17} aria-hidden="true" /></span>
                            <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{job.title || "Untitled job"}</p><p className="mt-1 text-xs text-gray-500">{applicantCount} {applicantCount === 1 ? "candidate" : "candidates"}</p></div>
                          </div>
                          <div className="flex items-center gap-3"><StatusBadge tone={job.status === "published" || job.status === "active" ? "success" : "neutral"}>{sentenceCase(job.status)}</StatusBadge><ArrowRight size={16} className="text-gray-700 transition-colors group-hover:text-gray-400" aria-hidden="true" /></div>
                        </Link>
                      );
                    })}
                  </div>
                )}
                <div className="border-t border-white/[0.07] px-5 py-3"><Link href="/recruiter/jobs" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-gray-400 hover:text-white">View all jobs <ArrowRight size={15} /></Link></div>
              </section>

              <aside aria-labelledby="next-actions-title" className={`${dashboardCardClassName} h-full`}>
                <div className="flex items-center gap-3 px-5 pb-4 pt-5">
                  <CheckCircle size={19} className="text-gray-500" />
                  <div><h2 id="next-actions-title" className="text-[17px] font-semibold text-white">Next actions</h2><p className="mt-0.5 text-sm text-gray-500">Work needing attention</p></div>
                </div>
                {toDos.length === 0 ? (
                  <div className="border-t border-white/[0.07] px-5 py-8">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400"><CheckCircle size={19} weight="fill" aria-hidden="true" /></span>
                    <p className="mt-4 text-sm font-semibold text-white">All caught up</p>
                    <p className="mt-1 text-sm leading-6 text-gray-500">There are no candidate decisions waiting on you.</p>
                  </div>
                ) : (
                  <div className="border-t border-white/[0.07] divide-y divide-white/[0.06]">
                    {toDos.map((item, index) => (
                      <Link key={item.label} href="/recruiter/applications" className="group flex min-h-[76px] items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-white/[0.025]">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${index === 0 ? "bg-[#ff5500]/10 text-[var(--brand-orange)]" : "bg-white/[0.035] text-gray-500"}`}><Clock size={16} aria-hidden="true" /></span>
                          <div><p className="text-sm font-medium text-white">{item.label}</p><p className="mt-1 text-xs leading-5 text-gray-500">{item.description}</p></div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2"><span className="min-w-6 text-right text-sm font-semibold text-white">{item.count}</span><ArrowRight size={15} className="text-gray-700 transition-colors group-hover:text-gray-400" aria-hidden="true" /></div>
                      </Link>
                    ))}
                  </div>
                )}
              </aside>
            </div>

            <section aria-labelledby="recent-candidates-title" className={dashboardCardClassName}>
              <div className="flex items-center justify-between gap-4 px-5 pb-4 pt-5">
                <div className="flex items-center gap-3">
                  <Users size={19} className="text-gray-500" />
                  <div><h2 id="recent-candidates-title" className="text-[17px] font-semibold text-white">Recent candidates</h2><p className="mt-0.5 text-sm text-gray-500">Latest applications across your roles</p></div>
                </div>
                <Link href="/recruiter/applications" className="text-sm font-medium text-gray-400 hover:text-white">Review candidates</Link>
              </div>
              {data.applications.length === 0 ? (
                <div className="flex min-h-[110px] flex-col justify-center border-t border-white/[0.07] px-5 py-5">
                  <p className="text-sm font-semibold text-white">Build your first shortlist</p>
                  <p className="mt-1 text-sm text-gray-500">Applications appear here automatically, or you can discover proven developers now.</p>
                  <Link href="/recruiter/search" className="mt-3 inline-flex min-h-10 items-center gap-2 self-start text-sm font-medium text-gray-300 hover:text-white">Search talent <ArrowRight size={15} /></Link>
                </div>
              ) : (
                <div className="border-t border-white/[0.07] divide-y divide-white/[0.06]">
                  {data.applications.slice(0, 5).map((application) => (
                    <Link key={application.id} href="/recruiter/applications" className="group grid min-h-[68px] items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.025] sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.055] text-xs font-semibold text-gray-300">{candidateInitial(application)}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-white">{application.developer_username || application.candidate_name || "Candidate"}</p><p className="mt-1 text-xs text-gray-500">{applicationRecency(application.created_at)}</p></div></div>
                      <div className="min-w-0"><p className="truncate text-sm text-gray-400">{application.job_title || "Open role"}</p><p className="mt-1 text-xs font-medium text-gray-500">PoWR Score {application.powr_score ?? 0}</p></div>
                      <div className="flex items-center gap-3"><StatusBadge tone={stageTone(application.stage)}>{sentenceCase(application.stage || "applied")}</StatusBadge><ArrowRight size={15} className="text-gray-700 transition-colors group-hover:text-gray-400" aria-hidden="true" /></div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </RecruiterPage>
  );
}
