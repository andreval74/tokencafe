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

    <!-- Layout padrão baseado no Wallet -->
    <div class="container-fluid py-3 mb-1">
      <div class="row justify-content-center">
        <div class="col-lg-10 col-xl-9">
          <!-- Módulo: Gerenciador de Tokens -->
          <div id="token-manager-module">
            <!-- Header do Módulo -->
            <div class="module-header d-flex justify-content-between align-items-center mb-4">
              <div class="module-title flex-grow-1">
                <div data-component="shared/components/section-title.php" data-st-icon="bi-coin" data-st-title="Meus Tokens" data-st-subtitle="Gerencie todos os seus tokens criados"></div>
              </div>
              <div class="module-actions btn-row">
                <button class="btn btn-outline-primary" data-action="tm-create-token">
                  <i class="bi bi-plus-lg"></i>
                  Criar Novo Token
                </button>
                <button class="btn btn-outline-secondary" data-action="tm-refresh-tokens">
                  <i class="bi bi-arrow-clockwise"></i>
                  Atualizar
                </button>
              </div>
            </div>

            <!-- Filtros e Busca -->
            <div class="module-filters mb-3 d-flex flex-wrap gap-3 align-items-center">
              <div class="search-container flex-grow-1 position-relative">
                <input type="text" id="token-search" placeholder="Buscar tokens..." class="form-control" />
                <i class="bi bi-search position-absolute end-0 top-50 translate-middle-y me-3"></i>
              </div>
              <div class="filter-buttons d-flex flex-wrap gap-2">
                <button class="filter-btn btn btn-outline-light active" data-filter="all">Todos</button>
                <button class="filter-btn btn btn-outline-light" data-filter="erc20">ERC-20</button>
                <button class="filter-btn btn btn-outline-light" data-filter="erc721">ERC-721</button>
                <button class="filter-btn btn btn-outline-light" data-filter="active">Ativos</button>
                <button class="filter-btn btn btn-outline-light" data-filter="paused">Pausados</button>
                <button class="btn btn-outline-secondary" id="tm-clear-filters" title="Limpar Filtros">
                  <i class="bi bi-eraser"></i>
                </button>
              </div>
            </div>

            <!-- Lista de Tokens -->
            <div class="tokens-grid" id="tokens-grid">
              <!-- Tokens serão carregados dinamicamente -->
            </div>

            <!-- Estado Vazio -->
            <div class="empty-state text-center py-5 d-none" id="empty-tokens-state">
              <div class="empty-state-icon mb-3">🪙</div>
              <h3 class="mb-2">Nenhum token encontrado</h3>
              <p class="text-secondary mb-3">Você ainda não criou nenhum token. Que tal começar agora?</p>
              <button class="btn btn-outline-primary" data-action="tm-create-token">
                <i class="bi bi-plus-lg"></i>
                Criar Meu Primeiro Token
              </button>
            </div>

            <!-- Loading State -->
            <div class="loading-state text-center py-4 d-none" id="tokens-loading">
              <div class="spinner-border text-primary" role="status"></div>
              <p class="text-secondary mt-2">Carregando seus tokens...</p>
            </div>

            <!-- Botão Limpar Dados (Padronização) -->
            <div class="d-flex justify-content-end mt-4 pt-3 border-top border-secondary">
              <button id="btn-clear-data" class="btn btn-outline-danger">
                <i class="bi bi-eraser"></i> Limpar Dados
              </button>
            </div>
          </div>

          <!-- Modal: Detalhes do Token (Bootstrap) -->
          <div class="modal fade" id="token-details-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Detalhes do Token</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                </div>
                <div class="modal-body" id="token-details-content">
                  <!-- Conteúdo carregado dinamicamente -->
                </div>
              </div>
            </div>
          </div>

          <!-- Modal: Editar Token (Bootstrap) -->
          <div class="modal fade" id="edit-token-modal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title">Editar Token</h5>
                  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Fechar"></button>
                </div>
                <div class="modal-body">
                  <form id="edit-token-form">
                    <div class="mb-3">
                      <label for="edit-token-name" class="form-label">Nome do Token</label>
                      <input type="text" id="edit-token-name" class="form-control" required />
                    </div>
                    <div class="mb-3">
                      <label for="edit-token-description" class="form-label">Descrição</label>
                      <textarea id="edit-token-description" rows="3" class="form-control"></textarea>
                    </div>
                    <div class="mb-3">
                      <label for="edit-token-website" class="form-label">Website</label>
                      <input type="url" id="edit-token-website" class="form-control" />
                    </div>
                    <div class="btn-row">
                      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancelar</button>
                      <button type="submit" class="btn btn-outline-primary">Salvar Alterações</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal: Verificação (Padronizado) -->
          <div class="modal fade" id="verifyInfoModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-scrollable">
              <div class="modal-content bg-dark text-light border">
                <div class="modal-header">
                  <h5 class="modal-title" id="verifyInfoTitle">Verificação</h5>
                  <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <div id="verifyInfoContent" class="small"></div>
                </div>
                <div class="modal-footer">
                  <a id="verifyOpenLink" href="#" target="_blank" rel="noopener" class="btn btn-outline-success">Abrir página de
                    verificação</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/modules/tokens/token-manager.js"); } ?>

