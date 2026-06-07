// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TokenCafeERC20.sol";

/**
 * @title TokenCafeFactory
 * @notice Fábrica de tokens ERC-20 com sistema de bonificação por indicação.
 *
 * Modelo de taxas (moeda nativa):
 *   createToken              → criador paga P   → plataforma recebe 100%
 *   createTokenWithReferral  → criador paga 0.9P → plataforma 80%, indicador 10%, criador economiza 10%
 *
 * Pagamento em ERC-20:
 *   Mapeado via setCurrencyPrice(tokenERC20, preço).
 *   Usa transferFrom: criador deve aprovar a factory antes da chamada.
 *
 * Segurança:
 *   - ReentrancyGuard inline
 *   - Ownable2Step inline
 *   - Pausável (emergência)
 *   - Checks-Effects-Interactions em todas as funções payable
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

abstract contract ReentrancyGuard {
    uint256 private _status = 1;
    modifier nonReentrant() {
        require(_status == 1, "TCF: reentrant call");
        _status = 2;
        _;
        _status = 1;
    }
}

contract TokenCafeFactory is ReentrancyGuard {

    // ── Ownership (two-step) ──────────────────────────────────────────────────
    address public owner;
    address public pendingOwner;

    // ── Config ────────────────────────────────────────────────────────────────
    address public platformWallet;
    uint256 public basePrice;      // em wei (moeda nativa)
    bool    public paused;

    // currency ERC-20 address => preço nessa moeda (0 = não suportada)
    mapping(address => uint256) public currencyPrice;

    // ── Structs ───────────────────────────────────────────────────────────────
    struct TokenParams {
        string  name;
        string  symbol;
        uint8   decimals;
        uint256 initialSupply;
        address initialOwner;   // address(0) → usa msg.sender
        bool    mintable;
        bool    burnable;
        bool    pausable;
    }

    // ── Events ────────────────────────────────────────────────────────────────
    event TokenCreated(
        address indexed token,
        address indexed creator,
        address indexed referrer,
        string  name,
        string  symbol,
        uint256 feePaid,
        address currency        // address(0) = moeda nativa
    );
    event BasePriceUpdated(uint256 oldPrice, uint256 newPrice);
    event CurrencyPriceSet(address indexed currency, uint256 price);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Withdrawn(address indexed to, uint256 amount);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "TCF: not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "TCF: paused");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address _platformWallet, uint256 _basePrice) {
        require(_platformWallet != address(0), "TCF: zero wallet");
        owner          = msg.sender;
        platformWallet = _platformWallet;
        basePrice      = _basePrice;
    }

    // ── Token creation — moeda nativa ─────────────────────────────────────────

    /**
     * @notice Cria token pagando o preço cheio em moeda nativa.
     *         Plataforma recebe 100% do valor enviado.
     */
    function createToken(TokenParams calldata params)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (address token)
    {
        require(msg.value == basePrice, "TCF: valor incorreto");
        token = _deploy(params);
        _sendNative(platformWallet, msg.value);
        emit TokenCreated(token, msg.sender, address(0), params.name, params.symbol, msg.value, address(0));
    }

    /**
     * @notice Cria token com código de indicação em moeda nativa.
     *         Criador paga 90% do preço base.
     *         Plataforma recebe 80%, indicador recebe 10% (do preço base).
     *
     * @param params   Parâmetros do token
     * @param referrer Endereço do indicador (não pode ser msg.sender)
     */
    function createTokenWithReferral(TokenParams calldata params, address referrer)
        external
        payable
        nonReentrant
        whenNotPaused
        returns (address token)
    {
        require(referrer != address(0) && referrer != msg.sender, "TCF: referrer invalido");

        uint256 discounted = _discountedNative();
        require(msg.value == discounted, "TCF: valor incorreto");

        // Deploy antes de transferências (CEI)
        token = _deploy(params);

        uint256 toReferrer = basePrice / 10;                // 10% do basePrice
        uint256 toPlatform = msg.value - toReferrer;        // resto para plataforma (≈80%)

        _sendNative(referrer,       toReferrer);
        _sendNative(platformWallet, toPlatform);

        emit TokenCreated(token, msg.sender, referrer, params.name, params.symbol, msg.value, address(0));
    }

    // ── Token creation — ERC-20 ───────────────────────────────────────────────

    /**
     * @notice Cria token pagando em ERC-20 (preço cheio).
     *         O criador deve ter aprovado a factory previamente.
     *
     * @param params   Parâmetros do token
     * @param currency Endereço do token ERC-20 usado como moeda
     */
    function createTokenWithERC20(TokenParams calldata params, address currency)
        external
        nonReentrant
        whenNotPaused
        returns (address token)
    {
        uint256 price = _validCurrencyPrice(currency);
        token = _deploy(params);
        require(IERC20(currency).transferFrom(msg.sender, platformWallet, price), "TCF: transfer falhou");
        emit TokenCreated(token, msg.sender, address(0), params.name, params.symbol, price, currency);
    }

    /**
     * @notice Cria token com indicação pagando em ERC-20 (preço descontado).
     *         Criador paga 90% do preço; plataforma 80%, indicador 10% (do preço cheio).
     */
    function createTokenWithERC20AndReferral(
        TokenParams calldata params,
        address currency,
        address referrer
    )
        external
        nonReentrant
        whenNotPaused
        returns (address token)
    {
        require(referrer != address(0) && referrer != msg.sender, "TCF: referrer invalido");

        uint256 price      = _validCurrencyPrice(currency);
        uint256 toReferrer = price / 10;        // 10% do preço cheio
        uint256 toPlatform = price * 4 / 5;     // 80% do preço cheio (= discounted - referrer)

        token = _deploy(params);

        require(IERC20(currency).transferFrom(msg.sender, platformWallet, toPlatform), "TCF: transfer plataforma falhou");
        require(IERC20(currency).transferFrom(msg.sender, referrer,       toReferrer), "TCF: transfer indicador falhou");

        emit TokenCreated(token, msg.sender, referrer, params.name, params.symbol, toPlatform + toReferrer, currency);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setBasePrice(uint256 newPrice) external onlyOwner {
        emit BasePriceUpdated(basePrice, newPrice);
        basePrice = newPrice;
    }

    function setCurrencyPrice(address currency, uint256 price) external onlyOwner {
        require(currency != address(0), "TCF: zero currency");
        currencyPrice[currency] = price;
        emit CurrencyPriceSet(currency, price);
    }

    function setPlatformWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "TCF: zero address");
        emit PlatformWalletUpdated(platformWallet, newWallet);
        platformWallet = newWallet;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function withdraw() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "TCF: sem saldo");
        _sendNative(owner, bal);
        emit Withdrawn(owner, bal);
    }

    // ── Ownership (two-step) ──────────────────────────────────────────────────
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "TCF: zero address");
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == pendingOwner, "TCF: not pending owner");
        emit OwnershipTransferred(owner, pendingOwner);
        owner        = pendingOwner;
        pendingOwner = address(0);
    }

    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner        = address(0);
        pendingOwner = address(0);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    /** @notice Preço com desconto de 10% para criadores com indicação */
    function discountedPrice() external view returns (uint256) {
        return _discountedNative();
    }

    /** @notice Preço com desconto em ERC-20 para currency específica */
    function discountedPriceERC20(address currency) external view returns (uint256) {
        uint256 price = currencyPrice[currency];
        require(price > 0, "TCF: moeda nao suportada");
        return price * 9 / 10;
    }

    // ── Internal ──────────────────────────────────────────────────────────────
    function _deploy(TokenParams calldata p) internal returns (address) {
        address owner_ = p.initialOwner == address(0) ? msg.sender : p.initialOwner;
        return address(new TokenCafeERC20(
            p.name,
            p.symbol,
            p.decimals,
            p.initialSupply,
            owner_,
            p.mintable,
            p.burnable,
            p.pausable
        ));
    }

    function _discountedNative() internal view returns (uint256) {
        return basePrice * 9 / 10;
    }

    function _validCurrencyPrice(address currency) internal view returns (uint256 price) {
        price = currencyPrice[currency];
        require(price > 0, "TCF: moeda nao suportada");
    }

    function _sendNative(address to, uint256 amount) internal {
        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "TCF: transferencia falhou");
    }

    receive() external payable {}
}
