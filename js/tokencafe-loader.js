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
        
        // Mapeamento de páginas e seus sistemas necessários
        this.pageRequirements = {
            'index.html': ['tokencafe-core', 'wallet', 'template-system'],
            'dash-main.html': ['tokencafe-core', 'wallet', 'dashboard-core', 'template-system'],
            'widget-manager.html': ['tokencafe-core', 'wallet', 'widget-system', 'template-system'],
            'reports.html': ['tokencafe-core', 'wallet', 'analytics-core', 'template-system'],
            'admin-panel.html': ['tokencafe-core', 'wallet', 'dashboard-core', 'analytics-core', 'template-system']
        };
        
        // Configuração dos sistemas
        this.systems = {
            'tokencafe-core': {
                path: 'js/systems/tokencafe-core.js',
                priority: 1,
                required: true
            },
            'wallet': {
                path: 'js/systems/wallet.js',
                priority: 2,
                required: true
            },
            'template-system': {
                path: 'js/systems/template-system.js',
                priority: 3,
                required: true
            },
            'dashboard-core': {
                path: 'js/systems/dashboard-core.js',
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
            
            // Obter sistemas necessários
            const requiredSystems = this.getRequiredSystems(currentPage);
            console.log('📦 Sistemas necessários:', requiredSystems);
            
            // Carregar sistemas em ordem de prioridade
            await this.loadSystems(requiredSystems);
            
            // Aguardar todos os sistemas estarem prontos
            await this.waitForSystemsReady();
            
            console.log('✅ TokenCafe Loader - Carregamento concluído!');
            
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
     * Obter sistemas necessários para a página
     */
    getRequiredSystems(page) {
        const requirements = this.pageRequirements[page] || this.pageRequirements['index.html'];
        
        // Sempre incluir sistemas obrigatórios
        const obligatory = Object.keys(this.systems).filter(key => this.systems[key].required);
        
        return [...new Set([...obligatory, ...requirements])];
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
                             currentPath.includes('/dasboard/') ||
                             currentPath.includes('/dashboard/');
        
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
                        <button class="btn btn-primary" onclick="window.location.reload()">
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

console.log('🎯 TokenCafe Loader inicializado');