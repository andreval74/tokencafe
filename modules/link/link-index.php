<?php
$pageTitle = "Gerador de Links - TokenCafe";
$pageDescription = "Crie links compartilháveis para tokens em redes blockchain.";
$pageKeywords = "token, link, blockchain, MetaMask, compartilhar";
$headerVariant = "module";
$moduleHeaderTitle = "Gerador de Links";
$moduleHeaderSubtitle = "Crie e compartilhe links de tokens";
$moduleHeaderIcon = "fa-link";
$moduleHeaderIconAlt = "Link Generator";
?>

<div class="container-fluid px-3 px-lg-4 py-4">

  <!-- ── Seção 1: Selecionar Rede ── -->
  <div id="network-section" data-component="modules/network/network-search.php"></div>

  <!-- ── Seção 2: Dados do Token ── -->
  <div id="token-section" class="mb-4 d-none">
    <div data-component="modules/contrato/contract-search.php" data-cs-strict-errors="true" data-cs-allow-wallet="true"></div>
  </div>

  <!-- ── Seção 3: Link Gerado ── -->
  <div id="generate-section" class="mb-4 d-none">

    <div class="tcd-card">
      <div class="tcd-card-head mb-3">
        <div class="tcd-card-head-icon--blue">
          <i class="bi bi-link-45deg"></i>
        </div>
        <div>
          <h3>Link Gerado</h3>
          <p>Seu link está pronto para ser compartilhado</p>
        </div>
      </div>

      <div class="d-flex gap-2 mb-4">
        <div class="tc-field flex-grow-1 mb-0">
          <div class="d-flex gap-2">
            <input type="text" id="generatedLink" class="tc-field-input flex-grow-1" readonly placeholder="https://...">
          </div>
        </div>
        <button class="tc-icon-btn-ds tc-action-copy flex-shrink-0" id="copyAddressBtn" type="button" title="Copiar">
          <i class="bi bi-clipboard"></i>
        </button>
      </div>

      <div class="d-flex flex-wrap gap-2">
        <button id="btnShareWhatsAppSmall" class="tc-btn-test-ds tc-action-whatsapp flex-grow-1">
          <i class="bi bi-whatsapp me-2"></i>WhatsApp
        </button>
        <button id="btnShareTelegramSmall" class="tc-btn-test-ds tc-action-telegram flex-grow-1">
          <i class="bi bi-telegram me-2"></i>Telegram
        </button>
        <button id="btnShareEmailSmall" class="tc-btn-test-ds tc-action-email flex-grow-1">
          <i class="bi bi-envelope me-2"></i>Email
        </button>
        <button id="btnOpenExplorerSmall" class="tc-btn-test-ds tc-action-explorer flex-grow-1">
          <i class="bi bi-box-arrow-up-right me-2"></i>Visitar
        </button>
        <button id="btnAddNetworkSmall" class="tc-btn-test-ds flex-grow-1">
          <i class="bi bi-hdd-network me-2"></i>Adicionar Rede
        </button>
        <button id="btnAddToMetaMaskSmall" class="tc-btn-primary-ds flex-grow-1">
          <i class="bi bi-wallet2 me-2"></i>Adicionar Token
        </button>
      </div>
    </div>

  </div>

  <!-- ── Botões de ação ── -->
  <div class="tcd-card" id="add-network-section">
    <div class="d-flex flex-wrap gap-2">
      <button id="btn-clear" class="tc-btn-clear-ds px-4 py-2">
        <i class="bi bi-trash me-2"></i>Limpar
      </button>
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>

</div>

<?php if (isset($enqueue_script_module)) {
  $enqueue_script_module("assets/js/modules/link/link-index.js");
} ?>
