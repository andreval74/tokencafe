<!-- Partial compartilhado: card de detalhes do contrato inteligente.
     Usado por contract-search.php (componente de busca).
     Populado via JS (contract-search.js) pelos IDs cs_view*. -->
<div class="tcd-card">
  <div class="tcd-card-head mb-3">
    <div class="tcd-card-head-icon">
      <i class="bi bi-file-earmark-code text-white"></i>
    </div>
    <div>
      <h3>Detalhes do Contrato</h3>
      <p>Informações e status do contrato na blockchain</p>
    </div>
  </div>

  <!-- Endereço -->
  <div class="tc-data-row">
    <span class="tc-data-label">Endereço</span>
    <a id="cs_viewAddress" href="#" target="_blank" rel="noopener" class="tc-data-value--url"></a>
  </div>

  <!-- Tx Hash (oculto por padrão, JS exibe quando disponível) -->
  <div class="tc-data-row d-none" id="cs_txRow">
    <span class="tc-data-label">Tx Hash</span>
    <a id="cs_viewTxHash" href="#" target="_blank" rel="noopener" class="tc-data-value--url"></a>
  </div>

  <!-- Rede -->
  <div class="tc-data-row">
    <span class="tc-data-label">Rede (Chain ID)</span>
    <span id="cs_viewChainId" class="tc-data-value"></span>
  </div>

  <!-- Nome + Símbolo (mesma linha, padrão wallet) -->
  <div class="tc-data-row" id="cs_nameRow">
    <span class="tc-data-label">Nome</span>
    <span id="cs_viewName" class="tc-data-value--mono"></span>
    <span class="tc-data-label">Símbolo</span>
    <span id="cs_viewSymbol" class="tc-data-value--mono"></span>
  </div>

  <!-- Decimais + Supply (mesma linha) -->
  <div class="tc-data-row" id="cs_decimalsRow">
    <span class="tc-data-label">Decimais</span>
    <span id="cs_viewDecimals" class="tc-data-value--mono"></span>
    <span class="tc-data-label">Supply</span>
    <span id="cs_viewSupply" class="tc-data-value--mono"></span>
  </div>

  <!-- Status -->
  <div class="tc-data-row">
    <span class="tc-data-label">Status</span>
    <span id="cs_viewStatus" class="tc-data-value--mono d-flex align-items-center flex-nowrap gap-1"></span>
  </div>

  <!-- Saldo do contrato + Saldo nativo (mesma linha) -->
  <div class="tc-data-row" id="cs_tokenBalanceRow">
    <span class="tc-data-label">Saldo do contrato</span>
    <span id="cs_viewTokenBalance" class="tc-data-value--mono"></span>
    <span class="tc-data-label">Saldo nativo</span>
    <span id="cs_viewNativeBalance" class="tc-data-value--mono"></span>
  </div>

  <!-- Negociação (Pair) -->
  <div class="tc-data-row" id="cs_pairRow">
    <span class="tc-data-label">Negociação (Pair)</span>
    <span id="cs_viewPairAddress" class="tc-data-value--mono"></span>
  </div>

  <!-- Compilador + Otimização (mesma linha) -->
  <div class="tc-data-row" id="cs_compilerRow">
    <span class="tc-data-label">Compilador</span>
    <span id="cs_viewCompilerVersion" class="tc-data-value--mono">-</span>
    <span class="tc-data-label">Otimização</span>
    <span id="cs_viewOptimization" class="tc-data-value--mono">-</span>
  </div>

  <!-- Outras configs -->
  <div class="tc-data-row" id="cs_otherSettingsRow">
    <span class="tc-data-label">Outras configs</span>
    <span id="cs_viewOtherSettings" class="tc-data-value--mono">-</span>
  </div>
</div>
