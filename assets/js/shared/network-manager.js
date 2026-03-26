/**
 * ================================================================================
 * NETWORK MANAGER - GERENCIADOR UNIFICADO DE REDES BLOCKCHAIN
 * ================================================================================
 * Centraliza TODA a lógica de gerenciamento de redes blockchain
 * Substitui código duplicado em: múltiplos arquivos com NETWORK_CONFIGS
 *
 * FUNCIONALIDADES:
 * - Carregamento otimizado de rpcs.json
 * - Cache inteligente de dados de rede
 * - Fallback para redes populares
 * - Busca e filtro de redes
 * - Integração com ChainList API
 * - Otimização de performance
 * ================================================================================
 */

import { SharedUtilities } from "../core/shared_utilities_es6.js";

export class NetworkManager {
  constructor() {
    this.utils = new SharedUtilities();

    // Cache de redes
    this.networks = [];
    this.networksMap = new Map(); // Para busca rápida por ID
    this.lastUpdate = 0;
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutos

    // Status de carregamento
    this.isLoading = false;
    this.isLoaded = false;

    // Configurações
    this.debug = false;
    // Preferir fonte local por padrão (mais simples e ágil). Backend só quando explicitamente habilitado.
    this.useRpcsSource = !!(typeof window !== "undefined" && window.RPC_BACKEND_ENABLED);
    // Desativar chamada ao backend automaticamente em ambiente estático local
    try {
      const isLocalhost = typeof location !== "undefined" && location.hostname === "localhost";
      const isStaticPort = typeof location !== "undefined" && location.port && location.port !== "3001";
      if (isLocalhost && isStaticPort) {
        this.useRpcsSource = false;
      }
    } catch (e) {
      // Ignorar detecção de ambiente se location não estiver disponível
    }

    // Redes populares hardcoded para fallback RÁPIDO
    this.popularNetworks = [
      {
        chainId: 1,
        name: "Ethereum Mainnet",
        shortName: "eth",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpc: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
        explorers: [{ name: "Etherscan", url: "https://etherscan.io" }],
        icon: "ethereum",
      },
      {
        chainId: 56,
        name: "BNB Smart Chain",
        shortName: "bnb",
        nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
        rpc: ["https://bsc-dataseed.binance.org", "https://rpc.ankr.com/bsc"],
        explorers: [{ name: "BscScan", url: "https://bscscan.com" }],
        icon: "binancecoin",
      },
      {
        chainId: 137,
        name: "Polygon Mainnet",
        shortName: "matic",
        nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
        rpc: ["https://polygon-rpc.com", "https://rpc.ankr.com/polygon"],
        explorers: [{ name: "PolygonScan", url: "https://polygonscan.com" }],
        icon: "polygon",
      },
      {
        chainId: 42161,
        name: "Arbitrum One",
        shortName: "arb1",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpc: ["https://arb1.arbitrum.io/rpc", "https://rpc.ankr.com/arbitrum"],
        explorers: [{ name: "Arbiscan", url: "https://arbiscan.io" }],
        icon: "arbitrum",
      },
      {
        chainId: 10,
        name: "Optimism",
        shortName: "oeth",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpc: ["https://mainnet.optimism.io", "https://rpc.ankr.com/optimism"],
        explorers: [
          {
            name: "Optimistic Etherscan",
            url: "https://optimistic.etherscan.io",
          },
        ],
        icon: "optimism",
      },
      {
        chainId: 43114,
        name: "Avalanche C-Chain",
        shortName: "avax",
        nativeCurrency: { name: "Avalanche", symbol: "AVAX", decimals: 18 },
        rpc: ["https://api.avax.network/ext/bc/C/rpc", "https://rpc.ankr.com/avalanche"],
        explorers: [{ name: "SnowTrace", url: "https://snowtrace.io" }],
        icon: "avalanche",
      },
      {
        chainId: 250,
        name: "Fantom Opera",
        shortName: "ftm",
        nativeCurrency: { name: "Fantom", symbol: "FTM", decimals: 18 },
        rpc: ["https://rpc.ftm.tools", "https://rpc.ankr.com/fantom"],
        explorers: [{ name: "FTMScan", url: "https://ftmscan.com" }],
        icon: "fantom",
      },
      {
        chainId: 25,
        name: "Cronos Mainnet",
        shortName: "cro",
        nativeCurrency: { name: "Cronos", symbol: "CRO", decimals: 18 },
        rpc: ["https://evm.cronos.org", "https://rpc.ankr.com/cronos"],
        explorers: [{ name: "Cronoscan", url: "https://cronoscan.com" }],
        icon: "cronos",
      },
      {
        chainId: 97,
        name: "BNB Smart Chain Testnet",
        shortName: "t-bsc",
        nativeCurrency: { name: "BNB", symbol: "tBNB", decimals: 18 },
        rpc: [
          "https://bsc-testnet.publicnode.com",
          "https://data-seed-prebsc-1-s1.binance.org:8545",
          "https://data-seed-prebsc-2-s1.binance.org:8545",
          "https://data-seed-prebsc-1-s3.binance.org:8545",
          "https://rpc.ankr.com/bsc_testnet_chapel"
        ],
        explorers: [{ name: "BscScan Testnet", url: "https://testnet.bscscan.com" }],
        icon: "binancecoin",
      },
      {
        chainId: 11155111,
        name: "Sepolia",
        shortName: "sep",
        nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
        rpc: ["https://rpc.sepolia.org", "https://rpc.ankr.com/eth_sepolia"],
        explorers: [{ name: "Etherscan Sepolia", url: "https://sepolia.etherscan.io" }],
        icon: "ethereum",
      },
    ];

    this.init();
  }

