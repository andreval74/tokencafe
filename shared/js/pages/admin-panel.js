/**
 * ================================================================================
 * ADMIN PANEL SCRIPT
 * ================================================================================
 * Script para o painel administrativo do TokenCafe
 * Funcionalidades: gestão de usuários, sistema, analytics, configurações
 * ================================================================================
 */

class AdminPanel {
    constructor() {
        this.currentSection = 'dashboard';
        this.charts = {};
        this.data = {
            users: [],
            widgets: [],
            systemMetrics: {},
            recentActivity: []
        };
        this.refreshInterval = null;
        
        this.init();
    }
    
    async init() {
        console.log('🛡️ Inicializando Admin Panel...');
        
        // Aguardar TokenCafe estar pronto
        await this.waitForTokenCafe();
        
        // Verificar permissões de admin
        await this.checkAdminPermissions();
        
        // Configurar navegação
        this.setupNavigation();
        
        // Configurar atualização automática
        this.setupAutoRefresh();
        
        // Carregar dados iniciais
        await this.loadInitialData();
        
        console.log('✅ Admin Panel inicializado com sucesso');
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
    
    async checkAdminPermissions() {
        try {
            // Verificar se usuário tem permissões de admin
            const user = await window.TokenCafe.auth.getCurrentUser();
            
            if (!user || !user.isAdmin) {
                this.showError('Acesso negado. Permissões de administrador necessárias.');
                window.location.href = '/dashboard/';
                return;
            }
            
            console.log('✅ Permissões de admin verificadas');
            
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            this.showError('Erro ao verificar permissões de acesso');
        }
    }
    
    setupNavigation() {
        // Navegação entre seções
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const section = e.target.closest('.admin-nav-link').dataset.section;
                this.switchSection(section);
            });
        });
        
        // Period selector
        document.querySelectorAll('[data-period]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const period = e.target.dataset.period;
                this.changePeriod(period);
            });
        });
        
        // Refresh button
        document.getElementById('refresh-data').addEventListener('click', () => {
            this.refreshData();
        });
    }
    
    setupAutoRefresh() {
        // Atualizar dados a cada 5 minutos
        this.refreshInterval = setInterval(() => {
            this.refreshData(false); // Silent refresh
        }, 5 * 60 * 1000);
        
        // Limpar interval quando sair da página
        window.addEventListener('beforeunload', () => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
        });
    }
    
    async loadInitialData() {
        try {
            // Carregar dados em paralelo
            const [metrics, users, widgets, activity, systemStatus] = await Promise.all([
                this.fetchMetrics(),
                this.fetchUsers(),
                this.fetchWidgets(),
                this.fetchRecentActivity(),
                this.fetchSystemStatus()
            ]);
            
            // Atualizar dados locais
            this.data = {
                metrics,
                users,
                widgets,
                recentActivity: activity,
                systemStatus
            };
            
            // Renderizar dados iniciais
            this.renderDashboard();
            this.renderUsers();
            this.renderSystemStatus();
            
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.showError('Erro ao carregar dados do painel administrativo');
        }
    }
    
    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.admin-nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === section);
        });
        
        // Update content
        document.querySelectorAll('.admin-section').forEach(sec => {
            sec.classList.toggle('active', sec.id === `${section}-section`);
        });
        
        this.currentSection = section;
        
        // Load section-specific data if needed
        this.loadSectionData(section);
    }
    
    async loadSectionData(section) {
        switch (section) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'users':
                this.renderUsers();
                break;
            case 'system':
                this.renderSystemStatus();
                this.loadSystemLogs();
                break;
            case 'analytics':
                this.renderAnalytics();
                break;
            case 'settings':
                this.loadSettings();
                break;
        }
    }
    
    // Dashboard Methods
    renderDashboard() {
        this.updateMetrics();
        this.createUserGrowthChart();
        this.createTemplatesChart();
        this.renderRecentActivity();
    }
    
    updateMetrics() {
        if (!this.data.metrics) return;
        
        const { activeUsers, totalWidgets, tradingVolume, conversionRate } = this.data.metrics;
        
        document.getElementById('active-users').textContent = activeUsers?.value.toLocaleString() || '0';
        document.getElementById('total-widgets').textContent = totalWidgets?.value.toLocaleString() || '0';
        document.getElementById('trading-volume').textContent = `${tradingVolume?.value.toLocaleString()} ETH` || '0 ETH';
        document.getElementById('conversion-rate').textContent = `${conversionRate?.value}%` || '0%';
    }
    
    createUserGrowthChart() {
        const ctx = document.getElementById('userGrowthChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.userGrowth) {
            this.charts.userGrowth.destroy();
        }
        
        this.charts.userGrowth = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'],
                datasets: [{
                    label: 'Novos Usuários',
                    data: [120, 190, 300, 500, 420, 630, 780],
                    borderColor: '#8B4513',
                    backgroundColor: 'rgba(139, 69, 19, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Usuários Ativos',
                    data: [80, 150, 250, 400, 350, 520, 650],
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
    
    createTemplatesChart() {
        const ctx = document.getElementById('templatesChart');
        if (!ctx) return;
        
        // Destroy existing chart
        if (this.charts.templates) {
            this.charts.templates.destroy();
        }
        
        this.charts.templates = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Swap', 'Price Tracker', 'Portfolio', 'Staking', 'NFT', 'Personalizado'],
                datasets: [{
                    data: [35, 25, 15, 12, 8, 5],
                    backgroundColor: [
                        '#8B4513',
                        '#A0522D',
                        '#DAA520',
                        '#CD853F',
                        '#DEB887',
                        '#F5DEB3'
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
    
    renderRecentActivity() {
        const container = document.getElementById('recent-activity');
        if (!container) return;
        
        const activities = this.data.recentActivity || this.generateMockActivity();
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item p-3">
                <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                        <i class="${activity.icon} text-${activity.color} me-3"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${activity.title}</h6>
                        <p class="text-muted mb-1 small">${activity.description}</p>
                        <small class="text-muted">${activity.timestamp}</small>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    generateMockActivity() {
        return [
            {
                title: 'Novo usuário registrado',
                description: 'maria@email.com se registrou na plataforma',
                icon: 'fas fa-user-plus',
                color: 'success',
                timestamp: 'há 5 minutos'
            },
            {
                title: 'Widget criado',
                description: 'João Silva criou um novo Swap Widget',
                icon: 'fas fa-cube',
                color: 'info',
                timestamp: 'há 12 minutos'
            },
            {
                title: 'Transação processada',
                description: 'Swap de 2.5 ETH por USDC realizado com sucesso',
                icon: 'fas fa-exchange-alt',
                color: 'primary',
                timestamp: 'há 18 minutos'
            },
            {
                title: 'Sistema atualizado',
                description: 'Deploy da versão 2.0.1 realizado com sucesso',
                icon: 'fas fa-server',
                color: 'warning',
                timestamp: 'há 1 hora'
            }
        ];
    }
    
    // Users Management
    renderUsers() {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        
        const users = this.data.users || this.generateMockUsers();
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <img src="${user.avatar || '/api/placeholder/32/32'}" 
                             class="rounded-circle me-2" width="32" height="32" alt="Avatar">
                        <div>
                            <div class="fw-bold">${user.name}</div>
                            <small class="text-muted">${user.walletAddress}</small>
                        </div>
                    </div>
                </td>
                <td>${user.email}</td>
                <td>
                    <span class="badge bg-${this.getRoleBadgeColor(user.role)}">${user.role}</span>
                </td>
                <td>
                    <span class="badge bg-${this.getStatusBadgeColor(user.status)}">${user.status}</span>
                </td>
                <td>${user.widgetCount}</td>
                <td>${this.formatDate(user.lastAccess)}</td>
                <td>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="adminPanel.editUser('${user.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-${user.status === 'active' ? 'warning' : 'success'}" 
                                onclick="adminPanel.toggleUserStatus('${user.id}')" 
                                title="${user.status === 'active' ? 'Suspender' : 'Ativar'}">
                            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger" 
                                onclick="adminPanel.deleteUser('${user.id}')" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    generateMockUsers() {
        return [
            {
                id: '1',
                name: 'João Silva',
                email: 'joao@email.com',
                walletAddress: '0x742d...2d8b',
                role: 'user',
                status: 'active',
                widgetCount: 3,
                lastAccess: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
                id: '2',
                name: 'Maria Santos',
                email: 'maria@email.com',
                walletAddress: '0x8f3c...063a',
                role: 'user',
                status: 'active',
                widgetCount: 7,
                lastAccess: new Date(Date.now() - 5 * 60 * 1000)
            },
            {
                id: '3',
                name: 'Carlos Admin',
                email: 'carlos@tokencafe.com',
                walletAddress: '0x55d3...955a',
                role: 'admin',
                status: 'active',
                widgetCount: 0,
                lastAccess: new Date(Date.now() - 30 * 60 * 1000)
            }
        ];
    }
    
    // System Status
    renderSystemStatus() {
        // Status cards are static in HTML, but we can update them here
        this.updateSystemMetrics();
    }
    
    updateSystemMetrics() {
        // Update system status indicators
        // This would connect to real system monitoring APIs
        console.log('Atualizando métricas do sistema...');
    }
    
    loadSystemLogs() {
        const logsContainer = document.getElementById('system-logs');
        if (!logsContainer) return;
        
        const mockLogs = this.generateMockLogs();
        
        logsContainer.innerHTML = mockLogs.join('\n');
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    generateMockLogs() {
        const now = new Date();
        return [
            `[${this.formatLogTime(now)}] INFO: TokenCafe application started successfully`,
            `[${this.formatLogTime(new Date(now - 60000))}] INFO: Database connection established`,
            `[${this.formatLogTime(new Date(now - 120000))}] DEBUG: User authentication service initialized`,
            `[${this.formatLogTime(new Date(now - 180000))}] INFO: Widget service started`,
            `[${this.formatLogTime(new Date(now - 240000))}] INFO: Blockchain connector initialized`,
            `[${this.formatLogTime(new Date(now - 300000))}] WARN: High memory usage detected (75%)`,
            `[${this.formatLogTime(new Date(now - 360000))}] INFO: Backup process completed successfully`,
            `[${this.formatLogTime(new Date(now - 420000))}] DEBUG: Cache cleanup completed`,
        ];
    }
    
    formatLogTime(date) {
        return date.toLocaleTimeString('pt-BR', { hour12: false });
    }
    
    // Quick Actions
    async broadcastMessage() {
        const message = prompt('Digite a mensagem para broadcast:');
        if (!message) return;
        
        try {
            await this.apiBroadcastMessage(message);
            this.showSuccess('Mensagem enviada com sucesso!');
        } catch (error) {
            console.error('Erro ao enviar broadcast:', error);
            this.showError('Erro ao enviar mensagem');
        }
    }
    
    async exportData() {
        try {
            this.showSuccess('Iniciando exportação de dados...');
            
            // Simular exportação
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Create and download mock CSV
            const csvContent = this.generateCSVData();
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `tokencafe_data_${new Date().getTime()}.csv`;
            a.click();
            
            window.URL.revokeObjectURL(url);
            this.showSuccess('Dados exportados com sucesso!');
            
        } catch (error) {
            console.error('Erro ao exportar dados:', error);
            this.showError('Erro ao exportar dados');
        }
    }
    
    generateCSVData() {
        return `Nome,Email,Status,Widgets,Último Acesso
João Silva,joao@email.com,ativo,3,${new Date().toLocaleDateString()}
Maria Santos,maria@email.com,ativo,7,${new Date().toLocaleDateString()}
Carlos Admin,carlos@tokencafe.com,ativo,0,${new Date().toLocaleDateString()}`;
    }
    
    async moderateContent() {
        this.showInfo('Abrindo ferramenta de moderação...');
        // Implementar modal de moderação ou redirecionar
    }
    
    async systemHealth() {
        try {
            this.showInfo('Executando verificação de saúde do sistema...');
            
            // Simular health check
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            this.showSuccess('Sistema operando normalmente ✅');
            
        } catch (error) {
            console.error('Erro no health check:', error);
            this.showError('Problemas detectados no sistema');
        }
    }
    
    // User Management Actions
    editUser(userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (!user) return;
        
        // Implementar modal de edição de usuário
        console.log('Editar usuário:', user);
    }
    
    async toggleUserStatus(userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (!user) return;
        
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? 'ativar' : 'suspender';
        
        const confirmed = confirm(`Deseja ${action} o usuário ${user.name}?`);
        if (!confirmed) return;
        
        try {
            await this.apiUpdateUserStatus(userId, newStatus);
            user.status = newStatus;
            this.renderUsers();
            this.showSuccess(`Usuário ${action === 'ativar' ? 'ativado' : 'suspenso'} com sucesso!`);
        } catch (error) {
            console.error('Erro ao alterar status:', error);
            this.showError('Erro ao alterar status do usuário');
        }
    }
    
    async deleteUser(userId) {
        const user = this.data.users.find(u => u.id === userId);
        if (!user) return;
        
        const confirmed = confirm(`Deseja EXCLUIR permanentemente o usuário ${user.name}?\n\nEsta ação não poderá ser desfeita!`);
        if (!confirmed) return;
        
        try {
            await this.apiDeleteUser(userId);
            this.data.users = this.data.users.filter(u => u.id !== userId);
            this.renderUsers();
            this.showSuccess('Usuário excluído com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir usuário:', error);
            this.showError('Erro ao excluir usuário');
        }
    }
    
    clearUserFilters() {
        document.getElementById('user-search').value = '';
        document.getElementById('user-status-filter').value = '';
        document.getElementById('user-role-filter').value = '';
        document.getElementById('user-sort').value = 'recent';
        
        this.renderUsers();
    }
    
    // System Actions
    async runHealthCheck() {
        await this.systemHealth();
    }
    
    async clearCache() {
        try {
            this.showInfo('Limpando cache do sistema...');
            await this.apiClearCache();
            this.showSuccess('Cache limpo com sucesso!');
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            this.showError('Erro ao limpar cache');
        }
    }
    
    async restartServices() {
        const confirmed = confirm('Deseja reiniciar os serviços? Isso pode causar indisponibilidade temporária.');
        if (!confirmed) return;
        
        try {
            this.showInfo('Reiniciando serviços...');
            await this.apiRestartServices();
            this.showSuccess('Serviços reiniciados com sucesso!');
            
            // Recarregar dados após reinicialização
            setTimeout(() => this.refreshData(), 5000);
        } catch (error) {
            console.error('Erro ao reiniciar serviços:', error);
            this.showError('Erro ao reiniciar serviços');
        }
    }
    
    // Settings
    loadSettings() {
        // Settings form is static in HTML, but we can load dynamic values here
        console.log('Carregando configurações...');
    }
    
    async saveSettings() {
        try {
            const form = document.getElementById('settings-form');
            const formData = new FormData(form);
            const settings = Object.fromEntries(formData);
            
            await this.apiSaveSettings(settings);
            this.showSuccess('Configurações salvas com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
            this.showError('Erro ao salvar configurações');
        }
    }
    
    // Backup & Security Actions
    async createBackup() {
        try {
            this.showInfo('Criando backup do sistema...');
            await this.apiCreateBackup();
            this.showSuccess('Backup criado com sucesso!');
        } catch (error) {
            console.error('Erro ao criar backup:', error);
            this.showError('Erro ao criar backup');
        }
    }
    
    viewBackups() {
        // Implementar modal para visualizar backups
        this.showInfo('Visualizar backups - Em desenvolvimento');
    }
    
    async auditSecurity() {
        try {
            this.showInfo('Executando auditoria de segurança...');
            await this.apiSecurityAudit();
            this.showSuccess('Auditoria de segurança concluída!');
        } catch (error) {
            console.error('Erro na auditoria:', error);
            this.showError('Erro na auditoria de segurança');
        }
    }
    
    // Analytics Actions
    generateReport() {
        this.showInfo('Gerando relatório... Em desenvolvimento');
    }
    
    scheduleReport() {
        this.showInfo('Agendamento de relatórios... Em desenvolvimento');
    }
    
    // Data Loading Methods
    async refreshData(showNotification = true) {
        try {
            if (showNotification) {
                this.showInfo('Atualizando dados...');
            }
            
            await this.loadInitialData();
            
            if (showNotification) {
                this.showSuccess('Dados atualizados!');
            }
            
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
            if (showNotification) {
                this.showError('Erro ao atualizar dados');
            }
        }
    }
    
    async changePeriod(period) {
        try {
            this.showInfo(`Carregando dados para: ${this.getPeriodLabel(period)}`);
            
            // Recarregar dados com novo período
            const metrics = await this.fetchMetrics(period);
            this.data.metrics = metrics;
            
            this.updateMetrics();
            this.createUserGrowthChart();
            
        } catch (error) {
            console.error('Erro ao alterar período:', error);
            this.showError('Erro ao carregar dados do período');
        }
    }
    
    getPeriodLabel(period) {
        const labels = {
            today: 'Hoje',
            week: 'Últimos 7 dias',
            month: 'Último mês',
            quarter: 'Último trimestre'
        };
        return labels[period] || period;
    }
    
    // API Methods (Mock implementation)
    async fetchMetrics(period = 'week') {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    activeUsers: { value: 1247, change: 12 },
                    totalWidgets: { value: 8542, change: 8 },
                    tradingVolume: { value: 2847, change: 15 },
                    conversionRate: { value: 3.2, change: -2 }
                });
            }, 500);
        });
    }
    
    async fetchUsers() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.generateMockUsers());
            }, 300);
        });
    }
    
    async fetchWidgets() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve([]);
            }, 200);
        });
    }
    
    async fetchRecentActivity() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve(this.generateMockActivity());
            }, 400);
        });
    }
    
    async fetchSystemStatus() {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    webServer: 'online',
                    database: 'connected',
                    memory: 75,
                    storage: 45
                });
            }, 600);
        });
    }
    
    // API Actions (Mock)
    async apiBroadcastMessage(message) {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    async apiUpdateUserStatus(userId, status) {
        return new Promise(resolve => setTimeout(resolve, 500));
    }
    
    async apiDeleteUser(userId) {
        return new Promise(resolve => setTimeout(resolve, 800));
    }
    
    async apiClearCache() {
        return new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    async apiRestartServices() {
        return new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    async apiSaveSettings(settings) {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    async apiCreateBackup() {
        return new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    async apiSecurityAudit() {
        return new Promise(resolve => setTimeout(resolve, 4000));
    }
    
    // Utility Methods
    getRoleBadgeColor(role) {
        const colors = {
            admin: 'danger',
            moderator: 'warning',
            user: 'primary'
        };
        return colors[role] || 'secondary';
    }
    
    getStatusBadgeColor(status) {
        const colors = {
            active: 'success',
            inactive: 'warning',
            banned: 'danger'
        };
        return colors[status] || 'secondary';
    }
    
    formatDate(date) {
        return new Date(date).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

// CSS adicional para admin sections
const adminCSS = `
.admin-section {
    display: none;
}

.admin-section.active {
    display: block;
}

.admin-nav-link {
    display: block;
    text-decoration: none;
}

.admin-nav-link:hover {
    text-decoration: none;
}

@media (max-width: 991.98px) {
    .admin-sidebar {
        display: none !important;
    }
}
`;

// Adicionar CSS ao documento
const adminStyle = document.createElement('style');
adminStyle.textContent = adminCSS;
document.head.appendChild(adminStyle);

// Inicializar quando DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    // Verificar se usuário tem permissões antes de inicializar
    window.adminPanel = new AdminPanel();
});

// Destruir charts quando sair da página para evitar memory leaks
window.addEventListener('beforeunload', function() {
    if (window.adminPanel && window.adminPanel.charts) {
        Object.values(window.adminPanel.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
    }
});