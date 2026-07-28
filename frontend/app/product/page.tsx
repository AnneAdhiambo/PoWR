import type { Metadata } from "next";
import { ContentPage } from "../components/marketing/ContentPage";

export const metadata: Metadata = { title: "Recruiting product | PoWR", description: "Attract candidates, organize applications, coordinate decisions, and hire using verified work evidence." };

export default function ProductPage() {
  return <ContentPage eyebrow="Recruiting product" title="Run the hiring workflow. Understand the work behind every candidate." description="PoWR gives companies a branded career site, collaborative hiring pipeline, evidence-aware sourcing, structured evaluation, and a clean handoff from successful candidate to employee." features={[
    { title: "Branded jobs and career pages", description: "Give every organization a focused place to tell its story, publish public roles, and collect structured applications." },
    { title: "One authoritative candidate pipeline", description: "Track applications, stage changes, notes, scorecards, interviews, offers, and hiring decisions without duplicate mock workflows." },
    { title: "Evidence-aware sourcing", description: "Find opted-in developers by role requirements, skills, verified delivery, preferences, recency, and PoWR evidence." },
    { title: "Explainable matching", description: "Show why a candidate matched, which requirements are supported, and what remains unproven—separate from the global PoWR score." },
    { title: "Hiring-team collaboration", description: "Give owners, recruiters, hiring managers, and interviewers the right workspace and role-aware actions." },
    { title: "Employee handoff", description: "Convert a successful candidate into an employee record with onboarding context, ownership, and decision history intact." },
  ]} />;
}
