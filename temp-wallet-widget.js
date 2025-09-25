/**
 * WALLET.JS - SISTEMA ÚNICO DE CARTEIRA
 * Centraliza todas as funções de carteira do sistema
 * Remove duplicações e padroniza comportamento
 */

class WalletManager {
    constructor() {
        this.isConnected = false;
        this.currentAccount = null;
        this.provider = null;
        this.chainId = null;
        this.connecting = false;
        
        // Eventos customizados
        this.events = {
            connected: 'wallet:connected',
            disconnected: 'wallet:disconnected',
            accountChanged: 'wallet:accountChanged',
            chainChanged: 'wallet:chainChanged'
        };
        
        this.init();
    }

    async init() {
        console.log('💼 Inicializando Wallet Manager...');
        
        if (typeof window.ethereum !== 'undefined') {
            this.provider = window.ethereum;
            await this.checkConnection();
            this.setupEventListeners();
            
            // DESABILITADO: Atualização automática da UI removida para evitar múltiplas leituras
            console.log('🚫 Atualização automática da UI desabilitada');
            
            // if (document.readyState === 'loading') {
            //     document.addEventListener('DOMContentLoaded', () => {
            //         setTimeout(() => this.updateButtonsUI(), 100);
            //     });
            // } else {
            //     setTimeout(() => this.updateButtonsUI(), 100);
            // }
        } else {
            console.warn('⚠️ MetaMask não detectado');
        }
    }

