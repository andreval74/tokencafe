/**
 * Interface para conectar o HTML com o sistema RPC simplificado
 */

/**
 * RPC Interface - Interface de usuário para gerenciamento de RPCs
 *
 * Esta classe gerencia a interface do usuário para:
 * - Seleção e busca de redes blockchain
 * - Exibição de dados detalhados da rede selecionada
 * - Adição de RPCs personalizados ao MetaMask
 * - Gerenciamento de RPCs existentes (adicionar/remover)
 * - Diferenciação visual entre RPCs cadastrados e não cadastrados no MetaMask
 */

class RPCInterface {
  constructor() {
    // Instância do sistema RPC para comunicação com MetaMask
    this.rpcSimple = null;
    // Rede atualmente selecionada pelo usuário
    this.selectedNetwork = null;
    // Cache das redes populares para melhor performance
    this.popularNetworks = null;
    this.init();
  }

  /**
   * Inicializa a interface de usuário
   * Configura event listeners e carrega dados iniciais
   */
  async init() {
    // Aguarda o RPCSimple estar disponível
    if (typeof window.RPCSimple !== "undefined") {
      this.rpcSimple = new RPCSimple();
      // Configura todos os event listeners da interface
      this.setupEventListeners();
      // Carrega lista de redes populares
      this.loadPopularNetworks();
      // Processa parâmetros da URL se houver
      await this.rpcSimple.processUrlParams();
    } else {
      // Tenta novamente após um tempo
      setTimeout(() => this.init(), 100);
    }
  }

