/**
 * RPC Simple - Sistema simplificado para adicionar redes ao MetaMask
 * Baseado na análise do ChainList.org e API wallet_addEthereumChain
 *
 * Este módulo fornece funcionalidades para:
 * - Verificar se redes estão registradas no MetaMask
 * - Adicionar novas redes ao MetaMask
 * - Gerenciar RPCs de redes existentes
 * - Obter informações sobre redes populares
 */

class RPCSimple {
  constructor() {
    // Verifica se o MetaMask está instalado no navegador
    this.isMetaMaskInstalled = this.checkMetaMaskInstallation();
    // Armazena o Chain ID da rede atual
    this.currentChainId = null;
    // Inicializa o sistema
    this.init();
  }

  /**
   * Verifica se o MetaMask está instalado no navegador
   * @returns {boolean} True se o MetaMask estiver instalado
   */
  checkMetaMaskInstallation() {
    return typeof window !== "undefined" && typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
  }

  /**
   * Inicializa o sistema RPC
   * Configura listeners para mudanças de rede e obtém a rede atual
   */
  async init() {
    if (!this.isMetaMaskInstalled) {
      console.warn("MetaMask não está instalado");
      return;
    }

    // Escuta mudanças de rede no MetaMask
    window.ethereum.on("chainChanged", (chainId) => {
      this.currentChainId = chainId;
      this.onChainChanged(chainId);
    });

    // Obtém a rede atual do MetaMask
    try {
      this.currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
    } catch (error) {
      console.error("Erro ao obter chain ID:", error);
    }
  }

