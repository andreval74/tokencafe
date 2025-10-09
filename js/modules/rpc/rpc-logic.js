// TokenCafe — RPC Logic Module (extraído do inline)
// Este módulo move a lógica operacional da página RPC para um arquivo dedicado,
// em conformidade com a norma de evitar scripts inline. Mantém compatibilidade
// com o fluxo atual expondo window.initRPCManager.

// Acessos aos módulos unificados via window (mantém compatibilidade)
// Usar getters dinâmicos para evitar captura de valores nulos em tempo de carga
function getWalletConnector() {
  return window.walletConnector || null;
}

function getNetworkManager() {
  return window.networkManager || null;
}

/**
 * Inicializar gerenciador de RPC com módulos unificados
 */
async function initRPCManager() {
  // Base do backend (Flask) para operações de atualização automática
  window.RPC_BACKEND_BASE = `${location.protocol}//${location.hostname}:3001`;

  // Carregar RPCs externas (ChainList) em segundo plano
  await loadExternalRpcs();
  // Configurar event listeners
  setupEventListeners();

  // Verificar conexão existente e conectar automaticamente se necessário
  const wcInit = getWalletConnector();
  if (wcInit && wcInit.isConnected) {
    const status = wcInit.getStatus();
    updateWalletUI(status);
    showNextSection('network-section');
  } else {
    // Silenciar tentativa automática quando não há provedor de carteira
    if (window && window.ethereum && getWalletConnector()) {
      await connectWallet();
    } else {
      // Permitir uso sem carteira conectada
      showNextSection('network-section');
    }
  }
}
// Expor inicialização no escopo global para consumo entre módulos
window.initRPCManager = initRPCManager;

/**
 * Configurar event listeners usando APIs unificadas
 */
function setupEventListeners() {
  // Botão conectar carteira (header) — manter para reconectar manualmente se necessário
  document.getElementById('header-connect-btn')?.addEventListener('click', async () => {
    await connectWallet();
  });

  // Busca de redes
  document.getElementById('networkSearch')?.addEventListener('input', (e) => {
    const q = e.target.value.trim();
    searchNetworks(q);
  });

  // Botão de adicionar rede
  document.getElementById('add-network-btn')?.addEventListener('click', async () => {
    await addNetworkToMetaMask();
  });

  // Limpar formulário
  document.getElementById('btn-clear')?.addEventListener('click', () => {
    clearNetworkForm();
  });
  // Botão "Limpar Dados" principal da página RPC
  document.getElementById('clear-network-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    clearNetworkForm();
  });

  // Entrada de RPC manual
  document.getElementById('customRpcUrl')?.addEventListener('input', () => {
    handleCustomRpcInput();
  });

  // Listeners de eventos de carteira
  document.addEventListener('wallet:connected', onWalletConnected);
  document.addEventListener('wallet:disconnected', onWalletDisconnected);
  document.addEventListener('wallet:chainChanged', onChainChanged);
}

/**
 * Conectar carteira usando módulo unificado
 */
async function connectWallet() {
  try {
    // Evitar reconexão se já estiver conectado
    const wc = getWalletConnector();
    if (wc && wc.isConnected) {
      const status = wc.getStatus();
      updateWalletUI(status);
      showNextSection('network-section');
      window.showToast && showToast('Carteira já conectada', 'info');
      return;
    }
    if (!wc || typeof wc.connect !== 'function') {
      console.warn('WalletConnector indisponível ou sem método connect.');
      return;
    }
    window.showLoading && showLoading('Conectando carteira...');

    const result = await wc.connect('metamask');

    if (result.success) {
      window.showToast && showToast('Carteira conectada com sucesso!', 'success');
      updateWalletUI(result);
      showNextSection('network-section');
    } else {
      throw new Error('Falha na conexão');
    }

  } catch (error) {
    console.error('Erro ao conectar:', error);
    window.showToast && showToast(`Erro ao conectar: ${error.message}`, 'error');
  } finally {
    window.hideLoading && hideLoading();
  }
}

