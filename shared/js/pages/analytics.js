/**
 * ================================================================================
 * ANALYTICS PAGE SCRIPT
 * ================================================================================
 * Script para a página de analytics e relatórios do TokenCafe
 * Funcionalidades: gráficos, métricas, exportação, filtros
 * ================================================================================
 */

class Analytics {
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
        
        this.init();
    }
    
    async init() {
        console.log('📊 Inicializando Analytics...');
        
        // Aguardar TokenCafe estar pronto
        await this.waitForTokenCafe();
        
        // Configurar event listeners
        this.setupEventListeners();
        
        // Carregar dados iniciais
        await this.loadInitialData();
        
        // Configurar auto-refresh
        this.setupAutoRefresh();
        
        console.log('✅ Analytics inicializado com sucesso');
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
    
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.closest('.analytics-tab').dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Filter selectors
        document.getElementById('period-selector').addEventListener('change', (e) => {
            this.filters.period = e.target.value;
        });
        
        document.getElementById('comparison-selector').addEventListener('change', (e) => {
            this.filters.comparison = e.target.value;
        });
        
        document.getElementById('segment-selector').addEventListener('change', (e) => {
            this.filters.segment = e.target.value;
        });
        
        // Auto-refresh toggle
        document.getElementById('auto-refresh').addEventListener('change', (e) => {
            this.isAutoRefreshEnabled = e.target.checked;
            if (this.isAutoRefreshEnabled) {
                this.setupAutoRefresh();
            } else {
                this.clearAutoRefresh();
            }
        });
        
        // Window resize handler para charts
        window.addEventListener('resize', debounce(() => {
            this.resizeCharts();
        }, 300));
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
    }
    
    setupAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        if (this.isAutoRefreshEnabled) {
            this.autoRefreshInterval = setInterval(() => {
                this.refreshData(true); // Silent refresh
            }, 5 * 60 * 1000); // 5 minutes
        }
    }
    
    clearAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    
    async loadInitialData() {
        try {
            // Carregar dados em paralelo
            const [overview, users, widgets, financial] = await Promise.all([
                this.fetchOverviewData(),
                this.fetchUsersData(),
                this.fetchWidgetsData(),
                this.fetchFinancialData()
            ]);
            
            this.data = {
                overview,
                users,
                widgets,
                financial
            };
            
            // Renderizar tab ativo
            this.renderCurrentTab();
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados de analytics');
        }
    }
    
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.analytics-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.analytics-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
        
        this.currentTab = tabName;
        this.renderCurrentTab();
    }
    
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
    
    // Overview Tab
    renderOverview() {
        this.updateKPIs();
        this.createTransactionVolumeChart();
        this.createNetworkDistributionChart();
        this.renderTopWidgets();
        this.renderTopUsers();
        this.renderPopularTokens();
    }
    
    updateKPIs() {
        if (!this.data.overview) return;
        
        const { users, widgets, transactions, volume } = this.data.overview.kpis;
        
        this.animateNumber(document.getElementById('total-users'), users.value);
        this.animateNumber(document.getElementById('total-widgets'), widgets.value);
        
        document.getElementById('total-transactions').textContent = this.formatNumber(transactions.value, 'K');
        document.getElementById('total-volume').textContent = this.formatNumber(volume.value, 'M') + ' ETH';
    }
    
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
                    label: 'Volume de Transações (ETH)',
                    data: data.values,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#8B4513',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Volume: ${context.parsed.y.toLocaleString()} ETH`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0,0,0,0.1)'
                        },
                        ticks: {
                            callback: function(value) {
                                return value.toLocaleString() + ' ETH';
                            }
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    
    createNetworkDistributionChart() {
        const ctx = document.getElementById('networkDistributionChart');
        if (!ctx) return;
        
        this.destroyChart('networkDistribution');
        
        this.charts.networkDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Optimism'],
                datasets: [{
                    data: [40, 25, 20, 10, 5],
                    backgroundColor: [
                        '#8B4513',
                        '#A0522D',
                        '#DAA520',
                        '#CD853F',
                        '#DEB887'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.label}: ${context.parsed}%`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }
    
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
                            <small class="text-muted">${user.address}</small>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-coffee">${user.widgets}</div>
                        <small class="text-muted">widgets</small>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
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
                        <small class="text-${token.change >= 0 ? 'success' : 'danger'}">
                            ${token.change >= 0 ? '+' : ''}${token.change}%
                        </small>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    // Users Tab
    renderUsers() {
        this.createUserGrowthChart();
        this.createUserSegmentChart();
        this.createRetentionChart();
    }
    
    createUserGrowthChart() {
        const ctx = document.getElementById('userGrowthChart');
        if (!ctx) return;
        
        this.destroyChart('userGrowth');
        
        const data = this.generateUserGrowthData();
        
        this.charts.userGrowth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Novos Usuários',
                    data: data.newUsers,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Usuários Ativos',
                    data: data.activeUsers,
                    borderColor: '#A0522D',
                    backgroundColor: 'rgba(160, 82, 45, 0.1)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    createUserSegmentChart() {
        const ctx = document.getElementById('userSegmentChart');
        if (!ctx) return;
        
        this.destroyChart('userSegment');
        
        this.charts.userSegment = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Novos', 'Ativos', 'Regulares', 'VIP'],
                datasets: [{
                    data: [30, 40, 25, 5],
                    backgroundColor: [
                        '#8B4513',
                        '#A0522D',
                        '#DAA520',
                        '#CD853F'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 10
                        }
                    }
                }
            }
        });
    }
    
    createRetentionChart() {
        const ctx = document.getElementById('retentionChart');
        if (!ctx) return;
        
        this.destroyChart('retention');
        
        this.charts.retention = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Dia 1', 'Dia 7', 'Dia 30', 'Dia 90'],
                datasets: [{
                    label: 'Taxa de Retenção (%)',
                    data: [85, 60, 35, 20],
                    backgroundColor: 'rgba(139, 69, 19, 0.8)',
                    borderColor: '#8B4513',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Widgets Tab
    renderWidgets() {
        this.createTemplatePerformanceChart();
    }
    
    createTemplatePerformanceChart() {
        const ctx = document.getElementById('templatePerformanceChart');
        if (!ctx) return;
        
        this.destroyChart('templatePerformance');
        
        this.charts.templatePerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Swap', 'Price Tracker', 'Portfolio', 'Staking', 'NFT', 'Custom'],
                datasets: [{
                    label: 'Widgets Criados',
                    data: [2500, 1800, 1200, 800, 600, 400],
                    backgroundColor: 'rgba(139, 69, 19, 0.8)',
                    borderColor: '#8B4513',
                    borderWidth: 1
                }, {
                    label: 'Volume (ETH)',
                    data: [15000, 8000, 12000, 5000, 2000, 1000],
                    backgroundColor: 'rgba(160, 82, 45, 0.8)',
                    borderColor: '#A0522D',
                    borderWidth: 1,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }
    
    // Financial Tab
    renderFinancial() {
        this.createFinancialChart();
    }
    
    createFinancialChart() {
        const ctx = document.getElementById('financialChart');
        if (!ctx) return;
        
        this.destroyChart('financial');
        
        const data = this.generateFinancialData();
        
        this.charts.financial = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Receita (ETH)',
                    data: data.revenue,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Lucro (ETH)',
                    data: data.profit,
                    borderColor: '#DAA520',
                    backgroundColor: 'rgba(218, 165, 32, 0.1)',
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' ETH';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Performance Tab
    renderPerformance() {
        // Performance content é estático no HTML
        console.log('Performance tab - Em desenvolvimento');
    }
    
    // Filter Methods
    async applyFilters() {
        try {
            this.showInfo('Aplicando filtros...');
            
            // Recarregar dados com novos filtros
            await this.loadInitialData();
            
            this.showSuccess('Filtros aplicados!');
            
        } catch (error) {
            console.error('Erro ao aplicar filtros:', error);
            this.showError('Erro ao aplicar filtros');
        }
    }
    
    // Export Methods
    async export(format) {
        try {
            this.showInfo(`Exportando dados em formato ${format.toUpperCase()}...`);
            
            // Simular exportação
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const data = this.generateExportData(format);
            this.downloadFile(data, `tokencafe_analytics_${Date.now()}.${format}`);
            
            this.showSuccess(`Dados exportados em ${format.toUpperCase()}!`);
            
        } catch (error) {
            console.error('Erro ao exportar:', error);
            this.showError('Erro ao exportar dados');
        }
    }
    
    scheduleReport() {
        this.showInfo('Agendamento de relatórios - Em desenvolvimento');
    }
    
    // Data Generation Methods (Mock Data)
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
    
    generateUserGrowthData() {
        const labels = [];
        const newUsers = [];
        const activeUsers = [];
        
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }));
            newUsers.push(Math.floor(Math.random() * 100) + 20);
            activeUsers.push(Math.floor(Math.random() * 200) + 50);
        }
        
        return { labels, newUsers, activeUsers };
    }
    
    generateFinancialData() {
        const labels = [];
        const revenue = [];
        const profit = [];
        
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            labels.push(date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }));
            const rev = Math.floor(Math.random() * 5000) + 1000;
            revenue.push(rev);
            profit.push(Math.floor(rev * 0.3));
        }
        
        return { labels, revenue, profit };
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
            { name: 'João Silva', address: '0x742d...2d8b', widgets: 12 },
            { name: 'Maria Santos', address: '0x8f3c...063a', widgets: 8 },
            { name: 'Carlos Oliveira', address: '0x55d3...955a', widgets: 6 },
            { name: 'Ana Costa', address: '0x1a2b...3c4d', widgets: 5 },
            { name: 'Pedro Lima', address: '0x9e8f...7d6c', widgets: 4 }
        ];
    }
    
    generatePopularTokensData() {
        return [
            { symbol: 'ETH', name: 'Ethereum', price: '2,847', change: 5.2 },
            { symbol: 'BTC', name: 'Bitcoin', price: '45,123', change: -2.1 },
            { symbol: 'USDC', name: 'USD Coin', price: '1.00', change: 0.0 },
            { symbol: 'MATIC', name: 'Polygon', price: '0.85', change: 8.7 },
            { symbol: 'BNB', name: 'Binance Coin', price: '312', change: 3.4 }
        ];
    }
    
    // Data Fetching Methods (Mock APIs)
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
            setTimeout(() => {
                resolve({});
            }, 300);
        });
    }
    
    async fetchWidgetsData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({});
            }, 400);
        });
    }
    
    async fetchFinancialData() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({});
            }, 600);
        });
    }
    
    // Export Data Generation
    generateExportData(format) {
        switch (format) {
            case 'csv':
                return this.generateCSV();
            case 'excel':
                return this.generateExcel();
            case 'pdf':
                return this.generatePDF();
            default:
                return '';
        }
    }
    
    generateCSV() {
        return `Data,Usuários,Widgets,Volume
2025-01-15,1247,523,1250 ETH
2025-01-14,1235,518,1180 ETH
2025-01-13,1223,512,1320 ETH`;
    }
    
    generateExcel() {
        // Simular dados Excel
        return 'Excel data placeholder';
    }
    
    generatePDF() {
        // Simular dados PDF
        return 'PDF data placeholder';
    }
    
    downloadFile(data, filename) {
        const blob = new Blob([data], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    
    // Utility Methods
    async refreshData(silent = false) {
        try {
            if (!silent) {
                this.showInfo('Atualizando dados...');
            }
            
            await this.loadInitialData();
            
            if (!silent) {
                this.showSuccess('Dados atualizados!');
            }
            
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            if (!silent) {
                this.showError('Erro ao atualizar dados');
            }
        }
    }
    
    destroyChart(chartName) {
        if (this.charts[chartName]) {
            this.charts[chartName].destroy();
            delete this.charts[chartName];
        }
    }
    
    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize();
            }
        });
    }
    
    cleanup() {
        // Destruir charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        
        // Limpar intervals
        this.clearAutoRefresh();
        
        console.log('Analytics cleanup completed');
    }
    
    animateNumber(element, targetValue, duration = 1000) {
        if (!element) return;
        
        const startValue = 0;
        const increment = (targetValue - startValue) / (duration / 16);
        let currentValue = startValue;
        
        const timer = setInterval(() => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                currentValue = targetValue;
                clearInterval(timer);
            }
            element.textContent = Math.floor(currentValue).toLocaleString();
        }, 16);
    }
    
    formatNumber(num, suffix = '') {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M' + suffix;
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K' + suffix;
        }
        return num.toString() + suffix;
    }
    
    // Notification Methods
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
        if (window.addNotification) {
            window.addNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// CSS adicional para analytics content
const analyticsCSS = `
.analytics-content {
    display: none;
}

.analytics-content.active {
    display: block;
}

.chart-container {
    position: relative;
}

.leaderboard-item:hover {
    background: #e9ecef !important;
}
`;

// Adicionar CSS ao documento
const analyticsStyle = document.createElement('style');
analyticsStyle.textContent = analyticsCSS;
document.head.appendChild(analyticsStyle);

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    window.analytics = new Analytics();
});