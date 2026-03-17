"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Star, EnvelopeSimple, VideoCamera, CheckCircle, XCircle,
  PaperPlaneTilt, Note, Plus, X, ArrowRight, DotsThree,
  ShieldCheck, Clock, Tag, Trash, CaretRight,
} from "phosphor-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "shortlisted" | "contacted" | "reviewing" | "interview" | "offer" | "hired" | "rejected";

interface CandidateNote {
  id: string;
  text: string;
  createdAt: string;
}

interface Candidate {
  id: string;
  username: string;
  role: string;
  powScore: number;
  skills: string[];
  hasOnChainProof: boolean;
  stage: Stage;
  addedAt: string;
  notes: CandidateNote[];
  starred: boolean;
  jobTitle?: string;
}

// ─── Pipeline config ──────────────────────────────────────────────────────────

const STAGES: { key: Stage; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { key: "shortlisted", label: "Shortlisted",  color: "text-[#a78bfa]", bg: "bg-[rgba(167,139,250,0.1)]",  icon: <Star  weight="fill" /> },
  { key: "contacted",   label: "Contacted",    color: "text-[#60a5fa]", bg: "bg-[rgba(96,165,250,0.1)]",   icon: <EnvelopeSimple weight="fill" /> },
  { key: "reviewing",   label: "Reviewing",    color: "text-[#fb923c]", bg: "bg-[rgba(251,146,60,0.1)]",   icon: <Note weight="fill" /> },
  { key: "interview",   label: "Interview",    color: "text-[#34d399]", bg: "bg-[rgba(52,211,153,0.1)]",   icon: <VideoCamera weight="fill" /> },
  { key: "offer",       label: "Offer Sent",   color: "text-[#f472b6]", bg: "bg-[rgba(244,114,182,0.1)]",  icon: <PaperPlaneTilt weight="fill" /> },
  { key: "hired",       label: "Hired",        color: "text-[#4ade80]", bg: "bg-[rgba(74,222,128,0.1)]",   icon: <CheckCircle weight="fill" /> },
];

