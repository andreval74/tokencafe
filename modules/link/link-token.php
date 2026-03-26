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

  <div class="container">
    <div class="g-4">
      <div class="col-12">
        <!-- Componente Busca de Contrato (Reutilizado) -->
        <div
          data-component="shared/components/contract-search.php"
          data-cs-view-only="true"
          data-cs-title="Adicionar Token"
          data-cs-subtitle="Contrato enviado pelo link"
        ></div>
        <small id="metaValidatedBadgeLt" class="text-success d-none mt-1">
          <i class="bi bi-check-circle me-1"></i>
          Dados do contrato confirmados (símbolo/decimais)
        </small>

        <!-- Componente de Resposta do Sistema removido (agora via Modal global) -->
        <div class="d-flex justify-content-end gap-2 mt-4 mb-5" id="add-network-section">
          <button id="btnSwitchNetwork" class="btn btn-outline-info d-none">
            <i class="bi bi-diagram-3 me-2"></i>Trocar Rede
          </button>
          <button id="addToWalletButton" class="btn btn-outline-warning" disabled>
            <i class="bi bi-wallet2 me-2"></i>Adicionar Token
          </button>
          <button id="btnClearAll" class="btn btn-outline-secondary">
            <i class="bi bi-eraser me-2"></i>Limpar Dados
          </button>
          <a href="index.php?page=tools" class="btn btn-outline-success px-4 fw-bold">
            <i class="bi bi-house-door me-2"></i>Home
          </a>
        </div>
      </div>
    </div>
  </div>
  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/link/link-token.js"); } ?>

