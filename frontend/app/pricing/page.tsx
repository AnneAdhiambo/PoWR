import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "../components/marketing/MarketingLayout";

export const metadata: Metadata = { title: "Pricing | PoWR", description: "Plans for evidence-first technical recruiting." };
const plans = [
  { name: "Start", price: "Free", description: "Explore the core workflow locally.", features: ["Branded career page", "Job publishing", "Application pipeline", "Basic PoWR profiles"] },
  { name: "Team", price: "Talk to us", description: "For companies running active hiring.", features: ["Shared hiring workspace", "Evidence-aware sourcing", "Talent lists and collaboration", "Scorecards and employee handoff"], featured: true },
  { name: "Scale", price: "Custom", description: "For controlled, higher-volume operations.", features: ["Advanced governance", "Security and audit controls", "Integrations and support", "Custom rollout planning"] },
];
export default function PricingPage() {
  return <MarketingLayout><main className="px-5 py-20 sm:px-8 lg:py-28"><div className="mx-auto max-w-7xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">Pricing</p><h1 className="mt-5 text-4xl font-semibold text-white sm:text-6xl">Pay for a better hiring process—not more resume volume.</h1><p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">PoWR is under active product development. These plan boundaries express the intended commercial model while local testing remains available.</p><div className="mt-14 grid gap-5 text-left lg:grid-cols-3">{plans.map((plan) => <article key={plan.name} className={`rounded-[var(--radius-card)] border p-7 ${plan.featured ? "border-orange-500/50 bg-orange-500/[0.07]" : "border-white/10 bg-[var(--bg-card)]"}`}><p className="text-sm font-semibold text-orange-400">{plan.name}</p><h2 className="mt-3 text-3xl font-semibold text-white">{plan.price}</h2><p className="mt-3 text-sm text-gray-400">{plan.description}</p><div className="my-6 border-t border-white/10" /><div className="space-y-3">{plan.features.map((feature) => <p key={feature} className="flex gap-2 text-sm text-gray-300"><span className="text-emerald-400" aria-hidden="true">✓</span>{feature}</p>)}</div><Link href="/request-demo" className={`mt-8 block rounded-[var(--radius-control)] px-5 py-3 text-center text-sm font-semibold ${plan.featured ? "bg-orange-500 text-white" : "border border-white/15 text-white"}`}>Discuss this plan</Link></article>)}</div></div></main></MarketingLayout>;
}
