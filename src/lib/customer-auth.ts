import { SAMPLE_PORTFOLIOS_BY_REGION } from "@/lib/sample-portfolios";
import type { SavedPortfolio } from "@/lib/sample-portfolios";
import { getCurrentRegion, type Region } from "@/lib/region";

const KEY = "mpower.customer.session.v1";

export type CustomerSession = {
  email: string;
  name: string;
  portfolioId: string;
  region: Region;
  riskProfile: "Conservative" | "Moderate" | "Aggressive" | "Balanced";
  loggedInAt: number;
};

export function getSession(): CustomerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setSession(s: CustomerSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function availableInvestors(region?: Region): SavedPortfolio[] {
  const r = region ?? getCurrentRegion();
  return SAMPLE_PORTFOLIOS_BY_REGION[r] ?? [];
}

export function getSessionPortfolio(): SavedPortfolio | null {
  const s = getSession();
  if (!s) return null;
  const list = SAMPLE_PORTFOLIOS_BY_REGION[s.region] ?? [];
  return list.find(p => p.id === s.portfolioId) ?? list[0] ?? null;
}

/** Deterministic pseudo-random from string → [0,1). */
function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 10000) / 10000;
}
export function pseudoRandom(str: string, min = 0, max = 1): number {
  return min + seedFrom(str) * (max - min);
}
