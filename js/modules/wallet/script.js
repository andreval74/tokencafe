
/**
 * TokenCafe Wallet Manager - Script Consolidado
 * Gerencia conexões de carteira (MetaMask, Trust Wallet, WalletConnect)
 * Versão: 2.0
 * Autor: TokenCafe
 * Data: 2024
 */

// Configurações globais
const WALLET_CONFIG = {
    projectId: 'b8b4b4b4b4b4b4b4b4b4b4b4b4b4b4b4',
    chains: [1, 56, 137, 42161, 10, 43114, 250, 25, 100, 8453],
    metadata: {
        name: 'TokenCafe',
        description: 'TokenCafe Wallet Integration',
        url: 'https://tokencafe.io',
        icons: ['https://tokencafe.io/favicon.ico']
    }
};

// Configurações de redes populares
const NETWORK_CONFIGS = {
    1: {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
        },
        blockExplorerUrls: 'https://etherscan.io'
    },
    56: {
        chainId: '0x38',
        chainName: 'BNB Smart Chain',
        rpcUrl: 'https://bsc-dataseed.binance.org',
        nativeCurrency: {
            name: 'BNB',
            symbol: 'BNB',
            decimals: 18
        },
        blockExplorerUrls: 'https://bscscan.com'
    },
    137: {
        chainId: '0x89',
        chainName: 'Polygon Mainnet',
        rpcUrl: 'https://polygon-rpc.com',
        nativeCurrency: {
            name: 'MATIC',
            symbol: 'MATIC',
            decimals: 18
        },
        blockExplorerUrls: 'https://polygonscan.com'
    },
    42161: {
        chainId: '0xa4b1',
        chainName: 'Arbitrum One',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
        },
        blockExplorerUrls: 'https://arbiscan.io'
    },
    10: {
        chainId: '0xa',
        chainName: 'Optimism',
        rpcUrl: 'https://mainnet.optimism.io',
        nativeCurrency: {
            name: 'Ether',
            symbol: 'ETH',
            decimals: 18
        },
        blockExplorerUrls: 'https://optimistic.etherscan.io'
    },
    43114: {
        chainId: '0xa86a',
        chainName: 'Avalanche C-Chain',
        rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
        nativeCurrency: {
            name: 'Avalanche',
            symbol: 'AVAX',
            decimals: 18
        },
        blockExplorerUrls: 'https://snowtrace.io'
    },
    97: {
        chainId: '0x61',
        chainName: 'BNB Smart Chain Testnet',
        rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
        nativeCurrency: {
            name: 'BNB Chain Native Token',
            symbol: 'tBNB',
            decimals: 18
        },
        blockExplorerUrls: 'https://testnet.bscscan.com',
        faucets: ['https://testnet.bnbchain.org/faucet-smart'],
        infoURL: 'https://www.bnbchain.org/en',
        shortName: 'bnbt'
    }
};

/**
 * Integração com ChainList API
 */
class ChainListIntegration {
    constructor() {
        this.apiUrl = 'https://chainlist.org/rpcs.json';
        this.cache = null;
        this.cacheExpiry = null;
        this.cacheTimeout = 30 * 60 * 1000; // 30 minutos
    }

    async fetchChains() {
        try {
            if (this.cache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
                console.log('📦 Usando dados do cache do ChainList');
                return this.cache;
            }

            console.log('🌐 Buscando dados atualizados do ChainList...');
            const response = await fetch(this.apiUrl);
            
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }

            const chains = await response.json();
            this.cache = chains;
            this.cacheExpiry = Date.now() + this.cacheTimeout;
            
            console.log(`✅ ${chains.length} redes carregadas do ChainList`);
            return chains;
            
        } catch (error) {
            console.error('❌ Erro ao buscar dados do ChainList:', error);
            if (this.cache) {
                console.log('📦 Usando cache como fallback');
                return this.cache;
            }
            throw error;
        }
    }

    async searchChains(searchTerm) {
        const chains = await this.fetchChains();
        const term = searchTerm.toLowerCase();
        
        return chains.filter(chain => 
            chain.name.toLowerCase().includes(term) ||
            chain.chain.toLowerCase().includes(term) ||
            chain.shortName.toLowerCase().includes(term)
        );
    }

    async getChainById(chainId) {
        const chains = await this.fetchChains();
        return chains.find(chain => chain.chainId === chainId) || null;
    }

    async getWorkingRpcs(chainId) {
        const chain = await this.getChainById(chainId);
        if (!chain || !chain.rpc) return [];

        return chain.rpc
            .filter(rpc => {
                const url = typeof rpc === 'string' ? rpc : rpc.url;
                return url && 
                       url.startsWith('https://') && 
                       !url.includes('${') && 
                       !url.includes('API_KEY');
            })
            .map(rpc => typeof rpc === 'string' ? rpc : rpc.url);
    }
}

console.log('🔄 Carregando TokenCafe Wallet Manager...');

/**
 * Classe principal para gerenciar carteiras
 */
class TokenCafeWalletManager {
    constructor() {
        this.isConnected = false;
        this.currentAccount = null;
        this.provider = null;
        this.ethersProvider = null;
        this.signer = null;
        this.web3Modal = null;
        this.walletType = null;
        this.networkInfo = null;
        this.balance = '0';
        this.tokenBalance = '0';
        
        // Cache e controle de chamadas RPC
        this.balanceCache = {
            value: '0',
            timestamp: 0,
            ttl: 30000 // 30 segundos de cache
        };
        this.updateBalanceTimeout = null;
        this.isUpdatingBalance = false;
        
        // Elementos da UI
        this.connectButton = null;
        this.disconnectButton = null;
        this.walletInfo = null;
        this.accountDisplay = null;
        this.balanceDisplay = null;
        this.networkDisplay = null;
        this.statusDisplay = null;
        
        // Integração com ChainList
        this.chainList = new ChainListIntegration();

        // Armazenamento em memória dos RPCs inseridos durante a sessão (por chainId hex)
        this.sessionRpcs = {};
        
        // Inicializar
        this.init();
    }

