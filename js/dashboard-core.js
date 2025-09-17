/*
================================================================================
DASHBOARD CORE - SISTEMA DE DASHBOARD UNIFICADO TOKENCAFE
================================================================================
Unificação dos módulos:
- Widget: js/modules/dashboard.js
- Widget: js/modules/dashboard-menu-manager.js
- Widget: js/modules/dashboard-menu-loader.js

Sistema completo de dashboard com:
- Navegação entre seções
- Gerenciamento de menu lateral
- Estado de seção atual
- Carregamento dinâmico de conteúdo
- Sistema de notificações
================================================================================
*/

class DashboardCore {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventTarget();
        this.authManager = dependencies.authManager;
        this.walletManager = dependencies.walletManager;
        this.config = dependencies.config || {};

        // Estado do dashboard
        this.state = {
            currentSection: 'overview',
            previousSection: null,
            menuExpanded: true,
            loading: false,
            userData: null
        };

        // Configurações de seções
        this.sections = {
            overview: { 
                title: 'Visão Geral', 
                icon: 'fas fa-chart-bar',
                file: 'dashboard/pages/overview.html'
            },
            widgets: { 
                title: 'Meus Widgets', 
                icon: 'fas fa-cube',
                file: 'dashboard/pages/widgets.html'
            },
            'new-widget': { 
                title: 'Novo Widget', 
                icon: 'fas fa-plus',
                file: 'dashboard/pages/new-widget.html'
            },
            templates: { 
                title: 'Templates', 
                icon: 'fas fa-layer-group',
                file: 'dashboard/pages/templates.html'
            },
            earnings: { 
                title: 'Ganhos', 
                icon: 'fas fa-dollar-sign',
                file: 'dashboard/pages/earnings.html'
            },
            settings: { 
                title: 'Configurações', 
                icon: 'fas fa-cog',
                file: 'dashboard/pages/settings.html'
            },
            support: { 
                title: 'Suporte', 
                icon: 'fas fa-question-circle',
                file: 'dashboard/pages/support.html'
            }
        };

