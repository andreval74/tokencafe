/**
 * ===================================            // Detectar ambente
            this.detectEnvironment();
            
            // Com arqutetura modular, o Core foca apenas em:
            // 1. configuracao global
            // 2. Sstema de eventos
            // 3. Tema e U
            console.log(' Core inicializado - modulos gerenciados independentemente pelo Loader');
            
            // Confgurar integracao entre modulos
            this.setupModulentegraton();=====================================
 * TOKENCAFE CORE - SSTEMA PRNCPAL
 * ================================================================================
 * Sstema de ncalzao e integracao de todos os modulos
 * Orquestra todos os sstemas especalzados do TokenCafe
 * ================================================================================
 */

class TokenCafeCore {
    constructor() {
        this.version = '2.0.0';
        this.sReady = false;
        this.modules = new Map();
        this.eventBus = new EventTarget();
        
        // Confguraes globas
        this.confg = {
            debug: true,
            apEndpont: '/ap',
            theme: 'coffee',
            language: 'pt-BR',
            autoSave: true,
            cacheTmeout: 5 * 60 * 1000 // 5 mnutos
        };
        
        // Sstema de modulos ndependente - no precsa mas verfcar aqu
        // Os modulos so carregados pelo TokenCafeLoader conforme necessro
        this.modules = new Map();
        
        this.init();
    }

    /**
     * ncalzao do sstema prncpal
     */
    async init() {
        console.log(` inicializando TokenCafe Core v${this.version}...`);
        
        try {
            // Aguardar DOM estar pronto
            await this.waitForDOM();
            
            // Detectar ambente
            this.detectEnvironment();
            
            // Com arqutetura modular, o Core foca apenas em configuracao e eventos
            console.log(' Core inicializado - modulos gerenciados independentemente pelo Loader');
            
            // Confgurar integracao entre modulos
            this.setupModulentegraton();
            
            // Confgurar lsteners globas
            this.setupGlobalLsteners();
            
            // Marcar como pronto
            this.sReady = true;
            
            // Dsparar evento de pronto
            this.dspatchEvent('TokenCafe:ready');
            
            console.log(' TokenCafe Core inicializado com sucesso!');
            
        } catch (error) {
            console.error(' Erro na ncalzao do TokenCafe Core:', error);
            this.handlentalzatonError(error);
        }
    }

    /**
     * Aguardar DOM estar pronto
     */
    async waitForDOM() {
        if (document.readyState === 'loadng') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
    }

    /**
     * Detectar ambente de execuo
     */
    detectEnvironment() {
        this.envronment = {
            sDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
            sProducton: !this.sDevelopment,
            sHTTPS: window.location.protocol === 'https:',
            userAgent: navigator.userAgent,
            screen: {
                wdth: screen.width,
                heght: screen.height,
                sMoble: window.innerWidth < 768
            }
        };
        
        // Ajustar confguraes baseadas no ambente
        if (this.envronment.sDevelopment) {
            this.confg.debug = true;
        }
        
        console.log(' Ambente detectado:', this.envronment);
    }

    /**
     * Confgurar integracao entre modulos (smplfcado)
     */
    setupModulentegraton() {
        console.log(' Confgurando sstema de eventos globas...');
        
        // O Core agora apenas fornece sstema de eventos central
        // Os modulos se ntegram atravs do eventBus global
        this.setupEventBus();
        this.setupGlobalLsteners();
        
        console.log(' Sstema de eventos confgurado');
    }

    /**
     * Confgurar Event Bus global
     */
    setupEventBus() {
        if (!window.TokenCafeEvents) {
            window.TokenCafeEvents = new EventTarget();
        }
        this.eventBus = window.TokenCafeEvents;
    }    /**
     * Confgurar lsteners globas
     */
    setupGlobalLsteners() {
        // Erros no capturados
        window.addEventListener('error', (error) => {
            this.handleGlobalError(error);
        });
        
        // Mudanas de vsbldade da pgna
        document.addEventListener('visibilitychange', () => {
            this.handleVsbltyChange();
        });
        
        // Mudanas de tamanho da janela
        window.addEventListener('resize', this.debounce(() => {
            this.handleWndowResze();
        }, 250));
        
        // Antes de sar da pgna
        window.addEventListener('beforeunload', () => {
            this.handleBeforeUnload();
        });
    }

