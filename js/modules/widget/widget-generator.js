// TOKENCAFE - GERADOR DE WIDGETS
// Responsável por criar configurações JSON de widgets, validar dados e gerar snippets de incorporação
// Organização: por carteira do owner (checksummed address)

/**
 * Gera um código único para o widget
 * Formato: tc-YYYYMMDD-HHmmss-random
 * @param {string} owner - Endereço da carteira owner (opcional, para código mais específico)
 * @returns {string} Código único do widget
 */
export function generateWidgetCode(owner = null) {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "");
  const random = Math.random().toString(36).substring(2, 6);

  // Se tiver owner, usar últimos 4 chars do endereço para facilitar identificação
  const ownerSuffix = owner ? `-${owner.slice(-4).toLowerCase()}` : "";

  return `tc-${dateStr}-${timeStr}-${random}${ownerSuffix}`;
}

/**
 * Valida endereço Ethereum (checksum ou não)
 * @param {string} address - Endereço a validar
 * @returns {boolean} True se válido
 */
export function isValidAddress(address) {
  if (!address || typeof address !== "string") return false;
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Converte endereço para formato checksum (se ethers.js disponível)
 * @param {string} address - Endereço a converter
 * @returns {string} Endereço em checksum format
 */
export function toChecksumAddress(address) {
  if (!isValidAddress(address)) return address;

  // Se ethers.js disponível, usar getAddress
  if (typeof ethers !== "undefined" && ethers.utils && ethers.utils.getAddress) {
    try {
      return ethers.utils.getAddress(address);
    } catch (e) {
      console.warn("Erro ao converter checksum:", e);
      return address;
    }
  }

  return address;
}

/**
 * Detecta função de compra payable no ABI
 * Prioriza "buy", mas retorna qualquer payable se não encontrar
 * @param {Array} abi - ABI do contrato Sale
 * @returns {Object|null} {name, signature, inputs} da função ou null
 */
export function detectPurchaseFunction(abi) {
  if (!Array.isArray(abi) || !abi.length) return null;

  // Filtrar apenas funções payable
  const payables = abi.filter((f) => f.type === "function" && (f.stateMutability === "payable" || f.payable === true));

  if (!payables.length) return null;

  // Priorizar "buy"
  let func = payables.find((f) => f.name === "buy");

  // Se não achar, pegar a primeira payable
  if (!func) func = payables[0];

  // Construir assinatura
  const inputs = func.inputs || [];
  const signature = `${func.name}(${inputs.map((i) => i.type).join(",")})`;

  return {
    name: func.name,
    signature,
    inputs: inputs.map((i) => ({ name: i.name, type: i.type })),
    argsMode: inputs.length === 0 ? "none" : inputs.length === 1 && inputs[0].type.includes("uint") ? "quantity" : "custom",
  };
}

/**
 * Cria fragmentos mínimos de ABI para o JSON (sem expor ABI completa)
 * @param {Array} fullAbi - ABI completa
 * @param {Array} functionsNeeded - Array de nomes de funções necessárias
 * @returns {Array} Fragmentos de ABI (function strings)
 */
export function createMinimalAbi(fullAbi, functionsNeeded = []) {
  if (!Array.isArray(fullAbi)) return [];

  const fragments = [];

  fullAbi.forEach((item) => {
    if (item.type !== "function") return;
    if (functionsNeeded.length && !functionsNeeded.includes(item.name)) return;

    const inputs = (item.inputs || []).map((i) => i.type).join(",");
    const outputs = (item.outputs || []).map((o) => o.type).join(",");
    const state = item.stateMutability || (item.constant ? "view" : "nonpayable");

    let fragment = `function ${item.name}(${inputs})`;
    if (state !== "nonpayable") fragment += ` ${state}`;
    if (outputs) fragment += ` returns (${outputs})`;

    fragments.push(fragment);
  });

  return fragments;
}

/**
 * Gera configuração JSON do widget
 * @param {Object} config - Configuração do widget
 * @param {string} config.owner - Endereço owner (checksum)
 * @param {string} config.code - Código único do widget
 * @param {number} config.chainId - ID da rede blockchain
 * @param {string} config.rpcUrl - URL do RPC (opcional)
 * @param {string} config.saleContract - Endereço do contrato Sale (obrigatório)
 * @param {string} config.receiverWallet - Carteira que recebe os fundos (obrigatório)
 * @param {string} config.tokenContract - Endereço do token (opcional)
 * @param {Object} config.purchaseFunction - Função de compra detectada
 * @param {Array} config.saleAbi - ABI do Sale (opcional, para fragmentos)
 * @param {Array} config.tokenAbi - ABI do Token (opcional, para fragmentos)
 * @param {Object} config.ui - Configurações de UI (tema, idioma, textos)
 * @returns {Object} JSON de configuração completo
 */
export function generateWidgetConfig(config) {
  const { owner, code, chainId, rpcUrl, saleContract, receiverWallet, tokenContract, purchaseFunction, saleAbi, tokenAbi, ui = {} } = config;

  // Validações básicas
  if (!owner || !isValidAddress(owner)) {
    throw new Error("Owner inválido ou não fornecido");
  }
  if (!code) {
    throw new Error("Código do widget não fornecido");
  }
  if (!chainId || typeof chainId !== "number") {
    throw new Error("ChainId inválido");
  }
  if (!saleContract || !isValidAddress(saleContract)) {
    throw new Error("Contrato Sale inválido ou não fornecido");
  }
  if (!receiverWallet || !isValidAddress(receiverWallet)) {
    throw new Error("Carteira recebedora inválida ou não fornecida");
  }

  // Construir JSON base
  const widgetConfig = {
    schemaVersion: 1,
    owner: toChecksumAddress(owner),
    code,
    network: {
      chainId,
    },
    contracts: {
      sale: toChecksumAddress(saleContract),
      receiverWallet: toChecksumAddress(receiverWallet),
    },
    purchase: {
      functionName: purchaseFunction?.name || "buy",
      argsMode: purchaseFunction?.argsMode || "none",
      priceMode: "manual", // Default; pode ser 'contract' ou 'fixed' no futuro
    },
    ui: {
      theme: ui.theme || "light",
      language: ui.language || "pt-BR",
      showTestButton: ui.showTestButton !== false, // Default true
      currencySymbol: ui.currencySymbol || "BNB",
      texts: ui.texts || {
        title: "Compre seus tokens",
        description: "Finalize sua compra com segurança.",
        buyButton: "Comprar agora",
      },
    },
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: toChecksumAddress(owner),
    },
  };

  // Adicionar rpcUrl se fornecido
  if (rpcUrl) {
    widgetConfig.network.rpcUrl = rpcUrl;
  }

  // Adicionar tokenContract se fornecido
  if (tokenContract && isValidAddress(tokenContract)) {
    widgetConfig.contracts.token = toChecksumAddress(tokenContract);
  }

  // Adicionar assinatura da função se disponível
  if (purchaseFunction?.signature) {
    widgetConfig.purchase.functionSignature = purchaseFunction.signature;
  }

  // Criar fragmentos mínimos de ABI (sem expor ABI completa)
  if (saleAbi || tokenAbi) {
    widgetConfig.advanced = { minAbi: {} };

    if (saleAbi && Array.isArray(saleAbi)) {
      const saleFunctions = [purchaseFunction?.name || "buy", "destinationWallet", "saleToken", "bnbPrice"];
      widgetConfig.advanced.minAbi.sale = createMinimalAbi(saleAbi, saleFunctions);
    }

    if (tokenAbi && Array.isArray(tokenAbi)) {
      const tokenFunctions = ["decimals", "symbol", "name", "balanceOf"];
      widgetConfig.advanced.minAbi.token = createMinimalAbi(tokenAbi, tokenFunctions);
    }
  }

  return widgetConfig;
}

