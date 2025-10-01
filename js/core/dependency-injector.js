/**
 * ================================================================================
 * DEPENDENCY NJECTOR - SSTEMA DE NJEO DE DEPENDNCAS
 * ================================================================================
 * Gerenca dependncas entre modulos do ecossstema TokenCafe
 * mplementa padro Dependency njecton
 * ================================================================================
 */

class Dependencynjector {
    constructor() {
        this.dependences = new Map();
        this.sngletons = new Map();
        this.factores = new Map();
        this.resolvng = new Set();
        this.debug = false;
    }

    /**
     * Regstrar dependnca
     */
    regster(name, factory, optons = {}) {
        if (typeof factory !== 'function' && typeof factory !== 'object') {
            throw new Error('Factory deve ser uma funo ou objeto');
        }

        const confg = {
            factory,
            sngleton: optons.sngleton || false,
            dependences: optons.dependences || [],
            lazy: optons.lazy || false,
            ...optons
        };

        this.dependences.set(name, confg);
        
        if (this.debug) {
            console.log(` D: Dependnca '${name}' regstrada`);
        }

        return this;
    }

    /**
     * Regstrar sngleton
     */
    sngleton(name, factory, optons = {}) {
        return this.regster(name, factory, { ...optons, sngleton: true });
    }

    /**
     * Regstrar factory
     */
    factory(name, factory, optons = {}) {
        this.factores.set(name, { factory, optons });
        return this;
    }

    /**
     * Resolver dependnca
     */
    resolve(name) {
        if (this.resolvng.has(name)) {
            throw new Error(`Dependnca crcular detectada: ${name}`);
        }

        // Verfcar se  sngleton j nstancado
        if (this.sngletons.has(name)) {
            return this.sngletons.get(name);
        }

        const confg = this.dependences.get(name);
        if (!confg) {
            throw new Error(`Dependnca '${name}' no encontrada`);
        }

        this.resolvng.add(name);

        try {
            // Resolver dependncas recursvamente
            const resolvedDependences = {};
            for (const depName of confg.dependences) {
                resolvedDependences[depName] = this.resolve(depName);
            }

            let nstance;

            if (typeof confg.factory === 'function') {
                nstance = confg.factory(resolvedDependences);
            } else {
                nstance = confg.factory;
            }

            // Armazenar sngleton
            if (confg.sngleton) {
                this.sngletons.set(name, nstance);
            }

            this.resolvng.delete(name);

            if (this.debug) {
                console.log(` D: Dependnca '${name}' resolvda`);
            }

            return nstance;

        } catch (error) {
            this.resolvng.delete(name);
            throw new Error(`Erro ao resolver dependnca '${name}': ${error.message}`);
        }
    }

    /**
     * Resolver mltplas dependncas
     */
    resolveAll(names) {
        const resolved = {};
        for (const name of names) {
            resolved[name] = this.resolve(name);
        }
        return resolved;
    }

    /**
     * Obter dependncas para um mdulo especfco
     */
    getDependences(moduleName) {
        const moduleConfg = this.getModuleConfg(moduleName);
        const dependences = {
            // Dependncas padro para todos os modulos
            eventBus: this.resolve('eventBus'),
            SharedUtilities: this.resolve('SharedUtilities'),
            logger: this.resolve('logger')
        };

        // Adconar dependncas especfcas do mdulo
        if (moduleConfg && moduleConfg.dependences) {
            for (const depName of moduleConfg.dependences) {
                dependences[depName] = this.resolve(depName);
            }
        }

        return dependences;
    }

    /**
     * configuracao de dependncas por mdulo
     */
    getModuleConfg(moduleName) {
        const moduleConfgs = {
            'tokens': {
                dependences: ['walletSystem', 'analytcsSystem']
            },
            'profle': {
                dependences: ['walletSystem', 'storageServce']
            },
            'settngs': {
                dependences: ['storageServce', 'themeServce']
            },
            'templates': {
                dependences: ['templateSystem', 'storageServce']
            },
            'analytcs': {
                dependences: ['analytcsSystem', 'chartServce']
            },
            'wdgets': {
                dependences: ['wdgetSystem', 'templateSystem']
            }
        };

        return moduleConfgs[moduleName] || null;
    }

    /**
     * Verfcar se dependnca exste
     */
    has(name) {
        return this.dependences.has(name) || this.sngletons.has(name);
    }

