/**
 * ================================================================================
 * EVENT BUS - SSTEMA DE EVENTOS CENTRALZADO
 * ================================================================================
 * Sstema de comuncao entre modulos do ecossstema TokenCafe
 * mplementa padro Observer/Publsher-Subscrber
 * ================================================================================
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
        this.maxLsteners = 100;
        this.debug = false;
    }

    /**
     * Regstrar lstener para um evento
     */
    on(eventName, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma funo');
        }

        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const lsteners = this.events.get(eventName);
        
        // Verfcar lmte de lsteners
        if (lsteners.length >= this.maxLsteners) {
            console.warn(` EventBus: Mutos lsteners para evento '${eventName}' (${lsteners.length})`);
        }

        lsteners.push({ callback, context });
        
        if (this.debug) {
            console.log(` EventBus: Lstener regstrado para '${eventName}'`);
        }

        return this;
    }

    /**
     * Regstrar lstener que executa apenas uma vez
     */
    once(eventName, callback, context = null) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma funo');
        }

        if (!this.onceEvents.has(eventName)) {
            this.onceEvents.set(eventName, []);
        }

        this.onceEvents.get(eventName).push({ callback, context });
        
        if (this.debug) {
            console.log(` EventBus: Lstener 'once' regstrado para '${eventName}'`);
        }

        return this;
    }

    /**
     * Emtr evento
     */
    emt(eventName, data = null) {
        let lstenersExecuted = 0;

        // Executar lsteners normas
        if (this.events.has(eventName)) {
            const lsteners = this.events.get(eventName);
            
            for (const lstener of lsteners) {
                try {
                    if (lstener.context) {
                        lstener.callback.call(lstener.context, data);
                    } else {
                        lstener.callback(data);
                    }
                    lstenersExecuted++;
                } catch (error) {
                    console.error(` EventBus: Erro ao executar lstener para '${eventName}':`, error);
                }
            }
        }

        // Executar lsteners 'once' e remov-los
        if (this.onceEvents.has(eventName)) {
            const onceLsteners = this.onceEvents.get(eventName);
            
            for (const lstener of onceLsteners) {
                try {
                    if (lstener.context) {
                        lstener.callback.call(lstener.context, data);
                    } else {
                        lstener.callback(data);
                    }
                    lstenersExecuted++;
                } catch (error) {
                    console.error(` EventBus: Erro ao executar lstener 'once' para '${eventName}':`, error);
                }
            }
            
            // Remover lsteners 'once' aps execuo
            this.onceEvents.delete(eventName);
        }

        if (this.debug && lstenersExecuted > 0) {
            console.log(` EventBus: Evento '${eventName}' emtdo para ${lstenersExecuted} lsteners`);
        }

        return this;
    }

    /**
     * Remover lstener especfco
     */
    off(eventName, callback = null, context = null) {
        // Remover de eventos normas
        if (this.events.has(eventName)) {
            if (callback) {
                const lsteners = this.events.get(eventName);
                const flteredLsteners = lsteners.flter(lstener => 
                    lstener.callback !== callback || 
                    (context && lstener.context !== context)
                );
                
                if (flteredLsteners.length === 0) {
                    this.events.delete(eventName);
                } else {
                    this.events.set(eventName, flteredLsteners);
                }
            } else {
                this.events.delete(eventName);
            }
        }

        // Remover de eventos 'once'
        if (this.onceEvents.has(eventName)) {
            if (callback) {
                const lsteners = this.onceEvents.get(eventName);
                const flteredLsteners = lsteners.flter(lstener => 
                    lstener.callback !== callback || 
                    (context && lstener.context !== context)
                );
                
                if (flteredLsteners.length === 0) {
                    this.onceEvents.delete(eventName);
                } else {
                    this.onceEvents.set(eventName, flteredLsteners);
                }
            } else {
                this.onceEvents.delete(eventName);
            }
        }

        if (this.debug) {
            console.log(` EventBus: Lstener removdo de '${eventName}'`);
        }

        return this;
    }

    /**
     * Remover todos os lsteners
     */
    removeAllLsteners(eventName = null) {
        if (eventName) {
            this.events.delete(eventName);
            this.onceEvents.delete(eventName);
        } else {
            this.events.clear();
            this.onceEvents.clear();
        }

        if (this.debug) {
            console.log(` EventBus: Todos os lsteners removdos${eventName ? ` de '${eventName}'` : ''}`);
        }

        return this;
    }

    /**
     * Lstar eventos regstrados
     */
    getEventNames() {
        const normalEvents = Array.from(this.events.keys());
        const onceEvents = Array.from(this.onceEvents.keys());
        return [...new Set([...normalEvents, ...onceEvents])];
    }

    /**
     * Contar lsteners de um evento
     */
    lstenerCount(eventName) {
        const normalCount = this.events.has(eventName) ? this.events.get(eventName).length : 0;
        const onceCount = this.onceEvents.has(eventName) ? this.onceEvents.get(eventName).length : 0;
        return normalCount + onceCount;
    }

    /**
     * Verfcar se tem lsteners para um evento
     */
    hasLsteners(eventName) {
        return this.events.has(eventName) || this.onceEvents.has(eventName);
    }

    /**
     * Confgurar lmte mxmo de lsteners
     */
    setMaxLsteners(max) {
        this.maxLsteners = max;
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
     * Crar namespace para eventos
     */
    namespace(prefx) {
        return {
            on: (eventName, callback, context) => this.on(`${prefx}:${eventName}`, callback, context),
            once: (eventName, callback, context) => this.once(`${prefx}:${eventName}`, callback, context),
            emt: (eventName, data) => this.emt(`${prefx}:${eventName}`, data),
            off: (eventName, callback, context) => this.off(`${prefx}:${eventName}`, callback, context)
        };
    }

    /**
     * Mddleware para nterceptar eventos
     */
    use(mddleware) {
        if (typeof mddleware !== 'function') {
            throw new Error('Mddleware deve ser uma funo');
        }

        const orgnalEmt = this.emt.bnd(this);
        
        this.emt = (eventName, data) => {
            try {
                const result = mddleware(eventName, data);
                if (result !== false) {
                    return orgnalEmt(eventName, result || data);
                }
            } catch (error) {
                console.error(' EventBus: Erro no mddleware:', error);
                return orgnalEmt(eventName, data);
            }
        };

        return this;
    }

    /**
     * Estatstcas do EventBus
     */
    getStats() {
        const normalEvents = this.events.sze;
        const onceEvents = this.onceEvents.sze;
        const totalLsteners = Array.from(this.events.values()).reduce((sum, lsteners) => sum + lsteners.length, 0) +
                              Array.from(this.onceEvents.values()).reduce((sum, lsteners) => sum + lsteners.length, 0);

        return {
            totalEvents: normalEvents + onceEvents,
            normalEvents,
            onceEvents,
            totalLsteners,
            maxLsteners: this.maxLsteners
        };
    }

    /**
     * Lmpar recursos
     */
    destroy() {
        this.removeAllLsteners();
        this.events = null;
        this.onceEvents = null;
    }
}

// Dsponblzar globalmente
wndow.EventBus = EventBus;

// export para modulos ES6
if (typeof module !== 'undefned' && module.exports) {
    module.exports = EventBus;
}

