// Token Add Page - TokenCafe
// Captura completa de informações, detecção de rede e preview de contrato

import { NetworkManager } from '../../shared/network-manager.js';

function qs(id) { return document.getElementById(id); }

function isValidEthAddress(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr || '');
}

let selectedNetwork = null;

function validateBasicFields() {
  const name = qs('tokenName')?.value?.trim();
  const symbol = qs('tokenSymbol')?.value?.trim();
  const supply = qs('totalSupply')?.value?.trim();
  const owner = qs('ownerAddress')?.value?.trim();
  const ok = !!(name && symbol && supply && owner && isValidEthAddress(owner));
  const btn = qs('create-token-btn');
  if (btn) btn.style.display = ok ? 'block' : 'none';
}

function setupInputs() {
  ['tokenName','tokenSymbol','totalSupply','ownerAddress','decimals'].forEach(id => {
    const el = qs(id);
    if (el) el.addEventListener('input', validateBasicFields);
  });
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); } catch (_) {}
}

function getExplorerBase() {
  const explorers = selectedNetwork?.explorers || [];
  return explorers.length ? explorers[0].url : 'https://etherscan.io';
}

function fillNetworkUI() {
  if (!selectedNetwork) return;
  const nameEl = qs('network-name');
  const chainEl = qs('network-chain');
  const currEl = qs('network-currency');
  const rpcEl = qs('network-rpc');
  const expEl = qs('network-explorer');
  const displayEl = qs('network-display');
  if (nameEl) nameEl.textContent = selectedNetwork.name;
  if (chainEl) chainEl.textContent = String(selectedNetwork.chainId);
  if (currEl) currEl.textContent = selectedNetwork.nativeCurrency?.symbol || '';
  if (rpcEl) rpcEl.textContent = (selectedNetwork.rpc && selectedNetwork.rpc[0]) || '';
  if (expEl) expEl.textContent = getExplorerBase();
  if (displayEl) displayEl.value = `${selectedNetwork.name} (Chain ID: ${selectedNetwork.chainId})`;
}

async function initNetworkDetection() {
  try {
    const nm = new NetworkManager();
    await nm.init();
    // Detectar chainId via carteira, quando disponível
    if (window.ethereum) {
      const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
      const chainDec = parseInt(chainHex, 16);
      selectedNetwork = nm.getNetworkById(chainDec);
    }
    // Fallback para Ethereum se não detectar
    if (!selectedNetwork) {
      selectedNetwork = nm.getNetworkById(1);
    }
    fillNetworkUI();
  } catch (err) {
    console.warn('Falha ao inicializar rede:', err);
  }
}

function setupResultActions() {
  const copyContractBtn = qs('copy-contract-btn');
  if (copyContractBtn) {
    copyContractBtn.addEventListener('click', () => {
      const val = qs('contract-address-display')?.value || '';
      copyToClipboard(val);
    });
  }

  const viewExplorerBtn = qs('view-explorer-btn');
  if (viewExplorerBtn) {
    viewExplorerBtn.addEventListener('click', () => {
      const addr = qs('contract-address-display')?.value || '';
      const base = getExplorerBase();
      if (addr) window.open(`${base}/address/${addr}`, '_blank');
    });
  }

  const addToMetaMaskBtn = qs('add-to-metamask-btn');
  if (addToMetaMaskBtn) {
    addToMetaMaskBtn.addEventListener('click', async () => {
      try {
        const address = qs('contract-address-display')?.value?.trim();
        const symbol = qs('tokenSymbol')?.value?.trim() || 'TKN';
        const decimals = parseInt(qs('decimals')?.value?.trim() || '18', 10);
        if (!address || !isValidEthAddress(address) || !window.ethereum) return;
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: { type: 'ERC20', options: { address, symbol, decimals } }
        });
      } catch (_) {}
    });
  }

  const copyHashBtn = qs('copy-hash-btn');
  if (copyHashBtn) {
    copyHashBtn.addEventListener('click', () => {
      copyToClipboard(qs('transaction-hash-display')?.value || '');
    });
  }

  const viewHashBtn = qs('view-hash-btn');
  if (viewHashBtn) {
    viewHashBtn.addEventListener('click', () => {
      const hash = qs('transaction-hash-display')?.value || '';
      const base = getExplorerBase();
      if (hash) window.open(`${base}/tx/${hash}`, '_blank');
    });
  }
}

function getCompilerSettings() {
  const version = qs('compilerVersion')?.value || 'v0.8.30+commit.8a97fa7a';
  const optimizerEnabled = qs('optimizerEnabled')?.checked ?? true;
  const optimizerRuns = parseInt(qs('optimizerRuns')?.value || '200', 10);
  const licenseType = qs('licenseType')?.value || 'MIT';
  const evmVersion = qs('evmVersion')?.value || 'default';
  return { version, optimizerEnabled, optimizerRuns, licenseType, evmVersion };
}

