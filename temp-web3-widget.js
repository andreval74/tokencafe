/*
================================================================================
WEB3 MANAGER UNIFICADO - WIDGET SAAS
================================================================================
Sistema completo de integração Web3 com MetaMask e blockchain
Combinação otimizada dos arquivos web3.js e web3-manager.js
================================================================================
*/

class Web3Manager {
    constructor() {
        // Estado da conexão
        this.web3 = null;
        this.provider = null;
        this.account = null;
        this.currentAccount = null;
        this.isConnected = false;
        this.chainId = null;
        this.currentNetwork = null;
        
        // Contratos suportados
        this.contracts = {};
        
        // Redes suportadas (combinado dos dois arquivos)
        this.supportedChains = {
            1: 'Ethereum Mainnet',
            56: 'Binance Smart Chain', 
            97: 'BSC Testnet',
            137: 'Polygon',
            80001: 'Polygon Mumbai',
            43114: 'Avalanche',
            250: 'Fantom'
        };

        this.supportedNetworks = {
            1: { name: 'Ethereum Mainnet', symbol: 'ETH', rpc: 'https://eth-mainnet.g.alchemy.com/v2/', explorer: 'https://etherscan.io' },
            56: { name: 'BSC Mainnet', symbol: 'BNB', rpc: 'https://bsc-dataseed.binance.org/', explorer: 'https://bscscan.com' },
            97: { name: 'BSC Testnet', symbol: 'tBNB', rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/', explorer: 'https://testnet.bscscan.com' },
            137: { name: 'Polygon', symbol: 'MATIC', rpc: 'https://polygon-rpc.com/', explorer: 'https://polygonscan.com' },
            80001: { name: 'Polygon Mumbai', symbol: 'MATIC', rpc: 'https://rpc-mumbai.maticvigil.com/', explorer: 'https://mumbai.polygonscan.com' }
        };
        
        this.init();
    }

    async init() {
        try {
            console.log('🌐 Inicializando Web3Manager Unificado...');
            
            if (typeof window.ethereum !== 'undefined') {
                this.web3 = window.ethereum;
                this.provider = window.ethereum;
                
                await this.checkConnection();
                this.setupEventListeners();
                
                console.log('✅ Web3Manager inicializado com sucesso');
            } else {
                console.warn('⚠️ MetaMask não encontrado');
                this.showInstallMetaMask();
            }
        } catch (error) {
            console.error('❌ Erro ao inicializar Web3Manager:', error);
        }
    }

    // ================================================================================
    // VERIFICAÇÃO E SETUP INICIAL
    // ================================================================================

    isMetaMaskAvailable() {
        return typeof window.ethereum !== 'undefined';
    }

    setupEventListeners() {
        if (this.web3) {
            this.web3.on('accountsChanged', (accounts) => {
                console.log('📱 Conta alterada:', accounts);
                this.handleAccountsChanged(accounts);
            });

            this.web3.on('chainChanged', (chainId) => {
                console.log('🔗 Rede alterada:', chainId);
                this.handleChainChanged(chainId);
            });

            this.web3.on('connect', (connectInfo) => {
                console.log('🔌 Conectado:', connectInfo);
            });

            this.web3.on('disconnect', (error) => {
                console.log('🔌 Desconectado:', error);
                this.handleDisconnect();
            });
        }
    }

    async checkConnection() {
        try {
            const accounts = await this.web3.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.currentAccount = accounts[0];
                this.isConnected = true;
                this.chainId = await this.web3.request({ method: 'eth_chainId' });
                await this.updateNetworkInfo();
                this.updateUI();
                console.log('✅ Conexão existente detectada:', this.account);
            }
        } catch (error) {
            console.error('❌ Erro ao verificar conexão:', error);
        }
    }

    async checkExistingConnection() {
        await this.checkConnection();
    }

    // ================================================================================
    // CONEXÃO E DESCONEXÃO
    // ================================================================================

    async connectWallet() {
        if (!this.web3) {
            this.showInstallMetaMask();
            return false;
        }

        try {
            console.log('🔌 Conectando carteira...');
            
            const accounts = await this.web3.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (accounts.length > 0) {
                this.account = accounts[0];
                this.currentAccount = accounts[0];
                this.isConnected = true;
                this.chainId = await this.web3.request({ method: 'eth_chainId' });
                
                await this.updateNetworkInfo();
                this.updateUI();
                this.saveConnectionState();
                
                // Disparar evento customizado
                this.dispatchEvent('walletConnected', {
                    account: this.currentAccount,
                    network: this.currentNetwork
                });
                
                this.showSuccess('Wallet conectada com sucesso!');
                console.log('✅ Wallet conectada:', this.account);
                return true;
            }
        } catch (error) {
            console.error('❌ Erro ao conectar wallet:', error);
            if (error.code === 4001) {
                this.showError('Conexão rejeitada pelo usuário');
            } else {
                this.showError('Erro ao conectar wallet: ' + error.message);
            }
            return false;
        }
    }

