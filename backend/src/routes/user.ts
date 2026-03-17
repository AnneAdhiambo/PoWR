import express from "express";
import { ArtifactIngestionService } from "../services/artifactIngestion";
import { AIAnalysisService } from "../services/aiAnalysis";
import { ScoringEngine } from "../services/scoringEngine";
import { progressTracker } from "../services/progressTracker";
import { dbService } from "../services/database";
import { blockchainService } from "../services/blockchain";
import { badgeService } from "../services/badgeService";

const router = express.Router();

// Get user PoW profile
router.get("/profile", async (req, res) => {
  try {
    const { username, access_token } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    // Check database first - only refresh if older than 24 hours
    const cachedProfile = await dbService.getProfile(username as string);
    const shouldRefresh = await dbService.shouldRefreshProfile(username as string, 24);
    if (cachedProfile && !shouldRefresh) {
      return res.json(cachedProfile);
    }

    // Need to fetch fresh data - try to get token from database if not provided
    let token = access_token as string;
    if (!token) {
      const user = await dbService.getUser(username as string);
      if (user && user.access_token_encrypted) {
        token = user.access_token_encrypted;
      } else {
        return res.status(401).json({ error: "Access token required. Please login again." });
      }
    }

    // Store user in database (update token if provided)
    if (access_token) {
      await dbService.upsertUser(username as string, 0, access_token as string);
    }

    progressTracker.setProgress(username as string, "ingestion", "Fetching your repositories...", 10);
    const ingestionService = new ArtifactIngestionService(token);

    // Use FAST mode - only fetches repo metadata + events (~18 API calls vs 100+)
    const fastData = await ingestionService.ingestFast(username as string, 12);
    progressTracker.setProgress(username as string, "ingestion", `Found ${fastData.repos.length} repos with ${fastData.recentEvents.length} recent events`, 30);
    const artifacts = ingestionService.normalizeFastData(fastData, username as string);

    // Save artifacts to database
    await dbService.saveArtifacts(username as string, artifacts);

    progressTracker.setProgress(username as string, "ai_analysis", "Analyzing your contributions with AI...", 40);
    const aiService = new AIAnalysisService();
    const aiExtraction = await aiService.extractSkills(
      username as string,
      artifacts,
      fastData.timeWindow
    );
    progressTracker.setProgress(username as string, "scoring", "Calculating your PoW scores...", 70);

    const scoringEngine = new ScoringEngine();
    const profile = await scoringEngine.generatePoWProfile(artifacts, aiExtraction);

    // Save profile to database
    await dbService.saveProfile(username as string, profile, artifacts.length);

    // Ensure user has a subscription (creates free plan if first time)
    const { subscriptionService } = await import("../services/subscriptionService");
    const subscription = await subscriptionService.ensureFreePlan(username as string);

    // Profile saved - blockchain publishing is now a separate step
    // User can manually publish via /api/user/publish-proof endpoint

    // Schedule next update based on subscription tier (if not already scheduled)
    if (subscription) {
      const allScheduled = await dbService.getScheduledUpdates();
      const existingSchedule = allScheduled.find(
        (s: any) => s.username === username && s.status === 'pending'
      );
      if (!existingSchedule) {
        await subscriptionService.scheduleUpdate(username as string, subscription.planType as any);
      }
    }

    progressTracker.setProgress(username as string, "complete", "Profile generated!", 100);

    res.json({ ...profile, unpublished: true });
    setTimeout(() => progressTracker.clearProgress(username as string), 1000);
  } catch (error: any) {
    console.error("Profile error:", error);
    res.status(500).json({ error: error.message || "Failed to generate profile" });
  }
});

// Get user skills
router.get("/skills", async (req, res) => {
  try {
    const { username, access_token } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    let token = access_token as string;
    if (!token) {
      const user = await dbService.getUser(username as string);
      if (user && user.access_token_encrypted) {
        token = user.access_token_encrypted;
      } else {
        return res.status(401).json({ error: "Access token required. Please login again." });
      }
    }

    const ingestionService = new ArtifactIngestionService(token);
    const ingested = await ingestionService.ingestUserArtifacts(username as string, 12);
    const artifacts = ingestionService.normalizeArtifacts(ingested, username as string);

    const aiService = new AIAnalysisService();
    const aiExtraction = await aiService.extractSkills(
      username as string,
      artifacts,
      ingested.timeWindow
    );

    const scoringEngine = new ScoringEngine();
    const skillScores = await scoringEngine.calculatePoWScores(artifacts, aiExtraction);

    res.json({ skills: skillScores });
  } catch (error: any) {
    console.error("Skills error:", error);
    res.status(500).json({ error: error.message || "Failed to calculate skills" });
  }
});

