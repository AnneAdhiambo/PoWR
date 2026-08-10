import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  Award01Icon,
  BookOpen01Icon,
  Briefcase01Icon,
  CoinsStacked01Icon,
  Dataflow01Icon,
  EyeIcon,
  FileSearch02Icon,
  GitPullRequestIcon,
  GraduationHat01Icon,
  MessageChatCircleIcon,
  SearchLgIcon,
  ShieldTickIcon,
  Target04Icon,
  UsersCheckIcon,
} from "@untitledui/icons-react/outline";
import { MarketingLayout } from "./components/marketing/MarketingLayout";
import { FaqSection } from "./components/marketing/FaqSection";
import { FeaturedDevelopers } from "./components/marketing/FeaturedDevelopers";

const workflow = [
  ["01", "Define the work", "Turn the role into skills, outcomes, and evidence your hiring team can agree on."],
  ["02", "Find proven builders", "Search opted-in developers using verified work, PoWR signals, preferences, and role fit."],
  ["03", "Review the evidence", "See what each candidate built, what they contributed, and where the evidence is strongest."],
  ["04", "Run one hiring process", "Organize applications, notes, scorecards, interviews, offers, and hiring handoffs together."],
];

const workflowIcons = [Target04Icon, SearchLgIcon, FileSearch02Icon, Dataflow01Icon];

