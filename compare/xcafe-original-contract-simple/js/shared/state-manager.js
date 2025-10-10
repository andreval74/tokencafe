/**
 * Gerenciador de Estado Centralizado
 * Gerencia estado da aplicação de forma consistente
 */

class StateManager {
    constructor() {
        this.state = {
            wallet: {
                connected: false,
                address: null,
                network: null
            },
            token: {
                data: null,
                deployInProgress: false,
                deployResult: null
            },
            ui: {
                currentSection: 'wallet',
                completedSections: new Set(),
                loading: false
            }
        };
        
        this.listeners = new Map();
        this.storageKey = 'xcafe-state';
        
        // Restaurar estado salvo
        this.loadFromStorage();
        
        console.log('🗄️ StateManager inicializado');
    }

    // ==================== GESTÃO DE ESTADO ====================
    
    /**
     * Atualiza o estado e notifica listeners
     * @param {string} key Caminho do estado (ex: 'wallet.connected')
     * @param {any} value Novo valor
     */
    setState(key, value) {
        const keys = key.split('.');
        let current = this.state;
        
        // Navegar até o penúltimo nível
        for (let i = 0; i < keys.length - 1; i++) {
            if (!current[keys[i]]) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        // Definir valor
        const lastKey = keys[keys.length - 1];
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        // Notificar listeners
        this.notifyListeners(key, value, oldValue);
        
        // Salvar no storage
        this.saveToStorage();
        
        console.log(`🔄 Estado atualizado: ${key} = `, value);
    }

    /**
     * Obtém valor do estado
     * @param {string} key Caminho do estado
     * @returns {any} Valor do estado
     */
    getState(key) {
        const keys = key.split('.');
        let current = this.state;
        
        for (const k of keys) {
            if (current === null || current === undefined) return undefined;
            current = current[k];
        }
        
        return current;
    }

    /**
     * Reseta seção específica do estado
     * @param {string} section Seção para resetar
     */
    resetSection(section) {
        if (section === 'wallet') {
            this.state.wallet = {
                connected: false,
                address: null,
                network: null
            };
        } else if (section === 'token') {
            this.state.token = {
                data: null,
                deployInProgress: false,
                deployResult: null
            };
        } else if (section === 'ui') {
            this.state.ui = {
                currentSection: 'wallet',
                completedSections: new Set(),
                loading: false
            };
        }
        
        this.saveToStorage();
        console.log(`🧹 Seção ${section} resetada`);
    }

    // ==================== LISTENERS ====================
    
    /**
     * Adiciona listener para mudanças de estado
     * @param {string} key Caminho do estado
     * @param {function} callback Função callback
     * @returns {function} Função para remover listener
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, new Set());
        }
        
        this.listeners.get(key).add(callback);
        
        // Retornar função de unsubscribe
        return () => {
            this.listeners.get(key)?.delete(callback);
        };
    }

    /**
     * Notifica listeners sobre mudanças
     * @param {string} key Chave alterada
     * @param {any} newValue Novo valor
     * @param {any} oldValue Valor anterior
     */
    notifyListeners(key, newValue, oldValue) {
        const keyListeners = this.listeners.get(key);
        if (keyListeners) {
            keyListeners.forEach(callback => {
                try {
                    callback(newValue, oldValue, key);
                } catch (error) {
                    console.error(`Erro em listener para ${key}:`, error);
                }
            });
        }

        // Notificar listeners de chaves pai
        const keys = key.split('.');
        for (let i = 1; i < keys.length; i++) {
            const parentKey = keys.slice(0, i).join('.');
            const parentListeners = this.listeners.get(parentKey);
            if (parentListeners) {
                parentListeners.forEach(callback => {
                    try {
                        callback(this.getState(parentKey), undefined, parentKey);
                    } catch (error) {
                        console.error(`Erro em parent listener para ${parentKey}:`, error);
                    }
                });
            }
        }
    }

    // ==================== PERSISTÊNCIA ====================
    
    /**
     * Salva estado no localStorage
     */
    saveToStorage() {
        try {
            const stateToSave = {
                ...this.state,
                ui: {
                    ...this.state.ui,
                    completedSections: Array.from(this.state.ui.completedSections)
                }
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(stateToSave));
        } catch (error) {
            console.warn('Erro ao salvar estado:', error);
        }
    }

    /**
     * Carrega estado do localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const parsedState = JSON.parse(saved);
                
                // Restaurar Set de seções completas
                if (parsedState.ui?.completedSections) {
                    parsedState.ui.completedSections = new Set(parsedState.ui.completedSections);
                }
                
                this.state = { ...this.state, ...parsedState };
                console.log('📂 Estado restaurado do storage');
            }
        } catch (error) {
            console.warn('Erro ao carregar estado:', error);
        }
    }

    /**
     * Limpa estado salvo
     */
    clearStorage() {
        try {
            localStorage.removeItem(this.storageKey);
            console.log('🗑️ Estado limpo do storage');
        } catch (error) {
            console.warn('Erro ao limpar estado:', error);
        }
    }

    // ==================== MÉTODOS DE CONVENIÊNCIA ====================
    
    /**
     * Marca seção como completa
     * @param {string} section Nome da seção
     */
    markSectionComplete(section) {
        this.state.ui.completedSections.add(section);
        this.saveToStorage();
        this.notifyListeners('ui.completedSections', this.state.ui.completedSections, undefined);
    }

    /**
     * Verifica se seção está completa
     * @param {string} section Nome da seção
     * @returns {boolean} True se completa
     */
    isSectionComplete(section) {
        return this.state.ui.completedSections.has(section);
    }

    /**
     * Obtém estado completo (para debug)
     * @returns {Object} Estado completo
     */
    getFullState() {
        return JSON.parse(JSON.stringify({
            ...this.state,
            ui: {
                ...this.state.ui,
                completedSections: Array.from(this.state.ui.completedSections)
            }
        }));
    }
}

// Instância global
const stateManager = new StateManager();

// Log de inicialização
console.log('🗄️ StateManager disponível globalmente');

// Exportar para uso global
window.StateManager = StateManager;
window.stateManager = stateManager;
