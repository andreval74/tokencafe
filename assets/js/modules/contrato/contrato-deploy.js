/**
 * contrato-deploy.js — Página 2 do fluxo de criação de token.
 *
 * Responsabilidades:
 *  - Ler configuração salva em sessionStorage (tokencafe_pending_deploy)
 *  - Exibir resumo, cobrança e custos (conteúdo do modal inline)
 *  - Executar compile → pagar taxa → deploy → verificar → redirecionar
 */

import {
    state,
    hydrateStateFromPending,
    CONTRACT_GROUPS,
    compileContract,
    deployContract,
    getSerializableState,
    verifyCurrentContract,
    connectWallet,
} from './builder.js';
import { FeeManager } from './fee-manager.js';
import { PAYMENT_CONFIG } from './payment-config.js';
import { initReferral, setNetworkSymbol, getReferrer, getLastReferralData } from './referral.js';
import { getExplorerTxUrl } from '../../shared/explorer-utils.js';

// ── Estado do módulo ──────────────────────────────────────────────────────────
let _fees = null;
let _feeManager = new FeeManager();
let _isBusy = false;
let _config = null;
let _recalcTimeout = null;

// Retorna a chave do modelo selecionado para lookup de preço
const _getModelKey = () => _config?.group ?? null;
// Rastreia etapas concluídas na sessão atual para retomada inteligente após falha
let _completedSteps = new Set();
let _liveTxTimer = null;


// ── Inicialização ─────────────────────────────────────────────────────────────
function init() {
    const raw = sessionStorage.getItem('tokencafe_pending_deploy');
    if (!raw) {
        window.location.href = 'index.php?page=contrato';
        return;
    }

    try {
        _config = JSON.parse(raw);
    } catch (_) {
        window.location.href = 'index.php?page=contrato';
        return;
    }

    hydrateStateFromPending(_config);
    renderSummary(_config);

    document.addEventListener('wallet:connected', () => onWalletConnected());
    document.addEventListener('wallet:disconnected', () => {
        _fees = null;
        renderFeesWaiting();
        updateBtn();
    });

    if (window.walletConnector?.isConnected) connectWallet().then(() => onWalletConnected());

    // Fallback de timing: wallet:connected pode ter disparado antes desta página registrar o listener.
    // Tenta reconectar a cada 300ms por até 3s se o signer ainda não estiver disponível.
    let _walletRetries = 0;
    const _walletPoll = setInterval(async () => {
        _walletRetries++;
        if (state.wallet.signer || _walletRetries >= 10) { clearInterval(_walletPoll); return; }
        if (window.walletConnector?.isConnected || window.ethereum?.selectedAddress) {
            try {
                await connectWallet();
                if (state.wallet.signer) { clearInterval(_walletPoll); await onWalletConnected(); }
            } catch (_) {}
        }
    }, 300);

    document.getElementById('btnImplementar')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (!_isBusy) runDeploy();
    });
    document.getElementById('checkAll')?.addEventListener('change', updateBtn);
    document.getElementById('btnVoltar')?.addEventListener('click', () => {
        _completedSteps.clear();
    });
    document.getElementById('btnAlterarPais')?.addEventListener('click', () => {
        document.getElementById('countrySelectWrap')?.classList.toggle('d-none');
    });
    document.getElementById('feeCountrySelect')?.addEventListener('change', () => {
        const COUNTRIES = {
            BR: ['🇧🇷', 'Brasil'],
            EU: ['🇪🇺', 'Europa'],
            OT: ['🏳️', 'Outro país'],
            US: ['🇺🇸', 'United States'],
            SN: ['⛔', 'País sancionado'],
        };
        const val = document.getElementById('feeCountrySelect')?.value || 'BR';
        const [flag, name] = COUNTRIES[val] || ['🌍', val];
        const flagEl = document.getElementById('countryFlagDisplay');
        const nameEl = document.getElementById('countryNameDisplay');
        if (flagEl) flagEl.textContent = flag;
        if (nameEl) nameEl.textContent = name;
        document.getElementById('countrySelectWrap')?.classList.add('d-none');
        onCountryChange();
    });

    document.addEventListener('tc:referral-changed', (e) => {
        try {
            if (!state.wallet.signer) return;
            const hasRef = Boolean(getReferrer());
            const prevHasRef = Boolean(_fees?.hasReferral);
            if (hasRef === prevHasRef) return;

            if (_recalcTimeout) clearTimeout(_recalcTimeout);
            _recalcTimeout = setTimeout(async () => {
                if (state.wallet.signer) await renderFees();
            }, 150);
        } catch (_) {}
    });

    // Mostra dica quando botão ainda está desabilitado
    const hint = document.getElementById('deploy-btn-hint');
    if (hint) hint.classList.remove('d-none');

    // Recalcula custos automaticamente quando o usuário troca de conta no MetaMask
    if (window.ethereum?.on) {
        window.ethereum.on('accountsChanged', async (accounts) => {
            if (accounts?.length > 0 && state.wallet.signer) {
                await renderFees();
                updateBtn();
            } else {
                _fees = null;
                renderFeesWaiting();
                updateBtn();
            }
        });
    }
}

