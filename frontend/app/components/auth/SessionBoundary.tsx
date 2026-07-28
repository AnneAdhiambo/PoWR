"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { recruiterApiClient, clearRecruiterSession } from "../../lib/recruiterApi";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const DEVELOPER_ROUTES = ["/dashboard", "/proofs", "/saved", "/chat", "/notifications", "/profile", "/subscription"];

function SessionLoading() {
  return (
    <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center" role="status" aria-label="Checking session">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-[#FF5500]" />
    </div>
  );
}

export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const recruiterRoute = pathname.startsWith("/recruiter") && pathname !== "/recruiter/auth";
  const developerRoute = DEVELOPER_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const protectedRoute = recruiterRoute || developerRoute;
  const [verifiedPath, setVerifiedPath] = useState<string | null>(null);

  useEffect(() => {
    if (!protectedRoute) {
      setVerifiedPath(pathname);
      return;
    }

    let active = true;
    setVerifiedPath(null);

    const redirectToLogin = (audience: "recruiter" | "developer") => {
      if (!active) return;
      const destination = audience === "recruiter" ? "/recruiter/auth" : "/auth";
      router.replace(`${destination}?returnTo=${encodeURIComponent(pathname)}`);
    };

    const validate = async () => {
      try {
        if (recruiterRoute) {
          await recruiterApiClient.getMe();
        } else {
          const response = await fetch(`${API_BASE_URL}/api/auth/validate`, { credentials: "include", cache: "no-store" });
          if (!response.ok) throw new Error("Developer session invalid");
        }
        if (active) setVerifiedPath(pathname);
      } catch {
        if (recruiterRoute) clearRecruiterSession();
        else {
          localStorage.removeItem("github_username");
          localStorage.removeItem("github_email");
          localStorage.removeItem("github_avatar");
        }
        redirectToLogin(recruiterRoute ? "recruiter" : "developer");
      }
    };

    void validate();
    return () => {
      active = false;
    };
  }, [developerRoute, pathname, protectedRoute, recruiterRoute, router]);

  useEffect(() => {
    const handleRecruiterLogout = () => {
      if (pathname.startsWith("/recruiter") && pathname !== "/recruiter/auth") {
        router.replace("/recruiter/auth");
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "powr_session_event" && event.newValue?.startsWith("recruiter-logout")) {
        handleRecruiterLogout();
      }
    };
    window.addEventListener("powr:recruiter-logout", handleRecruiterLogout);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("powr:recruiter-logout", handleRecruiterLogout);
      window.removeEventListener("storage", handleStorage);
    };
  }, [pathname, router]);

  if (protectedRoute && verifiedPath !== pathname) return <SessionLoading />;
  return <>{children}</>;
}
