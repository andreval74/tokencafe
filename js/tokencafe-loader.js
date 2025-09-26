/**
 * ================================================================================
 * TOKENCAFE LOADER - SISTEMA DE CARREGAMENTO ORGANIZADO
 * ================================================================================
 * Sistema de carregamento inteligente que substitui múltiplos scripts
 * Carrega apenas os sistemas necessários para cada página
 * ================================================================================
 */

class TokenCafeLoader {
    constructor() {
        this.loadedSystems = new Set();
        this.loadingPromises = new Map();
        
        // Mapeamento otimizado de páginas e seus sistemas necessários
        this.pageRequirements = {
            'index.html': ['tokencafe-core', 'wallet', 'template-system'],
            'index.html': ['tokencafe-core', 'wallet', 'dashboard-core', 'template-system'],
            'widget-manager.html': ['tokencafe-core', 'wallet', 'widget-system', 'template-system'],
            'reports.html': ['tokencafe-core', 'wallet', 'analytics-core', 'template-system']
        };
        
        // Sistemas condicionais - carregados apenas quando necessário
        this.conditionalSystems = {
            'analytics-core': ['reports.html', 'index.html'], // só carrega analytics no dashboard se for admin
            'widget-system': ['widget-manager.html', 'index.html'] // widgets no dashboard
        };
        
        // Configuração dos sistemas
        this.systems = {
            'tokencafe-core': {
                path: 'js/systems/tokencafe-core.js',
                priority: 1,
                required: true
            },
            'wallet': {
                path: 'js/modules/wallet/script.js',
                priority: 2,
                required: true
            },
            'template-system': {
                path: 'js/systems/template-system.js',
                priority: 3,
                required: true
            },
            'dashboard-core': {
                path: 'js/modules/dashboard/dashboard-core.js',
                priority: 4,
                required: false
            },
            'analytics-core': {
                path: 'js/systems/analytics-core.js',
                priority: 5,
                required: false
            },
            'widget-system': {
                path: 'js/systems/widget-system.js',
                priority: 6,
                required: false
            }
        };
        
        this.init();
    }

    /**
     * Inicialização do loader
     */
    async init() {
        console.log('🚀 Inicializando TokenCafe Loader...');
        
        try {
            // Detectar página atual
            const currentPage = this.detectCurrentPage();
            console.log('📍 Página detectada:', currentPage);
            
            // Obter sistemas necessários com otimização inteligente
            const requiredSystems = this.getRequiredSystems(currentPage);
            console.log('📦 Sistemas necessários:', requiredSystems);
            
            // Log de otimização
            const allSystems = Object.keys(this.systems);
            const skippedSystems = allSystems.filter(s => !requiredSystems.includes(s));
            if (skippedSystems.length > 0) {
                console.log('⚡ Sistemas otimizados (não carregados):', skippedSystems);
            }
            
            // Carregar sistemas em ordem de prioridade
            await this.loadSystems(requiredSystems);
            
            // Aguardar todos os sistemas estarem prontos
            await this.waitForSystemsReady();
            
            console.log('✅ TokenCafe Loader - Carregamento concluído!');
            console.log(`📊 Performance: ${requiredSystems.length}/${allSystems.length} sistemas carregados`);
            
        } catch (error) {
            console.error('❌ Erro no TokenCafe Loader:', error);
            this.handleLoadingError(error);
        }
    }

    /**
     * Detectar página atual
     */
    detectCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop();
        
