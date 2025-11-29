import { networkManager } from "./network-manager.js";

function initContainer(container) {
  if (!container || container.getAttribute("data-cs-initialized") === "true") return;
  const btn = container.querySelector("#contractSearchBtn");
  const statusEl = container.querySelector("#contractSearchStatus");
  if (!btn) return;

  function showStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg || "";
    statusEl.classList.toggle("d-none", !msg);
  }

  function findChainId() {
    let raw = container.getAttribute("data-chainid") || "";
    if (!raw) {
      const fcid = document.getElementById("f_chainId");
      raw = fcid ? fcid.value : "";
    }
    if (!raw) {
      const ns = document.getElementById("networkSearch");
      raw = ns?.dataset?.chainId || "";
    }
    return raw;
  }

  async function detectSymbolName(addr, chainId) {
    try {
      const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
      const rpc = Array.isArray(net?.rpc) && net.rpc.length ? net.rpc[0] : typeof net?.rpc === "string" ? net.rpc : null;
      if (!rpc) return { symbol: null, name: null };
      const call = async (sig) => {
        const body = { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: String(addr), data: sig }, "latest"] };
        const resp = await fetch(rpc, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (!resp.ok) return null;
        const js = await resp.json();
        const hex = String(js?.result || "");
        if (!hex || hex === "0x") return null;
        const h = hex.replace(/^0x/, "");
        const b32 = h.slice(0, 64);
        const tryBytes32 = () => {
          const buf = b32.match(/.{1,2}/g) || [];
          let s = buf.map((x) => String.fromCharCode(parseInt(x, 16))).join("");
          s = Array.from(s)
            .filter((ch) => ch.charCodeAt(0) !== 0)
            .join("");
          return s.trim();
        };
        let out = tryBytes32();
        if (!out) {
          try {
            const lenHex = h.slice(64 * 2, 64 * 3);
            const len = parseInt(lenHex, 16);
            const start = 64 * 3;
            const strHex = h.slice(start, start + len * 2);
            const buf = strHex.match(/.{1,2}/g) || [];
            out = buf
              .map((x) => String.fromCharCode(parseInt(x, 16)))
              .join("")
              .trim();
          } catch (_) {
            out = "";
          }
        }
        return out || null;
      };
      const sym = await call("0x95d89b41");
      const nam = await call("0x06fdde03");
      return { symbol: sym, name: nam };
    } catch {
      return { symbol: null, name: null };
    }
  }

  async function fetchSourcify(chainId, address) {
    try {
      const url = `https://sourcify.dev/server/files/${parseInt(chainId, 10)}/${String(address).toLowerCase()}`;
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const files = await resp.json();
      const metaFile = Array.isArray(files) ? files.find((f) => f?.name === "metadata.json") : null;
      if (!metaFile?.content) return null;
      const meta = JSON.parse(metaFile.content);
      const ct = meta?.settings?.compilationTarget || {};
      const firstFile = Object.keys(ct)[0] || null;
      const cName = firstFile ? ct[firstFile] : null;
      const srcContent = firstFile && meta?.sources?.[firstFile]?.content ? meta.sources[firstFile].content : "";
      const fqn = firstFile && cName ? `${firstFile}:${cName}` : cName ? `${cName}.sol:${cName}` : "";
      return { meta, srcContent, cName, fqn };
    } catch {
      return null;
    }
  }

  async function runSearch() {
    showStatus("Buscando...");
    const addrField = document.getElementById("f_address");
    const addrRaw = (addrField?.value || "").trim();
    const okAddr = /^0x[0-9a-fA-F]{40}$/.test(addrRaw);
    const chainIdRaw = findChainId();
    if (!okAddr || !chainIdRaw) {
      showStatus("Informe endereço e rede.");
      return;
    }
    const sour = await fetchSourcify(chainIdRaw, addrRaw);
    let payload = { chainId: parseInt(chainIdRaw, 10), contractAddress: addrRaw };
    if (sour) {
      payload = { ...payload, metadata: JSON.stringify(sour.meta), sourceCode: sour.srcContent, contractName: sour.cName || "", contractNameFQN: sour.fqn || "", compilerVersion: sour.meta?.compiler?.version || "", runs: sour.meta?.settings?.optimizer?.runs ?? 200, optimizationUsed: sour.meta?.settings?.optimizer?.enabled ? 1 : 0 };
    }
    const sn = await detectSymbolName(addrRaw, chainIdRaw);
    // preencher diretamente o formulário (símbolo)
    try {
      const symEl = document.getElementById("f_tokenSymbol");
      if (symEl && sn.symbol) symEl.value = sn.symbol;
    } catch {}
    try {
      sessionStorage.setItem("tokencafe_last_contract", addrRaw);
    } catch {}
    const evt = new CustomEvent("contract:found", { detail: { contract: payload }, bubbles: true });
    container.dispatchEvent(evt);
    showStatus("");
  }

  btn.addEventListener("click", runSearch);
  container.setAttribute("data-cs-initialized", "true");
}

function findContainers() {
  const nodes = document.querySelectorAll('[data-component*="contract-search.html"]');
  nodes.forEach(initContainer);
}

findContainers();
const observer = new MutationObserver(() => {
  findContainers();
});
observer.observe(document.body, { childList: true, subtree: true });
