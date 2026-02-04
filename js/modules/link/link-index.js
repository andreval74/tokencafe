// Link Generator - TokenCafe (Refatorado e Limpo)
// Responsável por buscar rede, ler token e gerar link compartilhável

import { networkManager } from "../../shared/network-manager.js";
import { SharedUtilities } from "../../core/shared_utilities_es6.js";
import { SystemResponse } from "../../shared/system-response.js";
import { getFallbackRpc, getFallbackExplorer } from "../../shared/network-fallback.js";
import { initContainer } from "../../shared/contract-search.js";

const utils = new SharedUtilities();
const systemResponse = new SystemResponse();

let lastContractData = null;

const ids = {
  networkSearch: "networkSearch",
  networkAutocomplete: "networkAutocomplete",
  rpcUrl: "rpcUrl",
  explorerUrl: "explorerUrl",
  tokenAddress: "l_tokenAddress",
  tokenName: "l_tokenName",
  tokenSymbol: "l_tokenSymbol",
  tokenDecimals: "l_tokenDecimals",
  tokenImage: "l_tokenImage",
  btnTokenSearch: "contractSearchBtn",
  btnClearToken: "btnClearToken",
  btnCopyLink: "copyAddressBtn",
  btnShareLink: "btnShareLink",
  btnPreviewLink: "btnPreviewLink",
  addToWalletButton: "addToWalletButton",
  btnAddNetwork: "btnAddNetwork",
  btnOpenLink: "viewAddressBtn",
  btnClearAll: "btnClearAll",
  generatedLink: "generatedLink",
  btnShareWhatsAppSmall: "btnShareWhatsAppSmall",
  btnShareTelegramSmall: "btnShareTelegramSmall",
  btnShareEmailSmall: "btnShareEmailSmall",
};

let selectedNetwork = null;
let tokenFetched = false;
let readonlyLinkMode = false;

// Helper to get value from Input or TextContent from Span/Div
function getValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
    return el.value;
  }
  return el.textContent;
}

// Helper to set value to Input or TextContent to Span/Div
function setValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  const safeVal = value ?? "";
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT") {
    el.value = safeVal;
  } else {
    el.textContent = safeVal;
  }
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("d-none");
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add("d-none");
}

function setReadonlyMode(enabled) {
  readonlyLinkMode = enabled;
  // Only apply to inputs (tokenImage)
  const inputs = [ids.tokenImage];

  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      el.readOnly = enabled;
      if (enabled) el.classList.add("bg-light");
      else el.classList.remove("bg-light");
    }
  });
}

const isValidAddress = (addr) => utils.isValidEthereumAddress(addr);

// Mensagem padronizada de erro (rodapé)
function setError(msg) {
  try {
    const container = document.getElementById("token-section") || document.querySelector(".container, .container-fluid") || document.body;
    if (typeof window.notify === "function") {
      window.notify(String(msg || "Erro"), "error", { container });
      return;
    }
    console.error(msg);
  } catch (_) {}
}

// Limpa mensagem do rodapé (quando necessário)
function clearError() {
  try {
    const host = document.getElementById("tc-footer-message-host");
    if (host) {
      while (host.firstChild) host.removeChild(host.firstChild);
    }
  } catch (_) {}
}

