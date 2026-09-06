/**
 * zdex UI + live chain proxy
 *   node server.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_NET,
  NETWORK,
  NETWORKS,
  PKG_PATH,
  POLL_MS,
  dispatch,
  liveByNet,
  pollNet,
} from "./chain.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const DIST = path.join(__dirname, "dist");
const sseClients = new Set();

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".map": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
};

function json(res, code, obj) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(obj));
}

function staticDir() {
  return fs.existsSync(path.join(DIST, "index.html")) ? DIST : __dirname;
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath);
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    res.end(buf);
  });
}

async function broadcast(netId) {
  try {
    const snap = await pollNet(netId);
    const payload = `data: ${JSON.stringify(snap)}\n\n`;
    for (const client of sseClients) {
      if (client.net !== netId) continue;
      try {
        client.res.write(payload);
      } catch {
        sseClients.delete(client);
      }
    }
  } catch {
    /* keep last snapshot */
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,OPTIONS",
    });
    res.end();
    return;
  }
  try {
    if (url.pathname === "/api/stream") {
      const netId = url.searchParams.get("net") || DEFAULT_NET;
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "access-control-allow-origin": "*",
      });
      res.write("retry: 2000\n\n");
      const cached = liveByNet.get(netId);
      if (cached) res.write(`data: ${JSON.stringify(cached)}\n\n`);
      const client = { res, net: netId };
      sseClients.add(client);
      req.on("close", () => sseClients.delete(client));
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      const out = await dispatch(url.pathname, url.searchParams);
      if (!out) {
        json(res, 404, { error: "not found" });
        return;
      }
      json(res, out.status, out.body);
      return;
    }
    const root = path.resolve(staticDir());
    let file = url.pathname === "/" ? "index.html" : url.pathname.replace(/^\/+/, "");
    if (!path.extname(file)) file = "index.html";
    if (file.includes("..")) {
      res.writeHead(403, { "content-type": "text/plain" });
      res.end("forbidden");
      return;
    }
    serveFile(res, path.resolve(root, file));
  } catch (e) {
    json(res, 500, { error: String(e.message || e) });
  }
});

server.listen(PORT, () => {
  console.log(`zdex UI  http://127.0.0.1:${PORT}`);
  console.log(`default  ${DEFAULT_NET}  ${NETWORK.rpcUrl}`);
  console.log(`PKG      ${PKG_PATH}`);
  for (const id of Object.keys(NETWORKS)) broadcast(id);
  setInterval(() => {
    for (const id of Object.keys(NETWORKS)) broadcast(id);
  }, POLL_MS);
});
