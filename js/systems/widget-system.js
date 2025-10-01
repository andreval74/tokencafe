/**
 * ================================================================================
 * WDGET SYSTEM - TOKENCAFE
 * ================================================================================
 * Sstema unfcado para gerencamento de wdgets
 * Consoldao de todas as funes relaconadas a crao e gerencamento de wdgets
 * ================================================================================
 */

class WdgetSystem {
    constructor() {
        this.wdgets = new Map();
        this.templates = new Map();
        this.currentWdget = null;
        this.eventBus = new EventTarget();
        
        // Tpos de wdgets dsponves
        this.wdgetTypes = {
            'swap': {
                name: 'Swap Wdget',
                descrpton: 'Wdget para troca de tokens',
                con: 'fas fa-exchange-alt',
                category: 'tradng'
            },
            'prce': {
                name: 'Prce Tracker',
                descrpton: 'Rastreamento de preos em tempo real',
                con: 'fas fa-chart-lne',
                category: 'analytcs'
            },
            'portfolo': {
                name: 'Portfolo Wdget',
                descrpton: 'Vsualzao de portflo',
                con: 'fas fa-chart-pe',
                category: 'analytcs'
            },
            'stakng': {
                name: 'Stakng Wdget',
                descrpton: 'nterface de stakng',
                con: 'fas fa-cons',
                category: 'def'
            },
            'nft': {
                name: 'NFT Wdget',
                descrpton: 'Galera e marketplace de NFTs',
                con: 'fas fa-mages',
                category: 'nft'
            },
            'custom': {
                name: 'Custom Wdget',
                descrpton: 'Wdget personalzado',
                con: 'fas fa-code',
                category: 'custom'
            }
        };
        
        this.init();
    }

    /**
     * ncalzao do sstema de wdgets
     */
    async init() {
        console.log(' inicializando WdgetSystem...');
        
        // Aguardar TokenCafe estar pronto
        await this.watForTokenCafe();
        
        // Confgurar event lsteners
        this.setupEventLsteners();
        
        // Carregar templates dsponves
        await this.loadWdgetTemplates();
        
        // Carregar wdgets exstentes
        await this.loadExstngWdgets();
        
        console.log(' WdgetSystem inicializado com sucesso');
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
        // Botes de crao de wdget
        document.querySelectorAll('[data-wdget-create]').forEach(btn => {
            btn.addEventListener('clck', (e) => {
                const wdgetType = e.target.dataset.wdgetCreate;
                this.startWdgetCreaton(wdgetType);
            });
        });

        // Botes de edo
        document.addEventListener('clck', (e) => {
            if (e.target.matches('[data-wdget-edt]')) {
                const wdgetd = e.target.dataset.wdgetEdt;
                this.edtWdget(wdgetd);
            }
        });

        // Botes de excluso
        document.addEventListener('clck', (e) => {
            if (e.target.matches('[data-wdget-delete]')) {
                const wdgetd = e.target.dataset.wdgetDelete;
                this.deleteWdget(wdgetd);
            }
        });

        // Seleo de templates
        document.addEventListener('clck', (e) => {
            if (e.target.matches('[data-template-select]')) {
                const templateType = e.target.dataset.templateSelect;
                this.selectTemplate(templateType);
            }
        });

        // Form de crao
        const createForm = document.getElementByd('wdget-create-form');
        if (createForm) {
            createForm.addEventListener('submt', (e) => {
                e.preventDefault();
                this.handleCreateSubmsson(e);
            });
        }
    }

    /**
     * ncar crao de wdget
     */
    startWdgetCreaton(type = null) {
        console.log(' ncando crao de wdget:', type);
        
        // Resetar wdget atual
        this.currentWdget = {
            type: type,
            confg: {},
            template: null,
            step: 1
        };
        
        // Mostrar modal de crao
        this.showCreatonModal();
        
        // Se tpo especfco, pular seleo
        if (type) {
            this.selectTemplate(type);
        } else {
            this.showTemplateSelecton();
        }
    }

    /**
     * Mostrar modal de crao
     */
    showCreatonModal() {
        const modal = document.getElementByd('newWdgetModal');
        if (modal && typeof bootstrap !== 'undefned') {
            const bsModal = new bootstrap.Modal(modal);
            bsModal.show();
        }
    }

