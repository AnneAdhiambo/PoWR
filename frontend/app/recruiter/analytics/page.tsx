"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, ErrorState, LoadingState, PageHeader, RecruiterPage, StatusBadge } from "../../components/ui";
import { recruiterApiClient } from "../../lib/recruiterApi";

export default function RecruiterAnalyticsPage() {
  const [applications, setApplications] = useState<Array<{ stage?: string; powr_score?: number }> | null>(null);
  const [jobs, setJobs] = useState<Array<{ status?: string }>>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([recruiterApiClient.getApplications(), recruiterApiClient.getMyJobs()])
      .then(([applicationResult, jobResult]) => { setApplications(applicationResult.applications); setJobs(jobResult.jobs); })
      .catch((loadError) => setError(loadError.message || "Could not load hiring analytics"));
  }, []);

  const stages = useMemo(() => {
    const counts = new Map<string, number>();
    (applications || []).forEach((application) => counts.set(application.stage || "applied", (counts.get(application.stage || "applied") || 0) + 1));
    return ["applied", "screening", "interview", "assessment", "offer", "hired"].map((stage) => ({ stage, count: counts.get(stage) || 0 }));
  }, [applications]);
  const total = applications?.length || 0;
  const hired = applications?.filter((item) => item.stage === "hired").length || 0;
  const averageScore = total ? Math.round((applications || []).reduce((sum, item) => sum + Number(item.powr_score || 0), 0) / total) : 0;

  return (
    <RecruiterPage>
      <PageHeader eyebrow="Hiring intelligence" title="Analytics" description="A clear view of pipeline health, evidence quality, and hiring outcomes." />
      {error ? <ErrorState description={error} /> : !applications ? <LoadingState label="Calculating hiring metrics" /> : (
        <div className="space-y-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[["Active jobs", jobs.filter((job) => job.status === "active" || job.status === "published").length], ["Applications", total], ["Average PoWR score", averageScore], ["Hires", hired]].map(([label, value]) => (
              <Card key={label} className="p-5"><p className="text-sm text-gray-500">{label}</p><p className="mt-3 text-3xl font-semibold text-white">{value}</p></Card>
            ))}
          </section>
          <Card className="p-5">
            <div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">Pipeline conversion</h2><p className="mt-1 text-xs text-gray-500">Candidates currently in each hiring stage</p></div><StatusBadge tone="brand">{total} total</StatusBadge></div>
            <div className="mt-6 space-y-4">
              {stages.map(({ stage, count }) => {
                const width = total ? Math.max(4, Math.round((count / total) * 100)) : 0;
                return <div key={stage}><div className="mb-2 flex justify-between text-sm"><span className="capitalize text-gray-300">{stage}</span><span className="font-medium text-white">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400" style={{ width: `${width}%` }} /></div></div>;
              })}
            </div>
          </Card>
        </div>
      )}
    </RecruiterPage>
  );
}
