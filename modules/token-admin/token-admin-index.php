<?php
  $pageTitle          = "Admin de Token - TokenCafe";
  $pageDescription    = "Interaja diretamente com qualquer contrato EVM — leia variáveis e envie transações via MetaMask.";
  $pageKeywords       = "token admin, smart contract, read contract, write contract, EVM, blockchain";
  $headerVariant      = "module";
  $moduleHeaderTitle  = "Admin de Token";
  $moduleHeaderSubtitle = "Gerencie e interaja com contratos EVM";
  $moduleHeaderIcon   = "bi-terminal-fill";
  $moduleHeaderIconAlt = "Terminal";
?>

<div class="container-fluid px-3 px-lg-4 py-4">

  <!-- Seleção de rede -->
  <div id="ta_networkSection" data-component="modules/network/network-search.php"></div>

  <!-- Busca do contrato -->
  <div id="ta_contractSection">
    <div data-component="modules/contrato/contract-search.php" data-cs-allow-wallet="true" data-cs-strict-errors="true" data-cs-no-extended="true"></div>
  </div>

  <!-- Status de carregamento do ABI -->
  <div id="ta_abiStatus" class="tc-status-text d-none mb-3 mt-1">
    <span id="ta_abiSpinner" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
    <span id="ta_abiStatusText"></span>
  </div>

  <!-- Visualizar Arquivos do Contrato -->
  <div data-component="modules/contrato/contract-actions.php"></div>

  <!-- Abas Ler / Escrever -->
  <div id="ta_interactSection" class="tcd-card d-none">
    <div class="tcd-card-head mb-2">
      <div class="tcd-card-head-icon--orange flex-shrink-0">
        <i class="bi bi-cpu text-white"></i>
      </div>
      <div>
        <h3 class="mb-0">Interagir com o Contrato</h3>
        <p class="mb-0">Leia dados ou envie transações diretamente</p>
      </div>
    </div>

    <ul class="nav nav-tabs mt-2 mb-3" id="ta_interactTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="ta_tabReadBtn"
                data-bs-toggle="tab" data-bs-target="#ta_tabRead" type="button" role="tab">
          <i class="bi bi-eye me-1"></i>Ler Contrato
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="ta_tabWriteBtn"
                data-bs-toggle="tab" data-bs-target="#ta_tabWrite" type="button" role="tab">
          <i class="bi bi-pencil-square me-1"></i>Escrever Contrato
        </button>
      </li>
    </ul>

    <div class="tab-content">
      <div class="tab-pane fade show active" id="ta_tabRead" role="tabpanel">
        <div id="ta_readFunctions" class="d-flex flex-column gap-2"></div>
      </div>
      <div class="tab-pane fade" id="ta_tabWrite" role="tabpanel">
        <div id="ta_writeWalletNotice" class="tc-note mb-3 d-none">
          <i class="bi bi-wallet2 me-1"></i>Conecte sua carteira para enviar transações.
        </div>
        <div id="ta_writeFunctions" class="d-flex flex-column gap-2"></div>
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

</div>

<?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/shared/api-config.js"); } ?>
<?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/token-admin-index.js"); } ?>
