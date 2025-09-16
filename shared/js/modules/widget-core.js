/*
================================================================================
WIDGET CORE - SISTEMA DE WIDGETS UNIFICADO TOKENCAFE
================================================================================
Sistema completo de gerenciamento de widgets com:
- Criação de widgets personalizados
- Gerenciamento de templates
- Sistema de configuração
- Integração blockchain
- Analytics de widgets
================================================================================
*/

class WidgetCore {
    constructor(dependencies = {}) {
        this.eventBus = dependencies.eventBus || new EventTarget();
        this.authManager = dependencies.authManager;
        this.config = dependencies.config || {};

        // Estado dos widgets
        this.state = {
            widgets: [],
            templates: [],
            currentWidget: null,
            loading: false,
            filter: 'all'
        };

        // Tipos de widgets suportados
        this.widgetTypes = {
            'token-sale': {
                name: 'Venda de Token',
                description: 'Widget para venda direta de tokens',
                icon: 'fas fa-coins',
                template: 'token-sale-template'
            },
            'token-info': {
                name: 'Informações do Token',
                description: 'Exibir informações básicas do token',
                icon: 'fas fa-info-circle',
                template: 'token-info-template'
            },
            'wallet-connect': {
                name: 'Conexão de Carteira',
                description: 'Widget de conexão com carteira',
                icon: 'fas fa-wallet',
                template: 'wallet-connect-template'
            },
            'price-chart': {
                name: 'Gráfico de Preços',
                description: 'Gráfico de preços em tempo real',
                icon: 'fas fa-chart-line',
                template: 'price-chart-template'
            }
        };

        this.init();
        console.log('🧩 WidgetCore inicializado');
    }

    /**
     * Inicialização do sistema de widgets
     */
    init() {
        this.setupEventListeners();
    }

    /**
     * Configurar listeners de eventos
     */
    setupEventListeners() {
        // Eventos de widgets
        this.eventBus.addEventListener('widget:create', this.handleWidgetCreate.bind(this));
        this.eventBus.addEventListener('widget:edit', this.handleWidgetEdit.bind(this));
        this.eventBus.addEventListener('widget:delete', this.handleWidgetDelete.bind(this));
        this.eventBus.addEventListener('widget:deploy', this.handleWidgetDeploy.bind(this));

        // Eventos de templates
        this.eventBus.addEventListener('template:load', this.loadTemplates.bind(this));
    }

    /**
     * Inicializar gerenciador de widgets (página widgets)
     */
    initializeManager() {
        console.log('🧩 Inicializando gerenciador de widgets...');
        this.loadUserWidgets();
        this.setupWidgetFilters();
        this.setupWidgetActions();
    }

    /**
     * Inicializar criador de widgets (página widget-creator)
     */
    initializeCreator() {
        console.log('🎨 Inicializando criador de widgets...');
        this.loadWidgetTemplates();
        this.setupWidgetCreationForm();
        this.setupPreview();
    }