    /**
     * Copiar texto para clipboard
     */
    copyToClipboard(text, successMessage = 'Copiado!') {
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                this.showStatus(successMessage, 'success');
            }).catch(err => {
                console.error('Erro ao copiar:', err);
                this.showStatus('Erro ao copiar', 'error');
            });
        }
    }

    /**
     * Limpar elementos do header
     */
    clearHeaderElements() {
        const headerElements = ['header-wallet-address', 'header-wallet-balance', 'header-network-info'];
        headerElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '';
        });
    }

    /**
     * Limpar elementos da sidebar
     */
    clearSidebarElements() {
        const sidebarElements = ['sidebar-wallet-address', 'sidebar-wallet-balance', 'sidebar-network-info'];
        sidebarElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = '';
            }
        });
        
        // Limpar status da sidebar
        const sidebarStatus = document.getElementById('sidebar-wallet-status');
        if (sidebarStatus) {
            sidebarStatus.textContent = 'Desconectado';
            sidebarStatus.className = 'wallet-status disconnected';
        }
    }

    /**
     * Inicializar o gerenciador
     */
    async init() {
        console.log('🚀 Inicializando TokenCafe Wallet Manager...');
        
        this.initWeb3Modal();
        this.setupEventListeners();
        
        // Inicializar funcionalidades de rede
        this.initNetworkSearch();
        
        // COMENTADO: Não verificar sessão existente para forçar popup sempre
        // await this.checkExistingSession();
        
        console.log('✅ TokenCafe Wallet Manager inicializado');
    }

    /**
     * Inicializar Web3Modal
     */
    initWeb3Modal() {
        if (typeof window.Web3Modal !== 'undefined') {
            this.web3Modal = new window.Web3Modal.default({
                cacheProvider: false,
                providerOptions: {}
            });
        }
    }



    /**
     * Verificar sessão existente
     */
    async checkExistingSession() {
        try {
            if (typeof window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                
                if (accounts && accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    this.provider = window.ethereum;
                    this.isConnected = true;
                    
                    if (typeof ethers !== 'undefined') {
                        this.ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
                        this.signer = this.ethersProvider.getSigner();
                    }
                    
                    await this.updateWalletInfo();
                    this.updateUI();
                    
                    console.log('✅ Sessão existente encontrada:', this.currentAccount);
                    return true;
                } else {
                    console.log('ℹ️ Nenhuma sessão ativa encontrada');
                    return false;
                }
            }
        } catch (error) {
            console.error('❌ Erro ao verificar sessão existente:', error);
            return false;
        }
    }

    /**
     * Conectar carteira - SEMPRE força popup do MetaMask
     */
    async connectWallet() {
        try {
            console.log('🔄 Iniciando conexão da carteira...');
            
            // Verificar se MetaMask está disponível
            if (!this.isMetaMaskAvailable()) {
                throw new Error('MetaMask não está instalado. Por favor, instale o MetaMask para continuar.');
            }

            // Limpar estado anterior completamente
            if (this.web3Modal) {
                await this.web3Modal.clearCachedProvider();
            }
            
            // Desconectar completamente antes de reconectar
            this.disconnect(false);
            
            console.log('🔄 FORÇANDO popup do MetaMask...');
            
            // MÉTODO 1: Tentar revogar permissões primeiro (força popup)
            try {
                await window.ethereum.request({
                    method: "wallet_revokePermissions",
                    params: [{ eth_accounts: {} }]
                });
                console.log('✅ Permissões revogadas - popup será forçado');
            } catch (revokeError) {
                console.log('ℹ️ Revogação não suportada, continuando...');
            }
            
            // MÉTODO 2: Solicitar permissões explicitamente
            try {
                await window.ethereum.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }]
                });
                console.log('✅ Permissões solicitadas');
            } catch (permError) {
                console.log('ℹ️ Erro nas permissões, continuando...');
            }
            
            // MÉTODO 3: SEMPRE usar eth_requestAccounts (NUNCA eth_accounts)
            console.log('🔄 Solicitando contas - POPUP OBRIGATÓRIO...');
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            if (!accounts || accounts.length === 0) {
                throw new Error('Nenhuma conta foi selecionada no MetaMask');
            }

            // Configurar conexão
            this.currentAccount = accounts[0];
            this.provider = window.ethereum;
            this.isConnected = true;
            this.walletType = 'metamask';

            // Configurar ethers.js
            if (typeof ethers !== 'undefined') {
                this.ethersProvider = new ethers.providers.Web3Provider(window.ethereum);
                this.signer = this.ethersProvider.getSigner();
            }

            // Configurar listeners e atualizar informações
            this.setupProviderListeners();
            await this.updateWalletInfo();
            
            // Aguardar um pouco para garantir que os dados foram carregados
            setTimeout(() => {
                this.updateUI();
                console.log('🔄 Interface atualizada após conexão');
            }, 100);
            
            this.saveSession();

            console.log('✅ Carteira conectada com sucesso:', this.currentAccount);
            
            this.emitWalletEvent('wallet:connected', {
                account: this.currentAccount,
                walletType: this.walletType
            });

            return {
                success: true,
                account: this.currentAccount,
                walletType: this.walletType
            };

        } catch (error) {
            console.error('❌ Erro ao conectar carteira:', error);
            
            // Tratar erros específicos
            if (error.code === 4001) {
                this.showStatus('Conexão cancelada pelo usuário', 'warning');
            } else if (error.code === -32002) {
                this.showStatus('Solicitação de conexão pendente. Verifique o MetaMask.', 'warning');
            } else {
                this.showStatus(`Erro ao conectar: ${error.message}`, 'error');
            }
            
            throw error;
        }
    }

    /**
     * Configurar listeners do provider
     */
    setupProviderListeners() {
        if (!this.provider) return;

        // Remover listeners existentes
        if (this.provider.removeAllListeners) {
            this.provider.removeAllListeners();
        }

        // Mudança de conta
        this.provider.on('accountsChanged', async (accounts) => {
            console.log('🔄 Contas alteradas:', accounts);
            
            if (accounts.length === 0) {
                // Usuário desconectou
                this.disconnect();
            } else if (accounts[0] !== this.currentAccount) {
                // Conta alterada
                this.currentAccount = accounts[0];
                await this.updateWalletInfo();
                this.updateUI();
                this.saveSession();
                
                this.emitWalletEvent('wallet:accountChanged', {
                    account: this.currentAccount,
                    walletType: this.walletType
                });
            }
        });

        // Mudança de rede
        this.provider.on('chainChanged', async (chainId) => {
            console.log('🔄 Rede alterada:', chainId);
            
            // Limpar cache do saldo ao mudar de rede
            this.clearBalanceCache();
            
            await this.updateWalletInfo();
            
            // Forçar atualização do saldo na nova rede
            await this.updateBalance(true);
            
            this.updateUI();
            this.saveSession();
            
            this.emitWalletEvent('wallet:networkChanged', {
                chainId: chainId,
                account: this.currentAccount
            });
        });

        // Conexão/desconexão
        this.provider.on('connect', (connectInfo) => {
            console.log('✅ Provider conectado:', connectInfo);
        });

        this.provider.on('disconnect', (error) => {
            console.log('❌ Provider desconectado:', error);
            this.disconnect();
        });
    }

    /**
     * Atualizar informações da carteira
     */
    async updateWalletInfo() {
        if (!this.provider || !this.currentAccount) return;

        try {
            // Obter informações da rede com retry
            const chainId = await this.retryRpcCall(async () => {
                return await this.provider.request({ method: 'eth_chainId' });
            }, 2, 1000);
            
            const networkVersion = await this.retryRpcCall(async () => {
                return await this.provider.request({ method: 'net_version' });
            }, 2, 1000);
            
            this.networkInfo = {
                chainId: chainId,
                networkId: networkVersion,
                name: this.getNetworkName(chainId),
                currency: this.getNetworkCurrency(chainId)
            };

            // Atualizar saldo
            await this.updateBalance();

            // Atualizar interface após obter o saldo
            this.updateUI();

            // Salvar dados da carteira em variáveis globais para uso posterior
            window.TokenCafeWalletData = {
                isConnected: this.isConnected,
                account: this.currentAccount,
                balance: this.balance,
                network: this.networkInfo,
                provider: this.provider,
                walletType: this.walletType || 'metamask',
                timestamp: new Date().toISOString()
            };

            console.log('ℹ️ Informações da carteira atualizadas:', {
                account: this.currentAccount,
                network: this.networkInfo,
                balance: this.balance
            });

            console.log('💾 Dados da carteira salvos em window.TokenCafeWalletData:', window.TokenCafeWalletData);

        } catch (error) {
            console.error('❌ Erro ao atualizar informações da carteira:', error);
            
            // Tratamento específico para circuit breaker
            if (error.message && error.message.includes('circuit breaker')) {
                console.log('🔄 Circuit breaker detectado em updateWalletInfo');
                this.showStatus('Erro de conectividade. Tentando novamente em breve.', 'warning');
            }
        }
    }

    /**
     * Desconectar carteira
     */
    async disconnect(emitEvent = true) {
        try {
            console.log('🔄 Desconectando carteira...');

            // Limpar Web3Modal cache
            if (this.web3Modal) {
                await this.web3Modal.clearCachedProvider();
            }

            // Remover listeners
            if (this.provider && this.provider.removeAllListeners) {
                this.provider.removeAllListeners();
            }

            // Limpar estado
            this.isConnected = false;
            this.currentAccount = null;
            this.provider = null;
            this.ethersProvider = null;
            this.signer = null;
            this.walletType = null;
            this.networkInfo = null;
            this.balance = '0';
            this.tokenBalance = '0';

            // Limpar cache e timeouts
            this.clearBalanceCache();
            if (this.updateBalanceTimeout) {
                clearTimeout(this.updateBalanceTimeout);
                this.updateBalanceTimeout = null;
            }
            this.isUpdatingBalance = false;

            // Limpar sessão
            this.clearSession();
            // Limpar RPCs de sessão (sem persistência)
            this.sessionRpcs = {};
            
            // Atualizar UI
            this.updateUI();
            
            // Limpar elementos específicos
            this.clearHeaderElements();
            this.clearSidebarElements();

            if (emitEvent) {
                this.emitWalletEvent('wallet:disconnected', {});
            }

            console.log('✅ Carteira desconectada com sucesso');
            this.showStatus('Carteira desconectada', 'info');

        } catch (error) {
            console.error('❌ Erro ao desconectar carteira:', error);
        }
    }

    /**
     * Salvar sessão no localStorage
     */
    saveSession() {
        try {
            const sessionData = {
                isConnected: this.isConnected,
                currentAccount: this.currentAccount,
                walletType: this.walletType,
                networkInfo: this.networkInfo,
                timestamp: Date.now()
            };
            localStorage.setItem('tokenCafeWalletSession', JSON.stringify(sessionData));
        } catch (error) {
            console.error('❌ Erro ao salvar sessão:', error);
        }
    }

    /**
     * Limpar sessão do localStorage
     */
    clearSession() {
        try {
            localStorage.removeItem('tokenCafeWalletSession');
        } catch (error) {
            console.error('❌ Erro ao limpar sessão:', error);
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botão conectar
        const connectBtn = document.getElementById('connectWallet');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => this.connectWallet());
        }

        // Botão desconectar
        const disconnectBtn = document.getElementById('disconnectWallet');
        if (disconnectBtn) {
            disconnectBtn.addEventListener('click', () => this.disconnect());
        }

        // Botão copiar endereço
        const copyBtn = document.getElementById('copyAddress');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyAddress());
        }

        // Botão copiar endereço da carteira
        const copyAddressBtn = document.getElementById('copyAddressBtn');
        if (copyAddressBtn) {
            copyAddressBtn.addEventListener('click', () => this.copyToClipboard(this.currentAccount, 'Endereço copiado!'));
        }

        // Botão copiar Chain ID
        const copyChainIdBtn = document.getElementById('copyChainIdBtn');
        if (copyChainIdBtn) {
            copyChainIdBtn.addEventListener('click', () => {
                const chainId = this.currentChainId;
                if (chainId) {
                    const decimalChainId = parseInt(chainId, 16).toString();
                    this.copyToClipboard(decimalChainId, 'Chain ID copiado!');
                }
            });
        }

        // Botão copiar RPC URL
        const copyRpcBtn = document.getElementById('copyRpcBtn');
        if (copyRpcBtn) {
            copyRpcBtn.addEventListener('click', () => {
                const rpcUrl = this.getRpcUrl();
                if (rpcUrl) {
                    this.copyToClipboard(rpcUrl, 'RPC URL copiado!');
                }
            });
        }

        // Botão abrir explorer
        const openExplorerBtn = document.getElementById('openExplorerBtn');
        if (openExplorerBtn) {
            openExplorerBtn.addEventListener('click', () => {
                const explorerUrl = this.getExplorerUrl();
                if (explorerUrl) {
                    window.open(explorerUrl, '_blank');
                }
            });
        }

        // Botão limpar dados e recomeçar
        const clearDataBtn = document.getElementById('clearDataBtn');
        if (clearDataBtn) {
            clearDataBtn.addEventListener('click', () => this.clearAndRestart());
        }

        // Botão compartilhar endereço
        const shareAddressBtn = document.getElementById('shareAddressBtn');
        if (shareAddressBtn) {
            shareAddressBtn.addEventListener('click', () => this.shareAddress());
        }

        // Botão visualizar endereço na rede
        const viewAddressBtn = document.getElementById('viewAddressBtn');
        if (viewAddressBtn) {
            viewAddressBtn.addEventListener('click', () => this.viewAddressOnNetwork());
        }
    }

    /**
     * Copiar endereço para clipboard
     */
    copyAddress() {
        if (this.currentAccount) {
            navigator.clipboard.writeText(this.currentAccount).then(() => {
                this.showStatus('Endereço copiado!', 'success');
            }).catch(err => {
                console.error('Erro ao copiar endereço:', err);
                this.showStatus('Erro ao copiar endereço', 'error');
            });
        }
    }

    /**
     * Atualizar interface do usuário
     */
    updateUI() {
        console.log('🔄 Atualizando interface...', {
            connected: this.isConnected,
            account: this.currentAccount,
            balance: this.balance,
            network: this.networkInfo
        });

        // Atualizar elementos de endereço
        const addressElements = document.querySelectorAll('.wallet-address, #walletAddress, #accountAddress');
        addressElements.forEach(element => {
            if (element) {
                if (this.isConnected && this.currentAccount) {
                    element.value = this.currentAccount;
                    element.textContent = this.currentAccount;
                    // Adicionar tooltip com endereço completo
                    element.title = this.currentAccount;
                } else {
                    element.value = '-';
                    element.textContent = '-';
                    element.title = '';
                }
            }
        });

        // Atualizar elementos de saldo
        const balanceElements = document.querySelectorAll('.wallet-balance, #walletBalance, #ethBalance, #balance');
        balanceElements.forEach(element => {
            if (element) {
                if (this.isConnected && this.balance !== null && this.balance !== undefined) {
                    // Usar o símbolo da moeda nativa da rede atual para o saldo
                    const networkConfig = NETWORK_CONFIGS[parseInt(this.networkInfo?.chainId || '0x1', 16)];
                    const currencySymbol = networkConfig?.nativeCurrency?.symbol || 'ETH';
                    const balanceText = `${this.balance} ${currencySymbol}`;
                    element.value = balanceText;
                    element.textContent = balanceText;
                } else {
                    element.value = '-';
                    element.textContent = '-';
                }
            }
        });

        // Atualizar elementos de rede
        const networkElements = document.querySelectorAll('.wallet-network, #walletNetwork, #networkName');
        networkElements.forEach(element => {
            if (element) {
                if (this.isConnected && this.networkInfo && this.networkInfo.name) {
                    element.value = this.networkInfo.name;
                    element.textContent = this.networkInfo.name;
                } else {
                    element.value = '-';
                    element.textContent = '-';
                }
            }
        });

        // Controlar visibilidade das seções no wallet-index.html
        const walletInfoSection = document.getElementById('wallet-info-section');
        const walletDetailsSection = document.getElementById('wallet-details-section');
        const walletActionsSection = document.getElementById('wallet-actions-section');
        const networkDetailsSection = document.getElementById('network-details-section');
        
        if (walletInfoSection) {
            if (this.isConnected) {
                walletInfoSection.classList.remove('hidden-section', 'd-none');
                walletInfoSection.style.display = 'block';
            } else {
                walletInfoSection.classList.add('hidden-section', 'd-none');
                walletInfoSection.style.display = 'none';
            }
        }

        if (walletDetailsSection) {
            if (this.isConnected) {
                walletDetailsSection.classList.remove('hidden-section', 'd-none');
                walletDetailsSection.style.display = 'block';
            } else {
                walletDetailsSection.classList.add('hidden-section', 'd-none');
                walletDetailsSection.style.display = 'none';
            }
        }
        
        if (walletActionsSection) {
            if (this.isConnected) {
                walletActionsSection.classList.remove('hidden-section', 'd-none');
                walletActionsSection.style.display = 'block';
            } else {
                walletActionsSection.classList.add('hidden-section', 'd-none');
                walletActionsSection.style.display = 'none';
            }
        }
        
        if (networkDetailsSection) {
            if (this.isConnected) {
                networkDetailsSection.classList.remove('hidden-section');
                networkDetailsSection.style.display = 'block';
            } else {
                networkDetailsSection.classList.add('hidden-section');
                networkDetailsSection.style.display = 'none';
            }
        }
        
        // Preencher dados da rede detalhados
        const chainIdElement = document.getElementById('chainId');
        if (chainIdElement) {
            if (this.isConnected && this.networkInfo && this.networkInfo.chainId) {
                // Converter Chain ID de hexadecimal para decimal
                const decimalChainId = parseInt(this.networkInfo.chainId, 16).toString();
                chainIdElement.value = decimalChainId;
            } else {
                chainIdElement.value = '-';
            }
        }

        const nativeCurrencyElement = document.getElementById('nativeCurrency');
        if (nativeCurrencyElement) {
            if (this.isConnected && this.networkInfo) {
                // Usar o símbolo da moeda nativa da rede atual
                const networkConfig = NETWORK_CONFIGS[parseInt(this.networkInfo.chainId, 16)];
                const currencySymbol = networkConfig?.nativeCurrency?.symbol || this.networkInfo.currency || 'ETH';
                const currencyName = networkConfig?.nativeCurrency?.name || 'Moeda Nativa';
                nativeCurrencyElement.value = `${currencyName} (${currencySymbol})`;
            } else {
                nativeCurrencyElement.value = '-';
            }
        }

        // Atualizar campo do símbolo da moeda separadamente
        const currencySymbolElement = document.getElementById('currencySymbol');
        if (currencySymbolElement) {
            if (this.isConnected && this.networkInfo) {
                const networkConfig = NETWORK_CONFIGS[parseInt(this.networkInfo.chainId, 16)];
                const currencySymbol = networkConfig?.nativeCurrency?.symbol || this.networkInfo.currency || 'ETH';
                currencySymbolElement.value = currencySymbol;
            } else {
                currencySymbolElement.value = '-';
            }
        }

        // Atualizar campo do saldo separadamente
        const balanceElement = document.getElementById('balance');
        if (balanceElement) {
            if (this.isConnected && this.balance !== null && this.balance !== undefined) {
                const networkConfig = NETWORK_CONFIGS[parseInt(this.networkInfo?.chainId || '0x1', 16)];
                const currencySymbol = networkConfig?.nativeCurrency?.symbol || 'ETH';
                balanceElement.value = `${this.balance} ${currencySymbol}`;
            } else {
                balanceElement.value = '-';
            }
        }

        const rpcUrlElement = document.getElementById('rpcUrl');
        if (rpcUrlElement) {
            if (this.isConnected) {
                const rpcUrl = this.getRpcUrl();
                rpcUrlElement.value = rpcUrl || 'RPC não disponível';
            } else {
                rpcUrlElement.value = '-';
            }
        }
        
        const explorerUrlElement = document.getElementById('explorerUrl');
        if (explorerUrlElement) {
            if (this.isConnected) {
                const explorerUrl = this.getExplorerUrl();
                explorerUrlElement.value = explorerUrl || 'Explorer não disponível';
            } else {
                explorerUrlElement.value = '-';
            }
        }

        // Controlar visibilidade do walletInfo no test-rpc.html e wallet-index.html antigo
        const walletInfo = document.getElementById('walletInfo');
        if (walletInfo) {
            if (this.isConnected) {
                walletInfo.classList.remove('d-none');
            } else {
                walletInfo.classList.add('d-none');
            }
        }

        // Atualizar status de conexão
        const connectionStatus = document.getElementById('connectionStatus');
        const statusMessage = document.getElementById('statusMessage');
        if (connectionStatus && statusMessage) {
            if (this.isConnected) {
                connectionStatus.className = 'alert alert-success mb-3';
                statusMessage.textContent = 'Carteira conectada com sucesso!';
            } else {
                connectionStatus.className = 'alert alert-info d-none mb-3';
                statusMessage.textContent = 'Verificando carteiras disponíveis...';
            }
        }

        // Atualizar indicador de conexão (test-rpc.html)
        const connectionIndicator = document.getElementById('connectionIndicator');
        if (connectionIndicator) {
            if (this.isConnected) {
                connectionIndicator.className = 'badge bg-success';
                connectionIndicator.textContent = 'Conectado';
            } else {
                connectionIndicator.className = 'badge bg-secondary';
                connectionIndicator.textContent = 'Desconectado';
            }
        }

        // Atualizar elementos de Chain ID
        const chainIdElements = document.querySelectorAll('.wallet-chainid, #walletChainId, #chainId');
        chainIdElements.forEach(element => {
            if (element) {
                if (this.isConnected && this.networkInfo && this.networkInfo.chainId) {
                    // Converter Chain ID de hexadecimal para decimal
                    const decimalChainId = parseInt(this.networkInfo.chainId, 16).toString();
                    element.value = decimalChainId;
                    element.textContent = decimalChainId;
                } else {
                    element.value = '-';
                    element.textContent = '-';
                }
            }
        });

        // Atualizar símbolo da moeda nativa
        const currencyElements = document.querySelectorAll('.wallet-currency, #walletCurrency, #nativeCurrency');
        currencyElements.forEach(element => {
            if (element) {
                if (this.isConnected && this.networkInfo) {
                    // Usar o símbolo da moeda nativa da rede atual
                    const networkConfig = NETWORK_CONFIGS[parseInt(this.networkInfo.chainId, 16)];
                    const currencySymbol = networkConfig?.nativeCurrency?.symbol || this.networkInfo.currency || 'ETH';
                    const currencyName = networkConfig?.nativeCurrency?.name || 'Moeda Nativa';
                    element.value = `${currencyName} (${currencySymbol})`;
                    element.textContent = `${currencyName} (${currencySymbol})`;
                } else {
                    element.value = '-';
                    element.textContent = '-';
                }
            }
        });

        // Controlar visibilidade dos botões
        const connectButtons = document.querySelectorAll('#connectBtn, #connectWallet');
        const disconnectButtons = document.querySelectorAll('#disconnectBtn, #disconnectWallet');
        
        connectButtons.forEach(btn => {
            if (btn) {
                if (this.isConnected) {
                    btn.style.display = 'none';
                } else {
                    btn.style.display = 'block';
                }
            }
        });

        disconnectButtons.forEach(btn => {
            if (btn) {
                if (this.isConnected) {
                    btn.style.display = 'block';
                } else {
                    btn.style.display = 'none';
                }
            }
        });

        // Atualizar status
        const statusElements = document.querySelectorAll('.wallet-status, #walletStatus');
        statusElements.forEach(element => {
            if (element) {
                element.textContent = this.isConnected ? 'Conectado' : 'Desconectado';
                element.className = `wallet-status ${this.isConnected ? 'connected' : 'disconnected'}`;
            }
        });

        // Atualizar elementos do header
        this.updateHeaderElements();
        
        // Atualizar elementos da sidebar
        this.updateSidebarElements();

        console.log('🔄 Interface atualizada após conexão');
    }

    /**
     * Atualizar saldo da carteira com cache e debounce
     */
    async updateBalance(forceUpdate = false) {
        if (!this.provider || !this.currentAccount) return;

        // Verificar cache se não for forçado
        if (!forceUpdate && this.isCacheValid()) {
            this.balance = this.balanceCache.value;
            console.log('💾 Usando saldo do cache:', this.balance);
            return;
        }

        // Debounce: cancelar chamada anterior se existir
        if (this.updateBalanceTimeout) {
            clearTimeout(this.updateBalanceTimeout);
        }

        // Evitar múltiplas execuções simultâneas
        if (this.isUpdatingBalance) {
            console.log('⏳ Atualização de saldo já em andamento, ignorando...');
            return;
        }

        this.updateBalanceTimeout = setTimeout(async () => {
            this.isUpdatingBalance = true;
            
            try {
                // Implementar retry logic para evitar circuit breaker
                const balance = await this.retryRpcCall(async () => {
                    return await this.provider.request({
                        method: 'eth_getBalance',
                        params: [this.currentAccount, 'latest']
                    });
                }, 3, 2000); // 3 tentativas com 2 segundos de delay
                
                // Converter de wei para ether
                const balanceValue = (parseInt(balance, 16) / Math.pow(10, 18)).toFixed(4);
                
                // Atualizar cache
                this.updateBalanceCache(balanceValue);
                this.balance = balanceValue;
                
                console.log('✅ Saldo atualizado:', this.balance);
                
                // Atualizar interface após atualização do saldo
                this.updateUI();
                
            } catch (error) {
                console.error('❌ Erro ao obter saldo:', error);
                
                // Tratamento específico para circuit breaker
                if (error.message && error.message.includes('circuit breaker')) {
                    console.log('🔄 Circuit breaker detectado, pausando atualizações por 2 minutos');
                    
                    // Pausar atualizações automáticas por 2 minutos
                    if (balanceUpdateInterval) {
                        clearInterval(balanceUpdateInterval);
                    }
                    
                    setTimeout(() => {
                        console.log('🔄 Retomando atualizações de saldo após pausa');
                        scheduleBalanceUpdate();
                    }, 120000); // 2 minutos
                }
                
                // Se temos cache válido, usar ele em caso de erro
                if (this.balanceCache.timestamp > 0) {
                    this.balance = this.balanceCache.value;
                    console.log('💾 Usando saldo do cache devido ao erro:', this.balance);
                    // Atualizar interface mesmo quando usando cache
                    this.updateUI();
                } else {
                    this.balance = '0';
                    console.log('⚠️ Definindo saldo como 0 devido ao erro sem cache disponível');
                    // Atualizar interface com saldo zero
                    this.updateUI();
                }
                
                // Mostrar status de erro para o usuário
                this.showStatus('Erro ao obter saldo. Usando dados em cache.', 'warning');
            } finally {
                this.isUpdatingBalance = false;
            }
        }, 500); // Debounce de 500ms
    }

    /**
     * Verificar se o cache do saldo é válido
     */
    isCacheValid() {
        const now = Date.now();
        return this.balanceCache.timestamp > 0 && 
               (now - this.balanceCache.timestamp) < this.balanceCache.ttl;
    }

    /**
     * Atualizar cache do saldo
     */
    updateBalanceCache(value) {
        this.balanceCache.value = value;
        this.balanceCache.timestamp = Date.now();
    }

    /**
     * Limpar cache do saldo
     */
    clearBalanceCache() {
        this.balanceCache.value = '0';
        this.balanceCache.timestamp = 0;
    }

    /**
     * Função auxiliar para retry de chamadas RPC
     */
    async retryRpcCall(rpcFunction, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await rpcFunction();
            } catch (error) {
                console.warn(`⚠️ Tentativa ${attempt}/${maxRetries} falhou:`, error.message);
                
                // Se é o último retry ou não é um erro de circuit breaker, lança o erro
                if (attempt === maxRetries || !error.message.includes('circuit breaker')) {
                    throw error;
                }
                
                // Aguarda antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }

    /**
     * Atualizar elementos do header
     */
    updateHeaderElements() {
        const headerAddress = document.getElementById('header-wallet-address');
        const headerBalance = document.getElementById('header-wallet-balance');
        const headerNetwork = document.getElementById('header-network-info');

        if (headerAddress) {
            headerAddress.textContent = this.isConnected ? this.formatAddress(this.currentAccount) : '';
        }
        
        if (headerBalance) {
            headerBalance.textContent = this.isConnected ? `${this.balance} ETH` : '';
        }
        
        if (headerNetwork) {
            headerNetwork.textContent = this.isConnected && this.networkInfo ? this.networkInfo.name : '';
        }
    }

    /**
     * Atualizar elementos da sidebar
     */
    updateSidebarElements() {
        const sidebarAddress = document.getElementById('sidebar-wallet-address');
        const sidebarBalance = document.getElementById('sidebar-wallet-balance');
        const sidebarNetwork = document.getElementById('sidebar-network-info');
        const sidebarStatus = document.getElementById('sidebar-wallet-status');

        if (sidebarAddress) {
            sidebarAddress.textContent = this.isConnected ? this.formatAddress(this.currentAccount) : '';
        }
        
        if (sidebarBalance) {
            sidebarBalance.textContent = this.isConnected ? `${this.balance} ETH` : '';
        }
        
        if (sidebarNetwork) {
            sidebarNetwork.textContent = this.isConnected && this.networkInfo ? this.networkInfo.name : '';
        }
        
        if (sidebarStatus) {
            sidebarStatus.textContent = this.isConnected ? 'Conectado' : 'Desconectado';
            sidebarStatus.className = `wallet-status ${this.isConnected ? 'connected' : 'disconnected'}`;
        }
    }

    /**
     * Mostrar mensagem de status
     */
    showStatus(msg, type = 'info') {
        console.log(`📢 Status [${type}]: ${msg}`);
        
        // Atualizar elemento de status se existir
        const statusElement = document.getElementById('walletStatus');
        if (statusElement) {
            statusElement.textContent = msg;
            statusElement.className = `wallet-status ${type}`;
            
            // Remover classe após 3 segundos
            setTimeout(() => {
                if (statusElement) {
                    statusElement.className = `wallet-status ${this.isConnected ? 'connected' : 'disconnected'}`;
                    statusElement.textContent = this.isConnected ? 'Conectado' : 'Desconectado';
                }
            }, 3000);
        }
    }

    /**
     * Formatar endereço da carteira
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    /**
     * Emitir evento de carteira
     */
    emitWalletEvent(eventType, data) {
        // Emitir evento customizado
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
        
        // Compatibilidade com EventBus se disponível
        if (window.EventBus && typeof window.EventBus.emit === 'function') {
            window.EventBus.emit(eventType, data);
        }
        
        console.log(`📡 Evento emitido: ${eventType}`, data);
    }

    /**
     * Verificar se MetaMask está disponível
     */
    isMetaMaskAvailable() {
        return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
    }

    /**
     * Obter informações da sessão
     */
    getSessionInfo() {
        return {
            isConnected: this.isConnected,
            currentAccount: this.currentAccount,
            walletType: this.walletType,
            networkInfo: this.networkInfo,
            balance: this.balance,
            tokenBalance: this.tokenBalance
        };
    }

    /**
     * Adicionar token à carteira
     */
    async addTokenToWallet(tokenData, walletType = 'metamask') {
        if (!this.isConnected || !this.provider) {
            throw new Error('Carteira não conectada');
        }

        try {
            const wasAdded = await this.provider.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: tokenData.address,
                        symbol: tokenData.symbol,
                        decimals: tokenData.decimals || 18,
                        image: tokenData.image || ''
                    }
                }
            });

            if (wasAdded) {
                console.log('✅ Token adicionado à carteira:', tokenData.symbol);
                this.showStatus(`Token ${tokenData.symbol} adicionado!`, 'success');
            } else {
                console.log('ℹ️ Usuário rejeitou adicionar o token');
                this.showStatus('Token não foi adicionado', 'warning');
            }

            return wasAdded;
        } catch (error) {
            console.error('❌ Erro ao adicionar token:', error);
            this.showStatus('Erro ao adicionar token', 'error');
            throw error;
        }
    }

    /**
     * Detectar carteiras instaladas
     */
    async detectInstalledWallets() {
        const wallets = {
            metamask: false,
            trustwallet: false,
            walletconnect: false
        };

        // Verificar MetaMask
        if (window.ethereum?.isMetaMask) {
            wallets.metamask = true;
        }

        // Verificar Trust Wallet
        if (window.ethereum?.isTrust || window.ethereum?.isTrustWallet) {
            wallets.trustwallet = true;
        }

        // Verificar WalletConnect (se Web3Modal estiver disponível)
        if (this.web3Modal) {
            wallets.walletconnect = true;
        }

        console.log('🔍 Carteiras detectadas:', wallets);
        return wallets;
    }

    /**
     * Obter nome da rede
     */
    getNetworkName(chainId) {
        const networks = {
            '0x1': 'Ethereum Mainnet',
            '0x3': 'Ropsten Testnet',
            '0x4': 'Rinkeby Testnet',
            '0x5': 'Goerli Testnet',
            '0x2a': 'Kovan Testnet',
            '0x89': 'Polygon Mainnet',
            '0x13881': 'Polygon Mumbai',
            '0x38': 'BSC Mainnet',
            '0x61': 'BSC Testnet'
        };
        return networks[chainId] || `Rede ${chainId}`;
    }

    /**
     * Obter moeda da rede
     */
    getNetworkCurrency(chainId) {
        const currencies = {
            '0x1': 'ETH',
            '0x3': 'ETH',
            '0x4': 'ETH',
            '0x5': 'ETH',
            '0x2a': 'ETH',
            '0x89': 'MATIC',
            '0x13881': 'MATIC',
            '0x38': 'BNB',
            '0x61': 'BNB'
        };
        return currencies[chainId] || 'ETH';
    }

    /**
     * Obter RPC URL da rede atual
     */
    getRpcUrl() {
        if (!this.networkInfo || !this.networkInfo.chainId) return '';
        
        // Primeiro, tentar obter da configuração local
        const chainIdDecimal = parseInt(this.networkInfo.chainId, 16);
        const networkConfig = NETWORK_CONFIGS[chainIdDecimal];
        
        if (networkConfig && networkConfig.rpcUrl) {
            return networkConfig.rpcUrl;
        }
        
        // Fallback para URLs conhecidas
        const rpcUrls = {
            '0x1': 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
            '0x5': 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
            '0x89': 'https://polygon-rpc.com/',
            '0x13881': 'https://rpc-mumbai.maticvigil.com/',
            '0x38': 'https://bsc-dataseed.binance.org/',
            '0x61': 'https://data-seed-prebsc-1-s1.binance.org:8545/',
            '0xa4b1': 'https://arb1.arbitrum.io/rpc',
            '0xa': 'https://mainnet.optimism.io',
            '0xa86a': 'https://api.avax.network/ext/bc/C/rpc'
        };
        
        return rpcUrls[this.networkInfo.chainId] || 'RPC não disponível';
    }

    /**
     * Obter URL do explorer da rede atual
     */
    getExplorerUrl() {
        if (!this.networkInfo || !this.networkInfo.chainId) return '';
        
        // Primeiro, tentar obter da configuração local
        const chainIdDecimal = parseInt(this.networkInfo.chainId, 16);
        const networkConfig = NETWORK_CONFIGS[chainIdDecimal];
        
        if (networkConfig && networkConfig.blockExplorerUrls) {
            return networkConfig.blockExplorerUrls;
        }
        
        // Fallback para URLs conhecidas
        const explorerUrls = {
            '0x1': 'https://etherscan.io',
            '0x5': 'https://goerli.etherscan.io',
            '0x89': 'https://polygonscan.com',
            '0x13881': 'https://mumbai.polygonscan.com',
            '0x38': 'https://bscscan.com',
            '0x61': 'https://testnet.bscscan.com',
            '0xa4b1': 'https://arbiscan.io',
            '0xa': 'https://optimistic.etherscan.io',
            '0xa86a': 'https://snowtrace.io'
        };
        
        return explorerUrls[this.networkInfo.chainId] || '';
    }

    /**
     * Inicializar funcionalidades de busca de redes
     */
    initNetworkSearch() {
        const networkSearch = document.getElementById('networkSearch');
        const networkAutocomplete = document.getElementById('networkAutocomplete');
        
        if (networkSearch && networkAutocomplete) {
            let searchTimeout;
            
            networkSearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const searchTerm = e.target.value.trim();
                
                if (searchTerm.length < 2) {
                    networkAutocomplete.style.display = 'none';
                    return;
                }
                
                searchTimeout = setTimeout(async () => {
                    await this.performNetworkSearch(searchTerm);
                }, 300);
            });
            
            // Fechar autocomplete ao clicar fora
            document.addEventListener('click', (e) => {
                if (!networkSearch.contains(e.target) && !networkAutocomplete.contains(e.target)) {
                    networkAutocomplete.style.display = 'none';
                }
            });
        }
        
        // Inicializar botões de gerenciamento de rede
        this.initNetworkManagementButtons();
    }
    
    /**
     * Realizar busca de redes
     */
    async performNetworkSearch(searchTerm) {
        const networkAutocomplete = document.getElementById('networkAutocomplete');
        
        try {
            // Mostrar loading
            networkAutocomplete.innerHTML = '<div class="list-group-item text-center"><i class="fas fa-spinner fa-spin"></i> Buscando...</div>';
            networkAutocomplete.style.display = 'block';
            
            // Buscar redes
            const networks = await this.searchNetworks(searchTerm);
            
            if (networks.length === 0) {
                networkAutocomplete.innerHTML = '<div class="list-group-item text-muted">Nenhuma rede encontrada</div>';
                return;
            }
            
            // Limitar resultados
            const limitedNetworks = networks.slice(0, 10);
            
            // Renderizar resultados
            networkAutocomplete.innerHTML = limitedNetworks.map(network => `
                <div class="list-group-item list-group-item-action network-item" 
                     data-network='${JSON.stringify(network)}' 
                     style="cursor: pointer;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${network.name}</h6>
                            <small class="text-muted">Chain ID: ${network.chainId} | ${network.nativeCurrency?.symbol || 'N/A'}</small>
                        </div>
                        <small class="text-primary">Clique para selecionar</small>
                    </div>
                </div>
            `).join('');
            
            // Adicionar event listeners aos itens
            networkAutocomplete.querySelectorAll('.network-item').forEach(item => {
                item.addEventListener('click', () => {
                    const networkData = JSON.parse(item.dataset.network);
                    this.selectNetwork(networkData);
                    networkAutocomplete.style.display = 'none';
                });
            });
            
        } catch (error) {
            console.error('❌ Erro na busca de redes:', error);
            networkAutocomplete.innerHTML = '<div class="list-group-item text-danger">Erro ao buscar redes</div>';
        }
    }
    
    /**
     * Selecionar uma rede
     */
    async selectNetwork(networkData) {
        try {
            console.log('🌐 Rede selecionada:', networkData);
            
            // Preencher campos da rede selecionada
            const elements = {
                selectedNetworkName: networkData.name,
                selectedChainId: networkData.chainId,
                selectedNativeCurrency: networkData.nativeCurrency?.name || 'N/A',
                selectedCurrencySymbol: networkData.nativeCurrency?.symbol || 'N/A'
            };
            
            Object.entries(elements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) element.value = value;
            });
            
            // Obter RPCs funcionais
            const rpcs = await this.getWorkingRpcs(networkData.chainId);
            const rpcUrl = rpcs[0] || (networkData.rpc && networkData.rpc[0]) || '';
            
            const rpcElement = document.getElementById('selectedRpcUrl');
            if (rpcElement) rpcElement.value = rpcUrl;
            
            // Block Explorer
            const explorerUrl = networkData.explorers && networkData.explorers[0] ? networkData.explorers[0].url : '';
            const explorerElement = document.getElementById('selectedExplorerUrl');
            if (explorerElement) explorerElement.value = explorerUrl;
            
            // Mostrar seções ocultas
            this.showNetworkSections();
            
            // Habilitar botões
            this.enableNetworkButtons();
            
            // Salvar dados da rede
            const networkDataElement = document.getElementById('selectedNetworkData');
            if (networkDataElement) {
                networkDataElement.value = JSON.stringify({
                    ...networkData,
                    rpcUrl: rpcUrl,
                    explorerUrl: explorerUrl
                });
            }
            
        } catch (error) {
            console.error('❌ Erro ao selecionar rede:', error);
            this.showNetworkError('Erro ao selecionar rede');
        }
    }
    
    /**
     * Mostrar seções de rede
     */
    showNetworkSections() {
        const sections = [
            'selected-network-section',
            'selected-currency-section', 
            'selected-urls-section',
            'custom-rpc-section',
            'network-management-section'
        ];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.remove('hidden-section');
                section.style.display = 'block';
            }
        });
    }
    
    /**
     * Habilitar botões de gerenciamento de rede
     */
    enableNetworkButtons() {
        const buttons = ['addNetworkBtn', 'testRpcBtn'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) button.disabled = false;
        });
    }
    
    /**
     * Inicializar botões de gerenciamento de rede
     */
    initNetworkManagementButtons() {
        // Botão adicionar rede
        const addNetworkBtn = document.getElementById('addNetworkBtn');
        if (addNetworkBtn) {
            addNetworkBtn.addEventListener('click', () => this.handleAddNetwork());
        }
        
        // Botão testar RPC
        const testRpcBtn = document.getElementById('testRpcBtn');
        if (testRpcBtn) {
            testRpcBtn.addEventListener('click', () => this.handleTestRpc());
        }
        
        // Botão limpar
        const clearNetworkBtn = document.getElementById('clearNetworkBtn');
        if (clearNetworkBtn) {
            clearNetworkBtn.addEventListener('click', () => this.handleClearNetwork());
        }

        // Capturar alterações no textarea de RPCs personalizados durante a sessão
        const customUrlsTextarea = document.getElementById('customRpcUrls');
        if (customUrlsTextarea) {
            customUrlsTextarea.addEventListener('input', () => {
                const urls = customUrlsTextarea.value.split('\n').map(u => u.trim()).filter(Boolean);
                const normalizedUrls = urls.map(u => this.normalizeRpcUrl(u)).filter(Boolean);
                if (this.networkInfo && this.networkInfo.chainId) {
                    const cid = this.normalizeChainIdHex(this.networkInfo.chainId);
                    if (cid) {
                        this.sessionRpcs[cid] = Array.from(new Set(normalizedUrls));
                    }
                }
                this.updateCustomRpcsDisplay();
            });
        }
    }
    
    /**
     * Manipular adição de rede
     */
    async handleAddNetwork() {
        try {
            const networkDataElement = document.getElementById('selectedNetworkData');
            if (!networkDataElement || !networkDataElement.value) {
                this.showNetworkError('Nenhuma rede selecionada');
                return;
            }
            
            const networkData = JSON.parse(networkDataElement.value);
            
            // Obter RPC personalizada se fornecida
            const customRpcUrls = document.getElementById('customRpcUrls');
            let rpcUrl = networkData.rpcUrl;
            
            if (customRpcUrls && customRpcUrls.value.trim()) {
                const customUrls = customRpcUrls.value.trim().split('\n').filter(url => url.trim());
                if (customUrls.length > 0) {
                    rpcUrl = customUrls[0].trim();
                }
            }
            
            // Configurar dados da rede para MetaMask
            const networkConfig = {
                chainId: `0x${networkData.chainId.toString(16)}`,
                chainName: networkData.name,
                rpcUrl: rpcUrl,
                nativeCurrency: {
                    name: networkData.nativeCurrency?.name || 'Unknown',
                    symbol: networkData.nativeCurrency?.symbol || 'UNK',
                    decimals: networkData.nativeCurrency?.decimals || 18
                },
                blockExplorerUrls: networkData.explorerUrl || ''
            };
            
            // Adicionar rede
            await this.addCustomNetwork(networkConfig);
            this.showNetworkSuccess('Rede adicionada com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro ao adicionar rede:', error);
            this.showNetworkError(error.message || 'Erro ao adicionar rede');
        }
    }
    
    /**
     * Testar conectividade RPC
     */
    async handleTestRpc() {
        try {
            const rpcUrlElement = document.getElementById('selectedRpcUrl');
            const customRpcUrls = document.getElementById('customRpcUrls');
            
            let rpcUrl = rpcUrlElement ? rpcUrlElement.value : '';
            
            // Usar RPC personalizada se fornecida
            if (customRpcUrls && customRpcUrls.value.trim()) {
                const customUrls = customRpcUrls.value.trim().split('\n').filter(url => url.trim());
                if (customUrls.length > 0) {
                    rpcUrl = customUrls[0].trim();
                }
            }
            
            if (!rpcUrl) {
                this.showNetworkError('URL RPC não encontrada');
                return;
            }
            
            // Mostrar loading
            this.showRpcTestResult('Testando conectividade...', 'info');
            
            // Testar conectividade
            const result = await this.testRpcConnection(rpcUrl);
            
            if (result.success) {
                this.showRpcTestResult(
                    `Conectividade OK! Bloco atual: ${result.blockNumber} | Tempo: ${result.responseTime}ms`,
                    'success'
                );
            } else {
                this.showRpcTestResult(`Erro: ${result.error}`, 'danger');
            }
            
        } catch (error) {
            console.error('❌ Erro no teste RPC:', error);
            this.showRpcTestResult('Erro no teste de conectividade', 'danger');
        }
    }
    
    /**
     * Testar conectividade RPC
     */
    async testRpcConnection(rpcUrl) {
        try {
            const startTime = Date.now();
            
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_blockNumber',
                    params: [],
                    id: 1
                })
            });
            
            const endTime = Date.now();
            const responseTime = endTime - startTime;
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(`RPC Error: ${data.error.message}`);
            }
            
            const blockNumber = parseInt(data.result, 16);
            
            return {
                success: true,
                blockNumber: blockNumber,
                responseTime: responseTime
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Limpar seleção de rede
     */
    handleClearNetwork() {
        // Limpar campos
        const fields = [
            'networkSearch',
            'selectedNetworkName',
            'selectedChainId', 
            'selectedNativeCurrency',
            'selectedCurrencySymbol',
            'selectedRpcUrl',
            'selectedExplorerUrl',
            'customRpcUrls',
            'selectedNetworkData'
        ];
        
        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
        
        // Ocultar seções
        const sections = [
            'selected-network-section',
            'selected-currency-section',
            'selected-urls-section', 
            'custom-rpc-section',
            'network-management-section'
        ];
        
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.classList.add('hidden-section');
                section.style.display = 'none';
            }
        });
        
        // Desabilitar botões
        const buttons = ['addNetworkBtn', 'testRpcBtn'];
        buttons.forEach(buttonId => {
            const button = document.getElementById(buttonId);
            if (button) button.disabled = true;
        });
        
        // Ocultar mensagens
        this.hideNetworkMessages();
    }
    
    /**
     * Mostrar erro de rede
     */
    showNetworkError(message) {
        const errorDiv = document.getElementById('networkErrorMessage');
        const errorText = document.getElementById('networkErrorText');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
            
            // Ocultar outras mensagens
            const successDiv = document.getElementById('networkSuccessMessage');
            if (successDiv) successDiv.style.display = 'none';
        }
    }
    
    /**
     * Mostrar sucesso de rede
     */
    showNetworkSuccess(message) {
        const successDiv = document.getElementById('networkSuccessMessage');
        const successText = document.getElementById('networkSuccessText');
        
        if (successDiv && successText) {
            successText.textContent = message;
            successDiv.style.display = 'block';
            
            // Ocultar outras mensagens
            const errorDiv = document.getElementById('networkErrorMessage');
            if (errorDiv) errorDiv.style.display = 'none';
        }
    }
    
    /**
     * Mostrar resultado do teste RPC
     */
    showRpcTestResult(message, type = 'info') {
        const resultDiv = document.getElementById('rpcTestResult');
        const resultText = document.getElementById('rpcTestText');
        
        if (resultDiv && resultText) {
            resultText.textContent = message;
            resultDiv.className = `alert alert-${type} mt-3`;
            resultDiv.style.display = 'block';
        }
    }
    
    /**
     * Ocultar mensagens de rede
     */
    hideNetworkMessages() {
        const messages = [
            'networkErrorMessage',
            'networkSuccessMessage', 
            'rpcTestResult'
        ];
        
        messages.forEach(messageId => {
            const message = document.getElementById(messageId);
            if (message) message.style.display = 'none';
        });
    }

    /**
     * Adicionar rede personalizada
     */
    async addCustomNetwork(networkConfig) {
        if (!this.provider) {
            throw new Error('Carteira não conectada');
        }

        try {
            await this.provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: networkConfig.chainId,
                    chainName: networkConfig.chainName,
                    rpcUrls: [networkConfig.rpcUrl],
                    nativeCurrency: networkConfig.nativeCurrency,
                    blockExplorerUrls: [networkConfig.blockExplorerUrls]
                }]
            });

            console.log('✅ Rede adicionada:', networkConfig.chainName);
            this.showStatus(`Rede ${networkConfig.chainName} adicionada!`, 'success');
            return true;

        } catch (error) {
            console.error('❌ Erro ao adicionar rede:', error);
            this.showStatus('Erro ao adicionar rede', 'error');
            throw error;
        }
    }

    /**
     * Trocar para uma rede específica
     */
    async switchToNetwork(chainId) {
        if (!this.provider) {
            throw new Error('Carteira não conectada');
        }

        try {
            await this.provider.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: chainId }]
            });

            console.log('✅ Rede alterada para:', chainId);
            return true;

        } catch (error) {
            // Se a rede não existe, tentar adicionar
            if (error.code === 4902) {
                const chainIdDecimal = parseInt(chainId, 16);
                const networkConfig = NETWORK_CONFIGS[chainIdDecimal];
                
                if (networkConfig) {
                    return await this.addCustomNetwork(networkConfig);
                } else {
                    // Tentar buscar no ChainList
                    try {
                        const chainData = await this.chainList.getChainById(chainIdDecimal);
                        if (chainData) {
                            const rpcs = await this.chainList.getWorkingRpcs(chainIdDecimal);
                            const rpcUrl = rpcs[0] || chainData.rpc[0];
                            
                            const config = {
                                chainId: chainId,
                                chainName: chainData.name,
                                rpcUrl: rpcUrl,
                                nativeCurrency: {
                                    name: chainData.nativeCurrency.name,
                                    symbol: chainData.nativeCurrency.symbol,
                                    decimals: chainData.nativeCurrency.decimals
                                },
                                blockExplorerUrls: chainData.explorers && chainData.explorers[0] ? chainData.explorers[0].url : ''
                            };
                            
                            return await this.addCustomNetwork(config);
                        }
                    } catch (chainListError) {
                        console.error('❌ Erro ao buscar rede no ChainList:', chainListError);
                    }
                }
            }
            
            console.error('❌ Erro ao trocar rede:', error);
            this.showStatus('Erro ao trocar rede', 'error');
            throw error;
        }
    }

    /**
     * Buscar redes disponíveis
     */
    async searchNetworks(searchTerm) {
        try {
            return await this.chainList.searchChains(searchTerm);
        } catch (error) {
            console.error('❌ Erro ao buscar redes:', error);
            return [];
        }
    }

    /**
     * Obter RPCs funcionais para uma rede
     */
    async getWorkingRpcs(chainIdInput) {
        try {
            // Aceita chainId em hex ("0x...") ou decimal e normaliza para decimal
            let chainIdNormalized = null;
            if (typeof chainIdInput === 'string') {
                const s = chainIdInput.trim();
                if (/^0x[0-9a-fA-F]+$/.test(s)) {
                    chainIdNormalized = parseInt(s, 16);
                } else if (/^\d+$/.test(s)) {
                    chainIdNormalized = parseInt(s, 10);
                }
            } else if (typeof chainIdInput === 'number') {
                chainIdNormalized = chainIdInput;
            }

            if (chainIdNormalized === null || Number.isNaN(chainIdNormalized)) {
                console.warn('getWorkingRpcs: chainId inválido', chainIdInput);
                return [];
            }

            return await this.chainList.getWorkingRpcs(chainIdNormalized);
        } catch (error) {
            console.error('❌ Erro ao obter RPCs:', error);
            return [];
        }
    }

    /**
     * Limpar tudo e recomeçar
     */
    async clearAndRestart() {
        try {
            console.log('🧹 Limpando e recomeçando...');
            
            // Desconectar carteira
            await this.disconnect(false);
            
            // Limpar localStorage
            localStorage.removeItem('TokenCafeWalletSession');
            localStorage.removeItem('walletconnect');
            localStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER');
            
            // Limpar dados globais
            if (window.TokenCafeWalletData) {
                delete window.TokenCafeWalletData;
            }
            
            // Recarregar a página para garantir estado limpo
            setTimeout(() => {
                window.location.reload();
            }, 500);
            
            this.showStatus('Limpando e recomeçando...', 'info');
            
        } catch (error) {
            console.error('❌ Erro ao limpar:', error);
            this.showStatus('Erro ao limpar', 'error');
        }
    }

    /**
     * Compartilhar endereço da carteira
     */
    shareAddress() {
        if (!this.currentAccount) {
            this.showStatus('Nenhuma carteira conectada', 'error');
            return;
        }

        const shareData = {
            title: 'Endereço da Carteira - TokenCafe',
            text: 'Confira meu endereço de carteira:',
            url: `${window.location.origin}${window.location.pathname}?address=${this.currentAccount}`
        };

        if (navigator.share) {
            navigator.share(shareData).catch(() => {
                this.showStatus('Erro ao compartilhar endereço', 'error');
            });
        } else {
            // Fallback: copiar para clipboard
            navigator.clipboard.writeText(this.currentAccount).then(() => {
                this.showStatus('Endereço copiado (compartilhamento não suportado)', 'info');
            }).catch(() => {
                this.showStatus('Erro ao copiar endereço', 'error');
            });
        }
    }

    /**
     * Visualizar endereço na rede blockchain
     */
    viewAddressOnNetwork() {
        if (!this.currentAccount) {
            this.showStatus('Nenhuma carteira conectada', 'error');
            return;
        }

        const explorerUrl = this.getExplorerUrl();
        if (explorerUrl) {
            const addressUrl = `${explorerUrl}/address/${this.currentAccount}`;
            window.open(addressUrl, '_blank');
        } else {
            this.showStatus('URL do explorador não disponível', 'error');
        }
    }

    /**
     * Atualizar informações detalhadas da carteira
     */
    async updateWalletDetails() {
        if (!this.isConnected || !window.ethereum) return;

        try {
            // Provedor da carteira
            const walletProviderElement = document.getElementById('walletProvider');
            if (walletProviderElement) {
                let providerName = 'Desconhecido';
                if (window.ethereum.isMetaMask) providerName = 'MetaMask';
                else if (window.ethereum.isTrust) providerName = 'Trust Wallet';
                else if (window.ethereum.isCoinbaseWallet) providerName = 'Coinbase Wallet';
                else if (window.ethereum.isRabby) providerName = 'Rabby Wallet';
                else if (window.ethereum.isBraveWallet) providerName = 'Brave Wallet';
                else if (window.ethereum.isFrame) providerName = 'Frame';
                else if (window.ethereum.isTokenPocket) providerName = 'TokenPocket';
                else if (window.ethereum.isMathWallet) providerName = 'MathWallet';
                else if (window.ethereum.isImToken) providerName = 'imToken';
                else if (window.ethereum.isStatus) providerName = 'Status';
                else if (window.ethereum.isOpera) providerName = 'Opera Wallet';
                else if (window.ethereum.isAlphaWallet) providerName = 'AlphaWallet';
                else if (window.ethereum.isToshi) providerName = 'Coinbase Wallet';
                else if (window.ethereum.isGoWallet) providerName = 'GoWallet';
                else if (window.ethereum.isHyperPay) providerName = 'HyperPay';
                else if (window.ethereum.isWalletConnect) providerName = 'WalletConnect';
                
                walletProviderElement.value = providerName;
            }

            // Versão da carteira
            const walletVersionElement = document.getElementById('walletVersion');
            if (walletVersionElement) {
                const version = window.ethereum.version || window.ethereum._metamask?.version || 'N/A';
                walletVersionElement.value = version;
            }

            // Chain ID conectado
            const walletChainIdElement = document.getElementById('walletChainId');
            if (walletChainIdElement) {
                const chainId = await window.ethereum.request({ method: 'eth_chainId' });
                walletChainIdElement.value = chainId;
            }

            // Versão da rede
            const walletNetworkVersionElement = document.getElementById('walletNetworkVersion');
            if (walletNetworkVersionElement) {
                const networkVersion = await window.ethereum.request({ method: 'net_version' });
                walletNetworkVersionElement.value = networkVersion;
            }

            // Capacidades suportadas
            const walletCapabilitiesElement = document.getElementById('walletCapabilities');
            if (walletCapabilitiesElement) {
                const capabilities = [];
                
                // Verificar métodos suportados
                if (window.ethereum.request) capabilities.push('JSON-RPC');
                if (window.ethereum.enable) capabilities.push('Legacy Enable');
                if (window.ethereum.isConnected) capabilities.push('Connection Status');
                if (window.ethereum.selectedAddress !== undefined) capabilities.push('Selected Address');
                if (window.ethereum.networkVersion !== undefined) capabilities.push('Network Version');
                if (window.ethereum.chainId !== undefined) capabilities.push('Chain ID');
                
                // Verificar eventos suportados
                if (window.ethereum.on) {
                    capabilities.push('Event Listeners');
                    capabilities.push('Account Change Events');
                    capabilities.push('Chain Change Events');
                }
                
                // Verificar recursos específicos
                if (window.ethereum.isMetaMask) capabilities.push('MetaMask API');
                if (window.ethereum.autoRefreshOnNetworkChange !== undefined) capabilities.push('Auto Refresh');
                if (window.ethereum._metamask) capabilities.push('MetaMask Provider');
                
                walletCapabilitiesElement.value = capabilities.join(', ') || 'Nenhuma capacidade detectada';
            }

            // Status de conexão
            const walletConnectedElement = document.getElementById('walletConnected');
            if (walletConnectedElement) {
                const isConnected = window.ethereum.isConnected ? window.ethereum.isConnected() : true;
                walletConnectedElement.value = isConnected ? 'Conectado' : 'Desconectado';
            }

            // Contas disponíveis
            const walletAccountsElement = document.getElementById('walletAccounts');
            if (walletAccountsElement) {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    walletAccountsElement.value = `${accounts.length} conta(s) disponível(is)`;
                } catch (error) {
                    walletAccountsElement.value = 'Erro ao obter contas';
                }
            }

            // Permissões concedidas
            const walletPermissionsElement = document.getElementById('walletPermissions');
            if (walletPermissionsElement) {
                try {
                    const permissions = await window.ethereum.request({ method: 'wallet_getPermissions' });
                    const permissionsList = permissions.map(p => p.parentCapability || p.caveats?.map(c => c.type).join(', ') || 'Permissão desconhecida');
                    walletPermissionsElement.value = permissionsList.join(', ') || 'Nenhuma permissão específica detectada';
                } catch (error) {
                    walletPermissionsElement.value = 'Permissões básicas de acesso à conta';
                }
            }

            // RPCs Personalizados: exibir somente o RPC ativo detectável via provider
            const customRpcsElement = document.getElementById('customRpcs');
            if (customRpcsElement) {
                try {
                    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
                    // Atualizar contexto de rede e obter RPC ativo
                    this.networkInfo = this.networkInfo || {};
                    this.networkInfo.chainId = chainIdHex;
                    // Atualiza exibição com base nos RPCs capturados em sessão
                    this.updateCustomRpcsDisplay();
                } catch (rpcError) {
                    console.error('Erro ao carregar RPCs personalizados:', rpcError);
                    customRpcsElement.value = 'Erro ao carregar RPCs';
                }
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar detalhes da carteira:', error);
        }
    }

    // ===== RPCs da Sessão (memória) =====
    normalizeRpcUrl(url) {
        if (!url || typeof url !== 'string') return null;
        const trimmed = url.trim();
        // Aceitar HTTP e HTTPS, mas filtrar placeholders/templates
        if (!/^https?:\/\//i.test(trimmed)) return null;
        if(/\{.*\}/.test(trimmed)) return null; // ignorar templates com placeholders
        return trimmed;
    }

    // Normaliza chainId para string hexadecimal com prefixo 0x (minúsculo)
    normalizeChainIdHex(chainId) {
        if (!chainId && chainId !== 0) return null;
        // Se já é string hex (com 0x), padroniza para minúsculo
        if (typeof chainId === 'string') {
            const s = chainId.trim();
            if (/^0x[0-9a-fA-F]+$/.test(s)) return s.toLowerCase();
            // Se é string numérica decimal
            if (/^\d+$/.test(s)) {
                const n = parseInt(s, 10);
                if (!isNaN(n)) return '0x' + n.toString(16);
            }
            return null;
        }
        // Se é número
        if (typeof chainId === 'number') {
            return '0x' + chainId.toString(16);
        }
        return null;
    }

    addSessionRpc(url, chainIdHex = null) {
        const normalized = this.normalizeRpcUrl(url);
        if (!normalized) return;
        const cidRaw = chainIdHex || (this.networkInfo && this.networkInfo.chainId);
        const cid = this.normalizeChainIdHex(cidRaw);
        if (!cid) return;
        const list = this.sessionRpcs[cid] || [];
        if (!list.includes(normalized)) {
            this.sessionRpcs[cid] = [...list, normalized];
            this.updateCustomRpcsDisplay();
        }
    }

    getSessionRpcList(chainIdHex = null) {
        const cidRaw = chainIdHex || (this.networkInfo && this.networkInfo.chainId);
        const cid = this.normalizeChainIdHex(cidRaw);
        return cid ? (this.sessionRpcs[cid] || []) : [];
    }

    // Tenta capturar RPC(s) diretamente do provider da carteira conectada (MetaMask e similares)
    async getMetaMaskRpcUrls(chainIdHex = null) {
        const urls = [];
        try {
            const provider = window.ethereum;
            if (!provider) return urls;

            // Evita chamadas a métodos não suportados no MetaMask que geram erros no console
            const isMetaMask = !!provider.isMetaMask;
            if (!isMetaMask) {
                // Tenta APIs de estado do provider (não padrão, pode não existir)
                try {
                    const state = await provider.request({ method: 'wallet_getProviderState' });
                    const rpc = state?.providerConfig?.rpcUrl || state?.rpcUrl;
                    if (typeof rpc === 'string') urls.push(rpc);
                } catch (_) {}

                try {
                    const mmState = await provider.request({ method: 'metamask_getProviderState' });
                    const rpc = mmState?.providerConfig?.rpcUrl || mmState?.rpcUrl;
                    if (typeof rpc === 'string') urls.push(rpc);
                } catch (_) {}
            }

            // Alguns providers expõem internamente o rpcUrl
            const internalRpc = provider._rpcUrl || provider.rpcUrl || provider.providerConfig?.rpcUrl;
            if (typeof internalRpc === 'string') urls.push(internalRpc);

            // Filtra e normaliza
            const filtered = urls
                .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
                .filter((u) => !u.includes('${') && !u.includes('API_KEY'));

            // Remove duplicados
            return Array.from(new Set(filtered));
        } catch (err) {
            console.warn('getMetaMaskRpcUrls: não foi possível capturar RPC do provider', err);
            return [];
        }
    }

    async updateCustomRpcsDisplay() {
        const el = document.getElementById('customRpcs');
        if (!el) return;
        const sessionList = this.getSessionRpcList();
        const chainIdHex = this.networkInfo && this.networkInfo.chainId ? this.normalizeChainIdHex(this.networkInfo.chainId) : null;

        const set = new Set();
        // Adiciona RPCs da sessão
        sessionList.forEach((u) => {
            const n = this.normalizeRpcUrl(u);
            if (n) set.add(n);
        });

        try {
            // Converte para decimal ao obter RPCs conhecidos da rede
            let knownList = [];
            if (chainIdHex && typeof this.getWorkingRpcs === 'function') {
                knownList = await this.getWorkingRpcs(chainIdHex);
            }
            if (Array.isArray(knownList)) {
                knownList.forEach((u) => {
                    const n = this.normalizeRpcUrl(u);
                    if (n) set.add(n);
                });
            }

            // Tenta capturar RPC ativo diretamente do provider da carteira
            let providerRpcs = [];
            if (chainIdHex && typeof this.getMetaMaskRpcUrls === 'function') {
                providerRpcs = await this.getMetaMaskRpcUrls(chainIdHex);
            }
            if (Array.isArray(providerRpcs)) {
                providerRpcs.forEach((u) => {
                    const n = this.normalizeRpcUrl(u);
                    if (n) set.add(n);
                });
            }
        } catch (e) {
            console.warn('updateCustomRpcsDisplay: erro ao unir RPCs', e);
        }

        const combined = Array.from(set);
        if (combined.length > 0) {
            el.value = combined.join('\n');
        } else {
            const currentRpc = this.getRpcUrl();
            if (currentRpc && /^https?:\/\//i.test(currentRpc)) {
                el.value = currentRpc;
            } else {
                el.value = 'Nenhum RPC capturado nesta sessão';
            }
        }
    }
}

