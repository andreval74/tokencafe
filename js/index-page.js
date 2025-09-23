/**
 * ================================================================================
 * INDEX PAGE FUNCTIONS - FUNÇÕES ESPECÍFICAS DA PÁGINA INICIAL
 * ================================================================================
 * Funções específicas para a página inicial (index.html)
 * ================================================================================
 */

// Instância global do Web3ConnectionManager
let tokencafeWeb3;

/**
 * Inicializar sistema Web3 na página inicial
 */
async function initIndexPage() {
    console.log('🏠 Inicializando página inicial...');
    
    // Criar instância do Web3ConnectionManager (o construtor já chama init())
    tokencafeWeb3 = new Web3ConnectionManager();
    
    // Aguardar um momento para a inicialização assíncrona
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verificar se está conectado após verificação real
    if (tokencafeWeb3.isConnected && tokencafeWeb3.currentAccount) {
        updateIndexConnectedUI(tokencafeWeb3.currentAccount);
    }
    
    // Listener para mudanças na conexão (sincronizar entre abas)
    window.addEventListener('storage', (e) => {
        if (e.key === 'tokencafe_wallet_address') {
            if (e.newValue) {
                updateIndexConnectedUI(e.newValue);
            } else {
                // Desconectado - resetar UI
                location.reload();
            }
        }
    });
}

/**
 * Função para acessar dashboard
 */
function accessDashboard() {
    const savedAccount = localStorage.getItem('tokencafe_wallet_address');
    
    if (savedAccount) {
        // Se já está conectado, ir direto para dashboard
        window.location.href = 'dash-main.html';
    } else {
        // Se não está conectado, conectar primeiro
        alert('🔐 Você precisa conectar sua carteira MetaMask primeiro!\n\nClique em "Conectar MetaMask" no topo da página.');
    }
}

/**
 * Atualizar UI quando conectado (específico para index.html)
 */
function updateIndexConnectedUI(account) {
    const connectBtn = document.getElementById('connect-wallet-btn');
    const connectText = document.getElementById('connect-text');
    const walletDropdown = document.getElementById('wallet-dropdown');
    const accountDisplay = document.getElementById('account-display');
    const networkDisplay = document.getElementById('network-display');
    
    if (connectBtn && connectText) {
        connectBtn.classList.add('btn-success');
        connectBtn.classList.remove('btn-primary');
        connectText.textContent = 'Conectado';
        
        // Mostrar dropdown
        if (walletDropdown) {
            walletDropdown.style.display = 'block';
            connectBtn.setAttribute('data-bs-toggle', 'dropdown');
        }
        
        // Atualizar informações
        if (accountDisplay) {
            accountDisplay.textContent = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;
        }
        
        const networkId = localStorage.getItem('tokencafe_network_id');
        if (networkDisplay && networkId) {
            const networks = {
                '1': 'Ethereum',
                '56': 'BSC',
                '137': 'Polygon',
                '11155111': 'Sepolia'
            };
            networkDisplay.textContent = networks[networkId] || `Rede ${networkId}`;
        }
    }
}

// Adicionar funções ao escopo global para compatibilidade
window.connectWallet = connectWallet;
window.disconnectWallet = disconnectWallet;
window.accessDashboard = accessDashboard;
window.updateIndexConnectedUI = updateIndexConnectedUI;

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', initIndexPage);

console.log('✅ Index Page Functions carregadas');
