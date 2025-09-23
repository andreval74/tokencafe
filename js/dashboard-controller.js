/**
 * ================================================================================
 * DASHBOARD CONTROLLER - CONTROLADOR PRINCIPAL DO DASHBOARD
 * ================================================================================
 * Verifica conexão da carteira e carrega componentes
 * ================================================================================
 */

class DashboardController {
    constructor() {
        this.web3Manager = null;
        this.isConnected = false;
        this.walletAddress = null;
        this.networkId = null;
        this.init();
    }

    async init() {
        console.log('🎯 Inicializando Dashboard Controller...');
        
        // Criar instância do Web3ConnectionManager
        this.web3Manager = new Web3ConnectionManager();
        
        // Aguardar inicialização e verificação de conexão
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar se está conectado usando o manager
        this.isConnected = this.web3Manager.isConnected;
        this.walletAddress = this.web3Manager.currentAccount;
        this.networkId = this.web3Manager.networkId;
        
        if (this.isConnected) {
            console.log('✅ Usuário conectado:', this.walletAddress);
            // Carregar componentes do dashboard
            await this.loadDashboardComponents();
            
            // Esconder loading e mostrar dashboard
            this.showDashboard();
        } else {
            console.log('❌ Usuário não conectado');
            // Redirecionar para página de login
            this.redirectToLogin();
        }
        
        console.log('✅ Dashboard Controller inicializado');
    }

    async loadDashboardComponents() {
        console.log('📦 Carregando componentes do dashboard...');

        try {
            // Carregar sidebar
            const sidebarHtml = await this.loadComponent('dashboard-sidebar.html');
            document.getElementById('sidebar-container').innerHTML = sidebarHtml;

            // Carregar main content
            const mainContentHtml = await this.loadComponent('dashboard-main-content.html');
            document.getElementById('main-content-container').innerHTML = mainContentHtml;

            // Disparar evento de carteira conectada para os componentes
            window.dispatchEvent(new CustomEvent('walletConnected', {
                detail: {
                    address: this.walletAddress,
                    networkId: this.networkId
                }
            }));

            // Inicializar managers dos componentes após carregamento
            if (window.initSidebarManager) {
                window.initSidebarManager();
            }

        } catch (error) {
            console.error('❌ Erro ao carregar componentes:', error);
            this.showError('Erro ao carregar dashboard. Recarregue a página.');
        }
    }

    async loadComponent(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erro ao carregar ${url}: ${response.status}`);
        }
        return await response.text();
    }

    showDashboard() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('dashboard-container').style.display = 'flex';
    }

    redirectToLogin() {
        console.log('🔄 Redirecionando para página de login...');
        setTimeout(() => {
            TokenCafeNavigation.goToHome();
        }, 2000);

        // Mostrar mensagem de erro na tela de loading
        const loadingContent = document.querySelector('.loading-content p');
        loadingContent.innerHTML = `
            <i class="fas fa-exclamation-triangle text-warning"></i><br>
            Carteira não conectada!<br>
            <small class="text-muted">Redirecionando para página inicial...</small>
        `;
    }

    showError(message) {
        const loadingContent = document.querySelector('.loading-content');
        loadingContent.innerHTML = `
            <i class="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
            <p class="text-danger">${message}</p>
            <button class="btn btn-primary btn-sm" onclick="location.reload()">
                <i class="fas fa-redo me-1"></i>Tentar Novamente
            </button>
        `;
    }
}

/**
 * Inicializar Dashboard quando DOM estiver pronto
 */
function initDashboard() {
    window.dashboardController = new DashboardController();
}

// Expor apenas a função de inicialização
window.DashboardController = DashboardController;

// Inicializar automaticamente quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', initDashboard);

console.log('✅ Dashboard Controller JS carregado');
