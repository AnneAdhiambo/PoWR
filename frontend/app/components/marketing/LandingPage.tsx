"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Code,
  GithubLogo,
  GitlabLogo,
  GoogleLogo,
  MicrosoftTeamsLogo,
  Play,
  SlackLogo,
  Sparkle,
} from "phosphor-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui";
import { FaqSection } from "./FaqSection";

const problems = [
  ["CVs hide real skill", "Titles and keywords rarely show what a developer actually built."],
  ["GitHub takes hours to interpret", "Recruiters cannot reliably judge unfamiliar repositories and contribution histories."],
  ["Engineers become résumé reviewers", "Senior developers spend expensive time screening basic candidate claims."],
  ["Interviews start without context", "Teams repeat surface-level questions instead of investigating technical decisions."],
];

const productCallouts = [
  ["PoWR score and skills", "Review the candidate’s technical score and demonstrated skill signals."],
  ["Candidate context", "Read the profile summary, application context, and supporting evidence together."],
  ["Hiring decision controls", "Open the PoWR profile, complete a scorecard, or move the candidate to the next stage."],
];

const workflow = [
  ["01", "Define the work", "Set outcomes, technical depth, and evidence requirements.", "/media/landing-frames/04-jobs.png"],
  ["02", "Find proven builders", "Search applicants and sourced developers using demonstrated work.", "/media/landing-frames/01-overview.png"],
  ["03", "Review the evidence", "Compare contributions, ownership, and role-specific proof.", "/media/landing-frames/03-applications.png"],
  ["04", "Run a focused interview", "Use the evidence brief to investigate decisions and technical depth.", "/media/landing-frames/03-applications.png"],
];

const trustItems = [
  "Scores are evidence summaries, not hiring decisions.",
  "Recruiters can inspect every supporting source.",
  "Candidates control private work visibility.",
  "Protected characteristics are excluded.",
  "Teams define their own role requirements.",
  "Interviewers can challenge or override recommendations.",
];

const integrations = [
  ["Applicant tracking", "PoWR workspace", "Available"],
  ["Developer evidence", "GitHub", "Available"],
  ["Communication", "Email and calendar", "Planned"],
  ["Identity and access", "Workspace SSO", "Planned"],
];

const ecosystemBrands = [
  { name: "GitHub", status: "Available", icon: GithubLogo },
  { name: "GitLab", status: "Planned", icon: GitlabLogo },
  { name: "Google Workspace", status: "Planned", icon: GoogleLogo },
  { name: "Slack", status: "Planned", icon: SlackLogo },
  { name: "Microsoft Teams", status: "Planned", icon: MicrosoftTeamsLogo },
];

