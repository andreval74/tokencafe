/**
 * ================================================================================
 * TOKEN LINK UTILS - TOKENCAFE
 * ================================================================================
 * Utilitários específicos para o módulo Link que não existem na estrutura principal
 * Funções para buscar redes, gerenciar chains.json e outras utilidades específicas
 * ================================================================================
 */

// Importar utilitários compartilhados da estrutura principal
import { SharedUtilities } from '../../core/shared-utilities-es6.js';

class TokenLinkUtils {
    constructor() {
        this.utils = new SharedUtilities();
        this.networksCache = null;
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutos
        this.lastCacheTime = 0;
    }

    /**
     * Buscar todas as redes disponíveis
     */
    async fetchAllNetworks() {
        try {
            // Verificar cache
            if (this.networksCache && (Date.now() - this.lastCacheTime) < this.cacheExpiry) {
                return this.networksCache;
            }

            console.log('🌐 Buscando redes disponíveis...');

            // Tentar buscar do chains.json local primeiro
            let networks = await this.loadLocalChains();
            
            // Se não encontrou localmente, buscar da API
            if (!networks || networks.length === 0) {
                networks = await this.fetchNetworksFromAPI();
            }

            // Atualizar cache
            this.networksCache = networks;
            this.lastCacheTime = Date.now();

            console.log(`✅ ${networks.length} redes carregadas`);
            return networks;

        } catch (error) {
            console.error('❌ Erro ao buscar redes:', error);
            
            // Fallback para redes conhecidas
            return this.getFallbackNetworks();
        }
    }

    /**
     * Carregar chains.json local
     */
    async loadLocalChains() {
        try {
            const response = await fetch('/pages/modules/link/chains.json');
            if (response.ok) {
                const data = await response.json();
                return Array.isArray(data) ? data : [];
            }
        } catch (error) {
            console.log('ℹ️ chains.json local não encontrado');
        }
        return null;
    }

    /**
     * Buscar redes da API externa
     */
    async fetchNetworksFromAPI() {
        try {
            const response = await fetch('https://chainid.network/chains.json');
            if (response.ok) {
                const chains = await response.json();
                
                // Filtrar apenas redes principais e testnets conhecidas
                return chains.filter(chain => 
                    chain.chainId && 
                    chain.name && 
                    chain.rpc && 
                    chain.rpc.length > 0 &&
                    !chain.name.toLowerCase().includes('deprecated')
                );
            }
        } catch (error) {
            console.error('❌ Erro ao buscar da API:', error);
        }
        return [];
    }

    /**
     * Redes de fallback
     */
    getFallbackNetworks() {
        return [
            {
                chainId: 1,
                name: 'Ethereum Mainnet',
                rpc: ['https://eth.llamarpc.com'],
                explorers: [{ url: 'https://etherscan.io' }]
            },
            {
                chainId: 56,
                name: 'BNB Smart Chain Mainnet',
                rpc: ['https://bsc-dataseed.binance.org/'],
                explorers: [{ url: 'https://bscscan.com' }]
            },
            {
                chainId: 137,
                name: 'Polygon Mainnet',
                rpc: ['https://polygon-rpc.com/'],
                explorers: [{ url: 'https://polygonscan.com' }]
            },
            {
                chainId: 42161,
                name: 'Arbitrum One',
                rpc: ['https://arb1.arbitrum.io/rpc'],
                explorers: [{ url: 'https://arbiscan.io' }]
            },
            {
                chainId: 10,
                name: 'Optimism',
                rpc: ['https://mainnet.optimism.io'],
                explorers: [{ url: 'https://optimistic.etherscan.io' }]
            }
        ];
    }

