// TOKENCAFE - WIDGET TESTE (módulo)
// Refatoração da lógica inline de pages/modules/widget/widget-teste.html
// Segue diretriz: sem scripts inline; inicialização via PageManager

import PageManager from '../../shared/page-manager.js';
import WidgetGenerator from './widget-generator.js';

// Shorthand DOM helpers via base-system (se disponíveis)
const $ = (sel) => document.getElementById(sel);

// Estado interno
let rpcProvider = null;
let web3Provider = null;
let signer = null;
let tokenAbi = null;
let saleAbi = null;
// Manual override para RPC selecionada pelo usuário via busca
window.widgetRpcOverride = window.widgetRpcOverride || null;
// Cache de metadados por endereço de token (mantém símbolo/nome/decimais estáveis)
window.widgetInlineMetaCache = window.widgetInlineMetaCache || {};

// Utilitários de debug/log mais verbosos
function shortAddr(a) {
  try { if (!a || typeof a !== 'string') return String(a || ''); return a.slice(0, 6) + '…' + a.slice(-4); } catch { return String(a || ''); }
}
function debugJSON(label, obj) {
  try { addDebug(`${label}: ${JSON.stringify(obj, null, 2)}`); } catch (_) { addDebug(`${label}: [unstringifiable]`); }
}

// Fallbacks mínimos para redes populares (RPCs confiáveis)
function getFallbackRpc(chainId) {
  switch (Number(chainId)) {
    case 56: return 'https://bsc-dataseed.binance.org';
    case 97: return 'https://bsc-testnet.publicnode.com'; // RPC confiável para BSC Testnet
    case 1: return 'https://eth.llamarpc.com';
    case 137: return 'https://polygon-rpc.com';
    case 80001: return 'https://rpc-mumbai.maticvigil.com';
    default: return '';
  }
}
function getFallbackExplorer(chainId) {
  switch (Number(chainId)) {
    case 56: return 'https://bscscan.com';
    case 97: return 'https://testnet.bscscan.com';
    case 1: return 'https://etherscan.io';
    case 137: return 'https://polygonscan.com';
    default: return '';
  }
}

// Utilidades de log
function addDebug(msg) {
  const area = $('debugArea');
  const now = new Date().toLocaleTimeString();
  if (area) {
    area.value += `[${now}] ${msg}\n`;
    area.scrollTop = area.scrollHeight;
  }
  try { console.log(`[${now}] WidgetTeste:`, msg); } catch (_) { }
}
function log(msg) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] WidgetTeste: ${msg}`);
  } catch { }
  const el = $('log'); if (el) { el.textContent += (el.textContent ? "\n" : "") + msg; el.scrollTop = el.scrollHeight; }
}

function toast(msg, type = 'info') {
  // Suprimir avisos informativos e de sucesso para manter a UI compacta
  if (type === 'info' || type === 'success') return;
  if (typeof window.showToast === 'function') window.showToast(msg, type);
  else console.log(`[${type}] ${msg}`);
}
function refreshBuyerBalanceStatus() {
  const el = $('buyerBalanceStatus');
  if (!el) return;
  try {
    el.className = el.className.replace(/text-(?:success|danger)/g, '').trim();
    const balEl = $('buyerBalance');
    const ok = balEl && balEl.value && balEl.value.trim() !== '';
    el.classList.add(ok ? 'text-success' : 'text-danger');
    el.innerText = ok ? 'OK' : 'Vazio';
  } catch { }
}

function applySequencer() {
  const steps = [
    $('testRPCBtn'),
    $('loadAbisBtn'),
    $('checkSaleBtn'),
    $('sendTestTokensBtn'),
    $('executeBuyBtn'),
    $('simulateBuyBtn')
  ];
  steps.forEach((s) => { if (s) s.classList.add('disabled'); });
  const rpcEl = $('rpcUrl');
  const hasRpc = rpcEl && rpcEl.value;
  if (hasRpc) { const el = $('testRPCBtn'); if (el) el.classList.remove('disabled'); }
  const tokAbiEl = $('tokenAbiText');
  const saleAbiEl = $('saleAbiText');
  const hasAbis = tokAbiEl && tokAbiEl.value && saleAbiEl && saleAbiEl.value;
  if (hasAbis) { const el = $('loadAbisBtn'); if (el) el.classList.remove('disabled'); }
}

// NOVO: aplicar RPC a partir do sistema global (walletConnector/networkManager)
function applyRpcFromSystem() {
  try {
    let rpcUrl = '';

    // Respeitar override manual do usuário (seleção via busca)
    if (window.widgetRpcOverride && window.widgetRpcOverride.rpcUrl) {
      rpcUrl = window.widgetRpcOverride.rpcUrl;
    } else {
      if (window.walletConnector && typeof window.walletConnector.getStatus === 'function') {
        const status = window.walletConnector.getStatus();
        rpcUrl = (status?.network?.rpc && status.network.rpc[0]) ? status.network.rpc[0] : '';
        if (!rpcUrl && status?.chainId) {
          const decId = parseInt(status.chainId, 16);
          const net = window.networkManager && typeof window.networkManager.getNetworkById === 'function'
            ? window.networkManager.getNetworkById(decId)
            : null;
          rpcUrl = net?.rpc?.[0] || '';
          if (!rpcUrl) rpcUrl = getFallbackRpc(decId);
        }
      }
      if (!rpcUrl) {
        rpcUrl = 'https://bsc-testnet.publicnode.com';
      }
    }

    // Sanitiza RPC antes de aplicar
    rpcUrl = sanitizeRpcUrl(rpcUrl);

    const hidden = $('rpcUrl'); if (hidden) hidden.value = rpcUrl;
    const codeEl = $('rpcUrlCode'); if (codeEl) codeEl.textContent = rpcUrl;
    const textEl = $('rpcUrlText'); if (textEl) textEl.href = rpcUrl;

    try { rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl); } catch (e) { addDebug('Falha ao instanciar JsonRpcProvider: ' + e.message); }

    log(`🔗 RPC aplicada: ${rpcUrl}`);
    applySequencer();
  } catch (e) {
    addDebug('Falha ao aplicar RPC do sistema: ' + e.message);
  }
}

function advanceToNextStep(currentBtnId) {
  const nextMap = { runChecksBtn: 'checkBalance', checkBalance: 'sendTokens', sendTokens: 'simulateBuy', simulateBuy: 'executeBuy' };
  const nextId = nextMap[currentBtnId];
  if (!nextId) return;
  const nextBtn = $(nextId);
  if (nextBtn) {
    nextBtn.disabled = false;
    try { nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) { }
  }
}

async function loadAbis() {
  try {
    const tokEl = $('tokenAbiText');
    const saleEl = $('saleAbiText');

    // Tentativa automática de obter ABI por endereço quando campos estão vazios
    // 1) Sourcify (full/partial match)
    // 2) Explorers Etherscan-like (se API key estiver configurada)
    // 3) Fallback para ABIs mínimas (ERC-20 e buy())
    const tryAutoFetch = async () => {
      const addrToken = (document.getElementById('tokenContract')?.value || '').trim();
      const addrSale = (document.getElementById('saleContract')?.value || '').trim();
      const prov = signer?.provider || provider || rpcProvider || web3Provider;
      let chainId = 97;
      try { chainId = (await (prov || new ethers.providers.StaticJsonRpcProvider('https://bsc-testnet.publicnode.com')).getNetwork()).chainId; } catch (_) {}

      const cache = window.widgetAbiCache || (window.widgetAbiCache = {});

      async function fetchFromSourcify(address) {
        if (!address || !ethers.utils.isAddress(address)) return null;
        const base = 'https://repo.sourcify.dev/contracts';
        const urls = [
          `${base}/full_match/${chainId}/${address}/metadata.json`,
          `${base}/partial_match/${chainId}/${address}/metadata.json`
        ];
        for (const u of urls) {
          try {
            const r = await fetch(u, { cache: 'no-store' });
            if (!r.ok) continue;
            const meta = await r.json();
            const abi = meta?.output?.abi || meta?.abi || null;
            if (Array.isArray(abi) && abi.length) return abi;
          } catch (_) {}
        }
        return null;
      }

      function getExplorerEndpoint(chainId) {
        // Mapeamento básico; expandir conforme necessário
        switch (chainId) {
          case 1: return { url: 'https://api.etherscan.io/api', keyName: 'etherscan' };
          case 56: return { url: 'https://api.bscscan.com/api', keyName: 'bscscan' };
          case 97: return { url: 'https://api-testnet.bscscan.com/api', keyName: 'bscscan' };
          case 137: return { url: 'https://api.polygonscan.com/api', keyName: 'polygonscan' };
          default: return null;
        }
      }

      async function fetchFromExplorer(address) {
        const ep = getExplorerEndpoint(chainId);
        if (!ep || !address || !ethers.utils.isAddress(address)) return null;
        // Chave pode vir de window.EXPLORER_API_KEYS ou localStorage
        let apiKey = null;
        try {
          apiKey = window.EXPLORER_API_KEYS?.[ep.keyName] || JSON.parse(localStorage.getItem('EXPLORER_API_KEYS') || '{}')[ep.keyName] || null;
        } catch (_) {}
        if (!apiKey) { log('ℹ️ Explorer API key não configurada; pulando fetch ABI de explorer.'); return null; }
        const url = `${ep.url}?module=contract&action=getabi&address=${address}&apikey=${apiKey}`;
        try {
          const r = await fetch(url, { cache: 'no-store' });
          const j = await r.json();
          if (String(j?.status) === '1' && j?.result) {
            const parsed = JSON.parse(j.result);
            if (Array.isArray(parsed)) return parsed;
          }
        } catch (_) {}
        return null;
      }

      async function ensureAbiFor(address, kind) {
        if (!address || !ethers.utils.isAddress(address)) return null;
        const key = `${chainId}:${address.toLowerCase()}`;
        if (cache[key]) return cache[key];
        let abi = await fetchFromSourcify(address);
        if (!abi) abi = await fetchFromExplorer(address);
        if (abi) { cache[key] = abi; log(`✅ ABI ${kind} carregada automaticamente (${abi.length} itens)`); return abi; }
        log(`⚠️ ABI ${kind} não encontrada em fontes públicas; usando defaults.`);
        return null;
      }

      if (tokEl && !tokEl.value.trim() && addrToken) {
        const abiTokenAuto = await ensureAbiFor(addrToken, 'Token');
        if (abiTokenAuto) tokEl.value = JSON.stringify(abiTokenAuto, null, 2);
      }
      if (saleEl && !saleEl.value.trim() && addrSale) {
        const abiSaleAuto = await ensureAbiFor(addrSale, 'Sale');
        if (abiSaleAuto) saleEl.value = JSON.stringify(abiSaleAuto, null, 2);
      }
    };

    // Executa fetch automático se necessário antes de parsear
    if ((tokEl && !tokEl.value.trim()) || (saleEl && !saleEl.value.trim())) {
      // set defaults primeiro para evitar campos vazios caso fetch falhe
      setDefaultAbisIfEmpty();
      try { await tryAutoFetch(); } catch (_) {}
    }

    tokenAbi = JSON.parse(tokEl ? (tokEl.value || '[]') : '[]');
    saleAbi = JSON.parse(saleEl ? (saleEl.value || '[]') : '[]');
    log(`✅ ABIs carregadas: token=${(tokenAbi && tokenAbi.length) || 0}, sale=${(saleAbi && saleAbi.length) || 0}`);
    const el = $('checkSaleBtn'); if (el) el.classList.remove('disabled');
    const stRun = $('status-runChecksBtn'); if (stRun) { stRun.textContent = 'Pronto'; stRun.className = 'step-status ready mt-1'; }
    advanceToNextStep('runChecksBtn');
    try { await validateWidgetConfig(); } catch (_) { }
  } catch (e) {
    log('❌ ABI inválida: ' + e.message);
  }
}

function sanitizeRpcUrl(raw) {
  try {
    let url = String(raw || '').trim();
    // Remove aspas, crases e espaços estranhos
    url = url.replace(/^['"`]+|['"`]+$/g, '');
    url = url.replace(/\s+/g, '');
    // Remover crases internas ocasionais
    url = url.replace(/`/g, '');
    return url;
  } catch {
    return String(raw || '').trim();
  }
}

async function testRPC() {
  let rpcUrl = '';
  const rpcEl = $('rpcUrl');
  if (rpcEl && rpcEl.value) rpcUrl = sanitizeRpcUrl(rpcEl.value);
  if (!rpcUrl) {
    if (window.widgetRpcOverride?.rpcUrl) {
      rpcUrl = sanitizeRpcUrl(window.widgetRpcOverride.rpcUrl);
    } else if (window.walletConnector && typeof window.walletConnector.getStatus === 'function') {
      const st = window.walletConnector.getStatus();
      rpcUrl = sanitizeRpcUrl(st?.network?.rpc?.[0] || '');
      if (!rpcUrl && st?.chainId) rpcUrl = getFallbackRpc(parseInt(st.chainId, 16));
    }
    if (!rpcUrl && window.networkManager?.getPopularNetworks) {
      const popular = window.networkManager.getPopularNetworks(1);
      rpcUrl = sanitizeRpcUrl(popular?.[0]?.rpc?.[0] || getFallbackRpc(popular?.[0]?.chainId));
    }
  }
  if (!rpcUrl) {
    log('❌ Informe uma RPC válida.');
    try { console.error('WidgetTeste: RPC inválida', { rpcElExists: !!rpcEl, override: window.widgetRpcOverride, status: window.walletConnector?.getStatus?.() }); } catch (_) { }
    return;
  }
  try {
    rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const net = await rpcProvider.getNetwork();
    log(`✅ RPC OK: chainId=${net.chainId}`);
    const hidden = $('rpcUrl'); if (hidden) hidden.value = rpcUrl;
    const codeEl = $('rpcUrlCode'); if (codeEl) codeEl.textContent = rpcUrl;
    const textEl = $('rpcUrlText'); if (textEl) textEl.href = rpcUrl;
  } catch (e) {
    addDebug('Falha na RPC principal: ' + e.message);
    // Fallback automático para BSC Testnet
    const fallbackUrl = 'https://bsc-testnet.publicnode.com';
    try {
      rpcProvider = new ethers.providers.JsonRpcProvider(fallbackUrl);
      const net = await rpcProvider.getNetwork();
      log(`⚠️ RPC inválida, aplicando fallback: chainId=${net.chainId}`);
      const hidden = $('rpcUrl'); if (hidden) hidden.value = fallbackUrl;
      const codeEl = $('rpcUrlCode'); if (codeEl) codeEl.textContent = fallbackUrl;
      const textEl = $('rpcUrlText'); if (textEl) textEl.href = fallbackUrl;
    } catch (e2) {
      log(`❌ Falha na RPC: ${e.message}`);
      try { console.error('WidgetTeste: Falha ao validar RPC', { rpcUrl, error: e, fallbackError: e2 }); } catch (_) { }
    }
  }
}

// Helpers UI para verificação de saldos
function setBalanceLoading(visible) {
  const btn = document.getElementById('checkBalance');
  const loading = document.getElementById('balanceLoading');
  if (btn) { btn.disabled = !!visible; btn.setAttribute('aria-busy', visible ? 'true' : 'false'); }
  if (loading) { loading.classList.toggle('d-none', !visible); }
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout após ${ms}ms${label ? ` (${label})` : ''}`));
    }, ms);
    promise.then(v => { clearTimeout(timer); resolve(v); })
      .catch(e => { clearTimeout(timer); reject(e); });
  });
}

