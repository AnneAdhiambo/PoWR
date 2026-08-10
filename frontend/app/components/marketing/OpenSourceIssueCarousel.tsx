"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CoinsStacked01Icon,
  GitBranch01Icon,
  Star01Icon,
} from "@untitledui/icons-react/outline";

const projects = [
  {
    catalogName: "facebook/react",
    project: "react/react",
    description: "The library for web and native user interfaces.",
    url: "https://github.com/react/react",
    language: "JavaScript",
    stars: 247124,
    issues: 1249,
    points: "80–220",
  },
  {
    catalogName: "vercel/next.js",
    project: "vercel/next.js",
    description: "The React framework for production web applications.",
    url: "https://github.com/vercel/next.js",
    language: "JavaScript",
    stars: 141687,
    issues: 4403,
    points: "100–260",
  },
  {
    catalogName: "withastro/starlight",
    project: "withastro/starlight",
    description: "Accessible, high-performance documentation websites built with Astro.",
    url: "https://github.com/withastro/starlight",
    language: "TypeScript",
    stars: 9041,
    issues: 23,
    points: "60–180",
  },
  {
    catalogName: "microsoft/TypeScript",
    project: "microsoft/TypeScript",
    description: "A typed superset of JavaScript that compiles to clean JavaScript output.",
    url: "https://github.com/microsoft/TypeScript",
    language: "TypeScript",
    stars: 110120,
    issues: 5081,
    points: "70–240",
  },
] as const;

const formatCount = (value: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export function OpenSourceProjectCarousel() {
  const [position, setPosition] = useState(0);
  const [animateTrack, setAnimateTrack] = useState(true);
  const slides = [...projects, projects[0]];
  const active = position === projects.length ? 0 : position;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setAnimateTrack(true);
      setPosition((current) => current + 1);
    }, 5200);
    return () => window.clearInterval(timer);
  }, []);

  const next = () => {
    setAnimateTrack(true);
    setPosition((current) => current + 1);
  };

  const previous = () => {
    if (position > 0) {
      setAnimateTrack(true);
      setPosition((current) => current - 1);
      return;
    }

    setAnimateTrack(false);
    setPosition(projects.length);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setAnimateTrack(true);
        setPosition(projects.length - 1);
      });
    });
  };

  const choose = (index: number) => {
    setAnimateTrack(true);
    setPosition(index);
  };

  return (
    <article
      className="relative overflow-hidden rounded-3xl bg-[#121317]/95 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.34)] backdrop-blur-sm sm:p-8"
      aria-roledescription="carousel"
      aria-label="Open-source projects"
    >
      <div className="overflow-hidden">
        <div
          className={`flex ${animateTrack ? "transition-transform duration-1000 ease-[cubic-bezier(.22,1,.36,1)]" : ""}`}
          style={{ transform: `translate3d(-${position * 100}%, 0, 0)` }}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget || position !== projects.length) return;
            setAnimateTrack(false);
            setPosition(0);
          }}
        >
        {slides.map((issue, index) => (
          <section
            key={`${issue.url}-${index}`}
            aria-hidden={position !== index}
            className="min-h-[410px] w-full shrink-0 sm:min-h-[350px]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><GitBranch01Icon className="size-5" /></span>
                <div className="min-w-0"><p className="truncate font-semibold text-white">{issue.project}</p><p className="mt-1 truncate text-xs text-gray-500">{issue.language} · Public repository</p></div>
              </div>
              <span className="shrink-0 rounded-md bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400">Curated</span>
            </div>

            <div className="group relative mt-7 rounded-2xl bg-[#1a1b20] p-5 transition-colors hover:bg-[#202126] sm:p-6">
              <a href={issue.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${issue.project} on GitHub`} className="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" />
              <div className="pointer-events-none relative z-20">
                <p className="text-xs font-semibold uppercase tracking-[0.13em] text-gray-500">Project snapshot</p>
                <p className="mt-3 min-h-12 max-w-xl text-sm leading-6 text-gray-300">{issue.description}</p>
                <div className="mt-5 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-white/[0.04] p-3"><Star01Icon className="size-4 text-orange-400" /><p className="mt-2 font-semibold text-white">{formatCount(issue.stars)}</p><p className="mt-0.5 text-[11px] text-gray-500">Stars</p></div>
                  <div className="rounded-xl bg-white/[0.04] p-3"><GitBranch01Icon className="size-4 text-orange-400" /><p className="mt-2 font-semibold text-white">{formatCount(issue.issues)}</p><p className="mt-0.5 text-[11px] text-gray-500">Open issues</p></div>
                  <div className="rounded-xl bg-white/[0.04] p-3"><CoinsStacked01Icon className="size-4 text-orange-400" /><p className="mt-2 font-semibold text-white">{issue.points}</p><p className="mt-0.5 text-[11px] text-gray-500">Points / issue</p></div>
                </div>
              </div>
              <a href={`/open-source?search=${encodeURIComponent(issue.catalogName)}`} className="relative z-30 mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                Open on PoWR <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </section>
        ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2" aria-label="Choose issue">
          {projects.map((item, index) => <button key={item.url} type="button" onClick={() => choose(index)} aria-label={`Show project ${index + 1}`} aria-current={active === index} className={`h-1.5 cursor-pointer rounded-full transition-all ${active === index ? "w-8 bg-orange-500" : "w-3 bg-white/15 hover:bg-white/30"}`} />)}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={previous} aria-label="Previous project" className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-gray-300 transition-colors hover:bg-orange-500 hover:text-white"><ArrowLeftIcon className="size-4" /></button>
          <button type="button" onClick={next} aria-label="Next project" className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-gray-300 transition-colors hover:bg-orange-500 hover:text-white"><ArrowRightIcon className="size-4" /></button>
        </div>
      </div>
    </article>
  );
}
