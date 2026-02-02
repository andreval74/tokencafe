// TokenCafe — RPC Logic Module (extraído do inline)
// Este módulo move a lógica operacional da página RPC para um arquivo dedicado,
// em conformidade com a norma de evitar scripts inline. Mantém compatibilidade
// com o fluxo atual expondo window.initRPCManager.

import { walletConnector } from "../../shared/wallet-connector.js";
import { networkManager } from "../../shared/network-manager.js";
import { SystemResponse } from "../../shared/system-response.js";
import "../../shared/page-manager.js";

const systemResponse = new SystemResponse();

// Acessos aos módulos unificados via window (mantém compatibilidade)
// Usar getters dinâmicos para evitar captura de valores nulos em tempo de carga
function getWalletConnector() {
  return walletConnector;
}

function getNetworkManager() {
  return networkManager;
}

function getUtils() {
  try {
    if (!window.__tc_utils) window.__tc_utils = new (window.SharedUtilities || function () {})();
    return window.__tc_utils;
  } catch (_) {
    return null;
  }
}

function isValidUrl(url) {
  try {
    const utils = getUtils();
    if (utils && typeof utils.isValidUrl === "function") return utils.isValidUrl(url);
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_) {
    return false;
  }
}

/**
 * Inicializar gerenciador de RPC com módulos unificados
 */
async function initRPCManager() {
  // Base do backend (Flask) para operações de atualização automática
  window.RPC_BACKEND_BASE = `${location.protocol}//${location.hostname}:3001`;

  // Carregar RPCs externas (ChainList) em segundo plano
  await loadExternalRpcs();
  // Configurar event listeners
  setupEventListeners();

  // Verificar conexão existente sem forçar conexão
  const wcInit = getWalletConnector();
  if (wcInit && typeof wcInit.isConnected === "function") {
    const ok = await wcInit.isConnected();
    if (ok) {
      const status = wcInit.getStatus();
      updateWalletUI(status);
    } else {
      resetWalletUI();
    }
  } else {
    resetWalletUI();
  }
  // Sempre permitir uso da seção de rede sem exigir carteira
  showNextSection("network-section");

  // Focar no campo de busca quando o componente estiver pronto
  try {
    const inputEl = await waitForSelector("#network-section #networkSearch", 2500);
    if (inputEl) {
      inputEl.focus();
      // Disparar foco para exibir redes populares quando configurado
      inputEl.dispatchEvent(new Event("focus"));
      // Retentativa leve de foco caso algum outro elemento capture foco
      attemptFocusRetry("#network-section #networkSearch");
    }
  } catch (_) {}
}
// Expor inicialização no escopo global para consumo entre módulos
window.initRPCManager = initRPCManager;

/**
 * Configurar event listeners usando APIs unificadas
 */
function setupEventListeners() {
  // Botão conectar carteira (header) — manter para reconectar manualmente se necessário
  document.getElementById("header-connect-btn")?.addEventListener("click", async () => {
    await connectWallet();
  });

  // Busca e seleção de rede via componente compartilhado
  document.addEventListener("network:selected", (e) => {
    const net = e.detail?.network;
    if (net) {
      // Não mostrar detalhes automaticamente; apenas preparar configuração
      showNextSection("rpc-config-section");
      fillNetworkForm(net);
    }
  });
  document.addEventListener("network:required", () => {
    hideNetworkDetails();
    clearNetworkForm();
    showNextSection("network-section");
  });
  document.addEventListener("network:clear", () => {
    clearNetworkForm({ clearSearch: false });
  });

  // Toggle de informações a partir do botão I do componente
  document.addEventListener("network:toggleInfo", (e) => {
    const visible = !!e.detail?.visible;
    const net = e.detail?.network || null;
    if (visible) {
      if (net) {
        showNetworkDetails(net);
      } else {
        // Se não há rede explícita, tentar a do input
        const chainIdRaw = document.getElementById("networkSearch")?.dataset?.chainId;
        const nm = getNetworkManager();
        const fallback = chainIdRaw ? nm?.getNetworkById?.(parseInt(chainIdRaw, 10)) : null;
        if (fallback) showNetworkDetails(fallback);
      }
    } else {
      hideNetworkDetails();
    }
  });

  // Botão de adicionar rede
  document.getElementById("add-network-btn")?.addEventListener("click", async () => {
    await addNetworkToMetaMask();
  });

  // Limpar formulário
  document.getElementById("btn-clear")?.addEventListener("click", () => {
    clearNetworkForm();
  });
  // Botão "Limpar Dados" principal da página RPC
  document.getElementById("clear-network-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    clearNetworkForm();
  });

  // Entrada de RPC manual
  document.getElementById("customRpcUrl")?.addEventListener("input", () => {
    handleCustomRpcInput();
  });

  // Listeners de eventos de carteira
  document.addEventListener("wallet:connected", onWalletConnected);
  document.addEventListener("wallet:disconnected", onWalletDisconnected);
  document.addEventListener("wallet:chainChanged", onChainChanged);
}

