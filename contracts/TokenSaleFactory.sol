// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TokenSale.sol";

/**
 * @title TokenSaleFactory
 * @dev Factory contract para criar instâncias de TokenSale de forma automatizada
 * Permite que usuários criem seus próprios contratos de venda sem conhecimento técnico
 */
contract TokenSaleFactory {
    
    // Evento emitido quando um novo contrato de venda é criado
    event SaleCreated(
        address indexed creator,
        address indexed saleContract,
        address indexed token,
        uint256 pricePerToken,
        address paymentToken
    );
    
    // Array para armazenar todos os contratos criados
    address[] public allSales;
    
    // Mapeamento de endereços para seus contratos de venda
    mapping(address => address[]) public userSales;
    
    // Taxa do factory (0.25% = 25 basis points)
    uint256 public constant FACTORY_FEE_BPS = 25;
    address public feeRecipient;
    
    // Endereço do TokenCafe para comissões
    address public constant TOKENCAFE_WALLET = 0x1234567890123456789012345678901234567890; // Atualizar com endereço real
    
    constructor(address _feeRecipient) {
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Cria um novo contrato de venda automatizado
     * @param _token Endereço do token a ser vendido
     * @param _pricePerToken Preço por token em unidades mínimas da moeda de pagamento
     * @param _paymentToken Endereço do token de pagamento (USDT, BUSD, etc.)
     * @param _minPurchase Quantidade mínima de tokens por compra
     * @param _maxPurchase Quantidade máxima de tokens por compra
     * @param _wallet Carteira que receberá os pagamentos
     */
    function createSale(
        address _token,
        uint256 _pricePerToken,
        address _paymentToken,
        uint256 _minPurchase,
        uint256 _maxPurchase,
        address _wallet
    ) external returns (address saleContract) {
        
        // Validações básicas
        require(_token != address(0), "Token address cannot be zero");
        require(_paymentToken != address(0), "Payment token cannot be zero");
        require(_wallet != address(0), "Wallet cannot be zero");
        require(_pricePerToken > 0, "Price must be greater than zero");
        require(_minPurchase <= _maxPurchase, "Min purchase must be <= max purchase");
        
        // Criar novo contrato de venda com o proxy para comissões
        TokenSale newSale = new TokenSale(
            _token,
            _pricePerToken,
            _paymentToken,
            _minPurchase,
            _maxPurchase,
            TOKENCAFE_WALLET // TokenCafe recebe as comissões automaticamente
        );
        
        saleContract = address(newSale);
        
        // Transferir propriedade para o criador
        newSale.transferOwnership(_wallet);
        
        // Registrar o contrato criado
        allSales.push(saleContract);
        userSales[msg.sender].push(saleContract);
        
        // Emitir evento
        emit SaleCreated(msg.sender, saleContract, _token, _pricePerToken, _paymentToken);
        
        return saleContract;
    }
    
    /**
     * @dev Cria um contrato de venda com parâmetros simplificados (auto-detectados)
     * @param _token Endereço do token a ser vendido
     * @param _pricePerToken Preço por token
     * @param _wallet Carteira que receberá os pagamentos
     */
    function createSimpleSale(
        address _token,
        uint256 _pricePerToken,
        address _wallet
    ) external returns (address saleContract) {
        
        // Usar USDT como padrão se disponível, caso contrário usar BNB/ETH
        address paymentToken = getDefaultPaymentToken();
        
        // Configurações padrão para compra mínima e máxima
        uint256 minPurchase = 1 * 10**18; // 1 token
        uint256 maxPurchase = 1000000 * 10**18; // 1 milhão de tokens
        
        return createSale(
            _token,
            _pricePerToken,
            paymentToken,
            minPurchase,
            maxPurchase,
            _wallet
        );
    }
    
    /**
     * @dev Retorna o token de pagamento padrão baseado na blockchain
     */
    function getDefaultPaymentToken() public view returns (address) {
        // BSC Mainnet
        if (block.chainid == 56) {
            return 0x55d398326f99059fF775485246999027B3197955; // USDT BSC
        }
        // BSC Testnet
        else if (block.chainid == 97) {
            return 0x337610d27c682E347C92c2a8b0B7432C6F9E08C1; // USDT BSC Testnet
        }
        // Ethereum Mainnet
        else if (block.chainid == 1) {
            return 0xdAC17F958D2ee523a2206206994597C13D831ec7; // USDT Ethereum
        }
        // Polygon Mainnet
        else if (block.chainid == 137) {
            return 0xc2132D05D31c914a87C6611C10748AEb04B58e8F; // USDT Polygon
        }
        // Default - retornar 0 para indicar uso de moeda nativa (BNB/ETH)
        else {
            return address(0);
        }
    }
    
    /**
     * @dev Retorna todos os contratos de venda de um usuário
     */
    function getUserSales(address user) external view returns (address[] memory) {
        return userSales[user];
    }
    
    /**
     * @dev Retorna o número total de contratos criados
     */
    function getSalesCount() external view returns (uint256) {
        return allSales.length;
    }
    
    /**
     * @dev Retorna contratos em lotes para paginação
     */
    function getSalesPaginated(uint256 start, uint256 limit) 
        external 
        view 
        returns (address[] memory sales, uint256 total) 
    {
        uint256 totalSales = allSales.length;
        
        if (start >= totalSales) {
            return (new address[](0), totalSales);
        }
        
        uint256 end = start + limit;
        if (end > totalSales) {
            end = totalSales;
        }
        
        uint256 count = end - start;
        sales = new address[](count);
        
        for (uint256 i = 0; i < count; i++) {
            sales[i] = allSales[start + i];
        }
        
        return (sales, totalSales);
    }
}