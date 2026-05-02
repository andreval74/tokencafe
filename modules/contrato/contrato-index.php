<?php
  $pageTitle = "Gerador de Tokens - TokenCafe";
  $pageDescription = "Crie, valide, verifique e faça deploy de contratos de forma simples.";
  $pageKeywords = "token, contrato, smart contract, deploy, Web3, ERC-20";
  $pageHeadExtra = "";
  $headerVariant = "module";
  $moduleHeaderTitle = "Gerador de Tokens";
  $moduleHeaderSubtitle = "Simples, Rápido e Seguro";
  $moduleHeaderIcon = "fa-wand-magic-sparkles";
  $moduleHeaderIconAlt = "Construtor";
?>

  <div class="container">

    <!-- API Status (Unified Component Mount) -->
    <div data-component="shared/components/api-status.php"></div>

    <div class="g-4">
      <div class="col-12">

        <!-- Seleção da Rede -->
        <div class="mb-3" id="network-section">
          <div data-component="shared/components/network-search.php"></div>
        </div>

        <!-- Seleção do Tipo de Token (Unique to Novo Contrato) -->
        <div class="mb-3">
          <div data-component="shared/components/section-title.php" data-st-icon="bi-grid-fill"
            data-st-title="Escolha o Modelo" data-st-subtitle="Selecione o tipo de contrato que deseja criar">
          </div>

          <div class="border rounded p-3 bg-dark-elevated">
            <input type="hidden" id="contractGroup" value="erc20-minimal">

            <div class="row">
              <!-- Cards Column (List View) -->
              <div class="col-lg-9">
                <div class="row g-3" id="contractTypeCards">
                  <!-- Card: Simples -->
                  <div class="col-12">
                    <div class="card bg-dark border-secondary contract-card cursor-pointer selected"
                      data-value="erc20-minimal">
                      <div class="check-indicator"><i class="bi bi-check-circle-fill text-success fs-3"></i></div>
                      <div class="card-body p-3">
                        <div class="row align-items-center">
                          <div class="col-auto">
                            <div class="icon-circle bg-dark-elevated text-warning mb-0 square-50">
                              <i class="bi bi-shield-check fs-4"></i>
                            </div>
                          </div>
                          <div class="col">
                            <h5 class="card-title text-white mb-1">Padrão</h5>
                            <p class="card-text text-muted small mb-0">
                              Token ERC‑20 (EIP‑20) básico. Base para os demais modelos.
                            </p>
                          </div>
                          <div class="col-md-5 d-none d-md-block border-start border-secondary ps-4">
                            <ul class="list-unstyled text-start small text-secondary mb-0">
                              <li><i class="bi bi-check2 text-success me-2"></i>ERC‑20 (EIP‑20)</li>
                              <li><i class="bi bi-check2 text-success me-2"></i>Supply Fixo</li>
                              <li><i class="bi bi-check2 text-success me-2"></i>Solidity ^0.8.x</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Card: Gerenciável -->
                  <div class="col-12">
                    <div class="card bg-dark border-secondary contract-card cursor-pointer"
                      data-value="erc20-controls">
                      <div class="check-indicator"><i class="bi bi-check-circle-fill text-success fs-3"></i></div>
                      <div class="card-body p-3">
                        <div class="row align-items-center">
                          <div class="col-auto">
                            <div class="icon-circle bg-dark-elevated text-info mb-0 square-50">
                              <i class="bi bi-sliders fs-4"></i>
                            </div>
                          </div>
                          <div class="col">
                            <h5 class="card-title text-white mb-1">Gerenciável</h5>
                            <p class="card-text text-muted small mb-0">
                              Inclui tudo do Padrão + Mint, Burn e Pause (controle do owner).
                            </p>
                          </div>
                          <div class="col-md-5 d-none d-md-block border-start border-secondary ps-4">
                            <ul class="list-unstyled text-start small text-secondary mb-0">
                              <li><i class="bi bi-check2 text-success me-2"></i>Herdado do Padrão</li>
                              <li><i class="bi bi-check2 text-success me-2"></i>Mint/Burn (Owner)</li>
                              <li><i class="bi bi-check2 text-success me-2"></i>Pause de emergência</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Card: Avançado -->
                  <div class="col-12">
                    <div class="card bg-dark border-secondary contract-card cursor-pointer"
                      data-value="erc20-advanced">
                      <div class="check-indicator"><i class="bi bi-check-circle-fill text-success fs-3"></i></div>
                      <div class="card-body p-3">
                        <div class="row align-items-center">
                          <div class="col-auto">
                            <div class="icon-circle bg-dark-elevated text-danger mb-0 square-50">
                              <i class="bi bi-lightning-charge fs-4"></i>
                            </div>
                          </div>
                          <div class="col">
                            <h5 class="card-title text-white mb-1">Avançado</h5>
                            <p class="card-text text-muted small mb-0">
                              Inclui tudo do Gerenciável + taxas e proteções (Anti‑Bot/limites).
                            </p>
                          </div>
                          <div class="col-md-5 d-none d-md-block border-start border-secondary ps-4">
                            <ul class="list-unstyled text-start small text-secondary mb-0">
                              <li><i class="bi bi-check2 text-success me-2"></i>Herdado do Gerenciável</li>
                              <li><i class="bi bi-check2 text-success me-2"></i>Taxas (Liquidez/Mkt)</li>
                              <li><i class="bi bi-check2 text-success me-2"></i>Proteções & limites</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Card: Venda (ICO) -->
                  <div class="col-12">
                    <div class="card bg-dark border-secondary contract-card cursor-pointer"
                      data-value="erc20-directsale">
                      <div class="check-indicator"><i class="bi bi-check-circle-fill text-success fs-3"></i></div>
                      <div class="card-body p-3">
                        <div class="row align-items-center">
                          <div class="col-auto">
                            <div class="icon-circle bg-dark-elevated text-success mb-0 square-50">
                              <i class="bi bi-shop fs-4"></i>
                            </div>
                          </div>
                          <div class="col">
                            <h5 class="card-title text-white mb-1">Venda / ICO</h5>
                            <p class="card-text text-muted small mb-0">
                              Inclui tudo do Avançado + venda integrada (compra com moeda nativa).
                            </p>
                          </div>
                          <div class="col-md-5 d-none d-md-block border-start border-secondary ps-4">
                            <ul class="list-unstyled text-start small text-secondary mb-0">
                              <li><i class="bi bi-check2 text-success me-2"></i>Herdado do Avançado</li>
                              <li><i class="bi bi-check2 text-success me-2"></i>Preço & limites</li>
                              <li><i class="bi bi-check2 text-success me-2"></i>Saque para carteira</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- Mostra as caracteristicas dos contratos -->
              <div class="col-lg-3 border-start border-secondary">
                <div class="p-2 mb-2 bg-dark rounded border border-secondary text-center text-warning fw-bold small">
                  Características do Contrato</div>
                <div id="contractGroupInfo" class="mb-3 sticky-top tc-sticky-top-1"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Configurar Token -->
    <div class="mb-4">
      <!-- Título da seção (padrão unificado) -->
      <div data-component="shared/components/section-title.php" data-st-icon="bi-gear" data-st-title="Configurar Token"
        data-st-subtitle="Informe os dados principais do seu contrato">
      </div>

      <div class="border rounded p-3 bg-dark-elevated">


        <div class="row g-3">
          <!-- Campo para Token Existente (TokenSale-Separado) -->
          <div class="col-12 d-none" id="existingTokenContainer">
            <label class="form-label">Endereço do Token Existente</label>
            <input id="existingTokenAddress" class="form-control monospace-input" placeholder="0x..." />
          </div>

          <div class="col-md-6" id="tokenNameContainer">
            <label class="form-label">Nome do Token</label>
            <input type="text" class="form-control" id="tokenName" placeholder="Ex: Bitcoin">
          </div>
          <div class="col-md-6" id="tokenSymbolContainer">
            <label class="form-label">Símbolo (Ticker)</label>
            <input type="text" class="form-control" id="tokenSymbol" placeholder="Ex: BTC">
          </div>
          <div class="col-md-6" id="initialSupplyContainer">
            <label class="form-label">Supply Inicial</label>
            <input type="text" class="form-control" id="initialSupply" value="1.000.000">
          </div>
          <div class="col-md-6" id="tokenDecimalsContainer">
            <label class="form-label">Decimais</label>
            <input type="number" class="form-control" id="tokenDecimals" value="18" min="0" max="18">
            <div class="form-text text-muted">Padrão: 18</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Configurações da Venda (Visível apenas para Direct Sale) -->
    <div class="d-none mb-3" id="sale-config-section">
      <div data-component="shared/components/section-title.php" data-st-icon="bi-currency-dollar"
        data-st-title="Configuração da Venda" data-st-subtitle="Defina o preço e limites da ICO">
      </div>
      <div class="border rounded p-3 bg-dark-elevated">
        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">Preço por 1 token</label>
            <input id="tokenPriceDec" class="form-control" placeholder="0.001" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Compra mínima</label>
            <input id="minPurchaseDec" class="form-control" placeholder="0.005" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Compra máxima</label>
            <input id="maxPurchaseDec" class="form-control" placeholder="1.0" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Cap por carteira (unidades)</label>
            <input id="perWalletCap" type="number" min="0" value="0" class="form-control" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Carteira de recebimento</label>
            <input id="payoutWallet" class="form-control monospace-input" placeholder="0x..." />
          </div>
        </div>
      </div>
    </div>

    <!-- Definição de Papeis (Restored) -->
    <div class="mb-3">
      <div data-component="shared/components/section-title.php" data-st-icon="bi-person-badge"
        data-st-title="Permissões e Distribuição"
        data-st-subtitle="Defina quem controla o contrato e quem recebe os tokens iniciais">
      </div>
      <div class="border rounded p-3 bg-dark-elevated">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Administrador do Contrato (Owner)</label>
            <input id="initialOwner" class="form-control monospace-input" placeholder="Carteira conectada (padrão)" />
            <div class="form-text text-muted">Quem poderá pausar/alterar o contrato.</div>
          </div>
          <div class="col-md-6">
            <label class="form-label">Recebedor dos Tokens (Holder)</label>
            <input id="initialHolder" class="form-control monospace-input" placeholder="Carteira conectada (padrão)" />
            <div class="form-text text-muted">Quem receberá o supply inicial.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Seção de Personalização removida conforme solicitado -->


    <!-- Ação de Deploy -->
    <div class="mb-3" id="actions-section">
      <div class="d-flex gap-2 justify-content-end align-items-center">
        <!-- Botão Principal -->
        <button id="btnCreateToken" type="button" class="btn btn-outline-warning">
          <i class="bi bi-rocket-takeoff me-2"></i>Gerar Contrato
        </button>

        <!-- Botão Limpar -->
        <button id="btnClearAll" type="button" class="btn btn-outline-danger">
            <i class="bi bi-trash me-2"></i>Limpar Dados
          </button>

        <!-- Botão Home -->
        <a href="index.php?page=tools" id="btnHome" class="btn btn-outline-success" title="Ir para a Página Inicial">
          <i class="bi bi-house-door me-2"></i>Home
        </a>
      </div>

      <!-- Status Container -->
      <div id="deployStatusContainer" class="d-none mt-3">
        <div class="alert alert-info bg-dark border-info text-info d-flex align-items-center">
          <div class="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></div>
          <span id="contractStatus">Processando...</span>
        </div>
      </div>
    </div>

    <!-- SEÇÃO DE RESULTADOS (PÓS-DEPLOY) -->
    <!-- Redirecionamento automático para contrato-detalhes.php -->
    <div id="results-section" class="d-none"></div>

  </div>
  </div>
  </div>

  <?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/modules/contrato/api-config.js"); } ?>
  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/contrato/contrato.js"); } ?>
