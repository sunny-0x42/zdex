import { dispatch } from "../chain.mjs";

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  try {
    const url = new URL(req.url, "http://localhost");
    const out = await dispatch(url.pathname, url.searchParams);
    if (!out) {
      res.status(404).json({ error: "not found" });
      return;
    }
    res.status(out.status).json(out.body);
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
}
