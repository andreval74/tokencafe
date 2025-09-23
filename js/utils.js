/**
 * TokenCafe Utilities - Funções utilitárias comuns
 * Centraliza funções reutilizáveis para evitar duplicação
 */

/**
 * Debounce - Atrasa a execução de uma função até que pare de ser chamada
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em milissegundos
 * @param {boolean} immediate - Se deve executar imediatamente na primeira chamada
 * @returns {Function} Função debounced
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle - Limita a execução de uma função a uma vez por período
 * @param {Function} func - Função a ser executada
 * @param {number} limit - Intervalo mínimo entre execuções em milissegundos
 * @returns {Function} Função throttled
 */
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function executedFunction(...args) {
        if (!lastRan) {
            func(...args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(() => {
                if ((Date.now() - lastRan) >= limit) {
                    func(...args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

/**
 * Formatadores de valores comuns
 */
const TokenCafeFormatters = {
    /**
     * Formatar endereço de carteira
     * @param {string} address - Endereço completo
     * @param {number} startChars - Caracteres do início (padrão: 6)
     * @param {number} endChars - Caracteres do fim (padrão: 4)
     * @returns {string} Endereço formatado
     */
    formatAddress: (address, startChars = 6, endChars = 4) => {
        if (!address || address.length < startChars + endChars) return address;
        return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
    },

    /**
     * Formatar valor de token com decimais
     * @param {string|number} value - Valor a formatar
     * @param {number} decimals - Número de decimais
     * @param {number} displayDecimals - Decimais para exibição
     * @returns {string} Valor formatado
     */
    formatTokenAmount: (value, decimals = 18, displayDecimals = 4) => {
        if (!value) return '0.0000';
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        const adjustedValue = numValue / Math.pow(10, decimals);
        return adjustedValue.toFixed(displayDecimals);
    },

    /**
     * Formatar timestamp para data legível
     * @param {number} timestamp - Timestamp em segundos ou milissegundos
     * @returns {string} Data formatada
     */
    formatDate: (timestamp) => {
        const date = new Date(timestamp < 1000000000000 ? timestamp * 1000 : timestamp);
        return date.toLocaleDateString('pt-BR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Formatar valor monetário
     * @param {number} value - Valor numérico
     * @param {string} currency - Código da moeda (padrão: USD)
     * @returns {string} Valor formatado
     */
    formatCurrency: (value, currency = 'USD') => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: currency === 'USD' ? 'USD' : 'BRL'
        }).format(value);
    }
};

/**
 * Validadores comuns
 */
const TokenCafeValidators = {
    /**
     * Validar endereço Ethereum
     * @param {string} address - Endereço a validar
     * @returns {boolean} True se válido
     */
    isValidEthAddress: (address) => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    },

    /**
     * Validar email
     * @param {string} email - Email a validar
     * @returns {boolean} True se válido
     */
    isValidEmail: (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * Validar URL
     * @param {string} url - URL a validar
     * @returns {boolean} True se válido
     */
    isValidUrl: (url) => {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
};

/**
 * Geradores de IDs e hashes
 */
const TokenCafeGenerators = {
    /**
     * Gerar ID único
     * @returns {string} ID único
     */
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Gerar hash simples de string
     * @param {string} str - String para hash
     * @returns {string} Hash gerado
     */
    simpleHash: (str) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
};

/**
 * Utilitários de DOM
 */
const TokenCafeDOMUtils = {
    /**
     * Esperar elemento aparecer no DOM
     * @param {string} selector - Seletor CSS
     * @param {number} timeout - Timeout em ms (padrão: 10000)
     * @returns {Promise<Element>} Promise que resolve com o elemento
     */
    waitForElement: (selector, timeout = 10000) => {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within timeout`));
            }, timeout);
        });
    },

    /**
     * Adicionar CSS dinâmico
     * @param {string} css - CSS a adicionar
     * @param {string} id - ID do elemento style (opcional)
     */
    addCSS: (css, id = null) => {
        const style = document.createElement('style');
        style.textContent = css;
        if (id) style.id = id;
        document.head.appendChild(style);
    },

    /**
     * Smooth scroll to element
     * @param {string|Element} target - Seletor ou elemento
     */
    scrollToElement: (target) => {
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
};

// Expor utilitários globalmente
window.TokenCafeUtils = {
    debounce,
    throttle,
    formatters: TokenCafeFormatters,
    validators: TokenCafeValidators,
    generators: TokenCafeGenerators,
    dom: TokenCafeDOMUtils
};

// Exportar funções individuais para compatibilidade
window.debounce = debounce;
window.throttle = throttle;

console.log('🛠️ TokenCafe Utils carregado');