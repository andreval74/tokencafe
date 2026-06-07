/**
 * analytics-reports.js
 * Dashboard de analytics dos tokens criados via TokenCafe.
 *
 * Fonte primária: localStorage via token-storage.js (dados reais imediatos).
 * Fonte secundária: TheGraph subgraph (holders, volume on-chain, DailyStats).
 *   Ativo quando o subgraph estiver deployado e os endpoints configurados em SUBGRAPH_ENDPOINTS.
 *   Fallback automático para localStorage se o subgraph retornar erro ou não estiver configurado.
 */

// token-storage.js é carregado globalmente pelo footer; acessa via window.tcTokenStorage
// Retorna tokens filtrados pela carteira conectada (undefined = todos, null = sem createdBy)
const getTokens = (wallet = undefined) => window.tcTokenStorage?.getTokens?.(wallet) ?? [];

// ── TheGraph — Endpoints por chainId ─────────────────────────────────────────
// Preencher com os endpoints reais após deploy no TheGraph Studio.
// Formato Studio: https://api.studio.thegraph.com/query/<ID>/<nome>/version/latest
const SUBGRAPH_ENDPOINTS = {
    56:    "https://api.studio.thegraph.com/query/STUDIO_ID/tokencafe/version/latest",
    1:     "https://api.studio.thegraph.com/query/STUDIO_ID/tokencafe-mainnet/version/latest",
    137:   "https://api.studio.thegraph.com/query/STUDIO_ID/tokencafe-polygon/version/latest",
    42161: "https://api.studio.thegraph.com/query/STUDIO_ID/tokencafe-arbitrum/version/latest",
};

// Retorna true apenas se o endpoint estiver preenchido (não é o placeholder)
const _isSubgraphConfigured = (chainId) =>
    !!SUBGRAPH_ENDPOINTS[chainId] && !SUBGRAPH_ENDPOINTS[chainId].includes("STUDIO_ID");

/**
 * Executa uma query GraphQL contra o endpoint do subgraph da rede especificada.
 * Retorna o objeto `data` ou lança erro.
 */
async function _querySubgraph(chainId, query, variables = {}) {
    const url = SUBGRAPH_ENDPOINTS[chainId];
    if (!url) throw new Error(`[TC Analytics] Sem endpoint para chainId ${chainId}`);

    const res = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ query, variables }),
    });

    if (!res.ok) throw new Error(`[TC Analytics] Subgraph HTTP ${res.status}`);

    const json = await res.json();
    if (json.errors?.length) throw new Error(`[TC Analytics] Subgraph error: ${json.errors[0].message}`);
    return json.data;
}

/**
 * Busca dados on-chain do subgraph para a carteira e rede especificadas.
 *
 * @param {number} chainId       - ChainId da rede (ex: 56)
 * @param {string} walletAddress - Endereço do criador (lowercase)
 * @param {number} days          - Janela de dias para DailyStats (padrão 30)
 * @returns {{ tokens: Array, dailyStats: Array, totalFees: string } | null}
 *   null quando subgraph não configurado ou inacessível.
 */
async function fetchSubgraphData(chainId, walletAddress, days = 30) {
    if (!_isSubgraphConfigured(chainId)) return null;

    // Data de corte no formato YYYY-MM-DD
    const cutoffDate = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

    const query = `
        query AnalyticsDashboard($creator: String!, $cutoff: String!) {
          creator(id: $creator) {
            totalTokens
            totalFees
            firstCreatedAt
            lastCreatedAt
          }
          tokens(
            where: { creator: $creator }
            orderBy: createdAt
            orderDirection: desc
            first: 100
          ) {
            id
            name
            symbol
            feePaid
            currency
            createdAt
            transactionHash
            network
            referrer
          }
          dailyStats(
            where: { date_gte: $cutoff }
            orderBy: date
            orderDirection: asc
            first: 366
          ) {
            date
            tokensCreated
            totalFees
            uniqueCreators
          }
        }
    `;

    const data = await _querySubgraph(chainId, query, {
        creator: walletAddress.toLowerCase(),
        cutoff:  cutoffDate,
    });

    return {
        tokens:     data.tokens     ?? [],
        dailyStats: data.dailyStats ?? [],
        totalFees:  data.creator?.totalFees ?? "0",
        creatorStats: data.creator ?? null,
    };
}

