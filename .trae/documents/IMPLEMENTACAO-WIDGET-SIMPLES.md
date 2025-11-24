# 🛠️ Implementação Prática - Widget Simplificado

## 1. ARQUIVOS A EXCLUIR IMEDIATAMENTE

### ❌ **Arquivos Obsoletos (Backup antes de excluir)**

```bash
# Comandos para backup e exclusão
mkdir backup_widget_$(date +%Y%m%d)
cp pages/modules/widget/widget-teste\ copy.html backup_widget_$(date +%Y%m%d)/
cp pages/modules/widget/widget-teste.backup.html backup_widget_$(date +%Y%m%d)/
cp pages/modules/widget/widget-index.html backup_widget_$(date +%Y%m%d)/

# Excluir arquivos obsoletos
rm pages/modules/widget/widget-teste\ copy.html
rm pages/modules/widget/widget-teste.backup.html
rm pages/modules/widget/widget-index.html
```

## 2. NOVA ESTRUTURA SIMPLIFICADA

### 📁 **Estrutura de Pastas Otimizada**

```
pages/modules/widget/
├── gerar-widget.html      # Interface principal simplificada
├── meus-widgets.html      # Dashboard do usuário
├── widget-preview.html    # Preview do widget
└── teste.html            # Teste de widget (mantido)

js/modules/widget/
├── widget-generator.js   # Mantido (core)
├── widget-simple.js      # Nova interface simplificada
├── widget-dashboard.js   # Dashboard de widgets
└── widget-templates.js   # Templates pré-configurados
```

## 3. IMPLEMENTAÇÃO DO `gerar-widget.html`

### **Interface Simplificada (Apenas 3 Campos)**

```html
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gerar Widget - TokenCafe</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet" />
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet" />
    <link href="../../../css/styles.css" rel="stylesheet" />
  </head>
  <body class="bg-page-black">
    <!-- Header -->
    <div data-component="tools-header.html" data-icon="bi-rocket" data-title="Gerar Widget" data-subtitle="Crie seu widget de venda em 3 passos"></div>

    <div class="container py-4">
      <div class="row justify-content-center">
        <div class="col-lg-8">
          <!-- Card Principal -->
          <div class="card border-primary">
            <div class="card-header bg-primary bg-opacity-10">
              <h4 class="mb-0">
                <i class="bi bi-magic me-2"></i>
                Criar Widget de Venda
              </h4>
            </div>
            <div class="card-body">
              <!-- Formulário Simplificado -->
              <form id="widgetForm">
                <!-- Passo 1: Nome do Projeto -->
                <div class="mb-4">
                  <label class="form-label fw-semibold">
                    <i class="bi bi-tag me-1"></i>
                    Nome do Projeto *
                  </label>
                  <input type="text" class="form-control" id="projectName" placeholder="Ex: TokenCafe Coin" required />
                  <small class="text-muted">Este nome será exibido no topo do widget</small>
                </div>

                <!-- Passo 2: Rede Blockchain -->
                <div class="mb-4">
                  <label class="form-label fw-semibold">
                    <i class="bi bi-globe me-1"></i>
                    Blockchain *
                  </label>
                  <select class="form-select" id="blockchain" required>
                    <option value="">Selecione uma rede...</option>
                    <option value="56" data-symbol="BNB">Binance Smart Chain</option>
                    <option value="97" data-symbol="BNB">BSC Testnet (Recomendado)</option>
                    <option value="1" data-symbol="ETH">Ethereum</option>
                    <option value="137" data-symbol="MATIC">Polygon</option>
                  </select>
                  <small class="text-muted">Escolha onde seu contrato está deployado</small>
                </div>

                <!-- Passo 3: Contrato de Venda -->
                <div class="mb-4">
                  <label class="form-label fw-semibold">
                    <i class="bi bi-file-code me-1"></i>
                    Endereço do Contrato *
                  </label>
                  <div class="input-group">
                    <input type="text" class="form-control" id="saleContract" placeholder="0x1234..." required />
                    <button class="btn btn-outline-secondary" type="button" id="validateBtn">
                      <i class="bi bi-check-circle"></i>
                      Validar
                    </button>
                  </div>
                  <small class="text-muted">Endereço do contrato que vende os tokens</small>
                </div>

                <!-- Opções Avançadas (Opcional) -->
                <div class="accordion mb-4" id="advancedAccordion">
                  <div class="accordion-item">
                    <h2 class="accordion-header">
                      <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#advancedOptions">
                        <i class="bi bi-gear me-2"></i>
                        Opções Avançadas (Opcional)
                      </button>
                    </h2>
                    <div id="advancedOptions" class="accordion-collapse collapse" data-bs-parent="#advancedAccordion">
                      <div class="accordion-body">
                        <!-- Preço por Token -->
                        <div class="mb-3">
                          <label class="form-label">Preço por Token</label>
                          <div class="input-group">
                            <input type="number" class="form-control" id="tokenPrice" placeholder="0.01" step="0.0001" />
                            <span class="input-group-text" id="currencySymbol">BNB</span>
                          </div>
                          <small class="text-muted">Deixe vazio para auto-detectar</small>
                        </div>

                        <!-- Limites de Compra -->
                        <div class="row">
                          <div class="col-md-6">
                            <label class="form-label">Mínimo por compra</label>
                            <input type="number" class="form-control" id="minPurchase" placeholder="10" />
                          </div>
                          <div class="col-md-6">
                            <label class="form-label">Máximo por compra</label>
                            <input type="number" class="form-control" id="maxPurchase" placeholder="10000" />
                          </div>
                        </div>

                        <!-- Textos Personalizados -->
                        <div class="mb-3 mt-3">
                          <label class="form-label">Texto do Botão</label>
                          <input type="text" class="form-control" id="buyButtonText" placeholder="Comprar Tokens" value="Comprar Tokens" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Botão de Ação -->
                <div class="d-grid gap-2">
                  <button type="submit" class="btn btn-primary btn-lg" id="generateBtn">
                    <i class="bi bi-rocket-takeoff me-2"></i>
                    Gerar Widget
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Card de Preview -->
          <div class="card mt-4" id="previewCard" style="display: none;">
            <div class="card-header bg-success bg-opacity-10">
              <h5 class="mb-0">
                <i class="bi bi-eye me-2"></i>
                Preview do Widget
              </h5>
            </div>
            <div class="card-body">
              <div id="widgetPreview"></div>
              <div class="mt-3">
                <button class="btn btn-success" id="copyCodeBtn">
                  <i class="bi bi-clipboard me-2"></i>
                  Copiar Código
                </button>
                <button class="btn btn-outline-secondary" id="downloadJsonBtn">
                  <i class="bi bi-download me-2"></i>
                  Baixar Config
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Scripts -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js"></script>
    <script type="module" src="../../../js/modules/widget/widget-simple.js"></script>
  </body>
</html>
```