// ── Resumo do token — injeta dados nos elementos do contrato-deploy.php ──────
function renderSummary(config) {
    const { network, group, token, sale, advanced, initialOwner, initialHolder } = config;
    const gi = CONTRACT_GROUPS[group] || { title: group || 'Padrão' };
    const supply = token?.initialSupply ? Number(token.initialSupply).toLocaleString('pt-BR') : '—';

    const fill = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };
    const html = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = val;
    };
    const show = (id) => document.getElementById(id)?.classList.remove('d-none');
    const hide = (id) => document.getElementById(id)?.classList.add('d-none');
    const shorten = (a) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || '—');

    // Oculta spinner e exibe linhas fixas
    hide('ds-loading');
    ['ds-network-row', 'ds-name-row', 'ds-decimals-row', 'ds-type-row', 'ds-features-row'].forEach(show);

    // Rede
    fill('ds-view-network', `${network?.chainId || ''} - ${network?.name || '—'}`);

    // Nome + Símbolo
    fill('ds-view-name', token?.name || '—');
    fill('ds-view-symbol', token?.symbol || '—');

    // Decimais + Supply
    fill('ds-view-decimals', token?.decimals ?? 18);
    fill('ds-view-supply', supply);

    // Tipo de Contrato
    fill('ds-view-type', gi.summary ? `${gi.title} — ${gi.summary}` : gi.title);

    // Funcionalidades — badges precisam de innerHTML pelo ícone <i>
    const featureMap = [
        { key: 'mintable', label: 'Mintável', icon: 'bi-plus-circle', cls: 'tc-status-ok' },
        { key: 'burnable', label: 'Queimável', icon: 'bi-fire', cls: 'tc-status-warn' },
        { key: 'pausable', label: 'Pausável', icon: 'bi-pause-circle', cls: 'tc-status-warn' },
        { key: 'roles', label: 'Roles', icon: 'bi-person-badge', cls: 'tc-status-ok' },
        { key: 'antibot', label: 'Anti-Bot', icon: 'bi-shield-exclamation', cls: 'tc-status-ok' },
        { key: 'blacklist', label: 'Blacklist', icon: 'bi-slash-circle', cls: 'tc-status-bad' },
        { key: 'permit', label: 'Permit', icon: 'bi-key', cls: 'tc-status-ok' },
        { key: 'votes', label: 'Votes', icon: 'bi-bar-chart-line', cls: 'tc-status-ok' },
        { key: 'flashMint', label: 'Flash Mint', icon: 'bi-lightning-charge', cls: 'tc-status-ok' },
        { key: 'snapshots', label: 'Snapshots', icon: 'bi-camera', cls: 'tc-status-ok' },
        { key: 'maxWallet', label: 'Max Wallet', icon: 'bi-wallet', cls: 'tc-status-warn' },
        { key: 'maxTx', label: 'Max TX', icon: 'bi-arrows-angle-contract', cls: 'tc-status-warn' },
    ];
    const active = advanced ? featureMap.filter((f) => advanced[f.key]) : [];
    html(
        'ds-view-features',
        active.length
            ? active
                  .map(
                      (f) =>
                          `<span class="tc-badge-module ${f.cls}"><i class="bi ${f.icon} me-1"></i>${f.label}</span>`,
                  )
                  .join('')
            : `<span class="tc-badge-module tc-status-ok"><i class="bi bi-check2 me-1"></i>ERC-20</span><span class="tc-badge-module"><i class="bi bi-lock me-1"></i>Supply Fixo</span><span class="tc-badge-module"><i class="bi bi-arrow-left-right me-1"></i>Transferências</span>`,
    );

    // Owner + Holder — truncados para caber na mesma linha (4 colunas)
    if (initialOwner) {
        fill('ds-view-owner', shorten(initialOwner));
        show('ds-owner-row');
        if (initialHolder) {
            fill('ds-view-holder', shorten(initialHolder));
            show('ds-holder-label');
            show('ds-view-holder');
        }
    }

    // Venda
    if (gi.saleIntegration && sale) {
        fill('ds-view-sale-price', sale.priceDec || '—');
        fill('ds-view-sale-minmax', `${sale.minDec || '—'} / ${sale.maxDec || '—'}`);
        show('ds-sale-row');
        if (sale.payoutWallet) {
            fill('ds-view-sale-wallet', sale.payoutWallet);
            show('ds-sale-wallet-row');
        }
    }

    // Licença / outras configs
    if (advanced?.license) {
        fill('ds-view-other', `Licença: ${advanced.license}`);
        show('ds-other-row');
    }
}

// ── Carteira conectada ────────────────────────────────────────────────────────
// A carteira foi fixada na pág. 1 (verificação de saldo). Não há troca aqui.
async function onWalletConnected() {
    if (!state.wallet.signer || !state.form.network) return;
    const sym = state.form.network?.nativeCurrency?.symbol || 'ETH';
    setNetworkSymbol(sym);
    try {
        await initReferral(state.form.network.chainId, state.wallet.provider);
    } catch (_) {}
    await renderFees();
    updateWalletSigsInfo();
    updateBtn();
}

