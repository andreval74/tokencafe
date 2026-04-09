<?php
  $pageTitle = "Verificação de Contrato - TokenCafe";
  $pageDescription = "Publicar código e validar contrato em exploradores.";
  $pageKeywords = "verificação, smart contract, explorer, sourcify, solidity";
  $headerVariant = "module";
  $moduleHeaderTitle = "Verificação de Contrato";
  $moduleHeaderSubtitle = "Publicar código e validar";
  $moduleHeaderIcon = "fa-shield";
  $moduleHeaderIconAlt = "Verificação";
?>

  <div class="container">
    <!-- API Status (Unified Component Mount) -->
    <div data-component="shared/components/api-status.php"></div>

    <div class="g-4">
      <div class="col-12">
        <!-- ===== SEÇÃO 1: SELECIONAR REDE ===== -->
        <div class="mb-4" id="network-section">
          <div data-component="shared/components/network-search.php"></div>
        </div>

        <!-- ===== SEÇÃO 2: DADOS DO CONTRATO ===== -->
        <div id="token-section" class="mb-4 d-none">
          <div data-component="shared/components/contract-search.php" data-cs-auto-open="true"></div>

          <input id="f_chainId" type="hidden" />

          <!-- Campos extras específicos para verificação -->
          <div class="mt-3">
            <div class="row g-2">
              <div id="col-contract-name" class="col-md-6 d-none">
                <label for="f_contractName" class="form-label small text-muted">
                  Nome do contrato <span class="text-danger">*</span>
                  <i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip"
                    title="Nome exato do contrato no código fonte"></i>
                </label>
                <input id="f_contractName" class="form-control form-control-sm bg-dark text-light border-secondary"
                  placeholder="Ex: MyToken" />
              </div>

              <div id="col-compiler-version" class="col-md-6 d-none">
                <label for="f_compilerVersion" class="form-label small text-muted">
                  Versão do compilador <span class="text-danger">*</span>
                  <span id="compVerLockIcon" class="ms-1 text-warning d-none"><i class="bi bi-lock-fill"></i></span>
                </label>
                <input id="f_compilerVersion" class="form-control form-control-sm bg-dark text-light border-secondary"
                  placeholder="v0.8.20..." list="compilerVersions" readonly />
                <datalist id="compilerVersions">
                  <option value="v0.8.30+commit.73712a01">
                  <option value="v0.8.29+commit.ab55807c">
                  <option value="v0.8.28+commit.78136a7d">
                  <option value="v0.8.27+commit.40a35a09">
                  <option value="v0.8.26+commit.8a97fa7a">
                  <option value="v0.8.25+commit.b61c2a91">
                  <option value="v0.8.24+commit.e11b9ed9">
                  <option value="v0.8.23+commit.f704f362">
                  <option value="v0.8.22+commit.4fc1097e">
                  <option value="v0.8.21+commit.d9974bed">
                  <option value="v0.8.20+commit.a1b79de6">
                </datalist>
                <div id="compVerHelp" class="form-text d-none text-muted small">Versão obtida do metadata.json</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== SEÇÃO 3: VERIFICAÇÃO ===== -->
        <div id="generate-section" class="mb-4 d-none">
          <div data-component="shared/components/section-title.php" data-st-icon="bi-code-square"
            data-st-title="Código Fonte e Verificação" data-st-subtitle="Forneça o código fonte para verificação"></div>

          <div class="card bg-dark border-secondary shadow-lg">
            <div class="card-header border-secondary d-flex justify-content-between align-items-center">
              <span id="verifyStatusBadge" class="badge bg-dark-elevated">Aguardando</span>
              <div id="sourceCodeActions" class="btn-group btn-group-sm">
                <button id="importSourceBtn" class="btn btn-outline-secondary text-light" title="Importar Arquivo">
                  <i class="bi bi-upload"></i> Importar
                </button>
                <button id="pasteSourceBtn" class="btn btn-outline-secondary text-light" title="Colar">
                  <i class="bi bi-clipboard"></i> Colar
                </button>
                <button id="copySourceBtn" class="btn btn-outline-secondary text-light" title="Copiar">
                  <i class="bi bi-copy"></i>
                </button>
                <button id="clearSourceBtn" class="btn btn-outline-danger" title="Limpar">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>

            <div class="card-body">
              <div id="codeSourceSection">
                <input id="importSourceFile" type="file" class="d-none" accept=".sol,.vy,.txt" />

                <!-- Editor Area -->
                <div class="position-relative">
                  <textarea id="f_sourceCode"
                    class="form-control bg-dark text-light border-secondary font-monospace small" rows="15"
                    placeholder="// Cole seu código Solidity aqui..."></textarea>
                </div>

                <!-- Legacy/Hidden Elements for JS compatibility -->
                <pre id="cardSourcePreview" class="d-none">-</pre>
                <textarea id="f_metadata" class="d-none"></textarea>

                <!-- Helper elements for JS resets -->
                <div class="d-none">
                  <div id="cardContractName">-</div>
                  <div id="cardFQN">-</div>
                  <div id="cardChainIdText">-</div>
                  <div id="cardAddressText">-</div>
                  <div id="cardMetadataPreview">-</div>
                  <div id="explorerStatusText"></div>
                </div>
              </div>

              <!-- Warnings/Status -->
              <div id="walletWarning" class="alert alert-warning mt-3 d-none">
                <i class="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Atenção:</strong> O endereço informado é uma carteira (EOA) e não possui código de contrato.
              </div>

              <div id="apiKeyField" class="d-none">
                <input id="f_apiKey" type="password" value="I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5" />
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div id="actionButtons" class="d-flex gap-2 justify-content-end mt-4">
            <div id="verifyStatus" class="small text-muted me-auto align-self-center"></div>

            <button id="runVerify" class="btn btn-success px-4" disabled>
              <span id="verifySpinner" class="spinner-border spinner-border-sm me-2 d-none"></span>
              <i class="bi bi-shield-check me-2"></i>
              <span id="verifyBtnText">Verificar Contrato</span>
            </button>

            <button id="btnClearAll" class="btn btn-outline-danger">
              <i class="bi bi-trash me-2"></i> Limpar Dados
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>

  <?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/modules/verifica/api-config.js"); } ?>
  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/verifica/verifica-index.js"); } ?>
