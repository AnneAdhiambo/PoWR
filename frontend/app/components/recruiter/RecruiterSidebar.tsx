"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Bookmark, Briefcase, Buildings, CaretUp, ChartBar, ChatCircle, CreditCard,
  Gear, List, MagnifyingGlass, ShareNetwork, SignOut, SquaresFour, UserCircle, Users, Wrench, X,
} from "phosphor-react";
import toast from "react-hot-toast";
import { recruiterApiClient } from "../../lib/recruiterApi";
import { useRecruiterContext } from "./RecruiterContext";

const navGroups = [
  { label: "Workspace", items: [
    { icon: SquaresFour, label: "Overview", href: "/recruiter" },
    { icon: Briefcase, label: "Jobs", href: "/recruiter/jobs" },
    { icon: Buildings, label: "Applications", href: "/recruiter/applications" },
    { icon: ChartBar, label: "Analytics", href: "/recruiter/analytics" },
  ]},
  { label: "Talent", items: [
    { icon: MagnifyingGlass, label: "Talent Search", href: "/recruiter/search" },
    { icon: Bookmark, label: "Talent Lists", href: "/recruiter/saved" },
    ...(process.env.NEXT_PUBLIC_REFERRAL_REPUTATION_ENABLED === "true"
      ? [{ icon: ShareNetwork, label: "Referrals", href: "/recruiter/referrals" }]
      : []),
    { icon: ChatCircle, label: "Messages", href: "/recruiter/chat" },
  ]},
  { label: "People", items: [
    { icon: UserCircle, label: "Employees", href: "/recruiter/employees" },
    { icon: Wrench, label: "Gigs", href: "/recruiter/gigs" },
  ]},
  { label: "Organization", items: [
    { icon: Users, label: "Team", href: "/recruiter/team" },
    { icon: Gear, label: "Careers & account", href: "/recruiter/account" },
    { icon: CreditCard, label: "Billing", href: "/recruiter/billing" },
  ]},
];

export function RecruiterSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { recruiter, organization, role } = useRecruiterContext();
  const [showMenu, setShowMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await recruiterApiClient.logout();
    toast.success("Logged out");
    router.replace("/recruiter/auth");
  }

  const navigation = (
    <nav aria-label="Recruiter workspace" className="min-h-0 flex-1 overflow-y-auto p-4">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-5">
          <p className="mb-1.5 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-600">{group.label}</p>
          <div className="space-y-0.5">
            {group.items.map(({ icon: Icon, label, href }) => {
              const active = href === "/recruiter" ? pathname === href : pathname?.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${active ? "bg-[#15171d] text-white" : "text-gray-400 hover:bg-white/[0.04] hover:text-white"}`}
                >
                  {active && <span className="absolute left-0 h-5 w-0.5 rounded-full bg-[#FF5500]" />}
                  <Icon className={`h-[18px] w-[18px] ${active ? "text-[#FF5500]" : ""}`} weight={active ? "fill" : "regular"} />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/[0.06] bg-[#0b0c0f]/95 px-4 backdrop-blur md:hidden">
        <Link href="/recruiter" className="flex items-center gap-2"><Image src="/logo.png" alt="PoWR" width={32} height={32} className="h-8 w-auto" /><span className="font-semibold text-white">PoWR</span></Link>
        <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((open) => !open)} className="rounded-lg p-2 text-gray-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#FF5500]">
          {mobileOpen ? <X size={22} /> : <List size={22} />}
        </button>
      </header>
      {mobileOpen && <button aria-label="Close navigation overlay" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/60 md:hidden" />}
      <aside className={`fixed left-0 top-0 z-40 flex h-screen w-60 flex-col border-r border-white/[0.04] bg-[#0b0c0f] transition-transform md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex-shrink-0 border-b border-white/[0.04] p-6">
          <Link href="/recruiter" className="flex items-center gap-2.5"><Image src="/logo.png" alt="PoWR" width={36} height={36} className="h-9 w-auto" /><span className="text-lg font-semibold text-white">PoWR</span><span className="rounded border border-[#FF5500]/30 bg-[#FF5500]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[#FF5500]">Recruiter</span></Link>
        </div>
        {navigation}
        <div className="flex-shrink-0 border-t border-white/[0.04] p-4">
          <div className="relative">
            {showMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-lg border border-white/[0.08] bg-[#15171d] shadow-xl">
                <Link href="/recruiter/account" onClick={() => setShowMenu(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-white/[0.05] hover:text-white"><Gear size={16} />Organization settings</Link>
                <button onClick={handleLogout} className="flex w-full items-center gap-3 border-t border-white/[0.06] px-4 py-3 text-sm text-red-400 hover:bg-white/[0.05]"><SignOut size={16} />Sign out</button>
              </div>
            )}
            <button onClick={() => setShowMenu((open) => !open)} className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/[0.03]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#FF5500]/30 bg-[#FF5500]/15"><Buildings size={20} className="text-[#FF5500]" weight="fill" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-white">{organization?.displayName || recruiter?.companyName || "Your organization"}</span><span className="block truncate text-xs capitalize text-gray-500">{role?.replace("_", " ") || "Recruiter"}</span></span>
              <CaretUp size={16} className={`text-gray-500 transition-transform ${showMenu ? "" : "rotate-180"}`} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
