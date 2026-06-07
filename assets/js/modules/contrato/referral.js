/**
 * referral.js — Sistema de bonificação por indicação
 *
 * Responsabilidades:
 *  1. Renderizar e controlar o card de indicação no DOM
 *  2. Validar o endereço do indicador em tempo real
 *  3. Exibir breakdown de preços com símbolo dinâmico da rede
 *  4. Suporte a pagamento nativo (BNB, ETH) e ERC-20 (USDT, USDC)
 *  5. Expor buildFactoryCall() para o contrato.js:
 *       - Moeda nativa → 1 transação
 *       - ERC-20       → 2 transações (approve + createToken)
 */

import { getFactoryAddress, hasFactory, FACTORY_ABI, getKnownCurrencies } from './factory-config.js';
import { PAYMENT_CONFIG } from './payment-config.js';
import { getCapturedReferral } from '../../shared/url-params.js';
import { getFallbackRpc } from '../../shared/network-fallback.js';

// ── Constantes ────────────────────────────────────────────────────────────────
const REFERRER_STORAGE_KEY = 'tc_referral_code';
const CARD_ID = 'referral-card';

const ERC20_ALLOWANCE_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
];

// ── Estado do módulo ──────────────────────────────────────────────────────────
let _referrerAddress = '';
let _basePrice = 0n;
let _discountedPrice = 0n;
let _factoryContract = null;
let _currentChainId = null;
let _symbol = 'ETH'; // símbolo da moeda nativa da rede atual
let _selectedCurrency = 'native'; // "native" ou endereço ERC-20
let _knownCurrencies = []; // [{address, symbol, name}] para rede atual
let _eventsAttached = false; // evita re-bind de listeners
let _hasFactory = false; // true se a rede atual tem factory deployado
let _provider = null; // provider para verificação EOA

let _verifyTimer = null;
let _verifySeq = 0;
let _verifyCache = { chainId: null, address: '', isContract: null, ts: 0 };

// ── Helpers DOM ───────────────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function getCard() {
    return document.getElementById(CARD_ID);
}

function _emitReferralChanged(status) {
    try {
        document.dispatchEvent(
            new CustomEvent('tc:referral-changed', {
                detail: {
                    status: String(status || ''),
                    referrer: _referrerAddress || '',
                    chainId: _currentChainId,
                },
            }),
        );
    } catch (_) {}
}

// ── API Pública ───────────────────────────────────────────────────────────────

/**
 * Define o símbolo da moeda nativa (ex: "BNB", "ETH", "MATIC").
 * Deve ser chamado sempre que a rede for trocada.
 */
export function setNetworkSymbol(sym) {
    _symbol = sym || 'ETH';
    _renderPriceBreakdown();
}

/**
 * Inicializa o módulo de indicação.
 * Deve ser chamado quando a carteira + rede estiverem disponíveis.
 *
 * @param {string|number|bigint} chainId  — Chain ID atual
 * @param {object}               provider — ethers.js provider
 */
export async function initReferral(chainId, provider) {
    _currentChainId = Number(chainId);
    _provider = provider; // salvo para verificação EOA no botão Verificar
    const card = getCard();
    if (!card) return;

    _hasFactory = hasFactory(_currentChainId);

    // Sempre exibe o card — para redes com factory: preços do contrato
    // Para redes sem factory: campo de indicação funciona com fee-manager
    card.style.display = '';

    if (_hasFactory) {
        // Carrega preços e moedas suportadas da factory
        await _loadPrices(provider);
    } else {
        // Sem factory: usa preço de referência do payment-config (USD)
        _basePrice = 0n;
        _discountedPrice = 0n;
        _knownCurrencies = [];
        _renderPriceBreakdown();
        _renderCurrencySelector();
    }

    // Renderiza seletor de moeda e vincula eventos (evita duplicação)
    _renderCurrencySelector();
    if (!_eventsAttached) {
        _bindEvents(card);
        _eventsAttached = true;
    }

    // Auto-fill desativado: campo inicia sempre vazio (usuário deve digitar manualmente)
    // _tryAutoFillFromStorage(card);
}

/**
 * Preenche automaticamente o campo de indicação.
 * Ordem de prioridade: ?ref= da URL → código salvo manualmente (página 1) → nada.
 * Só age se o campo ainda estiver vazio.
 */
