/**
 * ================================================================================
 * MODERN WALLET SYSTEM - TOKENCAFE
 * ================================================================================
 * Sistema moderno para gerenciamento de carteiras Web3 seguindo EIP-6963
 * Implementa as melhores práticas mais recentes do MetaMask (2024)
 * ================================================================================
 */

class ModernWalletSystem {
    constructor() {
        this.providers = new Map();
        this.selectedProvider = null;
        this.currentAccount = null;
        this.chainId = null;
        this.isConnected = false;
        this.isConnecting = false;
        
        // Event listeners
        this.eventListeners = new Map();
        
        // Inicializar detecção EIP-6963
        this.initializeEIP6963();
        
        // Setup de listeners de eventos
        this.setupProviderListeners();
    }

    /**
     * ================================================================================
     * EIP-6963: DETECÇÃO SEGURA DE PROVEDORES
     * ================================================================================
     */
    
    initializeEIP6963() {
        // Definir tipos EIP-6963 globalmente
        if (!window.EIP6963ProviderDetail) {
            window.EIP6963ProviderDetail = {};
        }

        // Listener para anúncios de provedores
        window.addEventListener('eip6963:announceProvider', (event) => {
            this.handleProviderAnnouncement(event);
        });

        // Solicitar provedores disponíveis
        window.dispatchEvent(new Event('eip6963:requestProvider'));

        // Fallback para window.ethereum (compatibilidade)
        if (window.ethereum && !this.providers.has('window.ethereum')) {
            this.addFallbackProvider();
        }
    }

    handleProviderAnnouncement(event) {
        const { info, provider } = event.detail;
        
        console.log('🔍 Provedor detectado:', info.name, info.rdns);
        
        // Adicionar provedor à lista
        this.providers.set(info.uuid, {
            info,
            provider,
            isMetaMask: info.rdns === 'io.metamask' || provider.isMetaMask
        });

        // Se é MetaMask e não temos provedor selecionado, usar como padrão
        if (info.rdns === 'io.metamask' && !this.selectedProvider) {
            this.selectedProvider = provider;
            console.log('✅ MetaMask selecionado como provedor padrão');
        }
    }

    addFallbackProvider() {
        // Adicionar window.ethereum como fallback
        this.providers.set('window.ethereum', {
            info: {
                uuid: 'window.ethereum',
                name: 'MetaMask (Legacy)',
                rdns: 'io.metamask.legacy',
                icon: 'https://cdn.jsdelivr.net/gh/MetaMask/brand-resources@master/SVG/metamask-fox.svg'
            },
            provider: window.ethereum,
            isMetaMask: window.ethereum?.isMetaMask || false
        });

        if (!this.selectedProvider) {
            this.selectedProvider = window.ethereum;
        }
    }

    /**
     * ================================================================================
     * DETECÇÃO E VERIFICAÇÃO DE METAMASK
     * ================================================================================
     */
    
