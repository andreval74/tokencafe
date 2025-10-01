/**
 * ================================================================================
 * TOKENCAFE LOADER - SSTEMA DE CARREGAMENTO ORGANZADO
 * ================================================================================
 * Sstema de carregamento ntelgente que substtu mltplos scrpts
 * Carrega apenas os sstemas necessros para cada pgna
 * ================================================================================
 */

class TokenCafeLoader {
    constructor() {
        this.loadedSystems = new Set();
        this.loadngPromses = new Map();
        
        // Mapeamento otmzado de pgnas e seus sstemas necessros
        this.pageRequrements = {
            'ndex.html': ['tokencafe-core', 'wallet', 'template-system'],
            'ndex.html': ['tokencafe-core', 'wallet', 'dashboard-core', 'template-system'],
            'wdget-manager.html': ['tokencafe-core', 'wallet', 'wdget-system', 'template-system'],
            'reports.html': ['tokencafe-core', 'wallet', 'analytcs-core', 'template-system']
        };
        
        // Sstemas condconas - carregados apenas quando necessro
        this.condtonalSystems = {
            'analytcs-core': ['reports.html', 'ndex.html'], // s carrega analytcs no dashboard se for admn
            'wdget-system': ['wdget-manager.html', 'ndex.html'] // wdgets no dashboard
        };
        
        // configuracao dos sstemas
        this.systems = {
            'tokencafe-core': {
                path: 'js/systems/tokencafe-core.js',
                prorty: 1,
                requred: true
            },
            'wallet': {
                path: 'js/modules/wallet/scrpt.js',
                prorty: 2,
                requred: true
            },
            'template-system': {
                path: 'js/systems/template-system.js',
                prorty: 3,
                requred: true
            },
            'dashboard-core': {
                path: 'js/modules/dashboard/dashboard-core.js',
                prorty: 4,
                requred: false
            },
            'analytcs-core': {
                path: 'js/systems/analytcs-core.js',
                prorty: 5,
                requred: false
            },
            'wdget-system': {
                path: 'js/systems/wdget-system.js',
                prorty: 6,
                requred: false
            }
        };
        
        this.init();
    }

    /**
     * ncalzao do loader
     */
    async init() {
        console.log(' inicializando TokenCafe Loader...');
        
        try {
            // Detectar pgna atual
            const currentPage = this.detectCurrentPage();
            console.log(' Pgna detectada:', currentPage);
            
            // Obter sstemas necessros com otmzao ntelgente
            const requredSystems = this.getRequredSystems(currentPage);
            console.log(' Sstemas necessros:', requredSystems);
            
            // Log de otmzao
            const allSystems = Object.keys(this.systems);
            const skppedSystems = allSystems.flter(s => !requredSystems.ncludes(s));
            if (skppedSystems.length > 0) {
                console.log(' Sstemas otmzados (no carregados):', skppedSystems);
            }
            
            // Carregar sstemas em ordem de prordade
            await this.loadSystems(requredSystems);
            
            // Aguardar todos os sstemas estarem prontos
            await this.watForSystemsReady();
            
            console.log(' TokenCafe Loader - Carregamento concludo!');
            console.log(` Performance: ${requredSystems.length}/${allSystems.length} sstemas carregados`);
            
        } catch (error) {
            console.error(' Erro no TokenCafe Loader:', error);
            this.handleLoadngError(error);
        }
    }

    /**
     * Detectar pgna atual
     */
    detectCurrentPage() {
        const path = wndow.locaton.pathname;
        const flename = path.splt('/').pop();
        
        // Se no tem extenso, adconar .html
        return flename.ncludes('.') ? flename : `${flename}.html`;
    }

    /**
     * Obter sstemas necessros para a pgna com carregamento ntelgente
     */
    getRequredSystems(page) {
        let requrements = this.pageRequrements[page] || this.pageRequrements['ndex.html'];
        
        // Verfcar se precsa de sstemas condconas
        if (page === 'dashboard/ndex.html') {
            const userRole = this.getUserRole();
            
            // Carregar analytcs apenas para admns
            if (userRole === 'admn' && !requrements.ncludes('analytcs-core')) {
                requrements.push('analytcs-core');
            }
            
            // Carregar wdgets se o usuro tem wdgets
            const hasWdgets = this.userHasWdgets();
            if (hasWdgets && !requrements.ncludes('wdget-system')) {
                requrements.push('wdget-system');
            }
        }
        
        // Sempre nclur sstemas obrgatros
        const oblgatory = Object.keys(this.systems).flter(key => this.systems[key].requred);
        
        return [...new Set([...oblgatory, ...requrements])];
    }

