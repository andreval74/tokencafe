(() => {
  const sel = {
    approve: '0x095ea7b3', // approve(address,uint256)
    transfer: '0xa9059cbb' // transfer(address,uint256) — caso útil
  };

  const pad32 = (hex) => {
    const h = (hex || '').toString().replace(/^0x/, '').toLowerCase();
    return '0x' + h.padStart(64, '0');
  };

  const toUint256 = (value) => {
    const v = typeof value === 'bigint' ? value : BigInt(value);
    let h = v.toString(16);
    return '0x' + h.padStart(64, '0');
  };

  const addr32 = (addr) => {
    const a = (addr || '').toLowerCase().replace(/^0x/, '');
    return '0x' + a.padStart(64, '0');
  };

  const isValidAddress = (addr) => /^0x[a-fA-F0-9]{40}$/.test(String(addr || ''));

  const parseUnits = (valStr, decimals) => {
    // Conversão simples de decimal string para inteiro com 'decimals'
    // Ex.: "10.5" com 6 dec => 10500000
    const [intPart, fracPartRaw] = String(valStr).split('.');
    const fracPart = (fracPartRaw || '').slice(0, decimals);
    const intBig = BigInt(intPart || '0');
    const fracBig = BigInt((fracPart || '').padEnd(decimals, '0') || '0');
    const base = BigInt(10) ** BigInt(decimals);
    return intBig * base + fracBig;
  };

  // Calcula o valor nativo (wei) a partir da quantidade de tokens e preço por token
  // Usa escala de 18 casas para ambos e normaliza para 18 casas no resultado
  const calcNativeFromTokens = (amountTokensStr, pricePerTokenStr) => {
    const tok18 = parseUnits(String(amountTokensStr || '0'), 18);
    const price18 = parseUnits(String(pricePerTokenStr || '0'), 18);
    const base = BigInt(10) ** BigInt(18);
    return (tok18 * price18) / base; // resultado em wei (18 dec)
  };

  const ensureEthereum = () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return null;
    }
    return window.ethereum;
  };

  async function loadConfig() {
    let cfg = {};
    try {
      // Resolver basePath dinamicamente a partir do script atual ou variável global
      const currentScript = document.currentScript || (function() {
        const scripts = document.getElementsByTagName('script');
        for (let i = scripts.length - 1; i >= 0; i--) {
          const s = scripts[i];
          if (s && s.src && s.src.includes('widget.js')) return s;
        }
        return null;
      })();
      const basePath = (typeof window !== 'undefined' && window.WidgetBasePath)
        ? window.WidgetBasePath
        : (currentScript ? new URL('.', currentScript.src).href : new URL('mini-widget/', window.location.href).href);
      const configUrl = new URL('widget-config.json', basePath).href;
      const res = await fetch(configUrl, { cache: 'no-store' });
      if (res.ok) cfg = await res.json();
    } catch (e) {}
    if (window.WidgetConfig) cfg = { ...cfg, ...window.WidgetConfig };
    return cfg;
  }

  function loadWidgetCSS() {
    if (document.getElementById('widget-sale-css')) return;
    const link = document.createElement('link');
    link.id = 'widget-sale-css';
    link.rel = 'stylesheet';
    link.href = 'widget-sale.css';
    document.head.appendChild(link);
  }

  async function switchToChain(ethereum, cfg) {
    try {
      await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: cfg.chainId }] });
    } catch (err) {
      if (err && err.code === 4902) {
        if (!cfg.network) throw new Error('Rede não configurada para adicionar.');
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: cfg.chainId,
            chainName: cfg.network.chainName,
            nativeCurrency: cfg.network.nativeCurrency,
            rpcUrls: cfg.network.rpcUrls,
            blockExplorerUrls: cfg.network.blockExplorerUrls
          }]
        });
      } else {
        throw err;
      }
    }
  }

  async function connectWallet(ethereum) {
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || !accounts.length) throw new Error('Nenhuma conta conectada.');
    return accounts[0];
  }

  function encodeApprove(spender, amount) {
    return sel.approve + addr32(spender).slice(2) + toUint256(amount).slice(2);
  }

  function encodeSaleMethod(selectorHex, amount) {
    // selectorHex é obrigatório (ex.: 0xabcdef12). Parâmetro: uint256 amount
    const s = (selectorHex || '').toLowerCase();
    if (!s.startsWith('0x') || s.length !== 10) throw new Error('saleMethodSelector inválido.');
    return s + toUint256(amount).slice(2);
  }

  function render(container, html) {
    container.innerHTML = html;
  }

  function ui(cfg) {
    const inputMode = (cfg.inputMode || 'usdt');
    const hasPrice = !!cfg.pricePerToken;
    const priceCurrency = inputMode === 'bnb' ? 'tBNB' : 'USDT';
    const priceDisplay = hasPrice ? `$${Number(cfg.pricePerToken).toFixed(2)} ${priceCurrency}` : '—';
    const availableDisplay = cfg.availableTokensText || (cfg.availableTokens ? String(cfg.availableTokens) + ' Tokens' : '—');
    const wantsTokensInput = (inputMode === 'tokens') || hasPrice;
    const labelText = wantsTokensInput ? 'Quantidade de Tokens'
      : (inputMode === 'bnb' ? 'Valor a pagar' : 'USDT a comprar');
    const unitText = wantsTokensInput ? 'Tokens'
      : (inputMode === 'bnb' ? 'tBNB' : 'USDT');
    // Total inicial formatado
    const initialAmountStr = (hasPrice ? (cfg.purchaseTokens || '10') : (cfg.purchaseUSDT || cfg.purchaseTokens || '10'));
    let initialTotalText = `${initialAmountStr} ${unitText}`;
    if (hasPrice) {
      const t = Number(initialAmountStr) * Number(cfg.pricePerToken);
      const cur = inputMode === 'bnb' ? 'tBNB' : 'USDT';
      initialTotalText = `$${Number.isFinite(t) ? t.toFixed(2) : '0.00'} ${cur}`;
    }
    return `
      <style>
        .token-sale-widget{background:#fff;border:2px solid #2F6DF6;border-radius:16px;padding:16px;box-shadow:0 8px 24px rgba(43,107,243,.12)}
        .widget-header{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e9ecef;padding-bottom:10px;margin-bottom:14px}
        .header-left{display:flex;align-items:center;gap:10px}
        .header-icon{font-size:18px}
        .header-title{font-weight:700}
        .badge{display:inline-block;border-radius:999px;padding:4px 10px;font-size:.75rem}
        .badge-demo{background:#22c55e;color:#fff}
        .badge-token{background:#2F6DF6;color:#fff}
        .token-details{margin-bottom:12px}
        .token-row{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px}
        .token-dot{width:10px;height:10px;border-radius:50%;background:#2F6DF6;display:inline-block}
        .token-name{font-weight:600}
        .kv-row{display:flex;gap:12px;margin-top:10px}
        .kv-item{flex:1}
        .kv-value{font-weight:700}
        .btn{display:inline-block;padding:10px 14px;border:none;border-radius:8px;background:#111;color:#fff;cursor:pointer}
        .btn[disabled]{opacity:.5;cursor:not-allowed}
        .btn-primary{background:#2F6DF6}
        .btn-success{background:#22c55e}
        .input-group{display:flex;gap:8px}
        .form-control{flex:1;padding:10px;border:1px solid #cbd5e1;border-radius:8px}
        .input-group-text{padding:8px 10px;border:1px solid #cbd5e1;border-radius:8px;font-weight:600}
        .unit-pill{background:#2F6DF6;color:#fff}
        .alert{padding:10px 12px;border-radius:8px}
        .alert-warning{background:#fff3cd;border:1px solid #ffe69c}
        .alert-success{background:#e9f7ef;border:1px solid #c3e6cb;color:#155724}
        .total-display{display:flex;justify-content:space-between;align-items:center;margin:8px 0;padding:8px;border:1px dashed #dee2e6;border-radius:8px}
        .total-amount{color:#2F6DF6;font-weight:600}
        .widget-footer{margin-top:10px;color:#64748b}
        .brand-link{color:#2F6DF6;text-decoration:none}
        .brand-link:hover{text-decoration:underline}
      </style>
      <div class="token-sale-widget">
        <div class="widget-header">
          <div class="header-left">
            <span class="header-icon">🪙</span>
            <span class="header-title">Comprar Tokens</span>
          </div>
          <span class="badge badge-demo">DEMO</span>
        </div>

        <div class="token-details">
          <div class="token-row">
            <span class="token-dot"></span>
            <span class="token-name">${cfg.title || 'XCafe Token'}</span>
            <span class="badge badge-token">${(cfg.saleTokenSymbol || 'TOK')}</span>
          </div>
          <div class="kv-row">
            <div class="kv-item">
              <small>Preço</small>
              <div class="kv-value">${priceDisplay}</div>
            </div>
            <div class="kv-item">
              <small>Disponível</small>
              <div class="kv-value">${availableDisplay}</div>
            </div>
          </div>
        </div>

        <div class="widget-body">
          <div class="token-info mb-3">
            <div class="row">
              <div class="col-6">
                <small>Rede</small>
                <div class="fw-bold">${cfg.chainId || '—'}</div>
              </div>
              <div class="col-6">
                <small>Moeda</small>
                <div class="fw-bold">${inputMode === 'bnb' ? 'tBNB' : 'USDT'}</div>
              </div>
            </div>
          </div>

          <div class="purchase-form">
            <div class="mb-3">
              <label class="form-label">${labelText}</label>
              <div class="input-group">
                <input type="text" class="form-control" id="mw-amount" value="${(hasPrice ? (cfg.purchaseTokens || '10') : (cfg.purchaseUSDT || cfg.purchaseTokens || '10'))}" />
                <span class="input-group-text unit-pill">${unitText}</span>
              </div>
            </div>

            <div class="total-display">
              <span>Total:</span>
              <span id="mw-total" class="total-amount">${initialTotalText}</span>
            </div>

            <div class="connection-status" id="mw-connection-status">
              <div class="alert alert-warning">
                Conecte sua carteira para continuar
              </div>
            </div>

            <button class="btn btn-primary" id="mw-connect">Conectar MetaMask</button>
            <button class="btn btn-success" id="mw-buy" disabled>${cfg.ctaLabel || 'Comprar agora'}</button>
          </div>
        </div>

        <div class="widget-footer">
          <small>⛓️ Transação segura via blockchain · <a href="https://xcafe.app" target="_blank" class="brand-link">Desenvolvido por xcafe.app</a></small>
        </div>

        <div id="mw-status" class="mw-status" style="margin-top:10px;color:#444"></div>
      </div>
    `;
  }

  function setStatus(msg) {
    const el = document.getElementById('mw-status');
    if (el) el.textContent = msg;
  }
  const shortAddr = (addr) => addr ? (addr.slice(0, 6) + '...' + addr.slice(-4)) : '';
  const fmt2 = (n) => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '0.00';
    return num.toFixed(2);
  };

  async function main() {
    const cfg = await loadConfig();
    const mountSel = cfg.mount || '#mini-widget';
    const container = document.querySelector(mountSel);
    if (!container) return console.error('Container não encontrado:', mountSel);
    loadWidgetCSS();
    render(container, ui(cfg));

    const ethereum = ensureEthereum();
    let account = null;

    // Fallback amigável quando MetaMask não está disponível
    if (!ethereum) {
      setStatus('MetaMask não detectada. Instale a extensão para continuar.');
      const btnConnect = document.getElementById('mw-connect');
      const btnBuy = document.getElementById('mw-buy');
      if (btnConnect) {
        btnConnect.disabled = true;
        btnConnect.classList.add('disabled');
        btnConnect.title = 'MetaMask não detectada';
      }
      if (btnBuy) {
        btnBuy.disabled = true;
        btnBuy.classList.add('disabled');
        btnBuy.title = 'MetaMask não detectada';
      }
      return; // interrompe apenas funcionalidades dependentes da carteira, mantendo UI visível
    }

    const btnConnect = document.getElementById('mw-connect');
    const btnBuy = document.getElementById('mw-buy');
    const inputAmount = document.getElementById('mw-amount');
    const totalEl = document.getElementById('mw-total');

    // Validação de limites mínimo/máximo com base em cfg.minPurchaseTokens / cfg.maxPurchaseTokens
    function getLimits() {
      const rawMin = cfg.minPurchaseTokens;
      const rawMax = cfg.maxPurchaseTokens;
      const min = rawMin !== undefined && rawMin !== null && String(rawMin).trim() !== '' ? Number(rawMin) : null;
      const max = rawMax !== undefined && rawMax !== null && String(rawMax).trim() !== '' ? Number(rawMax) : null;
      return { min, max };
    }

    function validateAmountAndUI() {
      const inputMode = (cfg.inputMode || 'usdt');
      const amountStr = (inputAmount && inputAmount.value) || (cfg.purchaseUSDT || cfg.purchaseTokens || '0');
      const amountNum = Number(amountStr);
      const { min, max } = getLimits();
      const hasPrice = !!cfg.pricePerToken;
      // Atualiza total sempre
      if (totalEl) {
        if (hasPrice) {
          const t = Number(amountStr) * Number(cfg.pricePerToken);
          const cur = inputMode === 'bnb' ? 'tBNB' : 'USDT';
          totalEl.textContent = `$${fmt2(t)} ${cur}`;
        } else {
          const unitText = inputMode === 'tokens' ? (cfg.saleTokenSymbol || 'TOK') : (inputMode === 'bnb' ? 'tBNB' : 'USDT');
          totalEl.textContent = amountStr + ' ' + unitText;
        }
      }
      // Checagens de faixa
      if (Number.isFinite(amountNum)) {
        if (min !== null && Number.isFinite(min) && amountNum < min) {
          setStatus(`Valor abaixo do mínimo permitido (mín ${min}).`);
          btnBuy.disabled = true;
          return false;
        }
        if (max !== null && Number.isFinite(max) && amountNum > max) {
          setStatus(`Valor acima do máximo permitido (máx ${max}).`);
          btnBuy.disabled = true;
          return false;
        }
      }
      // Dentro da faixa: habilita se conta conectada
      setStatus('');
      btnBuy.disabled = !account;
      return true;
    }

    // Consulta purchasedOf(bytes32,address) (view) no contrato de venda, se configurado
    async function tryPurchasedOf(ethereum, cfg, buyer) {
      try {
        const selector = (cfg.purchasedOfSelector || '').toLowerCase();
        const saleId = (cfg.saleId || '').toLowerCase();
        if (!selector || selector.length !== 10 || !saleId || !saleId.startsWith('0x')) return null;
        if (!isValidAddress(cfg.saleContract)) return null;
        // Evita erro de RPC chamando endereços sem bytecode
        const code = await ethereum.request({ method: 'eth_getCode', params: [cfg.saleContract, 'latest'] });
        if (!code || code === '0x') return null;
        const data = selector + pad32(saleId).slice(2) + addr32(buyer).slice(2);
        const res = await ethereum.request({ method: 'eth_call', params: [{ to: cfg.saleContract, data }, 'latest'] });
        if (!res || typeof res !== 'string') return null;
        return BigInt(res);
      } catch (_) {
        return null;
      }
    }

    // Reagir a alterações de valor
    inputAmount && inputAmount.addEventListener('input', () => {
      try { validateAmountAndUI(); } catch (_) {}
    });

    btnConnect.addEventListener('click', async () => {
      try {
        setStatus('Conectando carteira...');
        await switchToChain(ethereum, cfg);
        account = await connectWallet(ethereum);
        setStatus('Conectado: ' + account);
        const cs = document.getElementById('mw-connection-status');
        if (cs) {
          cs.innerHTML = '<div class="alert alert-success" style="display:flex;align-items:center;gap:8px"><span>✅</span><span>Conectado: ' + shortAddr(account) + '</span></div>';
        }
        // Revalida com limites ao conectar
        const ok = validateAmountAndUI();
        btnBuy.disabled = !ok;
      } catch (e) {
        setStatus('Erro ao conectar: ' + (e && e.message ? e.message : e));
      }
    });

    btnBuy.addEventListener('click', async () => {
      try {
        if (!account) throw new Error('Conecte a carteira antes.');
        // Bloqueia envio se fora dos limites
        const okRange = validateAmountAndUI();
        if (!okRange) throw new Error('Valor fora dos limites configurados.');
        // Unidade dinâmica para UI
        const inputMode = (cfg.inputMode || 'usdt');
        const amountStr = inputAmount.value || (inputMode === 'tokens' ? (cfg.purchaseTokens || '0') : (cfg.purchaseUSDT || '0'));
        if (totalEl) {
          if (cfg.pricePerToken) {
            const t = Number(amountStr) * Number(cfg.pricePerToken);
            const cur = inputMode === 'bnb' ? 'tBNB' : 'USDT';
            totalEl.textContent = `$${fmt2(t)} ${cur}`;
          } else {
            const unitText = inputMode === 'tokens' ? (cfg.saleTokenSymbol || 'TOK') : (inputMode === 'bnb' ? 'tBNB' : 'USDT');
            totalEl.textContent = amountStr + ' ' + unitText;
          }
        }

        // Quantidades conforme modo selecionado
        const saleTokDec = Number(cfg.saleTokenDecimals || 18);
        const amountTok = parseUnits(amountStr, saleTokDec);
        const usdtDec = Number(cfg.usdtDecimals || 6);
        const amountUSDTVal = parseUnits(amountStr, usdtDec);
        // Valor nativo (BNB) em wei: se houver preço por token e modo bnb, calcula tokens * preço
        let amountNativeVal = parseUnits(amountStr, 18);
        if (inputMode === 'bnb' && cfg.pricePerToken) {
          amountNativeVal = calcNativeFromTokens(amountStr, String(cfg.pricePerToken));
        }
        const amountParam = (inputMode === 'tokens') ? amountTok : amountUSDTVal;

        // Validação cumulativa preferindo leitura on-chain de tokens, se disponível e modo tokens
        if (cfg.maxPerWalletTokens && Number(cfg.maxPerWalletTokens) > 0 && inputMode === 'tokens') {
          const alreadyTok = await tryPurchasedOf(ethereum, cfg, account);
          if (alreadyTok !== null) {
            const saleTokDec = Number(cfg.saleTokenDecimals || 18);
            const amountTok = parseUnits(amountStr, saleTokDec);
            const maxTok = parseUnits(String(cfg.maxPerWalletTokens), saleTokDec);
            if (alreadyTok + amountTok > maxTok) {
              throw new Error('Limite cumulativo de tokens por carteira excedido.');
            }
          }
        }
        // Verificação cumulativa por carteira (sem BD) via logs do token ERC-20 — ativa só se configurada
        if (cfg.maxPerWalletUSDT && Number(cfg.maxPerWalletUSDT) > 0 && isValidAddress(cfg.usdtAddress) && isValidAddress(cfg.saleContract)) {
          const topicTransfer = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
          const hexToBigInt = (hex) => BigInt(hex || '0x0');
          const maxPerWalletStr = String(cfg.maxPerWalletUSDT);
          const maxPerWallet = parseUnits(maxPerWalletStr, Number(cfg.usdtDecimals || 6));
          const filter = {
            address: cfg.usdtAddress,
            fromBlock: '0x0',
            toBlock: 'latest',
            topics: [topicTransfer, addr32(account), addr32(cfg.saleContract)]
          };
          const logs = await ethereum.request({ method: 'eth_getLogs', params: [filter] });
          let alreadyPaid = BigInt(0);
          for (const lg of (logs || [])) alreadyPaid += hexToBigInt(lg.data);
          const amountUSDTStr = inputAmount.value || cfg.purchaseUSDT || '0';
          const amountUSDT = parseUnits(amountUSDTStr, Number(cfg.usdtDecimals || 6));
          if (alreadyPaid + amountUSDT > maxPerWallet) {
            throw new Error('Limite cumulativo de USDT por carteira excedido.');
          }
        }
        // total já atualizado acima

        // Fluxo simples: pagamento nativo BNB dividido entre carteiras
        if (inputMode === 'bnb') {
          if (!isValidAddress(cfg.officialWallet) || !isValidAddress(cfg.commissionWallet)) {
            throw new Error('Carteiras de recebimento inválidas no widget-config.json');
          }
          const offPct = Number(cfg.officialPct || 0);
          const comPct = Number(cfg.commissionPct || 0);
          if (!Number.isFinite(offPct) || !Number.isFinite(comPct) || offPct + comPct !== 100) {
            throw new Error('Percentuais inválidos: devem somar 100.');
          }
          const offWei = '0x' + (amountNativeVal * BigInt(offPct) / BigInt(100)).toString(16);
          const comWei = '0x' + (amountNativeVal * BigInt(comPct) / BigInt(100)).toString(16);
          setStatus('Enviando pagamento nativo...');
          const offHash = await ethereum.request({ method: 'eth_sendTransaction', params: [{ from: account, to: cfg.officialWallet, value: offWei }] });
          const comHash = await ethereum.request({ method: 'eth_sendTransaction', params: [{ from: account, to: cfg.commissionWallet, value: comWei }] });
          setStatus((cfg.successText || 'Pagamentos enviados!') + ` Oficial: ${offHash} | Comissão: ${comHash}`);
          return; // não segue para approve/contrato
        }

        // 1) Approve USDT -> saleContract (apenas quando modo USDT e endereço válido)
        if (inputMode === 'usdt' && isValidAddress(cfg.usdtAddress)) {
          setStatus('Aprovando USDT...');
          const approveTx = {
            from: account,
            to: cfg.usdtAddress,
            data: encodeApprove(cfg.saleContract, amountUSDTVal)
          };
          const approveHash = await ethereum.request({ method: 'eth_sendTransaction', params: [approveTx] });
          setStatus('Approve enviado: ' + approveHash);
        }

        // 2) Chamada ao contrato de venda
        if (!cfg.saleMethodSelector || cfg.saleMethodSelector === '0x00000000') {
          throw new Error('saleMethodSelector não configurado no widget-config.json');
        }

        setStatus('Enviando compra...');
        const buyTx = {
          from: account,
          to: cfg.saleContract,
          data: encodeSaleMethod(cfg.saleMethodSelector, amountParam)
        };
        const buyHash = await ethereum.request({ method: 'eth_sendTransaction', params: [buyTx] });
        setStatus((cfg.successText || 'Transação enviada!') + ' Hash: ' + buyHash);
      } catch (e) {
        setStatus((cfg.errorText || 'Falha na transação.') + ' ' + (e && e.message ? e.message : e));
      }
    });

    // Atualizações básicas de eventos
    if (ethereum && ethereum.on) ethereum.on('accountsChanged', (accs) => {
      if (accs && accs.length) {
        account = accs[0];
        setStatus('Conta alterada: ' + account);
        // Revalida com nova conta
        validateAmountAndUI();
      } else {
        account = null;
        setStatus('Carteira desconectada.');
        btnBuy.disabled = true;
      }
    });

    if (ethereum && ethereum.on) ethereum.on('chainChanged', (chainId) => {
      setStatus('Rede alterada: ' + chainId);
      // Em alterações de rede, mantém UI coerente
      validateAmountAndUI();
    });
  }

  // Auto-run
  window.addEventListener('DOMContentLoaded', () => {
    main().catch(err => console.error(err));
  });
})();