const STAGE_NEXT: Partial<Record<Stage, Stage>> = {
  shortlisted: "contacted",
  contacted:   "reviewing",
  reviewing:   "interview",
  interview:   "offer",
  offer:       "hired",
};

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED: Candidate[] = [
  {
    id: "1", username: "sudoevans", role: "Backend Engineer", powScore: 82,
    skills: ["TypeScript", "Rust", "Node.js"], hasOnChainProof: true,
    stage: "shortlisted", addedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: [{ id: "n1", text: "Strong Rust background. OSS contributor to Stacks ecosystem.", createdAt: new Date(Date.now() - 86400000).toISOString() }],
    starred: true, jobTitle: "Senior Backend Engineer",
  },
  {
    id: "2", username: "anneadhiambo", role: "Frontend Engineer", powScore: 74,
    skills: ["React", "TypeScript", "Next.js"], hasOnChainProof: true,
    stage: "contacted", addedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    notes: [], starred: false, jobTitle: "Frontend Engineer",
  },
  {
    id: "3", username: "devmike", role: "Blockchain Engineer", powScore: 91,
    skills: ["Solidity", "Rust", "Python"], hasOnChainProof: true,
    stage: "interview", addedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    notes: [
      { id: "n2", text: "Top PoW score. Needs relocation discussion.", createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
      { id: "n3", text: "Interview scheduled for Friday.", createdAt: new Date(Date.now() - 86400000).toISOString() },
    ],
    starred: true, jobTitle: "Blockchain Engineer",
  },
  {
    id: "4", username: "saracode", role: "DevOps Engineer", powScore: 66,
    skills: ["Docker", "Go", "Kubernetes"], hasOnChainProof: false,
    stage: "reviewing", addedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    notes: [], starred: false, jobTitle: "DevOps Engineer",
  },
  {
    id: "5", username: "alexdev", role: "Full Stack Engineer", powScore: 58,
    skills: ["JavaScript", "React", "Node.js"], hasOnChainProof: false,
    stage: "offer", addedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    notes: [{ id: "n4", text: "Offer sent at $120k. Awaiting response.", createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }],
    starred: false, jobTitle: "Full Stack Engineer",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60)   return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function stageConfig(key: Stage) {
  return STAGES.find(s => s.key === key) ?? STAGES[0];
}

// ─── Candidate card ───────────────────────────────────────────────────────────

function CandidateCard({
  candidate, onClick, onMove, onStar, onReject,
}: {
  candidate: Candidate;
  onClick: () => void;
  onMove: () => void;
  onStar: () => void;
  onReject: () => void;
}) {
  const next = STAGE_NEXT[candidate.stage];
  const cfg  = stageConfig(candidate.stage);

  return (
    <div
      onClick={onClick}
      className="group bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-4 cursor-pointer hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.05)] transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <img
          src={`https://github.com/${candidate.username}.png?size=40`}
          alt={candidate.username}
          className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${candidate.username}&background=1c1e26&color=fff&size=40`; }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-white truncate">@{candidate.username}</p>
            {candidate.hasOnChainProof && (
              <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e] flex-shrink-0" weight="fill" />
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{candidate.role}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="text-right">
            <p className="text-base font-bold text-white leading-none">{candidate.powScore}</p>
            <p className="text-[9px] text-gray-600 uppercase tracking-wide mt-0.5">PoW</p>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="flex flex-wrap gap-1 mb-3">
        {candidate.skills.slice(0, 3).map(s => (
          <span key={s} className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]">
            {s}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(255,255,255,0.05)]">
        <div className="flex items-center gap-1 text-[11px] text-gray-600">
          <Clock className="w-3 h-3" weight="regular" />
          {timeAgo(candidate.addedAt)}
          {candidate.notes.length > 0 && (
            <span className="ml-2 flex items-center gap-0.5">
              <Note className="w-3 h-3" weight="regular" />
              {candidate.notes.length}
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button
            onClick={onStar}
            className={`p-1 rounded transition-colors ${candidate.starred ? "text-[#fbbf24]" : "text-gray-600 hover:text-[#fbbf24]"}`}
            title="Star"
          >
            <Star className="w-3.5 h-3.5" weight={candidate.starred ? "fill" : "regular"} />
          </button>
          {next && (
            <button
              onClick={onMove}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium text-[#FF5500] bg-[rgba(255,85,0,0.1)] hover:bg-[rgba(255,85,0,0.2)] transition-colors"
              title={`Move to ${stageConfig(next).label}`}
            >
              <ArrowRight className="w-3 h-3" weight="bold" />
              {stageConfig(next).label}
            </button>
          )}
          <button
            onClick={onReject}
            className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors"
            title="Reject"
          >
            <XCircle className="w-3.5 h-3.5" weight="regular" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function CandidateDrawer({
  candidate, onClose, onStageChange, onAddNote, onDeleteNote, onStar,
}: {
  candidate: Candidate;
  onClose: () => void;
  onStageChange: (stage: Stage) => void;
  onAddNote: (text: string) => void;
  onDeleteNote: (id: string) => void;
  onStar: () => void;
}) {
  const [noteText, setNoteText] = useState("");

  const submit = () => {
    if (!noteText.trim()) return;
    onAddNote(noteText.trim());
    setNoteText("");
  };

  const cfg = stageConfig(candidate.stage);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Panel */}
      <div
        className="relative w-[420px] h-full bg-[#0f1117] border-l border-[rgba(255,255,255,0.07)] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-4 p-6 border-b border-[rgba(255,255,255,0.06)]">
          <img
            src={`https://github.com/${candidate.username}.png?size=56`}
            alt={candidate.username}
            className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.05)] flex-shrink-0"
            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${candidate.username}&background=1c1e26&color=fff&size=56`; }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">@{candidate.username}</h2>
              {candidate.hasOnChainProof && (
                <ShieldCheck className="w-4 h-4 text-[#22c55e]" weight="fill" />
              )}
              <button onClick={onStar} className={`ml-auto ${candidate.starred ? "text-[#fbbf24]" : "text-gray-600 hover:text-[#fbbf24]"} transition-colors`}>
                <Star className="w-4 h-4" weight={candidate.starred ? "fill" : "regular"} />
              </button>
              <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mt-0.5">{candidate.role}</p>
            {candidate.jobTitle && (
              <div className="flex items-center gap-1 mt-1">
                <Tag className="w-3 h-3 text-gray-600" weight="regular" />
                <span className="text-xs text-gray-500">{candidate.jobTitle}</span>
              </div>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{candidate.powScore}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">PoW Score</p>
            </div>
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{candidate.notes.length}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">Notes</p>
            </div>
            <div className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 text-center">
              <p className="text-xs font-semibold text-white mt-1">{timeAgo(candidate.addedAt)}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wide">Added</p>
            </div>
          </div>

          {/* Skills */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-2">Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {candidate.skills.map(s => (
                <span key={s} className="text-xs text-gray-300 px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]">
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Stage pipeline */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Pipeline Stage</p>
            <div className="flex flex-col gap-1.5">
              {STAGES.map((s, i) => {
                const isCurrent = s.key === candidate.stage;
                const isPast = STAGES.findIndex(x => x.key === candidate.stage) > i;
                return (
                  <button
                    key={s.key}
                    onClick={() => onStageChange(s.key)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isCurrent
                        ? `${s.bg} border border-[rgba(255,255,255,0.1)] ${s.color} font-semibold`
                        : isPast
                        ? "text-gray-600 hover:text-gray-300 hover:bg-[rgba(255,255,255,0.03)]"
                        : "text-gray-400 hover:text-white hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <span className={`w-4 h-4 flex-shrink-0 ${isCurrent ? s.color : isPast ? "text-gray-700" : "text-gray-600"}`}>
                      {isCurrent ? s.icon : isPast ? <CheckCircle weight="fill" /> : <CaretRight weight="regular" />}
                    </span>
                    {s.label}
                    {isCurrent && <span className="ml-auto text-[10px] opacity-60">current</span>}
                  </button>
                );
              })}

              {/* Reject */}
              <button
                onClick={() => onStageChange("rejected")}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  candidate.stage === "rejected"
                    ? "bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-red-400 font-semibold"
                    : "text-gray-600 hover:text-red-400 hover:bg-[rgba(239,68,68,0.05)]"
                }`}
              >
                <XCircle className="w-4 h-4 flex-shrink-0" weight={candidate.stage === "rejected" ? "fill" : "regular"} />
                Rejected
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Notes</p>

            {candidate.notes.length === 0 && (
              <p className="text-sm text-gray-600 italic">No notes yet.</p>
            )}

            <div className="space-y-2.5">
              {candidate.notes.map(note => (
                <div
                  key={note.id}
                  className="group bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg p-3"
                >
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm text-gray-300 leading-relaxed">{note.text}</p>
                    <button
                      onClick={() => onDeleteNote(note.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
                    >
                      <Trash className="w-3.5 h-3.5" weight="regular" />
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1.5">{timeAgo(note.createdAt)}</p>
                </div>
              ))}
            </div>

            {/* Add note */}
            <div className="mt-3">
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(); }}
                placeholder="Add a note… (⌘Enter to save)"
                rows={3}
                className="w-full px-3 py-2.5 bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[rgba(255,85,0,0.4)] resize-none transition-colors"
              />
              <button
                onClick={submit}
                disabled={!noteText.trim()}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[rgba(255,85,0,0.15)] text-[#FF5500] hover:bg-[rgba(255,85,0,0.25)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors border border-[#FF5500]/25"
              >
                <Plus className="w-3.5 h-3.5" weight="bold" />
                Save Note
              </button>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-[rgba(255,255,255,0.06)] flex gap-2">
          <a
            href={`/recruiter/developer/${candidate.username}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-white bg-[#FF5500] hover:bg-[#e04d00] transition-colors"
          >
            View Full Profile
          </a>
          <button
            onClick={() => onStageChange("rejected")}
            className="px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-red-400 bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(239,68,68,0.08)] border border-[rgba(255,255,255,0.06)] transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RecruiterCandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>(SEED);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [filterStage, setFilterStage] = useState<Stage | "all" | "starred">("all");

  useEffect(() => {
    if (!localStorage.getItem("recruiter_token")) router.replace("/recruiter/auth");
  }, [router]);

  // Keep drawer in sync with mutations
  useEffect(() => {
    if (selected) {
      const updated = candidates.find(c => c.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [candidates]);

  const mutate = useCallback((id: string, fn: (c: Candidate) => Candidate) => {
    setCandidates(prev => prev.map(c => c.id === id ? fn(c) : c));
  }, []);

  const moveStage  = (id: string, stage: Stage) => mutate(id, c => ({ ...c, stage }));
  const toggleStar = (id: string) => mutate(id, c => ({ ...c, starred: !c.starred }));
  const addNote    = (id: string, text: string) =>
    mutate(id, c => ({
      ...c,
      notes: [...c.notes, { id: Date.now().toString(), text, createdAt: new Date().toISOString() }],
    }));
  const deleteNote = (id: string, noteId: string) =>
    mutate(id, c => ({ ...c, notes: c.notes.filter(n => n.id !== noteId) }));
  const reject     = (id: string) => moveStage(id, "rejected");

  const active = candidates.filter(c => c.stage !== "rejected");
  const rejected = candidates.filter(c => c.stage === "rejected");

  const visible = candidates.filter(c => {
    if (filterStage === "starred") return c.starred && c.stage !== "rejected";
    if (filterStage === "all") return c.stage !== "rejected";
    return c.stage === filterStage;
  });

  // Stats
  const stats = STAGES.map(s => ({
    ...s,
    count: candidates.filter(c => c.stage === s.key).length,
  }));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <div className="flex-shrink-0 px-8 pt-8 pb-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Candidates</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {active.length} active · {rejected.length} rejected
            </p>
          </div>
        </div>

        {/* Pipeline stats strip */}
        <div className="flex items-stretch gap-2 mb-6 overflow-x-auto pb-1">
          {/* All */}
          <button
            onClick={() => setFilterStage("all")}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              filterStage === "all"
                ? "bg-[rgba(255,255,255,0.08)] border-[rgba(255,255,255,0.15)] text-white"
                : "bg-transparent border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white hover:border-[rgba(255,255,255,0.1)]"
            }`}
          >
            <Users className="w-3.5 h-3.5" weight="regular" />
            All
            <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[10px]">{active.length}</span>
          </button>

          {/* Starred */}
          <button
            onClick={() => setFilterStage("starred")}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
              filterStage === "starred"
                ? "bg-[rgba(251,191,36,0.12)] border-[rgba(251,191,36,0.3)] text-[#fbbf24]"
                : "bg-transparent border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-[#fbbf24] hover:border-[rgba(251,191,36,0.2)]"
            }`}
          >
            <Star className="w-3.5 h-3.5" weight={filterStage === "starred" ? "fill" : "regular"} />
            Starred
            <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[10px]">
              {candidates.filter(c => c.starred && c.stage !== "rejected").length}
            </span>
          </button>

          <div className="w-px bg-[rgba(255,255,255,0.06)] mx-1 flex-shrink-0" />

          {stats.map(s => (
            <button
              key={s.key}
              onClick={() => setFilterStage(s.key)}
              className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                filterStage === s.key
                  ? `${s.bg} border-[rgba(255,255,255,0.1)] ${s.color}`
                  : "bg-transparent border-[rgba(255,255,255,0.06)] text-gray-500 hover:text-white hover:border-[rgba(255,255,255,0.1)]"
              }`}
            >
              <span className={`w-3.5 h-3.5 ${filterStage === s.key ? s.color : ""}`}>{s.icon}</span>
              {s.label}
              {s.count > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.08)] text-[10px]">{s.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto px-8 pb-8">
        {filterStage === "all" || filterStage === "starred" ? (
          // Kanban view
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map(s => {
              const colCandidates = visible.filter(c => c.stage === s.key);
              return (
                <div key={s.key} className="w-[260px] flex-shrink-0 flex flex-col gap-3">
                  {/* Column header */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${s.bg}`}>
                    <span className={`w-4 h-4 ${s.color}`}>{s.icon}</span>
                    <span className={`text-xs font-semibold ${s.color}`}>{s.label}</span>
                    <span className="ml-auto text-xs text-gray-600 font-medium">{colCandidates.length}</span>
                  </div>
                  {/* Cards */}
                  <div className="flex flex-col gap-2 overflow-y-auto flex-1">
                    {colCandidates.map(c => (
                      <CandidateCard
                        key={c.id}
                        candidate={c}
                        onClick={() => setSelected(c)}
                        onMove={() => STAGE_NEXT[c.stage] && moveStage(c.id, STAGE_NEXT[c.stage]!)}
                        onStar={() => toggleStar(c.id)}
                        onReject={() => reject(c.id)}
                      />
                    ))}
                    {colCandidates.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-[rgba(255,255,255,0.05)] rounded-xl">
                        <p className="text-xs text-gray-700">Empty</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Filtered list view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
            {visible.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-center">
                <Users className="w-12 h-12 text-gray-800 mb-3" weight="regular" />
                <p className="text-gray-500 text-sm">No candidates in this stage</p>
              </div>
            ) : (
              visible.map(c => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  onClick={() => setSelected(c)}
                  onMove={() => STAGE_NEXT[c.stage] && moveStage(c.id, STAGE_NEXT[c.stage]!)}
                  onStar={() => toggleStar(c.id)}
                  onReject={() => reject(c.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <CandidateDrawer
          candidate={selected}
          onClose={() => setSelected(null)}
          onStageChange={stage => moveStage(selected.id, stage)}
          onAddNote={text => addNote(selected.id, text)}
          onDeleteNote={noteId => deleteNote(selected.id, noteId)}
          onStar={() => toggleStar(selected.id)}
        />
      )}
    </div>
  );
}
