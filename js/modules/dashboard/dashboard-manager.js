/**
 * ================================================================================
 * DASHBOARD MANAGER - MÓDULO DASHBOARD
 * ================================================================================
 * Gerenciador principal do módulo dashboard
 * Integração com sistema modular TokenCafe
 * ================================================================================
 */

class DashboardManager {
    constructor() {
        this.currentPage = 'home';
        this.sidebarExpanded = true;
        this.navigationHistory = [];
        this.pageCache = new Map();
        this.loadingState = false;
        
        // Configurações do dashboard
        this.config = {
            sidebarWidth: 280,
            sidebarCollapsedWidth: 60,
            animationSpeed: 300,
            cacheTimeout: 5 * 60 * 1000 // 5 minutos
        };
        
        // Páginas disponíveis
        this.pages = {
            'home': { title: '🏠 Dashboard', component: 'dashboard-home', requiresAuth: true },
            'tokens': { title: '🪙 Meus Tokens', component: 'token-manager', requiresAuth: true },
            'token-create': { title: '➕ Criar Token', component: 'token-create', requiresAuth: true },
            'widgets': { title: '🧩 Meus Widgets', component: 'widget-manager', requiresAuth: true },
            'widget-create': { title: '➕ Criar Widget', component: 'widget-create', requiresAuth: true },
            'analytics': { title: '📊 Analytics', component: 'analytics-reports', requiresAuth: true },
            'templates': { title: '📄 Templates', component: 'template-gallery', requiresAuth: true },
            'profile': { title: '👤 Perfil', component: 'user-profile', requiresAuth: true },
            'settings': { title: '⚙️ Configurações', component: 'user-settings', requiresAuth: true },
            'support': { title: '💬 Suporte', component: 'support-form', requiresAuth: false }
        };
        
        this.init();
    }

    /**
     * Inicialização do dashboard
     */
    async init() {
        console.log('📱 Inicializando DashboardManager...');
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        // Configurar estrutura básica
        this.setupLayout();
        
        // Configurar navegação
        this.setupNavigation();
        
        // Configurar sidebar
        this.setupSidebar();
        
        // Configurar atalhos de teclado
        this.setupKeyboardShortcuts();
        
        // Carregar página inicial
        await this.loadInitialPage();
        
        // Mostrar dashboard após carregamento
        this.showDashboard();
        
        console.log('✅ DashboardManager inicializado com sucesso');
    }

    /**
     * Configurar layout básico
     */
    setupLayout() {
        // Adicionar classes necessárias ao body
        document.body.classList.add('dashboard-page');
        
        // Configurar container principal
        const container = document.getElementById('dashboard-container');
        if (container) {
            container.style.display = 'none'; // Inicialmente oculto
        }
    }

    /**
     * Mostrar dashboard (ocultar loading)
     */
    showDashboard() {
        const loadingScreen = document.getElementById('loading-screen');
        const dashboardContainer = document.getElementById('dashboard-container');
        
        console.log('👁️ Elementos encontrados:', {
            loadingScreen: !!loadingScreen,
            dashboardContainer: !!dashboardContainer
        });
        
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
            console.log('✅ Loading screen ocultado');
        }
        
        if (dashboardContainer) {
            dashboardContainer.style.display = 'flex';
            dashboardContainer.style.visibility = 'visible';
            console.log('✅ Dashboard container exibido');
        }
        
        // Adicionar classe ao body para styling
        document.body.classList.add('dashboard-active');
        
