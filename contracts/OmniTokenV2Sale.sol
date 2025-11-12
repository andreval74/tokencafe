// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./OmniTokenUpgradeable.sol";

/**
 * OmniToken V2 (FILHO - upgrade de lógica)
 * - Adiciona módulo de venda direta BNB/tBNB
 * - Mantém endereço via proxy UUPS
 * - Compatível com widgets: buy(), buy(uint256), aliases e getters de preço
 */
contract OmniTokenV2 is OmniToken {
    // Configurações de venda
    bool public saleActive;
    bool public salePaused;
    uint256 public tokenPrice; // wei por 1 token inteiro
    uint256 public minPurchase;
    uint256 public maxPurchase;
    uint256 public perWalletCap; // limite por carteira em unidades mínimas
    address public treasury;
    mapping(address => uint256) public walletPurchased;

    event TokensPurchased(address indexed buyer, uint256 bnbAmount, uint256 tokenAmount);
    event PriceUpdated(uint256 newPrice);
    event TreasuryUpdated(address indexed newTreasury);
    event SaleStateUpdated(bool active, bool paused);
    event LimitsUpdated(uint256 minPurchase, uint256 maxPurchase, uint256 perWalletCap);

    // Inicializador da versão 2 (reinitializer)
    function initializeV2(
        address treasury_,
        uint256 tokenPrice_,
        uint256 minPurchase_,
        uint256 maxPurchase_,
        uint256 perWalletCap_,
        bool saleActive_
    ) public reinitializer(2) {
        treasury = treasury_;
        tokenPrice = tokenPrice_;
        minPurchase = minPurchase_;
        maxPurchase = maxPurchase_;
        perWalletCap = perWalletCap_;
        saleActive = saleActive_;
        salePaused = false;
    }

    modifier whenSaleActive() {
        require(saleActive && !salePaused, "Sale not active");
        _;
    }

    // Getters de preço para compatibilidade
    function price() external view returns (uint256) {
        return tokenPrice;
    }

    function tokenPriceWei() external view returns (uint256) {
        return tokenPrice;
    }

    function getTokensForEth(uint256 ethAmount) external view returns (uint256) {
        return (ethAmount * (10 ** uint256(decimals()))) / tokenPrice;
    }

    function getEthForTokens(uint256 tokenAmount) external view returns (uint256) {
        return (tokenAmount * tokenPrice) / (10 ** uint256(decimals()));
    }

    // Compra direta por valor enviado
    function buy() external payable nonReentrant whenActive whenSaleActive {
        require(msg.value >= minPurchase, "Below minimum");
        require(msg.value <= maxPurchase, "Above maximum");

        uint256 tokensToReceive = (msg.value * (10 ** uint256(decimals()))) / tokenPrice;

        if (perWalletCap > 0) {
            require(walletPurchased[msg.sender] + tokensToReceive <= perWalletCap, "Per-wallet cap exceeded");
        }

        uint256 contractBalance = balanceOf(address(this));
        require(contractBalance >= tokensToReceive, "Insufficient tokens");

        walletPurchased[msg.sender] += tokensToReceive;

        _transfer(address(this), msg.sender, tokensToReceive);

        (bool ok, ) = treasury.call{value: msg.value}("");
        require(ok, "Treasury transfer failed");

        emit TokensPurchased(msg.sender, msg.value, tokensToReceive);
    }

    // Compra por quantidade desejada (em unidades mínimas)
    function buy(uint256 quantity) external payable nonReentrant whenActive whenSaleActive {
        require(quantity > 0, "Quantity must be > 0");

        uint256 cost = (tokenPrice * quantity) / (10 ** uint256(decimals()));
        require(msg.value >= cost, "Insufficient BNB");
        require(cost >= minPurchase, "Below minimum");
        require(cost <= maxPurchase, "Above maximum");
        if (perWalletCap > 0) {
            require(walletPurchased[msg.sender] + quantity <= perWalletCap, "Per-wallet cap exceeded");
        }

        uint256 contractBalance = balanceOf(address(this));
        require(contractBalance >= quantity, "Insufficient tokens");

        walletPurchased[msg.sender] += quantity;

        _transfer(address(this), msg.sender, quantity);

        (bool ok, ) = treasury.call{value: cost}("");
        require(ok, "Treasury transfer failed");

        uint256 excess = msg.value - cost;
        if (excess > 0) {
            (bool refundOk, ) = msg.sender.call{value: excess}("");
            require(refundOk, "Refund failed");
        }

        emit TokensPurchased(msg.sender, cost, quantity);
    }

    // Aliases de compatibilidade
    function buyTokens() external payable {
        this.buy{value: msg.value}();
    }

    function purchase() external payable {
        this.buy{value: msg.value}();
    }

    // Admin
    function setTokenPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be > 0");
        tokenPrice = newPrice;
        emit PriceUpdated(newPrice);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Zero address");
        treasury = newTreasury;
        emit TreasuryUpdated(newTreasury);
    }

    function setSaleActive(bool active) external onlyOwner {
        saleActive = active;
        emit SaleStateUpdated(saleActive, salePaused);
    }

    function setSalePaused(bool paused) external onlyOwner {
        salePaused = paused;
        emit SaleStateUpdated(saleActive, salePaused);
    }

    function setLimits(uint256 min_, uint256 max_, uint256 cap_) external onlyOwner {
        minPurchase = min_;
        maxPurchase = max_;
        perWalletCap = cap_;
        emit LimitsUpdated(min_, max_, cap_);
    }

    // Movimentação de estoque para venda
    function depositTokens(uint256 amount) external onlyOwner {
        require(balanceOf(owner()) >= amount, "Owner balance low");
        _transfer(owner(), address(this), amount);
    }

    function tokensForSale() external view returns (uint256) {
        return balanceOf(address(this));
    }

    // Versão
    function version() external pure override returns (uint256) {
        return 2;
    }

    receive() external payable {}
}

