/**
 * TokenCafe - Integração de Wallet Moderna
 * Sistema de integração para migrar gradualmente para o ModernWalletSystem
 * Mantém compatibilidade com código existente enquanto adiciona funcionalidades modernas
 */

class WalletIntegration {
    constructor() {
        this.modernWallet = null;
        this.legacyWallet = null;
        this.useModernSystem = true; // Flag para alternar entre sistemas
        
        this.init();
    }

    /**
     * Inicializar sistema de integração
     */
    async init() {
        console.log('🔗 Inicializando integração de wallet...');
        
        try {
            // Carregar sistema moderno
            if (typeof ModernWalletSystem !== 'undefined') {
                this.modernWallet = new ModernWalletSystem();
                console.log('✅ Sistema moderno carregado');
            }
            
            // Carregar sistema legado como fallback
            if (typeof WalletSystem !== 'undefined') {
                this.legacyWallet = new WalletSystem();
                console.log('✅ Sistema legado carregado como fallback');
            }
            
            // Configurar listeners de eventos
            this.setupEventListeners();
            
        } catch (error) {
            console.error('❌ Erro na inicialização da integração:', error);
        }
    }

    /**
     * Conectar wallet (interface unificada)
     */
    async connect(userInitiated = true) {
        try {
            if (this.useModernSystem && this.modernWallet) {
                return await this.modernWallet.connect(userInitiated);
            } else if (this.legacyWallet) {
                return await this.legacyWallet.connect();
            } else {
                throw new Error('Nenhum sistema de wallet disponível');
            }
        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            return false;
        }
    }

    /**
     * Desconectar wallet
     */
    async disconnect() {
        try {
            if (this.useModernSystem && this.modernWallet) {
                return await this.modernWallet.disconnect();
            } else if (this.legacyWallet) {
                return await this.legacyWallet.disconnect();
            }
        } catch (error) {
            console.error('❌ Erro na desconexão:', error);
        }
    }

    /**
     * Verificar sessão existente
     */
    async checkExistingSession() {
        try {
            if (this.useModernSystem && this.modernWallet) {
                return await this.modernWallet.checkExistingSession();
            } else if (this.legacyWallet) {
                return await this.legacyWallet.checkExistingSession();
            }
            return false;
        } catch (error) {
            console.error('❌ Erro na verificação de sessão:', error);
            return false;
        }
    }

    /**
     * Verificar se MetaMask está disponível
     */
    isMetaMaskAvailable() {
        if (this.useModernSystem && this.modernWallet) {
            return this.modernWallet.isMetaMaskAvailable();
        } else if (this.legacyWallet) {
            return this.legacyWallet.isMetaMaskAvailable();
        }
        return false;
    }

    /**
     * Obter conta atual
     */
    getCurrentAccount() {
        if (this.useModernSystem && this.modernWallet) {
            return this.modernWallet.currentAccount;
        } else if (this.legacyWallet) {
            return this.legacyWallet.currentAccount;
        }
        return null;
    }

    /**
     * Verificar se está conectado
     */
    isConnected() {
        if (this.useModernSystem && this.modernWallet) {
            return this.modernWallet.isConnected;
        } else if (this.legacyWallet) {
            return this.legacyWallet.isConnected;
        }
        return false;
    }

    /**
     * Obter chain ID atual
     */
    getChainId() {
        if (this.useModernSystem && this.modernWallet) {
            return this.modernWallet.chainId;
        } else if (this.legacyWallet) {
            return this.legacyWallet.networkId;
        }
        return null;
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Listeners do sistema moderno
        if (this.modernWallet) {
            this.modernWallet.on('connected', (data) => {
                this.emitEvent('wallet:connected', data);
            });
            
            this.modernWallet.on('disconnected', (data) => {
                this.emitEvent('wallet:disconnected', data);
            });
            
            this.modernWallet.on('accountChanged', (data) => {
                this.emitEvent('wallet:accountChanged', data);
            });
            
            this.modernWallet.on('chainChanged', (data) => {
                this.emitEvent('wallet:chainChanged', data);
            });
        }
    }

    /**
     * Emitir evento global
     */
    emitEvent(eventName, data) {
        // Usar EventBus se disponível
        if (typeof window.EventBus !== 'undefined') {
            window.EventBus.emit(eventName, data);
        }
        
        // Emitir evento DOM personalizado
        const event = new CustomEvent(eventName, { detail: data });
        window.dispatchEvent(event);
    }

    /**
     * Alternar entre sistema moderno e legado
     */
    switchToLegacySystem() {
        this.useModernSystem = false;
        console.log('🔄 Alternado para sistema legado');
    }

    /**
     * Alternar para sistema moderno
     */
    switchToModernSystem() {
        this.useModernSystem = true;
        console.log('🔄 Alternado para sistema moderno');
    }

    /**
     * Obter informações do sistema atual
     */
    getSystemInfo() {
        return {
            useModernSystem: this.useModernSystem,
            modernWalletAvailable: !!this.modernWallet,
            legacyWalletAvailable: !!this.legacyWallet,
            currentAccount: this.getCurrentAccount(),
            isConnected: this.isConnected(),
            chainId: this.getChainId()
        };
    }
}

// Instância global para compatibilidade
window.WalletIntegration = WalletIntegration;

// Auto-inicializar se DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.walletIntegration = new WalletIntegration();
    });
} else {
    window.walletIntegration = new WalletIntegration();
}

console.log('📦 WalletIntegration carregado');