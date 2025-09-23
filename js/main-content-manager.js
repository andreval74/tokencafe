/**
 * MainContentManager - Gerenciador do conteúdo principal do dashboard
 * Responsável por controlar navegação entre páginas e renderizar conteúdo dinâmico
 */
class MainContentManager {
    constructor() {
        this.currentPage = 'overview';
        this.pages = {};
        this.init();
    }

    init() {
        // Escutar navegação do sidebar
        window.addEventListener('sidebarNavigation', (event) => {
            this.showPage(event.detail.page, event.detail.title);
        });

        // Personalizar página inicial
        this.personalizeWelcome();
        
        // Carregar estatísticas
        this.loadStats();
    }

    async personalizeWelcome() {
        const walletAddress = localStorage.getItem('tokencafe_wallet_address');
        if (!walletAddress) return;

        // Tentar carregar perfil personalizado
        const profileKey = `tokencafe_profile_${walletAddress}`;
        const savedProfile = localStorage.getItem(profileKey);
        
        if (savedProfile) {
            try {
                const profile = JSON.parse(savedProfile);
                if (profile.displayName) {
                    const welcomeTitle = document.getElementById('welcome-title');
                    const welcomeText = document.getElementById('welcome-text');
                    
                    if (welcomeTitle) {
                        welcomeTitle.innerHTML = `<i class="fas fa-hand-wave me-2"></i>Olá, ${profile.displayName}!`;
                        welcomeTitle.classList.add('personalized');
                    }
                    
                    if (welcomeText) {
                        welcomeText.textContent = `Bem-vindo de volta ao seu dashboard personalizado. Gerencie seus tokens com facilidade.`;
                    }
                }
            } catch (error) {
                console.warn('Erro ao carregar perfil personalizado:', error);
            }
        }
    }

    async loadStats() {
        // Simular carregamento de estatísticas
        setTimeout(() => {
            // Aqui conectaria com APIs reais
            const tokensCount = document.getElementById('tokens-count');
            const currentPlan = document.getElementById('current-plan');
            
            if (tokensCount) tokensCount.textContent = '0';
            if (currentPlan) currentPlan.textContent = 'Gratuito';
        }, 1000);
    }

    showPage(pageId, title = '') {
        this.currentPage = pageId;
        
        // Atualizar título
        const pageTitle = document.getElementById('page-title');
        if (pageTitle) {
            pageTitle.textContent = title || this.getPageTitle(pageId);
        }
        
        // Esconder todas as páginas
        document.querySelectorAll('.page-content').forEach(page => {
            page.classList.remove('active');
        });

        // Mostrar página específica
        if (pageId === 'overview') {
            const overviewContent = document.getElementById('overview-content');
            if (overviewContent) {
                overviewContent.classList.add('active');
            }
        } else {
            const dynamicContent = document.getElementById('dynamic-content');
            if (dynamicContent) {
                dynamicContent.classList.add('active');
                this.loadDynamicContent(pageId);
            }
        }
    }

    getPageTitle(pageId) {
        const titles = {
            'overview': 'Visão Geral',
            'tokens-list': 'Meus Tokens',
            'create-token': 'Criar Token',
            'token-templates': 'Templates de Token',
            'token-audit': 'Auditoria de Token',
            'widgets-list': 'Meus Widgets',
            'create-widget': 'Criar Widget',
            'widget-manager': 'Gerenciador de Widgets',
            'widget-templates': 'Templates de Widget',
            'dashboard-analytics': 'Dashboard Analytics',
            'token-metrics': 'Métricas de Tokens',
            'widget-stats': 'Estatísticas de Widgets',
            'earnings': 'Ganhos e Receitas',
            'marketplace': 'Marketplace',
            'smart-contracts': 'Contratos Inteligentes',
            'api-docs': 'Documentação da API',
            'integrations': 'Integrações',
            'profile': 'Meu Perfil',
            'settings': 'Configurações',
            'billing': 'Planos e Cobrança',
            'support': 'Suporte'
        };
        
        return titles[pageId] || 'Dashboard';
    }

