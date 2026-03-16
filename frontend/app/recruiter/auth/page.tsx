"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { recruiterApiClient } from "../../lib/recruiterApi";
import toast from "react-hot-toast";
import { Buildings, EnvelopeSimple, Lock, Eye, EyeSlash } from "phosphor-react";

export default function RecruiterAuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="PoWR" className="h-9 w-auto" />
            <span className="text-xl font-bold text-white">PoWR</span>
          </div>
          <p className="text-sm text-gray-500">Recruiter Portal</p>
        </div>

        {/* Card */}
        <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-2xl p-7">
          {/* Tabs */}
          <div className="flex mb-6 bg-[rgba(255,255,255,0.04)] rounded-lg p-1">
            {(["login", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors capitalize ${
                  tab === t
                    ? "bg-[rgba(255,255,255,0.08)] text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {t === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Work Email</label>
              <div className="relative">
                <EnvelopeSimple className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full pl-9 pr-4 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(59,118,239,0.5)] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs text-gray-400 mb-1.5 font-medium">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Min 8 characters"
                  className="w-full pl-9 pr-10 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(59,118,239,0.5)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Signup-only fields */}
            {tab === "signup" && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">Company Name</label>
                  <div className="relative">
                    <Buildings className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      placeholder="Acme Corp"
                      className="w-full pl-9 pr-4 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(59,118,239,0.5)] transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">
                    Company Size <span className="text-gray-600">(optional)</span>
                  </label>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-white focus:outline-none focus:border-[rgba(59,118,239,0.5)] transition-colors"
                  >
                    <option value="">Select size...</option>
                    <option value="1-10">1–10 employees</option>
                    <option value="11-50">11–50 employees</option>
                    <option value="51-200">51–200 employees</option>
                    <option value="201-1000">201–1,000 employees</option>
                    <option value="1000+">1,000+ employees</option>
                  </select>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-[#3b76ef] hover:bg-[#3265cc] text-white text-sm font-semibold transition-colors disabled:opacity-50 mt-2"
            >
              {loading
                ? "Please wait..."
                : tab === "login"
                ? "Sign In"
                : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Are you a developer?{" "}
          <a href="/auth" className="text-[#FF5500] hover:underline">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}