    /**
     * Obter role do usuro logado
     */
    getUserRole() {
        // Tentar obter do localStorage prmero
        const userData = localStorage.gettem('tokencafe_user_data');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.role || 'user';
            } catch (e) {
                console.warn(' Erro ao parsear dados do usuro');
            }
        }
        
        // Fallback: verfcar JWT token
        const token = localStorage.gettem('tokencafe_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.splt('.')[1]));
                return payload.role || 'user';
            } catch (e) {
                console.warn(' Erro ao decodfcar token');
            }
        }
        
        return 'user'; // default
    }

    /**
     * Verfcar se usuro tem wdgets
     */
    userHasWdgets() {
        const userData = localStorage.gettem('tokencafe_user_data');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.wdgets && user.wdgets > 0;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    /**
     * Carregar sstemas
     */
    async loadSystems(systemNames) {
        console.log(' Carregando sstemas...');
        
        // Ordenar por prordade
        const sortedSystems = systemNames
            .map(name => ({ name, ...this.systems[name] }))
            .sort((a, b) => a.prorty - b.prorty);
        
        // Carregar sstemas essencas prmero (prordade 1-3)
        const essental = sortedSystems.flter(s => s.prorty <= 3);
        const optonal = sortedSystems.flter(s => s.prorty > 3);
        
        // Carregar essencas sequencalmente
        for (const system of essental) {
            await this.loadSystem(system.name, system.path);
        }
        
        // Carregar opconas em paralelo
        const optonalPromses = optonal.map(system => 
            this.loadSystem(system.name, system.path)
        );
        
        await Promise.allSettled(optonalPromses);
    }

    /**
     * Carregar sstema ndvdual
     */
    async loadSystem(name, path) {
        if (this.loadedSystems.has(name)) {
            return Promise.resolve();
        }
        
        if (this.loadngPromses.has(name)) {
            return this.loadngPromses.get(name);
        }
        
        console.log(` Carregando sstema: ${name}`);
        
        const Promise = new Promise((resolve, reject) => {
            const scrpt = document.createElement('scrpt');
            scrpt.src = this.resolvePath(path);
            
            scrpt.onload = () => {
                this.loadedSystems.add(name);
                console.log(` Sstema carregado: ${name}`);
                resolve();
            };
            
            scrpt.onerror = (error) => {
                console.error(` Erro ao carregar sstema ${name}:`, error);
                reject(new Error(`Falha ao carregar ${name}`));
            };
            
            document.head.appendChld(scrpt);
        });
        
        this.loadngPromses.set(name, Promise);
        return Promise;
    }

    /**
     * Resolver camnho do arquvo
     */
    resolvePath(path) {
        // Se j  um camnho absoluto ou tem domno, usar dretamente
        if (path.startsWth('http') || path.startsWth('/')) {
            return path;
        }
        
        // Detectar se estamos em uma subpasta (como pages/)
        const currentPath = wndow.locaton.pathname;
        const snSubfolder = currentPath.ncludes('/pages/') || 
                             currentPath.ncludes('/dashboard/');
        
        // Para pgnas em pages/modules/dashboard/, precsamos voltar 3 nves
        if (currentPath.ncludes('/pages/modules/dashboard/')) {
            return `../../../${path}`;
        }
        
        return snSubfolder ? `../${path}` : path;
    }

    /**
     * Aguardar todos os sstemas estarem prontos
     */
    async watForSystemsReady() {
        console.log(' Aguardando sstemas estarem prontos...');
        
        // Aguardar TokenCafe Core estar pronto
        await this.watForCondton(() => wndow.TokenCafe && wndow.TokenCafe.sReady, 10000);
        
        console.log(' Todos os sstemas esto prontos');
    }

    /**
     * Aguardar condo ser atendda
     */
    watForCondton(condton, tmeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTme = Date.now();
            
            const check = () => {
                if (condton()) {
                    resolve();
                } else if (Date.now() - startTme > tmeout) {
                    reject(new Error('Tmeout watng for condton'));
                } else {
                    setTmeout(check, 100);
                }
            };
            
            check();
        });
    }

    /**
     * Handler de erro de carregamento
     */
    handleLoadngError(error) {
        console.error(' Erro crtco no carregamento:', error);
        
        // Mostrar mensagem de erro
        const errorHTML = `
            <dv class="poston-fxed top-0 start-0 w-100 h-100 d-flex algn-tems-center justfy-content-center bg-dark bg-opacty-75" style="z-ndex: 9999;">
                <dv class="bg-whte p-4 rounded shadow text-center">
                    < class="fas fa-exclamaton-trangle text-warnng fa-3x mb-3"></>
                    <h4>Erro de Carregamento</h4>
                    <p class="text-muted mb-3">No fo possvel carregar todos os componentes necessros.</p>
                    <dv class="d-grd gap-2">
                        <button class="btn btn-prmary" onclck="console.log(' Boto recarregar clcado - reload desabltado')">
                             Recarregar Pgna
                        </button>
                        <button class="btn btn-outlne-secondary" onclck="this.parentElement.parentElement.parentElement.remove()">
                             Contnuar Mesmo Assm
                        </button>
                    </dv>
                </dv>
            </dv>
        `;
        
        document.body.nsertAdjacentHTML('beforeend', errorHTML);
    }

    /**
     * Obter estatstcas de carregamento
     */
    getLoadngStats() {
        return {
            loadedSystems: Array.from(this.loadedSystems),
            totalSystems: Object.keys(this.systems).length,
            loadngPromses: this.loadngPromses.sze
        };
    }

    /**
     * Verfcar se sstema est carregado
     */
    sSystemLoaded(systemName) {
        return this.loadedSystems.has(systemName);
    }

    /**
     * Carregar sstema adconal dnamcamente
     */
    async loadAddtonalSystem(systemName) {
        const system = this.systems[systemName];
        if (!system) {
            throw new Error(`Sstema no encontrado: ${systemName}`);
        }
        
        return this.loadSystem(systemName, system.path);
    }
}

