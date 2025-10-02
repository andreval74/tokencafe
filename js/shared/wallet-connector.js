/**
 * ================================================================================
 * WALLET CONNECTOR - MÓDULO UNIFICADO DE CARTEIRAS
 * ================================================================================
 * Centraliza TODA a lógica de conexão com carteiras Web3
 * Substitui código duplicado em: wallet/script.js, rpc/rpc-index.js, link/link_core.js
 * 
 * FUNCIONALIDADES:
 * - Conexão MetaMask, Trust, WalletConnect, Coinbase
 * - Gerenciamento de estado de conexão
 * - Event listeners centralizados
 * - Cache de dados da carteira
 * - Suporte a múltiplas redes
 * ================================================================================
 */

import { SharedUtilities } from '../core/shared_utilities_es6.js';
import { NetworkManager } from './network-manager.js';

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
        this.balance = '0';
        
        // Configurações suportadas
        this.supportedWallets = ['metamask', 'trust', 'walletconnect', 'coinbase'];
        this.connectedWallet = null;
        
        // Cache e performance
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
        
        // Event listeners ativos
        this.activeListeners = [];
        
        // Debug mode
        this.debug = false;
        
        this.init();
    }

    /**
     * Inicialização do conector
     */
    async init() {
        this.log('🚀 Inicializando WalletConnector...');
        
        // Verificar carteiras disponíveis
        await this.detectAvailableWallets();
        
        // Configurar event listeners globais
        this.setupGlobalListeners();
        
        // Tentar reconectar se havia conexão anterior
        await this.tryAutoReconnect();
        
        this.log('✅ WalletConnector inicializado');
    }

    /**
     * Detectar carteiras disponíveis no navegador
     */
    async detectAvailableWallets() {
        const available = {};
        
        // MetaMask
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask) {
            available.metamask = true;
            this.log('🦊 MetaMask detectado');
        }
        
        // Trust Wallet
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isTrust) {
            available.trust = true;
            this.log('🛡️ Trust Wallet detectado');
        }
        
        // Coinbase
        if (typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet) {
            available.coinbase = true;
            this.log('🔵 Coinbase Wallet detectado');
        }
        
        this.availableWallets = available;
        return available;
    }

    /**
     * Conectar carteira - MÉTODO PRINCIPAL
     * @param {string} walletType - Tipo da carteira (metamask, trust, etc)
     * @returns {Promise<Object>} Resultado da conexão
     */
    async connect(walletType = 'metamask') {
        try {
            this.log(`🔌 Tentando conectar ${walletType}...`);
            
            // Verificar se carteira está disponível
            if (!this.isWalletAvailable(walletType)) {
                throw new Error(`${walletType} não está disponível`);
            }
            
            // Solicitar conexão
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            if (!accounts || accounts.length === 0) {
                throw new Error('Nenhuma conta encontrada');
            }
            
            // Atualizar estado
            this.isConnected = true;
            this.currentAccount = accounts[0];
            this.connectedWallet = walletType;
            
            // Obter informações da rede atual
            await this.updateNetworkInfo();
            
            // Obter saldo
            await this.updateBalance();
            
            // Configurar listeners específicos da carteira
            this.setupWalletListeners();
            
            // Salvar no cache
            this.saveConnectionCache();
            
            // Emitir evento de conexão
            this.emitEvent('wallet:connected', {
                account: this.currentAccount,
                wallet: this.connectedWallet,
                chainId: this.currentChainId,
                network: this.currentNetwork
            });
            
            this.log(`✅ ${walletType} conectado: ${this.currentAccount}`);
            
            return {
                success: true,
                account: this.currentAccount,
                wallet: this.connectedWallet,
                chainId: this.currentChainId,
                network: this.currentNetwork,
                balance: this.balance
            };
            
        } catch (error) {
            this.log(`❌ Erro ao conectar ${walletType}: ${error.message}`, 'error');
            
            this.emitEvent('wallet:error', {
                action: 'connect',
                wallet: walletType,
                error: error.message
            });
            
            throw error;
        }
    }

    /**
     * Desconectar carteira
     */
    async disconnect() {
        try {
            this.log('🔌 Desconectando carteira...');
            
            // Limpar estado
            this.isConnected = false;
            this.currentAccount = null;
            this.currentChainId = null;
            this.currentNetwork = null;
            this.connectedWallet = null;
            this.balance = '0';
            
            // Limpar cache
            this.clearCache();
            
            // Remover listeners
            this.removeWalletListeners();
            
            // Emitir evento
            this.emitEvent('wallet:disconnected');
            
            this.log('✅ Carteira desconectada');
            
            return { success: true };
            
        } catch (error) {
            this.log(`❌ Erro ao desconectar: ${error.message}`, 'error');
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
                throw new Error('Carteira não conectada');
            }
            
            const targetChainId = typeof chainId === 'string' ? chainId : `0x${chainId.toString(16)}`;
            this.log(`🔄 Trocando para rede ${targetChainId}...`);
            
            // Obter dados da rede
            const networkData = await this.networks.getNetworkById(chainId);
            if (!networkData) {
                throw new Error(`Rede ${chainId} não encontrada`);
            }
            
            try {
                // Tentar trocar diretamente
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: targetChainId }]
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
            this.log(`❌ Erro ao trocar rede: ${error.message}`, 'error');
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
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: `0x${networkData.chainId.toString(16)}`,
                    chainName: networkData.name,
                    nativeCurrency: networkData.nativeCurrency,
                    rpcUrls: Array.isArray(networkData.rpc) ? networkData.rpc : [networkData.rpc],
                    blockExplorerUrls: networkData.explorers ? 
                        networkData.explorers.map(e => e.url || e) : []
                }]
            });
            
            this.log(`✅ Rede ${networkData.name} adicionada`);
            
        } catch (error) {
            this.log(`❌ Erro ao adicionar rede: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Atualizar informações da rede atual
     */
    async updateNetworkInfo() {
        try {
            if (!window.ethereum) return;
            
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            this.currentChainId = chainId;
            
            // Buscar dados da rede
            const chainIdDecimal = parseInt(chainId, 16);
            this.currentNetwork = await this.networks.getNetworkById(chainIdDecimal);
            
            this.log(`🌐 Rede atual: ${this.currentNetwork?.name || chainId} (${chainId})`);
            
        } catch (error) {
            this.log(`❌ Erro ao obter info da rede: ${error.message}`, 'error');
        }
    }

    /**
     * Atualizar saldo da conta
     */
    async updateBalance() {
        try {
            if (!this.currentAccount || !window.ethereum) return;
            
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [this.currentAccount, 'latest']
            });
            
            // Converter de wei para ether
            this.balance = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
            
            this.log(`💰 Saldo atualizado: ${this.balance} ETH`);
            
        } catch (error) {
            this.log(`❌ Erro ao obter saldo: ${error.message}`, 'error');
        }
    }

    /**
     * Verificar se carteira está disponível
     * @param {string} walletType - Tipo da carteira
     */
    isWalletAvailable(walletType) {
        switch (walletType) {
            case 'metamask':
                return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
            case 'trust':
                return typeof window.ethereum !== 'undefined' && window.ethereum.isTrust;
            case 'coinbase':
                return typeof window.ethereum !== 'undefined' && window.ethereum.isCoinbaseWallet;
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
                this.emitEvent('wallet:accountChanged', { account: this.currentAccount });
                this.log(`👤 Conta alterada: ${this.currentAccount}`);
            }
        };
        
        // Listener para mudança de rede
        const chainHandler = (chainId) => {
            this.currentChainId = chainId;
            this.updateNetworkInfo();
            this.emitEvent('wallet:chainChanged', { chainId });
            this.log(`🔄 Rede alterada: ${chainId}`);
        };
        
        window.ethereum.on('accountsChanged', accountsHandler);
        window.ethereum.on('chainChanged', chainHandler);
        
        // Salvar referências para remoção posterior
        this.activeListeners.push(
            { event: 'accountsChanged', handler: accountsHandler },
            { event: 'chainChanged', handler: chainHandler }
        );
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
        window.addEventListener('ethereum#initialized', () => {
            this.detectAvailableWallets();
        });
    }

    /**
     * Tentar reconexão automática
     */
    async tryAutoReconnect() {
        try {
            const cachedConnection = this.getConnectionCache();
            if (!cachedConnection) return;
            
            this.log('🔄 Tentando reconexão automática...');
            
            if (this.isWalletAvailable(cachedConnection.wallet)) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                
                if (accounts.length > 0 && accounts[0] === cachedConnection.account) {
                    await this.connect(cachedConnection.wallet);
                    this.log('✅ Reconexão automática bem-sucedida');
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
            timestamp: Date.now()
        };
        
        localStorage.setItem('tokencafe_wallet_cache', JSON.stringify(cacheData));
    }

    /**
     * Recuperar dados do cache
     */
    getConnectionCache() {
        try {
            const cached = localStorage.getItem('tokencafe_wallet_cache');
            if (!cached) return null;
            
            const data = JSON.parse(cached);
            
            // Verificar se cache não expirou
            if (Date.now() - data.timestamp > this.cacheTimeout) {
                this.clearCache();
                return null;
            }
            
            return data;
            
        } catch (error) {
            this.log(`❌ Erro ao ler cache: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Limpar cache
     */
    clearCache() {
        localStorage.removeItem('tokencafe_wallet_cache');
        this.cache.clear();
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
    log(message, level = 'info') {
        if (!this.debug && level !== 'error') return;
        
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}] WalletConnector:`;
        
        switch (level) {
            case 'error':
                console.error(prefix, message);
                break;
            case 'warn':
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
            availableWallets: this.availableWallets
        };
    }

    /**
     * Habilitar/desabilitar debug
     * @param {boolean} enabled - Ativar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
        this.log(`🐛 Debug mode: ${enabled ? 'ON' : 'OFF'}`);
    }
}

// Exportar instância global
export const walletConnector = new WalletConnector();

// Disponibilizar globalmente
window.walletConnector = walletConnector;