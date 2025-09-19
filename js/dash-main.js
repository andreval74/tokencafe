/**
 * ================================================================================
 * DASHBOARD MAIN - JAVASCRIPT PRINCIPAL DO DASHBOARD
 * ================================================================================
 * Sistema de dashboard TokenCafe
 * Integração com Web3ConnectionManager existente
 * ================================================================================
 */

class DashboardManager {
    constructor() {
        this.currentPage = 'overview';
        this.init();
    }

    async init() {
        console.log('🎯 Inicializando Dashboard Manager...');
        
        // Verificar se está conectado
        await this.checkConnection();
        
        // Configurar navegação
        this.setupNavigation();
        
        // Carregar página inicial
        this.showPage('overview');
        
        console.log('✅ Dashboard Manager inicializado');
    }

    async checkConnection() {
        const walletAddress = localStorage.getItem('tokencafe_wallet_address');
        if (!walletAddress) {
            // Redirecionar para página principal se não estiver conectado
            window.location.href = '../pages/index.html';
            return;
        }

        // Atualizar informações da wallet na interface
        this.updateWalletInfo(walletAddress);
    }

    updateWalletInfo(address) {
        const addressElements = document.querySelectorAll('.wallet-address');
        const networkId = localStorage.getItem('tokencafe_network_id') || '1';
        
        const networks = {
            '1': 'Ethereum Mainnet',
            '56': 'BSC Mainnet', 
            '137': 'Polygon Mainnet',
            '11155111': 'Sepolia Testnet'
        };

        addressElements.forEach(element => {
            element.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
        });

        const networkElements = document.querySelectorAll('.network-name');
        networkElements.forEach(element => {
            element.textContent = networks[networkId] || 'Rede Desconhecida';
        });
    }

