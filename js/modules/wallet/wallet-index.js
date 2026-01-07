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
    const url = document.getElementById("explorerUrl")?.value;
    if (url) window.open(url, "_blank");
  });

  document.getElementById("viewAddressBtn")?.addEventListener("click", () => {
    const url = document.getElementById("explorerUrl")?.value;
    const addr = document.getElementById("walletAddress")?.value;
    if (url && addr) {
      // Handle trailing slash
      const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
      window.open(`${baseUrl}/address/${addr}`, "_blank");
    }
  });

  document.getElementById("shareAddressBtn")?.addEventListener("click", () => {
    const addr = document.getElementById("walletAddress")?.value;
    if (addr && navigator.share) {
      navigator.share({ title: "Minha Carteira", text: addr }).catch(() => {});
    } else if (addr) {
      if (window.copyToClipboard) {
        window.copyToClipboard(addr);
      }
    }
  });

  // Limpar Dados Button
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
    if (walletConnector) {
      const status = walletConnector.getStatus();
      updateUI(status);
    }
  });

  // Initial check
  setTimeout(async () => {
    if (walletConnector) {
      const status = walletConnector.getStatus();
      if (status.connected) {
        updateUI(status);
      } else {
        // Try to connect silently if possible or just wait
        // Wallet connector usually auto-connects if previously connected
      }
    }
  }, 500);
}

function setupCopyButton(btnId, inputId) {
  document.getElementById(btnId)?.addEventListener("click", () => {
    const val = document.getElementById(inputId)?.value;
    if (val && window.copyToClipboard) {
      window.copyToClipboard(val);
    }
  });
}

async function updateUI(data) {
  if (!data || !data.account) return;

  const section = document.getElementById("wallet-info-section");
  if (section) section.classList.remove("d-none");

  setValue("walletAddress", data.account);
  setValue("chainId", data.chainId);

  // Get Network Info
  let net = data.network;
  if (!net && data.chainId && networkManager) {
    net = networkManager.getNetworkById(data.chainId);
  }

  if (net) {
    setValue("networkName", net.name);
    setValue("nativeCurrency", net.nativeCurrency?.name);
    setValue("currencySymbol", net.nativeCurrency?.symbol);

    const rpc = Array.isArray(net.rpc) ? net.rpc[0] : net.rpc || "";
    setValue("rpcUrl", rpc);

    const explorer = Array.isArray(net.explorers) ? net.explorers[0]?.url || net.explorers[0] : "";
    setValue("explorerUrl", explorer);
  } else {
    setValue("networkName", "Desconhecida");
    setValue("rpcUrl", "");
    setValue("explorerUrl", "");
  }

  // Balance
  if (data.balance) {
    setValue("balance", `${data.balance} ${net?.nativeCurrency?.symbol || ""}`);
  } else if (walletConnector) {
    setValue("balance", "Carregando...");
    try {
      const bal = await walletConnector.getBalance(data.account);
      setValue("balance", `${bal} ${net?.nativeCurrency?.symbol || ""}`);
    } catch (e) {
      setValue("balance", "Erro");
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
  setValue("explorerUrl", "");
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || "";
}
