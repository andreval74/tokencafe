import { networkManager } from "./network-manager.js";
import { getApiBase, getVerificationStatus } from "./verify-utils.js";
import { getFallbackExplorer, getFallbackRpc } from "./network-fallback.js";
import { findLiquidityPair } from "./dex-utils.js";
import { isWalletAdmin, getConnectedWalletAddress } from "./admin-security.js";
import { showDiagnosis, getDefaultAddressCauses } from "../ai/diagnostics.js";
import { addTokenToMetaMask } from "./metamask-utils.js";

// =============================================================================
// SHARED CONSTANTS & STATE
// =============================================================================

const MAX_TIMEOUT_MS = 5000;
const GLOBAL_LIMIT_MS = 8000;
const DISABLE_MULTI_RPC_FALLBACK = false;
let isSearching = false;

// Cache for RPC URLs to avoid constant lookups
const primaryRpcCache = new Map();

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function log() {
  try {
    // console.log("[contract-search]", ...arguments);
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

function sanitizeRpcUrl(u) {
  try {
    const s = String(u || "")
      .replace(/[`'\"]/g, "")
      .trim();
    if (!/^https?:\/\//i.test(s)) return "";
    return s;
  } catch (_) {
    return "";
  }
}

function resolveIsAdminSync() {
  try {
    if (window.TOKENCAFE_DISABLE_ADMIN_BARRIERS === true) return true;
  } catch (_) {}
  try {
    if (window.TOKENCAFE_IS_ADMIN === true) return true;
  } catch (_) {}
  try {
    const match = document.cookie.match(new RegExp("(^| )tokencafe_wallet_address=([^;]+)"));
    if (match && match[2] && isWalletAdmin(match[2])) return true;
  } catch (_) {}
  try {
    const ls = window.localStorage?.getItem?.("tokencafe_wallet_address") || "";
    if (ls && isWalletAdmin(ls)) return true;
  } catch (_) {}
  return false;
}

function buildDetailsShareLink(address, chainId) {
  try {
    const u = new URL("index.php?page=contrato-detalhes", document.baseURI);
    if (address) u.searchParams.set("address", String(address));
    if (chainId) u.searchParams.set("chainId", String(chainId));
    return u.toString();
  } catch (_) {
    return "";
  }
}

function applyQuickActions(container) {
  try {
    const st = container?.__tcQuickActionsState || null;
    if (!st?.address || !st?.chainId) return;

    const address = st.address;
    const chainId = st.chainId;
    const explorerUrl = String(st.explorerUrl || "").trim();
    const shareTarget = explorerUrl || buildDetailsShareLink(address, chainId);
    const isAdmin = resolveIsAdminSync();

    const btnX = container.querySelector("[data-cs-open-explorer]");
    const btnW = container.querySelector("[data-cs-share-whatsapp]");
    const btnT = container.querySelector("[data-cs-share-telegram]");
    const btnE = container.querySelector("[data-cs-share-email]");
    const btnAdd = container.querySelector("[data-cs-add-token]");

    const lock = (el, message) => {
      if (!el) return;
      el.disabled = true;
      el.classList.add("disabled");
      el.setAttribute("aria-disabled", "true");
      el.onclick = (e) => {
        try { e?.preventDefault?.(); } catch (_) {}
        window.showFormError?.(message);
      };
    };

    const unlock = (el, onClick) => {
      if (!el) return;
      el.disabled = false;
      el.classList.remove("disabled");
      el.removeAttribute("aria-disabled");
      el.onclick = onClick;
    };

    if (explorerUrl) {
      unlock(btnX, (e) => {
        try { e?.preventDefault?.(); } catch (_) {}
        window.open(explorerUrl, "_blank");
      });
    } else {
      lock(btnX, "Explorer indisponível para esta rede.");
    }

    unlock(btnW, (e) => {
      try { e?.preventDefault?.(); } catch (_) {}
      if (!shareTarget) return;
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTarget)}`, "_blank");
    });
    unlock(btnT, (e) => {
      try { e?.preventDefault?.(); } catch (_) {}
      if (!shareTarget) return;
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareTarget)}&text=${encodeURIComponent("Confira este endereço:")}`, "_blank");
    });
    unlock(btnE, (e) => {
      try { e?.preventDefault?.(); } catch (_) {}
      if (!shareTarget) return;
      window.open(`mailto:?subject=${encodeURIComponent("Endereço")}&body=${encodeURIComponent(shareTarget)}`, "_self");
    });
    if (!isAdmin) {
      lock(btnAdd, "Adicionar token disponível apenas para administradores.");
      return;
    }

    unlock(btnAdd, async (e) => {
        try { e?.preventDefault?.(); } catch (_) {}
        const res = await addTokenToMetaMask({
          address,
          symbol: st.symbol || "TKN",
          decimals: Number.isFinite(Number(st.decimals)) ? Number(st.decimals) : 18,
          image: "",
        });
        if (!res?.success) {
          window.showFormError?.(res?.error || "Falha ao adicionar token.");
        }
      });
  } catch (_) {}
}

async function fetchJsonWithTimeout(rpc, body, timeoutMs) {
  try {
    const rpcUrl = sanitizeRpcUrl(rpc);
    if (!rpcUrl) return null;
    
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      try {
        ctrl.abort();
      } catch (_) {}
    }, timeoutMs);

    const resp = await fetch(rpcUrl, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify(body), 
        signal: ctrl.signal 
    });
    
    clearTimeout(t);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (_) {
    return null;
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

function formatDecimalValue(val) {
  if (!val && val !== 0 && val !== "0") return "";
  try {
    const s = String(val);
    const parts = s.split(".");
    let whole = parts[0];
    if (whole === "") whole = "0";
    const frac = parts.length > 1 ? parts[1] : "";
    const wholeFmt = BigInt(whole).toLocaleString("pt-BR");
    return frac ? `${wholeFmt},${frac.substring(0, 8)}` : wholeFmt;
  } catch (_) {
    return val;
  }
}

// =============================================================================
// NETWORK & RPC LOGIC
// =============================================================================

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
        const js = await fetchJsonWithTimeout(rpc, body, MAX_TIMEOUT_MS);
        const hex = js && js.result ? String(js.result) : "";
        if (!done && hex && hex !== "0x") {
          finish(hex);
        }
      } catch (_) {
      } finally {
        pending -= 1;
        if (!done && pending === 0) {
          finish(null);
        }
      }
    });
  });
}

// =============================================================================
// CONTRACT DATA FETCHING
// =============================================================================

async function detectSymbolName(addr, chainId) {
  try {
    const rpc = getPrimaryRpc(chainId);
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
    if ((!symHex || symHex === "0x" || !namHex || namHex === "0x") && typeof window !== "undefined" && window.ethereum?.request) {
      try {
        const curChain = await window.ethereum.request({ method: "eth_chainId" });
        if (parseInt(curChain, 16) === Number(chainId)) {
          const symHex3 = await window.ethereum.request({ method: "eth_call", params: [{ to: String(addr), data: "0x95d89b41" }, "latest"] });
          const namHex3 = await window.ethereum.request({ method: "eth_call", params: [{ to: String(addr), data: "0x06fdde03" }, "latest"] });
          symHex = symHex || symHex3;
          namHex = namHex || namHex3;
        }
      } catch (_) {}
    }
    const sym = decodeString(symHex);
    const nam = decodeString(namHex);
    return { symbol: sym, name: nam };
  } catch (_) {
    return { symbol: null, name: null };
  }
}

async function fetchERC20Info(addr, chainId) {
  try {
    const rpc = getPrimaryRpc(chainId);
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
    if ((!decHex || decHex === "0x" || !supHex || supHex === "0x") && typeof window !== "undefined" && window.ethereum?.request) {
      try {
        const curChain = await window.ethereum.request({ method: "eth_chainId" });
        if (parseInt(curChain, 16) === Number(chainId)) {
          const decHex3 = await window.ethereum.request({ method: "eth_call", params: [{ to: String(addr), data: "0x313ce567" }, "latest"] });
          const supHex3 = await window.ethereum.request({ method: "eth_call", params: [{ to: String(addr), data: "0x18160ddd" }, "latest"] });
          decHex = decHex || decHex3;
          supHex = supHex || supHex3;
        }
      } catch (_) {}
    }
    let decimals = null;
    try {
      const h = (decHex || "0x").replace(/^0x/, "");
      decimals = h ? parseInt(h, 16) : null;
    } catch (e) {}
    
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

async function checkIsContract(addr, chainId) {
  try {
    if (typeof window !== "undefined" && window.ethereum && window.ethereum.request) {
      try {
        const curChain = await window.ethereum.request({ method: "eth_chainId" });
        if (parseInt(curChain, 16) === Number(chainId)) {
          const code = await window.ethereum.request({ method: "eth_getCode", params: [String(addr), "latest"] });
          return code !== "0x" && code !== "0x0";
        }
      } catch (_) {}
    }

    const rpc = getPrimaryRpc(chainId);
    const body = { jsonrpc: "2.0", id: 10, method: "eth_getCode", params: [String(addr), "latest"] };
    let js = await fetchJsonWithTimeout(rpc, body, MAX_TIMEOUT_MS);
    
    // Fallback if primary fails
    if (!js && !DISABLE_MULTI_RPC_FALLBACK) {
        const rpcs = getCandidateRpcs(chainId);
        const hex = await callFirstValid(rpcs, body);
        if (hex) js = { result: hex };
    }

    const code = js && js.result ? String(js.result) : "0x";
    return code !== "0x" && code !== "0x0";
  } catch (e) {
    return null;
  }
}

async function csReadErc20Meta(chainId, address) {
    // Wrapper to reuse existing logic but return object expected by some callers
    const [sn, info] = await Promise.all([
        detectSymbolName(address, chainId),
        fetchERC20Info(address, chainId)
    ]);
    return {
        name: sn.name,
        symbol: sn.symbol,
        decimals: info.decimals,
        totalSupply: info.totalSupply // Note: fetchERC20Info returns formatted string, this might need raw if caller expects it
    };
}

function csFormatTokenAmount(raw, decimals) {
    return formatUnits(typeof raw === 'bigint' ? '0x' + raw.toString(16) : raw, decimals);
}

// =============================================================================
// UI UPDATERS (EXPORTED / SHARED)
// =============================================================================

async function updateTradingPair(container, chainId, address) {
  try {
    const vPair = container.querySelector("#cs_viewPairAddress") || document.getElementById("cs_viewPairAddress");
    const rpc = getPrimaryRpc(chainId);
    const pairInfo = await findLiquidityPair(chainId, address, rpc);
    
    if (vPair) {
      if (pairInfo) {
        const dexName = pairInfo.dexName || "DEX";
        const shortAddr = pairInfo.pairAddress.slice(0, 6) + "..." + pairInfo.pairAddress.slice(-4);
        const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
        const base = net?.explorers?.[0]?.url || getFallbackExplorer(chainId) || "";
        const href = base ? `${String(base).replace(/\/$/, "")}/address/${pairInfo.pairAddress}` : "#";
        
        vPair.innerHTML = `
            <span class="text-body fw-medium" title="Endereço do Par: ${pairInfo.pairAddress}">
                <i class="bi bi-arrow-left-right me-1"></i>${dexName}
            </span>
            <a href="${href}" target="_blank" class="ms-2 badge bg-light text-dark border text-decoration-none" title="Ver no Explorer">
                ${shortAddr} <i class="bi bi-box-arrow-up-right ms-1" style="font-size: 0.8em"></i>
            </a>
        `;
        try {
            if (vPair.closest(".d-none")) vPair.closest(".d-none").classList.remove("d-none");
        } catch(_){}
      } else {
        vPair.textContent = "Nenhum par encontrado";
      }
    } else {
      const vOth = container.querySelector("#cs_viewOtherSettings") || document.getElementById("cs_viewOtherSettings");
      if (vOth && pairInfo) {
           const dexName = pairInfo.dexName || "DEX";
           const content = `<div class="mt-1 border-top pt-1"><small class="text-muted">Negociação:</small> <span class="text-body fw-medium">${dexName}</span></div>`;
           if (vOth.innerHTML === "-" || vOth.textContent.trim() === "-") {
               vOth.innerHTML = content;
           } else {
               vOth.innerHTML += content;
           }
      }
    }
  } catch (e) {
    log("pair-error", e);
  }
}

async function updateVerificationBadge(container, chainId, address, forceRefresh = false) {
    const vStatus = container?.querySelector?.("#cs_viewStatus") || document.querySelector("#cs_viewStatus");
    
    // Feedback visual imediato: Spinner
    let loadingSpinner = null;

    let isAdmin = false;
    try {
        if (window.TOKENCAFE_DISABLE_ADMIN_BARRIERS === true) {
            isAdmin = true;
        }
    } catch (_) {}
    try {
        if (window.TOKENCAFE_IS_ADMIN === true) {
            isAdmin = true;
        } else if (window.ethereum && window.ethereum.selectedAddress) {
            isAdmin = isWalletAdmin(window.ethereum.selectedAddress);
            isAdmin = isWalletAdmin(window.ethereum.selectedAddress);
        } else {
            const addr = await getConnectedWalletAddress();
            if (addr) isAdmin = isWalletAdmin(addr);
        }
    } catch (_) {}

    if (vStatus) {
        vStatus.querySelectorAll(".badge-verif-status").forEach((el) => el.remove());
        const span = document.createElement("span");
        span.className = "badge-verif-status badge ms-2 tc-status-warn";
        span.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Verificando';
        vStatus.appendChild(span);
        if (!vStatus.querySelector(".verif-spinner")) {
            loadingSpinner = document.createElement("span");
            loadingSpinner.className = "spinner-border spinner-border-sm text-secondary ms-2 verif-spinner";
            loadingSpinner.setAttribute("role", "status");
            vStatus.appendChild(loadingSpinner);
        }
    }

    try {
      const js = await getVerificationStatus(chainId, address, forceRefresh);
      
      // Remove spinner
      if (vStatus) {
          const sp = vStatus.querySelector(".verif-spinner");
          if (sp) sp.remove();
      }
  
      const vCv = container?.querySelector?.("#cs_viewCompilerVersion") || document.querySelector("#cs_viewCompilerVersion");
      const vOpt = container?.querySelector?.("#cs_viewOptimization") || document.querySelector("#cs_viewOptimization");
      const vOth = container?.querySelector?.("#cs_viewOtherSettings") || document.querySelector("#cs_viewOtherSettings");
  
      if (vCv) vCv.textContent = js?.compilerVersion || js?.explorer?.compilerVersion || "-";
  
      if (vOpt) {
        const opt = js?.explorer?.optimizationUsed;
        if (opt === "1" || opt === 1 || opt === true || opt === "true") {
          const runs = js?.explorer?.runs ? ` (Runs: ${js.explorer.runs})` : "";
          vOpt.textContent = "Sim" + runs;
          vOpt.className = "text-tokencafe";
        } else if (opt === "0" || opt === 0 || opt === false || opt === "false") {
          vOpt.textContent = "Não";
          vOpt.className = "text-tokencafe";
        } else {
          vOpt.textContent = "-";
          vOpt.className = "text-tokencafe";
        }
      }
  
      if (vOth) {
        const evm = js?.explorer?.evmVersion || "";
        const lic = js?.explorer?.licenseType || "";
        const proxy = js?.explorer?.proxy === "1" ? "Proxy" : "";
  
        const parts = [];
        if (evm && evm !== "Default") parts.push(`EVM: ${evm}`);
        if (lic && lic !== "None" && lic !== "Unlicense") parts.push(`Licença: ${lic}`);
        if (proxy) parts.push(proxy);
  
        // Only overwrite if not already set (e.g. by pair info) unless it's just a dash
        if (vOth.textContent.trim() === "-" || !vOth.innerHTML.includes("Negociação")) {
             vOth.textContent = parts.length ? parts.join(", ") : "-";
        } else if (parts.length) {
             // Append if already has content
             vOth.innerHTML = parts.join(", ") + "<br>" + vOth.innerHTML;
        }
      }
  
      if (vStatus) {
        vStatus.querySelectorAll(".badge-verif-status, .btn-retry-verif").forEach((el) => el.remove());
        const span = document.createElement("span");
        let canRetry = false;
        
        if (js?.verified) {
                span.className = "badge-verif-status badge ms-2 tc-status-ok";
                let content = '<i class="bi bi-shield-check me-1"></i>Verificado';
                if (js.verifiedAt) {
                    content += ` <span class="ms-1 small opacity-75">(${js.verifiedAt})</span>`;
                }
                span.innerHTML = content;
                try {
                    const addr = String(address || "").trim().toLowerCase();
                    const cid = String(chainId || "").trim();
                    const k = "tc_verif_logged_" + cid + "_" + addr;
                    if (addr && cid && sessionStorage.getItem(k) !== "1") {
                        sessionStorage.setItem(k, "1");
                        const body = new URLSearchParams({ page: "contrato_verificado", contract: addr, chainId: cid });
                        if (navigator.sendBeacon) {
                            const blob = new Blob([body.toString()], { type: "application/x-www-form-urlencoded" });
                            navigator.sendBeacon("log-event.php", blob);
                        } else {
                            fetch("log-event.php", { method: "POST", body, credentials: "include", keepalive: true, headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" } });
                        }
                    }
                } catch (_) {}
            } else if (js?.error) {
                span.className = "badge-verif-status badge ms-2 tc-status-warn";
                span.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Verificando';
                span.title = js.message || "Não foi possível consultar o explorer agora.";
                canRetry = true;
            } else {
                span.className = "badge-verif-status badge ms-2 tc-status-bad";
                span.innerHTML = '<i class="bi bi-shield-x me-1"></i>Não verificado';
                canRetry = true;
            }
        
        vStatus.appendChild(span);

        if (canRetry && isAdmin) {
             const retryBtn = document.createElement("button");
             retryBtn.className = "btn btn-link btn-retry-verif p-0 ms-2 text-decoration-none text-secondary";
             retryBtn.style.verticalAlign = "middle";
             retryBtn.title = "Verificar novamente agora (ignorar cache)";
             retryBtn.innerHTML = '<i class="bi bi-arrow-clockwise" style="font-size: 1.2em;"></i>';
             retryBtn.onclick = (e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 retryBtn.innerHTML = '<span class="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span>';
                 retryBtn.disabled = true;
                 updateVerificationBadge(container, chainId, address, true);
             };
             vStatus.appendChild(retryBtn);
        }
      }
  
      const warningDiv = container?.querySelector?.("#cs_verifiedWarning") || document.querySelector("#cs_verifiedWarning");
      if (warningDiv) warningDiv.classList.toggle("d-none", !js?.verified);
      return js;
    } catch (e) {
      log("verify-badge-error", e);
      return null;
    }
}

async function updateContractDetailsView(container, chainId, address, preloadedData = null, options = {}) {
    if (!container || !chainId || !address) return;
  
    const card = container.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");
    const infoBtn = container.querySelector("#csInfoBtn");
    if (infoBtn) {
        infoBtn.disabled = false;
        infoBtn.classList.remove("d-none");
    }

    // Check for auto-show based on container attribute or options
    const isViewOnly = container.getAttribute("data-cs-view-only") === "true";
    const shouldAutoShow = options.autoShowCard || isViewOnly || container.getAttribute("data-cs-auto-open") === "true";

    if (shouldAutoShow && card) {
         card.classList.remove("d-none");
         // In view-only mode, we might want to hide the toggle button if the card is always shown
         if (isViewOnly && infoBtn) {
             infoBtn.classList.add("d-none");
         }
    } else {
      if (card) card.classList.add("d-none");
    }

    const topExp = container.querySelector("#csExplorerBtn") || document.getElementById("csExplorerBtn");
    if (topExp) {
        const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
        const base = net?.explorers?.[0]?.url || getFallbackExplorer(chainId) || "";
        if (base) {
            topExp.href = `${String(base).replace(/\/$/, "")}/address/${address}`;
            topExp.classList.remove("disabled");
            topExp.target = "_blank";
        } else {
            topExp.classList.add("disabled");
        }
    }

    const vName = container.querySelector("#cs_viewName") || document.getElementById("cs_viewName");
    const vSym = container.querySelector("#cs_viewSymbol") || document.getElementById("cs_viewSymbol");
    const vDec = container.querySelector("#cs_viewDecimals") || document.getElementById("cs_viewDecimals");
    const vSup = container.querySelector("#cs_viewSupply") || document.getElementById("cs_viewSupply");
    const vAddr = container.querySelector("#cs_viewAddress") || document.getElementById("cs_viewAddress");
    const vCid = container.querySelector("#cs_viewChainId") || document.getElementById("cs_viewChainId");
    const txRow = container.querySelector("#cs_txRow") || document.getElementById("cs_txRow");
    const vTx = container.querySelector("#cs_viewTxHash") || document.getElementById("cs_viewTxHash");
    const vTokBal = container.querySelector("#cs_viewTokenBalance") || document.getElementById("cs_viewTokenBalance");
    const vNatBal = container.querySelector("#cs_viewNativeBalance") || document.getElementById("cs_viewNativeBalance");
    const vPair = container.querySelector("#cs_viewPairAddress") || document.getElementById("cs_viewPairAddress");
  
    if (vName) vName.textContent = "...";
    if (vSym) vSym.textContent = "...";
    if (vDec) vDec.textContent = "...";
    if (vSup) vSup.textContent = "...";
    if (vTokBal) vTokBal.textContent = "";
    if (vNatBal) vNatBal.textContent = "";
    if (vPair) vPair.textContent = "-";
  
    try {
      let sn, info;
      
      if (preloadedData) {
          sn = { name: preloadedData.tokenName, symbol: preloadedData.tokenSymbol };
          info = { 
              decimals: preloadedData.tokenDecimals, 
              totalSupply: preloadedData.tokenSupply,
              tokenBalance: preloadedData.contractTokenBalance,
              nativeBalance: preloadedData.contractNativeBalance
          };
      } else {
          [sn, info] = await Promise.all([
            detectSymbolName(address, chainId),
            fetchERC20Info(address, chainId)
          ]);
      }
  
      if (vAddr) {
        vAddr.textContent = address;
        const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
        const base = net?.explorers?.[0]?.url || getFallbackExplorer(chainId) || "";
        if (base) vAddr.href = `${String(base).replace(/\/$/, "")}/address/${address}`;
        else vAddr.removeAttribute("href");
      }
      
      try {
        const txHash = String(preloadedData?.txHash || "").trim();
        if (txRow) txRow.classList.toggle("d-none", !txHash);
        if (vTx) {
          if (txHash) {
            vTx.textContent = txHash;
            const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
            const base = net?.explorers?.[0]?.url || getFallbackExplorer(chainId) || "";
            if (base) vTx.href = `${String(base).replace(/\/$/, "")}/tx/${txHash}`;
            else vTx.removeAttribute("href");
          } else {
            vTx.textContent = "";
            vTx.removeAttribute("href");
          }
        }
      } catch (_) {}

      try {
        container.__tcQuickActionsState = {
          address: String(address || "").trim(),
          chainId: String(chainId || "").trim(),
          name: sn?.name || "",
          symbol: sn?.symbol || "",
          decimals: info?.decimals,
          explorerUrl: (() => {
            try { return String(vAddr?.href || "").trim(); } catch (_) { return ""; }
          })(),
        };
        applyQuickActions(container);
      } catch (_) {}
  
      if (vCid) {
        const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
        vCid.textContent = net ? `${chainId} - ${net.name}` : String(chainId);
      }
  
      if (vName) vName.textContent = sn.name || "-";
      if (vSym) vSym.textContent = sn.symbol || "-";
      if (vDec) vDec.textContent = info.decimals != null ? String(info.decimals) : "-";
      if (vSup) vSup.textContent = info.totalSupply || "-";
  
      try {
        const rpc = getPrimaryRpc(chainId);
        const bodies = [
          { jsonrpc: "2.0", id: 7, method: "eth_call", params: [{ to: String(address), data: "0x70a08231" + String(address).toLowerCase().replace(/^0x/, "").padStart(64, "0") }, "latest"] },
          { jsonrpc: "2.0", id: 8, method: "eth_getBalance", params: [String(address), "latest"] },
        ];
        // Only fetch balances if not explicitly skipped or if we want to refresh
        if (!options.skipBalances) {
            const js = await fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS);
            if (Array.isArray(js) && js.length) {
              const r7 = js.find((x) => x && x.id === 7);
              const r8 = js.find((x) => x && x.id === 8);
              const balHex = r7 && r7.result ? String(r7.result) : null;
              const nativeHex = r8 && r8.result ? String(r8.result) : null;
              const dec = info.decimals != null ? info.decimals : 18;
              const tokVal = formatUnits(balHex, dec);
              const natVal = formatUnits(nativeHex, 18);
              if (vTokBal) vTokBal.textContent = formatDecimalValue(tokVal);
              if (vNatBal) vNatBal.textContent = formatDecimalValue(natVal);
            }
        } else if (preloadedData) {
             // Use preloaded balances if skipping fetch
             if (vTokBal) vTokBal.textContent = preloadedData.contractTokenBalance || "-";
             if (vNatBal) vNatBal.textContent = preloadedData.contractNativeBalance || "-";
        }
      } catch (e) {
        log("updateContractDetailsView balances error", e);
        if (vTokBal && !vTokBal.textContent) vTokBal.textContent = "0";
        if (vNatBal && !vNatBal.textContent) vNatBal.textContent = "0";
      }
  
      // Disparar atualizações secundárias em paralelo (sem await) para não bloquear a UI principal
      if (!options.skipVerification) {
          updateVerificationBadge(container, chainId, address).catch(e => log("verify-badge-error", e));
      }
      if (!options.skipTradingPair) {
          updateTradingPair(container, chainId, address).catch(e => log("pair-error", e));
      }

      if (vPair && (!vPair.textContent || vPair.textContent.trim() === "-")) {
        vPair.textContent = "Buscando par..."; // Feedback imediato
      }
    } catch (e) {
      log("updateContractDetailsView error", e);
    }
}

// =============================================================================
// MAIN INITIALIZATION LOGIC
// =============================================================================

function showStatus(container, msg) {
  try {
    const wrap = container.querySelector("#contractSearchStatus") || document.getElementById("contractSearchStatus");
    const textEl = container.querySelector("#contractSearchStatusText") || document.getElementById("contractSearchStatusText");
    if (textEl) textEl.textContent = msg || "";
    if (wrap) wrap.classList.toggle("d-none", !msg);
  } catch (_) {}
}

function isStrictErrorsEnabled(container) {
  try {
    return String(container?.getAttribute?.("data-cs-strict-errors") || "false") === "true";
  } catch (_) {
    return false;
  }
}

function isAllowWalletEnabled(container) {
  try {
    return String(container?.getAttribute?.("data-cs-allow-wallet") || "false") === "true";
  } catch (_) {
    return false;
  }
}

async function quickHasCodeOnChain(address, chainId, timeoutMs = 1400) {
  try {
    const rpc = getPrimaryRpc(chainId);
    if (!rpc) return null;
    const body = { jsonrpc: "2.0", id: 100, method: "eth_getCode", params: [String(address), "latest"] };
    const js = await fetchJsonWithTimeout(rpc, body, timeoutMs);
    const code = js && js.result ? String(js.result) : "0x";
    return code !== "0x" && code !== "0x0";
  } catch (_) {
    return null;
  }
}

async function detectContractOnOtherNetwork(address, currentChainId) {
  try {
    const cur = parseInt(String(currentChainId || ""), 10);
    const candidates = [];

    [1, 56, 97, 137, 10, 42161].forEach((cid) => {
      if (cid && cid !== cur) candidates.push(cid);
    });

    try {
      const popular = networkManager?.getPopularNetworks?.(12) || [];
      popular.forEach((n) => {
        const cid = n?.chainId != null ? Number(n.chainId) : null;
        if (cid && cid !== cur) candidates.push(cid);
      });
    } catch (_) {}

    const unique = Array.from(new Set(candidates)).slice(0, 10);
    const start = Date.now();
    for (const cid of unique) {
      if (Date.now() - start > 3500) break;
      const hasCode = await quickHasCodeOnChain(address, cid, 1200);
      if (hasCode) return cid;
    }
    return null;
  } catch (_) {
    return null;
  }
}

async function hasEoaActivityOnChain(address, chainId) {
  try {
    const rpc = getPrimaryRpc(chainId);
    if (!rpc) return false;
    const bodies = [
      { jsonrpc: "2.0", id: 201, method: "eth_getTransactionCount", params: [String(address), "latest"] },
      { jsonrpc: "2.0", id: 202, method: "eth_getBalance", params: [String(address), "latest"] },
    ];
    const js = await fetchJsonWithTimeout(rpc, bodies, 1800);
    if (!Array.isArray(js)) return false;
    const r201 = js.find((x) => x && x.id === 201);
    const r202 = js.find((x) => x && x.id === 202);
    const cntHex = r201 && r201.result ? String(r201.result) : "0x0";
    const balHex = r202 && r202.result ? String(r202.result) : "0x0";
    const cnt = parseInt(cntHex, 16) || 0;
    const bal = toBigInt(balHex);
    return cnt > 0 || bal > 0n;
  } catch (_) {
    return false;
  }
}

function getStrictAddressErrorHtml() {
  return `
    <div class="text-start">
      <div class="mb-2">Possíveis causas:</div>
      <ul class="mb-0">
        <li>Endereço não informado</li>
        <li>Endereço inválido</li>
        <li>Endereço não pertence a esta rede (ou é uma carteira pessoal)</li>
      </ul>
    </div>
  `;
}

function showStrictAddressError(container, subtitle, onClear) {
  try {
    return showDiagnosis("VERIFY_NETWORK_OR_ADDRESS", {
      badge: subtitle || "",
      causes: getDefaultAddressCauses(),
      onClear,
    });
  } catch (_) {
    return false;
  }
}

async function performContractSearch(container, chainId, address) {
    if (isSearching) return null;
    isSearching = true;
    showStatus(container, "Buscando...");
    
    const btn = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");

    try {
      const sp = container.querySelector("#contractSearchSpinner") || document.getElementById("contractSearchSpinner");
      if (sp) sp.classList.remove("d-none");
      if (btn) btn.disabled = true;
    } catch (_) {}

    const resetUi = () => {
      try {
        const sp = container.querySelector("#contractSearchSpinner") || document.getElementById("contractSearchSpinner");
        if (sp) sp.classList.add("d-none");
        if (btn) btn.disabled = false;
      } catch (_) {}
    };

    const addrRaw = String(address || "").replace(/\s+$/u, "");
    const okAddr = /^0x[0-9a-fA-F]{40}$/.test(addrRaw);
    const chainIdRaw = String(chainId || "");

    const strict = isStrictErrorsEnabled(container);
    if (strict && !addrRaw) {
      showStatus(container, "");
      if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear({ silent: true });
      showStrictAddressError(container, "Endereço não informado.", () => {
        const clearAllBtn = document.getElementById("btnClearAll");
        if (clearAllBtn) clearAllBtn.click();
        else if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear();
        const addrEl = container.querySelector("#f_address") || document.getElementById("f_address");
        if (addrEl) addrEl.value = "";
      });
      isSearching = false;
      resetUi();
      return null;
    }

    if (strict && addrRaw && !okAddr) {
      showStatus(container, "");
      if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear({ silent: true });
      showStrictAddressError(container, "Endereço inválido.", () => {
        const clearAllBtn = document.getElementById("btnClearAll");
        if (clearAllBtn) clearAllBtn.click();
        else if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear();
        const addrEl = container.querySelector("#f_address") || document.getElementById("f_address");
        if (addrEl) addrEl.value = "";
      });
      isSearching = false;
      resetUi();
      return null;
    }

    if (!okAddr || !chainIdRaw) {
      showStatus(container, "Endereço inválido ou rede não selecionada.");
      isSearching = false;
      resetUi();
      return null;
    }

    // Core Logic
    const isContractPromise = checkIsContract(addrRaw, chainIdRaw);
    const snPromise = detectSymbolName(addrRaw, chainIdRaw);
    const infoPromise = fetchERC20Info(addrRaw, chainIdRaw);
    
    const [isC_raw, sn, info] = await Promise.all([
        isContractPromise, 
        snPromise, 
        infoPromise
    ]);

    let isC = isC_raw;
    if (isC === null) {
       // Fallback logic
       // Evita falso positivo de "contrato" quando um RPC retorna 0x0 para decimais em endereços EOA.
       // Para assumir "contrato" no fallback, exigimos metadata (symbol/nome) ou decimais > 0.
       const dec = info && typeof info.decimals === "number" ? info.decimals : null;
       if ((sn && (sn.symbol || sn.name)) || (Number.isFinite(dec) && dec > 0)) isC = true;
       else isC = false;
    }

    const payload = { chainId: parseInt(chainIdRaw, 10), contractAddress: addrRaw };
    const extra = {
      isContract: isC,
      tokenSymbol: sn.symbol,
      tokenName: sn.name,
      tokenDecimals: info.decimals,
      tokenSupply: info.totalSupply,
      contractTokenBalance: info.tokenBalance,
      contractNativeBalance: info.nativeBalance
    };

    // Caso raro: o RPC pode falhar no eth_getCode, mas ainda conseguimos ler metadata do token.
    // Evita marcar EOA como contrato quando decimais retornam 0 por inconsistência do RPC.
    const hasValidDecimals = Number.isFinite(extra.tokenDecimals) && extra.tokenDecimals > 0;
    if (!extra.isContract && (extra.tokenSymbol || extra.tokenName || hasValidDecimals)) {
      extra.isContract = true;
    }

    // Critério de "ERC-20 detectado" precisa ser forte para evitar falso positivo
    // (ex.: totalSupply=0 em contratos não-ERC20 ou respostas inconsistentes do RPC).
    const hasData = !!(extra.tokenName || extra.tokenSymbol || hasValidDecimals);
    if (strict && !hasData) {
      const allowWallet = isAllowWalletEnabled(container);
      const contractDetermined = isC_raw !== null;
      if (allowWallet && extra.isContract === false && contractDetermined) {
        // Primeiro, verificar se é contrato em outra rede (para evitar falso positivo de carteira)
        const otherChain = await detectContractOnOtherNetwork(addrRaw, chainIdRaw);
        if (otherChain) {
          showStatus(container, "");
          if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear({ silent: true });
          const otherNet = networkManager?.getNetworkById?.(otherChain);
          const label = otherNet?.name ? `${otherNet.name} (${otherChain})` : `chainId ${otherChain}`;
          const subtitle = `Endereço não pertence a esta rede. Encontrado em ${label}.`;
          showStrictAddressError(container, subtitle, () => {
            const clearAllBtn = document.getElementById("btnClearAll");
            if (clearAllBtn) clearAllBtn.click();
            else if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear();
            const addrEl = container.querySelector("#f_address") || document.getElementById("f_address");
            if (addrEl) addrEl.value = "";
          });
          isSearching = false;
          resetUi();
          return null;
        }
        // Em seguida, validar "existência" mínima da carteira na rede: saldo > 0 ou nonce > 0
        const hasActivity = await hasEoaActivityOnChain(addrRaw, chainIdRaw);
        if (!hasActivity) {
          showStatus(container, "");
          if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear({ silent: true });
          showStrictAddressError(container, "Endereço não encontrado nesta rede.", () => {
            const clearAllBtn = document.getElementById("btnClearAll");
            if (clearAllBtn) clearAllBtn.click();
            else if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear();
            const addrEl = container.querySelector("#f_address") || document.getElementById("f_address");
            if (addrEl) addrEl.value = "";
          });
          isSearching = false;
          resetUi();
          return null;
        }
        // Caso tenha atividade, permitir fluxo de carteira (EOA)
        showStatus(container, "Endereço identificado como Carteira (EOA).");
      } else {
      showStatus(container, "");
      if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear({ silent: true });
      const subtitle = "Endereço com erro para a rede selecionada.";
      showStrictAddressError(container, subtitle, () => {
        const clearAllBtn = document.getElementById("btnClearAll");
        if (clearAllBtn) clearAllBtn.click();
        else if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear();
        const addrEl = container.querySelector("#f_address") || document.getElementById("f_address");
        if (addrEl) addrEl.value = "";
      });
      isSearching = false;
      resetUi();
      return null;
      }
    }

    const merged = { ...payload, ...extra };

    // Dispatch event
    const evt = new CustomEvent("contract:found", { detail: { contract: merged }, bubbles: true });
    try { container.dispatchEvent(evt); } catch (_) {}

    try {
      if (addrRaw) document.cookie = `tokencafe_contract=${encodeURIComponent(String(addrRaw))}; Path=/; SameSite=Lax`;
      if (chainIdRaw) document.cookie = `tokencafe_chain_id=${encodeURIComponent(String(chainIdRaw))}; Path=/; SameSite=Lax`;
      const sp = new URLSearchParams(window.location.search || "");
      const page = String(sp.get("page") || "contrato-detalhes");
      const body = new URLSearchParams({ page });
      if (addrRaw) body.set("contract", String(addrRaw));
      if (chainIdRaw) body.set("chainId", String(chainIdRaw));
      if (navigator.sendBeacon) {
        const blob = new Blob([body.toString()], { type: "application/x-www-form-urlencoded" });
        navigator.sendBeacon("log-event.php", blob);
      } else {
        fetch("log-event.php", { method: "POST", body, credentials: "include", keepalive: true, headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" } });
      }
    } catch (_) {}

    // Update UI
    // Reuse the shared updater!
    // Para carteiras (EOA) evitamos chamadas que dependem de explorer/contrato (verificação e par de trading).
    await updateContractDetailsView(container, chainIdRaw, addrRaw, merged, {
      autoShowCard: container.getAttribute("data-cs-auto-open") === "true",
      skipVerification: merged?.isContract === false,
      skipTradingPair: merged?.isContract === false,
      skipBalances: merged?.isContract === false,
    });
    
    try {
      if (container.getAttribute("data-cs-auto-open") === "true") {
        const card2 = container.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");
        if (card2) card2.classList.remove("d-none");
      }
    } catch (_) {}
    
    // Status Logic
    const infoBtn = container.querySelector("#csInfoBtn");
    
    if (!hasData) {
        if (infoBtn) infoBtn.disabled = true;
        let msg = !extra.isContract ? "Endereço é uma Carteira Pessoal (EOA)." : "Contrato sem dados ERC-20 ou rede incorreta.";
        showStatus(container, msg);
    } else {
        if (infoBtn) infoBtn.disabled = false;
        showStatus(container, "");
    }

    // Reset UI State
    try {
      const sp = container.querySelector("#contractSearchSpinner") || document.getElementById("contractSearchSpinner");
      if (sp) sp.classList.add("d-none");
      
      if (btn) {
          btn.disabled = false;
          if (hasData) {
              btn.setAttribute("data-mode", "clear");
              btn.classList.add("btn-outline-secondary");
              const icon = btn.querySelector("i");
              if (icon) icon.className = "bi bi-x-circle";
          }
      }
    } catch (_) {}

    isSearching = false;
    return { ...payload, ...extra };
}

function initContainer(container) {
  if (!container || container.getAttribute("data-cs-initialized") === "true") return;

  let btn = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");
  if (!btn && !container.getAttribute("data-cs-view-only")) {
     // If no button and not view only, try to find global button or bail
     btn = document.getElementById("contractSearchBtn");
  }

  // View Mode Config
  try {
    const isViewOnly = String(container.getAttribute("data-cs-view-only") || "false") === "true";
    const titleAttr = container.getAttribute("data-cs-title");
    const subtitleAttr = container.getAttribute("data-cs-subtitle");
    const titleEl = container.querySelector("#cs_title");
    const subtitleEl = container.querySelector("#cs_subtitle");
    if (titleAttr && titleEl) titleEl.textContent = titleAttr;
    if (subtitleEl) {
      if (subtitleAttr) subtitleEl.textContent = subtitleAttr;
      else if (isViewOnly) subtitleEl.textContent = "Contrato enviado pelo link";
    }
    if (isViewOnly) {
      const formEl = container.querySelector("#tokenForm");
      const statusEl = container.querySelector("#contractSearchStatus");
      const inputGroupEl = container.querySelector(".input-group");
      const infoBtnInit = container.querySelector("#csInfoBtn");
      if (formEl) formEl.classList.add("d-none");
      if (statusEl) statusEl.classList.add("d-none");
      if (inputGroupEl) inputGroupEl.classList.add("d-none");
      if (infoBtnInit) infoBtnInit.classList.add("d-none");
    }
  } catch (_) {}

  function clearVisualState(options = {}) {
    try {
      const silent = !!options?.silent;
      const infoBtn = container.querySelector("#csInfoBtn");
      const card = container.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");

      if (infoBtn) {
          infoBtn.disabled = true;
      }
      if (card) card.classList.add("d-none");

      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("data-mode");
        btn.classList.remove("btn-secondary", "btn-primary");
        btn.classList.add("btn-outline-primary");
        const icon = btn.querySelector("i");
        if (icon) icon.className = "bi bi-search";
      }

      showStatus(container, "");

      const vAddr = container.querySelector("#cs_viewAddress") || document.getElementById("cs_viewAddress");
      const vCid = container.querySelector("#cs_viewChainId") || document.getElementById("cs_viewChainId");
      const vName = container.querySelector("#cs_viewName") || document.getElementById("cs_viewName");
      const vSym = container.querySelector("#cs_viewSymbol") || document.getElementById("cs_viewSymbol");
      const vDec = container.querySelector("#cs_viewDecimals") || document.getElementById("cs_viewDecimals");
      const vSup = container.querySelector("#cs_viewSupply") || document.getElementById("cs_viewSupply");
      const vTokBal = container.querySelector("#cs_viewTokenBalance") || document.getElementById("cs_viewTokenBalance");
      const vNatBal = container.querySelector("#cs_viewNativeBalance") || document.getElementById("cs_viewNativeBalance");
      const vStatus = container.querySelector("#cs_viewStatus") || document.getElementById("cs_viewStatus");
      const vWalletStatus = container.querySelector("#cs_viewWalletStatus") || document.getElementById("cs_viewWalletStatus");
      const topExp = container.querySelector("#csExplorerBtn") || document.getElementById("csExplorerBtn");
      const txRow = container.querySelector("#cs_txRow") || document.getElementById("cs_txRow");
      const vTx = container.querySelector("#cs_viewTxHash") || document.getElementById("cs_viewTxHash");

      if (vAddr) { vAddr.textContent = ""; vAddr.removeAttribute("href"); }
      if (vCid) vCid.textContent = "";
      if (txRow) txRow.classList.add("d-none");
      if (vTx) { vTx.textContent = ""; vTx.removeAttribute("href"); }
      if (vName) vName.textContent = "";
      if (vSym) vSym.textContent = "";
      if (vDec) vDec.textContent = "";
      if (vSup) vSup.textContent = "";
      if (vTokBal) vTokBal.textContent = "";
      if (vNatBal) vNatBal.textContent = "";
      if (vStatus) vStatus.innerHTML = "";
      if (vWalletStatus) vWalletStatus.innerHTML = "-";
      if (topExp) { topExp.href = "#"; topExp.classList.add("disabled"); }

      try { container.__tcQuickActionsState = null; } catch (_) {}
      try {
        const qs = [
          "[data-cs-open-explorer]",
          "[data-cs-share-whatsapp]",
          "[data-cs-share-telegram]",
          "[data-cs-share-email]",
          "[data-cs-add-token]",
        ];
        qs.forEach((sel) => {
          const el = container.querySelector(sel);
          if (!el) return;
          el.disabled = true;
          el.classList.add("disabled");
          el.setAttribute("aria-disabled", "true");
          el.onclick = null;
        });
      } catch (_) {}

      const evt = new CustomEvent("contract:clear", { detail: { silent }, bubbles: true });
      try { container.dispatchEvent(evt); } catch (_) {}
    } catch (e) {}
  }
  try {
    container.__tcContractSearchClear = clearVisualState;
  } catch (_) {}

  // Helper: Find Chain ID
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
        const p = new URLSearchParams(location.search);
        raw = p.get("chainId") || "";
       } catch(_) {}
    }
    return raw;
  }

  // Event Listeners
  if (btn) {
      // Simplification: Do not clone. Just attach.
      // We rely on data-cs-initialized to prevent duplicates.
      btn.addEventListener("click", (e) => {
          e.preventDefault(); // Prevent form submit
          e.stopPropagation();
          if (btn.getAttribute("data-mode") === "clear") {
              clearVisualState();
              const addrField = document.getElementById("f_address");
              if (addrField) { addrField.value = ""; }
              return;
          }
          
          const addrField = document.getElementById("f_address") || document.getElementById("tokenAddress");
          const addrRaw = String(addrField?.value || "").replace(/\s+$/u, "");
          const chainIdRaw = findChainId();
          
          performContractSearch(container, chainIdRaw, addrRaw);
      });
  }

  const formEl = container.querySelector("#tokenForm");
  if (formEl) {
      // Simplification: Do not clone. Just attach submit handler.
      formEl.addEventListener("submit", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentBtn = formEl.querySelector("#contractSearchBtn");
          if (currentBtn && currentBtn.getAttribute("data-mode") !== "clear") {
              const addrField = document.getElementById("f_address") || document.getElementById("tokenAddress");
              const addrRaw = String(addrField?.value || "").replace(/\s+$/u, "");
              const chainIdRaw = findChainId();
              
              performContractSearch(container, chainIdRaw, addrRaw);
          }
      });
  }
  
  const copyInputBtn = container.querySelector("[data-cs-copy-input]");
  if (copyInputBtn) {
    copyInputBtn.addEventListener("click", () => {
        const val = container.querySelector("#f_address")?.value;
        if (!val) return;
        if (window.copyToClipboard) {
          window.copyToClipboard(val);
          return;
        }
        navigator.clipboard?.writeText?.(val).catch(() => {});
    });
  }

  const copyAddressBtn = container.querySelector("[data-cs-copy-address]");
  if (copyAddressBtn) {
    copyAddressBtn.addEventListener("click", () => {
        const val = container.querySelector("#cs_viewAddress")?.textContent;
        if (!val) return;
        if (window.copyToClipboard) {
          window.copyToClipboard(val);
          return;
        }
        navigator.clipboard?.writeText?.(val).catch(() => {});
    });
  }

  try {
    if (container.__tcQuickActionsListenersAttached !== true) {
      container.__tcQuickActionsListenersAttached = true;
      const rerun = () => {
        try { applyQuickActions(container); } catch (_) {}
      };
      document.addEventListener("wallet:connected", rerun);
      document.addEventListener("wallet:disconnected", rerun);
      try {
        if (window.ethereum && typeof window.ethereum.on === "function") {
          window.ethereum.on("accountsChanged", rerun);
          window.ethereum.on("chainChanged", () => setTimeout(rerun, 300));
        }
      } catch (_) {}
    }
  } catch (_) {}

  const infoBtn = container.querySelector("#csInfoBtn");
  if (infoBtn) {
      infoBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const card = container.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");
          if (card) card.classList.toggle("d-none");
      });
  }

  const hasContent = container.querySelector("#contractSearchBtn") || container.querySelector("#tokenForm") || container.querySelector("#csInfoBtn");
  if (hasContent) {
    container.setAttribute("data-cs-initialized", "true");
  }
}

function findContainers() {
  const nodes = document.querySelectorAll('[data-component*="contract-search.php"]');
  nodes.forEach(initContainer);
}

// Auto-init
findContainers();
const observer = new MutationObserver(() => {
  findContainers();
});
observer.observe(document.body, { childList: true, subtree: true });

export { initContainer, updateVerificationBadge, updateContractDetailsView, performContractSearch };
