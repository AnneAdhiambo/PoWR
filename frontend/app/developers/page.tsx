import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  Code01Icon,
  EyeIcon,
  FileSearch02Icon,
  GitBranch01Icon,
  Lock01Icon,
  ShieldTickIcon,
  Stars01Icon,
  Target04Icon,
} from "@untitledui/icons-react/outline";
import { MarketingLayout } from "../components/marketing/MarketingLayout";

export const metadata: Metadata = {
  title: "Explore verified developers | PoWR",
  description: "Evaluate developers through verifiable technical work, clear contribution evidence, and explainable role fit.",
};

const benefits = [
  { icon: FileSearch02Icon, title: "Evidence you can inspect", description: "Review repositories, pull requests, delivery patterns, and technical signals without interpreting an entire GitHub history yourself." },
  { icon: Code01Icon, title: "Contribution, not association", description: "Understand what a developer personally changed and delivered instead of relying on company names, project popularity, or résumé claims." },
  { icon: Lock01Icon, title: "Responsible access", description: "Evaluate only public or explicitly shared evidence while respecting each candidate’s discovery and contact preferences." },
  { icon: Target04Icon, title: "Role fit with context", description: "Compare demonstrated work with your role requirements and inspect the evidence behind strengths, gaps, and recommendations." },
];

const profiles = [
  { id: "profile-1", seed: "Alex-Morgan", name: "Alex Morgan", role: "Backend engineer", score: 92, summary: "Sustained ownership of distributed backend systems, reliability work, and production performance improvements.", skills: ["Backend", "Systems", "Observability"] },
  { id: "profile-2", seed: "Maya-Chen", name: "Maya Chen", role: "Full-stack engineer", score: 88, summary: "Accessible product interfaces supported by dependable APIs and thoughtful delivery practices.", skills: ["Frontend", "Backend", "Accessibility"] },
  { id: "profile-3", seed: "Daniel-Kim", name: "Daniel Kim", role: "Systems engineer", score: 90, summary: "Resilient infrastructure, distributed platforms, and pragmatic operational improvements.", skills: ["Systems", "DevOps", "Reliability"] },
  { id: "profile-4", seed: "Sofia-Rossi", name: "Sofia Rossi", role: "Data engineer", score: 87, summary: "Reliable data pipelines, measurable data quality, and clear operational ownership.", skills: ["Data", "Backend", "Pipelines"] },
  { id: "profile-5", seed: "Omar-Hassan", name: "Omar Hassan", role: "Backend engineer", score: 85, summary: "Clean API delivery, useful tests, and steady ownership of difficult production problems.", skills: ["Backend", "Testing", "APIs"] },
];

const findings = [
  { icon: GitBranch01Icon, title: "Multi-service delivery", detail: "Led an event-streaming migration across services and releases." },
  { icon: Stars01Icon, title: "Measured improvement", detail: "Reduced production API latency with changes tied to clear evidence." },
  { icon: ShieldTickIcon, title: "Reliable ownership", detail: "Reviewed and shipped reliability improvements across recent work." },
];