    /**
     * Atualizar chains.json automaticamente
     */
    async autoUpdateChainsJson() {
        try {
            console.log('🔄 Verificando atualização do chains.json...');
            
            // Verificar se precisa atualizar (uma vez por dia)
            const lastUpdate = localStorage.getItem('chains_last_update');
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            
            if (lastUpdate && parseInt(lastUpdate) > oneDayAgo) {
                console.log('ℹ️ chains.json ainda está atualizado');
                return;
            }

            // Buscar dados atualizados
            const networks = await this.fetchNetworksFromAPI();
            
            if (networks && networks.length > 0) {
                // Salvar no localStorage como backup
                localStorage.setItem('chains_backup', JSON.stringify(networks));
                localStorage.setItem('chains_last_update', Date.now().toString());
                
                console.log('✅ Backup do chains.json atualizado');
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar chains.json:', error);
        }
    }

    /**
     * Mostrar autocomplete de redes
     */
    showAutocomplete(networks, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        
        networks.slice(0, 10).forEach(network => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item p-2 border-bottom cursor-pointer';
            
            // Aplicar estilos inline para garantir visibilidade
            item.style.cssText = `
                background-color: rgba(0, 0, 0, 0.5);
                border: 1px solid #dee2e6;
                cursor: pointer;
                transition: all 0.2s ease;
                color: white;
            `;
            
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="fw-medium" style="color: white;">${network.name}</div>
                        <small style="color: #ccc;">Chain ID: ${network.chainId}</small>
                    </div>
                    <i class="fas fa-chevron-right" style="color: #ccc;"></i>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectNetwork(network);
                container.style.display = 'none';
            });
            
            // Hover effects melhorados
            item.addEventListener('mouseenter', () => {
                item.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                item.style.borderColor = '#adb5bd';
                item.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            });
            
            item.addEventListener('mouseleave', () => {
                item.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
                item.style.borderColor = '#dee2e6';
                item.style.boxShadow = 'none';
            });
            
            container.appendChild(item);
        });

        container.style.display = networks.length > 0 ? 'block' : 'none';
    }

    /**
     * Selecionar rede (callback)
     */
    selectNetwork(network) {
        // Esta função será sobrescrita pelo componente que usar este utilitário
        console.log('Rede selecionada:', network);
    }

    /**
     * Copiar para clipboard com feedback visual
     */
    async copyToClipboard(text, buttonId = null) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Feedback visual no botão se fornecido
            if (buttonId) {
                const button = document.getElementById(buttonId);
                if (button) {
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-check me-2"></i>Copiado!';
                    button.classList.add('btn-success');
                    
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.remove('btn-success');
                    }, 2000);
                }
            }
            
            this.utils.showToast('Copiado para a área de transferência!', 'success');
            return true;
            
        } catch (error) {
            console.error('❌ Erro ao copiar:', error);
            this.utils.showToast('Erro ao copiar', 'error');
            return false;
        }
    }

    /**
     * Compartilhar link via Web Share API ou fallback
     */
    async shareLink(url, title = 'Token Link', text = 'Confira este token') {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: title,
                    text: text,
                    url: url
                });
                return true;
            } else {
                // Fallback: copiar para clipboard
                const success = await this.copyToClipboard(url);
                if (success) {
                    this.utils.showToast('Link copiado! Compartilhe onde quiser.', 'info');
                }
                return success;
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('❌ Erro ao compartilhar:', error);
                this.utils.showToast('Erro ao compartilhar link', 'error');
            }
            return false;
        }
    }

    /**
     * Validar URL de RPC
     */
    validateRpcUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    /**
     * Testar conectividade de RPC
     */
    async testRpcConnection(rpcUrl) {
        try {
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method: 'eth_chainId',
                    params: [],
                    id: 1
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.result ? true : false;
            }
            return false;
            
        } catch (error) {
            console.error('❌ Erro ao testar RPC:', error);
            return false;
        }
    }

    /**
     * Formatar número de chain ID
     */
    formatChainId(chainId) {
        if (typeof chainId === 'string' && chainId.startsWith('0x')) {
            return parseInt(chainId, 16);
        }
        return parseInt(chainId);
    }

    /**
     * Obter informações resumidas da rede
     */
    getNetworkSummary(network) {
        return {
            chainId: this.formatChainId(network.chainId),
            name: network.name,
            shortName: network.shortName || network.name,
            rpc: network.rpc?.[0] || '',
            explorer: network.explorers?.[0]?.url || '',
            currency: network.nativeCurrency?.symbol || 'ETH'
        };
    }

    /**
     * Filtrar redes por critérios
     */
    filterNetworks(networks, criteria = {}) {
        return networks.filter(network => {
            // Filtrar por mainnet/testnet
            if (criteria.mainnetOnly && this.isTestnet(network)) {
                return false;
            }
            
            // Filtrar por chain IDs específicos
            if (criteria.chainIds && !criteria.chainIds.includes(network.chainId)) {
                return false;
            }
            
            // Filtrar por nome
            if (criteria.nameFilter) {
                const name = network.name.toLowerCase();
                const filter = criteria.nameFilter.toLowerCase();
                if (!name.includes(filter)) {
                    return false;
                }
            }
            
            return true;
        });
    }

    /**
     * Verificar se é testnet
     */
    isTestnet(network) {
        const testnetKeywords = ['test', 'goerli', 'sepolia', 'mumbai', 'fuji', 'chapel'];
        const name = network.name.toLowerCase();
        return testnetKeywords.some(keyword => name.includes(keyword));
    }

    /**
     * Limpar cache de redes
     */
    clearNetworksCache() {
        this.networksCache = null;
        this.lastCacheTime = 0;
        console.log('🗑️ Cache de redes limpo');
    }
}

// Exportar para uso global
window.TokenLinkUtils = TokenLinkUtils;

export default TokenLinkUtils;