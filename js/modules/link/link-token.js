import { NetworkManager } from "../../shared/network-manager.js";
import { SharedUtilities } from "../../core/shared_utilities_es6.js";

const networkManager = new NetworkManager();
const utils = new SharedUtilities();


const isValidAddress = (addr) => utils.isValidEthereumAddress(addr);

function getFallbackRpc(chainId) {
  switch (Number(chainId)) {
    case 56:
      return "https://bsc-dataseed.binance.org";
    case 97:
      return "https://bsc-testnet.publicnode.com";
    case 1:
      return "https://eth.llamarpc.com";
    case 137:
      return "https://polygon-rpc.com";
    default:
      return "";
  }
}

function getFallbackExplorer(chainId) {
  switch (Number(chainId)) {
    case 56:
      return "https://bscscan.com";
    case 97:
      return "https://testnet.bscscan.com";
    case 1:
      return "https://etherscan.io";
    case 137:
      return "https://polygonscan.com";
    default:
      return "";
  }
}

function getFallbackChainName(chainId) {
  switch (Number(chainId)) {
    case 56:
      return "BNB Smart Chain";
    case 97:
      return "BNB Smart Chain Testnet";
    case 1:
      return "Ethereum Mainnet";
    case 137:
      return "Polygon Mainnet";
    default:
      return "";
  }
}