  setupEventListeners() {
    // Botão adicionar rede
    const addNetworkBtn = document.getElementById("addNetworkBtn");
    if (addNetworkBtn) {
      addNetworkBtn.addEventListener("click", () => this.addNetworkToMetaMask());
    }

    // Botão limpar
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => this.clearForm());
    }

    // Campo de busca de rede
    const networkSearch = document.getElementById("networkSearch");
    if (networkSearch) {
      networkSearch.addEventListener("input", (e) => this.handleNetworkSearch(e.target.value));
      networkSearch.addEventListener("focus", () => this.showNetworkAutocomplete());
    }

    // Clique fora do autocomplete
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#networkSearch") && !e.target.closest("#networkAutocomplete")) {
        this.hideNetworkAutocomplete();
      }
    });
  }

  loadPopularNetworks() {
    if (!this.rpcSimple) return;

    const networks = this.rpcSimple.getPopularNetworks();
    this.popularNetworks = Object.entries(networks).map(([key, network]) => ({
      key,
      name: network.chainName,
      chainId: network.chainId,
      chainIdDecimal: parseInt(network.chainId, 16),
      symbol: network.nativeCurrency.symbol,
      ...network,
    }));
  }

  handleNetworkSearch(query) {
    if (!String(query).replace(/\s+$/u, "")) {
      this.hideNetworkAutocomplete();
      return;
    }

    const filtered = this.popularNetworks.filter((network) => network.name.toLowerCase().includes(query.toLowerCase()) || network.chainIdDecimal.toString().includes(query) || network.symbol.toLowerCase().includes(query.toLowerCase()));

    this.showFilteredNetworks(filtered);
  }

  showNetworkAutocomplete() {
    this.showFilteredNetworks(this.popularNetworks);
  }

  showFilteredNetworks(networks) {
    const autocomplete = document.getElementById("networkAutocomplete");
    if (!autocomplete) return;

    autocomplete.innerHTML = "";

    networks.slice(0, 10).forEach((network) => {
      const item = document.createElement("button");
      item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
      item.innerHTML = `
                <div>
                    <strong>${network.name}</strong>
                    <small class="text-muted d-block">Chain ID: ${network.chainIdDecimal} • ${network.symbol}</small>
                </div>
                <i class="bi bi-arrow-right"></i>
            `;

      item.addEventListener("click", (e) => {
        e.preventDefault();
        this.selectNetwork(network);
      });

      autocomplete.appendChild(item);
    });

    autocomplete.style.display = networks.length > 0 ? "block" : "none";
  }

  hideNetworkAutocomplete() {
    const autocomplete = document.getElementById("networkAutocomplete");
    if (autocomplete) {
      autocomplete.style.display = "none";
    }
  }

  /**
   * Seleciona uma rede e exibe seus dados
   * @param {Object} network - Objeto da rede selecionada
   */
  selectNetwork(network) {
    this.selectedNetwork = network;

    // Atualiza o campo de busca
    const networkSearch = document.getElementById("networkSearch");
    if (networkSearch) {
      networkSearch.value = network.name;
    }

    // Esconde o autocomplete
    this.hideNetworkAutocomplete();

    // Exibe os dados da rede selecionada
    this.displayNetworkData(network);

    // Inicia verificação da rede (Etapa 1)
    this.checkNetworkStatus(network);
  }

  /**
   * Exibe os dados completos da rede selecionada
   * @param {Object} network - Dados da rede
   */
  displayNetworkData(network) {
    // Preenche os campos ocultos
    const chainIdField = document.getElementById("chainId");
    const networkNameField = document.getElementById("networkName");

    if (chainIdField) chainIdField.value = network.chainId;
    if (networkNameField) networkNameField.value = network.name;

    // Exibe seção de moeda nativa
    const nativeCurrencySection = document.getElementById("native-currency-section");
    if (nativeCurrencySection) {
      const nativeCurrencyField = document.getElementById("nativeCurrency");
      const nativeCurrencySymbolField = document.getElementById("nativeCurrencySymbol");

      // Verifica se nativeCurrency existe antes de acessar suas propriedades
      const nativeCurrency = network.nativeCurrency || {};
      if (nativeCurrencyField) nativeCurrencyField.value = nativeCurrency.name || "";
      if (nativeCurrencySymbolField) nativeCurrencySymbolField.value = nativeCurrency.symbol || "";
      this.showSection("native-currency-section");
    }

    // Exibe seção de URLs da rede
    const networkUrlsSection = document.getElementById("network-urls-section");
    if (networkUrlsSection) {
      const rpcUrlField = document.getElementById("rpcUrl");
      const explorerUrlField = document.getElementById("explorerUrl");

      if (rpcUrlField) rpcUrlField.value = network.rpcUrls[0] || "";
      if (explorerUrlField) explorerUrlField.value = network.blockExplorerUrls ? network.blockExplorerUrls[0] || "" : "";
      this.showSection("network-urls-section");
    }

    // Exibe seção de configuração RPC
    this.showSection("rpc-config-section");
  }

  /**
   * ETAPA 1: Verifica se a rede está cadastrada no MetaMask
   */
  async checkNetworkStatus(network) {
    this.showMessage("info", "Verificando se a rede está cadastrada no MetaMask...");

    try {
      const isRegistered = await this.rpcSimple.isNetworkRegistered(network.chainId);

      if (isRegistered) {
        // Rede já cadastrada - vai para etapa 2
        this.showMessage("success", `Rede ${network.name} já está cadastrada no MetaMask!`);
        this.showRpcManagement(network);
      } else {
        // Rede não cadastrada - mostra botão para cadastrar
        this.showMessage("warning", `Rede ${network.name} não está cadastrada no MetaMask.`);
        this.showAddNetworkOption(network);
      }
    } catch (error) {
      console.error("Erro ao verificar status da rede:", error);
      this.showMessage("error", "Erro ao verificar status da rede. Tente novamente.");
    }
  }

  /**
   * Mostra opção para adicionar rede ao MetaMask
   */
  showAddNetworkOption(network) {
    // Mostra seção de adicionar rede
    this.showSection("add-network-section");

    // Atualiza informações da rede
    const networkInfo = document.getElementById("networkInfo");
    if (networkInfo) {
      networkInfo.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${network.name}</h5>
                        <p class="card-text">
                            <strong>Chain ID:</strong> ${network.chainIdDecimal}<br>
                            <strong>Símbolo:</strong> ${network.symbol}<br>
                            <strong>Explorador:</strong> ${network.blockExplorerUrls ? network.blockExplorerUrls[0] : "N/A"}
                        </p>
                        <button class="btn btn-outline-primary" onclick="rpcInterface.addNetworkToMetaMask()">
                            <i class="bi bi-plus-circle"></i> Adicionar Rede ao MetaMask
                        </button>
                    </div>
                </div>
            `;
    }
  }

  /**
   * ETAPA 2: Mostra gerenciamento de RPCs
   */
  async showRpcManagement(network) {
    // Mostra seção de gerenciamento de RPCs
    this.showSection("rpc-management-section");

    // Carrega RPCs disponíveis e do MetaMask
    await this.loadRpcManagement(network);
  }

  /**
   * ETAPA 2: Carrega e exibe o gerenciamento de RPCs para a rede selecionada
   * @param {Object} network - Dados da rede
   */
  async loadRpcManagement(network) {
    const container = document.getElementById("rpcManagementContainer");
    if (!container) return;

    try {
      // Verifica se o MetaMask está conectado
      if (!(await this.ensureWalletConnection())) {
        this.showMessage("error", "É necessário conectar o MetaMask para gerenciar RPCs");
        return;
      }

      // Obtém todas as RPCs disponíveis para esta rede usando a nova integração
      const availableRpcs = await this.rpcSimple.getNetworkRpcs(network.chainIdDecimal);

      // Verifica quais RPCs já estão no MetaMask usando o método melhorado
      const metamaskRpcs = await this.rpcSimple.getMetaMaskRpcsForNetwork(network.chainId);

      container.innerHTML = `
                <!-- Campo para adicionar RPC personalizada -->
                <div class="card mb-4">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="bi bi-plus-circle me-2"></i>Adicionar RPC Personalizada
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-8">
                                <label for="customRpcInput" class="form-label">URL do RPC</label>
                                <input type="url" class="form-control" id="customRpcInput" 
                                       placeholder="https://rpc.example.com" required>
                            </div>
                            <div class="col-md-4">
                                <label for="customRpcName" class="form-label">Nome (opcional)</label>
                                <input type="text" class="form-control" id="customRpcName" 
                                       placeholder="RPC Personalizado">
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="button" class="btn btn-outline-primary" onclick="rpcInterface.addCustomRpc()">
                                <i class="bi bi-plus me-2"></i>Adicionar RPC
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Lista de RPCs Disponíveis -->
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="bi bi-list-ul me-2"></i>RPCs Disponíveis para ${network.name}
                            <small class="text-muted">(${availableRpcs.length} encontrados)</small>
                        </h6>
                    </div>
                    <div class="card-body">
                        <div id="rpcListContainer" class="rpc-list-container">
                            ${this.generateRpcList(availableRpcs, metamaskRpcs, network.chainId)}
                        </div>
                    </div>
                </div>
            `;
    } catch (error) {
      console.error("Erro ao carregar gerenciamento de RPCs:", error);
      container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Erro ao carregar RPCs disponíveis. Você ainda pode adicionar RPCs personalizadas.
                </div>
                
                <!-- Campo para adicionar RPC personalizada (fallback) -->
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="bi bi-plus-circle me-2"></i>Adicionar RPC Personalizada
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="row g-3">
                            <div class="col-md-8">
                                <label for="customRpcInput" class="form-label">URL do RPC</label>
                                <input type="url" class="form-control" id="customRpcInput" 
                                       placeholder="https://rpc.example.com" required>
                            </div>
                            <div class="col-md-4">
                                <label for="customRpcName" class="form-label">Nome (opcional)</label>
                                <input type="text" class="form-control" id="customRpcName" 
                                       placeholder="RPC Personalizado">
                            </div>
                        </div>
                        <div class="mt-3">
                            <button type="button" class="btn btn-outline-primary" onclick="rpcInterface.addCustomRpc()">
                                <i class="bi bi-plus me-2"></i>Adicionar RPC
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }
  }

  /**
   * Garante que o MetaMask esteja conectado antes de prosseguir
   * @returns {Promise<boolean>} True se conectado, false caso contrário
   */
  async ensureWalletConnection() {
    try {
      // Se carteira não disponível, informar e oferecer download
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          if (typeof window.notify === "function") {
            window.notify("MetaMask não está instalado. Por favor, instale o MetaMask para continuar.", "error", { container });
          } else {
            console.error("MetaMask não está instalado. Por favor, instale o MetaMask para continuar.");
          }
        } catch (_) {}
        window.open("https://metamask.io/download/", "_blank");
        return false;
      }

      // Usar WalletConnector unificado quando disponível
      const wc = window.walletConnector;
      const isConn = wc && typeof wc.isConnected === "function" ? await wc.isConnected() : false;
      if (isConn) return true;

      // Tentar conexão direta via WalletConnector
      try {
        await wc.connect("metamask");
        return true;
      } catch (e) {
        this.showMessage("warning", "Conexão necessária. Autorize no MetaMask.");
        return false;
      }
    } catch (error) {
      console.error("Erro ao verificar conexão do MetaMask:", error);
      this.showMessage("error", "Erro ao verificar conexão do MetaMask");
      return false;
    }
  }

  /**
   * Gera a lista HTML de RPCs com botões dinâmicos
   * @param {Array} availableRpcs - RPCs disponíveis no banco de dados
   * @param {Array} metamaskRpcs - RPCs já cadastradas no MetaMask
   * @param {string} chainId - Chain ID da rede
   * @returns {string} HTML da lista de RPCs
   */
  generateRpcList(availableRpcs, metamaskRpcs, chainId) {
    if (!availableRpcs || availableRpcs.length === 0) {
      return `
                <div class="text-center text-muted py-4">
                    <i class="bi bi-info-circle fs-1 mb-3"></i>
                    <p>Nenhum RPC pré-configurado disponível para esta rede.</p>
                    <p class="small">Use o campo acima para adicionar RPCs personalizadas.</p>
                </div>
            `;
    }

    return availableRpcs
      .map((rpc) => {
        // Verifica se este RPC já está no MetaMask
        const isInMetaMask = metamaskRpcs.some((mmRpc) => mmRpc.url && rpc.url && mmRpc.url.toLowerCase() === rpc.url.toLowerCase());

        const buttonClass = isInMetaMask ? "btn-outline-danger" : "btn-outline-primary";
        const buttonIcon = isInMetaMask ? "bi-trash" : "bi-plus";
        const buttonText = isInMetaMask ? "Remover" : "Adicionar";
        const buttonAction = isInMetaMask ? `rpcInterface.removeRpcFromMetaMask('${chainId}', '${rpc.url}', '${rpc.name}')` : `rpcInterface.addRpcToMetaMask('${chainId}', '${rpc.url}', '${rpc.name}')`;

        return `
                <div class="rpc-item ${isInMetaMask ? "metamask-rpc" : ""}" data-rpc-url="${rpc.url}">
                    <div class="rpc-info">
                        <div class="rpc-name">
                            ${rpc.name}
                            ${isInMetaMask ? '<span class="badge bg-success ms-2">No MetaMask</span>' : ""}
                        </div>
                        <div class="rpc-url">${rpc.url}</div>
                    </div>
                    <button type="button" class="btn ${buttonClass} btn-sm add-rpc-btn" 
                            onclick="${buttonAction}">
                        <i class="bi ${buttonIcon} me-1"></i>${buttonText}
                    </button>
                </div>
            `;
      })
      .join("");
  }

  /**
   * Obtém RPCs do MetaMask para uma rede específica
   * @param {string} chainId - Chain ID da rede
   * @returns {Array} Lista de RPCs do MetaMask
   */
  async getMetaMaskRpcsForNetwork(chainId) {
    try {
      // Tenta obter informações básicas sobre RPCs no MetaMask
      return await this.rpcSimple.getMetaMaskRpcsForNetwork(chainId);
    } catch (error) {
      console.warn("Não foi possível carregar RPCs do MetaMask:", error);
      return [];
    }
  }

  /**
   * Adiciona um RPC personalizado ao MetaMask
   */
  async addCustomRpc() {
    const customRpcInput = document.getElementById("customRpcInput");
    const customRpcName = document.getElementById("customRpcName");

    if (!customRpcInput || !String(customRpcInput.value || "").replace(/\s+$/u, "")) {
      this.showMessage("error", "Por favor, insira uma URL válida para o RPC");
      return;
    }

    const rpcUrl = String(customRpcInput.value || "").replace(/\s+$/u, "");
    const rpcName = customRpcName ? String(customRpcName.value || "").replace(/\s+$/u, "") || "RPC Personalizado" : "RPC Personalizado";

    if (!this.selectedNetwork) {
      this.showMessage("error", "Nenhuma rede selecionada");
      return;
    }

    try {
      this.showMessage("info", "Adicionando RPC personalizado...");

      // Adiciona o RPC ao MetaMask
      await this.addRpcToMetaMask(this.selectedNetwork.chainId, rpcUrl, rpcName);

      // Dispara evento para capturar RPC na sessão (sem persistência)
      try {
        document.dispatchEvent(
          new CustomEvent("dapp:addRpcUrl", {
            detail: {
              chainId: this.selectedNetwork.chainId,
              url: rpcUrl,
              rpcUrl,
              rpcName,
            },
          }),
        );
      } catch (evtErr) {
        console.warn("Falha ao disparar evento de sessão para RPC personalizado:", evtErr);
      }

      // Limpa os campos
      customRpcInput.value = "";
      if (customRpcName) customRpcName.value = "";

      // Recarrega a lista de RPCs
      await this.loadRpcManagement(this.selectedNetwork);

      this.showMessage("success", `RPC "${rpcName}" adicionado com sucesso!`);
    } catch (error) {
      console.error("Erro ao adicionar RPC personalizado:", error);
      this.showMessage("error", "Erro ao adicionar RPC personalizado: " + error.message);
    }
  }

  /**
   * Adiciona um RPC específico ao MetaMask
   * @param {string} chainId - Chain ID da rede
   * @param {string} rpcUrl - URL do RPC
   * @param {string} rpcName - Nome do RPC
   */
  async addRpcToMetaMask(chainId, rpcUrl, rpcName) {
    try {
      this.showMessage("info", `Adicionando RPC "${rpcName}"...`);

      // Usa o método existente do rpcSimple
      await this.rpcSimple.addRpcToExistingNetwork(chainId, rpcUrl);

      // Atualiza o botão na interface
      this.updateRpcButton(rpcUrl, true, rpcName);

      this.showMessage("success", `RPC "${rpcName}" adicionado com sucesso!`);

      // Dispara evento para capturar RPC na sessão
      try {
        document.dispatchEvent(
          new CustomEvent("dapp:addRpcUrl", {
            detail: { chainId, url: rpcUrl, rpcUrl, rpcName },
          }),
        );
      } catch (evtErr) {
        console.warn("Falha ao disparar evento de sessão ao adicionar RPC:", evtErr);
      }
    } catch (error) {
      console.error("Erro ao adicionar RPC:", error);
      this.showMessage("error", `Erro ao adicionar RPC: ${error.message}`);
    }
  }

  /**
   * Remove um RPC do MetaMask (simulação - MetaMask não tem API para remover)
   * @param {string} chainId - Chain ID da rede
   * @param {string} rpcUrl - URL do RPC
   * @param {string} rpcName - Nome do RPC
   */
  async removeRpcFromMetaMask(chainId, rpcUrl, rpcName) {
    try {
      this.showMessage("warning", `Removendo RPC "${rpcName}"...`);

      // Nota: MetaMask não tem API pública para remover RPCs
      // Esta é uma simulação da funcionalidade
      this.showMessage("info", "Para remover este RPC, acesse as configurações do MetaMask manualmente.");

      // Atualiza o botão na interface (simulação)
      setTimeout(() => {
        this.updateRpcButton(rpcUrl, false, rpcName);
        this.showMessage("success", `RPC "${rpcName}" marcado para remoção. Remova manualmente no MetaMask.`);
      }, 1500);
    } catch (error) {
      console.error("Erro ao remover RPC:", error);
      this.showMessage("error", `Erro ao remover RPC: ${error.message}`);
    }
  }

  /**
   * Atualiza o botão de um RPC específico na interface
   * @param {string} rpcUrl - URL do RPC
   * @param {boolean} isInMetaMask - Se o RPC está no MetaMask
   * @param {string} rpcName - Nome do RPC
   */
  updateRpcButton(rpcUrl, isInMetaMask, rpcName) {
    const rpcItem = document.querySelector(`[data-rpc-url="${rpcUrl}"]`);
    if (!rpcItem) return;

    const button = rpcItem.querySelector(".add-rpc-btn");
    if (!button) return;

    // Atualiza classes do item
    if (isInMetaMask) {
      rpcItem.classList.add("metamask-rpc");
    } else {
      rpcItem.classList.remove("metamask-rpc");
    }

    // Atualiza o botão
    const buttonClass = isInMetaMask ? "btn-outline-danger" : "btn-outline-primary";
    const buttonIcon = isInMetaMask ? "bi-trash" : "bi-plus";
    const buttonText = isInMetaMask ? "Remover" : "Adicionar";
    const chainId = this.selectedNetwork ? this.selectedNetwork.chainId : "";
    const buttonAction = isInMetaMask ? `rpcInterface.removeRpcFromMetaMask('${chainId}', '${rpcUrl}', '${rpcName}')` : `rpcInterface.addRpcToMetaMask('${chainId}', '${rpcUrl}', '${rpcName}')`;

    button.className = `btn ${buttonClass} btn-sm add-rpc-btn`;
    button.onclick = new Function(buttonAction);
    button.innerHTML = `<i class="bi ${buttonIcon} me-1"></i>${buttonText}`;

    // Atualiza badge no nome
    const rpcInfo = rpcItem.querySelector(".rpc-info .rpc-name");
    if (rpcInfo) {
      const existingBadge = rpcInfo.querySelector(".badge");
      if (existingBadge) {
        existingBadge.remove();
      }

      if (isInMetaMask) {
        rpcInfo.innerHTML += '<span class="badge bg-success ms-2">No MetaMask</span>';
      }
    }
  }

  showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove("hidden-section");
    }
  }

  hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add("hidden-section");
    }
  }

  async addNetworkToMetaMask() {
    if (!this.selectedNetwork || !this.rpcSimple) {
      this.showMessage("error", "Nenhuma rede selecionada");
      return;
    }

    try {
      this.showMessage("info", "Adicionando rede ao MetaMask...");

      // Prepara dados da rede
      const networkData = { ...this.selectedNetwork };

      // Adiciona RPCs personalizadas se fornecidas
      const customRpcUrl = document.getElementById("customRpcUrl");
      let customRpcs = [];
      if (customRpcUrl && String(customRpcUrl.value || "").replace(/\s+$/u, "")) {
        customRpcs = customRpcUrl.value
          .replace(/\s+$/u, "")
          .split("\n")
          .map((url) => String(url).replace(/\s+$/u, ""))
          .filter((url) => url && (url.startsWith("http://") || url.startsWith("https://")));

        if (customRpcs.length > 0) {
          networkData.rpcUrls = [...customRpcs, ...(networkData.rpcUrls || [])];
        }
      }

      // Adiciona a rede
      await this.rpcSimple.addNetwork(networkData);

      this.showMessage("success", `Rede ${this.selectedNetwork.name} adicionada com sucesso!`);

      // Dispara eventos para capturar RPCs personalizados adicionados em lote (sessão)
      if (Array.isArray(customRpcs) && customRpcs.length > 0) {
        try {
          customRpcs.forEach((rpcUrl) => {
            try {
              document.dispatchEvent(
                new CustomEvent("dapp:addRpcUrl", {
                  detail: {
                    chainId: this.selectedNetwork.chainId,
                    url: rpcUrl,
                    rpcUrl,
                    rpcName: "RPC Personalizado",
                  },
                }),
              );
            } catch (evtErr) {
              console.warn("Falha ao disparar evento de sessão para RPC personalizado (lote):", evtErr);
            }
          });
        } catch (batchErr) {
          console.warn("Falha ao processar lote de RPCs personalizados para sessão:", batchErr);
        }
      }

      // Após adicionar a rede, vai para etapa 2
      setTimeout(() => {
        this.showRpcManagement(this.selectedNetwork);
      }, 1500);
    } catch (error) {
      console.error("Erro ao adicionar rede:", error);

      if (error.code === 4001) {
        this.showMessage("warning", "Adição de rede cancelada pelo usuário.");
      } else if (error.code === -32602) {
        this.showMessage("error", "Dados da rede inválidos.");
      } else {
        this.showMessage("error", `Erro ao adicionar rede: ${error.message}`);
      }
    }
  }

  clearForm() {
    // Limpa campos
    const fields = ["networkSearch", "chainId", "networkName", "nativeCurrency", "nativeCurrencySymbol", "rpcUrl", "explorerUrl", "customRpcUrl"];
    fields.forEach((fieldId) => {
      const field = document.getElementById(fieldId);
      if (field) field.value = "";
    });

    // Esconde seções
    const sections = ["add-network-section", "rpc-management-section", "native-currency-section", "network-urls-section", "rpc-config-section", "rpc-list-section"];
    sections.forEach((sectionId) => this.hideSection(sectionId));

    // Limpa seleção
    this.selectedNetwork = null;

    // Esconde mensagens
    this.hideMessage("success");
    this.hideMessage("error");
    this.hideMessage("warning");
    this.hideMessage("info");

    // Desabilita botão
    const addBtn = document.getElementById("addNetworkBtn");
    if (addBtn) addBtn.disabled = true;

    this.hideNetworkAutocomplete();
  }

  showMessage(type, message) {
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify(String(message || ""), String(type || "info"), { container });
        return;
      }
      if (type === "success") {
        console.log(message);
      } else {
        console.error(message);
      }
    } catch (_) {}
  }

  hideMessage(type) {
    try {
      void type;
    } catch (_) {}
  }

  /**
   * Carrega e exibe a lista de RPCs disponíveis para uma rede
   */
  loadRpcList(chainId) {
    if (!this.rpcSimple) return;

    const rpcs = this.rpcSimple.getNetworkRpcs(chainId);
    const rpcListContainer = document.getElementById("rpcListContainer");

    if (!rpcListContainer || rpcs.length === 0) return;

    rpcListContainer.innerHTML = "";

    rpcs.forEach((rpc, _index) => {
      const rpcItem = document.createElement("div");
      rpcItem.className = "rpc-item d-flex justify-content-between align-items-center p-3 mb-2 border rounded";

      rpcItem.innerHTML = `
                <div class="rpc-info flex-grow-1">
                    <div class="rpc-name fw-bold">${rpc.name}</div>
                    <div class="rpc-url text-muted small monospace-input">${rpc.url}</div>
                    <div class="rpc-status">
                        <span class="badge ${rpc.public ? "bg-success" : "bg-warning"} me-1">
                            ${rpc.public ? "Público" : "Requer API Key"}
                        </span>
                    </div>
                </div>
                <div class="rpc-actions">
                    <button class="btn btn-outline-primary btn-sm add-rpc-btn" 
                            data-chain-id="${chainId}" 
                            data-rpc-url="${rpc.url}"
                            data-rpc-name="${rpc.name}"
                            title="Adicionar este RPC ao MetaMask">
                        <i class="bi bi-plus-circle me-1"></i>Adicionar
                    </button>
                </div>
            `;

      // Adiciona event listener para o botão
      const addBtn = rpcItem.querySelector(".add-rpc-btn");
      addBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.addIndividualRpc(chainId, rpc.url, rpc.name);
      });

      rpcListContainer.appendChild(rpcItem);
    });
  }

  /**
   * Adiciona um RPC individual ao MetaMask
   */
  async addIndividualRpc(chainId, rpcUrl, rpcName) {
    if (!this.rpcSimple) {
      this.showMessage("error", "Sistema RPC não está disponível");
      return;
    }

    try {
      await this.rpcSimple.addRpcToExistingNetwork(chainId, rpcUrl, rpcName);
      this.showMessage("success", `RPC "${rpcName}" adicionado com sucesso!`);

      // Dispara evento para capturar RPC na sessão
      try {
        document.dispatchEvent(
          new CustomEvent("dapp:addRpcUrl", {
            detail: { chainId, url: rpcUrl, rpcUrl, rpcName },
          }),
        );
      } catch (evtErr) {
        console.warn("Falha ao disparar evento de sessão ao adicionar RPC individual:", evtErr);
      }
    } catch (error) {
      console.error("Erro ao adicionar RPC:", error);

      let errorMessage = "Erro ao adicionar RPC";
      if (error.code === 4001) {
        errorMessage = "Usuário rejeitou a solicitação";
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.showMessage("error", errorMessage);
    }
  }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.rpcInterface = new RPCInterface();
});
