import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Developer jobs",
  description: "Find technical roles from organizations hiring through verified work evidence.",
  openGraph: {
    title: "Developer jobs | PoWR",
    description: "Explore technical roles and understand the evidence each hiring team values.",
    type: "website",
  },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
