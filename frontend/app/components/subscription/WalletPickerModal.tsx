"use client";

import React, { useState, useEffect } from "react";
import { X, CircleNotch, Wallet } from "phosphor-react";
import {
  getLeatherProvider,
  getXverseProvider,
  connectLeather,
  connectXverse,
  connectWalletNative,
} from "../../lib/stacksProvider";

interface WalletPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnected: (address: string) => void;
}

export const WalletPickerModal: React.FC<WalletPickerModalProps> = ({
  isOpen,
  onClose,
  onConnected,
}) => {
  const [leatherInstalled, setLeatherInstalled] = useState(false);
  const [xverseInstalled, setXverseInstalled] = useState(false);
  const [connecting, setConnecting] = useState<"native" | "leather" | "xverse" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLeatherInstalled(!!getLeatherProvider());
      setXverseInstalled(!!getXverseProvider());
      setError(null);
      setConnecting(null);
    }
  }, [isOpen]);

  const handleConnect = async (method: "native" | "leather" | "xverse") => {
    setError(null);
    setConnecting(method);
    try {
      let address: string | null = null;

      if (method === "native") {
        // Opens the @stacks/connect native wallet picker — works with any wallet or none installed
        address = await connectWalletNative(true);
      } else if (method === "leather") {
        address = leatherInstalled ? await connectLeather() : await connectWalletNative(true);
      } else {
        address = xverseInstalled ? await connectXverse() : await connectWalletNative(true);
      }

      if (address) {
        localStorage.setItem("stacks_wallet_address", address);
        onConnected(address);
      } else {
        setError("Wallet connected but no Stacks address returned. Please try again.");
      }
    } catch (e: any) {
      const msg = (e as Error)?.message ?? "";
      // User cancelled — close silently
      if (msg.toLowerCase().includes("cancel") || msg.toLowerCase().includes("reject") || (e as any)?.code === 4001) {
        onClose();
        return;
      }
      setError(msg || "Failed to connect wallet.");
    } finally {
      setConnecting(null);
    }
  };

  if (!isOpen) return null;

  const isConnecting = connecting !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#12141a] border border-[rgba(255,255,255,0.08)] rounded-2xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" weight="bold" />
          </button>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          Choose your Stacks wallet to continue
        </p>

        <div className="space-y-3">
          {/* ── Primary: native @stacks/connect picker ── */}
          <button
            onClick={() => handleConnect("native")}
            disabled={isConnecting}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,85,0,0.4)] bg-[rgba(255,85,0,0.06)] hover:bg-[rgba(255,85,0,0.10)] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[rgba(255,85,0,0.20)] flex items-center justify-center flex-shrink-0">
              {connecting === "native" ? (
                <CircleNotch className="w-5 h-5 text-[#FF5500] animate-spin" weight="bold" />
              ) : (
                <Wallet className="w-5 h-5 text-[#FF5500]" weight="fill" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Connect Wallet</p>
              <p className="text-xs text-gray-400">
                {connecting === "native" ? "Opening wallet selector…" : "Leather, Xverse, WalletConnect & more"}
              </p>
            </div>
          </button>

          {/* ── Divider ── */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(255,255,255,0.07)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#12141a] px-2 text-gray-600">or connect directly</span>
            </div>
          </div>

          {/* ── Leather ── */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
            <div className="w-10 h-10 rounded-xl bg-[rgba(255,85,0,0.15)] flex items-center justify-center flex-shrink-0 text-lg">
              🟠
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Leather</p>
              <p className="text-xs text-gray-500">
                {leatherInstalled ? "Installed" : "Bitcoin & Stacks"}
              </p>
            </div>
            {leatherInstalled ? (
              <button
                onClick={() => handleConnect("leather")}
                disabled={isConnecting}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {connecting === "leather" ? (
                  <>
                    <CircleNotch className="w-3.5 h-3.5 animate-spin" weight="bold" />
                    Connecting
                  </>
                ) : (
                  "Connect"
                )}
              </button>
            ) : (
              <a
                href="https://leather.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] text-gray-300 text-xs font-medium transition-colors"
              >
                Install
              </a>
            )}
          </div>

          {/* ── Xverse ── */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
            <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center flex-shrink-0 text-lg">
              🟣
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Xverse</p>
              <p className="text-xs text-gray-500">
                {xverseInstalled ? "Installed" : "Bitcoin & Stacks"}
              </p>
            </div>
            {xverseInstalled ? (
              <button
                onClick={() => handleConnect("xverse")}
                disabled={isConnecting}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {connecting === "xverse" ? (
                  <>
                    <CircleNotch className="w-3.5 h-3.5 animate-spin" weight="bold" />
                    Connecting
                  </>
                ) : (
                  "Connect"
                )}
              </button>
            ) : (
              <a
                href="https://www.xverse.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] text-gray-300 text-xs font-medium transition-colors"
              >
                Install
              </a>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-400 text-center">{error}</p>
        )}

        <p className="mt-4 text-center text-xs text-gray-600">
          New to Stacks?{" "}
          <a
            href="https://leather.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 underline hover:text-white transition-colors"
          >
            Get Leather wallet
          </a>
        </p>
      </div>
    </div>
  );
};