/**
 * Conectar carteira usando módulo unificado
 */
async function connectWallet() {
  try {
    // Evitar reconexão se já estiver conectado
    const wc = getWalletConnector();
    if (wc && wc.isConnected) {
      const status = wc.getStatus();
      updateWalletUI(status);
      showNextSection("network-section");
      window.notify && window.notify("Carteira já conectada", "info");
      return;
    }
    if (!wc || typeof wc.connect !== "function") {
      console.warn("WalletConnector indisponível ou sem método connect.");
      return;
    }
    window.showLoading && showLoading("Conectando carteira...");

    const result = await wc.connect("metamask");

    if (result.success) {
      window.notify && window.notify("Carteira conectada com sucesso!", "success");
      updateWalletUI(result);
      showNextSection("network-section");
    } else {
      throw new Error("Falha na conexão");
    }
  } catch (error) {
    console.error("Erro ao conectar:", error);
    window.notify && window.notify(`Erro ao conectar: ${error.message}`, "error");
  } finally {
    window.hideLoading && hideLoading();
  }
}

/**
 * Carregar RPCs externas via backend
 * - Atualiza rpcs.json em segundo plano se >3 dias
 * - Busca rpcs.json e guarda em window.externalRpcs
 */
async function loadExternalRpcs() {
  // Preferir carregar do arquivo local; backend apenas se habilitado
  try {
    const resLocal = await fetch("/shared/data/rpcs.json");
    if (resLocal.ok) {
      const dataLocal = await resLocal.json();
      if (Array.isArray(dataLocal)) {
        window.externalRpcs = dataLocal;
        console.log(`🔗 RPCs externas carregadas do arquivo local: ${dataLocal.length}`);
      } else if (dataLocal && Array.isArray(dataLocal.rpcs)) {
        window.externalRpcs = dataLocal.rpcs;
        console.log(`🔗 RPCs externas carregadas do arquivo local (obj): ${dataLocal.rpcs.length}`);
      } else {
        window.externalRpcs = [];
      }
    } else {
      window.externalRpcs = [];
    }
  } catch (e) {
    console.warn("Falha ao carregar RPCs externas do arquivo local:", e);
    window.externalRpcs = [];
  }

  // Se backend estiver habilitado, tentar atualizar e substituir pelos dados do backend
  try {
    if (typeof window !== "undefined" && window.RPC_BACKEND_ENABLED) {
      const base = window.RPC_BACKEND_BASE || `${location.protocol}//${location.hostname}:3001`;
      await fetch(`${base}/api/rpcs/update`).catch(() => null);
      const res = await fetch(`${base}/api/rpcs`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.rpcs)) {
          window.externalRpcs = data.rpcs;
          console.log(`🔗 RPCs externas carregadas do backend: ${data.rpcs.length}`);
        }
      }
    }
  } catch (e2) {
    console.warn("Backend RPCs desabilitado ou indisponível:", e2);
  }
}

/**
 * Obter RPCs externas relevantes para a rede
 */
