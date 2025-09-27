/**
 * ================================================================================
 * LINK CORE - TOKENCAFE
 * ================================================================================
 * Funções específicas do módulo Link que não existem na estrutura principal
 * Usa as funções compartilhadas da estrutura principal do sistema
 * ================================================================================
 */

// Importar utilitários compartilhados da estrutura principal
import { SharedUtilities } from '../../core/shared-utilities-es6.js';

class LinkCore {
    constructor() {
        this.utils = new SharedUtilities();
        this.selectedNetwork = null;
        this.allNetworks = [];
    }

    /**
     * Gerar link compartilhável para token
     */
    generateTokenLink(tokenData, chainId) {
        try {
            const baseUrl = window.location.origin;
            const linkPath = '/pages/modules/link/link-token.html';
            
            const params = new URLSearchParams({
                address: tokenData.address,
                symbol: tokenData.symbol,
                decimals: tokenData.decimals,
                name: tokenData.name,
                chainId: chainId
            });

            if (tokenData.image) {
                params.append('image', tokenData.image);
            }

            const fullLink = `${baseUrl}${linkPath}?${params.toString()}`;
            
            console.log('🔗 Link gerado:', fullLink);
            return fullLink;
            
        } catch (error) {
            console.error('❌ Erro ao gerar link:', error);
            throw error;
        }
    }

    /**
     * Extrair dados do token da URL
     */
    getTokenDataFromURL() {
        const params = new URLSearchParams(window.location.search);
        
        const tokenData = {
            address: params.get('address'),
            symbol: params.get('symbol'),
            decimals: params.get('decimals'),
            name: params.get('name'),
            chainId: params.get('chainId'),
            image: params.get('image')
        };

        // Validar dados obrigatórios
        if (!tokenData.address || !tokenData.symbol || !tokenData.decimals || !tokenData.name || !tokenData.chainId) {
            throw new Error('Parâmetros de token inválidos na URL');
        }

        return tokenData;
    }

    /**
     * Buscar dados do token via API
     */
    async fetchTokenData(address, chainId, rpcUrl) {
        try {
            console.log(`🔍 Buscando dados do token ${address} na rede ${chainId}...`);
            
            // Simular busca de dados do token (implementar conforme necessário)
            // Esta função pode ser expandida para usar APIs específicas
            
            return {
                address: address,
                symbol: 'TOKEN',
                decimals: '18',
                name: 'Token Name',
                image: null
            };
            
        } catch (error) {
            console.error('❌ Erro ao buscar dados do token:', error);
            throw error;
        }
    }

    /**
     * Configurar autocomplete de redes
     */
    setupNetworkAutocomplete(networks, inputId, autocompleteId) {
        const input = document.getElementById(inputId);
        const autocomplete = document.getElementById(autocompleteId);
        
        if (!input || !autocomplete) return;

        input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            
            if (query.length < 2) {
                autocomplete.style.display = 'none';
                return;
            }

            const filtered = networks.filter(network => 
                network.name.toLowerCase().includes(query) ||
                network.chainId.toString().includes(query)
            );

            this.showAutocomplete(filtered, autocompleteId);
        });
    }

    /**
     * Mostrar autocomplete
     */
    showAutocomplete(networks, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        
        networks.slice(0, 10).forEach(network => {
            const item = document.createElement('div');
            item.className = 'autocomplete-item p-2 border-bottom cursor-pointer';
            item.innerHTML = `
                <div class="d-flex justify-content-between">
                    <span>${network.name}</span>
                    <small class="text-muted">Chain ID: ${network.chainId}</small>
                </div>
            `;
            
            item.addEventListener('click', () => {
                this.selectNetwork(network);
            });
            
            container.appendChild(item);
        });

        container.style.display = networks.length > 0 ? 'block' : 'none';
    }

    /**
     * Selecionar rede
     */
    selectNetwork(network) {
        this.selectedNetwork = network;
        
        // Atualizar campos da UI
        const networkSearch = document.getElementById('networkSearch');
        const rpcUrl = document.getElementById('rpcUrl');
        const blockExplorer = document.getElementById('blockExplorer');
        const autocomplete = document.getElementById('networkAutocomplete');
        
        if (networkSearch) {
            networkSearch.value = `${network.name} (${network.chainId})`;
        }
        
        if (rpcUrl && network.rpc && network.rpc.length > 0) {
            rpcUrl.value = network.rpc[0];
        }
        
        if (blockExplorer && network.explorers && network.explorers.length > 0) {
            blockExplorer.value = network.explorers[0].url;
        }
        
        if (autocomplete) {
            autocomplete.style.display = 'none';
        }

        // Mostrar status da rede selecionada
        this.updateNetworkStatus(network);
        
        // Emitir evento personalizado
        document.dispatchEvent(new CustomEvent('network:selected', {
            detail: { network }
        }));
    }

    /**
     * Atualizar status da rede
     */
    updateNetworkStatus(network) {
        const networkStatus = document.getElementById('network-status');
        const selectedNetworkName = document.getElementById('selected-network-name');
        
        if (networkStatus && selectedNetworkName) {
            selectedNetworkName.textContent = `${network.name} (Chain ID: ${network.chainId})`;
            networkStatus.style.display = 'block';
        }
    }

    /**
     * Copiar link para clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.utils.showToast('Link copiado para a área de transferência!', 'success');
            return true;
        } catch (error) {
            console.error('❌ Erro ao copiar:', error);
            this.utils.showToast('Erro ao copiar link', 'error');
            return false;
        }
    }

    /**
     * Compartilhar link via Web Share API
     */
    async shareLink(url, title = 'Token Link') {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: title,
                    url: url
                });
                return true;
            } else {
                // Fallback: copiar para clipboard
                return await this.copyToClipboard(url);
            }
        } catch (error) {
            console.error('❌ Erro ao compartilhar:', error);
            return false;
        }
    }

    /**
     * Validar endereço de token
     */
    validateTokenAddress(address) {
        return this.utils.validateEthereumAddress(address);
    }

    /**
     * Mostrar/ocultar seções do formulário
     */
    showNextSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.scrollIntoView({ behavior: 'smooth' });
        }
    }

    /**
     * Limpar formulário
     */
    clearForm() {
        const fields = [
            'networkSearch', 'rpcUrl', 'blockExplorer',
            'tokenAddress', 'tokenName', 'tokenSymbol', 
            'tokenDecimals', 'tokenImage', 'generatedLink'
        ];

        fields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.value = '';
            }
        });

        // Ocultar seções
        const sections = ['token-section', 'generated-link-section'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });

        // Resetar estado
        this.selectedNetwork = null;
        
        // Ocultar status da rede
        const networkStatus = document.getElementById('network-status');
        if (networkStatus) {
            networkStatus.style.display = 'none';
        }
    }
}

// Exportar para uso global
window.LinkCore = LinkCore;

export default LinkCore;