/**
 * ================================================================================
 * BLOCKCHAIN CORE - TOKENCAFE
 * ================================================================================
 * Arquivo consolidado com todas as funcionalidades relacionadas a blockchain e redes
 * Combina funcionalidades de RPC Core, Link Core e Token Utils para redes
 * ================================================================================
 */

// Importar utilitarios compartilhados
import { SharedUtilities } from "../core/shared_utilities_es6.js";

class BlockchainCore {
  constructor() {
    this.utils = new SharedUtilities();
    this.currentNetwork = null;
    this.connectedAccount = null;
    this.selectedNetwork = null;
    this.allNetworks = [];
    this.networksCache = null;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
    this.lastCacheTime = 0;
  }

  // ================================================================================
  // METODOS DE CONEXAO E METAMASK
  // ================================================================================

  /**
   * Verificar se MetaMask esta disponivel
   */
  isMetaMaskAvailable() {
    return typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
  }

  /**
   * Conectar carteira MetaMask
   */
  async connectWallet() {
    try {
      // Usar WalletConnector unificado
      if (!window.walletConnector || typeof window.walletConnector.connect !== "function") {
        throw new Error("WalletConnector indisponível");
      }

      const result = await window.walletConnector.connect("metamask");
      if (result && result.success) {
        this.connectedAccount = window.walletConnector.currentAccount;
        // Configurar listeners para mudanças
        this.setupEventListeners();
        // Obter informações da rede atual do conector
        this.currentNetwork = window.walletConnector.currentNetwork || null;

        return {
          success: true,
          account: this.connectedAccount,
          network: this.currentNetwork,
        };
      } else {
        throw new Error("Falha ao conectar carteira");
      }
    } catch (error) {
      console.error("Erro ao conectar carteira:", error);
      throw error;
    }
  }

