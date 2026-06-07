<?php
  $pageTitle = "Análise de Contrato - TokenCafe";
  $pageDescription = "Analise, verifique e explore dados on-chain de contratos inteligentes.";
  $pageKeywords = "análise, smart contract, explorer, sourcify, solidity, movimentação";
  $headerVariant = "module";
  $moduleHeaderTitle = "Analisar Contrato";
  $moduleHeaderSubtitle = "Análise, verificação e dados on-chain";
  $moduleHeaderIcon = "fa-shield";
  $moduleHeaderIconAlt = "Análise";
?>

<div class="container-fluid px-3 px-lg-4 py-4">

  <!-- API Status -->
  <div data-component="includes/api-status.php"></div>

  <!-- ── Seção 1: Rede ── -->
  <div id="network-section" data-component="modules/network/network-search.php"></div>

  <!-- ── Seção 2: Dados do Contrato ── -->
  <div id="token-section" class="d-none">
    <div data-component="modules/contrato/contract-search.php" data-cs-auto-open="true" data-cs-allow-wallet="true" data-cs-strict-errors="true"></div>

    <input id="f_chainId" type="hidden" />

    <div class="mt-3">
      <div class="row g-2">
        <div id="col-contract-name" class="col-md-6 d-none">
          <div class="tc-field">
            <label class="tc-field-label" for="f_contractName">
              Nome do contrato <span class="tc-required">*</span>
              <i class="bi bi-info-circle ms-1" data-bs-toggle="tooltip" title="Nome exato do contrato no código fonte"></i>
            </label>
            <input id="f_contractName" class="tc-field-input" placeholder="Ex: MyToken" />
          </div>
        </div>

        <div id="col-compiler-version" class="col-md-6 d-none">
          <div class="tc-field">
            <label class="tc-field-label" for="f_compilerVersion">
              Versão do compilador <span class="tc-required">*</span>
              <span id="compVerLockIcon" class="ms-1 text-warning d-none"><i class="bi bi-lock-fill"></i></span>
            </label>
            <input id="f_compilerVersion" class="tc-field-input" placeholder="v0.8.20..." list="compilerVersions" readonly />
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
            <span id="compVerHelp" class="tc-field-hint d-none">Versão obtida do metadata.json</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Seção 3: Verificação ── -->
  <div id="generate-section" class="d-none">

    <div class="tcd-card">
      <div class="tcd-card-head mb-3">
        <div class="tcd-card-head-icon--purple">
          <i class="bi bi-code-square"></i>
        </div>
        <div>
          <h3>Código Fonte e Verificação</h3>
          <p>Forneça o código fonte para verificação</p>
        </div>
        <div class="ms-auto d-flex gap-1">
          <span id="verifyStatusBadge" class="badge tc-badge-module align-self-center">Aguardando</span>
        </div>
      </div>

      <!-- Ações do código-fonte -->
      <div id="sourceCodeActions" class="d-flex gap-2 mb-3 flex-wrap">
        <button id="importSourceBtn" class="tc-btn-test-ds" title="Importar Arquivo">
          <i class="bi bi-upload me-1"></i>Importar
        </button>
        <button id="pasteSourceBtn" class="tc-btn-test-ds" title="Colar">
          <i class="bi bi-clipboard me-1"></i>Colar
        </button>
        <button id="copySourceBtn" class="tc-btn-test-ds" title="Copiar">
          <i class="bi bi-copy"></i>
        </button>
        <button id="clearSourceBtn" class="tc-btn-clear-ds" title="Limpar código">
          <i class="bi bi-trash"></i>
        </button>
      </div>

      <input id="importSourceFile" type="file" class="d-none" accept=".sol,.vy,.txt" />

      <textarea id="f_sourceCode" class="tc-field-input tc-field-input--code" rows="15"
        placeholder="// Cole seu código Solidity aqui..."></textarea>

      <!-- Elementos legados ocultos para compatibilidade JS -->
      <pre id="cardSourcePreview" class="d-none">-</pre>
      <textarea id="f_metadata" class="d-none"></textarea>
      <div class="d-none">
        <div id="cardContractName">-</div>
        <div id="cardFQN">-</div>
        <div id="cardChainIdText">-</div>
        <div id="cardAddressText">-</div>
        <div id="cardMetadataPreview">-</div>
        <div id="explorerStatusText"></div>
      </div>

      <div id="walletWarning" class="tc-warning-box mt-3 d-none">
        <i class="bi bi-exclamation-triangle-fill me-2 tc-warning-box-icon"></i>
        <strong>Atenção:</strong> O endereço informado é uma carteira (EOA) e não possui código de contrato.
      </div>

      <?php
      // Lida de api/.env via helper — nunca hardcoded no template
      if (!function_exists('tokencafe_load_api_env')) {
          require_once __DIR__ . '/../../includes/system-config.php';
      }
      $_analiseApiEnv = tokencafe_load_api_env();
      $_analiseExplorerKey = $_analiseApiEnv['EXPLORER_API_KEY'] ?? ($_analiseApiEnv['BSCSCAN_API_KEY'] ?? '');
      ?>
      <div id="apiKeyField" class="d-none">
        <input id="f_apiKey" type="password" value="<?= htmlspecialchars($_analiseExplorerKey, ENT_QUOTES, 'UTF-8') ?>" />
      </div>
    </div>

    <!-- Botões de ação -->
    <div id="actionButtons" class="tcd-card">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <div id="verifyStatus" class="me-auto tc-status-text"></div>
        <button id="runVerify" class="tc-btn-primary-ds px-4 py-2" disabled>
          <span id="verifySpinner" class="spinner-border spinner-border-sm me-2 d-none"></span>
          <i class="bi bi-shield-check me-2"></i>
          <span id="verifyBtnText">Analisar Contrato</span>
        </button>
        <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
          <i class="bi bi-house-door me-2"></i>Início
        </a>
      </div>
    </div>

  </div>

</div>

<?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/shared/api-config.js"); } ?>
<?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/analise/analise-index.js"); } ?>
