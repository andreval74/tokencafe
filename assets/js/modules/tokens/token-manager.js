/**
 * token-manager.js — Dashboard de tokens criados pelo usuário.
 *
 * Lê tokens do token-storage.js (localStorage) — sem mock data, sem API falsa.
 * Se o usuário nunca criou um token neste browser, mostra o estado vazio real.
 *
 * Dados de holders/transações ficam como zero até integração on-chain futura
 * (TheGraph ou getLogs direto) — declarado no roadmap Fase 2.
 */

import { getTokens, clearTokens, saveToken } from '../../shared/token-storage.js';
import { getExplorerContractUrl }            from '../../shared/explorer-utils.js';

// ── Helpers DOM ───────────────────────────────────────────────────────────────
const $ = (id)  => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ── Helpers de formatação ────────────────────────────────────────────────────
const fmtNumber = (n) => new Intl.NumberFormat('pt-BR').format(n || 0);
const fmtDate   = (s) => s ? new Date(s).toLocaleDateString('pt-BR') : '—';

// ── Nomes de rede por chainId ─────────────────────────────────────────────────
const CHAIN_NAMES = {
  1:        'Ethereum',
  56:       'BNB Chain',
  137:      'Polygon',
  42161:    'Arbitrum',
  43114:    'Avalanche',
  10:       'Optimism',
  8453:     'Base',
  97:       'BSC Testnet',
  11155111: 'Sepolia',
};

function _chainName(chainId) {
  return CHAIN_NAMES[Number(chainId)] || `Chain ${chainId}`;
}

// ── Estado local ──────────────────────────────────────────────────────────────
let _allTokens      = [];
let _filteredTokens = [];
let _filter         = 'all';
let _search         = '';

// ── Wallet conectada ──────────────────────────────────────────────────────────
function _getWallet() {
  try {
    return (
      window.walletConnector?.getStatus?.()?.account ||
      window.ethereum?.selectedAddress               ||
      localStorage.getItem('tokencafe_wallet_address') ||
      null
    );
  } catch (_) { return null; }
}

// ── Carregamento ──────────────────────────────────────────────────────────────
async function _loadTokens() {
  _setLoading(true);

  const wallet = _getWallet();
  // Com wallet conectada → filtra por criador; sem wallet → mostra todos (multi-conta)
  _allTokens = wallet ? getTokens(wallet) : getTokens();

  _applyFilters();
  _setLoading(false);

  // Se ainda não tem tokens, pode ser que o usuário criou em outra sessão —
  // mostra CTA para criar o primeiro token.
}

// ── Filtros e busca ───────────────────────────────────────────────────────────
function _applyFilters() {
  let list = [..._allTokens];

  if (_filter !== 'all') {
    list = list.filter(t => {
      if (_filter === 'erc20') return true; // todos os tokens no storage são ERC-20 por ora
      return true;
    });
  }

  if (_search) {
    const s = _search.toLowerCase();
    list = list.filter(t =>
      String(t.name   || '').toLowerCase().includes(s) ||
      String(t.symbol || '').toLowerCase().includes(s) ||
      String(t.address || '').toLowerCase().includes(s),
    );
  }

  _filteredTokens = list;
  _render();
}

// ── Renderização ──────────────────────────────────────────────────────────────
function _render() {
  const grid     = $('tokens-grid');
  const empty    = $('empty-tokens-state');
  const loading  = $('tokens-loading');

  if (!grid) return;

  if (loading) loading.classList.add('d-none');

  if (_filteredTokens.length === 0) {
    grid.style.display = 'none';
    if (empty) empty.classList.remove('d-none');
    return;
  }

  if (empty) empty.classList.add('d-none');
  grid.style.display  = 'grid';
  grid.innerHTML = _filteredTokens.map(_renderCard).join('');
}