function getExternalRpcsForNetwork(network) {
  const entries = Array.isArray(window.externalRpcs) ? window.externalRpcs : [];
  const normalize = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/mainnet|testnet|network|chain|blockchain|bnb smart chain|binance/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const targetName = normalize(network?.name);
  const targetId = network?.chainId;

  const urls = new Set();
  for (const entry of entries) {
    const entryName = normalize(entry?.name || entry?.chainName || "");
    const entryId = entry?.chainId ?? entry?.id;

    let rpcCandidates = [];
    if (Array.isArray(entry?.rpcs)) {
      rpcCandidates = entry.rpcs.map((r) => {
        if (typeof r === "string") return r;
        if (r && typeof r === "object") return r.url || r.rpc || r.endpoint || "";
        return "";
      });
    } else if (Array.isArray(entry?.rpc)) {
      rpcCandidates = entry.rpc.map((r) => (typeof r === "string" ? r : r?.url || ""));
    } else if (typeof entry?.url === "string") {
      rpcCandidates = [entry.url];
    }

    const matchById = targetId && entryId && Number(entryId) === Number(targetId);
    const entryNorm = entryName;
    const matchByName = !!targetName && !!entryNorm && (entryNorm.includes(targetName) || targetName.includes(entryNorm));

    if (matchById || matchByName) {
      for (const u of rpcCandidates) {
        if (isValidUrl(u)) urls.add(u);
      }
    }
  }
  // Exibir mais opções para facilitar escolha; manter limite razoável
  return Array.from(urls).slice(0, 100);
}

/**
 * Buscar redes usando network manager unificado
 */

/**
 * Selecionar rede
 */
function unusedSelectNetwork(chainId) {
  const nm = getNetworkManager();
  const network = nm ? nm.getNetworkById(chainId) : null;
  if (!network) return;

  // Atualizar UI
  const networkSearchEl = document.getElementById("networkSearch");
  if (networkSearchEl) {
    networkSearchEl.value = network.name;
    networkSearchEl.dataset.chainId = String(network.chainId);
  }
  hideAutocomplete();

  // Não mostrar detalhes automaticamente; apenas avançar para configuração
  showNextSection("rpc-config-section");

  // Pré-preencher formulário
  fillNetworkForm(network);
}

/**
 * Mostrar detalhes da rede selecionada
 */
function showNetworkDetails(network) {
  // Preencher placeholders estáticos sem gerar HTML dinâmico
  const nameEl = document.getElementById("networkNameCode");
  const idEl = document.getElementById("chainIdCode");
  const currencyNameEl = document.getElementById("nativeCurrencyNameCode");
  const currencySymbolEl = document.getElementById("nativeCurrencySymbolCode");

  if (nameEl) nameEl.textContent = network?.name || "N/A";
  if (idEl) idEl.textContent = network?.chainId !== undefined ? String(network.chainId) : "N/A";
  if (currencyNameEl) currencyNameEl.textContent = network?.nativeCurrency?.name || "N/A";
  if (currencySymbolEl) currencySymbolEl.textContent = network?.nativeCurrency?.symbol || "N/A";

  // Exibir o card
  document.getElementById("selected-network-info")?.classList.remove("d-none");
}

function hideNetworkDetails() {
  // Ocultar o card de detalhes da rede
  document.getElementById("selected-network-info")?.classList.add("d-none");
}

/**
 * Pré-preencher formulário com dados da rede
 */
function fillNetworkForm(network) {
  // Persistir chainId selecionado no input de busca
  const networkSearchEl = document.getElementById("networkSearch");
  if (networkSearchEl) {
    networkSearchEl.dataset.chainId = String(network.chainId);
  }

  // Habilitar próxima seção
  showNextSection("add-network-section");
  updateNetworkPreview(network);

  // Renderizar opções de RPCs disponíveis
  renderRpcOptions(network);

  // Aplicar regra de prioridade do RPC manual (se existir)
  handleCustomRpcInput();
}

/**
 * Atualizar preview da rede
 */