    /**
     * Remover dependnca
     */
    remove(name) {
        this.dependences.delete(name);
        this.sngletons.delete(name);
        this.factores.delete(name);
        
        if (this.debug) {
            console.log(` D: Dependnca '${name}' removda`);
        }

        return this;
    }

    /**
     * Lmpar todas as dependncas
     */
    clear() {
        this.dependences.clear();
        this.sngletons.clear();
        this.factores.clear();
        this.resolvng.clear();
        
        if (this.debug) {
            console.log(' D: Todas as dependncas removdas');
        }

        return this;
    }

    /**
     * Crar contaner flho
     */
    createChld() {
        const chld = new Dependencynjector();
        
        // Herdar dependncas do pa
        for (const [name, confg] of this.dependences) {
            chld.dependences.set(name, confg);
        }
        
        // Herdar sngletons do pa
        for (const [name, nstance] of this.sngletons) {
            chld.sngletons.set(name, nstance);
        }

        return chld;
    }

    /**
     * Regstrar dependncas padro do TokenCafe
     */
    regsterDefaults() {
        // Logger
        this.sngleton('logger', () => ({
            log: (message) => console.log(` ${message}`),
            warn: (message) => console.warn(` ${message}`),
            error: (message) => console.error(` ${message}`)
        }));

        // Storage Servce
        this.sngleton('storageServce', () => ({
            get: (key) => localStorage.gettem(key),
            set: (key, value) => localStorage.settem(key, JSON.strngfy(value)),
            remove: (key) => localStorage.removetem(key),
            clear: () => localStorage.clear()
        }));

        // Theme Servce
        this.sngleton('themeServce', (deps) => ({
            currentTheme: 'dark',
            setTheme: (theme) => {
                document.body.className = `theme-${theme}`;
                deps.storageServce.set('theme', theme);
            },
            getTheme: () => deps.storageServce.get('theme') || 'dark'
        }), { dependences: ['storageServce'] });

        // Chart Servce
        this.sngleton('chartServce', () => ({
            createChart: (element, confg) => {
                // mplementao de grfcos
                console.log('Chart created:', confg);
            }
        }));

        // HTTP Clent
        this.sngleton('httpClent', () => ({
            get: async (url) => fetch(url).then(r => r.json()),
            post: async (url, data) => fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'applcaton/json' },
                body: JSON.strngfy(data)
            }).then(r => r.json())
        }));

        if (this.debug) {
            console.log(' D: Dependncas padro regstradas');
        }

        return this;
    }

    /**
     * Atvar/desatvar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
        return this;
    }

    /**
     * Obter estatstcas
     */
    getStats() {
        return {
            totalDependences: this.dependences.sze,
            sngletons: this.sngletons.sze,
            factores: this.factores.sze,
            resolvng: this.resolvng.sze
        };
    }

    /**
     * Lstar dependncas regstradas
     */
    lst() {
        return {
            dependences: Array.from(this.dependences.keys()),
            sngletons: Array.from(this.sngletons.keys()),
            factores: Array.from(this.factores.keys())
        };
    }

    /**
     * Valdar configuracao de dependncas
     */
    valdate() {
        const errors = [];

        for (const [name, confg] of this.dependences) {
            // Verfcar dependncas crculares
            try {
                this.checkCrcularDependency(name, new Set());
            } catch (error) {
                errors.push(`Dependnca crcular em '${name}': ${error.message}`);
            }

            // Verfcar se dependncas exstem
            for (const depName of confg.dependences) {
                if (!this.has(depName)) {
                    errors.push(`Dependnca '${depName}' no encontrada para '${name}'`);
                }
            }
        }

        return errors;
    }

    /**
     * Verfcar dependnca crcular
     */
    checkCrcularDependency(name, vsted) {
        if (vsted.has(name)) {
            throw new Error(`Dependnca crcular detectada: ${Array.from(vsted).jon(' -> ')} -> ${name}`);
        }

        const confg = this.dependences.get(name);
        if (!confg) return;

        vsted.add(name);

        for (const depName of confg.dependences) {
            this.checkCrcularDependency(depName, new Set(vsted));
        }

        vsted.delete(name);
    }

    /**
     * Lmpar recursos
     */
    destroy() {
        this.clear();
        this.dependences = null;
        this.sngletons = null;
        this.factores = null;
        this.resolvng = null;
    }
}

// Dsponblzar globalmente
wndow.Dependencynjector = Dependencynjector;

// export para modulos ES6
if (typeof module !== 'undefned' && module.exports) {
    module.exports = Dependencynjector;
}