// Variável global para o gerenciador
let walletManager;

/**
 * Inicializar Wallet Manager
 */
function initializeWalletManager() {
    console.log('🚀 Inicializando TokenCafe Wallet Manager...');
    
    walletManager = new TokenCafeWalletManager();
    
    // Expor globalmente para compatibilidade
    window.TokenCafeWallet = walletManager;
    window.walletManager = walletManager;
    
    // Funções de conveniência globais
    window.connectWallet = () => walletManager.connectWallet();
    window.disconnectWallet = () => walletManager.disconnect();
    window.connectWalletFromHeader = () => walletManager.connectWallet();
    window.disconnectWalletFromHeader = () => walletManager.disconnect();
    window.isWalletConnected = () => walletManager.isConnected;
    window.getCurrentAccount = () => walletManager.currentAccount;
    window.formatWalletAddress = (address) => walletManager.formatAddress(address);
    
    // Funções de token
    window.addTokenToWallet = (tokenData, walletType) => walletManager.addTokenToWallet(tokenData, walletType);
    window.detectInstalledWallets = () => walletManager.detectInstalledWallets();
    
    // Funções de rede
    window.addCustomNetwork = (networkConfig) => walletManager.addCustomNetwork(networkConfig);
    window.switchToNetwork = (chainId) => walletManager.switchToNetwork(chainId);
    window.searchNetworks = (searchTerm) => walletManager.searchNetworks(searchTerm);
    window.getWorkingRpcs = (chainId) => walletManager.getWorkingRpcs(chainId);
    
    // Namespace TokenCafe
    if (!window.TokenCafe) window.TokenCafe = {};
    if (!window.TokenCafe.wallet) window.TokenCafe.wallet = {};
    
    window.TokenCafe.wallet.addTokenToWallet = (tokenData, walletType) => walletManager.addTokenToWallet(tokenData, walletType);
    window.TokenCafe.wallet.detectInstalledWallets = () => walletManager.detectInstalledWallets();
    window.TokenCafe.wallet.isConnected = () => walletManager.isConnected;
    window.TokenCafe.wallet.getCurrentAccount = () => walletManager.currentAccount;
    window.TokenCafe.wallet.addCustomNetwork = (networkConfig) => walletManager.addCustomNetwork(networkConfig);
    window.TokenCafe.wallet.switchToNetwork = (chainId) => walletManager.switchToNetwork(chainId);
    window.TokenCafe.wallet.searchNetworks = (searchTerm) => walletManager.searchNetworks(searchTerm);
    window.TokenCafe.wallet.getWorkingRpcs = (chainId) => walletManager.getWorkingRpcs(chainId);
    
    // ===== UI: Importar RPCs da MetaMask via colagem =====
    try {
        const pasteBtn = document.getElementById('pasteMetaMaskRpcsBtn');
        const customRpcsEl = document.getElementById('customRpcs');
        if (pasteBtn && customRpcsEl) {
            pasteBtn.addEventListener('click', () => {
                // Permitir edição e orientar o usuário
                customRpcsEl.removeAttribute('readonly');
                customRpcsEl.placeholder = 'Cole aqui seus RPCs do MetaMask, um por linha';
                customRpcsEl.focus();
            });

            // Ao sair do campo, persistir RPCs na sessão
            customRpcsEl.addEventListener('blur', () => {
                const raw = customRpcsEl.value || '';
                const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
                lines.forEach(url => {
                    if (window.walletManager && typeof window.walletManager.addSessionRpc === 'function') {
                        window.walletManager.addSessionRpc(url);
                    }
                });
            });
        }
    } catch (uiErr) {
        console.warn('Falha ao inicializar UI de importação de RPCs:', uiErr);
    }

    console.log('✅ TokenCafe Wallet Manager inicializado com sucesso');
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWalletManager);
} else {
    initializeWalletManager();
}