/**
 * Carregar RPCs externas via backend
 * - Atualiza rpcs.json em segundo plano se >3 dias
 * - Busca rpcs.json e guarda em window.externalRpcs
 */
async function loadExternalRpcs() {
  // Preferir carregar do arquivo local; backend apenas se habilitado
  try {
    const resLocal = await fetch('/shared/data/rpcs.json');
    if (resLocal.ok) {
      const dataLocal = await resLocal.json();
      if (Array.isArray(dataLocal)) {
        window.externalRpcs = dataLocal;
        console.log(`🔗 RPCs externas carregadas do arquivo local: ${dataLocal.length}`);
      } else if (dataLocal && Array.isArray(dataLocal.rpcs)) {
        window.externalRpcs = dataLocal.rpcs;
        console.log(`🔗 RPCs externas carregadas do arquivo local (obj): ${dataLocal.rpcs.length}`);
      } else {
        window.externalRpcs = [];
      }
    } else {
      window.externalRpcs = [];
    }
  } catch (e) {
    console.warn('Falha ao carregar RPCs externas do arquivo local:', e);
    window.externalRpcs = [];
  }

  // Se backend estiver habilitado, tentar atualizar e substituir pelos dados do backend
  try {
    if (typeof window !== 'undefined' && window.RPC_BACKEND_ENABLED) {
      const base = window.RPC_BACKEND_BASE || `${location.protocol}//${location.hostname}:3001`;
      await fetch(`${base}/api/rpcs/update`).catch(() => null);
      const res = await fetch(`${base}/api/rpcs`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.rpcs)) {
          window.externalRpcs = data.rpcs;
          console.log(`🔗 RPCs externas carregadas do backend: ${data.rpcs.length}`);
        }
      }
    }
  } catch (e2) {
    console.warn('Backend RPCs desabilitado ou indisponível:', e2);
  }
}

/**
 * Obter RPCs externas relevantes para a rede
 */
