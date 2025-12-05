// Link Generator - TokenCafe (limpo e funcional)
// Responsável por buscar rede, ler token e gerar link compartilhável

import { NetworkManager } from "../../shared/network-manager.js";

const networkManager = new NetworkManager();

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
  btnCopyLink: "btnCopyLink",
  btnShareLink: "btnShareLink",
  btnPreviewLink: "btnPreviewLink",
  btnAddToMetaMask: "btnAddToMetaMask",
  addToWalletButton: "addToWalletButton",
  btnAddNetwork: "btnAddNetwork",
  btnOpenLink: "btnOpenLink",
  btnClearAll: "btnClearAll",
  generatedLink: "generatedLink",
  btnShareWhatsAppSmall: "btnShareWhatsAppSmall",
  btnShareTelegramSmall: "btnShareTelegramSmall",
  btnShareEmailSmall: "btnShareEmailSmall",
};

let selectedNetwork = null;
let tokenFetched = false;
let readonlyLinkMode = false;

function toast(msg, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(msg, type);
    return;
  }
  try {
    alert(msg);
  } catch (_) {
    console.log(`[${type}] ${msg}`);
  }
}

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

function isValidAddress(addr) {
  return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// Fallbacks mínimos para redes populares quando rpcs.json não fornece URLs
function getFallbackRpc(chainId) {
  switch (Number(chainId)) {
    case 56: // BNB Smart Chain Mainnet
      return "https://bsc-dataseed.binance.org";
    case 97: // BNB Smart Chain Testnet
      return "https://bsc-testnet.publicnode.com";
    case 1: // Ethereum Mainnet
      return "https://eth.llamarpc.com";
    case 137: // Polygon Mainnet
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
  const address = document.getElementById(ids.tokenAddress)?.value.trim();
  const name = document.getElementById(ids.tokenName)?.value.trim();
  const symbol = document.getElementById(ids.tokenSymbol)?.value.trim();
  const decimals = document.getElementById(ids.tokenDecimals)?.value.trim();
  const image = document.getElementById(ids.tokenImage)?.value.trim();
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
  setValue(ids.generatedLink, url);
  if (url && tokenFetched) show("generate-section");
  if (tokenFetched) renderTokenView();
}

function copyLink() {
  const val = document.getElementById(ids.generatedLink)?.value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => toast("Link copiado", "success"));
}

function shareLink() {
  let url = document.getElementById(ids.generatedLink)?.value;
  if (!url) {
    url = buildLink();
    if (url) setValue(ids.generatedLink, url);
  }
  if (!url) {
    toast("Nenhum link gerado. Informe rede e token.", "warning");
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
        toast("Link compartilhado com sucesso", "success");
        return;
      } catch (e) {
        if (e && e.name === "AbortError") {
          toast("Compartilhamento cancelado", "info");
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
        toast(copied ? "Link copiado" : "Falha ao copiar", copied ? "success" : "warning");
      });
  }
  modalEl.dataset.url = url;
  try {
    const modal = new bootstrap.Modal(modalEl, { backdrop: true, keyboard: true });
    modal.show();
  } catch (_) {
    toast("Compartilhamento indisponível", "warning");
  }
}

function unusedPreviewLink() {
  const url = document.getElementById(ids.generatedLink)?.value;
  if (url) window.open(url, "_blank");
}

function openGeneratedLink() {
  // Abrir explorer com o endereço do contrato na rede selecionada
  const address = document.getElementById(ids.tokenAddress)?.value?.trim();
  if (!selectedNetwork || !isValidAddress(address)) {
    toast("Para ver o contrato, selecione a rede e informe um endereço válido.", "warning");
    return;
  }
  const base = selectedNetwork.explorers?.[0]?.url || getFallbackExplorer(selectedNetwork.chainId);
  if (!base) {
    toast("Explorer indisponível para esta rede.", "error");
    return;
  }
  const url = `${base.replace(/\/$/, "")}/address/${address}`;
  window.open(url, "_blank");
}

