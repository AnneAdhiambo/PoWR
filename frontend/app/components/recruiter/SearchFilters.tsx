"use client";
import React, { useState, useRef, useCallback } from "react";
import { MagnifyingGlass, FunnelSimple, CaretDown } from "phosphor-react";

const SKILL_OPTIONS = [
  "React", "TypeScript", "Python", "Rust", "Solidity",
  "JavaScript", "Go", "Node.js", "Docker", "C++",
];

export interface SearchFilterValues {
  skills: string[];
  minScore: number;
  maxScore: number;
  activeWithin: number | undefined;
  hasOnChainProof: boolean;
}

interface SearchFiltersProps {
  onApply: (filters: SearchFilterValues) => void;
  loading?: boolean;
}

// ── Dual-handle range slider ───────────────────────────────────────────────
function DualRangeSlider({
  minVal, maxVal, onChange,
}: {
  minVal: number;
  maxVal: number;
  onChange: (min: number, max: number) => void;
}) {
  const minPercent = minVal;        // 0-100 already
  const maxPercent = maxVal;

  return (
    <div className="relative h-5 flex items-center select-none">
      {/* Base track */}
      <div className="absolute w-full h-[3px] rounded-full bg-[rgba(255,255,255,0.08)]">
        {/* Active fill */}
        <div
          className="absolute h-full bg-[#3b76ef] rounded-full"
          style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }}
        />
      </div>

      {/* Min thumb (visual) */}
      <div
        className="absolute w-[14px] h-[14px] rounded-full bg-[#3b76ef] border-2 border-white shadow-[0_0_0_2px_rgba(59,118,239,0.35)] pointer-events-none z-10 transition-transform"
        style={{ left: `calc(${minPercent}% - 7px)` }}
      />
      {/* Max thumb (visual) */}
      <div
        className="absolute w-[14px] h-[14px] rounded-full bg-[#3b76ef] border-2 border-white shadow-[0_0_0_2px_rgba(59,118,239,0.35)] pointer-events-none z-10 transition-transform"
        style={{ left: `calc(${maxPercent}% - 7px)` }}
      />

      {/* Min input (invisible, interactive) */}
      <input
        type="range" min={0} max={100} value={minVal}
        onChange={e => onChange(Math.min(+e.target.value, maxVal - 1), maxVal)}
        className="absolute w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: minVal > 50 ? 5 : 3 }}
      />
      {/* Max input (invisible, interactive) */}
      <input
        type="range" min={0} max={100} value={maxVal}
        onChange={e => onChange(minVal, Math.max(+e.target.value, minVal + 1))}
        className="absolute w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: 4 }}
      />
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3b76ef] ${
        checked ? "bg-[#3b76ef]" : "bg-[rgba(255,255,255,0.12)]"
      }`}
    >
      <span
        className={`absolute top-[3px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[18px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export const SearchFilters: React.FC<SearchFiltersProps> = ({ onApply, loading }) => {
  const [skillSearch, setSkillSearch] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(["React", "TypeScript", "Python", "Rust", "Solidity"]);
  const [minScore, setMinScore] = useState(0);
  const [maxScore, setMaxScore] = useState(100);
  const [activeWithin, setActiveWithin] = useState<number | undefined>(undefined);
  const [hasOnChainProof, setHasOnChainProof] = useState(false);

  const filteredSkills = SKILL_OPTIONS.filter(s =>
    s.toLowerCase().includes(skillSearch.toLowerCase())
  );

  const toggleSkill = (skill: string) =>
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );

  const handleRangeChange = useCallback((min: number, max: number) => {
    setMinScore(min);
    setMaxScore(max);
  }, []);

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center gap-2 text-gray-400 text-[11px] font-semibold uppercase tracking-widest">
        <FunnelSimple className="w-3.5 h-3.5" weight="bold" />
        Filters
      </div>

      {/* ── Skills ── */}
      <section>
        <p className="text-sm font-semibold text-white mb-2.5">Skills</p>

        {/* Search */}
        <div className="relative mb-3">
          <MagnifyingGlass className="w-3.5 h-3.5 text-gray-600 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={skillSearch}
            onChange={e => setSkillSearch(e.target.value)}
            placeholder="Search skills..."
            className="w-full pl-8 pr-3 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(59,118,239,0.5)] transition-colors"
          />
        </div>

        {/* Skill list */}
        <div className="space-y-1.5">
          {filteredSkills.map(skill => {
            const checked = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className="w-full flex items-center gap-2.5 py-0.5 group"
              >
                {/* Custom checkbox */}
                <div className={`w-[15px] h-[15px] rounded-[4px] flex items-center justify-center flex-shrink-0 border transition-all ${
                  checked
                    ? "bg-[#3b76ef] border-[#3b76ef]"
                    : "bg-transparent border-[rgba(255,255,255,0.18)] group-hover:border-[rgba(59,118,239,0.6)]"
                }`}>
                  {checked && (
                    <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth={3.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm transition-colors ${
                  checked ? "text-white font-medium" : "text-gray-400 group-hover:text-gray-200"
                }`}>
                  {skill}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* ── PoW Score ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">PoW Score</p>
          <span className="text-xs font-medium text-[#3b76ef] tabular-nums">
            {minScore} – {maxScore}
          </span>
        </div>

        <DualRangeSlider
          minVal={minScore}
          maxVal={maxScore}
          onChange={handleRangeChange}
        />

        <div className="flex justify-between mt-2">
          <span className="text-[11px] text-gray-600">0</span>
          <span className="text-[11px] text-gray-600">100</span>
        </div>
      </section>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* ── Activity ── */}
      <section>
        <p className="text-sm font-semibold text-white mb-2.5">Activity</p>
        <div className="relative">
          <select
            value={activeWithin ?? ""}
            onChange={e => setActiveWithin(e.target.value ? +e.target.value : undefined)}
            className="w-full px-3 py-2 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] rounded-lg text-sm text-gray-300 focus:outline-none focus:border-[rgba(59,118,239,0.5)] appearance-none cursor-pointer transition-colors hover:border-[rgba(255,255,255,0.14)] pr-8"
          >
            <option value="" style={{ background: "#12141a" }}>Last Active</option>
            <option value="30" style={{ background: "#12141a" }}>Last 30 days</option>
            <option value="90" style={{ background: "#12141a" }}>Last 90 days</option>
            <option value="365" style={{ background: "#12141a" }}>Last year</option>
          </select>
          <CaretDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </section>

      <div className="h-px bg-[rgba(255,255,255,0.05)]" />

      {/* ── On-chain proof ── */}
      <section className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
          <span className="text-sm text-gray-300">On-chain proof</span>
        </div>
        <Toggle checked={hasOnChainProof} onChange={() => setHasOnChainProof(v => !v)} />
      </section>

      {/* ── Apply ── */}
      <button
        onClick={() => onApply({ skills: selectedSkills, minScore, maxScore, activeWithin, hasOnChainProof })}
        disabled={loading}
        className="w-full py-2.5 rounded-lg bg-[#3b76ef] hover:bg-[#3265cc] active:bg-[#2a55b0] text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Searching…" : "Apply Filters"}
      </button>
    </div>
  );
};
