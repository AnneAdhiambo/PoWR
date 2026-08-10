"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Code01Icon,
  GitBranch01Icon,
  Lock01Icon,
  ShieldTickIcon,
} from "@untitledui/icons-react/outline";
import { Button } from "../components/ui";
import { SquircleLoader } from "../components/ui/SquircleLoader";
import { clearDeveloperSession, developerAuthHeaders, getDeveloperSession } from "../lib/developerSession";

const developerBenefits = [
  {
    icon: Code01Icon,
    title: "Make your work visible",
    description: "Turn public repositories and contributions into evidence people can understand.",
  },
  {
    icon: GitBranch01Icon,
    title: "Grow through open source",
    description: "Find contribution opportunities, ship useful work, and earn Street Points.",
  },
  {
    icon: ShieldTickIcon,
    title: "Build a reputation you own",
    description: "Keep a portable technical profile grounded in publicly verifiable work.",
  },
];

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(false);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) setAuthError(decodeURIComponent(error));
  }, [searchParams]);

  useEffect(() => {
    const username = localStorage.getItem("github_username");
    const session = getDeveloperSession();
    if (!username || !session) return;

    let active = true;
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    setCheckingSession(true);

    fetch(`${apiBaseUrl}/api/auth/validate`, {
      credentials: "include",
      cache: "no-store",
      headers: developerAuthHeaders(),
    })
      .then(async (response) => ({ ok: response.ok, data: await response.json().catch(() => null) }))
      .then(({ ok, data }) => {
        if (!active) return;
        if (ok && data?.valid === true) {
          const returnTo = searchParams.get("returnTo");
          router.replace(returnTo || "/dashboard");
          return;
        }
        localStorage.removeItem("github_username");
        localStorage.removeItem("github_email");
        localStorage.removeItem("github_avatar_url");
        clearDeveloperSession();
        setCheckingSession(false);
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem("github_username");
        localStorage.removeItem("github_email");
        localStorage.removeItem("github_avatar_url");
        clearDeveloperSession();
        setCheckingSession(false);
      });

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  const handleGitHubLogin = () => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const returnTo = searchParams.get("returnTo") || "/dashboard";
    window.location.href = `${apiBaseUrl}/api/auth/github?returnTo=${encodeURIComponent(returnTo)}`;
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090A0C]" role="status" aria-label="Checking session">
        <SquircleLoader size={44} label="Checking session" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#090A0C] px-5 py-5 text-white sm:px-8 sm:py-8 lg:flex lg:items-center lg:py-12">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex items-center justify-between">
          <Link href="/" aria-label="PoWR home" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
            <Image src="/logo.png" alt="PoWR" width={44} height={44} className="size-11 object-contain" priority />
            <span className="text-lg font-semibold tracking-[-0.03em]">PoWR</span>
          </Link>
          <Link href="/" className="group inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white">
            <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Back to home
          </Link>
        </header>

        <div className="grid gap-10 pb-8 pt-14 lg:grid-cols-[1.05fr_0.8fr] lg:items-center lg:gap-24 lg:pb-12 lg:pt-20">
          <section>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Developer workspace</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              Let your work speak <span className="text-orange-500">before you do.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg sm:leading-8">
              Connect GitHub to build a living technical profile, discover meaningful open-source work, and show what you can do with evidence.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3 lg:max-w-3xl">
              {developerBenefits.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-2xl bg-[#111216] p-5 transition-colors duration-200 hover:bg-[#15161A]">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500">
                    <Icon className="size-5" />
                  </span>
                  <h2 className="mt-5 text-sm font-semibold text-white">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-[#111216] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:p-9 lg:p-10" aria-labelledby="sign-in-heading">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-orange-500 text-black">
              <GitBranch01Icon className="size-6" />
            </span>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">Your developer profile</p>
            <h2 id="sign-in-heading" className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Continue with GitHub</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
              Sign in securely and let PoWR begin turning your public work into a profile you can use anywhere.
            </p>

            {authError && (
              <div className="mt-6 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
                {authError}
              </div>
            )}

            <Button
              onClick={handleGitHubLogin}
              className="group mt-8 flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-xl text-base font-semibold"
              size="lg"
            >
              Connect GitHub
              <ArrowRightIcon className="size-5 transition-transform group-hover:translate-x-0.5" />
            </Button>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-black/20 px-4 py-3.5">
              <Lock01Icon className="mt-0.5 size-4 shrink-0 text-orange-500" />
              <p className="text-xs leading-5 text-gray-500">
                Public repositories and read-only access. PoWR cannot edit your code or act on your behalf.
              </p>
            </div>

            <Link href="/recruiter/auth" className="group mt-8 flex items-center justify-between rounded-2xl bg-[#191A1F] p-4 transition-colors hover:bg-[#202126] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
              <span>
                <span className="block text-xs text-gray-500">Hiring talent?</span>
                <span className="mt-1 block text-sm font-semibold text-white">Open the recruiter workspace</span>
              </span>
              <ArrowRightIcon className="size-5 text-orange-500 transition-transform group-hover:translate-x-1" />
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#090A0C]" />}>
      <AuthContent />
    </Suspense>
  );
}
