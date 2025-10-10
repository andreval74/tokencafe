/**
 * Cliente API Híbrida para xcafe - Deploy via MetaMask
 * Versão simplificada: API compila, usuário paga deploy
 */

class XcafeHybridAPI {
    constructor(apiBaseUrl = 'https://xcafe-token-api-hybrid.onrender.com') {
        this.baseUrl = apiBaseUrl;
        this.timeout = 60000; // 1 minuto para compilação
        this.provider = null;
        this.signer = null;
    }

    /**
     * Faz requisição para API com tratamento de erros
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const defaultOptions = {
            timeout: this.timeout,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            }
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            console.log(`🌐 Chamando API: ${url}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);

            const response = await fetch(url, {
                ...finalOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            console.log(`✅ Resposta da API:`, data);
            
            return data;

        } catch (error) {
            console.error(`❌ Erro na requisição para ${url}:`, error);
            throw error;
        }
    }

    /**
     * Verifica se a API está funcionando
     */
    async checkHealth() {
        try {
            const result = await this.makeRequest('/health');
            return result;
        } catch (error) {
            console.error('❌ API não está respondendo:', error);
            throw new Error('API indisponível: ' + error.message);
        }
    }

    /**
     * Conectar MetaMask
     */
    async connectWallet() {
        try {
            if (!window.ethereum) {
                throw new Error('MetaMask não encontrado. Instale a extensão MetaMask.');
            }

            // Solicitar conexão
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            this.signer = this.provider.getSigner();
            
            const address = await this.signer.getAddress();
            const network = await this.provider.getNetwork();
            
            console.log('✅ MetaMask conectado:', address);
            console.log('🌐 Rede:', network.name);
            
            return {
                success: true,
                address: address,
                network: network
            };

        } catch (error) {
            console.error('❌ Erro ao conectar MetaMask:', error);
            throw new Error('Falha ao conectar MetaMask: ' + error.message);
        }
    }

    /**
     * Gerar e compilar token ERC-20 padrão
     */
    async generateToken(tokenData) {
        try {
            const { name, symbol, totalSupply, decimals } = tokenData;

            if (!name || !symbol || !totalSupply) {
                throw new Error('Nome, símbolo e supply total são obrigatórios');
            }

            console.log('🔨 Gerando e compilando token:', name);

            const result = await this.makeRequest('/api/generate-token', {
                method: 'POST',
                body: JSON.stringify({
                    name: name,
                    symbol: symbol,
                    totalSupply: totalSupply,
                    decimals: decimals || 18
                })
            });

            if (!result.success) {
                throw new Error(result.error || 'Falha ao gerar token');
            }

            return result;

        } catch (error) {
            console.error('❌ Erro ao gerar token:', error);
            throw error;
        }
    }

    /**
     * Compilar código Solidity personalizado
     */
    async compileContract(contractData) {
        try {
            const { sourceCode, contractName } = contractData;

            if (!sourceCode || !contractName) {
                throw new Error('Código fonte e nome do contrato são obrigatórios');
            }

            console.log('🔨 Compilando contrato:', contractName);

            const result = await this.makeRequest('/api/compile-only', {
                method: 'POST',
                body: JSON.stringify({
                    sourceCode: sourceCode,
                    contractName: contractName,
                    optimization: true
                })
            });

            if (!result.success) {
                throw new Error(result.error || 'Falha na compilação');
            }

            return result;

        } catch (error) {
            console.error('❌ Erro na compilação:', error);
            throw error;
        }
    }

    /**
     * Estimar gas para deploy
     */
    async estimateDeployGas(compilationData, constructorArgs = []) {
        try {
            if (!this.signer) {
                throw new Error('MetaMask não conectado');
            }

            const contractFactory = new ethers.ContractFactory(
                compilationData.abi,
                compilationData.bytecode,
                this.signer
            );

            const gasLimit = await this.signer.estimateGas(
                contractFactory.getDeployTransaction(...constructorArgs)
            );

            const gasPrice = await this.provider.getGasPrice();
            const gasCost = gasLimit.mul(gasPrice);
            
            return {
                gasLimit: gasLimit,
                gasPrice: gasPrice,
                estimatedCost: ethers.utils.formatEther(gasCost),
                network: await this.provider.getNetwork()
            };

        } catch (error) {
            console.error('❌ Erro ao estimar gas:', error);
            // Retornar estimativa padrão se falhar
            return {
                gasLimit: ethers.BigNumber.from(2000000),
                gasPrice: ethers.utils.parseUnits('20', 'gwei'),
                estimatedCost: '~0.04',
                network: await this.provider.getNetwork()
            };
        }
    }

