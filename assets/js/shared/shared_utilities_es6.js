/**
 * ================================================================================
 * SHARED UTILITIES - BIBLIOTECA UNIFICADA DE UTILITÁRIOS
 * ================================================================================
 * Utilitários comuns para todo o ecossistema TokenCafe
 * ARQUIVO ÚNICO - Centraliza todas as funções utilitárias
 *
 * CATEGORIAS:
 * - Performance (debounce, throttle, memoize)
 * - DOM (seletores, criação de elementos)
 * - Validação (email, URL, wallet)
 * - Formatação (números, datas, texto)
 * - HTTP (fetch com retry, timeout)
 * - Armazenamento (localStorage, cache)
 * - UI (notifications, modals, loading)
 * ================================================================================
 */

export class SharedUtilities {
  constructor() {
    this.debug = false;
    this.cache = new Map();
    this.activeRequests = new Map();
  }

  // ============================================================================
  // UTILITARIOS DE PERFORMANCE
  // ============================================================================

  /**
   * Debounce - Atrasa execucao de funcao
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
   * Throttle - Limita execucao de funcao
   */
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * Memoizacao - Cache de resultados de funcoes
   */
  memoize(func) {
    const cache = new Map();
    return function (...args) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func.apply(this, args);
      cache.set(key, result);
      return result;
    };
  }

  // ============================================================================
  // UTILITARIOS DE DOM
  // ============================================================================

  /**
   * Selecionar elemento do DOM
   */
  $(selector, context = document) {
    return context.querySelector(selector);
  }

  /**
   * Selecionar multiplos elementos do DOM
   */
  $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
  }

  /**
   * Criar elemento HTML
   */
  createElement(tag, attributes = {}, content = "") {
    const element = document.createElement(tag);

    Object.entries(attributes).forEach(([key, value]) => {
      if (key === "className") {
        element.className = value;
      } else if (key === "innerHTML") {
        element.innerHTML = value;
      } else if (key === "textContent") {
        element.textContent = value;
      } else if (key.startsWith("data-")) {
        element.setAttribute(key, value);
      } else {
        element[key] = value;
      }
    });

    if (content) {
      element.textContent = content;
    }

    return element;
  }

  /**
   * Adicionar event listener com cleanup automatico
   */
  addEventListenerWithCleanup(element, event, handler, options = {}) {
    element.addEventListener(event, handler, options);

    return () => {
      element.removeEventListener(event, handler, options);
    };
  }

  /**
   * Verificar se elemento esta visivel
   */
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && rect.right <= (window.innerWidth || document.documentElement.clientWidth);
  }

  // ============================================================================
  // UTILITARIOS DE STRING
  // ============================================================================

  /**
   * Capitalizar primeira letra
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Converter para camelCase
   */
  toCamelCase(str) {
    return str.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ""));
  }

  /**
   * Converter para kebab-case
   */
  toKebabCase(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
  }

  /**
   * Truncar string
   */
  truncate(str, length, suffix = "...") {
    if (str.length <= length) return str;
    return str.substring(0, length) + suffix;
  }

  /**
   * Remover acentos
   */
  removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  // ============================================================================
  // UTILITARIOS DE ARRAY
  // ============================================================================

  /**
   * Remover duplicatas de array
   */
  unique(array) {
    return [...new Set(array)];
  }

  /**
   * Agrupar array por propriedade
   */
  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key];
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  /**
   * Embaralhar array
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Dividir array em chunks
   */
  chunk(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // ============================================================================
  // UTILITARIOS DE OBJETO
  // ============================================================================

  /**
   * Deep clone de objeto
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item));
    if (typeof obj === "object") {
      const cloned = {};
      Object.keys(obj).forEach((key) => {
        cloned[key] = this.deepClone(obj[key]);
      });
      return cloned;
    }
  }

  /**
   * Merge profundo de objetos
   */
  deepMerge(target, source) {
    const result = { ...target };

    Object.keys(source).forEach((key) => {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });

    return result;
  }

  /**
   * Obter valor aninhado de objeto
   */
  getNestedValue(obj, path, defaultValue = undefined) {
    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  }

  // ============================================================================
  // UTILITARIOS DE VALIDACAO
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
   * Validar endereco Ethereum
   */
  isValidEthereumAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validar numero
   */
  isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  }

  // ============================================================================
  // UTILITARIOS DE FORMATACAO
  // ============================================================================

  /**
   * Formatar numero com separadores
   */
  formatNumber(num, decimals = 2, thousandsSep = ",", decimalSep = ".") {
    const number = parseFloat(num);
    if (isNaN(number)) return "0";

    const parts = number.toFixed(decimals).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);

    return parts.join(decimalSep);
  }

  /**
   * Formatar bytes
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  /**
   * Formatar tempo relativo
   */
  formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

    if (diffInSeconds < 60) return "agora";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutos atras`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} horas atras`;
    return `${Math.floor(diffInSeconds / 86400)} dias atras`;
  }

  /**
   * Formatar endereco Ethereum (truncado)
   */
  formatAddress(address, startChars = 6, endChars = 4) {
    if (!address) return "";
    if (address.length <= startChars + endChars) return address;

    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  // ============================================================================
  // UTILITARIOS DE STORAGE
  // ============================================================================

  /**
   * LocalStorage com JSON
   */
  setStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Erro ao salvar no localStorage:", error);
      return false;
    }
  }

  /**
   * Obter do LocalStorage
   */
  getStorage(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error("Erro ao ler do localStorage:", error);
      return defaultValue;
    }
  }

  /**
   * Remover do LocalStorage
   */
  removeStorage(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Erro ao remover do localStorage:", error);
      return false;
    }
  }

  // ============================================================================
  // UTILITARIOS DE REDE
  // ============================================================================

  /**
   * Fazer requisicao HTTP com timeout
   */
  async fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Retry de requisicao
   */
  async fetchWithRetry(url, options = {}, maxRetries = 3, delay = 1000) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await this.fetchWithTimeout(url, options);
        if (response.ok) return response;
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (i === maxRetries) throw error;
        await this.sleep(delay * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  // ============================================================================
  // UTILITARIOS GERAIS
  // ============================================================================

  /**
   * Sleep/delay
   */
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Gerar ID unico
   */
  generateId(prefix = "") {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix + timestamp + random;
  }

  /**
   * Copiar para clipboard
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textArea);
      return success;
    }
  }

  /**
   * Detectar dispositivo movel
   */
  isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * Obter informacoes do navegador
   */
  getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown";

    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";
    else if (ua.includes("Opera")) browser = "Opera";

    return {
      browser,
      userAgent: ua,
      isMobile: this.isMobile(),
    };
  }

  /**
   * Log com timestamp
   */
  log(...args) {
    if (this.debug) {
      console.log(`[${new Date().toISOString()}]`, ...args);
    }
  }

  /**
   * Ativar/desativar debug
   */
  setDebug(enabled) {
    this.debug = enabled;
  }
}

// Instancia global
window.SharedUtilities = SharedUtilities;

export default SharedUtilities;
