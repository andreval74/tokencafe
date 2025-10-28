// TOKENCAFE - WIDGET TESTE (módulo)
// Refatoração da lógica inline de pages/modules/widget/widget-teste.html
// Segue diretriz: sem scripts inline; inicialização via PageManager

import PageManager from '../../shared/page-manager.js';

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

// Fallbacks mínimos para redes populares
function getFallbackRpc(chainId) {
  switch (Number(chainId)) {
    case 56: return 'https://bsc-dataseed.binance.org';
    case 97: return 'https://bsc-testnet.publicnode.com';
    case 1: return 'https://eth.llamarpc.com';
    case 137: return 'https://polygon-rpc.com';
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
  try { console.log(`[${now}] WidgetTeste:`, msg); } catch(_) {}
}
function log(msg) {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] WidgetTeste: ${msg}`);
  } catch {}
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
  } catch {}
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
    try { nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch(_) {}
  }
}

function loadAbis() {
  try {
    const tokEl = $('tokenAbiText');
    const saleEl = $('saleAbiText');
    tokenAbi = JSON.parse(tokEl ? (tokEl.value || '[]') : '[]');
    saleAbi = JSON.parse(saleEl ? (saleEl.value || '[]') : '[]');
    log(`✅ ABIs carregadas: token=${(tokenAbi && tokenAbi.length) || 0}, sale=${(saleAbi && saleAbi.length) || 0}`);
    const el = $('checkSaleBtn'); if (el) el.classList.remove('disabled');
    const stRun = $('status-runChecksBtn'); if (stRun) { stRun.textContent = 'Pronto'; stRun.className = 'step-status ready mt-1'; }
    advanceToNextStep('runChecksBtn');
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
    try { console.error('WidgetTeste: RPC inválida', { rpcElExists: !!rpcEl, override: window.widgetRpcOverride, status: window.walletConnector?.getStatus?.() }); } catch(_) {}
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
      try { console.error('WidgetTeste: Falha ao validar RPC', { rpcUrl, error: e, fallbackError: e2 }); } catch(_) {}
    }
  }
}

// Helpers UI para verificação de saldos
function setBalanceLoading(visible){
  const btn = document.getElementById('checkBalance');
  const loading = document.getElementById('balanceLoading');
  if(btn){ btn.disabled = !!visible; btn.setAttribute('aria-busy', visible ? 'true':'false'); }
  if(loading){ loading.classList.toggle('d-none', !visible); }
}

function withTimeout(promise, ms, label){
  return new Promise((resolve, reject)=>{
    const timer = setTimeout(()=>{
      reject(new Error(`Timeout após ${ms}ms${label?` (${label})`:''}`));
    }, ms);
    promise.then(v=>{ clearTimeout(timer); resolve(v); })
           .catch(e=>{ clearTimeout(timer); reject(e); });
  });
}

function renderBalanceSummary(summary){
  const sumEl = document.getElementById('balanceSummary');
  if(!sumEl || !summary) return;
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

async function checkSaleBalance(){
  try{
    setBalanceLoading(true);
    log('— Verificando saldos —');

    const rpcInput = (document.getElementById('rpcUrl')?.value||'').trim();
    const rpcUrl = (typeof sanitizeRpcUrl === 'function') ? sanitizeRpcUrl(rpcInput) : rpcInput;

    let prov = null;
    try{
      if(typeof rpcProvider !== 'undefined' && rpcProvider) prov = rpcProvider;
      else if(typeof web3Provider !== 'undefined' && web3Provider) prov = web3Provider;
      else if(typeof signer !== 'undefined' && signer && signer.provider) prov = signer.provider;
      else if(typeof provider !== 'undefined' && provider) prov = provider;
    }catch(_e){ }

    if(!prov){
      let candidateUrl = rpcUrl;
      if(!candidateUrl){
        const overrideUrl = (window.widgetRpcOverride && window.widgetRpcOverride.rpcUrl) || '';
        const status = (window.walletConnector && window.walletConnector.getStatus) ? window.walletConnector.getStatus() : null;
        const statusRpc = status && status.network && Array.isArray(status.network.rpc) ? status.network.rpc[0] : '';
        candidateUrl = sanitizeRpcUrl ? sanitizeRpcUrl(overrideUrl || statusRpc || '') : (overrideUrl || statusRpc || '');
      }
      if(candidateUrl){
        try{ prov = new ethers.providers.JsonRpcProvider(candidateUrl); }
        catch(e){ addDebug('ProvInitError', e); }
      }
    }

    const fallbackProv = new ethers.providers.StaticJsonRpcProvider('https://bsc-testnet.publicnode.com', { chainId: 97, name: 'bsc-testnet' });
    if(!prov){
      prov = fallbackProv;
      log('⚠️ RPC inválida ou indisponível, usando fallback BSC Testnet (97).');
    }

    const tokenAddr = (document.getElementById('tokenContract')?.value||'').trim();
    const saleAddr = (document.getElementById('saleContract')?.value||'').trim();
    const buyerAddr = (document.getElementById('buyerWallet')?.value||'').trim();
    const receiverAddr = (document.getElementById('receiverWallet')?.value||'').trim();

    const getNativeBalance = async (addr, label) => {
      try{ return await withTimeout(prov.getBalance(addr), 5000, `${label}.getBalance`); }
      catch(e){ addDebug(`${label}NativeTimeout`, e.message);
        try{ log('⚠️ Timeout/erro na RPC, lendo nativo via fallback...'); return await withTimeout(fallbackProv.getBalance(addr), 5000, `${label}.getBalance(fallback)`); }
        catch(e2){ addDebug(`${label}NativeFallbackError`, e2.message); return ethers.BigNumber.from(0); }
      }
    };

    // Verificação de código do contrato nas duas RPCs (primária e fallback)
    let primaryCode = '0x', fallbackCode = '0x';
    try{ primaryCode = await withTimeout(prov.getCode(tokenAddr), 5000, 'getCode(primary)'); }
    catch(e){ addDebug('TokenCodePrimaryTimeout', e.message); }
    try{ fallbackCode = await withTimeout(fallbackProv.getCode(tokenAddr), 5000, 'getCode(fallback)'); }
    catch(e){ addDebug('TokenCodeFallbackTimeout', e.message); }
    addDebug('TokenCodePrimary', primaryCode);
    addDebug('TokenCodeFallback', fallbackCode);

    const primaryOk = primaryCode !== '0x';
    const fallbackOk = fallbackCode !== '0x';

    let tokenBalances = { sale: null, buyer: null, receiver: null, tokenContract: null, decimals: 18, flags: { saleFallback:false, buyerFallback:false, receiverFallback:false, tokenContractFallback:false, decimalsFallback:false } };

    if((primaryOk || fallbackOk) && Array.isArray(tokenAbi) && tokenAbi.length){
      try{
        const tokenPrimary = primaryOk ? new ethers.Contract(tokenAddr, tokenAbi, prov) : null;
        const tokenFallback = fallbackOk ? new ethers.Contract(tokenAddr, tokenAbi, fallbackProv) : null;

        let decimals = 18;
        if(tokenPrimary){
          decimals = await withTimeout(tokenPrimary.decimals(), 5000, 'token.decimals(primary)')
            .catch(async e=>{
              addDebug('TokenDecimalsPrimaryError', e.message);
              if(tokenFallback){
                try{ tokenBalances.flags.decimalsFallback = true; return await withTimeout(tokenFallback.decimals(), 5000, 'token.decimals(fallback)'); }
                catch(e2){ addDebug('TokenDecimalsFallbackError', e2.message); return 18; }
              }
              return 18;
            });
        } else if(tokenFallback){
          tokenBalances.flags.decimalsFallback = true;
          decimals = await withTimeout(tokenFallback.decimals(), 5000, 'token.decimals(fallback)').catch(e=>{ addDebug('TokenDecimalsFallbackError', e.message); return 18; });
        }

        const readBal = async (addr, label) => {
          if(tokenPrimary){
            try{ return await withTimeout(tokenPrimary.balanceOf(addr), 5000, `token.balanceOf(${label},primary)`); }
            catch(e){ addDebug(`${label}TokenPrimaryError`, e.message); }
          }
          if(tokenFallback){
            try{ tokenBalances.flags[`${label}Fallback`] = true; return await withTimeout(tokenFallback.balanceOf(addr), 5000, `token.balanceOf(${label},fallback)`); }
            catch(e2){ addDebug(`${label}TokenFallbackError`, e2.message); return null; }
          }
          return null;
        };

        const [saleBal, buyerBal, receiverBal, tokenContractBal] = await Promise.all([
          readBal(saleAddr,'sale'),
          readBal(buyerAddr,'buyer'),
          readBal(receiverAddr,'receiver'),
          readBal(tokenAddr,'tokenContract')
        ]);

        tokenBalances = { decimals, sale: saleBal, buyer: buyerBal, receiver: receiverBal, tokenContract: tokenContractBal, flags: tokenBalances.flags };
      }catch(err){ addDebug('TokenReadError', err); }
    } else {
      log('⚠️ Código do contrato Token não encontrado em nenhuma RPC. Exibindo apenas saldos nativos.');
    }

    const [tokenContractNative, saleNative, buyerNative, receiverNative] = await Promise.all([
      getNativeBalance(tokenAddr,'TokenContract'),
      getNativeBalance(saleAddr,'Sale'),
      getNativeBalance(buyerAddr,'Buyer'),
      getNativeBalance(receiverAddr,'Receiver')
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

    if(tokenBalances.tokenContract){ log(`🏷️ Token (Contrato): ${summary.tokenContract.token}${tokenBalances.flags.tokenContractFallback ? ' (fallback)' : ''}`); }
    log(`🏷️ Token (Contrato) BNB: ${summary.tokenContract.bnb}`);
    if(tokenBalances.sale){ log(`📊 Sale (Token): ${summary.sale.token}${tokenBalances.flags.saleFallback ? ' (fallback)' : ''}`); }
    log(`💎 Sale (BNB): ${summary.sale.bnb}`);
    if(tokenBalances.buyer){ log(`👤 Buyer (Token): ${summary.buyer.token}${tokenBalances.flags.buyerFallback ? ' (fallback)' : ''}`); }
    log(`👤 Buyer (BNB): ${summary.buyer.bnb}`);
    if(tokenBalances.receiver){ log(`🏦 Receiver (Token): ${summary.receiver.token}${tokenBalances.flags.receiverFallback ? ' (fallback)' : ''}`); }
    log(`🏦 Receiver (BNB): ${summary.receiver.bnb}`);

  }catch(e){
    log('❌ Erro ao verificar saldos: ' + e.message);
    addDebug('CheckSaleBalanceError', e);
  }finally{
    setBalanceLoading(false);
    const st = document.getElementById('status-checkBalance'); if(st){ st.textContent='Pronto'; st.className='step-status ready mt-1'; }
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
        try { console.error('WidgetTeste: Provider init error', { rpcUrl, provErr }); } catch(_) {}
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
    try { console.error('WidgetTeste: Erro simulatePayable', e); } catch(_) {}
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
  const form = $('checkerForm'); if (form) form.addEventListener('submit', (e) => { e.preventDefault(); testRPC(); loadAbis(); applySequencer(); setTimeout(()=>advanceToNextStep('runChecksBtn'), 150); });
  const b1 = $('checkBalance'); if (b1) b1.addEventListener('click', checkSaleBalance);
  const b1b = $('checkSaleBtn'); if (b1b) b1b.addEventListener('click', checkSaleBalance);
  const b2 = $('sendTokens'); if (b2) b2.addEventListener('click', sendTestTokens);
  const b3 = $('executeBuy'); if (b3) b3.addEventListener('click', executeBuy);
  const b4 = $('simulateBuy'); if (b4) b4.addEventListener('click', simulatePayable);
  const balEl = $('buyerBalance'); if (balEl) balEl.addEventListener('input', refreshBuyerBalanceStatus);
  const btnClear = $('btnClearNetworkSelection'); if (btnClear) btnClear.addEventListener('click', clearNetworkSelection);
  const networkClearBtn = $('networkClearBtn'); if (networkClearBtn) networkClearBtn.addEventListener('click', clearNetworkSelection);
  const btnDetails = $('networkDetailsBtn'); if (btnDetails) btnDetails.addEventListener('click', () => {
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

  // Address info icons
  const tokenInfo = $('tokenContractInfoBtn'); if (tokenInfo) tokenInfo.addEventListener('click', () => { const el=$('fieldBalance_tokenContract'); if (el){ const wasOpen = el.classList.contains('show'); el.classList.toggle('show'); if(!wasOpen){ try{ autoFetchField('tokenContract'); }catch(_){} } } });
  const saleInfo = $('saleContractInfoBtn'); if (saleInfo) saleInfo.addEventListener('click', () => { const el=$('fieldBalance_saleContract'); if (el){ const wasOpen = el.classList.contains('show'); el.classList.toggle('show'); if(!wasOpen){ try{ autoFetchField('saleContract'); }catch(_){} } } });
  const buyerInfo = $('buyerWalletInfoBtn'); if (buyerInfo) buyerInfo.addEventListener('click', () => { const el=$('fieldBalance_buyerWallet'); if (el){ const wasOpen = el.classList.contains('show'); el.classList.toggle('show'); if(!wasOpen){ try{ autoFetchField('buyerWallet'); }catch(_){} } } });
  const receiverInfo = $('receiverWalletInfoBtn'); if (receiverInfo) receiverInfo.addEventListener('click', () => { const el=$('fieldBalance_receiverWallet'); if (el){ const wasOpen = el.classList.contains('show'); el.classList.toggle('show'); if(!wasOpen){ try{ autoFetchField('receiverWallet'); }catch(_){} } } });

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
        const buyerEl = $('buyerAddress'); if (buyerEl) buyerEl.value = addr;
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
    const buyerEl = $('buyerAddress'); if (buyerEl) buyerEl.value = '';
    refreshBuyerBalanceStatus();
    log('🔌 Carteira desconectada (global).');
  });
  document.addEventListener('wallet:accountChanged', (e) => {
    const addr = e.detail && e.detail.account ? e.detail.account : null;
    if (addr) {
      const buyerEl = $('buyerAddress'); if (buyerEl) buyerEl.value = addr;
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

function setupAddressIcons(){
  try{
    const ids=['tokenContractInfoBtn','tokenContractTransferBtn','saleContractInfoBtn','buyerWalletInfoBtn','receiverWalletInfoBtn','networkDetailsBtn','networkClearBtn','btnClearNetworkSelection'];
    ids.forEach(id=>{
      const el = document.getElementById(id);
      if(!el) return;
      try{
        if(window.bootstrap && bootstrap.Tooltip){ new bootstrap.Tooltip(el); }
        else { el.setAttribute('data-bs-toggle','tooltip'); }
      }catch(_e){}
    });
  }catch(_e){ /* ignore */ }
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
  try { localStorage.setItem('widgetRpcOverride', JSON.stringify({ chainId: network.chainId, rpcUrl: rpc, name: network.name })); } catch {}
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
  try { localStorage.removeItem('widgetRpcOverride'); } catch {}
  const input = $('networkSearch'); if (input) { input.value = ''; delete input.dataset.chainId; }
  const info = $('selected-network-info'); if (info) info.classList.add('d-none');
  ['networkNameCode','chainIdCode','nativeCurrencyNameCode','nativeCurrencySymbolCode','explorerUrlCode'].forEach(id => {
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
            try { rpcProvider = new ethers.providers.JsonRpcProvider(obj.rpcUrl); } catch {}
          }
          toast(`Rede restaurada: ${obj.name || obj.chainId}`, 'info');
        }
      }
    } catch {}


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

(function ensureSingleCheckBalanceListener(){
  ['checkBalance','checkSaleBtn'].forEach(id=>{
    const btn = $(id);
    if (btn) btn.addEventListener('click', (e)=>checkSaleBalance(e), { capture: true });
  });
})();


(function(){
  // Debounce helper
  function debounce(fn, ms){ let t; return function(...args){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,args), ms); }; }

  const erc20Minimal = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)'
  ];

  // Inline field balance UI helpers
  function setFieldBalanceLoading(fieldId, isLoading){
    const el = document.getElementById(`fieldBalance_${fieldId}`);
    if(!el) return;
    if(isLoading){
      el.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Carregando…`;
    }
  }

  function renderFieldBalance(fieldId, data){
    const el = document.getElementById(`fieldBalance_${fieldId}`);
    if(!el) return;
    const nativeName = data.nativeName || 'Binance Coin';
    const tokenNote = data.tokenNote ? ` <small class="text-warning">${data.tokenNote}</small>` : '';

    if(data.meta){
        const sym = data.meta.symbol || 'TOKEN';
        const name = data.meta.name || '';
        const tokenBalText = `Saldo: ${data.token ?? 'N/A'}${tokenNote}`;
        const bnbBalText = `Saldo: ${data.bnb}`;
        el.innerHTML = `
          <div class="field-info-line values ${fieldId==='tokenContract'?'simple-3':'simple-3'}">
            <span class="fi-col1">${sym}</span>
            <span class="fi-col2">${name}</span>
            <span class="fi-col3">${tokenBalText}</span>
          </div>
          <div class="field-info-line values simple-3">
            <span class="fi-col1">BNB</span>
            <span class="fi-col2">${nativeName}</span>
            <span class="fi-col3">${bnbBalText}</span>
          </div>
          ${fieldId==='tokenContract' ? `
          <div class="mt-2">
            <div class="input-group input-group-sm">
              <input id="inlineAmount_tokenContract" class="form-control" placeholder="Valor a transferir para o contrato sale.">
              <button id="inlineSend_tokenContract" class="btn btn-primary" title="Enviar para Sale">transferir →</button>
            </div>
            <div id="inlineTx_tokenContract" class="field-tx mt-1"></div>
          </div>
          ` : ''}
        `;
        if(fieldId==='tokenContract'){
          const btn=document.getElementById('inlineSend_tokenContract');
          if(btn) btn.addEventListener('click', performInlineTransfer);
        }
        return;
      }

      const tokenBalText = `Saldo: ${data.token ?? 'N/A'}${tokenNote}`;
      const bnbBalText = `Saldo: ${data.bnb}`;
      el.innerHTML = `
        <div class="field-info-line values ${fieldId==='tokenContract'?'simple-3':'simple-3'}">
          <span class="fi-col1">Token</span>
          <span class="fi-col2">—</span>
          <span class="fi-col3">${tokenBalText}</span>
        </div>
        <div class="field-info-line values simple-3">
          <span class="fi-col1">BNB</span>
          <span class="fi-col2">${nativeName}</span>
          <span class="fi-col3">${bnbBalText}</span>
        </div>
        ${fieldId==='tokenContract' ? `
        <div class="mt-2">
          <label for="inlineAmount_tokenContract" class="form-label small mb-1">Valor a transferir para o contrato sale</label>
          <div class="input-group input-group-sm">
            <input id="inlineAmount_tokenContract" class="form-control" placeholder="Valor">
            <button id="inlineSend_tokenContract" class="btn btn-primary" title="Enviar para Sale">→</button>
          </div>
          <div id="inlineTx_tokenContract" class="field-tx mt-1"></div>
        </div>
        ` : ''}
      `;
      if(fieldId==='tokenContract'){
        const btn=document.getElementById('inlineSend_tokenContract');
        if(btn) btn.addEventListener('click', performInlineTransfer);
      }
  }

  async function autoFetchField(fieldId){
    try{
      const addr = (document.getElementById(fieldId)?.value||'').trim();
      let tokenAddrInput = (document.getElementById('tokenContract')?.value||'').trim();
      if(!addr || !ethers.utils.isAddress(addr)){
        renderFieldBalance(fieldId, { token: null, bnb: '—' });
        return;
      }
      setFieldBalanceLoading(fieldId, true);

      // Resolve providers (primary and fallback)
      let prov = null;
      try{
        if(typeof rpcProvider !== 'undefined' && rpcProvider) prov = rpcProvider;
        else if(typeof web3Provider !== 'undefined' && web3Provider) prov = web3Provider;
        else if(typeof signer !== 'undefined' && signer && signer.provider) prov = signer.provider;
        else if(typeof provider !== 'undefined' && provider) prov = provider;
      }catch(_e){ }
      const rpcInput = (document.getElementById('rpcUrl')?.value||'').trim();
      const rpcUrl = (typeof sanitizeRpcUrl === 'function') ? sanitizeRpcUrl(rpcInput) : rpcInput;
      if(!prov){
        let candidateUrl = rpcUrl;
        if(!candidateUrl){
          const overrideUrl = (window.widgetRpcOverride && window.widgetRpcOverride.rpcUrl) || '';
          const status = (window.walletConnector && window.walletConnector.getStatus) ? window.walletConnector.getStatus() : null;
          const statusRpc = status && status.network && Array.isArray(status.network.rpc) ? status.network.rpc[0] : '';
          candidateUrl = sanitizeRpcUrl ? sanitizeRpcUrl(overrideUrl || statusRpc || '') : (overrideUrl || statusRpc || '');
        }
        if(candidateUrl){
          try{ prov = new ethers.providers.JsonRpcProvider(candidateUrl); }
          catch(e){ addDebug('ProvInitErrorInline', e); }
        }
      }
      const fallbackProv = new ethers.providers.StaticJsonRpcProvider('https://bsc-testnet.publicnode.com', { chainId: 97, name: 'bsc-testnet' });
      if(!prov){ prov = fallbackProv; }

      // Native currency name
      let nativeName = 'Binance Coin';
      try{
        const net = await withTimeout(prov.getNetwork(), 2000, 'getNetwork');
        const cid = net?.chainId; const nm = (net?.name || '').toLowerCase();
        if(cid===1 || nm==='homestead') nativeName = 'Ether';
        else if(cid===56 || cid===97 || nm.includes('bsc')) nativeName = 'Binance Coin';
        else nativeName = net?.name || 'Native';
      }catch(_e){ /* mantém default */ }

      // Native balance
      const getNativeBalance = async (a,label)=>{
        try{ return await withTimeout(prov.getBalance(a), 5000, `${label}.getBalance`); }
        catch(e){ addDebug(`${label}NativeInlineTimeout`, e.message);
          try{ return await withTimeout(fallbackProv.getBalance(a), 5000, `${label}.getBalance(fallback)`); }
          catch(e2){ addDebug(`${label}NativeInlineFallbackError`, e2.message); return ethers.BigNumber.from(0); }
        }
      };

      // Determine token address to read metadata from
      let tokenAddrForMeta = tokenAddrInput;
      if(fieldId === 'tokenContract') tokenAddrForMeta = addr; // usar o próprio endereço

      // If sale contract, try reading saleToken from saleAbi and compare
      let saleTokenAddr = null; let saleTokenMismatch = false;
      if(fieldId === 'saleContract' && Array.isArray(saleAbi) && saleAbi.length){
        try{
          const salePrimary = new ethers.Contract(addr, saleAbi, prov);
          saleTokenAddr = await withTimeout(salePrimary.saleToken(), 5000, 'sale.saleToken(primary)');
        }catch(e){
          addDebug('InlineSaleTokenPrimaryError', e.message);
          try{
            const saleFallback = new ethers.Contract(addr, saleAbi, fallbackProv);
            saleTokenAddr = await withTimeout(saleFallback.saleToken(), 5000, 'sale.saleToken(fallback)').catch(()=>null);
          }catch(e2){ addDebug('InlineSaleTokenFallbackError', e2.message); }
        }
        if(saleTokenAddr && ethers.utils.isAddress(saleTokenAddr)){
          if(tokenAddrForMeta && ethers.utils.isAddress(tokenAddrForMeta) && saleTokenAddr.toLowerCase() !== tokenAddrForMeta.toLowerCase()){
            saleTokenMismatch = true;
            tokenAddrForMeta = saleTokenAddr; // usar o real configurado no Sale
          }
        }
      }

      // Token metadata + balances
      let meta = null; let decimals = 18; let tokenNote = '';
      let tokenBal = null;
      if(tokenAddrForMeta && ethers.utils.isAddress(tokenAddrForMeta)){
        let primaryCode='0x', fallbackCode='0x';
        try{ primaryCode = await withTimeout(prov.getCode(tokenAddrForMeta), 5000, 'getCode(primary)'); }catch(e){ addDebug('InlineTokenCodePrimaryTimeout', e.message); }
        try{ fallbackCode = await withTimeout(fallbackProv.getCode(tokenAddrForMeta), 5000, 'getCode(fallback)'); }catch(e){ addDebug('InlineTokenCodeFallbackTimeout', e.message); }
        const abiToUse = Array.isArray(tokenAbi) && tokenAbi.length ? tokenAbi : erc20Minimal;
        const tokenPrimary = (primaryCode !== '0x') ? new ethers.Contract(tokenAddrForMeta, abiToUse, prov) : null;
        const tokenFallback = (fallbackCode !== '0x') ? new ethers.Contract(tokenAddrForMeta, abiToUse, fallbackProv) : null;
        // decimals
        if(tokenPrimary){
          decimals = await withTimeout(tokenPrimary.decimals(), 5000, 'token.decimals(primary)').catch(async e=>{
            addDebug('InlineDecimalsPrimaryError', e.message);
            if(tokenFallback){ tokenNote='(fallback)'; return await withTimeout(tokenFallback.decimals(), 5000, 'token.decimals(fallback)').catch(()=>18); }
            return 18;
          });
        } else if(tokenFallback){ tokenNote='(fallback)'; decimals = await withTimeout(tokenFallback.decimals(), 5000, 'token.decimals(fallback)').catch(()=>18); }
        // name/symbol/totalSupply
        const readMeta = async (c)=>{
          try{
            const [nm, sym, ts] = await Promise.all([
              withTimeout(c.name(), 5000, 'token.name'),
              withTimeout(c.symbol(), 5000, 'token.symbol'),
              withTimeout(c.totalSupply(), 5000, 'token.totalSupply')
            ]);
            return { name: nm, symbol: sym, totalSupply: ethers.utils.formatUnits(ts, decimals) };
          }catch(e){ addDebug('InlineMetaError', e.message); return null; }
        };
        meta = tokenPrimary ? await readMeta(tokenPrimary) : null;
        if(!meta && tokenFallback){ tokenNote='(fallback)'; meta = await readMeta(tokenFallback); }
        // balanceOf for the current address (addr)
        const readBal = async (c)=>{
          try{ return await withTimeout(c.balanceOf(addr), 5000, 'token.balanceOf'); }
          catch(e){ addDebug('InlineBalanceOfError', e.message); return null; }
        };
        tokenBal = tokenPrimary ? await readBal(tokenPrimary) : null;
        if(!tokenBal && tokenFallback){ tokenNote='(fallback)'; tokenBal = await readBal(tokenFallback); }
      }

      // Native balance for the address
      const nativeBal = await getNativeBalance(addr, fieldId);
      const fmtNative = v => ethers.utils.formatEther(v || ethers.BigNumber.from(0));
      const fmtToken = (v,d)=> v ? ethers.utils.formatUnits(v, d||18) : null;
      renderFieldBalance(fieldId, {
        meta,
        token: fmtToken(tokenBal, decimals),
        bnb: fmtNative(nativeBal),
        tokenNote,
        nativeName
      });
    }catch(e){ addDebug('AutoFetchFieldError', e); }
  }

  function setupAutoFieldBalances(){
    const ids=['tokenContract','saleContract','buyerWallet','receiverWallet'];
    ids.forEach(id=>{
      const el=document.getElementById(id); if(!el) return;
      const deb=debounce(()=>autoFetchField(id), 600);
      el.addEventListener('input', deb);
      el.addEventListener('blur', ()=>autoFetchField(id));
      // initial fetch
      setTimeout(()=>autoFetchField(id), 300);
    });
    const rpcEl=document.getElementById('rpcUrl');
    if(rpcEl){ const deb=debounce(()=>{ ids.forEach(id=>autoFetchField(id)); }, 800); rpcEl.addEventListener('input', deb); }
  }

  document.addEventListener('DOMContentLoaded', ()=>{ try{ setupAutoFieldBalances(); }catch(_e){} });
})();


