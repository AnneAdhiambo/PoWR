"use client";

import { useState, useEffect, useCallback } from "react";
import {
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  isConnected,
  getLocalStorage,
} from "@stacks/connect";

export function useStacksWallet() {
  const [address, setAddress] = useState<string | null>(null);

  const loadAddress = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isConnected()) {
      const data = getLocalStorage();
      const stxAddress = data?.addresses?.stx?.[0]?.address ?? null;
      setAddress(stxAddress);
    } else {
      setAddress(null);
    }
  }, []);

  useEffect(() => {
    loadAddress();
  }, [loadAddress]);

  const connect = useCallback(async () => {
    try {
      await stacksConnect();
      loadAddress();
    } catch {
      // user cancelled
    }
  }, [loadAddress]);

  const disconnect = useCallback(() => {
    stacksDisconnect();
    setAddress(null);
  }, []);

  return { address, isConnected: !!address, connect, disconnect };
}
