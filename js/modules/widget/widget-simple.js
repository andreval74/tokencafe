/**
 * WidgetSimple - Lógica de criação e preview do widget de compra.
 * Responsável por inicialização, detecção de contratos/ABIs, geração de código e preview.
 * Dependências: ethers 5.x (UMD), wallet-connector, network-manager, page-manager, contract-deployer.
 * Observação: overrides `window.__override*` são apenas para desenvolvimento.
 */
// import removed: generateWidgetConfig now lives as a class method

class WidgetSimple {
  constructor() {
    this.state = {
      currentStep: 1,
      contractValidated: false,
      autoDetectedParams: {},
      widgetConfig: {},
      provider: null,
      contracts: {},
    };

    this.supportedNetworks = {
      97: {
        name: "BSC Testnet",
        symbol: "BNB",
        rpcUrl: "https://bsc-testnet.publicnode.com",
        explorer: "https://testnet.bscscan.com",
      },
      56: {
        name: "Binance Smart Chain",
        symbol: "BNB",
        rpcUrl: "https://bsc-dataseed.binance.org",
        explorer: "https://bscscan.com",
      },
      1: {
        name: "Ethereum",
        symbol: "ETH",
        rpcUrl: "https://eth.llamarpc.com",
        explorer: "https://etherscan.io",
      },
      137: {
        name: "Polygon",
        symbol: "MATIC",
        rpcUrl: "https://polygon-rpc.com",
        explorer: "https://polygonscan.com",
      },
    };

    this.uiTemplates = {
      minimal: {
        theme: "light",
        layout: "card",
        showPrice: true,
        showLimits: false,
        customCSS: "",
      },
      modern: {
        theme: "dark",
        layout: "glassmorphism",
        showPrice: true,
        showLimits: true,
        customCSS: `
                    .tokencafe-widget {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255,255,255,0.2);
                    }
                `,
      },
    };
  }

  async init() {
    console.log("🚀 Inicializando Widget Simples...");

    try {
      // Carregar ethers.js dinamicamente
      if (typeof ethers === "undefined") {
        console.warn("⚠️ ethers.js não encontrado, carregando...");
        await this.loadEthersJS();
      }

      // Inicializar deployer de contratos
      if (window.ContractDeployer) {
        this.state.contractDeployer = new ContractDeployer();
        await this.state.contractDeployer.initialize(this.state.provider);
        console.log("✅ ContractDeployer inicializado");
      }

      // Configurar event listeners
      this.setupEventListeners();

      // Auto-aplicar overrides e disparar validação
      try {
        const blockchainSelect = document.getElementById("blockchain");
        const saleContractInput = document.getElementById("saleContract");
        const receiverWalletInput = document.getElementById("receiverWallet");
        const tokenContractInput = document.getElementById("tokenContract");

        // Aplicar overrides se disponíveis
        if (blockchainSelect && window.__overrideChainId) {
          blockchainSelect.value = String(window.__overrideChainId);
          this.handleBlockchainChange();
        }
        if (saleContractInput && window.__overrideSaleContract) {
          saleContractInput.value = window.__overrideSaleContract;
        }
        if (receiverWalletInput && window.__overrideReceiverWallet) {
          receiverWalletInput.value = window.__overrideReceiverWallet;
        }
        if (tokenContractInput && window.__overrideTokenContract) {
          tokenContractInput.value = window.__overrideTokenContract;
        }

        // Se já houver contrato no input, iniciar validação automaticamente
        if (saleContractInput && saleContractInput.value) {
          await this.handleContractValidation();
        }
      } catch (autoErr) {
        console.warn("Não foi possível auto-aplicar overrides:", autoErr);
      }

      // Sempre renderizar um preview inicial para garantir visibilidade do botão e mensagens
      try {
        await this.showPreview();
      } catch (previewErr) {
        console.warn("Falha ao renderizar preview inicial:", previewErr);
      }

      // Registrar listeners para mudanças de conta/rede e refletir no widget
      try {
        if (window.ethereum) {
          window.ethereum.on("accountsChanged", (accounts) => {
            try {
              const addr = accounts && accounts[0];
              const root = this.state?.activeWidgetContainer || document;
              const connectedEl = (root.querySelector ? root.querySelector("#previewConnected") : null) || document.getElementById("previewConnected");
              if (connectedEl) {
                if (addr) {
                  const short = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
                  connectedEl.innerHTML = `<span class="tc-connected-icon">🟢</span><span class="tc-connected-text">Conectado: ${short}</span>`;
                  const cfg = this.state?.widgetConfig || this.generateWidgetConfig();
                  this.updatePurchaseStatusBadge(cfg, addr).catch(() => {});
                } else {
                  connectedEl.innerHTML = `<span class="tc-connected-icon">⚪</span><span class="tc-connected-text">Carteira não conectada</span>`;
                }
              }
            } catch (_) {}
          });
          window.ethereum.on("chainChanged", (_chainId) => {
            this.showPreview().catch(() => {});
          });
        }
      } catch (evtErr) {
        console.warn("Não foi possível registrar listeners de carteira/rede:", evtErr);
      }

      console.log("✅ Widget Simples inicializado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao inicializar Widget Simples:", error);
      this.showError("Erro ao inicializar sistema");
    }
  }

