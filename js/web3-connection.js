/**
 * ================================================================================
 * WEB3 CONNECTION MANAGER - TOKENCAFE
 * ================================================================================
 * Sistema de conexão com MetaMask e outras carteiras Web3
 * Funcionalidades:
 * - Detecção de carteira
 * - Conexão/desconexão
 * - Gerenciamento de sessão
 * - Redirecionamento para dashboard
 * ================================================================================
 */

class Web3ConnectionManager {
    constructor() {
        this.web3 = null;
        this.currentAccount = null;
        this.isConnected = false;
        this.networkId = null;
        
        // Configurações suportadas
        this.supportedNetworks = {
            1: 'Ethereum Mainnet',
            56: 'BSC Mainnet',
            137: 'Polygon Mainnet',
            11155111: 'Sepolia Testnet'
        };
        
        this.init();
    }

    /**
     * Inicialização do sistema
     */
    async init() {
        console.log('🚀 Inicializando Web3ConnectionManager...');
        
        // Verificar se já existe uma sessão ativa
        this.checkExistingSession();
        
        // Configurar listeners
        this.setupEventListeners();
        
        // Atualizar UI inicial
        this.updateUI();
    }

    /**
     * Verificar se existe uma sessão Web3 ativa
     */
    checkExistingSession() {
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        const savedNetwork = localStorage.getItem('tokencafe_network_id');
        
        if (savedAccount && this.isMetaMaskAvailable()) {
            console.log('📱 Sessão encontrada:', savedAccount);
            this.currentAccount = savedAccount;
            this.networkId = savedNetwork;
            this.isConnected = true;
        }
    }

    /**
     * Verificar se MetaMask está disponível
     */
    isMetaMaskAvailable() {
        return typeof window.ethereum !== 'undefined';
    }

    /**
     * Conectar à carteira MetaMask
     */
    async connect() {
        try {
            if (!this.isMetaMaskAvailable()) {
                this.showError('MetaMask não detectado! Por favor, instale a extensão MetaMask.');
                return false;
            }

            console.log('🔗 Solicitando conexão MetaMask...');
            
            // Solicitar acesso às contas
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            if (accounts.length === 0) {
                throw new Error('Nenhuma conta encontrada');
            }

            // Obter network ID
            const networkId = await window.ethereum.request({
                method: 'net_version'
            });

            // Salvar dados da sessão
            this.currentAccount = accounts[0];
            this.networkId = networkId;
            this.isConnected = true;

            // Persistir sessão
            localStorage.setItem('tokencafe_wallet_address', this.currentAccount);
            localStorage.setItem('tokencafe_network_id', this.networkId);
            localStorage.setItem('tokencafe_connection_time', Date.now());

            console.log('✅ Conectado com sucesso!', {
                account: this.currentAccount,
                network: this.supportedNetworks[this.networkId] || `Network ${this.networkId}`
            });

            // Atualizar UI
            this.updateUI();
            
            // Mostrar sucesso
            this.showSuccess(`Conectado: ${this.formatAddress(this.currentAccount)}`);
            
            // Aguardar 2 segundos e redirecionar para dashboard
            setTimeout(() => {
                this.redirectToDashboard();
            }, 2000);

            return true;

        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            this.showError(`Erro na conexão: ${error.message}`);
            return false;
        }
    }

