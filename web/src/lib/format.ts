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

export function shortAddr(a: string | undefined | null): string {
  if (!a) return "—";
  return a.slice(0, 8) + "…" + a.slice(-5);
}

export function parseUgnot(coins: string | undefined | null): bigint {
  if (!coins) return 0n;
  const m = String(coins).match(/(\d+)\s*ugnot/i);
  return m ? BigInt(m[1]) : 0n;
}
