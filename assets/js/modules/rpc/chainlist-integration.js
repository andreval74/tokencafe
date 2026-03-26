/**
 * Integração com ChainList API
 * Fornece dados atualizados de redes blockchain e RPCs
 */

class ChainListIntegration {
  constructor() {
    this.apiUrl = "https://chainlist.org/rpcs.json";
    this.cache = null;
    this.cacheExpiry = null;
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutos
  }

  /**
   * Busca dados atualizados do ChainList
   * @returns {Promise<Array>} Lista de redes
   */
  async fetchChains() {
    try {
      // Verificar cache
      if (this.cache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        console.log("📦 Usando dados do cache do ChainList");
        return this.cache;
      }

      console.log("🌐 Buscando dados atualizados do ChainList...");
      const response = await fetch(this.apiUrl);

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const chains = await response.json();

      // Atualizar cache
      this.cache = chains;
      this.cacheExpiry = Date.now() + this.cacheTimeout;

      console.log(`✅ ${chains.length} redes carregadas do ChainList`);
      return chains;
    } catch (error) {
      console.error("❌ Erro ao buscar dados do ChainList:", error);

      // Fallback para dados locais se disponível
      if (this.cache) {
        console.log("📦 Usando cache como fallback");
        return this.cache;
      }

      throw error;
    }
  }

  /**
   * Busca uma rede específica por Chain ID
   * @param {number} chainId - ID da rede
   * @returns {Promise<Object|null>} Dados da rede
   */
  async getChainById(chainId) {
    const chains = await this.fetchChains();
    return chains.find((chain) => chain.chainId === chainId) || null;
  }

  /**
   * Busca redes por nome (busca parcial)
   * @param {string} searchTerm - Termo de busca
   * @returns {Promise<Array>} Redes encontradas
   */
  async searchChains(searchTerm) {
    const chains = await this.fetchChains();
    const term = searchTerm.toLowerCase();

    return chains.filter((chain) => chain.name.toLowerCase().includes(term) || chain.chain.toLowerCase().includes(term) || chain.shortName.toLowerCase().includes(term));
  }

  /**
   * Obtém RPCs funcionais para uma rede
   * @param {number} chainId - ID da rede
   * @returns {Promise<Array>} Lista de URLs RPC
   */
  async getWorkingRpcs(chainId) {
    const chain = await this.getChainById(chainId);
    if (!chain || !chain.rpc) return [];

    // Filtrar apenas RPCs HTTPS e que não requerem API key
    return chain.rpc
      .filter((rpc) => {
        const url = typeof rpc === "string" ? rpc : rpc.url;
        return (
          url &&
          url.startsWith("https://") &&
          !url.includes("${") && // Não contém variáveis de API key
          !url.includes("API_KEY")
        );
      })
      .map((rpc) => (typeof rpc === "string" ? rpc : rpc.url));
  }

  /**
   * Obtém informações completas de uma rede formatadas para nosso sistema
   * @param {number} chainId - ID da rede
   * @returns {Promise<Object|null>} Dados formatados da rede
   */
  async getFormattedChain(chainId) {
    const chain = await this.getChainById(chainId);
    if (!chain) return null;

    const workingRpcs = await this.getWorkingRpcs(chainId);

    return {
      chainId: chain.chainId,
      name: chain.name,
      shortName: chain.shortName,
      chain: chain.chain,
      networkId: chain.networkId || chain.chainId,
      nativeCurrency: chain.nativeCurrency,
      rpc: workingRpcs,
      explorers: chain.explorers || [],
      infoURL: chain.infoURL,
      icon: chain.icon,
      faucets: chain.faucets || [],
    };
  }

  /**
   * Obtém redes populares (mainnet das principais blockchains)
   * @returns {Promise<Array>} Lista de redes populares
   */
  async getPopularChains() {
    const popularChainIds = [
      1, // Ethereum Mainnet
      56, // BNB Smart Chain
      137, // Polygon
      42161, // Arbitrum One
      10, // Optimism
      43114, // Avalanche C-Chain
      250, // Fantom
      25, // Cronos
      100, // Gnosis Chain
      8453, // Base
      59144, // Linea
      534352, // Scroll
    ];

    const chains = await this.fetchChains();
    return chains.filter((chain) => popularChainIds.includes(chain.chainId));
  }

  /**
   * Obtém estatísticas das RPCs (se disponível)
   * @param {number} chainId - ID da rede
   * @returns {Promise<Object>} Estatísticas das RPCs
   */
  async getRpcStats(chainId) {
    const chain = await this.getChainById(chainId);
    if (!chain || !chain.rpc) return {};

    const stats = {
      total: chain.rpc.length,
      https: 0,
      openSource: 0,
      noTracking: 0,
    };

    chain.rpc.forEach((rpc) => {
      if (typeof rpc === "object") {
        if (rpc.url && rpc.url.startsWith("https://")) stats.https++;
        if (rpc.isOpenSource) stats.openSource++;
        if (rpc.tracking === "none") stats.noTracking++;
      } else if (rpc.startsWith("https://")) {
        stats.https++;
      }
    });

    return stats;
  }
}

// Instância global
const chainListAPI = new ChainListIntegration();

// Exportar para uso em outros módulos
if (typeof module !== "undefined" && module.exports) {
  module.exports = ChainListIntegration;
} else if (typeof window !== "undefined") {
  window.ChainListIntegration = ChainListIntegration;
  window.chainListAPI = chainListAPI;
}
