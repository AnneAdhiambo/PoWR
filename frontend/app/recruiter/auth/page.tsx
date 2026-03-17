"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { recruiterApiClient } from "../../lib/recruiterApi";
import toast from "react-hot-toast";
import { Buildings, EnvelopeSimple, Lock, Eye, EyeSlash, CaretDown, Check } from "phosphor-react";

export default function RecruiterAuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [sizeOpen, setSizeOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const SIZE_OPTIONS = [
    "1–10 employees",
    "11–50 employees",
    "51–200 employees",
    "201–1,000 employees",
    "1,000+ employees",
  ];
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("recruiter_token")) {
      router.replace("/recruiter/search");
    }
  }, [router]);

  const saveRecruiterSession = (token: string, recruiter: any) => {
    localStorage.setItem("recruiter_token", token);
    localStorage.setItem("recruiter_email", recruiter.email || "");
    localStorage.setItem("recruiter_company", recruiter.companyName || "");
    localStorage.setItem("recruiter_plan", recruiter.plan || "free");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "login") {
        const { token, recruiter } = await recruiterApiClient.login(email, password);
        saveRecruiterSession(token, recruiter);
        toast.success("Welcome back!");
        router.push("/recruiter/search");
      } else {
        if (!companyName.trim()) {
          toast.error("Company name is required");
          setLoading(false);
          return;
        }
        const { token, recruiter } = await recruiterApiClient.signup(email, password, companyName, companySize || undefined);
        saveRecruiterSession(token, recruiter);
        toast.success("Account created!");
        router.push("/recruiter/search");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-16">
        {/* Orbs — different color balance */}
        <div className="absolute top-[-10%] right-[-15%] w-[65%] h-[65%] rounded-full bg-[#3b76ef]/18 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[#FF9FFC]/12 blur-[120px] animate-pulse" style={{ animationDelay: "2.5s" }} />
        <div className="absolute top-[30%] left-[15%] w-[35%] h-[35%] rounded-full bg-[#B19EEF]/10 blur-[90px] animate-pulse" style={{ animationDelay: "5s" }} />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,1) 1.5px, transparent 1.5px)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div className="absolute top-10 left-10 z-10 flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            Po<span className="text-[#3b76ef]">WR</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#3b76ef]/15 text-[#3b76ef] border border-[#3b76ef]/25 font-semibold uppercase tracking-wide">
            Recruiter
          </span>
        </div>

        {/* Centered copy */}
        <div className="relative z-10 max-w-sm">
          <p className="text-xs font-mono uppercase tracking-[0.2em] text-[#3b76ef] mb-6">
            Talent Intelligence
          </p>
          <h2 className="text-6xl font-black text-white leading-[1.05] tracking-tight mb-8">
            Hire the<br />
            builders,<br />
            <span className="text-[#3b76ef]">not the<br />talkers.</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Every profile is backed by<br />
            on-chain proof of real work —<br />
            not self-reported keywords.
          </p>

          {/* Stats row */}
          <div className="mt-12 grid grid-cols-3 gap-6 border-t border-white/8 pt-8">
            {[
              { value: "10K+", label: "Profiles" },
              { value: "4", label: "Skill dims" },
              { value: "Free", label: "To start" },
            ].map((s) => (
              <div key={s.label}>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <span className="text-3xl font-bold text-white">
              Po<span className="text-[#3b76ef]">WR</span>
            </span>
          </div>

          <p className="text-xs font-mono uppercase tracking-[0.15em] text-gray-600 mb-3">
            Recruiter portal
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">
            {tab === "login" ? "Welcome back" : "Get started"}
          </h1>
          <p className="text-gray-500 text-base mb-8">
            {tab === "login" ? "Sign in to find verified talent" : "Create your recruiter account"}
          </p>

          {/* Tabs */}
          <div className="flex mb-8 bg-white/4 rounded-xl p-1 gap-1">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  tab === t
                    ? "bg-[#3b76ef] text-white shadow-lg shadow-[#3b76ef]/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {t === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Work Email</label>
              <div className="relative">
                <EnvelopeSimple className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/4 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#3b76ef]/60 focus:bg-white/6 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="w-full pl-10 pr-11 py-3 bg-white/4 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#3b76ef]/60 focus:bg-white/6 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {tab === "signup" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Company Name</label>
                  <div className="relative">
                    <Buildings className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      placeholder="Acme Corp"
                      className="w-full pl-10 pr-4 py-3 bg-white/4 border border-white/8 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#3b76ef]/60 focus:bg-white/6 transition-all"
                    />
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                    Company Size <span className="text-gray-700 normal-case font-normal">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setSizeOpen((v) => !v)}
                    className={`w-full flex items-center justify-between px-4 py-3 bg-white/4 border rounded-xl text-sm transition-all focus:outline-none ${
                      sizeOpen ? "border-[#3b76ef]/60" : "border-white/8 hover:border-white/20"
                    } ${companySize ? "text-white" : "text-gray-500"}`}
                  >
                    {companySize || "Select size…"}
                    <CaretDown
                      size={14}
                      weight="bold"
                      className={`text-gray-500 transition-transform duration-200 ${sizeOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {sizeOpen && (
                    <div className="absolute z-50 mt-1.5 w-full bg-[#16181d] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                      {SIZE_OPTIONS.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => { setCompanySize(opt); setSizeOpen(false); }}
                          className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-white/6 transition-colors"
                        >
                          <span className={companySize === opt ? "text-white font-medium" : "text-gray-300"}>
                            {opt}
                          </span>
                          {companySize === opt && <Check size={14} weight="bold" className="text-[#3b76ef]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-xl bg-[#3b76ef] hover:bg-[#3265cc] text-white text-sm font-bold tracking-wide transition-all disabled:opacity-50 shadow-lg shadow-[#3b76ef]/20 hover:shadow-[#3b76ef]/40"
            >
              {loading ? "Please wait…" : tab === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-white/6 text-center">
            <p className="text-sm text-gray-600">
              Are you a developer?{" "}
              <a href="/auth" className="text-[#3b76ef] hover:text-white transition-colors font-medium">
                Sign in here →
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
