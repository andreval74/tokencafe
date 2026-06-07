<!--
================================================================================
CONFIRM MODAL — MODAL DE CONFIRMAÇÃO GENÉRICO
================================================================================
Modal reutilizável para confirmações de ações importantes.
Usa exclusivamente o Design System TokenCafe (tc-*).
================================================================================
-->

<div class="modal fade" id="confirmModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">

      <!-- Cabeçalho -->
      <div class="modal-header border-0" id="confirm-header">
        <h5 class="modal-title d-flex align-items-center" id="confirm-title">
          <i class="bi bi-question-circle text-primary me-2"></i>
          Confirmar Ação
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <!-- Corpo -->
      <div class="modal-body" id="confirm-body">
        <div class="text-center py-3">

          <div class="confirm-icon mb-3" id="confirm-icon">
            <div class="tc-modal-icon--warning">
              <i class="bi bi-exclamation-triangle text-primary fs-2"></i>
            </div>
          </div>

          <div class="confirm-message" id="confirm-message">
            <div class="tc-modal-message-title">Tem certeza que deseja continuar?</div>
            <div class="tc-modal-message-desc">Esta ação não poderá ser desfeita.</div>
          </div>

          <!-- Detalhes adicionais (opcional, injetado via JS) -->
          <div class="confirm-details mt-3 d-none" id="confirm-details">
            <div class="tc-modal-details-box">
              <div class="tc-modal-details-label">Detalhes:</div>
              <div id="confirm-details-content"></div>
            </div>
          </div>

          <!-- Campo de confirmação por texto (opcional) -->
          <div class="confirm-input mt-3 d-none" id="confirm-input">
            <label class="tc-field-label" id="confirm-input-label">
              Digite <strong>DELETE</strong> para confirmar:
            </label>
            <input type="text" class="tc-field-input" id="confirm-input-field" placeholder="Digite aqui..." />
            <div class="tc-field-error d-none" id="confirm-input-error">Texto não confere</div>
          </div>

        </div>
      </div>

      <!-- Rodapé -->
      <div class="modal-footer border-0 pt-0">
        <button type="button" class="tc-btn-cancel-ds" data-bs-dismiss="modal" id="confirm-cancel">Cancelar</button>
        <button type="button" class="tc-btn-danger-ds" id="confirm-action" disabled>
          <span class="btn-text">Confirmar</span>
          <span class="btn-loading d-none">
            <span class="spinner-border spinner-border-sm me-2"></span>
            Processando...
          </span>
        </button>
      </div>

    </div>
  </div>
</div>
