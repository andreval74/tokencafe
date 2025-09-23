/**
 * ================================================================================
 * WIDGET SYSTEM - TOKENCAFE
 * ================================================================================
 * Sistema unificado para gerenciamento de widgets
 * Consolidação de todas as funções relacionadas a criação e gerenciamento de widgets
 * ================================================================================
 */

class WidgetSystem {
    constructor() {
        this.widgets = new Map();
        this.templates = new Map();
        this.currentWidget = null;
        this.eventBus = new EventTarget();
        
        // Tipos de widgets disponíveis
        this.widgetTypes = {
            'swap': {
                name: 'Swap Widget',
                description: 'Widget para troca de tokens',
                icon: 'fas fa-exchange-alt',
                category: 'trading'
            },
            'price': {
                name: 'Price Tracker',
                description: 'Rastreamento de preços em tempo real',
                icon: 'fas fa-chart-line',
                category: 'analytics'
            },
            'portfolio': {
                name: 'Portfolio Widget',
                description: 'Visualização de portfólio',
                icon: 'fas fa-chart-pie',
                category: 'analytics'
            },
            'staking': {
                name: 'Staking Widget',
                description: 'Interface de staking',
                icon: 'fas fa-coins',
                category: 'defi'
            },
            'nft': {
                name: 'NFT Widget',
                description: 'Galeria e marketplace de NFTs',
                icon: 'fas fa-images',
                category: 'nft'
            },
            'custom': {
                name: 'Custom Widget',
                description: 'Widget personalizado',
                icon: 'fas fa-code',
                category: 'custom'
            }
        };
        
        this.init();
    }

    /**
     * Inicialização do sistema de widgets
     */
    async init() {
        console.log('🧩 Inicializando WidgetSystem...');
        
        // Aguardar TokenCafe estar pronto
        await this.waitForTokenCafe();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Carregar templates disponíveis
        await this.loadWidgetTemplates();
        
        // Carregar widgets existentes
        await this.loadExistingWidgets();
        
        console.log('✅ WidgetSystem inicializado com sucesso');
    }

