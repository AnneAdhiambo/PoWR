"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@untitledui/icons-react/outline";

const developers = [
  { seed: "Alex-Morgan", name: "Alex Morgan", role: "Backend engineer", score: 92, summary: "Builds scalable services and improves production reliability.", skills: ["Backend", "Systems"] },
  { seed: "Maya-Chen", name: "Maya Chen", role: "Full-stack engineer", score: 88, summary: "Delivers accessible interfaces and dependable backend systems.", skills: ["Frontend", "Backend"] },
  { seed: "Daniel-Kim", name: "Daniel Kim", role: "Systems engineer", score: 90, summary: "Designs resilient infrastructure and distributed platforms.", skills: ["Systems", "DevOps"] },
  { seed: "Sofia-Rossi", name: "Sofia Rossi", role: "Data engineer", score: 87, summary: "Turns complex data into reliable pipelines and useful insight.", skills: ["Data", "Backend"] },
  { seed: "Omar-Hassan", name: "Omar Hassan", role: "Backend engineer", score: 85, summary: "Ships clean APIs and solves difficult production problems.", skills: ["Backend", "Testing"] },
];

export function FeaturedDevelopers() {
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const directionRef = useRef<-1 | 0 | 1>(0);

  const stop = () => {
    directionRef.current = 0;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };

  const start = (direction: -1 | 1) => {
    stop();
    directionRef.current = direction;
    const move = () => {
      const track = trackRef.current;
      if (!track || directionRef.current === 0) return;
      track.scrollLeft += directionRef.current * 3.2;
      frameRef.current = requestAnimationFrame(move);
    };
    frameRef.current = requestAnimationFrame(move);
  };

  const step = (direction: -1 | 1) => {
    stop();
    trackRef.current?.scrollBy({ left: direction * 304, behavior: "smooth" });
  };

  useEffect(() => stop, []);

  return (
    <section className="relative overflow-hidden px-5 py-20 sm:px-8 lg:py-28">
      <div className="relative mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Top developers on PoWR</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Explore <span className="text-orange-500">developer profiles</span></h2>
          </div>
          <Link href="/developers#profiles" className="inline-flex items-center gap-2 font-semibold text-orange-500 transition-colors hover:text-orange-300">View all developers <ArrowRightIcon className="size-5" /></Link>
        </div>

        <div className="relative mt-10">
          <div onMouseEnter={() => start(-1)} onMouseLeave={stop} className="absolute inset-y-0 left-0 z-20 flex w-16 items-center justify-start bg-gradient-to-r from-[#090b0f] via-[#090b0f]/90 to-transparent sm:w-24">
            <button type="button" onClick={() => step(-1)} aria-label="Previous developers" className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-[#17181c] text-gray-300 shadow-[0_10px_28px_rgba(0,0,0,0.3)] transition-colors hover:bg-orange-500 hover:text-black">
              <ArrowLeftIcon className="size-5" />
            </button>
          </div>
          <div onMouseEnter={() => start(1)} onMouseLeave={stop} className="absolute inset-y-0 right-0 z-20 flex w-16 items-center justify-end bg-gradient-to-l from-[#090b0f] via-[#090b0f]/90 to-transparent sm:w-24">
            <button type="button" onClick={() => step(1)} aria-label="Next developers" className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-[#17181c] text-gray-300 shadow-[0_10px_28px_rgba(0,0,0,0.3)] transition-colors hover:bg-orange-500 hover:text-black">
              <ArrowRightIcon className="size-5" />
            </button>
          </div>

          <div ref={trackRef} className="powr-hide-scrollbar flex gap-4 overflow-x-auto px-8 py-2 scroll-smooth sm:px-14">
            {developers.map((developer, index) => (
              <article key={developer.name} onMouseEnter={stop} className="group min-w-[260px] rounded-2xl bg-[#121317] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)] transition-[background-color,box-shadow] duration-300 hover:bg-[#16171b] hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)] sm:min-w-[280px]">
                <div className="flex items-center gap-3">
                  <img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${developer.seed}&backgroundColor=16171b`} alt="" className="size-12 shrink-0 rounded-full bg-[#1a1b20] object-cover" />
                  <div><h3 className="font-semibold text-white">{developer.name}</h3><p className="mt-1 text-xs text-gray-500">{developer.role}</p></div>
                </div>
                <p className="mt-6 text-3xl font-semibold text-orange-500">{developer.score}<span className="ml-1 text-sm text-gray-500">/100</span></p>
                <p className="mt-4 min-h-12 text-sm leading-6 text-gray-400">{developer.summary}</p>
                <div className="mt-5 flex flex-wrap gap-2">{developer.skills.map((skill) => <span key={skill} className="rounded-md bg-white/[0.055] px-2.5 py-1 text-xs text-gray-400">{skill}</span>)}</div>
                <Link href={`/developers#profile-${index + 1}`} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-orange-500 transition-colors hover:text-orange-300">View profile <ArrowRightIcon className="size-4" /></Link>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
