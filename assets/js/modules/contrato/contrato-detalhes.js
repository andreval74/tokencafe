import { updateContractDetailsView, initContainer, updateVerificationBadge } from '../../shared/contract-search.js';
import { getVerificationStatus } from '../../shared/verify-utils.js';
import { isWalletAdmin } from '../../shared/admin-security.js';
import { showFileModal } from '../../shared/file-viewer.js';
import { getExplorerContractUrl, getExplorerTxUrl } from '../../shared/explorer-utils.js';

class ContractDetailsManager {
    constructor() {
        this.state = null;
        this.verifPoll = null;
        this._walletListenersAttached = false;
        this._actionsObserver = null;
        this._globalFileClickBound = false;
        this.init();
    }

    resolveIsAdminSync() {
        try {
            if (window.TOKENCAFE_IS_ADMIN === true) return true;
        } catch (_) {}
        try {
            const match = document.cookie.match(new RegExp('(^| )tokencafe_wallet_address=([^;]+)'));
            if (match && match[2] && isWalletAdmin(match[2])) return true;
        } catch (_) {}
        try {
            const ls = window.localStorage?.getItem?.('tokencafe_wallet_address') || '';
            if (ls && isWalletAdmin(ls)) return true;
        } catch (_) {}
        return false;
    }

    applyShareAccessControl() {
        try {
            const isAdmin = this.resolveIsAdminSync();
            const files = document.getElementById('files-section');
            // Arquivos disponíveis apenas para administradores do sistema
            if (files) files.classList.toggle('d-none', !isAdmin);
        } catch (_) {}
    }

    attachWalletListeners() {
        try {
            if (this._walletListenersAttached) return;
            this._walletListenersAttached = true;

            const rerun = async () => {
                try {
                    if (this.state) this.setupDownloads();
                } catch (_) {}
                try {
                    this.applyShareAccessControl();
                } catch (_) {}
            };

            document.addEventListener('wallet:connected', rerun);
            document.addEventListener('wallet:disconnected', rerun);

            try {
                if (window.ethereum && typeof window.ethereum.on === 'function') {
                    window.ethereum.on('accountsChanged', () => rerun());
                    window.ethereum.on('chainChanged', () => setTimeout(rerun, 300));
                }
            } catch (_) {}
        } catch (_) {}
    }

    resolveCompilationForDownloads() {
        try {
            const currentAddr = String(
                this.state?.deployed?.address || this.state?.deployed?.contractAddress || '',
            ).toLowerCase();
            const currentCid = Number(this.state?.form?.network?.chainId || this.state?.wallet?.chainId || 0);
            if (!currentAddr || !currentCid) return;

            if (
                this.state?.compilation?.sourceCode ||
                this.state?.compilation?.input ||
                this.state?.compilation?.abi ||
                this.state?.compilation?.bytecode
            ) {
                return;
            }

            // 1) Prefer artefatos completos da sessão de deploy
            try {
                const raw = sessionStorage.getItem('lastDeployedContract');
                const st = raw ? JSON.parse(raw) : null;
                const sAddr = String(st?.deployed?.address || st?.deployed?.contractAddress || '').toLowerCase();
                const sCid = Number(st?.form?.network?.chainId || st?.wallet?.chainId || 0);
                if (st && sAddr === currentAddr && sCid === currentCid && st?.compilation) {
                    this.state.compilation = { ...(this.state.compilation || {}), ...st.compilation };
                    return;
                }
            } catch (_) {}

            // 2) Fallback parcial: payload de verificação salvo (fonte do contrato)
            try {
                const raw = localStorage.getItem('tokencafe_contract_verify_payload');
                const p = raw ? JSON.parse(raw) : null;
                const pAddr = String(p?.contractAddress || '').toLowerCase();
                const pCid = Number(p?.chainId || 0);
                const src = String(p?.sourceCode || '').trim();
                if (p && pAddr === currentAddr && pCid === currentCid && src) {
                    const contractName = String(p?.contractName || 'Contract').trim() || 'Contract';
                    const inputObj = {
                        language: 'Solidity',
                        sources: { [`${contractName}.sol`]: { content: src } },
                        settings: {
                            optimizer: {
                                enabled: p?.optimizationUsed === 0 || p?.optimizationUsed === '0' ? false : true,
                                runs: Number.isFinite(Number(p?.runs)) ? Number(p.runs) : 200,
                            },
                            evmVersion: p?.evmVersion || p?.evmversion || 'default',
                        },
                    };
                    this.state.compilation = {
                        ...(this.state.compilation || {}),
                        contractName,
                        sourceCode: src,
                        input: JSON.stringify(inputObj),
                    };
                }
            } catch (_) {}
        } catch (_) {}
    }

