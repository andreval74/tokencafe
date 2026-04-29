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

  <div class="container">

    <div class="g-4">
      <div class="col-12">

        <div id="status-alert" class="alert d-none mb-4" role="alert"></div>

        <!-- Busca pelo Contrato (Detalhes) -->
        <div id="contract-search-container" class="mb-3">
          <div data-component="shared/components/contract-search.php"></div>
        </div>

        <!-- Download de Arquivos (Via Componente) -->
        <div data-component="shared/components/contract-actions.php"></div>


        <!-- Ação de Deploy -->
        <div class="mb-4" id="actions-section">
          <div class="d-flex gap-2 justify-content-end align-items-center">
            <!-- Botão Novo Contrato -->
            <a href="index.php?page=contrato" id="btnNewContract" class="btn btn-outline-secondary"
              title="Criar um novo contrato">
              <i class="bi bi-plus-lg me-2"></i> NOVO CONTRATO
            </a>

            <!-- Botão Home -->
            <a href="index.php?page=tools" class="btn btn-outline-success" title="Ir para a Página Inicial">
              <i class="bi bi-house-door me-2"></i> HOME
            </a>
          </div>
        </div>
      </div>

    </div>

  </div>

  <!-- Modal de Visualização de Arquivos -->
  <div class="modal fade" id="fileViewerModal" tabindex="-1" aria-labelledby="fileViewerModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content bg-dark border-secondary text-light">
        <div class="modal-header border-secondary">
          <h5 class="modal-title" id="fileViewerModalLabel">Visualizar Arquivo</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <textarea id="fileViewerContent" class="form-control bg-black text-success border-secondary font-monospace"
            rows="15" readonly></textarea>
        </div>
        <div class="modal-footer border-secondary">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Fechar</button>
          <button type="button" class="btn btn-outline-light" id="btnModalCopy">
            <i class="bi bi-clipboard me-1"></i> Copiar
          </button>
          <button type="button" class="btn btn-primary" id="btnModalDownload">
            <i class="bi bi-download me-1"></i> Download
          </button>
        </div>
      </div>
    </div>
  </div>

  <?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/shared/api-config.js"); } ?>
  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/contrato/contrato-detalhes.js"); } ?>