    /**
     * Deploy do contrato via MetaMask (usuário paga)
     */
    async deployContract(compilationData, constructorArgs = [], options = {}) {
        try {
            if (!this.signer) {
                throw new Error('MetaMask não conectado. Conecte sua carteira primeiro.');
            }

            console.log('🚀 Iniciando deploy via MetaMask...');

            // Estimar gas
            const gasEstimate = await this.estimateDeployGas(compilationData, constructorArgs);
            console.log('⛽ Gas estimado:', gasEstimate.estimatedCost);

            // Criar factory do contrato
            const contractFactory = new ethers.ContractFactory(
                compilationData.abi,
                compilationData.bytecode,
                this.signer
            );

            // Deploy com opções customizadas
            const deployOptions = {
                gasLimit: options.gasLimit || gasEstimate.gasLimit,
                gasPrice: options.gasPrice || gasEstimate.gasPrice
            };

            console.log('📝 Enviando transação de deploy...');
            const contract = await contractFactory.deploy(...constructorArgs, deployOptions);

            console.log('⏳ Aguardando confirmação...', contract.deployTransaction.hash);
            await contract.deployed();

            const network = await this.provider.getNetwork();

            console.log('✅ Deploy realizado com sucesso!');
            console.log('📍 Endereço do contrato:', contract.address);

            return {
                success: true,
                contractAddress: contract.address,
                transactionHash: contract.deployTransaction.hash,
                network: network,
                gasUsed: contract.deployTransaction.gasLimit?.toString(),
                explorer: this.getExplorerUrl(contract.address, network.chainId)
            };

        } catch (error) {
            console.error('❌ Erro no deploy:', error);
            
            // Tratar erros específicos do MetaMask
            if (error.code === 4001) {
                throw new Error('Deploy cancelado pelo usuário');
            } else if (error.code === -32603) {
                throw new Error('Saldo insuficiente para pagar gas fees');
            } else {
                throw new Error('Erro no deploy: ' + error.message);
            }
        }
    }

    /**
     * Fluxo completo: gerar, compilar e fazer deploy do token
     */
    async createToken(tokenData) {
        try {
            // 1. Conectar MetaMask se necessário
            if (!this.signer) {
                await this.connectWallet();
            }

            // 2. Gerar e compilar token
            const generation = await this.generateToken(tokenData);
            
            // 3. Deploy via MetaMask
            const deployment = await this.deployContract(generation.compilation);

            // 4. Retornar dados completos incluindo código fonte
            return {
                success: true,
                token: generation.token,
                sourceCode: generation.sourceCode, // IMPORTANTE: código real da API
                compilation: generation.compilation, // dados de compilação
                contract: {
                    address: deployment.contractAddress,
                    transactionHash: deployment.transactionHash,
                    network: deployment.network,
                    explorer: deployment.explorer
                },
                contractAddress: deployment.contractAddress,
                transactionHash: deployment.transactionHash,
                gasUsed: deployment.gasUsed,
                message: `Token ${tokenData.name} criado com sucesso!`
            };

        } catch (error) {
            console.error('❌ Erro ao criar token:', error);
            throw error;
        }
    }

    /**
     * Obter URL do explorer baseado na rede
     */
    getExplorerUrl(address, chainId) {
        const explorers = {
            1: `https://etherscan.io/address/${address}`,
            56: `https://bscscan.com/address/${address}`,
            97: `https://testnet.bscscan.com/address/${address}`,
            137: `https://polygonscan.com/address/${address}`,
            8453: `https://basescan.org/address/${address}`
        };

        return explorers[chainId] || `https://etherscan.io/address/${address}`;
    }

    /**
     * Testar funcionalidades da API
     */
    async testAPI() {
        try {
            console.log('🧪 Testando API híbrida...');
            
            // Testar health
            const health = await this.checkHealth();
            console.log('✅ Health check:', health.success);

            // Testar geração de token
            const tokenTest = await this.generateToken({
                name: 'TestToken',
                symbol: 'TEST',
                totalSupply: '1000000'
            });
            console.log('✅ Geração de token:', tokenTest.success);

            return {
                success: true,
                message: 'Todos os testes passaram!',
                features: health.features
            };

        } catch (error) {
            console.error('❌ Teste falhou:', error);
            throw error;
        }
    }
}

// Instância global da API
window.xcafeAPI = new XcafeHybridAPI();

// Compatibilidade com código legado
window.XcafeExtendedAPI = XcafeHybridAPI;

console.log('🚀 xcafe Hybrid API carregada - usuário paga deploy via MetaMask');
