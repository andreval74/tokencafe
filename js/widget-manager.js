/**
 * ================================================================================
 * WIDGET MANAGER PAGE SCRIPT
 * ================================================================================
 * Script específico para a página de gerenciamento de widgets
 * Funcionalidades: CRUD widgets, wizard criação, filtros, preview
 * ================================================================================
 */

class WidgetManager {
    constructor() {
        this.widgets = [];
        this.filteredWidgets = [];
        this.currentView = 'grid';
        this.currentStep = 1;
        this.currentWidget = {};
        this.templates = [];
        this.pagination = {
            current: 1,
            total: 0,
            perPage: 12
        };
        
        this.init();
    }
    
    async init() {
        console.log('🎯 Inicializando Widget Manager...');
        
        // Aguardar TokenCafe estar pronto
        await this.waitForTokenCafe();
        
        // Carregar dados iniciais
        await this.loadInitialData();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Carregar widgets
        await this.loadWidgets();
        
        console.log('✅ Widget Manager inicializado com sucesso');
    }
    
    async waitForTokenCafe() {
        return new Promise((resolve) => {
            if (window.TokenCafe && window.TokenCafe.isReady) {
                resolve();
            } else {
                window.addEventListener('TokenCafe:ready', resolve);
            }
        });
    }
    
    async loadInitialData() {
        try {
            // Carregar templates disponíveis
            this.templates = await this.fetchTemplates();
            
            // Carregar estatísticas
            await this.updateStats();
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
        }
    }
    
    setupEventListeners() {
        // View toggle
        document.getElementById('grid-view').addEventListener('click', () => {
            this.switchView('grid');
        });
        
        document.getElementById('list-view').addEventListener('click', () => {
            this.switchView('list');
        });
        
        // Search
        const searchInput = document.getElementById('search-widgets');
        searchInput.addEventListener('input', window.debounce((e) => {
            this.filterWidgets();
        }, 300));
        
        // Sort
        document.getElementById('sort-widgets').addEventListener('change', () => {
            this.sortWidgets();
        });
        
        // Filters
        this.setupFilterListeners();
        
        // New Widget Modal
        this.setupNewWidgetModal();
        
        // Pagination
        this.setupPagination();
    }
    
