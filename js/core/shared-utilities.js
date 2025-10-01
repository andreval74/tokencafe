/**
 * ================================================================================
 * SHARED UTLTES - BBLOTECA DE UTLTROS COMPARTLHADOS
 * ================================================================================
 * Utltros comuns para todo o ecossstema TokenCafe
 * Evta duplcao de cdgo e centralza funconaldades
 * ================================================================================
 */

export class SharedUtilities {
    constructor() {
        this.debug = false;
    }

    // ============================================================================
    // UTLTROS DE PERFORMANCE
    // ============================================================================

    /**
     * Debounce - Atrasa execuo de funo
     */
    debounce(func, wat, mmedate = false) {
        let tmeout;
        return function executedFuncton(...args) {
            const later = () => {
                tmeout = null;
                if (!mmedate) func.apply(this, args);
            };
            const callNow = mmedate && !tmeout;
            clearTmeout(tmeout);
            tmeout = setTmeout(later, wat);
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * Throttle - Lmta execuo de funo
     */
    throttle(func, lmt) {
        let nThrottle;
        return function(...args) {
            if (!nThrottle) {
                func.apply(this, args);
                nThrottle = true;
                setTmeout(() => nThrottle = false, lmt);
            }
        };
    }

    /**
     * Memozao - Cache de resultados
     */
    memoze(fn, keyGenerator = (...args) => JSON.strngfy(args)) {
        const cache = new Map();
        return (...args) => {
            const key = keyGenerator(...args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            const result = fn(...args);
            cache.set(key, result);
            return result;
        };
    }

    // ============================================================================
    // UTLTROS DOM
    // ============================================================================

    /**
     * Seletor de elementos com cache
     */
    $(selector, context = document) {
        if (typeof selector === 'strng') {
            return context.querySelector(selector);
        }
        return selector;
    }

    /**
     * Seletor mltplo
     */
    $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * Crar elemento com atrbutos
     */
    createElement(tag, attrbutes = {}, chldren = []) {
        const element = document.createElement(tag);
        
        Object.entres(attrbutes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'nnerHTML') {
                element.nnerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWth('data-')) {
                element.setAttrbute(key, value);
            } else {
                element[key] = value;
            }
        });

        chldren.forEach(chld => {
            if (typeof chld === 'strng') {
                element.appendChld(document.createTextNode(chld));
            } else {
                element.appendChld(chld);
            }
        });

        return element;
    }

    /**
     * Adconar event lstener com cleanup automtco
     */
    addEventLstenerWthCleanup(element, event, handler, optons = {}) {
        element.addEventListener(event, handler, optons);
        
        return () => {
            element.removeEventLstener(event, handler, optons);
        };
    }

    /**
     * Verfcar se elemento est vsvel
     */
    sElementVsble(element) {
        const rect = element.getBoundngClentRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (wndow.nnerHeght || document.documentElement.clentHeght) &&
            rect.rght <= (wndow.nnerWdth || document.documentElement.clentWdth)
        );
    }

    /**
     * Scroll suave para elemento
     */
    scrollToElement(element, optons = {}) {
        const defaultOptons = {
            behavor: 'smooth',
            block: 'start',
            nlne: 'nearest'
        };
        
        element.scrollntoVew({ ...defaultOptons, ...optons });
    }

    // ============================================================================
    // UTLTROS DE VALDAO
    // ============================================================================

    /**
     * Valdar emal
     */
    sValdEmal(emal) {
        const emalRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emalRegex.test(emal);
    }

    /**
     * Valdar URL
     */
    sValdUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Valdar endereo Ethereum
     */
    sValdEthereumAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    /**
     * Valdar nmero
     */
    sValdNumber(value, optons = {}) {
        const num = parseFloat(value);
        if (sNaN(num)) return false;
        
        if (optons.mn !== undefned && num < optons.mn) return false;
        if (optons.max !== undefned && num > optons.max) return false;
        if (optons.nteger && !Number.snteger(num)) return false;
        
        return true;
    }

