import type { Pool } from "../types";

export function mulDiv(a: bigint, b: bigint, d: bigint): bigint {
  if (d === 0n) return 0n;
  return (a * b) / d;
}

export function mulDivCeil(a: bigint, b: bigint, d: bigint): bigint {
  if (d === 0n) return 0n;
  const q = (a * b) / d;
  return q * d < a * b ? q + 1n : q;
}

export function amountOut(
  amountIn: bigint,
  reserveIn: bigint,
  virtualIn: bigint,
  reserveOut: bigint,
  virtualOut: bigint,
  feeBps: bigint,
): bigint {
  if (amountIn <= 0n) return 0n;
  const x = reserveIn + virtualIn;
  const y = reserveOut + virtualOut;
  if (x <= 0n || y <= 0n) return 0n;
  const fee = mulDiv(amountIn, feeBps, 10000n);
  const net = amountIn - fee;
  if (net <= 0n) return 0n;
  const out = mulDiv(net, y, x + net);
  if (out <= 0n || out >= y || out >= reserveOut) return 0n;
  return out;
}

export function quoteLocal(p: Pool | null | undefined, tokenIn: string, amountIn: bigint): bigint {
  if (!p || amountIn <= 0n) return 0n;
  const ru = BigInt(p.reserveU);
  const rt = BigInt(p.reserveT);
  const vu = BigInt(p.virtualU);
  const fee = BigInt(p.feeBps || 0);
  if (tokenIn === "ugnot") return amountOut(amountIn, ru, vu, rt, 0n, fee);
  return amountOut(amountIn, rt, 0n, ru, 0n, fee);
}

export function quoteInLocal(p: Pool | null | undefined, tokenOut: string, amountOutWanted: bigint): bigint {
  if (!p || amountOutWanted <= 0n) return 0n;
  const ru = BigInt(p.reserveU);
  const rt = BigInt(p.reserveT);
  const vu = BigInt(p.virtualU);
  const fee = BigInt(p.feeBps || 0);
  const xIn = tokenOut === "ugnot" ? rt : ru;
  const vIn = tokenOut === "ugnot" ? 0n : vu;
  const xOut = tokenOut === "ugnot" ? ru : rt;
  if (amountOutWanted >= xOut) return 0n;
  const x = xIn + vIn;
  const y = xOut;
  if (x <= 0n || y <= 0n || amountOutWanted >= y) return 0n;
  const net = mulDivCeil(amountOutWanted, x, y - amountOutWanted);
  let inn = mulDivCeil(net, 10000n, 10000n - fee);
  const got = amountOut(inn, xIn, vIn, xOut, 0n, fee);
  if (got < amountOutWanted) inn += 1n;
  return inn;
}

/** Annualized LP fee APR from 24h volume. Legacy launch pools keep 50% of the swap fee; AMM pools keep ~5/6. */
export function lpFeeAprPct(p: Pool): number | null {
  const tvl = Number(p.reserveU);
  const vol = Number(p.volumeU || 0);
  if (!(tvl > 0) || !(vol > 0)) return null;
  const fee = Number(p.feeBps || 0) / 10000;
  const lpShare = p.launched ? 0.5 : (10000 - 1667) / 10000;
  return (vol * fee * lpShare) / tvl * 365 * 100;
}

export function sparkPath(values: number[] | undefined, w: number, h: number): string {
  if (!values || values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
