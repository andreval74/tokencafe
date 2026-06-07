<?php
$csTitle = isset($comingSoonTitle) ? htmlspecialchars((string)$comingSoonTitle, ENT_QUOTES, 'UTF-8') : 'Em Breve';
$csIcon  = isset($comingSoonIcon)  ? htmlspecialchars((string)$comingSoonIcon,  ENT_QUOTES, 'UTF-8') : 'bi-hourglass-split';
$csDesc  = isset($comingSoonDesc)  ? htmlspecialchars((string)$comingSoonDesc,  ENT_QUOTES, 'UTF-8') : 'Este módulo está sendo desenvolvido.';
$csPage  = isset($comingSoonPage)  ? htmlspecialchars((string)$comingSoonPage,  ENT_QUOTES, 'UTF-8') : '';
?>
<div class="tc-coming-soon-wrap">
  <div class="tc-coming-soon-card">

    <!-- Ícone animado -->
    <div class="tc-cs-icon-wrap mb-4">
      <i class="bi <?= $csIcon ?>"></i>
      <span class="tc-cs-pulse"></span>
    </div>

    <!-- Badge -->
    <div class="mb-3">
      <span class="badge px-3 py-2 tc-cs-badge">
        <i class="bi bi-hourglass-split me-1"></i> EM DESENVOLVIMENTO
      </span>
    </div>

    <!-- Título -->
    <h2 class="tc-cs-title fw-bold mb-2"><?= $csTitle ?></h2>
    <p class="tc-cs-desc mb-4"><?= $csDesc ?></p>

    <!-- Barra de progresso decorativa -->
    <div class="tc-cs-progress mb-4">
      <div class="tc-cs-progress-bar"></div>
    </div>
    <p class="tc-cs-footer-text mb-4">Módulo em construção · Disponível em breve</p>

    <!-- Ações -->
    <div class="d-flex flex-column flex-sm-row gap-2 justify-content-center">
      <a href="index.php?page=tools" class="btn tc-action-btn px-4">
        <i class="bi bi-grid me-2"></i>Ver todos os módulos
      </a>
      <a href="index.php" class="btn btn-outline-secondary px-4">
        <i class="bi bi-house me-2"></i>Início
      </a>
    </div>

  </div>
</div>
