<?php
$tokencafe_nav_mode = "basic";
$tokencafe_footer_mode = "basic";
$tokencafe_create_token_href = "tools.php";
?>
<div class="TokenCafe-content">
  <!-- ==================== HERO (PRIMEIRA DOBRA) ==================== -->
  <section class="tc-hero-section">
    <div class="container">
      <div class="row justify-content-center text-center mb-5">
        <div class="col-lg-10">
          <div class="hero-content">
            <div class="badge bg-primary text-dark mb-2 px-3 py-2 pulse-animation">
              <i class="bi bi-rocket me-2"></i>
              COMEÇE AGORA!!
            </div>
            <h1 class="display-3 fw-bold mb-3 text-white">
              Crie seu <span class="gradient-text">token</span> em minutos.
            </h1>

            <p class="lead text-light mb-4 fs-4">
              Automatize seu projeto, sem conhecimento técnico,<br> 
              da criação até verificação do smart contract,<br>
              pagando em crypto e apenas quando usar.
            </p>

            <div class="d-flex flex-wrap gap-2 justify-content-center">
              <a href="<?= htmlspecialchars($tokencafe_create_token_href, ENT_QUOTES, "UTF-8") ?>" class="btn btn-primary btn-lg btn-connect-wallet" data-action="connect-wallet">
                <i class="bi bi-coin me-2"></i>
                Criar Token Agora
              </a>
            </div>

            <div class="mt-3">
              <div class="d-flex flex-wrap gap-3 text-center justify-content-center">
                <div class="d-inline-flex align-items-center">
                  <i class="bi bi-shield-lock text-warning me-2"></i>
                  <small class="text-light">100% Wallet-only</small>
                </div>
                <div class="d-inline-flex align-items-center">
                  <i class="bi bi-check2-circle text-success me-2"></i>
                  <small class="text-light">+30 Blockchains</small>
                </div>
                <div class="d-inline-flex align-items-center">
                  <i class="bi bi-robot text-info me-2"></i>
                  <small class="text-light">IA Integrada</small>
                </div>
              </div>
              <div class="mt-3">
                <div class="d-flex flex-wrap gap-3 text-center justify-content-center">
                  <div class="d-inline-flex align-items-center">
                    <i class="bi bi-coin text-primary me-2"></i>
                    <small class="text-light">Pagamento em Crypto</small>
                  </div>
                  <div class="d-inline-flex align-items-center">
                    <i class="bi bi-cash-coin text-primary me-2"></i>
                    <small class="text-light">Sem Mensalidades</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <!-- ==================== REDES SUPORTADAS (SLIDER) ==================== -->
      <div class="tc-black-panel rounded-0 py-2">
        <div class="blockchain-slider">
          <div class="blockchain-track">
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/ethereum.png" alt="Ethereum" class="tc-chain-icon" /><span>Ethereum</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/bnb.png" alt="BNB Chain" class="tc-chain-icon" /><span>BNB</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/polygon.png" alt="Polygon" class="tc-chain-icon" /><span>Polygon</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/base.png" alt="Base" class="tc-chain-icon" /><span>Base</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/arbitrumone.png" alt="Arbitrum One" class="tc-chain-icon" /><span>Arbitrum</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/optimism.png" alt="Optimism" class="tc-chain-icon" /><span>Optimism</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/avalanche.png" alt="Avalanche" class="tc-chain-icon" /><span>Avalanche</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/linea.png" alt="Linea" class="tc-chain-icon" /><span>Linea</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/scroll.png" alt="Scroll" class="tc-chain-icon" /><span>Scroll</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/blast.png" alt="Blast" class="tc-chain-icon" /><span>Blast</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/mantle.png" alt="Mantle" class="tc-chain-icon" /><span>Mantle</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/metis.png" alt="Metis" class="tc-chain-icon" /><span>Metis</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/cronos.png" alt="Cronos" class="tc-chain-icon" /><span>Cronos</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/core.png" alt="Core" class="tc-chain-icon" /><span>Core</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/pulsechain.png" alt="PulseChain" class="tc-chain-icon" /><span>PulseChain</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/unichain.png" alt="Unichain" class="tc-chain-icon" /><span>Unichain</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/sonic.png" alt="Sonic" class="tc-chain-icon" /><span>Sonic</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/monad.png" alt="Monad" class="tc-chain-icon" /><span>Monad</span></span>
            <span class="blockchain-item d-inline-flex align-items-center gap-2 text-white-50"><img src="assets/imgs/blockchains/hyperevm.png" alt="HyperEVM" class="tc-chain-icon" /><span>HyperEVM</span></span>
          </div>
        </div>
      </div>
  </section>
</div>
