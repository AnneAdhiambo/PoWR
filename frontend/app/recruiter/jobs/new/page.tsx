"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Briefcase,
  Check,
  FileText,
  MapPin,
  Question,
  Users,
} from "phosphor-react";
import { useRecruiterContext } from "../../../components/recruiter/RecruiterContext";
import {
  Field,
  RecruiterPage,
  Select,
  controlClassName,
} from "../../../components/ui";
import { recruiterApiClient } from "../../../lib/recruiterApi";

interface JobFormState {
  title: string;
  department: string;
  type: string;
  seniority: string;
  remotePolicy: string;
  location: string;
  salary: string;
  closingDate: string;
  description: string;
  tagsInput: string;
  questionsInput: string;
}

const initialForm: JobFormState = {
  title: "",
  department: "",
  type: "full-time",
  seniority: "",
  remotePolicy: "hybrid",
  location: "",
  salary: "",
  closingDate: "",
  description: "",
  tagsInput: "",
  questionsInput: "",
};

const sections = [
  { id: "role", label: "Role details", icon: Briefcase },
  { id: "location", label: "Workplace", icon: MapPin },
  { id: "description", label: "Job description", icon: FileText },
  { id: "application", label: "Application", icon: Question },
];

export default function NewRecruiterJobPage() {
  const router = useRouter();
  const { organization, canManageJobs, loading } = useRecruiterContext();
  const [form, setForm] = useState<JobFormState>(initialForm);
  const [saving, setSaving] = useState<"draft" | "active" | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const skills = useMemo(
    () => form.tagsInput.split(",").map((value) => value.trim()).filter(Boolean),
    [form.tagsInput]
  );

  const questions = useMemo(
    () => form.questionsInput.split("\n").map((value) => value.trim()).filter(Boolean),
    [form.questionsInput]
  );

  function updateField<Key extends keyof JobFormState>(field: Key, value: JobFormState[Key]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validate() {
    const nextErrors: Record<string, string> = {};
    if (!form.title.trim()) nextErrors.title = "Add a job title.";
    if (!form.location.trim()) nextErrors.location = "Add the location candidates should see.";
    if (!form.description.trim()) nextErrors.description = "Describe the role and what success looks like.";
    if (form.description.trim().length > 0 && form.description.trim().length < 80) {
      nextErrors.description = "Add a little more detail so candidates can evaluate the role.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function submit(status: "draft" | "active") {
    if (!canManageJobs) {
      toast.error("You do not have permission to create jobs");
      return;
    }
    if (!validate()) {
      toast.error("Complete the required fields before continuing");
      document.querySelector("[aria-invalid='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    try {
      setSaving(status);
      await recruiterApiClient.createJob({
        title: form.title.trim(),
        company: organization?.displayName || "Your organization",
        location: form.location.trim(),
        salary: form.salary.trim() || undefined,
        type: form.type,
        description: form.description.trim(),
        tags: skills,
        department: form.department.trim() || undefined,
        remote_policy: form.remotePolicy,
        seniority: form.seniority.trim() || undefined,
        closing_date: form.closingDate || undefined,
        screening_questions: questions,
        status,
      });
      toast.success(status === "active" ? "Job published" : "Draft saved");
      router.push("/recruiter/jobs");
      router.refresh();
    } catch {
      toast.error("Failed to save job");
    } finally {
      setSaving(null);
    }
  }

  if (!loading && !canManageJobs) {
    return (
      <RecruiterPage className="max-w-4xl">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-8">
          <h1 className="text-xl font-semibold text-white">You cannot create jobs</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Ask an organization owner or administrator to update your role.</p>
          <Link href="/recruiter/jobs" className="mt-6 inline-flex text-sm font-semibold text-white hover:text-gray-300">Back to jobs</Link>
        </div>
      </RecruiterPage>
    );
  }

  return (
    <RecruiterPage className="max-w-[1480px]">
      <div className="border-b border-white/[0.07] pb-6">
        <Link href="/recruiter/jobs" className="inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white">
          <ArrowLeft size={16} />
          Back to jobs
        </Link>
        <div className="mt-5 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-gray-400">New job</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">Create a role candidates understand</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">Build a clear job brief for {organization?.displayName || "your organization"}. You can save it privately or publish it to your careers page.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => submit("draft")} disabled={Boolean(saving)} className="rounded-[var(--radius-control)] border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-gray-200 transition-colors hover:bg-white/[0.05] disabled:opacity-50">
              {saving === "draft" ? "Saving…" : "Save draft"}
            </button>
            <button type="button" onClick={() => submit("active")} disabled={Boolean(saving)} className="rounded-[var(--radius-control)] bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-orange-hover)] disabled:opacity-50">
              {saving === "active" ? "Publishing…" : "Publish job"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-7 grid gap-7 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <aside className="hidden xl:block">
          <nav aria-label="Job form sections" className="sticky top-8 space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <a key={id} href={`#${id}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-white">
                <Icon size={17} />
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <form onSubmit={(event) => event.preventDefault()} className="min-w-0 space-y-5">
          <FormSection id="role" title="Role details" description="Start with the information candidates use to decide whether a role is relevant.">
            <Field label="Job title" required error={errors.title}>
              <input value={form.title} onChange={(event) => updateField("title", event.target.value)} placeholder="Senior Backend Engineer" className={controlClassName} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Department">
                <input value={form.department} onChange={(event) => updateField("department", event.target.value)} placeholder="Engineering" className={controlClassName} />
              </Field>
              <Field label="Employment type">
                <Select ariaLabel="Employment type" value={form.type} onValueChange={(value) => updateField("type", value)} options={[
                  { value: "full-time", label: "Full-time", description: "A permanent role with regular working hours" },
                  { value: "part-time", label: "Part-time", description: "A permanent role with reduced weekly hours" },
                  { value: "contract", label: "Contract", description: "A fixed-term or project-based engagement" },
                ]} />
              </Field>
            </div>
            <Field label="Seniority" description="Use the level your team uses internally.">
              <input value={form.seniority} onChange={(event) => updateField("seniority", event.target.value)} placeholder="Senior" className={controlClassName} />
            </Field>
          </FormSection>

          <FormSection id="location" title="Workplace and compensation" description="Set clear expectations before a candidate applies.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Workplace policy">
                <Select ariaLabel="Workplace policy" value={form.remotePolicy} onValueChange={(value) => updateField("remotePolicy", value)} options={[
                  { value: "remote", label: "Remote", description: "Candidates can work away from an office" },
                  { value: "hybrid", label: "Hybrid", description: "A planned mix of office and remote work" },
                  { value: "onsite", label: "On-site", description: "Work is primarily based at your workplace" },
                ]} />
              </Field>
              <Field label="Location" required error={errors.location}>
                <input value={form.location} onChange={(event) => updateField("location", event.target.value)} placeholder="Nairobi, Kenya or Remote" className={controlClassName} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Salary range" description="Optional, but transparent ranges improve candidate trust.">
                <input value={form.salary} onChange={(event) => updateField("salary", event.target.value)} placeholder="$120,000 – $160,000" className={controlClassName} />
              </Field>
              <Field label="Closing date">
                <input type="date" value={form.closingDate} onChange={(event) => updateField("closingDate", event.target.value)} className={controlClassName} />
              </Field>
            </div>
          </FormSection>

          <FormSection id="description" title="Job description" description="Explain the work, the impact, and what a strong first few months look like.">
            <Field label="About the role" required error={errors.description} description="Include responsibilities, outcomes, and the experience needed to succeed.">
              <textarea value={form.description} onChange={(event) => updateField("description", event.target.value)} rows={14} placeholder={"Why this role exists\n\nWhat you will own\n\nWhat success looks like\n\nWhat you bring"} className={`${controlClassName} resize-y leading-6`} />
            </Field>
            <Field label="Skills" description="Separate skills with commas. PoWR uses these to surface relevant developers.">
              <input value={form.tagsInput} onChange={(event) => updateField("tagsInput", event.target.value)} placeholder="TypeScript, Node.js, PostgreSQL" className={controlClassName} />
            </Field>
            {skills.length > 0 && <div className="flex flex-wrap gap-2">{skills.map((skill) => <span key={skill} className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-gray-300">{skill}</span>)}</div>}
          </FormSection>

          <FormSection id="application" title="Application questions" description="Ask only what your team will use when reviewing candidates.">
            <Field label="Screening questions" description="Add one question per line. Candidates answer these when applying.">
              <textarea value={form.questionsInput} onChange={(event) => updateField("questionsInput", event.target.value)} rows={6} placeholder={"Tell us about a similar system you have shipped.\nWhat timezone do you work from?"} className={`${controlClassName} resize-y leading-6`} />
            </Field>
            {questions.length > 0 && <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">Candidate form preview</p><ol className="mt-3 space-y-3">{questions.map((question, index) => <li key={`${question}-${index}`} className="flex gap-3 text-sm text-gray-300"><span className="text-gray-600">{index + 1}.</span>{question}</li>)}</ol></div>}
          </FormSection>

          <div className="flex flex-col-reverse justify-between gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center">
            <Link href="/recruiter/jobs" className="px-3 py-2 text-center text-sm font-medium text-gray-400 hover:text-white">Cancel</Link>
            <div className="flex gap-2">
              <button type="button" onClick={() => submit("draft")} disabled={Boolean(saving)} className="flex-1 rounded-[var(--radius-control)] border border-white/[0.12] px-4 py-2.5 text-sm font-semibold text-gray-200 hover:bg-white/[0.05] disabled:opacity-50 sm:flex-none">Save draft</button>
              <button type="button" onClick={() => submit("active")} disabled={Boolean(saving)} className="flex-1 rounded-[var(--radius-control)] bg-[var(--brand-orange)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-orange-hover)] disabled:opacity-50 sm:flex-none">Publish job</button>
            </div>
          </div>
        </form>

        <aside className="hidden xl:block">
          <div className="sticky top-8 space-y-4">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-white/[0.05] text-gray-300"><Users size={18} /></div>
                <div><p className="text-sm font-semibold text-white">Candidate view</p><p className="text-xs text-gray-500">What applicants will see</p></div>
              </div>
              <div className="mt-5 border-t border-white/[0.07] pt-5">
                <p className="text-lg font-semibold text-white">{form.title || "Untitled role"}</p>
                <p className="mt-1 text-sm text-gray-400">{organization?.displayName || "Your organization"}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {[form.location, form.type, form.remotePolicy].filter(Boolean).map((value) => <span key={value} className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs capitalize text-gray-400">{value}</span>)}
                </div>
                <p className="mt-5 line-clamp-6 whitespace-pre-line text-sm leading-6 text-gray-500">{form.description || "Your role description will appear here as you write it."}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-white/[0.08] p-5">
              <p className="text-sm font-semibold text-white">Before publishing</p>
              <ChecklistItem complete={Boolean(form.title.trim())}>Clear job title</ChecklistItem>
              <ChecklistItem complete={Boolean(form.location.trim())}>Workplace location</ChecklistItem>
              <ChecklistItem complete={form.description.trim().length >= 80}>Useful role description</ChecklistItem>
              <ChecklistItem complete={skills.length > 0}>Skills for PoWR matching</ChecklistItem>
            </div>
          </div>
        </aside>
      </div>
    </RecruiterPage>
  );
}

function FormSection({ id, title, description, children }: { id: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.025]">
      <div className="border-b border-white/[0.07] px-5 py-5 sm:px-6">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      </div>
      <div className="space-y-5 px-5 py-6 sm:px-6">{children}</div>
    </section>
  );
}

function ChecklistItem({ complete, children }: { complete: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
      <span className={`flex size-5 items-center justify-center rounded-full border ${complete ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-white/[0.1] text-transparent"}`}>
        <Check size={12} weight="bold" />
      </span>
      {children}
    </div>
  );
}
