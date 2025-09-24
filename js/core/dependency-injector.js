/**
 * ================================================================================
 * DEPENDENCY INJECTOR - SISTEMA DE INJEÇÃO DE DEPENDÊNCIAS
 * ================================================================================
 * Gerencia dependências entre módulos do ecossistema TokenCafe
 * Implementa padrão Dependency Injection
 * ================================================================================
 */

class DependencyInjector {
    constructor() {
        this.dependencies = new Map();
        this.singletons = new Map();
        this.factories = new Map();
        this.resolving = new Set();
        this.debug = false;
    }

    /**
     * Registrar dependência
     */
    register(name, factory, options = {}) {
        if (typeof factory !== 'function' && typeof factory !== 'object') {
            throw new Error('Factory deve ser uma função ou objeto');
        }

        const config = {
            factory,
            singleton: options.singleton || false,
            dependencies: options.dependencies || [],
            lazy: options.lazy || false,
            ...options
        };

        this.dependencies.set(name, config);
        
        if (this.debug) {
            console.log(`🔧 DI: Dependência '${name}' registrada`);
        }

        return this;
    }

    /**
     * Registrar singleton
     */
    singleton(name, factory, options = {}) {
        return this.register(name, factory, { ...options, singleton: true });
    }

    /**
     * Registrar factory
     */
    factory(name, factory, options = {}) {
        this.factories.set(name, { factory, options });
        return this;
    }

    /**
     * Resolver dependência
     */
    resolve(name) {
        if (this.resolving.has(name)) {
            throw new Error(`Dependência circular detectada: ${name}`);
        }

        // Verificar se é singleton já instanciado
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        const config = this.dependencies.get(name);
        if (!config) {
            throw new Error(`Dependência '${name}' não encontrada`);
        }

        this.resolving.add(name);

        try {
            // Resolver dependências recursivamente
            const resolvedDependencies = {};
            for (const depName of config.dependencies) {
                resolvedDependencies[depName] = this.resolve(depName);
            }

            let instance;

            if (typeof config.factory === 'function') {
                instance = config.factory(resolvedDependencies);
            } else {
                instance = config.factory;
            }

            // Armazenar singleton
            if (config.singleton) {
                this.singletons.set(name, instance);
            }

            this.resolving.delete(name);

            if (this.debug) {
                console.log(`🔧 DI: Dependência '${name}' resolvida`);
            }

            return instance;

        } catch (error) {
            this.resolving.delete(name);
            throw new Error(`Erro ao resolver dependência '${name}': ${error.message}`);
        }
    }

    /**
     * Resolver múltiplas dependências
     */
    resolveAll(names) {
        const resolved = {};
        for (const name of names) {
            resolved[name] = this.resolve(name);
        }
        return resolved;
    }

    /**
     * Obter dependências para um módulo específico
     */
    getDependencies(moduleName) {
        const moduleConfig = this.getModuleConfig(moduleName);
        const dependencies = {
            // Dependências padrão para todos os módulos
            eventBus: this.resolve('eventBus'),
            sharedUtilities: this.resolve('sharedUtilities'),
            logger: this.resolve('logger')
        };

        // Adicionar dependências específicas do módulo
        if (moduleConfig && moduleConfig.dependencies) {
            for (const depName of moduleConfig.dependencies) {
                dependencies[depName] = this.resolve(depName);
            }
        }

        return dependencies;
    }

    /**
     * Configuração de dependências por módulo
     */
    getModuleConfig(moduleName) {
        const moduleConfigs = {
            'tokens': {
                dependencies: ['walletSystem', 'analyticsSystem']
            },
            'profile': {
                dependencies: ['walletSystem', 'storageService']
            },
            'settings': {
                dependencies: ['storageService', 'themeService']
            },
            'templates': {
                dependencies: ['templateSystem', 'storageService']
            },
            'analytics': {
                dependencies: ['analyticsSystem', 'chartService']
            },
            'widgets': {
                dependencies: ['widgetSystem', 'templateSystem']
            }
        };

        return moduleConfigs[moduleName] || null;
    }

    /**
     * Verificar se dependência existe
     */
    has(name) {
        return this.dependencies.has(name) || this.singletons.has(name);
    }

