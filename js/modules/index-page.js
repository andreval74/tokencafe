/**
 * TokenCafe - Módulo da Página Index
 * Gerencia a verificação inicial de conexão MetaMask na página principal
 */

class IndexPageManager {
    constructor() {
        this.initialized = false;
    }

    /**
     * Inicializar o gerenciador da página index
     */
    init() {
        if (this.initialized) return;
        
        console.log('🏠 Inicializando página index...');
        
        // Fazer apenas uma verificação inicial
        this.performSingleConnectionCheck();
        
        this.initialized = true;
    }

    /**
     * Realizar uma única verificação de conexão (sem loops ou eventos contínuos)
     */
    async performSingleConnectionCheck() {
        try {
            console.log('🔍 Verificação única de conexão...');
            
            // Verificar se MetaMask está instalado
            if (typeof window.ethereum === 'undefined') {
                console.log('❌ MetaMask não instalado');
                this.showInstallMetaMaskButton();
                return;
            }
            
            // Verificar se há conta salva
            const savedAccount = localStorage.getItem('tokencafe_wallet_address');
            
            if (!savedAccount) {
                console.log('ℹ️ Nenhuma conta salva encontrada');
                this.showConnectButton();
                return;
            }
            
            console.log('📱 Verificando sessão salva:', savedAccount);
            
            // Verificar se MetaMask ainda tem essa conta conectada
            // CORREÇÃO: Usar eth_accounts para verificação silenciosa (não requer ação do usuário)
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            // Se não há contas ou a conta salva não está nas contas conectadas
            if (accounts.length === 0 || !accounts.find(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
                console.log('❌ Conta não está mais conectada no MetaMask');
                this.clearSession();
                this.showConnectButton();
            } else {
                console.log('✅ Sessão válida encontrada, redirecionando...');
                this.redirectToDashboard();
            }
            
        } catch (error) {
            console.error('❌ Erro na verificação:', error);
            this.clearSession();
            this.showConnectButton();
        }
    }

    /**
     * Mostrar botão para instalar MetaMask
     */
    showInstallMetaMaskButton() {
        const connectBtn = document.getElementById('connect-metamask-btn');
        const loadingBtn = document.getElementById('loading-connection-btn');
        
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fas fa-download me-2"></i>Instalar MetaMask';
            connectBtn.onclick = () => window.open('https://metamask.io/download/', '_blank');
            connectBtn.style.display = 'block';
        }
        if (loadingBtn) loadingBtn.style.display = 'none';
    }

    /**
     * Mostrar botão para conectar MetaMask
     */
    showConnectButton() {
        const connectBtn = document.getElementById('connect-metamask-btn');
        const loadingBtn = document.getElementById('loading-connection-btn');
        
        if (connectBtn) {
            connectBtn.innerHTML = '<i class="fab fa-ethereum me-2"></i>Conectar MetaMask';
            connectBtn.onclick = () => this.connectWallet();
            connectBtn.style.display = 'block';
        }
        if (loadingBtn) loadingBtn.style.display = 'none';
    }

    /**
     * Redirecionar para o dashboard
     */
    redirectToDashboard() {
        const loadingBtn = document.getElementById('loading-connection-btn');
        
        if (loadingBtn) {
            loadingBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Redirecionando para o Dashboard...';
            loadingBtn.style.display = 'block';
        }
        
        // COMENTADO: Redirecionamento automático removido para evitar reload da página
        // setTimeout(() => {
        //     window.location.href = 'modules/dashboard/index.html';
        // }, 1500);
        
        console.log('✅ Sessão válida detectada - redirecionamento automático desabilitado');
    }

    /**
     * Limpar sessão
     */
    clearSession() {
        localStorage.removeItem('tokencafe_wallet_address');
        localStorage.removeItem('tokencafe_network_id');
        localStorage.removeItem('tokencafe_connection_time');
        localStorage.removeItem('tokencafe_connected');
    }

    /**
     * Conectar carteira usando o sistema global
     */
    async connectWallet() {
        try {
            console.log('🔗 Iniciando conexão via IndexPageManager...');
            
            // Usar a função global connectWallet do sistema
            if (typeof window.connectWallet === 'function') {
                await window.connectWallet();
            } else {
                console.error('❌ Função connectWallet não encontrada');
                this.showError('Sistema de carteira não carregado');
            }
            
        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            this.showError(`Erro na conexão: ${error.message}`);
        }
    }

    /**
     * Mostrar mensagem de erro
     */
    showError(message) {
        console.error('❌', message);
        // Aqui poderia adicionar notificação visual se necessário
    }
}

// Expor globalmente
window.IndexPageManager = IndexPageManager;

// Auto-inicializar quando o TokenCafe estiver pronto
if (typeof onTokenCafeReady === 'function') {
    onTokenCafeReady(() => {
        const indexManager = new IndexPageManager();
        indexManager.init();
    });
} else {
    // Fallback se onTokenCafeReady não estiver disponível
    document.addEventListener('DOMContentLoaded', () => {
        // DESABILITADO: setTimeout removido para evitar múltiplas inicializações
        console.log('🚫 Inicialização com delay desabilitada');
        
        // setTimeout(() => {
        //     const indexManager = new IndexPageManager();
        //     indexManager.init();
        // }, 1000);
        
        // Inicialização imediata
        const indexManager = new IndexPageManager();
        indexManager.init();
    });
}