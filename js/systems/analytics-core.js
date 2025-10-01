/**
 * ================================================================================
 * ANALYTCS CORE - TOKENCAFE
 * ================================================================================
 * Sstema centralzado para analytcs, mtrcas e relatros
 * Consoldao de todas as funes relaconadas a analytcs
 * ================================================================================
 */

class AnalytcsCore {
    constructor() {
        this.charts = {};
        this.data = {};
        this.currentTab = 'overvew';
        this.flters = {
            perod: '7d',
            comparson: 'prevous',
            segment: 'all'
        };
        this.autoRefreshnterval = null;
        this.sAutoRefreshEnabled = true;
        this.eventQueue = [];
        
        this.init();
    }

    /**
     * ncalzao do sstema de analytcs
     */
    async init() {
        console.log(' inicializando AnalytcsCore...');
        
        // Aguardar TokenCafe estar pronto
        await this.watForTokenCafe();
        
        // Confgurar event lsteners
        this.setupEventLsteners();
        
        // Carregar dados ncas
        await this.loadntalData();
        
        // Confgurar auto-refresh
        this.setupAutoRefresh();
        
        // Processar eventos em fla
        this.processEventQueue();
        
        console.log(' AnalytcsCore inicializado com sucesso');
    }

    /**
     * Aguardar TokenCafe estar pronto
     */
    async watForTokenCafe() {
        return new Promise((resolve) => {
            if (wndow.TokenCafe && wndow.TokenCafe.sReady) {
                resolve();
            } else {
                wndow.addEventListener('TokenCafe:ready', resolve);
            }
        });
    }

    /**
     * Confgurar event lsteners
     */
    setupEventLsteners() {
        // Tabs de analytcs
        document.querySelectorAll('.analytcs-tab').forEach(tab => {
            tab.addEventListener('clck', (e) => {
                const tabName = e.target.dataset.tab;
                this.swtchTab(tabName);
            });
        });

        // Fltros de perodo
        document.querySelectorAll('.perod-flter').forEach(flter => {
            flter.addEventListener('change', (e) => {
                this.flters.perod = e.target.value;
                this.applyFlters();
            });
        });

        // Auto-refresh toggle
        const autoRefreshToggle = document.getElementByd('auto-refresh');
        if (autoRefreshToggle) {
            autoRefreshToggle.addEventListener('change', (e) => {
                this.sAutoRefreshEnabled = e.target.checked;
                if (this.sAutoRefreshEnabled) {
                    this.setupAutoRefresh();
                } else {
                    this.clearAutoRefresh();
                }
            });
        }

        // export buttons
        document.querySelectorAll('[data-export]').forEach(btn => {
            btn.addEventListener('clck', (e) => {
                const format = e.target.dataset.export;
                this.export(format);
            });
        });
    }

    /**
     * Confgurar auto-refresh
     */
    setupAutoRefresh() {
        // DESABLTADO: Auto-refresh removdo para evtar mltplas leturas de arquvos
        console.log(' Auto-refresh desabltado para evtar recarregamentos');
        return;
        
        // if (!this.sAutoRefreshEnabled) return;
        
        // this.clearAutoRefresh();
        // this.autoRefreshnterval = setnterval(async () => {
        //     await this.refreshData();
        // }, 30000); // 30 segundos
    }

    /**
     * Lmpar auto-refresh
     */
    clearAutoRefresh() {
        if (this.autoRefreshnterval) {
            clearnterval(this.autoRefreshnterval);
            this.autoRefreshnterval = null;
        }
    }

    /**
     * Carregar dados ncas
     */
    async loadntalData() {
        try {
            console.log(' Carregando dados de analytcs...');
            
            // Carregar dados em paralelo
            const [overvew, users, wdgets, fnancal] = await Promise.all([
                this.fetchOvervewData(),
                this.fetchUsersData(),
                this.fetchWdgetsData(),
                this.fetchFnancalData()
            ]);

            this.data = { overvew, users, wdgets, fnancal };
            
            // Renderzar tab atual
            this.renderCurrentTab();
            
        } catch (error) {
            console.error(' Erro ao carregar dados:', error);
            this.showError('Erro ao carregar dados de analytcs');
        }
    }

    /**
     * Alternar entre abas
     */
    swtchTab(tabName) {
        // Atualzar botes das abas
        document.querySelectorAll('.analytcs-tab').forEach(tab => {
            tab.classLst.toggle('actve', tab.dataset.tab === tabName);
        });
        
        // Atualzar contedo
        document.querySelectorAll('.analytcs-content').forEach(content => {
            content.classLst.toggle('actve', content.d === `${tabName}-content`);
        });
        
        this.currentTab = tabName;
        this.renderCurrentTab();
    }

