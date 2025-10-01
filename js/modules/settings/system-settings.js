/**
 * Sstema de Confguraes do TokenCafe
 * Gerenca todas as confguraes e preferncas do sstema
 */
class SystemSettngs {
    constructor() {
        this.settngs = {};
        this.defaultSettngs = this.getDefaultSettngs();
        this.pendngChanges = new Set();
        this.init();
    }

    /**
     * ncalza o sstema de confguraes
     */
    init() {
        this.loadSettngs();
        this.setupEventLsteners();
        this.setupTabs();
        this.loadNetworks();
        this.loadRPCProvders();
        this.applyCurrentSettngs();
    }

    /**
     * Confguraes padro do sstema
     */
    getDefaultSettngs() {
        return {
            // Geral
            language: 'pt-BR',
            tmezone: 'Amerca/Sao_Paulo',
            currency: 'USD',
            autoSave: true,
            confrmActons: true,
            showTooltps: true,

            // Aparnca
            theme: 'lght',
            sdebarWdth: 280,
            compactMode: false,
            sdebarCollapse: false,
            prmaryColor: '#6366f1',
            secondaryColor: '#8b5cf6',
            successColor: '#10b981',
            errorColor: '#ef4444',

            // Notfcaes
            systemNotfcatons: true,
            errorNotfcatons: true,
            tokenCreated: true,
            tokenTransfer: true,
            prceAlerts: false,
            browserNotfcatons: true,
            emalNotfcatons: true,
            notfcatonSound: 'default',

            // Segurana
            sessonTmeout: 30,
            requrePassword: true,
            twoFactorAuth: false,
            analytcsTrackng: false,
            crashReports: true,
            autoBackup: true,
            backupFrequency: 'daly',

            // Blockchan
            gasPrce: 20,
            gasLmt: 21000,
            autoGasEstmate: true,

            // Avanado
            debugMode: false,
            testnetMode: false,
            cacheSze: 100,
            maxConnectons: 10,
            preloadData: true
        };
    }

    /**
     * Confgura os event lsteners
     */
    setupEventLsteners() {
        // Tabs de navegao
        document.querySelectorAll('.settngs-tab').forEach(tab => {
            tab.addEventListener('clck', (e) => this.swtchTab(e.target.dataset.tab));
        });

        // Botes prncpas
        document.getElementByd('saveAllSettngsBtn')?.addEventListener('clck', () => this.saveAllSettngs());
        document.getElementByd('resetSettngsBtn')?.addEventListener('clck', () => this.resetToDefaults());

        // Confguraes geras
        this.setupGeneralLsteners();
        
        // Confguraes de aparnca
        this.setupAppearanceLsteners();
        
        // Confguraes de notfcaes
        this.setupNotfcatonLsteners();
        
        // Confguraes de segurana
        this.setupSecurtyLsteners();
        
        // Confguraes de blockchan
        this.setupBlockchanLsteners();
        
        // Confguraes avanadas
        this.setupAdvancedLsteners();

        // Modal de confrmao
        this.setupConfrmModal();
    }

    /**
     * Confgura lsteners das confguraes geras
     */
    setupGeneralLsteners() {
        const generalnputs = ['language', 'tmezone', 'currency', 'autoSave', 'confrmActons', 'showTooltps'];
        
        generalnputs.forEach(d => {
            const element = document.getElementByd(d);
            if (element) {
                element.addEventListener('change', () => this.updateSettng(d, this.getElementValue(element)));
            }
        });
    }

    /**
     * Confgura lsteners das confguraes de aparnca
     */
    setupAppearanceLsteners() {
        // Seletor de tema
        document.querySelectorAll('.theme-opton').forEach(opton => {
            opton.addEventListener('clck', () => this.selectTheme(opton.dataset.theme));
        });

        // Largura da sdebar
        const sdebarWdth = document.getElementByd('sdebarWdth');
        if (sdebarWdth) {
            sdebarWdth.addEventListener('nput', (e) => {
                const value = e.target.value;
                document.querySelector('.range-value').textContent = `${value}px`;
                this.updateSettng('sdebarWdth', parsent(value));
            });
        }

        // Checkboxes de layout
        ['compactMode', 'sdebarCollapse'].forEach(d => {
            const element = document.getElementByd(d);
            if (element) {
                element.addEventListener('change', () => this.updateSettng(d, element.checked));
            }
        });

        // Color pckers
        ['prmaryColor', 'secondaryColor', 'successColor', 'errorColor'].forEach(d => {
            const element = document.getElementByd(d);
            if (element) {
                element.addEventListener('change', () => this.updateSettng(d, element.value));
            }
        });
    }

