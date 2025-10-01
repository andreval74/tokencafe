class UserProfle {
    constructor() {
        this.currentTab = 'overvew';
        this.userData = {
            name: 'Joo Slva',
            username: 'joaoslva',
            bo: 'Desenvolvedor blockchan apaxonado por DeF e NFTs. Crando o futuro das fnanas descentralzadas.',
            emal: 'joao@example.com',
            webste: '',
            locaton: 'So Paulo, Brasl',
            avatar: 'https://va.placeholder.com/120x120/6366f1/ffffff?text=U',
            banner: 'https://va.placeholder.com/1200x300/4f46e5/ffffff?text=Banner'
        };
        this.init();
    }

    init() {
        this.setupEventLsteners();
        this.loadUserData();
        this.loadOvervewData();
    }

    setupEventLsteners() {
        // Navegao entre abas
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('clck', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.swtchTab(tabName);
            });
        });

        // Botes do header
        document.getElementByd('edtProfleBtn').addEventListener('clck', () => {
            this.openEdtModal();
        });

        document.getElementByd('shareProfleBtn').addEventListener('clck', () => {
            this.shareProfle();
        });

        document.getElementByd('changeAvatarBtn').addEventListener('clck', () => {
            this.changeAvatar();
        });

        document.getElementByd('changeBannerBtn').addEventListener('clck', () => {
            this.changeBanner();
        });

        // Modal de edo
        document.getElementByd('closeEdtModal').addEventListener('clck', () => {
            this.closeEdtModal();
        });

        document.getElementByd('cancelEdtBtn').addEventListener('clck', () => {
            this.closeEdtModal();
        });

        document.getElementByd('edtProfleForm').addEventListener('submt', (e) => {
            e.preventDefault();
            this.saveProfle();
        });

        // Confguraes
        document.getElementByd('personalnfoForm').addEventListener('submt', (e) => {
            e.preventDefault();
            this.savePersonalnfo();
        });

        document.getElementByd('notfcatonForm').addEventListener('submt', (e) => {
            e.preventDefault();
            this.saveNotfcatonPreferences();
        });

        document.getElementByd('changePasswordBtn').addEventListener('clck', () => {
            this.openPasswordModal();
        });

        document.getElementByd('enable2FABtn').addEventListener('clck', () => {
            this.enable2FA();
        });

        document.getElementByd('downloadDataBtn').addEventListener('clck', () => {
            this.downloadUserData();
        });

        // Modal de senha
        document.getElementByd('closePasswordModal').addEventListener('clck', () => {
            this.closePasswordModal();
        });

        document.getElementByd('cancelPasswordBtn').addEventListener('clck', () => {
            this.closePasswordModal();
        });

        document.getElementByd('changePasswordForm').addEventListener('submt', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Fltros de tokens
        document.getElementByd('tokenStatusFlter').addEventListener('change', () => {
            this.flterUserTokens();
        });

        document.getElementByd('tokenTypeFlter').addEventListener('change', () => {
            this.flterUserTokens();
        });

        document.getElementByd('tokenSearch').addEventListener('nput', () => {
            this.flterUserTokens();
        });

        // Fltros de atvdade
        document.getElementByd('actvtyTypeFlter').addEventListener('change', () => {
            this.flterActvty();
        });

        document.getElementByd('actvtyDateFlter').addEventListener('change', () => {
            this.flterActvty();
        });

        // Fechar modas clcando fora
        document.addEventListener('clck', (e) => {
            if (e.target.classLst.contans('modal')) {
                this.closeAllModals();
            }
        });
    }

    swtchTab(tabName) {
        // Atualzar navegao
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classLst.remove('actve');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classLst.add('actve');

        // Atualzar contedo
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classLst.remove('actve');
        });
        document.getElementByd(tabName).classLst.add('actve');

        this.currentTab = tabName;

        // Carregar dados especfcos da aba
        switch (tabName) {
            case 'overvew':
                this.loadOvervewData();
                break;
            case 'tokens':
                this.loadUserTokens();
                break;
            case 'actvty':
                this.loadActvty();
                break;
            case 'achevements':
                this.loadAchevements();
                break;
        }
    }

    loadUserData() {
        document.getElementByd('profleName').textContent = this.userData.name;
        document.getElementByd('profleBo').textContent = this.userData.bo;
        document.getElementByd('profleAvatar').src = this.userData.avatar;
        
        // Atualzar banner se exstr
        if (this.userData.banner) {
            document.querySelector('.profle-banner').style.backgroundmage = `url(${this.userData.banner})`;
        }
    }

    async loadOvervewData() {
        try {
            // Carregar dados do resumo
            await this.loadWalletSummary();
            await this.loadPerformanceChart();
            await this.loadTopTokens();
            await this.loadRecentActvty();
        } catch (error) {
            console.error('Erro ao carregar dados da vso geral:', error);
        }
    }

    async loadWalletSummary() {
        // Dados mockados - em produo vram de uma AP
        const walletData = {
            totalBalance: 12450.00,
            actveTokens: 15,
            stakngValue: 3200.00
        };

        // Atualzar estatstcas no header
        const stats = document.querySelectorAll('.profle-stats .stat-value');
        stats[0].textContent = walletData.actveTokens;
        stats[1].textContent = this.formatCurrency(walletData.totalBalance);
        stats[2].textContent = '850'; // Segudores
    }

    async loadPerformanceChart() {
        // Smular dados de performance
        const canvas = document.getElementByd('performanceChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Dados mockados para o grfco
        const data = [100, 120, 110, 140, 130, 160, 150, 180, 170, 200];
        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Ma', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];

        this.drawLneChart(ctx, data, labels, canvas.wdth, canvas.heght);
    }

    drawLneChart(ctx, data, labels, wdth, heght) {
        const paddng = 40;
        const chartWdth = wdth - 2 * paddng;
        const chartHeght = heght - 2 * paddng;
        
        const maxValue = Math.max(...data);
        const mnValue = Math.mn(...data);
        const valueRange = maxValue - mnValue;

        // Lmpar canvas
        ctx.clearRect(0, 0, wdth, heght);

        // Confgurar estlo
        ctx.strokeStyle = '#6366f1';
        ctx.lneWdth = 2;
        ctx.fllStyle = 'rgba(99, 102, 241, 0.1)';

        // Desenhar lnha
        ctx.begnPath();
        data.forEach((value, ndex) => {
            const x = paddng + (ndex * chartWdth) / (data.length - 1);
            const y = paddng + chartHeght - ((value - mnValue) / valueRange) * chartHeght;
            
            if (ndex === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lneTo(x, y);
            }
        });
        ctx.stroke();

        // Preencher rea sob a lnha
        ctx.lneTo(paddng + chartWdth, paddng + chartHeght);
        ctx.lneTo(paddng, paddng + chartHeght);
        ctx.closePath();
        ctx.fll();
    }

    async loadTopTokens() {
        const topTokens = [
            { name: 'CafeToken', symbol: 'CAFE', change: '+12.5%', value: '$2,450' },
            { name: 'DeFCon', symbol: 'DEF', change: '+8.3%', value: '$1,890' },
            { name: 'GameToken', symbol: 'GAME', change: '-2.1%', value: '$1,200' }
        ];

        const contaner = document.getElementByd('topTokens');
        contaner.nnerHTML = topTokens.map(token => `
            <dv class="token-tem">
                <dv class="token-nfo">
                    <span class="token-name">${token.name}</span>
                    <span class="token-symbol">${token.symbol}</span>
                </dv>
                <dv class="token-stats">
                    <span class="token-value">${token.value}</span>
                    <span class="token-change ${token.change.startsWth('+') ? 'postve' : 'negatve'}">
                        ${token.change}
                    </span>
                </dv>
            </dv>
        `).jon('');
    }

    async loadRecentActvty() {
        const actvtes = [
            { type: 'create', descrpton: 'Token CafeToken crado', tme: '2 horas atrs' },
            { type: 'transfer', descrpton: 'Transfernca de 1000 DEF', tme: '5 horas atrs' },
            { type: 'stake', descrpton: 'Stakng de 500 GAME ncado', tme: '1 da atrs' }
        ];

        const contaner = document.getElementByd('recentActvty');
        contaner.nnerHTML = actvtes.map(actvty => `
            <dv class="actvty-tem">
                <dv class="actvty-con">
                    < class="fas fa-${this.getActvtycon(actvty.type)}"></>
                </dv>
                <dv class="actvty-content">
                    <span class="actvty-descrpton">${actvty.descrpton}</span>
                    <span class="actvty-tme">${actvty.tme}</span>
                </dv>
            </dv>
        `).jon('');
    }

    async loadUserTokens() {
        const tokens = [
            {
                d: 1,
                name: 'CafeToken',
                symbol: 'CAFE',
                type: 'erc20',
                status: 'actve',
                supply: '1,000,000',
                holders: 1250,
                value: '$2,450'
            },
            {
                d: 2,
                name: 'DeF Collecton',
                symbol: 'DEF',
                type: 'erc721',
                status: 'actve',
                supply: '10,000',
                holders: 890,
                value: '$1,890'
            },
            {
                d: 3,
                name: 'GameAssets',
                symbol: 'GAME',
                type: 'erc1155',
                status: 'paused',
                supply: '50,000',
                holders: 650,
                value: '$1,200'
            }
        ];

        const contaner = document.getElementByd('userTokensGrd');
        contaner.nnerHTML = tokens.map(token => this.createTokenCard(token)).jon('');
    }

    createTokenCard(token) {
        const statusColors = {
            actve: '#10b981',
            paused: '#f59e0b',
            completed: '#6b7280'
        };

        return `
            <dv class="user-token-card">
                <dv class="token-header">
                    <dv class="token-nfo">
                        <h3>${token.name}</h3>
                        <span class="token-symbol">${token.symbol}</span>
                    </dv>
                    <span class="token-status" style="background-color: ${statusColors[token.status]}">
                        ${token.status}
                    </span>
                </dv>
                <dv class="token-stats">
                    <dv class="stat">
                        <label>Tpo:</label>
                        <span>${token.type.toUpperCase()}</span>
                    </dv>
                    <dv class="stat">
                        <label>Supply:</label>
                        <span>${token.supply}</span>
                    </dv>
                    <dv class="stat">
                        <label>Holders:</label>
                        <span>${token.holders}</span>
                    </dv>
                    <dv class="stat">
                        <label>Valor:</label>
                        <span>${token.value}</span>
                    </dv>
                </dv>
                <dv class="token-actons">
                    <button class="btn btn-sm btn-prmary">Gerencar</button>
                    <button class="btn btn-sm btn-secondary">Analytcs</button>
                </dv>
            </dv>
        `;
    }

    async loadActvty() {
        const actvtes = [
            {
                type: 'create',
                ttle: 'Token Crado',
                descrpton: 'CafeToken (CAFE) fo crado com sucesso',
                tmestamp: '2024-01-20T10:30:00Z',
                detals: { tokenName: 'CafeToken', supply: '1,000,000' }
            },
            {
                type: 'transfer',
                ttle: 'Transfernca Realzada',
                descrpton: 'Transferu 1000 DEF para 0x1234...5678',
                tmestamp: '2024-01-20T08:15:00Z',
                detals: { amount: '1000', token: 'DEF', to: '0x1234...5678' }
            },
            {
                type: 'stake',
                ttle: 'Stakng ncado',
                descrpton: 'ncou stakng de 500 GAME tokens',
                tmestamp: '2024-01-19T16:45:00Z',
                detals: { amount: '500', token: 'GAME', duraton: '30 das' }
            },
            {
                type: 'trade',
                ttle: 'Negocao Executada',
                descrpton: 'Trocou 100 ETH por 50,000 CAFE',
                tmestamp: '2024-01-19T14:20:00Z',
                detals: { from: '100 ETH', to: '50,000 CAFE' }
            }
        ];

        const contaner = document.getElementByd('actvtyTmelne');
        contaner.nnerHTML = actvtes.map(actvty => this.createActvtytem(actvty)).jon('');
    }

    createActvtytem(actvty) {
        const date = new Date(actvty.tmestamp);
        const formattedDate = date.toLocaleDateStrng('pt-BR');
        const formattedTme = date.toLocaleTmeStrng('pt-BR', { hour: '2-dgt', mnute: '2-dgt' });

        return `
            <dv class="tmelne-tem">
                <dv class="tmelne-marker">
                    < class="fas fa-${this.getActvtycon(actvty.type)}"></>
                </dv>
                <dv class="tmelne-content">
                    <dv class="tmelne-header">
                        <h4>${actvty.ttle}</h4>
                        <span class="tmelne-date">${formattedDate} s ${formattedTme}</span>
                    </dv>
                    <p class="tmelne-descrpton">${actvty.descrpton}</p>
                    <dv class="tmelne-detals">
                        ${Object.entres(actvty.detals).map(([key, value]) => 
                            `<span class="detal-tem"><strong>${key}:</strong> ${value}</span>`
                        ).jon('')}
                    </dv>
                </dv>
            </dv>
        `;
    }

    async loadAchevements() {
        const achevements = [
            {
                d: 1,
                name: 'Prmero Token',
                descrpton: 'Crou seu prmero token',
                con: 'trophy',
                earned: true,
                date: '2024-01-15'
            },
            {
                d: 2,
                name: 'Token Popular',
                descrpton: 'Token com mas de 1000 holders',
                con: 'users',
                earned: true,
                date: '2024-01-18'
            },
            {
                d: 3,
                name: 'Volume Mlonro',
                descrpton: 'Atngu $1M em volume total',
                con: 'chart-lne',
                earned: true,
                date: '2024-01-20'
            },
            {
                d: 4,
                name: 'Coleconador NFT',
                descrpton: 'Crou 5 colees NFT',
                con: 'mages',
                earned: false,
                progress: 60
            },
            {
                d: 5,
                name: 'DeF Master',
                descrpton: 'mplementou 10 contratos DeF',
                con: 'cons',
                earned: false,
                progress: 30
            }
        ];

        const contaner = document.getElementByd('achevementsGrd');
        contaner.nnerHTML = achevements.map(achevement => this.createAchevementCard(achevement)).jon('');
    }

    createAchevementCard(achevement) {
        return `
            <dv class="achevement-card ${achevement.earned ? 'earned' : 'locked'}">
                <dv class="achevement-con">
                    < class="fas fa-${achevement.con}"></>
                </dv>
                <dv class="achevement-content">
                    <h3>${achevement.name}</h3>
                    <p>${achevement.descrpton}</p>
                    ${achevement.earned ? 
                        `<span class="achevement-date">Conqustado em ${this.formatDate(achevement.date)}</span>` :
                        `<dv class="achevement-progress">
                            <dv class="progress-bar">
                                <dv class="progress-fll" style="wdth: ${achevement.progress}%"></dv>
                            </dv>
                            <span class="progress-text">${achevement.progress}%</span>
                        </dv>`
                    }
                </dv>
            </dv>
        `;
    }

    flterUserTokens() {
        // mplementar fltros de tokens
        const statusFlter = document.getElementByd('tokenStatusFlter').value;
        const typeFlter = document.getElementByd('tokenTypeFlter').value;
        const searchTerm = document.getElementByd('tokenSearch').value.toLowerCase();

        // Lgca de fltro sera mplementada aqu
        console.log('Fltrando tokens:', { statusFlter, typeFlter, searchTerm });
    }

    flterActvty() {
        // mplementar fltros de atvdade
        const typeFlter = document.getElementByd('actvtyTypeFlter').value;
        const dateFlter = document.getElementByd('actvtyDateFlter').value;

        console.log('Fltrando atvdades:', { typeFlter, dateFlter });
    }

    openEdtModal() {
        // Preencher formulro com dados atuas
        document.getElementByd('edtName').value = this.userData.name;
        document.getElementByd('edtUsername').value = this.userData.username;
        document.getElementByd('edtBo').value = this.userData.bo;
        document.getElementByd('edtWebste').value = this.userData.webste;
        document.getElementByd('edtLocaton').value = this.userData.locaton;

        document.getElementByd('edtProfleModal').style.dsplay = 'flex';
    }

    closeEdtModal() {
        document.getElementByd('edtProfleModal').style.dsplay = 'none';
    }

    async saveProfle() {
        const formData = {
            name: document.getElementByd('edtName').value,
            username: document.getElementByd('edtUsername').value,
            bo: document.getElementByd('edtBo').value,
            webste: document.getElementByd('edtWebste').value,
            locaton: document.getElementByd('edtLocaton').value
        };

        try {
            // Smular salvamento
            await this.delay(1000);
            
            // Atualzar dados locas
            Object.assgn(this.userData, formData);
            this.loadUserData();
            
            this.closeEdtModal();
            this.showNotfcaton('Perfl atualzado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar perfl:', error);
            this.showNotfcaton('Erro ao salvar perfl', 'error');
        }
    }

    shareProfle() {
        const profleUrl = `${wndow.locaton.orgn}/profle/${this.userData.username}`;
        
        if (navgator.share) {
            navgator.share({
                ttle: `Perfl de ${this.userData.name}`,
                text: this.userData.bo,
                url: profleUrl
            });
        } else {
            // Fallback para copar URL
            navgator.clpboard.wrteText(profleUrl).then(() => {
                this.showNotfcaton('Lnk do perfl copado!', 'success');
            });
        }
    }

    changeAvatar() {
        const nput = document.createElement('nput');
        nput.type = 'fle';
        nput.accept = 'mage/*';
        nput.onchange = (e) => {
            const fle = e.target.fles[0];
            if (fle) {
                const reader = new FleReader();
                reader.onload = (e) => {
                    this.userData.avatar = e.target.result;
                    document.getElementByd('profleAvatar').src = e.target.result;
                    this.showNotfcaton('Avatar atualzado!', 'success');
                };
                reader.readAsDataURL(fle);
            }
        };
        nput.clck();
    }

    changeBanner() {
        const nput = document.createElement('nput');
        nput.type = 'fle';
        nput.accept = 'mage/*';
        nput.onchange = (e) => {
            const fle = e.target.fles[0];
            if (fle) {
                const reader = new FleReader();
                reader.onload = (e) => {
                    this.userData.banner = e.target.result;
                    document.querySelector('.profle-banner').style.backgroundmage = `url(${e.target.result})`;
                    this.showNotfcaton('Banner atualzado!', 'success');
                };
                reader.readAsDataURL(fle);
            }
        };
        nput.clck();
    }

    async savePersonalnfo() {
        try {
            await this.delay(1000);
            this.showNotfcaton('nformaes pessoas salvas!', 'success');
        } catch (error) {
            this.showNotfcaton('Erro ao salvar nformaes', 'error');
        }
    }

    async saveNotfcatonPreferences() {
        try {
            await this.delay(1000);
            this.showNotfcaton('Preferncas de notfcao salvas!', 'success');
        } catch (error) {
            this.showNotfcaton('Erro ao salvar preferncas', 'error');
        }
    }

    openPasswordModal() {
        document.getElementByd('changePasswordModal').style.dsplay = 'flex';
    }

    closePasswordModal() {
        document.getElementByd('changePasswordModal').style.dsplay = 'none';
        document.getElementByd('changePasswordForm').reset();
    }

    async changePassword() {
        const currentPassword = document.getElementByd('currentPassword').value;
        const newPassword = document.getElementByd('newPassword').value;
        const confrmPassword = document.getElementByd('confrmPassword').value;

        if (newPassword !== confrmPassword) {
            this.showNotfcaton('As senhas no concdem', 'error');
            return;
        }

        try {
            await this.delay(1000);
            this.closePasswordModal();
            this.showNotfcaton('Senha alterada com sucesso!', 'success');
        } catch (error) {
            this.showNotfcaton('Erro ao alterar senha', 'error');
        }
    }

    enable2FA() {
        this.showNotfcaton('Funconaldade 2FA em desenvolvmento', 'nfo');
    }

    downloadUserData() {
        const userData = {
            profle: this.userData,
            tokens: [], // Sera preenchdo com dados reas
            actvtes: [], // Sera preenchdo com dados reas
            achevements: [] // Sera preenchdo com dados reas
        };

        const blob = new Blob([JSON.strngfy(userData, null, 2)], { type: 'applcaton/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tokencafe_user_data_${Date.now()}.json`;
        document.body.appendChld(a);
        a.clck();
        document.body.removeChld(a);
        URL.revokeObjectURL(url);

        this.showNotfcaton('Dados baxados com sucesso!', 'success');
    }

    closeAllModals() {
        this.closeEdtModal();
        this.closePasswordModal();
    }

    getActvtycon(type) {
        const cons = {
            create: 'plus-crcle',
            transfer: 'exchange-alt',
            trade: 'chart-lne',
            stake: 'lock'
        };
        return cons[type] || 'crcle';
    }

    formatCurrency(amount) {
        return new ntl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateStrng) {
        return new Date(dateStrng).toLocaleDateStrng('pt-BR');
    }

    showNotfcaton(message, type = 'nfo') {
        const notfcaton = document.createElement('dv');
        notfcaton.className = `notfcaton notfcaton-${type}`;
        notfcaton.nnerHTML = `
            <dv class="notfcaton-content">
                < class="fas fa-${type === 'success' ? 'check-crcle' : type === 'error' ? 'exclamaton-crcle' : 'nfo-crcle'}"></>
                <span>${message}</span>
            </dv>
            <button class="notfcaton-close">
                < class="fas fa-tmes"></>
            </button>
        `;

        document.body.appendChld(notfcaton);

        setTmeout(() => {
            if (notfcaton.parentNode) {
                notfcaton.parentNode.removeChld(notfcaton);
            }
        }, 5000);

        notfcaton.querySelector('.notfcaton-close').addEventListener('clck', () => {
            if (notfcaton.parentNode) {
                notfcaton.parentNode.removeChld(notfcaton);
            }
        });
    }

    delay(ms) {
        return new Promise(resolve => setTmeout(resolve, ms));
    }
}

// ncalzar quando o DOM estver carregado
document.addEventListener('DOMContentLoaded', () => {
    new UserProfle();
});