function renderBalanceSummary(summary) {
  const sumEl = document.getElementById('balanceSummary');
  if (!sumEl || !summary) return;
  const mkRow = (title, obj) => `
    <div class="mb-2">
      <div class="fw-bold mb-1">${title}</div>
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <span class="badge bg-secondary">Token</span>
        <span>${(obj.token ?? 'N/A')}${obj.tokenNote ? ` ${obj.tokenNote}` : ''}</span>
        <span class="badge bg-warning text-dark">BNB</span>
        <span>${obj.bnb}</span>
      </div>
    </div>`;
  sumEl.innerHTML = `
    <div>
      ${mkRow('Contrato do Token', summary.tokenContract)}
      ${mkRow('Sale', summary.sale)}
      ${mkRow('Comprador', summary.buyer)}
      ${mkRow('Recebedor', summary.receiver)}
    </div>
  `;
}

async function checkSaleBalance() {
  try {
    setBalanceLoading(true);
    log('— Verificando saldos —');

    const rpcInput = (document.getElementById('rpcUrl')?.value || '').trim();
    const rpcUrl = (typeof sanitizeRpcUrl === 'function') ? sanitizeRpcUrl(rpcInput) : rpcInput;

    let prov = null;
    try {
      if (typeof rpcProvider !== 'undefined' && rpcProvider) prov = rpcProvider;
      else if (typeof web3Provider !== 'undefined' && web3Provider) prov = web3Provider;
      else if (typeof signer !== 'undefined' && signer && signer.provider) prov = signer.provider;
      else if (typeof provider !== 'undefined' && provider) prov = provider;
    } catch (_e) { }

    if (!prov) {
      let candidateUrl = rpcUrl;
      if (!candidateUrl) {
        const overrideUrl = (window.widgetRpcOverride && window.widgetRpcOverride.rpcUrl) || '';
        const status = (window.walletConnector && window.walletConnector.getStatus) ? window.walletConnector.getStatus() : null;
        const statusRpc = status && status.network && Array.isArray(status.network.rpc) ? status.network.rpc[0] : '';
        candidateUrl = sanitizeRpcUrl ? sanitizeRpcUrl(overrideUrl || statusRpc || '') : (overrideUrl || statusRpc || '');
      }
      if (candidateUrl) {
        try { prov = new ethers.providers.JsonRpcProvider(candidateUrl); }
        catch (e) { addDebug('ProvInitError', e); }
      }
    }

    const fallbackProv = new ethers.providers.StaticJsonRpcProvider('https://bsc-testnet.publicnode.com', { chainId: 97, name: 'bsc-testnet' });
    if (!prov) {
      prov = fallbackProv;
      log('⚠️ RPC inválida ou indisponível, usando fallback BSC Testnet (97).');
    }

    const tokenAddr = (document.getElementById('tokenContract')?.value || '').trim();
    const saleAddr = (document.getElementById('saleContract')?.value || '').trim();
    const buyerAddr = (document.getElementById('buyerWallet')?.value || '').trim();
    const receiverAddr = (document.getElementById('receiverWallet')?.value || '').trim();

    const getNativeBalance = async (addr, label) => {
      try { return await withTimeout(prov.getBalance(addr), 5000, `${label}.getBalance`); }
      catch (e) {
        addDebug(`${label}NativeTimeout`, e.message);
        try { log('⚠️ Timeout/erro na RPC, lendo nativo via fallback...'); return await withTimeout(fallbackProv.getBalance(addr), 5000, `${label}.getBalance(fallback)`); }
        catch (e2) { addDebug(`${label}NativeFallbackError`, e2.message); return ethers.BigNumber.from(0); }
      }
    };

    // Verificação de código do contrato nas duas RPCs (primária e fallback)
    let primaryCode = '0x', fallbackCode = '0x';
    try { primaryCode = await withTimeout(prov.getCode(tokenAddr), 5000, 'getCode(primary)'); }
    catch (e) { addDebug('TokenCodePrimaryTimeout', e.message); }
    try { fallbackCode = await withTimeout(fallbackProv.getCode(tokenAddr), 5000, 'getCode(fallback)'); }
    catch (e) { addDebug('TokenCodeFallbackTimeout', e.message); }
    addDebug('TokenCodePrimary', primaryCode);
    addDebug('TokenCodeFallback', fallbackCode);

    const primaryOk = primaryCode !== '0x';
    const fallbackOk = fallbackCode !== '0x';

    let tokenBalances = { sale: null, buyer: null, receiver: null, tokenContract: null, decimals: 18, flags: { saleFallback: false, buyerFallback: false, receiverFallback: false, tokenContractFallback: false, decimalsFallback: false } };

    if ((primaryOk || fallbackOk) && Array.isArray(tokenAbi) && tokenAbi.length) {
      try {
        const tokenPrimary = primaryOk ? new ethers.Contract(tokenAddr, tokenAbi, prov) : null;
        const tokenFallback = fallbackOk ? new ethers.Contract(tokenAddr, tokenAbi, fallbackProv) : null;

        let decimals = 18;
        if (tokenPrimary) {
          decimals = await withTimeout(tokenPrimary.decimals(), 5000, 'token.decimals(primary)')
            .catch(async e => {
              addDebug('TokenDecimalsPrimaryError', e.message);
              if (tokenFallback) {
                try { tokenBalances.flags.decimalsFallback = true; return await withTimeout(tokenFallback.decimals(), 5000, 'token.decimals(fallback)'); }
                catch (e2) { addDebug('TokenDecimalsFallbackError', e2.message); return 18; }
              }
              return 18;
            });
        } else if (tokenFallback) {
          tokenBalances.flags.decimalsFallback = true;
          decimals = await withTimeout(tokenFallback.decimals(), 5000, 'token.decimals(fallback)').catch(e => { addDebug('TokenDecimalsFallbackError', e.message); return 18; });
        }

        const readBal = async (addr, label) => {
          if (tokenPrimary) {
            try { return await withTimeout(tokenPrimary.balanceOf(addr), 5000, `token.balanceOf(${label},primary)`); }
            catch (e) { addDebug(`${label}TokenPrimaryError`, e.message); }
          }
          if (tokenFallback) {
            try { tokenBalances.flags[`${label}Fallback`] = true; return await withTimeout(tokenFallback.balanceOf(addr), 5000, `token.balanceOf(${label},fallback)`); }
            catch (e2) { addDebug(`${label}TokenFallbackError`, e2.message); return null; }
          }
          return null;
        };

        const [saleBal, buyerBal, receiverBal, tokenContractBal] = await Promise.all([
          readBal(saleAddr, 'sale'),
          readBal(buyerAddr, 'buyer'),
          readBal(receiverAddr, 'receiver'),
          readBal(tokenAddr, 'tokenContract')
        ]);

        tokenBalances = { decimals, sale: saleBal, buyer: buyerBal, receiver: receiverBal, tokenContract: tokenContractBal, flags: tokenBalances.flags };
      } catch (err) { addDebug('TokenReadError', err); }
    } else {
      log('⚠️ Código do contrato Token não encontrado em nenhuma RPC. Exibindo apenas saldos nativos.');
    }

    const [tokenContractNative, saleNative, buyerNative, receiverNative] = await Promise.all([
      getNativeBalance(tokenAddr, 'TokenContract'),
      getNativeBalance(saleAddr, 'Sale'),
      getNativeBalance(buyerAddr, 'Buyer'),
      getNativeBalance(receiverAddr, 'Receiver')
    ]);

    const fmtNative = v => ethers.utils.formatEther(v || ethers.BigNumber.from(0));
    const fmtToken = (v, d) => v ? ethers.utils.formatUnits(v, d || 18) : null;
    const summary = {
      tokenContract: { token: fmtToken(tokenBalances.tokenContract, tokenBalances.decimals) ?? 'N/A', bnb: fmtNative(tokenContractNative), tokenNote: tokenBalances.flags.tokenContractFallback ? '(fallback)' : '' },
      sale: { token: fmtToken(tokenBalances.sale, tokenBalances.decimals) ?? 'N/A', bnb: fmtNative(saleNative), tokenNote: tokenBalances.flags.saleFallback ? '(fallback)' : '' },
      buyer: { token: fmtToken(tokenBalances.buyer, tokenBalances.decimals) ?? 'N/A', bnb: fmtNative(buyerNative), tokenNote: tokenBalances.flags.buyerFallback ? '(fallback)' : '' },
      receiver: { token: fmtToken(tokenBalances.receiver, tokenBalances.decimals) ?? 'N/A', bnb: fmtNative(receiverNative), tokenNote: tokenBalances.flags.receiverFallback ? '(fallback)' : '' }
    };

    renderBalanceSummary(summary);

    if (tokenBalances.tokenContract) { log(`🏷️ Token (Contrato): ${summary.tokenContract.token}${tokenBalances.flags.tokenContractFallback ? ' (fallback)' : ''}`); }
    log(`🏷️ Token (Contrato) BNB: ${summary.tokenContract.bnb}`);
    if (tokenBalances.sale) { log(`📊 Sale (Token): ${summary.sale.token}${tokenBalances.flags.saleFallback ? ' (fallback)' : ''}`); }
    log(`💎 Sale (BNB): ${summary.sale.bnb}`);
    if (tokenBalances.buyer) { log(`👤 Buyer (Token): ${summary.buyer.token}${tokenBalances.flags.buyerFallback ? ' (fallback)' : ''}`); }
    log(`👤 Buyer (BNB): ${summary.buyer.bnb}`);
    if (tokenBalances.receiver) { log(`🏦 Receiver (Token): ${summary.receiver.token}${tokenBalances.flags.receiverFallback ? ' (fallback)' : ''}`); }
    log(`🏦 Receiver (BNB): ${summary.receiver.bnb}`);

  } catch (e) {
    log('❌ Erro ao verificar saldos: ' + e.message);
    addDebug('CheckSaleBalanceError', e);
  } finally {
    setBalanceLoading(false);
    const st = document.getElementById('status-checkBalance'); if (st) { st.textContent = 'Pronto'; st.className = 'step-status ready mt-1'; }
  }
}