## 4. JAVASCRIPT SIMPLIFICADO (`widget-simple.js`)

```javascript
// TOKENCAFE - WIDGET SIMPLES
// Interface simplificada para usuários leigos

import { generateWidgetConfig, generateWidgetCode, detectPurchaseFunction, createMinimalAbi } from "./widget-generator.js";

// Estado da aplicação
let widgetState = {
  config: null,
  isValid: false,
  previewGenerated: false,
};

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  setupBlockchainSelector();
});

// Configurar eventos
function setupEventListeners() {
  const form = document.getElementById("widgetForm");
  const validateBtn = document.getElementById("validateBtn");
  const copyBtn = document.getElementById("copyCodeBtn");
  const downloadBtn = document.getElementById("downloadJsonBtn");

  form.addEventListener("submit", handleGenerateWidget);
  validateBtn.addEventListener("click", validateContract);
  copyBtn.addEventListener("click", copyWidgetCode);
  downloadBtn.addEventListener("click", downloadConfig);

  // Auto-validar quando mudar blockchain
  document.getElementById("blockchain").addEventListener("change", updateCurrencySymbol);
}

// Atualizar símbolo da moeda baseado na blockchain
function updateCurrencySymbol() {
  const blockchain = document.getElementById("blockchain");
  const selectedOption = blockchain.options[blockchain.selectedIndex];
  const symbol = selectedOption?.dataset.symbol || "BNB";
  document.getElementById("currencySymbol").textContent = symbol;
}

// Validar contrato
async function validateContract() {
  const contractAddress = document.getElementById("saleContract").value.trim();
  const chainId = document.getElementById("blockchain").value;

  if (!contractAddress || !chainId) {
    showToast("Por favor, preencha o endereço do contrato e selecione a blockchain", "warning");
    return;
  }

  try {
    showLoading("Validando contrato...");

    // Conectar à blockchain
    const rpcUrl = getRpcUrl(chainId);
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    // Verificar se o contrato existe
    const code = await provider.getCode(contractAddress);
    if (code === "0x") {
      throw new Error("Contrato não encontrado nesta blockchain");
    }

    // Detectar função de compra
    const abi = await fetchContractAbi(contractAddress, chainId);
    const purchaseFunction = detectPurchaseFunction(abi);

    if (!purchaseFunction) {
      throw new Error("Não foi possível detectar função de compra no contrato");
    }

    // Tudo válido!
    showToast("✅ Contrato validado com sucesso!", "success");
    widgetState.isValid = true;
  } catch (error) {
    showToast(`❌ Erro: ${error.message}`, "error");
    widgetState.isValid = false;
  } finally {
    hideLoading();
  }
}

// Gerar widget
async function handleGenerateWidget(event) {
  event.preventDefault();

  if (!widgetState.isValid) {
    showToast("Por favor, valide o contrato primeiro", "warning");
    return;
  }

  try {
    showLoading("Gerando widget...");

    // Coletar dados do formulário
    const formData = collectFormData();

    // Gerar código único
    const code = generateWidgetCode(formData.owner);

    // Criar configuração
    const config = await createWidgetConfig(formData, code);

    // Salvar no servidor
    await saveWidgetToServer(config);

    // Gerar código de incorporação
    const embedCode = generateEmbedCode(formData.owner, code);

    // Mostrar preview
    showWidgetPreview(config, embedCode);

    widgetState.config = config;
    widgetState.previewGenerated = true;

    showToast("✅ Widget gerado com sucesso!", "success");
  } catch (error) {
    showToast(`❌ Erro ao gerar widget: ${error.message}`, "error");
  } finally {
    hideLoading();
  }
}

// Coletar dados do formulário
function collectFormData() {
  return {
    projectName: document.getElementById("projectName").value.trim(),
    blockchain: document.getElementById("blockchain").value,
    saleContract: document.getElementById("saleContract").value.trim(),
    tokenPrice: document.getElementById("tokenPrice").value,
    minPurchase: document.getElementById("minPurchase").value,
    maxPurchase: document.getElementById("maxPurchase").value,
    buyButtonText: document.getElementById("buyButtonText").value,
    owner: getUserAddress(), // Implementar baseado na carteira conectada
  };
}

// Criar configuração do widget
async function createWidgetConfig(formData, code) {
  const chainId = parseInt(formData.blockchain);
  const rpcUrl = getRpcUrl(chainId);
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  // Buscar informações do contrato
  const saleAbi = await fetchContractAbi(formData.saleContract, chainId);
  const purchaseFunction = detectPurchaseFunction(saleAbi);

  // Detectar token e recebedor automaticamente
  const tokenContract = await detectTokenContract(formData.saleContract, saleAbi, provider);
  const receiverWallet = await detectReceiverWallet(formData.saleContract, saleAbi, provider);

  return generateWidgetConfig({
    owner: formData.owner,
    code: code,
    chainId: chainId,
    rpcUrl: rpcUrl,
    saleContract: formData.saleContract,
    receiverWallet: receiverWallet,
    tokenContract: tokenContract,
    purchaseFunction: purchaseFunction,
    saleAbi: createMinimalAbi(saleAbi, [purchaseFunction.name]),
    ui: {
      theme: "light",
      language: "pt-BR",
      currencySymbol: getCurrencySymbol(chainId),
      texts: {
        title: formData.projectName,
        buyButton: formData.buyButtonText,
        description: `Compre ${formData.projectName} com segurança`,
      },
    },
  });
}

// Funções auxiliares
function getRpcUrl(chainId) {
  const rpcs = {
    56: "https://bsc-dataseed.binance.org",
    97: "https://bsc-testnet.publicnode.com",
    1: "https://eth.llamarpc.com",
    137: "https://polygon-rpc.com",
  };
  return rpcs[chainId] || "https://bsc-testnet.publicnode.com";
}

function getCurrencySymbol(chainId) {
  const symbols = {
    56: "BNB",
    97: "BNB",
    1: "ETH",
    137: "MATIC",
  };
  return symbols[chainId] || "BNB";
}

function showToast(message, type = "info") {
  // Implementar sistema de notificações
  console.log(`[${type}] ${message}`);

  // Criar toast Bootstrap
  const toastHtml = `
        <div class="toast align-items-center text-white bg-${type === "error" ? "danger" : type === "success" ? "success" : "primary"} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

  // Adicionar ao container de toasts
  const container = document.getElementById("toastContainer") || createToastContainer();
  container.insertAdjacentHTML("beforeend", toastHtml);

  // Mostrar toast
  const toast = container.lastElementChild;
  new bootstrap.Toast(toast).show();
}

