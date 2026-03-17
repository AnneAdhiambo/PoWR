"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  GithubLogo,
  ChartBar,
  Link as LinkIcon,
  ShieldCheck,
  Medal,
  UserCircle,
  Lock,
  MagnifyingGlass,
  ChartLineUp,
  ChatCircle,
  ArrowRight,
} from "phosphor-react";
import LiquidEther from "./components/ui/LiquidEther";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE, delay },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: (delay = 0) => ({
    opacity: 1,
    transition: { duration: 0.5, delay },
  }),
};

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0B0D] text-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Animated background — hero only */}
        <div className="absolute inset-0 z-0">
          <LiquidEther
            colors={["#FF5500", "#FF8C42", "#FFB347"]}
            mouseForce={20}
            cursorSize={100}
            isViscous={false}
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.5}
            isBounce={false}
            autoDemo={true}
            autoSpeed={0.5}
            autoIntensity={2.2}
            takeoverDuration={0.25}
            autoResumeDelay={3000}
            autoRampDuration={0.6}
            style={{ width: "100%", height: "100%" }}
          />
          <div className="absolute inset-0 bg-[#0A0B0D]/50" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0}
            className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-tight"
          >
            Your Code Speaks.
            <br />
            <span className="bg-gradient-to-r from-[#FF5500] via-[#FF8C42] to-white bg-clip-text text-transparent">
              Now It&apos;s On-Chain.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.15}
            className="text-lg sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            PoWR turns your GitHub history into a verifiable, tamper-proof
            reputation score — backed by real artifacts, anchored on Stacks.
          </motion.p>

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={0.3}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/auth"
              className="px-8 py-4 rounded-xl bg-[#FF5500] hover:bg-[#e04d00] text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-[#FF5500]/30 hover:shadow-[#FF5500]/50"
            >
              Verify My Skills
            </Link>
            <Link
              href="/recruiter/auth"
              className="px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold text-lg transition-all duration-200"
            >
              Hire Verified Devs
            </Link>
          </motion.div>

          <motion.p
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            custom={0.5}
            className="mt-8 text-sm text-gray-500"
          >
            Join developers building transparent, blockchain-verified reputations
          </motion.p>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0A0B0D]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Three steps from GitHub to on-chain proof.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <GithubLogo size={32} weight="fill" />,
                step: "01",
                title: "Connect GitHub",
                desc: "Link your account. We read your repos, commits, and PRs — nothing else.",
              },
              {
                icon: <ChartBar size={32} weight="fill" />,
                step: "02",
                title: "Get Your PoW Score",
                desc: "AI analysis scores you across Backend, Frontend, DevOps, and Systems dimensions.",
              },
              {
                icon: <LinkIcon size={32} weight="fill" />,
                step: "03",
                title: "Anchor On-Chain",
                desc: "Your score is hashed and anchored on Stacks. Permanent, verifiable, yours.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative p-8 rounded-2xl border border-white/8 bg-white/3 hover:border-[#FF5500]/40 transition-colors"
              >
                <div className="text-[#FF5500] mb-4">{item.icon}</div>
                <div className="text-xs font-mono text-gray-600 mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────── */}
      <section className="py-12 px-6 border-y border-white/5 bg-white/2">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "10,000+", label: "Developer Profiles" },
            { value: "Stacks", label: "Blockchain Anchored" },
            { value: "4", label: "Skill Dimensions Scored" },
            { value: "Free", label: "to Start" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-[#FF5500] mb-1">{stat.value}</div>
              <div className="text-sm text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── For Developers ───────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0A0B0D]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="text-xs font-mono text-[#FF5500] uppercase tracking-widest mb-3">
              For Developers
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Your Work, Verified.
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl">
              Stop letting recruiters guess at your skills from a bullet-point resume.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: <ShieldCheck size={24} weight="fill" />,
                title: "Verified Reputation",
                desc: "Skill scores backed by real commit history, not self-reported resumes.",
              },
              {
                icon: <Medal size={24} weight="fill" />,
                title: "Soulbound Badges",
                desc: "Earn Bronze/Silver/Gold NFT badges per skill tier. Non-transferable, non-fakeable.",
              },
              {
                icon: <UserCircle size={24} weight="fill" />,
                title: "Public Profile",
                desc: "Share /u/yourname with recruiters. Your work, verified and shareable.",
              },
              {
                icon: <Lock size={24} weight="fill" />,
                title: "Privacy First",
                desc: "We only read public repos. No write access, ever.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex gap-4 p-6 rounded-xl border border-white/8 bg-white/3 hover:border-[#FF5500]/30 transition-colors"
              >
                <div className="text-[#FF5500] mt-0.5 shrink-0">{item.icon}</div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] text-white font-medium transition-colors"
            >
              Get Your Score — Free <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── For Recruiters ───────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#0D0F14]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-12 text-right"
          >
            <div className="text-xs font-mono text-[#FF9FFC] uppercase tracking-widest mb-3">
              For Recruiters
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Hire Without the Guesswork.
            </h2>
            <p className="text-gray-400 text-lg ml-auto max-w-2xl">
              Every profile on PoWR is backed by on-chain proof of actual work output.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6">
            {[
              {
                icon: <ShieldCheck size={24} weight="fill" className="text-[#FF9FFC]" />,
                title: "No More Resume Inflation",
                desc: "Every profile is backed by on-chain proof of actual work output.",
              },
              {
                icon: <ChartLineUp size={24} weight="fill" className="text-[#FF9FFC]" />,
                title: "Skill Signal, Not Keywords",
                desc: "Filter by real PoW scores, not buzzwords on a resume.",
              },
              {
                icon: <MagnifyingGlass size={24} weight="fill" className="text-[#FF9FFC]" />,
                title: "Talent Discovery",
                desc: "Search by skill dimension, score range, and activity recency.",
              },
              {
                icon: <ChatCircle size={24} weight="fill" className="text-[#FF9FFC]" />,
                title: "Direct Outreach",
                desc: "Message verified developers directly through the platform.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.08 }}
                className="flex gap-4 p-6 rounded-xl border border-white/8 bg-white/3 hover:border-[#FF9FFC]/20 transition-colors"
              >
                <div className="mt-0.5 shrink-0">{item.icon}</div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 text-right"
          >
            <Link
              href="/recruiter/auth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-[#FF9FFC]/30 hover:border-[#FF9FFC]/60 bg-[#FF9FFC]/5 hover:bg-[#FF9FFC]/10 text-[#FF9FFC] font-medium transition-colors"
            >
              Browse Verified Talent <ArrowRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────── */}
      <section className="py-28 px-6 bg-[#0A0B0D]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl sm:text-5xl font-bold mb-6"
          >
            Stop Guessing.{" "}
            <span className="bg-gradient-to-r from-[#FF5500] to-[#B19EEF] bg-clip-text text-transparent">
              Start Verifying.
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-gray-400 text-lg mb-10"
          >
            Whether you&apos;re building your rep or hiring talent — PoWR gives you the receipts.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              href="/auth"
              className="px-8 py-4 rounded-xl bg-[#FF5500] hover:bg-[#e04d00] text-white font-semibold text-lg transition-all duration-200 shadow-lg shadow-[#FF5500]/30"
            >
              Get Your Score — Free
            </Link>
            <Link
              href="/recruiter/auth"
              className="px-8 py-4 rounded-xl border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-white font-semibold text-lg transition-all duration-200"
            >
              Browse Verified Talent
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="py-12 px-6 border-t border-white/5 bg-[#0A0B0D]">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="text-lg font-bold mb-1">
              Po<span className="text-[#FF5500]">WR</span>
            </div>
            <div className="text-xs text-gray-600">Powered by Stacks · Bitcoin-secured</div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <Link href="/auth" className="hover:text-white transition-colors">
              Public Profile
            </Link>
            <Link href="/recruiter/auth" className="hover:text-white transition-colors">
              For Recruiters
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <GithubLogo size={14} /> GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