function getExternalRpcsForNetwork(network) {
  const entries = Array.isArray(window.externalRpcs) ? window.externalRpcs : [];
  const normalize = (s) => (s || '')
    .toLowerCase()
    .replace(/mainnet|testnet|network|chain|blockchain|bnb smart chain|binance/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  const targetName = normalize(network?.name);
  const targetId = network?.chainId;

  const urls = new Set();
  for (const entry of entries) {
    const entryName = normalize(entry?.name || entry?.chainName || '');
    const entryId = entry?.chainId ?? entry?.id;

    let rpcCandidates = [];
    if (Array.isArray(entry?.rpcs)) {
      rpcCandidates = entry.rpcs.map(r => {
        if (typeof r === 'string') return r;
        if (r && typeof r === 'object') return r.url || r.rpc || r.endpoint || '';
        return '';
      });
    } else if (Array.isArray(entry?.rpc)) {
      rpcCandidates = entry.rpc.map(r => (typeof r === 'string') ? r : (r?.url || ''));
    } else if (typeof entry?.url === 'string') {
      rpcCandidates = [entry.url];
    }

    const matchById = (targetId && entryId && Number(entryId) === Number(targetId));
    const entryNorm = entryName;
    const matchByName = (!!targetName && !!entryNorm && (entryNorm.includes(targetName) || targetName.includes(entryNorm)));

    if (matchById || matchByName) {
      for (const u of rpcCandidates) {
        if (isValidUrl(u)) urls.add(u);
      }
    }
  }
  // Exibir mais opções para facilitar escolha; manter limite razoável
  return Array.from(urls).slice(0, 100);
}

/**
 * Buscar redes usando network manager unificado
 */
function searchNetworks(query) {
  try {
    if (!query || query.length < 2) {
      hideAutocomplete();
      return;
    }
    const nm = getNetworkManager();
    if (!nm || typeof nm.searchNetworks !== 'function') {
      console.warn('NetworkManager indisponível ou sem método searchNetworks.');
      hideAutocomplete();
      return;
    }
    const results = nm.searchNetworks(query, 10);
    showAutocompleteResults(results);

  } catch (error) {
    console.error('Erro na busca:', error);
    hideAutocomplete();
  }
}

/**
 * Mostrar resultados do autocomplete
 */
function showAutocompleteResults(networks) {
  const autocomplete = document.getElementById('networkAutocomplete');
  if (!autocomplete) return;

  if (networks.length === 0) {
    hideAutocomplete();
    return;
  }

  autocomplete.innerHTML = networks.map(network => `
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

  // Adicionar listeners
  autocomplete.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      selectNetwork(parseInt(item.dataset.chainid));
    });
  });

  autocomplete.classList.remove('d-none');
}

/**
 * Selecionar rede
 */
function selectNetwork(chainId) {
  const nm = getNetworkManager();
  const network = nm ? nm.getNetworkById(chainId) : null;
  if (!network) return;

  // Atualizar UI
  const networkSearchEl = document.getElementById('networkSearch');
  if (networkSearchEl) {
    networkSearchEl.value = network.name;
    networkSearchEl.dataset.chainId = String(network.chainId);
  }
  hideAutocomplete();

  // Mostrar detalhes da rede
  showNetworkDetails(network);
  showNextSection('rpc-config-section');

  // Pré-preencher formulário
  fillNetworkForm(network);
}

/**
 * Mostrar detalhes da rede selecionada
 */
function showNetworkDetails(network) {
  // Preencher placeholders estáticos sem gerar HTML dinâmico
  const nameEl = document.getElementById('networkNameCode');
  const idEl = document.getElementById('chainIdCode');
  const currencyNameEl = document.getElementById('nativeCurrencyNameCode');
  const currencySymbolEl = document.getElementById('nativeCurrencySymbolCode');

  if (nameEl) nameEl.textContent = network?.name || 'N/A';
  if (idEl) idEl.textContent = (network?.chainId !== undefined) ? String(network.chainId) : 'N/A';
  if (currencyNameEl) currencyNameEl.textContent = network?.nativeCurrency?.name || 'N/A';
  if (currencySymbolEl) currencySymbolEl.textContent = network?.nativeCurrency?.symbol || 'N/A';

  // Exibir o card
  document.getElementById('selected-network-info')?.classList.remove('d-none');
}

/**
 * Pré-preencher formulário com dados da rede
 */
function fillNetworkForm(network) {
  // Persistir chainId selecionado no input de busca
  const networkSearchEl = document.getElementById('networkSearch');
  if (networkSearchEl) {
    networkSearchEl.dataset.chainId = String(network.chainId);
  }

  // Habilitar próxima seção
  showNextSection('add-network-section');
  updateNetworkPreview(network);

  // Renderizar opções de RPCs disponíveis
  renderRpcOptions(network);

  // Aplicar regra de prioridade do RPC manual (se existir)
  handleCustomRpcInput();
}

/**
 * Atualizar preview da rede
 */
function updateNetworkPreview(network) {
  const preview = document.getElementById('network-preview');

  // Escolher RPC: manual > radio > primeiro disponível
  const customVal = document.getElementById('customRpcUrl')?.value?.trim() || '';
  let rpcUrl = '';
  if (customVal && isValidUrl(customVal)) {
    rpcUrl = customVal;
  } else {
    const selectedRadio = document.querySelector('#rpc-options-list input[name="rpcChoice"]:checked');
    if (selectedRadio) {
      rpcUrl = selectedRadio.value;
    } else {
      rpcUrl = Array.isArray(network.rpc) && network.rpc.length ? network.rpc[0] : (typeof network.rpc === 'string' ? network.rpc : '');
    }
  }

  const explorerUrl = network.explorers && network.explorers.length > 0 ?
    (network.explorers[0].url || network.explorers[0]) : '';

  // Atualizar textos/links no bloco "Rede Selecionada"
  const rpcCodeEl = document.getElementById('rpcUrlCode');
  const rpcAnchorEl = document.getElementById('rpcUrlText');
  if (rpcCodeEl) rpcCodeEl.textContent = rpcUrl || 'N/A';
  if (rpcAnchorEl) rpcAnchorEl.href = (rpcUrl && isValidUrl(rpcUrl)) ? rpcUrl : '#';
  const explorerCodeEl = document.getElementById('explorerUrlCode');
  const explorerAnchorEl = document.getElementById('explorerUrlText');
  if (explorerCodeEl) explorerCodeEl.textContent = explorerUrl || 'N/A';
  if (explorerAnchorEl) explorerAnchorEl.href = (explorerUrl && isValidUrl(explorerUrl)) ? explorerUrl : '#';

  // Atualizar blocos estáticos do preview (sem gerar HTML dinâmico)
  const previewRpcCodeEl = document.getElementById('previewRpcUrlCode');
  const previewRpcAnchorEl = document.getElementById('previewRpcUrlText');
  if (previewRpcCodeEl) previewRpcCodeEl.textContent = rpcUrl || 'N/A';
  if (previewRpcAnchorEl) previewRpcAnchorEl.href = (rpcUrl && isValidUrl(rpcUrl)) ? rpcUrl : '#';
  const previewExplorerCodeEl = document.getElementById('previewExplorerUrlCode');
  const previewExplorerAnchorEl = document.getElementById('previewExplorerUrlText');
  if (previewExplorerCodeEl) previewExplorerCodeEl.textContent = explorerUrl || 'N/A';
  if (previewExplorerAnchorEl) previewExplorerAnchorEl.href = (explorerUrl && isValidUrl(explorerUrl)) ? explorerUrl : '#';

  // Habilitar botão se dados válidos
  const addBtn = document.getElementById('add-network-btn');
  if (addBtn && rpcUrl && network.chainId) {
    addBtn.disabled = false;
  }
}

/**
 * Adicionar rede ao MetaMask usando módulo unificado
 */
async function addNetworkToMetaMask() {
  try {
    window.showLoading && showLoading('Adicionando rede ao MetaMask...');

    // Validar Chain ID obtido do campo de busca
    const chainIdRaw = document.getElementById('networkSearch').dataset.chainId;
    const chainIdNum = chainIdRaw ? parseInt(chainIdRaw, 10) : NaN;
    if (!chainIdNum || Number.isNaN(chainIdNum)) {
      throw new Error('Chain ID inválido. Selecione a rede pela busca.');
    }

    const nm = getNetworkManager();
    const network = nm ? nm.getNetworkById(chainIdNum) : null;
    // RPC escolhido
    const customVal = document.getElementById('customRpcUrl')?.value?.trim() || '';
    let chosenRpc = '';
    if (customVal && isValidUrl(customVal)) {
      chosenRpc = customVal;
    } else {
      const selectedRadio = document.querySelector('#rpc-options-list input[name="rpcChoice"]:checked');
      if (selectedRadio) {
        chosenRpc = selectedRadio.value;
      } else {
        chosenRpc = Array.isArray(network.rpc) && network.rpc.length ? network.rpc[0] : (typeof network.rpc === 'string' ? network.rpc : '');
      }
    }

    const explorer = network.explorers && network.explorers.length > 0 ?
      (network.explorers[0].url || network.explorers[0]) : '';

    const networkData = {
      chainId: chainIdNum,
      name: network?.name || document.getElementById('networkSearch').value,
      rpc: [chosenRpc],
      nativeCurrency: {
        name: network?.nativeCurrency?.name || '',
        symbol: network?.nativeCurrency?.symbol || '',
        decimals: 18
      },
      explorers: explorer ? [{ url: explorer }] : []
    };

    const wc = getWalletConnector();
    if (!wc || typeof wc.addNetwork !== 'function') {
      throw new Error('WalletConnector indisponível para adicionar rede.');
    }
    await wc.addNetwork(networkData);
    window.showToast && showToast('Rede adicionada com sucesso!', 'success');

    // Registrar RPC escolhido como já adicionado para esta rede
    addKnownRpc(networkData.chainId, networkData.rpc[0]);
    // Atualizar lista de RPCs disponíveis (oculta as já adicionadas)
    const net = nm ? nm.getNetworkById(networkData.chainId) : null;
    if (net) renderRpcOptions(net);

  } catch (error) {
    console.error('Erro ao adicionar rede:', error);
    window.showToast && showToast(`Erro ao adicionar rede: ${error.message}`, 'error');
    // Limpar dados ao falhar
    clearNetworkForm();
  } finally {
    window.hideLoading && hideLoading();
  }
}

// Event handlers da carteira
function onWalletConnected(event) {
  const { account, wallet, network } = event.detail;
  updateWalletUI({ account, wallet, network });
}

function onWalletDisconnected() {
  resetWalletUI();
}

function onChainChanged(event) {
  const { chainId } = event.detail;
  console.log('Rede alterada:', chainId);
  window.showToast && showToast('Rede alterada na carteira', 'info');
}

/**
 * Atualizar UI da carteira
 */
function updateWalletUI(result) {
  const { account, wallet, network } = result;
  const shortAddress = window.formatAddress ? formatAddress(account) : account;

  // Atualizar status no header
  const headerAddr = document.getElementById('header-wallet-address');
  const headerStatus = document.getElementById('header-wallet-status');
  const headerConnectBtn = document.getElementById('header-connect-btn');
  if (headerAddr) headerAddr.textContent = shortAddress;
  if (headerStatus) headerStatus.classList.remove('d-none');
  if (headerConnectBtn) headerConnectBtn.classList.add('d-none');
  // Sem sessão de conexão: seguir direto para busca de rede
}

/**
 * Resetar UI da carteira
 */
function resetWalletUI() {
  // Header
  document.getElementById('header-wallet-status')?.classList.add('d-none');
  document.getElementById('header-connect-btn')?.classList.remove('d-none');

  // Ocultar seções
  hideAllSections();
}

// Mostrar próxima seção
function showNextSection(sectionId) {
  document.getElementById(sectionId)?.classList.remove('d-none');
}

// Ocultar autocomplete
function hideAutocomplete() {
  document.getElementById('networkAutocomplete')?.classList.add('d-none');
}

// Ocultar todas as seções
function hideAllSections() {
  ['network-section', 'rpc-config-section', 'add-network-section'].forEach(id => {
    document.getElementById(id)?.classList.add('d-none');
  });
}

// Limpar dados do formulário e preview
function clearNetworkForm() {
  const ids = ['networkSearch'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      if (id === 'networkSearch') {
        delete el.dataset.chainId;
      }
    }
  });

  // Limpar textos/links
  const rpcCodeEl = document.getElementById('rpcUrlCode');
  if (rpcCodeEl) rpcCodeEl.textContent = '';
  const rpcAnchorEl = document.getElementById('rpcUrlText');
  if (rpcAnchorEl) rpcAnchorEl.href = '#';
  const explorerCodeEl = document.getElementById('explorerUrlCode');
  if (explorerCodeEl) explorerCodeEl.textContent = '';
  const explorerAnchorEl = document.getElementById('explorerUrlText');
  if (explorerAnchorEl) explorerAnchorEl.href = '#';
  const nameEl = document.getElementById('networkNameCode');
  if (nameEl) nameEl.textContent = '';
  const idEl = document.getElementById('chainIdCode');
  if (idEl) idEl.textContent = '';
  const currencyNameEl = document.getElementById('nativeCurrencyNameCode');
  if (currencyNameEl) currencyNameEl.textContent = '';
  const currencySymbolEl = document.getElementById('nativeCurrencySymbolCode');
  if (currencySymbolEl) currencySymbolEl.textContent = '';

  // Limpar preview e autocomplete
  const previewRpcCodeEl = document.getElementById('previewRpcUrlCode');
  if (previewRpcCodeEl) previewRpcCodeEl.textContent = '';
  const previewRpcAnchorEl = document.getElementById('previewRpcUrlText');
  if (previewRpcAnchorEl) previewRpcAnchorEl.href = '#';
  const previewExplorerCodeEl = document.getElementById('previewExplorerUrlCode');
  if (previewExplorerCodeEl) previewExplorerCodeEl.textContent = '';
  const previewExplorerAnchorEl = document.getElementById('previewExplorerUrlText');
  if (previewExplorerAnchorEl) previewExplorerAnchorEl.href = '#';
  hideAutocomplete();

  // Ocultar bloco "Rede Selecionada" e limpar detalhes
  const selectedInfo = document.getElementById('selected-network-info');
  if (selectedInfo) selectedInfo.classList.add('d-none');
  const autocomplete = document.getElementById('networkAutocomplete');
  if (autocomplete) autocomplete.innerHTML = '';

  // Limpar opções de RPC
  const rpcOptionsList = document.getElementById('rpc-options-list');
  if (rpcOptionsList) rpcOptionsList.innerHTML = '';
  document.getElementById('rpc-options-section')?.classList.add('d-none');

  // Limpar RPC manual
  const customInput = document.getElementById('customRpcUrl');
  if (customInput) customInput.value = '';

  // Ocultar seções posteriores e desabilitar botão de adicionar
  document.getElementById('rpc-config-section')?.classList.add('d-none');
  document.getElementById('add-network-section')?.classList.add('d-none');
  const addBtn = document.getElementById('add-network-btn');
  if (addBtn) addBtn.setAttribute('disabled', '');

  window.showToast && showToast('Dados limpos. Selecione uma rede para começar.', 'info');
}

// Validação simples de URL
function isValidUrl(url) {
  try {
    const u = new URL(url);
    return !!u.protocol && (u.protocol === 'http:' || u.protocol === 'https:');
  } catch {
    return false;
  }
}

// Fetch com timeout usando AbortController
async function fetchWithTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

// Testar se um RPC está online chamando eth_chainId
async function testRpcUrl(rpcUrl, expectedChainId) {
  if (!isValidUrl(rpcUrl)) return false;
  try {
    const resp = await fetchWithTimeout(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_chainId', params: [], id: 1 })
    }, 5000);
    if (!resp.ok) return false;
    const data = await resp.json().catch(() => null);
    if (!data || (!data.result && !data.chainId)) return false;
    if (expectedChainId) {
      const expectedHex = typeof expectedChainId === 'string'
        ? (expectedChainId.startsWith('0x') ? expectedChainId.toLowerCase() : ('0x' + Number(expectedChainId).toString(16)))
        : ('0x' + Number(expectedChainId).toString(16));
      const got = (data.result || data.chainId || '').toLowerCase();
      if (got && got.startsWith('0x')) return got === expectedHex;
    }
    return true;
  } catch {
    return false;
  }
}

// Cache simples de validações por URL
const rpcValidationCache = {};
let customRpcValidated = false;

function updateAddButtonState(network) {
  const addBtn = document.getElementById('add-network-btn');
  if (!addBtn) return;
  const selectedRadio = document.querySelector('#rpc-options-list input[name="rpcChoice"]:checked');
  const customVal = document.getElementById('customRpcUrl')?.value?.trim() || '';
  const useCustom = customVal && customRpcValidated;
  const useRadio = selectedRadio && rpcValidationCache[selectedRadio.value] === true;
  addBtn.disabled = !(network && (useCustom || useRadio));
}

// Filtrar e retornar apenas RPCs online
async function getWorkingRpcs(rpcUrls, expectedChainId) {
  const unique = Array.from(new Set((rpcUrls || []).filter(isValidUrl)));
  const limited = unique.slice(0, 8);
  const results = await Promise.allSettled(limited.map(url => testRpcUrl(url, expectedChainId)));
  const working = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled' && results[i].value) working.push(limited[i]);
  }
  return working;
}

// Utilitários de cache de RPCs já adicionadas (por chainId)
function getKnownRpcStore() {
  try {
    const raw = localStorage.getItem('tokencafe_known_rpcs');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveKnownRpcStore(store) {
  try {
    localStorage.setItem('tokencafe_known_rpcs', JSON.stringify(store));
  } catch (e) {
    // ignore
  }
}

function getKnownRpcs(chainId) {
  const store = getKnownRpcStore();
  const key = String(chainId);
  return Array.isArray(store[key]) ? store[key] : [];
}

function addKnownRpc(chainId, rpcUrl) {
  const store = getKnownRpcStore();
  const key = String(chainId);
  const list = Array.isArray(store[key]) ? store[key] : [];
  if (!list.includes(rpcUrl)) {
    list.push(rpcUrl);
    store[key] = list;
    saveKnownRpcStore(store);
  }
}

/**
 * Renderizar lista de RPCs disponíveis para a rede selecionada
 */
async function renderRpcOptions(network) {
  const section = document.getElementById('rpc-options-section');
  const listEl = document.getElementById('rpc-options-list');
  if (!section || !listEl) return;

  // Se há RPC manual preenchido, esconder a lista
  const customVal = document.getElementById('customRpcUrl')?.value?.trim();
  if (customVal) {
    section.classList.add('d-none');
    const addBtn = document.getElementById('add-network-btn');
    const chainIdRaw = document.getElementById('networkSearch').dataset.chainId;
    if (addBtn) addBtn.disabled = !(isValidUrl(customVal) && chainIdRaw);
    updateNetworkPreview(network);
    return;
  }

  const nativeRpcs = Array.isArray(network.rpc) ? network.rpc : (network.rpc ? [network.rpc] : []);
  const externalRpcs = getExternalRpcsForNetwork(network);
  const toUrl = (r) => {
    if (typeof r === 'string') return r;
    if (r && typeof r === 'object') return r.url || r.rpc || r.endpoint || '';
    return '';
  };
  const allRpcs = Array.from(new Set([
    ...nativeRpcs.map(toUrl).filter(isValidUrl),
    ...externalRpcs.map(toUrl).filter(isValidUrl)
  ]));
  const known = new Set(getKnownRpcs(network.chainId).map(r => r.trim()));
  const available = allRpcs.filter(url => url && !known.has(url.trim()));
  // Não exibir automaticamente; só mostrar quando usuário clicar em "Escolher RPCs"
  listEl.innerHTML = available.map((url, idx) => `
                        <div class="list-group-item d-flex align-items-center justify-content-between gap-2" data-rpc-url="${url}">
                            <div class="d-flex align-items-center gap-2">
                                <input type="radio" name="rpcChoice" class="form-check-input me-2" value="${url}" disabled />
                                <code class="text-tokencafe">${url}</code>
                            </div>
                            <button id="rpcTest-${idx}" class="btn btn-sm btn-outline-primary">Testar</button>
                        </div>
                    `).join('');

  // Eventos: testar ao clicar "Testar" e ao selecionar o radio
  available.forEach((url, idx) => {
    const btnEl = document.getElementById(`rpcTest-${idx}`);
    const radioEl = listEl.querySelector(`#rpc-options-list input[name="rpcChoice"][value="${url}"]`) || listEl.querySelector(`input[name="rpcChoice"][value="${url}"]`);

    const runTest = async () => {
      btnEl.className = 'btn btn-sm btn-outline-warning';
      btnEl.textContent = 'Testando...';
      const ok = await testRpcUrl(url, network?.chainId);
      rpcValidationCache[url] = !!ok;
      if (ok) {
        btnEl.className = 'btn btn-sm btn-primary';
        btnEl.textContent = 'ONLINE';
        radioEl.disabled = false;
      } else {
        btnEl.className = 'btn btn-sm btn-danger';
        btnEl.textContent = 'OFFLINE';
        radioEl.disabled = true;
        const container = radioEl.closest('.list-group-item');
        if (container) container.classList.add('opacity-50');
      }
      updateAddButtonState(network);
    };

    btnEl?.addEventListener('click', runTest);
    radioEl?.addEventListener('change', () => {
      updateNetworkPreview(network);
      runTest();
    });
  });

  // Estado inicial: botão de adicionar desabilitado
  updateAddButtonState(network);
}

