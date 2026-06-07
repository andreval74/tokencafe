<?php
$pageTitle          = "RPC Manager - TokenCafe";
$pageDescription    = "Adicione e gerencie RPCs personalizados para redes blockchain.";
$pageKeywords       = "RPC, blockchain, MetaMask, rede, personalizado";
$headerVariant      = "module";
$moduleHeaderTitle    = "RPC Manager";
$moduleHeaderSubtitle = "Adicione redes blockchain personalizadas";
$moduleHeaderIcon     = "bi-diagram-3";
$moduleHeaderIconAlt  = "RPC Manager";
?>

<div class="container-fluid px-3 px-lg-4 py-4">

  <!-- ── Seção 1: Busca de rede ─────────────────────────────────── -->
  <div id="network-section" data-component="modules/network/network-search.php"></div>

  <!-- ── Seção 2: Configuração de RPC ──────────────────────────── -->
  <div id="token-section">
    <div class="tcd-card d-none" id="rpc-config-section">
      <div class="tcd-card-head mb-3">
        <div class="tcd-card-head-icon--blue">
          <i class="bi bi-plus-circle"></i>
        </div>
        <div>
          <h3>Adicionar RPC</h3>
          <p>Escolha ou cadastre o endereço RPC para a rede selecionada</p>
        </div>
      </div>

      <!-- Alternador: Lista vs RPC personalizado -->
      <div class="d-flex gap-2 mb-4">
        <button id="btn-show-rpc-list" class="tc-btn-test-ds px-4 py-2" type="button">
          <i class="bi bi-list-ul me-2"></i>Escolher RPCs
        </button>
        <button id="btn-show-custom-rpc" class="tc-btn-secondary-ds px-4 py-2" type="button">
          <i class="bi bi-pencil me-2"></i>Cadastrar RPC
        </button>
      </div>

      <!-- Cadastro manual de RPC -->
      <div id="custom-rpc-section" class="mb-4 d-none">
        <div class="tc-field">
          <label class="tc-field-label" for="customRpcUrl">URL do RPC Personalizado</label>
          <div class="d-flex gap-2">
            <input type="url" class="tc-field-input flex-grow-1" id="customRpcUrl"
              placeholder="https://rpc.suarede.io" />
            <button id="btn-test-custom-rpc" class="tc-btn-test-ds px-3 flex-shrink-0" title="Testar latência">
              <i class="bi bi-speedometer2 me-1"></i>Testar
            </button>
          </div>
          <span class="tc-field-hint">Cole o endereço RPC que deseja adicionar à sua carteira</span>
        </div>
      </div>

      <!-- Lista de RPCs disponíveis -->
      <div id="rpc-options-section" class="mb-4 d-none">
        <div class="tc-field-label mb-2">RPCs disponíveis — clique em Testar e selecione o mais rápido</div>
        <div id="rpc-options-list" class="list-group"></div>
      </div>

    </div>
  </div>

  <!-- Ações -->
  <div class="tcd-card">
    <div class="d-flex flex-wrap gap-2">
      <button id="btn-clear" class="tc-btn-clear-ds px-4 py-2">
        <i class="bi bi-trash me-2"></i>Limpar
      </button>
      <button id="add-network-btn" class="tc-btn-primary-ds px-4 py-2" disabled>
        <i class="bi bi-plus-lg me-2"></i>Adicionar Rede
      </button>
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>

  <div id="generate-section"></div>

</div>

<?php if (isset($enqueue_script_module)) {
  $enqueue_script_module("assets/js/modules/rpc/rpc-logic.js");
} ?>
<?php if (isset($enqueue_script_module)) {
  $enqueue_script_module("assets/js/modules/rpc/rpc-index.js");
} ?>