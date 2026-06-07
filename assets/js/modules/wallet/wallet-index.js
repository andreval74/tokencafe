/**
 * wallet-index.js
 * Gerencia a exibição das informações da carteira conectada.
 * Depende de: network-manager, shared_utilities_es6, network-fallback
 */

import { networkManager } from "../../shared/network-manager.js";
import { SharedUtilities } from "../../shared/shared_utilities_es6.js";
import { getFallbackExplorer, getFallbackRpc } from "../../shared/network-fallback.js";

const getWalletConnector = () => window.walletConnector;
const utils = new SharedUtilities();

// ─── Utilitários de DOM ──────────────────────────────────────────────────────

/**
 * Define o valor de um elemento pelo id.
 * Suporta inputs, textareas, selects, elementos de texto e âncoras (define href).
 */
function setValue(id, val) {
  const el = document.getElementById(id);
  if (!el) return;

  const text = val || "-";

  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
    el.value = val || "";
    return;
  }

  // Para âncoras: define o href quando o valor é uma URL válida
  if (el.tagName === "A") {
    const isUrl = typeof val === "string" && (val.startsWith("http://") || val.startsWith("https://"));
    el.href = isUrl ? val : "#";
    el.textContent = text;
    return;
  }

  el.textContent = text;
}

/** Retorna o texto visível de um elemento (ou .value para inputs). */
function getTextValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") return el.value;
  return el.textContent;
}

/**
 * Atualiza href do botão-ícone de Explorer (#explorerLink).
 * O texto-link (#explorerUrlDisplay) já é atualizado via setValue.
 */
function setExplorerLinkHref(url) {
  const btn = document.getElementById("explorerLink");
  if (!btn) return;
  const isUrl = typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://"));
  btn.href = isUrl ? url : "#";
  btn.classList.toggle("d-none", !isUrl);
}

/** Configura botão de copiar: copia o textContent/value do elemento alvo. */
function setupCopyButton(btnId, targetId) {
  document.getElementById(btnId)?.addEventListener("click", () => {
    const val = getTextValue(targetId);
    if (!val || val === "-") return;
    if (window.copyToClipboard) window.copyToClipboard(val);
    else navigator.clipboard.writeText(val).catch(() => {});
  });
}

// ─── Formatação ──────────────────────────────────────────────────────────────

/** Converte chainId hex ou decimal para número inteiro. */
function parseChainId(raw) {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v) return null;
  const n = v.startsWith("0x") ? parseInt(v, 16) : parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

/** Converte saldo em wei (hex) para valor decimal formatado. */
function formatWeiToNative(hexWei, decimals = 18, maxFrac = 6) {
  try {
    const bi = BigInt(hexWei);
    const base = 10n ** BigInt(decimals);
    const intPart = bi / base;
    let frac = (bi % base).toString().padStart(decimals, "0").slice(0, maxFrac);
    frac = frac.replace(/0+$/u, "");
    return frac ? `${intPart}.${frac}` : intPart.toString();
  } catch (_) {
    return "-";
  }
}

// ─── Rede / RPC ──────────────────────────────────────────────────────────────