// ── País: avisa sobre restrições, mas não bloqueia (somos ferramenta tecnológica) ──────────────
function onCountryChange() {
    const val = document.getElementById('feeCountrySelect')?.value;
    const warn = val === 'US' || val === 'SN';
    const err = document.getElementById('deploy-error');
    if (err) {
        if (warn) {
            err.className = 'alert alert-warning d-flex align-items-center gap-2 mb-3 tc-text-sm py-2';
            err.innerHTML = `<i class="bi bi-exclamation-triangle flex-shrink-0"></i><span>Atenção: o uso desta plataforma pode ter restrições na sua jurisdição, você é responsável pela conformidade com as leis do país selecionado.</span>`;
            err.classList.remove('d-none');
        } else {
            err.classList.add('d-none');
            err.textContent = '';
        }
    }
    updateBtn();
}

// ── Placeholder sem carteira ──────────────────────────────────────────────────
function renderFeesWaiting() {
    const el = document.getElementById('deploy-fees');
    const explEl = document.getElementById('deploy-explanation');
    if (explEl) explEl.innerHTML = '';
    if (!el) return;
    el.innerHTML = `
        <div class="tc-modal-details-box d-flex align-items-start gap-3">
            <div class="tc-modal-icon--warning flex-shrink-0"><i class="bi bi-wallet2 fs-5"></i></div>
            <div>
                <div class="tc-modal-message-title">Carteira não conectada</div>
                <p class="tc-modal-message-desc mb-0">Conecte sua carteira para calcular a taxa de serviço e o custo de gas estimado.</p>
            </div>
        </div>`;
}