// Regras de prioridade do RPC manual sobre a lista
function handleCustomRpcInput() {
  const customVal = document.getElementById('customRpcUrl')?.value?.trim() || '';
  const section = document.getElementById('rpc-options-section');
  const addBtn = document.getElementById('add-network-btn');
  const chainIdRaw = document.getElementById('networkSearch')?.dataset?.chainId;
  const chainIdNum = chainIdRaw ? parseInt(chainIdRaw, 10) : null;
  const nm = getNetworkManager();
  const network = chainIdNum ? (nm ? nm.getNetworkById(chainIdNum) : null) : null;

  // Resetar status de validação quando editar
  customRpcValidated = false;
  const btn = document.getElementById('btn-test-custom-rpc');
  if (btn) {
    btn.className = 'btn btn-outline-primary';
    btn.textContent = 'Testar';
  }
  if (network) updateNetworkPreview(network);
  updateAddButtonState(network);
}

// Alternar modo: lista de RPCs vs personalizada
function activateRpcMode(mode) {
  const sectionList = document.getElementById('rpc-options-section');
  const customSec = document.getElementById('custom-rpc-section');
  if (mode === 'custom') {
    sectionList?.classList.add('d-none');
    customSec?.classList.remove('d-none');
  } else {
    sectionList?.classList.remove('d-none');
    customSec?.classList.add('d-none');
  }
}