/** Busca o saldo nativo via JSON-RPC direto com timeout. */
async function fetchNativeBalance(rpcUrl, address) {
  if (!rpcUrl || !address) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const js = await res.json();
    const result = js?.result ? String(js.result) : "";
    return result && result !== "0x" ? result : "0x0";
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// ─── Atualização da UI ────────────────────────────────────────────────────────

/**
 * Popula todos os campos do card de carteira.
 * Chamado tanto pela conexão real quanto pelo modo de visualização pública.
 */
function populateWalletFields({ address, chainId, net, symbol, rpc, explorer, statusHtml, statusClass }) {
  setValue("walletAddress", address);
  // walletAddress é <a>: aponta para o endereço no explorer quando disponível
  const walletAddrEl = document.getElementById("walletAddress");
  if (walletAddrEl && explorer && address) {
    walletAddrEl.href = `${String(explorer).replace(/\/$/, "")}/address/${address}`;
  }
  setValue("chainId", chainId);
  setValue("networkName", net?.name || (chainId ? `Rede ${chainId}` : "Desconhecida"));
  setValue("nativeCurrency", net?.nativeCurrency?.name || "-");
  setValue("currencySymbol", symbol || net?.nativeCurrency?.symbol || "-");
  setValue("rpcUrl", rpc || "-");
  setValue("explorerUrlDisplay", explorer || "-");
  setExplorerLinkHref(explorer);

  const rpcs = Array.isArray(net?.rpc) && net.rpc.length > 1
    ? net.rpc.slice(1).join(", ")
    : "Nenhum RPC personalizado configurado";
  setValue("customRpcs", rpcs);

  const statusEl = document.getElementById("walletStatusLabel");
  if (statusEl && statusHtml) {
    statusEl.className = `tc-status-label ms-auto ${statusClass || ""}`;
    statusEl.innerHTML = statusHtml;
  }
}

/** Atualiza a UI após conexão de carteira real. */
async function updateUI(data) {
  if (!data?.account) return;

  document.getElementById("wallet-empty-state")?.classList.add("d-none");
  document.getElementById("wallet-info-section")?.classList.remove("d-none");

  const chainId = parseChainId(data.chainId);
  const netMgr = networkManager || window.networkManager;
  const net = data.network || (chainId && netMgr ? netMgr.getNetworkById(chainId) : null);

  const rpc = (Array.isArray(net?.rpc) ? net.rpc[0] : net?.rpc) || "";
  const explorer = (Array.isArray(net?.explorers) ? net.explorers[0]?.url || net.explorers[0] : "") || "";

  populateWalletFields({
    address: data.account,
    chainId,
    net,
    rpc,
    explorer,
    statusHtml: '<i class="bi bi-circle-fill me-1"></i>Conectado',
    statusClass: "tc-status-ok",
  });

  // Busca e exibe o saldo
  const wc = getWalletConnector();
  const symbol = net?.nativeCurrency?.symbol || "ETH";
  setValue("balance", "Carregando...");

  try {
    if (wc && typeof wc.setAccount === "function") {
      const stAcc = String(wc.getStatus?.()?.account || "").toLowerCase();
      const nextAcc = String(data.account).toLowerCase();
      if (!stAcc || stAcc !== nextAcc) await wc.setAccount(data.account);
    }
    if (wc && typeof wc.updateBalance === "function") await wc.updateBalance();
    const raw = wc?.getStatus?.()?.balance ?? wc?.balance ?? data.balance ?? "0.0000";
    setValue("balance", `${raw} ${symbol}`);
  } catch (_) {
    setValue("balance", `0.0000 ${symbol}`);
  }
}

/** Limpa todos os campos e volta ao estado desconectado. */
function clearUI() {
  document.getElementById("wallet-empty-state")?.classList.remove("d-none");
  document.getElementById("wallet-info-section")?.classList.add("d-none");

  ["walletAddress", "chainId", "networkName", "nativeCurrency", "currencySymbol", "balance", "rpcUrl", "explorerUrlDisplay"].forEach((id) => setValue(id, ""));
  setValue("customRpcs", "Nenhum RPC personalizado configurado");

  const statusEl = document.getElementById("walletStatusLabel");
  if (statusEl) {
    statusEl.className = "tc-status-bad tc-status-label ms-auto";
    statusEl.innerHTML = '<i class="bi bi-circle-fill me-1"></i>Não conectado';
  }

  setExplorerLinkHref("");
}

// ─── Modo visualização pública (?address=0x…&chainId=97) ─────────────────────

/** Abre a carteira em modo leitura via parâmetros de URL. */
async function initViewOnlyFromParams() {
  const p = new URLSearchParams(window.location.search);
  const addr = p.get("address");
  const chainId = parseChainId(p.get("chainId"));
  const explorerOverride = p.get("explorer") || "";
  if (!addr) return;

  if (!utils.isValidEthereumAddress(addr)) {
    window.showFormError?.("Endereço inválido.");
    return;
  }
  if (!chainId) {
    window.showFormError?.("Rede não informada.");
    return;
  }

  const netMgr = networkManager || window.networkManager;
  const net = netMgr?.getNetworkById?.(chainId) || null;

  let rpc = (Array.isArray(net?.rpc) ? net.rpc[0] : "") || getFallbackRpc(chainId);
  let explorer = net?.explorers?.[0]?.url || getFallbackExplorer(chainId);
  if (explorerOverride) explorer = explorerOverride;

  document.getElementById("wallet-empty-state")?.classList.add("d-none");
  document.getElementById("wallet-info-section")?.classList.remove("d-none");

  populateWalletFields({
    address: addr,
    chainId,
    net,
    rpc,
    explorer,
    statusHtml: '<i class="bi bi-eye me-1"></i>Visualização pública',
    statusClass: "tc-status-warn",
  });

  setValue("balance", "Carregando...");
  const balHex = await fetchNativeBalance(rpc, addr);
  const symbol = net?.nativeCurrency?.symbol || "ETH";
  setValue("balance", balHex ? `${formatWeiToNative(balHex, 18, 6)} ${symbol}` : `0 ${symbol}`);
}

// ─── Verificação inicial da carteira ─────────────────────────────────────────

/**
 * Tenta detectar carteira já conectada ao carregar a página.
 * Primeiro via ethereum.eth_accounts, depois via WalletConnector.
 */
async function checkInitialWalletState() {
  const wc = getWalletConnector();

  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (!Array.isArray(accounts) || !accounts.length) return;

      // Prefere conta salva em localStorage ou cookie, senão usa a primeira disponível
      const norm = (v) => String(v || "").toLowerCase();
      let preferred = "";
      try { preferred = String(localStorage.getItem("tokencafe_wallet_address") || ""); } catch (_) {}
      if (!preferred) preferred = String(window.ethereum?.selectedAddress || "");
      if (!preferred) {
        try {
          for (const raw of String(document.cookie || "").split(";")) {
            const [k, ...rest] = String(raw).trim().split("=");
            if (k === "tokencafe_wallet_address") { preferred = decodeURIComponent(rest.join("=")); break; }
          }
        } catch (_) {}
      }

      const preferredNorm = norm(preferred);
      const statusAccNorm = norm(wc?.getStatus?.()?.account || "");
      const pick =
        (preferredNorm ? accounts.find((a) => norm(a) === preferredNorm) : null) ||
        (statusAccNorm ? accounts.find((a) => norm(a) === statusAccNorm) : null) ||
        accounts[0];

      if (!wc || !pick) return;

      if (typeof wc.setAccount === "function") await wc.setAccount(pick).catch(() => {});
      else wc.currentAccount = pick;

      await wc.updateNetworkInfo();
      await wc.updateBalance();

      const status = wc.getStatus();
      if (!status.account) status.account = pick;
      if (!status.chainId) {
        try { status.chainId = await window.ethereum.request({ method: "eth_chainId" }); } catch (_) {}
      }

      updateUI(status);
    } catch (e) {
      console.error("[wallet] Erro na verificação inicial:", e);
    }
    return;
  }

  // Fallback: sem window.ethereum, usa WalletConnector diretamente
  if (wc) {
    const status = wc.getStatus();
    if (status.connected) updateUI(status);
  }
}

