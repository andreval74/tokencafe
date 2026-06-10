/**
 * contract-search.js — Busca e exibe dados de contratos/tokens on-chain
 * Lê o endereço informado pelo usuário, consulta a API e o RPC da rede,
 * exibe supply, holders, explorer link e popula a seção de interação.
 * Usado por: modules/analise/ e modules/contrato/contrato-index.php
 */
import { networkManager } from "./network-manager.js";
import { getApiBase, getVerificationStatus } from "./verify-utils.js";
import { getFallbackExplorer, getFallbackRpc } from "./network-fallback.js";
import { populateContractInteract } from "./contract-interact.js";
import { findLiquidityPair } from "./dex-utils.js";
import { isWalletAdmin, getConnectedWalletAddress } from "./admin-security.js";
import { showDiagnosis, getDefaultAddressCauses } from "../ai/diagnostics.js";
import { addTokenToMetaMask } from "./metamask-utils.js";
import { loadContractFiles } from "./file-viewer.js";

// =============================================================================
// SHARED CONSTANTS & STATE
// =============================================================================

const MAX_TIMEOUT_MS = 2000;
const GLOBAL_LIMIT_MS = 5000;
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
    if (isAdmin) {
      unlock(btnAdd, async (e) => {
        try { e?.preventDefault?.(); } catch (_) {}
        if (!window.ethereum || typeof window.ethereum.request !== "function") {
          window.showFormError?.("Carteira não detectada.");
          return;
        }
        const wantChain = parseInt(String(chainId || ""), 10);
        try {
          const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
          const current = currentHex ? parseInt(String(currentHex), 16) : null;
          if (Number.isFinite(wantChain) && current && current !== wantChain) {
            const hex = "0x" + wantChain.toString(16);
            try {
              await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
            } catch (err) {
              const code = err && typeof err === "object" ? err.code : null;
              if (code === 4902) {
                const net = networkManager?.getNetworkById?.(wantChain);
                const rpcUrl = net?.rpcUrls?.[0] || getFallbackRpc(wantChain) || "";
                const explorer = net?.explorers?.[0]?.url || getFallbackExplorer(wantChain) || "";
                if (!rpcUrl) throw err;
                await window.ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [{
                    chainId: hex,
                    chainName: net?.name ? String(net.name) : `chainId ${wantChain}`,
                    nativeCurrency: net?.nativeCurrency || { name: "Native", symbol: "NATIVE", decimals: 18 },
                    rpcUrls: [String(rpcUrl)],
                    blockExplorerUrls: explorer ? [String(explorer)] : undefined,
                  }],
                });
                await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
              } else {
                throw err;
              }
            }
          }
        } catch (err) {
          window.showFormError?.("Troque a rede da carteira para adicionar o token.");
          return;
        }
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
    } else {
      lock(btnAdd, "Apenas administradores podem adicionar token na MetaMask por aqui.");
    }
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
    let s = String(val).trim();
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./gu, "").replace(/,/gu, ".");
    } else if (s.includes(",") && !s.includes(".")) {
      s = s.replace(/,/gu, ".");
    }
    const parts = s.split(".");
    let whole = parts[0];
    if (whole === "") whole = "0";
    const frac = parts.length > 1 ? parts[1] : "";
    const cleanWhole = whole.replace(/[^\d-]/gu, "") || "0";
    const wholeFmt = BigInt(cleanWhole).toLocaleString("pt-BR");
    return frac ? `${wholeFmt},${frac.substring(0, 8)}` : wholeFmt;
  } catch (_) {
    return val;
  }
}

// Formata números muito grandes com sufixo (K, M, B, T…) para caber em uma linha.
// Retorna { compact, full } — compact para exibir, full para title/tooltip.
function formatCompactSupply(val) {
  if (val == null || val === "" || val === "-") return { compact: "-", full: "-" };
  const full = formatDecimalValue(val);
  try {
    let s = String(val).trim();
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./gu, "").replace(/,/gu, ".");
    else if (s.includes(",") && !s.includes(".")) s = s.replace(/,/gu, ".");
    const dotIdx = s.indexOf(".");
    const wholeStr = (dotIdx >= 0 ? s.slice(0, dotIdx) : s).replace(/[^\d]/gu, "") || "0";
    const bigWhole = BigInt(wholeStr);
    const tiers = [
      { div: 10n ** 33n, label: "D" },
      { div: 10n ** 30n, label: "N" },
      { div: 10n ** 27n, label: "O" },
      { div: 10n ** 24n, label: "Sp" },
      { div: 10n ** 21n, label: "Sx" },
      { div: 10n ** 18n, label: "Qt" },
      { div: 10n ** 15n, label: "Qd" },
      { div: 10n ** 12n, label: "T" },
      { div: 10n ** 9n,  label: "B" },
      { div: 10n ** 6n,  label: "M" },
      { div: 10n ** 3n,  label: "K" },
    ];
    for (const { div, label } of tiers) {
      if (bigWhole >= div) {
        const main = bigWhole / div;
        const rem = bigWhole % div;
        const dec2 = Number(rem * 100n / div);
        const decStr = dec2 > 0 ? `,${String(dec2).padStart(2, "0").replace(/0+$/u, "")}` : "";
        return { compact: `${main.toLocaleString("pt-BR")}${decStr} ${label}`, full };
      }
    }
    return { compact: full, full };
  } catch (_) {
    return { compact: full, full };
  }
}