  /**
   * Inicialização do gerenciador
   */
  async init() {
    this.log("🚀 Inicializando NetworkManager...");

    // Carregar redes populares imediatamente para uso rápido
    this.loadPopularNetworks();

    // Carregar todas as redes em background
    this.loadAllNetworks();

    this.log("✅ NetworkManager inicializado com redes populares");
  }

  /**
   * Verifica se uma rede é de teste baseado no Chain ID ou nome
   * @param {number|string} chainId - ID da rede
   * @returns {boolean} - True se for rede de teste
   */
  isTestNetwork(chainId) {
      if (!chainId) return false;
      const id = parseInt(chainId, 10);
      
      // IDs conhecidos de Testnets
      const testnetIds = [
          97,       // BSC Testnet
          11155111, // Sepolia
          5,        // Goerli
          80001,    // Mumbai (Polygon)
          420,      // Optimism Goerli
          421613,   // Arbitrum Goerli
          43113,    // Avalanche Fuji
          4002,     // Fantom Testnet
          338,      // Cronos Testnet
          1337,     // Localhost (Geth)
          31337     // Hardhat
      ];

      if (testnetIds.includes(id)) return true;

      // Fallback: Verificar nome se disponível no cache
      const net = this.getNetwork(id);
      if (net && net.name) {
          const name = net.name.toLowerCase();
          if (name.includes("test") || name.includes("dev") || name.includes("goerli") || name.includes("sepolia") || name.includes("mumbai")) {
              return true;
          }
      }
      
      return false;
  }

  /**
   * Carregar redes populares imediatamente
   */
  loadPopularNetworks() {
    this.popularNetworks.forEach((network) => {
      this.networksMap.set(network.chainId, network);
    });

    this.networks = [...this.popularNetworks];
    this.log(`⚡ ${this.popularNetworks.length} redes populares carregadas`);
  }