// ─── Inicialização ────────────────────────────────────────────────────────────

/** Configura todos os botões e listeners de eventos da página. */
function initWalletManager() {
  // Botões de copiar
  setupCopyButton("copyAddressBtn", "walletAddress");
  setupCopyButton("copyChainIdBtn", "chainId");
  setupCopyButton("copyRpcBtn", "rpcUrl");

  // Botão de ver endereço no explorer
  document.getElementById("viewAddressBtn")?.addEventListener("click", () => {
    const explorer = getTextValue("explorerUrlDisplay");
    const addr = getTextValue("walletAddress");
    if (!explorer || explorer === "-" || !addr || addr === "-") return;
    const base = explorer.endsWith("/") ? explorer.slice(0, -1) : explorer;
    window.open(`${base}/address/${addr}`, "_blank");
  });

  // Botões de compartilhar
  const getShareLink = () => {
    const explorer = getTextValue("explorerUrlDisplay");
    const addr = getTextValue("walletAddress");
    if (!explorer || explorer === "-" || !addr || addr === "-") return addr || "";
    const base = explorer.endsWith("/") ? explorer.slice(0, -1) : explorer;
    return `${base}/address/${addr}`;
  };

  document.getElementById("walletShareWhatsAppBtn")?.addEventListener("click", () => {
    const link = getShareLink();
    if (!link) return;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(link)}`, "_blank");
  });

  document.getElementById("walletShareTelegramBtn")?.addEventListener("click", () => {
    const link = getShareLink();
    if (!link) return;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Confira esta carteira:")}`, "_blank");
  });

  document.getElementById("walletShareEmailBtn")?.addEventListener("click", () => {
    const link = getShareLink();
    if (!link) return;
    window.open(`mailto:?subject=${encodeURIComponent("Carteira")}&body=${encodeURIComponent(link)}`, "_self");
  });

  // Botão de limpar / desconectar
  const btnClear = document.getElementById("btn-clear") || document.getElementById("btn-clear-data");
  btnClear?.addEventListener("click", async () => {
    const wc = getWalletConnector();
    if (wc && typeof wc.disconnect === "function") await wc.disconnect().catch(() => {});
    clearUI();
    window.showFormSuccess?.("Dados da carteira limpos com sucesso.");
  });

  // Eventos de ciclo de vida da carteira
  document.addEventListener("wallet:connected",     (e) => updateUI(e.detail));
  document.addEventListener("wallet:accountChanged", ()  => { const wc = getWalletConnector(); if (wc) updateUI(wc.getStatus()); });
  document.addEventListener("wallet:disconnected",   ()  => clearUI());
  document.addEventListener("wallet:chainChanged",   ()  => { const wc = getWalletConnector(); if (wc) updateUI(wc.getStatus()); });
}

document.addEventListener("DOMContentLoaded", async () => {
  try { await networkManager?.init?.(); } catch (_) {}

  initWalletManager();
  await initViewOnlyFromParams();

  // Verifica carteira já conectada com pequeno delay para garantir que
  // WalletConnector e ethereum já estejam inicializados
  setTimeout(checkInitialWalletState, 500);
});
