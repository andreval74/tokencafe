
// Utilitários simples para geração de templates
function sanitize(str) {
  return String(str || "").replace(/[^a-zA-Z0-9_]/g, "");
}

function getSafeDecimals(d) {
  const val = parseInt(d, 10);
  if (!Number.isFinite(val) || val < 0 || val > 18) return 18;
  return val;
}

function getSafeSupply(s) {
  try {
    const val = BigInt(String(s).replace(/[^0-9]/g, "") || "0");
    if (val <= 0n) return "0";
    return val.toString();
  } catch {
    return "0";
  }
}

// ==========================================
// 1. ERC20 Minimal
// ==========================================
function getERC20Minimal(name, symbol, decimals, totalSupply) {
  const safeName = sanitize(name);
  const safeSymbol = sanitize(symbol); // Simples, sem espaços
  const safeDec = getSafeDecimals(decimals);
  const safeSupply = getSafeSupply(totalSupply);
  
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ${name} (${symbol})
 * @dev Implementação ERC20 Minimalista gerada pelo TokenCafe
 */
contract ${safeName} {
    string public name = "${name}";
    string public symbol = "${symbol}";
    uint8 public decimals = ${safeDec};
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        // Supply inicial total para o criador
        totalSupply = ${safeSupply} * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Saldo insuficiente");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Saldo insuficiente");
        require(allowance[from][msg.sender] >= value, "Allowance insuficiente");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
}`;
}

// ==========================================
// 2. ERC20 Controls (Pausable + Ownable)
// ==========================================
function getERC20Controls(name, symbol, decimals, totalSupply) {
    const safeName = sanitize(name);
    const safeSymbol = sanitize(symbol);
    const safeDec = getSafeDecimals(decimals);
    const safeSupply = getSafeSupply(totalSupply);

    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @dev Modulo Ownable simples
 */
abstract contract Ownable {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(owner() == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

/**
 * @dev Modulo Pausable simples
 */
abstract contract Pausable is Ownable {
    bool private _paused;
    event Paused(address account);
    event Unpaused(address account);

    constructor() {
        _paused = false;
    }

    function paused() public view returns (bool) {
        return _paused;
    }

    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    modifier whenPaused() {
        require(_paused, "Pausable: not paused");
        _;
    }

    function pause() public onlyOwner {
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() public onlyOwner {
        _paused = false;
        emit Unpaused(msg.sender);
    }
}

/**
 * @title ${name} (${symbol})
 * @dev ERC20 com Controles (Ownable + Pausable)
 */
contract ${safeName} is Ownable, Pausable {
    string public name = "${name}";
    string public symbol = "${symbol}";
    uint8 public decimals = ${safeDec};
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        totalSupply = ${safeSupply} * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 value) public whenNotPaused returns (bool) {
        require(balanceOf[msg.sender] >= value, "Saldo insuficiente");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public whenNotPaused returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public whenNotPaused returns (bool) {
        require(balanceOf[from] >= value, "Saldo insuficiente");
        require(allowance[from][msg.sender] >= value, "Allowance insuficiente");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }

    // Função extra para o dono queimar tokens (exemplo de controle)
    function burn(uint256 value) public onlyOwner {
        require(balanceOf[msg.sender] >= value, "Saldo insuficiente para queimar");
        balanceOf[msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(msg.sender, address(0), value);
    }
}`;
}