export default function Home() {
  return (
    <MarketingLayout theme="dark">
      <main>
        <section className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.88fr_1.12fr]">
            <div>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-white sm:text-7xl">
                Know who can do the work <span className="text-[var(--brand-orange)]">before the interview.</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-gray-400">
                PoWR turns verified engineering work into clear candidate evidence, so recruiters can shortlist faster and technical teams can interview with context.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/request-demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 font-semibold text-white transition-colors hover:bg-orange-600">
                  Request a demo <ArrowRightIcon className="size-5" />
                </Link>
                <Link href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[#17181c] px-6 font-semibold text-gray-200 transition-colors hover:bg-[#1c1d22]">
                  See how it works
                </Link>
              </div>
              <p className="mt-7 text-sm text-gray-500">Real product views. Demo candidate data.</p>
            </div>
            <HeroVideo />
          </div>
        </section>

        <section id="product" className="bg-[#0d0e12] px-5 py-20 sm:px-8 lg:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">One recruiting workspace</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">Help your team attract, evaluate, and hire with confidence.</h2>
              <p className="mt-5 text-lg leading-8 text-gray-400">PoWR combines a modern applicant tracking workflow with technical reputation that comes from evidence—not keyword density.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                [Briefcase01Icon, "Attract candidates", "Publish branded career pages, searchable jobs, structured applications, and a candidate journey that respects consent."],
                [UsersCheckIcon, "Organize decisions", "Move candidates through one pipeline with notes, scorecards, hiring context, and clear ownership."],
                [ShieldTickIcon, "Verify technical signal", "Compare PoWR evidence, matching skills, recent delivery, and unmet requirements without hiding the reasoning."],
              ].map(([Icon, title, description]) => {
                const FeatureIcon = Icon as typeof Briefcase01Icon;
                return <article key={String(title)} className="rounded-2xl bg-[#15161a] p-7"><div className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><FeatureIcon className="size-5" /></div><h3 className="mt-6 text-xl font-semibold text-white">{title as string}</h3><p className="mt-3 text-sm leading-7 text-gray-400">{description as string}</p></article>;
              })}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">How PoWR works</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">A better operating model for technical hiring.</h2>
                <p className="mt-6 text-lg leading-8 text-gray-400">PoWR handles the evidence-heavy work so recruiters and hiring teams can spend more time on judgment, conversation, and the final decision.</p>
                <Link href="/product" className="mt-8 inline-flex items-center gap-2 font-semibold text-orange-500 hover:text-orange-300">Explore the platform <ArrowRightIcon className="size-5" /></Link>
              </div>
              <div className="space-y-4">
                {workflow.map(([step, title, description], index) => {
                  const WorkflowIcon = workflowIcons[index];
                  return <article key={step} className="grid gap-5 rounded-2xl bg-[#121317] p-6 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:grid-cols-[48px_190px_1fr] sm:items-center"><span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><WorkflowIcon className="size-5" /></span><h3 className="text-lg font-semibold text-white">{title}</h3><p className="text-sm leading-7 text-gray-400">{description}</p></article>;
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="why-powr" className="bg-[#0d0e12] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
            <ProductFrame src="/media/landing-frames/03-applications.png" alt="PoWR candidate application and evidence review" />
            <div>
                <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><EyeIcon className="size-5" /></span>
                <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Transparent by design</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">PoWR supports decisions. It does not make them for you.</h2>
                <p className="mt-6 text-lg leading-8 text-gray-400">Scores are context, not verdicts. Recruiters can inspect the evidence, understand why someone matched, see what is missing, and keep protected characteristics out of matching.</p>
                <div className="mt-8 flex gap-4"><Link href="/powr-score" className="font-semibold text-orange-500 hover:text-orange-300">How scoring works</Link><Link href="/security" className="font-semibold text-orange-500 hover:text-orange-300">Privacy and security</Link></div>
            </div>
          </div>
        </section>

        <section id="pricing" className="px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.82fr_1.18fr]">
            <div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><MessageChatCircleIcon className="size-5" /></span>
              <p className="mt-7 text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Built to grow with your team</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">Start focused. Add scale when hiring demands it.</h2>
              <p className="mt-6 text-lg leading-8 text-gray-400">Explore the workflow locally today. Commercial plans support larger teams, deeper sourcing, collaboration, and controlled outreach.</p>
              <div className="mt-8 flex flex-wrap gap-4"><Link href="/pricing" className="font-semibold text-orange-500 hover:text-orange-300">Compare plans</Link><Link href="/request-demo" className="inline-flex items-center gap-2 font-semibold text-orange-500 hover:text-orange-300">Talk to us <ArrowRightIcon className="size-5" /></Link></div>
            </div>
            <ProductFrame src="/media/landing-frames/04-jobs.png" alt="PoWR role and hiring workflow management" />
          </div>
        </section>

        <FeaturedDevelopers />

        <section id="open-source" className="scroll-mt-24 bg-[#0d0e12] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
              <div className="max-w-4xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-500">Open-source growth on PoWR</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-6xl">Build in public. Learn through <span className="text-orange-500">real contributions.</span></h2>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-400">Developers can discover work suited to their level, contribute to production projects, and turn merged pull requests into evidence hiring teams can inspect.</p>
              </div>
              <Link href="/open-source" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 font-semibold text-white transition-colors hover:bg-orange-600">Explore open source <ArrowRightIcon className="size-5" /></Link>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-[0.88fr_1.12fr]">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  [BookOpen01Icon, "Find work worth learning from", "Browse curated public projects and issues with enough context to choose your next contribution."],
                  [GraduationHat01Icon, "Choose the right challenge", "Use difficulty, language, project health, and contribution value to find work that stretches your skills."],
                  [GitPullRequestIcon, "Ship work that counts", "Claim an issue, add your PoWR token, and submit a contribution through the project’s normal GitHub workflow."],
                  [CoinsStacked01Icon, "Earn verified Street Points", "Meaningful merged pull requests are verified automatically and added to your public PoWR evidence."],
                ].map(([Icon, title, description]) => {
                  const BenefitIcon = Icon as typeof BookOpen01Icon;
                  return <article key={String(title)} className="rounded-2xl bg-[#15161a] p-6"><span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><BenefitIcon className="size-5" /></span><h3 className="mt-6 text-lg font-semibold text-white">{title as string}</h3><p className="mt-3 text-sm leading-7 text-gray-400">{description as string}</p></article>;
                })}
              </div>

              <article className="rounded-3xl bg-[#121317] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.28)] sm:p-8">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                  <div className="flex items-center gap-4"><span className="flex size-12 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><GitPullRequestIcon className="size-6" /></span><div><p className="font-semibold text-white">calcom/cal.com</p><p className="mt-1 text-xs text-gray-500">Scheduling infrastructure · TypeScript</p></div></div>
                  <span className="w-fit rounded-md bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-400">PoWR partner</span>
                </div>

                <div className="mt-8 rounded-2xl bg-[#191a1f] p-5 sm:p-6">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">Available issue</p><h3 className="mt-3 text-lg font-semibold leading-7 text-white">Improve keyboard navigation in the availability editor</h3></div><div className="shrink-0 text-left sm:text-right"><p className="text-2xl font-semibold text-orange-500">180</p><p className="text-xs text-gray-500">Street Points</p></div></div>
                  <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-gray-400">Intermediate</span><span className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-gray-400">Accessibility</span><span className="rounded-md bg-white/[0.05] px-2.5 py-1 text-xs text-gray-400">TypeScript</span></div>
                  <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><p className="max-w-md text-sm leading-6 text-gray-400">Claiming reserves a public verification token. Multiple developers may work on the issue; only meaningful merged work scores.</p><Link href="/open-source" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white hover:bg-orange-600">View issue</Link></div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {[
                    [BookOpen01Icon, "Choose an issue"],
                    [GitPullRequestIcon, "Merge the work"],
                    [Award01Icon, "Verify the evidence"],
                  ].map(([Icon, label]) => {
                    const StepIcon = Icon as typeof BookOpen01Icon;
                    return <div key={String(label)} className="flex items-center gap-3 rounded-xl bg-[#17181c] p-3"><StepIcon className="size-4 shrink-0 text-orange-500" /><span className="text-xs font-medium text-gray-300">{label as string}</span></div>;
                  })}
                </div>
              </article>
            </div>

            <div className="mt-6 grid gap-4 rounded-2xl bg-[#15161a] p-6 md:grid-cols-[48px_1fr_auto] md:items-center">
              <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><EyeIcon className="size-5" /></span>
              <div><h3 className="font-semibold text-white">For hiring teams, contributions become inspectable proof.</h3><p className="mt-2 text-sm leading-6 text-gray-400">Review the original issue, commits, pull request, merge, and PoWR verification instead of relying only on self-reported project experience.</p></div>
              <Link href="/developers#sample-evidence" className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 hover:text-orange-300">See contribution evidence <ArrowRightIcon className="size-4" /></Link>
            </div>
          </div>
        </section>

        <FaqSection />

        <section className="px-5 pb-20 sm:px-8 lg:pb-28">
          <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-[#11131a] px-6 py-14 text-center sm:px-10 sm:py-16">
            <div className="relative mx-auto max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">A clearer first conversation</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl">Start interviews with evidence, not assumptions.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-gray-400 sm:text-lg">See how PoWR gives recruiting and engineering teams a shared, inspectable view of technical work.</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/request-demo" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] bg-[var(--brand-orange)] px-6 font-semibold text-white hover:bg-[var(--brand-orange-hover)]">Request a demo</Link>
                <Link href="/developers#sample-evidence" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-control)] border border-white/15 px-6 font-semibold text-white hover:bg-white/[0.06]">See developer evidence</Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}

function ProductFrame({ src, alt, priority = false }: { src: string; alt: string; priority?: boolean }) {
  return <div className="overflow-hidden rounded-3xl bg-[#121317] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.35)]"><Image src={src} alt={alt} width={1280} height={720} priority={priority} className="h-auto w-full rounded-2xl" /></div>;
}

function HeroVideo() {
  return <div className="overflow-hidden rounded-3xl bg-[#121317] p-2 shadow-[0_30px_90px_rgba(0,0,0,0.35)]"><video autoPlay muted loop playsInline preload="metadata" poster="/media/landing-frames/01-overview.png" aria-label="PoWR product showcase" className="aspect-video w-full rounded-2xl bg-black object-cover"><source src="/media/powr-showcase.mp4" type="video/mp4" />Your browser does not support embedded video.</video></div>;
}
