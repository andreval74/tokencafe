/**
 * Utilitários Comuns para Blockchain
 * Funções reutilizáveis para carteiras, redes e validações
 */

class BlockchainUtils {
    
    // ==================== DETECÇÃO DE REDE ====================
    
    /**
     * Detecta a rede atual da carteira conectada
     * @returns {Object|null} Informações da rede ou null se erro
     */
    static async detectWalletNetwork() {
        try {
            if (!window.ethereum) {
                throw new Error('MetaMask não detectado');
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const network = await provider.getNetwork();
            
            // Converter chainId para número se for string hex
            let chainId = network.chainId;
            if (typeof chainId === 'string' && chainId.startsWith('0x')) {
                chainId = parseInt(chainId, 16);
            }

            // Mapear redes conhecidas
            const knownNetworks = {
                1: { name: 'Ethereum Mainnet', symbol: 'ETH', supported: true },
                56: { name: 'BSC Mainnet', symbol: 'BNB', supported: true },
                97: { name: 'BSC Testnet', symbol: 'tBNB', supported: true },
                137: { name: 'Polygon', symbol: 'MATIC', supported: true },
                80001: { name: 'Mumbai Testnet', symbol: 'tMATIC', supported: true },
                43114: { name: 'Avalanche', symbol: 'AVAX', supported: true },
                250: { name: 'Fantom', symbol: 'FTM', supported: true }
            };

            const networkInfo = knownNetworks[chainId] || {
                name: `Rede Desconhecida (${chainId})`,
                symbol: 'ETH',
                supported: false
            };

            return {
                chainId: chainId,
                name: networkInfo.name,
                symbol: networkInfo.symbol,
                supported: networkInfo.supported,
                rpcUrl: network.ensAddress || null
            };

        } catch (error) {
            console.error('Erro ao detectar rede:', error);
            return null;
        }
    }

    // ==================== VALIDAÇÕES ====================
    
    /**
     * Valida se uma carteira está conectada
     * @returns {boolean} True se conectada
     */
    static async isWalletConnected() {
        try {
            if (!window.ethereum) return false;
            
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            return accounts && accounts.length > 0;
        } catch (error) {
            console.error('Erro ao verificar carteira:', error);
            return false;
        }
    }

    /**
     * Obtém o endereço da carteira conectada
     * @returns {string|null} Endereço ou null
     */
    static async getWalletAddress() {
        try {
            if (!window.ethereum) return null;
            
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            return accounts && accounts.length > 0 ? accounts[0] : null;
        } catch (error) {
            console.error('Erro ao obter endereço:', error);
            return null;
        }
    }

    /**
     * Valida dados básicos de um token
     * @param {Object} tokenData Dados do token
     * @returns {Object} {valid: boolean, errors: string[]}
     */
    static validateTokenData(tokenData) {
        const errors = [];

        if (!tokenData.name || tokenData.name.trim().length < 2) {
            errors.push('Nome do token deve ter pelo menos 2 caracteres');
        }

        if (!tokenData.symbol || tokenData.symbol.trim().length < 2) {
            errors.push('Símbolo do token deve ter pelo menos 2 caracteres');
        }

        if (!tokenData.totalSupply || isNaN(tokenData.totalSupply) || tokenData.totalSupply <= 0) {
            errors.push('Supply total deve ser um número maior que zero');
        }

        if (!tokenData.owner || !ethers.utils.isAddress(tokenData.owner)) {
            errors.push('Endereço do proprietário inválido');
        }

        const decimals = parseInt(tokenData.decimals);
        if (isNaN(decimals) || decimals < 0 || decimals > 18) {
            errors.push('Decimais deve ser um número entre 0 e 18');
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    }

    // ==================== FORMATAÇÃO ====================
    
    /**
     * Formata valores numéricos para exibição
     * @param {string|number} value Valor para formatar
     * @param {number} decimals Número de decimais
     * @returns {string} Valor formatado
     */
    static formatTokenAmount(value, decimals = 18) {
        try {
            if (!value) return '0';
            
            const num = parseFloat(value);
            if (isNaN(num)) return '0';
            
            return new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: Math.min(decimals, 6)
            }).format(num);
        } catch (error) {
            console.error('Erro ao formatar valor:', error);
            return value.toString();
        }
    }

    /**
     * Formata endereços para exibição (6 primeiros + ... + 4 últimos)
     * @param {string} address Endereço para formatar
     * @returns {string} Endereço formatado
     */
    static formatAddress(address) {
        if (!address || address.length < 10) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    // ==================== UTILITÁRIOS DIVERSOS ====================
    
    /**
     * Gera uma chave privada aleatória (para deploy via API)
     * @returns {string} Chave privada hex
     */
    static generateRandomPrivateKey() {
        if (typeof ethers === 'undefined') {
            throw new Error('Ethers.js não carregado');
        }
        
        const wallet = ethers.Wallet.createRandom();
        return wallet.privateKey;
    }

    /**
     * Adiciona delay para evitar rate limiting
     * @param {number} ms Milissegundos para aguardar
     */
    static async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Verifica se ethers está disponível
     * @returns {boolean} True se disponível
     */
    static isEthersAvailable() {
        return typeof ethers !== 'undefined' && typeof window.ethereum !== 'undefined';
    }
}

// Log de inicialização
console.log('🔧 BlockchainUtils carregado - Utilitários blockchain disponíveis');

// Exportar para uso global
window.BlockchainUtils = BlockchainUtils;
