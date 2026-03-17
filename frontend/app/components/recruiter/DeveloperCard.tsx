"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlass, Heart, EnvelopeSimple, ShieldCheck } from "phosphor-react";
import { SkillRadarChart } from "./SkillRadarChart";

export interface DeveloperCardData {
  username: string;
  topSkills: Array<{ skill: string; score: number; percentile: number }>;
  overallIndex: number;
  lastActive: string | null;
  hasOnChainProof: boolean;
  proofCount: number;
  artifactSummary: { repos?: number; commits?: number; pullRequests?: number; mergedPRs?: number };
}

// Skill color dots — consistent per skill name
const SKILL_COLORS: Record<string, string> = {
  react: "#61dafb", typescript: "#3178c6", javascript: "#f7df1e",
  python: "#3776ab", rust: "#ce4a00", go: "#00add8",
  solidity: "#8247e5", "node.js": "#68a063", "c++": "#659ad2",
  java: "#ed8b00", ruby: "#cc342d", swift: "#f05138",
  docker: "#2496ed", kubernetes: "#326ce5",
};

function skillColor(name: string): string {
  return SKILL_COLORS[name.toLowerCase()] ?? "#6b7280";
}

// Infer a role label from top skills
function inferRole(skills: Array<{ skill: string }>): string {
  const names = skills.map(s => s.skill.toLowerCase());
  if (names.some(s => ["react","vue","svelte","next.js"].includes(s))) return "Frontend Engineer";
  if (names.some(s => ["solidity","rust","clarity"].includes(s))) return "Blockchain Engineer";
  if (names.some(s => ["python","r","tensorflow"].includes(s))) return "Data Engineer";
  if (names.some(s => ["docker","kubernetes","terraform"].includes(s))) return "DevOps Engineer";
  return "Software Engineer";
}

interface DeveloperCardProps {
  developer: DeveloperCardData;
  onShortlist?: (username: string) => void;
  onContact?: (username: string) => void;
}

export const DeveloperCard: React.FC<DeveloperCardProps> = ({ developer, onShortlist, onContact }) => {
  const router = useRouter();
  const { username, topSkills, overallIndex, hasOnChainProof } = developer;
  const role = inferRole(topSkills);
  const topSkillsSorted = [...topSkills].sort((a, b) => b.score - a.score);
  const skillPills = topSkillsSorted.slice(0, 3).map(s => s.skill);

  return (
    <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-5 flex flex-col gap-4 hover:border-[rgba(255,85,0,0.3)] hover:bg-[rgba(255,85,0,0.02)] hover:shadow-[0_0_24px_rgba(255,85,0,0.07)] transition-all duration-200">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={`https://github.com/${username}.png?size=56`}
            alt={username}
            className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.05)] flex-shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${username}&background=12141a&color=fff&size=56`;
            }}
          />
          <div>
            <p className="text-base font-semibold text-white">@{username}</p>
            <p className="text-xs text-gray-500 mt-0.5">{role}</p>
          </div>
        </div>
        {/* PoW Score badge */}
        <div className="flex-shrink-0 text-center bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-3.5 py-2.5 min-w-[76px]">
          <p className="text-3xl font-bold text-white leading-none tabular-nums">{Math.round(overallIndex)}</p>
          <p className="text-[9px] text-gray-500 mt-1 uppercase tracking-widest font-medium">PoW Score</p>
          {hasOnChainProof && (
            <div className="flex items-center justify-center gap-1 mt-2 px-1.5 py-0.5 rounded-full bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)]">
              <ShieldCheck className="w-2.5 h-2.5 text-[#22c55e]" weight="fill" />
              <span className="text-[8px] text-[#22c55e] font-bold tracking-wide">Verified</span>
            </div>
          )}
        </div>
      </div>

      {/* Skills + Radar chart */}
      <div className="flex gap-3">
        {/* Skill list */}
        <div className="flex-1 min-w-0">
          {topSkillsSorted.slice(0, 5).length > 0 && (
            <p className="text-xs font-medium text-gray-300 mb-2">
              {role.replace(" Engineer", "").replace(" Developer", "")} Engineering
            </p>
          )}
          <ul className="space-y-1.5">
            {topSkillsSorted.slice(0, 5).map(skill => (
              <li key={skill.skill} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: skillColor(skill.skill) }}
                />
                <span className="text-sm text-gray-300">{skill.skill}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Radar chart */}
        <div className="w-40 flex-shrink-0">
          <SkillRadarChart skills={topSkillsSorted} />
        </div>
      </div>

      {/* Skill pills */}
      {skillPills.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {skillPills.map(skill => (
            <span
              key={skill}
              className="flex items-center gap-1 text-xs text-gray-400 px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]"
            >
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: skillColor(skill) }} />
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[rgba(255,255,255,0.05)]">
        <button
          onClick={() => router.push(`/recruiter/developer/${username}`)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-gray-300 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] hover:text-white border border-[rgba(255,255,255,0.06)] transition-colors"
        >
          <MagnifyingGlass className="w-3.5 h-3.5" weight="bold" />
          View Profile
        </button>
        <button
          onClick={() => onShortlist?.(username)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium text-gray-300 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,85,0,0.1)] hover:text-[#FF5500] border border-[rgba(255,255,255,0.06)] hover:border-[#FF5500]/25 transition-colors"
        >
          <Heart className="w-3.5 h-3.5" weight="regular" />
          Shortlist
        </button>
        <button
          onClick={() => onContact?.(username)}
          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-[#FF5500] bg-[rgba(255,85,0,0.1)] hover:bg-[rgba(255,85,0,0.18)] border border-[#FF5500]/25 hover:border-[#FF5500]/50 transition-colors"
        >
          <EnvelopeSimple className="w-3.5 h-3.5" weight="bold" />
          Contact
        </button>
      </div>
    </div>
  );
};
