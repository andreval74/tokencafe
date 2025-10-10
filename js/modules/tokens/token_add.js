// Token Add Page - TokenCafe
// Módulo mínimo para inicializar eventos e validar campos

function qs(id) { return document.getElementById(id); }

function isValidEthAddress(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(addr || '');
}

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
  ['tokenName','tokenSymbol','totalSupply','ownerAddress'].forEach(id => {
    const el = qs(id);
    if (el) el.addEventListener('input', validateBasicFields);
  });
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); } catch (_) {}
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
      if (addr) window.open(`https://etherscan.io/address/${addr}`, '_blank');
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
      if (hash) window.open(`https://etherscan.io/tx/${hash}`, '_blank');
    });
  }
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
  setupResultActions();
  setupCreateFlow();
}

document.addEventListener('DOMContentLoaded', init);

export {};