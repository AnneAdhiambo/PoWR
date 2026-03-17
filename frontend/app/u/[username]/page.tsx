"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "../../components/ui";
import {
  ArrowLeft,
  House,
  User,
  GithubLogo,
  ShieldCheck,
  TrendUp,
  ChartLine,
  GitCommit,
  GitMerge,
  GitBranch,
  Copy,
  Check,
  ShareNetwork,
  Quotes,
  Sparkle
} from "phosphor-react";
import { apiClient, PoWProfile, Artifact, Proof, Badge, GithubBadge } from "../../lib/api";
import { BadgeGrid } from "../../components/profile/BadgeGrid";
import toast from "react-hot-toast";

const PercentileBadge = ({ percentile, score }: { percentile: number; score: number }) => {
  const topPercent = 100 - percentile;
  const isTop = topPercent <= 25;
  const isMid = topPercent > 25 && topPercent <= 50;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${isTop
        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
        : isMid
          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
        }`}
    >
      <TrendUp className="w-3 h-3" weight="bold" />
      Top {topPercent}%
    </span>
  );
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<PoWProfile | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);
  const [skillBadges, setSkillBadges] = useState<Badge[]>([]);
  const [achievements, setAchievements] = useState<GithubBadge[]>([]);

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("github_token");
    setIsLoggedIn(!!token);

    loadProfile();
    apiClient.getUserBadges(username)
      .then((data) => {
        setSkillBadges(data.skillBadges);
        setAchievements(data.achievements);
      })
      .catch(() => {});
    // Fetch GitHub avatar
    fetch(`https://api.github.com/users/${username}`)
      .then(res => res.json())
      .then(data => {
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      })
      .catch(() => { });
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getPublicProfile(username);
      setProfile(data.profile);
      setProofs(data.proofs);
      setLastAnalyzed(data.lastAnalyzed);
    } catch (error) {
      console.error("Failed to load profile:", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const getSkillColor = (index: number) => {
    const colors = [
      { bar: "bg-blue-500", text: "text-blue-400" },
      { bar: "bg-emerald-500", text: "text-emerald-400" },
      { bar: "bg-violet-500", text: "text-violet-400" },
      { bar: "bg-amber-500", text: "text-amber-400" },
    ];
    return colors[index % colors.length];
  };

  const getProfileUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/u/${username}`;
    }
    return `/u/${username}`;
  };

  const copyProfileUrl = () => {
    navigator.clipboard.writeText(getProfileUrl());
    setCopied(true);
    toast.success("Profile URL copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareProfile = async () => {
    const url = getProfileUrl();
    const title = `${username}'s PoWR Profile`;
    const text = `Check out ${username}'s Proof-of-Work reputation on PoWR`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        // User cancelled or error
        copyProfileUrl();
      }
    } else {
      copyProfileUrl();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center p-4">
        <Card className="p-8 rounded-[16px] text-center max-w-md">
          <User className="w-12 h-12 text-gray-500 mx-auto mb-4" weight="regular" />
          <h2 className="text-lg font-medium text-white mb-2">Profile not found</h2>
          <p className="text-gray-400 text-sm mb-6">The user @{username} doesn't have a public profile yet.</p>
          {isLoggedIn && (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 text-sm hover:bg-blue-500/30 transition-colors"
            >
              <House className="w-4 h-4" weight="regular" />
              Go to Dashboard
            </Link>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0c0f]">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-[#0b0c0f]/80 backdrop-blur-md border-b border-[rgba(255,255,255,0.04)]">
        <div className="max-w-[1000px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" weight="regular" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="PoWR" className="h-7 w-auto" />
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-gray-300 text-sm transition-colors border border-[rgba(255,255,255,0.04)]"
              >
                <House className="w-4 h-4" weight="regular" />
                Dashboard
              </Link>
            )}
            <a
              href={`https://github.com/${username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-gray-300 text-sm transition-colors border border-[rgba(255,255,255,0.04)]"
            >
              <GithubLogo className="w-4 h-4" weight="fill" />
              GitHub
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-6 py-8">
        {/* Profile Header */}
        <Card className="p-6 rounded-[16px] mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center overflow-hidden border-2 border-[rgba(255,255,255,0.08)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt={username} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-gray-400" weight="regular" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-white mb-1">{username}</h1>
              <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                Public Proof-of-Work Profile
                {lastAnalyzed && (
                  <span className="text-xs text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded-full">
                    Updated {new Date(lastAnalyzed).toLocaleDateString()}
                  </span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" weight="fill" />
                  Verified Developer
                </span>
                <button
                  onClick={copyProfileUrl}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.06)] transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" weight="bold" /> : <Copy className="w-3.5 h-3.5" weight="regular" />}
                  {copied ? "Copied!" : "Copy URL"}
                </button>
                <button
                  onClick={shareProfile}
                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] px-2.5 py-1 rounded-full border border-[rgba(255,255,255,0.06)] transition-colors"
                >
                  <ShareNetwork className="w-3.5 h-3.5" weight="regular" />
                  Share
                </button>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">PoW Index</p>
              <p className="text-4xl font-bold text-white">{profile.overallIndex}</p>
            </div>
          </div>
        </Card>

        {/* Profile Summary */}
        {profile.summary && (
          <Card className="p-6 rounded-[16px] mb-6 relative overflow-hidden border border-blue-500/20 bg-blue-500/5">
            <div className="absolute top-4 right-4 opacity-20">
              <Quotes className="w-12 h-12 text-blue-400" weight="fill" />
            </div>
            <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
              <Sparkle className="w-4 h-4" weight="fill" />
              AI Profile Summary
            </h3>
            <p className="text-gray-300 leading-relaxed text-sm relative z-10 font-light tracking-wide">
              {profile.summary}
            </p>
          </Card>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Repos", value: profile.artifactSummary.repos, icon: GitBranch, color: "text-cyan-400" },
            { label: "Commits", value: profile.artifactSummary.commits, icon: GitCommit, color: "text-orange-400" },
            { label: "PRs", value: profile.artifactSummary.pullRequests, icon: ChartLine, color: "text-violet-400" },
            { label: "Merged", value: profile.artifactSummary.mergedPRs, icon: GitMerge, color: "text-emerald-400" },
          ].map((stat) => (
            <Card key={stat.label} className="p-4 rounded-[14px]">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`w-5 h-5 ${stat.color}`} weight="fill" />
              </div>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Skills Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ChartLine className="w-4 h-4 text-blue-400" weight="fill" />
              <h2 className="text-sm font-medium text-blue-400">Skill Percentiles</h2>
            </div>
          </div>
          <p className="text-[10px] text-gray-500 mb-4">Ranked against other developers based on verified work artifacts</p>

          <div className="grid grid-cols-2 gap-4">
            {profile.skills.map((skill, index) => {
              const colors = getSkillColor(index);
              const percentile = 100 - skill.percentile;
              const accentColor = colors.bar.includes('blue') ? '#3b82f6' : colors.bar.includes('emerald') ? '#10b981' : colors.bar.includes('violet') ? '#8b5cf6' : '#f59e0b';

              // Generate bell curve points
              const generateBellCurve = () => {
                const points = [];
                const width = 200;
                const height = 80;
                const numPoints = 50;

                for (let i = 0; i <= numPoints; i++) {
                  const x = (i / numPoints) * width;
                  const normalized = (i - numPoints / 2) / (numPoints / 6);
                  const y = height - (height * 0.85 * Math.exp(-0.5 * normalized * normalized));
                  points.push({ x, y });
                }
                return points;
              };

              const bellCurvePoints = generateBellCurve();
              const pathData = `M ${bellCurvePoints.map(p => `${p.x},${p.y}`).join(' ')} L 200,80 L 0,80 Z`;
              const lineData = `M ${bellCurvePoints.map(p => `${p.x},${p.y}`).join(' ')}`;
              const markerIndex = Math.floor((percentile / 100) * (bellCurvePoints.length - 1));
              const markerPoint = bellCurvePoints[markerIndex];

              return (
                <Card key={skill.skill} className="p-4 rounded-[14px]">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-xs font-medium ${colors.text}`}>{skill.skill}</span>
                    <PercentileBadge percentile={skill.percentile} score={skill.score} />
                  </div>

                  {/* Bell Curve Chart */}
                  <div className="bg-[rgba(0,0,0,0.3)] rounded-lg p-2 mb-3">
                    <svg viewBox="0 0 200 90" className="w-full h-auto">
                      <defs>
                        <linearGradient id={`bellGrad-pub-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
                          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Grid lines */}
                      <line x1="50" y1="10" x2="50" y2="80" stroke="#222" strokeWidth="0.5" opacity="0.4" />
                      <line x1="100" y1="10" x2="100" y2="80" stroke="#222" strokeWidth="0.5" opacity="0.4" />
                      <line x1="150" y1="10" x2="150" y2="80" stroke="#222" strokeWidth="0.5" opacity="0.4" />

                      {/* Bell curve area */}
                      <path d={pathData} fill={`url(#bellGrad-pub-${index})`} opacity="0.6" />

                      {/* Bell curve line */}
                      <path d={lineData} fill="none" stroke={accentColor} strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" opacity="0.8" />

                      {/* Marker dot on curve */}
                      <circle cx={markerPoint.x} cy={markerPoint.y} r="4" fill={accentColor} stroke="#0b0c0f" strokeWidth="1.5" />

                      {/* X-axis */}
                      <line x1="0" y1="80" x2="200" y2="80" stroke="#333" strokeWidth="0.5" />

                      {/* X-axis labels */}
                      <text x="50" y="88" textAnchor="middle" fill="#555" fontSize="8">0</text>
                      <text x="100" y="88" textAnchor="middle" fill="#555" fontSize="8">50</text>
                      <text x="150" y="88" textAnchor="middle" fill="#555" fontSize="8">100</text>
                    </svg>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Beats {percentile}% of devs</span>
                    <span className="text-gray-600">{skill.confidence}% conf.</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Badges Section */}
        {(skillBadges.length > 0 || achievements.length > 0) && (
          <div className="mb-6">
            <BadgeGrid skillBadges={skillBadges} achievements={achievements} />
          </div>
        )}

        {/* On-Chain Verification */}
        <Card className="p-5 rounded-[16px]">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-4 h-4 text-violet-400" weight="fill" />
            <h2 className="text-sm font-medium text-violet-400">On-Chain Verification</h2>
          </div>

          {proofs.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheck className="w-10 h-10 text-gray-600 mx-auto mb-3" weight="regular" />
              <p className="text-sm text-gray-400 mb-1">No on-chain proofs yet</p>
              <p className="text-xs text-gray-500">This profile hasn't published any blockchain proofs</p>
            </div>
          ) : (
            <div className="space-y-2">
              {proofs.map((proof, index) => (
                <div key={index} className="p-3 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
                  <p className="text-xs text-gray-400">Proof #{index + 1}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            Powered by <span className="text-blue-400">PoWR</span> - Proof of Work Reputation
          </p>
        </div>
      </div>
    </div>
  );
}
