/**
 * system-settings.js
 * Preferências pessoais do usuário — salvas em localStorage.
 * Não afeta system-settings.json (que é controle do administrador).
 */

const PREFS_KEY = 'tokencafe_user_prefs';

const DEFAULTS = {
    confirmActions: true,
    compactMode:    false,
    mainnetAlert:   true,
    notifTokenCreated: true,
    notifErrors:       true,
    notifVerify:       true,
    notifSound:     'default',
    autoGas:        true,
    gasPrice:       20,
};

// ── Leitura / escrita ─────────────────────────────────────────────────────────

function loadPrefs() {
    try {
        const raw = localStorage.getItem(PREFS_KEY);
        return raw ? Object.assign({}, DEFAULTS, JSON.parse(raw)) : { ...DEFAULTS };
    } catch (_) {
        return { ...DEFAULTS };
    }
}

function savePrefs(prefs) {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        return true;
    } catch (_) {
        return false;
    }
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function showToast(msg, isError) {
    const toast  = document.getElementById('st-toast');
    const msgEl  = document.getElementById('st-toast-msg');
    if (!toast || !msgEl) return;
    msgEl.textContent = msg;
    toast.className = 'toast align-items-center border-0 ' +
        (isError ? 'text-bg-danger' : 'text-bg-success');
    try {
        bootstrap.Toast.getOrCreateInstance(toast, { delay: 3000 }).show();
    } catch (_) {}
}

// ── Aplica preferências nos campos da UI ──────────────────────────────────────

function applyToUI(prefs) {
    setChk('st-confirmActions', prefs.confirmActions);
    setChk('st-compactMode',    prefs.compactMode);
    setChk('st-mainnetAlert',   prefs.mainnetAlert);
    setChk('st-notifTokenCreated', prefs.notifTokenCreated);
    setChk('st-notifErrors',    prefs.notifErrors);
    setChk('st-notifVerify',    prefs.notifVerify);
    setVal('st-notifSound',     prefs.notifSound);
    setChk('st-autoGas',        prefs.autoGas);
    setVal('st-gasPrice',       String(prefs.gasPrice));
    syncGasFields(prefs.autoGas);

    if (prefs.compactMode) document.body.classList.add('tc-compact');
    else document.body.classList.remove('tc-compact');
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function setChk(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(checked);
}

function syncGasFields(autoGas) {
    const wrap = document.getElementById('st-gas-manual-fields');
    if (wrap) wrap.style.opacity = autoGas ? '0.4' : '1';
    const inp = document.getElementById('st-gasPrice');
    if (inp) inp.disabled = Boolean(autoGas);
}

// ── Coleta valores da UI ──────────────────────────────────────────────────────

function collectSection(section, current) {
    const prefs = { ...current };

    if (section === 'aparencia') {
        prefs.confirmActions = getChk('st-confirmActions');
        prefs.compactMode    = getChk('st-compactMode');
        prefs.mainnetAlert   = getChk('st-mainnetAlert');
    } else if (section === 'notificacoes') {
        prefs.notifTokenCreated = getChk('st-notifTokenCreated');
        prefs.notifErrors       = getChk('st-notifErrors');
        prefs.notifVerify       = getChk('st-notifVerify');
        prefs.notifSound        = getVal('st-notifSound');
    } else if (section === 'blockchain') {
        prefs.autoGas  = getChk('st-autoGas');
        prefs.gasPrice = parseInt(getVal('st-gasPrice'), 10) || 20;
    }

    return prefs;
}

function getVal(id) {
    return (document.getElementById(id) || {}).value || '';
}

function getChk(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

// ── Permissão de notificações ─────────────────────────────────────────────────

function refreshNotifBadge() {
    const badge = document.getElementById('st-notif-permission-badge');
    const btn   = document.getElementById('st-request-notif-btn');
    if (!badge) return;

    if (!('Notification' in window)) {
        badge.className = 'badge bg-secondary ms-2';
        badge.textContent = 'Não suportado';
        if (btn) btn.disabled = true;
        return;
    }

    const status = { granted: ['bg-success', 'Permitida'], denied: ['bg-danger', 'Bloqueada'], default: ['bg-warning text-dark', 'Aguardando'] };
    const [cls, txt] = status[Notification.permission] || status.default;
    badge.className = `badge ${cls} ms-2`;
    badge.textContent = txt;
    if (btn) btn.style.display = Notification.permission === 'granted' ? 'none' : '';
}

// ── Export / Import ───────────────────────────────────────────────────────────

function exportPrefs(prefs) {
    const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'tokencafe-preferencias.json';
    a.click();
    URL.revokeObjectURL(url);
}

function importPrefs(file, onDone) {
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (typeof data !== 'object' || Array.isArray(data)) throw new Error('formato inválido');
            const merged = Object.assign({}, DEFAULTS, data);
            savePrefs(merged);
            applyToUI(merged);
            onDone(true, merged);
        } catch (_) {
            onDone(false, null);
        }
    };
    reader.readAsText(file);
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    let prefs = loadPrefs();
    applyToUI(prefs);
    refreshNotifBadge();

    // Botões salvar por seção
    document.querySelectorAll('.st-save-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            prefs = collectSection(btn.dataset.section, prefs);
            if (savePrefs(prefs)) {
                applyToUI(prefs);
                showToast('Preferências salvas!');
                // Expõe as preferências globalmente para outros módulos
                window.TOKENCAFE_USER_PREFS = prefs;
            } else {
                showToast('Erro ao salvar (localStorage bloqueado?)', true);
            }
        });
    });

    // Gas automático — sincroniza campos manuais em tempo real
    const autoGasToggle = document.getElementById('st-autoGas');
    if (autoGasToggle) {
        autoGasToggle.addEventListener('change', () => syncGasFields(autoGasToggle.checked));
    }

    // Solicitar permissão de notificação
    document.getElementById('st-request-notif-btn')?.addEventListener('click', async () => {
        if (!('Notification' in window)) return;
        await Notification.requestPermission();
        refreshNotifBadge();
    });

    // Exportar
    document.getElementById('st-export-btn')?.addEventListener('click', () => {
        exportPrefs(prefs);
        showToast('Arquivo de backup exportado!');
    });

    // Importar
    document.getElementById('st-import-file')?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (!file) return;
        importPrefs(file, (ok, merged) => {
            if (ok) {
                prefs = merged;
                showToast('Configurações importadas com sucesso!');
            } else {
                showToast('Arquivo inválido — verifique o formato JSON', true);
            }
            e.target.value = '';
        });
    });

    // Restaurar preferências padrão (não afeta tokens salvos)
    document.getElementById('st-clear-prefs-btn')?.addEventListener('click', () => {
        if (!confirm('Restaurar todas as preferências para os valores padrão?')) return;
        prefs = { ...DEFAULTS };
        savePrefs(prefs);
        applyToUI(prefs);
        showToast('Preferências restauradas para o padrão.');
    });

    // Limpar lista de tokens (localStorage tokencafe_tokens*)
    document.getElementById('st-clear-tokens-btn')?.addEventListener('click', () => {
        if (!confirm('Remover todos os tokens salvos no navegador?\n\nIsso NÃO afeta os contratos na blockchain — apenas o registro local.')) return;
        Object.keys(localStorage)
            .filter(k => k.startsWith('tokencafe_token') || k === 'tc_tokens')
            .forEach(k => localStorage.removeItem(k));
        showToast('Lista de tokens limpa.');
    });

    // Expõe as prefs globalmente para outros módulos lerem (ex: moeda para cotações)
    window.TOKENCAFE_USER_PREFS = prefs;
});