    writeContractContext(address, chainId, pageName = 'contrato-detalhes') {
        try {
            const addr = String(address || '').trim();
            const cid = Number(chainId);
            if (addr) document.cookie = `tokencafe_contract=${encodeURIComponent(addr)}; Path=/; SameSite=Lax`;
            if (cid && !isNaN(cid)) {
                const hex = '0x' + cid.toString(16);
                document.cookie = `tokencafe_chain_id=${encodeURIComponent(hex)}; Path=/; SameSite=Lax`;
            }
        } catch (_) {}
        try {
            const addr = String(address || '').trim();
            const cid = String(chainId || '').trim();
            const body = new URLSearchParams({ page: String(pageName || 'contrato-detalhes') });
            if (addr) body.set('contract', addr);
            if (cid) body.set('chainId', cid);
            if (navigator.sendBeacon) {
                const blob = new Blob([body.toString()], { type: 'application/x-www-form-urlencoded' });
                navigator.sendBeacon('log-event.php', blob);
            } else {
                fetch('log-event.php', {
                    method: 'POST',
                    body,
                    credentials: 'include',
                    keepalive: true,
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                });
            }
        } catch (_) {}
    }

    _isTestnet(chainId) {
        const TESTNETS = [97, 11155111, 80001, 84532, 43113, 421614, 5, 4, 3];
        return TESTNETS.includes(Number(chainId));
    }

    startVerificationPolling(chainId, address) {
        try {
            if (this.verifPoll) return;
            const cid = String(chainId || '').trim();
            const addr = String(address || '').trim();
            if (!cid || !addr) return;

            // Não-admin em testnet: sem polling, sem verificação
            if (this._isTestnet(cid) && !this.resolveIsAdminSync()) return;

            let attempts = 0;
            const maxAttempts = 24;
            const poll = async () => {
                attempts++;
                if (attempts > maxAttempts) {
                    try {
                        clearInterval(this.verifPoll);
                    } catch (_) {}
                    this.verifPoll = null;
                    // Exibe botão para o usuário forçar re-checagem manualmente
                    this._showVerifyRefreshButton(cid, addr);
                    return;
                }
                try {
                    const js = await updateVerificationBadge(document, cid, addr, true);
                    const done = !!(js?.explorerVerified ?? js?.verified);
                    if (done) {
                        try {
                            this.setupDownloads();
                        } catch (_) {}
                        try {
                            clearInterval(this.verifPoll);
                        } catch (_) {}
                        this.verifPoll = null;
                        this._removeVerifyRefreshButton();
                    }
                } catch (_) {}
            };
            this.verifPoll = setInterval(poll, 3000);
            poll();
        } catch (_) {}
    }