    /**
     * Desconectar da carteira
     */
    async disconnect() {
        try {
            console.log('📤 Desconectando...');
            
            // Limpar dados da sessão
            this.currentAccount = null;
            this.networkId = null;
            this.isConnected = false;
            
            // Limpar localStorage
            localStorage.removeItem('tokencafe_wallet_address');
            localStorage.removeItem('tokencafe_network_id');
            localStorage.removeItem('tokencafe_connection_time');
            localStorage.removeItem('tokencafe_user_profile');
            
            // Atualizar UI
            this.updateUI();
            
            this.showSuccess('Desconectado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao desconectar:', error);
            this.showError('Erro ao desconectar');
        }
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        if (!this.isMetaMaskAvailable()) return;

        // Mudança de conta
        window.ethereum.on('accountsChanged', (accounts) => {
            console.log('👤 Conta alterada:', accounts);
            if (accounts.length === 0) {
                this.disconnect();
            } else if (accounts[0] !== this.currentAccount) {
                this.currentAccount = accounts[0];
                localStorage.setItem('tokencafe_wallet_address', this.currentAccount);
                this.updateUI();
            }
        });

        // Mudança de rede
        window.ethereum.on('chainChanged', (chainId) => {
            console.log('🌐 Rede alterada:', chainId);
            this.networkId = parseInt(chainId, 16);
            localStorage.setItem('tokencafe_network_id', this.networkId);
            this.updateUI();
            window.location.reload(); // Recarregar para evitar problemas
        });

        // Desconexão
        window.ethereum.on('disconnect', () => {
            console.log('📤 MetaMask desconectado');
            this.disconnect();
        });
    }

    /**
     * Atualizar interface do usuário
     */
    updateUI() {
        const connectBtn = document.getElementById('connect-wallet-btn');
        const walletInfo = document.getElementById('wallet-info');
        const accountDisplay = document.getElementById('account-display');
        const networkDisplay = document.getElementById('network-display');

        if (!connectBtn) return;

        if (this.isConnected && this.currentAccount) {
            // Mostrar como conectado
            connectBtn.innerHTML = `
                <i class="fas fa-wallet me-2"></i>
                ${this.formatAddress(this.currentAccount)}
            `;
            connectBtn.className = 'btn btn-success btn-sm dropdown-toggle';
            connectBtn.onclick = null; // Remove o handler de conexão
            
            // Atualizar informações da wallet se existirem
            if (accountDisplay) {
                accountDisplay.textContent = this.currentAccount;
            }
            if (networkDisplay) {
                networkDisplay.textContent = this.supportedNetworks[this.networkId] || `Network ${this.networkId}`;
            }
            
        } else {
            // Mostrar como desconectado
            connectBtn.innerHTML = `
                <i class="fas fa-sign-in-alt me-1"></i>
                Conectar
            `;
            connectBtn.className = 'btn btn-primary btn-sm';
            connectBtn.onclick = () => this.connect();
        }
    }

    /**
     * Formatar endereço da carteira
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    /**
     * Redirecionar para dashboard
     */
    redirectToDashboard() {
        console.log('🎯 Redirecionando para dashboard...');
        
        // Salvar dados para o dashboard
        const dashboardData = {
            wallet: this.currentAccount,
            network: this.networkId,
            networkName: this.supportedNetworks[this.networkId] || `Network ${this.networkId}`,
            connectedAt: Date.now()
        };
        
        localStorage.setItem('tokencafe_dashboard_data', JSON.stringify(dashboardData));
        
        // Redirecionar
        window.location.href = 'pages/dash-main.html';
    }

    /**
     * Mostrar mensagem de sucesso
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Mostrar mensagem de erro
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Sistema de notificações
     */
    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} position-fixed`;
        notification.style.cssText = `
            top: 20px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            border-radius: 8px;
        `;
        
        notification.innerHTML = `
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'} me-2"></i>
            ${message}
            <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    /**
     * Obter informações da sessão atual
     */
    getSessionInfo() {
        return {
            isConnected: this.isConnected,
            account: this.currentAccount,
            network: this.networkId,
            networkName: this.supportedNetworks[this.networkId] || `Network ${this.networkId}`,
            hasMetaMask: this.isMetaMaskAvailable()
        };
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 Inicializando TokenCafe Web3...');
    window.tokencafeWeb3 = new Web3ConnectionManager();
});

// Expor globalmente para debug
window.Web3ConnectionManager = Web3ConnectionManager;