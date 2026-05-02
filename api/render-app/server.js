import express from "express";
import cors from "cors";
import morgan from "morgan";
import solc from "solc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAddress } from "ethers";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept", "Authorization"],
    optionsSuccessStatus: 204,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

// Helper: sanitize contract name
const SOLIDITY_RESERVED_IDENTIFIERS = new Set([
  "abstract","after","alias","apply","auto","case","catch","copyof","default","define","final",
  "immutable","implements","in","inline","let","macro","match","mutable","null","of","override",
  "partial","promise","reference","relocatable","sealed","sizeof","static","supports","switch","try",
  "typedef","typeof","unchecked","contract","interface","library","function","address","uint","int",
  "bool","string","byte","bytes","mapping","struct","enum","event","modifier","constructor","fallback",
  "receive","public","external","internal","private","view","pure","payable","storage","memory",
  "calldata","virtual","break","continue","do","else","for","if","return","while","revert","assert",
  "require","throw","new","delete","this","super","emit","using","import","from","as","is","var",
  "const","class","extends","debugger","export","void","yield","true","false","instanceof","await","async"
]);

function sanitizeContractName(rawName) {
  try {
    const base = String(rawName || "").trim();
    const noMarks = base.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    let cleaned = noMarks.replace(/[^A-Za-z0-9_]/g, "");
    if (!cleaned) cleaned = "Token";
    if (!/^[A-Za-z_]/.test(cleaned)) cleaned = `_${cleaned}`;
    if (SOLIDITY_RESERVED_IDENTIFIERS.has(cleaned.toLowerCase())) cleaned = `Token_${cleaned}`;
    if (cleaned.length > 64) cleaned = cleaned.slice(0, 64);
    return cleaned;
  } catch {
    return "Token";
  }
}

// Helper: compile solidity using standard JSON
function compileSolidity(sourceCode, contractName) {
  const input = {
    language: "Solidity",
    sources: { [`${contractName}.sol`]: { content: sourceCode } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
        },
      },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contractOut = output?.contracts?.[`${contractName}.sol`]?.[contractName];
  if (!contractOut) {
    const err = output?.errors?.map((e) => e.formattedMessage).join("\n") || "Unknown compile error";
    throw new Error(err);
  }
  const abi = contractOut.abi || [];
  const bytecode = contractOut.evm?.bytecode?.object || "";
  const deployedBytecode = contractOut.evm?.deployedBytecode?.object || "";
  const metadata = contractOut.metadata ? JSON.parse(contractOut.metadata) : null;
  return { abi, bytecode, deployedBytecode, metadata };
}

// Health
app.get("/health", (req, res) => {
  res.type("text/plain").send("ok");
});
app.options("/health", (req, res) => res.sendStatus(204));

// OPTIONS preflight for main endpoints
app.options("/api/generate-token", (req, res) => res.sendStatus(204));
app.options("/api/compile-only", (req, res) => res.sendStatus(204));
app.options("/api/verify-bscscan", (req, res) => res.sendStatus(204));
app.options("/api/verify-sourcify", (req, res) => res.sendStatus(204));
app.options("/api/verify-private", (req, res) => res.sendStatus(204));
app.options("/api/verify-auto", (req, res) => res.sendStatus(204));
app.options("/api/log-recipe", (req, res) => res.sendStatus(204));