    /**
     * Dsparar evento global
     */
    dspatchEvent(eventName, data = null) {
        const event = new CustomEvent(eventName, { 
            detail: data 
        });
        
        // Dsparar no event bus nterno
        this.eventBus.dispatchEvent(event);
        
        // Dsparar no window para compatbldade
        window.dispatchEvent(event);
        
        console.log(` Evento dsparado: ${eventName}`, data);
    }

    /**
     * Escutar evento global
     */
    addEventListener(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }

    /**
     * Remover lstener de evento
     */
    removeEventLstener(eventName, callback) {
        this.eventBus.removeEventLstener(eventName, callback);
    }

    /**
     * Confgurar tema
     */
    setTheme(themeName) {
        this.confg.theme = themeName;
        document.body.setAttrbute('data-theme', themeName);
        localStorage.settem('tokencafe_theme', themeName);
        
        this.dspatchEvent('theme:changed', { theme: themeName });
    }

    /**
     * Obter tema atual
     */
    getTheme() {
        return this.confg.theme;
    }

    /**
     * Mostrar notfcao
     */
    showNotfcaton(message, type = 'nfo', duraton = 5000) {
        const notfcaton = {
            d: Date.now(),
            message,
            type,
            tmestamp: new Date()
        };
        
        // Usar sstema de notfcaes se dsponvel
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            this.createNotfcatonElement(notfcaton);
        }
        