async function sendTestTokens() {
  try {
    const tokenAddrEl = $('tokenContract');
    const saleAddrEl = $('saleContract');
    const amountEl = $('sendAmountTokens');
    const tokenAddr = tokenAddrEl ? tokenAddrEl.value.trim() : '';
    const saleAddr = saleAddrEl ? saleAddrEl.value.trim() : '';
    const amount = amountEl ? amountEl.value.trim() : '';
    if (!signer) throw new Error('Conecte a carteira');
    if (!tokenAddr || !saleAddr || !amount) throw new Error('Preencha token, venda e valor');
    const token = new ethers.Contract(tokenAddr, tokenAbi, signer);
    const tx = await token.transfer(saleAddr, ethers.BigNumber.from(amount));
    log(`🚀 Enviando tokens: ${tx.hash}`);
    const rc = await tx.wait();
    log('✅ Tokens enviados. Block=' + rc.blockNumber);
    const stSend = $('status-sendTokens'); if (stSend) { stSend.textContent = 'Pronto'; stSend.className = 'step-status ready mt-1'; }
    advanceToNextStep('sendTokens');
    await checkSaleBalance();
  } catch (e) {
    log('❌ Erro ao enviar tokens: ' + e.message);
  }
}

async function executeBuy() {
  try {
    const saleAddrEl = $('saleContract');
    const tokenAddrEl = $('tokenContract');
    const amountEl = $('buyAmountTokens');
    const saleAddr = saleAddrEl ? saleAddrEl.value.trim() : '';
    const tokenAddr = tokenAddrEl ? tokenAddrEl.value.trim() : '';
    const amountTokens = amountEl ? amountEl.value.trim() : '';
    if (!signer) throw new Error('Conecte a carteira');
    if (!saleAddr || !tokenAddr || !amountTokens) throw new Error('Campos obrigatórios ausentes');

    const sale = new ethers.Contract(saleAddr, saleAbi, signer);
    const token = new ethers.Contract(tokenAddr, tokenAbi, signer);

    const priceEl = $('buyTokenPrice');
    const priceStr = priceEl ? priceEl.value.trim() : '';
    let value = ethers.BigNumber.from(0);
    if (priceStr && parseFloat(priceStr) > 0) {
      const decimals = await token.decimals().catch(() => 18);
      const quantityUnits = ethers.utils.parseUnits(amountTokens, decimals);
      const weiPerToken = ethers.utils.parseEther(priceStr);
      value = weiPerToken.mul(quantityUnits).div(ethers.BigNumber.from(10).pow(decimals));
    } else if (sale.bnbPrice) {
      const price = await sale.bnbPrice();
      value = ethers.BigNumber.from(price).mul(ethers.BigNumber.from(amountTokens));
    }
    const bnbEl = $('bnbToPay');
    const manualBnbStr = bnbEl ? bnbEl.value.trim() : '';
    if (manualBnbStr) { value = ethers.utils.parseEther(manualBnbStr); }

    log(`💰 Executando compra: qty=${amountTokens}, value=${ethers.utils.formatEther(value)} BNB`);

    const tx = await sale.buy(ethers.BigNumber.from(amountTokens), { value });
    log('🚀 Compra enviada: ' + tx.hash);
    const rc = await tx.wait();
    log('✅ Compra confirmada. Block=' + rc.blockNumber);

  } catch (e) {
    log('❌ Erro ao comprar: ' + e.message);
  }
}

async function simulatePayable() {
  try {
    const saleAddrEl = $('saleContract');
    const tokenAddrEl = $('tokenContract');
    const saleAddr = saleAddrEl ? saleAddrEl.value.trim() : '';
    const tokenAddr = tokenAddrEl ? tokenAddrEl.value.trim() : '';
    if (!rpcProvider) {
      let rpcUrl = $('rpcUrl')?.value?.trim() || '';
      if (!rpcUrl) rpcUrl = window.widgetRpcOverride?.rpcUrl || (window.walletConnector?.getStatus?.()?.network?.rpc?.[0]) || '';
      if (!rpcUrl) {
        const st = window.walletConnector?.getStatus?.();
        if (st?.chainId) rpcUrl = getFallbackRpc(parseInt(st.chainId, 16));
      }
      if (!rpcUrl) rpcUrl = 'https://bsc-testnet.publicnode.com';
      try { rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl); } catch (provErr) {
        log('❌ Erro ao criar provider: ' + provErr.message);
        try { console.error('WidgetTeste: Provider init error', { rpcUrl, provErr }); } catch (_) { }
        return;
      }
    }
    const sale = new ethers.Contract(saleAddr, saleAbi, rpcProvider);
    const token = new ethers.Contract(tokenAddr, tokenAbi, rpcProvider);
    const decimals = await token.decimals().catch(() => 18);
    const priceEl = $('buyTokenPrice');
    const qtyEl = $('buyAmountTokens');
    const bnbEl = $('bnbToPay');
    const priceStr = priceEl ? priceEl.value.trim() : '';
    const qtyStr = qtyEl ? qtyEl.value.trim() : '';
    const manualBnbStr = bnbEl ? bnbEl.value.trim() : '';
    const quantityUnits = ethers.utils.parseUnits(qtyStr || '1', decimals);
    let value = ethers.BigNumber.from(0);
    if (priceStr && parseFloat(priceStr) > 0) {
      const weiPerToken = ethers.utils.parseEther(priceStr);
      value = weiPerToken.mul(quantityUnits).div(ethers.BigNumber.from(10).pow(decimals));
    } else if (sale.bnbPrice) {
      const pricePerUnit = await sale.bnbPrice();
      value = pricePerUnit.mul(quantityUnits).div(ethers.BigNumber.from(10).pow(decimals));
    } else if (manualBnbStr) {
      value = ethers.utils.parseEther(manualBnbStr);
    } else {
      value = ethers.utils.parseEther('0.01');
    }
    log(`🧪 Simulação: valor necessário=${value.toString()}`);
    const stSim = $('status-simulateBuy'); if (stSim) { stSim.textContent = 'Pronto'; stSim.className = 'step-status ready mt-1'; }
    advanceToNextStep('simulateBuy');
  } catch (e) {
    log('❌ Erro na simulação: ' + e.message);
    try { console.error('WidgetTeste: Erro simulatePayable', e); } catch (_) { }
  }
}