function generateContractCode({ name, symbol, decimals, totalSupply, owner }) {
  const license = getCompilerSettings().licenseType;
  const supplyExpr = `uint256(${totalSupply}) * (10 ** uint256(${decimals}))`;
  const cnInput = qs('contractName')?.value?.trim();
  const contractName = cnInput || `${symbol}Token`;
  const ownable = !!qs('featureOwnable')?.checked;
  const mintable = !!qs('featureMintable')?.checked;
  const burnable = !!qs('featureBurnable')?.checked;
  const pausable = !!qs('featurePausable')?.checked;

  const ownerDecl = ownable ? `address public owner = ${owner};
    modifier onlyOwner() { require(msg.sender == owner, "Not owner"); _; }` : '';
  const pausedDecl = pausable ? `bool public paused = false;
    modifier whenNotPaused() { require(!paused, "Paused"); _; }
    function pause() public ${ownable ? 'onlyOwner' : ''} { paused = true; }
    function unpause() public ${ownable ? 'onlyOwner' : ''} { paused = false; }` : '';
  const transferMods = pausable ? 'whenNotPaused' : '';
  const mintFn = mintable ? `function mint(address to, uint256 value) public ${ownable ? 'onlyOwner ' : ''}${pausable ? 'whenNotPaused ' : ''}returns (bool) {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
        return true;
    }` : '';
  const burnFn = burnable ? `function burn(uint256 value) public ${pausable ? 'whenNotPaused ' : ''}returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        unchecked { balanceOf[msg.sender] -= value; totalSupply -= value; }
        emit Transfer(msg.sender, address(0), value);
        return true;
    }` : '';

  return `// SPDX-License-Identifier: ${license}
pragma solidity ^0.8.20;

contract ${contractName} {
    string public name = "${name}";
    string public symbol = "${symbol}";
    uint8 public decimals = ${decimals};
    uint256 public totalSupply = ${supplyExpr};
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    ${ownerDecl}
    ${pausedDecl}

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        balanceOf(${owner}) = totalSupply;
        emit Transfer(address(0), ${owner}, totalSupply);
    }

    function transfer(address to, uint256 value) public ${transferMods} returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        unchecked { balanceOf[msg.sender] -= value; }
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public ${transferMods} returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public ${transferMods} returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        unchecked { allowance[from][msg.sender] -= value; balanceOf[from] -= value; }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }

    ${mintFn}
    ${burnFn}
}`;
}

function setupContractPreview() {
  const viewBtn = qs('view-contract-btn');
  if (!viewBtn) return;
  viewBtn.addEventListener('click', () => {
    const name = qs('tokenName')?.value?.trim();
    const symbol = qs('tokenSymbol')?.value?.trim();
    const decimals = parseInt(qs('decimals')?.value || '18', 10);
    const totalSupply = qs('totalSupply')?.value?.trim();
    const owner = qs('ownerAddress')?.value?.trim();
    if (!(name && symbol && totalSupply && owner && isValidEthAddress(owner))) return;
    const code = generateContractCode({ name, symbol, decimals, totalSupply, owner });
    const meta = `${name} (${symbol}) • Decimals: ${decimals} • Supply: ${totalSupply}`;
    const codeEl = qs('preview-contract-code');
    const infoEl = qs('preview-token-info');
    if (codeEl) codeEl.textContent = code;
    if (infoEl) infoEl.textContent = meta;
    const modalEl = document.getElementById('contractPreviewModal');
    if (modalEl) {
      const modal = new bootstrap.Modal(modalEl);
      modal.show();
    }
  });
}

function setupVerifyAction() {
  const verifyBtn = qs('verify-contract-btn');
  if (!verifyBtn) return;
  verifyBtn.addEventListener('click', () => {
    const addr = qs('contract-address-display')?.value?.trim();
    const base = getExplorerBase();
    if (addr) window.open(`${base}/address/${addr}#code`, '_blank');
  });
}

function setupCreateFlow() {
  const btn = qs('create-token-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // Fluxo mínimo: revela seções de resultado e verificação
    const secResult = document.getElementById('section-result');
    const secVeri = document.getElementById('section-veri');
    if (secResult) secResult.classList.remove('d-none');
    if (secVeri) secVeri.classList.remove('d-none');
    // Preenche placeholders se vazios
    const addr = qs('contract-address-display');
    if (addr && !addr.value) addr.value = '0x0000000000000000000000000000000000000000';
    const hash = qs('transaction-hash-display');
    if (hash && !hash.value) hash.value = '0x' + '0'.repeat(64);
  });
}

function init() {
  setupInputs();
  validateBasicFields();
  initNetworkDetection();
  setupResultActions();
  setupCreateFlow();
  setupContractPreview();
  setupVerifyAction();
}

document.addEventListener('DOMContentLoaded', init);

export {};