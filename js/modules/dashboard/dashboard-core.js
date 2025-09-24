/**
 * ================================================================================
 * DASHBOARD CORE - TOKENCAFE
 * ================================================================================
 * Sistema centralizado para gerenciamento do dashboard
 * Consolidação de todas as funções relacionadas ao dashboard
 * ================================================================================
 */

class DashboardCore {
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
        console.log('📱 Inicializando DashboardCore...');
        
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
        
        console.log('✅ DashboardCore inicializado com sucesso');
    }

    /**
     * Carregar página inicial
     */
    async loadInitialPage() {
        console.log('🏠 Carregando página inicial do dashboard...');
        
        try {
            // Verificar autenticação
            if (!this.isAuthenticated()) {
                console.log('⚠️ Usuário não autenticado, redirecionando...');
                this.redirectToLogin();
                return;
            }
            
            // Carregar página home por padrão
            await this.navigateTo('home', false);
            
        } catch (error) {
            console.error('❌ Erro ao carregar página inicial:', error);
            this.showError('Erro ao carregar dashboard');
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
     * Redirecionar para login
     */
    redirectToLogin() {
        console.log('🔄 Redirecionando para página de login...');
        
        const loadingContent = document.querySelector('.loading-content p');
        if (loadingContent) {
            loadingContent.innerHTML = `
                <i class="fas fa-exclamation-triangle text-warning"></i><br>
                Carteira não conectada!<br>
                <small class="text-muted">Redirecionando para página inicial...</small>
            `;
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    /**
     * Configurar layout básico
     */
    setupLayout() {
        // Verificar se elementos básicos existem
        const requiredElements = ['dashboard-sidebar', 'main-content', 'dashboard-header'];
        const missing = requiredElements.filter(id => !document.getElementById(id));
        
        if (missing.length > 0) {
            console.warn('⚠️ Elementos de layout ausentes:', missing);
            
            // Aguardar carregamento dos templates antes de verificar novamente
            setTimeout(() => {
                const stillMissing = requiredElements.filter(id => !document.getElementById(id));
                if (stillMissing.length === 0) {
                    console.log('✅ Todos os elementos de layout foram carregados com sucesso');
                }
            }, 1000);
        }
        
        // Configurar classes CSS
        document.body.classList.add('dashboard-layout');
        
        // Aplicar configurações de layout
        this.applyLayoutStyles();
    }

    /**
     * Aplicar estilos de layout
     */
    applyLayoutStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .dashboard-layout {
                overflow-x: hidden;
            }
            
            .sidebar-expanded #dashboard-sidebar {
                width: ${this.config.sidebarWidth}px;
                transform: translateX(0);
            }
            
            .sidebar-collapsed #dashboard-sidebar {
                width: ${this.config.sidebarCollapsedWidth}px;
            }
            
            .sidebar-expanded #main-content {
                margin-left: ${this.config.sidebarWidth}px;
            }
            
            .sidebar-collapsed #main-content {
                margin-left: ${this.config.sidebarCollapsedWidth}px;
            }
            
            .dashboard-transition {
                transition: all ${this.config.animationSpeed}ms ease-in-out;
            }
            
            .page-loading {
                opacity: 0.6;
                pointer-events: none;
            }
        `;
        document.head.appendChild(style);
        
        // Aplicar classe inicial
        document.body.classList.add(this.sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed');
    }

    /**
     * Configurar navegação
     */
    setupNavigation() {
        // Menu items do sidebar
        document.addEventListener('click', (e) => {
            const menuItem = e.target.closest('[data-page]');
            if (menuItem) {
                e.preventDefault();
                const pageId = menuItem.dataset.page;
                this.navigateTo(pageId);
            }
        });
        
        // Botões de navegação
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-navigate]')) {
                e.preventDefault();
                const pageId = e.target.dataset.navigate;
                this.navigateTo(pageId);
            }
        });
        
        // Histórico do navegador
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.navigateTo(e.state.page, false);
            }
        });
    }

    /**
     * Configurar sidebar
     */
    setupSidebar() {
        // Toggle do sidebar
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }
        
        // Menus expansíveis
        document.querySelectorAll('.menu-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                const section = e.target.dataset.section;
                if (section) {
                    this.toggleMenuSection(section);
                }
            });
        });
        
        // Auto-collapse em telas pequenas
        this.handleResponsiveSidebar();
        window.addEventListener('resize', () => this.handleResponsiveSidebar());
    }

    /**
     * Gerenciar sidebar responsiva
     */
    handleResponsiveSidebar() {
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            this.sidebarExpanded = false;
            document.body.classList.remove('sidebar-expanded');
            document.body.classList.add('sidebar-collapsed');
        } else {
            this.sidebarExpanded = true;
            document.body.classList.add('sidebar-expanded');
            document.body.classList.remove('sidebar-collapsed');
        }
    }

    /**
     * Configurar atalhos de teclado
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + teclas
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b': // Toggle sidebar
                        e.preventDefault();
                        this.toggleSidebar();
                        break;
                    case 'h': // Home
                        e.preventDefault();
                        this.navigateTo('home');
                        break;
                    case 'n': // Novo widget
                        e.preventDefault();
                        this.navigateTo('widget-create');
                        break;
                }
            }
            
            // ESC para fechar modais/overlays
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    }

    /**
     * Navegar para página
     */
    async navigateTo(pageId, updateHistory = true) {
        if (pageId === this.currentPage) {
            return; // Já está na página
        }
        
        const pageConfig = this.pages[pageId];
        if (!pageConfig) {
            console.error('❌ Página não encontrada:', pageId);
            return;
        }
        
        console.log('🧭 Navegando para:', pageId);
        
        try {
            // Verificar autenticação se necessário
            if (pageConfig.requiresAuth && !this.isAuthenticated()) {
                this.showAuthRequired();
                return;
            }
            
            // Mostrar loading
            this.setLoadingState(true);
            
            // Atualizar UI
            this.updateActiveMenuItem(pageId);
            this.updatePageTitle(pageConfig.title);
            
            // Carregar conteúdo da página
            await this.loadPageContent(pageId, pageConfig);
            
            // Atualizar histórico
            if (updateHistory) {
                this.updateNavigationHistory(pageId);
            }
            
            // Atualizar estado atual
            this.currentPage = pageId;
            
            console.log('✅ Navegação concluída:', pageId);
            
        } catch (error) {
            console.error('❌ Erro na navegação:', error);
            this.showError('Erro ao carregar página');
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Carregar conteúdo da página
     */
    async loadPageContent(pageId, pageConfig) {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) {
            throw new Error('Container de conteúdo não encontrado');
        }
        
        // Verificar cache primeiro
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
            case 'token-create':
                content = await this.getTokenCreateContent();
                break;
            case 'widgets':
                content = await this.getWidgetsContent();
                break;
            case 'widget-create':
                content = await this.getWidgetCreateContent();
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
                <!-- Welcome Section -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="welcome-banner bg-gradient-coffee text-white p-4 rounded">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <h2 class="mb-2">Bem-vindo ao TokenCafe! ☕</h2>
                                    <p class="mb-0">Sua plataforma completa para criar widgets Web3 personalizados</p>
                                </div>
                                <div class="col-md-4 text-end">
                                    <button class="btn btn-light btn-lg" data-navigate="widget-create">
                                        <i class="fas fa-plus me-2"></i>Criar Widget
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Stats Cards -->
                <div class="row g-3 mb-4">
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
                                    <div class="stat-icon bg-info text-white me-3">
                                        <i class="fas fa-mouse-pointer"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-interactions">0</h3>
                                        <small class="text-muted">Interações</small>
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
                                        <small class="text-muted">Earnings</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="row g-3">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="fas fa-rocket me-2"></i>Ações Rápidas</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="quick-action-card" data-navigate="widget-create">
                                            <i class="fas fa-plus-circle fa-2x text-coffee mb-2"></i>
                                            <h6>Criar Widget</h6>
                                            <p class="text-muted small">Criar novo widget Web3 personalizado</p>
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
                                    <div class="col-md-6">
                                        <div class="quick-action-card" data-navigate="support">
                                            <i class="fas fa-life-ring fa-2x text-warning mb-2"></i>
                                            <h6>Suporte</h6>
                                            <p class="text-muted small">Obter ajuda e suporte técnico</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="fas fa-bell me-2"></i>Notificações</h5>
                            </div>
                            <div class="card-body" id="notifications-list">
                                <div class="text-center text-muted py-3">
                                    <i class="fas fa-bell-slash fa-2x mb-2"></i>
                                    <p class="mb-0">Nenhuma notificação no momento</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Obter conteúdo de widgets
     */
    async getWidgetsContent() {
        return `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2><i class="fas fa-cube me-2"></i>Meus Widgets</h2>
                    <button class="btn btn-coffee" data-navigate="widget-create">
                        <i class="fas fa-plus me-2"></i>Criar Widget
                    </button>
                </div>
                
                <!-- Filtros -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-3">
                                <input type="search" class="form-control" placeholder="Buscar widgets..." id="widget-search">
                            </div>
                            <div class="col-md-2">
                                <select class="form-control" id="widget-type-filter">
                                    <option value="">Todos os tipos</option>
                                    <option value="swap">Swap</option>
                                    <option value="price">Price Tracker</option>
                                    <option value="portfolio">Portfolio</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <select class="form-control" id="widget-status-filter">
                                    <option value="">Todos os status</option>
                                    <option value="active">Ativo</option>
                                    <option value="draft">Rascunho</option>
                                    <option value="archived">Arquivado</option>
                                </select>
                            </div>
                            <div class="col-md-3 ms-auto">
                                <div class="btn-group" role="group">
                                    <input type="radio" class="btn-check" name="view-mode" id="grid-view" checked>
                                    <label class="btn btn-outline-coffee" for="grid-view">
                                        <i class="fas fa-th"></i>
                                    </label>
                                    <input type="radio" class="btn-check" name="view-mode" id="list-view">
                                    <label class="btn btn-outline-coffee" for="list-view">
                                        <i class="fas fa-list"></i>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Lista de Widgets -->
                <div id="widgets-container">
                    <div class="text-center py-5">
                        <i class="fas fa-cube fa-3x text-muted mb-3"></i>
                        <h4>Nenhum widget criado ainda</h4>
                        <p class="text-muted">Comece criando seu primeiro widget Web3!</p>
                        <button class="btn btn-coffee" data-navigate="widget-create">
                            <i class="fas fa-plus me-2"></i>Criar Primeiro Widget
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Obter conteúdo de suporte
     */
    async getSupportContent() {
        try {
            // Carregar HTML do arquivo suporte.html
            const response = await fetch('../pages/suporte.html');
            if (!response.ok) throw new Error('Arquivo não encontrado');
            return await response.text();
        } catch (error) {
            console.error('❌ Erro ao carregar suporte:', error);
            return this.getDefaultSupportContent();
        }
    }

    /**
     * Obter conteúdo padrão de suporte
     */
    getDefaultSupportContent() {
        return `
            <div class="container-fluid">
                <div class="row justify-content-center">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header">
                                <h3><i class="fas fa-life-ring me-2"></i>Suporte</h3>
                            </div>
                            <div class="card-body">
                                <form id="support-form">
                                    <div class="row">
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Nome</label>
                                            <input type="text" class="form-control" required>
                                        </div>
                                        <div class="col-md-6 mb-3">
                                            <label class="form-label">Email</label>
                                            <input type="email" class="form-control" required>
                                        </div>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Assunto</label>
                                        <select class="form-control" required>
                                            <option value="">Selecione um assunto</option>
                                            <option value="bug">Reportar Bug</option>
                                            <option value="feature">Solicitação de Feature</option>
                                            <option value="help">Ajuda Técnica</option>
                                            <option value="other">Outro</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Mensagem</label>
                                        <textarea class="form-control" rows="5" required></textarea>
                                    </div>
                                    <button type="submit" class="btn btn-coffee">
                                        <i class="fas fa-paper-plane me-2"></i>Enviar Mensagem
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Toggle sidebar
     */
    toggleSidebar() {
        this.sidebarExpanded = !this.sidebarExpanded;
        
        document.body.classList.toggle('sidebar-expanded', this.sidebarExpanded);
        document.body.classList.toggle('sidebar-collapsed', !this.sidebarExpanded);
        
        // Salvar preferência
        localStorage.setItem('tokencafe_sidebar_expanded', this.sidebarExpanded);
    }

    /**
     * Toggle menu section
     */
    toggleMenuSection(section) {
        const menuSection = document.getElementById(`${section}-submenu`);
        const toggle = document.querySelector(`[data-section="${section}"] .toggle-icon`);
        
        if (menuSection && toggle) {
            const isExpanded = menuSection.style.display !== 'none';
            menuSection.style.display = isExpanded ? 'none' : 'block';
            toggle.classList.toggle('fa-chevron-down', !isExpanded);
            toggle.classList.toggle('fa-chevron-up', isExpanded);
        }
    }

    /**
     * Atualizar item de menu ativo
     */
    updateActiveMenuItem(pageId) {
        // Remover classes ativas
        document.querySelectorAll('.menu-item, .submenu-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Adicionar classe ativa
        const activeItem = document.querySelector(`[data-page="${pageId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    /**
     * Atualizar título da página
     */
    updatePageTitle(title) {
        document.title = `${title} - TokenCafe`;
        
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = title;
        }
    }

    /**
     * Estado de loading
     */
    setLoadingState(loading) {
        this.loadingState = loading;
        
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.classList.toggle('page-loading', loading);
        }
        
        // Loading indicator
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) {
            loadingIndicator.style.display = loading ? 'block' : 'none';
        }
    }

    /**
     * Verificar autenticação
     */
    isAuthenticated() {
        // Verificar múltiplas formas de autenticação
        const walletConnected = window.tokencafeWallet?.isConnected;
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        
        console.log('🔍 Verificando autenticação:', {
            walletConnected,
            savedAccount: savedAccount ? 'Presente' : 'Ausente',
            tokencafeWallet: !!window.tokencafeWallet
        });
        
        // Retorna true se wallet está conectado OU se há conta salva
        return walletConnected || !!savedAccount;
    }

    /**
     * Carregar página de módulo
     */
    async loadModulePage(moduleName, pageName) {
        try {
            const response = await fetch(`../pages/modules/${moduleName}/${pageName}.html`);
            if (!response.ok) {
                throw new Error(`Erro ao carregar módulo ${moduleName}: ${response.status}`);
            }
            const html = await response.text();
            
            // Extrair apenas o conteúdo do body
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const bodyContent = doc.body.innerHTML;
            
            return bodyContent;
        } catch (error) {
            console.error(`❌ Erro ao carregar módulo ${moduleName}:`, error);
            return this.getErrorContent(moduleName, error.message);
        }
    }

    /**
     * Obter conteúdo de erro para módulos
     */
    getErrorContent(moduleName, errorMessage) {
        return `
            <div class="container-fluid">
                <div class="row justify-content-center">
                    <div class="col-md-8">
                        <div class="alert alert-danger text-center">
                            <i class="fas fa-exclamation-triangle fa-3x mb-3"></i>
                            <h4>Erro ao Carregar Módulo</h4>
                            <p>Não foi possível carregar o módulo <strong>${moduleName}</strong>.</p>
                            <p class="text-muted">${errorMessage}</p>
                            <button class="btn btn-primary mt-3" onclick="location.reload()">
                                <i class="fas fa-refresh"></i> Tentar Novamente
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Obter conteúdo de criação de token
     */
    async getTokenCreateContent() {
        return `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h3><i class="fas fa-plus-circle"></i> Criar Novo Token</h3>
                            </div>
                            <div class="card-body">
                                <p class="text-center text-muted">
                                    <i class="fas fa-tools fa-2x mb-3"></i><br>
                                    Funcionalidade de criação de token em desenvolvimento.
                                </p>
                                <div class="text-center">
                                    <button class="btn btn-primary" onclick="navigateTo('tokens')">
                                        <i class="fas fa-arrow-left"></i> Voltar para Tokens
                                    </button>
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
        // Executar baseado na página
        switch (pageId) {
            case 'tokens':
                this.loadModuleScript('tokens', 'token-manager');
                break;
            case 'analytics':
                this.loadModuleScript('analytics', 'analytics-reports');
                break;
            case 'templates':
                this.loadModuleScript('templates', 'template-gallery');
                break;
            case 'profile':
                this.loadModuleScript('profile', 'user-profile');
                break;
            case 'settings':
                this.loadModuleScript('settings', 'system-settings');
                break;
            case 'support':
                this.loadSupportScript();
                break;
            case 'widgets':
                this.loadWidgetsScript();
                break;
        }
    }

    /**
     * Carregar script de módulo
     */
    loadModuleScript(moduleName, scriptName) {
        const scriptPath = `../js/modules/${moduleName}/${scriptName}.js`;
        const existingScript = document.querySelector(`script[src*="${scriptName}.js"]`);
        
        if (existingScript) {
            existingScript.remove();
        }
        
        const script = document.createElement('script');
        script.src = scriptPath;
        script.onload = () => {
            console.log(`✅ Script do módulo ${moduleName} carregado`);
        };
        script.onerror = () => {
            console.error(`❌ Erro ao carregar script do módulo ${moduleName}`);
        };
        
        document.head.appendChild(script);
    }

    /**
     * Carregar script de suporte
     */
    loadSupportScript() {
        const existingScript = document.querySelector('script[src*="suporte.js"]');
        if (existingScript) existingScript.remove();
        
        const script = document.createElement('script');
        script.src = '../js/suporte.js';
        document.head.appendChild(script);
    }
    
    /**
     * Carregar script de widgets
     */
    loadWidgetsScript() {
        const existingScript = document.querySelector('script[src*="widgets.js"]');
        if (existingScript) existingScript.remove();
        
        const script = document.createElement('script');
        script.src = '../js/widgets.js';
        document.head.appendChild(script);
        console.log('📦 Script de widgets carregado');
    }
    
    /**
     * Carregar script de analytics
     */
    loadAnalyticsScript() {
        const existingScript = document.querySelector('script[src*="analytics-routes.js"]');
        if (existingScript) existingScript.remove();
        
        const script = document.createElement('script');
        script.src = '../js/analytics-routes.js';
        document.head.appendChild(script);
        console.log('📊 Script de analytics carregado');
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

// ================================================================================
// UTILITIES DE NAVEGAÇÃO - INTEGRADAS AO DASHBOARD CORE
// ================================================================================

/**
 * Utilitários de navegação TokenCafe
 * Integrados ao DashboardCore para centralizar toda navegação
 */
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
            window.location.href = '../modules/dashboard/index.html';
        } else {
            window.location.href = 'pages/modules/dashboard/index.html';
        }
    },

    // Verificar se está na página correta baseado na conexão
    checkPageAccess() {
        const walletAddress = localStorage.getItem('tokencafe_wallet_address');
        const currentPage = window.location.pathname;
        
        // Se não está conectado e está tentando acessar dashboard
        if (!walletAddress && currentPage.includes('dashboard/index.html')) {
            console.log('⚠️ Redirecionando para página principal - wallet não conectada');
            this.goToHome();
            return false;
        }
        
        return true;
    },

    // Conectar wallet e redirecionar para dashboard
    async connectAndRedirect() {
        console.log('🔗 TokenCafeNavigation.connectAndRedirect() chamado');
        
        if (window.TokenCafe?.wallet) {
            console.log('✅ WalletSystem encontrado, conectando...');
            const success = await window.TokenCafe.wallet.connect();
            if (success) {
                console.log('✅ Conexão bem-sucedida, redirecionando...');
                this.goToDashboard();
            } else {
                console.log('❌ Falha na conexão');
            }
        } else {
            console.error('❌ WalletSystem não encontrado!');
            alert('Sistema de conexão não inicializado. Recarregue a página.');
        }
    },

    // Desconectar e redirecionar para home
    disconnectAndRedirect() {
        console.log('🚪 TokenCafeNavigation.disconnectAndRedirect() chamado');
        
        // Limpar dados de conexão
        localStorage.removeItem('tokencafe_wallet_address');
        localStorage.removeItem('tokencafe_network_id');
        localStorage.removeItem('tokencafe_dashboard_data');
        localStorage.removeItem('tokencafe_connected');
        
        // Desconectar via sistema
        if (window.TokenCafe?.wallet) {
            window.TokenCafe.wallet.disconnect();
        }
        
        this.goToHome();
    },

    // Verificar conectividade e redirecionar se necessário
    validateAccess() {
        if (!this.checkPageAccess()) {
            return false;
        }

        // Verificar se TokenCafe está disponível
        if (!window.TokenCafe?.isReady) {
            console.warn('⚠️ TokenCafe não está pronto ainda');
            return false;
        }

        return true;
    }
};

