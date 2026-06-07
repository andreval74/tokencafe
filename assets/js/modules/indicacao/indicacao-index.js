/**
 * indicacao-index.js — Página "Indique & Ganhe"
 *
 * A indicação é feita pela carteira: o amigo informa o endereço do indicador
 * ao criar o token. Não há link com ?ref= — a carteira É o código.
 */

import { PAYMENT_CONFIG } from '../../modules/contrato/payment-config.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function _getConnectedWallet() {
    try {
        const status = window.walletConnector?.getStatus?.() || {};
        if (status.isConnected && status.account) return status.account.trim();
        const selected = window.ethereum?.selectedAddress;
        if (selected) return selected.trim();
    } catch (_) {}
    return '';
}

function _buildShareText(wallet) {
    const base = (PAYMENT_CONFIG.SITE_BASE_URL || 'https://tokencafe.app').replace(/\/$/, '');
    return `Crie seu token ERC-20 no TokenCafe — rápido, sem código, qualquer blockchain.\n\nUse meu código de indicação para ganhar ${PAYMENT_CONFIG.REFERRAL_DISCOUNT_PERCENT || 10}% de desconto:\n${wallet}\n\n${base}`;
}

function _copyToClipboard(text) {
    if (navigator.clipboard?.writeText) {
        return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    try {
        const el = document.createElement('textarea');
        el.value = text;
        el.style.position = 'fixed';
        el.style.opacity = '0';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return Promise.resolve(ok);
    } catch (_) { return Promise.resolve(false); }
}

function _showFeedback(elId, durationMs) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.classList.remove('d-none');
    setTimeout(() => el.classList.add('d-none'), durationMs || 2000);
}

function _openShareUrl(url) {
    window.open(url, '_blank', 'noopener,noreferrer,width=640,height=480');
}

// ── Renderização ──────────────────────────────────────────────────────────────

function renderConnected(wallet) {
    const input = document.getElementById('indicacaoCodigoInput');
    if (input) input.value = wallet;

    const text = _buildShareText(wallet);
    const shareTextEl = document.getElementById('indicacaoShareText');
    if (shareTextEl) shareTextEl.textContent = text;

    document.getElementById('indicacaoNoWallet')?.classList.add('d-none');
    document.getElementById('indicacaoCodigoCard')?.classList.remove('d-none');
    document.getElementById('indicacaoShareTextCard')?.classList.remove('d-none');
}

function renderDisconnected() {
    const input = document.getElementById('indicacaoCodigoInput');
    if (input) input.value = '';

    const shareTextEl = document.getElementById('indicacaoShareText');
    if (shareTextEl) shareTextEl.textContent = '';

    document.getElementById('indicacaoNoWallet')?.classList.remove('d-none');
    document.getElementById('indicacaoCodigoCard')?.classList.add('d-none');
    document.getElementById('indicacaoShareTextCard')?.classList.add('d-none');
}

// ── Botões de compartilhamento ────────────────────────────────────────────────

function _buildShareUrls(wallet) {
    const text = _buildShareText(wallet);
    const base = (PAYMENT_CONFIG.SITE_BASE_URL || 'https://tokencafe.app').replace(/\/$/, '');
    const enc  = encodeURIComponent;
    return {
        whatsapp:  `https://api.whatsapp.com/send?text=${enc(text)}`,
        telegram:  `https://t.me/share/url?url=${enc(base)}&text=${enc(text)}`,
        twitter:   `https://twitter.com/intent/tweet?text=${enc(text)}`,
        facebook:  `https://www.facebook.com/sharer/sharer.php?u=${enc(base)}`,
    };
}

function _bindShareButtons(wallet) {
    const urls = _buildShareUrls(wallet);
    const bind = (id, url) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.onclick = () => _openShareUrl(url);
    };
    bind('btnIndicacaoWhatsApp',  urls.whatsapp);
    bind('btnIndicacaoTelegram',  urls.telegram);
    bind('btnIndicacaoTwitter',   urls.twitter);
    bind('btnIndicacaoFacebook',  urls.facebook);
}

// ── Inicialização ─────────────────────────────────────────────────────────────

function init() {
    // Botão: Copiar código
    const btnCopyCodigo = document.getElementById('btnCopyIndicacaoCodigo');
    if (btnCopyCodigo) {
        btnCopyCodigo.addEventListener('click', () => {
            const input = document.getElementById('indicacaoCodigoInput');
            if (!input?.value) return;
            _copyToClipboard(input.value).then(() => {
                const ico = document.getElementById('icoIndicacaoCopy');
                if (ico) { ico.className = 'bi bi-check2'; setTimeout(() => { ico.className = 'bi bi-clipboard'; }, 2000); }
                _showFeedback('indicacaoCopyFeedback', 2000);
            });
        });
    }

    // Botão: Copiar texto
    const btnCopyText = document.getElementById('btnCopyShareText');
    if (btnCopyText) {
        btnCopyText.addEventListener('click', () => {
            const el = document.getElementById('indicacaoShareText');
            if (!el?.textContent) return;
            _copyToClipboard(el.textContent).then(() => {
                _showFeedback('indicacaoTextCopyFeedback', 2000);
            });
        });
    }

    // Listeners de estado de carteira
    document.addEventListener('wallet:connected', (e) => {
        const account = e?.detail?.account || _getConnectedWallet();
        if (account) { renderConnected(account); _bindShareButtons(account); }
    });

    document.addEventListener('wallet:accountChanged', (e) => {
        const account = e?.detail?.account || _getConnectedWallet();
        if (account) { renderConnected(account); _bindShareButtons(account); }
        else renderDisconnected();
    });

    document.addEventListener('wallet:disconnected', () => renderDisconnected());

    // Estado inicial
    const wallet = _getConnectedWallet();
    if (wallet) {
        renderConnected(wallet);
        _bindShareButtons(wallet);
    } else {
        renderDisconnected();
        setTimeout(() => {
            const w = _getConnectedWallet();
            if (w) { renderConnected(w); _bindShareButtons(w); }
        }, 800);
    }
}

document.addEventListener('DOMContentLoaded', init);