    setupFilterListeners() {
        // Status filters
        document.querySelectorAll('input[id^="filter-"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.filterWidgets();
            });
        });
        
        // Template filter
        document.getElementById('filter-template').addEventListener('change', () => {
            this.filterWidgets();
        });
        
        // Date filter
        document.getElementById('filter-date').addEventListener('change', () => {
            this.filterWidgets();
        });
        
        // Clear filters
        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });
    }
    
    setupNewWidgetModal() {
        const modal = document.getElementById('newWidgetModal');
        const nextBtn = document.getElementById('next-step');
        const prevBtn = document.getElementById('prev-step');
        const createBtn = document.getElementById('create-widget');
        
        // Reset modal when opening
        modal.addEventListener('shown.bs.modal', () => {
            this.resetWizard();
            this.loadTemplateOptions();
        });
        
        // Next step
        nextBtn.addEventListener('click', () => {
            this.nextStep();
        });
        
        // Previous step
        prevBtn.addEventListener('click', () => {
            this.prevStep();
        });
        
        // Create widget
        createBtn.addEventListener('click', () => {
            this.createWidget();
        });
        
        // Step validation
        this.setupStepValidation();
    }
    
    setupStepValidation() {
        // Step 2 validation
        document.getElementById('widget-name').addEventListener('input', () => {
            this.validateCurrentStep();
        });
        
        document.getElementById('token-contract').addEventListener('input', () => {
            this.validateCurrentStep();
        });
        
        document.getElementById('widget-network').addEventListener('change', () => {
            this.validateCurrentStep();
        });
        
        // Step 3 - Color changes
        document.getElementById('primary-color').addEventListener('change', (e) => {
            this.updatePreview();
        });
        
        document.getElementById('secondary-color').addEventListener('change', (e) => {
            this.updatePreview();
        });
        
        document.getElementById('widget-size').addEventListener('change', () => {
            this.updatePreview();
        });
        
        document.getElementById('widget-theme').addEventListener('change', () => {
            this.updatePreview();
        });
    }
    
    setupPagination() {
        // Implementar navegação por páginas
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('page-link')) {
                e.preventDefault();
                const page = parseInt(e.target.dataset.page);
                if (page && page !== this.pagination.current) {
                    this.pagination.current = page;
                    this.renderWidgets();
                }
            }
        });
    }
    
    async loadWidgets() {
        try {
            document.getElementById('loading-state').classList.remove('d-none');
            document.getElementById('empty-state').classList.add('d-none');
            
            // Simular carregamento de widgets (implementar API real)
            this.widgets = await this.fetchWidgets();
            this.filteredWidgets = [...this.widgets];
            
            this.renderWidgets();
            this.updateStats();
            
        } catch (error) {
            console.error('Erro ao carregar widgets:', error);
            this.showError('Erro ao carregar widgets');
        } finally {
            document.getElementById('loading-state').classList.add('d-none');
        }
    }
    
    async fetchWidgets() {
        // Simular dados de widgets (implementar API real)
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([
                    {
                        id: 1,
                        name: 'Token Swap Widget',
                        description: 'Widget para trocar tokens ETH/USDC',
                        template: 'swap',
                        status: 'active',
                        network: 'ethereum',
                        contract: '0x742d35cc6561c4a9ac7a7e0a7c4b8e5c2a1d2d8b',
                        views: 1250,
                        volume: 12.5,
                        created: new Date('2025-01-15'),
                        category: 'defi',
                        isPublic: true,
                        theme: {
                            primaryColor: '#8B4513',
                            secondaryColor: '#A0522D',
                            size: 'md',
                            theme: 'coffee'
                        }
                    },
                    {
                        id: 2,
                        name: 'Price Tracker',
                        description: 'Acompanhe o preço do seu token favorito',
                        template: 'price',
                        status: 'active',
                        network: 'polygon',
                        contract: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
                        views: 892,
                        volume: 8.2,
                        created: new Date('2025-01-10'),
                        category: 'defi',
                        isPublic: false,
                        theme: {
                            primaryColor: '#6f42c1',
                            secondaryColor: '#563d7c',
                            size: 'sm',
                            theme: 'dark'
                        }
                    },
                    {
                        id: 3,
                        name: 'Portfolio Manager',
                        description: 'Gerencie seu portfólio de tokens',
                        template: 'portfolio',
                        status: 'draft',
                        network: 'bsc',
                        contract: '0x55d398326f99059fF775485246999027B3197955',
                        views: 0,
                        volume: 0,
                        created: new Date('2025-01-12'),
                        category: 'defi',
                        isPublic: false,
                        theme: {
                            primaryColor: '#f0b90b',
                            secondaryColor: '#f0b90b',
                            size: 'lg',
                            theme: 'light'
                        }
                    }
                ]);
            }, 1000);
        });
    }
    
    async fetchTemplates() {
        // Simular templates disponíveis
        return [
            {
                id: 'swap',
                name: 'Swap Widget',
                description: 'Permite trocar tokens diretamente',
                icon: 'fas fa-exchange-alt',
                category: 'defi',
                preview: 'swap-preview.png'
            },
            {
                id: 'price',
                name: 'Price Tracker',
                description: 'Exibe preço e gráfico do token',
                icon: 'fas fa-chart-line',
                category: 'analytics',
                preview: 'price-preview.png'
            },
            {
                id: 'portfolio',
                name: 'Portfolio',
                description: 'Visualização de carteira de tokens',
                icon: 'fas fa-wallet',
                category: 'defi',
                preview: 'portfolio-preview.png'
            },
            {
                id: 'staking',
                name: 'Staking Pool',
                description: 'Interface para staking de tokens',
                icon: 'fas fa-coins',
                category: 'defi',
                preview: 'staking-preview.png'
            },
            {
                id: 'nft',
                name: 'NFT Gallery',
                description: 'Galeria de NFTs',
                icon: 'fas fa-images',
                category: 'nft',
                preview: 'nft-preview.png'
            },
            {
                id: 'custom',
                name: 'Personalizado',
                description: 'Crie do zero seu próprio widget',
                icon: 'fas fa-code',
                category: 'custom',
                preview: 'custom-preview.png'
            }
        ];
    }
    
    filterWidgets() {
        const searchTerm = document.getElementById('search-widgets').value.toLowerCase();
        const activeFilter = document.getElementById('filter-active').checked;
        const draftFilter = document.getElementById('filter-draft').checked;
        const archivedFilter = document.getElementById('filter-archived').checked;
        const templateFilter = document.getElementById('filter-template').value;
        const dateFilter = document.getElementById('filter-date').value;
        
        this.filteredWidgets = this.widgets.filter(widget => {
            // Search filter
            if (searchTerm && !widget.name.toLowerCase().includes(searchTerm) && 
                !widget.description.toLowerCase().includes(searchTerm)) {
                return false;
            }
            
            // Status filter
            const statusFilters = [];
            if (activeFilter) statusFilters.push('active');
            if (draftFilter) statusFilters.push('draft');
            if (archivedFilter) statusFilters.push('archived');
            
            if (statusFilters.length > 0 && !statusFilters.includes(widget.status)) {
                return false;
            }
            
            // Template filter
            if (templateFilter && widget.template !== templateFilter) {
                return false;
            }
            
            // Date filter
            if (dateFilter && !this.matchesDateFilter(widget.created, dateFilter)) {
                return false;
            }
            
            return true;
        });
        
        this.pagination.current = 1;
        this.renderWidgets();
    }
    
    matchesDateFilter(date, filter) {
        const now = new Date();
        const widgetDate = new Date(date);
        
        switch (filter) {
            case 'today':
                return widgetDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return widgetDate >= weekAgo;
            case 'month':
                return widgetDate.getMonth() === now.getMonth() && 
                       widgetDate.getFullYear() === now.getFullYear();
            case 'year':
                return widgetDate.getFullYear() === now.getFullYear();
            default:
                return true;
        }
    }
    
    sortWidgets() {
        const sortBy = document.getElementById('sort-widgets').value;
        
        this.filteredWidgets.sort((a, b) => {
            switch (sortBy) {
                case 'created_desc':
                    return new Date(b.created) - new Date(a.created);
                case 'created_asc':
                    return new Date(a.created) - new Date(b.created);
                case 'name_asc':
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                case 'views_desc':
                    return b.views - a.views;
                case 'volume_desc':
                    return b.volume - a.volume;
                default:
                    return 0;
            }
        });
        
        this.renderWidgets();
    }
    
    clearFilters() {
        document.getElementById('search-widgets').value = '';
        document.getElementById('filter-active').checked = true;
        document.getElementById('filter-draft').checked = false;
        document.getElementById('filter-archived').checked = false;
        document.getElementById('filter-template').value = '';
        document.getElementById('filter-date').value = '';
        document.getElementById('sort-widgets').value = 'created_desc';
        
        this.filterWidgets();
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Update buttons
        document.getElementById('grid-view').classList.toggle('active', view === 'grid');
        document.getElementById('list-view').classList.toggle('active', view === 'list');
        
        // Update containers
        document.getElementById('widgets-grid').classList.toggle('d-none', view !== 'grid');
        document.getElementById('widgets-list').classList.toggle('d-none', view !== 'list');
        
        this.renderWidgets();
    }
    
    renderWidgets() {
        const { current, perPage } = this.pagination;
        const startIndex = (current - 1) * perPage;
        const endIndex = startIndex + perPage;
        const pageWidgets = this.filteredWidgets.slice(startIndex, endIndex);
        
        if (pageWidgets.length === 0) {
            this.showEmptyState();
            return;
        }
        
        document.getElementById('empty-state').classList.add('d-none');
        
        if (this.currentView === 'grid') {
            this.renderGridView(pageWidgets);
        } else {
            this.renderListView(pageWidgets);
        }
        
        this.updatePagination();
    }
    
    renderGridView(widgets) {
        const container = document.getElementById('widgets-grid');
        
        container.innerHTML = widgets.map(widget => `
            <div class="col-md-6 col-lg-4">
                <div class="card widget-card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <i class="${this.getTemplateIcon(widget.template)} text-coffee me-2"></i>
                            <h6 class="mb-0">${widget.name}</h6>
                        </div>
                        <span class="badge ${this.getStatusBadgeClass(widget.status)} status-badge">
                            ${this.getStatusText(widget.status)}
                        </span>
                    </div>
                    
                    <div class="card-body">
                        <p class="card-text text-muted small mb-3">${widget.description}</p>
                        
                        <div class="widget-stats mb-3">
                            <div class="row g-2 text-center">
                                <div class="col-4">
                                    <div class="text-muted small">Views</div>
                                    <div class="fw-bold">${widget.views.toLocaleString()}</div>
                                </div>
                                <div class="col-4">
                                    <div class="text-muted small">Volume</div>
                                    <div class="fw-bold text-gold">${widget.volume} ETH</div>
                                </div>
                                <div class="col-4">
                                    <div class="text-muted small">Rede</div>
                                    <div class="fw-bold">${this.getNetworkName(widget.network)}</div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                ${this.formatDate(widget.created)}
                            </small>
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="widgetManager.previewWidget(${widget.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" 
                                        onclick="widgetManager.editWidget(${widget.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-info" 
                                        onclick="widgetManager.shareWidget(${widget.id})">
                                    <i class="fas fa-share"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" 
                                        onclick="widgetManager.deleteWidget(${widget.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    renderListView(widgets) {
        const tbody = document.getElementById('widgets-table-body');
        
        tbody.innerHTML = widgets.map(widget => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <i class="${this.getTemplateIcon(widget.template)} text-coffee me-2"></i>
                        <div>
                            <div class="fw-bold">${widget.name}</div>
                            <small class="text-muted">${widget.description}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge bg-light text-dark">${this.getTemplateName(widget.template)}</span>
                </td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(widget.status)} status-badge">
                        ${this.getStatusText(widget.status)}
                    </span>
                </td>
                <td>${widget.views.toLocaleString()}</td>
                <td class="text-gold">${widget.volume} ETH</td>
                <td>${this.formatDate(widget.created)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="widgetManager.previewWidget(${widget.id})" 
                                title="Preview">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" 
                                onclick="widgetManager.editWidget(${widget.id})" 
                                title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="widgetManager.deleteWidget(${widget.id})" 
                                title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    showEmptyState() {
        document.getElementById('widgets-grid').innerHTML = '';
        document.getElementById('widgets-table-body').innerHTML = '';
        document.getElementById('empty-state').classList.remove('d-none');
        document.getElementById('pagination-nav').classList.add('d-none');
    }
    
    updatePagination() {
        const totalPages = Math.ceil(this.filteredWidgets.length / this.pagination.perPage);
        this.pagination.total = totalPages;
        
        if (totalPages <= 1) {
            document.getElementById('pagination-nav').classList.add('d-none');
            return;
        }
        
        document.getElementById('pagination-nav').classList.remove('d-none');
        
        const pagination = document.getElementById('pagination');
        const current = this.pagination.current;
        
        let paginationHTML = '';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${current === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${current - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Page numbers
        for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
            paginationHTML += `
                <li class="page-item ${i === current ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${current === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${current + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
    }
    
    async updateStats() {
        const totalWidgets = this.widgets.length;
        const activeWidgets = this.widgets.filter(w => w.status === 'active').length;
        const totalViews = this.widgets.reduce((sum, w) => sum + w.views, 0);
        const totalVolume = this.widgets.reduce((sum, w) => sum + w.volume, 0);
        
        document.getElementById('total-widgets-count').textContent = totalWidgets;
        document.getElementById('active-widgets-count').textContent = activeWidgets;
        document.getElementById('total-views-count').textContent = totalViews.toLocaleString();
        document.getElementById('total-volume-count').textContent = `${totalVolume.toFixed(2)} ETH`;
    }
    
    // Widget CRUD Operations
    async previewWidget(widgetId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;
        
        // Implementar preview em modal ou nova janela
        window.open(`/widget/${widgetId}`, '_blank', 'width=500,height=600');
    }
    
    async editWidget(widgetId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;
        
        // Carregar dados no modal de criação para edição
        this.currentWidget = { ...widget };
        this.loadWidgetIntoModal(widget);
        
        const modal = new bootstrap.Modal(document.getElementById('newWidgetModal'));
        modal.show();
    }
    
    async shareWidget(widgetId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;
        
        const shareData = {
            title: `TokenCafe Widget: ${widget.name}`,
            text: widget.description,
            url: `${window.location.origin}/widget/${widgetId}`
        };
        
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: copiar URL
                await navigator.clipboard.writeText(shareData.url);
                this.showNotification('URL copiada para área de transferência!', 'success');
            }
        } catch (error) {
            console.error('Erro ao compartilhar:', error);
        }
    }
    
    async deleteWidget(widgetId) {
        const widget = this.widgets.find(w => w.id === widgetId);
        if (!widget) return;
        
        const confirmed = await this.confirmDelete(
            `Widget "${widget.name}"`,
            () => this.performDeleteWidget(widgetId)
        );
    }
    
    async performDeleteWidget(widgetId) {
        try {
            // Implementar API de exclusão
            await this.apiDeleteWidget(widgetId);
            
            // Remove da lista local
            this.widgets = this.widgets.filter(w => w.id !== widgetId);
            this.filterWidgets();
            this.updateStats();
            
            this.showNotification('Widget excluído com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao excluir widget:', error);
            this.showNotification('Erro ao excluir widget', 'error');
        }
    }
    
    // New Widget Wizard
    loadTemplateOptions() {
        const container = document.getElementById('template-options');
        
        container.innerHTML = this.templates.map(template => `
            <div class="col-md-6 col-lg-4">
                <div class="card template-selector" data-template="${template.id}">
                    <div class="card-body text-center">
                        <div class="mb-3">
                            <i class="${template.icon} fa-2x text-coffee"></i>
                        </div>
                        <h6 class="card-title">${template.name}</h6>
                        <p class="card-text text-muted small">${template.description}</p>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click handlers
        container.querySelectorAll('.template-selector').forEach(card => {
            card.addEventListener('click', () => {
                container.querySelectorAll('.template-selector').forEach(c => 
                    c.classList.remove('active'));
                card.classList.add('active');
                
                this.currentWidget.template = card.dataset.template;
                this.validateCurrentStep();
            });
        });
    }
    
    resetWizard() {
        this.currentStep = 1;
        this.currentWidget = {};
        this.updateWizardStep();
        this.clearForm();
    }
    
    nextStep() {
        if (!this.validateCurrentStep()) return;
        
        this.currentStep++;
        this.updateWizardStep();
        
        if (this.currentStep === 4) {
            this.generateEmbedCode();
        }
    }
    
    prevStep() {
        this.currentStep--;
        this.updateWizardStep();
    }
    
    updateWizardStep() {
        // Update step indicators
        document.querySelectorAll('.step-indicator').forEach((step, index) => {
            step.classList.toggle('active', index + 1 <= this.currentStep);
        });
        
        // Update step content
        document.querySelectorAll('.wizard-step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.currentStep);
        });
        
        // Update buttons
        const nextBtn = document.getElementById('next-step');
        const prevBtn = document.getElementById('prev-step');
        const createBtn = document.getElementById('create-widget');
        
        prevBtn.style.display = this.currentStep > 1 ? 'inline-block' : 'none';
        nextBtn.style.display = this.currentStep < 4 ? 'inline-block' : 'none';
        createBtn.style.display = this.currentStep === 4 ? 'inline-block' : 'none';
        
        nextBtn.disabled = !this.validateCurrentStep();
    }
    
    validateCurrentStep() {
        switch (this.currentStep) {
            case 1:
                return !!this.currentWidget.template;
            case 2:
                const name = document.getElementById('widget-name').value;
                const contract = document.getElementById('token-contract').value;
                const network = document.getElementById('widget-network').value;
                return name && contract && network;
            case 3:
            case 4:
                return true;
            default:
                return false;
        }
    }
    
    updatePreview() {
        const preview = document.getElementById('widget-preview');
        const primaryColor = document.getElementById('primary-color').value;
        const secondaryColor = document.getElementById('secondary-color').value;
        const size = document.getElementById('widget-size').value;
        const theme = document.getElementById('widget-theme').value;
        
        // Simular preview do widget
        preview.innerHTML = `
            <div class="preview-widget ${theme}" style="--primary: ${primaryColor}; --secondary: ${secondaryColor};">
                <div class="preview-header" style="background: ${primaryColor}; color: white; padding: 10px;">
                    <h6 class="mb-0">${document.getElementById('widget-name').value || 'Meu Widget'}</h6>
                </div>
                <div class="preview-body p-3">
                    <div class="text-center">
                        <i class="${this.getTemplateIcon(this.currentWidget.template)} fa-2x mb-2" 
                           style="color: ${primaryColor};"></i>
                        <p class="mb-0 text-muted">Preview do widget</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateEmbedCode() {
        const widgetId = this.currentWidget.id || 'new-widget';
        const size = document.getElementById('widget-size').value;
        
        const sizes = {
            sm: { width: 300, height: 400 },
            md: { width: 400, height: 500 },
            lg: { width: 500, height: 600 }
        };
        
        const { width, height } = sizes[size];
        const embedCode = `<iframe src="${window.location.origin}/widget/${widgetId}" width="${width}" height="${height}" frameborder="0"></iframe>`;
        const widgetUrl = `${window.location.origin}/widget/${widgetId}`;
        
        document.getElementById('embed-code').innerHTML = `<code>${this.escapeHtml(embedCode)}</code>`;
        document.getElementById('widget-url').value = widgetUrl;
        
        // Copy buttons
        document.getElementById('copy-embed-code').onclick = () => {
            navigator.clipboard.writeText(embedCode);
            this.showNotification('Código copiado!', 'success');
        };
        
        document.getElementById('copy-widget-url').onclick = () => {
            navigator.clipboard.writeText(widgetUrl);
            this.showNotification('URL copiada!', 'success');
        };
    }
    
    async createWidget() {
        try {
            // Coletar dados do formulário
            const widgetData = this.collectWidgetData();
            
            // Validar dados
            if (!this.validateWidgetData(widgetData)) {
                return;
            }
            
            // Criar widget via API
            const newWidget = await this.apiCreateWidget(widgetData);
            
            // Adicionar à lista local
            this.widgets.unshift(newWidget);
            this.filterWidgets();
            this.updateStats();
            
            // Fechar modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('newWidgetModal'));
            modal.hide();
            
            this.showNotification('Widget criado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao criar widget:', error);
            this.showNotification('Erro ao criar widget', 'error');
        }
    }
    
    collectWidgetData() {
        return {
            name: document.getElementById('widget-name').value,
            description: document.getElementById('widget-description').value,
            template: this.currentWidget.template,
            network: document.getElementById('widget-network').value,
            contract: document.getElementById('token-contract').value,
            category: document.getElementById('widget-category').value,
            isPublic: document.getElementById('widget-public').checked,
            theme: {
                primaryColor: document.getElementById('primary-color').value,
                secondaryColor: document.getElementById('secondary-color').value,
                size: document.getElementById('widget-size').value,
                theme: document.getElementById('widget-theme').value
            }
        };
    }
    
    validateWidgetData(data) {
        if (!data.name || !data.contract || !data.network || !data.template) {
            this.showNotification('Preencha todos os campos obrigatórios', 'error');
            return false;
        }
        
        // Validar endereço do contrato
        if (!/^0x[a-fA-F0-9]{40}$/.test(data.contract)) {
            this.showNotification('Endereço do contrato inválido', 'error');
            return false;
        }
        
        return true;
    }
    
    // API Methods (implementar com backend real)
    async apiCreateWidget(widgetData) {
        // Simular criação
        return new Promise(resolve => {
            setTimeout(() => {
                const newWidget = {
                    id: Date.now(),
                    ...widgetData,
                    status: 'active',
                    views: 0,
                    volume: 0,
                    created: new Date()
                };
                resolve(newWidget);
            }, 1000);
        });
    }
    
    async apiDeleteWidget(widgetId) {
        // Simular exclusão
        return new Promise(resolve => {
            setTimeout(resolve, 500);
        });
    }
    
    // Utility methods
    getTemplateIcon(template) {
        const icons = {
            swap: 'fas fa-exchange-alt',
            price: 'fas fa-chart-line',
            portfolio: 'fas fa-wallet',
            staking: 'fas fa-coins',
            nft: 'fas fa-images',
            custom: 'fas fa-code'
        };
        return icons[template] || 'fas fa-cube';
    }
    
    getTemplateName(template) {
        const names = {
            swap: 'Swap Widget',
            price: 'Price Tracker',
            portfolio: 'Portfolio',
            staking: 'Staking Pool',
            nft: 'NFT Gallery',
            custom: 'Personalizado'
        };
        return names[template] || template;
    }
    
    getStatusBadgeClass(status) {
        const classes = {
            active: 'bg-success',
            draft: 'bg-warning',
            archived: 'bg-secondary'
        };
        return classes[status] || 'bg-secondary';
    }
    
    getStatusText(status) {
        const texts = {
            active: 'Ativo',
            draft: 'Rascunho',
            archived: 'Arquivado'
        };
        return texts[status] || status;
    }
    
    getNetworkName(network) {
        const names = {
            ethereum: 'Ethereum',
            bsc: 'BSC',
            polygon: 'Polygon',
            arbitrum: 'Arbitrum'
        };
        return names[network] || network;
    }
    
    formatDate(date) {
        return new Date(date).toLocaleDateString('pt-BR');
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    clearForm() {
        document.getElementById('widget-name').value = '';
        document.getElementById('widget-description').value = '';
        document.getElementById('token-contract').value = '';
        document.getElementById('widget-network').value = '';
        document.getElementById('widget-category').value = '';
        document.getElementById('widget-public').checked = false;
        document.getElementById('primary-color').value = '#8B4513';
        document.getElementById('secondary-color').value = '#A0522D';
        document.getElementById('widget-size').value = 'md';
        document.getElementById('widget-theme').value = 'coffee';
    }
    
    showNotification(message, type) {
        if (window.addNotification) {
            window.addNotification(message, type);
        } else {
            alert(message);
        }
    }
    
    confirmDelete(item, onConfirm) {
        if (window.confirmDelete) {
            return window.confirmDelete(item, onConfirm);
        } else {
            return confirm(`Excluir ${item}?`) && onConfirm();
        }
    }
}

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.widgetManager = new WidgetManager();
});

// CSS adicional para wizard steps
const additionalCSS = `
.step-indicator {
    display: flex;
    flex-direction: column;
    align-items: center;
    opacity: 0.5;
    transition: opacity 0.3s;
}

.step-indicator.active {
    opacity: 1;
}

.step-number {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bs-secondary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin-bottom: 4px;
}

.step-indicator.active .step-number {
    background: var(--bs-coffee);
}

.step-label {
    font-size: 0.875rem;
    color: var(--bs-secondary);
    font-weight: 500;
}

.step-indicator.active .step-label {
    color: var(--bs-coffee);
}

.step-divider {
    width: 40px;
    height: 2px;
    background: var(--bs-secondary);
    opacity: 0.3;
    margin-top: 16px;
}

.wizard-step {
    display: none;
}

.wizard-step.active {
    display: block;
}

.preview-widget {
    border: 1px solid #dee2e6;
    border-radius: 0.375rem;
    overflow: hidden;
    background: white;
    min-width: 200px;
}

.preview-widget.dark {
    background: #212529;
    color: white;
}

.preview-widget.coffee {
    background: #f8f9fa;
}
`;

// Adicionar CSS ao documento
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
