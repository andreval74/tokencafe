<!--
================================================================================
TOOLS HEADER — Navbar fixa das páginas de ferramentas
Estrutura: brand (esquerda) | título centralizado | controles + carteira (direita)
================================================================================
-->

<nav class="navbar navbar-expand-lg navbar-dark fixed-top tc-navbar tc-tools-nav">
  <div class="container-fluid px-3 px-lg-4">

    <!-- ── Brand (esquerda) ── -->
    <a href="index.php?page=tools" title="Início" class="navbar-brand d-flex align-items-center gap-2 text-no-decoration m-0 neon-link-hover">
      <img src="assets/imgs/tkncafe-semfundo.png" alt="TokenCafe Logo" class="logo-standard" />
      <div class="d-flex flex-column lh-1">
        <span class="fw-bold text-white fs-5">Token<span class="text-warning">Cafe</span></span>
        <small class="text-white-50 text-small">Plataforma Web3</small>
      </div>
    </a>

    <!-- ── Título centralizado (CSS position:absolute) ── -->
    <div class="tc-tools-header navbar-brand d-flex align-items-center">
      <div class="text-center">
        <h3 class="mb-0 text-white fs-6 fw-bold" id="tools-header-title">TokenCafe Tools</h3>
        <p class="text-white-50 mb-0 text-small" id="tools-header-subtitle">Hub Central de Ferramentas Web3</p>
      </div>
    </div>

    <!-- ── Direita: controles empilhados acima da carteira ── -->
    <div class="ms-auto d-flex flex-column align-items-end gap-1">

      <!-- Linha 1: botões de controle pequenos -->
      <div class="d-flex align-items-center gap-1 flex-wrap justify-content-end">

        <!-- Menu mobile -->
        <button id="sidebar-toggle-btn" class="tc-hdr-btn d-lg-none" type="button" aria-label="Menu">
          <i class="bi bi-list fs-6"></i>
        </button>

        <!-- Indicar TokenCafe -->
        <a href="index.php?page=indicar" class="tc-hdr-btn tc-hdr-btn-share" title="Indique o TokenCafe e ganhe bônus">
          <i class="bi bi-share-fill"></i>
        </a>

        <!-- Tema -->
        <button id="theme-toggle" class="tc-hdr-btn tc-hdr-btn-theme" type="button" title="Alternar Tema">
          <i class="bi bi-sun" id="theme-icon"></i>
        </button>

        <!-- Idioma -->
        <button id="language-toggle-btn" class="tc-hdr-btn tc-hdr-btn-lang" type="button" title="Mudar Idioma">
          <i class="bi bi-globe" id="language-icon"></i>
        </button>

        <!-- IA Assistant -->
        <button id="tc-ia-header-btn" class="tc-hdr-btn tc-hdr-btn-ia" type="button" title="TokenCafe IA — Assistente">
          <i class="bi bi-robot"></i>
        </button>

        <?php
        $p = isset($_GET["page"]) ? strtolower((string) $_GET["page"]) : "";
        $p = preg_replace('/[^a-z0-9_-]+/', "", $p);
        if ($p !== "tools") {
        ?>
          <a href="index.php?page=tools" class="tc-hdr-btn tc-hdr-btn-success text-decoration-none" title="Dashboard">
            <i class="bi bi-house-door-fill"></i><span class="d-none d-sm-inline">Início</span>
          </a>
        <?php } ?>

        <!-- Botão conectar (mostrado pelo JS quando não há carteira) -->
        <button id="connect-metamask-btn" class="tc-hdr-btn tc-hdr-btn-success d-none" type="button" title="Conectar carteira" style="display:none!important">
          <i class="bi bi-wallet2"></i><span>Conectar</span>
        </button>

        <!-- Sair -->
        <a href="javascript:void(0)" id="btn-logout" class="tc-hdr-btn tc-hdr-btn-danger d-none text-decoration-none" onclick="handleLogout()">
          <i class="bi bi-box-arrow-right"></i><span class="d-none d-sm-inline">Sair</span>
        </a>
      </div>

      <!-- Linha 2: chip da carteira -->
      <div class="d-flex align-items-center gap-1">
        <div class="dropdown">
          <button id="wallet-chip-btn"
            class="d-none align-items-center gap-2 px-3 py-1 rounded-pill border-0 tc-wallet-chip"
            type="button"
            aria-label="Carteira conectada">
            <span class="tc-wallet-chip-dot"></span>
            <span id="wallet-chip-address" class="fw-semibold tc-wallet-chip-addr"></span>
            <span id="wallet-chip-balance" class="ms-1 fw-bold tc-data-value--success"></span>
            <i class="bi bi-chevron-down ms-1 tc-wallet-chip-caret" id="wallet-chip-caret"></i>
          </button>
          <ul id="wallet-chip-menu" class="dropdown-menu dropdown-menu-end bg-page-black border-secondary"></ul>
        </div>

        <!-- Copiar endereço -->
        <button id="btn-copy-wallet" type="button" class="tc-icon-btn-ds tc-action-copy" data-cs-copy-address title="Copiar endereço">
          <i class="bi bi-clipboard"></i>
        </button>

        <!-- Endereço oculto (usado pelo JS) -->
        <span id="wallet-address" class="d-none"></span>
      </div>

    </div>

    <!-- Nota de dispositivo -->
    <small id="device-note" class="w-100 text-end mt-1 tc-device-note"></small>

  </div>
</nav>

<script type="module" src="assets/js/shared/tools-header.js"></script>
<script type="module" src="assets/js/modules/security/session-timeout.js"></script>
<!-- referral-share.js carregado centralmente por footer.php -->