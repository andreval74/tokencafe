<?php
  $pageTitle = "Detalhes do Contrato - TokenCafe";
  $pageDescription = "Detalhes, verificação e download do contrato criado.";
  $pageKeywords = "contrato, smart contract, verificação, download, Web3";
  $headerVariant = "module";
  $moduleHeaderTitle = "Detalhes do Contrato";
  $moduleHeaderSubtitle = "Informações e Gerenciamento";
  $moduleHeaderIcon = "fa-wand-magic-sparkles";
  $moduleHeaderIconAlt = "Construtor";
?>

<div class="container-fluid px-3 px-lg-4 py-4">
  <div id="status-alert" class="alert d-none mb-4" role="alert"></div>

  <div id="contract-search-container">
    <div data-component="modules/contrato/contract-search.php" data-cs-allow-wallet="true" data-cs-strict-errors="true"></div>
  </div>

  <div>
    <div data-component="modules/contrato/contract-actions.php"></div>
  </div>

  <div class="tcd-card" id="actions-section">
    <div class="d-flex flex-wrap gap-2">
      <a href="index.php?page=contrato" id="btnNewContract" class="tc-btn-primary-ds px-4 py-2 text-decoration-none" title="Criar um novo contrato">
        <i class="bi bi-plus-circle me-2"></i>Novo Contrato
      </a>
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>
</div>

  <?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/shared/api-config.js"); } ?>
  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/contrato/contrato-detalhes.js"); } ?>
