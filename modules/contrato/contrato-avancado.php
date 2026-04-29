<?php
  $pageTitle = "Construtor Avançado - TokenCafe";
  $pageDescription = "Crie tokens ERC-20 avançados com taxas, dividendos e proteções.";
  $pageKeywords = "ERC-20, token, taxas, dividendos, smart contract, Web3";
  $headerVariant = "module";
  $moduleHeaderTitle = "Construtor Avançado ERC-20";
  $moduleHeaderSubtitle = "Crie tokens avançados com controle total, taxas e segurança.";
  $moduleHeaderIcon = "fa-layer-group";
  $moduleHeaderIconAlt = "Construtor Avançado";
?>

  <div class="container">
    <!-- API Status (Unified Component Mount) -->
      <div data-component="shared/components/api-status.php"></div>

    <div class="p-0">

      <!-- Contract Summary Title (Unified) -->
      <div id="contractGroupInfo" class="mb-4"></div>

      <form id="advancedGeneratorForm" novalidate>
        <!-- CONFIGURAÇÃO UNIFICADA -->
        <div id="config">

            <!-- SECTION: GERAL -->
            <div class="col-md-06">
              <div class="mb-4" id="network-section">
                <div data-component="shared/components/network-search.php" data-ns-placeholder="Rede detectada..."
                  data-ns-show-details-on-select="false"></div>
              </div>

              <div class="mb-4">
                <div class="d-flex align-items-center mb-2">
                  <div class="me-2"><i class="bi bi-wallet2 section-icon fs-2"></i></div>
                  <div class="flex-grow-1">
                    <h5 class="mb-0 fw-semibold">Carteira Conectada</h5>
                    <p class="text-muted mb-0 small">Endereço da conta ativa no MetaMask</p>
                  </div>
                </div>
                <div class="input-group">
                  <input type="text" id="walletAddressField" class="form-control" placeholder="Aguardando conexão..."
                    readonly />
                  <button type="button" class="tc-icon-btn tc-action-copy" id="btnCopyWallet" title="Copiar Endereço">
                    <i class="bi bi-clipboard"></i>
                  </button>
                  <button type="button" class="tc-icon-btn tc-action-explorer" id="btnViewWalletExplorer" title="Ver no Explorer">
                    <i class="bi bi-box-arrow-up-right"></i>
                  </button>
                  <button type="button" class="tc-icon-btn tc-action-whatsapp" id="btnWalletShareWhatsApp" title="Compartilhar no WhatsApp">
                    <i class="bi bi-whatsapp"></i>
                  </button>
                  <button type="button" class="tc-icon-btn tc-action-telegram" id="btnWalletShareTelegram" title="Compartilhar no Telegram">
                    <i class="bi bi-telegram"></i>
                  </button>
                  <button type="button" class="tc-icon-btn tc-action-email" id="btnWalletShareEmail" title="Compartilhar por Email">
                    <i class="bi bi-envelope"></i>
                  </button>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <div data-component="shared/components/section-title.php" data-st-icon="bi bi-box-seam"
                data-st-title="Informações Básicas" data-st-subtitle="Defina o nome, símbolo e suprimento do seu token">
              </div>

              <div class="border rounded p-3 bg-dark-elevated">
                <div class="row g-4">
                  <div class="col-md-6">
                    <label for="tokenName" class="form-label">Nome do Token <span class="text-danger">*</span></label>
                    <input type="text" class="form-control bg-dark text-light border-secondary" id="tokenName"
                      placeholder="Ex: Bitcoin" required>
                  </div>

                  <div class="col-md-6">
                    <label for="contractName" class="form-label">Nome do Contrato (Opcional)</label>
                    <input type="text" class="form-control bg-dark text-light border-secondary" id="contractName"
                      placeholder="Padrão: Nome do Token + Contract">
                  </div>

                  <div class="col-md-4">
                    <label for="tokenSymbol" class="form-label">Símbolo (Ticker) <span
                        class="text-danger">*</span></label>
                    <input type="text" class="form-control bg-dark text-light border-secondary" id="tokenSymbol"
                      placeholder="Ex: BTC" maxlength="10" required>
                  </div>

                  <div class="col-md-4">
                    <label for="initialSupply" class="form-label">Suprimento Inicial <span
                        class="text-danger">*</span></label>
                    <input type="text" class="form-control bg-dark text-light border-secondary" id="initialSupply"
                      placeholder="Ex: 1.000.000" required>
                  </div>

                  <div class="col-md-4">
                    <label for="tokenDecimals" class="form-label">Decimais</label>
                    <input type="number" class="form-control bg-dark text-light border-secondary" id="tokenDecimals"
                      value="18" min="0" max="18">
                  </div>

                  <div class="col-md-6 d-none" id="maxSupplyContainer">
                    <label for="maxSupply" class="form-label">Suprimento Máximo</label>
                    <input type="text" class="form-control bg-dark text-light border-secondary" id="maxSupply"
                      placeholder="Opcional">
                  </div>

                  <input type="hidden" id="contractGroup" value="erc20-minimal">
                </div>
              </div>
            </div>

            <!-- Permissões e Distribuição -->
            <div class="mb-3" id="permissions-section">
              <div data-component="shared/components/section-title.php" data-st-icon="bi-person-badge"
                data-st-title="Permissões e Distribuição"
                data-st-subtitle="Defina quem controla o contrato e quem recebe os tokens iniciais">
              </div>
              <div class="border rounded p-3 bg-dark-elevated">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Administrador do Contrato (Owner)</label>
                    <input id="initialOwner" class="form-control monospace-input"
                      placeholder="Carteira conectada (padrão)" />
                    <div class="form-text text-muted">Quem poderá pausar/alterar o contrato.</div>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Recebedor dos Tokens (Holder)</label>
                    <input id="initialHolder" class="form-control monospace-input"
                      placeholder="Carteira conectada (padrão)" />
                    <div class="form-text text-muted">Quem receberá o supply inicial.</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mb-4">
              <!-- Recursos do Contrato -->
              <div data-component="shared/components/section-title.php" data-st-icon="bi bi-sliders"
                data-st-title="Recursos do Contrato"
                data-st-subtitle="Selecione os módulos que deseja incluir no seu contrato"></div>

              <div class="border rounded p-3 bg-dark-elevated">
                <div class="row g-4">
                  <!-- Coluna 1: Base Features -->
                  <div class="col-md-4">
                    <h6 class="text-primary border-bottom border-secondary pb-2 mb-3">Base Features</h6>
                    
                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkMintable">
                      <label class="form-check-label text-white" for="checkMintable">Mintable</label>
                      <div class="form-text text-muted small">Permite criar novos tokens após o deploy.</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkBurnable">
                      <label class="form-check-label text-white" for="checkBurnable">Burnable</label>
                      <div class="form-text text-muted small">Permite destruir tokens da circulação.</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkPausable">
                      <label class="form-check-label text-white" for="checkPausable">Pausable</label>
                      <div class="form-text text-muted small">Permite pausar todas as transferências.</div>
                    </div>
                  </div>

                  <!-- Coluna 2: Acesso & Segurança -->
                  <div class="col-md-4">
                    <h6 class="text-warning border-bottom border-secondary pb-2 mb-3">Acesso & Segurança</h6>
                    
                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkOwnable" checked>
                      <label class="form-check-label text-white" for="checkOwnable">Ownable</label>
                      <div class="form-text text-muted small">Controle básico de propriedade.</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkRoles">
                      <label class="form-check-label text-white" for="checkRoles">Roles (AccessControl)</label>
                      <div class="form-text text-muted small">Permissões granulares (Admin, Minter, etc).</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkPermit">
                      <label class="form-check-label text-white" for="checkPermit">Permit</label>
                      <div class="form-text text-muted small">Aprovações via assinatura (gasless).</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkAntibot">
                      <label class="form-check-label text-white" for="checkAntibot">Anti-Bot</label>
                      <div class="form-text text-muted small">Cooldown entre transações.</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkBlacklist">
                      <label class="form-check-label text-white" for="checkBlacklist">Blacklist</label>
                      <div class="form-text text-muted small">Bloqueio de carteiras maliciosas.</div>
                    </div>
                    
                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkMaxWallet">
                      <label class="form-check-label text-white" for="checkMaxWallet">Max Wallet</label>
                      <div class="form-text text-muted small">Limite de tokens por carteira.</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkMaxTx">
                      <label class="form-check-label text-white" for="checkMaxTx">Max Transaction</label>
                      <div class="form-text text-muted small">Limite por transferência.</div>
                    </div>
                  </div>

                  <!-- Coluna 3: Extras -->
                  <div class="col-md-4">
                    <h6 class="text-success border-bottom border-secondary pb-2 mb-3">Extras</h6>
                    
                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkVotes">
                      <label class="form-check-label text-white" for="checkVotes">Votes</label>
                      <div class="form-text text-muted small">Suporte para governança on-chain.</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkFlashMint">
                      <label class="form-check-label text-white" for="checkFlashMint">Flash Mint</label>
                      <div class="form-text text-muted small">Empréstimos relâmpago nativos.</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkSnapshots">
                      <label class="form-check-label text-white" for="checkSnapshots">Snapshots</label>
                      <div class="form-text text-muted small">Captura saldos para dividendos.</div>
                    </div>

                    <div class="form-check form-switch mb-3">
                      <input class="form-check-input" type="checkbox" id="checkRecoverable">
                      <label class="form-check-label text-white" for="checkRecoverable">Token Recovery</label>
                      <div class="form-text text-muted small">Recuperação de tokens ERC20.</div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            <!-- Configurações de Taxas -->
            <div class="mb-4">
              <div data-component="shared/components/section-title.php" data-st-icon="bi bi-graph-up-arrow"
                data-st-title="Configuração de Taxas"
                data-st-subtitle="Defina as taxas de transação para liquidez, marketing e queima"></div>

              <div class="border rounded p-3 bg-dark-elevated">
                <div class="row g-4">
                  <div class="col-12">
                    <label class="form-label">Exchange Padrão (Router)</label>
                    <select class="form-select bg-dark text-light border-secondary" id="defaultRouter">
                      <option value="pancakeswap_v2">PancakeSwap V2 (BSC)</option>
                      <option value="uniswap_v2">Uniswap V2 (Ethereum)</option>
                      <option value="quickswap">QuickSwap (Polygon)</option>
                      <option value="custom">Outro / Customizado</option>
                    </select>
                    <div class="form-text text-muted">Necessário para processar liquidez automática e taxas.</div>
                  </div>

                  <div class="col-12 mt-4">
                    <div class="card bg-dark border-secondary">
                      <div class="card-header border-secondary">
                        <div class="form-check form-switch">
                          <input class="form-check-input" type="checkbox" id="checkLiquidityTax">
                          <label class="form-check-label fw-bold text-white" for="checkLiquidityTax">Taxa de Liquidez
                            (Liquidity Tax)</label>
                        </div>
                      </div>
                      <div class="card-body d-none" id="liquidityTaxOptions">
                        <div class="row g-3">
                          <div class="col-md-4">
                            <label class="form-label small">Buy Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="liqBuyTax" placeholder="0" min="0" max="25">
                          </div>
                          <div class="col-md-4">
                            <label class="form-label small">Sell Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="liqSellTax" placeholder="0" min="0" max="25">
                          </div>
                          <div class="col-md-4">
                            <label class="form-label small">Transfer Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="liqTransferTax" placeholder="0" min="0" max="25">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="col-12">
                    <div class="card bg-dark border-secondary">
                      <div class="card-header border-secondary">
                        <div class="form-check form-switch">
                          <input class="form-check-input" type="checkbox" id="checkWalletTax">
                          <label class="form-check-label fw-bold text-white" for="checkWalletTax">Taxa de Carteira
                            (Marketing/Dev)</label>
                        </div>
                      </div>
                      <div class="card-body d-none" id="walletTaxOptions">
                        <div class="row g-3">
                          <div class="col-md-12">
                            <label class="form-label small">Carteira de Destino</label>
                            <input type="text" class="form-control bg-black text-light border-secondary"
                              id="marketingWallet" placeholder="0x...">
                          </div>
                          <div class="col-md-4">
                            <label class="form-label small">Buy Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="walletBuyTax" placeholder="0" min="0" max="25">
                          </div>
                          <div class="col-md-4">
                            <label class="form-label small">Sell Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="walletSellTax" placeholder="0" min="0" max="25">
                          </div>
                          <div class="col-md-4">
                            <label class="form-label small">Transfer Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="walletTransferTax" placeholder="0" min="0" max="25">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="col-12">
                    <div class="card bg-dark border-secondary">
                      <div class="card-header border-secondary">
                        <div class="form-check form-switch">
                          <input class="form-check-input" type="checkbox" id="checkBurnTax">
                          <label class="form-check-label fw-bold text-white" for="checkBurnTax">Queima Automática
                            (Auto-Burn)</label>
                        </div>
                      </div>
                      <div class="card-body d-none" id="burnTaxOptions">
                        <div class="row g-3">
                          <div class="col-md-4">
                            <label class="form-label small">Buy Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="burnBuyTax" placeholder="0" min="0" max="25">
                          </div>
                          <div class="col-md-4">
                            <label class="form-label small">Sell Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="burnSellTax" placeholder="0" min="0" max="25">
                          </div>
                          <div class="col-md-4">
                            <label class="form-label small">Transfer Tax (%)</label>
                            <input type="number" class="form-control bg-black text-light border-secondary"
                              id="burnTransferTax" placeholder="0" min="0" max="25">
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- SWAP Automatico -->
            <div class="mb-4">
              <div data-component="shared/components/section-title.php" data-st-icon="bi bi-arrow-left-right"
                data-st-title="Swap Automático"
                data-st-subtitle="Configure a conversão automática de taxas em liquidez ou fundos"></div>

              <div class="border rounded p-3 bg-dark-elevated">
                <div class="row g-4">
                  <div class="col-md-6">
                    <label for="swapThreshold" class="form-label">Swap Threshold (% do Supply ou Quantidade)</label>
                    <div class="input-group">
                      <input type="number" class="form-control bg-dark text-light border-secondary" id="swapThreshold"
                        value="0.05" step="0.01">
                      <span class="input-group-text bg-dark text-light border-secondary">%</span>
                    </div>
                    <div class="form-text text-muted">O contrato venderá tokens quando o saldo acumulado atingir
                      essa
                      porcentagem do supply total. Recomendado: 0.01% a 0.5%.</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Personalização de Endereço -->
            <div class="mb-3" id="vanity-section">
              <div data-component="shared/components/section-title.php" data-st-icon="bi-magic"
                data-st-title="Personalização de Endereço"
                data-st-subtitle="Selecione a personalização do endereço do token (Opcional)"></div>
              <div class="border rounded p-3 bg-dark-elevated">
                <div class="row g-3">
                  <div class="col-md-6">
                    <label class="form-label">Modo</label>
                    <select id="vanityMode" class="form-select bg-black text-light border-secondary">
                      <option value="none">Sem personalização</option>
                      <option value="suffix-cafe">Sufixo padrão "cafe"</option>
                      <option value="prefix-custom">Prefixo custom (4 hex)</option>
                      <option value="suffix-custom">Sufixo custom (4 hex)</option>
                    </select>
                  </div>
                  <div class="col-md-6 d-none" id="vanityCustomContainer">
                    <label class="form-label">Valor (4 hex)</label>
                    <input id="vanityCustom" maxlength="4"
                      class="form-control bg-black text-light border-secondary monospace-input" placeholder="beef"
                      pattern="^[0-9a-fA-F]{0,4}$" />
                    <div class="form-text text-muted small">Máx 4 caracteres hex (0-9, a-f)</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botão Próximo Removido -->
            
            <!-- UNIFIED DEPLOY SECTION (Moved from Tab 2) -->
            <div id="deploy-actions-container" class="mt-5">
              
              <!-- Main Deploy Button (Full Width) -->
              <button id="btnCreateToken" type="button" class="btn btn-success btn-lg w-100 py-3 mb-4">
                <i class="bi bi-rocket-takeoff me-2"></i> GERAR CONTRATO
              </button>

              <!-- Deploy Progress -->
              <div id="deployStatusContainer" class="d-none mt-3 mb-4">
                <div class="alert alert-info bg-dark border-info text-info d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-3" role="status" aria-hidden="true"></div>
                    <span id="contractStatus">Processando...</span>
                </div>
              </div>

              <!-- UNIFIED SUMMARY CARD (Result) - REMOVED (Redirects to details page) -->
              
            </div>
          </div>

          <!-- Tab 2 Removed -->
      </form>
    </div>


    <div id="cleanup-action-container" class="d-flex justify-content-end mb-4"></div>
  </div>

  <div class="toast-container position-fixed bottom-0 end-0 p-3">
    <!-- Toasts will be injected here by JS if needed, or we can use a generic one -->
  </div>
  <?php if (isset($enqueue_script_src)) { $enqueue_script_src("assets/js/modules/contrato/api-config.js"); } ?>
  <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/contrato/contrato-avancado.js"); } ?>