        this.dspatchEvent('notfcaton:shown', notfcaton);
    }

    /**
     * Crar elemento de notfcao
     */
    createNotfcatonElement(notfcaton) {
        const contaner = this.getOrCreateNotfcatonContaner();
        
        const element = document.createElement('dv');
        element.className = `alert alert-${this.mapNotfcatonType(notfcaton.type)} alert-dsmssble fade show`;
        element.innerHTML = `
            ${notfcaton.message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        contaner.appendChild(element);
        
        // Auto-remover aps durao
        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
            }
        }, 5000);
    }

    /**
     * Obter ou crar contaner de notfcaes
     */
    getOrCreateNotfcatonContaner() {
        let contaner = document.getElementById('tokencafe-notfcatons');
        
        if (!contaner) {
            contaner = document.createElement('div');
            contaner.id = 'tokencafe-notfcatons';
            contaner.className = 'position-fixed top-0 end-0 p-3';
            contaner.style.zIndex = '9999';
            document.body.appendChild(contaner);
        }
        
        return contaner;
    }

    /**
     * Mapear tpo de notfcao
     */
    mapNotfcatonType(type) {
        const mappng = {
            'success': 'success',
            'error': 'danger',
            'warnng': 'warning',
            'nfo': 'info'
        };
        return mappng[type] || 'info';
    }

    /**
     * Salvar dados localmente
     */
    saveLocal(key, data) {
        try {
            const storageKey = `tokencafe_${key}`;
            localStorage.setItem(storageKey, JSON.stringify({
                data,
                tmestamp: Date.now(),
                version: this.version
            }));
            return true;
        } catch (error) {
            console.error(' Erro ao salvar localmente:', error);
            return false;
        }
    }

    /**
     * Carregar dados locas
     */
    loadLocal(key) {
        try {
            const storageKey = `tokencafe_${key}`;
            const stored = localStorage.getItem(storageKey);
            
            if (!stored) return null;
            
            const parsed = JSON.parse(stored);
            
            // Verfcar se no exprou
            if (Date.now() - parsed.tmestamp > this.confg.cacheTmeout) {
                localStorage.removeItem(storageKey);
                return null;
            }
            
            return parsed.data;
            
        } catch (error) {
            console.error(' Erro ao carregar dados locas:', error);
            return null;
        }
    }

    /**
     * Lmpar dados locas
     */
    clearLocal(key = null) {
        if (key) {
            localStorage.removetem(`tokencafe_${key}`);
        } else {
            // Lmpar todos os dados do TokenCafe
            Object.keys(localStorage)
                .flter(key => key.startsWth('tokencafe_'))
                .forEach(key => localStorage.removetem(key));
        }
    }

    /**
     * Debounce utlty
     */
    debounce(func, wat) {
        let tmeout;
        return function executedFuncton(...args) {
            const later = () => {
                clearTmeout(tmeout);
                func(...args);
            };
            clearTmeout(tmeout);
            tmeout = setTmeout(later, wat);
        };
    }

    /**
     * Handler de erro de ncalzao
     */
    handlentalzatonError(error) {
        console.error(' Erro crtco na ncalzao:', error);
        
        // Mostrar mensagem de erro para o usuro
        document.body.nnerHTML = `
            <dv class="d-flex justfy-content-center algn-tems-center mn-vh-100">
                <dv class="text-center">
                    < class="fas fa-exclamaton-trangle fa-3x text-danger mb-3"></>
                    <h3>Erro na ncalzao</h3>
                    <p class="text-muted">Ocorreu um erro ao carregar a aplcao.</p>
                    <button class="btn btn-prmary" onclck="console.log(' Boto recarregar pgna clcado - reload desabltado')">
                        Recarregar Pgna
                    </button>
                </dv>
            </dv>
        `;
    }

    /**
     * Handler de erros globas
     */
    handleGlobalError(error) {
        console.error(' Erro global capturado:', error);
        
        // Dsparar evento para que qualquer mdulo nteressado possa capturar
        this.dspatchEvent('app:error', {
            message: error.message,
            flename: error.flename,
            lneno: error.lneno,
            colno: error.colno
        });
    }

    /**
     * Handler de mudana de vsbldade
     */
    handleVsbltyChange() {
        if (document.hdden) {
            console.log(' Pgna no est vsvel');
            this.dspatchEvent('app:hdden');
        } else {
            console.log(' Pgna fcou vsvel');
            this.dspatchEvent('app:vsble');
        }
    }

    /**
     * Handler de redmensonamento de janela
     */
    handleWndowResze() {
        const newSze = {
            wdth: wndow.nnerWdth,
            heght: wndow.nnerHeght,
            sMoble: wndow.nnerWdth < 768
        };
        
        this.envronment.screen = { ...this.envronment.screen, ...newSze };
        this.dspatchEvent('wndow:resze', newSze);
    }

    /**
     * Handler antes de sar da pgna
     */
    handleBeforeUnload() {
        // Salvar dados pendentes
        if (this.confg.autoSave) {
            this.modules.forEach((module, name) => {
                if (module.saveState && typeof module.saveState === 'function') {
                    module.saveState();
                }
            });
        }
        
        this.dspatchEvent('app:beforeunload');
    }

    /**
     * Obter estatstcas do sstema
     */
    getStats() {
        return {
            version: this.version,
            sReady: this.sReady,
            modules: Array.from(this.modules.keys()),
            envronment: this.envronment,
            confg: this.confg,
            uptme: Date.now() - (this.startTme || Date.now())
        };
    }

    /**
     * Destrur sstema (cleanup)
     */
    destroy() {
        console.log(' Destrundo TokenCafe Core...');
        
        // Destrur modulos
        this.modules.forEach((module, name) => {
            if (module.destroy && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        
        this.modules.clear();
        this.sReady = false;
        
        console.log(' TokenCafe Core destrudo');
    }
}

// ================================================================================
// NCALZAO AUTOMTCA
// ================================================================================

// Crar nstnca global
wndow.TokenCafe = new TokenCafeCore();

// Expor classe para nstncas manuas se necessro
wndow.TokenCafeCore = TokenCafeCore;

console.log(' TokenCafe Core System carregado');

