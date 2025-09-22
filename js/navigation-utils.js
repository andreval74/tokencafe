/**
 * ================================================================================
 * TOKENCAFE NAVIGATION UTILS - UTILITÁRIOS DE NAVEGAÇÃO
 * ================================================================================
 * Funções auxiliares para navegação no sistema TokenCafe
 * ================================================================================
 */

// Utilitários de navegação
const TokenCafeNavigation = {
    // Redirecionar para página principal
    goToHome() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('pages/')) {
            window.location.href = '../index.html';
        } else {
            window.location.href = 'index.html';
        }
    },

    // Redirecionar para dashboard
    goToDashboard() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('pages/')) {
            window.location.href = 'dash-main.html';
        } else {
            window.location.href = 'pages/dash-main.html';
        }
    },

    // Verificar se está na página correta baseado na conexão
    checkPageAccess() {
        const walletAddress = localStorage.getItem('tokencafe_wallet_address');
        const currentPage = window.location.pathname;
        
        // Se não está conectado e está tentando acessar dashboard
        if (!walletAddress && currentPage.includes('dash-main.html')) {
            console.log('⚠️ Redirecionando para página principal - wallet não conectada');
            this.goToHome();
            return false;
        }
        
        return true;
    },

    // Conectar wallet e redirecionar para dashboard
    async connectAndRedirect() {
        console.log('🔗 TokenCafeNavigation.connectAndRedirect() chamado');
        
        if (window.tokencafeWeb3) {
            console.log('✅ Web3ConnectionManager encontrado, conectando...');
            const success = await window.tokencafeWeb3.connect();
            if (success) {
                console.log('✅ Conexão bem-sucedida, redirecionando...');
                this.goToDashboard();
            } else {
                console.log('❌ Falha na conexão');
            }
        } else {
            console.error('❌ Web3ConnectionManager não encontrado!');
            alert('Sistema de conexão não inicializado. Recarregue a página.');
        }
    },

    // Desconectar e redirecionar para home
    disconnectAndRedirect() {
        console.log('🚪 TokenCafeNavigation.disconnectAndRedirect() chamado');
        
        localStorage.removeItem('tokencafe_wallet_address');
        localStorage.removeItem('tokencafe_network_id');
        localStorage.removeItem('tokencafe_dashboard_data');
        localStorage.removeItem('tokencafe_connected');
        
        if (window.tokencafeWeb3) {
            window.tokencafeWeb3.disconnect();
        }
        
        this.goToHome();
    }
};

// Disponibilizar globalmente
window.TokenCafeNavigation = TokenCafeNavigation;

// Debug: Log quando o script carregar
console.log('✅ Navigation Utils carregado com sucesso');