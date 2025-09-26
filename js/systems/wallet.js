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
     * IMPORTANTE: Usa eth_accounts (não requer ação do usuário) para verificação silenciosa
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
            
            // Usar eth_accounts para verificação silenciosa (não requer ação do usuário)
            // eth_requestAccounts só deve ser usado quando o usuário clica em "conectar"
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });

            // Se não há contas ou a conta salva não está nas contas conectadas
            if (accounts.length === 0 || !accounts.find(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
                console.log('❌ Conta não está mais conectada.');
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
            
            // Atualizar botão do header quando conecta
            if (typeof debounceUpdateHeaderButton === 'function') {
                debounceUpdateHeaderButton();
            } else if (typeof updateHeaderButton === 'function') {
                updateHeaderButton();
            }
            
            // Mostrar sucesso
            this.showSuccess(`Conectado: ${this.formatAddress(this.currentAccount)}`);
            
            // Aguardar 2 segundos e redirecionar para dashboard se necessário
            setTimeout(() => {
                this.redirectToDashboard();
            }, 2000);

            return true;

        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            
            // Tratamento específico para erro 4001 (usuário rejeitou a conexão)
            if (error.code === 4001) {
                this.showError('Conexão cancelada pelo usuário. Clique em "Conectar" novamente quando estiver pronto.');
            } else if (error.code === -32002) {
                this.showError('Já existe uma solicitação de conexão pendente. Verifique o MetaMask.');
            } else {
                this.showError(`Erro na conexão: ${error.message}`);
            }
            
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
            
            // Atualizar botão do header quando desconecta
            if (typeof debounceUpdateHeaderButton === 'function') {
                debounceUpdateHeaderButton();
            } else if (typeof updateHeaderButton === 'function') {
                updateHeaderButton();
            }
            
            this.showSuccess('Desconectado com sucesso!');
            
            // Redirecionar para página inicial se estiver no dashboard
            if (window.location.pathname.includes('dashboard')) {
                setTimeout(() => {
                    window.location.href = '../../pages/modules/dashboard/index.html';
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ Erro ao desconectar:', error);
            this.showError('Erro ao desconectar');
        }
    }

    /**
     * Função global de desconexão que pode ser chamada de qualquer lugar
     */
    globalDisconnect() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            // Se não está conectado, apenas limpa a sessão e redireciona
            this.clearSession();
            window.location.href = '/index.html';
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
            // Removido window.location.reload() - não é necessário recarregar a página
            // A UI será atualizada automaticamente através do updateUI()
            console.log('🌐 Rede alterada, UI atualizada automaticamente');
        });

        // Desconexão
        window.ethereum.on('disconnect', () => {
            console.log('📤 MetaMask desconectado');
            this.disconnect();
        });
    }

    /**
     * Atualizar interface do usuário
     * Atualiza todos os elementos relacionados à carteira na página
     */
    updateUI() {
        const connectBtn = document.getElementById('connect-wallet-btn');
        const walletInfo = document.getElementById('wallet-info');
        const accountDisplay = document.getElementById('account-display');
        const networkDisplay = document.getElementById('network-display');
        
        // Elementos específicos da página tools.html
        const disconnectBtn = document.getElementById('disconnect-btn');
        const walletStatus = document.getElementById('wallet-status');
        const walletAddress = document.getElementById('wallet-address');

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
            
            // Atualizar elementos específicos da página tools.html
            if (disconnectBtn && walletStatus && walletAddress) {
                // Mostrar informações da carteira
                walletAddress.textContent = this.formatAddress(this.currentAccount);
                
                // Atualizar informação da rede
                const networkInfo = document.getElementById('network-info');
                if (networkInfo) {
                    networkInfo.textContent = this.supportedNetworks[this.networkId] || `Rede ${this.networkId}`;
                }
                
                // Mostrar/ocultar elementos
                connectBtn.classList.add('d-none');
                disconnectBtn.classList.remove('d-none');
                walletStatus.classList.remove('d-none');
            }
            
        } else {
            // Mostrar como desconectado
            connectBtn.innerHTML = `
                <i class="fas fa-sign-in-alt me-1"></i>
                Conectar
            `;
            connectBtn.className = 'btn btn-primary btn-sm';
            connectBtn.onclick = () => this.connect();
            
            // Atualizar elementos específicos da página tools.html
            if (disconnectBtn && walletStatus) {
                // Ocultar informações da carteira
                connectBtn.classList.remove('d-none');
                disconnectBtn.classList.add('d-none');
                walletStatus.classList.add('d-none');
            }
        }
        
        // Atualizar estado dos botões de ferramentas se a função existir
        if (typeof window.updateToolButtonStates === 'function') {
            window.updateToolButtonStates();
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
            window.location.href = '/pages/modules/dashboard/';
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
        }
        // Removido alert para evitar janelas de aviso
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
        }
        // Removido alert para evitar janelas de aviso
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
        // Verificar se já está conectado
        if (window.tokencafeWallet.isConnected) {
            // Se já está conectado, redirecionar para o dashboard
            window.location.href = 'pages/modules/dashboard/index.html';
        } else {
            // Se não está conectado, conectar
            window.tokencafeWallet.connect();
        }
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
// FUNÇÕES ESPECÍFICAS PARA PÁGINA INDEX
// ================================================================================

