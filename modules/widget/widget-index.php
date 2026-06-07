  <?php
    $pageTitle = "Validar Widget - TokenCafe";
    $pageDescription = "Validação e testes do contrato de venda do widget.";
    $pageKeywords = "widget, contrato, validação, Web3";
    $headerVariant = "module";
    $moduleHeaderTitle = "Validar Widget";
    $moduleHeaderSubtitle = "Validar e testar contrato";
    $moduleHeaderIcon = "bi-shield-check";
    $moduleHeaderIconAlt = "Widget";
  ?>
<div class="container-fluid px-3 px-lg-4 py-4">
  <div class="tcd-card">
    <div class="tc-field">
      <label class="tc-field-label" for="deployedContractAddress">Endereço do Contrato de Venda</label>
      <div class="d-flex gap-2">
        <input type="text" class="tc-field-input tc-field-input--mono flex-grow-1" id="deployedContractAddress" placeholder="0x..." />
        <button class="tc-icon-btn-ds tc-action-copy flex-shrink-0" type="button" id="copyDeployedContractBtn" title="Copiar">
          <i class="bi bi-clipboard"></i>
        </button>
      </div>
    </div>
    <div class="tc-field mb-0">
      <label class="tc-field-label" for="contractTokenAddress">Endereço do Token</label>
      <div class="d-flex gap-2">
        <input type="text" class="tc-field-input tc-field-input--mono flex-grow-1" id="contractTokenAddress" placeholder="0x..." />
        <button class="tc-icon-btn-ds tc-action-copy flex-shrink-0" type="button" id="copyContractTokenBtn" title="Copiar">
          <i class="bi bi-clipboard"></i>
        </button>
      </div>
    </div>

    <div id="contract-validation-status" class="mt-3"></div>

    <div class="tc-form-actions mt-3">
      <button class="tc-btn-clear-ds px-4 py-2" id="btnClearForm" type="button">
        <i class="bi bi-trash me-2"></i>Limpar
      </button>
      <button id="btnValidateContract" class="tc-btn-primary-ds px-4 py-2" type="button">
        <i class="bi bi-shield-check me-2"></i>Validar Contrato
      </button>
      <button class="tc-btn-test-ds px-4 py-2" id="goToStep5" type="button" disabled>
        <i class="bi bi-flask me-2"></i>Testar Sistema
      </button>
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 ms-auto text-decoration-none">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>
</div>
    
    <!-- Modal Splash Verificação -->
    <div class="modal fade" id="verifyInfoModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content bg-dark-elevated border-secondary text-light">
          <div class="modal-header border-secondary">
            <h5 class="modal-title" id="verifyInfoTitle">Verificação</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="verifyInfoContent" class="tc-note"></div>
          </div>
          <div class="modal-footer border-secondary">
            <a id="verifyOpenLink" href="#" target="_blank" rel="noopener" class="tc-btn-success-ds text-decoration-none">Abrir página de verificação</a>
          </div>
        </div>
      </div>
    </div>

    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/widget/widget_index.js"); } ?>