// Obtém a carteira conectada no momento (mesma ordem de prioridade do token-storage.js)
function _getConnectedWallet() {
    try {
        return (
            window.walletConnector?.getStatus?.()?.account ||
            window.ethereum?.selectedAddress ||
            localStorage.getItem('tokencafe_wallet_address') ||
            null
        );
    } catch (_) { return null; }
}

// ── Utilitários de formatação ─────────────────────────────────────────────────
const fmtNumber   = (n) => new Intl.NumberFormat("pt-BR").format(n);
const cssVar      = (name, fallback = "") => {
    try { return window.getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback; }
    catch (_) { return fallback; }
};
const esc = (str) => String(str ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Nomes de redes por chainId ────────────────────────────────────────────────
const CHAIN_NAMES = {
    1:     "Ethereum",
    56:    "BSC",
    97:    "BSC Testnet",
    137:   "Polygon",
    43114: "Avalanche",
    42161: "Arbitrum",
    8453:  "Base",
};

// ── Paleta de cores para gráficos (em sincronia com o tema) ───────────────────
function getTheme() {
    return {
        primary:   cssVar("--tokencafe-primary",         "#f85d23"),
        primary10: cssVar("--tokencafe-primary-10",      "rgba(248,93,35,0.10)"),
        primary30: cssVar("--tokencafe-primary-30",      "rgba(248,93,35,0.30)"),
        info:      cssVar("--tokencafe-info",            "#3b82f6"),
        success:   cssVar("--tokencafe-success",         "#10b981"),
        warning:   cssVar("--tokencafe-warning",         "#fbbf24"),
        purple:    "rgba(168,85,247,0.8)",
        grid:      cssVar("--tokencafe-white-12",        "rgba(255,255,255,0.12)"),
        textMuted: cssVar("--tokencafe-text-secondary",  "rgba(255,255,255,0.7)"),
    };
}

// ── Classe principal ──────────────────────────────────────────────────────────
class AnalyticsReports {
    constructor() {
        this.charts         = {};
        this.tokens         = [];
        this.filtered       = [];
        this.timeRange      = "30d";
        this.sortBy         = "created";
        this.isLoading      = false;
        // Dados do subgraph — null enquanto não carregados
        this.subgraphData   = null;
        this.usingSubgraph  = false;
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.render();
    }

    // ── Carregamento de dados ─────────────────────────────────────────────────
    async loadData() {
        this.setLoading(true);
        try {
            // Fonte primária: localStorage (dados locais imediatos)
            const wallet  = _getConnectedWallet();
            this.wallet   = wallet;
            this.tokens   = getTokens(wallet);
            this.filtered = [...this.tokens];

            // Fonte secundária: TheGraph subgraph (dados on-chain)
            // Tenta para a rede do primeiro token da lista (ou chainId do estado global)
            this.subgraphData  = null;
            this.usingSubgraph = false;

            if (wallet && this.tokens.length > 0) {
                const chainId = this.tokens[0]?.chainId;
                if (chainId && _isSubgraphConfigured(chainId)) {
                    try {
                        const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[this.timeRange] ?? 30;
                        this.subgraphData  = await fetchSubgraphData(chainId, wallet, days);
                        this.usingSubgraph = !!this.subgraphData;
                    } catch (subErr) {
                        // Falha silenciosa — fallback para localStorage já está em this.tokens
                        console.warn("[TC Analytics] Subgraph indisponível, usando localStorage:", subErr.message);
                        this.subgraphData  = null;
                        this.usingSubgraph = false;
                    }
                }
            }
        } catch (e) {
            console.error("[TC Analytics] Erro ao carregar tokens:", e);
            this.tokens        = this.filtered = [];
            this.wallet        = null;
            this.subgraphData  = null;
            this.usingSubgraph = false;
        } finally {
            this.setLoading(false);
        }
    }

    // ── Render completo ───────────────────────────────────────────────────────
    render() {
        this.renderSummary();
        this.renderCharts();
        this.renderTable();
    }

    // ── Resumo da Carteira (chips estilo logs) ───────────────────────────────
    renderSummary() {
        const total  = this.tokens.length;
        const cutoff = this.getCutoffMs();
        const recent = this.tokens.filter(t => new Date(t.savedAt).getTime() > cutoff).length;

        // Endereço truncado da carteira ativa
        const walletEl = document.getElementById("summary-wallet");
        if (walletEl) {
            walletEl.textContent = this.wallet
                ? `${this.wallet.slice(0, 10)}…${this.wallet.slice(-6)}`
                : "Nenhuma carteira conectada";
        }

        // Chips de contagem
        this.setText("total-tokens",  fmtNumber(total));   // badge histórico no topo
        this.setText("kpi-all",       fmtNumber(total));   // chip Todos
        this.setText("kpi-period",    fmtNumber(recent));  // chip No período

        // Chip informativo: intervalo de datas do período selecionado
        this.setText("kpi-period-label", this.getPeriodLabel());

        // Badge de fonte de dados: "Dados ao vivo" (TheGraph) vs "Dados locais" (localStorage)
        this._renderDataSourceBadge();
    }

    /** Injeta ou atualiza o badge de fonte de dados no KPI row */
    _renderDataSourceBadge() {
        const row = document.getElementById("analyticsKpiRow");
        if (!row) return;

        const existingBadge = document.getElementById("kpi-data-source-badge");
        if (existingBadge) existingBadge.remove();

        const badge = document.createElement("span");
        badge.id = "kpi-data-source-badge";

        if (this.usingSubgraph) {
            badge.className   = "tc-wkpi-info ms-auto";
            badge.title       = "Dados on-chain via TheGraph subgraph";
            badge.innerHTML   = `
                <span class="tc-wkpi-lbl" style="color:#10b981">
                  <i class="bi bi-wifi me-1"></i>Dados ao vivo
                </span>`;
        } else {
            badge.className   = "tc-wkpi-info ms-auto";
            badge.title       = "Dados locais do dispositivo (localStorage). Subgraph não configurado ou indisponível.";
            badge.innerHTML   = `
                <span class="tc-wkpi-lbl" style="color:rgba(255,255,255,0.45)">
                  <i class="bi bi-hdd me-1"></i>Dados locais
                </span>`;
        }

        // Insere antes do chip de período (último item antes do label de datas)
        const periodLabel = row.querySelector(".tc-wkpi-info.ms-auto");
        if (periodLabel) {
            // Remove o ms-auto do período para não empurrar o badge
            periodLabel.classList.remove("ms-auto");
            row.insertBefore(badge, periodLabel);
        } else {
            row.appendChild(badge);
        }
    }

    // Devolve o rótulo legível do período, ex: "27/04 → 27/05"
    getPeriodLabel() {
        const days  = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[this.timeRange] ?? 30;
        const start = new Date(Date.now() - days * 86_400_000);
        const end   = new Date();
        const fmt   = (d) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        return `${fmt(start)} → ${fmt(end)}`;
    }

    getCutoffMs() {
        const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[this.timeRange] ?? 30;
        return Date.now() - days * 86_400_000;
    }

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value);
    }

    setChangeBadge(id, recent, prev) {
        const el = document.getElementById(id);
        if (!el) return;
        if (prev === 0 && recent === 0) { el.textContent = "—"; el.className = "summary-change"; return; }
        const pct   = prev === 0 ? 100 : ((recent - prev) / prev) * 100;
        const isPos = pct >= 0;
        el.textContent = `${isPos ? "+" : ""}${pct.toFixed(1)}%`;
        el.className   = `summary-change ${isPos ? "positive" : "negative"}`;
    }

    // ── Gráficos ──────────────────────────────────────────────────────────────
    renderCharts() {
        if (typeof Chart === "undefined") {
            console.warn("[TC Analytics] Chart.js não carregado ainda.");
            return;
        }
        this.destroyCharts();
        const theme   = getTheme();
        const baseOpts = {
            responsive:          true,
            maintainAspectRatio: false,
            plugins:             { legend: { display: false } },
        };
        const axes = (currency = false) => ({
            x: { ticks: { color: theme.textMuted }, grid: { color: theme.grid } },
            y: {
                beginAtZero: true,
                ticks: { color: theme.textMuted, callback: currency ? (v) => `$${v}` : undefined },
                grid: { color: theme.grid },
            },
        });

        // — Gráfico 1: tokens criados por período (dados reais) ———————————————
        const { labels: tLabels, data: tData } = this.buildCreationTimeline();
        const volCtx = document.getElementById("volume-chart");
        if (volCtx) {
            this.charts.volume = new Chart(volCtx, {
                type: "line",
                data: {
                    labels:   tLabels,
                    datasets: [{
                        label:           "Tokens criados",
                        data:            tData,
                        borderColor:     theme.primary,
                        backgroundColor: theme.primary10,
                        tension:         0.4,
                        fill:            true,
                    }],
                },
                options: { ...baseOpts, scales: axes(false) },
            });
        }

        // — Gráfico 2: tokens criados por período via subgraph (ou placeholder) ─
        // Quando o subgraph está ativo, usa DailyStats para mostrar tokens criados
        // por todos os usuários na plataforma (não só os do localStorage).
        // Quando indisponível, mantém Array(n).fill(null) como antes da Fase 3.
        const holdersCtx = document.getElementById("holders-chart");
        if (holdersCtx) {
            const { subgraphLabels, subgraphData: sgData } = this._buildSubgraphTimeline(tLabels);
            const hasSubgraphPoints = sgData.some(v => v !== null);

            this.charts.holders = new Chart(holdersCtx, {
                type: "line",
                data: {
                    labels:   subgraphLabels.length ? subgraphLabels : tLabels,
                    datasets: [{
                        label:           hasSubgraphPoints ? "Tokens na plataforma (on-chain)" : "Holders (on-chain)",
                        data:            hasSubgraphPoints ? sgData : Array(tLabels.length).fill(null),
                        borderColor:     theme.warning,
                        backgroundColor: theme.primary10,
                        tension:         0.4,
                        fill:            true,
                    }],
                },
                options: { ...baseOpts, scales: axes(false) },
            });
        }

        // — Gráfico 3: distribuição por rede (dados reais do chainId) ——————————
        const { chainLabels, chainCounts, chainColors } = this.buildChainDistribution(theme);
        const distCtx = document.getElementById("type-distribution-chart");
        if (distCtx) {
            this.charts.typeDistribution = new Chart(distCtx, {
                type: "doughnut",
                data: {
                    labels:   chainLabels,
                    datasets: [{ data: chainCounts, backgroundColor: chainColors }],
                },
                options: {
                    ...baseOpts,
                    plugins: { legend: { display: true, position: "bottom", labels: { color: theme.textMuted } } },
                },
            });
        }

        // — Gráfico 4: top tokens por taxa paga (subgraph) ou recência (localStorage) ──
        const topCtx = document.getElementById("top-tokens-chart");
        if (topCtx) {
            // Quando subgraph ativo: ordena pelos tokens com maior feePaid (BigInt como string)
            const useOnChain  = this.usingSubgraph && this.subgraphData?.tokens?.length;
            const sourceTokens = useOnChain ? this.subgraphData.tokens : this.tokens;
            const top5 = useOnChain
                ? [...sourceTokens]
                      .sort((a, b) => (BigInt(b.feePaid || "0") > BigInt(a.feePaid || "0") ? 1 : -1))
                      .slice(0, 5)
                : sourceTokens.slice(0, 5);

            // Valor do eixo Y: feePaid em ETH/BNB (18 decimais) ou recência como índice
            const yData = useOnChain
                ? top5.map(t => {
                      try { return Number(BigInt(t.feePaid || "0")) / 1e18; }
                      catch (_) { return 0; }
                  })
                : top5.map((_, i) => top5.length - i);

            this.charts.topTokens = new Chart(topCtx, {
                type: "bar",
                data: {
                    labels:   top5.map(t => t.symbol || t.name || "?"),
                    datasets: [{
                        label:           useOnChain ? "Taxa paga (BNB/ETH)" : "Recência",
                        data:            yData,
                        backgroundColor: theme.primary30,
                        borderColor:     theme.primary,
                        borderWidth:     1,
                    }],
                },
                options: { ...baseOpts, scales: axes(useOnChain) },
            });
        }
    }

    /**
     * Constrói série temporal a partir dos DailyStats do subgraph.
     * Retorna labels e dados alinhados com o período selecionado.
     * Se não houver dados do subgraph, retorna arrays vazios (fallback para null[]).
     */
    _buildSubgraphTimeline(baseLabels) {
        if (!this.usingSubgraph || !this.subgraphData?.dailyStats?.length) {
            return { subgraphLabels: [], subgraphData: [] };
        }

        const statsMap = new Map();
        for (const stat of this.subgraphData.dailyStats) {
            statsMap.set(stat.date, stat.tokensCreated);
        }

        const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[this.timeRange] ?? 30;
        const labels = [];
        const data   = [];

        for (let i = days - 1; i >= 0; i--) {
            const d       = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            labels.push(d.toLocaleDateString("pt-BR", { month: "short", day: "numeric" }));
            data.push(statsMap.get(dateStr) ?? 0);
        }

        return { subgraphLabels: labels, subgraphData: data };
    }

    buildCreationTimeline() {
        const days   = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[this.timeRange] ?? 30;
        const labels = [];
        const data   = [];

        for (let i = days - 1; i >= 0; i--) {
            const d      = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            labels.push(d.toLocaleDateString("pt-BR", { month: "short", day: "numeric" }));
            data.push(this.tokens.filter(t => t.savedAt?.slice(0, 10) === dateStr).length);
        }

        return { labels, data };
    }

    buildChainDistribution(theme) {
        const map = {};
        this.tokens.forEach(t => {
            const name = CHAIN_NAMES[t.chainId] ?? `Chain ${t.chainId}`;
            map[name]  = (map[name] ?? 0) + 1;
        });

        const palette = [theme.primary, theme.warning, theme.info, theme.success, theme.purple];
        const entries = Object.entries(map);

        if (entries.length === 0) {
            return { chainLabels: ["Nenhum token"], chainCounts: [1], chainColors: [theme.primary10] };
        }

        return {
            chainLabels: entries.map(([k]) => k),
            chainCounts: entries.map(([, v]) => v),
            chainColors: entries.map((_, i) => palette[i % palette.length]),
        };
    }

    destroyCharts() {
        Object.values(this.charts).forEach(c => c?.destroy?.());
        this.charts = {};
    }

    updateChartType(chartName, newType) {
        const chart = this.charts[chartName];
        if (!chart) return;
        chart.config.type = newType;
        chart.update();
    }

    // ── Tabela ────────────────────────────────────────────────────────────────
    renderTable() {
        const tbody = document.getElementById("analytics-table-body");
        if (!tbody) return;

        if (this.filtered.length === 0) {
            const msg = this.tokens.length === 0
                ? `<i class="bi bi-inbox me-2"></i>Nenhum token registrado. <a href="index.php?page=contrato">Crie seu primeiro token.</a>`
                : `<i class="bi bi-search me-2"></i>Nenhum resultado para esse filtro.`;
            tbody.innerHTML = `<tr><td colspan="7" class="text-center tc-status-text py-4">${msg}</td></tr>`;
            return;
        }

        tbody.innerHTML = this.sortTokens(this.filtered).map(t => this.renderRow(t)).join("");
    }

    renderRow(token) {
        const chainName = CHAIN_NAMES[token.chainId] ?? `Chain ${token.chainId}`;
        const date      = token.savedAt ? new Date(token.savedAt).toLocaleDateString("pt-BR") : "—";
        const explorer  = token.explorerUrl
            ? `<a href="${esc(token.explorerUrl)}" target="_blank" rel="noopener" class="tc-icon-btn-ds tc-action-info" title="Ver no explorer"><i class="bi bi-box-arrow-up-right"></i></a>`
            : "";
        const copyBtn   = token.address
            ? `<button class="tc-icon-btn-ds tc-action-copy" onclick="navigator.clipboard?.writeText?.('${esc(token.address)}')" title="Copiar endereço"><i class="bi bi-clipboard"></i></button>`
            : "";

        // Busca dados on-chain do subgraph (pelo endereço do token)
        const onChain = this.subgraphData?.tokens?.find(
            t => t.id?.toLowerCase() === token.address?.toLowerCase()
        );

        let feePaidCell = '<span class="tc-status-text">—</span>';
        if (onChain?.feePaid) {
            try {
                const bnbVal = (Number(BigInt(onChain.feePaid)) / 1e18).toFixed(4);
                feePaidCell  = `<span title="Taxa paga on-chain">${bnbVal} BNB</span>`;
            } catch (_) { /* mantém "—" */ }
        }

        return `
            <tr>
              <td>
                <div class="token-info">
                  <strong>${esc(token.name)}</strong>
                  <div class="d-flex align-items-center gap-1 mt-1">
                    <span class="tc-status-text tc-text-sm">${esc(token.symbol)}</span>
                    ${copyBtn}
                  </div>
                </div>
              </td>
              <td><span class="token-type">${esc(chainName)}</span></td>
              <td class="tc-status-text">—</td>
              <td>${feePaidCell}</td>
              <td class="tc-status-text">—</td>
              <td class="tc-status-text">${date}</td>
              <td>
                <div class="d-flex gap-1">
                  ${explorer}
                  <button class="tc-icon-btn-ds tc-action-info" data-action="view-advanced-analytics" data-token-symbol="${esc(token.symbol)}" title="Detalhes">
                    <i class="bi bi-graph-up"></i>
                  </button>
                </div>
              </td>
            </tr>`;
    }

    sortTokens(tokens) {
        return [...tokens].sort((a, b) => {
            if (this.sortBy === "created")      return new Date(b.savedAt || 0) - new Date(a.savedAt || 0);
            if (this.sortBy === "holders")      return (b.symbol || "").localeCompare(a.symbol || "");
            if (this.sortBy === "volume")       return (b.name || "").localeCompare(a.name || "");
            if (this.sortBy === "transactions") return (b.chainId || 0) - (a.chainId || 0);
            return 0;
        });
    }

    filterTable(term) {
        const lower   = term.toLowerCase();
        this.filtered = this.tokens.filter(t =>
            (t.name    || "").toLowerCase().includes(lower) ||
            (t.symbol  || "").toLowerCase().includes(lower) ||
            (t.address || "").toLowerCase().includes(lower)
        );
        this.renderTable();
    }

    // ── Filtro por chip (Todos / No período) ──────────────────────────────────
    applyChipFilter(mode) {
        // Atualizar estado visual dos chips
        document.querySelectorAll("[data-analytics-filter]").forEach(btn => {
            const isActive = btn.dataset.analyticsFilter === mode;
            btn.classList.toggle("tc-wkpi--active", isActive);
            // Propagar cor ativa da variante do chip
            ["tc-wkpi-chip--green", "tc-wkpi-chip--blue", "tc-wkpi-chip--amber"].forEach(cls => {
                if (btn.classList.contains(cls)) btn.classList.toggle(cls.replace("chip--", "chip--") + " tc-wkpi--active", false);
            });
        });

        // Aplicar filtro de dados
        if (mode === "period") {
            const cutoff  = this.getCutoffMs();
            this.filtered = this.tokens.filter(t => new Date(t.savedAt).getTime() > cutoff);
        } else {
            this.filtered = [...this.tokens]; // "all" — sem filtro de data
        }

        // Limpar busca textual ao trocar o modo
        const searchEl = document.getElementById("table-search");
        if (searchEl) searchEl.value = "";

        this.renderTable();
    }

    // ── Modal de analytics avançado ───────────────────────────────────────────
    showAdvancedAnalytics(symbol) {
        const token   = this.tokens.find(t => t.symbol === symbol) ?? { name: symbol, symbol, address: "" };
        const modal   = document.getElementById("advanced-analytics-modal");
        const content = document.getElementById("advanced-analytics-content");
        if (!modal || !content) return;

        const chainName = CHAIN_NAMES[token.chainId] ?? (token.chainId ? `Chain ${token.chainId}` : "—");
        const date      = token.savedAt ? new Date(token.savedAt).toLocaleDateString("pt-BR") : "—";
        const addrBlock = token.address ? `
            <div class="tc-field mb-3">
              <label class="tc-field-label">Endereço do Contrato</label>
              <div class="d-flex gap-2">
                <input type="text" class="tc-field-input tc-field-input--mono flex-grow-1" value="${esc(token.address)}" readonly>
                <button class="tc-icon-btn-ds tc-action-copy flex-shrink-0"
                        onclick="navigator.clipboard?.writeText?.('${esc(token.address)}')"
                        title="Copiar endereço">
                  <i class="bi bi-clipboard"></i>
                </button>
                ${token.explorerUrl
                    ? `<a href="${esc(token.explorerUrl)}" target="_blank" rel="noopener"
                          class="tc-icon-btn-ds tc-action-info flex-shrink-0" title="Ver no explorer">
                         <i class="bi bi-box-arrow-up-right"></i>
                       </a>`
                    : ""}
              </div>
            </div>` : "";

        // Busca dados on-chain deste token no subgraph (pelo endereço)
        const onChainToken = this.subgraphData?.tokens?.find(
            t => t.id?.toLowerCase() === token.address?.toLowerCase()
        );

        // Número de transfers indexados (proxy de transações)
        const txCount = onChainToken ? "ver no explorer" : "—";

        // Taxa paga formatada
        let feePaidFmt = "—";
        if (onChainToken?.feePaid) {
            try {
                const bnbVal = Number(BigInt(onChainToken.feePaid)) / 1e18;
                feePaidFmt   = bnbVal.toFixed(4) + " BNB";
            } catch (_) { feePaidFmt = onChainToken.feePaid; }
        }

        // Referrer truncado
        const referrerRaw = onChainToken?.referrer;
        const referrerFmt = referrerRaw && referrerRaw !== "0x0000000000000000000000000000000000000000"
            ? `${referrerRaw.slice(0, 8)}…${referrerRaw.slice(-6)}`
            : "Sem indicador";

        // Bloco de dados on-chain ou placeholder da Fase 3
        const onChainBlock = onChainToken
            ? `<div class="tc-modal-details-box mt-3">
                 <div class="tcd-card-head mb-2">
                   <div class="tcd-card-head-icon--blue"><i class="bi bi-wifi"></i></div>
                   <div class="flex-grow-1">
                     <h3 style="color:#60a5fa">Dados on-chain</h3>
                     <p class="tc-status-text" style="font-size:0.67rem;margin:0">via TheGraph Subgraph</p>
                   </div>
                 </div>
                 <div class="row g-2">
                   <div class="col-6">
                     <div class="tc-field-label">Taxa paga</div>
                     <div class="fw-bold">${esc(feePaidFmt)}</div>
                   </div>
                   <div class="col-6">
                     <div class="tc-field-label">Transações</div>
                     <div class="fw-bold">${esc(txCount)}</div>
                   </div>
                   <div class="col-12">
                     <div class="tc-field-label">Indicador</div>
                     <div class="fw-bold" style="font-family:monospace;font-size:0.8rem">${esc(referrerFmt)}</div>
                   </div>
                 </div>
               </div>`
            : `<div class="tcd-card text-center py-4 mt-3">
                 <i class="bi bi-graph-up-arrow display-6 tc-status-text opacity-50"></i>
                 <p class="tc-status-text mt-3 mb-1">
                   Dados on-chain (holders, volume, transações) disponíveis após deploy do subgraph TheGraph.
                 </p>
                 ${token.explorerUrl
                     ? `<a href="${esc(token.explorerUrl)}" target="_blank" rel="noopener" class="tc-btn-secondary-ds px-3 py-2 mt-2 d-inline-flex align-items-center gap-2 text-decoration-none">
                          <i class="bi bi-box-arrow-up-right"></i>Ver no Explorer
                        </a>`
                     : ""}
               </div>`;

        content.innerHTML = `
            <div class="advanced-analytics">
              <h4 class="mb-3">${esc(token.name)} <span class="tc-status-text tc-text-sm">(${esc(token.symbol)})</span></h4>

              <div class="analytics-summary mb-4">
                <div class="summary-card">
                  <div class="summary-icon"><i class="bi bi-diagram-3"></i></div>
                  <div class="summary-content"><h3>${esc(chainName)}</h3><p>Rede</p></div>
                </div>
                <div class="summary-card">
                  <div class="summary-icon"><i class="bi bi-calendar-check"></i></div>
                  <div class="summary-content"><h3>${date}</h3><p>Criado em</p></div>
                </div>
                <div class="summary-card">
                  <div class="summary-icon"><i class="bi bi-people"></i></div>
                  <div class="summary-content"><h3>—</h3><p>Holders</p></div>
                </div>
                <div class="summary-card">
                  <div class="summary-icon"><i class="bi bi-arrow-repeat"></i></div>
                  <div class="summary-content"><h3>${esc(txCount)}</h3><p>Transações</p></div>
                </div>
              </div>

              ${addrBlock}
              ${onChainBlock}
            </div>`;

        modal.style.display = "flex";
    }

    closeModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) el.style.display = "none";
    }

    // ── Exportar relatório como CSV ───────────────────────────────────────────
    exportReport() {
        const rows = [
            ["Nome", "Símbolo", "Endereço", "Rede", "ChainId", "Criado em", "Explorer"],
            ...this.tokens.map(t => [
                t.name, t.symbol, t.address,
                CHAIN_NAMES[t.chainId] ?? t.chainId,
                t.chainId,
                t.savedAt ? new Date(t.savedAt).toLocaleDateString("pt-BR") : "",
                t.explorerUrl ?? "",
            ]),
        ];

        const csv  = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
        const url  = URL.createObjectURL(blob);
        const a    = Object.assign(document.createElement("a"), {
            href:     url,
            download: `tokencafe-analytics-${new Date().toISOString().slice(0, 10)}.csv`,
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showToast("Relatório exportado como CSV.", "success");
    }

    // ── Atualizar completo ────────────────────────────────────────────────────
    async refresh() {
        await this.loadData();
        this.filtered = [...this.tokens];
        this.render();
    }

    // ── Limpar filtros ────────────────────────────────────────────────────────
    clearData() {
        this.timeRange = "30d";
        this.sortBy    = "created";

        const r = document.getElementById("time-range-selector");
        if (r) r.value = "30d";
        const s = document.getElementById("table-search");
        if (s) s.value = "";
        const o = document.getElementById("table-sort");
        if (o) o.value = "created";

        // Resetar chip ativo para "Todos"
        document.querySelectorAll("[data-analytics-filter]").forEach(btn => {
            btn.classList.toggle("tc-wkpi--active", btn.dataset.analyticsFilter === "all");
        });

        this.filtered = [...this.tokens];
        this.render();
        this.showToast("Filtros resetados.", "success");
    }

    // ── Estado de carregamento ────────────────────────────────────────────────
    setLoading(state) {
        this.isLoading = state;
        document.getElementById("analytics-loading")?.classList.toggle("d-none", !state);
    }

    // ── Notificação ───────────────────────────────────────────────────────────
    showToast(msg, type = "success") {
        if (typeof window.notify === "function") { window.notify(msg, type); return; }
        console.log(`[TC Analytics] ${msg}`);
    }

    // ── Event listeners ───────────────────────────────────────────────────────
    setupEventListeners() {
        document.getElementById("time-range-selector")?.addEventListener("change", e => {
            this.timeRange = e.target.value;
            this.refresh();
        });

        document.querySelectorAll(".chart-btn").forEach(btn => {
            btn.addEventListener("click", e => {
                const chartName = e.target.dataset.chart;
                const chartType = e.target.dataset.type;
                e.target.parentElement.querySelectorAll(".chart-btn").forEach(s => s.classList.remove("active"));
                e.target.classList.add("active");
                this.updateChartType(chartName, chartType);
            });
        });

        document.getElementById("table-search")?.addEventListener("input", e => this.filterTable(e.target.value));
        document.getElementById("table-sort")?.addEventListener("change", e => {
            this.sortBy = e.target.value;
            this.renderTable();
        });

        // Botão único de clique para ações delegadas
        document.addEventListener("click", e => {
            if (e.target.closest('[data-action="export-report"]'))     { this.exportReport(); return; }
            if (e.target.closest('[data-action="refresh-analytics"]')) { this.refresh();      return; }

            // Chips de filtro da carteira (Todos / No período)
            const chip = e.target.closest('[data-analytics-filter]');
            if (chip) { this.applyChipFilter(chip.dataset.analyticsFilter); return; }

            const detBtn = e.target.closest('[data-action="view-advanced-analytics"]');
            if (detBtn) this.showAdvancedAnalytics(detBtn.dataset.tokenSymbol);
        });

        document.getElementById("close-advanced-analytics")?.addEventListener("click", () => this.closeModal("advanced-analytics-modal"));
        document.getElementById("btnClearData")?.addEventListener("click",      () => this.clearData());
        document.getElementById("btnClearAnalytics")?.addEventListener("click", () => this.clearData());

        // Reagir a novos tokens registrados em outras abas/módulos
        document.addEventListener("tc:tokens-updated",     () => this.refresh());

        // Reagir à troca ou desconexão de carteira — recarrega apenas os tokens da nova wallet
        document.addEventListener("tc:wallet-changed",     () => this.refresh());
        document.addEventListener("tc:wallet-connected",   () => this.refresh());
        document.addEventListener("tc:wallet-disconnected", () => this.refresh());
    }
}

// ── Boot ──────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    window.analyticsReports = new AnalyticsReports();
    await window.analyticsReports.init();
});
