"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/layout/Sidebar";
import { Card, Button } from "../components/ui";
import { apiClient } from "../lib/api";
import { Proof } from "../components/dashboard/OnChainProofs";
import { verifyHashOnChain, POW_REGISTRY_ADDRESS } from "../lib/web3";
import {
    ShieldCheck,
    Link,
    Copy,
    Check,
    Cube,
    ArrowsClockwise,
    Plus,
    CaretDown,
    CaretUp,
    WarningCircle
} from "phosphor-react";
import { PricingModal } from "../components/subscription/PricingModal";
import toast from "react-hot-toast";

const CONTRACT_ADDRESS = POW_REGISTRY_ADDRESS;

export default function ProofsPage() {
    const router = useRouter();
    const [proofs, setProofs] = useState<Proof[]>([]);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [verifiedHashes, setVerifiedHashes] = useState<Set<string>>(new Set());
    const [verifying, setVerifying] = useState(false);
    const [expandedProofs, setExpandedProofs] = useState<Set<number>>(new Set());
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<{
        hasUnpublished: boolean;
        lastAnalyzed: string | null;
        lastPublished: string | null;
    } | null>(null);

    const [username, setUsername] = useState<string>("");
    const [accessToken, setAccessToken] = useState<string>("");
    const [userEmail, setUserEmail] = useState<string>("");
    const [displayName, setDisplayName] = useState<string>("");

    useEffect(() => {
        const token = localStorage.getItem("github_token");
        const storedUsername = localStorage.getItem("github_username");

        if (token && storedUsername) {
            setAccessToken(token);
            setUsername(storedUsername);
        } else {
            router.push("/auth");
        }
    }, [router]);

    useEffect(() => {
        if (username) {
            loadProofs();
            setDisplayName(username);
            const storedEmail = localStorage.getItem("github_email");
            if (storedEmail) setUserEmail(storedEmail);
        }
    }, [username]);

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

    const loadProofs = async () => {
        try {
            setLoading(true);
            const [proofsData, analysisData] = await Promise.all([
                apiClient.getProofs(username),
                apiClient.getAnalysisStatus(username).catch(() => null)
            ]);
            setProofs(proofsData.proofs || []);
            if (analysisData) {
                setAnalysisStatus({
                    hasUnpublished: analysisData.hasUnpublished,
                    lastAnalyzed: analysisData.lastAnalyzed,
                    lastPublished: analysisData.lastPublished
                });
            }
        } catch (error) {
            console.error("Failed to load proofs:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: number | string | null | undefined) => {
        if (!timestamp) return 'Unknown date';

        try {
            let date: Date;
            if (typeof timestamp === 'string') {
                date = new Date(timestamp);
                if (isNaN(date.getTime())) {
                    const numTimestamp = parseInt(timestamp, 10);
                    date = new Date(numTimestamp * 1000);
                }
            } else {
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

    const copyAddress = () => {
        navigator.clipboard.writeText(CONTRACT_ADDRESS);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const getExplorerUrl = (txHash: string) => `https://sepolia.basescan.org/tx/${txHash}`;
    const getContractUrl = () => `https://sepolia.basescan.org/address/${CONTRACT_ADDRESS}`;
    const getBlockUrl = (blockNumber: number) => `https://sepolia.basescan.org/block/${blockNumber}`;

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
            const result = await apiClient.publishProof(username);

            if (result.success) {
                toast.success(result.message || "Proof published successfully!", { id: "publish-proof" });
                setTimeout(() => loadProofs(), 2000);
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
                toast.error(errorMsg || "Failed to publish proof", { id: "publish-proof" });
            }
        } finally {
            setPublishing(false);
        }
    };

    const skillLabels = ["Backend", "Frontend", "DevOps", "Systems"];

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0b0c0f] flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-[#0b0c0f] flex">
                <Sidebar
                    username={username}
                    email={userEmail || undefined}
                    displayName={displayName}
                />

                <div className="flex-1 overflow-y-auto ml-60">
                    <div className="max-w-[900px] mx-auto px-6 py-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <ShieldCheck className="w-5 h-5 text-[#FF6B2B]" weight="fill" />
                                    <h1 className="text-xl font-semibold text-white tracking-tight" style={{ fontWeight: 500 }}>
                                        On-Chain Proofs
                                    </h1>
                                    {proofs.length > 0 && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-[rgba(255,255,255,0.1)] text-[#FF7F45]">
                                            {proofs.length}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400" style={{ opacity: 0.6 }}>
                                    Your Proof-of-Work snapshots anchored on Base Sepolia blockchain
                                </p>
                            </div>
                            <Button
                                onClick={handlePublishProof}
                                disabled={publishing}
                                className="flex items-center gap-2 text-xs"
                            >
                                <Plus className="w-3.5 h-3.5" weight="bold" />
                                {publishing ? "Publishing..." : "Publish New Proof"}
                            </Button>
                        </div>

                        {/* Contract Info Card */}
                        <Card className="p-4 rounded-[16px] mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <Cube className="w-4 h-4 text-violet-400" weight="fill" />
                                    <span className="text-sm text-gray-300">PoWRegistry Contract</span>
                                </div>
                                <span className="text-xs text-[#FF6B2B] px-2 py-0.5 rounded bg-[rgba(255,255,255,0.05)]">Base Sepolia</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <code className="flex-1 text-sm font-mono text-gray-400 bg-[rgba(255,255,255,0.03)] px-3 py-2 rounded-lg">
                                    {CONTRACT_ADDRESS}
                                </code>
                                <button
                                    onClick={copyAddress}
                                    className="p-2 rounded-lg text-gray-500 hover:text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                                    title="Copy address"
                                >
                                    {copied ? <Check className="w-4 h-4 text-emerald-400" weight="bold" /> : <Copy className="w-4 h-4" weight="regular" />}
                                </button>
                                <a
                                    href={getContractUrl()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 rounded-lg text-gray-500 hover:text-[#FF6B2B] bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
                                    title="View on BaseScan"
                                >
                                    <Link className="w-4 h-4" weight="regular" />
                                </a>
                            </div>
                        </Card>

                        {/* Unpublished Changes Card */}
                        {analysisStatus?.hasUnpublished && (
                            <Card className="p-5 rounded-[16px] mb-6 bg-[rgba(251,191,36,0.05)] border border-[rgba(251,191,36,0.2)] relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-r from-[rgba(251,191,36,0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <div className="relative flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[rgba(251,191,36,0.1)] flex items-center justify-center">
                                            <WarningCircle className="w-6 h-6 text-amber-400" weight="duotone" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-medium text-white mb-1">Unpublished Updates Available</h3>
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <span>Last analyzed: {formatDate(analysisStatus.lastAnalyzed)}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-600" />
                                                <span className="text-amber-400">Pending on-chain publish</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handlePublishProof}
                                        disabled={publishing}
                                        className="bg-amber-500 hover:bg-amber-600 text-black font-medium border-none shadow-lg shadow-amber-500/20"
                                    >
                                        {publishing ? "Publishing..." : "Publish Now"}
                                    </Button>
                                </div>
                            </Card>
                        )}

                        {/* Proofs List */}
                        {proofs.length === 0 ? (
                            <Card className="p-8 rounded-[16px] text-center">
                                <ShieldCheck className="w-12 h-12 text-gray-600 mx-auto mb-4" weight="regular" />
                                <h3 className="text-lg font-medium text-white mb-2">No On-Chain Proofs Yet</h3>
                                <p className="text-sm text-gray-400 mb-4">
                                    Publish your first proof to anchor your skills on the blockchain.
                                </p>
                                <Button onClick={handlePublishProof} disabled={publishing}>
                                    {publishing ? "Publishing..." : "Publish First Proof"}
                                </Button>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {proofs.map((proof, index) => {
                                    const proofId = proof.id || index + 1;
                                    const isExpanded = expandedProofs.has(proofId);
                                    const isVerified = verifiedHashes.has(proof.artifactHash);

                                    return (
                                        <Card key={proof.transactionHash || index} className="p-5 rounded-[16px]">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="text-sm font-medium text-white">Snapshot #{proofId}</h3>
                                                        {verifying ? (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-500/20 text-gray-400 flex items-center gap-1">
                                                                <ArrowsClockwise className="w-3 h-3 animate-spin" weight="bold" />
                                                                Verifying
                                                            </span>
                                                        ) : isVerified ? (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                                                ✓ On-Chain Verified
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FF5500]/20 text-[#FF6B2B]">
                                                                Recorded
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400">{formatDate(proof.timestamp)}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <a
                                                        href={getBlockUrl(proof.stacksBlockHeight ?? proof.blockNumber ?? 0)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-gray-500 hover:text-[#FF6B2B] transition-colors"
                                                    >
                                                        Block #{proof.stacksBlockHeight ?? proof.blockNumber ?? 0}
                                                    </a>
                                                    <a
                                                        href={getExplorerUrl(proof.transactionHash)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-xs text-[#FF6B2B] hover:text-[#FF7F45] transition-colors"
                                                    >
                                                        <Link className="w-3.5 h-3.5" weight="regular" />
                                                        View TX
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Skill Scores */}
                                            {proof.skillScores && proof.skillScores.length > 0 && (
                                                <div className="mb-3">
                                                    <p className="text-xs text-gray-500 mb-2">Skill Scores:</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {proof.skillScores.map((score, i) => (
                                                            <div
                                                                key={i}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)]"
                                                            >
                                                                <span className="text-xs text-gray-400">{skillLabels[i] || `Skill ${i + 1}`}</span>
                                                                <span className="text-sm font-medium text-[#FF7F45]">{score}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Toggle Details */}
                                            <button
                                                onClick={() => toggleProof(proofId)}
                                                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <CaretUp className="w-3 h-3" weight="bold" />
                                                        Hide Details
                                                    </>
                                                ) : (
                                                    <>
                                                        <CaretDown className="w-3 h-3" weight="bold" />
                                                        Show Details
                                                    </>
                                                )}
                                            </button>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="mt-3 pt-3 border-t border-[rgba(255,255,255,0.05)] space-y-3">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Transaction Hash:</p>
                                                        <code className="text-xs text-gray-400 font-mono break-all bg-[rgba(255,255,255,0.03)] px-2 py-1 rounded block">
                                                            {proof.transactionHash}
                                                        </code>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Artifact Hash:</p>
                                                        <code className="text-xs text-gray-400 font-mono break-all bg-[rgba(255,255,255,0.03)] px-2 py-1 rounded block">
                                                            {proof.artifactHash}
                                                        </code>
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Upgrade Modal for Free Users */}
            <PricingModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                username={username}
            />
        </>);
}
