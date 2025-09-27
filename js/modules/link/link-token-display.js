/**
 * ================================================================================
 * LINK TOKEN DISPLAY - TOKENCAFE
 * ================================================================================
 * Funções específicas para exibição e interação com tokens no módulo Link
 * Usa as funções compartilhadas da estrutura principal do sistema
 * ================================================================================
 */

// Importar utilitários compartilhados da estrutura principal
import { SharedUtilities } from '../../core/shared-utilities-es6.js';

class LinkTokenDisplay {
    constructor() {
        this.utils = new SharedUtilities();
        this.walletManager = null;
    }

    /**
     * Inicializar sistema de exibição de tokens
     */
    async init() {
        try {
            console.log('🎨 Inicializando Link Token Display...');
            
            // Verificar se há dados de token na URL
            const tokenData = this.getTokenDataFromURL();
            if (tokenData) {
                await this.displayTokenInfo(tokenData);
                await this.setupWalletButtons(tokenData);
            }
            
            console.log('✅ Link Token Display inicializado');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar Token Display:', error);
            this.showError('Parâmetros de token inválidos na URL');
        }
    }

    /**
     * Extrair dados do token da URL
     */
    getTokenDataFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        const tokenData = {
            address: params.get('address'),
            symbol: params.get('symbol'),
            decimals: params.get('decimals'),
            name: params.get('name'),
            chainId: params.get('chainId'),
            image: params.get('image')
        };

        // Validar dados obrigatórios
        if (!tokenData.address || !tokenData.symbol || !tokenData.decimals || !tokenData.name || !tokenData.chainId) {
            throw new Error('Parâmetros de token inválidos na URL');
        }

