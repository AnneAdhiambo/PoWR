import { dbService } from "./database";

// Skill type mapping for core skill dimensions (on-chain mintable, types 0-3)
const SKILL_TYPE_MAP: Record<string, number> = {
  "Backend Engineering": 0,
  "Frontend Engineering": 1,
  "DevOps / Infrastructure": 2,
  "Systems / Architecture": 3,
};

// Language skill type mapping (types 4-9, stored in DB only — contract validates < 4)
const LANGUAGE_TYPE_MAP: Record<string, number> = {
  "Python": 4,
  "JavaScript": 5,
  "TypeScript": 5,
  "Rust": 6,
  "Go": 7,
  "Solidity": 8,
  "Java": 9,
  "Kotlin": 9,
  "Scala": 9,
};

// Achievement badge definitions — derived from profile JSONB
const ACHIEVEMENT_DEFS = [
  {
    key: "pull-shark",
    displayName: "Pull Shark",
    check: (p: any) => (p.artifactSummary?.mergedPRs || 0) >= 50,
  },
  {
    key: "starstruck",
    displayName: "Starstruck",
    check: (p: any) => (p.totalStars || 0) >= 100,
  },
  {
    key: "prolific-committer",
    displayName: "Prolific Committer",
    check: (p: any) => (p.artifactSummary?.commits || 0) >= 500,
  },
  {
    key: "open-source-hero",
    displayName: "Open Source Hero",
    check: (p: any) => (p.artifactSummary?.repos || 0) >= 20,
  },
  {
    key: "veteran-dev",
    displayName: "Veteran Developer",
    check: (p: any) => (p.accountAge || 0) >= 5,
  },
  {
    key: "consistent-coder",
    displayName: "Consistent Coder",
    check: (p: any) => (p.recentActivity?.activeDays || 0) >= 20,
  },
  {
    key: "polyglot",
    displayName: "Polyglot",
    check: (p: any) => (p.topLanguages || []).length >= 5,
  },
];

function getTier(score: number): number | null {
  if (score >= 90) return 3; // Gold
  if (score >= 70) return 2; // Silver
  if (score >= 40) return 1; // Bronze
  return null;
}

function getLanguageTier(sharePercent: number): number | null {
  if (sharePercent >= 60) return 3;
  if (sharePercent >= 40) return 2;
  if (sharePercent >= 20) return 1;
  return null;
}

export class BadgeService {
  /**
   * Returns earned core skill badges (types 0-3) based on PoW skill scores.
   */
  evaluateSkillBadges(profile: any): Array<{ skillType: number; tier: number }> {
    const earned: Array<{ skillType: number; tier: number }> = [];
    for (const skill of profile.skills || []) {
      const skillType = SKILL_TYPE_MAP[skill.skill];
      if (skillType === undefined) continue;
      const tier = getTier(skill.score);
      if (tier === null) continue;
      earned.push({ skillType, tier });
    }
    return earned;
  }

  /**
   * Returns earned language badges (types 4-9) from topLanguages bytes share.
   * These are stored in the DB only — not minted on-chain since the contract
   * validates skill-type < 4.
   */
  evaluateLanguageBadges(profile: any): Array<{ skillType: number; tier: number }> {
    const earned: Array<{ skillType: number; tier: number }> = [];
    const topLanguages: any[] = profile.topLanguages || [];
    if (topLanguages.length === 0) return earned;

    const totalBytes = topLanguages.reduce((sum: number, l: any) => sum + (l.bytes || 0), 0);
    const seen = new Set<number>();

    for (const lang of topLanguages) {
      const langName: string = lang.name || "";
      const skillType = LANGUAGE_TYPE_MAP[langName];
      if (skillType === undefined) continue;
      if (seen.has(skillType)) continue; // Use first match per skill type
      seen.add(skillType);

      const sharePercent = totalBytes > 0 ? (lang.bytes / totalBytes) * 100 : 0;
      const tier = getLanguageTier(sharePercent);
      if (tier === null) continue;
      earned.push({ skillType, tier });
    }
    return earned;
  }

  /**
   * Returns earned GitHub-style achievement badges derived from profile JSONB.
   */
  evaluateAchievements(profile: any): Array<{ badgeKey: string; displayName: string }> {
    return ACHIEVEMENT_DEFS.filter((def) => def.check(profile)).map((def) => ({
      badgeKey: def.key,
      displayName: def.displayName,
    }));
  }

  /**
   * Evaluate all badges for a user after analysis completes.
   * Fire-and-forget safe — logs errors but does not throw.
   */
  async evaluateAll(
    username: string,
    profile: any,
    stacksPrincipal: string | null
  ): Promise<void> {
    try {
      const { blockchainService } = await import("./blockchain");

      // --- Skill badges (types 0-3, attempt on-chain mint) ---
      const skillBadges = this.evaluateSkillBadges(profile);
      const existingBadges = await dbService.getUserBadges(username);
      const existingSet = new Set(existingBadges.map((b) => `${b.skillType}-${b.tier}`));

      for (const badge of skillBadges) {
        const key = `${badge.skillType}-${badge.tier}`;
        if (existingSet.has(key)) continue;

        let txId: string | null = null;
        let tokenId: number | null = null;

        if (stacksPrincipal && blockchainService.isStacksConfigured()) {
          try {
            const result = await blockchainService.mintBadge(
              stacksPrincipal,
              badge.skillType,
              badge.tier
            );
            txId = result.txId;
            tokenId = result.tokenId;
          } catch (err: any) {
            console.error(
              `[BadgeService] Stacks mint failed for ${username} skill=${badge.skillType} tier=${badge.tier}:`,
              err.message
            );
          }
        }

        await dbService.saveBadge(
          username,
          tokenId,
          badge.skillType,
          badge.tier,
          txId,
          stacksPrincipal
        );
        console.log(
          `[BadgeService] Saved skill badge: ${username} skill=${badge.skillType} tier=${badge.tier} txId=${txId}`
        );
      }

      // --- Language badges (types 4-9, DB only) ---
      const langBadges = this.evaluateLanguageBadges(profile);
      for (const badge of langBadges) {
        const key = `${badge.skillType}-${badge.tier}`;
        if (existingSet.has(key)) continue;
        await dbService.saveBadge(username, null, badge.skillType, badge.tier, null, stacksPrincipal);
        console.log(
          `[BadgeService] Saved language badge: ${username} skill=${badge.skillType} tier=${badge.tier}`
        );
      }

      // --- Achievement badges ---
      const achievements = this.evaluateAchievements(profile);
      const existingGithubBadges = await dbService.getGithubBadges(username);
      const existingAchievements = new Set(existingGithubBadges.map((b: any) => b.badgeKey));

      for (const ach of achievements) {
        if (existingAchievements.has(ach.badgeKey)) continue;
        await dbService.saveGithubBadge(username, ach.badgeKey);
        console.log(`[BadgeService] Saved achievement: ${username} badge=${ach.badgeKey}`);
      }
    } catch (err: any) {
      console.error(`[BadgeService] evaluateAll error for ${username}:`, err.message);
    }
  }
}

export const badgeService = new BadgeService();
