/**
 * ================================================================================
 * SIDEBAR MANAGER - GERENCIADOR DE SIDEBAR DO DASHBOARD
 * ================================================================================
 * Gerencia submenus, navegação e informações da carteira na sidebar
 * ================================================================================
 */

class SidebarManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupMenuToggles();
        this.setupMenuItems();
        this.updateWalletInfo();
        
        // Escutar eventos de conexão da carteira
        window.addEventListener('walletConnected', (event) => {
            this.updateWalletInfo(event.detail);
        });
        
        window.addEventListener('walletDisconnected', () => {
            this.updateWalletInfo();
        });
    }

    setupMenuToggles() {
        const menuToggles = document.querySelectorAll('.menu-toggle');
        
        menuToggles.forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const section = toggle.dataset.section;
                this.toggleSection(section);
            });
        });
    }

    setupMenuItems() {
        const menuItems = document.querySelectorAll('.menu-item:not(.menu-toggle), .submenu-item');
        
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remover active de todos os itens
                document.querySelectorAll('.menu-item, .submenu-item').forEach(i => {
                    i.classList.remove('active');
                });
                
                // Adicionar active ao item clicado
                item.classList.add('active');
                
                // Disparar evento customizado para o componente principal
                const page = item.dataset.page;
                if (page) {
                    window.dispatchEvent(new CustomEvent('sidebarNavigation', {
                        detail: { page, title: item.textContent.trim() }
                    }));
                }
            });
        });
    }

    toggleSection(sectionName) {
        // Fechar todas as seções
        document.querySelectorAll('.menu-section').forEach(section => {
            if (section.querySelector(`[data-section="${sectionName}"]`)) {
                section.classList.toggle('expanded');
            } else {
                section.classList.remove('expanded');
            }
        });
    }

    updateWalletInfo(walletData = null) {
        const walletInfo = document.getElementById('wallet-info');
        const addressElement = walletInfo.querySelector('.wallet-address');
        const networkElement = walletInfo.querySelector('.network-name');

        if (walletData || this.checkStoredWallet()) {
            const address = walletData?.address || localStorage.getItem('tokencafe_wallet_address');
            const networkId = walletData?.networkId || localStorage.getItem('tokencafe_network_id');
            
            if (address) {
                addressElement.textContent = window.TokenCafeUtils?.formatters?.formatAddress(address) || `${address.slice(0, 6)}...${address.slice(-4)}`;
                
                const networks = {
                    '1': 'Ethereum Mainnet',
                    '56': 'BSC Mainnet', 
                    '137': 'Polygon Mainnet',
                    '11155111': 'Sepolia Testnet'
                };
                
                networkElement.textContent = networks[networkId] || 'Rede Desconhecida';
                walletInfo.className = 'wallet-info connected';
            }
        } else {
            addressElement.textContent = 'Não conectado';
            networkElement.textContent = '-';
            walletInfo.className = 'wallet-info disconnected';
        }
    }

    checkStoredWallet() {
        return localStorage.getItem('tokencafe_wallet_address') && 
               localStorage.getItem('tokencafe_connected') === 'true';
    }
}

/**
 * Função para inicializar o sidebar manager quando elementos estiverem prontos
 */
function initSidebarManager() {
    // Aguardar um pouco caso os elementos sejam carregados dinamicamente
    setTimeout(() => {
        window.sidebarManager = new SidebarManager();
    }, 100);
}

// Expor globalmente
window.SidebarManager = SidebarManager;
window.initSidebarManager = initSidebarManager;

console.log('✅ Sidebar Manager JS carregado');