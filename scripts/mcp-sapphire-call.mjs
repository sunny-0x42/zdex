import { spawn } from "node:child_process";

const GNOMCP = process.env.GNOMCP || "C:\\Users\\Hi\\gno-mcp-src\\bin\\gnomcp.exe";
const realm = "gno.land/r/g1y0n2geu0rmdrm9u30c5fmk3ykkl2enw9n9yr2k/zdex";
const child = spawn(GNOMCP, [], { stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
let buf = "";
const pending = new Map();
let nextId = 1;
child.stdout.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  buf += chunk;
  let idx;
  while ((idx = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, idx).trim();
    buf = buf.slice(idx + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  }
});
function rpc(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error("timeout"));
      }
    }, 120000);
  });
}
function textOf(result) {
  const c = result?.content;
  if (Array.isArray(c)) return c.map((x) => x.text || "").join("\n");
  return JSON.stringify(result);
}

const init = await rpc("initialize", {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "zdex-call", version: "1" },
});
child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized", params: {} }) + "\n");

const launch = await rpc("tools/call", {
  name: "gno_call",
  arguments: {
    profile: "testnet",
    realm,
    func: "Launch",
    args: ["SapphireDemo", "SDEM", "0", "1000000000", "1000", "3500000000", "28800", "28800", "1000", "200"],
  },
});
console.log(textOf(launch));
if (launch?.isError) process.exitCode = 1;
child.stdin.end();
setTimeout(() => {
  child.kill();
  process.exit(process.exitCode || 0);
}, 400);
