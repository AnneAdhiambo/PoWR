"use client";

import { Badge, GithubBadge } from "../../lib/api";
import { SkillBadgeCard, AchievementBadgeCard } from "./BadgeCard";
import { Medal, Star } from "phosphor-react";

interface BadgeGridProps {
  skillBadges: Badge[];
  achievements: Array<GithubBadge & { displayName: string; description: string }>;
}

export function BadgeGrid({ skillBadges, achievements }: BadgeGridProps) {
  const hasSkill = skillBadges.length > 0;
  const hasAchievements = achievements.length > 0;

  if (!hasSkill && !hasAchievements) {
    return (
      <div className="p-5 rounded-[16px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2 mb-3">
          <Medal className="w-4 h-4 text-gray-500" weight="fill" />
          <h3 className="text-sm font-medium text-gray-500">Badges</h3>
        </div>
        <p className="text-xs text-gray-600 text-center py-4">
          No badges yet. Run an analysis to earn badges.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-[16px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
      {/* Skill Badges Section */}
      {hasSkill && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <Medal className="w-4 h-4 text-[#3b76ef]" weight="fill" />
            <h3 className="text-sm font-medium text-[#3b76ef]">Skill Badges</h3>
            <span className="text-[10px] text-gray-500 bg-[rgba(255,255,255,0.05)] px-1.5 py-0.5 rounded-full">
              On-chain NFT
            </span>
          </div>
          <div className="flex flex-wrap gap-4">
            {skillBadges.map((badge) => (
              <SkillBadgeCard key={`${badge.skillType}-${badge.tier}`} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {/* Divider */}
      {hasSkill && hasAchievements && (
        <div className="border-t border-[rgba(255,255,255,0.04)] mb-5" />
      )}

      {/* Achievement Badges Section */}
      {hasAchievements && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-400" weight="fill" />
            <h3 className="text-sm font-medium text-amber-400">Achievements</h3>
          </div>
          <div className="flex flex-wrap gap-4">
            {achievements.map((ach) => (
              <AchievementBadgeCard key={ach.badgeKey} badge={ach} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