    _showVerifyRefreshButton(cid, addr) {
        // Não-admin em testnet não deve ver botão de verificação
        if (this._isTestnet(cid) && !this.resolveIsAdminSync()) return;
        const existing = document.getElementById('btn-verify-refresh');
        if (existing) return;
        const badge = document.getElementById('cs_viewStatus');
        if (!badge) return;
        const btn = document.createElement('button');
        btn.id = 'btn-verify-refresh';
        btn.className = 'btn btn-sm btn-outline-info mt-2';
        btn.innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i>Atualizar verificação`;
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Verificando...`;
            try {
                const js = await updateVerificationBadge(document, cid, addr, true);
                const done = !!(js?.explorerVerified ?? js?.verified);
                if (done) {
                    try {
                        this.setupDownloads();
                    } catch (_) {}
                    this._removeVerifyRefreshButton();
                } else {
                    btn.disabled = false;
                    btn.innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i>Atualizar verificação`;
                }
            } catch (_) {
                btn.disabled = false;
                btn.innerHTML = `<i class="bi bi-arrow-clockwise me-1"></i>Atualizar verificação`;
            }
        });
        badge.insertAdjacentElement('afterend', btn);
    }

    _removeVerifyRefreshButton() {
        document.getElementById('btn-verify-refresh')?.remove();
    }

    init() {
        console.log('ContractDetailsManager initialized');
        this.observeActionsComponent();
        this.bindGlobalFileActions();

        // 1. Check URL Params first (View Mode)
        const urlParams = new URLSearchParams(window.location.search);
        const urlAddress = urlParams.get('address');
        const urlChainId = urlParams.get('chainId');

        if (urlAddress && urlChainId) {
            try {
                const stored = sessionStorage.getItem('lastDeployedContract');
                const st = stored ? JSON.parse(stored) : null;
                const sAddr = String(st?.deployed?.address || st?.deployed?.contractAddress || '').toLowerCase();
                const sCid = String(st?.form?.network?.chainId || st?.wallet?.chainId || '').trim();
                const uAddr = String(urlAddress || '').toLowerCase();
                const uCid = String(urlChainId || '').trim();
                if (st && sAddr && uAddr && sAddr === uAddr && sCid && uCid && sCid === uCid) {
                    this.state = st;
                    if (this.state.deployed && !this.state.deployed.address && this.state.deployed.contractAddress) {
                        this.state.deployed.address = this.state.deployed.contractAddress;
                    }
                    this.initFromState();
                    return;
                }
            } catch (_) {}
            this.initFromUrl(urlAddress, urlChainId);
            return;
        }

        // 2. Load State from SessionStorage (Deploy Mode)
        const stored = sessionStorage.getItem('lastDeployedContract');
        if (stored) {
            try {
                this.state = JSON.parse(stored);
                if (this.state && (this.state.deployed?.address || this.state.deployed?.contractAddress)) {
                    // Normalize address field if needed
                    if (!this.state.deployed.address && this.state.deployed.contractAddress) {
                        this.state.deployed.address = this.state.deployed.contractAddress;
                    }
                    this.initFromState();
                    return;
                } else {
                    console.warn('Estado inválido ou incompleto:', this.state);
                }
            } catch (e) {
                console.error('Erro ao processar dados do contrato:', e);
            }
        }

        // 3. Empty State
        this.showEmptyState();
    }

    async initFromUrl(address, chainId) {
        try {
            console.log('Initializing from URL params:', address, chainId);
            this.writeContractContext(address, chainId, 'contrato-detalhes');

            // Mock minimal state for View Mode
            this.state = {
                deployed: { address: address },
                form: {
                    network: { chainId: chainId },
                    token: {
                        name: 'Carregando...',
                        symbol: '...',
                        decimals: 18,
                    },
                },
                compilation: null, // No source code available in view mode
            };

            // Wait for shared components to load
            await this.waitForActionsComponent();

            // Setup UI for View Mode
            this.setupContractView();
            this.startVerificationPolling(chainId, address);

            this.setupDownloads();
            this.applyShareAccessControl();
            this.attachWalletListeners();

            // Tenta carregar comprovantes de TX do sessionStorage (redirect pós-deploy)
            // Necessário porque initFromUrl não passa pelo initFromState que tem setupTransactions
            try {
                const stored = sessionStorage.getItem('lastDeployedContract');
                if (stored) {
                    const st = JSON.parse(stored);
                    const sAddr = String(st?.deployed?.address || st?.deployed?.contractAddress || '').toLowerCase();
                    if (sAddr && sAddr === String(address || '').toLowerCase()) {
                        if (!this.state) this.state = st;
                        else this.state.deployed = { ...(this.state.deployed || {}), ...st.deployed };
                        this.setupTransactions();
                    }
                }
            } catch (_) {}

            // Hide Status Alert
            const alertBox = document.getElementById('status-alert');
            if (alertBox) alertBox.classList.add('d-none');
        } catch (e) {
            console.error('Erro fatal em initFromUrl:', e);
        }
    }

    async initFromState() {
        try {
            console.log('Initializing from Session State (Fresh Deploy)');
            try {
                const addr = this.state?.deployed?.address || this.state?.deployed?.contractAddress || '';
                const cid = this.state?.form?.network?.chainId || '';
                this.writeContractContext(addr, cid, 'contrato-detalhes');
                this.writeContractContext(addr, cid, 'contrato_criado');
            } catch (_) {}

            // Wait for shared components to load
            await this.waitForActionsComponent();

            // Show Success Alert
            const alertBox = document.getElementById('status-alert');
            if (alertBox) {
                alertBox.className = 'alert alert-success border-success bg-dark-elevated text-success mb-4';
                alertBox.innerHTML = `
                    <h4 class="alert-heading"><i class="bi bi-check-circle-fill me-2"></i>Contrato Criado com Sucesso!</h4>
                    <p class="mb-0">Seu contrato foi implantado na blockchain. Abaixo estão os detalhes e arquivos para download.</p>
                `;
                alertBox.classList.remove('d-none');
            }

            this.setupDownloads();
            this.applyShareAccessControl();
            this.attachWalletListeners();
            this.setupContractView();
            this.setupTransactions();

            try {
                const addr = this.state?.deployed?.address || this.state?.deployed?.contractAddress || '';
                const cid = this.state?.form?.network?.chainId || '';
                if (addr && cid) this.startVerificationPolling(cid, addr);
            } catch (_) {}
        } catch (e) {
            console.error('Erro fatal em initFromState:', e);
            const alertBox = document.getElementById('status-alert');
            if (alertBox) {
                alertBox.className = 'alert alert-danger';
                alertBox.textContent = 'Erro interno ao carregar detalhes: ' + e.message;
                alertBox.classList.remove('d-none');
            }
        }
    }

    waitForActionsComponent() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                const el = document.getElementById('files-section') || document.getElementById('btnDownloadSol');
                if (el) {
                    console.log('Contract Actions component found after attempts:', attempts);
                    resolve();
                } else if (attempts > 200) {
                    // 20 seconds
                    console.warn('Timeout waiting for contract-actions component');
                    resolve(); // Resolve anyway to avoid blocking
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    observeActionsComponent() {
        try {
            if (this._actionsObserver) return;
            const tryBind = () => {
                const el = document.getElementById('files-section') || document.getElementById('btnDownloadSol');
                if (!el) return false;
                try {
                    if (this.state) this.setupDownloads();
                } catch (_) {}
                return true;
            };
            if (tryBind()) return;
            this._actionsObserver = new MutationObserver(() => {
                tryBind();
            });
            this._actionsObserver.observe(document.body, { childList: true, subtree: true });
        } catch (_) {}

        // Re-executa setupTransactions sempre que contract-actions.php for re-renderizado
        // pelo base-system (ocorre múltiplas vezes após eventos de wallet).
        // Usa o evento 'componentLoaded' em vez do MutationObserver para evitar loop
        // infinito (setupTransactions altera textContent → triggeria MutationObserver).
        try {
            window.addEventListener('componentLoaded', (e) => {
                try {
                    if (e?.detail?.component === 'modules/contrato/contract-actions.php') {
                        if (this.state) this.setupTransactions();
                    }
                } catch (_) {}
            });
        } catch (_) {}
    }

    bindGlobalFileActions() {
        // Handlers de copy/download do modal são gerenciados pelo file-viewer.js via showFileModal.
        // Este método permanece apenas para garantir compatibilidade com observeActionsComponent.
        this._globalFileClickBound = true;
    }

    showEmptyState() {
        const alertBox = document.getElementById('status-alert');
        if (alertBox) {
            alertBox.className = 'alert alert-secondary border-secondary bg-dark-elevated text-light mb-4';
            alertBox.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="bi bi-info-circle me-3 fs-4 text-muted"></i>
                    <div>
                        <h5 class="mb-1">Nenhum contrato recém-criado</h5>
                        <p class="mb-0 tc-text-sm text-muted">Nenhum dado de deploy recente encontrado. <a href="index.php?page=contrato" class="alert-link">Criar novo contrato</a>.</p>
                    </div>
                </div>
            `;
            alertBox.classList.remove('d-none');
        }
        document.getElementById('files-section')?.classList.add('d-none');
        // Manter busca visível para não deixar a página totalmente vazia
        document.getElementById('contract-search-container')?.classList.remove('d-none');
    }

    setupContractView() {
        // Wait for component loader (if necessary) or try immediately
        const container = document.getElementById('contract-search-container');
        let attempts = 0;
        const maxAttempts = 50; // 10 seconds timeout

        const tryUpdate = async () => {
            attempts++;
            // Check if inner HTML structure is present (cs_viewAddress is a good indicator)
            const viewAddr = document.getElementById('cs_viewAddress');

            if (viewAddr) {
                this.populateContractDetails();
            } else {
                if (attempts >= maxAttempts) {
                    console.warn('Timeout waiting for contract-search component. Attempting fallback load...');

                    // Fallback: Tentar carregar manualmente se o BaseSystem falhar
                    try {
                        const resp = await fetch('modules/contrato/contract-search.php');
                        if (resp.ok) {
                            const html = await resp.text();
                            const target = container.querySelector('[data-component]') || container;
                            target.innerHTML = html;

                            // Re-check immediately
                            setTimeout(() => {
                                if (document.getElementById('cs_viewAddress')) {
                                    this.populateContractDetails();
                                } else {
                                    this.showErrorState('Falha ao renderizar componente de detalhes.');
                                }
                            }, 100);
                            return;
                        }
                    } catch (e) {
                        console.error('Fallback load failed:', e);
                    }

                    this.showErrorState('Componente de detalhes demorou a carregar. Tente recarregar a página.');
                    return;
                }
                // Retry
                setTimeout(tryUpdate, 200);
            }
        };

        tryUpdate();
    }

    showErrorState(msg) {
        const alertBox = document.getElementById('status-alert');
        if (alertBox && !alertBox.classList.contains('alert-success')) {
            alertBox.className = 'alert alert-warning';
            alertBox.textContent = `Aviso: ${msg}`;
            alertBox.classList.remove('d-none');
        }
    }

    async populateContractDetails() {
        const { deployed, form } = this.state;
        const chainId = form.network?.chainId || 1;
        const address = deployed?.address;

        if (!address) return;

        // Oculta o formulário de busca e mostra o cabeçalho de detalhes
        const searchRoot = document.querySelector('#contract-search-container #contract-search-root');
        if (searchRoot) searchRoot.classList.add('d-none');
        const detailsHeader = document.querySelector('#contract-search-container #cs-details-header');
        if (detailsHeader) detailsHeader.classList.remove('d-none');

        // Trigger robust update from contract-search.js
        try {
            const container = document.getElementById('contract-search-container');
            // Ensure component is initialized (listeners, etc)
            const componentEl = container.querySelector('[data-component]') || container;
            if (componentEl) initContainer(componentEl);

            // Only use preloaded data if we have real values (not placeholders from initFromUrl)
            let preloaded = null;
            if (form.token && form.token.name !== 'Carregando...') {
                preloaded = {
                    tokenName: form.token.name,
                    tokenSymbol: form.token.symbol,
                    tokenDecimals: form.token.decimals,
                    tokenSupply: form.token.initialSupply,
                    txHash: deployed?.transactionHash || deployed?.txHash || '',
                };
            } else {
                preloaded = {
                    txHash: deployed?.transactionHash || deployed?.txHash || '',
                };
            }

            await updateContractDetailsView(componentEl, chainId, address, preloaded, { autoShowCard: true });
        } catch (e) {
            console.error('Erro ao atualizar view detalhada:', e);
        }
    }

    setupDownloads() {
        this.resolveCompilationForDownloads();
        const { compilation, form } = this.state;

        const container = document.getElementById('files-section');
        if (!container) return;

        const lockButtons = (message) => {
            const ids = ['btnDownloadSol', 'btnDownloadJson', 'btnDownloadAbi', 'btnDownloadDeployedBytecode'];
            ids.forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.disabled = true;
                el.classList.add('disabled');
                el.setAttribute('aria-disabled', 'true');
                el.onclick = (e) => {
                    try {
                        e?.preventDefault?.();
                    } catch (_) {}
                    if (typeof window.showFormError === 'function') window.showFormError(message);
                    else alert(message);
                };
            });
        };

