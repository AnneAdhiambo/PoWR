import type { Metadata } from "next";
import { ContentPage } from "../components/marketing/ContentPage";

export const metadata: Metadata = { title: "Security, privacy and fairness | PoWR", description: "How PoWR handles tenant isolation, consent, explainability, and accessibility." };
export default function SecurityPage() {
  return <ContentPage eyebrow="Trust foundation" title="Evidence is useful only when people can trust how it is handled." description="PoWR is being built with organization isolation, revocable sessions, candidate consent, explainable matching, bounded reputation changes, and accessible workflows as product requirements—not afterthoughts." features={[
    { title: "Organization isolation", description: "Recruiting data is scoped to an organization and protected by membership and role checks at the API boundary." },
    { title: "Session security", description: "Protected shells verify active server sessions and remove private navigation immediately after logout, expiry, or revocation." },
    { title: "Candidate consent", description: "Developers control discovery, contact, application evidence, and referrals. Consent can be withdrawn or revoked." },
    { title: "Explainability and bias controls", description: "Matching exposes supporting evidence and unmet requirements while excluding protected characteristics from the matching inputs." },
    { title: "Auditable decisions", description: "Important organization, job, application, and reputation changes produce durable events or append-only ledger entries." },
    { title: "Accessible interaction", description: "Keyboard operation, visible focus, reduced motion, responsive layouts, and semantic dialogs are part of the shared UI foundation." },
  ]} />;
}
