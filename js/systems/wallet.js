/**
 * ================================================================================
 * WALLET SYSTEM - TOKENCAFE
 * ================================================================================
 * Sistema unificado para gerenciamento de carteiras Web3
 * Consolidação de todas as funções relacionadas a MetaMask e Web3
 * ================================================================================
 */

class WalletSystem {
    constructor() {
        this.web3 = null;
        this.currentAccount = null;
        this.isConnected = false;
        this.networkId = null;
        
        // Configurações suportadas
        this.supportedNetworks = {
            1: 'Ethereum Mainnet',
            56: 'BSC Mainnet',
            137: 'Polygon Mainnet',
            11155111: 'Sepolia Testnet'
        };
        
        this.init();
    }

    /**
     * Inicialização do sistema
     */
    async init() {
        console.log('🚀 Inicializando WalletSystem...');
        
        // Verificar se já existe uma sessão ativa
        await this.checkExistingSession();
        
        // Configurar listeners
        this.setupEventListeners();
        
        // Atualizar UI inicial
        this.updateUI();
        
        console.log('✅ WalletSystem inicializado com sucesso');
    }

    /**
     * Verificar se existe uma sessão Web3 ativa
     * IMPORTANTE: Usa eth_accounts (não requer ação do usuário) para verificação silenciosa
     */
    async checkExistingSession() {
        console.log('🔍 Iniciando verificação rigorosa de sessão existente...');
        
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        const savedNetwork = localStorage.getItem('tokencafe_network_id');
        const savedConnected = localStorage.getItem('tokencafe_wallet_connected');
        
        // Primeiro, limpar estado interno
        this.currentAccount = null;
        this.networkId = null;
        this.isConnected = false;
        
        // Se não há dados salvos ou MetaMask não está disponível
        if (!savedAccount || !savedConnected || !this.isMetaMaskAvailable()) {
            console.log('❌ Nenhuma sessão salva ou MetaMask não disponível');
            this.clearSession();
            this.updateUI();
            return false;
        }

        try {
            console.log('🔍 Verificando conexão REAL com MetaMask...');
            
            // CRUCIAL: Usar eth_accounts para verificação silenciosa
            // Isso NÃO mostra popup e retorna apenas contas já conectadas
            const accounts = await window.ethereum.request({
                method: 'eth_accounts'
            });

            console.log('📋 Contas realmente conectadas no MetaMask:', accounts);

            // Se não há contas conectadas, o usuário NÃO está conectado
            if (!accounts || accounts.length === 0) {
                console.log('❌ NENHUMA conta conectada no MetaMask - limpando sessão');
                this.clearSession();
                this.updateUI();
                return false;
            }

            // Verificar se a conta salva ainda está nas contas conectadas
            const savedAccountLower = savedAccount.toLowerCase();
            const connectedAccount = accounts.find(acc => acc.toLowerCase() === savedAccountLower);
            
            if (!connectedAccount) {
                console.log('❌ Conta salva não está mais conectada no MetaMask - limpando sessão');
                this.clearSession();
                this.updateUI();
                return false;
            }

            // Verificar rede atual do MetaMask
            const chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });
            const currentNetworkId = parseInt(chainId, 16);

            // TUDO VERIFICADO - Restaurar sessão com dados REAIS do MetaMask
            this.currentAccount = connectedAccount; // Usar a conta realmente conectada
            this.networkId = currentNetworkId;
            this.isConnected = true;

            // Atualizar localStorage com dados ATUAIS do MetaMask
            localStorage.setItem('tokencafe_wallet_address', this.currentAccount);
            localStorage.setItem('tokencafe_network_id', this.networkId);
            localStorage.setItem('tokencafe_wallet_connected', 'true');

            // Configurar listeners de eventos
            this.setupEventListeners();

            // Atualizar UI
            this.updateUI();

            const networkName = this.supportedNetworks[this.networkId] || `Rede ${this.networkId}`;
            console.log('✅ Sessão VERIFICADA e restaurada com dados REAIS:', {
                account: this.formatAddress(this.currentAccount),
                network: networkName,
                networkId: this.networkId,
                reallyConnected: true
            });