        container.classList.remove('d-none');

        const currentAddr = String(this.state?.deployed?.address || this.state?.deployed?.contractAddress || '').trim();
        const currentCid = String(form?.network?.chainId || this.state?.wallet?.chainId || '').trim();

        const hasAnyFile =
            !!compilation?.sourceCode || !!compilation?.input || !!compilation?.abi || !!compilation?.bytecode;

        if (!hasAnyFile) {
            try {
                if (!this._fetchingExplorerFiles && currentAddr && currentCid) {
                    this._fetchingExplorerFiles = true;
                    lockButtons('Carregando arquivos do explorer...');

                    let warn = document.getElementById('tcFilesUnavailable');
                    if (!warn) {
                        warn = document.createElement('div');
                        warn.id = 'tcFilesUnavailable';
                        warn.className = 'mt-2 tc-text-sm text-muted';
                        container.appendChild(warn);
                    }
                    warn.textContent = 'Carregando código-fonte/ABI do explorer...';

                    // forceRefresh=false: aproveita cache que o polling de verificação já preencheu
                    getVerificationStatus(currentCid, currentAddr, false)
                        .then((js) => {
                            if (js?.verified && (js?.sourceCode || js?.abi)) {
                                const next = { ...(this.state.compilation || {}) };
                                if (js?.contractName && !next.contractName) next.contractName = js.contractName;
                                if (js?.sourceCode && !next.sourceCode) next.sourceCode = js.sourceCode;
                                if (js?.abi && !next.abi) {
                                    try {
                                        next.abi = typeof js.abi === 'string' ? JSON.parse(js.abi) : js.abi;
                                    } catch (_) {}
                                }
                                this.state.compilation = next;
                            }
                        })
                        .catch(() => {})
                        .finally(() => {
                            this._fetchingExplorerFiles = false;
                            try {
                                this.setupDownloads();
                            } catch (_) {}
                        });
                    return;
                }
            } catch (_) {}

            lockButtons('Arquivos disponíveis apenas quando o contrato é criado pelo TokenCafe (sessão de deploy).');

            let warn = document.getElementById('tcFilesUnavailable');
            if (!warn) {
                warn = document.createElement('div');
                warn.id = 'tcFilesUnavailable';
                warn.className = 'mt-2 tc-text-sm text-muted';
                container.appendChild(warn);
            }
            warn.textContent =
                'Arquivos disponíveis apenas quando o contrato é criado pelo TokenCafe (sessão de deploy).';
            return;
        } else {
            const warn = document.getElementById('tcFilesUnavailable');
            if (warn) warn.remove();
        }

