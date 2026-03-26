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
    <div class="container py-4">
      <div class="card border-primary">
        <div class="card-header bg-primary bg-opacity-10">
          <h4 class="mb-0"><i class="bi bi-shield-check me-2"></i>Validar e Testar Contrato</h4>
        </div>
        <div class="card-body">
          <div class="mb-3">
            <label class="form-label">Endereço do Contrato de Venda</label>
            <div class="input-group">
              <input type="text" class="form-control" id="deployedContractAddress" placeholder="0x..." />
              <button class="btn btn-outline-secondary" type="button" id="copyDeployedContractBtn" title="Copiar">
                <i class="bi bi-clipboard"></i>
              </button>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Endereço do Token</label>
            <div class="input-group">
              <input type="text" class="form-control" id="contractTokenAddress" placeholder="0x..." />
              <button class="btn btn-outline-secondary" type="button" id="copyContractTokenBtn" title="Copiar">
                <i class="bi bi-clipboard"></i>
              </button>
            </div>
          </div>
          <div id="contract-validation-status" class="mb-3"></div>
          <div class="d-flex gap-2 flex-wrap">
            <button id="btnValidateContract" class="btn btn-primary">Validar Contrato</button>
            <button class="btn btn-secondary" id="goToStep5" disabled>Testar Sistema</button>
            <button class="btn btn-outline-secondary" id="btnClearForm">
              <i class="bi bi-eraser me-2"></i>
              Limpar Dados
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Modal Splash Verificação -->
    <div class="modal fade" id="verifyInfoModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content bg-dark text-light border">
          <div class="modal-header">
            <h5 class="modal-title" id="verifyInfoTitle">Verificação</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div id="verifyInfoContent" class="small"></div>
          </div>
          <div class="modal-footer">
            <a id="verifyOpenLink" href="#" target="_blank" rel="noopener" class="btn btn-outline-success">Abrir página de verificação</a>
          </div>
        </div>
      </div>
    </div>

    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/widget/widget_index.js"); } ?>