/**
 * Limpar todas as sessões ao carregar a página index.html
 */
function clearAllSessions() {
    console.log('🧹 Limpando todas as sessões...');
    
    // Limpar dados do TokenCafe
    localStorage.removeItem('tokencafe_wallet_address');
    localStorage.removeItem('tokencafe_network_id');
    localStorage.removeItem('tokencafe_connection_time');
    localStorage.removeItem('tokencafe_connected');
    
    // Limpar outros dados relacionados à sessão
    localStorage.removeItem('tokencafe_user_profile');
    localStorage.removeItem('tokencafe_dashboard_state');
    localStorage.removeItem('tokencafe_last_activity');
    
    console.log('✅ Todas as sessões foram limpas');
}

/**
 * Função para verificar se deve limpar sessões ou redirecionar
 */
async function checkConnectionAndRedirect() {
    try {
        // Verificar se MetaMask está instalado
        if (typeof window.ethereum === 'undefined') {
            // MetaMask não instalado - limpar sessões e mostrar página
            clearAllSessions();
            checkMetaMaskConnection();
            return;
        }
        
        // Verificar se há conta salva
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        
        if (!savedAccount) {
            // Não há conta salva - mostrar página normalmente
            checkMetaMaskConnection();
            return;
        }
        
        // Verificar se MetaMask ainda tem essa conta conectada
        // CORREÇÃO: Usar eth_accounts para verificação silenciosa (não requer ação do usuário)
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        // Se não há contas ou a conta salva não está nas contas conectadas
        if (accounts.length === 0 || !accounts.find(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
            console.log('❌ Conta não está mais conectada no MetaMask');
            // Limpar sessão e mostrar página
            clearAllSessions();
            checkMetaMaskConnection();
        } else {
            // Já conectado - redirecionar automaticamente para o dashboard
            console.log('✅ Usuário já conectado, redirecionando para o dashboard...');
            
            // Mostrar mensagem de redirecionamento
            const loadingBtn = document.getElementById('loading-connection-btn');
            if (loadingBtn) {
                loadingBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Redirecionando para o Dashboard...';
                loadingBtn.style.display = 'block';
            }
            
            // Redirecionar para o dashboard
            setTimeout(() => {
                window.location.href = 'modules/dashboard/index.html';
            }, 1500); // Aguardar 1.5 segundos para mostrar feedback visual
        }
        
    } catch (error) {
        console.error('Erro ao verificar conexão:', error);
        // Em caso de erro, limpar sessões e mostrar página
        clearAllSessions();
        checkMetaMaskConnection();
    }
}

/**
 * Verificar conexão MetaMask na página index
 */
async function checkMetaMaskConnection() {
    const connectBtn = document.getElementById('connect-metamask-btn');
    const dashboardBtn = document.getElementById('access-dashboard-btn');
    const loadingBtn = document.getElementById('loading-connection-btn');
    
    try {
        // Verificar se MetaMask está instalado
        if (typeof window.ethereum === 'undefined') {
            // MetaMask não instalado
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-download me-2"></i>Instalar MetaMask';
                connectBtn.onclick = () => window.open('https://metamask.io/download/', '_blank');
                connectBtn.style.display = 'block';
            }
            if (loadingBtn) loadingBtn.style.display = 'none';
            return;
        }
        
        // Verificar se já está conectado
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        
        if (!savedAccount) {
            // Não há conta salva - mostrar botão conectar
            if (connectBtn) connectBtn.style.display = 'block';
            if (loadingBtn) loadingBtn.style.display = 'none';
            return;
        }
        
        // Verificar se MetaMask ainda tem essa conta conectada
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        // Se não há contas ou a conta salva não está nas contas conectadas
        if (accounts.length === 0 || !accounts.find(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
            console.log('❌ Conta não está mais conectada no MetaMask');
            // Limpar sessão
            localStorage.removeItem('tokencafe_wallet_address');
            localStorage.removeItem('tokencafe_network_id');
            localStorage.removeItem('tokencafe_connection_time');
            localStorage.removeItem('tokencafe_connected');
            
            // Mostrar botão conectar
            if (connectBtn) connectBtn.style.display = 'block';
            if (loadingBtn) loadingBtn.style.display = 'none';
        } else {
            // Já conectado - redirecionar automaticamente para o dashboard
            console.log('✅ Usuário já conectado, redirecionando para o dashboard...');
            
            // Atualizar informações na UI se necessário
            updateConnectionStatus(savedAccount);
            
            // Redirecionar para o dashboard
            setTimeout(() => {
                window.location.href = 'modules/dashboard/index.html';
            }, 1000); // Aguardar 1 segundo para mostrar feedback visual
            
            // Mostrar mensagem de redirecionamento
            if (loadingBtn) {
                loadingBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Redirecionando para o Dashboard...';
                loadingBtn.style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error('Erro ao verificar conexão MetaMask:', error);
        // Em caso de erro, mostrar botão conectar
        if (connectBtn) connectBtn.style.display = 'block';
        if (loadingBtn) loadingBtn.style.display = 'none';
    }
}

/**
 * Função para atualizar status de conexão na página index
 */
function updateConnectionStatus(account) {
    // Salvar conta no localStorage se não estiver salva
    if (!localStorage.getItem('tokencafe_wallet_address')) {
        localStorage.setItem('tokencafe_wallet_address', account);
    }
    
    // Atualizar header se existir
    if (window.IndexPageFunctions && window.IndexPageFunctions.updateIndexConnectedUI) {
        window.IndexPageFunctions.updateIndexConnectedUI(account);
    }
}

/**
 * Configurar listeners para mudanças no MetaMask na página index
 */
function setupIndexMetaMaskListeners() {
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', function (accounts) {
            if (accounts.length === 0) {
                // Desconectado
                localStorage.removeItem('tokencafe_wallet_address');
                localStorage.removeItem('tokencafe_connected');
                // Usar debounce para evitar múltiplas atualizações
                debounceUpdateHeaderButton();
                console.log('👤 Conta desconectada, UI atualizada');
            } else {
                // Conta mudou
                updateConnectionStatus(accounts[0]);
                // Usar debounce para evitar múltiplas atualizações
                debounceUpdateHeaderButton();
                checkMetaMaskConnection();
            }
        });
        
        window.ethereum.on('chainChanged', function (chainId) {
            // Rede mudou - pode precisar recarregar
            console.log('Rede alterada para:', chainId);
            // Usar debounce para evitar múltiplas atualizações
            debounceUpdateHeaderButton();
        });
        
        // Listener para mudanças no localStorage (quando conecta/desconecta)
        window.addEventListener('storage', function(e) {
            if (e.key === 'tokencafe_connected') {
                // Usar debounce para evitar múltiplas atualizações
                debounceUpdateHeaderButton();
            }
        });
    }
}

