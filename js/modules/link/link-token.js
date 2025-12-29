import { NetworkManager } from "../../shared/network-manager.js";
import { SharedUtilities } from "../../core/shared_utilities_es6.js";

const networkManager = new NetworkManager();
const utils = new SharedUtilities();

let lastContractData = null;

function getFallbackRpc(chainId) {
  switch (Number(chainId)) {
    case 56:
      return "https://bsc-dataseed.binance.org";
    case 97:
      return "https://bsc-testnet.publicnode.com";
    case 1:
      return "https://eth.llamarpc.com";
    case 137:
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

function getFallbackNativeCurrency(chainId) {
  switch (Number(chainId)) {
    case 56:
      return { name: "BNB", symbol: "BNB", decimals: 18 };
    case 97:
      return { name: "BNB", symbol: "tBNB", decimals: 18 };
    case 1:
      return { name: "ETH", symbol: "ETH", decimals: 18 };
    case 137:
      return { name: "MATIC", symbol: "MATIC", decimals: 18 };
    default:
      return { name: "Unknown", symbol: "TKN", decimals: 18 };
  }
}

async function addToWallet() {
  try {
    if (!window.ethereum) {
      window.notify && window.notify("Carteira não detectada", "warning");
      return;
    }
    if (!lastContractData) {
      window.notify && window.notify("Dados do token não carregados", "error");
      return;
    }

    const { contractAddress: address, tokenSymbol, tokenDecimals, chainId, tokenName } = lastContractData;
    const image = ""; // TODO: support image param if available
    
    // Check wallet balance again or rely on last check?
    // User can click "Add" even if balance 0.
    
    // Switch chain logic
    const targetHex = "0x" + Number(chainId).toString(16);
    const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
    
    if (!currentHex || String(parseInt(currentHex, 16)) !== String(chainId)) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
      } catch (switchErr) {
        if (switchErr && (switchErr.code === 4902 || /unrecognized|unknown/i.test(String(switchErr.message || "")))) {
          // Add chain
          const net = networkManager.getNetworkById(chainId);
          const rpcUrls = Array.isArray(net?.rpc) && net.rpc.length ? net.rpc : [getFallbackRpc(chainId)].filter(Boolean);
          const explorerUrl = net?.explorers?.[0]?.url || getFallbackExplorer(chainId);
          const nc = net?.nativeCurrency || getFallbackNativeCurrency(chainId);
          
          const addParams = {
            chainId: targetHex,
            chainName: net?.name || getFallbackChainName(chainId) || `Chain ${chainId}`,
            nativeCurrency: {
              name: nc.name,
              symbol: nc.symbol,
              decimals: parseInt(String(nc.decimals), 10),
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

    // Watch Asset
    const symbol = (tokenSymbol || "TKN").slice(0, 11); // MetaMask often limits symbol length
    const decimals = tokenDecimals != null ? tokenDecimals : 18;

    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: {
        type: "ERC20",
        options: {
          address,
          symbol,
          decimals,
          image,
        },
      },
    });

    // Show System Response
    systemResponse.show({
        title: "Token Adicionado",
        subtitle: "O token foi enviado para sua carteira com sucesso.",
        icon: "bi-check-circle",
        content: address,
        badge: "Adicionado",
        actions: ['copy', 'open', 'clear'],
        onClear: () => {
             // Resetar botão local
             const addBtn = document.getElementById("addToWalletButton");
             if (addBtn) {
                addBtn.disabled = true;
                addBtn.innerHTML = '<i class="bi bi-wallet2 me-2"></i>Adicionar à Carteira';
                addBtn.classList.add("btn-outline-primary");
                addBtn.classList.remove("btn-success");
             }
        }
    });

    // Hide button temporarily or just let it stay disabled (handled by onClear or status update)
    // window.notify && window.notify("Token enviado para a carteira", "success");
  } catch (e) {
    window.notify && window.notify(`Erro ao adicionar token: ${e.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await networkManager.init();
  } catch {}

  // Set input to Read-Only if needed
  // User asked: "o campo onde fica o numero do contrato deve ficar no modo read para não ser alterado"
  // We apply this always for this specific page as requested
  const waitForInput = setInterval(() => {
      const input = document.getElementById("f_address") || document.getElementById("tokenAddress");
      if (input) {
          input.readOnly = true;
          // Also maybe hide the search button if it's auto-triggered? 
          // But user might want to re-trigger search if it failed?
          // If read-only, they can't change it.
          // If the input is empty, read-only makes it unusable unless populated by URL.
          // We should check if URL has params.
          const params = new URLSearchParams(location.search);
          if (!params.get("address")) {
              // If no address in URL, maybe we shouldn't lock it?
              // But user said "must be read mode". 
              // I'll assume this page is INTENDED for link sharing.
              // If empty, I'll show a notification or placeholder?
              // Or I'll just leave it read-only and let the user realize they need a link.
              // However, for testing, I might want to paste.
              // I'll stick to strict interpretation: "deve ficar no modo read".
          }
          clearInterval(waitForInput);
      }
  }, 100);

  const params = new URLSearchParams(location.search);
  const pAddress = params.get("address");
  const pChainId = params.get("chainId");

  // Setup button listener
  const addBtn = document.getElementById("addToWalletButton");
  if (addBtn) {
    addBtn.addEventListener("click", addToWallet);
  }

  // Listen for contract search results
  document.addEventListener("contract:found", (e) => {
    const data = e.detail?.contract;
    if (!data) return;
    lastContractData = data;

    // Logic to enable/disable button based on wallet status
    // The contract-search component already displays the status text.
    // We just need to handle the button.
    
    if (addBtn) {
      const bal = data.walletBalance;
      const isRegistered = bal && bal !== "0x" && bal !== "0" && bal !== 0n; // Simple check, refine if needed
      
      // Check bigInt
      let hasBalance = false;
      try {
        if (bal && BigInt(bal) > 0n) hasBalance = true;
      } catch (_) {}

      if (hasBalance) {
        addBtn.disabled = true;
        addBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Já Adicionado';
        addBtn.classList.remove("btn-outline-primary");
        addBtn.classList.add("btn-success");
      } else {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="bi bi-wallet2 me-2"></i>Adicionar à Carteira';
        addBtn.classList.add("btn-outline-primary");
        addBtn.classList.remove("btn-success");
      }
    }
  });

  document.addEventListener("contract:clear", () => {
    lastContractData = null;
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.innerHTML = '<i class="bi bi-wallet2 me-2"></i>Adicionar à Carteira';
      addBtn.classList.add("btn-outline-primary");
      addBtn.classList.remove("btn-success");
    }
  });

  // Wait for component to load and trigger search
  if (pAddress) {
    const waitForInput = setInterval(() => {
      const input = document.getElementById("f_address");
      const btn = document.getElementById("contractSearchBtn");
      const title = document.getElementById("cs_title");
      
      if (input && btn) {
        clearInterval(waitForInput);
        
        // Override component UI for "Link" mode
        if (title) title.innerText = "Adicionar Token";
        input.value = pAddress;
        input.readOnly = true;
        
        // Hide clear button if exists, as input is readonly
        const clearBtn = document.getElementById("csClearBtn");
        if (clearBtn) clearBtn.style.display = "none";
        
        // Trigger search
        // Give a small delay to ensure listeners are attached
        setTimeout(() => {
            btn.click();
        }, 100);
      }
    }, 100);
    
    // Safety timeout
    setTimeout(() => clearInterval(waitForInput), 10000);
  }
});
