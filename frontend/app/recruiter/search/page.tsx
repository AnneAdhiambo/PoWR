"use client";
import React, { useEffect, useState, useCallback } from "react";
import { SearchFilters, SearchFilterValues } from "../../components/recruiter/SearchFilters";
import { DeveloperCard, DeveloperCardData } from "../../components/recruiter/DeveloperCard";
import { recruiterApiClient } from "../../lib/recruiterApi";
import { CaretDown, Users } from "phosphor-react";
import toast from "react-hot-toast";

type SortKey = "overallIndex" | "lastActive" | "proofCount";
type SourcedDeveloper = DeveloperCardData & {
  jobMatchScore?: number;
  matchSnapshotId?: number;
  matchExplanation?: {
    matchedRequiredSkills: string[];
    missingRequiredSkills: string[];
    matchedPreferredSkills: string[];
    requiredSkillCoverage: number;
  };
};

const SORT_LABELS: Record<SortKey, string> = {
  overallIndex: "PoW Score",
  lastActive: "Last Active",
  proofCount: "Proof Count",
};

export default function RecruiterSearchPage() {
  const [developers, setDevelopers] = useState<SourcedDeveloper[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("overallIndex");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [contactUsername, setContactUsername] = useState<string | null>(null);
  const [contactMsg, setContactMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [jobs, setJobs] = useState<Array<{ id: number; title: string; status?: string }>>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | undefined>();
  const [lastFilters, setLastFilters] = useState<SearchFilterValues>({
    skills: [], minScore: 0, maxScore: 100, activeWithin: undefined, hasOnChainProof: false
  });

  useEffect(() => {
    recruiterApiClient.getMyJobs()
      .then((jobResult) => {
        setJobs(jobResult.jobs.filter((job: any) => job.status !== "archived"));
      })
      .catch(() => toast.error("Could not load jobs"));
  }, []);

  const runSearch = useCallback(async (f: SearchFilterValues, p: number, sort: SortKey) => {
    setLoading(true);
    try {
      const result = await recruiterApiClient.searchDevelopers({
        jobId: selectedJobId,
        skills: f.skills.length ? f.skills : undefined,
        minScore: f.minScore > 0 ? f.minScore : undefined,
        maxScore: f.maxScore < 100 ? f.maxScore : undefined,
        activeWithin: f.activeWithin,
        hasOnChainProof: f.hasOnChainProof || undefined,
        page: p,
        limit: 20,
      });
      // Client-side sort
      const sorted = [...result.developers].sort((a: any, b: any) => {
        if (sort === "lastActive") return new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime();
        if (sort === "proofCount") return (b.proofCount || 0) - (a.proofCount || 0);
        return (b.overallIndex || 0) - (a.overallIndex || 0);
      });
      setDevelopers(sorted);
      setTotal(result.total);
      setHasSearched(true);
    } catch (error: any) {
      toast.error(error.message || "Search failed");
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  const handleApply = (f: SearchFilterValues) => {
    setLastFilters(f);
    setPage(1);
    runSearch(f, 1, sortKey);
  };

  const handleSort = (key: SortKey) => {
    setSortKey(key);
    setShowSortMenu(false);
    if (hasSearched) {
      const sorted = [...developers].sort((a: any, b: any) => {
        if (key === "lastActive") return new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime();
        if (key === "proofCount") return (b.proofCount || 0) - (a.proofCount || 0);
        return (b.overallIndex || 0) - (a.overallIndex || 0);
      });
      setDevelopers(sorted);
    }
  };

  const handleShortlist = async (username: string) => {
    if (!selectedJobId) {
      toast.error("Select a job before adding a developer");
      return;
    }
    const developer = developers.find((item) => item.username === username);
    if (!developer?.matchSnapshotId) {
      toast.error("Run the search for the selected job first");
      return;
    }
    await addToSelectedJob(developer);
  };

  const addToSelectedJob = async (developer: SourcedDeveloper) => {
    if (!selectedJobId || !developer.matchSnapshotId) return;
    try {
      await recruiterApiClient.addSourcedCandidateToJob(selectedJobId, developer.username, developer.matchSnapshotId);
      toast.success(`${developer.username} added to the job`);
    } catch (error: any) {
      toast.error(error.message || "Could not add developer to job");
    }
  };

  const handleContact = (username: string) => {
    setContactUsername(username);
    setContactMsg("");
  };

  const handleSendContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactUsername) return;
    setSending(true);
    try {
      await recruiterApiClient.contactDeveloper(contactUsername, contactMsg);
      toast.success("Request sent!");
      setContactUsername(null);
    } catch (error: any) {
      if (error.upgradeRequired) toast.error("Outreach requires a Pro plan.");
      else toast.error(error.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Filter sidebar */}
      <div className="w-full flex-shrink-0 border-b border-[rgba(255,255,255,0.04)] p-4 sm:p-6 lg:w-64 lg:border-b-0 lg:border-r">
        <SearchFilters onApply={handleApply} loading={loading} />
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1 p-4 sm:p-8">
        <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <label htmlFor="source-job" className="mb-2 block text-xs font-medium uppercase tracking-wider text-gray-500">Source for a job</label>
          <select
            id="source-job"
            value={selectedJobId || ""}
            onChange={(event) => setSelectedJobId(event.target.value ? Number(event.target.value) : undefined)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#12141a] px-3 py-2.5 text-sm text-white"
          >
            <option value="">General talent search</option>
            {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
          <p className="mt-2 text-xs text-gray-500">Selecting a job creates an explainable role-fit snapshot while keeping the global PoWR Score separate.</p>
        </div>

        {/* Page header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Talent Search</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {hasSearched ? `${total} Developer${total !== 1 ? "s" : ""} Found` : "Search for verified talent"}
            </p>
          </div>
          {/* Sort */}
          <div className="relative">
            <button
              onClick={() => setShowSortMenu(v => !v)}
              className="flex items-center gap-2 px-4 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
            >
              Sort by: <span className="text-white font-medium">{SORT_LABELS[sortKey]}</span>
              <CaretDown className="w-3.5 h-3.5" weight="bold" />
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#12141a] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-xl overflow-hidden z-20 min-w-[160px]">
                {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                  <button key={key} onClick={() => handleSort(key)}
                    className={`w-full px-4 py-2.5 text-sm text-left transition-colors ${sortKey === key ? "text-white bg-[rgba(255,255,255,0.06)]" : "text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.04)]"}`}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Count header */}
        {hasSearched && total > 0 && (
          <div className="flex items-center gap-1.5 mb-5">
            <span className="text-2xl font-bold text-white tabular-nums">{total}</span>
            <span className="text-base text-gray-500">Developers Found</span>
          </div>
        )}

        {/* Empty / initial state */}
        {!hasSearched && !loading && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Users className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
            <p className="text-gray-400 font-medium mb-1">Find verified talent</p>
            <p className="text-sm text-gray-600 max-w-sm">
              Select skills and click "Apply Filters" to discover developers with verified on-chain credentials.
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-64 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && hasSearched && developers.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {developers.map(dev => (
              <div key={dev.username}>
                <DeveloperCard
                  developer={dev}
                  onShortlist={handleShortlist}
                  shortlistLabel="Add to job"
                  onContact={handleContact}
                />
                {dev.jobMatchScore !== undefined && (
                  <div className="-mt-3 border-x border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-emerald-300">Role match</span>
                      <span className="text-lg font-semibold text-white">{dev.jobMatchScore}%</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {dev.matchExplanation?.requiredSkillCoverage ?? 0}% required-skill coverage
                      {dev.matchExplanation?.missingRequiredSkills?.length
                        ? ` · Missing ${dev.matchExplanation.missingRequiredSkills.join(", ")}`
                        : " · All required skills matched"}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && hasSearched && developers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Users className="w-16 h-16 text-gray-800 mb-4" weight="regular" />
            <p className="text-gray-400 font-medium">No developers found</p>
            <p className="text-sm text-gray-600 mt-1">Try adjusting your filters or removing skill requirements.</p>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button onClick={() => { const p = page-1; setPage(p); runSearch(lastFilters, p, sortKey); }} disabled={page === 1}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-30 transition-colors">
              Previous
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button onClick={() => { const p = page+1; setPage(p); runSearch(lastFilters, p, sortKey); }} disabled={page === totalPages}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] disabled:opacity-30 transition-colors">
              Next
            </button>
          </div>
        )}
      </div>

      {/* Contact modal */}
      {contactUsername && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12141a] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-1">Contact @{contactUsername}</h3>
            <p className="text-sm text-gray-500 mb-4">Send a connection request.</p>
            <form onSubmit={handleSendContact} className="space-y-4">
              <textarea value={contactMsg} onChange={e => setContactMsg(e.target.value)}
                placeholder="Introduce yourself and your opportunity..."
                rows={4}
                className="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,85,0,0.5)] resize-none" />
              <div className="flex gap-3">
                <button type="button" onClick={() => setContactUsername(null)}
                  className="flex-1 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-300 text-sm font-medium hover:bg-[rgba(255,255,255,0.08)] transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={sending || !contactMsg.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors disabled:opacity-50">
                  {sending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