function getFallbackNativeCurrency(chainId) {
  switch (Number(chainId)) {
    case 56:
      return { name: "BNB", symbol: "BNB", decimals: 18 };
    case 97:
      return { name: "BNB", symbol: "tBNB", decimals: 18 };
    case 1:
      return { name: "ETH", symbol: "ETH", decimals: 18 };
    case 137:
      return { name: "MATIC", symbol: "MATIC", decimals: 18 };
    default:
      return { name: "Unknown", symbol: "TKN", decimals: 18 };
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function renderSummary(params, network) {
  const address = params.get("address") || "";
  const name = params.get("name") || "";
  const symbol = params.get("symbol") || "";
  const decimals = params.get("decimals") || "";
  const chainId = params.get("chainId") || network?.chainId || "";
  const explorerParam = params.get("explorer") || "";
  const explorer = network?.explorers?.[0]?.url || explorerParam || getFallbackExplorer(chainId);
  const chainName = params.get("chainName") || network?.name || getFallbackChainName(chainId);
  setText("viewAddress", address);
  setText("viewChainName", chainName || "-");
  setText("viewChainId", String(chainId || "-"));
  setText("viewName", name || "-");
  setText("viewSymbol", symbol || "-");
  setText("viewDecimals", String(decimals || "-"));
  const exp = document.getElementById("viewExplorer");
  if (exp) {
    exp.href = explorer && isValidAddress(address) ? `${String(explorer).replace(/\/$/, "")}/address/${address}` : "#";
    exp.classList.toggle("disabled", !explorer || !isValidAddress(address));
  }
}

function decodeString(hex) {
  const h = String(hex || "").replace(/^0x/, "");
  if (!h) return null;
  try {
    const b32 = h.slice(0, 64);
    const buf = b32.match(/.{1,2}/g) || [];
    let s = buf.map((x) => String.fromCharCode(parseInt(x, 16))).join("");
    s = Array.from(s)
      .filter((ch) => ch.charCodeAt(0) !== 0)
      .join("");
    {
      const st = s.replace(/\s+$/u, "");
      if (st) return st;
    }
    const lenHex = h.slice(64, 128);
    const len = parseInt(lenHex, 16);
    const start = 128;
    const strHex = h.slice(start, start + len * 2);
    const b = strHex.match(/.{1,2}/g) || [];
    return (
      b
        .map((x) => String.fromCharCode(parseInt(x, 16)))
        .join("")
        .replace(/\s+$/u, "") || null
    );
  } catch (_) {
    return null;
  }
}

function toBigInt(hex) {
  try {
    const h = String(hex || "").replace(/^0x/, "");
    if (!h) return 0n;
    return BigInt("0x" + h);
  } catch (_) {
    return 0n;
  }
}

function formatUnits(hex, d) {
  try {
    const v = toBigInt(hex);
    const dec = Number.isFinite(d) ? d : 18;
    const base = 10n ** BigInt(dec);
    const whole = v / base;
    const frac = v % base;
    const fracStr = frac.toString().padStart(dec, "0").replace(/0+$/, "");
    return fracStr ? `${whole.toString()}.${fracStr}` : whole.toString();
  } catch (_) {
    return "0";
  }
}

let lastMeta = { symbol: null, decimals: null };
const metaCache = new Map();

function getCandidateRpcs(chainId, network, params) {
  const list = [];
  const fromLink = params?.get("rpc") || "";
  if (fromLink) list.push(fromLink);
  const arr = Array.isArray(network?.rpc) ? network.rpc : [];
  for (const u of arr) if (u) list.push(u);
  const fb = getFallbackRpc(chainId);
  if (fb) list.push(fb);
  const seen = new Set();
  const out = [];
  for (const u of list) {
    const k = String(u).trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

async function fetchWithTimeout(url, init, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 2500);
  try {
    const r = await fetch(url, { ...(init || {}), signal: ctrl.signal });
    try {
      const j = await r.json();
      clearTimeout(t);
      return j;
    } catch (_) {
      clearTimeout(t);
      return null;
    }
  } catch (_) {
    clearTimeout(t);
    return null;
  }
}

async function rpcMultiTimed(rpcs, bodies, timeoutMs) {
  const tasks = (Array.isArray(rpcs) ? rpcs : []).map((rpc) =>
    new Promise((resolve, reject) => {
      (async () => {
        const bat = await fetchWithTimeout(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(bodies) }, timeoutMs);
        if (Array.isArray(bat)) return resolve(bat);
        const singles = await Promise.all(
          bodies.map((b) =>
            fetchWithTimeout(rpc, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }, timeoutMs),
          ),
        );
        if (Array.isArray(singles) && singles.length === bodies.length) {
          const merged = singles.map((res, i) => ({ id: bodies[i].id, result: res && res.result }));
          if (merged.some((x) => x && x.result != null)) return resolve(merged);
        }
        reject(new Error("bad"));
      })();
    }),
  );
  try {
    const best = await Promise.any(tasks);
    return best;
  } catch (_) {
    return null;
  }
}

async function rpcMulti(rpc, bodies) {
  try {
    const resp = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bodies),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (Array.isArray(resp)) return resp;
    const singles = await Promise.all(
      bodies.map((b) =>
        fetch(rpc, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(b),
        })
          .then((r) => r.json())
          .catch(() => null),
      ),
    );
    return singles.map((res, i) => ({ id: bodies[i].id, result: res && res.result }));
  } catch (_) {
    return null;
  }
}

async function readTokenMeta(address, network, params) {
  try {
    if (!isValidAddress(address)) return {};
    const chainId = params?.get("chainId") || network?.chainId || "";
    const key = `${chainId}:${String(address).toLowerCase()}`;
    try {
      const c = metaCache.get(key);
      if (c && Date.now() - c.ts < 30000) return { symbol: c.symbol, decimals: c.decimals };
    } catch (_) {}
    const rpcs = getCandidateRpcs(chainId, network, params);
    if (!rpcs.length) return {};
    const bodies = [
      { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: String(address), data: "0x95d89b41" }, "latest"] },
      { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: String(address), data: "0x313ce567" }, "latest"] },
    ];
    const useResp = await rpcMultiTimed(rpcs, bodies, 2500);
    if (!Array.isArray(useResp)) return {};
    const symHex = (useResp.find((x) => x && x.id === 1) || {}).result || null;
    const decHex = (useResp.find((x) => x && x.id === 2) || {}).result || null;
    const symbol = decodeString(symHex) || null;
    let decimals = null;
    try {
      const h = String(decHex || "").replace(/^0x/, "");
      decimals = h ? parseInt(h, 16) : null;
    } catch (_) {}
    if (symbol || decimals != null) {
      const badge = document.getElementById("metaValidatedBadgeLt");
      if (badge) badge.classList.remove("d-none");
    }
    try { metaCache.set(key, { symbol, decimals, ts: Date.now() }); } catch (_) {}
    return { symbol, decimals };
  } catch (_) {
    return {};
  }
}