    setupNavigation() {
        const menuItems = document.querySelectorAll('.menu-item');
        
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remover classe active de todos os itens
                menuItems.forEach(i => i.classList.remove('active'));
                // Adicionar classe active ao item clicado
                item.classList.add('active');
                
                // Navegar para a página
                const page = item.dataset.page;
                this.showPage(page);
            });
        });
    }

    showPage(page) {
        this.currentPage = page;

        // Atualizar título
        const pageTitle = document.getElementById('page-title');
        const titles = {
            'overview': 'Visão Geral',
            'tokens': 'Meus Tokens',
            'create': 'Criar Token',
            'analytics': 'Analytics',
            'templates': 'Templates',
            'marketplace': 'Marketplace',
            'profile': 'Meu Perfil',
            'settings': 'Configurações'
        };

        if (pageTitle) {
            pageTitle.textContent = titles[page] || 'Dashboard';
        }

        // Mostrar conteúdo apropriado
        if (page === 'overview') {
            this.showOverview();
        } else if (page === 'profile') {
            this.showProfilePage();
        } else if (page === 'settings') {
            this.showSettingsPage();
        } else {
            this.showPlaceholder(page);
        }
    }

    showOverview() {
        document.getElementById('overview-content').style.display = 'block';
        document.getElementById('dynamic-content').style.display = 'none';

        // Personalizar mensagem de boas-vindas
        this.personalizeWelcomeMessage();
    }

    // Personalizar mensagem de boas-vindas
    personalizeWelcomeMessage() {
        const userProfile = this.loadUserProfile();
        const welcomeSection = document.querySelector('.wallet-info-card');

        if (welcomeSection && userProfile.displayName) {
            const welcomeText = welcomeSection.querySelector('h3');
            const subText = welcomeSection.querySelector('p');

            if (welcomeText) {
                welcomeText.innerHTML = `<i class="fas fa-hand-wave me-2"></i>Olá, ${userProfile.displayName}!`;
            }
            
            if (subText) {
                subText.textContent = `Bem-vindo de volta ao seu dashboard personalizado. Gerencie seus tokens com facilidade.`;
            }
        }
    }

    // Carregar perfil do usuário do localStorage
    loadUserProfile() {
        const walletAddress = localStorage.getItem('tokencafe_wallet_address');
        if (!walletAddress) return {};

        const profileKey = `tokencafe_profile_${walletAddress}`;
        const savedProfile = localStorage.getItem(profileKey);
        
        return savedProfile ? JSON.parse(savedProfile) : {};
    }

    // Salvar perfil do usuário no localStorage
    saveUserProfile(profileData) {
        const walletAddress = localStorage.getItem('tokencafe_wallet_address');
        if (!walletAddress) return;

        const profileKey = `tokencafe_profile_${walletAddress}`;
        localStorage.setItem(profileKey, JSON.stringify(profileData));
    }

    // Salvar perfil (chamado pelo form)
    saveProfile() {
        const displayName = document.getElementById('display-name')?.value || '';
        const contactEmail = document.getElementById('contact-email')?.value || '';
        const preferredLanguage = document.getElementById('preferred-language')?.value || 'pt-BR';
        const preferredNetwork = document.getElementById('preferred-network')?.value || '1';
        const bio = document.getElementById('user-bio')?.value || '';
        const notificationsEnabled = document.getElementById('notifications-enabled')?.checked || false;
        const analyticsEnabled = document.getElementById('analytics-enabled')?.checked !== false;

        const profileData = {
            displayName,
            contactEmail,
            preferredLanguage,
            preferredNetwork,
            bio,
            notificationsEnabled,
            analyticsEnabled,
            updatedAt: new Date().toISOString()
        };

        this.saveUserProfile(profileData);
        this.showNotification('Perfil salvo com sucesso! 🎉', 'success');
        
        // Atualizar mensagem de boas-vindas se estiver na overview
        if (this.currentPage === 'overview') {
            this.personalizeWelcomeMessage();
        }
    }

    showPlaceholder(page) {
        document.getElementById('overview-content').style.display = 'none';
        document.getElementById('dynamic-content').style.display = 'block';

        const titles = {
            'tokens': 'Meus Tokens',
            'create': 'Criar Token',
            'analytics': 'Analytics',
            'templates': 'Templates',
            'marketplace': 'Marketplace'
        };

        const descriptions = {
            'tokens': 'Gerencie todos os seus tokens em um só lugar',
            'create': 'Crie seu próprio token personalizado',
            'analytics': 'Acompanhe métricas detalhadas dos seus projetos',
            'templates': 'Escolha entre templates profissionais',
            'marketplace': 'Explore tokens e projetos da comunidade'
        };

        document.getElementById('dynamic-content').innerHTML = `
            <div class="text-center py-5">
                <div class="dashboard-card p-5" style="max-width: 600px; margin: 0 auto;">
                    <i class="fas fa-cogs fa-3x text-muted mb-4"></i>
                    <h3 class="text-white mb-3">${titles[page] || 'Em Desenvolvimento'}</h3>
                    <p class="text-muted mb-4 lead">
                        ${descriptions[page] || 'Esta funcionalidade está sendo desenvolvida e estará disponível em breve.'}
                    </p>
                    <div class="alert alert-info" role="alert" style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--tokencafe-info); color: var(--tokencafe-info);">
                        <i class="fas fa-info-circle me-2"></i>
                        <strong>Status:</strong> Em desenvolvimento ativo. Fique ligado nas atualizações!
                    </div>
                </div>
            </div>
        `;
    }

    // Página de Perfil
    showProfilePage() {
        const userProfile = this.loadUserProfile();
        
        document.getElementById('overview-content').style.display = 'none';
        document.getElementById('dynamic-content').style.display = 'block';
        
        document.getElementById('dynamic-content').innerHTML = `
            <div class="container-fluid">
                <div class="dashboard-card p-4">
                    <div class="d-flex align-items-center mb-4">
                        <div class="bg-primary rounded-circle p-3 me-3" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-user fa-2x text-white"></i>
                        </div>
                        <div>
                            <h4 class="text-white mb-1">Meu Perfil</h4>
                            <p class="text-muted mb-0">Personalize sua experiência no TokenCafe</p>
                        </div>
                    </div>

                    <div class="alert alert-info mb-4" role="alert" style="background: rgba(59, 130, 246, 0.1); border: 1px solid var(--tokencafe-info); color: var(--tokencafe-info);">
                        <i class="fas fa-info-circle me-2" style="color: var(--tokencafe-info);"></i>
                        <strong>Registro Opcional:</strong> Seus dados são salvos localmente apenas para melhorar sua experiência. 
                        Tudo funciona via blockchain, mesmo sem preencher estes campos.
                    </div>

                    <form id="profile-form">
                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="display-name" class="form-label text-white fw-medium">
                                    <i class="fas fa-user me-2" style="color: var(--tokencafe-primary);"></i>Nome de Exibição
                                </label>
                                <input type="text" class="form-control tokencafe-input" id="display-name" 
                                       placeholder="Como deseja ser chamado?" 
                                       value="${userProfile.displayName || ''}"
                                       maxlength="50"
                                       style="background: rgba(26, 26, 26, 0.8); border: 1px solid var(--tokencafe-border-medium); color: var(--tokencafe-text-primary); border-radius: 8px;">
                                <small class="text-muted">Opcional - apenas para personalização</small>
                            </div>
                            
                            <div class="col-md-6 mb-3">
                                <label for="contact-email" class="form-label text-white fw-medium">
                                    <i class="fas fa-envelope me-2" style="color: var(--tokencafe-primary);"></i>Email de Contato
                                </label>
                                <input type="email" class="form-control tokencafe-input" id="contact-email" 
                                       placeholder="email@exemplo.com" 
                                       value="${userProfile.contactEmail || ''}"
                                       maxlength="100"
                                       style="background: rgba(26, 26, 26, 0.8); border: 1px solid var(--tokencafe-border-medium); color: var(--tokencafe-text-primary); border-radius: 8px;">
                                <small class="text-muted">Opcional - para suporte e novidades</small>
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="preferred-language" class="form-label text-white fw-medium">
                                    <i class="fas fa-globe me-2" style="color: var(--tokencafe-primary);"></i>Idioma Preferido
                                </label>
                                <select class="form-select tokencafe-select" id="preferred-language" style="background: rgba(26, 26, 26, 0.8); border: 1px solid var(--tokencafe-border-medium); color: var(--tokencafe-text-primary); border-radius: 8px;">
                                    <option value="pt-BR" ${userProfile.preferredLanguage === 'pt-BR' ? 'selected' : ''}>Português (Brasil)</option>
                                    <option value="en-US" ${userProfile.preferredLanguage === 'en-US' ? 'selected' : ''}>English (US)</option>
                                    <option value="es-ES" ${userProfile.preferredLanguage === 'es-ES' ? 'selected' : ''}>Español</option>
                                </select>
                            </div>
                            
                            <div class="col-md-6 mb-3">
                                <label for="preferred-network" class="form-label text-white fw-medium">
                                    <i class="fas fa-network-wired me-2" style="color: var(--tokencafe-primary);"></i>Rede Blockchain Preferida
                                </label>
                                <select class="form-select tokencafe-select" id="preferred-network" style="background: rgba(26, 26, 26, 0.8); border: 1px solid var(--tokencafe-border-medium); color: var(--tokencafe-text-primary); border-radius: 8px;">
                                    <option value="1" ${userProfile.preferredNetwork === '1' ? 'selected' : ''}>Ethereum Mainnet</option>
                                    <option value="56" ${userProfile.preferredNetwork === '56' ? 'selected' : ''}>BSC Mainnet</option>
                                    <option value="137" ${userProfile.preferredNetwork === '137' ? 'selected' : ''}>Polygon Mainnet</option>
                                    <option value="11155111" ${userProfile.preferredNetwork === '11155111' ? 'selected' : ''}>Sepolia Testnet</option>
                                </select>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="user-bio" class="form-label text-white fw-medium">
                                <i class="fas fa-edit me-2" style="color: var(--tokencafe-primary);"></i>Sobre Você
                            </label>
                            <textarea class="form-control tokencafe-input" id="user-bio" rows="3" 
                                      placeholder="Conte um pouco sobre você ou seu projeto..."
                                      maxlength="500"
                                      style="background: rgba(26, 26, 26, 0.8); border: 1px solid var(--tokencafe-border-medium); color: var(--tokencafe-text-primary); border-radius: 8px; resize: vertical;">${userProfile.bio || ''}</textarea>
                            <small class="text-muted">Opcional - máximo 500 caracteres</small>
                        </div>

                        <div class="mb-4">
                            <h6 class="text-white fw-medium mb-3">
                                <i class="fas fa-cogs me-2" style="color: var(--tokencafe-primary);"></i>Preferências
                            </h6>
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-check form-switch mb-3">
                                        <input class="form-check-input" type="checkbox" id="notifications-enabled" 
                                               ${userProfile.notificationsEnabled ? 'checked' : ''}
                                               style="background-color: ${userProfile.notificationsEnabled ? 'var(--tokencafe-primary)' : 'var(--tokencafe-bg-quaternary)'};">
                                        <label class="form-check-label text-white" for="notifications-enabled">
                                            <i class="fas fa-bell me-2"></i>Receber notificações no dashboard
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-check form-switch mb-3">
                                        <input class="form-check-input" type="checkbox" id="analytics-enabled" 
                                               ${userProfile.analyticsEnabled !== false ? 'checked' : ''}
                                               style="background-color: ${userProfile.analyticsEnabled !== false ? 'var(--tokencafe-primary)' : 'var(--tokencafe-bg-quaternary)'};">
                                        <label class="form-check-label text-white" for="analytics-enabled">
                                            <i class="fas fa-chart-bar me-2"></i>Permitir analytics para melhorar o produto
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="d-flex gap-3">
                            <button type="button" class="btn btn-primary px-4 py-2" onclick="dashboard.saveProfile()" 
                                    style="background: linear-gradient(45deg, var(--tokencafe-primary), var(--tokencafe-primary-light)); border: none; border-radius: 8px; font-weight: 500;">
                                <i class="fas fa-save me-2"></i>Salvar Perfil
                            </button>
                            <button type="button" class="btn btn-outline-secondary px-4 py-2" onclick="dashboard.showPage('overview')"
                                    style="border: 1px solid var(--tokencafe-border-medium); color: var(--tokencafe-text-secondary); border-radius: 8px;">
                                <i class="fas fa-arrow-left me-2"></i>Voltar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    }

    // Sistema de notificações
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        
        let bgColor, borderColor, iconClass, textColor;
        switch(type) {
            case 'success':
                bgColor = 'rgba(34, 197, 94, 0.1)';
                borderColor = 'var(--tokencafe-success)';
                iconClass = 'fas fa-check-circle';
                textColor = 'var(--tokencafe-success)';
                break;
            case 'warning':
                bgColor = 'rgba(251, 191, 36, 0.1)';
                borderColor = 'var(--tokencafe-warning)';
                iconClass = 'fas fa-exclamation-triangle';
                textColor = 'var(--tokencafe-warning)';
                break;
            case 'error':
                bgColor = 'rgba(239, 68, 68, 0.1)';
                borderColor = 'var(--tokencafe-danger)';
                iconClass = 'fas fa-exclamation-circle';
                textColor = 'var(--tokencafe-danger)';
                break;
            default:
                bgColor = 'rgba(59, 130, 246, 0.1)';
                borderColor = 'var(--tokencafe-info)';
                iconClass = 'fas fa-info-circle';
                textColor = 'var(--tokencafe-info)';
        }

        notification.className = 'tokencafe-notification position-fixed';
        notification.style.cssText = `
            top: 20px; 
            right: 20px; 
            z-index: 9999; 
            max-width: 400px;
            padding: 16px 20px;
            background: ${bgColor};
            border: 1px solid ${borderColor};
            border-radius: 12px;
            backdrop-filter: blur(10px);
            animation: slideInRight 0.3s ease-out;
        `;

        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="${iconClass} me-3" style="color: ${textColor}; font-size: 1.2rem;"></i>
                <div class="flex-grow-1" style="color: var(--tokencafe-text-primary); font-weight: 500;">
                    ${message}
                </div>
                <button type="button" class="btn-close ms-3" 
                        style="filter: invert(1); opacity: 0.8;" 
                        onclick="this.parentElement.parentElement.remove()"></button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remover após 4 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 4000);
    }

    // Página de Configurações
    showSettingsPage() {
        document.getElementById('dynamic-content').innerHTML = `
            <div class="container-fluid">
                <div class="dashboard-card p-4">
                    <h5 class="text-white mb-4">
                        <i class="fas fa-cog me-2"></i>Configurações do Sistema
                    </h5>
                    
                    <div class="alert alert-warning" role="alert">
                        <i class="fas fa-tools me-2"></i>
                        <strong>Em Desenvolvimento:</strong> Configurações avançadas estarão disponíveis em breve!
                    </div>

                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="text-white">Tema</h6>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" id="dark-mode" checked disabled>
                                <label class="form-check-label text-muted" for="dark-mode">
                                    Modo Escuro (Em breve)
                                </label>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <h6 class="text-white">Segurança</h6>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" id="auto-lock" disabled>
                                <label class="form-check-label text-muted" for="auto-lock">
                                    Auto-desconectar após inatividade (Em breve)
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

// Funções globais
function disconnectWallet() {
    localStorage.removeItem('tokencafe_wallet_address');
    localStorage.removeItem('tokencafe_network_id');
    localStorage.removeItem('tokencafe_dashboard_data');
    window.location.href = '../pages/index.html';
}

function showCreateToken() {
    dashboard.showPage('create');
}

function showTemplates() {
    dashboard.showPage('templates');
}

function showPlans() {
    alert('Sistema de planos em desenvolvimento!\n\nEm breve você poderá fazer upgrade do seu plano diretamente pelo dashboard.');
}

// Inicializar Dashboard
let dashboard;
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new DashboardManager();
});