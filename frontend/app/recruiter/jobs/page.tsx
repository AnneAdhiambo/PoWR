"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus, Pencil, Trash, X, Copy, ArrowSquareOut } from "phosphor-react";
import { recruiterApiClient } from "../../lib/recruiterApi";
import toast from "react-hot-toast";

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
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formStep, setFormStep] = useState(1);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const { jobs } = await recruiterApiClient.getMyJobs();
      setJobs(jobs);
    } catch {
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingJob(null);
    setForm(emptyForm);
    setFormStep(1);
    setShowForm(true);
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

  const handleDelete = async (id: string | number) => {
    if (!confirm("Delete this job listing?")) return;
    try {
      await recruiterApiClient.deleteJob(String(id));
      setJobs((prev) => prev.filter((j) => String(j.id) !== String(id)));
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
      toast.success("Draft copy created");
    } catch { toast.error("Failed to duplicate job"); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Jobs</h1>
          <p className="text-sm text-gray-500 mt-1">Post and manage job listings</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" weight="bold" />
          Post a Job
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141519] rounded-2xl border border-[rgba(255,255,255,0.08)] w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                {editingJob ? "Edit job" : "Create a job"}
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
                  {!editingJob && <button onClick={() => handleSubmit("draft")} disabled={saving} className="px-5 py-2.5 rounded-lg border border-white/[0.1] text-gray-300 text-sm hover:bg-white/[0.05] disabled:opacity-60">Save draft</button>}
                  <button onClick={() => handleSubmit("active")} disabled={saving} className="px-6 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors disabled:opacity-60">
                    {saving ? "Saving..." : editingJob ? "Save changes" : "Publish job"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Jobs List */}
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <Briefcase className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
          <p className="text-gray-400 font-medium">No jobs posted yet</p>
          <p className="text-sm text-gray-600 mt-1">
            Post your first job listing to start attracting verified talent.
          </p>
          <button
            onClick={openCreate}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" weight="bold" />
            Post a Job
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-2xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-white">{job.title}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,85,0,0.15)] text-[#FF6B2B]">
                      {job.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">
                    {job.company} · {job.location}
                    {job.salary ? ` · ${job.salary}` : ""}
                  </p>
                  {(job.department || job.seniority || job.remote_policy) && <p className="text-[11px] text-gray-500 mb-2">{[job.department, job.seniority, job.remote_policy].filter(Boolean).join(" · ")}</p>}
                  {job.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {job.description}
                    </p>
                  )}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.04)] text-gray-400 border border-[rgba(255,255,255,0.04)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] px-2 py-1 rounded-full bg-white/10 text-gray-300 capitalize">{job.status || "active"}</span>
                  {job.status === "active" ? <button onClick={() => setJobStatus(job, "paused")} className="text-xs text-gray-400 hover:text-white">Pause</button> : job.status !== "archived" ? <button onClick={() => setJobStatus(job, "active")} className="text-xs text-[#FF8a55] hover:text-white">Publish</button> : null}
                  {job.status !== "closed" && job.status !== "archived" && <button onClick={() => setJobStatus(job, "closed")} className="text-xs text-gray-400 hover:text-white">Close</button>}
                  {job.status !== "archived" && <button onClick={() => setJobStatus(job, "archived")} className="text-xs text-gray-400 hover:text-white">Archive</button>}
                  {job.public_slug && <a href={`/jobs/${job.public_slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white" title="Preview"><ArrowSquareOut className="w-4 h-4" /></a>}
                  <button onClick={() => duplicateJob(job)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white" title="Duplicate"><Copy className="w-4 h-4" /></button>
                  <button
                    onClick={() => openEdit(job)}
                    className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] text-gray-400 hover:text-white transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" weight="regular" />
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash className="w-4 h-4" weight="regular" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