// Get verified artifacts
router.get("/artifacts", async (req, res) => {
  try {
    const { username, access_token } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    // Try to get from database first
    const cachedArtifacts = await dbService.getArtifacts(username as string);
    if (cachedArtifacts.length > 0) {
      return res.json({ artifacts: cachedArtifacts });
    }

    let token = access_token as string;
    if (!token) {
      const user = await dbService.getUser(username as string);
      if (user && user.access_token_encrypted) {
        token = user.access_token_encrypted;
      } else {
        return res.status(401).json({ error: "Access token required. Please login again." });
      }
    }

    const ingestionService = new ArtifactIngestionService(token);
    const ingested = await ingestionService.ingestUserArtifacts(username as string, 12);
    const artifacts = ingestionService.normalizeArtifacts(ingested, username as string);

    await dbService.saveArtifacts(username as string, artifacts);

    res.json({ artifacts });
  } catch (error: any) {
    console.error("Artifacts error:", error);
    res.status(500).json({ error: error.message || "Failed to fetch artifacts" });
  }
});

// Trigger analysis
router.post("/analyze", async (req, res) => {
  try {
    const { username, access_token, monthsBack } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const { subscriptionService } = await import("../services/subscriptionService");
    const { ComprehensiveAnalysisService } = await import("../services/comprehensiveAnalysis");

    // Ensure user has at least a free plan
    await subscriptionService.ensureFreePlan(username);

    // Analysis is FREE for all users - no subscription check needed
    // Publishing to blockchain is what requires subscription (handled separately)

    let token = access_token as string;
    if (!token) {
      const user = await dbService.getUser(username as string);
      if (user && user.access_token_encrypted) {
        token = user.access_token_encrypted;
      } else {
        return res.status(401).json({ error: "Access token required. Please login again." });
      }
    }

    // Use comprehensive analysis service with AI + heuristic fallback
    const analysisService = new ComprehensiveAnalysisService(token);
    const devProfile = await analysisService.analyzeUser(username, monthsBack || 12);

    console.log(`[ANALYZE] Comprehensive analysis complete: ${devProfile.totalRepos} repos, ${devProfile.totalCommits} commits`);
    console.log(`[ANALYZE] Skill scores: backend=${devProfile.skillScores.backend}, frontend=${devProfile.skillScores.frontend}, devops=${devProfile.skillScores.devops}, systems=${devProfile.skillScores.systems}`);
    console.log(`[ANALYZE] Method: ${devProfile.analysisMethod}, confidence: ${devProfile.confidence}`);

    // Generate Profile Summary using AI Analysis Service
    const aiService = new AIAnalysisService();
    const summarySkills: any = {
      backend_engineering: { score: devProfile.skillScores.backend, confidence: devProfile.confidence },
      frontend_engineering: { score: devProfile.skillScores.frontend, confidence: devProfile.confidence },
      devops_infrastructure: { score: devProfile.skillScores.devops, confidence: devProfile.confidence },
      systems_architecture: { score: devProfile.skillScores.systems, confidence: devProfile.confidence },
    };

    // Generate summary
    let profileSummary = "Developer verified by PoWR.";
    try {
      profileSummary = await aiService.generateProfileSummary(username, summarySkills);
    } catch (err) {
      console.error("Summary generation error:", err);
    }

    // Convert to PoWProfile format for storage
    const profile = {
      skills: [
        {
          skill: "Backend Engineering",
          score: devProfile.skillScores.backend,
          percentile: calculatePercentile(devProfile.skillScores.backend),
          confidence: devProfile.confidence,
          artifactCount: devProfile.totalRepos,
        },
        {
          skill: "Frontend Engineering",
          score: devProfile.skillScores.frontend,
          percentile: calculatePercentile(devProfile.skillScores.frontend),
          confidence: devProfile.confidence,
          artifactCount: devProfile.totalRepos,
        },
        {
          skill: "DevOps / Infrastructure",
          score: devProfile.skillScores.devops,
          percentile: calculatePercentile(devProfile.skillScores.devops),
          confidence: devProfile.confidence,
          artifactCount: devProfile.totalRepos,
        },
        {
          skill: "Systems / Architecture",
          score: devProfile.skillScores.systems,
          percentile: calculatePercentile(devProfile.skillScores.systems),
          confidence: devProfile.confidence,
          artifactCount: devProfile.totalRepos,
        },
      ],
      overallIndex: devProfile.skillScores.overall,
      artifactSummary: {
        repos: devProfile.totalRepos,
        commits: devProfile.totalCommits,
        pullRequests: devProfile.totalPRs,
        mergedPRs: devProfile.totalMergedPRs,
      },
      summary: profileSummary,
      // Extended data
      topLanguages: devProfile.topLanguages,
      totalAdditions: devProfile.totalAdditions,
      totalDeletions: devProfile.totalDeletions,
      totalStars: devProfile.totalStars,
      totalIssues: devProfile.totalIssues,
      accountAge: devProfile.accountAge,
      recentActivity: devProfile.recentActivity,
      analysisMethod: devProfile.analysisMethod,
    };

    // Also fetch artifacts for storage
    const ingestionService = new ArtifactIngestionService(token);
    const ingested = await ingestionService.ingestUserArtifacts(username, monthsBack || 12);
    const artifacts = ingestionService.normalizeArtifacts(ingested, username);

    // Generate artifact hash for change detection
    const artifactHash = blockchainService.generateArtifactHash(artifacts);

    await dbService.saveArtifacts(username, artifacts);
    await dbService.saveProfile(username, profile, devProfile.totalRepos, artifactHash);

    // Profile saved - blockchain publishing is now a separate step
    // User can manually publish via /api/user/publish-proof endpoint

    const subscription = await subscriptionService.getUserPlan(username);
    if (subscription) {
      await subscriptionService.scheduleUpdate(username, subscription.planType as any);
    }

    // Fire-and-forget badge evaluation — does not block the response
    const stacksPrincipal = await dbService.getUserStacksPrincipal(username).catch(() => null);
    badgeService.evaluateAll(username, profile, stacksPrincipal).catch((err) =>
      console.error(`[Analyze] Badge evaluation error for ${username}:`, err.message)
    );

    res.json({
      success: true,
      profile,
      artifactsCount: devProfile.totalRepos,
      analysisMethod: devProfile.analysisMethod,
      unpublished: true,
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze artifacts" });
  }

  // Helper function to calculate percentile from score
  function calculatePercentile(score: number): number {
    if (score >= 90) return 10;
    if (score >= 80) return 20;
    if (score >= 70) return 30;
    if (score >= 60) return 40;
    if (score >= 50) return 50;
    if (score >= 40) return 60;
    if (score >= 30) return 70;
    if (score >= 20) return 80;
    return 90;
  }
});

// Get progress for a user
router.get("/progress", async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }
    const progress = progressTracker.getProgress(username as string);
    if (!progress) {
      return res.json({ stage: "idle", message: "No analysis in progress", progress: 0 });
    }
    res.json(progress);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to get progress" });
  }
});

