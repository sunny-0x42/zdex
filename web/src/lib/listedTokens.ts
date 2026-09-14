import { normalizeSymbol, tokenIconSrc } from "./tokenIcons";

/** Majors we show even before a pool exists (Liquidity import). Trade uses pools only. */
export const TOKEN_WHITELIST = new Set([
  "GNOT",
  "UGNOT",
  "USDC",
  "USDT",
  "BTC",
  "ETH",
  "ATONE",
  "ZDEX",
  "WUGNOT",
  "DAI",
]);

export function isListedToken(symbol: string, pooled?: boolean): boolean {
  if (pooled) return true;
  const s = normalizeSymbol(symbol);
  if (TOKEN_WHITELIST.has(s)) return true;
  return Boolean(tokenIconSrc(s) && ["GNOT", "USDC", "USDT", "BTC", "ETH", "ATONE", "ZDEX"].includes(s));
}

export function uniqueBySymbol<T extends { symbol: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of rows) {
    const k = (r.symbol || "").toUpperCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(r);
  }
  return out;
}