function setDefaultAbisIfEmpty() {
  const defaultTokenAbi = [
    { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
    { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
    { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] }
  ];
  const defaultSaleAbi = [
    { type: 'function', name: 'bnbPrice', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
    { type: 'function', name: 'buy', stateMutability: 'payable', inputs: [{ type: 'uint256' }], outputs: [] }
  ];
  const tokenEl = $('tokenAbiText');
  const saleEl = $('saleAbiText');
  if (tokenEl && !tokenEl.value.trim()) tokenEl.value = JSON.stringify(defaultTokenAbi, null, 2);
  if (saleEl && !saleEl.value.trim()) saleEl.value = JSON.stringify(defaultSaleAbi, null, 2);
}

function setupDebugToggle() {
  const toggle = $('debugToggle');
  const dbg = $('debugArea');
  if (!toggle || !dbg) return;
  toggle.addEventListener('click', () => {
    const hidden = dbg.classList.contains('d-none');
    dbg.classList.toggle('d-none', !hidden);
    toggle.innerText = hidden ? 'Ocultar Log' : 'Mostrar Log';
  });
}

function wireEvents() {
  const form = $('checkerForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        // Executa checks existentes e em seguida nossa validação unificada
        testRPC();
        loadAbis();
        applySequencer();
        setTimeout(() => advanceToNextStep('runChecksBtn'), 150);
        // Validação assíncrona com timeout interno e fallback de RPC
        await validateWidgetConfig();
        addDebug('Validação manual (botão) executada');
      } catch (err) {
        addDebug(`Erro ao validar: ${err.message}`);
      }
    });
  }
  const b1 = $('checkBalance'); if (b1) b1.addEventListener('click', checkSaleBalance);
  const b1b = $('checkSaleBtn'); if (b1b) b1b.addEventListener('click', checkSaleBalance);
  const b2 = $('sendTokens'); if (b2) b2.addEventListener('click', sendTestTokens);
  const b3 = $('executeBuy'); if (b3) b3.addEventListener('click', executeBuy);
  const b4 = $('simulateBuy'); if (b4) b4.addEventListener('click', simulatePayable);
  const balEl = $('buyerBalance'); if (balEl) balEl.addEventListener('input', refreshBuyerBalanceStatus);
  
  // Botões de Log
  const clearLogBtn = $('clearLog');
  if (clearLogBtn) {
    clearLogBtn.addEventListener('click', () => {
      const logEl = $('log'); if (logEl) logEl.textContent = '';
      const summaryEl = $('summary'); if (summaryEl) summaryEl.textContent = '';
      const debugEl = $('debugArea'); if (debugEl) debugEl.textContent = '';
      toast('Log limpo', 'info');
    });
  }
  
  const exportLogBtn = $('exportLog');
  if (exportLogBtn) {
    exportLogBtn.addEventListener('click', () => {
      const logEl = $('log');
      const summaryEl = $('summary');
      const debugEl = $('debugArea');
      let content = '=== LOG ===\n' + (logEl ? logEl.textContent : '') + '\n\n';
      content += '=== SUMMARY ===\n' + (summaryEl ? summaryEl.textContent : '') + '\n\n';
      content += '=== DEBUG ===\n' + (debugEl ? debugEl.textContent : '');
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `widget-log-${new Date().toISOString()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Log exportado', 'success');
    });
  }
  
  const btnClear = $('btnClearNetworkSelection'); if (btnClear) btnClear.addEventListener('click', clearNetworkSelection);
  const networkClearBtn = $('networkClearBtn'); if (networkClearBtn) networkClearBtn.addEventListener('click', clearNetworkSelection);
  const btnDetails = $('networkDetailsBtn');
  if (btnDetails) btnDetails.addEventListener('click', () => {
    const info = $('selected-network-info');
    const isOpen = info && !info.classList.contains('d-none');
    if (isOpen) return;

    const searchEl = $('networkSearch');
    const chainId = searchEl?.dataset?.chainId ? parseInt(searchEl.dataset.chainId, 10) : null;
    const nm = window.networkManager;
    if (chainId && nm && typeof nm.getNetworkById === 'function') {
      const net = nm.getNetworkById(chainId);
      if (net) { selectNetwork(net); return; }
    }

    const q = String(searchEl?.value || '').trim();
    const list = nm && typeof nm.searchNetworks === 'function' ? nm.searchNetworks(q, 5) : [];
    if (list && list.length) { selectNetwork(list[0]); return; }
    toast('Selecione uma rede para ver detalhes.', 'warning');
  });

  // Event listeners para geração de widget (nova funcionalidade)
  const generateBtn = $('generateWidget');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateWidget);
    generateBtn.disabled = true; // Desabilitado até validação passar
  }

  // Validar ao carregar ABIs
  const loadAbisBtn = $('loadAbisBtn');
  if (loadAbisBtn) {
    loadAbisBtn.addEventListener('click', () => {
      setTimeout(async () => {
        try {
          await validateWidgetConfig();
        } catch (e) {
          addDebug(`Erro na validação: ${e.message}`);
        }
      }, 500);
    });
  }

  // Re-validar quando campos importantes mudarem
  const fieldsToWatch = ['saleContract', 'receiverWallet', 'rpcUrl'];
  fieldsToWatch.forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('blur', () => {
        setTimeout(async () => {
          try {
            await validateWidgetConfig();
          } catch (e) {
            addDebug(`Erro na validação: ${e.message}`);
          }
        }, 200);
      });
    }
  });

  // Auto-validar após 2s de carregamento inicial
  setTimeout(async () => {
    try {
      await validateWidgetConfig();
      addDebug('Validação inicial executada');
    } catch (e) {
      addDebug(`Erro na validação inicial: ${e.message}`);
    }
  }, 2000);

  // Address info icons
  const tokenInfo = $('tokenContractInfoBtn'); if (tokenInfo) tokenInfo.addEventListener('click', () => { const el = $('fieldBalance_tokenContract'); if (el) { const wasOpen = el.classList.contains('show'); el.classList.toggle('show'); if (!wasOpen) { try { autoFetchField('tokenContract'); } catch (_) { } } } });
  const saleInfo = $('saleContractInfoBtn'); if (saleInfo) saleInfo.addEventListener('click', () => { const el = $('fieldBalance_saleContract'); if (el) { const wasOpen = el.classList.contains('show'); el.classList.toggle('show'); if (!wasOpen) { try { autoFetchField('saleContract'); } catch (_) { } } } });
  const buyerInfo = $('buyerWalletInfoBtn'); if (buyerInfo) buyerInfo.addEventListener('click', () => { const el = $('fieldBalance_buyerWallet'); if (el) { const wasOpen = el.classList.contains('show'); el.classList.toggle('show'); if (!wasOpen) { try { autoFetchField('buyerWallet'); } catch (_) { } } } });
  const receiverInfo = $('receiverWalletInfoBtn'); if (receiverInfo) receiverInfo.addEventListener('click', () => { const el = $('fieldBalance_receiverWallet'); if (el) { const wasOpen = el.classList.contains('show'); el.classList.toggle('show'); if (!wasOpen) { try { autoFetchField('receiverWallet'); } catch (_) { } } } });

  // Token transfer icon removido para padronizar com apenas informações

  const switchBtn = $('metamaskSwitchBtn');
  if (switchBtn) {
    switchBtn.addEventListener('click', async () => {
      const searchEl = $('networkSearch');
      const selectedChainId = searchEl?.dataset?.chainId ? parseInt(searchEl.dataset.chainId, 10) : null;
      const currentHex = currentHex ? parseInt(currentHex, 16) : null;
      if (!selectedChainId || !window.walletConnector) {
        toast('Selecione uma rede antes de trocar.', 'warning');
        return;
      }
      try {
        await window.walletConnector.switchNetwork(selectedChainId);
        const alertEl = $('metamaskNetworkAlert'); if (alertEl) alertEl.classList.add('d-none');
        toast('Rede trocada com sucesso no MetaMask.', 'success');
      } catch (err) {
        toast('Não foi possível trocar a rede automaticamente.', 'warning');
        addDebug('SwitchNetworkError: ' + (err?.message || String(err)));
      }
    });
  }
}

function setupWalletIntegration() {
  document.addEventListener('wallet:connected', async (e) => {
    try {
      if (window.ethereum) {
        web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = web3Provider.getSigner();
        const addr = e.detail && e.detail.account ? e.detail.account : await signer.getAddress();
        const buyerEl = $('buyerWallet'); if (buyerEl) buyerEl.value = addr;
        log(`🔗 Conectado (global): ${addr}`);
        refreshBuyerBalanceStatus();
        // Aplicar RPC do sistema ao conectar
        applyRpcFromSystem();
      }
    } catch (err) {
      addDebug('Falha ao configurar provider global: ' + err.message);
    }
  });
  document.addEventListener('wallet:disconnected', () => {
    signer = null;
    web3Provider = null;
    const buyerEl = $('buyerWallet'); if (buyerEl) buyerEl.value = '';
    refreshBuyerBalanceStatus();
    log('🔌 Carteira desconectada (global).');
  });
  document.addEventListener('wallet:accountChanged', (e) => {
    const addr = e.detail && e.detail.account ? e.detail.account : null;
    if (addr) {
      const buyerEl = $('buyerWallet'); if (buyerEl) buyerEl.value = addr;
      refreshBuyerBalanceStatus();
      log('👤 Conta alterada: ' + addr);
    }
  });
  document.addEventListener('wallet:chainChanged', (e) => {
    addDebug('🔄 Rede alterada: ' + ((e.detail && e.detail.chainId) ? e.detail.chainId : 'desconhecida'));
    // Reaplicar RPC ao alterar cadeia
    applyRpcFromSystem();
    // Mostrar/ocultar alerta persistente conforme rede atual x seleção
    const alertEl = $('metamaskNetworkAlert');
    const searchEl = $('networkSearch');
    const selectedChainId = searchEl?.dataset?.chainId ? parseInt(searchEl.dataset.chainId, 10) : null;
    const currentHex = (e && e.detail && e.detail.chainId) ? e.detail.chainId : null;
    const currentDec = currentHex ? parseInt(currentHex, 16) : null;
    if (alertEl && selectedChainId) {
      if (currentDec === selectedChainId) {
        alertEl.classList.add('d-none');
      } else {
        const idEl = $('metamaskTargetId'); if (idEl) idEl.textContent = String(selectedChainId);
        alertEl.classList.remove('d-none');
      }
    }
  });
}

function setupNetworkSearch() {
  // Integração com o componente de busca compartilhado (network-search)
  // Comentário: O componente passa a controlar input e lista; aqui apenas reagimos aos eventos.
  // - network:selected { network }: seleciona rede e atualiza UI do widget
  // - network:clear: limpa a seleção e oculta informações
  document.addEventListener('network:selected', (ev) => {
    const net = ev?.detail?.network;
    if (net) { selectNetwork(net); }
  });
  document.addEventListener('network:clear', () => {
    clearNetworkSelection();
  });
}

function setupAddressIcons() {
  try {
    const ids = ['tokenContractInfoBtn', 'tokenContractTransferBtn', 'saleContractInfoBtn', 'buyerWalletInfoBtn', 'receiverWalletInfoBtn', 'networkDetailsBtn', 'networkClearBtn', 'btnClearNetworkSelection'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      try {
        if (window.bootstrap && bootstrap.Tooltip) { new bootstrap.Tooltip(el); }
        else { el.setAttribute('data-bs-toggle', 'tooltip'); }
      } catch (_e) { }
    });
  } catch (_e) { /* ignore */ }
}

function renderAutocomplete(list) {
  const box = $('networkAutocomplete');
  if (!box) return;
  if (!list || list.length === 0) {
    box.classList.add('d-none');
    box.innerHTML = '';
    return;
  }
  box.innerHTML = list.map(network => `
    <div class="autocomplete-item list-group-item" data-chainid="${network.chainId}" style="cursor:pointer;">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${network.name}</strong>
          <small class="d-block text-muted">Chain ID: ${network.chainId}</small>
        </div>
        <span class="badge bg-dark-elevated text-tokencafe">${network.nativeCurrency?.symbol || 'N/A'}</span>
      </div>
    </div>
  `).join('');
  box.querySelectorAll('.autocomplete-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.chainid, 10);
      const nm = window.networkManager;
      const net = nm && typeof nm.getNetworkById === 'function' ? nm.getNetworkById(id) : null;
      if (net) selectNetwork(net);
    });
  });
  box.classList.remove('d-none');
}

async function selectNetwork(network) {
  let rpc = (Array.isArray(network.rpc) && network.rpc.length ? network.rpc[0] : '') || '';
  if (!rpc) rpc = getFallbackRpc(network.chainId);
  if (!Array.isArray(network.rpc) || network.rpc.length === 0) { network.rpc = rpc ? [rpc] : []; }
  const explorer = (network.explorers?.[0]?.url || '') || getFallbackExplorer(network.chainId);

  // Aplicar na UI do widget (RPC)
  const hidden = $('rpcUrl'); if (hidden) hidden.value = rpc;
  const codeEl = $('rpcUrlCode'); if (codeEl) codeEl.textContent = rpc;
  const textEl = $('rpcUrlText'); if (textEl) textEl.href = rpc;

  // Aplicar na UI do widget (detalhes)
  const nameEl = $('networkNameCode'); if (nameEl) nameEl.textContent = network.name || '';
  const idEl = $('chainIdCode'); if (idEl) idEl.textContent = String(network.chainId || '');
  const curNameEl = $('nativeCurrencyNameCode'); if (curNameEl) curNameEl.textContent = network.nativeCurrency?.name || '';
  const curSymEl = $('nativeCurrencySymbolCode'); if (curSymEl) curSymEl.textContent = network.nativeCurrency?.symbol || '';
  const expText = $('explorerUrlCode'); if (expText) expText.textContent = explorer || '';
  const expLink = $('explorerUrlText'); if (expLink) { if (explorer) expLink.href = explorer; else expLink.removeAttribute('href'); }
  // Não abrir automaticamente o card de detalhes; seguir padrão do componente (oculto até clicar no botão I)

  // Ocultar seção de RPC (não necessária após seleção)
  const rpcSection = $('rpcSection'); if (rpcSection) rpcSection.classList.add('d-none');

  // Registrar override manual
  window.widgetRpcOverride = { chainId: network.chainId, rpcUrl: rpc };
  try { localStorage.setItem('widgetRpcOverride', JSON.stringify({ chainId: network.chainId, rpcUrl: rpc, name: network.name })); } catch { }
  toast(`Rede selecionada: ${network.name}`, 'success');

  // Fechar autocomplete e fixar chainId selecionado
  const box = $('networkAutocomplete'); if (box) { box.classList.add('d-none'); box.innerHTML = ''; }
  const input = $('networkSearch'); if (input) { input.value = `${network.name} (${network.chainId})`; input.dataset.chainId = String(network.chainId); }

  // Garantir que o MetaMask esteja conectado e na mesma rede
  try {
    const wc = window.walletConnector;
    if (wc && typeof wc.getStatus === 'function') {
      const status = wc.getStatus();
      if (!status.isConnected && typeof wc.connect === 'function') {
        await wc.connect('metamask');
        toast('MetaMask conectado', 'success');
      }
      const currentHex = wc.getStatus()?.chainId || null;
      const targetHex = `0x${network.chainId.toString(16)}`;
      if (!currentHex || currentHex.toLowerCase() !== targetHex.toLowerCase()) {
        await wc.switchNetwork(network.chainId);
        toast('MetaMask alinhado à rede selecionada', 'success');
      }
    } else if (window.ethereum) {
      const currentHex = await window.ethereum.request({ method: 'eth_chainId' });
      const targetHex = '0x' + network.chainId.toString(16);
      if (!currentHex || currentHex.toLowerCase() !== targetHex.toLowerCase()) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: targetHex }]
          });
        } catch (err) {
          if (err && err.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: targetHex,
                chainName: network.name,
                nativeCurrency: network.nativeCurrency || { name: 'Ether', symbol: 'ETH', decimals: 18 },
                rpcUrls: Array.isArray(network.rpc) ? network.rpc : [network.rpc].filter(Boolean),
                blockExplorerUrls: network.explorers ? network.explorers.map(e => e.url).filter(Boolean) : []
              }]
            });
          } else {
            throw err;
          }
        }
        toast(`MetaMask: rede trocada para ${network.name}`, 'info');
      }
    }
  } catch (e) {
    const alertEl = $('metamaskNetworkAlert');
    const nameEl = $('metamaskTargetName');
    const idEl = $('metamaskTargetId');
    if (alertEl) alertEl.classList.remove('d-none');
    if (nameEl) nameEl.textContent = network.name || '';
    if (idEl) idEl.textContent = String(network.chainId || '');
    toast(`MetaMask: configure a rede ${network.name} para continuar`, 'warning');
  }

  const alertEl = $('metamaskNetworkAlert'); if (alertEl) alertEl.classList.add('d-none');
  try { rpcProvider = new ethers.providers.JsonRpcProvider(rpc); } catch (e) { addDebug('Falha ao instanciar provider selecionado: ' + e.message); }
  log(`🔎 Rede selecionada: ${network.name} — RPC aplicada.`);
  applySequencer();
}

function clearNetworkSelection() {
  // Remover override manual e limpar UI
  window.widgetRpcOverride = null;
  try { localStorage.removeItem('widgetRpcOverride'); } catch { }
  const input = $('networkSearch'); if (input) { input.value = ''; delete input.dataset.chainId; }
  const info = $('selected-network-info'); if (info) info.classList.add('d-none');
  ['networkNameCode', 'chainIdCode', 'nativeCurrencyNameCode', 'nativeCurrencySymbolCode', 'explorerUrlCode'].forEach(id => {
    const el = $(id); if (el) el.textContent = '';
  });
  const expLink = $('explorerUrlText'); if (expLink) expLink.removeAttribute('href');

  // Reexibir seção de RPC
  const rpcSection = $('rpcSection'); if (rpcSection) rpcSection.classList.remove('d-none');

  // Ocultar alerta de incompatibilidade
  const alertEl = $('metamaskNetworkAlert'); if (alertEl) alertEl.classList.add('d-none');

  toast('Seleção de rede limpa. RPC do sistema aplicada.', 'info');

  // Reaplicar RPC do sistema (walletConnector/networkManager)
  applyRpcFromSystem();
}

// Inicialização do módulo
(async function init() {
  try {
    const pm = new PageManager('tools');
    await pm.init();

    // Ativar busca de rede e restaurar seleção, se houver
    setupNetworkSearch();
    setupAddressIcons();
    try {
      const saved = localStorage.getItem('widgetRpcOverride');
      if (saved) {
        const obj = JSON.parse(saved);
        if (obj && obj.rpcUrl) {
          window.widgetRpcOverride = obj;
          const hidden = $('rpcUrl'); if (hidden) hidden.value = obj.rpcUrl;
          const codeEl = $('rpcUrlCode'); if (codeEl) codeEl.textContent = obj.rpcUrl;
          const textEl = $('rpcUrlText'); if (textEl) textEl.href = obj.rpcUrl;
          const nm = window.networkManager;
          let net = null;
          if (nm && typeof nm.getNetworkById === 'function' && obj.chainId) {
            net = nm.getNetworkById(Number(obj.chainId));
          }
          if (net) {
            selectNetwork(net);
          } else {
            const info = $('selected-network-info'); if (info) info.classList.add('d-none');
            const nameEl = $('networkNameCode'); if (nameEl) nameEl.textContent = obj.name || '';
            const idEl = $('chainIdCode'); if (idEl) idEl.textContent = String(obj.chainId || '');
            const exp = getFallbackExplorer(obj.chainId);
            const expText = $('explorerUrlCode'); if (expText) expText.textContent = exp || '';
            const expLink = $('explorerUrlText'); if (expLink) { if (exp) expLink.href = exp; else expLink.removeAttribute('href'); }
            try { rpcProvider = new ethers.providers.JsonRpcProvider(obj.rpcUrl); } catch { }
          }
          toast(`Rede restaurada: ${obj.name || obj.chainId}`, 'info');
        }
      }
    } catch { }


    setDefaultAbisIfEmpty();
    setupDebugToggle();
    setupWalletIntegration();
    wireEvents();

    document.addEventListener('wallet:connected', () => {
      const stConn = $('status-connectWallet'); if (stConn) { stConn.textContent = 'Pronto'; stConn.className = 'step-status ready mt-1'; }
      advanceToNextStep('runChecksBtn');
    });

    applySequencer();

    log('✅ Widget Teste inicializado via módulo');
  } catch (e) {
    addDebug('❌ Falha ao iniciar módulo: ' + e.message);
  }
})();

(function ensureSingleCheckBalanceListener() {
  ['checkBalance', 'checkSaleBtn'].forEach(id => {
    const btn = $(id);
    if (btn) btn.addEventListener('click', (e) => checkSaleBalance(e), { capture: true });
  });
})();


(function () {
  // Debounce helper
  function debounce(fn, ms) { let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); }; }

  const erc20Minimal = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)'
  ];

  // Inline field balance UI helpers
  function setFieldBalanceLoading(fieldId, isLoading) {
    const el = document.getElementById(`fieldBalance_${fieldId}`);
    if (!el) return;
    if (isLoading) {
      el.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Carregando…`;
    }
  }

  function renderFieldBalance(fieldId, data) {
    const el = document.getElementById(`fieldBalance_${fieldId}`);
    if (!el) return;
    const nativeName = data.nativeName || 'Binance Coin';
    const tokenNote = data.tokenNote ? ` <small class="text-warning">${data.tokenNote}</small>` : '';
    const tokenSymbol = (data.meta && data.meta.symbol) ? data.meta.symbol : 'TOKEN';
    // Presets configuráveis: via window.widgetInlinePresets (array) ou data-inline-presets no input tokenContract (CSV)
    const defaultPresets = [100, 1000, 10000];
    let presets = defaultPresets;
    try {
      const cfg = (Array.isArray(window.widgetInlinePresets) && window.widgetInlinePresets.length) ? window.widgetInlinePresets : null;
      const dsStr = document.getElementById('tokenContract')?.dataset?.inlinePresets || '';
      const dsArr = dsStr ? dsStr.split(',').map(x => parseFloat(String(x).trim())).filter(n => isFinite(n) && n > 0) : null;
      presets = dsArr || cfg || defaultPresets;
    } catch (_e) { }
    const fmtPresetLabel = (n) => { if (!isFinite(n)) return String(n); return (n % 1000 === 0 && n >= 1000) ? `${Math.floor(n / 1000)}k` : String(n); };
    const presetsHtml = presets.map(p => `<button type="button" class="btn btn-outline-secondary inline-preset-btn" data-preset="${p}">${fmtPresetLabel(p)}</button>`).join('');
    const sym = (data.meta && data.meta.symbol) ? data.meta.symbol : 'TOKEN';
    const name = (data.meta && data.meta.name) ? data.meta.name : '—';
    const tokenBalText = `Saldo: ${data.token ?? 'N/A'}${tokenNote}`;
    const bnbBalText = `Saldo: ${data.bnb}`;

    // Preservar mensagem de transação antes de re-renderizar
    const prevTxMsg = (fieldId === 'tokenContract') ? (document.getElementById('inlineTx_tokenContract')?.innerHTML || '') : '';

    el.innerHTML = `
      <div class="field-info-line values ${fieldId === 'tokenContract' ? 'simple-3' : 'simple-3'}">
        <span class="fi-col1">${sym}</span>
        <span class="fi-col2">${name}</span>
        <span class="fi-col3">${tokenBalText}</span>
      </div>
      <div class="field-info-line values simple-3">
        <span class="fi-col1">BNB</span>
        <span class="fi-col2">${nativeName}</span>
        <span class="fi-col3">${bnbBalText}</span>
      </div>
      ${data.readiness && data.readiness.status ? `
      <div id="readiness_${fieldId}" class="form-text small mt-1 ${data.readiness.status === 'apto' ? 'text-success' : (data.readiness.status === 'nao_apto' ? 'text-danger' : 'text-warning')}">
        ${fieldId === 'tokenContract' ? 'Contrato Token' : (fieldId === 'saleContract' ? 'Contrato Sale' : 'Endereço')}:
        ${data.readiness.status === 'apto' ? 'apto' : (data.readiness.status === 'nao_apto' ? 'não apto' : 'indefinido')}.
        ${Array.isArray(data.readiness.reasons) && data.readiness.reasons.length ? 'Razões: ' + data.readiness.reasons.join('; ') : ''}
      </div>
      ` : ''}
      ${fieldId === 'saleContract' && data.saleTokenMismatch ? `
      <div class="form-text text-warning small mt-1">
        O saleToken do contrato difere do Token informado.<br>
        saleToken: ${data.saleTokenAddr || 'N/A'}<br>
        Token informado: ${data.tokenAddrInput || 'N/A'}
      </div>
      ` : ''}
      ${fieldId === 'tokenContract' ? `
      <div class="mt-2">
        <label for="inlineAmount_tokenContract" class="form-label small mb-1">
          Valor a transferir para o contrato sale em unidades de ${tokenSymbol}; decimais: ${typeof data.decimals === 'number' ? data.decimals : '—'}
        </label>
        <div class="input-group input-group-sm">
          <input id="inlineAmount_tokenContract" class="form-control form-control-sm" placeholder="Ex.: 1000">
          <div class="btn-group btn-group-sm" role="group" aria-label="Valores rápidos">${presetsHtml}</div>
          <button id="inlineSend_tokenContract" class="btn btn-sm btn-primary" title="Enviar para Sale">enviar →</button>
        </div>
        <div id="inlineTx_tokenContract" class="field-tx mt-1"></div>
      </div>
      ` : ''}
    `;

    // Restaurar mensagem de status de transação, se existir
    if (fieldId === 'tokenContract') {
      const t = el.querySelector('#inlineTx_tokenContract');
      const msg = prevTxMsg || (window.widgetInlineLastTxMsg || '');
      if (t && msg) t.innerHTML = msg;
    }

    if (fieldId === 'tokenContract') {
      const btn = el.querySelector('#inlineSend_tokenContract');
      if (btn) btn.addEventListener('click', performInlineTransfer);
      const infoBtn = el.querySelector('#inlineInfo_tokenContract');
      if (infoBtn) {
        try { if (window.bootstrap && bootstrap.Tooltip) { new bootstrap.Tooltip(infoBtn); } } catch (_e) { }
        infoBtn.addEventListener('click', () => {
          const t = el.querySelector('#inlineTx_tokenContract'); if (!t) return;
          t.innerHTML = '<span class="text-warning">Você pode enviar tokens ao contrato Sale. Informe um valor em unidades do token e clique em “enviar →”.</span>';
        });
      }
      const inp = el.querySelector('#inlineAmount_tokenContract');
      el.querySelectorAll('.inline-preset-btn').forEach(b => {
        b.addEventListener('click', () => { if (inp) inp.value = b.getAttribute('data-preset') || ''; });
      });
    }
  }

  // Avaliação de aptidão de contratos
  async function assessTokenReadiness(tokenAddr, abiCandidate, prov, fallbackProv) {
    const reasons = [];
    let status = 'indefinido';
    try {
      const codePrimary = await withTimeout(prov.getCode(tokenAddr), 4000, 'token.getCode(primary)').catch(() => '0x');
      const codeFallback = await withTimeout(fallbackProv.getCode(tokenAddr), 4000, 'token.getCode(fallback)').catch(() => '0x');
      const hasCode = codePrimary !== '0x' || codeFallback !== '0x';
      if (!hasCode) { reasons.push('Sem bytecode na rede'); status = 'nao_apto'; return { status, reasons }; }

      const assessmentAbi = Array.isArray(abiCandidate) && abiCandidate.length ? abiCandidate : [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address) view returns (uint256)'
      ];
      const c = new ethers.Contract(tokenAddr, assessmentAbi, prov);
      const cf = new ethers.Contract(tokenAddr, assessmentAbi, fallbackProv);
      // Ler alguns campos básicos
      let okDecimals = false, okBalance = false, okMeta = false;
      try { await withTimeout(c.decimals(), 3000, 'token.decimals(primary)'); okDecimals = true; } catch (_e) { try { await withTimeout(cf.decimals(), 3000, 'token.decimals(fallback)'); okDecimals = true; } catch (_e2) { reasons.push('Falha ao ler decimals'); } }
      try { const addr = (document.getElementById('buyerWallet')?.value || '').trim(); if (ethers.utils.isAddress(addr)) { await withTimeout(c.balanceOf(addr), 3000, 'token.balanceOf(primary)'); okBalance = true; } }
      catch (_e) { try { const addr = (document.getElementById('buyerWallet')?.value || '').trim(); if (ethers.utils.isAddress(addr)) { await withTimeout(cf.balanceOf(addr), 3000, 'token.balanceOf(fallback)'); okBalance = true; } } catch (_e2) { reasons.push('Falha ao ler balanceOf'); } }
      try { await withTimeout(c.name(), 3000, 'token.name'); await withTimeout(c.symbol(), 3000, 'token.symbol'); okMeta = true; } catch (_e) { try { await withTimeout(cf.name(), 3000, 'token.name(fallback)'); await withTimeout(cf.symbol(), 3000, 'token.symbol(fallback)'); okMeta = true; } catch (_e2) { reasons.push('Falha ao ler name/symbol'); } }

      if (okDecimals && okBalance) { status = 'apto'; }
      else if (okDecimals || okMeta) { status = 'indefinido'; }
      else { status = 'nao_apto'; }
    } catch (e) { reasons.push('Erro de avaliação: ' + (e?.message || e)); status = 'indefinido'; }
    return { status, reasons };
  }

  async function assessSaleReadiness(saleAddr, saleAbiCandidate, prov, fallbackProv, tokenAddrExpected) {
    const reasons = [];
    let status = 'indefinido';
    try {
      const codePrimary = await withTimeout(prov.getCode(saleAddr), 4000, 'sale.getCode(primary)').catch(() => '0x');
      const codeFallback = await withTimeout(fallbackProv.getCode(saleAddr), 4000, 'sale.getCode(fallback)').catch(() => '0x');
      const hasCode = codePrimary !== '0x' || codeFallback !== '0x';
      if (!hasCode) { reasons.push('Sem bytecode na rede'); status = 'nao_apto'; return { status, reasons }; }

      const saleAbiMin = Array.isArray(saleAbiCandidate) && saleAbiCandidate.length ? saleAbiCandidate : [
        'function buy() payable',
        'function bnbPrice() view returns (uint256)',
        'function saleToken() view returns (address)'
      ];
      const c = new ethers.Contract(saleAddr, saleAbiMin, prov);
      const cf = new ethers.Contract(saleAddr, saleAbiMin, fallbackProv);

      // Verificar existência de buy (via interface)
      const hasBuyInAbi = saleAbiMin.some(x => (typeof x === 'string' ? x.includes('buy(') : (x && x.name === 'buy')));
      if (!hasBuyInAbi) { reasons.push('ABI sem função buy()'); }

      // Ler saleToken se disponível
      let saleTokenAddr = null;
      try { saleTokenAddr = await withTimeout(c.saleToken(), 3000, 'sale.saleToken(primary)'); }
      catch (_e) { try { saleTokenAddr = await withTimeout(cf.saleToken(), 3000, 'sale.saleToken(fallback)'); } catch (_e2) { /* opcional */ } }
      if (saleTokenAddr && ethers.utils.isAddress(saleTokenAddr) && tokenAddrExpected && ethers.utils.isAddress(tokenAddrExpected)) {
        if (saleTokenAddr.toLowerCase() !== tokenAddrExpected.toLowerCase()) { reasons.push('saleToken diferente do Token informado'); }
      }

      // Ler preço se disponível
      let priceOk = false;
      try {
        const p = await withTimeout(c.bnbPrice(), 3000, 'sale.bnbPrice(primary)');
        priceOk = !!(p && !p.isZero());
      } catch (_e) {
        try { const p = await withTimeout(cf.bnbPrice(), 3000, 'sale.bnbPrice(fallback)'); priceOk = !!(p && !p.isZero()); }
        catch (_e2) { /* ignorar */ }
      }

      if (hasBuyInAbi && (priceOk || saleTokenAddr)) { status = 'apto'; }
      else if (hasBuyInAbi) { status = 'indefinido'; reasons.push('Sem confirmação de preço ou saleToken'); }
      else { status = 'nao_apto'; }
    } catch (e) { reasons.push('Erro de avaliação: ' + (e?.message || e)); status = 'indefinido'; }
    return { status, reasons };
  }

  async function autoFetchField(fieldId) {
    try {
      const addr = (document.getElementById(fieldId)?.value || '').trim();
      let tokenAddrInput = (document.getElementById('tokenContract')?.value || '').trim();
      if (!addr || !ethers.utils.isAddress(addr)) {
        renderFieldBalance(fieldId, { token: null, bnb: '—' });
        return;
      }
      setFieldBalanceLoading(fieldId, true);

      // Resolve providers (primary and fallback)
      let prov = null;
      try {
        if (typeof rpcProvider !== 'undefined' && rpcProvider) prov = rpcProvider;
        else if (typeof web3Provider !== 'undefined' && web3Provider) prov = web3Provider;
        else if (typeof signer !== 'undefined' && signer && signer.provider) prov = signer.provider;
        else if (typeof provider !== 'undefined' && provider) prov = provider;
      } catch (_e) { }
      const rpcInput = (document.getElementById('rpcUrl')?.value || '').trim();
      const rpcUrl = (typeof sanitizeRpcUrl === 'function') ? sanitizeRpcUrl(rpcInput) : rpcInput;
      if (!prov) {
        let candidateUrl = rpcUrl;
        if (!candidateUrl) {
          const overrideUrl = (window.widgetRpcOverride && window.widgetRpcOverride.rpcUrl) || '';
          const status = (window.walletConnector && window.walletConnector.getStatus) ? window.walletConnector.getStatus() : null;
          const statusRpc = status && status.network && Array.isArray(status.network.rpc) ? status.network.rpc[0] : '';
          candidateUrl = sanitizeRpcUrl ? sanitizeRpcUrl(overrideUrl || statusRpc || '') : (overrideUrl || statusRpc || '');
        }
        if (candidateUrl) {
          try { prov = new ethers.providers.JsonRpcProvider(candidateUrl); }
          catch (e) { addDebug('ProvInitErrorInline', e); }
        }
      }
      const fallbackProv = new ethers.providers.StaticJsonRpcProvider('https://bsc-testnet.publicnode.com', { chainId: 97, name: 'bsc-testnet' });
      if (!prov) { prov = fallbackProv; }

      // Native currency name
      let nativeName = 'Binance Coin';
      try {
        const net = await withTimeout(prov.getNetwork(), 2000, 'getNetwork');
        const cid = net?.chainId; const nm = (net?.name || '').toLowerCase();
        if (cid === 1 || nm === 'homestead') nativeName = 'Ether';
        else if (cid === 56 || cid === 97 || nm.includes('bsc')) nativeName = 'Binance Coin';
        else nativeName = net?.name || 'Native';
      } catch (_e) { /* mantém default */ }

      // Native balance
      const getNativeBalance = async (a, label) => {
        try { return await withTimeout(prov.getBalance(a), 5000, `${label}.getBalance`); }
        catch (e) {
          addDebug(`${label}NativeInlineTimeout`, e.message);
          try { return await withTimeout(fallbackProv.getBalance(a), 5000, `${label}.getBalance(fallback)`); }
          catch (e2) { addDebug(`${label}NativeInlineFallbackError`, e2.message); return ethers.BigNumber.from(0); }
        }
      };

      // Determine token address to read metadata from
      let tokenAddrForMeta = tokenAddrInput;
      if (fieldId === 'tokenContract') tokenAddrForMeta = addr; // usar o próprio endereço

      // If sale contract, try reading saleToken from saleAbi and compare
      let saleTokenAddr = null; let saleTokenMismatch = false;
      if (fieldId === 'saleContract' && Array.isArray(saleAbi) && saleAbi.length) {
        try {
          const salePrimary = new ethers.Contract(addr, saleAbi, prov);
          saleTokenAddr = await withTimeout(salePrimary.saleToken(), 5000, 'sale.saleToken(primary)');
        } catch (e) {
          addDebug('InlineSaleTokenPrimaryError', e.message);
          try {
            const saleFallback = new ethers.Contract(addr, saleAbi, fallbackProv);
            saleTokenAddr = await withTimeout(saleFallback.saleToken(), 5000, 'sale.saleToken(fallback)').catch(() => null);
          } catch (e2) { addDebug('InlineSaleTokenFallbackError', e2.message); }
        }
        const verifySale = (window.widgetVerifySaleToken === true) || (String(document.getElementById('saleContract')?.dataset?.verifySaleToken || '').toLowerCase() === 'true');
        if (saleTokenAddr && ethers.utils.isAddress(saleTokenAddr)) {
          if (tokenAddrForMeta && ethers.utils.isAddress(tokenAddrForMeta) && saleTokenAddr.toLowerCase() !== tokenAddrForMeta.toLowerCase()) {
            saleTokenMismatch = !!verifySale;
            tokenAddrForMeta = saleTokenAddr; // usar o real configurado no Sale
          }
        }
      }

      // Token metadata + balances
      // Use cache para dados estáveis (meta/decimals) e evite re-leitura desnecessária
      let meta = null; let decimals = 18; let tokenNote = '';
      let tokenBal = null;
      if (tokenAddrForMeta && ethers.utils.isAddress(tokenAddrForMeta)) {
        const cacheKey = tokenAddrForMeta.toLowerCase();
        const cached = window.widgetInlineMetaCache[cacheKey] || null;
        if (cached) {
          if (cached.decimals != null) decimals = cached.decimals;
          if (cached.meta) meta = cached.meta;
        }
        let primaryCode = '0x', fallbackCode = '0x';
        try { primaryCode = await withTimeout(prov.getCode(tokenAddrForMeta), 5000, 'getCode(primary)'); } catch (e) { addDebug('InlineTokenCodePrimaryTimeout', e.message); }
        try { fallbackCode = await withTimeout(fallbackProv.getCode(tokenAddrForMeta), 5000, 'getCode(fallback)'); } catch (e) { addDebug('InlineTokenCodeFallbackTimeout', e.message); }
        const abiToUse = Array.isArray(tokenAbi) && tokenAbi.length ? tokenAbi : erc20Minimal;
        const tokenPrimary = (primaryCode !== '0x') ? new ethers.Contract(tokenAddrForMeta, abiToUse, prov) : null;
        const tokenFallback = (fallbackCode !== '0x') ? new ethers.Contract(tokenAddrForMeta, abiToUse, fallbackProv) : null;
        // decimals
        if (cached == null || cached.decimals == null) {
          if (tokenPrimary) {
            decimals = await withTimeout(tokenPrimary.decimals(), 5000, 'token.decimals(primary)').catch(async e => {
              addDebug('InlineDecimalsPrimaryError', e.message);
              if (tokenFallback) { tokenNote = '(fallback)'; return await withTimeout(tokenFallback.decimals(), 5000, 'token.decimals(fallback)').catch(() => decimals); }
              return decimals;
            });
          } else if (tokenFallback) { tokenNote = '(fallback)'; decimals = await withTimeout(tokenFallback.decimals(), 5000, 'token.decimals(fallback)').catch(() => decimals); }
        }
        // name/symbol/totalSupply
        if (cached == null || cached.meta == null) {
          const readMeta = async (c) => {
            try {
              const [nm, sym, ts] = await Promise.all([
                withTimeout(c.name(), 5000, 'token.name'),
                withTimeout(c.symbol(), 5000, 'token.symbol'),
                withTimeout(c.totalSupply(), 5000, 'token.totalSupply')
              ]);
              return { name: nm, symbol: sym, totalSupply: ethers.utils.formatUnits(ts, decimals) };
            } catch (e) { addDebug('InlineMetaError', e.message); return null; }
          };
          meta = tokenPrimary ? await readMeta(tokenPrimary) : null;
          if (!meta && tokenFallback) { tokenNote = '(fallback)'; meta = await readMeta(tokenFallback); }
        }
        // Atualizar cache se obtivermos valores válidos
        try {
          window.widgetInlineMetaCache[cacheKey] = {
            decimals: decimals,
            meta: meta || (cached ? cached.meta : null)
          };
        } catch (_e) { }
        // balanceOf for the current address (addr)
        const readBal = async (c) => {
          try { return await withTimeout(c.balanceOf(addr), 5000, 'token.balanceOf'); }
          catch (e) { addDebug('InlineBalanceOfError', e.message); return null; }
        };
        tokenBal = tokenPrimary ? await readBal(tokenPrimary) : null;
        if (!tokenBal && tokenFallback) { tokenNote = '(fallback)'; tokenBal = await readBal(tokenFallback); }
      }

      // Native balance for the address
      const nativeBal = await getNativeBalance(addr, fieldId);
      const fmtNative = v => ethers.utils.formatEther(v || ethers.BigNumber.from(0));
      const fmtToken = (v, d) => v ? ethers.utils.formatUnits(v, d || 18) : null;
      // Avaliação de aptidão
      let readiness = null;
      try {
        if (fieldId === 'tokenContract') {
          const abiCandidate = Array.isArray(tokenAbi) && tokenAbi.length ? tokenAbi : erc20Minimal;
          readiness = await assessTokenReadiness(addr, abiCandidate, prov, fallbackProv);
        } else if (fieldId === 'saleContract') {
          const abiCandidate = Array.isArray(saleAbi) && saleAbi.length ? saleAbi : [
            'function buy() payable',
            'function bnbPrice() view returns (uint256)',
            'function saleToken() view returns (address)'
          ];
          readiness = await assessSaleReadiness(addr, abiCandidate, prov, fallbackProv, tokenAddrForMeta);
        }
      } catch (_e) { /* manter indefinido */ }

      renderFieldBalance(fieldId, {
        meta,
        token: fmtToken(tokenBal, decimals),
        bnb: fmtNative(nativeBal),
        tokenNote,
        nativeName,
        decimals,
        saleTokenMismatch,
        saleTokenAddr,
        tokenAddrInput,
        readiness
      });
    } catch (e) { addDebug('AutoFetchFieldError', e); }
  }

  function setupAutoFieldBalances() {
    const ids = ['tokenContract', 'saleContract', 'buyerWallet', 'receiverWallet'];
    ids.forEach(id => {
      const el = document.getElementById(id); if (!el) return;
      const deb = debounce(() => autoFetchField(id), 600);
      el.addEventListener('input', deb);
      el.addEventListener('blur', () => autoFetchField(id));
      // initial fetch
      setTimeout(() => autoFetchField(id), 300);
    });
    const rpcEl = document.getElementById('rpcUrl');
    if (rpcEl) {
      const deb = debounce(() => {
        // Recarregar ABIs e revalidar saldos quando RPC mudar
        try { loadAbis(); } catch (_) { }
        ids.forEach(id => autoFetchField(id));
        try { checkSaleBalance(); } catch (_) { }
      }, 800);
      rpcEl.addEventListener('input', deb);
    }

    // Atualizações reativas de ABI quando usuário editar os endereços
    const tokenEl = document.getElementById('tokenContract');
    if (tokenEl) {
      const debTok = debounce(async () => {
        try { await autoFetchAndValidateContract(tokenEl.value.trim(), 'token'); } catch (_) { }
        try { await loadAbis(); } catch (_) { }
        try { autoFetchField('tokenContract'); } catch (_) { }
      }, 700);
      tokenEl.addEventListener('input', debTok);
    }

    const saleEl = document.getElementById('saleContract');
    if (saleEl) {
      const debSale = debounce(async () => {
        try { await autoFetchAndValidateContract(saleEl.value.trim(), 'sale'); } catch (_) { }
        try { await loadAbis(); } catch (_) { }
        try { autoFetchField('saleContract'); } catch (_) { }
      }, 700);
      saleEl.addEventListener('input', debSale);
    }
  }

  // Expor o fetch para uso fora deste escopo
  try { window.autoFetchField = autoFetchField; } catch (_e) { }
  document.addEventListener('DOMContentLoaded', () => { try { setupAutoFieldBalances(); } catch (_e) { } });
})();