// Generate-token: builds ERC-20 minimal source and compiles
app.post("/api/generate-token", (req, res) => {
  try {
    const body = req.body || {};
    const type = String(body.type || "erc20-minimal");
    const sale = body.sale || {};
    const advanced = body.advanced || body.advancedParams || null;

    const isTokenSaleSeparado = type === "tokensale-separado";
    const name = isTokenSaleSeparado ? "TokenSale" : body.name;
    const symbol = isTokenSaleSeparado ? "SALE" : body.symbol;

    if (!isTokenSaleSeparado && (!name || !symbol)) {
      return res.status(400).json({ success: false, error: "Missing name or symbol" });
    }

    const d = Number.isFinite(body.decimals) ? parseInt(body.decimals, 10) : 18;
    if (!Number.isFinite(d) || d < 0 || d > 77) {
      return res.status(400).json({ success: false, error: "Invalid decimals" });
    }

    const tsStr = String(body.totalSupply ?? "0");
    const tsSan = tsStr.replace(/[^0-9]/g, "");
    const ts = tsSan || "0";
    if (!isTokenSaleSeparado && (!/^\d+$/.test(ts) || BigInt(ts) <= 0n)) {
      return res.status(400).json({ success: false, error: "Invalid totalSupply" });
    }
    if (!isTokenSaleSeparado) {
      try {
        const MAX_UINT256 = (1n << 256n) - 1n;
        const scaled = BigInt(ts) * (10n ** BigInt(d));
        if (scaled > MAX_UINT256) return res.status(400).json({ success: false, error: "totalSupply too large for uint256 after scaling by 10^decimals" });
      } catch {
        return res.status(400).json({ success: false, error: "Invalid totalSupply" });
      }
    }

    const addrOrZero = (a) => {
      try {
        return getAddress(String(a || ""));
      } catch {
        return "0x0000000000000000000000000000000000000000";
      }
    };

    const contractId = sanitizeContractName(name);

    const escapeSolidityString = (str) => {
      const s = String(str ?? "");
      return s
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\r/g, "\\r")
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
    };

    const solidityStringLiteral = (str) => {
      const raw = String(str ?? "");
      const escaped = escapeSolidityString(raw);
      const needsUnicode = /[^\x00-\x7F]/.test(raw);
      return `${needsUnicode ? "unicode" : ""}"${escaped}"`;
    };

    const nameLit = solidityStringLiteral(name);
    const symbolLit = solidityStringLiteral(symbol);

    const getERC20Minimal = () => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract ${contractId} {
    string public name = ${nameLit};
    string public symbol = ${symbolLit};
    uint8 public decimals = ${d};
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        totalSupply = ${ts} * 10**decimals;
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

    const getERC20Controls = () => `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

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

    function pause() public onlyOwner {
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() public onlyOwner {
        _paused = false;
        emit Unpaused(msg.sender);
    }
}

contract ${contractId} is Ownable, Pausable {
    string public name = ${nameLit};
    string public symbol = ${symbolLit};
    uint8 public decimals = ${d};
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        totalSupply = ${ts} * 10**decimals;
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

    function burn(uint256 value) public onlyOwner {
        require(balanceOf[msg.sender] >= value, "Saldo insuficiente para queimar");
        balanceOf[msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(msg.sender, address(0), value);
    }

    function mint(address to, uint256 value) public onlyOwner {
        require(to != address(0), "Endereco zero");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
}`;

    const getERC20DirectSale = () => `// SPDX-License-Identifier: MIT
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

abstract contract Pausable is Ownable {
    bool private _paused;
    event Paused(address account);
    event Unpaused(address account);
    constructor() { _paused = false; }
    function paused() public view returns (bool) { return _paused; }
    modifier whenNotPaused() { require(!_paused, "Pausable: paused"); _; }
    function pause() public onlyOwner { _paused = true; emit Paused(msg.sender); }
    function unpause() public onlyOwner { _paused = false; emit Unpaused(msg.sender); }
}

contract ${contractId} is Ownable, Pausable {
    string public name = ${nameLit};
    string public symbol = ${symbolLit};
    uint8 public decimals = ${d};
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    bool public saleActive = true;
    uint256 public priceWei;
    uint256 public minPurchaseWei;
    uint256 public maxPurchaseWei;
    uint256 public capPerWallet;
    address payable public payoutWallet;

    mapping(address => uint256) public purchasedAmount;

    // Advanced (taxes) - herdado do modelo Avançado quando configurado
    uint256 public liquidityTax = ${Number(advanced?.taxes?.liquidity?.enabled ? advanced?.taxes?.liquidity?.buy || 0 : 0) || 0};
    uint256 public marketingTax = ${Number(advanced?.taxes?.wallet?.enabled ? advanced?.taxes?.wallet?.buy || 0 : 0) || 0};
    address public marketingWallet = ${addrOrZero(advanced?.taxes?.wallet?.address)};

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
        totalSupply = ${ts} * 10**decimals;
        balanceOf[address(this)] = totalSupply;
        emit Transfer(address(0), address(this), totalSupply);

        priceWei = _priceWei;
        minPurchaseWei = _minWei;
        maxPurchaseWei = _maxWei;
        capPerWallet = _capUnits * 10**decimals;
        payoutWallet = _payout;
    }

    function transfer(address to, uint256 value) public whenNotPaused returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public whenNotPaused returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public whenNotPaused returns (bool) {
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        allowance[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(balanceOf[from] >= value, "Insufficient balance");
        uint256 sendAmount = value;

        uint256 totalTax = liquidityTax + marketingTax;
        if (
            totalTax > 0 &&
            from != address(this) &&
            to != address(this) &&
            from != owner() &&
            to != owner()
        ) {
            uint256 fee = (value * totalTax) / 100;
            if (fee > 0) {
                uint256 mFee = marketingTax > 0 ? (value * marketingTax) / 100 : 0;
                uint256 lFee = fee - mFee;

                if (mFee > 0) {
                    address mTo = marketingWallet != address(0) ? marketingWallet : address(this);
                    balanceOf[mTo] += mFee;
                    emit Transfer(from, mTo, mFee);
                }

                if (lFee > 0) {
                    balanceOf[address(this)] += lFee;
                    emit Transfer(from, address(this), lFee);
                }

                sendAmount = value - fee;
            }
        }

        balanceOf[from] -= value;
        balanceOf[to] += sendAmount;
        emit Transfer(from, to, sendAmount);
    }

    function buy() external payable {
        require(!paused(), "Sale paused");
        require(saleActive, "Sale inactive");
        require(msg.value >= minPurchaseWei, "Below min purchase");
        require(msg.value <= maxPurchaseWei, "Above max purchase");
        require(priceWei > 0, "Price not set");

        uint256 tokensToBuy = (msg.value * (10**decimals)) / priceWei;
        require(balanceOf[address(this)] >= tokensToBuy, "Sold out");

        if (capPerWallet > 0) {
            require(purchasedAmount[msg.sender] + tokensToBuy <= capPerWallet, "Wallet cap exceeded");
        }

        purchasedAmount[msg.sender] += tokensToBuy;
        _transfer(address(this), msg.sender, tokensToBuy);

        (bool sent, ) = payoutWallet.call{value: msg.value}("");
        require(sent, "Failed to send BNB");

        emit TokensPurchased(msg.sender, tokensToBuy, msg.value);
    }

    function setSaleState(bool _active) external onlyOwner {
        saleActive = _active;
    }

    function withdrawTokens(uint256 amount) external onlyOwner {
        _transfer(address(this), msg.sender, amount);
    }

    function updatePrice(uint256 _newPrice) external onlyOwner {
        priceWei = _newPrice;
    }

    function burn(uint256 value) public onlyOwner {
        require(balanceOf[msg.sender] >= value, "Saldo insuficiente para queimar");
        balanceOf[msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(msg.sender, address(0), value);
    }

    function mint(address to, uint256 value) public onlyOwner {
        require(to != address(0), "Endereco zero");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    receive() external payable {
        buy();
    }
}`;

    const getTokenSaleSeparado = () => `// SPDX-License-Identifier: MIT
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
    uint256 public capPerWallet;

    bool public saleActive = true;
    mapping(address => uint256) public purchasedAmount;

    event Purchased(address indexed buyer, uint256 amount, uint256 cost);

    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }

    constructor(
        address _token,
        address payable _wallet,
        uint256 _priceWei,
        uint256 _minWei,
        uint256 _maxWei,
        uint256 _capUnits
    ) {
        owner = msg.sender;
        token = IERC20(_token);
        wallet = _wallet;
        priceWei = _priceWei;
        minPurchaseWei = _minWei;
        maxPurchaseWei = _maxWei;
        capPerWallet = _capUnits * (10 ** token.decimals());
    }

    function buy() public payable {
        require(saleActive, "Sale closed");
        require(msg.value >= minPurchaseWei, "Below min");
        require(msg.value <= maxPurchaseWei, "Above max");

        uint256 dec = token.decimals();
        uint256 amount = (msg.value * (10**dec)) / priceWei;

        require(token.balanceOf(address(this)) >= amount, "Insufficient tokens in sale");

        if (capPerWallet > 0) {
            require(purchasedAmount[msg.sender] + amount <= capPerWallet, "Wallet cap exceeded");
        }
        purchasedAmount[msg.sender] += amount;

        token.transfer(msg.sender, amount);

        (bool s, ) = wallet.call{value: msg.value}("");
        require(s, "Transfer failed");

        emit Purchased(msg.sender, amount, msg.value);
    }

    function setSaleActive(bool _s) external onlyOwner {
        saleActive = _s;
    }

    function deposit(uint256 amount) external onlyOwner {
        require(token.transferFrom(msg.sender, address(this), amount), "Deposit failed");
    }

    function withdrawRemaining() external onlyOwner {
        token.transfer(owner, token.balanceOf(address(this)));
    }

    receive() external payable {
        buy();
    }
}`;

    const getERC20AdvancedFallback = () => {
      const liquidityTax = Number(advanced?.taxes?.liquidity?.enabled ? advanced?.taxes?.liquidity?.buy || 0 : 0) || 0;
      const marketingTax = Number(advanced?.taxes?.wallet?.enabled ? advanced?.taxes?.wallet?.buy || 0 : 0) || 0;
      const marketingWallet = addrOrZero(advanced?.taxes?.wallet?.address);
      return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

contract ${contractId} is Context, IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    address public owner;
    bool public paused;

    modifier onlyOwner() {
        require(_msgSender() == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    uint256 public liquidityTax = ${liquidityTax};
    uint256 public marketingTax = ${marketingTax};
    address public marketingWallet = ${marketingWallet === "0x0000000000000000000000000000000000000000" ? "address(0)" : marketingWallet};

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _name = ${nameLit};
        _symbol = ${symbolLit};
        _decimals = ${d};
        _totalSupply = ${ts} * 10**_decimals;
        owner = _msgSender();

        _balances[_msgSender()] = _totalSupply;
        emit Transfer(address(0), _msgSender(), _totalSupply);
        emit OwnershipTransferred(address(0), _msgSender());
    }

    function pause() external onlyOwner { paused = true; }
    function unpause() external onlyOwner { paused = false; }

    function burn(uint256 amount) external onlyOwner {
        uint256 bal = _balances[_msgSender()];
        require(bal >= amount, "Insufficient balance");
        unchecked { _balances[_msgSender()] = bal - amount; }
        _totalSupply -= amount;
        emit Transfer(_msgSender(), address(0), amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        _totalSupply += amount;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function name() public view returns (string memory) { return _name; }
    function symbol() public view returns (string memory) { return _symbol; }
    function decimals() public view returns (uint8) { return _decimals; }
    function totalSupply() public view override returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view override returns (uint256) { return _balances[account]; }

    function transfer(address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address ow, address spender) public view override returns (uint256) {
        return _allowances[ow][spender];
    }

    function approve(address spender, uint256 amount) public override whenNotPaused returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override whenNotPaused returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked { _approve(sender, _msgSender(), currentAllowance - amount); }
        return true;
    }

    function _approve(address ow, address spender, uint256 amount) internal virtual {
        require(ow != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[ow][spender] = amount;
        emit Approval(ow, spender, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");

        uint256 taxAmount = 0;
        if (sender != owner && recipient != owner) {
            uint256 totalTax = liquidityTax + marketingTax;
            if (totalTax > 0) {
                taxAmount = (amount * totalTax) / 100;
                if (taxAmount > 0) {
                    _balances[address(this)] += taxAmount;
                    emit Transfer(sender, address(this), taxAmount);
                }
            }
        }

        uint256 receiveAmount = amount - taxAmount;
        unchecked { _balances[sender] = senderBalance - amount; }
        _balances[recipient] += receiveAmount;
        emit Transfer(sender, recipient, receiveAmount);
    }
}`;
    };

    const getContractSource = () => {
      if (type === "erc20-controls") return { source: getERC20Controls(), contractName: contractId };
      if (type === "erc20-directsale") return { source: getERC20DirectSale(), contractName: contractId };
      if (type === "tokensale-separado") return { source: getTokenSaleSeparado(), contractName: "TokenSale" };
      if (type === "erc20-advanced") return { source: getERC20AdvancedFallback(), contractName: contractId };
      return { source: getERC20Minimal(), contractName: contractId };
    };

    const { source, contractName } = getContractSource();

    const { abi, bytecode, deployedBytecode, metadata } = compileSolidity(source, contractName);
    return res.json({
      success: true,
      token: { name, symbol, decimals: d, totalSupply: ts, contractName, type },
      sourceCode: source,
      compilation: { abi, bytecode, deployedBytecode, metadata },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Compile-only: compiles provided source
app.post("/api/compile-only", (req, res) => {
  try {
    const { sourceCode, contractName } = req.body || {};
    if (!sourceCode || !contractName) return res.status(400).json({ error: "Missing sourceCode or contractName" });
    const name = sanitizeContractName(contractName);
    const { abi, bytecode, deployedBytecode, metadata } = compileSolidity(String(sourceCode), name);
    return res.json({
      success: true,
      contractName: name,
      compilation: { abi, bytecode, deployedBytecode, metadata },
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

function getExplorerVerificationUrl(chainId, address) {
  const addr = address || "";
  const map = {
    1: `https://etherscan.io/address/${addr}#code`,
    56: `https://bscscan.com/address/${addr}#code`,
    97: `https://testnet.bscscan.com/address/${addr}#code`,
    137: `https://polygonscan.com/address/${addr}#code`,
    8453: `https://basescan.org/address/${addr}#code`,
    11155111: `https://sepolia.etherscan.io/address/${addr}#code`,
  };
  return map[Number(chainId)] || `https://etherscan.io/address/${addr}#code`;
}

function getExplorerApiKeyFromEnv() {
  try {
    const b64 = process.env.EXPLORER_API_KEY_B64 || "";
    if (b64) {
      try {
        return Buffer.from(String(b64), "base64").toString("utf8");
      } catch (_) {}
    }
    const direct = process.env.EXPLORER_API_KEY || process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "";
    return String(direct || "");
  } catch (_) {
    return "";
  }
}

function getExplorerApiBase(chainId) {
  const cid = Number(chainId);
  // IMPORTANTE:
  // Para BSC (56/97), o V1 do BscScan retorna aviso de endpoint depreciado.
  // A forma compatível é usar o Etherscan API V2 (unified) com o parâmetro chainid.
  // Ex.: https://api.etherscan.io/v2/api?chainid=97&module=contract&action=getsourcecode&address=0x...&apikey=...
  if (cid === 56 || cid === 97) return "https://api.etherscan.io/v2/api";

  // Ethereum (Etherscan) - V2 unificado
  if (cid === 1) return "https://api.etherscan.io/v2/api";
  if (cid === 11155111) return "https://api.etherscan.io/v2/api";

  // Polygon
  if (cid === 137) return "https://api.polygonscan.com/api";
  if (cid === 80001) return "https://api-testnet.polygonscan.com/api";

  // Base
  if (cid === 8453) return "https://api.basescan.org/api";
  if (cid === 84532) return "https://api-sepolia.basescan.org/api";

  // Fallback para Etherscan V2 (melhor cobertura multi-chain)
  return "https://api.etherscan.io/v2/api";
}

function normalizeCompilerVersion(ver) {
  const s = String(ver || "").trim();
  if (!s) return "";
  return s.startsWith("v") ? s : `v${s}`;
}

async function pollExplorerVerification(apiBase, guid, apiKey) {
  for (let i = 0; i < 5; i++) {
    const params = new URLSearchParams();
    params.append("module", "contract");
    params.append("action", "checkverifystatus");
    params.append("guid", String(guid));
    if (apiKey) params.append("apikey", String(apiKey));
    const resp = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = await resp.json().catch(() => null);
    if (json && String(json.status) === "1") return { ok: true, result: json.result };
    await new Promise((r) => setTimeout(r, 3000));
  }
  return { ok: false };
}

app.post("/api/verify-bscscan-status", async (req, res) => {
  try {
    const { chainId, guid, apiKey } = req.body || {};
    if (!guid || typeof chainId === "undefined") {
      return res.status(400).json({ success: false, error: "Missing chainId or guid" });
    }
    const apiBase = getExplorerApiBase(chainId);
    let fetchUrl = apiBase;
    if (apiBase.includes("/v2/api")) fetchUrl += `?chainid=${chainId}`;

    const params = new URLSearchParams();
    params.append("module", "contract");
    params.append("action", "checkverifystatus");
    params.append("guid", String(guid));
    const finalKey = apiKey || getExplorerApiKeyFromEnv() || "I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5";
    if (finalKey) params.append("apikey", String(finalKey));
    const resp = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = await resp.json().catch(() => null);
    const status = String(json?.status || "0");
    const result = String(json?.result || "");
    if (status === "1") return res.json({ success: true, result });
    return res.json({ success: false, status, result });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.get("/api/explorer-getsourcecode", async (req, res) => {
  try {
    const chainId = Number(req.query?.chainId || 0);
    const address = String(req.query?.address || "").trim();
    if (!chainId || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ success: false, error: "Dados inválidos" });
    }

    const apiBase = getExplorerApiBase(chainId);
    const base = apiBase.includes("/v2/api") ? `${apiBase}?chainid=${chainId}` : apiBase;

    const qs = new URLSearchParams();
    qs.append("module", "contract");
    qs.append("action", "getsourcecode");
    qs.append("address", address);
    const finalKey = String(req.query?.apiKey || getExplorerApiKeyFromEnv() || "");
    if (finalKey) qs.append("apikey", finalKey);

    const url = `${base}${base.includes("?") ? "&" : "?"}${qs.toString()}`;
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        // Alguns explorers retornam HTML/erro quando o request parece "bot".
        // Um User-Agent explícito aumenta a chance de resposta JSON.
        "User-Agent": "TokenCafe/1.0 (+https://tokencafe.onrender.com)",
        "Accept": "application/json,text/plain,*/*",
      },
    });

    // Se não vier JSON, devolver erro claro (não tratar como "não verificado").
    const ct = String(resp.headers?.get?.("content-type") || "");
    const rawText = await resp.text().catch(() => "");
    const json = (() => {
      try {
        return rawText ? JSON.parse(rawText) : null;
      } catch {
        return null;
      }
    })();
    if (!json) {
      return res.status(502).json({
        success: false,
        error: "Explorer não retornou JSON válido para getsourcecode.",
        status: resp.status,
        contentType: ct,
        sample: rawText ? rawText.slice(0, 220) : "",
        url: url.replace(/apikey=[^&]*/i, "apikey=HIDDEN"),
      });
    }
    const status = String(json?.status || "0");
    const arr = Array.isArray(json?.result) ? json.result : [];
    const first = arr[0] || {};
    const src = String(first?.SourceCode || "");
    const verified = !!src && src.length > 0;

    return res.json({
      success: true,
      verified,
      contractName: first?.ContractName || "",
      sourceCode: src || "",
      abi: first?.ABI || "",
      compilerVersion: first?.CompilerVersion || "",
      explorer: {
        optimizationUsed: first?.OptimizationUsed,
        runs: first?.Runs,
        compilerVersion: first?.CompilerVersion,
        licenseType: first?.LicenseType,
        evmVersion: first?.EVMVersion,
        proxy: first?.Proxy,
      },
      raw: status === "1" ? undefined : json,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.post("/api/verify-bscscan", async (req, res) => {
  try {
    const { chainId, contractAddress, contractName, contractNameFQN, sourceCode, compilerVersion, optimizationUsed, runs, codeformat, constructorArguments, apiKey, metadata } = req.body || {};
    if (!contractAddress || typeof chainId === "undefined") {
      return res.status(400).json({ success: false, error: "Missing chainId or contractAddress" });
    }
    const explorerUrl = getExplorerVerificationUrl(chainId, String(contractAddress));
    const apiBase = getExplorerApiBase(chainId);
    let fetchUrl = apiBase;
    if (apiBase.includes("/v2/api")) fetchUrl += `?chainid=${chainId}`;

    const finalKey = apiKey || getExplorerApiKeyFromEnv() || "I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5";
    if (!finalKey) {
      return res.status(400).json({ success: false, error: "Missing apiKey for explorer", explorerUrl });
    }
    if (!sourceCode || !contractName || !compilerVersion) {
      return res.status(400).json({ success: false, error: "Missing sourceCode or contractName or compilerVersion", explorerUrl });
    }
    let evmVersion = "";
    try {
      const metaObj = typeof metadata === "string" ? JSON.parse(metadata) : metadata;
      evmVersion = metaObj?.settings?.evmVersion || "";
    } catch {}
    const params = new URLSearchParams();
    params.append("module", "contract");
    params.append("action", "verifysourcecode");
    params.append("apikey", String(finalKey));
    params.append("contractaddress", String(contractAddress));
    params.append("sourceCode", String(sourceCode));
    params.append("codeformat", String(codeformat || "solidity-single-file"));
    params.append("contractname", String(contractNameFQN || contractName));
    params.append("compilerversion", normalizeCompilerVersion(compilerVersion));
    params.append("optimizationUsed", String(optimizationUsed === true || optimizationUsed === 1 || String(optimizationUsed) === "1" ? 1 : 0));
    params.append("runs", String(Number(runs || 200)));
    if (evmVersion) params.append("evmVersion", String(evmVersion));
    if (constructorArguments) params.append("constructorArguments", String(constructorArguments).replace(/^0x/, ""));
    params.append("licenseType", "3");

    const submit = await fetch(fetchUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json = await submit.json().catch(() => null);
    const status = String(json?.status || "0");
    const message = String(json?.message || "");
    const result = String(json?.result || "");
    if (status === "1" && result) {
      const polled = await pollExplorerVerification(fetchUrl, result, finalKey);
      if (polled.ok) return res.json({ success: true, explorerUrl });
      return res.json({ success: false, message: "pending", guid: result, explorerUrl });
    }
    const alreadyVerified =
      (status === "0") &&
      (
        result.toLowerCase().includes("already verified") ||
        result.toLowerCase().includes("alreadyverified") ||
        message.toLowerCase().includes("already verified") ||
        message.toLowerCase().includes("alreadyverified")
      );
    if (alreadyVerified) {
      return res.json({ success: true, explorerUrl });
    }
    if (status === "0" && result.toLowerCase().includes("unable to locate contractcode")) {
      return res.json({
        success: false,
        message: "pending",
        reason: "indexing",
        retryAfter: 15,
        explorerUrl,
      });
    }
    return res.status(400).json({
      success: false,
      error: result || message || "Explorer verification failed",
      explorerUrl,
      raw: json,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

// Verify-auto: tenta verificação automática (Sourcify) e retorna link; caso não disponível, retorna link do explorer

function getRpcUrl(chainId) {
  const cid = Number(chainId);
  const map = {
    1: "https://eth.llamarpc.com",
    56: "https://bsc-dataseed1.binance.org/",
    97: "https://data-seed-prebsc-1-s1.binance.org:8545/",
    137: "https://polygon.llamarpc.com",
    8453: "https://mainnet.base.org",
    11155111: "https://rpc.sepolia.org",
  };
  return map[cid] || null;
}

async function fetchOnChainCode(rpcUrl, address) {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "eth_getCode",
    params: [String(address), "latest"],
  };
  const resp = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`RPC ${resp.status}`);
  const json = await resp.json();
  const code = json?.result || "0x";
  return String(code || "0x");
}

app.post("/api/verify-private", async (req, res) => {
  try {
    const { chainId, contractAddress, deployedBytecode: compiledDeployedBytecode, sourceCode, contractName, rpcUrl } = req.body || {};
    if (!contractAddress || typeof chainId === "undefined") {
      return res.status(400).json({ success: false, error: "Missing chainId or contractAddress" });
    }
    const url = rpcUrl || getRpcUrl(chainId);
    if (!url)
      return res.status(400).json({
        success: false,
        error: "RPC URL unavailable for this chainId",
      });

    let expected = String(compiledDeployedBytecode || "").trim();
    if (!expected && sourceCode && contractName) {
      const nameSan = sanitizeContractName(contractName);
      const { deployedBytecode } = compileSolidity(String(sourceCode), nameSan);
      expected = String(deployedBytecode || "").trim();
    }
    if (!expected)
      return res.status(400).json({
        success: false,
        error: "Missing deployedBytecode or sourceCode+contractName",
      });

    const onChain = await fetchOnChainCode(url, contractAddress);
    const a = (onChain || "").replace(/^0x/, "").toLowerCase();
    const b = (expected || "").replace(/^0x/, "").toLowerCase();
    const match = !!a && !!b && a === b;
    return res.json({
      success: match,
      match,
      onChainLen: a.length,
      compiledLen: b.length,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

function ensureRecipeLogHeader(mdPath) {
  try {
    const exists = fs.existsSync(mdPath);
    if (!exists) return;
    const content = fs.readFileSync(mdPath, "utf8");
    if (!/##\s*Histórico de Receitas/i.test(content)) {
      const append = `\n\n## Histórico de Receitas\n\n`;
      fs.appendFileSync(mdPath, append);
    }
  } catch {}
}

function formatRecipeLog(action, recipe) {
  const ts = new Date().toISOString();
  const name = String(recipe?.compilation?.contractName || recipe?.token?.name || "").replace(/\s+/g, "") || "MyToken";
  const chainId = recipe?.network?.chainId ?? null;
  const addr = recipe?.deployment?.address || null;
  const tx = recipe?.deployment?.tx || null;
  const group = recipe?.group || null;
  const dec = recipe?.token?.decimals ?? null;
  const supply = recipe?.token?.initialSupply ?? null;
  const bb = String(recipe?.compilation?.deployedBytecode || "").length;
  const line = `- ${ts} | ${action} | ${name} | chainId=${chainId} | addr=${addr || "-"} | tx=${tx || "-"} | group=${group || "-"} | dec=${dec} | supply=${supply} | deployedBytecodeLen=${bb}`;
  return `${line}\n`;
}

app.post("/api/log-recipe", async (req, res) => {
  try {
    const { action, recipe } = req.body || {};
    if (!action || !recipe) return res.status(400).json({ success: false, error: "Missing action or recipe" });
    const mdPath = path.resolve(__dirname, "../../docs/PLANO-EXECUCAO.md");
    ensureRecipeLogHeader(mdPath);
    const entry = formatRecipeLog(String(action), recipe);
    fs.appendFileSync(mdPath, entry);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TokenCafe Render API rodando na porta ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});
