
document.addEventListener("DOMContentLoaded", function () {
  initAuthModal();
});

function initAuthModal() {
  // Elementos do modal
  const modal = document.getElementById("authModal");
  if (!modal) return; // Se o modal não estiver na página, abortar

  const walletOptions = document.querySelectorAll(".wallet-option");
  const networkOptions = document.querySelectorAll(".network-option");
  const cancelBtn = document.getElementById("cancel-connection");
  const backToWalletsBtn = document.getElementById("back-to-wallets");
  const backToSelectionBtn = document.getElementById("back-to-selection");

  // Event listeners
  walletOptions.forEach((option) => {
    option.addEventListener("click", handleWalletSelection);
  });

  networkOptions.forEach((option) => {
    option.addEventListener("click", handleNetworkSelection);
  });

  cancelBtn?.addEventListener("click", () => showStep("wallet-selection"));
  backToWalletsBtn?.addEventListener("click", () => showStep("wallet-selection"));
  backToSelectionBtn?.addEventListener("click", () => showStep("wallet-selection"));

  // Verificar se já está conectado
  checkExistingConnection();
}

async function handleWalletSelection(e) {
  const walletType = e.currentTarget.dataset.wallet;

  showStep("wallet-connecting");
  updateConnectingMessage(`Conectando com ${getWalletName(walletType)}...`);

  try {
    let connected = false;

    // Preferir conexão nativa quando o usuário escolhe explicitamente
    if (walletType === "metamask") {
      connected = await connectMetaMask();
    } else if (walletType === "trust") {
      connected = await connectTrustWallet();
    } else if (window.walletIntegration) {
      // Tentar integração, se disponível, para outros provedores
      const result = await window.walletIntegration.connect(walletType);
      connected = result?.success || result === true;
    } else {
      // Fallback para método legado
      connected = await connectWallet(walletType);
    }

    if (connected) {
      // Obter dados atuais de conta e rede
      let chainId, account;
      if (window.ethereum) {
        chainId = await window.ethereum.request({ method: "eth_chainId" });
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        account = accounts?.[0];
      } else if (window.walletIntegration) {
        account = window.walletIntegration.getCurrentAccount();
        chainId = await window.walletIntegration.getChainId();
      }

      const supportedChains = ["0x1", "0x38", "0x89", "0xa4b1"];
      // Permitir redirecionamento mesmo quando chainId estiver ausente ou não mapeado
      if (!chainId || supportedChains.includes(chainId)) {
        await handleConnectionSuccess(account, chainId);
      } else {
        showStep("network-selection");
      }
    }
  } catch (error) {
    handleConnectionError(error);
  }
}

async function handleNetworkSelection(e) {
  const chainId = e.currentTarget.dataset.chainId;

  showStep("wallet-connecting");
  updateConnectingMessage("Alterando rede...");

  try {
    await switchNetwork(chainId);
    await handleConnectionSuccess();
  } catch (error) {
    handleConnectionError(error);
  }
}

async function connectWallet(walletType) {
  switch (walletType) {
    case "metamask":
      return await connectMetaMask();
    case "trust":
      return await connectTrustWallet();
    case "walletconnect":
      return await connectWalletConnect();
    case "coinbase":
      return await connectCoinbase();
    default:
      throw new Error("Wallet não suportado");
  }
}

async function connectMetaMask() {
  if (!window.ethereum) {
    throw new Error("MetaMask não encontrado. Por favor, instale a extensão.");
  }

  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });

  return accounts.length > 0;
}

async function connectTrustWallet() {
  if (!window.ethereum || !window.ethereum.isTrust) {
    throw new Error("Trust Wallet não encontrada. Verifique se está instalada.");
  }
  const accounts = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  return accounts.length > 0;
}

async function connectWalletConnect() {
  // Implementar WalletConnect
  throw new Error("WalletConnect em desenvolvimento");
}

async function connectCoinbase() {
  // Implementar Coinbase Wallet
  throw new Error("Coinbase Wallet em desenvolvimento");
}

async function switchNetwork(chainId) {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId }],
    });
  } catch (switchError) {
    // Se a rede não estiver configurada, adicionar
    if (switchError.code === 4902) {
      await addNetwork(chainId);
    } else {
      throw switchError;
    }
  }
}

async function addNetwork(chainId) {
  const networks = {
    "0x38": {
      chainId: "0x38",
      chainName: "BNB Smart Chain",
      nativeCurrency: {
        name: "BNB",
        symbol: "BNB",
        decimals: 18,
      },
      rpcUrls: ["https://bsc-dataseed.binance.org/"],
      blockExplorerUrls: ["https://bscscan.com/"],
    },
    "0x89": {
      chainId: "0x89",
      chainName: "Polygon",
      nativeCurrency: {
        name: "MATIC",
        symbol: "MATIC",
        decimals: 18,
      },
      rpcUrls: ["https://polygon-rpc.com/"],
      blockExplorerUrls: ["https://polygonscan.com/"],
    },
    "0xa4b1": {
      chainId: "0xa4b1",
      chainName: "Arbitrum One",
      nativeCurrency: {
        name: "ETH",
        symbol: "ETH",
        decimals: 18,
      },
      rpcUrls: ["https://arb1.arbitrum.io/rpc"],
      blockExplorerUrls: ["https://arbiscan.io/"],
    },
  };

  await window.ethereum.request({
    method: "wallet_addEthereumChain",
    params: [networks[chainId]],
  });
}

