// Link Generator - TokenCafe (limpo e funcional)
// Responsável por buscar rede, ler token e gerar link compartilhável

import { NetworkManager } from "../../shared/network-manager.js";
import { SharedUtilities } from "../../core/shared_utilities_es6.js";
import { SystemResponse } from "../../shared/system-response.js";
import { getFallbackRpc, getFallbackExplorer } from "../../shared/network-fallback.js";

const networkManager = new NetworkManager();
const utils = new SharedUtilities();
const systemResponse = new SystemResponse();

const ids = {
  networkSearch: "networkSearch",
  networkAutocomplete: "networkAutocomplete",
  rpcUrl: "rpcUrl",
  explorerUrl: "explorerUrl",
  tokenAddress: "tokenAddress",
  tokenName: "tokenName",
  tokenSymbol: "tokenSymbol",
  tokenDecimals: "tokenDecimals",
  tokenImage: "tokenImage",
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
// Sucesso visual não exibe mensagem fixa para não sobrepor botões

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

function unusedSetText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
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
  const inputs = [ids.tokenAddress, ids.tokenName, ids.tokenSymbol, ids.tokenDecimals, ids.tokenImage];

  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
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

// Função initStatusMirror removida para padronização com outros módulos.
// O feedback de erro deve vir do próprio componente de busca ou de validações locais,
// sem duplicar mensagens via MutationObserver.

// Removido: função não utilizada

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

async function readTokenMetaFromRpc(address, net) {
  try {
    if (!isValidAddress(address)) return {};

    // Tentar via window.ethereum se estiver na rede correta (mais confiável)
    if (window.ethereum && net?.chainId) {
      try {
        const curChain = await window.ethereum.request({ method: "eth_chainId" });
        if (parseInt(curChain, 16) === Number(net.chainId)) {
          const [symHex, decHex, nameHex] = await Promise.all([window.ethereum.request({ method: "eth_call", params: [{ to: address, data: "0x95d89b41" }, "latest"] }).catch(() => null), window.ethereum.request({ method: "eth_call", params: [{ to: address, data: "0x313ce567" }, "latest"] }).catch(() => null), window.ethereum.request({ method: "eth_call", params: [{ to: address, data: "0x06fdde03" }, "latest"] }).catch(() => null)]);

          const symbol = decodeString(symHex);
          const name = decodeString(nameHex);
          let decimals = null;
          try {
            const h = String(decHex || "").replace(/^0x/, "");
            if (h) decimals = parseInt(h, 16);
          } catch (_) {}

          if (name || symbol || decimals != null) {
            return { name, symbol, decimals };
          }
        }
      } catch (_) {}
    }

    const rpc = Array.isArray(net?.rpc) && net.rpc.length ? net.rpc[0] : getFallbackRpc(net?.chainId);
    if (!rpc) return {};
    const bodies = [
      { jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: String(address), data: "0x95d89b41" }, "latest"] }, // symbol()
      { jsonrpc: "2.0", id: 2, method: "eth_call", params: [{ to: String(address), data: "0x313ce567" }, "latest"] }, // decimals()
      { jsonrpc: "2.0", id: 3, method: "eth_call", params: [{ to: String(address), data: "0x06fdde03" }, "latest"] }, // name()
    ];
    const resp = await fetch(rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bodies),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (!Array.isArray(resp)) return {};
    const symHex = (resp.find((x) => x && x.id === 1) || {}).result || null;
    const decHex = (resp.find((x) => x && x.id === 2) || {}).result || null;
    const symbol = decodeString(symHex) || null;
    const nameHex = (resp.find((x) => x && x.id === 3) || {}).result || null;
    const name = decodeString(nameHex) || null;
    let decimals = null;
    try {
      const h = String(decHex || "").replace(/^0x/, "");
      decimals = h ? parseInt(h, 16) : null;
    } catch (_) {}
    if (name || symbol || decimals != null) {
      const badge = document.getElementById("metaValidatedBadge");
      if (badge) badge.classList.remove("d-none");
    }
    return { name, symbol, decimals };
  } catch (_) {
    return {};
  }
}

