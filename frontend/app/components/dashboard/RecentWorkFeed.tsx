"use client";

import React, { useState } from "react";
import { Card } from "../ui";
import { 
  GithubLogo, 
  GitCommit, 
  GitPullRequest, 
  GitBranch, 
  ArrowSquareOut 
} from "phosphor-react";

export interface Artifact {
  type: "repo" | "commit" | "pull_request";
  id: string;
  data: any;
  timestamp: string;
  repository?: {
    owner: string;
    name: string;
  };
}

interface RecentWorkFeedProps {
  artifacts: Artifact[];
  limit?: number;
  projects?: any[];
}

export const RecentWorkFeed: React.FC<RecentWorkFeedProps> = ({
  artifacts,
  limit = 5,
  projects = [],
}) => {
  const [activeTab, setActiveTab] = useState<"activity" | "projects">("activity");
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);
  const recentArtifacts = artifacts.slice(0, limit);

  const toggleExpand = (projName: string) => {
    setExpandedProjects((prev) =>
      prev.includes(projName) ? prev.filter((name) => name !== projName) : [...prev, projName]
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "commit":
        return GitCommit;
      case "pull_request":
        return GitPullRequest;
      case "repo":
        return GitBranch;
      default:
        return GitCommit;
    }
  };

  const getTitle = (artifact: Artifact) => {
    if (artifact.type === "pull_request") {
      return artifact.data.title || `PR #${artifact.data.number}`;
    }
    if (artifact.type === "commit") {
      return artifact.data.commit?.message?.split("\n")[0] || "Commit";
    }
    return artifact.data.name || "Repository";
  };

  const getUrl = (artifact: Artifact) => {
    if (!artifact.repository) return "#";
    const { owner, name } = artifact.repository;
    if (artifact.type === "pull_request") {
      return `https://github.com/${owner}/${name}/pull/${artifact.data.number}`;
    }
    if (artifact.type === "commit") {
      return `https://github.com/${owner}/${name}/commit/${artifact.data.sha}`;
    }
    return `https://github.com/${owner}/${name}`;
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="p-5 rounded-[16px]">
      <div className="flex items-center justify-between mb-4 border-b border-[rgba(255,255,255,0.06)] pb-2">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("activity")}
            className={`text-xs font-medium pb-1.5 transition-colors relative ${
              activeTab === "activity" ? "text-violet-400" : "text-gray-400 hover:text-gray-200"
            }`}
            style={{ fontWeight: 500 }}
          >
            Recent Work
            {activeTab === "activity" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-violet-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("projects")}
            className={`text-xs font-medium pb-1.5 transition-colors relative flex items-center gap-1.5 ${
              activeTab === "projects" ? "text-violet-400" : "text-gray-400 hover:text-gray-200"
            }`}
            style={{ fontWeight: 500 }}
          >
            OSS Projects
            <span className="px-1 py-0.25 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-[9px]">
              {projects.length}
            </span>
            {activeTab === "projects" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-violet-500 rounded-full" />
            )}
          </button>
        </div>
        <GithubLogo className="w-4 h-4 text-violet-400" weight="fill" />
      </div>

      <div className="space-y-3">
        {activeTab === "activity" ? (
          recentArtifacts.length === 0 ? (
            <p className="text-gray-400 text-center py-6 text-xs" style={{ opacity: 0.6 }}>No artifacts yet</p>
          ) : (
            recentArtifacts.map((artifact, index) => {
              const Icon = getIcon(artifact.type);
              const title = getTitle(artifact);
              const timeAgo = formatDate(artifact.timestamp);
              
              return (
                <a
                  key={artifact.id}
                  href={getUrl(artifact)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative flex items-center gap-3 p-3 rounded-[14px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] transition-all duration-300 ease-out group hover:bg-[rgba(139,92,246,0.08)] hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] hover:scale-[1.02]"
                  style={{
                    animation: 'fadeInUp 0.3s ease-out backwards',
                    animationDelay: `${index * 20}ms`,
                  }}
                >
                  <div className="absolute inset-0 rounded-[14px] bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-fuchsia-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <Icon 
                    className="w-5 h-5 text-violet-400 flex-shrink-0 group-hover:text-violet-300 group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,0.6)] transition-all duration-300 relative z-10" 
                    weight="regular" 
                  />
                  <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-xs font-medium text-gray-200 group-hover:text-white transition-all duration-300 truncate" style={{ fontWeight: 500 }}>
                      {title}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1 group-hover:text-violet-300/60 transition-colors duration-300">
                      {timeAgo}
                    </p>
                  </div>
                  <ArrowSquareOut className="w-4 h-4 text-gray-500 group-hover:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 flex-shrink-0 relative z-10" weight="regular" />
                </a>
              );
            })
          )
        ) : (
          projects.length === 0 ? (
            <p className="text-gray-400 text-center py-6 text-xs" style={{ opacity: 0.6 }}>No projects analyzed yet</p>
          ) : (
            projects.map((project, index) => {
              const isHigh = project.rating?.toLowerCase() === "high";
              const isMedium = project.rating?.toLowerCase() === "medium";
              const ratingColor = isHigh
                ? "bg-green-500/10 text-green-400 border-green-500/25"
                : isMedium
                ? "bg-amber-500/10 text-amber-400 border-amber-500/25"
                : "bg-gray-500/10 text-gray-400 border-gray-500/25";

              const isExpanded = expandedProjects.includes(project.name);

              return (
                <div
                  key={project.name}
                  className="p-3 rounded-[14px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] transition-all duration-300"
                  style={{
                    animation: 'fadeInUp 0.3s ease-out backwards',
                    animationDelay: `${index * 20}ms`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-200 truncate">
                          {project.name}
                        </span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${ratingColor} font-semibold uppercase tracking-wider`}>
                          {project.rating || "Low"}
                        </span>
                        {project.ossContribution && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full border bg-sky-500/10 text-sky-400 border-sky-500/25 font-semibold uppercase tracking-wider">
                            OSS
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1 truncate">
                        {project.description || "No description provided."}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpand(project.name)}
                        className="px-2 py-1 rounded bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[9px] text-violet-400 font-medium transition-colors border border-[rgba(255,255,255,0.06)]"
                      >
                        {isExpanded ? "Hide" : "Detail"}
                      </button>
                      <a
                        href={`https://github.com/${project.fullName || project.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-violet-400 transition-colors"
                      >
                        <ArrowSquareOut className="w-4.5 h-4.5" />
                      </a>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)] space-y-2 text-[11px] text-gray-300 animate-fadeIn">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Key Contributions:</span>
                        <ul className="list-disc list-inside space-y-1 pl-1 text-gray-400">
                          {project.contributionSummary && project.contributionSummary.length > 0 ? (
                            project.contributionSummary.map((item: string, idx: number) => (
                              <li key={idx} className="leading-relaxed">{item}</li>
                            ))
                          ) : (
                            <li>Contribution data analyzed under general skills.</li>
                          )}
                        </ul>
                      </div>
                      {project.keyAreas && project.keyAreas.length > 0 && (
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold block mb-1">Key Areas:</span>
                          <div className="flex flex-wrap gap-1">
                            {project.keyAreas.map((area: string) => (
                              <span key={area} className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] text-[9px] text-gray-400 font-medium">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {project.engineeringImpact && (
                        <div className="p-2 rounded bg-[rgba(139,92,246,0.04)] border border-violet-500/10 italic text-violet-300">
                          "{project.engineeringImpact}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )
        )}
      </div>
    </Card>
  );
};

