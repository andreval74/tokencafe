// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TokenCafeERC20
 * @notice Token ERC-20 gerado pelo TokenCafeFactory.
 *         Inclui mint, burn e pause opcionais configurados no deploy.
 */
contract TokenCafeERC20 {

    // ── Metadata ──────────────────────────────────────────────────────────────
    string  private _name;
    string  private _symbol;
    uint8   private _decimals;

    // ── Feature flags ─────────────────────────────────────────────────────────
    bool public mintable;
    bool public burnable;
    bool public pausable;

    // ── Ownership (two-step) ──────────────────────────────────────────────────
    address private _owner;
    address private _pendingOwner;

    // ── Pause state ───────────────────────────────────────────────────────────
    bool private _paused;

    // ── ERC-20 state ──────────────────────────────────────────────────────────
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // ── Events ────────────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event OwnershipTransferStarted(address indexed previousOwner, address indexed newOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address account);
    event Unpaused(address account);

    // ── Modifiers ─────────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == _owner, "TCE20: not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!_paused, "TCE20: paused");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(
        string memory name_,
        string memory symbol_,
        uint8         decimals_,
        uint256       initialSupply,
        address       initialOwner,
        bool          mintable_,
        bool          burnable_,
        bool          pausable_
    ) {
        require(initialOwner != address(0), "TCE20: zero owner");
        require(bytes(name_).length   > 0,  "TCE20: empty name");
        require(bytes(symbol_).length > 0,  "TCE20: empty symbol");
        require(decimals_ <= 18,             "TCE20: decimals > 18");

        _name     = name_;
        _symbol   = symbol_;
        _decimals = decimals_;
        mintable  = mintable_;
        burnable  = burnable_;
        pausable  = pausable_;
        _owner    = initialOwner;

        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply * 10 ** uint256(decimals_));
        }
    }

    // ── ERC-20 view ───────────────────────────────────────────────────────────
    function name()        public view returns (string memory) { return _name; }
    function symbol()      public view returns (string memory) { return _symbol; }
    function decimals()    public view returns (uint8)         { return _decimals; }
    function totalSupply() public view returns (uint256)       { return _totalSupply; }

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function allowance(address owner_, address spender) public view returns (uint256) {
        return _allowances[owner_][spender];
    }

    // ── ERC-20 mutative ───────────────────────────────────────────────────────
    function transfer(address to, uint256 amount) public whenNotPaused returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public whenNotPaused returns (bool) {
        uint256 allowed = _allowances[from][msg.sender];
        require(allowed >= amount, "TCE20: insufficient allowance");
        unchecked { _allowances[from][msg.sender] = allowed - amount; }
        _transfer(from, to, amount);
        return true;
    }

    // ── Extensions ────────────────────────────────────────────────────────────
    function mint(address to, uint256 amount) external onlyOwner {
        require(mintable, "TCE20: minting disabled");
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        require(burnable, "TCE20: burning disabled");
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        require(burnable, "TCE20: burning disabled");
        uint256 allowed = _allowances[account][msg.sender];
        require(allowed >= amount, "TCE20: insufficient allowance");
        unchecked { _allowances[account][msg.sender] = allowed - amount; }
        _burn(account, amount);
    }

    function pause() external onlyOwner {
        require(pausable, "TCE20: pause disabled");
        require(!_paused, "TCE20: already paused");
        _paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        require(pausable, "TCE20: pause disabled");
        require(_paused, "TCE20: not paused");
        _paused = false;
        emit Unpaused(msg.sender);
    }

    function paused() public view returns (bool) { return _paused; }

    // ── Ownership (two-step) ──────────────────────────────────────────────────
    function owner() public view returns (address) { return _owner; }

    function pendingOwner() public view returns (address) { return _pendingOwner; }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "TCE20: zero address");
        _pendingOwner = newOwner;
        emit OwnershipTransferStarted(_owner, newOwner);
    }

    function acceptOwnership() external {
        require(msg.sender == _pendingOwner, "TCE20: not pending owner");
        emit OwnershipTransferred(_owner, _pendingOwner);
        _owner        = _pendingOwner;
        _pendingOwner = address(0);
    }

    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner        = address(0);
        _pendingOwner = address(0);
    }

    // ── Internal ──────────────────────────────────────────────────────────────
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "TCE20: transfer from zero");
        require(to   != address(0), "TCE20: transfer to zero");
        require(_balances[from] >= amount, "TCE20: insufficient balance");
        unchecked { _balances[from] -= amount; }
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "TCE20: mint to zero");
        _totalSupply    += amount;
        _balances[to]   += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        require(_balances[from] >= amount, "TCE20: burn exceeds balance");
        unchecked { _balances[from] -= amount; }
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}
