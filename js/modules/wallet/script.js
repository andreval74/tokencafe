
/**
 * ================================================================================
 * TOKENCAFE WALLET MANAGER - SCRIPT CONSOLIDADO
 * ================================================================================
 * Sistema unificado para gerenciamento de carteiras Web3
 * Consolidação de todas as funções relacionadas a MetaMask, Web3Modal e UI
 * ================================================================================
 */

class TokenCafeWalletManager {
    constructor() {
        // Web3Modal properties
        this.web3Modal = null;
        this.provider = null;
        this.ethersProvider = null;
        this.signer = null;
        
        // Wallet state
        this.currentAccount = null;
        this.isConnected = false;
        this.networkId = null;
        this.chainId = null;
        
        // Configurações suportadas
        this.supportedNetworks = {
            1: 'Ethereum Mainnet',
            56: 'BSC Mainnet',
            137: 'Polygon Mainnet',
            42161: 'Arbitrum One',
            10: 'Optimism',
            11155111: 'Sepolia Testnet'
        };
        
        // Event listeners registry
        this.eventListeners = new Map();
        
        this.init();
    }

    /**
     * Limpar elementos do header quando desconectado
     */
    clearHeaderElements() {
        const headerBtn = document.getElementById('connect-wallet-btn');
        if (headerBtn) {
            headerBtn.textContent = 'Conectar Carteira';
            headerBtn.className = 'btn btn-primary btn-sm me-2';
            headerBtn.onclick = () => this.connectWallet();
        }
    }

    /**
     * Limpar elementos do sidebar quando desconectado
     */
    clearSidebarElements() {
        const walletAddress = document.getElementById('wallet-address');
        if (walletAddress) {
            walletAddress.textContent = 'Desconectado';
        }
        
        const connectedWalletAddress = document.getElementById('connected-wallet-address');
        if (connectedWalletAddress) {
            connectedWalletAddress.textContent = 'Desconectado';
            connectedWalletAddress.className = 'badge bg-danger d-block text-center py-1';
            connectedWalletAddress.style.cursor = 'default';
            connectedWalletAddress.onclick = null;
            connectedWalletAddress.title = 'Carteira desconectada';
        }
    }

    /**
     * Inicialização do sistema
     */
    async init() {
        console.log('🚀 Inicializando TokenCafe Wallet Manager...');
        
        // Inicializar Web3Modal
        this.initWeb3Modal();
        
        // Configurar listeners de eventos da UI
        this.setupEventListeners();
        
        // Atualizar UI inicial (sempre desconectado)
        this.updateUI();
        
        console.log('✅ TokenCafe Wallet Manager inicializado - Aguardando conexão manual');
    }

    /**
     * Inicializar Web3Modal
     */
    initWeb3Modal() {
        if (typeof window.Web3Modal !== 'undefined') {
            this.web3Modal = new window.Web3Modal.default({
                cacheProvider: false,
                providerOptions: {}
            });
        }
    }

