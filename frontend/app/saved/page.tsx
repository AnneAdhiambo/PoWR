"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { Card, Pagination, ConfirmDialog } from "../components/ui";
import { Briefcase, FileText, MapPin, CurrencyDollar, Clock, Star, ArrowRight, Trash, User } from "phosphor-react";
import { savedItems, SavedJob, SavedGig } from "../lib/savedItems";
import toast from "react-hot-toast";

export default function SavedPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedGigs, setSavedGigs] = useState<SavedGig[]>([]);
  const [activeTab, setActiveTab] = useState<"jobs" | "gigs">("jobs");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; type: "job" | "gig"; id: string; title: string }>({
    isOpen: false,
    type: "job",
    id: "",
    title: ""
  });
  const itemsPerPage = 5;

  useEffect(() => {
    const storedUsername = localStorage.getItem("github_username");
    const storedEmail = localStorage.getItem("github_email");
    
    if (storedUsername) {
      setUsername(storedUsername);
      setDisplayName(storedUsername);
    }
    if (storedEmail) {
      setUserEmail(storedEmail);
    }

    loadSavedItems();
  }, []);

  const loadSavedItems = () => {
    setSavedJobs(savedItems.getSavedJobs());
    setSavedGigs(savedItems.getSavedGigs());
  };

  const openDeleteDialog = (type: "job" | "gig", id: string, title: string) => {
    setDeleteDialog({ isOpen: true, type, id, title });
  };

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, type: "job", id: "", title: "" });
  };

  const handleConfirmDelete = () => {
    if (deleteDialog.type === "job") {
      savedItems.unsaveJob(deleteDialog.id);
      toast.success("Job removed from saved");
    } else {
      savedItems.unsaveGig(deleteDialog.id);
      toast.success("Gig removed from saved");
    }
    loadSavedItems();
    closeDeleteDialog();
  };

  const currentItems = activeTab === "jobs" ? savedJobs : savedGigs;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = currentItems.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#0b0c0f] flex">
      <Sidebar 
        username={username} 
        email={userEmail || undefined}
        displayName={displayName}
      />

      <div className="flex-1 overflow-y-auto ml-60">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold text-white tracking-tight mb-1.5" style={{ fontWeight: 500 }}>
              Saved Items
            </h1>
            <p className="text-xs text-gray-400" style={{ opacity: 0.6 }}>
              Your favorite jobs and gigs
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6">
            <button
              onClick={() => setActiveTab("jobs")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "jobs"
                  ? "bg-[#FF5500] text-white"
                  : "bg-[rgba(255,255,255,0.03)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" weight="regular" />
                <span>Jobs ({savedJobs.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab("gigs")}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "gigs"
                  ? "bg-[#FF5500] text-white"
                  : "bg-[rgba(255,255,255,0.03)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" weight="regular" />
                <span>Gigs ({savedGigs.length})</span>
              </div>
            </button>
          </div>

          {/* Items List */}
          {paginatedItems.length === 0 ? (
            <div className="text-center py-12">
              {activeTab === "jobs" ? (
                <Briefcase className="w-12 h-12 text-gray-500 mx-auto mb-4" weight="regular" />
              ) : (
                <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" weight="regular" />
              )}
              <p className="text-gray-400 mb-2">No saved {activeTab} yet</p>
              <p className="text-xs text-gray-500" style={{ opacity: 0.6 }}>
                Start saving {activeTab === "jobs" ? "jobs" : "gigs"} you're interested in
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {activeTab === "jobs" ? (
                  paginatedItems.map((job) => (
                    <Card
                      key={job.id}
                      className="p-5 hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer group"
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-base font-semibold text-white group-hover:text-[#FF5500] transition-colors">
                                  {job.title}
                                </h3>
                                {job.matchScore && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#FF5500] text-white text-xs font-medium">
                                    {job.matchScore}% match
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-300 mb-1">{'company' in job ? job.company : 'client' in job ? job.client : ''}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className="w-5 h-5 text-[#FF5500]" weight="fill" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog("job", job.id, job.title);
                                }}
                                className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                              >
                                <Trash className="w-4 h-4 text-gray-500 hover:text-red-400" weight="regular" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" weight="regular" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CurrencyDollar className="w-4 h-4" weight="regular" />
                              <span>{'salary' in job ? job.salary : 'rate' in job ? job.rate : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" weight="regular" />
                              <span>Saved {new Date(job.savedAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <p className="text-sm text-gray-400 mb-3 line-clamp-2" style={{ opacity: 0.7 }}>
                            {job.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                              {job.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.03)] text-xs text-gray-400 border border-[rgba(255,255,255,0.04)]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <button 
                              className="flex items-center gap-1 text-xs text-[#FF5500] hover:text-[#4d85f0] transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/jobs/${job.id}`);
                              }}
                            >
                              View Details
                              <ArrowRight className="w-3.5 h-3.5" weight="regular" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  paginatedItems.map((gig) => (
                    <Card
                      key={gig.id}
                      className="p-5 hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer group"
                      onClick={() => router.push(`/gigs/${gig.id}`)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-base font-semibold text-white group-hover:text-[#FF5500] transition-colors">
                                  {gig.title}
                                </h3>
                                {gig.matchScore && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#FF5500] text-white text-xs font-medium">
                                    {gig.matchScore}% match
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-gray-400" weight="regular" />
                                <p className="text-sm text-gray-300">{'client' in gig ? gig.client : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className="w-5 h-5 text-[#FF5500]" weight="fill" />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDeleteDialog("gig", gig.id, gig.title);
                                }}
                                className="p-1 rounded hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                              >
                                <Trash className="w-4 h-4 text-gray-500 hover:text-red-400" weight="regular" />
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" weight="regular" />
                              <span>{gig.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CurrencyDollar className="w-4 h-4" weight="regular" />
                              <span>{'rate' in gig ? gig.rate : ''}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" weight="regular" />
                              <span>Saved {new Date(gig.savedAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          <p className="text-sm text-gray-400 mb-3 line-clamp-2" style={{ opacity: 0.7 }}>
                            {gig.description}
                          </p>

                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                              {gig.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.03)] text-xs text-gray-400 border border-[rgba(255,255,255,0.04)]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <button 
                              className="flex items-center gap-1 text-xs text-[#FF5500] hover:text-[#4d85f0] transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/gigs/${gig.id}`);
                              }}
                            >
                              View Details
                              <ArrowRight className="w-3.5 h-3.5" weight="regular" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title={`Remove ${deleteDialog.type === "job" ? "Job" : "Gig"}`}
        message={`Are you sure you want to remove "${deleteDialog.title}" from your saved items? This action cannot be undone.`}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}


