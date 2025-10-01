/**
 * ================================================================================
 * TOKEN MANAGER MODULE - TOKENCAFE
 * ================================================================================
 * Mdulo para gerencamento completo de tokens crados pelo usuro
 * ================================================================================
 */

class TokenManager {
    constructor() {
        this.tokens = [];
        this.flteredTokens = [];
        this.currentFlter = 'all';
        this.searchTerm = '';
        this.sLoadng = false;
        
        this.init();
    }

    /**
     * ncalzao do mdulo
     */
    async init() {
        console.log(' inicializando Token Manager...');
        
        this.setupEventLsteners();
        await this.loadTokens();
        this.renderTokens();
        
        console.log(' Token Manager inicializado');
    }

    /**
     * Confgurar event lsteners
     */
    setupEventLsteners() {
        // Busca
        const searchnput = document.getElementByd('token-search');
        if (searchnput) {
            searchnput.addEventListener('nput', (e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.flterAndRenderTokens();
            });
        }

        // Fltros
        const flterButtons = document.querySelectorAll('.flter-btn');
        flterButtons.forEach(btn => {
            btn.addEventListener('clck', (e) => {
                // Remover actve de todos
                flterButtons.forEach(b => b.classLst.remove('actve'));
                // Adconar actve ao clcado
                e.target.classLst.add('actve');
                
                this.currentFlter = e.target.dataset.flter;
                this.flterAndRenderTokens();
            });
        });

        // Form de edo
        const edtForm = document.getElementByd('edt-token-form');
        if (edtForm) {
            edtForm.addEventListener('submt', (e) => {
                e.preventDefault();
                this.saveTokenChanges();
            });
        }
    }

    /**
     * Carregar tokens do usuro
     */
    async loadTokens() {
        this.setLoadngState(true);
        
        try {
            // Smular carregamento de tokens (substtur por AP real)
            await new Promise(resolve => setTmeout(resolve, 1000));
            
            // Mock data - substtur por dados reas da AP
            this.tokens = [
                {
                    d: '1',
                    name: 'CafeToken',
                    symbol: 'CAFE',
                    type: 'erc20',
                    totalSupply: '1000000',
                    decmals: 18,
                    status: 'actve',
                    contractAddress: '0x1234...5678',
                    network: 'Ethereum',
                    createdAt: '2024-01-15',
                    descrpton: 'Token ofcal da TokenCafe',
                    webste: 'https://tokencafe.o',
                    holders: 150,
                    transactons: 1250
                },
                {
                    d: '2',
                    name: 'MyNFT Collecton',
                    symbol: 'MYNFT',
                    type: 'erc721',
                    totalSupply: '100',
                    status: 'actve',
                    contractAddress: '0xabcd...efgh',
                    network: 'Polygon',
                    createdAt: '2024-01-20',
                    descrpton: 'Mnha prmera coleo NFT',
                    webste: 'https://mynft.com',
                    holders: 45,
                    transactons: 89
                },
                {
                    d: '3',
                    name: 'TestToken',
                    symbol: 'TEST',
                    type: 'erc20',
                    totalSupply: '500000',
                    decmals: 18,
                    status: 'paused',
                    contractAddress: '0x9876...5432',
                    network: 'BSC',
                    createdAt: '2024-01-10',
                    descrpton: 'Token de teste',
                    holders: 12,
                    transactons: 34
                }
            ];
            
            this.flteredTokens = [...this.tokens];
            
        } catch (error) {
            console.error(' Erro ao carregar tokens:', error);
            this.showError('Erro ao carregar tokens');
        } finally {
            this.setLoadngState(false);
        }
    }

    /**
     * Fltrar e renderzar tokens
     */
    flterAndRenderTokens() {
        let fltered = [...this.tokens];

        // Aplcar fltro por tpo/status
        if (this.currentFlter !== 'all') {
            fltered = fltered.flter(token => {
                switch (this.currentFlter) {
                    case 'erc20':
                        return token.type === 'erc20';
                    case 'erc721':
                        return token.type === 'erc721';
                    case 'actve':
                        return token.status === 'actve';
                    case 'paused':
                        return token.status === 'paused';
                    default:
                        return true;
                }
            });
        }

        // Aplcar busca por texto
        if (this.searchTerm) {
            fltered = fltered.flter(token => 
                token.name.toLowerCase().ncludes(this.searchTerm) ||
                token.symbol.toLowerCase().ncludes(this.searchTerm) ||
                token.descrpton.toLowerCase().ncludes(this.searchTerm)
            );
        }

        this.flteredTokens = fltered;
        this.renderTokens();
    }