    loadDynamicContent(pageId) {
        const dynamicContent = document.getElementById('dynamic-content');
        if (!dynamicContent) return;
        
        // Mostrar loading
        dynamicContent.innerHTML = `
            <div class="text-center py-5">
                <div class="loading-spinner mb-3"></div>
                <p class="text-muted">Carregando...</p>
            </div>
        `;

        // Simular carregamento e renderizar conteúdo
        setTimeout(() => {
            this.renderPageContent(pageId);
        }, 500);
    }

    async renderPageContent(pageId) {
        const dynamicContent = document.getElementById('dynamic-content');
        if (!dynamicContent) return;
        
        // Definir conteúdo específico para cada página
        const pageContents = {
            'widget-manager': () => this.getWidgetManagerContent(),
            'create-token': () => this.getCreateTokenContent(),
            'profile': () => this.getProfileContent(),
            'settings': () => this.getSettingsContent(),
            'support': () => this.getSupportContent()
        };

        try {
            let content;
            if (pageContents[pageId]) {
                content = await pageContents[pageId]();
            } else {
                content = this.getDefaultContent(pageId);
            }
            
            dynamicContent.innerHTML = content;
            
            // Se é suporte, carregar o script específico
            if (pageId === 'support') {
                this.loadSupportScript();
            }
            
        } catch (error) {
            console.error('Erro ao carregar conteúdo da página:', error);
            dynamicContent.innerHTML = this.getDefaultContent(pageId);
        }
    }

    loadSupportScript() {
        // Verificar se já existe um script de suporte carregado
        const existingScript = document.querySelector('script[src*="suporte.js"]');
        if (existingScript) {
            existingScript.remove();
        }
        
        // Carregar o script do suporte dinamicamente
        const script = document.createElement('script');
        script.src = '../js/suporte.js';
        script.onload = () => {
            console.log('✅ Script de suporte carregado com sucesso');
        };
        script.onerror = (error) => {
            console.error('❌ Erro ao carregar script de suporte:', error);
        };
        document.head.appendChild(script);
    }