export default function DevelopersPage() {
  return (
    <MarketingLayout theme="dark">
      <main className="bg-[#090b0f] text-white">
        <section className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Developer evidence for hiring teams</p>
              <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-7xl">Know what they can do <span className="text-orange-500">before the interview.</span></h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400">Explore developers through verifiable technical work, clear contribution evidence, and explainable role fit—without turning recruiters into repository analysts.</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="#profiles" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 font-semibold text-white transition-colors hover:bg-orange-600">Explore developer profiles <ArrowRightIcon className="size-5" /></Link>
                <Link href="#sample-evidence" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#17181c] px-6 font-semibold text-gray-200 transition-colors hover:bg-[#1c1d22]">See how evidence works</Link>
              </div>
            </div>
            <article className="rounded-3xl bg-[#121317] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.3)] sm:p-9">
              <div className="flex items-start justify-between gap-5">
                <div className="flex items-center gap-4">
                  <img src="https://api.dicebear.com/9.x/notionists/svg?seed=Alex-Morgan&backgroundColor=16171b" alt="" className="size-14 rounded-full bg-[#18191e]" />
                  <div><p className="text-lg font-semibold">Alex Morgan</p><p className="mt-1 text-sm text-gray-500">Senior backend engineer</p></div>
                </div>
                <div className="rounded-xl bg-orange-500/10 px-4 py-3 text-right"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-400">PoWR score</p><p className="mt-1 text-3xl font-semibold text-orange-500">92</p></div>
              </div>
              <p className="mt-8 text-lg leading-8 text-gray-300">Demonstrates sustained ownership of distributed systems, supported by recent reliability and performance work.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <EvidenceMetric icon={GitBranch01Icon} label="Merged pull requests" value="12" />
                <EvidenceMetric icon={EyeIcon} label="Reviewed commits" value="38" />
              </div>
            </article>
          </div>
        </section>

        <section className="bg-[#0d0e12] px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">A clearer technical signal</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Move from candidate claims to inspectable evidence.</h2></div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {benefits.map(({ icon: Icon, title, description }) => <article key={title} className="rounded-2xl bg-[#15161a] p-6"><span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Icon className="size-5" /></span><h3 className="mt-6 text-lg font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-gray-400">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="sample-evidence" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Sample developer evidence</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Every conclusion leads back to work.</h2>
              <p className="mt-6 text-lg leading-8 text-gray-400">PoWR summarizes technical signals without hiding the repositories, pull requests, commits, and releases your team may want to inspect.</p>
              <Link href="/request-demo" className="mt-8 inline-flex items-center gap-2 font-semibold text-orange-500 hover:text-orange-300">See PoWR with your hiring team <ArrowRightIcon className="size-5" /></Link>
            </div>
            <article className="rounded-3xl bg-[#121317] p-7 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-9">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm text-gray-500">Demonstrated strength</p><h3 className="mt-2 text-2xl font-semibold">Backend systems ownership</h3></div><span className="inline-flex w-fit items-center gap-2 rounded-lg bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-400"><ShieldTickIcon className="size-4" /> Publicly verifiable</span></div>
              <div className="mt-8 space-y-3">{findings.map(({ icon: Icon, title, detail }) => <div key={title} className="flex gap-4 rounded-2xl bg-[#18191e] p-5"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><Icon className="size-5" /></span><div><p className="font-semibold">{title}</p><p className="mt-2 text-sm leading-6 text-gray-400">{detail}</p></div></div>)}</div>
              <div className="mt-8 grid gap-3 sm:grid-cols-3"><SourceChip label="Merged PRs" value="3" /><SourceChip label="Reviewed commits" value="8" /><SourceChip label="Verified releases" value="1" /></div>
            </article>
          </div>
        </section>

        <section id="profiles" className="scroll-mt-24 bg-[#0d0e12] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Explore developer profiles</p><h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Different backgrounds. Comparable, inspectable evidence.</h2></div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {profiles.map((profile) => <article id={profile.id} key={profile.id} className="scroll-mt-28 rounded-2xl bg-[#15161a] p-6 transition-colors hover:bg-[#18191e]"><div className="flex items-center gap-4"><img src={`https://api.dicebear.com/9.x/notionists/svg?seed=${profile.seed}&backgroundColor=18191e`} alt="" className="size-12 rounded-full bg-[#1a1b20]" /><div><h3 className="font-semibold">{profile.name}</h3><p className="mt-1 text-xs text-gray-500">{profile.role}</p></div><p className="ml-auto text-2xl font-semibold text-orange-500">{profile.score}</p></div><p className="mt-6 text-sm leading-7 text-gray-400">{profile.summary}</p><div className="mt-5 flex flex-wrap gap-2">{profile.skills.map((skill) => <span key={skill} className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-gray-400">{skill}</span>)}</div></article>)}
            </div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}

function EvidenceMetric({ icon: Icon, label, value }: { icon: typeof GitBranch01Icon; label: string; value: string }) {
  return <div className="rounded-2xl bg-[#18191e] p-4"><Icon className="size-5 text-orange-500" /><p className="mt-4 text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-gray-500">{label}</p></div>;
}

function SourceChip({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#18191e] p-4"><p className="text-2xl font-semibold text-orange-500">{value}</p><p className="mt-1 text-xs text-gray-500">{label}</p></div>;
}