function updateNetworkPreview(network) {
  const unusedPreview = document.getElementById("network-preview");

  // Escolher RPC: manual > radio > primeiro disponível
  const customVal = String(document.getElementById("customRpcUrl")?.value || "").replace(/\s+$/u, "") || "";
  let rpcUrl = "";
  if (customVal && isValidUrl(customVal)) {
    rpcUrl = customVal;
  } else {
    const selectedRadio = document.querySelector('#rpc-options-list input[name="rpcChoice"]:checked');
    if (selectedRadio) {
      rpcUrl = selectedRadio.value;
    } else {
      rpcUrl = Array.isArray(network.rpc) && network.rpc.length ? network.rpc[0] : typeof network.rpc === "string" ? network.rpc : "";
    }
  }

  const explorerUrl = network.explorers && network.explorers.length > 0 ? network.explorers[0].url || network.explorers[0] : "";

  // Atualizar textos/links no bloco "Rede Selecionada"
  const rpcCodeEl = document.getElementById("rpcUrlCode");
  const rpcAnchorEl = document.getElementById("rpcUrlText");
  if (rpcCodeEl) rpcCodeEl.textContent = rpcUrl || "N/A";
  if (rpcAnchorEl) rpcAnchorEl.href = rpcUrl && isValidUrl(rpcUrl) ? rpcUrl : "#";
  const explorerCodeEl = document.getElementById("explorerUrlCode");
  const explorerAnchorEl = document.getElementById("explorerUrlText");
  if (explorerCodeEl) explorerCodeEl.textContent = explorerUrl || "N/A";
  if (explorerAnchorEl) explorerAnchorEl.href = explorerUrl && isValidUrl(explorerUrl) ? explorerUrl : "#";

  // Atualizar blocos estáticos do preview (sem gerar HTML dinâmico)
  const previewRpcCodeEl = document.getElementById("previewRpcUrlCode");
  const previewRpcAnchorEl = document.getElementById("previewRpcUrlText");
  if (previewRpcCodeEl) previewRpcCodeEl.textContent = rpcUrl || "N/A";
  if (previewRpcAnchorEl) previewRpcAnchorEl.href = rpcUrl && isValidUrl(rpcUrl) ? rpcUrl : "#";
  const previewExplorerCodeEl = document.getElementById("previewExplorerUrlCode");
  const previewExplorerAnchorEl = document.getElementById("previewExplorerUrlText");
  if (previewExplorerCodeEl) previewExplorerCodeEl.textContent = explorerUrl || "N/A";
  if (previewExplorerAnchorEl) previewExplorerAnchorEl.href = explorerUrl && isValidUrl(explorerUrl) ? explorerUrl : "#";

  updateAddButtonState(network);
}

/**
 * Adicionar rede ao MetaMask usando módulo unificado
 */
async function addNetworkToMetaMask() {
  try {
    window.showLoading && showLoading("Adicionando rede ao MetaMask...");

    // Validar Chain ID obtido do campo de busca
    const chainIdRaw = document.getElementById("networkSearch").dataset.chainId;
    const chainIdNum = chainIdRaw ? parseInt(chainIdRaw, 10) : NaN;
    if (!chainIdNum || Number.isNaN(chainIdNum)) {
      throw new Error("Chain ID inválido. Selecione a rede pela busca.");
    }

    const nm = getNetworkManager();
    const network = nm ? nm.getNetworkById(chainIdNum) : null;
    // RPC escolhido
    const customVal = String(document.getElementById("customRpcUrl")?.value || "").replace(/\s+$/u, "") || "";
    let chosenRpc = "";
    if (customVal && isValidUrl(customVal)) {
      chosenRpc = customVal;
    } else {
      const selectedRadio = document.querySelector('#rpc-options-list input[name="rpcChoice"]:checked');
      if (selectedRadio) {
        chosenRpc = selectedRadio.value;
      } else {
        chosenRpc = Array.isArray(network.rpc) && network.rpc.length ? network.rpc[0] : typeof network.rpc === "string" ? network.rpc : "";
      }
    }

    const explorer = network.explorers && network.explorers.length > 0 ? network.explorers[0].url || network.explorers[0] : "";

    const networkData = {
      chainId: chainIdNum,
      name: network?.name || document.getElementById("networkSearch").value,
      rpc: [chosenRpc],
      nativeCurrency: {
        name: network?.nativeCurrency?.name || "",
        symbol: network?.nativeCurrency?.symbol || "",
        decimals: 18,
      },
      explorers: explorer ? [{ url: explorer }] : [],
    };

    const wc = getWalletConnector();
    if (!wc || typeof wc.addNetwork !== "function") {
      throw new Error("WalletConnector indisponível para adicionar rede.");
    }
    await wc.addNetwork(networkData);

    // Registrar RPC escolhido como já adicionado para esta rede
    addKnownRpc(networkData.chainId, networkData.rpc[0]);

    // Show System Response
    systemResponse.show({
      title: "Rede Adicionada",
      subtitle: "A rede foi adicionada com sucesso à sua carteira.",
      icon: "bi-hdd-network",
      onClear: () => {
        // Reload completo para garantir limpeza total e prevenir estados inconsistentes
        window.location.reload();
      },
    });

    hideAllSections();
  } catch (error) {
    console.error("Erro ao adicionar rede:", error);
    window.notify && window.notify(`Erro ao adicionar rede: ${error.message}`, "error");
    // Limpar dados ao falhar
    clearNetworkForm();
  } finally {
    window.hideLoading && hideLoading();
  }
}