  /**
   * Configura todos os event listeners do formulário
   */
  setupEventListeners() {
    // Validação de contrato
    const validateBtn = document.getElementById("validateBtn");
    if (validateBtn) {
      validateBtn.addEventListener("click", this.handleContractValidation.bind(this));
    }

    // Mudança de blockchain (atualiza símbolo da moeda)
    const blockchainSelect = document.getElementById("blockchain");
    if (blockchainSelect) {
      blockchainSelect.addEventListener("change", this.handleBlockchainChange.bind(this));
    }

    // Submissão do formulário
    const form = document.getElementById("widgetForm");
    if (form) {
      form.addEventListener("submit", this.handleFormSubmit.bind(this));
    }

    // Listener global para seleção de rede
    document.addEventListener("network:selected", this.handleNetworkSelected.bind(this));

    // Botões de ação
    const copyCodeBtn = document.getElementById("copyCodeBtn");
    if (copyCodeBtn) {
      copyCodeBtn.addEventListener("click", this.handleCopyCode.bind(this));
    }

    const copyContractBtn = document.getElementById("copyContractBtn");
    if (copyContractBtn) {
      copyContractBtn.addEventListener("click", this.handleCopyContract.bind(this));
    }

    const downloadJsonBtn = document.getElementById("downloadJsonBtn");
    if (downloadJsonBtn) {
      downloadJsonBtn.addEventListener("click", this.handleDownloadJson.bind(this));
    }

    const copyEmbedBtn = document.getElementById("copyEmbedBtn");
    if (copyEmbedBtn) {
      copyEmbedBtn.addEventListener("click", this.handleCopyEmbed.bind(this));
    }

    // Validação em tempo real do endereço do contrato
    const saleContractInput = document.getElementById("saleContract");
    if (saleContractInput) {
      saleContractInput.addEventListener("input", this.handleContractInputChange.bind(this));
    }

    // Atualizar preview em tempo real ao editar preço, limites e texto do botão
    const liveIds = ["tokenPrice", "minPurchase", "maxPurchase", "buyButtonText"];
    for (const id of liveIds) {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", () => {
          // Regerar preview sempre que esses campos mudam
          this.showPreview();
        });
      }
    }
  }

  /**
   * Carrega ethers.js dinamicamente se não estiver disponível
   */
  loadEthersJS() {
    // Já carregado
    if (typeof ethers !== "undefined") {
      return Promise.resolve(true);
    }
    // Evitar múltiplos carregamentos
    if (this.state._loadingEthers) {
      return this.state._loadingEthers;
    }
    // Carregar e resolver somente após onload
    this.state._loadingEthers = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[src*="ethers-5.7.2.umd.min.js"]');
      if (existing) {
        // Se já existe a tag, esperar breve timeout e resolver
        const checkReady = () => {
          if (typeof ethers !== "undefined") {
            console.log("✅ ethers.js disponível");
            resolve(true);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js";
      script.async = true;
      script.onload = () => {
        console.log("✅ ethers.js carregado com sucesso!");
        resolve(true);
      };
      script.onerror = (err) => {
        console.error("❌ Erro ao carregar ethers.js", err);
        this.showError("Erro ao carregar biblioteca blockchain. Por favor, recarregue a página.");
        reject(new Error("Falha ao carregar ethers.js"));
      };
      document.head.appendChild(script);
    });
    return this.state._loadingEthers;
  }

  /**
   * Manipula mudança de blockchain (atualiza símbolo da moeda)
   */
  // Ajuste: tratar erros ao mudar blockchain e atualizar símbolo (robusto)
  handleBlockchainChange() {
    const blockchainSelect = document.getElementById("blockchain");
    const currencySymbolEl = document.getElementById("currencySymbol");
    if (!blockchainSelect) return;
    let symbol = "BNB";
    try {
      const idx = typeof blockchainSelect.selectedIndex === "number" ? blockchainSelect.selectedIndex : -1;
      const opt = idx >= 0 ? blockchainSelect.options[idx] : null;
      const attrSymbol = opt ? opt.getAttribute("data-symbol") : null;
      const chainVal = blockchainSelect.value;
      if (attrSymbol) {
        symbol = attrSymbol;
      } else if (chainVal && this.supportedNetworks[chainVal] && this.supportedNetworks[chainVal].symbol) {
        symbol = this.supportedNetworks[chainVal].symbol;
      }
    } catch (err) {
      // Fallback seguro por chainId
      const chainVal = blockchainSelect.value;
      if (chainVal && this.supportedNetworks[chainVal] && this.supportedNetworks[chainVal].symbol) {
        symbol = this.supportedNetworks[chainVal].symbol;
      }
      console.warn("handleBlockchainChange: usando fallback de símbolo:", err);
    }
    if (currencySymbolEl) {
      currencySymbolEl.textContent = symbol;
    }
  }

  /**
   * Manipula mudança no input do contrato (validação em tempo real)
   */
  handleContractInputChange() {
    const saleContractInput = document.getElementById("saleContract");
    const validationStatus = document.getElementById("validationStatus");

    if (!saleContractInput || !validationStatus) return;

    const address = String(saleContractInput.value || "").replace(/\s+$/u, "");

    // Limpa status anterior
    validationStatus.innerHTML = "";
    this.state.contractValidated = false;

    // Valida formato do endereço Ethereum
    if (address.length > 0) {
      if (!this.isValidEthereumAddress(address)) {
        validationStatus.innerHTML = '<div class="alert alert-warning alert-sm"><i class="bi bi-exclamation-triangle me-2"></i>Formato de endereço inválido</div>';
      } else {
        validationStatus.innerHTML = '<div class="alert alert-info alert-sm"><i class="bi bi-info-circle me-2"></i>Clique em "Validar" para verificar o contrato</div>';

        // Auto-detectar tipo de contrato em tempo real
        this.autoDetectContractType(address);
      }
    }
  }

  /**
   * Auto-detecta tipo de contrato (token ou sale) em tempo real
   */
  async autoDetectContractType(address) {
    try {
      if (!this.state.provider) {
        // Criar provider temporário para detecção
        const blockchainSelect = document.getElementById("blockchain");
        const chainId = blockchainSelect?.value || "97";
        const networkConfig = this.supportedNetworks[chainId];

        if (networkConfig) {
          this.state.provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
        }
      }

      if (!this.state.provider) return;

      // Primeiro tentar detectar se é um token
      const tokenInfo = await this.detectTokenInfo(address);

      if (tokenInfo) {
        // É um token! Oferecer para criar contrato de venda
        this.showTokenDetectedMessage(tokenInfo);
        return;
      }

      // Se não for token, verificar se é um contrato de venda
      const saleInfo = await this.detectSaleContract(address);

      if (saleInfo) {
        // É um contrato de venda existente
        this.state.autoDetectedParams = saleInfo;
        const validationStatus = document.getElementById("validationStatus");
        if (validationStatus) {
          validationStatus.innerHTML = '<div class="alert alert-success alert-sm"><i class="bi bi-check-circle me-2"></i>Contrato de venda detectado! Clique em Validar.</div>';
        }
        return;
      }
    } catch (error) {
      console.log("Não foi possível detectar tipo de contrato:", error.message);
    }
  }

  /**
   * Detecta informações básicas de um token ERC20
   */
  async detectTokenInfo(tokenAddress) {
    try {
      if (!this.state.provider) return null;

      // ABI mínima para detectar token
      const tokenABI = ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)", "function totalSupply() view returns (uint256)"];

      const tokenContract = new ethers.Contract(tokenAddress, tokenABI, this.state.provider);

      // Tentar obter informações do token
      const name = await tokenContract.name();
      const symbol = await tokenContract.symbol();
      const decimals = await tokenContract.decimals();
      let totalSupply = null;
      try {
        const ts = await tokenContract.totalSupply();
        totalSupply = ts && ts.toString ? ts.toString() : String(ts);
      } catch (_) {}

      return {
        type: "token",
        name: name,
        symbol: symbol,
        decimals: decimals,
        address: tokenAddress,
        totalSupply: totalSupply,
      };
    } catch (error) {
      console.log("Não é um token ERC20 válido:", error.message);
      return null;
    }
  }

  /**
   * Detecta se é um contrato de venda existente
   */
  async detectSaleContract(contractAddress) {
    try {
      if (!this.state.provider) return null;

      // ABI mínima para detectar contrato de venda
      const saleABI = ["function token() view returns (address)", "function pricePerToken() view returns (uint256)", "function paymentToken() view returns (address)", "function minPurchase() view returns (uint256)", "function maxPurchase() view returns (uint256)"];

      const saleContract = new ethers.Contract(contractAddress, saleABI, this.state.provider);

      // Tentar obter informações do contrato de venda
      const token = await saleContract.token();
      const price = await saleContract.pricePerToken();
      const paymentToken = await saleContract.paymentToken();
      const minPurchase = await saleContract.minPurchase();
      const maxPurchase = await saleContract.maxPurchase();

      return {
        type: "sale",
        tokenAddress: token,
        pricePerToken: ethers.utils.formatEther(price),
        paymentToken: paymentToken,
        minPurchase: ethers.utils.formatEther(minPurchase),
        maxPurchase: ethers.utils.formatEther(maxPurchase),
        saleAddress: contractAddress,
      };
    } catch (error) {
      console.log("Não é um contrato de venda válido:", error.message);
      return null;
    }
  }

  /**
   * Mostra mensagem quando um token é detectado
   */
  showTokenDetectedMessage(tokenInfo) {
    const validationStatus = document.getElementById("validationStatus");
    if (validationStatus) {
      validationStatus.innerHTML = `
                <div class="alert alert-info alert-sm">
                    <strong>Token detectado!</strong><br>
                    <strong>${tokenInfo.name}</strong> (${tokenInfo.symbol})<br>
                    <button class="btn btn-sm btn-outline-primary mt-2" onclick="window.widgetSimple.createSaleForToken('${tokenInfo.address}')">
                        Criar Contrato de Venda
                    </button>
                </div>
            `;
    }
  }

  /**
   * Cria contrato de venda para um token detectado
   */
  async createSaleForToken(tokenAddress) {
    try {
      this.showLoading("Criando contrato de venda...");

      // Obter valores dos campos
      const tokenPriceInput = document.getElementById("tokenPrice");
      const pricePerToken = tokenPriceInput?.value || "0.01";

      // Obter carteira conectada ou pedir para conectar
      let walletAddress = await this.getConnectedWallet();
      if (!walletAddress) {
        // Tentar conectar carteira
        if (window.ethereum) {
          await window.ethereum.request({ method: "eth_requestAccounts" });
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          walletAddress = accounts[0];
        }
      }

      if (!walletAddress) {
        this.showError("Por favor, conecte sua carteira primeiro");
        return;
      }

      if (!pricePerToken || parseFloat(pricePerToken) <= 0) {
        this.showError("Por favor, informe um preço válido por token");
        return;
      }

      // Verificar se tem deployer disponível
      if (!this.state.contractDeployer) {
        this.showError("Sistema de deploy não disponível");
        return;
      }

      // Obter signer da carteira conectada
      const signer = this.state.provider.getSigner();

      // Criar contrato de venda
      const saleAddress = await this.state.contractDeployer.createSimpleSale(tokenAddress, pricePerToken, walletAddress, signer);

      // Atualizar campo com novo endereço
      const saleContractInput = document.getElementById("saleContract");
      if (saleContractInput) {
        saleContractInput.value = saleAddress;
      }

      // Limpar mensagem de token detectado
      const validationStatus = document.getElementById("validationStatus");
      if (validationStatus) {
        validationStatus.innerHTML = '<div class="alert alert-success alert-sm"><i class="bi bi-check-circle me-2"></i>Contrato de venda criado com sucesso!</div>';
      }

      this.showSuccess(`Contrato de venda criado! Endereço: ${saleAddress}`);

      // Atualizar preview
      this.showPreview();
    } catch (error) {
      console.error("Erro ao criar contrato de venda:", error);
      this.showError("Erro ao criar contrato de venda: " + error.message);
    } finally {
      this.hideLoading();
    }
  }

  /**
   * Copia endereço do contrato para área de transferência
   */
  handleCopyContract() {
    const saleContractInput = document.getElementById("saleContract");
    if (saleContractInput && saleContractInput.value) {
      if (window.copyToClipboard) {
        window.copyToClipboard(saleContractInput.value);
        this.showSuccess("Endereço copiado!");
      } else {
        // Fallback
        navigator.clipboard
          .writeText(saleContractInput.value)
          .then(() => this.showSuccess("Endereço copiado!"))
          .catch(() => this.showError("Erro ao copiar"));
      }
    }
  }

  /**
   * Limpa o formulário e reseta o estado
   */
  handleClearForm() {
    // Reset inputs
    const ids = ["saleContract", "tokenPrice", "minPurchase", "maxPurchase", "receiverWallet", "tokenContract"];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // Reset defaults
    const price = document.getElementById("tokenPrice");
    if (price) price.value = "0.01";

    // Clear validation status
    const validationStatus = document.getElementById("validationStatus");
    if (validationStatus) validationStatus.innerHTML = "";

    // Reset state
    this.state.contractValidated = false;
    this.state.autoDetectedParams = {};

    // Enable buttons
    const validateBtn = document.getElementById("validateBtn");
    if (validateBtn) {
      validateBtn.disabled = false;
      validateBtn.textContent = "Validar Contrato";
      validateBtn.classList.remove("btn-success");
      validateBtn.classList.add("btn-primary");
    }

    const goToStep5 = document.getElementById("goToStep5");
    if (goToStep5) goToStep5.disabled = true;

    // Reset preview
    this.showPreview();

    // Notify
    if (window.showFormSuccess) {
      window.showFormSuccess("Formulário limpo com sucesso!");
    }
  }

  /**
   * Valida o contrato informado
   */
  async handleContractValidation() {
    const saleContractInput = document.getElementById("saleContract");
    const blockchainSelect = document.getElementById("blockchain");
    const validationStatus = document.getElementById("validationStatus");
    const validateBtn = document.getElementById("validateBtn");

    if (!saleContractInput || !blockchainSelect || !validationStatus || !validateBtn) return;

    const contractAddress = String(saleContractInput.value || "").replace(/\s+$/u, "");
    const chainId = blockchainSelect.value;

    if (!contractAddress) {
      this.showError("Por favor, insira o endereço do contrato");
      return;
    }
    if (!chainId) {
      this.showError("Por favor, selecione uma blockchain");
      return;
    }
    if (!this.isValidEthereumAddress(contractAddress)) {
      this.showError("Endereço Ethereum inválido");
      return;
    }

    validateBtn.disabled = true;
    validateBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Validando...';
    validationStatus.innerHTML = '<div class="alert alert-info alert-sm"><i class="bi bi-hourglass-split me-2"></i>Validando contrato...</div>';

    try {
      let networkConfig = this.supportedNetworks[chainId];
      if (!networkConfig) {
        const selNet = typeof window !== "undefined" ? window.__selectedNetwork : null;
        const rpcUrl = selNet ? (Array.isArray(selNet.rpc) ? selNet.rpc[0] : selNet.rpc) : null;
        if (selNet && rpcUrl) {
          networkConfig = {
            name: selNet.name || `Chain ${selNet.chainId}`,
            symbol: selNet?.nativeCurrency?.symbol || "NATIVE",
            rpcUrl,
            explorer: (selNet?.explorers && (selNet.explorers[0]?.url || selNet.explorers[0])) || "",
          };
        }
      }
      if (!networkConfig || !networkConfig.rpcUrl) {
        throw new Error("Rede não suportada ou sem RPC válido");
      }
      this.state.provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);

      const validationResult = await this.validateContract(contractAddress, chainId);

      if (validationResult.isValid) {
        validationStatus.innerHTML = '<div class="alert alert-success alert-sm"><i class="bi bi-check-circle me-2"></i>Contrato válido! Parâmetros detectados automaticamente.</div>';
        this.state.contractValidated = true;
        this.state.autoDetectedParams = validationResult.params;
        this.state.purchaseFunctionName = validationResult.purchaseFunction && validationResult.purchaseFunction.name ? validationResult.purchaseFunction.name : "buy";
        this.populateAutoDetectedFields(validationResult.params);
        this.setReadonlyMode(true);
        try {
          const tokenAddr = validationResult?.params?.tokenContract;
          if (tokenAddr && tokenAddr !== ethers.constants.AddressZero) {
            const tokenInfo = await this.detectTokenInfo(tokenAddr);
            if (tokenInfo) {
              this.state.tokenInfo = tokenInfo;
            }
          }
        } catch (e) {}
        this.showPreview();
      } else {
        validationStatus.innerHTML = `<div class="alert alert-danger alert-sm"><i class="bi bi-x-circle me-2"></i>${validationResult.error}</div>`;
        this.state.contractValidated = false;
      }
    } catch (error) {
      console.error("Erro na validação:", error);
      validationStatus.innerHTML = `<div class="alert alert-danger alert-sm"><i class="bi bi-x-circle me-2"></i>Erro: ${error.message}</div>`;
      this.state.contractValidated = false;
    } finally {
      validateBtn.disabled = false;
      validateBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Validar';
    }
  }

  /**
   * Define o modo somente leitura para campos críticos
   */
  setReadonlyMode(enabled) {
    const saleContractInput = document.getElementById("saleContract");
    const validateBtn = document.getElementById("validateBtn");

    if (saleContractInput) {
      saleContractInput.readOnly = enabled;
      if (enabled) {
        saleContractInput.classList.add("bg-light");
        saleContractInput.title = "Para alterar, limpe o formulário";
      } else {
        saleContractInput.classList.remove("bg-light");
        saleContractInput.title = "";
      }
    }

    if (validateBtn) {
      validateBtn.disabled = enabled;
    }
  }

  /**
   * Manipula seleção de rede via componente
   */
  handleNetworkSelected(ev) {
    const net = ev?.detail?.network;
    if (!net) return;

    // Atualizar select oculto/visível se existir
    const blockchainSelect = document.getElementById("blockchain");
    if (blockchainSelect) {
      blockchainSelect.value = String(net.chainId);
      // Disparar change para atualizar símbolos
      this.handleBlockchainChange();
    }

    // Revelar grupo de contrato se estiver oculto
    const contractGroup = document.getElementById("contractGroup");
    if (contractGroup) {
      contractGroup.classList.remove("d-none");
    }
  }

  /**
   * Valida se o endereço Ethereum é válido
   */
  isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Valida o contrato e detecta parâmetros automaticamente
   */
  async validateContract(contractAddress, chainId) {
    try {
      // Verificar se o contrato existe
      const code = await this.state.provider.getCode(contractAddress);
      if (code === "0x") {
        return {
          isValid: false,
          error: "Contrato não encontrado neste endereço",
        };
      }

      // Tentar detectar ABI automaticamente
      let abi = await this.detectContractABI(contractAddress, chainId);
      if (!abi) {
        return {
          isValid: false,
          error: "Não foi possível obter a ABI do contrato",
        };
      }

      // Detectar parâmetros automaticamente
      const params = await this.autoDetectContractParams(contractAddress, abi, this.state.provider);

      // Verificar se tem função de compra
      const hasPurchaseFunction = this.detectPurchaseFunction(abi);
      if (!hasPurchaseFunction) {
        // Tentar identificar se é um ERC20/BEP20 puro para orientar o usuário
        try {
          const erc20Abi = [
            {
              inputs: [],
              name: "decimals",
              outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "symbol",
              outputs: [{ internalType: "string", name: "", type: "string" }],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "name",
              outputs: [{ internalType: "string", name: "", type: "string" }],
              stateMutability: "view",
              type: "function",
            },
          ];
          const tokenContract = new ethers.Contract(contractAddress, erc20Abi, this.state.provider);
          const [d, unusedS, unusedN] = await Promise.all([tokenContract.decimals().catch(() => null), tokenContract.symbol().catch(() => null), tokenContract.name().catch(() => null)]);
          if (d !== null) {
            return {
              isValid: false,
              error: "Endereço é um contrato ERC20/BEP20 sem função de compra. Informe o contrato de venda (TokenSale) ou crie um.",
            };
          }
        } catch (_) {}
        return {
          isValid: false,
          error: "Contrato não possui função de compra pública/payable",
        };
      }

      return {
        isValid: true,
        params: params,
        abi: abi,
        purchaseFunction: hasPurchaseFunction,
      };
    } catch (error) {
      console.error("Erro na validação do contrato:", error);
      return {
        isValid: false,
        error: `Erro ao validar contrato: ${error.message}`,
      };
    }
  }

  /**
   * Detecta ABI do contrato via Sourcify ou Etherscan
   */
  async detectContractABI(contractAddress, chainId) {
    try {
      const API_BASE = window.TOKENCAFE_API_BASE || window.XCAFE_API_BASE || "http://localhost:3000";
      const resp = await fetch(`${API_BASE}/api/explorer-getsourcecode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chainId, address: contractAddress }),
      });
      const js = await resp.json().catch(() => null);
      const abiStr = js?.explorer?.abi || "";
      if (abiStr && abiStr !== "Contract source code not verified") {
        try {
          const abi = JSON.parse(abiStr);
          if (Array.isArray(abi)) return abi;
        } catch (_) {}
      }

      // Retornar ABI mínima para contratos TokenSale padrão
      return this.getMinimalSaleABI();
    } catch (error) {
      console.warn("Não foi possível detectar ABI completa, usando ABI mínima:", error);
      return this.getMinimalSaleABI();
    }
  }

  /**
   * Retorna ABI mínima para contratos de venda padrão
   */
  getMinimalSaleABI() {
    return [
      {
        inputs: [],
        name: "saleToken",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "token",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "tokenAddress",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "getToken",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },

      // Receiver/wallet getters
      {
        inputs: [],
        name: "destinationWallet",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "wallet",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "receiver",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function",
      },

      // Price getters
      {
        inputs: [],
        name: "bnbPrice",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "pricePerToken",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "price",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "getPrice",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "tokenPrice",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },

      // Limits getters
      {
        inputs: [],
        name: "minPurchase",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "minimumPurchase",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "minAmount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "maxPurchase",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "maximumPurchase",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "maxAmount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
      {
        inputs: [],
        name: "perWalletCap",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },

      // Purchase functions (payable)
      {
        inputs: [{ internalType: "uint256", name: "quantity", type: "uint256" }],
        name: "buy",
        outputs: [],
        stateMutability: "payable",
        type: "function",
      },
    ];
  }

  /**
   * Detecta função de compra no contrato
   */
  detectPurchaseFunction(abi) {
    const purchaseFunctions = ["buy", "purchase", "buyTokens", "buyToken"];

    for (const funcName of purchaseFunctions) {
      const func = abi.find((f) => f.name === funcName && f.stateMutability === "payable");
      if (func) return func;
    }

    return null;
  }

  /**
   * Auto-detecta parâmetros do contrato
   */
  async autoDetectContractParams(contractAddress, abi, provider) {
    const results = {
      tokenContract: null,
      receiverWallet: null,
      pricePerToken: null,
      minPurchase: null,
      maxPurchase: null,
    };

    try {
      const contract = new ethers.Contract(contractAddress, abi, provider);

      // Detectar token de venda
      const tokenFunctions = ["saleToken", "token", "getToken", "tokenAddress"];
      for (const funcName of tokenFunctions) {
        try {
          results.tokenContract = await contract[funcName]();
          if (results.tokenContract && results.tokenContract !== ethers.constants.AddressZero) {
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Detectar carteira recebedora
      const walletFunctions = ["destinationWallet", "owner", "getOwner", "wallet", "receiver"];
      for (const funcName of walletFunctions) {
        try {
          results.receiverWallet = await contract[funcName]();
          if (results.receiverWallet && results.receiverWallet !== ethers.constants.AddressZero) {
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Detectar preço
      const priceFunctions = ["bnbPrice", "price", "getPrice", "tokenPrice", "pricePerToken"];
      for (const funcName of priceFunctions) {
        try {
          const price = await contract[funcName]();
          if (price && price.gt(0)) {
            results.pricePerToken = ethers.utils.formatEther(price);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Detectar limites
      const limitFunctions = ["minPurchase", "minimumPurchase", "minAmount"];
      for (const funcName of limitFunctions) {
        try {
          const min = await contract[funcName]();
          if (min && min.gt(0)) {
            results.minPurchase = min.toString();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      const maxLimitFunctions = ["maxPurchase", "maximumPurchase", "maxAmount", "perWalletCap"];
      for (const funcName of maxLimitFunctions) {
        try {
          const max = await contract[funcName]();
          if (max && max.gt(0)) {
            results.maxPurchase = max.toString();
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      console.warn("Erro na auto-detecção:", error);
    }

    return results;
  }

  /**
   * Preenche campos com parâmetros auto-detectados
   */
  populateAutoDetectedFields(params) {
    // Preço
    if (params.pricePerToken) {
      const tokenPriceInput = document.getElementById("tokenPrice");
      if (tokenPriceInput) {
        // Sempre atualiza o preço se detectado
        tokenPriceInput.value = params.pricePerToken;
      }
    }

    // Limites
    if (params.minPurchase) {
      const minPurchaseInput = document.getElementById("minPurchase");
      if (minPurchaseInput && !minPurchaseInput.value) {
        minPurchaseInput.value = params.minPurchase;
      }
    }

    if (params.maxPurchase) {
      const maxPurchaseInput = document.getElementById("maxPurchase");
      if (maxPurchaseInput && !maxPurchaseInput.value) {
        maxPurchaseInput.value = params.maxPurchase;
      }
    }
  }

  /**
   * Cria o HTML final do widget para ser usado no preview e no embed
   */
  createFinalWidgetHTML(config) {
    const currency = config.ui.currencySymbol || "BNB";
    const tokenName = (config.ui && (config.ui.tokenName || (config.ui.texts && config.ui.texts.title))) || "Token";
    const tokenSymbol = (config.ui && config.ui.tokenSymbol) || "XCAFE";
    const tokenDecimals = (config.ui && (config.ui.tokenDecimals ?? 18)) || 18;
    // Formatar "Disponível": prioriza totalSupply, depois maxPurchaseRaw, depois maxPurchase
    const availableRaw = (config.stats && config.stats.availableRaw) || (config.limits && (config.limits.maxPurchaseRaw || config.limits.maxPurchase)) || 0;
    const availableFormatted = this.formatTokenAmountDisplay(availableRaw, tokenDecimals);
    return `
            <div class="tc-widget tc-theme-light">
                <div class="tc-theme-toggle">
                    <span class="tc-toggle-label">Escolha o Tema:</span>
                    <button id="tcThemeLight" class="tc-toggle-btn active">Claro</button>
                    <button id="tcThemeDark" class="tc-toggle-btn">Escuro</button>
                </div>

                <div class="tc-card">
                    <div class="tc-card-header">
                        <div class="tc-card-title">
                            <span class="tc-title-icon">💰</span>
                            <span>Comprar Tokens</span>
                        </div>
                        <span class="tc-badge tc-badge-demo">DEMO</span>
                    </div>

                    <div class="tc-token-row">
                        <div class="tc-token-name">${tokenName}</div>
                        <span class="tc-chip">${tokenSymbol}</span>
                    </div>

                    <div class="tc-info-grid">
                        <div class="tc-info-item">
                            <div class="tc-info-label">Preço</div>
                            <div class="tc-info-value" id="previewPriceValue">${config.purchase.pricePerToken || 0} ${currency}</div>
                        </div>
                        <div class="tc-info-item">
                            <div class="tc-info-label">Disponível</div>
                            <div class="tc-info-value">${availableFormatted} Tokens</div>
                        </div>
                    </div>

                    <label class="tc-input-label">Quantidade de Tokens</label>
                    <div class="tc-input-group">
                        <input id="previewQuantity" type="number" class="tc-input" placeholder="100" min="${config.limits.minPurchase}" max="${config.limits.maxPurchase}" value="${config.limits.minPurchase}">
                        <span class="tc-input-suffix">Tokens</span>
                    </div>

                    <div class="tc-total-row">
                        <span class="tc-total-label">Total:</span>
                        <span class="tc-total-value" id="previewTotal">-- ${currency}</span>
                    </div>
                    <!-- Seletor de semântica de preço -->
                    <div class="tc-input-group mt-2">
                        <label for="priceSemanticsSelect" class="tc-input-label mb-1">Semântica de Preço</label>
                        <select id="priceSemanticsSelect" class="tc-input">
                            <option value="auto">Auto (detectar)</option>
                            <option value="A">Por token inteiro (A)</option>
                            <option value="B">Por unidade mínima (B)</option>
                        </select>
                    </div>

                    <div class="tc-connected" id="previewConnected">
                        <span class="tc-connected-icon">🟢</span>
                        <span class="tc-connected-text">Carteira não conectada</span>
                    </div>
                    <!-- Contêiner para mensagens dentro do widget -->
                    <div id="alertContainer" class="tc-alert-container mt-2"></div>
                    <div class="tc-purchase-status" id="purchaseStatus"></div>

                    <button id="previewBuyBtn" type="button" class="tc-btn-primary">
                        <span class="tc-btn-icon">🛒</span>
                        <span>${config.ui.texts.buyButton}</span>
                    </button>

                    <div class="tc-receipt d-none mt-3" id="purchaseReceipt">
                        <!-- Preenchido após compra -->
                    </div>

                    <!-- Painel de debug detalhado -->
                    <div class="tc-debug d-none mt-3" id="purchaseDebug">
                        <div class="tc-debug-title"><strong>Debug da Compra</strong></div>
                        <div class="tc-debug-content font-monospace small code-display max-height-240 overflow-auto border rounded p-2" id="purchaseDebugContent"></div>
                    </div>

                    <div class="tc-footer-note">
                        <div class="tc-safe">🔐 Transação segura via blockchain</div>
                        <div class="tc-developed">💻 Desenvolvido por xcafe.app</div>
                        <div class="tc-contract">Contrato: ${config.contracts.sale.substring(0, 6)}...${config.contracts.sale.substring(38)}</div>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Cria HTML de preview do widget
   */
  createWidgetPreviewHTML(config) {
    return `
            <div class="card-body rounded p-3">
                ${this.createFinalWidgetHTML(config)}
            </div>
        `;
  }

  /**
   * Renderiza preview do widget com base nos campos atuais
   */
  async showPreview() {
    const projectName = String(document.getElementById("projectName")?.value || "").replace(/\s+$/u, "") || "Widget de Venda";
    const chainIdStr = String(document.getElementById("blockchain")?.value || "").replace(/\s+$/u, "");
    const saleAddress = String(document.getElementById("saleContract")?.value || "").replace(/\s+$/u, "");
    const priceStr = String(document.getElementById("tokenPrice")?.value || "").replace(/\s+$/u, "");
    const minStr = String(document.getElementById("minPurchase")?.value || "").replace(/\s+$/u, "");
    const maxStr = String(document.getElementById("maxPurchase")?.value || "").replace(/\s+$/u, "");
    const buyButtonText = String(document.getElementById("buyButtonText")?.value || "").replace(/\s+$/u, "") || "Comprar Tokens";

    const chainId = chainIdStr ? parseInt(chainIdStr, 10) : 97;
    const currencySymbol = this.supportedNetworks[String(chainId)]?.symbol || "BNB";

    // Usa parâmetros auto-detectados como fallback
    const auto = this.state.autoDetectedParams || {};

    // Obter nome/símbolo do token via state ou detectar se possível
    let tokenName = (this.state.tokenInfo && this.state.tokenInfo.name) || projectName;
    let tokenSymbol = (this.state.tokenInfo && this.state.tokenInfo.symbol) || "XCAFE";
    let tokenDecimals = this.state.tokenInfo && this.state.tokenInfo.decimals;
    let tokenTotalSupplyRaw = this.state.tokenInfo && this.state.tokenInfo.totalSupply;
    try {
      const tokenAddr = auto?.tokenContract;
      if (!this.state.tokenInfo && tokenAddr && tokenAddr !== ethers.constants.AddressZero && this.state.provider) {
        const info = await this.detectTokenInfo(tokenAddr);
        if (info) {
          this.state.tokenInfo = info;
          tokenName = info.name || tokenName;
          tokenSymbol = info.symbol || tokenSymbol;
          tokenDecimals = typeof info.decimals === "number" ? info.decimals : tokenDecimals;
          tokenTotalSupplyRaw = info.totalSupply || tokenTotalSupplyRaw;
        }
      }
    } catch (e) {
      console.warn("Preview: não foi possível detectar token info:", e);
    }

    const config = {
      network: { chainId },
      contracts: {
        sale: saleAddress || auto.saleContract || "0x0000000000000000000000000000000000000000",
        token: auto.tokenContract || ethers.constants.AddressZero,
      },
      purchase: {
        pricePerToken: priceStr ? Number(priceStr) : auto.pricePerToken || 0,
        functionName: this.state.purchaseFunctionName || "buy",
      },
      limits: {
        minPurchase: minStr ? Number(minStr) : auto.minPurchase || 1,
        maxPurchase: maxStr ? Number(maxStr) : auto.maxPurchase || 1000000,
        // Preservar valores crus auto-detectados (unidades do token) para formatação correta
        minPurchaseRaw: auto.minPurchase || null,
        maxPurchaseRaw: auto.maxPurchase || null,
      },
      stats: {
        availableRaw: tokenTotalSupplyRaw || auto.maxPurchase || null,
      },
      ui: {
        currencySymbol,
        tokenName,
        tokenSymbol,
        tokenDecimals: typeof tokenDecimals === "number" ? tokenDecimals : 18,
        texts: {
          title: projectName,
          description: "Use o botão abaixo para comprar seus tokens.",
          buyButton: buyButtonText,
        },
      },
    };

    const previewEl = document.getElementById("widgetPreview") || document.querySelector(".tokencafe-widget");
    const previewCard = document.getElementById("previewCard");
    if (previewEl) {
      // Persistir config e contêiner ativo
      try {
        this.state.widgetConfig = config;
      } catch (_) {}
      try {
        this.state.activeWidgetContainer = previewEl;
      } catch (_) {}

      previewEl.innerHTML = this.createFinalWidgetHTML(config);

      // Atualizar total estimado baseado no preço manual
      const qtyEl = document.getElementById("previewQuantity");
      const totalEl = document.getElementById("previewTotal");
      const priceEl = document.getElementById("previewPriceValue");
      const currency = config.ui.currencySymbol || "BNB";
      const updateTotal = () => {
        const qty = parseFloat(qtyEl?.value || "0");
        const price = Number(config.purchase.pricePerToken || 0);
        if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
          if (totalEl) totalEl.textContent = `-- ${currency}`;
          return;
        }
        const total = qty * price;
        if (totalEl) totalEl.textContent = `${total.toFixed(2)} ${currency}`;
        if (priceEl) priceEl.textContent = `${price} ${currency}`;
      };
      updateTotal();
      if (qtyEl) qtyEl.addEventListener("input", updateTotal);

      // Estado de conexão da carteira
      const connectedEl = this.state.activeWidgetContainer?.querySelector("#previewConnected") || document.getElementById("previewConnected");
      this.getConnectedWallet()
        .then((addr) => {
          if (addr && connectedEl) {
            const short = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
            connectedEl.innerHTML = `<span class="tc-connected-icon">🟢</span><span class="tc-connected-text">Conectado: ${short}</span>`;
            // Atualizar status de compra prévia
            this.updatePurchaseStatusBadge(config, addr).catch(() => {});
          }
        })
        .catch(() => {});

      // Seletor de semântica de preço (persistir no estado)
      try {
        const semanticsEl = this.state.activeWidgetContainer?.querySelector("#priceSemanticsSelect") || document.getElementById("priceSemanticsSelect");
        if (semanticsEl) {
          const current = (this.state && this.state.priceSemantics) || "auto";
          semanticsEl.value = current;
          semanticsEl.addEventListener("change", (e) => {
            try {
              this.state.priceSemantics = String(e.target.value || "auto");
            } catch (_) {}
            try {
              this.appendDebug(`Semântica selecionada=${this.state.priceSemantics}`);
            } catch (_) {}
          });
        }
      } catch (_) {}

      // Botão de compra
      const buyBtn = this.state.activeWidgetContainer?.querySelector("#previewBuyBtn") || document.getElementById("previewBuyBtn");
      if (buyBtn) {
        // Desabilitar inicialmente até confirmar função de compra
        buyBtn.disabled = true;
        buyBtn.classList.add("tc-btn-disabled");
        // Detectar função de compra a partir do ABI real (se disponível)
        (async () => {
          try {
            const realAbi = await this.detectContractABI(config.contracts.sale, String(config.network.chainId || 97));
            const purchaseFn = this.detectPurchaseFunction(realAbi || []);
            if (!purchaseFn) {
              this.showWarning('Contrato informado não possui função de compra pública/payable. Use um contrato de venda (TokenSale) ou crie um via "Criar venda".');
              return; // mantém desabilitado
            }
            this.state.purchaseFunctionName = purchaseFn.name;
            buyBtn.disabled = false;
            buyBtn.classList.remove("tc-btn-disabled");
          } catch (e) {
            console.warn("Preview: não foi possível confirmar função de compra:", e);
            // Mantém desabilitado se não houver confirmação
          }
        })();
        buyBtn.addEventListener("click", (e) => {
          e.preventDefault();
          try {
            buyBtn.disabled = true;
            buyBtn.classList.add("tc-btn-disabled");
            this.handlePreviewBuy(config)
              .catch(() => {})
              .finally(() => {
                buyBtn.disabled = false;
                buyBtn.classList.remove("tc-btn-disabled");
              });
          } catch (_) {
            buyBtn.disabled = false;
            buyBtn.classList.remove("tc-btn-disabled");
          }
        });
      }

      // Alternância de tema
      const container = previewEl.querySelector(".tc-widget");
      const btnLight = document.getElementById("tcThemeLight");
      const btnDark = document.getElementById("tcThemeDark");
      const setTheme = (theme) => {
        if (!container) return;
        container.classList.remove("tc-theme-light", "tc-theme-dark");
        container.classList.add(theme === "dark" ? "tc-theme-dark" : "tc-theme-light");
        if (btnLight && btnDark) {
          btnLight.classList.toggle("active", theme !== "dark");
          btnDark.classList.toggle("active", theme === "dark");
        }
      };
      if (btnLight) btnLight.addEventListener("click", () => setTheme("light"));
      if (btnDark) btnDark.addEventListener("click", () => setTheme("dark"));
    }
    if (previewCard) {
      previewCard.style.display = "block";
    }

    // Atualizar preview de código
    this.updateCodePreview(config);
  }

  /**
   * Atualiza os campos de código gerado (HTML/Embed)
   */
  updateCodePreview(config) {
    const codeBlock = document.getElementById("generatedCode");
    const embedBlock = document.getElementById("generatedEmbed");

    if (codeBlock) {
      // Exemplo de código para integração via Script
      const scriptCode = `<!-- Widget TokenCafe -->
<div id="tokencafe-widget-${Date.now()}"></div>
<script>
  (function() {
    const config = ${JSON.stringify(config, null, 2)};
    // Integração simplificada
    console.log("Widget Config:", config);
  })();
</script>`;
      codeBlock.value = scriptCode;
    }

    if (embedBlock) {
      const encoded = encodeURIComponent(JSON.stringify(config));
      const embedCode = `<iframe src="https://tokencafe.app/embed?config=${encoded}" width="400" height="600" frameborder="0"></iframe>`;
      embedBlock.value = embedCode;
    }
  }

  /**
   * Compra via preview usando MetaMask + ethers.js
   */
  async handlePreviewBuy(config) {
    try {
      // Resetar estado de erros anteriores para consolidação posterior
      try {
        this.state.lastEstimateError = null;
      } catch (_) {}
      // Garantir ethers.js disponível
      if (typeof ethers === "undefined") {
        await this.loadEthersJS();
      }
      if (typeof ethers === "undefined") {
        this.showError("Biblioteca blockchain não carregada. Tente recarregar a página.");
        return;
      }
      if (!window.ethereum) {
        this.showError("Carteira não encontrada. Instale Metamask/Trust Wallet.");
        return;
      }
      // Validar se o contrato possui função de compra pública/payable usando ABI real quando possível
      try {
        const realAbi = await this.detectContractABI(config.contracts.sale, String(config.network.chainId || 97));
        const purchaseFn = this.detectPurchaseFunction(realAbi || []);
        if (!purchaseFn) {
          this.showError('Este endereço não expõe função de compra pública/payable. Provavelmente é um contrato ERC20. Selecione o endereço do contrato de venda ou crie um com "Criar venda".');
          return;
        }
        // Persistir nome da função detectada para uso consistente
        this.state.purchaseFunctionName = purchaseFn.name;
      } catch (_) {
        // Continua com checagens posteriores; erros aqui não devem travar se a carteira/chain ainda não estiver pronta
      }
      // Conectar carteira
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const account = accounts && accounts[0];
      if (!account) {
        this.showError("Não foi possível obter a conta da carteira.");
        return;
      }
      // Garantir chain correta
      const targetChainIdDec = config.network.chainId || 97;
      const targetChainIdHex = "0x" + Number(targetChainIdDec).toString(16);
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      if (currentChainId !== targetChainIdHex) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetChainIdHex }],
          });
        } catch (switchErr) {
          // tentar adicionar cadeia
          const net = this.supportedNetworks[String(targetChainIdDec)] || {};
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: targetChainIdHex,
                  chainName: net.name || `Chain ${targetChainIdDec}`,
                  nativeCurrency: {
                    name: net.symbol || "NATIVE",
                    symbol: net.symbol || "NATIVE",
                    decimals: 18,
                  },
                  rpcUrls: [net.rpcUrl].filter(Boolean),
                  blockExplorerUrls: [net.explorer].filter(Boolean),
                },
              ],
            });
          } catch (addErr) {
            console.warn("Falha ao adicionar/switch chain:", addErr);
            this.showError("Troca de rede falhou. Selecione BSC Testnet (97) na carteira.");
            return;
          }
        }
      }
      // Provider + signer
      const web3 = new ethers.providers.Web3Provider(window.ethereum);
      const signer = web3.getSigner();
      const saleAddress = config.contracts.sale;
      if (!this.isValidEthereumAddress(saleAddress)) {
        this.showError("Endereço do contrato inválido.");
        return;
      }
      // Pré-checagem: confirmar que há código no endereço na rede atual
      try {
        const code = await web3.getCode(saleAddress);
        try {
          this.appendDebug(`getCode(${saleAddress}) len=${(code || "").length}`);
        } catch (_) {}
        if (!code || code === "0x") {
          try {
            this.appendDebug("Endereço sem bytecode. Provavelmente não é contrato nesta rede.");
          } catch (_) {}
          this.showError("Contrato não implantado nesta rede ou endereço incorreto. Verifique a rede selecionada e o endereço do contrato.");
          return;
        }
      } catch (codeErr) {
        console.warn("Falhou ao obter código do contrato:", codeErr);
        try {
          this.appendDebug(`Falha getCode: ${codeErr?.message || codeErr}`);
        } catch (_) {}
        // Prosseguir apenas se o provider respondeu; caso contrário, avisar o usuário
        if (codeErr && codeErr.message && codeErr.message.includes("403")) {
          this.showError("RPC recusou a requisição (403). Troque o endpoint RPC da rede na carteira ou configure uma API key válida.");
          return;
        }
      }
      // Definir ABI mínima e contrato
      // quantidade e valor (usar BigNumber para evitar erros de precisão)
      const qtyEl = document.getElementById("previewQuantity");
      const qtyRaw = qtyEl && qtyEl.value ? String(qtyEl.value).replace(/\s+$/u, "") : "";
      const qtyInt = parseInt(qtyRaw, 10);
      if (!Number.isFinite(qtyInt) || qtyInt <= 0) {
        this.showError("Informe uma quantidade de tokens inteira e válida.");
        return;
      }
      const priceStr = (config.purchase.pricePerToken || "0").toString();
      let priceWeiPerToken = null;
      let priceFromContract = false;
      // Tentar obter preço on-chain (bnbPrice). Se falhar, usar preço manual do formulário.
      try {
        const onChainPrice = await new ethers.Contract(
          saleAddress,
          [
            {
              inputs: [],
              name: "bnbPrice",
              outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          web3,
        ).bnbPrice();
        if (onChainPrice && onChainPrice.gt(0)) {
          // No contrato TokenSale, bnbPrice representa o preço por token (em wei).
          // Assim, o valor total em wei deve ser calculado como:
          // valueWei = bnbPrice * quantidadeInteiraDeTokens
          priceWeiPerToken = onChainPrice;
          priceFromContract = true;
        }
      } catch (_) {}
      if (!priceWeiPerToken) {
        if (!priceStr || priceStr === "0") {
          this.showError("Preço por token não definido. Preencha o campo preço.");
          return;
        }
        try {
          priceWeiPerToken = ethers.utils.parseEther(priceStr);
          priceFromContract = false; // preço manual é por token inteiro
        } catch (convErr) {
          this.showError("Preço inválido. Use número decimal (ex.: 0.01).");
          return;
        }
      }
      const qtyBN = ethers.BigNumber.from(qtyInt.toString());
      // Detectar decimals do token para converter quantidade para unidades mínimas
      const ERC20_DECIMALS_ABI = [
        {
          inputs: [],
          name: "decimals",
          outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
          stateMutability: "view",
          type: "function",
        },
      ];
      const getTokenDecimals = async (address, provider) => {
        try {
          if (!address || !this.isValidEthereumAddress(address)) return 18;
          const token = new ethers.Contract(address, ERC20_DECIMALS_ABI, provider);
          const d = await token.decimals();
          const n = typeof d === "number" ? d : d?.toNumber ? d.toNumber() : parseInt(String(d));
          return Number.isFinite(n) ? n : 18;
        } catch (_) {
          return 18;
        }
      };
      const decimals = await getTokenDecimals(config.contracts.token, web3);
      const unitFactor = ethers.BigNumber.from(10).pow(decimals);
      const qtyUnitsBN = qtyBN.mul(unitFactor);
      // Preparar dois candidatos de valor, para compatibilizar diferentes semânticas de preço:
      // A) preço por token inteiro -> value = priceWeiPerToken * qtyBN
      // B) preço por unidade mínima -> value = priceWeiPerToken * qtyUnitsBN
      let valueWeiCandidateA = priceWeiPerToken.mul(qtyBN);
      let valueWeiCandidateB = priceWeiPerToken.mul(qtyUnitsBN);
      let valueWei = valueWeiCandidateA; // padrão: por token inteiro
      // Guard de sanidade: prevenir valores absurdos (ex.: 1e33 wei)
      try {
        const valueEth = Number(ethers.utils.formatEther(valueWei));
        if (!Number.isFinite(valueEth) || valueEth <= 0) {
          this.showError("Valor estimado inválido. Verifique preço e quantidade.");
          console.groupEnd();
          return;
        }
        if (valueEth > 1000) {
          // limite prático para evitar erro de saldo
          this.showError(`Total estimado muito alto (${valueEth.toFixed(4)} ${config.ui.currencySymbol}). Verifique preço/quantidade e configuração do contrato.`);
          console.groupEnd();
          return;
        }
      } catch (_) {}
      const fnName = config.purchase.functionName || "buy";
      const abi = this.getMinimalSaleABI();
      const contract = new ethers.Contract(saleAddress, abi, signer);
      const purchaseDef = abi.find((f) => f.name === fnName);
      const requiresArg = !!(purchaseDef && Array.isArray(purchaseDef.inputs) && purchaseDef.inputs.length > 0);
      // Determinar semântica correta do preço tentando callStatic com candidatos
      // Determinar semântica do preço (Auto/A/B)
      const semanticsPref = (((this.state && this.state.priceSemantics) || "Auto") + "").toUpperCase();
      if (semanticsPref === "A") {
        valueWei = valueWeiCandidateA;
        console.log("Semântica de preço forçada: A (por token inteiro)");
        try {
          this.appendDebug(`Semântica preço=A (forçada), valueWei=${valueWei.toString()}`);
        } catch (_) {}
      } else if (semanticsPref === "B") {
        valueWei = valueWeiCandidateB;
        console.log("Semântica de preço forçada: B (por unidade mínima)");
        try {
          this.appendDebug(`Semântica preço=B (forçada), valueWei=${valueWei.toString()}`);
        } catch (_) {}
      } else {
        // Auto: tentar A primeiro, depois B
        try {
          if (requiresArg) {
            await contract.callStatic[fnName](qtyUnitsBN, {
              value: valueWeiCandidateA,
            });
            valueWei = valueWeiCandidateA;
          } else {
            await contract.callStatic[fnName]({ value: valueWeiCandidateA });
            valueWei = valueWeiCandidateA;
          }
          console.log("Semântica de preço selecionada: por token inteiro (A)");
          try {
            this.appendDebug(`Semântica preço=A, valueWei=${valueWei.toString()}`);
          } catch (_) {}
        } catch (tryAErr) {
          try {
            if (requiresArg) {
              await contract.callStatic[fnName](qtyUnitsBN, {
                value: valueWeiCandidateB,
              });
              valueWei = valueWeiCandidateB;
            } else {
              await contract.callStatic[fnName]({ value: valueWeiCandidateB });
              valueWei = valueWeiCandidateB;
            }
            console.log("Semântica de preço selecionada: por unidade mínima (B)");
            try {
              this.appendDebug(`Semântica preço=B, valueWei=${valueWei.toString()}`);
            } catch (_) {}
          } catch (tryBErr) {
            // Nenhum candidato funcionou; manter A por padrão e seguir para estimativa com tratamento de erro
            console.warn("Falha ao confirmar semântica de preço via callStatic. Prosseguindo com candidato A.", tryBErr);
            try {
              this.appendDebug(`Falha callStatic A/B: A=${tryAErr?.message || tryAErr}, B=${tryBErr?.message || tryBErr}`);
            } catch (_) {}
            valueWei = valueWeiCandidateA;
          }
        }
      }
      console.group("WidgetSimple: Compra Debug");
      console.log("Rede alvo (dec):", targetChainIdDec);
      console.log("Rede atual (hex):", currentChainId);
      console.log("Contrato de venda:", saleAddress);
      console.log("Função de compra:", fnName);
      console.log("Assinatura exige argumento?:", requiresArg);
      console.log("Quantidade (int):", qtyInt);
      console.log("Quantidade (BN):", qtyBN.toString());
      console.log("Token decimals:", decimals);
      console.log("Quantidade em unidades (BN):", qtyUnitsBN.toString());
      console.log("Preço por token (str):", priceStr);
      console.log("Preço base (wei):", priceWeiPerToken.toString());
      console.log("Origem do preço:", priceFromContract ? "on-chain" : "manual");
      console.log("Valor total (wei) selecionado:", valueWei.toString());
      // Log opcional: tentar codificar os dados da chamada para facilitar troubleshooting
      try {
        const encodedData = contract.interface.encodeFunctionData(fnName, requiresArg ? [qtyUnitsBN] : []);
        console.log("Dados da chamada (selector + args):", encodedData);
      } catch (encErr) {
        console.warn("Não foi possível codificar função", fnName, encErr?.message || encErr);
      }

      // Pré-checagens de limites do contrato (se disponíveis)
      const tryRead = async (names) => {
        for (const n of names) {
          if (typeof contract[n] === "function") {
            try {
              const v = await contract[n]();
              if (v && v.gt && v.gt(0)) return v;
            } catch (_) {}
          }
        }
        return null;
      };

      const minBN = await tryRead(["minPurchase", "minimumPurchase", "minAmount"]);
      const maxBN = await tryRead(["maxPurchase", "maximumPurchase", "maxAmount", "perWalletCap"]);
      console.log("Limite mínimo (BN):", minBN ? minBN.toString() : "n/a");
      console.log("Limite máximo (BN):", maxBN ? maxBN.toString() : "n/a");
      if (minBN && qtyUnitsBN.lt(minBN)) {
        this.showError(`Quantidade abaixo do mínimo permitido (${minBN.toString()}).`);
        console.groupEnd();
        return;
      }
      if (maxBN && qtyUnitsBN.gt(maxBN)) {
        this.showError(`Quantidade acima do máximo permitido (${maxBN.toString()}).`);
        console.groupEnd();
        return;
      }
      // Chamar função de compra
      this.showLoading("Estimando gas e enviando transação...");
      let tx;
      try {
        // Estimar gas antes de enviar
        let gasEstimate;
        if (requiresArg) {
          try {
            this.appendDebug("Estimando gas...");
          } catch (_) {}
          gasEstimate = await contract.estimateGas[fnName](qtyUnitsBN, {
            value: valueWei,
          });
        } else {
          try {
            this.appendDebug("Estimando gas...");
          } catch (_) {}
          gasEstimate = await contract.estimateGas[fnName]({ value: valueWei });
        }
        const gasLimit = gasEstimate.mul(120).div(100); // +20% buffer
        console.log("Gas estimado:", gasEstimate.toString());
        console.log("Gas limit (buffer +20%):", gasLimit.toString());
        try {
          this.appendDebug(`gasEstimate=${gasEstimate.toString()} gasLimit=${gasLimit.toString()}`);
        } catch (_) {}
        // Enviar com gasLimit calculado
        if (requiresArg) {
          tx = await contract[fnName](qtyUnitsBN, {
            value: valueWei,
            gasLimit,
          });
        } else {
          tx = await contract[fnName]({ value: valueWei, gasLimit });
        }
        try {
          this.appendDebug(`tx enviada hash=${tx?.hash || "n/a"}`);
        } catch (_) {}
      } catch (estimateErr) {
        console.warn("Estimativa de gas falhou, tentando detectar motivo via callStatic:", estimateErr);
        try {
          this.state.lastEstimateError = estimateErr;
        } catch (_) {}
        try {
          this.appendDebug(`Falha estimativa: code=${estimateErr?.code} msg=${estimateErr?.message}`);
        } catch (_) {}
        try {
          if (requiresArg) {
            await contract.callStatic[fnName](qtyUnitsBN, { value: valueWei });
          } else {
            await contract.callStatic[fnName]({ value: valueWei });
          }
          // Se callStatic não reverteu, enviar com gasLimit padrão
          const fallbackGas = ethers.BigNumber.from("500000");
          console.log("callStatic passou; usando gas fallback:", fallbackGas.toString());
          try {
            this.appendDebug(`callStatic OK; gas fallback=${fallbackGas.toString()}`);
          } catch (_) {}
          if (requiresArg) {
            tx = await contract[fnName](qtyUnitsBN, {
              value: valueWei,
              gasLimit: fallbackGas,
            });
          } else {
            tx = await contract[fnName]({
              value: valueWei,
              gasLimit: fallbackGas,
            });
          }
          try {
            this.appendDebug(`tx enviada (fallback) hash=${tx?.hash || "n/a"}`);
          } catch (_) {}
        } catch (staticErr) {
          console.error("Execução simulada reverteu:", staticErr);
          try {
            this.appendDebug(`callStatic revert: code=${staticErr?.code} msg=${staticErr?.message}`);
          } catch (_) {}
          const msg = staticErr && staticErr.message ? staticErr.message : String(staticErr);
          const httpStatus = (staticErr && staticErr.data && staticErr.data.httpStatus) || (staticErr && staticErr.error && staticErr.error.data && staticErr.error.data.httpStatus);
          if (httpStatus === 403) {
            this.showError('RPC recusou a requisição (403). Troque o endpoint RPC da rede na carteira ou configure uma API key válida. Você também pode desativar "Transaction Simulation" nas configurações da carteira e tentar novamente.');
            this.hideLoading();
            console.groupEnd();
            return;
          }
          if (msg.includes("insufficient funds")) {
            this.showError("Saldo insuficiente para a transação. Verifique seu saldo de TBnb/BNB para gas.");
          } else if (msg.includes("execution reverted")) {
            this.showError("Execução revertida pelo contrato. Verifique regras de compra (mín/máx, status da venda, whitelist).");
          } else if (msg.includes("missing revert data") || msg.includes("CALL_EXCEPTION")) {
            this.showError("Chamada reverteu sem motivo. Verifique rede/ABI/endereço do contrato e se a função é payable com o valor enviado.");
          } else {
            this.showError("Não foi possível estimar/enviar. Verifique rede, saldo e regras do contrato.");
          }
          this.hideLoading();
          console.groupEnd();
          return;
        }
      }
      const receipt = await tx.wait();
      this.hideLoading();
      if (receipt && receipt.status === 1) {
        const txHash = receipt.transactionHash || "";
        const explorerUrl = this.getExplorerTxUrl(targetChainIdDec, txHash);
        const linkHtml = explorerUrl ? `<a href="${explorerUrl}" target="_blank" rel="noopener">${txHash.substring(0, 10)}...</a>` : txHash.substring(0, 10) + "...";
        this.showSuccess("Compra realizada com sucesso! TX: " + linkHtml);
        // Renderizar recibo persistente no widget
        try {
          const receiptEl = document.getElementById("purchaseReceipt");
          if (receiptEl) {
            receiptEl.style.display = "block";
            const gasUsed = receipt.gasUsed && receipt.gasUsed.toString ? receipt.gasUsed.toString() : String(receipt.gasUsed || "");
            receiptEl.innerHTML = `
                            <div class="tc-receipt-row"><strong>Transação:</strong> ${linkHtml}</div>
                            <div class="tc-receipt-row"><strong>Bloco:</strong> ${receipt.blockNumber ?? "--"}</div>
                            <div class="tc-receipt-row"><strong>Gas usado:</strong> ${gasUsed || "--"}</div>
                        `;
          }
        } catch (_) {}
        try {
          this.appendDebug(`receipt OK status=${receipt?.status} gasUsed=${receipt?.gasUsed?.toString?.() || receipt?.gasUsed} block=${receipt?.blockNumber}`);
        } catch (_) {}
        console.log("Transação confirmada:", txHash);
        console.groupEnd();
      } else {
        this.showWarning("Transação enviada, mas sem status de sucesso.");
        try {
          this.appendDebug("receipt status=0 ou ausente");
        } catch (_) {}
        // Post-mortem: tentar obter motivo do revert através de uma chamada estática no mesmo bloco
        try {
          const fnName = config.purchase.functionName || "buy";
          const abi = this.getMinimalSaleABI();
          const iface = new ethers.utils.Interface(abi);
          const requiresArg = !!abi.find((f) => f.name === fnName)?.inputs?.length;
          const encoded = iface.encodeFunctionData(fnName, requiresArg ? [qtyUnitsBN] : []);
          const callReq = {
            to: saleAddress,
            from: account,
            data: encoded,
            value: valueWei,
          };
          await web3.call(callReq, receipt.blockNumber);
        } catch (pmErr) {
          try {
            const dataHex = pmErr?.data || pmErr?.error?.data || pmErr?.receipt?.revertReason || "";
            const decoded = this.decodeRevertReason(String(dataHex || ""));
            if (decoded) {
              this.showWarning(`Motivo do revert: ${decoded}`);
              try {
                this.appendDebug(`post-mortem revert reason: ${decoded}`);
              } catch (_) {}
            } else {
              try {
                this.appendDebug(`post-mortem sem motivo decodificável; raw=${dataHex?.toString?.() || dataHex}`);
              } catch (_) {}
            }
          } catch (_) {}
        }
        console.groupEnd();
      }
    } catch (err) {
      console.error("Erro na compra:", err);
      this.hideLoading();
      try {
        this.appendDebug(`Erro geral preview buy: ${err?.message || err}`);
      } catch (_) {}
      // Post-mortem quando tx.wait lança CALL_EXCEPTION com receipt.status=0
      try {
        const hasReceipt = !!(err && err.receipt);
        const statusZero = hasReceipt && err.receipt.status === 0;
        const isCallException = err && (String(err.message || "").includes("CALL_EXCEPTION") || String(err.code || "").includes("CALL_EXCEPTION"));
        if (statusZero && isCallException) {
          try {
            this.appendDebug("Iniciando post-mortem via eth_call (status=0)");
          } catch (_) {}
          const fnName = config.purchase.functionName || "buy";
          const abi = this.getMinimalSaleABI();
          const iface = new ethers.utils.Interface(abi);
          const requiresArg = !!abi.find((f) => f.name === fnName)?.inputs?.length;
          const encoded = iface.encodeFunctionData(fnName, requiresArg ? [qtyUnitsBN] : []);
          const callReq = {
            to: saleAddress,
            from: account,
            data: encoded,
            value: valueWei,
          };
          try {
            await web3.call(callReq, err.receipt.blockNumber);
            try {
              this.appendDebug("eth_call não reverteu; possivelmente falha de execução ao minerar.");
            } catch (_) {}
          } catch (pmErr) {
            const dataHex = pmErr?.data || pmErr?.error?.data || pmErr?.receipt?.revertReason || "";
            const decoded = this.decodeRevertReason(String(dataHex || ""));
            if (decoded) {
              this.showWarning(`Motivo do revert: ${decoded}`);
              try {
                this.appendDebug(`post-mortem revert reason: ${decoded}`);
              } catch (_) {}
            } else {
              try {
                this.appendDebug(`post-mortem sem motivo decodificável; raw=${dataHex?.toString?.() || dataHex}`);
              } catch (_) {}
            }
          }
        }
      } catch (_) {}
      // Consolidar erros de estimativa e de execução numa mensagem única
      const estimateErr = (this.state && this.state.lastEstimateError) || null;
      const estimatePart = estimateErr ? "Estimativa de gas falhou (UNPREDICTABLE_GAS_LIMIT / -32603)." : "";
      const execPart = err && err.message ? err.message : String(err || "");
      const isCallException = execPart.includes("CALL_EXCEPTION") || execPart.includes("execution reverted");
      const receiptStatus0 = err && err.receipt && err.receipt.status === 0;
      let combined = "";
      if (estimatePart) {
        combined += estimatePart + " ";
      }
      combined += isCallException || receiptStatus0 ? "Transação revertida pelo contrato (CALL_EXCEPTION). Possíveis causas: valor enviado não cobre o preço/decimais, limites de compra, venda não ativa, ou insuficiência de saldo. " : "Falha ao enviar transação. ";
      combined += "Detalhe: " + execPart;
      this.showError(combined);
      try {
        console.groupEnd();
      } catch (_) {}
    }
  }

  /**
   * Manipula submissão do formulário
   */
  async handleFormSubmit(event) {
    event.preventDefault();

    if (!this.state.contractValidated) {
      this.showError("Por favor, valide o contrato antes de prosseguir");
      return;
    }

    const generateBtn = document.getElementById("generateBtn");
    if (generateBtn) {
      generateBtn.disabled = true;
      generateBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Gerando...';
    }

    try {
      // Gerar configuração final do widget
      const config = this.generateWidgetConfig();
      this.state.widgetConfig = config;

      // Salvar widget no servidor
      const result = await this.saveWidgetToServer(config);

      if (result.success) {
        // Mostrar código embed com owner/code
        this.showEmbedCode(result);
        this.showSuccess("Widget criado e salvo no servidor!");
      } else {
        // Fallback para ambiente sem backend: ainda mostrar embed e orientar download
        this.showEmbedCode({ owner: config.owner, code: config.code });
        if (String(result.error).includes("Flask") || String(result.error).includes("conectar ao servidor")) {
          this.showWarning('Servidor Flask não disponível. Use "Download JSON" para salvar manualmente.');
        } else {
          this.showError(result.error || "Erro ao salvar widget");
        }
      }
    } catch (error) {
      console.error("Erro ao gerar widget:", error);
      this.showError(`Erro ao gerar widget: ${error.message}`);
    } finally {
      if (generateBtn) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="bi bi-rocket-takeoff me-2"></i>Gerar Widget';
      }
    }
  }

  /**
   * Salva widget no servidor via API
   */
  async saveWidgetToServer(config) {
    try {
      const onFlask = window.location.port === "5000";
      const apiUrl = onFlask ? "/api/widget/save" : "http://localhost:5000/api/widget/save";
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        mode: onFlask ? "same-origin" : "cors",
        body: JSON.stringify({
          owner: config.owner,
          code: config.code,
          config: config,
        }),
      });

      const ct = response.headers.get("content-type") || "";
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Falha ${response.status}: ${text.slice(0, 120)}...`);
      }
      if (!ct.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Resposta não-JSON da API. Conteúdo inicial: ${text.slice(0, 80)}...`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Erro ao salvar widget:", error);
      let errorMessage = error.message;
      if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
        errorMessage = "Não foi possível conectar ao servidor. Verifique se o servidor Flask (backend) está em execução e tente novamente.";
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Mostra código para incorporar o widget
   */
  showEmbedCode(result) {
    const embedCard = document.getElementById("embedCard");
    const embedCode = document.getElementById("embedCode");

    if (!embedCard || !embedCode) return;

    // Determinar owner e code a partir da configuração atual
    const owner = (this.state.widgetConfig && this.state.widgetConfig.owner) || (result && result.owner) || "";
    const code = (this.state.widgetConfig && this.state.widgetConfig.code) || (result && result.code) || "";

    // Snippet alinhado ao loader do TokenCafe
    // O loader busca o JSON em /widget/gets/<owner>/<code>.json
    const embedScript = `<div class="tokencafe-widget"\n       data-owner="${owner}"\n       data-code="${code}"></div>\n<script src="/assets/tokencafe-widget.min.js"><\/script>`;

    embedCode.textContent = embedScript;
    embedCard.style.display = "block";
    embedCard.scrollIntoView({ behavior: "smooth" });

    // Além de exibir o código, montar/atualizar um preview "live"
    try {
      // Se estamos na página de criação do widget, reutilize o container oficial de preview
      const builderPreview = document.getElementById("widgetPreview");
      let containerEl = builderPreview;
      // Caso não exista (outra página), use um container dedicado no body
      if (!containerEl) {
        const body = document.querySelector("body");
        if (body) {
          let live = document.getElementById("liveEmbedPreview");
          if (!live) {
            live = document.createElement("div");
            live.id = "liveEmbedPreview";
            live.style.margin = "24px auto";
            live.style.maxWidth = "480px";
            body.appendChild(live);
          }
          containerEl = live;
        }
      }
      if (containerEl) {
        // Configuração local como fallback
        let cfg = this.state.widgetConfig || this.generateWidgetConfig();

        // Renderizar inicialmente com a configuração local
        containerEl.innerHTML = this.createFinalWidgetHTML(cfg);

        // Função auxiliar para ligar handlers do preview
        const attachHandlers = (configForHandlers) => {
          const qtyEl = containerEl.querySelector("#previewQuantity");
          const totalEl = containerEl.querySelector("#previewTotal");
          const priceEl = containerEl.querySelector("#previewPriceValue");
          const buyBtn = containerEl.querySelector("#previewBuyBtn");
          const connectedEl = containerEl.querySelector("#previewConnected");

          const currency = (configForHandlers.ui && configForHandlers.ui.currencySymbol) || "BNB";
          const updateTotal = () => {
            const qty = parseFloat(qtyEl?.value || "0");
            const price = Number(configForHandlers.purchase.pricePerToken || 0);
            if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price) || price <= 0) {
              if (totalEl) totalEl.textContent = `-- ${currency}`;
              return;
            }
            const total = qty * price;
            if (totalEl) totalEl.textContent = `${total.toFixed(2)} ${currency}`;
            if (priceEl) priceEl.textContent = `${price} ${currency}`;
          };
          if (qtyEl) {
            qtyEl.addEventListener("input", updateTotal);
          }
          updateTotal();

          if (connectedEl) {
            this.getConnectedWallet()
              .then((addr) => {
                if (addr) {
                  const short = addr.substring(0, 6) + "..." + addr.substring(addr.length - 4);
                  connectedEl.innerHTML = `<span class="tc-connected-icon">🟢</span><span class="tc-connected-text">Conectado: ${short}</span>`;
                  // Atualizar badge de status de compra (saldo/limite) ao conectar
                  try {
                    this.updatePurchaseStatusBadge(configForHandlers, addr);
                  } catch (_) {}
                }
              })
              .catch(() => {});
          }

          if (buyBtn) {
            buyBtn.addEventListener("click", (e) => {
              e.preventDefault();
              try {
                buyBtn.disabled = true;
                buyBtn.classList.add("tc-btn-disabled");
                this.handlePreviewBuy(configForHandlers)
                  .catch(() => {})
                  .finally(() => {
                    buyBtn.disabled = false;
                    buyBtn.classList.remove("tc-btn-disabled");
                  });
              } catch (_) {
                // fallback para garantir reabilitação
                buyBtn.disabled = false;
                buyBtn.classList.remove("tc-btn-disabled");
              }
            });
          }
        };

        // Ligar handlers para o preview inicial
        attachHandlers(cfg);

        // Se houver owner/code, tentar carregar JSON salvo do servidor e re-renderizar
        if (owner && code) {
          const jsonUrl = `/widget/gets/${owner}/${code}.json`;
          fetch(jsonUrl, {
            cache: "no-store",
            headers: { Accept: "application/json" },
          })
            .then((resp) => {
              if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
              const ct = resp.headers.get("content-type") || "";
              if (!ct.includes("application/json")) throw new Error("Conteúdo não-JSON");
              return resp.json();
            })
            .then((serverCfg) => {
              // Atualizar estado e re-renderizar com JSON salvo
              try {
                this.state.widgetConfig = serverCfg;
              } catch (_) {}
              cfg = serverCfg;
              containerEl.innerHTML = this.createFinalWidgetHTML(cfg);
              attachHandlers(cfg);
            })
            .catch((err) => {
              console.warn("Falha ao carregar JSON salvo. Mantendo preview local.", err);
            });
        }
      }
    } catch (err) {
      console.warn("Não foi possível montar preview live:", err);
    }
  }

  /**
   * Manipha cópia de código
   */
  /**
   * Copia o código de incorporação (embed)
   */
  handleCopyEmbed() {
    const embedCode = document.getElementById("embedCode");
    if (embedCode && embedCode.textContent) {
      if (window.copyToClipboard) {
        window.copyToClipboard(embedCode.textContent);
        this.showSuccess("Código de incorporação copiado!");
      } else {
        navigator.clipboard
          .writeText(embedCode.textContent)
          .then(() => this.showSuccess("Código de incorporação copiado!"))
          .catch(() => this.showError("Erro ao copiar código"));
      }
    }
  }

  /**
   * Copia a configuração do widget (JSON)
   */
  handleCopyCode() {
    const config = this.state.widgetConfig || this.generateWidgetConfig();
    const json = JSON.stringify(config, null, 2);

    if (window.copyToClipboard) {
      window.copyToClipboard(json);
      this.showSuccess("Configuração (JSON) copiada!");
    } else {
      navigator.clipboard
        .writeText(json)
        .then(() => {
          this.showSuccess("Configuração (JSON) copiada!");
        })
        .catch((err) => {
          console.error("Erro ao copiar:", err);
          this.showError("Erro ao copiar configuração");
        });
    }
  }

  /**
   * Manipha download de JSON
   */
  handleDownloadJson() {
    if (!this.state.widgetConfig || Object.keys(this.state.widgetConfig).length === 0) {
      this.showError("Nenhuma configuração disponível para download");
      return;
    }

    const jsonString = JSON.stringify(this.state.widgetConfig, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `widget-${this.state.widgetConfig.code}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showSuccess("Configuração baixada com sucesso!");
  }

  /**
   * Gera código único para o widget
   */
  generateWidgetCode() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "").slice(0, 15);
    const random = Math.random().toString(36).substring(2, 8);
    return `tc-${timestamp}-${random}`;
  }

  /**
   * Obtém endereço do usuário atual (placeholder)
   */
  getCurrentUserAddress() {
    // Implementar conexão com carteira para obter endereço real
    // Por enquanto, retorna um endereço padrão ou do localStorage
    return localStorage.getItem("userAddress") || "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";
  }

  /**
   * Gera a configuração do widget a partir do estado atual do formulário
   */
  generateWidgetConfig() {
    // Leitura dos inputs atuais
    const chainIdStr = String(document.getElementById("blockchain")?.value || "").replace(/\s+$/u, "");
    const saleAddressInput = String(document.getElementById("saleContract")?.value || "").replace(/\s+$/u, "");
    const priceStr = String(document.getElementById("tokenPrice")?.value || "").replace(/\s+$/u, "");
    const minStr = String(document.getElementById("minPurchase")?.value || "").replace(/\s+$/u, "");
    const maxStr = String(document.getElementById("maxPurchase")?.value || "").replace(/\s+$/u, "");
    const buyButtonText = String(document.getElementById("buyButtonText")?.value || "").replace(/\s+$/u, "");
    const projectName = String(document.getElementById("projectName")?.value || "").replace(/\s+$/u, "");

    // Fallbacks do estado (auto-detectados durante a validação)
    const auto = this.state?.autoDetectedParams || {};
    const chainId = chainIdStr ? parseInt(chainIdStr, 10) : 97;
    const currencySymbol = this.supportedNetworks[String(chainId)]?.symbol || "BNB";

    // Endereços de contrato: usa o input ou fallsback para auto-detectado
    const saleAddress = saleAddressInput || auto.saleContract || "0x0000000000000000000000000000000000000000";
    const tokenAddress = auto.tokenContract || "0x0000000000000000000000000000000000000000";

    // Preço e limites: usa input quando presente, senão usa auto-detectado
    const pricePerToken = priceStr ? parseFloat(priceStr) : auto.pricePerToken ? Number(auto.pricePerToken) : 0;
    const minPurchase = minStr ? parseFloat(minStr) : auto.minPurchase ? Number(auto.minPurchase) : 0;
    const maxPurchase = maxStr ? parseFloat(maxStr) : auto.maxPurchase ? Number(auto.maxPurchase) : 0;

    const tokenInfo = this.state?.tokenInfo || {};

    const config = {
      version: "1.0",
      code: this.generateWidgetCode(),
      owner: this.getCurrentUserAddress(),
      createdAt: new Date().toISOString(),
      network: { chainId },
      contracts: { sale: saleAddress, token: tokenAddress },
      purchase: {
        pricePerToken,
        functionName: this.state.purchaseFunctionName || "buy",
      },
      limits: {
        minPurchase,
        maxPurchase,
        // Preservar valores crus auto-detectados (unidades do token) para formatação correta
        minPurchaseRaw: auto.minPurchase || null,
        maxPurchaseRaw: auto.maxPurchase || null,
      },
      stats: {
        availableRaw: tokenInfo.totalSupply || auto.maxPurchase || null,
      },
      ui: {
        currencySymbol,
        tokenName: tokenInfo.name || projectName || "Widget de Venda",
        tokenSymbol: tokenInfo.symbol || "XCAFE",
        tokenDecimals: typeof tokenInfo.decimals === "number" ? tokenInfo.decimals : 18,
        texts: {
          title: projectName || "Widget de Venda",
          description: "Widget gerado via TokenCafe",
          buyButton: buyButtonText || "Comprar Tokens",
        },
      },
    };

    return config;
  }

  /**
   * Formata valores de tokens evitando notação científica e respeitando os decimais do token.
   * - Se receber string numérica (unidades do token), converte para "tokens" usando os decimais.
   * - Se receber number, aplica formatação local com até 6 casas.
   */
  formatTokenAmountDisplay(amount, decimals = 18) {
    try {
      if (amount === null || amount === undefined) return "0";
      // String com apenas dígitos => unidades do token
      if (typeof amount === "string" && /^\d+$/.test(amount)) {
        const base = BigInt(10) ** BigInt(decimals);
        const big = BigInt(amount);
        const integerPart = big / base;
        const remainder = big % base;
        let integerStr = integerPart.toString();
        // Agrupamento de milhares (pt-BR) usando ponto
        integerStr = integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        if (remainder === 0n) return integerStr;
        const remStrFull = remainder.toString().padStart(decimals, "0");
        const remTrim = remStrFull.slice(0, 6).replace(/0+$/, "");
        return remTrim ? `${integerStr},${remTrim}` : integerStr;
      }
      // Number comum
      if (typeof amount === "number") {
        return amount.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
      }
      // Fallback: tentar converter para número
      const num = Number(amount);
      if (Number.isFinite(num)) {
        return num.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
      }
      return String(amount);
    } catch (_) {
      return String(amount);
    }
  }

  /**
   * Mostra mensagem de erro
   */
  showError(message) {
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify(String(message || ""), "error", { container });
        return;
      }
      console.error(message);
    } catch (_) {}
  }

  /**
   * Mostra mensagem de sucesso
   */
  showSuccess(message) {
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify(String(message || ""), "success", { container });
        return;
      }
      console.log(message);
    } catch (_) {}
  }

  /**
   * Mostra mensagem de aviso
   */
  // Mensagens padronizadas: usa notify para avisos
  showWarning(message) {
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify(String(message || ""), "warning", { container });
        return;
      }
      console.warn(message);
    } catch (_) {}
  }

  /**
   * Acrescenta uma linha ao painel de debug do widget e no console
   */
  appendDebug(message) {
    try {
      const root = this.state?.activeWidgetContainer || document;
      const container = (root.querySelector ? root.querySelector("#purchaseDebug") : null) || document.getElementById("purchaseDebug");
      const content = (root.querySelector ? root.querySelector("#purchaseDebugContent") : null) || document.getElementById("purchaseDebugContent");
      const ts = new Date().toISOString().replace("T", " ").replace("Z", "");
      const line = `[${ts}] ${message}`;
      console.log(line);
      if (container && content) {
        container.style.display = "block";
        const div = document.createElement("div");
        div.textContent = line;
        content.appendChild(div);
        // manter tamanho razoável
        const maxLines = 200;
        while (content.childNodes.length > maxLines) {
          content.removeChild(content.firstChild);
        }
        // scroll automático para o fim
        content.scrollTop = content.scrollHeight;
      }
    } catch (_) {}
  }

  /**
   * Decodifica motivo de revert a partir de dados hex retornados por provider.call
   */
  decodeRevertReason(dataHex) {
    try {
      if (!dataHex || typeof dataHex !== "string") return null;
      const hex = dataHex.startsWith("0x") ? dataHex : "0x" + dataHex;
      if (hex.length < 10) return null;
      const selector = hex.slice(0, 10).toLowerCase();
      if (selector === "0x08c379a0") {
        // Error(string)
        const reasonArr = ethers.utils.defaultAbiCoder.decode(["string"], "0x" + hex.slice(10));
        const reason = Array.isArray(reasonArr) ? reasonArr[0] : reasonArr;
        return reason && reason.toString ? reason.toString() : String(reason || "");
      }
      if (selector === "0x4e487b71") {
        // Panic(uint256)
        const code = ethers.BigNumber.from("0x" + hex.slice(10)).toString();
        return `panic code ${code}`;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Mostra loading
   */
  showLoading(message = "Processando...") {
    const root = this.state?.activeWidgetContainer || document;
    const loadingContainer = (root.querySelector ? root.querySelector("#loadingContainer") || root.querySelector("#alertContainer") : null) || document.getElementById("loadingContainer") || document.getElementById("alertContainer");
    if (loadingContainer) {
      loadingContainer.innerHTML = `<div class="alert alert-info" role="alert">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                ${message}
            </div>`;
    }
  }

  /**
   * Esconde loading
   */
  hideLoading() {
    const root = this.state?.activeWidgetContainer || document;
    const loadingContainer = (root.querySelector ? root.querySelector("#loadingContainer") || root.querySelector("#alertContainer") : null) || document.getElementById("loadingContainer") || document.getElementById("alertContainer");
    if (loadingContainer) {
      loadingContainer.innerHTML = "";
    }
  }

  /**
   * Obtém endereço da carteira conectada
   */
  async getConnectedWallet() {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        return accounts[0] || null;
      }
      return null;
    } catch (error) {
      console.error("Erro ao obter carteira conectada:", error);
      return null;
    }
  }

  /**
   * Gera URL do explorer para uma transação (`txHash`) na rede (`chainId`).
   * Retorna string vazia se a rede não for conhecida.
   */
  getExplorerTxUrl(chainId, txHash) {
    try {
      const base = (this.supportedNetworks && this.supportedNetworks[String(chainId)] && this.supportedNetworks[String(chainId)].explorer) || "";
      if (base) {
        const clean = base.replace(/\/$/, "");
        return `${clean}/tx/${txHash}`;
      }
      if (String(chainId) === "97") return `https://testnet.bscscan.com/tx/${txHash}`;
      if (String(chainId) === "56") return `https://bscscan.com/tx/${txHash}`;
    } catch (_) {}
    return "";
  }

  /**
   * Atualiza o badge de status de compra prévia mostrando:
   * - Saldo de token ERC-20 da carteira
   * - Limite por carteira (perWalletCap), quando disponível
   */
  async updatePurchaseStatusBadge(config, address) {
    try {
      if (typeof ethers === "undefined") return;
      const statusEl = document.getElementById("purchaseStatus");
      if (!statusEl) return;
      const chainId = config?.network?.chainId || 97;
      const rpc = (this.supportedNetworks && this.supportedNetworks[String(chainId)] && this.supportedNetworks[String(chainId)].rpcUrl) || "";
      const provider = this.state.provider || (rpc ? new ethers.providers.JsonRpcProvider(rpc) : null);
      if (!provider) return;

      // Ler perWalletCap (se disponível)
      let cap = null;
      try {
        const sale = new ethers.Contract(config.contracts.sale, this.getMinimalSaleABI(), provider);
        const v = await sale.perWalletCap();
        if (v && v.gt && v.gt(0)) cap = v;
      } catch (_) {}

      // Ler saldo ERC20 do usuário
      let balance = null;
      let decimals = 18;
      try {
        const tokenAddr = config.contracts.token;
        if (tokenAddr && this.isValidEthereumAddress(tokenAddr) && tokenAddr !== ethers.constants.AddressZero) {
          const ERC20_ABI = [
            {
              inputs: [{ internalType: "address", name: "account", type: "address" }],
              name: "balanceOf",
              outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [],
              name: "decimals",
              outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
              stateMutability: "view",
              type: "function",
            },
          ];
          const token = new ethers.Contract(tokenAddr, ERC20_ABI, provider);
          const d = await token.decimals();
          decimals = typeof d === "number" ? d : (d?.toNumber ? d.toNumber() : parseInt(String(d))) || 18;
          const b = await token.balanceOf(address);
          if (b && b.gt && b.gt(0)) balance = b;
        }
      } catch (_) {}

      if (!balance && !cap) {
        statusEl.textContent = "";
        return;
      }
      // Mensagens
      if (balance) {
        const balanceFmt = this.formatTokenAmountDisplay(balance.toString(), decimals);
        statusEl.innerHTML = `<div class="tc-badge tc-badge-info">Carteira já possui ${balanceFmt} ${config.ui.tokenSymbol || "tokens"}</div>`;
      }
      if (balance && cap && balance.gte && balance.gte(cap)) {
        statusEl.innerHTML += `<div class="tc-badge tc-badge-warning">Limite por carteira atingido</div>`;
      }
    } catch (_) {}
  }
}

// Instanciar e expor no window para uso externo
const widgetSimple = new WidgetSimple();
window.widgetSimple = widgetSimple;
export { WidgetSimple };
export default widgetSimple;
