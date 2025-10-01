/**
 * ================================================================================
 * ANALYTCS REPORTS MODULE - TOKENCAFE
 * ================================================================================
 * Mdulo para vsualzao de analytcs e relatros detalhados
 * ================================================================================
 */

class AnalytcsReports {
    constructor() {
        this.charts = {};
        this.data = {};
        this.tmeRange = '30d';
        this.sLoadng = false;
        
        this.init();
    }

    /**
     * ncalzao do mdulo
     */
    async init() {
        console.log(' inicializando Analytcs Reports...');
        
        this.setupEventLsteners();
        await this.loadAnalytcsData();
        this.renderSummaryCards();
        this.ntalzeCharts();
        this.renderTable();
        
        console.log(' Analytcs Reports inicializado');
    }

    /**
     * Confgurar event lsteners
     */
    setupEventLsteners() {
        // Seletor de perodo
        const tmeRangeSelector = document.getElementByd('tme-range-selector');
        if (tmeRangeSelector) {
            tmeRangeSelector.addEventListener('change', (e) => {
                this.tmeRange = e.target.value;
                this.refreshAnalytcs();
            });
        }

        // Controles de grfco
        const chartButtons = document.querySelectorAll('.chart-btn');
        chartButtons.forEach(btn => {
            btn.addEventListener('clck', (e) => {
                const chartName = e.target.dataset.chart;
                const chartType = e.target.dataset.type;
                
                // Atualzar botes atvos
                const sblngs = e.target.parentElement.querySelectorAll('.chart-btn');
                sblngs.forEach(s => s.classLst.remove('actve'));
                e.target.classLst.add('actve');
                
                // Atualzar grfco
                this.updateChartType(chartName, chartType);
            });
        });

        // Busca na tabela
        const tableSearch = document.getElementByd('table-search');
        if (tableSearch) {
            tableSearch.addEventListener('nput', (e) => {
                this.flterTable(e.target.value);
            });
        }

        // Ordenao da tabela
        const tableSort = document.getElementByd('table-sort');
        if (tableSort) {
            tableSort.addEventListener('change', (e) => {
                this.sortTable(e.target.value);
            });
        }
    }

