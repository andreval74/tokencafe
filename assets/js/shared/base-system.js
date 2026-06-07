/**
 * ================================================================================
 * TOKENCAFE - BASE SYSTEM UNIFIED
 * ================================================================================
 * Sistema base unificado para inicialização de módulos TokenCafe
 * Substitui todos os scripts inline repetitivos
 * ================================================================================
 */

import { SharedUtilities } from './shared_utilities_es6.js';
import { walletConnector } from '../shared/wallet-connector.js';
import { networkManager } from '../shared/network-manager.js';
import { SystemResponse } from '../shared/system-response.js';
import { showDiagnosis } from '../ai/diagnostics.js';

const tokencafeIsDebugEnabled = () => {
    try {
        const host = String(location.hostname || '');
        const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
        const url = new URL(location.href);
        const q = url.searchParams.get('debug');
        if (q === '1' || q === 'true') return true;
        const ls = localStorage.getItem('tokencafe_debug');
        if (ls === 'true') return true;
        return isLocal;
    } catch (_) {
        return false;
    }
};

class BaseSystem {
    constructor() {
        this.initialized = false;
        this.toastContainer = null;
        this.debug = tokencafeIsDebugEnabled();
        this._t0 = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
        try {
            window.__tokencafe_debug = this.debug;
        } catch (_) {}
    }

    dlog(step, data) {
        if (!this.debug) return;
        try {
            const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
            const dt = Math.round(now - this._t0);
            if (typeof data === 'undefined') console.log(`[TC][BaseSystem][+${dt}ms] ${step}`);
            else console.log(`[TC][BaseSystem][+${dt}ms] ${step}`, data);
        } catch (_) {}
    }

