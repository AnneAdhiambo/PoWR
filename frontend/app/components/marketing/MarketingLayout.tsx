"use client";

import Link from "next/link";
import { useState } from "react";
import { List, X } from "phosphor-react";

const navigation = [
  ["Product", "/product"],
  ["How it works", "/#how-it-works"],
  ["Why PoWR", "/powr-score"],
  ["Pricing", "/pricing"],
  ["Jobs", "/jobs"],
];

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#080a0d] text-white">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#080a0d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-2xl font-bold tracking-tight">Po<span className="text-orange-500">WR</span></Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm text-gray-300 lg:flex">
            {navigation.map(([label, href]) => <Link key={label} href={href} className="hover:text-white">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/recruiter/auth" className="hidden text-sm font-medium text-gray-300 hover:text-white sm:block">Log in</Link>
            <Link href="/request-demo" className="hidden items-center gap-2 rounded-[var(--radius-control)] bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 sm:inline-flex">Request a demo <span aria-hidden="true">→</span></Link>
            <button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-marketing-navigation" onClick={() => setMobileOpen((open) => !open)} className="rounded-[var(--radius-control)] border border-white/15 p-2.5 text-gray-200 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-orange-500 lg:hidden">
              {mobileOpen ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </div>
        <nav id="mobile-marketing-navigation" aria-label="Mobile navigation" className={`${mobileOpen ? "block" : "hidden"} border-t border-white/[0.07] px-5 py-4 lg:hidden`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navigation.map(([label, href]) => <Link key={label} href={href} onClick={() => setMobileOpen(false)} className="rounded-[var(--radius-control)] px-3 py-3 text-sm text-gray-200 hover:bg-white/[0.06]">{label}</Link>)}
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
              <Link href="/recruiter/auth" onClick={() => setMobileOpen(false)} className="rounded-[var(--radius-control)] border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white">Log in</Link>
              <Link href="/request-demo" onClick={() => setMobileOpen(false)} className="rounded-[var(--radius-control)] bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white">Request demo</Link>
            </div>
          </div>
        </nav>
      </header>
      {children}
      <footer className="border-t border-white/[0.07] bg-[#0c0e12] px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div><Link href="/" className="text-2xl font-bold">Po<span className="text-orange-500">WR</span></Link><p className="mt-4 max-w-sm text-sm leading-6 text-gray-500">The trust layer for technical work and hiring. Real evidence, clearer contribution, better decisions.</p></div>
          <FooterColumn title="Product" links={[["Recruiting", "/product"], ["PoWR Score", "/powr-score"], ["Pricing", "/pricing"], ["Security", "/security"]]} />
          <FooterColumn title="For people" links={[["Developers", "/developers"], ["Find jobs", "/jobs"], ["Recruiter login", "/recruiter/auth"], ["Developer login", "/auth"]]} />
          <FooterColumn title="Company" links={[["Request a demo", "/request-demo"], ["Privacy", "/security#privacy"], ["Accessibility", "/security#accessibility"], ["GitHub", "https://github.com/AnneAdhiambo/PoWR"]]} />
        </div>
        <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-2 border-t border-white/[0.07] pt-6 text-xs text-gray-600 sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} PoWR. Built around proof of work.</p><p>Scores support human decisions; they do not replace them.</p></div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) {
  return <div><h2 className="text-sm font-semibold text-white">{title}</h2><div className="mt-4 space-y-3">{links.map(([label, href]) => <Link key={label} href={href} className="block text-sm text-gray-500 hover:text-gray-200">{label}</Link>)}</div></div>;
}
