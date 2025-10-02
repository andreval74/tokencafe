/**
 * ================================================================================
 * TOKENCAFE - PAGE MANAGER UNIFIED
 * ================================================================================
 * Sistema unificado para gerenciamento de páginas TokenCafe
 * Reutilizável em todas as páginas do sistema
 * ================================================================================
 */

import { walletConnector } from '../shared/wallet-connector.js';
import { networkManager } from '../shared/network-manager.js';

class PageManager {
    constructor(pageType = 'default') {
        this.pageType = pageType;
        this.initialized = false;
        this.connectBtn = null;
        
        // Configurações por tipo de página
        this.pageConfigs = {
            'landing': {
                hasWalletConnect: false,
                hasAnimations: true,
                redirectTarget: 'pages/index.html'
            },
            'main': {
                hasWalletConnect: true,
                hasAnimations: false,
                redirectTarget: 'tools.html'
            },
            'tools': {
                hasWalletConnect: true,
                hasAnimations: false,
                redirectTarget: null
            },
            'rpc': {
                hasWalletConnect: true,
                hasAnimations: false,
                requiresAuth: false
            },
            'link': {
                hasWalletConnect: true,
                hasAnimations: false,
                requiresAuth: false
            },
            'dashboard': {
                hasWalletConnect: true,
                hasAnimations: false,
                requiresAuth: true
            },
            'default': {
                hasWalletConnect: false,
                hasAnimations: false
            }
        };
    }

    /**
     * Inicializar sistema da página
     */
    async init() {
        if (this.initialized) return;
        
        console.log(`🚀 TokenCafe - Page Manager (${this.pageType}) iniciando...`);
        
        // Aguardar DOM estar pronto
        if (document.readyState === 'loading') {
            await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
        }
        
        const config = this.pageConfigs[this.pageType] || this.pageConfigs.default;
        
        // Configurar elementos base
        this.setupBaseElements();
        
        // Configurar funcionalidades específicas
        if (config.hasWalletConnect) {
            await this.setupWalletFeatures();
        }
        
        if (config.hasAnimations) {
            this.setupAnimations();
        }
        
        if (config.requiresAuth) {
            await this.checkAuthRequired();
        }
        
        // Configurar funções globais
        this.setupGlobalFunctions();
        
        this.initialized = true;
        console.log(`✅ Page Manager (${this.pageType}) inicializado`);
    }

    /**
     * Configurar elementos base da página
     */
    setupBaseElements() {
        // Encontrar botão de conexão priorizando o elemento BUTTON
        this.connectBtn = document.getElementById('connect-wallet-btn') ||
                          document.querySelector('.btn-connect-wallet') ||
                          document.querySelector('[onclick*="connectWallet"]') ||
                          document.getElementById('connect-text');
    }

    /**
     * Configurar recursos de carteira
     */
    async setupWalletFeatures() {
        if (!this.connectBtn) return;
        
        // Configurar eventos de carteira
        this.setupWalletEvents();
        
        // Verificação inicial de conexão
        await this.checkInitialConnection();
    }

    /**
     * Configurar eventos de carteira
     */
    setupWalletEvents() {
        // Função global para conectar carteira
        window.connectWalletFromHeader = () => this.connectWallet();
        
        // Event listeners adicionais
        window.addEventListener('beforeunload', () => {
            // Cleanup se necessário
        });
    }

    /**
     * Verificar conexão inicial
     */
    async checkInitialConnection() {
        try {
            const isConnected = await walletConnector.isConnected();
            
            if (isConnected) {
                console.log('🔗 Carteira já conectada');
                this.showDashboardButton();
            } else {
                console.log('ℹ️ Nenhuma conexão anterior encontrada');
                this.showConnectButton();
            }
        } catch (error) {
            console.log('ℹ️ Verificação de conexão falhou, mantendo estado padrão');
            this.showConnectButton();
        }
    }

    /**
     * Conectar carteira usando sistema unificado
     */
    async connectWallet() {
        try {
            console.log('🔗 Conectando carteira...');
            this.showConnectingState();
            
            // Usar wallet-connector unificado
            const result = await walletConnector.connect('metamask');
            
            if (result.success) {
                console.log('✅ Carteira conectada:', result.address);
                this.showSuccessState();
                
                // Redirecionar baseado na configuração da página
                const config = this.pageConfigs[this.pageType];
                if (config.redirectTarget) {
                    setTimeout(() => {
                        this.redirectTo(config.redirectTarget);
                    }, 1500);
                }
                
            } else {
                throw new Error(result.error || 'Falha na conexão');
            }
            
        } catch (error) {
            console.error('❌ Erro ao conectar:', error);
            this.showErrorState();
        }
    }

