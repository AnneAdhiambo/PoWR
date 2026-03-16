"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SquaresFour,
  Briefcase,
  FileText,
  ChatCircle,
  Bell,
  ArrowSquareOut,
  SignOut,
  Star,
  User,
  CaretUp,
  ShieldCheck,
  Medal,
  Crown,
  Lightning,
} from "phosphor-react";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { apiClient } from "../../lib/api";
import toast from "react-hot-toast";

interface SidebarProps {
  username?: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  username,
  email,
  displayName,
  avatarUrl
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [githubAvatarUrl, setGithubAvatarUrl] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<"free" | "basic" | "pro">("free");
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Get avatar from localStorage or fetch from GitHub
    const storedAvatar = localStorage.getItem("github_avatar_url");
    if (storedAvatar) {
      setGithubAvatarUrl(storedAvatar);
    } else if (username) {
      // Fetch avatar from GitHub API if we have a token
      const token = localStorage.getItem("github_token");
      if (token) {
        fetch("https://api.github.com/user", {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.avatar_url) {
              setGithubAvatarUrl(data.avatar_url);
              localStorage.setItem("github_avatar_url", data.avatar_url);
            }
          })
          .catch((error) => {
            console.error("Failed to fetch GitHub avatar:", error);
          });
      } else {
        // Fallback: try public API without token
        fetch(`https://api.github.com/users/${username}`, {
          headers: {
            Accept: "application/vnd.github.v3+json",
          },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.avatar_url) {
              setGithubAvatarUrl(data.avatar_url);
              localStorage.setItem("github_avatar_url", data.avatar_url);
            }
          })
          .catch((error) => {
            console.error("Failed to fetch GitHub avatar:", error);
          });
      }
    }
  }, [username]);

  useEffect(() => {
    if (!username) return;
    apiClient.getCurrentSubscription(username)
      .then((data) => {
        const plan = data.subscription?.planType;
        if (plan === "basic" || plan === "pro") setCurrentPlan(plan);
      })
      .catch(() => {});
  }, [username]);

  const handleLogout = () => {
    // Clear all auth data
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_username");
    localStorage.removeItem("github_token_timestamp");
    localStorage.removeItem("github_avatar_url");
    localStorage.removeItem("github_email");

    // Show success toast
    toast.success("Logged out successfully");

    // Redirect to auth page
    router.push("/auth");
  };

  const displayAvatar = avatarUrl || githubAvatarUrl;

  const navItems = [
    { icon: SquaresFour, label: "Dashboard", href: "/dashboard" },
    { icon: ShieldCheck, label: "On-Chain Proofs", href: "/proofs" },
    { icon: Briefcase, label: "Jobs", href: "/jobs" },
    { icon: FileText, label: "Gigs", href: "/gigs" },
    { icon: Star, label: "Saved", href: "/saved" },
    { icon: ChatCircle, label: "Chat", href: "/chat" },
    { icon: Bell, label: "Notification", href: "/notifications" },
    { icon: Medal, label: "Billing", href: "/subscription" },
  ];

  const isActive = (href: string) => {
    return pathname?.startsWith(href);
  };

  return (
    <div className="w-60 h-screen bg-[#0b0c0f] border-r border-[rgba(255,255,255,0.04)] flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="PoWR Logo"
            className="h-9 w-auto"
          />
          <span className="text-lg font-semibold text-white tracking-tight">PoWR</span>
        </Link>
      </div>

      {/* Navigation - Scrollable */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active
                ? "bg-[#12141a] text-white"
                : "text-gray-400 hover:text-white hover:bg-[#12141a]"
                }`}
            >
              <Icon className="w-5 h-5" weight="regular" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section - Fixed at bottom */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.04)] space-y-3 flex-shrink-0">
        {username && (
          <div className="relative" ref={profileMenuRef}>
            {/* Profile Menu Dropdown */}
            {showProfileMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#12141a] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-xl overflow-hidden z-50">
                <Link
                  href="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  <User className="w-4 h-4" weight="regular" />
                  Profile Settings
                </Link>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                >
                  <SignOut className="w-4 h-4" weight="regular" />
                  Log Out
                </button>
              </div>
            )}

            {/* Profile Button */}
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex items-center justify-center flex-shrink-0 overflow-hidden border border-[rgba(255,255,255,0.08)]">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName || username}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('span');
                        fallback.className = 'text-white font-semibold text-sm';
                        fallback.textContent = (displayName || username).charAt(0).toUpperCase();
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <span className="text-white font-semibold text-sm">
                    {(displayName || username).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-white truncate">
                  {displayName || username}
                </p>
                <p className="text-xs text-gray-500 truncate">@{username}</p>
              </div>
              <CaretUp className={`w-4 h-4 text-gray-500 transition-transform ${showProfileMenu ? '' : 'rotate-180'}`} weight="bold" />
            </button>
          </div>
        )}
        {currentPlan === "pro" ? (
          /* Pro — current plan badge, no upgrade button */
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-[rgba(255,85,0,0.08)] border border-[rgba(255,85,0,0.2)]">
            <Crown className="w-4 h-4 text-[#FF5500] flex-shrink-0" weight="fill" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#FF5500]">Pro Plan</p>
              <p className="text-[10px] text-gray-500 leading-tight">Real-time updates</p>
            </div>
          </div>
        ) : currentPlan === "basic" ? (
          /* Basic — badge + small upgrade nudge */
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[rgba(255,85,0,0.06)] border border-[rgba(255,85,0,0.15)]">
              <Medal className="w-4 h-4 text-[#FF5500] flex-shrink-0" weight="fill" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#FF5500]">Basic Plan</p>
                <p className="text-[10px] text-gray-500 leading-tight">Weekly updates</p>
              </div>
            </div>
            <button
              onClick={() => router.push("/subscription")}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-[#FF5500] hover:bg-[rgba(255,85,0,0.08)] transition-colors border border-[rgba(255,85,0,0.15)]"
            >
              <Crown className="w-3 h-3" weight="fill" />
              Upgrade to Pro
            </button>
          </div>
        ) : (
          /* Free — prominent upgrade button */
          <button
            onClick={() => router.push("/subscription")}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white text-sm font-medium transition-colors"
          >
            <Lightning className="w-4 h-4" weight="fill" />
            Upgrade to Pro
          </button>
        )}
      </div>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out? You'll need to sign in again to access your dashboard."
        confirmText="Log Out"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};



