/**
 * relatorios-ui.js — Interface da tabela de relatórios de acesso
 *
 * Lê os dados de window.RELATORIOS_IS_CHIEF e
 * window.RELATORIOS_VERIFIED_CONTRACTS injetados pelo PHP.
 */
(function () {
    'use strict';

    // Dados leves (sempre disponíveis) + dados pesados (lazy, lidos ao "Carregar")
    var data = []; // populado quando usuário clica em "Carregar Relatório"
    var dataLoaded = false;
    var isChief = window.RELATORIOS_IS_CHIEF || false;
    var activeWallet = String(window.RELATORIOS_ACTIVE_WALLET || '')
        .toLowerCase()
        .trim();
    var verifiedContracts = window.RELATORIOS_VERIFIED_CONTRACTS || {};
    var startDate = window.RELATORIOS_START_DATE || '';
    var endDate = window.RELATORIOS_END_DATE || '';
    var dashboard = window.RELATORIOS_DASHBOARD || null;
    // Dados históricos da carteira — injetados pelo PHP para resolver filtro "Pendentes" mostrando 0
    // Por quê: allTableWindow (data) só tem o período selecionado; estes têm todo o histórico
    var walletDeployRows = window.WALLET_DEPLOY_ROWS || [];
    var walletAllVerified = window.WALLET_ALL_VERIFIED || {};
    var selectedTopPages = [];
    var selectedWallet = '';
    var selectedActionTypes = [];
    var mainSelected = [];
    var mainVisible = {};
    var selectedWallets = [];
    var trendZoom = 1;
    var trendZoomMin = 1;
    var trendZoomMax = 6;
    var trendZoomStep = 0.25;
    var trendViewStart = 0;
    var trendViewEnd = 0;

    // ── Controle de paginação e filtro de tipo (KPI interativo) ──────────────
    var pageSize = 10;
    var cur = 1;
    var sortKey = null;
    var sortDir = 1;
    var kpiFilter = null; // "ip" | "sc" | null — controlado pelos cards de KPI
    // Modo do filtro de registros: 'all' | 'deploys' | 'views'
    // Por quê: o usuário quer separar "contratos que criei" de "contratos que visualizei"
    // sem misturar com o filtro do gráfico (kpiFilter)
    var tableFilterMode = 'all';

    var tBody = document.getElementById('visitsRows');
    var pager = document.getElementById('visitsPager');
    var wrap = document.getElementById('visitsPagerWrap');
    var info = document.getElementById('visitsCountInfo');

    // ── Utilitários ───────────────────────────────────────────────────

    var EXPLORER_MAP = {
        1: 'https://etherscan.io/address/',
        56: 'https://bscscan.com/address/',
        97: 'https://testnet.bscscan.com/address/',
        137: 'https://polygonscan.com/address/',
        43114: 'https://snowtrace.io/address/',
        42161: 'https://arbiscan.io/address/',
        10: 'https://optimistic.etherscan.io/address/',
        8453: 'https://basescan.org/address/',
        11155111: 'https://sepolia.etherscan.io/address/',
        80001: 'https://mumbai.polygonscan.com/address/',
    };

    function explorerContractUrl(addr, chainId) {
        var base = EXPLORER_MAP[String(chainId)] || EXPLORER_MAP['1'];
        return base + encodeURIComponent(addr);
    }

    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    function pageLabel(key) {
        var k = String(key || '');
        return k === 'index.php' ? 'home' : k;
    }

    function pageChip(key) {
        return '<span class="pg-chip tc-pill-chip">' + esc(pageLabel(key)) + '</span>';
    }

    function strHash(s) {
        var x = 0;
        var t = String(s || '');
        for (var i = 0; i < t.length; i++) x = (x * 31 + t.charCodeAt(i)) >>> 0;
        return x >>> 0;
    }

    function chainLabel(chainId) {
        var c = String(chainId || '').trim();
        var n = 0;
        try {
            n = c.toLowerCase().startsWith('0x') ? parseInt(c, 16) || 0 : parseInt(c, 10) || 0;
        } catch (_) {
            n = 0;
        }
        var map = {
            1: 'Ethereum',
            56: 'BSC',
            97: 'BSC Testnet',
            137: 'Polygon',
            43114: 'Avalanche',
            42161: 'Arbitrum',
            10: 'Optimism',
            8453: 'Base',
            11155111: 'Sepolia',
            80001: 'Mumbai',
        };
        return map[n] ? map[n] + ' (' + String(n) + ')' : c ? 'Chain ' + c : '—';
    }

    function pageChipColored(pageKey) {
        var p = String(pageKey || '');
        var idx = pageIndexOf(p, strHash(p));
        var c = pagePalette(idx);
        return (
            '<span class=\"pg-chip tc-pill-chip\" style=\"background:' +
            hexToRgba(c, 0.14) +
            ';border:1px solid ' +
            hexToRgba(c, 0.35) +
            ';color:rgba(255,255,255,0.92)\">' +
            esc(pageLabel(p)) +
            '</span>'
        );
    }

    // Retorna badge com cor e ícone baseado na action do log
    // Por quê: distinguir visualmente "criação" (deploy) de "visualização" para o usuário
    function actionBadge(action, page) {
        var a = String(action || '')
            .toLowerCase()
            .trim();
        var p = String(page || '')
            .toLowerCase()
            .trim();
        // Prioridade: action explícita
        if (a === 'deploy' || p === 'contrato_criado' || p === 'contrato-deploy') {
            return '<span class="tc-action-badge tc-action-badge--deploy">&#128296; Deploy</span>';
        }
        if (a === 'verify_ok' || p === 'contrato_verificado') {
            return '<span class="tc-action-badge tc-action-badge--verify">&#10003; Verificado</span>';
        }
        if (a === 'verify_fail' || p === 'contrato_nao_verificado') {
            return '<span class="tc-action-badge tc-action-badge--fail">&#10007; N&#227;o verificado</span>';
        }
        if (a === 'view_contract' || p === 'contrato-detalhes') {
            return '<span class="tc-action-badge tc-action-badge--view">&#128065; Detalhes</span>';
        }
        if (a === 'contrato' || p === 'contrato') {
            return '<span class="tc-action-badge tc-action-badge--view">&#128065; Contrato</span>';
        }
        if (a === 'wallet' || p === 'wallet') {
            return '<span class="tc-action-badge tc-action-badge--wallet">&#128179; Wallet</span>';
        }
        if (a === 'rpc' || p === 'rpc') {
            return '<span class="tc-action-badge tc-action-badge--rpc">&#128279; RPC</span>';
        }
        if (a === 'tools' || p === 'tools') {
            return '<span class="tc-action-badge tc-action-badge--tools">&#128295; Tools</span>';
        }
        if (a === 'logs' || p === 'logs') {
            return '<span class="tc-action-badge tc-action-badge--logs">&#128202; Logs</span>';
        }
        // Fallback: mostra chip genérico
        var lbl = a || pageLabel(p);
        return '<span class="pg-chip tc-pill-chip">' + esc(lbl) + '</span>';
    }

    function pageChipCount(key, count) {
        return (
            '<span class="pg-chip tc-pill-chip">' +
            esc(pageLabel(key)) +
            ' <span class="pg-chip-count">(' +
            esc(String(count || 0)) +
            ')</span></span>'
        );
    }

    function formatLocal(dateStr, timeStr) {
        try {
            var d = String(dateStr || '').trim();
            var t = String(timeStr || '').trim();
            if (!d || !t) return (d + ' ' + t).trim();
            var dt = new Date(d + 'T' + t + 'Z');
            if (isNaN(dt.getTime())) return (d + ' ' + t).trim();
            return dt.toLocaleString('pt-BR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            });
        } catch (_) {
            return (String(dateStr || '') + ' ' + String(timeStr || '')).trim();
        }
    }

    // ── Fonte de dados ativa ─────────────────────────────────────────
    // Por quê: para modos 'deploys'/'pending'/'verified' usamos o histórico completo
    // da carteira (walletDeployRows) em vez do período limitado (data).
    // Contratos deployados antes do período selecionado só existem em walletDeployRows.
    function getActiveData() {
        if (tableFilterMode === 'deploys' || tableFilterMode === 'pending' || tableFilterMode === 'verified') {
            return walletDeployRows.length ? walletDeployRows : data;
        }
        return data;
    }

    // ── Filtro ────────────────────────────────────────────────────────

    function applyTableFilter(sourceData) {
        var rows = sourceData !== undefined ? sourceData : data;
        var ip = String(document.getElementById('qfIp')?.value || '')
            .toLowerCase()
            .trim();
        var w = String(document.getElementById('qfWallet')?.value || '')
            .toLowerCase()
            .trim();
        var ch = String(document.getElementById('qfChain')?.value || '')
            .toLowerCase()
            .trim();
        var ct = String(document.getElementById('fltContractQuery')?.value || '')
            .toLowerCase()
            .trim();
        var type = kpiFilter; // "ip", "sc" ou null

        return rows.filter(function (r) {
            if (
                activeWallet &&
                String(r.wallet || '')
                    .toLowerCase()
                    .trim() !== activeWallet
            )
                return false;
            if (selectedTopPages.length) {
                var rp = String(r.page || '');
                var ok = false;
                for (var i = 0; i < selectedTopPages.length; i++) {
                    if (String(selectedTopPages[i] || '') === rp) {
                        ok = true;
                        break;
                    }
                }
                if (!ok) return false;
            }
            if (isChief && ip && String(r.ip || '').toLowerCase() !== ip) return false;
            if (w && String(r.wallet || '').toLowerCase() !== w) return false;
            if (
                ch &&
                String(r.chain || '')
                    .toLowerCase()
                    .trim() !== ch
            )
                return false;
            if (ct) {
                var rc = String(r.contract || '').toLowerCase();
                if (!rc || rc.indexOf(ct) === -1) return false;
            }
            // Filtro por modo do KPI da carteira: deploys / verified / pending / views
            // Por quê: os cards de "Sua Carteira" controlam o que aparece na tabela
            if (tableFilterMode !== 'all') {
                var act = String(r.action || '')
                    .toLowerCase()
                    .trim();
                var pg = String(r.page || '')
                    .toLowerCase()
                    .trim();
                var isSc =
                    String(r.type || '')
                        .toLowerCase()
                        .trim() === 'sc';
                // Usa rct (row contract) para não sobrescrever ct (filtro do input fltContractQuery via hoisting de var)
                var rct = String(r.contract || '')
                    .toLowerCase()
                    .trim();
                var isDep =
                    isSc &&
                    (act === 'deploy' ||
                        pg === 'contrato_criado' ||
                        pg === 'contrato-deploy' ||
                        pg.includes('contrato_criado'));
                // Para pending/verified: usa walletAllVerified (todo o histórico), não só o período
                var verifyMap =
                    tableFilterMode === 'pending' || tableFilterMode === 'verified'
                        ? walletAllVerified
                        : verifiedContracts;
                var isVerif = !!verifyMap[rct];
                if (tableFilterMode === 'deploys' && !isDep) return false;
                if (tableFilterMode === 'verified' && (!isDep || !isVerif)) return false;
                if (tableFilterMode === 'pending' && (!isDep || isVerif)) return false;
                if (tableFilterMode === 'views' && isDep) return false;
            }
            return true;
        });
    }

    // ── Ordenação ─────────────────────────────────────────────────────

    function sortRows(rows) {
        if (!sortKey) return rows;
        var k = sortKey,
            dir = sortDir;
        return rows.slice().sort(function (a, b) {
            if (k === 'when') {
                var wa = (String(a.date || '') + ' ' + String(a.time || '')).trim();
                var wb = (String(b.date || '') + ' ' + String(b.time || '')).trim();
                var c = wa.localeCompare(wb);
                return c !== 0 ? dir * c : dir * String(a.chain || '').localeCompare(String(b.chain || ''));
            }
            return dir * (a[k] || '').toString().localeCompare((b[k] || '').toString());
        });
    }

    // ── Renderização de página ─────────────────────────────────────────

    function renderPage(n) {
        cur = n;
        var rows = sortRows(applyTableFilter(getActiveData()));
        var uniqWallets = [];
        rows.forEach(function (r) {
            var w0 = String(r.wallet || '')
                .toLowerCase()
                .trim();
            if (w0 && uniqWallets.indexOf(w0) < 0) uniqWallets.push(w0);
        });

        var showWalletCol = uniqWallets.length > 1;

        var thWallet = document.querySelector('th[data-sort=\"wallet\"]');
        if (thWallet) thWallet.style.display = showWalletCol ? '' : 'none';

        var total = rows.length;
        var start = (cur - 1) * pageSize;
        var end = Math.min(start + pageSize, total);
        var slice = rows.slice(start, end);
        var html = '';
        var colCount = 3 + (showWalletCol ? 1 : 0);

        if (!slice.length) {
            var emptyMsg = 'Sem registros.';
            if (tableFilterMode === 'deploys')
                emptyMsg = '&#128640; Nenhum deploy encontrado no histórico desta carteira.';
            if (tableFilterMode === 'verified')
                emptyMsg = '&#10003; Nenhum contrato verificado no histórico desta carteira.';
            if (tableFilterMode === 'pending')
                emptyMsg = '&#9203; Nenhum contrato pendente — todos foram verificados ou não há deploys registrados.';
            if (tableFilterMode === 'views')
                emptyMsg = '&#128065; Nenhuma visualização encontrada no período selecionado.';
            html =
                '<tr><td colspan="' +
                String(colCount) +
                '" class="text-white-50 text-center py-3">' +
                emptyMsg +
                '</td></tr>';
        } else {
            slice.forEach(function (r) {
                var w = esc(r.wallet || '');
                var ctt = esc(r.contract || '');
                var cttRaw = String(r.contract || '')
                    .toLowerCase()
                    .trim();
                var whenTop = esc(formatLocal(r.date || '', r.time || ''));

                var whenHtml = '<div class="text-nowrap">' + whenTop + '</div>';

                var wHtml = '<div class="tc-break-all tc-lh-11">' + w + '</div>';
                var rAction = String(r.action || '')
                    .toLowerCase()
                    .trim();
                var rPage = String(r.page || '')
                    .toLowerCase()
                    .trim();
                var isDeployRow =
                    String(r.type || '')
                        .toLowerCase()
                        .trim() === 'sc' &&
                    (rAction === 'deploy' || rPage === 'contrato_criado' || rPage === 'contrato-deploy');

                var cHtml = '';
                if (ctt) {
                    var chainNum = 1;
                    try {
                        var chRaw = String(r.chain || '')
                            .trim()
                            .toLowerCase();
                        chainNum = chRaw.startsWith('0x') ? parseInt(chRaw, 16) || 1 : parseInt(chRaw, 10) || 1;
                    } catch (_) {}
                    var addr = String(r.contract || '').trim();
                    var hrefDetails = explorerContractUrl(addr, chainNum);
                    var ok = !!verifiedContracts[cttRaw];
                    var linkClass = ok
                        ? 'tc-contract-link tc-contract-link--ok'
                        : 'tc-contract-link tc-contract-link--bad';
                    // Tooltip para linhas de deploy: explica que o creator on-chain é a carteira da plataforma
                    // Por quê: usuários ficam confusos ao ver endereço diferente no explorer
                    var titleAttr = isDeployRow
                        ? ' title="Contrato criado por você via plataforma. No explorer, o \'Contract Creator\' exibe a carteira implantadora da plataforma, não sua carteira pessoal — isso é normal."'
                        : '';
                    cHtml =
                        '<a href="' +
                        hrefDetails +
                        '" target="_blank" rel="noopener" class="' +
                        linkClass +
                        ' tc-break-all tc-lh-11"' +
                        titleAttr +
                        '>' +
                        ctt +
                        '</a>';
                }

                html +=
                    '<tr' +
                    (isDeployRow ? ' class="tc-row-deploy"' : '') +
                    '>' +
                    '<td>' +
                    whenHtml +
                    '</td>' +
                    (showWalletCol ? '<td>' + wHtml + '</td>' : '') +
                    '<td>' +
                    cHtml +
                    '</td>' +
                    '<td class="text-end tc-w-160 text-nowrap">' +
                    pageChipColored(r.page || '') +
                    '</td>' +
                    '</tr>';
            });
        }

        tBody.innerHTML = html;

        var shownFrom = total ? start + 1 : 0;
        var shownTo = total ? end : 0;
        if (info) info.textContent = 'Mostrando ' + shownFrom + '–' + shownTo + ' de ' + total;

        var pages = Math.ceil(total / pageSize);
        if (pages > 1) {
            pager.classList.remove('d-none');
            var phtml = '';
            var maxBtns = Math.min(8, pages);
            var startBtn = Math.max(1, Math.min(cur - 3, pages - maxBtns + 1));
            for (var i = 0; i < maxBtns; i++) {
                var idx = startBtn + i;
                phtml +=
                    '<button class="btn btn-outline-secondary ' +
                    (idx === cur ? 'active' : '') +
                    '" data-pg="' +
                    idx +
                    '">' +
                    idx +
                    '</button>';
            }
            pager.innerHTML = phtml;
            pager.querySelectorAll('button[data-pg]').forEach(function (b) {
                b.addEventListener('click', function () {
                    var nn = parseInt(b.getAttribute('data-pg'), 10);
                    if (Number.isFinite(nn)) renderPage(nn);
                });
            });
        } else {
            pager.classList.add('d-none');
            pager.innerHTML = '';
        }
    }

    // ── Chips de KPI e top-pages ──────────────────────────────────────

    function renderKpiChips() {
        try {
            document.querySelectorAll('.tc-top-page').forEach(function (el) {
                var p = String(el.getAttribute('data-top-page') || '');
                var c = String(el.getAttribute('data-top-count') || '0');
                el.innerHTML = pageChipCount(p, c);
            });
            document.querySelectorAll('.tc-kpi-chip').forEach(function (el) {
                var k = String(el.getAttribute('data-kpi') || '');
                var v = String(el.getAttribute('data-val') || '');
                el.innerHTML = pageChipCount(k, v);
            });
        } catch (_) {}
    }

    // ── KPI cards interativos — clique filtra tabela por tipo ────────────────

    function ensureInArray(arr, v) {
        var s = String(v || '');
        if (!s) return arr;
        if (arr.indexOf(s) >= 0) return arr;
        return arr.concat([s]);
    }

    function removeFromArray(arr, v) {
        var s = String(v || '');
        return (arr || []).filter(function (x) {
            return String(x || '') !== s;
        });
    }

    function toggleInArray(arr, v) {
        var s = String(v || '');
        if (!s) return arr;
        return arr.indexOf(s) >= 0 ? removeFromArray(arr, s) : ensureInArray(arr, s);
    }

    function seriesColor(key, idx) {
        var k = String(key || '');
        if (k === 'visits') return '#60a5fa';
        if (k === 'actions') return '#4ade80';
        if (k === 'uniqueIp') return 'rgba(226,232,240,0.92)';
        if (k === 'uniquePages') return 'rgba(255,230,160,0.92)';
        if (k.startsWith('wallet:')) {
            var w = k.slice('wallet:'.length);
            return walletPalette(walletIndexOf(w, idx));
        }
        if (k.startsWith('page:')) {
            var parts = k.split(':');
            var page = parts[1] || '';
            var metric = parts[2] || 'total';
            var base = pagePalette(pageIndexOf(page, idx));
            if (metric === 'visits') return shadeHex(base, 10);
            if (metric === 'actions') return shadeHex(base, -18);
            return base;
        }
        if (k.startsWith('action:')) {
            var a = k.slice('action:'.length);
            return actionPalette(actionIndexOfType(a, idx));
        }
        return '#94a3b8';
    }

    function seriesLabel(key) {
        var k = String(key || '');
        if (k === 'visits') return 'Visitas';
        if (k === 'actions') return 'Ações';
        if (k === 'uniqueIp') return 'IPs únicos';
        if (k === 'uniquePages') return 'Páginas';
        if (k.startsWith('wallet:')) return shortWallet(k.slice('wallet:'.length));
        if (k.startsWith('page:')) {
            var parts = k.split(':');
            var page = toPageLabel(parts[1] || '');
            var metric = parts[2] || 'total';
            if (metric === 'visits') return page + ' visitas';
            if (metric === 'actions') return page + ' ações';
            return page + ' total';
        }
        if (k.startsWith('action:')) {
            var a = k.slice('action:'.length);
            var top = dashboard?.actions?.top || [];
            for (var i = 0; i < top.length; i++) {
                if (String(top[i]?.action || '') === a) return String(top[i]?.label || a);
            }
            return a;
        }
        return k;
    }

    function getTrendBase() {
        var baseIp = dashboard?.series?.ip || [];
        var baseSc = dashboard?.series?.sc || [];
        if (selectedTopPages.length) {
            var sumIp = new Array(baseIp.length).fill(0);
            var sumSc = new Array(baseSc.length).fill(0);
            selectedTopPages.forEach(function (p) {
                var s = dashboard?.byPage?.[p] || null;
                if (!s) return;
                var aIp = s.ip || [];
                var aSc = s.sc || [];
                for (var i = 0; i < sumIp.length; i++) sumIp[i] += Number(aIp[i] || 0);
                for (var j = 0; j < sumSc.length; j++) sumSc[j] += Number(aSc[j] || 0);
            });
            return { ip: sumIp, sc: sumSc };
        }
        return { ip: baseIp, sc: baseSc };
    }

    function getSeriesValues(seriesKey) {
        var k = String(seriesKey || '');
        var labels = dashboard?.labels || [];
        var n = labels.length || 0;
        if (!n) return [];

        if (k === 'visits') return (getTrendBase().ip || []).slice();
        if (k === 'actions') return (getTrendBase().sc || []).slice();
        if (k === 'uniqueIp') return (dashboard?.kpiSeries?.uniqueIp || new Array(n).fill(0)).slice();
        if (k === 'uniquePages') return (dashboard?.kpiSeries?.uniquePages || new Array(n).fill(0)).slice();

        if (k.startsWith('page:')) {
            var parts = k.split(':');
            var page = parts[1] || '';
            var metric = parts[2] || 'total';
            var s = dashboard?.byPage?.[page] || null;
            if (!s) return new Array(n).fill(0);
            var ip = (s.ip || new Array(n).fill(0)).slice();
            var sc = (s.sc || new Array(n).fill(0)).slice();
            if (metric === 'visits') return ip;
            if (metric === 'actions') return sc;
            for (var i0 = 0; i0 < n; i0++) ip[i0] = Number(ip[i0] || 0) + Number(sc[i0] || 0);
            return ip;
        }

        if (k.startsWith('wallet:')) {
            var w = k.slice('wallet:'.length);
            return walletSeriesFor(w).slice();
        }
        if (k.startsWith('action:')) {
            var a = k.slice('action:'.length);
            return actionSeriesFor(a).slice();
        }
        return new Array(n).fill(0);
    }

    function getMainSeriesKeys() {
        var hasVisitsSel = mainSelected.indexOf('visits') >= 0;
        var hasActionsSel = mainSelected.indexOf('actions') >= 0;
        var defaultMetrics = !hasVisitsSel && !hasActionsSel;

        var keys = mainSelected.slice().filter(function (k) {
            return k !== 'wallets' && k !== 'visits' && k !== 'actions';
        });

        if (selectedTopPages.length) {
            var wantVisits = defaultMetrics || hasVisitsSel;
            var wantActions = defaultMetrics || hasActionsSel;
            selectedTopPages.forEach(function (p) {
                if (wantVisits && wantActions) keys = ensureInArray(keys, 'page:' + String(p) + ':total');
                else if (wantVisits) keys = ensureInArray(keys, 'page:' + String(p) + ':visits');
                else if (wantActions) keys = ensureInArray(keys, 'page:' + String(p) + ':actions');
            });
        } else {
            if (defaultMetrics || hasVisitsSel) keys = ensureInArray(keys, 'visits');
            if (defaultMetrics || hasActionsSel) keys = ensureInArray(keys, 'actions');
        }

        if (!keys.length) {
            if (selectedActionTypes.length) {
                keys = (dashboard?.actions?.top || [])
                    .map(function (t) {
                        return 'action:' + String(t?.action || '');
                    })
                    .filter(function (x) {
                        return x !== 'action:';
                    });
            } else {
                keys = ['visits', 'actions'];
            }
        }

        selectedActionTypes.forEach(function (a) {
            keys = ensureInArray(keys, 'action:' + String(a));
        });

        if (mainSelected.indexOf('wallets') >= 0) {
            var w = selectedWallets.length ? selectedWallets.slice() : (dashboard?.wallets?.top || []).slice();
            w.forEach(function (addr) {
                keys = ensureInArray(keys, 'wallet:' + String(addr));
            });
        }

        return keys;
    }

    function renderTrendLegend(keys) {
        var el = document.getElementById('tcTrendLegend');
        if (!el) return;
        if (!keys.length) {
            el.innerHTML = '';
            return;
        }

        var html = keys
            .map(function (k, idx) {
                var visible = mainVisible[k] !== false;
                var c = seriesColor(k, idx);
                var border = visible ? c : 'rgba(255,255,255,0.08)';
                var bg = visible ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)';
                if (visible && String(c).startsWith('#')) bg = hexToRgba(c, 0.1);
                return (
                    '<div class="d-flex align-items-center gap-2 mb-1 tc-main-legend" role="button" tabindex="0" data-series="' +
                    esc(k) +
                    '" style="cursor:pointer;background:' +
                    bg +
                    ';border:1px solid ' +
                    border +
                    ';border-radius:10px;padding:4px 10px">' +
                    '<span style="color:' +
                    c +
                    ';margin-right:6px">●</span>' +
                    '<span class="text-truncate" style="flex:1;min-width:0">' +
                    esc(seriesLabel(k)) +
                    '</span>' +
                    '</div>'
                );
            })
            .join('');

        el.innerHTML = html;
        el.querySelectorAll('.tc-main-legend[data-series]').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var k = String(chip.getAttribute('data-series') || '');
                if (!k) return;
                mainVisible[k] = mainVisible[k] === false ? true : false;
                var allHidden = true;
                keys.forEach(function (kk) {
                    if (mainVisible[kk] !== false) allHidden = false;
                });
                if (allHidden)
                    keys.forEach(function (kk) {
                        mainVisible[kk] = true;
                    });
                renderMainChart();
            });
            chip.addEventListener('keydown', function (ev) {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                chip.click();
            });
        });
    }

    function formatTrendAxisLabel(label) {
        var s = String(label || '');
        return s.length >= 6 ? s.slice(5) : s;
    }

    function updateTrendAxisLabels(labels, startIdx, endIdx) {
        try {
            var leftEl = document.getElementById('tcTrendLblLeft');
            var midEl = document.getElementById('tcTrendLblMid');
            var rightEl = document.getElementById('tcTrendLblRight');
            if (!leftEl && !midEl && !rightEl) return;

            var n = (labels || []).length || 0;
            if (!n) return;
            var s = Math.max(0, Math.min(n - 1, Number(startIdx || 0) || 0));
            var e = Math.max(s, Math.min(n - 1, Number(endIdx || 0) || 0));
            var m = Math.floor((s + e) / 2);

            if (leftEl) {
                leftEl.textContent = formatTrendAxisLabel(labels[s] || '');
                leftEl.title = String(labels[s] || '');
            }
            if (rightEl) {
                rightEl.textContent = formatTrendAxisLabel(labels[e] || '');
                rightEl.title = String(labels[e] || '');
            }
            if (midEl) {
                var showMid = e - s >= 4;
                if (showMid) {
                    midEl.classList.remove('d-none');
                    midEl.textContent = formatTrendAxisLabel(labels[m] || '');
                    midEl.title = String(labels[m] || '');
                } else {
                    midEl.classList.add('d-none');
                    midEl.textContent = '';
                    midEl.title = '';
                }
            }
        } catch (_) {}
    }

    function renderMainChart() {
        var svg = document.getElementById('tcTrendSvg');
        var seriesG = document.getElementById('tcTrendSeries');
        if (!svg || !seriesG || !dashboard?.labels?.length) return;

        var labels = dashboard?.labels || [];
        var nFull = labels.length || 0;
        if (!nFull) return;
        if (trendViewEnd <= 0) trendViewEnd = nFull - 1;
        var winStart = trendZoom > 1 ? Math.max(0, Math.min(nFull - 1, trendViewStart)) : 0;
        var winEnd = trendZoom > 1 ? Math.max(winStart, Math.min(nFull - 1, trendViewEnd)) : nFull - 1;

        var keys = getMainSeriesKeys();
        keys.forEach(function (k) {
            if (mainVisible[k] !== undefined) return;
            if (String(k || '').startsWith('action:') && selectedActionTypes.length) {
                var ak = String(k || '').slice('action:'.length);
                mainVisible[k] = selectedActionTypes.indexOf(ak) >= 0;
            } else {
                mainVisible[k] = true;
            }
        });
        renderTrendLegend(keys);

        while (seriesG.firstChild) seriesG.removeChild(seriesG.firstChild);

        var W = parseInt(dashboard?.svg?.w || 400, 10) || 400;
        var H = parseInt(dashboard?.svg?.h || 60, 10) || 60;

        var maxVal = 0;
        var seriesValues = {};
        var hasAnyValue = false;
        keys.forEach(function (k) {
            if (mainVisible[k] === false) return;
            var fullVals = getSeriesValues(k);
            var vals = fullVals.slice(winStart, winEnd + 1);
            seriesValues[k] = vals;
            for (var i = 0; i < vals.length; i++) {
                var vv = Number(vals[i] || 0);
                if (vv > 0) hasAnyValue = true;
                if (vv > maxVal) maxVal = vv;
            }
        });
        if (maxVal <= 0) maxVal = 1;

        keys.forEach(function (k, idx) {
            if (mainVisible[k] === false) return;
            var vals = seriesValues[k] || getSeriesValues(k).slice(winStart, winEnd + 1);
            var pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            pl.setAttribute('data-series', k);
            pl.setAttribute('fill', 'none');
            pl.setAttribute('stroke', seriesColor(k, idx));
            pl.setAttribute('stroke-width', k === 'actions' || k.startsWith('action:') ? '1.8' : '2.2');
            pl.setAttribute('stroke-linejoin', 'round');
            pl.setAttribute('stroke-linecap', 'round');
            pl.setAttribute('points', svgPoints(vals, W, H, maxVal));
            seriesG.appendChild(pl);
        });

        var empty = document.getElementById('tcTrendEmptyMsg');
        if (empty) {
            if (!hasAnyValue) empty.classList.remove('d-none');
            else empty.classList.add('d-none');
        }

        svg.style.opacity = '0.55';
        window.requestAnimationFrame(function () {
            svg.style.opacity = '1';
        });

        updateTrendAxisLabels(labels, winStart, winEnd);
        setSeriesBadge();
    }

    function showMainTooltip(ev, idx) {
        var wrap = document.getElementById('tcTrendWrap');
        var tip = document.getElementById('tcTrendTooltip');
        if (!wrap || !tip) return;

        var labels = dashboard?.labels || [];
        var nFull = labels.length || 0;
        if (!nFull) return;
        if (trendViewEnd <= 0) trendViewEnd = nFull - 1;
        var winStart = trendZoom > 1 ? Math.max(0, Math.min(nFull - 1, trendViewStart)) : 0;
        var winEnd = trendZoom > 1 ? Math.max(winStart, Math.min(nFull - 1, trendViewEnd)) : nFull - 1;
        var winN = Math.max(1, winEnd - winStart + 1);
        var localIdx = Math.max(0, Math.min(winN - 1, idx - winStart));

        var date = String(labels[idx] || '');
        var dateEl = document.getElementById('tcTrendTipDate');
        if (dateEl) dateEl.textContent = date;

        var keys = getMainSeriesKeys().filter(function (k) {
            return mainVisible[k] !== false;
        });
        var lines = keys
            .map(function (k, i) {
                var vals = getSeriesValues(k);
                var v = Number(vals[idx] || 0);
                return (
                    '<div class="text-truncate" style="max-width:260px">' +
                    '<span style="color:' +
                    seriesColor(k, i) +
                    ';margin-right:6px">●</span>' +
                    esc(seriesLabel(k)) +
                    '<span style="color:rgba(255,255,255,0.35);margin:0 6px">·</span>' +
                    '<span style="color:rgba(255,255,255,0.92)">' +
                    v +
                    '</span>' +
                    '</div>'
                );
            })
            .join('');

        var linesEl = document.getElementById('tcTrendTipLines');
        if (linesEl) linesEl.innerHTML = lines;

        var wrapRect = wrap.getBoundingClientRect();
        var left = ev.clientX - wrapRect.left + 12;
        var top = ev.clientY - wrapRect.top + 12;
        tip.classList.remove('d-none');
        tip.style.transform = 'translate(' + left + 'px,' + top + 'px)';

        var hoverLine = document.getElementById('tcTrendHoverLine');
        var W = parseInt(dashboard?.svg?.w || 400, 10) || 400;
        var x = winN > 1 ? (localIdx / (winN - 1)) * W : W / 2;
        if (hoverLine) {
            hoverLine.setAttribute('x1', String(x));
            hoverLine.setAttribute('x2', String(x));
            hoverLine.style.display = '';
        }
    }

    function hideMainTooltip() {
        var tip = document.getElementById('tcTrendTooltip');
        if (tip) {
            tip.classList.add('d-none');
            tip.style.transform = 'translate(-9999px,-9999px)';
        }
        var hoverLine = document.getElementById('tcTrendHoverLine');
        if (hoverLine) hoverLine.style.display = 'none';
    }

    function bindMainTooltip() {
        var svg = document.getElementById('tcTrendSvg');
        var wrap = document.getElementById('tcTrendWrap');
        if (!svg || !wrap || !dashboard?.labels?.length) return;
        var n0 = dashboard.labels.length || 1;
        if (trendViewEnd <= 0) {
            trendZoom = 1;
            setTrendWindowByFocus(0);
        }

        svg.addEventListener('mousemove', function (ev) {
            var n = dashboard.labels.length;
            var idx = getClosestIndex(ev, wrap, n);
            showMainTooltip(ev, idx);
        });
        svg.addEventListener('mouseleave', hideMainTooltip);

        var onWheel = function (ev) {
            if (String(document.activeElement?.tagName || '').toUpperCase() === 'INPUT') return;
            ev.preventDefault();
            var dir = (ev.deltaY || 0) < 0 ? 1 : -1;
            var idx = getClosestIndex(ev, wrap, n0);
            trendZoom = Math.round((trendZoom + dir * trendZoomStep) / trendZoomStep) * trendZoomStep;
            if (trendZoom < trendZoomMin) trendZoom = trendZoomMin;
            if (trendZoom > trendZoomMax) trendZoom = trendZoomMax;
            setTrendWindowByFocus(idx);
            renderMainChart();
            showMainTooltip(ev, idx);
        };
        try {
            wrap.addEventListener('wheel', onWheel, { passive: false });
        } catch (_) {
            wrap.addEventListener('wheel', onWheel);
        }

        wrap.addEventListener('dblclick', function () {
            trendZoom = 1;
            setTrendWindowByFocus(0);
            renderMainChart();
            hideMainTooltip();
        });
    }

    function setKpiActiveUi() {
        try {
            var setActive = function (selector, active) {
                document.querySelectorAll(selector).forEach(function (c) {
                    if (active) c.classList.add('tc-wkpi--active');
                    else c.classList.remove('tc-wkpi--active');
                });
            };

            var hasVisitsSel = mainSelected.indexOf('visits') >= 0;
            var hasActionsSel = mainSelected.indexOf('actions') >= 0;
            var defaultMetrics = !hasVisitsSel && !hasActionsSel;

            var mode = 'all';
            if (!defaultMetrics) {
                if (hasVisitsSel && !hasActionsSel) mode = 'ip';
                else if (hasActionsSel && !hasVisitsSel) mode = 'sc';
                else mode = 'all';
            }

            setActive('.tc-wkpi[data-kpi-filter="all"]', mode === 'all');
            setActive('.tc-wkpi[data-kpi-filter="ip"]', mode === 'ip');
            setActive('.tc-wkpi[data-kpi-filter="sc"]', mode === 'sc');
            setActive('.tc-wkpi[data-kpi-series="uniqueIp"]', mainSelected.indexOf('uniqueIp') >= 0);
            setActive('.tc-wkpi[data-kpi-series="uniquePages"]', mainSelected.indexOf('uniquePages') >= 0);
            setActive('.tc-wkpi[data-kpi-series="wallets"]', mainSelected.indexOf('wallets') >= 0);
        } catch (_) {}
    }

    function setWalletBoxVisible() {
        var box = document.getElementById('tcWalletBox');
        if (!box) return;
        box.classList.add('d-none');
    }

    function bindKpiSelectors() {
        document.querySelectorAll('.tc-wkpi[data-kpi-filter]').forEach(function (card) {
            var k = String(card.getAttribute('data-kpi-filter') || '');
            if (!k) return;
            card.addEventListener('click', function () {
                if (k === 'all') {
                    mainSelected = removeFromArray(removeFromArray(mainSelected, 'visits'), 'actions');
                    kpiFilter = null;
                } else {
                    if (k === 'ip') mainSelected = toggleInArray(mainSelected, 'visits');
                    if (k === 'sc') mainSelected = toggleInArray(mainSelected, 'actions');

                    var hasVisitsSel = mainSelected.indexOf('visits') >= 0;
                    var hasActionsSel = mainSelected.indexOf('actions') >= 0;
                    if (!hasVisitsSel && !hasActionsSel) kpiFilter = null;
                    else if (hasVisitsSel && hasActionsSel) kpiFilter = null;
                    else if (hasVisitsSel) kpiFilter = 'ip';
                    else if (hasActionsSel) kpiFilter = 'sc';
                }

                setWalletBoxVisible();
                setKpiActiveUi();
                renderMainChart();
                renderPage(1);
            });
            if (String(card.tagName || '').toUpperCase() !== 'BUTTON') {
                card.addEventListener('keydown', function (ev) {
                    if (ev.key !== 'Enter' && ev.key !== ' ') return;
                    ev.preventDefault();
                    card.click();
                });
            }
        });

        document.querySelectorAll('.tc-wkpi[data-kpi-series]').forEach(function (card) {
            var s = String(card.getAttribute('data-kpi-series') || '');
            if (!s) return;
            card.addEventListener('click', function () {
                if (s === 'wallets') {
                    var wasOn = mainSelected.indexOf('wallets') >= 0;
                    mainSelected = toggleInArray(mainSelected, 'wallets');
                    if (!wasOn) selectedWallets = (dashboard?.wallets?.top || []).slice();
                    renderMainChart();
                    setKpiActiveUi();
                    return;
                }
                mainSelected = toggleInArray(mainSelected, s);
                setWalletBoxVisible();
                setKpiActiveUi();
                renderMainChart();
            });
            if (String(card.tagName || '').toUpperCase() !== 'BUTTON') {
                card.addEventListener('keydown', function (ev) {
                    if (ev.key !== 'Enter' && ev.key !== ' ') return;
                    ev.preventDefault();
                    card.click();
                });
            }
        });
    }

    // ── Chips de página e IP — clique filtra tabela ───────────────────────────

    function bindTopChips() {
        // Page chips
        document.querySelectorAll('.tc-top-page[data-top-page]').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var page = chip.getAttribute('data-top-page');
                applyTopPageSelection(page);
                renderPage(1);
            });
        });

        // IP chips (chief apenas)
        document.querySelectorAll('.tc-ip-chip[data-ip-val]').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var ip = chip.getAttribute('data-ip-val');
                var sel = document.getElementById('fltIp');
                if (!sel) return;
                var isActive = sel.value === ip;
                sel.value = isActive ? '' : ip;
                document.querySelectorAll('.tc-ip-chip[data-ip-val]').forEach(function (c) {
                    c.classList.remove('tc-chip--active');
                });
                if (!isActive) chip.classList.add('tc-chip--active');
                renderPage(1);
            });
        });

        // Mini ranking de páginas (dashboard)
        document.querySelectorAll('.tc-top-page-row[data-top-page]').forEach(function (row) {
            try {
                var p0 = String(row.getAttribute('data-top-page') || '');
                var idx0 = pageIndexOf(p0, row.getAttribute('data-top-page-idx'));
                var c0 = pagePalette(idx0);
                var lbl = row.querySelector('span');
                if (lbl)
                    lbl.innerHTML =
                        '<span style="color:' + c0 + ';margin-right:6px">●</span>' + esc(lbl.textContent || '');
            } catch (_) {}

            row.addEventListener('click', function () {
                var page = row.getAttribute('data-top-page');
                applyTopPageSelection(page);
                renderPage(1);
            });
            row.addEventListener('keydown', function (ev) {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                var page = row.getAttribute('data-top-page');
                applyTopPageSelection(page);
                renderPage(1);
            });
        });
    }

    // ── Dashboard (cross-filter): tendência + wallets ────────────────────────

    function toPageLabel(p) {
        var raw = String(p || '');
        return raw === 'index.php' ? 'home' : raw;
    }

    function shortWallet(w) {
        var s = String(w || '');
        if (s.length <= 18) return s;
        return s.slice(0, 10) + '…' + s.slice(-6);
    }

    function svgPoints(vals, W, H, maxVal) {
        var n = (vals || []).length;
        if (!n) return '';
        var pts = [];
        for (var i = 0; i < n; i++) {
            var x = n > 1 ? Math.round((i / (n - 1)) * W * 10) / 10 : Math.round((W / 2) * 10) / 10;
            var y = Math.round((H - ((vals[i] || 0) / maxVal) * (H - 5)) * 10) / 10;
            pts.push(String(x) + ',' + String(y));
        }
        return pts.join(' ');
    }

    function svgArea(vals, W, H, maxVal) {
        var n = (vals || []).length;
        if (n < 2) return '';
        var segs = [];
        for (var i = 0; i < n; i++) {
            var x = Math.round((i / (n - 1)) * W * 10) / 10;
            var y = Math.round((H - ((vals[i] || 0) / maxVal) * (H - 5)) * 10) / 10;
            segs.push(String(x) + ' ' + String(y));
        }
        return (
            'M ' +
            segs.join(' L ') +
            ' L ' +
            String(Math.round(W * 10) / 10) +
            ' ' +
            String(H) +
            ' L 0 ' +
            String(H) +
            ' Z'
        );
    }

    function setTrendSvg() {}

    function setActiveTopPageUi() {
        try {
            document.querySelectorAll('.tc-top-page-row[data-top-page]').forEach(function (row) {
                var p = String(row.getAttribute('data-top-page') || '');
                var idxAttr = row.getAttribute('data-top-page-idx');
                var idx0 = pageIndexOf(p, idxAttr);
                var c0 = pagePalette(idx0);
                var active = false;
                for (var i = 0; i < selectedTopPages.length; i++) {
                    if (String(selectedTopPages[i] || '') === p) {
                        active = true;
                        break;
                    }
                }
                if (active) {
                    row.style.background = hexToRgba(c0, 0.1);
                    row.style.border = '1px solid ' + hexToRgba(c0, 0.22);
                    var bar = row.querySelector('div > div');
                    if (bar) bar.style.background = 'linear-gradient(90deg,' + c0 + ',' + c0 + 'AA)';
                } else {
                    row.style.background = '';
                    row.style.border = '';
                    var bar2 = row.querySelector('div > div');
                    if (bar2) bar2.style.background = 'linear-gradient(90deg,#60a5fa,#818cf8)';
                }
            });
        } catch (_) {}
    }

    function setActiveTopPageBadge() {
        var badge2 = document.getElementById('tcTopPagesActiveFilter');

        var apply = function (el) {
            if (!el) return;
            if (!selectedTopPages.length) {
                el.classList.add('d-none');
                el.textContent = '';
                el.onclick = null;
                return;
            }

            el.classList.remove('d-none');
            var first = toPageLabel(selectedTopPages[0] || '');
            var extra = selectedTopPages.length > 1 ? ' +' + String(selectedTopPages.length - 1) : '';
            el.textContent = first + extra + ' ×';
            el.style.cursor = 'pointer';
            el.onclick = function () {
                selectedTopPages = [];
                setActiveTopPageUi();
                setActiveTopPageBadge();
                if (dashboard) renderMainChart();
                renderPage(1);
            };
        };

        apply(badge2);
    }

    function applyTopPageSelection(page) {
        var p = String(page || '');
        if (!p) return;

        var idx = -1;
        for (var i = 0; i < selectedTopPages.length; i++) {
            if (String(selectedTopPages[i] || '') === p) {
                idx = i;
                break;
            }
        }
        if (idx >= 0) selectedTopPages.splice(idx, 1);
        else selectedTopPages.push(p);

        setActiveTopPageUi();
        setActiveTopPageBadge();

        if (dashboard) {
            renderMainChart();
        }
    }

    function getTrendWindowInfo(nFull) {
        var n = Number(nFull || 0) || 0;
        if (n <= 0) return { start: 0, end: 0, n: 0 };
        if (trendZoom <= 1) return { start: 0, end: n - 1, n: n };
        var start = Math.max(0, Math.min(n - 1, Number(trendViewStart || 0) || 0));
        var end = Math.max(start, Math.min(n - 1, Number(trendViewEnd || 0) || 0));
        return { start: start, end: end, n: Math.max(1, end - start + 1) };
    }

    function setTrendWindowByFocus(focusIdx) {
        var labels = dashboard?.labels || [];
        var n = labels.length || 0;
        if (!n) return;
        if (trendZoom < trendZoomMin) trendZoom = trendZoomMin;
        if (trendZoom > trendZoomMax) trendZoom = trendZoomMax;
        if (trendZoom <= 1) {
            trendViewStart = 0;
            trendViewEnd = n - 1;
            return;
        }
        var idx = Math.max(0, Math.min(n - 1, Number(focusIdx || 0) || 0));
        var winSize = Math.max(3, Math.min(n, Math.ceil(n / trendZoom)));
        var start = Math.round(idx - winSize / 2);
        if (start < 0) start = 0;
        var end = start + winSize - 1;
        if (end > n - 1) {
            end = n - 1;
            start = Math.max(0, end - winSize + 1);
        }
        trendViewStart = start;
        trendViewEnd = end;
    }

    function getClosestIndex(ev, wrapEl, n) {
        if (!wrapEl || !n) return 0;
        var rect = wrapEl.getBoundingClientRect();
        var x = ev.clientX - rect.left;
        var ratio = rect.width > 0 ? x / rect.width : 0;

        var win = getTrendWindowInfo(n);
        var local = Math.round(ratio * (win.n - 1));
        if (local < 0) local = 0;
        if (local > win.n - 1) local = win.n - 1;
        return win.start + local;
    }

    function bindTrendTooltip() {
        bindMainTooltip();
    }

    function walletPalette(i) {
        var colors = ['#1d4ed8', '#7c2d12', '#0f766e', '#7f1d1d', '#3f6212'];
        return colors[i % colors.length];
    }

    function walletIndexOf(wallet, fallbackIdx) {
        var w = String(wallet || '').toLowerCase();
        if (!w) return Number(fallbackIdx || 0) || 0;
        var top = dashboard?.wallets?.top || [];
        for (var i = 0; i < top.length; i++) {
            if (String(top[i] || '').toLowerCase() === w) return i;
        }
        return Number(fallbackIdx || 0) || 0;
    }

    function pagePalette(i) {
        var colors = ['#0ea5e9', '#22c55e', '#a855f7', '#14b8a6', '#818cf8', '#4ade80', '#38bdf8', '#c4b5fd'];
        return colors[i % colors.length];
    }

    function pageIndexOf(page, fallbackIdx) {
        var p = String(page || '');
        if (!p) return Number(fallbackIdx || 0) || 0;
        var top = dashboard?.topPages || [];
        for (var i = 0; i < top.length; i++) {
            if (String(top[i]?.page || '') === p) return i;
        }
        return Number(fallbackIdx || 0) || 0;
    }

    function shadeHex(hex, pct) {
        var h = String(hex || '')
            .replace('#', '')
            .trim();
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (h.length !== 6) return hex;
        var p = Number(pct || 0) / 100;
        var r = parseInt(h.slice(0, 2), 16);
        var g = parseInt(h.slice(2, 4), 16);
        var b = parseInt(h.slice(4, 6), 16);
        var t = p < 0 ? 0 : 255;
        var ap = Math.abs(p);
        var nr = Math.round((t - r) * ap) + r;
        var ng = Math.round((t - g) * ap) + g;
        var nb = Math.round((t - b) * ap) + b;
        return (
            '#' +
            [nr, ng, nb]
                .map(function (x) {
                    return x.toString(16).padStart(2, '0');
                })
                .join('')
        );
    }

    function walletSeriesFor(wallet) {
        var w = String(wallet || '');
        if (!w) return [];
        if (selectedTopPages.length && dashboard?.wallets?.byWalletByPage?.[w]) {
            var base = (dashboard?.wallets?.byWallet?.[w]?.total || []).slice();
            var sum = new Array(base.length).fill(0);
            selectedTopPages.forEach(function (p) {
                var s = dashboard?.wallets?.byWalletByPage?.[w]?.[p] || null;
                if (!s) return;
                var vals = s.total || [];
                for (var i = 0; i < sum.length; i++) sum[i] += Number(vals[i] || 0);
            });
            return sum;
        }
        return dashboard?.wallets?.byWallet?.[w]?.total || [];
    }

    function renderWalletLegend() {
        var legend = document.getElementById('tcWalletLegend');
        if (!legend) return;

        var wallets = dashboard?.wallets?.top || [];
        if (!wallets.length) return;

        var allChip =
            wallets.length > 1
                ? '<span class="pg-chip tc-pill-chip tc-wallet-chip" role="button" tabindex="0" data-wallet="__all__" style="cursor:pointer;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12)">Todas</span>'
                : '';

        legend.innerHTML =
            allChip +
            wallets
                .map(function (w, idx) {
                    var active = selectedWallets.indexOf(w) >= 0;
                    var border = active ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)';
                    var bg = active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)';
                    return (
                        '<span class="pg-chip tc-pill-chip tc-wallet-chip" role="button" tabindex="0" data-wallet="' +
                        esc(String(w)) +
                        '" style="cursor:pointer;background:' +
                        bg +
                        ';border:1px solid ' +
                        border +
                        '">' +
                        '<span style="color:' +
                        walletPalette(idx) +
                        ';margin-right:6px">●</span>' +
                        esc(shortWallet(w)) +
                        '</span>'
                    );
                })
                .join('');

        legend.querySelectorAll('.tc-wallet-chip[data-wallet]').forEach(function (chip) {
            chip.addEventListener('click', function () {
                var w = String(chip.getAttribute('data-wallet') || '');
                if (w === '__all__') {
                    selectedWallets = (dashboard?.wallets?.top || []).slice();
                } else {
                    selectedWallets = toggleInArray(selectedWallets, w);
                    if (!selectedWallets.length) selectedWallets = [w];
                }
                renderWalletLegend();
                renderMainChart();
            });
            chip.addEventListener('keydown', function (ev) {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                chip.click();
            });
        });
    }

    function ensureWalletLines(svg, wallets) {
        if (!svg) return;
        var existing = {};
        svg.querySelectorAll('polyline[data-wallet]').forEach(function (pl) {
            existing[String(pl.getAttribute('data-wallet') || '')] = pl;
        });
        wallets.forEach(function (w, idx) {
            if (existing[w]) return;
            var pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            pl.setAttribute('data-wallet', w);
            pl.setAttribute('fill', 'none');
            pl.setAttribute('stroke', walletPalette(idx));
            pl.setAttribute('stroke-width', '2');
            pl.setAttribute('stroke-linejoin', 'round');
            pl.setAttribute('stroke-linecap', 'round');
            svg.appendChild(pl);
        });
    }

    function findWalletPolyline(svg, wallet) {
        if (!svg) return null;
        var w = String(wallet || '');
        var out = null;
        svg.querySelectorAll('polyline[data-wallet]').forEach(function (pl) {
            if (out) return;
            if (String(pl.getAttribute('data-wallet') || '') === w) out = pl;
        });
        return out;
    }

    function renderWalletTrend() {}

    function showWalletTooltip(ev, idx) {
        var wrap = document.getElementById('tcWalletTrendWrap');
        var tip = document.getElementById('tcWalletTooltip');
        if (!wrap || !tip) return;

        var labels = dashboard?.labels || [];
        var date = String(labels[idx] || '');
        var dateEl = document.getElementById('tcWalletTipDate');
        if (dateEl) dateEl.textContent = date;

        var wallets = dashboard?.wallets?.top || [];
        if (selectedWallet)
            wallets = wallets.filter(function (w) {
                return w === selectedWallet;
            });

        var lines = wallets
            .map(function (w, idx2) {
                var vals = walletSeriesFor(w);
                var v = Number(vals[idx] || 0);
                return (
                    '<div class="text-truncate" style="max-width:220px">' +
                    '<span style="color:' +
                    walletPalette(idx2) +
                    ';margin-right:6px">●</span>' +
                    esc(shortWallet(w)) +
                    '<span style="color:rgba(255,255,255,0.35);margin:0 6px">·</span>' +
                    '<span style="color:rgba(255,255,255,0.92)">' +
                    v +
                    '</span>' +
                    '</div>'
                );
            })
            .join('');

        var linesEl = document.getElementById('tcWalletTipLines');
        if (linesEl) linesEl.innerHTML = lines;

        var wrapRect = wrap.getBoundingClientRect();
        var left = ev.clientX - wrapRect.left + 12;
        var top = ev.clientY - wrapRect.top + 12;
        tip.classList.remove('d-none');
        tip.style.transform = 'translate(' + left + 'px,' + top + 'px)';
    }

    function hideWalletTooltip() {
        var tip = document.getElementById('tcWalletTooltip');
        if (tip) {
            tip.classList.add('d-none');
            tip.style.transform = 'translate(-9999px,-9999px)';
        }
    }

    function bindWalletTooltip() {}

    function actionPalette(i) {
        var colors = ['#f97316', '#fb7185', '#f59e0b', '#ef4444', '#ea580c', '#d97706', '#f43f5e', '#eab308'];
        return colors[i % colors.length];
    }

    function actionIndexOfType(actionType, fallbackIdx) {
        var k = String(actionType || '');
        if (!k) return Number(fallbackIdx || 0) || 0;
        var top = dashboard?.actions?.top || [];
        for (var i = 0; i < top.length; i++) {
            if (String(top[i]?.action || '') === k) return i;
        }
        return Number(fallbackIdx || 0) || 0;
    }

    function hexToRgba(hex, a) {
        var h = String(hex || '')
            .replace('#', '')
            .trim();
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        if (h.length !== 6) return 'rgba(255,255,255,' + String(a || 0) + ')';
        var r = parseInt(h.slice(0, 2), 16);
        var g = parseInt(h.slice(2, 4), 16);
        var b = parseInt(h.slice(4, 6), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + String(a || 0) + ')';
    }

    function actionSeriesFor(actionKey) {
        var k = String(actionKey || '');
        if (!k) return [];
        var labels = dashboard?.labels || [];
        var n = labels.length || 0;
        if (!n) return [];

        if (!dashboard?.actions) return new Array(n).fill(0);

        if (selectedTopPages.length && dashboard.actions.byActionByPage) {
            var sum = new Array(n).fill(0);
            selectedTopPages.forEach(function (p) {
                var a = dashboard?.actions?.byActionByPage?.[p]?.[k] || null;
                if (!a) return;
                for (var i = 0; i < n; i++) sum[i] += Number(a[i] || 0);
            });
            return sum;
        }

        var arr = dashboard?.actions?.byAction?.[k] || [];
        if (!Array.isArray(arr) || arr.length !== n) return new Array(n).fill(0);
        return arr.map(function (v) {
            return Number(v || 0);
        });
    }

    function actionsSumSeries(keys) {
        var labels = dashboard?.labels || [];
        var n = labels.length || 0;
        if (!n) return [];
        var sum = new Array(n).fill(0);
        (keys || []).forEach(function (k) {
            var s = actionSeriesFor(k);
            for (var i = 0; i < n; i++) sum[i] += Number(s[i] || 0);
        });
        return sum;
    }

    function getActionsKeysDefault() {
        var top = dashboard?.actions?.top || [];
        return top
            .map(function (t) {
                return String(t?.action || '');
            })
            .filter(Boolean);
    }

    function setActionsSvg(vals) {
        var svg = document.getElementById('tcActionsTrendSvg');
        if (!svg) return;
        var W = parseInt(dashboard?.svg?.w || 400, 10) || 400;
        var H = parseInt(dashboard?.svg?.h || 60, 10) || 60;
        var maxVal = 1;
        for (var i = 0; i < (vals || []).length; i++) maxVal = Math.max(maxVal, Number(vals[i] || 0));

        var line = document.getElementById('tcActionsTrendLine');
        var area = document.getElementById('tcActionsTrendArea');
        if (line) line.setAttribute('points', svgPoints(vals, W, H, maxVal));
        if (area) area.setAttribute('d', svgArea(vals, W, H, maxVal));

        svg.style.opacity = '0.55';
        window.requestAnimationFrame(function () {
            svg.style.opacity = '1';
        });
    }

    function setActiveActionUi() {
        try {
            document.querySelectorAll('.tc-action-type-row[data-action-type]').forEach(function (row) {
                var k = String(row.getAttribute('data-action-type') || '');
                var idxAttr = row.getAttribute('data-action-idx');
                var idx = actionIndexOfType(k, idxAttr);
                var color = actionPalette(idx);
                var active = selectedActionTypes.indexOf(k) >= 0;
                if (active) {
                    row.style.background = hexToRgba(color, 0.1);
                    row.style.border = '1px solid ' + hexToRgba(color, 0.22);
                } else {
                    row.style.background = '';
                    row.style.border = '';
                }
            });
        } catch (_) {}
    }

    function setActionsBadge() {
        var badge = document.getElementById('tcActionsActiveFilter');
        if (!badge) return;

        if (!selectedActionTypes.length) {
            badge.classList.add('d-none');
            badge.textContent = '';
            return;
        }
        var top = dashboard?.actions?.top || [];
        var labelOf = function (k) {
            var kk = String(k || '');
            for (var i = 0; i < top.length; i++) {
                if (String(top[i]?.action || '') === kk) return String(top[i]?.label || kk);
            }
            return kk;
        };

        badge.classList.remove('d-none');
        var first = labelOf(selectedActionTypes[0]);
        var extra = selectedActionTypes.length > 1 ? ' +' + String(selectedActionTypes.length - 1) : '';
        badge.textContent = 'Tipos: ' + first + extra + ' ×';
        badge.style.cursor = 'pointer';
        badge.onclick = function () {
            selectedActionTypes = [];
            setActiveActionUi();
            setActionsBadge();
            renderActionsChart();
        };
    }

    function setSeriesBadge() {
        var badge = document.getElementById('tcSeriesActiveFilter');
        if (!badge) return;
        var hasCustom =
            mainSelected.length > 0 ||
            Object.keys(mainVisible || {}).some(function (k) {
                return mainVisible[k] === false;
            });
        if (!hasCustom) {
            badge.classList.add('d-none');
            badge.textContent = '';
            badge.onclick = null;
            return;
        }
        badge.classList.remove('d-none');
        badge.textContent = 'Zerar ×';
        badge.style.cursor = 'pointer';
        badge.onclick = function () {
            mainSelected = [];
            mainVisible = {};
            setKpiActiveUi();
            renderMainChart();
        };
    }

    function renderActionsChart() {
        renderMainChart();
    }

    function bindActions() {
        if (!document.getElementById('tcActionsBox')) return;

        document.querySelectorAll('.tc-action-type-row[data-action-type]').forEach(function (row) {
            try {
                var k0 = String(row.getAttribute('data-action-type') || '');
                var idx0 = actionIndexOfType(k0, row.getAttribute('data-action-idx'));
                var c0 = actionPalette(idx0);
                var bar = row.querySelector('div > div');
                if (bar) bar.style.background = 'linear-gradient(90deg,' + c0 + ',' + c0 + 'AA)';
                var lbl = row.querySelector('span');
                if (lbl)
                    lbl.innerHTML =
                        '<span style="color:' + c0 + ';margin-right:6px">●</span>' + esc(lbl.textContent || '');
            } catch (_) {}

            row.addEventListener('click', function () {
                var k = String(row.getAttribute('data-action-type') || '');
                if (!k) return;
                var idx = selectedActionTypes.indexOf(k);
                if (idx >= 0) selectedActionTypes.splice(idx, 1);
                else selectedActionTypes.push(k);

                setActiveActionUi();
                setActionsBadge();
                renderMainChart();
            });
            row.addEventListener('keydown', function (ev) {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                row.click();
            });
        });

        setActiveActionUi();
        setActionsBadge();
        renderMainChart();
    }

    function initDashboard() {
        if (!dashboard?.labels?.length) return;
        bindKpiSelectors();
        bindActions();
        setWalletBoxVisible();
        renderWalletLegend();
        setKpiActiveUi();
        setActiveTopPageUi();
        setActiveTopPageBadge();
        renderMainChart();
        bindMainTooltip();
    }

    // ── Botão de download de log ──────────────────────────────────────

    function bindDownloadBtn() {
        document.getElementById('btnDownloadLog')?.addEventListener('click', function () {
            var fmt = 'txt';
            var start = String(document.getElementById('logsStart')?.value || startDate);
            var end_ = String(document.getElementById('logsEnd')?.value || endDate);
            try {
                var dlType = String(document.getElementById('downloadTypeSel')?.value || 'report')
                    .toLowerCase()
                    .trim();
                if (dlType !== 'ip' && dlType !== 'sc' && dlType !== 'report') dlType = 'report';
                var fip = String(document.getElementById('fltIp')?.value || '').trim();
                var fw = String(document.getElementById('fltWallet')?.value || '').trim();
                var fct = String(document.getElementById('fltContractQuery')?.value || '').trim();
                var fh = String(document.getElementById('fltHour')?.value || '').trim();
                if (fh && /^\d{1,2}$/.test(fh)) fh = fh.padStart(2, '0');
                var url = new URL('download-log.php', window.location.href);
                url.searchParams.set('type', dlType);
                url.searchParams.set('start', start);
                url.searchParams.set('end', end_);
                url.searchParams.set('format', fmt);
                if (selectedTopPages.length === 1) url.searchParams.set('page', String(selectedTopPages[0] || ''));
                if (fip) url.searchParams.set('ip', fip);
                if (fw) url.searchParams.set('wallet', fw);
                if (fct) url.searchParams.set('contract', fct);
                if (fh) url.searchParams.set('hour', fh);
                window.location.href = url.toString();
            } catch (_) {
                var fallbackType = 'report';
                try {
                    fallbackType = String(document.getElementById('downloadTypeSel')?.value || 'report');
                } catch (_) {}
                window.location.href =
                    'download-log.php?type=' +
                    encodeURIComponent(fallbackType) +
                    '&start=' +
                    encodeURIComponent(start) +
                    '&end=' +
                    encodeURIComponent(end_) +
                    '&format=' +
                    encodeURIComponent(fmt);
            }
        });
    }

    // ── Sorting por coluna ────────────────────────────────────────────

    function bindSortHeaders() {
        document.querySelectorAll('th.tc-sortable').forEach(function (th) {
            th.style.cursor = 'pointer';
            th.addEventListener('click', function () {
                var k = th.getAttribute('data-sort');
                if (!k) return;
                try {
                    document.querySelectorAll('th.tc-sortable .tc-sort-ind').forEach(function (s) {
                        s.textContent = '';
                    });
                    var ind = th.querySelector('.tc-sort-ind');
                    if (sortKey !== k) {
                        sortKey = k;
                        sortDir = 1;
                        if (ind) ind.textContent = '▲';
                    } else if (sortDir === 1) {
                        sortDir = -1;
                        if (ind) ind.textContent = '▼';
                    } else {
                        sortKey = null;
                        sortDir = 1;
                    }
                } catch (_) {}
                renderPage(1);
            });
        });
    }

    // ── Filtros de URL e investigação ─────────────────────────────────

    function bindUrlFilters() {
        var btn = document.getElementById('btnLoadLogs');
        var startEl = document.getElementById('logsStart');
        var endEl = document.getElementById('logsEnd');
        if (!btn || !startEl || !endEl) return;

        btn.addEventListener('click', function () {
            try {
                var url = new URL(window.location.href);
                url.searchParams.set('start', String(startEl.value || ''));
                url.searchParams.set('end', String(endEl.value || ''));
                url.searchParams.delete('date');
                url.searchParams.delete('days');
                window.location.href = url.toString();
            } catch (_) {}
        });
    }

    // ── Inicialização ─────────────────────────────────────────────────

    // ── Lazy loading do relatório ─────────────────────────────────────────────
    // Os dados (JSON pesado) ficam em <script id="tc-logs-data-src" type="application/json">
    // e só são parseados quando o usuário clica em "Carregar Relatório Completo".
    // Isso evita alocar o array de objetos JS no heap até que seja necessário.

    function loadReportData() {
        if (dataLoaded) return;
        try {
            var src = document.getElementById('tc-relatorios-data-src');
            data = src ? JSON.parse(src.textContent || '[]') : [];
        } catch (_) {
            data = [];
        }
        dataLoaded = true;
    }

    function init() {
        if (!tBody) return;

        bindUrlFilters();
        renderKpiChips();
        bindTopChips();
        initDashboard();
        bindDownloadBtn();
        bindSortHeaders();
        try {
            var lb = document.getElementById('btnLoadReport');
            if (lb) lb.style.removeProperty('display');
        } catch (_) {}

        // Botão "Carregar Relatório Completo" — revela tabela e parseia dados
        document.getElementById('btnLoadReport')?.addEventListener('click', function () {
            try {
                this.disabled = true;
                this.style.display = 'none';
            } catch (_) {}
            loadAndShowReport();
            buildQuickFilters();
            updateActiveFilterBadge();
            renderPage(1);
        });

        document.getElementById('btnApplyTableFilter')?.addEventListener('click', function () {
            buildQuickFilters();
            updateActiveFilterBadge();
            renderPage(1);
        });

        // ── KPIs clicáveis de "Sua Carteira" — filtram o relatório abaixo ────────
        // Por quê: o usuário não quer botões duplicados no relatório; os KPIs ARE os filtros
        var filterLabels = {
            all: 'Todos',
            deploys: '🚀 Meus deploys',
            verified: '✓ Verificados',
            pending: '⏳ Pendentes',
            views: '👁 Visualizações',
        };

        function setTableFilterMode(mode) {
            tableFilterMode = mode;

            // Atualiza estado visual dos KPI cards
            document.querySelectorAll('.tc-wkpi[data-wallet-filter]').forEach(function (card) {
                var cardMode = String(card.getAttribute('data-wallet-filter') || '');
                if (cardMode === mode) {
                    card.classList.add('tc-wkpi--active');
                } else {
                    card.classList.remove('tc-wkpi--active');
                }
            });
            buildQuickFilters();
            updateActiveFilterBadge();
        }

        function updateActiveFilterBadge() {
            var badge = document.getElementById('activeFilterBadge');
            if (!badge) return;

            var mode = tableFilterMode || 'all';
            var parts = [];
            parts.push(filterLabels[mode] || mode);

            var ct = String(document.getElementById('fltContractQuery')?.value || '').trim();
            if (ct) parts.push('Contrato: ' + ct);

            var w = String(document.getElementById('qfWallet')?.value || '').trim();
            if (w) parts.push('Wallet: ' + shortWallet(w));

            var ch = String(document.getElementById('qfChain')?.value || '').trim();
            if (ch) parts.push('Rede: ' + chainLabel(ch));

            var ip = String(document.getElementById('qfIp')?.value || '').trim();
            if (ip) parts.push('IP: ' + ip);

            badge.textContent = parts.join(' · ');
            badge.style.background =
                mode === 'all'
                    ? 'rgba(255,255,255,0.06)'
                    : mode === 'deploys'
                      ? 'rgba(74,222,128,0.14)'
                      : mode === 'verified'
                        ? 'rgba(96,165,250,0.14)'
                        : mode === 'pending'
                          ? 'rgba(251,191,36,0.14)'
                          : 'rgba(255,255,255,0.06)';
            badge.style.color =
                mode === 'all'
                    ? 'rgba(255,255,255,0.55)'
                    : mode === 'deploys'
                      ? '#4ade80'
                      : mode === 'verified'
                        ? '#60a5fa'
                        : mode === 'pending'
                          ? '#fbbf24'
                          : 'rgba(255,255,255,0.65)';
            badge.style.borderColor = badge.style.background;
        }

        function buildQuickFilters() {
            var host = document.getElementById('tcQuickFilters');
            if (!host) return;
            if (!dataLoaded) {
                host.innerHTML = '';
                return;
            }

            var rows = sortRows(applyTableFilter(getActiveData()));

            var wCounts = {};
            var chCounts = {};
            var ipCounts = {};
            rows.forEach(function (r) {
                var w0 = String(r.wallet || '')
                    .toLowerCase()
                    .trim();
                if (w0) wCounts[w0] = (wCounts[w0] || 0) + 1;

                var ch0 = String(r.chain || '')
                    .toLowerCase()
                    .trim();
                if (ch0) chCounts[ch0] = (chCounts[ch0] || 0) + 1;

                if (isChief) {
                    var ip0 = String(r.ip || '').trim();
                    if (ip0) ipCounts[ip0] = (ipCounts[ip0] || 0) + 1;
                }
            });

            var wKeys = Object.keys(wCounts).sort(function (a, b) {
                return (wCounts[b] || 0) - (wCounts[a] || 0);
            });
            var chKeys = Object.keys(chCounts).sort(function (a, b) {
                return (chCounts[b] || 0) - (chCounts[a] || 0);
            });
            var ipKeys = Object.keys(ipCounts).sort(function (a, b) {
                return (ipCounts[b] || 0) - (ipCounts[a] || 0);
            });

            var currentCh = String(document.getElementById('qfChain')?.value || '')
                .toLowerCase()
                .trim();
            var currentIp = String(document.getElementById('qfIp')?.value || '').trim();

            var parts = [];

            if (chKeys.length > 1) {
                parts.push(
                    '<div style="min-width:220px;flex:1"><label class="tc-field-label"><i class="bi bi-diagram-3 me-1"></i>Rede</label><select class="tc-field-select" id="qfChain"><option value="">Todas</option>' +
                        chKeys
                            .map(function (ch) {
                                var sel = currentCh && currentCh === ch ? ' selected' : '';
                                return (
                                    '<option value="' +
                                    esc(ch) +
                                    '"' +
                                    sel +
                                    '>' +
                                    esc(chainLabel(ch)) +
                                    ' (' +
                                    esc(String(chCounts[ch] || 0)) +
                                    ')</option>'
                                );
                            })
                            .join('') +
                        '</select></div>',
                );
            }

            if (isChief) {
                if (ipKeys.length > 1) {
                    parts.push(
                        '<div style="min-width:180px;flex:1"><label class="tc-field-label"><i class="bi bi-hdd-network me-1"></i>IP</label><select class="tc-field-select" id="qfIp"><option value="">Todos</option>' +
                            ipKeys
                                .map(function (ip) {
                                    var sel = currentIp && currentIp === ip ? ' selected' : '';
                                    return (
                                        '<option value="' +
                                        esc(ip) +
                                        '"' +
                                        sel +
                                        '>' +
                                        esc(ip) +
                                        ' (' +
                                        esc(String(ipCounts[ip] || 0)) +
                                        ')</option>'
                                    );
                                })
                                .join('') +
                            '</select></div>',
                    );
                } else if (ipKeys.length === 1) {
                    parts.push(
                        '<span class="tc-wkpi-info"><span class="tc-wkpi-lbl"><i class="bi bi-hdd-network me-1"></i>IP</span><span class="tc-wkpi-cnt">' +
                            esc(ipKeys[0]) +
                            '</span></span>',
                    );
                }
            }

            host.innerHTML = parts.join('');
            host.querySelectorAll('#qfChain, #qfIp').forEach(function (el) {
                el.addEventListener('change', function () {
                    updateActiveFilterBadge();
                    renderPage(1);
                });
            });
        }

        // Carrega e exibe o relatório (reutilizado ao clicar em KPI sem ter carregado ainda)
        function loadAndShowReport() {
            loadReportData();
            var placeholder = document.getElementById('reportPlaceholder');
            var content = document.getElementById('reportContent');
            if (placeholder) placeholder.style.display = 'none';
            if (content) content.style.removeProperty('display');
            buildQuickFilters();
            updateActiveFilterBadge();
        }

        // Bind nos KPI cards de "Sua Carteira"
        document.querySelectorAll('.tc-wkpi[data-wallet-filter]').forEach(function (card) {
            card.addEventListener('click', function () {
                var mode = String(card.getAttribute('data-wallet-filter') || 'all');
                setTableFilterMode(mode);
                // Se relatório ainda não foi carregado, carrega automaticamente
                if (!dataLoaded) loadAndShowReport();
                // Rola suavemente até o relatório
                var reportEl = document.getElementById('reportContent') || document.getElementById('reportPlaceholder');
                if (reportEl) reportEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                renderPage(1);
            });
            card.addEventListener('keydown', function (ev) {
                if (ev.key !== 'Enter' && ev.key !== ' ') return;
                ev.preventDefault();
                card.click();
            });
        });

        document.getElementById('btnClearTableFilter')?.addEventListener('click', function () {
            try {
                ['qfWallet', 'qfIp', 'qfChain', 'fltContractQuery'].forEach(function (id) {
                    var el = document.getElementById(id);
                    if (!el) return;
                    if (el.tagName === 'SELECT') {
                        el.selectedIndex = 0;
                    } else {
                        el.value = '';
                    }
                });
                try {
                    document.getElementById('fltContractQuery')?.dispatchEvent(new Event('input'));
                } catch (_) {}
            } catch (_) {}
            // Reseta modo de filtro para "Todos"
            setTableFilterMode('all');
            // Limpa filtro de tipo (KPI) e estados visuais
            kpiFilter = null;
            document.querySelectorAll('.tc-wkpi[data-kpi-filter], .tc-wkpi[data-kpi-series]').forEach(function (c) {
                c.classList.remove('tc-wkpi--active');
            });
            document.querySelectorAll('.tc-top-page[data-top-page], .tc-ip-chip[data-ip-val]').forEach(function (c) {
                c.classList.remove('tc-chip--active');
            });
            selectedTopPages = [];
            selectedActionTypes = [];
            mainSelected = [];
            mainVisible = {};
            selectedWallets = [];
            setActiveTopPageUi();
            setActiveTopPageBadge();
            renderWalletLegend();
            setActiveActionUi();
            setActionsBadge();
            setWalletBoxVisible();
            setKpiActiveUi();
            if (dashboard) renderMainChart();
            buildQuickFilters();
            updateActiveFilterBadge();
            renderPage(1);
        });

        document.getElementById('pageSizeSel')?.addEventListener('change', function () {
            var v = parseInt(this.value, 10);
            if (Number.isFinite(v) && v > 0) {
                pageSize = v;
                renderPage(1);
            }
        });

        renderPage(1);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