    // Verificar conexão existente
    async checkConnection() {
        try {
            if (!this.provider) return false;
            
            const accounts = await this.provider.request({ method: 'eth_accounts' });
            
            if (accounts && accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.isConnected = true;
                this.emitEvent(this.events.connected, { account: this.currentAccount });
                console.log('✅ Carteira já conectada:', this.currentAccount);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Erro ao verificar conexão:', error);
            return false;
        }
    }

    // Conectar carteira
    async connect(redirectToDashboard = false) {
        if (this.connecting) {
            console.log('⏳ Conexão já em andamento...');
            return null;
        }

        try {
            this.connecting = true;
            
            if (!this.provider) {
                this.showInstallMetaMask();
                return null;
            }

            console.log('🔌 Conectando carteira...');
            
            const accounts = await this.provider.request({
                method: 'eth_requestAccounts'
            });

            if (accounts && accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.isConnected = true;
                
                // Obter chain ID
                this.chainId = await this.provider.request({ method: 'eth_chainId' });
                
                console.log('✅ Carteira conectada:', this.currentAccount);
                
                // Emitir evento
                this.emitEvent(this.events.connected, { 
                    account: this.currentAccount,
                    chainId: this.chainId 
                });
                
                // COMENTADO: Redirecionamento removido para evitar reload da página
                // if (redirectToDashboard) {
                //     console.log('🔄 Redirecionando para dashboard...');
                //     setTimeout(() => {
                //         window.location.href = 'index.html';
                //     }, 500);
                // }
                
                console.log('✅ Conexão realizada - redirecionamento automático desabilitado');
                
                return this.currentAccount;
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ Erro ao conectar:', error);
            
            if (error.code === 4001) {
                console.log('❌ Conexão rejeitada pelo usuário');
            }
            
            throw error;
            
        } finally {
            this.connecting = false;
        }
    }

    // Desconectar carteira
    disconnect() {
        this.currentAccount = null;
        this.isConnected = false;
        this.chainId = null;
        
        console.log('🔌 Carteira desconectada');
        
        // Emitir evento
        this.emitEvent(this.events.disconnected, {});
        
        // Atualizar menu imediatamente
        this.updateWalletMenuDisconnected();
    }

    // Atualizar menu quando carteira é desconectada
    updateWalletMenuDisconnected() {
        const walletInfoElement = document.getElementById('connected-wallet-address');
        if (!walletInfoElement) return;
        
        walletInfoElement.textContent = 'Desconectado';
        walletInfoElement.className = 'badge bg-danger d-block text-center py-1';
        walletInfoElement.style.cursor = 'default';
        walletInfoElement.onclick = null;
        walletInfoElement.title = 'Carteira desconectada';
    }

    // Obter conta atual
    getCurrentAccount() {
        return this.currentAccount;
    }

    // Verificar se está conectado
    isWalletConnected() {
        return this.isConnected && this.currentAccount !== null;
    }

    // Mostrar modal para instalar MetaMask
    showInstallMetaMask() {
        const message = 'MetaMask não encontrado!\n\nPor favor, instale o MetaMask para continuar.';
        
        if (confirm(message + '\n\nDeseja abrir a página do MetaMask?')) {
            window.open('https://metamask.io', '_blank');
        }
    }

    // Event listeners para mudanças
    setupEventListeners() {
        if (!this.provider) return;

        // Mudança de contas
        this.provider.on('accountsChanged', (accounts) => {
            console.log('🔄 Contas alteradas:', accounts);
            
            if (accounts.length === 0) {
                this.disconnect();
            } else if (accounts[0] !== this.currentAccount) {
                this.currentAccount = accounts[0];
                this.isConnected = true;
                
                this.emitEvent(this.events.accountChanged, { 
                    account: this.currentAccount 
                });
            }
        });

        // Mudança de rede
        this.provider.on('chainChanged', (chainId) => {
            console.log('🔄 Rede alterada:', chainId);
            this.chainId = chainId;
            
            this.emitEvent(this.events.chainChanged, { 
                chainId: chainId 
            });
            
            // Recarregar página para evitar problemas - COMENTADO PARA EVITAR RELOAD AUTOMÁTICO
            // setTimeout(() => {
            //     window.location.reload();
            // }, 1000);
        });

        // Desconexão
        this.provider.on('disconnect', () => {
            console.log('🔌 Provider desconectado');
            this.disconnect();
        });
    }

    // Emitir eventos customizados
    emitEvent(eventName, data) {
        const event = new CustomEvent(eventName, { detail: data });
        document.dispatchEvent(event);
        
        // Atualizar UI dos botões quando necessário
        if (eventName === this.events.connected || eventName === this.events.disconnected) {
            this.updateButtonsUI();
        }
    }

    // Atualizar interface dos botões
    updateButtonsUI() {
        // Atualizar botões de conexão
        const buttons = document.querySelectorAll('#get-started');
        
        buttons.forEach(button => {
            if (this.isConnected && this.currentAccount) {
                // Botão no estado conectado
                button.innerHTML = `
                    <i class="fas fa-wallet me-2"></i>
                    ${this.formatAddress(this.currentAccount)}
                `;
                button.classList.remove('btn-warning');
                button.classList.add('btn-success');
                button.title = 'Conectado - Passe o mouse para entrar no dashboard';
                
                // Adicionar evento hover para mudar tooltip e cor
                button.onmouseenter = () => {
                    button.title = 'Entrar no Dashboard';
                    button.classList.remove('btn-success');
                    button.classList.add('btn-warning', 'hover-dashboard');
                    button.innerHTML = `
                        <i class="fas fa-tachometer-alt me-2"></i>
                        Dashboard
                    `;
                };
                
                button.onmouseleave = () => {
                    button.title = 'Conectado - Passe o mouse para entrar no dashboard';
                    button.classList.remove('btn-warning', 'hover-dashboard');
                    button.classList.add('btn-success');
                    button.innerHTML = `
                        <i class="fas fa-wallet me-2"></i>
                        ${this.formatAddress(this.currentAccount)}
                    `;
                };
                // COMENTADO: Redirecionamento removido para evitar reload da página
                // button.onclick = () => window.location.href = 'index.html';
                button.onclick = () => console.log('✅ Botão clicado - redirecionamento desabilitado');
            } else {
                // Botão no estado desconectado - laranja com tooltip "Conectar"
                button.innerHTML = `
                    <i class="fas fa-rocket me-2"></i>
                    Começar Agora
                `;
                button.classList.remove('btn-success');
                button.classList.add('btn-warning');
                button.title = 'Conectar';
                
                // Remover eventos hover se existirem
                button.onmouseenter = null;
                button.onmouseleave = null;
                
                // Ação: conectar carteira
                button.onclick = async () => {
                    await window.connectWalletGlobal(true);
                };
            }
        });

        // Atualizar informações da carteira no menu lateral (dashboard)
        this.updateWalletMenuInfo();
    }

    // Atualizar informações da carteira no menu lateral
    updateWalletMenuInfo() {
        const walletInfoElement = document.getElementById('connected-wallet-address');
        if (!walletInfoElement) return;

        if (this.isConnected && this.currentAccount) {
            const address = this.currentAccount;
            const shortAddress = this.formatAddress(address);
            
            walletInfoElement.textContent = shortAddress;
            walletInfoElement.className = 'badge bg-success d-block text-center py-1';
            walletInfoElement.title = `${address} - Clique para copiar`;
            walletInfoElement.style.cursor = 'pointer';
            
            // Função para copiar endereço
            walletInfoElement.onclick = () => {
                navigator.clipboard.writeText(address).then(() => {
                    const originalText = walletInfoElement.textContent;
                    walletInfoElement.textContent = 'Copiado!';
                    walletInfoElement.className = 'badge bg-info d-block text-center py-1';
                    
                    setTimeout(() => {
                        walletInfoElement.textContent = originalText;
                        walletInfoElement.className = 'badge bg-success d-block text-center py-1';
                    }, 1500);
                }).catch((err) => {
                    console.error('Erro ao copiar: ', err);
                });
            };
        } else {
            walletInfoElement.textContent = 'Conectando...';
            walletInfoElement.className = 'badge bg-warning d-block text-center py-1 text-dark';
            walletInfoElement.style.cursor = 'default';
            walletInfoElement.onclick = null;
            walletInfoElement.title = 'Aguardando conexão...';
        }
    }

    // Formatar endereço da carteira
    formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    // Obter informações da rede
    async getNetworkInfo() {
        if (!this.provider || !this.isConnected) return null;
        
        try {
            const chainId = await this.provider.request({ method: 'eth_chainId' });
            const networks = {
                '0x1': 'Ethereum Mainnet',
                '0x38': 'BSC Mainnet',
                '0x61': 'BSC Testnet',
                '0x89': 'Polygon Mainnet'
            };
            
            return {
                chainId: chainId,
                name: networks[chainId] || 'Rede Desconhecida'
            };
        } catch (error) {
            console.error('❌ Erro ao obter rede:', error);
            return null;
        }
    }
}

// Instância global
window.walletManager = new WalletManager();

// Funções globais para compatibilidade
window.connectWalletGlobal = async function(redirectToDashboard = false) {
    return await window.walletManager.connect(redirectToDashboard);
};

window.isWalletConnected = function() {
    return window.walletManager.isWalletConnected();
};

window.getCurrentAccount = function() {
    return window.walletManager.getCurrentAccount();
};

window.disconnectWallet = function() {
    window.walletManager.disconnect();
};

window.formatWalletAddress = function(address) {
    return window.walletManager.formatAddress(address);
};

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WalletManager };
}

// Adicionar event listeners globais para atualizar o menu da carteira
document.addEventListener('wallet:connected', function() {
    if (window.walletManager) {
        window.walletManager.updateWalletMenuInfo();
    }
});

document.addEventListener('wallet:accountChanged', function() {
    if (window.walletManager) {
        window.walletManager.updateWalletMenuInfo();
    }
});

document.addEventListener('wallet:disconnected', function() {
    if (window.walletManager) {
        window.walletManager.updateWalletMenuDisconnected();
    }
});

// Aguardar carregamento do DOM para inicializar menu da carteira
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.walletManager) {
            window.walletManager.updateWalletMenuInfo();
        }
    }, 1000);
});

console.log('💼 Wallet Manager carregado e disponível globalmente');