const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <main className="overflow-hidden bg-[#090b0f]">
      <section className="relative border-b border-white/[0.07] px-5 pb-14 pt-14 sm:px-8 lg:pb-20 lg:pt-20">
        <div className="pointer-events-none absolute right-[8%] top-[18%] h-72 w-72 rounded-full bg-[#6558d9]/10 blur-[110px]" />
        <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <motion.div initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }}>
            <p className="text-sm font-semibold tracking-[0.12em] text-[#ff8a4c]">Evidence-first technical hiring</p>
            <h1 className="mt-5 max-w-2xl text-[44px] font-bold leading-[1.03] tracking-[-0.045em] text-[#f7f7f5] sm:text-6xl lg:text-[72px]">
              Know who can do the work before the interview.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#98a2b3] sm:text-lg sm:leading-8">
              PoWR turns verified engineering work into clear candidate evidence, so recruiters can shortlist faster and technical teams can interview with context.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/request-demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[#ff6a1a] px-6 font-semibold text-white transition-colors hover:bg-[#f05b0e] active:bg-[#d94d08]">
                Request a demo
              </Link>
              <Link href="#product-proof" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/15 px-6 font-semibold text-white transition-colors hover:border-white/25 hover:bg-white/[0.05] active:bg-white/[0.08]">
                See product proof
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#667085]">Real product views. Demo candidate data.</p>
          </motion.div>
          <HeroVideo reduceMotion={Boolean(reduceMotion)} />
        </div>
      </section>

      <ProductProof />

      <section className="bg-[#f5f1e8] px-5 py-20 text-[#15171a] sm:px-8 lg:py-28">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#d94d08]">The problem</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-[54px] sm:leading-[1.05]">Technical hiring breaks before the interview starts.</h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#667085]">Recruiters need evidence they can understand. Engineering teams need interviews that start beyond the résumé.</p>
          </div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            transition={{ staggerChildren: reduceMotion ? 0 : 0.05 }}
            className="mt-12 grid gap-5 md:grid-cols-2"
          >
            {problems.map(([title, description], index) => (
              <motion.article key={title} variants={reduceMotion ? undefined : reveal} transition={{ duration: 0.36 }} className="group rounded-xl border border-black/[0.08] bg-white/70 p-7 transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-black/[0.16]">
                <p className="font-mono text-sm text-[#8a8177]">0{index + 1}</p>
                <h3 className="mt-8 text-xl font-semibold">{title}</h3>
                <p className="mt-3 max-w-lg leading-7 text-[#667085]">{description}</p>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </section>

      <ProductDemo reduceMotion={Boolean(reduceMotion)} />
      <WorkflowSection reduceMotion={Boolean(reduceMotion)} />
      <EvidenceSection />

      <section id="why-powr" className="bg-[#f5f1e8] px-5 py-20 text-[#15171a] sm:px-8 lg:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#d94d08]">Human control</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-[54px] sm:leading-[1.05]">PoWR supports decisions. It does not make them for you.</h2>
            <p className="mt-5 text-lg leading-8 text-[#667085]">The score is a summary. The evidence remains visible, challengeable, and subordinate to human judgment.</p>
            <div className="mt-7 flex gap-5 text-sm font-semibold"><Link href="/powr-score" className="text-[#d94d08] hover:text-[#ff6a1a]">How scoring works</Link><Link href="/security" className="text-[#d94d08] hover:text-[#ff6a1a]">Privacy and security</Link></div>
          </div>
          <div className="overflow-hidden rounded-xl border border-black/[0.09] bg-white/70">
            {trustItems.map((item) => <div key={item} className="flex min-h-16 items-center gap-3 border-b border-black/[0.07] px-5 py-4 last:border-0"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ddf7f0] text-[#17866f]"><Check size={15} weight="bold" /></span><p className="font-medium">{item}</p></div>)}
          </div>
        </div>
      </section>

      <section className="bg-[#f5f1e8] px-5 py-20 text-[#15171a] sm:px-8 lg:py-24">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#d94d08]">Integration clarity</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-[54px] sm:leading-[1.05]">Fits into the hiring tools your team already uses.</h2><p className="mt-5 text-lg leading-8 text-[#667085]">Available connections are shown plainly. Planned capabilities are never presented as shipped.</p></div>
          <div className="mt-10 grid overflow-hidden rounded-xl border border-black/[0.09] md:grid-cols-2 lg:grid-cols-4">
            {integrations.map(([category, product, status], index) => <article key={category} className={`min-h-44 bg-white/45 p-6 ${index ? "border-t border-black/[0.08] md:border-l md:border-t-0" : ""}`}><p className="text-sm text-[#667085]">{category}</p><h3 className="mt-5 text-lg font-semibold">{product}</h3><span className={`mt-8 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status === "Available" ? "bg-[#ddf7f0] text-[#177a66]" : "bg-[#f2ede5] text-[#6b6258]"}`}>{status}</span></article>)}
          </div>
        </div>
      </section>

      <section className="relative border-y border-white/[0.07] bg-[#0d1016] px-5 py-20 text-center sm:px-8 lg:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_100%,rgba(101,88,217,0.16),transparent_38%),radial-gradient(circle_at_40%_90%,rgba(255,106,26,0.1),transparent_28%)]" />
        <div className="relative mx-auto max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#ff8a4c]">A clearer first conversation</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-white sm:text-[54px] sm:leading-[1.05]">Start interviews with evidence, not assumptions.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#98a2b3]">See how PoWR gives recruiting and engineering teams a shared, inspectable view of technical work.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/request-demo" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-[#ff6a1a] px-6 font-semibold text-white hover:bg-[#f05b0e]">Request a demo</Link><Link href="/developers#sample-evidence" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-white/15 px-6 font-semibold text-white hover:bg-white/[0.05]">See developer evidence</Link></div></div>
      </section>

      <FaqSection />
    </main>
  );
}

function HeroVideo({ reduceMotion }: { reduceMotion: boolean }) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      videoRef.current?.pause();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.48, delay: reduceMotion ? 0 : 0.08 }}
        className="group relative aspect-video w-full overflow-hidden rounded-2xl border border-white/[0.14] bg-[#11151b] text-left shadow-[0_26px_80px_rgba(0,0,0,0.42)] transition-[border-color,transform] duration-300 hover:scale-[1.012] hover:border-white/25 active:scale-[1.005]"
        aria-label="Play the PoWR product walkthrough"
      >
        <video muted playsInline preload="metadata" poster="/media/landing-frames/01-overview.png" className="h-full w-full object-cover">
          <source src="/media/powr-product-walkthrough.mp4" type="video/mp4" />
        </video>
        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
        <span className="absolute inset-0 flex items-center justify-center"><span className="flex size-16 items-center justify-center rounded-full border border-white/70 bg-white text-[#15171a] shadow-xl transition-transform duration-300 group-hover:scale-105"><Play size={24} weight="fill" className="ml-1" /></span></span>
        <span className="absolute bottom-5 left-5"><span className="block text-sm font-semibold text-white">See candidate evidence in action</span><span className="mt-1 block text-xs text-white/65">Product walkthrough · 00:08</span></span>
      </motion.button>
      <DialogContent className="w-[min(94vw,1120px)] max-w-none overflow-hidden border-white/15 bg-[#090b0f] p-3 sm:p-4">
        <DialogTitle className="sr-only">PoWR product walkthrough</DialogTitle>
        <DialogDescription className="sr-only">A walkthrough of the recruiter overview, candidate applications, and role management.</DialogDescription>
        <video ref={videoRef} controls autoPlay playsInline preload="metadata" poster="/media/landing-frames/01-overview.png" className="aspect-video w-full rounded-xl bg-black">
          <source src="/media/powr-product-walkthrough.mp4" type="video/mp4" />
        </video>
      </DialogContent>
    </Dialog>
  );
}

