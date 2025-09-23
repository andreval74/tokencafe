/**
 * ================================================================================
 * ANALYTICS REPORTS MODULE - TOKENCAFE
 * ================================================================================
 * Módulo para visualização de analytics e relatórios detalhados
 * ================================================================================
 */

class AnalyticsReports {
    constructor() {
        this.charts = {};
        this.data = {};
        this.timeRange = '30d';
        this.isLoading = false;
        
        this.init();
    }

    /**
     * Inicialização do módulo
     */
    async init() {
        console.log('📊 Inicializando Analytics Reports...');
        
        this.setupEventListeners();
        await this.loadAnalyticsData();
        this.renderSummaryCards();
        this.initializeCharts();
        this.renderTable();
        
        console.log('✅ Analytics Reports inicializado');
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Seletor de período
        const timeRangeSelector = document.getElementById('time-range-selector');
        if (timeRangeSelector) {
            timeRangeSelector.addEventListener('change', (e) => {
                this.timeRange = e.target.value;
                this.refreshAnalytics();
            });
        }

        // Controles de gráfico
        const chartButtons = document.querySelectorAll('.chart-btn');
        chartButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const chartName = e.target.dataset.chart;
                const chartType = e.target.dataset.type;
                
                // Atualizar botões ativos
                const siblings = e.target.parentElement.querySelectorAll('.chart-btn');
                siblings.forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');
                
                // Atualizar gráfico
                this.updateChartType(chartName, chartType);
            });
        });

        // Busca na tabela
        const tableSearch = document.getElementById('table-search');
        if (tableSearch) {
            tableSearch.addEventListener('input', (e) => {
                this.filterTable(e.target.value);
            });
        }

        // Ordenação da tabela
        const tableSort = document.getElementById('table-sort');
        if (tableSort) {
            tableSort.addEventListener('change', (e) => {
                this.sortTable(e.target.value);
            });
        }
    }

    /**
     * Carregar dados de analytics
     */
    async loadAnalyticsData() {
        this.setLoadingState(true);
        
        try {
            // Simular carregamento de dados (substituir por API real)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock data - substituir por dados reais da API
            this.data = {
                summary: {
                    totalTokens: 15,
                    totalHolders: 1247,
                    totalVolume: 2847392.50,
                    totalTransactions: 8934,
                    changes: {
                        tokens: 25.5,
                        holders: 12.3,
                        volume: 8.7,
                        transactions: 15.2
                    }
                },
                volumeData: {
                    labels: this.generateDateLabels(),
                    datasets: [{
                        label: 'Volume (USD)',
                        data: this.generateVolumeData(),
                        borderColor: '#8B4513',
                        backgroundColor: 'rgba(139, 69, 19, 0.1)',
                        tension: 0.4
                    }]
                },
                holdersData: {
                    labels: this.generateDateLabels(),
                    datasets: [{
                        label: 'Holders',
                        data: this.generateHoldersData(),
                        borderColor: '#D2691E',
                        backgroundColor: 'rgba(210, 105, 30, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                typeDistribution: {
                    labels: ['ERC-20', 'ERC-721', 'ERC-1155'],
                    datasets: [{
                        data: [65, 30, 5],
                        backgroundColor: ['#8B4513', '#D2691E', '#F4A460']
                    }]
                },
                topTokens: {
                    labels: ['CafeToken', 'MyNFT', 'TestToken', 'GameToken', 'ArtToken'],
                    datasets: [{
                        label: 'Volume',
                        data: [850000, 420000, 280000, 180000, 120000],
                        backgroundColor: '#8B4513'
                    }]
                },
                tokenDetails: [
                    {
                        name: 'CafeToken',
                        symbol: 'CAFE',
                        type: 'ERC-20',
                        holders: 450,
                        volume: 850000,
                        transactions: 2340,
                        change: 12.5,
                        created: '2024-01-15'
                    },
                    {
                        name: 'MyNFT Collection',
                        symbol: 'MYNFT',
                        type: 'ERC-721',
                        holders: 180,
                        volume: 420000,
                        transactions: 890,
                        change: -5.2,
                        created: '2024-01-20'
                    },
                    {
                        name: 'TestToken',
                        symbol: 'TEST',
                        type: 'ERC-20',
                        holders: 120,
                        volume: 280000,
                        transactions: 560,
                        change: 8.7,
                        created: '2024-01-10'
                    }
                ]
            };
            
        } catch (error) {
            console.error('❌ Erro ao carregar analytics:', error);
            this.showError('Erro ao carregar dados de analytics');
        } finally {
            this.setLoadingState(false);
        }
    }

    /**
     * Renderizar cards de resumo
     */
    renderSummaryCards() {
        const { summary } = this.data;
        
        document.getElementById('total-tokens').textContent = summary.totalTokens;
        document.getElementById('total-holders').textContent = this.formatNumber(summary.totalHolders);
        document.getElementById('total-volume').textContent = this.formatCurrency(summary.totalVolume);
        document.getElementById('total-transactions').textContent = this.formatNumber(summary.totalTransactions);
        
        // Atualizar mudanças percentuais
        this.updateChangeIndicator('tokens-change', summary.changes.tokens);
        this.updateChangeIndicator('holders-change', summary.changes.holders);
        this.updateChangeIndicator('volume-change', summary.changes.volume);
        this.updateChangeIndicator('transactions-change', summary.changes.transactions);
    }

    /**
     * Atualizar indicador de mudança
     */
    updateChangeIndicator(elementId, change) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const isPositive = change >= 0;
        element.textContent = `${isPositive ? '+' : ''}${change.toFixed(1)}%`;
        element.className = `summary-change ${isPositive ? 'positive' : 'negative'}`;
    }

    /**
     * Inicializar gráficos
     */
    initializeCharts() {
        this.createVolumeChart();
        this.createHoldersChart();
        this.createTypeDistributionChart();
        this.createTopTokensChart();
    }

    /**
     * Criar gráfico de volume
     */
    createVolumeChart() {
        const ctx = document.getElementById('volume-chart');
        if (!ctx) return;

        this.charts.volume = new Chart(ctx, {
            type: 'line',
            data: this.data.volumeData,
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
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    /**
     * Criar gráfico de holders
     */
    createHoldersChart() {
        const ctx = document.getElementById('holders-chart');
        if (!ctx) return;

        this.charts.holders = new Chart(ctx, {
            type: 'line',
            data: this.data.holdersData,
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
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Criar gráfico de distribuição por tipo
     */
    createTypeDistributionChart() {
        const ctx = document.getElementById('type-distribution-chart');
        if (!ctx) return;

        this.charts.typeDistribution = new Chart(ctx, {
            type: 'doughnut',
            data: this.data.typeDistribution,
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
     * Criar gráfico de top tokens
     */
    createTopTokensChart() {
        const ctx = document.getElementById('top-tokens-chart');
        if (!ctx) return;

        this.charts.topTokens = new Chart(ctx, {
            type: 'bar',
            data: this.data.topTokens,
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
                        ticks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    /**
     * Atualizar tipo de gráfico
     */
    updateChartType(chartName, newType) {
        const chart = this.charts[chartName];
        if (!chart) return;

        chart.config.type = newType;
        chart.update();
    }

    /**
     * Renderizar tabela
     */
    renderTable() {
        const tbody = document.getElementById('analytics-table-body');
        if (!tbody) return;

        tbody.innerHTML = this.data.tokenDetails.map(token => `
            <tr>
                <td>
                    <div class="token-info">
                        <strong>${token.name}</strong>
                        <small>${token.symbol}</small>
                    </div>
                </td>
                <td><span class="token-type">${token.type}</span></td>
                <td>${this.formatNumber(token.holders)}</td>
                <td>${this.formatCurrency(token.volume)}</td>
                <td>${this.formatNumber(token.transactions)}</td>
                <td>
                    <span class="change-indicator ${token.change >= 0 ? 'positive' : 'negative'}">
                        ${token.change >= 0 ? '+' : ''}${token.change.toFixed(1)}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="analyticsReports.viewAdvancedAnalytics('${token.symbol}')">
                        <i class="fas fa-chart-line"></i> Detalhes
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Filtrar tabela
     */
    filterTable(searchTerm) {
        const rows = document.querySelectorAll('#analytics-table-body tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }

    /**
     * Ordenar tabela
     */
    sortTable(sortBy) {
        // Implementar ordenação da tabela
        console.log('Ordenando por:', sortBy);
    }

    /**
     * Ver analytics avançado
     */
    viewAdvancedAnalytics(tokenSymbol) {
        const modal = document.getElementById('advanced-analytics-modal');
        const content = document.getElementById('advanced-analytics-content');
        
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="advanced-analytics">
                <h4>Analytics Detalhado - ${tokenSymbol}</h4>
                <p>Funcionalidade em desenvolvimento...</p>
                <div class="placeholder-chart">
                    <i class="fas fa-chart-area fa-3x"></i>
                    <p>Gráficos avançados serão implementados aqui</p>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    /**
     * Exportar relatório
     */
    async exportReport() {
        try {
            // Simular exportação
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.showSuccess('Relatório exportado com sucesso!');
        } catch (error) {
            console.error('❌ Erro ao exportar:', error);
            this.showError('Erro ao exportar relatório');
        }
    }

    /**
     * Atualizar analytics
     */
    async refreshAnalytics() {
        await this.loadAnalyticsData();
        this.renderSummaryCards();
        
        // Atualizar gráficos
        Object.values(this.charts).forEach(chart => {
            chart.update();
        });
        
        this.renderTable();
        this.showSuccess('Analytics atualizados!');
    }

    /**
     * Gerar labels de data
     */
    generateDateLabels() {
        const days = this.timeRange === '7d' ? 7 : this.timeRange === '30d' ? 30 : 90;
        const labels = [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' }));
        }
        
        return labels;
    }

    /**
     * Gerar dados de volume
     */
    generateVolumeData() {
        const days = this.timeRange === '7d' ? 7 : this.timeRange === '30d' ? 30 : 90;
        return Array.from({ length: days }, () => Math.floor(Math.random() * 100000) + 10000);
    }

    /**
     * Gerar dados de holders
     */
    generateHoldersData() {
        const days = this.timeRange === '7d' ? 7 : this.timeRange === '30d' ? 30 : 90;
        let base = 1000;
        return Array.from({ length: days }, () => {
            base += Math.floor(Math.random() * 20) - 5;
            return Math.max(base, 0);
        });
    }

    /**
     * Definir estado de loading
     */
    setLoadingState(loading) {
        this.isLoading = loading;
        const loadingEl = document.getElementById('analytics-loading');
        
        if (loadingEl) {
            loadingEl.style.display = loading ? 'block' : 'none';
        }
    }

    /**
     * Fechar modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * Utilitários
     */
    formatNumber(num) {
        return new Intl.NumberFormat('pt-BR').format(num);
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    showSuccess(message) {
        console.log('✅', message);
    }

    showError(message) {
        console.error('❌', message);
    }
}

// Funções globais para compatibilidade
window.refreshAnalytics = () => {
    if (window.analyticsReports) {
        window.analyticsReports.refreshAnalytics();
    }
};

window.exportReport = () => {
    if (window.analyticsReports) {
        window.analyticsReports.exportReport();
    }
};

window.closeModal = (modalId) => {
    if (window.analyticsReports) {
        window.analyticsReports.closeModal(modalId);
    }
};

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.analyticsReports = new AnalyticsReports();
});

console.log('✅ Analytics Reports Module carregado');