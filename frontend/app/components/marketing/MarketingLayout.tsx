"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { List, X } from "phosphor-react";

const navigation = [
  ["Product", "/product"],
  ["How it works", "/#how-it-works"],
  ["Why PoWR", "/#why-powr"],
  ["Pricing", "/pricing"],
  ["Jobs", "/jobs"],
];

export function MarketingLayout({ children, theme = "dark" }: { children: React.ReactNode; theme?: "dark" | "light" }) {
  const light = theme === "light";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 12);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  return (
    <div className={light ? "min-h-screen bg-[#f5f1e8] text-[#111820]" : "min-h-screen bg-[#090b0f] text-white"}>
      <header className={`sticky top-0 z-50 transition-[background-color,backdrop-filter] duration-300 ${light ? (scrolled ? "bg-[#f5f1e8]/92 backdrop-blur-[14px]" : "bg-[#f5f1e8]") : (scrolled ? "bg-[#090b0f]/88 backdrop-blur-[14px]" : "bg-[#090b0f]")}`}>
        <div className="mx-auto flex h-20 max-w-[1240px] items-center justify-between px-4 sm:px-6">
          <Link href="/" aria-label="PoWR home" className="inline-flex items-center"><img src="/logo.png" alt="PoWR" className="h-12 w-12 object-contain" /></Link>
          <nav aria-label="Main navigation" className={`hidden items-center gap-8 text-base font-semibold lg:flex ${light ? "text-[#35404b]" : "text-[#c4c9d1]"}`}>
            {navigation.map(([label, href]) => (
              <Link key={label} href={href} className="group relative py-2 hover:text-white">
                {label}
                <span className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[#ff6a1a] transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className={`hidden min-h-11 items-center px-2 text-base font-semibold sm:inline-flex ${light ? "text-[#35404b] hover:text-[#111820]" : "text-[#c4c9d1] hover:text-white"}`}>Log in</Link>
            <Link href="/request-demo" className="hidden min-h-11 items-center rounded-[var(--radius-control)] bg-[#ff6a1a] px-5 text-[15px] font-bold text-white hover:bg-[#f05b0e] active:bg-[#d94d08] sm:inline-flex">Request a demo</Link>
            <button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} aria-controls="mobile-marketing-navigation" onClick={() => setMobileOpen((open) => !open)} className={`rounded-[var(--radius-control)] border p-2.5 lg:hidden ${light ? "border-black/10 text-[#35404b] hover:bg-black/[0.04]" : "border-white/15 text-gray-200 hover:bg-white/[0.06]"}`}>
              {mobileOpen ? <X size={20} /> : <List size={20} />}
            </button>
          </div>
        </div>
        <nav id="mobile-marketing-navigation" aria-label="Mobile navigation" className={`${mobileOpen ? "block" : "hidden"} border-t px-4 py-4 lg:hidden ${light ? "border-black/[0.08] bg-[#f5f1e8]" : "border-white/[0.07] bg-[#090b0f]"}`}>
          <div className="mx-auto flex max-w-[1200px] flex-col gap-1">
            {navigation.map(([label, href]) => <Link key={label} href={href} onClick={() => setMobileOpen(false)} className={`rounded-[var(--radius-control)] px-3 py-3 text-sm ${light ? "text-[#35404b] hover:bg-black/[0.04]" : "text-gray-200 hover:bg-white/[0.06]"}`}>{label}</Link>)}
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/[0.07] pt-4">
              <Link href="/login" onClick={() => setMobileOpen(false)} className={`rounded-[var(--radius-control)] border px-4 py-3 text-center text-sm font-semibold ${light ? "border-black/15 text-[#111820]" : "border-white/15 text-white"}`}>Log in</Link>
              <Link href="/request-demo" onClick={() => setMobileOpen(false)} className="rounded-[var(--radius-control)] bg-[#ff6a1a] px-4 py-3 text-center text-sm font-semibold text-white">Request demo</Link>
            </div>
          </div>
        </nav>
      </header>
      {children}
      <footer className={`border-t px-5 py-14 sm:px-8 ${light ? "border-black/[0.08] bg-[#eee9df]" : "border-white/[0.07] bg-[#0c0e12]"}`}>
        <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-10">
          <div className="col-span-2 md:col-span-1"><Link href="/" aria-label="PoWR home" className="inline-flex"><img src="/logo.png" alt="PoWR" className="h-14 w-14 object-contain" /></Link><p className={`mt-4 max-w-sm text-sm leading-6 ${light ? "text-[#69727d]" : "text-gray-500"}`}>The trust layer for technical work and hiring. Real evidence, clearer contribution, better decisions.</p></div>
          <FooterColumn title="Product" links={[["Recruiting", "/product"], ["PoWR Score", "/powr-score"], ["Pricing", "/pricing"], ["Security", "/security"]]} />
          <FooterColumn title="For people" links={[["Developers", "/developers"], ["Find jobs", "/jobs"], ["Recruiter login", "/recruiter/auth"], ["Developer login", "/auth"]]} />
          <FooterColumn title="Company" className="col-span-2 md:col-span-1" twoColumnLinks links={[["Request a demo", "/request-demo"], ["Privacy", "/security#privacy"], ["Accessibility", "/security#accessibility"], ["GitHub", "https://github.com/AnneAdhiambo/PoWR"]]} />
        </div>
        <div className="mx-auto mt-12 flex max-w-[1200px] flex-col gap-2 border-t border-white/[0.07] pt-6 text-xs text-gray-600 sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} PoWR. Built around proof of work.</p><p>Scores support human decisions; they do not replace them.</p></div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links, className = "", twoColumnLinks = false }: { title: string; links: string[][]; className?: string; twoColumnLinks?: boolean }) {
  return <div className={className}><h2 className="text-sm font-semibold text-white">{title}</h2><div className={`mt-4 ${twoColumnLinks ? "grid grid-cols-2 gap-x-5 gap-y-3 md:block md:space-y-3" : "space-y-3"}`}>{links.map(([label, href]) => <Link key={label} href={href} className="block text-sm text-gray-500 hover:text-gray-200">{label}</Link>)}</div></div>;
}
