"use client";

import React from "react";
import { ShieldCheck, ArrowSquareOut, Cube } from "phosphor-react";

interface Proof {
  transactionHash: string;
  stacksBlockHeight: number;
  timestamp: number;
  skillScores: number[];
  createdAt?: string;
}

interface ProofChainPanelProps {
  proofs: Proof[];
  isVerified: boolean;
}

const EXPLORER_BASE = "https://explorer.hiro.so/txid";

export const ProofChainPanel: React.FC<ProofChainPanelProps> = ({ proofs, isVerified }) => {
  return (
    <div className="space-y-4">
      {/* Blockchain callout */}
      <div className={`p-4 rounded-xl border ${
        isVerified
          ? "bg-[rgba(255,85,0,0.06)] border-[rgba(255,85,0,0.2)]"
          : "bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]"
      }`}>
        <div className="flex items-start gap-3">
          <Cube
            className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isVerified ? "text-[#FF5500]" : "text-gray-600"}`}
            weight="fill"
          />
          <div>
            <p className={`text-sm font-semibold ${isVerified ? "text-white" : "text-gray-500"}`}>
              {isVerified ? "Blockchain Verified" : "No On-Chain Proofs"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              {isVerified
                ? "This profile is anchored on the Stacks blockchain. Scores are computed from verified GitHub artifacts — not self-reported."
                : "This developer hasn't published any on-chain proofs yet."}
            </p>
          </div>
        </div>
      </div>

      {/* Proof list */}
      {proofs.map((proof, i) => {
        const date = new Date(proof.timestamp * 1000);
        const shortHash = proof.transactionHash
          ? `${proof.transactionHash.slice(0, 8)}...${proof.transactionHash.slice(-6)}`
          : "—";
        const explorerUrl = proof.transactionHash
          ? `${EXPLORER_BASE}/${proof.transactionHash}?chain=testnet`
          : null;

        return (
          <div
            key={proof.transactionHash || i}
            className="p-4 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] rounded-xl"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF5500]" weight="fill" />
                <span className="text-xs font-mono text-gray-300">{shortHash}</span>
              </div>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-gray-500 hover:text-[#FF5500] transition-colors"
                >
                  <ArrowSquareOut className="w-3.5 h-3.5" weight="bold" />
                </a>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {proof.stacksBlockHeight && (
                <span>Block #{proof.stacksBlockHeight.toLocaleString()}</span>
              )}
              <span>{date.toLocaleDateString()}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
