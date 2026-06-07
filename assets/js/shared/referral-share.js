/**
 * referral-share.js — Lógica do Modal de Indicação TokenCafe
 *
 * Responsabilidade: preencher e controlar o modal #referralShareModal,
 * cuja estrutura HTML está em modules/modals/referral-share-modal.php.
 *
 * Este arquivo NÃO gera HTML — apenas manipula o DOM do modal existente.
 *
 * Uso público: window.openReferralShare()
 */

import { PAYMENT_CONFIG } from "../modules/contrato/payment-config.js";
import { getFallbackRpc } from "./network-fallback.js";

// ── Helpers privados ──────────────────────────────────────────────────────────

/** Retorna o endereço da carteira conectada ou string vazia. */
function _getConnectedWallet() {
    try {
        const status = window.walletConnector?.getStatus?.() || {};
        if (status.isConnected && status.account) return status.account.trim();
        const selected = window.ethereum?.selectedAddress;
        if (selected) return selected.trim();
        return "";
    } catch (_) { return ""; }
}

function _getCookie(name) {
    try {
        const parts = String(document.cookie || "").split(";");
        for (const raw of parts) {
            const [k, ...rest] = String(raw).trim().split("=");
            if (k === name) return decodeURIComponent(rest.join("=") || "");
        }
    } catch (_) {}
    return "";
}

function _getCurrentChainId() {
    try {
        const cid = window.walletConnector?.getStatus?.()?.chainId;
        if (cid != null && cid !== "") return Number(cid);
    } catch (_) {}
    try {
        const cookieCid = _getCookie("tokencafe_chain_id");
        if (cookieCid) return Number(cookieCid);
    } catch (_) {}
    return 56;
}

function _isEmptyCode(code) {
    const hex = String(code || "").toLowerCase().replace(/^0x/, "");
    return hex === "" || /^0+$/.test(hex);
}

async function _postJsonWithTimeout(url, body, ms) {
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const signal = controller ? controller.signal : undefined;
    let timer = null;
    try {
        if (controller && ms && ms > 0) timer = setTimeout(() => controller.abort(), ms);
        const res = await fetch(String(url), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal,
            cache: "no-store",
        });
        if (!res.ok) return null;
        return await res.json();
    } catch (_) {
        return null;
    } finally {
        if (timer) clearTimeout(timer);
    }
}

async function _checkIsContract(addr, chainId) {
    const cid = Number(chainId || 0) || 56;

    if (typeof window !== "undefined" && window.ethereum?.request) {
        try {
            const curChain = await window.ethereum.request({ method: "eth_chainId" });
            if (parseInt(curChain, 16) === cid) {
                const code = await window.ethereum.request({ method: "eth_getCode", params: [String(addr), "latest"] });
                return !_isEmptyCode(code);
            }
        } catch (_) {}
    }

    const rpc = getFallbackRpc(cid);
    if (!rpc) return null;
    const body = { jsonrpc: "2.0", id: 10, method: "eth_getCode", params: [String(addr), "latest"] };
    const js = await _postJsonWithTimeout(rpc, body, 3500);
    const code = js && js.result ? String(js.result) : "0x";
    return !_isEmptyCode(code);
}

/** Retorna a URL pública do site (base, sem parâmetros). */
function _buildSiteUrl() {
    return (PAYMENT_CONFIG.SITE_BASE_URL || "https://tokencafe.app").replace(/\/$/, "");
}

/**
 * Constrói o link de indicação com ?ref=wallet para captura automática.
 * Quando o destinatário clicar, url-params.js persiste o endereço e o
 * formulário de criação de token é auto-preenchido com o indicador.
 */
function _buildRefLink(siteUrl, wallet) {
    if (!wallet) return siteUrl;
    return `${siteUrl}?ref=${encodeURIComponent(wallet)}`;
}

/** Monta o texto de compartilhamento substituindo {SITE} e {CODE}. */
function _buildShareText(siteUrl, wallet) {
    return (PAYMENT_CONFIG.REFERRAL_SHARE_TEXT || "Conheça o TokenCafe: {SITE}\nCódigo: {CODE}")
        .replace("{SITE}", siteUrl)
        .replace("{CODE}", wallet);
}

function _setWalletFeedback(msg, type) {
    const el = document.getElementById("share-wallet-feedback");
    if (!el) return;
    el.textContent = msg || "";
    el.className = "tc-field-hint mt-1 " + ({ neutral: "", success: "text-success", error: "text-danger", warn: "text-warning" }[type] || "");
}

function _setActionsEnabled(enabled) {
    const ids = ["share-wa-btn", "share-tg-btn", "share-tw-btn", "share-fb-btn", "btnCopyRefLink", "btnShareCopyLink", "btnCopyShareText"];
    for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (enabled) el.removeAttribute("disabled");
        else el.setAttribute("disabled", "disabled");
    }
}