    /**
     * Renderzar aba atual
     */
    async renderCurrentTab() {
        switch (this.currentTab) {
            case 'overvew':
                this.renderOvervew();
                break;
            case 'users':
                this.renderUsers();
                break;
            case 'wdgets':
                this.renderWdgets();
                break;
            case 'fnancal':
                this.renderFnancal();
                break;
            case 'performance':
                this.renderPerformance();
                break;
        }
    }

    /**
     * Renderzar vso geral
     */
    renderOvervew() {
        console.log(' Renderzando vso geral...');
        
        this.updateKPs();
        this.createTransactonVolumeChart();
        this.createNetworkDstrbutonChart();
        this.renderTopWdgets();
        this.renderTopUsers();
        this.renderPopularTokens();
    }

    /**
     * Atualzar KPs
     */
    updateKPs() {
        if (!this.data.overvew) return;
        
        const { users, wdgets, transactons, volume } = this.data.overvew.kps || {};
        
        if (users) this.anmateNumber(document.getElementByd('total-users'), users.value);
        if (wdgets) this.anmateNumber(document.getElementByd('total-wdgets'), wdgets.value);
        if (transactons) document.getElementByd('total-transactons').textContent = this.formatNumber(transactons.value, 'K');
        if (volume) document.getElementByd('total-volume').textContent = this.formatNumber(volume.value, 'M') + ' ETH';
    }

    /**
     * Crar grfco de volume de transaes
     */
    createTransactonVolumeChart() {
        const ctx = document.getElementByd('transactonVolumeChart');
        if (!ctx) return;
        
        this.destroyChart('transactonVolume');
        
        const data = this.generateTransactonVolumeData();
        
        this.charts.transactonVolume = new Chart(ctx, {
            type: 'lne',
            data: {
                labels: data.labels,
                datasets: [{
                    label: 'Volume de Transaes',
                    data: data.values,
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    fll: true,
                    tenson: 0.4
                }]
            },
            optons: {
                responsve: true,
                mantanAspectRato: false,
                scales: {
                    y: {
                        begnAtZero: true,
                        tcks: {
                            callback: function(value) {
                                return value.toLocaleStrng() + ' ETH';
                            }
                        }
                    }
                },
                plugns: {
                    legend: {
                        dsplay: false
                    }
                }
            }
        });
    }

