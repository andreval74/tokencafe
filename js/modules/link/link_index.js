// Link Generator - TokenCafe (limpo e funcional)
// Responsável por buscar rede, ler token e gerar link compartilhável

import { NetworkManager } from '../../shared/network-manager.js';
import { blockchainUnified } from '../blockchain-unified.js';

const networkManager = new NetworkManager();

const ids = {
  networkSearch: 'networkSearch',
  networkAutocomplete: 'networkAutocomplete',
  rpcUrl: 'rpcUrl',
  explorerUrl: 'explorerUrl',
  tokenAddress: 'tokenAddress',
  tokenName: 'tokenName',
  tokenSymbol: 'tokenSymbol',
  tokenDecimals: 'tokenDecimals',
  tokenImage: 'tokenImage',
  btnTokenSearch: 'btnTokenSearch',
  btnClearToken: 'btnClearToken',
  btnCopyLink: 'btnCopyLink',
  btnShareLink: 'btnShareLink',
  btnPreviewLink: 'btnPreviewLink',
  btnAddToMetaMask: 'btnAddToMetaMask',
  btnOpenLink: 'btnOpenLink',
  btnClearAll: 'btnClearAll',
  generatedLink: 'generatedLink'
};

let selectedNetwork = null;
let tokenFetched = false;

function toast(msg, type = 'info') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    console.log(`[${type}] ${msg}`);
  }
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? '';
}

function show(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('d-none');
}

function hide(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('d-none');
}

function isValidAddress(addr) {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

// Helpers de timeout e pré-validação de RPC para respostas mais rápidas
function timeoutRace(promise, ms, errMsg = 'timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errMsg)), ms))
  ]);
}

async function rpcPreflight(rpcUrl, expectedChainId, timeoutMs = 1500) {
  if (!rpcUrl) throw new Error('RPC vazio');
  const body = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'eth_chainId',
    params: []
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const json = await res.json().catch(() => ({}));
    const hexId = json?.result;
    const chain = typeof hexId === 'string' ? parseInt(hexId, 16) : NaN;
    return String(chain) === String(expectedChainId);
  } finally {
    clearTimeout(timer);
  }
}

// Fallbacks mínimos para redes populares quando rpcs.json não fornece URLs
function getFallbackRpc(chainId) {
  switch (Number(chainId)) {
    case 56: // BNB Smart Chain Mainnet
      return 'https://bsc-dataseed.binance.org';
    case 97: // BNB Smart Chain Testnet
      return 'https://bsc-testnet.publicnode.com';
    case 1: // Ethereum Mainnet
      return 'https://eth.llamarpc.com';
    case 137: // Polygon Mainnet
      return 'https://polygon-rpc.com';
    default:
      return '';
  }
}

function getFallbackExplorer(chainId) {
  switch (Number(chainId)) {
    case 56:
      return 'https://bscscan.com';
    case 97:
      return 'https://testnet.bscscan.com';
    case 1:
      return 'https://etherscan.io';
    case 137:
      return 'https://polygonscan.com';
    default:
      return '';
  }
}

function renderAutocomplete(list) {
  // Compatível com o comportamento do rpc-logic.js
  const box = document.getElementById(ids.networkAutocomplete);
  if (!box) return;
  if (!list || list.length === 0) {
    box.classList.add('d-none');
    box.innerHTML = '';
    return;
  }
  box.innerHTML = list.map(network => `
    <div class="autocomplete-item" data-chainid="${network.chainId}">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${network.name}</strong>
          <small class="d-block text-muted">Chain ID: ${network.chainId}</small>
        </div>
        <span class="badge bg-dark-elevated text-tokencafe">${network.nativeCurrency?.symbol || 'N/A'}</span>
      </div>
    </div>
  `).join('');
  // Adicionar listeners de clique por item
  box.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.chainid, 10);
      const net = networkManager.getNetworkById(id);
      if (net) selectNetwork(net);
    });
  });
  box.classList.remove('d-none');
}

