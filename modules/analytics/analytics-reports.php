  <?php
    $pageTitle = "Analytics Reports - TokenCafe";
    $pageDescription = "Acompanhe o desempenho dos seus tokens e widgets com gráficos e tabelas.";
    $pageKeywords = "analytics, tokens, gráficos, dashboards, Web3";
    $headerVariant = "module";
    $moduleHeaderTitle = "Analytics Reports";
    $moduleHeaderSubtitle = "Acompanhe o desempenho dos seus tokens";
    $moduleHeaderIcon = "fa-chart-line";
    $moduleHeaderIconAlt = "Analytics";
  ?>
<div class="container-fluid px-3 px-lg-4 py-4">
  <div id="network-section" data-component="modules/network/network-search.php"></div>

  <div class="tcd-card" id="analytics-module">
    <div class="d-flex flex-wrap gap-2 align-items-center mb-3">
      <div class="tc-field tc-analytics-period mb-0 me-auto">
        <label class="tc-field-label" for="time-range-selector">Período</label>
        <select id="time-range-selector" class="tc-field-select select-input">
          <option value="7d">Últimos 7 dias</option>
          <option value="30d" selected>Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="1y">Último ano</option>
        </select>
      </div>
      <button class="tc-btn-secondary-ds px-4 py-2" data-action="export-report" type="button">
        <i class="bi bi-download me-2"></i>Exportar
      </button>
      <button class="tc-btn-test-ds px-4 py-2" data-action="refresh-analytics" type="button">
        <i class="bi bi-arrow-clockwise me-2"></i>Atualizar
      </button>
      <button class="tc-btn-clear-ds px-4 py-2" id="btnClearData" type="button">
        <i class="bi bi-eraser me-2"></i>Limpar
      </button>
    </div>

            <!-- Resumo da Carteira — padrão tcd-card-head + tc-wkpi-chip (igual ao módulo logs) -->
            <div class="tc-modal-details-box mb-3">

              <!-- Cabeçalho: carteira ativa + badge de histórico -->
              <div class="tcd-card-head mb-3">
                <div class="tcd-card-head-icon--blue">
                  <i class="bi bi-wallet2"></i>
                </div>
                <div class="flex-grow-1 tc-min-w-0">
                  <h3 class="tch-blue">Sua Carteira</h3>
                  <p id="summary-wallet" class="text-truncate tc-wallet-compact">—</p>
                </div>
                <span class="ms-auto flex-shrink-0 tc-wkpi-chip tc-wkpi-chip--green pe-none" id="summary-history-badge">
                  <span class="tc-wkpi-lbl"><i class="bi bi-coin me-1"></i>Histórico</span>
                  <span class="tc-wkpi-cnt" id="total-tokens">0</span>
                </span>
              </div>

              <!-- Chips de filtro interativos -->
              <div class="d-flex flex-wrap gap-2 align-items-center" id="analyticsKpiRow">

                <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi--active"
                        data-analytics-filter="all" title="Ver todos os tokens da carteira">
                  <span class="tc-wkpi-lbl"><i class="bi bi-list me-1"></i>Todos</span>
                  <span class="tc-wkpi-cnt" id="kpi-all">0</span>
                </button>

                <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi-chip--green"
                        data-analytics-filter="period" title="Ver apenas tokens criados no período selecionado">
                  <span class="tc-wkpi-lbl"><i class="bi bi-calendar-check me-1"></i>No período</span>
                  <span class="tc-wkpi-cnt" id="kpi-period">0</span>
                </button>

                <!-- Info não-clicável: apenas o período de datas -->
                <span class="tc-wkpi-info ms-auto">
                  <span class="tc-wkpi-lbl"><i class="bi bi-calendar-range me-1"></i>Período</span>
                  <span class="tc-wkpi-cnt" id="kpi-period-label">—</span>
                </span>

              </div>

              <!-- Nota informativa -->
              <div class="mt-2 tc-note-xs">
                <i class="bi bi-info-circle me-1"></i>Tokens registrados neste dispositivo pela carteira conectada.
              </div>

            </div><!-- /tc-modal-details-box -->

            <!-- Gráficos Principais -->
            <div class="analytics-charts">
              <!-- Gráfico de Volume -->
              <div class="chart-container">
                <div class="chart-header">
                  <h3><i class="bi bi-graph-up me-2 tc-action-info"></i>Tokens Criados por Período</h3>
                  <div class="chart-controls">
                    <button class="chart-btn active" data-chart="volume" data-type="line">Linha</button>
                    <button class="chart-btn" data-chart="volume" data-type="bar">Barras</button>
                  </div>
                </div>
                <div class="chart-wrapper">
                  <canvas id="volume-chart"></canvas>
                </div>
              </div>

              <!-- Gráfico de Holders -->
              <div class="chart-container">
                <div class="chart-header">
                  <h3><i class="bi bi-people me-2 tc-action-info"></i>Crescimento de Holders</h3>
                  <div class="chart-controls">
                    <button class="chart-btn active" data-chart="holders" data-type="line">Linha</button>
                    <button class="chart-btn" data-chart="holders" data-type="area">Área</button>
                  </div>
                </div>
                <div class="chart-wrapper">
                  <canvas id="holders-chart"></canvas>
                </div>
              </div>
            </div>

            <!-- Gráficos Secundários -->
            <div class="analytics-secondary">
              <!-- Distribuição por Rede -->
              <div class="chart-container half-width">
                <div class="chart-header">
                  <h3><i class="bi bi-pie-chart me-2 tc-action-info"></i>Distribuição por Rede</h3>
                </div>
                <div class="chart-wrapper">
                  <canvas id="type-distribution-chart"></canvas>
                </div>
              </div>

              <!-- Top Tokens -->
              <div class="chart-container half-width">
                <div class="chart-header">
                  <h3><i class="bi bi-trophy me-2 tc-action-info"></i>Top Tokens por Volume</h3>
                </div>
                <div class="chart-wrapper">
                  <canvas id="top-tokens-chart"></canvas>
                </div>
              </div>
            </div>

            <!-- Tabela de Detalhes -->
            <div class="analytics-table">
              <div class="table-header">
                <h3><i class="bi bi-table me-2 tc-action-info"></i>Detalhes por Token</h3>
                <div class="table-controls">
                  <input type="text" id="table-search" placeholder="Buscar token..." class="tc-field-input search-input" />
                  <select id="table-sort" class="tc-field-select select-input">
                    <option value="volume">Volume</option>
                    <option value="holders">Holders</option>
                    <option value="transactions">Transações</option>
                    <option value="created">Data de Criação</option>
                  </select>
                </div>
              </div>

              <div class="table-container">
                <table id="analytics-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Rede</th>
                      <th>Holders</th>
                      <th>Volume (30d)</th>
                      <th>Transações</th>
                      <th>Criado em</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody id="analytics-table-body">
                    <!-- Dados carregados dinamicamente -->
                  </tbody>
                </table>
              </div>
            </div>

    <div class="loading-state text-center py-4 d-none" id="analytics-loading">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="tc-status-text mt-2">Carregando analytics...</p>
    </div>
  </div>
</div>

<!-- ── Rodapé ── -->
<div class="tcd-card mt-3">
  <div class="d-flex flex-wrap gap-2 align-items-center">
    <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
      <i class="bi bi-house-door me-2"></i>Início
    </a>
  </div>
</div>

<div class="tc-ds-modal" id="advanced-analytics-modal" aria-hidden="true">
  <div class="tc-ds-modal-content">
    <div class="tc-ds-modal-head">
      <div class="fw-bold text-white">Analytics Avançado</div>
      <button class="tc-icon-btn-ds tc-action-clear" id="close-advanced-analytics" type="button" aria-label="Fechar">
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
    <div class="tc-ds-modal-body" id="advanced-analytics-content"></div>
  </div>
</div>

    <?php if (isset($enqueue_script_src)) { $enqueue_script_src("https://cdn.jsdelivr.net/npm/chart.js"); } ?>
    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/analytics/analytics-reports.js"); } ?>