  /**
   * Carregar todas as redes (assíncrono)
   */
  async loadAllNetworks() {
    // Verificar cache
    if (this.isLoaded && Date.now() - this.lastUpdate < this.cacheTimeout) {
      this.log("📦 Usando cache de redes");
      return this.networks;
    }

    if (this.isLoading) {
      this.log("⏳ Carregamento já em andamento...");
      return this.networks;
    }

    this.isLoading = true;

    try {
      this.log("📡 Carregando todas as redes...");

      // Preferir arquivo local primeiro; usar backend apenas se habilitado
      try {
        await this.loadFromLocalRpcs();
      } catch (localErr) {
        this.log(`⚠️ Falha ao carregar rpcs.json local: ${localErr.message}`, "warn");
      }
      if (this.useRpcsSource) {
        try {
          await this.loadFromRpcsAPI();
        } catch (apiError) {
          this.log(`⚠️ Backend RPCs falhou: ${apiError.message}`, "warn");
        }
      }

      this.isLoaded = true;
      this.lastUpdate = Date.now();

      this.log(`✅ ${this.networks.length} redes carregadas com sucesso`);
    } catch (error) {
      this.log(`❌ Erro ao carregar redes: ${error.message}`, "error");
      // Manter redes populares como fallback
    } finally {
      this.isLoading = false;
    }

    return this.networks;
  }

