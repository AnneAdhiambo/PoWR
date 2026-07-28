"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Briefcase, CalendarCheck, CheckCircle, Clock, Users } from "phosphor-react";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, RecruiterPage, StatusBadge } from "../components/ui";
import { useRecruiterContext } from "../components/recruiter/RecruiterContext";
import { recruiterApiClient } from "../lib/recruiterApi";

interface DashboardJob { id: string | number; status?: string }
interface DashboardApplication { id: number; developer_username?: string; candidate_name?: string; job_title?: string; stage?: string }
interface DashboardEmployee { id: number }
interface DashboardData { jobs: DashboardJob[]; applications: DashboardApplication[]; employees: DashboardEmployee[] }

export default function RecruiterDashboardPage() {
  const { organization, recruiter, role, canManageJobs } = useRecruiterContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  async function loadDashboard() {
    setError("");
    try {
      const [{ jobs }, { applications }, { employees }] = await Promise.all([
        recruiterApiClient.getMyJobs(),
        recruiterApiClient.getApplications(),
        recruiterApiClient.getEmployees(),
      ]);
      setData({ jobs, applications, employees });
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your recruiting workspace");
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, []);

  const metrics = useMemo(() => {
    const jobs = data?.jobs || [];
    const applications = data?.applications || [];
    return [
      { label: "Open jobs", value: jobs.filter((job) => job.status === "published").length, icon: Briefcase, href: "/recruiter/jobs" },
      { label: "Active candidates", value: applications.filter((item) => !["rejected", "hired"].includes(item.stage || "")).length, icon: Users, href: "/recruiter/applications" },
      { label: "Decisions due", value: applications.filter((item) => ["interview", "offer"].includes(item.stage || "")).length, icon: Clock, href: "/recruiter/applications" },
      { label: "New hires", value: data?.employees.length || 0, icon: CheckCircle, href: "/recruiter/employees" },
    ];
  }, [data]);

  return (
    <RecruiterPage>
      <PageHeader
        eyebrow={organization?.displayName || "Recruiting workspace"}
        title={`Good to see you${recruiter?.email ? `, ${recruiter.email.split("@")[0]}` : ""}`}
        description={`Your hiring command center${role ? ` · ${role.replace("_", " ")}` : ""}. Review what needs attention and keep candidates moving.`}
        actions={canManageJobs ? <Link href="/recruiter/jobs" className="inline-flex items-center justify-center rounded-[var(--radius-control)] bg-[var(--brand-orange)] px-6 py-3 text-base font-medium text-white hover:bg-[var(--brand-orange-hover)]">Create a job</Link> : undefined}
      />

      {error ? <ErrorState description={error} action={<Button variant="secondary" onClick={loadDashboard}>Try again</Button>} /> : !data ? (
        <LoadingState label="Loading hiring activity" />
      ) : (
        <div className="space-y-6">
          <section aria-label="Hiring overview" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, icon: Icon, href }) => (
              <Link key={label} href={href} className="group">
                <Card className="h-full p-5 transition-colors group-hover:border-white/15">
                  <div className="flex items-center justify-between">
                    <span className="rounded-xl bg-orange-500/10 p-2 text-[var(--brand-orange)]"><Icon size={20} weight="duotone" /></span>
                    <ArrowRight size={16} className="text-gray-600 transition-transform group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                  <p className="mt-5 text-3xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{label}</p>
                </Card>
              </Link>
            ))}
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div><h2 className="font-semibold text-white">Candidate activity</h2><p className="mt-1 text-xs text-gray-500">Most recent applications across your jobs</p></div>
                <Link href="/recruiter/applications" className="text-sm font-medium text-orange-400 hover:text-orange-300">View pipeline</Link>
              </div>
              {data.applications.length === 0 ? (
                <div className="p-5"><EmptyState title="No candidates yet" description="Publish a role and share its careers link to start receiving applications." /></div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {data.applications.slice(0, 5).map((application) => (
                    <Link key={application.id} href="/recruiter/applications" className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.025]">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{application.developer_username || application.candidate_name || "Candidate"}</p>
                        <p className="mt-1 truncate text-xs text-gray-500">{application.job_title}</p>
                      </div>
                      <StatusBadge tone={application.stage === "hired" ? "success" : application.stage === "rejected" ? "danger" : "brand"}>{application.stage || "applied"}</StatusBadge>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-3"><CalendarCheck size={22} className="text-orange-400" /><div><h2 className="font-semibold text-white">Today’s focus</h2><p className="text-xs text-gray-500">A clean path through the hiring day</p></div></div>
              <div className="mt-5 space-y-3">
                {[
                  ["Review new applicants", data.applications.filter((item) => (item.stage || "applied") === "applied").length],
                  ["Prepare interviews", data.applications.filter((item) => item.stage === "interview").length],
                  ["Close hiring decisions", data.applications.filter((item) => item.stage === "offer").length],
                ].map(([label, count]) => (
                  <Link key={String(label)} href="/recruiter/applications" className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 hover:border-white/15">
                    <span className="text-sm text-gray-300">{label}</span><span className="text-sm font-semibold text-white">{count}</span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </RecruiterPage>
  );
}
