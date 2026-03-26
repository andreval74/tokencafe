<?php
  $pageTitle = "Gerenciador de RPCs - TokenCafe";
  $pageDescription = "Adicione e gerencie RPCs personalizados para redes blockchain.";
  $pageKeywords = "RPC, blockchain, MetaMask, rede, personalizado";
  $headerVariant = "module";
  $moduleHeaderTitle = "Gerenciador de RPCs";
  $moduleHeaderSubtitle = "Adicione redes blockchain personalizadas";
  $moduleHeaderIcon = "bi-diagram-3";
  $moduleHeaderIconAlt = "RPC Manager";
?>
  <!-- corpo do html -->
  <div class="container">
    <div class="g-4">
      <div class="col-12">
        <!-- Seleção da Rede -->
        <div class="mb-4" id="network-section">
          <div data-component="shared/components/network-search.php"></div>
        </div>
        <div id="token-section" class="mb-4">
          <!-- ===== SEÇÃO 2: INSERIR RPC PERSONALIZADA===== -->
          <div class="mb-4 d-none" id="rpc-config-section">
            <div data-component="shared/components/section-title.php" data-st-icon="bi-plus-circle"
              data-st-title="Adicionar RPC" data-st-subtitle="Adicione o RPC à rede configurada na sua carteira."></div>

            <!-- Alternador simples: Lista vs RPC personalizada -->
            <div class="d-flex align-items-center gap-2 mb-3">
              <button id="btn-show-rpc-list" class="btn btn-sm btn-outline-primary" type="button">Escolher RPCs</button>
              <button id="btn-show-custom-rpc" class="btn btn-sm btn-outline-primary" type="button">Cadastrar
                RPC</button>
            </div>

            <!-- Cadastro manual de RPC (mostra apenas quando selecionado) -->
            <div id="custom-rpc-section" class="mb-3 d-none">
              <label for="customRpcUrl" class="form-label d-flex align-items-center gap-2 mb-1">
                <span>Cadastrar RPC PERSONALIZADA</span>
              </label>
              <div class="input-group">
                <input type="url" class="form-control monospace-input" id="customRpcUrl"
                  placeholder="Inclua o RPC personalizado aqui." />
                <button id="btn-test-custom-rpc" class="btn btn-outline-primary" title="Testar">
                  <i class="bi bi-speedometer2"></i>
                </button>
              </div>
            </div>

            <!-- Seleção de RPCs disponíveis da rede -->
            <div id="rpc-options-section" class="mb-3 d-none">
              <label class="form-label d-flex align-items-center gap-2">
                <span>Teste e Escolha a RPC que deseja incluir.</span>
              </label>
              <div id="rpc-options-list" class="list-group"></div>
            </div>

            <!-- Botões de ação -->
            <div class="d-flex gap-2 justify-content-end mt-4" id="add-network-section">
              <button id="add-network-btn" class="btn btn-outline-primary" disabled>
                <i class="bi bi-plus-lg me-2"></i>
                Adicionar Rede
              </button>
              <button id="btnClearAll" class="btn btn-outline-danger">
                <i class="bi bi-trash me-2"></i>Limpar Dados
              </button>

              <!-- Botão Home -->
              <a href="index.php?page=tools" class="btn btn-outline-success px-4 fw-bold">
                <i class="bi bi-house-door me-2"></i>Home
              </a>
            </div>
          </div>
        </div>
        <div id="generate-section" class="mb-4">
        </div>
      </div>
    </div>
  </div>

  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/rpc/rpc-logic.js"); } ?>
  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/rpc/rpc-index.js"); } ?>
