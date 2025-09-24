/**
 * ================================================================================
 * TOKENCAFE ECOSYSTEM - COORDENADOR CENTRAL
 * ================================================================================
 * Tronco principal do ecossistema TokenCafe
 * Gerencia inicialização, comunicação e coordenação entre todos os módulos
 * ================================================================================
 */

class TokenCafeApp {
    constructor() {
        this.version = '2.0.0';
        this.modules = new Map();
        this.systems = new Map();
        this.state = new Proxy({}, {
            set: (target, property, value) => {
                target[property] = value;
                this.eventBus.emit('state:changed', { property, value });
                return true;
            }
        });
        
        // Dependências centrais
        this.eventBus = null;
        this.dependencyInjector = null;
        this.sharedUtilities = null;
        
        // Status de inicialização
        this.initialized = false;
        this.loading = false;
        
        // Configurações do ecossistema
        this.config = {
            debug: false,
            autoLoad: true,
            lazyLoading: true,
            errorHandling: true,
            performance: true
        };
        
        this.init();
    }

    /**
     * Inicialização do ecossistema
     */
    async init() {
        if (this.loading || this.initialized) return;
        
        this.loading = true;
        this.log('🌳 Inicializando TokenCafe Ecosystem...');

        try {
            // 1. Carregar dependências centrais
            await this.loadCoreDependencies();
            
            // 2. Configurar sistema de eventos
            this.setupEventSystem();
            
            // 3. Carregar sistemas principais
            await this.loadCoreSystems();
            
            // 4. Registrar módulos disponíveis
            this.registerAvailableModules();
            
            // 5. Inicializar módulos por demanda
            if (this.config.autoLoad) {
                await this.autoLoadModules();
            }
            
            // 6. Configurar handlers globais
            this.setupGlobalHandlers();
            
            this.initialized = true;
            this.loading = false;
            
            this.log('✅ TokenCafe Ecosystem inicializado com sucesso!');
            this.eventBus.emit('ecosystem:ready');
            
        } catch (error) {
            this.loading = false;
            this.handleError('Erro na inicialização do ecossistema', error);
        }
    }

    /**
     * Carregar dependências centrais
     */
    async loadCoreDependencies() {
        const dependencies = [
            { name: 'eventBus', path: '/js/core/event-bus.js', class: 'EventBus' },
            { name: 'dependencyInjector', path: '/js/core/dependency-injector.js', class: 'DependencyInjector' },
            { name: 'sharedUtilities', path: '/js/core/shared-utilities.js', class: 'SharedUtilities' }
        ];

        for (const dep of dependencies) {
            try {
                await this.loadScript(dep.path);
                this[dep.name] = new window[dep.class]();
                this.log(`📦 ${dep.name} carregado`);
            } catch (error) {
                throw new Error(`Falha ao carregar ${dep.name}: ${error.message}`);
            }
        }
    }

    /**
     * Configurar sistema de eventos
     */
    setupEventSystem() {
        // Eventos do ecossistema
        this.eventBus.on('module:register', this.handleModuleRegister.bind(this));
        this.eventBus.on('module:load', this.handleModuleLoad.bind(this));
        this.eventBus.on('module:error', this.handleModuleError.bind(this));
        this.eventBus.on('system:error', this.handleSystemError.bind(this));
        
        // Eventos de navegação
        this.eventBus.on('navigation:change', this.handleNavigationChange.bind(this));
        this.eventBus.on('page:load', this.handlePageLoad.bind(this));
        
        this.log('🔄 Sistema de eventos configurado');
    }

    /**
     * Carregar sistemas principais
     */
    async loadCoreSystems() {
        const systems = [
            { name: 'wallet', path: '/js/systems/wallet-system.js', class: 'WalletSystem' },
            { name: 'template', path: '/js/systems/template-system.js', class: 'TemplateSystem' },
            { name: 'analytics', path: '/js/systems/analytics-system.js', class: 'AnalyticsSystem' },
            { name: 'widget', path: '/js/systems/widget-system.js', class: 'WidgetSystem' }
        ];

        for (const system of systems) {
            try {
                await this.loadScript(system.path);
                const dependencies = this.dependencyInjector.getDependencies(system.name);
                this.systems.set(system.name, new window[system.class](dependencies));
                this.log(`🔧 Sistema ${system.name} carregado`);
            } catch (error) {
                this.log(`⚠️ Falha ao carregar sistema ${system.name}: ${error.message}`);
            }
        }
    }

    /**
     * Registrar módulos disponíveis
     */
    registerAvailableModules() {
        const moduleRegistry = {
            'tokens': { path: '/js/modules/tokens/token-manager.js', class: 'TokenManager', autoLoad: true },
            'profile': { path: '/js/modules/profile/user-profile.js', class: 'UserProfile', autoLoad: false },
            'settings': { path: '/js/modules/settings/system-settings.js', class: 'SystemSettings', autoLoad: false },
            'templates': { path: '/js/modules/templates/template-gallery.js', class: 'TemplateGallery', autoLoad: false },
            'analytics': { path: '/js/modules/analytics/analytics-reports.js', class: 'AnalyticsReports', autoLoad: false }
        };

        for (const [name, config] of Object.entries(moduleRegistry)) {
            this.registerModule(name, config);
        }
    }

