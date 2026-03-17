"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { Card, Pagination } from "../components/ui";
import { Briefcase, MapPin, CurrencyDollar, Clock, Star, ArrowRight, GridFour, List } from "phosphor-react";
import { savedItems } from "../lib/savedItems";
import toast from "react-hot-toast";

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: "full-time" | "part-time" | "contract";
  posted: string;
  description: string;
  tags: string[];
  matchScore?: number;
}

function JobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId);
  const highlightRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = viewMode === "grid" ? 9 : 5;

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
    
    // Load saved jobs
    const saved = savedItems.getSavedJobs();
    setSavedJobIds(new Set(saved.map(j => j.id)));

    // Load jobs (mock data for now)
    setTimeout(() => {
      setJobs([
        {
          id: "1",
          title: "Senior Backend Engineer",
          company: "TechCorp",
          location: "San Francisco, CA",
          salary: "$120k - $180k",
          type: "full-time",
          posted: "2 days ago",
          description: "We're looking for a senior backend engineer with expertise in Node.js, TypeScript, and distributed systems. You'll work on building scalable APIs and microservices.",
          tags: ["Backend", "Node.js", "TypeScript", "DevOps"],
          matchScore: 92,
        },
        {
          id: "2",
          title: "Full Stack Developer",
          company: "StartupXYZ",
          location: "Remote",
          salary: "$100k - $150k",
          type: "full-time",
          posted: "5 days ago",
          description: "Join our team to build the next generation of web applications. Experience with React, Next.js, and modern backend technologies required.",
          tags: ["React", "Next.js", "Full Stack", "TypeScript"],
          matchScore: 85,
        },
        {
          id: "3",
          title: "DevOps Engineer",
          company: "CloudTech",
          location: "New York, NY",
          salary: "$130k - $190k",
          type: "full-time",
          posted: "1 week ago",
          description: "Looking for a DevOps engineer to help scale our infrastructure. Experience with AWS, Kubernetes, and CI/CD pipelines essential.",
          tags: ["DevOps", "AWS", "Kubernetes", "CI/CD"],
          matchScore: 78,
        },
        {
          id: "4",
          title: "Frontend Engineer",
          company: "DesignStudio",
          location: "Austin, TX",
          salary: "$110k - $160k",
          type: "full-time",
          posted: "3 days ago",
          description: "Build beautiful and performant user interfaces. Strong React skills and eye for design required.",
          tags: ["Frontend", "React", "UI/UX"],
          matchScore: 88,
        },
        {
          id: "5",
          title: "Systems Architect",
          company: "Enterprise Inc",
          location: "Seattle, WA",
          salary: "$150k - $220k",
          type: "full-time",
          posted: "1 week ago",
          description: "Design and architect large-scale distributed systems. Deep understanding of system design and scalability required.",
          tags: ["Systems", "Architecture", "Distributed Systems"],
          matchScore: 75,
        },
        {
          id: "6",
          title: "Backend Developer",
          company: "DataFlow",
          location: "Remote",
          salary: "$90k - $130k",
          type: "full-time",
          posted: "4 days ago",
          description: "Build robust backend services for data processing platform. Experience with Python, FastAPI, and PostgreSQL required.",
          tags: ["Python", "FastAPI", "PostgreSQL", "Backend"],
          matchScore: 82,
        },
        {
          id: "7",
          title: "React Native Developer",
          company: "MobileFirst",
          location: "Los Angeles, CA",
          salary: "$110k - $160k",
          type: "full-time",
          posted: "6 days ago",
          description: "Develop cross-platform mobile applications using React Native. Strong experience with mobile development and app store deployment.",
          tags: ["React Native", "Mobile", "iOS", "Android"],
          matchScore: 79,
        },
        {
          id: "8",
          title: "Cloud Solutions Architect",
          company: "CloudScale",
          location: "Remote",
          salary: "$140k - $200k",
          type: "full-time",
          posted: "1 week ago",
          description: "Design and implement cloud solutions for enterprise clients. AWS, Azure, or GCP certification required.",
          tags: ["Cloud", "AWS", "Architecture", "DevOps"],
          matchScore: 73,
        },
        {
          id: "9",
          title: "UI/UX Designer",
          company: "CreativeStudio",
          location: "Portland, OR",
          salary: "$85k - $120k",
          type: "full-time",
          posted: "3 days ago",
          description: "Create beautiful and intuitive user interfaces. Strong portfolio and experience with design tools required.",
          tags: ["UI/UX", "Design", "Figma", "Prototyping"],
          matchScore: 68,
        },
        {
          id: "10",
          title: "Security Engineer",
          company: "SecureTech",
          location: "Boston, MA",
          salary: "$130k - $180k",
          type: "full-time",
          posted: "5 days ago",
          description: "Ensure security of our platform and applications. Experience with security audits, penetration testing, and compliance required.",
          tags: ["Security", "Cybersecurity", "Compliance", "Audit"],
          matchScore: 71,
        },
        {
          id: "11",
          title: "Data Engineer",
          company: "AnalyticsPro",
          location: "Remote",
          salary: "$115k - $165k",
          type: "full-time",
          posted: "2 days ago",
          description: "Build data pipelines and ETL processes. Experience with Spark, Kafka, and data warehousing required.",
          tags: ["Data Engineering", "Spark", "Kafka", "ETL"],
          matchScore: 77,
        },
        {
          id: "12",
          title: "Machine Learning Engineer",
          company: "AI Innovations",
          location: "San Francisco, CA",
          salary: "$150k - $220k",
          type: "full-time",
          posted: "1 week ago",
          description: "Develop and deploy machine learning models. Strong background in ML, deep learning, and MLOps required.",
          tags: ["Machine Learning", "Python", "TensorFlow", "MLOps"],
          matchScore: 81,
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const filteredJobs = filter === "all" 
    ? jobs 
    : jobs.filter(job => job.type === filter);

  const totalPages = Math.ceil(filteredJobs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedJobs = filteredJobs.slice(startIndex, endIndex);

  // Reset to page 1 when filter or view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, viewMode]);

  // Handle highlight scroll and animation
  useEffect(() => {
    if (highlightId && jobs.length > 0) {
      // Find which page the job is on
      const jobIndex = jobs.findIndex(j => j.id === highlightId);
      if (jobIndex !== -1) {
        const targetPage = Math.floor(jobIndex / itemsPerPage) + 1;
        setCurrentPage(targetPage);
        
        // Scroll to highlighted job after a short delay
        setTimeout(() => {
          highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        
        // Clear highlight after animation
        setTimeout(() => {
          setHighlightedId(null);
          router.replace("/jobs", { scroll: false });
        }, 3000);
      }
    }
  }, [highlightId, jobs, itemsPerPage, router]);

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
              Jobs
            </h1>
            <p className="text-xs text-gray-400" style={{ opacity: 0.6 }}>
              Find opportunities that match your proof of work
            </p>
          </div>

          {/* Filters and View Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {["all", "full-time", "part-time", "contract"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filter === type
                      ? "bg-[#FF5500] text-white"
                      : "bg-[rgba(255,255,255,0.03)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)]"
                  }`}
                >
                  {type === "all" ? "All Jobs" : type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ")}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "grid"
                    ? "bg-[#FF5500] text-white"
                    : "bg-[rgba(255,255,255,0.03)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)]"
                }`}
              >
                <GridFour className="w-4 h-4" weight="regular" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-[#FF5500] text-white"
                    : "bg-[rgba(255,255,255,0.03)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)]"
                }`}
              >
                <List className="w-4 h-4" weight="regular" />
              </button>
            </div>
          </div>

          {/* Jobs List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {viewMode === "list" ? (
                <div className="space-y-4">
                  {paginatedJobs.map((job) => (
                    <div
                      key={job.id}
                      ref={job.id === highlightedId ? highlightRef : null}
                    >
                      <Card
                        className={`p-5 hover:bg-[rgba(255,255,255,0.04)] transition-all cursor-pointer group ${
                          job.id === highlightedId 
                            ? "ring-2 ring-emerald-500/50 bg-emerald-500/5 animate-pulse" 
                            : ""
                        }`}
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
                              <p className="text-sm text-gray-300 mb-1">{job.company}</p>
                            </div>
                        <Star 
                          className={`w-5 h-5 transition-colors cursor-pointer ${
                            savedJobIds.has(job.id)
                              ? "text-[#FF5500]"
                              : "text-gray-500 hover:text-[#FF5500]"
                          }`}
                          weight={savedJobIds.has(job.id) ? "fill" : "regular"}
                          onClick={(e) => {
                            e.stopPropagation();
                            const isSaved = savedJobIds.has(job.id);
                            if (isSaved) {
                              savedItems.unsaveJob(job.id);
                              setSavedJobIds(prev => {
                                const next = new Set(prev);
                                next.delete(job.id);
                                return next;
                              });
                              toast.success("Job removed from saved");
                            } else {
                              savedItems.saveJob({
                                id: job.id,
                                title: job.title,
                                company: job.company,
                                location: job.location,
                                salary: job.salary,
                                type: job.type,
                                posted: job.posted,
                                description: job.description,
                                tags: job.tags,
                                matchScore: job.matchScore,
                              });
                              setSavedJobIds(prev => new Set(prev).add(job.id));
                              toast.success("Job saved");
                            }
                          }}
                        />
                          </div>

                          <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" weight="regular" />
                              <span>{job.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CurrencyDollar className="w-4 h-4" weight="regular" />
                              <span>{job.salary}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" weight="regular" />
                              <span>{job.posted}</span>
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedJobs.map((job) => (
                    <Card
                      key={job.id}
                      className="p-5 hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer group flex flex-col"
                      onClick={() => router.push(`/jobs/${job.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-white group-hover:text-[#FF5500] transition-colors">
                              {job.title}
                            </h3>
                            {job.matchScore && (
                              <span className="px-2 py-0.5 rounded-full bg-[#FF5500] text-white text-xs font-medium">
                                {job.matchScore}%
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-300 mb-2">{job.company}</p>
                        </div>
                        <Star 
                          className={`w-4 h-4 transition-colors cursor-pointer flex-shrink-0 ${
                            savedJobIds.has(job.id)
                              ? "text-[#FF5500]"
                              : "text-gray-500 hover:text-[#FF5500]"
                          }`}
                          weight={savedJobIds.has(job.id) ? "fill" : "regular"}
                          onClick={(e) => {
                            e.stopPropagation();
                            const isSaved = savedJobIds.has(job.id);
                            if (isSaved) {
                              savedItems.unsaveJob(job.id);
                              setSavedJobIds(prev => {
                                const next = new Set(prev);
                                next.delete(job.id);
                                return next;
                              });
                              toast.success("Job removed from saved");
                            } else {
                              savedItems.saveJob({
                                id: job.id,
                                title: job.title,
                                company: job.company,
                                location: job.location,
                                salary: job.salary,
                                type: job.type,
                                posted: job.posted,
                                description: job.description,
                                tags: job.tags,
                                matchScore: job.matchScore,
                              });
                              setSavedJobIds(prev => new Set(prev).add(job.id));
                              toast.success("Job saved");
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2 mb-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" weight="regular" />
                          <span className="truncate">{job.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CurrencyDollar className="w-3.5 h-3.5" weight="regular" />
                          <span>{job.salary}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" weight="regular" />
                          <span>{job.posted}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mb-3 line-clamp-3 flex-1" style={{ opacity: 0.7 }}>
                        {job.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {job.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.03)] text-xs text-gray-400 border border-[rgba(255,255,255,0.04)]"
                          >
                            {tag}
                          </span>
                        ))}
                        {job.tags.length > 3 && (
                          <span className="px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.03)] text-xs text-gray-400 border border-[rgba(255,255,255,0.04)]">
                            +{job.tags.length - 3}
                          </span>
                        )}
                      </div>

                      <button 
                        className="flex items-center justify-center gap-1 text-xs text-[#FF5500] hover:text-[#4d85f0] transition-colors mt-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/jobs/${job.id}`);
                        }}
                      >
                        View Details
                        <ArrowRight className="w-3.5 h-3.5" weight="regular" />
                      </button>
                    </Card>
                  ))}
                </div>
              )}

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

          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-gray-500 mx-auto mb-4" weight="regular" />
              <p className="text-gray-400 mb-2">No jobs found</p>
              <p className="text-xs text-gray-500" style={{ opacity: 0.6 }}>
                Try adjusting your filters
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <JobsPageContent />
    </Suspense>
  );
}