function selectNetwork(network) {
  selectedNetwork = network;
  const input = document.getElementById(ids.networkSearch);
  if (input) {
    input.value = `${network.name} (${network.chainId})`;
    input.dataset.chainId = String(network.chainId);
  }
  const box = document.getElementById(ids.networkAutocomplete);
  if (box) box.classList.add('d-none');
  // Preencher elementos do layout padrão (rpc-index)
  const nameEl = document.getElementById('networkNameCode');
  const idEl = document.getElementById('chainIdCode');
  const curNameEl = document.getElementById('nativeCurrencyNameCode');
  const curSymEl = document.getElementById('nativeCurrencySymbolCode');
  const rpcText = document.getElementById('rpcUrlCode');
  const rpcLink = document.getElementById('rpcUrlText');
  const expText = document.getElementById('explorerUrlCode');
  const expLink = document.getElementById('explorerUrlText');
  if (nameEl) nameEl.textContent = network.name || '';
  if (idEl) idEl.textContent = String(network.chainId || '');
  if (curNameEl) curNameEl.textContent = network.nativeCurrency?.name || '';
  if (curSymEl) curSymEl.textContent = network.nativeCurrency?.symbol || '';
  let rpc = (Array.isArray(network.rpc) && network.rpc.length ? network.rpc[0] : '') || '';
  let explorer = (network.explorers?.[0]?.url || '') || '';
  // Aplicar fallback quando ausente
  if (!rpc) rpc = getFallbackRpc(network.chainId);
  if (!explorer) explorer = getFallbackExplorer(network.chainId);
  // Persistir fallback na rede selecionada para uso posterior
  if (!Array.isArray(network.rpc) || network.rpc.length === 0) {
    network.rpc = rpc ? [rpc] : [];
  }
  if (!Array.isArray(network.explorers) || network.explorers.length === 0) {
    network.explorers = explorer ? [{ url: explorer }] : [];
  }
  if (rpcText) rpcText.textContent = rpc;
  if (rpcLink && rpc) rpcLink.href = rpc;
  if (expText) expText.textContent = explorer;
  if (expLink && explorer) expLink.href = explorer;
  show('token-section');
}

function buildLink() {
  const address = document.getElementById(ids.tokenAddress)?.value.trim();
  const name = document.getElementById(ids.tokenName)?.value.trim();
  const symbol = document.getElementById(ids.tokenSymbol)?.value.trim();
  const decimals = document.getElementById(ids.tokenDecimals)?.value.trim();
  const image = document.getElementById(ids.tokenImage)?.value.trim();
  if (!address || !selectedNetwork) return '';
  const params = new URLSearchParams({
    address,
    chainId: String(selectedNetwork.chainId),
    name: name || '',
    symbol: symbol || '',
    decimals: decimals || '18',
    image: image || '',
    rpc: selectedNetwork.rpc?.[0] || '',
    explorer: selectedNetwork.explorers?.[0]?.url || ''
  });
  return `${location.origin}/pages/modules/link/link-token.html?${params.toString()}`;
}

function updateGeneratedLink() {
  const url = buildLink();
  setValue(ids.generatedLink, url);
  if (url && tokenFetched) show('generate-section');
}