/**
 * Gera snippet HTML para incorporar o widget
 * @param {string} owner - Endereço owner
 * @param {string} code - Código do widget
 * @param {string} scriptUrl - URL do loader (default: relativo)
 * @returns {string} HTML snippet
 */
export function generateSnippet(owner, code, scriptUrl = "/assets/tokencafe-widget.min.js") {
  if (!owner || !code) {
    throw new Error("Owner e code são obrigatórios para gerar snippet");
  }

  return `<!-- TokenCafe Widget - ${code} -->
<script src="${scriptUrl}" async></script>
<div class="tokencafe-widget" 
     data-owner="${owner}"
     data-code="${code}"></div>`;
}

/**
 * Salva JSON localmente (download via blob)
 * @param {Object} config - Configuração JSON do widget
 * @param {string} filename - Nome do arquivo (opcional)
 */
export function downloadJSON(config, filename = null) {
  if (!config || typeof config !== "object") {
    throw new Error("Configuração inválida para download");
  }

  const fname = filename || `widget-${config.code || "config"}.json`;
  const json = JSON.stringify(config, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fname;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * Copia texto para clipboard
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} Sucesso ou falha
 */
export async function copyToClipboard(text) {
  if (window.copyToClipboard) {
    return window.copyToClipboard(text);
  }
  console.warn("Global copyToClipboard not found");
  return false;
}

/**
 * Valida configuração antes de gerar widget
 * Retorna objeto com {valid: boolean, errors: Array, warnings: Array}
 * @param {Object} config - Configuração a validar
 * @returns {Object} Resultado da validação
 */
export function validateConfig(config) {
  const errors = [];
  const warnings = [];

  // Obrigatórios
  if (!config.owner || !isValidAddress(config.owner)) {
    errors.push("Owner (carteira conectada) inválido ou ausente");
  }
  if (!config.chainId || typeof config.chainId !== "number") {
    errors.push("ChainId inválido ou ausente");
  }
  if (!config.saleContract || !isValidAddress(config.saleContract)) {
    errors.push("Contrato Sale inválido ou ausente");
  }
  if (!config.receiverWallet || !isValidAddress(config.receiverWallet)) {
    errors.push("Carteira recebedora inválida ou ausente");
  }

  // Opcionais mas recomendados
  if (!config.tokenContract) {
    warnings.push("Token não informado; testes de decimais e saldo não serão feitos");
  }
  if (!config.rpcUrl) {
    warnings.push("RPC não informado; usando fallback por chainId");
  }
  if (!config.purchaseFunction || !config.purchaseFunction.name) {
    warnings.push('Função de compra não detectada; assumindo "buy()"');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Exportar funções auxiliares para uso externo
export default {
  generateWidgetCode,
  isValidAddress,
  toChecksumAddress,
  detectPurchaseFunction,
  createMinimalAbi,
  generateWidgetConfig,
  generateSnippet,
  downloadJSON,
  copyToClipboard,
  validateConfig,
};
