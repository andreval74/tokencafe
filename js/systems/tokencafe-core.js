/**
 * ===================================            // Detectar ambiente
            this.detectEnvironment();
            
            // Com arquitetura modular, o Core foca apenas em:
            // 1. Configuração global
            // 2. Sistema de eventos
            // 3. Tema e UI
            console.log('📦 Core inicializado - módulos gerenciados independentemente pelo Loader');
            
            // Configurar integração entre módulos
            this.setupModuleIntegration();=====================================
 * TOKENCAFE CORE - SISTEMA PRINCIPAL
 * ================================================================================
 * Sistema de inicialização e integração de todos os módulos
 * Orquestra todos os sistemas especializados do TokenCafe
 * ================================================================================
 */

class TokenCafeCore {
    constructor() {
        this.version = '2.0.0';
        this.isReady = false;
        this.modules = new Map();
        this.eventBus = new EventTarget();
        
        // Configurações globais
        this.config = {
            debug: true,
            apiEndpoint: '/api',
            theme: 'coffee',
            language: 'pt-BR',
            autoSave: true,
            cacheTimeout: 5 * 60 * 1000 // 5 minutos
        };
        
        // Sistema de módulos independente - não precisa mais verificar aqui
        // Os módulos são carregados pelo TokenCafeLoader conforme necessário
        this.modules = new Map();
        
        this.init();
    }