async function handleConnectionSuccess(account, chainId) {
  // Update UI with connection information
  if (account && chainId) {
    const addrEl = document.querySelector("#connected-address span");
    const netEl = document.querySelector("#connected-network span");
    if (addrEl) addrEl.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
    if (netEl) netEl.textContent = getNetworkName(chainId);
  }

  showStep("connection-success");

  // Notify other components about successful connection
  if (typeof window.EventBus !== "undefined" && typeof window.EventBus.emit === "function") {
    window.EventBus.emit("wallet:connected", { address: account, chainId });
  }
  // Emitir também como CustomEvent para integração unificada
  document.dispatchEvent(new CustomEvent("wallet:connected", { detail: { account, chainId } }));

  // Sincronizar estado com WalletConnector unificado, quando disponível
  try {
    if (window.walletConnector) {
      // Detectar tipo de carteira pelo provider
      const walletType = window.ethereum?.isTrust ? "trust" : window.ethereum?.isMetaMask ? "metamask" : "metamask";
      await window.walletConnector.connect(walletType);
    }
  } catch (e) {
    console.warn("Falha ao sincronizar WalletConnector:", e.message);
  }

  // Emit global wallet events for compatibility
  if (window.walletIntegration) {
    // The integration system will handle event emission
    console.log("✅ Wallet connected via Web3-Onboard integration");
  }

  // Fechar modal e redirecionar para Tools
  setTimeout(() => {
    const modalEl = document.getElementById("authModal");
    if (typeof bootstrap !== 'undefined') {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      modalInstance?.hide();
    }
    
    // Redirecionar diretamente como fallback, além dos listeners do PageManager
    try {
      const currentPath = window.location.pathname;
      const target = currentPath.includes("/pages/") ? "tools.html" : "pages/tools.html";
      setTimeout(() => {
        window.location.href = target;
      }, 400);
    } catch (e) {
      console.warn("Falha ao redirecionar após conexão:", e.message);
    }
  }, 800);
}

function handleConnectionError(error) {
  console.error("Erro na conexão:", error);

  let errorMessage = "Erro desconhecido";

  if (error.code === 4001) {
    errorMessage = "Conexão rejeitada pelo usuário";
  } else if (error.code === -32002) {
    errorMessage = "Solicitação pendente. Verifique sua carteira.";
  } else if (error.message) {
    errorMessage = error.message;
  }

  const errEl = document.getElementById("error-message");
  if (errEl) errEl.textContent = errorMessage;
  showStep("connection-error");
}

function showStep(stepId) {
  // Ocultar todos os steps
  document.querySelectorAll(".auth-step").forEach((step) => {
    step.classList.add("d-none");
  });

  // Mostrar step específico
  document.getElementById(stepId)?.classList.remove("d-none");
}

function updateConnectingMessage(message) {
  const msgEl = document.getElementById("connecting-message");
  if (msgEl) msgEl.textContent = message;
}

function getWalletName(walletType) {
  const names = {
    metamask: "MetaMask",
    trust: "Trust Wallet",
    walletconnect: "WalletConnect",
    coinbase: "Coinbase Wallet",
  };
  return names[walletType] || walletType;
}

function getNetworkName(chainId) {
  const networks = {
    "0x1": "Ethereum",
    "0x38": "BSC",
    "0x89": "Polygon",
    "0xa4b1": "Arbitrum",
  };
  return networks[chainId] || "Desconhecida";
}

async function checkExistingConnection() {
  // Check Web3-Onboard integration first
  if (window.walletIntegration && window.walletIntegration.isConnected()) {
    const account = window.walletIntegration.getCurrentAccount();
    const chainId = await window.walletIntegration.getChainId();

    if (account && chainId) {
      // Already connected via Web3-Onboard, emit event
      if (typeof window.EventBus !== "undefined") {
        window.EventBus.emit("wallet:connected", {
          address: account,
          chainId: chainId,
        });
      }
      return;
    }
  }

  // Fallback to legacy ethereum provider check
  if (window.ethereum && window.ethereum.selectedAddress) {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });

    // If already connected, close modal or show success
    if (typeof window.EventBus !== "undefined") {
      window.EventBus.emit("wallet:connected", {
        address: window.ethereum.selectedAddress,
        chainId: chainId,
      });
    }
  }
}

// Expor funções globais
window.authModal = {
  show: () => {
    const el = document.getElementById("authModal");
    if (typeof bootstrap !== 'undefined') {
      const modal = new bootstrap.Modal(el);
      modal.show();
    }
  },
  hide: () => {
    const el = document.getElementById("authModal");
    if (typeof bootstrap !== 'undefined') {
      const modal = bootstrap.Modal.getInstance(el);
      modal?.hide();
    }
  },
};
