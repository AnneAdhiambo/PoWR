"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Plus, X, ArrowSquareOut } from "phosphor-react";
import { recruiterApiClient } from "../../lib/recruiterApi";
import toast from "react-hot-toast";
import { ConfirmDialog, RecruiterPage } from "../../components/ui";
import { useRecruiterContext } from "../../components/recruiter/RecruiterContext";
import { JobActionsMenu, type JobAction } from "../../components/recruiter/JobActionsMenu";
import { SquircleLoader } from "../../components/ui/SquircleLoader";

interface Job {
  id: string | number;
  title: string;
  company: string;
  location: string;
  salary?: string;
  type: string;
  description?: string;
  tags?: string[];
  status?: string;
  public_slug?: string;
  department?: string;
  remote_policy?: string;
  seniority?: string;
  closing_date?: string;
  screening_questions?: string[];
}

interface JobForm {
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  description: string;
  tagsInput: string;
  department: string;
  remotePolicy: string;
  seniority: string;
  closingDate: string;
  questionsInput: string;
}

const emptyForm: JobForm = {
  title: "",
  company: "",
  location: "",
  salary: "",
  type: "full-time",
  description: "",
  tagsInput: "",
  department: "",
  remotePolicy: "hybrid",
  seniority: "",
  closingDate: "",
  questionsInput: "",
};

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [jobPendingDelete, setJobPendingDelete] = useState<Job | null>(null);
  const [pendingAction, setPendingAction] = useState<{ job: Job; action: Exclude<JobAction, "view" | "edit" | "duplicate" | "delete"> } | null>(null);
  const { canManageJobs } = useRecruiterContext();

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const [{ jobs }, { organization }] = await Promise.all([
        recruiterApiClient.getMyJobs(),
        recruiterApiClient.getOrganizationProfile(),
      ]);
      setJobs(jobs);
      setOrganizationSlug(organization.slug || "");
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (job: Job) => {
    setEditingJob(job);
    setFormStep(1);
    setForm({
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary || "",
      type: job.type || "full-time",
      description: job.description || "",
      tagsInput: (job.tags || []).join(", "),
      department: job.department || "",
      remotePolicy: job.remote_policy || "hybrid",
      seniority: job.seniority || "",
      closingDate: job.closing_date?.slice(0, 10) || "",
      questionsInput: (job.screening_questions || []).join("\n"),
    });
    setShowForm(true);
  };

  const handleSubmit = async (status: "draft" | "active" = "active") => {
    if (!form.title || !form.company || !form.location) {
      toast.error("Title, company, and location are required");
      return;
    }
    const data = {
      title: form.title,
      company: form.company,
      location: form.location,
      salary: form.salary || undefined,
      type: form.type,
      description: form.description || undefined,
      tags: form.tagsInput
        ? form.tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [],
      department: form.department || undefined,
      remote_policy: form.remotePolicy || undefined,
      seniority: form.seniority || undefined,
      closing_date: form.closingDate || undefined,
      screening_questions: form.questionsInput.split("\n").map((question) => question.trim()).filter(Boolean),
      status: editingJob ? undefined : status,
    };
    try {
      setSaving(true);
      if (editingJob) {
        const { job } = await recruiterApiClient.updateJob(String(editingJob.id), data);
        setJobs((prev) =>
          prev.map((j) => (String(j.id) === String(editingJob.id) ? job : j))
        );
        toast.success("Job updated");
      } else {
        const { job } = await recruiterApiClient.createJob(data);
        setJobs((prev) => [job, ...prev]);
        toast.success("Job posted");
      }
      setShowForm(false);
    } catch {
      toast.error("Failed to save job");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!jobPendingDelete) return;
    try {
      await recruiterApiClient.deleteJob(String(jobPendingDelete.id));
      setJobs((prev) => prev.filter((item) => String(item.id) !== String(jobPendingDelete.id)));
      toast.success("Job deleted");
    } catch {
      toast.error("Failed to delete job");
    }
  };

  const setJobStatus = async (job: Job, status: string) => {
    try {
      const { job: updated } = await recruiterApiClient.updateJob(String(job.id), { status });
      setJobs((prev) => prev.map((item) => String(item.id) === String(job.id) ? updated : item));
      toast.success(status === "active" ? "Job published" : `Job ${status}`);
    } catch { toast.error("Failed to update job status"); }
  };

  const duplicateJob = async (job: Job) => {
    try {
      const { job: duplicate } = await recruiterApiClient.duplicateJob(String(job.id));
      setJobs((previous) => [duplicate, ...previous]);
    } catch { toast.error("Failed to duplicate job"); }
  };

  const handleJobAction = (job: Job, action: JobAction) => {
    if (action === "view") {
      setPreviewJob(job);
      return;
    }
    if (action === "edit") {
      openEdit(job);
      return;
    }
    if (action === "duplicate") {
      duplicateJob(job);
      return;
    }
    if (action === "delete") {
      setJobPendingDelete(job);
      return;
    }
    setPendingAction({ job, action });
  };

  const confirmAction = () => {
    if (!pendingAction) return;
    const { job, action } = pendingAction;
    const status = action === "publish" ? "active" : action === "pause" ? "paused" : action === "close" ? "closed" : "archived";
    setJobStatus(job, status);
  };

  const confirmationCopy = pendingAction ? {
    publish: { title: "Publish this job?", message: `“${pendingAction.job.title}” will become visible on your public careers page and candidates can apply.`, confirmText: "Publish job", variant: "info" as const },
    pause: { title: "Pause applications?", message: `“${pendingAction.job.title}” will remain in your workspace but will stop accepting new applications.`, confirmText: "Pause job", variant: "warning" as const },
    close: { title: "Close this job?", message: `Close “${pendingAction.job.title}” when the role is no longer accepting candidates. Existing applications remain available.`, confirmText: "Close job", variant: "warning" as const },
    archive: { title: "Archive this job?", message: `“${pendingAction.job.title}” will move out of the active hiring view. Its hiring history remains available.`, confirmText: "Archive job", variant: "warning" as const },
  }[pendingAction.action] : null;

  const getPublicJobUrl = (job: Job) => {
    if (!organizationSlug || !job.public_slug) return "";
    const isLocal = typeof window !== "undefined" && window.location.hostname.endsWith("localhost");
    return isLocal
      ? `http://${organizationSlug}.powr.localhost:${window.location.port || "3000"}/jobs/${job.public_slug}`
      : `https://${organizationSlug}.powr.dev/jobs/${job.public_slug}`;
  };

  return (
    <RecruiterPage>
      <div className="mb-9 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-white">Jobs</h1>
          <p className="mt-2 text-base text-gray-400">Post and manage job listings</p>
        </div>
        {canManageJobs && <Link
          href="/recruiter/jobs/new"
          className="flex items-center gap-2 rounded-lg bg-[#FF5500] px-5 py-3 text-base font-semibold text-white transition-colors hover:bg-[#e04d00]"
        >
          <Plus className="w-4 h-4" weight="bold" />
          Post a Job
        </Link>}
      </div>

      {/* Form Modal */}
      {showForm && editingJob && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141519] rounded-2xl border border-[rgba(255,255,255,0.08)] w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                Edit job
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 transition-colors"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-7">
              {[
                ["1", "Job details", "Define the role"],
                ["2", "Description", "Sell the opportunity"],
                ["3", "Application", "Screen and publish"],
              ].map(([step, title, subtitle]) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setFormStep(Number(step))}
                  className={`rounded-xl border p-3 text-left transition-colors ${formStep === Number(step) ? "border-[#FF5500] bg-[#FF5500]/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"}`}
                >
                  <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Step {step}</span>
                  <span className="mt-1 block text-sm font-medium text-white">{title}</span>
                  <span className="mt-0.5 block text-xs text-gray-500">{subtitle}</span>
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {formStep === 1 && <>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Job Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Senior Backend Engineer"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Company *</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="e.g. Acme Corp"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Location *</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Remote"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Salary</label>
                  <input
                    value={form.salary}
                    onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                    placeholder="e.g. $120k–$180k"
                    className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Department</label>
                  <input value={form.department} onChange={(e) => setForm((form) => ({ ...form, department: e.target.value }))} placeholder="Engineering" className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm focus:outline-none focus:border-[#FF5500]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Seniority</label>
                  <input value={form.seniority} onChange={(e) => setForm((form) => ({ ...form, seniority: e.target.value }))} placeholder="Senior" className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm focus:outline-none focus:border-[#FF5500]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Remote policy</label>
                  <select value={form.remotePolicy} onChange={(e) => setForm((form) => ({ ...form, remotePolicy: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[#191a1f] border border-[rgba(255,255,255,0.06)] text-white text-sm focus:outline-none focus:border-[#FF5500]">
                    <option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">On-site</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Closing date</label>
                  <input type="date" value={form.closingDate} onChange={(e) => setForm((form) => ({ ...form, closingDate: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm focus:outline-none focus:border-[#FF5500]" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm focus:outline-none focus:border-[#FF5500]"
                >
                  <option value="full-time">Full-time</option>
                  <option value="part-time">Part-time</option>
                  <option value="contract">Contract</option>
                </select>
              </div>
              </>}
              {formStep === 2 && <>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-white">Make the role worth applying for</p>
                <p className="mt-1 text-xs text-gray-500">Explain the mission, impact, responsibilities, and what success looks like.</p>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Job description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={"About the role\n\nWhat you will own\n\nWhat success looks like in the first 90 days"}
                  rows={12}
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500] resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Tags (comma-separated)
                </label>
                <input
                  value={form.tagsInput}
                  onChange={(e) => setForm((f) => ({ ...f, tagsInput: e.target.value }))}
                  placeholder="e.g. React, Node.js, TypeScript"
                  className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500]"
                />
              </div>
              </>}
              {formStep === 3 && <>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Screening questions (one per line)</label>
                <textarea value={form.questionsInput} onChange={(e) => setForm((form) => ({ ...form, questionsInput: e.target.value }))} rows={3} placeholder="How many years have you used TypeScript?" className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#FF5500] resize-none" />
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <p className="text-sm font-medium text-white">Ready to publish?</p>
                <p className="mt-1 text-xs text-gray-500">{form.title || "Untitled role"} will appear on your public careers page. Save a draft if the hiring team still needs to review it.</p>
              </div>
              </>}
            </div>
            <div className="flex items-center justify-between gap-3 mt-6 border-t border-white/[0.06] pt-5">
              <button
                onClick={() => formStep === 1 ? setShowForm(false) : setFormStep((step) => step - 1)}
                className="px-5 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 text-sm hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              >
                {formStep === 1 ? "Cancel" : "Back"}
              </button>
              {formStep < 3 ? (
                <button
                  onClick={() => {
                    if (formStep === 1 && (!form.title || !form.company || !form.location)) {
                      toast.error("Add the title, company, and location first");
                      return;
                    }
                    setFormStep((step) => step + 1);
                  }}
                  className="px-6 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors"
                >
                  Continue
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => handleSubmit("active")} disabled={saving} className="px-6 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors disabled:opacity-60">
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {previewJob && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141519] rounded-2xl border border-white/[0.08] w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/[0.06] p-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">Recruiter preview</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{previewJob.title}</h2>
                <p className="mt-2 text-sm text-gray-400">{previewJob.company} · {previewJob.location}</p>
              </div>
              <button onClick={() => setPreviewJob(null)} className="p-2 rounded-lg hover:bg-white/[0.05] text-gray-400"><X className="w-4 h-4" weight="bold" /></button>
            </div>
            <div className="space-y-6 p-6">
              <div className="flex flex-wrap gap-2">
                {[previewJob.department, previewJob.seniority, previewJob.remote_policy, previewJob.type, previewJob.salary].filter(Boolean).map((value) => (
                  <span key={value} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 text-xs text-gray-300">{value}</span>
                ))}
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">About the role</h3>
                <p className="mt-2 whitespace-pre-line text-sm leading-7 text-gray-400">{previewJob.description || "No description added yet."}</p>
              </div>
              {(previewJob.tags || []).length > 0 && <div className="flex flex-wrap gap-2">{previewJob.tags?.map((tag) => <span key={tag} className="rounded-lg bg-[#FF5500]/10 px-2.5 py-1 text-xs text-[#FF8a55]">{tag}</span>)}</div>}
              <div className="flex items-center justify-between border-t border-white/[0.06] pt-5">
                <p className="text-xs text-gray-500">{previewJob.status === "active" ? "This job is live on your careers site." : `This ${previewJob.status || "draft"} job is visible only to your hiring team.`}</p>
                {previewJob.status === "active" && getPublicJobUrl(previewJob) && <a href={getPublicJobUrl(previewJob)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-[#FF5500] px-4 py-2 text-sm font-medium text-white hover:bg-[#e04d00]">Open public page <ArrowSquareOut className="h-4 w-4" /></a>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <SquircleLoader size={32} label="Loading jobs" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Briefcase className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
          <p className="text-gray-400 font-medium">No jobs posted yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Post your first job listing to start attracting verified talent.
          </p>
          <Link
            href="/recruiter/jobs/new"
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            Post a Job
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] p-6 transition-colors hover:border-[rgba(255,255,255,0.09)]"
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex items-center gap-2.5">
                    <h3 className="text-lg font-semibold text-white">{job.title}</h3>
                    <span className="rounded-full bg-[rgba(255,85,0,0.15)] px-2.5 py-1 text-xs font-medium text-[#FF7A3D]">
                      {job.type}
                    </span>
                  </div>
                  <p className="mb-2 text-sm text-gray-300">
                    {job.company} · {job.location}
                    {job.salary ? ` · ${job.salary}` : ""}
                  </p>
                  {(job.department || job.seniority || job.remote_policy) && <p className="mb-3 text-sm text-gray-500">{[job.department, job.seniority, job.remote_policy].filter(Boolean).join(" · ")}</p>}
                  {job.description && (
                    <p className="mb-4 line-clamp-2 max-w-4xl text-sm leading-6 text-gray-400">
                      {job.description}
                    </p>
                  )}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-xs text-gray-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-shrink-0 items-center gap-2 self-center">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium capitalize text-gray-300">{job.status || "active"}</span>
                  <JobActionsMenu jobTitle={job.title} status={job.status} canManage={canManageJobs} onAction={(action) => handleJobAction(job, action)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog isOpen={Boolean(jobPendingDelete)} onClose={() => setJobPendingDelete(null)} onConfirm={handleDelete} title="Delete job?" message={`This permanently removes “${jobPendingDelete?.title || "this job"}” and its public listing.`} confirmText="Delete job" variant="danger" />
      {pendingAction && confirmationCopy && <ConfirmDialog isOpen onClose={() => setPendingAction(null)} onConfirm={confirmAction} title={confirmationCopy.title} message={confirmationCopy.message} confirmText={confirmationCopy.confirmText} variant={confirmationCopy.variant} />}
    </RecruiterPage>
  );
}