async function enrichFromRpc(params, network) {
  try {
    const address = params.get("address") || "";
    const chainId = params.get("chainId") || network?.chainId || "";
    if (!isValidAddress(address) || !chainId) return;
    const rpcs = getCandidateRpcs(chainId, network, params);
    if (!rpcs.length) return;
    const bodies = [
      { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: String(address), data: "0x95d89b41" }, "latest"] },
      { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: String(address), data: "0x06fdde03" }, "latest"] },
      { jsonrpc: "2.0", id: 3, method: "eth_call", params: [{ to: String(address), data: "0x313ce567" }, "latest"] },
      { jsonrpc: "2.0", id: 4, method: "eth_getBalance", params: [String(address), "latest"] },
      { jsonrpc: "2.0", id: 5, method: "eth_call", params: [{ to: String(address), data: "0x18160ddd" }, "latest"] },
    ];
    let useResp = await rpcMultiTimed(rpcs, bodies, 2500);
    if (!Array.isArray(useResp)) return;
    const symHex = (useResp.find((x) => x && x.id === 1) || {}).result || null;
    const namHex = (useResp.find((x) => x && x.id === 2) || {}).result || null;
    const decHex = (useResp.find((x) => x && x.id === 3) || {}).result || null;
  const natHex = (useResp.find((x) => x && x.id === 4) || {}).result || null;
  const tsHex = (useResp.find((x) => x && x.id === 5) || {}).result || null;
    const name = decodeString(namHex) || "";
    const symbol = decodeString(symHex) || "";
    let decimals = null;
    try {
      const h = String(decHex || "").replace(/^0x/, "");
      decimals = h ? parseInt(h, 16) : null;
    } catch (_) {}
  const vName = document.getElementById("viewName");
  const vSymbol = document.getElementById("viewSymbol");
  const vDec = document.getElementById("viewDecimals");
  const vNat = document.getElementById("viewNativeBalance");
  const vSupply = document.getElementById("viewTotalSupply");
    const nameParam = params.get("name") || "";
    const symbolParam = params.get("symbol") || "";
    const decimalsParam = params.get("decimals") || "";
    if (vName && !nameParam && name) vName.textContent = name;
    if (vSymbol && !symbolParam && symbol) vSymbol.textContent = symbol;
    if (vDec && !decimalsParam && decimals != null) vDec.textContent = String(decimals);
  if (vNat && natHex) vNat.textContent = formatUnits(natHex, 18);
  if (vSupply && tsHex) vSupply.textContent = formatUnits(tsHex, Number.isFinite(decimals) ? decimals : 18);
    lastMeta.symbol = symbol || null;
    lastMeta.decimals = decimals != null ? decimals : null;
    const badge = document.getElementById("metaValidatedBadgeLt");
    if (badge && (symbol || decimals != null)) badge.classList.remove("d-none");
    const sParam = symbolParam;
    const dParam = decimalsParam;
    if (!sParam && symbol) params.set("symbol", symbol);
    if (!dParam && decimals != null) params.set("decimals", String(decimals));
  } catch (_) {}
}