// ── Breakdown de custos ───────────────────────────────────────────────────────
async function renderFees() {
    const el = document.getElementById('deploy-fees');
    if (!el) return;

    el.innerHTML = `<div class="tc-loading-box">
        <div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
        <span class="tc-loading-box-text">Calculando custos...</span></div>`;

    try {
        const signer = state.wallet.signer;
        if (!signer) throw new Error('Carteira não conectada');
        _fees = await _feeManager.calculateFees(signer, state.form.network, null, _getModelKey());

        const {
            symbol,
            baseServiceFeeUSD,
            discountUSD,
            userServiceFeeUSD,
            serviceFeeCrypto,
            gasCostCrypto,
            gasCostUSD,
            referrerPortionUSD,
            platformPortionCrypto,
            referrerPortionCrypto,
            isTestnet,
            hasReferral,
        } = _fees;

        const fmtC = (v) => parseFloat(v ?? 0).toFixed(6);
        const fmtU = (v) => `$${parseFloat(v ?? 0).toFixed(2)}`;

        const rate = userServiceFeeUSD > 0 && serviceFeeCrypto > 0 ? serviceFeeCrypto / userServiceFeeUSD : 0;
        const baseCryptoDisplay = rate > 0 ? `${fmtC(baseServiceFeeUSD * rate)} ${symbol}` : '—';
        const discountCryptoDisplay = rate > 0 ? `- ${fmtC(discountUSD * rate)} ${symbol}` : '—';

        const totalCrypto =
            (platformPortionCrypto || 0) + (hasReferral ? referrerPortionCrypto || 0 : 0) + (gasCostCrypto || 0);
        const totalUSD = (userServiceFeeUSD || 0) + (gasCostUSD || 0);
        const exchangeRate = serviceFeeCrypto > 0 ? userServiceFeeUSD / serviceFeeCrypto : 0;

        const gasDisplay =
            gasCostCrypto > 0
                ? `${fmtC(gasCostCrypto)} ${symbol}`
                : gasCostUSD > 0
                  ? `≈ ${fmtU(gasCostUSD)}`
                  : 'estimado';

        const secTitle = `font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.35)`;
        const goldColor = '#f59e0b';

        // Círculo numerado com id atribuível para atualização de status durante deploy
        const circleBase = `width:28px;height:28px;border-radius:50%;font-size:0.8rem;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0`;
        const circle = (bg, border, color, num, id = '') =>
            `<div ${id ? `id="${id}"` : ''} style="${circleBase};background:${bg};border:1px solid ${border};color:${color}">${num}</div>`;

        el.innerHTML = `
            <div class="tc-modal-details-box">

                <!-- Row de compile — preenchida com status durante deploy -->
                <div id="deploy-row-compile" class="d-flex align-items-center gap-2 py-2 tc-divider-bottom mb-2">
                    <div id="deploy-circle-compile" style="${circleBase};background:rgba(251,191,36,0.15);border:1px solid rgba(251,191,36,0.4);color:#fbbf24">
                        <i class="bi bi-file-earmark-code"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="tc-text-sm fw-semibold" style="color:#fbbf24">Compilar contrato</div>
                        <div id="deploy-sub-compile" class="tc-status-text" style="font-size:0.7rem">Aguardando início</div>
                    </div>
                </div>

                <!-- Cabeçalho: título + cotação -->
                <div class="d-flex align-items-center justify-content-between mb-2">
                    <div class="tc-label-caps">Custos do Deploy</div>
                    ${exchangeRate > 0 ? `<div class="tc-text-sm fw-semibold" style="color:${goldColor}"><i class="bi bi-lock me-1"></i>1 ${esc(symbol)} = $${Math.round(exchangeRate).toLocaleString('pt-BR')}</div>` : ''}
                </div>

                <div class="py-2 tc-divider-top" style="${secTitle}">Etapas de Confirmações na Carteira</div>

                <!-- Cabeçalhos de coluna -->
                <div class="d-flex align-items-center gap-2 pb-1 tc-divider-top pt-2">
                    <div style="width:28px;flex-shrink:0"></div>
                    <div class="flex-grow-1 tc-label-caps" style="font-size:0.65rem">Descrição</div>
                    <div class="text-center tc-label-caps" style="min-width:75px;font-size:0.65rem">USD</div>
                    <div class="text-end tc-label-caps" style="min-width:110px;font-size:0.65rem">${esc(symbol)}</div>
                </div>

                <!-- Etapa 1: Plataforma TokenCafe -->
                <div id="deploy-row-fee" class="d-flex align-items-start gap-2 py-2">
                    ${circle('rgba(248,93,35,0.15)', 'rgba(248,93,35,0.4)', 'var(--tokencafe-primary)', 1, 'deploy-circle-fee')}
                    <div class="flex-grow-1">
                        <div class="tc-text-sm fw-semibold" style="color:var(--tokencafe-primary)"><i class="bi bi-building me-1"></i>Plataforma TokenCafe</div>
                        <div id="deploy-sub-fee" class="tc-status-text" style="font-size:0.7rem">taxa de serviço, valor cheio sem os descontos</div>
                        <div id="deploy-tx-fee" class="d-none mt-1"></div>
                    </div>
                    <div class="text-center" style="min-width:75px">
                        <div class="tc-text-sm fw-semibold" style="color:var(--tokencafe-primary)">${fmtU(baseServiceFeeUSD)}</div>
                    </div>
                    <div class="text-end" style="min-width:110px">
                        <div class="tc-text-sm fw-semibold" style="color:var(--tokencafe-primary)">${baseCryptoDisplay}</div>
                    </div>
                </div>

                ${hasReferral ? `
                <!-- Sub-linha: desconto por indicação -->
                <div class="d-flex align-items-center gap-2 pb-2">
                    <div style="width:28px;flex-shrink:0"></div>
                    <div class="flex-grow-1">
                        <div class="tc-text-sm" style="color:#4ade80"><i class="bi bi-tag me-1"></i>Desconto por indicação (10%)</div>
                    </div>
                    <div class="text-center" style="min-width:75px">
                        <div class="tc-text-sm" style="color:#4ade80">- ${fmtU(discountUSD)}</div>
                    </div>
                    <div class="text-end" style="min-width:110px">
                        <div class="tc-text-sm" style="color:#4ade80">${discountCryptoDisplay}</div>
                    </div>
                </div>` : ''}

                ${hasReferral ? `
                <!-- Etapa 2: Bônus ao indicador -->
                <div id="deploy-row-referral" class="d-flex align-items-center gap-2 py-2 tc-divider-top">
                    ${circle('rgba(192,132,252,0.15)', 'rgba(192,132,252,0.4)', '#c084fc', 2, 'deploy-circle-referral')}
                    <div class="flex-grow-1">
                        <div class="tc-text-sm fw-semibold" style="color:#c084fc"><i class="bi bi-gift-fill me-1"></i>Bônus ao indicador</div>
                        <div id="deploy-sub-referral" class="tc-status-text" style="font-size:0.7rem">incluso na taxa — repassado pela plataforma ao indicador</div>
                        <div id="deploy-tx-referral" class="d-none mt-1"></div>
                    </div>
                    <div class="text-center" style="min-width:75px">
                        <div class="tc-text-sm fw-semibold" style="color:#c084fc">${fmtU(referrerPortionUSD)}</div>
                    </div>
                    <div class="text-end" style="min-width:110px">
                        <div class="tc-text-sm fw-semibold" style="color:#c084fc">${fmtC(referrerPortionCrypto)} ${esc(symbol)}</div>
                    </div>
                </div>` : ''}

                <!-- Etapa 2/3: Rede — gas / deploy -->
                <div id="deploy-row-deploy" class="d-flex align-items-center gap-2 py-2 tc-divider-top">
                    ${circle('rgba(96,165,250,0.15)', 'rgba(96,165,250,0.4)', '#60a5fa', hasReferral ? 3 : 2, 'deploy-circle-deploy')}
                    <div class="flex-grow-1">
                        <div class="tc-text-sm fw-semibold" style="color:#60a5fa"><i class="bi bi-fire me-1"></i>Rede (gas / deploy)</div>
                        <div id="deploy-sub-deploy" class="tc-status-text" style="font-size:0.7rem">custo estimado do deploy na blockchain</div>
                        <div id="deploy-tx-deploy" class="d-none mt-1"></div>
                    </div>
                    <div class="text-center" style="min-width:75px">
                        <div class="tc-text-sm fw-semibold" style="color:#60a5fa">${gasCostUSD > 0 ? fmtU(gasCostUSD) : '—'}</div>
                    </div>
                    <div class="text-end" style="min-width:110px">
                        <div class="tc-text-sm fw-semibold" style="color:#60a5fa">${gasDisplay}</div>
                    </div>
                </div>

                <!-- Total -->
                <div class="d-flex align-items-center gap-2 pt-3 tc-divider-top">
                    <div class="flex-grow-1">
                        <div class="tc-label-caps" style="color:#4ade80">TOTAL A PAGAR</div>
                    </div>
                    <div class="text-center" style="min-width:75px">
                        <div class="tc-text-sm fw-semibold" style="color:#4ade80">≈ ${fmtU(totalUSD)}</div>
                    </div>
                    <div class="text-end" style="min-width:110px">
                        <div class="fw-bold" style="color:#4ade80;font-size:1.1rem">${fmtC(totalCrypto)} ${esc(symbol)}</div>
                    </div>
                </div>

                <!-- Aviso: etapas sequenciais -->
                <div class="d-flex align-items-start gap-2 mt-3 pt-2 tc-divider-top tc-text-sm tc-status-text">
                    <i class="bi bi-shield-lock flex-shrink-0" style="color:${goldColor};margin-top:1px"></i>
                    <span>Cada etapa gera um comprovante na blockchain. <strong class="text-white">Não é possível pular etapas</strong> — sem o comprovante anterior o registro do seu contrato não é executado e os valores já pagos não são devolvidos.</span>
                </div>

                <!-- Row de status ao vivo — torna-se visível quando o deploy inicia -->
                <div id="deploy-row-verify" class="d-none d-flex align-items-center gap-2 py-2 tc-divider-top mt-2">
                    <div id="deploy-circle-verify" style="${circleBase};background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.4)">
                        <i class="bi bi-activity"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="tc-text-sm fw-semibold" id="deploy-live-title" style="color:rgba(255,255,255,0.55)">Status do Deploy</div>
                        <div id="deploy-sub-verify" class="tc-status-text" style="font-size:0.7rem">Aguardando início</div>
                        <div id="deploy-live-tx" class="d-none mt-1"></div>
                    </div>
                </div>

            </div>`;

        const explEl = document.getElementById('deploy-explanation');
        if (explEl) {
            explEl.innerHTML = hasReferral
                ? `<div class="tc-modal-details-box mb-3" style="background:rgba(255,255,255,0.03)"><p class="tc-text-sm tc-status-text mb-0"><i class="bi bi-gift me-1" style="color:#c084fc"></i>Com código de indicação você faz <strong class="text-white">3 confirmações</strong>: taxa à plataforma (1), bônus ao indicador (2) e gas de deploy (3). Você economiza <strong class="text-white">${fmtU(discountUSD)}</strong> sobre o preço base — esse valor é repassado ao indicador, sem custo extra para você.</p></div>`
                : `<div class="tc-modal-details-box mb-3" style="background:rgba(255,255,255,0.03)"><p class="tc-text-sm tc-status-text mb-0"><i class="bi bi-info-circle me-1"></i>Sem código de indicação você faz <strong class="text-white">2 confirmações</strong>: taxa de serviço (1) e gas de deploy (2). Informe um código de indicação para obter <strong class="text-white">10% de desconto</strong>.</p></div>`;
        }

        const testnetEl = document.getElementById('deploy-testnet-alert');
        if (testnetEl) {
            testnetEl.innerHTML = isTestnet
                ? `<div class="alert alert-warning d-flex align-items-center gap-2 py-2 tc-text-sm mt-4 mb-0"><i class="bi bi-exclamation-triangle flex-shrink-0"></i><span><strong>Modo Testnet:</strong> a cobrança usa tokens de teste (sem valor real). Verificação disponível apenas em mainnets.</span></div>`
                : '';
        }
    } catch (e) {
        console.error('Erro ao calcular custos:', e);
        el.innerHTML = `
            <div class="d-flex align-items-start gap-3">
                <div class="tc-modal-icon--danger flex-shrink-0"><i class="bi bi-exclamation-triangle fs-5"></i></div>
                <div>
                    <div class="tc-modal-message-title">Erro ao calcular custos</div>
                    <p class="tc-modal-message-desc mb-0">Reconecte sua carteira e tente novamente.</p>
                </div>
            </div>`;
    }

    renderBillingCard();
    updateBtn();
}

