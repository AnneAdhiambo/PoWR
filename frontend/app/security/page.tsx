import type { Metadata } from "next";
import { ContentPage } from "../components/marketing/ContentPage";

export const metadata: Metadata = { title: "Security, privacy and fairness | PoWR", description: "How PoWR handles tenant isolation, consent, explainability, and accessibility." };

export default function SecurityPage() {
  return <ContentPage eyebrow="Trust foundation" title="Evidence is useful only when people can trust how it is handled." description="PoWR is being built with organization isolation, revocable sessions, candidate consent, explainable matching, bounded reputation changes, and accessible workflows as product requirements—not afterthoughts." features={[
    {
      title: "Organization isolation",
      description: "Recruiting data is scoped to an organization and protected by membership and role checks at the API boundary.",
      details: [
        "A recruiter should only be able to read or change jobs, applications, notes, scorecards, and employee records belonging to organizations where they hold an active membership. Tenant context is established on the server rather than trusted from browser input.",
        "Public career pages expose only intentionally published information. Internal hiring context, private roles, candidate notes, and organization settings remain behind authenticated organization checks.",
      ],
    },
    {
      title: "Session security",
      description: "Protected shells verify active server sessions and remove private navigation immediately after logout, expiry, or revocation.",
      details: [
        "The interface treats authentication as server-owned state. A remembered browser value is not sufficient to keep a recruiter inside the workspace after the session is no longer valid.",
        "When verification fails, private content is withheld and the user returns to a clear authentication path instead of briefly seeing stale dashboard information.",
      ],
    },
    {
      title: "Candidate consent",
      description: "Developers control discovery, contact, application evidence, and referrals. Consent can be withdrawn or revoked.",
      details: [
        "Public work does not remove the need for respectful processing. PoWR records the context in which evidence is shared and separates a public technical signal from permission to contact or evaluate someone for a specific role.",
        "Candidates can withdraw an application or revoke shared evidence. Those actions must be reflected in recruiter workflows without leaving private copies exposed through unrelated endpoints.",
      ],
    },
    {
      title: "Explainability and bias controls",
      description: "Matching exposes supporting evidence and unmet requirements while excluding protected characteristics from the matching inputs.",
      details: [
        "A PoWR Score is a summary of evidence, not a hiring verdict. Job-specific fit remains separate from global technical reputation, and recruiters can inspect both the supporting work and the gaps in the available evidence.",
        "Teams remain responsible for defining role requirements, challenging recommendations, interviewing candidates, and making the final decision. Automated summaries must never become an unexplained rejection mechanism.",
      ],
    },
    {
      title: "Auditable decisions",
      description: "Important organization, job, application, and reputation changes produce durable events or append-only ledger entries.",
      details: [
        "An audit trail should answer who changed a material record, when the change happened, and which organization context applied. It supports investigation and accountability without exposing unrelated tenant data.",
        "Reputation changes require particular care. Referral and contribution signals remain bounded, explainable, and reviewable rather than becoming silent penalties attached to normal hiring outcomes.",
      ],
    },
    {
      title: "Accessible interaction",
      description: "Keyboard operation, visible focus, reduced motion, responsive layouts, and semantic dialogs are part of the shared UI foundation.",
      details: [
        "Critical workflows should remain understandable without relying on color, hover, or pointer precision. Controls use readable labels, visible focus states, and interaction targets suitable for touch and keyboard use.",
        "Motion communicates state and relationship instead of decoration. Reduced-motion preferences are respected, dialogs restore focus, and responsive layouts preserve the reading order on smaller screens.",
      ],
    },
  ]} />;
}
