/**
 * TokenCafe Wallet Legacy Adapter
 * Adapter para manter compatibilidade com código antigo usando módulos unificados
 * Versão: 3.0 - Sistema Unificado
 * Data: 2024
 */

import { walletConnector } from '../../shared/wallet-connector.js';
import { networkManager } from '../../shared/network-manager.js';

/**
 * Adapter para manter compatibilidade com API antiga
 */
class WalletLegacyAdapter {
    constructor() {
        this.wallet = walletConnector;
        this.networks = networkManager;
        
        // Eventos de compatibilidade
        this.setupLegacyEvents();
    }
    
    /**
     * Configurar eventos para compatibilidade
     */
    setupLegacyEvents() {
        // Mapear eventos novos para antigos
        document.addEventListener('wallet:connected', (event) => {
            // Disparar evento antigo para compatibilidade
            window.dispatchEvent(new CustomEvent('walletConnected', {
                detail: event.detail
            }));
        });
        
        document.addEventListener('wallet:disconnected', (event) => {
            window.dispatchEvent(new CustomEvent('walletDisconnected', {
                detail: event.detail
            }));
        });
        
        document.addEventListener('wallet:chainChanged', (event) => {
            window.dispatchEvent(new CustomEvent('chainChanged', {
                detail: event.detail
            }));
        });
    }
    
    /**
     * Conectar carteira (compatibilidade)
     */
    async connectWallet(provider = 'metamask') {
        try {
            const result = await this.wallet.connect(provider);
            return result;
        } catch (error) {
            console.error('Erro na conexão (legacy):', error);
            throw error;
        }
    }
    
    /**
     * Desconectar carteira
     */
    async disconnectWallet() {
        return await this.wallet.disconnect();
    }
    
    /**
     * Verificar se está conectado
     */
    isConnected() {
        return this.wallet.isConnected;
    }
    
    /**
     * Obter endereço da conta
     */
    getAccount() {
        const status = this.wallet.getStatus();
        return status?.account || null;
    }
    
    /**
     * Obter rede atual
     */
    getCurrentNetwork() {
        const status = this.wallet.getStatus();
        return status?.network || null;
    }
    
    /**
     * Trocar rede
     */
    async switchNetwork(chainId) {
        try {
            const network = this.networks.getNetworkById(chainId);
            if (!network) {
                throw new Error(`Rede ${chainId} não encontrada`);
            }
            
            return await this.wallet.switchNetwork(chainId);
        } catch (error) {
            console.error('Erro ao trocar rede (legacy):', error);
            throw error;
        }
    }
    
    /**
     * Adicionar rede
     */
    async addNetwork(chainId) {
        try {
            const network = this.networks.getNetworkById(chainId);
            if (!network) {
                throw new Error(`Rede ${chainId} não encontrada`);
            }
            
            return await this.wallet.addNetwork(network);
        } catch (error) {
            console.error('Erro ao adicionar rede (legacy):', error);
            throw error;
        }
    }
    
    /**
     * Adicionar token
     */
    async addToken(tokenData) {
        return await this.wallet.addToken(tokenData);
    }
    
    /**
     * Buscar informações de rede
     */
    getNetworkInfo(chainId) {
        return this.networks.getNetworkById(chainId);
    }
    
    /**
     * Buscar redes
     */
    searchNetworks(query, limit = 10) {
        return this.networks.searchNetworks(query, limit);
    }
    
    /**
     * Obter redes populares
     */
    getPopularNetworks(limit = 10) {
        return this.networks.getPopularNetworks(limit);
    }
    
    /**
     * Configurar debug
     */
    setDebug(enabled) {
        this.wallet.setDebug(enabled);
        this.networks.setDebug(enabled);
    }
}

// Criar instância global para compatibilidade
const walletLegacyAdapter = new WalletLegacyAdapter();

// Exportar para uso em módulos
export { walletLegacyAdapter };

// Disponibilizar globalmente para scripts antigos
window.walletLegacyAdapter = walletLegacyAdapter;

// Aliases para compatibilidade com código antigo
window.connectWallet = (provider) => walletLegacyAdapter.connectWallet(provider);
window.disconnectWallet = () => walletLegacyAdapter.disconnectWallet();
window.switchNetwork = (chainId) => walletLegacyAdapter.switchNetwork(chainId);
window.addNetwork = (chainId) => walletLegacyAdapter.addNetwork(chainId);
window.addToken = (tokenData) => walletLegacyAdapter.addToken(tokenData);
window.getNetworkInfo = (chainId) => walletLegacyAdapter.getNetworkInfo(chainId);

console.log('🔄 Wallet Legacy Adapter carregado - Compatibilidade com código antigo mantida');