async function addToWallet(params, network) {
  try {
    if (!window.ethereum) {
      window.notify && window.notify("Carteira não detectada", "warning");
      return;
    }
    const address = params.get("address") || "";
    // Enriquecer proativamente antes da primeira tentativa, para evitar mismatch na MetaMask
    if (!lastMeta.symbol || lastMeta.decimals == null) {
      const meta = await readTokenMeta(address, network, params);
      if (meta.symbol) lastMeta.symbol = meta.symbol;
      if (meta.decimals != null) lastMeta.decimals = meta.decimals;
      if (meta.symbol || meta.decimals != null) {
        try {
          if (!params.get("symbol") && meta.symbol) params.set("symbol", meta.symbol);
          if (!params.get("decimals") && meta.decimals != null) params.set("decimals", String(meta.decimals));
        } catch (_) {}
      }
    }
    let symbol = ((lastMeta.symbol || params.get("symbol") || "TKN")).slice(0, 32);
    let decimalsRaw = (lastMeta.decimals != null ? String(lastMeta.decimals) : (params.get("decimals") || "18"));
    let decimals = parseInt(decimalsRaw, 10);
    const image = params.get("image") || "";
    if (!isValidAddress(address)) {
      window.notify && window.notify("Endereço inválido", "error");
      return;
    }
    const chainId = Number(params.get("chainId") || network?.chainId);
    const targetHex = "0x" + Number(chainId).toString(16);
    const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
    if (!currentHex || String(parseInt(currentHex, 16)) !== String(chainId)) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
      } catch (switchErr) {
        if (switchErr && (switchErr.code === 4902 || /unrecognized|unknown/i.test(String(switchErr.message || "")))) {
          const rpcUrls = Array.isArray(network?.rpc) && network.rpc.length ? network.rpc : [getFallbackRpc(chainId)].filter(Boolean);
          const explorerUrl = network?.explorers?.[0]?.url || getFallbackExplorer(chainId);
          const nc = network?.nativeCurrency || getFallbackNativeCurrency(chainId);
          const addParams = {
            chainId: targetHex,
            chainName: (params.get("chainName") || network?.name || getFallbackChainName(chainId) || `Chain ${chainId}`),
            nativeCurrency: {
              name: params.get("nativeName") || nc.name,
              symbol: params.get("nativeSymbol") || nc.symbol,
              decimals: parseInt(params.get("nativeDecimals") || String(nc.decimals), 10),
            },
            rpcUrls,
            blockExplorerUrls: explorerUrl ? [explorerUrl] : [],
          };
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [addParams] });
        } else {
          throw switchErr;
        }
      }
    }
    try {
      await window.ethereum.request({ method: "wallet_watchAsset", params: { type: "ERC20", options: { address, symbol, decimals, image } } });
    } catch (err) {
      const rpc = params.get("rpc") || (Array.isArray(network?.rpc) && network.rpc.length ? network.rpc[0] : getFallbackRpc(params.get("chainId") || network?.chainId));
      const bodies = [
        { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: String(address), data: "0x95d89b41" }, "latest"] },
        { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: String(address), data: "0x313ce567" }, "latest"] },
      ];
      const resp = rpc ? await rpcMulti(rpc, bodies) : null;
      if (!Array.isArray(resp)) throw err;
      const symHex = (resp.find((x) => x && x.id === 1) || {}).result || null;
      const decHex = (resp.find((x) => x && x.id === 2) || {}).result || null;
      const sym2 = (decodeString(symHex) || symbol || "TKN").slice(0, 32);
      let dec2 = decimals;
      try {
        const h = String(decHex || "").replace(/^0x/, "");
        dec2 = h ? parseInt(h, 16) : decimals;
      } catch (_) {}
      await window.ethereum.request({ method: "wallet_watchAsset", params: { type: "ERC20", options: { address, symbol: sym2, decimals: dec2, image } } });
    }
    window.notify && window.notify("Token enviado para a carteira", "success");
  } catch (e) {
    window.notify && window.notify(`Erro ao adicionar token: ${e.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  try {
    await networkManager.init();
  } catch {}
  let network = null;
  const cId = params.get("chainId");
  if (cId) {
    network = networkManager.getNetworkById(cId);
    const rpc = params.get("rpc");
    const explorer = params.get("explorer");
    if (network) {
      if (rpc && (!Array.isArray(network.rpc) || network.rpc.length === 0)) network.rpc = [rpc];
      if (explorer && (!Array.isArray(network.explorers) || network.explorers.length === 0)) network.explorers = [{ url: explorer }];
    }
  }
  renderSummary(params, network);
  (async () => {
    await enrichFromRpc(params, network);
  })();
  const addBtn = document.getElementById("addToWalletButton");
  if (addBtn) {
    addBtn.addEventListener("click", () => addToWallet(params, network));
  }
});