        console.log('✅ Dashboard exibido');
    }

    /**
     * Configurar navegação
     */
    setupNavigation() {
        // Event delegation para navegação
        document.addEventListener('click', (e) => {
            const menuItem = e.target.closest('.menu-item');
            if (menuItem && menuItem.dataset.page) {
                e.preventDefault();
                this.navigateTo(menuItem.dataset.page);
            }
        });
    }

    /**
     * Configurar sidebar
     */
    setupSidebar() {
        // Toggle sidebar
        const toggleBtn = document.querySelector('.sidebar-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleSidebar());
        }
    }

    /**
     * Configurar atalhos de teclado
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + B para toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                e.preventDefault();
                this.toggleSidebar();
            }
        });
    }

    /**
     * Carregar página inicial
     */
    async loadInitialPage() {
        const urlParams = new URLSearchParams(window.location.search);
        const page = urlParams.get('page') || 'home';
        await this.navigateTo(page);
    }

    /**
     * Navegar para página
     */
    async navigateTo(pageId) {
        if (this.loadingState) return;
        
        console.log(`🧭 Navegando para: ${pageId}`);
        
        this.loadingState = true;
        
        try {
            // Atualizar estado
            this.currentPage = pageId;
            this.navigationHistory.push(pageId);
            
            // Atualizar menu ativo
            this.updateActiveMenu(pageId);
            
            // Carregar conteúdo da página
            await this.loadPageContent(pageId);
            
            // Atualizar título
            this.updatePageTitle(pageId);
            
            // Atualizar URL
            this.updateURL(pageId);
            
        } catch (error) {
            console.error('❌ Erro ao navegar:', error);
            this.showError('Erro ao carregar página');
        } finally {
            this.loadingState = false;
        }
    }

    /**
     * Atualizar menu ativo
     */
    updateActiveMenu(pageId) {
        // Remover classe active de todos os itens
        document.querySelectorAll('.menu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Adicionar classe active ao item atual
        const activeItem = document.querySelector(`[data-page="${pageId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    /**
     * Carregar conteúdo da página
     */
    async loadPageContent(pageId) {
        const mainContent = document.getElementById('dynamic-content');
        if (!mainContent) {
            throw new Error('Container de conteúdo não encontrado');
        }
        
        // Verificar cache
        const cacheKey = `page_${pageId}`;
        const cached = this.pageCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < this.config.cacheTimeout) {
            mainContent.innerHTML = cached.content;
            this.executePageScripts(pageId);
            return;
        }
        
        // Carregar conteúdo
        let content = '';
        
        switch (pageId) {
            case 'home':
                content = await this.getHomeContent();
                break;
            case 'tokens':
                content = await this.loadModulePage('tokens', 'token-manager');
                break;
            case 'widgets':
                content = await this.loadModulePage('widgets', 'widget-manager');
                break;
            case 'analytics':
                content = await this.loadModulePage('analytics', 'analytics-reports');
                break;
            case 'templates':
                content = await this.loadModulePage('templates', 'template-gallery');
                break;
            case 'profile':
                content = await this.loadModulePage('profile', 'user-profile');
                break;
            case 'settings':
                content = await this.loadModulePage('settings', 'system-settings');
                break;
            case 'support':
                content = await this.getSupportContent();
                break;
            default:
                content = await this.getDefaultContent(pageId);
        }
        
        // Renderizar conteúdo
        mainContent.innerHTML = content;
        
        // Armazenar no cache
        this.pageCache.set(cacheKey, {
            content: content,
            timestamp: Date.now()
        });
        
        // Executar scripts específicos da página
        this.executePageScripts(pageId);
    }

    /**
     * Obter conteúdo da home
     */
    async getHomeContent() {
        return `
            <div class="container-fluid">
                <div class="row g-4">
                    <!-- Stats Cards -->
                    <div class="col-lg-3 col-md-6">
                        <div class="card stat-card">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-primary text-white me-3">
                                        <i class="fas fa-coins"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-tokens">0</h3>
                                        <small class="text-muted">Meus Tokens</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card stat-card">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-coffee text-white me-3">
                                        <i class="fas fa-cube"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-widgets">0</h3>
                                        <small class="text-muted">Meus Widgets</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card stat-card">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-success text-white me-3">
                                        <i class="fas fa-chart-line"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-views">0</h3>
                                        <small class="text-muted">Visualizações</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card stat-card">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="stat-icon bg-warning text-white me-3">
                                        <i class="fas fa-dollar-sign"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-earnings">$0</h3>
                                        <small class="text-muted">Ganhos</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Ações Rápidas</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="quick-action-card" data-navigate="tokens">
                                            <i class="fas fa-plus fa-2x text-primary mb-2"></i>
                                            <h6>Criar Token</h6>
                                            <p class="text-muted small">Criar um novo token personalizado</p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="quick-action-card" data-navigate="widgets">
                                            <i class="fas fa-cube fa-2x text-coffee mb-2"></i>
                                            <h6>Criar Widget</h6>
                                            <p class="text-muted small">Desenvolver um novo widget interativo</p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="quick-action-card" data-navigate="templates">
                                            <i class="fas fa-th-large fa-2x text-info mb-2"></i>
                                            <h6>Explorar Templates</h6>
                                            <p class="text-muted small">Descobrir templates prontos para usar</p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="quick-action-card" data-navigate="analytics">
                                            <i class="fas fa-chart-bar fa-2x text-success mb-2"></i>
                                            <h6>Ver Analytics</h6>
                                            <p class="text-muted small">Analisar performance dos seus widgets</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Carregar página de módulo
     */
    async loadModulePage(moduleName, componentName) {
        try {
            // Tentar carregar o módulo específico
            const moduleScript = `../js/modules/${moduleName}/${componentName}.js`;
            await this.loadScript(moduleScript);
            
            return `
                <div class="container-fluid">
                    <div class="text-center py-5">
                        <h3>Módulo ${moduleName}</h3>
                        <p class="text-muted">Carregando ${componentName}...</p>
                        <div id="${moduleName}-container"></div>
                    </div>
                </div>
            `;
        } catch (error) {
            console.warn(`Módulo ${moduleName} não encontrado, usando conteúdo padrão`);
            return this.getDefaultContent(moduleName);
        }
    }

    /**
     * Carregar script dinamicamente
     */
    async loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Obter conteúdo padrão
     */
    getDefaultContent(pageId) {
        const pageInfo = this.pages[pageId] || { title: 'Página', component: 'unknown' };
        
        return `
            <div class="container-fluid">
                <div class="text-center py-5">
                    <i class="fas fa-cog fa-3x text-muted mb-3"></i>
                    <h3>${pageInfo.title}</h3>
                    <p class="text-muted">Esta seção está em desenvolvimento.</p>
                    <button class="btn btn-primary" onclick="window.dashboardManager.navigateTo('home')">
                        Voltar ao Dashboard
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Obter conteúdo de suporte
     */
    getSupportContent() {
        return `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-lg-8 mx-auto">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">💬 Central de Suporte</h5>
                            </div>
                            <div class="card-body">
                                <p>Entre em contato conosco para obter ajuda:</p>
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="support-option">
                                            <i class="fas fa-envelope fa-2x text-primary mb-2"></i>
                                            <h6>Email</h6>
                                            <p class="text-muted small">suporte@tokencafe.com</p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="support-option">
                                            <i class="fab fa-discord fa-2x text-info mb-2"></i>
                                            <h6>Discord</h6>
                                            <p class="text-muted small">Comunidade TokenCafe</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Executar scripts específicos da página
     */
    executePageScripts(pageId) {
        // Executar scripts específicos baseados na página
        switch (pageId) {
            case 'home':
                this.loadHomeStats();
                break;
            case 'tokens':
                this.loadTokensScript();
                break;
            case 'widgets':
                this.loadWidgetsScript();
                break;
            case 'analytics':
                this.loadAnalyticsScript();
                break;
        }
    }

    /**
     * Carregar estatísticas da home
     */
    loadHomeStats() {
        // Simular carregamento de estatísticas
        setTimeout(() => {
            const stats = {
                tokens: Math.floor(Math.random() * 10) + 1,
                widgets: Math.floor(Math.random() * 5) + 1,
                views: Math.floor(Math.random() * 1000) + 100,
                earnings: (Math.random() * 100).toFixed(2)
            };
            
            const elements = {
                'total-tokens': stats.tokens,
                'total-widgets': stats.widgets,
                'total-views': stats.views,
                'total-earnings': `$${stats.earnings}`
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = value;
                }
            });
        }, 1000);
    }

    /**
     * Atualizar título da página
     */
    updatePageTitle(pageId) {
        const pageInfo = this.pages[pageId];
        if (pageInfo) {
            const titleElement = document.getElementById('page-title');
            if (titleElement) {
                titleElement.textContent = pageInfo.title;
            }
            document.title = `${pageInfo.title} - TokenCafe Dashboard`;
        }
    }

    /**
     * Atualizar URL
     */
    updateURL(pageId) {
        const url = new URL(window.location);
        url.searchParams.set('page', pageId);
        window.history.pushState({ page: pageId }, '', url);
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.sidebarExpanded = !this.sidebarExpanded;
        const sidebar = document.getElementById('dashboard-sidebar');
        
        if (sidebar) {
            sidebar.classList.toggle('collapsed', !this.sidebarExpanded);
        }
    }

    /**
     * Mostrar erro
     */
    showError(message) {
        console.error('❌ Dashboard Error:', message);
        // Implementar toast ou modal de erro
    }

    /**
     * Obter estatísticas do dashboard
     */
    getStats() {
        return {
            currentPage: this.currentPage,
            sidebarExpanded: this.sidebarExpanded,
            cachedPages: this.pageCache.size,
            navigationHistory: this.navigationHistory.length,
            loadingState: this.loadingState
        };
    }
}

// Exportar para uso global
window.DashboardManager = DashboardManager;

// Auto-inicializar se estivermos na página do dashboard
if (window.location.pathname.includes('dash-main') || window.location.pathname.includes('dashboard')) {
    window.dashboardManager = new DashboardManager();
}