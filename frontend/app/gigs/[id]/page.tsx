"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { Card, Button } from "../../components/ui";
import { FileText, MapPin, CurrencyDollar, Clock, Star, ArrowLeft, CheckCircle, XCircle, User } from "phosphor-react";
import { savedItems } from "../../lib/savedItems";
import toast from "react-hot-toast";

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
  requirements?: string[];
  deliverables?: string[];
  timeline?: string[];
}

const mockGigs: Gig[] = [
  {
    id: "1",
    title: "Build React Dashboard Component",
    client: "Tech Startup",
    location: "Remote",
    rate: "$80 - $120/hr",
    duration: "2-4 weeks",
    posted: "1 day ago",
    description: "Looking for an experienced React developer to build a modern dashboard component with real-time data visualization. Must have experience with TypeScript and modern React patterns. The dashboard will display analytics data, user metrics, and system health information in an intuitive and visually appealing way.",
    tags: ["React", "TypeScript", "Frontend", "Dashboard"],
    matchScore: 90,
    proposals: 12,
    requirements: [
      "3+ years of React development experience",
      "Strong TypeScript skills",
      "Experience with data visualization libraries (Chart.js, D3.js, or similar)",
      "Understanding of modern React patterns (hooks, context, etc.)",
      "Experience with responsive design",
      "Portfolio demonstrating similar work"
    ],
    deliverables: [
      "Fully functional dashboard component",
      "Responsive design for mobile and desktop",
      "Real-time data integration",
      "Comprehensive documentation",
      "Unit tests with >80% coverage"
    ],
    timeline: [
      "Week 1: Design and component architecture",
      "Week 2: Core functionality implementation",
      "Week 3: Data visualization and styling",
      "Week 4: Testing, documentation, and final refinements"
    ]
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
    requirements: [
      "5+ years of backend development",
      "Node.js and Express expertise",
      "Database design experience",
      "API integration knowledge"
    ],
    deliverables: [
      "RESTful API endpoints",
      "Third-party integrations",
      "API documentation",
      "Database schema"
    ],
    timeline: [
      "Weeks 1-2: API design and setup",
      "Weeks 3-4: Core functionality",
      "Weeks 5-6: Integration and testing"
    ]
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
    requirements: [
      "AWS certification preferred",
      "Kubernetes experience",
      "CI/CD pipeline expertise",
      "Infrastructure as code"
    ],
    deliverables: [
      "CI/CD pipeline",
      "Containerized applications",
      "Cloud infrastructure",
      "Documentation"
    ],
    timeline: [
      "Weeks 1-2: Infrastructure planning",
      "Weeks 3-5: Implementation",
      "Weeks 6-8: Testing and optimization"
    ]
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
    requirements: [
      "React Native experience",
      "Mobile UI/UX design",
      "App store deployment knowledge",
      "Cross-platform development"
    ],
    deliverables: [
      "Cross-platform mobile app",
      "iOS and Android versions",
      "App store listings",
      "User documentation"
    ],
    timeline: [
      "Weeks 1-2: Design and planning",
      "Weeks 3-6: Development",
      "Weeks 7-8: Testing",
      "Weeks 9-10: Deployment"
    ]
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
    requirements: [
      "10+ years of systems experience",
      "Distributed systems expertise",
      "Scalability optimization",
      "Architecture review experience"
    ],
    deliverables: [
      "Architecture review report",
      "Optimization recommendations",
      "Implementation roadmap",
      "Best practices guide"
    ],
    timeline: [
      "Week 1: Analysis and review",
      "Week 2: Recommendations and documentation"
    ]
  },
];

