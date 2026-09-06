/** Official icons shipped in web/public/tokens. Unknown tickers use initials. */
const FILES: Record<string, string> = {
  GNOT: "/tokens/gnot.svg",
  UGNOT: "/tokens/gnot.svg",
  ATONE: "/tokens/atone.svg",
  UATONE: "/tokens/atone.svg",
  PHOTON: "/tokens/photon.svg",
  BTC: "/tokens/btc.svg",
  WBTC: "/tokens/wbtc.svg",
  ETH: "/tokens/eth.svg",
  WETH: "/tokens/eth.svg",
  USDC: "/tokens/usdc.svg",
  USDT: "/tokens/usdt.svg",
  DAI: "/tokens/dai.svg",
  SOL: "/tokens/sol.svg",
  ATOM: "/tokens/atom.svg",
  BNB: "/tokens/bnb.svg",
  AVAX: "/tokens/avax.svg",
  LINK: "/tokens/link.svg",
  UNI: "/tokens/uni.svg",
  MATIC: "/tokens/matic.svg",
  POL: "/tokens/matic.svg",
  TRX: "/tokens/trx.svg",
  XRP: "/tokens/xrp.svg",
  ADA: "/tokens/ada.svg",
  DOT: "/tokens/dot.svg",
  LTC: "/tokens/ltc.svg",
  DOGE: "/tokens/doge.svg",
  ZDEX: "/token-zdex.jpg",
};

const ALIAS: Record<string, string> = {
  UGNOT: "GNOT",
  UATONE: "ATONE",
  WETH: "ETH",
  "USDC.E": "USDC",
  USDCE: "USDC",
  USDT0: "USDT",
  POL: "MATIC",
};

export function normalizeSymbol(symbol: string): string {
  return String(symbol || "")
    .trim()
    .toUpperCase()
    .replace(/^\$/, "")
    .replace(/[^A-Z0-9.]/g, "");
}

export function tokenIconSrc(symbol: string): string | null {
  const s = normalizeSymbol(symbol);
  if (!s) return null;
  const key = ALIAS[s] || s;
  return FILES[key] || FILES[s] || null;
}

export function tokenInitials(symbol: string): string {
  const s = normalizeSymbol(symbol).replace(/\./g, "");
  if (!s) return "?";
  if (s.length <= 4) return s;
  return s.slice(0, 4);
}

export function tokenHue(symbol: string): number {
  const s = normalizeSymbol(symbol);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h % 360;
}
