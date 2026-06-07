<?php
$pageTitle          = "Carteira Web3 - TokenCafe";
$pageDescription    = "Veja o saldo, endereço e rede da sua carteira Web3.";
$pageKeywords       = "wallet, MetaMask, TrustWallet, blockchain, crypto, Web3";
$headerVariant      = "module";
$moduleHeaderTitle    = "Carteira";
$moduleHeaderSubtitle = "Conecte e gerencie sua carteira Web3";
$moduleHeaderIcon     = "fa-wallet";
$moduleHeaderIconAlt  = "TokenCafe";
?>

<div class="container-fluid px-3 px-lg-4 py-4">

  <!-- ── Estado: sem carteira ── -->
  <div id="wallet-empty-state" class="tcd-card text-center py-5">
    <div class="tc-wallet-empty-icon">
      <i class="bi bi-wallet2 fs-4 text-success"></i>
    </div>
    <div class="fw-bold text-white mb-1">Carteira não conectada</div>
    <p class="tc-wallet-empty-desc">
      Use o botão Conectar no topo da página para exibir as informações da sua carteira.
    </p>
  </div>

  <!-- ── Estado: carteira conectada ── -->
  <div id="wallet-info-section" class="d-none">

    <!-- Card principal: compartilhado com EOA no contract-search -->
    <?php include __DIR__ . '/wallet-info-card.php'; ?>

    <!-- Card: RPC URL + RPCs Personalizados -->
    <div class="tcd-card">
      <div class="tcd-card-head mb-2">
        <div class="tcd-card-head-icon">
          <i class="bi bi-diagram-3 text-primary"></i>
        </div>
        <div>
          <h3>RPCs Personalizados</h3>
          <p>Conexões adicionadas manualmente para esta rede</p>
        </div>
      </div>
      <div class="tc-data-row">
        <span class="tc-data-label">RPC URL</span>
        <a id="rpcUrl" href="#" target="_blank" rel="noopener" class="tc-data-value--url"></a>
      </div>
      <div id="customRpcs" class="tc-data-value--url"></div>
    </div>

  </div>

  <!-- ── Rodapé ── -->
  <div class="tcd-card mt-3">
    <div class="d-flex flex-wrap gap-2 align-items-center">
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>

</div>

<?php if (isset($enqueue_script_module)) {
  $enqueue_script_module("assets/js/modules/wallet/wallet-index.js");
} ?>