function selectNetwork(network) {
  selectedNetwork = network;
  window.__selectedNetwork = network; // Help contract-search find the network
  
  const input = document.getElementById(ids.networkSearch);
  if (input) {
    input.value = `${network.name} (${network.chainId})`;
    input.dataset.chainId = String(network.chainId);
  }
  const box = document.getElementById(ids.networkAutocomplete);
  if (box) box.classList.add("d-none");

  // Update contract-search component if present
  try {
    const containers = document.querySelectorAll('[data-component*="contract-search.html"]');
    containers.forEach(cont => {
        if (network?.chainId) cont.setAttribute("data-chainid", String(network.chainId));
        initContainer(cont); // Garantir inicialização do componente
    });
  } catch (_) {}

  // Preencher elementos do layout padrão (rpc-index)
  const nameEl = document.getElementById("networkNameCode");
  const idEl = document.getElementById("chainIdCode");
  const curNameEl = document.getElementById("nativeCurrencyNameCode");
  const curSymEl = document.getElementById("nativeCurrencySymbolCode");
  const rpcText = document.getElementById("rpcUrlCode");
  const rpcLink = document.getElementById("rpcUrlText");
  const expText = document.getElementById("explorerUrlCode");
  const expLink = document.getElementById("explorerUrlText");

  if (nameEl) nameEl.textContent = network.name || "";
  if (idEl) idEl.textContent = String(network.chainId || "");
  if (curNameEl) curNameEl.textContent = network.nativeCurrency?.name || "";
  if (curSymEl) curSymEl.textContent = network.nativeCurrency?.symbol || "";

  let rpc = (Array.isArray(network.rpc) && network.rpc.length ? network.rpc[0] : "") || "";
  let explorer = network.explorers?.[0]?.url || "" || "";

  // Aplicar fallback quando ausente
  if (!rpc) rpc = getFallbackRpc(network.chainId);
  if (!explorer) explorer = getFallbackExplorer(network.chainId);

  // Persistir fallback na rede selecionada para uso posterior
  if (!Array.isArray(network.rpc) || network.rpc.length === 0) {
    network.rpc = rpc ? [rpc] : [];
  }
  if (!Array.isArray(network.explorers) || network.explorers.length === 0) {
    network.explorers = explorer ? [{ url: explorer }] : [];
  }

  if (rpcText) rpcText.textContent = rpc;
  if (rpcLink && rpc) rpcLink.href = rpc;
  if (expText) expText.textContent = explorer;
  if (expLink && explorer) expLink.href = explorer;

  show("token-section");
  
  // Ao exibir a seção de token, certificar que a seção de link gerado permaneça oculta até ter dados
  const genSection = document.getElementById("generate-section");
  if (genSection && !tokenFetched) genSection.classList.add("d-none");
}

function buildLink() {
  let address = String(getValue(ids.tokenAddress) || "").replace(/\s+$/u, "");
  let name = String(getValue(ids.tokenName) || "").replace(/\s+$/u, "");
  let symbol = String(getValue(ids.tokenSymbol) || "").replace(/\s+$/u, "");
  let decimals = String(getValue(ids.tokenDecimals) || "").replace(/\s+$/u, "");
  let image = String(getValue(ids.tokenImage) || "").replace(/\s+$/u, "");

  // Fallback to cached data if inputs are missing (e.g. using contract-search component)
  if (lastContractData) {
    if (!address) address = lastContractData.contractAddress || "";
    if (!name) name = lastContractData.tokenName || "";
    if (!symbol) symbol = lastContractData.tokenSymbol || "";
    if (!decimals && lastContractData.tokenDecimals != null) decimals = String(lastContractData.tokenDecimals);
  }

  if (!address || !selectedNetwork) return "";

  // Helper to ensure proper string
  const safeStr = (v) => String(v || "").trim();

  const params = new URLSearchParams({
    address: safeStr(address),
    chainId: String(selectedNetwork.chainId),
    name: safeStr(name),
    symbol: safeStr(symbol),
    decimals: safeStr(decimals) || "18",
    image: safeStr(image),
    rpc: selectedNetwork.rpc?.[0] || "",
    explorer: selectedNetwork.explorers?.[0]?.url || "",
  });

  // Usar caminho relativo para ser compatível com subpastas/local/servidor
  const currentPath = location.pathname;
  let shareUrl = "";
  if (currentPath.includes("link-index.html")) {
      shareUrl = new URL(currentPath.replace("link-index.html", "link-token.html"), location.origin);
  } else {
      shareUrl = new URL("/pages/modules/link/link-token.html", location.href);
  }
  
  params.forEach((v, k) => shareUrl.searchParams.set(k, v));
  
  return shareUrl.toString();
}

