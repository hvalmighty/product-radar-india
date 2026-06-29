import { useSyncExternalStore, useCallback, type ReactNode } from "react";

export type Region = "IN" | "AE";

export const REGION_META: Record<Region, {
  code: Region;
  label: string;
  flag: string;
  currency: string;
  symbol: string;
  locale: string;
  /** Large-unit conversions for compact display. */
  bigUnits: { name: string; value: number }[];
}> = {
  IN: {
    code: "IN", label: "India", flag: "🇮🇳",
    currency: "INR", symbol: "₹", locale: "en-IN",
    bigUnits: [{ name: "Cr", value: 1e7 }, { name: "L", value: 1e5 }, { name: "K", value: 1e3 }],
  },
  AE: {
    code: "AE", label: "UAE", flag: "🇦🇪",
    currency: "AED", symbol: "AED ", locale: "en-AE",
    bigUnits: [{ name: "B", value: 1e9 }, { name: "M", value: 1e6 }, { name: "K", value: 1e3 }],
  },
};

/** Scale factor that converts mock-data AUM/corpus units to base currency.
 * India arrays store crore (1e7), UAE arrays store million (1e6). */
export function aumScale(): number {
  return _region === "IN" ? 1e7 : 1e6;
}

const STORAGE_KEY = "mpower.region.v1";

// --- module-level store --------------------------------------------------
let _region: Region = "IN";
if (typeof window !== "undefined") {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "IN" || saved === "AE") _region = saved;
  } catch { /* noop */ }
}

const listeners = new Set<() => void>();

export function getCurrentRegion(): Region { return _region; }

export function setCurrentRegion(r: Region) {
  if (r === _region) return;
  _region = r;
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(STORAGE_KEY, r); } catch { /* noop */ }
  }
  listeners.forEach((l) => l());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// --- react hook ----------------------------------------------------------
export function useRegion(): { region: Region; setRegion: (r: Region) => void; meta: typeof REGION_META[Region] } {
  const region = useSyncExternalStore(subscribe, getCurrentRegion, () => "IN" as Region);
  const setRegion = useCallback((r: Region) => setCurrentRegion(r), []);
  return { region, setRegion, meta: REGION_META[region] };
}

// --- formatting helpers --------------------------------------------------

/** Compact money string for the current region (e.g. ₹1.20 Cr or AED 12.3 M). */
export function fmtMoney(n: number | null | undefined): string {
  const m = REGION_META[_region];
  if (n == null || !isFinite(n)) return `${m.symbol}0`;
  const a = Math.abs(n);
  const sign = n < 0 ? "−" : "";
  for (const u of m.bigUnits) {
    if (a >= u.value) return `${sign}${m.symbol}${(a / u.value).toFixed(2)} ${u.name}`;
  }
  return `${sign}${m.symbol}${a.toFixed(0)}`;
}

/** Full-precision money string (no abbreviation). */
export function fmtMoneyFull(n: number | null | undefined): string {
  const m = REGION_META[_region];
  if (n == null || !isFinite(n)) return `${m.symbol}0`;
  return `${m.symbol}${Math.round(n).toLocaleString(m.locale)}`;
}

/** Reactive subscriptions for non-component code that needs to know. */
export function onRegionChange(fn: (r: Region) => void): () => void {
  return subscribe(() => fn(_region));
}

/** Convenience for child providers that only need a passthrough. */
export function RegionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
