import express from "express";
import { dbService } from "../services/database";
import { badgeService } from "../services/badgeService";

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

    const [skillBadges, githubBadges] = await Promise.all([
      dbService.getUserBadges(username),
      dbService.getGithubBadges(username),
    ]);

    const achievements = githubBadges.map((b) => ({
      ...b,
      displayName: ACHIEVEMENT_META[b.badgeKey]?.displayName || b.badgeKey,
      description: ACHIEVEMENT_META[b.badgeKey]?.description || "",
    }));

    res.json({ skillBadges, achievements });
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