// =============================================================================
// CONTRACT ANALYSIS & VERIFIED SECTIONS
// =============================================================================

function analyzeContractCapabilities(abi, sourceCode) {
  const caps = [];
  const src = String(sourceCode || "").toLowerCase();

  let funcNames = [];
  try {
    const parsed = typeof abi === "string" ? JSON.parse(abi) : Array.isArray(abi) ? abi : [];
    funcNames = parsed.filter((x) => x.type === "function").map((x) => String(x.name || "").toLowerCase());
  } catch (_) {}

  const hasFunc = (n) => funcNames.includes(n.toLowerCase());
  const hasSrc = (p) => src.includes(p.toLowerCase());

  const erc20Core = ["transfer", "transferfrom", "approve", "allowance", "balanceof", "totalsupply"];
  if (erc20Core.filter((f) => hasFunc(f)).length >= 4) {
    caps.push({ label: "ERC-20", icon: "bi-coin", variant: "tc-badge-demo", title: "Token ERC-20 padrão" });
  }

  if (hasFunc("ownerOf") || hasFunc("tokenURI") || hasFunc("safeTransferFrom")) {
    caps.push({ label: "ERC-721 (NFT)", icon: "bi-image", variant: "tc-badge-info", title: "Token NFT ERC-721" });
  }

  if (funcNames.some((f) => f === "owner" || f === "transferownership") || hasSrc("transferOwnership")) {
    caps.push({ label: "Ownable", icon: "bi-person-lock", variant: "tc-badge-info", title: "Contrato com owner/administrador" });
  }

  if (funcNames.some((f) => f === "mint" || f.startsWith("mint")) || hasSrc("function mint(")) {
    caps.push({ label: "Mintável", icon: "bi-plus-circle", variant: "tc-badge-info", title: "Permite criar novos tokens" });
  }

  if (funcNames.some((f) => f === "burn" || f === "burnfrom" || f.startsWith("burn")) || hasSrc("function burn(")) {
    caps.push({ label: "Queimável", icon: "bi-fire", variant: "tc-badge-warning", title: "Permite destruir tokens (burn)" });
  }

  if (hasFunc("pause") || hasFunc("unpause") || hasSrc("whenNotPaused")) {
    caps.push({ label: "Pausável", icon: "bi-pause-circle", variant: "tc-badge-warning", title: "Transferências podem ser pausadas" });
  }

  const taxFuncNames = ["settaxfee", "setliquidityfee", "setmarketingfee", "updatefee", "setfee", "settax", "setbuy税", "setsell税"];
  if (hasSrc("_taxFee") || hasSrc("_liquidityFee") || hasSrc("taxFee") || hasSrc("marketingFee") ||
      funcNames.some((f) => taxFuncNames.includes(f) || f.includes("taxfee") || f.includes("liquidityfee") || f.includes("marketingfee"))) {
    caps.push({ label: "Taxa (Tax)", icon: "bi-percent", variant: "tc-badge-warning", title: "Cobra taxas em transferências" });
  }

  const blacklistFuncNames = ["blacklist", "addtoblacklist", "removefromblacklist", "blacklistaddress", "setblacklist", "ban", "unban", "block", "unblock"];
  if (hasSrc("blacklist") || hasSrc("isBlacklisted") || hasSrc("_isBlacklisted") || hasSrc("blocklist") ||
      funcNames.some((f) => blacklistFuncNames.includes(f) || f.includes("blacklist") || f.includes("blocklist"))) {
    caps.push({ label: "Blacklist", icon: "bi-slash-circle", variant: "tc-badge-danger", title: "Pode bloquear endereços" });
  }

  const maxTxFuncNames = ["setmaxtxamount", "setmaxtransaction", "updatemaxtx", "setmaxbuytxamount", "setmaxselltxamount"];
  if (hasSrc("maxTxAmount") || hasSrc("_maxTxAmount") || hasSrc("maxTransaction") ||
      funcNames.some((f) => maxTxFuncNames.includes(f) || f.includes("maxtx") || f.includes("maxtransaction"))) {
    caps.push({ label: "Limite por Tx", icon: "bi-bar-chart-steps", variant: "tc-badge-warning", title: "Limita o valor máximo por transação" });
  }

  const antiWhaleFuncNames = ["setmaxwalletsize", "setmaxwallet", "updateantiwhale", "setantiwhale"];
  if (hasSrc("maxWalletSize") || hasSrc("_maxWalletSize") || hasSrc("antiWhale") || hasSrc("maxWallet") ||
      funcNames.some((f) => antiWhaleFuncNames.includes(f) || f.includes("maxwallet") || f.includes("antiwhale"))) {
    caps.push({ label: "Anti-Whale", icon: "bi-shield-exclamation", variant: "tc-badge-warning", title: "Limita saldo máximo por carteira" });
  }

  if (hasFunc("upgradeTo") || hasFunc("upgradeToAndCall") || hasSrc("upgradeTo") || hasSrc("TransparentUpgradeableProxy")) {
    caps.push({ label: "Atualizável", icon: "bi-arrow-up-circle", variant: "tc-badge-neutral", title: "Contrato pode ser atualizado (proxy)" });
  }

  if (hasFunc("propose") || hasFunc("castVote") || hasFunc("delegate") || hasSrc("governance") ||
      funcNames.some((f) => f === "vote" || f === "propose" || f === "castVote" || f === "delegate")) {
    caps.push({ label: "Governança", icon: "bi-building", variant: "tc-badge-info", title: "Funções de votação/governança" });
  }

  return caps;
}

