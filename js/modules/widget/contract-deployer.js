/**
 * Módulo de Deploy Automático de Contratos Sale
 * Responsável por criar contratos de venda de forma automatizada
 */

// ABI do TokenSaleFactory (versão simplificada para deploy)
const TOKEN_SALE_FACTORY_ABI = [
  {
    inputs: [{ internalType: "address", name: "_feeRecipient", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { internalType: "address", name: "_token", type: "address" },
      { internalType: "uint256", name: "_pricePerToken", type: "uint256" },
      { internalType: "address", name: "_wallet", type: "address" },
    ],
    name: "createSimpleSale",
    outputs: [{ internalType: "address", name: "saleContract", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_token", type: "address" },
      { internalType: "uint256", name: "_pricePerToken", type: "uint256" },
      { internalType: "address", name: "_paymentToken", type: "address" },
      { internalType: "uint256", name: "_minPurchase", type: "uint256" },
      { internalType: "uint256", name: "_maxPurchase", type: "uint256" },
      { internalType: "address", name: "_wallet", type: "address" },
    ],
    name: "createSale",
    outputs: [{ internalType: "address", name: "saleContract", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserSales",
    outputs: [{ internalType: "address[]", name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
];

// Bytecode do TokenSaleFactory (placeholder - será substituído pelo real)
const TOKEN_SALE_FACTORY_BYTECODE = "0x608060405234801561001057600080fd5b50..."; // Bytecode real aqui

/**
 * Classe responsável pelo deploy automático de contratos de venda
 */
class ContractDeployer {
  constructor() {
    this.factoryAddress = null;
    this.factoryContract = null;
    this.networkManager = null;
  }

  /**
   * Inicializa o deployer com o gerenciador de rede
   */
  async initialize(networkManager) {
    this.networkManager = networkManager;
    console.log("ContractDeployer inicializado");
  }

  /**
   * Deploya o factory contract se ainda não existir
   */
  async deployFactory(signer) {
    try {
      console.log("Deployando TokenSaleFactory...");

      // Verificar se já existe um factory deployado
      const existingFactory = await this.getExistingFactory();
      if (existingFactory) {
        console.log("Factory já existe:", existingFactory);
        this.factoryAddress = existingFactory;
        this.factoryContract = new ethers.Contract(this.factoryAddress, TOKEN_SALE_FACTORY_ABI, signer);
        return this.factoryAddress;
      }

      // Criar factory contract
      const factory = new ethers.ContractFactory(TOKEN_SALE_FACTORY_ABI, TOKEN_SALE_FACTORY_BYTECODE, signer);

      // Deployar com o endereço do TokenCafe como fee recipient
      const tokenCafeWallet = await this.getTokenCafeWallet();
      const contract = await factory.deploy(tokenCafeWallet);

      console.log("Deploy em progresso:", contract.deployTransaction.hash);
      await contract.deployTransaction.wait();

      this.factoryAddress = contract.address;
      this.factoryContract = contract;

      console.log("TokenSaleFactory deployado em:", this.factoryAddress);
      return this.factoryAddress;
    } catch (error) {
      console.error("Erro ao deployar factory:", error);
      throw new Error("Falha ao criar factory contract: " + error.message);
    }
  }

  /**
   * Cria um contrato de venda simplificado
   */
  async createSimpleSale(tokenAddress, pricePerToken, walletAddress, signer) {
    try {
      console.log("Criando contrato de venda simplificado...");
      console.log("Token:", tokenAddress);
      console.log("Preço:", pricePerToken);
      console.log("Wallet:", walletAddress);

      // Garantir que o factory está disponível
      if (!this.factoryContract) {
        await this.deployFactory(signer);
      }

      // Converter preço para wei/unidades corretas
      const priceInWei = ethers.utils.parseEther(pricePerToken.toString());

      // Chamar createSimpleSale no factory
      const tx = await this.factoryContract.createSimpleSale(tokenAddress, priceInWei, walletAddress);

      console.log("Transação de criação enviada:", tx.hash);
      const receipt = await tx.wait();

      // Extrair endereço do novo contrato do evento
      const saleAddress = this.extractSaleAddressFromReceipt(receipt);

      console.log("Contrato de venda criado em:", saleAddress);
      return saleAddress;
    } catch (error) {
      console.error("Erro ao criar contrato de venda:", error);
      throw new Error("Falha ao criar contrato de venda: " + error.message);
    }
  }

  /**
   * Cria um contrato de venda com configurações avançadas
   */
  async createSale(tokenAddress, pricePerToken, paymentToken, minPurchase, maxPurchase, walletAddress, signer) {
    try {
      console.log("Criando contrato de venda avançado...");

      // Garantir que o factory está disponível
      if (!this.factoryContract) {
        await this.deployFactory(signer);
      }

      // Converter valores para wei/unidades corretas
      const priceInWei = ethers.utils.parseEther(pricePerToken.toString());
      const minInWei = ethers.utils.parseEther(minPurchase.toString());
      const maxInWei = ethers.utils.parseEther(maxPurchase.toString());

      // Chamar createSale no factory
      const tx = await this.factoryContract.createSale(tokenAddress, priceInWei, paymentToken, minInWei, maxInWei, walletAddress);

      console.log("Transação de criação avançada enviada:", tx.hash);
      const receipt = await tx.wait();

      // Extrair endereço do novo contrato do evento
      const saleAddress = this.extractSaleAddressFromReceipt(receipt);

      console.log("Contrato de venda avançado criado em:", saleAddress);
      return saleAddress;
    } catch (error) {
      console.error("Erro ao criar contrato de venda avançado:", error);
      throw new Error("Falha ao criar contrato de venda avançado: " + error.message);
    }
  }

  /**
   * Extrai o endereço do contrato criado do receipt da transação
   */
  extractSaleAddressFromReceipt(receipt) {
    // Procurar pelo evento SaleCreated
    for (const log of receipt.logs) {
      try {
        // Decodificar o evento SaleCreated
        const event = this.factoryContract.interface.parseLog(log);
        if (event.name === "SaleCreated") {
          return event.args.saleContract;
        }
      } catch (error) {
        // Log não é do evento esperado, continuar procurando
        continue;
      }
    }

    throw new Error("Não foi possível encontrar o endereço do contrato criado");
  }

  /**
   * Verifica se já existe um factory contract deployado
   */
  async getExistingFactory() {
    // Implementar lógica para verificar se já existe um factory
    // Isso pode envolver consultar um registry ou usar um endereço fixo

    // Por enquanto, retornar null para sempre criar um novo
    // Em produção, isso deve ser substituído por lógica real
    return null;
  }

  /**
   * Retorna o endereço da carteira do TokenCafe
   */
  async getTokenCafeWallet() {
    // Endereço da carteira do TokenCafe para receber comissões
    // Em produção, isso deve vir de uma configuração segura
    return "0x1234567890123456789012345678901234567890"; // Atualizar com endereço real
  }

  /**
   * Retorna os contratos de venda de um usuário
   */
  async getUserSales(userAddress) {
    if (!this.factoryContract) {
      return [];
    }

    try {
      const sales = await this.factoryContract.getUserSales(userAddress);
      return sales;
    } catch (error) {
      console.error("Erro ao buscar contratos do usuário:", error);
      return [];
    }
  }

  /**
   * Verifica se um contrato foi criado pelo factory
   */
  async isValidSaleContract(saleAddress) {
    if (!this.factoryContract || !saleAddress) {
      return false;
    }

    try {
      // Verificar se o contrato existe e é válido
      const code = await this.networkManager.provider.getCode(saleAddress);
      return code !== "0x";
    } catch (error) {
      console.error("Erro ao validar contrato:", error);
      return false;
    }
  }

  /**
   * Retorna o endereço do factory atual
   */
  getFactoryAddress() {
    return this.factoryAddress;
  }

  /**
   * Estima o custo de gas para criar um contrato de venda
   */
  async estimateCreationGas(simple = true) {
    if (!this.factoryContract) {
      return null;
    }

    try {
      if (simple) {
        // Estimar para createSimpleSale
        const gasEstimate = await this.factoryContract.estimateGas.createSimpleSale(
          "0x0000000000000000000000000000000000000000", // dummy address
          1,
          "0x0000000000000000000000000000000000000000", // dummy address
        );
        return gasEstimate.mul(110).div(100); // Adicionar 10% de margem
      } else {
        // Estimar para createSale
        const gasEstimate = await this.factoryContract.estimateGas.createSale(
          "0x0000000000000000000000000000000000000000", // dummy address
          1,
          "0x0000000000000000000000000000000000000000", // dummy address
          1,
          1000,
          "0x0000000000000000000000000000000000000000", // dummy address
        );
        return gasEstimate.mul(110).div(100); // Adicionar 10% de margem
      }
    } catch (error) {
      console.error("Erro ao estimar gas:", error);
      return null;
    }
  }
}

// Exportar a classe para uso global
window.ContractDeployer = ContractDeployer;
