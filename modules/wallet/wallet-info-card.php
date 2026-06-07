<!-- Partial compartilhado: card de informações da carteira.
     Usado por wallet-index.php (módulo carteira) e contract-search.php (resultado EOA).
     IDs compatíveis com wallet-index.js: walletAddress, balance, chainId, networkName, etc. -->
<div class="tcd-card">
  <div class="tcd-card-head mb-3">
    <div class="tcd-card-head-icon--green">
      <i class="bi bi-wallet2"></i>
    </div>
    <div>
      <h3>Informações da Carteira</h3>
      <p>Detalhes e status da carteira</p>
    </div>
  </div>

  <!-- Endereço -->
  <div class="tc-data-row">
    <span class="tc-data-label">Endereço</span>
    <a id="walletAddress" href="#" target="_blank" rel="noopener" class="tc-data-value--url"></a>

    <div class="tc-data-actions">
      <button id="copyAddressBtn" type="button" class="tc-icon-btn-ds tc-action-copy" title="Copiar endereço">
        <i class="bi bi-clipboard"></i>
      </button>
      <button id="viewAddressBtn" type="button" class="tc-icon-btn-ds tc-action-explorer" title="Ver no Explorer">
        <i class="bi bi-box-arrow-up-right"></i>
      </button>
      <button id="walletShareWhatsAppBtn" type="button" class="tc-icon-btn-ds tc-action-whatsapp" title="Compartilhar via WhatsApp">
        <i class="bi bi-whatsapp"></i>
      </button>
      <button id="walletShareTelegramBtn" type="button" class="tc-icon-btn-ds tc-action-telegram" title="Compartilhar via Telegram">
        <i class="bi bi-telegram"></i>
      </button>
      <button id="walletShareEmailBtn" type="button" class="tc-icon-btn-ds tc-action-email" title="Compartilhar por e-mail">
        <i class="bi bi-envelope"></i>
      </button>
    </div>
  </div>

  <!-- Saldo Atual -->
  <div class="tc-data-row">
    <span class="tc-data-label">Saldo Atual</span>
    <span id="balance" class="tc-data-value--success"></span>
    <span id="walletStatusLabel" class="tc-status-bad tc-status-label ms-auto">
      <i class="bi bi-circle-fill me-1"></i>Não conectado
    </span>
  </div>

  <!-- Chain ID + Rede -->
  <div class="tc-data-row">
    <span class="tc-data-label">Chain ID</span>
    <span class="tc-data-value">
      <span id="chainId" class="tc-data-value"></span>
    </span>

    <span class="tc-data-label">Rede</span>
    <span class="tc-data-value">
      <span id="networkName" class="tc-data-value"></span>
    </span>
  </div>

  <!-- Símbolo + Moeda Nativa -->
  <div class="tc-data-row">
    <span class="tc-data-label">Símbolo</span>
    <span class="tc-data-value">
      <span id="currencySymbol" class="tc-data-value"></span>
    </span>

    <span class="tc-data-label">Moeda Nativa</span>
    <span id="nativeCurrency" class="tc-data-value"></span>
    </span>
  </div>

  <!-- Block Explorer -->
  <div class="tc-data-row">
    <span class="tc-data-label">Block Explorer</span>
    <a id="explorerUrlDisplay" href="#" target="_blank" rel="noopener" class="tc-data-value--url"></a>
  </div>
</div>