function downloadFile(filename, content, mimeType = "text/plain") {
  try {
    const blob = new Blob([content], { type: mimeType });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch (_) {}
}

async function populateVerifiedSections(container, js) {
  if (!js) return;
  // Módulos que não querem as seções estendidas (propriedades, arquivos, análise)
  if (container?.getAttribute("data-cs-no-extended") === "true") return;
  try {
    const resolveIsAdminSync = () => {
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
    };

    const st = container?.__tcQuickActionsState || {};
    const chainId = st.chainId || null;
    const address = st.address || null;

    let sourceCode = String(js.sourceCode || js.explorer?.sourceCode || "").trim();
    let abiRaw = js.abi || js.explorer?.abi || null;
    let contractName = String(js.contractName || js.explorer?.contractName || "Contrato").trim();

    const tryHydrateFromSessionCompilation = () => {
      try {
        const cid = String(chainId || "").trim();
        const addr = String(address || "").trim().toLowerCase();
        if (!cid || !addr) return false;

        const raw = sessionStorage.getItem("lastDeployedContract");
        const stt = raw ? JSON.parse(raw) : null;
        const sAddr = String(stt?.deployed?.address || stt?.deployed?.contractAddress || "").trim().toLowerCase();
        const sCid = String(stt?.form?.network?.chainId || stt?.wallet?.chainId || "").trim();
        if (!stt || !stt?.compilation || !sAddr || !sCid) return false;
        if (sAddr !== addr || sCid !== cid) return false;

        const comp = stt.compilation || {};
        const src = String(comp?.sourceCode || "").trim();
        const abi = comp?.abi || null;
        const name = String(comp?.contractName || contractName || "Contrato").trim();
        if (!src && !abi) return false;

        if (!sourceCode && src) sourceCode = src;
        if (!abiRaw && abi) abiRaw = abi;
        if (!contractName && name) contractName = name;
        return true;
      } catch (_) {
        return false;
      }
    };

    const isAdmin = resolveIsAdminSync();
    if ((!sourceCode && !abiRaw) && isAdmin) {
      tryHydrateFromSessionCompilation();
    }
    const abiStr = abiRaw ? (typeof abiRaw === "string" ? abiRaw : JSON.stringify(abiRaw, null, 2)) : "";


    const extendedInfo = document.getElementById("cs-extended-info");

    const capsSection = document.getElementById("cs_capabilitiesSection");
    const capsBadges = document.getElementById("cs_capabilitiesBadges");
    if (capsSection && capsBadges && (sourceCode || abiRaw)) {
      const caps = analyzeContractCapabilities(abiRaw, sourceCode);
      if (caps.length) {
        capsBadges.innerHTML = caps
          .map((c) => `<span class="${c.variant}" title="${c.title}"><i class="bi ${c.icon} me-1"></i>${c.label}</span>`)
          .join("");
        capsSection.classList.remove("d-none");
      }
    }

    if (sourceCode || abiStr) {
      loadContractFiles({ sol: sourceCode || "", abi: abiStr || "", contractName });
    }

    const analysisSection = document.getElementById("cs_analysisSection");
    const analysisLoading = document.getElementById("cs_analysisLoading");
    const analysisText = document.getElementById("cs_analysisText");
    const analysisSubtitle = document.getElementById("cs_analysisSubtitle");

    if (extendedInfo) extendedInfo.classList.remove("d-none");

    const analysisPlaceholder = document.getElementById("cs_analysisPlaceholder");

    if (analysisSection && (sourceCode || abiRaw)) {
      analysisSection.classList.remove("d-none");
      if (analysisPlaceholder) analysisPlaceholder.classList.add("d-none");
      if (analysisText) analysisText.classList.remove("d-none");

      // Chave de cache por contrato — análise persiste mesmo offline
      const _aiCacheKey = `tc_ai_${chainId}_${String(address || "").toLowerCase()}`;
      let _cacheHit = false;
      try {
        const _cached = localStorage.getItem(_aiCacheKey);
        if (_cached) {
          _cacheHit = true;
          if (analysisLoading) analysisLoading.classList.add("d-none");
          if (analysisText) analysisText.textContent = _cached;
          if (analysisSubtitle) analysisSubtitle.textContent = "Análise gerada por IA";
        }
      } catch (_) {}

      if (!_cacheHit) {
        if (analysisLoading) analysisLoading.classList.remove("d-none");
        if (analysisText) analysisText.textContent = "";
        if (analysisSubtitle) analysisSubtitle.textContent = "Consultando IA...";

        // Fetch com retry (até 3 tentativas — acorda servidor Render que ficou dormindo)
        let _resp = null, _fetchErr = null;
        for (let _att = 0; _att < 3; _att++) {
          if (_att > 0) {
            const _wait = _att === 1 ? 5000 : 12000;
            if (analysisText) analysisText.textContent = `Aguardando servidor... (tentativa ${_att + 1}/3)`;
            await new Promise(r => setTimeout(r, _wait));
          }
          try {
            const _apiBase = getApiBase ? getApiBase() : "";
            _resp = await fetch(`${_apiBase}/api/analyze-contract`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contractName, sourceCode, abi: abiRaw, chainId: chainId || null, address: address || null }),
            });
            _fetchErr = null;
            break;
          } catch (e) { _fetchErr = e; _resp = null; }
        }

        if (analysisLoading) analysisLoading.classList.add("d-none");

        try {
          if (!_resp) throw _fetchErr || new Error("network");
          const data = await _resp.json().catch(() => ({}));
          if (data.success && data.analysis) {
            if (analysisText) analysisText.textContent = data.analysis;
            if (analysisSubtitle) analysisSubtitle.textContent = "Análise gerada por IA";
            try { localStorage.setItem(_aiCacheKey, data.analysis); } catch (_) {}
          } else {
            let msg;
            if (data.reason === "not_configured") {
              msg = "Adicione GROQ_API_KEY ou ANTHROPIC_API_KEY no arquivo api/.env para ativar a análise por IA.";
            } else if (data.reason === "api_error" && data.error) {
              msg = `Erro na API de IA: ${data.error}`;
            } else {
              msg = "Não foi possível analisar o contrato no momento. Tente recarregar a página.";
            }
            if (analysisText) analysisText.textContent = msg;
            if (analysisSubtitle) analysisSubtitle.textContent = data.reason === "not_configured" ? "Configuração pendente" : "Erro na API";
          }
        } catch (_fetchErr2) {
          if (analysisText) analysisText.textContent = "Servidor de IA indisponível. Tente recarregar a página em instantes.";
          if (analysisSubtitle) analysisSubtitle.textContent = "Leitura do código verificado";
        }
      }
    } else if (analysisSection) {
      // Contrato sem código verificado: mantém seção visível com placeholder
      analysisSection.classList.remove("d-none");
      if (analysisPlaceholder) analysisPlaceholder.classList.remove("d-none");
      if (analysisText) analysisText.classList.add("d-none");
    }
  } catch (_) {}
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
    const bodies = [
      { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: String(addr), data: "0x95d89b41" }, "latest"] },
      { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: String(addr), data: "0x06fdde03" }, "latest"] },
    ];
    let symHex = null;
    let namHex = null;

    // MetaMask primeiro quando na mesma rede — mais rápido que RPC remoto
    if (typeof window !== "undefined" && window.ethereum?.request) {
      try {
        const curChain = await window.ethereum.request({ method: "eth_chainId" });
        if (parseInt(curChain, 16) === Number(chainId)) {
          const [s, n] = await Promise.all([
            window.ethereum.request({ method: "eth_call", params: [{ to: String(addr), data: "0x95d89b41" }, "latest"] }),
            window.ethereum.request({ method: "eth_call", params: [{ to: String(addr), data: "0x06fdde03" }, "latest"] }),
          ]);
          symHex = s || null;
          namHex = n || null;
        }
      } catch (_) {}
    }

    if (!symHex || symHex === "0x" || !namHex || namHex === "0x") {
      const rpc = getPrimaryRpc(chainId);
      const js = await fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS);
      if (Array.isArray(js) && js.length) {
        const r1 = js.find((x) => x && x.id === 1);
        const r2 = js.find((x) => x && x.id === 2);
        symHex = symHex || (r1 && r1.result ? String(r1.result) : null);
        namHex = namHex || (r2 && r2.result ? String(r2.result) : null);
      }
    }

    if (!DISABLE_MULTI_RPC_FALLBACK && (!symHex || symHex === "0x" || !namHex || namHex === "0x")) {
      const rpcs = getCandidateRpcs(chainId);
      const [symHex2, namHex2] = await Promise.all([callFirstValid(rpcs, bodies[0]), callFirstValid(rpcs, bodies[1])]);
      symHex = symHex || symHex2;
      namHex = namHex || namHex2;
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
    const bodies = [
      { jsonrpc: "2.0", id: 3, method: "eth_call", params: [{ to: String(addr), data: "0x313ce567" }, "latest"] },
      { jsonrpc: "2.0", id: 4, method: "eth_call", params: [{ to: String(addr), data: "0x18160ddd" }, "latest"] },
    ];
    let decHex = null;
    let supHex = null;

    // MetaMask primeiro quando na mesma rede — mais rápido que RPC remoto
    if (typeof window !== "undefined" && window.ethereum?.request) {
      try {
        const curChain = await window.ethereum.request({ method: "eth_chainId" });
        if (parseInt(curChain, 16) === Number(chainId)) {
          const [d, s] = await Promise.all([
            window.ethereum.request({ method: "eth_call", params: [{ to: String(addr), data: "0x313ce567" }, "latest"] }),
            window.ethereum.request({ method: "eth_call", params: [{ to: String(addr), data: "0x18160ddd" }, "latest"] }),
          ]);
          decHex = d || null;
          supHex = s || null;
        }
      } catch (_) {}
    }

    if (!decHex || decHex === "0x" || !supHex || supHex === "0x") {
      const rpc = getPrimaryRpc(chainId);
      const js = await fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS);
      if (Array.isArray(js) && js.length) {
        const r3 = js.find((x) => x && x.id === 3);
        const r4 = js.find((x) => x && x.id === 4);
        decHex = decHex || (r3 && r3.result ? String(r3.result) : null);
        supHex = supHex || (r4 && r4.result ? String(r4.result) : null);
      }
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

function isEmptyCode(code) {
  const hex = String(code || "").toLowerCase().replace(/^0x/, "");
  return hex === "" || /^0+$/.test(hex);
}

async function checkIsContract(addr, chainId) {
  try {
    if (typeof window !== "undefined" && window.ethereum && window.ethereum.request) {
      try {
        const curChain = await window.ethereum.request({ method: "eth_chainId" });
        if (parseInt(curChain, 16) === Number(chainId)) {
          const code = await window.ethereum.request({ method: "eth_getCode", params: [String(addr), "latest"] });
          return !isEmptyCode(code);
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
    return !isEmptyCode(code);
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
        const safeHref = href && href !== "#" ? href : "";
        vPair.innerHTML = safeHref
          ? `<span title="Endereço do Par: ${pairInfo.pairAddress}"><i class="bi bi-arrow-left-right me-1"></i>${dexName}</span> <a href="${safeHref}" target="_blank" rel="noopener" class="tc-data-value--accent ms-2" title="Ver no Explorer">${shortAddr} <i class="bi bi-box-arrow-up-right ms-1"></i></a>`
          : `<span title="Endereço do Par: ${pairInfo.pairAddress}"><i class="bi bi-arrow-left-right me-1"></i>${dexName}</span> <span class="ms-2">${shortAddr}</span>`;
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
           const content = `<div class="mt-1 border-top pt-1"><span class="text-muted tc-text-sm">Negociação:</span> <span class="text-body fw-medium">${dexName}</span></div>`;
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
        if (window.TOKENCAFE_IS_ADMIN === true) {
            isAdmin = true;
        } else if (window.ethereum && window.ethereum.selectedAddress) {
            isAdmin = isWalletAdmin(window.ethereum.selectedAddress);
        } else {
            const addr = await getConnectedWalletAddress();
            if (addr) isAdmin = isWalletAdmin(addr);
        }
    } catch (_) {}

    let isTestnet = false;
    try {
        const cidNum = Number(chainId);
        if (Number.isFinite(cidNum) && networkManager?.isTestNetwork?.(cidNum)) {
            isTestnet = true;
        }
    } catch (_) {}

    if (vStatus) {
        vStatus.querySelectorAll(".badge-verif-status").forEach((el) => el.remove());
        if (isTestnet) {
            const tspan = document.createElement("span");
            tspan.className = "badge-verif-status tc-badge-module ms-2 tc-status-warn";
            tspan.innerHTML = '<i class="bi bi-cone-striped me-1"></i>Testnet';
            tspan.title = "Rede de teste — contrato não está em produção.";
            vStatus.appendChild(tspan);
        }

        if (isTestnet && !isAdmin) {
            const span = document.createElement("span");
            span.className = "badge-verif-status tc-badge-module ms-2 tc-status-bad";
            span.innerHTML = '<i class="bi bi-shield-x me-1"></i>Não verificado';
            span.title = "Testnet: verificação no explorer não é executada para usuários comuns.";
            vStatus.appendChild(span);

            const vCv = container?.querySelector?.("#cs_viewCompilerVersion") || document.querySelector("#cs_viewCompilerVersion");
            const vOpt = container?.querySelector?.("#cs_viewOptimization") || document.querySelector("#cs_viewOptimization");
            const vOth = container?.querySelector?.("#cs_viewOtherSettings") || document.querySelector("#cs_viewOtherSettings");
            const vCvRow = container?.querySelector?.("#cs_compilerRow") || document.querySelector("#cs_compilerRow");
            const vOthRow = container?.querySelector?.("#cs_otherSettingsRow") || document.querySelector("#cs_otherSettingsRow");
            if (vCv) vCv.textContent = "-";
            if (vOpt) vOpt.textContent = "-";
            if (vOth && (vOth.textContent.trim() === "-" || !vOth.innerHTML.includes("Negociação"))) vOth.textContent = "-";
            if (vCvRow) vCvRow.classList.add("d-none");
            if (vOthRow) vOthRow.classList.add("d-none");

            return { success: true, verified: false, explorerVerified: false, error: false, skipped: true, message: span.title };
        }

        const span = document.createElement("span");
        span.className = "badge-verif-status tc-badge-module ms-2 tc-status-warn";
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
  
      const explorerVerified = !!(js?.explorerVerified ?? js?.verified);

      const vCv = container?.querySelector?.("#cs_viewCompilerVersion") || document.querySelector("#cs_viewCompilerVersion");
      const vOpt = container?.querySelector?.("#cs_viewOptimization") || document.querySelector("#cs_viewOptimization");
      const vOth = container?.querySelector?.("#cs_viewOtherSettings") || document.querySelector("#cs_viewOtherSettings");
      const vCvRow = container?.querySelector?.("#cs_compilerRow") || document.querySelector("#cs_compilerRow");
      const vOthRow = container?.querySelector?.("#cs_otherSettingsRow") || document.querySelector("#cs_otherSettingsRow");
      if (vCvRow) vCvRow.classList.toggle("d-none", !explorerVerified);
      if (vOthRow) vOthRow.classList.toggle("d-none", !explorerVerified);
  
      if (vCv) vCv.textContent = js?.compilerVersion || js?.explorer?.compilerVersion || "-";
  
      if (vOpt) {
        const opt = js?.explorer?.optimizationUsed;
        if (opt === "1" || opt === 1 || opt === true || opt === "true") {
          const runs = js?.explorer?.runs ? ` (Runs: ${js.explorer.runs})` : "";
          vOpt.textContent = "Sim" + runs;
          vOpt.className = "tc-data-value--success";
        } else if (opt === "0" || opt === 0 || opt === false || opt === "false") {
          vOpt.textContent = "Não";
          vOpt.className = "tc-data-value";
        } else {
          vOpt.textContent = "-";
          vOpt.className = "tc-data-value";
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

        // IMPORTANTE:
        // "Verificado" aqui significa "publicado/confirmado no Explorer (BscScan/Etherscan)".
        if (explorerVerified) {
                span.className = "badge-verif-status tc-badge-module ms-2 tc-status-ok";
                let content = '<i class="bi bi-shield-check me-1"></i>Verificado (Explorer)';
                if (js.verifiedAt) {
                    content += ` <span class="ms-1 tc-text-sm opacity-75">(${js.verifiedAt})</span>`;
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
                const msg = String(js?.message || "");
                const lower = msg.toLowerCase();
                const isPending = !!js?.pending || lower.includes("pending") || lower.includes("queue") || lower.includes("processing") || lower.includes("aguarde");
                span.className = "badge-verif-status tc-badge-module ms-2 tc-status-warn";
                span.innerHTML = isPending
                    ? '<i class="bi bi-hourglass-split me-1"></i>Pendente'
                    : '<i class="bi bi-exclamation-triangle me-1"></i>Erro';
                span.title = msg || "Não foi possível consultar o explorer agora.";
                canRetry = !isPending;
            } else {
                span.className = "badge-verif-status tc-badge-module ms-2 tc-status-bad";
                span.innerHTML = '<i class="bi bi-shield-x me-1"></i>Não verificado';
                span.title = js?.message || "";
                canRetry = true;
            }
        
        vStatus.appendChild(span);

        if (canRetry && isAdmin) {
             const retryBtn = document.createElement("button");
             retryBtn.className = "tc-icon-btn-ds btn-retry-verif ms-2";
             retryBtn.title = "Verificar novamente agora (ignorar cache)";
             retryBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i>';
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
  
      populateVerifiedSections(container, js).catch(() => {});

      const warningDiv = container?.querySelector?.("#cs_verifiedWarning") || document.querySelector("#cs_verifiedWarning");
      if (warningDiv) warningDiv.classList.toggle("d-none", !explorerVerified);
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
      if (vSup) vSup.textContent = info.totalSupply != null ? formatDecimalValue(info.totalSupply) : "-";
  
      try {
        const rpc = getPrimaryRpc(chainId);
        const bodies = [
          { jsonrpc: "2.0", id: 7, method: "eth_call", params: [{ to: String(address), data: "0x70a08231" + String(address).toLowerCase().replace(/^0x/, "").padStart(64, "0") }, "latest"] },
          { jsonrpc: "2.0", id: 8, method: "eth_getBalance", params: [String(address), "latest"] },
        ];
        if (!options.skipBalances) {
          // Saldos em background — não bloqueia o retorno da busca
          if (vTokBal) vTokBal.textContent = "…";
          if (vNatBal) vNatBal.textContent = "…";
          fetchJsonWithTimeout(rpc, bodies, MAX_TIMEOUT_MS).then((js) => {
            if (Array.isArray(js) && js.length) {
              const r7 = js.find((x) => x && x.id === 7);
              const r8 = js.find((x) => x && x.id === 8);
              const balHex = r7 && r7.result ? String(r7.result) : null;
              const nativeHex = r8 && r8.result ? String(r8.result) : null;
              const dec = info.decimals != null ? info.decimals : 18;
              if (vTokBal) vTokBal.textContent = formatDecimalValue(formatUnits(balHex, dec));
              if (vNatBal) vNatBal.textContent = formatDecimalValue(formatUnits(nativeHex, 18));
            }
          }).catch(() => {
            if (vTokBal && vTokBal.textContent === "…") vTokBal.textContent = "-";
            if (vNatBal && vNatBal.textContent === "…") vNatBal.textContent = "-";
          });
        } else if (preloadedData) {
          if (vTokBal) vTokBal.textContent = preloadedData.contractTokenBalance != null ? formatDecimalValue(preloadedData.contractTokenBalance) : "-";
          if (vNatBal) vNatBal.textContent = preloadedData.contractNativeBalance != null ? formatDecimalValue(preloadedData.contractNativeBalance) : "-";
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

// Exibe o card de carteira (EOA) incluído via PHP partial (wallet-info-card.php).
// Oculta o card de contrato, exibe o partial wallet-info-card.php e popula com dados da rede/RPC.
async function applyEoaView(container, chainId, address) {
  // Troca os cards: esconde contrato, exibe wallet (partial compartilhado com wallet-index.php)
  const contractCard = container.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");
  const walletCard   = container.querySelector("#cs-wallet-view")         || document.getElementById("cs-wallet-view");
  if (contractCard) contractCard.classList.add("d-none");
  if (walletCard)   walletCard.classList.remove("d-none");

  // walletStatusLabel não faz sentido no contexto de busca de endereço
  document.getElementById("walletStatusLabel")?.classList.add("d-none");

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  const rpc     = getPrimaryRpc(chainId);
  const net     = networkManager?.getNetworkById?.(parseInt(chainId, 10));
  const explorer = net?.explorers?.[0]?.url || getFallbackExplorer(chainId) || "";
  const symbol   = net?.nativeCurrency?.symbol || "—";
  const native   = net?.nativeCurrency?.name   || "—";
  const netName  = net?.name || (chainId ? `Rede ${chainId}` : "Desconhecida");

  // walletAddress é <a>: texto = endereço, href = explorer/address/0x...
  const addrEl = document.getElementById("walletAddress");
  if (addrEl) {
    addrEl.textContent = address;
    addrEl.href = explorer ? `${String(explorer).replace(/\/$/, "")}/address/${address}` : "#";
  }
  set("chainId",       String(chainId));
  set("networkName",   netName);
  set("currencySymbol", symbol);
  set("nativeCurrency", native);
  set("balance", "…");

  const expEl = document.getElementById("explorerUrlDisplay");
  if (expEl && explorer) {
    try { expEl.textContent = new URL(explorer).hostname; } catch (_) { expEl.textContent = explorer; }
    expEl.href = explorer;
  }

  // Botões de ação: mesmos IDs do wallet-index.js
  try {
    const explorerBase = explorer ? String(explorer).replace(/\/$/, "") : "";
    const explorerAddr = explorerBase ? `${explorerBase}/address/${address}` : "";

    document.getElementById("copyAddressBtn")?.addEventListener("click", () => {
      navigator.clipboard?.writeText(address).catch(() => {});
    });
    if (explorerAddr) {
      document.getElementById("viewAddressBtn")?.addEventListener("click", () => window.open(explorerAddr, "_blank"));
    }

    const shareText = explorerAddr || address;
    const msg = encodeURIComponent(shareText);
    document.getElementById("walletShareWhatsAppBtn")?.addEventListener("click", () =>
      window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank"));
    document.getElementById("walletShareTelegramBtn")?.addEventListener("click", () =>
      window.open(`https://t.me/share/url?url=${msg}&text=${encodeURIComponent("Confira esta carteira:")}`, "_blank"));
    document.getElementById("walletShareEmailBtn")?.addEventListener("click", () =>
      window.open(`mailto:?subject=${encodeURIComponent("Carteira")}&body=${msg}`, "_self"));
  } catch (_) {}

  // Saldo via RPC
  if (rpc) {
    fetchJsonWithTimeout(rpc, [
      { jsonrpc: "2.0", id: 202, method: "eth_getBalance", params: [String(address), "latest"] },
    ], MAX_TIMEOUT_MS).then((js) => {
      if (!Array.isArray(js)) return;
      const balHex = js.find((x) => x?.id === 202)?.result || null;
      if (balHex) set("balance", `${formatDecimalValue(formatUnits(balHex, 18))} ${symbol}`);
      else        set("balance", `0 ${symbol}`);
    }).catch(() => set("balance", "—"));
  }
}

// Reseta o card de carteira para estado inicial (chamado por clearVisualState)
function resetEoaView(container) {
  const walletCard = container?.querySelector("#cs-wallet-view") || document.getElementById("cs-wallet-view");
  if (!walletCard) return;
  walletCard.classList.add("d-none");
  ["balance", "chainId", "networkName", "currencySymbol", "nativeCurrency"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  ["walletAddress", "explorerUrlDisplay"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) { el.textContent = ""; el.href = "#"; }
  });
  // Restaura o walletStatusLabel para estado padrão (será gerenciado por wallet-index.js na página wallet)
  const statusEl = document.getElementById("walletStatusLabel");
  if (statusEl) { statusEl.className = "tc-status-bad tc-status-label ms-auto"; statusEl.classList.remove("d-none"); }
}

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
        const clearAllBtn = document.getElementById("btn-clear");
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
        const clearAllBtn = document.getElementById("btn-clear");
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
    // isC_raw === false = eth_getCode confirmou EOA (bytecode vazio) — nunca sobrescrever com
    // metadados de token, pois alguns RPCs retornam decimals=18 mesmo para carteiras pessoais.
    if (isC_raw !== false && !extra.isContract && (extra.tokenSymbol || extra.tokenName || hasValidDecimals)) {
      extra.isContract = true;
    }

    // Critério de "ERC-20 detectado" precisa ser forte para evitar falso positivo
    // (ex.: totalSupply=0 em contratos não-ERC20 ou respostas inconsistentes do RPC).
    const hasData = !!(extra.tokenName || extra.tokenSymbol || hasValidDecimals);
    if (strict && !hasData) {
      const allowWallet = isAllowWalletEnabled(container);
      const contractDetermined = isC_raw !== null;
      if (extra.isContract === true) {
        // Contrato confirmado (bytecode não-vazio) mas sem metadados ERC-20 — prosseguir
      } else if (allowWallet && extra.isContract === false && contractDetermined) {
        // Primeiro, verificar se é contrato em outra rede (para evitar falso positivo de carteira)
        const otherChain = await detectContractOnOtherNetwork(addrRaw, chainIdRaw);
        if (otherChain) {
          showStatus(container, "");
          if (typeof container?.__tcContractSearchClear === "function") container.__tcContractSearchClear({ silent: true });
          const otherNet = networkManager?.getNetworkById?.(otherChain);
          const label = otherNet?.name ? `${otherNet.name} (${otherChain})` : `chainId ${otherChain}`;
          const subtitle = `Endereço não pertence a esta rede. Encontrado em ${label}.`;
          showStrictAddressError(container, subtitle, () => {
            const clearAllBtn = document.getElementById("btn-clear");
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
            const clearAllBtn = document.getElementById("btn-clear");
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
        const clearAllBtn = document.getElementById("btn-clear");
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
    const isWallet = merged?.isContract === false;
    await updateContractDetailsView(container, chainIdRaw, addrRaw, merged, {
      // Para EOA: não abrir o card de contrato — applyEoaView exibe o card de carteira
      autoShowCard: !isWallet && container.getAttribute("data-cs-auto-open") === "true",
      skipVerification: isWallet,
      skipTradingPair: isWallet,
      // Para EOA: pular busca de saldo de contrato — applyEoaView faz a própria busca de saldo
      skipBalances: isWallet,
    });
    if (isWallet) {
      applyEoaView(container, chainIdRaw, addrRaw);
    }

    try {
      // Para carteiras (EOA) não reabrimos o card de contrato — applyEoaView cuida do swap
      if (!isWallet && container.getAttribute("data-cs-auto-open") === "true") {
        const card2 = container.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");
        if (card2) card2.classList.remove("d-none");
      }
    } catch (_) {}
    
    // Status Logic
    const infoBtn = container.querySelector("#csInfoBtn");
    
    if (!hasData) {
        if (infoBtn) infoBtn.disabled = true;
        let msg = extra.isContract === true ? "Contrato encontrado." : "Endereço é uma Carteira Pessoal (EOA).";
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
          if (hasData || extra.isContract === true || isWallet) {
              btn.setAttribute("data-mode", "clear");
              btn.classList.remove("tc-action-search");
              btn.classList.add("tc-action-clear");
              const icon = btn.querySelector("i");
              if (icon) icon.className = "bi bi-trash";
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
      const infoBtnInit = container.querySelector("#csInfoBtn");
      if (formEl) formEl.classList.add("d-none");
      if (statusEl) statusEl.classList.add("d-none");
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
        btn.classList.remove("tc-action-clear");
        btn.classList.add("tc-action-search");
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

      try {
        resetEoaView(container);
        const extendedInfo = document.getElementById("cs-extended-info");
        if (extendedInfo) extendedInfo.classList.add("d-none");
        const capsBadges = document.getElementById("cs_capabilitiesBadges");
        if (capsBadges) capsBadges.innerHTML = "";
        // cs_capabilitiesSection: oculta no reset
        const capSec = document.querySelector("#cs_capabilitiesSection");
        if (capSec) capSec.classList.add("d-none");
        // cs_analysisSection: mantém visível com placeholder restaurado
        const analysisSec = document.querySelector("#cs_analysisSection");
        if (analysisSec) {
            analysisSec.classList.remove("d-none");
            document.getElementById("cs_analysisPlaceholder")?.classList.remove("d-none");
            document.getElementById("cs_analysisText")?.classList.add("d-none");
            const sub = document.getElementById("cs_analysisSubtitle");
            if (sub) sub.textContent = "Leitura do código verificado";
        }
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

  const copyTxBtn = container.querySelector("[data-cs-copy-txhash]");
  if (copyTxBtn) {
    copyTxBtn.addEventListener("click", () => {
      const val = container.querySelector("#cs_viewTxHash")?.textContent;
      if (!val) return;
      if (window.copyToClipboard) { window.copyToClipboard(val); return; }
      navigator.clipboard?.writeText?.(val).catch(() => {});
    });
  }

  const openTxExplorerBtn = container.querySelector("[data-cs-open-tx-explorer]");
  if (openTxExplorerBtn) {
    openTxExplorerBtn.addEventListener("click", () => {
      const href = container.querySelector("#cs_viewTxHash")?.getAttribute("href");
      if (href && href !== "#") window.open(href, "_blank");
    });
  }

  const shareTxWaBtn = container.querySelector("[data-cs-share-tx-whatsapp]");
  if (shareTxWaBtn) {
    shareTxWaBtn.addEventListener("click", () => {
      const href = container.querySelector("#cs_viewTxHash")?.getAttribute("href");
      if (href && href !== "#") window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(href)}`, "_blank");
    });
  }

  const shareTxTgBtn = container.querySelector("[data-cs-share-tx-telegram]");
  if (shareTxTgBtn) {
    shareTxTgBtn.addEventListener("click", () => {
      const href = container.querySelector("#cs_viewTxHash")?.getAttribute("href");
      if (href && href !== "#") window.open(`https://t.me/share/url?url=${encodeURIComponent(href)}&text=${encodeURIComponent("Transação:")}`, "_blank");
    });
  }

  const shareTxEmBtn = container.querySelector("[data-cs-share-tx-email]");
  if (shareTxEmBtn) {
    shareTxEmBtn.addEventListener("click", () => {
      const href = container.querySelector("#cs_viewTxHash")?.getAttribute("href");
      if (href && href !== "#") window.open(`mailto:?subject=${encodeURIComponent("Tx Hash")}&body=${encodeURIComponent(href)}`, "_self");
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
