/**
 * ================================================================================
 * ANALYTICS CORE - TOKENCAFE
 * ================================================================================
 * Sistema centralizado para analytics, métricas e relatórios
 * Consolidação de todas as funções relacionadas a analytics
 * ================================================================================
 */

class AnalyticsCore {
    constructor() {
        this.charts = {};
        this.data = {};
        this.currentTab = 'overview';
        this.filters = {
            period: '7d',
            comparison: 'previous',
            segment: 'all'
        };
        this.autoRefreshInterval = null;
        this.isAutoRefreshEnabled = true;
        this.eventQueue = [];
        
        this.init();
    }

    /**
     * Inicialização do sistema de analytics
     */
    async init() {
        console.log('📊 Inicializando AnalyticsCore...');
        
        // Aguardar TokenCafe estar pronto
        await this.waitForTokenCafe();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Carregar dados iniciais
        await this.loadInitialData();
        
        // Configurar auto-refresh
        this.setupAutoRefresh();
        
        // Processar eventos em fila
        this.processEventQueue();
        
        console.log('✅ AnalyticsCore inicializado com sucesso');
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
        // Tabs de analytics
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Filtros de período
        document.querySelectorAll('.period-filter').forEach(filter => {
            filter.addEventListener('change', (e) => {
                this.filters.period = e.target.value;
                this.applyFilters();
            });
        });

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementById('auto-refresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.isAutoRefreshEnabled = e.target.checked;
                if (this.isAutoRefreshEnabled) {
                    this.setupAutoRefresh();
                } else {
                    this.clearAutoRefresh();
                }
            });
        }

        // Export buttons
        document.querySelectorAll('[data-export]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const format = e.target.dataset.export;
                this.export(format);
            });
        });
    }

    /**
     * Configurar auto-refresh
     */
    setupAutoRefresh() {
        if (!this.isAutoRefreshEnabled) return;
        
        this.clearAutoRefresh();
        this.autoRefreshInterval = setInterval(async () => {
            await this.refreshData();
        }, 30000); // 30 segundos
    }

    /**
     * Limpar auto-refresh
     */
    clearAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    /**
     * Carregar dados iniciais
     */
    async loadInitialData() {
        try {
            console.log('📈 Carregando dados de analytics...');
            
            // Carregar dados em paralelo
            const [overview, users, widgets, financial] = await Promise.all([
                this.fetchOverviewData(),
                this.fetchUsersData(),
                this.fetchWidgetsData(),
                this.fetchFinancialData()
            ]);

            this.data = { overview, users, widgets, financial };
            
            // Renderizar tab atual
            this.renderCurrentTab();
            
        } catch (error) {
            console.error('❌ Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados de analytics');
        }
    }

    /**
     * Alternar entre abas
     */
    switchTab(tabName) {
        // Atualizar botões das abas
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Atualizar conteúdo
        document.querySelectorAll('.analytics-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
        
        this.currentTab = tabName;
        this.renderCurrentTab();
    }

    /**
     * Renderizar aba atual
     */
    async renderCurrentTab() {
        switch (this.currentTab) {
            case 'overview':
                this.renderOverview();
                break;
            case 'users':
                this.renderUsers();
                break;
            case 'widgets':
                this.renderWidgets();
                break;
            case 'financial':
                this.renderFinancial();
                break;
            case 'performance':
                this.renderPerformance();
                break;
        }
    }

    /**
     * Renderizar visão geral
     */
    renderOverview() {
        console.log('📊 Renderizando visão geral...');
        
        this.updateKPIs();
        this.createTransactionVolumeChart();
        this.createNetworkDistributionChart();
        this.renderTopWidgets();
        this.renderTopUsers();
        this.renderPopularTokens();
    }

    /**
     * Atualizar KPIs
     */
    updateKPIs() {
        if (!this.data.overview) return;
        
        const { users, widgets, transactions, volume } = this.data.overview.kpis || {};
        
        if (users) this.animateNumber(document.getElementById('total-users'), users.value);
        if (widgets) this.animateNumber(document.getElementById('total-widgets'), widgets.value);
        if (transactions) document.getElementById('total-transactions').textContent = this.formatNumber(transactions.value, 'K');
        if (volume) document.getElementById('total-volume').textContent = this.formatNumber(volume.value, 'M') + ' ETH';
    }

    /**
     * Criar gráfico de volume de transações
     */
    createTransactionVolumeChart() {
        const ctx = document.getElementById('transactionVolumeChart');
        if (!ctx) return;
        
        this.destroyChart('transactionVolume');
        
        const data = this.generateTransactionVolumeData();
        
        this.charts.transactionVolume = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Volume de Transações',
                    data: data.values,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ETH';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    /**
     * Criar gráfico de distribuição por rede
     */
    createNetworkDistributionChart() {
        const ctx = document.getElementById('networkDistributionChart');
        if (!ctx) return;
        
        this.destroyChart('networkDistribution');
        
        this.charts.networkDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ethereum', 'BSC', 'Polygon', 'Outras'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: [
                        '#8B4513',
                        '#A0522D',
                        '#CD853F',
                        '#DEB887'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Renderizar top widgets
     */
    renderTopWidgets() {
        const container = document.getElementById('top-widgets');
        if (!container) return;
        
        const widgets = this.generateTopWidgetsData();
        
        container.innerHTML = widgets.map((widget, index) => `
            <div class="leaderboard-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="badge bg-coffee text-white me-2">${index + 1}</div>
                        <div>
                            <h6 class="mb-0">${widget.name}</h6>
                            <small class="text-muted">${widget.type}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-coffee">${widget.volume} ETH</div>
                        <small class="text-muted">${widget.transactions} tx</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderizar top usuários
     */
    renderTopUsers() {
        const container = document.getElementById('top-users');
        if (!container) return;
        
        const users = this.generateTopUsersData();
        
        container.innerHTML = users.map((user, index) => `
            <div class="leaderboard-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="badge bg-coffee text-white me-2">${index + 1}</div>
                        <div>
                            <h6 class="mb-0">${user.name}</h6>
                            <small class="text-muted">${user.widgets} widgets</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-coffee">${user.volume} ETH</div>
                        <small class="text-muted">${user.transactions} tx</small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Renderizar tokens populares
     */
    renderPopularTokens() {
        const container = document.getElementById('popular-tokens');
        if (!container) return;
        
        const tokens = this.generatePopularTokensData();
        
        container.innerHTML = tokens.map((token, index) => `
            <div class="leaderboard-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <div class="badge bg-coffee text-white me-2">${index + 1}</div>
                        <div>
                            <h6 class="mb-0">${token.symbol}</h6>
                            <small class="text-muted">${token.name}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-coffee">$${token.price}</div>
                        <small class="${token.change >= 0 ? 'text-success' : 'text-danger'}">
                            ${token.change >= 0 ? '+' : ''}${token.change}%
                        </small>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ================================================================================
    // TRACKING DE EVENTOS
    // ================================================================================

    /**
     * Rastrear evento
     */
    trackEvent(eventName, properties = {}) {
        const event = {
            name: eventName,
            properties: {
                ...properties,
                timestamp: Date.now(),
                url: window.location.href,
                userAgent: navigator.userAgent
            }
        };
        
        this.eventQueue.push(event);
        
        // Enviar imediatamente se possível
        this.sendEvent(event);
    }

    /**
     * Enviar evento
     */
    async sendEvent(event) {
        try {
            // Enviar para API se disponível
            if (window.location.hostname !== 'localhost') {
                const response = await fetch('/api/analytics/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(event)
                });
                
                if (!response.ok) throw new Error('Failed to send event');
            }
            
            console.log('📊 Evento rastreado:', event.name);
            
        } catch (error) {
            console.warn('⚠️ Erro ao enviar evento:', error.message);
        }
    }

    /**
     * Processar fila de eventos
     */
    processEventQueue() {
        setInterval(() => {
            if (this.eventQueue.length > 0) {
                const events = this.eventQueue.splice(0, 10); // Processar até 10 por vez
                events.forEach(event => this.sendEvent(event));
            }
        }, 5000); // A cada 5 segundos
    }

    // ================================================================================
    // UTILIDADES
    // ================================================================================

    /**
     * Animar número
     */
    animateNumber(element, targetValue, duration = 1000) {
        if (!element || isNaN(targetValue)) return;
        
        const startValue = parseInt(element.textContent.replace(/\D/g, '')) || 0;
        const increment = (targetValue - startValue) / (duration / 16);
        let currentValue = startValue;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if ((increment > 0 && currentValue >= targetValue) || 
                (increment < 0 && currentValue <= targetValue)) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue).toLocaleString();
        }, 16);
    }

    /**
     * Formatar número
     */
    formatNumber(num, suffix = '') {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M' + suffix;
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K' + suffix;
        }
        return num + suffix;
    }

    /**
     * Destruir gráfico
     */
    destroyChart(chartName) {
        if (this.charts[chartName]) {
            this.charts[chartName].destroy();
            delete this.charts[chartName];
        }
    }

    /**
     * Atualizar dados
     */
    async refreshData() {
        console.log('🔄 Atualizando dados de analytics...');
        await this.loadInitialData();
        this.showInfo('Dados atualizados com sucesso');
    }

    /**
     * Aplicar filtros
     */
    async applyFilters() {
        console.log('🔍 Aplicando filtros:', this.filters);
        await this.loadInitialData();
    }

    /**
     * Exportar dados
     */
    async export(format) {
        console.log(`📤 Exportando em formato ${format}...`);
        
        try {
            const data = {
                timestamp: new Date().toISOString(),
                period: this.filters.period,
                data: this.data
            };
            
            switch (format) {
                case 'pdf':
                    await this.exportToPDF(data);
                    break;
                case 'excel':
                    await this.exportToExcel(data);
                    break;
                case 'csv':
                    await this.exportToCSV(data);
                    break;
            }
            
            this.showSuccess(`Relatório ${format.toUpperCase()} gerado com sucesso`);
            
        } catch (error) {
            console.error('❌ Erro na exportação:', error);
            this.showError('Erro ao gerar relatório');
        }
    }

    // ================================================================================
    // DATA GENERATORS (MOCK DATA)
    // ================================================================================

    generateTransactionVolumeData() {
        const labels = [];
        const values = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
            values.push(Math.floor(Math.random() * 1000) + 500);
        }
        
        return { labels, values };
    }

    generateTopWidgetsData() {
        return [
            { name: 'ETH/USDC Swap', type: 'Swap Widget', volume: '1,247', transactions: '8.5K' },
            { name: 'BTC Tracker', type: 'Price Widget', volume: '892', transactions: '3.2K' },
            { name: 'DeFi Portfolio', type: 'Portfolio Widget', volume: '654', transactions: '1.8K' },
            { name: 'MATIC Staking', type: 'Staking Widget', volume: '423', transactions: '1.1K' },
            { name: 'NFT Collection', type: 'NFT Widget', volume: '321', transactions: '756' }
        ];
    }

    generateTopUsersData() {
        return [
            { name: '0x1234...5678', widgets: 12, volume: '2,340', transactions: '15.2K' },
            { name: '0x2345...6789', widgets: 8, volume: '1,856', transactions: '9.8K' },
            { name: '0x3456...7890', widgets: 6, volume: '1,234', transactions: '7.1K' },
            { name: '0x4567...8901', widgets: 5, volume: '987', transactions: '4.5K' },
            { name: '0x5678...9012', widgets: 4, volume: '654', transactions: '2.8K' }
        ];
    }

    generatePopularTokensData() {
        return [
            { symbol: 'ETH', name: 'Ethereum', price: '2,847.32', change: 5.2 },
            { symbol: 'BTC', name: 'Bitcoin', price: '45,123.45', change: -1.8 },
            { symbol: 'MATIC', name: 'Polygon', price: '0.87', change: 8.9 },
            { symbol: 'BNB', name: 'BNB Chain', price: '234.56', change: 3.1 },
            { symbol: 'AVAX', name: 'Avalanche', price: '12.34', change: -4.2 }
        ];
    }

    // ================================================================================
    // DATA FETCHING (APIs)
    // ================================================================================

    async fetchOverviewData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    kpis: {
                        users: { value: 12547, change: 15.3 },
                        widgets: { value: 8542, change: 8.7 },
                        transactions: { value: 247000, change: 23.1 },
                        volume: { value: 2.8, change: -2.4 }
                    }
                });
            }, 500);
        });
    }

    async fetchUsersData() {
        return new Promise(resolve => {
            setTimeout(() => resolve({}), 300);
        });
    }

    async fetchWidgetsData() {
        return new Promise(resolve => {
            setTimeout(() => resolve({}), 400);
        });
    }

    async fetchFinancialData() {
        return new Promise(resolve => {
            setTimeout(() => resolve({}), 600);
        });
    }

    // ================================================================================
    // NOTIFICAÇÕES
    // ================================================================================

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type) {
        console.log(`📊 [${type.toUpperCase()}] ${message}`);
        
        // Integração com sistema de notificações se disponível
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else if (window.TokenCafe?.ui?.showNotification) {
            window.TokenCafe.ui.showNotification(message, type);
        }
    }
}

// ================================================================================
// EXPOSIÇÃO GLOBAL E INICIALIZAÇÃO
// ================================================================================

// Expor globalmente
window.AnalyticsCore = AnalyticsCore;

// Criar instância global quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    if (!window.tokencafeAnalytics) {
        window.tokencafeAnalytics = new AnalyticsCore();
    }
});

// Compatibilidade com código legado
window.analytics = window.tokencafeAnalytics;

console.log('✅ Analytics Core carregado');