class UserProfile {
    constructor() {
        this.currentTab = 'overview';
        this.userData = {
            name: 'João Silva',
            username: 'joaosilva',
            bio: 'Desenvolvedor blockchain apaixonado por DeFi e NFTs. Criando o futuro das finanças descentralizadas.',
            email: 'joao@example.com',
            website: '',
            location: 'São Paulo, Brasil',
            avatar: 'https://via.placeholder.com/120x120/6366f1/ffffff?text=U',
            banner: 'https://via.placeholder.com/1200x300/4f46e5/ffffff?text=Banner'
        };
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserData();
        this.loadOverviewData();
    }

    setupEventListeners() {
        // Navegação entre abas
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Botões do header
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.openEditModal();
        });

        document.getElementById('shareProfileBtn').addEventListener('click', () => {
            this.shareProfile();
        });

        document.getElementById('changeAvatarBtn').addEventListener('click', () => {
            this.changeAvatar();
        });

        document.getElementById('changeBannerBtn').addEventListener('click', () => {
            this.changeBanner();
        });

        // Modal de edição
        document.getElementById('closeEditModal').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('cancelEditBtn').addEventListener('click', () => {
            this.closeEditModal();
        });

        document.getElementById('editProfileForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProfile();
        });

        // Configurações
        document.getElementById('personalInfoForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.savePersonalInfo();
        });

        document.getElementById('notificationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveNotificationPreferences();
        });

        document.getElementById('changePasswordBtn').addEventListener('click', () => {
            this.openPasswordModal();
        });

        document.getElementById('enable2FABtn').addEventListener('click', () => {
            this.enable2FA();
        });

        document.getElementById('downloadDataBtn').addEventListener('click', () => {
            this.downloadUserData();
        });

        // Modal de senha
        document.getElementById('closePasswordModal').addEventListener('click', () => {
            this.closePasswordModal();
        });

        document.getElementById('cancelPasswordBtn').addEventListener('click', () => {
            this.closePasswordModal();
        });

        document.getElementById('changePasswordForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.changePassword();
        });

        // Filtros de tokens
        document.getElementById('tokenStatusFilter').addEventListener('change', () => {
            this.filterUserTokens();
        });

        document.getElementById('tokenTypeFilter').addEventListener('change', () => {
            this.filterUserTokens();
        });

        document.getElementById('tokenSearch').addEventListener('input', () => {
            this.filterUserTokens();
        });

        // Filtros de atividade
        document.getElementById('activityTypeFilter').addEventListener('change', () => {
            this.filterActivity();
        });

        document.getElementById('activityDateFilter').addEventListener('change', () => {
            this.filterActivity();
        });

        // Fechar modais clicando fora
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeAllModals();
            }
        });
    }

    switchTab(tabName) {
        // Atualizar navegação
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Atualizar conteúdo
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;

        // Carregar dados específicos da aba
        switch (tabName) {
            case 'overview':
                this.loadOverviewData();
                break;
            case 'tokens':
                this.loadUserTokens();
                break;
            case 'activity':
                this.loadActivity();
                break;
            case 'achievements':
                this.loadAchievements();
                break;
        }
    }

    loadUserData() {
        document.getElementById('profileName').textContent = this.userData.name;
        document.getElementById('profileBio').textContent = this.userData.bio;
        document.getElementById('profileAvatar').src = this.userData.avatar;
        
        // Atualizar banner se existir
        if (this.userData.banner) {
            document.querySelector('.profile-banner').style.backgroundImage = `url(${this.userData.banner})`;
        }
    }

    async loadOverviewData() {
        try {
            // Carregar dados do resumo
            await this.loadWalletSummary();
            await this.loadPerformanceChart();
            await this.loadTopTokens();
            await this.loadRecentActivity();
        } catch (error) {
            console.error('Erro ao carregar dados da visão geral:', error);
        }
    }

    async loadWalletSummary() {
        // Dados mockados - em produção viriam de uma API
        const walletData = {
            totalBalance: 12450.00,
            activeTokens: 15,
            stakingValue: 3200.00
        };

        // Atualizar estatísticas no header
        const stats = document.querySelectorAll('.profile-stats .stat-value');
        stats[0].textContent = walletData.activeTokens;
        stats[1].textContent = this.formatCurrency(walletData.totalBalance);
        stats[2].textContent = '850'; // Seguidores
    }

    async loadPerformanceChart() {
        // Simular dados de performance
        const canvas = document.getElementById('performanceChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Dados mockados para o gráfico
        const data = [100, 120, 110, 140, 130, 160, 150, 180, 170, 200];
        const labels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];

        this.drawLineChart(ctx, data, labels, canvas.width, canvas.height);
    }

    drawLineChart(ctx, data, labels, width, height) {
        const padding = 40;
        const chartWidth = width - 2 * padding;
        const chartHeight = height - 2 * padding;
        
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const valueRange = maxValue - minValue;

        // Limpar canvas
        ctx.clearRect(0, 0, width, height);

        // Configurar estilo
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 2;
        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';

        // Desenhar linha
        ctx.beginPath();
        data.forEach((value, index) => {
            const x = padding + (index * chartWidth) / (data.length - 1);
            const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Preencher área sob a linha
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.closePath();
        ctx.fill();
    }

    async loadTopTokens() {
        const topTokens = [
            { name: 'CafeToken', symbol: 'CAFE', change: '+12.5%', value: '$2,450' },
            { name: 'DeFiCoin', symbol: 'DEFI', change: '+8.3%', value: '$1,890' },
            { name: 'GameToken', symbol: 'GAME', change: '-2.1%', value: '$1,200' }
        ];

        const container = document.getElementById('topTokens');
        container.innerHTML = topTokens.map(token => `
            <div class="token-item">
                <div class="token-info">
                    <span class="token-name">${token.name}</span>
                    <span class="token-symbol">${token.symbol}</span>
                </div>
                <div class="token-stats">
                    <span class="token-value">${token.value}</span>
                    <span class="token-change ${token.change.startsWith('+') ? 'positive' : 'negative'}">
                        ${token.change}
                    </span>
                </div>
            </div>
        `).join('');
    }

    async loadRecentActivity() {
        const activities = [
            { type: 'create', description: 'Token CafeToken criado', time: '2 horas atrás' },
            { type: 'transfer', description: 'Transferência de 1000 DEFI', time: '5 horas atrás' },
            { type: 'stake', description: 'Staking de 500 GAME iniciado', time: '1 dia atrás' }
        ];

        const container = document.getElementById('recentActivity');
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <span class="activity-description">${activity.description}</span>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }

    async loadUserTokens() {
        const tokens = [
            {
                id: 1,
                name: 'CafeToken',
                symbol: 'CAFE',
                type: 'erc20',
                status: 'active',
                supply: '1,000,000',
                holders: 1250,
                value: '$2,450'
            },
            {
                id: 2,
                name: 'DeFi Collection',
                symbol: 'DEFI',
                type: 'erc721',
                status: 'active',
                supply: '10,000',
                holders: 890,
                value: '$1,890'
            },
            {
                id: 3,
                name: 'GameAssets',
                symbol: 'GAME',
                type: 'erc1155',
                status: 'paused',
                supply: '50,000',
                holders: 650,
                value: '$1,200'
            }
        ];

        const container = document.getElementById('userTokensGrid');
        container.innerHTML = tokens.map(token => this.createTokenCard(token)).join('');
    }

    createTokenCard(token) {
        const statusColors = {
            active: '#10b981',
            paused: '#f59e0b',
            completed: '#6b7280'
        };

        return `
            <div class="user-token-card">
                <div class="token-header">
                    <div class="token-info">
                        <h3>${token.name}</h3>
                        <span class="token-symbol">${token.symbol}</span>
                    </div>
                    <span class="token-status" style="background-color: ${statusColors[token.status]}">
                        ${token.status}
                    </span>
                </div>
                <div class="token-stats">
                    <div class="stat">
                        <label>Tipo:</label>
                        <span>${token.type.toUpperCase()}</span>
                    </div>
                    <div class="stat">
                        <label>Supply:</label>
                        <span>${token.supply}</span>
                    </div>
                    <div class="stat">
                        <label>Holders:</label>
                        <span>${token.holders}</span>
                    </div>
                    <div class="stat">
                        <label>Valor:</label>
                        <span>${token.value}</span>
                    </div>
                </div>
                <div class="token-actions">
                    <button class="btn btn-sm btn-primary">Gerenciar</button>
                    <button class="btn btn-sm btn-secondary">Analytics</button>
                </div>
            </div>
        `;
    }

    async loadActivity() {
        const activities = [
            {
                type: 'create',
                title: 'Token Criado',
                description: 'CafeToken (CAFE) foi criado com sucesso',
                timestamp: '2024-01-20T10:30:00Z',
                details: { tokenName: 'CafeToken', supply: '1,000,000' }
            },
            {
                type: 'transfer',
                title: 'Transferência Realizada',
                description: 'Transferiu 1000 DEFI para 0x1234...5678',
                timestamp: '2024-01-20T08:15:00Z',
                details: { amount: '1000', token: 'DEFI', to: '0x1234...5678' }
            },
            {
                type: 'stake',
                title: 'Staking Iniciado',
                description: 'Iniciou staking de 500 GAME tokens',
                timestamp: '2024-01-19T16:45:00Z',
                details: { amount: '500', token: 'GAME', duration: '30 dias' }
            },
            {
                type: 'trade',
                title: 'Negociação Executada',
                description: 'Trocou 100 ETH por 50,000 CAFE',
                timestamp: '2024-01-19T14:20:00Z',
                details: { from: '100 ETH', to: '50,000 CAFE' }
            }
        ];

        const container = document.getElementById('activityTimeline');
        container.innerHTML = activities.map(activity => this.createActivityItem(activity)).join('');
    }

    createActivityItem(activity) {
        const date = new Date(activity.timestamp);
        const formattedDate = date.toLocaleDateString('pt-BR');
        const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="timeline-item">
                <div class="timeline-marker">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <h4>${activity.title}</h4>
                        <span class="timeline-date">${formattedDate} às ${formattedTime}</span>
                    </div>
                    <p class="timeline-description">${activity.description}</p>
                    <div class="timeline-details">
                        ${Object.entries(activity.details).map(([key, value]) => 
                            `<span class="detail-item"><strong>${key}:</strong> ${value}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    async loadAchievements() {
        const achievements = [
            {
                id: 1,
                name: 'Primeiro Token',
                description: 'Criou seu primeiro token',
                icon: 'trophy',
                earned: true,
                date: '2024-01-15'
            },
            {
                id: 2,
                name: 'Token Popular',
                description: 'Token com mais de 1000 holders',
                icon: 'users',
                earned: true,
                date: '2024-01-18'
            },
            {
                id: 3,
                name: 'Volume Milionário',
                description: 'Atingiu $1M em volume total',
                icon: 'chart-line',
                earned: true,
                date: '2024-01-20'
            },
            {
                id: 4,
                name: 'Colecionador NFT',
                description: 'Criou 5 coleções NFT',
                icon: 'images',
                earned: false,
                progress: 60
            },
            {
                id: 5,
                name: 'DeFi Master',
                description: 'Implementou 10 contratos DeFi',
                icon: 'coins',
                earned: false,
                progress: 30
            }
        ];

        const container = document.getElementById('achievementsGrid');
        container.innerHTML = achievements.map(achievement => this.createAchievementCard(achievement)).join('');
    }

    createAchievementCard(achievement) {
        return `
            <div class="achievement-card ${achievement.earned ? 'earned' : 'locked'}">
                <div class="achievement-icon">
                    <i class="fas fa-${achievement.icon}"></i>
                </div>
                <div class="achievement-content">
                    <h3>${achievement.name}</h3>
                    <p>${achievement.description}</p>
                    ${achievement.earned ? 
                        `<span class="achievement-date">Conquistado em ${this.formatDate(achievement.date)}</span>` :
                        `<div class="achievement-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${achievement.progress}%"></div>
                            </div>
                            <span class="progress-text">${achievement.progress}%</span>
                        </div>`
                    }
                </div>
            </div>
        `;
    }

    filterUserTokens() {
        // Implementar filtros de tokens
        const statusFilter = document.getElementById('tokenStatusFilter').value;
        const typeFilter = document.getElementById('tokenTypeFilter').value;
        const searchTerm = document.getElementById('tokenSearch').value.toLowerCase();

        // Lógica de filtro seria implementada aqui
        console.log('Filtrando tokens:', { statusFilter, typeFilter, searchTerm });
    }

    filterActivity() {
        // Implementar filtros de atividade
        const typeFilter = document.getElementById('activityTypeFilter').value;
        const dateFilter = document.getElementById('activityDateFilter').value;

        console.log('Filtrando atividades:', { typeFilter, dateFilter });
    }

    openEditModal() {
        // Preencher formulário com dados atuais
        document.getElementById('editName').value = this.userData.name;
        document.getElementById('editUsername').value = this.userData.username;
        document.getElementById('editBio').value = this.userData.bio;
        document.getElementById('editWebsite').value = this.userData.website;
        document.getElementById('editLocation').value = this.userData.location;

        document.getElementById('editProfileModal').style.display = 'flex';
    }

    closeEditModal() {
        document.getElementById('editProfileModal').style.display = 'none';
    }

    async saveProfile() {
        const formData = {
            name: document.getElementById('editName').value,
            username: document.getElementById('editUsername').value,
            bio: document.getElementById('editBio').value,
            website: document.getElementById('editWebsite').value,
            location: document.getElementById('editLocation').value
        };

        try {
            // Simular salvamento
            await this.delay(1000);
            
            // Atualizar dados locais
            Object.assign(this.userData, formData);
            this.loadUserData();
            
            this.closeEditModal();
            this.showNotification('Perfil atualizado com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar perfil:', error);
            this.showNotification('Erro ao salvar perfil', 'error');
        }
    }

    shareProfile() {
        const profileUrl = `${window.location.origin}/profile/${this.userData.username}`;
        
        if (navigator.share) {
            navigator.share({
                title: `Perfil de ${this.userData.name}`,
                text: this.userData.bio,
                url: profileUrl
            });
        } else {
            // Fallback para copiar URL
            navigator.clipboard.writeText(profileUrl).then(() => {
                this.showNotification('Link do perfil copiado!', 'success');
            });
        }
    }

    changeAvatar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.userData.avatar = e.target.result;
                    document.getElementById('profileAvatar').src = e.target.result;
                    this.showNotification('Avatar atualizado!', 'success');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    changeBanner() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.userData.banner = e.target.result;
                    document.querySelector('.profile-banner').style.backgroundImage = `url(${e.target.result})`;
                    this.showNotification('Banner atualizado!', 'success');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }

    async savePersonalInfo() {
        try {
            await this.delay(1000);
            this.showNotification('Informações pessoais salvas!', 'success');
        } catch (error) {
            this.showNotification('Erro ao salvar informações', 'error');
        }
    }

    async saveNotificationPreferences() {
        try {
            await this.delay(1000);
            this.showNotification('Preferências de notificação salvas!', 'success');
        } catch (error) {
            this.showNotification('Erro ao salvar preferências', 'error');
        }
    }

    openPasswordModal() {
        document.getElementById('changePasswordModal').style.display = 'flex';
    }

    closePasswordModal() {
        document.getElementById('changePasswordModal').style.display = 'none';
        document.getElementById('changePasswordForm').reset();
    }

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            this.showNotification('As senhas não coincidem', 'error');
            return;
        }

        try {
            await this.delay(1000);
            this.closePasswordModal();
            this.showNotification('Senha alterada com sucesso!', 'success');
        } catch (error) {
            this.showNotification('Erro ao alterar senha', 'error');
        }
    }

    enable2FA() {
        this.showNotification('Funcionalidade 2FA em desenvolvimento', 'info');
    }

    downloadUserData() {
        const userData = {
            profile: this.userData,
            tokens: [], // Seria preenchido com dados reais
            activities: [], // Seria preenchido com dados reais
            achievements: [] // Seria preenchido com dados reais
        };

        const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tokencafe_user_data_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showNotification('Dados baixados com sucesso!', 'success');
    }

    closeAllModals() {
        this.closeEditModal();
        this.closePasswordModal();
    }

    getActivityIcon(type) {
        const icons = {
            create: 'plus-circle',
            transfer: 'exchange-alt',
            trade: 'chart-line',
            stake: 'lock'
        };
        return icons[type] || 'circle';
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-BR');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        notification.querySelector('.notification-close').addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new UserProfile();
});