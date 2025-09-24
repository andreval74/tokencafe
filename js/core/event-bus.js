/**
 * ================================================================================
 * EVENT BUS - SISTEMA DE EVENTOS CENTRALIZADO
 * ================================================================================
 * Sistema de comunicação entre módulos do ecossistema TokenCafe
 * Implementa padrão Observer/Publisher-Subscriber
 * ================================================================================
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.maxListeners = 100;
        this.debug = false;
    }

    /**
     * Registrar listener para um evento
     */
    on(eventName, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma função');
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listeners = this.events.get(eventName);
        
        // Verificar limite de listeners
        if (listeners.length >= this.maxListeners) {
            console.warn(`⚠️ EventBus: Muitos listeners para evento '${eventName}' (${listeners.length})`);
        }

        listeners.push({ callback, context });
        
        if (this.debug) {
            console.log(`📡 EventBus: Listener registrado para '${eventName}'`);
        }

        return this;
    }

    /**
     * Registrar listener que executa apenas uma vez
     */
    once(eventName, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma função');
        }

        if (!this.onceEvents.has(eventName)) {
            this.onceEvents.set(eventName, []);
        }

        this.onceEvents.get(eventName).push({ callback, context });
        
        if (this.debug) {
            console.log(`📡 EventBus: Listener 'once' registrado para '${eventName}'`);
        }

        return this;
    }

    /**
     * Emitir evento
     */
    emit(eventName, data = null) {
        let listenersExecuted = 0;

        // Executar listeners normais
        if (this.events.has(eventName)) {
            const listeners = this.events.get(eventName);
            
            for (const listener of listeners) {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, data);
                    } else {
                        listener.callback(data);
                    }
                    listenersExecuted++;
                } catch (error) {
                    console.error(`❌ EventBus: Erro ao executar listener para '${eventName}':`, error);
                }
            }
        }

        // Executar listeners 'once' e removê-los
        if (this.onceEvents.has(eventName)) {
            const onceListeners = this.onceEvents.get(eventName);
            
            for (const listener of onceListeners) {
                try {
                    if (listener.context) {
                        listener.callback.call(listener.context, data);
                    } else {
                        listener.callback(data);
                    }
                    listenersExecuted++;
                } catch (error) {
                    console.error(`❌ EventBus: Erro ao executar listener 'once' para '${eventName}':`, error);
                }
            }
            
            // Remover listeners 'once' após execução
            this.onceEvents.delete(eventName);
        }

        if (this.debug && listenersExecuted > 0) {
            console.log(`📡 EventBus: Evento '${eventName}' emitido para ${listenersExecuted} listeners`);
        }

        return this;
    }

    /**
     * Remover listener específico
     */
    off(eventName, callback = null, context = null) {
        // Remover de eventos normais
        if (this.events.has(eventName)) {
            if (callback) {
                const listeners = this.events.get(eventName);
                const filteredListeners = listeners.filter(listener => 
                    listener.callback !== callback || 
                    (context && listener.context !== context)
                );
                
                if (filteredListeners.length === 0) {
                    this.events.delete(eventName);
                } else {
                    this.events.set(eventName, filteredListeners);
                }
            } else {
                this.events.delete(eventName);
            }
        }

        // Remover de eventos 'once'
        if (this.onceEvents.has(eventName)) {
            if (callback) {
                const listeners = this.onceEvents.get(eventName);
                const filteredListeners = listeners.filter(listener => 
                    listener.callback !== callback || 
                    (context && listener.context !== context)
                );
                
                if (filteredListeners.length === 0) {
                    this.onceEvents.delete(eventName);
                } else {
                    this.onceEvents.set(eventName, filteredListeners);
                }
            } else {
                this.onceEvents.delete(eventName);
            }
        }

        if (this.debug) {
            console.log(`📡 EventBus: Listener removido de '${eventName}'`);
        }

        return this;
    }

    /**
     * Remover todos os listeners
     */
    removeAllListeners(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
            this.onceEvents.delete(eventName);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }

        if (this.debug) {
            console.log(`📡 EventBus: Todos os listeners removidos${eventName ? ` de '${eventName}'` : ''}`);
        }

        return this;
    }

    /**
     * Listar eventos registrados
     */
    getEventNames() {
        const normalEvents = Array.from(this.events.keys());
        const onceEvents = Array.from(this.onceEvents.keys());
        return [...new Set([...normalEvents, ...onceEvents])];
    }

    /**
     * Contar listeners de um evento
     */
    listenerCount(eventName) {
        const normalCount = this.events.has(eventName) ? this.events.get(eventName).length : 0;
        const onceCount = this.onceEvents.has(eventName) ? this.onceEvents.get(eventName).length : 0;
        return normalCount + onceCount;
    }

    /**
     * Verificar se tem listeners para um evento
     */
    hasListeners(eventName) {
        return this.events.has(eventName) || this.onceEvents.has(eventName);
    }

    /**
     * Configurar limite máximo de listeners
     */
    setMaxListeners(max) {
        this.maxListeners = max;
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
     * Criar namespace para eventos
     */
    namespace(prefix) {
        return {
            on: (eventName, callback, context) => this.on(`${prefix}:${eventName}`, callback, context),
            once: (eventName, callback, context) => this.once(`${prefix}:${eventName}`, callback, context),
            emit: (eventName, data) => this.emit(`${prefix}:${eventName}`, data),
            off: (eventName, callback, context) => this.off(`${prefix}:${eventName}`, callback, context)
        };
    }

    /**
     * Middleware para interceptar eventos
     */
    use(middleware) {
        if (typeof middleware !== 'function') {
            throw new Error('Middleware deve ser uma função');
        }

        const originalEmit = this.emit.bind(this);
        
        this.emit = (eventName, data) => {
            try {
                const result = middleware(eventName, data);
                if (result !== false) {
                    return originalEmit(eventName, result || data);
                }
            } catch (error) {
                console.error('❌ EventBus: Erro no middleware:', error);
                return originalEmit(eventName, data);
            }
        };

        return this;
    }

    /**
     * Estatísticas do EventBus
     */
    getStats() {
        const normalEvents = this.events.size;
        const onceEvents = this.onceEvents.size;
        const totalListeners = Array.from(this.events.values()).reduce((sum, listeners) => sum + listeners.length, 0) +
                              Array.from(this.onceEvents.values()).reduce((sum, listeners) => sum + listeners.length, 0);

        return {
            totalEvents: normalEvents + onceEvents,
            normalEvents,
            onceEvents,
            totalListeners,
            maxListeners: this.maxListeners
        };
    }

    /**
     * Limpar recursos
     */
    destroy() {
        this.removeAllListeners();
        this.events = null;
        this.onceEvents = null;
    }
}

// Disponibilizar globalmente
window.EventBus = EventBus;

// Export para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
}