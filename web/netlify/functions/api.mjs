import { dispatch } from "../../chain.mjs";

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,OPTIONS",
      },
    };
  }
  try {
    const raw = event.rawUrl || `https://zdex.local${event.path}${event.rawQuery ? `?${event.rawQuery}` : ""}`;
    const url = new URL(raw);
    let pathname = url.pathname.replace(/^\/\.netlify\/functions\/api/, "/api");
    if (!pathname.startsWith("/api")) pathname = "/api" + (pathname.startsWith("/") ? pathname : `/${pathname}`);
    const q = event.queryStringParameters ? event.rawQuery || "" : url.search.slice(1);
    const params = new URLSearchParams(q || url.searchParams);
    const out = await dispatch(pathname, params);
    if (!out) {
      return json(404, { error: "not found" });
    }
    return json(out.status, out.body);
  } catch (e) {
    return json(500, { error: String(e.message || e) });
  }
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
    },
    body: JSON.stringify(body),
  };
}