async function fetchTokenData() {
  const address = document.getElementById(ids.tokenAddress)?.value.trim();
  if (!selectedNetwork) {
    const loading = document.getElementById('tokenLoading');
    if (loading) {
      loading.textContent = 'Selecione uma rede antes de buscar o token.';
      loading.classList.remove('d-none');
      loading.classList.remove('alert-info');
      loading.classList.add('alert-danger');
    }
    hide('token-info');
    hide('generate-section');
    return;
  }
  if (!address || !isValidAddress(address)) {
    const loading = document.getElementById('tokenLoading');
    if (loading) {
      loading.textContent = 'Endereço inválido. Informe um contrato ERC‑20 (0x...) válido.';
      loading.classList.remove('d-none');
      loading.classList.remove('alert-info');
      loading.classList.add('alert-danger');
    }
    hide('token-info');
    hide('generate-section');
    return;
  }
  const loading = document.getElementById('tokenLoading');
  let hadError = false;
  if (loading) {
    loading.textContent = 'Validando RPC...';
    loading.classList.remove('d-none');
    loading.classList.remove('alert-danger', 'alert-warning');
    loading.classList.add('alert-info');
  }
  try {
    // Criar provider e validar Chain ID do RPC
    let rpcUrl = (Array.isArray(selectedNetwork.rpc) && selectedNetwork.rpc.length ? selectedNetwork.rpc[0] : '') || '';
    if (!rpcUrl) {
      rpcUrl = getFallbackRpc(selectedNetwork.chainId);
      if (rpcUrl) {
        // Atualizar UI e selectedNetwork para refletir o fallback
        selectedNetwork.rpc = [rpcUrl];
        const rpcText = document.getElementById('rpcUrlCode');
        const rpcLink = document.getElementById('rpcUrlText');
        if (rpcText) rpcText.textContent = rpcUrl;
        if (rpcLink) rpcLink.href = rpcUrl;
      }
    }
    if (!rpcUrl || typeof ethers === 'undefined') {
      if (loading) {
        loading.textContent = 'RPC indisponível para a rede selecionada. Tente outra rede ou RPC.';
        loading.classList.remove('alert-info');
        loading.classList.add('alert-danger');
      }
      hadError = true;
      tokenFetched = false;
      hide('generate-section');
      return;
    }

    // Pré-validação rápida do RPC para evitar esperas longas
    let validRpc = false;
    try {
      validRpc = await rpcPreflight(rpcUrl, selectedNetwork.chainId, 1500);
    } catch (e) {
      validRpc = false;
    }
    if (!validRpc) {
      // Tentar fallback rápido
      const fb = getFallbackRpc(selectedNetwork.chainId);
      if (fb && fb !== rpcUrl) {
        try {
          const fbOk = await rpcPreflight(fb, selectedNetwork.chainId, 1500);
          if (fbOk) {
            rpcUrl = fb;
            selectedNetwork.rpc = [fb];
            const rpcText = document.getElementById('rpcUrlCode');
            const rpcLink = document.getElementById('rpcUrlText');
            if (rpcText) rpcText.textContent = fb;
            if (rpcLink) rpcLink.href = fb;
          }
        } catch {}
      }
    }

    if (loading) loading.textContent = 'Carregando dados do token...';

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    let net;
    try { net = await timeoutRace(provider.getNetwork(), 2000, 'timeout-network'); } catch {}
    if (!net || String(net.chainId) !== String(selectedNetwork.chainId)) {
      if (loading) {
        loading.textContent = 'Rede inválida: o RPC não corresponde ao ChainId selecionado.';
        loading.classList.remove('alert-info');
        loading.classList.add('alert-danger');
      }
      hadError = true;
      tokenFetched = false;
      hide('token-info');
      hide('generate-section');
      return;
    }

    // Verificar existência do contrato antes de ler dados
    let code = '0x';
    try { code = await timeoutRace(provider.getCode(address), 2500, 'timeout-code'); } catch {}
    if (!code || code === '0x') {
      // Diferenciar carteira (EOA) de contrato ausente
      let isEoa = false;
      try {
        const [balance, txCount] = await Promise.all([
          timeoutRace(provider.getBalance(address), 2000, 'timeout-balance').catch(() => null),
          timeoutRace(provider.getTransactionCount(address), 2000, 'timeout-txcount').catch(() => null)
        ]);
        if (balance !== null || txCount !== null) isEoa = true;
      } catch {}
      if (isEoa) {
        if (loading) {
          loading.textContent = 'Endereço é de carteira (EOA), não um contrato.';
          loading.classList.remove('alert-info');
          loading.classList.add('alert-danger');
        }
      } else {
        if (loading) {
          loading.textContent = 'Contrato não encontrado nesta rede (sem código/deploy). Verifique o ChainId ou tente outro RPC.';
          loading.classList.remove('alert-info');
          loading.classList.add('alert-danger');
        }
      }
      hadError = true;
      tokenFetched = false;
      hide('token-info');
      hide('generate-section');
      return;
    }

    // Ler dados diretamente do contrato ERC-20
    const abi = [
      'function name() view returns (string)',
      'function symbol() view returns (string)',
      'function decimals() view returns (uint8)'
    ];
    const contract = new ethers.Contract(address, abi, provider);
    const [name, symbol, decimals] = await Promise.all([
      timeoutRace(contract.name(), 2500, 'timeout-name').catch(() => ''),
      timeoutRace(contract.symbol(), 2500, 'timeout-symbol').catch(() => ''),
      timeoutRace(contract.decimals(), 2500, 'timeout-decimals').catch(() => 18)
    ]);

    setValue(ids.tokenName, name || '');
    setValue(ids.tokenSymbol, symbol || '');
    setValue(ids.tokenDecimals, String(decimals || '18'));
    show('token-info');
    toast('Dados do token carregados', 'success');
    tokenFetched = true;
    updateGeneratedLink();
  } catch (e) {
    if (loading) {
      loading.textContent = `Erro ao buscar token: ${e.message ?? 'desconhecido'}`;
      loading.classList.remove('alert-info');
      loading.classList.add('alert-danger');
    }
    hadError = true;
    tokenFetched = false;
    hide('token-info');
    hide('generate-section');
  } finally {
    if (loading && !hadError) loading.classList.add('d-none');
  }
}