    /**
     * Estados visuais do botão
     */
    showConnectButton() {
        if (!this.connectBtn) return;
        
        this.connectBtn.innerHTML = '<i class="fas fa-sign-in-alt me-1"></i>Conectar ao MetaMask';
        this.connectBtn.className = 'btn btn-primary btn-lg';
        this.connectBtn.onclick = () => this.connectWallet();
        this.connectBtn.disabled = false;
    }

    showConnectingState() {
        if (!this.connectBtn) return;
        
        this.connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Conectando...';
        this.connectBtn.className = 'btn btn-primary btn-lg';
        this.connectBtn.disabled = true;
    }

    showSuccessState() {
        if (!this.connectBtn) return;
        
        this.connectBtn.innerHTML = '<i class="fas fa-check me-1"></i>Conectado';
        this.connectBtn.className = 'btn btn-success btn-lg';
        this.connectBtn.disabled = true;
    }

    showDashboardButton() {
        if (!this.connectBtn) return;
        
        const config = this.pageConfigs[this.pageType];
        const target = config.redirectTarget || '';
        const buttonText = target.includes('tools') ? 'Ir para Ferramentas' : (config.redirectTarget ? 'Ir para Dashboard' : 'Dashboard');
        
        this.connectBtn.innerHTML = `<i class="fas fa-tachometer-alt me-1"></i>${buttonText}`;
        this.connectBtn.className = 'btn btn-success btn-lg';
        this.connectBtn.onclick = () => this.redirectTo(config.redirectTarget || '#');
        this.connectBtn.disabled = false;
    }

    showErrorState() {
        if (!this.connectBtn) return;
        
        this.connectBtn.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Erro - Tente Novamente';
        this.connectBtn.className = 'btn btn-danger btn-lg';
        this.connectBtn.disabled = false;
        
        // Resetar botão após 3 segundos
        setTimeout(() => {
            this.showConnectButton();
        }, 3000);
    }

    /**
     * Configurar animações
     */
    setupAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // Observar elementos com animação
        const animatedElements = document.querySelectorAll('.TokenCafe-fade-in, .TokenCafe-fade-in-up');
        animatedElements.forEach(el => observer.observe(el));
    }

    /**
     * Configurar funções globais
     */
    setupGlobalFunctions() {
        // Função global para desconexão
        window.TokenCafeWallet = {
            globalDisconnect: () => {
                console.log('Executando desconexão global...');
                walletConnector.disconnect();
                this.showConnectButton();
            }
        };

        // Função para navegação entre páginas
        window.navigateToApp = () => {
            const config = this.pageConfigs[this.pageType];
            this.redirectTo(config.redirectTarget || 'pages/index.html');
        };
    }

    /**
     * Verificar autenticação obrigatória
     */
    async checkAuthRequired() {
        try {
            const isConnected = await walletConnector.isConnected();
            
            if (!isConnected) {
                console.log('❌ Autenticação necessária, redirecionando...');
                this.redirectTo('../index.html');
                return false;
            }
            
            return true;
        } catch (error) {
            console.error('❌ Erro na verificação de auth:', error);
            this.redirectTo('../index.html');
            return false;
        }
    }

    /**
     * Redirecionar para URL
     */
    redirectTo(url) {
        console.log(`🎯 Redirecionando para: ${url}`);
        window.location.href = url;
    }

    /**
     * Verificar se MetaMask está instalado
     */
    async checkMetaMaskInstallation() {
        if (typeof window.ethereum === 'undefined') {
            console.log('❌ MetaMask não instalado');
            this.showInstallMetaMaskButton();
            return false;
        }
        return true;
    }

    /**
     * Mostrar botão para instalar MetaMask
     */
    showInstallMetaMaskButton() {
        if (!this.connectBtn) return;
        
        this.connectBtn.innerHTML = '<i class="fas fa-download me-1"></i>Instalar MetaMask';
        this.connectBtn.className = 'btn btn-warning btn-lg';
        this.connectBtn.onclick = () => {
            window.open('https://metamask.io/download/', '_blank');
        };
    }
}

// Função factory para criar PageManager configurado
window.createPageManager = function(pageType) {
    const manager = new PageManager(pageType);
    manager.init().catch(error => {
        console.error(`❌ Erro ao inicializar Page Manager (${pageType}):`, error);
    });
    return manager;
};

export { PageManager };
export default PageManager;