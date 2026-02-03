import { NetworkManager } from "../../shared/network-manager.js";
import { SystemResponse } from "../../shared/system-response.js";
import { getFallbackRpc, getFallbackExplorer, getFallbackChainName, getFallbackNativeCurrency } from "../../shared/network-fallback.js";
import { initContainer } from "../../shared/contract-search.js";

const networkManager = new NetworkManager();
const systemResponse = new SystemResponse();

let lastContractData = null;

async function switchNetwork() {
  if (!lastContractData || !lastContractData.chainId) {
    window.notify && window.notify("Rede de destino desconhecida", "error");
    return;
  }

  try {
    await networkManager.ensureNetwork(lastContractData.chainId);
    // UI update handled by chainChanged or checkNetwork
    checkNetwork();
  } catch (e) {
    console.error(e);
    window.notify && window.notify(`Erro ao trocar rede: ${e.message}`, "error");
  }
}

async function checkNetwork() {
  const switchBtn = document.getElementById("btnSwitchNetwork");
  const addBtn = document.getElementById("addToWalletButton");

  if (!lastContractData || !window.ethereum) {
    if (switchBtn) switchBtn.classList.add("d-none");
    if (addBtn) addBtn.disabled = true;
    return;
  }

  const { chainId } = lastContractData;
  const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);

  if (!currentHex || String(parseInt(currentHex, 16)) !== String(chainId)) {
    // Rede incorreta
    if (switchBtn) {
        switchBtn.classList.remove("d-none");
        switchBtn.onclick = switchNetwork; // Garantir listener
    }
    if (addBtn) {
        addBtn.disabled = true;
        addBtn.title = "Troque a rede primeiro";
    }
  } else {
    // Rede correta
    if (switchBtn) switchBtn.classList.add("d-none");
    if (addBtn) {
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="bi bi-wallet2 me-2"></i>Adicionar Token';
        addBtn.classList.remove("btn-success", "btn-outline-primary");
        addBtn.classList.add("btn-outline-warning");
        addBtn.title = "";
    }
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

    let { contractAddress: address, tokenSymbol, tokenDecimals, chainId } = lastContractData || {};
    
    // Fallback: tentar recuperar dados dos parâmetros da URL ou elementos da página se lastContractData estiver incompleto
    const params = new URLSearchParams(location.search);
    if (!address || !chainId) {
        address = address || params.get("address");
        chainId = chainId || params.get("chainId");
    }
    
    if (!address || !chainId) {
         window.notify && window.notify("Dados do token incompletos (endereço ou rede)", "error");
         return;
    }
    
    const image = params.get("image") || "";

    // Verificação final de rede
    const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
    if (!currentHex || String(parseInt(currentHex, 16)) !== String(chainId)) {
        window.notify && window.notify("Por favor, troque para a rede correta antes de adicionar o token.", "warning");
        checkNetwork(); // Atualiza UI para mostrar botão de troca
        return;
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
      onClear: () => {
        // Resetar botão local
        checkNetwork(); // Revalida estado
      },
    });

  } catch (e) {
    window.notify && window.notify(`Erro ao adicionar token: ${e.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await networkManager.init();
  } catch {}

  // Set input to Read-Only
  const waitForInput = setInterval(() => {
    const input = document.getElementById("f_address") || document.getElementById("tokenAddress");
    if (input) {
      input.readOnly = true;
      clearInterval(waitForInput);
    }
  }, 100);

  const params = new URLSearchParams(location.search);
  const pAddress = params.get("address");
  const pChainId = params.get("chainId");

  // Auto-trigger search if params exist
  if (pAddress && pChainId) {
      let attempts = 0;
      const maxAttempts = 50; // 10 seconds (50 * 200ms)

      const waitComponents = setInterval(() => {
          attempts++;
          const searchBtn = document.getElementById("contractSearchBtn");
          const addrInput = document.getElementById("f_address") || document.getElementById("tokenAddress");
          const container = document.querySelector('[data-component*="contract-search.html"]');
          
          // Ensure component is initialized if loaded
          if (container && container.children.length > 0 && container.getAttribute("data-cs-initialized") !== "true") {
              initContainer(container);
          }
          
          // Check initialization status
          // Note: data-cs-initialized is set by contract-search.js after loading
          const isInitialized = container && container.getAttribute("data-cs-initialized") === "true";
          
          if (searchBtn && addrInput && isInitialized) {
              clearInterval(waitComponents);
              
              // Pre-fill input
              addrInput.value = pAddress;
              
              // Ensure chainId is available for the search component if needed
              // The search component tries to find chainId from URL params too, 
              // but we can also set it explicitly if needed.
              // For now, relying on URL params which contract-search.js parses.
              
              console.log("Auto-triggering search for linked token...");
              searchBtn.click();
          } else if (attempts >= maxAttempts) {
              clearInterval(waitComponents);
              console.warn("Timeout waiting for contract-search component initialization.");
              if (window.notify) window.notify("Erro ao carregar componente de busca. Tente recarregar.", "error");
          }
      }, 200);
  }

  // Setup button listeners
  const addBtn = document.getElementById("addToWalletButton");
  if (addBtn) {
    addBtn.addEventListener("click", addToWallet);
  }
  
  const switchBtn = document.getElementById("btnSwitchNetwork");
  if (switchBtn) {
    switchBtn.addEventListener("click", switchNetwork);
  }
  
  const clearBtn = document.getElementById("btnClearAll");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
       // Clear URL params to reset state
       if (location.search) {
           const url = new URL(location.href);
           url.search = "";
           window.location.href = url.toString();
       }
    });
  }

  // Listen for contract search results
  document.addEventListener("contract:found", (e) => {
    const data = e.detail?.contract;
    if (!data) return;
    lastContractData = data;
    
    // Check network immediately
    checkNetwork();
  });

  document.addEventListener("contract:clear", () => {
    lastContractData = null;
    const addBtn = document.getElementById("addToWalletButton");
    const switchBtn = document.getElementById("btnSwitchNetwork");
    
    if (switchBtn) switchBtn.classList.add("d-none");
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.innerHTML = '<i class="bi bi-wallet2 me-2"></i>Adicionar Token';
      addBtn.classList.add("btn-outline-warning");
      addBtn.classList.remove("btn-success", "btn-outline-primary");
    }
  });
  
  // Monitor chain changes
  if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
          // Recarregar página é comum, mas aqui tentaremos apenas atualizar UI
          checkNetwork();
      });
  }
});
