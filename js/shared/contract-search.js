import { networkManager } from "./network-manager.js";
import { getApiBase, getVerificationStatus } from "./verify-utils.js";
import { getFallbackExplorer, getFallbackRpc } from "./network-fallback.js";
import { findLiquidityPair } from "./dex-utils.js";

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

  // Removida checagem de contexto específica para permitir uso genérico
  let btn = container.querySelector("#contractSearchBtn");
  if (!btn) {
    try {
      // Fallback para ID global se não encontrar no container (não ideal, mas mantém compatibilidade)
      btn = document.getElementById("contractSearchBtn");
    } catch {
      btn = null;
    }
    if (!btn) return;
  }

  function showStatus(msg) {
    try {
      // Prioriza busca no container, fallback para global
      const wrap = container.querySelector("#contractSearchStatus") || document.getElementById("contractSearchStatus");
      const textEl = container.querySelector("#contractSearchStatusText") || document.getElementById("contractSearchStatusText");
      if (textEl) textEl.textContent = msg || "";
      if (wrap) wrap.classList.toggle("d-none", !msg);
    } catch (_) {}
  }

  // Configuração de modo de visualização (sem campos)
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

  function clearVisualState() {
    try {
      const infoBtn = container.querySelector("#csInfoBtn");
      const btn = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");
      const card = container.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");

      if (infoBtn) infoBtn.disabled = true;
      if (card) card.classList.add("d-none");

      if (btn) {
        btn.disabled = false;
        btn.removeAttribute("data-mode");
        btn.classList.remove("btn-secondary", "btn-primary");
        btn.classList.add("btn-outline-primary");
        const icon = btn.querySelector("i");
        if (icon) icon.className = "bi bi-search";
      }

      showStatus("");

      // Limpar campos de visualização - Prioriza container
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

      if (vAddr) {
        vAddr.textContent = "";
        vAddr.removeAttribute("href");
      }
      if (vCid) vCid.textContent = "";
      if (vName) vName.textContent = "";
      if (vSym) vSym.textContent = "";
      if (vDec) vDec.textContent = "";
      if (vSup) vSup.textContent = "";
      if (vTokBal) vTokBal.textContent = "";
      if (vNatBal) vNatBal.textContent = "";
      if (vStatus) vStatus.innerHTML = "";
      if (vWalletStatus) vWalletStatus.innerHTML = "-";
      if (topExp) {
        topExp.href = "#";
        topExp.classList.add("disabled");
      }


      const evt = new CustomEvent("contract:clear", { bubbles: true });
      try {
        container.dispatchEvent(evt);
      } catch (_) {}
      try {
        document.dispatchEvent(evt);
      } catch (_) {}
    } catch (e) {
      try {
        log("clear-error", e);
      } catch {}
    }
  }

  // Botões de copiar (input e endereço exibido)
  try {
    const copyInputBtn = container.querySelector("[data-cs-copy-input]");
    if (copyInputBtn) {
      copyInputBtn.addEventListener("click", () => {
        try {
          const input = container.querySelector("#f_address") || document.getElementById("f_address");
          const val = input?.value || "";
          if (val && window.copyToClipboard) {
            window.copyToClipboard(val);
          }
        } catch (_) {}
      });
    }
    const copyAddressBtn = container.querySelector("[data-cs-copy-address]");
    if (copyAddressBtn) {
      copyAddressBtn.addEventListener("click", () => {
        try {
          const addrEl = container.querySelector("#cs_viewAddress") || document.getElementById("cs_viewAddress");
          const val = addrEl?.textContent || "";
          if (val && window.copyToClipboard) {
            window.copyToClipboard(val);
          }
        } catch (_) {}
      });
    }
  } catch (_) {}

  async function refreshWalletStatus() {
    try {
      const vWalletStatus = container.querySelector("#cs_viewWalletStatus") || document.getElementById("cs_viewWalletStatus");
      if (!vWalletStatus) return;
      const addr = sessionStorage.getItem("tokencafe_last_contract") || "";
      const chainId = sessionStorage.getItem("tokencafe_last_chain") || "";
      const decStr = sessionStorage.getItem("tokencafe_last_decimals") || "";
      const dec = /^\d+$/.test(decStr) ? parseInt(decStr, 10) : 18;
      if (!/^0x[0-9a-fA-F]{40}$/.test(addr) || !chainId) return;
      let userAddr = null;
      try {
        if (typeof window !== "undefined" && window.ethereum && window.ethereum.request) {
          const accts = await window.ethereum.request({ method: "eth_accounts" }).catch(() => []);
          if (accts && accts.length) userAddr = accts[0];
        }
      } catch (_) {}
      if (!userAddr) {
        vWalletStatus.innerHTML = '<span class="text-muted"><i class="bi bi-dash-circle me-1"></i>Carteira não conectada ou verificação falhou</span>';
        return;
      }
      const rpc = getPrimaryRpc(chainId);
      const body = { jsonrpc: "2.0", id: 99, method: "eth_call", params: [{ to: String(addr), data: "0x70a08231" + String(userAddr).toLowerCase().replace(/^0x/, "").padStart(64, "0") }, "latest"] };
      const js = await fetchJsonWithTimeout(rpc, body, MAX_TIMEOUT_MS);
      const balHex = js && js.result ? String(js.result) : null;
      if (balHex && balHex !== "0x") {
        try {
          const b = BigInt(balHex);
          if (b > 0n) {
            const val = formatUnits(balHex, dec);
            const valFmt = formatDecimalValue(val);
            vWalletStatus.innerHTML = `<span class="text-tokencafe"><i class="bi bi-wallet2 me-1"></i>Encontrado na carteira (Saldo: ${valFmt})</span>`;
            return;
          }
        } catch (_) {}
      }
      vWalletStatus.innerHTML = '<span class="text-secondary"><i class="bi bi-wallet me-1"></i>Não encontrado na carteira conectada</span>';
    } catch (e) {
      try {
        log("wallet-refresh-error", e);
      } catch {}
    }
  }

  // Inicialização explícita do botão info
  const infoBtnInit = container.querySelector("#csInfoBtn");
  if (infoBtnInit) infoBtnInit.disabled = true;

  // Adicionar listener para resetar estado interno quando solicitado externamente
  container.addEventListener("contract:clear", () => {
    performClear(false);
  });

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

  // Fallbacks agora centralizados em js/shared/network-fallback.js

  const MAX_TIMEOUT_MS = 1500;
  const GLOBAL_LIMIT_MS = 2000;
  const DISABLE_MULTI_RPC_FALLBACK = true;

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

  async function fetchJsonWithTimeout(rpc, body, timeoutMs) {
    try {
      const rpcUrl = sanitizeRpcUrl(rpc);
      const ctrl = new AbortController();
      const t = setTimeout(() => {
        try {
          const label = Array.isArray(body)
            ? body
                .map((b) => b && b.method)
                .filter(Boolean)
                .join(",") || "batch"
            : body?.method;
          log("timeout", { rpc: rpcUrl, method: label, timeoutMs });
        } catch (_) {}
        ctrl.abort();
      }, timeoutMs);
      const resp = await fetch(rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal });
      clearTimeout(t);
      if (!resp.ok) return null;
      try {
        const label = Array.isArray(body)
          ? body
              .map((b) => b && b.method)
              .filter(Boolean)
              .join(",") || "batch"
          : body?.method;
        log("rpc ok", { rpc: rpcUrl, method: label, status: resp.status });
      } catch (_) {}
      return await resp.json();
    } catch (_) {
      try {
        const label = Array.isArray(body)
          ? body
              .map((b) => b && b.method)
              .filter(Boolean)
              .join(",") || "batch"
          : body?.method;
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

  function formatDecimalValue(val) {
    if (!val && val !== 0 && val !== "0") return "";
    try {
      const s = String(val);
      const parts = s.split(".");
      let whole = parts[0];
      if (whole === "") whole = "0"; // Fix for ".123"
      const frac = parts.length > 1 ? parts[1] : "";
      const wholeFmt = BigInt(whole).toLocaleString("pt-BR");
      return frac ? `${wholeFmt},${frac.substring(0, 8)}` : wholeFmt;
    } catch (_) {
      return val;
    }
  }

  async function checkIsContract(addr, chainId) {
    try {
      // Tentar via window.ethereum se disponível e na mesma rede
      if (typeof window !== "undefined" && window.ethereum && window.ethereum.request) {
        try {
          const curChain = await window.ethereum.request({ method: "eth_chainId" });
          if (parseInt(curChain, 16) === Number(chainId)) {
            const code = await window.ethereum.request({ method: "eth_getCode", params: [String(addr), "latest"] });
            const isC = code !== "0x" && code !== "0x0";
            log("checkIsContract:metamask", { address: addr, chainId, isContract: isC });
            return isC;
          }
        } catch (_) {}
      }

      const rpc = getPrimaryRpc(chainId);
      const body = { jsonrpc: "2.0", id: 10, method: "eth_getCode", params: [String(addr), "latest"] };
      const js = await fetchJsonWithTimeout(rpc, body, MAX_TIMEOUT_MS);
      const code = js && js.result ? String(js.result) : "0x";
      const isC = code !== "0x" && code !== "0x0";
      log("checkIsContract:rpc", { address: addr, chainId, isContract: isC, rpc });
      return isC;
    } catch (e) {
      log("checkIsContract:error", e);
      return null;
    }
  }

  async function updateTradingPair(container, chainId, address) {
    try {
      const vPair = container.querySelector("#cs_viewPairAddress") || document.getElementById("cs_viewPairAddress");
      const rpc = getPrimaryRpc(chainId);
      const pairInfo = await findLiquidityPair(chainId, address, rpc);
      try { log("pair-info", pairInfo); } catch {}

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
              // Se estiver num container oculto (ex: d-none no label), mostrar
              if (vPair.closest(".d-none")) vPair.closest(".d-none").classList.remove("d-none");
          } catch(_){}
        } else {
          vPair.textContent = "Nenhum par encontrado";
        }
      } else {
        // Fallback: Injetar em "Outras configs" se encontrado
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
      try { log("pair-error", e); } catch {}
    }
  }

  async function updateVerificationBadge(container, chainId, address) {
    const vStatus = container.querySelector("#cs_viewStatus") || document.querySelector("#cs_viewStatus");

    try {
      const js = await getVerificationStatus(chainId, address);
      try { log("verify-result", js); } catch {}
      
      const vCv = container.querySelector("#cs_viewCompilerVersion") || document.querySelector("#cs_viewCompilerVersion");
      const vOpt = container.querySelector("#cs_viewOptimization") || document.querySelector("#cs_viewOptimization");
      const vOth = container.querySelector("#cs_viewOtherSettings") || document.querySelector("#cs_viewOtherSettings");
      const vDep = container.querySelector("#cs_viewDeployer") || document.querySelector("#cs_viewDeployer");
      const vCreationTx = container.querySelector("#cs_viewCreationTx") || document.querySelector("#cs_viewCreationTx");

      if (vCv) {
        const cv = js?.compilerVersion || js?.explorer?.compilerVersion || "-";
        vCv.textContent = cv;
        vCv.className = "text-tokencafe fw-medium";
      }
      
      if (vOpt) {
          const opt = js?.explorer?.optimizationUsed; // "1" or "0" typically
          if (opt === "1" || opt === 1 || opt === true || opt === "true") {
              const runs = js?.explorer?.runs ? ` (Runs: ${js.explorer.runs})` : "";
              vOpt.textContent = "Sim" + runs;
          } else if (opt === "0" || opt === 0 || opt === false || opt === "false") {
              vOpt.textContent = "Não";
          } else {
              vOpt.textContent = "-";
          }
          vOpt.className = "text-tokencafe fw-medium";
      }

      if (vOth) {
          const evm = js?.explorer?.evmVersion || "";
          const lic = js?.explorer?.licenseType || "";
          const proxy = js?.explorer?.proxy === "1" ? "Proxy" : "";
          
          const parts = [];
          if (evm && evm !== "Default") parts.push(`EVM: ${evm}`);
          if (lic && lic !== "None" && lic !== "Unlicense") parts.push(`Licença: ${lic}`);
          if (proxy) parts.push(proxy);
          
          vOth.textContent = parts.length > 0 ? parts.join(", ") : "-";
          vOth.className = "text-tokencafe fw-medium";
      }



      // Helper to update main status field
      const updateMainStatus = (status) => {
        if (!vStatus) return;
        
        // Remove verificado/não verificado anterior se houver (para evitar duplicação em re-runs)
        const oldBadges = vStatus.querySelectorAll(".badge-verif-status");
        oldBadges.forEach(el => el.remove());

        if (status === 'verified') {
          const span = document.createElement("span");
          span.className = "badge bg-success-subtle text-success border border-success ms-2 badge-verif-status";
          span.innerHTML = '<i class="bi bi-shield-check me-1"></i>Verificado';
          vStatus.appendChild(span);
        } else if (status === 'error') {
          const span = document.createElement("span");
          span.className = "badge bg-secondary-subtle text-secondary border border-secondary ms-2 badge-verif-status";
          span.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>Erro status';
          span.title = "Não foi possível verificar o status no explorer";
          vStatus.appendChild(span);
        } else {
          const span = document.createElement("span");
          span.className = "badge bg-danger-subtle text-danger border border-danger ms-2 badge-verif-status";
          span.innerHTML = '<i class="bi bi-shield-x me-1"></i>Não verificado';
          vStatus.appendChild(span);
        }
      };

      // Update warning visibility
      const warningDiv = container.querySelector("#cs_verifiedWarning");
      if (warningDiv) {
          if (js?.verified) warningDiv.classList.remove("d-none");
          else warningDiv.classList.add("d-none");
      }

      if (js?.verified) {
        updateMainStatus('verified');
      } else if (js?.error) {
        updateMainStatus('error');
      } else {
        updateMainStatus('not_verified');
      }
    } catch (e) {
      try {
        log("verify-error", e);
      } catch {}
    }
  }

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
      if (!addrRaw || !String(addrRaw).trim().length) {
        try {
          clearVisualState();
          showStatus("");
        } catch (_) {}
      } else {
        showStatus("Endereço inválido ou não informado.");
        try {
          const evtErr = new CustomEvent("form:error", { detail: { message: "Endereço inválido ou não informado.", container }, bubbles: true });
          document.dispatchEvent(evtErr);
        } catch (_) {}
      }
      try {
        log("invalid-input");
      } catch (_) {}
      try {
        const sp = container.querySelector("#contractSearchSpinner") || document.getElementById("contractSearchSpinner");
        const btnEl = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");
        if (sp) sp.classList.add("d-none");
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.removeAttribute("data-mode");
          btnEl.classList.remove("btn-secondary");
          btnEl.classList.add("btn-primary");
          const icon = btnEl.querySelector("i");
          if (icon) icon.className = "bi bi-search";
        }
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
    const isContractPromise = checkIsContract(addrRaw, chainIdRaw);
    const snPromise = detectSymbolName(addrRaw, chainIdRaw);
    const infoPromise = fetchERC20Info(addrRaw, chainIdRaw);
    const [isC_raw, sn, info] = await Promise.all([withTimeout(isContractPromise, GLOBAL_LIMIT_MS, null), withTimeout(snPromise, GLOBAL_LIMIT_MS, { symbol: null, name: null }), withTimeout(infoPromise, GLOBAL_LIMIT_MS, { decimals: null, totalSupply: null, tokenBalance: null, nativeBalance: null })]);

    // Lógica de fallback inteligente para isContract
    let isC = isC_raw;
    if (isC === null) {
      // Se a verificação falhou ou deu timeout
      if ((sn && sn.symbol) || (info && info.decimals != null)) {
        // Se tem símbolo ou decimais, quase certamente é contrato
        isC = true;
      } else {
        // Se não tem dados de token, assumimos carteira por padrão se a verificação falhou?
        // Melhor ser conservador: se tem saldo nativo e nenhum dado de token, provável carteira.
        // Vamos manter null se realmente não sabemos, ou true para permitir fluxo se necessário?
        // O usuário quer diferenciar.
        isC = false; // Assumir carteira se não conseguimos provar que é contrato e não tem dados de token
      }
    }
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
    try {
      sessionStorage.setItem("tokencafe_last_chain", String(chainIdRaw));
    } catch (_) {}
    const extra = {
      isContract: isC,
      tokenSymbol: (sn && sn.symbol ? sn.symbol : null) || symbolFallback || null,
      tokenName: (sn && sn.name ? sn.name : null) || nameFallback || null,
      tokenDecimals: (info && typeof info.decimals === "number" ? info.decimals : null) ?? (typeof decimalsFallback === "number" ? decimalsFallback : null),
      tokenSupply: (info && info.totalSupply ? info.totalSupply : null) || supplyFallback || null,
      contractTokenBalance: (info && info.tokenBalance ? info.tokenBalance : null) || tokenBalFallback || null,
      contractNativeBalance: info && info.nativeBalance ? info.nativeBalance : null,
    };
    try {
      if ((!extra.tokenName || !extra.tokenSymbol || extra.tokenDecimals == null) && typeof csReadErc20Meta === "function") {
        const meta = await csReadErc20Meta(chainIdRaw, addrRaw);
        if (meta) {
          if (!extra.tokenName && meta.name) extra.tokenName = meta.name;
          if (!extra.tokenSymbol && meta.symbol) extra.tokenSymbol = meta.symbol;
          if (extra.tokenDecimals == null && typeof meta.decimals === "number") extra.tokenDecimals = meta.decimals;
          if (!extra.tokenSupply && meta.totalSupply != null) extra.tokenSupply = csFormatTokenAmount(meta.totalSupply, meta.decimals || 0);
        }
      }
    } catch (_) {}
    try {
      if (!extra.isContract && (extra.tokenSymbol || extra.tokenDecimals != null)) {
        extra.isContract = true;
      }
      const isToken = !!(extra.isContract && (extra.tokenSymbol || extra.tokenDecimals != null));
      extra.assetType = !extra.isContract ? "wallet" : isToken ? "token" : "contract";
    } catch (_) {}
    try {
      const rpc = getPrimaryRpc(chainIdRaw);
      let userAddr = null;
      try {
        if (typeof window !== "undefined" && window.ethereum && window.ethereum.request) {
          const accts = await window.ethereum.request({ method: "eth_accounts" }).catch(() => []);
          if (accts && accts.length) userAddr = accts[0];
        }
      } catch (_) {}

      const bodies = [
        { jsonrpc: "2.0", id: 7, method: "eth_call", params: [{ to: String(addrRaw), data: "0x70a08231" + String(addrRaw).toLowerCase().replace(/^0x/, "").padStart(64, "0") }, "latest"] },
        { jsonrpc: "2.0", id: 8, method: "eth_getBalance", params: [String(addrRaw), "latest"] },
      ];
      if (userAddr) {
        bodies.push({ jsonrpc: "2.0", id: 99, method: "eth_call", params: [{ to: String(addrRaw), data: "0x70a08231" + String(userAddr).toLowerCase().replace(/^0x/, "").padStart(64, "0") }, "latest"] });
      }

      let balHex = null;
      let nativeHex = null;
      let walletBalHex = null;
      const js = await fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS);
      if (Array.isArray(js) && js.length) {
        const r7 = js.find((x) => x && x.id === 7);
        const r8 = js.find((x) => x && x.id === 8);
        const r99 = js.find((x) => x && x.id === 99);
        balHex = r7 && r7.result ? String(r7.result) : null;
        nativeHex = r8 && r8.result ? String(r8.result) : null;

        if (r99 && r99.result && r99.result !== "0x") {
          walletBalHex = r99.result;
          try {
            const ub = BigInt(r99.result);
            if (ub > 0n) {
              if (window.notify) {
                window.notify("Contrato já cadastrado na sua carteira (saldo encontrado). Mude de carteira para adicioná-lo novamente.", "warning", { timeout: 8000 });
              }
            }
          } catch (_) {}
        } else if (userAddr) {
          walletBalHex = "0"; // User connected but balance 0 or error
        }
      }
      const d = extra.tokenDecimals != null ? extra.tokenDecimals : 18;
      extra.contractTokenBalance = formatUnits(balHex, d);
      extra.contractNativeBalance = formatUnits(nativeHex, 18);
      extra.walletBalance = walletBalHex;
      try {
        log("balances:result", { tokenBalanceHex: balHex, nativeBalanceHex: nativeHex, walletBalanceHex: walletBalHex, decimals: d });
      } catch (_) {}
    } catch (e) {
      try {
        log("error", e);
      } catch {}
    }
    try {
      log("emit:contract:found", { payload: { ...payload, ...extra } });
    } catch (_) {}
    const evt = new CustomEvent("contract:found", { detail: { contract: { ...payload, ...extra } }, bubbles: true });
    try {
      document.dispatchEvent(evt);
    } catch (_) {
      try {
        container.dispatchEvent(evt);
      } catch (_) {}
    }

    try {
      const vAddr = container.querySelector("#cs_viewAddress") || document.querySelector("#cs_viewAddress");
      const vCid = container.querySelector("#cs_viewChainId") || document.querySelector("#cs_viewChainId");
      const vName = container.querySelector("#cs_viewName") || document.querySelector("#cs_viewName");
      const vSym = container.querySelector("#cs_viewSymbol") || document.querySelector("#cs_viewSymbol");
      const vDec = container.querySelector("#cs_viewDecimals") || document.querySelector("#cs_viewDecimals");
      const vSup = container.querySelector("#cs_viewSupply") || document.querySelector("#cs_viewSupply");
      const vTokBal = container.querySelector("#cs_viewTokenBalance") || document.querySelector("#cs_viewTokenBalance");
      const vNatBal = container.querySelector("#cs_viewNativeBalance") || document.querySelector("#cs_viewNativeBalance");
      const vStatus = container.querySelector("#cs_viewStatus") || document.querySelector("#cs_viewStatus");
      const vWalletStatus = container.querySelector("#cs_viewWalletStatus") || document.querySelector("#cs_viewWalletStatus");
      // const vExp = container.querySelector("#cs_viewExplorer") || document.querySelector("#cs_viewExplorer"); // Removed
      const topExp = container.querySelector("#csExplorerBtn") || document.querySelector("#csExplorerBtn");
      if (vAddr) vAddr.textContent = addrRaw;
      if (vCid) {
        const net = networkManager?.getNetworkById?.(parseInt(payload.chainId, 10));
        vCid.textContent = net ? `${payload.chainId} - ${net.name}` : String(payload.chainId || "");
      }
      if (vName) vName.textContent = extra.tokenName || "";
      if (vSym) vSym.textContent = extra.tokenSymbol || "";
      if (vDec) vDec.textContent = extra.tokenDecimals != null ? String(extra.tokenDecimals) : "";
      if (vSup) vSup.textContent = formatDecimalValue(extra.tokenSupply);
      if (vTokBal) vTokBal.textContent = formatDecimalValue(extra.contractTokenBalance);
      if (vNatBal) vNatBal.textContent = formatDecimalValue(extra.contractNativeBalance);

      // Wallet Status Logic
      if (vWalletStatus) {
        if (extra.walletBalance && BigInt(extra.walletBalance) > 0n) {
          const val = formatUnits(extra.walletBalance, extra.tokenDecimals);
          const valFmt = formatDecimalValue(val);
          vWalletStatus.innerHTML = `<span class="text-tokencafe"><i class="bi bi-wallet2 me-1"></i>Encontrado na carteira (Saldo: ${valFmt})</span>`;
        } else if (extra.walletBalance === "0" || extra.walletBalance === 0n || extra.walletBalance === "0x0") {
          vWalletStatus.innerHTML = '<span class="text-secondary"><i class="bi bi-wallet me-1"></i>Não encontrado na carteira conectada</span>';
        } else {
          vWalletStatus.innerHTML = '<span class="text-muted"><i class="bi bi-dash-circle me-1"></i>Carteira não conectada ou verificação falhou</span>';
        }
      }
      try {
        sessionStorage.setItem("tokencafe_last_decimals", String(extra.tokenDecimals != null ? extra.tokenDecimals : 18));
      } catch (_) {}

      if (vStatus) {
        if (!extra.isContract) {
          vStatus.innerHTML = '<span class="text-info"><i class="bi bi-person-badge me-1"></i>Carteira (EOA)</span>';
        } else if (extra.tokenSymbol || extra.tokenDecimals != null) {
          vStatus.innerHTML = '<span class="text-tokencafe"><i class="bi bi-check-circle-fill me-1"></i>Token (ERC-20)</span>';
        } else {
          vStatus.innerHTML = '<span class="text-warning"><i class="bi bi-exclamation-triangle-fill me-1"></i>Carteira (EOA) encontrada</span>';
        }
      }
      try {
        const net = networkManager?.getNetworkById?.(parseInt(payload.chainId, 10));
        const base = net?.explorers?.[0]?.url || getFallbackExplorer(payload.chainId) || "";
        const href = base ? `${String(base).replace(/\/$/, "")}/address/${addrRaw}` : "#";
        // if (vExp) vExp.href = href; // Removed
        if (vAddr) {
          vAddr.href = href;
          vAddr.classList.toggle("disabled", !base);
          if (!base) vAddr.removeAttribute("href");
        }
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
      if (card) card.classList.remove("d-none");
      try {
        updateTradingPair(container, chainIdRaw, addrRaw);
      } catch (e) {
        try { log("pair-error", e); } catch {}
      }
      try {
        updateVerificationBadge(container, chainIdRaw, addrRaw);
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
    const infoBtn = container.querySelector("#csInfoBtn");
    if (!hasData) {
      if (infoBtn) infoBtn.disabled = true;
      const net = networkManager?.getNetworkById?.(parseInt(chainIdRaw, 10));
      const chainName = net?.name || "";
      let msg = chainName ? `Contrato não pertence à rede selecionada (${chainName}, chainId ${chainIdRaw}) ou sem dados ERC-20.` : "Contrato não pertence à rede selecionada ou sem dados ERC-20.";

      if (!extra.isContract) {
        msg = "Endereço localizado é uma Carteira Pessoal (EOA), não um contrato.";
      }
      showStatus(msg);
      try {
        const evtErr = new CustomEvent("form:error", { detail: { message: msg, container }, bubbles: true });
        document.dispatchEvent(evtErr);
      } catch (_) {}
      try {
        log("no-data", { chainId: chainIdRaw, address: addrRaw });
      } catch (_) {}
    } else {
      if (infoBtn) infoBtn.disabled = false;
      // Se for EOA (não contrato), emitir notificação de alerta se disponível
      if (!extra.isContract) {
        if (window.notify) {
          window.notify("O endereço informado é uma Carteira Pessoal (EOA), não um contrato. A verificação pode não se aplicar.", "warning", { timeout: 8000 });
        } else {
          // Fallback
          showStatus("Atenção: Endereço de Carteira Pessoal (não é um contrato).");
        }
      } else {
        showStatus("");
      }
      try {
        const isToken = !!(extra.isContract && (extra.tokenSymbol || extra.tokenDecimals != null));
        const successMsg = !extra.isContract ? "Endereço de Carteira (EOA) encontrado." : isToken ? "Token (ERC-20) encontrado na rede selecionada." : "Carteira (EOA) encontrada na rede selecionada.";
        const evtOk = new CustomEvent("form:success", { detail: { message: successMsg, container }, bubbles: true });
        document.dispatchEvent(evtOk);
      } catch (_) {}
    }
    try {
      const sp = container.querySelector("#contractSearchSpinner") || document.getElementById("contractSearchSpinner");
      const btnEl = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");
      if (sp) sp.classList.add("d-none");
      // MUDANÇA: Se sucesso, mudar botão para modo limpar (X)
      if (!hasData) {
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.removeAttribute("data-mode");
          btnEl.classList.remove("btn-secondary", "btn-primary", "btn-outline-primary");
          btnEl.classList.add("btn-outline-secondary");
          const icon = btnEl.querySelector("i");
          if (icon) icon.className = "bi bi-search";
        }
      } else {
        // Sucesso: habilitar botão para limpar
        if (btnEl) {
          btnEl.disabled = false;
          btnEl.setAttribute("data-mode", "clear");
          btnEl.classList.remove("btn-secondary", "btn-primary", "btn-outline-primary");
          btnEl.classList.add("btn-outline-secondary");
          const icon = btnEl.querySelector("i");
          if (icon) icon.className = "bi bi-x-circle";
        }
      }
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

  function performFullClear() {
    try {
      clearVisualState();
      const addrField = container.querySelector("#f_address") || container.querySelector("#tokenAddress") || document.getElementById("f_address") || document.getElementById("tokenAddress");
      if (addrField) {
        addrField.value = "";
        addrField.dispatchEvent(new Event("input"));
      }
    } catch (_) {}
  }



  try {
    const t = String(btn?.getAttribute("type") || "").toLowerCase();
    if (btn && t !== "submit") {
      let _lastClick = 0;
      let _timer = null;
      btn.addEventListener("click", (e) => {
        try {
          if (btn.getAttribute("data-mode") === "clear") {
            e.preventDefault();
            e.stopPropagation();
            performFullClear();
            return;
          }
          const now = Date.now();
          if (now - _lastClick < 800) return;
          _lastClick = now;
          if (_timer) clearTimeout(_timer);
          _timer = setTimeout(() => {
            runSearch();
          }, 150);
        } catch (e) {
          try {
            log("error", e);
          } catch {}
        }
      });
    }
  } catch (e) {
    try {
      log("error", e);
    } catch {}
  }
  try {
    document.addEventListener("wallet:chainChanged", () => refreshWalletStatus());
    document.addEventListener("wallet:connected", () => refreshWalletStatus());
    document.addEventListener("wallet:accountChanged", () => refreshWalletStatus());
    document.addEventListener("wallet:disconnected", () => refreshWalletStatus());
    container.addEventListener("network:switchResult", () => refreshWalletStatus());
    if (window.ethereum && typeof window.ethereum.on === "function") {
      window.ethereum.on("chainChanged", () => refreshWalletStatus());
      window.ethereum.on("accountsChanged", () => refreshWalletStatus());
    }
  } catch (_) {}
  try {
    const form = container.querySelector("#tokenForm");
    if (form) {
      form.addEventListener("submit", (e) => {
        try {
          e.preventDefault();
        } catch (_) {}
        const btn = container.querySelector("#contractSearchBtn") || document.getElementById("contractSearchBtn");
        if (btn && btn.getAttribute("data-mode") === "clear") {
          // Se estiver em modo limpar, não faz nada além de garantir estado limpo (já tratado no click)
          // Se o usuário apertar Enter, o click pode não ter disparado se o foco não estiver no botão
          // Então replicamos a lógica de limpeza aqui.
          clearVisualState();
          const addrField = container.querySelector("#f_address") || container.querySelector("#tokenAddress") || document.getElementById("f_address") || document.getElementById("tokenAddress");
          if (addrField) {
            addrField.value = "";
            addrField.dispatchEvent(new Event("input"));
          }
          return;
        }
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
  } catch (e) {
    try {
      log("error", e);
    } catch {}
  }

  // Auto-trigger se houver parâmetros na URL (especialmente útil para view-only)
  try {
    const params = new URLSearchParams(location.search);
    const pAddr = params.get("address");
    
    if (pAddr && /^0x[a-fA-F0-9]{40}$/.test(pAddr)) {
        // Preencher input se estiver vazio
        const addrField = container.querySelector("#f_address") || document.getElementById("f_address");
        if (addrField && !addrField.value) {
            addrField.value = pAddr;
            // Se houver chainId na URL, garantir que o buscador de rede saiba
            // (O buscador de rede geralmente roda independente, mas o contract-search lê dele ou da URL)
        }
        
        // Disparar busca após breve delay para garantir que tudo esteja carregado
        setTimeout(() => {
            // Verificar novamente se não foi disparado
            if (!container.querySelector("#selected-contract-info:not(.d-none)")) {
                runSearch();
            }
        }, 800);
    }
  } catch(e) {
      try { log("auto-trigger-error", e); } catch {}
  }

  // Padrão de manutenção: sem botão "limpar" — limpeza é feita ao alterar a entrada
  // Export helper to update details view programmatically
  async function updateContractDetailsView(container, chainId, address) {
    if (!container || !chainId || !address) return;
    
    // Clear previous state
    const vName = container.querySelector("#cs_viewName") || document.getElementById("cs_viewName");
    const vSym = container.querySelector("#cs_viewSymbol") || document.getElementById("cs_viewSymbol");
    const vDec = container.querySelector("#cs_viewDecimals") || document.getElementById("cs_viewDecimals");
    const vSup = container.querySelector("#cs_viewSupply") || document.getElementById("cs_viewSupply");
    const vAddr = container.querySelector("#cs_viewAddress") || document.getElementById("cs_viewAddress");
    const vCid = container.querySelector("#cs_viewChainId") || document.getElementById("cs_viewChainId");
    
    if (vName) vName.textContent = "...";
    if (vSym) vSym.textContent = "...";
    if (vDec) vDec.textContent = "...";
    if (vSup) vSup.textContent = "...";

    try {
      // Parallel fetch of basic info
      const [sn, info] = await Promise.all([
        detectSymbolName(address, chainId),
        fetchERC20Info(address, chainId)
      ]);

      if (vAddr) {
        vAddr.textContent = address;
        const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
        const base = net?.explorers?.[0]?.url || getFallbackExplorer(chainId) || "";
        if (base) {
            vAddr.href = `${String(base).replace(/\/$/, "")}/address/${address}`;
        }
      }
      
      if (vCid) {
        const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
        vCid.textContent = net ? `${chainId} - ${net.name}` : String(chainId);
      }

      if (vName) vName.textContent = sn.name || "-";
      if (vSym) vSym.textContent = sn.symbol || "-";
      if (vDec) vDec.textContent = info.decimals != null ? String(info.decimals) : "-";
      if (vSup) vSup.textContent = info.totalSupply ? formatDecimalValue(info.totalSupply) : "-";

      // Also trigger verification badge update
      await Promise.all([
        updateVerificationBadge(container, chainId, address),
        updateTradingPair(container, chainId, address)
      ]);

    } catch (err) {
      log("updateContractDetailsView error", err);
    }
  }

  container.setAttribute("data-cs-initialized", "true");
}

const CS_MAX_TIMEOUT_MS = 1500;

function csSanitizeRpcUrl(u) {
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

async function csFetchJsonWithTimeout(rpc, body, timeoutMs) {
  try {
    const rpcUrl = csSanitizeRpcUrl(rpc);
    if (!rpcUrl) return null;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      try {
        ctrl.abort();
      } catch (_) {}
    }, timeoutMs || CS_MAX_TIMEOUT_MS);
    const resp = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (_) {
    return null;
  }
}

function csGetRpc(chainId) {
  try {
    const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
    const netRpc = Array.isArray(net?.rpc) ? net.rpc[0] : typeof net?.rpc === "string" ? net.rpc : "";
    const fb = getFallbackRpc(chainId);
    return csSanitizeRpcUrl(fb || netRpc);
  } catch (_) {
    return csSanitizeRpcUrl(getFallbackRpc(chainId));
  }
}

function csHexToBytes(hex) {
  const h = String(hex || "").replace(/^0x/i, "");
  if (!h) return new Uint8Array();
  const len = Math.floor(h.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function csBytesToUtf8(bytes) {
  try {
    const dec = new TextDecoder("utf-8", { fatal: false });
    return dec.decode(bytes);
  } catch (_) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }
}

function csDecodeBytes32String(hex) {
  try {
    const b = csHexToBytes(hex);
    let end = b.length;
    while (end > 0 && b[end - 1] === 0) end--;
    const sliced = b.slice(0, end);
    const s = csBytesToUtf8(sliced).split("\u0000").join("").trim();
    return s || null;
  } catch (_) {
    return null;
  }
}

function csDecodeAbiString(hex) {
  try {
    const h = String(hex || "");
    if (!h || h === "0x" || h === "0x0") return null;
    const clean = h.replace(/^0x/i, "");
    if (clean.length === 64) return csDecodeBytes32String(h);
    if (clean.length < 128) return csDecodeBytes32String(h);
    const lenHex = clean.slice(64, 128);
    const len = Number(BigInt("0x" + lenHex));
    if (!Number.isFinite(len) || len <= 0) return null;
    const dataHex = clean.slice(128, 128 + len * 2);
    const bytes = csHexToBytes("0x" + dataHex);
    const s = csBytesToUtf8(bytes).split("\u0000").join("").trim();
    return s || null;
  } catch (_) {
    return null;
  }
}

function csParseUint(hex) {
  try {
    const h = String(hex || "");
    if (!h || h === "0x" || h === "0x0") return null;
    return BigInt(h);
  } catch (_) {
    return null;
  }
}

function csFormatTokenAmount(raw, decimals) {
  try {
    const d = Number(decimals || 0);
    const v = typeof raw === "bigint" ? raw : BigInt(String(raw));
    if (!d) return v.toLocaleString("pt-BR");
    const base = 10n ** BigInt(d);
    const whole = v / base;
    const frac = v % base;
    let fracStr = frac.toString().padStart(d, "0").replace(/0+$/u, "");
    if (fracStr.length > 8) fracStr = fracStr.slice(0, 8);
    const wholeFmt = whole.toLocaleString("pt-BR");
    return fracStr ? `${wholeFmt},${fracStr}` : wholeFmt;
  } catch (_) {
    try {
      return String(raw ?? "-");
    } catch {
      return "-";
    }
  }
}

async function csEthCall(rpc, to, data) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_call",
    params: [{ to: String(to), data: String(data) }, "latest"],
  };
  const js = await csFetchJsonWithTimeout(rpc, body, CS_MAX_TIMEOUT_MS);
  return js?.result || null;
}

async function csReadErc20Meta(chainId, address) {
  const rpc = csGetRpc(chainId);
  if (!rpc) return { name: null, symbol: null, decimals: null, totalSupply: null };

  const [nameHex, symHex, decHex, supHex] = await Promise.all([
    csEthCall(rpc, address, "0x06fdde03"),
    csEthCall(rpc, address, "0x95d89b41"),
    csEthCall(rpc, address, "0x313ce567"),
    csEthCall(rpc, address, "0x18160ddd"),
  ]);

  const name = csDecodeAbiString(nameHex);
  const symbol = csDecodeAbiString(symHex);
  const decBI = csParseUint(decHex);
  const decimals = decBI != null ? Number(decBI) : null;
  const totalSupply = csParseUint(supHex);

  return { name, symbol, decimals, totalSupply };
}

async function updateVerificationBadge(container, chainId, address) {
  const vStatus = container?.querySelector?.("#cs_viewStatus") || document.querySelector("#cs_viewStatus");
  try {
    const js = await getVerificationStatus(chainId, address);

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
        vOpt.className = "text-secondary";
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

      vOth.textContent = parts.length ? parts.join(", ") : "-";
    }

    if (vStatus) {
      vStatus.querySelectorAll(".badge-verif-status").forEach((el) => el.remove());
      const span = document.createElement("span");
      
      if (js?.verified) {
          span.className = "badge-verif-status badge ms-2 bg-success-subtle text-success border border-success";
          let content = '<i class="bi bi-shield-check me-1"></i>Verificado';
          if (js.verifiedAt) {
              content += ` <span class="ms-1 small opacity-75">(${js.verifiedAt})</span>`;
          }
          span.innerHTML = content;
      } else {
          span.className = "badge-verif-status badge ms-2 bg-danger-subtle text-danger border border-danger";
          span.innerHTML = '<i class="bi bi-shield-x me-1"></i>Não verificado';
      }
      
      vStatus.appendChild(span);
    }

    const warningDiv = container?.querySelector?.("#cs_verifiedWarning") || document.querySelector("#cs_verifiedWarning");
    if (warningDiv) warningDiv.classList.toggle("d-none", !js?.verified);
  } catch (e) {
    log("verify-badge-error", e);
  }
}

async function updateContractDetailsView(container, chainId, address) {
  if (!container || !chainId || !address) return;

  const vName = container.querySelector("#cs_viewName") || document.getElementById("cs_viewName");
  const vSym = container.querySelector("#cs_viewSymbol") || document.getElementById("cs_viewSymbol");
  const vDec = container.querySelector("#cs_viewDecimals") || document.getElementById("cs_viewDecimals");
  const vSup = container.querySelector("#cs_viewSupply") || document.getElementById("cs_viewSupply");
  const vAddr = container.querySelector("#cs_viewAddress") || document.getElementById("cs_viewAddress");
  const vCid = container.querySelector("#cs_viewChainId") || document.getElementById("cs_viewChainId");
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
    const meta = await csReadErc20Meta(chainId, address);

    if (vAddr) {
      vAddr.textContent = address;
      const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
      const base = net?.explorers?.[0]?.url || getFallbackExplorer(chainId) || "";
      if (base) vAddr.href = `${String(base).replace(/\/$/, "")}/address/${address}`;
    }

    if (vCid) {
      const net = networkManager?.getNetworkById?.(parseInt(chainId, 10));
      vCid.textContent = net ? `${chainId} - ${net.name}` : String(chainId);
    }

    if (vName) vName.textContent = meta.name || "-";
    if (vSym) vSym.textContent = meta.symbol || "-";
    if (vDec) vDec.textContent = meta.decimals != null ? String(meta.decimals) : "-";
    if (vSup) vSup.textContent = meta.totalSupply != null ? csFormatTokenAmount(meta.totalSupply, meta.decimals || 0) : "-";

    try {
      const rpc = getPrimaryRpc(chainId);
      const bodies = [
        { jsonrpc: "2.0", id: 7, method: "eth_call", params: [{ to: String(address), data: "0x70a08231" + String(address).toLowerCase().replace(/^0x/, "").padStart(64, "0") }, "latest"] },
        { jsonrpc: "2.0", id: 8, method: "eth_getBalance", params: [String(address), "latest"] },
      ];
      const js = await fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS);
      if (Array.isArray(js) && js.length) {
        const r7 = js.find((x) => x && x.id === 7);
        const r8 = js.find((x) => x && x.id === 8);
        const balHex = r7 && r7.result ? String(r7.result) : null;
        const nativeHex = r8 && r8.result ? String(r8.result) : null;
        const dec = meta.decimals != null ? meta.decimals : 18;
        const tokVal = formatUnits(balHex, dec);
        const natVal = formatUnits(nativeHex, 18);
        if (vTokBal) vTokBal.textContent = formatDecimalValue(tokVal);
        if (vNatBal) vNatBal.textContent = formatDecimalValue(natVal);
      }
    } catch (e) {
      log("updateContractDetailsView balances error", e);
      if (vTokBal && !vTokBal.textContent) vTokBal.textContent = "0";
      if (vNatBal && !vNatBal.textContent) vNatBal.textContent = "0";
    }

    await updateVerificationBadge(container, chainId, address);
    await updateTradingPair(container, chainId, address);
    if (vPair && (!vPair.textContent || vPair.textContent.trim() === "-")) {
      vPair.textContent = "Nenhum par encontrado";
    }
  } catch (e) {
    log("updateContractDetailsView error", e);
  }
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

export { initContainer, updateVerificationBadge, updateContractDetailsView };