function updateGeneratedLink() {
  const url = buildLink();

  // Atualizar input visível na seção estática
  setValue(ids.generatedLink, url);

  // Remove is-invalid from symbol if filled
  const sEl = document.getElementById(ids.tokenSymbol);
  // Note: sEl is now a span, so classList changes might not affect visual validation unless custom CSS exists
  // but it's harmless.

  // Garantir que a seção de links gerados seja exibida se houver URL
  const genSection = document.getElementById("generate-section");
  const addNetSection = document.getElementById("add-network-section");
  if (url && genSection) {
    genSection.classList.remove("d-none");
    if (addNetSection) addNetSection.classList.remove("d-none");
  } else if (!url && genSection) {
    genSection.classList.add("d-none");
    if (addNetSection) addNetSection.classList.add("d-none");
  }

  const sym = getValue(ids.tokenSymbol);
  const dec = getValue(ids.tokenDecimals);
  const manualData = sym && dec && sym !== "TKN";

  if (url && (tokenFetched || manualData)) {
    clearError();
  } else {
    systemResponse.hide();
    const addr = String(getValue(ids.tokenAddress) || "").replace(/\s+$/u, "");
    if (!addr || !isValidAddress(addr)) {
      setError("Endereço inválido ou não informado.");
    } else if (!selectedNetwork) {
      setError("Rede não selecionada.");
    } else if (!tokenFetched && !manualData) {
      const netName = selectedNetwork?.name || "";
      const cid = selectedNetwork?.chainId != null ? String(selectedNetwork.chainId) : "";
      const msg = netName && cid ? `Contrato não pertence à rede selecionada (${netName}, chainId ${cid}) ou sem dados ERC-20.` : "Contrato não pertence à rede selecionada ou sem dados ERC-20.";
      setError(msg);
    }
  }
}

function clearTokenOnly() {
  clearAll();
  show("network-section");
  try {
    document.getElementById(ids.networkSearch)?.focus();
  } catch {}
}

function clearAll() {
  setReadonlyMode(false);
  setValue(ids.tokenAddress, "");
  setValue(ids.tokenName, "");
  setValue(ids.tokenSymbol, "");
  setValue(ids.tokenDecimals, "");
  setValue(ids.tokenImage, "");
  setValue(ids.generatedLink, "");
  
  // Clear contract-search inputs
  const csInput = document.getElementById("f_address");
  if (csInput) csInput.value = "";

  tokenFetched = false;
  selectedNetwork = null;
  lastContractData = null;
  
  hide("selected-network-info");
  show("network-section");
  hide("token-section");
  hide("generate-section");
  hide("add-network-section");
  
  const loading = document.getElementById("tokenLoading");
  if (loading) loading.classList.add("d-none");

  // Limpar busca de rede e autocomplete
  const search = document.getElementById(ids.networkSearch);
  if (search) {
    search.value = "";
    delete search.dataset.chainId;
  }
  const box = document.getElementById(ids.networkAutocomplete);
  if (box) {
    box.innerHTML = "";
    box.classList.add("d-none");
  }

  // Limpar detalhes de rede exibidos
  ["networkNameCode", "chainIdCode", "nativeCurrencyNameCode", "nativeCurrencySymbolCode", "rpcUrlCode", "explorerUrlCode"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });

  const rpcLink = document.getElementById("rpcUrlText");
  if (rpcLink) {
    rpcLink.removeAttribute("href");
    const rpcSpan = document.getElementById("rpcUrlCode");
    if (rpcSpan) rpcSpan.textContent = "";
  }

  const expLink = document.getElementById("explorerUrlText");
  if (expLink) {
    expLink.removeAttribute("href");
    const expSpan = document.getElementById("explorerUrlCode");
    if (expSpan) expSpan.textContent = "";
  }
  
  // Reset buttons
  const btnSearch = document.getElementById(ids.btnTokenSearch);
  if (btnSearch) {
    btnSearch.disabled = false;
    btnSearch.innerHTML = '<i class="bi bi-search"></i>';
  }

  window.notify && window.notify("Dados limpos", "info");
}

function copyLink() {
  const val = getValue(ids.generatedLink);
  if (!val) return;
  if (window.copyToClipboard) {
    window.copyToClipboard(val);
  } else {
    navigator.clipboard.writeText(val).then(() => window.notify && window.notify("Link copiado", "success"));
  }
}

function ensureGeneratedLink() {
  let url = getValue(ids.generatedLink);
  if (!url) {
    url = buildLink();
    if (url) setValue(ids.generatedLink, url);
  }
  return url || "";
}

function shareLink() {
  const url = ensureGeneratedLink();
  if (!url) {
    window.notify && window.notify("Nenhum link gerado. Informe rede e token.", "warning");
    return;
  }
  // Use global system response or custom share modal
  openShareMenu(url);
}

