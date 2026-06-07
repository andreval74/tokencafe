// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * CafeDeployer
 * - Deployer minimalista com CREATE2 para endereços personalizados (prefixo/sufixo)
 * - Permite calcular e implantar bytecode com salt
 * - Suporta envio de valor para construtores payable
 */
contract CafeDeployer {
    event Deployed(address addr, bytes32 salt);

    function deploy(bytes32 salt, bytes memory bytecode) external returns (address addr) {
        require(bytecode.length != 0, "Empty bytecode");
        assembly {
            addr := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(addr) { revert(0, 0) }
        }
        emit Deployed(addr, salt);
    }

    function deployWithValue(bytes32 salt, bytes memory bytecode) external payable returns (address addr) {
        require(bytecode.length != 0, "Empty bytecode");
        assembly {
            addr := create2(callvalue(), add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(addr) { revert(0, 0) }
        }
        emit Deployed(addr, salt);
    }

    function computeAddress(bytes32 salt, bytes32 initCodeHash) external view returns (address) {
        return address(uint160(uint(keccak256(abi.encodePacked(bytes1(0xff), address(this), salt, initCodeHash)))));
    }

    function getInitCodeHash(bytes memory bytecode) external pure returns (bytes32) {
        return keccak256(bytecode);
    }
}