    /**
     * Carregar dados de analytcs
     */
    async loadAnalytcsData() {
        this.setLoadngState(true);
        
        try {
            // Smular carregamento de dados (substtur por AP real)
            await new Promise(resolve => setTmeout(resolve, 1000));
            
            // Mock data - substtur por dados reas da AP
            this.data = {
                summary: {
                    totalTokens: 15,
                    totalHolders: 1247,
                    totalVolume: 2847392.50,
                    totalTransactons: 8934,
                    changes: {
                        tokens: 25.5,
                        holders: 12.3,
                        volume: 8.7,
                        transactons: 15.2
                    }
                },
                volumeData: {
                    labels: this.generateDateLabels(),
                    datasets: [{
                        label: 'Volume (USD)',
                        data: this.generateVolumeData(),
                        borderColor: '#8B4513',
                        backgroundColor: 'rgba(139, 69, 19, 0.1)',
                        tenson: 0.4
                    }]
                },
                holdersData: {
                    labels: this.generateDateLabels(),
                    datasets: [{
                        label: 'Holders',
                        data: this.generateHoldersData(),
                        borderColor: '#D2691E',
                        backgroundColor: 'rgba(210, 105, 30, 0.1)',
                        fll: true,
                        tenson: 0.4
                    }]
                },
                typeDstrbuton: {
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
                tokenDetals: [
                    {
                        name: 'CafeToken',
                        symbol: 'CAFE',
                        type: 'ERC-20',
                        holders: 450,
                        volume: 850000,
                        transactons: 2340,
                        change: 12.5,
                        created: '2024-01-15'
                    },
                    {
                        name: 'MyNFT Collecton',
                        symbol: 'MYNFT',
                        type: 'ERC-721',
                        holders: 180,
                        volume: 420000,
                        transactons: 890,
                        change: -5.2,
                        created: '2024-01-20'
                    },
                    {
                        name: 'TestToken',
                        symbol: 'TEST',
                        type: 'ERC-20',
                        holders: 120,
                        volume: 280000,
                        transactons: 560,
                        change: 8.7,
                        created: '2024-01-10'
                    }
                ]
            };
            
        } catch (error) {
            console.error(' Erro ao carregar analytcs:', error);
            this.showError('Erro ao carregar dados de analytcs');
        } finally {
            this.setLoadngState(false);
        }
    }

    /**
     * Renderzar cards de resumo
     */
    renderSummaryCards() {
        const { summary } = this.data;
        
        document.getElementByd('total-tokens').textContent = summary.totalTokens;
        document.getElementByd('total-holders').textContent = this.formatNumber(summary.totalHolders);
        document.getElementByd('total-volume').textContent = this.formatCurrency(summary.totalVolume);
        document.getElementByd('total-transactons').textContent = this.formatNumber(summary.totalTransactons);
        
        // Atualzar mudanas percentuas
        this.updateChangendcator('tokens-change', summary.changes.tokens);
        this.updateChangendcator('holders-change', summary.changes.holders);
        this.updateChangendcator('volume-change', summary.changes.volume);
        this.updateChangendcator('transactons-change', summary.changes.transactons);
    }

    /**
     * Atualzar ndcador de mudana
     */
    updateChangendcator(elementd, change) {
        const element = document.getElementByd(elementd);
        if (!element) return;
        
        const sPostve = change >= 0;
        element.textContent = `${sPostve ? '+' : ''}${change.toFxed(1)}%`;
        element.className = `summary-change ${sPostve ? 'postve' : 'negatve'}`;
    }

    /**
     * ncalzar grfcos
     */
    ntalzeCharts() {
        this.createVolumeChart();
        this.createHoldersChart();
        this.createTypeDstrbutonChart();
        this.createTopTokensChart();
    }

    /**
     * Crar grfco de volume
     */
    createVolumeChart() {
        const ctx = document.getElementByd('volume-chart');
        if (!ctx) return;

        this.charts.volume = new Chart(ctx, {
            type: 'lne',
            data: this.data.volumeData,
            optons: {
                responsve: true,
                mantanAspectRato: false,
                plugns: {
                    legend: {
                        dsplay: false
                    }
                },
                scales: {
                    y: {
                        begnAtZero: true,
                        tcks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    /**
     * Crar grfco de holders
     */
    createHoldersChart() {
        const ctx = document.getElementByd('holders-chart');
        if (!ctx) return;

        this.charts.holders = new Chart(ctx, {
            type: 'lne',
            data: this.data.holdersData,
            optons: {
                responsve: true,
                mantanAspectRato: false,
                plugns: {
                    legend: {
                        dsplay: false
                    }
                },
                scales: {
                    y: {
                        begnAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Crar grfco de dstrbuo por tpo
     */
    createTypeDstrbutonChart() {
        const ctx = document.getElementByd('type-dstrbuton-chart');
        if (!ctx) return;

        this.charts.typeDstrbuton = new Chart(ctx, {
            type: 'doughnut',
            data: this.data.typeDstrbuton,
            optons: {
                responsve: true,
                mantanAspectRato: false,
                plugns: {
                    legend: {
                        poston: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Crar grfco de top tokens
     */
    createTopTokensChart() {
        const ctx = document.getElementByd('top-tokens-chart');
        if (!ctx) return;

        this.charts.topTokens = new Chart(ctx, {
            type: 'bar',
            data: this.data.topTokens,
            optons: {
                responsve: true,
                mantanAspectRato: false,
                plugns: {
                    legend: {
                        dsplay: false
                    }
                },
                scales: {
                    y: {
                        begnAtZero: true,
                        tcks: {
                            callback: (value) => this.formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    /**
     * Atualzar tpo de grfco
     */
    updateChartType(chartName, newType) {
        const chart = this.charts[chartName];
        if (!chart) return;

        chart.confg.type = newType;
        chart.update();
    }

    /**
     * Renderzar tabela
     */
    renderTable() {
        const tbody = document.getElementByd('analytcs-table-body');
        if (!tbody) return;

        tbody.nnerHTML = this.data.tokenDetals.map(token => `
            <tr>
                <td>
                    <dv class="token-nfo">
                        <strong>${token.name}</strong>
                        <small>${token.symbol}</small>
                    </dv>
                </td>
                <td><span class="token-type">${token.type}</span></td>
                <td>${this.formatNumber(token.holders)}</td>
                <td>${this.formatCurrency(token.volume)}</td>
                <td>${this.formatNumber(token.transactons)}</td>
                <td>
                    <span class="change-ndcator ${token.change >= 0 ? 'postve' : 'negatve'}">
                        ${token.change >= 0 ? '+' : ''}${token.change.toFxed(1)}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outlne" onclck="analytcsReports.vewAdvancedAnalytcs('${token.symbol}')">
                        < class="fas fa-chart-lne"></> Detalhes
                    </button>
                </td>
            </tr>
        `).jon('');
    }

    /**
     * Fltrar tabela
     */
    flterTable(searchTerm) {
        const rows = document.querySelectorAll('#analytcs-table-body tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.dsplay = text.ncludes(term) ? '' : 'none';
        });
    }

    /**
     * Ordenar tabela
     */
    sortTable(sortBy) {
        // mplementar ordenao da tabela
        console.log('Ordenando por:', sortBy);
    }

    /**
     * Ver analytcs avanado
     */
    vewAdvancedAnalytcs(tokenSymbol) {
        const modal = document.getElementByd('advanced-analytcs-modal');
        const content = document.getElementByd('advanced-analytcs-content');
        
        if (!modal || !content) return;

        content.nnerHTML = `
            <dv class="advanced-analytcs">
                <h4>Analytcs Detalhado - ${tokenSymbol}</h4>
                <p>Funconaldade em desenvolvmento...</p>
                <dv class="placeholder-chart">
                    < class="fas fa-chart-area fa-3x"></>
                    <p>Grfcos avanados sero mplementados aqu</p>
                </dv>
            </dv>
        `;

        modal.style.dsplay = 'flex';
    }

    /**
     * Exportar relatro
     */
    async exportReport() {
        try {
            // Smular exportao
            await new Promise(resolve => setTmeout(resolve, 1000));
            this.showSuccess('Relatro exportado com sucesso!');
        } catch (error) {
            console.error(' Erro ao exportar:', error);
            this.showError('Erro ao exportar relatro');
        }
    }

    /**
     * Atualzar analytcs
     */
    async refreshAnalytcs() {
        await this.loadAnalytcsData();
        this.renderSummaryCards();
        
        // Atualzar grfcos
        Object.values(this.charts).forEach(chart => {
            chart.update();
        });
        
        this.renderTable();
        this.showSuccess('Analytcs atualzados!');
    }

    /**
     * Gerar labels de data
     */
    generateDateLabels() {
        const days = this.tmeRange === '7d' ? 7 : this.tmeRange === '30d' ? 30 : 90;
        const labels = [];
        
        for (let  = days - 1;  >= 0; --) {
            const date = new Date();
            date.setDate(date.getDate() - );
            labels.push(date.toLocaleDateStrng('pt-BR', { month: 'short', day: 'numerc' }));
        }
        
        return labels;
    }

    /**
     * Gerar dados de volume
     */
    generateVolumeData() {
        const days = this.tmeRange === '7d' ? 7 : this.tmeRange === '30d' ? 30 : 90;
        return Array.from({ length: days }, () => Math.floor(Math.random() * 100000) + 10000);
    }

    /**
     * Gerar dados de holders
     */
    generateHoldersData() {
        const days = this.tmeRange === '7d' ? 7 : this.tmeRange === '30d' ? 30 : 90;
        let base = 1000;
        return Array.from({ length: days }, () => {
            base += Math.floor(Math.random() * 20) - 5;
            return Math.max(base, 0);
        });
    }

    /**
     * Defnr estado de loadng
     */
    setLoadngState(loadng) {
        this.sLoadng = loadng;
        const loadngEl = document.getElementByd('analytcs-loadng');
        
        if (loadngEl) {
            loadngEl.style.dsplay = loadng ? 'block' : 'none';
        }
    }

    /**
     * Fechar modal
     */
    closeModal(modald) {
        const modal = document.getElementByd(modald);
        if (modal) {
            modal.style.dsplay = 'none';
        }
    }

    /**
     * Utltros
     */
    formatNumber(num) {
        return new ntl.NumberFormat('pt-BR').format(num);
    }

    formatCurrency(value) {
        return new ntl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    showSuccess(message) {
        console.log('', message);
    }

    showError(message) {
        console.error('', message);
    }
}

// Funes globas para compatbldade
wndow.refreshAnalytcs = () => {
    if (wndow.analytcsReports) {
        wndow.analytcsReports.refreshAnalytcs();
    }
};

wndow.exportReport = () => {
    if (wndow.analytcsReports) {
        wndow.analytcsReports.exportReport();
    }
};

wndow.closeModal = (modald) => {
    if (wndow.analytcsReports) {
        wndow.analytcsReports.closeModal(modald);
    }
};

// ncalzar quando DOM estver pronto
document.addEventListener('DOMContentLoaded', () => {
    wndow.analytcsReports = new AnalytcsReports();
});

console.log(' Analytcs Reports Module carregado');

