  <?php
    $pageTitle = "Criar Widget - TokenCafe";
    $pageDescription = "Crie seu widget de venda em 3 passos.";
    $pageKeywords = "widget, vendas, token, contrato, Web3";
    $headerVariant = "module";
    $moduleHeaderTitle = "Criar Widget";
    $moduleHeaderSubtitle = "Crie seu widget de venda em 3 passos";
    $moduleHeaderIcon = "bi-rocket";
    $moduleHeaderIconAlt = "Widget";
  ?>

<div class="container-fluid px-3 px-lg-4 py-4">
  <div class="row justify-content-center">
    <div class="col-lg-10 col-xl-9">
      <div class="tcd-card">
        <div class="tcd-card-head mb-3">
          <div class="tcd-card-head-icon--blue">
            <i class="bi bi-magic"></i>
          </div>
          <div>
            <h3>Criar Widget de Vendas</h3>
            <p>Configure rede e contrato para gerar o widget.</p>
          </div>
        </div>

        <div id="loadingContainer" class="mb-3"></div>
        <form id="widgetForm">
          <div class="tc-field">
            <label class="tc-field-label" for="projectName">Nome do Projeto</label>
            <input type="text" class="tc-field-input" id="projectName" placeholder="Ex: Meu Token" required />
            <span class="tc-field-hint">Este nome será exibido no topo do widget</span>
          </div>

                <!-- Passo 2: Rede Blockchain -->
                <div class="mb-4">
                  <!-- Campo oculto para chainId (usado internamente pelo widget) -->
                  <input type="hidden" id="blockchain" />
                  <!-- Busca de Rede (componente compartilhado) -->
                  <div class="mt-2">
                    <div data-component="modules/network/network-search.php" data-ns-no-card="true"></div>
                  </div>
                </div>

                <!-- Passo 3: Contrato de Venda -->
          <div class="tc-field" id="contractGroup">
            <label class="tc-field-label" for="saleContract">Endereço do Contrato</label>
            <div class="d-flex gap-2">
              <input type="text" class="tc-field-input tc-field-input--mono flex-grow-1" id="saleContract" placeholder="0x... (Token ou Contrato de Venda)" required />
              <button class="tc-icon-btn-ds flex-shrink-0" type="button" id="validateBtn" title="Validar">
                <i class="bi bi-check-circle"></i>
              </button>
              <button class="tc-icon-btn-ds tc-action-copy flex-shrink-0" type="button" id="copyContractBtn" title="Copiar">
                <i class="bi bi-clipboard"></i>
              </button>
            </div>
            <span class="tc-field-hint">
              Digite o endereço de um token para criar um contrato de venda, ou um contrato de venda existente
            </span>
            <div id="validationStatus" class="mt-2"></div>
          </div>

                <!-- Opções Avançadas (Opcional) -->
                <div class="accordion mb-4" id="advancedAccordion">
                  <div class="accordion-item">
                    <h2 class="accordion-header">
                      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#advancedOptions">
                        <i class="bi bi-gear me-2"></i>
                        Opções Avançadas (Opcional)
                      </button>
                    </h2>
                    <div id="advancedOptions" class="accordion-collapse collapse" data-bs-parent="#advancedAccordion">
                      <div class="accordion-body">
                        <!-- Preço por Token -->
                        <div class="mb-3">
                          <label class="form-label">Preço por Token</label>
                          <div class="input-group">
                            <input type="number" class="form-control" id="tokenPrice" placeholder="0.01" step="0.0001" />
                            <span class="input-group-text" id="currencySymbol">BNB</span>
                          </div>
                          <small class="text-muted">Deixe vazio para auto-detectar</small>
                        </div>

                        <!-- Limites de Compra -->
                        <div class="row">
                          <div class="col-md-6">
                            <label class="form-label">Mínimo por compra</label>
                            <input type="number" class="form-control" id="minPurchase" placeholder="10" />
                          </div>
                          <div class="col-md-6">
                            <label class="form-label">Máximo por compra</label>
                            <input type="number" class="form-control" id="maxPurchase" placeholder="10000" />
                          </div>
                        </div>

                        <!-- Textos Personalizados -->
                        <div class="mb-3 mt-3">
                          <label class="form-label">Texto do Botão</label>
                          <input type="text" class="form-control" id="buyButtonText" placeholder="Comprar Tokens" value="Comprar Tokens" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

          <div class="tc-form-actions">
            <button type="submit" class="tc-btn-primary-ds px-4 py-2" id="generateBtn">
              <i class="bi bi-rocket-takeoff me-2"></i>Gerar Widget
            </button>
            <button type="button" class="tc-btn-clear-ds px-4 py-2" id="btnClearForm">
              <i class="bi bi-trash me-2"></i>Limpar
            </button>
            <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 ms-auto text-decoration-none">
              <i class="bi bi-house-door me-2"></i>Início
            </a>
          </div>
        </form>
      </div>

      <div class="tcd-card mt-4 d-none" id="previewCard">
        <div class="tcd-card-head mb-3">
          <div class="tcd-card-head-icon--green">
            <i class="bi bi-eye"></i>
          </div>
          <div>
            <h3>Preview do Widget</h3>
            <p>Visualização e exportação do código.</p>
          </div>
        </div>
        <div id="widgetPreview"></div>
        <div class="tc-form-actions mt-3">
          <button class="tc-btn-success-ds tc-action-copy px-4 py-2" id="copyCodeBtn" type="button">
            <i class="bi bi-clipboard me-2"></i>Copiar Código
          </button>
          <button class="tc-btn-secondary-ds px-4 py-2" id="downloadJsonBtn" type="button">
            <i class="bi bi-download me-2"></i>Baixar Config
          </button>
        </div>
      </div>

      <div class="tcd-card mt-4 d-none" id="embedCard">
        <div class="tcd-card-head mb-3">
          <div class="tcd-card-head-icon--blue">
            <i class="bi bi-code-slash"></i>
          </div>
          <div>
            <h3>Código para Incorporar</h3>
            <p>Copie este código e cole no seu site para exibir o widget.</p>
          </div>
        </div>
        <div class="position-relative">
          <pre id="embedCode" class="bg-dark text-light p-3 rounded mb-0"></pre>
          <button class="tc-icon-btn-ds tc-action-copy position-absolute top-0 end-0 m-2" id="copyEmbedBtn" title="Copiar código" type="button">
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/shared/network-manager.js"); } ?>
    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/shared/page-manager.js"); } ?>
    <?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/modules/widget/contract-deployer.js"); } ?>
    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/widget/widget_criar.js"); } ?>