let _shareWalletVerifySeq = 0;
let _shareWalletVerifyTimer = null;

function _scheduleShareWalletValidation(delayMs = 450) {
    _shareWalletVerifySeq += 1;
    const seq = _shareWalletVerifySeq;

    if (_shareWalletVerifyTimer) clearTimeout(_shareWalletVerifyTimer);
    _shareWalletVerifyTimer = setTimeout(async () => {
        if (seq !== _shareWalletVerifySeq) return;

        const input = document.getElementById("share-wallet-input");
        const wallet = (input?.value || "").trim();
        const siteUrl = _buildSiteUrl();

        if (!wallet) {
            _setWalletFeedback("", "neutral");
            _setActionsEnabled(false);
            _fillModal("", siteUrl, "");
            return;
        }

        let normalized = "";
        try {
            if (!window.ethers?.utils?.isAddress?.(wallet) || wallet === window.ethers?.constants?.AddressZero) {
                _setWalletFeedback("Informe um endereço de carteira válido (0x...).", "error");
                _setActionsEnabled(false);
                _fillModal("", siteUrl, "");
                return;
            }
            normalized = window.ethers.utils.getAddress(wallet);
        } catch (_) {
            _setWalletFeedback("Informe um endereço de carteira válido (0x...).", "error");
            _setActionsEnabled(false);
            _fillModal("", siteUrl, "");
            return;
        }

        _setWalletFeedback("Verificando se é uma carteira (EOA)...", "neutral");
        _setActionsEnabled(false);

        const chainId = _getCurrentChainId();
        const isContract = await _checkIsContract(normalized, chainId);
        if (seq !== _shareWalletVerifySeq) return;

        if (isContract === true) {
            _setWalletFeedback("Este endereço é um contrato. Informe uma carteira pessoal (EOA).", "error");
            _setActionsEnabled(false);
            _fillModal("", siteUrl, "");
            return;
        }

        if (isContract === null) {
            _setWalletFeedback("Não foi possível validar na rede agora. Tente novamente em alguns segundos.", "warn");
            _setActionsEnabled(false);
            _fillModal("", siteUrl, "");
            return;
        }

        _setWalletFeedback("Carteira válida.", "success");
        _setActionsEnabled(true);
        _fillModal(normalized, siteUrl, _buildShareText(siteUrl, normalized));
    }, Math.max(0, Number(delayMs) || 0));
}

// ── Setup único de listeners (executado uma vez ao carregar o módulo) ─────────

/**
 * Registra todos os event listeners do modal UMA VEZ.
 * Os listeners leem os valores dinâmicos de data-share-url / data-copy-text
 * em vez de capturar valores no momento do bind — evita duplicatas a cada abertura.
 */
function _setupListeners() {
    const el = (id) => document.getElementById(id);

    // Botões de compartilhamento: abrem URL armazenada em data-share-url
    const openShare = (id) => {
        el(id)?.addEventListener("click", () => {
            const url = el(id)?.dataset.shareUrl;
            if (url) window.open(url, "_blank", "noopener,noreferrer");
        });
    };
    openShare("share-wa-btn");
    openShare("share-tg-btn");
    openShare("share-tw-btn");
    openShare("share-fb-btn");

    // Botões de copiar: leem data-copy-text
    const bindCopy = (id) => {
        el(id)?.addEventListener("click", (e) => {
            const text = el(id)?.dataset.copyText;
            if (!text) return;
            const btn = e.currentTarget;
            navigator.clipboard.writeText(text).then(() => {
                const orig = btn.innerHTML;
                btn.innerHTML = '<i class="bi bi-check2"></i>';
                window.notify?.("Copiado com sucesso!", "success");
                setTimeout(() => { btn.innerHTML = orig; }, 2000);
            }).catch(() => {
                window.notify?.("Não foi possível copiar automaticamente.", "warning");
            });
        });
    };
    bindCopy("btnCopyRefLink");
    bindCopy("btnShareCopyLink");
    bindCopy("btnCopyShareText");

    // Regenera o texto ao digitar/colar o endereço de carteira
    el("share-wallet-input")?.addEventListener("input", () => _scheduleShareWalletValidation(450));
    el("share-wallet-input")?.addEventListener("paste", () => setTimeout(() => _scheduleShareWalletValidation(0), 0));

    // Botão de indicação no header abre o modal
    el("tc-referral-header-btn")?.addEventListener("click", () => window.openReferralShare());
}

// ── Preenchimento do modal ────────────────────────────────────────────────────

/**
 * Injeta os dados dinâmicos nos elementos do modal.
 * Usa data-share-url e data-copy-text para desacoplar valor do listener.
 * @param {string} wallet    - Endereço completo da carteira conectada
 * @param {string} siteUrl   - URL do site (ex: https://tokencafe.app)
 * @param {string} shareText - Texto completo para compartilhar
 */