async function addTokenToMetaMask() {
  try {
    const address = document.getElementById(ids.tokenAddress)?.value.trim();
    const symbol = document.getElementById(ids.tokenSymbol)?.value.trim() || "TKN";
    const decimals = parseInt(document.getElementById(ids.tokenDecimals)?.value.trim() || "18", 10);
    const image = document.getElementById(ids.tokenImage)?.value.trim() || "";
    if (!isValidAddress(address)) {
      toast("Endereço inválido", "error");
      return;
    }
    if (!window.ethereum) {
      toast("Carteira não detectada", "warning");
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
        toast(`Falha ao ajustar rede: ${e.message || e}`, "error");
        return;
      }
    }
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: { address, symbol, decimals, image },
      },
    });
    toast("Token enviado para a carteira", "success");
  } catch (e) {
    toast(`Erro ao adicionar token: ${e.message}`, "error");
  }
}

async function addNetworkToWallet() {
  try {
    const chainIdFromInput = document.getElementById(ids.networkSearch)?.dataset?.chainId;
    const urlParams = new URLSearchParams(location.search);
    const chainIdParam = urlParams.get("chainId");
    const chainIdRaw = chainIdFromInput || chainIdParam || (selectedNetwork ? selectedNetwork.chainId : null);
    if (!chainIdRaw) {
      toast("Selecione uma rede primeiro", "warning");
      return;
    }
    const net = selectedNetwork || networkManager.getNetworkById(chainIdRaw);
    if (!net) {
      toast("Rede não encontrada", "error");
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
      toast("Carteira não detectada", "warning");
      return;
    }
    await window.ethereum.request({ method: "wallet_addEthereumChain", params: [params] });
    toast("Rede enviada para a carteira", "success");
  } catch (e) {
    toast(`Erro ao adicionar rede: ${e.message}`, "error");
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
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await networkManager.init();
  } catch {}
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
      const p = ev?.detail?.contract || {};
      if (p?.chainId) {
        const net = networkManager.getNetworkById(p.chainId);
        if (net) selectNetwork(net);
      }
      if (p?.contractAddress) setValue(ids.tokenAddress, p.contractAddress);
      if (p?.tokenName) setValue(ids.tokenName, p.tokenName);
      if (p?.tokenSymbol) setValue(ids.tokenSymbol, p.tokenSymbol);
      if (p?.tokenDecimals != null) setValue(ids.tokenDecimals, String(p.tokenDecimals));
      const hasData = !!(p?.tokenName || p?.tokenSymbol || p?.tokenDecimals != null);
      tokenFetched = hasData;
      const loading = document.getElementById("tokenLoading");
      if (loading) loading.classList.add("d-none");
      const ts = document.getElementById("token-section");
      if (hasData) {
        updateGeneratedLink();
        const genSection = document.getElementById("generate-section");
        if (genSection) genSection.classList.remove("d-none");
      } else {
        if (ts) ts.classList.remove("d-none");
        try {
          toast("Não foi possível ler dados ERC-20 do contrato. Preencha manualmente.", "warning");
        } catch (_) {}
      }
    } catch (_) {}
  });
  document.getElementById(ids.btnCopyLink)?.addEventListener("click", copyLink);
  // Pequenos: copiar - adicionar à carteira - ver contrato
  document.getElementById(ids.btnShareLink)?.addEventListener("click", addTokenToMetaMask);
  document.getElementById(ids.btnOpenLink)?.addEventListener("click", openGeneratedLink);
  // Grande: compartilhar link
  document.getElementById(ids.btnAddToMetaMask)?.addEventListener("click", shareLink);
  // Pequenos: WhatsApp/Telegram/Email
  document.getElementById(ids.btnShareWhatsAppSmall)?.addEventListener("click", shareWhatsAppSmall);
  document.getElementById(ids.btnShareTelegramSmall)?.addEventListener("click", shareTelegramSmall);
  document.getElementById(ids.btnShareEmailSmall)?.addEventListener("click", shareEmailSmall);
  document.getElementById(ids.addToWalletButton)?.addEventListener("click", addTokenToMetaMask);
  document.getElementById(ids.btnAddNetwork)?.addEventListener("click", addNetworkToWallet);
  document.getElementById(ids.btnClearAll)?.addEventListener("click", clearAll);
  document.getElementById(ids.btnClearToken)?.addEventListener("click", clearTokenOnly);
  // Atualizar link em tempo real
  document.getElementById(ids.tokenAddress)?.addEventListener("input", () => {
    const el = document.getElementById(ids.tokenAddress);
    const v = el?.value?.trim() || "";
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
      [ids.btnTokenSearch, ids.btnCopyLink, ids.btnShareLink, ids.btnOpenLink, ids.btnAddToMetaMask, ids.btnShareWhatsAppSmall, ids.btnShareTelegramSmall, ids.btnShareEmailSmall, ids.btnClearAll, ids.btnClearToken, ids.addToWalletButton].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add("d-none");
          el.setAttribute("disabled", "disabled");
          el.classList.add("disabled");
        }
      });
      show("generate-section");
      const linkGroup = document.getElementById("generatedLinkGroup");
      if (linkGroup) linkGroup.classList.add("d-none");
      const genTitle = document.getElementById("generateSectionTitle");
      if (genTitle) genTitle.classList.add("d-none");
      const netSection = document.getElementById("network-section");
      if (netSection) netSection.classList.add("d-none");
      const tokenSection = document.getElementById("token-section");
      if (tokenSection) tokenSection.classList.add("d-none");
      const addTokBtn = document.getElementById(ids.addToWalletButton);
      if (addTokBtn) {
        addTokBtn.classList.remove("d-none", "disabled");
        addTokBtn.removeAttribute("disabled");
      }
      renderTokenView();
      const addNetBtn = document.getElementById(ids.btnAddNetwork);
      if (addNetBtn) {
        addNetBtn.classList.add("d-none");
        addNetBtn.setAttribute("disabled", "disabled");
        addNetBtn.classList.add("disabled");
      }
      if (!name || !sym || !dec) {
        try {
          const btn = document.getElementById("contractSearchBtn");
          if (btn) {
            btn.click();
          }
        } catch {}
      }
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
    toast("Nenhum link gerado. Informe rede e token.", "warning");
    return;
  }
  try {
    window.open(`https://wa.me/?text=${encodeURIComponent(u)}`, "_blank");
  } catch (_) {}
}

