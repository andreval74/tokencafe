// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/*
Gerado por:
Smart Contract Cafe
https://smartcontract.cafe
*/

/* ================================================================
 * ⚙️ CONFIGURAÇÕES DO TOKEN
 * ================================================================ */
string constant TOKEN_NAME = "{{TOKEN_NAME}}";           // Nome do token
string constant TOKEN_SYMBOL = "{{TOKEN_SYMBOL}}";       // Símbolo do token
uint8 constant TOKEN_DECIMALS = {{TOKEN_DECIMALS}};      // Casas decimais
uint256 constant TOKEN_SUPPLY = {{TOKEN_SUPPLY}};        // Supply inicial (em unidades inteiras)
address constant TOKEN_OWNER = {{TOKEN_OWNER}};          // Dono inicial do contrato
string constant TOKEN_LOGO_URI = "{{TOKEN_LOGO_URI}}";   // Logo do token (URL)
address constant ORIGINAL_CONTRACT = {{ORIGINAL_CONTRACT}}; // Contrato original (se aplicável)

/* ================================================================
 * 📖 INTERFACE DO CONTRATO ORIGINAL
 * ================================================================ */
interface Original {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address tokenOwner, address spender) external view returns (uint256);
}

/* ================================================================
 * 📖 INTERFACE PADRÃO ERC20
 * ================================================================ */
interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/* ================================================================
 * 💎 CONTRATO PRINCIPAL
 * ================================================================ */