// ── Card de carteira de pagamento — exibe endereço e saldo fixos (sem seletor) ──
function renderBillingCard() {
    const elAddr  = document.getElementById('billing-wallet-addr');
    const elBal   = document.getElementById('billing-wallet-bal');
    const elAlert = document.getElementById('deploy-balance-alert');

    const addr  = _fees?.billingAddress || state.wallet?.address || '';
    const bal   = _fees?.balanceCrypto ?? null;
    const sym   = _fees?.symbol || '';
    const enough = _fees ? _fees.isBalanceEnough !== false : true;

    if (elAddr) elAddr.textContent = addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : '—';
    if (elBal)  elBal.textContent  = bal !== null ? `${parseFloat(bal).toFixed(6)} ${sym}` : 'calculando...';
    if (elAlert) elAlert.classList.toggle('d-none', enough);
}

// ── Info confirmações ─────────────────────────────────────────────────────────
function updateWalletSigsInfo() {
    const subtitle = document.getElementById('wallet-sigs-subtitle');
    const refItem = document.getElementById('sig-referral-item');
    const hasRef = Boolean(getReferrer());
    const count = 2 + (hasRef ? 1 : 0);
    if (subtitle) subtitle.textContent = `Serão solicitadas ${count} confirmações na carteira`;
    if (refItem) refItem.classList.toggle('d-none', !hasRef);
}

