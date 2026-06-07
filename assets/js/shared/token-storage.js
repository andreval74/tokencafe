/**
 * token-storage.js — Registro persistente de tokens criados via TokenCafe.
 *
 * Responsabilidades:
 *  1. Escutar 'contract:found' (builder.js server path) e 'contract:verified'
 *     (builder.js client path) para salvar automaticamente ao criar um token.
 *  2. Enriquecer o registro com name() on-chain quando o factory não expõe o nome.
 *  3. Expor saveToken(), getTokens() e clearTokens() como ES module + window.tcTokenStorage.
 *
 * Carregado em todas as páginas via footer.php.
 */

const STORAGE_KEY   = 'tc_tokens_v1';

// ABI mínima para ler metadados básicos de qualquer ERC-20
const ERC20_MIN_ABI = [
  'function name()   view returns (string)',
  'function symbol() view returns (string)',
];

// ── Helpers de persistência ───────────────────────────────────────────────────

function _load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch (_) { return []; }
}

function _persist(tokens) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens)); }
  catch (_) {}
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Salva ou atualiza um token no registro local.
 * Deduplica por (address + chainId) — nunca cria duplicatas.
 *
 * @param {{ address, chainId, name?, symbol?, txHash?, explorerUrl?, createdBy? }} data
 */
export function saveToken({ address, chainId, name, symbol, txHash, explorerUrl, createdBy }) {
  if (!address || !chainId) return;

  const tokens = _load();
  const key    = `${String(address).toLowerCase()}_${Number(chainId)}`;
  const idx    = tokens.findIndex(
    t => `${String(t.address).toLowerCase()}_${Number(t.chainId)}` === key,
  );

  const entry = {
    address,
    chainId:     Number(chainId),
    name:        name   || symbol || 'Token',
    symbol:      symbol || '???',
    txHash:      txHash      || null,
    explorerUrl: explorerUrl || null,
    createdBy:   createdBy   || null,
    savedAt:     idx >= 0 ? tokens[idx].savedAt : new Date().toISOString(),
    updatedAt:   new Date().toISOString(),
  };

  if (idx >= 0) tokens[idx] = entry;
  else          tokens.unshift(entry); // mais recentes primeiro

  _persist(tokens);

  // Notifica outros módulos na mesma página (ex: token-manager.js se aberto)
  document.dispatchEvent(new CustomEvent('tc:tokens-updated', {
    detail: { count: tokens.length, latest: entry },
  }));
}

/**
 * Retorna todos os tokens do registro, ou filtrados pela wallet criadora.
 * @param {string|null} wallet — endereço EVM ou null para todos
 * @returns {Array}
 */
export function getTokens(wallet = null) {
  const tokens = _load();
  if (!wallet) return tokens;
  const w = String(wallet).toLowerCase();
  return tokens.filter(
    t => t.createdBy && String(t.createdBy).toLowerCase() === w,
  );
}

/** Apaga todos os tokens do registro local. */
export function clearTokens() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
}

// ── Enriquecimento on-chain ───────────────────────────────────────────────────

/**
 * Lê name() e symbol() do contrato e atualiza o registro em background.
 * Só roda quando o nome ainda é genérico ('Token' ou '???').
 */
async function _enrichFromChain(address, chainId) {
  if (!window.ethers || !window.ethereum) return;

  const tokens = _load();
  const key    = `${String(address).toLowerCase()}_${Number(chainId)}`;
  const entry  = tokens.find(
    t => `${String(t.address).toLowerCase()}_${Number(t.chainId)}` === key,
  );

  // Só enriquece se o nome ainda está genérico
  if (!entry || (entry.name !== 'Token' && entry.name !== entry.symbol)) return;

  try {
    const provider = new window.ethers.providers.Web3Provider(window.ethereum);
    const contract = new window.ethers.Contract(address, ERC20_MIN_ABI, provider);

    const [name, symbol] = await Promise.race([
      Promise.all([contract.name(), contract.symbol()]),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ]);

    if (name) saveToken({ address, chainId, name, symbol: symbol || entry.symbol });
  } catch (_) {}
}

// ── Helper de wallet conectada ────────────────────────────────────────────────

function _getConnectedWallet() {
  try {
    return (
      window.walletConnector?.getStatus?.()?.account ||
      window.ethereum?.selectedAddress ||
      localStorage.getItem('tokencafe_wallet_address') ||
      null
    );
  } catch (_) { return null; }
}

// ── Listeners automáticos do builder.js ──────────────────────────────────────

function _handleContractEvent(e) {
  // Suporta tanto contract:found (server path) quanto contract:verified (client path)
  const c = e?.detail?.contract || e?.detail;
  if (!c) return;

  const address = c.address || c.contractAddress;
  const chainId = c.chainId;
  if (!address || !chainId) return;

  saveToken({
    address,
    chainId,
    name:        c.tokenName   || c.name   || null,
    symbol:      c.tokenSymbol || c.symbol || null,
    txHash:      c.txHash      || c.transactionHash || null,
    explorerUrl: c.link        || c.explorerUrl     || null,
    createdBy:   _getConnectedWallet(),
  });

  // Enriquece on-chain em background sem bloquear o fluxo de deploy
  _enrichFromChain(address, chainId).catch(() => {});
}

// builder.js server path — tem tokenSymbol
document.addEventListener('contract:found',    _handleContractEvent);
// builder.js client path — tem address + chainId
document.addEventListener('contract:verified', _handleContractEvent);

// ── Exposição global ──────────────────────────────────────────────────────────

window.tcTokenStorage = { saveToken, getTokens, clearTokens };