function unusedRenderAutocomplete(list) {
  // Compatível com o comportamento do rpc-logic.js
  const box = document.getElementById(ids.networkAutocomplete);
  if (!box) return;
  if (!list || list.length === 0) {
    box.classList.add("d-none");
    box.innerHTML = "";
    return;
  }
  box.innerHTML = list
    .map(
      (network) => `
    <div class="autocomplete-item" data-chainid="${network.chainId}">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${network.name}</strong>
          <small class="d-block text-muted">Chain ID: ${network.chainId}</small>
        </div>
        <span class="badge bg-dark-elevated text-tokencafe">${network.nativeCurrency?.symbol || "N/A"}</span>
      </div>
    </div>
  `,
    )
    .join("");
  // Adicionar listeners de clique por item
  box.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("click", () => {
      const id = parseInt(item.dataset.chainid, 10);
      const net = networkManager.getNetworkById(id);
      if (net) selectNetwork(net);
    });
  });
  box.classList.remove("d-none");
}

function selectNetwork(network) {
  selectedNetwork = network;
  const input = document.getElementById(ids.networkSearch);
  if (input) {
    input.value = `${network.name} (${network.chainId})`;
    input.dataset.chainId = String(network.chainId);
  }
  const box = document.getElementById(ids.networkAutocomplete);
  if (box) box.classList.add("d-none");
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
  // Ao exibir a seção de token, certificar que a seção de link gerado permaneça oculta
  const genSection = document.getElementById("generate-section");
  if (genSection) genSection.classList.add("d-none");
}

function buildLink() {
  const address = String(document.getElementById(ids.tokenAddress)?.value || "").replace(/\s+$/u, "");
  const name = String(document.getElementById(ids.tokenName)?.value || "").replace(/\s+$/u, "");
  const symbol = String(document.getElementById(ids.tokenSymbol)?.value || "").replace(/\s+$/u, "");
  const decimals = String(document.getElementById(ids.tokenDecimals)?.value || "").replace(/\s+$/u, "");
  const image = String(document.getElementById(ids.tokenImage)?.value || "").replace(/\s+$/u, "");
  if (!address || !selectedNetwork) return "";
  const params = new URLSearchParams({
    address,
    chainId: String(selectedNetwork.chainId),
    name: name || "",
    symbol: symbol || "",
    decimals: decimals || "18",
    image: image || "",
    rpc: selectedNetwork.rpc?.[0] || "",
    explorer: selectedNetwork.explorers?.[0]?.url || "",
  });
  const sharePath = "/pages/modules/link/link-token.html";
  return `${location.origin}${sharePath}?${params.toString()}`;
}

