/*
================================================================================
AUTH UNIFIED - SISTEMA DE AUTENTICAÇÃO UNIFICADO TOKENCAFE
================================================================================
Unificação dos módulos:
- TokenCafe: js/shared/wallet.js 
- Widget: js/modules/auth-manager.js + js/modules/auth-manager-optimized.js
- Widget: js/shared/auth.js

Sistema completo de autenticação Web3 com:
- Conexão MetaMask
- Gerenciamento de redes
- Autenticação por assinatura
- Estado de sessão
- Eventos de autenticação
================================================================================
*/

class AuthUnified {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventTarget();
        this.config = dependencies.config || {};
        
        // Estado da autenticação
        this.state = {
            isConnected: false,
            account: null,
            network: null,
            networkId: null,
            balance: '0',
            isAuthenticated: false,
            provider: null,
            signer: null
        };

        // Configurações suportadas
        this.supportedNetworks = {
            1: { name: 'Ethereum', rpc: 'https://mainnet.infura.io/v3/', explorer: 'https://etherscan.io' },
            56: { name: 'BSC', rpc: 'https://bsc-dataseed1.binance.org/', explorer: 'https://bscscan.com' },
            137: { name: 'Polygon', rpc: 'https://polygon-rpc.com/', explorer: 'https://polygonscan.com' },
            42161: { name: 'Arbitrum', rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io' }
        };

        this.init();
        console.log('🔐 AuthUnified inicializado');
    }

    /**
     * Inicialização do sistema de autenticação
     */
    init() {
        this.setupEventListeners();
        this.checkExistingConnection();
        this.setupNetworkListeners();
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Eventos do MetaMask
        if (typeof window !== 'undefined' && window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                this.handleAccountsChanged(accounts);
            });

            window.ethereum.on('chainChanged', (chainId) => {
                this.handleNetworkChanged(chainId);
            });