            return true;

        } catch (error) {
            console.error('❌ Erro ao verificar sessão existente:', error);
            this.clearSession();
            this.updateUI();
            return false;
        }
    }

    /**
     * Limpar dados da sessão
     */
    clearSession() {
        console.log('🧹 Limpando sessão da carteira...');
        
        this.currentAccount = null;
        this.networkId = null;
        this.isConnected = false;
        
        // Remover todos os dados relacionados à carteira do localStorage
        localStorage.removeItem('tokencafe_wallet_address');
        localStorage.removeItem('tokencafe_network_id');
        localStorage.removeItem('tokencafe_connection_time');
        localStorage.removeItem('tokencafe_wallet_connected');
        
        console.log('✅ Sessão limpa completamente');
    }

    /**
     * Verificar se MetaMask está disponível
     */
    isMetaMaskAvailable() {
        return typeof window.ethereum !== 'undefined';
    }

    /**
     * Conectar à carteira MetaMask
     */
    async connect() {
        try {
            if (!this.isMetaMaskAvailable()) {
                this.showError('MetaMask não detectado! Por favor, instale a extensão MetaMask.');
                return false;
            }

            console.log('🔗 Solicitando conexão MetaMask...');
            
            // Mostrar feedback visual de carregamento
            const connectButton = document.getElementById('connect-wallet-btn') || 
                                document.getElementById('connect-metamask-btn') ||
                                document.getElementById('connect-btn');
            const originalText = connectButton ? connectButton.innerHTML : '';
            
            if (connectButton) {
                connectButton.disabled = true;
                connectButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Conectando...';
                connectButton.style.opacity = '0.7';
            }
            
            // SEMPRE solicitar acesso às contas - NUNCA assumir conexão
            // eth_requestAccounts SEMPRE mostra o popup se não estiver conectado
            console.log('📋 Solicitando permissão de acesso às contas...');
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });

            console.log('✅ Contas obtidas do MetaMask:', accounts);

            if (!accounts || accounts.length === 0) {
                throw new Error('Nenhuma conta encontrada ou acesso negado');
            }

            // Obter network ID atual do MetaMask
            const chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });
            const networkId = parseInt(chainId, 16);

            console.log('🌐 Rede atual do MetaMask:', {
                chainId,
                networkId,
                networkName: this.supportedNetworks[networkId] || `Rede ${networkId}`
            });

            // Salvar dados da sessão com informações REAIS do MetaMask
            this.currentAccount = accounts[0];
            this.networkId = networkId;
            this.isConnected = true;

            // Persistir sessão com chave consistente
            localStorage.setItem('tokencafe_wallet_address', this.currentAccount);
            localStorage.setItem('tokencafe_network_id', this.networkId);
            localStorage.setItem('tokencafe_connection_time', Date.now());
            localStorage.setItem('tokencafe_wallet_connected', 'true');

            console.log('✅ Conectado com sucesso!', {
                account: this.formatAddress(this.currentAccount),
                network: this.supportedNetworks[this.networkId] || `Network ${this.networkId}`,
                realConnection: true
            });

            // Configurar listeners de eventos
            this.setupEventListeners();

            // Atualizar UI
            this.updateUI();
            
            // Atualizar botão do header quando conecta
            if (typeof debounceUpdateHeaderButton === 'function') {
                debounceUpdateHeaderButton();
            } else if (typeof updateHeaderButton === 'function') {
                updateHeaderButton();
            }
            
            // Feedback de sucesso com informações detalhadas
            const networkName = this.supportedNetworks[this.networkId] || `Network ${this.networkId}`;
            this.showSuccess(`Carteira conectada com sucesso!<br>
                            Conta: ${this.formatAddress(this.currentAccount)}<br>
                            Rede: ${networkName}`);
            
            // Emitir evento personalizado
            this.emitWalletEvent('walletConnected', {
                account: this.currentAccount,
                networkId: this.networkId,
                networkName: networkName,
                formattedAddress: this.formatAddress(this.currentAccount)
            });
            
            // Aguardar 2 segundos e redirecionar para dashboard se necessário
            setTimeout(() => {
                this.redirectToDashboard();
            }, 2000);

            return true;

        } catch (error) {
            console.error('❌ Erro na conexão:', error);
            
            // Limpar qualquer estado inconsistente
            this.clearSession();
            this.updateUI();
            
            // Tratamento específico de erros
            let errorMessage = 'Erro ao conectar carteira';
            
            if (error.code === 4001) {
                errorMessage = 'Conexão cancelada pelo usuário. Clique em "Conectar" novamente quando estiver pronto.';
            } else if (error.code === -32002) {
                errorMessage = 'Já existe uma solicitação de conexão pendente. Verifique o MetaMask.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            this.showError(errorMessage);
            
            // Emitir evento de erro
            this.emitWalletEvent('connectionError', {
                error: error,
                message: errorMessage
            });
            
            return false;
            
        } finally {
            // Restaurar estado do botão
            const connectButton = document.getElementById('connect-wallet-btn') || 
                                document.getElementById('connect-metamask-btn') ||
                                document.getElementById('connect-btn');
            if (connectButton) {
                connectButton.disabled = false;
                connectButton.innerHTML = originalText || '<i class="fas fa-wallet me-2"></i>Conectar';
                connectButton.style.opacity = '1';
            }
        }
    }

    /**
     * Desconectar da carteira
     */
    async disconnect() {
        console.log('🔄 Desconectando carteira...');
        
        // Mostrar feedback visual
        const disconnectButton = document.getElementById('disconnectWallet') || 
                                document.getElementById('disconnect-wallet-btn');
        const originalText = disconnectButton ? disconnectButton.textContent : '';
        
        if (disconnectButton) {
            disconnectButton.disabled = true;
            disconnectButton.textContent = 'Desconectando...';
            disconnectButton.style.opacity = '0.7';
        }

        try {
            console.log('📤 Desconectando...');
            
            // Remover listeners de eventos
            this.removeEventListeners();

            // Limpar dados da sessão
            this.clearSession();
            
            // Atualizar UI
            this.updateUI();
            
            // Atualizar botão do header quando desconecta
            if (typeof debounceUpdateHeaderButton === 'function') {
                debounceUpdateHeaderButton();
            } else if (typeof updateHeaderButton === 'function') {
                updateHeaderButton();
            }

            // Emitir evento personalizado
            this.emitWalletEvent('walletDisconnected', {
                reason: 'user_requested',
                timestamp: new Date().toISOString()
            });
            
            this.showSuccess('Desconectado com sucesso!');
            
            // Redirecionar para página inicial se estiver no dashboard
            if (window.location.pathname.includes('dashboard')) {
                setTimeout(() => {
                    window.location.href = '../../pages/modules/dashboard/index.html';
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ Erro ao desconectar:', error);
            this.showError('Erro ao desconectar');
            
            // Emitir evento de erro
            this.emitWalletEvent('disconnectionError', {
                error: error,
                message: 'Erro ao desconectar carteira'
            });
            
        } finally {
            // Restaurar estado do botão
            if (disconnectButton) {
                disconnectButton.disabled = false;
                disconnectButton.textContent = originalText || 'Desconectar';
                disconnectButton.style.opacity = '1';
            }
        }
    }

    /**
     * Função global de desconexão que pode ser chamada de qualquer lugar
     */
    globalDisconnect() {
        if (this.isConnected) {
            this.disconnect();
        } else {
            // Se não está conectado, apenas limpa a sessão e redireciona
            this.clearSession();
            window.location.href = '/index.html';
        }
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        if (!this.isMetaMaskAvailable()) return;

        // Remover listeners existentes para evitar duplicação
        this.removeEventListeners();

        // Mudança de conta - Implementação robusta baseada nas melhores práticas
        this.accountsChangedHandler = (accounts) => {
            console.log('👤 Evento accountsChanged detectado:', accounts);
            
            if (accounts.length === 0) {
                // Usuário desconectou todas as contas
                console.log('❌ Todas as contas foram desconectadas');
                this.showError('Todas as contas foram desconectadas do MetaMask');
                this.disconnect();
            } else if (accounts[0] !== this.currentAccount) {
                // Mudança de conta detectada
                const oldAccount = this.currentAccount;
                const newAccount = accounts[0];
                
                console.log(`🔄 Mudança de conta detectada: ${oldAccount} → ${newAccount}`);
                
                this.currentAccount = newAccount;
                localStorage.setItem('tokencafe_wallet_address', this.currentAccount);
                
                // Notificar usuário sobre a mudança
                this.showSuccess(`Conta alterada para: ${this.formatAddress(newAccount)}`);
                
                // Atualizar UI
                this.updateUI();
                
                // Emitir evento personalizado para outros módulos
                this.emitWalletEvent('accountChanged', {
                    oldAccount,
                    newAccount,
                    formattedAddress: this.formatAddress(newAccount)
                });
            }
        };

        // Mudança de rede - Implementação robusta sem reload da página
        this.chainChangedHandler = (chainId) => {
            const newNetworkId = parseInt(chainId, 16);
            const oldNetworkId = this.networkId;
            
            console.log(`🌐 Evento chainChanged detectado: ${oldNetworkId} → ${newNetworkId} (${chainId})`);
            
            this.networkId = newNetworkId;
            localStorage.setItem('tokencafe_network_id', this.networkId);
            
            const networkName = this.supportedNetworks[this.networkId] || `Rede ${this.networkId}`;
            
            // Notificar usuário sobre a mudança de rede
            this.showSuccess(`Rede alterada para: ${networkName}`);
            
            // Atualizar UI sem recarregar a página
            this.updateUI();
            
            // Emitir evento personalizado para outros módulos
            this.emitWalletEvent('networkChanged', {
                oldNetworkId,
                newNetworkId,
                networkName,
                chainId
            });
            
            console.log('✅ Rede alterada, UI atualizada automaticamente');
        };

        // Conexão estabelecida
        this.connectHandler = (connectInfo) => {
            console.log('🔗 Evento connect detectado:', connectInfo);
            this.emitWalletEvent('connected', connectInfo);
        };

        // Desconexão - Tratamento robusto
        this.disconnectHandler = (error) => {
            console.log('📤 Evento disconnect detectado:', error);
            
            if (error) {
                console.error('❌ Erro na desconexão:', error);
                this.showError(`Conexão perdida: ${error.message || 'Motivo desconhecido'}`);
            }
            
            this.emitWalletEvent('disconnected', { error });
            this.disconnect();
        };

        // Registrar todos os listeners
        window.ethereum.on('accountsChanged', this.accountsChangedHandler);
        window.ethereum.on('chainChanged', this.chainChangedHandler);
        window.ethereum.on('connect', this.connectHandler);
        window.ethereum.on('disconnect', this.disconnectHandler);
        
        console.log('✅ Event listeners configurados com sucesso');
    }

    /**
     * Remover listeners de eventos para evitar vazamentos de memória
     */
    removeEventListeners() {
        if (!this.isMetaMaskAvailable()) return;
        
        if (this.accountsChangedHandler) {
            window.ethereum.removeListener('accountsChanged', this.accountsChangedHandler);
        }
        if (this.chainChangedHandler) {
            window.ethereum.removeListener('chainChanged', this.chainChangedHandler);
        }
        if (this.connectHandler) {
            window.ethereum.removeListener('connect', this.connectHandler);
        }
        if (this.disconnectHandler) {
            window.ethereum.removeListener('disconnect', this.disconnectHandler);
        }
        
        console.log('🧹 Event listeners removidos');
    }

    /**
     * Emitir eventos personalizados para outros módulos
     */
    emitWalletEvent(eventType, data) {
        const event = new CustomEvent('walletStateChanged', {
            detail: {
                type: eventType,
                data: data,
                sessionInfo: this.getSessionInfo()
            }
        });
        
        window.dispatchEvent(event);
        console.log(`📡 Evento emitido: ${eventType}`, data);
    }

    /**
     * Atualizar interface do usuário
     * Atualiza todos os elementos relacionados à carteira na página
     */
    updateUI() {
        // Elementos comuns (dashboard/tools)
        const connectBtn = document.getElementById('connect-wallet-btn');
        const walletInfo = document.getElementById('wallet-info');
        const accountDisplay = document.getElementById('account-display');
        const networkDisplay = document.getElementById('network-display');
        
        // Elementos específicos da página tools.html
        const disconnectBtn = document.getElementById('disconnect-btn');
        const walletStatus = document.getElementById('wallet-status');
        const walletAddress = document.getElementById('wallet-address');

        // Elementos específicos da página wallet.html (teste)
        const connectBtnTest = document.getElementById('connect-btn');
        const disconnectBtnTest = document.getElementById('disconnect-btn');
        const statusText = document.getElementById('status-text');
        const connectionStatus = document.getElementById('connection-status');
        const walletAddressTest = document.getElementById('wallet-address');
        const walletAddressShort = document.getElementById('wallet-address-short');
        const networkName = document.getElementById('network-name');
        const networkId = document.getElementById('network-id');
        const copyAddressBtn = document.getElementById('copy-address');
        const refreshInfoBtn = document.getElementById('refresh-info-btn');

        console.log('🔄 Atualizando UI - Estado:', {
            isConnected: this.isConnected,
            currentAccount: this.currentAccount,
            networkId: this.networkId
        });

        if (this.isConnected && this.currentAccount) {
            console.log('✅ Atualizando UI para estado CONECTADO');
            
            // === PÁGINA WALLET.HTML (TESTE) ===
            if (connectBtnTest && disconnectBtnTest && statusText) {
                // Atualizar status de conexão
                statusText.textContent = 'Conectado';
                if (connectionStatus) {
                    const indicator = connectionStatus.querySelector('.status-indicator');
                    if (indicator) {
                        indicator.className = 'status-indicator status-connected';
                    }
                }
                
                // Atualizar endereços
                if (walletAddressTest) {
                    walletAddressTest.value = this.currentAccount;
                }
                if (walletAddressShort) {
                    walletAddressShort.value = this.formatAddress(this.currentAccount);
                }
                
                // Atualizar informações da rede
                const networkNameText = this.supportedNetworks[this.networkId] || `Rede ${this.networkId}`;
                if (networkName) {
                    networkName.textContent = networkNameText;
                    // Definir classe da badge baseada na rede
                    networkName.className = 'network-badge ';
                    if (['1', '56', '137'].includes(String(this.networkId))) {
                        networkName.className += 'network-mainnet';
                    } else {
                        networkName.className += 'network-testnet';
                    }
                }
                if (networkId) {
                    networkId.textContent = this.networkId;
                }
                
                // Mostrar/ocultar botões
                connectBtnTest.classList.add('d-none');
                disconnectBtnTest.classList.remove('d-none');
                if (copyAddressBtn) copyAddressBtn.disabled = false;
                if (refreshInfoBtn) refreshInfoBtn.classList.remove('d-none');
            }
            
            // === PÁGINA TOOLS.HTML ===
            if (connectBtn) {
                connectBtn.innerHTML = `
                    <i class="fas fa-wallet me-2"></i>
                    ${this.formatAddress(this.currentAccount)}
                `;
                connectBtn.className = 'btn btn-success btn-sm dropdown-toggle';
                connectBtn.onclick = null; // Remove o handler de conexão
                
                // Atualizar informações da wallet se existirem
                if (accountDisplay) {
                    accountDisplay.textContent = this.currentAccount;
                }
                if (networkDisplay) {
                    networkDisplay.textContent = this.supportedNetworks[this.networkId] || `Network ${this.networkId}`;
                }
                
                // Atualizar elementos específicos da página tools.html
                if (disconnectBtn && walletStatus && walletAddress) {
                    // Mostrar informações da carteira
                    walletAddress.textContent = this.formatAddress(this.currentAccount);
                    
                    // Atualizar informação da rede
                    const networkInfo = document.getElementById('network-info');
                    if (networkInfo) {
                        networkInfo.textContent = this.supportedNetworks[this.networkId] || `Rede ${this.networkId}`;
                    }
                    
                    // Mostrar/ocultar elementos
                    connectBtn.classList.add('d-none');
                    disconnectBtn.classList.remove('d-none');
                    walletStatus.classList.remove('d-none');
                }
            }
            
        } else {
            console.log('❌ Atualizando UI para estado DESCONECTADO');
            
            // === PÁGINA WALLET.HTML (TESTE) ===
            if (connectBtnTest && disconnectBtnTest && statusText) {
                // Atualizar status de conexão
                statusText.textContent = 'Desconectado';
                if (connectionStatus) {
                    const indicator = connectionStatus.querySelector('.status-indicator');
                    if (indicator) {
                        indicator.className = 'status-indicator status-disconnected';
                    }
                }
                
                // Limpar endereços
                if (walletAddressTest) {
                    walletAddressTest.value = '';
                    walletAddressTest.placeholder = 'Não conectado';
                }
                if (walletAddressShort) {
                    walletAddressShort.value = '';
                    walletAddressShort.placeholder = '-';
                }
                
                // Limpar informações da rede
                if (networkName) {
                    networkName.textContent = 'Não conectado';
                    networkName.className = 'network-badge network-unknown';
                }
                if (networkId) {
                    networkId.textContent = '-';
                }
                
                // Mostrar/ocultar botões
                connectBtnTest.classList.remove('d-none');
                disconnectBtnTest.classList.add('d-none');
                if (copyAddressBtn) copyAddressBtn.disabled = true;
                if (refreshInfoBtn) refreshInfoBtn.classList.add('d-none');
            }
            
            // === PÁGINA TOOLS.HTML ===
            if (connectBtn) {
                connectBtn.innerHTML = `
                    <i class="fas fa-sign-in-alt me-1"></i>
                    Conectar
                `;
                connectBtn.className = 'btn btn-primary btn-sm';
                connectBtn.onclick = () => this.connect();
                
                // Atualizar elementos específicos da página tools.html
                if (disconnectBtn && walletStatus) {
                    // Ocultar informações da carteira
                    connectBtn.classList.remove('d-none');
                    disconnectBtn.classList.add('d-none');
                    walletStatus.classList.add('d-none');
                }
            }
        }
        
        // Atualizar estado dos botões de ferramentas se a função existir
        if (typeof window.updateToolButtonStates === 'function') {
            window.updateToolButtonStates();
        }
        
        console.log('🔄 UI atualizada com sucesso');
    }

    /**
     * Formatar endereço da carteira
     */
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Redirecionar para dashboard
     */
    redirectToDashboard() {
        // Se estiver na página inicial, redirecionar para dashboard
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
            window.location.href = '/pages/modules/dashboard/';
        }
    }

    /**
     * Mostrar mensagem de sucesso
     */
    showSuccess(message) {
        console.log('✅', message);
        
        // Integração com sistema de notificações se disponível
        if (typeof showToast === 'function') {
            showToast(message, 'success');
        } else if (window.TokenCafe?.ui?.showNotification) {
            window.TokenCafe.ui.showNotification(message, 'success');
        }
        // Removido alert para evitar janelas de aviso
    }

    /**
     * Mostrar mensagem de erro
     */
    showError(message) {
        console.error('❌', message);
        
        // Integração com sistema de notificações se disponível
        if (typeof showToast === 'function') {
            showToast(message, 'error');
        } else if (window.TokenCafe?.ui?.showNotification) {
            window.TokenCafe.ui.showNotification(message, 'error');
        }
        // Removido alert para evitar janelas de aviso
    }

    /**
     * Obter informações da sessão atual
     */
    getSessionInfo() {
        return {
            isConnected: this.isConnected,
            account: this.currentAccount,
            network: this.networkId,
            networkName: this.supportedNetworks[this.networkId] || `Network ${this.networkId}`,
            hasMetaMask: this.isMetaMaskAvailable()
        };
    }
}

// ================================================================================
// FUNÇÕES GLOBAIS DE COMPATIBILIDADE
// ================================================================================

// Funções globais para compatibilidade com botões HTML
function connectWallet() {
    if (window.tokencafeWallet) {
        return window.tokencafeWallet.connect();
    } else {
        console.error('❌ WalletSystem não inicializado');
        return false;
    }
}

function disconnectWallet() {
    if (window.tokencafeWallet) {
        return window.tokencafeWallet.disconnect();
    } else {
        console.error('❌ WalletSystem não inicializado');
        return false;
    }
}

// Funções específicas para header
function connectWalletFromHeader() {
    console.log('connectWalletFromHeader() chamado');
    if (window.tokencafeWallet) {
        // Verificar se já está conectado
        if (window.tokencafeWallet.isConnected) {
            // Se já está conectado, redirecionar para o dashboard
            window.location.href = 'pages/modules/dashboard/index.html';
        } else {
            // Se não está conectado, conectar
            window.tokencafeWallet.connect();
        }
    } else {
        console.error('WalletSystem não encontrado');
        alert('Erro: Sistema de conexão não disponível');
    }
}

function disconnectWalletFromHeader() {
    console.log('disconnectWalletFromHeader() chamado');
    if (window.tokencafeWallet) {
        window.tokencafeWallet.disconnect();  
    } else {
        console.error('WalletSystem não encontrado');
        alert('Erro: Sistema de desconexão não disponível');
    }
}

// ================================================================================
// FUNÇÕES ESPECÍFICAS PARA PÁGINA INDEX
// ================================================================================

/**
 * Limpar todas as sessões ao carregar a página index.html
 */
function clearAllSessions() {
    console.log('🧹 Limpando todas as sessões...');
    
    // Limpar dados do TokenCafe
    localStorage.removeItem('tokencafe_wallet_address');
    localStorage.removeItem('tokencafe_network_id');
    localStorage.removeItem('tokencafe_connection_time');
    localStorage.removeItem('tokencafe_wallet_connected');
    
    // Limpar outros dados relacionados à sessão
    localStorage.removeItem('tokencafe_user_profile');
    localStorage.removeItem('tokencafe_dashboard_state');
    localStorage.removeItem('tokencafe_last_activity');
    
    console.log('✅ Todas as sessões foram limpas');
}

/**
 * Função para verificar se deve limpar sessões ou redirecionar
 */
async function checkConnectionAndRedirect() {
    try {
        // Verificar se MetaMask está instalado
        if (typeof window.ethereum === 'undefined') {
            // MetaMask não instalado - limpar sessões e mostrar página
            clearAllSessions();
            checkMetaMaskConnection();
            return;
        }
        
        // Verificar se há conta salva
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        
        if (!savedAccount) {
            // Não há conta salva - mostrar página normalmente
            checkMetaMaskConnection();
            return;
        }
        
        // Verificar se MetaMask ainda tem essa conta conectada
        // CORREÇÃO: Usar eth_accounts para verificação silenciosa (não requer ação do usuário)
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        // Se não há contas ou a conta salva não está nas contas conectadas
        if (accounts.length === 0 || !accounts.find(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
            console.log('❌ Conta não está mais conectada no MetaMask');
            // Limpar sessão e mostrar página
            clearAllSessions();
            checkMetaMaskConnection();
        } else {
            // Já conectado - redirecionar automaticamente para o dashboard
            console.log('✅ Usuário já conectado, redirecionando para o dashboard...');
            
            // Mostrar mensagem de redirecionamento
            const loadingBtn = document.getElementById('loading-connection-btn');
            if (loadingBtn) {
                loadingBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Redirecionando para o Dashboard...';
                loadingBtn.style.display = 'block';
            }
            
            // Redirecionar para o dashboard
            setTimeout(() => {
                window.location.href = 'modules/dashboard/index.html';
            }, 1500); // Aguardar 1.5 segundos para mostrar feedback visual
        }
        
    } catch (error) {
        console.error('Erro ao verificar conexão:', error);
        // Em caso de erro, limpar sessões e mostrar página
        clearAllSessions();
        checkMetaMaskConnection();
    }
}

/**
 * Verificar conexão MetaMask na página index
 */
async function checkMetaMaskConnection() {
    const connectBtn = document.getElementById('connect-metamask-btn');
    const dashboardBtn = document.getElementById('access-dashboard-btn');
    const loadingBtn = document.getElementById('loading-connection-btn');
    
    try {
        // Verificar se MetaMask está instalado
        if (typeof window.ethereum === 'undefined') {
            // MetaMask não instalado
            if (connectBtn) {
                connectBtn.innerHTML = '<i class="fas fa-download me-2"></i>Instalar MetaMask';
                connectBtn.onclick = () => window.open('https://metamask.io/download/', '_blank');
                connectBtn.style.display = 'block';
            }
            if (loadingBtn) loadingBtn.style.display = 'none';
            return;
        }
        
        // Verificar se já está conectado
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        
        if (!savedAccount) {
            // Não há conta salva - mostrar botão conectar
            if (connectBtn) connectBtn.style.display = 'block';
            if (loadingBtn) loadingBtn.style.display = 'none';
            return;
        }
        
        // Verificar se MetaMask ainda tem essa conta conectada
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        // Se não há contas ou a conta salva não está nas contas conectadas
        if (accounts.length === 0 || !accounts.find(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
            console.log('❌ Conta não está mais conectada no MetaMask');
            // Limpar sessão
            localStorage.removeItem('tokencafe_wallet_address');
            localStorage.removeItem('tokencafe_network_id');
            localStorage.removeItem('tokencafe_connection_time');
            localStorage.removeItem('tokencafe_wallet_connected');
            
            // Mostrar botão conectar
            if (connectBtn) connectBtn.style.display = 'block';
            if (loadingBtn) loadingBtn.style.display = 'none';
        } else {
            // Já conectado - redirecionar automaticamente para o dashboard
            console.log('✅ Usuário já conectado, redirecionando para o dashboard...');
            
            // Atualizar informações na UI se necessário
            updateConnectionStatus(savedAccount);
            
            // Redirecionar para o dashboard
            setTimeout(() => {
                window.location.href = 'modules/dashboard/index.html';
            }, 1000); // Aguardar 1 segundo para mostrar feedback visual
            
            // Mostrar mensagem de redirecionamento
            if (loadingBtn) {
                loadingBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Redirecionando para o Dashboard...';
                loadingBtn.style.display = 'block';
            }
        }
        
    } catch (error) {
        console.error('Erro ao verificar conexão MetaMask:', error);
        // Em caso de erro, mostrar botão conectar
        if (connectBtn) connectBtn.style.display = 'block';
        if (loadingBtn) loadingBtn.style.display = 'none';
    }
}

/**
 * Função para atualizar status de conexão na página index
 */
function updateConnectionStatus(account) {
    // Salvar conta no localStorage se não estiver salva
    if (!localStorage.getItem('tokencafe_wallet_address')) {
        localStorage.setItem('tokencafe_wallet_address', account);
    }
    
    // Atualizar header se existir
    if (window.IndexPageFunctions && window.IndexPageFunctions.updateIndexConnectedUI) {
        window.IndexPageFunctions.updateIndexConnectedUI(account);
    }
}

/**
 * Configurar listeners para mudanças no MetaMask na página index
 */
function setupIndexMetaMaskListeners() {
    if (typeof window.ethereum !== 'undefined') {
        window.ethereum.on('accountsChanged', function (accounts) {
            if (accounts.length === 0) {
                // Desconectado
                localStorage.removeItem('tokencafe_wallet_address');
                localStorage.removeItem('tokencafe_wallet_connected');
                // Usar debounce para evitar múltiplas atualizações
                debounceUpdateHeaderButton();
                console.log('👤 Conta desconectada, UI atualizada');
            } else {
                // Conta mudou
                updateConnectionStatus(accounts[0]);
                // Usar debounce para evitar múltiplas atualizações
                debounceUpdateHeaderButton();
                checkMetaMaskConnection();
            }
        });
        
        window.ethereum.on('chainChanged', function (chainId) {
            // Rede mudou - pode precisar recarregar
            console.log('Rede alterada para:', chainId);
            // Usar debounce para evitar múltiplas atualizações
            debounceUpdateHeaderButton();
        });
        
        // Listener para mudanças no localStorage (quando conecta/desconecta)
        window.addEventListener('storage', function(e) {
            if (e.key === 'tokencafe_wallet_connected') {
                // Usar debounce para evitar múltiplas atualizações
                debounceUpdateHeaderButton();
            }
        });
    }
}

// ...existing code ...

// ================================================================================
// INICIALIZAÇÃO E EXPOSIÇÃO GLOBAL
// ================================================================================

// Expor globalmente
window.WalletSystem = WalletSystem;
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.connectWalletFromHeader = connectWalletFromHeader;
window.disconnectWalletFromHeader = disconnectWalletFromHeader;

// Expor funções específicas da página index
window.clearAllSessions = clearAllSessions;
window.checkConnectionAndRedirect = checkConnectionAndRedirect;
window.checkMetaMaskConnection = checkMetaMaskConnection;
window.updateConnectionStatus = updateConnectionStatus;
window.setupIndexMetaMaskListeners = setupIndexMetaMaskListeners;
window.updateHeaderButton = updateHeaderButton;
window.debounceUpdateHeaderButton = debounceUpdateHeaderButton;
window.startHeaderButtonUpdater = startHeaderButtonUpdater;

// Criar instância global quando DOM estiver pronto
function initializeWalletSystem() {
    if (!window.tokencafeWallet) {
        console.log('🏗️ Inicializando Wallet System...');
        window.tokencafeWallet = new WalletSystem();
        console.log('✅ Wallet System inicializado');
    }
}

// Inicializar imediatamente se DOM já estiver pronto, senão aguardar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWalletSystem);
} else {
    initializeWalletSystem();
}

console.log('✅ Wallet System carregado');

// ================================================================================
// VERIFICAÇÃO DE BOTÃO DE DESCONEXÃO NA PÁGINA INICIAL
// ================================================================================

/**
 * Verifica se o usuário está conectado e mostra/esconde o botão de desconexão
 * na página inicial
 */
function checkDisconnectButtonVisibility() {
    document.addEventListener('DOMContentLoaded', function() {
        const checkConnection = () => {
            const isConnected = localStorage.getItem('tokencafe_wallet_connected') === 'true';
            const disconnectBtn = document.getElementById('disconnect-btn-container');
            
            if (disconnectBtn) {
                disconnectBtn.style.display = isConnected ? 'block' : 'none';
            }
        };
        
        // Verificar apenas inicialmente
        checkConnection();
        
        // Removido setInterval - agora só verifica quando há mudanças reais
        // A verificação será feita através dos eventos do MetaMask
    });
}

// Função para atualizar o botão do header na página inicial
// Debounce para evitar múltiplas atualizações do header button
let headerButtonUpdateTimeout;
function debounceUpdateHeaderButton() {
    clearTimeout(headerButtonUpdateTimeout);
    headerButtonUpdateTimeout = setTimeout(() => {
        updateHeaderButton();
    }, 100); // Aguarda 100ms antes de atualizar
}

function updateHeaderButton() {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const connectText = document.getElementById('connect-text');
    
    if (!connectBtn || !connectText) return;
    
    // Verificar se está conectado através do localStorage
    const isConnected = localStorage.getItem('tokencafe_wallet_connected') === 'true';
    
    if (isConnected) {
        // Se conectado, mostrar "Ir para Dashboard"
        connectText.textContent = 'Ir para Dashboard';
        connectBtn.onclick = () => {
            // DESABILITADO: Redirecionamento automático removido para evitar reload da página
            console.log('🚫 Redirecionamento para dashboard desabilitado');
            // window.location.href = 'pages/modules/dashboard/index.html';
        };
    } else {
        // Se não conectado, mostrar "Conectar ao MetaMask"
        connectText.textContent = 'Conectar ao MetaMask';
        connectBtn.onclick = connectWalletFromHeader;
    }
}

// Verificar e atualizar o botão apenas quando necessário
function startHeaderButtonUpdater() {
    updateHeaderButton();
    // Removido setInterval - agora só atualiza quando há mudanças reais
}

// Inicializar verificação do botão de desconexão
checkDisconnectButtonVisibility();

// Inicializar atualizador do botão do header
startHeaderButtonUpdater();

/**
 * Atualiza o estado dos botões de ferramentas com base no estado da conexão
 * Usado principalmente na página tools.html
 * @param {string} toolButtonSelector - Seletor CSS para os botões de ferramentas (padrão: '.tool-button')
 */
function updateToolButtonStates(toolButtonSelector = '.tool-button') {
    const isConnected = localStorage.getItem('tokencafe_wallet_connected') === 'true';
    const toolButtons = document.querySelectorAll(toolButtonSelector);
    
    if (!toolButtons || toolButtons.length === 0) return;
    
    toolButtons.forEach(button => {
        const requiresWallet = button.getAttribute('data-requires-wallet') === 'true';

        if (requiresWallet && !isConnected) {
            // Desabilitar botão
            button.classList.add('disabled');
            button.style.pointerEvents = 'none';
            button.style.opacity = '0.5';
            button.addEventListener('click', preventToolButtonClick);
        } else {
            // Habilitar botão
            button.classList.remove('disabled');
            button.style.pointerEvents = 'auto';
            button.style.opacity = '1';
            button.removeEventListener('click', preventToolButtonClick);
        }
    });
}

/**
 * Previne o clique em botões de ferramentas desabilitados
 * @param {Event} e - Evento de clique
 */
function preventToolButtonClick(e) {
    e.preventDefault();
    
    // Verificar se o sistema de carteira está disponível
    if (window.tokencafeWallet) {
        window.tokencafeWallet.showError('Conecte sua carteira MetaMask para acessar esta funcionalidade.');
    } else {
        console.error('Conecte sua carteira MetaMask para acessar esta funcionalidade.');
        alert('Conecte sua carteira MetaMask para acessar esta funcionalidade.');
    }
}

// Expor a função globalmente
window.updateToolButtonStates = updateToolButtonStates;