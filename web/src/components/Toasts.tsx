import { useDex } from "../context";

export default function Toasts() {
  const { toasts } = useDex();
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.msg}
          {t.hash ? (
            <button className="link" type="button" onClick={() => navigator.clipboard.writeText(t.hash || "")}>
              {" "}
              {t.hash.slice(0, 12)}…
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