            window.ethereum.on('disconnect', () => {
                this.handleDisconnect();
            });
        }

        // Eventos customizados internos
        this.eventBus.addEventListener('auth:connect', this.connectWallet.bind(this));
        this.eventBus.addEventListener('auth:disconnect', this.disconnectWallet.bind(this));
        this.eventBus.addEventListener('auth:switchNetwork', this.switchNetwork.bind(this));
    }

    /**
     * Verificar conexão existente ao carregar página
     */
    async checkExistingConnection() {
        if (!this.isMetaMaskAvailable()) return false;

        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                await this.handleSuccessfulConnection(accounts[0]);
                console.log('✅ Conexão existente restaurada:', accounts[0]);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar conexão existente:', error);
        }
    }

    /**
     * Conectar carteira MetaMask
     */
    async connectWallet() {
        if (!this.isMetaMaskAvailable()) {
            this.showMetaMaskError();
            return false;
        }

        try {
            console.log('🔄 Conectando com MetaMask...');
            
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length > 0) {
                await this.handleSuccessfulConnection(accounts[0]);
                this.emitAuthEvent('connected', { account: accounts[0] });
                return true;
            }
        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            this.handleConnectionError(error);
            return false;
        }
    }

    /**
     * Processar conexão bem-sucedida
     */
    async handleSuccessfulConnection(account) {
        this.state.account = account;
        this.state.isConnected = true;

        // Obter informações da rede
        await this.updateNetworkInfo();
        
        // Obter saldo
        await this.updateBalance();

        // Configurar provider e signer
        this.setupProvider();

        // Atualizar UI
        this.updateUI();
        
        console.log(`✅ Conectado com sucesso: ${account}`);
        console.log(`📡 Rede: ${this.state.network} (ID: ${this.state.networkId})`);
    }

    /**
     * Configurar provider e signer
     */
    setupProvider() {
        if (typeof window !== 'undefined' && window.ethers && window.ethereum) {
            this.state.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.state.signer = this.state.provider.getSigner();
        }
    }

    /**
     * Atualizar informações da rede
     */
    async updateNetworkInfo() {
        try {
            const chainId = await window.ethereum.request({ 
                method: 'eth_chainId' 
            });
            
            this.state.networkId = parseInt(chainId, 16);
            this.state.network = this.supportedNetworks[this.state.networkId]?.name || 'Desconhecida';
        } catch (error) {
            console.error('❌ Erro ao obter informações da rede:', error);
        }
    }

    /**
     * Atualizar saldo da conta
     */
    async updateBalance() {
        try {
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [this.state.account, 'latest']
            });
            
            // Converter de Wei para Ether
            this.state.balance = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
        } catch (error) {
            console.error('❌ Erro ao obter saldo:', error);
            this.state.balance = '0.0000';
        }
    }

    /**
     * Trocar de rede
     */
    async switchNetwork(networkId) {
        if (!this.isMetaMaskAvailable()) return false;

        try {
            const chainId = `0x${networkId.toString(16)}`;
            
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId }]
            });

            console.log(`✅ Rede alterada para: ${this.supportedNetworks[networkId]?.name}`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao trocar rede:', error);
            
            // Se a rede não existe, tentar adicionar
            if (error.code === 4902) {
                return await this.addNetwork(networkId);
            }
            return false;
        }
    }

    /**
     * Adicionar nova rede
     */
    async addNetwork(networkId) {
        const network = this.supportedNetworks[networkId];
        if (!network) return false;

        try {
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: `0x${networkId.toString(16)}`,
                    chainName: network.name,
                    rpcUrls: [network.rpc],
                    blockExplorerUrls: [network.explorer]
                }]
            });

            console.log(`✅ Rede ${network.name} adicionada`);
            return true;
        } catch (error) {
            console.error('❌ Erro ao adicionar rede:', error);
            return false;
        }
    }

    /**
     * Desconectar carteira
     */
    async disconnectWallet() {
        this.state = {
            isConnected: false,
            account: null,
            network: null,
            networkId: null,
            balance: '0',
            isAuthenticated: false,
            provider: null,
            signer: null
        };

        this.updateUI();
        this.emitAuthEvent('disconnected');
        
        console.log('🔌 Carteira desconectada');
    }

    /**
     * Autenticação por assinatura
     */
    async authenticateWithSignature(message = null) {
        if (!this.state.isConnected) {
            console.error('❌ Carteira não conectada');
            return false;
        }

        try {
            const authMessage = message || `Autenticar na TokenCafe\nTimestamp: ${Date.now()}`;
            
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [authMessage, this.state.account]
            });

            this.state.isAuthenticated = true;
            this.emitAuthEvent('authenticated', { account: this.state.account, signature });
            
            console.log('✅ Autenticação por assinatura realizada');
            return { signature, message: authMessage };
        } catch (error) {
            console.error('❌ Erro na autenticação por assinatura:', error);
            return false;
        }
    }

    /**
     * Handlers de eventos da carteira
     */
    async handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            await this.disconnectWallet();
        } else if (accounts[0] !== this.state.account) {
            await this.handleSuccessfulConnection(accounts[0]);
            this.emitAuthEvent('accountChanged', { account: accounts[0] });
        }
    }

    async handleNetworkChanged(chainId) {
        const networkId = parseInt(chainId, 16);
        this.state.networkId = networkId;
        this.state.network = this.supportedNetworks[networkId]?.name || 'Desconhecida';
        
        await this.updateBalance();
        this.updateUI();
        this.emitAuthEvent('networkChanged', { networkId, network: this.state.network });
    }

    handleDisconnect() {
        this.disconnectWallet();
    }

    handleConnectionError(error) {
        let message = 'Erro na conexão com a carteira';
        
        if (error.code === 4001) {
            message = 'Conexão rejeitada pelo usuário';
        } else if (error.code === -32002) {
            message = 'Pedido de conexão pendente. Verifique o MetaMask';
        }

        this.emitAuthEvent('error', { message, error });
    }

    /**
     * Utilitários
     */
    isMetaMaskAvailable() {
        return typeof window !== 'undefined' && 
               typeof window.ethereum !== 'undefined' && 
               window.ethereum.isMetaMask;
    }

    showMetaMaskError() {
        const message = 'MetaMask não detectado. Instale a extensão para continuar.';
        this.emitAuthEvent('error', { message });
        
        if (typeof window !== 'undefined') {
            alert(message);
        }
    }

    updateUI() {
        // Atualizar elementos da UI
        const accountElement = document.getElementById('wallet-account');
        const networkElement = document.getElementById('wallet-network');
        const balanceElement = document.getElementById('wallet-balance');
        const connectBtn = document.querySelector('[data-auth="connect"]');
        const disconnectBtn = document.querySelector('[data-auth="disconnect"]');

        if (accountElement) {
            accountElement.textContent = this.state.isConnected 
                ? `${this.state.account.slice(0, 6)}...${this.state.account.slice(-4)}`
                : 'Não conectado';
        }

        if (networkElement) {
            networkElement.textContent = this.state.network || 'N/A';
        }

        if (balanceElement) {
            balanceElement.textContent = `${this.state.balance} ETH`;
        }

        if (connectBtn) {
            connectBtn.style.display = this.state.isConnected ? 'none' : 'block';
        }

        if (disconnectBtn) {
            disconnectBtn.style.display = this.state.isConnected ? 'block' : 'none';
        }
    }

    emitAuthEvent(type, data = {}) {
        const event = new CustomEvent(`auth:${type}`, {
            detail: { ...data, state: this.state }
        });
        
        this.eventBus.dispatchEvent(event);
        
        // Emitir também no document para compatibilidade
        if (typeof document !== 'undefined') {
            document.dispatchEvent(event);
        }
    }

    /**
     * API Pública
     */
    getState() {
        return { ...this.state };
    }

    isConnected() {
        return this.state.isConnected;
    }

    isAuthenticated() {
        return this.state.isAuthenticated;
    }

    getAccount() {
        return this.state.account;
    }

    getNetwork() {
        return {
            id: this.state.networkId,
            name: this.state.network
        };
    }

    getProvider() {
        return this.state.provider;
    }

    getSigner() {
        return this.state.signer;
    }

    getSupportedNetworks() {
        return this.supportedNetworks;
    }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.AuthUnified = AuthUnified;
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthUnified;
}
