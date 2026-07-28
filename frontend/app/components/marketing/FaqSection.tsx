const faqs = [
  ["Does PoWR replace recruiters or hiring managers?", "No. PoWR organizes evidence-heavy recruiting work and makes technical signals easier to inspect. People remain responsible for context, interviews, judgment, and final decisions."],
  ["How is the PoWR score calculated?", "PoWR analyzes verifiable work artifacts across skill dimensions, delivery patterns, contribution depth, and recency. The evidence behind the score remains visible and role-fit matching is kept separate."],
  ["Does PoWR use protected characteristics for matching?", "No. Matching is designed around job requirements, opted-in skills, verified evidence, preferences, and relevant activity—not protected characteristics."],
  ["Can developers control what companies see?", "Yes. Discovery, recruiter contact, applications, evidence sharing, and referrals are consent-aware. A developer can withdraw an application or revoke shared evidence."],
  ["What does public versus private job visibility mean?", "Public roles appear on the organization career site. Private roles are limited to invited or eligible developers and should never become discoverable through public endpoints."],
  ["Is referral reputation part of technical PoWR scoring?", "No. Referral reliability is a separate, bounded signal with consent, evidence thresholds, appeals, and abuse controls. A normal rejection never creates a penalty."],
];

export function FaqSection() {
  return <section className="px-5 py-20 sm:px-8 lg:py-28"><div className="mx-auto max-w-5xl"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-400">Questions worth asking</p><h2 className="mt-4 text-3xl font-semibold text-white sm:text-5xl">How it works, privacy, and fairness.</h2><div className="mt-10 border-t border-white/10">{faqs.map(([question, answer], index) => <details key={question} className="group border-b border-white/10 py-5" open={index === 0}><summary className="cursor-pointer list-none pr-10 text-lg font-semibold text-white marker:hidden">{question}<span className="float-right text-orange-400 group-open:rotate-45">+</span></summary><p className="max-w-4xl pt-4 text-sm leading-7 text-gray-400">{answer}</p></details>)}</div></div></section>;
}