// ...existing code ...

// ================================================================================
// INICIALIZAÇÃO E EXPOSIÇÃO GLOBAL
// ================================================================================

// Expor globalmente
window.WalletSystem = WalletSystem;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.connectWalletFromHeader = connectWalletFromHeader;
window.disconnectWalletFromHeader = disconnectWalletFromHeader;

// Expor funções específicas da página index
window.clearAllSessions = clearAllSessions;
window.checkConnectionAndRedirect = checkConnectionAndRedirect;
window.checkMetaMaskConnection = checkMetaMaskConnection;
window.updateConnectionStatus = updateConnectionStatus;
window.setupIndexMetaMaskListeners = setupIndexMetaMaskListeners;
window.updateHeaderButton = updateHeaderButton;
window.debounceUpdateHeaderButton = debounceUpdateHeaderButton;
window.startHeaderButtonUpdater = startHeaderButtonUpdater;

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

// ================================================================================
// VERIFICAÇÃO DE BOTÃO DE DESCONEXÃO NA PÁGINA INICIAL
// ================================================================================

/**
 * Verifica se o usuário está conectado e mostra/esconde o botão de desconexão
 * na página inicial
 */
function checkDisconnectButtonVisibility() {
    document.addEventListener('DOMContentLoaded', function() {
        const checkConnection = () => {
            const isConnected = localStorage.getItem('tokencafe_connected') === 'true';
            const disconnectBtn = document.getElementById('disconnect-btn-container');
            
            if (disconnectBtn) {
                disconnectBtn.style.display = isConnected ? 'block' : 'none';
            }
        };
        
        // Verificar apenas inicialmente
        checkConnection();
        
        // Removido setInterval - agora só verifica quando há mudanças reais
        // A verificação será feita através dos eventos do MetaMask
    });
}