    /**
     * Registrar um módulo
     */
    registerModule(name, config) {
        if (this.modules.has(name)) {
            this.log(`⚠️ Módulo ${name} já registrado`);
            return;
        }

        this.modules.set(name, {
            ...config,
            loaded: false,
            instance: null,
            dependencies: []
        });

        this.eventBus.emit('module:register', { name, config });
        this.log(`📋 Módulo ${name} registrado`);
    }

    /**
     * Carregar módulo por demanda
     */
    async loadModule(name) {
        const moduleConfig = this.modules.get(name);
        if (!moduleConfig) {
            throw new Error(`Módulo ${name} não encontrado`);
        }

        if (moduleConfig.loaded) {
            return moduleConfig.instance;
        }

        try {
            this.log(`🔄 Carregando módulo ${name}...`);
            
            // Carregar script do módulo
            await this.loadScript(moduleConfig.path);
            
            // Resolver dependências
            const dependencies = this.dependencyInjector.getDependencies(name);
            dependencies.eventBus = this.eventBus;
            dependencies.sharedUtilities = this.sharedUtilities;
            dependencies.systems = Object.fromEntries(this.systems);
            
            // Instanciar módulo
            const ModuleClass = window[moduleConfig.class];
            moduleConfig.instance = new ModuleClass(dependencies);
            moduleConfig.loaded = true;
            
            this.eventBus.emit('module:load', { name, instance: moduleConfig.instance });
            this.log(`✅ Módulo ${name} carregado com sucesso`);
            
            return moduleConfig.instance;
            
        } catch (error) {
            this.eventBus.emit('module:error', { name, error });
            throw new Error(`Falha ao carregar módulo ${name}: ${error.message}`);
        }
    }

    /**
     * Auto-carregar módulos marcados para autoLoad
     */
    async autoLoadModules() {
        const autoLoadModules = Array.from(this.modules.entries())
            .filter(([name, config]) => config.autoLoad)
            .map(([name]) => name);

        for (const moduleName of autoLoadModules) {
            try {
                await this.loadModule(moduleName);
            } catch (error) {
                this.log(`⚠️ Falha no auto-load do módulo ${moduleName}: ${error.message}`);
            }
        }
    }

    /**
     * Configurar handlers globais
     */
    setupGlobalHandlers() {
        // Handler de erros globais
        window.addEventListener('error', (event) => {
            this.handleError('Erro JavaScript global', event.error);
        });

        // Handler de promises rejeitadas
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Promise rejeitada', event.reason);
        });

        // Handler de mudanças de página
        window.addEventListener('popstate', (event) => {
            this.eventBus.emit('navigation:change', { state: event.state });
        });
    }

    /**
     * Carregar script dinamicamente
     */
    loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
            document.head.appendChild(script);
        });
    }

    /**
     * Handlers de eventos
     */
    handleModuleRegister(data) {
        this.log(`📋 Módulo registrado: ${data.name}`);
    }

    handleModuleLoad(data) {
        this.log(`✅ Módulo carregado: ${data.name}`);
    }

    handleModuleError(data) {
        this.log(`❌ Erro no módulo ${data.name}: ${data.error.message}`);
    }

    handleSystemError(data) {
        this.log(`❌ Erro no sistema: ${data.error.message}`);
    }

    handleNavigationChange(data) {
        this.log(`🧭 Navegação alterada: ${JSON.stringify(data.state)}`);
    }

    handlePageLoad(data) {
        this.log(`📄 Página carregada: ${data.page}`);
    }

    /**
     * Tratamento de erros
     */
    handleError(context, error) {
        const errorInfo = {
            context,
            message: error?.message || error,
            stack: error?.stack,
            timestamp: new Date().toISOString()
        };

        console.error(`🚨 TokenCafe Error [${context}]:`, errorInfo);
        
        if (this.eventBus) {
            this.eventBus.emit('ecosystem:error', errorInfo);
        }
    }

    /**
     * Sistema de logs
     */
    log(message) {
        if (this.config.debug) {
            console.log(`🌳 TokenCafe: ${message}`);
        }
    }

    /**
     * API pública
     */
    getModule(name) {
        const moduleConfig = this.modules.get(name);
        return moduleConfig?.instance || null;
    }

    getSystem(name) {
        return this.systems.get(name) || null;
    }

    isReady() {
        return this.initialized;
    }

    getState(key) {
        return key ? this.state[key] : this.state;
    }

    setState(key, value) {
        this.state[key] = value;
    }
}

// Instância global do ecossistema
window.TokenCafeApp = new TokenCafeApp();

// Compatibilidade com código legado
window.onTokenCafeReady = (callback) => {
    if (window.TokenCafeApp.isReady()) {
        callback();
    } else {
        window.TokenCafeApp.eventBus.once('ecosystem:ready', callback);
    }
};

// Export para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TokenCafeApp;
}