        this.init();
        console.log('📊 DashboardCore inicializado');
    }

    /**
     * Inicialização do dashboard
     */
    init() {
        this.setupEventListeners();
        this.initializeMenu();
        this.checkAuthentication();
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Navegação do menu
        document.addEventListener('click', (event) => {
            const menuItem = event.target.closest('[data-section]');
            if (menuItem) {
                event.preventDefault();
                const section = menuItem.getAttribute('data-section');
                this.navigateToSection(section);
            }
        });

        // Toggle do menu lateral
        document.addEventListener('click', (event) => {
            if (event.target.matches('[data-action="toggle-menu"]')) {
                this.toggleMenu();
            }
        });

        // Eventos de autenticação
        this.eventBus.addEventListener('auth:connected', this.handleAuthSuccess.bind(this));
        this.eventBus.addEventListener('auth:disconnected', this.handleAuthDisconnect.bind(this));

        // Eventos customizados do dashboard
        this.eventBus.addEventListener('dashboard:navigate', this.handleNavigation.bind(this));
        this.eventBus.addEventListener('dashboard:refresh', this.refreshCurrentSection.bind(this));

        // Navegação do browser
        window.addEventListener('popstate', this.handlePopState.bind(this));
    }

    /**
     * Verificar autenticação inicial
     */
    checkAuthentication() {
        if (this.authManager) {
            const isConnected = this.authManager.isConnected();
            if (isConnected) {
                this.handleAuthSuccess();
            } else {
                this.showAuthRequired();
            }
        }
    }

    /**
     * Inicializar menu lateral
     */
    initializeMenu() {
        const menuContainer = document.getElementById('dashboard-menu');
        if (!menuContainer) {
            console.error('❌ Container do menu não encontrado');
            return;
        }

        // Gerar menu HTML
        const menuHTML = this.generateMenuHTML();
        menuContainer.innerHTML = menuHTML;

        // Configurar seção inicial
        const initialSection = this.getInitialSection();
        this.navigateToSection(initialSection, false);
    }

    /**
     * Gerar HTML do menu lateral
     */
    generateMenuHTML() {
        let menuHTML = '<ul class="dashboard-menu-list">';

        Object.keys(this.sections).forEach(sectionKey => {
            const section = this.sections[sectionKey];
            menuHTML += `
                <li class="menu-item">
                    <a href="#${sectionKey}" 
                       data-section="${sectionKey}" 
                       class="menu-link ${sectionKey === this.state.currentSection ? 'active' : ''}">
                        <i class="${section.icon} me-2"></i>
                        <span class="menu-text">${section.title}</span>
                    </a>
                </li>
            `;
        });

        menuHTML += '</ul>';
        return menuHTML;
    }

    /**
     * Navegar para uma seção
     */
    async navigateToSection(sectionKey, updateHistory = true) {
        if (!this.sections[sectionKey]) {
            console.error(`❌ Seção ${sectionKey} não encontrada`);
            return false;
        }

        if (this.state.currentSection === sectionKey) {
            console.log(`ℹ️ Já na seção ${sectionKey}`);
            return true;
        }

        try {
            this.setLoading(true);
            console.log(`🔄 Navegando para: ${sectionKey}`);

            // Atualizar estado
            this.state.previousSection = this.state.currentSection;
            this.state.currentSection = sectionKey;

            // Atualizar menu ativo
            this.updateActiveMenu(sectionKey);

            // Carregar conteúdo da seção
            await this.loadSectionContent(sectionKey);

            // Atualizar URL se necessário
            if (updateHistory) {
                this.updateURL(sectionKey);
            }

            // Emitir evento
            this.emitDashboardEvent('sectionChanged', { 
                current: sectionKey, 
                previous: this.state.previousSection 
            });

            console.log(`✅ Navegação completa para: ${sectionKey}`);
            return true;

        } catch (error) {
            console.error(`❌ Erro na navegação para ${sectionKey}:`, error);
            this.handleNavigationError(sectionKey, error);
            return false;
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Carregar conteúdo da seção
     */
    async loadSectionContent(sectionKey) {
        const section = this.sections[sectionKey];
        const contentContainer = document.getElementById('main-content');

        if (!contentContainer) {
            throw new Error('Container de conteúdo não encontrado');
        }

        try {
            // Buscar conteúdo da seção
            const response = await fetch(section.file);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const content = await response.text();
            if (!content.trim()) {
                throw new Error('Conteúdo vazio');
            }

            // Injetar conteúdo
            contentContainer.innerHTML = content;

            // Executar inicialização específica da seção
            await this.initializeSectionFeatures(sectionKey);

            // Atualizar título da página
            this.updatePageTitle(section.title);

        } catch (error) {
            console.error(`❌ Erro ao carregar conteúdo da seção ${sectionKey}:`, error);
            this.showSectionError(sectionKey, error);
            throw error;
        }
    }

    /**
     * Inicializar funcionalidades específicas da seção
     */
    async initializeSectionFeatures(sectionKey) {
        console.log(`🔧 Inicializando funcionalidades da seção: ${sectionKey}`);

        switch (sectionKey) {
            case 'overview':
                await this.initializeOverviewSection();
                break;
            case 'widgets':
                await this.initializeWidgetsSection();
                break;
            case 'new-widget':
                await this.initializeNewWidgetSection();
                break;
            case 'earnings':
                await this.initializeEarningsSection();
                break;
            case 'settings':
                await this.initializeSettingsSection();
                break;
            case 'support':
                await this.initializeSupportSection();
                break;
        }
    }

    /**
     * Inicialização específica - Overview
     */
    async initializeOverviewSection() {
        // Carregar estatísticas do usuário
        await this.loadUserStats();
        
        // Configurar gráficos se necessário
        if (typeof Chart !== 'undefined') {
            this.initializeCharts();
        }
    }

    /**
     * Inicialização específica - Widgets
     */
    async initializeWidgetsSection() {
        // Carregar lista de widgets do usuário
        await this.loadUserWidgets();
        
        // Configurar filtros e busca
        this.setupWidgetFilters();
    }

    /**
     * Inicialização específica - Novo Widget
     */
    async initializeNewWidgetSection() {
        // Configurar formulário de criação
        this.setupWidgetCreationForm();
        
        // Carregar templates disponíveis
        await this.loadWidgetTemplates();
    }

    /**
     * Inicialização específica - Ganhos
     */
    async initializeEarningsSection() {
        // Carregar dados de ganhos
        await this.loadEarningsData();
        
        // Configurar filtros de período
        this.setupEarningsFilters();
    }

    /**
     * Inicialização específica - Configurações
     */
    async initializeSettingsSection() {
        // Carregar configurações do usuário
        await this.loadUserSettings();
        
        // Configurar formulários de configuração
        this.setupSettingsForms();
    }

    /**
     * Inicialização específica - Suporte
     */
    async initializeSupportSection() {
        // Carregar FAQ e tickets
        await this.loadSupportData();
        
        // Configurar sistema de tickets
        this.setupTicketSystem();
    }

    /**
     * Utilitários de UI
     */
    updateActiveMenu(sectionKey) {
        // Remover classe active de todos os itens
        document.querySelectorAll('.menu-link').forEach(link => {
            link.classList.remove('active');
        });

        // Adicionar classe active ao item atual
        const activeLink = document.querySelector(`[data-section="${sectionKey}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    toggleMenu() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            this.state.menuExpanded = !sidebar.classList.contains('collapsed');
            
            // Salvar preferência
            localStorage.setItem('dashboard-menu-expanded', this.state.menuExpanded);
        }
    }

    setLoading(loading) {
        this.state.loading = loading;
        const loadingElement = document.getElementById('dashboard-loading');
        
        if (loadingElement) {
            loadingElement.style.display = loading ? 'block' : 'none';
        }

        // Adicionar classe de loading ao body
        if (loading) {
            document.body.classList.add('dashboard-loading');
        } else {
            document.body.classList.remove('dashboard-loading');
        }
    }

    updatePageTitle(title) {
        document.title = `${title} | TokenCafe Dashboard`;
        
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = title;
        }
    }

    updateURL(sectionKey) {
        const url = new URL(window.location);
        url.hash = sectionKey;
        window.history.pushState({ section: sectionKey }, '', url);
    }

    getInitialSection() {
        // Verificar hash na URL
        const hash = window.location.hash.replace('#', '');
        if (hash && this.sections[hash]) {
            return hash;
        }

        // Seção padrão
        return 'overview';
    }

    /**
     * Handlers de eventos
     */
    handleAuthSuccess() {
        console.log('✅ Usuário autenticado no dashboard');
        // Carregar dados do usuário
        this.loadUserData();
    }

    handleAuthDisconnect() {
        console.log('🔌 Usuário desconectado do dashboard');
        this.showAuthRequired();
    }

    handleNavigation(event) {
        const { section } = event.detail;
        this.navigateToSection(section);
    }

    handlePopState(event) {
        if (event.state && event.state.section) {
            this.navigateToSection(event.state.section, false);
        }
    }

    handleNavigationError(sectionKey, error) {
        console.error(`❌ Erro de navegação para ${sectionKey}:`, error);
        
        // Mostrar mensagem de erro
        this.showNotification(`Erro ao carregar seção: ${sectionKey}`, 'error');
        
        // Voltar para seção anterior se possível
        if (this.state.previousSection) {
            this.navigateToSection(this.state.previousSection, false);
        }
    }

    /**
     * Métodos de dados (placeholders para implementação)
     */
    async loadUserData() {
        // Implementar carregamento de dados do usuário
        console.log('📊 Carregando dados do usuário...');
    }

    async loadUserStats() {
        // Implementar carregamento de estatísticas
        console.log('📈 Carregando estatísticas...');
    }

    async loadUserWidgets() {
        // Implementar carregamento de widgets
        console.log('🧩 Carregando widgets...');
    }

    async loadEarningsData() {
        // Implementar carregamento de ganhos
        console.log('💰 Carregando dados de ganhos...');
    }

    async loadUserSettings() {
        // Implementar carregamento de configurações
        console.log('⚙️ Carregando configurações...');
    }

    async loadSupportData() {
        // Implementar carregamento de suporte
        console.log('🎧 Carregando dados de suporte...');
    }

    /**
     * UI de erro e estados
     */
    showSectionError(sectionKey, error) {
        const contentContainer = document.getElementById('main-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h5><i class="fas fa-exclamation-triangle"></i> Erro ao Carregar Seção</h5>
                    <p>Não foi possível carregar a seção "${this.sections[sectionKey]?.title || sectionKey}".</p>
                    <small class="text-muted">${error.message}</small>
                    <hr>
                    <button class="btn btn-outline-danger btn-sm" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Recarregar Página
                    </button>
                </div>
            `;
        }
    }

    showAuthRequired() {
        const contentContainer = document.getElementById('main-content');
        if (contentContainer) {
            contentContainer.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-lock fa-3x text-muted mb-3"></i>
                    <h4>Autenticação Necessária</h4>
                    <p class="text-muted">Conecte sua carteira para acessar o dashboard.</p>
                    <button class="btn btn-coffee btn-lg" data-auth="connect">
                        <i class="fab fa-ethereum"></i> Conectar Carteira
                    </button>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Implementar sistema de notificações
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }

    /**
     * API Pública
     */
    getCurrentSection() {
        return this.state.currentSection;
    }

    getState() {
        return { ...this.state };
    }

    getSections() {
        return { ...this.sections };
    }

    refreshCurrentSection() {
        return this.navigateToSection(this.state.currentSection, false);
    }

    emitDashboardEvent(type, data = {}) {
        const event = new CustomEvent(`dashboard:${type}`, {
            detail: { ...data, state: this.state }
        });
        
        this.eventBus.dispatchEvent(event);
        
        // Emitir também no document
        if (typeof document !== 'undefined') {
            document.dispatchEvent(event);
        }
    }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.DashboardCore = DashboardCore;
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DashboardCore;
}
