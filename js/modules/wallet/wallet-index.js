import { walletConnector } from "../../shared/wallet-connector.js";
import { networkManager } from "../../shared/network-manager.js";

document.addEventListener("DOMContentLoaded", () => {
  initWalletManager();
});

function initWalletManager() {
  setupCopyButton("copyAddressBtn", "walletAddress");
  setupCopyButton("copyChainIdBtn", "chainId");
  setupCopyButton("copyRpcBtn", "rpcUrl");

  document.getElementById("openExplorerBtn")?.addEventListener("click", () => {
    const url = getTextValue("explorerUrlDisplay");
    if (url && url !== "-") window.open(url, "_blank");
  });

  document.getElementById("viewAddressBtn")?.addEventListener("click", () => {
    const url = getTextValue("explorerUrlDisplay");
    const addr = getTextValue("walletAddress");
    if (url && addr && url !== "-" && addr !== "-") {
      // Handle trailing slash
      const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
      window.open(`${baseUrl}/address/${addr}`, "_blank");
    }
  });

  document.getElementById("shareAddressBtn")?.addEventListener("click", () => {
    const addr = getTextValue("walletAddress");
    if (addr && addr !== "-" && navigator.share) {
      navigator.share({ title: "Minha Carteira", text: addr }).catch(() => {});
    } else if (addr && addr !== "-") {
      if (window.copyToClipboard) {
        window.copyToClipboard(addr);
      }
    }
  });

  // Limpar Dados Button (agora Home)
  const btnClear = document.getElementById("btnClearAll") || document.getElementById("btn-clear-data");
  btnClear?.addEventListener("click", async () => {
    if (walletConnector && typeof walletConnector.disconnect === "function") {
      await walletConnector.disconnect();
    }

    // Usa utilitário global se disponível, senão usa implementação local
    if (window.clearForm) {
      window.clearForm("wallet-info-section");
    }

    clearUI();
    if (window.showFormSuccess) window.showFormSuccess("Dados da carteira limpos com sucesso.");
  });

  // Listen for wallet events
  document.addEventListener("wallet:connected", (e) => updateUI(e.detail));
  document.addEventListener("wallet:disconnected", clearUI);
  document.addEventListener("wallet:chainChanged", async () => {
    // Refresh data
    const wc = walletConnector || window.walletConnector;
    if (wc) {
      const status = wc.getStatus();
      updateUI(status);
    }
  });

  // Initial check
  setTimeout(async () => {
    const wc = walletConnector || window.walletConnector;
    
    // Force check wallet status immediately
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                // Se já tem contas conectadas no provider, força atualização
                if (wc) {
                    // Força atualização do estado interno do conector
                    await wc.updateNetworkInfo();
                    await wc.updateBalance();
                    
                    const status = wc.getStatus();
                    
                    // Fallback se o conector não tiver atualizado
                    if (!status.account) status.account = accounts[0];
                    if (!status.chainId && window.ethereum) {
                        try {
                            status.chainId = await window.ethereum.request({ method: 'eth_chainId' });
                        } catch (e) { console.error(e); }
                    }
                    
                    updateUI(status);
                }
            }
        } catch (e) {
            console.error("Error checking initial status:", e);
        }
    } else if (wc) {
      const status = wc.getStatus();
      if (status.connected) {
        updateUI(status);
      }
    }
  }, 500);
}

async function updateUI(data) {
  if (!data || !data.account) return;

  const section = document.getElementById("wallet-info-section");
  if (section) section.classList.remove("d-none");

  setValue("walletAddress", data.account);
  
  // Format Chain ID
  let chainIdDisplay = data.chainId;
  if (data.chainId && String(data.chainId).startsWith("0x")) {
      chainIdDisplay = parseInt(data.chainId, 16);
  }
  setValue("chainId", chainIdDisplay);

  // Get Network Info
  let net = data.network;
  const netMgr = networkManager || window.networkManager;

  // Se não veio no data, tenta buscar no manager
  if (!net && data.chainId && netMgr) {
    net = netMgr.getNetworkById(data.chainId);
  }

  // Fallback visual se rede desconhecida
  if (net) {
    setValue("networkName", net.name);
    setValue("nativeCurrency", net.nativeCurrency?.name || "Unknown");
    setValue("currencySymbol", net.nativeCurrency?.symbol || "ETH");

    const rpc = Array.isArray(net.rpc) ? net.rpc[0] : net.rpc || "";
    setValue("rpcUrl", rpc);

    const explorer = Array.isArray(net.explorers) ? net.explorers[0]?.url || net.explorers[0] : "";
    setValue("explorerUrlDisplay", explorer);
    
    // Custom RPCs (se houver mais de um)
    if (Array.isArray(net.rpc) && net.rpc.length > 1) {
        const others = net.rpc.slice(1).join("\n");
        setValue("customRpcs", others);
    } else {
        setValue("customRpcs", "Nenhum RPC personalizado configurado");
    }
    
    const explorerLink = document.getElementById("explorerLink");
    if (explorerLink) {
        if (explorer) {
            explorerLink.href = explorer;
            explorerLink.classList.remove("d-none");
        } else {
            explorerLink.href = "#";
            explorerLink.classList.add("d-none");
        }
    }
  } else {
    setValue("networkName", "Desconhecida");
    setValue("nativeCurrency", "-");
    setValue("currencySymbol", "-");
    setValue("rpcUrl", "-");
    setValue("explorerUrlDisplay", "-");
    setValue("customRpcs", "Nenhum RPC personalizado configurado");
  }

  // Balance
  const wc = walletConnector || window.walletConnector;
  // let symbol = net?.nativeCurrency?.symbol || "ETH"; // Não precisamos concatenar símbolo no input de saldo

  if (data.balance) {
    setValue("balance", data.balance);
  } else if (wc) {
    setValue("balance", "Carregando...");
    try {
      if (!wc.balance || wc.balance === "0") {
          await wc.updateBalance();
      }
      setValue("balance", wc.balance);
    } catch (e) {
      setValue("balance", "0.0000");
    }
  }
}

function clearUI() {
  const section = document.getElementById("wallet-info-section");
  if (section) section.classList.add("d-none");

  setValue("walletAddress", "");
  setValue("chainId", "");
  setValue("networkName", "");
  setValue("nativeCurrency", "");
  setValue("currencySymbol", "");
  setValue("balance", "");
  setValue("rpcUrl", "");
  setValue("explorerUrlDisplay", "");
  setValue("customRpcs", "Nenhum RPC personalizado configurado");
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) {
    // console.log(`Setting ${id} to ${val}`); // Debug
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      el.value = val || "";
    } else {
      el.textContent = val || "-";
      // Força atualização visual em alguns navegadores se necessário
      el.style.display = 'none';
      el.offsetHeight; // trigger reflow
      el.style.display = '';
    }
  } else {
      // console.warn(`Element not found: ${id}`);
  }
}

function setupCopyButton(btnId, targetId) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener("click", () => {
            const val = getTextValue(targetId);
            if (val && val !== "-") {
                if (window.copyToClipboard) {
                    window.copyToClipboard(val);
                } else {
                    navigator.clipboard.writeText(val);
                }
            }
        });
    }
}

function getTextValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        return el.value;
    }
    return el.textContent;
}