// Listeners dos botões de alternância e teste personalizado
document.getElementById('btn-show-rpc-list')?.addEventListener('click', () => activateRpcMode('list'));
document.getElementById('btn-show-custom-rpc')?.addEventListener('click', () => activateRpcMode('custom'));
document.getElementById('btn-test-custom-rpc')?.addEventListener('click', async () => {
  const chainIdRaw = document.getElementById('networkSearch')?.dataset?.chainId;
  const chainIdNum = chainIdRaw ? parseInt(chainIdRaw, 10) : null;
  const nm = getNetworkManager();
  const network = chainIdNum ? (nm ? nm.getNetworkById(chainIdNum) : null) : null;
  const url = document.getElementById('customRpcUrl')?.value?.trim() || '';
  const btn = document.getElementById('btn-test-custom-rpc');
  if (!url || !isValidUrl(url)) {
    if (btn) { btn.className = 'btn btn-danger'; btn.textContent = 'OFFLINE'; }
    customRpcValidated = false;
    updateAddButtonState(network);
    return;
  }
  if (btn) { btn.className = 'btn btn-outline-warning'; btn.textContent = 'Testando...'; }
  const ok = await testRpcUrl(url, network?.chainId);
  if (btn) {
    btn.className = ok ? 'btn btn-primary' : 'btn btn-danger';
    btn.textContent = ok ? 'ONLINE' : 'OFFLINE';
  }
  customRpcValidated = !!ok;
  updateAddButtonState(network);
  if (network) updateNetworkPreview(network);
});