"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GitBranch01Icon,
} from "@untitledui/icons-react/outline";

const issues = [
  {
    project: "facebook/react",
    detail: "UI library · JavaScript",
    number: 37261,
    title: "Hydrated dialog never fires toggle events",
    url: "https://github.com/facebook/react/issues/37261",
    points: 160,
    labels: ["Intermediate", "Events", "React"],
  },
  {
    project: "vercel/next.js",
    detail: "Web framework · TypeScript",
    number: 92141,
    title: "OPTIONS requests can return errors for static chunks",
    url: "https://github.com/vercel/next.js/issues/92141",
    points: 210,
    labels: ["Advanced", "Routing", "TypeScript"],
  },
  {
    project: "withastro/starlight",
    detail: "Documentation toolkit · TypeScript",
    number: 3710,
    title: "Aside titles do not respect Astro internationalization",
    url: "https://github.com/withastro/starlight/issues/3710",
    points: 120,
    labels: ["Intermediate", "i18n", "Astro"],
  },
  {
    project: "microsoft/TypeScript",
    detail: "Language tooling · TypeScript",
    number: 63722,
    title: "Correct the Array.at documentation terminology",
    url: "https://github.com/microsoft/TypeScript/issues/63722",
    points: 80,
    labels: ["Starter", "Help wanted", "Docs"],
  },
] as const;

export function OpenSourceIssueCarousel() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % issues.length), 3600);
    return () => window.clearInterval(timer);
  }, []);

  const issue = issues[active];
  const move = (direction: number) => setActive((current) => (current + direction + issues.length) % issues.length);

  return (
    <article
      className="relative overflow-hidden rounded-3xl bg-[#121317]/95 p-6 shadow-[0_28px_80px_rgba(0,0,0,0.34)] backdrop-blur-sm sm:p-8"
      aria-roledescription="carousel"
      aria-label="Open-source issues"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><GitBranch01Icon className="size-5" /></span>
          <div className="min-w-0"><p className="truncate font-semibold text-white">{issue.project}</p><p className="mt-1 truncate text-xs text-gray-500">{issue.detail}</p></div>
        </div>
        <span className="shrink-0 text-xs font-semibold text-orange-400">#{issue.number}</span>
      </div>

      <a
        key={issue.url}
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${issue.project} issue ${issue.number} on GitHub`}
        className="group mt-7 block cursor-pointer animate-[issue-enter_800ms_ease-out] rounded-2xl bg-[#1a1b20] p-5 transition-colors hover:bg-[#202126] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:p-6"
      >
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-gray-500">Open issue</p>
            <h3 className="mt-3 text-xl font-semibold leading-8 text-white">{issue.title}</h3>
          </div>
          <div className="shrink-0 text-right"><p className="text-2xl font-semibold text-orange-500">{issue.points}</p><p className="text-[11px] text-gray-500">Street Points</p></div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {issue.labels.map((label, index) => <span key={label} className={`rounded-md px-2.5 py-1 text-xs ${index === 0 ? "bg-orange-500/10 text-orange-300" : "bg-white/[0.05] text-gray-400"}`}>{label}</span>)}
        </div>
        <span className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition-colors group-hover:bg-orange-600">
          Open on GitHub <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </a>

      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2" aria-label="Choose issue">
          {issues.map((item, index) => <button key={item.url} type="button" onClick={() => setActive(index)} aria-label={`Show issue ${index + 1}`} aria-current={active === index} className={`h-1.5 cursor-pointer rounded-full transition-all ${active === index ? "w-8 bg-orange-500" : "w-3 bg-white/15 hover:bg-white/30"}`} />)}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="Previous issue" className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-gray-300 transition-colors hover:bg-orange-500 hover:text-white"><ArrowLeftIcon className="size-4" /></button>
          <button type="button" onClick={() => move(1)} aria-label="Next issue" className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/[0.05] text-gray-300 transition-colors hover:bg-orange-500 hover:text-white"><ArrowRightIcon className="size-4" /></button>
        </div>
      </div>
    </article>
  );
}