        return tokenData;
    }

    /**
     * Exibir informações do token
     */
    async displayTokenInfo(tokenData) {
        try {
            console.log('📋 Exibindo informações do token:', tokenData);

            // Atualizar elementos da UI
            this.updateElement('token-name', tokenData.name);
            this.updateElement('token-symbol', tokenData.symbol);
            this.updateElement('token-address', this.utils.formatAddress(tokenData.address));
            this.updateElement('token-address-full', tokenData.address);
            this.updateElement('token-decimals', tokenData.decimals);
            this.updateElement('token-chain-id', tokenData.chainId);

            // Atualizar imagem do token se disponível
            if (tokenData.image) {
                this.updateTokenImage(tokenData.image);
            }

            // Atualizar informações da rede
            await this.updateNetworkInfo(tokenData.chainId);

            // Configurar botão de cópia do endereço
            this.setupCopyButton();

        } catch (error) {
            console.error('❌ Erro ao exibir informações do token:', error);
            throw error;
        }
    }

    /**
     * Atualizar elemento da UI
     */
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Atualizar imagem do token
     */
    updateTokenImage(imageUrl) {
        const tokenImage = document.getElementById('token-image');
        if (tokenImage) {
            tokenImage.src = imageUrl;
            tokenImage.style.display = 'block';
            tokenImage.onerror = () => {
                tokenImage.style.display = 'none';
            };
        }
    }

    /**
     * Atualizar informações da rede
     */
    async updateNetworkInfo(chainId) {
        try {
            // Usar função da estrutura principal se disponível
            if (window.TokenCafe?.networks?.getNetworkInfo) {
                const networkInfo = window.TokenCafe.networks.getNetworkInfo(chainId);
                if (networkInfo) {
                    this.updateElement('network-name', networkInfo.name);
                    this.updateElement('network-symbol', networkInfo.symbol);
                    
                    // Atualizar link do explorer se disponível
                    const explorerLink = document.getElementById('explorer-link');
                    if (explorerLink && networkInfo.explorer) {
                        explorerLink.href = `${networkInfo.explorer}/token/${this.getTokenDataFromURL().address}`;
                        explorerLink.style.display = 'inline-block';
                    }
                }
            } else {
                // Fallback para redes conhecidas
                const networks = {
                    1: { name: 'Ethereum Mainnet', symbol: 'ETH', explorer: 'https://etherscan.io' },
                    56: { name: 'BNB Smart Chain', symbol: 'BNB', explorer: 'https://bscscan.com' },
                    137: { name: 'Polygon', symbol: 'MATIC', explorer: 'https://polygonscan.com' }
                };
                
                const network = networks[chainId];
                if (network) {
                    this.updateElement('network-name', network.name);
                    this.updateElement('network-symbol', network.symbol);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao atualizar informações da rede:', error);
        }
    }

    /**
     * Configurar botões das carteiras
     */
    async setupWalletButtons(tokenData) {
        try {
            console.log('🔧 Configurando botões das carteiras...');

            // Detectar carteiras instaladas usando função da estrutura principal
            const wallets = await this.detectInstalledWallets();
            const container = document.getElementById('wallet-buttons');
            
            if (!container) return;

            container.innerHTML = '';

            // Adicionar botões para carteiras detectadas
            if (wallets.metamask) {
                const metamaskBtn = this.createWalletButton(
                    'metamask',
                    'MetaMask',
                    'btn-warning',
                    () => this.addTokenToWallet('metamask', tokenData)
                );
                container.appendChild(metamaskBtn);
            }

            if (wallets.trustwallet) {
                const trustBtn = this.createWalletButton(
                    'trustwallet',
                    'Trust Wallet',
                    'btn-info',
                    () => this.addTokenToWallet('trustwallet', tokenData)
                );
                container.appendChild(trustBtn);
            }

            // Se nenhuma carteira foi detectada
            if (!wallets.metamask && !wallets.trustwallet) {
                this.showInstallWalletMessage(container);
            }

        } catch (error) {
            console.error('❌ Erro ao configurar botões das carteiras:', error);
        }
    }

    /**
     * Detectar carteiras instaladas
     */
    async detectInstalledWallets() {
        // Usar função da estrutura principal se disponível
        if (window.TokenCafe?.wallet?.detectInstalledWallets) {
            return await window.TokenCafe.wallet.detectInstalledWallets();
        }

        // Fallback para detecção manual
        const wallets = {
            metamask: false,
            trustwallet: false
        };

        if (window.ethereum?.isMetaMask) {
            wallets.metamask = true;
        }

        if (window.ethereum?.isTrust || window.ethereum?.isTrustWallet) {
            wallets.trustwallet = true;
        }

        return wallets;
    }

    /**
     * Criar botão de carteira
     */
    createWalletButton(walletType, walletName, buttonClass, clickHandler) {
        const button = document.createElement('button');
        button.className = `btn ${buttonClass} btn-lg w-100 mb-3`;
        button.innerHTML = `
            <i class="fas fa-wallet me-2"></i>
            Adicionar ao ${walletName}
        `;
        button.addEventListener('click', clickHandler);
        return button;
    }

    /**
     * Adicionar token à carteira
     */
    async addTokenToWallet(walletType, tokenData) {
        try {
            console.log(`🔗 Adicionando token ao ${walletType}...`);

            // Usar função da estrutura principal se disponível
            if (window.TokenCafe?.wallet?.addTokenToWallet) {
                const result = await window.TokenCafe.wallet.addTokenToWallet(tokenData, walletType);
                if (result.success) {
                    this.utils.showToast(`Token adicionado ao ${walletType} com sucesso!`, 'success');
                } else {
                    throw new Error(result.error || 'Erro desconhecido');
                }
            } else {
                // Fallback para MetaMask
                if (walletType === 'metamask' && window.ethereum) {
                    await window.ethereum.request({
                        method: 'wallet_watchAsset',
                        params: {
                            type: 'ERC20',
                            options: {
                                address: tokenData.address,
                                symbol: tokenData.symbol,
                                decimals: parseInt(tokenData.decimals),
                                image: tokenData.image
                            }
                        }
                    });
                    this.utils.showToast('Token adicionado ao MetaMask!', 'success');
                } else {
                    throw new Error('Carteira não suportada');
                }
            }

        } catch (error) {
            console.error(`❌ Erro ao adicionar token ao ${walletType}:`, error);
            this.utils.showToast(`Erro ao adicionar token: ${error.message}`, 'error');
        }
    }

    /**
     * Mostrar mensagem para instalar carteiras
     */
    showInstallWalletMessage(container) {
        container.innerHTML = `
            <div class="alert alert-info">
                <h6><i class="fas fa-info-circle me-2"></i>Nenhuma carteira detectada</h6>
                <p class="mb-3">Para adicionar este token, você precisa instalar uma carteira compatível:</p>
                <div class="d-grid gap-2">
                    <a href="https://metamask.io/download/" target="_blank" class="btn btn-outline-warning">
                        <i class="fas fa-download me-2"></i>Instalar MetaMask
                    </a>
                    <a href="https://trustwallet.com/download" target="_blank" class="btn btn-outline-info">
                        <i class="fas fa-download me-2"></i>Instalar Trust Wallet
                    </a>
                </div>
            </div>
        `;
    }

    /**
     * Configurar botão de cópia do endereço
     */
    setupCopyButton() {
        const copyBtn = document.getElementById('copy-address-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', async () => {
                const tokenData = this.getTokenDataFromURL();
                const success = await this.utils.copyToClipboard(tokenData.address);
                if (success) {
                    this.utils.showToast('Endereço copiado!', 'success');
                }
            });
        }
    }

    /**
     * Mostrar erro
     */
    showError(message) {
        const errorContainer = document.getElementById('error-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-danger">
                    <h6><i class="fas fa-exclamation-triangle me-2"></i>Erro</h6>
                    <p class="mb-0">${message}</p>
                </div>
            `;
            errorContainer.style.display = 'block';
        }
        
        // Ocultar conteúdo principal
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.style.display = 'none';
        }
    }
}

// Exportar para uso global
window.LinkTokenDisplay = LinkTokenDisplay;

export default LinkTokenDisplay;