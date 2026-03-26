<?php
  $pageTitle = "Admin Dashboard - TokenCafe";
  $pageDescription = "Relatórios e monitoramento do sistema.";
  $pageKeywords = "admin, dashboard, logs, monitoramento";
  $headerVariant = "module";
  $moduleHeaderTitle = "Admin Dashboard";
  $moduleHeaderSubtitle = "Relatórios e Monitoramento do Sistema";
  $moduleHeaderIcon = "bi-speedometer2";
  $moduleHeaderIconAlt = "Dashboard";
?>

  <div class="container py-4">
    <!-- Navigation / Breadcrumb -->
    <div class="row mb-4">
      <div class="col-12">
        <a href="index.php?page=tools" class="btn btn-outline-secondary btn-sm">
          <i class="bi bi-arrow-left"></i> Voltar para Ferramentas
        </a>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div class="row g-4">
      
      <!-- Stats Overview -->
      <div class="col-12">
        <div class="row g-3">
          <div class="col-md-4">
            <div class="card bg-dark text-white h-100 border-secondary">
              <div class="card-body text-center">
                <h5 class="card-title text-muted">Contratos Criados</h5>
                <h2 class="display-4 fw-bold text-primary" id="total-contracts">0</h2>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-dark text-white h-100 border-secondary">
              <div class="card-body text-center">
                <h5 class="card-title text-muted">Conexões Hoje</h5>
                <h2 class="display-4 fw-bold text-success" id="total-connections">0</h2>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card bg-dark text-white h-100 border-secondary">
              <div class="card-body text-center">
                <h5 class="card-title text-muted">Arquivos Gerados</h5>
                <h2 class="display-4 fw-bold text-info" id="total-files">0</h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Logs Section -->
      <div class="col-12">
        <div class="card bg-dark text-white border-secondary">
          <div class="card-header border-secondary d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-list-ul me-2"></i>Log de Atividades</h5>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary active" data-filter="all">Todos</button>
              <button class="btn btn-sm btn-outline-secondary" data-filter="contract">Contratos</button>
              <button class="btn btn-sm btn-outline-secondary" data-filter="connection">Conexões</button>
              <button class="btn btn-sm btn-outline-secondary" data-filter="file">Arquivos</button>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-dark table-hover mb-0 align-middle">
                <thead>
                  <tr>
                    <th scope="col">Data/Hora</th>
                    <th scope="col">Tipo</th>
                    <th scope="col">Usuário/Wallet</th>
                    <th scope="col">Detalhes</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody id="activity-log-body">
                  <!-- Logs will be populated here -->
                  <tr>
                    <td colspan="5" class="text-center py-4 text-muted">
                      <i class="bi bi-inbox fs-2 d-block mb-2"></i>
                      Nenhum registro encontrado
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="card-footer border-secondary text-end">
            <button class="btn btn-sm btn-outline-danger" id="clear-logs-btn">
              <i class="bi bi-trash me-1"></i> Limpar Logs
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- Scripts -->
  <script type="module">
    import "assets/js/shared/base-system.js";
    import "assets/js/shared/page-manager.js";
    
    // Initialize Page
    window.createPageManager("admin-dashboard");

    // Mock Data Loader (replace with actual data source)
    document.addEventListener('DOMContentLoaded', () => {
      loadDashboardData();
      setupFilters();
      setupClearBtn();
    });

    function loadDashboardData() {
      // Try to get data from localStorage or API
      const logs = JSON.parse(localStorage.getItem('tokencafe_activity_logs') || '[]');
      renderLogs(logs);
      updateStats(logs);
    }

    function renderLogs(logs) {
      const tbody = document.getElementById('activity-log-body');
      if (!logs.length) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" class="text-center py-4 text-muted">
              <i class="bi bi-inbox fs-2 d-block mb-2"></i>
              Nenhum registro encontrado
            </td>
          </tr>`;
        return;
      }

      tbody.innerHTML = logs.map(log => `
        <tr>
          <td class="text-nowrap">${new Date(log.timestamp).toLocaleString()}</td>
          <td><span class="badge bg-${getTypeColor(log.type)}">${log.type}</span></td>
          <td class="font-monospace small">${formatWallet(log.wallet)}</td>
          <td>${log.details}</td>
          <td><span class="badge bg-${getStatusColor(log.status)}">${log.status}</span></td>
        </tr>
      `).join('');
    }

    function updateStats(logs) {
      const stats = {
        contracts: logs.filter(l => l.type === 'contract').length,
        connections: logs.filter(l => l.type === 'connection').length,
        files: logs.filter(l => l.type === 'file').length
      };

      document.getElementById('total-contracts').textContent = stats.contracts;
      document.getElementById('total-connections').textContent = stats.connections;
      document.getElementById('total-files').textContent = stats.files;
    }

    function getTypeColor(type) {
      const colors = {
        'contract': 'primary',
        'connection': 'success',
        'file': 'info',
        'error': 'danger'
      };
      return colors[type] || 'secondary';
    }

    function getStatusColor(status) {
      return status === 'success' ? 'success' : 'danger';
    }

    function formatWallet(wallet) {
      if (!wallet) return 'Anônimo';
      return wallet.substring(0, 6) + '...' + wallet.substring(wallet.length - 4);
    }

    function setupFilters() {
      document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          const filter = e.target.dataset.filter;
          const allLogs = JSON.parse(localStorage.getItem('tokencafe_activity_logs') || '[]');
          const filtered = filter === 'all' ? allLogs : allLogs.filter(l => l.type === filter);
          renderLogs(filtered);
        });
      });
    }

    function setupClearBtn() {
      document.getElementById('clear-logs-btn').addEventListener('click', () => {
        if(confirm('Tem certeza que deseja limpar todos os logs?')) {
          localStorage.removeItem('tokencafe_activity_logs');
          loadDashboardData();
        }
      });
    }
  </script>
