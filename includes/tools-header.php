<!--
================================================================================
TOOLS HEADER - COMPONENTE PADRÃO PARA PÁGINAS DE FERRAMENTAS
================================================================================
Componente simples de brand (ícone, título, subtítulo) sem script na página receptora.
Uso: <div data-component="tools-header.html" data-icon="..." data-title="..." data-subtitle="..."></div>
As variáveis são declaradas via atributos data- no elemento onde o componente é incluído.
================================================================================
-->

<nav class="navbar navbar-expand-lg navbar-dark bg-page-black">
  <div class="container">
    <div class="tc-tools-header navbar-brand d-flex align-items-center">
      <!-- Brand TokenCafe -->
      <div>
        <h3 class="mb-0 text-white">
          <!-- Ícone dinâmico por página -->
          <span id="tools-header-title">TokenCafe Tools</span>
        </h3>
        <p class="text-white-50 mb-0 small" id="tools-header-subtitle">Hub Central de Ferramentas Web3</p>
      </div>
    </div>

    <!-- Status da Carteira (padrão minimalista) -->
    <div class="d-flex flex-column align-items-end text-end">
      <div class="d-flex align-items-center">
        <button id="sidebar-toggle-btn" class="btn btn-sm btn-transparent-warning me-2 d-lg-none" type="button" aria-label="Abrir menu">
          <i class="bi bi-list"></i>
        </button>
        <!-- Botão tema -->
        <button id="theme-toggle" class="btn btn-sm btn-transparent-warning me-3" type="button" title="Alternar Tema">
          <i class="bi bi-sun" id="theme-icon"></i>
        </button>
        <button id="language-toggle-btn" class="btn btn-sm btn-transparent-info me-3" type="button" title="Mudar Idioma">
          <i class="bi bi-globe" id="language-icon"></i>
        </button>
        <?php
          $p = isset($_GET["page"]) ? strtolower((string) $_GET["page"]) : "";
          $p = preg_replace('/[^a-z0-9_-]+/', "", $p);
          $showHomeBtn = ($p === "tools");
        ?>
        <?php if ($showHomeBtn) { ?>
          <a href="index.php?page=tools" class="badge bg-secondary text-white text-decoration-none me-2 badge-action" title="Ir para Tools">
            <i class="bi bi-house-door-fill me-1"></i>
            Home
          </a>
        <?php } ?>

        <button id="connect-metamask-btn" class="badge bg-success me-2 badge-action" type="button" title="Conectar carteira">
          <i class="bi bi-wallet2 me-1"></i>
          Conectar
        </button>

        <!-- Botão Suporte -->
        <!-- <a href="/pages/suporte.html" class="badge bg-secondary text-white text-decoration-none me-2 badge-action" title="Suporte">
            <i class="bi bi-life-preserver me-1"></i>
            Suporte
        </a> -->

        <!-- botão de sair -->
        <a href="javascript:void(0)" id="btn-logout" class="badge bg-danger me-2 badge-action d-none" onclick="handleLogout()">
          <i class="bi bi-box-arrow-right me-1"></i>
          Sair
        </a>

        <!-- (Removido) Badge de carteira verde antigo, agora usamos display abaixo -->
        <span id="wallet-address" class="d-none"></span>
      </div>
      <div class="d-flex flex-column align-items-end mt-2">
        <div class="d-flex justify-content-end align-items-center">
          <div class="dropdown">
            <button id="wallet-chip-btn" class="btn btn-sm btn-outline-success d-none" type="button" aria-label="Carteira conectada">
              <span id="wallet-chip-address"></span>
              <span class="ms-2 text-white-50" id="wallet-chip-balance"></span>
              <i class="bi bi-chevron-down ms-2" id="wallet-chip-caret"></i>
            </button>
            <ul id="wallet-chip-menu" class="dropdown-menu dropdown-menu-end bg-page-black border-secondary"></ul>
          </div>
          <button id="btn-copy-wallet" class="btn btn-sm btn-link p-0 text-success ms-2 d-none text-no-decoration" title="Copiar endereço">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
      <small id="device-note" class="mt-1"></small>
    </div>
  </div>
</nav>
<div class="section-divider"></div>

<script type="module" src="assets/js/shared/tools-header.js"></script>
