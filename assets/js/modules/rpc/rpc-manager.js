/**
 * RPC Manager - Gerenciador de RPCs para TokenCafe
 * Permite buscar, adicionar e gerenciar RPCs de blockchains no MetaMask
 */

class RPCManager {
  constructor() {
    this.chains = [];
    this.selectedChain = null;
    this.isConnected = false;
    this.currentAccount = null;
    this.currentChainId = null;

    this.init();
  }

  async init() {
    console.log("🚀 Inicializando RPC Manager...");

    // Carregar catálogo de RPCs
    await this.loadRpcs();

    // Configurar event listeners
    this.setupEventListeners();

    // Configurar listeners do MetaMask
    this.setupMetaMaskListeners();

    console.log("✅ RPC Manager inicializado com sucesso");
  }

  async loadRpcs() {
    try {
      // Tenta backend primeiro, depois fallback para arquivo local
      // Preferir rpcs.json local como fonte primária; backend opcional
      const endpoints = ["/shared/data/rpcs.json"];
      try {
        if (typeof window !== "undefined" && window.RPC_BACKEND_ENABLED) {
          endpoints.push("/api/rpcs");
          endpoints.push(`${location.protocol}//${location.hostname}:3001/api/rpcs`);
        }
      } catch {}
      let data = null;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            data = await res.json();
            break;
          }
        } catch (e) {
          // tenta próximo endpoint
        }
      }
      const entries = Array.isArray(data?.rpcs) ? data.rpcs : Array.isArray(data) ? data : [];
      this.chains = entries;
      console.log(`📋 Carregadas ${entries.length} entradas de RPCs`);
    } catch (error) {
      console.error("❌ Erro ao carregar rpcs:", error);
      this.showError("Erro ao carregar catálogo de RPCs");
    }
  }

  setupEventListeners() {
    // Botão conectar carteira
    const connectBtn = document.getElementById("connect-wallet-btn");
    if (connectBtn) {
      connectBtn.addEventListener("click", () => this.connectWallet());
    }

    // Campo de busca
    const searchInput = document.getElementById("networkSearch");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value));
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.handleSearch(e.target.value);
        }
      });
      console.log("🔍 Event listeners configurados para networkSearch");
    } else {
      console.warn("⚠️ Campo networkSearch não encontrado");
    }

    // Botão limpar busca
    const clearBtn = document.getElementById("clear-search");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearSearch());
    }
  }

  setupMetaMaskListeners() {
    if (typeof window.ethereum !== "undefined") {
      // Listener para mudança de conta
      window.ethereum.on("accountsChanged", (accounts) => {
        console.log("👤 Contas alteradas:", accounts);
        if (accounts.length === 0) {
          this.handleDisconnect();
        } else {
          this.currentAccount = accounts[0];
          this.updateWalletStatus();
        }
      });

      // Listener para mudança de rede
      window.ethereum.on("chainChanged", (chainId) => {
        console.log("🔗 Rede alterada:", chainId);
        this.currentChainId = chainId;
        this.updateChainStatus();
      });
    }
  }

  async connectWallet() {
    if (typeof window.ethereum === "undefined") {
      this.showError("MetaMask não encontrado. Por favor, instale o MetaMask.");
      return;
    }

    try {
      console.log("🔗 Conectando ao MetaMask...");

      // Solicitar conexão
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length > 0) {
        this.currentAccount = accounts[0];
        this.isConnected = true;

        // Obter chain ID atual
        this.currentChainId = await window.ethereum.request({
          method: "eth_chainId",
        });

        console.log("✅ Conectado:", this.currentAccount);
        console.log("🔗 Chain ID atual:", this.currentChainId);

        this.updateWalletStatus();
        this.showSearchSection();
      }
    } catch (error) {
      console.error("❌ Erro ao conectar:", error);
      this.showError("Erro ao conectar com MetaMask: " + error.message);
    }
  }

  handleDisconnect() {
    this.isConnected = false;
    this.currentAccount = null;
    this.currentChainId = null;
    this.selectedChain = null;

    this.updateWalletStatus();
    this.hideSearchSection();
    this.hideChainDetailsSection();
  }

  updateWalletStatus() {
    const statusMessage = document.getElementById("wallet-status-message");
    const connectBtn = document.getElementById("connect-wallet-btn");

    // Verificar se os elementos existem antes de tentar modificá-los
    if (!statusMessage || !connectBtn) {
      console.warn("⚠️ Elementos da interface não encontrados. Aguardando carregamento...");
      // Tentar novamente após um pequeno delay
      setTimeout(() => this.updateWalletStatus(), 100);
      return;
    }

    if (this.isConnected && this.currentAccount) {
      const shortAddress = `${this.currentAccount.slice(0, 6)}...${this.currentAccount.slice(-4)}`;
      statusMessage.innerHTML = `
                <div class="alert alert-success mb-0">
                    <i class="bi bi-check-circle me-2"></i>
                    <strong>Conectado:</strong> ${shortAddress}
                </div>
            `;
      connectBtn.style.display = "none";
    } else {
      statusMessage.innerHTML = `
                <div class="alert alert-info mb-0">
                    <i class="bi bi-wallet2 me-2"></i>
                    Clique no botão abaixo para conectar sua carteira
                </div>
            `;
      connectBtn.style.display = "block";
    }
  }

  showSearchSection() {
    const section = document.getElementById("network-section");
    if (section) {
      section.classList.remove("hidden-section");
      console.log("📱 Seção de busca de rede exibida");
      // Focar no campo de busca
      setTimeout(() => {
        const searchInput = document.getElementById("networkSearch");
        if (searchInput) {
          searchInput.focus();
          console.log("🔍 Campo de busca focado");
        }
      }, 100);
    } else {
      console.warn("⚠️ Elemento network-section não encontrado");
    }
  }

  hideSearchSection() {
    const section = document.getElementById("search-section");
    if (section) {
      section.classList.add("hidden-section");
    }
  }

  showChainDetailsSection() {
    const section = document.getElementById("chain-details-section");
    if (section) {
      section.classList.remove("hidden-section");
    }
  }

  hideChainDetailsSection() {
    const section = document.getElementById("chain-details-section");
    if (section) {
      section.classList.add("hidden-section");
    }
  }

  handleSearch(query) {
    if (!query || String(query).replace(/\s+$/u, "").length < 2) {
      this.showSearchPlaceholder();
      return;
    }

    const results = this.searchChains(String(query).replace(/\s+$/u, ""));
    this.displaySearchResults(results);
  }

  searchChains(query) {
    const lowerQuery = query.toLowerCase();

    return this.chains
      .filter((chain) => {
        // Buscar por nome
        if (chain.name && chain.name.toLowerCase().includes(lowerQuery)) {
          return true;
        }

        // Buscar por chain ID
        if (chain.chainId && chain.chainId.toString() === query) {
          return true;
        }

        // Buscar por símbolo da moeda nativa
        if (chain.nativeCurrency && chain.nativeCurrency.symbol && chain.nativeCurrency.symbol.toLowerCase().includes(lowerQuery)) {
          return true;
        }

        // Buscar em RPCs
        if (chain.rpc && Array.isArray(chain.rpc)) {
          return chain.rpc.some((rpc) => typeof rpc === "string" && rpc.toLowerCase().includes(lowerQuery));
        }

        return false;
      })
      .slice(0, 10); // Limitar a 10 resultados
  }

  showSearchPlaceholder() {
    const resultsContainer = document.getElementById("search-results");
    resultsContainer.innerHTML = `
            <div class="text-muted text-center py-3">
                <i class="bi bi-search me-2"></i>
                Digite pelo menos 2 caracteres para buscar...
            </div>
        `;
  }

  displaySearchResults(results) {
    const resultsContainer = document.getElementById("search-results");

    if (results.length === 0) {
      resultsContainer.innerHTML = `
                <div class="text-muted text-center py-3">
                    <i class="bi bi-exclamation-circle me-2"></i>
                    Nenhuma blockchain encontrada
                </div>
            `;
      return;
    }

    const resultsHtml = results
      .map(
        (chain) => `
            <div class="chain-card" onclick="rpcManager.selectChain(${chain.chainId})">
                <div class="d-flex align-items-center">
                    <div class="me-3">
                        ${chain.icon ? `<img src="${chain.icon}" alt="${chain.name}" width="32" height="32" class="rounded">` : `<i class="bi bi-globe2 fs-4"></i>`}
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${chain.name}</h6>
                        <small class="text-muted">
                            Chain ID: ${chain.chainId} • 
                            ${chain.nativeCurrency ? chain.nativeCurrency.symbol : "N/A"} • 
                            ${chain.rpc ? chain.rpc.length : 0} RPCs
                        </small>
                    </div>
                    <div>
                        <i class="bi bi-chevron-right text-muted"></i>
                    </div>
                </div>
            </div>
        `,
      )
      .join("");

    resultsContainer.innerHTML = resultsHtml;
  }

  async selectChain(chainId) {
    console.log("🎯 Selecionando chain:", chainId);

    this.selectedChain = this.chains.find((chain) => chain.chainId === chainId);
    if (!this.selectedChain) {
      this.showError("Chain não encontrada");
      return;
    }

    // Atualizar subtitle
    const subtitle = document.getElementById("chain-subtitle");
    if (subtitle) {
      subtitle.textContent = `${this.selectedChain.name} (Chain ID: ${this.selectedChain.chainId})`;
    }

    // Mostrar seção de detalhes
    this.showChainDetailsSection();

    // Verificar se a chain existe no MetaMask
    await this.checkChainInMetaMask();

    // Exibir RPCs
    this.displayRPCs();

    // Scroll para a seção de detalhes
    document.getElementById("chain-details-section").scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async checkChainInMetaMask() {
    const statusAlert = document.getElementById("chain-status-alert");
    const statusIcon = document.getElementById("chain-status-icon");
    const statusTitle = document.getElementById("chain-status-title");
    const statusMessage = document.getElementById("chain-status-message");
    const actionButtons = document.getElementById("chain-action-buttons");

    // Estado de verificação
    statusAlert.className = "alert alert-warning";
    statusIcon.className = "bi bi-hourglass-split";
    statusTitle.textContent = "Verificando...";
    statusMessage.textContent = "Verificando se a rede está adicionada no MetaMask...";
    actionButtons.innerHTML = "";

    try {
      const targetChainId = "0x" + this.selectedChain.chainId.toString(16);

      // Tentar trocar para a rede
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainId }],
      });

      // Se chegou aqui, a rede existe
      statusAlert.className = "alert alert-success";
      statusIcon.className = "bi bi-check-circle";
      statusTitle.textContent = "Rede Encontrada";
      statusMessage.textContent = "Esta rede já está adicionada no seu MetaMask.";

      actionButtons.innerHTML = `
                <button class="btn btn-outline-primary btn-sm" onclick="rpcManager.testRPCs()">
                    <i class="bi bi-speedometer2 me-1"></i>
                    Testar RPCs
                </button>
            `;
    } catch (error) {
      if (error.code === 4902) {
        // Rede não encontrada
        statusAlert.className = "alert alert-info";
        statusIcon.className = "bi bi-info-circle";
        statusTitle.textContent = "Rede Não Encontrada";
        statusMessage.textContent = "Esta rede não está adicionada no seu MetaMask.";

        actionButtons.innerHTML = `
                    <button class="btn btn-outline-primary btn-sm" onclick="rpcManager.addChainToMetaMask()">
                        <i class="bi bi-plus-circle me-1"></i>
                        Adicionar Rede
                    </button>
                `;
      } else {
        // Outro erro
        console.error("❌ Erro ao verificar chain:", error);
        statusAlert.className = "alert alert-danger";
        statusIcon.className = "bi bi-exclamation-triangle";
        statusTitle.textContent = "Erro na Verificação";
        statusMessage.textContent = `Erro: ${error.message}`;
        actionButtons.innerHTML = "";
      }
    }
  }

  displayRPCs() {
    const rpcList = document.getElementById("rpc-list");

    if (!this.selectedChain.rpc || this.selectedChain.rpc.length === 0) {
      rpcList.innerHTML = `
                <div class="text-muted text-center py-3">
                    <i class="bi bi-exclamation-circle me-2"></i>
                    Nenhum RPC disponível para esta rede
                </div>
            `;
      return;
    }

    const rpcHtml = this.selectedChain.rpc
      .map((rpc, index) => {
        // Filtrar RPCs válidos (URLs HTTP/HTTPS)
        if (typeof rpc !== "string" || (!rpc.startsWith("http://") && !rpc.startsWith("https://"))) {
          return "";
        }

        return `
                <div class="rpc-item" id="rpc-${index}">
                    <div class="d-flex align-items-center justify-content-between">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-1">
                                <code class="me-2">${rpc}</code>
                                <span class="rpc-status testing" id="status-${index}">
                                    <i class="bi bi-hourglass-split me-1"></i>
                                    Testando...
                                </span>
                            </div>
                        </div>
                        <div class="ms-2">
                            <button class="btn btn-outline-secondary btn-sm me-1" 
                                    onclick="rpcManager.testSingleRPC('${rpc}', ${index})" 
                                    title="Testar RPC">
                                <i class="bi bi-speedometer2"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" 
                                    onclick="rpcManager.showRemoveInstructions()" 
                                    title="Como remover">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
      })
      .filter((html) => html !== "")
      .join("");

    rpcList.innerHTML = rpcHtml;

    // Testar todos os RPCs automaticamente
    setTimeout(() => this.testRPCs(), 500);
  }

  async testRPCs() {
    if (!this.selectedChain || !this.selectedChain.rpc) return;

    console.log("🧪 Testando RPCs...");

    const validRpcs = this.selectedChain.rpc.filter((rpc) => typeof rpc === "string" && (rpc.startsWith("http://") || rpc.startsWith("https://")));

    for (let i = 0; i < validRpcs.length; i++) {
      this.testSingleRPC(validRpcs[i], i);
    }
  }

  async testSingleRPC(rpcUrl, index) {
    const statusElement = document.getElementById(`status-${index}`);
    if (!statusElement) return;

    try {
      statusElement.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>Testando...';
      statusElement.className = "rpc-status testing";

      // Fazer uma chamada simples para testar o RPC
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
          id: 1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result) {
          statusElement.innerHTML = '<i class="bi bi-check-circle me-1"></i>Online';
          statusElement.className = "rpc-status online";
        } else {
          throw new Error("Resposta inválida");
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn(`⚠️ RPC ${rpcUrl} falhou:`, error.message);
      statusElement.innerHTML = '<i class="bi bi-x-circle me-1"></i>Offline';
      statusElement.className = "rpc-status offline";
    }
  }

  async addChainToMetaMask() {
    if (!this.selectedChain) {
      this.showError("Nenhuma chain selecionada");
      return;
    }

    try {
      console.log("➕ Adicionando chain ao MetaMask:", this.selectedChain.name);

      const chainParams = {
        chainId: "0x" + this.selectedChain.chainId.toString(16),
        chainName: this.selectedChain.name,
        nativeCurrency: this.selectedChain.nativeCurrency || {
          name: "Ether",
          symbol: "ETH",
          decimals: 18,
        },
        rpcUrls: this.selectedChain.rpc.filter((rpc) => typeof rpc === "string" && (rpc.startsWith("http://") || rpc.startsWith("https://"))),
        blockExplorerUrls: this.selectedChain.explorers ? this.selectedChain.explorers.map((explorer) => explorer.url).filter((url) => url) : [],
      };

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [chainParams],
      });

      console.log("✅ Chain adicionada com sucesso");

      // Recheck status
      setTimeout(() => this.checkChainInMetaMask(), 1000);
    } catch (error) {
      console.error("❌ Erro ao adicionar chain:", error);
      this.showError("Erro ao adicionar rede: " + error.message);
    }
  }

  showRemoveInstructions() {
    const modal = new bootstrap.Modal(document.getElementById("removeInstructionsModal"));
    modal.show();
  }

  clearSearch() {
    const searchInput = document.getElementById("chain-search");
    if (searchInput) {
      searchInput.value = "";
      this.showSearchPlaceholder();
    }

    this.selectedChain = null;
    this.hideChainDetailsSection();
  }

  updateChainStatus() {
    // Atualizar status se uma chain estiver selecionada
    if (this.selectedChain) {
      setTimeout(() => this.checkChainInMetaMask(), 500);
    }
  }

  // Mensagens padronizadas: usar notify para exibir erros no rodapé
  showError(message) {
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify(String(message || "Erro"), "error", { container });
        return;
      }
      console.error(message);
    } catch (_) {}
  }
}

// Função global para abrir configurações do MetaMask
function openMetaMaskSettings() {
  if (typeof window.ethereum !== "undefined") {
    // Tentar abrir as configurações do MetaMask
    window.open("https://metamask.io/faqs/", "_blank");
  }
}

// Função global para conectar carteira (compatibilidade)
async function connectWallet() {
  if (window.rpcManager) {
    await window.rpcManager.connectWallet();
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.rpcManager = new RPCManager();
});

try {
  window.connectWallet = connectWallet;
  window.openMetaMaskSettings = openMetaMaskSettings;
} catch (_) {}
