"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { TrustScoreCircle } from "../components/ui/TrustScoreCircle";
import { SkillsRadarChart } from "../components/dashboard/SkillsRadarChart";
import { ArtifactsSummary } from "../components/dashboard/ArtifactsSummary";
import { RecentWorkFeed } from "../components/dashboard/RecentWorkFeed";
import { OnChainProofs } from "../components/dashboard/OnChainProofs";
import { SuggestedJobsGigs } from "../components/dashboard/SuggestedJobsGigs";
import { RecentActivity } from "../components/dashboard/RecentActivity";
import { BadgeGrid } from "../components/profile/BadgeGrid";
import { apiClient, PoWProfile, Artifact, Badge, GithubBadge } from "../lib/api";
import { Proof } from "../components/dashboard/OnChainProofs";
import { Button, Card } from "../components/ui";
import { ArrowClockwise, Quotes, Sparkle } from "phosphor-react";
import { PricingModal } from "../components/subscription/PricingModal";
import toast from "react-hot-toast";
import { openSourceApi } from "../lib/openSourceApi";
import { StreetScoreCircle } from "../components/ui/StreetScoreCircle";
import { SquircleLoader } from "../components/ui/SquircleLoader";

const INITIAL_PROFILE: PoWProfile = {
  skills: [
    { skill: "Backend Engineering", score: 0, percentile: 0, confidence: 0, artifactCount: 0 },
    { skill: "Frontend Engineering", score: 0, percentile: 0, confidence: 0, artifactCount: 0 },
    { skill: "DevOps / Infrastructure", score: 0, percentile: 0, confidence: 0, artifactCount: 0 },
    { skill: "Systems / Architecture", score: 0, percentile: 0, confidence: 0, artifactCount: 0 },
  ],
  overallIndex: 0,
  artifactSummary: { repos: 0, commits: 0, pullRequests: 0, mergedPRs: 0 },
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PoWProfile | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisFailed, setAnalysisFailed] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>("Loading your PoW profile...");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [nextUpdateDate, setNextUpdateDate] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPublishPrompt, setShowPublishPrompt] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<{
    hasProfile: boolean;
    hasUnpublished: boolean;
    lastAnalyzed: string | null;
  } | null>(null);
  const [skillBadges, setSkillBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<GithubBadge[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [streetPoints, setStreetPoints] = useState(0);
  const analysisStartedRef = useRef(false);
  const analysisCompletedRef = useRef(false);

  // Get from sessionStorage (set by auth callback)
  const [username, setUsername] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");

  // User info for sidebar - must be declared before any conditional returns
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("github_username");
    if (!storedUsername) return;
    setAccessToken("server-session");
    setUsername(storedUsername);
  }, []);

  useEffect(() => {
    if (username && accessToken) {
      setProfile((current) => current || INITIAL_PROFILE);
      setLoading(false);
      loadDashboard();

      // Poll for progress updates
      const progressInterval = setInterval(async () => {
        try {
          const progress = await apiClient.getProgress(username);
          if (progress.status === "running") {
            setAnalyzing(true);
            setAnalysisFailed(false);
            setProgressMessage(progress.message);
            setProgressPercent(progress.progress);
          } else if (progress.status === "failed") {
            setAnalyzing(false);
            setAnalysisFailed(true);
            setProgressMessage(progress.message);
            setProgressPercent(progress.progress);
          } else if (progress.status === "complete" && !analysisCompletedRef.current) {
            analysisCompletedRef.current = true;
            setAnalysisFailed(false);
            setProgressMessage("Your evidence profile is ready");
            setProgressPercent(100);
            setAnalyzing(false);
            await loadDashboard();
          }
        } catch (error) {
          // Ignore progress polling errors
        }
      }, 2000);

      return () => clearInterval(progressInterval);
    }
  }, [username, accessToken]);

  const startBackgroundAnalysis = () => {
    if (!username || analysisStartedRef.current) return;
    analysisStartedRef.current = true;
    setAnalyzing(true);
    setAnalysisFailed(false);
    setProgressMessage("Preparing your public GitHub evidence…");
    setProgressPercent(5);
    void apiClient.triggerAnalysis(username, accessToken, 12)
      .then((result) => {
        setProfile(result.profile);
        setProgressMessage("Your evidence profile is ready");
        setProgressPercent(100);
        setAnalyzing(false);
        setAnalysisFailed(false);
        analysisCompletedRef.current = true;
        void loadDashboard();
      })
      .catch((error) => {
        console.error("Background analysis failed:", error);
        setAnalyzing(false);
        setAnalysisFailed(true);
        setProgressMessage("Analysis stopped before completion. You can retry safely.");
      });
  };

  useEffect(() => {
    if (!username) return;
    openSourceApi.profile(username)
      .then((data) => setStreetPoints(Number(data.openSource.street_points || 0)))
      .catch(() => setStreetPoints(0));
  }, [username]);

  // Get user email and display name for sidebar
  useEffect(() => {
    // Try to get user email from localStorage or API
    const storedEmail = localStorage.getItem("github_email");
    if (storedEmail) {
      setUserEmail(storedEmail);
    }
    if (username) {
      setDisplayName(username);
    }
  }, [username]);

  const loadDashboard = async () => {
    try {
      // For demo, we'll use mock data if no token
      if (!accessToken) {
        // Mock data for development
        setProfile({
          skills: [
            {
              skill: "Backend Engineering",
              score: 82,
              percentile: 12,
              confidence: 90,
              artifactCount: 45,
            },
            {
              skill: "Frontend Engineering",
              score: 65,
              percentile: 35,
              confidence: 75,
              artifactCount: 32,
            },
            {
              skill: "DevOps / Infrastructure",
              score: 45,
              percentile: 55,
              confidence: 60,
              artifactCount: 12,
            },
            {
              skill: "Systems / Architecture",
              score: 70,
              percentile: 30,
              confidence: 80,
              artifactCount: 28,
            },
          ],
          overallIndex: 65,
          artifactSummary: {
            repos: 15,
            commits: 234,
            pullRequests: 42,
            mergedPRs: 38,
          },
        });
        setArtifacts([]);
        setProofs([]);
        setProjects([
          {
            name: "powr-ui",
            fullName: `${username || "dev"}/powr-ui`,
            description: "Custom glassmorphic component library for Web3 portals.",
            language: "CSS",
            stars: 12,
            contributionsCount: 15,
            rating: "Medium",
            contributionSummary: [
              "Created modular glassmorphic components, inputs, and card wrappers",
              "Implemented dark mode support and optimized responsive CSS layouts"
            ],
            keyAreas: ["CSS", "Design Systems", "Web Accessibility"],
            engineeringImpact: "Standardized UI consistency across three client portals."
          }
        ]);
      } else {
        const [profileData, artifactsData, proofsData, subscriptionData, nextUpdateData, analysisStatusData, badgesData, projectsData] = await Promise.all([
          apiClient.getUserProfile(username, accessToken).catch(() => {
            return null;
          }),
          apiClient.getUserArtifacts(username, accessToken || undefined).catch(() => {
            return { artifacts: [] };
          }),
          apiClient.getProofs(username).catch(() => {
            return { proofs: [] };
          }),
          apiClient.getCurrentSubscription(username).catch(() => ({ subscription: null, plan: null })),
          apiClient.getNextUpdateDate(username).catch(() => ({ nextUpdateDate: null, planType: "free" })),
          apiClient.getAnalysisStatus(username).catch(() => ({ hasProfile: false, hasUnpublished: false, lastAnalyzed: null, lastPublished: null })),
          apiClient.getUserBadges(username).catch(() => ({ skillBadges: [], achievements: [] })),
          apiClient.getUserProjects(username).catch(() => ({ projects: [] })),
        ]);
        setProfile(profileData || INITIAL_PROFILE);
        setArtifacts(artifactsData.artifacts);
        setProofs(proofsData.proofs);
        setSubscription(subscriptionData.subscription);
        setNextUpdateDate(nextUpdateData.nextUpdateDate);
        setAnalysisStatus({
          hasProfile: Boolean(profileData) || analysisStatusData.hasProfile,
          hasUnpublished: analysisStatusData.hasUnpublished,
          lastAnalyzed: analysisStatusData.lastAnalyzed
        });
        setSkillBadges(badgesData.skillBadges);
        setAchievements(badgesData.achievements);
        setProjects(projectsData.projects || []);
        if (!analysisStatusData.hasProfile) startBackgroundAnalysis();
      }
    } catch (error: any) {
      console.error("Failed to load dashboard:", error);
      setProfile((current) => current || INITIAL_PROFILE);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!accessToken) {
      toast.error("Please connect your GitHub account first");
      return;
    }

    try {
      setAnalyzing(true);
      setAnalysisFailed(false);
      setProgressMessage("Preparing your public GitHub evidence…");
      setProgressPercent(5);
      toast.loading("Analyzing your artifacts...", { id: "analyzing" });
      const result = await apiClient.triggerAnalysis(username, accessToken, 12);
      setProfile(result.profile);
      setProgressMessage("Your evidence profile is ready");
      setProgressPercent(100);
      await loadDashboard();
      toast.success("Analysis complete! Ready to publish on-chain.", { id: "analyzing" });
      // Show publish prompt after successful analysis
      setShowPublishPrompt(true);
    } catch (error: any) {
      const errorMsg = error?.message || "";
      if (errorMsg.includes("403") || errorMsg.includes("Forbidden") || errorMsg.includes("Update not allowed") || errorMsg.includes("upgrade")) {
        toast.dismiss("analyzing");
        toast("Upgrade required for more frequent updates", {
          icon: "⚡",
          duration: 3000,
        });
        setShowUpgradeModal(true);
      } else {
        console.error("Analysis failed:", error);
        setAnalysisFailed(true);
        setProgressMessage("Analysis stopped before completion. You can retry safely.");
        toast.error("Failed to analyze artifacts", { id: "analyzing" });
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePublishProof = async () => {
    setPublishing(true);
    try {
      toast.loading("Publishing proof to blockchain...", { id: "publish-proof" });
      const result = await apiClient.publishProof(username);

      if (result.success) {
        toast.success(result.message || "Proof published successfully!", { id: "publish-proof" });
        setShowPublishPrompt(false);
        await loadDashboard();
      }
    } catch (error: any) {
      const errorMsg = error?.message || "";
      if (errorMsg.includes("403") || errorMsg.includes("Forbidden") || errorMsg.includes("Subscription required") || errorMsg.includes("upgrade")) {
        toast.dismiss("publish-proof");
        toast("Upgrade to publish more proofs on-chain", {
          icon: "⚡",
          duration: 3000,
        });
        setShowPublishPrompt(false);
        setShowUpgradeModal(true);
      } else {
        console.error("Failed to publish proof:", error);
        toast.error(errorMsg || "Failed to publish proof", { id: "publish-proof" });
      }
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="mx-auto mb-4"><SquircleLoader size={64} label="Loading dashboard" /></div>
          <p className="text-gray-400 mb-2">{progressMessage}</p>
          {progressPercent > 0 && (
            <div className="w-64 h-2 bg-[#141519] rounded-full mx-auto overflow-hidden">
              <div
                className="h-full bg-[#FF5500] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const dashboardProfile = profile || INITIAL_PROFILE;

  return (
    <>
      <div className="min-h-screen bg-[#0b0c0f] flex">
        {/* Sidebar */}
        <Sidebar
          username={username}
          email={userEmail || undefined}
          displayName={displayName}
        />

        {/* Main Content Area with Container */}
        <div className="flex-1 overflow-y-auto ml-60">
          <div className="max-w-[1200px] mx-auto px-6 py-4">
            {/* Top Section: Proof-of-Work Index */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight mb-1.5" style={{ fontWeight: 500 }}>
                  Proof-of-Work Index
                </h1>
                <p className="text-xs text-gray-400" style={{ opacity: 0.6 }}>
                  Here is the overview of your proof of work and latest stage.
                </p>
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing}
                variant="outline"
                className="flex items-center gap-2 text-xs px-3 py-1.5"
              >
                {analyzing ? <SquircleLoader size={14} color="currentColor" label="Analyzing" /> : <ArrowClockwise className="w-3.5 h-3.5" weight="regular" />}
                {analyzing ? "Analyzing..." : "Refresh Analysis"}
              </Button>
            </div>

            {(analyzing || analysisFailed) && (
              <div className={`mb-6 overflow-hidden rounded-[14px] border p-4 ${analysisFailed ? "border-red-400/20 bg-red-400/[0.06]" : "border-[#ff6a1a]/20 bg-gradient-to-r from-[#ff6a1a]/10 to-[#8b5cf6]/[0.06]"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                      <span className={`relative flex h-2.5 w-2.5 rounded-full ${analysisFailed ? "bg-red-400" : "bg-[#ff6a1a]"}`}>
                        {!analysisFailed && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff6a1a] opacity-50" />}
                      </span>
                      {analysisFailed ? "Analysis needs attention" : "Building your evidence profile"}
                    </div>
                    <p className="mt-1 text-xs text-[#9ca2ad]">{progressMessage || "Reviewing repositories, contributions, and engineering signals…"}</p>
                  </div>
                  {analysisFailed ? (
                    <Button type="button" size="sm" onClick={handleAnalyze} className="shrink-0 cursor-pointer">Retry analysis</Button>
                  ) : (
                    <div className="text-sm font-semibold text-[#ff9a64]">{Math.max(5, progressPercent)}%</div>
                  )}
                </div>
                {!analysisFailed && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-[#ff6a1a] to-[#a855f7] transition-all duration-500" style={{ width: `${Math.max(5, progressPercent)}%` }} /></div>}
                <div className="mt-2 text-[10px] text-[#6f7580]">{analysisFailed ? (analysisStatus?.hasProfile ? "Your last saved profile remains available." : "No new score was saved from this attempt.") : "You can explore jobs, open source, and your workspace while PoWR finishes."}</div>
              </div>
            )}

            {/* Publish Prompt Banner */}
            {showPublishPrompt && (
              <div className="mb-6 p-4 rounded-[14px] bg-gradient-to-r from-[rgba(255,85,0,0.15)] to-[rgba(139,92,246,0.15)] border border-[rgba(255,85,0,0.3)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[rgba(255,85,0,0.2)] flex items-center justify-center">
                      <span className="text-xl">🎉</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white">Analysis Complete!</h3>
                      <p className="text-xs text-gray-400">
                        Your profile is ready. Publish now or wait for batch publishing (1st & 15th of each month).
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShowPublishPrompt(false);
                        toast("You can publish anytime from On-Chain Proofs page", {
                          icon: "📋",
                          duration: 4000,
                        });
                      }}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Wait for Batch
                    </button>
                    <Button
                      onClick={handlePublishProof}
                      disabled={publishing}
                      className="flex items-center gap-2 text-xs"
                    >
                      {publishing ? "Publishing..." : "Publish Now"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Grid: 3-column layout */}
            <div className="grid grid-cols-[1fr_320px] gap-6">
              {/* Main Content Column */}
              <div className="space-y-6">
                {/* Metrics Cards Row */}
                <div className="grid grid-cols-5 gap-4">
                  {/* Trust Score - Large Circle */}
                  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] rounded-[14px] p-4 flex flex-col items-center justify-center min-h-[84px]">
                    <TrustScoreCircle score={dashboardProfile.overallIndex} size="md" />
                  </div>

                  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] rounded-[14px] p-4 flex flex-col items-center justify-center min-h-[84px]">
                    <StreetScoreCircle points={streetPoints} size={92} compact />
                    <span className="mt-2 text-xs text-gray-400">Street Score</span>
                  </div>

                  {/* Other Metrics - 3 cards */}
                  <div className="col-span-3">
                    <ArtifactsSummary
                      repos={dashboardProfile.artifactSummary.repos}
                      commits={dashboardProfile.artifactSummary.commits}
                      pullRequests={dashboardProfile.artifactSummary.pullRequests}
                      mergedPRs={dashboardProfile.artifactSummary.mergedPRs}
                    />
                  </div>
                </div>

                {/* Middle Section: Two Columns */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Skill Percentiles - Radar Chart */}
                  <SkillsRadarChart skills={dashboardProfile.skills} />

                  {/* Recent Verified Work */}
                  <RecentWorkFeed artifacts={artifacts} limit={5} projects={projects} />
                </div>

                {/* Bottom Section: On-Chain Proofs */}
                <div>
                  <OnChainProofs
                    proofs={proofs}
                    username={username}
                    onRefresh={loadDashboard}
                    unpublishedAnalysis={analysisStatus?.hasUnpublished && analysisStatus.lastAnalyzed ? {
                      lastAnalyzed: analysisStatus.lastAnalyzed,
                      onPublish: handlePublishProof,
                      isPublishing: publishing
                    } : undefined}
                  />
                </div>

                {/* Badges Section */}
                <BadgeGrid skillBadges={skillBadges} achievements={achievements} />
              </div>

              {/* Right Rail Column */}
              <div className="space-y-6">
                {/* AI Profile Summary */}
                {profile?.summary && (
                  <Card className="p-4 rounded-[16px] relative overflow-hidden border border-[#FF5500]/20 bg-[#FF5500]/5">
                    <div className="absolute top-2 right-2 opacity-20">
                      <Quotes className="w-8 h-8 text-[#FF6B2B]" weight="fill" />
                    </div>
                    <h3 className="text-xs font-medium text-[#FF6B2B] mb-2 flex items-center gap-1.5">
                      <Sparkle className="w-3.5 h-3.5" weight="fill" />
                      AI Profile Summary
                    </h3>
                    <p className="text-gray-300 leading-relaxed text-xs relative z-10 font-light tracking-wide">
                      {dashboardProfile.summary}
                    </p>
                  </Card>
                )}

                {/* Recent Activity - On-Chain Proof Publishing */}
                <RecentActivity
                  proofs={proofs}
                  unpublishedAnalysis={analysisStatus?.hasUnpublished && analysisStatus.lastAnalyzed ? {
                    lastAnalyzed: analysisStatus.lastAnalyzed,
                    onPublish: handlePublishProof,
                    isPublishing: publishing
                  } : undefined}
                />

                <div className="bg-[#12141a] border border-[rgba(255,255,255,0.04)] rounded-[16px] p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Subscription</h3>
                  {subscription ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Plan</span>
                        <span className="text-xs font-medium text-white capitalize">{subscription.planType}</span>
                      </div>
                      {nextUpdateDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">Next Update</span>
                          <span className="text-xs text-gray-300">{new Date(nextUpdateDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      <button
                        onClick={() => router.push("/subscription")}
                        className="w-full mt-3 py-2 px-3 rounded-lg bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.12)] text-xs text-white transition-colors border border-[rgba(255,255,255,0.06)]"
                      >
                        Manage Subscription
                      </button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-gray-400 mb-3">Upgrade for more frequent updates</p>
                      <button
                        onClick={() => router.push("/subscription")}
                        className="w-full py-2 px-3 rounded-lg bg-[#FF5500] hover:bg-[#4d85f0] text-xs text-white transition-colors"
                      >
                        View Plans
                      </button>
                    </div>
                  )}
                </div>
                <SuggestedJobsGigs />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <PricingModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        username={username}
      />
    </>
  );
}