// Event listeners globais para debugging
document.addEventListener('wallet:connected', function(event) {
    console.log('🎉 Evento wallet:connected recebido:', event.detail);
    const btn = document.getElementById('connect-wallet-btn') || document.querySelector('.btn-connect-wallet');
    if (btn) {
        const addr = (event && event.detail && event.detail.address) || (walletManager && walletManager.currentAccount) || '';
        btn.title = addr || 'Conectado';
    }
    // Atualizar detalhes, incluindo RPCs personalizados
    if (walletManager && typeof walletManager.updateWalletDetails === 'function') {
        walletManager.updateWalletDetails();
    }
});

document.addEventListener('wallet:accountChanged', function(event) {
    console.log('🔄 Evento wallet:accountChanged recebido:', event.detail);
    const btn = document.getElementById('connect-wallet-btn') || document.querySelector('.btn-connect-wallet');
    if (btn) {
        const addr = (event && event.detail && event.detail.address) || (walletManager && walletManager.currentAccount) || '';
        btn.title = addr || 'Conta alterada';
    }
    // Atualizar detalhes, incluindo RPCs personalizados
    if (walletManager && typeof walletManager.updateWalletDetails === 'function') {
        walletManager.updateWalletDetails();
    }
});

document.addEventListener('wallet:disconnected', function(event) {
    console.log('👋 Evento wallet:disconnected recebido:', event.detail);
    const btn = document.getElementById('connect-wallet-btn') || document.querySelector('.btn-connect-wallet');
    if (btn) {
        btn.title = 'Não conectado';
    }
    // Limpar RPCs personalizados ao desconectar
    const customRpcsElement = document.getElementById('customRpcs');
    if (customRpcsElement) {
        customRpcsElement.value = 'Não conectado';
    }
});

