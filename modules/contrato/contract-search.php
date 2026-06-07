<div class="contract-search-component">
  <div id="contract-search-root" class="tcd-card">
    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon">
        <i class="bi bi-search text-white"></i>
      </div>
      <div>
        <h3 id="cs_title">Buscar Contrato/Token</h3>
        <p id="cs_subtitle">Informe o endereço 0x... do contrato/token</p>
      </div>
    </div>
    <form id="tokenForm" novalidate>
      <div class="tc-field mb-0">
        <div class="d-flex gap-2">
          <input type="text" id="f_address" class="tc-field-input tc-field-input--mono flex-grow-1" placeholder="0x..."
            autocomplete="off" pattern="^0x[a-fA-F0-9]{40}$" />
          <button type="button" class="tc-icon-btn-ds tc-action-copy flex-shrink-0" data-cs-copy-input title="Copiar">
            <i class="bi bi-clipboard"></i>
          </button>
          <button type="button" id="csInfoBtn" class="tc-icon-btn-ds tc-action-info flex-shrink-0" title="Ver detalhes do contrato">
            <i class="bi bi-info-circle"></i>
          </button>
          <button type="button" id="contractSearchBtn" class="tc-icon-btn-ds tc-action-search flex-shrink-0" title="Buscar" aria-label="Buscar">
            <i class="bi bi-search"></i>
          </button>
        </div>
      </div>
      <input id="tokenAddress" type="hidden" class="d-none" />
      <div id="contractSearchStatus" class="tc-status-text d-none mt-2">
        <span id="contractSearchSpinner" class="spinner-border spinner-border-sm me-2 d-none" role="status" aria-hidden="true"></span>
        <span id="contractSearchStatusText"></span>
      </div>
    </form>
  </div>

  <!-- Card de detalhes do contrato: partial compartilhado em modules/contrato/ -->
  <div id="selected-contract-info" class="mt-3 d-none">
    <?php include __DIR__ . '/contract-info-card.php'; ?>
  </div>

  <!-- Card de carteira (EOA): exibido no lugar do card de contrato quando o
       endereço buscado é uma Carteira Pessoal. Partial compartilhado com wallet-index.php. -->
  <div id="cs-wallet-view" class="mt-3 d-none">
    <?php include __DIR__ . '/../wallet/wallet-info-card.php'; ?>
  </div>

  <!-- Seção de análise estendida: separada dos dados, ocultável independentemente -->
  <div id="cs-extended-info" class="d-none">

    <!-- Propriedades: ícone + título + badges inline -->
    <div id="cs_capabilitiesSection" class="tcd-card mt-3 d-none">
      <div class="tcd-card-head mb-0">
        <div class="tcd-card-head-icon--purple flex-shrink-0">
          <i class="bi bi-shield-shaded text-white"></i>
        </div>
        <h3 class="me-auto mb-0">Propriedades do Contrato</h3>
        <div id="cs_capabilitiesBadges" class="d-flex flex-wrap gap-2"></div>
      </div>
    </div>

    <!-- Análise por IA: sempre visível — JS substitui o placeholder quando o código estiver disponível -->
    <div id="cs_analysisSection" class="tcd-card mt-3">
      <div class="tcd-card-head mb-2">
        <div class="tcd-card-head-icon--blue flex-shrink-0">
          <i class="bi bi-cpu text-white"></i>
        </div>
        <div>
          <h3 class="mb-0">Análise do Contrato</h3>
          <p id="cs_analysisSubtitle" class="mb-0">Leitura do código verificado</p>
        </div>
      </div>
      <div id="cs_analysisLoading" class="d-none d-flex align-items-center gap-2 tc-note mb-2">
        <span class="spinner-border spinner-border-sm text-secondary" role="status" aria-hidden="true"></span>
        Consultando IA...
      </div>
      <!-- Placeholder exibido até análise carregar ou quando indisponível -->
      <div id="cs_analysisPlaceholder" class="tc-modal-details-box d-flex align-items-start gap-2">
        <i class="bi bi-info-circle text-info flex-shrink-0 mt-1"></i>
        <span class="tc-text-sm tc-status-text">
          A análise por IA fica disponível quando o sistema tem acesso ao código-fonte/ABI
          (contrato verificado no explorer ou contrato gerado pelo TokenCafe na sessão atual).
          Se ainda não houver código disponível, aguarde a verificação ou gere novamente.
        </span>
      </div>
      <p id="cs_analysisText" class="tc-note mb-0 d-none" style="line-height:1.7"></p>
    </div>

  </div>

  <?php
  $tc_contract_search_js = __DIR__ . "/../../assets/js/shared/contract-search.js";
  $tc_contract_search_v = @filemtime($tc_contract_search_js);
  if (!$tc_contract_search_v && defined("ASSET_VERSION")) $tc_contract_search_v = ASSET_VERSION;
  if (!$tc_contract_search_v) $tc_contract_search_v = "1";
  ?>
  <script type="module" src="assets/js/shared/contract-search.js?v=<?= urlencode((string) $tc_contract_search_v) ?>"></script>
</div>