  /**
   * Configurar event listeners para mudancas na carteira
   */
  setupEventListeners() {
    if (window.ethereum) {
      // Listener para mudanca de contas
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          this.connectedAccount = accounts[0];
          console.log("Conta alterada:", this.connectedAccount);
        } else {
          this.connectedAccount = null;
          console.log("Carteira desconectada");
        }
      });

      // Listener para mudanca de rede
      window.ethereum.on("chainChanged", (chainId) => {
        console.log("Rede alterada:", chainId);
        this.getCurrentNetworkInfo();
        // Recarregar a pagina para evitar problemas
        window.location.reload();
      });
    }
  }

  // ================================================================================
  // METODOS DE GERENCIAMENTO DE REDES
  // ================================================================================

  /**
   * Adicionar rede ao MetaMask
   */
  async addNetwork(networkData) {
    try {
      if (!this.isMetaMaskAvailable()) {
        throw new Error("MetaMask nao esta disponivel");
      }

      if (!this.validateNetworkData(networkData)) {
        throw new Error("Dados da rede invalidos");
      }

      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [networkData],
      });

      console.log("Rede adicionada com sucesso:", networkData.chainName);
      return { success: true, message: "Rede adicionada com sucesso!" };
    } catch (error) {
      console.error("Erro ao adicionar rede:", error);

      if (error.code === 4001) {
        throw new Error("Usuario rejeitou a adicao da rede");
      } else if (error.code === "-32602") {
        throw new Error("Parametros invalidos");
      } else {
        throw new Error(`Erro ao adicionar rede: ${error.message}`);
      }
    }
  }

  /**
   * Trocar para uma rede especifica
   */
  async switchNetwork(chainId) {
    try {
      if (!this.isMetaMaskAvailable()) {
        throw new Error("MetaMask nao esta disponivel");
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainId }],
      });

      console.log("Rede trocada com sucesso:", chainId);
      return { success: true, message: "Rede trocada com sucesso!" };
    } catch (error) {
      console.error("Erro ao trocar rede:", error);

      if (error.code === 4902) {
        // Rede nao existe, tentar adicionar
        throw new Error("Rede nao encontrada. Adicione a rede primeiro.");
      } else if (error.code === 4001) {
        throw new Error("Usuario rejeitou a troca de rede");
      } else {
        throw new Error(`Erro ao trocar rede: ${error.message}`);
      }
    }
  }

  /**
   * Obter informacoes da rede atual
   */
  async getCurrentNetworkInfo() {
    try {
      if (!this.isMetaMaskAvailable()) {
        return null;
      }

      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      this.currentNetwork = {
        chainId: chainId,
        chainIdDecimal: parseInt(chainId, 16),
        connectedAccount: accounts.length > 0 ? accounts[0] : null,
      };

      return this.currentNetwork;
    } catch (error) {
      console.error("Erro ao obter informacoes da rede:", error);
      return null;
    }
  }

  // ================================================================================
  // METODOS DE BUSCA E CACHE DE REDES
  // ================================================================================

  /**
   * Buscar todas as redes disponiveis
   */
  async fetchAllNetworks() {
    try {
      // Verificar cache
      if (this.networksCache && Date.now() - this.lastCacheTime < this.cacheExpiry) {
        return this.networksCache;
      }

      console.log("Buscando redes disponiveis...");

      // Tentar buscar de rpcs.json local/backend primeiro
      let networks = await this.loadLocalRpcs();

      // Se nao encontrou localmente, buscar do backend
      if (!networks || networks.length === 0) {
        networks = await this.fetchNetworksFromRpcsAPI();
      }

      // Atualizar cache
      this.networksCache = networks;
      this.lastCacheTime = Date.now();
      this.allNetworks = networks;

      console.log(`${networks.length} redes carregadas`);
      return networks;
    } catch (error) {
      console.error("Erro ao buscar redes:", error);

      // Usar redes de fallback
      const fallbackNetworks = this.getFallbackNetworks();
      this.networksCache = fallbackNetworks;
      this.allNetworks = fallbackNetworks;
      return fallbackNetworks;
    }
  }

  /**
   * Carregar rpcs.json local
   */
  async loadLocalRpcs() {
    try {
      const response = await fetch("/shared/data/rpcs.json");
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.log("rpcs.json local nao encontrado, tentando backend...");
      return null;
    }
  }

  /**
   * Buscar redes da API de RPCs (backend)
   */
  async fetchNetworksFromRpcsAPI() {
    try {
      // Preferir rpcs.json local; backend opcional
      const endpoints = [];
      try {
        // Primeiro, tentar arquivo local estático
        const resLocal = await fetch("/shared/data/rpcs.json");
        if (resLocal && resLocal.ok) {
          const dataLocal = await resLocal.json();
          const entries = Array.isArray(dataLocal?.rpcs) ? dataLocal.rpcs : Array.isArray(dataLocal) ? dataLocal : [];
          // Normalizar para estrutura comum utilizada pelo módulo
          const networks = entries.map((entry) => {
            const chainId = Number(entry?.chainId ?? entry?.id);
            const name = entry?.name || entry?.chainName || `Chain ${chainId}`;
            let rpc = [];
            if (Array.isArray(entry?.rpcs)) {
              rpc = entry.rpcs.map((r) => (typeof r === "string" ? r : r?.url || r?.rpc || r?.endpoint || ""));
            } else if (Array.isArray(entry?.rpc)) {
              rpc = entry.rpc.map((r) => (typeof r === "string" ? r : r?.url || ""));
            }
            return { chainId, name, rpc };
          });
          return networks;
        }
      } catch {}
      // Se backend estiver habilitado, tentar endpoints de API
      if (typeof window !== "undefined" && window.RPC_BACKEND_ENABLED) {
        endpoints.push("/api/rpcs");
        endpoints.push(`${location.protocol}//${location.hostname}:3001/api/rpcs`);
      }
      let response;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            response = res;
            break;
          }
        } catch {}
      }
      if (!response) return null;
      if (response.ok) {
        const data = await response.json();
        const entries = Array.isArray(data?.rpcs) ? data.rpcs : Array.isArray(data) ? data : [];
        // Normalizar para estrutura comum utilizada pelo módulo
        const networks = entries
          .map((entry) => {
            const chainId = Number(entry?.chainId ?? entry?.id);
            const name = entry?.name || entry?.chainName || `Chain ${chainId}`;
            let rpc = [];
            if (Array.isArray(entry?.rpcs)) {
              rpc = entry.rpcs.map((r) => (typeof r === "string" ? r : r?.url || r?.rpc || r?.endpoint || ""));
            } else if (Array.isArray(entry?.rpc)) {
              rpc = entry.rpc.map((r) => (typeof r === "string" ? r : r?.url || ""));
            } else if (typeof entry?.url === "string") {
              rpc = [entry.url];
            }
            rpc = rpc.filter((url) => url && url.startsWith("http"));
            return { chainId, name, rpc };
          })
          .filter((n) => n.chainId && n.rpc && n.rpc.length > 0);
        return networks;
      }
      return null;
    } catch (error) {
      console.error("Erro ao buscar da API de RPCs:", error);
      return null;
    }
  }

  /**
   * Redes de fallback
   */
  getFallbackNetworks() {
    return [
      {
        chainId: 1,
        name: "Ethereum Mainnet",
        nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
        rpc: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
        explorers: [{ url: "https://etherscan.io" }],
      },
      {
        chainId: 56,
        name: "Binance Smart Chain",
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        rpc: ["https://bsc-dataseed.binance.org", "https://rpc.ankr.com/bsc"],
        explorers: [{ url: "https://bscscan.com" }],
      },
      {
        chainId: 137,
        name: "Polygon",
        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
        rpc: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"],
        explorers: [{ url: "https://polygonscan.com" }],
      },
      {
        chainId: 43114,
        name: "Avalanche C-Chain",
        nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
        rpc: ["https://api.avax.network/ext/bc/C/rpc"],
        explorers: [{ url: "https://snowtrace.io" }],
      },
      {
        chainId: 250,
        name: "Fantom Opera",
        nativeCurrency: { name: "Fantom", symbol: "FTM", decimals: 18 },
        rpc: ["https://rpc.ftm.tools"],
        explorers: [{ url: "https://ftmscan.com" }],
      },
      {
        chainId: 11155111,
        name: "Sepolia Testnet",
        nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
        rpc: ["https://sepolia.infura.io/v3/", "https://rpc.sepolia.org"],
        explorers: [{ url: "https://sepolia.etherscan.io" }],
      },
    ];
  }

  // ================================================================================
  // METODOS DE TESTE E VALIDACAO
  // ================================================================================

  /**
   * Testar conexao RPC
   */
  async testRpcConnection(rpcUrl) {
    try {
      console.log(`Testando conexao RPC: ${rpcUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_blockNumber",
          params: [],
          id: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      if (data.result) {
        const blockNumber = parseInt(data.result, 16);
        console.log(`RPC funcionando. Ultimo bloco: ${blockNumber}`);
        return {
          success: true,
          blockNumber: blockNumber,
          latency: Date.now() - performance.now(),
        };
      } else {
        throw new Error("Resposta RPC invalida");
      }
    } catch (error) {
      console.error(`Erro no teste RPC: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validar dados da rede
   */
  validateNetworkData(networkData) {
    const required = ["chainId", "chainName", "rpcUrls", "nativeCurrency"];

    for (const field of required) {
      if (!networkData[field]) {
        console.error(`Campo obrigatorio ausente: ${field}`);
        return false;
      }
    }

    // Validar chainId
    if (!networkData.chainId.startsWith("0x")) {
      console.error("chainId deve estar em formato hexadecimal");
      return false;
    }

    // Validar URLs RPC
    if (!Array.isArray(networkData.rpcUrls) || networkData.rpcUrls.length === 0) {
      console.error("rpcUrls deve ser um array nao vazio");
      return false;
    }

    for (const url of networkData.rpcUrls) {
      if (!this.isValidUrl(url)) {
        console.error(`URL RPC invalida: ${url}`);
        return false;
      }
    }

    // Validar moeda nativa
    const currency = networkData.nativeCurrency;
    if (!currency.name || !currency.symbol || typeof currency.decimals !== "number") {
      console.error("Dados da moeda nativa invalidos");
      return false;
    }

    return true;
  }

  /**
   * Validar URL
   */
  isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  // ================================================================================
  // METODOS UTILITARIOS
  // ================================================================================

  /**
   * Obter redes populares
   */
  getPopularNetworks() {
    return this.getFallbackNetworks();
  }

  /**
   * Filtrar redes por criterios
   */
  filterNetworks(networks, criteria = {}) {
    return networks.filter((network) => {
      // Filtrar por nome
      if (criteria.name && !network.name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }

      // Filtrar por chainId
      if (criteria.chainId && network.chainId !== criteria.chainId) {
        return false;
      }

      // Filtrar por simbolo da moeda
      if (criteria.symbol && network.nativeCurrency && !network.nativeCurrency.symbol.toLowerCase().includes(criteria.symbol.toLowerCase())) {
        return false;
      }

      // Filtrar testnets
      if (criteria.excludeTestnets && this.isTestnet(network)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Verificar se e testnet
   */
  isTestnet(network) {
    const testnetKeywords = ["test", "sepolia", "goerli", "kovan", "ropsten", "rinkeby"];
    return testnetKeywords.some((keyword) => network.name.toLowerCase().includes(keyword));
  }

  /**
   * Formatar Chain ID
   */
  formatChainId(chainId) {
    if (typeof chainId === "string" && chainId.startsWith("0x")) {
      return parseInt(chainId, 16);
    }
    return chainId;
  }

  /**
   * Obter resumo da rede
   */
  getNetworkSummary(network) {
    return {
      name: network.name,
      chainId: network.chainId,
      symbol: network.nativeCurrency?.symbol || "ETH",
      rpcCount: network.rpc?.length || 0,
      hasExplorer: !!(network.explorers && network.explorers.length > 0),
    };
  }

  /**
   * Limpar cache de redes
   */
  clearNetworksCache() {
    this.networksCache = null;
    this.lastCacheTime = 0;
  }

  /**
   * Obter informacoes de erro
   */
  getErrorInfo(errorCode) {
    const errors = {
      4001: {
        message: "Usuario rejeitou a solicitacao",
        type: "user_rejection",
      },
      4100: { message: "Metodo nao autorizado", type: "unauthorized" },
      4200: { message: "Metodo nao suportado", type: "unsupported" },
      4900: {
        message: "Desconectado de todas as chains",
        type: "disconnected",
      },
      4901: {
        message: "Nao conectado a chain solicitada",
        type: "chain_disconnected",
      },
      4902: { message: "Chain nao reconhecida", type: "unrecognized_chain" },
      "-32700": { message: "Parse error", type: "parse_error" },
      "-32600": { message: "Invalid request", type: "invalid_request" },
      "-32601": { message: "Method not found", type: "method_not_found" },
      "-32602": { message: "Invalid params", type: "invalid_params" },
      "-32603": { message: "Internal error", type: "internal_error" },
    };

    return errors[errorCode] || { message: "Erro desconhecido", type: "unknown" };
  }
}

// Disponibilizar globalmente
window.BlockchainCore = BlockchainCore;

export default BlockchainCore;