// Get on-chain proofs
router.get("/proofs", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    const proofs = await dbService.getBlockchainProofs(username as string);
    res.json({ proofs });
  } catch (error: any) {
    console.error("Proofs error:", error);
    res.status(500).json({ error: "Failed to fetch proofs" });
  }
});

// Get analysis status (including unpublished state)
router.get("/analysis-status", async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    // Get profile with last_analyzed date
    const profileData = await dbService.getProfileWithMeta(username as string);

    if (!profileData) {
      return res.json({
        hasProfile: false,
        hasUnpublished: false,
        lastAnalyzed: null,
        lastPublished: null
      });
    }

    const { profile, lastAnalyzed, artifactsCount, currentArtifactHash } = profileData;

    // Get latest proof
    const latestProof = await dbService.getLatestBlockchainProof(username as string);
    const lastPublished = latestProof ? new Date(latestProof.timestamp * 1000) : null;

    // Analysis is unpublished if:
    // 1. There's a profile but no proofs (first time)
    // 2. OR there is a proof, but the content has changed (hashes don't match)
    // Note: We check hashes to avoid prompting publish if just timestamps changed but content didn't
    let hasUnpublished = false;

    if (!latestProof) {
      // If no proofs exist, but profile exists -> unpublished
      hasUnpublished = true;
    } else {
      // If proofs exist, check if current hash differs from latest anchored hash
      // If currentArtifactHash is null (old data), fallback to timestamp check
      if (currentArtifactHash) {
        hasUnpublished = currentArtifactHash !== latestProof.artifactHash;
      } else {
        // Fallback for legacy data without hash
        hasUnpublished = lastAnalyzed && lastPublished ? lastAnalyzed > lastPublished : false;
      }
    }

    res.json({
      hasProfile: true,
      hasUnpublished,
      lastAnalyzed: lastAnalyzed?.toISOString() || null,
      lastPublished: lastPublished?.toISOString() || null,
      profile,
      artifactsCount
    });
  } catch (error: any) {
    console.error("Analysis status error:", error);
    res.status(500).json({ error: "Failed to get analysis status" });
  }
});

