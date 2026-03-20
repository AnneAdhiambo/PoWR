import { useState, useEffect } from "react";

// Fetches BTC/USD price from CoinGecko free API (no key required).
// Returns null while loading or on error — callers fall back to showing raw sBTC amount.
export function useBtcPrice(): { btcPriceUsd: number | null; loading: boolean } {
  const [btcPriceUsd, setBtcPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem("btc_price_usd");
    const cachedAt = sessionStorage.getItem("btc_price_at");
    if (cached && cachedAt && Date.now() - Number(cachedAt) < 5 * 60 * 1000) {
      setBtcPriceUsd(Number(cached));
      setLoading(false);
      return;
    }
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
      .then((r) => r.json())
      .then((data) => {
        const price = data?.bitcoin?.usd;
        if (price) {
          sessionStorage.setItem("btc_price_usd", String(price));
          sessionStorage.setItem("btc_price_at", String(Date.now()));
          setBtcPriceUsd(price);
        }
      })
      .catch(() => {
        /* silently fall back to showing raw sBTC amount */
      })
      .finally(() => setLoading(false));
  }, []);

  return { btcPriceUsd, loading };
}
