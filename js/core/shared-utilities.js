/**
 * ================================================================================
 * SHARED UTILITIES - BIBLIOTECA DE UTILITÁRIOS COMPARTILHADOS
 * ================================================================================
 * Utilitários comuns para todo o ecossistema TokenCafe
 * Evita duplicação de código e centraliza funcionalidades
 * ================================================================================
 */

class SharedUtilities {
    constructor() {
        this.debug = false;
    }

    // ============================================================================
    // UTILITÁRIOS DE PERFORMANCE
    // ============================================================================

    /**
     * Debounce - Atrasa execução de função
     */
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func.apply(this, args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(this, args);
        };
    }

    /**
     * Throttle - Limita execução de função
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Memoização - Cache de resultados
     */
    memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
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
    // UTILITÁRIOS DOM
    // ============================================================================

    /**
     * Seletor de elementos com cache
     */
    $(selector, context = document) {
        if (typeof selector === 'string') {
            return context.querySelector(selector);
        }
        return selector;
    }

    /**
     * Seletor múltiplo
     */
    $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * Criar elemento com atributos
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else if (key.startsWith('data-')) {
                element.setAttribute(key, value);
            } else {
                element[key] = value;
            }
        });

        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });

        return element;
    }

    /**
     * Adicionar event listener com cleanup automático
     */
    addEventListenerWithCleanup(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        
        return () => {
            element.removeEventListener(event, handler, options);
        };
    }

    /**
     * Verificar se elemento está visível
     */
    isElementVisible(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    /**
     * Scroll suave para elemento
     */
    scrollToElement(element, options = {}) {
        const defaultOptions = {
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
        };
        
        element.scrollIntoView({ ...defaultOptions, ...options });
    }

    // ============================================================================
    // UTILITÁRIOS DE VALIDAÇÃO
    // ============================================================================

    /**
     * Validar email
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Validar URL
     */
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Validar endereço Ethereum
     */
    isValidEthereumAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    /**
     * Validar número
     */
    isValidNumber(value, options = {}) {
        const num = parseFloat(value);
        if (isNaN(num)) return false;
        
        if (options.min !== undefined && num < options.min) return false;
        if (options.max !== undefined && num > options.max) return false;
        if (options.integer && !Number.isInteger(num)) return false;
        
        return true;
    }

    // ============================================================================
    // UTILITÁRIOS DE FORMATAÇÃO
    // ============================================================================

    /**
     * Formatar número com separadores
     */
    formatNumber(number, options = {}) {
        const defaults = {
            locale: 'pt-BR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        };
        
        return new Intl.NumberFormat(options.locale || defaults.locale, {
            ...defaults,
            ...options
        }).format(number);
    }

    /**
     * Formatar moeda
     */
    formatCurrency(amount, currency = 'BRL', locale = 'pt-BR') {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    /**
     * Formatar data
     */
    formatDate(date, options = {}) {
        const defaults = {
            locale: 'pt-BR',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };
        
        return new Intl.DateTimeFormat(options.locale || defaults.locale, {
            ...defaults,
            ...options
        }).format(new Date(date));
    }

    /**
     * Formatar tempo relativo
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} dia${days > 1 ? 's' : ''} atrás`;
        if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
        if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
        return 'Agora mesmo';
    }

    /**
     * Truncar texto
     */
    truncateText(text, maxLength, suffix = '...') {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Capitalizar primeira letra
     */
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    /**
     * Converter para slug
     */
    slugify(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }

    // ============================================================================
    // UTILITÁRIOS DE DADOS
    // ============================================================================

    /**
     * Deep clone de objeto
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
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
        const source = sources.shift();

        if (this.isObject(target) && this.isObject(source)) {
            for (const key in source) {
                if (this.isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    this.deepMerge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }

        return this.deepMerge(target, ...sources);
    }

    /**
     * Verificar se é objeto
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    /**
     * Obter valor aninhado de objeto
     */
    getNestedValue(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result === null || result === undefined || !(key in result)) {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result;
    }

    /**
     * Definir valor aninhado em objeto
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = obj;
        
        for (const key of keys) {
            if (!(key in current) || !this.isObject(current[key])) {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
        return obj;
    }

    // ============================================================================
    // UTILITÁRIOS DE ARRAY
    // ============================================================================

    /**
     * Remover duplicatas de array
     */
    unique(array, key = null) {
        if (key) {
            const seen = new Set();
            return array.filter(item => {
                const value = this.getNestedValue(item, key);
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
        return array.reduce((groups, item) => {
            const value = this.getNestedValue(item, key);
            if (!groups[value]) groups[value] = [];
            groups[value].push(item);
            return groups;
        }, {});
    }

    /**
     * Ordenar array por múltiplos critérios
     */
    sortBy(array, ...criteria) {
        return array.sort((a, b) => {
            for (const criterion of criteria) {
                let key, direction = 'asc';
                
                if (typeof criterion === 'string') {
                    key = criterion;
                } else {
                    key = criterion.key;
                    direction = criterion.direction || 'asc';
                }
                
                const aVal = this.getNestedValue(a, key);
                const bVal = this.getNestedValue(b, key);
                
                if (aVal < bVal) return direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    // ============================================================================
    // UTILITÁRIOS DE STORAGE
    // ============================================================================

    /**
     * Storage com expiração
     */
    setWithExpiry(key, value, ttl) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    /**
     * Obter do storage com verificação de expiração
     */
    getWithExpiry(key) {
        const itemStr = localStorage.getItem(key);
        if (!itemStr) return null;
        
        try {
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch {
            return null;
        }
    }

    // ============================================================================
    // UTILITÁRIOS DE PROMISE
    // ============================================================================

    /**
     * Delay com Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Retry com backoff exponencial
     */
    async retry(fn, options = {}) {
        const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;
        
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
     * Timeout para Promise
     */
    withTimeout(promise, ms) {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
        );
        
        return Promise.race([promise, timeout]);
    }

    // ============================================================================
    // UTILITÁRIOS DE NOTIFICAÇÃO
    // ============================================================================

    /**
     * Mostrar notificação toast
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = this.createElement('div', {
            className: `toast toast-${type}`,
            innerHTML: `
                <div class="toast-content">
                    <span class="toast-message">${message}</span>
                    <button class="toast-close">&times;</button>
                </div>
            `
        });

        document.body.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, duration);

        // Manual close
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });

        return toast;
    }

    // ============================================================================
    // UTILITÁRIOS DE DEBUG
    // ============================================================================

    /**
     * Log condicional
     */
    log(...args) {
        if (this.debug) {
            console.log('🔧 SharedUtilities:', ...args);
        }
    }

    /**
     * Ativar/desativar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
        return this;
    }

    /**
     * Medir performance de função
     */
    measurePerformance(fn, label = 'Function') {
        return (...args) => {
            const start = performance.now();
            const result = fn(...args);
            const end = performance.now();
            
            if (this.debug) {
                console.log(`⏱️ ${label}: ${(end - start).toFixed(2)}ms`);
            }
            
            return result;
        };
    }
}

// Disponibilizar globalmente
window.SharedUtilities = SharedUtilities;

// Export para módulos ES6
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SharedUtilities;
}