  /**
   * Carregar redes a partir do backend de RPCs
   */
  async loadFromRpcsAPI() {
    const endpoints = ["/api/rpcs", `${location.protocol}//${location.hostname}:3001/api/rpcs`];
    let lastErr;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, { timeout: 10000 });
        if (!response.ok) throw new Error(`API response: ${response.status}`);
        const data = await response.json();
        const entries = Array.isArray(data?.rpcs) ? data.rpcs : Array.isArray(data) ? data : [];
        this.processRpcsData(entries);
        this.log(`🌐 Redes carregadas do backend RPCs (${entries.length})`);
        return;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("Falha ao obter RPCs do backend");
  }

  /**
   * Carregar redes do arquivo local rpcs.json
   */
  async loadFromLocalRpcs() {
    const paths = [
      "/shared/data/rpcs.json", // Padrão servidor web (root relative)
      "shared/data/rpcs.json", // Relativo simples
      "../shared/data/rpcs.json", // 1 nível acima
      "../../shared/data/rpcs.json", // 2 níveis acima
      "../../../shared/data/rpcs.json", // 3 níveis acima (ex: pages/modules/contrato)
      "./shared/data/rpcs.json" // Explicitamente corrente
    ];

    let loaded = false;
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const data = await response.json();
          const entries = Array.isArray(data?.rpcs) ? data.rpcs : Array.isArray(data) ? data : [];
          this.processRpcsData(entries);
          this.log(`📁 Redes carregadas de: ${path}`);
          loaded = true;
          break;
        }
      } catch (e) {
        // Silenciosamente tentar o próximo path
      }
    }

    if (!loaded) {
       // Não lançar erro fatal para não quebrar a aplicação, apenas logar aviso
       this.log("⚠️ Não foi possível carregar rpcs.json local. Usando apenas redes populares.", "warn");
    }
  }

  /**
   * Processar dados de RPCs vindos de diferentes fontes
   * @param {Array} entries - Array de entradas de RPCs
   */
  processRpcsData(entries) {
    const networksSet = new Map();

    // Manter redes populares com prioridade
    this.popularNetworks.forEach((network) => {
      networksSet.set(network.chainId, network);
    });

    // Processar entradas de RPCs
    entries.forEach((entry) => {
      const chainId = Number(entry?.chainId ?? entry?.id);
      if (!chainId || chainId <= 0) return;
      const name = entry?.name || entry?.chainName || `Chain ${chainId}`;
      const shortName = entry?.shortName || entry?.short_name || entry?.chain || `chain${chainId}`;
      const nativeCurrency = entry?.nativeCurrency || {
        name: entry?.currencyName || "Unknown",
        symbol: entry?.currencySymbol || entry?.symbol || "UNKNOWN",
        decimals: entry?.currencyDecimals || 18,
      };
      // extrair RPCs em diferentes formatos
      let rpcCandidates = [];
      if (Array.isArray(entry?.rpcs)) {
        rpcCandidates = entry.rpcs.map((r) => (typeof r === "string" ? r : r?.url || r?.rpc || r?.endpoint || ""));
      } else if (Array.isArray(entry?.rpc)) {
        rpcCandidates = entry.rpc.map((r) => (typeof r === "string" ? r : r?.url || ""));
      } else if (typeof entry?.url === "string") {
        rpcCandidates = [entry.url];
      }
      const rpc = this.processRPCUrls(rpcCandidates);

      const processedNetwork = {
        chainId,
        name,
        shortName,
        nativeCurrency,
        rpc,
        explorers: entry?.explorers || [],
        infoURL: entry?.infoURL,
        icon: entry?.icon,
        features: entry?.features,
        faucets: entry?.faucets,
      };
      networksSet.set(chainId, processedNetwork);
    });

    // Converter para arrays
    this.networks = Array.from(networksSet.values());
    this.networksMap = networksSet;

    // Ordenar por popularidade (redes conhecidas primeiro)
    this.networks.sort((a, b) => {
      const popularIds = this.popularNetworks.map((n) => n.chainId);
      const aPopular = popularIds.includes(a.chainId);
      const bPopular = popularIds.includes(b.chainId);

      if (aPopular && !bPopular) return -1;
      if (!aPopular && bPopular) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Verificar se deve pular rede (filtros de performance)
   * @param {Object} chain - Dados da rede
   */
  shouldSkipNetwork(chain) {
    const name = (chain.name || "").toLowerCase();

    // Pular testnets muito específicas ou antigas
    const skipPatterns = ["deprecated", "abandoned", "old", "legacy", "test-", "-test", "devnet", "experimental"];

    return skipPatterns.some((pattern) => name.includes(pattern));
  }

  /**
   * Processar URLs RPC para garantir qualidade
   * @param {Array} rpcUrls - URLs RPC brutas
   */
  processRPCUrls(rpcUrls) {
    if (!Array.isArray(rpcUrls)) return [];

    const sanitize = (u) => {
      try {
        const s = String(u || "")
          .replace(/[`'\"]/g, "")
          .trim();
        return s;
      } catch (_) {
        return "";
      }
    };

    return rpcUrls
      .map((rpc) => (typeof rpc === "string" ? rpc : rpc.url))
      .map((url) => sanitize(url))
      .filter((url) => url && url.startsWith("https://"))
      .filter((url) => !url.includes("${") && !url.includes("API_KEY"))
      .slice(0, 3); // Máximo 3 RPCs por rede para performance
  }

  /**
   * Buscar rede por ID
   * @param {number|string} chainId - ID da rede
   * @returns {Object|null} Dados da rede
   */
  getNetworkById(chainId) {
    const id = parseInt(chainId);
    return this.networksMap.get(id) || null;
  }

  /**
   * Buscar redes por texto
   * @param {string} query - Texto de busca
   * @param {number} limit - Limite de resultados
   * @returns {Array} Array de redes
   */
  searchNetworks(query, limit = 20) {
    if (!query || query.length < 2) {
      return this.getPopularNetworks(limit);
    }

    const searchTerm = query.toLowerCase();
    const results = [];

    // Busca exata por chainId primeiro
    if (!isNaN(searchTerm)) {
      const byId = this.getNetworkById(parseInt(searchTerm));
      if (byId) results.push(byId);
    }

    // Busca por nome e símbolo
    this.networks.forEach((network) => {
      if (results.includes(network)) return;

      const name = network.name.toLowerCase();
      const shortName = (network.shortName || "").toLowerCase();
      const symbol = (network.nativeCurrency?.symbol || "").toLowerCase();

      if (name.includes(searchTerm) || shortName.includes(searchTerm) || symbol.includes(searchTerm)) {
        results.push(network);
      }
    });

    return results.slice(0, limit);
  }

  /**
   * Obter redes populares
   * @param {number} limit - Limite de resultados
   */
  getPopularNetworks(limit = 8) {
    return this.popularNetworks.slice(0, limit);
  }

  /**
   * Obter todas as redes (com carregamento assíncrono se necessário)
   * @returns {Promise<Array>} Array de todas as redes
   */
  async getAllNetworks() {
    if (!this.isLoaded) {
      await this.loadAllNetworks();
    }
    return this.networks;
  }

  /**
   * Filtrar redes por critérios
   * @param {Object} filters - Filtros de busca
   * @returns {Array} Redes filtradas
   */
  filterNetworks(filters = {}) {
    let filtered = this.networks;

    // Filtro por tipo (mainnet/testnet)
    if (filters.type) {
      filtered = filtered.filter((network) => {
        const isTestnet = this.isTestnet(network);
        return filters.type === "testnet" ? isTestnet : !isTestnet;
      });
    }

    // Filtro por tem explorer
    if (filters.hasExplorer) {
      filtered = filtered.filter((network) => network.explorers && network.explorers.length > 0);
    }

    // Filtro por tem RPC funcionando
    if (filters.hasRPC) {
      filtered = filtered.filter((network) => network.rpc && network.rpc.length > 0);
    }

    return filtered;
  }

  /**
   * Verificar se é rede de teste
   * @param {Object} network - Dados da rede
   */
  isTestnet(network) {
    const name = network.name.toLowerCase();
    const testnetKeywords = ["test", "sepolia", "goerli", "rinkeby", "kovan", "mumbai"];
    return testnetKeywords.some((keyword) => name.includes(keyword));
  }

  /**
   * Obter estatísticas das redes
   */
  getStats() {
    const mainnets = this.filterNetworks({ type: "mainnet" });
    const testnets = this.filterNetworks({ type: "testnet" });

    return {
      total: this.networks.length,
      mainnets: mainnets.length,
      testnets: testnets.length,
      withExplorers: this.filterNetworks({ hasExplorer: true }).length,
      withRPC: this.filterNetworks({ hasRPC: true }).length,
      popular: this.popularNetworks.length,
      lastUpdate: this.lastUpdate,
      isLoaded: this.isLoaded,
    };
  }

  /**
   * Validar dados de rede
   * @param {Object} network - Dados da rede
   */
  validateNetwork(network) {
    const errors = [];

    if (!network.chainId) errors.push("chainId obrigatório");
    if (!network.name) errors.push("name obrigatório");
    if (!network.nativeCurrency) errors.push("nativeCurrency obrigatório");
    if (!network.rpc || network.rpc.length === 0) errors.push("RPC obrigatório");

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Adicionar rede customizada
   * @param {Object} networkData - Dados da rede
   */
  addCustomNetwork(networkData) {
    const validation = this.validateNetwork(networkData);

    if (!validation.isValid) {
      throw new Error(`Rede inválida: ${validation.errors.join(", ")}`);
    }

    // Verificar se já existe
    if (this.networksMap.has(networkData.chainId)) {
      this.log(`⚠️ Rede ${networkData.chainId} já existe, sobrescrevendo`, "warn");
    }

    // Adicionar
    this.networksMap.set(networkData.chainId, networkData);
    this.networks = Array.from(this.networksMap.values());

    this.log(`✅ Rede customizada adicionada: ${networkData.name}`);
  }

  /**
   * Remover rede customizada
   * @param {number} chainId - ID da rede
   */
  removeCustomNetwork(chainId) {
    if (this.networksMap.delete(chainId)) {
      this.networks = Array.from(this.networksMap.values());
      this.log(`🗑️ Rede ${chainId} removida`);
      return true;
    }
    return false;
  }

  /**
   * Limpar cache e recarregar
   */
  async refresh() {
    this.log("🔄 Atualizando cache de redes...");

    this.isLoaded = false;
    this.lastUpdate = 0;
    this.networks = [];
    this.networksMap.clear();

    this.loadPopularNetworks();
    await this.loadAllNetworks();

    this.log("✅ Cache atualizado");
  }

  /**
   * Configurar debug mode
   * @param {boolean} enabled - Ativar debug
   */
  setDebug(enabled) {
    this.debug = enabled;
    this.log(`🐛 Debug mode: ${enabled ? "ON" : "OFF"}`);
  }

  /**
   * Logging com controle de debug
   */
  log(message, level = "info") {
    if (!this.debug && level !== "error") return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] NetworkManager:`;

    switch (level) {
      case "error":
        console.error(prefix, message);
        break;
      case "warn":
        console.warn(prefix, message);
        break;
      default:
        console.log(prefix, message);
    }
  }
}

// Exportar instância global
export const networkManager = new NetworkManager();

// Disponibilizar globalmente
window.networkManager = networkManager;