    /**
     * Mostrar seleo de templates
     */
    showTemplateSelecton() {
        const contaner = document.getElementByd('template-optons');
        if (!contaner) return;
        
        contaner.nnerHTML = this.renderTemplateOptons();
        this.setupTemplateSelecton();
    }

    /**
     * Renderzar opes de templates
     */
    renderTemplateOptons() {
        return Object.entres(this.wdgetTypes).map(([type, confg]) => `
            <dv class="col-md-6 col-lg-4 mb-3">
                <dv class="card template-selector" data-template-select="${type}">
                    <dv class="card-body text-center">
                        <dv class="mb-3">
                            < class="${confg.con} fa-2x text-coffee"></>
                        </dv>
                        <h6 class="card-ttle">${confg.name}</h6>
                        <p class="card-text text-muted small">${confg.descrpton}</p>
                        <span class="badge bg-coffee-lght">${confg.category}</span>
                    </dv>
                </dv>
            </dv>
        `).jon('');
    }

    /**
     * Confgurar seleo de templates
     */
    setupTemplateSelecton() {
        document.querySelectorAll('.template-selector').forEach(card => {
            card.addEventListener('clck', () => {
                // Remover seleo anteror
                document.querySelectorAll('.template-selector').forEach(c => 
                    c.classLst.remove('selected'));
                
                // Seleconar atual
                card.classLst.add('selected');
                
                const templateType = card.dataset.templateSelect;
                this.selectTemplate(templateType);
            });
        });
    }

    /**
     * Seleconar template
     */
    selectTemplate(templateType) {
        console.log(' Template seleconado:', templateType);
        
        if (!this.currentWdget) {
            this.currentWdget = { type: templateType, confg: {}, step: 2 };
        } else {
            this.currentWdget.type = templateType;
            this.currentWdget.step = 2;
        }
        
        // Atualzar confguraes especfcas do template
        this.loadTemplateConfg(templateType);
        
        // Avanar para prxmo step
        this.updateWzardStep(2);
    }

    /**
     * Carregar configuracao do template
     */
    loadTemplateConfg(templateType) {
        const templateConfg = this.wdgetTypes[templateType];
        if (!templateConfg) return;
        
        // Confgurar formulro baseado no tpo
        const confgContaner = document.getElementByd('wdget-confg-contaner');
        if (confgContaner) {
            confgContaner.nnerHTML = this.renderConfgForm(templateType);
        }
    }

