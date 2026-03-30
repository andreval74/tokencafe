<!--
================================================================================
NAVBAR PADRÃO - TOKENCAFE
================================================================================
Navbar unificada para páginas standalone (não-dashboard)
Inclui: logo, navegação, botão de conexão de carteira
Uso: Inclua via data-component="navbar-standard"
================================================================================
-->
<nav class="navbar navbar-expand-lg navbar-tokencafe sticky-top">
  <div class="container-fluid px-4">
    <!-- Logo TokenCafe -->
    <a class="navbar-brand d-flex align-items-center" href="index.php">
      <img src="assets/imgs/tkncafe32x32.png" alt="TokenCafe" width="32" height="32" class="me-2" />
      <span class="fw-bold text-white">TokenCafe</span>
    </a>

    <!-- Toggle para mobile -->
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
      <i class="bi bi-list text-white fs-4"></i>
    </button>

    <!-- Menu principal -->
    <div class="collapse navbar-collapse" id="navbarNav">
      <ul class="navbar-nav me-auto">
        <li class="nav-item">
          <a class="nav-link text-white-50 hover-text-white" href="index.php">Início</a>
        </li>
        <li class="nav-item">
          <a class="nav-link text-white-50 hover-text-white" href="modules/rpc/rpc-index.php">RPC Manager</a>
        </li>
        <li class="nav-item">
          <a class="nav-link text-white-50 hover-text-white" href="modules/link/link-index.php">Token Links</a>
        </li>
      </ul>

      <!-- Botões de ação -->
      <div class="d-flex align-items-center">
        <!-- Theme Toggle -->
        <button id="theme-toggle" class="btn btn-sm btn-outline-primary me-2" title="Alternar Tema">
          <i class="bi bi-sun" id="theme-icon"></i>
        </button>



        <!-- Status da carteira -->

        <div id="wallet-status" class="me-3 d-none">

          <small class="text-white-50">
            <i class="bi bi-wallet2 me-1"></i>
            <span id="wallet-address">Não conectado</span>
          </small>
        </div>

        <!-- Botão conectar carteira -->
        <button id="connect-wallet-btn" class="btn btn-outline-primary btn-sm me-2" data-action="connect-wallet">
          <i class="bi bi-wallet2 me-1"></i>
          Conectar Carteira
        </button>

        <!-- Botão BI (se conectado) -->
        <a href="index.php?page=logs" class="btn btn-outline-light btn-sm d-none" id="dashboard-link">
          <i class="bi bi-graph-up me-1"></i>
          Logs (BI)
        </a>
      </div>
    </div>
  </div>
</nav>

<script type="module" src="assets/js/shared/components/navbar-standard.js"></script>
