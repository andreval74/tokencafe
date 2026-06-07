// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * OmniToken V1 (PAI)
 * - ERC20 upgradeable básico
 * - Flags de segurança (pause, terminate, lock upgrades)
 * - UUPS para manter o mesmo endereço via proxy
 */
contract OmniToken is ERC20Upgradeable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable {
    uint8 private _decimals;
    string public logoURI;
    bool public terminated;
    bool public lockedForUpdate;

    event Paused(address indexed account);
    event Unpaused(address indexed account);
    event Terminated(address indexed account);
    event SettingsUpdated(string logoURI);

    function initialize(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        address owner_,
        string memory logoURI_
    ) public initializer {
        __ERC20_init(name_, symbol_);
        __Ownable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _decimals = decimals_;
        logoURI = logoURI_;
        terminated = false;
        lockedForUpdate = false;

        _transferOwnership(owner_);
        uint256 supplyUnits = initialSupply_ * (10 ** uint256(decimals_));
        _mint(owner_, supplyUnits);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function pause() external onlyOwner {
        _pause();
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        _unpause();
        emit Unpaused(msg.sender);
    }

    function terminate() external onlyOwner {
        terminated = true;
        emit Terminated(msg.sender);
    }

    modifier whenActive() {
        require(!terminated, "Contract terminated");
        _;
    }

    function setLogoURI(string memory newLogoURI) external onlyOwner whenActive {
        logoURI = newLogoURI;
        emit SettingsUpdated(newLogoURI);
    }

    function lockForUpdate() external onlyOwner {
        lockedForUpdate = true;
    }

    function version() external pure virtual returns (uint256) {
        return 1;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {
        require(!lockedForUpdate, "Updates are locked");
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }

    receive() external payable {}
}

