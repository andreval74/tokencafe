// Componente Unificado de Busca de Rede Blockchain
// Inicializa instâncias do componente inseridas via data-component,
// aciona buscas via networkManager e emite eventos globais. Lista só aparece ao digitar.

import { networkManager } from "./network-manager.js";

function initContainer(container) {
  if (!container || container.getAttribute("data-ns-initialized") === "true") return;

  const input = container.querySelector("#networkSearch");
  const list = container.querySelector("#networkAutocomplete");
  const infoBtn = container.querySelector("#nsInfoBtn");
  // Padronização: remover botão limpar do componente; comportamento de limpar ocorre ao apagar o input
  if (!input || !list) return;

  const placeholder = container.getAttribute("data-ns-placeholder") || "Buscar por nome, chainId ou símbolo";
  const minChars = parseInt(container.getAttribute("data-ns-min-chars") || "1", 10);
  const showPopular = String(container.getAttribute("data-ns-show-popular") || "false") === "true";
  const showOnSelect = String(container.getAttribute("data-ns-show-details-on-select") || "false") === "true";

  input.setAttribute("placeholder", placeholder);
  try {
    console.debug("NetworkSearch: inicializando container", {
      showPopular,
      showOnSelect,
      minChars,
      placeholder,
    });
  } catch {}

  let debounceTimer;
  const debounce = (fn, delay = 250) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  };

  let selectedNetwork = null;
  let infoVisible = false;
  const detailsCard = container.querySelector("#selected-network-info");
  const nameEl = container.querySelector("#networkNameCode");
  const idEl = container.querySelector("#chainIdCode");
  const currencyNameEl = container.querySelector("#nativeCurrencyNameCode");
  const currencySymbolEl = container.querySelector("#nativeCurrencySymbolCode");
  const rpcCodeEl = container.querySelector("#rpcUrlCode");
  const rpcAnchorEl = container.querySelector("#rpcUrlText");
  const explorerCodeEl = container.querySelector("#explorerUrlCode");
  const explorerAnchorEl = container.querySelector("#explorerUrlText");
  const badgeName = container.querySelector("#nsBadgeName");
  const badgeSymbol = container.querySelector("#nsBadgeSymbol");
  const badgeChainId = container.querySelector("#nsBadgeChainId");
  const badgeAccount = container.querySelector("#nsBadgeAccount");
  const apiFixBtn = container.querySelector("#apiFixBtn");
  const inputGroupEl = container.querySelector(".input-group");
  const inputEl = container.querySelector("#networkSearch");
  const networkStatusEl = container.querySelector("#networkStatus");

  async function handleCopyAccount() {
    try {
      const status = window.walletConnector?.getStatus?.() || {};
      const full = status.account || (badgeAccount && badgeAccount.dataset ? badgeAccount.dataset.full : "") || "";
      const addr = String(full || (badgeAccount ? badgeAccount.textContent : "")).trim();
      if (!addr || addr === "-") {
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(addr);
      } else {
        const ta = document.createElement("textarea");
        ta.value = addr;
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
        } catch (_) {}
        ta.remove();
      }
      try {
        const target = (badgeAccount && badgeAccount.parentElement) || badgeAccount;
        const iconEl = target ? target.querySelector("i") : null;
        const prevClass = iconEl ? iconEl.className : null;
        if (iconEl) {
          iconEl.className = "bi bi-check2 me-1";
          setTimeout(() => {
            if (prevClass) iconEl.className = prevClass;
          }, 2000);
        }
      } catch (_) {}
    } catch (_) {}
  }

  try {
    const target = (badgeAccount && badgeAccount.parentElement) || badgeAccount;
    if (target) {
      target.addEventListener("click", handleCopyAccount);
    }
  } catch (_) {}

  function updateDetailsCard(net) {
    if (!detailsCard) return;
    if (nameEl) nameEl.textContent = net?.name || "";
    if (idEl) idEl.textContent = net?.chainId !== undefined ? String(net.chainId) : "";
    if (currencyNameEl) currencyNameEl.textContent = net?.nativeCurrency?.name || "";
    if (currencySymbolEl) currencySymbolEl.textContent = net?.nativeCurrency?.symbol || "";
    if (badgeName) badgeName.textContent = net?.name || "-";
    if (badgeSymbol) badgeSymbol.textContent = net?.nativeCurrency?.symbol || "-";
    if (badgeChainId) badgeChainId.textContent = net?.chainId !== undefined ? String(net.chainId) : "-";
    const rpc = Array.isArray(net?.rpc) && net.rpc.length ? net.rpc[0] : typeof net?.rpc === "string" ? net.rpc : "";
    const explorer = net?.explorers && net.explorers.length ? net.explorers[0].url || net.explorers[0] : "";
    if (rpcCodeEl) rpcCodeEl.textContent = rpc || "";
    if (rpcAnchorEl) rpcAnchorEl.href = rpc ? rpc : "#";
    if (explorerCodeEl) explorerCodeEl.textContent = explorer || "";
    if (explorerAnchorEl) explorerAnchorEl.href = explorer ? explorer : "#";
  }

  async function updateFromWallet() {
    try {
      const status = window.walletConnector?.getStatus?.() || {};
      let chainHex = status.chainId || null;
      let account = status.account || null;
      if (!chainHex && window.ethereum && typeof window.ethereum.request === "function") {
        try {
          chainHex = await window.ethereum.request({ method: "eth_chainId" });
        } catch (_) {}
      }
      if (!account && window.ethereum && typeof window.ethereum.request === "function") {
        try {
          const accs = await window.ethereum.request({ method: "eth_accounts" });
          account = Array.isArray(accs) && accs[0] ? accs[0] : null;
        } catch (_) {}
      }
      const chainDec = chainHex && String(chainHex).startsWith("0x") ? parseInt(chainHex, 16) : chainHex ? parseInt(chainHex, 10) : null;
      const unusedNet = chainDec ? networkManager?.getNetworkById?.(chainDec) : null;
      // Não alterar seleção nem badges de rede com estado da carteira; apenas atualizar conta
      if (badgeAccount) {
        const formatted = window.walletConnector?.formatAddress?.(account) || account || "-";
        badgeAccount.textContent = account ? formatted : "-";
        try {
          if (badgeAccount.dataset) badgeAccount.dataset.full = account || "";
          badgeAccount.title = account || "";
        } catch (_) {}
      }
    } catch (_) {}
  }

  try {
    if (apiFixBtn) {
      apiFixBtn.addEventListener("click", (e) => {
        try {
          e.preventDefault();
          const prod = "https://tokencafe-api.onrender.com";
          window.localStorage && window.localStorage.setItem("api_base", prod);
          window.location.reload();
        } catch (_) {}
      });
    }
  } catch (_) {}

  function applyPrefilledBehavior() {
    try {
      const hasPrefilledChain = false;
      if (hasPrefilledChain && inputGroupEl) inputGroupEl.classList.add("d-none");
    } catch (_) {}
  }
  applyPrefilledBehavior();
  container.addEventListener("network:prefilled", () => {
    applyPrefilledBehavior();
  });
  function applyMemoryPrefill() {
    try {
      const sp0 = new URLSearchParams(window.location.search || "");
      const fromTools = (sp0.get("source") || "").toLowerCase() === "tools";
      if (fromTools) return;
      let rawCid = null;
      try {
        const sp = new URLSearchParams(window.location.search || "");
        rawCid = sp.get("chainId") || sp.get("cid") || null;
      } catch (_) {}
      // Não selecionar automaticamente nem disparar eventos; usuário deve escolher manualmente
      if (!rawCid) return;
      applyPrefilledBehavior();
    } catch (_) {}
  }
  applyMemoryPrefill();
  updateFromWallet();

  function hideList() {
    list.classList.add("d-none");
    list.style.display = "none";
  }
  function showList() {
    list.classList.remove("d-none");
    list.style.display = "block";
  }

  function renderResults(networks = []) {
    list.innerHTML = "";
    if (!networks.length) {
      hideList();
      return;
    }
    list.innerHTML = networks
      .map(
        (net) => `
      <div class="autocomplete-item list-group-item list-group-item-action" data-chainid="${net.chainId}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${net.name}</strong>
            <small class="d-block text-muted">Chain ID: ${net.chainId}</small>
          </div>
          <span class="badge bg-dark-elevated text-tokencafe">${net.nativeCurrency?.symbol || "N/A"}</span>
        </div>
      </div>
    `,
      )
      .join("");
    // Listeners de seleção
    list.querySelectorAll(".autocomplete-item").forEach((item) => {
      item.addEventListener("click", () => {
        const id = parseInt(item.getAttribute("data-chainid"), 10);
        const net = networkManager?.getNetworkById?.(id);
        if (net) {
          selectedNetwork = net;
          const evt = new CustomEvent("network:selected", {
            detail: { network: net, source: "user" },
            bubbles: true,
          });
          container.dispatchEvent(evt);
          try {
            window.__selectedNetwork = net;
          } catch (_) {}
          input.value = net.name;
          input.dataset.chainId = String(net.chainId);
          try {
            window.sessionStorage && window.sessionStorage.setItem("tokencafe_last_chain_id", String(net.chainId));
          } catch (_) {}
          try {
            window.localStorage && window.localStorage.setItem("tokencafe_last_chain_id", String(net.chainId));
          } catch (_) {}
          try {
            const testnet = networkManager?.isTestnet ? networkManager.isTestnet(net) : /test|sepolia|goerli|rinkeby|kovan|mumbai/i.test(String(net.name || ""));
            const badgeWraps = [badgeName?.parentElement, badgeSymbol?.parentElement, badgeChainId?.parentElement].filter(Boolean);
            badgeWraps.forEach((w) => {
              w.classList.remove("bg-dark-elevated", "bg-success", "bg-warning");
              w.classList.add(testnet ? "bg-warning" : "bg-success");
            });
          } catch (_) {}
          // atualizar detalhes sem abrir automaticamente
          updateDetailsCard(net);
          hideList();
          const setSwitching = (active) => {
            if (networkStatusEl) networkStatusEl.classList.toggle("d-none", !active);
            input.disabled = !!active;
            if (infoBtn) infoBtn.disabled = !!active;
          };
          const switchToChain = async (chainId) => {
            try {
              setSwitching(true);
              const status = window.walletConnector?.getStatus?.() || {};
              const connected = !!status.account && !!status.sessionAuthorized;
              if (window.walletConnector && typeof window.walletConnector.switchNetwork === "function" && connected) {
                await window.walletConnector.switchNetwork(chainId);
              } else if (window.ethereum && typeof window.ethereum.request === "function") {
                const hex = typeof chainId === "string" && chainId.startsWith("0x") ? chainId : "0x" + Number(chainId).toString(16);
                try {
                  await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
                } catch (err) {
                  if (err && err.code === 4902) {
                    const nd = networkManager?.getNetworkById?.(typeof chainId === "string" && chainId.startsWith("0x") ? parseInt(chainId, 16) : chainId);
                    if (nd && window.walletConnector && typeof window.walletConnector.addNetwork === "function") {
                      await window.walletConnector.addNetwork(nd);
                      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hex }] });
                    }
                  } else {
                    throw err;
                  }
                }
              }
            } catch (_) {
            } finally {
              setSwitching(false);
              updateFromWallet();
              const evtRes = new CustomEvent("network:switchResult", { detail: { chainId }, bubbles: true });
              container.dispatchEvent(evtRes);
            }
          };
          switchToChain(net.chainId);
          // se configurado, exibir detalhes imediatamente
          if (showOnSelect) {
            infoVisible = true;
            const evt2 = new CustomEvent("network:toggleInfo", {
              detail: { visible: true, network: net },
              bubbles: true,
            });
            container.dispatchEvent(evt2);
            if (detailsCard) detailsCard.classList.remove("d-none");
          }
        }
      });
    });
    showList();
  }

  // Buscar ao digitar
  input.addEventListener("input", () => {
    const query = (input.value || "").trim();
    if (!query) {
      if (showPopular) {
        try {
          const popular = networkManager?.getPopularNetworks?.(10) || [];
          renderResults(popular);
        } catch (_) {
          list.innerHTML = "";
          hideList();
        }
      } else {
        list.innerHTML = "";
        hideList();
      }
      selectedNetwork = null;
      delete input.dataset.chainId;
      const evt = new CustomEvent("network:clear", { bubbles: true });
      container.dispatchEvent(evt);
      return;
    }
    if (query.length < minChars) return;

    debounce(async () => {
      try {
        const evt = new CustomEvent("network:search", {
          detail: { query },
          bubbles: true,
        });
        container.dispatchEvent(evt);
        // Garantir que todas as redes estejam carregadas antes de buscar
        if (networkManager?.getAllNetworks) {
          await networkManager.getAllNetworks();
        }
        let results = [];
        if (query.length === 1 && networkManager?.getAllNetworks) {
          // Buscar todas e filtrar manualmente para suportar 1 caractere
          const all = await networkManager.getAllNetworks();
          const q = query.toLowerCase();
          const isDigit = /^\d$/.test(query);
          results = (all || [])
            .filter((net) => {
              const name = (net.name || "").toLowerCase();
              const shortName = (net.shortName || "").toLowerCase();
              const symbol = (net.nativeCurrency?.symbol || "").toLowerCase();
              if (isDigit) return String(net.chainId).startsWith(query);
              return name.includes(q) || shortName.includes(q) || symbol.includes(q);
            })
            .slice(0, 10);
        } else {
          results = await networkManager?.searchNetworks?.(query, 10);
        }
        renderResults(results || []);
      } catch (e) {
        console.debug("NetworkSearch: erro na busca", e);
        renderResults([]);
      }
    });
  });

  // Toggle de informações via botão I
  if (infoBtn) {
    infoBtn.addEventListener("click", async () => {
      try {
        // Determinar rede atual: selecionada, chainId no input, ou busca pelo texto
        let net = selectedNetwork;
        if (!net) {
          const chainIdRaw = input.dataset.chainId;
          if (chainIdRaw) net = networkManager?.getNetworkById?.(parseInt(chainIdRaw, 10));
        }
        if (!net) {
          const query = (input.value || "").trim();
          if (query) {
            if (networkManager?.getAllNetworks) await networkManager.getAllNetworks();
            const isDigits = /^\d+$/.test(query);
            if (isDigits) net = networkManager?.getNetworkById?.(parseInt(query, 10));
            if (!net && networkManager?.searchNetworks) {
              const results = await networkManager.searchNetworks(query, 1);
              net = results && results[0] ? results[0] : null;
            }
          }
        }
        infoVisible = !infoVisible;
        const evt = new CustomEvent("network:toggleInfo", {
          detail: { visible: infoVisible, network: net || null },
          bubbles: true,
        });
        container.dispatchEvent(evt);
        if (detailsCard) {
          if (net) updateDetailsCard(net);
          detailsCard.classList.toggle("d-none", !infoVisible);
        }
      } catch (e) {
        console.debug("NetworkSearch: erro ao alternar informações", e);
      }
    });
  }

  // Padrão de manutenção: sem botão "limpar" — limpar estado quando input fica vazio

  // Esconder ao perder foco (tempo curto para permitir clique)
  input.addEventListener("blur", () => {
    setTimeout(hideList, 200);
  });
  // Exibir redes populares ao focar, se configurado e input vazio
  input.addEventListener("focus", async () => {
    try {
      console.debug("NetworkSearch: focus recebido no input");
      const query = (input.value || "").trim();
      if (showPopular && !query) {
        if (networkManager?.getAllNetworks) {
          await networkManager.getAllNetworks();
        }
        const popular = networkManager?.getPopularNetworks?.(10) || [];
        renderResults(popular);
      }
    } catch (_) {}
  });
  // Não abrir lista ao focar — só ao digitar (comportamento original)

  container.setAttribute("data-ns-initialized", "true");
  try {
    console.debug("NetworkSearch: container marcado como data-ns-initialized=true");
  } catch {}

  try {
    const hasSelection = !!(inputEl && inputEl.dataset && inputEl.dataset.chainId);
    if (!hasSelection) {
      const evtReq = new CustomEvent("network:required", { detail: { reason: "init" }, bubbles: true });
      container.dispatchEvent(evtReq);
    }
  } catch (_) {}

  document.addEventListener("wallet:chainChanged", () => {
    updateFromWallet();
  });
  document.addEventListener("wallet:connected", () => {
    updateFromWallet();
  });
  document.addEventListener("wallet:accountChanged", () => {
    updateFromWallet();
  });
  document.addEventListener("wallet:disconnected", () => {
    updateFromWallet();
  });
  try {
    if (window.ethereum && typeof window.ethereum.on === "function") {
      window.ethereum.on("chainChanged", () => updateFromWallet());
      window.ethereum.on("accountsChanged", () => updateFromWallet());
    }
  } catch (_) {}
}

function findContainers() {
  const nodes = document.querySelectorAll('[data-component*="network-search.html"]');
  nodes.forEach(initContainer);
}

// Inicializar e observar novas injeções de componentes
findContainers();
const observer = new MutationObserver(() => {
  findContainers();
});
observer.observe(document.body, { childList: true, subtree: true });