    /**
     * Inicializar sistema base
     */
    async init() {
        try {
            if (this.initialized || window.__BaseSystemInitialized) return;
            if (window.__BaseSystemInitPromise) {
                await window.__BaseSystemInitPromise;
                return;
            }
        } catch (_) {}

        const initPromise = (async () => {
            this.dlog('init:start');
            if (this.debug) {
                try {
                    walletConnector?.setDebug?.(true);
                } catch (_) {}
                try {
                    networkManager?.setDebug?.(true);
                } catch (_) {}
            }

            // Verificar versão antes de qualquer coisa
            this.dlog('checkAppVersion:start');
            await this.checkAppVersion();
            this.dlog('checkAppVersion:done');

            window.__BaseSystemInitialized = true;

            console.log('🚀 TokenCafe - Base System Unified iniciando...');

            // Aguardar DOM estar pronto
            if (document.readyState === 'loading') {
                await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve));
            }

            // Disponibilizar módulos globalmente
            this.dlog('setupGlobalModules:start');
            this.setupGlobalModules();
            this.dlog('setupGlobalModules:done');

            // Configurar utilitários globais
            this.dlog('setupGlobalUtilities:start');
            this.setupGlobalUtilities();
            this.dlog('setupGlobalUtilities:done');

            // Configurar sistema de toast
            this.dlog('setupToastSystem:start');
            this.setupToastSystem();
            this.dlog('setupToastSystem:done');

            // Carregar componentes automaticamente
            this.dlog('loadComponents:start');
            await this.loadComponents();
            this.dlog('loadComponents:done');

            await this.bindAdminDependentComponents();

            // Safety Timeout: Garantir que o loading desapareça mesmo se houver falhas
            setTimeout(() => {
                if (window.hideLoading) window.hideLoading();
            }, 5000);

            // Mobile Handling: páginas 'full' passam direto; outras precisam de window.ethereum
            if (this.isMobile()) {
                if (window.hideLoading) window.hideLoading();
                const backdrops = document.querySelectorAll('.modal-backdrop');
                backdrops.forEach((el) => el.remove());

                const canProceed = await this.handleMobileAccess();
                if (!canProceed) return;

                // Após liberar acesso, exibir banner informativo conforme suporte da página
                this.applyMobilePageBanner();
            }

            await this.enforceAuthGuard();

            await this.bindWalletInfoSection();

            this.initialized = true;

            // Garantir que qualquer loader seja removido
            if (window.hideLoading) window.hideLoading();

            console.log('✅ Base System Unified inicializado');
            this.dlog('init:done');
        })();

        try {
            window.__BaseSystemInitPromise = initPromise;
            await initPromise;
        } finally {
            try {
                delete window.__BaseSystemInitPromise;
            } catch (_) {
                window.__BaseSystemInitPromise = null;
            }
        }
    }

    /**
     * Verificar versão do app e limpar cache se necessário
     */
    async checkAppVersion() {
        try {
            // Evitar loop infinito de reload
            if (sessionStorage.getItem('tokencafe_reloaded_for_version')) {
                sessionStorage.removeItem('tokencafe_reloaded_for_version');
                console.log('✅ Versão atualizada com sucesso.');
                return;
            }

            const versionUrl = `shared/version.json?t=${Date.now()}`;

            const response = await fetch(versionUrl);
            if (!response.ok) return;

            const remoteData = await response.json();
            const remoteVersion = remoteData.version;

            if (!remoteVersion) return;

            const localVersion = localStorage.getItem('tokencafe_app_version');

            if (localVersion && localVersion !== remoteVersion) {
                console.log(`🔄 Nova versão detectada: ${remoteVersion} (Local: ${localVersion}). Atualizando...`);

                // Limpa todos os caches — após atualização o usuário precisa reconectar a carteira
                localStorage.clear();
                sessionStorage.clear();

                localStorage.setItem('tokencafe_app_version', remoteVersion);
                sessionStorage.setItem('tokencafe_reloaded_for_version', 'true');

                window.location.reload(true);
                // Retornar promessa pendente para pausar execução
                return new Promise(() => {});
            } else if (!localVersion) {
                // Primeira vez ou sem versão salva
                localStorage.setItem('tokencafe_app_version', remoteVersion);
            }
        } catch (e) {
            console.warn('⚠️ Falha ao verificar versão:', e);
        }
    }

    /**
     * Disponibilizar módulos unificados globalmente
     */
    setupGlobalModules() {
        window.SharedUtilities = SharedUtilities;
        window.walletConnector = walletConnector;
        window.networkManager = networkManager;
        window.SystemResponse = SystemResponse;
        window.showDiagnosis = showDiagnosis;

        console.log('📦 Módulos unificados disponibilizados globalmente');
    }

    /**
     * Configurar utilitários globais
     */
    setupGlobalUtilities() {
        // Shorthand para querySelector
        window.$ = (selector) => document.querySelector(selector);
        window.$$ = (selector) => document.querySelectorAll(selector);

        // Função para mostrar loading
        window.showLoading = (show = true) => {
            const loader = document.getElementById('loading-screen');
            if (loader) {
                loader.style.display = show ? 'flex' : 'none';
            }
        };

        // Compatibilidade: esconder loading (alias para showLoading(false))
        window.hideLoading = () => {
            try {
                // Suporte a overlay usado em alguns layouts
                const overlay = window.$ ? $('#loading-overlay') : document.getElementById('loading-overlay');
                if (overlay && overlay.remove) overlay.remove();

                // Mobile Safe: Remove backdrops órfãos que possam estar travando a tela
                // Apenas se não houver modal aberto
                const openModal = document.querySelector('.modal.show');
                if (!openModal) {
                    const backdrops = document.querySelectorAll('.modal-backdrop');
                    backdrops.forEach((el) => el.remove());
                    document.body.classList.remove('modal-open');
                    document.body.style.overflow = '';
                }
            } catch (e) {
                console.warn('Erro no hideLoading:', e);
            }
            window.showLoading(false);
        };

        // Compatibilidade: formatar endereço de carteira
        const utilsInstance = new SharedUtilities();
        window.formatAddress = (address, startChars = 6, endChars = 4) => {
            try {
                return utilsInstance.formatAddress(address, startChars, endChars);
            } catch {
                if (!address) return '';
                if (String(address).length <= startChars + endChars) return address;
                return `${String(address).slice(0, startChars)}...${String(address).slice(-endChars)}`;
            }
        };

        // Global System Reset Function
        window.resetSystem = () => {
            if (confirm('Isso limpará todos os caches locais e recarregará o sistema. Continuar?')) {
                console.log('🧹 Resetando sistema...');
                const version = localStorage.getItem('tokencafe_app_version');
                localStorage.clear();
                sessionStorage.clear();
                // Preservar versão para evitar loop de update desnecessário
                if (version) localStorage.setItem('tokencafe_app_version', version);
                window.location.reload(true);
            }
        };

        // Global copyToClipboard
        window.copyToClipboard = async (text) => {
            if (!text) return;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                    if (window.showFormSuccess) window.showFormSuccess('Copiado para a área de transferência!');
                    else if (window.notify) window.notify('Copiado!', 'success');
                } else {
                    // Fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = text;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-9999px';
                    document.body.appendChild(textArea);
                    textArea.focus();
                    textArea.select();
                    try {
                        document.execCommand('copy');
                        if (window.showFormSuccess) window.showFormSuccess('Copiado para a área de transferência!');
                        else if (window.notify) window.notify('Copiado!', 'success');
                    } catch (err) {
                        console.error('Fallback: Oops, unable to copy', err);
                        if (window.showFormError) window.showFormError('Falha ao copiar');
                        else if (window.notify) window.notify('Falha ao copiar', 'error');
                    }
                    document.body.removeChild(textArea);
                }
            } catch (err) {
                console.error('Failed to copy: ', err);
                if (window.showFormError) window.showFormError('Falha ao copiar');
                else if (window.notify) window.notify('Falha ao copiar', 'error');
            }
        };

        window.closeModalById = (id) => {
            try {
                const el = document.getElementById(id);
                if (!el) return;
                el.style.display = 'none';
            } catch (_) {}
        };

        // Helper: delega binding de status da carteira ao módulo wallet
        window.bindWalletStatusUI = (config = {}) => {
            try {
                if (window.walletConnector && typeof window.walletConnector.bindStatusUI === 'function') {
                    window.walletConnector.bindStatusUI(config);
                }
            } catch (_) {}
        };

        // Função para scroll to top
        window.scrollToTop = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        console.log('🛠️ Utilitários globais configurados');

        // Conexão exigida + redirecionamento:
        // - Funciona para elementos com data-action="connect-wallet"
        // - E também para links diretos para /modules/* (para evitar ter que marcar cada link manualmente)
        const isModifiedClick = (ev) => !!(ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.altKey || ev.button !== 0);
        const getHrefFromEl = (el) => {
            try {
                const raw = el?.getAttribute?.('data-redirect') || el?.getAttribute?.('data-target') || '';
                if (raw) return raw;
                const a = el?.tagName === 'A' ? el : el?.closest?.('a');
                const href = a && a.getAttribute ? a.getAttribute('href') : '';
                return href && href !== '#' ? href : '';
            } catch (_) {
                return '';
            }
        };
        const resolveUrl = (href) => {
            try {
                return new URL(href, window.location.href);
            } catch (_) {
                return null;
            }
        };
        const requiresWalletForHref = (href) => {
            const url = resolveUrl(href);
            if (!url) return false;
            if (url.origin !== window.location.origin) return false;
            const path = String(url.pathname || '');
            if (path.includes('/modules/contrato/contrato-index.php')) return false;
            if (path.endsWith('/index.php') && url.searchParams.get('page') === 'tools') return true;
            if (path.includes('/modules/')) return true;
            return false;
        };
        const persistPostConnectRedirect = (href) => {
            try {
                sessionStorage.setItem(
                    'tokencafe_post_connect_redirect',
                    JSON.stringify({ href: String(href), ts: Date.now() }),
                );
            } catch (_) {}
        };
        const consumePostConnectRedirect = () => {
            try {
                const raw = sessionStorage.getItem('tokencafe_post_connect_redirect');
                if (!raw) return '';
                sessionStorage.removeItem('tokencafe_post_connect_redirect');
                const parsed = JSON.parse(raw);
                const href = parsed && typeof parsed.href === 'string' ? parsed.href : '';
                const ts = parsed && typeof parsed.ts === 'number' ? parsed.ts : 0;
                if (!href) return '';
                if (ts && Date.now() - ts > 2 * 60 * 1000) return '';
                return href;
            } catch (_) {
                return '';
            }
        };
        // Detectar qual carteira está disponível no browser atual
        const detectAvailableWalletType = () => {
            const eth = window.ethereum;
            if (!eth) return null;
            if (eth.isMetaMask) return 'metamask';
            if (eth.isTrust || eth.isTrustWallet) return 'trust';
            if (eth.isCoinbaseWallet) return 'coinbase';
            if (typeof eth.request === 'function') return 'ethereum';
            return null;
        };

        const ensureWalletAndNavigate = async (href) => {
            const targetHref = href || 'index.php?page=tools';
            persistPostConnectRedirect(targetHref);
            try {
                const status = window.walletConnector?.getStatus?.() || {};
                if (status.isConnected && status.account) {
                    window.location.href = targetHref;
                    return;
                }
                const walletType = detectAvailableWalletType();
                if (walletType) {
                    try {
                        await window.walletConnector?.connectSilent?.(walletType);
                    } catch (_) {}
                    const after = window.walletConnector?.getStatus?.() || {};
                    if (after.isConnected && after.account) {
                        window.location.href = targetHref;
                        return;
                    }
                }
                // Navegar sempre — a página destino tem seu próprio auth guard
                window.location.href = targetHref;
            } catch (_) {
                window.location.href = targetHref;
            }
        };

        document.addEventListener('click', async (e) => {
            const scrollBtn = e.target.closest('[data-action="scroll-to-top"]');
            if (scrollBtn) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }

            const reloadBtn = e.target.closest('[data-action="reload-page"]') || e.target.closest('#btn-clear');
            if (reloadBtn) {
                e.preventDefault();
                try {
                    const inputs = document.querySelectorAll('input, textarea');
                    inputs.forEach((el) => (el.value = ''));
                } catch (_) {}
                window.location.reload();
                return;
            }

            if (isModifiedClick(e)) return;

            const connectActionEl = e.target.closest('[data-action="connect-wallet"]');
            if (connectActionEl) {
                e.preventDefault();
                const dest = getHrefFromEl(connectActionEl) || 'index.php?page=tools';
                persistPostConnectRedirect(dest);
                const cst = window.walletConnector?.getStatus?.() || {};
                if (cst.isConnected && cst.account) {
                    window.location.href = dest;
                    return;
                }
                if (window.authModal?.show) {
                    window.authModal.show();
                } else {
                    document.dispatchEvent(new CustomEvent('tc:open-auth-modal'));
                }
                return;
            }

            // data-tc-connect: botões da landing page — abre auth modal diretamente
            const tcConnectEl = e.target.closest('[data-tc-connect]');
            if (tcConnectEl) {
                e.preventDefault();
                const dest = getHrefFromEl(tcConnectEl) || 'index.php?page=tools';
                persistPostConnectRedirect(dest);
                const cst = window.walletConnector?.getStatus?.() || {};
                if (cst.isConnected && cst.account) {
                    window.location.href = dest;
                    return;
                }
                if (window.authModal?.show) {
                    window.authModal.show();
                } else {
                    document.dispatchEvent(new CustomEvent('tc:open-auth-modal'));
                }
                return;
            }

            const a = e.target.closest('a');
            const href = a && a.getAttribute ? a.getAttribute('href') : '';
            if (href && href !== '#' && requiresWalletForHref(href)) {
                e.preventDefault();
                await ensureWalletAndNavigate(href);
            }
        });

        document.addEventListener('wallet:connected', () => {
            const redirect = consumePostConnectRedirect();
            if (redirect) window.location.href = redirect;
        });

        try {
            const key = 'tokencafe_last_wallet_account';
            const lockKey = 'tokencafe_wallet_reload_lock';
            const getLower = (v) => {
                try {
                    return String(v || '').toLowerCase();
                } catch (_) {
                    return '';
                }
            };
            const canReloadNow = () => {
                try {
                    const raw = sessionStorage.getItem(lockKey);
                    const ts = raw ? Number(raw) : 0;
                    if (!ts) return true;
                    return Date.now() - ts > 2500;
                } catch (_) {
                    return true;
                }
            };
            const markReloadNow = () => {
                try {
                    sessionStorage.setItem(lockKey, String(Date.now()));
                } catch (_) {}
            };

            document.addEventListener('wallet:connected', (ev) => {
                try {
                    const n = getLower(ev?.detail?.account);
                    if (n) sessionStorage.setItem(key, n);
                } catch (_) {}
            });
            document.addEventListener('wallet:accountChanged', (ev) => {
                try {
                    const n = getLower(ev?.detail?.account);
                    const prev = getLower(sessionStorage.getItem(key));
                    if (n && prev && prev !== n && canReloadNow()) {
                        sessionStorage.setItem(key, n);
                        markReloadNow();
                        window.location.reload();
                        return;
                    }
                    if (n && !prev) sessionStorage.setItem(key, n);
                } catch (_) {}
            });
            document.addEventListener('wallet:disconnected', () => {
                try {
                    const prev = getLower(sessionStorage.getItem(key));
                    if (prev) sessionStorage.removeItem(key);
                    if (prev && canReloadNow()) {
                        markReloadNow();
                        window.location.reload();
                    }
                } catch (_) {}
            });
        } catch (_) {}

        // Sanitização global de campos: exposta como função reutilizável
        // Evita duplicação e garante padrão em todo o ecossistema
        window.bindInputSanitizer = (unusedOptions = {}) => {
            if (unusedOptions && typeof unusedOptions === 'object') {
                void unusedOptions;
            }
            // Guard para evitar múltiplos binds
            if (window.__inputSanitizerBound) return;
            window.__inputSanitizerBound = true;

            // Regras de sanitização
            const shouldSanitize = (el) => {
                if (!el || el.disabled) return false;
                const tag = (el.tagName || '').toLowerCase();
                if (tag !== 'input' && tag !== 'textarea') return false;
                if (el.dataset && String(el.dataset.trim).toLowerCase() === 'off') return false;
                return true;
            };
            const trimFull = (v) => (typeof v === 'string' ? v.replace(/\s+$/u, '') : v);
            const collapseSpaces = (v) => (typeof v === 'string' ? v.replace(/\s{2,}/g, ' ') : v);
            const getMode = (el) => {
                const d = String(el?.dataset?.trim || '').toLowerCase();
                if (d === 'off') return 'off';
                if (d === 'collapse') return 'collapse';
                return 'default';
            };

            // Removido: não sanitizar enquanto digita

            // Ao sair do campo: trim completo
            ['change', 'blur'].forEach((ev) => {
                document.addEventListener(
                    ev,
                    (e) => {
                        const el = e.target;
                        if (!shouldSanitize(el)) return;
                        const mode = getMode(el);
                        const before = el.value;
                        let after = trimFull(before);
                        if (mode === 'collapse') after = collapseSpaces(after);
                        if (after !== before) el.value = after;
                    },
                    true,
                );
            });
        };

        // Aplicar por padrão em todas as páginas que carregam o Base System
        window.bindInputSanitizer();

        // Padronização: delega mensagens de sucesso/erro para a IA (modal global)
        window.showFormSuccess = (message, _opts = {}) => {
            try {
                return showDiagnosis('SUCCESS', {
                    title: 'Sucesso',
                    subtitle: String(message || 'Sucesso'),
                    content: _opts.content || '',
                    htmlContent: _opts.htmlContent || '',
                    onClear: _opts.onClear,
                });
            } catch (_) {
                return null;
            }
        };

        // Padronização: delega mensagens de erro para a IA (modal global)
        window.showFormError = (message, _opts = {}) => {
            try {
                return showDiagnosis('ERROR', {
                    title: 'Erro',
                    subtitle: String(message || 'Erro'),
                    badge: _opts.badge || '',
                    content: _opts.content || '',
                    htmlContent: _opts.htmlContent || '',
                    onClear: _opts.onClear,
                });
            } catch (_) {
                return null;
            }
        };

        // Padronização: modal de resultado de verificação
        window.showVerificationResultModal = (success, title, contentHtml, linkUrl) => {
            try {
                let finalContent = contentHtml || '';
                if (linkUrl) {
                    finalContent += `
               <div class="mt-3 text-center">
                   <a href="${linkUrl}" target="_blank" rel="noopener" class="btn btn-outline-success">
                       <i class="bi bi-box-arrow-up-right me-2"></i>Abrir no Explorer
                   </a>
               </div>
               `;
                }

                const ok = showDiagnosis(success ? 'SUCCESS' : 'ERROR', {
                    title: title || (success ? 'Sucesso' : 'Erro'),
                    subtitle: '',
                    htmlContent: finalContent,
                });
                if (ok) return;

                const modalEl = document.getElementById('verifyInfoModal');
                if (!modalEl) {
                    // Se não houver modal, tenta usar notify
                    if (success) window.showFormSuccess(title || 'Verificado com sucesso!');
                    else window.showFormError(title || 'Falha na verificação');
                    return;
                }

                const titleEl = document.getElementById('verifyInfoTitle');
                const contentEl = document.getElementById('verifyInfoContent');
                const linkEl = document.getElementById('verifyOpenLink');

                if (titleEl) {
                    titleEl.textContent = title;
                    titleEl.className = success ? 'modal-title text-success' : 'modal-title text-danger';
                }

                if (contentEl) {
                    contentEl.innerHTML = contentHtml;
                }

                if (linkEl) {
                    if (linkUrl) {
                        linkEl.href = linkUrl;
                        linkEl.classList.remove('d-none');
                        linkEl.textContent = 'Abrir no Explorer';
                    } else {
                        linkEl.classList.add('d-none');
                    }
                }

                if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    const modal = new bootstrap.Modal(modalEl);
                    modal.show();
                } else {
                    modalEl.style.display = 'block';
                    modalEl.classList.add('show');
                    // Simple close handler for fallback
                    const closeBtns = modalEl.querySelectorAll('[data-bs-dismiss="modal"]');
                    closeBtns.forEach((btn) => {
                        btn.onclick = () => {
                            modalEl.style.display = 'none';
                            modalEl.classList.remove('show');
                        };
                    });
                }
            } catch (e) {
                console.error('Error showing verification modal:', e);
            }
        };

        document.addEventListener('form:success', (e) => {
            try {
                const d = e?.detail || {};
                window.showFormSuccess(String(d.message || 'Sucesso'), { container: d.container, onClear: d.onClear });
            } catch (_) {}
        });

        document.addEventListener('form:error', (e) => {
            try {
                const d = e?.detail || {};
                window.showFormError(String(d.message || 'Erro'), { container: d.container, onClear: d.onClear });
            } catch (_) {}
        });
    }

    /**
     * Configurar sistema de toast
     */

    setupToastSystem() {
        window.showToast = () => {};
        console.log('🍞 Toasts desativados');
    }

    async enforceAuthGuard() {
        try {
            const path = String(window.location.pathname || '');
            const url = new URL(window.location.href);

            const publicPages = new Set([
                '',
                'home',
                'home-basica',
                'tools',
                'suporte',
                'social',
                'privacidade',
                'termos-e-servicos',
                'indicar',
                'indicacao',
            ]);
            const page = String(url.searchParams.get('page') || '').toLowerCase();

            // Whitelist de páginas que não requerem autenticação imediata
            if (path.includes('/modules/contrato/contrato-index.php')) return;

            const requiresAuth = path.includes('/modules/') || (path.endsWith('/index.php') && !publicPages.has(page));
            if (!requiresAuth) return;

            const status = window.walletConnector?.getStatus?.() || {};
            const ok = !!status.account && status.sessionAuthorized === true;

            if (ok) {
                await this.applyConnectedNetworkDefault();
            } else {
                try {
                    sessionStorage.setItem(
                        'tokencafe_post_connect_redirect',
                        JSON.stringify({ href: window.location.href, ts: Date.now() }),
                    );
                } catch (_) {}
                window.location.replace('index.php');
                return;
            }

            document.addEventListener('wallet:disconnected', () => {
                try {
                    sessionStorage.setItem(
                        'tokencafe_post_connect_redirect',
                        JSON.stringify({ href: window.location.href, ts: Date.now() }),
                    );
                } catch (_) {}
                try {
                    window.location.replace('index.php');
                } catch (_) {}
            });
        } catch (_) {}
    }

    async applyConnectedNetworkDefault() {
        try {
            let chainId = null;
            let account = null;
            const st = window.walletConnector?.getStatus?.() || {};
            account = st.account || null;
            chainId = st.chainId || null;
            if (!chainId && window.ethereum && typeof window.ethereum.request === 'function') {
                try {
                    const hex = await window.ethereum.request({ method: 'eth_chainId' }).catch(() => null);
                    chainId = hex ? parseInt(hex, 16) : null;
                } catch (_) {}
            }
            // Não preencher automaticamente campos de busca de rede nem bloquear readOnly
            // Mantém apenas status visual de conexão geral
            const statusBox = document.getElementById('connectionStatus');
            const statusMsg = document.getElementById('statusMessage');
            if (statusBox && statusMsg && account) {
                statusBox.className = 'alert alert-success d-block mb-3';
                statusMsg.textContent = `Conectado: ${window.formatAddress?.(account)}`;
            }
        } catch (_) {}
    }

    async applyNetworkSelectionMode() {
        try {
            const ns = document.getElementById('networkSearch');
            if (ns) {
                ns.readOnly = false;
                try {
                    delete ns.dataset.chainId;
                } catch (_) {}
                const ac = document.getElementById('networkAutocomplete');
                if (ac) ac.classList.remove('d-none');
                if (!ns.placeholder) ns.placeholder = 'Buscar por nome, chainId ou símbolo';
            }
            const nd = document.getElementById('network-display');
            if (nd) {
                nd.readOnly = false;
            }
            const statusBox = document.getElementById('connectionStatus');
            const statusMsg = document.getElementById('statusMessage');
            if (statusBox && statusMsg) {
                statusBox.className = 'alert alert-warning d-block mb-3';
                statusMsg.textContent = 'Carteira não conectada. Selecione uma rede.';
            }
        } catch (_) {}
    }

    async bindWalletInfoSection() {
        try {
            const addressEl = document.getElementById('walletAddress');
            const chainIdEl = document.getElementById('chainId');
            const nameEl = document.getElementById('networkName');
            const nativeNameEl = document.getElementById('nativeCurrency');
            const symbolEl = document.getElementById('currencySymbol');
            const balanceEl = document.getElementById('balance');
            const rpcEl = document.getElementById('rpcUrl');
            const expEl = document.getElementById('explorerUrl');
            const section = document.getElementById('wallet-info-section');
            const statusBox = document.getElementById('connectionStatus');
            const statusMsg = document.getElementById('statusMessage');

            if (!addressEl && !chainIdEl && !nameEl && !nativeNameEl && !symbolEl && !balanceEl && !rpcEl && !expEl)
                return;

            const refresh = async () => {
                try {
                    const status = window.walletConnector?.getStatus?.() || {};
                    let account = status.account;
                    let chainId = null;
                    if (window.ethereum && typeof window.ethereum.request === 'function') {
                        try {
                            const accounts = await window.ethereum.request({ method: 'eth_accounts' }).catch(() => []);
                            account = Array.isArray(accounts) && accounts.length ? accounts[0] : account || null;
                        } catch (_) {}
                        try {
                            const hex = await window.ethereum.request({ method: 'eth_chainId' }).catch(() => null);
                            chainId = hex ? parseInt(hex, 16) : null;
                        } catch (_) {}
                    } else {
                        chainId = status.chainId != null ? status.chainId : null;
                    }
                    if (!window.ethereum) {
                        if (statusBox && statusMsg) {
                            statusBox.className = 'alert alert-warning d-block mb-3';
                            statusMsg.textContent = 'Carteira não detectada. Instale MetaMask.';
                        }
                    } else if (!account) {
                        if (statusBox && statusMsg) {
                            statusBox.className = 'alert alert-warning d-block mb-3';
                            statusMsg.textContent = 'Carteira bloqueada ou não autorizada. Autorize no MetaMask.';
                        }
                    } else {
                        if (statusBox && statusMsg) {
                            statusBox.className = 'alert alert-success d-block mb-3';
                            statusMsg.textContent = 'Carteira conectada com sucesso.';
                        }
                    }

                    if (addressEl) addressEl.value = account || '-';
                    if (chainIdEl) chainIdEl.value = chainId != null ? String(chainId) : '-';

                    try {
                        if (window.networkManager?.getAllNetworks) {
                            await window.networkManager.getAllNetworks();
                        }
                    } catch (_) {}
                    const net = chainId != null ? window.networkManager?.getNetworkById?.(chainId) : null;
                    if (nameEl) nameEl.value = net?.name || '-';
                    if (nativeNameEl) nativeNameEl.value = net?.nativeCurrency?.name || '-';
                    if (symbolEl) symbolEl.value = net?.nativeCurrency?.symbol || '-';
                    const rpc = Array.isArray(net?.rpc)
                        ? net.rpc[0] || '-'
                        : typeof net?.rpc === 'string'
                          ? net.rpc
                          : '-';
                    if (rpcEl) rpcEl.value = rpc;
                    const exp =
                        Array.isArray(net?.explorers) && net.explorers.length
                            ? net.explorers[0].url || net.explorers[0]
                            : '-';
                    if (expEl) expEl.value = exp;

                    try {
                        await window.walletConnector?.updateBalance?.();
                    } catch {}
                    if (balanceEl) balanceEl.value = window.walletConnector?.balance || '-';

                    if (section) section.classList.remove('d-none');
                } catch (_) {}
            };

            await refresh();
            if (window.ethereum && typeof window.ethereum.on === 'function') {
                window.ethereum.on('chainChanged', refresh);
                window.ethereum.on('accountsChanged', refresh);
            }
            try {
                document.addEventListener('wallet:chainChanged', refresh);
                document.addEventListener('wallet:connected', refresh);
                document.addEventListener('wallet:accountChanged', refresh);
                document.addEventListener('wallet:disconnected', refresh);
                document.addEventListener('network:switchResult', refresh);
            } catch (_) {}
        } catch (_) {}
    }

    async bindAdminDependentComponents() {
        try {
            const reloadContractActions = async () => {
                try {
                    const baseSystem = window.__tokencafe_base_system;
                    if (!baseSystem || typeof baseSystem.loadComponent !== 'function') return;
                    const nodes = Array.from(
                        document.querySelectorAll('[data-component="modules/contrato/contract-actions.php"]'),
                    );
                    if (!nodes.length) return;
                    for (const el of nodes) {
                        try {
                            await baseSystem.loadComponent(el);
                        } catch (_) {}
                    }
                    try {
                        document.dispatchEvent(
                            new CustomEvent('tokencafe:adminStateUpdated', {
                                detail: { isAdmin: window.TOKENCAFE_IS_ADMIN === true },
                            }),
                        );
                    } catch (_) {}
                } catch (_) {}
            };

            document.addEventListener('wallet:connected', reloadContractActions);
            document.addEventListener('wallet:accountChanged', reloadContractActions);
        } catch (_) {}
    }

    withTimeout(promise, ms) {
        if (!ms || ms <= 0) return promise;
        return Promise.race([
            Promise.resolve(promise),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
        ]);
    }

    async fetchWithTimeout(url, ms) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const signal = controller ? controller.signal : undefined;
        let timer = null;
        try {
            if (controller && ms && ms > 0) {
                timer = setTimeout(() => controller.abort(), ms);
            }
            return await fetch(url, { signal, cache: 'no-store' });
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    /**
     * Carregar componentes automaticamente
     */
    async loadComponents() {
        const componentsToLoad = document.querySelectorAll('[data-component]');
        this.dlog('loadComponents:found', { count: componentsToLoad.length });

        for (const element of componentsToLoad) {
            try {
                const name = element.getAttribute('data-component') || '';
                const t0 = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
                this.dlog('component:load:start', { component: name });
                await this.withTimeout(this.loadComponent(element), 3000);
                const t1 = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
                this.dlog('component:load:done', { component: name, ms: Math.round(t1 - t0) });
            } catch (_) {}
        }

        if (componentsToLoad.length > 0) {
            console.log(`📦 ${componentsToLoad.length} componentes carregados automaticamente`);
        }
    }

    /**
     * Carregar um componente específico
     */
    async loadComponent(element) {
        const componentName = element.getAttribute('data-component');
        if (!componentName) return;

        try {
            const candidatePaths = [
                componentName,
                `includes/${componentName}`,
                `pages/${componentName}`,
                `pages/shared/${componentName}`,
                `pages/modules/${componentName}`,
            ];

            let content = null;
            let resolvedPath = null;

            for (const path of candidatePaths) {
                try {
                    this.dlog('component:fetch:try', { component: componentName, path });
                    const response = await this.fetchWithTimeout(path, 3000);
                    if (response && response.ok) {
                        const text = await this.withTimeout(response.text(), 3000).catch(() => '');
                        const head = String(text || '')
                            .slice(0, 2000)
                            .toLowerCase();
                        const looksLikeFullPage =
                            head.includes('<!doctype') ||
                            head.includes('<html') ||
                            head.includes('<head') ||
                            head.includes('<body') ||
                            head.includes('id="app-content"') ||
                            head.includes('tokencafe-app-content');
                        if (!looksLikeFullPage && String(text || '').trim() !== '') {
                            content = text;
                            resolvedPath = path;
                            this.dlog('component:fetch:ok', { component: componentName, path });
                            break;
                        }
                    }
                } catch (_) {}
            }

            if (typeof content === 'string') {
                element.innerHTML = content;

                // Recursive: Load nested components immediately
                const nestedComponents = element.querySelectorAll('[data-component]');
                for (const nested of nestedComponents) {
                    try {
                        await this.withTimeout(this.loadComponent(nested), 3000);
                    } catch (_) {}
                }

                // Executar scripts do componente carregado (preserva atributos como type="module")
                const scripts = element.querySelectorAll('script');
                const scriptPromises = [];

                const getAssetVersion = () => {
                    try {
                        if (window.__tokencafe_asset_version) return String(window.__tokencafe_asset_version);
                        const link =
                            document.querySelector('link[href*="assets/css/styles.css?v="]') ||
                            document.querySelector('link[href*="assets/css/"][href*="?v="]');
                        const href = link ? String(link.getAttribute('href') || '') : '';
                        const idx = href.indexOf('?v=');
                        if (idx === -1) return null;
                        const v = href.slice(idx + 3).split('&')[0] || '';
                        if (!v) return null;
                        window.__tokencafe_asset_version = v;
                        return v;
                    } catch (_) {
                        return null;
                    }
                };

                const getImportMapImports = () => {
                    try {
                        if (window.__tokencafe_importmap_imports) return window.__tokencafe_importmap_imports;
                        const el = document.querySelector('script[type="importmap"]');
                        const txt = el ? String(el.textContent || '') : '';
                        if (!txt.trim()) return null;
                        const parsed = JSON.parse(txt);
                        const imports =
                            parsed && parsed.imports && typeof parsed.imports === 'object' ? parsed.imports : null;
                        if (!imports) return null;
                        window.__tokencafe_importmap_imports = imports;
                        return imports;
                    } catch (_) {
                        return null;
                    }
                };

                const versionAssetSrc = (src) => {
                    try {
                        if (!src || typeof src !== 'string') return src;
                        if (src.includes('://')) return src;
                        if (!src.startsWith('assets/')) return src;
                        if (src.includes('?')) return src;
                        const imports = getImportMapImports();
                        if (imports && typeof imports[src] === 'string' && imports[src]) return imports[src];
                        const v = getAssetVersion();
                        if (!v) return src;
                        return src + '?v=' + encodeURIComponent(v);
                    } catch (_) {
                        return src;
                    }
                };

                scripts.forEach((script) => {
                    if (script.src) {
                        const p = new Promise((resolve) => {
                            const newScript = document.createElement('script');

                            // Copiar atributos exceto src (será tratado)
                            Array.from(script.attributes).forEach((attr) => {
                                if (attr.name !== 'src') newScript.setAttribute(attr.name, attr.value);
                            });

                            // Ajustar SRC se necessário
                            let src = script.getAttribute('src');
                            newScript.src = versionAssetSrc(src);

                            const t = setTimeout(resolve, 3000);
                            newScript.onload = () => {
                                clearTimeout(t);
                                resolve();
                            };
                            newScript.onerror = () => {
                                console.warn(`⚠️ Falha ao carregar script do componente: ${src}`);
                                clearTimeout(t);
                                resolve();
                            };
                            document.body.appendChild(newScript);
                        });
                        scriptPromises.push(p);
                    } else {
                        // Inline scripts
                        const newScript = document.createElement('script');
                        Array.from(script.attributes).forEach((attr) => newScript.setAttribute(attr.name, attr.value));
                        newScript.textContent = script.textContent;
                        document.body.appendChild(newScript);
                    }
                });

                // Aguardar carregamento de scripts externos
                if (scriptPromises.length > 0) {
                    await this.withTimeout(Promise.allSettled(scriptPromises), 3000).catch(() => []);
                }

                console.log(`🔗 Componente '${componentName}' carregado de: ${resolvedPath}`);
                this.dlog('component:loaded', { component: componentName, resolvedPath });

                // Emitir evento para o ThemeManager atualizar ícones se necessário
                window.dispatchEvent(new CustomEvent('componentLoaded', { detail: { component: componentName } }));
            } else {
                console.warn(`⚠️ Componente '${componentName}' não encontrado nos caminhos:`, candidatePaths);
                this.dlog('component:not_found', { component: componentName, candidatePaths });
            }
        } catch (error) {
            console.warn(`⚠️ Erro ao carregar componente ${componentName}:`, error);
            this.dlog('component:error', {
                component: componentName,
                error: String(error && error.message ? error.message : error),
            });
        }
    }

    /**
     * Determinar caminho base baseado na localização atual
     */
    getBasePath() {
        const path = window.location.pathname;

        const normalized = String(path || '')
            .split('?')[0]
            .split('#')[0];
        const parts = normalized.split('/').filter(Boolean);
        if (parts.length <= 1) return './';
        return '../'.repeat(parts.length - 1);
    }

    /**
     * Configurar estado da aplicação (para páginas que precisam)
     */
    setupAppState(initialState = {}) {
        window.appState = new Proxy(initialState, {
            set(target, property, value) {
                const oldValue = target[property];
                target[property] = value;

                // Emitir evento quando estado muda
                if (oldValue !== value) {
                    window.dispatchEvent(
                        new CustomEvent('appStateChange', {
                            detail: { property, value, oldValue },
                        }),
                    );
                }

                return true;
            },
        });

        console.log('📊 Estado da aplicação configurado');
    }

    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    /**
     * Gerenciar acesso mobile: in-app browser passa direto, browser padrão recebe guia.
     * Páginas 'full' (sem carteira) passam direto mesmo sem window.ethereum.
     * Resolve true para continuar o fluxo normal, false para interromper.
     */
    async handleMobileAccess() {
        if (!this.isMobile()) return true;

        // In-app browser de carteira: window.ethereum já injetado — fluxo normal
        if (typeof window.ethereum !== 'undefined') {
            console.log('📱 Mobile in-app browser detectado — acesso liberado');
            return true;
        }

        // Páginas de conteúdo puro (sem carteira) passam direto mesmo no browser padrão
        const pageMode = window.__tcPageMobile || 'full';
        if (pageMode === 'full') {
            console.log("📱 Mobile browser padrão — página 'full' não requer carteira, acesso liberado");
            return true;
        }

        // Browser padrão sem carteira: mostrar guia de redirecionamento (não bloqueante)
        return new Promise((resolve) => {
            const host = window.location.host;
            const path = window.location.pathname + window.location.search;
            const fullUrl = encodeURIComponent(window.location.href);
            const mmLink = `https://metamask.app.link/dapp/${host}${path}`;
            const twLink = `https://link.trustwallet.com/open_url?coin_id=60&url=${fullUrl}`;
            const cbLink = `https://go.cb-wallet.com/dapp?url=${fullUrl}`;

            const html = `
        <div id="tcMobileGuide" style="position:fixed;inset:0;z-index:99999;background:rgba(10,10,10,0.97);display:flex;align-items:center;justify-content:center;padding:1.25rem;overflow-y:auto;">
          <div style="max-width:420px;width:100%;text-align:center;padding:2rem 1.25rem;">
            <div style="margin-bottom:1.25rem;">
              <i class="bi bi-phone" style="font-size:3rem;color:#f85d23;"></i>
            </div>
            <h4 style="color:#fff;margin-bottom:0.6rem;font-weight:700;font-size:1.2rem;">Abra pelo Browser da sua Carteira</h4>
            <p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin-bottom:1.75rem;line-height:1.65;">
              Para usar o TokenCafe no celular, abra este link pelo <strong style="color:rgba(255,255,255,0.85);">browser integrado</strong> do app da sua carteira Web3.
            </p>
            <div style="display:flex;flex-direction:column;gap:0.65rem;margin-bottom:1.5rem;">
              <a href="${mmLink}" style="display:flex;align-items:center;gap:0.85rem;padding:0.85rem 1.15rem;background:rgba(248,93,35,0.10);border:1px solid rgba(248,93,35,0.28);border-radius:12px;color:#fff;text-decoration:none;font-weight:600;font-size:0.925rem;">
                <span style="width:30px;height:30px;border-radius:8px;background:#f6851b;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-wallet2" style="font-size:1rem;color:#fff;"></i></span>
                <span>Abrir no MetaMask</span>
                <i class="bi bi-arrow-right" style="margin-left:auto;color:#f85d23;"></i>
              </a>
              <a href="${twLink}" style="display:flex;align-items:center;gap:0.85rem;padding:0.85rem 1.15rem;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.22);border-radius:12px;color:#fff;text-decoration:none;font-weight:600;font-size:0.925rem;">
                <span style="width:30px;height:30px;border-radius:8px;background:#3b82f6;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-shield-check" style="font-size:1rem;color:#fff;"></i></span>
                <span>Abrir no Trust Wallet</span>
                <i class="bi bi-arrow-right" style="margin-left:auto;color:#3b82f6;"></i>
              </a>
              <a href="${cbLink}" style="display:flex;align-items:center;gap:0.85rem;padding:0.85rem 1.15rem;background:rgba(0,82,255,0.08);border:1px solid rgba(0,82,255,0.22);border-radius:12px;color:#fff;text-decoration:none;font-weight:600;font-size:0.925rem;">
                <span style="width:30px;height:30px;border-radius:8px;background:#0052ff;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="bi bi-currency-bitcoin" style="font-size:1rem;color:#fff;"></i></span>
                <span>Abrir no Coinbase Wallet</span>
                <i class="bi bi-arrow-right" style="margin-left:auto;color:#0052ff;"></i>
              </a>
            </div>
            <button id="tcMobileSkip" style="background:none;border:1px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.38);padding:0.45rem 1.2rem;border-radius:8px;font-size:0.78rem;cursor:pointer;">
              Continuar assim mesmo
            </button>
            <p style="color:rgba(255,255,255,0.22);font-size:0.72rem;margin-top:1rem;margin-bottom:0;">TokenCafe · Web3</p>
          </div>
        </div>
      `;

            const div = document.createElement('div');
            div.innerHTML = html;
            document.body.appendChild(div.firstElementChild);

            document.getElementById('tcMobileSkip')?.addEventListener('click', () => {
                document.getElementById('tcMobileGuide')?.remove();
                resolve(true);
            });
        });
    }

    /**
     * Exibir banner informativo no topo conforme suporte mobile da página.
     * 'desktop' → banner laranja "funcionalidades limitadas no celular"
     * 'view'    → chip sutil "modo leitura"
     */
    applyMobilePageBanner() {
        if (!this.isMobile()) return;
        const pageMode = window.__tcPageMobile || 'full';
        if (pageMode === 'full') return;

        const existing = document.getElementById('tcMobileBanner');
        if (existing) return;

        const pageUrl = encodeURIComponent(window.location.href);

        if (pageMode === 'desktop') {
            const overlay = document.createElement('div');
            overlay.id = 'tcMobileBanner';
            overlay.innerHTML = `
        <div style="position:fixed;inset:0;z-index:99999;background:rgba(10,10,14,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem 1.5rem;text-align:center;gap:1.25rem;">
          <div style="width:72px;height:72px;border-radius:50%;background:rgba(248,93,35,0.12);border:2px solid rgba(248,93,35,0.35);display:flex;align-items:center;justify-content:center;">
            <i class="bi bi-laptop" style="font-size:2rem;color:#f85d23;"></i>
          </div>
          <div>
            <div style="font-size:1.15rem;font-weight:700;color:#fff;margin-bottom:0.5rem;">Acesso pelo Desktop</div>
            <div style="font-size:0.88rem;color:rgba(255,255,255,0.6);line-height:1.55;max-width:280px;margin:0 auto;">
              Esta ferramenta exige recursos que não estão disponíveis no celular.<br>Acesse pelo computador para continuar.
            </div>
          </div>
          <a href="index.php?page=tools" style="display:inline-flex;align-items:center;gap:0.5rem;padding:0.65rem 1.5rem;background:#f85d23;color:#fff;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;">
            <i class="bi bi-arrow-left"></i> Voltar para ferramentas
          </a>
        </div>
      `;
            document.body.appendChild(overlay);
        }

        if (pageMode === 'view') {
            const chip = document.createElement('div');
            chip.id = 'tcMobileBanner';
            chip.innerHTML = `
        <div style="position:fixed;top:0;left:0;right:0;z-index:9998;background:rgba(30,30,30,0.88);backdrop-filter:blur(8px);padding:0.45rem 1rem;display:flex;align-items:center;justify-content:center;gap:0.5rem;font-size:0.78rem;color:rgba(255,255,255,0.65);box-shadow:0 1px 8px rgba(0,0,0,0.25);">
          <i class="bi bi-eye" style="font-size:0.9rem;"></i>
          <span>Modo leitura — algumas ações requerem desktop</span>
          <button onclick="document.getElementById('tcMobileBanner').remove()" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:1rem;cursor:pointer;padding:0 0.25rem;margin-left:0.25rem;line-height:1;" aria-label="Fechar">&times;</button>
        </div>
      `;
            document.body.prepend(chip);
        }
    }
}

// Função factory para inicializar o sistema base
window.initBaseSystem = function (appState = null) {
    const baseSystem = window.__tokencafe_base_system || baseSystemDefault;
    if (appState) {
        try {
            baseSystem.setupAppState(appState);
        } catch (_) {}
    }
    baseSystem.init().catch((error) => {
        console.error('❌ Erro ao inicializar Base System:', error);
    });
    return baseSystem;
};

// Exportar a classe e uma instância
export { BaseSystem };
const baseSystemDefault = new BaseSystem();
try {
    window.__tokencafe_base_system = baseSystemDefault;
} catch (_) {}
baseSystemDefault.init().catch((error) => {
    console.error('❌ Erro ao auto-inicializar Base System:', error);
});
export default baseSystemDefault;
