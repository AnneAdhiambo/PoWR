import type { Metadata } from "next";
import { MarketingLayout } from "../components/marketing/MarketingLayout";
import { DemoForm } from "./DemoForm";

export const metadata: Metadata = { title: "Request a PoWR demo", description: "Tell us about your technical hiring workflow." };
export default function DemoPage() {
  return <MarketingLayout><main className="px-5 py-16 sm:px-8 lg:py-24"><div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">Request a demo</p><h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl">Show us where hiring still feels like guessing.</h1><p className="mt-6 text-lg leading-8 text-gray-400">We will walk through career pages, jobs, evidence-aware sourcing, applications, hiring decisions, and the PoWR reputation model using your hiring context.</p><div className="mt-8 space-y-3 text-sm text-gray-400"><p>✓ No pressure to buy during product development.</p><p>✓ Honest discussion of current capabilities and roadmap.</p><p>✓ Your workflow helps shape what PoWR becomes.</p></div></div><DemoForm /></div></main></MarketingLayout>;
}