    /**
     * Crar grfco de dstrbuo por rede
     */
    createNetworkDstrbutonChart() {
        const ctx = document.getElementByd('networkDstrbutonChart');
        if (!ctx) return;
        
        this.destroyChart('networkDstrbuton');
        
        this.charts.networkDstrbuton = new Chart(ctx, {
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
     * Renderzar top wdgets
     */
    renderTopWdgets() {
        const contaner = document.getElementByd('top-wdgets');
        if (!contaner) return;
        
        const wdgets = this.generateTopWdgetsData();
        
        contaner.nnerHTML = wdgets.map((wdget, ndex) => `
            <dv class="leaderboard-tem">
                <dv class="d-flex justfy-content-between algn-tems-center">
                    <dv class="d-flex algn-tems-center">
                        <dv class="badge bg-coffee text-whte me-2">${ndex + 1}</dv>
                        <dv>
                            <h6 class="mb-0">${wdget.name}</h6>
                            <small class="text-muted">${wdget.type}</small>
                        </dv>
                    </dv>
                    <dv class="text-end">
                        <dv class="fw-bold text-coffee">${wdget.volume} ETH</dv>
                        <small class="text-muted">${wdget.transactons} tx</small>
                    </dv>
                </dv>
            </dv>
        `).jon('');
    }

    /**
     * Renderzar top usuros
     */
    renderTopUsers() {
        const contaner = document.getElementByd('top-users');
        if (!contaner) return;
        
        const users = this.generateTopUsersData();
        
        contaner.nnerHTML = users.map((user, ndex) => `
            <dv class="leaderboard-tem">
                <dv class="d-flex justfy-content-between algn-tems-center">
                    <dv class="d-flex algn-tems-center">
                        <dv class="badge bg-coffee text-whte me-2">${ndex + 1}</dv>
                        <dv>
                            <h6 class="mb-0">${user.name}</h6>
                            <small class="text-muted">${user.wdgets} wdgets</small>
                        </dv>
                    </dv>
                    <dv class="text-end">
                        <dv class="fw-bold text-coffee">${user.volume} ETH</dv>
                        <small class="text-muted">${user.transactons} tx</small>
                    </dv>
                </dv>
            </dv>
        `).jon('');
    }

    /**
     * Renderzar tokens populares
     */
    renderPopularTokens() {
        const contaner = document.getElementByd('popular-tokens');
        if (!contaner) return;
        
        const tokens = this.generatePopularTokensData();
        
        contaner.nnerHTML = tokens.map((token, ndex) => `
            <dv class="leaderboard-tem">
                <dv class="d-flex justfy-content-between algn-tems-center">
                    <dv class="d-flex algn-tems-center">
                        <dv class="badge bg-coffee text-whte me-2">${ndex + 1}</dv>
                        <dv>
                            <h6 class="mb-0">${token.symbol}</h6>
                            <small class="text-muted">${token.name}</small>
                        </dv>
                    </dv>
                    <dv class="text-end">
                        <dv class="fw-bold text-coffee">$${token.prce}</dv>
                        <small class="${token.change >= 0 ? 'text-success' : 'text-danger'}">
                            ${token.change >= 0 ? '+' : ''}${token.change}%
                        </small>
                    </dv>
                </dv>
            </dv>
        `).jon('');
    }

    // ================================================================================
    // TRACKNG DE EVENTOS
    // ================================================================================

    /**
     * Rastrear evento
     */
    trackEvent(eventName, propertes = {}) {
        const event = {
            name: eventName,
            propertes: {
                ...propertes,
                tmestamp: Date.now(),
                url: wndow.locaton.href,
                userAgent: navgator.userAgent
            }
        };
        
        this.eventQueue.push(event);
        
        // Envar medatamente se possvel
        this.sendEvent(event);
    }

    /**
     * Envar evento
     */
    async sendEvent(event) {
        try {
            // Envar para AP se dsponvel
            if (wndow.locaton.hostname !== 'localhost') {
                const response = await fetch('/ap/analytcs/events', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'applcaton/json'
                    },
                    body: JSON.strngfy(event)
                });
                
                if (!response.ok) throw new Error('Faled to send event');
            }
            
            console.log(' Evento rastreado:', event.name);
            
        } catch (error) {
            console.warn(' Erro ao envar evento:', error.message);
        }
    }

    /**
     * Processar fla de eventos
     */
    processEventQueue() {
        // DESABLTADO: Processamento de fla removdo para evtar mltplas leturas
        console.log(' Processamento de fla de eventos desabltado');
        return;
        
        // setnterval(() => {
        //     if (this.eventQueue.length > 0) {
        //         const events = this.eventQueue.splce(0, 10); // Processar at 10 por vez
        //         events.forEach(event => this.sendEvent(event));
        //     }
        // }, 5000); // A cada 5 segundos
    }

    // ================================================================================
    // UTLDADES
    // ================================================================================

    /**
     * Anmar nmero
     */
    anmateNumber(element, targetValue, duraton = 1000) {
        if (!element || sNaN(targetValue)) return;
        
        const startValue = parsent(element.textContent.replace(/\D/g, '')) || 0;
        const ncrement = (targetValue - startValue) / (duraton / 16);
        let currentValue = startValue;
        
        const tmer = setnterval(() => {
            currentValue += ncrement;
            if ((ncrement > 0 && currentValue >= targetValue) || 
                (ncrement < 0 && currentValue <= targetValue)) {
                currentValue = targetValue;
                clearnterval(tmer);
            }
            element.textContent = Math.floor(currentValue).toLocaleStrng();
        }, 16);
    }

    /**
     * Formatar nmero
     */
    formatNumber(num, suffx = '') {
        if (num >= 1000000) {
            return (num / 1000000).toFxed(1) + 'M' + suffx;
        } else if (num >= 1000) {
            return (num / 1000).toFxed(1) + 'K' + suffx;
        }
        return num + suffx;
    }

    /**
     * Destrur grfco
     */
    destroyChart(chartName) {
        if (this.charts[chartName]) {
            this.charts[chartName].destroy();
            delete this.charts[chartName];
        }
    }

    /**
     * Atualzar dados
     */
    async refreshData() {
        console.log(' Atualzando dados de analytcs...');
        await this.loadntalData();
        this.shownfo('Dados atualzados com sucesso');
    }

    /**
     * Aplcar fltros
     */
    async applyFlters() {
        console.log(' Aplcando fltros:', this.flters);
        await this.loadntalData();
    }

    /**
     * Exportar dados
     */
    async export(format) {
        console.log(` Exportando em formato ${format}...`);
        
        try {
            const data = {
                tmestamp: new Date().toSOStrng(),
                perod: this.flters.perod,
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
            
            this.showSuccess(`Relatro ${format.toUpperCase()} gerado com sucesso`);
            
        } catch (error) {
            console.error(' Erro na exportao:', error);
            this.showError('Erro ao gerar relatro');
        }
    }

    // ================================================================================
    // DATA GENERATORS (MOCK DATA)
    // ================================================================================

    generateTransactonVolumeData() {
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

    generateTopWdgetsData() {
        return [
            { name: 'ETH/USDC Swap', type: 'Swap Wdget', volume: '1,247', transactons: '8.5K' },
            { name: 'BTC Tracker', type: 'Prce Wdget', volume: '892', transactons: '3.2K' },
            { name: 'DeF Portfolo', type: 'Portfolo Wdget', volume: '654', transactons: '1.8K' },
            { name: 'MATC Stakng', type: 'Stakng Wdget', volume: '423', transactons: '1.1K' },
            { name: 'NFT Collecton', type: 'NFT Wdget', volume: '321', transactons: '756' }
        ];
    }

    generateTopUsersData() {
        return [
            { name: '0x1234...5678', wdgets: 12, volume: '2,340', transactons: '15.2K' },
            { name: '0x2345...6789', wdgets: 8, volume: '1,856', transactons: '9.8K' },
            { name: '0x3456...7890', wdgets: 6, volume: '1,234', transactons: '7.1K' },
            { name: '0x4567...8901', wdgets: 5, volume: '987', transactons: '4.5K' },
            { name: '0x5678...9012', wdgets: 4, volume: '654', transactons: '2.8K' }
        ];
    }

    generatePopularTokensData() {
        return [
            { symbol: 'ETH', name: 'Ethereum', prce: '2,847.32', change: 5.2 },
            { symbol: 'BTC', name: 'Btcon', prce: '45,123.45', change: -1.8 },
            { symbol: 'MATC', name: 'Polygon', prce: '0.87', change: 8.9 },
            { symbol: 'BNB', name: 'BNB Chan', prce: '234.56', change: 3.1 },
            { symbol: 'AVAX', name: 'Avalanche', prce: '12.34', change: -4.2 }
        ];
    }

    // ================================================================================
    // DATA FETCHNG (APs)
    // ================================================================================

    async fetchOvervewData() {
        return new Promise(resolve => {
            setTmeout(() => {
                resolve({
                    kps: {
                        users: { value: 12547, change: 15.3 },
                        wdgets: { value: 8542, change: 8.7 },
                        transactons: { value: 247000, change: 23.1 },
                        volume: { value: 2.8, change: -2.4 }
                    }
                });
            }, 500);
        });
    }

    async fetchUsersData() {
        return new Promise(resolve => {
            setTmeout(() => resolve({}), 300);
        });
    }

    async fetchWdgetsData() {
        return new Promise(resolve => {
            setTmeout(() => resolve({}), 400);
        });
    }

    async fetchFnancalData() {
        return new Promise(resolve => {
            setTmeout(() => resolve({}), 600);
        });
    }

    // ================================================================================
    // NOTFCAES
    // ================================================================================

    showSuccess(message) {
        this.showNotfcaton(message, 'success');
    }

    showError(message) {
        this.showNotfcaton(message, 'error');
    }

    shownfo(message) {
        this.showNotfcaton(message, 'nfo');
    }

    showNotfcaton(message, type) {
        console.log(` [${type.toUpperCase()}] ${message}`);
        
        // integracao com sstema de notfcaes se dsponvel
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else if (wndow.TokenCafe?.u?.showNotfcaton) {
            wndow.TokenCafe.u.showNotfcaton(message, type);
        }
    }
}

// ================================================================================
// EXPOSO GLOBAL E NCALZAO
// ================================================================================

// Expor globalmente
wndow.AnalytcsCore = AnalytcsCore;

// Crar nstnca global quando DOM estver pronto
document.addEventListener('DOMContentLoaded', function() {
    if (!wndow.tokencafeAnalytcs) {
        wndow.tokencafeAnalytcs = new AnalytcsCore();
    }
});

// Compatbldade com cdgo legado
wndow.analytcs = wndow.tokencafeAnalytcs;

console.log(' Analytcs Core carregado');

