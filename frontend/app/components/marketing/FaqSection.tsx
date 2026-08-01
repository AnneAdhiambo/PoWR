"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp } from "phosphor-react";
import { useState } from "react";

const faqs = [
  ["How does PoWR evaluate technical work?", "PoWR analyzes verifiable work artifacts across skill depth, contribution ownership, delivery patterns, and recency. The sources behind each finding remain visible."],
  ["What information does PoWR access?", "PoWR starts with public or explicitly shared technical evidence. Private work is never treated as available without the candidate’s permission."],
  ["Can candidates control what companies see?", "Yes. Discovery, recruiter contact, application evidence, and referrals are consent-aware. Candidates can withdraw an application or revoke shared evidence."],
  ["Does PoWR replace technical interviews?", "No. PoWR helps interviewers begin with context. People remain responsible for questioning, judgment, culture assessment, and the final hiring decision."],
  ["How does PoWR reduce bias?", "Matching is centered on role requirements and demonstrated work. Protected characteristics are excluded, and teams can inspect or challenge every recommendation."],
  ["Can PoWR work with our existing ATS?", "PoWR currently provides its own recruiting workspace. Additional ATS connections will be identified clearly as they become available."],
  ["How are findings and scores explained?", "Every summary can lead back to its supporting repositories, commits, pull requests, releases, and role requirements."],
  ["What happens when evidence is incomplete?", "PoWR marks gaps instead of inventing certainty. Recruiters can request more context or use the gap to plan a focused interview question."],
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  return (
    <section className="bg-[#f5f1e8] px-5 py-20 text-[#15171a] sm:px-8 lg:py-28">
      <div className="mx-auto max-w-[1200px]">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#d94d08]">Questions worth asking</p>
        <h2 className="mt-4 max-w-4xl text-4xl font-extrabold tracking-[-0.045em] sm:text-[58px] sm:leading-[1.03]">Questions teams ask before using PoWR</h2>
        <div className="mt-12 border-t border-black/25">
          {faqs.map(([question, answer], index) => {
            const open = openIndex === index;
            return (
              <div key={question} className="border-b border-black/25">
                <button type="button" aria-expanded={open} aria-controls={`faq-answer-${index}`} onClick={() => setOpenIndex(open ? -1 : index)} className="flex min-h-[92px] w-full items-center justify-between gap-8 py-5 text-left text-xl font-extrabold tracking-[-0.02em] transition-colors duration-300 hover:text-[#d94d08] sm:text-[26px]">
                  <span>{question}</span>
                  <span className="shrink-0 text-[#125f55]" aria-hidden="true">{open ? <ArrowUp size={27} weight="regular" /> : <ArrowDown size={27} weight="regular" />}</span>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div id={`faq-answer-${index}`} initial={reduceMotion ? false : { height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.32, ease: "easeOut" }} className="overflow-hidden">
                      <p className="max-w-5xl pb-9 pr-12 text-[17px] leading-8 text-[#4f5662]">{answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
