"use client";

import { useEffect, useState } from "react";
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

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<PoWProfile | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string>("Loading your PoW profile...");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [subscription, setSubscription] = useState<any>(null);
  const [nextUpdateDate, setNextUpdateDate] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showPublishPrompt, setShowPublishPrompt] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<{
    hasUnpublished: boolean;
    lastAnalyzed: string | null;
  } | null>(null);
  const [skillBadges, setSkillBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<GithubBadge[]>([]);

  // Get from sessionStorage (set by auth callback)
  const [username, setUsername] = useState<string>("");
  const [accessToken, setAccessToken] = useState<string>("");

  // User info for sidebar - must be declared before any conditional returns
  const [userEmail, setUserEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    // Get auth data from localStorage
    const token = localStorage.getItem("github_token");
    const storedUsername = localStorage.getItem("github_username");

    if (token && storedUsername) {
      // Check if token is still valid
      checkTokenValidity(token, storedUsername).then((isValid) => {
        if (isValid) {
          setAccessToken(token);
          setUsername(storedUsername);
        } else {
          // Token expired or invalid, clear and redirect to login
          localStorage.removeItem("github_token");
          localStorage.removeItem("github_username");
          localStorage.removeItem("github_token_timestamp");
          router.push("/auth");
        }
      });
    } else {
      // No auth data, redirect to auth page
      router.push("/auth");
      return;
    }
  }, [router]);

  const checkTokenValidity = async (token: string, username: string): Promise<boolean> => {
    try {
      // Check token timestamp (GitHub tokens typically don't expire, but we'll validate anyway)
      const tokenTimestamp = localStorage.getItem("github_token_timestamp");
      if (tokenTimestamp) {
        const tokenAge = Date.now() - parseInt(tokenTimestamp);
        // If token is older than 30 days, validate it
        if (tokenAge > 30 * 24 * 60 * 60 * 1000) {
          // Validate token by making a test API call
          const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
          const response = await fetch(`${apiBaseUrl}/api/auth/validate?token=${encodeURIComponent(token)}`);
          if (!response.ok) return false;
          const data = await response.json();
          return data.valid === true;
        }
        // Token is recent, assume valid
        return true;
      }
      // No timestamp, validate token
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const response = await fetch(`${apiBaseUrl}/api/auth/validate?token=${encodeURIComponent(token)}`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  };

  useEffect(() => {
    if (username && accessToken) {
      loadDashboard();

      // Poll for progress updates
      const progressInterval = setInterval(async () => {
        try {
          const progress = await apiClient.getProgress(username);
          if (progress.stage !== "idle" && progress.stage !== "complete") {
            setProgressMessage(progress.message);
            setProgressPercent(progress.progress);
          }
        } catch (error) {
          // Ignore progress polling errors
        }
      }, 500); // Poll every 500ms

      return () => clearInterval(progressInterval);
    }
  }, [username, accessToken]);

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e50544f0-1e4f-47a1-90ac-c89d010c6423', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/page.tsx:47', message: 'loadDashboard entry', data: { hasToken: !!accessToken, username }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
    // #endregion
    try {
      setLoading(true);
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
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e50544f0-1e4f-47a1-90ac-c89d010c6423', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/page.tsx:95', message: 'Promise.all start', data: { username }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
        // #endregion
        const [profileData, artifactsData, proofsData, subscriptionData, nextUpdateData, analysisStatusData, badgesData] = await Promise.all([
          apiClient.getUserProfile(username, accessToken).catch(err => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e50544f0-1e4f-47a1-90ac-c89d010c6423', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/page.tsx:96', message: 'getUserProfile error', data: { error: err?.message || String(err) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
            // #endregion
            throw err;
          }),
          apiClient.getUserArtifacts(username, accessToken || undefined).catch(err => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e50544f0-1e4f-47a1-90ac-c89d010c6423', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/page.tsx:97', message: 'getUserArtifacts error', data: { error: err?.message || String(err) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
            // #endregion
            throw err;
          }),
          apiClient.getProofs(username).catch(err => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e50544f0-1e4f-47a1-90ac-c89d010c6423', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/page.tsx:98', message: 'getProofs error', data: { error: err?.message || String(err) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
            // #endregion
            throw err;
          }),
          apiClient.getCurrentSubscription(username).catch(() => ({ subscription: null, plan: null })),
          apiClient.getNextUpdateDate(username).catch(() => ({ nextUpdateDate: null, planType: "free" })),
          apiClient.getAnalysisStatus(username).catch(() => ({ hasProfile: false, hasUnpublished: false, lastAnalyzed: null, lastPublished: null })),
          apiClient.getUserBadges(username).catch(() => ({ skillBadges: [], achievements: [] })),
        ]);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e50544f0-1e4f-47a1-90ac-c89d010c6423', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/page.tsx:100', message: 'Promise.all complete', data: { hasProfile: !!profileData, hasArtifacts: !!artifactsData, hasProofs: !!proofsData }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'C' }) }).catch(() => { });
        // #endregion
        setProfile(profileData);
        setArtifacts(artifactsData.artifacts);
        setProofs(proofsData.proofs);
        setSubscription(subscriptionData.subscription);
        setNextUpdateDate(nextUpdateData.nextUpdateDate);
        setAnalysisStatus({
          hasUnpublished: analysisStatusData.hasUnpublished,
          lastAnalyzed: analysisStatusData.lastAnalyzed
        });
        setSkillBadges(badgesData.skillBadges);
        setAchievements(badgesData.achievements);
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e50544f0-1e4f-47a1-90ac-c89d010c6423', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/page.tsx:104', message: 'loadDashboard catch', data: { error: error?.message || String(error) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
      console.error("Failed to load dashboard:", error);
    } finally {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e50544f0-1e4f-47a1-90ac-c89d010c6423', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'dashboard/page.tsx:107', message: 'loadDashboard finally', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
      // #endregion
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
      toast.loading("Analyzing your artifacts...", { id: "analyzing" });
      const result = await apiClient.triggerAnalysis(username, accessToken, 12);
      setProfile(result.profile);
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
          <div className="w-16 h-16 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0A0B0D] flex">
        <Sidebar
          username={username}
          email={userEmail || undefined}
          displayName={displayName}
        />
        <div className="flex-1 flex items-center justify-center p-4 ml-60">
          <div className="text-center">
            <p className="text-gray-400 mb-4">No profile found</p>
            <Button onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? "Analyzing..." : "Generate Profile"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
                <ArrowClockwise className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} weight="regular" />
                {analyzing ? "Analyzing..." : "Refresh Analysis"}
              </Button>
            </div>

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
                <div className="grid grid-cols-4 gap-4">
                  {/* Trust Score - Large Circle */}
                  <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] rounded-[14px] p-4 flex flex-col items-center justify-center min-h-[84px]">
                    <TrustScoreCircle score={profile.overallIndex} size="md" />
                  </div>

                  {/* Other Metrics - 3 cards */}
                  <div className="col-span-3">
                    <ArtifactsSummary
                      repos={profile.artifactSummary.repos}
                      commits={profile.artifactSummary.commits}
                      pullRequests={profile.artifactSummary.pullRequests}
                      mergedPRs={profile.artifactSummary.mergedPRs}
                    />
                  </div>
                </div>

                {/* Middle Section: Two Columns */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Skill Percentiles - Radar Chart */}
                  <SkillsRadarChart skills={profile.skills} />

                  {/* Recent Verified Work */}
                  <RecentWorkFeed artifacts={artifacts} limit={5} />
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
                      {profile.summary}
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

