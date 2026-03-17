"use client";

import React from "react";
import { Card, Button } from "../ui";
import { Link, CheckCircle, Clock, WarningCircle } from "phosphor-react";
import { Proof } from "./OnChainProofs";

interface UnpublishedAnalysis {
  lastAnalyzed: string;
  onPublish: () => void;
  isPublishing: boolean;
}

interface RecentActivityProps {
  proofs: Proof[];
  unpublishedAnalysis?: UnpublishedAnalysis;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({ proofs, unpublishedAnalysis }) => {
  const formatDate = (timestamp: number | string | null | undefined) => {
    if (!timestamp) return 'Unknown';

    try {
      let date: Date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
        if (isNaN(date.getTime())) {
          const numTimestamp = parseInt(timestamp, 10);
          date = new Date(numTimestamp * 1000);
        }
      } else {
        // For numbers, check if it's seconds or milliseconds
        date = timestamp > 1000000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
      }

      if (isNaN(date.getTime())) return 'Unknown';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return 'Unknown';
    }
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  };

  const getContractUrl = () => {
    return `https://sepolia.basescan.org/address/0x8fb4fF2123E9a11fC027c494551794fc75e76980`;
  };

  // Show 1 proof if there's an unpublished analysis, otherwise show 2
  const recentProofs = unpublishedAnalysis ? proofs.slice(0, 1) : proofs.slice(0, 2);

  return (
    <Card className="p-4 rounded-[16px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-400" weight="regular" style={{ opacity: 0.7 }} />
          <h2 className="text-sm font-medium text-white" style={{ fontWeight: 500, fontSize: '14px' }}>
            Recent Activity
          </h2>
        </div>
        <a
          href={getContractUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-gray-400 hover:text-gray-300 transition-colors"
          style={{ opacity: 0.6 }}
          title="View contract on BaseScan"
        >
          Contract
        </a>
      </div>

      <div className="space-y-2">
        {/* Unpublished Analysis - shown first */}
        {/* Unpublished Analysis - shown first */}
        {unpublishedAnalysis && (
          <div className="p-3 rounded-[12px] bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.2)]">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgba(251,191,36,0.1)] flex items-center justify-center">
                  <WarningCircle className="w-4 h-4 text-amber-400" weight="fill" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate mb-0.5">Unpublished</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 opacity-80">
                    <span>{formatDate(unpublishedAnalysis.lastAnalyzed)}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-gray-500" />
                    <span className="text-amber-400/80">Pending</span>
                  </div>
                </div>
              </div>

              <Button
                onClick={unpublishedAnalysis.onPublish}
                disabled={unpublishedAnalysis.isPublishing}
                size="sm"
                className="bg-[#ff8904] hover:bg-[#E67B03] active:bg-[#CC6D03] text-black border-none text-[10px] h-7 px-3 py-0 font-semibold flex-shrink-0 rounded-lg shadow-none hover:shadow-none focus:shadow-none focus:ring-0"
              >
                {unpublishedAnalysis.isPublishing ? "..." : "Publish"}
              </Button>
            </div>
          </div>
        )}

        {/* Published Proofs */}
        {recentProofs.length === 0 && !unpublishedAnalysis ? (
          <div className="py-4">
            <p className="text-xs text-gray-400" style={{ opacity: 0.6 }}>
              No activity yet. Your first proof will appear here.
            </p>
          </div>
        ) : (
          recentProofs.map((proof, index) => (
            <div
              key={proof.transactionHash || index}
              className="p-2.5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" weight="fill" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white mb-0.5">
                    Proof Published
                  </p>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-gray-400" style={{ opacity: 0.6 }}>
                      {formatDate(proof.timestamp)}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                      On-Chain
                    </span>
                  </div>
                  <a
                    href={getExplorerUrl(proof.transactionHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-[#FF5500] transition-colors group"
                    style={{ opacity: 0.7 }}
                  >
                    <Link className="w-3 h-3" weight="regular" />
                    <span className="font-mono truncate max-w-[120px]">
                      {proof.transactionHash.slice(0, 10)}...{proof.transactionHash.slice(-8)}
                    </span>
                    <span className="text-[#FF5500] opacity-0 group-hover:opacity-100 transition-opacity">
                      View
                    </span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {proofs.length > (unpublishedAnalysis ? 1 : 2) && (
        <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)]">
          <p className="text-[10px] text-gray-400 text-center" style={{ opacity: 0.6 }}>
            +{proofs.length - (unpublishedAnalysis ? 1 : 2)} more proofs
          </p>
        </div>
      )}
    </Card>
  );
};


