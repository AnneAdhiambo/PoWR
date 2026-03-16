"use client";

import React, { useState, useRef, useEffect } from "react";
import { Wallet, CaretDown, CircleNotch } from "phosphor-react";
import { useStacksWallet } from "../../lib/stacksWallet";

export const ConnectWalletButton: React.FC = () => {
  const { address, isConnected, connect, disconnect } = useStacksWallet();
  const [connecting, setConnecting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // connect() triggers the native @stacks/connect-ui wallet picker,
      // which auto-detects installed wallets via window.wbip_providers (WBIP004).
      await connect();
    } finally {
      setConnecting(false);
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 bg-[#FF5500] hover:bg-[#e04d00] disabled:bg-[#FF5500]/60 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
      >
        {connecting ? (
          <CircleNotch className="w-4 h-4 animate-spin" weight="bold" />
        ) : (
          <Wallet className="w-4 h-4" weight="fill" />
        )}
        {connecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen((o) => !o)}
        className="flex items-center gap-2 bg-[rgba(255,85,0,0.12)] border border-[rgba(255,85,0,0.35)] text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-[rgba(255,85,0,0.2)]"
      >
        <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
        <Wallet className="w-4 h-4 text-[#FF5500]" weight="fill" />
        <span className="font-mono text-xs">{truncate(address!)}</span>
        <CaretDown className="w-3 h-3 text-gray-400" weight="bold" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-1.5 w-44 bg-[#0f1117] border border-[rgba(255,255,255,0.08)] rounded-xl shadow-xl overflow-hidden z-10">
          <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
            <p className="text-xs text-gray-500">Connected</p>
            <p className="text-xs text-white font-mono truncate mt-0.5">
              {truncate(address!)}
            </p>
          </div>
          <button
            onClick={() => {
              disconnect();
              setDropdownOpen(false);
            }}
            className="w-full px-3 py-2.5 text-sm text-left text-red-400 hover:bg-[rgba(255,255,255,0.04)] transition-colors"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};
