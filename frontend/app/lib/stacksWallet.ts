"use client";

import { useState, useEffect, useCallback } from "react";

// All @stacks/connect imports are deferred to function bodies so the module
// is never evaluated at chunk load time (avoids Turbopack "factory not available").

export function useStacksWallet() {
  const [address, setAddress] = useState<string | null>(null);

  const loadAddress = useCallback(async () => {
    if (typeof window === "undefined") return;
    const { isConnected, getLocalStorage } = await import("@stacks/connect");
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
      const { connect: stacksConnect } = await import("@stacks/connect");
      await stacksConnect();
      await loadAddress();
    } catch {
      // user cancelled
    }
  }, [loadAddress]);

  const disconnect = useCallback(async () => {
    const { disconnect: stacksDisconnect } = await import("@stacks/connect");
    stacksDisconnect();
    setAddress(null);
  }, []);

  return { address, isConnected: !!address, connect, disconnect };
}