function copyLink() {
  const val = document.getElementById(ids.generatedLink)?.value;
  if (!val) return;
  navigator.clipboard.writeText(val).then(() => toast('Link copiado', 'success'));
}

function shareLink() {
  const url = document.getElementById(ids.generatedLink)?.value;
  if (!url) return;
  // Compartilhar sem bloquear a UI; fallback para copiar
  (async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'TokenCafe Link', url });
        toast('Link compartilhado com sucesso', 'success');
      } else {
        await navigator.clipboard.writeText(url);
        toast('Compartilhamento indisponível. Link copiado para compartilhar.', 'info');
      }
    } catch (e) {
      await navigator.clipboard.writeText(url);
      toast('Não foi possível compartilhar. Link copiado.', 'warning');
    }
  })();
}

function previewLink() {
  const url = document.getElementById(ids.generatedLink)?.value;
  if (url) window.open(url, '_blank');
}

function openGeneratedLink() {
  // Abrir explorer com o endereço do contrato na rede selecionada
  const address = document.getElementById(ids.tokenAddress)?.value?.trim();
  if (!selectedNetwork || !isValidAddress(address)) {
    toast('Para ver o contrato, selecione a rede e informe um endereço válido.', 'warning');
    return;
  }
  const base = selectedNetwork.explorers?.[0]?.url || getFallbackExplorer(selectedNetwork.chainId);
  if (!base) {
    toast('Explorer indisponível para esta rede.', 'error');
    return;
  }
  const url = `${base.replace(/\/$/, '')}/address/${address}`;
  window.open(url, '_blank');
}

async function addTokenToMetaMask() {
  try {
    const address = document.getElementById(ids.tokenAddress)?.value.trim();
    const symbol = document.getElementById(ids.tokenSymbol)?.value.trim() || 'TKN';
    const decimals = parseInt(document.getElementById(ids.tokenDecimals)?.value.trim() || '18', 10);
    const image = document.getElementById(ids.tokenImage)?.value.trim() || '';
    if (!isValidAddress(address)) {
      toast('Endereço inválido', 'error');
      return;
    }
    if (!window.ethereum) {
      toast('Carteira não detectada', 'warning');
      return;
    }
    await window.ethereum.request({
      method: 'wallet_watchAsset',
      params: {
        type: 'ERC20',
        options: { address, symbol, decimals, image }
      }
    });
    toast('Token enviado para a carteira', 'success');
  } catch (e) {
    toast(`Erro ao adicionar token: ${e.message}`, 'error');
  }
}

function clearTokenOnly() {
  // Reiniciar tudo e voltar para a seleção de rede
  clearAll();
  show('network-section');
  try { document.getElementById(ids.networkSearch)?.focus(); } catch {}
}