// Capturar RPCs adicionados via dapp (evento customizado) e refletir no textarea
document.addEventListener('dapp:addRpcUrl', function(event) {
    try {
        const detail = (event && event.detail) || {};
        const url = detail.rpcUrl || detail.url;
        const chainId = detail.chainId;
        if (walletManager && typeof walletManager.addSessionRpc === 'function' && url) {
            walletManager.addSessionRpc(url, chainId);
        }
    } catch (e) {
        console.warn('Falha ao processar evento dapp:addRpcUrl:', e);
    }
});

// Verificar conexão periodicamente com debounce inteligente
let balanceUpdateInterval;
let lastBalanceUpdate = 0;
const BALANCE_UPDATE_COOLDOWN = 30000; // 30 segundos entre atualizações

function scheduleBalanceUpdate() {
    if (balanceUpdateInterval) {
        clearInterval(balanceUpdateInterval);
    }
    
    balanceUpdateInterval = setInterval(() => {
        if (walletManager && walletManager.isConnected) {
            const now = Date.now();
            // Só atualiza se passou o tempo de cooldown
            if (now - lastBalanceUpdate >= BALANCE_UPDATE_COOLDOWN) {
                lastBalanceUpdate = now;
                walletManager.updateBalance();
            }
        }
    }, 15000); // Verifica a cada 15 segundos, mas só atualiza a cada 30
}

// Iniciar o agendamento
scheduleBalanceUpdate();

// Expor configurações globalmente
window.WALLET_CONFIG = WALLET_CONFIG;
window.NETWORK_CONFIGS = NETWORK_CONFIGS;

console.log('✅ TokenCafe Wallet Script Consolidado carregado com funcionalidades RPC');