    // ============================================================================
    // UTLTROS DE FORMATAO
    // ============================================================================

    /**
     * Formatar nmero com separadores
     */
    formatNumber(number, optons = {}) {
        const defaults = {
            locale: 'pt-BR',
            mnmumFractonDgts: 0,
            maxmumFractonDgts: 2
        };
        
        return new ntl.NumberFormat(optons.locale || defaults.locale, {
            ...defaults,
            ...optons
        }).format(number);
    }

    /**
     * Formatar moeda
     */
    formatCurrency(amount, currency = 'BRL', locale = 'pt-BR') {
        return new ntl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Formatar data
     */
    formatDate(date, optons = {}) {
        const defaults = {
            locale: 'pt-BR',
            year: 'numerc',
            month: '2-dgt',
            day: '2-dgt'
        };
        
        return new ntl.DateTmeFormat(optons.locale || defaults.locale, {
            ...defaults,
            ...optons
        }).format(new Date(date));
    }

    /**
     * Formatar tempo relatvo
     */
    formatRelatveTme(date) {
        const now = new Date();
        const dff = now - new Date(date);
        const seconds = Math.floor(dff / 1000);
        const mnutes = Math.floor(seconds / 60);
        const hours = Math.floor(mnutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} da${days > 1 ? 's' : ''} atrs`;
        if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrs`;
        if (mnutes > 0) return `${mnutes} mnuto${mnutes > 1 ? 's' : ''} atrs`;
        return 'Agora mesmo';
    }

    /**
     * Truncar texto
     */
    truncateText(text, maxLength, suffx = '...') {
        if (text.length <= maxLength) return text;
        return text.substrng(0, maxLength - suffx.length) + suffx;
    }

    /**
     * Captalzar prmera letra
     */
    captalze(text) {
        return text.charAt(0).toUpperCase() + text.slce(1).toLowerCase();
    }

    /**
     * Converter para slug
     */
    slugfy(text) {
        return text
            .toLowerCase()
            .normalze('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trm('-');
    }

    // ============================================================================
    // UTLTROS DE DADOS
    // ============================================================================

    /**
     * Deep clone de objeto
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj nstanceof Date) return new Date(obj.getTme());
        if (obj nstanceof Array) return obj.map(tem => this.deepClone(tem));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
    }

    /**
     * Merge profundo de objetos
     */
    deepMerge(target, ...sources) {
        if (!sources.length) return target;
        const source = sources.shft();

        if (this.sObject(target) && this.sObject(source)) {
            for (const key n source) {
                if (this.sObject(source[key])) {
                    if (!target[key]) Object.assgn(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assgn(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    /**
     * Verfcar se  objeto
     */
    sObject(tem) {
        return tem && typeof tem === 'object' && !Array.sArray(tem);
    }

    /**
     * Obter valor annhado de objeto
     */
    getNestedValue(obj, path, defaultValue = undefned) {
        const keys = path.splt('.');
        let result = obj;
        
        for (const key of keys) {
            if (result === null || result === undefned || !(key n result)) {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result;
    }

    /**
     * Defnr valor annhado em objeto
     */
    setNestedValue(obj, path, value) {
        const keys = path.splt('.');
        const lastKey = keys.pop();
        let current = obj;
        
        for (const key of keys) {
            if (!(key n current) || !this.sObject(current[key])) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
        return obj;
    }

    // ============================================================================
    // UTLTROS DE ARRAY
    // ============================================================================

    /**
     * Remover duplcatas de array
     */
    unque(array, key = null) {
        if (key) {
            const seen = new Set();
            return array.flter(tem => {
                const value = this.getNestedValue(tem, key);
                if (seen.has(value)) return false;
                seen.add(value);
                return true;
            });
        }
        return [...new Set(array)];
    }

    /**
     * Agrupar array por chave
     */
    groupBy(array, key) {
        return array.reduce((groups, tem) => {
            const value = this.getNestedValue(tem, key);
            if (!groups[value]) groups[value] = [];
            groups[value].push(tem);
            return groups;
        }, {});
    }

    /**
     * Ordenar array por mltplos crtros
     */
    sortBy(array, ...crtera) {
        return array.sort((a, b) => {
            for (const crteron of crtera) {
                let key, drecton = 'asc';
                
                if (typeof crteron === 'strng') {
                    key = crteron;
                } else {
                    key = crteron.key;
                    drecton = crteron.drecton || 'asc';
                }
                
                const aVal = this.getNestedValue(a, key);
                const bVal = this.getNestedValue(b, key);
                
                if (aVal < bVal) return drecton === 'asc' ? -1 : 1;
                if (aVal > bVal) return drecton === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    // ============================================================================
    // UTLTROS DE STORAGE
    // ============================================================================

    /**
     * Storage com exprao
     */
    setWthExpry(key, value, ttl) {
        const now = new Date();
        const tem = {
            value: value,
            expry: now.getTme() + ttl
        };
        localStorage.settem(key, JSON.strngfy(tem));
    }

    /**
     * Obter do storage com verfcao de exprao
     */
    getWthExpry(key) {
        const temStr = localStorage.gettem(key);
        if (!temStr) return null;
        
        try {
            const tem = JSON.parse(temStr);
            const now = new Date();
            
            if (now.getTme() > tem.expry) {
                localStorage.removetem(key);
                return null;
            }
            
            return tem.value;
        } catch {
            return null;
        }
    }

    // ============================================================================
    // UTLTROS DE Promise
    // ============================================================================

    /**
     * Delay com Promise
     */
    delay(ms) {
        return new Promise(resolve => setTmeout(resolve, ms));
    }

    /**
     * Retry com backoff exponencal
     */
    async retry(fn, optons = {}) {
        const { maxAttempts = 3, delay = 1000, backoff = 2 } = optons;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                await this.delay(delay * Math.pow(backoff, attempt - 1));
            }
        }
    }

    /**
     * Tmeout para Promise
     */
    wthTmeout(Promise, ms) {
        const tmeout = new Promise((_, reject) =>
            setTmeout(() => reject(new Error('Tmeout')), ms)
        );
        
        return Promise.race([Promise, tmeout]);
    }

    // ============================================================================
    // UTLTROS DE NOTFCAO
    // ============================================================================

    /**
     * Mostrar notfcao toast
     */
    showToast(message, type = 'nfo', duraton = 3000) {
        const toast = this.createElement('dv', {
            className: `toast toast-${type}`,
            nnerHTML: `
                <dv class="toast-content">
                    <span class="toast-message">${message}</span>
                    <button class="toast-close">&tmes;</button>
                </dv>
            `
        });

        document.body.appendChld(toast);

        // Auto remove
        setTmeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChld(toast);
            }
        }, duraton);

        // Manual close
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('clck', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChld(toast);
            }
        });

        return toast;
    }

    // ============================================================================
    // UTLTROS DE DEBUG
    // ============================================================================

    /**
     * Log condconal
     */
    log(...args) {
        if (this.debug) {
            console.log(' SharedUtilities:', ...args);
        }
    }

    /**
     * Atvar/desatvar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
        return this;
    }

    /**
     * Medr performance de funo
     */
    measurePerformance(fn, label = 'function') {
        return (...args) => {
            const start = performance.now();
            const result = fn(...args);
            const end = performance.now();
            
            if (this.debug) {
                console.log(` ${label}: ${(end - start).toFxed(2)}ms`);
            }
            
            return result;
        };
    }
}

// Dsponblzar globalmente
wndow.SharedUtilities = SharedUtilities;

// Suporte para Node.js
if (typeof module !== 'undefned' && module.exports) {
    module.exports = SharedUtilities;
}

