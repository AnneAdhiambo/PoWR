"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Github } from "lucide-react";
import { Button } from "../components/ui";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) setAuthError(decodeURIComponent(error));
  }, [searchParams]);

  useEffect(() => {
    const token = localStorage.getItem("github_token");
    const username = localStorage.getItem("github_username");
    if (token && username) {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      fetch(`${apiBaseUrl}/api/auth/validate?token=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => { if (data.valid) router.push("/dashboard"); })
        .catch(() => {
          localStorage.removeItem("github_token");
          localStorage.removeItem("github_username");
          localStorage.removeItem("github_token_timestamp");
        });
    }
  }, [router]);

  const handleGitHubLogin = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    window.location.href = `${apiBaseUrl}/api/auth/github`;
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-16">
        {/* Orbs */}
        <div className="absolute top-[-15%] left-[-15%] w-[70%] h-[70%] rounded-full bg-[#FF5500]/20 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#B19EEF]/15 blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Logo — top left */}
        <div className="absolute top-10 left-10 z-10">
          <span className="text-xl font-bold tracking-tight text-white">
            Po<span className="text-[#FF5500]">WR</span>
          </span>
        </div>

        {/* Centered copy */}
        <div className="relative z-10 max-w-sm">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF5500] mb-6">
            Proof of Work Reputation
          </p>
          <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tight mb-8">
            Your code<br />
            has a story.<br />
            <span className="text-[#FF5500]">Prove it.</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Connect GitHub. Get a verifiable,<br />
            on-chain reputation score backed<br />
            by your real work.
          </p>

          {/* Three clean stats */}
          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/8 pt-8">
            {[
              { value: "4", label: "Skill dims" },
              { value: "NFT", label: "Badges" },
              { value: "STX", label: "Anchored" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <span className="text-3xl font-bold text-white">
              Po<span className="text-[#FF5500]">WR</span>
            </span>
          </div>

          <p className="text-xs font-mono uppercase tracking-[0.15em] text-gray-600 mb-3">
            Developer portal
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            Sign in
          </h1>
          <p className="text-gray-500 text-base mb-10">
            Connect GitHub to build your profile
          </p>

          {authError && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {authError}
            </div>
          )}

          <Button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center gap-3 h-14 text-base font-semibold rounded-xl"
            size="lg"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </Button>

          <p className="text-xs text-gray-600 text-center mt-4">
            Read-only · public repos only · no write access
          </p>

          <div className="mt-12 pt-6 border-t border-white/6 text-center">
            <p className="text-sm text-gray-600">
              Hiring?{" "}
              <a href="/recruiter/auth" className="text-[#FF5500] hover:text-white transition-colors font-medium">
                Recruiter portal →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0B0D]" />}>
      <AuthContent />
    </Suspense>
  );
}
