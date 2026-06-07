/**
 * admin-painel.js
 * Carregado como script regular (não módulo) pelo footer via $enqueue_script_src.
 * DOM + Bootstrap estão prontos quando este script executa.
 */

console.log('[AdminPainel] script carregado');

(function () {
    'use strict';

    // URL do endpoint — lida do data-attribute do #admin-painel-root
    var root = document.getElementById('admin-painel-root');
    if (!root) {
        console.warn('[AdminPainel] #admin-painel-root não encontrado na página');
        return;
    }

    var SAVE_URL = root.dataset.saveUrl || '/modules/admin-painel/save-settings.php';
    console.log('[AdminPainel] save URL:', SAVE_URL);

    var activeIconInput = null;
    var biIconNames = null;

    function ensureBiIconsDatalist() {
        var dl = document.getElementById('ap-bi-icons');
        if (dl) return dl;
        dl = document.createElement('datalist');
        dl.id = 'ap-bi-icons';
        document.body.appendChild(dl);
        return dl;
    }

    function extractBootstrapIconNamesFromStylesheets() {
        var names = new Set();
        var sheets = Array.prototype.slice.call(document.styleSheets || []);
        sheets.forEach(function (sheet) {
            var rules;
            try {
                rules = sheet.cssRules;
            } catch (_) {
                rules = null;
            }
            if (!rules) return;
            Array.prototype.slice.call(rules).forEach(function (rule) {
                var selectorText = rule && rule.selectorText;
                if (!selectorText) return;
                selectorText.split(',').forEach(function (sel) {
                    var m = sel.trim().match(/\.bi-([a-z0-9-]+)::before/);
                    if (m && m[1]) names.add('bi-' + m[1]);
                });
            });
        });
        return Array.from(names).sort();
    }

    function extractBootstrapIconNamesFromDom() {
        var names = new Set();
        document.querySelectorAll('i').forEach(function (el) {
            if (!el.classList) return;
            el.classList.forEach(function (c) {
                if (typeof c === 'string' && c.indexOf('bi-') === 0) names.add(c);
            });
        });
        return Array.from(names).sort();
    }

    function initBiIconIndex() {
        if (biIconNames) return biIconNames;
        biIconNames = extractBootstrapIconNamesFromStylesheets();
        if (!biIconNames || biIconNames.length === 0) {
            biIconNames = extractBootstrapIconNamesFromDom();
        }
        if (!biIconNames || biIconNames.length === 0) {
            biIconNames = [
                'bi-grid',
                'bi-tools',
                'bi-gear',
                'bi-wallet2',
                'bi-coin',
                'bi-graph-up-arrow',
                'bi-headset',
                'bi-sliders',
            ];
        }
        var dl = ensureBiIconsDatalist();
        dl.innerHTML = '';
        biIconNames.forEach(function (name) {
            var opt = document.createElement('option');
            opt.value = name;
            dl.appendChild(opt);
        });
        return biIconNames;
    }

    // ── Toast ─────────────────────────────────────────────────────────────────
    function showToast(msg, isError) {
        var toast = document.getElementById('ap-toast');
        var msgEl = document.getElementById('ap-toast-msg');
        if (!toast || !msgEl) {
            console.warn('[AdminPainel]', isError ? 'ERRO' : 'OK', msg);
            if (isError) alert(msg);
            return;
        }
        msgEl.textContent = msg;
        toast.className = 'toast align-items-center border-0 ' + (isError ? 'text-bg-danger' : 'text-bg-success');
        try {
            var bsToast = bootstrap.Toast.getOrCreateInstance(toast, { delay: 4000 });
            bsToast.show();
        } catch (e) {
            console.warn('[AdminPainel] bootstrap toast error:', e);
        }
    }

    // ── Regra: Ativo=OFF → desliga e desabilita todos os outros campos da linha
    function syncRowState(row) {
        var enabledToggle = row.querySelector('.ap-mod-toggle[data-field="enabled"]');
        if (!enabledToggle) return;
        var on = enabledToggle.checked;
        row.classList.toggle('ap-row-disabled', !on);
        var comingSoonToggle = row.querySelector('.ap-mod-toggle[data-field="comingSoon"]');
        row.classList.toggle('ap-row-coming-soon', !!(comingSoonToggle && comingSoonToggle.checked));
        var dependents = row.querySelectorAll(
            '.ap-mod-toggle:not([data-field="enabled"]), .ap-mod-label, .ap-mod-group, .ap-mod-icon',
        );
        dependents.forEach(function (el) {
            if (!on && el.type === 'checkbox') el.checked = false;
            el.disabled = !on;
        });
    }

    function bindModuleRowLogic() {
        document.querySelectorAll('.ap-mod-row[data-module]').forEach(function (row) {
            syncRowState(row);
            var enabledToggle = row.querySelector('.ap-mod-toggle[data-field="enabled"]');
            if (enabledToggle) {
                enabledToggle.addEventListener('change', function () {
                    syncRowState(row);
                });
            }
            var comingSoonToggle = row.querySelector('.ap-mod-toggle[data-field="comingSoon"]');
            if (comingSoonToggle) {
                comingSoonToggle.addEventListener('change', function () {
                    syncRowState(row);
                });
            }
        });
    }

    // ── Coleta módulos ────────────────────────────────────────────────────────
    function collectModules() {
        var modules = {};
        document.querySelectorAll('.ap-modules-list').forEach(function (listEl) {
            listEl.querySelectorAll('.ap-mod-row[data-module]').forEach(function (row) {
                var slug = row.dataset.module;
                if (!slug) return;
                function getToggle(field) {
                    var el = row.querySelector('.ap-mod-toggle[data-field="' + field + '"]');
                    return el ? el.checked : false;
                }
                var labelEl = row.querySelector('.ap-mod-label');
                var label = labelEl ? (labelEl.value || '').trim() || slug : slug;
                var saved =
                    (window.TC_SYSTEM_SETTINGS &&
                        window.TC_SYSTEM_SETTINGS.modules &&
                        window.TC_SYSTEM_SETTINGS.modules[slug]) ||
                    {};
                var groupEl = row.querySelector('.ap-mod-group');
                var group = groupEl ? groupEl.value : saved.group || '';
                var iconEl = row.querySelector('.ap-mod-icon');
                var icon = iconEl ? (iconEl.value || '').trim() : saved.icon || '';
                var fallbackIcon = ((row.dataset.defaultIcon || saved.icon || 'bi-box') + '').trim();
                if (!icon) {
                    icon = fallbackIcon;
                }
                var iconType = icon.indexOf(' ') !== -1 ? 'class' : 'bi';
                modules[slug] = {
                    group: group,
                    enabled: getToggle('enabled'),
                    adminOnly: getToggle('adminOnly'),
                    comingSoon: getToggle('comingSoon'),
                    mainnet: saved.mainnet !== undefined ? saved.mainnet : true,
                    testnet: saved.testnet !== undefined ? saved.testnet : true,
                    label: label,
                    iconType: iconType,
                    icon: icon,
                };
            });
        });
        // Redes tab — sobrescreve mainnet/testnet se editado lá
        document.querySelectorAll('#tab-redes .ap-mod-toggle[data-module]').forEach(function (input) {
            var slug = input.dataset.module;
            var field = input.dataset.field;
            if (!slug || !field) return;
            if (!modules[slug]) {
                var base =
                    (window.TC_SYSTEM_SETTINGS &&
                        window.TC_SYSTEM_SETTINGS.modules &&
                        window.TC_SYSTEM_SETTINGS.modules[slug]) ||
                    {};
                modules[slug] = Object.assign({}, base);
            }
            modules[slug][field] = input.checked;
        });
        return modules;
    }

    // ── Coleta contratos ──────────────────────────────────────────────────────
    function collectContracts() {
        var modelPrices = {};
        document.querySelectorAll('.ap-contract-price').forEach(function (el) {
            modelPrices[el.dataset.model] = parseFloat(el.value) || 0;
        });
        var gasLimits = {};
        document.querySelectorAll('.ap-gas-limit').forEach(function (el) {
            gasLimits[el.dataset.model] = parseInt(el.value, 10) || 0;
        });
        var factoryAddresses = {};
        document.querySelectorAll('.ap-factory-addr').forEach(function (el) {
            factoryAddresses[el.dataset.chain] = el.value.trim();
        });
        var basePriceWei = document.getElementById('ap-base-price-wei');
        var gasMargin = document.getElementById('ap-gas-margin');
        var platformWallet = document.getElementById('ap-platform-wallet');
        return {
            modelPrices: modelPrices,
            gasLimits: gasLimits,
            factoryAddresses: factoryAddresses,
            basePriceWei: basePriceWei ? basePriceWei.value.trim() : '',
            gasMarginPercent: gasMargin ? parseInt(gasMargin.value, 10) || 20 : 20,
            platformWallet: platformWallet ? platformWallet.value.trim() : '',
        };
    }

    // ── Coleta permissões ─────────────────────────────────────────────────────
    function collectPermissions() {
        var wallets = [];
        document.querySelectorAll('.ap-admin-wallet').forEach(function (el) {
            var w = el.value.trim().toLowerCase();
            if (/^0x[0-9a-fA-F]{40}$/.test(w)) wallets.push(w);
        });
        var chief = document.getElementById('ap-chief-admin');
        var bypass = document.getElementById('ap-bypass-enabled');
        var barriers = document.getElementById('ap-disable-barriers');
        return {
            adminWallets: wallets,
            chiefAdmin: chief ? chief.value.trim().toLowerCase() : '',
            bypassEnabled: bypass ? bypass.checked : false,
            disableBarriers: barriers ? barriers.checked : false,
        };
    }

    // ── Coleta features ───────────────────────────────────────────────────────
    function collectFeatures() {
        var features = {};
        document.querySelectorAll('.ap-feature-toggle').forEach(function (el) {
            features[el.dataset.key] = el.checked;
        });
        return features;
    }

    function collectCustomFunctions() {
        var fns = [];
        document.querySelectorAll('.ap-custom-fn-row').forEach(function (row) {
            var key = row.querySelector('[data-cf="key"]');
            if (!key || !key.value.trim()) return;
            var val = row.querySelector('[data-cf="value"]');
            var mod = row.querySelector('[data-cf="module"]');
            var desc = row.querySelector('[data-cf="description"]');
            fns.push({
                key: key ? key.value.trim() : '',
                value: val ? val.value.trim() : '',
                module: mod ? mod.value.trim() : '',
                description: desc ? desc.value.trim() : '',
            });
        });
        return fns;
    }

    // ── Coleta sessões (groups) ───────────────────────────────────────────────
    function collectGroups() {
        var groups = [];
        document.querySelectorAll('#ap-groups-list .ap-group-row').forEach(function (row) {
            var id = (row.dataset.groupId || '').trim();
            var label = (row.querySelector('.ap-group-label')?.value || '').trim();
            var icon = (row.querySelector('.ap-group-icon')?.value || 'bi-grid').trim();
            var highlight = !!row.querySelector('.ap-group-highlight')?.checked;
            var enabled = !!row.querySelector('.ap-group-enabled')?.checked;
            if (id && label) groups.push({ id: id, label: label, icon: icon, highlight: highlight, enabled: enabled });
        });
        return groups;
    }

    // Atualiza preview do ícone ao digitar
    function bindGroupIconPreview() {
        document.addEventListener('input', function (e) {
            if (!e.target.classList.contains('ap-group-icon')) return;
            var row = e.target.closest('.ap-group-row');
            var preview = row && row.querySelector('.ap-group-icon-preview');
            if (!preview) return;
            preview.className = 'bi ' + e.target.value.trim() + ' ap-group-icon-preview';
        });
    }

    function setModIconPreview(row) {
        if (!row) return;
        var iconEl = row.querySelector('.ap-mod-icon');
        if (!iconEl) return;
        var iconVal = (iconEl.value || '').trim();
        var fallback = ((row.dataset.defaultIcon || 'bi-box') + '').trim();
        var v = iconVal || fallback;
        var cls = v.indexOf(' ') !== -1 ? v : 'bi ' + v;
        var preview = row.querySelector('.ap-mod-icon-preview');
        if (preview) preview.className = cls + ' ap-mod-icon-preview';
    }

    function bindModuleIconPreview() {
        document.addEventListener('input', function (e) {
            if (!e.target.classList.contains('ap-mod-icon')) return;
            setModIconPreview(e.target.closest('.ap-mod-row[data-module]'));
        });
        document.querySelectorAll('.ap-mod-row[data-module]').forEach(function (row) {
            setModIconPreview(row);
        });
    }

    // Gera um slug simples a partir de um texto
    function _slugify(text) {
        return (
            text
                .toLowerCase()
                .normalize('NFD')
                .replace(/[̀-ͯ]/g, '')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '')
                .slice(0, 30) || 'group-' + Date.now()
        );
    }

    // Adicionar / remover sessões
    function bindGroupManagement() {
        var addBtn = document.getElementById('ap-add-group-btn');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                var list = document.getElementById('ap-groups-list');
                if (!list) return;
                var newId = _slugify('nova-sessao-' + Date.now());
                var row = document.createElement('div');
                row.className = 'd-flex gap-2 mb-2 align-items-center ap-group-row';
                row.dataset.groupId = newId;
                row.innerHTML =
                    '<span class="badge bg-dark border border-secondary text-secondary font-monospace ap-row-index">—</span>' +
                    '<input type="text" class="form-control form-control-sm bg-dark text-white border-secondary ap-group-label" placeholder="Nome da sessão">' +
                    '<div class="input-group input-group-sm ap-group-icon-wrap">' +
                    '<span class="input-group-text bg-dark border-secondary"><i class="bi bi-grid ap-group-icon-preview"></i></span>' +
                    '<input type="text" class="form-control bg-dark text-white border-secondary font-monospace ap-group-icon" value="bi-grid" placeholder="bi-tools" list="ap-bi-icons">' +
                    '</div>' +
                    '<div class="form-check form-switch mb-0 ap-col-switch ap-col-switch-center" title="Sessão ativa no menu">' +
                    '<input class="form-check-input ap-group-enabled" type="checkbox" role="switch" aria-label="Sessão ativa" checked>' +
                    '</div>' +
                    '<div class="form-check form-switch mb-0 ap-col-switch ap-col-switch-center" title="Destacar sessão no menu (cor laranja)">' +
                    '<input class="form-check-input ap-group-highlight" type="checkbox" role="switch" aria-label="Destacar sessão">' +
                    '</div>' +
                    '<button type="button" class="tc-icon-btn-ds ap-move-up" title="Subir" aria-label="Subir sessão"><i class="bi bi-chevron-up"></i></button>' +
                    '<button type="button" class="tc-icon-btn-ds ap-move-down" title="Descer" aria-label="Descer sessão"><i class="bi bi-chevron-down"></i></button>' +
                    '<button type="button" class="tc-icon-btn-ds tc-action-clear ap-remove-group-btn" title="Remover" aria-label="Remover sessão"><i class="bi bi-trash"></i></button>';
                list.appendChild(row);
                reindexGroupRows();
                syncGroupDeleteLocks();

                var labelInput = row.querySelector('.ap-group-label');
                if (labelInput) {
                    labelInput.focus();
                    labelInput.addEventListener('blur', function () {
                        var slug = _slugify(this.value);
                        if (!slug) return;
                        row.dataset.groupId = slug;
                        _refreshGroupSelects();
                    });
                }
            });
        }

        var listEl = document.getElementById('ap-groups-list');
        if (!listEl) return;
        listEl.addEventListener('click', function (e) {
            var btnRemove = e.target.closest('.ap-remove-group-btn');
            if (btnRemove) {
                if (btnRemove.disabled) return;
                btnRemove.closest('.ap-group-row')?.remove();
                _refreshGroupSelects();
                reindexGroupRows();
                syncGroupDeleteLocks();
                return;
            }
            var up = e.target.closest('.ap-move-up');
            if (up) {
                var row = up.closest('.ap-group-row');
                var prev = row && row.previousElementSibling;
                if (row && prev) row.parentElement.insertBefore(row, prev);
                _refreshGroupSelects();
                reindexGroupRows();
                syncGroupDeleteLocks();
                return;
            }
            var down = e.target.closest('.ap-move-down');
            if (down) {
                var row2 = down.closest('.ap-group-row');
                var next = row2 && row2.nextElementSibling;
                if (row2 && next) row2.parentElement.insertBefore(next, row2);
                _refreshGroupSelects();
                reindexGroupRows();
                syncGroupDeleteLocks();
            }
        });
    }

    function syncGroupDeleteLocks() {
        var counts = {};
        document.querySelectorAll('.ap-modules-list').forEach(function (listEl) {
            var gid = (listEl.dataset.groupId || '').trim();
            var n = listEl.querySelectorAll('.ap-mod-row[data-module]').length;
            counts[gid] = n;
        });
        document.querySelectorAll('#ap-groups-list .ap-group-row').forEach(function (row) {
            var gid = (row.dataset.groupId || '').trim();
            if (!gid) return;
            var hasItems = (counts[gid] || 0) > 0;
            row.dataset.hasItems = hasItems ? '1' : '0';
            var btn = row.querySelector('.ap-remove-group-btn');
            if (!btn) return;
            btn.disabled = hasItems;
            btn.classList.toggle('opacity-50', hasItems);
            btn.title = hasItems ? 'Esta sessão tem itens. Mova/desative os itens antes de remover.' : 'Remover sessão';
        });
    }

    function reindexGroupRows() {
        var i = 0;
        document.querySelectorAll('#ap-groups-list .ap-group-row').forEach(function (row) {
            i++;
            var idx = row.querySelector('.ap-row-index');
            if (idx) idx.textContent = String(i);
        });
    }

    function reindexModuleRows() {
        var wrap = document.getElementById('ap-modules-wrap');
        if (!wrap) return;
        wrap.querySelectorAll('.ap-modules-list').forEach(function (listEl) {
            var i = 0;
            listEl.querySelectorAll('.ap-mod-row[data-module]').forEach(function (row) {
                i++;
                var idx = row.querySelector('.ap-row-index');
                if (idx) idx.textContent = String(i);
            });
        });
    }

    function bindModuleManagement() {
        var wrap = document.getElementById('ap-modules-wrap');
        if (!wrap) return;

        function closeAllMovePops(exceptRow) {
            wrap.querySelectorAll('.ap-mod-move-pop').forEach(function (p) {
                var row = p.closest('.ap-mod-row');
                if (exceptRow && row === exceptRow) return;
                p.classList.add('d-none');
            });
        }

        wrap.addEventListener('click', function (e) {
            var open = e.target.closest('.ap-mod-move-open');
            if (open) {
                var rowOpen = open.closest('.ap-mod-row');
                if (!rowOpen) return;
                var pop = rowOpen.querySelector('.ap-mod-move-pop');
                var selOpen = rowOpen.querySelector('.ap-mod-group');
                if (!pop || !selOpen) return;
                var willOpen = pop.classList.contains('d-none');
                closeAllMovePops(willOpen ? rowOpen : null);
                pop.classList.toggle('d-none');
                if (willOpen) selOpen.focus();
                return;
            }
            var up = e.target.closest('.ap-mod-move-up');
            if (up) {
                var row = up.closest('.ap-mod-row');
                var prev = row && row.previousElementSibling;
                if (row && prev) row.parentElement.insertBefore(row, prev);
                reindexModuleRows();
                return;
            }
            var down = e.target.closest('.ap-mod-move-down');
            if (down) {
                var row2 = down.closest('.ap-mod-row');
                var next = row2 && row2.nextElementSibling;
                if (row2 && next) row2.parentElement.insertBefore(next, row2);
                reindexModuleRows();
            }
        });

        wrap.addEventListener('change', function (e) {
            if (!e.target.classList.contains('ap-mod-group')) return;
            var sel = e.target;
            var row = sel.closest('.ap-mod-row');
            if (!row) return;
            var gid = (sel.value || '').trim();
            var target = wrap.querySelector('.ap-modules-list[data-group-id="' + gid.replace(/"/g, '\\"') + '"]');
            if (!target && gid === '') {
                target = wrap.querySelector('.ap-modules-list[data-group-id=""]');
            }
            if (!target) return;
            target.appendChild(row);
            var pop = row.querySelector('.ap-mod-move-pop');
            if (pop) pop.classList.add('d-none');
            reindexModuleRows();
            syncGroupDeleteLocks();
        });

        document.addEventListener('click', function (e) {
            if (!wrap.contains(e.target)) return;
            if (e.target.closest('.ap-mod-move-pop') || e.target.closest('.ap-mod-move-open')) return;
            closeAllMovePops();
        });
    }

    function bindIconSearch() {
        initBiIconIndex();

        document.addEventListener('focusin', function (e) {
            if (!e.target || !e.target.classList) return;
            if (e.target.classList.contains('ap-group-icon') || e.target.classList.contains('ap-mod-icon')) {
                activeIconInput = e.target;
            }
        });

        var inp = document.getElementById('ap-icon-search');
        var wrap = document.getElementById('ap-icon-results');
        if (!inp || !wrap) return;

        function renderResults(q) {
            var query = (q || '').trim().toLowerCase();
            wrap.innerHTML = '';
            if (!query) return;
            var list = biIconNames || [];
            var shown = 0;
            for (var i = 0; i < list.length; i++) {
                var name = list[i];
                if (name.indexOf(query) === -1) continue;
                shown++;
                if (shown > 40) break;
                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'btn btn-outline-secondary btn-sm px-2 py-1';
                b.dataset.icon = name;
                b.innerHTML =
                    '<i class="bi ' + name + ' me-1"></i><span class="font-monospace small">' + name + '</span>';
                wrap.appendChild(b);
            }
            if (shown === 0) {
                var empty = document.createElement('span');
                empty.className = 'text-secondary small';
                empty.textContent = 'Nenhum ícone encontrado';
                wrap.appendChild(empty);
            }
        }

        inp.addEventListener('input', function () {
            renderResults(inp.value);
        });
        wrap.addEventListener('click', function (e) {
            var btn = e.target.closest('button[data-icon]');
            if (!btn) return;
            var icon = btn.dataset.icon;
            if (!icon) return;
            if (!activeIconInput) {
                showToast('Clique primeiro no campo de ícone (Sessão/Módulo) e depois selecione aqui', true);
                return;
            }
            activeIconInput.value = icon;
            activeIconInput.dispatchEvent(new Event('input', { bubbles: true }));
            activeIconInput.focus();
        });
    }

    // Recria as opções do select de sessão na tabela de módulos
    function _refreshGroupSelects() {
        var groups = collectGroups();
        document.querySelectorAll('.ap-mod-group').forEach(function (sel) {
            var current = sel.value;
            sel.innerHTML = '<option value="">— sem sessão —</option>';
            groups.forEach(function (g) {
                var opt = document.createElement('option');
                opt.value = g.id;
                opt.textContent = g.label;
                if (g.id === current) opt.selected = true;
                sel.appendChild(opt);
            });
        });
    }

    // ── Salva ─────────────────────────────────────────────────────────────────
    function saveSettings(section, btn) {
        console.log('[AdminPainel] save section:', section);
        var hasBtn = !!btn;
        if (hasBtn) {
            btn.disabled = true;
            var orig = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Salvando...';
        }

        var payload;
        if (section === 'modules') payload = { modules: collectModules(), groups: collectGroups() };
        else if (section === 'contracts') payload = { contracts: collectContracts() };
        else if (section === 'permissions') payload = { permissions: collectPermissions() };
        else if (section === 'features')
            payload = { features: collectFeatures(), customFunctions: collectCustomFunctions() };
        else
            payload = {
                groups: collectGroups(),
                modules: collectModules(),
                contracts: collectContracts(),
                permissions: collectPermissions(),
                features: collectFeatures(),
                customFunctions: collectCustomFunctions(),
            };

        console.log('[AdminPainel] POST ->', SAVE_URL, JSON.stringify(payload).slice(0, 150));

        fetch(SAVE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
            .then(function (res) {
                console.log('[AdminPainel] HTTP', res.status);
                return res.text().then(function (text) {
                    console.log('[AdminPainel] body:', text.slice(0, 200));
                    if (!res.ok) {
                        var msg = 'Erro HTTP ' + res.status;
                        try {
                            var j = JSON.parse(text);
                            msg = j.error || msg;
                        } catch (_) {}
                        showToast(msg, true);
                        return;
                    }
                    var data;
                    try {
                        data = JSON.parse(text);
                    } catch (_) {
                        showToast('Resposta inesperada — veja console', true);
                        return;
                    }
                    if (data.ok) {
                        showToast(data.message || 'Configuracoes salvas!');
                        updateUIAfterSave();
                    } else {
                        showToast('Erro: ' + (data.error || 'desconhecido'), true);
                    }
                });
            })
            .catch(function (e) {
                console.error('[AdminPainel] fetch erro:', e);
                showToast('Falha ao comunicar com servidor — veja console', true);
            })
            .finally(function () {
                if (hasBtn) {
                    btn.innerHTML = orig;
                    btn.disabled = false;
                }
            });
    }

    // ── Auto-save (apenas aba Módulos) ────────────────────────────────────────
    var _autoSaveTimer = null;
    var _autoSaveInFlight = false;
    var _autoSaveQueued = false;
    var _lastAutoSavedPayload = '';
    var _autoSaveStatusEl = document.getElementById('ap-autosave-status');

    function setAutoSaveStatus(state, text) {
        if (!_autoSaveStatusEl) return;
        var s = state || 'idle';
        _autoSaveStatusEl.className =
            'badge ' + (s === 'saving' ? 'bg-warning text-dark' : s === 'error' ? 'bg-danger' : 'bg-secondary');
        _autoSaveStatusEl.textContent = text || (s === 'saving' ? 'Salvando…' : s === 'error' ? 'Erro' : 'Auto-save');
    }

    function buildModulesPayloadString() {
        try {
            return JSON.stringify({ modules: collectModules(), groups: collectGroups() });
        } catch (e) {
            return '';
        }
    }

    function runAutoSave() {
        _autoSaveTimer = null;
        if (_autoSaveInFlight) {
            _autoSaveQueued = true;
            return;
        }
        var payloadStr = buildModulesPayloadString();
        if (!payloadStr || payloadStr === _lastAutoSavedPayload) {
            setAutoSaveStatus('idle', 'Auto-save');
            return;
        }
        _autoSaveInFlight = true;
        setAutoSaveStatus('saving', 'Salvando…');

        fetch(SAVE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payloadStr,
        })
            .then(function (res) {
                return res.text().then(function (text) {
                    if (!res.ok) {
                        var msg = 'Erro HTTP ' + res.status;
                        try {
                            var j = JSON.parse(text);
                            msg = j.error || msg;
                        } catch (_) {}
                        setAutoSaveStatus('error', 'Erro');
                        showToast(msg, true);
                        return;
                    }
                    var data;
                    try {
                        data = JSON.parse(text);
                    } catch (_) {
                        setAutoSaveStatus('error', 'Erro');
                        showToast('Resposta inesperada — veja console', true);
                        return;
                    }
                    if (data.ok) {
                        _lastAutoSavedPayload = payloadStr;
                        setAutoSaveStatus('idle', 'Salvo');
                        updateUIAfterSave();
                    } else {
                        setAutoSaveStatus('error', 'Erro');
                        showToast('Erro: ' + (data.error || 'desconhecido'), true);
                    }
                });
            })
            .catch(function (e) {
                console.error('[AdminPainel] auto-save erro:', e);
                setAutoSaveStatus('error', 'Erro');
                showToast('Falha ao comunicar com servidor — veja console', true);
            })
            .finally(function () {
                _autoSaveInFlight = false;
                if (_autoSaveQueued) {
                    _autoSaveQueued = false;
                    scheduleAutoSave();
                }
            });
    }

    function scheduleAutoSave() {
        if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
        setAutoSaveStatus('saving', 'Aguardando…');
        _autoSaveTimer = setTimeout(runAutoSave, 700);
        updateSidebarLivePreview();
        syncModuleGroupBoxesFromGroups();
    }

    function syncModuleGroupBoxesFromGroups() {
        var wrap = document.getElementById('ap-modules-wrap');
        if (!wrap) return;

        var groups = collectGroups().filter(function (g) {
            return g && g.id;
        });

        groups.forEach(function (g) {
            var box = wrap.querySelector(
                '.ap-mod-group-box[data-group-id="' + String(g.id).replace(/"/g, '\\"') + '"]',
            );
            if (!box) return;
            var h6 = box.querySelector('h6');
            if (!h6) return;
            var icon = (g.icon || 'bi-grid').trim();
            var label = (g.label || g.id).trim();
            h6.innerHTML = '<i class="bi ' + icon + ' me-2"></i>' + label;
        });

        var un = wrap.querySelector('.ap-mod-group-box[data-group-id=""]');
        groups.forEach(function (g) {
            var box = wrap.querySelector(
                '.ap-mod-group-box[data-group-id="' + String(g.id).replace(/"/g, '\\"') + '"]',
            );
            if (box) wrap.appendChild(box);
        });
        if (un) wrap.appendChild(un);
    }

    function updateSidebarLivePreview() {
        var dyn = document.getElementById('tc-sidebar-dynamic-groups');
        var ung = document.getElementById('tc-sidebar-ungrouped');
        if (!dyn || !ung) return;

        var isAdmin = !!window.TOKENCAFE_IS_ADMIN;
        var currentPage = '';
        try {
            currentPage = new URL(window.location.href).searchParams.get('page') || '';
            currentPage = (currentPage || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '');
        } catch (_) {}

        function esc(s) {
            return String(s || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getModuleState(cfg) {
            var enabled = cfg.enabled !== false;
            var comingSoon = !!cfg.comingSoon;
            var adminOnly = !!cfg.adminOnly;
            if (isAdmin) {
                if (!enabled || comingSoon) return 'coming-soon';
                if (adminOnly) return 'admin-only';
                return 'active';
            }
            if (!enabled || adminOnly) return null;
            return 'active';
        }

        function getModuleIconHtml(cfg, slug) {
            var icon = (cfg.icon || '').trim();
            var iconType = (cfg.iconType || '').trim() === 'class' ? 'class' : 'bi';
            if (!icon) {
                var fallback =
                    (window.TC_SYSTEM_SETTINGS &&
                        window.TC_SYSTEM_SETTINGS.modules &&
                        window.TC_SYSTEM_SETTINGS.modules[slug] &&
                        window.TC_SYSTEM_SETTINGS.modules[slug].icon) ||
                    'bi-box';
                icon = String(fallback || 'bi-box');
                iconType = icon.indexOf(' ') !== -1 ? 'class' : 'bi';
            }
            if (iconType === 'class') return '<i class="' + esc(icon) + '"></i>';
            return '<i class="bi ' + esc(icon) + '"></i>';
        }

        function renderItem(slug, cfg, isSub, forcedState) {
            var state = getModuleState(cfg);
            if (forcedState) state = forcedState;
            if (state === null) return '';
            var href = 'index.php?page=' + encodeURIComponent(slug);
            var subClass = isSub ? ' tc-nav-sub' : '';
            var active = slug === currentPage ? ' active' : '';
            var iconHtml = getModuleIconHtml(cfg, slug);
            var labelHtml = '<span>' + esc(cfg.label || slug) + '</span>';
            if (state === 'coming-soon') {
                return (
                    '<a href="' +
                    href +
                    '" class="tc-nav-item' +
                    subClass +
                    active +
                    '" style="opacity:.55" title="Em breve">' +
                    iconHtml +
                    labelHtml +
                    '<span class="ms-auto badge bg-secondary" style="font-size:.55rem;padding:.2em .4em">Dev</span></a>'
                );
            }
            if (state === 'admin-only') {
                return (
                    '<a href="' +
                    href +
                    '" class="tc-nav-item' +
                    subClass +
                    active +
                    '">' +
                    iconHtml +
                    labelHtml +
                    '<span class="ms-auto badge bg-primary" style="font-size:.55rem;padding:.2em .4em">ADM</span></a>'
                );
            }
            return (
                '<a href="' + href + '" class="tc-nav-item' + subClass + active + '">' + iconHtml + labelHtml + '</a>'
            );
        }

        var groups = collectGroups().filter(function (g) {
            return g && g.id;
        });

        var modulesBySlug = collectModules();
        try {
            window.TC_SYSTEM_SETTINGS = window.TC_SYSTEM_SETTINGS || {};
            window.TC_SYSTEM_SETTINGS.groups = groups.slice();
            window.TC_SYSTEM_SETTINGS.modules = Object.assign({}, modulesBySlug);
        } catch (_) {}
        var orderByGroup = {};
        document.querySelectorAll('.ap-modules-list').forEach(function (listEl) {
            var gid = (listEl.dataset.groupId || '').trim();
            if (!orderByGroup[gid]) orderByGroup[gid] = [];
            listEl.querySelectorAll('.ap-mod-row[data-module]').forEach(function (row) {
                var slug = row.dataset.module;
                if (slug) orderByGroup[gid].push(slug);
            });
        });

        var dynHtml = '';
        groups.forEach(function (g) {
            var gEnabled = g.enabled !== false;
            var forceComingSoon = !gEnabled && isAdmin;
            if (!gEnabled && !isAdmin) return;
            var gId = String(g.id || '')
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-');
            var domId = 'g-dyn-' + gId;
            var slugs = (orderByGroup[g.id] || []).slice();
            var itemsHtml = '';
            slugs.forEach(function (slug) {
                var cfg = modulesBySlug[slug] || {};
                cfg.group = g.id;
                itemsHtml += renderItem(slug, cfg, true, forceComingSoon ? 'coming-soon' : null);
            });
            if (!itemsHtml) return;
            var open = slugs.indexOf(currentPage) !== -1 ? 'show' : '';
            dynHtml +=
                '<button class="tc-sidebar-group-btn" type="button" data-bs-toggle="collapse" data-bs-target="#' +
                esc(domId) +
                '" aria-expanded="' +
                (open ? 'true' : 'false') +
                '" aria-controls="' +
                esc(domId) +
                '"' +
                (g.highlight ? ' style="color:#f97316"' : forceComingSoon ? ' style="opacity:.55"' : '') +
                '>' +
                '<i class="bi ' +
                esc(g.icon || 'bi-grid') +
                ' tc-sidebar-group-icon"></i>' +
                '<span>' +
                esc(g.label || g.id) +
                '</span>' +
                (forceComingSoon
                    ? '<span class="ms-auto badge bg-secondary" style="font-size:.55rem;padding:.2em .4em">OFF</span>'
                    : '') +
                '<i class="bi bi-chevron-down tc-sidebar-chevron"></i>' +
                '</button>' +
                '<div class="collapse ' +
                open +
                '" id="' +
                esc(domId) +
                '" data-bs-parent="#sidebarAccordion">' +
                itemsHtml +
                '</div>';
        });
        dyn.innerHTML = dynHtml;

        var unHtml = '';
        var unSlugs = (orderByGroup[''] || []).slice();
        unSlugs.forEach(function (slug) {
            if (slug === 'indicar') return;
            var cfg = modulesBySlug[slug] || {};
            cfg.group = '';
            unHtml += renderItem(slug, cfg, false, null);
        });
        ung.innerHTML = unHtml ? '<hr class="my-1 tc-sidebar-hr">' + unHtml : '';
    }

    function bindAutoSaveModules() {
        var tab = document.getElementById('tab-modulos');
        if (!tab) return;

        var initial = buildModulesPayloadString();
        if (initial) _lastAutoSavedPayload = initial;

        tab.addEventListener('input', function (e) {
            var t = e.target;
            if (!t || !t.classList) return;
            if (
                t.classList.contains('ap-group-label') ||
                t.classList.contains('ap-group-icon') ||
                t.classList.contains('ap-mod-label') ||
                t.classList.contains('ap-mod-icon')
            ) {
                scheduleAutoSave();
            }
        });

        tab.addEventListener('change', function (e) {
            var t = e.target;
            if (!t || !t.classList) return;
            if (
                t.classList.contains('ap-group-enabled') ||
                t.classList.contains('ap-group-highlight') ||
                t.classList.contains('ap-mod-toggle') ||
                t.classList.contains('ap-mod-group')
            ) {
                scheduleAutoSave();
            }
        });

        tab.addEventListener('click', function (e) {
            var t = e.target;
            if (
                t.closest('.ap-move-up') ||
                t.closest('.ap-move-down') ||
                t.closest('.ap-remove-group-btn') ||
                t.closest('.ap-mod-move-up') ||
                t.closest('.ap-mod-move-down')
            ) {
                scheduleAutoSave();
            }
        });
    }

    // ── Atualiza badges após salvar ───────────────────────────────────────────
    function updateUIAfterSave() {
        document.querySelectorAll('.ap-feature-toggle').forEach(function (el) {
            var badge = el.closest('.d-flex') && el.closest('.d-flex').querySelector('.ap-feature-badge');
            if (!badge) return;
            badge.textContent = el.checked ? 'ON' : 'OFF';
            badge.className = 'badge ' + (el.checked ? 'bg-success' : 'bg-secondary') + ' ap-feature-badge';
        });
        document.querySelectorAll('.ap-factory-addr').forEach(function (el) {
            var badge = el.closest('tr') && el.closest('tr').querySelector('.badge');
            if (!badge) return;
            var v = el.value.trim();
            badge.className = v ? 'badge bg-success' : 'badge bg-warning text-dark';
            badge.innerHTML = v
                ? '<i class="bi bi-check-circle me-1"></i>OK'
                : '<i class="bi bi-exclamation-triangle me-1"></i>Vazio';
        });
    }

    // ── Carteiras admin ───────────────────────────────────────────────────────
    function bindWalletManagement() {
        var addBtn = document.getElementById('ap-add-wallet-btn');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                var list = document.getElementById('ap-wallets-list');
                if (!list) return;
                var row = document.createElement('div');
                row.className = 'd-flex gap-2 mb-2 ap-wallet-row';
                row.innerHTML =
                    '<input type="text" class="form-control form-control-sm bg-dark text-white border-secondary font-monospace ap-admin-wallet" placeholder="0x..." maxlength="42">' +
                    '<button type="button" class="btn btn-sm btn-outline-danger ap-remove-wallet"><i class="bi bi-x"></i></button>';
                list.appendChild(row);
                var inp = row.querySelector('input');
                if (inp) inp.focus();
                var rmBtn = row.querySelector('.ap-remove-wallet');
                if (rmBtn)
                    rmBtn.addEventListener('click', function () {
                        row.remove();
                    });
            });
        }
        var walletsList = document.getElementById('ap-wallets-list');
        if (walletsList) {
            walletsList.addEventListener('click', function (e) {
                var btn = e.target.closest('.ap-remove-wallet');
                if (btn) {
                    var r = btn.closest('.ap-wallet-row');
                    if (r) r.remove();
                }
            });
        }
    }

    // ── Funções customizadas ──────────────────────────────────────────────────
    function bindCustomFunctions() {
        var addBtn = document.getElementById('ap-add-custom-fn-btn');
        if (addBtn) {
            addBtn.addEventListener('click', function () {
                var empty = document.getElementById('ap-custom-fns-empty');
                if (empty) empty.remove();
                var list = document.getElementById('ap-custom-fns-list');
                if (!list) return;
                var row = document.createElement('div');
                row.className = 'd-flex gap-2 mb-2 ap-custom-fn-row';
                row.innerHTML =
                    '<input type="text" class="form-control form-control-sm bg-dark text-white border-secondary font-monospace" placeholder="chave" data-cf="key">' +
                    '<input type="text" class="form-control form-control-sm bg-dark text-white border-secondary" placeholder="valor" data-cf="value">' +
                    '<input type="text" class="form-control form-control-sm bg-dark text-white border-secondary" placeholder="modulo" data-cf="module" style="max-width:120px">' +
                    '<input type="text" class="form-control form-control-sm bg-dark text-white border-secondary" placeholder="descricao" data-cf="description">' +
                    '<button type="button" class="btn btn-sm btn-outline-danger ap-remove-custom-fn"><i class="bi bi-x"></i></button>';
                list.appendChild(row);
                var inp = row.querySelector('input');
                if (inp) inp.focus();
                var rmBtn = row.querySelector('.ap-remove-custom-fn');
                if (rmBtn)
                    rmBtn.addEventListener('click', function () {
                        row.remove();
                    });
            });
        }
        var cfList = document.getElementById('ap-custom-fns-list');
        if (cfList) {
            cfList.addEventListener('click', function (e) {
                var btn = e.target.closest('.ap-remove-custom-fn');
                if (btn) {
                    var r = btn.closest('.ap-custom-fn-row');
                    if (r) r.remove();
                }
            });
        }
    }

    // ── Feature badges em tempo real ──────────────────────────────────────────
    function bindFeatureBadges() {
        document.querySelectorAll('.ap-feature-toggle').forEach(function (el) {
            el.addEventListener('change', function () {
                var badge = el.closest('.d-flex') && el.closest('.d-flex').querySelector('.ap-feature-badge');
                if (!badge) return;
                badge.textContent = el.checked ? 'ON' : 'OFF';
                badge.className = 'badge ' + (el.checked ? 'bg-success' : 'bg-secondary') + ' ap-feature-badge';
            });
        });
    }

    // ── Guard campo perigoso ──────────────────────────────────────────────────
    function guardDangerousFields() {
        var el = document.getElementById('ap-disable-barriers');
        if (el) {
            el.addEventListener('change', function () {
                if (
                    this.checked &&
                    !confirm('ATENCAO: Desativar barreiras admin permite acesso irrestrito.\n\nTem certeza?')
                ) {
                    this.checked = false;
                }
            });
        }
    }

    // ── Valida enderecos ETH ──────────────────────────────────────────────────
    function bindEthValidation() {
        var ethRe = /^0x[0-9a-fA-F]{40}$/;
        function attach(el) {
            if (!el) return;
            el.addEventListener('input', function () {
                var v = el.value.trim();
                el.classList.toggle('is-invalid', v !== '' && !ethRe.test(v));
                el.classList.toggle('is-valid', v !== '' && ethRe.test(v));
            });
        }
        attach(document.getElementById('ap-platform-wallet'));
        attach(document.getElementById('ap-chief-admin'));
        document.querySelectorAll('.ap-factory-addr, .ap-admin-wallet').forEach(attach);
    }

    // ── Bind botões de salvar ─────────────────────────────────────────────────
    function bindSaveButtons() {
        var btns = document.querySelectorAll('.ap-save-btn');
        console.log('[AdminPainel] botoes save encontrados:', btns.length);
        btns.forEach(function (btn) {
            btn.addEventListener('click', function () {
                saveSettings(btn.dataset.section, btn);
            });
        });
    }

    // ── Coleta API keys (apenas campos preenchidos) ───────────────────────────
    function collectApiKeys() {
        var keys = {};
        document.querySelectorAll('.ap-api-key-input').forEach(function (el) {
            var keyName = (el.dataset.keyName || '').trim();
            var value = (el.value || '').trim();
            if (keyName && value) {
                keys[keyName] = value;
            }
        });
        return keys;
    }

    // ── Toggle visibilidade dos campos de API key ─────────────────────────────
    function bindApiKeyVisibility() {
        document.addEventListener('click', function (e) {
            var btn = e.target.closest('.ap-toggle-key-visibility');
            if (!btn) return;
            var group = btn.closest('.input-group');
            if (!group) return;
            var inp = group.querySelector('.ap-api-key-input');
            if (!inp) return;
            var isPassword = inp.type === 'password';
            inp.type = isPassword ? 'text' : 'password';
            var icon = btn.querySelector('i');
            if (icon) {
                icon.className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
            }
        });
    }

    // ── Salva API keys no endpoint separado ──────────────────────────────────
    function bindSaveApiKeys() {
        var btn = document.getElementById('ap-save-api-keys-btn');
        if (!btn) return;

        // URL do endpoint: mesma base do save-settings, trocando o arquivo
        var apiKeysUrl = SAVE_URL.replace('save-settings.php', 'save-api-keys.php');

        btn.addEventListener('click', function () {
            var keys = collectApiKeys();
            if (Object.keys(keys).length === 0) {
                showToast('Nenhuma chave preenchida — preencha ao menos um campo para salvar', true);
                return;
            }

            btn.disabled = true;
            var orig = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status"></span>Salvando...';

            fetch(apiKeysUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keys: keys }),
            })
                .then(function (res) {
                    return res.text().then(function (text) {
                        if (!res.ok) {
                            var msg = 'Erro HTTP ' + res.status;
                            try {
                                var j = JSON.parse(text);
                                msg = j.error || msg;
                            } catch (_) {}
                            showToast(msg, true);
                            return;
                        }
                        var data;
                        try {
                            data = JSON.parse(text);
                        } catch (_) {
                            showToast('Resposta inesperada do servidor', true);
                            return;
                        }
                        if (data.ok) {
                            showToast(data.message || 'Chaves de API salvas!');
                            // Limpa os campos após salvar com sucesso
                            document.querySelectorAll('.ap-api-key-input').forEach(function (el) {
                                el.value = '';
                                el.type = 'password';
                                var icon =
                                    el.closest('.input-group') &&
                                    el.closest('.input-group').querySelector('.ap-toggle-key-visibility i');
                                if (icon) icon.className = 'bi bi-eye';
                            });
                            // Atualiza badges de status: campos que tinham valor → Configurada
                            Object.keys(keys).forEach(function (keyName) {
                                var inp = document.getElementById('ap-key-' + keyName);
                                if (!inp) return;
                                // O badge está no div.d-flex irmão-anterior ao input-group
                                var section = inp.closest('.input-group') && inp.closest('.input-group').parentElement;
                                var badge = section && section.querySelector('.tc-status-text');
                                if (badge) {
                                    badge.className = 'badge bg-success tc-status-text';
                                    badge.innerHTML = '<i class="bi bi-check-circle me-1"></i>Configurada';
                                }
                            });
                        } else {
                            showToast('Erro: ' + (data.error || 'desconhecido'), true);
                        }
                    });
                })
                .catch(function (e) {
                    console.error('[AdminPainel] save-api-keys erro:', e);
                    showToast('Falha ao comunicar com servidor', true);
                })
                .finally(function () {
                    btn.innerHTML = orig;
                    btn.disabled = false;
                });
        });
    }

    // ── Init ──────────────────────────────────────────────────────────────────
    bindModuleRowLogic();
    bindSaveButtons();
    bindWalletManagement();
    bindCustomFunctions();
    bindFeatureBadges();
    guardDangerousFields();
    bindEthValidation();
    bindGroupManagement();
    bindGroupIconPreview();
    bindModuleIconPreview();
    bindIconSearch();
    reindexGroupRows();
    bindModuleManagement();
    reindexModuleRows();
    syncGroupDeleteLocks();
    bindAutoSaveModules();
    bindApiKeyVisibility();
    bindSaveApiKeys();
    syncModuleGroupBoxesFromGroups();
    updateSidebarLivePreview();

    console.log('[AdminPainel] inicializado. URL:', SAVE_URL);
})(); // IIFE — escopo isolado, sem poluição de globals
