"use client";

import React, { useMemo } from "react";
import { Heart, TrendUp, ShieldCheck, Medal } from "phosphor-react";
import { Card } from "../ui";
import { PoWProfile, Proof } from "../../lib/api";

interface ReputationEntry {
  type: "endorsement" | "skill" | "proof" | "badge";
  label: string;
  points: number;
  date: string;
}

interface ReputationTimelineProps {
  username: string;
  profile: PoWProfile | null;
  proofs: Proof[];
}

export const ReputationTimeline: React.FC<ReputationTimelineProps> = ({
  username,
  profile,
  proofs,
}) => {
  const entries: ReputationEntry[] = useMemo(() => {
    const result: ReputationEntry[] = [];

    // Endorsement entries from localStorage
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`powr_endorsements_${username}`);
        if (stored) {
          const endorsements: any[] = JSON.parse(stored);
          endorsements.forEach((e) => {
            result.push({
              type: "endorsement",
              label: `Endorsed by @${e.endorserUsername}`,
              points: e.pointsGiven,
              date: e.timestamp,
            });
          });
        }
      } catch {}
    }

    // Skill entries from profile
    if (profile) {
      profile.skills.forEach((skill) => {
        result.push({
          type: "skill",
          label: `${skill.skill} skill score`,
          points: Math.round(skill.score * 10),
          date: new Date().toISOString(),
        });
      });
    }

    // Proof entries
    proofs.forEach((proof, idx) => {
      result.push({
        type: "proof",
        label: `On-chain proof #${idx + 1} published`,
        points: 10,
        date: new Date(proof.timestamp * 1000).toISOString(),
      });
    });

    return result.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [username, profile, proofs]);

  if (entries.length === 0) return null;

  const icons = {
    endorsement: Heart,
    skill: TrendUp,
    proof: ShieldCheck,
    badge: Medal,
  };

  const iconColors = {
    endorsement: "text-[#FF5500]",
    skill: "text-emerald-400",
    proof: "text-violet-400",
    badge: "text-amber-400",
  };

  return (
    <Card className="p-5 rounded-[16px] mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendUp className="w-4 h-4 text-emerald-400" weight="fill" />
        <h2 className="text-sm font-medium text-emerald-400">
          Reputation Timeline
        </h2>
      </div>
      <div className="space-y-3">
        {entries.slice(0, 8).map((entry, idx) => {
          const Icon = icons[entry.type];
          const color = iconColors[entry.type];
          return (
            <div key={idx} className="flex items-center gap-3">
              <div
                className={`w-7 h-7 rounded-full bg-[rgba(255,255,255,0.04)] flex items-center justify-center flex-shrink-0 ${color}`}
              >
                <Icon className="w-3.5 h-3.5" weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-300 truncate">{entry.label}</p>
                <p className="text-[10px] text-gray-500">
                  {new Date(entry.date).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs font-medium text-emerald-400 flex-shrink-0">
                +{entry.points} PoWR
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
