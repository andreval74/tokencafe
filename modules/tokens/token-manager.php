  <?php
    $pageTitle = "Gerenciador de Tokens - TokenCafe";
    $pageDescription = "Administre seus tokens criados na TokenCafe com filtros, busca e edição.";
    $pageKeywords = "tokens, erc20, blockchain, Web3";
    $headerVariant = "module";
    $moduleHeaderTitle = "Gerenciador de Tokens";
    $moduleHeaderSubtitle = "Administre seus tokens e dados";
    $moduleHeaderIcon = "fa-coins";
    $moduleHeaderIconAlt = "Tokens";
  ?>

<div class="container-fluid px-3 px-lg-4 py-4">
  <div class="tcd-card">
    <div class="d-flex flex-wrap gap-2 align-items-center">
      <button class="tc-btn-primary-ds px-4 py-2" data-action="tm-create-token" type="button">
        <i class="bi bi-plus-circle me-2"></i>Criar Novo Token
      </button>
      <button class="tc-btn-test-ds px-4 py-2" data-action="tm-refresh-tokens" type="button">
        <i class="bi bi-arrow-clockwise me-2"></i>Atualizar
      </button>
      <div class="tc-status-text ms-auto">
        <i class="bi bi-info-circle me-1 tc-action-info"></i>
        Use busca e filtros para encontrar tokens rapidamente
      </div>
    </div>
  </div>

  <div class="tcd-card">
    <div class="row g-3 align-items-end">
      <div class="col-12 col-lg-6">
        <div class="tc-field mb-0">
          <label class="tc-field-label" for="token-search">Buscar</label>
          <div class="d-flex gap-2">
            <input type="text" id="token-search" placeholder="Nome, símbolo ou descrição..." class="tc-field-input flex-grow-1" />
            <button class="tc-icon-btn-ds flex-shrink-0" type="button" disabled>
              <i class="bi bi-search"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="col-12 col-lg-6">
        <div class="d-flex flex-wrap gap-2 justify-content-lg-end">
          <button class="filter-btn tc-btn-secondary-ds tc-btn-sm-ds active" data-filter="all" type="button">Todos</button>
          <button class="filter-btn tc-btn-secondary-ds tc-btn-sm-ds" data-filter="erc20" type="button">ERC-20</button>
          <button class="filter-btn tc-btn-secondary-ds tc-btn-sm-ds" data-filter="erc721" type="button">ERC-721</button>
          <button class="filter-btn tc-btn-secondary-ds tc-btn-sm-ds" data-filter="active" type="button">Ativos</button>
          <button class="filter-btn tc-btn-secondary-ds tc-btn-sm-ds" data-filter="paused" type="button">Pausados</button>
          <button class="tc-icon-btn-ds tc-btn-sm-ds" id="tm-clear-filters" title="Limpar Filtros" type="button">
            <i class="bi bi-eraser"></i>
          </button>
        </div>
      </div>
    </div>
  </div>

  <div class="tcd-card" id="token-manager-module">
    <div class="tc-tokens-grid" id="tokens-grid"></div>

    <div class="text-center py-5 d-none" id="empty-tokens-state">
      <div class="tc-wallet-empty-icon">
        <i class="bi bi-coin fs-4 tc-action-info"></i>
      </div>
      <div class="fw-bold text-white mb-1">Nenhum token encontrado</div>
      <p class="tc-wallet-empty-desc mb-3">Você ainda não criou nenhum token. Que tal começar agora?</p>
      <button class="tc-btn-primary-ds px-4 py-2" data-action="tm-create-token" type="button">
        <i class="bi bi-plus-circle me-2"></i>Criar Meu Primeiro Token
      </button>
    </div>

    <div class="text-center py-4 d-none" id="tokens-loading">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="tc-status-text mt-2">Carregando seus tokens...</p>
    </div>
  </div>

</div>

<!-- ── Rodapé ── -->
<div class="tcd-card mt-3">
  <div class="d-flex flex-wrap gap-2 align-items-center">
    <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
      <i class="bi bi-house-door me-2"></i>Início
    </a>
  </div>
</div>

<div class="modal fade" id="token-details-modal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-centered">
    <div class="modal-content bg-dark-elevated border-secondary text-light">
      <div class="modal-header border-secondary">
        <h5 class="modal-title">Detalhes do Token</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body" id="token-details-content"></div>
      <div class="modal-footer border-secondary">
        <button type="button" class="tc-btn-cancel-ds" data-bs-dismiss="modal">Fechar</button>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="edit-token-modal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content bg-dark-elevated border-secondary text-light">
      <div class="modal-header border-secondary">
        <h5 class="modal-title">Editar Token</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
      </div>
      <div class="modal-body">
        <form id="edit-token-form">
          <div class="tc-field">
            <label for="edit-token-name" class="tc-field-label">Nome do Token</label>
            <input type="text" id="edit-token-name" class="tc-field-input" required />
          </div>
          <div class="tc-field">
            <label for="edit-token-description" class="tc-field-label">Descrição</label>
            <textarea id="edit-token-description" rows="3" class="tc-field-input"></textarea>
          </div>
          <div class="tc-field mb-0">
            <label for="edit-token-website" class="tc-field-label">Website</label>
            <input type="url" id="edit-token-website" class="tc-field-input" />
          </div>
          <div class="tc-form-actions mt-3">
            <button type="button" class="tc-btn-cancel-ds" data-bs-dismiss="modal">Cancelar</button>
            <button type="submit" class="tc-btn-primary-ds ms-auto">Salvar</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>

<div class="modal fade" id="verifyInfoModal" tabindex="-1" aria-hidden="true">
  <div class="modal-dialog modal-lg modal-dialog-scrollable">
    <div class="modal-content bg-dark-elevated border-secondary text-light">
      <div class="modal-header border-secondary">
        <h5 class="modal-title" id="verifyInfoTitle">Verificação</h5>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>
      <div class="modal-body">
        <div id="verifyInfoContent" class="tc-note"></div>
      </div>
      <div class="modal-footer border-secondary">
        <a id="verifyOpenLink" href="#" target="_blank" rel="noopener" class="tc-btn-success-ds text-decoration-none">Abrir verificação</a>
      </div>
    </div>
  </div>
</div>

    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/tokens/token-manager.js"); } ?>