    /**
     * Aguardar TokenCafe estar pronto
     */
    async waitForTokenCafe() {
        return new Promise((resolve) => {
            if (window.TokenCafe && window.TokenCafe.isReady) {
                resolve();
            } else {
                window.addEventListener('TokenCafe:ready', resolve);
            }
        });
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Botões de criação de widget
        document.querySelectorAll('[data-widget-create]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const widgetType = e.target.dataset.widgetCreate;
                this.startWidgetCreation(widgetType);
            });
        });

        // Botões de edição
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-widget-edit]')) {
                const widgetId = e.target.dataset.widgetEdit;
                this.editWidget(widgetId);
            }
        });

        // Botões de exclusão
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-widget-delete]')) {
                const widgetId = e.target.dataset.widgetDelete;
                this.deleteWidget(widgetId);
            }
        });

        // Seleção de templates
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-template-select]')) {
                const templateType = e.target.dataset.templateSelect;
                this.selectTemplate(templateType);
            }
        });

        // Form de criação
        const createForm = document.getElementById('widget-create-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateSubmission(e);
            });
        }
    }

    /**
     * Iniciar criação de widget
     */
    startWidgetCreation(type = null) {
        console.log('➕ Iniciando criação de widget:', type);
        
        // Resetar widget atual
        this.currentWidget = {
            type: type,
            config: {},
            template: null,
            step: 1
        };
        
        // Mostrar modal de criação
        this.showCreationModal();
        
        // Se tipo específico, pular seleção
        if (type) {
            this.selectTemplate(type);
        } else {
            this.showTemplateSelection();
        }
    }

    /**
     * Mostrar modal de criação
     */
    showCreationModal() {
        const modal = document.getElementById('newWidgetModal');
        if (modal && typeof bootstrap !== 'undefined') {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }

    /**
     * Mostrar seleção de templates
     */
    showTemplateSelection() {
        const container = document.getElementById('template-options');
        if (!container) return;
        
        container.innerHTML = this.renderTemplateOptions();
        this.setupTemplateSelection();
    }

    /**
     * Renderizar opções de templates
     */
    renderTemplateOptions() {
        return Object.entries(this.widgetTypes).map(([type, config]) => `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card template-selector" data-template-select="${type}">
                    <div class="card-body text-center">
                        <div class="mb-3">
                            <i class="${config.icon} fa-2x text-coffee"></i>
                        </div>
                        <h6 class="card-title">${config.name}</h6>
                        <p class="card-text text-muted small">${config.description}</p>
                        <span class="badge bg-coffee-light">${config.category}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Configurar seleção de templates
     */
    setupTemplateSelection() {
        document.querySelectorAll('.template-selector').forEach(card => {
            card.addEventListener('click', () => {
                // Remover seleção anterior
                document.querySelectorAll('.template-selector').forEach(c => 
                    c.classList.remove('selected'));
                
                // Selecionar atual
                card.classList.add('selected');
                
                const templateType = card.dataset.templateSelect;
                this.selectTemplate(templateType);
            });
        });
    }

    /**
     * Selecionar template
     */
    selectTemplate(templateType) {
        console.log('📋 Template selecionado:', templateType);
        
        if (!this.currentWidget) {
            this.currentWidget = { type: templateType, config: {}, step: 2 };
        } else {
            this.currentWidget.type = templateType;
            this.currentWidget.step = 2;
        }
        
        // Atualizar configurações específicas do template
        this.loadTemplateConfig(templateType);
        
        // Avançar para próximo step
        this.updateWizardStep(2);
    }

    /**
     * Carregar configuração do template
     */
    loadTemplateConfig(templateType) {
        const templateConfig = this.widgetTypes[templateType];
        if (!templateConfig) return;
        
        // Configurar formulário baseado no tipo
        const configContainer = document.getElementById('widget-config-container');
        if (configContainer) {
            configContainer.innerHTML = this.renderConfigForm(templateType);
        }
    }

    /**
     * Renderizar formulário de configuração
     */
    renderConfigForm(templateType) {
        const commonFields = `
            <div class="mb-3">
                <label class="form-label">Nome do Widget</label>
                <input type="text" class="form-control" name="name" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Descrição</label>
                <textarea class="form-control" name="description" rows="3"></textarea>
            </div>
        `;
        
        let specificFields = '';
        
        switch (templateType) {
            case 'swap':
                specificFields = `
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Token de Origem</label>
                            <select class="form-control" name="tokenFrom">
                                <option value="ETH">Ethereum (ETH)</option>
                                <option value="USDC">USD Coin (USDC)</option>
                                <option value="USDT">Tether (USDT)</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Token de Destino</label>
                            <select class="form-control" name="tokenTo">
                                <option value="USDC">USD Coin (USDC)</option>
                                <option value="ETH">Ethereum (ETH)</option>
                                <option value="USDT">Tether (USDT)</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">DEX Preferida</label>
                        <select class="form-control" name="dex">
                            <option value="uniswap">Uniswap</option>
                            <option value="pancakeswap">PancakeSwap</option>
                            <option value="sushiswap">SushiSwap</option>
                        </select>
                    </div>
                `;
                break;
                
            case 'price':
                specificFields = `
                    <div class="mb-3">
                        <label class="form-label">Token para Rastrear</label>
                        <input type="text" class="form-control" name="token" placeholder="ETH, BTC, MATIC...">
                    </div>
                    <div class="row">
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Moeda Base</label>
                            <select class="form-control" name="baseCurrency">
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="BRL">BRL</option>
                            </select>
                        </div>
                        <div class="col-md-6 mb-3">
                            <label class="form-label">Intervalo de Atualização</label>
                            <select class="form-control" name="updateInterval">
                                <option value="5">5 segundos</option>
                                <option value="30">30 segundos</option>
                                <option value="60">1 minuto</option>
                            </select>
                        </div>
                    </div>
                `;
                break;
                
            case 'portfolio':
                specificFields = `
                    <div class="mb-3">
                        <label class="form-label">Endereço da Carteira</label>
                        <input type="text" class="form-control" name="walletAddress" placeholder="0x...">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">Redes a Monitorar</label>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="networks" value="ethereum" checked>
                            <label class="form-check-label">Ethereum</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="networks" value="bsc">
                            <label class="form-check-label">BSC</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="networks" value="polygon">
                            <label class="form-check-label">Polygon</label>
                        </div>
                    </div>
                `;
                break;
        }
        
        return commonFields + specificFields;
    }

    /**
     * Atualizar step do wizard
     */
    updateWizardStep(step) {
        // Atualizar indicadores visuais
        document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
            indicator.classList.toggle('active', index + 1 <= step);
            indicator.classList.toggle('completed', index + 1 < step);
        });
        
        // Mostrar/ocultar conteúdo dos steps
        document.querySelectorAll('.wizard-step').forEach((stepContent, index) => {
            stepContent.style.display = (index + 1 === step) ? 'block' : 'none';
        });
        
        // Atualizar botões de navegação
        this.updateWizardButtons(step);
    }

    /**
     * Atualizar botões do wizard
     */
    updateWizardButtons(step) {
        const prevBtn = document.getElementById('prev-step');
        const nextBtn = document.getElementById('next-step');
        const createBtn = document.getElementById('create-widget');
        
        if (prevBtn) prevBtn.style.display = step > 1 ? 'block' : 'none';
        if (nextBtn) nextBtn.style.display = step < 3 ? 'block' : 'none';
        if (createBtn) createBtn.style.display = step === 3 ? 'block' : 'none';
    }

    /**
     * Criar widget
     */
    async createWidget(config) {
        try {
            console.log('🔨 Criando widget:', config);
            
            // Gerar ID único
            const widgetId = this.generateWidgetId();
            
            // Criar objeto do widget
            const widget = {
                id: widgetId,
                type: config.type,
                name: config.name,
                description: config.description,
                config: config,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                status: 'active',
                deploymentUrl: this.generateDeploymentUrl(widgetId)
            };
            
            // Salvar widget
            this.widgets.set(widgetId, widget);
            
            // Persistir no localStorage
            this.saveToLocalStorage();
            
            // Disparar evento
            this.eventBus.dispatchEvent(new CustomEvent('widget:created', {
                detail: { widget }
            }));
            
            console.log('✅ Widget criado com sucesso:', widget.id);
            return widget;
            
        } catch (error) {
            console.error('❌ Erro ao criar widget:', error);
            throw error;
        }
    }

    /**
     * Editar widget
     */
    async editWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) {
            throw new Error('Widget não encontrado');
        }
        
        console.log('✏️ Editando widget:', widgetId);
        
        // Implementar interface de edição
        this.showEditModal(widget);
    }

    /**
     * Excluir widget
     */
    async deleteWidget(widgetId) {
        const widget = this.widgets.get(widgetId);
        if (!widget) {
            throw new Error('Widget não encontrado');
        }
        
        // Confirmar exclusão
        if (!confirm(`Tem certeza que deseja excluir o widget "${widget.name}"?`)) {
            return false;
        }
        
        console.log('🗑️ Excluindo widget:', widgetId);
        
        // Remover widget
        this.widgets.delete(widgetId);
        
        // Atualizar localStorage
        this.saveToLocalStorage();
        
        // Disparar evento
        this.eventBus.dispatchEvent(new CustomEvent('widget:deleted', {
            detail: { widgetId, widget }
        }));
        
        console.log('✅ Widget excluído com sucesso');
        return true;
    }

    /**
     * Carregar templates de widgets
     */
    async loadWidgetTemplates() {
        try {
            console.log('📋 Carregando templates de widgets...');
            
            // Templates estão definidos no construtor
            // Em uma implementação real, buscar da API
            
            console.log(`✅ ${Object.keys(this.widgetTypes).length} templates carregados`);
            
        } catch (error) {
            console.error('❌ Erro ao carregar templates:', error);
        }
    }

    /**
     * Carregar widgets existentes
     */
    async loadExistingWidgets() {
        try {
            console.log('📦 Carregando widgets existentes...');
            
            // Carregar do localStorage
            const saved = localStorage.getItem('tokencafe_widgets');
            if (saved) {
                const widgets = JSON.parse(saved);
                widgets.forEach(widget => {
                    this.widgets.set(widget.id, widget);
                });
            }
            
            console.log(`✅ ${this.widgets.size} widgets carregados`);
            
        } catch (error) {
            console.error('❌ Erro ao carregar widgets:', error);
        }
    }

    /**
     * Salvar no localStorage
     */
    saveToLocalStorage() {
        try {
            const widgets = Array.from(this.widgets.values());
            localStorage.setItem('tokencafe_widgets', JSON.stringify(widgets));
        } catch (error) {
            console.error('❌ Erro ao salvar widgets:', error);
        }
    }

    /**
     * Gerar ID do widget
     */
    generateWidgetId() {
        return 'widget_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Gerar URL de deployment
     */
    generateDeploymentUrl(widgetId) {
        const baseUrl = window.location.origin;
        return `${baseUrl}/widgets/${widgetId}`;
    }

    /**
     * Obter widgets por tipo
     */
    getWidgetsByType(type) {
        return Array.from(this.widgets.values()).filter(widget => widget.type === type);
    }

    /**
     * Obter estatísticas
     */
    getStats() {
        const widgets = Array.from(this.widgets.values());
        const stats = {
            total: widgets.length,
            byType: {},
            byStatus: {},
            recent: widgets.filter(w => {
                const created = new Date(w.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created > weekAgo;
            }).length
        };
        
        // Contar por tipo
        widgets.forEach(widget => {
            stats.byType[widget.type] = (stats.byType[widget.type] || 0) + 1;
            stats.byStatus[widget.status] = (stats.byStatus[widget.status] || 0) + 1;
        });
        
        return stats;
    }
}

// ================================================================================
// EXPOSIÇÃO GLOBAL E INICIALIZAÇÃO
// ================================================================================

// Expor globalmente
window.WidgetSystem = WidgetSystem;

// Criar instância global quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    if (!window.tokencafeWidgets) {
        window.tokencafeWidgets = new WidgetSystem();
    }
});

console.log('✅ Widget System carregado');