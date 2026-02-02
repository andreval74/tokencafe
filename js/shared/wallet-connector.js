/**
 * ================================================================================
 * WALLET CONNECTOR - MÓDULO UNIFICADO DE CARTEIRAS
 * ================================================================================
 * Centraliza TODA a lógica de conexão com carteiras Web3
 *
 * FUNCIONALIDADES:
 * - Conexão MetaMask, Trust, WalletConnect, Coinbase
 * - Gerenciamento de estado de conexão
 * - Event listeners centralizados
 * - Cache de dados da carteira
 * - Suporte a múltiplas redes
 * ================================================================================
 */

import { SharedUtilities } from "../core/shared_utilities_es6.js";
import { NetworkManager } from "./network-manager.js";

export class WalletConnector {
  constructor() {
    // Utilitários compartilhados
    this.utils = new SharedUtilities();
    this.networks = new NetworkManager();

    // Estado da carteira
    this.isConnected = false;
    this.currentAccount = null;
    this.currentChainId = null;
    this.currentNetwork = null;
    this.balance = "0";
    this.isUnlocked = false;

    // Configurações suportadas
    this.supportedWallets = ["metamask", "trust", "walletconnect", "coinbase"];
    this.connectedWallet = null;

    // Cache e performance
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos

    // Event listeners ativos
    this.activeListeners = [];

    // Debug mode
    this.debug = false;

    // Selo de sessão: só marcamos conectado após ação explícita nesta aba
    try {
      this.sessionAuthorized = sessionStorage.getItem("tokencafe_wallet_session_authorized") === "true";
    } catch (_) {
      this.sessionAuthorized = false;
    }

    this.init();
  }

  /**
   * Inicialização do conector
   */
  async init() {
    this.log("🚀 Inicializando WalletConnector...");

    // Verificar carteiras disponíveis
    await this.detectAvailableWallets();

    // Configurar event listeners globais
    this.setupGlobalListeners();

    // Tentar reconectar se havia conexão anterior
    await this.tryAutoReconnect();

    this.log("✅ WalletConnector inicializado");
  }

  /**
   * Detectar carteiras disponíveis no navegador
   */
  async detectAvailableWallets() {
    const available = {};

    // MetaMask
    if (typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask) {
      available.metamask = true;
      this.log("🦊 MetaMask detectado");
    }

    // Trust Wallet
    if (typeof window.ethereum !== "undefined" && window.ethereum.isTrust) {
      available.trust = true;
      this.log("🛡️ Trust Wallet detectado");
    }

    // Coinbase
    if (typeof window.ethereum !== "undefined" && window.ethereum.isCoinbaseWallet) {
      available.coinbase = true;
      this.log("🔵 Coinbase Wallet detectado");
    }

    this.availableWallets = available;
    return available;
  }