// Função para atualizar o botão do header na página inicial
// Debounce para evitar múltiplas atualizações do header button
let headerButtonUpdateTimeout;
function debounceUpdateHeaderButton() {
    clearTimeout(headerButtonUpdateTimeout);
    headerButtonUpdateTimeout = setTimeout(() => {
        updateHeaderButton();
    }, 100); // Aguarda 100ms antes de atualizar
}

function updateHeaderButton() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const connectText = document.getElementById('connect-text');
    
    if (!connectBtn || !connectText) return;
    
    // Verificar se está conectado através do localStorage
    const isConnected = localStorage.getItem('tokencafe_connected') === 'true';
    
    if (isConnected) {
        // Se conectado, mostrar "Ir para Dashboard"
        connectText.textContent = 'Ir para Dashboard';
        connectBtn.onclick = () => {
            // DESABILITADO: Redirecionamento automático removido para evitar reload da página
            console.log('🚫 Redirecionamento para dashboard desabilitado');
            // window.location.href = 'pages/modules/dashboard/index.html';
        };
    } else {
        // Se não conectado, mostrar "Conectar ao MetaMask"
        connectText.textContent = 'Conectar ao MetaMask';
        connectBtn.onclick = connectWalletFromHeader;
    }
}

// Verificar e atualizar o botão apenas quando necessário
function startHeaderButtonUpdater() {
    updateHeaderButton();
    // Removido setInterval - agora só atualiza quando há mudanças reais
}

// Inicializar verificação do botão de desconexão
checkDisconnectButtonVisibility();

// Inicializar atualizador do botão do header
startHeaderButtonUpdater();

/**
 * Atualiza o estado dos botões de ferramentas com base no estado da conexão
 * Usado principalmente na página tools.html
 * @param {string} toolButtonSelector - Seletor CSS para os botões de ferramentas (padrão: '.tool-button')
 */
function updateToolButtonStates(toolButtonSelector = '.tool-button') {
    const isConnected = localStorage.getItem('tokencafe_connected') === 'true';
    const toolButtons = document.querySelectorAll(toolButtonSelector);
    
    if (!toolButtons || toolButtons.length === 0) return;
    
    toolButtons.forEach(button => {
        const requiresWallet = button.getAttribute('data-requires-wallet') === 'true';

        if (requiresWallet && !isConnected) {
            // Desabilitar botão
            button.classList.add('disabled');
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
            button.addEventListener('click', preventToolButtonClick);
        } else {
            // Habilitar botão
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            button.removeEventListener('click', preventToolButtonClick);
        }
    });
}

/**
 * Previne o clique em botões de ferramentas desabilitados
 * @param {Event} e - Evento de clique
 */
function preventToolButtonClick(e) {
    e.preventDefault();
    
    // Verificar se o sistema de carteira está disponível
    if (window.tokencafeWallet) {
        window.tokencafeWallet.showError('Conecte sua carteira MetaMask para acessar esta funcionalidade.');
    } else {
        console.error('Conecte sua carteira MetaMask para acessar esta funcionalidade.');
        alert('Conecte sua carteira MetaMask para acessar esta funcionalidade.');
    }
}

// Expor a função globalmente
window.updateToolButtonStates = updateToolButtonStates;