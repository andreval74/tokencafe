/*
================================================================================
TOKENCAFE APP - COORDENADOR PRINCIPAL UNIFICADO
================================================================================
Sistema de inicialização e coordenação do ecossistema TokenCafe
Unificação dos sistemas TokenCafe + Widget com tema café
Inspirado na cultura cafeeira brasileira
================================================================================
*/

class TokenCafeApp {
    constructor() {
        this.loadedModules = new Set();
        this.managers = {};
        this.isInitialized = false;
        this.config = {};
        this.eventBus = new EventTarget();
        
        // Configurações do tema café
        this.theme = {
            name: 'tokencafe',
            colors: {
                primary: '#8B4513',      // Café torrado
                secondary: '#A0522D',    // Café médio
                accent: '#DAA520',       // Dourado
                success: '#228B22',      // Verde floresta
                warning: '#DAA520',      // Dourado
                danger: '#B22222',       // Vermelho tijolo
                info: '#4682B4',         // Azul aço
                light: '#FAEBD7',        // Espuma
                dark: '#3C2415'          // Grão de café
            }
        };
        
        console.log('☕ Inicializando TokenCafe App...');
        this.init();
    }

    /**
     * Inicialização principal do sistema
     */
    init() {
        document.addEventListener('DOMContentLoaded', async () => {
            console.log('☕ TokenCafe - Carregando ecossistema...');
            
            try {
                // 1. Configurar tema visual
                this.setupTheme();
                
                // 2. Aguardar carregamento das configurações
                await this.waitForConfig();
                
                // 3. Inicializar managers na ordem correta
                await this.initializeManagers();
                
                // 4. Configurar sistema de eventos
                this.setupEventSystem();
                
                // 5. Inicializar funcionalidades específicas da página
                this.initializePageSpecificFeatures();
                
                // 6. Inicializar funcionalidades globais da página
                this.initPageFeatures();
                
                // 7. Configurar animações do tema café
                this.setupCoffeeAnimations();
                
                this.isInitialized = true;
                console.log('✅ TokenCafe App inicializado com sucesso!');
                
                // Disparar evento de inicialização completa
                this.notifyInitializationComplete();
                
            } catch (error) {
                console.error('❌ Erro ao inicializar TokenCafe App:', error);
                this.handleInitializationError(error);
            }
        });
    }

    /**
     * Configurar tema visual do TokenCafe
     */
    setupTheme() {
        console.log('🎨 Configurando tema TokenCafe...');
        
        // Aplicar variáveis CSS do tema
        const root = document.documentElement;
        Object.entries(this.theme.colors).forEach(([key, value]) => {
            root.style.setProperty(`--tokencafe-${key}`, value);
        });
        
        // Adicionar classe do tema ao body
        document.body.classList.add('tokencafe-theme');
        
        // Configurar tema escuro por padrão
        document.body.setAttribute('data-bs-theme', 'dark');
        
        console.log('✅ Tema TokenCafe aplicado');
    }

    /**
     * Aguardar carregamento das configurações
     */
    async waitForConfig() {
        console.log('⚙️ Aguardando configurações...');
        
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!window.TOKENCAFE_CONFIG && !window.BLOCKCHAIN_CONFIG && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (window.TOKENCAFE_CONFIG || window.BLOCKCHAIN_CONFIG) {
            this.config = window.TOKENCAFE_CONFIG || window.BLOCKCHAIN_CONFIG || {};
            console.log('✅ Configurações carregadas');
        } else {
            console.warn('⚠️ Configurações não encontradas, usando fallback');
            this.config = this.getDefaultConfig();
        }
    }

    /**
     * Configuração padrão do TokenCafe
     */
    getDefaultConfig() {
        return {
            app: {
                name: 'TokenCafe',
                version: '1.0.0',
                theme: 'coffee'
            },
            blockchain: {
                defaultNetwork: 'bsc',
                supportedNetworks: ['ethereum', 'bsc', 'polygon']
            },
            api: {
                baseUrl: '/api',
                timeout: 10000
            }
        };
    }

