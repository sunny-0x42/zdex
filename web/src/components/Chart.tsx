import { sparkPath } from "../lib/amm";

export default function Chart({
  title,
  hint,
  values,
  color = "#4c82fb",
}: {
  title: string;
  hint?: string;
  values?: number[];
  color?: string;
}) {
  const w = 320;
  const h = 88;
  const d = sparkPath(values, w, h);
  const last = values && values.length ? values[values.length - 1] : null;
  return (
    <div className="chart-card">
      <div className="chart-head">
        <span>{title}</span>
        {last != null ? <b>{last}</b> : <b className="muted">—</b>}
      </div>
      <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {d ? (
          <path d={d} fill="none" stroke={color} strokeWidth="2" />
        ) : (
          <path d={`M0 ${h / 2} H${w}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        )}
      </svg>
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}
