import { useState, useEffect } from "react";

// Fetches STX/USD price from CoinGecko (CoinGecko id for Stacks is "blockstack").
// Returns null while loading or on error — callers fall back to a $0.30 estimate.
export function useStxPrice(): { stxPriceUsd: number | null; loading: boolean } {
  const [stxPriceUsd, setStxPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("stx_price_usd");
    const cachedAt = sessionStorage.getItem("stx_price_at");
    if (cached && cachedAt && Date.now() - Number(cachedAt) < 5 * 60 * 1000) {
      setStxPriceUsd(Number(cached));
      setLoading(false);
      return;
    }
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd")
      .then((r) => r.json())
      .then((data) => {
        const price = data?.blockstack?.usd;
        if (price) {
          sessionStorage.setItem("stx_price_usd", String(price));
          sessionStorage.setItem("stx_price_at", String(Date.now()));
          setStxPriceUsd(price);
        }
      })
      .catch(() => { /* fall back to estimate */ })
      .finally(() => setLoading(false));
  }, []);

  return { stxPriceUsd, loading };
}
