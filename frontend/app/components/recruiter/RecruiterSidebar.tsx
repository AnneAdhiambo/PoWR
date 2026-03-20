"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MagnifyingGlass, Users, Briefcase, Wrench, Bookmark,
  ChatCircle, ChartBar, Gear, SignOut, Buildings, CaretUp,
  CreditCard, Lightning, ArrowRight
} from "phosphor-react";
import toast from "react-hot-toast";

export const RecruiterSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [plan, setPlan] = useState("free");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setEmail(localStorage.getItem("recruiter_email") || "");
    setCompany(localStorage.getItem("recruiter_company") || "");
    setPlan(localStorage.getItem("recruiter_plan") || "free");
  }, []);

  const handleLogout = () => {
    ["recruiter_token","recruiter_email","recruiter_company","recruiter_plan"].forEach(k => localStorage.removeItem(k));
    toast.success("Logged out");
    router.push("/recruiter/auth");
  };

  const navItems = [
    { icon: MagnifyingGlass, label: "Talent Search", href: "/recruiter/search" },
    { icon: Users, label: "Candidates", href: "/recruiter/candidates" },
    { icon: Briefcase, label: "Jobs", href: "/recruiter/jobs" },
    { icon: Wrench, label: "Gigs", href: "/recruiter/gigs" },
    { icon: Bookmark, label: "Saved", href: "/recruiter/saved" },
    { icon: ChatCircle, label: "Messages", href: "/recruiter/chat" },
    { icon: ChartBar, label: "Analytics", href: "/recruiter/analytics" },
    { icon: CreditCard, label: "Billing", href: "/recruiter/billing" },
    { icon: Gear, label: "Account", href: "/recruiter/account" },
  ];

  return (
    <div className="w-60 h-screen bg-[#0b0c0f] border-r border-[rgba(255,255,255,0.04)] flex flex-col fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <Link href="/recruiter/search" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="PoWR" className="h-9 w-auto" />
          <span className="text-lg font-semibold text-white tracking-tight">PoWR</span>
          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[rgba(255,85,0,0.15)] text-[#FF5500] border border-[#FF5500]/30">Recruiter</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-0.5 min-h-0">
        {navItems.map(({ icon: Icon, label, href }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                active
                  ? "bg-[#12141a] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
              }`}>
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#FF5500] rounded-full" />
              )}
              <Icon className={`w-4.5 h-4.5 ${active ? "text-[#FF5500]" : ""}`} weight={active ? "fill" : "regular"} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Upgrade nudge — free plan only */}
      {plan === "free" && (
        <div className="mx-4 mb-3 flex-shrink-0">
          <Link
            href="/recruiter/billing"
            className="flex items-center gap-2.5 p-3 rounded-xl bg-gradient-to-r from-[rgba(255,85,0,0.12)] to-[rgba(255,85,0,0.06)] border border-[#FF5500]/25 hover:border-[#FF5500]/50 transition-all group"
          >
            <div className="w-7 h-7 rounded-lg bg-[#FF5500]/20 flex items-center justify-center flex-shrink-0">
              <Lightning className="w-3.5 h-3.5 text-[#FF5500]" weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white leading-tight">Upgrade to Pro</p>
              <p className="text-[10px] text-gray-500 leading-tight mt-0.5">Unlimited views & outreach</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[#FF5500] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" weight="bold" />
          </Link>
        </div>
      )}

      {/* Bottom: user */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.04)] flex-shrink-0">
        <div className="relative">
          {showMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#12141a] border border-[rgba(255,255,255,0.08)] rounded-lg shadow-xl overflow-hidden z-50">
              <Link href="/recruiter/billing"
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <CreditCard className="w-4 h-4" weight="regular" />
                Billing & Plans
              </Link>
              <Link href="/recruiter/account"
                onClick={() => setShowMenu(false)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <Gear className="w-4 h-4" weight="regular" />
                Account Settings
              </Link>
              <div className="border-t border-[rgba(255,255,255,0.06)]" />
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <SignOut className="w-4 h-4" weight="regular" />
                Sign Out
              </button>
            </div>
          )}
          <button onClick={() => setShowMenu(v => !v)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors">
            <div className="w-10 h-10 rounded-full bg-[rgba(255,85,0,0.15)] border border-[#FF5500]/30 flex items-center justify-center flex-shrink-0">
              <Buildings className="w-5 h-5 text-[#FF5500]" weight="fill" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-white truncate">{company || "My Company"}</p>
              <p className="text-xs text-gray-500 truncate capitalize">{plan} plan</p>
            </div>
            <CaretUp className={`w-4 h-4 text-gray-500 transition-transform ${showMenu ? "" : "rotate-180"}`} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
