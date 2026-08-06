"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button, Card, Dialog, DialogContent, DialogDescription, DialogTitle, EmptyState, LoadingState, PageHeader, RecruiterPage, StatusBadge, controlClassName } from "../../components/ui";
import { useRecruiterContext } from "../../components/recruiter/RecruiterContext";
import { recruiterApiClient } from "../../lib/recruiterApi";

const stages = ["applied", "screening", "interview", "assessment", "offer", "hired", "rejected", "withdrawn"];

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
  screening_answers?: Record<string, string>;
  shared_evidence?: string[];
  scorecards?: Array<{ id: number; score: number; recommendation: string; feedback?: string }>;
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
  const [scorecardApplication, setScorecardApplication] = useState<Application | null>(null);
  const [handoffApplication, setHandoffApplication] = useState<Application | null>(null);
  const [scorecard, setScorecard] = useState({ score: "3", recommendation: "yes", feedback: "" });
  const [handoff, setHandoff] = useState({ start_date: "", employment_type: "full-time", department: "", manager_name: "", onboarding_notes: "" });
  const [submittingDialog, setSubmittingDialog] = useState(false);
  const { canMoveCandidates } = useRecruiterContext();

  useEffect(() => {
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

  async function createEmployee() {
    if (!handoffApplication) return;
    setSubmittingDialog(true);
    try {
      await recruiterApiClient.convertApplicationToEmployee(handoffApplication.id, {
        start_date: handoff.start_date || undefined,
        employment_type: handoff.employment_type || undefined,
        department: handoff.department || undefined,
        manager_name: handoff.manager_name || undefined,
        onboarding_notes: handoff.onboarding_notes || undefined,
      });
      toast.success("Employee record created");
      setHandoffApplication(null);
      router.push("/recruiter/employees");
    } catch (error: any) {
      toast.error(error.message || "Could not create employee record");
    } finally { setSubmittingDialog(false); }
  }

  async function addScorecard() {
    if (!scorecardApplication) return;
    setSubmittingDialog(true);
    try {
      const { scorecard: saved } = await recruiterApiClient.saveApplicationScorecard(scorecardApplication.id, Number(scorecard.score), scorecard.recommendation, scorecard.feedback || undefined);
      setApplications((current) => current.map((application) => application.id === scorecardApplication.id ? { ...application, scorecards: [saved, ...(application.scorecards || []).filter((item) => item.id !== saved.id)] } : application));
      toast.success("Scorecard saved");
      setScorecardApplication(null);
    } catch (error: any) { toast.error(error.message || "Could not save scorecard"); }
    finally { setSubmittingDialog(false); }
  }

  return (
    <RecruiterPage>
      <PageHeader eyebrow="Hiring pipeline" title="Applications" description="Review applicants and coordinate every hiring decision." />

      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_190px_170px_170px]">
          <input aria-label="Search applications" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidate, skill, role, or email" className={controlClassName} />
          <select aria-label="Filter by job" value={jobFilter} onChange={(event) => setJobFilter(event.target.value)} className={controlClassName}>
            <option value="all">All jobs</option>
            {jobs.map((job) => <option key={job} value={job}>{job}</option>)}
          </select>
          <select aria-label="Filter by stage" value={filter} onChange={(event) => setFilter(event.target.value)} className={`${controlClassName} capitalize`}>
            <option value="all">All stages</option>
            {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
          </select>
          <select aria-label="Minimum PoWR score" value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} className={controlClassName}>
            <option value={0}>Any PoWR score</option>
            <option value={70}>PoWR 70+</option>
            <option value={80}>PoWR 80+</option>
            <option value={90}>PoWR 90+</option>
          </select>
        </div>
      </Card>

      {loading ? <LoadingState label="Loading applications" /> : visible.length === 0 ? (
        <EmptyState title={applications.length ? "No matching applications" : "No applications yet"} description={applications.length ? "Adjust the search or filters to see more candidates." : "Published jobs will collect applicants here."} />
      ) : (
        <div className="space-y-4">
          {visible.map((application) => (
            <Card key={application.id} className="p-5">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-white">@{application.developer_username}</h2>
                    <StatusBadge tone="brand">{application.stage}</StatusBadge>
                    {application.availability && <StatusBadge tone="success">{application.availability}</StatusBadge>}
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
                  {application.screening_answers && Object.keys(application.screening_answers).length > 0 && <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">{Object.entries(application.screening_answers).map(([question, answer]) => <div key={question} className="mb-2 last:mb-0"><p className="text-xs text-gray-500">{question}</p><p className="text-sm text-gray-300">{answer}</p></div>)}</div>}
                  <div className="mt-4 max-w-3xl border-t border-white/[0.06] pt-4">
                    <div className="flex gap-2">
                      <input aria-label={`Note for ${application.developer_username}`} value={noteDrafts[application.id] || ""} onChange={(event) => setNoteDrafts((current) => ({ ...current, [application.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter") addNote(application.id); }} placeholder="Add an internal hiring note" className={`${controlClassName} min-w-0 flex-1 py-2`} />
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
                  <Button type="button" variant="outline" size="sm" onClick={() => setScorecardApplication(application)}>Scorecard</Button>
                  <select aria-label={`Stage for ${application.developer_username}`} disabled={!canMoveCandidates || updatingId === application.id} value={application.stage} onChange={(event) => moveApplication(application.id, event.target.value)} className={`${controlClassName} w-auto py-2 capitalize`}>
                    {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                  {application.stage === "hired" && canMoveCandidates && <Button type="button" size="sm" onClick={() => setHandoffApplication(application)}>Create employee</Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(scorecardApplication)} onOpenChange={(open) => !open && setScorecardApplication(null)}>
        <DialogContent>
          <DialogTitle>Candidate scorecard</DialogTitle>
          <DialogDescription>Record a structured, private hiring recommendation for @{scorecardApplication?.developer_username}.</DialogDescription>
          <div className="mt-5 space-y-4">
            <label className="block text-sm text-gray-300">Score
              <select value={scorecard.score} onChange={(event) => setScorecard((current) => ({ ...current, score: event.target.value }))} className={`mt-2 ${controlClassName}`}>
                {[1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score} / 5</option>)}
              </select>
            </label>
            <label className="block text-sm text-gray-300">Recommendation
              <select value={scorecard.recommendation} onChange={(event) => setScorecard((current) => ({ ...current, recommendation: event.target.value }))} className={`mt-2 ${controlClassName}`}>
                {["strong yes", "yes", "no", "strong no"].map((value) => <option key={value}>{value}</option>)}
              </select>
            </label>
            <label className="block text-sm text-gray-300">Private feedback
              <textarea rows={4} value={scorecard.feedback} onChange={(event) => setScorecard((current) => ({ ...current, feedback: event.target.value }))} className={`mt-2 ${controlClassName}`} />
            </label>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setScorecardApplication(null)}>Cancel</Button><Button loading={submittingDialog} onClick={addScorecard}>Save scorecard</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(handoffApplication)} onOpenChange={(open) => !open && setHandoffApplication(null)}>
        <DialogContent>
          <DialogTitle>Create employee handoff</DialogTitle>
          <DialogDescription>Carry the hiring decision into onboarding without losing context.</DialogDescription>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-gray-300">Start date<input type="date" value={handoff.start_date} onChange={(event) => setHandoff((current) => ({ ...current, start_date: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <label className="text-sm text-gray-300">Employment type<select value={handoff.employment_type} onChange={(event) => setHandoff((current) => ({ ...current, employment_type: event.target.value }))} className={`mt-2 ${controlClassName}`}><option value="full-time">Full-time</option><option value="part-time">Part-time</option><option value="contract">Contract</option></select></label>
            <label className="text-sm text-gray-300">Department<input value={handoff.department} onChange={(event) => setHandoff((current) => ({ ...current, department: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <label className="text-sm text-gray-300">Hiring manager<input value={handoff.manager_name} onChange={(event) => setHandoff((current) => ({ ...current, manager_name: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <label className="text-sm text-gray-300 sm:col-span-2">Onboarding notes<textarea rows={4} value={handoff.onboarding_notes} onChange={(event) => setHandoff((current) => ({ ...current, onboarding_notes: event.target.value }))} className={`mt-2 ${controlClassName}`} /></label>
            <div className="flex justify-end gap-2 sm:col-span-2"><Button variant="ghost" onClick={() => setHandoffApplication(null)}>Cancel</Button><Button loading={submittingDialog} onClick={createEmployee}>Create employee</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </RecruiterPage>
  );
}
