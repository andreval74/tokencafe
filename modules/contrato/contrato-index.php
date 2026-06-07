<?php
$pageTitle          = "Criar Token - TokenCafe";
$pageDescription    = "Crie e publique seu token ERC-20 de forma simples e rápida.";
$pageKeywords       = "token, contrato, smart contract, deploy, Web3, ERC-20";
$pageHeadExtra      = "";
$headerVariant      = "module";
$moduleHeaderTitle    = "Criar Token";
$moduleHeaderSubtitle = "Simples, Rápido e Seguro";
$moduleHeaderIcon     = "fa-wand-magic-sparkles";
$moduleHeaderIconAlt  = "Construtor";

// Preços por modelo — definidos em includes/admin-config.php
$_tcPrices = defined('TOKENCAFE_MODEL_PRICES') ? TOKENCAFE_MODEL_PRICES : [];
$_tcPrice  = fn(string $k): string => '$' . number_format((float)($_tcPrices[$k] ?? 25), 0, '.', '');
?>

<div class="container-fluid px-3 px-lg-4 py-4">

  <!-- ── Status da API ──────────────────────────────────────────── -->
  <div data-component="includes/api-status.php"></div>

  <!-- ── Seção 1: Rede ──────────────────────────────────────────── -->
  <div id="network-section" data-component="modules/network/network-search.php"></div>

  <!-- ── Seção 2: Tipo de Token ─────────────────────────────────── -->
  <div class="tcd-card">
    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon">
        <i class="bi bi-grid-fill text-white"></i>
      </div>
      <div>
        <h3>Escolha o Modelo</h3>
        <p>Qual tipo de token você quer criar?</p>
      </div>
      <div id="tc-model-rate-indicator" class="tc-model-rate-indicator ms-auto d-none">
        <div class="tc-model-rate-label">cotação</div>
        <div class="tc-model-rate-row">
          <span id="tc-model-rate-text">—</span>
          <span id="tc-model-rate-spinner" class="spinner-border spinner-border-sm d-none ms-1" role="status" aria-hidden="true"></span>
        </div>
      </div>
    </div>

    <input type="hidden" id="contractGroup" value="erc20-minimal">

    <div class="row g-3 align-items-start">

      <!-- ── Lista de modelos (esquerda) ── -->
      <div class="col-lg-9">
        <div class="d-flex flex-column gap-2" id="contractTypeCards">

          <!-- Padrão -->
          <label class="tc-contract-pick selected contract-card" data-value="erc20-minimal">
            <div class="tc-contract-pick-icon tc-option-icon--warning">
              <i class="bi bi-shield-check"></i>
            </div>
            <div class="tc-contract-pick-body">
              <div class="tc-contract-pick-name">Padrão</div>
              <div class="tc-contract-pick-desc">Token ERC-20 (EIP-20) básico. Base para os demais modelos.</div>
            </div>
            <ul class="tc-contract-pick-features">
              <li><i class="bi bi-check2"></i>ERC-20 (EIP-20)</li>
              <li><i class="bi bi-check2"></i>Supply Fixo</li>
              <li><i class="bi bi-check2"></i>Solidity ^0.8.x</li>
            </ul>
            <div class="tc-contract-price-block" data-model="erc20-minimal">
              <div class="tc-price-line">
                <span class="tc-price-line-lbl">Contrato</span>
                <span class="tc-price-service" data-usd="<?= (float)($_tcPrices['erc20-minimal'] ?? 0) ?>"><?= $_tcPrice('erc20-minimal') ?></span>
              </div>
              <div class="tc-price-line">
                <span class="tc-price-line-lbl">Gas (est.)</span>
                <span class="tc-price-gas">—</span>
              </div>
              <div class="tc-price-line tc-price-line--total">
                <span class="tc-price-line-lbl">Total</span>
                <span class="tc-price-total">~<?= $_tcPrice('erc20-minimal') ?></span>
              </div>
            </div>
            <div class="tc-contract-pick-check"><i class="bi bi-check2-circle-fill"></i></div>
          </label>

          <!-- Gerenciável -->
          <label class="tc-contract-pick contract-card" data-value="erc20-controls">
            <div class="tc-contract-pick-icon tc-option-icon--info">
              <i class="bi bi-sliders"></i>
            </div>
            <div class="tc-contract-pick-body">
              <div class="tc-contract-pick-name">Gerenciável</div>
              <div class="tc-contract-pick-desc">Inclui tudo do Padrão + Mint, Burn e Pause (controle do owner).</div>
            </div>
            <ul class="tc-contract-pick-features">
              <li><i class="bi bi-check2"></i>Herdado do Padrão</li>
              <li><i class="bi bi-check2"></i>Mint/Burn (Owner)</li>
              <li><i class="bi bi-check2"></i>Pause de emergência</li>
            </ul>
            <div class="tc-contract-price-block" data-model="erc20-controls">
              <div class="tc-price-line">
                <span class="tc-price-line-lbl">Contrato</span>
                <span class="tc-price-service" data-usd="<?= (float)($_tcPrices['erc20-controls'] ?? 0) ?>"><?= $_tcPrice('erc20-controls') ?></span>
              </div>
              <div class="tc-price-line">
                <span class="tc-price-line-lbl">Gas (est.)</span>
                <span class="tc-price-gas">—</span>
              </div>
              <div class="tc-price-line tc-price-line--total">
                <span class="tc-price-line-lbl">Total</span>
                <span class="tc-price-total">~<?= $_tcPrice('erc20-controls') ?></span>
              </div>
            </div>
            <div class="tc-contract-pick-check"><i class="bi bi-check2-circle-fill"></i></div>
          </label>

          <!-- Avançado -->
          <label class="tc-contract-pick contract-card" data-value="erc20-advanced">
            <div class="tc-contract-pick-icon tc-option-icon--danger">
              <i class="bi bi-lightning-charge"></i>
            </div>
            <div class="tc-contract-pick-body">
              <div class="tc-contract-pick-name">Avançado</div>
              <div class="tc-contract-pick-desc">Inclui tudo do Gerenciável + taxas e proteções (Anti-Bot/limites).</div>
            </div>
            <ul class="tc-contract-pick-features">
              <li><i class="bi bi-check2"></i>Herdado do Gerenciável</li>
              <li><i class="bi bi-check2"></i>Taxas (Liquidez/Mkt)</li>
              <li><i class="bi bi-check2"></i>Proteções &amp; limites</li>
            </ul>
            <div class="tc-contract-price-block" data-model="erc20-advanced">
              <div class="tc-price-line">
                <span class="tc-price-line-lbl">Contrato</span>
                <span class="tc-price-service" data-usd="<?= (float)($_tcPrices['erc20-advanced'] ?? 0) ?>"><?= $_tcPrice('erc20-advanced') ?></span>
              </div>
              <div class="tc-price-line">
                <span class="tc-price-line-lbl">Gas (est.)</span>
                <span class="tc-price-gas">—</span>
              </div>
              <div class="tc-price-line tc-price-line--total">
                <span class="tc-price-line-lbl">Total</span>
                <span class="tc-price-total">~<?= $_tcPrice('erc20-advanced') ?></span>
              </div>
            </div>
            <div class="tc-contract-pick-check"><i class="bi bi-check2-circle-fill"></i></div>
          </label>

          <!-- Venda / ICO -->
          <label class="tc-contract-pick contract-card" data-value="erc20-directsale">
            <div class="tc-contract-pick-icon tc-option-icon--success">
              <i class="bi bi-shop"></i>
            </div>
            <div class="tc-contract-pick-body">
              <div class="tc-contract-pick-name">Venda / ICO</div>
              <div class="tc-contract-pick-desc">Inclui tudo do Avançado + venda integrada (compra com moeda nativa).</div>
            </div>
            <ul class="tc-contract-pick-features">
              <li><i class="bi bi-check2"></i>Herdado do Avançado</li>
              <li><i class="bi bi-check2"></i>Preço &amp; limites</li>
              <li><i class="bi bi-check2"></i>Saque para carteira</li>
            </ul>
            <div class="tc-contract-price-block" data-model="erc20-directsale">
              <div class="tc-price-line">
                <span class="tc-price-line-lbl">Contrato</span>
                <span class="tc-price-service" data-usd="<?= (float)($_tcPrices['erc20-directsale'] ?? 0) ?>"><?= $_tcPrice('erc20-directsale') ?></span>
              </div>
              <div class="tc-price-line">
                <span class="tc-price-line-lbl">Gas (est.)</span>
                <span class="tc-price-gas">—</span>
              </div>
              <div class="tc-price-line tc-price-line--total">
                <span class="tc-price-line-lbl">Total</span>
                <span class="tc-price-total">~<?= $_tcPrice('erc20-directsale') ?></span>
              </div>
            </div>
            <div class="tc-contract-pick-check"><i class="bi bi-check2-circle-fill"></i></div>
          </label>

        </div>

        <p class="tc-price-disclaimer">
          <i class="bi bi-info-circle me-1"></i>Valores aproximados e podem variar de acordo com a cotação da moeda no fechamento do serviço.
        </p>

      </div>

      <!-- ── Painel de características (direita) ── -->
      <div class="col-lg-3">
        <div class="tc-contract-info-side">
          <div class="tc-contract-info-side-header">
            <i class="bi bi-card-list me-2"></i>Características do Contrato
          </div>
          <div id="contractGroupInfo" class="tc-contract-info-panel tc-contract-info-side-body"></div>
        </div>
      </div>

    </div>
  </div>

  <!-- ── Seção 3: Configurar Token ──────────────────────────────── -->
  <div class="tcd-card">
    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon">
        <i class="bi bi-gear text-white"></i>
      </div>
      <div>
        <h3>Configurar Token</h3>
        <p>Dê nome, símbolo e quantidade para o seu token</p>
      </div>
    </div>

    <div class="row g-3">

      <!-- Token para venda separada (oculto por padrão) -->
      <div class="col-12 d-none" id="existingTokenContainer">
        <div class="tc-field">
          <label class="tc-field-label" for="existingTokenAddress">Endereço do Token Existente</label>
          <input id="existingTokenAddress" class="tc-field-input" placeholder="0x..." />
        </div>
      </div>

      <div class="col-md-6" id="tokenNameContainer">
        <div class="tc-field">
          <label class="tc-field-label" for="tokenName">Nome do Token</label>
          <input type="text" class="tc-field-input" id="tokenName" placeholder="Ex: Bitcoin">
          <span class="tc-field-hint">O nome completo do seu token</span>
        </div>
      </div>

      <div class="col-md-6" id="tokenSymbolContainer">
        <div class="tc-field">
          <label class="tc-field-label" for="tokenSymbol">Símbolo (Ticker)</label>
          <input type="text" class="tc-field-input" id="tokenSymbol" placeholder="Ex: BTC">
          <span class="tc-field-hint">Abreviação de 2 a 6 letras</span>
        </div>
      </div>

      <div class="col-md-6" id="initialSupplyContainer">
        <div class="tc-field">
          <label class="tc-field-label" for="initialSupply">Quantidade Total de Tokens</label>
          <input type="text" class="tc-field-input" id="initialSupply" value="1.000.000">
          <span class="tc-field-hint">Total de tokens que serão criados</span>
        </div>
      </div>

      <div class="col-md-6" id="tokenDecimalsContainer">
        <div class="tc-field">
          <label class="tc-field-label" for="tokenDecimals">Casas Decimais</label>
          <input type="number" class="tc-field-input" id="tokenDecimals" value="18" min="0" max="18">
          <span class="tc-field-hint">Padrão: 18 (igual ao ETH)</span>
        </div>
      </div>

    </div>
  </div>

  <!-- ── Seção 4: Configuração da Venda (oculta por padrão) ─────── -->
  <div class="tcd-card d-none" id="sale-config-section">
    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon--green">
        <i class="bi bi-currency-dollar"></i>
      </div>
      <div>
        <h3>Configuração da Venda</h3>
        <p>Defina o preço e os limites da sua ICO</p>
      </div>
    </div>
    <div class="row g-3">
      <div class="col-md-4">
        <div class="tc-field">
          <label class="tc-field-label" for="tokenPriceDec">Preço por 1 token</label>
          <input id="tokenPriceDec" class="tc-field-input" placeholder="0.001" />
          <span class="tc-field-hint">Em moeda nativa da rede (ETH, BNB…)</span>
        </div>
      </div>
      <div class="col-md-4">
        <div class="tc-field">
          <label class="tc-field-label" for="minPurchaseDec">Compra mínima</label>
          <input id="minPurchaseDec" class="tc-field-input" placeholder="0.005" />
        </div>
      </div>
      <div class="col-md-4">
        <div class="tc-field">
          <label class="tc-field-label" for="maxPurchaseDec">Compra máxima</label>
          <input id="maxPurchaseDec" class="tc-field-input" placeholder="1.0" />
        </div>
      </div>
      <div class="col-md-6">
        <div class="tc-field">
          <label class="tc-field-label" for="perWalletCap">Cap por carteira (unidades)</label>
          <input id="perWalletCap" type="number" min="0" value="0" class="tc-field-input" />
        </div>
      </div>
      <div class="col-md-6">
        <div class="tc-field">
          <label class="tc-field-label" for="payoutWallet">Carteira de recebimento</label>
          <input id="payoutWallet" class="tc-field-input" placeholder="0x..." />
          <span class="tc-field-hint">Para onde vai o dinheiro das vendas</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Seção 5: Permissões ────────────────────────────────────── -->
  <div class="tcd-card">
    <div class="tcd-card-head mb-3">
      <div class="tcd-card-head-icon--purple">
        <i class="bi bi-person-badge"></i>
      </div>
      <div>
        <h3>Permissões e Distribuição</h3>
        <p>Defina quem controla o contrato e quem recebe os tokens</p>
      </div>
    </div>
    <div class="row g-3">
      <div class="col-md-6">
        <div class="tc-field">
          <label class="tc-field-label" for="initialOwner">Administrador do Contrato</label>
          <input id="initialOwner" class="tc-field-input" placeholder="Carteira conectada (padrão)" />
          <span class="tc-field-hint">Quem pode pausar e alterar o contrato</span>
        </div>
      </div>
      <div class="col-md-6">
        <div class="tc-field">
          <label class="tc-field-label" for="initialHolder">Recebedor dos Tokens</label>
          <input id="initialHolder" class="tc-field-input" placeholder="Carteira conectada (padrão)" />
          <span class="tc-field-hint">Quem recebe todos os tokens criados</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── Seção 6: Ações ──────────────────────────────────────────── -->
  <div class="tcd-card" id="actions-section">
    <div class="d-flex flex-wrap gap-2">
      <button id="btn-clear" type="button" class="tc-btn-clear-ds px-4 py-2">
        <i class="bi bi-trash me-2"></i>Limpar
      </button>
      <button id="btnCreateToken" type="button" class="tc-btn-primary-ds px-4 py-2">
        <i class="bi bi-arrow-right me-2"></i>Avançar
      </button>
      <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
        <i class="bi bi-house-door me-2"></i>Início
      </a>
    </div>
  </div>

  <!-- ── Status de deploy ───────────────────────────────────────── -->
  <div id="deployStatusContainer" class="d-none mt-3">
    <div class="tc-loading-box">
      <div class="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true"></div>
      <span id="contractStatus" class="tc-loading-box-text">Processando...</span>
    </div>
  </div>

  <!-- ── Resultados pós-deploy ─────────────────────────────────── -->
  <div id="results-section" class="d-none mt-3"></div>

</div>

<?php if (isset($enqueue_script_src)) {
  $enqueue_script_src("assets/js/shared/api-config.js");
} ?>
<?php if (isset($enqueue_script_module)) {
  $enqueue_script_module("assets/js/modules/contrato/contrato.js");
} ?>