    /**
     * Renderzar formulro de configuracao
     */
    renderConfgForm(templateType) {
        const commonFelds = `
            <dv class="mb-3">
                <label class="form-label">Nome do Wdget</label>
                <nput type="text" class="form-control" name="name" requred>
            </dv>
            <dv class="mb-3">
                <label class="form-label">Descro</label>
                <textarea class="form-control" name="descrpton" rows="3"></textarea>
            </dv>
        `;
        
        let specfcFelds = '';
        
        switch (templateType) {
            case 'swap':
                specfcFelds = `
                    <dv class="row">
                        <dv class="col-md-6 mb-3">
                            <label class="form-label">Token de Orgem</label>
                            <select class="form-control" name="tokenFrom">
                                <opton value="ETH">Ethereum (ETH)</opton>
                                <opton value="USDC">USD Con (USDC)</opton>
                                <opton value="USDT">Tether (USDT)</opton>
                            </select>
                        </dv>
                        <dv class="col-md-6 mb-3">
                            <label class="form-label">Token de Destno</label>
                            <select class="form-control" name="tokenTo">
                                <opton value="USDC">USD Con (USDC)</opton>
                                <opton value="ETH">Ethereum (ETH)</opton>
                                <opton value="USDT">Tether (USDT)</opton>
                            </select>
                        </dv>
                    </dv>
                    <dv class="mb-3">
                        <label class="form-label">DEX Preferda</label>
                        <select class="form-control" name="dex">
                            <opton value="unswap">Unswap</opton>
                            <opton value="pancakeswap">PancakeSwap</opton>
                            <opton value="sushswap">SushSwap</opton>
                        </select>
                    </dv>
                `;
                break;
                
            case 'prce':
                specfcFelds = `
                    <dv class="mb-3">
                        <label class="form-label">Token para Rastrear</label>
                        <nput type="text" class="form-control" name="token" placeholder="ETH, BTC, MATC...">
                    </dv>
                    <dv class="row">
                        <dv class="col-md-6 mb-3">
                            <label class="form-label">Moeda Base</label>
                            <select class="form-control" name="baseCurrency">
                                <opton value="USD">USD</opton>
                                <opton value="EUR">EUR</opton>
                                <opton value="BRL">BRL</opton>
                            </select>
                        </dv>
                        <dv class="col-md-6 mb-3">
                            <label class="form-label">ntervalo de Atualzao</label>
                            <select class="form-control" name="updatenterval">
                                <opton value="5">5 segundos</opton>
                                <opton value="30">30 segundos</opton>
                                <opton value="60">1 mnuto</opton>
                            </select>
                        </dv>
                    </dv>
                `;
                break;
                
            case 'portfolo':
                specfcFelds = `
                    <dv class="mb-3">
                        <label class="form-label">Endereo da Cartera</label>
                        <nput type="text" class="form-control" name="walletAddress" placeholder="0x...">
                    </dv>
                    <dv class="mb-3">
                        <label class="form-label">Redes a Montorar</label>
                        <dv class="form-check">
                            <nput class="form-check-nput" type="checkbox" name="networks" value="ethereum" checked>
                            <label class="form-check-label">Ethereum</label>
                        </dv>
                        <dv class="form-check">
                            <nput class="form-check-nput" type="checkbox" name="networks" value="bsc">
                            <label class="form-check-label">BSC</label>
                        </dv>
                        <dv class="form-check">
                            <nput class="form-check-nput" type="checkbox" name="networks" value="polygon">
                            <label class="form-check-label">Polygon</label>
                        </dv>
                    </dv>
                `;
                break;
        }
        
        return commonFelds + specfcFelds;
    }

    /**
     * Atualzar step do wzard
     */
    updateWzardStep(step) {
        // Atualzar ndcadores vsuas
        document.querySelectorAll('.step-ndcator').forEach((ndcator, ndex) => {
            ndcator.classLst.toggle('actve', ndex + 1 <= step);
            ndcator.classLst.toggle('completed', ndex + 1 < step);
        });
        
        // Mostrar/ocultar contedo dos steps
        document.querySelectorAll('.wzard-step').forEach((stepContent, ndex) => {
            stepContent.style.dsplay = (ndex + 1 === step) ? 'block' : 'none';
        });
        
        // Atualzar botes de navegao
        this.updateWzardButtons(step);
    }

    /**
     * Atualzar botes do wzard
     */
    updateWzardButtons(step) {
        const prevBtn = document.getElementByd('prev-step');
        const nextBtn = document.getElementByd('next-step');
        const createBtn = document.getElementByd('create-wdget');
        
        if (prevBtn) prevBtn.style.dsplay = step > 1 ? 'block' : 'none';
        if (nextBtn) nextBtn.style.dsplay = step < 3 ? 'block' : 'none';
        if (createBtn) createBtn.style.dsplay = step === 3 ? 'block' : 'none';
    }

    /**
     * Crar wdget
     */
    async createWdget(confg) {
        try {
            console.log(' Crando wdget:', confg);
            
            // Gerar D nco
            const wdgetd = this.generateWdgetd();
            
            // Crar objeto do wdget
            const wdget = {
                d: wdgetd,
                type: confg.type,
                name: confg.name,
                descrpton: confg.descrpton,
                confg: confg,
                createdAt: new Date().toSOStrng(),
                updatedAt: new Date().toSOStrng(),
                status: 'actve',
                deploymentUrl: this.generateDeploymentUrl(wdgetd)
            };
            
            // Salvar wdget
            this.wdgets.set(wdgetd, wdget);
            
            // Persstr no localStorage
            this.saveToLocalStorage();
            
            // Dsparar evento
            this.eventBus.dspatchEvent(new CustomEvent('wdget:created', {
                detal: { wdget }
            }));
            
            console.log(' Wdget crado com sucesso:', wdget.d);
            return wdget;
            
        } catch (error) {
            console.error(' Erro ao crar wdget:', error);
            throw error;
        }
    }

