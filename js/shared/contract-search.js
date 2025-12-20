import { networkManager } from "./network-manager.js";
let isSearching = false;
function log() {
  try {
    console.log("[contract-search]", ...arguments);
  } catch (_) {}
}
function grp(n) {
  try {
    console.groupCollapsed(`[contract-search] ${n}`);
  } catch (_) {}
}
function endgrp() {
  try {
    console.groupEnd();
  } catch (_) {}
}

function initContainer(container) {
  if (!container || container.getAttribute("data-cs-initialized") === "true") return;

  const verifyContext = !!document.getElementById("f_chainId") || !!document.getElementById("f_contractName") || !!document.getElementById("f_codeformat");
  const linkContext = !!container.querySelector("#f_address") || !!container.querySelector("#tokenAddress") || !!document.getElementById("tokenAddress");
  if (!verifyContext && !linkContext) return;
  let btn = container.querySelector("#contractSearchBtn");
  if (!btn) {
    try {
      btn = document.getElementById("contractSearchBtn");
    } catch {
      btn = null;
    }
    if (!btn) return;
  }

  function showStatus(msg) {
    try {
      const wrap = container.querySelector("#contractSearchStatus") || document.getElementById("contractSearchStatus");
      const textEl = container.querySelector("#contractSearchStatusText") || document.getElementById("contractSearchStatusText");
      if (textEl) textEl.textContent = msg || "";
      if (wrap) wrap.classList.toggle("d-none", !msg);
    } catch (_) {}
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
    if (!raw) {
      try {
        const sel = window.__selectedNetwork;
        const cid = sel && sel.chainId ? String(sel.chainId) : "";
        if (cid) raw = cid;
      } catch (_) {}
    }
    if (!raw) {
      try {
        const cidText = (document.getElementById("chainIdCode")?.textContent || "").trim();
        if (cidText) raw = cidText;
      } catch (_) {}
    }
    if (!raw) {
      try {
        const p = new URLSearchParams(location.search);
        raw = p.get("chainId") || "";
      } catch (_) {}
    }
    return raw;
  }

  function getFallbackRpc(chainId) {
    switch (Number(chainId)) {
      case 97:
        return "https://bsc-testnet.publicnode.com";
      case 56:
        return "https://bsc-dataseed.binance.org";
      case 137:
        return "https://polygon-rpc.com";
      case 1:
        return "https://eth.llamarpc.com";
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

  const MAX_TIMEOUT_MS = 1500;
  const GLOBAL_LIMIT_MS = 2000;
  const DISABLE_MULTI_RPC_FALLBACK = true;

  function sanitizeRpcUrl(u) {
    try {
      const s = String(u || "").replace(/[`'\"]/g, "").trim();
      if (!/^https?:\/\//i.test(s)) return "";
      return s;
    } catch (_) {
      return "";
    }
  }

  async function fetchJsonWithTimeout(rpc, body, timeoutMs) {
    try {
      const rpcUrl = sanitizeRpcUrl(rpc);
      const ctrl = new AbortController();
      const t = setTimeout(() => {
        try {
          const label = Array.isArray(body) ? (body.map((b) => b && b.method).filter(Boolean).join(",") || "batch") : body?.method;
          log("timeout", { rpc: rpcUrl, method: label, timeoutMs });
        } catch (_) {}
        ctrl.abort();
      }, timeoutMs);
      const resp = await fetch(rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
      clearTimeout(t);
      if (!resp.ok) return null;
      try {
        const label = Array.isArray(body) ? (body.map((b) => b && b.method).filter(Boolean).join(",") || "batch") : body?.method;
        log("rpc ok", { rpc: rpcUrl, method: label, status: resp.status });
      } catch (_) {}
      return await resp.json();
    } catch (_) {
      try {
        const label = Array.isArray(body) ? (body.map((b) => b && b.method).filter(Boolean).join(",") || "batch") : body?.method;
        log("rpc error", { rpc: sanitizeRpcUrl(rpc), method: label });
      } catch (_) {}
      return null;
    }
  }

  function getCandidateRpcs(chainId) {
    try {
      const cid = Number(chainId);
      const best = [];
      switch (cid) {
        case 97:
          best.push("https://bsc-testnet.publicnode.com", "https://endpoints.omniatech.io/v1/bsc-testnet/public");
          break;
        case 56:
          best.push("https://bsc-dataseed.binance.org", "https://rpc.ankr.com/bsc");
          break;
        case 1:
          best.push("https://eth.llamarpc.com", "https://cloudflare-eth.com");
          break;
        case 137:
          best.push("https://rpc.ankr.com/polygon", "https://polygon-rpc.com");
          break;
        default:
          break;
      }
      const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
      const arr = [...best];
      if (Array.isArray(net?.rpc)) arr.push(...net.rpc);
      else if (typeof net?.rpc === "string") arr.push(net.rpc);
      const f = getFallbackRpc(chainId);
      if (f) arr.push(f);
      const clean = arr.map((u) => sanitizeRpcUrl(u)).filter(Boolean);
      return Array.from(new Set(clean)).slice(0, 4);
    } catch (_) {
      const f = sanitizeRpcUrl(getFallbackRpc(chainId));
      return [f].filter(Boolean);
    }
  }

  const primaryRpcCache = new Map();
  function getPrimaryRpc(chainId) {
    const cid = String(chainId);
    if (primaryRpcCache.has(cid)) return primaryRpcCache.get(cid);
    const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
    const curated = getFallbackRpc(chainId);
    const rpcs = getCandidateRpcs(chainId);
    const firstNet = Array.isArray(net?.rpc) && net.rpc.length ? net.rpc[0] : typeof net?.rpc === "string" ? net.rpc : "";
    let rpc = curated || firstNet || rpcs[0] || "";
    rpc = sanitizeRpcUrl(rpc);
    primaryRpcCache.set(cid, rpc);
    return rpc;
  }

  async function callFirstValid(rpcs, body) {
    return new Promise((resolve) => {
      let done = false;
      let pending = rpcs.length;
      const finish = (val) => {
        if (!done) {
          done = true;
          resolve(val);
        }
      };
      if (!pending) finish(null);
      rpcs.forEach(async (rpc) => {
        try {
          try {
            log("rpc call", { rpc, method: body?.method });
          } catch (_) {}
          const js = await fetchJsonWithTimeout(rpc, body, MAX_TIMEOUT_MS);
          const hex = js && js.result ? String(js.result) : "";
          if (!done && hex && hex !== "0x") {
            try {
              log("rpc success", { rpc, method: body?.method });
            } catch (_) {}
            finish(hex);
          }
        } catch (_) {
        } finally {
          pending -= 1;
          if (!done && pending === 0) {
            try {
              log("rpc noresult", { method: body?.method });
            } catch (_) {}
            finish(null);
          }
        }
      });
    });
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

  async function detectSymbolName(addr, chainId) {
    try {
      const rpc = getPrimaryRpc(chainId);
      try {
        log("detectSymbolName rpc", { chainId, rpc });
      } catch (_) {}
      const bodies = [
        { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: String(addr), data: "0x95d89b41" }, "latest"] },
        { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: String(addr), data: "0x06fdde03" }, "latest"] },
      ];
      let symHex = null;
      let namHex = null;
      const js = await fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS);
      if (Array.isArray(js) && js.length) {
        const r1 = js.find((x) => x && x.id === 1);
        const r2 = js.find((x) => x && x.id === 2);
        symHex = r1 && r1.result ? String(r1.result) : null;
        namHex = r2 && r2.result ? String(r2.result) : null;
      }
      if (!DISABLE_MULTI_RPC_FALLBACK && (!symHex || symHex === "0x" || !namHex || namHex === "0x")) {
        const rpcs = getCandidateRpcs(chainId);
        const [symHex2, namHex2] = await Promise.all([callFirstValid(rpcs, bodies[0]), callFirstValid(rpcs, bodies[1])]);
        symHex = symHex || symHex2;
        namHex = namHex || namHex2;
      }
      const sym = decodeString(symHex);
      const nam = decodeString(namHex);
      try {
        log("detectSymbolName result", { symbol: sym, name: nam });
      } catch (_) {}
      return { symbol: sym, name: nam };
    } catch (_) {
      return { symbol: null, name: null };
    }
  }

  async function fetchERC20Info(addr, chainId) {
    try {
      const rpc = getPrimaryRpc(chainId);
      try {
        log("fetchERC20Info rpc", { chainId, rpc });
      } catch (_) {}
      const bodies = [
        { jsonrpc: "2.0", id: 3, method: "eth_call", params: [{ to: String(addr), data: "0x313ce567" }, "latest"] },
        { jsonrpc: "2.0", id: 4, method: "eth_call", params: [{ to: String(addr), data: "0x18160ddd" }, "latest"] },
      ];
      let decHex = null;
      let supHex = null;
      const js = await fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS);
      if (Array.isArray(js) && js.length) {
        const r3 = js.find((x) => x && x.id === 3);
        const r4 = js.find((x) => x && x.id === 4);
        decHex = r3 && r3.result ? String(r3.result) : null;
        supHex = r4 && r4.result ? String(r4.result) : null;
      }
      if (!DISABLE_MULTI_RPC_FALLBACK && (!decHex || decHex === "0x" || !supHex || supHex === "0x")) {
        const rpcs = getCandidateRpcs(chainId);
        const [decHex2, supHex2] = await Promise.all([callFirstValid(rpcs, bodies[0]), callFirstValid(rpcs, bodies[1])]);
        decHex = decHex || decHex2;
        supHex = supHex || supHex2;
      }
      let decimals = null;
      try {
        const h = (decHex || "0x").replace(/^0x/, "");
        decimals = h ? parseInt(h, 16) : null;
      } catch (e) {
        try {
          log("error", e);
        } catch {}
      }
      try {
        log("fetchERC20Info result", { decimals, totalSupplyHex: supHex });
      } catch (_) {}
      return {
        decimals: decimals,
        totalSupply: formatUnits(supHex, decimals ?? 18),
        tokenBalance: null,
        nativeBalance: null,
      };
    } catch (_) {
      return { decimals: null, totalSupply: null, tokenBalance: null, nativeBalance: null };
    }
  }

  // Sourcify removido

  async function runSearch() {
    if (isSearching) return;
    isSearching = true;
    grp("runSearch");
    showStatus("Buscando...");
    try {
      const sp = container.querySelector("#contractSearchSpinner") || document.getElementById("contractSearchSpinner");
      const btnEl = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");
      if (sp) sp.classList.remove("d-none");
      if (btnEl) btnEl.disabled = true;
    } catch (e) {
      try {
        log("error", e);
      } catch {}
    }
    const addrField = document.getElementById("f_address") || document.getElementById("tokenAddress");
    const addrRaw = String(addrField?.value || "").replace(/\s+$/u, "");
    const okAddr = /^0x[0-9a-fA-F]{40}$/.test(addrRaw);
    const chainIdRaw = findChainId();
    try {
      log("input", { address: addrRaw, okAddr, chainId: chainIdRaw });
    } catch (_) {}
    if (!okAddr || !chainIdRaw) {
      showStatus("Informe endereço e rede.");
      try {
        const evtErr = new CustomEvent("form:error", { detail: { message: "Informe endereço e rede.", container }, bubbles: true });
        document.dispatchEvent(evtErr);
      } catch (_) {}
      try {
        log("invalid-input");
      } catch (_) {}
      try {
        const sp = container.querySelector("#contractSearchSpinner") || document.getElementById("contractSearchSpinner");
        const btnEl = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");
        if (sp) sp.classList.add("d-none");
        if (btnEl) btnEl.disabled = false;
      } catch (e) {
        try {
          log("error", e);
        } catch {}
      }
      try {
        endgrp();
      } catch (_) {}
      isSearching = false;
      return;
    }
    const withTimeout = (p, ms, fallback) => {
      return new Promise((resolve) => {
        let done = false;
        const t = setTimeout(() => {
          if (!done) {
            done = true;
            resolve(fallback);
          }
        }, ms);
        p.then((v) => {
          if (!done) {
            done = true;
            clearTimeout(t);
            resolve(v);
          }
        }).catch(() => {
          if (!done) {
            done = true;
            clearTimeout(t);
            resolve(fallback);
          }
        });
      });
    };
    // Sourcify removido: sem pré-preenchimento por repositório
    try {
      log("start-core-calls");
    } catch (_) {}
    const snPromise = detectSymbolName(addrRaw, chainIdRaw);
    const infoPromise = fetchERC20Info(addrRaw, chainIdRaw);
    const [sn, info] = await Promise.all([withTimeout(snPromise, GLOBAL_LIMIT_MS, { symbol: null, name: null }), withTimeout(infoPromise, GLOBAL_LIMIT_MS, { decimals: null, totalSupply: null, tokenBalance: null, nativeBalance: null })]);
    try {
      log("core-results", { sn, info });
    } catch (_) {}
    let payload = { chainId: parseInt(chainIdRaw, 10), contractAddress: addrRaw };
    let nameFallback = null,
      symbolFallback = null,
      decimalsFallback = null,
      supplyFallback = null,
      tokenBalFallback = null;
    try {
      const net = networkManager?.getNetworkById?.(parseInt(chainIdRaw, 10));
      const rpc = Array.isArray(net?.rpc) && net.rpc.length ? net.rpc[0] : typeof net?.rpc === "string" ? net.rpc : null;
      if (!DISABLE_MULTI_RPC_FALLBACK && rpc && typeof window !== "undefined" && window.ethers && window.ethers.providers) {
        const provider = new window.ethers.providers.JsonRpcProvider(rpc);
        const abi = ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)", "function totalSupply() view returns (uint256)", "function balanceOf(address a) view returns (uint256)"];
        const c = new window.ethers.Contract(addrRaw, abi, provider);
        try {
          log("fallback-ethers", { rpc });
        } catch (_) {}
        try {
          nameFallback = await c.name();
          try {
            log("fallback-name", { nameFallback });
          } catch (_) {}
        } catch (e) {
          try {
            log("error", e);
          } catch {}
        }
        try {
          symbolFallback = await c.symbol();
          try {
            log("fallback-symbol", { symbolFallback });
          } catch (_) {}
        } catch (e) {
          try {
            log("error", e);
          } catch {}
        }
        try {
          const d = await c.decimals();
          decimalsFallback = Number(d);
          try {
            log("fallback-decimals", { decimalsFallback });
          } catch (_) {}
        } catch (e) {
          try {
            log("error", e);
          } catch {}
        }
        try {
          const sup = await c.totalSupply();
          if (sup && (decimalsFallback ?? info?.decimals ?? 18) != null) {
            const dec = decimalsFallback ?? info?.decimals ?? 18;
            const base = window.ethers.BigNumber.from(10).pow(dec);
            const whole = sup.div(base).toString();
            const frac = sup.mod(base).toString().padStart(dec, "0").replace(/0+$/, "");
            supplyFallback = frac ? `${whole}.${frac}` : whole;
            try {
              log("fallback-supply", { supplyFallback });
            } catch (_) {}
          }
        } catch (e) {
          try {
            log("error", e);
          } catch {}
        }
        try {
          const bal = await c.balanceOf(addrRaw);
          const dec = decimalsFallback ?? info?.decimals ?? 18;
          const base = window.ethers.BigNumber.from(10).pow(dec);
          const whole = bal.div(base).toString();
          const frac = bal.mod(base).toString().padStart(dec, "0").replace(/0+$/, "");
          tokenBalFallback = frac ? `${whole}.${frac}` : whole;
          try {
            log("fallback-token-balance", { tokenBalFallback });
          } catch (_) {}
        } catch (e) {
          try {
            log("error", e);
          } catch {}
        }
      }
    } catch (e) {
      try {
        log("error", e);
      } catch {}
    }

    try {
      const symEl = document.getElementById("f_tokenSymbol");
      if (symEl && sn.symbol) symEl.value = sn.symbol;
    } catch (e) {
      try {
        log("error", e);
      } catch {}
    }
    try {
      sessionStorage.setItem("tokencafe_last_contract", addrRaw);
    } catch (e) {
      try {
        log("error", e);
      } catch {}
    }
    // Completar saldos antes de emitir, para uma única emissão consolidada
    const extra = {
      tokenSymbol: (sn && sn.symbol ? sn.symbol : null) || symbolFallback || null,
      tokenName: (sn && sn.name ? sn.name : null) || nameFallback || null,
      tokenDecimals: (info && typeof info.decimals === "number" ? info.decimals : null) ?? (typeof decimalsFallback === "number" ? decimalsFallback : null),
      tokenSupply: (info && info.totalSupply ? info.totalSupply : null) || supplyFallback || null,
      contractTokenBalance: (info && info.tokenBalance ? info.tokenBalance : null) || tokenBalFallback || null,
      contractNativeBalance: info && info.nativeBalance ? info.nativeBalance : null,
    };
    try {
      const rpc = getPrimaryRpc(chainIdRaw);
      const bodies = [
        { jsonrpc: "2.0", id: 7, method: "eth_call", params: [{ to: String(addrRaw), data: "0x70a08231" + String(addrRaw).toLowerCase().replace(/^0x/, "").padStart(64, "0") }, "latest"] },
        { jsonrpc: "2.0", id: 8, method: "eth_getBalance", params: [String(addrRaw), "latest"] },
      ];
      let balHex = null;
      let nativeHex = null;
      const js = await fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS);
      if (Array.isArray(js) && js.length) {
        const r7 = js.find((x) => x && x.id === 7);
        const r8 = js.find((x) => x && x.id === 8);
        balHex = r7 && r7.result ? String(r7.result) : null;
        nativeHex = r8 && r8.result ? String(r8.result) : null;
      }
      const d = extra.tokenDecimals != null ? extra.tokenDecimals : 18;
      extra.contractTokenBalance = formatUnits(balHex, d);
      extra.contractNativeBalance = formatUnits(nativeHex, 18);
      try { log("balances:result", { tokenBalanceHex: balHex, nativeBalanceHex: nativeHex, decimals: d }); } catch (_) {}
    } catch (e) { try { log("error", e); } catch {} }
    try { log("emit:contract:found", { payload: { ...payload, ...extra } }); } catch (_) {}
    const evt = new CustomEvent("contract:found", { detail: { contract: { ...payload, ...extra } }, bubbles: true });
    try { document.dispatchEvent(evt); } catch (_) { try { container.dispatchEvent(evt); } catch (_) {} }

    try {
      const vAddr = container.querySelector("#cs_viewAddress") || document.querySelector("#cs_viewAddress");
      const vCid = container.querySelector("#cs_viewChainId") || document.querySelector("#cs_viewChainId");
      const vName = container.querySelector("#cs_viewName") || document.querySelector("#cs_viewName");
      const vSym = container.querySelector("#cs_viewSymbol") || document.querySelector("#cs_viewSymbol");
      const vDec = container.querySelector("#cs_viewDecimals") || document.querySelector("#cs_viewDecimals");
      const vSup = container.querySelector("#cs_viewSupply") || document.querySelector("#cs_viewSupply");
      const vTokBal = container.querySelector("#cs_viewTokenBalance") || document.querySelector("#cs_viewTokenBalance");
      const vNatBal = container.querySelector("#cs_viewNativeBalance") || document.querySelector("#cs_viewNativeBalance");
      const vExp = container.querySelector("#cs_viewExplorer") || document.querySelector("#cs_viewExplorer");
      const topExp = container.querySelector("#csExplorerBtn") || document.querySelector("#csExplorerBtn");
      if (vAddr) vAddr.textContent = addrRaw;
      if (vCid) vCid.textContent = String(payload.chainId || "");
      if (vName) vName.textContent = extra.tokenName || "";
      if (vSym) vSym.textContent = extra.tokenSymbol || "";
      if (vDec) vDec.textContent = extra.tokenDecimals != null ? String(extra.tokenDecimals) : "";
      if (vSup) vSup.textContent = extra.tokenSupply || "";
      if (vTokBal) vTokBal.textContent = extra.contractTokenBalance || "";
      if (vNatBal) vNatBal.textContent = extra.contractNativeBalance || "";
      try {
        const net = networkManager?.getNetworkById?.(parseInt(payload.chainId, 10));
        const base = net?.explorers?.[0]?.url || getFallbackExplorer(payload.chainId) || "";
        const href = base ? `${String(base).replace(/\/$/, "")}/address/${addrRaw}` : "#";
        if (vExp) vExp.href = href;
        if (topExp) {
          topExp.href = href;
          topExp.classList.toggle("disabled", !base);
        }
      } catch (e) {
        try {
          log("error", e);
        } catch {}
      }
      const card = container.querySelector("#selected-contract-info") || document.querySelector("#selected-contract-info");
      if (card) card.classList.add("d-none");
      try {
        const bAddr = container.querySelector("#csBadgeAddress") || document.querySelector("#csBadgeAddress");
        const bName = container.querySelector("#csBadgeName") || document.querySelector("#csBadgeName");
        const bSym = container.querySelector("#csBadgeSymbol") || document.querySelector("#csBadgeSymbol");
        const bDec = container.querySelector("#csBadgeDecimals") || document.querySelector("#csBadgeDecimals");
        const bCid = container.querySelector("#csBadgeChainId") || document.querySelector("#csBadgeChainId");
        if (bAddr) bAddr.textContent = addrRaw;
        if (bName) bName.textContent = extra.tokenName || "-";
        if (bSym) bSym.textContent = extra.tokenSymbol || "-";
        if (bDec) bDec.textContent = extra.tokenDecimals != null ? String(extra.tokenDecimals) : "-";
        if (bCid) bCid.textContent = String(payload.chainId || "-");
      } catch (e) {
        try {
          log("error", e);
        } catch {}
      }
    } catch (e) {
      try {
        log("error", e);
      } catch {}
    }
    const hasData = !!(extra.tokenName || extra.tokenSymbol || extra.tokenDecimals != null || extra.tokenSupply || extra.contractTokenBalance || extra.contractNativeBalance);
    if (!hasData) {
      const net = networkManager?.getNetworkById?.(parseInt(chainIdRaw, 10));
      const chainName = net?.name || "";
      const msg = chainName ? `Contrato não pertence à rede selecionada (${chainName}, chainId ${chainIdRaw}) ou sem dados ERC-20.` : "Contrato não pertence à rede selecionada ou sem dados ERC-20.";
      showStatus(msg);
      try {
        const evtErr = new CustomEvent("form:error", { detail: { message: msg, container }, bubbles: true });
        document.dispatchEvent(evtErr);
      } catch (_) {}
      try {
        log("no-data", { chainId: chainIdRaw, address: addrRaw });
      } catch (_) {}
    } else {
      showStatus("");
      try {
        const evtOk = new CustomEvent("form:success", { detail: { message: "Contrato encontrado na rede selecionada.", container }, bubbles: true });
        document.dispatchEvent(evtOk);
      } catch (_) {}
    }
    try {
      const sp = container.querySelector("#contractSearchSpinner") || document.getElementById("contractSearchSpinner");
      const btnEl = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");
      if (sp) sp.classList.add("d-none");
      if (btnEl) btnEl.disabled = false;
    } catch (e) {
      try {
        log("error", e);
      } catch {}
    }
    try {
      log("end");
      endgrp();
    } catch (_) {}
    isSearching = false;
  }

  try {
    const t = String(btn?.getAttribute("type") || "").toLowerCase();
    if (btn && t !== "submit") {
      let _lastClick = 0;
      let _timer = null;
      btn.addEventListener("click", () => {
        const now = Date.now();
        if (now - _lastClick < 800) return;
        _lastClick = now;
        if (_timer) clearTimeout(_timer);
        _timer = setTimeout(() => {
          runSearch();
        }, 150);
      });
    }
  } catch (e) {
    try {
      log("error", e);
    } catch {}
  }
  try {
    const form = container.querySelector("#tokenForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        try {
          e.preventDefault();
        } catch (_) {}
        runSearch();
      });
    }
  } catch (e) {
    try {
      log("error", e);
    } catch {}
  }
  try {
    const addrInput = container.querySelector("#f_address");
    const hiddenAddr = container.querySelector("#tokenAddress") || document.getElementById("tokenAddress");
    if (addrInput) {
      addrInput.addEventListener("input", () => {
        try {
          if (hiddenAddr) hiddenAddr.value = addrInput.value;
        } catch (_) {}
      });
    }
  } catch (e) {
    try {
      log("error", e);
    } catch {}
  }
  try {
    const infoBtn = container.querySelector("#csInfoBtn");
    const clearBtn = container.querySelector("#csClearBtn");
    if (infoBtn) {
      infoBtn.addEventListener("click", () => {
        try {
          const card = container.querySelector("#selected-contract-info");
          if (!card) return;
          const willShow = card.classList.contains("d-none");
          card.classList.toggle("d-none", !willShow);
          const evt = new CustomEvent("contract:toggleInfo", { detail: { visible: willShow }, bubbles: true });
          container.dispatchEvent(evt);
        } catch (e) {
          try {
            log("error", e);
          } catch {}
        }
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        try {
          const addrInput = container.querySelector("#f_address");
          const hiddenAddr = container.querySelector("#tokenAddress") || document.getElementById("tokenAddress");
          if (addrInput) {
            addrInput.value = "";
            addrInput.classList.remove("is-valid", "is-invalid");
          }
          if (hiddenAddr) hiddenAddr.value = "";
          showStatus("");
          // Limpar badges
          const bAddr = container.querySelector("#csBadgeAddress") || document.getElementById("csBadgeAddress");
          const bName = container.querySelector("#csBadgeName") || document.getElementById("csBadgeName");
          const bSym = container.querySelector("#csBadgeSymbol") || document.getElementById("csBadgeSymbol");
          const bDec = container.querySelector("#csBadgeDecimals") || document.getElementById("csBadgeDecimals");
          const bCid = container.querySelector("#csBadgeChainId") || document.getElementById("csBadgeChainId");
          const bVer = container.querySelector("#verifyStatusBadge") || document.getElementById("verifyStatusBadge"); // Limpar status de verificação
          if (bAddr) bAddr.textContent = "-";
          if (bName) bName.textContent = "-";
          if (bSym) bSym.textContent = "-";
          if (bDec) bDec.textContent = "-";
          if (bCid) bCid.textContent = "-";
          if (bVer) bVer.classList.add("d-none");
          
          // Limpar visualização
          const vAddr = container.querySelector("#cs_viewAddress") || document.getElementById("cs_viewAddress");
          const vCid = container.querySelector("#cs_viewChainId") || document.getElementById("cs_viewChainId");
          const vName = container.querySelector("#cs_viewName") || document.getElementById("cs_viewName");
          const vSym = container.querySelector("#cs_viewSymbol") || document.getElementById("cs_viewSymbol");
          const vDec = container.querySelector("#cs_viewDecimals") || document.getElementById("cs_viewDecimals");
          const vSup = container.querySelector("#cs_viewSupply") || document.getElementById("cs_viewSupply");
          const vTokBal = container.querySelector("#cs_viewTokenBalance") || document.getElementById("cs_viewTokenBalance");
          const vNatBal = container.querySelector("#cs_viewNativeBalance") || document.getElementById("cs_viewNativeBalance");
          const vExp = container.querySelector("#cs_viewExplorer") || document.getElementById("cs_viewExplorer");
          const topExp = container.querySelector("#csExplorerBtn") || document.getElementById("csExplorerBtn");
          if (vAddr) vAddr.textContent = "";
          if (vCid) vCid.textContent = "";
          if (vName) vName.textContent = "";
          if (vSym) vSym.textContent = "";
          if (vDec) vDec.textContent = "";
          if (vSup) vSup.textContent = "";
          if (vTokBal) vTokBal.textContent = "";
          if (vNatBal) vNatBal.textContent = "";
          if (vExp) vExp.removeAttribute("href");
          if (topExp) {
            topExp.href = "#";
            topExp.classList.add("disabled");
          }
          const card = container.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");
          if (card) card.classList.add("d-none");
          const evt = new CustomEvent("contract:clear", { bubbles: true });
          try { container.dispatchEvent(evt); } catch (_) {}
          try { document.dispatchEvent(evt); } catch (_) {}
        } catch (e) {
          try { log("error", e); } catch {}
        }
      });
    }
  } catch (e) {
    try {
      log("error", e);
    } catch {}
  }
  // Padrão de manutenção: sem botão "limpar" — limpeza é feita ao alterar a entrada
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