// Event handlers da carteira
function onWalletConnected(event) {
  const { account, wallet, network } = event.detail;
  updateWalletUI({ account, wallet, network });
}

function onWalletDisconnected() {
  resetWalletUI();
}

function onChainChanged(event) {
  const { chainId } = event.detail;
  console.log("Rede alterada:", chainId);
  window.notify && window.notify("Rede alterada na carteira", "info");
}

/**
 * Atualizar UI da carteira
 */
function updateWalletUI(result) {
  const account = result && typeof result.account === "string" ? result.account : null;
  const sessionOk = typeof result?.sessionAuthorized === "boolean" ? result.sessionAuthorized : window.walletConnector?.sessionAuthorized === true;
  const connected = !!account && !!sessionOk;
  const shortAddress = connected ? (window.formatAddress ? formatAddress(account) : account) : "";

  const headerAddr = document.getElementById("header-wallet-address");
  const headerStatus = document.getElementById("header-wallet-status");
  const headerConnectBtn = document.getElementById("header-connect-btn");
  if (headerAddr) headerAddr.textContent = shortAddress;
  if (headerStatus) headerStatus.classList.toggle("d-none", !connected);
  if (headerConnectBtn) headerConnectBtn.classList.toggle("d-none", connected);
}

/**
 * Resetar UI da carteira
 */
function resetWalletUI() {
  // Header
  document.getElementById("header-wallet-status")?.classList.add("d-none");
  document.getElementById("header-connect-btn")?.classList.remove("d-none");

  // Ocultar seções
  hideAllSections();
}

// Mostrar próxima seção
function showNextSection(sectionId) {
  document.getElementById(sectionId)?.classList.remove("d-none");
}

// Ocultar autocomplete
function hideAutocomplete() {
  document.getElementById("networkAutocomplete")?.classList.add("d-none");
}

// Ocultar todas as seções
function hideAllSections() {
  ["network-section", "rpc-config-section", "add-network-section"].forEach((id) => {
    document.getElementById(id)?.classList.add("d-none");
  });
}

// Utilitário: aguardar seletor aparecer no DOM
async function waitForSelector(selector, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start >= timeoutMs) return resolve(null);
      setTimeout(tick, 50);
    };
    tick();
  });
}

// Fallback: tentar focar novamente algumas vezes e garantir que a seção permaneça visível
function attemptFocusRetry(selector, tries = 5, delayMs = 150) {
  let count = 0;
  const tryFocus = () => {
    const input = document.querySelector(selector);
    const netSection = document.getElementById("network-section");
    if (netSection && netSection.classList.contains("d-none")) {
      console.debug("RPC: network-section estava oculto; exibindo novamente.");
      netSection.classList.remove("d-none");
    }
    if (input) {
      if (document.activeElement !== input) {
        input.focus();
        input.dispatchEvent(new Event("focus"));
      }
    }
    if (++count < tries) setTimeout(tryFocus, delayMs);
  };
  setTimeout(tryFocus, delayMs);
}