function ProductProof() {
  return (
    <section id="product-proof" className="scroll-mt-24 bg-[#f5f1e8] px-5 py-16 text-[#15171a] sm:px-8 lg:py-20">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-8 rounded-2xl border border-black/[0.09] bg-white/55 p-7 sm:p-9 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#d94d08]">Working product proof</p>
            <h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-[46px] sm:leading-[1.05]">A real hiring workflow, not a concept deck.</h2>
          </div>
          <div>
            <p className="text-lg leading-8 text-[#4f5662]">PoWR already connects published roles, organized applications, candidate PoWR Scores, hiring stages, notes, scorecards, and employee handoff in one working product.</p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#34383f]">
              {["Publish roles", "Review candidates", "Inspect PoWR signals", "Coordinate decisions"].map((item) => <span key={item} className="inline-flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded-full bg-[#ddf7f0] text-[#177a66]"><Check size={12} weight="bold" /></span>{item}</span>)}
            </div>
          </div>
        </div>
        <div className="mt-12 overflow-hidden border-y border-black/[0.09] py-5" aria-label="PoWR evidence and workflow ecosystem">
          <div className="powr-logo-marquee-track">
            {[0, 1].map((group) => (
              <div key={group} className="flex shrink-0 items-center gap-5 pr-5" aria-hidden={group === 1}>
                {ecosystemBrands.map(({ name, status, icon: BrandIcon }) => (
                  <div key={name} className="flex min-w-56 items-center gap-3 rounded-xl border border-black/[0.08] bg-white/50 px-5 py-4">
                    <BrandIcon size={26} weight="fill" className="text-[#2e3238]" />
                    <div><p className="font-bold">{name}</p><p className={`mt-0.5 text-xs font-semibold ${status === "Available" ? "text-[#177a66]" : "text-[#8a8177]"}`}>{status}</p></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductDemo({ reduceMotion }: { reduceMotion: boolean }) {
  const [active, setActive] = useState(0);
  return (
    <section id="product" className="bg-[#f5f1e8] px-5 py-20 text-[#15171a] sm:px-8 lg:py-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="mx-auto max-w-3xl text-center"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#d94d08]">Inside the product</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-[56px] sm:leading-[1.02]">See the evidence before making the shortlist.</h2><p className="mt-5 text-lg leading-8 text-[#667085]">Move from a candidate name to source-backed technical context without turning every recruiter into a repository analyst.</p></div>
        <motion.div initial={reduceMotion ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.36 }} className="mt-12 grid items-center gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-2">
            {productCallouts.map(([title, description], index) => <button key={title} type="button" onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)} aria-pressed={active === index} className={`w-full rounded-xl border p-5 text-left transition-colors duration-300 ${active === index ? "border-[#ff6a1a]/35 bg-[#fff0e8]" : "border-transparent hover:border-black/[0.08] hover:bg-white/45"}`}><span className="text-base font-semibold">{title}</span><span className="mt-2 block text-sm leading-6 text-[#667085]">{description}</span></button>)}
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-black/[0.1] bg-[#090b0f] p-2 shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
            <Image src="/media/landing-frames/03-applications.png" alt="PoWR recruiter application review showing candidate scores and evidence" width={1280} height={720} className="h-auto w-full rounded-xl" />
            <div className={`pointer-events-none absolute rounded-lg border-2 border-[#ff6a1a] bg-[#ff6a1a]/10 transition-all duration-300 ${active === 0 ? "left-[21%] top-[43%] h-[20%] w-[11%]" : active === 1 ? "left-[31%] top-[42%] h-[34%] w-[33%]" : "left-[68%] top-[44%] h-[34%] w-[28%]"}`} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function WorkflowSection({ reduceMotion }: { reduceMotion: boolean }) {
  const [active, setActive] = useState(0);
  return (
    <section id="how-it-works" className="bg-[#211846] px-5 py-20 text-white sm:px-8 lg:py-28">
      <div className="mx-auto max-w-[1200px]">
        <div className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#c7bfff]">How PoWR works</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-[56px] sm:leading-[1.02]">A better operating model for technical hiring.</h2><p className="mt-5 text-lg leading-8 text-[#c8c2df]">Agree on the work, review demonstrated evidence, then use interviews for judgment instead of claim verification.</p></div>
        <div className="mt-12 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div role="tablist" aria-label="Technical hiring workflow" className="overflow-hidden rounded-xl border border-white/15 bg-black/10">
            {workflow.map(([step, title, description], index) => <button key={step} type="button" role="tab" aria-selected={active === index} onClick={() => setActive(index)} className={`grid w-full grid-cols-[48px_1fr] gap-3 border-b border-white/10 p-5 text-left last:border-0 ${active === index ? "bg-white text-[#211846]" : "text-white hover:bg-white/[0.06]"}`}><span className={`font-mono text-sm font-semibold ${active === index ? "text-[#ff6a1a]" : "text-[#9f96c1]"}`}>{step}</span><span><span className="block font-semibold">{title}</span><span className={`mt-1 block text-sm leading-6 ${active === index ? "text-[#667085]" : "text-[#b7b0d0]"}`}>{description}</span></span></button>)}
          </div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/15 bg-[#090b0f] p-2 shadow-2xl">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={active} initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-2">
                <Image src={workflow[active][3]} alt={`${workflow[active][1]} product view`} fill sizes="(min-width: 1024px) 58vw, 100vw" className="rounded-xl object-cover" />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function EvidenceSection() {
  const [source, setSource] = useState<string | null>(null);
  const sources = [
    ["3 merged pull requests", "Pull requests #418, #426, and #431 show the migration plan, implementation, and rollout."],
    ["8 reviewed commits", "The commit history isolates the candidate’s changes across service boundaries and deployment tooling."],
    ["1 release note", "Release 4.8 documents the production migration and the resulting reliability improvement."],
  ];
  return (
    <section className="bg-[#0a111d] px-5 py-20 text-white sm:px-8 lg:py-28">
      <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.82fr_1.18fr]">
        <div><p className="text-sm font-bold uppercase tracking-[0.14em] text-[#7fd9c5]">Explainability</p><h2 className="mt-4 text-3xl font-bold tracking-[-0.035em] sm:text-[56px] sm:leading-[1.02]">Every conclusion should lead back to evidence.</h2><p className="mt-5 text-lg leading-8 text-[#98a2b3]">PoWR does not ask teams to trust a score. Recruiters can inspect the work, contribution, and source behind each finding.</p></div>
        <div className="rounded-2xl border border-white/10 bg-[#111923] p-6 sm:p-8">
          <div className="flex items-center gap-3 text-sm font-semibold text-[#7fd9c5]"><Sparkle size={18} /> Finding</div>
          <h3 className="mt-4 text-xl font-semibold leading-8">Led the migration of a high-traffic service to an event-driven architecture.</h3>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.14em] text-[#667085]">Sources</p>
          <div className="mt-3 space-y-2">{sources.map(([label]) => <button key={label} type="button" onClick={() => setSource(label)} className="flex min-h-12 w-full items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.025] px-4 text-left text-sm text-[#d0d5dd] hover:border-white/20 hover:bg-white/[0.05]"><span>{label}</span><ArrowRight size={15} /></button>)}</div>
          <div className="mt-7 border-t border-white/10 pt-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667085]">Why it matters</p><p className="mt-3 leading-7 text-[#98a2b3]">Demonstrates backend ownership, migration planning, and production delivery.</p></div>
        </div>
      </div>
      <Dialog open={Boolean(source)} onOpenChange={(open) => !open && setSource(null)}>
        <DialogContent className="w-[min(92vw,680px)] max-w-none bg-[#111923]">
          <DialogTitle className="pr-10 text-xl font-semibold">{source}</DialogTitle>
          <DialogDescription className="mt-3 leading-7 text-[#98a2b3]">{sources.find(([label]) => label === source)?.[1]}</DialogDescription>
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/25 p-5 font-mono text-sm leading-7 text-[#b7c2d0]"><Code size={18} className="mb-3 text-[#7fd9c5]" />Source preview from the sample evidence brief. Repository links remain inspectable by the hiring team.</div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
