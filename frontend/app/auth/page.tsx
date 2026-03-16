"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../components/ui";
import { Github } from "lucide-react";

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) setAuthError(decodeURIComponent(error));
  }, [searchParams]);

  useEffect(() => {
    // Check if user is already logged in with valid token
    const token = localStorage.getItem("github_token");
    const username = localStorage.getItem("github_username");
    
    if (token && username) {
      // Validate token
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      fetch(`${apiBaseUrl}/api/auth/validate?token=${encodeURIComponent(token)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.valid) {
            // Token is valid, redirect to dashboard
            router.push("/dashboard");
          }
        })
        .catch(() => {
          // Validation failed, clear invalid token
          localStorage.removeItem("github_token");
          localStorage.removeItem("github_username");
          localStorage.removeItem("github_token_timestamp");
        });
    }
  }, [router]);

  const handleGitHubLogin = () => {
    // Redirect to backend OAuth endpoint
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    window.location.href = `${apiBaseUrl}/api/auth/github`;
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
            PoWR
          </h1>
          <p className="text-gray-400">
            Proof of Work Reputation
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Verifiable, artifact-backed evidence of real work
          </p>
        </div>

        <div className="bg-[#141519] rounded-lg p-8 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">
              Sign in with GitHub
            </h2>
            <p className="text-sm text-gray-400">
              Connect your GitHub account to generate your Proof-of-Work profile
            </p>
          </div>

          {authError && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {authError}
            </div>
          )}

          <Button
            onClick={handleGitHubLogin}
            className="w-full flex items-center justify-center gap-2"
            size="lg"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </Button>

          <p className="text-xs text-gray-500 text-center">
            We only request read access to your public repositories
          </p>
        </div>
      </div>
    </div>
  );
}

import { Suspense } from "react";
export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0B0D]" />}>
      <AuthContent />
    </Suspense>
  );
}

