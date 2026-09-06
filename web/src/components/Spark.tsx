import { sparkPath } from "../lib/amm";

export default function Spark({ values, w = 240, h = 72, className = "spark" }: { values?: number[]; w?: number; h?: number; className?: string }) {
  const d = sparkPath(values, w, h);
  return (
    <svg className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {d ? <path d={d} fill="none" stroke="#2a85ff" strokeWidth="2" /> : <path d={`M0 ${h / 2} H${w}`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />}
    </svg>
  );
}
