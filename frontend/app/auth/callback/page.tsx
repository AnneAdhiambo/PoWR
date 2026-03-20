"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Card } from "../../components/ui";
import { CheckCircle2, Loader2, Github } from "lucide-react";
import { apiClient } from "../../lib/api";
import { getOrCreateKeypair } from "../../lib/nostr";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string>("");
  const [step, setStep] = useState<"processing" | "storing" | "redirecting">("processing");

  useEffect(() => {
    const token = searchParams.get("token");
    const username = searchParams.get("username");

    if (!token || !username) {
      setStatus("error");
      setError("Missing authentication token or username");
      return;
    }

    // Simulate processing steps for smoother UX
    const processAuth = async () => {
      // Step 1: Processing
      setStep("processing");
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Fetch GitHub user info to get avatar
      setStep("storing");
      try {
        const userResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          if (userData.avatar_url) {
            localStorage.setItem("github_avatar_url", userData.avatar_url);
          }
        }
      } catch (error) {
        console.error("Failed to fetch GitHub avatar:", error);
      }

      localStorage.setItem("github_token", token);
      localStorage.setItem("github_username", username);
      localStorage.setItem("github_token_timestamp", Date.now().toString());

      // Derive Nostr keypair and register pubkey
      try {
        const { pk } = await getOrCreateKeypair(username);
        await apiClient.registerNostrPubkey(username, pk);
      } catch {
        // Non-critical — continue even if this fails
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: Success and redirect
      setStatus("success");
      setStep("redirecting");
      await new Promise(resolve => setTimeout(resolve, 800));

      router.push("/dashboard");
    };

    processAuth();
  }, [searchParams, router]);

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="max-w-md w-full text-center p-8">
            <div className="text-red-400 mb-4 text-lg font-semibold">Authentication Error</div>
            <p className="text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => router.push("/auth")}
              className="px-6 py-3 bg-[#FF5500] text-white rounded-full hover:bg-[#e04d00] transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </Card>
        </motion.div>
      </div>
    );
  }

  const stepMessages = {
    processing: "Verifying authentication...",
    storing: "Saving your session...",
    redirecting: "Redirecting to dashboard...",
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Card className="w-full text-center p-8">
          <div className="flex flex-col items-center gap-6">
            {status === "success" ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 200 }}
              >
                <CheckCircle2 className="w-16 h-16 text-[#FF5500]" />
              </motion.div>
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Github className="w-16 h-16 text-[#FF5500]" />
              </motion.div>
            )}

            <div className="space-y-2">
              <motion.h2
                key={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-2xl font-bold text-white tracking-tight"
              >
                {status === "success" ? "Authentication Successful!" : "Authenticating..."}
              </motion.h2>
              <motion.p
                key={step}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="text-gray-400"
              >
                {stepMessages[step]}
              </motion.p>
            </div>

            {status === "loading" && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 text-[#FF5500] animate-spin" />
                <div className="flex gap-1">
                  <motion.div
                    className="w-2 h-2 bg-[#FF5500] rounded-full"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-[#FF5500] rounded-full"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-[#FF5500] rounded-full"
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0B0D] flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Loader2 className="w-16 h-16 text-[#FF5500] animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">Loading...</p>
        </Card>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}