    /**
     * Inicializar managers do sistema
     */
    async initializeManagers() {
        console.log('🔧 Inicializando managers...');

        // 1. DataManager (sem dependências)
        if (window.DataManager) {
            this.managers.dataManager = new window.DataManager();
            this.loadedModules.add('DataManager');
            console.log('✅ DataManager inicializado');
        }

        // 2. AuthUnified - Sistema de autenticação unificado
        if (window.AuthUnified) {
            this.managers.authManager = new window.AuthUnified({
                eventBus: this.eventBus,
                config: this.config
            });
            this.loadedModules.add('AuthUnified');
            console.log('✅ AuthUnified inicializado (TokenCafe + Widget unified)');
        }

        // 3. TemplateLoader - Sistema de templates unificado
        if (window.TemplateLoader) {
            this.managers.templateLoader = new window.TemplateLoader({
                eventBus: this.eventBus,
                config: this.config
            });
            this.loadedModules.add('TemplateLoader');
            console.log('✅ TemplateLoader inicializado (Widget optimized + standard unified)');
        }

        // 4. DashboardCore - Dashboard unificado
        if (window.DashboardCore) {
            this.managers.dashboardManager = new window.DashboardCore({
                eventBus: this.eventBus,
                authManager: this.managers.authManager,
                config: this.config
            });
            this.loadedModules.add('DashboardCore');
            console.log('✅ DashboardCore inicializado (Widget dashboard.js + menu-manager unified)');
        }

        // 5. WidgetCore - Sistema de widgets unificado
        if (window.WidgetCore) {
            this.managers.widgetManager = new window.WidgetCore({
                eventBus: this.eventBus,
                authManager: this.managers.authManager,
                config: this.config
            });
            this.loadedModules.add('WidgetCore');
            console.log('✅ WidgetCore inicializado (Widget creation + management unified)');
        }

        // Disponibilizar managers globalmente
        window.tokenCafeManagers = this.managers;
        window.tokenCafeApp = this;
    }

    /**
     * Configurar sistema de eventos
     */
    setupEventSystem() {
        console.log('📡 Configurando sistema de eventos...');

        // Escutar eventos de templates carregados
        document.addEventListener('templateLoaded', (event) => {
            const { templatePath, containerId } = event.detail;
            console.log(`📄 Template carregado: ${templatePath} → ${containerId}`);
            this.onTemplateLoaded(templatePath, containerId);
        });

        // Escutar mudanças de autenticação
        this.eventBus.addEventListener('authStateChanged', (event) => {
            const { isAuthenticated, account } = event.detail;
            console.log(`🔐 Estado de auth alterado: ${isAuthenticated ? 'Conectado' : 'Desconectado'}`);
            this.onAuthStateChanged(isAuthenticated, account);
        });

        // Escutar mudanças de rede blockchain
        this.eventBus.addEventListener('networkChanged', (event) => {
            const { chainId, isSupported, network } = event.detail;
            console.log(`🌐 Rede alterada: ${network?.name || chainId}`);
            this.onNetworkChanged(chainId, isSupported, network);
        });

        // Escutar eventos de tema
        this.eventBus.addEventListener('themeChanged', (event) => {
            const { theme } = event.detail;
            console.log(`🎨 Tema alterado: ${theme}`);
            this.onThemeChanged(theme);
        });

        console.log('✅ Sistema de eventos configurado');
    }

    /**
     * Inicializar funcionalidades específicas da página
     */
    initializePageSpecificFeatures() {
        const currentPage = this.getCurrentPage();
        console.log(`📄 Página atual: ${currentPage}`);

        switch (currentPage) {
            case 'index':
                this.initializeIndexPage();
                break;
            case 'dashboard':
                this.initializeDashboardPage();
                break;
            case 'auth':
                this.initializeAuthPage();
                break;
            case 'admin':
                this.initializeAdminPage();
                break;
            case 'widget-manager':
                this.initializeWidgetManagerPage();
                break;
            case 'widget-creator':
                this.initializeWidgetCreatorPage();
                break;
            default:
                console.log('ℹ️ Página genérica, carregando funcionalidades básicas');
                this.initializeBasicFeatures();
        }
    }

