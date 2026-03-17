"use client";

import React from "react";
import Link from "next/link";
import { Card } from "../ui";
import { Briefcase, Star } from "phosphor-react";

interface JobGig {
  id: string;
  title: string;
  company?: string;
  description: string;
  type: "job" | "gig";
  salary?: string;
  tags?: string[];
}

interface SuggestedJobsGigsProps {
  jobs?: JobGig[];
}

export const SuggestedJobsGigs: React.FC<SuggestedJobsGigsProps> = ({
  jobs,
}) => {
  // Mock data if none provided
  const defaultJobs: JobGig[] = [
    {
      id: "1",
      title: "Senior Backend Engineer",
      company: "TechCorp",
      description: "Senior Backend Engineer - isadicarino:marsited engineer This phass focuses on embracing and Devops engineer with exadrests and notallizaition....",
      type: "job",
      salary: "$120k - $180k",
      tags: ["Backend", "DevOps", "Node.js"],
    },
    {
      id: "1",
      title: "Build React Dashboard Component",
      company: "Tech Startup",
      description: "Looking for an experienced React developer to build a modern dashboard component with real-time data visualization.",
      type: "gig",
      salary: "$80 - $120/hr",
      tags: ["React", "TypeScript", "Frontend"],
    },
    {
      id: "3",
      title: "DevOps Engineer",
      company: "CloudTech",
      description: "Looking for a DevOps engineer to help scale our infrastructure. Experience with AWS, Kubernetes required.",
      type: "job",
      salary: "$130k - $190k",
      tags: ["DevOps", "AWS", "Kubernetes"],
    },
  ];

  const displayJobs = jobs || defaultJobs;

  return (
    <Card className="p-5 rounded-[16px]">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-4 h-4 text-emerald-400" weight="fill" />
        <h2 className="text-sm font-medium text-emerald-400" style={{ fontWeight: 500, fontSize: '14px' }}>
          Suggested Jobs & Gigs
        </h2>
      </div>
      <div className="space-y-3">
        {displayJobs.map((job) => (
          <Link
            key={`${job.type}-${job.id}`}
            href={job.type === "job" ? `/jobs?highlight=${job.id}` : `/gigs?highlight=${job.id}`}
            className="block p-3 rounded-[14px] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.03)] transition-colors border border-[rgba(255,255,255,0.04)] cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" weight="regular" />
                  <h3 className="text-xs font-medium text-gray-300 group-hover:text-gray-200 transition-colors truncate" style={{ fontWeight: 500 }}>
                    {job.title}
                  </h3>
                </div>
                {job.company && (
                  <p className="text-xs text-gray-500 group-hover:text-gray-300 mb-1.5 transition-colors">{job.company}</p>
                )}
                <p className="text-xs text-gray-500 group-hover:text-gray-400 line-clamp-2 mb-1.5 transition-colors">
                  {job.description}
                </p>
                {job.salary && (
                  <p className="text-xs text-gray-400 mb-1.5" style={{ opacity: 0.7 }}>
                    {job.salary}
                  </p>
                )}
                {job.tags && job.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {job.tags.slice(0, 3).map((tag, idx) => {
                      // Assign colors based on tag type
                      const getTagColor = (tag: string) => {
                        const tagLower = tag.toLowerCase();
                        if (tagLower.includes('devops') || tagLower.includes('infrastructure')) 
                          return 'border-[#FF5500]/30 text-[#FF6B2B]/60';
                        if (tagLower.includes('backend') || tagLower.includes('node')) 
                          return 'border-emerald-500/30 text-emerald-400/60';
                        if (tagLower.includes('react') || tagLower.includes('frontend') || tagLower.includes('typescript')) 
                          return 'border-violet-500/30 text-violet-400/60';
                        if (tagLower.includes('full stack') || tagLower.includes('fullstack')) 
                          return 'border-amber-500/30 text-amber-400/60';
                        return 'border-gray-500/30 text-gray-400/60';
                      };
                      
                      return (
                        <span
                          key={idx}
                          className={`text-[10px] px-2 py-0.5 rounded-full bg-transparent border ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <Star className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-300 transition-colors flex-shrink-0 mt-0.5" weight="regular" />
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
};