    /**
     * Verificar se existe uma sessão Web3 ativa
     */
    async checkExistingSession() {
        try {
            if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    this.isConnected = true;
                    this.provider = window.ethereum;
                    
                    // Configurar ethers provider se não existir
                    if (!this.ethersProvider && typeof ethers !== 'undefined') {
                        this.ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
                        this.signer = this.ethersProvider.getSigner();
                    }
                    
                    // Obter network info
                    const network = await this.ethersProvider.getNetwork();
                    this.chainId = network.chainId;
                    this.networkId = network.chainId;
                    
                    // IMPORTANTE: Configurar listeners para mudanças de carteira
                    this.setupProviderListeners();
                    
                    console.log('🔄 Sessão existente encontrada:', this.currentAccount);
                    this.updateUI();
                    this.emitWalletEvent('wallet:connected', { account: this.currentAccount });
                }
            }
        } catch (error) {
            console.log('ℹ️ Nenhuma sessão ativa encontrada');
        }
    }

    /**
      * Conectar carteira - Sempre força nova conexão/autenticação via Web3Modal
      */
     async connectWallet() {
         try {
             this.showStatus('Abrindo modal de conexão de carteiras...', 'info');
             
             // Verificar se Web3Modal está disponível
             if (!this.web3Modal) {
                 throw new Error('Web3Modal não está disponível. Verifique se as bibliotecas foram carregadas corretamente.');
             }
             
             // Limpar cache para forçar escolha/autenticação
             if (this.web3Modal.clearCachedProvider) {
                 await this.web3Modal.clearCachedProvider();
             }
             
             // Se já existe provider, desconecta para garantir novo fluxo
             if (this.provider && this.provider.disconnect) {
                 await this.provider.disconnect();
             }
             
             // Conectar APENAS via Web3Modal para garantir confirmação de senha
             this.provider = await this.web3Modal.connect();
             
             // Configurar ethers provider
             if (typeof ethers !== 'undefined') {
                 this.ethersProvider = new ethers.providers.Web3Provider(this.provider);
                 this.signer = this.ethersProvider.getSigner();
             }
             
             // Forçar autorização explícita para garantir que o usuário confirme
             if (this.provider.request) {
                 try {
                     await this.provider.request({ 
                         method: 'wallet_requestPermissions', 
                         params: [{ eth_accounts: {} }] 
                     });
                 } catch (e) {
                     console.log('⚠️ Permissão não solicitada ou já concedida');
                 }
             }
             
             // Obter conta
             const accounts = await this.provider.request({ method: 'eth_requestAccounts' });
             if (!accounts || accounts.length === 0) {
                 throw new Error('Nenhuma conta autorizada');
             }
             
             this.currentAccount = accounts[0];
             this.isConnected = true;
             
             // Configurar listeners para mudanças
             this.setupProviderListeners();
             
             // Atualizar informações da carteira
             await this.updateWalletInfo();
             
             // Salvar sessão
             this.saveSession();
             
             // Atualizar UI
             this.updateUI();
             
             // Emitir evento
             this.emitWalletEvent('wallet:connected', { 
                 account: this.currentAccount,
                 chainId: this.chainId 
             });
             
             this.showStatus('Carteira conectada com sucesso!', 'success');
             
             return true;
             
         } catch (error) {
             console.error('❌ Erro ao conectar carteira:', error);
             this.showStatus('Conexão cancelada ou erro: ' + error.message, 'danger');
             return false;
         }
     }

    /**
     * Configurar listeners do provider
     */
    setupProviderListeners() {
        if (!this.provider || !this.provider.on) return;
        
        // Evitar listeners duplicados
        if (this.provider._hasTokenCafeListeners) return;
        
        console.log('🔧 Configurando listeners de mudança de carteira...');
        
        // Mudança de contas
        this.provider.on('accountsChanged', async (accounts) => {
            console.log('🔄 Mudança de conta detectada:', accounts);
            if (accounts && accounts.length > 0) {
                const oldAccount = this.currentAccount;
                this.currentAccount = accounts[0];
                
                // Atualizar signer com nova conta
                if (this.ethersProvider) {
                    this.signer = this.ethersProvider.getSigner();
                }
                
                await this.updateWalletInfo();
                this.saveSession(); // Salvar nova sessão
                this.updateUI();
                this.emitWalletEvent('wallet:accountChanged', { 
                    oldAccount: oldAccount,
                    newAccount: this.currentAccount 
                });
                this.showStatus(`Conta alterada para: ${this.formatAddress(this.currentAccount)}`, 'success');
            } else {
                console.log('🔌 Nenhuma conta disponível - desconectando');
                this.disconnect();
            }
        });
        
        // Mudança de rede
        this.provider.on('chainChanged', async (chainId) => {
            console.log('🌐 Mudança de rede detectada:', chainId);
            const oldChainId = this.chainId;
            this.chainId = parseInt(chainId, 16);
            this.networkId = this.chainId;
            
            // Recriar ethers provider para nova rede
            if (typeof ethers !== 'undefined') {
                this.ethersProvider = new ethers.providers.Web3Provider(this.provider);
                this.signer = this.ethersProvider.getSigner();
            }
            
            await this.updateWalletInfo();
            this.saveSession(); // Salvar nova sessão
            this.updateUI();
            this.emitWalletEvent('wallet:chainChanged', { 
                oldChainId: oldChainId,
                newChainId: this.chainId 
            });
            
            const networkName = this.supportedNetworks[this.chainId] || `Chain ${this.chainId}`;
            this.showStatus(`Rede alterada para: ${networkName}`, 'info');
        });
        
        // Desconexão
        this.provider.on('disconnect', (error) => {
            console.log('🔌 Desconexão detectada:', error);
            this.disconnect();
        });
        
        this.provider._hasTokenCafeListeners = true;
        console.log('✅ Listeners de carteira configurados com sucesso');
    }

    /**
     * Atualizar informações da carteira
     */
    async updateWalletInfo() {
        if (!this.signer || !this.ethersProvider) return;
        
        try {
            // Obter endereço
            const address = await this.signer.getAddress();
            this.currentAccount = address;
            
            // Obter rede
            const network = await this.ethersProvider.getNetwork();
            this.chainId = network.chainId;
            this.networkId = network.chainId;
            
            // Atualizar elementos da UI se existirem
            const addressElement = document.getElementById('walletAddress');
            if (addressElement) {
                addressElement.textContent = address;
            }
            
            const networkElement = document.getElementById('networkName');
            if (networkElement) {
                const networkName = this.supportedNetworks[this.chainId] || `Chain ${this.chainId}`;
                networkElement.textContent = `${networkName} (${this.chainId})`;
            }
            
            // Obter saldo
            const balance = await this.ethersProvider.getBalance(address);
            const balanceElement = document.getElementById('ethBalance');
            if (balanceElement && typeof ethers !== 'undefined') {
                balanceElement.textContent = ethers.utils.formatEther(balance) + ' ETH';
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar informações da carteira:', error);
        }
    }

    /**
     * Desconectar carteira
     */
    async disconnect() {
        try {
            console.log('🔌 Desconectando carteira...');
            
            // Desconectar provider
            if (this.provider && this.provider.disconnect) {
                await this.provider.disconnect();
            }
            
            // Limpar cache do Web3Modal
            if (this.web3Modal && this.web3Modal.clearCachedProvider) {
                await this.web3Modal.clearCachedProvider();
            }
            
            // Resetar estado
            this.provider = null;
            this.signer = null;
            this.ethersProvider = null;
            this.currentAccount = null;
            this.isConnected = false;
            this.networkId = null;
            this.chainId = null;
            
            // Limpar sessão
            this.clearSession();
            
            // Atualizar UI
            this.updateUI();
            
            // Emitir evento
            this.emitWalletEvent('wallet:disconnected', {});
            
            this.showStatus('Carteira desconectada.', 'info');
            
        } catch (error) {
            console.error('❌ Erro ao desconectar:', error);
        }
    }

    /**
     * Salvar sessão no localStorage
     */
    saveSession() {
        if (this.currentAccount) {
            localStorage.setItem('tokencafe_wallet_address', this.currentAccount);
            localStorage.setItem('tokencafe_network_id', this.networkId?.toString() || '');
            localStorage.setItem('tokencafe_connection_time', Date.now().toString());
            localStorage.setItem('tokencafe_connected', 'true');
        }
    }

    /**
     * Limpar sessão do localStorage
     */
    clearSession() {
        localStorage.removeItem('tokencafe_wallet_address');
        localStorage.removeItem('tokencafe_network_id');
        localStorage.removeItem('tokencafe_connection_time');
        localStorage.removeItem('tokencafe_connected');
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botão conectar
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.onclick = () => this.connectWallet();
        }
        
        // Botão desconectar
        const disconnectBtn = document.getElementById('disconnectWallet');
        if (disconnectBtn) {
            disconnectBtn.onclick = () => this.disconnect();
        }
        
        // Botão copiar endereço
        const copyBtn = document.getElementById('copyAddressBtn');
        if (copyBtn) {
            copyBtn.onclick = () => this.copyAddress();
        }
    }

    /**
     * Copiar endereço para clipboard
     */
    copyAddress() {
        if (this.currentAccount) {
            navigator.clipboard.writeText(this.currentAccount).then(() => {
                this.showStatus('Endereço copiado!', 'success');
            }).catch(() => {
                this.showStatus('Erro ao copiar endereço', 'danger');
            });
        }
    }

    /**
     * Atualizar UI baseado no estado da carteira
     */
    updateUI() {
        // Elementos principais da UI
        const connectCard = document.querySelector('.card:not(#walletInfo .card)'); // Quadro de conexão
        const walletInfo = document.getElementById('walletInfo'); // Quadro de dados da carteira
        
        if (this.isConnected && this.currentAccount) {
            // CONECTADO: Ocultar quadro de conexão e mostrar dados da carteira
            if (connectCard) {
                connectCard.style.display = 'none';
            }
            
            if (walletInfo) {
                walletInfo.classList.remove('d-none');
                
                // Atualizar dados da carteira
                const addressElement = document.getElementById('walletAddress');
                if (addressElement) {
                    addressElement.textContent = this.currentAccount;
                }
                
                const networkElement = document.getElementById('networkName');
                if (networkElement && this.chainId) {
                    const networkName = this.supportedNetworks[this.chainId] || `Chain ${this.chainId}`;
                    networkElement.textContent = `${networkName} (${this.chainId})`;
                }
                
                // Atualizar saldo se provider está disponível
                if (this.ethersProvider && this.currentAccount) {
                    this.updateBalance();
                }
            }
            
            // Atualizar elementos do header/sidebar
            this.updateHeaderElements();
            this.updateSidebarElements();
            
        } else {
            // DESCONECTADO: Mostrar quadro de conexão e ocultar dados da carteira
            if (connectCard) {
                connectCard.style.display = 'block';
            }
            
            if (walletInfo) {
                walletInfo.classList.add('d-none');
                
                // Limpar dados dos elementos
                const addressElement = document.getElementById('walletAddress');
                if (addressElement) {
                    addressElement.textContent = '';
                }
                
                const networkElement = document.getElementById('networkName');
                if (networkElement) {
                    networkElement.textContent = '';
                }
                
                const balanceElement = document.getElementById('ethBalance');
                if (balanceElement) {
                    balanceElement.textContent = '';
                }
            }
            
            // Limpar elementos do header/sidebar
            this.clearHeaderElements();
            this.clearSidebarElements();
        }
        
        // Atualizar texto do botão de conexão (se ainda visível)
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.textContent = this.isConnected ? 'Reconectar' : 'Conectar Carteira';
        }
    }

    /**
     * Atualizar saldo da carteira
     */
    async updateBalance() {
        if (!this.ethersProvider || !this.currentAccount) return;
        
        try {
            const balance = await this.ethersProvider.getBalance(this.currentAccount);
            const balanceElement = document.getElementById('ethBalance');
            if (balanceElement && typeof ethers !== 'undefined') {
                balanceElement.textContent = ethers.utils.formatEther(balance) + ' ETH';
            }
        } catch (error) {
            console.error('❌ Erro ao obter saldo:', error);
            const balanceElement = document.getElementById('ethBalance');
            if (balanceElement) {
                balanceElement.textContent = 'Erro ao carregar';
            }
        }
    }

    /**
     * Atualizar elementos do header
     */
    updateHeaderElements() {
        const headerBtn = document.getElementById('connect-wallet-btn');
        if (headerBtn) {
            if (this.isConnected) {
                headerBtn.textContent = this.formatAddress(this.currentAccount);
                headerBtn.className = 'btn btn-success btn-sm me-2';
                headerBtn.onclick = () => this.copyAddress();
            } else {
                headerBtn.textContent = 'Conectar Carteira';
                headerBtn.className = 'btn btn-primary btn-sm me-2';
                headerBtn.onclick = () => this.connectWallet();
            }
        }
    }

    /**
     * Atualizar elementos do sidebar
     */
    updateSidebarElements() {
        const walletAddress = document.getElementById('wallet-address');
        if (walletAddress) {
            if (this.isConnected) {
                walletAddress.textContent = this.formatAddress(this.currentAccount);
            } else {
                walletAddress.textContent = 'Desconectado';
            }
        }
        
        const connectedWalletAddress = document.getElementById('connected-wallet-address');
        if (connectedWalletAddress) {
            if (this.isConnected) {
                const shortAddress = this.formatAddress(this.currentAccount);
                connectedWalletAddress.textContent = shortAddress;
                connectedWalletAddress.className = 'badge bg-success d-block text-center py-1';
                connectedWalletAddress.title = `${this.currentAccount} - Clique para copiar`;
                connectedWalletAddress.style.cursor = 'pointer';
                connectedWalletAddress.onclick = () => this.copyAddress();
            } else {
                connectedWalletAddress.textContent = 'Desconectado';
                connectedWalletAddress.className = 'badge bg-danger d-block text-center py-1';
                connectedWalletAddress.style.cursor = 'default';
                connectedWalletAddress.onclick = null;
                connectedWalletAddress.title = 'Carteira desconectada';
            }
        }
    }

    /**
     * Mostrar status na UI
     */
    showStatus(msg, type = 'info') {
        const statusDiv = document.getElementById('connectionStatus');
        const messageSpan = document.getElementById('statusMessage');
        
        if (statusDiv && messageSpan) {
            statusDiv.className = `alert alert-${type}`;
            statusDiv.classList.remove('d-none');
            messageSpan.textContent = msg;
            
            if (type === 'success') {
                setTimeout(() => { 
                    statusDiv.classList.add('d-none'); 
                }, 4000);
            }
        } else {
            // Fallback para console se elementos não existirem
            console.log(`${type.toUpperCase()}: ${msg}`);
        }
    }

    /**
     * Formatar endereço para exibição
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    /**
     * Emitir eventos personalizados
     */
    emitWalletEvent(eventType, data) {
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
        
        // Compatibilidade com EventBus se existir
        if (window.EventBus && typeof window.EventBus.emit === 'function') {
            window.EventBus.emit(eventType, data);
        }
    }

    /**
     * Verificar se MetaMask está disponível
     */
    isMetaMaskAvailable() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    /**
     * Obter informações da sessão
     */
    getSessionInfo() {
        return {
            account: this.currentAccount,
            isConnected: this.isConnected,
            networkId: this.networkId,
            chainId: this.chainId,
            provider: this.provider ? 'connected' : 'disconnected'
        };
    }
}

