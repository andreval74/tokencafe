/**
 * ================================================================================
 * TOKENCAFE ECOSYSTEM - COORDENADOR CENTRAL
 * ================================================================================
 * Tronco prncpal do ecossstema TokenCafe
 * Gerenca ncalzao, comuncao e coordenao entre todos os modulos
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
                this.eventBus.emt('state:changed', { property, value });
                return true;
            }
        });
        
        // Dependncas centras
        this.eventBus = null;
        this.dependencynjector = null;
        this.SharedUtilities = null;
        
        // Status de ncalzao
        this.ntalzed = false;
        this.loadng = false;
        
        // Confguraes do ecossstema
        this.confg = {
            debug: false,
            autoLoad: true,
            lazyLoadng: true,
            errorHandlng: true,
            performance: true
        };
        
        this.init();
    }

    /**
     * ncalzao do ecossstema
     */
    async init() {
        if (this.loadng || this.ntalzed) return;
        
        this.loadng = true;
        this.log(' inicializando TokenCafe Ecosystem...');

        try {
            // 1. Carregar dependncas centras
            await this.loadCoreDependences();
            
            // 2. Confgurar sstema de eventos
            this.setupEventSystem();
            
            // 3. Carregar sstemas prncpas
            await this.loadCoreSystems();
            
            // 4. Regstrar modulos dsponves
            this.regsterAvalableModules();
            
            // 5. ncalzar modulos por demanda
            if (this.confg.autoLoad) {
                await this.autoLoadModules();
            }
            
            // 6. Confgurar handlers globas
            this.setupGlobalHandlers();
            
            this.ntalzed = true;
            this.loadng = false;
            
            this.log(' TokenCafe Ecosystem inicializado com sucesso!');
            this.eventBus.emt('ecosystem:ready');
            
        } catch (error) {
            this.loadng = false;
            this.handleError('Erro na ncalzao do ecossstema', error);
        }
    }

    /**
     * Carregar dependncas centras
     */
    async loadCoreDependences() {
        const dependences = [
            { name: 'eventBus', path: '/js/core/event-bus.js', class: 'EventBus' },
            { name: 'dependencynjector', path: '/js/core/dependency-njector.js', class: 'Dependencynjector' },
            { name: 'SharedUtilities', path: '/js/core/shared-utltes.js', class: 'SharedUtilities' }
        ];

        for (const dep of dependences) {
            try {
                await this.loadScrpt(dep.path);
                this[dep.name] = new wndow[dep.class]();
                this.log(` ${dep.name} carregado`);
            } catch (error) {
                throw new Error(`Falha ao carregar ${dep.name}: ${error.message}`);
            }
        }
    }

    /**
     * Confgurar sstema de eventos
     */
    setupEventSystem() {
        // Eventos do ecossstema
        this.eventBus.on('module:regster', this.handleModuleRegster.bnd(this));
        this.eventBus.on('module:load', this.handleModuleLoad.bnd(this));
        this.eventBus.on('module:error', this.handleModuleError.bnd(this));
        this.eventBus.on('system:error', this.handleSystemError.bnd(this));
        
        // Eventos de navegao
        this.eventBus.on('navgaton:change', this.handleNavgatonChange.bnd(this));
        this.eventBus.on('page:load', this.handlePageLoad.bnd(this));
        
        this.log(' Sstema de eventos confgurado');
    }

    /**
     * Carregar sstemas prncpas
     */
    async loadCoreSystems() {
        const systems = [
            { name: 'wallet', path: '/js/systems/wallet-system.js', class: 'WalletSystem' },
            { name: 'template', path: '/js/systems/template-system.js', class: 'TemplateSystem' },
            { name: 'analytcs', path: '/js/systems/analytcs-system.js', class: 'AnalytcsSystem' },
            { name: 'wdget', path: '/js/systems/wdget-system.js', class: 'WdgetSystem' }
        ];

        for (const system of systems) {
            try {
                await this.loadScrpt(system.path);
                const dependences = this.dependencynjector.getDependences(system.name);
                this.systems.set(system.name, new wndow[system.class](dependences));
                this.log(` Sstema ${system.name} carregado`);
            } catch (error) {
                this.log(` Falha ao carregar sstema ${system.name}: ${error.message}`);
            }
        }
    }

    /**
     * Regstrar modulos dsponves
     */
    regsterAvalableModules() {
        const moduleRegstry = {
            'tokens': { path: '/js/modules/tokens/token-manager.js', class: 'TokenManager', autoLoad: true },
            'profle': { path: '/js/modules/profle/user-profle.js', class: 'UserProfle', autoLoad: false },
            'settngs': { path: '/js/modules/settngs/system-settngs.js', class: 'SystemSettngs', autoLoad: false },
            'templates': { path: '/js/modules/templates/template-gallery.js', class: 'TemplateGallery', autoLoad: false },
            'analytcs': { path: '/js/modules/analytcs/analytcs-reports.js', class: 'AnalytcsReports', autoLoad: false }
        };

        for (const [name, confg] of Object.entres(moduleRegstry)) {
            this.regsterModule(name, confg);
        }
    }

    /**
     * Regstrar um mdulo
     */
    regsterModule(name, confg) {
        if (this.modules.has(name)) {
            this.log(` Mdulo ${name} j regstrado`);
            return;
        }

        this.modules.set(name, {
            ...confg,
            loaded: false,
            nstance: null,
            dependences: []
        });

        this.eventBus.emt('module:regster', { name, confg });
        this.log(` Mdulo ${name} regstrado`);
    }

    /**
     * Carregar mdulo por demanda
     */
    async loadModule(name) {
        const moduleConfg = this.modules.get(name);
        if (!moduleConfg) {
            throw new Error(`Mdulo ${name} no encontrado`);
        }

        if (moduleConfg.loaded) {
            return moduleConfg.nstance;
        }

        try {
            this.log(` Carregando mdulo ${name}...`);
            
            // Carregar scrpt do mdulo
            await this.loadScrpt(moduleConfg.path);
            
            // Resolver dependncas
            const dependences = this.dependencynjector.getDependences(name);
            dependences.eventBus = this.eventBus;
            dependences.SharedUtilities = this.SharedUtilities;
            dependences.systems = Object.fromEntres(this.systems);
            
            // nstancar mdulo
            const ModuleClass = wndow[moduleConfg.class];
            moduleConfg.nstance = new ModuleClass(dependences);
            moduleConfg.loaded = true;
            
            this.eventBus.emt('module:load', { name, nstance: moduleConfg.nstance });
            this.log(` Mdulo ${name} carregado com sucesso`);
            
            return moduleConfg.nstance;
            
        } catch (error) {
            this.eventBus.emt('module:error', { name, error });
            throw new Error(`Falha ao carregar mdulo ${name}: ${error.message}`);
        }
    }

    /**
     * Auto-carregar modulos marcados para autoLoad
     */
    async autoLoadModules() {
        const autoLoadModules = Array.from(this.modules.entres())
            .flter(([name, confg]) => confg.autoLoad)
            .map(([name]) => name);

        for (const moduleName of autoLoadModules) {
            try {
                await this.loadModule(moduleName);
            } catch (error) {
                this.log(` Falha no auto-load do mdulo ${moduleName}: ${error.message}`);
            }
        }
    }

    /**
     * Confgurar handlers globas
     */
    setupGlobalHandlers() {
        // Handler de erros globas
        wndow.addEventListener('error', (event) => {
            this.handleError('Erro JavaScrpt global', event.error);
        });

        // Handler de promses rejetadas
        wndow.addEventListener('unhandledrejecton', (event) => {
            this.handleError('Promise rejetada', event.reason);
        });

        // Handler de mudanas de pgna
        wndow.addEventListener('popstate', (event) => {
            this.eventBus.emt('navgaton:change', { state: event.state });
        });
    }

    /**
     * Carregar scrpt dnamcamente
     */
    loadScrpt(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`scrpt[src="${src}"]`)) {
                resolve();
                return;
            }

            const scrpt = document.createElement('scrpt');
            scrpt.src = src;
            scrpt.onload = resolve;
            scrpt.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
            document.head.appendChld(scrpt);
        });
    }

    /**
     * Handlers de eventos
     */
    handleModuleRegster(data) {
        this.log(` Mdulo regstrado: ${data.name}`);
    }

    handleModuleLoad(data) {
        this.log(` Mdulo carregado: ${data.name}`);
    }

    handleModuleError(data) {
        this.log(` Erro no mdulo ${data.name}: ${data.error.message}`);
    }

    handleSystemError(data) {
        this.log(` Erro no sstema: ${data.error.message}`);
    }

    handleNavgatonChange(data) {
        this.log(` Navegao alterada: ${JSON.strngfy(data.state)}`);
    }

    handlePageLoad(data) {
        this.log(` Pgna carregada: ${data.page}`);
    }

    /**
     * Tratamento de erros
     */
    handleError(context, error) {
        const errornfo = {
            context,
            message: error?.message || error,
            stack: error?.stack,
            tmestamp: new Date().toSOStrng()
        };

        console.error(` TokenCafe Error [${context}]:`, errornfo);
        
        if (this.eventBus) {
            this.eventBus.emt('ecosystem:error', errornfo);
        }
    }

    /**
     * Sstema de logs
     */
    log(message) {
        if (this.confg.debug) {
            console.log(` TokenCafe: ${message}`);
        }
    }

    /**
     * AP pblca
     */
    getModule(name) {
        const moduleConfg = this.modules.get(name);
        return moduleConfg?.nstance || null;
    }

    getSystem(name) {
        return this.systems.get(name) || null;
    }

    sReady() {
        return this.ntalzed;
    }

    getState(key) {
        return key ? this.state[key] : this.state;
    }

    setState(key, value) {
        this.state[key] = value;
    }
}

// nstnca global do ecossstema
wndow.TokenCafeApp = new TokenCafeApp();

// Compatbldade com cdgo legado
wndow.onTokenCafeReady = (callback) => {
    if (wndow.TokenCafeApp.sReady()) {
        callback();
    } else {
        wndow.TokenCafeApp.eventBus.once('ecosystem:ready', callback);
    }
};

// export para modulos ES6
if (typeof module !== 'undefned' && module.exports) {
    module.exports = TokenCafeApp;
}

