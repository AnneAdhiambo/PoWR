"use client";

import React, { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ProofChainPanel } from "../../../components/recruiter/ProofChainPanel";
import { SkillRadarChart } from "../../../components/recruiter/SkillRadarChart";
import { recruiterApiClient } from "../../../lib/recruiterApi";
import { getOrCreateKeypair, getPubkeyForIdentifier, sendDM, RELAYS } from "../../../lib/nostr";
import { SimplePool } from "nostr-tools";
import {
  ArrowLeft, PaperPlaneTilt, BookmarkSimple, ShieldCheck,
  GithubLogo, GitCommit, GitPullRequest, Folder,
  Medal, Star, Lightning,
} from "phosphor-react";
import toast from "react-hot-toast";

interface PageProps {
  params: Promise<{ username: string }>;
}

const TIER_LABELS = ["", "Bronze", "Silver", "Gold"];
const TIER_COLORS = ["", "#cd7f32", "#9ca3af", "#f59e0b"];
const TIER_BG    = ["", "rgba(205,127,50,0.12)", "rgba(156,163,175,0.12)", "rgba(245,158,11,0.12)"];

function TierBadge({ tier, skill }: { tier: number; skill: string }) {
  if (!tier) return null;
  return (
    <div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold"
      style={{ borderColor: TIER_COLORS[tier] + "55", background: TIER_BG[tier], color: TIER_COLORS[tier] }}
    >
      <Medal size={12} weight="fill" />
      {TIER_LABELS[tier]} · {skill}
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const fill = (value / 100) * circ;
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        <circle
          cx="56" cy="56" r={r} fill="none"
          stroke="url(#scoreGrad)" strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF5500" />
            <stop offset="100%" stopColor="#B19EEF" />
          </linearGradient>
        </defs>
      </svg>
      <div className="text-center">
        <div className="text-3xl font-black text-white leading-none">{value}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">/ 100</div>
      </div>
    </div>
  );
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
    if (!localStorage.getItem("recruiter_token")) { router.replace("/recruiter/auth"); return; }
    loadProfile();
  }, [username]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const result = await recruiterApiClient.getDeveloperProfile(username);
      setData(result);
    } catch (error: any) {
      if (error.status === 402 && error.upgradeRequired) {
        toast.error("Profile view limit reached. Upgrade to view more.");
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
      const recruiterEmail = localStorage.getItem("recruiter_email") || "";
      const recruiterCompany = localStorage.getItem("recruiter_company") || recruiterEmail;

      // Derive developer pubkey deterministically from their username — no DB needed
      const devPubkey = await getPubkeyForIdentifier(username);
      const { sk } = await getOrCreateKeypair(recruiterEmail);
      const pool = new SimplePool();

      // Prefix message with recruiter identity so developer knows who reached out
      const messageWithContext = `[${recruiterCompany} via PoWR]\n\n${contactMsg}`;
      await sendDM(sk, devPubkey, messageWithContext, pool);

      // Delay pool close so all relays receive the message
      setTimeout(() => pool.close(RELAYS), 8000);

      // Also log the outreach in DB for recruiter CRM
      recruiterApiClient.contactDeveloper(username, contactMsg).catch(() => {});

      toast.success("Message sent!");
      router.push(`/recruiter/chat?with=${encodeURIComponent(devPubkey)}&name=${encodeURIComponent(username)}`);
      setContactOpen(false);
      setContactMsg("");
    } catch (error: any) {
      toast.error(error.upgradeRequired ? "Outreach requires a paid plan." : (error.message || "Failed to send"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  const { profile, proofs, isVerified, lastAnalyzed, artifactsCount } = data;
  const skills: any[] = profile?.skills || [];
  const topSkills = [...skills].sort((a, b) => b.score - a.score);
  const overallScore = Math.round(profile?.overallIndex || 0);

  // Derive badges from skill tiers
  const badges = topSkills
    .filter(s => s.score >= 20)
    .map(s => ({
      skill: s.skill.replace(" Engineering", "").replace(" / ", "/"),
      tier: s.score >= 70 ? 3 : s.score >= 45 ? 2 : 1,
    }));

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={14} weight="bold" />
        Back to search
      </button>

      {/* ── Hero banner ── */}
      <div className="relative rounded-2xl border border-white/8 bg-white/3 overflow-hidden mb-6">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF5500]/10 via-transparent to-[#B19EEF]/8 pointer-events-none" />

        <div className="relative p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar + name */}
          <div className="flex items-center gap-5 flex-1 min-w-0">
            <div className="relative shrink-0">
              <img
                src={`https://github.com/${username}.png?size=128`}
                alt={username}
                className="w-20 h-20 rounded-2xl bg-white/5 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://ui-avatars.com/api/?name=${username}&background=12141a&color=fff&size=128`;
                }}
              />
              {isVerified && (
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-[#FF5500] flex items-center justify-center border-2 border-[#0A0B0D]">
                  <ShieldCheck size={12} weight="fill" className="text-white" />
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-white">@{username}</h1>
                {isVerified && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF5500]/15 text-[#FF5500] border border-[#FF5500]/30 font-semibold uppercase tracking-wide">
                    Verified
                  </span>
                )}
              </div>
              {lastAnalyzed && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Last analyzed {new Date(lastAnalyzed).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              {profile?.summary && (
                <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-xl line-clamp-2">
                  {profile.summary}
                </p>
              )}
            </div>
          </div>

          {/* Score ring */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <ScoreRing value={overallScore} />
            <p className="text-[10px] text-gray-600 uppercase tracking-wide">PoW Index</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0 w-44">
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-semibold transition-colors"
            >
              <PaperPlaneTilt size={14} weight="fill" />
              Request to Connect
            </button>
            <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/5 hover:bg-white/8 text-gray-300 text-sm font-medium transition-colors border border-white/8">
              <BookmarkSimple size={14} weight="regular" />
              Save to Pool
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      {profile?.artifactSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: <Folder size={16} weight="fill" className="text-[#FF5500]" />, label: "Repos",   value: profile.artifactSummary.repos },
            { icon: <GitCommit size={16} weight="fill" className="text-[#B19EEF]" />, label: "Commits", value: profile.artifactSummary.commits },
            { icon: <GitPullRequest size={16} weight="fill" className="text-[#FF9FFC]" />, label: "Pull Requests", value: profile.artifactSummary.pullRequests },
            { icon: <Lightning size={16} weight="fill" className="text-[#60efbc]" />, label: "Merged PRs", value: profile.artifactSummary.mergedPRs },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl border border-white/6 bg-white/2">
              {icon}
              <div>
                <div className="text-xl font-bold text-white">{value ?? "—"}</div>
                <div className="text-[11px] text-gray-600">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main 2-col grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

        {/* Left column */}
        <div className="space-y-6">

          {/* Radar chart + skill table side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Radar */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-4">Skill Radar</p>
              {topSkills.length >= 3 ? (
                <div className="h-52">
                  <SkillRadarChart skills={topSkills} />
                </div>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-gray-600">Not enough data</div>
              )}
            </div>

            {/* Badges */}
            <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-4">Earned Badges</p>
              {badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {badges.map(b => <TierBadge key={b.skill} tier={b.tier} skill={b.skill} />)}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Star size={28} weight="regular" className="text-gray-700 mb-2" />
                  <p className="text-sm text-gray-600">No badges yet</p>
                  <p className="text-xs text-gray-700 mt-1">Score 20+ in a skill to earn one</p>
                </div>
              )}
            </div>
          </div>

          {/* Skill breakdown */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-5">Skill Breakdown</p>
            {topSkills.length > 0 ? (
              <div className="space-y-5">
                {topSkills.map((skill: any) => {
                  const pct = Math.min(skill.score, 100);
                  const tier = pct >= 70 ? 3 : pct >= 45 ? 2 : pct >= 20 ? 1 : 0;
                  return (
                    <div key={skill.skill}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{skill.skill}</span>
                          {tier > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                              style={{ color: TIER_COLORS[tier], background: TIER_BG[tier] }}>
                              {TIER_LABELS[tier]}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="text-white font-bold text-sm">{Math.round(skill.score)}</span>
                          <span className="bg-white/6 px-2 py-0.5 rounded-full">P{Math.round(skill.percentile)}</span>
                          <span>{skill.artifactCount} artifacts</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-white/6 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, #FF5500, ${TIER_COLORS[tier] || "#5b96ff"})`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600">No skill data available.</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* GitHub link */}
          <a
            href={`https://github.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/3 hover:border-white/20 transition-colors group"
          >
            <GithubLogo size={20} weight="fill" className="text-gray-400 group-hover:text-white transition-colors" />
            <span className="text-sm text-gray-400 group-hover:text-white transition-colors font-medium">
              github.com/{username}
            </span>
          </a>

          {/* On-chain proofs */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-medium mb-4">On-Chain Proofs</p>
            <ProofChainPanel proofs={proofs || []} isVerified={isVerified} />
          </div>
        </div>
      </div>

      {/* ── Contact modal ── */}
      {contactOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#12141a] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <img
                src={`https://github.com/${username}.png?size=48`}
                className="w-10 h-10 rounded-xl"
                alt={username}
              />
              <div>
                <h3 className="text-base font-bold text-white">Request to Connect</h3>
                <p className="text-xs text-gray-500">@{username}</p>
              </div>
            </div>
            <form onSubmit={handleContact} className="space-y-4">
              <textarea
                value={contactMsg}
                onChange={(e) => setContactMsg(e.target.value)}
                placeholder="Introduce yourself and your opportunity…"
                rows={4}
                className="w-full px-4 py-3 bg-white/4 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5500]/50 resize-none transition-colors"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setContactOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-gray-300 text-sm font-medium hover:bg-white/8 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !contactMsg.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
