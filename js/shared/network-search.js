// Componente Unificado de Busca de Rede Blockchain
// Inicializa instâncias do componente inseridas via data-component,
// aciona buscas via networkManager e emite eventos globais. Lista só aparece ao digitar.

import { networkManager } from '/js/shared/network-manager.js';

function initContainer(container) {
  if (!container || container.getAttribute('data-ns-initialized') === 'true') return;

  const input = container.querySelector('#networkSearch');
  const list = container.querySelector('#networkAutocomplete');
  const infoBtn = container.querySelector('#nsInfoBtn');
  const clearBtn = container.querySelector('#nsClearBtn');
  if (!input || !list) return;

  const placeholder = container.getAttribute('data-ns-placeholder') || 'Buscar por nome, chainId ou símbolo';
  const minChars = parseInt(container.getAttribute('data-ns-min-chars') || '1', 10);

  input.setAttribute('placeholder', placeholder);

  let debounceTimer;
  const debounce = (fn, delay = 250) => { clearTimeout(debounceTimer); debounceTimer = setTimeout(fn, delay); };

  let selectedNetwork = null;
  let infoVisible = false;

  function hideList() { list.classList.add('d-none'); list.style.display = 'none'; }
  function showList() { list.classList.remove('d-none'); list.style.display = 'block'; }

  function renderResults(networks = []) {
    list.innerHTML = '';
    if (!networks.length) { hideList(); return; }
    list.innerHTML = networks.map(net => `
      <div class="autocomplete-item list-group-item list-group-item-action" data-chainid="${net.chainId}">
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <strong>${net.name}</strong>
            <small class="d-block text-muted">Chain ID: ${net.chainId}</small>
          </div>
          <span class="badge bg-dark-elevated text-tokencafe">${net.nativeCurrency?.symbol || 'N/A'}</span>
        </div>
      </div>
    `).join('');
    // Listeners de seleção
    list.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-chainid'), 10);
        const net = networkManager?.getNetworkById?.(id);
        if (net) {
          selectedNetwork = net;
          const evt = new CustomEvent('network:selected', { detail: { network: net }, bubbles: true });
          container.dispatchEvent(evt);
          input.value = net.name;
          input.dataset.chainId = String(net.chainId);
          hideList();
        }
      });
    });
    showList();
  }

  // Buscar ao digitar
  input.addEventListener('input', () => {
    const query = (input.value || '').trim();
    if (!query) {
      list.innerHTML = '';
      hideList();
      selectedNetwork = null;
      delete input.dataset.chainId;
      const evt = new CustomEvent('network:clear', { bubbles: true });
      container.dispatchEvent(evt);
      return;
    }
    if (query.length < minChars) return;

    debounce(async () => {
      try {
        const evt = new CustomEvent('network:search', { detail: { query }, bubbles: true });
        container.dispatchEvent(evt);
        // Garantir que todas as redes estejam carregadas antes de buscar
        if (networkManager?.getAllNetworks) {
          await networkManager.getAllNetworks();
        }
        let results = [];
        if (query.length === 1 && networkManager?.getAllNetworks) {
          // Buscar todas e filtrar manualmente para suportar 1 caractere
          const all = await networkManager.getAllNetworks();
          const q = query.toLowerCase();
          const isDigit = /^\d$/.test(query);
          results = (all || []).filter(net => {
            const name = (net.name || '').toLowerCase();
            const shortName = (net.shortName || '').toLowerCase();
            const symbol = (net.nativeCurrency?.symbol || '').toLowerCase();
            if (isDigit) return String(net.chainId).startsWith(query);
            return name.includes(q) || shortName.includes(q) || symbol.includes(q);
          }).slice(0, 10);
        } else {
          results = await networkManager?.searchNetworks?.(query, 10);
        }
        renderResults(results || []);
      } catch (e) {
        console.debug('NetworkSearch: erro na busca', e);
        renderResults([]);
      }
    });
  });

  // Toggle de informações via botão I
  if (infoBtn) {
    infoBtn.addEventListener('click', async () => {
      try {
        // Determinar rede atual: selecionada, chainId no input, ou busca pelo texto
        let net = selectedNetwork;
        if (!net) {
          const chainIdRaw = input.dataset.chainId;
          if (chainIdRaw) net = networkManager?.getNetworkById?.(parseInt(chainIdRaw, 10));
        }
        if (!net) {
          const query = (input.value || '').trim();
          if (query) {
            if (networkManager?.getAllNetworks) await networkManager.getAllNetworks();
            const isDigits = /^\d+$/.test(query);
            if (isDigits) net = networkManager?.getNetworkById?.(parseInt(query, 10));
            if (!net && networkManager?.searchNetworks) {
              const results = await networkManager.searchNetworks(query, 1);
              net = results && results[0] ? results[0] : null;
            }
          }
        }
        infoVisible = !infoVisible;
        const evt = new CustomEvent('network:toggleInfo', { detail: { visible: infoVisible, network: net || null }, bubbles: true });
        container.dispatchEvent(evt);
      } catch (e) {
        console.debug('NetworkSearch: erro ao alternar informações', e);
      }
    });
  }

  // Botão X para limpar campo e estado
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      input.value = '';
      selectedNetwork = null;
      infoVisible = false;
      delete input.dataset.chainId;
      list.innerHTML = '';
      hideList();
      const evt = new CustomEvent('network:clear', { bubbles: true });
      container.dispatchEvent(evt);
      const evt2 = new CustomEvent('network:toggleInfo', { detail: { visible: false, network: null }, bubbles: true });
      container.dispatchEvent(evt2);
    });
  }

  // Esconder ao perder foco (tempo curto para permitir clique)
  input.addEventListener('blur', () => { setTimeout(hideList, 200); });
  // Não abrir lista ao focar — só ao digitar (comportamento original)

  container.setAttribute('data-ns-initialized', 'true');
}

function findContainers() {
  const nodes = document.querySelectorAll('[data-component*="network-search.html"]');
  nodes.forEach(initContainer);
}

// Inicializar e observar novas injeções de componentes
findContainers();
const observer = new MutationObserver(() => { findContainers(); });
observer.observe(document.body, { childList: true, subtree: true });