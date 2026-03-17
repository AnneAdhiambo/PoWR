"use client";

import React, { useState, useEffect } from "react";
import { Card, Button } from "../ui";
import { Link, ShieldCheck, CaretDown, CaretUp, Plus, Copy, Check, Cube, ArrowsClockwise, WarningCircle } from "phosphor-react";
import { apiClient } from "../../lib/api";
import { verifyHashOnChain, POW_REGISTRY_ADDRESS } from "../../lib/web3";
import { PricingModal } from "../subscription/PricingModal";
import toast from "react-hot-toast";

const CONTRACT_ADDRESS = POW_REGISTRY_ADDRESS;

export interface Proof {
  id?: number;
  transactionHash: string;
  artifactHash: string;
  stacksBlockHeight?: number;
  blockNumber?: number;   // legacy — prefer stacksBlockHeight
  timestamp: number;
  skillScores: number[];
  createdAt?: string;
}

interface OnChainProofsProps {
  proofs: Proof[];
  username?: string;
  onRefresh?: () => void;
  unpublishedAnalysis?: {
    lastAnalyzed: string;
    onPublish: () => void;
    isPublishing: boolean;
  };
}

export const OnChainProofs: React.FC<OnChainProofsProps> = ({
  proofs,
  username,
  onRefresh,
  unpublishedAnalysis,
}) => {
  const [expandedProofs, setExpandedProofs] = useState<Set<number>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifiedHashes, setVerifiedHashes] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Verify proofs on-chain when they change
  useEffect(() => {
    const verifyProofs = async () => {
      if (proofs.length === 0) return;
      setVerifying(true);
      const verified = new Set<string>();
      for (const proof of proofs) {
        if (proof.artifactHash) {
          try {
            const isVerified = await verifyHashOnChain(proof.artifactHash);
            if (isVerified) {
              verified.add(proof.artifactHash);
            }
          } catch (error) {
            console.error("Verification error:", error);
          }
        }
      }
      setVerifiedHashes(verified);
      setVerifying(false);
    };
    verifyProofs();
  }, [proofs]);

  const copyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const formatDate = (timestamp: number | string | null | undefined) => {
    if (!timestamp) return 'Unknown date';

    try {
      let date: Date;
      if (typeof timestamp === 'string') {
        // Try parsing as ISO string first
        date = new Date(timestamp);
        // If invalid, try parsing as a number string (bigint from DB)
        if (isNaN(date.getTime())) {
          const numTimestamp = parseInt(timestamp, 10);
          date = new Date(numTimestamp * 1000);
        }
      } else {
        // For numbers, multiply by 1000 if it looks like a Unix timestamp (seconds)
        // Unix timestamps after 2001 are > 1000000000
        date = timestamp > 1000000000000 ? new Date(timestamp) : new Date(timestamp * 1000);
      }

      if (isNaN(date.getTime())) return 'Unknown date';

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const getExplorerUrl = (txHash: string) => {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  };

  const getContractUrl = () => {
    return `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`;
  };

  const getBlockNum = (proof: Proof) => proof.stacksBlockHeight ?? proof.blockNumber ?? 0;

  const getBlockUrl = (blockNumber: number) => {
    return `https://sepolia.basescan.org/block/${blockNumber}`;
  };

  const toggleProof = (proofId: number) => {
    const newExpanded = new Set(expandedProofs);
    if (newExpanded.has(proofId)) {
      newExpanded.delete(proofId);
    } else {
      newExpanded.add(proofId);
    }
    setExpandedProofs(newExpanded);
  };

  const handlePublishProof = async () => {
    if (!username) return;

    setPublishing(true);
    try {
      toast.loading("Publishing proof to blockchain...", { id: "publish-proof" });
      // Call the new publish-proof endpoint
      const result = await apiClient.publishProof(username);

      if (result.success) {
        toast.success(result.message || "Proof published successfully!", { id: "publish-proof" });
        // Wait a bit for the transaction to be processed, then refresh
        setTimeout(() => {
          if (onRefresh) {
            onRefresh();
          } else {
            window.location.reload();
          }
        }, 2000);
      }
    } catch (error: any) {
      // Check if it's a 403 error (upgrade required)
      const errorMsg = error?.message || "";
      if (errorMsg.includes("403") || errorMsg.includes("Forbidden") || errorMsg.includes("Subscription required") || errorMsg.includes("upgrade")) {
        toast.dismiss("publish-proof");
        toast("Upgrade to publish more proofs on-chain", {
          icon: "⚡",
          duration: 3000,
        });
        setShowUpgradeModal(true);
      } else {
        console.error("Failed to publish proof:", error);
        toast.error(errorMsg || "Failed to publish proof. Please try again.", { id: "publish-proof" });
      }
    } finally {
      setPublishing(false);
    }
  };

  const latestProof = proofs.length > 0 ? proofs[0] : null;

  return (
    <>
      <Card className="p-4 rounded-[16px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#FF6B2B]" weight="fill" />
            <h2 className="text-sm font-medium text-[#FF6B2B]" style={{ fontWeight: 500, fontSize: '14px' }}>
              On-Chain Proofs
            </h2>
            {proofs.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.1)] text-[#FF7F45]">
                {proofs.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/proofs" className="text-xs text-[#FF6B2B] hover:text-[#FF7F45] transition-colors">
              View All
            </Link>
            {username && !unpublishedAnalysis && (
              <button
                onClick={handlePublishProof}
                disabled={publishing}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#FF7F45] disabled:opacity-50"
              >
                <Plus className="w-3 h-3" weight="bold" />
                {publishing ? "Publishing..." : "Publish Proof"}
              </button>
            )}
          </div>
        </div>

        {/* Unpublished Changes Banner */}
        {unpublishedAnalysis && (
          <div className="mb-4 p-3 rounded-[12px] bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.2)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[rgba(251,191,36,0.1)] flex items-center justify-center">
                <WarningCircle className="w-5 h-5 text-amber-400" weight="fill" />
              </div>
              <div>
                <h3 className="text-xs font-medium text-white">Unpublished Updates</h3>
                <p className="text-[10px] text-gray-400">Analysis from {new Date(unpublishedAnalysis.lastAnalyzed).toLocaleDateString()}</p>
              </div>
            </div>
            <Button
              onClick={unpublishedAnalysis.onPublish}
              disabled={unpublishedAnalysis.isPublishing}
              className="flex items-center gap-1.5 text-[10px] py-1.5 h-auto bg-amber-500 hover:bg-amber-600 text-black border-none"
            >
              {unpublishedAnalysis.isPublishing ? "Publishing..." : "Publish Now"}
            </Button>
          </div>
        )}

        {/* Contract Address */}
        <div className="mb-3 p-2.5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Cube className="w-3.5 h-3.5 text-violet-400" weight="fill" />
              <span className="text-[10px] text-gray-400">PoWRegistry Contract</span>
            </div>
            <span className="text-[9px] text-[#FF6B2B] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)]">Base Sepolia</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-[11px] font-mono text-gray-300 truncate">
              {CONTRACT_ADDRESS}
            </code>
            <button
              onClick={copyAddress}
              className="p-1 rounded text-gray-500 hover:text-white transition-colors"
              title="Copy address"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" weight="bold" /> : <Copy className="w-3 h-3" weight="regular" />}
            </button>
            <a
              href={getContractUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded text-gray-500 hover:text-[#FF6B2B] transition-colors"
              title="View on BaseScan"
            >
              <Link className="w-3 h-3" weight="regular" />
            </a>
          </div>
        </div>

        {proofs.length === 0 ? (
          <div className="py-4">
            <p className="text-xs text-gray-400 mb-2" style={{ opacity: 0.6 }}>
              No on-chain proofs yet. Publish your first proof to get started.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Latest proof prominently displayed */}
            {latestProof && (
              <div className="p-3 rounded-[14px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-white">
                        Latest Snapshot #{latestProof.id || 1}
                      </p>
                      {verifying ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 flex items-center gap-1">
                          <ArrowsClockwise className="w-3 h-3 animate-spin" weight="bold" />
                          Verifying
                        </span>
                      ) : verifiedHashes.has(latestProof.artifactHash) ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          On-Chain Verified
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FF5500]/20 text-[#FF6B2B]">
                          Recorded
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400" style={{ opacity: 0.6 }}>
                      {formatDate(latestProof.timestamp)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={getBlockUrl(getBlockNum(latestProof))}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gray-400 hover:text-[#FF6B2B] text-[10px] transition-colors"
                      style={{ opacity: 0.6 }}
                      title={`Block #${getBlockNum(latestProof)}`}
                    >
                      <span>#{getBlockNum(latestProof)}</span>
                    </a>
                    <a
                      href={getExplorerUrl(latestProof.transactionHash)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-gray-400 hover:text-[#FF6B2B] text-[10px] transition-colors"
                      style={{ opacity: 0.6 }}
                      title="View transaction on BaseScan"
                    >
                      <Link className="w-3 h-3" weight="regular" />
                      View TX
                    </a>
                  </div>
                </div>
                {latestProof.skillScores && latestProof.skillScores.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                    <p className="text-xs text-gray-500 mb-1.5">Skill Scores:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {latestProof.skillScores.map((score, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.08)] text-[#FF7F45]"
                        >
                          {score}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Proof history */}
            {proofs.length > 1 && (
              <div className="space-y-1.5">
                {proofs.slice(1).map((proof, index) => {
                  const proofId = proof.id || index + 2;
                  const isExpanded = expandedProofs.has(proofId);

                  return (
                    <div
                      key={proof.transactionHash || index}
                      className="p-2.5 rounded-[12px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <button
                            onClick={() => toggleProof(proofId)}
                            className="text-gray-400 hover:text-gray-300"
                          >
                            {isExpanded ? (
                              <CaretUp className="w-3 h-3" weight="bold" />
                            ) : (
                              <CaretDown className="w-3 h-3" weight="bold" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-white">
                              Snapshot #{proofId}
                            </p>
                            <p className="text-[10px] text-gray-400" style={{ opacity: 0.6 }}>
                              {formatDate(proof.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={getBlockUrl(getBlockNum(proof))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-[#FF5500] text-[10px] transition-colors"
                            style={{ opacity: 0.6 }}
                            title={`Block #${getBlockNum(proof)}`}
                          >
                            #{getBlockNum(proof)}
                          </a>
                          <a
                            href={getExplorerUrl(proof.transactionHash)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-gray-400 hover:text-[#FF5500] text-[10px] transition-colors"
                            style={{ opacity: 0.6 }}
                            title="View transaction on BaseScan"
                          >
                            <Link className="w-3 h-3" weight="regular" />
                            View
                          </a>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-2 pt-2 space-y-2 border-t border-[rgba(255,255,255,0.05)]">
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Artifact Hash:</p>
                            <p className="text-[10px] text-gray-400 font-mono break-all">
                              {proof.artifactHash}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-500 mb-1">Transaction:</p>
                            <p className="text-[10px] text-gray-400 font-mono break-all">
                              {proof.transactionHash}
                            </p>
                          </div>
                          {proof.skillScores && proof.skillScores.length > 0 && (
                            <div>
                              <p className="text-[10px] text-gray-500 mb-1">Skill Scores:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {proof.skillScores.map((score, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-[rgba(255,255,255,0.08)] text-gray-300"
                                  >
                                    {score}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card >

      {/* Upgrade Modal for Free Users */}
      < PricingModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        username={username}
      />
    </>
  );
};

