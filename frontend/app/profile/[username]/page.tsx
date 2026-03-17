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
  GitBranch
} from "phosphor-react";
import { apiClient, PoWProfile, Artifact, Proof } from "../../lib/api";

const PercentileBadge = ({ percentile, score }: { percentile: number; score: number }) => {
  const topPercent = 100 - percentile;
  const isTop = topPercent <= 25;
  const isMid = topPercent > 25 && topPercent <= 50;
  
  return (
    <span 
      className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
        isTop 
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

  useEffect(() => {
    loadProfile();
    // Fetch GitHub avatar
    fetch(`https://api.github.com/users/${username}`)
      .then(res => res.json())
      .then(data => {
        if (data.avatar_url) setAvatarUrl(data.avatar_url);
      })
      .catch(() => {});
  }, [username]);

  const loadProfile = async () => {
    try {
      setLoading(true);
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
    } catch (error) {
      console.error("Failed to load profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSkillColor = (index: number) => {
    const colors = [
      { bar: "bg-[#FF5500]", text: "text-[#FF6B2B]" },
      { bar: "bg-emerald-500", text: "text-emerald-400" },
      { bar: "bg-violet-500", text: "text-violet-400" },
      { bar: "bg-amber-500", text: "text-amber-400" },
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF5500]/20 text-[#FF6B2B] text-sm hover:bg-[#FF5500]/30 transition-colors"
          >
            <House className="w-4 h-4" weight="regular" />
            Go to Dashboard
          </Link>
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
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.06)] text-gray-300 text-sm transition-colors border border-[rgba(255,255,255,0.04)]"
            >
              <House className="w-4 h-4" weight="regular" />
              Dashboard
            </Link>
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
              <p className="text-sm text-gray-400 mb-3">Public Proof-of-Work Profile</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" weight="fill" />
                  Verified Developer
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 mb-1">PoW Index</p>
              <p className="text-4xl font-bold text-white">{profile.overallIndex}</p>
            </div>
          </div>
        </Card>

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
              <ChartLine className="w-4 h-4 text-[#FF6B2B]" weight="fill" />
              <h2 className="text-sm font-medium text-[#FF6B2B]">Skill Percentiles</h2>
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
                        <linearGradient id={`bellGrad-${index}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
                          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines */}
                      <line x1="50" y1="10" x2="50" y2="80" stroke="#222" strokeWidth="0.5" opacity="0.4" />
                      <line x1="100" y1="10" x2="100" y2="80" stroke="#222" strokeWidth="0.5" opacity="0.4" />
                      <line x1="150" y1="10" x2="150" y2="80" stroke="#222" strokeWidth="0.5" opacity="0.4" />
                      
                      {/* Bell curve area */}
                      <path d={pathData} fill={`url(#bellGrad-${index})`} opacity="0.6" />
                      
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
            Powered by <span className="text-[#FF6B2B]">PoWR</span> - Proof of Work Reputation
          </p>
        </div>
      </div>
    </div>
  );
}

