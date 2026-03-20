"use client";

import React from "react";
import { Card, SkillBar, PercentileBadge } from "../ui";
import { Clock, ExternalLink } from "lucide-react";
import { SkillScore } from "../dashboard/SkillPercentilePanel";

interface CandidateCardProps {
  username: string;
  skills: SkillScore[];
  overallIndex: number;
  lastVerified?: string;
  profileUrl: string;
}

export const CandidateCard: React.FC<CandidateCardProps> = ({
  username,
  skills,
  overallIndex,
  lastVerified,
  profileUrl,
}) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="hover:border-[#FF5500] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white tracking-tight mb-1">
            {username}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Verified {formatDate(lastVerified)}</span>
          </div>
        </div>
        <div className="w-16 h-16 rounded-full bg-[#FF5500] flex items-center justify-center text-white font-bold text-xl">
          {overallIndex}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {skills.slice(0, 3).map((skill) => (
          <div key={skill.skill} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{skill.skill}</span>
              <PercentileBadge percentile={skill.percentile} size="sm" />
            </div>
            <SkillBar
              skill={skill.skill}
              score={skill.score}
              percentile={skill.percentile}
              showPercentile={false}
            />
          </div>
        ))}
      </div>

      <a
        href={profileUrl}
        className="flex items-center justify-center gap-2 text-sm text-[#FF5500] hover:text-[#FF5500]/80 transition-colors"
      >
        View Full Profile
        <ExternalLink className="w-4 h-4" />
      </a>
    </Card>
  );
};

