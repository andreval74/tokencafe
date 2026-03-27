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

  <!-- ==========================================================================
         CONTEÚDO PRINCIPAL - USANDO SISTEMA UNIFICADO
         ========================================================================= -->
  <div class="container">
    <div class="g-4">
      <div class="col-12">
        <!-- ===== SEÇÃO 1: SELECIONAR REDE ===== -->
        <div class="mb-4" id="network-section">
          <div data-component="shared/components/network-search.php"></div>
        </div>

        <!-- ===== SEÇÃO 2: DADOS DO TOKEN ===== -->
        <div id="token-section" class="mb-4 d-none">
          <div data-component="shared/components/contract-search.php" data-cs-strict-errors="true" data-cs-allow-wallet="true"></div>
        </div>

        <!-- ===== SEÇÃO 3: LINK GERADO ===== -->
        <div id="generate-section" class="mb-4 d-none">

          <!-- Header Padronizado -->
          <div data-component="shared/components/section-title.php" data-st-icon="bi bi-link-45deg"
            data-st-title="Link Gerado" data-st-subtitle="Seu link está pronto para ser compartilhado"></div>

          <div class="card bg-dark border-secondary shadow-lg">
            <div class="card-body">

              <div class="input-group mb-3">
                <span class="input-group-text bg-dark border-secondary text-secondary">
                  <i class="bi bi-globe"></i>
                </span>
                <input type="text" id="generatedLink" class="form-control bg-dark text-light border-secondary" readonly
                  placeholder="https://...">

                <button class="btn btn-outline-info" id="copyAddressBtn" type="button" title="Copiar Endereço">
                  <i class="bi bi-clipboard"></i>
                </button>

                <button class="btn btn-outline-light" type="button" id="viewAddressBtn" title="Visitar">
                  <i class="bi bi-box-arrow-up-right"></i>
                </button>
              </div>

              <div class="d-flex flex-wrap gap-2 justify-content-center mb-4">
                <button id="btnShareWhatsAppSmall" class="btn btn-outline-success flex-fill">
                  <i class="bi bi-whatsapp me-2"></i>WhatsApp
                </button>
                <button id="btnShareTelegramSmall" class="btn btn-outline-info flex-fill">
                  <i class="bi bi-telegram me-2"></i>Telegram
                </button>
                <button id="btnShareEmailSmall" class="btn btn-outline-secondary flex-fill">
                  <i class="bi bi-envelope me-2"></i>Email
                </button>
                <button id="btnOpenExplorerSmall" class="btn btn-outline-light flex-fill">
                  <i class="bi bi-box-arrow-up-right me-2"></i>Visitar
                </button>
                <button id="btnAddNetworkSmall" class="btn btn-outline-primary flex-fill">
                  <i class="bi bi-hdd-network me-2"></i>Adicionar Carteira
                </button>
                <button id="btnAddToMetaMaskSmall" class="btn btn-outline-warning flex-fill">
                  <i class="bi bi-wallet2 me-2"></i>Adicionar Token
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- Botões de ação -->
        <div class="d-flex gap-2 justify-content-end mt-4 d-none" id="add-network-section">
          <button id="btnClearAll" class="btn btn-outline-danger">
            <i class="bi bi-trash me-2"></i>Limpar Dados
          </button>
          <a href="index.php?page=tools" class="btn btn-outline-success px-4 fw-bold">
            <i class="bi bi-house-door me-2"></i>Home
          </a>
        </div>
      </div>

      <!-- ===== SEÇÃO 3: LINK GERADO (SISTEMA PADRÃO) ===== -->
      <div class="mb-4">
        <!-- System Response agora é Modal Global -->
      </div>

    </div>
  </div>
  </div>

  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/link/link-index.js"); } ?>