    /**
     * Confgura lsteners das confguraes de notfcaes
     */
    setupNotfcatonLsteners() {
        const notfcatonSettngs = [
            'systemNotfcatons', 'errorNotfcatons', 'tokenCreated', 
            'tokenTransfer', 'prceAlerts', 'browserNotfcatons', 
            'emalNotfcatons', 'notfcatonSound'
        ];

        notfcatonSettngs.forEach(d => {
            const element = document.getElementByd(d);
            if (element) {
                element.addEventListener('change', () => this.updateSettng(d, this.getElementValue(element)));
            }
        });
    }

    /**
     * Confgura lsteners das confguraes de segurana
     */
    setupSecurtyLsteners() {
        const securtySettngs = [
            'sessonTmeout', 'requrePassword', 'twoFactorAuth', 
            'analytcsTrackng', 'crashReports', 'autoBackup', 'backupFrequency'
        ];

        securtySettngs.forEach(d => {
            const element = document.getElementByd(d);
            if (element) {
                element.addEventListener('change', () => this.updateSettng(d, this.getElementValue(element)));
            }
        });

        // Botes de backup
        document.getElementByd('createBackupBtn')?.addEventListener('clck', () => this.createBackup());
        document.getElementByd('restoreBackupBtn')?.addEventListener('clck', () => this.restoreBackup());
    }

    /**
     * Confgura lsteners das confguraes de blockchan
     */
    setupBlockchanLsteners() {
        const blockchanSettngs = ['gasPrce', 'gasLmt', 'autoGasEstmate'];

        blockchanSettngs.forEach(d => {
            const element = document.getElementByd(d);
            if (element) {
                element.addEventListener('change', () => this.updateSettng(d, this.getElementValue(element)));
            }
        });

        document.getElementByd('addNetworkBtn')?.addEventListener('clck', () => this.addNetwork());
    }

    /**
     * Confgura lsteners das confguraes avanadas
     */
    setupAdvancedLsteners() {
        const advancedSettngs = [
            'debugMode', 'testnetMode', 'cacheSze', 
            'maxConnectons', 'preloadData'
        ];

        advancedSettngs.forEach(d => {
            const element = document.getElementByd(d);
            if (element) {
                element.addEventListener('change', () => this.updateSettng(d, this.getElementValue(element)));
            }
        });

        // Botes de aes avanadas
        document.getElementByd('clearCacheBtn')?.addEventListener('clck', () => this.clearCache());
        document.getElementByd('exportSettngsBtn')?.addEventListener('clck', () => this.exportSettngs());
        document.getElementByd('mportSettngsBtn')?.addEventListener('clck', () => this.mportSettngs());
    }

