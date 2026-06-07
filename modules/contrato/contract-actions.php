<!-- Visualizar / Download de Arquivos -->
<?php
$adminConfigPath = __DIR__ . "/../../includes/admin-config.php";
if (is_file($adminConfigPath)) require_once $adminConfigPath;
$walletCookieName = defined("TOKENCAFE_WALLET_COOKIE") ? (string) TOKENCAFE_WALLET_COOKIE : "tokencafe_wallet_address";
$walletCookieRaw = isset($_COOKIE[$walletCookieName]) ? (string) $_COOKIE[$walletCookieName] : "";
$walletCookie = strtolower(trim(urldecode($walletCookieRaw)));
$isAdmin = function_exists("tokencafe_is_admin_wallet") ? tokencafe_is_admin_wallet($walletCookie) : false;
?>
<script>
  window.TOKENCAFE_IS_ADMIN = <?= $isAdmin ? "true" : "false" ?>;
</script>
<div class="tcd-card d-none" id="files-section">
  <div class="tcd-card-head mb-3">
    <div class="tcd-card-head-icon">
      <i class="bi bi-file-arrow-down text-white"></i>
    </div>
    <div>
      <h3>Visualizar Arquivos</h3>
      <p>Arquivos do contrato para visualização e download</p>
    </div>
  </div>
  <div class="row g-2">
    <div class="col-12 col-md-3">
      <button id="btnDownloadSol" class="tc-btn-primary-ds w-100" type="button">
        <i class="bi bi-file-earmark-text me-1"></i>.sol
      </button>
    </div>
    <div class="col-12 col-md-3">
      <button id="btnDownloadJson" class="tc-btn-primary-ds w-100" type="button">
        <i class="bi bi-filetype-json me-1"></i>.json
      </button>
    </div>
    <div class="col-12 col-md-3">
      <button id="btnDownloadAbi" class="tc-btn-primary-ds w-100" type="button">
        <i class="bi bi-braces me-1"></i>ABI
      </button>
    </div>
    <div class="col-12 col-md-3">
      <button id="btnDownloadDeployedBytecode" class="tc-btn-primary-ds w-100" type="button">
        <i class="bi bi-code-slash me-1"></i>ByteCode
      </button>
    </div>
  </div>
  <div class="tc-status-text mt-3 d-flex align-items-center gap-2">
    <i class="bi bi-info-circle tc-action-info"></i>
    <span>Salve estes arquivos. Eles são importantes para futuras verificações ou interações.</span>
  </div>
</div>

