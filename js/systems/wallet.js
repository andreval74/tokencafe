/**
 * ================================================================================
 * WALLET SYSTEM - TOKENCAFE
 * ================================================================================
 * Sistema unificado para gerenciamento de carteiras Web3
 * Consolidação de todas as funções relacionadas a MetaMask e Web3
 * ================================================================================
 */

class WalletSystem {
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
        console.log('🚀 Inicializando WalletSystem...');
        
        // Verificar se já existe uma sessão ativa
        await this.checkExistingSession();
        
        // Configurar listeners
        this.setupEventListeners();
        
        // Atualizar UI inicial
        this.updateUI();
        
        console.log('✅ WalletSystem inicializado com sucesso');
    }

    /**
     * Verificar se existe uma sessão Web3 ativa
     */
    async checkExistingSession() {
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        const savedNetwork = localStorage.getItem('tokencafe_network_id');
        
        if (!savedAccount || !this.isMetaMaskAvailable()) {
            this.isConnected = false;
            return false;
        }

        try {
            console.log('📱 Verificando sessão salva:', savedAccount);
            
            // Verificar se MetaMask ainda tem essa conta conectada
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });

            // Se não há contas ou a conta salva não está nas contas conectadas
            if (accounts.length === 0 || !accounts.find(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
                console.log('❌ Conta não está mais conectada no MetaMask');
                this.clearSession();
                return false;
            }

            // Verificar network atual
            const currentNetworkId = await window.ethereum.request({
                method: 'net_version'
            });

            // Restaurar sessão
            this.currentAccount = savedAccount;
            this.networkId = currentNetworkId;
            this.isConnected = true;

            console.log('✅ Sessão restaurada:', {
                account: this.currentAccount,
                network: this.supportedNetworks[this.networkId] || `Network ${this.networkId}`
            });

            return true;

        } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
            this.clearSession();
            return false;
        }
    }

    /**
     * Limpar dados da sessão
     */
    clearSession() {
        this.currentAccount = null;
        this.networkId = null;
        this.isConnected = false;
        
        localStorage.removeItem('tokencafe_wallet_address');
        localStorage.removeItem('tokencafe_network_id');
        localStorage.removeItem('tokencafe_connection_time');
        localStorage.removeItem('tokencafe_connected');
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
            localStorage.setItem('tokencafe_connected', 'true');

            console.log('✅ Conectado com sucesso!', {
                account: this.currentAccount,
                network: this.supportedNetworks[this.networkId] || `Network ${this.networkId}`
            });

            // Atualizar UI
            this.updateUI();
            
            // Mostrar sucesso
            this.showSuccess(`Conectado: ${this.formatAddress(this.currentAccount)}`);
            
            // Aguardar 2 segundos e redirecionar para dashboard se necessário
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
            this.clearSession();
            
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
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Redirecionar para dashboard
     */
    redirectToDashboard() {
        // Se estiver na página inicial, redirecionar para dashboard
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = 'dash-main.html';
        }
    }

    /**
     * Mostrar mensagem de sucesso
     */
    showSuccess(message) {
        console.log('✅', message);
        
        // Integração com sistema de notificações se disponível
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else if (window.TokenCafe?.ui?.showNotification) {
            window.TokenCafe.ui.showNotification(message, 'success');
        } else {
            // Fallback para alert temporário
            alert(message);
        }
    }

    /**
     * Mostrar mensagem de erro
     */
    showError(message) {
        console.error('❌', message);
        
        // Integração com sistema de notificações se disponível
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        } else if (window.TokenCafe?.ui?.showNotification) {
            window.TokenCafe.ui.showNotification(message, 'error');
        } else {
            // Fallback para alert temporário
            alert(message);
        }
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

// ================================================================================
// FUNÇÕES GLOBAIS DE COMPATIBILIDADE
// ================================================================================

// Funções globais para compatibilidade com botões HTML
function connectWallet() {
    if (window.tokencafeWallet) {
        return window.tokencafeWallet.connect();
    } else {
        console.error('❌ WalletSystem não inicializado');
        return false;
    }
}

function disconnectWallet() {
    if (window.tokencafeWallet) {
        return window.tokencafeWallet.disconnect();
    } else {
        console.error('❌ WalletSystem não inicializado');
        return false;
    }
}

// Funções específicas para header
function connectWalletFromHeader() {
    console.log('connectWalletFromHeader() chamado');
    if (window.tokencafeWallet) {
        window.tokencafeWallet.connect();
    } else {
        console.error('WalletSystem não encontrado');
        alert('Erro: Sistema de conexão não disponível');
    }
}

function disconnectWalletFromHeader() {
    console.log('disconnectWalletFromHeader() chamado');
    if (window.tokencafeWallet) {
        window.tokencafeWallet.disconnect();  
    } else {
        console.error('WalletSystem não encontrado');
        alert('Erro: Sistema de desconexão não disponível');
    }
}

// ================================================================================
// INICIALIZAÇÃO E EXPOSIÇÃO GLOBAL
// ================================================================================

// Expor globalmente
window.WalletSystem = WalletSystem;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.connectWalletFromHeader = connectWalletFromHeader;
window.disconnectWalletFromHeader = disconnectWalletFromHeader;

// Criar instância global quando DOM estiver pronto
function initializeWalletSystem() {
    if (!window.tokencafeWallet) {
        console.log('🏗️ Inicializando Wallet System...');
        window.tokencafeWallet = new WalletSystem();
        console.log('✅ Wallet System inicializado');
    }
}

// Inicializar imediatamente se DOM já estiver pronto, senão aguardar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWalletSystem);
} else {
    initializeWalletSystem();
}

console.log('✅ Wallet System carregado');