function _fillModal(wallet, siteUrl, shareText) {
    const enc         = encodeURIComponent;
    const shortWallet = wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "—";
    const discount    = PAYMENT_CONFIG.REFERRAL_DISCOUNT_PERCENT ?? 10;
    const bonus       = PAYMENT_CONFIG.REFERRAL_BONUS_PERCENT    ?? 10;

    const el = (id) => document.getElementById(id);

    // Percentuais nos passos
    if (el("share-discount-pct")) el("share-discount-pct").textContent = `${discount}%`;
    if (el("share-bonus-pct"))    el("share-bonus-pct").textContent    = `${bonus}%`;

    // Texto sugerido (preserva quebras de linha, escapa HTML)
    const textBox = el("share-text-display");
    if (textBox) {
        textBox.innerHTML = shareText
            .replace(/&/g, "&amp;")
            .replace(/</g,  "&lt;")
            .replace(/\n/g, "<br>");
    }

    // Link de indicação com ?ref= para captura automática pelo url-params.js
    const refLink = _buildRefLink(siteUrl, wallet);

    // Campo "Seu link" mostra o link com ?ref= (pronto para copiar e compartilhar)
    if (el("refShareLinkInput")) el("refShareLinkInput").value = refLink;

    // Normaliza quebras de linha (remove \r) antes de codificar para compartilhamento
    const cleanText = shareText.replace(/\r/g, "");

    // URLs dos botões de compartilhamento social (usam refLink para captura automática)
    const waUrl = `https://wa.me/?text=${enc(cleanText)}`;
    const tgUrl = `https://t.me/share/url?url=${enc(refLink)}&text=${enc(cleanText)}`;
    const twUrl = `https://twitter.com/intent/tweet?text=${enc(cleanText)}`;
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${enc(refLink)}&quote=${enc(cleanText)}`;

    const setShareUrl = (id, shareUrl) => { const e = el(id); if (e) e.dataset.shareUrl = shareUrl; };
    setShareUrl("share-wa-btn", waUrl);
    setShareUrl("share-tg-btn", tgUrl);
    setShareUrl("share-tw-btn", twUrl);
    setShareUrl("share-fb-btn", fbUrl);

    // Copiar link → copia o refLink completo (com ?ref=) | Copiar texto → copia o texto
    const setCopyText = (id, text) => { const e = el(id); if (e) e.dataset.copyText = text; };
    setCopyText("btnCopyRefLink",   refLink);
    setCopyText("btnShareCopyLink", refLink);
    setCopyText("btnCopyShareText", cleanText);
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Abre o modal de indicação preenchido com os dados da carteira conectada.
 * Exposto globalmente como window.openReferralShare() para uso via onclick em PHP.
 */
export function openReferralShare() {
    if (PAYMENT_CONFIG.REFERRAL_ENABLED === false) {
        window.notify?.("O programa de indicações está temporariamente desativado.", "warning");
        return;
    }

    const modalEl = document.getElementById("referralShareModal");
    if (!modalEl) {
        console.warn("[referral-share] #referralShareModal não encontrado. Verifique o include em footer.php.");
        return;
    }

    // Pré-preenche o input com a carteira conectada (se houver) ou limpa o campo
    const connectedWallet = _getConnectedWallet();
    const inputEl = document.getElementById("share-wallet-input");
    if (inputEl) {
        if (connectedWallet && !inputEl.value.trim()) {
            inputEl.value = connectedWallet;
        } else if (!connectedWallet) {
            inputEl.value = "";
        }
    }

    // Usa carteira do input (digitada ou auto-preenchida) ou a conectada
    const wallet  = inputEl?.value.trim() || connectedWallet;
    const siteUrl = _buildSiteUrl();

    const input = document.getElementById("share-wallet-input");
    if (input && wallet && input.value.trim() === "") input.value = wallet;
    _setWalletFeedback("", "neutral");
    _setActionsEnabled(false);
    _fillModal(wallet, siteUrl, wallet ? _buildShareText(siteUrl, wallet) : "");
    bootstrap.Modal.getOrCreateInstance(modalEl).show();
    _scheduleShareWalletValidation(0);
}

window.openReferralShare = openReferralShare;

// Garante limpeza do backdrop e scroll do body ao fechar o modal
function _setupModalCleanup() {
    const modalEl = document.getElementById("referralShareModal");
    if (!modalEl) return;
    modalEl.addEventListener("hidden.bs.modal", () => {
        document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
        document.body.classList.remove("modal-open");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("padding-right");
    });
}

// Listeners registrados uma única vez quando o módulo carrega
document.addEventListener("DOMContentLoaded", () => {
    _setupListeners();
    _setupModalCleanup();
});