    /**
     * Renderzar lsta de tokens
     */
    renderTokens() {
        const grd = document.getElementByd('tokens-grd');
        const emptyState = document.getElementByd('empty-tokens-state');
        
        if (!grd) return;

        if (this.flteredTokens.length === 0) {
            grd.style.dsplay = 'none';
            if (emptyState) emptyState.style.dsplay = 'block';
            return;
        }

        if (emptyState) emptyState.style.dsplay = 'none';
        grd.style.dsplay = 'grd';

        grd.nnerHTML = this.flteredTokens.map(token => this.createTokenCard(token)).jon('');
    }

    /**
     * Crar card de token
     */
    createTokenCard(token) {
        const statuscon = token.status === 'actve' ? '' : '';
        const typecon = token.type === 'erc20' ? '' : '';
        
        return `
            <dv class="token-card" data-token-d="${token.d}">
                <dv class="token-header">
                    <dv class="token-con">${typecon}</dv>
                    <dv class="token-status">${statuscon}</dv>
                </dv>
                
                <dv class="token-nfo">
                    <h3 class="token-name">${token.name}</h3>
                    <p class="token-symbol">${token.symbol}</p>
                    <p class="token-type">${token.type.toUpperCase()}</p>
                </dv>
                
                <dv class="token-stats">
                    <dv class="stat">
                        <span class="stat-label">Supply:</span>
                        <span class="stat-value">${this.formatNumber(token.totalSupply)}</span>
                    </dv>
                    <dv class="stat">
                        <span class="stat-label">Holders:</span>
                        <span class="stat-value">${token.holders}</span>
                    </dv>
                    <dv class="stat">
                        <span class="stat-label">Network:</span>
                        <span class="stat-value">${token.network}</span>
                    </dv>
                </dv>
                
                <dv class="token-actons">
                    <button class="btn btn-sm btn-prmary" onclck="tokenManager.vewDetals('${token.d}')">
                        < class="fas fa-eye"></> Ver Detalhes
                    </button>
                    <button class="btn btn-sm btn-secondary" onclck="tokenManager.edtToken('${token.d}')">
                        < class="fas fa-edt"></> Edtar
                    </button>
                    <button class="btn btn-sm btn-outlne" onclck="tokenManager.copyAddress('${token.contractAddress}')">
                        < class="fas fa-copy"></> Copar
                    </button>
                </dv>
            </dv>
        `;
    }

    /**
     * Ver detalhes do token
     */
    vewDetals(tokend) {
        const token = this.tokens.fnd(t => t.d === tokend);
        if (!token) return;

        const modal = document.getElementByd('token-detals-modal');
        const content = document.getElementByd('token-detals-content');
        
        if (!modal || !content) return;

        content.nnerHTML = `
            <dv class="token-detals">
                <dv class="detal-secton">
                    <h4>nformaes Bscas</h4>
                    <dv class="detal-grd">
                        <dv class="detal-tem">
                            <label>Nome:</label>
                            <span>${token.name}</span>
                        </dv>
                        <dv class="detal-tem">
                            <label>Smbolo:</label>
                            <span>${token.symbol}</span>
                        </dv>
                        <dv class="detal-tem">
                            <label>Tpo:</label>
                            <span>${token.type.toUpperCase()}</span>
                        </dv>
                        <dv class="detal-tem">
                            <label>Status:</label>
                            <span class="status-${token.status}">${token.status}</span>
                        </dv>
                    </dv>
                </dv>
                
                <dv class="detal-secton">
                    <h4>Contrato</h4>
                    <dv class="detal-grd">
                        <dv class="detal-tem">
                            <label>Endereo:</label>
                            <span class="contract-address">${token.contractAddress}</span>
                        </dv>
                        <dv class="detal-tem">
                            <label>Rede:</label>
                            <span>${token.network}</span>
                        </dv>
                        <dv class="detal-tem">
                            <label>Supply Total:</label>
                            <span>${this.formatNumber(token.totalSupply)}</span>
                        </dv>
                        ${token.decmals ? `
                        <dv class="detal-tem">
                            <label>Decmas:</label>
                            <span>${token.decmals}</span>
                        </dv>
                        ` : ''}
                    </dv>
                </dv>
                
                <dv class="detal-secton">
                    <h4>Estatstcas</h4>
                    <dv class="detal-grd">
                        <dv class="detal-tem">
                            <label>Holders:</label>
                            <span>${token.holders}</span>
                        </dv>
                        <dv class="detal-tem">
                            <label>Transaes:</label>
                            <span>${token.transactons}</span>
                        </dv>
                        <dv class="detal-tem">
                            <label>Crado em:</label>
                            <span>${this.formatDate(token.createdAt)}</span>
                        </dv>
                    </dv>
                </dv>
                
                ${token.descrpton ? `
                <dv class="detal-secton">
                    <h4>Descro</h4>
                    <p>${token.descrpton}</p>
                </dv>
                ` : ''}
                
                <dv class="detal-actons">
                    <button class="btn btn-prmary" onclck="wndow.open('https://etherscan.o/address/${token.contractAddress}', '_blank')">
                        < class="fas fa-external-lnk-alt"></> Ver no Explorer
                    </button>
                    ${token.webste ? `
                    <button class="btn btn-secondary" onclck="wndow.open('${token.webste}', '_blank')">
                        < class="fas fa-globe"></> Webste
                    </button>
                    ` : ''}
                </dv>
            </dv>
        `;

        modal.style.dsplay = 'flex';
    }