<!-- Seção: Comprovantes da Movimentação -->
<div class="tcd-card d-none" id="transactions-section">
  <div class="tcd-card-head mb-3">
    <div class="tcd-card-head-icon">
      <i class="bi bi-receipt text-white"></i>
    </div>
    <div>
      <h3>Comprovantes da Movimentação</h3>
      <p>Transações geradas durante o deploy deste contrato</p>
    </div>
  </div>

  <?php
  $circ = 'width:22px;height:22px;border-radius:50%;font-size:0.7rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;vertical-align:middle';
  $td   = 'padding:6px 10px 6px 0;white-space:nowrap;vertical-align:middle';
  $sep  = 'padding:6px 6px;opacity:0.3;vertical-align:middle;color:rgba(255,255,255,0.4)';
  ?>

  <div class="table-responsive" style="overflow-x:auto">
  <table style="width:100%;border-collapse:collapse;min-width:500px">
    <tbody>

      <!-- ── 1. Taxa de Serviço (laranja) ── -->
      <tr class="d-none" id="tx-platform-row" style="border-bottom:1px solid rgba(255,255,255,0.06)">
        <td style="<?= $td ?>;padding-left:0;width:26px">
          <div style="<?= $circ ?>;background:rgba(248,93,35,.15);border:1px solid rgba(248,93,35,.4);color:#f85d23">1</div>
        </td>
        <td style="<?= $td ?>;min-width:140px">
          <span class="tc-text-sm fw-semibold" style="color:#f85d23">
            <i class="bi bi-building me-1"></i>Plataforma TokenCafe
          </span>
        </td>
        <td style="<?= $td ?>">
          <a class="font-monospace tc-text-sm tc-data-value--url" id="tx-platform-hash" href="#" target="_blank" rel="noopener">—</a>
        </td>
        <td style="<?= $sep ?>">|</td>
        <td style="<?= $td ?>">
          <a id="tx-platform-from" href="#" target="_blank" rel="noopener" class="font-monospace tc-text-sm tc-data-value--url">—</a>
        </td>
        <td style="<?= $sep ?>"><i class="bi bi-arrow-right" style="font-size:0.7rem"></i></td>
        <td style="<?= $td ?>">
          <a id="tx-platform-to" href="#" target="_blank" rel="noopener" class="font-monospace tc-text-sm tc-data-value--url">—</a>
        </td>
        <td style="<?= $td ?>;text-align:right;padding-right:0">
          <span class="fw-bold tc-text-sm" style="color:#f85d23" id="tx-platform-amount">—</span>
        </td>
      </tr>

      <!-- ── 2. Bônus ao Indicador (roxo) ── -->
      <tr class="d-none" id="tx-referrer-row" style="border-bottom:1px solid rgba(255,255,255,0.06)">
        <td style="<?= $td ?>;padding-left:0;width:26px">
          <div style="<?= $circ ?>;background:rgba(192,132,252,.15);border:1px solid rgba(192,132,252,.4);color:#c084fc">2</div>
        </td>
        <td style="<?= $td ?>;min-width:140px">
          <span class="tc-text-sm fw-semibold" style="color:#c084fc">
            <i class="bi bi-gift-fill me-1"></i>Bônus ao Indicador
          </span>
        </td>
        <td style="<?= $td ?>">
          <a class="font-monospace tc-text-sm tc-data-value--url" id="tx-referrer-hash" href="#" target="_blank" rel="noopener">—</a>
        </td>
        <td style="<?= $sep ?>">|</td>
        <td style="<?= $td ?>">
          <a id="tx-referrer-from" href="#" target="_blank" rel="noopener" class="font-monospace tc-text-sm tc-data-value--url">—</a>
        </td>
        <td style="<?= $sep ?>"><i class="bi bi-arrow-right" style="font-size:0.7rem"></i></td>
        <td style="<?= $td ?>">
          <a id="tx-referrer-to" href="#" target="_blank" rel="noopener" class="font-monospace tc-text-sm tc-data-value--url">—</a>
        </td>
        <td style="<?= $td ?>;text-align:right;padding-right:0">
          <span class="fw-bold tc-text-sm" style="color:#c084fc" id="tx-referrer-amount">—</span>
        </td>
      </tr>

      <!-- ── 3. Deploy do Contrato (azul) ── -->
      <tr class="d-none" id="tx-deploy-row">
        <td style="<?= $td ?>;padding-left:0;width:26px">
          <div style="<?= $circ ?>;background:rgba(96,165,250,.15);border:1px solid rgba(96,165,250,.4);color:#60a5fa">3</div>
        </td>
        <td style="<?= $td ?>;min-width:140px">
          <span class="tc-text-sm fw-semibold" style="color:#60a5fa">
            <i class="bi bi-rocket-takeoff me-1"></i>Deploy do Contrato
          </span>
        </td>
        <td style="<?= $td ?>">
          <a class="font-monospace tc-text-sm tc-data-value--url" id="tx-deploy-hash" href="#" target="_blank" rel="noopener">—</a>
        </td>
        <td style="<?= $sep ?>">|</td>
        <td style="<?= $td ?>">
          <a id="tx-deploy-from" href="#" target="_blank" rel="noopener" class="font-monospace tc-text-sm tc-data-value--url">—</a>
        </td>
        <td style="<?= $sep ?>"><i class="bi bi-arrow-right" style="font-size:0.7rem"></i></td>
        <td style="<?= $td ?>">
          <a id="tx-deploy-to" href="#" target="_blank" rel="noopener" class="font-monospace tc-text-sm tc-data-value--url">—</a>
        </td>
        <td style="<?= $td ?>;text-align:right;padding-right:0">
          <span class="fw-bold tc-text-sm" style="color:#60a5fa" id="tx-deploy-amount">—</span>
        </td>
      </tr>

    </tbody>
  </table>
  </div>
</div>

<div class="modal fade" id="filePreviewModal" tabindex="-1" aria-labelledby="filePreviewLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
    <div class="modal-content bg-dark-elevated border-secondary text-light">
      <div class="modal-header border-secondary">
        <h5 class="modal-title" id="filePreviewLabel">Visualizar Arquivo</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <pre id="filePreviewContent" class="bg-dark text-light border border-secondary rounded p-3 font-monospace tc-note mb-0" style="white-space: pre; overflow: auto; max-height: 70vh;"></pre>
      </div>
      <div class="modal-footer border-secondary">
        <button type="button" class="tc-btn-cancel-ds px-4 py-2" data-bs-dismiss="modal">Fechar</button>
        <button type="button" class="tc-btn-secondary-ds tc-action-copy px-4 py-2" id="btnCopyFile">
          <i class="bi bi-clipboard me-1"></i>Copiar
        </button>
        <button type="button" class="tc-btn-primary-ds px-4 py-2" id="btnSaveFile">
          <i class="bi bi-download me-1"></i>Download
        </button>
      </div>
    </div>
  </div>
</div>