function updateGeneratedLink() {
  const url = buildLink();

  // Atualizar input visível na seção estática
  setValue(ids.generatedLink, url);

  // Remove is-invalid from symbol if filled
  const sEl = document.getElementById(ids.tokenSymbol);
  if (sEl && sEl.value && sEl.value !== "TKN") {
    sEl.classList.remove("is-invalid");
  }

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

  const sym = document.getElementById(ids.tokenSymbol)?.value;
  const dec = document.getElementById(ids.tokenDecimals)?.value;
  const manualData = sym && dec && sym !== "TKN";

  if (url && (tokenFetched || manualData)) {
    // systemResponse.show removido conforme solicitação do usuário
    // Apenas mantém a seção de link gerado visível na tela
    clearError();
  } else {
    systemResponse.hide();
    const addr = String(document.getElementById(ids.tokenAddress)?.value || "").replace(/\s+$/u, "");
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

// Escutar evento de limpeza global
document.addEventListener("contract:clear", () => {
  tokenFetched = false;
  // selectedNetwork = null; // Manter a rede selecionada para nova busca
  // hide("token-section"); // Manter seção visível para nova busca
  hide("generate-section");
  clearError();
  setReadonlyMode(false); // Reset readonly state

  // Reset inputs
  const idsToReset = [ids.tokenAddress, ids.tokenName, ids.tokenSymbol, ids.tokenDecimals, ids.tokenImage, ids.generatedLink];
  idsToReset.forEach((id) => setValue(id, ""));

  // Reset badges
  const badge = document.getElementById("metaValidatedBadge");
  if (badge) badge.classList.add("d-none");

  window.showFormSuccess && window.showFormSuccess("Dados limpos com sucesso!");
});

// Escutar evento de contrato encontrado para feedback e travar botão
document.addEventListener("contract:found", (e) => {
  if (e.detail && e.detail.contract) {
    tokenFetched = true;
    setReadonlyMode(true);

    // Gerar link automaticamente
    updateGeneratedLink();
  }
});

// Escutar evento de contrato verificado
document.addEventListener("contract:verified", () => {
  // Apenas log ou ações que não envolvam o botão de busca
});

function copyLink() {
  const val = document.getElementById(ids.generatedLink)?.value;
  if (!val) return;
  if (window.copyToClipboard) {
    window.copyToClipboard(val);
  } else {
    navigator.clipboard.writeText(val).then(() => window.notify && window.notify("Link copiado", "success"));
  }
}

function shareLink() {
  let url = document.getElementById(ids.generatedLink)?.value;
  if (!url) {
    url = buildLink();
    if (url) setValue(ids.generatedLink, url);
  }
  if (!url) {
    window.notify && window.notify("Nenhum link gerado. Informe rede e token.", "warning");
    return;
  }
  (async () => {
    const ua = String(navigator.userAgent || "");
    const isMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(ua);
    const secure = typeof window !== "undefined" && (window.isSecureContext || location.protocol === "https:" || location.hostname === "localhost");
    const canWebShare = secure && typeof navigator.share === "function" && (typeof navigator.canShare !== "function" || navigator.canShare({ url }));
    if (canWebShare && isMobile) {
      try {
        await navigator.share({ title: "TokenCafe Link", url });
        window.notify && window.notify("Link compartilhado com sucesso", "success");
        return;
      } catch (e) {
        if (e && e.name === "AbortError") {
          window.notify && window.notify("Compartilhamento cancelado", "info");
          return;
        }
      }
    }
    openShareMenu(url);
  })();
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
    const wBtn = modalEl.querySelector("#tcShareWhatsApp");
    const tBtn = modalEl.querySelector("#tcShareTelegram");
    const eBtn = modalEl.querySelector("#tcShareEmail");
    const cBtn = modalEl.querySelector("#tcShareCopy");
    if (wBtn)
      wBtn.addEventListener("click", () => {
        const u = modalEl.dataset.url || "";
        try {
          window.open(`https://wa.me/?text=${encodeURIComponent(u)}`, "_blank");
        } catch (_) {}
      });
    if (tBtn)
      tBtn.addEventListener("click", () => {
        const u = modalEl.dataset.url || "";
        try {
          window.open(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=TokenCafe%20Link`, "_blank");
        } catch (_) {}
      });
    if (eBtn)
      eBtn.addEventListener("click", () => {
        const u = modalEl.dataset.url || "";
        try {
          window.open(`mailto:?subject=TokenCafe%20Link&body=${encodeURIComponent(u)}`, "_self");
        } catch (_) {}
      });
    if (cBtn)
      cBtn.addEventListener("click", async () => {
        const u = modalEl.dataset.url || "";
        if (window.copyToClipboard) {
          window.copyToClipboard(u);
        } else {
          // Fallback manual se não houver função global
          let copied = false;
          try {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
              await navigator.clipboard.writeText(u);
              copied = true;
            }
          } catch (_) {}
          if (!copied) {
            try {
              const ta = document.createElement("textarea");
              ta.value = u;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand("copy");
              ta.remove();
              copied = true;
            } catch (_) {}
          }
          window.notify && window.notify(copied ? "Link copiado" : "Falha ao copiar", copied ? "success" : "warning");
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

function unusedPreviewLink() {
  const url = document.getElementById(ids.generatedLink)?.value;
  if (url) window.open(url, "_blank");
}

async function addTokenToMetaMask() {
  try {
    const address = String(document.getElementById(ids.tokenAddress)?.value || "").replace(/\s+$/u, "");
    let symbol = String(document.getElementById(ids.tokenSymbol)?.value || "").replace(/\s+$/u, "");
    let decimals = parseInt(String(document.getElementById(ids.tokenDecimals)?.value || "").replace(/\s+$/u, "") || "", 10);
    const image = String(document.getElementById(ids.tokenImage)?.value || "").replace(/\s+$/u, "");
    if (!isValidAddress(address)) {
      window.notify && window.notify("Endereço inválido", "error");
      return;
    }
    if (!window.ethereum) {
      window.notify && window.notify("Carteira não detectada", "warning");
      return;
    }
    const net =
      selectedNetwork ||
      (() => {
        try {
          const chainIdFromInput = document.getElementById(ids.networkSearch)?.dataset?.chainId;
          if (chainIdFromInput) return networkManager.getNetworkById(chainIdFromInput);
          const chainIdFromUrl = new URLSearchParams(location.search).get("chainId");
          if (chainIdFromUrl) return networkManager.getNetworkById(chainIdFromUrl);
          return null;
        } catch (_) {
          return null;
        }
      })();
    if (!symbol || symbol === "TKN" || !Number.isFinite(decimals)) {
      const meta = await readTokenMetaFromRpc(address, net);
      if (meta.symbol) symbol = meta.symbol;
      if (meta.decimals != null) decimals = meta.decimals;

      if (!symbol || symbol === "TKN") {
        window.notify && window.notify("Símbolo do token não identificado. Por favor, preencha o campo Símbolo manualmente.", "warning");
        const sEl = document.getElementById(ids.tokenSymbol);
        if (sEl) {
          sEl.focus();
          sEl.classList.add("is-invalid");
        }
        return;
      }

      const sEl = document.getElementById(ids.tokenSymbol);
      const dEl = document.getElementById(ids.tokenDecimals);
      if (sEl && (!sEl.value || sEl.value === "TKN")) sEl.value = symbol || "";
      if (dEl && (!dEl.value || !Number.isFinite(parseInt(dEl.value, 10)))) dEl.value = Number.isFinite(decimals) ? String(decimals) : "";
      try {
        updateGeneratedLink();
      } catch (_) {}
      const badge = document.getElementById("metaValidatedBadge");
      if (badge && (symbol || Number.isFinite(decimals))) badge.classList.remove("d-none");
    }
    symbol = (symbol || "TKN").slice(0, 32);
    decimals = Number.isFinite(decimals) ? decimals : 18;
    if (net && net.chainId) {
      try {
        const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
        const targetHex = "0x" + Number(net.chainId).toString(16);
        if (!currentHex || String(parseInt(currentHex, 16)) !== String(net.chainId)) {
          try {
            await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
          } catch (switchErr) {
            if (switchErr && (switchErr.code === 4902 || /unrecognized|unknown/i.test(String(switchErr.message || "")))) {
              const rpcUrls = Array.isArray(net.rpc) && net.rpc.length ? net.rpc : [getFallbackRpc(net.chainId)].filter(Boolean);
              const explorerUrl = net.explorers?.[0]?.url || getFallbackExplorer(net.chainId);
              const addParams = {
                chainId: targetHex,
                chainName: net.name || `Chain ${net.chainId}`,
                nativeCurrency: {
                  name: net.nativeCurrency?.name || "Unknown",
                  symbol: net.nativeCurrency?.symbol || "TKN",
                  decimals: net.nativeCurrency?.decimals || 18,
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
      } catch (e) {
        window.notify && window.notify(`Falha ao ajustar rede: ${e.message || e}`, "error");
        return;
      }
    }
    try {
      await window.ethereum.request({ method: "wallet_watchAsset", params: { type: "ERC20", options: { address, symbol, decimals, image } } });
    } catch (err) {
      const meta = await readTokenMetaFromRpc(address, net);
      const sym2 = (meta.symbol || symbol || "TKN").slice(0, 32);
      const dec2 = Number.isFinite(meta.decimals) ? meta.decimals : decimals;
      await window.ethereum.request({ method: "wallet_watchAsset", params: { type: "ERC20", options: { address, symbol: sym2, decimals: dec2, image } } });
    }
    window.notify && window.notify("Token enviado para a carteira", "success");
  } catch (e) {
    window.notify && window.notify(`Erro ao adicionar token: ${e.message}`, "error");
  }
}

async function addNetworkToWallet() {
  try {
    const chainIdFromInput = document.getElementById(ids.networkSearch)?.dataset?.chainId;
    const urlParams = new URLSearchParams(location.search);
    const chainIdParam = urlParams.get("chainId");
    const chainIdRaw = chainIdFromInput || chainIdParam || (selectedNetwork ? selectedNetwork.chainId : null);
    if (!chainIdRaw) {
      window.notify && window.notify("Selecione uma rede primeiro", "warning");
      return;
    }
    const net = selectedNetwork || networkManager.getNetworkById(chainIdRaw);
    if (!net) {
      window.notify && window.notify("Rede não encontrada", "error");
      return;
    }
    const rpcUrls = Array.isArray(net.rpc) && net.rpc.length ? net.rpc : [getFallbackRpc(net.chainId)].filter(Boolean);
    const explorerUrl = net.explorers?.[0]?.url || getFallbackExplorer(net.chainId);
    const params = {
      chainId: "0x" + Number(net.chainId).toString(16),
      chainName: net.name || `Chain ${net.chainId}`,
      nativeCurrency: {
        name: net.nativeCurrency?.name || "Unknown",
        symbol: net.nativeCurrency?.symbol || "TKN",
        decimals: net.nativeCurrency?.decimals || 18,
      },
      rpcUrls,
      blockExplorerUrls: explorerUrl ? [explorerUrl] : [],
    };
    if (!window.ethereum) {
      window.notify && window.notify("Carteira não detectada", "warning");
      return;
    }
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [params] });
    window.notify && window.notify("Rede enviada para a carteira", "success");
  } catch (e) {
    window.notify && window.notify(`Erro ao adicionar rede: ${e.message}`, "error");
  }
}

function clearTokenOnly() {
  // Reiniciar tudo e voltar para a seleção de rede
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
  tokenFetched = false;
  selectedNetwork = null;
  hide("selected-network-info");
  show("network-section");
  hide("token-section");
  hide("generate-section");
  hide("add-network-section");
  hide("token-info");
  (function () {
    const loading = document.getElementById("tokenLoading");
    if (loading) loading.classList.add("d-none");
  })();
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
  // Não limpe textContent do anchor, pois remove o span interno (rpcUrlCode)
  // Apenas remova o href e zere o texto do span específico
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
  try {
    location.reload();
  } catch (_) {}
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await networkManager.init();
  } catch {}
  // initStatusMirror(); // Removido
  // Garantir que a seção de rede siga o padrão visual
  const netSection = document.getElementById("network-section");
  if (netSection) netSection.classList.remove("d-none");
  // Fluxo progressivo: esconder próximas seções até responder a anterior
  try {
    const tokenSection = document.getElementById("token-section");
    const genSection = document.getElementById("generate-section");
    if (!readonlyLinkMode) {
      if (tokenSection) tokenSection.classList.add("d-none");
      if (genSection) genSection.classList.add("d-none");
    }
  } catch {}
  // Integração com o componente de busca compartilhado
  // Comentário: O componente emite eventos padronizados que substituem a lógica local.
  // - network:selected { network }: quando usuário escolhe uma rede na lista
  // - network:clear: quando o campo é limpado (via botão X ou programaticamente)
  // - network:toggleInfo { visible }: quando o usuário alterna a visualização dos detalhes (botão I)
  document.addEventListener("network:selected", (ev) => {
    const net = ev?.detail?.network;
    if (net) selectNetwork(net);
    try {
      const cont = document.querySelector(".contract-search-component");
      if (cont && net?.chainId) cont.setAttribute("data-chainid", String(net.chainId));
    } catch {}
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
  // Consumir os dados via componente compartilhado (evento contract:found)
  document.addEventListener("contract:found", (ev) => {
    try {
      if (readonlyLinkMode) return;
      clearError();
      const p = ev?.detail?.contract || {};
      if (p?.chainId) {
        const net = networkManager.getNetworkById(p.chainId);
        if (net) selectNetwork(net);
      }
      if (p?.contractAddress) setValue(ids.tokenAddress, p.contractAddress);
      if (p?.tokenName) setValue(ids.tokenName, p.tokenName);
      if (p?.tokenSymbol) setValue(ids.tokenSymbol, p.tokenSymbol);
      if (p?.tokenDecimals != null) setValue(ids.tokenDecimals, String(p.tokenDecimals));
      (async () => {
        const addr = p?.contractAddress || String(document.getElementById(ids.tokenAddress)?.value || "").replace(/\s+$/u, "");
        const symEl = document.getElementById(ids.tokenSymbol);
        const decEl = document.getElementById(ids.tokenDecimals);
        const nameEl = document.getElementById(ids.tokenName);
        const needsMeta = !symEl?.value || symEl.value === "TKN" || !Number.isFinite(parseInt(decEl?.value || "", 10));
        if (isValidAddress(addr) && needsMeta && selectedNetwork) {
          const meta = await readTokenMetaFromRpc(addr, selectedNetwork);
          if (meta.symbol && symEl && (!symEl.value || symEl.value === "TKN")) symEl.value = meta.symbol;
          if (meta.decimals != null && decEl && (!decEl.value || !Number.isFinite(parseInt(decEl.value, 10)))) decEl.value = String(meta.decimals);
          if (meta.name && nameEl && (!nameEl.value || !String(nameEl.value).replace(/\s+$/u, ""))) nameEl.value = meta.name;
          if (meta.name || meta.symbol || meta.decimals != null) tokenFetched = true;
          try {
            updateGeneratedLink();
            // renderTokenView() removido
          } catch (_) {}
          const badge = document.getElementById("metaValidatedBadge");
          if (badge && (meta.symbol || meta.decimals != null)) badge.classList.remove("d-none");
        }
      })();
      const hasData = !!(p?.tokenName || p?.tokenSymbol || p?.tokenDecimals != null);
      tokenFetched = hasData;
      const loading = document.getElementById("tokenLoading");
      if (loading) loading.classList.add("d-none");
      const ts = document.getElementById("token-section");
      if (hasData) {
        updateGeneratedLink();
        const genSection = document.getElementById("generate-section");
        if (genSection) genSection.classList.remove("d-none");

        // Lock UI and update button after populating data
        setReadonlyMode(true);
        const btnSearch = document.getElementById(ids.btnTokenSearch);
        if (btnSearch) {
          btnSearch.disabled = true;
          btnSearch.innerHTML = '<i class="bi bi-check-circle"></i>';
        }
      } else {
        if (ts) ts.classList.remove("d-none");
        try {
          window.notify && window.notify("Não foi possível ler dados ERC-20 do contrato. Preencha manualmente.", "warning");
        } catch (_) {}
      }
    } catch (_) {}
  });
  // Listener secundário removido (consolidado acima)
  document.getElementById(ids.btnCopyLink)?.addEventListener("click", copyLink);
  // Botão "Compartilhar link"
  document.getElementById(ids.btnShareLink)?.addEventListener("click", shareLink);
  // Botão "Adicionar à MetaMask" (quando presente neste layout)
  document.getElementById(ids.btnClearAll)?.addEventListener("click", clearAll);
  // Pré-visualizar/abrir link gerado (se o botão existir neste layout)
  document.getElementById(ids.btnOpenLink)?.addEventListener("click", unusedPreviewLink);
  // Pequenos: WhatsApp/Telegram/Email
  document.getElementById(ids.btnShareWhatsAppSmall)?.addEventListener("click", shareWhatsAppSmall);
  document.getElementById(ids.btnShareTelegramSmall)?.addEventListener("click", shareTelegramSmall);
  document.getElementById(ids.btnShareEmailSmall)?.addEventListener("click", shareEmailSmall);
  document.getElementById(ids.addToWalletButton)?.addEventListener("click", addTokenToMetaMask);
  document.getElementById(ids.btnAddNetwork)?.addEventListener("click", addNetworkToWallet);
  document.getElementById(ids.btnClearAll)?.addEventListener("click", clearAll);
  document.getElementById(ids.btnClearToken)?.addEventListener("click", clearTokenOnly);
  document.getElementById("btnAddNetworkSmall")?.addEventListener("click", addNetworkToWallet);
  document.getElementById("btnAddToMetaMaskSmall")?.addEventListener("click", addTokenToMetaMask);

  // Atualizar link em tempo real
  document.getElementById(ids.tokenAddress)?.addEventListener("input", () => {
    const el = document.getElementById(ids.tokenAddress);
    const v = String(el?.value || "").replace(/\s+$/u, "");
    const ok = isValidAddress(v);
    if (el) {
      el.classList.toggle("is-invalid", !!v && !ok);
      el.classList.toggle("is-valid", !!v && ok);
    }
    updateGeneratedLink();
  });
  document.getElementById(ids.tokenName)?.addEventListener("input", updateGeneratedLink);
  document.getElementById(ids.tokenSymbol)?.addEventListener("input", updateGeneratedLink);
  document.getElementById(ids.tokenDecimals)?.addEventListener("input", () => {
    const el = document.getElementById(ids.tokenDecimals);
    const v = parseInt(el?.value || "", 10);
    const ok = Number.isFinite(v) && v >= 0 && v <= 36;
    if (el) {
      el.classList.toggle("is-invalid", !ok);
      el.classList.toggle("is-valid", ok);
    }
    updateGeneratedLink();
  });
  document.getElementById(ids.tokenImage)?.addEventListener("input", updateGeneratedLink);

  // Ações de verificação: abrir páginas de verificação com rede e endereço
  // Seção de verificação removida desta página

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
      readonlyLinkMode = true;
      setValue(ids.tokenAddress, addr);
      if (name) setValue(ids.tokenName, name);
      if (sym) setValue(ids.tokenSymbol, sym);
      if (dec) setValue(ids.tokenDecimals, String(dec));
      if (img) setValue(ids.tokenImage, img);
      show("token-info");
      tokenFetched = true;
      updateGeneratedLink();
      const ns = document.getElementById(ids.networkSearch);
      if (ns) {
        ns.readOnly = true;
        ns.classList.add("form-control-plaintext");
      }
      [ids.tokenAddress, ids.tokenName, ids.tokenSymbol, ids.tokenDecimals, ids.tokenImage].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.readOnly = true;
          el.classList.add("form-control-plaintext");
        }
      });
      if (document.getElementById(ids.btnTokenSearch)) document.getElementById(ids.btnTokenSearch).classList.add("d-none");
    }
  } catch {}
});

// Funções de verificação removidas nesta página
function ensureGeneratedLink() {
  let url = document.getElementById(ids.generatedLink)?.value;
  if (!url) {
    url = buildLink();
    if (url) setValue(ids.generatedLink, url);
  }
  return url || "";
}

function shareWhatsAppSmall() {
  const u = ensureGeneratedLink();
  if (!u) {
    window.notify && window.notify("Nenhum link gerado. Informe rede e token.", "warning");
    return;
  }
  try {
    window.open(`https://wa.me/?text=${encodeURIComponent(u)}`, "_blank");
  } catch (_) {}
}

function shareTelegramSmall() {
  const u = ensureGeneratedLink();
  if (!u) {
    window.notify && window.notify("Nenhum link gerado. Informe rede e token.", "warning");
    return;
  }
  try {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=TokenCafe%20Link`, "_blank");
  } catch (_) {}
}

function shareEmailSmall() {
  const u = ensureGeneratedLink();
  if (!u) {
    window.notify && window.notify("Nenhum link gerado. Informe rede e token.", "warning");
    return;
  }
  try {
    window.open(`mailto:?subject=TokenCafe%20Link&body=${encodeURIComponent(u)}`, "_self");
  } catch (_) {}
}
// renderTokenView removido conforme solicitação
function unusedRenderTokenViewStub() {
  // Stub
}