    /**
     * Inicialização do sistema principal
     */
    async init() {
        console.log(`🚀 Inicializando TokenCafe Core v${this.version}...`);
        
        try {
            // Aguardar DOM estar pronto
            await this.waitForDOM();
            
            // Detectar ambiente
            this.detectEnvironment();
            
            // Com arquitetura modular, o Core foca apenas em configuração e eventos
            console.log('📦 Core inicializado - módulos gerenciados independentemente pelo Loader');
            
            // Configurar integração entre módulos
            this.setupModuleIntegration();
            
            // Configurar listeners globais
            this.setupGlobalListeners();
            
            // Marcar como pronto
            this.isReady = true;
            
            // Disparar evento de pronto
            this.dispatchEvent('TokenCafe:ready');
            
            console.log('✅ TokenCafe Core inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização do TokenCafe Core:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Aguardar DOM estar pronto
     */
    async waitForDOM() {
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }
    }

    /**
     * Detectar ambiente de execução
     */
    detectEnvironment() {
        this.environment = {
            isDevelopment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
            isProduction: !this.isDevelopment,
            isHTTPS: window.location.protocol === 'https:',
            userAgent: navigator.userAgent,
            screen: {
                width: screen.width,
                height: screen.height,
                isMobile: window.innerWidth < 768
            }
        };
        
        // Ajustar configurações baseadas no ambiente
        if (this.environment.isDevelopment) {
            this.config.debug = true;
        }
        
        console.log('🌍 Ambiente detectado:', this.environment);
    }

    /**
     * Configurar integração entre módulos (simplificado)
     */
    setupModuleIntegration() {
        console.log('🔗 Configurando sistema de eventos globais...');
        
        // O Core agora apenas fornece sistema de eventos central
        // Os módulos se integram através do eventBus global
        this.setupEventBus();
        this.setupGlobalListeners();
        
        console.log('✅ Sistema de eventos configurado');
    }

    /**
     * Configurar Event Bus global
     */
    setupEventBus() {
        if (!window.TokenCafeEvents) {
            window.TokenCafeEvents = new EventTarget();
        }
        this.eventBus = window.TokenCafeEvents;
    }    /**
     * Configurar listeners globais
     */
    setupGlobalListeners() {
        // Erros não capturados
        window.addEventListener('error', (error) => {
            this.handleGlobalError(error);
        });
        
        // Mudanças de visibilidade da página
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
        
        // Mudanças de tamanho da janela
        window.addEventListener('resize', this.debounce(() => {
            this.handleWindowResize();
        }, 250));
        
        // Antes de sair da página
        window.addEventListener('beforeunload', () => {
            this.handleBeforeUnload();
        });
    }

    /**
     * Disparar evento global
     */
    dispatchEvent(eventName, data = null) {
        const event = new CustomEvent(eventName, { 
            detail: data 
        });
        
        // Disparar no event bus interno
        this.eventBus.dispatchEvent(event);
        
        // Disparar no window para compatibilidade
        window.dispatchEvent(event);
        
        console.log(`📢 Evento disparado: ${eventName}`, data);
    }

    /**
     * Escutar evento global
     */
    addEventListener(eventName, callback) {
        this.eventBus.addEventListener(eventName, callback);
    }

    /**
     * Remover listener de evento
     */
    removeEventListener(eventName, callback) {
        this.eventBus.removeEventListener(eventName, callback);
    }

    /**
     * Configurar tema
     */
    setTheme(themeName) {
        this.config.theme = themeName;
        document.body.setAttribute('data-theme', themeName);
        localStorage.setItem('tokencafe_theme', themeName);
        
        this.dispatchEvent('theme:changed', { theme: themeName });
    }

    /**
     * Obter tema atual
     */
    getTheme() {
        return this.config.theme;
    }

    /**
     * Mostrar notificação
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date()
        };
        
        // Usar sistema de notificações se disponível
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            this.createNotificationElement(notification);
        }
        
        this.dispatchEvent('notification:shown', notification);
    }

    /**
     * Criar elemento de notificação
     */
    createNotificationElement(notification) {
        const container = this.getOrCreateNotificationContainer();
        
        const element = document.createElement('div');
        element.className = `alert alert-${this.mapNotificationType(notification.type)} alert-dismissible fade show`;
        element.innerHTML = `
            ${notification.message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        container.appendChild(element);
        
        // Auto-remover após duração
        setTimeout(() => {
            if (element.parentNode) {
                element.remove();
            }
        }, 5000);
    }

    /**
     * Obter ou criar container de notificações
     */
    getOrCreateNotificationContainer() {
        let container = document.getElementById('tokencafe-notifications');
        
        if (!container) {
            container = document.createElement('div');
            container.id = 'tokencafe-notifications';
            container.className = 'position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        return container;
    }

    /**
     * Mapear tipo de notificação
     */
    mapNotificationType(type) {
        const mapping = {
            'success': 'success',
            'error': 'danger',
            'warning': 'warning',
            'info': 'info'
        };
        return mapping[type] || 'info';
    }

    /**
     * Salvar dados localmente
     */
    saveLocal(key, data) {
        try {
            const storageKey = `tokencafe_${key}`;
            localStorage.setItem(storageKey, JSON.stringify({
                data,
                timestamp: Date.now(),
                version: this.version
            }));
            return true;
        } catch (error) {
            console.error('❌ Erro ao salvar localmente:', error);
            return false;
        }
    }

    /**
     * Carregar dados locais
     */
    loadLocal(key) {
        try {
            const storageKey = `tokencafe_${key}`;
            const stored = localStorage.getItem(storageKey);
            
            if (!stored) return null;
            
            const parsed = JSON.parse(stored);
            
            // Verificar se não expirou
            if (Date.now() - parsed.timestamp > this.config.cacheTimeout) {
                localStorage.removeItem(storageKey);
                return null;
            }
            
            return parsed.data;
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados locais:', error);
            return null;
        }
    }

    /**
     * Limpar dados locais
     */
    clearLocal(key = null) {
        if (key) {
            localStorage.removeItem(`tokencafe_${key}`);
        } else {
            // Limpar todos os dados do TokenCafe
            Object.keys(localStorage)
                .filter(key => key.startsWith('tokencafe_'))
                .forEach(key => localStorage.removeItem(key));
        }
    }

    /**
     * Debounce utility
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Handler de erro de inicialização
     */
    handleInitializationError(error) {
        console.error('💥 Erro crítico na inicialização:', error);
        
        // Mostrar mensagem de erro para o usuário
        document.body.innerHTML = `
            <div class="d-flex justify-content-center align-items-center min-vh-100">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <h3>Erro na inicialização</h3>
                    <p class="text-muted">Ocorreu um erro ao carregar a aplicação.</p>
                    <button class="btn btn-primary" onclick="console.log('✅ Botão recarregar página clicado - reload desabilitado')">
                        Recarregar Página
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Handler de erros globais
     */
    handleGlobalError(error) {
        console.error('🚨 Erro global capturado:', error);
        
        // Disparar evento para que qualquer módulo interessado possa capturar
        this.dispatchEvent('app:error', {
            message: error.message,
            filename: error.filename,
            lineno: error.lineno,
            colno: error.colno
        });
    }

    /**
     * Handler de mudança de visibilidade
     */
    handleVisibilityChange() {
        if (document.hidden) {
            console.log('📱 Página não está visível');
            this.dispatchEvent('app:hidden');
        } else {
            console.log('📱 Página ficou visível');
            this.dispatchEvent('app:visible');
        }
    }

    /**
     * Handler de redimensionamento de janela
     */
    handleWindowResize() {
        const newSize = {
            width: window.innerWidth,
            height: window.innerHeight,
            isMobile: window.innerWidth < 768
        };
        
        this.environment.screen = { ...this.environment.screen, ...newSize };
        this.dispatchEvent('window:resize', newSize);
    }

    /**
     * Handler antes de sair da página
     */
    handleBeforeUnload() {
        // Salvar dados pendentes
        if (this.config.autoSave) {
            this.modules.forEach((module, name) => {
                if (module.saveState && typeof module.saveState === 'function') {
                    module.saveState();
                }
            });
        }
        
        this.dispatchEvent('app:beforeunload');
    }

    /**
     * Obter estatísticas do sistema
     */
    getStats() {
        return {
            version: this.version,
            isReady: this.isReady,
            modules: Array.from(this.modules.keys()),
            environment: this.environment,
            config: this.config,
            uptime: Date.now() - (this.startTime || Date.now())
        };
    }

    /**
     * Destruir sistema (cleanup)
     */
    destroy() {
        console.log('🧹 Destruindo TokenCafe Core...');
        
        // Destruir módulos
        this.modules.forEach((module, name) => {
            if (module.destroy && typeof module.destroy === 'function') {
                module.destroy();
            }
        });
        
        this.modules.clear();
        this.isReady = false;
        
        console.log('✅ TokenCafe Core destruído');
    }
}

// ================================================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ================================================================================

// Criar instância global
window.TokenCafe = new TokenCafeCore();

// Expor classe para instâncias manuais se necessário
window.TokenCafeCore = TokenCafeCore;

console.log('✅ TokenCafe Core System carregado');