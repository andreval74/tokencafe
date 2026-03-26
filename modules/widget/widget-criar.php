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

    <div class="container py-4">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <!-- Card Principal -->
          <div class="card border-primary">
            <div class="card-header bg-primary bg-opacity-10">
              <h4 class="mb-0">
                <i class="bi bi-magic me-2"></i>
                Criar Widget de Vendas
              </h4>
            </div>
            <div class="card-body">
              <div id="loadingContainer" class="mb-3"></div>
              <!-- Formulário Simplificado -->
              <form id="widgetForm">
                <!-- Passo 1: Nome do Projeto -->
                <div class="mb-4">
                  <label class="form-label fw-semibold">
                    <i class="bi bi-tag me-1"></i>
                    Nome do Projeto *
                  </label>
                  <input type="text" class="form-control" id="projectName" placeholder="Ex: Meu Token" required />
                  <small class="text-muted">Este nome será exibido no topo do widget</small>
                </div>

                <!-- Passo 2: Rede Blockchain -->
                <div class="mb-4">
                  <!-- Campo oculto para chainId (usado internamente pelo widget) -->
                  <input type="hidden" id="blockchain" />
                  <!-- Busca de Rede (componente compartilhado) -->
                  <div class="mt-2">
                    <div data-component="shared/components/network-search.php"></div>
                  </div>
                </div>

                <!-- Passo 3: Contrato de Venda -->
                <div class="mb-4" id="contractGroup">
                  <label class="form-label fw-semibold">
                    <i class="bi bi-file-code me-1"></i>
                    Endereço do Contrato *
                  </label>
                  <div class="input-group">
                    <input type="text" class="form-control" id="saleContract" placeholder="0x... (Token ou Contrato de Venda)" required />
                    <button class="btn btn-outline-secondary" type="button" id="validateBtn" title="Validar">
                      <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-outline-info" type="button" id="copyContractBtn" title="Copiar">
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                  <small class="text-muted">
                    <i class="bi bi-info-circle me-1"></i>
                    Digite o endereço de um token para criar um contrato de venda, ou um contrato de venda existente
                  </small>
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

                <!-- Botão de Ação -->
                <div class="d-grid gap-2">
                  <button type="submit" class="btn btn-outline-primary btn-lg" id="generateBtn">
                    <i class="bi bi-rocket-takeoff me-2"></i>
                    Gerar Widget
                  </button>
                  <button type="button" class="btn btn-outline-secondary" id="btnClearForm">
                    <i class="bi bi-eraser me-2"></i>
                    Limpar Dados
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Card de Preview -->
          <div class="card mt-4 d-none" id="previewCard">
            <div class="card-header bg-success bg-opacity-10">
              <h5 class="mb-0">
                <i class="bi bi-eye me-2"></i>
                Preview do Widget
              </h5>
            </div>
            <div class="card-body">
              <div id="widgetPreview"></div>
              <div class="btn-row mt-3">
                <button class="btn btn-outline-success" id="copyCodeBtn">
                  <i class="bi bi-clipboard me-2"></i>
                  Copiar Código
                </button>
                <button class="btn btn-outline-secondary" id="downloadJsonBtn">
                  <i class="bi bi-download me-2"></i>
                  Baixar Config
                </button>
              </div>
            </div>
          </div>

          <!-- Card de Código Embed -->
          <div class="card mt-4 d-none" id="embedCard">
            <div class="card-header bg-info bg-opacity-10">
              <h5 class="mb-0">
                <i class="bi bi-code-slash me-2"></i>
                Código para Incorporar
              </h5>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                Copie este código e cole no seu site para exibir o widget
              </div>
              <div class="position-relative">
                <pre id="embedCode" class="bg-dark text-light p-3 rounded"></pre>
                <button class="btn btn-sm btn-outline-light position-absolute top-0 end-0 m-2" id="copyEmbedBtn" title="Copiar código">
                  <i class="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/shared/network-manager.js"); } ?>
    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/shared/page-manager.js"); } ?>
    <?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/modules/widget/contract-deployer.js"); } ?>
    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/widget/widget_criar.js"); } ?>
