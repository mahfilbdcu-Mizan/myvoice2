import { useEffect, useState } from "react";
import { getUsdRate } from "@/lib/currency-rates";

const STORAGE_KEY = "preferred_currency";

export function useCurrencyRate() {
  const [currency, setCurrencyState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "USD";
    } catch {
      return "USD";
    }
  });
  const [rate, setRate] = useState<number>(1);
  const [source, setSource] = useState<"binance" | "fixed">("fixed");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (currency === "USD") {
      setRate(1);
      setSource("fixed");
      return;
    }
    setLoading(true);
    getUsdRate(currency).then((r) => {
      if (cancelled) return;
      setRate(r.rate);
      setSource(r.source);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [currency]);

  const setCurrency = (code: string) => {
    setCurrencyState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      // ignore
    }
  };

  return { currency, setCurrency, rate, source, loading };
}
