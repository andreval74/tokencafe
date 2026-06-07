<?php
$pageTitle            = "Implementar Token - TokenCafe";
$pageDescription      = "Revise a configuração, confirme os custos e implante seu token na blockchain.";
$pageKeywords         = "token, deploy, smart contract, blockchain, ERC-20";
$headerVariant        = "module";
$moduleHeaderTitle    = "Implementar Token";
$moduleHeaderSubtitle = "Revisão e Deploy";
$moduleHeaderIcon     = "fa-rocket";
$moduleHeaderIconAlt  = "Deploy";
?>

<div class="container-fluid px-3 px-lg-4 py-4">

  <!-- ── 01 · Revisão do Token ────────────────────────────────────── -->
  <div class="tcd-card mb-3 tc5-step-card">
    <span class="tc5-step-number">01</span>
    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon">
        <i class="bi bi-file-earmark-code text-white"></i>
      </div>
      <div>
        <h3 style="color:var(--tokencafe-primary)">Revisão do Token</h3>
        <p>Confirme os dados antes de prosseguir</p>
      </div>
    </div>

    <div class="tc-modal-details-box mb-3">
      <div id="deploy-summary">

        <!-- Loading (visível até JS preencher os dados) -->
        <div id="ds-loading" class="tc-loading-box">
          <div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
          <span class="tc-loading-box-text">Carregando configuração...</span>
        </div>

        <!-- Rede (Chain ID) -->
        <div class="tc-data-row d-none" id="ds-network-row">
          <span class="tc-data-label">Rede (Chain ID)</span>
          <span id="ds-view-network" class="tc-data-value--mono"></span>
        </div>

        <!-- Nome + Símbolo -->
        <div class="tc-data-row d-none" id="ds-name-row">
          <span class="tc-data-label">Nome</span>
          <span id="ds-view-name" class="tc-data-value--mono"></span>
          <span class="tc-data-label">Símbolo</span>
          <span id="ds-view-symbol" class="tc-data-value--mono"></span>
        </div>

        <!-- Decimais + Supply -->
        <div class="tc-data-row d-none" id="ds-decimals-row">
          <span class="tc-data-label">Decimais</span>
          <span id="ds-view-decimals" class="tc-data-value--mono"></span>
          <span class="tc-data-label">Supply</span>
          <span id="ds-view-supply" class="tc-data-value--mono"></span>
        </div>

        <!-- Tipo de Contrato -->
        <div class="tc-data-row d-none" id="ds-type-row">
          <span class="tc-data-label">Tipo de Contrato</span>
          <span id="ds-view-type" class="tc-data-value--mono"></span>
        </div>

        <!-- Funcionalidades -->
        <div class="tc-data-row d-none" id="ds-features-row">
          <span class="tc-data-label">Funcionalidades</span>
          <span id="ds-view-features" class="tc-data-value--mono d-flex flex-wrap gap-1"></span>
        </div>

        <!-- Owner + Holder (oculto por padrão; JS exibe quando configurado) -->
        <div class="tc-data-row d-none" id="ds-owner-row">
          <span class="tc-data-label">Owner</span>
          <span id="ds-view-owner" class="tc-data-value--mono"></span>
          <span class="tc-data-label d-none" id="ds-holder-label">Holder</span>
          <span id="ds-view-holder" class="tc-data-value--mono d-none"></span>
        </div>

        <!-- Venda: Preço + Min/Max (oculto por padrão) -->
        <div class="tc-data-row d-none" id="ds-sale-row">
          <span class="tc-data-label">Preço / token</span>
          <span id="ds-view-sale-price" class="tc-data-value--mono"></span>
          <span class="tc-data-label">Compra mín / máx</span>
          <span id="ds-view-sale-minmax" class="tc-data-value--mono"></span>
        </div>

        <!-- Venda: Carteira de recebimento (oculto por padrão) -->
        <div class="tc-data-row d-none" id="ds-sale-wallet-row">
          <span class="tc-data-label">Carteira de venda</span>
          <span id="ds-view-sale-wallet" class="tc-data-value--mono"></span>
        </div>

        <!-- Outras configs: Licença etc. (oculto por padrão) -->
        <div class="tc-data-row d-none" id="ds-other-row">
          <span class="tc-data-label">Outras configs</span>
          <span id="ds-view-other" class="tc-data-value--mono"></span>
        </div>

      </div>
    </div>
  </div>

  <!-- ── 02 · Declarações ─────────────────────────────────────────── -->
  <div class="tcd-card mb-3 tc5-step-card">
    <span class="tc5-step-number">02</span>
    <div class="tcd-card-head mb-4">
      <div class="tcd-card-head-icon--purple">
        <i class="bi bi-file-earmark-check"></i>
      </div>
      <div>
        <h3 style="color:#c084fc">Declarações</h3>
        <p>Leia e confirme antes de prosseguir</p>
      </div>
    </div>

    <!-- País (compacto com toggle Alterar) -->
    <div class="tc-modal-details-box mb-3">
      <div class="d-flex align-items-center justify-content-between gap-2">
        <div class="d-flex align-items-center gap-3">
          <span id="countryFlagDisplay" class="fw-semibold fs-5">🇧🇷</span>
          <div>
            <div class="fw-semibold text-white" id="countryNameDisplay">Brasil</div>
            <div class="tc-status-text tc-text-sm">País usado para fins de cobrança e elegibilidade.</div>
          </div>
        </div>
        <button type="button" id="btnAlterarPais" class="tc-btn-clear-ds px-3 py-1 flex-shrink-0">Alterar</button>
      </div>
      <div class="d-none mt-3" id="countrySelectWrap">
        <select class="tc-field-select" id="feeCountrySelect">
          <option value="BR" selected>🇧🇷 Brasil</option>
          <option value="EU">🇪🇺 Europa</option>
          <option value="OT">🏳️ Outro país</option>
          <option value="US">🇺🇸 United States</option>
          <option value="SN">⛔ País sancionado</option>
        </select>
      </div>
    </div>

    <!-- Aviso legal -->
    <div class="tc-modal-details-box mb-3">
      <div class="d-flex align-items-center gap-2">
        <i class="bi bi-exclamation-triangle flex-shrink-0" style="color:#fbbf24"></i>
        <span class="tc-text-sm tc-status-text">
          <strong class="text-white">Esta plataforma fornece apenas infraestrutura tecnológica</strong>
          — não oferece assessoria jurídica ou financeira.
        </span>
      </div>
    </div>

    <!-- Declaração única combinada (último item — usuário confirma após ler tudo) -->
    <div class="tc-modal-details-box">
      <div class="form-check mb-0">
        <input class="form-check-input" type="checkbox" id="checkAll">
        <label class="form-check-label tc-text-sm tc-status-text" for="checkAll">
          Confirmo que tenho <strong class="text-white">+18 anos</strong>, estou ciente das condições acima,
          sou responsável pelos tributos locais aplicáveis e aceito os
          <a href="index.php?page=termos-e-servicos" target="_blank" class="text-tokencafe">Termos de Uso</a>.
          Entendo que transações blockchain são <strong class="text-white">irreversíveis</strong>.
          <span style="color:#ef4444;font-weight:bold" aria-hidden="true">*</span>
        </label>
      </div>
    </div>

  </div>

  <!-- ── 03 · Cobrança e Custos ────────────────────────────────────── -->
  <div class="tcd-card mb-3 tc5-step-card">
    <span class="tc5-step-number">03</span>
    <div class="tcd-card-head mb-4">
      <div class="tcd-card-head-icon--green">
        <i class="bi bi-cash-coin fs-5"></i>
      </div>
      <div>
        <h3 style="color:#4ade80">Cobrança e Custos</h3>
        <p id="billing-section-subtitle">Valores da transação</p>
      </div>
    </div>


    <!-- Esquerda: Código de Indicação + Explicação -->
    <div class="tc-modal-details-box mb-3">
      <div class="row g-4">
        <div class="col-12 col-md-4">
          <!-- Card: carteira que vai pagar taxa + gás (JS preenche endereço, saldo e select) -->
          <div class="tc-modal-details-box mb-3" id="billing-wallet-card">
            <div class="tcd-card-head mb-2">
              <div class="tcd-card-head-icon--blue">
                <i class="bi bi-wallet2 fs-5"></i>
              </div>
              <div>
                <h3 style="color:#60a5fa">Carteira de Pagamento</h3>
                <p>Carteira conectada para pagar a taxa e o gás.</p>
              </div>
            </div>
            <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
              <span class="font-monospace tc-text-sm" id="billing-wallet-addr" style="color:#e2e8f0">—</span>
              <span class="tc-text-sm tc-status-text" id="billing-wallet-bal">calculando...</span>
            </div>
            <!-- Seletor (JS exibe somente quando há 2+ contas) -->
            <div class="d-none" id="billing-select-wrap">
              <select class="tc-field-select" id="feeBillingSelect" aria-label="Selecionar carteira de pagamento"></select>
            </div>
            <!-- Alerta de saldo insuficiente -->
            <div id="deploy-balance-alert" class="d-none alert alert-danger d-flex align-items-center gap-2 py-2 tc-text-sm mt-2 mb-0">
              <i class="bi bi-exclamation-triangle-fill flex-shrink-0"></i>
              <span>Saldo insuficiente para cobrir a taxa e o gás. Adicione fundos ou troque de carteira.</span>
            </div>
          </div>

          <!-- Código de Indicação -->
          <div class="tc-modal-details-box mb-3">
            <div class="tcd-card-head mb-2">
              <div class="tcd-card-head-icon--purple">
                <i class="bi bi-gift-fill fs-5"></i>
              </div>
              <div class="d-flex align-items-start justify-content-between flex-grow-1 gap-2">
                <div>
                  <h3 style="color:#c084fc">Código de Indicação</h3>
                  <p>Informe a carteira de quem te indicou para obter 10% de desconto.</p>
                </div>
                <span class="tc-badge-module tc-status-ok d-none flex-shrink-0" id="ref-active-badge">
                  <i class="bi bi-check-circle-fill me-1"></i>Desconto ativo
                </span>
              </div>
            </div>
            <div id="referral-card">
              <div class="tc-field mb-0">
                <div class="d-flex gap-2">
                  <input
                    type="text"
                    id="referral-address-input"
                    class="tc-field-input flex-grow-1"
                    placeholder="0x... endereço de quem te indicou"
                    maxlength="42"
                    autocomplete="off"
                    spellcheck="false" />
                  <button id="btn-check-referral" type="button" class="tc-icon-btn-ds flex-shrink-0" title="Verificar endereço">
                    <i class="bi bi-check-lg"></i>
                  </button>
                  <button id="btn-clear-referral" type="button" class="tc-icon-btn-ds tc-action-clear flex-shrink-0" title="Limpar campo">
                    <i class="bi bi-trash"></i>
                  </button>
                </div>
                <div id="ref-addr-feedback" class="tc-field-hint tc-referral-feedback"></div>
              </div>
              <div id="ref-currency-selector" class="d-none"></div>
            </div>
            <!-- Explicação do fluxo (preenchida pelo JS após calcular custos) -->
            <div id="deploy-explanation" class="mt-2 pt-2 tc-divider-top"></div>
          </div>

        </div>

        <!-- Direita: Detalhamento de custos + Total (preenchido pelo JS) -->
        <div class="col-12 col-md-8">
          <div id="deploy-fees">
            <div class="tc-modal-details-box d-flex align-items-start gap-3">
              <div class="tc-modal-icon--warning flex-shrink-0">
                <i class="bi bi-wallet2 fs-5"></i>
              </div>
              <div>
                <div class="tc-modal-message-title">Carteira não conectada</div>
                <p class="tc-modal-message-desc mb-0">Conecte sua carteira para calcular a taxa de serviço e o custo de gas estimado.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Alerta testnet — largura total, abaixo das duas colunas (preenchido pelo JS) -->
      <div id="deploy-testnet-alert"></div>

    </div>
  </div>

  <!-- ── Ações ─────────────────────────────────────────────────────── -->
  <div class="tcd-card" id="deploy-actions">
    <div id="deploy-error" class="alert alert-danger d-none mb-3 tc-text-sm py-2" role="alert"></div>
    <div class="d-flex flex-wrap gap-2 align-items-center">
      <a href="index.php?page=contrato" class="tc-btn-clear-ds px-4 py-2 text-decoration-none">
        <i class="bi bi-arrow-left me-2"></i>Voltar
      </a>
      <button id="btnImplementar" type="button" class="tc-btn-primary-ds px-4 py-2" disabled>
        <i class="bi bi-rocket-takeoff me-2"></i>Implementar
      </button>
      <div id="deploy-btn-hint" class="tc-status-text tc-text-sm ms-2">
        <i class="bi bi-info-circle me-1"></i>Preencha todos os campos obrigatórios para continuar
      </div>
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>

</div>

<?php if (isset($enqueue_script_src)) {
  $enqueue_script_src("assets/js/shared/api-config.js");
} ?>
<?php if (isset($enqueue_script_module)) {
  $enqueue_script_module("assets/js/modules/contrato/referral.js");
  $enqueue_script_module("assets/js/modules/contrato/contrato-deploy.js");
} ?>
