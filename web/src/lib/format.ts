export const UGNOT = 1_000_000n;

export function fmtInt(n: string | number | bigint): string {
  try {
    return BigInt(n).toLocaleString("en-US");
  } catch {
    return String(n);
  }
}

export function fmtGnot(ugnot: string | number | bigint): string {
  let n: bigint;
  try {
    n = BigInt(ugnot);
  } catch {
    return "0";
  }
  const neg = n < 0n;
  if (neg) n = -n;
  const w = n / UGNOT;
  const f = (n % UGNOT).toString().padStart(6, "0").replace(/0+$/, "");
  return `${neg ? "-" : ""}${w.toLocaleString("en-US")}${f ? "." + f : ""}`;
}

export function toUgnot(human: string): bigint {
  const s = String(human || "0").trim();
  if (!s) return 0n;
  const [w, frac = ""] = s.split(".");
  const f = (frac + "000000").slice(0, 6);
  return BigInt(w || "0") * UGNOT + BigInt(f || "0");
}

/** Whole-token amount → GRC20 base units. decimals 0 keeps the integer. */
export function toTokenBase(human: string, decimals: number): bigint {
  const s = String(human || "0").trim().replace(/,/g, "");
  if (!s || s.startsWith("-")) return 0n;
  const d = Math.max(0, Math.min(18, Number(decimals) || 0));
  const [w, frac = ""] = s.split(".");
  const whole = BigInt(w || "0");
  if (d === 0) return whole;
  const f = (frac + "0".repeat(d)).slice(0, d);
  return whole * 10n ** BigInt(d) + BigInt(f || "0");
}

/** Registry key `gno.land/r/…/pkg.SYMBOL` → token realm path. */
export function tokenPkgFromKey(key: string): string {
  let k = String(key || "").trim();
  k = k.replace(/\.\d+$/, "");
  const i = k.lastIndexOf(".");
  if (i <= 0) return "";
  const pkg = k.slice(0, i);
  return pkg.startsWith("gno.land/") ? pkg : "";
}

export function shortAddr(a: string | undefined | null): string {
  if (!a) return "—";
  return a.slice(0, 8) + "…" + a.slice(-5);
}

export function parseUgnot(coins: string | undefined | null): bigint {
  if (!coins) return 0n;
  const m = String(coins).match(/(\d+)\s*ugnot/i);
  return m ? BigInt(m[1]) : 0n;
}
