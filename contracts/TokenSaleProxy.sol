// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title TokenSaleProxy
 * @dev Proxy contract que intercepta compras e redireciona com comissão
 * Mantém 95% para o vendedor e 5% para o TokenCafe
 */
contract TokenSaleProxy {
    
    // Endereço do contrato de venda original
    address public immutable saleContract;
    
    // Endereço que receberá as comissões (TokenCafe)
    address public immutable feeRecipient;
    
    // Taxa de comissão (5% = 500 basis points)
    uint256 public constant COMMISSION_BPS = 500;
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    // Evento emitido quando uma compra é processada com comissão
    event PurchaseWithCommission(
        address indexed buyer,
        uint256 totalAmount,
        uint256 sellerAmount,
        uint256 commissionAmount
    );
    
    /**
     * @dev Construtor do proxy
     * @param _saleContract Endereço do contrato de venda original
     * @param _feeRecipient Endereço que receberá as comissões
     */
    constructor(address _saleContract, address _feeRecipient) {
        require(_saleContract != address(0), "Sale contract cannot be zero");
        require(_feeRecipient != address(0), "Fee recipient cannot be zero");
        
        saleContract = _saleContract;
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @dev Função fallback que intercepta compras
     * Redireciona 95% para o vendedor original e 5% para o TokenCafe
     */
    receive() external payable {
        // Calcular valores
        uint256 totalAmount = msg.value;
        uint256 commissionAmount = (totalAmount * COMMISSION_BPS) / BPS_DENOMINATOR;
        uint256 sellerAmount = totalAmount - commissionAmount;
        
        // Enviar comissão para o TokenCafe
        (bool commissionSuccess, ) = feeRecipient.call{value: commissionAmount}("");
        require(commissionSuccess, "Commission transfer failed");
        
        // Enviar restante para o contrato original
        (bool sellerSuccess, ) = saleContract.call{value: sellerAmount}("");
        require(sellerSuccess, "Seller transfer failed");
        
        emit PurchaseWithCommission(msg.sender, totalAmount, sellerAmount, commissionAmount);
    }
    
    /**
     * @dev Função para comprar tokens com comissão
     * @param amount Quantidade de tokens a comprar
     */
    function buyTokensWithCommission(uint256 amount) external payable {
        require(amount > 0, "Amount must be greater than zero");
        
        // Calcular valores
        uint256 totalAmount = msg.value;
        uint256 commissionAmount = (totalAmount * COMMISSION_BPS) / BPS_DENOMINATOR;
        uint256 sellerAmount = totalAmount - commissionAmount;
        
        // Enviar comissão para o TokenCafe
        (bool commissionSuccess, ) = feeRecipient.call{value: commissionAmount}("");
        require(commissionSuccess, "Commission transfer failed");
        
        // Criar interface mínima para chamar o contrato original
        (bool sellerSuccess, ) = saleContract.call{value: sellerAmount}(
            abi.encodeWithSignature("buy(uint256)", amount)
        );
        require(sellerSuccess, "Token purchase failed");
        
        emit PurchaseWithCommission(msg.sender, totalAmount, sellerAmount, commissionAmount);
    }
    
    /**
     * @dev Retorna informações sobre a divisão de pagamento
     */
    function getPaymentSplit(uint256 totalAmount) 
        external 
        pure 
        returns (uint256 sellerAmount, uint256 commissionAmount) 
    {
        commissionAmount = (totalAmount * COMMISSION_BPS) / BPS_DENOMINATOR;
        sellerAmount = totalAmount - commissionAmount;
    }
    
    /**
     * @dev Verifica se o proxy está ativo
     */
    function isActive() external view returns (bool) {
        return saleContract != address(0) && feeRecipient != address(0);
    }
}