function performInlineTransfer() {
  (async () => {
    try {
      if (!signer) { toast('Conecte a carteira para enviar.', 'warning'); return; }
      const tokenAddr = (document.getElementById('tokenContract')?.value || '').trim();
      const destAddr = (document.getElementById('saleContract')?.value || '').trim();
      const amountStr = (document.getElementById('inlineAmount_tokenContract')?.value || '').trim();
      if (!ethers.utils.isAddress(tokenAddr)) { toast('Endereço do Token inválido.', 'danger'); return; }
      if (!ethers.utils.isAddress(destAddr)) { toast('Endereço de destino inválido.', 'danger'); return; }
      if (!amountStr || !(parseFloat(amountStr) > 0)) { toast('Informe um valor válido (> 0).', 'warning'); return; }

      const prov = signer?.provider || provider || rpcProvider || web3Provider;
      const code = await (prov ? prov.getCode(tokenAddr) : Promise.resolve('0x'));
      if (code === '0x') { toast('Contrato Token inexistente na rede atual.', 'danger'); return; }

      const transferAbi = (Array.isArray(tokenAbi) && tokenAbi.length) ? tokenAbi : [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)'
      ];
      const token = new ethers.Contract(tokenAddr, transferAbi, signer);
      const decimals = await token.decimals().catch(() => 18);
      const amount = ethers.utils.parseUnits(amountStr, decimals);

      const fromAddr = await signer.getAddress();
      const fromBal = await token.balanceOf(fromAddr).catch(() => null);
      if (fromBal && fromBal.lt(amount)) { toast('Saldo insuficiente do remetente.', 'warning'); return; }

      const btn = document.getElementById('inlineSend_tokenContract'); if (btn) btn.disabled = true;
      const txInfoEl = document.getElementById('inlineTx_tokenContract'); if (txInfoEl) txInfoEl.innerHTML = '<span class="text-warning">Solicitando assinatura...</span>';

      const tx = await token.transfer(destAddr, amount);
      const hash = tx.hash;
      let explorer = '';
      try { const net = await (prov ? prov.getNetwork() : Promise.resolve({ chainId: 97 })); explorer = typeof getFallbackExplorer === 'function' ? (getFallbackExplorer(net.chainId) || '') : ''; } catch (_e) { }
      const url = explorer ? `${explorer}/tx/${hash}` : `https://testnet.bscscan.com/tx/${hash}`;
      if (txInfoEl) txInfoEl.innerHTML = `<span class="text-warning">Tx enviada: <a href="${url}" target="_blank">${hash}</a> • aguardando confirmação...</span>`;

      const rc = await tx.wait();
      if (txInfoEl) {
        const successMsg = `<span class="text-success">Enviado com sucesso: <a href="${url}" target="_blank">${hash}</a></span>`;
        txInfoEl.innerHTML = successMsg;
        // persistir para restaurar após re-render
        window.widgetInlineLastTxMsg = successMsg;
      }
      if (btn) btn.disabled = false;

      // Atualizar saldos inline
      if (typeof window.autoFetchField === 'function') {
        window.autoFetchField('tokenContract');
        window.autoFetchField('saleContract');
        window.autoFetchField('buyerWallet');
        window.autoFetchField('receiverWallet');
      }
    } catch (e) {
      addDebug('InlineTransferError', e.message || e);
      const txInfoEl = document.getElementById('inlineTx_tokenContract');
      if (txInfoEl) txInfoEl.innerHTML = `<span class="text-danger">Erro: ${e.message || e}</span>`;
    }
  })();
}

