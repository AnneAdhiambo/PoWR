"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { Card, Pagination } from "../components/ui";
import { FileText, MapPin, CurrencyDollar, Clock, Star, ArrowRight, User, GridFour, List } from "phosphor-react";
import { savedItems } from "../lib/savedItems";
import { apiClient } from "../lib/api";
import toast from "react-hot-toast";

function formatPosted(dateStr?: string): string {
  if (!dateStr) return "Recently";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

interface Gig {
  id: string;
  title: string;
  client: string;
  location: string;
  rate: string;
  duration: string;
  posted: string;
  description: string;
  tags: string[];
  matchScore?: number;
  proposals?: number;
}

function GigsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [savedGigIds, setSavedGigIds] = useState<Set<string>>(new Set());
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
    
    // Load saved gigs
    const saved = savedItems.getSavedGigs();
    setSavedGigIds(new Set(saved.map(g => g.id)));

    // Load gigs from API
    apiClient.getGigs({ limit: 100 })
      .then(({ gigs: apiGigs }) => {
        setGigs(apiGigs.map(g => ({
          id: String(g.id),
          title: g.title,
          client: g.client,
          location: g.location,
          rate: g.rate || "",
          duration: g.duration || "",
          posted: formatPosted(g.created_at),
          description: g.description || "",
          tags: g.tags || [],
        })));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    if (false) {
      setTimeout(() => {
      setGigs([
        {
          id: "1",
          title: "Build React Dashboard Component",
          client: "Tech Startup",
          location: "Remote",
          rate: "$80 - $120/hr",
          duration: "2-4 weeks",
          posted: "1 day ago",
          description: "Looking for an experienced React developer to build a modern dashboard component with real-time data visualization. Must have experience with TypeScript and modern React patterns.",
          tags: ["React", "TypeScript", "Frontend", "Dashboard"],
          matchScore: 90,
          proposals: 12,
        },
        {
          id: "2",
          title: "API Development & Integration",
          client: "E-commerce Platform",
          location: "Remote",
          rate: "$100 - $150/hr",
          duration: "3-6 weeks",
          posted: "3 days ago",
          description: "Need a backend developer to build RESTful APIs and integrate with third-party services. Experience with Node.js, Express, and database design required.",
          tags: ["Backend", "Node.js", "API", "Integration"],
          matchScore: 88,
          proposals: 8,
        },
        {
          id: "3",
          title: "DevOps Infrastructure Setup",
          client: "SaaS Company",
          location: "Remote",
          rate: "$120 - $180/hr",
          duration: "4-8 weeks",
          posted: "5 days ago",
          description: "Set up CI/CD pipelines, containerization, and cloud infrastructure. Must have experience with AWS, Docker, and Kubernetes.",
          tags: ["DevOps", "AWS", "Docker", "Kubernetes"],
          matchScore: 82,
          proposals: 15,
        },
        {
          id: "4",
          title: "Mobile App Development",
          client: "Startup",
          location: "Remote",
          rate: "$90 - $130/hr",
          duration: "6-10 weeks",
          posted: "2 days ago",
          description: "Build a cross-platform mobile app using React Native. Experience with mobile UI/UX and app store deployment required.",
          tags: ["React Native", "Mobile", "iOS", "Android"],
          matchScore: 75,
          proposals: 20,
        },
        {
          id: "5",
          title: "System Architecture Review",
          client: "Enterprise",
          location: "Remote",
          rate: "$150 - $200/hr",
          duration: "1-2 weeks",
          posted: "1 week ago",
          description: "Review and optimize existing system architecture. Need someone with deep experience in distributed systems and scalability.",
          tags: ["Architecture", "Systems", "Scalability"],
          matchScore: 80,
          proposals: 5,
        },
        {
          id: "6",
          title: "E-commerce Website Redesign",
          client: "Retail Brand",
          location: "Remote",
          rate: "$70 - $100/hr",
          duration: "4-6 weeks",
          posted: "2 days ago",
          description: "Redesign and rebuild e-commerce website with modern UI/UX. Experience with Shopify, WooCommerce, or custom solutions required.",
          tags: ["E-commerce", "Web Design", "UI/UX", "Frontend"],
          matchScore: 76,
          proposals: 18,
        },
        {
          id: "7",
          title: "Database Migration Project",
          client: "Tech Company",
          location: "Remote",
          rate: "$110 - $160/hr",
          duration: "3-5 weeks",
          posted: "4 days ago",
          description: "Migrate legacy database to modern cloud solution. Experience with PostgreSQL, migration tools, and data integrity required.",
          tags: ["Database", "PostgreSQL", "Migration", "Backend"],
          matchScore: 84,
          proposals: 7,
        },
        {
          id: "8",
          title: "GraphQL API Development",
          client: "Startup",
          location: "Remote",
          rate: "$95 - $140/hr",
          duration: "2-4 weeks",
          posted: "1 day ago",
          description: "Build GraphQL API for new product. Experience with Apollo, Prisma, and GraphQL best practices required.",
          tags: ["GraphQL", "API", "Apollo", "Backend"],
          matchScore: 87,
          proposals: 11,
        },
        {
          id: "9",
          title: "WordPress Plugin Development",
          client: "Content Platform",
          location: "Remote",
          rate: "$60 - $90/hr",
          duration: "2-3 weeks",
          posted: "3 days ago",
          description: "Develop custom WordPress plugin for content management. Strong PHP and WordPress knowledge required.",
          tags: ["WordPress", "PHP", "Plugin", "CMS"],
          matchScore: 72,
          proposals: 25,
        },
        {
          id: "10",
          title: "Docker Containerization",
          client: "SaaS Platform",
          location: "Remote",
          rate: "$100 - $150/hr",
          duration: "1-2 weeks",
          posted: "5 days ago",
          description: "Containerize existing applications using Docker. Experience with Docker, Docker Compose, and CI/CD required.",
          tags: ["Docker", "DevOps", "Containers", "CI/CD"],
          matchScore: 79,
          proposals: 9,
        },
        {
          id: "11",
          title: "Vue.js Application Development",
          client: "Web Agency",
          location: "Remote",
          rate: "$80 - $120/hr",
          duration: "5-8 weeks",
          posted: "2 days ago",
          description: "Build modern web application using Vue.js 3. Experience with Vue, Pinia, and TypeScript required.",
          tags: ["Vue.js", "Frontend", "TypeScript", "Web App"],
          matchScore: 74,
          proposals: 14,
        },
        {
          id: "12",
          title: "Blockchain Smart Contract Audit",
          client: "Crypto Project",
          location: "Remote",
          rate: "$200 - $300/hr",
          duration: "1 week",
          posted: "1 week ago",
          description: "Security audit of smart contracts. Deep knowledge of Solidity, security best practices, and common vulnerabilities required.",
          tags: ["Blockchain", "Solidity", "Security", "Audit"],
          matchScore: 83,
          proposals: 3,
        },
      ]);
      setLoading(false);
    }, 500);
    }
  }, []);

  const filteredGigs = filter === "all" 
    ? gigs 
    : gigs.filter(gig => {
        if (filter === "high-match") return (gig.matchScore || 0) >= 85;
        if (filter === "low-competition") return (gig.proposals || 0) < 10;
        return true;
      });

  const totalPages = Math.ceil(filteredGigs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGigs = filteredGigs.slice(startIndex, endIndex);

  // Reset to page 1 when filter or view mode changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, viewMode]);

  // Handle highlight scroll and animation
  useEffect(() => {
    if (highlightId && gigs.length > 0) {
      // Find which page the gig is on
      const gigIndex = gigs.findIndex(g => g.id === highlightId);
      if (gigIndex !== -1) {
        const targetPage = Math.floor(gigIndex / itemsPerPage) + 1;
        setCurrentPage(targetPage);
        
        // Scroll to highlighted gig after a short delay
        setTimeout(() => {
          highlightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        
        // Clear highlight after animation
        setTimeout(() => {
          setHighlightedId(null);
          router.replace("/gigs", { scroll: false });
        }, 3000);
      }
    }
  }, [highlightId, gigs, itemsPerPage, router]);

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
              Gigs
            </h1>
            <p className="text-xs text-gray-400" style={{ opacity: 0.6 }}>
              Find project-based opportunities that match your skills
            </p>
          </div>

          {/* Filters and View Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              {["all", "high-match", "low-competition"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    filter === type
                      ? "bg-[#FF5500] text-white"
                      : "bg-[rgba(255,255,255,0.03)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)]"
                  }`}
                >
                  {type === "all" ? "All Gigs" : type === "high-match" ? "High Match" : "Low Competition"}
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

          {/* Gigs List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {viewMode === "list" ? (
                <div className="space-y-4">
                  {paginatedGigs.map((gig) => (
                    <div
                      key={gig.id}
                      ref={gig.id === highlightedId ? highlightRef : null}
                    >
                      <Card
                        className={`p-5 hover:bg-[rgba(255,255,255,0.04)] transition-all cursor-pointer group ${
                          gig.id === highlightedId 
                            ? "ring-2 ring-emerald-500/50 bg-emerald-500/5 animate-pulse" 
                            : ""
                        }`}
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
                                <p className="text-sm text-gray-300">{gig.client}</p>
                              </div>
                            </div>
                        <Star 
                          className={`w-5 h-5 transition-colors cursor-pointer ${
                            savedGigIds.has(gig.id)
                              ? "text-[#FF5500]"
                              : "text-gray-500 hover:text-[#FF5500]"
                          }`}
                          weight={savedGigIds.has(gig.id) ? "fill" : "regular"}
                          onClick={(e) => {
                            e.stopPropagation();
                            const isSaved = savedGigIds.has(gig.id);
                            if (isSaved) {
                              savedItems.unsaveGig(gig.id);
                              setSavedGigIds(prev => {
                                const next = new Set(prev);
                                next.delete(gig.id);
                                return next;
                              });
                              toast.success("Gig removed from saved");
                            } else {
                              savedItems.saveGig({
                                id: gig.id,
                                title: gig.title,
                                client: gig.client,
                                location: gig.location,
                                rate: gig.rate,
                                duration: gig.duration,
                                posted: gig.posted,
                                description: gig.description,
                                tags: gig.tags,
                                matchScore: gig.matchScore,
                                proposals: gig.proposals,
                              });
                              setSavedGigIds(prev => new Set(prev).add(gig.id));
                              toast.success("Gig saved");
                            }
                          }}
                        />
                          </div>

                          <div className="flex items-center gap-4 mb-3 text-xs text-gray-400">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" weight="regular" />
                              <span>{gig.location}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CurrencyDollar className="w-4 h-4" weight="regular" />
                              <span>{gig.rate}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-4 h-4" weight="regular" />
                              <span>{gig.duration}</span>
                            </div>
                            {gig.proposals !== undefined && (
                              <div className="flex items-center gap-1.5">
                                <FileText className="w-4 h-4" weight="regular" />
                                <span>{gig.proposals} proposals</span>
                              </div>
                            )}
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedGigs.map((gig) => (
                    <Card
                      key={gig.id}
                      className="p-5 hover:bg-[rgba(255,255,255,0.04)] transition-colors cursor-pointer group flex flex-col"
                      onClick={() => router.push(`/gigs/${gig.id}`)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-white group-hover:text-[#FF5500] transition-colors">
                              {gig.title}
                            </h3>
                            {gig.matchScore && (
                              <span className="px-2 py-0.5 rounded-full bg-[#FF5500] text-white text-xs font-medium">
                                {gig.matchScore}%
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <User className="w-3.5 h-3.5 text-gray-400" weight="regular" />
                            <p className="text-xs text-gray-300 truncate">{gig.client}</p>
                          </div>
                        </div>
                        <Star 
                          className={`w-4 h-4 transition-colors cursor-pointer flex-shrink-0 ${
                            savedGigIds.has(gig.id)
                              ? "text-[#FF5500]"
                              : "text-gray-500 hover:text-[#FF5500]"
                          }`}
                          weight={savedGigIds.has(gig.id) ? "fill" : "regular"}
                          onClick={(e) => {
                            e.stopPropagation();
                            const isSaved = savedGigIds.has(gig.id);
                            if (isSaved) {
                              savedItems.unsaveGig(gig.id);
                              setSavedGigIds(prev => {
                                const next = new Set(prev);
                                next.delete(gig.id);
                                return next;
                              });
                              toast.success("Gig removed from saved");
                            } else {
                              savedItems.saveGig({
                                id: gig.id,
                                title: gig.title,
                                client: gig.client,
                                location: gig.location,
                                rate: gig.rate,
                                duration: gig.duration,
                                posted: gig.posted,
                                description: gig.description,
                                tags: gig.tags,
                                matchScore: gig.matchScore,
                                proposals: gig.proposals,
                              });
                              setSavedGigIds(prev => new Set(prev).add(gig.id));
                              toast.success("Gig saved");
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-2 mb-3 text-xs text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" weight="regular" />
                          <span className="truncate">{gig.location}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CurrencyDollar className="w-3.5 h-3.5" weight="regular" />
                          <span>{gig.rate}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" weight="regular" />
                          <span>{gig.duration}</span>
                        </div>
                        {gig.proposals !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" weight="regular" />
                            <span>{gig.proposals} proposals</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 mb-3 line-clamp-3 flex-1" style={{ opacity: 0.7 }}>
                        {gig.description}
                      </p>

                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {gig.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.03)] text-xs text-gray-400 border border-[rgba(255,255,255,0.04)]"
                          >
                            {tag}
                          </span>
                        ))}
                        {gig.tags.length > 3 && (
                          <span className="px-2 py-0.5 rounded-lg bg-[rgba(255,255,255,0.03)] text-xs text-gray-400 border border-[rgba(255,255,255,0.04)]">
                            +{gig.tags.length - 3}
                          </span>
                        )}
                      </div>

                      <button 
                        className="flex items-center justify-center gap-1 text-xs text-[#FF5500] hover:text-[#4d85f0] transition-colors mt-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/gigs/${gig.id}`);
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

          {!loading && filteredGigs.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" weight="regular" />
              <p className="text-gray-400 mb-2">No gigs found</p>
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

export default function GigsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <GigsPageContent />
    </Suspense>
  );
}