        // Se não tem extensão, adicionar .html
        return filename.includes('.') ? filename : `${filename}.html`;
    }

    /**
     * Obter sistemas necessários para a página com carregamento inteligente
     */
    getRequiredSystems(page) {
        let requirements = this.pageRequirements[page] || this.pageRequirements['index.html'];
        
        // Verificar se precisa de sistemas condicionais
        if (page === 'dashboard/index.html') {
            const userRole = this.getUserRole();
            
            // Carregar analytics apenas para admins
            if (userRole === 'admin' && !requirements.includes('analytics-core')) {
                requirements.push('analytics-core');
            }
            
            // Carregar widgets se o usuário tem widgets
            const hasWidgets = this.userHasWidgets();
            if (hasWidgets && !requirements.includes('widget-system')) {
                requirements.push('widget-system');
            }
        }
        
        // Sempre incluir sistemas obrigatórios
        const obligatory = Object.keys(this.systems).filter(key => this.systems[key].required);
        
        return [...new Set([...obligatory, ...requirements])];
    }

    /**
     * Obter role do usuário logado
     */
    getUserRole() {
        // Tentar obter do localStorage primeiro
        const userData = localStorage.getItem('tokencafe_user_data');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.role || 'user';
            } catch (e) {
                console.warn('⚠️ Erro ao parsear dados do usuário');
            }
        }
        
        // Fallback: verificar JWT token
        const token = localStorage.getItem('tokencafe_token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.role || 'user';
            } catch (e) {
                console.warn('⚠️ Erro ao decodificar token');
            }
        }
        
        return 'user'; // Default
    }

    /**
     * Verificar se usuário tem widgets
     */
    userHasWidgets() {
        const userData = localStorage.getItem('tokencafe_user_data');
        if (userData) {
            try {
                const user = JSON.parse(userData);
                return user.widgets && user.widgets > 0;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    /**
     * Carregar sistemas
     */
    async loadSystems(systemNames) {
        console.log('⚡ Carregando sistemas...');
        
        // Ordenar por prioridade
        const sortedSystems = systemNames
            .map(name => ({ name, ...this.systems[name] }))
            .sort((a, b) => a.priority - b.priority);
        
        // Carregar sistemas essenciais primeiro (prioridade 1-3)
        const essential = sortedSystems.filter(s => s.priority <= 3);
        const optional = sortedSystems.filter(s => s.priority > 3);
        
        // Carregar essenciais sequencialmente
        for (const system of essential) {
            await this.loadSystem(system.name, system.path);
        }
        
        // Carregar opcionais em paralelo
        const optionalPromises = optional.map(system => 
            this.loadSystem(system.name, system.path)
        );
        
        await Promise.allSettled(optionalPromises);
    }

    /**
     * Carregar sistema individual
     */
    async loadSystem(name, path) {
        if (this.loadedSystems.has(name)) {
            return Promise.resolve();
        }
        
        if (this.loadingPromises.has(name)) {
            return this.loadingPromises.get(name);
        }
        
        console.log(`📥 Carregando sistema: ${name}`);
        
        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = this.resolvePath(path);
            
            script.onload = () => {
                this.loadedSystems.add(name);
                console.log(`✅ Sistema carregado: ${name}`);
                resolve();
            };
            
            script.onerror = (error) => {
                console.error(`❌ Erro ao carregar sistema ${name}:`, error);
                reject(new Error(`Falha ao carregar ${name}`));
            };
            
            document.head.appendChild(script);
        });
        
        this.loadingPromises.set(name, promise);
        return promise;
    }

    /**
     * Resolver caminho do arquivo
     */
    resolvePath(path) {
        // Se já é um caminho absoluto ou tem domínio, usar diretamente
        if (path.startsWith('http') || path.startsWith('/')) {
            return path;
        }
        
        // Detectar se estamos em uma subpasta (como pages/)
        const currentPath = window.location.pathname;
        const isInSubfolder = currentPath.includes('/pages/') || 
                             currentPath.includes('/dashboard/');
        
        // Para páginas em pages/modules/dashboard/, precisamos voltar 3 níveis
        if (currentPath.includes('/pages/modules/dashboard/')) {
            return `../../../${path}`;
        }
        
        return isInSubfolder ? `../${path}` : path;
    }

    /**
     * Aguardar todos os sistemas estarem prontos
     */
    async waitForSystemsReady() {
        console.log('⏳ Aguardando sistemas estarem prontos...');
        
        // Aguardar TokenCafe Core estar pronto
        await this.waitForCondition(() => window.TokenCafe && window.TokenCafe.isReady, 10000);
        
        console.log('✅ Todos os sistemas estão prontos');
    }

    /**
     * Aguardar condição ser atendida
     */
    waitForCondition(condition, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const check = () => {
                if (condition()) {
                    resolve();
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error('Timeout waiting for condition'));
                } else {
                    setTimeout(check, 100);
                }
            };
            
            check();
        });
    }

    /**
     * Handler de erro de carregamento
     */
    handleLoadingError(error) {
        console.error('💥 Erro crítico no carregamento:', error);
        
        // Mostrar mensagem de erro
        const errorHTML = `
            <div class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-75" style="z-index: 9999;">
                <div class="bg-white p-4 rounded shadow text-center">
                    <i class="fas fa-exclamation-triangle text-warning fa-3x mb-3"></i>
                    <h4>Erro de Carregamento</h4>
                    <p class="text-muted mb-3">Não foi possível carregar todos os componentes necessários.</p>
                    <div class="d-grid gap-2">
                        <button class="btn btn-primary" onclick="console.log('✅ Botão recarregar clicado - reload desabilitado')">
                            🔄 Recarregar Página
                        </button>
                        <button class="btn btn-outline-secondary" onclick="this.parentElement.parentElement.parentElement.remove()">
                            ❌ Continuar Mesmo Assim
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorHTML);
    }

    /**
     * Obter estatísticas de carregamento
     */
    getLoadingStats() {
        return {
            loadedSystems: Array.from(this.loadedSystems),
            totalSystems: Object.keys(this.systems).length,
            loadingPromises: this.loadingPromises.size
        };
    }

    /**
     * Verificar se sistema está carregado
     */
    isSystemLoaded(systemName) {
        return this.loadedSystems.has(systemName);
    }

    /**
     * Carregar sistema adicional dinamicamente
     */
    async loadAdditionalSystem(systemName) {
        const system = this.systems[systemName];
        if (!system) {
            throw new Error(`Sistema não encontrado: ${systemName}`);
        }
        
        return this.loadSystem(systemName, system.path);
    }
}

// ================================================================================
// FUNÇÕES DE COMPATIBILIDADE
// ================================================================================

/**
 * Verificar se TokenCafe está pronto
 */
function isTokenCafeReady() {
    return window.TokenCafe && window.TokenCafe.isReady;
}

/**
 * Aguardar TokenCafe estar pronto
 */
function waitForTokenCafe() {
    return new Promise((resolve) => {
        if (isTokenCafeReady()) {
            resolve(window.TokenCafe);
        } else {
            window.addEventListener('TokenCafe:ready', () => {
                resolve(window.TokenCafe);
            });
        }
    });
}

/**
 * Executar quando TokenCafe estiver pronto
 */
function onTokenCafeReady(callback) {
    if (isTokenCafeReady()) {
        callback(window.TokenCafe);
    } else {
        window.addEventListener('TokenCafe:ready', () => {
            callback(window.TokenCafe);
        });
    }
}

// ================================================================================
// FUNÇÕES ESPECÍFICAS DE PÁGINA
// ================================================================================

/**
 * Funções específicas para página inicial
 */
const IndexPageFunctions = {
    /**
     * Inicializar sistema Web3 na página inicial
     */
    async initIndexPage() {
        console.log('🏠 Inicializando página inicial...');
        
        // Aguardar TokenCafe estar pronto
        await waitForTokenCafe();
        
        // Verificar se está conectado após verificação real
        if (window.TokenCafe?.wallet?.isConnected && window.TokenCafe.wallet.currentAccount) {
            this.updateIndexConnectedUI(window.TokenCafe.wallet.currentAccount);
        }
        
        // Listener para mudanças na conexão (sincronizar entre abas)
        window.addEventListener('storage', (e) => {
            if (e.key === 'tokencafe_wallet_address') {
                if (e.newValue) {
                    this.updateIndexConnectedUI(e.newValue);
                } else {
                    // Desconectado - resetar UI sem recarregar a página
                    console.log('🔌 Carteira desconectada - atualizando UI');
                    this.updateIndexDisconnectedUI();
                }
            }
        });
    },

    /**
     * Função para acessar dashboard
     */
    accessDashboard() {
        const savedAccount = localStorage.getItem('tokencafe_wallet_address');
        
        if (savedAccount) {
            // Se já está conectado, usar navegação centralizada
            if (window.TokenCafeNavigation) {
                window.TokenCafeNavigation.goToDashboard();
            } else {
                // Como estamos em pages/index.html, redirecionar para o dashboard correto
                window.location.href = 'modules/dashboard/index.html';
            }
        } else {
            // Se não está conectado, conectar primeiro
            alert('🔐 Você precisa conectar sua carteira MetaMask primeiro!\n\nClique em "Conectar MetaMask" no topo da página.');
        }
    },

    /**
     * Atualizar UI quando conectado (específico para index.html)
     */
    updateIndexConnectedUI(account) {
        const connectBtn = document.getElementById('connect-wallet-btn');
        const connectText = document.getElementById('connect-text');
        const walletDropdown = document.getElementById('wallet-dropdown');
        const accountDisplay = document.getElementById('account-display');
        const networkDisplay = document.getElementById('network-display');
        
        if (connectBtn && connectText) {
            connectBtn.classList.add('btn-success');
            connectBtn.classList.remove('btn-primary');
            connectText.textContent = 'Conectado';
            
            // Mostrar dropdown
            if (walletDropdown) {
                walletDropdown.style.display = 'block';
                connectBtn.setAttribute('data-bs-toggle', 'dropdown');
            }
            
            // Atualizar informações
            if (accountDisplay) {
                accountDisplay.textContent = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
            }
            
            const networkId = localStorage.getItem('tokencafe_network_id');
            if (networkDisplay && networkId) {
                const networks = {
                    '1': 'Ethereum',
                    '56': 'BSC',
                    '137': 'Polygon',
                    '11155111': 'Sepolia'
                };
                networkDisplay.textContent = networks[networkId] || `Rede ${networkId}`;
            }
        }
    },

    /**
     * Atualizar UI quando desconectado (específico para index.html)
     */
    updateIndexDisconnectedUI() {
        const connectBtn = document.getElementById('connect-wallet-btn');
        const connectText = document.getElementById('connect-text');
        const walletDropdown = document.getElementById('wallet-dropdown');
        
        if (connectBtn && connectText) {
            connectBtn.classList.remove('btn-success');
            connectBtn.classList.add('btn-primary');
            connectText.textContent = 'Conectar ao MetaMask';
            
            // Esconder dropdown
            if (walletDropdown) {
                walletDropdown.style.display = 'none';
                connectBtn.removeAttribute('data-bs-toggle');
            }
        }
    }
};

/**
 * Inicializar funções específicas da página atual
 */
function initPageSpecificFunctions() {
    const currentPage = window.location.pathname.split('/').pop();
    
    if (currentPage === 'index.html' || currentPage === '') {
        // Página inicial - inicializar funções específicas
        IndexPageFunctions.initIndexPage();
        
        // Expor funções globalmente para compatibilidade
        window.accessDashboard = IndexPageFunctions.accessDashboard.bind(IndexPageFunctions);
        window.updateIndexConnectedUI = IndexPageFunctions.updateIndexConnectedUI.bind(IndexPageFunctions);
    }
}

// Inicializar funções específicas da página quando TokenCafe estiver pronto
onTokenCafeReady(() => {
    initPageSpecificFunctions();
});

// ================================================================================
// INICIALIZAÇÃO AUTOMÁTICA
// ================================================================================

// Criar instância do loader
const tokencafeLoader = new TokenCafeLoader();

// Expor globalmente para debug e uso avançado
window.TokenCafeLoader = TokenCafeLoader;
window.tokencafeLoader = tokencafeLoader;
window.isTokenCafeReady = isTokenCafeReady;
window.waitForTokenCafe = waitForTokenCafe;
window.onTokenCafeReady = onTokenCafeReady;
window.IndexPageFunctions = IndexPageFunctions;

// Expor funções imediatamente para compatibilidade
// Isso garante que os botões funcionem mesmo antes do sistema estar totalmente pronto
window.connectWallet = function() {
    console.log('connectWallet() chamado - verificando sistema...');
    if (window.tokencafeWallet && window.tokencafeWallet.connect) {
        return window.tokencafeWallet.connect();
    } else {
        console.log('Sistema wallet não pronto, aguardando...');
        onTokenCafeReady(() => {
            if (window.tokencafeWallet && window.tokencafeWallet.connect) {
                window.tokencafeWallet.connect();
            } else {
                alert('Erro: Sistema de conexão não disponível');
            }
        });
    }
};

window.accessDashboard = function() {
    console.log('accessDashboard() chamado - verificando sistema...');
    if (window.IndexPageFunctions && window.IndexPageFunctions.accessDashboard) {
        return window.IndexPageFunctions.accessDashboard();
    } else {
        console.log('Sistema dashboard não pronto, aguardando...');
        onTokenCafeReady(() => {
            if (window.IndexPageFunctions && window.IndexPageFunctions.accessDashboard) {
                window.IndexPageFunctions.accessDashboard();
            } else {
                // Fallback simples
                const savedAccount = localStorage.getItem('tokencafe_wallet_address');
                if (savedAccount) {
                    window.location.href = '/dashboard';
                } else {
                    alert('🔐 Você precisa conectar sua carteira MetaMask primeiro!');
                }
            }
        });
    }
};

console.log('🎯 TokenCafe Loader inicializado');