    /**
     * Carregar widgets do usuário
     */
    async loadUserWidgets() {
        try {
            this.setLoading(true);
            console.log('📊 Carregando widgets do usuário...');

            // Simular carregamento (implementar API real)
            const widgets = await this.fetchUserWidgets();
            this.state.widgets = widgets;

            this.renderWidgetsList();
            this.emitWidgetEvent('widgetsLoaded', { widgets });

        } catch (error) {
            console.error('❌ Erro ao carregar widgets:', error);
            this.showWidgetError('Erro ao carregar widgets');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Buscar widgets do usuário (placeholder para API)
     */
    async fetchUserWidgets() {
        // Simular dados (substituir por chamada API real)
        return [
            {
                id: '1',
                name: 'Widget Token ABC',
                type: 'token-sale',
                status: 'active',
                views: 1245,
                conversions: 89,
                revenue: '2.45 ETH',
                createdAt: '2025-09-10T10:00:00Z',
                config: {
                    tokenAddress: '0x...',
                    price: '0.01',
                    maxSupply: 1000000
                }
            },
            {
                id: '2',
                name: 'Preços CAFE Token',
                type: 'price-chart',
                status: 'active',
                views: 856,
                conversions: 0,
                revenue: '0 ETH',
                createdAt: '2025-09-08T14:30:00Z',
                config: {
                    tokenAddress: '0x...',
                    chartType: 'line',
                    interval: '1h'
                }
            }
        ];
    }

    /**
     * Renderizar lista de widgets
     */
    renderWidgetsList() {
        const container = document.getElementById('widgets-list');
        if (!container) return;

        let html = '';

        if (this.state.widgets.length === 0) {
            html = this.renderEmptyState();
        } else {
            html = this.state.widgets.map(widget => this.renderWidgetCard(widget)).join('');
        }

        container.innerHTML = html;
    }

    /**
     * Renderizar card de widget individual
     */
    renderWidgetCard(widget) {
        const widgetType = this.widgetTypes[widget.type];
        const statusClass = widget.status === 'active' ? 'success' : 'secondary';

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card widget-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="mb-0">
                            <i class="${widgetType.icon} me-2"></i>
                            ${widget.name}
                        </h6>
                        <span class="badge bg-${statusClass}">${widget.status}</span>
                    </div>
                    <div class="card-body">
                        <p class="text-muted small">${widgetType.description}</p>
                        
                        <div class="row text-center mb-3">
                            <div class="col-4">
                                <small class="text-muted">Visualizações</small>
                                <div class="fw-bold">${widget.views}</div>
                            </div>
                            <div class="col-4">
                                <small class="text-muted">Conversões</small>
                                <div class="fw-bold">${widget.conversions}</div>
                            </div>
                            <div class="col-4">
                                <small class="text-muted">Receita</small>
                                <div class="fw-bold">${widget.revenue}</div>
                            </div>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="btn-group w-100" role="group">
                            <button class="btn btn-outline-primary btn-sm" 
                                    data-widget-action="edit" data-widget-id="${widget.id}">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-outline-info btn-sm"
                                    data-widget-action="preview" data-widget-id="${widget.id}">
                                <i class="fas fa-eye"></i> Preview
                            </button>
                            <button class="btn btn-outline-success btn-sm"
                                    data-widget-action="copy" data-widget-id="${widget.id}">
                                <i class="fas fa-copy"></i> Copiar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderizar estado vazio
     */
    renderEmptyState() {
        return `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="fas fa-cube fa-3x text-muted mb-3"></i>
                    <h5>Nenhum Widget Criado</h5>
                    <p class="text-muted">Crie seu primeiro widget para começar a monetizar seus tokens.</p>
                    <button class="btn btn-coffee btn-lg" onclick="window.location.hash='new-widget'">
                        <i class="fas fa-plus"></i> Criar Primeiro Widget
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Configurar filtros de widgets
     */
    setupWidgetFilters() {
        const filterButtons = document.querySelectorAll('[data-widget-filter]');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-widget-filter');
                this.applyFilter(filter);
                
                // Atualizar UI dos filtros
                filterButtons.forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    }

    /**
     * Aplicar filtro aos widgets
     */
    applyFilter(filter) {
        this.state.filter = filter;
        
        let filteredWidgets = this.state.widgets;
        
        if (filter !== 'all') {
            filteredWidgets = this.state.widgets.filter(widget => {
                switch (filter) {
                    case 'active':
                        return widget.status === 'active';
                    case 'inactive':
                        return widget.status === 'inactive';
                    case 'token-sale':
                    case 'price-chart':
                        return widget.type === filter;
                    default:
                        return true;
                }
            });
        }

        // Re-renderizar com widgets filtrados
        const originalWidgets = this.state.widgets;
        this.state.widgets = filteredWidgets;
        this.renderWidgetsList();
        this.state.widgets = originalWidgets;
    }

    /**
     * Configurar ações dos widgets
     */
    setupWidgetActions() {
        document.addEventListener('click', (event) => {
            const action = event.target.getAttribute('data-widget-action');
            const widgetId = event.target.getAttribute('data-widget-id');
            
            if (action && widgetId) {
                this.handleWidgetAction(action, widgetId);
            }
        });
    }

    /**
     * Processar ações dos widgets
     */
    handleWidgetAction(action, widgetId) {
        const widget = this.state.widgets.find(w => w.id === widgetId);
        if (!widget) return;

        switch (action) {
            case 'edit':
                this.editWidget(widget);
                break;
            case 'preview':
                this.previewWidget(widget);
                break;
            case 'copy':
                this.copyWidgetCode(widget);
                break;
            case 'delete':
                this.deleteWidget(widget);
                break;
        }
    }

    /**
     * Editar widget
     */
    editWidget(widget) {
        console.log('✏️ Editando widget:', widget.name);
        // Navegar para página de edição
        window.location.hash = `edit-widget&id=${widget.id}`;
    }

    /**
     * Visualizar widget
     */
    previewWidget(widget) {
        console.log('👁️ Visualizando widget:', widget.name);
        // Abrir modal de preview
        this.openPreviewModal(widget);
    }

    /**
     * Copiar código do widget
     */
    copyWidgetCode(widget) {
        const embedCode = this.generateEmbedCode(widget);
        
        navigator.clipboard.writeText(embedCode).then(() => {
            this.showNotification('Código do widget copiado!', 'success');
        }).catch(() => {
            // Fallback para browsers mais antigos
            this.showCodeModal(embedCode);
        });
    }

    /**
     * Gerar código de incorporação
     */
    generateEmbedCode(widget) {
        return `
<!-- TokenCafe Widget: ${widget.name} -->
<div id="tokencafe-widget-${widget.id}"></div>
<script src="https://tokencafe.app/widget.js"></script>
<script>
TokenCafe.renderWidget('${widget.id}', {
    container: 'tokencafe-widget-${widget.id}',
    width: '100%',
    height: 'auto'
});
</script>
        `.trim();
    }

    /**
     * Excluir widget
     */
    deleteWidget(widget) {
        if (confirm(`Tem certeza que deseja excluir o widget "${widget.name}"?`)) {
            console.log('🗑️ Excluindo widget:', widget.name);
            // Implementar exclusão
            this.performDeleteWidget(widget.id);
        }
    }

    /**
     * Carregar templates de widgets
     */
    async loadWidgetTemplates() {
        try {
            console.log('📋 Carregando templates de widgets...');
            
            // Simular carregamento de templates
            const templates = await this.fetchWidgetTemplates();
            this.state.templates = templates;
            
            this.renderTemplatesList();
            
        } catch (error) {
            console.error('❌ Erro ao carregar templates:', error);
        }
    }

    /**
     * Buscar templates disponíveis
     */
    async fetchWidgetTemplates() {
        // Simular templates (substituir por API real)
        return Object.keys(this.widgetTypes).map(type => ({
            type,
            ...this.widgetTypes[type],
            preview: `/templates/${type}-preview.png`
        }));
    }

    /**
     * Renderizar lista de templates
     */
    renderTemplatesList() {
        const container = document.getElementById('templates-list');
        if (!container) return;

        const html = this.state.templates.map(template => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card template-card h-100">
                    <div class="card-body text-center">
                        <i class="${template.icon} fa-3x text-coffee mb-3"></i>
                        <h5>${template.name}</h5>
                        <p class="text-muted">${template.description}</p>
                        <button class="btn btn-coffee" 
                                data-template-select="${template.type}">
                            Usar Template
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;
        
        // Configurar seleção de templates
        this.setupTemplateSelection();
    }

    /**
     * Configurar seleção de templates
     */
    setupTemplateSelection() {
        document.querySelectorAll('[data-template-select]').forEach(button => {
            button.addEventListener('click', (e) => {
                const templateType = e.target.getAttribute('data-template-select');
                this.selectTemplate(templateType);
            });
        });
    }

    /**
     * Selecionar template
     */
    selectTemplate(templateType) {
        console.log('📋 Template selecionado:', templateType);
        
        // Atualizar formulário com configurações do template
        this.loadTemplateConfig(templateType);
        
        // Focar no formulário de configuração
        const configSection = document.getElementById('widget-config-form');
        if (configSection) {
            configSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Handlers de eventos
     */
    async handleWidgetCreate(event) {
        const { config } = event.detail;
        await this.createWidget(config);
    }

    async handleWidgetEdit(event) {
        const { widgetId, config } = event.detail;
        await this.updateWidget(widgetId, config);
    }

    async handleWidgetDelete(event) {
        const { widgetId } = event.detail;
        await this.performDeleteWidget(widgetId);
    }

    async handleWidgetDeploy(event) {
        const { widgetId } = event.detail;
        await this.deployWidget(widgetId);
    }

    /**
     * Utilitários
     */
    setLoading(loading) {
        this.state.loading = loading;
        
        const loadingElement = document.getElementById('widgets-loading');
        if (loadingElement) {
            loadingElement.style.display = loading ? 'block' : 'none';
        }
    }

    showWidgetError(message) {
        const container = document.getElementById('widgets-list');
        if (container) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle"></i>
                        ${message}
                    </div>
                </div>
            `;
        }
    }

    showNotification(message, type = 'info') {
        // Implementar sistema de notificações
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
    }

    emitWidgetEvent(type, data = {}) {
        const event = new CustomEvent(`widget:${type}`, {
            detail: { ...data, state: this.state }
        });
        
        this.eventBus.dispatchEvent(event);
        
        if (typeof document !== 'undefined') {
            document.dispatchEvent(event);
        }
    }

    /**
     * API Pública
     */
    getWidgets() {
        return [...this.state.widgets];
    }

    getWidget(id) {
        return this.state.widgets.find(w => w.id === id);
    }

    getTemplates() {
        return [...this.state.templates];
    }

    getWidgetTypes() {
        return { ...this.widgetTypes };
    }
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.WidgetCore = WidgetCore;
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WidgetCore;
}