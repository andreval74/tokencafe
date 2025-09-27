/**
 * ================================================================================
 * SHARED UTILITIES - BIBLIOTECA DE UTILITÁRIOS COMPARTILHADOS (ES6)
 * ================================================================================
 * Utilitários comuns para todo o ecossistema TokenCafe
 * Evita duplicação de código e centraliza funcionalidades
 * ================================================================================
 */

export class SharedUtilities {
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
        }
    }

    /**
     * Memoização - Cache de resultados de função
     */
    memoize(fn, keyGenerator = (...args) => JSON.stringify(args)) {
        const cache = new Map();
        return function(...args) {
            const key = keyGenerator(...args);
            if (cache.has(key)) {
                return cache.get(key);
            }
            const result = fn.apply(this, args);
            cache.set(key, result);
            return result;
        };
    }

    // ============================================================================
    // UTILITÁRIOS DOM
    // ============================================================================

    /**
     * Seletor jQuery-like
     */
    $(selector, context = document) {
        if (typeof selector === 'string') {
            return context.querySelector(selector);
        }
        return selector;
    }

    /**
     * Seletor múltiplo jQuery-like
     */
    $$(selector, context = document) {
        return Array.from(context.querySelectorAll(selector));
    }

    /**
     * Criar elemento com atributos e filhos
     */
    createElement(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        
        // Adicionar atributos
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'innerHTML') {
                element.innerHTML = value;
            } else if (key === 'textContent') {
                element.textContent = value;
            } else {
                element.setAttribute(key, value);
            }
        });
        
        // Adicionar filhos
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
        return () => element.removeEventListener(event, handler, options);
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
    // VALIDAÇÕES
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
        const num = Number(value);
        if (isNaN(num)) return false;
        if (options.min !== undefined && num < options.min) return false;
        if (options.max !== undefined && num > options.max) return false;
        if (options.integer && !Number.isInteger(num)) return false;
        return true;
    }

    // ============================================================================
    // FORMATAÇÃO
    // ============================================================================

    /**
     * Formatar endereço Ethereum (truncar)
     */
    formatAddress(address, startChars = 6, endChars = 4) {
        if (!address) return '';
        if (address.length <= startChars + endChars) return address;
        return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
    }

    /**
     * Formatar número
     */
    formatNumber(number, options = {}) {
        const defaultOptions = {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
            locale: 'pt-BR'
        };
        return new Intl.NumberFormat(options.locale || defaultOptions.locale, {
            ...defaultOptions,
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
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            locale: 'pt-BR'
        };
        const finalOptions = { ...defaultOptions, ...options };
        const locale = finalOptions.locale;
        delete finalOptions.locale;
        
        return new Intl.DateTimeFormat(locale, finalOptions).format(new Date(date));
    }

    /**
     * Formatar tempo relativo
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
        
        if (diffInSeconds < 60) return 'agora mesmo';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutos atrás`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atrás`;
        return `${Math.floor(diffInSeconds / 86400)} dias atrás`;
    }

    /**
     * Truncar texto
     */
    truncateText(text, maxLength, suffix = '...') {
        return text.length > maxLength ? text.substring(0, maxLength) + suffix : text;
    }

    /**
     * Capitalizar primeira letra
     */
    capitalize(text) {
        return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    }

    /**
     * Criar slug
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
    // UTILITÁRIOS DE OBJETO
    // ============================================================================

    /**
     * Deep clone de objeto
     */
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    }

    /**
     * Deep merge de objetos
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
     * Obter valor aninhado
     */
    getNestedValue(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let result = obj;
        
        for (const key of keys) {
            if (result == null || typeof result !== 'object') {
                return defaultValue;
            }
            result = result[key];
        }
        
        return result !== undefined ? result : defaultValue;
    }

    /**
     * Definir valor aninhado
     */
    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = obj;
        
        for (const key of keys) {
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        current[lastKey] = value;
    }

    // ============================================================================
    // UTILITÁRIOS DE ARRAY
    // ============================================================================

    /**
     * Remover duplicatas de array
     */
    unique(array, key = null) {
        if (!key) {
            return [...new Set(array)];
        }
        
        const seen = new Set();
        return array.filter(item => {
            const keyValue = typeof key === 'function' ? key(item) : item[key];
            if (seen.has(keyValue)) {
                return false;
            }
            seen.add(keyValue);
            return true;
        });
    }

    /**
     * Agrupar array por chave
     */
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const keyValue = typeof key === 'function' ? key(item) : item[key];
            if (!groups[keyValue]) {
                groups[keyValue] = [];
            }
            groups[keyValue].push(item);
            return groups;
        }, {});
    }

    /**
     * Ordenar array por múltiplos critérios
     */
    sortBy(array, ...criteria) {
        return array.sort((a, b) => {
            for (const criterion of criteria) {
                let aVal, bVal, desc = false;
                
                if (typeof criterion === 'string') {
                    if (criterion.startsWith('-')) {
                        desc = true;
                        aVal = a[criterion.slice(1)];
                        bVal = b[criterion.slice(1)];
                    } else {
                        aVal = a[criterion];
                        bVal = b[criterion];
                    }
                } else if (typeof criterion === 'function') {
                    aVal = criterion(a);
                    bVal = criterion(b);
                }
                
                if (aVal < bVal) return desc ? 1 : -1;
                if (aVal > bVal) return desc ? -1 : 1;
            }
            return 0;
        });
    }

    // ============================================================================
    // UTILITÁRIOS DE STORAGE
    // ============================================================================

    /**
     * LocalStorage com expiração
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
     * Obter do localStorage com verificação de expiração
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
            localStorage.removeItem(key);
            return null;
        }
    }

    // ============================================================================
    // UTILITÁRIOS ASSÍNCRONOS
    // ============================================================================

    /**
     * Delay assíncrono
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
     * Promise com timeout
     */
    withTimeout(promise, ms) {
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), ms)
        );
        return Promise.race([promise, timeout]);
    }

    // ============================================================================
    // UTILITÁRIOS DE UI
    // ============================================================================

    /**
     * Mostrar toast/notificação
     */
    showToast(message, type = 'info', duration = 3000) {
        // Remover toasts existentes
        const existingToasts = document.querySelectorAll('.toast-notification');
        existingToasts.forEach(toast => toast.remove());

        const toast = this.createElement('div', {
            className: `toast-notification toast-${type}`,
            innerHTML: message
        });

        // Estilos inline para garantir funcionamento
        Object.assign(toast.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '4px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            opacity: '0',
            transform: 'translateX(100%)',
            transition: 'all 0.3s ease'
        });

        // Cores por tipo
        const colors = {
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107',
            info: '#17a2b8'
        };
        toast.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(toast);

        // Animação de entrada
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);

        // Remover após duração
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // ============================================================================
    // UTILITÁRIOS DE DEBUG
    // ============================================================================

    /**
     * Log condicional
     */
    log(...args) {
        if (this.debug) {
            console.log('[SharedUtilities]', ...args);
        }
    }

    /**
     * Ativar/desativar debug
     */
    setDebug(enabled) {
        this.debug = enabled;
        this.log('Debug mode:', enabled ? 'enabled' : 'disabled');
    }

    /**
     * Medir performance de função
     */
    measurePerformance(fn, label = 'Function') {
        return async (...args) => {
            const start = performance.now();
            const result = await fn(...args);
            const end = performance.now();
            this.log(`${label} took ${end - start} milliseconds`);
            return result;
        };
    }
}

// Disponibilizar globalmente para compatibilidade
if (typeof window !== 'undefined') {
    window.SharedUtilities = SharedUtilities;
}