function _tryAutoFillFromStorage(card) {
    const input = $('#referral-address-input', card);
    if (!input || input.value.trim()) return;

    // 1. URL capturada (?ref=0xWALLET) — armazenada por 7 dias
    const fromUrl = getCapturedReferral();
    if (fromUrl) {
        input.value = fromUrl;
        _handleReferrerInput(fromUrl);
        _showAutoFillBanner(card, fromUrl);
        return;
    }

    // 2. Código digitado manualmente na página 1 (chave tc_referral_code)
    let manual = '';
    try {
        manual = localStorage.getItem(REFERRER_STORAGE_KEY) || '';
    } catch (_) {}
    if (manual) {
        input.value = manual;
        _handleReferrerInput(manual);
    }
}

function _showAutoFillBanner(card, wallet) {
    if (!card || card.querySelector('#ref-autofill-banner')) return;

    const short = `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
    const banner = document.createElement('div');
    banner.id = 'ref-autofill-banner';
    banner.className = 'mt-2 p-2 rounded d-flex align-items-center gap-2';
    banner.style.cssText = 'background:rgba(34,197,94,.12);border:1px solid rgba(34,197,94,.3)';
    banner.innerHTML = `
    <i class="bi bi-gift-fill text-success"></i>
    <span class="tc-text-sm text-success">
      Indicação aplicada automaticamente pelo indicador <strong>${short}</strong>.
      Você ganha <strong>10% de desconto</strong>!
    </span>
  `;
    // Insere logo após o campo de indicação
    const inputEl = $('#referral-address-input', card);
    const fieldWrap = inputEl?.closest('.tc-field') || card.firstElementChild;
    if (fieldWrap) fieldWrap.after(banner);
    else card.prepend(banner);
}

/** Retorna o endereço do indicador válido atual, ou "". */
export function getReferrer() {
    return _referrerAddress;
}

/** Retorna a moeda selecionada ("native" ou endereço ERC-20). */
export function getSelectedCurrency() {
    return _selectedCurrency;
}

/** Retorna true se a rede tem factory deployado. */
export function canUseFactory(chainId) {
    return hasFactory(Number(chainId));
}

/**
 * Dados da última sessão de indicação (para exibir na tela de sucesso).
 * Retorna null se não houver indicador ativo.
 */
export function getLastReferralData() {
    if (!_referrerAddress || _basePrice === 0n) return null;
    return {
        referrer: _referrerAddress,
        saved: _basePrice - _discountedPrice, // 10% do basePrice
        referrerGot: _basePrice / 10n, // 10% do basePrice
        symbol: _symbol,
        currency: _selectedCurrency,
    };
}

/**
 * Preço atual a pagar (em wei para nativo, ou na unidade ERC-20).
 * Leva em conta desconto se houver indicador ativo.
 */
export function getCurrentPrice() {
    return _referrerAddress ? _discountedPrice : _basePrice;
}

/**
 * Limpa estado de indicação. Chamar ao clicar no botão "Limpar" do formulário.
 */
export function clearReferral() {
    _referrerAddress = '';
    _selectedCurrency = 'native';
    _eventsAttached = false;
    _saveReferrer('');
    const card = getCard();
    const input = $('#referral-address-input', card);
    if (input) input.value = '';
    _setReferralBtn(card, false);
    _handleReferrerInput('');
    _renderCurrencySelector();
}

/**
 * Constrói e executa a criação do token via factory em UMA transação (nativo)
 * ou DUAS transações sequenciais (ERC-20: approve → createToken).
 *
 * @param {object} signer    — ethers.js Signer
 * @param {object} network   — { chainId, nativeCurrency }
 * @param {object} tokenData — { name, symbol, decimals, initialSupply, initialOwner, mintable, burnable, pausable }
 * @returns {Promise<{success, tokenAddress?, txHash?, usedReferral, referrer?, saved?, referrerGot?, symbol?, error?}>}
 */
export async function buildFactoryCall(signer, network, tokenData) {
    const chainId = Number(network.chainId);

    if (!hasFactory(chainId)) {
        return { success: false, error: 'Factory não disponível nesta rede.' };
    }

    try {
        const factoryAddr = getFactoryAddress(chainId);
        const factory = new ethers.Contract(factoryAddr, FACTORY_ABI, signer);
        const referrer = _referrerAddress;

        // initialOwner padrão = carteira do criador (signer). Nunca usar address(0).
        const signerAddress = await signer.getAddress();
        const resolvedOwner =
            tokenData.initialOwner && ethers.utils.isAddress(tokenData.initialOwner)
                ? tokenData.initialOwner
                : signerAddress;

        // Estrutura TokenParams do contrato
        const params = {
            name: String(tokenData.name),
            symbol: String(tokenData.symbol),
            decimals: Number(tokenData.decimals),
            initialSupply: BigInt(tokenData.initialSupply || 0),
            initialOwner: resolvedOwner,
            mintable: Boolean(tokenData.mintable),
            burnable: Boolean(tokenData.burnable),
            pausable: Boolean(tokenData.pausable),
        };

        let tx;

        if (_selectedCurrency !== 'native') {
            // ── Path ERC-20 (2 transações) ─────────────────────────────────────────
            const erc20Result = await _executeERC20Payment(factory, factoryAddr, signer, params, referrer);
            if (!erc20Result.success) return erc20Result;
            tx = erc20Result.tx;
        } else {
            // ── Path nativo (1 transação) ──────────────────────────────────────────
            const price = referrer ? await factory.discountedPrice() : await factory.basePrice();

            tx = referrer
                ? await factory.createTokenWithReferral(params, referrer, { value: price })
                : await factory.createToken(params, { value: price });
        }

        const receipt = await tx.wait(1);

        // Extrai endereço do token criado do evento TokenCreated
        let tokenAddress = null;
        for (const log of receipt.logs) {
            try {
                const parsed = factory.interface.parseLog(log);
                if (parsed?.name === 'TokenCreated') {
                    tokenAddress = parsed.args.token;
                    break;
                }
            } catch (_) {}
        }

        return {
            success: true,
            tokenAddress,
            txHash: receipt.hash,
            usedReferral: Boolean(referrer),
            referrer: referrer || null,
            saved: referrer ? _basePrice - _discountedPrice : 0n,
            referrerGot: referrer ? _basePrice / 10n : 0n,
            symbol: _symbol,
        };
    } catch (e) {
        return { success: false, error: e.message || 'Erro desconhecido na factory.' };
    }
}

// ── Internos: ERC-20 ──────────────────────────────────────────────────────────

async function _executeERC20Payment(factory, factoryAddr, signer, params, referrer) {
    const currency = _selectedCurrency;

    // Verifica se a moeda tem preço configurado na factory
    let fullPrice;
    try {
        fullPrice = await factory.currencyPrice(currency);
    } catch (_) {
        fullPrice = 0n;
    }
    if (!fullPrice || fullPrice === 0n) {
        return { success: false, error: 'Moeda não configurada na factory para esta rede.' };
    }

    // Calcula quanto o criador precisa aprovar
    const toReferrer = fullPrice / 10n;
    const toPlatform = (fullPrice * 4n) / 5n;
    const totalNeeded = referrer ? toPlatform + toReferrer : fullPrice;

    // Solicita aprovação se necessário
    const erc20 = new ethers.Contract(currency, ERC20_ALLOWANCE_ABI, signer);
    const signerAddr = await signer.getAddress();
    const allowance = await erc20.allowance(signerAddr, factoryAddr);

    if (allowance < totalNeeded) {
        const approveTx = await erc20.approve(factoryAddr, totalNeeded);
        await approveTx.wait(1);
    }

    // Cria o token
    const tx = referrer
        ? await factory.createTokenWithERC20AndReferral(params, currency, referrer)
        : await factory.createTokenWithERC20(params, currency);

    return { success: true, tx };
}

// ── Carregamento de preços ────────────────────────────────────────────────────

async function _loadPrices(provider) {
    try {
        const addr = getFactoryAddress(_currentChainId);
        if (!addr) return;

        const signer = await provider.getSigner().catch(() => null);
        const runner = signer || provider;
        _factoryContract = new ethers.Contract(addr, FACTORY_ABI, runner);

        [_basePrice, _discountedPrice] = await Promise.all([
            _factoryContract.basePrice(),
            _factoryContract.discountedPrice(),
        ]);

        _knownCurrencies = getKnownCurrencies(_currentChainId);
        _renderPriceBreakdown();
    } catch (e) {
        console.warn('[Referral] Erro ao carregar preços:', e.message);
    }
}

// ── Renderização ──────────────────────────────────────────────────────────────

function _renderPriceBreakdown() {
    const card = getCard();
    if (!card) return;

    const hasRef = _referrerAddress.length > 0;

    // ── Modo sem factory: mostra valores em USD (serão confirmados no fee-manager) ──
    if (!_hasFactory) {
        const sectionFull = $('#ref-price-section-full', card);
        const sectionDisc = $('#ref-price-section-disc', card);

        if (!hasRef) {
            // Sem indicador: mostra taxa base em USD
            const elFull = $('#ref-price-full', card);
            if (elFull) elFull.textContent = `$${PAYMENT_CONFIG.SERVICE_FEE_USD.toFixed(2)}`;
            $$('.ref-currency-symbol', card).forEach((el) => {
                el.textContent = 'USD';
            });
            if (sectionFull) sectionFull.classList.remove('d-none');
            if (sectionDisc) sectionDisc.classList.add('d-none');
        } else {
            // Com indicador: mostra breakdown em USD
            const base = PAYMENT_CONFIG.SERVICE_FEE_USD;
            const discount = base * 0.1;
            const pays = base * 0.9;
            const refBonus = base * 0.1;

            const elFullStrike = $('#ref-price-full-strike', card);
            const elDisc = $('#ref-price-discounted', card);
            const elSavings = $('#ref-price-savings', card);
            const elReferrer = $('#ref-price-referrer', card);

            if (elFullStrike) elFullStrike.textContent = `$${base.toFixed(2)}`;
            if (elDisc) elDisc.textContent = `$${pays.toFixed(2)}`;
            if (elSavings) elSavings.textContent = `$${discount.toFixed(2)}`;
            if (elReferrer) elReferrer.textContent = `$${refBonus.toFixed(2)}`;
            $$('.ref-currency-symbol', card).forEach((el) => {
                el.textContent = 'USD';
            });
            if (sectionFull) sectionFull.classList.add('d-none');
            if (sectionDisc) sectionDisc.classList.remove('d-none');
        }
        return;
    }

    // ── Modo factory: mostra valores em crypto (existente) ───────────────────────
    const sym =
        _selectedCurrency === 'native'
            ? _symbol
            : _knownCurrencies.find((c) => c.address.toLowerCase() === _selectedCurrency.toLowerCase())?.symbol ||
              'ERC-20';

    const fmt = (wei) => {
        if (!wei) return '0';
        const s = parseFloat(ethers.utils.formatEther(wei)).toFixed(6);
        return s.replace(/\.?0+$/, '') || '0';
    };

    $$('.ref-currency-symbol', card).forEach((el) => {
        el.textContent = sym;
    });

    const elFull = $('#ref-price-full', card);
    const elFullStrike = $('#ref-price-full-strike', card);
    const elDisc = $('#ref-price-discounted', card);
    const elSavings = $('#ref-price-savings', card);
    const elReferrer = $('#ref-price-referrer', card);

    if (elFull) elFull.textContent = fmt(_basePrice);
    if (elFullStrike) elFullStrike.textContent = fmt(_basePrice);
    if (elDisc) elDisc.textContent = fmt(_discountedPrice);
    if (elSavings) elSavings.textContent = fmt(_basePrice - _discountedPrice);
    if (elReferrer) elReferrer.textContent = fmt(_basePrice / 10n);

    const sectionFull = $('#ref-price-section-full', card);
    const sectionDisc = $('#ref-price-section-disc', card);
    if (sectionFull) sectionFull.classList.toggle('d-none', hasRef);
    if (sectionDisc) sectionDisc.classList.toggle('d-none', !hasRef);
}

function _renderCurrencySelector() {
    const card = getCard();
    const container = $('#ref-currency-selector', card);
    if (!container) return;

    // Sem moedas ERC-20 configuradas: esconde seletor
    if (!_knownCurrencies.length) {
        container.classList.add('d-none');
        return;
    }

    container.classList.remove('d-none');

    container.innerHTML = `
    <div class="tc-text-sm tc-status-text mb-2 mt-3 pt-2" style="border-top:1px solid rgba(255,255,255,.08)">
      <i class="bi bi-coin me-1"></i>Moeda de pagamento:
    </div>
    <div class="d-flex flex-wrap gap-2">
      <button type="button" class="ref-currency-btn${_selectedCurrency === 'native' ? ' active' : ''}" data-currency="native">
        <i class="bi bi-currency-exchange me-1"></i><span class="ref-currency-symbol">${_symbol}</span> (nativo)
      </button>
      ${_knownCurrencies
          .map(
              (c) => `
        <button type="button"
          class="ref-currency-btn${_selectedCurrency === c.address ? ' active' : ''}"
          data-currency="${c.address}"
          data-symbol="${c.symbol}">
          ${c.symbol}
        </button>
      `,
          )
          .join('')}
    </div>
    <div id="ref-erc20-notice" class="mt-2 tc-text-sm text-warning${_selectedCurrency === 'native' ? ' d-none' : ''}">
      <i class="bi bi-info-circle me-1"></i>
      Pagamento em ERC-20 exige 2 confirmações na carteira: aprovação + criação.
    </div>
  `;

    container.querySelectorAll('.ref-currency-btn').forEach((btn) => {
        btn.addEventListener('click', () => _selectCurrency(btn.dataset.currency));
    });
}

function _selectCurrency(currency) {
    _selectedCurrency = currency;
    const card = getCard();
    const notice = $('#ref-erc20-notice', card);
    if (notice) notice.classList.toggle('d-none', currency === 'native');

    card?.querySelectorAll('.ref-currency-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.currency === currency);
    });

    _renderPriceBreakdown();
}

// ── Validação de indicador ────────────────────────────────────────────────────

function _handleReferrerInput(value, opts = {}) {
    const v = (value || '').trim();
    const card = getCard();
    const feedback = $('#ref-addr-feedback', card);
    const badge = $('#ref-active-badge', card);

    _referrerAddress = '';

    if (!v) {
        _setFeedback(feedback, '', 'neutral');
        _setReferralBtn(card, false);
        _cancelVerify();
        if (badge) badge.classList.add('d-none');
        _saveReferrer('');
        _renderPriceBreakdown();
        _emitReferralChanged('cleared');
        return;
    }

    const isValid = ethers.utils.isAddress(v) && v !== ethers.constants.AddressZero;

    if (!isValid) {
        _setFeedback(feedback, 'Endereço inválido — use um endereço EVM (0x...)', 'error');
        _setReferralBtn(card, false, true);
        _cancelVerify();
        if (badge) badge.classList.add('d-none');
        _saveReferrer('');
        _renderPriceBreakdown();
        _emitReferralChanged('invalid');
        return;
    }

    // Não permite usar a própria carteira como indicador
    const myWallet = _getConnectedWallet();
    if (myWallet && v.toLowerCase() === myWallet.toLowerCase()) {
        _setFeedback(feedback, 'Você não pode usar sua própria carteira como código de indicação.', 'error');
        _setReferralBtn(card, false, true);
        _cancelVerify();
        if (badge) badge.classList.add('d-none');
        _saveReferrer('');
        _renderPriceBreakdown();
        _emitReferralChanged('invalid');
        return;
    }

    let normalized = '';
    try {
        normalized = ethers.utils.getAddress(v);
    } catch (_) {
        _setFeedback(feedback, 'Endereço inválido — use um endereço EVM (0x...)', 'error');
        _setReferralBtn(card, false, true);
        _cancelVerify();
        if (badge) badge.classList.add('d-none');
        _saveReferrer('');
        _renderPriceBreakdown();
        _emitReferralChanged('invalid');
        return;
    }

    _setFeedback(feedback, 'Verificando se é uma carteira (EOA)...', 'neutral');
    _setReferralBtnPending(card);
    if (badge) badge.classList.add('d-none');
    _saveReferrer('');
    _renderPriceBreakdown();

    _scheduleVerify(card, normalized, opts && opts.immediate ? 0 : 450);
}

/**
 * Alterna o botão de ação do campo de indicação:
 * - válido → tc-btn-success-ds com ícone ✓ (clique ainda limpa o campo)
 * - inválido/vazio → tc-btn-clear-ds com ícone ✕
 */
function _setReferralBtn(card, isValid, isError = false) {
    const btn = $('#btn-check-referral', card);
    if (!btn) return;
    if (isValid) {
        btn.className = 'tc-icon-btn-ds tc-action-ok flex-shrink-0';
        btn.title = 'Código válido';
        btn.innerHTML = '<i class="bi bi-check2-circle"></i>';
    } else if (isError) {
        btn.className = 'tc-icon-btn-ds tc-action-clear flex-shrink-0';
        btn.title = 'Endereço inválido';
        btn.innerHTML = '<i class="bi bi-x-circle"></i>';
    } else {
        btn.className = 'tc-icon-btn-ds flex-shrink-0';
        btn.title = 'Verificar endereço';
        btn.innerHTML = '<i class="bi bi-check-lg"></i>';
    }
}

function _setReferralBtnPending(card) {
    const btn = $('#btn-check-referral', card);
    if (!btn) return;
    btn.className = 'tc-icon-btn-ds flex-shrink-0';
    btn.title = 'Verificando...';
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>';
}

function _setFeedback(el, msg, type) {
    if (!el) return;
    el.textContent = msg;
    el.className =
        'tc-field-hint tc-referral-feedback ' +
        ({ neutral: '', success: 'text-success', error: 'text-danger' }[type] || '');
}

function _isEmptyCode(code) {
    const hex = String(code || '')
        .toLowerCase()
        .replace(/^0x/, '');
    return hex === '' || /^0+$/.test(hex);
}

function _cancelVerify() {
    _verifySeq += 1;
    if (_verifyTimer) clearTimeout(_verifyTimer);
    _verifyTimer = null;
}

async function _fetchRpcCode(rpcUrl, address, timeoutMs = 3500) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const signal = controller ? controller.signal : undefined;
    let timer = null;
    try {
        if (controller && timeoutMs && timeoutMs > 0) timer = setTimeout(() => controller.abort(), timeoutMs);
        const body = { jsonrpc: '2.0', id: 10, method: 'eth_getCode', params: [String(address), 'latest'] };
        const res = await fetch(String(rpcUrl), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal,
            cache: 'no-store',
        });
        if (!res.ok) return null;
        const js = await res.json().catch(() => null);
        const code = js && js.result ? String(js.result) : null;
        return code || null;
    } catch (_) {
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function _checkIsContractAddress(address) {
    const chainId = Number(_currentChainId || 0) || 0;
    const now = Date.now();
    if (
        _verifyCache.chainId === chainId &&
        _verifyCache.address === String(address || '').toLowerCase() &&
        now - (_verifyCache.ts || 0) < 60_000
    ) {
        return _verifyCache.isContract;
    }

    let code = null;
    try {
        if (_provider && typeof _provider.getCode === 'function') {
            code = await _provider.getCode(address);
        }
    } catch (_) {}

    if (!code) {
        const rpc = getFallbackRpc(chainId);
        if (rpc) {
            code = await _fetchRpcCode(rpc, address, 3500);
        }
    }

    if (!code) return null;

    const isContract = !_isEmptyCode(code);
    _verifyCache = { chainId, address: String(address || '').toLowerCase(), isContract, ts: now };
    return isContract;
}

function _applyValidReferrer(card, addr) {
    const feedback = $('#ref-addr-feedback', card);
    const badge = $('#ref-active-badge', card);

    _referrerAddress = ethers.utils.getAddress(addr);

    let feedbackMsg;
    if (_hasFactory && _basePrice > 0n) {
        const savings = ethers.utils.formatEther(_basePrice - _discountedPrice);
        feedbackMsg = `Código válido! Você economiza ${savings} ${_symbol}`;
    } else {
        const discountUSD = (PAYMENT_CONFIG.SERVICE_FEE_USD * 0.1).toFixed(2);
        feedbackMsg = `Código válido! Você economiza $${discountUSD} USD (10% de desconto)`;
    }

    _setFeedback(feedback, feedbackMsg, 'success');
    _setReferralBtn(card, true);
    if (badge) badge.classList.remove('d-none');
    _saveReferrer(_referrerAddress);
    _renderPriceBreakdown();
    _emitReferralChanged('valid');
}

function _applyInvalidContractReferrer(card) {
    const feedback = $('#ref-addr-feedback', card);
    const badge = $('#ref-active-badge', card);

    _referrerAddress = '';
    _setFeedback(
        feedback,
        'Este endereço é um contrato, não uma carteira pessoal. Informe o endereço de uma carteira (EOA).',
        'error',
    );
    _setReferralBtn(card, false, true);
    if (badge) badge.classList.add('d-none');
    _saveReferrer('');
    _renderPriceBreakdown();
    _emitReferralChanged('invalid');
}

function _applyUnverifiedReferrer(card) {
    const feedback = $('#ref-addr-feedback', card);
    const badge = $('#ref-active-badge', card);
    _referrerAddress = '';
    _setFeedback(feedback, 'Não foi possível verificar na rede agora. Tente novamente.', 'error');
    _setReferralBtn(card, false, true);
    if (badge) badge.classList.add('d-none');
    _saveReferrer('');
    _renderPriceBreakdown();
    _emitReferralChanged('unverified');
}

function _scheduleVerify(card, addr, delayMs = 450) {
    _verifySeq += 1;
    const seq = _verifySeq;
    if (_verifyTimer) clearTimeout(_verifyTimer);
    _verifyTimer = setTimeout(
        async () => {
            if (seq !== _verifySeq) return;
            const input = $('#referral-address-input', card);
            const currentRaw = (input?.value ?? '').trim();
            let currentNorm = '';
            try {
                currentNorm = currentRaw ? ethers.utils.getAddress(currentRaw) : '';
            } catch (_) {
                currentNorm = '';
            }
            if (!currentNorm || currentNorm.toLowerCase() !== String(addr || '').toLowerCase()) return;

            const isContract = await _checkIsContractAddress(addr);
            if (seq !== _verifySeq) return;
            const input2 = $('#referral-address-input', card);
            const cur2 = (input2?.value ?? '').trim();
            let cur2Norm = '';
            try {
                cur2Norm = cur2 ? ethers.utils.getAddress(cur2) : '';
            } catch (_) {
                cur2Norm = '';
            }
            if (!cur2Norm || cur2Norm.toLowerCase() !== String(addr || '').toLowerCase()) return;

            if (isContract === true) _applyInvalidContractReferrer(card);
            else if (isContract === false) _applyValidReferrer(card, addr);
            else _applyUnverifiedReferrer(card);
        },
        Math.max(0, Number(delayMs) || 0),
    );
}

// ── Persistência ──────────────────────────────────────────────────────────────

function _saveReferrer(addr) {
    try {
        if (addr) localStorage.setItem(REFERRER_STORAGE_KEY, addr);
        else localStorage.removeItem(REFERRER_STORAGE_KEY);
    } catch (_) {}
}

// ── Event listeners ───────────────────────────────────────────────────────────

function _bindEvents(card) {
    const input = $('#referral-address-input', card);
    const checkBtn = $('#btn-check-referral', card);
    const clearBtn = $('#btn-clear-referral', card);

    // Digitação: apenas validação de formato (síncrona)
    input?.addEventListener('input', (e) => _handleReferrerInput(e.target.value));
    input?.addEventListener('paste', (e) => {
        setTimeout(() => _handleReferrerInput(e.target.value), 0);
    });

    // Botão Verificar: valida formato + verifica se é carteira (EOA) e não contrato
    checkBtn?.addEventListener('click', async () => {
        const val = (input?.value ?? '').trim();

        // Sem valor: limpa estado
        if (!val) {
            _handleReferrerInput('');
            return;
        }

        // Formato EVM
        const isValid = ethers.utils.isAddress(val) && val !== ethers.constants.AddressZero;
        if (!isValid) {
            _handleReferrerInput(val);
            return;
        }

        // Própria carteira
        const myWallet = _getConnectedWallet();
        if (myWallet && val.toLowerCase() === myWallet.toLowerCase()) {
            _handleReferrerInput(val);
            return;
        }

        _handleReferrerInput(val, { immediate: true });
    });

    clearBtn?.addEventListener('click', () => {
        if (input) input.value = '';
        _handleReferrerInput('');
    });
}

function _getConnectedWallet() {
    try {
        return (
            window.walletConnector?.getStatus?.()?.account ||
            window.ethereum?.selectedAddress ||
            localStorage.getItem('tokencafe_wallet_address') ||
            ''
        );
    } catch (_) {
        return '';
    }
}