// ================================================================================
// FUNÇÕES GLOBAIS PARA COMPATIBILIDADE
// ================================================================================

let walletManager;

// Inicializar quando DOM estiver pronto
function initializeWalletManager() {
    walletManager = new TokenCafeWalletManager();
    
    // Expor globalmente para compatibilidade
    window.TokenCafeWallet = walletManager;
    window.walletManager = walletManager;
    
    // Funções globais de compatibilidade
    window.connectWallet = () => walletManager.connectWallet();
    window.disconnectWallet = () => walletManager.disconnect();
    window.connectWalletFromHeader = () => walletManager.connectWallet();
    window.disconnectWalletFromHeader = () => walletManager.disconnect();
    window.isWalletConnected = () => walletManager.isConnected;
    window.getCurrentAccount = () => walletManager.currentAccount;
    window.formatWalletAddress = (address) => walletManager.formatAddress(address);
    
    console.log('✅ TokenCafe Wallet Manager carregado e disponível globalmente');
}

// Inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWalletManager);
} else {
    initializeWalletManager();
}

// ================================================================================
// COMPATIBILIDADE COM SISTEMAS EXISTENTES
// ================================================================================

// Event listeners para compatibilidade
document.addEventListener('wallet:connected', function(event) {
    if (walletManager) {
        walletManager.updateUI();
    }
});

document.addEventListener('wallet:accountChanged', function(event) {
    if (walletManager) {
        walletManager.updateUI();
    }
});

document.addEventListener('wallet:disconnected', function(event) {
    if (walletManager) {
        walletManager.updateUI();
    }
});

// Verificar periodicamente o estado da conexão
setInterval(() => {
    if (walletManager && walletManager.isConnected) {
        walletManager.updateUI();
    }
}, 5000);

console.log('✅ TokenCafe Wallet Script Consolidado carregado');
