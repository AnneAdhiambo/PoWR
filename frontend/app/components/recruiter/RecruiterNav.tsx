"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MagnifyingGlass, Bookmark, User, SignOut, Buildings } from "phosphor-react";
import toast from "react-hot-toast";

export const RecruiterNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [plan, setPlan] = useState("free");

  useEffect(() => {
    setEmail(localStorage.getItem("recruiter_email") || "");
    setCompany(localStorage.getItem("recruiter_company") || "");
    setPlan(localStorage.getItem("recruiter_plan") || "free");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("recruiter_token");
    localStorage.removeItem("recruiter_email");
    localStorage.removeItem("recruiter_company");
    localStorage.removeItem("recruiter_plan");
    toast.success("Logged out");
    router.push("/recruiter/auth");
  };

  const navItems = [
    { href: "/recruiter/search", label: "Search", icon: MagnifyingGlass },
    { href: "/recruiter/saved", label: "Saved", icon: Bookmark },
    { href: "/recruiter/account", label: "Account", icon: User },
  ];

  return (
    <nav className="h-14 bg-[#0b0c0f] border-b border-[rgba(255,255,255,0.06)] flex items-center px-6 gap-6 fixed top-0 left-0 right-0 z-40">
      {/* Logo */}
      <Link href="/recruiter/search" className="flex items-center gap-2 flex-shrink-0">
        <img src="/logo.png" alt="PoWR" className="h-7 w-auto" />
        <span className="text-base font-semibold text-white tracking-tight">PoWR</span>
        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[rgba(59,118,239,0.15)] text-[#3b76ef] border border-[#3b76ef]/30">
          Recruiter
        </span>
      </Link>

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-[rgba(255,255,255,0.06)] text-white"
                  : "text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
              }`}
            >
              <Icon className="w-4 h-4" weight="regular" />
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right: plan badge + user */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {plan !== "free" && (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(59,118,239,0.15)] text-[#3b76ef] border border-[#3b76ef]/30 capitalize">
            {plan}
          </span>
        )}
        {company && (
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Buildings className="w-4 h-4" weight="regular" />
            <span className="hidden md:block truncate max-w-[140px]">{company}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.06)] transition-colors"
        >
          <SignOut className="w-4 h-4" weight="regular" />
          <span className="hidden md:block">Sign out</span>
        </button>
      </div>
    </nav>
  );
};
