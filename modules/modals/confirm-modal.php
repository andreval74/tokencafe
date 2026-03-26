<!--
================================================================================
CONFIRM MODAL - MODAL DE CONFIRMAÇÃO GENÉRICO
================================================================================
Modal reutilizável para confirmações
Usado em exclusões, alterações importantes, etc.
================================================================================
-->

<div class="modal fade" id="confirmModal" tabindex="-1">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">
      <!-- Header personalizado -->
      <div class="modal-header border-0" id="confirm-header">
        <h5 class="modal-title d-flex align-items-center" id="confirm-title">
          <i class="bi bi-question-circle text-warning me-2"></i>
          Confirmar Ação
        </h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>

      <!-- Corpo do modal -->
      <div class="modal-body" id="confirm-body">
        <div class="text-center py-3">
          <div class="confirm-icon mb-3" id="confirm-icon">
            <div class="bg-warning bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center square-80">
              <i class="bi bi-exclamation-triangle text-warning fs-2"></i>
            </div>
          </div>

          <div class="confirm-message" id="confirm-message">
            <h6 class="text-dark mb-2">Tem certeza que deseja continuar?</h6>
            <p class="text-muted mb-0">Esta ação não poderá ser desfeita.</p>
          </div>

          <!-- Detalhes adicionais (opcional) -->
          <div class="confirm-details mt-3 d-none" id="confirm-details">
            <div class="bg-light rounded p-3 text-start">
              <small class="text-muted">Detalhes:</small>
              <div class="mt-1" id="confirm-details-content"></div>
            </div>
          </div>

          <!-- Campo de confirmação por texto (opcional) -->
          <div class="confirm-input mt-3 d-none" id="confirm-input">
            <label class="form-label small text-muted" id="confirm-input-label">
              Digite
              <strong>DELETE</strong>
              para confirmar:
            </label>
            <input type="text" class="form-control form-control-sm" id="confirm-input-field" placeholder="Digite aqui..." />
            <div class="invalid-feedback" id="confirm-input-error">Texto não confere</div>
          </div>
        </div>
      </div>

      <!-- Footer com botões -->
      <div class="modal-footer border-0 pt-0">
        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="confirm-cancel">Cancelar</button>
        <button type="button" class="btn btn-outline-danger" id="confirm-action" disabled>
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

<!-- Script movido para js/confirm-modal.js -->
