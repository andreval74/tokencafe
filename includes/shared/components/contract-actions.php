<!-- Download de Arquivos -->
<?php
$adminConfigPath = __DIR__ . "/../../admin-config.php";
if (is_file($adminConfigPath)) require_once $adminConfigPath;
$walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$isAdmin = function_exists("tokencafe_is_admin_wallet") ? tokencafe_is_admin_wallet($walletCookie) : false;
if (!$isAdmin && trim($walletCookie) === "" && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) $isAdmin = true;
$filesSectionClass = $isAdmin ? "" : " d-none";
?>
<script>
  window.TOKENCAFE_IS_ADMIN = <?= $isAdmin ? "true" : "false" ?>;
</script>
<div class="col-12 mb-4 mt-4<?= $filesSectionClass ?>" id="files-section">
  <div data-component="shared/components/section-title.php" data-st-icon="bi-file-arrow-down"
    data-st-title="Visualizar Arquivos" data-st-subtitle="Arquivos gerados durante o deploy"></div>
  <div class="border rounded p-3 bg-dark-elevated">
    <div class="row g-2">
      <div class="col-12 col-md-3">
        <button id="btnDownloadSol" class="btn btn-outline-primary w-100">
           <i class="bi bi-file-earmark-text me-1"></i>
           .sol
        </button>
      </div>
      <div class="col-12 col-md-3">
        <button id="btnDownloadJson" class="btn btn-outline-primary w-100">
          <i class="bi bi-filetype-json me-1"></i>
          .json
        </button>
      </div>
      <div class="col-12 col-md-3">
        <button id="btnDownloadAbi" class="btn btn-outline-primary w-100">
          <i class="bi bi-braces me-1"></i>
          ABI
        </button>
      </div>
      <div class="col-12 col-md-3">
        <button id="btnDownloadDeployedBytecode" class="btn btn-outline-primary w-100">
          <i class="bi bi-code-slash me-1"></i>
          ByteCode
        </button>
      </div>
    </div>
    <small class="text-secondary mt-2 d-block">
      <i class="bi bi-info-circle me-1"></i>
      Salve estes arquivos. Eles são importantes para futuras verificações ou interações.
    </small>
  </div>
</div>