// ============================================================================
// INTEGRAÇÃO COM WIDGET GENERATOR (validação e geração)
// ============================================================================

/**
 * Valida configuração completa antes de permitir geração
 * Atualiza checklist visual e habilita/desabilita botão "Gerar Widget"
 */
async function validateWidgetConfig() {
  const checks = {
    network: false,
    sale: false,
    receiver: false,
    saleAbi: false,
    purchase: false
  };
  
  const errors = [];
  const warnings = [];
  
  // 1. Rede selecionada e RPC funcional
  let rpcUrl = $('rpcUrl')?.value?.trim();
  const chainId = window.widgetSelectedChainId || 97;
  // Se DOM não possuir rpcUrl, tentar recuperar do provider atual ou override
  if (!rpcUrl) {
    try { rpcUrl = rpcProvider?.connection?.url || rpcUrl; } catch (_) { }
    if (!rpcUrl && typeof window.widgetRpcOverride === 'string') rpcUrl = window.widgetRpcOverride;
    if (!rpcUrl) rpcUrl = getFallbackRpc(chainId);
  }
  debugJSON('Validação - entrada', { rpcUrl, chainId, hasSaleAbi: Array.isArray(saleAbi) && saleAbi.length > 0 });

  if (rpcUrl) {
    // Testar se RPC está respondendo
    try {
      if (!rpcProvider) {
        rpcProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
      }
      // Timeout de 3 segundos para evitar travar a UI
      const networkPromise = rpcProvider.getNetwork();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC timeout')), 3000)
      );
      
      await Promise.race([networkPromise, timeoutPromise]);
      checks.network = true;
      addDebug('Validação - RPC OK');
    } catch (e) {
      warnings.push(`RPC não responde: ${e.message}. Usando fallback.`);
      // Aplicar fallback automaticamente
      const fallbackUrl = getFallbackRpc(chainId);
      if (fallbackUrl) {
        try {
          rpcProvider = new ethers.providers.JsonRpcProvider(fallbackUrl);
          await rpcProvider.getNetwork();
          const hidden = $('rpcUrl'); 
          if (hidden) hidden.value = fallbackUrl;
          const codeEl = $('rpcUrlCode'); 
          if (codeEl) codeEl.textContent = fallbackUrl;
          checks.network = true;
          addDebug(`RPC fallback aplicada: ${fallbackUrl}`);
        } catch (e2) {
          errors.push('RPC não configurado ou indisponível');
        }
      } else {
        errors.push('RPC não configurado');
      }
    }
  } else {
    errors.push('RPC não configurado');
  }
  
  // 2. Contrato Sale válido
  const saleAddr = $('saleContract')?.value?.trim();
  if (saleAddr && ethers.utils.isAddress(saleAddr)) {
    checks.sale = true;
    addDebug(`Validação - Sale OK: ${shortAddr(saleAddr)}`);
  } else {
    errors.push('Endereço Sale inválido ou vazio');
    addDebug('Validação - Sale inválido');
  }
  
  // 3. Carteira recebedora (receiverWallet) - OPCIONAL
  const receiverAddr = $('receiverWallet')?.value?.trim();
  if (receiverAddr && ethers.utils.isAddress(receiverAddr)) {
    checks.receiver = true;
    addDebug(`Validação - Receiver informado: ${shortAddr(receiverAddr)}`);
  } else {
    // Receiver é opcional, então não é erro crítico
    warnings.push('ReceiverWallet não configurado (tentará auto-detectar)');
    checks.receiver = true; // Marcar como OK mesmo sem preencher
    addDebug('Validação - Receiver ausente (tentará auto-detectar ao gerar)');
  }
  
  // 4. ABI do Sale carregada
  if (Array.isArray(saleAbi) && saleAbi.length > 0) {
    checks.saleAbi = true;
    addDebug(`Validação - Sale ABI itens: ${saleAbi.length}`);
  } else {
    errors.push('ABI do Sale não carregada (clique em "Carregar ABIs")');
    addDebug('Validação - Sale ABI ausente');
  }
  
  // 5. Função de compra detectável
  if (checks.saleAbi) {
    try {
      const purchaseFunc = WidgetGenerator.detectPurchaseFunction(saleAbi);
      if (purchaseFunc?.name) {
        checks.purchase = true;
        debugJSON('Validação - Função detectada', purchaseFunc);
      } else {
        errors.push('Nenhuma função payable encontrada no Sale');
        addDebug('Validação - Nenhuma função payable encontrada');
      }
    } catch (e) {
      errors.push(`Erro ao detectar função de compra: ${e.message}`);
      addDebug(`Validação - Erro detectando função: ${e.message}`);
    }
  }
  
  // Atualizar checklist visual
  updateChecklistUI(checks);
  
  // Habilitar/desabilitar botão de gerar
  const generateBtn = $('generateWidget');
  const allRequired = checks.network && checks.sale && checks.saleAbi && checks.purchase;
  
  if (generateBtn) {
    generateBtn.disabled = !allRequired;
    if (!allRequired) {
      generateBtn.title = 'Complete a validação para gerar o widget';
    } else {
      generateBtn.title = 'Clique para gerar configuração JSON';
    }
  }
  
  // Log para debug
  if (errors.length > 0) {
    addDebug(`Validação: ${errors.length} erro(s) - ${errors.join('; ')}`);
  }
  if (warnings.length > 0) {
    addDebug(`Validação: ${warnings.length} aviso(s) - ${warnings.join('; ')}`);
  }
  debugJSON('Validação - checklist', { checks, allRequired });
  
  return {
    valid: allRequired,
    checks,
    errors,
    warnings
  };
}

