"use client";

import React, { useState, useEffect } from "react";
import { Heart, UsersThree, CaretDown, CaretUp } from "phosphor-react";
import { Card } from "../ui";

interface Endorsement {
  endorserUsername: string;
  endorserScore: number;
  pointsGiven: number;
  message: string;
  timestamp: string;
}

interface EndorsementSectionProps {
  profileUsername: string;
  viewerUsername: string | null;
  viewerScore: number;
}

function calcPoints(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 3;
  if (score >= 40) return 2;
  return 1;
}

export const EndorsementSection: React.FC<EndorsementSectionProps> = ({
  profileUsername,
  viewerUsername,
  viewerScore,
}) => {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [endorseeCount, setEndorseeCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [hasEndorsed, setHasEndorsed] = useState(false);

  const storageKey = `powr_endorsements_${profileUsername}`;
  const endorsedByKey = viewerUsername
    ? `powr_endorsed_by_${viewerUsername}`
    : null;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setEndorsements(JSON.parse(stored));
    } catch {}

    if (viewerUsername && endorsedByKey) {
      try {
        const endorsed = localStorage.getItem(endorsedByKey);
        const list: string[] = endorsed ? JSON.parse(endorsed) : [];
        setEndorseeCount(list.length);
        setHasEndorsed(list.includes(profileUsername));
      } catch {}
    }
  }, [profileUsername, viewerUsername, storageKey, endorsedByKey]);

  const handleEndorse = () => {
    if (!viewerUsername || !endorsedByKey || hasEndorsed) return;
    const points = calcPoints(viewerScore);
    const newEndorsement: Endorsement = {
      endorserUsername: viewerUsername,
      endorserScore: viewerScore,
      pointsGiven: points,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [newEndorsement, ...endorsements];
    setEndorsements(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    try {
      const endorsed = localStorage.getItem(endorsedByKey);
      const list: string[] = endorsed ? JSON.parse(endorsed) : [];
      if (!list.includes(profileUsername)) {
        list.push(profileUsername);
        localStorage.setItem(endorsedByKey, JSON.stringify(list));
        setEndorseeCount(list.length);
      }
    } catch {}

    setHasEndorsed(true);
    setShowForm(false);
    setMessage("");
  };

  const canEndorse =
    viewerUsername && viewerUsername !== profileUsername && !hasEndorsed;
  const points = calcPoints(viewerScore);

  return (
    <div className="mt-6">
      <Card className="p-5 rounded-[16px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#FF5500]" weight="fill" />
            <h2 className="text-sm font-medium text-[#FF6B2B]">Endorsements</h2>
          </div>
          <div className="flex items-center gap-3">
            {endorseeCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <UsersThree className="w-3.5 h-3.5" weight="regular" />
                Endorsed {endorseeCount} others
              </span>
            )}
            {canEndorse && !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FF5500]/20 text-[#FF6B2B] text-xs font-medium hover:bg-[#FF5500]/30 transition-colors"
              >
                <Heart className="w-3.5 h-3.5" weight="fill" />
                Endorse
              </button>
            )}
            {hasEndorsed && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" weight="fill" />
                Endorsed
              </span>
            )}
          </div>
        </div>

        {/* Endorse Form */}
        {showForm && canEndorse && (
          <div className="mb-4 p-4 rounded-[12px] bg-[rgba(255,85,0,0.05)] border border-[#FF5500]/20">
            <p className="text-xs text-gray-300 mb-1">
              Your endorsement gives{" "}
              <span className="text-[#FF5500] font-medium">
                +{points} PoWR points
              </span>{" "}
              (your score: {viewerScore})
            </p>
            <p className="text-xs text-amber-400/70 mb-3">
              If this developer underdelivers, your reputation may be affected.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a message (optional)..."
              className="w-full px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-white text-xs placeholder-gray-600 focus:outline-none focus:border-[#FF5500] resize-none"
              rows={2}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleEndorse}
                className="px-4 py-1.5 rounded-lg bg-[#FF5500] text-white text-xs font-medium hover:bg-[#e04d00] transition-colors"
              >
                Submit Endorsement
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setMessage("");
                }}
                className="px-4 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-gray-400 text-xs hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Endorsements List */}
        {endorsements.length === 0 ? (
          <div className="text-center py-6">
            <Heart
              className="w-8 h-8 text-gray-700 mx-auto mb-2"
              weight="regular"
            />
            <p className="text-xs text-gray-500">No endorsements yet</p>
          </div>
        ) : (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors mb-3"
            >
              {expanded ? (
                <CaretUp className="w-3.5 h-3.5" weight="bold" />
              ) : (
                <CaretDown className="w-3.5 h-3.5" weight="bold" />
              )}
              Endorsements ({endorsements.length})
            </button>
            {expanded && (
              <div className="space-y-3">
                {endorsements.map((e, idx) => (
                  <div
                    key={idx}
                    className="flex gap-3 p-3 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
                  >
                    <img
                      src={`https://avatars.githubusercontent.com/${e.endorserUsername}`}
                      alt={e.endorserUsername}
                      className="w-8 h-8 rounded-full flex-shrink-0 bg-[rgba(255,255,255,0.05)]"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white">
                          @{e.endorserUsername}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,85,0,0.15)] text-[#FF6B2B]">
                          Score: {e.endorserScore}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          +{e.pointsGiven} PoWR
                        </span>
                      </div>
                      {e.message && (
                        <p className="text-xs text-gray-400">{e.message}</p>
                      )}
                      <p className="text-[10px] text-gray-600 mt-1">
                        {new Date(e.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