function performInlineTransfer(){
  (async()=>{
    try{
      if(!signer){ toast('Conecte a carteira para enviar.', 'warning'); return; }
      const tokenAddr = (document.getElementById('tokenContract')?.value||'').trim();
      const destAddr = (document.getElementById('saleContract')?.value||'').trim();
      const amountStr = (document.getElementById('inlineAmount_tokenContract')?.value||'').trim();
      if(!ethers.utils.isAddress(tokenAddr)){ toast('Endereço do Token inválido.', 'danger'); return; }
      if(!ethers.utils.isAddress(destAddr)){ toast('Endereço de destino inválido.', 'danger'); return; }
      if(!amountStr || !(parseFloat(amountStr)>0)){ toast('Informe um valor válido (> 0).', 'warning'); return; }

      const prov = signer?.provider || provider || rpcProvider || web3Provider;
      const code = await (prov ? prov.getCode(tokenAddr) : Promise.resolve('0x'));
      if(code === '0x'){ toast('Contrato Token inexistente na rede atual.', 'danger'); return; }

      const transferAbi = (Array.isArray(tokenAbi) && tokenAbi.length) ? tokenAbi : [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function decimals() view returns (uint8)',
        'function balanceOf(address) view returns (uint256)',
        'function transfer(address to, uint256 amount) returns (bool)'
      ];
      const token = new ethers.Contract(tokenAddr, transferAbi, signer);
      const decimals = await token.decimals().catch(()=>18);
      const amount = ethers.utils.parseUnits(amountStr, decimals);

      const fromAddr = await signer.getAddress();
      const fromBal = await token.balanceOf(fromAddr).catch(()=>null);
      if(fromBal && fromBal.lt(amount)){ toast('Saldo insuficiente do remetente.', 'warning'); return; }

      const btn = document.getElementById('inlineSend_tokenContract'); if(btn) btn.disabled = true;
      const txInfoEl = document.getElementById('inlineTx_tokenContract'); if(txInfoEl) txInfoEl.textContent = 'Enviando...';

      const tx = await token.transfer(destAddr, amount);
      const hash = tx.hash;
      let explorer = '';
      try{ const net = await (prov ? prov.getNetwork() : Promise.resolve({ chainId: 97 })); explorer = typeof getFallbackExplorer === 'function' ? (getFallbackExplorer(net.chainId)||'') : ''; }catch(_e){}
      const url = explorer ? `${explorer}/tx/${hash}` : `https://testnet.bscscan.com/tx/${hash}`;
      if(txInfoEl) txInfoEl.innerHTML = `Tx: <a href="${url}" target="_blank">${hash}</a>`;

      const rc = await tx.wait();
      if(btn) btn.disabled = false;

      // Atualizar saldos inline
      autoFetchField('tokenContract');
      autoFetchField('saleContract');
      autoFetchField('buyerWallet');
      autoFetchField('receiverWallet');
    }catch(e){
      addDebug('InlineTransferError', e.message||e);
      const txInfoEl = document.getElementById('inlineTx_tokenContract');
      if(txInfoEl) txInfoEl.textContent = `Erro: ${e.message||e}`;
    }
  })();
}
