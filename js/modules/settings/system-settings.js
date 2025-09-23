/**
 * Sistema de Configurações do TokenCafe
 * Gerencia todas as configurações e preferências do sistema
 */
class SystemSettings {
    constructor() {
        this.settings = {};
        this.defaultSettings = this.getDefaultSettings();
        this.pendingChanges = new Set();
        this.init();
    }

    /**
     * Inicializa o sistema de configurações
     */
    init() {
        this.loadSettings();
        this.setupEventListeners();
        this.setupTabs();
        this.loadNetworks();
        this.loadRPCProviders();
        this.applyCurrentSettings();
    }

    /**
     * Configurações padrão do sistema
     */
    getDefaultSettings() {
        return {
            // Geral
            language: 'pt-BR',
            timezone: 'America/Sao_Paulo',
            currency: 'USD',
            autoSave: true,
            confirmActions: true,
            showTooltips: true,

            // Aparência
            theme: 'light',
            sidebarWidth: 280,
            compactMode: false,
            sidebarCollapse: false,
            primaryColor: '#6366f1',
            secondaryColor: '#8b5cf6',
            successColor: '#10b981',
            errorColor: '#ef4444',

            // Notificações
            systemNotifications: true,
            errorNotifications: true,
            tokenCreated: true,
            tokenTransfer: true,
            priceAlerts: false,
            browserNotifications: true,
            emailNotifications: true,
            notificationSound: 'default',

            // Segurança
            sessionTimeout: 30,
            requirePassword: true,
            twoFactorAuth: false,
            analyticsTracking: false,
            crashReports: true,
            autoBackup: true,
            backupFrequency: 'daily',

            // Blockchain
            gasPrice: 20,
            gasLimit: 21000,
            autoGasEstimate: true,

            // Avançado
            debugMode: false,
            testnetMode: false,
            cacheSize: 100,
            maxConnections: 10,
            preloadData: true
        };
    }

    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Tabs de navegação
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Botões principais
        document.getElementById('saveAllSettingsBtn')?.addEventListener('click', () => this.saveAllSettings());
        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => this.resetToDefaults());

        // Configurações gerais
        this.setupGeneralListeners();
        
        // Configurações de aparência
        this.setupAppearanceListeners();
        
        // Configurações de notificações
        this.setupNotificationListeners();
        
        // Configurações de segurança
        this.setupSecurityListeners();
        
        // Configurações de blockchain
        this.setupBlockchainListeners();
        
        // Configurações avançadas
        this.setupAdvancedListeners();

        // Modal de confirmação
        this.setupConfirmModal();
    }

    /**
     * Configura listeners das configurações gerais
     */
    setupGeneralListeners() {
        const generalInputs = ['language', 'timezone', 'currency', 'autoSave', 'confirmActions', 'showTooltips'];
        
        generalInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateSetting(id, this.getElementValue(element)));
            }
        });
    }

    /**
     * Configura listeners das configurações de aparência
     */
    setupAppearanceListeners() {
        // Seletor de tema
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => this.selectTheme(option.dataset.theme));
        });

        // Largura da sidebar
        const sidebarWidth = document.getElementById('sidebarWidth');
        if (sidebarWidth) {
            sidebarWidth.addEventListener('input', (e) => {
                const value = e.target.value;
                document.querySelector('.range-value').textContent = `${value}px`;
                this.updateSetting('sidebarWidth', parseInt(value));
            });
        }

        // Checkboxes de layout
        ['compactMode', 'sidebarCollapse'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateSetting(id, element.checked));
            }
        });

        // Color pickers
        ['primaryColor', 'secondaryColor', 'successColor', 'errorColor'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateSetting(id, element.value));
            }
        });
    }

    /**
     * Configura listeners das configurações de notificações
     */
    setupNotificationListeners() {
        const notificationSettings = [
            'systemNotifications', 'errorNotifications', 'tokenCreated', 
            'tokenTransfer', 'priceAlerts', 'browserNotifications', 
            'emailNotifications', 'notificationSound'
        ];

        notificationSettings.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateSetting(id, this.getElementValue(element)));
            }
        });
    }

    /**
     * Configura listeners das configurações de segurança
     */
    setupSecurityListeners() {
        const securitySettings = [
            'sessionTimeout', 'requirePassword', 'twoFactorAuth', 
            'analyticsTracking', 'crashReports', 'autoBackup', 'backupFrequency'
        ];

        securitySettings.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateSetting(id, this.getElementValue(element)));
            }
        });

        // Botões de backup
        document.getElementById('createBackupBtn')?.addEventListener('click', () => this.createBackup());
        document.getElementById('restoreBackupBtn')?.addEventListener('click', () => this.restoreBackup());
    }

    /**
     * Configura listeners das configurações de blockchain
     */
    setupBlockchainListeners() {
        const blockchainSettings = ['gasPrice', 'gasLimit', 'autoGasEstimate'];

        blockchainSettings.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateSetting(id, this.getElementValue(element)));
            }
        });

        document.getElementById('addNetworkBtn')?.addEventListener('click', () => this.addNetwork());
    }

    /**
     * Configura listeners das configurações avançadas
     */
    setupAdvancedListeners() {
        const advancedSettings = [
            'debugMode', 'testnetMode', 'cacheSize', 
            'maxConnections', 'preloadData'
        ];

        advancedSettings.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateSetting(id, this.getElementValue(element)));
            }
        });

        // Botões de ações avançadas
        document.getElementById('clearCacheBtn')?.addEventListener('click', () => this.clearCache());
        document.getElementById('exportSettingsBtn')?.addEventListener('click', () => this.exportSettings());
        document.getElementById('importSettingsBtn')?.addEventListener('click', () => this.importSettings());
    }

    /**
     * Configura o modal de confirmação
     */
    setupConfirmModal() {
        const modal = document.getElementById('confirmModal');
        const closeBtn = document.getElementById('closeConfirmModal');
        const cancelBtn = document.getElementById('cancelConfirmBtn');
        const confirmBtn = document.getElementById('confirmActionBtn');

        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => this.closeConfirmModal());
        });

        confirmBtn?.addEventListener('click', () => this.executeConfirmedAction());
    }

    /**
     * Configura o sistema de tabs
     */
    setupTabs() {
        // Ativa a primeira tab por padrão
        this.switchTab('general');
    }

    /**
     * Troca de tab ativa
     */
    switchTab(tabName) {
        // Remove classe ativa de todas as tabs
        document.querySelectorAll('.settings-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
        });

        // Ativa a tab selecionada
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(tabName)?.classList.add('active');
    }

    /**
     * Carrega as configurações salvas
     */
    loadSettings() {
        try {
            const saved = localStorage.getItem('tokencafe_settings');
            this.settings = saved ? { ...this.defaultSettings, ...JSON.parse(saved) } : { ...this.defaultSettings };
        } catch (error) {
            console.error('Erro ao carregar configurações:', error);
            this.settings = { ...this.defaultSettings };
        }
    }

    /**
     * Aplica as configurações atuais na interface
     */
    applyCurrentSettings() {
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                this.setElementValue(element, this.settings[key]);
            }
        });

        // Aplica tema
        this.applyTheme(this.settings.theme);
        
        // Aplica largura da sidebar
        const sidebarWidth = document.getElementById('sidebarWidth');
        if (sidebarWidth) {
            document.querySelector('.range-value').textContent = `${this.settings.sidebarWidth}px`;
        }

        // Aplica seleção de tema visual
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('active', option.dataset.theme === this.settings.theme);
        });
    }

    /**
     * Atualiza uma configuração específica
     */
    updateSetting(key, value) {
        this.settings[key] = value;
        this.pendingChanges.add(key);
        
        // Auto-save se habilitado
        if (this.settings.autoSave) {
            this.saveSettings();
        }

        // Aplica mudanças imediatas
        this.applySettingChange(key, value);
    }

    /**
     * Aplica mudanças específicas imediatamente
     */
    applySettingChange(key, value) {
        switch (key) {
            case 'theme':
                this.applyTheme(value);
                break;
            case 'sidebarWidth':
                this.applySidebarWidth(value);
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
     * Aplica o tema selecionado
     */
    applyTheme(theme) {
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${theme}`);
        
        if (theme === 'auto') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        }
    }

    /**
     * Aplica largura da sidebar
     */
    applySidebarWidth(width) {
        document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
    }

    /**
     * Aplica modo compacto
     */
    applyCompactMode(compact) {
        document.body.classList.toggle('compact-mode', compact);
    }

    /**
     * Aplica idioma
     */
    applyLanguage(language) {
        document.documentElement.lang = language;
        // Aqui você implementaria a lógica de internacionalização
    }

    /**
     * Seleciona um tema
     */
    selectTheme(theme) {
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.remove('active');
        });
        document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
        this.updateSetting('theme', theme);
    }

    /**
     * Salva todas as configurações
     */
    saveAllSettings() {
        this.saveSettings();
        this.showNotification('Configurações salvas com sucesso!', 'success');
        this.pendingChanges.clear();
    }

    /**
     * Salva as configurações no localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('tokencafe_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showNotification('Erro ao salvar configurações', 'error');
        }
    }

    /**
     * Restaura configurações padrão
     */
    resetToDefaults() {
        this.showConfirmModal(
            'Restaurar Configurações Padrão',
            'Tem certeza que deseja restaurar todas as configurações para os valores padrão? Esta ação não pode ser desfeita.',
            () => {
                this.settings = { ...this.defaultSettings };
                this.applyCurrentSettings();
                this.saveSettings();
                this.showNotification('Configurações restauradas para o padrão', 'success');
                this.pendingChanges.clear();
            }
        );
    }

    /**
     * Carrega redes blockchain
     */
    loadNetworks() {
        const networkList = document.getElementById('networkList');
        if (!networkList) return;

        const networks = [
            { id: 'ethereum', name: 'Ethereum Mainnet', rpc: 'https://mainnet.infura.io/v3/', active: true },
            { id: 'polygon', name: 'Polygon', rpc: 'https://polygon-rpc.com/', active: true },
            { id: 'bsc', name: 'Binance Smart Chain', rpc: 'https://bsc-dataseed.binance.org/', active: false },
            { id: 'avalanche', name: 'Avalanche', rpc: 'https://api.avax.network/ext/bc/C/rpc', active: false }
        ];

        networkList.innerHTML = networks.map(network => `
            <div class="network-item">
                <div class="network-info">
                    <div class="network-name">${network.name}</div>
                    <div class="network-rpc">${network.rpc}</div>
                </div>
                <div class="network-actions">
                    <label class="switch">
                        <input type="checkbox" ${network.active ? 'checked' : ''} 
                               onchange="systemSettings.toggleNetwork('${network.id}', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <button class="btn-icon" onclick="systemSettings.editNetwork('${network.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon" onclick="systemSettings.removeNetwork('${network.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Carrega provedores RPC
     */
    loadRPCProviders() {
        const rpcProviders = document.getElementById('rpcProviders');
        if (!rpcProviders) return;

        const providers = [
            { name: 'Infura', status: 'connected', latency: '45ms' },
            { name: 'Alchemy', status: 'connected', latency: '52ms' },
            { name: 'QuickNode', status: 'disconnected', latency: '--' }
        ];

        rpcProviders.innerHTML = providers.map(provider => `
            <div class="rpc-provider">
                <div class="provider-info">
                    <div class="provider-name">${provider.name}</div>
                    <div class="provider-status ${provider.status}">${provider.status}</div>
                </div>
                <div class="provider-latency">${provider.latency}</div>
                <button class="btn-icon" onclick="systemSettings.testRPCProvider('${provider.name}')">
                    <i class="fas fa-sync"></i>
                </button>
            </div>
        `).join('');
    }

    /**
     * Cria backup das configurações
     */
    createBackup() {
        const backup = {
            settings: this.settings,
            timestamp: new Date().toISOString(),
            version: '1.0.0'
        };

        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tokencafe-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Backup criado com sucesso!', 'success');
    }

    /**
     * Restaura backup das configurações
     */
    restoreBackup() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const backup = JSON.parse(e.target.result);
                        if (backup.settings) {
                            this.settings = { ...this.defaultSettings, ...backup.settings };
                            this.applyCurrentSettings();
                            this.saveSettings();
                            this.showNotification('Backup restaurado com sucesso!', 'success');
                        } else {
                            throw new Error('Formato de backup inválido');
                        }
                    } catch (error) {
                        this.showNotification('Erro ao restaurar backup: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    /**
     * Limpa o cache do sistema
     */
    clearCache() {
        this.showConfirmModal(
            'Limpar Cache',
            'Tem certeza que deseja limpar todo o cache? Isso pode afetar a performance temporariamente.',
            () => {
                // Simula limpeza de cache
                setTimeout(() => {
                    this.showNotification('Cache limpo com sucesso!', 'success');
                }, 1000);
            }
        );
    }

    /**
     * Exporta configurações
     */
    exportSettings() {
        const blob = new Blob([JSON.stringify(this.settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tokencafe-settings.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Importa configurações
     */
    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const imported = JSON.parse(e.target.result);
                        this.settings = { ...this.defaultSettings, ...imported };
                        this.applyCurrentSettings();
                        this.saveSettings();
                        this.showNotification('Configurações importadas com sucesso!', 'success');
                    } catch (error) {
                        this.showNotification('Erro ao importar configurações', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    /**
     * Obtém o valor de um elemento
     */
    getElementValue(element) {
        if (element.type === 'checkbox') {
            return element.checked;
        } else if (element.type === 'number' || element.type === 'range') {
            return parseInt(element.value);
        } else {
            return element.value;
        }
    }

    /**
     * Define o valor de um elemento
     */
    setElementValue(element, value) {
        if (element.type === 'checkbox') {
            element.checked = value;
        } else {
            element.value = value;
        }
    }

    /**
     * Mostra modal de confirmação
     */
    showConfirmModal(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('active');
        this.confirmCallback = callback;
    }

    /**
     * Fecha modal de confirmação
     */
    closeConfirmModal() {
        document.getElementById('confirmModal').classList.remove('active');
        this.confirmCallback = null;
    }

    /**
     * Executa ação confirmada
     */
    executeConfirmedAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
        this.closeConfirmModal();
    }

    /**
     * Mostra notificação
     */
    showNotification(message, type = 'info') {
        // Implementação básica de notificação
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Métodos para gerenciamento de redes (placeholders)
    toggleNetwork(networkId, active) {
        console.log(`Toggle network ${networkId}:`, active);
    }

    editNetwork(networkId) {
        console.log(`Edit network ${networkId}`);
    }

    removeNetwork(networkId) {
        console.log(`Remove network ${networkId}`);
    }

    addNetwork() {
        console.log('Add new network');
    }

    testRPCProvider(providerName) {
        console.log(`Test RPC provider ${providerName}`);
    }
}

// Inicializa o sistema de configurações quando a página carrega
let systemSettings;
document.addEventListener('DOMContentLoaded', () => {
    systemSettings = new SystemSettings();
});

// Exporta para uso global
window.SystemSettings = SystemSettings;