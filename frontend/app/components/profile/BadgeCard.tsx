"use client";

import { Badge, GithubBadge } from "../../lib/api";
import {
  Code,
  Desktop,
  CloudArrowUp,
  Cpu,
  Terminal,
  Lightning,
  Wrench,
  Rocket,
  Hexagon,
  Star,
  Fire,
  GitCommit,
  Globe,
  Clock,
  Calendar,
  Translate,
  Medal,
} from "phosphor-react";

// --- Tier Colors ---
const TIER_COLORS: Record<number, { bg: string; border: string; text: string; gradient: string }> = {
  1: {
    bg: "rgba(205,127,50,0.12)",
    border: "rgba(205,127,50,0.4)",
    text: "#cd7f32",
    gradient: "linear-gradient(135deg, #cd7f32, #a0522d)",
  },
  2: {
    bg: "rgba(192,192,192,0.12)",
    border: "rgba(192,192,192,0.4)",
    text: "#c0c0c0",
    gradient: "linear-gradient(135deg, #c0c0c0, #888888)",
  },
  3: {
    bg: "rgba(255,215,0,0.12)",
    border: "rgba(255,215,0,0.4)",
    text: "#ffd700",
    gradient: "linear-gradient(135deg, #ffd700, #b8860b)",
  },
};

const TIER_NAMES: Record<number, string> = {
  1: "Bronze",
  2: "Silver",
  3: "Gold",
};

// --- Skill Metadata ---
const SKILL_META: Record<
  number,
  { name: string; icon: React.ElementType; thresholds: string }
> = {
  0: { name: "Backend Eng.", icon: Code, thresholds: "Score ≥ 40/70/90" },
  1: { name: "Frontend Eng.", icon: Desktop, thresholds: "Score ≥ 40/70/90" },
  2: { name: "DevOps / Infra", icon: CloudArrowUp, thresholds: "Score ≥ 40/70/90" },
  3: { name: "Systems / Arch.", icon: Cpu, thresholds: "Score ≥ 40/70/90" },
  4: { name: "Python", icon: Terminal, thresholds: "≥20% / 40% / 60% lang share" },
  5: { name: "JS / TypeScript", icon: Lightning, thresholds: "≥20% / 40% / 60% lang share" },
  6: { name: "Rust", icon: Wrench, thresholds: "≥20% / 40% / 60% lang share" },
  7: { name: "Go", icon: Rocket, thresholds: "≥20% / 40% / 60% lang share" },
  8: { name: "Solidity / Web3", icon: Globe, thresholds: "≥20% / 40% / 60% lang share" },
  9: { name: "Java / JVM", icon: Hexagon, thresholds: "≥20% / 40% / 60% lang share" },
};

// --- Achievement Metadata ---
const ACHIEVEMENT_META: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; border: string }
> = {
  "pull-shark": { icon: GitCommit, color: "#60a5fa", bg: "rgba(96,165,250,0.1)", border: "rgba(96,165,250,0.3)" },
  "starstruck": { icon: Star, color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" },
  "prolific-committer": { icon: Fire, color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  "open-source-hero": { icon: Globe, color: "#34d399", bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.3)" },
  "veteran-dev": { icon: Clock, color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.3)" },
  "consistent-coder": { icon: Calendar, color: "#2dd4bf", bg: "rgba(45,212,191,0.1)", border: "rgba(45,212,191,0.3)" },
  "polyglot": { icon: Translate, color: "#f472b6", bg: "rgba(244,114,182,0.1)", border: "rgba(244,114,182,0.3)" },
};

// Hexagon clip-path
const hexClip =
  "polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)";

// ---  SkillBadgeCard ---
export function SkillBadgeCard({ badge }: { badge: Badge }) {
  const tier = TIER_COLORS[badge.tier] || TIER_COLORS[1];
  const skill = SKILL_META[badge.skillType];
  if (!skill) return null;
  const Icon = skill.icon;
  const tierName = TIER_NAMES[badge.tier] || "Badge";

  return (
    <div
      className="group relative flex flex-col items-center gap-1.5 cursor-default"
      title={`${skill.name} — ${tierName}\n${skill.thresholds}${badge.transactionHash ? `\nTx: ${badge.transactionHash.slice(0, 12)}…` : ""}`}
    >
      {/* Hexagon body */}
      <div
        className="relative w-14 h-14 flex items-center justify-center transition-transform group-hover:scale-110"
        style={{
          clipPath: hexClip,
          background: tier.gradient,
          boxShadow: `0 0 12px ${tier.text}40`,
        }}
      >
        <Icon className="w-6 h-6 text-white" weight="fill" />
      </div>

      {/* Tier chip */}
      <span
        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{
          background: tier.bg,
          color: tier.text,
          border: `1px solid ${tier.border}`,
        }}
      >
        {tierName}
      </span>

      {/* Skill name */}
      <span className="text-[9px] text-gray-400 text-center leading-tight max-w-[60px]">
        {skill.name}
      </span>

      {/* On-chain dot */}
      {badge.transactionHash && (
        <div
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0b0c0f]"
          style={{ background: tier.text }}
          title="On-chain"
        />
      )}
    </div>
  );
}

// --- AchievementBadgeCard ---
export function AchievementBadgeCard({
  badge,
}: {
  badge: GithubBadge & { displayName: string; description: string };
}) {
  const meta = ACHIEVEMENT_META[badge.badgeKey] || {
    icon: Medal,
    color: "#6b7280",
    bg: "rgba(107,114,128,0.1)",
    border: "rgba(107,114,128,0.3)",
  };
  const Icon = meta.icon;

  return (
    <div
      className="group relative flex flex-col items-center gap-1.5 cursor-default"
      title={`${badge.displayName}\n${badge.description}\nEarned: ${new Date(badge.earnedAt).toLocaleDateString()}`}
    >
      {/* Circle body */}
      <div
        className="relative w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
        style={{
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          boxShadow: `0 0 10px ${meta.color}30`,
        }}
      >
        <Icon className="w-5 h-5" style={{ color: meta.color }} weight="fill" />
      </div>

      {/* Display name */}
      <span className="text-[9px] text-gray-400 text-center leading-tight max-w-[60px]">
        {badge.displayName}
      </span>
    </div>
  );
}