function openShareMenu(url) {
  let modalEl = document.getElementById("tcShareModal");
  if (!modalEl) {
    modalEl = document.createElement("div");
    modalEl.id = "tcShareModal";
    modalEl.className = "modal fade";
    modalEl.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Compartilhar Link</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="d-grid gap-2">
              <button id="tcShareWhatsApp" class="btn btn-outline-success">WhatsApp</button>
              <button id="tcShareTelegram" class="btn btn-outline-info">Telegram</button>
              <button id="tcShareEmail" class="btn btn-outline-primary">Email</button>
              <button id="tcShareCopy" class="btn btn-outline-secondary">Copiar Link</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modalEl);
    
    // Listeners do Modal
    modalEl.querySelector("#tcShareWhatsApp")?.addEventListener("click", () => {
        const u = modalEl.dataset.url || "";
        try { window.open(`https://wa.me/?text=${encodeURIComponent(u)}`, "_blank"); } catch (_) {}
    });
    modalEl.querySelector("#tcShareTelegram")?.addEventListener("click", () => {
        const u = modalEl.dataset.url || "";
        try { window.open(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=TokenCafe%20Link`, "_blank"); } catch (_) {}
    });
    modalEl.querySelector("#tcShareEmail")?.addEventListener("click", () => {
        const u = modalEl.dataset.url || "";
        try { window.open(`mailto:?subject=TokenCafe%20Link&body=${encodeURIComponent(u)}`, "_self"); } catch (_) {}
    });
    modalEl.querySelector("#tcShareCopy")?.addEventListener("click", async () => {
        const u = modalEl.dataset.url || "";
        if (window.copyToClipboard) {
          window.copyToClipboard(u);
        } else {
          navigator.clipboard.writeText(u)
            .then(() => window.notify && window.notify("Link copiado", "success"))
            .catch(() => window.notify && window.notify("Falha ao copiar", "warning"));
        }
    });
  }
  modalEl.dataset.url = url;
  try {
    const modal = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
    modal.show();
  } catch (_) {
    window.notify && window.notify("Compartilhamento indisponível", "warning");
  }
}

function shareWhatsAppSmall() {
  const u = ensureGeneratedLink();
  if (!u) return window.notify && window.notify("Gere o link primeiro.", "warning");
  try { window.open(`https://wa.me/?text=${encodeURIComponent(u)}`, "_blank"); } catch (_) {}
}

function shareTelegramSmall() {
  const u = ensureGeneratedLink();
  if (!u) return window.notify && window.notify("Gere o link primeiro.", "warning");
  try { window.open(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=TokenCafe%20Link`, "_blank"); } catch (_) {}
}

function shareEmailSmall() {
  const u = ensureGeneratedLink();
  if (!u) return window.notify && window.notify("Gere o link primeiro.", "warning");
  try { window.open(`mailto:?subject=TokenCafe%20Link&body=${encodeURIComponent(u)}`, "_self"); } catch (_) {}
}

function viewGeneratedLink() {
  const u = ensureGeneratedLink();
  if (!u) return window.notify && window.notify("Gere o link primeiro.", "warning");
  try { window.open(u, "_blank"); } catch (_) {}
}

async function addTokenToMetaMask() {
  try {
    const address = lastContractData?.contractAddress || String(getValue(ids.tokenAddress) || "").replace(/\s+$/u, "");
    let symbol = lastContractData?.tokenSymbol || String(getValue(ids.tokenSymbol) || "").replace(/\s+$/u, "");
    let decimals = lastContractData?.tokenDecimals != null ? lastContractData.tokenDecimals : parseInt(String(getValue(ids.tokenDecimals) || "").replace(/\s+$/u, "") || "", 10);
    const image = String(getValue(ids.tokenImage) || "").replace(/\s+$/u, "");

    if (!isValidAddress(address)) {
      window.notify && window.notify("Endereço inválido", "error");
      return;
    }
    if (!window.ethereum) {
      window.notify && window.notify("Carteira não detectada", "warning");
      return;
    }
    
    // Fallback data check
    if (!symbol || symbol === "TKN") {
        window.notify && window.notify("Símbolo do token necessário.", "warning");
        return;
    }
    
    symbol = (symbol || "TKN").slice(0, 11); // MetaMask limits symbol length
    decimals = Number.isFinite(decimals) ? decimals : 18;

    // Use networkManager to ensure network
    if (selectedNetwork?.chainId) {
        try {
            await networkManager.ensureNetwork(selectedNetwork.chainId);
        } catch (e) {
            console.warn("Could not switch network automatically:", e);
            // Continue anyway, maybe user is already on right network or will handle it
        }
    }

    await window.ethereum.request({ 
        method: "wallet_watchAsset", 
        params: { type: "ERC20", options: { address, symbol, decimals, image } } 
    });
    
    window.notify && window.notify("Solicitação enviada para a carteira", "success");
  } catch (e) {
    window.notify && window.notify(`Erro ao adicionar token: ${e.message}`, "error");
  }
}

async function addNetworkToWallet() {
  try {
    if (!selectedNetwork) {
      window.notify && window.notify("Selecione uma rede primeiro", "warning");
      return;
    }
    await networkManager.addNetworkToWallet(selectedNetwork);
  } catch (e) {
    window.notify && window.notify(`Erro ao adicionar rede: ${e.message}`, "error");
  }
}

// MAIN INITIALIZATION
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await networkManager.init();
  } catch {}

  const netSection = document.getElementById("network-section");
  if (netSection) netSection.classList.remove("d-none");

  // Initial Visibility State
  try {
    const tokenSection = document.getElementById("token-section");
    const genSection = document.getElementById("generate-section");
    if (!readonlyLinkMode) {
      if (tokenSection) tokenSection.classList.add("d-none");
      if (genSection) genSection.classList.add("d-none");
    }
  } catch {}

  // Component Event Listeners
  document.addEventListener("network:selected", (ev) => {
    const net = ev?.detail?.network;
    if (net) selectNetwork(net);
  });

  document.addEventListener("network:clear", () => {
    if (readonlyLinkMode) return;
    selectedNetwork = null;
    tokenFetched = false;
    hide("selected-network-info");
  });
  
  document.addEventListener("network:required", () => {
    if (readonlyLinkMode) return;
    selectedNetwork = null;
    tokenFetched = false;
    hide("selected-network-info");
  });

  document.addEventListener("network:toggleInfo", (ev) => {
    if (readonlyLinkMode) return;
    const visible = !!ev?.detail?.visible;
    const card = document.getElementById("selected-network-info");
    if (card) {
      card.classList.toggle("d-none", !visible);
    }
  });

  // Contract Found Listener (CRITICAL)
  document.addEventListener("contract:found", (ev) => {
    console.log("[link-index] contract:found event received:", ev.detail);
    try {
      if (readonlyLinkMode) return;
      clearError();
      const p = ev?.detail?.contract || {};
      lastContractData = p;

      // Auto-switch network if needed
      if (p?.chainId) {
        const net = networkManager.getNetworkById(p.chainId);
        if (net && (!selectedNetwork || selectedNetwork.chainId !== net.chainId)) {
            console.log("[link-index] Switching network to:", net.name);
            selectNetwork(net);
        }
      }

      // Inputs removed
      const hasData = !!(p?.tokenName || p?.tokenSymbol || p?.tokenDecimals != null);
      tokenFetched = hasData;
      
      const loading = document.getElementById("tokenLoading");
      if (loading) loading.classList.add("d-none");

      if (hasData || p?.contractAddress) {
        updateGeneratedLink();
        const genSection = document.getElementById("generate-section");
        if (genSection) genSection.classList.remove("d-none");

        // Lock UI if we have data (mostly for image input)
        setReadonlyMode(true);
        
        const btnSearch = document.getElementById(ids.btnTokenSearch);
        if (btnSearch) {
          btnSearch.disabled = true;
          btnSearch.innerHTML = '<i class="bi bi-check-circle"></i>';
        }
      } else {
        const ts = document.getElementById("token-section");
        if (ts) ts.classList.remove("d-none");
        window.notify && window.notify("Não foi possível ler dados ERC-20 do contrato. Verifique a rede.", "warning");
      }
    } catch (e) {
        console.error("[link-index] Erro ao processar dados do contrato:", e);
        window.notify && window.notify("Erro ao processar dados do contrato.", "error");
    }
  });

  // Listeners removed

  document.addEventListener("contract:clear", () => {
    tokenFetched = false;
    hide("generate-section");
    clearError();
    setReadonlyMode(false);
    
    [ids.tokenAddress, ids.tokenName, ids.tokenSymbol, ids.tokenDecimals, ids.tokenImage, ids.generatedLink].forEach((id) => setValue(id, ""));

    const badge = document.getElementById("metaValidatedBadge");
    if (badge) badge.classList.add("d-none");

    window.showFormSuccess && window.showFormSuccess("Dados limpos com sucesso!");
  });

  // UI Button Listeners
  document.getElementById(ids.btnCopyLink)?.addEventListener("click", copyLink);
  document.getElementById(ids.btnShareLink)?.addEventListener("click", shareLink);
  document.getElementById(ids.btnOpenLink)?.addEventListener("click", viewGeneratedLink);
  document.getElementById(ids.btnClearAll)?.addEventListener("click", clearAll);
  document.getElementById(ids.btnShareWhatsAppSmall)?.addEventListener("click", shareWhatsAppSmall);
  document.getElementById(ids.btnShareTelegramSmall)?.addEventListener("click", shareTelegramSmall);
  document.getElementById(ids.btnShareEmailSmall)?.addEventListener("click", shareEmailSmall);
  document.getElementById(ids.addToWalletButton)?.addEventListener("click", addTokenToMetaMask);
  document.getElementById(ids.btnAddNetwork)?.addEventListener("click", addNetworkToWallet);
  document.getElementById(ids.btnClearToken)?.addEventListener("click", clearTokenOnly);
  document.getElementById("btnAddNetworkSmall")?.addEventListener("click", addNetworkToWallet);
  document.getElementById("btnAddToMetaMaskSmall")?.addEventListener("click", addTokenToMetaMask);

  // Link input behavior
  try {
    const generatedInput = document.getElementById(ids.generatedLink);
    if (generatedInput) {
      generatedInput.addEventListener("focus", () => {
        try { generatedInput.select(); } catch (_) {}
      });
    }
  } catch (_) {}

  // Real-time link updates
  // Only tokenImage is editable now
  document.getElementById(ids.tokenImage)?.addEventListener("input", updateGeneratedLink);
  
  // Parse URL Parameters for Pre-filling
  try {
    const p = new URLSearchParams(location.search);
    const addr = p.get("address");
    const cId = p.get("chainId");
    const name = p.get("name");
    const sym = p.get("symbol");
    const dec = p.get("decimals");
    const img = p.get("image");
    const rpc = p.get("rpc");
    const explorer = p.get("explorer");

    if (cId) {
      const net = networkManager.getNetworkById(cId);
      if (net) {
        if (rpc && (!Array.isArray(net.rpc) || net.rpc.length === 0)) net.rpc = [rpc];
        if (explorer && (!Array.isArray(net.explorers) || net.explorers.length === 0)) net.explorers = [{ url: explorer }];
        selectNetwork(net);
      }
    }
    
    if (addr) {
      const hasDetails = name || sym;
      
      if (hasDetails) {
        // Full details provided - Populate manually
        readonlyLinkMode = true;
        
        // Inputs removed
        
        // Populate contract-search hidden inputs too if they exist
        const visibleInput = document.getElementById("f_address");
        if (visibleInput) visibleInput.value = addr;
        
        tokenFetched = true;
        updateGeneratedLink();
        
        const ns = document.getElementById(ids.networkSearch);
        if (ns) {
          ns.readOnly = true;
          ns.classList.add("form-control-plaintext");
        }
        
        // Readonly logic removed
        
        if (document.getElementById(ids.btnTokenSearch)) document.getElementById(ids.btnTokenSearch).classList.add("d-none");
      } else {
        // Missing details - Auto Trigger Search
        const waitComponents = setInterval(() => {
            const searchBtn = document.getElementById(ids.btnTokenSearch);
            const visibleInput = document.getElementById("f_address");
            const hiddenInput = document.getElementById(ids.tokenAddress); // Note: This is now a span
            // If it's a span, we can't set .value on it, but setValue handles textContent
            // However, contract-search might expect an input to trigger.
            
            if (searchBtn && visibleInput) {
                clearInterval(waitComponents);
                
                visibleInput.value = addr;
                // hiddenInput is span, we can set it for display
                if (hiddenInput) setValue(ids.tokenAddress, addr);
                
                console.log("Auto-triggering search...");
                searchBtn.click();
            }
        }, 200);
        
        setTimeout(() => clearInterval(waitComponents), 5000);
      }
    }
  } catch {}

  // Force Component Initialization with Retry
  let attempts = 0;
  const interval = setInterval(() => {
      const containers = document.querySelectorAll('[data-component*="contract-search.html"]');
      if (containers.length > 0) {
          containers.forEach(container => {
              if (!container.getAttribute('data-cs-initialized')) {
                  initContainer(container);
              }
          });
      }
      attempts++;
      if (attempts > 5) clearInterval(interval);
  }, 1000);
  
  const containers = document.querySelectorAll('[data-component*="contract-search.html"]');
  containers.forEach(initContainer);
});
