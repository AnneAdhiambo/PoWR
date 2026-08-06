import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  Briefcase01Icon,
  CalendarCheck01Icon,
  ClipboardCheckIcon,
  Code01Icon,
  EyeIcon,
  FileSearch02Icon,
  MessageChatCircleIcon,
  SearchLgIcon,
  ShieldTickIcon,
  Target04Icon,
  UsersCheckIcon,
} from "@untitledui/icons-react/outline";
import { MarketingLayout } from "../components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Recruiting product | PoWR",
  description: "Source, evaluate, and hire developers using verified work evidence and one organized recruiting workflow.",
};

const capabilities = [
  { icon: Briefcase01Icon, title: "Branded jobs", description: "Publish focused role pages and collect structured applications in a candidate experience that reflects your company." },
  { icon: SearchLgIcon, title: "Evidence-aware sourcing", description: "Find opted-in developers through skills, preferences, recent delivery, and verifiable technical work." },
  { icon: FileSearch02Icon, title: "Inspectable profiles", description: "See what each developer built, what they personally contributed, and which sources support every finding." },
  { icon: Target04Icon, title: "Explainable role fit", description: "Compare role requirements with demonstrated evidence while keeping gaps and uncertainty visible." },
  { icon: UsersCheckIcon, title: "One hiring pipeline", description: "Coordinate stages, ownership, notes, scorecards, interviews, offers, and decisions in one authoritative workflow." },
  { icon: ShieldTickIcon, title: "Human-controlled decisions", description: "Use PoWR as technical context while keeping recruiters, hiring managers, and interviewers responsible for judgment." },
];

const workflow = [
  { icon: ClipboardCheckIcon, title: "Define the work", description: "Align the team around role outcomes, required skills, and the evidence that would demonstrate them." },
  { icon: SearchLgIcon, title: "Find proven builders", description: "Review applicants and discover developers whose verified work relates to the role." },
  { icon: EyeIcon, title: "Inspect the evidence", description: "Move from summarized signals into pull requests, commits, releases, and contribution context." },
  { icon: CalendarCheck01Icon, title: "Interview with context", description: "Use evidence-backed questions and shared scorecards to run a focused, consistent process." },
];

export default function ProductPage() {
  return (
    <MarketingLayout theme="dark">
      <main className="bg-[#090b0f] text-white">
        <section className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">PoWR recruiting product</p>
              <h1 className="mt-5 text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-7xl">Run the hiring workflow. <span className="text-orange-500">Understand the work.</span></h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400">PoWR combines evidence-aware sourcing, structured evaluation, and collaborative hiring so your team can shortlist developers with more context and less guesswork.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/request-demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 font-semibold text-white transition-colors hover:bg-orange-600">Request a demo <ArrowRightIcon className="size-5" /></Link>
                <Link href="#workflow" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#17181c] px-6 font-semibold text-gray-200 transition-colors hover:bg-[#1c1d22]">See the workflow</Link>
              </div>
            </div>
            <ProductFrame src="/media/landing-frames/01-overview.png" alt="PoWR recruiter workspace overview" priority />
          </div>
        </section>

        <section className="bg-[#0d0e12] px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">One recruiting workspace</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Everything needed to move from an open role to a confident decision.</h2></div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl bg-[#15161a] p-7"><span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Icon className="size-5" /></span><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-gray-400">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">How PoWR works</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">One connected hiring process.</h2>
                <p className="mt-6 text-lg leading-8 text-gray-400">Keep role definition, sourcing, evidence review, interviews, and decisions connected instead of spreading context across disconnected tools.</p>
              </div>
              <div className="space-y-4">
                {workflow.map(({ icon: Icon, title, description }) => <article key={title} className="grid gap-5 rounded-2xl bg-[#121317] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:grid-cols-[48px_190px_1fr] sm:items-center"><span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Icon className="size-5" /></span><h3 className="text-lg font-semibold">{title}</h3><p className="text-sm leading-7 text-gray-400">{description}</p></article>)}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0d0e12] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <ProductFrame src="/media/landing-frames/03-applications.png" alt="PoWR candidate application and evidence review" />
            <div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Code01Icon className="size-5" /></span>
              <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Evidence before assumptions</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">See why a developer matches.</h2>
              <p className="mt-6 text-lg leading-8 text-gray-400">Review demonstrated skills, contribution ownership, recent delivery, and unmet requirements together. Every summary remains connected to sources your team can inspect.</p>
              <Link href="/developers#sample-evidence" className="mt-8 inline-flex items-center gap-2 font-semibold text-orange-500 transition-colors hover:text-orange-300">Explore sample developer evidence <ArrowRightIcon className="size-5" /></Link>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><MessageChatCircleIcon className="size-5" /></span>
              <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Shared hiring context</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Keep the team aligned from review to offer.</h2>
              <p className="mt-6 text-lg leading-8 text-gray-400">Give recruiters, hiring managers, and interviewers the same candidate context, clear ownership, structured scorecards, and an auditable decision history.</p>
              <Link href="/request-demo" className="mt-8 inline-flex items-center gap-2 font-semibold text-orange-500 transition-colors hover:text-orange-300">Walk through the product <ArrowRightIcon className="size-5" /></Link>
            </div>
            <ProductFrame src="/media/landing-frames/04-jobs.png" alt="PoWR role and hiring workflow management" />
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="mx-auto max-w-7xl rounded-3xl bg-[#15161a] px-6 py-14 text-center shadow-[0_28px_80px_rgba(0,0,0,0.25)] sm:px-10 sm:py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">A clearer first conversation</p>
            <h2 className="mx-auto mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Start interviews with evidence, not assumptions.</h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">See how PoWR fits your roles, hiring team, and current recruiting workflow.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/request-demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 font-semibold text-white hover:bg-orange-600">Request a demo <ArrowRightIcon className="size-5" /></Link><Link href="/developers#profiles" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#1c1d22] px-6 font-semibold text-gray-200 hover:bg-[#222329]">Explore developer profiles</Link></div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}

function ProductFrame({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return <div className="overflow-hidden rounded-3xl bg-[#121317] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.35)]"><Image src={src} alt={alt} width={1280} height={720} priority={priority} className="h-auto w-full rounded-2xl" /></div>;
}
