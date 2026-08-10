"use client";
import { FormEvent, useState } from "react";
import { Button, Field, controlClassName } from "../components/ui";

export function DemoForm() {
  const [submitted, setSubmitted] = useState(false);
  function submit(event: FormEvent) { event.preventDefault(); setSubmitted(true); }
  if (submitted) return <div className="rounded-[var(--radius-card)] border border-emerald-500/20 bg-emerald-500/10 p-8"><h2 className="text-xl font-semibold text-white">Thanks—your interest is recorded locally.</h2><p className="mt-3 text-sm leading-6 text-emerald-100/70">Demo-request delivery is not connected yet. For now, contact the PoWR project team directly and include your company and hiring goals.</p></div>;
  return <form onSubmit={submit} className="space-y-5 rounded-[var(--radius-card)] border border-white/10 bg-[var(--bg-card)] p-6 sm:p-8"><Field label="Work email" required><input type="email" required className={controlClassName} placeholder="you@company.com" /></Field><Field label="Company name" required><input required className={controlClassName} placeholder="Your company" /></Field><Field label="Team size"><select className={controlClassName} defaultValue=""><option value="" disabled>Select a range</option><option>1–20</option><option>21–100</option><option>101–500</option><option>500+</option></select></Field><Field label="What should we help improve?"><textarea className={`${controlClassName} min-h-32 resize-y`} placeholder="Sourcing, job publishing, applications, evaluation, hiring handoff..." /></Field><Button type="submit" size="lg" className="w-full">Request a demo</Button><p className="text-xs leading-5 text-gray-600">This local preview does not transmit the form to a server.</p></form>;
}