function clearAll() {
  setValue(ids.tokenAddress, '');
  setValue(ids.tokenName, '');
  setValue(ids.tokenSymbol, '');
  setValue(ids.tokenDecimals, '');
  setValue(ids.tokenImage, '');
  setValue(ids.generatedLink, '');
  tokenFetched = false;
  selectedNetwork = null;
  hide('selected-network-info');
  hide('token-section');
  hide('generate-section');
  hide('token-info');
  // Limpar busca de rede e autocomplete
  const search = document.getElementById(ids.networkSearch);
  if (search) { search.value = ''; delete search.dataset.chainId; }
  const box = document.getElementById(ids.networkAutocomplete);
  if (box) { box.innerHTML = ''; box.classList.add('d-none'); }
  // Limpar detalhes de rede exibidos
  ['networkNameCode','chainIdCode','nativeCurrencyNameCode','nativeCurrencySymbolCode','rpcUrlCode','explorerUrlCode']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
  const rpcLink = document.getElementById('rpcUrlText');
  // Não limpe textContent do anchor, pois remove o span interno (rpcUrlCode)
  // Apenas remova o href e zere o texto do span específico
  if (rpcLink) {
    rpcLink.removeAttribute('href');
    const rpcSpan = document.getElementById('rpcUrlCode');
    if (rpcSpan) rpcSpan.textContent = '';
  }
  const expLink = document.getElementById('explorerUrlText');
  if (expLink) {
    expLink.removeAttribute('href');
    const expSpan = document.getElementById('explorerUrlCode');
    if (expSpan) expSpan.textContent = '';
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  try { await networkManager.init(); } catch {}
  // Garantir que a seção de rede siga o padrão visual
  const netSection = document.getElementById('network-section');
  if (netSection) netSection.classList.remove('d-none');
  // Integração com o componente de busca compartilhado
  // Comentário: O componente emite eventos padronizados que substituem a lógica local.
  // - network:selected { network }: quando usuário escolhe uma rede na lista
  // - network:clear: quando o campo é limpado (via botão X ou programaticamente)
  // - network:toggleInfo { visible }: quando o usuário alterna a visualização dos detalhes (botão I)
  document.addEventListener('network:selected', (ev) => {
    const net = ev?.detail?.network;
    if (net) selectNetwork(net);
  });
  document.addEventListener('network:clear', () => {
    selectedNetwork = null;
    tokenFetched = false;
    hide('selected-network-info');
    hide('token-section');
    hide('generate-section');
  });
  document.addEventListener('network:toggleInfo', (ev) => {
    const visible = !!(ev?.detail?.visible);
    const card = document.getElementById('selected-network-info');
    if (card) {
      // Apenas refletir visibilidade; conteúdo é atualizado pelo componente
      card.classList.toggle('d-none', !visible);
    }
  });
  document.getElementById(ids.btnTokenSearch)?.addEventListener('click', fetchTokenData);
  document.getElementById(ids.btnCopyLink)?.addEventListener('click', copyLink);
  // Pequenos: copiar - adicionar à carteira - ver contrato
  document.getElementById(ids.btnShareLink)?.addEventListener('click', addTokenToMetaMask);
  document.getElementById(ids.btnOpenLink)?.addEventListener('click', openGeneratedLink);
  // Grande: compartilhar link
  document.getElementById(ids.btnAddToMetaMask)?.addEventListener('click', shareLink);
  document.getElementById(ids.btnClearAll)?.addEventListener('click', clearAll);
  document.getElementById(ids.btnClearToken)?.addEventListener('click', clearTokenOnly);
  // Atualizar link em tempo real
  document.getElementById(ids.tokenAddress)?.addEventListener('input', updateGeneratedLink);
  document.getElementById(ids.tokenName)?.addEventListener('input', updateGeneratedLink);
  document.getElementById(ids.tokenSymbol)?.addEventListener('input', updateGeneratedLink);
  document.getElementById(ids.tokenDecimals)?.addEventListener('input', updateGeneratedLink);
  document.getElementById(ids.tokenImage)?.addEventListener('input', updateGeneratedLink);
});