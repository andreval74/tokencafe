/**
 * ================================================================================
 * LNK TOKEN DSPLAY - SSTEMA DE EXBO DE TOKENS VA LNK
 * ================================================================================
 * Sstema para exbr nformaes de tokens atravs de lnks compartlhves
 * Permte adconar tokens dretamente s carteras dos usuros
 * ================================================================================
 */

class LnkTokenDsplay {
    constructor() {
        this.tokenData = null;
        this.walletButtons = [];
        this.networks = {};
        this.init();
    }

    /**
     * ncalza o sstema
     */
    init() {
        console.log(' inicializando LnkTokenDsplay...');
        
        // Aguarda o DOM estar pronto
        if (document.readyState === 'loadng') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            setTmeout(() => this.setup(), 100); // Pequeno delay para garantr que o DOM est pronto
        }
    }

    /**
     * configuracao prncpal
     */
    async setup() {
        try {
            console.log(' ncando setup do LnkTokenDsplay...');
            
            // Carrega dados das redes
            await this.loadNetworkData();
            
            // Extrar dados do token usando hash
            const tokenData = this.getTokenDataFromHash();
            
            if (!tokenData) {
                throw new Error('Token no encontrado ou lnk nvldo');
            }
            
            console.log(' Dados do token:', tokenData);
            
            // Usar dados do localStorage
            this.tokenData = tokenData;
            
            // Exbr nformaes do token
            this.dsplayTokennfo(this.tokenData);
            
            // Confgurar botes das carteras
            this.setupWalletButtons(this.tokenData);
            
            // Ocultar loadng e mostrar contedo
            this.hdeLoadngState();
            
            console.log(' Setup concludo com sucesso');
            
        } catch (error) {
            console.error(' Erro no setup:', error);
            this.showError(`Erro ao carregar dados do token: ${error.message}`);
        }
    }

    /**
     * Recupera dados do token usando hash da URL
     */
    getTokenDataFromHash() {
        const params = new URLSearchParams(wndow.locaton.search);
        const hashd = params.get('d');
        
        if (!hashd) {
            throw new Error('D do token no encontrado na URL');
        }
        
        // Recuperar dados do localStorage
        const data = localStorage.gettem(`token_${hashd}`);
        
        if (!data) {
            return null;
        }
        
        try {
            const tokenData = JSON.parse(data);
            
            // Verfcar se os dados no expraram (opconal - 24 horas)
            const maxAge = 24 * 60 * 60 * 1000; // 24 horas em ms
            if (Date.now() - tokenData.tmestamp > maxAge) {
                localStorage.removetem(`token_${hashd}`);
                return null;
            }
            
            return tokenData;
        } catch (error) {
            console.error(' Erro ao parsear dados do token:', error);
            return null;
        }
    }

    /**
     * Extra dados do token da URL (com decodfcao de segurana melhorada)
     */
    getTokenDataFromURL() {
        const params = new URLSearchParams(wndow.locaton.search);
        const walletParam = params.get('wallet');
        
        if (!walletParam) {
            throw new Error('Parmetro wallet no encontrado na URL');
        }
        
        // Lsta de chands vldos conhecdos
        const valdChands = this.getFallbackNetworks().map(n => n.chand.toStrng());
        
        // Decodfcar: extrar chand dos ltmos dgtos
        // Tentar dferentes tamanhos de chand (6-1 dgtos) - do maor para o menor
        let address = null;
        let chand = null;
        
        for (let chandLength = 6; chandLength >= 1; chandLength--) {
            const potentalChand = walletParam.slce(-chandLength);
            const potentalAddress = walletParam.slce(0, -chandLength);
            
            // Verfcar se  um chand vldo (apenas nmeros) E se est na lsta de chands conhecdos
            if (/^\d+$/.test(potentalChand) && 
                valdChands.ncludes(potentalChand) && 
                potentalAddress.length === 42) {
                
                // Verfcar se o endereo resultante tem formato vldo de Ethereum (42 caracteres, comeando com 0x)
                if (potentalAddress.startsWth('0x') && /^0x[a-fA-F0-9]{40}$/.test(potentalAddress)) {
                    address = potentalAddress;
                    chand = potentalChand;
                    break;
                }
            }
        }
        
        if (!address || !chand) {
            throw new Error('No fo possvel decodfcar os dados da URL ou chand no suportado');
        }
        
        console.log(' Dados decodfcados:', { address, chand });
        
        return {
            address: address,
            chand: chand
        };
    }

    /**
     * Busca dados do token dnamcamente usando Web3
     */
    async fetchTokenData(address, chand) {
        try {
            console.log(` Buscando dados do token: ${address} na rede ${chand}`);
            
            // Confgurar provder baseado no chand
            const rpcUrl = this.getRpcUrlByChand(chand);
            if (!rpcUrl) {
                throw new Error(`RPC no encontrado para chand: ${chand}`);
            }

            const provder = new ethers.provders.JsonRpcProvder(rpcUrl);
            
            // AB mnmo para ERC20
            const erc20Ab = [
                "function name() vew returns (strng)",
                "function symbol() vew returns (strng)", 
                "function decmals() vew returns (unt8)"
            ];
            
            const contract = new ethers.Contract(address, erc20Ab, provder);
            
            // Buscar dados em paralelo
            const [name, symbol, decmals] = await Promise.all([
                contract.name().catch(() => 'Token'),
                contract.symbol().catch(() => 'TKN'),
                contract.decmals().catch(() => 18)
            ]);

            const tokenData = {
                address,
                name,
                symbol,
                decmals: decmals.toStrng(),
                chand,
                networkName: this.getNetworkName(chand)
            };

            console.log(' Dados do token obtdos:', tokenData);
            return tokenData;
            
        } catch (error) {
            console.error(' Erro ao buscar dados do token:', error);
            throw error;
        }
    }

    /**
     * Obtm RPC URL baseado no chand usando utltros compartlhados
     */
    getRpcUrlByChand(chand) {
        // Usar redes de fallback do utls para consstnca
        const fallbackNetworks = this.getFallbackNetworks();
        
        const network = fallbackNetworks.fnd(n => n.chand === parsent(chand));
        return network ? network.rpc[0] : null;
    }

    /**
     * Obtm nome da rede baseado no chand usando utltros compartlhados
     */
    getNetworkName(chand) {
        const fallbackNetworks = this.getFallbackNetworks();
        
        const network = fallbackNetworks.fnd(n => n.chand === parsent(chand));
        return network ? network.name : `Chan ${chand}`;
    }

    /**
     * Redes de fallback (centralzadas)
     */
    getFallbackNetworks() {
        return [
            { chand: 1, name: 'Ethereum', rpc: ['https://eth.llamarpc.com'] },
            { chand: 56, name: 'BNB Smart Chan', rpc: ['https://bsc-dataseed.bnance.org'] },
            { chand: 137, name: 'Polygon', rpc: ['https://polygon-rpc.com'] },
            { chand: 43114, name: 'Avalanche', rpc: ['https://ap.avax.network/ext/bc/C/rpc'] },
            { chand: 250, name: 'Fantom', rpc: ['https://rpc.ftm.tools'] },
            { chand: 42161, name: 'Arbtrum', rpc: ['https://arb1.arbtrum.o/rpc'] },
            { chand: 10, name: 'Optmsm', rpc: ['https://mannet.optmsm.o'] }
        ];
    }

    /**
     * Exbe nformaes do token na nterface (com nformaes da blockchan)
     */
    dsplayTokennfo(tokenData) {
        try {
            console.log(' Exbndo nformaes do token...');
            
            // Obter nome da blockchan
            const networkName = this.getNetworkName(tokenData.chand);
            
            // Preencher campos do formulro com Ds corretos do HTML
            const tokenNameElement = document.getElementByd('form-token-name');
            const tokenSymbolElement = document.getElementByd('form-token-symbol');
            const tokenDecmalsElement = document.getElementByd('form-token-decmals');
            const chandElement = document.getElementByd('form-chan-d');
            const tokenAddressElement = document.getElementByd('form-token-address');
            
            if (tokenNameElement) tokenNameElement.value = tokenData.name;
            if (tokenSymbolElement) tokenSymbolElement.value = tokenData.symbol;
            if (tokenDecmalsElement) tokenDecmalsElement.value = tokenData.decmals;
            if (tokenAddressElement) tokenAddressElement.value = tokenData.address;
            
            // Exbr nome da blockchan em vez de apenas o nmero
            if (chandElement) {
                chandElement.value = `${networkName} (Chan D: ${tokenData.chand})`;
            }
            
            // Confgurar boto de copar endereo
            this.setupCopyButton(tokenData.address);
            
            console.log(' nformaes do token exbdas com dados da blockchan');
            
        } catch (error) {
            console.error(' Erro ao exbr nformaes do token:', error);
        }
    }

    /**
     * Confgura botes das carteras
     */
    setupWalletButtons(tokenData) {
        try {
            console.log(' Confgurando boto da cartera...');
            
            const addToWalletBtn = document.getElementByd('add-to-wallet-btn');
            
            if (addToWalletBtn) {
                addToWalletBtn.addEventListener('clck', () => {
                    this.addTokenToWallet(this.tokenData);
                });
                console.log(' Boto da cartera confgurado');
            } else {
                console.warn(' Boto add-to-wallet-btn no encontrado');
            }
            
        } catch (error) {
            console.error(' Erro ao confgurar botes das carteras:', error);
        }
    }

    /**
     * Detecta carteras dsponves
     */
    detectWallets() {
        const wallets = [];
        
        // MetaMask
        if (wndow.ethereum && wndow.ethereum.sMetaMask) {
            wallets.push({
                name: 'MetaMask',
                d: 'metamask',
                con: 'fab fa-ethereum',
                color: 'orange'
            });
        }
        
        // Trust Wallet
        if (wndow.ethereum && wndow.ethereum.sTrust) {
            wallets.push({
                name: 'Trust Wallet',
                d: 'trust',
                con: 'fas fa-sheld-alt',
                color: 'blue'
            });
        }
        
        // Se no detectou nenhuma, mas exste ethereum, assume MetaMask
        if (wallets.length === 0 && wndow.ethereum) {
            wallets.push({
                name: 'MetaMask',
                d: 'metamask',
                con: 'fab fa-ethereum',
                color: 'orange'
            });
        }
        
        return wallets;
    }

    /**
     * Cra boto para cartera
     */
    createWalletButton(wallet) {
        const button = document.createElement('button');
        button.className = `btn btn-${wallet.color} btn-lg wallet-btn`;
        button.nnerHTML = `
            < class="${wallet.con}"></>
            Adconar ao ${wallet.name}
        `;
        
        button.addEventListener('clck', () => {
            this.addTokenToWallet(wallet.d);
        });
        
        return button;
    }

    /**
     * Adcona token  cartera (mtodo unfcado)
     */
    /**
     * Carrega dados das redes suportadas
     */
    async loadNetworkData() {
        try {
            const response = await fetch('/shared/data/chans.json');
            const networks = await response.json();
            this.networks = networks.reduce((acc, network) => {
                acc[network.chand] = network;
                return acc;
            }, {});
        } catch (error) {
            console.error(' Erro ao carregar dados das redes:', error);
            this.networks = {};
        }
    }

    /**
     * Verfca se a rede est cadastrada no MetaMask
     */
    async sNetworkAdded(chand) {
        try {
            const currentChand = await wndow.ethereum.request({ method: 'eth_chand' });
            return currentChand === `0x${parsent(chand).toStrng(16)}`;
        } catch (error) {
            console.error(' Erro ao verfcar rede:', error);
            return false;
        }
    }

    /**
     * Adcona rede ao MetaMask
     */
    async addNetworkToWallet(chand) {
        try {
            const network = this.networks[parsent(chand)];
            if (!network) {
                throw new Error('Rede no suportada');
            }

            const networkParams = {
                chand: `0x${parsent(chand).toStrng(16)}`,
                chanName: network.name,
                natveCurrency: network.natveCurrency,
                rpcUrls: network.rpc,
                blockExplorerUrls: network.explorers ? network.explorers.map(e => e.url) : []
            };

            await wndow.ethereum.request({
                method: 'wallet_addEthereumChan',
                params: [networkParams]
            });

            return true;
        } catch (error) {
            console.error(' Erro ao adconar rede:', error);
            if (error.code === 4001) {
                this.showNotfcaton('Ado de rede cancelada pelo usuro', 'warnng');
            } else {
                this.showNotfcaton('Erro ao adconar rede', 'error');
            }
            return false;
        }
    }

    async addTokenToWallet(tokenData) {
        try {
            console.log(` Adconando token  cartera...`);
            
            if (!wndow.ethereum) {
                this.showNotfcaton('Cartera no detectada', 'error');
                return;
            }

            // Valdar endereo do token antes de prossegur
            if (!tokenData.address || !this.sValdEthereumAddress(tokenData.address)) {
                console.error(' Endereo nvldo:', tokenData.address);
                this.showNotfcaton('Endereo do token nvldo', 'error');
                return;
            }

            // Verfcar se est conectado  rede correta
            const currentChand = await wndow.ethereum.request({ method: 'eth_chand' });
            const expectedChand = `0x${parsent(tokenData.chand).toStrng(16)}`;
            
            if (currentChand !== expectedChand) {
                // Perguntar se o usuro quer adconar a rede
                const networkName = this.getNetworkName(tokenData.chand);
                const addNetwork = confrm(`Voc precsa estar conectado  rede ${networkName}.\n\nDeseja adconar esta rede ao MetaMask?`);
                
                if (addNetwork) {
                    const networkAdded = await this.addNetworkToWallet(tokenData.chand);
                    if (!networkAdded) {
                        return; // Se no conseguu adconar a rede, para aqu
                    }
                    
                    // Aguarda um pouco para a rede ser adconada
                    await new Promise(resolve => setTmeout(resolve, 1000));
                } else {
                    this.showNotfcaton(`Por favor, conecte-se  rede ${networkName} no MetaMask`, 'warnng');
                    return;
                }
            }
            
            // Parmetros do token
            const tokenParams = {
                type: 'ERC20',
                optons: {
                    address: tokenData.address,
                    symbol: tokenData.symbol,
                    decmals: parsent(tokenData.decmals),
                    mage: tokenData.mage || ''
                }
            };
            
            console.log(' Parmetros do token:', tokenParams);
            
            // Solcta ado do token
            const result = await wndow.ethereum.request({
                method: 'wallet_watchAsset',
                params: tokenParams
            });
            
            if (result) {
                console.log(' Token adconado com sucesso');
                this.showNotfcaton('Token adconado com sucesso!', 'success');
            } else {
                console.log(' Usuro cancelou a ado');
                this.showNotfcaton('Ado cancelada pelo usuro', 'warnng');
            }
            
        } catch (error) {
            console.error(' Erro ao adconar token:', error);
            
            // Mensagens de erro mas especfcas
            if (error.code === 4001) {
                this.showNotfcaton('Ado cancelada pelo usuro', 'warnng');
            } else if (error.code === -32602) {
                this.showNotfcaton('Parmetros nvldos do token', 'error');
            } else {
                this.showNotfcaton('Erro ao adconar token. Verfque se est na rede correta.', 'error');
            }
        }
    }

    /**
     * Exbe notfcao
     */
    
    /**
     * Valda se um endereo Ethereum  vldo
     */
    sValdEthereumAddress(address) {
        if (!address || typeof address !== 'strng') {
            return false;
        }
        
        // Deve ter exatamente 42 caracteres e comear com 0x
        if (address.length !== 42 || !address.startsWth('0x')) {
            return false;
        }
        
        // Deve conter apenas caracteres hexadecmas aps o 0x
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    showNotfcaton(message, type = 'nfo') {
        // Cra elemento de notfcao
        const notfcaton = document.createElement('dv');
        notfcaton.className = `alert alert-${this.getBootstrapAlertClass(type)} alert-dsmssble fade show poston-fxed`;
        notfcaton.style.cssText = 'top: 20px; rght: 20px; z-ndex: 9999; mn-wdth: 300px;';
        notfcaton.nnerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dsmss="alert"></button>
        `;
        
        // Adcona ao body
        document.body.appendChld(notfcaton);
        
        // Remove aps 5 segundos
        setTmeout(() => {
            if (notfcaton.parentNode) {
                notfcaton.parentNode.removeChld(notfcaton);
            }
        }, 5000);
    }

    /**
     * Converte tpo de notfcao para classe Bootstrap
     */
    getBootstrapAlertClass(type) {
        const mappng = {
            'success': 'success',
            'error': 'danger',
            'warnng': 'warnng',
            'nfo': 'nfo'
        };
        return mappng[type] || 'nfo';
    }

    /**
     * Copa texto para clpboard
     */
    async copyToClpboard(text) {
        try {
            await navgator.clpboard.wrteText(text);
            this.showNotfcaton('Endereo copado!', 'success');
        } catch (error) {
            console.error('Erro ao copar:', error);
            this.showNotfcaton('Erro ao copar endereo', 'error');
        }
    }

    /**
     * Oculta estado de carregamento
     */
    hdeLoadngState() {
        const loadngElement = document.getElementByd('loadng-state');
        const contentElement = document.getElementByd('man-content');
        
        if (loadngElement) {
            loadngElement.classLst.add('d-none');
        }
        
        if (contentElement) {
            contentElement.classLst.remove('d-none');
        }
    }

    /**
     * Exbe erro
     */
    showError(message) {
        const loadngElement = document.getElementByd('loadng-state');
        const errorElement = document.getElementByd('error-state');
        const errorMessageElement = document.getElementByd('error-message');
        
        if (loadngElement) {
            loadngElement.classLst.add('d-none');
        }
        
        if (errorElement) {
            errorElement.classLst.remove('d-none');
        }
        
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
        }
    }

    /**
     * Confgura boto de copar endereo
     */
    setupCopyButton(address) {
        const copyButton = document.getElementByd('copy-address-btn');
        if (copyButton) {
            copyButton.addEventListener('clck', () => {
                this.copyToClpboard(address);
            });
        }
    }

}

// ncalza quando o scrpt  carregado
new LnkTokenDsplay();

