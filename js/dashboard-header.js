/**
 * DashboardHeader - Gerenciador do cabeçalho do dashboard
 * Responsável por atualizar informações da carteira e gerenciar notificações
 */
class DashboardHeader {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.addStyles();
    }

    setupEventListeners() {
        // Event listener para conexão da carteira
        document.addEventListener('auth:connected', (event) => {
            this.onWalletConnected(event);
        });

        // Event listener para desconexão da carteira
        document.addEventListener('auth:disconnected', () => {
            this.onWalletDisconnected();
        });

        // Event listener para mudança de rede
        document.addEventListener('auth:networkChanged', (event) => {
            this.onNetworkChanged(event);
        });
    }

    onWalletConnected(event) {
        const { account, state } = event.detail;
        
        // Atualizar conta
        const accountShortEl = document.getElementById('user-account-short');
        const accountFullEl = document.getElementById('user-account-full');
        
        if (accountShortEl && account) {
            accountShortEl.textContent = window.TokenCafeUtils?.formatters?.formatAddress(account) || `${account.slice(0, 6)}...${account.slice(-4)}`;
        }
        
        if (accountFullEl && account) {
            accountFullEl.textContent = account;
        }
        
        // Atualizar rede
        const networkEl = document.getElementById('current-network');
        if (networkEl) {
            networkEl.textContent = state?.network || 'Desconhecida';
        }
        
        // Atualizar saldo
        const balanceEl = document.getElementById('user-balance');
        if (balanceEl) {
            balanceEl.textContent = `${state?.balance || '0.0000'} ETH`;
        }
        
        // Atualizar indicador de rede
        const networkIndicator = document.getElementById('network-indicator');
        if (networkIndicator) {
            networkIndicator.className = 'badge bg-success';
        }
    }

    onWalletDisconnected() {
        // Resetar informações
        const accountShortEl = document.getElementById('user-account-short');
        const accountFullEl = document.getElementById('user-account-full');
        const networkEl = document.getElementById('current-network');
        const balanceEl = document.getElementById('user-balance');
        const networkIndicator = document.getElementById('network-indicator');

        if (accountShortEl) accountShortEl.textContent = '0x0000...0000';
        if (accountFullEl) accountFullEl.textContent = 'Não conectado';
        if (networkEl) networkEl.textContent = 'Desconectado';
        if (balanceEl) balanceEl.textContent = '0.0000 ETH';
        
        // Indicador de rede desconectada
        if (networkIndicator) {
            networkIndicator.className = 'badge bg-secondary';
        }
    }

    onNetworkChanged(event) {
        const { network, networkId } = event.detail;
        const networkEl = document.getElementById('current-network');
        const networkIndicator = document.getElementById('network-indicator');
        
        if (networkEl && network) {
            networkEl.textContent = network;
        }
        
        // Mudar cor do indicador baseado na rede
        if (networkIndicator && networkId) {
            switch(networkId) {
                case 1: // Ethereum
                    networkIndicator.className = 'badge bg-primary';
                    break;
                case 56: // BSC
                    networkIndicator.className = 'badge bg-warning';
                    break;
                case 137: // Polygon
                    networkIndicator.className = 'badge bg-info';
                    break;
                default:
                    networkIndicator.className = 'badge bg-success';
            }
        }
    }

    // Sistema de notificações
    addNotification(message, type = 'info') {
        const notificationsList = document.getElementById('notifications-list');
        const notificationCount = document.getElementById('notification-count');
        
        if (!notificationsList || !notificationCount) return;
        
        // Remover mensagem de "nenhuma notificação"
        const emptyMessage = notificationsList.querySelector('.text-muted');
        if (emptyMessage) {
            emptyMessage.remove();
        }
        
        // Adicionar nova notificação
        const notificationItem = document.createElement('li');
        const iconClass = type === 'error' ? 'exclamation-triangle text-danger' : 'info-circle text-info';
        
        notificationItem.innerHTML = `
            <a class="dropdown-item" href="#">
                <i class="fas fa-${iconClass} me-2"></i>
                ${message}
                <small class="d-block text-muted">${new Date().toLocaleTimeString()}</small>
            </a>
        `;
        
        notificationsList.appendChild(notificationItem);
        
        // Atualizar contador
        const currentCount = parseInt(notificationCount.textContent) || 0;
        notificationCount.textContent = currentCount + 1;
        notificationCount.style.display = 'inline';
    }

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .pulse {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
            
            .sidebar {
                min-width: 250px;
                max-width: 250px;
                min-height: calc(100vh - 56px);
            }
            
            .sidebar.collapsed {
                min-width: 80px;
                max-width: 80px;
            }
            
            .main-content {
                min-height: calc(100vh - 56px);
            }
        `;
        document.head.appendChild(style);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.dashboardHeader = new DashboardHeader();
    
    // Expor função de notificação globalmente
    window.addNotification = (message, type) => {
        if (window.dashboardHeader) {
            window.dashboardHeader.addNotification(message, type);
        }
    };
});