// ── Habilitar botão Implementar ───────────────────────────────────────────────
function updateBtn() {
    const btn = document.getElementById('btnImplementar');
    const hint = document.getElementById('deploy-btn-hint');
    if (!btn) return;

    const ok =
        Boolean(document.getElementById('checkAll')?.checked) &&
        Boolean(state.wallet.signer) &&
        _fees !== null &&
        _fees.isBalanceEnough !== false;

    btn.disabled = !ok || _isBusy;

    if (!hint) return;
    if (ok) {
        hint.classList.add('d-none');
        return;
    }
    hint.classList.remove('d-none');
    if (!state.wallet.signer) {
        hint.innerHTML = `<i class="bi bi-wallet2 me-1"></i>Conecte sua carteira para continuar`;
    } else if (_fees === null) {
        hint.innerHTML = `<i class="bi bi-hourglass me-1"></i>Calculando custos...`;
    } else if (_fees.isBalanceEnough === false) {
        hint.innerHTML = `<i class="bi bi-exclamation-triangle me-1"></i>Saldo insuficiente na carteira conectada`;
    } else if (!document.getElementById('checkAll')?.checked) {
        hint.innerHTML = `<i class="bi bi-check-square me-1"></i>Confirme as declarações para continuar`;
    }
}

// ── Atualiza status de um step nos círculos superiores (sem animação) ─────────
function setFeeStepStatus(id, status, sub = null) {
    const circleEl = document.getElementById(`deploy-circle-${id}`);
    const subEl    = document.getElementById(`deploy-sub-${id}`);

    if (sub && subEl) subEl.textContent = sub;

    if (circleEl && status !== 'pending') {
        if (status === 'active') {
            // Cada etapa usa a própria cor para destaque da borda
            const stepColors = {
                compile:  'rgba(255,255,255,0.5)',
                fee:      'rgba(248,93,35,0.8)',
                referral: 'rgba(192,132,252,0.8)',
                deploy:   'rgba(96,165,250,0.8)',
            };
            circleEl.style.borderColor = stepColors[id] || 'rgba(248,93,35,0.8)';
            circleEl.style.opacity = '1';
        } else {
            circleEl.style.borderColor = '';
            circleEl.style.opacity = '';
            const icons = {
                done:  `<i class="bi bi-check-circle-fill text-success" style="font-size:1.2rem"></i>`,
                error: `<i class="bi bi-x-circle-fill text-danger" style="font-size:1.2rem"></i>`,
                skip:  `<i class="bi bi-dash-circle text-secondary" style="font-size:1.2rem"></i>`,
            };
            if (icons[status]) circleEl.innerHTML = icons[status];
        }
    }
}

// ── Row inferior: status ao vivo com spinner + TX hash auto-fade ──────────────
// color: cor da fase atual (laranja=taxa, roxo=indicador, azul=deploy, verde=ok)
function setLiveStatus(status, title, sub, txHash = null, txUrl = null, color = null) {
    const rowEl    = document.getElementById('deploy-row-verify');
    const circleEl = document.getElementById('deploy-circle-verify');
    const titleEl  = document.getElementById('deploy-live-title');
    const subEl    = document.getElementById('deploy-sub-verify');
    const txEl     = document.getElementById('deploy-live-tx');

    rowEl?.classList.replace('d-none', 'd-flex');

    const activeColor = color || 'var(--tokencafe-primary)';
    const icons = {
        active: `<div class="spinner-border spinner-border-sm" role="status" style="color:${activeColor}"></div>`,
        done:   `<i class="bi bi-check-circle-fill" style="color:#4ade80;font-size:1.2rem"></i>`,
        error:  `<i class="bi bi-x-circle-fill text-danger" style="font-size:1.2rem"></i>`,
        skip:   `<i class="bi bi-dash-circle text-secondary" style="font-size:1.2rem"></i>`,
    };
    if (circleEl && icons[status]) circleEl.innerHTML = icons[status];
    if (titleEl && title !== null) {
        titleEl.textContent = title;
        titleEl.style.color = status === 'active' ? activeColor
            : status === 'done'  ? '#4ade80'
            : status === 'error' ? '#ef4444'
            : 'rgba(255,255,255,0.55)';
    }
    if (subEl && sub !== null) subEl.textContent = sub;

    if (!txEl) return;
    if (txHash) {
        const short = `${txHash.slice(0, 8)}…${txHash.slice(-6)}`;
        txEl.innerHTML = txUrl
            ? `<a href="${txUrl}" target="_blank" rel="noopener" class="font-monospace tc-text-sm" style="color:#4ade80"><i class="bi bi-box-arrow-up-right me-1"></i>${short}</a>`
            : `<span class="font-monospace tc-text-sm" style="color:#4ade80">${short}</span>`;
        txEl.classList.remove('d-none');
        txEl.style.opacity = '1';
        txEl.style.transition = '';
        if (_liveTxTimer) clearTimeout(_liveTxTimer);
        _liveTxTimer = setTimeout(() => {
            txEl.style.transition = 'opacity 0.8s';
            txEl.style.opacity = '0';
            setTimeout(() => {
                txEl.classList.add('d-none');
                txEl.style.opacity = '';
                txEl.style.transition = '';
                _liveTxTimer = null;
            }, 800);
        }, 5000);
    } else {
        if (_liveTxTimer) { clearTimeout(_liveTxTimer); _liveTxTimer = null; }
        txEl.classList.add('d-none');
        txEl.innerHTML = '';
    }
}

