"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { Card, Button } from "../../components/ui";
import { Briefcase, MapPin, CurrencyDollar, Clock, Star, ArrowLeft, CheckCircle, XCircle, Buildings } from "phosphor-react";
import { savedItems } from "../../lib/savedItems";
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
  requirements?: string[];
  responsibilities?: string[];
  benefits?: string[];
}

const mockJobs: Job[] = [
  {
    id: "1",
    title: "Senior Backend Engineer",
    company: "TechCorp",
    location: "San Francisco, CA",
    salary: "$120k - $180k",
    type: "full-time",
    posted: "2 days ago",
    description: "We're looking for a senior backend engineer with expertise in Node.js, TypeScript, and distributed systems. You'll work on building scalable APIs and microservices that power our platform serving millions of users.",
    tags: ["Backend", "Node.js", "TypeScript", "DevOps"],
    matchScore: 92,
    requirements: [
      "5+ years of backend development experience",
      "Strong TypeScript/Node.js skills",
      "Experience with databases (PostgreSQL, MongoDB, Redis)",
      "Understanding of microservices architecture",
      "Experience with cloud platforms (AWS, GCP, or Azure)",
      "Strong problem-solving skills"
    ],
    responsibilities: [
      "Design and implement backend services and APIs",
      "Write clean, maintainable, and well-tested code",
      "Collaborate with frontend and mobile teams",
      "Mentor junior developers",
      "Participate in code reviews and architecture discussions"
    ],
    benefits: [
      "Competitive salary and equity",
      "Health, dental, and vision insurance",
      "Unlimited PTO",
      "Remote-friendly work environment",
      "Learning and development budget"
    ]
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
    requirements: [
      "3+ years of full-stack development experience",
      "React and Next.js expertise",
      "Backend API development skills",
      "Database design experience"
    ],
    responsibilities: [
      "Build full-stack features end-to-end",
      "Work closely with product and design teams",
      "Participate in code reviews",
      "Help define technical architecture"
    ],
    benefits: [
      "Competitive salary",
      "Equity package",
      "Flexible work hours",
      "Health insurance"
    ]
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
    requirements: [
      "4+ years DevOps experience",
      "AWS or GCP certification preferred",
      "Kubernetes expertise",
      "CI/CD pipeline experience",
      "Infrastructure as code (Terraform, CloudFormation)"
    ],
    responsibilities: [
      "Manage and optimize cloud infrastructure",
      "Implement and maintain CI/CD pipelines",
      "Monitor system performance and reliability",
      "Automate operational tasks"
    ],
    benefits: [
      "Competitive compensation",
      "401(k) matching",
      "Professional development",
      "Hybrid work options"
    ]
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
    requirements: [
      "3+ years of frontend development",
      "Strong React and TypeScript skills",
      "CSS/SCSS expertise",
      "Eye for design and UX"
    ],
    responsibilities: [
      "Build responsive user interfaces",
      "Collaborate with designers",
      "Optimize frontend performance",
      "Write unit and integration tests"
    ],
    benefits: [
      "Competitive salary",
      "Health benefits",
      "Flexible PTO",
      "Creative work environment"
    ]
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
    requirements: [
      "8+ years of software engineering experience",
      "Deep understanding of distributed systems",
      "Experience with system design at scale",
      "Strong communication skills"
    ],
    responsibilities: [
      "Design system architecture for new products",
      "Guide technical decisions across teams",
      "Mentor senior engineers",
      "Define technical standards and best practices"
    ],
    benefits: [
      "Top-tier compensation",
      "Stock options",
      "Comprehensive benefits",
      "Relocation assistance"
    ]
  },
];

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;
  const [username, setUsername] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [job, setJob] = useState<Job | null>(null);
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

    // Load job details
    setTimeout(() => {
      const foundJob = mockJobs.find(j => j.id === jobId);
      if (foundJob) {
        setJob(foundJob);
        setSaved(savedItems.isJobSaved(foundJob.id));
      }
      setLoading(false);
    }, 500);
  }, [jobId]);

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

  if (!job) {
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
            <p className="text-gray-400 mb-2">Job not found</p>
            <Button onClick={() => router.push("/jobs")} variant="outline" size="sm">
              Back to Jobs
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
            onClick={() => router.push("/jobs")}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" weight="regular" />
            Back to Jobs
          </button>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-2xl font-semibold text-white tracking-tight">
                    {job.title}
                  </h1>
                  {job.matchScore && (
                    <span className="px-3 py-1 rounded-full bg-[#FF5500] text-white text-sm font-medium">
                      {job.matchScore}% match
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <Buildings className="w-4 h-4 text-gray-400" weight="regular" />
                  <p className="text-lg text-gray-300">{job.company}</p>
                </div>
                <div className="flex items-center gap-6 text-sm text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" weight="regular" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CurrencyDollar className="w-4 h-4" weight="regular" />
                    <span>{job.salary}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Briefcase className="w-4 h-4" weight="regular" />
                    <span className="capitalize">{job.type}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" weight="regular" />
                    <span>Posted {job.posted}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!job) return;
                  const newSaved = !saved;
                  setSaved(newSaved);
                  if (newSaved) {
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
                    toast.success("Job saved");
                  } else {
                    savedItems.unsaveJob(job.id);
                    toast.success("Job removed from saved");
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
              {job.tags.map((tag, idx) => (
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
                <h2 className="text-lg font-semibold text-white mb-4">About This Role</h2>
                <p className="text-sm text-gray-400 leading-relaxed" style={{ opacity: 0.8 }}>
                  {job.description}
                </p>
              </Card>

              {/* Responsibilities */}
              {job.responsibilities && job.responsibilities.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Responsibilities</h2>
                  <ul className="space-y-3">
                    {job.responsibilities.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-[#FF5500] flex-shrink-0 mt-0.5" weight="regular" />
                        <span className="text-sm text-gray-400" style={{ opacity: 0.8 }}>
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Requirements */}
              {job.requirements && job.requirements.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Requirements</h2>
                  <ul className="space-y-3">
                    {job.requirements.map((requirement, idx) => (
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

              {/* Benefits */}
              {job.benefits && job.benefits.length > 0 && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Benefits</h2>
                  <ul className="space-y-3">
                    {job.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" weight="regular" />
                        <span className="text-sm text-gray-400" style={{ opacity: 0.8 }}>
                          {benefit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* Apply Button */}
              <Card className="p-6">
                <Button 
                  className="w-full" 
                  variant="primary" 
                  size="lg"
                  onClick={() => {
                    toast.success("Application functionality coming soon!");
                  }}
                >
                  Apply Now
                </Button>
                <p className="text-xs text-gray-500 text-center mt-3" style={{ opacity: 0.6 }}>
                  Your proof of work will be automatically included
                </p>
              </Card>

              {/* Job Info */}
              <Card className="p-6">
                <h3 className="text-base font-semibold text-white mb-4">Job Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Company</span>
                    <span className="text-sm text-white">{job.company}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Location</span>
                    <span className="text-sm text-white">{job.location}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Salary</span>
                    <span className="text-sm text-white">{job.salary}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Type</span>
                    <span className="text-sm text-white capitalize">{job.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Posted</span>
                    <span className="text-sm text-white">{job.posted}</span>
                  </div>
                </div>
              </Card>

              {/* Match Score Info */}
              {job.matchScore && (
                <Card className="p-6">
                  <h3 className="text-base font-semibold text-white mb-4">Your Match</h3>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-[#FF5500] mb-2">
                      {job.matchScore}%
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
