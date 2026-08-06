import express from "express";
import { dbService } from "../services/database";
import { badgeService } from "../services/badgeService";
import axios from "axios";

const githubAchievementCache = new Map<string, { expiresAt: number; achievements: any[] }>();

async function getPublicGithubAchievements(username: string) {
  const cached = githubAchievementCache.get(username.toLowerCase());
  if (cached && cached.expiresAt > Date.now()) return cached.achievements;
  try {
    const response = await axios.get(`https://github.com/${encodeURIComponent(username)}?tab=achievements`, {
      headers: { Accept: "text/html", "User-Agent": "PoWR-GitHub-Evidence" }, timeout: 8000,
    });
    const tags = String(response.data).match(/<img\b[^>]*achievement-badge-sidebar[^>]*>/gi) || [];
    const parsedAchievements = tags.map((tag, index) => {
      const src = tag.match(/src="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&");
      const alt = tag.match(/alt="Achievement:\s*([^"]+)"/i)?.[1];
      const key = tag.match(/\/achievements\/([^/"?]+)\/detail/i)?.[1] || alt?.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (!src || !alt || !key) return null;
      return { id: `github-${index}-${key}`, username, badgeKey: key, displayName: alt, description: "Earned and displayed on the developer's public GitHub profile.", imageUrl: src, source: "github", earnedAt: null };
    }).filter(Boolean);
    const achievements = Array.from(
      new Map(parsedAchievements.map((achievement: any) => [achievement.badgeKey, achievement])).values(),
    );
    githubAchievementCache.set(username.toLowerCase(), { expiresAt: Date.now() + 15 * 60 * 1000, achievements });
    return achievements;
  } catch { return []; }
}

const router = express.Router();

// Achievement badge metadata for display
const ACHIEVEMENT_META: Record<string, { displayName: string; description: string }> = {
  "pull-shark": {
    displayName: "Pull Shark",
    description: "Merged 50 or more pull requests",
  },
  "starstruck": {
    displayName: "Starstruck",
    description: "Earned 100 or more GitHub stars",
  },
  "prolific-committer": {
    displayName: "Prolific Committer",
    description: "Made 500 or more commits",
  },
  "open-source-hero": {
    displayName: "Open Source Hero",
    description: "Contributed to 20 or more repositories",
  },
  "veteran-dev": {
    displayName: "Veteran Developer",
    description: "GitHub account is 5+ years old",
  },
  "consistent-coder": {
    displayName: "Consistent Coder",
    description: "Active on 20+ days in the last 30 days",
  },
  "polyglot": {
    displayName: "Polyglot",
    description: "Used 5 or more programming languages",
  },
};

// Skill badge names for metadata
const SKILL_NAMES: Record<number, string> = {
  0: "Backend Engineering",
  1: "Frontend Engineering",
  2: "DevOps / Infrastructure",
  3: "Systems / Architecture",
  4: "Python",
  5: "JavaScript / TypeScript",
  6: "Rust",
  7: "Go",
  8: "Solidity / Web3",
  9: "Java / JVM",
};

const TIER_NAMES: Record<number, string> = {
  1: "Bronze",
  2: "Silver",
  3: "Gold",
};

// GET /api/badges/:username — All badges (skill + achievements) for a user
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;

    const [skillBadges, publicGithubAchievements] = await Promise.all([
      dbService.getUserBadges(username),
      getPublicGithubAchievements(username),
    ]);

    res.json({ skillBadges, achievements: publicGithubAchievements });
  } catch (error: any) {
    console.error("Badges fetch error:", error);
    res.status(500).json({ error: "Failed to fetch badges" });
  }
});

// POST /api/badges/mint — Manually trigger badge evaluation + mint (auth required)
router.post("/mint", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const profile = await dbService.getProfile(username);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found. Run an analysis first." });
    }

    const stacksPrincipal = await dbService.getUserStacksPrincipal(username);

    // Evaluate and mint asynchronously — return immediately
    badgeService
      .evaluateAll(username, profile, stacksPrincipal)
      .catch((err) =>
        console.error(`[Badges] evaluateAll error for ${username}:`, err.message)
      );

    res.json({ success: true, message: "Badge evaluation started" });
  } catch (error: any) {
    console.error("Badge mint trigger error:", error);
    res.status(500).json({ error: "Failed to trigger badge evaluation" });
  }
});

// GET /api/badges/metadata/:tokenId — SIP-019 NFT metadata JSON
router.get("/metadata/:tokenId", async (req, res) => {
  try {
    const tokenId = parseInt(req.params.tokenId, 10);
    if (isNaN(tokenId) || tokenId < 1) {
      return res.status(400).json({ error: "Invalid token ID" });
    }

    // Look up badge by token_id
    const result = await (dbService as any).pool?.query?.(
      "SELECT * FROM badges WHERE token_id = $1 LIMIT 1",
      [tokenId]
    );

    // Fall back to a generic metadata response if we can't query directly
    const skillType = result?.rows?.[0]?.skill_type;
    const tier = result?.rows?.[0]?.tier;

    const skillName = skillType !== undefined ? SKILL_NAMES[skillType] || `Skill ${skillType}` : "PoWR Skill";
    const tierName = tier !== undefined ? TIER_NAMES[tier] || `Tier ${tier}` : "Badge";

    res.json({
      name: `${skillName} — ${tierName}`,
      description: `Soulbound PoWR skill badge. Awarded for verified ${skillName} proficiency at the ${tierName} tier.`,
      image: `https://api.powr.dev/badges/image/${tokenId}`,
      attributes: [
        { trait_type: "Skill", value: skillName },
        { trait_type: "Tier", value: tierName },
        { trait_type: "Soulbound", value: "true" },
      ],
    });
  } catch (error: any) {
    console.error("Badge metadata error:", error);
    res.status(500).json({ error: "Failed to fetch badge metadata" });
  }
});

export default router;