/**
 * Atualiza os ícones do checklist visual
 */
function updateChecklistUI(checks) {
  const icons = {
    network: $('checkNetwork'),
    sale: $('checkSale'),
    receiver: $('checkReceiver'),
    saleAbi: $('checkSaleAbi'),
    purchase: $('checkPurchase')
  };
  
  Object.keys(checks).forEach(key => {
    const icon = icons[key];
    if (!icon) return;
    
    if (checks[key]) {
      icon.textContent = '✅';
      icon.classList.remove('text-muted', 'text-warning');
      icon.classList.add('text-success');
    } else {
      icon.textContent = '⏳';
      icon.classList.remove('text-success', 'text-muted');
      icon.classList.add('text-warning');
    }
  });
}

/**
 * Gera widget completo (JSON + snippet + preview)
 */
async function generateWidget() {
  try {
    addDebug('Gerar Widget - iniciado');
    
    // Validar novamente
    const validation = await validateWidgetConfig();
    if (!validation.valid) {
      toast('Corrija os erros de validação antes de gerar', 'danger');
      debugJSON('Gerar Widget - falha na validação', validation);
      return;
    }
    
    // Conectar carteira se não estiver conectada
    if (!signer) {
      toast('Conecte a carteira para gerar o widget', 'warning');
      await connectWallet();
      if (!signer) {
        throw new Error('Falha ao conectar carteira');
      }
    }
    
  const ownerAddr = await signer.getAddress();
  const ownerChecksum = ethers.utils.getAddress(ownerAddr);
  addDebug(`Gerar Widget - owner: ${shortAddr(ownerChecksum)}`);
    
    // Coletar dados do formulário
    const networkChainId = window.widgetSelectedChainId || 97;
    const networkName = window.widgetSelectedNetworkName || 'BSC Testnet';
    const networkRpc = $('rpcUrl')?.value?.trim() || (rpcProvider?.connection?.url || '');

    const saleAddress = ethers.utils.getAddress($('saleContract')?.value?.trim() || '');
  let receiverAddress = '';
    let tokenAddress = '';

    // ReceiverWallet (opcional) - tentar auto-detectar se vazio
    const receiverInput = $('receiverWallet')?.value?.trim();
    if (receiverInput && ethers.utils.isAddress(receiverInput)) {
      receiverAddress = ethers.utils.getAddress(receiverInput);
    }
    if (!receiverAddress) {
      try {
        const prov = signer?.provider || rpcProvider || new ethers.providers.JsonRpcProvider(networkRpc || getFallbackRpc(networkChainId));
        const minimal = [
          'function destinationWallet() view returns (address)'
        ];
        const sale = new ethers.Contract(saleAddress, minimal, prov);
        const autoRecv = await sale.destinationWallet();
        if (autoRecv && ethers.utils.isAddress(autoRecv)) {
          receiverAddress = ethers.utils.getAddress(autoRecv);
          const rw = $('receiverWallet'); if (rw && !rw.value) rw.value = receiverAddress;
          addDebug(`Receiver auto-detectado: ${receiverAddress}`);
        }
      } catch (_) { /* silencioso, seguirá sem receiver */ }
      if (!receiverAddress) addDebug('Gerar Widget - receiver não informado e não detectado');
    }

    // Token (opcional)
    const tokenInput = $('tokenContract')?.value?.trim();
    if (tokenInput && ethers.utils.isAddress(tokenInput)) {
      tokenAddress = ethers.utils.getAddress(tokenInput);
    }

    // Detectar função de compra a partir da ABI do Sale
    const detectedPurchase = WidgetGenerator.detectPurchaseFunction(saleAbi || []);
    if (!detectedPurchase) {
      addDebug('Gerar Widget - nenhuma função payable detectada');
      throw new Error('Não foi possível detectar uma função payable no contrato Sale.');
    }
    debugJSON('Gerar Widget - função de compra', detectedPurchase);

    // Gerar código único do widget
    const code = WidgetGenerator.generateWidgetCode(ownerChecksum);

    // Montar estrutura esperada pelo gerador
    const genInput = {
      owner: ownerChecksum,
      code,
      chainId: Number(networkChainId),
      rpcUrl: networkRpc,
      saleContract: saleAddress,
      receiverWallet: receiverAddress,
      tokenContract: tokenAddress,
      purchaseFunction: detectedPurchase,
      saleAbi: saleAbi || [],
      tokenAbi: tokenAbi || [],
      ui: {
        theme: 'light',
        language: 'pt-BR',
        showTestButton: true,
        currencySymbol: (window.widgetSelectedNetworkSymbol || 'BNB'),
        texts: {
          title: 'Compre seus tokens',
          description: 'Finalize sua compra com segurança.',
          buyButton: 'Comprar agora'
        }
      }
    };
    
    // Gerar JSON completo via WidgetGenerator
  const widgetConfig = WidgetGenerator.generateWidgetConfig(genInput);
  addDebug(`Gerar Widget - config OK: ${widgetConfig.code}`);
    
    addDebug(`Widget gerado: code=${widgetConfig.code}`);
    
    // Exibir código do widget
    const codeEl = $('widgetCode');
    if (codeEl) {
      if ('value' in codeEl) codeEl.value = widgetConfig.code; else codeEl.textContent = widgetConfig.code;
    }
    
    // Gerar snippet de incorporação
  const snippet = WidgetGenerator.generateSnippet(ownerChecksum, widgetConfig.code);
    const snippetEl = $('widgetSnippet');
    if (snippetEl) {
      if ('value' in snippetEl) snippetEl.value = snippet; else snippetEl.textContent = snippet;
    }
    const snippetArea = $('widgetSnippetArea');
    if (snippetArea) snippetArea.classList.remove('d-none');
    
    // Habilitar botões de download/cópia
  const downloadBtn = $('downloadJSON');
  const copyBtn = $('copySnippet');
    
    if (downloadBtn) {
      downloadBtn.disabled = false;
      downloadBtn.onclick = () => WidgetGenerator.downloadJSON(widgetConfig);
    }
    
    if (copyBtn) {
      copyBtn.disabled = false;
      copyBtn.onclick = async () => {
        const success = await WidgetGenerator.copyToClipboard(snippet);
        if (success) {
          toast('Snippet copiado!', 'success');
          addDebug('Snippet copiado para clipboard');
        }
      };
    }
    
    // Renderizar preview
  // Incluir "name" no objeto usado pelo preview para exibição
  const previewConfig = { ...widgetConfig, network: { ...widgetConfig.network, name: networkName } };
    renderWidgetPreview(previewConfig);
    
    // Salvar JSON no servidor (apenas em ambiente local com Flask)
    try {
      addDebug('Salvando JSON no servidor...');
      const saveResponse = await fetch('/api/widget/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          owner: ownerChecksum,
          code: widgetConfig.code,
          config: widgetConfig
        })
      });
      
      addDebug(`Save response status: ${saveResponse.status} ${saveResponse.statusText}`);
      
      if (saveResponse.ok) {
        let saveResult;
        try {
          saveResult = await saveResponse.json();
        } catch (jsonErr) {
          const textResponse = await saveResponse.text();
          addDebug(`Resposta não é JSON válido: ${textResponse.substring(0, 200)}`);
          throw new Error('Servidor retornou resposta inválida');
        }
        addDebug(`✅ JSON salvo no servidor: ${saveResult.path}`);
        toast('Widget gerado e salvo no servidor!', 'success');
      } else if (saveResponse.status === 404) {
        // Ambiente sem Flask (produção/virtual)
        addDebug('ℹ️ Servidor Flask não disponível. Use "Download JSON" para salvar.');
        toast('Widget gerado! Use "Download JSON" para salvar o arquivo.', 'info');
      } else {
        let errorMsg = 'Erro desconhecido';
        try {
          // Use clone para evitar erro de stream já lido
          const clone = saveResponse.clone();
          const errorData = await clone.json();
          errorMsg = errorData.error || errorData.message || `HTTP ${saveResponse.status}`;
        } catch {
          try {
            const cloneText = saveResponse.clone();
            const textError = await cloneText.text();
            errorMsg = (textError || '').substring(0, 200) || `HTTP ${saveResponse.status}`;
          } catch (_e2) {
            errorMsg = `HTTP ${saveResponse.status}`;
          }
        }
        addDebug(`⚠️ Erro ao salvar no servidor: ${errorMsg}`);
        toast('Widget gerado, mas falhou ao salvar no servidor. Use Download JSON.', 'warning');
      }
    } catch (saveError) {
      // Erro de rede (servidor não está rodando ou CORS)
      addDebug(`ℹ️ Não foi possível conectar ao servidor: ${saveError.message}`);
      addDebug('💡 Use "Download JSON" e hospede o arquivo manualmente em /widget/gets/<owner>/<code>.json');
      toast('Widget gerado! Use "Download JSON" para salvar.', 'info');
    }
    
    toast('Widget gerado com sucesso!', 'success');
    addDebug('Gerar Widget - concluído com sucesso');
    
  } catch (error) {
    addDebug(`Gerar Widget - erro: ${error.message}`);
    toast(`Erro: ${error.message}`, 'danger');
  }
}