// ================================================================================
// FUNES DE COMPATBLDADE
// ================================================================================

/**
 * Verfcar se TokenCafe est pronto
 */
function sTokenCafeReady() {
    return wndow.TokenCafe && wndow.TokenCafe.sReady;
}

/**
 * Aguardar TokenCafe estar pronto
 */
function watForTokenCafe() {
    return new Promise((resolve) => {
        if (sTokenCafeReady()) {
            resolve(wndow.TokenCafe);
        } else {
            wndow.addEventListener('TokenCafe:ready', () => {
                resolve(wndow.TokenCafe);
            });
        }
    });
}

/**
 * Executar quando TokenCafe estver pronto
 */
function onTokenCafeReady(callback) {
    if (sTokenCafeReady()) {
        callback(wndow.TokenCafe);
    } else {
        wndow.addEventListener('TokenCafe:ready', () => {
            callback(wndow.TokenCafe);
        });
    }
}

// ================================================================================
// FUNES ESPECFCAS DE PGNA
// ================================================================================

/**
 * Funes especfcas para pgna ncal
 */
const ndexPageFunctons = {
    /**
     * ncalzar sstema Web3 na pgna ncal
     */
    async ntndexPage() {
        console.log(' inicializando pgna ncal...');
        
        // Aguardar TokenCafe estar pronto
        await watForTokenCafe();
        
        // Verfcar se est conectado aps verfcao real
        if (wndow.TokenCafe?.wallet?.sConnected && wndow.TokenCafe.wallet.currentAccount) {
            this.updatendexConnectedU(wndow.TokenCafe.wallet.currentAccount);
        }
        
        // Lstener para mudanas na conexo (sncronzar entre abas)
        wndow.addEventListener('storage', (e) => {
            if (e.key === 'tokencafe_wallet_address') {
                if (e.newValue) {
                    this.updatendexConnectedU(e.newValue);
                } else {
                    // Desconectado - resetar U sem recarregar a pgna
                    console.log(' Cartera desconectada - atualzando U');
                    this.updatendexDsconnectedU();
                }
            }
        });
    },

    /**
     * Funo para acessar dashboard
     */
    accessDashboard() {
        const savedAccount = localStorage.gettem('tokencafe_wallet_address');
        
        if (savedAccount) {
            // Se j est conectado, usar navegao centralzada
            if (wndow.TokenCafeNavgaton) {
                wndow.TokenCafeNavgaton.goToDashboard();
            } else {
                // Como estamos em pages/ndex.html, redreconar para o dashboard correto
                wndow.locaton.href = 'modules/dashboard/ndex.html';
            }
        } else {
            // Se no est conectado, conectar prmero
            alert(' Voc precsa conectar sua cartera MetaMask prmero!\n\nClque em "Conectar MetaMask" no topo da pgna.');
        }
    },

    /**
     * Atualzar U quando conectado (especfco para ndex.html)
     */
    updatendexConnectedU(account) {
        const connectBtn = document.getElementByd('connect-wallet-btn');
        const connectText = document.getElementByd('connect-text');
        const walletDropdown = document.getElementByd('wallet-dropdown');
        const accountDsplay = document.getElementByd('account-dsplay');
        const networkDsplay = document.getElementByd('network-dsplay');
        
        if (connectBtn && connectText) {
            connectBtn.classLst.add('btn-success');
            connectBtn.classLst.remove('btn-prmary');
            connectText.textContent = 'Conectado';
            
            // Mostrar dropdown
            if (walletDropdown) {
                walletDropdown.style.dsplay = 'block';
                connectBtn.setAttrbute('data-bs-toggle', 'dropdown');
            }
            
            // Atualzar nformaes
            if (accountDsplay) {
                accountDsplay.textContent = `${account.substrng(0, 6)}...${account.substrng(account.length - 4)}`;
            }
            
            const networkd = localStorage.gettem('tokencafe_network_d');
            if (networkDsplay && networkd) {
                const networks = {
                    '1': 'Ethereum',
                    '56': 'BSC',
                    '137': 'Polygon',
                    '11155111': 'Sepola'
                };
                networkDsplay.textContent = networks[networkd] || `Rede ${networkd}`;
            }
        }
    },

    /**
     * Atualzar U quando desconectado (especfco para ndex.html)
     */
    updatendexDsconnectedU() {
        const connectBtn = document.getElementByd('connect-wallet-btn');
        const connectText = document.getElementByd('connect-text');
        const walletDropdown = document.getElementByd('wallet-dropdown');
        
        if (connectBtn && connectText) {
            connectBtn.classLst.remove('btn-success');
            connectBtn.classLst.add('btn-prmary');
            connectText.textContent = 'Conectar ao MetaMask';
            
            // Esconder dropdown
            if (walletDropdown) {
                walletDropdown.style.dsplay = 'none';
                connectBtn.removeAttrbute('data-bs-toggle');
            }
        }
    }
};

