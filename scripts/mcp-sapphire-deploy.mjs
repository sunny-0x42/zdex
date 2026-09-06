/**
 * Drive the patched gnomcp binary (sapphire-aware) over MCP stdio
 * to fund an agent key and addpkg zdex.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GNOMCP = process.env.GNOMCP || "C:\\Users\\Hi\\gno-mcp-src\\bin\\gnomcp.exe";
const PKG_DIR = path.resolve(__dirname, "..", "deploy", "zdex");
const OUT = path.resolve(__dirname, "..", "web", "config.js");

const child = spawn(GNOMCP, [], {
  stdio: ["pipe", "pipe", "pipe"],
  windowsHide: true,
});

let buf = "";
const pending = new Map();
let nextId = 1;
let stderr = "";

child.stderr.on("data", (d) => {
  stderr += d.toString();
});
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
child.on("exit", (code) => {
  if (pending.size) {
    const err = new Error(`gnomcp exited ${code}: ${stderr.slice(-800)}`);
    for (const { reject } of pending.values()) reject(err);
    pending.clear();
  }
});

function rpc(method, params) {
  const id = nextId++;
  const msg = { jsonrpc: "2.0", id, method, params };
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify(msg) + "\n");
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`timeout ${method}`));
      }
    }, 180000);
  });
}

function notify(method, params) {
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
}

function textOf(result) {
  if (!result) return "";
  if (typeof result === "string") return result;
  const c = result.content;
  if (Array.isArray(c)) {
    return c.map((x) => x.text || x.resource?.text || JSON.stringify(x)).join("\n");
  }
  if (result.structuredContent) return JSON.stringify(result.structuredContent);
  return JSON.stringify(result);
}

async function tool(name, args) {
  const result = await rpc("tools/call", { name, arguments: args || {} });
  const t = textOf(result);
  if (result?.isError) {
    throw new Error(t || JSON.stringify(result).slice(0, 12000));
  }
  return t;
}

function loadFiles() {
  return fs
    .readdirSync(PKG_DIR)
    .filter((n) => n.endsWith(".gno") && !n.endsWith("_test.gno"))
    .map((name) => ({
      name,
      body: fs.readFileSync(path.join(PKG_DIR, name), "utf8").replace(/\r\n/g, "\n").replace(/\r/g, "\n"),
    }));
}

function pickAddress(s) {
  const m = String(s).match(/g1[a-z0-9]{38,}/i);
  return m ? m[0] : "";
}

async function main() {
  await rpc("initialize", {
    protocolVersion: "2025-03-26",
    capabilities: {},
    clientInfo: { name: "zdex-deploy", version: "1" },
  });
  notify("notifications/initialized", {});

  let addr = "";
  try {
    const listed = await tool("gno_key_list", { profile: "testnet" });
    addr = pickAddress(listed);
    console.log("key_list:", listed.slice(0, 400));
  } catch (e) {
    console.log("key_list:", e.message);
  }
  if (!addr) {
    try {
      const gen = await tool("gno_key_generate", { profile: "testnet" });
      console.log("key_generate:", gen.slice(0, 600));
      addr = pickAddress(gen);
    } catch (e) {
      console.log("key_generate:", e.message);
      const listed = await tool("gno_key_list", { profile: "testnet" });
      addr = pickAddress(listed);
    }
  }
  if (!addr) {
    const a = await tool("gno_key_address", { profile: "testnet" });
    addr = pickAddress(a);
    console.log("key_address:", a);
  }
  if (!addr) throw new Error("no agent address");
  console.log("address", addr);

  try {
    const fund = await tool("gno_faucet_fund", { profile: "testnet" });
    console.log("faucet:", fund.slice(0, 800));
  } catch (e) {
    console.log("faucet:", e.message);
  }

  const files = loadFiles();
  const deployPath =
    process.env.DEPLOY_PATH || `gno.land/r/${addr}/v2/zdex`;
  files.push({
    name: "gnomod.toml",
    body: `module = "${deployPath}"\ngno = "0.9"\n`,
  });
  console.log(
    "files",
    files.map((f) => f.name).join(","),
    "bytes",
    files.reduce((n, f) => n + f.body.length, 0),
    "path",
    deployPath,
  );

  const addArgs = {
    profile: "testnet",
    deploy_path: deployPath,
    files,
  };
  let addRaw;
  try {
    addRaw = await rpc("tools/call", { name: "gno_addpkg", arguments: addArgs });
  } catch (e) {
    console.error("addpkg rpc", e.message);
    throw e;
  }
  console.log("addpkg raw", JSON.stringify(addRaw).slice(0, 16000));
  const deployed = textOf(addRaw);
  if (addRaw?.isError) throw new Error(deployed || JSON.stringify(addRaw).slice(0, 12000));
  console.log("addpkg:", deployed);

  const pkg = deployPath;
  const cfg = `export const NETWORK = {
  chainId: "sapphire-1",
  chainName: "Gno Sapphire",
  rpcUrl: "https://rpc.sapphire.testnets.gno.land:443",
  gnoweb: "https://sapphire.testnets.gno.land",
  faucet: "https://sapphire.testnets.gno.land/faucet",
};
export const PKG_PATH = ${JSON.stringify(pkg)};
export const DEPLOYER = ${JSON.stringify(addr)};
`;
  fs.writeFileSync(OUT, cfg);
  console.log("wrote", OUT);
  console.log("PKG", pkg);
}

main()
  .catch((e) => {
    console.error("FAIL", e.message);
    if (stderr) console.error("STDERR", stderr.slice(-4000));
    try {
      fs.writeFileSync(path.resolve(__dirname, "..", "web", "deploy-error.txt"), String(e.message) + "\n\nSTDERR\n" + stderr);
    } catch {}
    process.exitCode = 1;
  })
  .finally(() => {
    try {
      child.stdin.end();
    } catch {}
    setTimeout(() => {
      try {
        child.kill();
      } catch {}
      process.exit(process.exitCode || 0);
    }, 400);
  });
