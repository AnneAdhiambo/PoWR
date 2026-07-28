import Link from "next/link";
import { MarketingLayout } from "./components/marketing/MarketingLayout";
import { FaqSection } from "./components/marketing/FaqSection";

const workflow = [
  ["01", "Define the work", "Turn the role into skills, outcomes, and evidence your hiring team can agree on."],
  ["02", "Find proven builders", "Search opted-in developers using verified work, PoWR signals, preferences, and role fit."],
  ["03", "Review the evidence", "See what each candidate built, what they contributed, and where the evidence is strongest."],
  ["04", "Run one hiring process", "Organize applications, notes, scorecards, interviews, offers, and hiring handoffs together."],
];

export default function Home() {
  return (
    <MarketingLayout>
      <main>
        <section className="relative overflow-hidden border-b border-white/[0.07] px-5 pb-16 pt-16 sm:px-8 lg:pb-24 lg:pt-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_27%_78%,rgba(255,85,0,0.19),transparent_31%),radial-gradient(circle_at_76%_8%,rgba(255,255,255,0.05),transparent_28%)]" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.88fr_1.12fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-300">
                <span aria-hidden="true">✓</span> Evidence-first hiring
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-white sm:text-6xl lg:text-7xl">
                Your hiring team is still <span className="text-[var(--brand-orange)]">guessing</span> who can do the work.
              </h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-gray-400 sm:text-lg">
                PoWR shows what developers have actually built, what they personally contributed, and how their evidence matches the role—before your team spends weeks interviewing.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/request-demo" className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--brand-orange)] px-6 py-3.5 font-semibold text-white hover:bg-[var(--brand-orange-hover)]">
                  Request a demo <span aria-hidden="true">→</span>
                </Link>
                <Link href="/product" className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] border border-white/15 bg-white/[0.04] px-6 py-3.5 font-semibold text-white hover:bg-white/[0.08]">
                  See how PoWR works
                </Link>
              </div>
              <p className="mt-7 text-sm text-gray-500">Start with real work, not perfect claims.</p>
            </div>
            <CandidatePreview />
          </div>
          <div className="relative mx-auto mt-12 grid max-w-7xl gap-px overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              ["01", "Real work", "Start with pull requests, repositories, and delivery evidence."],
              ["02", "Clear contribution", "Understand what the developer personally designed and shipped."],
              ["03", "Explainable role fit", "See matching evidence and gaps without automated hiring decisions."],
            ].map(([icon, title, description]) => <div key={title} className="flex gap-4 bg-[#0d0f13] p-6"><span className="mt-1 font-mono text-sm text-orange-500">{icon}</span><div><h2 className="font-semibold text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-gray-500">{description}</p></div></div>)}
          </div>
        </section>

        <section id="product" className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">One recruiting workspace</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Help your team attract, evaluate, and hire with confidence.</h2>
              <p className="mt-5 text-lg leading-8 text-gray-400">PoWR combines a modern applicant tracking workflow with technical reputation that comes from evidence—not keyword density.</p>
            </div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {[
                ["A", "Attract candidates", "Publish branded career pages, searchable jobs, structured applications, and a candidate journey that respects consent."],
                ["B", "Organize decisions", "Move candidates through one pipeline with notes, scorecards, hiring context, and clear ownership."],
                ["C", "Verify technical signal", "Compare PoWR evidence, matching skills, recent delivery, and unmet requirements without hiding the reasoning."],
              ].map(([icon, title, description]) => <article key={title} className="rounded-[var(--radius-card)] border border-white/10 bg-[var(--bg-card)] p-7"><div className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 font-mono text-orange-400">{icon}</div><h3 className="mt-6 text-xl font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-7 text-gray-400">{description}</p></article>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-white/[0.07] bg-[#11131a] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">How PoWR works</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">A better operating model for technical hiring.</h2>
                <p className="mt-5 leading-7 text-gray-400">PoWR handles the evidence-heavy work so recruiters and hiring teams can spend more time on judgment, conversation, and the final decision.</p>
                <Link href="/product" className="mt-7 inline-flex items-center gap-2 font-semibold text-orange-400 hover:text-orange-300">Explore the platform <span aria-hidden="true">→</span></Link>
              </div>
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-[#090b0f]">
                {workflow.map(([step, title, description]) => <div key={step} className="grid gap-4 border-b border-white/[0.07] p-6 last:border-0 sm:grid-cols-[56px_180px_1fr]"><span className="font-mono text-sm text-orange-400">{step}</span><h3 className="font-semibold text-white">{title}</h3><p className="text-sm leading-6 text-gray-500">{description}</p></div>)}
              </div>
            </div>
          </div>
        </section>

        <section id="why-powr" className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="rounded-[var(--radius-card)] border border-white/10 bg-[linear-gradient(145deg,rgba(255,85,0,0.12),rgba(18,20,26,0.95)_45%)] p-7 sm:p-10">
                <p className="text-sm text-gray-500">What the team can inspect</p>
                <div className="mt-7 space-y-4">
                  {["Evidence behind every skill signal", "Candidate-controlled discovery and sharing", "Role-fit reasoning and unmet requirements", "Hiring notes, scorecards, and decision history", "Separate technical and referral reputation"].map((item) => <div key={item} className="flex gap-3 rounded-xl border border-white/[0.08] bg-black/20 p-4 text-sm text-gray-200"><span className="text-emerald-400" aria-hidden="true">✓</span>{item}</div>)}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">Transparent by design</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">PoWR supports decisions. It does not make them for you.</h2>
                <p className="mt-6 text-lg leading-8 text-gray-400">Scores are context, not verdicts. Recruiters can inspect the evidence, understand why someone matched, see what is missing, and keep protected characteristics out of matching.</p>
                <div className="mt-7 flex gap-3"><Link href="/powr-score" className="font-semibold text-orange-400">How scoring works</Link><span className="text-gray-700">·</span><Link href="/security" className="font-semibold text-orange-400">Privacy and security</Link></div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-white/[0.07] bg-white/[0.025] px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">Built to grow with your team</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">Start focused. Add scale when hiring demands it.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-gray-400">Explore the workflow locally today. Commercial plans support larger teams, deeper sourcing, collaboration, and controlled outreach.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/pricing" className="rounded-[var(--radius-control)] border border-white/15 px-6 py-3 font-semibold text-white hover:bg-white/[0.06]">Compare plans</Link><Link href="/request-demo" className="rounded-[var(--radius-control)] bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600">Talk to us</Link></div>
          </div>
        </section>

        <FaqSection />
      </main>
    </MarketingLayout>
  );
}

function CandidatePreview() {
  const metrics = [["Depth of skills", 91], ["Recent delivery", 87], ["Problem solving", 90], ["Consistency", 86], ["Ownership", 92]];
  return (
    <div className="relative rounded-[22px] border border-white/15 bg-[#0b0e13]/95 p-3 shadow-[0_30px_100px_rgba(0,0,0,0.55)]">
      <div className="rounded-2xl border border-white/[0.07] bg-[#0e1117] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.15em] text-gray-600">Candidate evidence brief</p><h2 className="mt-2 text-2xl font-semibold text-white">Alex Morgan</h2><p className="text-sm text-gray-400">Senior Backend Engineer</p></div><span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">Strong evidence fit</span></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-5">
            <h3 className="font-semibold text-white">Role-fit evidence</h3>
            <div className="mt-5 space-y-4">
              {metrics.map(([label, score]) => (
                <div key={String(label)}>
                  <div className="mb-1.5 flex justify-between text-xs"><span className="text-gray-400">{label}</span><span className="text-emerald-300">{score}</span></div>
                  <div className="h-1.5 rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${score}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-5"><h3 className="font-semibold text-white">Contribution highlights</h3><div className="mt-5 space-y-3">{["Led a backend refactor across services", "Introduced an event-streaming pipeline", "Improved API latency by 27%", "Shipped production changes recently"].map((item) => <p key={item} className="flex gap-2 text-xs leading-5 text-gray-400"><span className="text-emerald-400" aria-hidden="true">✓</span>{item}</p>)}</div></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{["Node.js", "Distributed systems", "Ownership", "Verified delivery"].map((tag) => <span key={tag} className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-gray-400">{tag}</span>)}</div>
      </div>
    </div>
  );
}