// Publish proof to blockchain (requires subscription or first-time user)
router.post("/publish-proof", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username required" });
    }

    // Check if Stacks oracle is configured
    if (!blockchainService.isStacksConfigured()) {
      return res.status(503).json({
        error: "Blockchain not configured",
        message: "Blockchain publishing is currently unavailable"
      });
    }

    // Import subscription service
    const { subscriptionService } = await import("../services/subscriptionService");

    // Check user's subscription status
    const subscription = await subscriptionService.getUserPlan(username);

    // Check if user has any existing proofs (first publish is free)
    const existingProofs = await dbService.getBlockchainProofs(username);
    const isFirstPublish = existingProofs.length === 0;

    // Allow publishing if:
    // 1. It's the user's first proof (free first publish)
    // 2. User has a paid subscription (basic or pro)
    const hasPaidSubscription = subscription &&
      (subscription.planType === "basic" || subscription.planType === "pro") &&
      subscription.status === "active";

    if (!isFirstPublish && !hasPaidSubscription) {
      return res.status(403).json({
        error: "Subscription required",
        message: "Upgrade to publish more proofs on-chain. Your first proof was free!",
        upgradeRequired: true
      });
    }

    // Get user's artifacts and profile for anchoring
    const artifacts = await dbService.getArtifacts(username);
    const profile = await dbService.getProfile(username);

    if (!artifacts || artifacts.length === 0) {
      return res.status(400).json({
        error: "No artifacts found",
        message: "Please run an analysis first before publishing"
      });
    }

    if (!profile) {
      return res.status(400).json({
        error: "No profile found",
        message: "Please run an analysis first before publishing"
      });
    }

    // Anchor to Stacks blockchain via oracle
    const { stacksPrincipal } = req.body;
    console.log(`[Publish] Publishing proof for ${username}...`);
    const proof = await blockchainService.anchorSnapshotStacks(
      artifacts,
      profile,
      username,
      stacksPrincipal
    );

    // Save blockchain proof to database (txId as transactionHash, blockNumber 0 until confirmed)
    await dbService.saveBlockchainProof(
      username,
      proof.txId,
      proof.artifactHash,
      0,
      Math.floor(Date.now() / 1000),
      proof.skillScores
    );

    console.log(`[Publish] Successfully published proof for ${username}: ${proof.txId}`);

    res.json({
      success: true,
      proof: {
        transactionHash: proof.txId,
        artifactHash: proof.artifactHash,
        blockNumber: 0,
        timestamp: Math.floor(Date.now() / 1000),
        skillScores: proof.skillScores
      },
      message: isFirstPublish
        ? "Your first proof has been published for free!"
        : "Proof published successfully!"
    });
  } catch (error: any) {
    console.error("Publish proof error:", error);
    res.status(500).json({ error: error.message || "Failed to publish proof" });
  }
});

// Public profile endpoint (no auth required)
router.get("/public/:username", async (req, res) => {
  try {
    const { username } = req.params;

    // Get verified profile data
    const profileData = await dbService.getProfileWithMeta(username);

    if (!profileData) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const { profile, lastAnalyzed } = profileData;

    // Get proofs
    const proofs = await dbService.getBlockchainProofs(username);

    res.json({
      username,
      profile,
      proofs,
      isVerified: proofs.length > 0,
      lastAnalyzed
    });
  } catch (error) {
    console.error("Public profile fetch error:", error);
    res.status(500).json({ error: "Failed to fetch public profile" });
  }
});

export default router;
