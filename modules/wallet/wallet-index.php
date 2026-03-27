<?php
  $pageTitle = "Gerenciador de Carteira Web3 - TokenCafe";
  $pageDescription = "Conecte e gerencie sua carteira Web3 com MetaMask, TrustWallet e outras carteiras.";
  $pageKeywords = "wallet, MetaMask, TrustWallet, blockchain, crypto, Web3";
  $headerVariant = "module";
  $moduleHeaderTitle = "Gerenciador de Carteira";
  $moduleHeaderSubtitle = "Conecte e gerencie sua carteira Web3";
  $moduleHeaderIcon = "fa-wallet";
  $moduleHeaderIconAlt = "TokenCafe";
?>

  <!--corpo do html-->
  <div class="container py-4">
    <div class="row g-4">
      <div class="col-12">

        <!-- Seção Informações da Carteira -->
        <div id="wallet-empty-state" class="card bg-dark border-secondary text-light mb-4">
          <div class="card-body">
            <h5 class="mb-2">
              <i class="bi bi-wallet2 me-2"></i>
              Conecte sua carteira
            </h5>
            <p class="text-white-50 mb-0">
              Use o botão Conectar no topo para exibir as informações da sua carteira.
            </p>
          </div>
        </div>

        <div id="wallet-info-section" class="d-none">

          <div data-component="shared/components/section-title.php" data-st-icon="bi bi-wallet2 me-2"
            data-st-title="Informações da Carteira" data-st-subtitle="Detalhes da sua carteira conectada"></div>

          <!-- Card de Dados (Estilo Ficha - Igual Contract Search) -->
          <div class="card mb-4">
            <div class="card-body">

              <div class="row g-2 small">
                <!-- Endereço -->
                <div class="col-12">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>Endereço:</span>
                    <span id="walletAddress" class="text-tokencafe text-break font-monospace"></span>
                    <button id="copyAddressBtn" class="btn btn-sm btn-link text-white p-0" title="Copiar">
                      <i class="bi bi-clipboard"></i>
                    </button>
                    <button id="viewAddressBtn" class="btn btn-sm btn-link text-white p-0" title="Ver no Explorer">
                      <i class="bi bi-box-arrow-up-right"></i>
                    </button>
                    <button id="shareAddressBtn" class="btn btn-sm btn-link text-white p-0" title="Compartilhar">
                      <i class="bi bi-share"></i>
                    </button>
                  </div>
                </div>

                <!-- Rede (Chain ID) -->
                <div class="col-12">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>Rede (Chain ID):</span>
                    <span class="text-tokencafe">
                      <span id="chainId" class="me-1"></span> - <span id="networkName"></span>
                    </span>
                    <button id="copyChainIdBtn" class="btn btn-sm btn-link text-white p-0" title="Copiar ID">
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <!-- Moeda Nativa -->
                <div class="col-6">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>Moeda Nativa:</span>
                    <span id="nativeCurrency" class="text-tokencafe"></span>
                  </div>
                </div>

                <!-- Símbolo -->
                <div class="col-6">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>Símbolo:</span>
                    <span id="currencySymbol" class="text-tokencafe"></span>
                  </div>
                </div>

                <!-- Saldo Atual -->
                <div class="col-6">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>Saldo Atual:</span>
                    <span id="balance" class="text-tokencafe fw-bold"></span>
                  </div>
                </div>

                <!-- Status -->
                <div class="col-6">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>Status:</span>
                    <span id="walletStatusLabel" class="text-success small"><i class="bi bi-circle-fill me-1"></i>Conectado</span>
                  </div>
                </div>

                <!-- RPC URL -->
                <div class="col-12">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>RPC URL:</span>
                    <span id="rpcUrl" class="text-tokencafe text-break"></span>
                    <button id="copyRpcBtn" class="btn btn-sm btn-link text-white p-0" title="Copiar">
                      <i class="bi bi-clipboard"></i>
                    </button>
                  </div>
                </div>

                <!-- Block Explorer URL -->
                <div class="col-12">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>Block Explorer URL:</span>
                    <span id="explorerUrlDisplay" class="text-tokencafe text-break"></span>
                    <a id="explorerLink" href="#" target="_blank" class="text-white text-decoration-none" title="Abrir">
                      <i class="bi bi-box-arrow-up-right"></i>
                    </a>
                  </div>
                </div>

                <!-- RPCs Personalizados -->
                <div class="col-12">
                  <div class="d-flex align-items-baseline gap-2">
                    <span>RPCs Personalizados:</span>
                    <span id="customRpcs" class="text-tokencafe text-break"></span>
                  </div>
                </div>
              </div>

            </div>
          </div>
          <!-- Botão Home -->
          <div class="mt-4 d-flex justify-content-end">
            <a href="index.php?page=tools" class="btn btn-outline-success px-4 fw-bold">
              <i class="bi bi-house-door me-2"></i>Home
            </a>
          </div>
        </div>

      </div>
    </div>
  </div>

  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/wallet/wallet-index.js"); } ?>
  <?php if (isset($enqueue_script_src)) { $enqueue_script_src("https://unpkg.com/web3modal@1.9.12/dist/index.js"); } ?>