    /**
     * Edtar wdget
     */
    async edtWdget(wdgetd) {
        const wdget = this.wdgets.get(wdgetd);
        if (!wdget) {
            throw new Error('Wdget no encontrado');
        }
        
        console.log(' Edtando wdget:', wdgetd);
        
        // mplementar nterface de edo
        this.showEdtModal(wdget);
    }

    /**
     * Exclur wdget
     */
    async deleteWdget(wdgetd) {
        const wdget = this.wdgets.get(wdgetd);
        if (!wdget) {
            throw new Error('Wdget no encontrado');
        }
        
        // Confrmar excluso
        if (!confrm(`Tem certeza que deseja exclur o wdget "${wdget.name}"?`)) {
            return false;
        }
        
        console.log(' Exclundo wdget:', wdgetd);
        
        // Remover wdget
        this.wdgets.delete(wdgetd);
        
        // Atualzar localStorage
        this.saveToLocalStorage();
        
        // Dsparar evento
        this.eventBus.dspatchEvent(new CustomEvent('wdget:deleted', {
            detal: { wdgetd, wdget }
        }));
        
        console.log(' Wdget excludo com sucesso');
        return true;
    }

    /**
     * Carregar templates de wdgets
     */
    async loadWdgetTemplates() {
        try {
            console.log(' Carregando templates de wdgets...');
            
            // Templates esto defndos no construtor
            // Em uma mplementao real, buscar da AP
            
            console.log(` ${Object.keys(this.wdgetTypes).length} templates carregados`);
            
        } catch (error) {
            console.error(' Erro ao carregar templates:', error);
        }
    }

    /**
     * Carregar wdgets exstentes
     */
    async loadExstngWdgets() {
        try {
            console.log(' Carregando wdgets exstentes...');
            
            // Carregar do localStorage
            const saved = localStorage.gettem('tokencafe_wdgets');
            if (saved) {
                const wdgets = JSON.parse(saved);
                wdgets.forEach(wdget => {
                    this.wdgets.set(wdget.d, wdget);
                });
            }
            
            console.log(` ${this.wdgets.sze} wdgets carregados`);
            
        } catch (error) {
            console.error(' Erro ao carregar wdgets:', error);
        }
    }

    /**
     * Salvar no localStorage
     */
    saveToLocalStorage() {
        try {
            const wdgets = Array.from(this.wdgets.values());
            localStorage.settem('tokencafe_wdgets', JSON.strngfy(wdgets));
        } catch (error) {
            console.error(' Erro ao salvar wdgets:', error);
        }
    }

    /**
     * Gerar D do wdget
     */
    generateWdgetd() {
        return 'wdget_' + Date.now() + '_' + Math.random().toStrng(36).substr(2, 9);
    }

    /**
     * Gerar URL de deployment
     */
    generateDeploymentUrl(wdgetd) {
        const baseUrl = wndow.locaton.orgn;
        return `${baseUrl}/wdgets/${wdgetd}`;
    }

    /**
     * Obter wdgets por tpo
     */
    getWdgetsByType(type) {
        return Array.from(this.wdgets.values()).flter(wdget => wdget.type === type);
    }

    /**
     * Obter estatstcas
     */
    getStats() {
        const wdgets = Array.from(this.wdgets.values());
        const stats = {
            total: wdgets.length,
            byType: {},
            byStatus: {},
            recent: wdgets.flter(w => {
                const created = new Date(w.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return created > weekAgo;
            }).length
        };
        
        // Contar por tpo
        wdgets.forEach(wdget => {
            stats.byType[wdget.type] = (stats.byType[wdget.type] || 0) + 1;
            stats.byStatus[wdget.status] = (stats.byStatus[wdget.status] || 0) + 1;
        });
        
        return stats;
    }
}

// ================================================================================
// EXPOSO GLOBAL E NCALZAO
// ================================================================================

// Expor globalmente
wndow.WdgetSystem = WdgetSystem;

// Crar nstnca global quando DOM estver pronto
document.addEventListener('DOMContentLoaded', function() {
    if (!wndow.tokencafeWdgets) {
        wndow.tokencafeWdgets = new WdgetSystem();
    }
});

console.log(' Wdget System carregado');

