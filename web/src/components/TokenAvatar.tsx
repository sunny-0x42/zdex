import { tokenHue, tokenIconSrc, tokenInitials } from "../lib/tokenIcons";

export default function TokenAvatar({ symbol, size = 36 }: { symbol: string; size?: number }) {
  const src = tokenIconSrc(symbol);
  const gnot = /^(ugnot|gnot)$/i.test(symbol || "");
  if (src) {
    return (
      <img
        className={`tok-av tok-av-img${gnot ? " tok-av-gnot" : ""}`}
        src={src}
        alt=""
        width={size}
        height={size}
      />
    );
  }
  const label = tokenInitials(symbol);
  const hue = tokenHue(symbol);
  const fs = Math.max(8, Math.min(size * (label.length > 3 ? 0.28 : 0.34), 14));
  return (
    <div
      className="tok-av tok-av-letters"
      style={{
        width: size,
        height: size,
        fontSize: fs,
        background: `hsl(${hue} 38% 22%)`,
        color: `hsl(${hue} 70% 82%)`,
      }}
      title={symbol}
    >
      {label}
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
