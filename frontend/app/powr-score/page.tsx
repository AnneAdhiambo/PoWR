import type { Metadata } from "next";
import { ContentPage } from "../components/marketing/ContentPage";

export const metadata: Metadata = { title: "How PoWR scoring works", description: "Understand PoWR evidence, technical reputation, role matching, and safeguards." };

export default function ScorePage() {
  return <ContentPage eyebrow="Transparent technical signal" title="A score should open the evidence—not end the conversation." description="PoWR summarizes demonstrated technical work while keeping the supporting artifacts visible. Global technical reputation, job-specific matching, and referral reliability remain separate signals." features={[
    { title: "Artifact-backed", description: "Signals derive from inspectable work artifacts and contribution history rather than self-reported proficiency." },
    { title: "Multi-dimensional", description: "Profiles show skill dimensions, confidence, artifact volume, recency, and contribution context instead of one unexplained number." },
    { title: "Role fit stays separate", description: "A job match answers whether visible evidence supports a particular role. It does not overwrite technical reputation." },
    { title: "Human decision remains final", description: "PoWR does not automatically reject or hire candidates. Recruiters inspect evidence and remain accountable for the decision." },
    { title: "Protected traits excluded", description: "Role matching is designed around requirements, evidence, preferences, and relevant activity—not protected characteristics." },
    { title: "Referral reliability is bounded", description: "Referral outcomes use a separate consented ledger with evidence thresholds, caps, appeals, and abuse controls." },
  ]} />;
}