/**
 * Renderiza preview do widget em iframe
 */
function renderWidgetPreview(config) {
  const previewContainer = $('widgetPreviewContainer');
  if (!previewContainer) return;
  
  // Criar iframe com HTML standalone
  const iframe = document.createElement('iframe');
  iframe.style.width = '100%';
  iframe.style.height = '600px';
  iframe.style.border = '1px solid #ddd';
  iframe.style.borderRadius = '8px';
  
  previewContainer.innerHTML = '';
  previewContainer.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  
  // HTML completo para preview
  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Preview Widget - ${config.code}</title>
      <style>
        body { 
          font-family: sans-serif; 
          padding: 2rem; 
          background: #f5f5f5; 
        }
        .preview-info {
          background: white;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
          border-left: 4px solid #ff6b35;
        }
      </style>
    </head>
    <body>
      <div class="preview-info">
        <strong>Preview do Widget</strong>
        <p style="margin:0.5rem 0 0;font-size:0.9rem;color:#666;">
          Code: <code>${config.code}</code><br>
          Owner: <code>${config.owner}</code><br>
          Network: ${config.network.name} (ChainId ${config.network.chainId})
        </p>
      </div>
      
      <!-- Widget será carregado aqui -->
      <div class="tokencafe-widget" 
           data-owner="${config.owner}" 
           data-code="${config.code}">
        <p style="text-align:center;padding:2rem;color:#999;">
          ⏳ Carregando widget...<br>
          <small>(Em produção, o loader seria externo)</small>
        </p>
      </div>
      
      <script>
        // Simular carregamento do widget (em prod seria tokencafe-widget.min.js)
        console.log('Preview widget:', {
          owner: '${config.owner}',
          code: '${config.code}',
          config: ${JSON.stringify(config, null, 2)}
        });
        
        // Placeholder de UI (em produção o loader renderizaria a UI completa)
        setTimeout(() => {
          const container = document.querySelector('.tokencafe-widget');
          container.innerHTML = \`
            <div style="max-width:420px;margin:0 auto;padding:1.5rem;background:white;border:2px solid #ddd;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);">
              <h3 style="margin:0 0 0.5rem;text-align:center;">${config.ui?.texts?.title || 'Compre seus tokens'}</h3>
              <p style="margin:0 0 1.5rem;text-align:center;color:#666;font-size:0.95rem;">${config.ui?.texts?.description || 'Preview do widget gerado'}</p>
              
              <label style="display:block;margin-bottom:0.5rem;font-weight:600;">Quantidade</label>
              <input type="number" value="100" style="width:100%;padding:0.75rem;margin-bottom:1rem;border:1px solid #ddd;border-radius:6px;"/>
              
              <label style="display:block;margin-bottom:0.5rem;font-weight:600;">Valor (${config.ui?.currencySymbol || 'BNB'})</label>
              <input type="text" value="0.1" style="width:100%;padding:0.75rem;margin-bottom:1.5rem;border:1px solid #ddd;border-radius:6px;"/>
              
              <button style="width:100%;padding:1rem;font-size:1.1rem;font-weight:700;color:white;background:#ff6b35;border:none;border-radius:8px;cursor:pointer;">
                ${config.ui?.texts?.buyButton || 'Comprar Agora'}
              </button>
              
              <p style="margin-top:1.5rem;padding-top:1rem;border-top:1px solid #ddd;text-align:center;font-size:0.75rem;color:#999;">
                Powered by <strong>TokenCafe</strong> v1.0.0
              </p>
            </div>
          \`;
        }, 500);
      </script>
    </body>
    </html>
  `;
  
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();
  
  addDebug('Preview renderizado no iframe');
}

// Expor funções globalmente para uso nos event listeners
window.validateWidgetConfig = validateWidgetConfig;
window.generateWidget = generateWidget;