// ================================================================================
// EXPOSIÇÃO GLOBAL E INICIALIZAÇÃO
// ================================================================================

// Expor globalmente
window.DashboardCore = DashboardCore;
window.TokenCafeNavigation = TokenCafeNavigation;

// Função global para navegação
window.navigateTo = function(pageId) {
    if (window.tokencafeDashboard && window.tokencafeDashboard.navigateTo) {
        window.tokencafeDashboard.navigateTo(pageId);
    } else {
        console.error('❌ Dashboard não inicializado ou função navigateTo não disponível');
    }
};

// Função global para ações rápidas
window.quickAction = function(action) {
    console.log('🚀 Ação rápida:', action);
    
    switch(action) {
        case 'create-token':
            if (window.tokencafeDashboard) {
                window.tokencafeDashboard.navigateTo('tokens');
            }
            break;
        case 'create-widget':
            if (window.tokencafeDashboard) {
                window.tokencafeDashboard.navigateTo('widgets');
            }
            break;
        case 'token-templates':
            if (window.tokencafeDashboard) {
                window.tokencafeDashboard.navigateTo('tokens');
            }
            break;
        case 'marketplace':
            console.log('🏪 Abrindo marketplace...');
            // Implementar navegação para marketplace
            break;
        default:
            console.warn('⚠️ Ação não reconhecida:', action);
    }
};

// Criar instância global quando DOM estiver pronto
function initializeDashboardCore() {
    if (!window.tokencafeDashboard) {
        console.log('🏗️ Inicializando Dashboard Core...');
        window.tokencafeDashboard = new DashboardCore();
        console.log('✅ Dashboard Core inicializado');
    }
}

// Inicializar imediatamente se DOM já estiver pronto, senão aguardar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDashboardCore);
} else {
    initializeDashboardCore();
}

console.log('✅ Dashboard Core carregado');