  /**
   * Conecta com o MetaMask e solicita acesso às contas
   * @returns {string|null} Endereço da primeira conta ou null se falhar
   */
  async connectWallet() {
    if (!this.isMetaMaskInstalled) {
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify("MetaMask não está instalado. Por favor, instale o MetaMask para continuar.", "error", { container });
        } else {
          console.error("MetaMask não está instalado. Por favor, instale o MetaMask para continuar.");
        }
      } catch (_) {}
      window.open("https://metamask.io/download/", "_blank");
      return null;
    }

    try {
      // Solicita acesso às contas do MetaMask
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      return accounts[0];
    } catch (error) {
      console.error("Erro ao conectar carteira:", error);
      return null;
    }
  }

  /**
   * Adiciona uma nova rede ao MetaMask usando wallet_addEthereumChain
   * Implementação baseada no ChainList.org
   * @param {Object} networkData - Dados da rede a ser adicionada
   * @param {string} networkData.chainId - Chain ID da rede
   * @param {string} networkData.chainName - Nome da rede
   * @param {Object} networkData.nativeCurrency - Moeda nativa da rede
   * @param {Array} networkData.rpcUrls - URLs dos RPCs da rede
   * @param {Array} [networkData.blockExplorerUrls] - URLs dos exploradores de bloco
   */
  async addNetwork(networkData) {
    if (!this.isMetaMaskInstalled) {
      throw new Error("MetaMask não está instalado");
    }

    // Valida e formata os dados da rede
    const validatedData = this.validateNetworkData(networkData);

    try {
      // Primeiro tenta trocar para a rede (caso já exista)
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: validatedData.chainId }],
      });
    } catch (switchError) {
      // Se a rede não existe (erro 4902), adiciona ela
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [validatedData],
          });
        } catch (addError) {
          console.error("Erro ao adicionar rede:", addError);
          throw addError;
        }
      } else {
        console.error("Erro ao trocar rede:", switchError);
        throw switchError;
      }
    }
  }

  /**
   * Valida e formata os dados da rede
   */
  validateNetworkData(networkData) {
    const { chainId, chainName, nativeCurrency, rpcUrls, blockExplorerUrls } = networkData;

    // Valida campos obrigatórios
    if (!chainId || !chainName || !nativeCurrency || !rpcUrls) {
      throw new Error("Dados da rede incompletos");
    }

    // Formata chainId para hexadecimal se necessário
    const formattedChainId = typeof chainId === "string" && chainId.startsWith("0x") ? chainId : `0x${parseInt(chainId).toString(16)}`;

    return {
      chainId: formattedChainId,
      chainName: chainName,
      nativeCurrency: {
        name: nativeCurrency.name,
        symbol: nativeCurrency.symbol,
        decimals: nativeCurrency.decimals || 18,
      },
      rpcUrls: Array.isArray(rpcUrls) ? rpcUrls : [rpcUrls],
      blockExplorerUrls: blockExplorerUrls ? (Array.isArray(blockExplorerUrls) ? blockExplorerUrls : [blockExplorerUrls]) : undefined,
    };
  }

  /**
   * Cria um link direto para adicionar rede (similar ao ChainList)
   */
  generateAddNetworkLink(networkData) {
    const params = new URLSearchParams({
      chainId: networkData.chainId,
      chainName: networkData.chainName,
      nativeCurrency: JSON.stringify(networkData.nativeCurrency),
      rpcUrls: JSON.stringify(networkData.rpcUrls),
      blockExplorerUrls: networkData.blockExplorerUrls ? JSON.stringify(networkData.blockExplorerUrls) : "",
    });

    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  }

  /**
   * Processa parâmetros da URL para adicionar rede automaticamente
   */
  async processUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has("chainId")) {
      const networkData = {
        chainId: urlParams.get("chainId"),
        chainName: urlParams.get("chainName"),
        nativeCurrency: JSON.parse(urlParams.get("nativeCurrency") || "{}"),
        rpcUrls: JSON.parse(urlParams.get("rpcUrls") || "[]"),
        blockExplorerUrls: urlParams.get("blockExplorerUrls") ? JSON.parse(urlParams.get("blockExplorerUrls")) : undefined,
      };

      try {
        await this.addNetwork(networkData);
        // Remove parâmetros da URL após adicionar
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error("Erro ao processar parâmetros da URL:", error);
      }
    }
  }

  /**
   * Obtém informações da rede atual
   */
  async getCurrentNetwork() {
    if (!this.isMetaMaskInstalled) return null;

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      return {
        chainId: chainId,
        chainIdDecimal: parseInt(chainId, 16),
        accounts: accounts,
        isConnected: accounts.length > 0,
      };
    } catch (error) {
      console.error("Erro ao obter rede atual:", error);
      return null;
    }
  }

  /**
   * Callback para mudanças de rede
   */
  onChainChanged(chainId) {
    console.log("Rede alterada para:", chainId);
    // Pode ser sobrescrito por implementações específicas
  }

  /**
   * Redes populares pré-configuradas (baseado no ChainList)
   */
  getPopularNetworks() {
    return {
      // Mainnets
      ethereum: {
        chainId: "0x1",
        chainName: "Ethereum Mainnet",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://mainnet.infura.io/v3/"],
        blockExplorerUrls: ["https://etherscan.io"],
      },
      polygon: {
        chainId: "0x89",
        chainName: "Polygon Mainnet",
        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
        rpcUrls: ["https://polygon-rpc.com/"],
        blockExplorerUrls: ["https://polygonscan.com"],
      },
      bsc: {
        chainId: "0x38",
        chainName: "BNB Smart Chain",
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        rpcUrls: ["https://bsc-dataseed.binance.org/"],
        blockExplorerUrls: ["https://bscscan.com"],
      },
      arbitrum: {
        chainId: "0xa4b1",
        chainName: "Arbitrum One",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: ["https://arb1.arbitrum.io/rpc"],
        blockExplorerUrls: ["https://arbiscan.io"],
      },
      avalanche: {
        chainId: "0xa86a",
        chainName: "Avalanche C-Chain",
        nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
        rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
        blockExplorerUrls: ["https://snowtrace.io"],
      },
      // Testnets
      sepolia: {
        chainId: "0xaa36a7",
        chainName: "Sepolia Testnet",
        nativeCurrency: { name: "Sepolia Ether", symbol: "SEP", decimals: 18 },
        rpcUrls: ["https://sepolia.infura.io/v3/"],
        blockExplorerUrls: ["https://sepolia.etherscan.io"],
      },
      goerli: {
        chainId: "0x5",
        chainName: "Goerli Testnet",
        nativeCurrency: { name: "Goerli Ether", symbol: "GoETH", decimals: 18 },
        rpcUrls: ["https://goerli.infura.io/v3/"],
        blockExplorerUrls: ["https://goerli.etherscan.io"],
      },
      mumbai: {
        chainId: "0x13881",
        chainName: "Polygon Mumbai",
        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
        rpcUrls: ["https://rpc-mumbai.maticvigil.com/"],
        blockExplorerUrls: ["https://mumbai.polygonscan.com"],
      },
      bscTestnet: {
        chainId: "0x61",
        chainName: "BNB Smart Chain Testnet",
        nativeCurrency: { name: "tBNB", symbol: "tBNB", decimals: 18 },
        rpcUrls: ["https://data-seed-prebsc-1-s1.binance.org:8545/"],
        blockExplorerUrls: ["https://testnet.bscscan.com"],
      },
      arbitrumGoerli: {
        chainId: "0x66eed",
        chainName: "Arbitrum Goerli",
        nativeCurrency: { name: "AGOR", symbol: "AGOR", decimals: 18 },
        rpcUrls: ["https://goerli-rollup.arbitrum.io/rpc"],
        blockExplorerUrls: ["https://goerli.arbiscan.io"],
      },
      fuji: {
        chainId: "0xa869",
        chainName: "Avalanche Fuji Testnet",
        nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
        rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
        blockExplorerUrls: ["https://testnet.snowtrace.io"],
      },
    };
  }

  /**
   * Adiciona uma rede popular pré-configurada ao MetaMask
   * @param {string} networkKey - Chave da rede popular (ex: 'polygon', 'bsc', etc.)
   * @returns {Promise} Promise que resolve quando a rede for adicionada
   */
  async addPopularNetwork(networkKey) {
    const networks = this.getPopularNetworks();
    const network = networks[networkKey];

    if (!network) {
      throw new Error(`Rede '${networkKey}' não encontrada`);
    }

    return await this.addNetwork(network);
  }

  /**
   * Verifica se uma rede específica está cadastrada no MetaMask
   * Utiliza o método wallet_switchEthereumChain para testar a existência da rede
   * @param {string} chainId - Chain ID da rede em formato hexadecimal (ex: '0x1')
   * @returns {boolean} True se a rede estiver cadastrada, false caso contrário
   */
  async isNetworkRegistered(chainId) {
    if (!this.checkMetaMaskInstallation()) {
      return false;
    }

    try {
      // Tenta trocar para a rede para verificar se existe
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainId }],
      });
      return true;
    } catch (error) {
      // Se erro 4902, a rede não existe no MetaMask
      if (error.code === 4902) {
        return false;
      }
      // Se erro 4001, usuário rejeitou mas a rede existe
      if (error.code === 4001) {
        return true;
      }
      // Para outros erros, assumimos que a rede não existe
      return false;
    }
  }

  /**
   * Carrega dados das redes do arquivo rpcs.json ou backend
   * @returns {Promise<Array>} Lista de entradas de RPCs
   */
  async loadRpcsData() {
    try {
      // Preferir fonte local; backend apenas se habilitado
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
        } catch {}
      }
      const entries = Array.isArray(data?.rpcs) ? data.rpcs : Array.isArray(data) ? data : [];
      return entries;
    } catch (error) {
      console.error("Erro ao carregar rpcs.json:", error);
      return [];
    }
  }

  /**
   * Busca uma rede específica no rpcs.json pelo chainId
   * @param {number} chainId - Chain ID da rede (decimal)
   * @returns {Promise<Object|null>} Dados da rede ou null se não encontrada
   */
  async findNetworkInRpcs(chainId) {
    try {
      const entries = await this.loadRpcsData();
      // Normalizar e buscar por chainId
      const getId = (e) => Number(e?.chainId ?? e?.id);
      const match = entries.find((e) => getId(e) === Number(chainId));
      if (!match) return null;
      // Adaptar estrutura mínima
      const rpc = Array.isArray(match?.rpcs) ? match.rpcs.map((r) => (typeof r === "string" ? r : r?.url || r?.rpc || r?.endpoint || "")) : Array.isArray(match?.rpc) ? match.rpc.map((r) => (typeof r === "string" ? r : r?.url || "")) : typeof match?.url === "string" ? [match.url] : [];
      return {
        chainId: Number(chainId),
        name: match?.name || match?.chainName || `Chain ${chainId}`,
        nativeCurrency: match?.nativeCurrency || {
          name: "Unknown",
          symbol: match?.symbol || "UNKNOWN",
          decimals: 18,
        },
        rpc,
      };
    } catch (error) {
      console.error("Erro ao buscar rede no rpcs.json:", error);
      return null;
    }
  }

  /**
   * Obtém RPCs de uma rede do rpcs.json
   * @param {number} chainId - Chain ID da rede (decimal)
   * @returns {Promise<Array>} Lista de RPCs da rede
   */
  async getRpcsFromRpcs(chainId) {
    try {
      const networkData = await this.findNetworkInRpcs(chainId);
      if (!networkData || !networkData.rpc) {
        return [];
      }

      return networkData.rpc
        .map((rpc, index) => {
          // Se o RPC é um objeto com URL
          if (typeof rpc === "object" && rpc.url) {
            return {
              url: rpc.url,
              name: `RPC ${index + 1}`,
              tracking: rpc.tracking || "unknown",
              isOpenSource: rpc.isOpenSource || false,
              public: true,
            };
          }
          // Se o RPC é apenas uma string
          else if (typeof rpc === "string") {
            return {
              url: rpc,
              name: `RPC ${index + 1}`,
              tracking: "unknown",
              isOpenSource: false,
              public: true,
            };
          }
          return null;
        })
        .filter((rpc) => rpc !== null);
    } catch (error) {
      console.error("Erro ao obter RPCs do rpcs.json:", error);
      return [];
    }
  }

  /**
   * Obtém lista de RPCs para uma rede específica
   * Agora integrado com rpcs.json como fonte principal
   * @param {string|number} chainId - Chain ID da rede
   * @returns {Promise<Array>} Lista de RPCs disponíveis
   */
  async getNetworkRpcs(chainId) {
    // Converte chainId para decimal se necessário
    const chainIdDecimal = typeof chainId === "string" && chainId.startsWith("0x") ? parseInt(chainId, 16) : parseInt(chainId);

    try {
      // Primeiro tenta obter do rpcs.json (fonte principal)
      const chainsRpcs = await this.getRpcsFromRpcs(chainIdDecimal);

      if (chainsRpcs.length > 0) {
        console.log(`Encontrados ${chainsRpcs.length} RPCs no rpcs.json para chainId ${chainIdDecimal}`);
        return chainsRpcs;
      }

      // Se não encontrou no rpcs.json, usa lista hardcoded como fallback
      console.log(`Usando RPCs hardcoded para chainId ${chainIdDecimal}`);
      return this.getHardcodedNetworkRpcs(chainId);
    } catch (error) {
      console.error("Erro ao obter RPCs da rede:", error);
      // Em caso de erro, usa lista hardcoded
      return this.getHardcodedNetworkRpcs(chainId);
    }
  }

  /**
   * Obtém RPCs do MetaMask para uma rede específica
   * Agora com melhor detecção usando wallet_getPermissions
   * @param {string} chainId - Chain ID da rede em formato hexadecimal
   * @returns {Promise<Array>} Lista de RPCs do MetaMask
   */
  async getMetaMaskRpcsForNetwork(chainId) {
    if (!this.checkMetaMaskInstallation()) {
      return [];
    }

    try {
      // Primeiro verifica se a rede está cadastrada
      const isRegistered = await this.isNetworkRegistered(chainId);
      if (!isRegistered) {
        return [];
      }

      // Tenta obter informações mais detalhadas do MetaMask
      try {
        // Verifica se é a rede atual
        const currentNetwork = await this.getCurrentNetwork();
        if (currentNetwork && currentNetwork.chainId === chainId) {
          // Para a rede atual, podemos obter mais informações
          const provider = window.ethereum;

          // Tenta obter o RPC URL atual (método não padrão, pode não funcionar)
          let currentRpcUrl = "RPC Configurado no MetaMask";
          try {
            const networkVersion = await provider.request({
              method: "net_version",
            });
            if (networkVersion) {
              currentRpcUrl = `RPC Ativo (Chain ${networkVersion})`;
            }
          } catch (e) {
            // Ignora erro, usa valor padrão
          }

          return [
            {
              name: "RPC Atual do MetaMask",
              url: currentRpcUrl,
              status: "Ativo",
              isMetaMaskRpc: true,
            },
          ];
        }
      } catch (error) {
        console.warn("Erro ao obter detalhes da rede atual:", error);
      }

      // Para redes cadastradas mas não ativas
      return [
        {
          name: "RPC do MetaMask",
          url: "Configurado no MetaMask",
          status: "Disponível",
          isMetaMaskRpc: true,
        },
      ];
    } catch (error) {
      console.error("Erro ao obter RPCs do MetaMask:", error);
      return [];
    }
  }

  /**
   * Adiciona um RPC específico a uma rede existente no MetaMask
   * Implementação similar ao ChainList - adiciona apenas o RPC sem recriar a rede
   * @param {string} chainId - Chain ID da rede em formato hexadecimal
   * @param {string} rpcUrl - URL do RPC a ser adicionado
   * @param {string} [rpcName=''] - Nome opcional para o RPC
   * @returns {Promise} Promise que resolve quando o RPC for adicionado
   */
  async addRpcToExistingNetwork(chainId, rpcUrl, rpcName = "") {
    console.log("=== DEBUG addRpcToExistingNetwork ===");
    console.log("Parâmetros recebidos:", { chainId, rpcUrl, rpcName });

    if (!this.checkMetaMaskInstallation()) {
      throw new Error("MetaMask não está instalado");
    }

    // Valida o chainId
    if (!chainId || !chainId.startsWith("0x")) {
      throw new Error("Chain ID inválido");
    }

    // Valida a URL RPC
    if (!rpcUrl || !rpcUrl.startsWith("http")) {
      throw new Error("URL RPC inválida");
    }

    console.log("Chain ID validado:", chainId);

    // Obtém dados completos da rede do rpcs.json
    let networkData = null;
    let chainName = rpcName;
    let nativeCurrency = null;

    try {
      const chainIdDecimal = parseInt(chainId, 16);
      console.log("Chain ID decimal:", chainIdDecimal);
      networkData = await this.findNetworkInRpcs(chainIdDecimal);
      console.log("Dados do rpcs.json:", networkData);

      if (networkData) {
        chainName = networkData.name || chainName;
        nativeCurrency = networkData.nativeCurrency;
        console.log("Dados extraídos do rpcs.json:", {
          name: chainName,
          nativeCurrency: nativeCurrency,
        });
      }
    } catch (error) {
      console.warn("Erro ao obter dados da rede do rpcs.json:", error);
    }

    // Se não encontrou no rpcs.json, procura nas redes populares
    if (!networkData || !nativeCurrency) {
      console.log("Buscando nas redes populares...");
      const popularNetworks = this.getPopularNetworks();
      for (const [key, network] of Object.entries(popularNetworks)) {
        console.log("Verificando rede popular:", key, network.chainId, "vs", chainId);
        if (network.chainId === chainId) {
          chainName = network.chainName;
          nativeCurrency = network.nativeCurrency;
          console.log("Dados da rede encontrados nas redes populares:", {
            name: chainName,
            nativeCurrency: nativeCurrency,
          });
          break;
        }
      }
    }

    // Se ainda não encontrou nativeCurrency, usa valores padrão baseados no chainId
    if (!nativeCurrency) {
      console.log("Usando moeda nativa padrão para chainId:", chainId);
      nativeCurrency = this.getDefaultNativeCurrency(chainId);
      console.log("Moeda nativa padrão obtida:", nativeCurrency);
    }

    // Se não encontrou chainName, usa um nome padrão
    if (!chainName) {
      chainName = `Network ${chainId}`;
      console.log("Usando nome padrão:", chainName);
    }

    // Validação final
    console.log("=== VALIDAÇÃO FINAL ===");
    console.log("chainName:", chainName);
    console.log("nativeCurrency:", nativeCurrency);
    console.log("nativeCurrency type:", typeof nativeCurrency);
    console.log("nativeCurrency is null:", nativeCurrency === null);
    console.log("nativeCurrency is undefined:", nativeCurrency === undefined);

    try {
      // Monta os parâmetros completos para wallet_addEthereumChain
      const networkParams = {
        chainId: chainId,
        chainName: chainName,
        rpcUrls: [rpcUrl],
      };

      // Adiciona nativeCurrency apenas se estiver definida e não for null
      if (nativeCurrency && typeof nativeCurrency === "object") {
        networkParams.nativeCurrency = nativeCurrency;
        console.log("nativeCurrency adicionada aos parâmetros:", nativeCurrency);
      } else {
        console.warn("nativeCurrency não será incluída - valor inválido:", nativeCurrency);
        // Força um valor padrão para evitar o erro
        networkParams.nativeCurrency = {
          name: "Unknown",
          symbol: "UNKNOWN",
          decimals: 18,
        };
        console.log("Usando nativeCurrency padrão forçada:", networkParams.nativeCurrency);
      }

      console.log("=== PARÂMETROS FINAIS ===");
      console.log("Adicionando RPC com parâmetros:", JSON.stringify(networkParams, null, 2));

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [networkParams],
      });

      return true;
    } catch (error) {
      console.error("Erro ao adicionar RPC:", error);
      throw error;
    }
  }

  /**
   * Obtém moeda nativa padrão baseada no chainId
   * @param {string} chainId - Chain ID em formato hexadecimal
   * @returns {Object} Objeto com dados da moeda nativa
   */
  getDefaultNativeCurrency(chainId) {
    const defaultCurrencies = {
      "0x1": { name: "Ether", symbol: "ETH", decimals: 18 },
      "0x38": { name: "BNB", symbol: "BNB", decimals: 18 },
      "0x89": { name: "MATIC", symbol: "MATIC", decimals: 18 },
      "0xa4b1": { name: "Ether", symbol: "ETH", decimals: 18 },
      "0xa": { name: "Ether", symbol: "ETH", decimals: 18 },
      "0xa86a": { name: "Avalanche", symbol: "AVAX", decimals: 18 },
      "0xfa": { name: "Fantom", symbol: "FTM", decimals: 18 },
      "0x19": { name: "Cronos", symbol: "CRO", decimals: 18 },
      "0x64": { name: "xDAI", symbol: "xDAI", decimals: 18 },
      "0x2105": { name: "Ether", symbol: "ETH", decimals: 18 },
    };

    return (
      defaultCurrencies[chainId] || {
        name: "Unknown",
        symbol: "UNKNOWN",
        decimals: 18,
      }
    );
  }

  /**
   * Lista hardcoded de RPCs (mantida como fallback)
   * @param {string|number} chainId - Chain ID da rede
   * @returns {Array} Lista de RPCs hardcoded
   */
  getHardcodedNetworkRpcs(chainId) {
    // Converte para formato hexadecimal se necessário
    const chainIdHex = typeof chainId === "number" ? "0x" + chainId.toString(16) : chainId;

    const rpcLists = {
      // Mainnets
      "0x1": [
        // Ethereum Mainnet
        { url: "https://mainnet.infura.io/v3/", name: "Infura", public: false },
        {
          url: "https://eth-mainnet.alchemyapi.io/v2/",
          name: "Alchemy",
          public: false,
        },
        { url: "https://cloudflare-eth.com", name: "Cloudflare", public: true },
        {
          url: "https://ethereum.publicnode.com",
          name: "PublicNode",
          public: true,
        },
        {
          url: "https://mainnet.gateway.tenderly.co",
          name: "Tenderly",
          public: true,
        },
        { url: "https://rpc.ankr.com/eth", name: "Ankr", public: true },
      ],
      "0x89": [
        // Polygon
        {
          url: "https://polygon-rpc.com",
          name: "Polygon Official",
          public: true,
        },
        {
          url: "https://rpc-mainnet.matic.network",
          name: "Matic Network",
          public: true,
        },
        { url: "https://rpc.ankr.com/polygon", name: "Ankr", public: true },
        {
          url: "https://polygon.gateway.tenderly.co",
          name: "Tenderly",
          public: true,
        },
        {
          url: "https://polygon-mainnet.public.blastapi.io",
          name: "Blast API",
          public: true,
        },
      ],
      "0x38": [
        // BSC
        {
          url: "https://bsc-dataseed.binance.org",
          name: "Binance Official",
          public: true,
        },
        {
          url: "https://bsc-dataseed1.defibit.io",
          name: "DeFiBit",
          public: true,
        },
        {
          url: "https://bsc-dataseed1.ninicoin.io",
          name: "NiniCoin",
          public: true,
        },
        { url: "https://rpc.ankr.com/bsc", name: "Ankr", public: true },
      ],
      "0xa4b1": [
        // Arbitrum One
        {
          url: "https://arb1.arbitrum.io/rpc",
          name: "Arbitrum Official",
          public: true,
        },
        { url: "https://rpc.ankr.com/arbitrum", name: "Ankr", public: true },
        {
          url: "https://arbitrum.gateway.tenderly.co",
          name: "Tenderly",
          public: true,
        },
      ],
      "0xa86a": [
        // Avalanche
        {
          url: "https://api.avax.network/ext/bc/C/rpc",
          name: "Avalanche Official",
          public: true,
        },
        { url: "https://rpc.ankr.com/avalanche", name: "Ankr", public: true },
        {
          url: "https://avalanche.gateway.tenderly.co",
          name: "Tenderly",
          public: true,
        },
      ],
      // Testnets
      "0xaa36a7": [
        // Sepolia Testnet
        { url: "https://sepolia.infura.io/v3/", name: "Infura", public: false },
        {
          url: "https://eth-sepolia.public.blastapi.io",
          name: "Blast API",
          public: true,
        },
        { url: "https://rpc.sepolia.org", name: "Sepolia.org", public: true },
        {
          url: "https://rpc2.sepolia.org",
          name: "Sepolia.org 2",
          public: true,
        },
        { url: "https://rpc.ankr.com/eth_sepolia", name: "Ankr", public: true },
      ],
      "0x5": [
        // Goerli Testnet
        { url: "https://goerli.infura.io/v3/", name: "Infura", public: false },
        {
          url: "https://eth-goerli.alchemyapi.io/v2/",
          name: "Alchemy",
          public: false,
        },
        {
          url: "https://goerli.gateway.tenderly.co",
          name: "Tenderly",
          public: true,
        },
        { url: "https://rpc.ankr.com/eth_goerli", name: "Ankr", public: true },
      ],
      "0x13881": [
        // Polygon Mumbai
        {
          url: "https://rpc-mumbai.maticvigil.com",
          name: "Matic Vigil",
          public: true,
        },
        {
          url: "https://matic-mumbai.chainstacklabs.com",
          name: "ChainStack",
          public: true,
        },
        {
          url: "https://rpc.ankr.com/polygon_mumbai",
          name: "Ankr",
          public: true,
        },
        {
          url: "https://polygon-mumbai.gateway.tenderly.co",
          name: "Tenderly",
          public: true,
        },
      ],
      "0x61": [
        // BSC Testnet
        {
          url: "https://data-seed-prebsc-1-s1.binance.org:8545",
          name: "Binance Official",
          public: true,
        },
        {
          url: "https://data-seed-prebsc-2-s1.binance.org:8545",
          name: "Binance 2",
          public: true,
        },
        {
          url: "https://bsc-testnet.public.blastapi.io",
          name: "Blast API",
          public: true,
        },
      ],
      "0x66eed": [
        // Arbitrum Goerli
        {
          url: "https://goerli-rollup.arbitrum.io/rpc",
          name: "Arbitrum Official",
          public: true,
        },
        {
          url: "https://arbitrum-goerli.gateway.tenderly.co",
          name: "Tenderly",
          public: true,
        },
      ],
      "0xa869": [
        // Avalanche Fuji
        {
          url: "https://api.avax-test.network/ext/bc/C/rpc",
          name: "Avalanche Official",
          public: true,
        },
        {
          url: "https://rpc.ankr.com/avalanche_fuji",
          name: "Ankr",
          public: true,
        },
      ],
    };

    return rpcLists[chainIdHex] || [];
  }
}

// Exporta a classe para uso global
window.RPCSimple = RPCSimple;

// Auto-inicialização quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.rpcSimple = new RPCSimple();

  // Processa parâmetros da URL automaticamente
  window.rpcSimple.processUrlParams();
});
