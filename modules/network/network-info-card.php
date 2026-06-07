<!-- Partial compartilhado: card de detalhes da rede selecionada.
     Usado por network-search.php (componente de busca de rede).
     Populado via JS (network-search.js) pelos IDs networkNameCode, chainIdCode, etc. -->
<div class="tcd-card">
  <div class="tcd-card-head mb-3">
    <div class="tcd-card-head-icon--blue">
      <i class="bi bi-check2-circle"></i>
    </div>
    <div>
      <h3>Rede Selecionada</h3>
      <p>Detalhes da rede ativa para ações e validações</p>
    </div>
  </div>

  <!-- Nome -->
  <div class="tc-data-row">
    <span class="tc-data-label">Nome</span>
    <span class="tc-data-value" id="networkNameCode"></span>
  </div>

  <!-- Chain ID + Moeda (mesma linha, padrão wallet) -->
  <div class="tc-data-row">
    <span class="tc-data-label">Chain ID</span>
    <span class="tc-data-value" id="chainIdCode"></span>
    <span class="tc-data-label">Moeda</span>
    <span class="tc-data-value">
      <span id="nativeCurrencyNameCode"></span>
      <span id="nativeCurrencySymbolCode" class="tc-status-text ms-2"></span>
    </span>
  </div>

  <!-- RPC + Explorer (mesma linha, padrão wallet) -->
  <div class="tc-data-row">
    <span class="tc-data-label">RPC</span>
    <a id="rpcUrlText" href="#" target="_blank" rel="noopener"
       class="tc-data-value--mono tc-data-value--url">
      <span id="rpcUrlCode"></span>
    </a>
    <span class="tc-data-label">Explorer</span>
    <a id="explorerUrlText" href="#" target="_blank" rel="noopener"
       class="tc-data-value--mono tc-data-value--url">
      <span id="explorerUrlCode"></span>
    </a>
  </div>

  <div id="apiHelp" class="tc-warning-box mt-2 d-none">
    <span class="tc-warning-box-icon me-1"><i class="bi bi-exclamation-triangle"></i></span>
    <span>Detectamos um problema na API.</span>
    <button id="apiFixBtn" class="tc-btn-test-ds tc-btn-sm-ds ms-2" type="button">Usar API de produção</button>
  </div>
</div>