    getWidgetManagerContent() {
        return `
            <div class="container-fluid">
                <div class="dashboard-card p-4 mb-4">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 class="text-white mb-1">
                                <i class="fas fa-cube me-2"></i>Gerenciador de Widgets
                            </h4>
                            <p class="text-muted mb-0">Crie e gerencie seus widgets personalizados</p>
                        </div>
                        <button class="btn btn-primary" onclick="window.open('./widget-manager.html', '_blank')">
                            <i class="fas fa-external-link-alt me-2"></i>Abrir Gerenciador Completo
                        </button>
                    </div>
                </div>

                <div class="row">
                    <div class="col-md-4 mb-4">
                        <div class="dashboard-card p-4 text-center">
                            <i class="fas fa-coins fa-3x text-primary mb-3"></i>
                            <h5 class="text-white mb-2">Token Sale</h5>
                            <p class="text-muted mb-3">Widgets para venda direta de tokens</p>
                            <span class="badge bg-success">Disponível</span>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="dashboard-card p-4 text-center">
                            <i class="fas fa-exchange-alt fa-3x text-warning mb-3"></i>
                            <h5 class="text-white mb-2">Swap Widget</h5>
                            <p class="text-muted mb-3">Interface de troca de tokens</p>
                            <span class="badge bg-success">Disponível</span>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="dashboard-card p-4 text-center">
                            <i class="fas fa-chart-line fa-3x text-info mb-3"></i>
                            <h5 class="text-white mb-2">Price Chart</h5>
                            <p class="text-muted mb-3">Gráficos de preços em tempo real</p>
                            <span class="badge bg-success">Disponível</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getCreateTokenContent() {
        return `
            <div class="container-fluid">
                <div class="dashboard-card p-4">
                    <h4 class="text-white mb-3">
                        <i class="fas fa-plus-circle me-2"></i>Criar Novo Token
                    </h4>
                    <div class="alert alert-info" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Em Desenvolvimento:</strong> O criador de tokens estará disponível em breve!
                    </div>
                    <p class="text-muted">
                        Em breve você poderá criar tokens ERC-20, BEP-20 e outros padrões diretamente pelo dashboard.
                    </p>
                </div>
            </div>
        `;
    }

    getProfileContent() {
        return `
            <div class="container-fluid">
                <div class="dashboard-card p-4">
                    <h4 class="text-white mb-3">
                        <i class="fas fa-user me-2"></i>Meu Perfil
                    </h4>
                    <div class="alert alert-info mb-4" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Perfil Opcional:</strong> Seus dados são salvos localmente apenas para melhorar sua experiência.
                    </div>
                    <p class="text-center text-muted">
                        <i class="fas fa-tools fa-2x mb-3"></i><br>
                        Funcionalidade de perfil em desenvolvimento
                    </p>
                </div>
            </div>
        `;
    }

    getSettingsContent() {
        return `
            <div class="container-fluid">
                <div class="dashboard-card p-4">
                    <h4 class="text-white mb-3">
                        <i class="fas fa-cog me-2"></i>Configurações
                    </h4>
                    <div class="alert alert-warning" role="alert">
                        <i class="fas fa-tools me-2"></i>
                        <strong>Em Desenvolvimento:</strong> Configurações avançadas estarão disponíveis em breve!
                    </div>
                </div>
            </div>
        `;
    }

    async getSupportContent() {
        try {
            // Carregar conteúdo do suporte.html
            const response = await fetch('suporte.html');
            if (response.ok) {
                const supportHtml = await response.text();
                return `
                    <div class="container-fluid">
                        <div class="dashboard-card p-0 mb-4">
                            ${supportHtml}
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Erro ao carregar suporte.html:', error);
        }
        
        // Fallback se não conseguir carregar
        return `
            <div class="container-fluid">
                <div class="dashboard-card p-4">
                    <h4 class="text-white mb-3">
                        <i class="fas fa-headset me-2"></i>Suporte
                    </h4>
                    <div class="alert alert-info" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Carregando formulário de suporte...</strong>
                    </div>
                    <div class="text-center py-4">
                        <button class="btn btn-primary" onclick="window.open('suporte.html', '_blank')">
                            <i class="fas fa-external-link-alt me-2"></i>Abrir Formulário de Suporte
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getDefaultContent(pageId) {
        return `
            <div class="text-center py-5">
                <div class="dashboard-card p-5" style="max-width: 600px; margin: 0 auto;">
                    <i class="fas fa-cogs fa-3x text-muted mb-4"></i>
                    <h3 class="text-white mb-3">Em Desenvolvimento</h3>
                    <p class="text-muted mb-4 lead">
                        Esta funcionalidade está sendo desenvolvida e estará disponível em breve.
                    </p>
                    <div class="alert alert-info" role="alert">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Status:</strong> Em desenvolvimento ativo. Fique ligado nas atualizações!
                    </div>
                </div>
            </div>
        `;
    }
}

// Funções globais para ações rápidas e navegação
function quickAction(action) {
    const actions = {
        'create-token': 'create-token',
        'create-widget': 'widget-manager',
        'token-templates': 'token-templates',
        'marketplace': 'marketplace'
    };
    
    if (actions[action]) {
        window.dispatchEvent(new CustomEvent('sidebarNavigation', {
            detail: { page: actions[action], title: window.mainContent?.getPageTitle(actions[action]) }
        }));
    }
}

function navigateTo(page) {
    window.dispatchEvent(new CustomEvent('sidebarNavigation', {
        detail: { page, title: window.mainContent?.getPageTitle(page) }
    }));
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.mainContent = new MainContentManager();
});