        const contractName = compilation?.contractName || 'Contract';

        // .sol
        const btnSol = document.getElementById('btnDownloadSol');
        if (btnSol && compilation?.sourceCode) {
            btnSol.onclick = () => {
                showFileModal(`${contractName}.sol`, compilation.sourceCode);
            };
            btnSol.disabled = false;
            btnSol.classList.remove('disabled');
            btnSol.removeAttribute('aria-disabled');
        } else if (btnSol) {
            btnSol.disabled = true;
        }

        // .json (Standard JSON Input)
        const btnJson = document.getElementById('btnDownloadJson');
        if (btnJson && compilation?.input) {
            btnJson.onclick = () => {
                try {
                    // Formatar o JSON para ficar legível
                    const content = JSON.stringify(JSON.parse(compilation.input), null, 2);
                    showFileModal(`${contractName}_StandardInput.json`, content, 'application/json');
                } catch (e) {
                    showFileModal(`${contractName}_Input.json`, compilation.input, 'application/json');
                }
            };
            btnJson.disabled = false;
            btnJson.classList.remove('disabled');
            btnJson.removeAttribute('aria-disabled');
        } else if (btnJson) {
            btnJson.disabled = true;
        }

        // ABI
        const btnAbi = document.getElementById('btnDownloadAbi');
        if (btnAbi && compilation?.abi) {
            btnAbi.onclick = () => {
                const content = JSON.stringify(compilation.abi, null, 2);
                showFileModal(`${contractName}_ABI.json`, content, 'application/json');
            };
            btnAbi.disabled = false;
            btnAbi.classList.remove('disabled');
            btnAbi.removeAttribute('aria-disabled');
        } else if (btnAbi) {
            btnAbi.disabled = true;
        }