    async connect() {
        return await this.connectWallet();
    }

    async disconnectWallet() {
        try {
            console.log('🔌 Desconectando wallet...');
            
            // Tentar desconexão real se possível
            if (window.ethereum && window.ethereum.selectedAddress) {
                try {
                    await window.ethereum.request({
                        method: "wallet_revokePermissions",
                        params: [{
                            eth_accounts: {}
                        }]
                    });
                    console.log('✅ Permissões revogadas');
                } catch (revokeError) {
                    console.log('⚠️ Revogação não suportada, limpando estado local');
                }
            }

            // Limpar estado local
            this.account = null;
            this.currentAccount = null;
            this.isConnected = false;
            this.chainId = null;
            this.currentNetwork = null;
            this.provider = null;
            
            // Limpar localStorage
            this.clearConnectionState();
            
            // Atualizar UI
            this.updateUI();
            
            // Disparar evento
            this.dispatchEvent('walletDisconnected', {});
            
            this.showSuccess('Wallet desconectada com sucesso!');
            console.log('✅ Wallet desconectada');
            
        } catch (error) {
            console.error('❌ Erro ao desconectar wallet:', error);
        }
    }

    async disconnect() {
        return await this.disconnectWallet();
    }

    // ================================================================================
    // GERENCIAMENTO DE EVENTOS
    // ================================================================================

    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            this.account = null;
            this.currentAccount = null;
            this.isConnected = false;
            this.showNotification('Wallet desconectada', 'warning');
        } else {
            this.account = accounts[0];
            this.currentAccount = accounts[0];
            this.isConnected = true;
            this.showNotification('Conta alterada: ' + this.getShortAddress(accounts[0]), 'info');
        }
        this.updateUI();
        this.dispatchEvent('accountChanged', { account: this.account });
    }

    handleChainChanged(chainId) {
        this.chainId = chainId;
        this.updateNetworkInfo();
        this.updateUI();
        
        const networkName = this.supportedChains[parseInt(chainId, 16)] || 'Rede Desconhecida';
        this.showNotification('Rede alterada para: ' + networkName, 'info');
        
        this.dispatchEvent('networkChanged', { chainId: chainId, network: this.currentNetwork });
    }

    handleDisconnect() {
        this.account = null;
        this.currentAccount = null;
        this.isConnected = false;
        this.updateUI();
        this.dispatchEvent('walletDisconnected', {});
    }

    dispatchEvent(eventName, data) {
        const event = new CustomEvent(`web3${eventName}`, {
            detail: data
        });
        document.dispatchEvent(event);
    }

    // ================================================================================
    // INFORMAÇÕES DA REDE
    // ================================================================================

    async updateNetworkInfo() {
        if (!this.chainId) return;
        
        const networkId = parseInt(this.chainId, 16);
        this.currentNetwork = this.supportedNetworks[networkId] || {
            name: 'Rede Desconhecida',
            symbol: 'ETH',
            rpc: '',
            explorer: ''
        };
    }

    getNetworkName() {
        if (!this.chainId) return 'Desconhecida';
        const networkId = parseInt(this.chainId, 16);
        return this.supportedChains[networkId] || 'Rede Desconhecida';
    }

    // ================================================================================
    // OPERAÇÕES BLOCKCHAIN
    // ================================================================================

    async getBalance(address = null) {
        try {
            const targetAddress = address || this.account;
            if (!targetAddress) {
                throw new Error('Nenhuma conta disponível');
            }

            const balance = await this.web3.request({
                method: 'eth_getBalance',
                params: [targetAddress, 'latest']
            });

            // Converter de Wei para Ether
            const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
            return balanceInEth;
            
        } catch (error) {
            console.error('❌ Erro ao obter saldo:', error);
            return 0;
        }
    }

    async signMessage(message) {
        try {
            if (!this.account) {
                throw new Error('Nenhuma conta conectada');
            }

            const signature = await this.web3.request({
                method: 'personal_sign',
                params: [message, this.account]
            });

            return signature;
        } catch (error) {
            console.error('❌ Erro ao assinar mensagem:', error);
            throw error;
        }
    }

    async sendTransaction(transaction) {
        try {
            if (!this.account) {
                throw new Error('Nenhuma conta conectada');
            }

            const txHash = await this.web3.request({
                method: 'eth_sendTransaction',
                params: [{
                    from: this.account,
                    ...transaction
                }]
            });

            return txHash;
        } catch (error) {
            console.error('❌ Erro ao enviar transação:', error);
            throw error;
        }
    }

    // ================================================================================
    // UTILITÁRIOS
    // ================================================================================

    getShortAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    formatBalance(balance) {
        return parseFloat(balance).toFixed(4);
    }

    // ================================================================================
    // PERSISTÊNCIA
    // ================================================================================

    saveConnectionState() {
        try {
            const state = {
                account: this.account,
                chainId: this.chainId,
                isConnected: this.isConnected,
                timestamp: Date.now()
            };
            localStorage.setItem('web3_connection_state', JSON.stringify(state));
        } catch (error) {
            console.warn('⚠️ Erro ao salvar estado de conexão:', error);
        }
    }

    loadConnectionState() {
        try {
            const state = localStorage.getItem('web3_connection_state');
            if (state) {
                const parsed = JSON.parse(state);
                const age = Date.now() - parsed.timestamp;
                
                // Expirar conexões após 24 horas
                if (age < 24 * 60 * 60 * 1000) {
                    return parsed;
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro ao carregar estado de conexão:', error);
        }
        return null;
    }

    clearConnectionState() {
        try {
            localStorage.removeItem('web3_connection_state');
        } catch (error) {
            console.warn('⚠️ Erro ao limpar estado de conexão:', error);
        }
    }

    // ================================================================================
    // INTERFACE DO USUÁRIO
    // ================================================================================

    updateUI() {
        // Atualizar status de conexão
        const walletStatus = document.getElementById('wallet-status');
        if (walletStatus) {
            walletStatus.className = this.isConnected ? 
                'wallet-status connected' : 'wallet-status disconnected';
            walletStatus.textContent = this.isConnected ? 
                this.getShortAddress(this.account) : 'Não conectado';
        }

        // Atualizar botão de conexão
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.textContent = this.isConnected ? 'Desconectar' : 'Conectar Wallet';
            connectBtn.onclick = this.isConnected ?
                () => this.disconnectWallet() : () => this.connectWallet();
        }

        // Atualizar display de endereço
        const addressDisplay = document.getElementById('connected-wallet-address');
        if (addressDisplay && this.isConnected) {
            addressDisplay.textContent = this.getShortAddress(this.account);
        }

        // Atualizar informações de rede
        const networkDisplay = document.getElementById('network-info');
        if (networkDisplay && this.isConnected) {
            networkDisplay.textContent = this.getNetworkName();
        }
    }

    showInstallMetaMask() {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">MetaMask Necessário</h3>
                    <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Para usar este aplicativo, você precisa instalar a extensão MetaMask.</p>
                    <div class="text-center">
                        <a href="https://metamask.io/download/" target="_blank" class="btn btn-primary">
                            <i class="fab fa-chrome me-2"></i>Instalar MetaMask
                        </a>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // ================================================================================
    // NOTIFICAÇÕES
    // ================================================================================

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// ================================================================================
// INSTÂNCIA GLOBAL E FUNÇÕES AUXILIARES
// ================================================================================

// Instância global
const web3Manager = new Web3Manager();

// Funções auxiliares globais para compatibilidade
window.connectWallet = () => web3Manager.connectWallet();
window.disconnectWallet = () => web3Manager.disconnectWallet(); 
window.getWalletAddress = () => web3Manager.account;
window.isWalletConnected = () => web3Manager.isConnected;
window.signMessage = (message) => web3Manager.signMessage(message);
window.Web3Manager = Web3Manager;
window.web3Manager = web3Manager;

// ================================================================================
// ESTILOS CSS PARA ANIMAÇÕES E COMPONENTES
// ================================================================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .wallet-status.connected {
        color: var(--success-color, #28a745);
    }
    
    .wallet-status.disconnected {
        color: var(--danger-color, #dc3545);
    }

    .modal {
        display: none;
        position: fixed;
        z-index: 10000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
    }

    .modal.active {
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-content {
        background: white;
        border-radius: 8px;
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-header {
        padding: 15px 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .modal-title {
        margin: 0;
        font-size: 1.25rem;
    }

    .modal-close {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-body {
        padding: 20px;
    }
`;
document.head.appendChild(style);

console.log('🌐 Web3Manager Unificado carregado e pronto para uso!');