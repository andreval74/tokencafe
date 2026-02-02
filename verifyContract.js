const fs = require("fs");
const crypto = require("crypto");

function log(level, msg) {
  const ts = new Date().toISOString();
  const tag = level.toUpperCase();
  console.log(`[${tag}] ${msg}`);
}

function sha256(str) {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function normalizeText(input) {
  try {
    let s = String(input || "");
    s = s.replace(/\r\n|\r/g, "\n");
    s = s.replace(/\/\*[\s\S]*?\*\//g, "");
    s = s
      .split("\n")
      .map((line) => line.replace(/(^|[^:])\/\/.*$/g, "$1"))
      .join("\n");
    s = s
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter((line) => line.length > 0)
      .join("\n");
    return s;
  } catch (_) {
    return String(input || "");
  }
}

async function fetchContractFromEtherscan(address, apiKey) {
  try {
    if (!address || !apiKey) {
      return { ok: false, code: "INVALID_PARAMS", message: "Endereço ou API key ausentes", details: null };
    }
    const qs = new URLSearchParams();
    qs.append("module", "contract");
    qs.append("action", "getsourcecode");
    qs.append("address", String(address));
    qs.append("apikey", String(apiKey));
    const url = `https://api.etherscan.io/api?${qs.toString()}`;
    const resp = await fetch(url, { method: "GET" });
    const json = await resp.json().catch(async () => ({ status: "0", message: "invalid_json", result: await resp.text() }));
    const status = String(json?.status || "0");
    const message = String(json?.message || "");
    const rawResult = json?.result;
    const result = Array.isArray(rawResult) ? rawResult : [];
    if (status !== "1") {
      const txt = typeof rawResult === "string" ? rawResult : "";
      const dep = /deprecated\s+v1/i.test(message) || /deprecated\s+v1/i.test(txt);
      const noKey = /api key/i.test(message) || /api key/i.test(txt);
      if (dep) return { ok: false, code: "API_DEPRECATED", message: message || txt || "Endpoint V1 depreciado", details: json };
      if (noKey) return { ok: false, code: "INVALID_API_KEY", message: message || txt || "API key inválida/ausente", details: json };
      return { ok: false, code: "API_ERROR", message: message || "Falha na API", details: json };
    }
    const first = result[0] || {};
    const srcRaw = String(first?.SourceCode || "");
    const verified = !!srcRaw && srcRaw.length > 0;
    if (!verified) {
      return { ok: false, code: "NOT_VERIFIED", message: "Contrato não verificado", details: json };
    }
    let remoteSource = srcRaw;
    let files = [];
    let multiple = false;
    let parsed = null;
    try {
      let toParse = srcRaw;
      if (toParse.startsWith("{{") && toParse.endsWith("}}")) {
        toParse = toParse.slice(1, -1);
      }
      parsed = JSON.parse(toParse);
    } catch (_) {}
    if (parsed && parsed.sources && typeof parsed.sources === "object") {
      const names = Object.keys(parsed.sources);
      files = names.slice().sort();
      multiple = files.length > 1;
      const parts = files.map((n) => String(parsed.sources[n]?.content || ""));
      remoteSource = parts.join("\n\n");
    }
    return {
      ok: true,
      source: remoteSource,
      metadata: {
        contractName: String(first?.ContractName || ""),
        compilerVersion: String(first?.CompilerVersion || ""),
        files,
        multiple,
      },
    };
  } catch (e) {
    return { ok: false, code: "UNEXPECTED", message: e?.message || String(e), details: null };
  }
}

function readLocalContract(filePath) {
  try {
    if (!filePath) return { ok: false, code: "INVALID_PARAMS", message: "Caminho do arquivo ausente", details: null };
    if (!fs.existsSync(filePath)) return { ok: false, code: "FS_NOT_FOUND", message: "Arquivo não encontrado", details: { filePath } };
    if (!/\.sol$/i.test(filePath)) return { ok: false, code: "INVALID_EXT", message: "Extensão inválida, esperado .sol", details: { filePath } };
    const content = fs.readFileSync(filePath, "utf8");
    return { ok: true, source: content };
  } catch (e) {
    return { ok: false, code: "FS_ERROR", message: e?.message || String(e), details: null };
  }
}

function compareContracts(localSource, remoteSource) {
  try {
    const normLocal = normalizeText(localSource || "");
    const normRemote = normalizeText(remoteSource || "");
    const hLocal = sha256(normLocal);
    const hRemote = sha256(normRemote);
    if (hLocal === hRemote) {
      return { status: "IDENTICAL", identical: true, hashLocal: hLocal, hashRemote: hRemote, differences: [] };
    }
    const a = normLocal.split("\n");
    const b = normRemote.split("\n");
    const maxLen = Math.max(a.length, b.length);
    const diffs = [];
    for (let i = 0; i < maxLen; i++) {
      const left = i < a.length ? a[i] : "";
      const right = i < b.length ? b[i] : "";
      if (left !== right) diffs.push({ line: i + 1, local: left, remote: right });
      if (diffs.length >= 5000) break;
    }
    return { status: "DIFFERENT", identical: false, hashLocal: hLocal, hashRemote: hRemote, differences: diffs };
  } catch (e) {
    return { status: "ERROR", identical: false, error: e?.message || String(e) };
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const address = args[0];
    const apiKey = args[1];
    const filePath = args[2];
    if (!address || !apiKey || !filePath) {
      console.log("Uso: node verifyContract.js <address> <apiKey> <path>");
      process.exitCode = 1;
      return;
    }
    log("INFO", "Lendo contrato local...");
    const local = readLocalContract(filePath);
    if (!local.ok) {
      log("ERROR", `${local.code}: ${local.message}`);
      process.exitCode = 2;
      return;
    }
    log("INFO", "Buscando código on-chain...");
    const remote = await fetchContractFromEtherscan(address, apiKey);
    if (!remote.ok) {
      if (remote.code === "NOT_VERIFIED") {
        log("WARN", "Contrato não está verificado");
        if (remote.details) console.log(JSON.stringify(remote.details, null, 2));
        process.exitCode = 3;
        return;
      }
      log("ERROR", `${remote.code}: ${remote.message}`);
      if (remote.details) console.log(JSON.stringify(remote.details, null, 2));
      process.exitCode = 4;
      return;
    }
    const cmp = compareContracts(local.source, remote.source);
    if (cmp.identical) {
      log("SUCCESS", "Códigos idênticos ✔");
      console.log(`Local: ${cmp.hashLocal}`);
      console.log(`Remoto: ${cmp.hashRemote}`);
      process.exitCode = 0;
      return;
    }
    log("WARN", "Diferenças encontradas");
    console.log(`Local: ${cmp.hashLocal}`);
    console.log(`Remoto: ${cmp.hashRemote}`);
    const preview = cmp.differences.slice(0, 100);
    for (const d of preview) {
      console.log(`Linha ${d.line}`);
      console.log(`  Local : ${d.local}`);
      console.log(`  Remoto: ${d.remote}`);
    }
    if (cmp.differences.length > preview.length) {
      console.log(`(+${cmp.differences.length - preview.length} diferenças ocultadas)`);
    }
    process.exitCode = 5;
  } catch (e) {
    log("ERROR", e?.message || String(e));
    process.exitCode = 10;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fetchContractFromEtherscan,
  readLocalContract,
  compareContracts,
  main,
};