        // Bytecode
        const btnByte = document.getElementById('btnDownloadDeployedBytecode');
        if (btnByte && compilation?.bytecode) {
            btnByte.onclick = () => {
                showFileModal(`${contractName}_Bytecode.txt`, compilation.bytecode);
            };
            btnByte.disabled = false;
            btnByte.classList.remove('disabled');
            btnByte.removeAttribute('aria-disabled');
        } else if (btnByte) {
            btnByte.disabled = true;
        }
    }

    setupTransactions() {
        const section = document.getElementById('transactions-section');
        if (!section) return;

        const deployed = this.state?.deployed || {};
        const chainId = this.state?.form?.network?.chainId;
        const sym = deployed.feeSymbol || '';

        const fmt = (val) =>
            val != null && Number.isFinite(Number(val)) ? `${Number(val).toFixed(6)} ${sym}`.trim() : null;

        const shortAddr = (addr) => (addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : null);

        const fill = (id, val) => {
            if (!val) return;
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        const wireAddress = (id, addr) => {
            if (!addr) return;
            const el = document.getElementById(id);
            if (!el) return;
            const short = shortAddr(addr) || addr;
            el.textContent = short;
            try {
                const href = getExplorerContractUrl(addr, chainId);
                el.href = href || '#';
                el.target = '_blank';
                el.rel = 'noopener';
            } catch (_) {
                el.href = '#';
            }
        };

        const wireTx = (rowId, hashId, hash, explorerUrl) => {
            const row = document.getElementById(rowId);
            if (!row || !hash) return;
            const el = document.getElementById(hashId);
            if (el) {
                el.textContent = `${hash.slice(0, 10)}…${hash.slice(-8)}`;
                try {
                    el.href = explorerUrl || '#';
                    el.target = '_blank';
                    el.rel = 'noopener';
                } catch (_) {
                    el.href = '#';
                }
            }
            row.classList.remove('d-none');
        };

        // ── Taxa de Serviço (laranja) ──
        wireTx(
            'tx-platform-row',
            'tx-platform-hash',
            deployed.txPlatform,
            deployed.txPlatform ? getExplorerTxUrl(deployed.txPlatform, chainId) : null,
        );
        fill('tx-platform-amount', fmt(deployed.feePlatformAmount));
        wireAddress('tx-platform-from', deployed.billingAddress);
        wireAddress('tx-platform-to', deployed.platformWallet);

        // ── Bônus ao Indicador (roxo) ──
        wireTx(
            'tx-referrer-row',
            'tx-referrer-hash',
            deployed.txReferrer,
            deployed.txReferrer ? getExplorerTxUrl(deployed.txReferrer, chainId) : null,
        );
        fill('tx-referrer-amount', fmt(deployed.feeReferrerAmount));
        wireAddress('tx-referrer-from', deployed.billingAddress);
        wireAddress('tx-referrer-to', deployed.referrerAddress);

        // ── Deploy do Contrato (azul) ──
        wireTx(
            'tx-deploy-row',
            'tx-deploy-hash',
            deployed.transactionHash,
            deployed.transactionHash ? getExplorerTxUrl(deployed.transactionHash, chainId) : null,
        );
        fill(
            'tx-deploy-amount',
            deployed.gasEstimateCrypto ? `~${Number(deployed.gasEstimateCrypto).toFixed(6)} ${sym}` : null,
        );
        wireAddress('tx-deploy-from', deployed.billingAddress);
        wireAddress('tx-deploy-to', deployed.address);

        if (deployed.transactionHash || deployed.txPlatform) {
            section.classList.remove('d-none');
        }
    }
}

new ContractDetailsManager();