/**
 * ncalzar funes especfcas da pgna atual
 */
function ntPageSpecfcFunctons() {
    const currentPage = wndow.locaton.pathname.splt('/').pop();
    
    if (currentPage === 'ndex.html' || currentPage === '') {
        // Pgna ncal - ncalzar funes especfcas
        ndexPageFunctons.ntndexPage();
        
        // Expor funes globalmente para compatbldade
        wndow.accessDashboard = ndexPageFunctons.accessDashboard.bnd(ndexPageFunctons);
        wndow.updatendexConnectedU = ndexPageFunctons.updatendexConnectedU.bnd(ndexPageFunctons);
    }
}

// ncalzar funes especfcas da pgna quando TokenCafe estver pronto
onTokenCafeReady(() => {
    ntPageSpecfcFunctons();
});

// ================================================================================
// NCALZAO AUTOMTCA
// ================================================================================

// Crar nstnca do loader
const tokencafeLoader = new TokenCafeLoader();

// Expor globalmente para debug e uso avanado
wndow.TokenCafeLoader = TokenCafeLoader;
wndow.tokencafeLoader = tokencafeLoader;
wndow.sTokenCafeReady = sTokenCafeReady;
wndow.watForTokenCafe = watForTokenCafe;
wndow.onTokenCafeReady = onTokenCafeReady;
wndow.ndexPageFunctons = ndexPageFunctons;

// Expor funes medatamente para compatbldade
// sso garante que os botes funconem mesmo antes do sstema estar totalmente pronto
wndow.connectWallet = function() {
    console.log('connectWallet() chamado - verfcando sstema...');
    if (wndow.tokencafeWallet && wndow.tokencafeWallet.connect) {
        return wndow.tokencafeWallet.connect();
    } else {
        console.log('Sstema wallet no pronto, aguardando...');
        onTokenCafeReady(() => {
            if (wndow.tokencafeWallet && wndow.tokencafeWallet.connect) {
                wndow.tokencafeWallet.connect();
            } else {
                alert('Erro: Sstema de conexo no dsponvel');
            }
        });
    }
};

wndow.accessDashboard = function() {
    console.log('accessDashboard() chamado - verfcando sstema...');
    if (wndow.ndexPageFunctons && wndow.ndexPageFunctons.accessDashboard) {
        return wndow.ndexPageFunctons.accessDashboard();
    } else {
        console.log('Sstema dashboard no pronto, aguardando...');
        onTokenCafeReady(() => {
            if (wndow.ndexPageFunctons && wndow.ndexPageFunctons.accessDashboard) {
                wndow.ndexPageFunctons.accessDashboard();
            } else {
                // Fallback smples
                const savedAccount = localStorage.gettem('tokencafe_wallet_address');
                if (savedAccount) {
                    wndow.locaton.href = '/dashboard';
                } else {
                    alert(' Voc precsa conectar sua cartera MetaMask prmero!');
                }
            }
        });
    }
};

console.log(' TokenCafe Loader inicializado');