// Atualiza o subtítulo da seção de cobrança durante o deploy
function setDeploySubtitle(msg) {
    const el = document.getElementById('billing-section-subtitle');
    if (el) el.textContent = msg;
}

// ── Fluxo de deploy ───────────────────────────────────────────────────────────
async function runDeploy() {
    if (_isBusy) return;
    _isBusy = true;

    const btnImpl   = document.getElementById('btnImplementar');
    const btnVoltar = document.getElementById('btnVoltar');
    const errorDiv  = document.getElementById('deploy-error');
    const chainId   = state.form?.network?.chainId;

    if (btnImpl) {
        btnImpl.disabled = true;
        btnImpl.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Processando...`;
    }
    if (btnVoltar) btnVoltar.classList.add('disabled', 'pe-none');
    if (errorDiv) { errorDiv.classList.add('d-none'); errorDiv.textContent = ''; }

    // Row de status ao vivo fica visível durante todo o fluxo
    setLiveStatus('active', 'Iniciando deploy…', 'Preparando…');

    // Etapas já concluídas ficam 'done' imediatamente (retomada após falha)
    _completedSteps.forEach((id) => setFeeStepStatus(id, 'done'));

    const signer = state.wallet.signer;
    if (!signer) throw new Error('Carteira não conectada. Reconecte e tente novamente.');
    let _activeStep = 'init';

    try {
        // 1. Compilar
        if (!_completedSteps.has('compile')) {
            _activeStep = 'compile';
            setFeeStepStatus('compile', 'active', 'Gerando código-fonte e compilando…');
            setLiveStatus('active', 'Compilar contrato', 'Gerando código-fonte e compilando…', null, null, 'rgba(255,255,255,0.7)');
            setDeploySubtitle('Compilando contrato...');
            const compiled = await compileContract({ skipUIValidation: true });
            if (!compiled) throw new Error('Falha na compilação do contrato. Verifique os logs da API.');
            _completedSteps.add('compile');
        }
        setFeeStepStatus('compile', 'done', 'Contrato compilado com sucesso');

        // 2. Taxa de serviço (pula se já paga — nunca cobra duas vezes)
        if (!_completedSteps.has('fee')) {
            _activeStep = 'fee';
            setFeeStepStatus('fee', 'active', 'Confirme o pagamento na carteira…');
            setLiveStatus('active', 'Plataforma TokenCafe', 'Confirme o pagamento na carteira…', null, null, '#f85d23');
            setDeploySubtitle('Aguardando confirmação do pagamento na carteira...');
            if (!_fees) _fees = await _feeManager.calculateFees(signer, state.form.network, null, _getModelKey());

            const feeResult = await _feeManager.payFeeDirect(signer, _fees, (msg) => {
                setLiveStatus('active', 'Plataforma TokenCafe', msg, null, null, '#f85d23');
            }, async () => {
                // Plataforma confirmada — bônus ao indicador começa agora
                setFeeStepStatus('fee', 'done', 'Taxa paga com sucesso');
                _activeStep = 'referral';
                setFeeStepStatus('referral', 'active', 'Confirme o bônus na carteira…');
                setLiveStatus('active', 'Bônus ao indicador', 'Confirme o bônus na carteira…', null, null, '#c084fc');
            });

            _completedSteps.add('fee');

            // Persistir hashes e valores no state para exibição na tela de detalhes
            if (feeResult?.txPlatform) state.deployed.txPlatform = feeResult.txPlatform;
            if (feeResult?.txReferrer) state.deployed.txReferrer = feeResult.txReferrer;
            if (_fees) {
                state.deployed.feeSymbol         = _fees.symbol;
                state.deployed.feePlatformAmount = _fees.platformPortionCrypto;
                state.deployed.feeReferrerAmount = _fees.referrerPortionCrypto;
                state.deployed.feePlatformUSD    = _fees.platformPortionUSD;
                state.deployed.feeTotalUSD       = _fees.userServiceFeeUSD;
                state.deployed.referrerAddress   = _fees.referrerAddr || null;
                state.deployed.gasEstimateCrypto = _fees.gasCostCrypto || null;
            }
            // Endereço de origem (quem pagou) e destino da taxa de plataforma
            state.deployed.billingAddress = window.walletConnector?.getStatus?.()?.account
                || state.wallet.address;
            state.deployed.platformWallet = PAYMENT_CONFIG.RECEIVER_WALLET || null;

            const feeTxUrl = feeResult?.txPlatform ? getExplorerTxUrl(feeResult.txPlatform, chainId) : null;
            setFeeStepStatus('fee', 'done', 'Taxa paga com sucesso');

            if (_fees.hasReferral) {
                if (feeResult?.txReferrer) {
                    const refTxUrl = getExplorerTxUrl(feeResult.txReferrer, chainId);
                    setFeeStepStatus('referral', 'done', 'Bônus enviado ao indicador');
                    setLiveStatus('active', 'Bônus ao indicador', 'Bônus enviado', feeResult.txReferrer, refTxUrl, '#c084fc');
                } else {
                    setFeeStepStatus('referral', 'skip', _fees.isTestnet ? 'Testnet — bônus simulado sem TX real' : 'Incluído na taxa da plataforma');
                    setLiveStatus('active', 'Taxa de serviço', 'Taxa paga', feeResult?.txPlatform, feeTxUrl, '#f85d23');
                }
                _completedSteps.add('referral');
            } else {
                setLiveStatus('active', 'Taxa de serviço', 'Taxa paga', feeResult?.txPlatform, feeTxUrl, '#f85d23');
            }
        }

        // 3. Deploy
        if (!_completedSteps.has('deploy')) {
            _activeStep = 'deploy';
            setFeeStepStatus('deploy', 'active', 'Confirme o deploy na carteira…');
            setLiveStatus('active', 'Rede (gas / deploy)', 'Confirme o deploy na carteira…', null, null, '#60a5fa');
            setDeploySubtitle('Aguardando confirmação do deploy na carteira...');
            const success = await deployContract({ skipUIValidation: true, skipFeePayment: true });
            if (!success) throw new Error('Deploy cancelado ou rejeitado na carteira.');
            _completedSteps.add('deploy');
            const deployTxHash = state.deployed?.transactionHash;
            const deployTxUrl  = deployTxHash ? getExplorerTxUrl(deployTxHash, chainId) : null;
            setFeeStepStatus('deploy', 'done', 'Contrato publicado na blockchain');
            setLiveStatus('active', 'Rede (gas / deploy)', 'Contrato publicado', deployTxHash, deployTxUrl, '#60a5fa');
        }

        // Persiste estado e dados de indicação
        try {
            const safeState = getSerializableState();
            if (safeState) sessionStorage.setItem('lastDeployedContract', JSON.stringify(safeState));
        } catch (_) {}
        try {
            const refData = getLastReferralData();
            if (refData) {
                sessionStorage.setItem('tc_last_referral', JSON.stringify({
                    usedReferral: true,
                    referrer: refData.referrer,
                    saved: refData.saved.toString(),
                    referrerGot: refData.referrerGot.toString(),
                    symbol: refData.symbol,
                }));
            } else {
                sessionStorage.removeItem('tc_last_referral');
            }
        } catch (_) {}

        // 4. Verificar
        _activeStep = 'verify';
        setLiveStatus('active', 'Verificar no explorer', 'Enviando para o explorer…', null, null, '#4ade80');
        setDeploySubtitle('Verificando no explorer...');
        try {
            const res = await verifyCurrentContract();
            const verifyOk = res?.success || res?.alreadyVerified;
            setLiveStatus(verifyOk ? 'done' : 'skip', 'Verificar no explorer', verifyOk ? 'Verificado no explorer' : 'Pulada (apenas mainnets)', null, null, '#4ade80');
        } catch (_) {
            setLiveStatus('skip', 'Verificar no explorer', 'Pulada (apenas mainnets)', null, null, '#4ade80');
        }

        // 5. Redirecionar
        setDeploySubtitle('Concluído! Redirecionando...');
        setLiveStatus('done', 'Deploy concluído!', 'Redirecionando em breve…');
        _completedSteps.clear();
        try {
            const addr = state.deployed?.address ? String(state.deployed.address) : '';
            if (addr) document.cookie = `tokencafe_contract=${encodeURIComponent(addr)}; Path=/; SameSite=Lax`;
            if (chainId && !isNaN(Number(chainId)))
                document.cookie = `tokencafe_chain_id=${encodeURIComponent('0x' + Number(chainId).toString(16))}; Path=/; SameSite=Lax`;
            const body = new URLSearchParams({ page: 'contrato_criado' });
            if (addr) body.set('contract', addr);
            if (chainId != null) body.set('chainId', String(chainId));
            if (navigator.sendBeacon)
                navigator.sendBeacon('log-event.php', new Blob([body.toString()], { type: 'application/x-www-form-urlencoded' }));
        } catch (_) {}

        const addr   = state.deployed?.address;
        const cid    = chainId;
        const target = addr
            ? `index.php?page=contrato-detalhes&address=${encodeURIComponent(addr)}${cid != null ? '&chainId=' + encodeURIComponent(cid) : ''}`
            : 'index.php?page=contrato-detalhes';
        setTimeout(() => { window.location.href = target; }, 1200);

    } catch (e) {
        console.error('Deploy error:', e);

        if (_activeStep !== 'verify') setFeeStepStatus(_activeStep, 'error', 'Falhou');
        setLiveStatus('error', 'Erro no deploy', e?.message || 'Erro desconhecido. Tente novamente.');

        if (errorDiv) {
            errorDiv.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>${esc(e?.message || 'Erro desconhecido. Tente novamente.')}`;
            errorDiv.classList.remove('d-none');
        }
        _isBusy = false;
        if (btnImpl) {
            btnImpl.disabled = false;
            const nextStep = ['compile', 'fee', 'deploy'].find((s) => !_completedSteps.has(s));
            const stepLabels = { compile: 'compilação', fee: 'pagamento da taxa', deploy: 'deploy' };
            const retryLabel = nextStep && _completedSteps.size > 0
                ? `Retomar a partir do ${stepLabels[nextStep]}`
                : 'Tentar Novamente';
            btnImpl.innerHTML = `<i class="bi bi-arrow-repeat me-2"></i>${retryLabel}`;
        }
        if (btnVoltar) btnVoltar.classList.remove('disabled', 'pe-none');
    }
}

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

init();