    isMetaMaskAvailable() {
        // Verificar EIP-6963 primeiro
        for (const [uuid, providerDetail] of this.providers) {
            if (providerDetail.isMetaMask) {
                return true;
            }
        }
        
        // Fallback para window.ethereum
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    getMetaMaskProvider() {
        // Buscar MetaMask via EIP-6963
        for (const [uuid, providerDetail] of this.providers) {
            if (providerDetail.isMetaMask) {
                return providerDetail.provider;
            }
        }
        
        // Fallback para window.ethereum
        if (window.ethereum?.isMetaMask) {
            return window.ethereum;
        }
        
        return null;
    }

    showInstallMetaMaskMessage() {
        const message = `
🦊 MetaMask não encontrado!

Para usar esta aplicação, você precisa instalar o MetaMask.

O MetaMask é uma carteira digital segura que permite:
• Conectar-se a aplicações Web3
• Gerenciar suas criptomoedas
• Assinar transações com segurança

Deseja instalar agora?
        `.trim();

        if (confirm(message)) {
            window.open('https://metamask.io/download/', '_blank');
        }
    }

    /**
     * ================================================================================
     * CONEXÃO COM VALIDAÇÃO DE AÇÃO DO USUÁRIO
     * ================================================================================
     */
    
    async connect(userInitiated = false) {
        // IMPORTANTE: eth_requestAccounts só deve ser chamado em resposta a ação do usuário
        if (!userInitiated) {
            console.warn('⚠️ Conexão deve ser iniciada por ação do usuário');
            return false;
        }

        if (this.isConnecting) {
            console.log('⏳ Conexão já em andamento...');
            return false;
        }

        try {
            this.isConnecting = true;

            // Verificar se MetaMask está disponível
            if (!this.isMetaMaskAvailable()) {
                this.showInstallMetaMaskMessage();
                return false;
            }

            const provider = this.getMetaMaskProvider();
            if (!provider) {
                throw new Error('Provedor MetaMask não encontrado');
            }

            console.log('🔗 Solicitando conexão MetaMask...');

            // Solicitar acesso às contas (apenas em resposta a ação do usuário)
            const accounts = await provider.request({
                method: 'eth_requestAccounts'
            });

            // Verificar se contas foram retornadas
            if (!accounts || accounts.length === 0) {
                throw new Error('Nenhuma conta encontrada ou autorizada');
            }

            // Obter chain ID
            const chainId = await provider.request({
                method: 'eth_chainId'
            });

            // Atualizar estado
            this.selectedProvider = provider;
            this.currentAccount = accounts[0]; // Usar primeira conta
            this.chainId = chainId;
            this.isConnected = true;

            // Salvar sessão
            this.saveSession();

            // Setup de listeners específicos do provedor
            this.setupProviderEventListeners(provider);

            console.log('✅ Conectado com sucesso!', {
                account: this.currentAccount,
                chainId: this.chainId,
                totalAccounts: accounts.length
            });

            // Emitir evento de conexão
            this.emitEvent('connected', {
                account: this.currentAccount,
                chainId: this.chainId,
                accounts: accounts
            });

            return true;

        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            this.handleConnectionError(error);
            return false;
        } finally {
            this.isConnecting = false;
        }
    }

    /**
     * ================================================================================
     * TRATAMENTO DE ERROS
     * ================================================================================
     */
    
    handleConnectionError(error) {
        let userMessage = 'Erro ao conectar com MetaMask';
        
        if (error.code === 4001) {
            // Usuário rejeitou a conexão
            userMessage = 'Conexão cancelada pelo usuário';
            console.log('👤 Usuário cancelou a conexão');
        } else if (error.code === -32002) {
            // Já existe uma solicitação pendente
            userMessage = 'Já existe uma solicitação de conexão pendente. Verifique o MetaMask.';
            console.log('⏳ Solicitação já pendente');
        } else if (error.code === -32603) {
            // Erro interno
            userMessage = 'Erro interno do MetaMask. Tente novamente.';
            console.log('🔧 Erro interno do MetaMask');
        } else if (error.message?.includes('User rejected')) {
            // Variações de rejeição do usuário
            userMessage = 'Conexão cancelada pelo usuário';
            console.log('👤 Usuário rejeitou a solicitação');
        }

        // Emitir evento de erro
        this.emitEvent('error', {
            code: error.code,
            message: error.message,
            userMessage: userMessage
        });

        // Mostrar erro para o usuário (pode ser customizado)
        this.showError(userMessage);
    }

    showError(message) {
        // Implementação básica - pode ser customizada
        if (typeof window.showToast === 'function') {
            window.showToast(message, 'error');
        } else {
            console.error('💬 Erro para usuário:', message);
            // Fallback para alert se não houver sistema de toast
            alert(message);
        }
    }

    /**
     * ================================================================================
     * VERIFICAÇÃO DE SESSÃO EXISTENTE
     * ================================================================================
     */
    
    async checkExistingSession() {
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        const savedChainId = localStorage.getItem('tokencafe_chain_id');
        
        if (!savedAccount || !this.isMetaMaskAvailable()) {
            this.isConnected = false;
            return false;
        }

        try {
            console.log('📱 Verificando sessão salva:', savedAccount);
            
            const provider = this.getMetaMaskProvider();
            if (!provider) {
                this.clearSession();
                return false;
            }

            // Usar eth_accounts para verificação silenciosa (não requer ação do usuário)
            const accounts = await provider.request({
                method: 'eth_accounts'
            });

            // Verificar se a conta salva ainda está conectada
            if (accounts.length === 0 || !accounts.find(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
                console.log('❌ Conta não está mais conectada no MetaMask');
                this.clearSession();
                return false;
            }

            // Verificar chain ID atual
            const currentChainId = await provider.request({
                method: 'eth_chainId'
            });

            // Restaurar sessão
            this.selectedProvider = provider;
            this.currentAccount = savedAccount;
            this.chainId = currentChainId;
            this.isConnected = true;

            // Atualizar chain ID se mudou
            if (currentChainId !== savedChainId) {
                localStorage.setItem('tokencafe_chain_id', currentChainId);
            }

            // Setup de listeners
            this.setupProviderEventListeners(provider);

            console.log('✅ Sessão restaurada com sucesso!', {
                account: this.currentAccount,
                chainId: this.chainId
            });

            return true;

        } catch (error) {
            console.error('❌ Erro ao verificar sessão:', error);
            this.clearSession();
            return false;
        }
    }

    /**
     * ================================================================================
     * LISTENERS DE EVENTOS DO PROVEDOR
     * ================================================================================
     */
    
    setupProviderListeners() {
        // Listeners globais que não dependem de provedor específico
        // Estes são configurados uma vez na inicialização
    }

    setupProviderEventListeners(provider) {
        if (!provider) return;

        // Remover listeners anteriores se existirem
        this.removeProviderEventListeners();

        // accountsChanged - quando contas mudam
        const accountsChangedHandler = (accounts) => {
            console.log('👤 Contas alteradas:', accounts);
            
            if (accounts.length === 0) {
                // Desconectado
                this.disconnect();
            } else if (accounts[0] !== this.currentAccount) {
                // Conta mudou
                this.currentAccount = accounts[0];
                localStorage.setItem('tokencafe_wallet_address', this.currentAccount);
                
                this.emitEvent('accountChanged', {
                    account: this.currentAccount,
                    accounts: accounts
                });
            }
        };

        // chainChanged - quando rede muda
        const chainChangedHandler = (chainId) => {
            console.log('🌐 Rede alterada:', chainId);
            
            this.chainId = chainId;
            localStorage.setItem('tokencafe_chain_id', chainId);
            
            this.emitEvent('chainChanged', {
                chainId: chainId
            });

            // Recarregar página para evitar problemas de estado
            // Isso é recomendado pela documentação do MetaMask
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        };

        // disconnect - quando desconecta
        const disconnectHandler = (error) => {
            console.log('📤 MetaMask desconectado:', error);
            this.disconnect();
        };

        // Adicionar listeners
        provider.on('accountsChanged', accountsChangedHandler);
        provider.on('chainChanged', chainChangedHandler);
        provider.on('disconnect', disconnectHandler);

        // Salvar referências para remoção posterior
        this.eventListeners.set('accountsChanged', accountsChangedHandler);
        this.eventListeners.set('chainChanged', chainChangedHandler);
        this.eventListeners.set('disconnect', disconnectHandler);
    }

    removeProviderEventListeners() {
        if (!this.selectedProvider) return;

        // Remover listeners existentes
        for (const [eventName, handler] of this.eventListeners) {
            this.selectedProvider.removeListener(eventName, handler);
        }
        
        this.eventListeners.clear();
    }

    /**
     * ================================================================================
     * GERENCIAMENTO DE SESSÃO
     * ================================================================================
     */
    
    saveSession() {
        localStorage.setItem('tokencafe_wallet_address', this.currentAccount);
        localStorage.setItem('tokencafe_chain_id', this.chainId);
        localStorage.setItem('tokencafe_connection_time', Date.now());
        localStorage.setItem('tokencafe_connected', 'true');
    }

    clearSession() {
        localStorage.removeItem('tokencafe_wallet_address');
        localStorage.removeItem('tokencafe_chain_id');
        localStorage.removeItem('tokencafe_connection_time');
        localStorage.removeItem('tokencafe_connected');
        
        this.currentAccount = null;
        this.chainId = null;
        this.isConnected = false;
    }

    /**
     * ================================================================================
     * DESCONEXÃO
     * ================================================================================
     */
    
    disconnect() {
        console.log('📤 Desconectando wallet...');
        
        // Remover listeners
        this.removeProviderEventListeners();
        
        // Limpar estado
        this.clearSession();
        this.selectedProvider = null;
        
        // Emitir evento
        this.emitEvent('disconnected', {});
        
        console.log('✅ Desconectado com sucesso');
    }

    /**
     * ================================================================================
     * SISTEMA DE EVENTOS
     * ================================================================================
     */
    
    emitEvent(eventName, data) {
        const event = new CustomEvent(`wallet:${eventName}`, {
            detail: data
        });
        window.dispatchEvent(event);
        
        // Também emitir via EventBus se disponível
        if (typeof window.EventBus !== 'undefined') {
            window.EventBus.emit(`wallet:${eventName}`, data);
        }
    }

    /**
     * ================================================================================
     * MÉTODOS UTILITÁRIOS
     * ================================================================================
     */
    
    getCurrentAccount() {
        return this.currentAccount;
    }

    getChainId() {
        return this.chainId;
    }

    isWalletConnected() {
        return this.isConnected && this.currentAccount !== null;
    }

    getProvider() {
        return this.selectedProvider;
    }

    getAvailableProviders() {
        return Array.from(this.providers.values());
    }

    /**
     * ================================================================================
     * MÉTODOS DE REDE
     * ================================================================================
     */
    
    async switchNetwork(chainId) {
        if (!this.selectedProvider) {
            throw new Error('Nenhum provedor conectado');
        }

        try {
            await this.selectedProvider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId }],
            });
        } catch (switchError) {
            // Se a rede não existe, tentar adicionar
            if (switchError.code === 4902) {
                throw new Error('Rede não encontrada. Adicione a rede manualmente no MetaMask.');
            }
            throw switchError;
        }
    }

    async addNetwork(networkConfig) {
        if (!this.selectedProvider) {
            throw new Error('Nenhum provedor conectado');
        }

        return await this.selectedProvider.request({
            method: 'wallet_addEthereumChain',
            params: [networkConfig],
        });
    }
}