  /**
   * Conectar carteira - MÉTODO PRINCIPAL
   * @param {string} walletType - Tipo da carteira (metamask, trust, etc)
   * @returns {Promise<Object>} Resultado da conexão
   */
  async connect(walletType = "metamask") {
    try {
      this.log(`🔌 Tentando conectar ${walletType}...`);

      // Verificar se carteira está disponível
      if (!this.isWalletAvailable(walletType)) {
        throw new Error(`${walletType} não está disponível`);
      }

      // Solicitar permissões (se suportado) para forçar prompt
      if (window.ethereum && typeof window.ethereum.request === "function") {
        try {
          await window.ethereum.request({
            method: "wallet_requestPermissions",
            params: [{ eth_accounts: {} }],
          });
        } catch (permErr) {
          // Ignorar se não suportado ou já concedido
        }
      }

      // Solicitar conexão
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (!accounts || accounts.length === 0) {
        throw new Error("Nenhuma conta encontrada");
      }

      // Atualizar estado
      this.isConnected = true;
      this.currentAccount = accounts[0];
      this.connectedWallet = walletType;
      // Marcar sessão como autorizada (ação explícita)
      this.sessionAuthorized = true;
      try {
        sessionStorage.setItem("tokencafe_wallet_session_authorized", "true");
      } catch (_) {}
      await this.updateNetworkInfo();
      await this.updateBalance();
      this.setupWalletListeners();
      this.saveConnectionCache();
      this.emitEvent("wallet:connected", {
        account: this.currentAccount,
        wallet: this.connectedWallet,
        chainId: this.currentChainId,
        network: this.currentNetwork,
      });
      this.log(`✅ ${walletType} conectado: ${this.currentAccount}`);

      return {
        success: true,
        account: this.currentAccount,
        wallet: this.connectedWallet,
        chainId: this.currentChainId,
        network: this.currentNetwork,
        balance: this.balance,
      };
    } catch (error) {
      this.log(`❌ Erro ao conectar ${walletType}: ${error.message}`, "error");

      this.emitEvent("wallet:error", {
        action: "connect",
        wallet: walletType,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Desconectar carteira
   */
  async disconnect() {
    try {
      this.log("🔌 Desconectando carteira...");

      // Limpar estado
      this.isConnected = false;
      this.currentAccount = null;
      this.currentChainId = null;
      this.currentNetwork = null;
      this.connectedWallet = null;
      this.balance = "0";
      this.isUnlocked = false;

      // Limpar cache e selo de sessão
      this.clearCache();
      this.sessionAuthorized = false;
      try {
        sessionStorage.removeItem("tokencafe_wallet_session_authorized");
      } catch (_) {}

      // Remover listeners
      this.removeWalletListeners();

      // Emitir evento
      this.emitEvent("wallet:disconnected");

      this.log("✅ Carteira desconectada");

      return { success: true };
    } catch (error) {
      this.log(`❌ Erro ao desconectar: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Trocar de rede
   * @param {number|string} chainId - ID da rede
   */
  async switchNetwork(chainId) {
    try {
      if (!this.isConnected) {
        throw new Error("Carteira não conectada");
      }

      const targetChainId = typeof chainId === "string" ? chainId : `0x${chainId.toString(16)}`;
      this.log(`🔄 Trocando para rede ${targetChainId}...`);

      // Obter dados da rede
      const decId = typeof chainId === "string" && chainId.startsWith("0x") ? parseInt(chainId, 16) : chainId;
      const networkData = await this.networks.getNetworkById(decId);
      if (!networkData) {
        throw new Error(`Rede ${chainId} não encontrada`);
      }

      try {
        // Tentar trocar diretamente
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: targetChainId }],
        });
      } catch (switchError) {
        // Se a rede não estiver adicionada, tentar adicionar
        if (switchError.code === 4902) {
          await this.addNetwork(networkData);
        } else {
          throw switchError;
        }
      }

      // Atualizar informações
      await this.updateNetworkInfo();

      this.log(`✅ Rede alterada para ${this.currentNetwork?.name || chainId}`);

      return { success: true, network: this.currentNetwork };
    } catch (error) {
      this.log(`❌ Erro ao trocar rede: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Adicionar nova rede à carteira
   * @param {Object} networkData - Dados da rede
   */
  async addNetwork(networkData) {
    try {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: `0x${networkData.chainId.toString(16)}`,
            chainName: networkData.name,
            nativeCurrency: networkData.nativeCurrency,
            rpcUrls: Array.isArray(networkData.rpc) ? networkData.rpc : [networkData.rpc],
            blockExplorerUrls: networkData.explorers ? networkData.explorers.map((e) => e.url || e) : [],
          },
        ],
      });

      this.log(`✅ Rede ${networkData.name} adicionada`);
    } catch (error) {
      this.log(`❌ Erro ao adicionar rede: ${error.message}`, "error");
      throw error;
    }
  }

  /**
   * Atualizar informações da rede atual
   */
  async updateNetworkInfo() {
    try {
      if (!window.ethereum) return;

      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      this.currentChainId = chainId;

      // Buscar dados da rede
      const chainIdDecimal = parseInt(chainId, 16);
      this.currentNetwork = await this.networks.getNetworkById(chainIdDecimal);

      this.log(`🌐 Rede atual: ${this.currentNetwork?.name || chainId} (${chainId})`);
    } catch (error) {
      this.log(`❌ Erro ao obter info da rede: ${error.message}`, "error");
    }
  }

  /**
   * Atualizar saldo da conta
   */
  async updateBalance() {
    try {
      if (!this.currentAccount) return;

      let weiHex = null;

      // Tentar via MetaMask primeiro
      if (window.ethereum) {
        try {
          weiHex = await window.ethereum.request({
            method: "eth_getBalance",
            params: [this.currentAccount, "latest"],
          });
        } catch (mmErr) {
          this.log(`⚠️ Falha no MetaMask RPC ao obter saldo: ${mmErr?.message || mmErr}`, "warn");
        }
      }

      // Fallback via JsonRpcProvider (ethers) quando MM falhar
      if (!weiHex && typeof ethers !== "undefined") {
        try {
          let rpcUrl = "";
          if (window.widgetRpcOverride?.rpcUrl) {
            rpcUrl = window.widgetRpcOverride.rpcUrl;
          } else if (this.currentNetwork?.rpc?.length) {
            rpcUrl = this.currentNetwork.rpc[0];
          } else if (this.currentChainId) {
            const decId = parseInt(this.currentChainId, 16);
            const net = window.networkManager?.getNetworkById ? window.networkManager.getNetworkById(decId) : null;
            rpcUrl = net?.rpc?.[0] || "";
          }
          if (!rpcUrl) rpcUrl = "https://bsc-testnet.publicnode.com";

          const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          const bn = await provider.getBalance(this.currentAccount);
          weiHex = ethers.utils.hexlify(bn);
        } catch (fbErr) {
          this.log(`❌ Erro ao obter saldo (fallback): ${fbErr?.message || fbErr}`, "error");
          return;
        }
      }

      if (!weiHex) return;

      this.balance = (parseInt(weiHex, 16) / Math.pow(10, 18)).toFixed(4);
      this.log(`💰 Saldo atualizado: ${this.balance} ETH`);
    } catch (error) {
      this.log(`❌ Erro ao obter saldo: ${error.message}`, "error");
    }
  }

  /**
   * Verificar se carteira está disponível
   * @param {string} walletType - Tipo da carteira
   */
  isWalletAvailable(walletType) {
    switch (walletType) {
      case "metamask":
        return typeof window.ethereum !== "undefined" && window.ethereum.isMetaMask;
      case "trust":
        return typeof window.ethereum !== "undefined" && window.ethereum.isTrust;
      case "coinbase":
        return typeof window.ethereum !== "undefined" && window.ethereum.isCoinbaseWallet;
      default:
        return false;
    }
  }

  /**
   * Configurar listeners da carteira
   */
  setupWalletListeners() {
    if (!window.ethereum) return;

    // Listener para mudança de contas
    const accountsHandler = (accounts) => {
      if (accounts.length === 0) {
        this.disconnect();
      } else if (accounts[0] !== this.currentAccount) {
        this.currentAccount = accounts[0];
        this.updateBalance();
        this.emitEvent("wallet:accountChanged", {
          account: this.currentAccount,
        });
        this.log(`👤 Conta alterada: ${this.currentAccount}`);
      }
    };

    // Listener para mudança de rede
    const chainHandler = (chainId) => {
      this.currentChainId = chainId;
      this.updateNetworkInfo();
      this.emitEvent("wallet:chainChanged", { chainId });
      this.log(`🔄 Rede alterada: ${chainId}`);
    };

    window.ethereum.on("accountsChanged", accountsHandler);
    window.ethereum.on("chainChanged", chainHandler);

    // Salvar referências para remoção posterior
    this.activeListeners.push({ event: "accountsChanged", handler: accountsHandler }, { event: "chainChanged", handler: chainHandler });
  }

  /**
   * Remover listeners da carteira
   */
  removeWalletListeners() {
    if (!window.ethereum) return;

    this.activeListeners.forEach(({ event, handler }) => {
      window.ethereum.removeListener(event, handler);
    });

    this.activeListeners = [];
  }

  /**
   * Configurar listeners globais
   */
  setupGlobalListeners() {
    // Listener para detecção de carteiras
    window.addEventListener("ethereum#initialized", () => {
      this.detectAvailableWallets();
    });
  }

  /**
   * Tentar reconexão automática
   */
  async tryAutoReconnect() {
    try {
      // Evitar chamadas RPC sem ação explícita do usuário
      if (!this.sessionAuthorized) {
        this.log("⛔ Reconexão automática ignorada: sessão não autorizada");
        return;
      }
      const cachedConnection = this.getConnectionCache();
      if (!cachedConnection) return;
      this.log("🔄 Tentando reconexão automática...");

      if (this.isWalletAvailable(cachedConnection.wallet) && window.ethereum) {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (!accounts || accounts.length === 0) {
          this.log("🔒 Carteira sem contas autorizadas; não reconectar automaticamente", "warn");
          this.clearCache();
          this.isConnected = false;
          this.currentAccount = null;
          this.connectedWallet = null;
          return;
        }
        if (accounts[0] === cachedConnection.account) {
          await this.connectSilent(cachedConnection.wallet);
          this.log("✅ Reconexão automática (silenciosa) bem-sucedida");
        } else {
          this.log("ℹ️ Cache de conexão inválido; limpando", "warn");
          this.clearCache();
        }
      }
    } catch (error) {
      this.log(`⚠️ Falha na reconexão automática: ${error.message}`);
    }
  }

  /**
   * Salvar dados de conexão no cache
   */
  saveConnectionCache() {
    const cacheData = {
      account: this.currentAccount,
      wallet: this.connectedWallet,
      chainId: this.currentChainId,
      timestamp: Date.now(),
    };

    localStorage.setItem("tokencafe_wallet_cache", JSON.stringify(cacheData));
  }

  /**
   * Recuperar dados do cache
   */
  getConnectionCache() {
    try {
      const cached = localStorage.getItem("tokencafe_wallet_cache");
      if (!cached) return null;

      const data = JSON.parse(cached);

      // Verificar se cache não expirou
      if (Date.now() - data.timestamp > this.cacheTimeout) {
        this.clearCache();
        return null;
      }

      return data;
    } catch (error) {
      this.log(`❌ Erro ao ler cache: ${error.message}`, "error");
      return null;
    }
  }

  /**
   * Limpar cache
   */
  clearCache() {
    localStorage.removeItem("tokencafe_wallet_cache");
    this.cache.clear();
    this.isConnected = false;
    this.currentAccount = null;
    this.connectedWallet = null;
    this.sessionAuthorized = false;
    try {
      sessionStorage.removeItem("tokencafe_wallet_session_authorized");
    } catch (_) {}
  }

  /**
   * Emitir evento customizado
   * @param {string} eventName - Nome do evento
   * @param {Object} data - Dados do evento
   */
  emitEvent(eventName, data = {}) {
    const event = new CustomEvent(eventName, { detail: data });
    document.dispatchEvent(event);

    // Também emitir via EventBus se disponível
    if (window.eventBus) {
      window.eventBus.emit(eventName, data);
    }
  }

  /**
   * Logging com controle de debug
   * @param {string} message - Mensagem
   * @param {string} level - Nível do log
   */
  log(message, level = "info") {
    if (!this.debug && level !== "error") return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] WalletConnector:`;

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

  /**
   * Obter status atual da carteira
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      account: this.currentAccount,
      wallet: this.connectedWallet,
      chainId: this.currentChainId,
      network: this.currentNetwork,
      balance: this.balance,
      availableWallets: this.availableWallets,
      sessionAuthorized: !!this.sessionAuthorized,
    };
  }

  /**
   * Formatar endereço curto (ex: 0x1234...ABCD)
   */
  formatAddress(address, startChars = 6, endChars = 4) {
    if (!address || typeof address !== "string") return "";
    const addr = String(address);
    if (addr.length <= startChars + endChars) return addr;
    return `${addr.slice(0, startChars)}...${addr.slice(-endChars)}`;
  }

  /**
   * Vincular UI de status da carteira em páginas/headers
   * Aceita elementos ou seletores (string) no config
   */
  bindStatusUI(config = {}) {
    const resolve = (ref) => {
      if (!ref) return null;
      if (typeof ref === "string") return document.querySelector(ref);
      return ref;
    };

    const addressEl = resolve(config.addressEl);
    const statusWrapperEl = resolve(config.statusWrapperEl);
    const connectBtnEl = resolve(config.connectBtnEl);
    const dashboardLinkEl = resolve(config.dashboardLinkEl);
    const logoutBtnEl = resolve(config.logoutBtnEl);

    const isBadgeStyle = connectBtnEl ? connectBtnEl.classList.contains("badge") : false;

    const applyState = (state) => {
      const account = state && typeof state.account === "string" && state.account ? state.account : null;
      const connected = !!account && !!this.sessionAuthorized && !!this.isUnlocked;

      // Atualiza texto/visibilidade do endereço
      if (addressEl) {
        addressEl.textContent = connected ? this.formatAddress(account) : "";
      }
      if (statusWrapperEl) {
        statusWrapperEl.classList.toggle("d-none", !connected);
      }

      // Botão conectar: badge → esconder quando conectado; btn → atualizar estilo/texto
      if (connectBtnEl) {
        if (isBadgeStyle) {
          connectBtnEl.classList.toggle("d-none", connected);
        } else {
          if (connected) {
            connectBtnEl.disabled = true;
            connectBtnEl.classList.remove("btn-outline-warning");
            connectBtnEl.classList.add("btn-outline-success");
            connectBtnEl.innerHTML = '<i class="bi bi-check-circle me-1"></i>Conectado';
          } else {
            connectBtnEl.disabled = false;
            connectBtnEl.classList.remove("btn-outline-success");
            connectBtnEl.classList.add("btn-outline-warning");
            connectBtnEl.innerHTML = '<i class="bi bi-wallet2 me-1"></i>Conectar';
          }
        }
      }

      if (dashboardLinkEl) {
        dashboardLinkEl.classList.toggle("d-none", !connected);
      }

      if (logoutBtnEl) {
        logoutBtnEl.classList.toggle("d-none", !connected);
      }
    };

    // Estado inicial: verificar provider para evitar falso positivo
    const refreshFromProvider = async () => {
      try {
        const accounts = await (window.ethereum?.request?.({
          method: "eth_accounts",
        }) || Promise.resolve([]));
        // Detectar estado de bloqueio (MetaMask)
        try {
          if (window.ethereum && window.ethereum._metamask && typeof window.ethereum._metamask.isUnlocked === "function") {
            this.isUnlocked = await window.ethereum._metamask.isUnlocked();
          } else {
            this.isUnlocked = Array.isArray(accounts) && accounts.length > 0;
          }
        } catch (_) {
          this.isUnlocked = Array.isArray(accounts) && accounts.length > 0;
        }
        const authorized = Array.isArray(accounts) && accounts.length > 0;
        const account = authorized ? accounts[0] : null;
        if (account) {
          this.currentAccount = account;
          this.isConnected = !!this.sessionAuthorized && !!this.isUnlocked;
        } else {
          this.currentAccount = null;
          this.isConnected = false;
          try {
            localStorage.removeItem("tokencafe_wallet_cache");
          } catch (_) {}
        }
        applyState({ account });
      } catch (_) {
        try {
          localStorage.removeItem("tokencafe_wallet_cache");
        } catch (_) {}
        applyState({ account: null });
      }
    };
    // Estado inicial seguro: marcar como desconectado até confirmar provider
    applyState({ account: null });
    refreshFromProvider();

    // Eventos para manter sincronizado
    document.addEventListener("wallet:connected", (ev) => applyState(ev.detail));
    document.addEventListener("wallet:disconnected", () => applyState({ account: null }));
    document.addEventListener("wallet:accountChanged", (ev) => applyState(ev.detail));
  }

  /**
   * Verificar se há conexão ativa
   * Compatível com chamadas existentes (PageManager)
   */
  async isConnected() {
    try {
      if (!this.sessionAuthorized) {
        return false;
      }
      if (window.ethereum) {
        const accs = await window.ethereum.request({ method: "eth_accounts" });
        if (accs && accs.length > 0 && this.sessionAuthorized) {
          this.isConnected = true;
          this.currentAccount = accs[0];
        } else {
          this.isConnected = false;
          this.currentAccount = null;
        }
      }
    } catch (e) {
      // silencioso
    }
    return !!this.isConnected && !!this.currentAccount && !!this.sessionAuthorized;
  }

  /**
   * Habilitar/desabilitar debug
   * @param {boolean} enabled - Ativar debug
   */
  // Conexão silenciosa sem prompt (usando contas existentes)
  async connectSilent(walletType = "metamask") {
    try {
      this.log(`🔌 [silencioso] Tentando conectar ${walletType}...`);
      if (!this.isWalletAvailable(walletType)) {
        throw new Error(`${walletType} não está disponível`);
      }
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (!accounts || accounts.length === 0) {
        throw new Error("Nenhuma conta previamente conectada");
      }
      // Importante: conexão silenciosa NÃO autoriza sessão
      this.isConnected = true;
      this.currentAccount = accounts[0];
      this.connectedWallet = walletType;
      await this.updateNetworkInfo();
      await this.updateBalance();
      this.setupWalletListeners();
      this.saveConnectionCache();
      this.emitEvent("wallet:connected", {
        account: this.currentAccount,
        wallet: this.connectedWallet,
        chainId: this.currentChainId,
        network: this.currentNetwork,
      });
      this.log(`✅ [silencioso] ${walletType} conectado: ${this.currentAccount}`);
      return {
        success: true,
        account: this.currentAccount,
        wallet: this.connectedWallet,
        chainId: this.currentChainId,
        network: this.currentNetwork,
        balance: this.balance,
      };
    } catch (error) {
      this.log(`❌ Erro ao conectar (silencioso) ${walletType}: ${error.message}`, "error");
      this.emitEvent("wallet:error", {
        action: "connectSilent",
        wallet: walletType,
        error: error.message,
      });
      throw error;
    }
  }

  setDebug(enabled) {
    this.debug = enabled;
    this.log(`🐛 Debug mode: ${enabled ? "ON" : "OFF"}`);
  }
}

// Exportar instância global
export const walletConnector = new WalletConnector();

// Disponibilizar globalmente
window.walletConnector = walletConnector;
