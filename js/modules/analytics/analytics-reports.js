/**
 * ================================================================================
 * ANALYTCS REPORTS MODULE - TOKENCAFE
 * ================================================================================
 * Mdulo para vsualzao de analytcs e relatros detalhados
 * ================================================================================
 */

class AnalytcsReports {
  constructor() {
    this.charts = {};
    this.data = {};
    this.tmeRange = "30d";
    this.sLoadng = false;

    this.init();
  }

  /**
   * ncalzao do mdulo
   */
  async init() {
    console.log(" inicializando Analytcs Reports...");

    this.setupEventLsteners();
    await this.loadAnalytcsData();
    this.renderSummaryCards();
    this.ntalzeCharts();
    this.renderTable();

    console.log(" Analytcs Reports inicializado");
  }

  /**
   * Confgurar event lsteners
   */
  setupEventLsteners() {
    // Seletor de perodo
    const tmeRangeSelector = document.getElementById("time-range-selector");
    if (tmeRangeSelector) {
      tmeRangeSelector.addEventListener("change", (e) => {
        this.tmeRange = e.target.value;
        this.refreshAnalytcs();
      });
    }

    // Controles de grfco
    const chartButtons = document.querySelectorAll(".chart-btn");
    chartButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const chartName = e.target.dataset.chart;
        const chartType = e.target.dataset.type;

        // Atualzar botes atvos
        const sblngs = e.target.parentElement.querySelectorAll(".chart-btn");
        sblngs.forEach((s) => s.classList.remove("active"));
        e.target.classList.add("active");

        // Atualzar grfco
        this.updateChartType(chartName, chartType);
      });
    });

    // Busca na tabela
    const tableSearch = document.getElementById("table-search");
    if (tableSearch) {
      tableSearch.addEventListener("input", (e) => {
        this.flterTable(e.target.value);
      });
    }

    // Ordenao da tabela
    const tableSort = document.getElementById("table-sort");
    if (tableSort) {
      tableSort.addEventListener("change", (e) => {
        this.sortTable(e.target.value);
      });
    }
    document.addEventListener("click", (e) => {
      const exportBtn = e.target.closest('[data-action="export-report"]');
      if (exportBtn) {
        this.exportReport?.();
        return;
      }
      const refreshBtn = e.target.closest('[data-action="refresh-analytics"]');
      if (refreshBtn) {
        this.refreshAnalytcs?.();
        return;
      }
      const detailBtn = e.target.closest('[data-action="view-advanced-analytics"]');
      if (detailBtn) {
        const sym = detailBtn.getAttribute("data-token-symbol") || detailBtn.dataset.tokenSymbol;
        this.vewAdvancedAnalytcs?.(sym);
      }
    });
    const closeBtn = document.getElementById("close-advanced-analytics");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        this.closeModal("advanced-analytics-modal");
      });
    }
  }

  /**
   * Carregar dados de analytcs
   */
  async loadAnalytcsData() {
    this.setLoadngState(true);

    try {
      // Smular carregamento de dados (substtur por AP real)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock data - substtur por dados reas da AP
      this.data = {
        summary: {
          totalTokens: 15,
          totalHolders: 1247,
          totalVolume: 2847392.5,
          totalTransactons: 8934,
          changes: {
            tokens: 25.5,
            holders: 12.3,
            volume: 8.7,
            transactons: 15.2,
          },
        },
        volumeData: {
          labels: this.generateDateLabels(),
          datasets: [
            {
              label: "Volume (USD)",
              data: this.generateVolumeData(),
              borderColor: "#8B4513",
              backgroundColor: "rgba(139, 69, 19, 0.1)",
              tenson: 0.4,
            },
          ],
        },
        holdersData: {
          labels: this.generateDateLabels(),
          datasets: [
            {
              label: "Holders",
              data: this.generateHoldersData(),
              borderColor: "#D2691E",
              backgroundColor: "rgba(210, 105, 30, 0.1)",
              fll: true,
              tenson: 0.4,
            },
          ],
        },
        typeDstrbuton: {
          labels: ["ERC-20", "ERC-721", "ERC-1155"],
          datasets: [
            {
              data: [65, 30, 5],
              backgroundColor: ["#8B4513", "#D2691E", "#F4A460"],
            },
          ],
        },
        topTokens: {
          labels: ["CafeToken", "MyNFT", "TestToken", "GameToken", "ArtToken"],
          datasets: [
            {
              label: "Volume",
              data: [850000, 420000, 280000, 180000, 120000],
              backgroundColor: "#8B4513",
            },
          ],
        },
        tokenDetals: [
          {
            name: "CafeToken",
            symbol: "CAFE",
            address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
            type: "ERC-20",
            holders: 450,
            volume: 850000,
            transactons: 2340,
            change: 12.5,
            created: "2024-01-15",
          },
          {
            name: "MyNFT Collecton",
            symbol: "MYNFT",
            address: "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
            type: "ERC-721",
            holders: 180,
            volume: 420000,
            transactons: 890,
            change: -5.2,
            created: "2024-01-20",
          },
          {
            name: "TestToken",
            symbol: "TEST",
            address: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
            type: "ERC-20",
            holders: 120,
            volume: 280000,
            transactons: 560,
            change: 8.7,
            created: "2024-01-10",
          },
        ],
      };
    } catch (error) {
      console.error(" Erro ao carregar analytcs:", error);
      this.showError("Erro ao carregar dados de analytcs");
    } finally {
      this.setLoadngState(false);
    }
  }

  /**
   * Renderzar cards de resumo
   */
  renderSummaryCards() {
    const { summary } = this.data;

    document.getElementById("total-tokens").textContent = summary.totalTokens;
    document.getElementById("total-holders").textContent = this.formatNumber(summary.totalHolders);
    document.getElementById("total-volume").textContent = this.formatCurrency(summary.totalVolume);
    document.getElementById("total-transactons").textContent = this.formatNumber(summary.totalTransactons);

    // Atualzar mudanas percentuas
    this.updateChangendcator("tokens-change", summary.changes.tokens);
    this.updateChangendcator("holders-change", summary.changes.holders);
    this.updateChangendcator("volume-change", summary.changes.volume);
    this.updateChangendcator("transactons-change", summary.changes.transactons);
  }

  /**
   * Atualzar ndcador de mudana
   */
  updateChangendcator(elementd, change) {
    const element = document.getElementById(elementd);
    if (!element) return;

    const sPostve = change >= 0;
    element.textContent = `${sPostve ? "+" : ""}${change.toFixed(1)}%`;
    element.className = `summary-change ${sPostve ? "postive" : "negative"}`;
  }

  /**
   * ncalzar grfcos
   */
  ntalzeCharts() {
    this.createVolumeChart();
    this.createHoldersChart();
    this.createTypeDstrbutonChart();
    this.createTopTokensChart();
  }

  /**
   * Crar grfco de volume
   */
  createVolumeChart() {
    const ctx = document.getElementById("volume-chart");
    if (!ctx) return;

    this.charts.volume = new Chart(ctx, {
      type: "line",
      data: this.data.volumeData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value),
            },
          },
        },
      },
    });
  }

  /**
   * Crar grfco de holders
   */
  createHoldersChart() {
    const ctx = document.getElementById("holders-chart");
    if (!ctx) return;

    this.charts.holders = new Chart(ctx, {
      type: "line",
      data: this.data.holdersData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  /**
   * Crar grfco de dstrbuo por tpo
   */
  createTypeDstrbutonChart() {
    const ctx = document.getElementById("type-dstrbuton-chart");
    if (!ctx) return;

    this.charts.typeDstrbuton = new Chart(ctx, {
      type: "doughnut",
      data: this.data.typeDstrbuton,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  /**
   * Crar grfco de top tokens
   */
  createTopTokensChart() {
    const ctx = document.getElementById("top-tokens-chart");
    if (!ctx) return;

    this.charts.topTokens = new Chart(ctx, {
      type: "bar",
      data: this.data.topTokens,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatCurrency(value),
            },
          },
        },
      },
    });
  }

  /**
   * Atualzar tpo de grfco
   */
  updateChartType(chartName, newType) {
    const chart = this.charts[chartName];
    if (!chart) return;

    chart.config.type = newType;
    chart.update();
  }

  /**
   * Renderzar tabela
   */
  renderTable() {
    const tbody = document.getElementById("analytcs-table-body");
    if (!tbody) return;

    tbody.innerHTML = this.data.tokenDetals
      .map(
        (token) => `
            <tr>
                <td>
                    <div class="token-nfo">
                        <strong>${token.name}</strong>
                        <div class="d-flex align-items-center gap-2">
                          <small>${token.symbol}</small>
                          ${
                            token.address
                              ? `
                            <button class="btn btn-sm btn-link p-0 text-muted" onclick="window.copyToClipboard('${token.address}')" title="Copiar Endereço">
                              <i class="bi bi-clipboard" style="font-size: 0.8rem;"></i>
                            </button>
                          `
                              : ""
                          }
                        </div>
                    </div>
                </td>
                <td><span class="token-type">${token.type}</span></td>
                <td>${this.formatNumber(token.holders)}</td>
                <td>${this.formatCurrency(token.volume)}</td>
                <td>${this.formatNumber(token.transactons)}</td>
                <td>
                    <span class="change-ndcator ${token.change >= 0 ? "postve" : "negatve"}">
                        ${token.change >= 0 ? "+" : ""}${token.change.toFixed(1)}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outlne" data-action="view-advanced-analytics" data-token-symbol="${token.symbol}">
                        <i class="bi bi-graph-up"></i> Detalhes
                    </button>
                </td>
            </tr>
        `,
      )
      .join("");
  }

  /**
   * Fltrar tabela
   */
  flterTable(searchTerm) {
    const rows = document.querySelectorAll("#analytics-table-body tr");
    const term = searchTerm.toLowerCase();

    rows.forEach((row) => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(term) ? "" : "none";
    });
  }

  /**
   * Ordenar tabela
   */
  sortTable(sortBy) {
    // mplementar ordenao da tabela
    console.log("Ordenando por:", sortBy);
  }

  /**
   * Ver analytcs avanado
   */
  vewAdvancedAnalytcs(tokenSymbol) {
    const modal = document.getElementById("advanced-analytics-modal");
    const content = document.getElementById("advanced-analytics-content");

    if (!modal || !content) return;

    // Encontrar dados do token
    const token = this.data.tokenDetals.find((t) => t.symbol === tokenSymbol) || { name: tokenSymbol, symbol: tokenSymbol, address: "" };

    content.innerHTML = `
            <div class="advanced-analytcs">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4>Analytics Detalhado - ${token.name} <small class="text-muted">(${token.symbol})</small></h4>
                    ${
                      token.address
                        ? `
                    <div class="input-group" style="max-width: 300px;">
                        <span class="input-group-text bg-dark border-secondary text-muted">Contrato</span>
                        <input type="text" class="form-control bg-dark text-white border-secondary form-control-sm" value="${token.address}" readonly>
                        <button class="btn btn-outline-secondary btn-sm" onclick="window.copyToClipboard('${token.address}')" title="Copiar Endereço">
                            <i class="bi bi-clipboard"></i>
                        </button>
                    </div>
                    `
                        : ""
                    }
                </div>
                
                <div class="row mb-4">
                    <div class="col-md-3">
                        <div class="card bg-dark border-secondary">
                            <div class="card-body text-center">
                                <h6 class="text-muted">Holders</h6>
                                <h3>${this.formatNumber(token.holders || 0)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-dark border-secondary">
                            <div class="card-body text-center">
                                <h6 class="text-muted">Volume</h6>
                                <h3>${this.formatCurrency(token.volume || 0)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-dark border-secondary">
                            <div class="card-body text-center">
                                <h6 class="text-muted">Transações</h6>
                                <h3>${this.formatNumber(token.transactons || 0)}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-3">
                        <div class="card bg-dark border-secondary">
                            <div class="card-body text-center">
                                <h6 class="text-muted">Variação</h6>
                                <h3 class="${(token.change || 0) >= 0 ? "text-success" : "text-danger"}">
                                    ${(token.change || 0) >= 0 ? "+" : ""}${token.change || 0}%
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="placeholder-chart text-center py-5 bg-dark rounded border border-secondary">
                    <i class="bi bi-graph-up display-1 text-muted opacity-25"></i>
                    <p class="mt-3 text-muted">Gráficos avançados de holders e transações em desenvolvimento</p>
                </div>
            </div>
        `;

    modal.style.display = "flex";
  }

  /**
   * Limpar dados (Resetar filtros e recarregar)
   */
  clearData() {
    this.tmeRange = "30d";
    const rangeSelector = document.getElementById("time-range-selector");
    if (rangeSelector) rangeSelector.value = "30d";

    const searchInput = document.getElementById("table-search");
    if (searchInput) searchInput.value = "";

    const sortSelect = document.getElementById("table-sort");
    if (sortSelect) sortSelect.value = "volume";

    this.refreshAnalytcs();
    this.showSuccess("Dados e filtros resetados com sucesso!");
  }

  /**
   * Exportar relatro
   */
  async exportReport() {
    try {
      // Smular exportao
      await new Promise((resolve) => setTimeout(resolve, 1000));
      this.showSuccess("Relatro exportado com sucesso!");
    } catch (error) {
      console.error(" Erro ao exportar:", error);
      this.showError("Erro ao exportar relatro");
    }
  }

  /**
   * Atualzar analytcs
   */
  async refreshAnalytcs() {
    await this.loadAnalytcsData();
    this.renderSummaryCards();

    // Atualzar grfcos
    Object.values(this.charts).forEach((chart) => {
      chart.update();
    });

    this.renderTable();
    this.showSuccess("Analytcs atualzados!");
  }

  /**
   * Gerar labels de data
   */
  generateDateLabels() {
    const days = this.tmeRange === "7d" ? 7 : this.tmeRange === "30d" ? 30 : 90;
    const labels = [];

    for (let i = days - 1; i >= 0; --i) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString("pt-BR", { month: "short", day: "numeric" }));
    }

    return labels;
  }

  /**
   * Gerar dados de volume
   */
  generateVolumeData() {
    const days = this.tmeRange === "7d" ? 7 : this.tmeRange === "30d" ? 30 : 90;
    return Array.from({ length: days }, () => Math.floor(Math.random() * 100000) + 10000);
  }

  /**
   * Gerar dados de holders
   */
  generateHoldersData() {
    const days = this.tmeRange === "7d" ? 7 : this.tmeRange === "30d" ? 30 : 90;
    let base = 1000;
    return Array.from({ length: days }, () => {
      base += Math.floor(Math.random() * 20) - 5;
      return Math.max(base, 0);
    });
  }

  /**
   * Defnr estado de loadng
   */
  setLoadngState(loadng) {
    this.sLoadng = loadng;
    const loadngEl = document.getElementById("analytics-loading");

    if (loadngEl) {
      loadngEl.style.display = loadng ? "block" : "none";
    }
  }

  /**
   * Fechar modal
   */
  closeModal(modald) {
    const modal = document.getElementById(modald);
    if (modal) {
      modal.style.display = "none";
    }
  }

  /**
   * Utltros
   */
  formatNumber(num) {
    return new Intl.NumberFormat("pt-BR").format(num);
  }

  formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  showSuccess(message) {
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify(String(message || ""), "success", { container });
        return;
      }
      console.log(message);
    } catch (_) {}
  }

  showError(message) {
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify(String(message || ""), "error", { container });
        return;
      }
      console.error(message);
    } catch (_) {}
  }
}

// Funes globas para compatbldade
window.refreshAnalytcs = () => {
  if (window.analytcsReports) {
    window.analytcsReports.refreshAnalytcs();
  }
};

// Alias para corresponder ao HTML (onclick="refreshAnalytics()")
window.refreshAnalytics = () => {
  if (window.analytcsReports) {
    window.analytcsReports.refreshAnalytcs();
  }
};

window.exportReport = () => {
  if (window.analytcsReports) {
    window.analytcsReports.exportReport();
  }
};

window.closeModal = (modald) => {
  if (window.analytcsReports) {
    window.analytcsReports.closeModal(modald);
  }
};

// ncalzar quando DOM estver pronto
document.addEventListener("DOMContentLoaded", () => {
  window.analytcsReports = new AnalytcsReports();
});

console.log(" Analytcs Reports Module carregado");
