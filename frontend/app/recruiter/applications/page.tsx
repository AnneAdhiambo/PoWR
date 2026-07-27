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
}

export default function RecruiterApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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

  const visible = useMemo(
    () => filter === "all" ? applications : applications.filter((application) => application.stage === filter),
    [applications, filter],
  );

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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-[#FF5500]">Hiring pipeline</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Applications</h1>
          <p className="mt-2 text-sm text-gray-400">Review applicants and coordinate every hiring decision.</p>
        </div>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded-[var(--radius-control)] border border-white/10 bg-[#12141a] px-3 py-2.5 text-sm capitalize text-white outline-none focus:border-[#FF5500]">
          <option value="all">All stages</option>
          {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
        </select>
      </div>

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
                  </div>
                  <p className="mt-1 text-sm text-gray-400">{application.job_title} · {application.applicant_email}</p>
                  {application.cover_note && <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">{application.cover_note}</p>}
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
