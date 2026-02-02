/**
 * ================================================================================
 * BLOCKCHAIN UNIFIED ADAPTER - TOKENCAFE
 * ================================================================================
 * Adapter unificado usando os novos módulos consolidados
 * Mantém compatibilidade com código legado enquanto usa sistema unificado
 * Versão: 3.0 - Sistema Unificado
 * ================================================================================
 */

import { SharedUtilities } from "../core/shared_utilities_es6.js";
import { walletConnector } from "../shared/wallet-connector.js";
import { networkManager } from "../shared/network-manager.js";

class BlockchainUnified {
  constructor() {
    this.utils = new SharedUtilities();
    this.wallet = walletConnector;
    this.networks = networkManager;

    // Propriedades de compatibilidade
    this.currentNetwork = null;
    this.connectedAccount = null;
    this.selectedNetwork = null;

    this.init();
  }

  /**
   * Inicializar sistema unificado
   */
  init() {
    // Escutar eventos de carteira
    document.addEventListener("wallet:connected", (event) => {
      const { account, network } = event.detail;
      this.connectedAccount = account;
      this.currentNetwork = network;

      // Compatibilidade com eventos antigos
      this.triggerLegacyEvent("walletConnected", { account, network });
    });

    document.addEventListener("wallet:disconnected", () => {
      this.connectedAccount = null;
      this.currentNetwork = null;
      this.triggerLegacyEvent("walletDisconnected", {});
    });

    document.addEventListener("wallet:chainChanged", (event) => {
      const { chainId, network } = event.detail;
      this.currentNetwork = network;
      this.triggerLegacyEvent("chainChanged", { chainId, network });
    });
  }

  // ================================================================================
  // MÉTODOS DE CONEXÃO (USANDO SISTEMA UNIFICADO)
  // ================================================================================

  /**
   * Verificar se MetaMask está disponível
   */
  isMetaMaskAvailable() {
    return this.wallet.isWalletAvailable("metamask");
  }

  /**
   * Conectar carteira (usando sistema unificado)
   */
  async connectWallet(provider = "metamask") {
    try {
      const result = await this.wallet.connect(provider);

      if (result.success) {
        this.connectedAccount = result.account;
        this.currentNetwork = result.network;
        return {
          success: true,
          account: result.account,
          network: result.network,
        };
      } else {
        throw new Error(result.error || "Falha na conexão");
      }
    } catch (error) {
      console.error("Erro ao conectar carteira:", error);
      throw error;
    }
  }

  /**
   * Desconectar carteira
   */
  async disconnectWallet() {
    const result = await this.wallet.disconnect();
    this.connectedAccount = null;
    this.currentNetwork = null;
    return result;
  }

  /**
   * Verificar se está conectado
   */
  isConnected() {
    return this.wallet.isConnected;
  }

  /**
   * Obter conta conectada
   */
  getConnectedAccount() {
    return this.connectedAccount || this.wallet.getStatus()?.account;
  }

  /**
   * Obter rede atual
   */
  getCurrentNetwork() {
    return this.currentNetwork || this.wallet.getStatus()?.network;
  }

  // ================================================================================
  // MÉTODOS DE REDE (USANDO NETWORK MANAGER)
  // ================================================================================

  /**
   * Carregar todas as redes
   */
  async loadAllNetworks() {
    try {
      const networks = await this.networks.loadAllNetworks();
      this.allNetworks = networks;
      return networks;
    } catch (error) {
      console.error("Erro ao carregar redes:", error);
      return [];
    }
  }

  /**
   * Buscar redes por query
   */
  searchNetworks(query, limit = 20) {
    return this.networks.searchNetworks(query, limit);
  }

  /**
   * Obter rede por ID
   */
  getNetworkById(chainId) {
    return this.networks.getNetworkById(chainId);
  }

  /**
   * Obter redes populares
   */
  getPopularNetworks(limit = 10) {
    return this.networks.getPopularNetworks(limit);
  }

  /**
   * Trocar rede
   */
  async switchToNetwork(chainId) {
    try {
      const result = await this.wallet.switchNetwork(chainId);

      if (result.success) {
        const network = this.getNetworkById(chainId);
        this.currentNetwork = network;
        this.selectedNetwork = network;

        return {
          success: true,
          network: network,
          chainId: chainId,
        };
      } else {
        throw new Error(result.error || "Falha ao trocar rede");
      }
    } catch (error) {
      console.error("Erro ao trocar rede:", error);
      throw error;
    }
  }

