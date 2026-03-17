"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getProvider,
  getConnectedAddress,
  connectWallet,
} from "./stacksProvider";

const LS_KEY = "stacks_wallet_address";

export function useStacksWallet() {
  const [address, setAddress] = useState<string | null>(null);

  // Restore persisted address on mount
  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      setAddress(stored);
    } else {
      // Check if provider already has an active session
      getConnectedAddress().then((addr) => {
        if (addr) {
          setAddress(addr);
          localStorage.setItem(LS_KEY, addr);
        }
      });
    }
  }, []);

  const connect = useCallback(async () => {
    const addr = await connectWallet();
    if (addr) {
      setAddress(addr);
      localStorage.setItem(LS_KEY, addr);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(LS_KEY);
  }, []);

  return {
    address,
    isConnected: !!address,
    hasProvider: typeof window !== "undefined" && !!getProvider(),
    connect,
    disconnect,
  };
}
