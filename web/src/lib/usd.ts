import type { Pool } from "../types";

/** GNOT USD from GNOT/USDC or GNOT/USDT reserves (6-dec / 6-dec). Null if no peg pool. */
export function gnotUsdFromPools(pools: Pool[] | undefined): number | null {
  const peg = (pools || []).find((p) => p.symbol === "USDC" || p.symbol === "USDT");
  if (!peg) return null;
  const u = Number(peg.reserveU);
  const t = Number(peg.reserveT);
  if (!(u > 0) || !(t > 0)) return null;
  return t / u;
}

export function ugnotToUsd(ugnot: string | number | bigint | undefined, gnotUsd: number | null): number | null {
  if (gnotUsd == null) return null;
  const n = Number(ugnot);
  if (!Number.isFinite(n)) return null;
  return (n / 1e6) * gnotUsd;
}

/** 50/50 CPMM: both legs ≈ GNOT-side USD. */
export function poolTvlUsd(p: { reserveU?: string | number }, gnotUsd: number | null): number | null {
  if (gnotUsd == null) return null;
  const u = Number(p.reserveU);
  if (!Number.isFinite(u)) return null;
  return 2 * (u / 1e6) * gnotUsd;
}

/** USD for 1 whole token (6-dec) from GNOT mark × tokens-per-GNOT. */
export function tokenUsd(p: { quote1gnot?: string; reserveU?: string; reserveT?: string }, gnotUsd: number | null): number | null {
  if (gnotUsd == null) return null;
  let perGnot = Number(p.quote1gnot);
  if (!(perGnot > 0)) {
    const u = Number(p.reserveU);
    const t = Number(p.reserveT);
    if (u > 0 && t > 0) perGnot = (t / u) * 1e6;
  }
  if (!(perGnot > 0)) return null;
  return gnotUsd / (perGnot / 1e6);
}

export function fmtUsd(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (abs >= 1) return `${sign}$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (abs >= 0.01) return `${sign}$${abs.toFixed(4)}`;
  if (abs === 0) return "$0.00";
  return `${sign}$${abs.toExponential(2)}`;
}