contract {{TOKEN_SYMBOL}} {
    /* ================================================================
     * 🔗 VARIÁVEIS PÚBLICAS DO TOKEN
     * ================================================================ */
    string public constant name = TOKEN_NAME;
    string public constant symbol = TOKEN_SYMBOL;
    uint8 public constant decimals = TOKEN_DECIMALS;
    uint256 public constant totalSupply = TOKEN_SUPPLY * (10 ** uint256(decimals));
    string public logoURI;

    // 🛡️ Controle do contrato
    address public contractOwner;
    bool public paused;
    bool public terminated;
    Original private original = Original(ORIGINAL_CONTRACT);

    // 🗂️ Mapas de saldo e permissões
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // 🛑 Blacklist (endereços bloqueados)
    mapping(address => bool) public isBlacklisted;

    // 🐋 Anti-Whale (limites)
    uint256 public maxDailyTransferPercent = 1000; // 10%
    uint256 public maxMonthlyTransferPercent = 2000; // 20%
    mapping(address => bool) public isExemptFromLimits;

    // ✅ KYC (verificação de usuários)
    mapping(address => bool) public kycVerified;

    // 🔥 Burn e Migração
    uint256 public monthlyBurnPercent = 100; // 1% ao mês
    address public nextContract = address(0);

    // ❄️ Congelar contas
    mapping(address => bool) public frozenAccounts;

    // 💸 Taxas em transações
    uint256 public transferTaxPercent = 0; // Ex.: 200 = 2%
    address public taxWallet = TOKEN_OWNER;

    /* ================================================================
     * 📢 EVENTOS
     * ================================================================ */
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event Terminated(address indexed account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event OriginalBalanceChecked(address indexed account, uint256 balance);
    event Blacklisted(address indexed account, bool status);
    event KYCUpdated(address indexed account, bool verified);
    event AccountFrozen(address indexed account, bool isFrozen);
    event TokensBurned(uint256 amount);
    event Migration(address indexed to, uint256 amount);
    event Mint(address indexed to, uint256 amount);

    /* ================================================================
     * 🛡️ MODIFICADORES
     * ================================================================ */
    modifier onlyOwner() {
        require(msg.sender == contractOwner, "Only owner can call this function");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier whenActive() {
        require(!terminated, "Contract permanently terminated");
        _;
    }

    modifier notBlacklisted(address account) {
        require(!isBlacklisted[account], "Address is blacklisted");
        _;
    }

    modifier notFrozen(address account) {
        require(!frozenAccounts[account], "Account is frozen");
        _;
    }

    modifier onlyKYC(address account) {
        require(kycVerified[account], "Address not KYC verified");
        _;
    }

    /* ================================================================
     * 🏗️ CONSTRUTOR
     * ================================================================ */
    constructor() {
        contractOwner = TOKEN_OWNER;
        logoURI = TOKEN_LOGO_URI;
        _balances[contractOwner] = totalSupply;
        isExemptFromLimits[contractOwner] = true;

        emit Transfer(address(0x0), contractOwner, totalSupply);
    }

    /* ================================================================
     * 💸 FUNÇÕES ERC20
     * ================================================================ */
    function transfer(address recipient, uint256 amount)
        public
        whenNotPaused
        whenActive
        notBlacklisted(msg.sender)
        notBlacklisted(recipient)
        notFrozen(msg.sender)
        notFrozen(recipient)
        onlyKYC(msg.sender)
        onlyKYC(recipient)
        returns (bool)
    {
        _enforceAntiWhale(msg.sender, amount);
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function approve(address spender, uint256 amount)
        public
        whenNotPaused
        whenActive
        returns (bool)
    {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount)
        public
        whenNotPaused
        whenActive
        notBlacklisted(sender)
        notBlacklisted(recipient)
        notFrozen(sender)
        notFrozen(recipient)
        onlyKYC(sender)
        onlyKYC(recipient)
        returns (bool)
    {
        _enforceAntiWhale(sender, amount);
        require(_allowances[sender][msg.sender] >= amount, "Allowance exceeded");
        _approve(sender, msg.sender, _allowances[sender][msg.sender] - amount);
        _transfer(sender, recipient, amount);
        return true;
    }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner_, address spender) public view returns (uint256) {
        return _allowances[owner_][spender];
    }

    /* ================================================================
     * 🔥 FUNÇÕES INTERNAS
     * ================================================================ */
    function _transfer(address from, address to, uint256 amount) internal {
        require(_balances[from] >= amount, "Insufficient balance");

        // Calcula a taxa de transferência se aplicável
        uint256 taxAmount = (amount * transferTaxPercent) / 10000;
        uint256 netAmount = amount - taxAmount;

        _balances[from] -= amount;
        _balances[taxWallet] += taxAmount;
        _balances[to] += netAmount;

        emit Transfer(from, taxWallet, taxAmount);
        emit Transfer(from, to, netAmount);
    }

    function _approve(address owner_, address spender, uint256 amount) internal {
        _allowances[owner_][spender] = amount;
        emit Approval(owner_, spender, amount);
    }

    function _enforceAntiWhale(address from, uint256 amount) internal view {
        if (!isExemptFromLimits[from]) {
            uint256 maxDaily = (totalSupply * maxDailyTransferPercent) / 10000;
            uint256 maxMonthly = (totalSupply * maxMonthlyTransferPercent) / 10000;
            require(amount <= maxDaily, "Exceeds daily transfer limit");
            require(amount <= maxMonthly, "Exceeds monthly transfer limit");
        }
    }

    /* ================================================================
     * 🛠️ FUNÇÕES ADMINISTRATIVAS
     * ================================================================ */
    function pause() public onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() public onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function terminate() public onlyOwner {
        terminated = true;
        emit Terminated(msg.sender);
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0x0), "New owner is zero address");
        emit OwnershipTransferred(contractOwner, newOwner);
        contractOwner = newOwner;
    }

    function setBlacklist(address account, bool status) public onlyOwner {
        isBlacklisted[account] = status;
        emit Blacklisted(account, status);
    }

    function setKYC(address account, bool verified) public onlyOwner {
        kycVerified[account] = verified;
        emit KYCUpdated(account, verified);
    }

    function freezeAccount(address account, bool freeze) public onlyOwner {
        frozenAccounts[account] = freeze;
        emit AccountFrozen(account, freeze);
    }

    function setExemption(address account, bool exempt) public onlyOwner {
        isExemptFromLimits[account] = exempt;
    }

    function setTransferTax(uint256 taxPercent, address wallet) public onlyOwner {
        transferTaxPercent = taxPercent;
        taxWallet = wallet;
    }

    function burnMonthly() public onlyOwner {
        uint256 burnAmount = (_balances[address(this)] * monthlyBurnPercent) / 10000;
        require(burnAmount > 0, "Nothing to burn");
        _balances[address(this)] -= burnAmount;
        emit TokensBurned(burnAmount);
        emit Transfer(address(this), address(0), burnAmount);
    }

    function burn(uint256 amount) public {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        emit TokensBurned(amount);
        emit Transfer(msg.sender, address(0), amount);
    }

    function mint(address account, uint256 amount) public onlyOwner {
        require(!terminated, "Contract is terminated");
        _balances[account] += amount;
        emit Mint(account, amount);
        emit Transfer(address(0), account, amount);
    }

    function setLogoURI(string memory _logoURI) public onlyOwner {
        logoURI = _logoURI;
    }

    function setNextContract(address _nextContract) public onlyOwner {
        nextContract = _nextContract;
    }

    function migrateToNextContract() public onlyOwner {
        require(nextContract != address(0), "Next contract not set");
        uint256 contractBalance = _balances[address(this)];
        _transfer(address(this), nextContract, contractBalance);
        emit Migration(nextContract, contractBalance);
    }

    function recoverERC20(address tokenAddress, uint256 amount) public onlyOwner {
        IERC20(tokenAddress).transfer(contractOwner, amount);
    }

    /* ================================================================
     * 🚫 REJEITA ENVIO DE ETH
     * ================================================================ */
    receive() external payable {
        revert("ETH not accepted");
    }
}
