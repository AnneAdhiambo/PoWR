"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ProofChainPanel } from "../../../components/recruiter/ProofChainPanel";
import { recruiterApiClient } from "../../../lib/recruiterApi";
import { ArrowLeft, Briefcase, BookmarkSimple, PaperPlaneTilt, ShieldCheck } from "phosphor-react";
import toast from "react-hot-toast";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default function RecruiterDeveloperPage({ params }: PageProps) {
  const { username } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactMsg, setContactMsg] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/auth");
      return;
    }
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const result = await recruiterApiClient.getDeveloperProfile(username);
      setData(result);
    } catch (error: any) {
      if (error.status === 402 && error.upgradeRequired) {
        toast.error("Profile view limit reached. Upgrade to Pro for unlimited views.");
        router.push("/recruiter/account");
      } else {
        toast.error(error.message || "Failed to load profile");
        router.push("/recruiter/search");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await recruiterApiClient.contactDeveloper(username, contactMsg);
      toast.success("Request sent!");
      setContactOpen(false);
      setContactMsg("");
    } catch (error: any) {
      if (error.upgradeRequired) {
        toast.error("Outreach requires a Pro plan.");
      } else {
        toast.error(error.message || "Failed to send request");
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#3b76ef] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const { profile, proofs, isVerified, lastAnalyzed, artifactsCount } = data;
  const skills: any[] = profile?.skills || [];
  const topSkills = [...skills].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Back */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" weight="bold" />
          Back to search
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">
          {/* Left: Identity */}
          <div className="space-y-4">
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
              <img
                src={`https://github.com/${username}.png?size=96`}
                alt={username}
                className="w-20 h-20 rounded-full mb-4 bg-[rgba(255,255,255,0.05)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${username}&background=12141a&color=fff&size=96`;
                }}
              />
              <h1 className="text-xl font-bold text-white mb-0.5">@{username}</h1>
              {lastAnalyzed && (
                <p className="text-xs text-gray-500 mb-3">
                  Last active: {new Date(lastAnalyzed).toLocaleDateString()}
                </p>
              )}

              {isVerified && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(59,118,239,0.08)] border border-[#3b76ef]/20 mb-4">
                  <ShieldCheck className="w-4 h-4 text-[#3b76ef]" weight="fill" />
                  <span className="text-xs font-semibold text-[#3b76ef]">Blockchain Verified</span>
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => setContactOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#3b76ef] hover:bg-[#3265cc] text-white text-sm font-medium transition-colors"
                >
                  <PaperPlaneTilt className="w-4 h-4" weight="fill" />
                  Request to Connect
                </button>
                <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] text-gray-300 text-sm font-medium transition-colors">
                  <BookmarkSimple className="w-4 h-4" weight="regular" />
                  Save to Pool
                </button>
              </div>
            </div>

            {/* Artifact summary */}
            {profile?.artifactSummary && (
              <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">GitHub Activity</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Repos", value: profile.artifactSummary.repos },
                    { label: "Commits", value: profile.artifactSummary.commits },
                    { label: "PRs", value: profile.artifactSummary.pullRequests },
                    { label: "Merged", value: profile.artifactSummary.mergedPRs },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-lg font-bold text-white">{value ?? "—"}</p>
                      <p className="text-[10px] text-gray-600">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Center: PoW breakdown */}
          <div className="space-y-4">
            {/* Overall index */}
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Overall PoW Index</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">{Math.round(profile?.overallIndex || 0)}</span>
                <span className="text-lg text-gray-500">/ 100</span>
              </div>
              {profile?.summary && (
                <p className="text-sm text-gray-400 mt-3 leading-relaxed">{profile.summary}</p>
              )}
            </div>

            {/* Skill breakdown */}
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-4">Skill Breakdown</p>
              <div className="space-y-4">
                {topSkills.map((skill: any) => (
                  <div key={skill.skill}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-white">{skill.skill}</span>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>Score: <span className="text-white">{Math.round(skill.score)}</span></span>
                        <span>P{Math.round(skill.percentile)}</span>
                        <span>{skill.artifactCount} artifacts</span>
                      </div>
                    </div>
                    <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#3b76ef] to-[#5b96ff] rounded-full"
                        style={{ width: `${Math.min(skill.score, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1">
                      <div
                        className="h-0.5 bg-[rgba(255,85,0,0.4)] rounded-full"
                        style={{ width: `${Math.min(skill.confidence || 0, 100)}%` }}
                        title="Confidence"
                      />
                    </div>
                  </div>
                ))}
                {topSkills.length === 0 && (
                  <p className="text-sm text-gray-600">No skill data available.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Proofs */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 font-medium">On-Chain Proofs</p>
            <ProofChainPanel proofs={proofs || []} isVerified={isVerified} />
          </div>
        </div>

      {/* Contact modal */}
      {contactOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12141a] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-white mb-1">Request to Connect</h3>
            <p className="text-sm text-gray-500 mb-4">
              Send @{username} a connection request.
            </p>
            <form onSubmit={handleContact} className="space-y-4">
              <textarea
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="Introduce yourself and your opportunity..."
                rows={4}
                className="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(59,118,239,0.5)] resize-none"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setContactOpen(false)}
                  className="flex-1 py-2.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-300 text-sm font-medium hover:bg-[rgba(255,255,255,0.08)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !contactMsg.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-[#3b76ef] hover:bg-[#3265cc] text-white text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