function _renderCard(token) {
  const explorerUrl = token.explorerUrl || getExplorerContractUrl(token.address, token.chainId) || '#';
  const short = token.address
    ? `${String(token.address).slice(0, 6)}…${String(token.address).slice(-4)}`
    : '—';

  return `
    <div class="tc-token-card" data-token-address="${token.address}" data-chain-id="${token.chainId}">
      <div class="d-flex align-items-center justify-content-between gap-2">
        <span class="tc-badge-module">ERC-20</span>
        <span class="tc-badge-module tc-status-ok">Ativo</span>
      </div>

      <div class="mt-3">
        <div class="fw-bold text-white">${_esc(token.name)}</div>
        <div class="tc-status-text">${_esc(token.symbol)}</div>
      </div>

      <div class="mt-3 tc-token-stats">
        <div class="tc-token-stat">
          <span class="tc-token-stat-label">Rede</span>
          <span class="tc-token-stat-value">${_chainName(token.chainId)}</span>
        </div>
        <div class="tc-token-stat">
          <span class="tc-token-stat-label">Endereço</span>
          <span class="tc-token-stat-value" title="${token.address}">${short}</span>
        </div>
        <div class="tc-token-stat">
          <span class="tc-token-stat-label">Criado em</span>
          <span class="tc-token-stat-value">${fmtDate(token.savedAt)}</span>
        </div>
      </div>

      <div class="d-flex gap-2 mt-3 flex-wrap">
        <a href="${_esc(explorerUrl)}" target="_blank" rel="noopener"
           class="tc-btn-secondary-ds tc-btn-sm-ds text-decoration-none">
          <i class="bi bi-box-arrow-up-right me-1"></i>Explorer
        </a>
        <button class="tc-btn-test-ds tc-btn-sm-ds tc-action-copy" data-action="copy-address" type="button"
                data-address="${_esc(token.address)}">
          <i class="bi bi-clipboard me-1"></i>Copiar
        </button>
      </div>
    </div>
  `;
}

// Escapa HTML para prevenir XSS nos dados vindos do localStorage
function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Estado de loading ─────────────────────────────────────────────────────────
function _setLoading(on) {
  const loading = $('tokens-loading');
  const grid    = $('tokens-grid');
  if (loading) loading.classList.toggle('d-none', !on);
  if (grid && on) grid.style.display = 'none';
}

// ── Copiar endereço ───────────────────────────────────────────────────────────
async function _copyAddress(address) {
  try {
    await navigator.clipboard.writeText(address);
    window.notify?.('Endereço copiado!', 'success') ||
      window.showFormSuccess?.('Endereço copiado!');
  } catch (_) {
    window.notify?.('Erro ao copiar', 'error');
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
function _bindEvents() {
  // Busca em tempo real
  $('token-search')?.addEventListener('input', (e) => {
    _search = e.target.value.toLowerCase();
    _applyFilters();
  });

  // Filtros
  $$('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      $$('.filter-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      _filter = e.currentTarget.dataset.filter || 'all';
      _applyFilters();
    });
  });

  // Limpar filtros
  $('tm-clear-filters')?.addEventListener('click', () => {
    const search = $('token-search');
    if (search) search.value = '';
    _search = '';
    _filter = 'all';
    $$('.filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
    _applyFilters();
  });

  // Botão Limpar (apaga todos os tokens do storage local desta sessão)
  $('btn-clear-data')?.addEventListener('click', () => {
    if (!confirm('Limpar todos os tokens do registro local? Isso não afeta a blockchain.')) return;
    clearTokens();
    _loadTokens();
  });

  // Ações delegadas no grid (copiar endereço)
  $('tokens-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'copy-address') _copyAddress(btn.dataset.address);
  });

  // Botão "Criar Novo Token" e "Atualizar"
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="tm-create-token"]')) {
      location.href = 'index.php?page=tools';
    }
    if (e.target.closest('[data-action="tm-refresh-tokens"]')) {
      _loadTokens();
    }
  });

  // Recarrega quando um novo token for salvo (pode acontecer em outra aba)
  document.addEventListener('tc:tokens-updated', () => _loadTokens());
}

// ── Inicialização ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _bindEvents();
  _loadTokens();
});
