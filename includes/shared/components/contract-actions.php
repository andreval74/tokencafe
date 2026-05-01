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
        <button id="btnDownloadSol" class="btn btn-outline-primary w-100" type="button">
           <i class="bi bi-file-earmark-text me-1"></i>
           .sol
        </button>
      </div>
      <div class="col-12 col-md-3">
        <button id="btnDownloadJson" class="btn btn-outline-primary w-100" type="button">
          <i class="bi bi-filetype-json me-1"></i>
          .json
        </button>
      </div>
      <div class="col-12 col-md-3">
        <button id="btnDownloadAbi" class="btn btn-outline-primary w-100" type="button">
          <i class="bi bi-braces me-1"></i>
          ABI
        </button>
      </div>
      <div class="col-12 col-md-3">
        <button id="btnDownloadDeployedBytecode" class="btn btn-outline-primary w-100" type="button">
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

<div class="modal fade" id="filePreviewModal" tabindex="-1" aria-labelledby="filePreviewLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content bg-dark-elevated border-secondary text-light">
      <div class="modal-header border-secondary">
        <h5 class="modal-title" id="filePreviewLabel">Preview do Arquivo</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <pre id="filePreviewContent" class="bg-dark text-light border border-secondary rounded p-3 font-monospace small mb-0" style="white-space: pre; overflow: auto; max-height: 70vh;"></pre>
      </div>
      <div class="modal-footer border-secondary">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Fechar</button>
        <button type="button" class="btn btn-outline-light" id="btnCopyFile">
          <i class="bi bi-clipboard me-1"></i> Copiar
        </button>
        <button type="button" class="btn btn-primary" id="btnSaveFile">
          <i class="bi bi-download me-1"></i> Download
        </button>
      </div>
    </div>
  </div>
</div>
