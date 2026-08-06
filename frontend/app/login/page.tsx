import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Code2 } from "lucide-react";
import { MarketingLayout } from "../components/marketing/MarketingLayout";

export default function LoginPage() {
  return (
    <MarketingLayout>
      <main className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">Welcome back</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-6xl">Choose your PoWR workspace.</h1>
            <p className="mt-5 text-base leading-7 text-gray-400">Developers build proof-backed reputations. Hiring teams discover, evaluate, and hire through verified work.</p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2">
            <Link href="/auth" className="group rounded-3xl border border-white/10 bg-[#101216] p-8 transition hover:-translate-y-0.5 hover:border-orange-500/45">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-400"><Code2 size={25} /></span>
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Developer</p>
              <h2 className="mt-3 text-2xl font-bold text-white">Continue to your developer profile</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">Connect GitHub, manage your PoWR Score, contribute to Open Source, and find opportunities.</p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white">Developer login <ArrowRight className="transition-transform group-hover:translate-x-1" /></span>
            </Link>

            <Link href="/recruiter/auth" className="group rounded-3xl border border-white/10 bg-[#101216] p-8 transition hover:-translate-y-0.5 hover:border-orange-500/45">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/12 text-orange-400"><BriefcaseBusiness size={25} /></span>
              <p className="mt-7 text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">Hiring team</p>
              <h2 className="mt-3 text-2xl font-bold text-white">Continue to your recruiter workspace</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">Manage jobs, applications, hiring decisions, talent lists, and organization workflows.</p>
              <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-white">Recruiter login <ArrowRight className="transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