  /**
   * Adicionar rede ao MetaMask
   */
  async addNetworkToMetaMask(chainId) {
    try {
      const network = this.getNetworkById(chainId);
      if (!network) {
        throw new Error(`Rede ${chainId} não encontrada`);
      }

      const result = await this.wallet.addNetwork(network);

      if (result.success) {
        return {
          success: true,
          network: network,
          message: "Rede adicionada com sucesso",
        };
      } else {
        throw new Error(result.error || "Falha ao adicionar rede");
      }
    } catch (error) {
      console.error("Erro ao adicionar rede:", error);
      throw error;
    }
  }

  // ================================================================================
  // MÉTODOS DE TOKEN
  // ================================================================================

  /**
   * Adicionar token ao MetaMask
   */
  async addTokenToMetaMask(tokenData) {
    try {
      const result = await this.wallet.addToken(tokenData);

      if (result.success) {
        return {
          success: true,
          token: tokenData,
          message: "Token adicionado com sucesso",
        };
      } else {
        throw new Error(result.error || "Falha ao adicionar token");
      }
    } catch (error) {
      console.error("Erro ao adicionar token:", error);
      throw error;
    }
  }

  /**
   * Buscar informações de token via RPC
   */
  async getTokenInfo(tokenAddress, chainId) {
    try {
      const network = this.getNetworkById(chainId);
      if (!network || !network.rpc || network.rpc.length === 0) {
        throw new Error("RPC não disponível para esta rede");
      }

      // Usar ethers.js se disponível
      if (typeof ethers !== "undefined") {
        const provider = new ethers.providers.JsonRpcProvider(network.rpc[0]);
        const contract = new ethers.Contract(tokenAddress, ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)", "function totalSupply() view returns (uint256)"], provider);

        const [name, symbol, decimals, totalSupply] = await Promise.all([contract.name().catch(() => "Unknown"), contract.symbol().catch(() => "UNK"), contract.decimals().catch(() => 18), contract.totalSupply().catch(() => 0)]);

        return {
          address: tokenAddress,
          name,
          symbol,
          decimals: decimals.toString(),
          totalSupply: totalSupply.toString(),
          chainId,
        };
      } else {
        throw new Error("Ethers.js não disponível");
      }
    } catch (error) {
      console.error("Erro ao buscar informações do token:", error);
      throw error;
    }
  }

  // ================================================================================
  // MÉTODOS DE COMPATIBILIDADE
  // ================================================================================

  /**
   * Selecionar rede (compatibilidade)
   */
  selectNetwork(chainId) {
    const network = this.getNetworkById(chainId);
    if (network) {
      this.selectedNetwork = network;
      return network;
    }
    return null;
  }

  /**
   * Obter rede selecionada
   */
  getSelectedNetwork() {
    return this.selectedNetwork;
  }

  /**
   * Disparar evento legado para compatibilidade
   */
  triggerLegacyEvent(eventName, data) {
    window.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  /**
   * Configurar debug
   */
  setDebug(enabled) {
    this.wallet.setDebug(enabled);
    this.networks.setDebug(enabled);
  }

  // ================================================================================
  // MÉTODOS UTILITÁRIOS
  // ================================================================================

  /**
   * Formatar endereço
   */
  formatAddress(address, chars = 4) {
    if (!address) return "";
    return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
  }

  /**
   * Validar endereço
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Converter Wei para Ether
   */
  weiToEther(wei) {
    if (typeof ethers !== "undefined") {
      return ethers.utils.formatEther(wei);
    }
    return (parseInt(wei) / Math.pow(10, 18)).toString();
  }

  /**
   * Converter Ether para Wei
   */
  etherToWei(ether) {
    if (typeof ethers !== "undefined") {
      return ethers.utils.parseEther(ether.toString());
    }
    return (parseFloat(ether) * Math.pow(10, 18)).toString();
  }
}

// Criar instância global
const blockchainUnified = new BlockchainUnified();

// Exportar para uso em módulos
export { blockchainUnified, BlockchainUnified };

// Disponibilizar globalmente para compatibilidade
window.blockchainUnified = blockchainUnified;
window.BlockchainCore = BlockchainUnified; // Alias para compatibilidade

console.log("🔗 Blockchain Unified carregado - Sistema unificado ativo");
