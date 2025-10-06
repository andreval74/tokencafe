/**
 * ================================================================================
 * TOKENCAFE - BASE SYSTEM UNIFIED
 * ================================================================================
 * Sistema base unificado para inicialização de módulos TokenCafe
 * Substitui todos os scripts inline repetitivos
 * ================================================================================
 */

import { SharedUtilities } from '../core/shared_utilities_es6.js';
import { walletConnector } from '../shared/wallet-connector.js';
import { networkManager } from '../shared/network-manager.js';

class BaseSystem {
    constructor() {
        this.initialized = false;
        this.toastContainer = null;
    }

    /**
     * Inicializar sistema base
     */
    async init() {
        if (this.initialized) return;
        
        console.log('🚀 TokenCafe - Base System Unified iniciando...');
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        // Disponibilizar módulos globalmente
        this.setupGlobalModules();
        
        // Configurar utilitários globais
        this.setupGlobalUtilities();
        
        // Configurar sistema de toast
        this.setupToastSystem();
        
        // Carregar componentes automaticamente
        this.loadComponents();
        
        this.initialized = true;
        console.log('✅ Base System Unified inicializado');
    }

    /**
     * Disponibilizar módulos unificados globalmente
     */
    setupGlobalModules() {
        window.SharedUtilities = SharedUtilities;
        window.walletConnector = walletConnector;
        window.networkManager = networkManager;
        
        console.log('📦 Módulos unificados disponibilizados globalmente');
    }

    /**
     * Configurar utilitários globais
     */
    setupGlobalUtilities() {
        // Shorthand para querySelector
        window.$ = (selector) => document.querySelector(selector);
        window.$$ = (selector) => document.querySelectorAll(selector);
        
        // Função para mostrar loading
        window.showLoading = (show = true) => {
            const loader = document.getElementById('loading-screen');
            if (loader) {
                loader.style.display = show ? 'flex' : 'none';
            }
        };

        // Compatibilidade: esconder loading (alias para showLoading(false))
        window.hideLoading = () => {
            try {
                // Suporte a overlay usado em alguns layouts
                const overlay = window.$ ? $("#loading-overlay") : document.getElementById('loading-overlay');
                if (overlay && overlay.remove) overlay.remove();
            } catch {}
            window.showLoading(false);
        };

        // Compatibilidade: formatar endereço de carteira
        const utilsInstance = new SharedUtilities();
        window.formatAddress = (address, startChars = 6, endChars = 4) => {
            try {
                return utilsInstance.formatAddress(address, startChars, endChars);
            } catch {
                if (!address) return '';
                if (String(address).length <= startChars + endChars) return address;
                return `${String(address).slice(0, startChars)}...${String(address).slice(-endChars)}`;
            }
        };
        
        // Função para scroll to top
        window.scrollToTop = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        
        console.log('🛠️ Utilitários globais configurados');
    }

    /**
     * Configurar sistema de toast
     */
    setupToastSystem() {
        // Mostrar notificação toast
        window.showToast = (message, type = 'info') => {
            // Criar elemento do toast
            const toastHTML = `
                <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'primary'} border-0" role="alert">
                    <div class="d-flex">
                        <div class="toast-body">
                            ${message}
                        </div>
                        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                    </div>
                </div>
            `;
            
            // Container de toasts
            if (!this.toastContainer) {
                this.toastContainer = document.createElement('div');
                this.toastContainer.id = 'toast-container';
                this.toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
                this.toastContainer.style.zIndex = '9999';
                document.body.appendChild(this.toastContainer);
            }
            
            // Adicionar toast
            const toastElement = document.createElement('div');
            toastElement.innerHTML = toastHTML;
            const toast = toastElement.firstElementChild;
            
            this.toastContainer.appendChild(toast);
            
            // Mostrar toast usando Bootstrap
            const bsToast = new bootstrap.Toast(toast, {
                autohide: true,
                delay: type === 'error' ? 5000 : 3000
            });
            
            bsToast.show();
            
            // Remover após esconder
            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
            });
        };
        
        console.log('🍞 Sistema de toast configurado');
    }

    /**
     * Carregar componentes automaticamente
     */
    async loadComponents() {
        const componentsToLoad = document.querySelectorAll('[data-component]');
        
        for (const element of componentsToLoad) {
            await this.loadComponent(element);
        }
        
        if (componentsToLoad.length > 0) {
            console.log(`📦 ${componentsToLoad.length} componentes carregados automaticamente`);
        }
    }

    /**
     * Carregar um componente específico
     */
    async loadComponent(element) {
        const componentName = element.getAttribute('data-component');
        if (!componentName) return;

        try {
            // Determinar caminho baseado na localização atual
            const basePath = this.getBasePath();

            // Tentar em múltiplos locais priorizando a raiz de pages para evitar 404s
            const candidatePaths = [
                `${basePath}pages/${componentName}`,
                `${basePath}pages/shared/${componentName}`,
                `${basePath}pages/modules/${componentName}`
            ];

            let finalResponse = null;
            let resolvedPath = null;

            for (const path of candidatePaths) {
                const response = await fetch(path);
                if (response.ok) {
                    finalResponse = response;
                    resolvedPath = path;
                    break;
                }
            }

            if (finalResponse && finalResponse.ok) {
                const content = await finalResponse.text();
                element.innerHTML = content;

                // Executar scripts do componente carregado
                const scripts = element.querySelectorAll('script');
                scripts.forEach(script => {
                    if (script.src) {
                        const newScript = document.createElement('script');
                        newScript.src = script.src;
                        document.head.appendChild(newScript);
                    } else {
                        try {
                            eval(script.textContent);
                        } catch (err) {
                            console.error('Erro ao executar script do componente:', err);
                            const newScript = document.createElement('script');
                            newScript.textContent = script.textContent;
                            document.head.appendChild(newScript);
                        }
                    }
                });

                console.log(`🔗 Componente '${componentName}' carregado de: ${resolvedPath}`);
            } else {
                console.warn(`⚠️ Componente '${componentName}' não encontrado nos caminhos:`, candidatePaths);
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao carregar componente ${componentName}:`, error);
        }
    }

    /**
     * Determinar caminho base baseado na localização atual
     */
    getBasePath() {
        const path = window.location.pathname;
        
        if (path.includes('/pages/modules/')) {
            return '../../../';
        } else if (path.includes('/pages/')) {
            return '../';
        } else {
            return './';
        }
    }

    /**
     * Configurar estado da aplicação (para páginas que precisam)
     */
    setupAppState(initialState = {}) {
        window.appState = new Proxy(initialState, {
            set(target, property, value) {
                const oldValue = target[property];
                target[property] = value;
                
                // Emitir evento quando estado muda
                if (oldValue !== value) {
                    window.dispatchEvent(new CustomEvent('appStateChange', {
                        detail: { property, value, oldValue }
                    }));
                }
                
                return true;
            }
        });
        
        console.log('📊 Estado da aplicação configurado');
    }
}

// Função factory para inicializar o sistema base
window.initBaseSystem = function(appState = null) {
    const baseSystem = new BaseSystem();
    
    if (appState) {
        baseSystem.setupAppState(appState);
    }
    
    baseSystem.init().catch(error => {
        console.error('❌ Erro ao inicializar Base System:', error);
    });
    
    return baseSystem;
};

// Auto-inicializar se for importado diretamente
const baseSystem = new BaseSystem();
baseSystem.init().catch(error => {
    console.error('❌ Erro ao auto-inicializar Base System:', error);
});

export { BaseSystem };
export default baseSystem;