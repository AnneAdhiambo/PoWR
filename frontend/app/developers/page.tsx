import type { Metadata } from "next";
import { ContentPage } from "../components/marketing/ContentPage";

export const metadata: Metadata = { title: "For developers | PoWR", description: "Build a portable technical reputation from work you can prove." };

export default function DevelopersPage() {
  return <ContentPage eyebrow="For developers" title="Let the work speak before the resume does." description="PoWR helps developers turn real contributions into a portable, inspectable reputation while retaining control over discovery, contact, evidence sharing, applications, and referrals." cta="Build your profile" ctaHref="/auth" secondaryCta="Explore jobs" secondaryHref="/jobs" features={[
    { title: "Evidence you can carry", description: "Bring repositories, pull requests, delivery patterns, and verified technical signals into one shareable profile." },
    { title: "Contribution, not association", description: "Show what you personally changed and delivered rather than relying on the reputation of a company or project." },
    { title: "Consent and control", description: "Choose whether recruiters can discover or contact you and decide what evidence accompanies each application." },
    { title: "Relevant opportunities", description: "Compare roles against your skills, preferences, verified evidence, and availability without hiding the match reasoning." },
  ]} />;
}
