// Runner de Testes - RPC Manager
// Checa saúde do RPC (eth_chainId), blockNumber e net_version, integrando NetworkManager

function show(id) { const el = document.getElementById(id); if (el) el.classList.remove('d-none'); }
function hide(id) { const el = document.getElementById(id); if (el) el.classList.add('d-none'); }

function badge(ok) {
  return `<span class="badge ${ok ? 'bg-success' : 'bg-danger'}">${ok ? 'OK' : 'Erro'}</span>`;
}

function addRow({ test, rpc, detail, result, ok }) {
  const tbody = document.querySelector('#resultsTable tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${test}</td>
    <td>
      <div class="small text-muted">${rpc || '-'}</div>
      ${detail ? `<div class="small">${detail}</div>` : ''}
    </td>
    <td class="ps-3">${result ?? '-'}</td>
    <td class="text-end">${badge(!!ok)}</td>
  `;
  tbody.appendChild(tr);
}

function updateSummary(total, passed) {
  const el = document.getElementById('testSummary');
  if (!el) return;
  el.textContent = `Total: ${total} • Passaram: ${passed} • Falharam: ${total - passed}`;
  el.classList.remove('d-none');
}

function hexToInt(hex) {
  try { return parseInt(hex, 16); } catch { return NaN; }
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

async function testHealth(url, expectChainId) {
  const t0 = performance.now();
  const body = { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] };
  const resp = await jsonRpc(url, body, 6000);
  const t1 = performance.now();
  const gotHex = resp?.result;
  const got = typeof gotHex === 'string' ? hexToInt(gotHex) : null;
  const ok = expectChainId ? (String(got) === String(expectChainId)) : !!got;
  return { ok, latencyMs: Math.round(t1 - t0), got };
}

async function testBlockNumber(url) {
  const body = { jsonrpc: '2.0', id: 2, method: 'eth_blockNumber', params: [] };
  const resp = await jsonRpc(url, body, 6000);
  const gotHex = resp?.result;
  const got = typeof gotHex === 'string' ? hexToInt(gotHex) : null;
  const ok = Number.isFinite(got) && got > 0;
  return { ok, got };
}

async function testNetVersion(url) {
  const body = { jsonrpc: '2.0', id: 3, method: 'net_version', params: [] };
  const resp = await jsonRpc(url, body, 6000);
  const got = resp?.result;
  const ok = !!got && String(got).length > 0;
  return { ok, got };
}

function getFallbackRpcs(chainId) {
  switch (Number(chainId)) {
    case 1: return ['https://eth.llamarpc.com'];
    case 56: return ['https://bsc-dataseed.binance.org'];
    case 137: return ['https://polygon-rpc.com'];
    case 42161: return ['https://arb1.arbitrum.io/rpc'];
    default: return [];
  }
}

async function resolveRpcsForCurrentNetwork() {
  try {
    const wc = window.walletConnector;
    const nm = window.networkManager || window.networks || window.NetworkManager || null;
    let chainIdDec = null;
    let rpcs = [];

    if (wc && wc.getStatus) {
      const st = wc.getStatus();
      if (st?.network?.chainId) {
        chainIdDec = Number(st.network.chainId);
        rpcs = Array.isArray(st.network.rpc) ? st.network.rpc.filter(u => typeof u === 'string') : [];
      } else if (typeof st?.chainId === 'string') {
        chainIdDec = parseInt(st.chainId, 16);
      }
    }

    if (!rpcs.length && nm && nm.getNetworkById) {
      const net = await nm.getNetworkById(chainIdDec || 1).catch(() => null);
      if (net && Array.isArray(net.rpc)) rpcs = net.rpc.filter(u => typeof u === 'string');
    }

    if (!rpcs.length && chainIdDec) rpcs = getFallbackRpcs(chainIdDec);
    if (!rpcs.length) rpcs = ['https://eth.llamarpc.com', 'https://polygon-rpc.com', 'https://bsc-dataseed.binance.org'];

    return { rpcs: Array.from(new Set(rpcs)).slice(0, 5), chainIdDec: chainIdDec || null };
  } catch {
    return { rpcs: ['https://eth.llamarpc.com'], chainIdDec: 1 };
  }
}

function setLoading(loading) {
  const btnRun = document.getElementById('btnRunTests');
  const btnClear = document.getElementById('btnClearResults');
  const loader = document.getElementById('loadingIndicator');
  if (loader) loader.classList.toggle('d-none', !loading);
  if (btnRun) {
    btnRun.disabled = loading;
    btnRun.innerHTML = loading ? '<i class="fas fa-spinner fa-spin me-1"></i>Executando...' : '<i class="bi bi-play"></i> Executar Testes';
  }
  if (btnClear) btnClear.disabled = loading;
}

async function ensureConnection() {
  const wc = window.walletConnector;
  if (!wc || typeof wc.connect !== 'function' || typeof wc.getStatus !== 'function') return null;
  const status = wc.getStatus();
  if (status?.isConnected && status?.account) return status;
  try {
    await wc.connect('metamask'); // força popup/metamask
  } catch (e) {
    // Falha na conexão — ainda assim retornar status para fallback
  }
  return wc.getStatus();
}

async function runAllTests() {
  const tbody = document.querySelector('#resultsTable tbody');
  if (tbody) tbody.innerHTML = '';
  hide('testSummary');
  setLoading(true);
  let rows = []; let passed = 0;

  // Garantir conexão (popup se necessário) e usar SEMPRE a rede conectada
  const st = await ensureConnection();
  let chainIdDec = null;
  if (st?.chainId && typeof st.chainId === 'string') {
    chainIdDec = parseInt(st.chainId, 16);
  } else if (st?.network?.chainId) {
    chainIdDec = Number(st.network.chainId);
  }

  // Resolver RPCs exclusivamente da rede conectada
  const nm = window.networkManager;
  let rpcs = [];
  if (st?.network?.rpc && Array.isArray(st.network.rpc)) {
    rpcs = st.network.rpc.filter(u => typeof u === 'string');
  }
  if ((!rpcs.length) && nm && typeof nm.getNetworkById === 'function' && chainIdDec) {
    const net = await nm.getNetworkById(chainIdDec).catch(() => null);
    if (net && Array.isArray(net.rpc)) rpcs = net.rpc.filter(u => typeof u === 'string');
  }
  if (!rpcs.length && chainIdDec) rpcs = getFallbackRpcs(chainIdDec);

  // Se ainda não houver RPCs ou não houver chainId, abortar com mensagem
  if (!rpcs.length || !chainIdDec) {
    addRow({ test: 'Inicialização', rpc: '-', detail: 'Carteira não conectada ou rede sem RPCs', result: 'Abortado', ok: false });
    updateSummary(1, 0);
    setLoading(false);
    return;
  }

  for (const url of rpcs) {
    // Health
    const h = await testHealth(url, chainIdDec);
    const hRow = { test: '[Health] eth_chainId', rpc: url, detail: `Esperado=${chainIdDec} • Obtido=${h.got ?? 'n/a'} • Latência=${h.latencyMs}ms`, result: h.got ?? 'n/a', ok: h.ok };
    if (h.ok) passed++; rows.push(hRow);

    // BlockNumber
    const b = await testBlockNumber(url);
    const bRow = { test: '[Block] eth_blockNumber', rpc: url, detail: `Obtido=${b.got ?? 'n/a'}`, result: b.got ?? 'n/a', ok: b.ok };
    if (b.ok) passed++; rows.push(bRow);

    // net_version
    const n = await testNetVersion(url);
    const nRow = { test: '[Net] net_version', rpc: url, detail: `Obtido=${n.got ?? 'n/a'}`, result: n.got ?? 'n/a', ok: n.ok };
    if (n.ok) passed++; rows.push(nRow);
  }

  for (const row of rows) addRow(row);
  updateSummary(rows.length, passed);
  setLoading(false);
}

async function clearResults() {
  const tbody = document.querySelector('#resultsTable tbody');
  if (tbody) tbody.innerHTML = '';
  const el = document.getElementById('testSummary');
  if (el) { el.textContent = ''; el.classList.add('d-none'); }
  // Sempre desconectar ao limpar
  try {
    if (window.walletConnector && typeof window.walletConnector.disconnect === 'function') {
      await window.walletConnector.disconnect();
    }
  } catch {}
}

async function optionalDisconnect() {
  try {
    if (window.walletConnector && typeof window.walletConnector.disconnect === 'function') {
      await window.walletConnector.disconnect();
    }
  } catch {}
  clearResults();
}

document.addEventListener('DOMContentLoaded', () => {
  const btnRun = document.getElementById('btnRunTests');
  const btnClear = document.getElementById('btnClearResults');
  btnRun?.addEventListener('click', runAllTests);
  btnClear?.addEventListener('click', clearResults);
});