<?php
  $pageTitle = "Adicionar Token - TokenCafe";
  $pageDescription = "Adicionar token à carteira a partir de um link.";
  $pageKeywords = "token, adicionar, wallet, MetaMask, Web3";
  $headerVariant = "module";
  $moduleHeaderTitle = "Adicionar Token";
  $moduleHeaderSubtitle = "Verifique os dados e adicione à carteira";
  $moduleHeaderIcon = "fa-wallet";
  $moduleHeaderIconAlt = "Wallet";
?>

<div class="container-fluid px-3 px-lg-4 py-4">
  <div>
    <div
      data-component="modules/contrato/contract-search.php"
      data-cs-view-only="true"
      data-cs-title="Adicionar Token"
      data-cs-subtitle="Contrato enviado pelo link"
    ></div>
    <div id="metaValidatedBadgeLt" class="tc-status-text d-none mt-2">
      <i class="bi bi-check-circle me-1 tc-status-ok"></i>
      Dados do contrato confirmados (símbolo/decimais)
    </div>
  </div>

  <div class="tcd-card" id="add-network-section">
    <div class="d-flex flex-wrap gap-2">
      <button id="btnClearAll" class="tc-btn-clear-ds px-4 py-2" type="button">
        <i class="bi bi-trash me-2"></i>Limpar
      </button>
      <button id="btnSwitchNetwork" class="tc-btn-test-ds px-4 py-2 d-none" type="button">
        <i class="bi bi-diagram-3 me-2"></i>Trocar Rede
      </button>
      <button id="addToWalletButton" class="tc-btn-primary-ds px-4 py-2" type="button" disabled>
        <i class="bi bi-wallet2 me-2"></i>Adicionar Token
      </button>
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 ms-auto text-decoration-none">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>
</div>
  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/link/link-token.js"); } ?>