    /**
     * Configurar animações do tema café
     */
    setupCoffeeAnimations() {
        console.log('☕ Configurando animações do tema café...');
        
        // Criar partículas flutuantes se não existirem
        if (!document.querySelector('.background-animation')) {
            this.createFloatingParticles();
        }
        
        // Configurar efeitos hover nos cards
        this.setupCardHoverEffects();
        
        // Configurar animações de loading
        this.setupLoadingAnimations();
        
        console.log('✅ Animações do tema café configuradas');
    }

    /**
     * Criar partículas flutuantes de fundo
     */
    createFloatingParticles() {
        const backgroundAnimation = document.createElement('div');
        backgroundAnimation.className = 'background-animation';
        
        for (let i = 1; i <= 4; i++) {
            const particle = document.createElement('div');
            particle.className = `floating-particle particle-${i}`;
            backgroundAnimation.appendChild(particle);
        }
        
        document.body.appendChild(backgroundAnimation);
    }

    /**
     * Configurar efeitos hover nos cards
     */
    setupCardHoverEffects() {
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('.card-coffee')) {
                e.target.closest('.card-coffee').classList.add('glow-coffee');
            }
        });
        
        document.addEventListener('mouseout', (e) => {
            if (e.target.closest('.card-coffee')) {
                e.target.closest('.card-coffee').classList.remove('glow-coffee');
            }
        });
    }

    /**
     * Configurar animações de loading
     */
    setupLoadingAnimations() {
        // Adicionar spinner de café para elementos de loading
        const style = document.createElement('style');
        style.textContent = `
            .loading-coffee::after {
                content: '☕';
                animation: spin 1s linear infinite;
                display: inline-block;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Handler para template carregado
     */
    onTemplateLoaded(templatePath, containerId) {
        // Aplicar tema aos novos elementos
        setTimeout(() => {
            const container = document.getElementById(containerId);
            if (container) {
                this.applyThemeToContainer(container);
            }
        }, 100);
    }

    /**
     * Handler para mudança de autenticação
     */
    onAuthStateChanged(isAuthenticated, account) {
        // Atualizar UI baseado no estado de autenticação
        this.updateAuthUI(isAuthenticated, account);
        
        // Disparar evento para outros módulos
        this.eventBus.dispatchEvent(new CustomEvent('tokencafe:authChanged', {
            detail: { isAuthenticated, account }
        }));
    }

    /**
     * Handler para mudança de rede
     */
    onNetworkChanged(chainId, isSupported, network) {
        if (!isSupported) {
            this.showNetworkWarning(chainId, network);
        }
        
        // Atualizar UI da rede
        this.updateNetworkUI(chainId, network);
    }

    /**
     * Handler para mudança de tema
     */
    onThemeChanged(theme) {
        document.body.setAttribute('data-bs-theme', theme);
        localStorage.setItem('tokencafe-theme', theme);
    }

    // ========================================================================
    // INICIALIZAÇÃO POR PÁGINA
    // ========================================================================

    initializeIndexPage() {
        console.log('🏠 Inicializando página principal...');
        // Configurar hero section
        // Configurar animações específicas
        // Configurar CTAs
    }

    initializeDashboardPage() {
        console.log('📊 Inicializando dashboard...');
        if (this.managers.dashboardManager) {
            this.managers.dashboardManager.initializeDashboard();
        }
    }

    initializeAuthPage() {
        console.log('🔐 Inicializando página de autenticação...');
        if (this.managers.authManager) {
            this.managers.authManager.initializeAuthPage();
        }
    }

    initializeAdminPage() {
        console.log('⚙️ Inicializando painel administrativo...');
        // Verificar permissões de admin
        // Carregar módulos administrativos
    }

    initializeWidgetManagerPage() {
        console.log('🧩 Inicializando gerenciador de widgets...');
        if (this.managers.widgetManager) {
            this.managers.widgetManager.initializeManager();
        }
    }

    initializeWidgetCreatorPage() {
        console.log('🎨 Inicializando criador de widgets...');
        if (this.managers.widgetManager) {
            this.managers.widgetManager.initializeCreator();
        }
    }

    initializeBasicFeatures() {
        console.log('⚡ Inicializando funcionalidades básicas...');
        // Funcionalidades comuns a todas as páginas
    }

    // ========================================================================
    // UTILITÁRIOS
    // ========================================================================

    /**
     * Obter página atual
     */
    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop().split('.')[0];
        
        const pageMap = {
            'index': 'index',
            'dashboard': 'dashboard',
            'auth': 'auth',
            'admin': 'admin',
            'admin-panel': 'admin',
            'widget-manager': 'widget-manager',
            'widget-creator': 'widget-creator'
        };
        
        return pageMap[filename] || filename || 'index';
    }

    /**
     * Aplicar tema a um container
     */
    applyThemeToContainer(container) {
        // Aplicar classes do tema café aos elementos
        const cards = container.querySelectorAll('.card');
        cards.forEach(card => {
            if (!card.classList.contains('card-coffee')) {
                card.classList.add('card-coffee');
            }
        });
        
        const buttons = container.querySelectorAll('.btn-primary');
        buttons.forEach(btn => {
            btn.classList.add('btn-coffee');
        });
    }

    /**
     * Atualizar UI de autenticação
     */
    updateAuthUI(isAuthenticated, account) {
        const authButtons = document.querySelectorAll('[data-auth-button]');
        authButtons.forEach(button => {
            if (isAuthenticated) {
                button.textContent = this.shortenAddress(account);
                button.classList.remove('btn-danger');
                button.classList.add('btn-success');
            } else {
                button.textContent = 'Conectar Carteira';
                button.classList.remove('btn-success');
                button.classList.add('btn-danger');
            }
        });
    }

    /**
     * Atualizar UI da rede
     */
    updateNetworkUI(chainId, network) {
        const networkElements = document.querySelectorAll('[data-network-info]');
        networkElements.forEach(element => {
            element.textContent = network?.name || `Chain ${chainId}`;
        });
    }

    /**
     * Mostrar aviso de rede não suportada
     */
    showNetworkWarning(chainId, network) {
        console.warn(`⚠️ Rede não suportada: ${network?.name || chainId}`);
        // Implementar modal ou toast de aviso
    }

    /**
     * Encurtar endereço
     */
    shortenAddress(address, length = 6) {
        if (!address || address.length < 10) return address;
        return `${address.slice(0, length)}...${address.slice(-4)}`;
    }

    /**
     * Notificar inicialização completa
     */
    notifyInitializationComplete() {
        const event = new CustomEvent('tokencafeAppInitialized', {
            detail: {
                managers: this.managers,
                loadedModules: Array.from(this.loadedModules),
                isInitialized: this.isInitialized,
                theme: this.theme,
                config: this.config
            }
        });
        document.dispatchEvent(event);
        
        // Também disparar no eventBus interno
        this.eventBus.dispatchEvent(new CustomEvent('appInitialized', {
            detail: { app: this }
        }));
    }

    /**
     * Tratar erro de inicialização
     */
    handleInitializationError(error) {
        console.error('💥 Erro crítico na inicialização:', error);
        
        // Mostrar mensagem de erro amigável
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
        errorDiv.style.zIndex = '9999';
        errorDiv.innerHTML = `
            <h6><i class="fas fa-exclamation-triangle me-2"></i>Erro de Inicialização</h6>
            <p class="mb-0">Houve um problema ao carregar o TokenCafe. Recarregue a página.</p>
        `;
        document.body.appendChild(errorDiv);
        
        // Remover após 10 segundos
        setTimeout(() => {
            errorDiv.remove();
        }, 10000);
    }

    // ========================================================================
    // API PÚBLICA
    // ========================================================================

    /**
     * Obter managers
     */
    getManagers() {
        return this.managers;
    }

    /**
     * Obter manager específico
     */
    getManager(managerName) {
        return this.managers[managerName] || null;
    }

    /**
     * Verificar se módulo está carregado
     */
    isModuleLoaded(moduleName) {
        return this.loadedModules.has(moduleName);
    }

    /**
     * Obter módulos carregados
     */
    getLoadedModules() {
        return Array.from(this.loadedModules);
    }

    /**
     * Verificar se app está pronto
     */
    isReady() {
        return this.isInitialized;
    }

    /**
     * Obter configuração
     */
    getConfig() {
        return this.config;
    }

    /**
     * Obter tema atual
     */
    getTheme() {
        return this.theme;
    }

    /**
     * Disparar evento customizado
     */
    emit(eventName, data) {
        this.eventBus.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    }

    /**
     * Escutar evento customizado
     */
    on(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }
    /**
     * Inicializa funcionalidades globais da página
     */
    initPageFeatures() {
        this.initBackToTop();
        this.initSmoothScroll();
    }

    /**
     * Inicializa o botão "Voltar ao Topo"
     */
    initBackToTop() {
        // Função para voltar ao topo da página
        window.scrollToTop = function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        };

        // Função para configurar o listener de scroll
        const setupScrollListener = () => {
            const backToTopBtn = document.getElementById('backToTop');
            if (!backToTopBtn) {
                // Se o botão não existe ainda, tentar novamente em 500ms
                setTimeout(setupScrollListener, 500);
                return;
            }

            // Configurar o listener de scroll
            const handleScroll = () => {
                const backToTopBtn = document.getElementById('backToTop');
                if (backToTopBtn) {
                    if (window.pageYOffset > 300) {
                        backToTopBtn.classList.add('show');
                    } else {
                        backToTopBtn.classList.remove('show');
                    }
                }
            };

            // Adicionar listener se ainda não existe
            if (!window.backToTopScrollListener) {
                window.addEventListener('scroll', handleScroll);
                window.backToTopScrollListener = true;
                console.log('☕ Back to Top - Listener de scroll configurado');
            }

            // Verificar posição inicial
            handleScroll();
        };

        // Iniciar configuração
        setupScrollListener();

        console.log('☕ Back to Top - Funcionalidade iniciada');
    }

    /**
     * Inicializa scroll suave para âncoras
     */
    initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const targetId = this.getAttribute('href');
                if (targetId !== '#' && targetId.length > 1) {
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        e.preventDefault();
                        targetElement.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
                }
            });
        });

        console.log('☕ Smooth Scroll - Funcionalidade iniciada');
    }
}

// ========================================================================
// INICIALIZAÇÃO GLOBAL
// ========================================================================

// Criar instância global do TokenCafe
const tokenCafeApp = new TokenCafeApp();

// Disponibilizar globalmente
window.tokenCafeApp = tokenCafeApp;
window.TokenCafeApp = TokenCafeApp;

// Log de inicialização
console.log(`
☕ ========================================
   TOKENCAFE - ECOSSISTEMA UNIFICADO
   Versão: 1.0.0
   Tema: Café Brasileiro
   Status: Inicializando...
☕ ========================================
`);

/*
================================================================================
FIM DO COORDENADOR TOKENCAFE
================================================================================
Funcionalidades:
- ✅ Coordenação de módulos unificados
- ✅ Sistema de eventos centralizado
- ✅ Tema café aplicado automaticamente
- ✅ Gerenciamento de estado global
- ✅ Inicialização por página
- ✅ Tratamento de erros
- ✅ API pública completa

Inspiração: "Como um barista experiente, coordena cada elemento para criar
a experiência perfeita" ☕
================================================================================
*/
