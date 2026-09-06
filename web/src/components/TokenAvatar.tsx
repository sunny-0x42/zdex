const ICONS: Record<string, string> = {
  GNOT: "/token-gnot.jpg",
  UGNOT: "/token-gnot.jpg",
  ZDEX: "/token-zdex.jpg",
};

export default function TokenAvatar({ symbol, size = 36 }: { symbol: string; size?: number }) {
  const s = (symbol || "?").toUpperCase();
  const src = ICONS[s];
  if (src) {
    return <img className="tok-av tok-av-img" src={src} alt="" width={size} height={size} />;
  }
  return (
    <div className="tok-av" style={{ width: size, height: size, fontSize: Math.max(10, size * 0.34) }}>
      {s.slice(0, 2)}
    </div>
  );
}

export function PairAvatars({ symbol, size = 32 }: { symbol: string; size?: number }) {
  return (
    <div className="pair-stack" aria-hidden="true">
      <TokenAvatar symbol={symbol} size={size} />
      <TokenAvatar symbol="GNOT" size={size} />
    </div>
  );
}

export function TokenChip({ symbol }: { symbol: string }) {
  return (
    <div className="token-chip">
      <TokenAvatar symbol={symbol} size={22} />
      <span>{symbol}</span>
    </div>
  );
}