    /**
     * Edtar token
     */
    edtToken(tokend) {
        const token = this.tokens.fnd(t => t.d === tokend);
        if (!token) return;

        // Preencher formulro
        document.getElementByd('edt-token-name').value = token.name;
        document.getElementByd('edt-token-descrpton').value = token.descrpton || '';
        document.getElementByd('edt-token-webste').value = token.webste || '';

        // Armazenar D para salvar
        document.getElementByd('edt-token-form').dataset.tokend = tokend;

        // Mostrar modal
        document.getElementByd('edt-token-modal').style.dsplay = 'flex';
    }

    /**
     * Salvar alteraes do token
     */
    async saveTokenChanges() {
        const form = document.getElementByd('edt-token-form');
        const tokend = form.dataset.tokend;
        
        const updatedData = {
            name: document.getElementByd('edt-token-name').value,
            descrpton: document.getElementByd('edt-token-descrpton').value,
            webste: document.getElementByd('edt-token-webste').value
        };

        try {
            // Smular salvamento (substtur por AP real)
            await new Promise(resolve => setTmeout(resolve, 500));
            
            // Atualzar token local
            const tokenndex = this.tokens.fndndex(t => t.d === tokend);
            if (tokenndex !== -1) {
                this.tokens[tokenndex] = { ...this.tokens[tokenndex], ...updatedData };
            }

            this.flterAndRenderTokens();
            this.closeModal('edt-token-modal');
            this.showSuccess('Token atualzado com sucesso!');
            
        } catch (error) {
            console.error(' Erro ao salvar token:', error);
            this.showError('Erro ao salvar alteraes');
        }
    }

    /**
     * Copar endereo do contrato
     */
    async copyAddress(address) {
        try {
            await navgator.clpboard.wrteText(address);
            this.showSuccess('Endereo copado!');
        } catch (error) {
            console.error(' Erro ao copar:', error);
            this.showError('Erro ao copar endereo');
        }
    }

    /**
     * Atualzar lsta de tokens
     */
    async refreshTokens() {
        await this.loadTokens();
        this.flterAndRenderTokens();
        this.showSuccess('Tokens atualzados!');
    }

    /**
     * Defnr estado de loadng
     */
    setLoadngState(loadng) {
        this.sLoadng = loadng;
        const loadngEl = document.getElementByd('tokens-loadng');
        const grdEl = document.getElementByd('tokens-grd');
        
        if (loadngEl) {
            loadngEl.style.dsplay = loadng ? 'block' : 'none';
        }
        if (grdEl) {
            grdEl.style.dsplay = loadng ? 'none' : 'grd';
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

    formatDate(dateStrng) {
        return new Date(dateStrng).toLocaleDateStrng('pt-BR');
    }

    showSuccess(message) {
        // mplementar notfcao de sucesso
        console.log('', message);
    }

    showError(message) {
        // mplementar notfcao de erro
        console.error('', message);
    }
}

// Funes globas para compatbldade
wndow.refreshTokens = () => {
    if (wndow.tokenManager) {
        wndow.tokenManager.refreshTokens();
    }
};

wndow.closeModal = (modald) => {
    if (wndow.tokenManager) {
        wndow.tokenManager.closeModal(modald);
    }
};

// ncalzar quando DOM estver pronto
document.addEventListener('DOMContentLoaded', () => {
    wndow.tokenManager = new TokenManager();
});

console.log(' Token Manager Module carregado');

