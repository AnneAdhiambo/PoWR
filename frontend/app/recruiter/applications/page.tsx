"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Card } from "../../components/ui";
import { recruiterApiClient } from "../../lib/recruiterApi";

const stages = ["applied", "screening", "interview", "offer", "hired", "rejected"];

interface Application {
  id: number;
  developer_username: string;
  applicant_email: string;
  cover_note?: string;
  consent_given: boolean;
  stage: string;
  job_title: string;
  company: string;
  created_at: string;
  powr_score: number;
  skills: Array<{ skill: string; score: number }>;
  profile_summary?: string;
  availability?: string;
  notes: Array<{ id: number; note: string; recruiter_email: string; created_at: string }>;
}

export default function RecruiterApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [minimumScore, setMinimumScore] = useState(0);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    recruiterApiClient.getApplications()
      .then(({ applications: rows }) => setApplications(rows))
      .catch((error) => toast.error(error.message || "Could not load applications"))
      .finally(() => setLoading(false));
  }, [router]);

  const jobs = useMemo(() => Array.from(new Set(applications.map((application) => application.job_title))), [applications]);
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return applications.filter((application) => {
      const topSkills = (application.skills || []).map((skill) => skill.skill.toLowerCase());
      const searchable = [
        application.developer_username,
        application.applicant_email,
        application.job_title,
        application.profile_summary || "",
        ...topSkills,
      ].join(" ").toLowerCase();
      return (filter === "all" || application.stage === filter)
        && (jobFilter === "all" || application.job_title === jobFilter)
        && Number(application.powr_score || 0) >= minimumScore
        && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [applications, filter, jobFilter, minimumScore, query]);

  async function moveApplication(applicationId: number, stage: string) {
    setUpdatingId(applicationId);
    try {
      const { application } = await recruiterApiClient.updateApplicationStage(applicationId, stage);
      setApplications((current) => current.map((item) => item.id === applicationId ? { ...item, stage: application.stage } : item));
      toast.success(`Moved to ${stage}`);
    } catch (error: any) {
      toast.error(error.message || "Could not update application");
    } finally {
      setUpdatingId(null);
    }
  }

  async function addNote(applicationId: number) {
    const noteText = (noteDrafts[applicationId] || "").trim();
    if (!noteText) return;
    try {
      const { note } = await recruiterApiClient.addApplicationNote(applicationId, noteText);
      setApplications((current) => current.map((application) => application.id === applicationId
        ? { ...application, notes: [{ ...note, recruiter_email: localStorage.getItem("recruiter_email") || "Recruiter" }, ...(application.notes || [])] }
        : application));
      setNoteDrafts((current) => ({ ...current, [applicationId]: "" }));
      toast.success("Note added");
    } catch (error: any) {
      toast.error(error.message || "Could not add note");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[#FF5500]">Hiring pipeline</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Applications</h1>
          <p className="mt-2 text-sm text-gray-400">Review applicants and coordinate every hiring decision.</p>
        </div>
      </div>

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_170px_170px]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate, skill, role, or email" className="rounded-[var(--radius-control)] border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#FF5500]" />
          <select value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className="rounded-[var(--radius-control)] border border-white/10 bg-[#12141a] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF5500]">
            <option value="all">All jobs</option>
            {jobs.map((job) => <option key={job} value={job}>{job}</option>)}
          </select>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-[var(--radius-control)] border border-white/10 bg-[#12141a] px-3 py-2.5 text-sm capitalize text-white outline-none focus:border-[#FF5500]">
            <option value="all">All stages</option>
            {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          <select value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} className="rounded-[var(--radius-control)] border border-white/10 bg-[#12141a] px-3 py-2.5 text-sm text-white outline-none focus:border-[#FF5500]">
            <option value={0}>Any PoWR score</option>
            <option value={70}>PoWR 70+</option>
            <option value={80}>PoWR 80+</option>
            <option value={90}>PoWR 90+</option>
          </select>
        </div>
      </Card>

      {loading ? <Card className="p-8 text-sm text-gray-400">Loading applications...</Card> : visible.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-base font-medium text-white">No applications yet</p>
          <p className="mt-2 text-sm text-gray-500">Published jobs will collect applicants here.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((application) => (
            <Card key={application.id} className="p-5">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-white">@{application.developer_username}</h2>
                    <span className="rounded-full border border-[#FF5500]/25 bg-[#FF5500]/10 px-2.5 py-1 text-xs capitalize text-[#FF8a55]">{application.stage}</span>
                    {application.availability && <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs capitalize text-emerald-300">{application.availability}</span>}
                  </div>
                  <p className="mt-1 text-sm text-gray-400">{application.job_title} · {application.applicant_email}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div>
                      <p className="text-2xl font-semibold text-white">{application.powr_score || 0}</p>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-gray-600">PoWR score</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(application.skills || []).slice(0, 4).map((skill) => (
                        <span key={skill.skill} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-gray-300">{skill.skill} · {skill.score}</span>
                      ))}
                    </div>
                  </div>
                  {application.profile_summary && <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">{application.profile_summary}</p>}
                  {application.cover_note && <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">{application.cover_note}</p>}
                  <div className="mt-4 max-w-3xl border-t border-white/[0.06] pt-4">
                    <div className="flex gap-2">
                      <input value={noteDrafts[application.id] || ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [application.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") addNote(application.id); }} placeholder="Add an internal hiring note" className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-[#FF5500]" />
                      <Button type="button" variant="secondary" size="sm" onClick={() => addNote(application.id)}>Add note</Button>
                    </div>
                    {(application.notes || []).slice(0, 2).map((note) => (
                      <div key={note.id} className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2">
                        <p className="text-sm text-gray-300">{note.note}</p>
                        <p className="mt-1 text-[11px] text-gray-600">{note.recruiter_email} · {new Date(note.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs text-gray-600">Applied {new Date(application.created_at).toLocaleDateString()} · Consent recorded</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/recruiter/developer/${application.developer_username}`)}>View PoWR profile</Button>
                  <select disabled={updatingId === application.id} value={application.stage} onChange={(event) => moveApplication(application.id, event.target.value)} className="rounded-[var(--radius-control)] border border-white/10 bg-[#12141a] px-3 py-2 text-sm capitalize text-white outline-none focus:border-[#FF5500] disabled:opacity-50">
                    {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
