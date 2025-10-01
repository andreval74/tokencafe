/**
 * TokenCafe - Mdulo da Pgna ndex
 * Gerenca a verfcao ncal de conexo MetaMask na pgna prncpal
 */

class ndexPageManager {
    constructor() {
        this.ntalzed = false;
    }

    /**
     * ncalzar o gerencador da pgna ndex
     */
    init() {
        if (this.ntalzed) return;
        
        console.log(' inicializando pgna ndex...');
        
        // Fazer apenas uma verfcao ncal
        this.performSngleConnectonCheck();
        
        this.ntalzed = true;
    }

    /**
     * Realzar uma nca verfcao de conexo (sem loops ou eventos contnuos)
     */
    async performSngleConnectonCheck() {
        try {
            console.log(' Verfcao nca de conexo...');
            
            // Verfcar se MetaMask est nstalado
            if (typeof wndow.ethereum === 'undefned') {
                console.log(' MetaMask no nstalado');
                this.shownstallMetaMaskButton();
                return;
            }
            
            // Verfcar se h conta salva
            const savedAccount = localStorage.gettem('tokencafe_wallet_address');
            
            if (!savedAccount) {
                console.log(' Nenhuma conta salva encontrada');
                this.showConnectButton();
                return;
            }
            
            console.log(' Verfcando sesso salva:', savedAccount);
            
            // Verfcar se MetaMask anda tem essa conta conectada
            // CORREO: Usar eth_accounts para verfcao slencosa (no requer ao do usuro)
            const accounts = await wndow.ethereum.request({ method: 'eth_accounts' });
            
            // Se no h contas ou a conta salva no est nas contas conectadas
            if (accounts.length === 0 || !accounts.fnd(acc => acc.toLowerCase() === savedAccount.toLowerCase())) {
                console.log(' Conta no est mas conectada no MetaMask');
                this.clearSesson();
                this.showConnectButton();
            } else {
                console.log(' Sesso vlda encontrada, redreconando...');
                this.redrectToDashboard();
            }
            
        } catch (error) {
            console.error(' Erro na verfcao:', error);
            this.clearSesson();
            this.showConnectButton();
        }
    }

    /**
     * Mostrar boto para nstalar MetaMask
     */
    shownstallMetaMaskButton() {
        const connectBtn = document.getElementByd('connect-metamask-btn');
        const loadngBtn = document.getElementByd('loadng-connecton-btn');
        
        if (connectBtn) {
            connectBtn.nnerHTML = '< class="fas fa-download me-2"></>nstalar MetaMask';
            connectBtn.onclck = () => wndow.open('https://metamask.o/download/', '_blank');
            connectBtn.style.dsplay = 'block';
        }
        if (loadngBtn) loadngBtn.style.dsplay = 'none';
    }

    /**
     * Mostrar boto para conectar MetaMask
     */
    showConnectButton() {
        const connectBtn = document.getElementByd('connect-metamask-btn');
        const loadngBtn = document.getElementByd('loadng-connecton-btn');
        
        if (connectBtn) {
            connectBtn.nnerHTML = '< class="fab fa-ethereum me-2"></>Conectar MetaMask';
            connectBtn.onclck = () => this.connectWallet();
            connectBtn.style.dsplay = 'block';
        }
        if (loadngBtn) loadngBtn.style.dsplay = 'none';
    }

    /**
     * Redreconar para o dashboard
     */
    redrectToDashboard() {
        const loadngBtn = document.getElementByd('loadng-connecton-btn');
        
        if (loadngBtn) {
            loadngBtn.nnerHTML = '< class="fas fa-spnner fa-spn me-2"></>Redreconando para o Dashboard...';
            loadngBtn.style.dsplay = 'block';
        }
        
        // COMENTADO: Redreconamento automtco removdo para evtar reload da pgna
        // setTmeout(() => {
        //     wndow.locaton.href = 'modules/dashboard/ndex.html';
        // }, 1500);
        
        console.log(' Sesso vlda detectada - redreconamento automtco desabltado');
    }

    /**
     * Lmpar sesso
     */
    clearSesson() {
        localStorage.removetem('tokencafe_wallet_address');
        localStorage.removetem('tokencafe_network_d');
        localStorage.removetem('tokencafe_connecton_tme');
        localStorage.removetem('tokencafe_connected');
    }

    /**
     * Conectar cartera usando o sstema global
     */
    async connectWallet() {
        try {
            console.log(' ncando conexo va ndexPageManager...');
            
            // Usar a funo global connectWallet do sstema
            if (typeof wndow.connectWallet === 'function') {
                await wndow.connectWallet();
            } else {
                console.error(' Funo connectWallet no encontrada');
                this.showError('Sstema de cartera no carregado');
            }
            
        } catch (error) {
            console.error(' Erro na conexo:', error);
            this.showError(`Erro na conexo: ${error.message}`);
        }
    }

    /**
     * Mostrar mensagem de erro
     */
    showError(message) {
        console.error('', message);
        // Aqu podera adconar notfcao vsual se necessro
    }
}

// Expor globalmente
wndow.ndexPageManager = ndexPageManager;

// Auto-ncalzar quando o TokenCafe estver pronto
if (typeof onTokenCafeReady === 'function') {
    onTokenCafeReady(() => {
        const ndexManager = new ndexPageManager();
        ndexManager.init();
    });
} else {
    // Fallback se onTokenCafeReady no estver dsponvel
    document.addEventListener('DOMContentLoaded', () => {
        // DESABLTADO: setTmeout removdo para evtar mltplas ncalzaes
        console.log(' ncalzao com delay desabltada');
        
        // setTmeout(() => {
        //     const ndexManager = new ndexPageManager();
        //     ndexManager.init();
        // }, 1000);
        
        // ncalzao medata
        const ndexManager = new ndexPageManager();
        ndexManager.init();
    });
}