function createToastContainer() {
  const container = document.createElement("div");
  container.id = "toastContainer";
  container.className = "toast-container position-fixed top-0 end-0 p-3";
  container.style.zIndex = "9999";
  document.body.appendChild(container);
  return container;
}

function showLoading(message) {
  const btn = document.getElementById("generateBtn");
  if (btn) {
    btn.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2" role="status"></span>
            ${message}
        `;
    btn.disabled = true;
  }
}

function hideLoading() {
  const btn = document.getElementById("generateBtn");
  if (btn) {
    btn.innerHTML = `
            <i class="bi bi-rocket-takeoff me-2"></i>
            Gerar Widget
        `;
    btn.disabled = false;
  }
}

// Exportar funções necessárias
window.WidgetSimple = {
  showToast,
  showLoading,
  hideLoading,
};
```

## 5. SCRIPT DE MIGRAÇÃO

```bash
#!/bin/bash
# migrate-widget-simple.sh
# Script para migrar da estrutura antiga para a nova simplificada

echo "🚀 Iniciando migração do módulo widget..."

# Criar backup
echo "📦 Criando backup..."
BACKUP_DIR="backup_widget_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Copiar arquivos atuais
cp -r pages/modules/widget "$BACKUP_DIR/"
cp -r js/modules/widget "$BACKUP_DIR/"

echo "✅ Backup criado em: $BACKUP_DIR"

# Excluir arquivos obsoletos
echo "🗑️  Excluindo arquivos obsoletos..."
rm -f pages/modules/widget/widget-teste\ copy.html
rm -f pages/modules/widget/widget-teste.backup.html
rm -f pages/modules/widget/widget-index.html

echo "✅ Arquivos obsoletos removidos"

# Criar nova estrutura
echo "🏗️  Criando nova estrutura..."
mkdir -p pages/modules/widget
mkdir -p js/modules/widget

echo "✅ Nova estrutura criada"

# Mensagem final
echo ""
echo "🎉 Migração concluída!"
echo ""
echo "Próximos passos:"
echo "1. Criar gerar-widget.html com o código fornecido"
echo "2. Criar widget-simple.js com a lógica simplificada"
echo "3. Testar a nova interface"
echo "4. Atualizar links e navegação"
echo ""
echo "Backup disponível em: $BACKUP_DIR"
```

## 6. CHECKLIST DE IMPLEMENTAÇÃO

### ✅ **Antes de Começar**

- [ ] Fazer backup completo dos arquivos atuais
- [ ] Testar servidor Flask está funcionando
- [ ] Verificar se ethers.js está carregando corretamente

### ✅ **Implementação Passo a Passo**

- [ ] **1. Limpar arquivos obsoletos** (usar script de migração)
- [ ] **2. Criar gerar-widget.html** (interface simplificada)
- [ ] **3. Criar widget-simple.js** (lógica simplificada)
- [ ] **4. Testar validação de contrato** (passo mais importante)
- [ ] **5. Testar geração de widget** (preview e código)
- [ ] **6. Verificar salvamento no servidor** (JSON no backend)

### ✅ **Testes de Qualidade**

- [ ] Interface funciona em mobile
- [ ] Usuário leigo consegue criar widget em menos de 2 minutos
- [ ] Preview mostra exatamente como ficará
- [ ] Código gerado funciona em site externo
- [ ] Todos os erros mostram mensagens amigáveis

### ✅ **Documentação**

- [ ] Atualizar WIDGET-GUIDE.md
- [ ] Criar tutorial rápido em português
- [ ] Adicionar FAQ para problemas comuns

---

**Resultado Esperado**: Interface tão simples que até sua avó conseguiria criar um widget! 🎯
