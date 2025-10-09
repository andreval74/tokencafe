// Runner de Testes - Módulo Link
// Executa checagens de ChainId, chamadas ERC-20 e cenários de erro comuns

function show(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.remove('d-none');
}

function hide(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.classList.add('d-none');
}

function isValidAddress(addr) {
  return typeof addr === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function hexToInt(hex) {
  if (!hex || typeof hex !== 'string') return null;
  try {
    const s = hex.startsWith('0x') ? hex.slice(2) : hex;
    return parseInt(s, 16);
  } catch { return null; }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally { clearTimeout(timer); }
}

async function jsonRpc(url, body, timeoutMs = 7000) {
  try {
    const res = await fetchWithTimeout(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }, timeoutMs);
    if (!res || !res.ok) return null;
    return await res.json().catch(() => null);
  } catch { return null; }
}

async function testChainId(url, expected) {
  const body = { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] };
  const resp = await jsonRpc(url, body, 6000);
  const got = resp && resp.result ? hexToInt(resp.result) : null;
  return { ok: got === expected, got };
}

async function ethGetCode(url, address) {
  const body = { jsonrpc: '2.0', id: 1, method: 'eth_getCode', params: [address, 'latest'] };
  const resp = await jsonRpc(url, body, 6000);
  const code = (resp && typeof resp.result === 'string') ? resp.result : null;
  return code;
}

async function ethCall(url, to, data) {
  const body = { jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to, data }, 'latest'] };
  const resp = await jsonRpc(url, body, 6000);
  return (resp && resp.result) ? resp.result : null;
}

async function testErc20Triple(url, address) {
  if (!isValidAddress(address)) return { ok: false, name: false, symbol: false, decimals: false };
  const selectors = {
    name: '0x06fdde03',
    symbol: '0x95d89b41',
    decimals: '0x313ce567'
  };
  const [n, s, d] = await Promise.all([
    ethCall(url, address, selectors.name),
    ethCall(url, address, selectors.symbol),
    ethCall(url, address, selectors.decimals)
  ]);
  const ok1 = !!n, ok2 = !!s, ok3 = !!d;
  return { ok: (ok1 && ok2 && ok3), name: ok1, symbol: ok2, decimals: ok3 };
}

function addRow({ test, rpc, detail, result, ok }) {
  const tbody = document.querySelector('#resultsTable tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${test}</td>
    <td>
      <div class="small text-muted">${rpc}</div>
      ${detail ? `<div class="small">${detail}</div>` : ''}
    </td>
    <td>${result}</td>
    <td>
      <span class="badge ${ok ? 'bg-success' : 'bg-danger'}">${ok ? 'OK' : 'Erro'}</span>
    </td>
  `;
  tbody.appendChild(tr);
}

function updateSummary(total, passed) {
  const el = document.getElementById('testSummary');
  if (!el) return;
  el.textContent = `Total: ${total} • Passaram: ${passed} • Falharam: ${total - passed}`;
  el.classList.remove('d-none');
}

async function runAllTests() {
  const rows = [];
  let passed = 0;

  const chainTests = [
    { test: 'Ethereum chainId', url: 'https://eth.llamarpc.com', expect: 1 },
    { test: 'Polygon chainId', url: 'https://polygon-rpc.com', expect: 137 },
    { test: 'BNB Smart Chain chainId', url: 'https://bsc-dataseed.binance.org', expect: 56 },
    { test: 'Arbitrum chainId', url: 'https://arb1.arbitrum.io/rpc', expect: 42161 }
  ];

  for (const ct of chainTests) {
    const r = await testChainId(ct.url, ct.expect);
    const ok = !!r.ok;
    if (ok) passed++;
    rows.push({ test: `[ChainId] ${ct.test}`, rpc: ct.url, detail: `Esperado=${ct.expect} • Obtido=${r.got ?? 'n/a'}`, result: r.got ?? 'n/a', ok });
  }

  const erc20Tests = [
    { test: 'ETH USDT', url: 'https://eth.llamarpc.com', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', expectSuccess: true },
    { test: 'Polygon USDC', url: 'https://polygon-rpc.com', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', expectSuccess: true },
    { test: 'Arbitrum WETH', url: 'https://arb1.arbitrum.io/rpc', address: '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', expectSuccess: true },
    { test: 'BSC zero address (EOA)', url: 'https://bsc-dataseed.binance.org', address: '0x0000000000000000000000000000000000000000', expectSuccess: false },
    { test: 'Malformed address', url: 'https://eth.llamarpc.com', address: '0x123', expectSuccess: false }
  ];

  for (const et of erc20Tests) {
    let ok = false;
    let detail = '';
    if (!isValidAddress(et.address)) {
      ok = !et.expectSuccess;
      detail = 'Endereço inválido';
    } else {
      const code = await ethGetCode(et.url, et.address).catch(() => null);
      const isContract = !!code && code !== '0x';
      if (!isContract) {
        ok = !et.expectSuccess;
        detail = 'EOA/Contrato ausente';
      } else {
        const r = await testErc20Triple(et.url, et.address);
        ok = et.expectSuccess ? r.ok : !r.ok;
        detail = `name=${r.name} • symbol=${r.symbol} • decimals=${r.decimals}`;
      }
    }
    if (ok) passed++;
    rows.push({ test: `[ERC20] ${et.test}`, rpc: et.url, detail, result: ok ? 'Sucesso' : 'Falha', ok });
  }

  const mismatch = { test: 'RPC/ChainId mismatch', url: 'https://polygon-rpc.com', expect: 1 }; // errado de propósito
  const mr = await testChainId(mismatch.url, mismatch.expect);
  const mok = !mr.ok; // deve falhar para ser OK aqui
  if (mok) passed++;
  rows.push({ test: `[Preflight] ${mismatch.test}`, rpc: mismatch.url, detail: `Esperado=${mismatch.expect} • Obtido=${mr.got ?? 'n/a'}`, result: mr.ok ? 'Match inesperado' : 'Mismatch detectado', ok: mok });

  // Renderizar
  const tbody = document.querySelector('#resultsTable tbody');
  if (tbody) tbody.innerHTML = '';
  for (const row of rows) addRow(row);
  updateSummary(rows.length, passed);
}

async function clearResults() {
  try { await window.walletConnector?.disconnect(); } catch {}
  const tbody = document.querySelector('#resultsTable tbody');
  if (tbody) tbody.innerHTML = '';
  const el = document.getElementById('testSummary');
  if (el) { el.textContent = ''; el.classList.add('d-none'); }
}

document.addEventListener('DOMContentLoaded', () => {
  const btnRun = document.getElementById('btnRunTests');
  const btnClear = document.getElementById('btnClearResults');
  btnRun?.addEventListener('click', runAllTests);
  btnClear?.addEventListener('click', clearResults);
});