export default function GigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const gigId = params.id as string;
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [gig, setGig] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

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

    // Load gig details
    setTimeout(() => {
      const foundGig = mockGigs.find(g => g.id === gigId);
      if (foundGig) {
        setGig(foundGig);
        setSaved(savedItems.isGigSaved(foundGig.id));
      }
      setLoading(false);
    }, 500);
  }, [gigId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c0f] flex">
        <Sidebar 
          username={username} 
          email={userEmail || undefined}
          displayName={displayName}
        />
        <div className="flex-1 overflow-y-auto flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-[#0b0c0f] flex">
        <Sidebar 
          username={username} 
          email={userEmail || undefined}
          displayName={displayName}
        />
        <div className="flex-1 overflow-y-auto flex items-center justify-center ml-60">
          <div className="text-center">
            <XCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" weight="regular" />
            <p className="text-gray-400 mb-2">Gig not found</p>
            <Button onClick={() => router.push("/gigs")} variant="outline" size="sm">
              Back to Gigs
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c0f] flex">
      <Sidebar 
        username={username} 
        email={userEmail || undefined}
        displayName={displayName}
      />

      <div className="flex-1 overflow-y-auto ml-60">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          {/* Back Button */}
          <button
            onClick={() => router.push("/gigs")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" weight="regular" />
            Back to Gigs
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-semibold text-white tracking-tight">
                    {gig.title}
                  </h1>
                  {gig.matchScore && (
                    <span className="px-3 py-1 rounded-full bg-[#FF5500] text-white text-sm font-medium">
                      {gig.matchScore}% match
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-4 h-4 text-gray-400" weight="regular" />
                  <p className="text-lg text-gray-300">{gig.client}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-400">
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
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" weight="regular" />
                    <span>Posted {gig.posted}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!gig) return;
                  const newSaved = !saved;
                  setSaved(newSaved);
                  if (newSaved) {
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
                    toast.success("Gig saved");
                  } else {
                    savedItems.unsaveGig(gig.id);
                    toast.success("Gig removed from saved");
                  }
                }}
                className={`p-2 rounded-lg transition-colors ${
                  saved
                    ? "bg-[#FF5500] text-white"
                    : "bg-[rgba(255,255,255,0.03)] text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)]"
                }`}
              >
                <Star className="w-5 h-5" weight={saved ? "fill" : "regular"} />
              </button>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-6">
              {gig.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-[rgba(255,255,255,0.03)] text-sm text-gray-400 border border-[rgba(255,255,255,0.04)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Project Description</h2>
                <p className="text-sm text-gray-400 leading-relaxed" style={{ opacity: 0.8 }}>
                  {gig.description}
                </p>
              </Card>

              {/* Timeline */}
              {gig.timeline && gig.timeline.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Project Timeline</h2>
                  <ul className="space-y-3">
                    {gig.timeline.map((milestone, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#FF5500] flex items-center justify-center text-white text-xs font-medium flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <span className="text-sm text-gray-400" style={{ opacity: 0.8 }}>
                          {milestone}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Deliverables */}
              {gig.deliverables && gig.deliverables.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Expected Deliverables</h2>
                  <ul className="space-y-3">
                    {gig.deliverables.map((deliverable, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-[#FF5500] flex-shrink-0 mt-0.5" weight="regular" />
                        <span className="text-sm text-gray-400" style={{ opacity: 0.8 }}>
                          {deliverable}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Requirements */}
              {gig.requirements && gig.requirements.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Requirements</h2>
                  <ul className="space-y-3">
                    {gig.requirements.map((requirement, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-[#FF5500] flex-shrink-0 mt-0.5" weight="regular" />
                        <span className="text-sm text-gray-400" style={{ opacity: 0.8 }}>
                          {requirement}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Submit Proposal Button */}
              <Card className="p-6">
                <Button 
                  className="w-full" 
                  variant="primary" 
                  size="lg"
                  onClick={() => {
                    // Handle proposal submission logic
                    alert("Proposal submission functionality coming soon!");
                  }}
                >
                  Submit Proposal
                </Button>
                <p className="text-xs text-gray-500 text-center mt-3" style={{ opacity: 0.6 }}>
                  Your proof of work will be automatically included
                </p>
              </Card>

              {/* Gig Info */}
              <Card className="p-6">
                <h3 className="text-base font-semibold text-white mb-4">Gig Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Client</span>
                    <span className="text-sm text-white">{gig.client}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Location</span>
                    <span className="text-sm text-white">{gig.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Rate</span>
                    <span className="text-sm text-white">{gig.rate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Duration</span>
                    <span className="text-sm text-white">{gig.duration}</span>
                  </div>
                  {gig.proposals !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Proposals</span>
                      <span className="text-sm text-white">{gig.proposals}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Posted</span>
                    <span className="text-sm text-white">{gig.posted}</span>
                  </div>
                </div>
              </Card>

              {/* Match Score Info */}
              {gig.matchScore && (
                <Card className="p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Your Match</h3>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#FF5500] mb-2">
                      {gig.matchScore}%
                    </div>
                    <p className="text-xs text-gray-400" style={{ opacity: 0.7 }}>
                      Based on your proof of work and skills
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

