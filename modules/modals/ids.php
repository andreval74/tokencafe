  <?php
    $pageTitle = "Mini Chainlist - TokenCafe";
    $pageDescription = "Adicionar RPCs e redes na carteira.";
    $pageKeywords = "chainlist, rpc, metamask, rede";
    $headerVariant = "module";
    $moduleHeaderTitle = "Mini Chainlist";
    $moduleHeaderSubtitle = "Adicionar RPCs e redes";
    $moduleHeaderIcon = "bi-diagram-3";
    $moduleHeaderIconAlt = "RPC";
  ?>
  <div class="simple-page-body">
    <h1 class="simple-page-title">Mini Chainlist — Exemplo</h1>
    <p id="providerStatus">Detectando MetaMask...</p>

    <input type="text" id="searchInput" class="simple-input" placeholder="Buscar rede por nome, ID ou símbolo..." />

    <div id="networkList"></div>

    <hr />

    <h2>Adicionar RPC Personalizada</h2>
    <form id="customForm">
      <div class="simple-form-group">
        <input required placeholder="Chain ID (ex: 11155111 ou 0xaa36a7)" id="customChainId" class="simple-input" />
      </div>
      <div class="simple-form-group">
        <input required placeholder="Nome da rede" id="customChainName" class="simple-input" />
      </div>
      <div class="simple-form-group">
        <input required placeholder="Nome da moeda (ex: Ether)" id="customCurrencyName" class="simple-input" />
        <input required placeholder="Símbolo (ex: ETH)" id="customCurrencySymbol" class="simple-input" />
        <input type="number" placeholder="Decimais (ex: 18)" id="customCurrencyDecimals" value="18" class="simple-input" />
      </div>
      <div class="simple-form-group">
        <input required placeholder="RPC URL (https://...)" id="customRpcUrl" class="simple-input" />
      </div>
      <div class="simple-form-group">
        <input placeholder="Block Explorer URL (opcional)" id="customExplorerUrl" class="simple-input" />
        <input placeholder="Icon URL (opcional)" id="customIconUrl" class="simple-input" />
      </div>
      <button type="submit" class="simple-button">Adicionar RPC Personalizada</button>
    </form>

    <div id="message" class="simple-message"></div>

    <?php if (isset($enqueue_script_module)) { $enqueue_script_module("assets/js/modules/modals/ids.js"); } ?>
  </div>