/**
 * ================================================================================
 * FUNÇÕES GLOBAIS DE CONVENIÊNCIA
 * ================================================================================
 */

// Instância global
let modernWalletSystem = null;

function getWalletSystem() {
    if (!modernWalletSystem) {
        modernWalletSystem = new ModernWalletSystem();
    }
    return modernWalletSystem;
}

// Funções de conveniência para compatibilidade
async function connectWallet() {
    const wallet = getWalletSystem();
    return await wallet.connect(true); // true = iniciado pelo usuário
}

async function disconnectWallet() {
    const wallet = getWalletSystem();
    wallet.disconnect();
}

async function checkExistingWalletConnection() {
    const wallet = getWalletSystem();
    return await wallet.checkExistingSession();
}

function isWalletConnected() {
    const wallet = getWalletSystem();
    return wallet.isWalletConnected();
}

function getCurrentWalletAccount() {
    const wallet = getWalletSystem();
    return wallet.getCurrentAccount();
}

/**
 * ================================================================================
 * EXPOSIÇÃO GLOBAL
 * ================================================================================
 */

// Expor classes e funções globalmente
window.ModernWalletSystem = ModernWalletSystem;
window.getWalletSystem = getWalletSystem;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.checkExistingWalletConnection = checkExistingWalletConnection;
window.isWalletConnected = isWalletConnected;
window.getCurrentWalletAccount = getCurrentWalletAccount;

// Inicializar automaticamente quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        getWalletSystem();
    });
} else {
    getWalletSystem();
}

console.log('🚀 Modern Wallet System carregado com suporte EIP-6963');