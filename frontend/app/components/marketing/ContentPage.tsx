import Link from "next/link";
import { MarketingLayout } from "./MarketingLayout";

interface ContentSection {
  title: string;
  description: string;
  details?: string[];
}

interface ContentPageProps {
  eyebrow: string;
  title: string;
  description: string;
  features: ContentSection[];
  cta?: string;
  ctaHref?: string;
  secondaryCta?: string;
  secondaryHref?: string;
  sampleEvidence?: {
    name: string;
    role: string;
    score: number;
    summary: string;
    findings: string[];
    sources: string[];
  };
}

export function ContentPage({
  eyebrow,
  title,
  description,
  features,
  cta = "Request a demo",
  ctaHref = "/request-demo",
  secondaryCta = "Explore locally",
  secondaryHref = "/recruiter/auth",
  sampleEvidence,
}: ContentPageProps) {
  return (
    <MarketingLayout>
      <main>
        <section className="border-b border-white/[0.07] bg-[#090b0f] px-5 py-20 sm:px-8 lg:py-28">
          <div className="mx-auto max-w-[1000px]">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#ff8a4c]">{eyebrow}</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-[-0.04em] text-white sm:text-6xl">{title}</h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[#98a2b3]">{description}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={ctaHref} className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] bg-[#ff6a1a] px-6 font-semibold text-white hover:bg-[#f05b0e] active:bg-[#d94d08]">{cta}</Link>
              <Link href={secondaryHref} className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] border border-white/15 px-6 font-semibold text-white hover:border-white/25 hover:bg-white/[0.04]">{secondaryCta}</Link>
            </div>
          </div>
        </section>

        <section className="bg-[#f5f1e8] px-5 py-16 text-[#15171a] sm:px-8 lg:py-24">
          <article className="mx-auto max-w-[820px]">
            <div className="border-b border-black/15 pb-10">
              <p className="text-lg leading-8 text-[#4f5662]">This page explains the principles, safeguards, and product behavior behind {eyebrow.toLowerCase()} at PoWR.</p>
            </div>
            {features.map((feature, index) => (
              <section key={feature.title} id={feature.title.toLowerCase().replaceAll(" ", "-")} className="grid gap-5 border-b border-black/15 py-10 sm:grid-cols-[54px_1fr] sm:py-12">
                <p className="font-mono text-sm text-[#a24a1e]">{String(index + 1).padStart(2, "0")}</p>
                <div>
                  <h2 className="text-2xl font-bold tracking-[-0.025em] sm:text-3xl">{feature.title}</h2>
                  <p className="mt-4 text-base leading-8 text-[#4f5662]">{feature.description}</p>
                  {feature.details?.map((paragraph) => <p key={paragraph} className="mt-4 text-base leading-8 text-[#4f5662]">{paragraph}</p>)}
                </div>
              </section>
            ))}
          </article>
        </section>

        {sampleEvidence && (
          <section id="sample-evidence" className="scroll-mt-24 border-t border-white/[0.07] bg-[#0a111d] px-5 py-20 text-white sm:px-8 lg:py-28">
            <div className="mx-auto grid max-w-[1100px] gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#ff8a4c]">Sample developer evidence</p>
                <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-[54px] sm:leading-[1.04]">A profile built from work, not claims.</h2>
                <p className="mt-5 text-lg leading-8 text-[#98a2b3]">This demo shows how verified developer evidence can be presented to hiring teams while keeping the underlying sources visible.</p>
              </div>
              <article className="rounded-2xl border border-white/10 bg-[#111923] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-8">
                <div className="flex flex-col gap-6 border-b border-white/10 pb-7 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#98a2b3]">Demo profile</p>
                    <h3 className="mt-2 text-2xl font-bold">{sampleEvidence.name}</h3>
                    <p className="mt-1 text-[#c3c9d3]">{sampleEvidence.role}</p>
                  </div>
                  <div className="rounded-xl bg-[#17251f] px-5 py-3 text-right">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7fd9c5]">PoWR Score</p>
                    <p className="mt-1 text-3xl font-bold text-white">{sampleEvidence.score}</p>
                  </div>
                </div>
                <p className="mt-7 text-lg font-semibold leading-8">{sampleEvidence.summary}</p>
                <div className="mt-7 grid gap-6 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">Verified findings</p>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-[#d0d5dd]">
                      {sampleEvidence.findings.map((finding) => <li key={finding} className="border-l-2 border-[#ff6a1a] pl-3">{finding}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#667085]">Evidence sources</p>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-[#d0d5dd]">
                      {sampleEvidence.sources.map((source) => <li key={source} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">{source}</li>)}
                    </ul>
                  </div>
                </div>
              </article>
            </div>
          </section>
        )}
      </main>
    </MarketingLayout>
  );
}
