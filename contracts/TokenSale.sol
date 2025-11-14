// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @title TokenSale
 * @dev Contrato simples para venda de tokens que suporta pagamentos em BNB e USDT
 */
contract TokenSale {
    address public owner;
    address public saleToken;         // Token sendo vendido
    address public usdtToken;         // Endereço do contrato USDT
    address public destinationWallet; // Carteira que receberá os pagamentos
    address public platformFeeWallet;
    
    uint256 public bnbPrice;          // Preço em BNB por token (em wei)
    uint256 public usdtPrice;         // Preço em USDT por token (considerando decimais do USDT)
    uint256 public platformFeeBps;
    uint256 public platformFeeFixedBnb;
    uint256 public platformFeeFixedUsdt;

    // Limite por carteira (0 = sem limite) e rastreamento de compras por endereço
    uint256 public perWalletCap;      // Quantidade máxima de tokens por carteira
    mapping(address => uint256) public purchasedBy;
    
    event TokensPurchased(
        address indexed buyer,
        uint256 amount,
        uint256 cost,
        string paymentMethod
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o proprietario pode chamar esta funcao");
        _;
    }
    
    constructor(
        address _saleToken,
        address _usdtToken,
        address _destinationWallet,
        uint256 _bnbPrice,
        uint256 _usdtPrice
    ) {
        owner = msg.sender;
        saleToken = _saleToken;
        usdtToken = _usdtToken;
        destinationWallet = _destinationWallet;

        bnbPrice = _bnbPrice;
        usdtPrice = _usdtPrice;
    }
    
    /**
     * @dev Compra tokens com BNB
     * @param quantity Quantidade de tokens a serem comprados
     */
    function buy(uint256 quantity) external payable {
        require(quantity > 0, "Quantidade deve ser maior que zero");
        // Interpretar bnbPrice como preço por token inteiro; quantity é em unidades mínimas
        uint8 tokenDecimals = IERC20(saleToken).decimals();
        uint256 unitFactor = 10 ** tokenDecimals;
        uint256 totalCost = (bnbPrice * quantity) / unitFactor;
        require(msg.value >= totalCost, "BNB insuficiente enviado");
        
        // Transferir tokens para o comprador
        IERC20 token = IERC20(saleToken);
        require(token.balanceOf(address(this)) >= quantity, "Saldo de tokens insuficiente no contrato");

        // Limite por carteira (0 = sem limite)
        if (perWalletCap > 0) {
            require(purchasedBy[msg.sender] + quantity <= perWalletCap, "Limite por carteira excedido");
        }
        
        uint256 feePct = platformFeeBps > 0 ? (totalCost * platformFeeBps) / 10000 : 0;
        uint256 feeFix = platformFeeFixedBnb;
        uint256 feeTotal = feePct + feeFix;
        if (feeTotal > totalCost) feeTotal = totalCost;
        uint256 toDest = totalCost - feeTotal;
        if (feeTotal > 0 && platformFeeWallet != address(0)) {
            (bool f1, ) = platformFeeWallet.call{value: feeTotal}("");
            require(f1, "Falha ao enviar taxa");
        }
        (bool sent, ) = destinationWallet.call{value: toDest}("");
        require(sent, "Falha ao enviar BNB");
        
        // Transferir tokens para o comprador
        require(token.transfer(msg.sender, quantity), "Falha na transferencia de tokens");
        
        // Atualiza a quantidade comprada pelo comprador
        purchasedBy[msg.sender] += quantity;
        
        emit TokensPurchased(msg.sender, quantity, msg.value, "BNB");
        
        // Devolver BNB excedente, se houver
        uint256 excess = msg.value - totalCost;
        if (excess > 0) {
            (bool refundSent, ) = msg.sender.call{value: excess}("");
            require(refundSent, "Falha ao devolver BNB excedente");
        }
    }
    
    /**
     * @dev Compra tokens com USDT
     * @param quantity Quantidade de tokens a serem comprados
     */
    function buyWithUSDT(uint256 quantity) external {
        require(quantity > 0, "Quantidade deve ser maior que zero");
        
        IERC20 usdt = IERC20(usdtToken);
        IERC20 token = IERC20(saleToken);
        
        // Interpretar usdtPrice como preço por token inteiro; quantity é em unidades mínimas
        uint8 tokenDecimals = token.decimals();
        uint256 unitFactor = 10 ** tokenDecimals;
        uint256 totalCost = (usdtPrice * quantity) / unitFactor;
        
        // Verificar se o contrato tem tokens suficientes
        require(token.balanceOf(address(this)) >= quantity, "Saldo de tokens insuficiente no contrato");
        
        // Limite por carteira (0 = sem limite)
        if (perWalletCap > 0) {
            require(purchasedBy[msg.sender] + quantity <= perWalletCap, "Limite por carteira excedido");
        }
        
        uint256 feePct = platformFeeBps > 0 ? (totalCost * platformFeeBps) / 10000 : 0;
        uint256 feeFix = platformFeeFixedUsdt;
        uint256 feeTotal = feePct + feeFix;
        if (feeTotal > totalCost) feeTotal = totalCost;
        uint256 toDest = totalCost - feeTotal;
        if (feeTotal > 0 && platformFeeWallet != address(0)) {
            require(usdt.transferFrom(msg.sender, platformFeeWallet, feeTotal), "Falha taxa USDT");
        }
        require(usdt.transferFrom(msg.sender, destinationWallet, toDest), "Falha na transferencia de USDT");
        
        // Transferir tokens para o comprador
        require(token.transfer(msg.sender, quantity), "Falha na transferencia de tokens");
        
        // Atualiza a quantidade comprada pelo comprador
        purchasedBy[msg.sender] += quantity;
        
        emit TokensPurchased(msg.sender, quantity, totalCost, "USDT");
    }
    
    /**
     * @dev Deposita tokens no contrato para venda
     * @param amount Quantidade de tokens a serem depositados
     */
    function depositTokens(uint256 amount) external {
        IERC20 token = IERC20(saleToken);
        require(token.transferFrom(msg.sender, address(this), amount), "Falha ao depositar tokens");
    }
    
    /**
     * @dev Retira tokens não vendidos do contrato
     * @param amount Quantidade de tokens a serem retirados
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        IERC20 token = IERC20(saleToken);
        require(token.transfer(owner, amount), "Falha ao retirar tokens");
    }
    
    /**
     * @dev Atualiza o preço em BNB por token
     * @param newPrice Novo preço em wei
     */
    function updateBnbPrice(uint256 newPrice) external onlyOwner {
        bnbPrice = newPrice;
    }
    
    /**
     * @dev Atualiza o preço em USDT por token
     * @param newPrice Novo preço considerando decimais do USDT
     */
    function updateUsdtPrice(uint256 newPrice) external onlyOwner {
        usdtPrice = newPrice;
    }
    
    /**
     * @dev Atualiza a carteira de destino
     * @param newWallet Nova carteira de destino
     */
    function updateDestinationWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Endereco invalido");
        destinationWallet = newWallet;
    }
    
    /**
     * @dev Atualiza o endereço do contrato USDT
     * @param newUsdtToken Novo endereço do contrato USDT
     */
    function updateUsdtToken(address newUsdtToken) external onlyOwner {
        require(newUsdtToken != address(0), "Endereco invalido");
        usdtToken = newUsdtToken;
    }
    
    function updatePerWalletCap(uint256 newCap) external onlyOwner {
        perWalletCap = newCap;
    }

    function setPlatformFee(address wallet, uint256 bps, uint256 fixedBnb, uint256 fixedUsdt) external onlyOwner {
        platformFeeWallet = wallet;
        platformFeeBps = bps;
        platformFeeFixedBnb = fixedBnb;
        platformFeeFixedUsdt = fixedUsdt;
    }
}