// Limpar dados do formulário e preview
function clearNetworkForm(options = {}) {
  const silent = typeof options === "boolean" ? options : options.silent || false;
  const clearSearch = options.clearSearch !== false;

  if (clearSearch) {
    const el = document.getElementById("networkSearch");
    if (el) {
      el.value = "";
      // Disparar evento input para notificar o componente network-search
      // e garantir que clearState() seja chamado (desabilitando infoBtn, etc)
      el.dispatchEvent(new Event("input", { bubbles: true }));
      delete el.dataset.chainId;
    }
  }

  // Limpar textos/links
  const rpcCodeEl = document.getElementById("rpcUrlCode");
  if (rpcCodeEl) rpcCodeEl.textContent = "";
  const rpcAnchorEl = document.getElementById("rpcUrlText");
  if (rpcAnchorEl) rpcAnchorEl.href = "#";
  const explorerCodeEl = document.getElementById("explorerUrlCode");
  if (explorerCodeEl) explorerCodeEl.textContent = "";
  const explorerAnchorEl = document.getElementById("explorerUrlText");
  if (explorerAnchorEl) explorerAnchorEl.href = "#";
  const nameEl = document.getElementById("networkNameCode");
  if (nameEl) nameEl.textContent = "";
  const idEl = document.getElementById("chainIdCode");
  if (idEl) idEl.textContent = "";
  const currencyNameEl = document.getElementById("nativeCurrencyNameCode");
  if (currencyNameEl) currencyNameEl.textContent = "";
  const currencySymbolEl = document.getElementById("nativeCurrencySymbolCode");
  if (currencySymbolEl) currencySymbolEl.textContent = "";

  // Limpar preview e autocomplete
  const previewRpcCodeEl = document.getElementById("previewRpcUrlCode");
  if (previewRpcCodeEl) previewRpcCodeEl.textContent = "";
  const previewRpcAnchorEl = document.getElementById("previewRpcUrlText");
  if (previewRpcAnchorEl) previewRpcAnchorEl.href = "#";
  const previewExplorerCodeEl = document.getElementById("previewExplorerUrlCode");
  if (previewExplorerCodeEl) previewExplorerCodeEl.textContent = "";
  const previewExplorerAnchorEl = document.getElementById("previewExplorerUrlText");
  if (previewExplorerAnchorEl) previewExplorerAnchorEl.href = "#";
  hideAutocomplete();

  // Ocultar bloco "Rede Selecionada" e limpar detalhes
  const selectedInfo = document.getElementById("selected-network-info");
  if (selectedInfo) selectedInfo.classList.add("d-none");
  const autocomplete = document.getElementById("networkAutocomplete");
  if (autocomplete) autocomplete.innerHTML = "";

  // Limpar opções de RPC
  const rpcOptionsList = document.getElementById("rpc-options-list");
  if (rpcOptionsList) rpcOptionsList.innerHTML = "";
  document.getElementById("rpc-options-section")?.classList.add("d-none");

  // Limpar RPC manual
  const customInput = document.getElementById("customRpcUrl");
  if (customInput) customInput.value = "";

  // Ocultar seções posteriores e desabilitar botão de adicionar
  document.getElementById("rpc-config-section")?.classList.add("d-none");
  document.getElementById("add-network-section")?.classList.add("d-none");
  const addBtn = document.getElementById("add-network-btn");
  if (addBtn) addBtn.setAttribute("disabled", "");

  if (!silent) {
    window.notify && window.notify("Dados limpos. Selecione uma rede para começar.", "info");
  }
}

// Testar se um RPC está online chamando eth_chainId
async function testRpcUrl(rpcUrl, expectedChainId) {
  const utils = getUtils();
  const valid =
    utils && typeof utils.isValidUrl === "function"
      ? utils.isValidUrl(rpcUrl)
      : (() => {
          try {
            const u = new URL(rpcUrl);
            return !!u.protocol && (u.protocol === "http:" || u.protocol === "https:");
          } catch {
            return false;
          }
        })();
  if (!valid) return false;
  try {
    const resp =
      utils && typeof utils.fetchWithTimeout === "function"
        ? await utils.fetchWithTimeout(
            rpcUrl,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_chainId",
                params: [],
                id: 1,
              }),
            },
            5000,
          )
        : await (async () => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 5000);
            try {
              const r = await fetch(rpcUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", method: "eth_chainId", params: [], id: 1 }), signal: controller.signal });
              return r;
            } finally {
              clearTimeout(id);
            }
          })();
    if (!resp.ok) return false;
    const data = await resp.json().catch(() => null);
    if (!data || (!data.result && !data.chainId)) return false;
    if (expectedChainId) {
      const expectedHex = typeof expectedChainId === "string" ? (expectedChainId.startsWith("0x") ? expectedChainId.toLowerCase() : "0x" + Number(expectedChainId).toString(16)) : "0x" + Number(expectedChainId).toString(16);
      const got = (data.result || data.chainId || "").toLowerCase();
      if (got && got.startsWith("0x")) return got === expectedHex;
    }
    return true;
  } catch {
    return false;
  }
}

// Cache simples de validações por URL
const rpcValidationCache = {};
let customRpcValidated = false;

