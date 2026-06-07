<div class="tcd-card network-search-component">
  <div id="network-search-root">

    <!-- Cabeçalho padronizado (oculto via .tc-ns-compact ou data-ns-no-card) -->
    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon--blue">
        <i class="bi bi-diagram-3"></i>
      </div>
      <div>
        <h3>Buscar Rede Blockchain</h3>
        <p>Selecione a blockchain para suas ações</p>
      </div>
    </div>

    <!-- Campo de busca -->
    <div class="tc-field mb-0">
      <div class="d-flex gap-2">
        <input type="text" id="networkSearch" class="tc-field-input flex-grow-1"
               placeholder="Nome da rede, Chain ID ou símbolo…"
               autocomplete="off" />
        <button type="button" id="nsInfoBtn" class="tc-icon-btn-ds tc-action-info flex-shrink-0" title="Mostrar informações da rede">
          <i class="bi bi-info-circle"></i>
        </button>
        <button type="button" id="nsClearBtn" class="tc-icon-btn-ds tc-action-clear flex-shrink-0" title="Limpar seleção">
          <i class="bi bi-trash"></i>
        </button>
      </div>
    </div>

    <small id="networkStatus" class="text-muted d-none mt-2 d-flex align-items-center gap-2">
      <span class="spinner-border spinner-border-sm" id="networkSwitchSpinner" role="status" aria-hidden="true"></span>
      Ajustando a carteira para a rede selecionada…
    </small>
  </div>

  <!-- Autocomplete -->
  <div id="networkAutocomplete" class="network-autocomplete list-group d-none mt-1"></div>

  <!-- Card de rede selecionada: partial em modules/network/network-info-card.php -->
  <div id="selected-network-info" class="mt-3 d-none">
    <?php include __DIR__ . '/network-info-card.php'; ?>
  </div>

  <script type="module" src="assets/js/shared/network-search.js"></script>
</div>
