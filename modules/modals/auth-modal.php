<!--
================================================================================
AUTH MODAL — MODAL DE AUTENTICAÇÃO WEB3
================================================================================
Modal unificado para autenticação com carteiras Web3.
Usa exclusivamente o Design System TokenCafe (tc-*).
================================================================================
-->

<div class="modal fade" id="authModal" tabindex="-1" data-bs-backdrop="static">
  <div class="modal-dialog modal-dialog-centered">
    <div class="modal-content">

      <!-- Cabeçalho -->
      <div class="modal-header border-0 pb-0">
        <div class="w-100 text-center">
          <h4 class="modal-title text-primary">
            <i class="bi bi-cup-hot me-2"></i>Conectar Carteira
          </h4>
          <p class="tc-status-text mb-0">Conecte sua carteira para acessar o TokenCafe</p>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
      </div>

      <!-- Corpo -->
      <div class="modal-body px-4 py-3">

        <!-- Estado: Seleção de Carteira -->
        <div id="wallet-selection" class="auth-step">
          <div class="d-flex flex-column gap-2">

            <button class="tc-wallet-option wallet-option" data-wallet="trust">
              <div class="tc-wallet-option-icon">
                <img src="assets/imgs/trustwallet.svg" alt="Trust Wallet" width="24" height="24" />
              </div>
              <div class="tc-wallet-option-body">
                <div class="tc-wallet-option-name">Trust Wallet</div>
                <div class="tc-wallet-option-desc">Conectar usando Trust Wallet</div>
              </div>
              <i class="bi bi-chevron-right tc-wallet-option-arrow"></i>
            </button>

            <button class="tc-wallet-option wallet-option" data-wallet="metamask">
              <div class="tc-wallet-option-icon">
                <img src="assets/imgs/metamask.svg" alt="MetaMask" width="24" height="24" />
              </div>
              <div class="tc-wallet-option-body">
                <div class="tc-wallet-option-name">MetaMask</div>
                <div class="tc-wallet-option-desc">Conectar usando MetaMask</div>
              </div>
              <i class="bi bi-chevron-right tc-wallet-option-arrow"></i>
            </button>

            <button class="tc-wallet-option wallet-option" data-wallet="walletconnect">
              <div class="tc-wallet-option-icon">
                <img src="assets/imgs/walletconnect.svg" alt="WalletConnect" width="24" height="24" />
              </div>
              <div class="tc-wallet-option-body">
                <div class="tc-wallet-option-name">WalletConnect</div>
                <div class="tc-wallet-option-desc">Conectar com código QR</div>
              </div>
              <i class="bi bi-chevron-right tc-wallet-option-arrow"></i>
            </button>

            <button class="tc-wallet-option wallet-option" data-wallet="coinbase">
              <div class="tc-wallet-option-icon">
                <img src="assets/imgs/coinbase.svg" alt="Coinbase" width="24" height="24" />
              </div>
              <div class="tc-wallet-option-body">
                <div class="tc-wallet-option-name">Coinbase Wallet</div>
                <div class="tc-wallet-option-desc">Conectar usando Coinbase</div>
              </div>
              <i class="bi bi-chevron-right tc-wallet-option-arrow"></i>
            </button>

          </div>

          <div class="text-center mt-4">
            <small class="tc-status-text">
              <i class="bi bi-info-circle me-1"></i>
              Não possui uma carteira?
              <a href="https://metamask.io" target="_blank" class="text-decoration-none text-primary">Instalar MetaMask</a>
            </small>
          </div>
        </div>

        <!-- Estado: Conectando -->
        <div id="wallet-connecting" class="auth-step d-none">
          <div class="text-center py-4">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Conectando...</span>
            </div>
            <h6 class="text-primary">Conectando...</h6>
            <p class="tc-status-text mb-0" id="connecting-message">Aguarde enquanto conectamos sua carteira</p>
            <div class="mt-3">
              <button type="button" class="tc-btn-cancel-ds" id="cancel-connection">Cancelar</button>
            </div>
          </div>
        </div>

        <!-- Estado: Sucesso -->
        <div id="connection-success" class="auth-step d-none">
          <div class="text-center py-4">
            <div class="mb-3">
              <div class="tc-modal-icon--success">
                <i class="bi bi-check text-success fs-2"></i>
              </div>
            </div>
            <h6 class="text-success">Conectado com Sucesso!</h6>
            <p class="tc-status-text mb-3" id="connected-address">
              Endereço: <span class="font-monospace"></span>
            </p>
            <p class="tc-status-text mb-3" id="connected-network">
              Rede: <span></span>
            </p>
            <button type="button" class="tc-btn-primary-ds" data-bs-dismiss="modal">Ir para Ferramentas</button>
          </div>
        </div>

        <!-- Estado: Erro -->
        <div id="connection-error" class="auth-step d-none">
          <div class="text-center py-4">
            <div class="mb-3">
              <div class="tc-modal-icon--danger">
                <i class="bi bi-exclamation-triangle text-danger fs-2"></i>
              </div>
            </div>
            <h6 class="text-danger">Erro na Conexão</h6>
            <p class="tc-status-text mb-3" id="error-message">Não foi possível conectar sua carteira</p>
            <div class="d-flex gap-2 justify-content-center">
              <button type="button" class="tc-btn-secondary-ds" id="back-to-selection">Tentar Novamente</button>
              <button type="button" class="tc-btn-cancel-ds" data-bs-dismiss="modal">Cancelar</button>
            </div>
          </div>
        </div>

      </div>

      <!-- Rodapé -->
      <div class="modal-footer border-0 pt-0">
        <div class="w-100 text-center">
          <small class="tc-status-text d-block mb-2">
            <i class="bi bi-shield-lock me-1"></i>
            Sua carteira permanece sob seu controle
          </small>
          <div class="d-flex justify-content-center gap-3">
            <a href="index.php?page=privacidade" class="tc-status-text text-decoration-none">Privacidade</a>
            <a href="index.php?page=termos-e-servicos" class="tc-status-text text-decoration-none">Termos</a>
            <a href="index.php?page=suporte" class="tc-status-text text-decoration-none">Suporte</a>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

<script type="module" src="assets/js/modules/modals/auth_modal.js?v=<?= htmlspecialchars(defined('ASSET_VERSION') ? ASSET_VERSION : '9.9', ENT_QUOTES, 'UTF-8') ?>"></script>