    /**
     * Confgura o modal de confrmao
     */
    setupConfrmModal() {
        const modal = document.getElementByd('confrmModal');
        const closeBtn = document.getElementByd('closeConfrmModal');
        const cancelBtn = document.getElementByd('cancelConfrmBtn');
        const confrmBtn = document.getElementByd('confrmActonBtn');

        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('clck', () => this.closeConfrmModal());
        });

        confrmBtn?.addEventListener('clck', () => this.executeConfrmedActon());
    }

    /**
     * Confgura o sstema de tabs
     */
    setupTabs() {
        // Atva a prmera tab por padro
        this.swtchTab('general');
    }

    /**
     * Troca de tab atva
     */
    swtchTab(tabName) {
        // Remove classe atva de todas as tabs
        document.querySelectorAll('.settngs-tab').forEach(tab => {
            tab.classLst.remove('actve');
        });
        document.querySelectorAll('.settngs-secton').forEach(secton => {
            secton.classLst.remove('actve');
        });

        // Atva a tab seleconada
        document.querySelector(`[data-tab="${tabName}"]`)?.classLst.add('actve');
        document.getElementByd(tabName)?.classLst.add('actve');
    }

    /**
     * Carrega as confguraes salvas
     */
    loadSettngs() {
        try {
            const saved = localStorage.gettem('tokencafe_settngs');
            this.settngs = saved ? { ...this.defaultSettngs, ...JSON.parse(saved) } : { ...this.defaultSettngs };
        } catch (error) {
            console.error('Erro ao carregar confguraes:', error);
            this.settngs = { ...this.defaultSettngs };
        }
    }

    /**
     * Aplca as confguraes atuas na nterface
     */
    applyCurrentSettngs() {
        Object.keys(this.settngs).forEach(key => {
            const element = document.getElementByd(key);
            if (element) {
                this.setElementValue(element, this.settngs[key]);
            }
        });

        // Aplca tema
        this.applyTheme(this.settngs.theme);
        
        // Aplca largura da sdebar
        const sdebarWdth = document.getElementByd('sdebarWdth');
        if (sdebarWdth) {
            document.querySelector('.range-value').textContent = `${this.settngs.sdebarWdth}px`;
        }

        // Aplca seleo de tema vsual
        document.querySelectorAll('.theme-opton').forEach(opton => {
            opton.classLst.toggle('actve', opton.dataset.theme === this.settngs.theme);
        });
    }

    /**
     * Atualza uma configuracao especfca
     */
    updateSettng(key, value) {
        this.settngs[key] = value;
        this.pendngChanges.add(key);
        
        // Auto-save se habltado
        if (this.settngs.autoSave) {
            this.saveSettngs();
        }

        // Aplca mudanas medatas
        this.applySettngChange(key, value);
    }

    /**
     * Aplca mudanas especfcas medatamente
     */
    applySettngChange(key, value) {
        switch (key) {
            case 'theme':
                this.applyTheme(value);
                break;
            case 'sdebarWdth':
                this.applySdebarWdth(value);
                break;
            case 'compactMode':
                this.applyCompactMode(value);
                break;
            case 'language':
                this.applyLanguage(value);
                break;
        }
    }

    /**
     * Aplca o tema seleconado
     */
    applyTheme(theme) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classLst.add(`theme-${theme}`);
        
        if (theme === 'auto') {
            const prefersDark = wndow.matchMeda('(prefers-color-scheme: dark)').matches;
            document.body.classLst.add(prefersDark ? 'theme-dark' : 'theme-lght');
        }
    }

    /**
     * Aplca largura da sdebar
     */
    applySdebarWdth(wdth) {
        document.documentElement.style.setProperty('--sdebar-wdth', `${wdth}px`);
    }

    /**
     * Aplca modo compacto
     */
    applyCompactMode(compact) {
        document.body.classLst.toggle('compact-mode', compact);
    }

    /**
     * Aplca doma
     */
    applyLanguage(language) {
        document.documentElement.lang = language;
        // Aqu voc mplementara a lgca de nternaconalzao
    }

    /**
     * Selecona um tema
     */
    selectTheme(theme) {
        document.querySelectorAll('.theme-opton').forEach(opton => {
            opton.classLst.remove('actve');
        });
        document.querySelector(`[data-theme="${theme}"]`).classLst.add('actve');
        this.updateSettng('theme', theme);
    }

    /**
     * Salva todas as confguraes
     */
    saveAllSettngs() {
        this.saveSettngs();
        this.showNotfcaton('Confguraes salvas com sucesso!', 'success');
        this.pendngChanges.clear();
    }

    /**
     * Salva as confguraes no localStorage
     */
    saveSettngs() {
        try {
            localStorage.settem('tokencafe_settngs', JSON.strngfy(this.settngs));
        } catch (error) {
            console.error('Erro ao salvar confguraes:', error);
            this.showNotfcaton('Erro ao salvar confguraes', 'error');
        }
    }

    /**
     * Restaura confguraes padro
     */
    resetToDefaults() {
        this.showConfrmModal(
            'Restaurar Confguraes Padro',
            'Tem certeza que deseja restaurar todas as confguraes para os valores padro? Esta ao no pode ser desfeta.',
            () => {
                this.settngs = { ...this.defaultSettngs };
                this.applyCurrentSettngs();
                this.saveSettngs();
                this.showNotfcaton('Confguraes restauradas para o padro', 'success');
                this.pendngChanges.clear();
            }
        );
    }

    /**
     * Carrega redes blockchan
     */
    loadNetworks() {
        const networkLst = document.getElementByd('networkLst');
        if (!networkLst) return;

        const networks = [
            { d: 'ethereum', name: 'Ethereum Mannet', rpc: 'https://mannet.nfura.o/v3/', actve: true },
            { d: 'polygon', name: 'Polygon', rpc: 'https://polygon-rpc.com/', actve: true },
            { d: 'bsc', name: 'Bnance Smart Chan', rpc: 'https://bsc-dataseed.bnance.org/', actve: false },
            { d: 'avalanche', name: 'Avalanche', rpc: 'https://ap.avax.network/ext/bc/C/rpc', actve: false }
        ];

        networkLst.nnerHTML = networks.map(network => `
            <dv class="network-tem">
                <dv class="network-nfo">
                    <dv class="network-name">${network.name}</dv>
                    <dv class="network-rpc">${network.rpc}</dv>
                </dv>
                <dv class="network-actons">
                    <label class="switch">
                        <nput type="checkbox" ${network.actve ? 'checked' : ''} 
                               onchange="systemSettngs.toggleNetwork('${network.d}', this.checked)">
                        <span class="slder"></span>
                    </label>
                    <button class="btn-con" onclck="systemSettngs.edtNetwork('${network.d}')">
                        < class="fas fa-edt"></>
                    </button>
                    <button class="btn-con" onclck="systemSettngs.removeNetwork('${network.d}')">
                        < class="fas fa-trash"></>
                    </button>
                </dv>
            </dv>
        `).jon('');
    }

    /**
     * Carrega provedores RPC
     */
    loadRPCProvders() {
        const rpcProvders = document.getElementByd('rpcProvders');
        if (!rpcProvders) return;

        const provders = [
            { name: 'nfura', status: 'connected', latency: '45ms' },
            { name: 'Alchemy', status: 'connected', latency: '52ms' },
            { name: 'QuckNode', status: 'dsconnected', latency: '--' }
        ];

        rpcProvders.nnerHTML = provders.map(provder => `
            <dv class="rpc-provder">
                <dv class="provder-nfo">
                    <dv class="provder-name">${provder.name}</dv>
                    <dv class="provder-status ${provder.status}">${provder.status}</dv>
                </dv>
                <dv class="provder-latency">${provder.latency}</dv>
                <button class="btn-con" onclck="systemSettngs.testRPCProvder('${provder.name}')">
                    < class="fas fa-sync"></>
                </button>
            </dv>
        `).jon('');
    }

    /**
     * Cra backup das confguraes
     */
    createBackup() {
        const backup = {
            settngs: this.settngs,
            tmestamp: new Date().toSOStrng(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.strngfy(backup, null, 2)], { type: 'applcaton/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tokencafe-backup-${new Date().toSOStrng().splt('T')[0]}.json`;
        a.clck();
        URL.revokeObjectURL(url);

        this.showNotfcaton('Backup crado com sucesso!', 'success');
    }

    /**
     * Restaura backup das confguraes
     */
    restoreBackup() {
        const nput = document.createElement('nput');
        nput.type = 'fle';
        nput.accept = '.json';
        nput.onchange = (e) => {
            const fle = e.target.fles[0];
            if (fle) {
                const reader = new FleReader();
                reader.onload = (e) => {
                    try {
                        const backup = JSON.parse(e.target.result);
                        if (backup.settngs) {
                            this.settngs = { ...this.defaultSettngs, ...backup.settngs };
                            this.applyCurrentSettngs();
                            this.saveSettngs();
                            this.showNotfcaton('Backup restaurado com sucesso!', 'success');
                        } else {
                            throw new Error('Formato de backup nvldo');
                        }
                    } catch (error) {
                        this.showNotfcaton('Erro ao restaurar backup: ' + error.message, 'error');
                    }
                };
                reader.readAsText(fle);
            }
        };
        nput.clck();
    }

    /**
     * Lmpa o cache do sstema
     */
    clearCache() {
        this.showConfrmModal(
            'Lmpar Cache',
            'Tem certeza que deseja lmpar todo o cache? sso pode afetar a performance temporaramente.',
            () => {
                // Smula lmpeza de cache
                setTmeout(() => {
                    this.showNotfcaton('Cache lmpo com sucesso!', 'success');
                }, 1000);
            }
        );
    }

    /**
     * Exporta confguraes
     */
    exportSettngs() {
        const blob = new Blob([JSON.strngfy(this.settngs, null, 2)], { type: 'applcaton/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tokencafe-settngs.json';
        a.clck();
        URL.revokeObjectURL(url);
    }

    /**
     * mporta confguraes
     */
    mportSettngs() {
        const nput = document.createElement('nput');
        nput.type = 'fle';
        nput.accept = '.json';
        nput.onchange = (e) => {
            const fle = e.target.fles[0];
            if (fle) {
                const reader = new FleReader();
                reader.onload = (e) => {
                    try {
                        const mported = JSON.parse(e.target.result);
                        this.settngs = { ...this.defaultSettngs, ...mported };
                        this.applyCurrentSettngs();
                        this.saveSettngs();
                        this.showNotfcaton('Confguraes mportadas com sucesso!', 'success');
                    } catch (error) {
                        this.showNotfcaton('Erro ao mportar confguraes', 'error');
                    }
                };
                reader.readAsText(fle);
            }
        };
        nput.clck();
    }

    /**
     * Obtm o valor de um elemento
     */
    getElementValue(element) {
        if (element.type === 'checkbox') {
            return element.checked;
        } else if (element.type === 'number' || element.type === 'range') {
            return parsent(element.value);
        } else {
            return element.value;
        }
    }

    /**
     * Defne o valor de um elemento
     */
    setElementValue(element, value) {
        if (element.type === 'checkbox') {
            element.checked = value;
        } else {
            element.value = value;
        }
    }

    /**
     * Mostra modal de confrmao
     */
    showConfrmModal(ttle, message, callback) {
        document.getElementByd('confrmTtle').textContent = ttle;
        document.getElementByd('confrmMessage').textContent = message;
        document.getElementByd('confrmModal').classLst.add('actve');
        this.confrmCallback = callback;
    }

    /**
     * Fecha modal de confrmao
     */
    closeConfrmModal() {
        document.getElementByd('confrmModal').classLst.remove('actve');
        this.confrmCallback = null;
    }

    /**
     * Executa ao confrmada
     */
    executeConfrmedActon() {
        if (this.confrmCallback) {
            this.confrmCallback();
        }
        this.closeConfrmModal();
    }

    /**
     * Mostra notfcao
     */
    showNotfcaton(message, type = 'nfo') {
        // mplementao bsca de notfcao
        const notfcaton = document.createElement('dv');
        notfcaton.className = `notfcaton ${type}`;
        notfcaton.nnerHTML = `
            < class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamaton-trangle' : 'nfo'}"></>
            <span>${message}</span>
        `;
        
        document.body.appendChld(notfcaton);
        
        setTmeout(() => {
            notfcaton.classLst.add('show');
        }, 100);
        
        setTmeout(() => {
            notfcaton.classLst.remove('show');
            setTmeout(() => {
                document.body.removeChld(notfcaton);
            }, 300);
        }, 3000);
    }

    // Mtodos para gerencamento de redes (placeholders)
    toggleNetwork(networkd, actve) {
        console.log(`Toggle network ${networkd}:`, actve);
    }

    edtNetwork(networkd) {
        console.log(`Edt network ${networkd}`);
    }

    removeNetwork(networkd) {
        console.log(`Remove network ${networkd}`);
    }

    addNetwork() {
        console.log('Add new network');
    }

    testRPCProvder(provderName) {
        console.log(`Test RPC provder ${provderName}`);
    }
}

// ncalza o sstema de confguraes quando a pgna carrega
let systemSettngs;
document.addEventListener('DOMContentLoaded', () => {
    systemSettngs = new SystemSettngs();
});

// Exporta para uso global
wndow.SystemSettngs = SystemSettngs;