// ==========================================
// 3. ERC20 Direct Sale
// ==========================================
function getERC20DirectSale(name, symbol, decimals, totalSupply, saleParams) {
    const safeName = sanitize(name);
    const safeSymbol = sanitize(symbol);
    const safeDec = getSafeDecimals(decimals);
    const safeSupply = getSafeSupply(totalSupply);

    // Params da venda
    // Recebemos strings decimais do frontend, convertemos para wei no contrato via constructor ou hardcoded?
    // Melhor hardcoded para simplicidade do gerador, ou variaveis.
    // Vamos usar variáveis inicializadas no construtor.
    
    // saleParams: { price, minPurchase, maxPurchase, capUnits, payoutWallet }
    // IMPORTANTE: Preço aqui é tokens por ETH ou ETH por token?
    // Frontend diz "Price per token". Ex: 0.001 ETH por token.
    // Cálculo: (msg.value * 10^decimals) / priceWei = tokens
    
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

abstract contract Ownable {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor() { _owner = msg.sender; emit OwnershipTransferred(address(0), msg.sender); }
    function owner() public view returns (address) { return _owner; }
    modifier onlyOwner() { require(owner() == msg.sender, "Not owner"); _; }
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Zero address");
        _owner = newOwner;
    }
}

contract ${safeName} is Ownable {
    string public name = "${name}";
    string public symbol = "${symbol}";
    uint8 public decimals = ${safeDec};
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // Sale config
    bool public saleActive = true;
    uint256 public priceWei;       // Preco em Wei por 1 token inteiro
    uint256 public minPurchaseWei; // Compra minima em Wei
    uint256 public maxPurchaseWei; // Compra maxima em Wei
    uint256 public capPerWallet;   // 0 = sem limite
    address payable public payoutWallet;

    mapping(address => uint256) public purchasedAmount;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 cost);

    constructor(
        uint256 _priceWei,
        uint256 _minWei,
        uint256 _maxWei,
        uint256 _capUnits,
        address payable _payout
    ) {
        totalSupply = ${safeSupply} * 10**decimals;
        // Mint inicial vai para o contrato para ser vendido? Ou para o dono?
        // Modelo DirectSale: Tokens ficam no contrato para venda.
        // O dono recebe o que sobrar ou pode sacar.
        balanceOf[address(this)] = totalSupply; 
        emit Transfer(address(0), address(this), totalSupply);

        priceWei = _priceWei;
        minPurchaseWei = _minWei;
        maxPurchaseWei = _maxWei;
        capPerWallet = _capUnits * 10**decimals;
        payoutWallet = _payout;
    }

    function transfer(address to, uint256 value) public returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        allowance[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(balanceOf[from] >= value, "Insufficient balance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    // --- Sale Logic ---

    function buy() external payable {
        require(saleActive, "Sale inactive");
        require(msg.value >= minPurchaseWei, "Below min purchase");
        require(msg.value <= maxPurchaseWei, "Above max purchase");
        require(priceWei > 0, "Price not set");

        // Calculo: (BNB * 10^18) / PriceWei = Tokens (considerando 18 decimals)
        // Se token tem decimais variados:
        uint256 tokensToBuy = (msg.value * (10**decimals)) / priceWei;
        
        require(balanceOf[address(this)] >= tokensToBuy, "Sold out");

        if (capPerWallet > 0) {
            require(purchasedAmount[msg.sender] + tokensToBuy <= capPerWallet, "Wallet cap exceeded");
        }

        purchasedAmount[msg.sender] += tokensToBuy;
        _transfer(address(this), msg.sender, tokensToBuy);
        
        // Enviar BNB para payout
        (bool sent, ) = payoutWallet.call{value: msg.value}("");
        require(sent, "Failed to send BNB");
        
        emit TokensPurchased(msg.sender, tokensToBuy, msg.value);
    }

    // Owner controls
    function setSaleState(bool _active) external onlyOwner {
        saleActive = _active;
    }
    
    function withdrawTokens(uint256 amount) external onlyOwner {
        _transfer(address(this), msg.sender, amount);
    }
    
    function updatePrice(uint256 _newPrice) external onlyOwner {
        priceWei = _newPrice;
    }
    
    // Receive fallback
    receive() external payable {
        buy();
    }
}`;
}

// ==========================================
// 4. TokenSale Separado
// ==========================================
function getTokenSaleSeparado(saleParams) {
    const tokenAddress = saleParams.tokenAddress || "0x0000000000000000000000000000000000000000";
    // Recebemos strings decimais do frontend, mas o construtor espera Wei?
    // O frontend envia priceDec, minDec, maxDec.
    // Para simplificar, vamos passar os valores como strings e converter no construtor?
    // Nao, Solidity nao converte string float.
    // O frontend DEVE converter para Wei antes de chamar o deploy?
    // Ou o template injeta os valores ja convertidos?
    // O builder.js manda `sale` com valores decimais (priceDec, etc).
    // O `server.js` nao faz conversao.
    // Entao o template deve gerar codigo que aceita decimais? Nao, Solidity precisa de uint256 wei.
    
    // A melhor abordagem é converter aqui no template se possivel, ou gerar codigo que aceita wei no construtor
    // e o usuario fornece wei na hora do deploy (via inputs do builder.js).
    // Mas o builder.js diz "Valores em moeda nativa com decimais".
    // O deployer (builder.js -> deployContract) pega os args do form e converte?
    
    // Vamos olhar como o builder.js faz o deploy.
    // Ele usa `ethers.ContractFactory.deploy(...args)`.
    // Os argumentos sao extraidos de onde?
    
    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

contract TokenSale {
    address public owner;
    IERC20 public token;
    address payable public wallet;
    
    uint256 public priceWei;
    uint256 public minPurchaseWei;
    uint256 public maxPurchaseWei;
    
    bool public saleActive = true;
    
    event Purchased(address indexed buyer, uint256 amount, uint256 cost);
    
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }
    
    constructor(
        address _token,
        address payable _wallet,
        uint256 _priceWei,
        uint256 _minWei,
        uint256 _maxWei
    ) {
        // Se o tokenAddress for fixo no codigo:
        // token = IERC20(${tokenAddress});
        // Mas se for passado no deploy:
        owner = msg.sender;
        token = IERC20(_token);
        wallet = _wallet;
        priceWei = _priceWei;
        minPurchaseWei = _minWei;
        maxPurchaseWei = _maxWei;
    }
    
    function buy() external payable {
        require(saleActive, "Sale closed");
        require(msg.value >= minPurchaseWei, "Below min");
        require(msg.value <= maxPurchaseWei, "Above max");
        
        // Calcula quantidade
        uint256 decimals = token.decimals();
        uint256 amount = (msg.value * (10**decimals)) / priceWei;
        
        require(token.balanceOf(address(this)) >= amount, "Insufficient tokens in sale");
        
        token.transfer(msg.sender, amount);
        
        (bool s, ) = wallet.call{value: msg.value}("");
        require(s, "Transfer failed");
        
        emit Purchased(msg.sender, amount, msg.value);
    }
    
    function setSaleActive(bool _s) external onlyOwner {
        saleActive = _s;
    }
    
    function withdrawRemaining() external onlyOwner {
        token.transfer(owner, token.balanceOf(address(this)));
    }
    
    // Fallback para receber ETH/BNB
    receive() external payable {
        buy();
    }
}`;
}

// ==========================================
// Main Generator Function
// ==========================================
function getContractSource(type, data) {
    // data: { name, symbol, decimals, totalSupply, sale: { ... } }
    const { name, symbol, decimals, totalSupply, sale } = data;
    
    switch (type) {
        case "erc20-controls":
            return {
                source: getERC20Controls(name, symbol, decimals, totalSupply),
                contractName: sanitize(name)
            };
            
        case "erc20-directsale":
            return {
                source: getERC20DirectSale(name, symbol, decimals, totalSupply, sale),
                contractName: sanitize(name)
            };
            
        case "tokensale-separado":
            return {
                source: getTokenSaleSeparado(sale),
                contractName: "TokenSale"
            };

        case "erc20-minimal":
        default:
            return {
                source: getERC20Minimal(name, symbol, decimals, totalSupply),
                contractName: sanitize(name)
            };
    }
}

module.exports = { getContractSource };
