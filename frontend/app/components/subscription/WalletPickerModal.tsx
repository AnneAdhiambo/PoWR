"use client";

import React, { useState, useEffect } from "react";
import { X, CircleNotch } from "phosphor-react";
import {
  getLeatherProvider,
  getXverseProvider,
  connectLeather,
  connectXverse,
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
  const [connectingLeather, setConnectingLeather] = useState(false);
  const [connectingXverse, setConnectingXverse] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLeatherInstalled(!!getLeatherProvider());
      setXverseInstalled(!!getXverseProvider());
      setError(null);
    }
  }, [isOpen]);

  const handleConnectLeather = async () => {
    setError(null);
    setConnectingLeather(true);
    try {
      const address = await connectLeather();
      if (address) {
        localStorage.setItem("stacks_wallet_address", address);
        onConnected(address);
      } else {
        setError("Could not retrieve a Stacks address from Leather.");
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to connect Leather.");
    } finally {
      setConnectingLeather(false);
    }
  };

  const handleConnectXverse = async () => {
    setError(null);
    setConnectingXverse(true);
    try {
      const address = await connectXverse();
      if (address) {
        localStorage.setItem("stacks_wallet_address", address);
        onConnected(address);
      } else {
        setError("Could not retrieve a Stacks address from Xverse.");
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to connect Xverse.");
    } finally {
      setConnectingXverse(false);
    }
  };

  if (!isOpen) return null;

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
        <p className="text-sm text-gray-400 mb-6">
          Select a wallet to continue
        </p>

        {/* Wallet options */}
        <div className="space-y-3">
          {/* Leather */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
            <div className="w-10 h-10 rounded-xl bg-[rgba(255,85,0,0.15)] flex items-center justify-center flex-shrink-0 text-lg">
              🟠
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Leather</p>
              <p className="text-xs text-gray-500">Bitcoin &amp; Stacks</p>
            </div>
            {leatherInstalled ? (
              <button
                onClick={handleConnectLeather}
                disabled={connectingLeather || connectingXverse}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#FF5500] hover:bg-[#e04d00] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {connectingLeather ? (
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

          {/* Xverse */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
            <div className="w-10 h-10 rounded-xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center flex-shrink-0 text-lg">
              🟣
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Xverse</p>
              <p className="text-xs text-gray-500">Bitcoin &amp; Stacks</p>
            </div>
            {xverseInstalled ? (
              <button
                onClick={handleConnectXverse}
                disabled={connectingLeather || connectingXverse}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                {connectingXverse ? (
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
      </div>
    </div>
  );
};
