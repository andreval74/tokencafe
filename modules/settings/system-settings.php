<?php
/* ============================================================================
   SYSTEM-SETTINGS.PHP — Preferências pessoais do usuário (localStorage)
   Não confundir com Painel Admin (config/system-settings.json):
     - Aqui: personalização individual de cada usuário no navegador
     - Lá: controles do sistema — exclusivo do administrador
   ============================================================================ */
?>

<div id="settings-root" class="container-fluid px-3 px-lg-4 py-4">

  <!-- ── Cabeçalho ── -->
  <div class="tcd-card-head mb-3">
    <div>
      <h4 class="tcd-title"><i class="bi bi-gear me-2"></i>Minhas Configurações</h4>
      <p class="tcd-subtitle text-secondary mb-0">
        Preferências pessoais salvas no seu navegador — não afetam outros usuários
      </p>
    </div>
  </div>

  <!-- ── Toast de feedback ── -->
  <div id="st-toast-wrap" aria-live="polite" aria-atomic="true"
       class="position-fixed bottom-0 end-0 p-3" style="z-index:9999">
    <div id="st-toast" class="toast align-items-center text-bg-success border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body" id="st-toast-msg">Configurações salvas!</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto"
                data-bs-dismiss="toast"></button>
      </div>
    </div>
  </div>

  <div class="tc-modal-details-box p-0">

    <!-- ── Abas ── -->
    <ul class="nav nav-tabs px-3 pt-3" id="stTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" data-bs-toggle="tab" data-bs-target="#st-aparencia"
                type="button" role="tab">
          <i class="bi bi-palette me-1"></i>Aparência
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#st-notificacoes"
                type="button" role="tab">
          <i class="bi bi-bell me-1"></i>Notificações
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#st-blockchain"
                type="button" role="tab">
          <i class="bi bi-link-45deg me-1"></i>Blockchain
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" data-bs-toggle="tab" data-bs-target="#st-dados"
                type="button" role="tab">
          <i class="bi bi-database me-1"></i>Dados
        </button>
      </li>
    </ul>

    <div class="tab-content p-3">

      <!-- ════════════════════════════════════════
           ABA 1 — APARÊNCIA
           ════════════════════════════════════════ -->
      <div class="tab-pane fade show active" id="st-aparencia" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-palette me-2"></i>Aparência</h6>
          <button type="button" class="btn btn-sm btn-success st-save-btn" data-section="aparencia">
            <i class="bi bi-check2-circle me-1"></i>Salvar
          </button>
        </div>

        <div class="tc-modal-details-box p-3">
          <h6 class="text-warning mb-3"><i class="bi bi-toggles me-1"></i>Interface</h6>

          <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary">
            <div>
              <div class="text-white small fw-semibold">Confirmar ações importantes</div>
              <div class="tc-text-sm tc-status-text">Solicita confirmação antes de ações irreversíveis</div>
            </div>
            <div class="form-check form-switch mb-0 ms-3 flex-shrink-0">
              <input class="form-check-input" type="checkbox" id="st-confirmActions" role="switch" checked>
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary">
            <div>
              <div class="text-white small fw-semibold">Modo compacto</div>
              <div class="tc-text-sm tc-status-text">Reduz o espaçamento entre elementos da interface</div>
            </div>
            <div class="form-check form-switch mb-0 ms-3 flex-shrink-0">
              <input class="form-check-input" type="checkbox" id="st-compactMode" role="switch">
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between py-2">
            <div>
              <div class="text-white small fw-semibold">Alerta ao entrar em mainnet</div>
              <div class="tc-text-sm tc-status-text">Mostra aviso ao conectar em rede principal (dinheiro real)</div>
            </div>
            <div class="form-check form-switch mb-0 ms-3 flex-shrink-0">
              <input class="form-check-input" type="checkbox" id="st-mainnetAlert" role="switch" checked>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           ABA 2 — NOTIFICAÇÕES
           ════════════════════════════════════════ -->
      <div class="tab-pane fade" id="st-notificacoes" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-bell me-2"></i>Notificações</h6>
          <button type="button" class="btn btn-sm btn-success st-save-btn" data-section="notificacoes">
            <i class="bi bi-check2-circle me-1"></i>Salvar
          </button>
        </div>

        <!-- Permissão do navegador -->
        <div class="tc-modal-details-box p-3 mb-3">
          <h6 class="text-info mb-2"><i class="bi bi-browser-chrome me-1"></i>Permissão do Navegador</h6>
          <p class="tc-text-sm tc-status-text mb-2">
            Para notificações push é necessário permitir no navegador.
          </p>
          <div class="d-flex align-items-center gap-3">
            <button type="button" class="btn btn-sm btn-outline-info" id="st-request-notif-btn">
              <i class="bi bi-bell-fill me-1"></i>Solicitar permissão
            </button>
            <span class="badge" id="st-notif-permission-badge">Verificando...</span>
          </div>
        </div>

        <!-- Tipos -->
        <div class="tc-modal-details-box p-3 mb-3">
          <h6 class="text-warning mb-3"><i class="bi bi-funnel me-1"></i>O que notificar</h6>

          <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary">
            <div>
              <div class="text-white small fw-semibold">Token criado com sucesso</div>
              <div class="tc-text-sm tc-status-text">Após deploy e confirmação on-chain</div>
            </div>
            <div class="form-check form-switch mb-0 ms-3 flex-shrink-0">
              <input class="form-check-input" type="checkbox" id="st-notifTokenCreated" role="switch" checked>
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary">
            <div>
              <div class="text-white small fw-semibold">Erros e falhas</div>
              <div class="tc-text-sm tc-status-text">Transações rejeitadas, falhas de RPC</div>
            </div>
            <div class="form-check form-switch mb-0 ms-3 flex-shrink-0">
              <input class="form-check-input" type="checkbox" id="st-notifErrors" role="switch" checked>
            </div>
          </div>

          <div class="d-flex align-items-center justify-content-between py-2">
            <div>
              <div class="text-white small fw-semibold">Verificação de contrato concluída</div>
              <div class="tc-text-sm tc-status-text">Quando o contrato for verificado no explorer</div>
            </div>
            <div class="form-check form-switch mb-0 ms-3 flex-shrink-0">
              <input class="form-check-input" type="checkbox" id="st-notifVerify" role="switch" checked>
            </div>
          </div>
        </div>

        <!-- Som -->
        <div class="tc-modal-details-box p-3">
          <h6 class="text-success mb-3"><i class="bi bi-volume-up me-1"></i>Som</h6>
          <div class="row g-3">
            <div class="col-sm-6">
              <label class="form-label text-secondary small mb-1" for="st-notifSound">
                Som de notificação
              </label>
              <select id="st-notifSound"
                      class="form-select form-select-sm bg-dark text-white border-secondary">
                <option value="default">Padrão</option>
                <option value="chime">Chime</option>
                <option value="bell">Bell</option>
                <option value="none">Silencioso</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           ABA 3 — BLOCKCHAIN
           ════════════════════════════════════════ -->
      <div class="tab-pane fade" id="st-blockchain" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-link-45deg me-2"></i>Blockchain</h6>
          <button type="button" class="btn btn-sm btn-success st-save-btn" data-section="blockchain">
            <i class="bi bi-check2-circle me-1"></i>Salvar
          </button>
        </div>

        <div class="tc-modal-details-box p-3 mb-3">
          <h6 class="text-warning mb-3"><i class="bi bi-fuel-pump me-1"></i>Gas</h6>

          <div class="d-flex align-items-center justify-content-between py-2 border-bottom border-secondary mb-3">
            <div>
              <div class="text-white small fw-semibold">Estimativa automática de gas</div>
              <div class="tc-text-sm tc-status-text">Usa o gas price atual da rede (recomendado)</div>
            </div>
            <div class="form-check form-switch mb-0 ms-3 flex-shrink-0">
              <input class="form-check-input" type="checkbox" id="st-autoGas" role="switch" checked>
            </div>
          </div>

          <div id="st-gas-manual-fields">
            <div class="row g-3">
              <div class="col-sm-6">
                <label class="form-label text-secondary small mb-1" for="st-gasPrice">
                  Gas Price padrão (Gwei)
                </label>
                <div class="input-group input-group-sm">
                  <input type="number" id="st-gasPrice" min="1" max="1000" value="20"
                         class="form-control bg-dark text-white border-secondary">
                  <span class="input-group-text bg-dark text-secondary border-secondary">Gwei</span>
                </div>
                <div class="tc-text-sm tc-status-text mt-1">Usado quando estimativa automática está desligada.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="tc-modal-details-box p-3">
          <h6 class="text-info mb-2"><i class="bi bi-diagram-3 me-1"></i>Redes e RPCs</h6>
          <p class="tc-text-sm tc-status-text mb-2">
            Para adicionar redes, trocar endpoints RPC ou testar latência, use o módulo dedicado.
          </p>
          <a href="index.php?page=rpc" class="btn btn-sm btn-outline-info">
            <i class="bi bi-diagram-3 me-1"></i>Abrir RPC Manager
          </a>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           ABA 4 — DADOS
           ════════════════════════════════════════ -->
      <div class="tab-pane fade" id="st-dados" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-database me-2"></i>Dados Locais</h6>
        </div>

        <div class="tc-modal-details-box p-3 mb-3">
          <h6 class="text-success mb-2"><i class="bi bi-arrow-down-up me-1"></i>Backup das Configurações</h6>
          <p class="tc-text-sm tc-status-text mb-3">
            Exporte suas preferências como arquivo JSON para backup ou para transferir para outro dispositivo.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" id="st-export-btn" class="btn btn-sm btn-outline-success">
              <i class="bi bi-download me-1"></i>Exportar configurações
            </button>
            <label class="btn btn-sm btn-outline-info mb-0" for="st-import-file">
              <i class="bi bi-upload me-1"></i>Importar configurações
            </label>
            <input type="file" id="st-import-file" accept=".json" class="d-none">
          </div>
        </div>

        <div class="tc-modal-details-box p-3" style="border-color:rgba(220,53,69,.35) !important">
          <h6 class="text-danger mb-2"><i class="bi bi-exclamation-triangle-fill me-1"></i>Zona de Atenção</h6>
          <p class="tc-text-sm tc-status-text mb-3">
            Limpar os dados locais remove preferências e tokens salvos no navegador.
            Contratos na blockchain não são afetados.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <button type="button" id="st-clear-prefs-btn" class="btn btn-sm btn-outline-warning">
              <i class="bi bi-gear-x me-1"></i>Restaurar preferências padrão
            </button>
            <button type="button" id="st-clear-tokens-btn" class="btn btn-sm btn-outline-danger">
              <i class="bi bi-trash me-1"></i>Limpar lista de tokens salvos
            </button>
          </div>
        </div>
      </div>

    </div><!-- /tab-content -->
  </div><!-- /tc-modal-details-box -->

  <!-- ── Rodapé ── -->
  <div class="tcd-card mt-3">
    <div class="d-flex flex-wrap gap-2 align-items-center">
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>

</div><!-- /settings-root -->

<?php if (isset($enqueue_script_module)) {
    $enqueue_script_module("assets/js/modules/settings/system-settings.js");
} ?>