function shareTelegramSmall() {
  const u = ensureGeneratedLink();
  if (!u) {
    toast("Nenhum link gerado. Informe rede e token.", "warning");
    return;
  }
  try {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(u)}&text=TokenCafe%20Link`, "_blank");
  } catch (_) {}
}

function shareEmailSmall() {
  const u = ensureGeneratedLink();
  if (!u) {
    toast("Nenhum link gerado. Informe rede e token.", "warning");
    return;
  }
  try {
    window.open(`mailto:?subject=TokenCafe%20Link&body=${encodeURIComponent(u)}`, "_self");
  } catch (_) {}
}
function renderTokenView() {
  try {
    const address = document.getElementById(ids.tokenAddress)?.value?.trim() || "";
    const name = document.getElementById(ids.tokenName)?.value?.trim() || "";
    const symbol = document.getElementById(ids.tokenSymbol)?.value?.trim() || "";
    const decimals = document.getElementById(ids.tokenDecimals)?.value?.trim() || "";
    const urlParams = new URLSearchParams(location.search);
    const chainIdParam = urlParams.get("chainId");
    const explorerParam = urlParams.get("explorer");
    const explorer = selectedNetwork?.explorers?.[0]?.url || explorerParam || getFallbackExplorer(selectedNetwork?.chainId || chainIdParam);
    const tv = document.getElementById("tokenView");
    if (!tv) return;
    const chainName = selectedNetwork?.name || (chainIdParam ? networkManager.getNetworkById(chainIdParam)?.name || getFallbackChainName(chainIdParam) : "");
    const chainId = selectedNetwork?.chainId || chainIdParam || "";
    const addrEl = document.getElementById("viewAddress");
    const chainNameEl = document.getElementById("viewChainName");
    const chainIdEl = document.getElementById("viewChainId");
    const nameEl = document.getElementById("viewName");
    const symbolEl = document.getElementById("viewSymbol");
    const decEl = document.getElementById("viewDecimals");
    const expA = document.getElementById("viewExplorer");
    if (addrEl) addrEl.textContent = address;
    if (chainNameEl) chainNameEl.textContent = chainName;
    if (chainIdEl) chainIdEl.textContent = String(chainId || "");
    if (nameEl) nameEl.textContent = name;
    if (symbolEl) symbolEl.textContent = symbol;
    if (decEl) decEl.textContent = String(decimals || "");
    if (expA) {
      expA.href = explorer ? `${String(explorer).replace(/\/$/, "")}/address/${address}` : "#";
      expA.classList.toggle("disabled", !explorer || !isValidAddress(address));
    }
    tv.classList.remove("d-none");
  } catch {}
}