    /**
     * Remover dependência
     */
    remove(name) {
        this.dependencies.delete(name);
        this.singletons.delete(name);
        this.factories.delete(name);
        
        if (this.debug) {
            console.log(`🔧 DI: Dependência '${name}' removida`);
        }

        return this;
    }

    /**
     * Limpar todas as dependências
     */
    clear() {
        this.dependencies.clear();
        this.singletons.clear();
        this.factories.clear();
        this.resolving.clear();
        
        if (this.debug) {
            console.log('🔧 DI: Todas as dependências removidas');
        }

        return this;
    }

    /**
     * Criar container filho
     */
    createChild() {
        const child = new DependencyInjector();
        
        // Herdar dependências do pai
        for (const [name, config] of this.dependencies) {
            child.dependencies.set(name, config);
        }
        
        // Herdar singletons do pai
        for (const [name, instance] of this.singletons) {
            child.singletons.set(name, instance);
        }

        return child;
    }

    /**
     * Registrar dependências padrão do TokenCafe
     */
    registerDefaults() {
        // Logger
        this.singleton('logger', () => ({
            log: (message) => console.log(`🌳 ${message}`),
            warn: (message) => console.warn(`⚠️ ${message}`),
            error: (message) => console.error(`❌ ${message}`)
        }));

        // Storage Service
        this.singleton('storageService', () => ({
            get: (key) => localStorage.getItem(key),
            set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
            remove: (key) => localStorage.removeItem(key),
            clear: () => localStorage.clear()
        }));

        // Theme Service
        this.singleton('themeService', (deps) => ({
            currentTheme: 'dark',
            setTheme: (theme) => {
                document.body.className = `theme-${theme}`;
                deps.storageService.set('theme', theme);
            },
            getTheme: () => deps.storageService.get('theme') || 'dark'
        }), { dependencies: ['storageService'] });

        // Chart Service
        this.singleton('chartService', () => ({
            createChart: (element, config) => {
                // Implementação de gráficos
                console.log('Chart created:', config);
            }
        }));

        // HTTP Client
        this.singleton('httpClient', () => ({
            get: async (url) => fetch(url).then(r => r.json()),
            post: async (url, data) => fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).then(r => r.json())
        }));

        if (this.debug) {
            console.log('🔧 DI: Dependências padrão registradas');
        }

        return this;
    }

    /**
     * Ativar/desativar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
        return this;
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        return {
            totalDependencies: this.dependencies.size,
            singletons: this.singletons.size,
            factories: this.factories.size,
            resolving: this.resolving.size
        };
    }

    /**
     * Listar dependências registradas
     */
    list() {
        return {
            dependencies: Array.from(this.dependencies.keys()),
            singletons: Array.from(this.singletons.keys()),
            factories: Array.from(this.factories.keys())
        };
    }

    /**
     * Validar configuração de dependências
     */
    validate() {
        const errors = [];

        for (const [name, config] of this.dependencies) {
            // Verificar dependências circulares
            try {
                this.checkCircularDependency(name, new Set());
            } catch (error) {
                errors.push(`Dependência circular em '${name}': ${error.message}`);
            }

            // Verificar se dependências existem
            for (const depName of config.dependencies) {
                if (!this.has(depName)) {
                    errors.push(`Dependência '${depName}' não encontrada para '${name}'`);
                }
            }
        }

        return errors;
    }

    /**
     * Verificar dependência circular
     */
    checkCircularDependency(name, visited) {
        if (visited.has(name)) {
            throw new Error(`Dependência circular detectada: ${Array.from(visited).join(' -> ')} -> ${name}`);
        }

        const config = this.dependencies.get(name);
        if (!config) return;

        visited.add(name);

        for (const depName of config.dependencies) {
            this.checkCircularDependency(depName, new Set(visited));
        }

        visited.delete(name);
    }

    /**
     * Limpar recursos
     */
    destroy() {
        this.clear();
        this.dependencies = null;
        this.singletons = null;
        this.factories = null;
        this.resolving = null;
    }
}

// Disponibilizar globalmente
window.DependencyInjector = DependencyInjector;

// Export para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DependencyInjector;
}