function updateAddButtonState(network) {
  const addBtn = document.getElementById("add-network-btn");
  if (!addBtn) return;
  const selectedRadio = document.querySelector('#rpc-options-list input[name="rpcChoice"]:checked');
  const customVal = String(document.getElementById("customRpcUrl")?.value || "").replace(/\s+$/u, "") || "";
  const useCustom = customVal && customRpcValidated;
  const useRadio = selectedRadio && rpcValidationCache[selectedRadio.value] === true;
  const ready = !!(network && (useCustom || useRadio));
  addBtn.disabled = !ready;
  addBtn.classList.toggle("d-none", !ready);
}

// Filtrar e retornar apenas RPCs online
async function unusedGetWorkingRpcs(rpcUrls, expectedChainId) {
  const unique = Array.from(new Set((rpcUrls || []).filter(isValidUrl)));
  const limited = unique.slice(0, 8);
  const results = await Promise.allSettled(limited.map((url) => testRpcUrl(url, expectedChainId)));
  const working = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === "fulfilled" && results[i].value) working.push(limited[i]);
  }
  return working;
}

// Utilitários de cache de RPCs já adicionadas (por chainId)
function getKnownRpcStore() {
  try {
    const raw = localStorage.getItem("tokencafe_known_rpcs");
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveKnownRpcStore(store) {
  try {
    localStorage.setItem("tokencafe_known_rpcs", JSON.stringify(store));
  } catch (e) {
    // ignore
  }
}

function getKnownRpcs(chainId) {
  const store = getKnownRpcStore();
  const key = String(chainId);
  return Array.isArray(store[key]) ? store[key] : [];
}

function addKnownRpc(chainId, rpcUrl) {
  const store = getKnownRpcStore();
  const key = String(chainId);
  const list = Array.isArray(store[key]) ? store[key] : [];
  if (!list.includes(rpcUrl)) {
    list.push(rpcUrl);
    store[key] = list;
    saveKnownRpcStore(store);
  }
}

/**
 * Renderizar lista de RPCs disponíveis para a rede selecionada
 */
async function renderRpcOptions(network) {
  const section = document.getElementById("rpc-options-section");
  const listEl = document.getElementById("rpc-options-list");
  if (!section || !listEl) return;
  try {
    section.classList.remove("d-none");
  } catch (_) {}

  // Se há RPC manual preenchido, esconder a lista
  const customVal = String(document.getElementById("customRpcUrl")?.value || "").replace(/\s+$/u, "");
  if (customVal) {
    section.classList.add("d-none");
    const addBtn = document.getElementById("add-network-btn");
    const chainIdRaw = document.getElementById("networkSearch").dataset.chainId;
    if (addBtn) addBtn.disabled = !(isValidUrl(customVal) && chainIdRaw);
    updateNetworkPreview(network);
    return;
  }

  const nativeRpcs = Array.isArray(network.rpc) ? network.rpc : network.rpc ? [network.rpc] : [];
  const externalRpcs = getExternalRpcsForNetwork(network);
  const toUrl = (r) => {
    if (typeof r === "string") return r;
    if (r && typeof r === "object") return r.url || r.rpc || r.endpoint || "";
    return "";
  };
  const allRpcs = Array.from(new Set([...nativeRpcs.map(toUrl).filter(isValidUrl), ...externalRpcs.map(toUrl).filter(isValidUrl)]));
  const known = new Set(getKnownRpcs(network.chainId).map((r) => r.trim()));
  const available = allRpcs.filter((url) => url && !known.has(url.trim()));
  // Exibir automaticamente ao selecionar a rede
  listEl.innerHTML = available
    .map(
      (url, idx) => `
                        <div class="list-group-item d-flex align-items-center justify-content-between gap-2" data-rpc-url="${url}">
                            <div class="d-flex align-items-center gap-2">
                                <input type="radio" name="rpcChoice" class="form-check-input me-2" value="${url}" disabled />
                                <code class="text-tokencafe" id="rpc-url-${idx}">${url}</code>
                                <button class="btn btn-sm btn-link text-white p-0 ms-1" onclick="window.copyToClipboard('${url}')" title="Copiar URL">
                                     <i class="bi bi-clipboard"></i>
                                </button>
                            </div>
                            <button id="rpcTest-${idx}" class="btn btn-sm btn-outline-primary">Testar</button>
                        </div>
                    `,
    )
    .join("");

  // Eventos: testar ao clicar "Testar" e ao selecionar o radio
  available.forEach((url, idx) => {
    const btnEl = document.getElementById(`rpcTest-${idx}`);
    const radioEl = listEl.querySelector(`#rpc-options-list input[name="rpcChoice"][value="${url}"]`) || listEl.querySelector(`input[name="rpcChoice"][value="${url}"]`);

    const runTest = async () => {
      btnEl.className = "btn btn-sm btn-outline-warning";
      btnEl.textContent = "Testando...";
      const ok = await testRpcUrl(url, network?.chainId);
      rpcValidationCache[url] = !!ok;
      if (ok) {
        btnEl.className = "btn btn-sm btn-outline-success";
        btnEl.textContent = "ONLINE";
        radioEl.disabled = false;
        radioEl.checked = true;
        updateNetworkPreview(network);
      } else {
        btnEl.className = "btn btn-sm btn-outline-danger";
        btnEl.textContent = "OFFLINE";
        radioEl.disabled = true;
        const container = radioEl.closest(".list-group-item");
        if (container) container.classList.add("opacity-50");
      }
      updateAddButtonState(network);
    };

    btnEl?.addEventListener("click", runTest);
    radioEl?.addEventListener("change", () => {
      updateNetworkPreview(network);
      runTest();
    });
  });

  // Estado inicial: botão de adicionar desabilitado
  updateAddButtonState(network);
}

// Regras de prioridade do RPC manual sobre a lista
function handleCustomRpcInput() {
  const unusedCustomVal = String(document.getElementById("customRpcUrl")?.value || "").replace(/\s+$/u, "") || "";
  const unusedSection = document.getElementById("rpc-options-section");
  const unusedAddBtn = document.getElementById("add-network-btn");
  const chainIdRaw = document.getElementById("networkSearch")?.dataset?.chainId;
  const chainIdNum = chainIdRaw ? parseInt(chainIdRaw, 10) : null;
  const nm = getNetworkManager();
  const network = chainIdNum ? (nm ? nm.getNetworkById(chainIdNum) : null) : null;

  // Resetar status de validação quando editar
  customRpcValidated = false;
  const btn = document.getElementById("btn-test-custom-rpc");
  if (btn) {
    btn.className = "btn btn-outline-primary";
    btn.textContent = "Testar";
  }
  if (network) updateNetworkPreview(network);
  updateAddButtonState(network);
}

// Alternar modo: lista de RPCs vs personalizada
function activateRpcMode(mode) {
  const sectionList = document.getElementById("rpc-options-section");
  const customSec = document.getElementById("custom-rpc-section");
  if (mode === "custom") {
    sectionList?.classList.add("d-none");
    customSec?.classList.remove("d-none");
  } else {
    sectionList?.classList.remove("d-none");
    customSec?.classList.add("d-none");
  }
}

// Listeners dos botões de alternância e teste personalizado
document.getElementById("btn-show-rpc-list")?.addEventListener("click", () => activateRpcMode("list"));
document.getElementById("btn-show-custom-rpc")?.addEventListener("click", () => activateRpcMode("custom"));
document.getElementById("btn-test-custom-rpc")?.addEventListener("click", async () => {
  const chainIdRaw = document.getElementById("networkSearch")?.dataset?.chainId;
  const chainIdNum = chainIdRaw ? parseInt(chainIdRaw, 10) : null;
  const nm = getNetworkManager();
  const network = chainIdNum ? (nm ? nm.getNetworkById(chainIdNum) : null) : null;
  const url = String(document.getElementById("customRpcUrl")?.value || "").replace(/\s+$/u, "") || "";
  const btn = document.getElementById("btn-test-custom-rpc");
  if (!url || !isValidUrl(url)) {
    if (btn) {
      btn.className = "btn btn-outline-danger";
      btn.textContent = "OFFLINE";
    }
    customRpcValidated = false;
    updateAddButtonState(network);
    return;
  }
  if (btn) {
    btn.className = "btn btn-outline-warning";
    btn.textContent = "Testando...";
  }
  const ok = await testRpcUrl(url, network?.chainId);
  if (btn) {
    btn.className = ok ? "btn btn-outline-success" : "btn btn-outline-danger";
    btn.textContent = ok ? "ONLINE" : "OFFLINE";
  }
  customRpcValidated = !!ok;
  updateAddButtonState(network);
  if (network) updateNetworkPreview(network);
  // manter padrão: não persistir escolha de RPC
});
//
