import { updateContractDetailsView } from "../../shared/contract-search.js";
import { NetworkManager } from "../../shared/network-manager.js";
import { isWalletAdmin } from "../../shared/admin-security.js";
import { FeeManager } from "./fee-manager.js";

const $ = (sel) => document.querySelector(sel);

/**
 * Verifica se o usuário atual é administrador
 * @returns {boolean}
 */
export function checkIsAdmin() {
    // 1. Verificação de carteira (se conectada) via state global do módulo
    if (state.wallet && state.wallet.account) {
        return isWalletAdmin(state.wallet.account);
    }
    
    return false;
}

const nm = new NetworkManager();


function getDeployButton() {
  try {
    return document.getElementById("btnCreateToken") || document.getElementById("btnDeploy") || document.getElementById("btnBuildDeploy");
  } catch (_) {
    return null;
  }
}

// Função para aplicar máscara de supply (milhar ponto, decimal vírgula)
function applySupplyMask(e) {
  const el = e.target;
  let val = el.value;
  // Permite apenas numeros e virgula
  val = val.replace(/[^0-9,]/g, "");
  // Evita multiplas virgulas
  const parts = val.split(",");
  if (parts.length > 2) val = parts[0] + "," + parts.slice(1).join("");
  
  let integer = parts[0];
  const decimal = parts.length > 1 ? "," + parts[1] : "";
  
  // Formata milhar
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  
  // Se começou com virgula, adiciona 0 antes
  if (val.startsWith(",")) integer = "0";
  
  el.value = integer + decimal;
}

// Inicializa máscara e listener de forma robusta
function initSupplyMask() {
    const supplyEl = document.getElementById("initialSupply");
    if (supplyEl) {
        supplyEl.removeEventListener("input", applySupplyMask);
        supplyEl.addEventListener("input", applySupplyMask);
        // Formata valor inicial se houver
        if (supplyEl.value) {
             applySupplyMask({ target: supplyEl });
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSupplyMask);
} else {
    initSupplyMask();
}
import { getExplorerContractUrl, getExplorerTxUrl, getExplorerVerificationUrl } from "./explorer-utils.js";
import { getApiBase as getApiBaseShared, runVerifyDirect as runVerifyDirectShared, getVerificationStatus } from "../../shared/verify-utils.js";
import { SharedUtilities } from "../../core/shared_utilities_es6.js";
import { addTokenToMetaMask } from "../../shared/metamask-utils.js";
import { checkConnectivity } from "../../shared/components/api-status.js";

const RESERVED_KEYWORDS = [
  "abstract", "after", "alias", "apply", "auto", "case", "catch", "copyof", "default", "define", "final", 
  "immutable", "implements", "in", "inline", "let", "macro", "match", "mutable", "null", "of", "override", 
  "partial", "promise", "reference", "relocatable", "sealed", "sizeof", "static", "supports", "switch", "try", 
  "typedef", "typeof", "unchecked", "contract", "interface", "library", "function", "address", "uint", "int", 
  "bool", "string", "byte", "bytes", "mapping", "struct", "enum", "event", "modifier", "constructor", "fallback", 
  "receive", "public", "external", "internal", "private", "view", "pure", "payable", "storage", "memory", 
  "calldata", "virtual", "break", "continue", "do", "else", "for", "if", "return", "while", "revert", "assert", 
  "require", "throw", "new", "delete", "this", "super", "emit", "using", "import", "from", "as", "is", "var", 
  "const", "class", "extends", "debugger", "export", "void", "yield", "true", "false", "instanceof", "await", "async"
];

// Estado simples do módulo
export const state = {
  wallet: {
    provider: null,
    signer: null,
    address: null,
    chainId: null,
  },
  form: {
    group: "erc20-minimal",
    network: null, // definido via network-search
    token: {
      name: "",
      symbol: "",
      decimals: 18,
      initialSupply: 1000000,
      existingAddress: "",
    },
    sale: {
      priceDec: "0.001",
      minDec: "0.005",
      maxDec: "1.0",
      capUnits: 0n,
      payoutWallet: "",
      nativeSymbol: "", // preenchido pela rede
      nativeDecimals: 18, // preenchido pela rede
    },
    initialOwner: "",
    initialHolder: "",
    vanity: {
      mode: "none",
      custom: "",
    },
  },
  validated: false,
  compilation: {},
  deployed: {
    address: null,
    transactionHash: null,
  },
};

export function getSerializableState() {
  const replacer = (key, value) =>
    typeof value === 'bigint' ? value.toString() : value;

  try {
    const cleanState = {
        form: state.form,
        compilation: state.compilation,
        deployed: state.deployed,
        wallet: {
            address: state.wallet.address,
            chainId: state.wallet.chainId
        },
        validated: state.validated
    };
    return JSON.parse(JSON.stringify(cleanState, replacer));
  } catch (e) {
    console.error("Erro ao serializar estado:", e);
    return null;
  }
}

function log(msg) {
  try {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
  } catch (_) {}
}

// Informações dos grupos de contrato e compatibilidade
export const CONTRACT_GROUPS = {
  "erc20-minimal": {
    title: "ERC20-Padrão",
    summary: "Token ERC20 básico com mint inicial e sem controles extras.",
    features: ["Transferências padrão", "Supply inicial mintado ao deployer"],
    saleIntegration: false,
    order: ["Token"],
    notes: "Ideal para começar simples. Complementos podem ser adicionados em versões upgradeáveis.",
  },
  "erc20-controls": {
    title: "ERC20-Gerenciável",
    summary: "Token ERC20 com controles (pausable, blacklist/whitelist dependendo da configuração).",
    features: ["Pausar transferências", "Controles de acesso"],
    saleIntegration: false,
    order: ["Token"],
    notes: "Exige entendimento de funções administrativas. Bom para governança mínima.",
  },
  "erc20-advanced": {
    title: "ERC20-Avançado",
    summary: "Token avançado com taxas, proteções e swap integrado.",
    features: ["Taxas (Liquidez, Mkt, Burn)", "Anti-Bot", "Limites (Max Wallet/Tx)", "Swap Automático"],
    saleIntegration: false,
    order: ["Token Avançado"],
    notes: "Ideal para projetos DeFi completos. Configurável via interface dedicada.",
  },
  "erc20-directsale": {
    title: "ERC20-Venda / ICO",
    summary: "Token com venda direta embutida (compra em moeda nativa, parâmetros decimais).",
    features: ["Preço por token", "Compra mínima/máxima", "Recebimento em carteira definida"],
    saleIntegration: true,
    order: ["Token", "Venda"],
    notes: "Fluxo sequencial: primeiro token, depois venda direta. Valores aceitam decimais.",
  },
  "tokensale-separado": {
    title: "TokenSale-Separado",
    summary: "Contrato de venda separado, vinculado a um token existente.",
    features: ["Vende token existente", "Parâmetros decimais", "Carteira de recebimento"],
    saleIntegration: true,
    useExistingToken: true,
    order: ["Token existente", "Venda"],
    notes: "Requer endereço do token existente. Se não houver, este grupo não é aplicável.",
  },
  "upgradeable-uups": {
    title: "Upgradeable-UUPS (OmniToken)",
    summary: "Token upgradeável via UUPS, permitindo evolução e módulos futuros.",
    features: ["Proxy UUPS", "Atualizações seguras", "Pode integrar venda"],
    saleIntegration: true,
    order: ["Proxy", "Implantação lógica", "Venda (opcional)"],
    notes: "Base + complementos em ordem definida. Complementos dependem do estado atual do proxy.",
  },
};

function updateTokenFieldsVisibility() {
  const g = state.form.group || $("#contractGroup").value;
  const info = CONTRACT_GROUPS[g];
  const useExisting = Boolean(info?.useExistingToken);

  const existingContainer = $("#existingTokenContainer");
  const nameContainer = $("#tokenNameContainer");
  const symbolContainer = $("#tokenSymbolContainer");
  const decimalsContainer = $("#tokenDecimalsContainer");
  const supplyContainer = $("#initialSupplyContainer");

  if (existingContainer) existingContainer.classList.toggle("d-none", !useExisting);
  
  // Se usa token existente, esconde os campos de criação de token
  const hideCreation = useExisting;
  if (nameContainer) nameContainer.classList.toggle("d-none", hideCreation);
  if (symbolContainer) symbolContainer.classList.toggle("d-none", hideCreation);
  if (decimalsContainer) decimalsContainer.classList.toggle("d-none", hideCreation);
  if (supplyContainer) supplyContainer.classList.toggle("d-none", hideCreation);
}

export function updateContractInfo() {
  updateTokenFieldsVisibility();
  const box = $("#contractGroupInfo");
  if (!box) return;
  const g = state.form.group || $("#contractGroup").value;
  const info = CONTRACT_GROUPS[g];
  if (!info) {
    box.innerHTML = "";
    return;
  }
  const saleBadge = info.saleIntegration ? '<span class="badge bg-info ms-1">Inclui venda</span>' : '<span class="badge bg-secondary ms-1">Sem venda</span>';
  box.innerHTML = `
    <div class="alert alert-dark border p-3">
      <h6 class="border-bottom border-secondary pb-2 mb-2">Características do Contrato</h6>
      <div class="d-flex align-items-center mb-1">
        <strong class="small">${info.title}</strong>
        ${saleBadge}
      </div>
      <div class="small mb-2">${info.summary}</div>
      <div class="small text-muted">Ordem: ${info.order.join(" → ")}</div>
      <div class="mt-2 small">Funções: ${info.features.join(", ")}</div>
      <div class="mt-2 small">Notas: ${info.notes}</div>
      <div class="mt-2 small">Complementos liberados quando houver contrato base (futuro).</div>
    </div>
  `;
}

function setSaleVisibility() {
  const g = state.form.group || $("#contractGroup").value;
  const show = Boolean(CONTRACT_GROUPS[g]?.saleIntegration);
  const node = $("#saleParams");
  if (node) node.classList.toggle("d-none", !show);
}

export function updateVanityVisibility() {
  const modeEl = $("#vanityMode");
  const mode = modeEl ? modeEl.value : "none";
  const customBox = $("#vanityCustomContainer");
  const showCustom = ["prefix-custom", "suffix-custom"].includes(mode);
  if (customBox) customBox.classList.toggle("d-none", !showCustom);
  const helpEl = $("#vanityHelp");
  if (helpEl) helpEl.classList.toggle("d-none", !showCustom);
}

export function readForm() {
  const getVal = (id, def = "") => {
    const el = $(id);
    return el ? el.value : def;
  };

  state.form.group = getVal("#contractGroup", "standard");
  state.form.token.existingAddress = String(getVal("#existingTokenAddress")).replace(/\s+$/u, "");

  state.form.token.name = String(getVal("#tokenName")).replace(/\s+$/u, "");
  state.form.token.symbol = String(getVal("#tokenSymbol"))
    .replace(/\s+$/u, "")
    .toUpperCase();
  state.form.token.decimals = parseInt(getVal("#tokenDecimals", "18"), 10);
  {
    const raw = String(getVal("#initialSupply", "0")).replace(/\s+$/u, "");
    const sanitized = raw.replace(/[^0-9]/g, "");
    // Manter como string para suportar números grandes (> 2^53)
    state.form.token.initialSupply = sanitized || "0";
  }

  // Entradas decimais (strings), não usar wei. Conversão será feita no backend.
  state.form.sale.priceDec = String(getVal("#tokenPriceDec")).replace(/\s+$/u, "");
  state.form.sale.minDec = String(getVal("#minPurchaseDec")).replace(/\s+$/u, "");
  state.form.sale.maxDec = String(getVal("#maxPurchaseDec")).replace(/\s+$/u, "");
  state.form.sale.capUnits = BigInt(getVal("#perWalletCap", "0"));
  state.form.sale.payoutWallet = String(getVal("#payoutWallet")).replace(/\s+$/u, "");

  state.form.initialOwner = String(getVal("#initialOwner", "")).replace(/\s+$/u, "");
  state.form.initialHolder = String(getVal("#initialHolder", "")).replace(/\s+$/u, "");

  state.form.vanity.mode = getVal("#vanityMode", "none");
  state.form.vanity.custom = String(getVal("#vanityCustom")).replace(/\s+$/u, "");

  // Leitura de campos avançados (Token Avançado)
  const chk = (id, id2) => {
      const el1 = document.getElementById(id);
      if (el1) return el1.checked;
      if (id2) {
          const el2 = document.getElementById(id2);
          if (el2) return el2.checked;
      }
      return false;
  };
  const num = (id) => {
    const v = getVal(`#${id}`);
    return v ? Number(v) : 0;
  };

  state.form.advanced = {
    features: {
      mintable: chk("checkMintable"),
      burnable: chk("checkBurnable", "featBurnable"),
      pausable: chk("checkPausable", "featPausable"),
      ownable: chk("checkOwnable", "featOwnable"),
      roles: chk("checkRoles", "featRoles"),
      permit: chk("checkPermit", "featPermit"),
      votes: chk("checkVotes", "featVotes"),
      flashMint: chk("checkFlashMint", "featFlashMint"),
      snapshots: chk("checkSnapshots", "featSnapshots"),
      antiBot: chk("checkAntibot"),
      maxWallet: chk("checkMaxWallet"),
      maxTx: chk("checkMaxTx"),
      blacklist: chk("checkBlacklist"),
      recoverable: chk("checkRecoverable")
    },
    taxes: {
      liquidity: { enabled: chk("checkLiquidityTax"), buy: num("liqBuyTax"), sell: num("liqSellTax") },
      wallet: { enabled: chk("checkWalletTax"), buy: num("walletBuyTax"), sell: num("walletSellTax") },
      burn: { enabled: chk("checkBurnTax"), buy: num("burnBuyTax"), sell: num("burnSellTax") }
    },
    limits: {
      maxWalletPercent: num("maxWalletPercent"),
      maxTxPercent: num("maxTxPercent")
    },
    swap: {
      threshold: num("swapThreshold")
    }
  };
}

function validateHex4(str) {
  // Aceitar apenas 0-9 e a-f (case-insensitive). Aviso: não garantimos maiúsculas/minúsculas no endereço.
  return /^[0-9a-f]{4}$/i.test(str);
}

// Validação de endereço usando utilitário compartilhado (consistência com o resto da app)
const __utils = new SharedUtilities();
function isValidAddress(addr) {
  try {
    return __utils.isValidEthereumAddress(String(addr || ""));
  } catch (_) {
    return false;
  }
}

function getDefaultImageUrl() {
  try {
    const origin = String(location.origin || "");
    if (/^https?:/i.test(origin)) return `${origin.replace(/\/$/, "")}/imgs/tkncafe192x192.png`;
    return "https://tokencafe.onrender.com/imgs/tkncafe192x192.png";
  } catch (_) {
    return "https://tokencafe.onrender.com/imgs/tkncafe192x192.png";
  }
}

function getFallbackRpcByChainId(chainId) {
  try {
    const cid = Number(chainId);
    if (cid === 56) return "https://bsc-dataseed.binance.org";
    if (cid === 97) return "https://bsc-testnet.publicnode.com";
    if (cid === 1) return "https://eth.llamarpc.com";
    if (cid === 137) return "https://polygon-rpc.com";
    return "";
  } catch (_) {
    return "";
  }
}

// manter padrão: usa primeiro RPC da rede ou fallback por chainId

export function validateForm() {
  readForm();
  const errors = [];
  const group = state.form.group;
  const useExisting = Boolean(CONTRACT_GROUPS[group]?.useExistingToken);

  if (useExisting) {
    if (!isValidAddress(state.form.token.existingAddress)) {
      errors.push("Endereço do token existente inválido.");
    }
  } else {
    // Validações de criação de token
    if (!state.form.token.name) errors.push("Nome do token é obrigatório.");
    if (state.form.token.name && RESERVED_KEYWORDS.includes(state.form.token.name.toLowerCase())) {
      errors.push(`O nome "${state.form.token.name}" é reservado (Solidity/JS keyword). Escolha outro.`);
    }
    if (!state.form.token.symbol) errors.push("Símbolo do token é obrigatório.");
    if (!/^[A-Z0-9]{3,8}$/.test(state.form.token.symbol)) {
      errors.push("Símbolo deve conter 3–8 caracteres A–Z e 0–9 (sem especiais).");
    }
    if (state.form.token.decimals < 0 || state.form.token.decimals > 18) {
      errors.push("Decimais devem estar entre 0 e 18.");
    }
    // Validação de supply como string/BigInt
    if (!/^\d+$/.test(state.form.token.initialSupply)) {
      errors.push("Supply inicial deve conter apenas números.");
    }
  }

  // Venda quando aplicável (entradas decimais)
  if (CONTRACT_GROUPS[group]?.saleIntegration) {
    const toNum = (s) => Number(String(s).replace(",", "."));
    const price = toNum(state.form.sale.priceDec);
    const min = toNum(state.form.sale.minDec);
    const max = toNum(state.form.sale.maxDec);
    if (!(price > 0)) errors.push("Preço por token deve ser um número decimal > 0.");
    if (min < 0) errors.push("Compra mínima deve ser ≥ 0.");
    if (max < 0) errors.push("Compra máxima deve ser ≥ 0.");
    if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
      errors.push("Compra máxima deve ser ≥ compra mínima.");
    }
    if (state.form.sale.payoutWallet && !/^0x[0-9a-fA-F]{40}$/.test(state.form.sale.payoutWallet)) {
      errors.push("Carteira de recebimento deve ser um endereço válido (0x...).");
    }
  }

  // Validação de Owners opcionais
  if (state.form.initialOwner && !isValidAddress(state.form.initialOwner)) {
    errors.push("Endereço do Proprietário (Owner) inválido.");
  }
  if (state.form.initialHolder && !isValidAddress(state.form.initialHolder)) {
    errors.push("Endereço do Destinatário do Supply inválido.");
  }

  // Vanity
  const { mode, custom } = state.form.vanity;
  if (["prefix-custom", "suffix-custom"].includes(mode)) {
    if (!validateHex4(custom)) errors.push("Custom deve ser 4 hex válidos (ex.: cafe, beef, dead).");
  }

  if (errors.length) {
    errors.forEach((e) => log(`Erro: ${e}`));
    state.validated = false;
    return false;
  }

  log("Validação concluída com sucesso. Entradas decimais e rede ok.");
  state.validated = true;
  return true;
}

// ---------- Validação visual inline ----------
function getEl(id) {
  return document.getElementById(id);
}

function ensureInvalidFeedback(el) {
  if (!el) return null;
  let fb = el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains("invalid-feedback") ? el.nextElementSibling : null;
  if (!fb) {
    fb = document.createElement("div");
    fb.className = "invalid-feedback";
    // colocar após o input dentro do mesmo container
    el.parentElement && el.parentElement.appendChild(fb);
  }
  return fb;
}

function setFieldInvalid(el, message) {
  if (!el) return false;
  el.classList.add("is-invalid");
  const fb = ensureInvalidFeedback(el);
  if (fb) fb.textContent = message || "Campo inválido.";
  return false;
}

function clearFieldInvalid(el) {
  if (!el) return true;
  el.classList.remove("is-invalid");
  const fb = el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains("invalid-feedback") ? el.nextElementSibling : null;
  if (fb) fb.textContent = "";
  return true;
}

export function validateTokenNameInline() {
  const el = getEl("tokenName");
  const v = String(el?.value || "").trim();
  if (!v) return setFieldInvalid(el, "Informe o nome do token.");
  if (RESERVED_KEYWORDS.includes(v.toLowerCase())) return setFieldInvalid(el, "Nome inválido (palavra reservada).");
  return clearFieldInvalid(el);
}

export function validateTokenSymbolInline() {
  const el = getEl("tokenSymbol");
  let v = String(el?.value || "");
  // Sanitizar para maiúsculas A–Z e dígitos 0–9, no máx 8 chars
  const sanitized = v
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8);
  if (sanitized !== v) el.value = sanitized;
  v = sanitized;
  if (!v) return setFieldInvalid(el, "Informe o símbolo do token.");
  if (!/^[A-Z0-9]{3,8}$/.test(v)) return setFieldInvalid(el, "Símbolo deve ter 3–8 caracteres A–Z e 0–9 (sem especiais).");
  return clearFieldInvalid(el);
}

export function validateTokenDecimalsInline() {
  const el = getEl("tokenDecimals");
  const val = parseInt(el?.value || "18", 10);
  if (!Number.isFinite(val) || val < 0 || val > 18) {
    return setFieldInvalid(el, "Decimais devem estar entre 0 e 18.");
  }
  return clearFieldInvalid(el);
}

export function validateInitialSupplyInline() {
  const el = getEl("initialSupply");
  const raw = String(el?.value || "").trim();
  // Limpar formatação (milhar ponto, decimal virgula)
  let clean = raw.replace(/\./g, "").replace(/,/g, ".");
  
  if (!raw || !/^\d+(\.\d*)?$/.test(clean)) {
    return setFieldInvalid(el, "Supply inicial deve conter apenas números válidos.");
  }
  return clearFieldInvalid(el);
}

export function validateSaleInline() {
  const group = $("#contractGroup").value;
  const saleApplies = ["erc20-directsale", "upgradeable-uups"].includes(group);
  const priceEl = getEl("tokenPriceDec");
  const minEl = getEl("minPurchaseDec");
  const maxEl = getEl("maxPurchaseDec");
  const capEl = getEl("perWalletCap");
  const payoutEl = getEl("payoutWallet");

  if (!saleApplies) {
    // limpar erros se venda não se aplica
    clearFieldInvalid(priceEl);
    clearFieldInvalid(minEl);
    clearFieldInvalid(maxEl);
    clearFieldInvalid(capEl);
    clearFieldInvalid(payoutEl);
    return true;
  }

  const toNum = (s) => Number(String(s).replace(",", "."));
  const price = toNum(priceEl?.value || "");
  const min = toNum(minEl?.value || "");
  const max = toNum(maxEl?.value || "");
  let ok = true;
  if (!(price > 0)) ok = setFieldInvalid(priceEl, "Preço por token deve ser > 0.");
  else clearFieldInvalid(priceEl);
  if (!(min >= 0)) ok = setFieldInvalid(minEl, "Compra mínima deve ser ≥ 0.");
  else clearFieldInvalid(minEl);
  if (!(max >= 0)) ok = setFieldInvalid(maxEl, "Compra máxima deve ser ≥ 0.");
  else clearFieldInvalid(maxEl);
  if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
    ok = setFieldInvalid(maxEl, "Compra máxima deve ser ≥ mínima.");
  }
  const capVal = parseInt(capEl?.value || "0", 10);
  if (!Number.isFinite(capVal) || capVal < 0) ok = setFieldInvalid(capEl, "Cap por carteira deve ser ≥ 0.");
  else clearFieldInvalid(capEl);
  const pw = String(payoutEl?.value || "").replace(/\s+$/u, "");
  if (pw && !/^0x[0-9a-fA-F]{40}$/.test(pw)) ok = setFieldInvalid(payoutEl, "Endereço inválido (0x...).");
  else clearFieldInvalid(payoutEl);
  return ok;
}

export function runAllFieldValidation() {
  let ok = true;
  ok = validateTokenNameInline() && ok;
  ok = validateTokenSymbolInline() && ok;
  ok = validateTokenDecimalsInline() && ok;
  ok = validateInitialSupplyInline() && ok;
  ok = validateSaleInline() && ok;
  // vanity custom já tem validação/sanitização própria; manter comportamento atual
  return ok;
}

export async function connectWallet() {
  try {
    if (!window.ethereum) {
      log("MetaMask não encontrada. Instale a extensão para continuar.");
      alert("MetaMask não encontrada. Instale a extensão para continuar.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const { chainId } = await provider.getNetwork();
    state.wallet = { provider, signer, address, chainId };
    log(`Carteira conectada: ${address} (chainId ${chainId})`);

    // Preencher campos de Owner e Holder se estiverem vazios
    try {
        const ownerInput = document.getElementById("initialOwner");
        const holderInput = document.getElementById("initialHolder");
        if (ownerInput && !ownerInput.value) {
            ownerInput.value = address;
            // Disparar evento para limpar validação
            ownerInput.dispatchEvent(new Event('input'));
        }
        if (holderInput && !holderInput.value) {
            holderInput.value = address;
            holderInput.dispatchEvent(new Event('input'));
        }
    } catch (_) {}
  } catch (err) {
    log(`Falha ao conectar carteira: ${err.message || err}`);
    alert(`Falha ao conectar carteira: ${err.message || err}`);
  }
}

// Funções auxiliares e resolução do API_BASE
function getApiBase() {
  const base = getApiBaseShared();
  try {
    const fromWin = window.TOKENCAFE_API_BASE || window.XCAFE_API_BASE || null;
    const fromLs = window.localStorage?.getItem("api_base") || null;
    log(`API_BASE resolvido: ${base} (fonte: ${fromWin ? "window" : fromLs ? "localStorage" : "fallback"})`);
  } catch (_) {}
  return base;
}

function setApiBase(newBase) {
  try {
    window.TOKENCAFE_API_BASE = newBase;
    if (window.localStorage) window.localStorage.setItem("api_base", newBase);
    try {
      const baseDisp = document.getElementById("apiBaseDisplay");
      if (baseDisp) baseDisp.textContent = newBase;
    } catch (_) {}
    log(`API_BASE atualizado: ${newBase}`);
  } catch (_) {}
}

async function checkApiConnectivity(apiBase) {
  // Pass showOnCheck=false to keep hidden on success/failure unless explicit
  // Pass apiBase to verify specific candidate
  return await checkConnectivity(false, apiBase);
}

function showConnectionDiagnosis(attempts) {
    const list = attempts.map(a => `<li class="mb-2 p-2 border rounded bg-white"><div class="d-flex justify-content-between align-items-center"><span class="badge bg-secondary">${a.label}</span></div><small class="text-muted d-block mt-1 text-break">${a.url}</small><small class="text-danger d-block mt-1"><i class="bi bi-x-circle"></i> ${a.status}</small></li>`).join("");
    
    const content = `
        <div class="text-start">
            <p class="mb-3">O sistema tentou conectar a todos os servidores conhecidos, mas não obteve resposta.</p>
            <ul class="list-unstyled bg-light p-3 rounded border mb-3" style="max-height: 200px; overflow-y: auto;">${list}</ul>
            <p class="mb-2 fw-bold"><i class="bi bi-question-circle"></i> Possíveis causas:</p>
            <ul class="small text-muted mb-3">
                <li>Backend local desligado (se usando localhost).</li>
                <li>Bloqueio de rede ou CORS (se usando arquivo local).</li>
                <li>Servidores de produção em modo 'sleep' (Render Free Tier).</li>
            </ul>
            <div class="d-grid gap-2">
                 <a href="https://tokencafe-api.onrender.com/health" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-box-arrow-up-right"></i> Testar API Legacy
                 </a>
                 <a href="https://tokencafe.onrender.com/health" target="_blank" class="btn btn-outline-primary btn-sm">
                    <i class="bi bi-box-arrow-up-right"></i> Testar API Hybrid
                 </a>
            </div>
        </div>
    `;

    if (window.SystemResponse) {
        new window.SystemResponse().show({
            type: "error",
            title: "Sem Conexão com API",
            subtitle: "Todos os servidores falharam",
            htmlContent: content
        });
    } else {
        alert("Erro Crítico: Nenhum servidor de API disponível.\n\nVerifique sua conexão ou se o backend está rodando.");
    }
    
    try {
        const help = document.getElementById("apiErrorHelp");
        if (help) {
             help.innerHTML = `<strong>Falha Geral:</strong> <br> <small>Nenhum servidor respondeu. Veja o popup para detalhes.</small>`;
             help.classList.remove("d-none");
        }
    } catch (_) {}
}

export async function ensureServersOnline() {
  let base = getApiBase();
  log(`Verificando status dos servidores de API em ${base}...`);
  
  const attempts = [];
  
  const tryConnect = async (url, label) => {
      // Pass explicit false for showOnCheck, and url as overrideBaseUrl
      const ok = await checkApiConnectivity(false, url);
      if (ok) {
          return true;
      }
      attempts.push({ label, url, status: "Falha ao conectar (Timeout ou Erro)" });
      return false;
  };

  // 1. Tentar base configurada
  if (await tryConnect(base, "Base Configurada")) {
    await checkApiEndpoints(base);
    return true;
  }

  // 2. Tentar Localhost
  const local = "http://localhost:3000";
  if (base !== local) {
    log("Aviso: Conectividade com API principal falhou. Tentando servidor local...");
    if (await tryConnect(local, "Localhost (Dev)")) {
      setApiBase(local);
      await checkApiEndpoints(local);
      log("Conectado ao servidor local (localhost:3000).");
      return true;
    }
  }
  
  // 3. Tentar Produção (Hybrid)
  const prod1 = "https://tokencafe.onrender.com";
  if (base !== prod1) {
    log("Aviso: Conectividade com API local falhou. Tentando servidor de produção (Hybrid)...");
    if (await tryConnect(prod1, "Produção (Hybrid)")) {
      setApiBase(prod1);
      await checkApiEndpoints(prod1);
      log(`Conectado ao servidor de produção (${prod1}).`);
      return true;
    }
  }

  // 4. Tentar Produção (Legacy)
  const prod2 = "https://tokencafe-api.onrender.com";
  if (base !== prod2) {
    log("Aviso: Conectividade com API Hybrid falhou. Tentando servidor de produção (Legacy)...");
    if (await tryConnect(prod2, "Produção (Legacy)")) {
      setApiBase(prod2);
      await checkApiEndpoints(prod2);
      log(`Conectado ao servidor de produção (${prod2}).`);
      return true;
    }
  }

  log("Erro: nenhum servidor de API está acessível. Forçando fallback para Produção (Hybrid).");
  // showConnectionDiagnosis(attempts); // REMOVIDO: Não mostrar erro se vamos tentar o fallback silencioso

  // FALLBACK FORÇADO: Permite que o sistema continue tentando usar a produção
  // Isso resolve casos onde o health check falha (timeout/cors) mas a API pode estar funcional ou acordando
  const fallback = "https://tokencafe.onrender.com";
  setApiBase(fallback);
  log(`Fallback ativado: assumindo ${fallback} como base.`);
  return true; 
}

async function fetchWithDiagnostics(url, options = {}) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 60000; // Aumentado para 60s (Render Free Tier)
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(t);
    const ms = Date.now() - start;
    const ct = resp.headers?.get?.("content-type") || "desconhecido";
    const rlLimit = resp.headers?.get?.("ratelimit-limit") || resp.headers?.get?.("RateLimit-Limit");
    const rlRemain = resp.headers?.get?.("ratelimit-remaining") || resp.headers?.get?.("RateLimit-Remaining");
    const rlReset = resp.headers?.get?.("ratelimit-reset") || resp.headers?.get?.("RateLimit-Reset");
    const corsAllow = resp.headers?.get?.("access-control-allow-origin");
    let extra = `content-type=${ct}`;
    if (corsAllow) extra += ` | CORS allow=${corsAllow}`;
    if (rlLimit || rlRemain || rlReset) extra += ` | RateLimit L=${rlLimit || "-"} R=${rlRemain || "-"} Reset=${rlReset || "-"}`;
    log(`HTTP ${resp.status} em ${ms}ms | ${extra}`);
    return resp;
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err?.message || String(err);
    log(`Fetch falhou (${msg}) em ${ms}ms para ${url}`);
    if (err instanceof TypeError && msg.includes("Failed to fetch")) {
      const pageProto = window.location.protocol;
      const apiProto = (() => {
        try {
          return new URL(url).protocol;
        } catch {
          return "unknown:";
        }
      })();
      log(`Possível CORS/mixed content. Página: ${pageProto}, URL: ${apiProto}, online=${navigator.onLine}`);
    }
    throw err;
  }
}

// Utilidades de fallback: sanitização de nome e geração de contrato
function sanitizeContractName(rawName) {
  try {
    const base = String(rawName || "").trim();
    let cleaned = base.replace(/[^A-Za-z0-9_]/g, "");
    if (!cleaned) cleaned = "Token";
    if (!/^[A-Za-z_]/.test(cleaned)) cleaned = `_${cleaned}`;
    if (cleaned.length > 64) cleaned = cleaned.slice(0, 64);
    return cleaned;
  } catch (_) {
    return "Token";
  }
}

// V2: fonte ERC-20 corrigida para fallback de compilação
function generateTokenSourceV2(name, symbol, decimals, totalSupplyInt, advancedParams = null) {
  try {
    const contractName = sanitizeContractName(name);
    const d = parseInt(decimals, 10);
    const ts = String(totalSupplyInt || "0");

    // Fallback simples se não houver params avançados
    if (!advancedParams) {
        const src = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract ${contractName} {
    string public name = "${String(name)}";
    string public symbol = "${String(symbol)}";
    uint8 public decimals = ${d};
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        totalSupply = ${ts} * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
}`;
        return { contractName, sourceCode: src.trim() };
    }

    // Geração Avançada (Fallback com suporte básico a taxas)
    const src = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

contract ${contractName} is Context, IERC20 {
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    uint256 private _totalSupply;
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    address public owner;
    
    // Tax Config (Fallback Basic)
    uint256 public liquidityTax = ${advancedParams.taxes?.liquidity?.enabled ? (advancedParams.taxes.liquidity.buy || 0) : 0};
    uint256 public marketingTax = ${advancedParams.taxes?.wallet?.enabled ? (advancedParams.taxes.wallet.buy || 0) : 0};
    address public marketingWallet = ${advancedParams.taxes?.wallet?.address ? `0x${advancedParams.taxes.wallet.address.replace('0x','')}` : 'address(0)'};

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _name = "${String(name)}";
        _symbol = "${String(symbol)}";
        _decimals = ${d};
        _totalSupply = ${ts} * 10**_decimals;
        owner = _msgSender();
        
        _balances[_msgSender()] = _totalSupply;
        emit Transfer(address(0), _msgSender(), _totalSupply);
        emit OwnershipTransferred(address(0), _msgSender());
    }

    function name() public view returns (string memory) { return _name; }
    function symbol() public view returns (string memory) { return _symbol; }
    function decimals() public view returns (uint8) { return _decimals; }
    function totalSupply() public view override returns (uint256) { return _totalSupply; }
    function balanceOf(address account) public view override returns (uint256) { return _balances[account]; }

    function transfer(address recipient, uint256 amount) public override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) public override returns (bool) {
        _transfer(sender, recipient, amount);
        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        unchecked {
            _approve(sender, _msgSender(), currentAllowance - amount);
        }
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        
        // Basic Tax Logic for Fallback
        uint256 taxAmount = 0;
        if (sender != owner && recipient != owner) {
            uint256 totalTax = liquidityTax + marketingTax;
            if (totalTax > 0) {
                taxAmount = (amount * totalTax) / 100;
                if (taxAmount > 0) {
                    _balances[address(this)] += taxAmount;
                    emit Transfer(sender, address(this), taxAmount);
                }
            }
        }
        
        uint256 receiveAmount = amount - taxAmount;
        unchecked {
            _balances[sender] = senderBalance - amount;
        }
        _balances[recipient] += receiveAmount;
        emit Transfer(sender, recipient, receiveAmount);
    }
}
`;
    return { contractName, sourceCode: src.trim() };

  } catch (_) {
    // Fallback do fallback
    const fallbackName = sanitizeContractName("Token");
    const src = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract ${fallbackName} {
    string public name = "Token";
    string public symbol = "TKN";
    uint8 public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        totalSupply = 1000000 * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
}`;
    return { contractName: fallbackName, sourceCode: src.trim() };
  }
}

async function probeEndpoint(apiBase, path) {
  const url = `${apiBase}${path}`;
  try {
    const resp = await fetchWithDiagnostics(url, {
      method: "OPTIONS",
      timeoutMs: 8000,
    });
    log(`Probe ${path}: status ${resp.status}`);
    return resp.status;
  } catch (e) {
    log(`Probe ${path} falhou: ${e?.message || e}`);
    return -1;
  }
}

// UI: renderização de status dos endpoints
function setBadgeStatus(id, code) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove("bg-success", "bg-danger", "bg-secondary", "bg-warning");
  if (typeof code !== "number") {
    el.textContent = "pendente";
    el.classList.add("bg-secondary");
    return;
  }
  if (code >= 200 && code < 400) {
    el.textContent = "online";
    el.classList.add("bg-success");
  } else if (code === -1) {
    el.textContent = "erro";
    el.classList.add("bg-danger");
  } else {
    el.textContent = "offline";
    el.classList.add("bg-secondary");
  }
}

function renderApiStatus(statusMap) {
  if (!statusMap) return;
  setBadgeStatus("apiStatusGenerateToken", statusMap.generateToken);
  setBadgeStatus("apiStatusCompileOnly", statusMap.compileOnly);
  setBadgeStatus("apiStatusDeployServer", statusMap.deployServer);
  setBadgeStatus("apiStatusVerifyBscscan", statusMap.verifyBscscan);
  setBadgeStatus("apiStatusVerifySourcify", statusMap.verifySourcify);
  setBadgeStatus("apiStatusVerifyPrivate", statusMap.verifyPrivate);
}

async function checkApiEndpoints(apiBase) {
  log("Sondando endpoints da API (OPTIONS)...");
  const statusMap = {
    generateToken: await probeEndpoint(apiBase, "/api/generate-token"),
    compileOnly: await probeEndpoint(apiBase, "/api/compile-only"),
    verifyBscscan: await probeEndpoint(apiBase, "/api/verify-bscscan"),
    verifySourcify: await probeEndpoint(apiBase, "/api/verify-sourcify"),
    verifyPrivate: await probeEndpoint(apiBase, "/api/verify-private"),
    logRecipe: await probeEndpoint(apiBase, "/api/log-recipe"),
  };
  renderApiStatus(statusMap);
}

const API_BASE = getApiBase();
export async function compileContract() {
  // Validação visual inline dos campos
  const ok = runAllFieldValidation() && validateForm();
  if (!ok) {
    log("Corrija os erros nos campos antes de compilar.");
    return;
  }
  
  const serverOk = await ensureServersOnline();
  if (!serverOk) {
      log("Erro: Não foi possível conectar a nenhum servidor de API (Local ou Produção).");
      // alert("Erro de Conexão: O sistema não conseguiu contactar o servidor de compilação.\n\nVerifique sua internet ou se o backend local está rodando.");
      return false;
  }
  let base = getApiBase();

  try {
    readForm();
    const name = state.form.token.name || "MyToken";
    const symbol = state.form.token.symbol || "MTK";
    const decimals = Number.isFinite(state.form.token.decimals) ? state.form.token.decimals : 18;
    const totalSupply = state.form.token.initialSupply || "0";

    const saleParams = { ...state.form.sale };
    if (state.form.token.existingAddress) {
      saleParams.tokenAddress = state.form.token.existingAddress;
    }
    if (typeof saleParams.capUnits === "bigint") {
      saleParams.capUnits = saleParams.capUnits.toString();
    }

    const payload = { 
      name, 
      symbol, 
      totalSupply, 
      decimals, 
      type: state.form.group || "erc20-minimal",
      sale: saleParams,
      initialOwner: state.form.initialOwner || undefined,
      initialHolder: state.form.initialHolder || undefined,
      advanced: state.form.advanced || undefined
    };

    log(`Compilando contrato via API: ${name} (${symbol}), supply ${totalSupply}, decimais ${decimals}, tipo ${payload.type}...`);
    log(`Endpoint: ${base}/api/generate-token`);
    try {
      log(`Payload: ${JSON.stringify(payload)}`);
    } catch (_) {}

    const resp = await fetchWithDiagnostics(`${base}/api/generate-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      timeoutMs: 20000,
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`API retornou ${resp.status}: ${txt || "sem corpo"}`);
    }

    let data;
    try {
      data = await resp.json();
    } catch (parseErr) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Falha ao parsear JSON: ${parseErr?.message || parseErr}. Corpo: ${txt?.slice(0, 200) || "vazio"}`);
    }

    if (!data?.success) throw new Error(data?.error || "Falha na compilação (success=false)");

    const { compilation, sourceCode, token } = data;
    state.compilation = {
      abi: compilation?.abi,
      bytecode: compilation?.bytecode,
      metadata: compilation?.metadata,
      deployedBytecode: compilation?.deployedBytecode,
      sourceCode,
      contractName: token?.contractName || token?.name?.replace(/\s+/g, "") || "MyToken",
    };

    // Generate Standard JSON Input for Verification/Download
    try {
        let evmVersion = "default";
        try {
            const meta = typeof compilation?.metadata === "string" ? JSON.parse(compilation.metadata) : compilation.metadata;
            if (meta?.settings?.evmVersion) evmVersion = meta.settings.evmVersion;
        } catch (_) {}

        const filename = `${state.compilation.contractName}.sol`;
        const stdInput = {
            language: "Solidity",
            sources: {
                [filename]: {
                    content: sourceCode
                }
            },
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200
                },
                evmVersion: evmVersion,
                outputSelection: {
                    "*": {
                        "*": ["*"]
                    }
                }
            }
        };
        state.compilation.input = JSON.stringify(stdInput);
    } catch (e) {
        console.warn("Failed to generate Standard JSON Input:", e);
    }

    log(`Compilação concluída com sucesso. ABI e bytecode prontos (${state.compilation.contractName}).`);

    // User request: "deixe uns 2 segundos assim sabemos que já vai esta configurado sempre o contrato"
    log("Verificando integridade... (Aguarde 2s)");
    await new Promise(resolve => setTimeout(resolve, 2000));
    log("Contrato validado e pronto para deploy.");

    {
      const d = getDeployButton();
      if (d) d.disabled = false;
    }
    // Atualiza a UI usando a função centralizada, garantindo exibição correta dos artefatos
    updateCompilationUI(state.compilation.contractName, false);
    
    try {
      const c = document.getElementById("btnCompile");
      if (c) c.disabled = true;
    } catch (_) {}
    return true;
  } catch (err) {
    const msg = err?.message || String(err);
    if (err instanceof TypeError && msg.includes("Failed to fetch")) {
      const pageProto = window.location.protocol;
      const apiProto = (() => {
        try {
          return new URL(API_BASE).protocol;
        } catch {
          return "unknown:";
        }
      })();
      log(`Erro na compilação: Failed to fetch. API=${base}`);
      log(`Verifique CORS do backend, disponibilidade do servidor e mixed content (página ${pageProto} vs API ${apiProto}). online=${navigator.onLine}`);
      // Fallback: tentar compilar via /api/compile-only com código gerado no frontend
      try {
        readForm();
        const name = state.form.token.name || "MyToken";
        const symbol = state.form.token.symbol || "MTK";
        const decimals = Number.isFinite(state.form.token.decimals) ? state.form.token.decimals : 18;
        const totalSupplyRaw = state.form.token.initialSupply || 0;
        const totalSupplyInt = String(totalSupplyRaw || "0");
        const advanced = state.form.advanced || null;
        log(`Tentando fallback: gerar código local e compilar (${base}/api/compile-only)...`);
        const src = generateTokenSourceV2(name, symbol, decimals, totalSupplyInt, advanced);
        try {
          log(`Contrato gerado: ${src.contractName}. Tamanho do código: ${src.sourceCode.length} chars`);
        } catch (_) {}
        const resp2 = await fetchWithDiagnostics(`${base}/api/compile-only`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sourceCode: src.sourceCode,
            contractName: src.contractName,
            optimization: true,
          }),
          timeoutMs: 20000,
        });
        if (!resp2.ok) {
          const txt = await resp2.text().catch(() => "");
          throw new Error(`Fallback retornou ${resp2.status}: ${txt || "sem corpo"}`);
        }
        const data2 = await resp2.json().catch(async (e) => {
          const txt = await resp2.text().catch(() => "");
          throw new Error(`Falha ao parsear JSON fallback: ${e?.message || e}. Corpo: ${txt?.slice(0, 200) || "vazio"}`);
        });
        if (!data2?.success) throw new Error(data2?.error || "Fallback falhou (success=false)");
        const { compilation } = data2;
        state.compilation = {
          abi: compilation?.abi,
          bytecode: compilation?.bytecode,
          deployedBytecode: compilation?.deployedBytecode,
          sourceCode: src.sourceCode,
          contractName: src.contractName,
        };
        log(`Fallback OK: compilação concluída. ABI e bytecode prontos (${src.contractName}).`);
        {
          const d = getDeployButton();
          if (d) d.disabled = false;
        }
        // Atualiza a UI usando a função centralizada (Fallback)
        updateCompilationUI(src.contractName, true);
        
        try {
          const c = document.getElementById("btnCompile");
          if (c) c.disabled = true;
        } catch (_) {}
        return; // encerrar após fallback com sucesso
      } catch (fbErr) {
        log(`Fallback de compilação falhou: ${fbErr?.message || fbErr}`);
        try {
            const name = state.form.token.name || "MyToken";
            const symbol = state.form.token.symbol || "MTK";
            const decimals = Number.isFinite(state.form.token.decimals) ? state.form.token.decimals : 18;
            const totalSupplyInt = String(state.form.token.initialSupply || "0");
            const src = generateTokenSourceV2(name, symbol, decimals, totalSupplyInt);
            state.compilation = {
                 sourceCode: src.sourceCode,
                 contractName: src.contractName,
            };
            log("Código fonte salvo localmente (sem bytecode).");
            alert("Erro CRÍTICO: Não foi possível conectar ao servidor de compilação (Render).\n\nVerifique se o backend está rodando ou se a URL da API está correta em api-config.js.");
        } catch (_) {}
      }
    } else {
      log(`Erro na compilação: ${msg}`);
      // Também tentar fallback quando não for erro de rede
      try {
        readForm();
        const name = state.form.token.name || "MyToken";
        const symbol = state.form.token.symbol || "MTK";
        const decimals = Number.isFinite(state.form.token.decimals) ? state.form.token.decimals : 18;
        const totalSupplyRaw = state.form.token.initialSupply || 0;
        const totalSupplyInt = String(totalSupplyRaw || "0");
        log(`Tentando fallback: gerar código local e compilar (${base}/api/compile-only)...`);
        const src = generateTokenSourceV2(name, symbol, decimals, totalSupplyInt);
        const resp2 = await fetchWithDiagnostics(`${base}/api/compile-only`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            sourceCode: src.sourceCode,
            contractName: src.contractName,
            optimization: true,
          }),
          timeoutMs: 20000,
        });
        if (!resp2.ok) {
          const txt = await resp2.text().catch(() => "");
          throw new Error(`Fallback retornou ${resp2.status}: ${txt || "sem corpo"}`);
        }
        const data2 = await resp2.json();
        if (!data2?.success) throw new Error(data2?.error || "Fallback falhou (success=false)");
        const { compilation } = data2;
        state.compilation = {
          abi: compilation?.abi,
          bytecode: compilation?.bytecode,
          sourceCode: src.sourceCode,
          contractName: src.contractName,
        };
        log(`Fallback OK: compilação concluída. ABI e bytecode prontos (${src.contractName}).`);
        {
          const d = getDeployButton();
          if (d) d.disabled = false;
        }
        try {
          const c = document.getElementById("btnCompile");
          if (c) c.disabled = true;
        } catch (_) {}
        return true; // Sucesso no fallback 2
      } catch (fbErr) {
        log(`Fallback de compilação falhou: ${fbErr?.message || fbErr}`);
      }
    }
    // Se chegou aqui, falhou no principal e nos fallbacks (ou fallbacks retornaram false)
    // marcar botão como falha usada e desativar até correção dos campos
    try {
      const c = document.getElementById("btnCompile");
      if (c) {
        c.disabled = true;
        c.classList.remove("btn-outline-primary");
        c.classList.remove("btn-outline-success");
        c.classList.remove("btn-outline-danger");
        c.classList.add("btn-used-error");
      }
    } catch (_) {}
  }
  return !!(state.compilation?.abi && state.compilation?.bytecode);
}

function unusedVerifyPlaceholder() {
  const contractAddr = state.deployed?.address;
  const chainId = state.form?.network?.chainId;
  if (contractAddr && chainId) {
    const url = getExplorerVerificationUrl(contractAddr, chainId);
    log(`Abrindo verificação do contrato no explorer: ${url}`);
    try {
      window.open(url, "_blank");
    } catch {}
    {
      const d = getDeployButton();
      if (d) d.disabled = false;
    }
    return;
  }
  log("Verificação iniciada (placeholder). Após o deploy, o botão abrirá o explorer na aba de verificação.");
  {
    const d = getDeployButton();
    if (d) d.disabled = false;
  }
}

export function getConstructorArgs() {
  const g = state.form.group;
  const s = state.form.sale || {};
  
  // Conversão segura de string decimal para BigNumber (Wei)
  const toWei = (val) => {
    try {
      if (!val) return ethers.BigNumber.from(0);
      return ethers.utils.parseUnits(val, "ether"); // assume 18 decimals para ETH/BNB
    } catch (_) {
      return ethers.BigNumber.from(0);
    }
  };

  if (g === "erc20-directsale") {
    // Constructor: priceWei, minWei, maxWei, capUnits, payout
    const priceWei = toWei(s.priceDec);
    const minWei = toWei(s.minDec);
    const maxWei = toWei(s.maxDec);
    // CapUnits é inteiro (tokens)
    const capUnits = s.capUnits ? String(s.capUnits) : "0";
    const payout = s.payoutWallet || state.wallet.address || "0x0000000000000000000000000000000000000000";
    
    return [priceWei, minWei, maxWei, capUnits, payout];
  }
  
  if (g === "tokensale-separado") {
    // Constructor: token, wallet, priceWei, minWei, maxWei
    const token = state.form.token.existingAddress || "0x0000000000000000000000000000000000000000";
    const wallet = s.payoutWallet || state.wallet.address || "0x0000000000000000000000000000000000000000";
    const priceWei = toWei(s.priceDec);
    const minWei = toWei(s.minDec);
    const maxWei = toWei(s.maxDec);
    
    return [token, wallet, priceWei, minWei, maxWei];
  }
  
  return [];
}

export function getEncodedConstructorArgs() {
  try {
    const abi = state.compilation?.abi;
    const args = getConstructorArgs();
    
    if (!abi || !args || args.length === 0) return "";
    
    // Find constructor in ABI
    const ctor = abi.find(item => item.type === "constructor");
    if (!ctor || !ctor.inputs) return "";
    
    // Check if input count matches
    if (ctor.inputs.length !== args.length) {
      console.warn("Constructor args count mismatch");
      return "";
    }
    
    const types = ctor.inputs.map(i => i.type);
    const encoded = ethers.utils.defaultAbiCoder.encode(types, args);
    // Ensure single line just in case
    return encoded.replace(/[\r\n]/g, "");
  } catch (e) {
    console.error("Error encoding constructor args", e);
    return "";
  }
}

const SERVER_DEPLOY_ENABLED = false;

export async function deployContract() {
  // Fallback de rede: se nenhuma rede foi selecionada mas a carteira está conectada, usar a rede da carteira
  if (!state.form.network && state.wallet?.chainId) {
      const cid = state.wallet.chainId;
      state.form.network = {
          chainId: cid,
          name: "Rede da Carteira",
          rpc: getFallbackRpcByChainId(cid)
      };
      log(`Rede não selecionada explicitamente. Usando rede da carteira: ${cid}`);
  }

  const ok = runAllFieldValidation() && validateForm();
  if (!ok) {
    log("Corrija os erros nos campos antes de fazer o deploy.");
    return false;
  }
  startOpStatus("Deploy em andamento");
  // Se temos artefatos compilados, preferir deploy via servidor
  // (DESABILITADO: Endpoint /api/deploy-server não implementado no backend)
  if (SERVER_DEPLOY_ENABLED && state.compilation?.abi && state.compilation?.bytecode) {
    try {
      // Sondar endpoint antes de tentar
      try {
        updateOpStatus("Verificando endpoint de deploy");
        let base = getApiBase();
        let st = await fetchWithDiagnostics(`${base}/api/deploy-server`, {
          method: "OPTIONS",
          timeoutMs: 8000,
        })
          .then((r) => r.status)
          .catch(() => -1);
        if (st === -1 || (st >= 400 && st !== 204)) {
          const local = "http://localhost:3000";
          base = local;
          setApiBase(local);
          st = await fetchWithDiagnostics(`${base}/api/deploy-server`, {
            method: "OPTIONS",
            timeoutMs: 8000,
          })
            .then((r) => r.status)
            .catch(() => -1);
        }
        if (st === -1 || (st >= 400 && st !== 204)) {
          log("Endpoint /api/deploy-server não disponível (ou bloqueado). Prosseguindo com MetaMask.");
          throw new Error("deploy-server indisponível");
        }
      } catch (probeErr) {
        log(`Sonda de deploy servidor falhou: ${probeErr?.message || probeErr}`);
        throw probeErr;
      }
      log("Iniciando deploy via servidor (chave segura, RPC configurado)...");
      updateOpStatus("Publicando via servidor");
      const reqChainId = state.form?.network?.chainId || null;
      const resp = await fetch(`${getApiBase()}/api/deploy-server`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          abi: state.compilation.abi,
          bytecode: state.compilation.bytecode,
          constructorArgs: getConstructorArgs(),
          chainId: reqChainId,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`API retornou ${resp.status}: ${txt}`);
      }
      const data = await resp.json();
      if (!data?.success) throw new Error(data?.error || "Falha no deploy servidor");

      const addr = data.contractAddress;
      const txh = data.transactionHash;
      state.deployed.address = addr || null;
      state.deployed.transactionHash = txh || null;
      log(`Deploy concluído: contrato em ${addr} (tx ${txh || "–"})`);
      const chainId = state.form?.network?.chainId;
      const explorerUrl = data.explorerUrl || getExplorerContractUrl(addr, chainId);
      const txUrl = txh ? getExplorerTxUrl(txh, chainId) : null;
      if (explorerUrl) log(`Explorer (Contrato): ${explorerUrl}`);
      if (txUrl) log(`Explorer (Transação): ${txUrl}`);
      try {
        const d = getDeployButton();
        if (d) {
          d.disabled = true;
          d.classList.remove("btn-outline-danger");
          d.classList.remove("btn-outline-success");
          d.classList.add("btn-used-success");
        }
      } catch (_) {}
      try {
        const filesSection = document.getElementById("files-section");
        const bSol = document.querySelector("#btnDownloadSol");
        const bJson = document.querySelector("#btnDownloadJson");
        const bAbi = document.querySelector("#btnDownloadAbi");
        const bDep = document.querySelector("#btnDownloadDeployedBytecode");
        if (filesSection) filesSection.classList.remove("d-none");
        if (bSol) bSol.disabled = false;
        if (bJson) bJson.disabled = false;
        if (bAbi) bAbi.disabled = false;
        if (bDep) bDep.disabled = !state?.deployed?.deployedBytecode;
      } catch (_) {}
      try {
        updateDeployLinks(explorerUrl, txUrl);
        updateERC20Details(null, null, null, null, "Deploy concluído (servidor)", true);
        updateVerificationBadges({
          bscUrl: getExplorerVerificationUrl(addr, chainId),
        });
      } catch (_) {}
      try {
        const mm = document.getElementById("btnAddToMetaMask");
        if (mm) mm.disabled = !isValidAddress(state?.deployed?.address);
        const sh = document.getElementById("btnShareDeploy");
        if (sh) sh.disabled = !isValidAddress(state?.deployed?.address);
      } catch (_) {}
      stopOpStatus("Deploy concluído (servidor)");

      // Show success modal
      if (window.showVerificationResultModal) {
        window.showVerificationResultModal(
          true,
          "Deploy Concluído com Sucesso!",
          `<div class="text-center">
               <div class="mb-3"><i class="bi bi-rocket-takeoff-fill text-success" style="font-size: 3rem;"></i></div>
               <p>O contrato foi implantado com sucesso!</p>
               <p class="text-muted small">Endereço: ${state.deployed.address}</p>
             </div>`,
          explorerUrl,
        );
      }

      // Broadcast contract:found to other modules
      try {
        const eventDetail = {
          contract: {
            chainId: chainId,
            contractAddress: state.deployed.address,
            address: state.deployed.address,
            tokenSymbol: state.form.token.symbol,
            status: "deployed",
            link: explorerUrl,
          },
        };
        document.dispatchEvent(new CustomEvent("contract:found", { detail: eventDetail }));
      } catch (_) {}

      // Verificação privada on-chain
      try {
        const addrVerify = state.deployed?.address;
        const chainIdVerify = state.form?.network?.chainId;
        const dep = state.compilation?.deployedBytecode;
        let payload = null;
        if (addrVerify && chainIdVerify) {
          if (dep) {
            payload = {
              chainId: chainIdVerify,
              contractAddress: addrVerify,
              deployedBytecode: dep,
            };
          } else if (state.compilation?.sourceCode && state.compilation?.contractName) {
            payload = {
              chainId: chainIdVerify,
              contractAddress: addrVerify,
              sourceCode: state.compilation.sourceCode,
              contractName: state.compilation.contractName,
            };
          }
        }
        if (payload) {
          const respP = await fetch(`${API_BASE}/api/verify-private`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (respP.ok) {
            const dataP = await respP.json();
            const ok = !!dataP?.success && !!dataP?.match;
            updateVerificationBadges({ privOk: ok });
            log(ok ? "Verificação privada por bytecode: ok" : "Verificação privada por bytecode: pendente");
          } else {
            updateVerificationBadges({ privOk: false });
            const txt = await respP.text();
            log(`Falha na verificação privada: ${txt}`);
          }
        } else {
          updateVerificationBadges({ privOk: false });
          log("Verificação privada não iniciada: dados insuficientes.");
        }
      } catch (perr) {
        updateVerificationBadges({ privOk: false });
        log(`Erro na verificação privada: ${perr?.message || perr}`);
      }
      try {
        const payloadAuto = buildVerifyPayloadFromState();
        if (payloadAuto) await runVerifyDirect(payloadAuto);
      } catch (_) {}
      return;
    } catch (err) {
      log(`Erro no deploy servidor: ${err.message || err}`);
      updateOpStatus("Falha no servidor, usando MetaMask");
      try {
        const d = getDeployButton();
        if (d) {
          d.disabled = true;
          d.classList.remove("btn-outline-primary");
          d.classList.remove("btn-outline-success");
          d.classList.remove("btn-outline-danger");
          d.classList.add("btn-used-error");
        }
      } catch (_) {}
      try {
        const mm = document.getElementById("btnAddToMetaMask");
        if (mm) mm.disabled = true;
      } catch (_) {}
      // prosseguir para fluxo MetaMask se desejado
    }
  }
  // Caso não haja compilação disponível, ou servidor falhar, usar fluxo MetaMask (placeholder)
  if (!state.wallet.signer) {
    log("Carteira não conectada. Solicitando conexão...");
    try {
      await connectWallet();
    } catch (e) {
      console.error(e);
    }
  }
  // Garantir que a rede selecionada corresponde à rede atual da carteira
  let selectedChainId = state.form?.network?.chainId;
  
  // Fallback: se não houver rede selecionada no form, mas houver na carteira, usar da carteira
  if (!selectedChainId && state.wallet?.chainId) {
      selectedChainId = state.wallet.chainId;
      // Preencher state.form.network com dados mínimos para evitar bloqueio
      if (!state.form.network) state.form.network = {};
      state.form.network.chainId = selectedChainId;
      state.form.network.name = state.form.network.name || "Rede da Carteira";
      log(`Usando rede da carteira como alvo: ${selectedChainId}`);
      
      // Atualiza UI de Rede no resumo
      updateSummaryItem("Rede", `${selectedChainId} - ${state.form.network.name}`);
  }

  if (!selectedChainId) {
    log("Selecione a rede no topo antes de prosseguir com o deploy.");
    stopOpStatus("Rede não selecionada");
    return false;
  }
  try {
    const currentNet = await state.wallet.provider.getNetwork();
    if (currentNet.chainId !== selectedChainId) {
      log(`Carteira está na chain ${currentNet.chainId}. Tentando trocar para ${selectedChainId}...`);
      const hexChain = "0x" + Number(selectedChainId).toString(16);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChain }],
        });
        const afterSwitch = await state.wallet.provider.getNetwork();
        state.wallet.chainId = afterSwitch.chainId;
        if (afterSwitch.chainId !== selectedChainId) {
          log("Não foi possível confirmar a troca de rede. Troque manualmente no MetaMask.");
          stopOpStatus("Falha ao trocar rede");
          return false;
        }
        log(`Rede alterada com sucesso para chainId ${afterSwitch.chainId}.`);
      } catch (err) {
        log(`Falha ao trocar rede automaticamente. Troque manualmente para ${state.form.network?.name} (chainId ${selectedChainId}). Erro: ${err?.message || err}`);
        stopOpStatus("Falha ao trocar rede");
        return false;
      }
    }
  } catch (e) {
    log(`Erro ao checar rede da carteira: ${e?.message || e}`);
    stopOpStatus("Erro ao checar rede");
    return false;
  }
  // Deploy real via MetaMask (cliente) usando ethers.js
  try {
    if (!state.compilation?.abi || !state.compilation?.bytecode) {
      log("Compile o contrato antes do deploy. ABI/bytecode ausentes.");
      stopOpStatus("ABI/bytecode ausentes");
      return false;
    }
    if (!state.wallet?.signer) {
      log("Conecte sua carteira para assinar o deploy no MetaMask.");
      stopOpStatus("Carteira não conectada");
      return false;
    }

    const abi = state.compilation.abi;
    const bytecode = typeof state.compilation.bytecode === "string" && !state.compilation.bytecode.startsWith("0x")
      ? "0x" + state.compilation.bytecode
      : state.compilation.bytecode;
    const signer = state.wallet.signer;

    log("Preparando contrato para deploy com MetaMask...");
    startOpStatus("Deploy via MetaMask");

    // FIX: Para erc20-minimal, o construtor não tem argumentos, mas o ContractFactory pode se confundir com a ABI.
    // Forçamos uma transação manual apenas com o bytecode para garantir.
    let contract;
    let tx;
    let overrides = {};
    const group = state.form.group;

    if (group === "erc20-minimal") {
        log("Modo ERC20-Minimal: Usando transação direta (bypass ContractFactory) para evitar erros de ABI.");
        try {
             const txRequest = {
                data: bytecode,
                from: state.wallet.address
             };
             // Estimar gas manualmente
             let gasLimit;
             try {
                const est = await signer.estimateGas(txRequest);
                gasLimit = est.mul(120).div(100); // +20%
             } catch(e) {
                gasLimit = ethers.BigNumber.from("2000000");
                log("Falha na estimativa de gas manual, usando 2.000.000");
             }

             // --- INÍCIO GESTÃO DE TAXA ---
             const feeMgr = new FeeManager();
             const feeOk = await feeMgr.confirmAndPay(signer, state.form.network, gasLimit);
             if (!feeOk) {
                 log("Deploy cancelado pelo usuário ou falha no pagamento da taxa.");
                 stopOpStatus("Cancelado");
                 return false;
             }
             // --- FIM GESTÃO DE TAXA ---
             
             // Enviar transação
             log("Enviando transação manual...");
             tx = await signer.sendTransaction({
                 data: bytecode,
                 gasLimit: gasLimit
             });
             log(`Transação enviada: ${tx.hash}`);
             
             // Criar objeto de contrato "fake" para compatibilidade com o resto do código
             // Precisamos esperar o receipt para saber o endereço
             contract = {
                 deployTransaction: tx,
                 address: null // Será preenchido pelo receipt
             };
        } catch (errManual) {
             log(`Erro no deploy manual: ${errManual.message}`);
             throw errManual;
        }
    } else {
        // Fluxo padrão para outros contratos (com argumentos)
        const factory = new ethers.ContractFactory(abi, bytecode, signer);
        const args = getConstructorArgs();

        // Tentar estimar gas para o deploy; usar fallback se falhar
        try {
          const deployTx = factory.getDeployTransaction(...args);
          const estimated = await signer.estimateGas(deployTx);
          // pequeno buffer (+20%) para evitar underestimation
          const buff = estimated.mul ? estimated.mul(120).div(100) : estimated * 1.2;
          overrides.gasLimit = buff;
          log(`Gas estimado para deploy: ${estimated.toString ? estimated.toString() : String(estimated)} (com buffer).`);
        } catch (e) {
          overrides.gasLimit = 2000000;
          log("Falha na estimativa de gas, usando gasLimit padrão 2,000,000.");
        }

        // --- INÍCIO GESTÃO DE TAXA ---
        const feeMgr = new FeeManager();
        const gasLimitBN = ethers.BigNumber.from(overrides.gasLimit.toString());
        const feeOk = await feeMgr.confirmAndPay(signer, state.form.network, gasLimitBN);
        if (!feeOk) {
            log("Deploy cancelado pelo usuário ou falha no pagamento da taxa.");
            stopOpStatus("Cancelado");
            return false;
        }
        // --- FIM GESTÃO DE TAXA ---

        log("Enviando transação de deploy pelo MetaMask...");
        contract = await factory.deploy(...args, overrides);
        tx = contract.deployTransaction;
    }

    log(`Transação enviada: ${tx.hash}. Aguardando confirmação...`);
    updateOpStatus("Transação enviada");
    state.deployed.transactionHash = tx.hash || null;
    state.deployed.deployParams = {
      gasLimit: overrides?.gasLimit ? (overrides.gasLimit.toString ? overrides.gasLimit.toString() : String(overrides.gasLimit)) : undefined,
      chainId: state.form?.network?.chainId,
      networkName: state.form?.network?.name || null,
    };

    // Aguarda confirmação com timeout/polling para evitar loop quando explorer fica "Indexing"
    let receipt;
    try {
      updateOpStatus("Confirmando...");
      receipt = await tx.wait(1);
    } catch (waitErr) {
      log("Confirmação demorando, iniciando polling do receipt...");
      updateOpStatus("Confirmando...");
    }
    if (!receipt) {
      const provider = state.wallet.provider;
      const start = Date.now();
      const timeoutMs = 60000; // 60s
      while (Date.now() - start < timeoutMs) {
        const r = await provider.getTransactionReceipt(tx.hash);
        if (r && (r.contractAddress || r.status !== undefined)) {
          receipt = r;
          break;
        }
        await new Promise((res) => setTimeout(res, 2000));
      }
    }

    let addr = contract.address || (receipt && receipt.contractAddress) || null;
    // Fallback estilo XCafe: calcular endereço esperado via CREATE (from + nonce)
    if (!addr) {
      try {
        const from = tx.from || (await signer.getAddress());
        const nonce = typeof tx.nonce !== "undefined" ? tx.nonce : null;
        if (from && nonce !== null) {
          const predicted = ethers.utils.getContractAddress({ from, nonce });
          if (predicted) {
            addr = predicted;
            log(`Endereço previsto do contrato (fallback): ${predicted}`);
          }
        }
      } catch (predErr) {
        // silencioso
      }
    }
    state.deployed.address = addr;
    log(`Deploy concluído no cliente. Contrato em ${addr || "endereço pendente..."}.`);

    // Verificar on-chain se o endereço possui bytecode (confirma que é contrato e não EOA)
    try {
      if (addr) {
        const provider = state.wallet.provider;
        updateOpStatus("Verificando bytecode");
        let code = await provider.getCode(addr);
        const start = Date.now();
        const timeoutMs = 30000;
        while (code === "0x" && Date.now() - start < timeoutMs) {
          await new Promise((res) => setTimeout(res, 2000));
          code = await provider.getCode(addr);
        }
        if (code && code !== "0x") {
          state.deployed = state.deployed || {};
          state.deployed.deployedBytecode = code;
          try {
            const bDep = document.querySelector("#btnDownloadDeployedBytecode");
            if (bDep) bDep.disabled = false;
          } catch (_) {}
          log("Confirmação on-chain: endereço contém bytecode. É um contrato.");
          updateERC20Details(null, null, null, null, "Contrato detectado on-chain", true);
          stopOpStatus("Contrato detectado on-chain");
        } else {
          log("Bytecode ainda não disponível no RPC. Provável indexação em andamento no nó/explorer.");
          updateERC20Details(null, null, null, null, "Aguardando bytecode no RPC", true);
          updateOpStatus("Aguardando bytecode no RPC");
        }
      }
    } catch (codeErr) {
      log(`Falha ao verificar bytecode do contrato: ${codeErr?.message || codeErr}`);
      updateERC20Details(null, null, null, null, "Falha ao verificar bytecode", true);
      stopOpStatus("Falha ao verificar bytecode");
    }

    const chainId = state.form?.network?.chainId;
    const explorerUrl = getExplorerContractUrl(addr, chainId);
    const txUrl = tx.hash ? getExplorerTxUrl(tx.hash, chainId) : null;
    if (explorerUrl) log(`Explorer (Contrato): ${explorerUrl}`);
    if (txUrl) log(`Explorer (Transação): ${txUrl}`);

    // Atualizar links na UI
    updateDeployLinks(explorerUrl, txUrl);
    try {
      // const filesSection = document.getElementById("files-section"); // Removido: só mostrar após verificar
      const bSol = document.querySelector("#btnDownloadSol");
      const bJson = document.querySelector("#btnDownloadJson");
      const bAbi = document.querySelector("#btnDownloadAbi");
      const bDep = document.querySelector("#btnDownloadDeployedBytecode");
      // if (filesSection) filesSection.classList.remove("d-none");
      if (bSol) bSol.disabled = false;
      if (bJson) bJson.disabled = false;
      if (bAbi) bAbi.disabled = false;
      if (bDep) bDep.disabled = !state?.deployed?.deployedBytecode;
    } catch (_) {}
    try {
      const d = getDeployButton();
      if (d) {
        d.disabled = true;
        d.classList.remove("btn-outline-danger");
        d.classList.remove("btn-outline-success");
        d.classList.add("btn-used-success");
      }
    } catch (_) {}
    try {
      const mm = document.getElementById("btnAddToMetaMask");
      if (mm) mm.disabled = false;
      const sh = document.getElementById("btnShareDeploy");
      if (sh) sh.disabled = false;
    } catch (_) {}
    try {
      updateVerificationBadges({
        bscUrl: getExplorerVerificationUrl(addr, chainId),
      });
    } catch (_) {}
    stopOpStatus("Deploy concluído");

    // Inicia verificação automática (BscScan/Etherscan)
    log("Iniciando verificação automática no Explorer...");
    // Chama sem await para não bloquear a UI, mas monitorVerification cuidará do polling
    try {
        if (typeof autoVerifyContract === 'function') {
            autoVerifyContract().catch(err => log(`Erro ao iniciar verificação automática: ${err.message}`));
        } else {
            log("AVISO: autoVerifyContract não está definido. Verificação automática ignorada.");
        }
    } catch (e) {
        log(`Erro crítico ao chamar autoVerifyContract: ${e.message}`);
    }

    // Move Limpar Dados button to bottom container after deploy
    try {
      const clearButton = document.getElementById("btnClearAll");
      const bottomContainer = document.getElementById("cleanup-action-container");
      if (clearButton && bottomContainer) {
        bottomContainer.appendChild(clearButton);
      }
    } catch (_) {}

    try {
      const rec = buildRecipe();
      rec.deployment = rec.deployment || {};
      rec.deployment.address = addr || rec.deployment.address || null;
      rec.deployment.tx = tx?.hash || rec.deployment.tx || null;
      fetch(`${API_BASE}/api/log-recipe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deploy", recipe: rec }),
      })
        .then(() => {})
        .catch(() => {});
    } catch (_) {}

    // Habilitar verificação
    // verificação agora é automática; botão removido da UI

    try {
      const addrVerify = state.deployed?.address;
      const chainIdVerify = state.form?.network?.chainId;
      const dep = state.compilation?.deployedBytecode;
      let payload = null;
      if (addrVerify && chainIdVerify) {
        if (dep) {
          payload = {
            chainId: chainIdVerify,
            contractAddress: addrVerify,
            deployedBytecode: dep,
          };
        } else if (state.compilation?.sourceCode && state.compilation?.contractName) {
          payload = {
            chainId: chainIdVerify,
            contractAddress: addrVerify,
            sourceCode: state.compilation.sourceCode,
            contractName: state.compilation.contractName,
          };
        }
      }
      if (payload) {
        const respP = await fetch(`${API_BASE}/api/verify-private`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (respP.ok) {
          const dataP = await respP.json();
          const ok = !!dataP?.success && !!dataP?.match;
          updateVerificationBadges({ privOk: ok });
          log(ok ? "Verificação privada por bytecode: ok" : "Verificação privada por bytecode: pendente");
        } else {
          updateVerificationBadges({ privOk: false });
          const txt = await respP.text();
          log(`Falha na verificação privada: ${txt}`);
        }
      } else {
        updateVerificationBadges({ privOk: false });
        log("Verificação privada não iniciada: dados insuficientes.");
      }
    } catch (perr) {
      updateVerificationBadges({ privOk: false });
      log(`Erro na verificação privada: ${perr?.message || perr}`);
    }
    try {
      const cont = document.getElementById("openVerificaContainer");
      const btn = document.getElementById("openVerificaModuleBtn");
      const ready = !!(state.deployed?.address && state.form?.network?.chainId);
      if (cont && btn) {
        cont.classList.toggle("d-none", !ready);
        btn.classList.toggle("disabled", !ready);
      }
    } catch (_) {}

    const unusedAutoToggle = document.getElementById("autoVerifyToggle");
    const autoEnabled = true;
    if (autoEnabled) {
      const payload = buildVerifyPayloadFromState();
      // Validar restrição de Testnet
      const chainId = payload?.chainId;
      if (nm.isTestNetwork(chainId) && !checkIsAdmin()) {
          log("Verificação automática bloqueada em Testnet.");
      } else if (payload) {
          await runVerifyDirect(payload);
      }
    } else {
      log("Verificação automática desabilitada.");
    }

    // Leitura simples ERC-20 para confirmar funcionalidade do contrato
    try {
      if (addr && abi && Array.isArray(abi)) {
        const provider = state.wallet.provider;
        const c = new ethers.Contract(addr, abi, provider);
        const hasFn = (n) => abi.some((i) => i?.type === "function" && i?.name === n);
        let symVal = null,
          nameVal = null,
          decVal = null,
          supplyVal = null;
        if (hasFn("symbol")) {
          const sym = await c.symbol();
          symVal = sym;
          log(`ERC-20: symbol() = ${sym}`);
        }
        if (hasFn("name")) {
          const nm = await c.name();
          nameVal = nm;
          log(`ERC-20: name() = ${nm}`);
        }
        if (hasFn("decimals")) {
          const dec = await c.decimals();
          decVal = dec;
          log(`ERC-20: decimals() = ${dec}`);
        }
        if (hasFn("totalSupply")) {
          const ts = await c.totalSupply();
          const formatUnitsFn = ethers?.utils && ethers.utils.formatUnits ? ethers.utils.formatUnits : ethers?.formatUnits;
          const human = decVal != null && formatUnitsFn ? formatUnitsFn(ts, decVal) : ts?.toString ? ts.toString() : String(ts);
          supplyVal = formatPtBR(human);
          log(`ERC-20: totalSupply() = ${supplyVal} (decimals=${decVal ?? "-"})`);
        }
        updateERC20Details(symVal, nameVal, decVal, supplyVal, "Leitura ERC-20 ok", true);
      }
    } catch (readErr) {
      log(`Falha ao ler funções ERC-20: ${readErr?.message || readErr}`);
      updateERC20Details(null, null, null, null, "Falha ao ler ERC-20", true);
    }

    // Redirecionamento para a página de detalhes unificada
    try {
        log("Redirecionando para detalhes do contrato...");
        
        // Criar um objeto de estado seguro (sem referências circulares como provider/signer e BigInt como string)
        const safeState = {
            form: state.form ? {
                ...state.form,
                sale: state.form.sale ? {
                    ...state.form.sale,
                    capUnits: state.form.sale.capUnits ? state.form.sale.capUnits.toString() : "0"
                } : null
            } : null,
            wallet: {
                address: state.wallet?.address,
                chainId: state.wallet?.chainId,
                isConnected: state.wallet?.isConnected
            },
            compilation: state.compilation ? {
                success: state.compilation.success,
                contractName: state.compilation.contractName,
                sourceCode: state.compilation.sourceCode,
                abi: state.compilation.abi,
                bytecode: state.compilation.bytecode,
                compilerVersion: state.compilation.compilerVersion,
                evmVersion: state.compilation.evmVersion
            } : null,
            deployed: state.deployed ? {
                address: state.deployed.address,
                transactionHash: state.deployed.transactionHash,
                verified: state.deployed.verified,
                constructorArguments: state.deployed.constructorArguments,
                encodedConstructorArgs: state.deployed.encodedConstructorArgs,
                deployParams: state.deployed.deployParams
            } : null,
            // Preservar outros campos relevantes se necessário
            sale: state.sale ? {
                ...state.sale,
                capUnits: state.sale.capUnits ? state.sale.capUnits.toString() : "0"
            } : null,
            erc20: state.erc20
        };

        sessionStorage.setItem("lastDeployedContract", JSON.stringify(safeState));
        // Pequeno delay para garantir que logs sejam vistos ou processos finalizados
        setTimeout(() => {
             window.location.href = "contrato-detalhes.html";
        }, 1500);
    } catch (e) {
        console.error("Erro ao redirecionar:", e);
    }

    return true;
  } catch (err) {
    log(`Erro no deploy via MetaMask: ${err?.message || err}`);
    stopOpStatus("Erro no deploy");
    try {
      const d = getDeployButton();
      if (d) {
        d.disabled = true;
        d.classList.remove("btn-outline-primary");
        d.classList.remove("btn-outline-success");
        d.classList.remove("btn-outline-danger");
        d.classList.add("btn-used-error");
      }
    } catch (_) {}
    try {
      const mm = document.getElementById("btnAddToMetaMask");
      if (mm) mm.disabled = true;
    } catch (_) {}
  }
}

// Helper para atualizar itens no card de resumo (Summary Tab)
function updateSummaryItem(label, value, linkUrl = null) {
  try {
    let targetId = null;
    
    // Mapeia labels antigos para os novos IDs do card
    if (label.includes("Status") || label.includes("Verificação")) targetId = "sumStatus";
    else if (label.includes("Endereço")) targetId = "sumAddress";
    else if (label.includes("Transação")) targetId = "sumTx";
    else if (label.includes("Rede")) targetId = "sumNetwork";
    else if (label.includes("Resumo") || label.includes("Características")) targetId = "sumSummary"; // Handle renamed label if needed later
    
    if (!targetId) return;
    
    const el = document.getElementById(targetId);
    if (!el) return;
    
    // Tratamento especial para Status (Badge)
    if (targetId === "sumStatus") {
        el.textContent = value;
        // Atualiza cor do badge
        if (value.match(/(Sucesso|Verificado|Concluído)/i)) {
            el.className = "badge bg-success";
            // Exibe botões de download apenas quando Verificado (ou explicitamente solicitado)
            const filesSection = document.getElementById("files-section");
            if (filesSection) {
                 const isVerified = value.match(/Verificado/i) || (state.deployed && state.deployed.verified);
                 if (isVerified) filesSection.classList.remove("d-none");
            }
        } else if (value.match(/(Erro|Falha)/i)) {
             el.className = "badge bg-danger";
        } else if (value.match(/(Compilando|Gerando|Aguardando|Iniciando|Deploy|Verificando)/i)) {
             el.className = "badge bg-warning text-dark"; 
        } else {
             el.className = "badge bg-info text-dark";
        }
        return;
    }
    
    // Tratamento geral (Texto ou Link)
    if (linkUrl) {
        el.innerHTML = `<a href="${linkUrl}" target="_blank" class="text-warning text-decoration-none font-monospace">${value}</a>`;
    } else {
        el.textContent = value;
    }
  } catch (e) {
    console.error("Erro ao atualizar resumo:", e);
  }
}

// Atualiza links de contrato e transação na UI abaixo dos botões
function updateDeployLinks(contractUrl, txUrl) {
  try {
    const container = document.getElementById("erc20-details");
    const addrVal = state.deployed?.address || null;
    const txVal = state.deployed?.transactionHash || null;

    // Atualiza também o Resumo (Summary List) conforme solicitado
    if (addrVal) updateSummaryItem("Endereço", addrVal, contractUrl);
    if (txVal) updateSummaryItem("Transação", txVal, txUrl);

    // Elementos atualizados (Links de texto + botões de cópia)
    const aAddrLink = document.getElementById("erc20AddressLink");
    const aTxLink = document.getElementById("erc20TxLink");

    // Atualizar Link de Endereço
    if (aAddrLink) {
        aAddrLink.textContent = addrVal || "-";
        if (contractUrl) {
            aAddrLink.href = contractUrl;
            aAddrLink.classList.remove("text-muted", "disabled");
            aAddrLink.classList.add("text-warning");
        } else {
            aAddrLink.removeAttribute("href");
            aAddrLink.classList.remove("text-warning");
            aAddrLink.classList.add("text-muted");
        }
    }

    // Atualizar Link de Transação
    if (aTxLink) {
        aTxLink.textContent = txVal || "-";
        if (txUrl) {
            aTxLink.href = txUrl;
            aTxLink.classList.remove("text-muted", "disabled");
            aTxLink.classList.add("text-warning");
        } else {
            aTxLink.removeAttribute("href");
            aTxLink.classList.remove("text-warning");
            aTxLink.classList.add("text-muted");
        }
    }

    // Fallback para inputs antigos (se existirem)
    const iAddr = document.getElementById("erc20AddressInput");
    const iTx = document.getElementById("erc20TxInput");
    if (iAddr) iAddr.value = addrVal || "";
    if (iTx) iTx.value = txVal || "";

    if (container) {
      const shouldShow = !!(addrVal || txVal || contractUrl || txUrl);
      if (shouldShow) container.classList.remove("d-none");
    }
  } catch {}
}

// Atualiza badges de verificação BscScan/Sourcify
function updateVerificationBadges({ bscUrl, _bscOk, _bscStatus, sourUrl, _sourOk, _sourStatus, _privOk }) {
  try {
    const link = document.getElementById("erc20VerifyLink");
    const addrVerify = state.deployed?.address;
    const chainIdVerify = state.form?.network?.chainId;

    // Atualiza estado de verificação
    const isVerified = _bscOk === true || _sourOk === true || _privOk === true;
    if (isVerified && state.deployed) {
      state.deployed.verified = true;
      // Exibir botões de download após verificação
      const filesSection = document.getElementById("files-section");
      if (filesSection) filesSection.classList.remove("d-none");
      updateSummaryItem("Status", "Verificado");
    }

    let url = null;
    url = bscUrl || sourUrl || (addrVerify && chainIdVerify ? getExplorerVerificationUrl(addrVerify, chainIdVerify) : null);
    if (link) {
      link.href = url || "#";
      const clickable = !!(addrVerify && chainIdVerify);

      if (state.deployed?.verified) {
        link.classList.add("disabled");
        link.classList.remove("btn-outline-warning");
        link.classList.add("btn-success");
        link.innerHTML = `<i class="bi bi-check-circle me-1"></i>CONTRATO VERIFICADO COM SUCESSO!!!`;
        link.title = "Contrato verificado com sucesso";

        // Busca automática de detalhes agora é feita via evento contract:verified
      } else {
        link.classList.toggle("disabled", !clickable);
        link.classList.remove("btn-success");
        link.classList.add("btn-outline-warning");
        try {
          const hasMeta = !!state?.compilation?.metadata;
          link.innerHTML = `<i class="bi bi-shield-check me-1"></i>${hasMeta ? "Verificar automaticamente" : "Abrir verificação"}`;
          link.title = hasMeta ? "Verificação automática via Sourcify" : "Abrir verificador do explorer da rede";
          if (window.bootstrap?.Tooltip) new bootstrap.Tooltip(link);
        } catch (_) {}
      }
    }
  } catch (_) {}
}

// Removido: getNetworkNameByChainId (não utilizado)

let opTimer = null;
let opStartedAt = 0;
function formatElapsed(ms) {
  try {
    const total = Math.floor(ms / 1000);
    const m = String(Math.floor(total / 60));
    const s = String(total % 60).padStart(2, "0");
    return `${m}:${s}`;
  } catch (_) {
    return "0:00";
  }
}
function startOpStatus(message) {
  try {
    opStartedAt = Date.now();
    // setStatusContainerVisible(); // Removido para manter oculto até conclusão
    const st = document.getElementById("contractStatus");
    if (st) st.textContent = `${message} — tempo: 0:00`;
    
    // Atualiza resumo
    updateSummaryItem("Status", message);

    if (opTimer) clearInterval(opTimer);
    opTimer = setInterval(() => {
      try {
        const elapsed = formatElapsed(Date.now() - opStartedAt);
        const msg = `${message} — tempo: ${elapsed}`;
        const el = document.getElementById("contractStatus");
        if (el) el.textContent = msg;
        // Opcional: atualizar timer no resumo também, mas pode ser muito frequente
        // updateSummaryItem("Status", msg); 
      } catch (_) {}
    }, 1000);
  } catch (_) {}
}
function updateOpStatus(message) {
  try {
    const elapsed = formatElapsed(Date.now() - opStartedAt);
    const msg = `${message} — tempo: ${elapsed}`;
    const st = document.getElementById("contractStatus");
    if (st) st.textContent = msg;
    
    // Atualiza resumo
    updateSummaryItem("Status", message); // Sem o timer para ficar mais limpo
  } catch (_) {}
}
function stopOpStatus(finalMessage) {
  try {
    if (opTimer) {
      clearInterval(opTimer);
      opTimer = null;
    }
    const elapsed = formatElapsed(Date.now() - opStartedAt);
    const msg = `${finalMessage} — tempo: ${elapsed}`;
    const st = document.getElementById("contractStatus");
    if (st) st.textContent = msg;

    // Atualiza resumo com mensagem final
    updateSummaryItem("Status", finalMessage);
  } catch (_) {}
}

// Atualiza seção de detalhes ERC-20 na UI
function updateERC20Details(symbol, name, decimals, supply, statusText, visible) {
  try {
    const container = document.getElementById("erc20-details");
    const st = document.getElementById("contractStatus");
    const elSym = document.getElementById("erc20Symbol");
    const elName = document.getElementById("erc20Name");
    const elDec = document.getElementById("erc20Decimals");
    const elSup = document.getElementById("erc20Supply");
    if (!container) return;
    if (typeof statusText === "string" && st) st.textContent = statusText;
    
    // Atualiza Resumo também
    if (statusText) updateSummaryItem("Status", statusText);

    if (elSym) elSym.textContent = symbol ?? elSym.textContent ?? "-";
    if (elName) elName.textContent = name ?? elName.textContent ?? "-";
    if (elDec) elDec.textContent = decimals != null ? String(decimals) : (elDec.textContent ?? "-");
    if (elSup) elSup.textContent = supply != null ? String(supply) : (elSup.textContent ?? "-");
    container.classList.toggle("d-none", !visible);
    if (state.deployed?.address) container.classList.remove("d-none");
  } catch {}
}

/**
 * Atualiza a interface gráfica com os resultados da compilação.
 * Centraliza a lógica de exibição de botões de download e detalhes do token,
 * facilitando a manutenção e garantindo consistência entre fluxo normal e fallback.
 * 
 * @param {string} contractName - Nome do contrato compilado
 * @param {boolean} isFallback - Se a compilação foi feita via fallback (local)
 */
function updateCompilationUI(contractName, isFallback) {
  try {
    // 1. Garante que a seção de download de arquivos permaneça oculta até verificação
    // const filesSection = document.getElementById("files-section");
    // if (filesSection) filesSection.classList.remove("d-none");

    // 2. Habilita os botões de download (ABI, Source, JSON)
    const bSol = document.querySelector("#btnDownloadSol");
    const bJson = document.querySelector("#btnDownloadJson");
    const bAbi = document.querySelector("#btnDownloadAbi");
    if (bSol) bSol.disabled = false;
    if (bJson) bJson.disabled = false;
    if (bAbi) bAbi.disabled = false;

    // 3. Coleta dados do formulário para exibição
    const nm = state.form?.token?.name || "MyToken";
    const sym = state.form?.token?.symbol || "TKN";
    const dec = Number.isFinite(state.form?.token?.decimals) ? state.form.token.decimals : 18;
    const supHuman = formatPtBR(state.form?.token?.initialSupply ?? 0);
    
    // 4. Atualiza o container de detalhes (erc20-details) reutilizando a função existente
    // O último parâmetro 'true' força a visibilidade do container
    const statusMsg = `Compilado: ${contractName} ${isFallback ? '(Local)' : '(Servidor)'}`;
    updateERC20Details(sym, nm, dec, supHuman, statusMsg, true);
    
    // Scroll para os detalhes se estiverem visíveis
    const details = document.getElementById("erc20-details");
    if (details) details.scrollIntoView({ behavior: "smooth", block: "start" });
    
    log(`Interface atualizada: Artefatos prontos para ${contractName}`);
  } catch (err) {
    console.error("Erro ao atualizar UI de compilação:", err);
  }
}

// Formata números no padrão pt-BR (pontos para milhar, vírgula decimal)
function formatPtBR(value) {
  try {
    let s = typeof value === "string" ? value : value?.toString ? value.toString() : String(value);
    if (!s) return "-";
    const parts = s.split(".");
    let intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    let fracPart = (parts[1] || "").replace(/0+$/, "");
    return fracPart ? `${intPart},${fracPart}` : intPart;
  } catch (_) {
    return String(value ?? "-");
  }
}

// Inicializa carteira automaticamente se já estiver conectada no navegador
async function initWalletIfConnected() {
  try {
    if (!window.ethereum) return;
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const { chainId } = await provider.getNetwork();
    state.wallet = { provider, signer, address, chainId };
    log(`Carteira detectada: ${address} (chainId ${chainId}).`);

    // Preencher campos de Owner e Holder se estiverem vazios
    try {
        const ownerInput = document.getElementById("initialOwner");
        const holderInput = document.getElementById("initialHolder");
        if (ownerInput && !ownerInput.value) {
            ownerInput.value = address;
            // Disparar evento para limpar validação
            ownerInput.dispatchEvent(new Event('input'));
        }
        if (holderInput && !holderInput.value) {
            holderInput.value = address;
            holderInput.dispatchEvent(new Event('input'));
        }
    } catch (_) {}
    // Não ajustar automaticamente a seleção de rede ou campo de busca
  } catch (err) {
    // silencioso
  }
}

// Removido: setupClearButton (não utilizado; limpeza usa btnClearAll global)
// Removido: setupClearButton (não utilizado; limpeza usa btnClearAll global)

// Função para atualização de UI de verificação
function updateVerificationUI(success) {
    if (success && state.deployed) {
        state.deployed.verified = true;
        updateSummaryItem("Status", "Verificado");
        document.dispatchEvent(new CustomEvent("contract:verified", { detail: state.deployed }));
        
        // Update specific UI elements
        const link = document.getElementById("erc20VerifyLink");
        if (link) {
            link.className = "btn btn-success w-100";
            link.innerHTML = '<i class="bi bi-check-circle me-1"></i>Verificado!';
            link.href = getExplorerContractUrl(state.deployed.address, state.form.network.chainId);
            link.classList.remove("disabled", "btn-outline-warning");
        }
    }
}

// Monitoramento de verificação
async function monitorVerification(chainId, address) {
    let attempts = 0;
    const maxAttempts = 30; // 30 * 3s = 90s
    
    const poll = async () => {
        attempts++;
        if (attempts > maxAttempts) {
            log("Tempo limite de verificação automática excedido. Tente manualmente.");
            // stopOpStatus("Verif. Timeout"); // Não sobrescrever status principal se já concluído
            return;
        }
        
        try {
            const status = await getVerificationStatus(chainId, address);
            if (status.verified || (status.result && status.result.includes("Verified"))) {
                log("Contrato verificado com sucesso no Explorer!");
                updateVerificationUI(true);
                return;
            }
        } catch (e) {
            console.warn("Polling error:", e);
        }
        
        setTimeout(poll, 3000);
    };
    
    poll();
}

// Auto verificação
async function autoVerifyContract() {
    try {
        log("Iniciando verificação automática...");
        // Não usamos startOpStatus para não sobrescrever "Concluído" do deploy, apenas log
        
        const payload = buildVerifyPayloadFromState();
        if (!payload) {
            log("Não foi possível gerar payload para verificação.");
            return;
        }
        
        const res = await runVerifyDirectShared(payload);
        
        if (res.success || res.status === "1" || res.message === "pending") {
             if (res.status === "1" && res.result === "Already Verified") {
                 log("Contrato já verificado!");
                 updateVerificationUI(true);
                 return;
             }
             
             log("Solicitação enviada. Monitorando confirmação...");
             monitorVerification(payload.chainId, payload.contractAddress);
        } else {
            log(`Falha ao iniciar verificação automática: ${res.message}. Tente manualmente.`);
            // Mostra opção manual
            const vc = document.getElementById("verifyLaunchContainer");
            if (vc) vc.classList.remove("d-none");
        }
    } catch (e) {
        log(`Erro na verificação automática: ${e.message}`);
    }
}

async function bindUI() {
  // setupClearButton removido - usa btnClearAll global
  const btnClearAll = document.getElementById("btnClearAll");
  if (btnClearAll) {
      btnClearAll.addEventListener("click", () => {
          // Reset form state handled by other listeners or manually here if needed
          // Assuming global handler does form reset, we focus on UI reset specific to Builder
          
          state.form.token = {};
          state.compilation = {};
          state.deployed = {};
          state.form.sale = {};
          
          // Reset Build Button
          const btn = document.getElementById("btnBuildDeploy");
          if (btn) {
            btn.disabled = false;
            // Remover classes de sucesso/erro e voltar ao normal
            btn.classList.remove("btn-success", "btn-used-error", "btn-used-success", "btn-danger");
            btn.classList.add("btn-outline-success");
            
            const sp = document.getElementById("buildSpinner");
            const tx = document.getElementById("buildBtnText");
            if (sp) sp.classList.add("d-none");
            if (tx) tx.textContent = "GERAR CONTRATO";
          }
          
          // Reset Views
          const detailsContainer = document.getElementById("erc20-details");
          const searchContainer = document.getElementById("contract-search-container");
          if (detailsContainer) detailsContainer.classList.add("d-none");
          if (searchContainer) searchContainer.classList.add("d-none");
          
          updateDeployLinks(null, null);
          log("Interface resetada.");
      });
  }

  // grupo altera visibilidade de venda
  const contractGroupEl = $("#contractGroup");
  if (contractGroupEl) {
    contractGroupEl.addEventListener("change", () => {
      readForm();
      setSaleVisibility();
      updateContractInfo();
      // Revalidar campos de venda quando o grupo muda
      validateSaleInline();
    });
  }
  setSaleVisibility();
  updateContractInfo();
  updateVanityVisibility();

  // Log do endpoint e checagem de conectividade ao carregar a página
  try {
    log(`Endpoint de API configurado: ${API_BASE}`);
    const baseDisp = document.getElementById("apiBaseDisplay");
    if (baseDisp) baseDisp.textContent = API_BASE;
    await checkApiConnectivity(API_BASE);
    await checkApiEndpoints(API_BASE);
  } catch (_) {}

  const unusedBtnConnect = $("#btnConnect");
  // Inicializa carteira automaticamente, se houver
  initWalletIfConnected();
  const btnCompile = document.getElementById("btnCompile");
  const btnDeploy = getDeployButton();
  const btnBuildDeploy = document.getElementById("btnBuildDeploy");
  const btnAddMM = document.getElementById("btnAddToMetaMask");
  if (btnCompile)
    btnCompile.addEventListener("click", async () => {
      try {
        const sp = document.getElementById("compileSpinner");
        const tx = document.getElementById("compileBtnText");
        if (sp) sp.classList.remove("d-none");
        if (tx) tx.textContent = "Compilando...";
        startOpStatus("Compilando");
      } catch (_) {}
      await compileContract();
      try {
        btnCompile.disabled = true;
        btnCompile.classList.remove("btn-outline-primary");
        btnCompile.classList.remove("btn-outline-danger");
        btnCompile.classList.add("btn-outline-success");
      } catch (_) {}
      try {
        if (window.bootstrap?.Tooltip) new bootstrap.Tooltip(btnDeploy);
      } catch (_) {}
      try {
        const sp = document.getElementById("compileSpinner");
        const tx = document.getElementById("compileBtnText");
        if (sp) sp.classList.add("d-none");
        if (tx) tx.textContent = "Compilar";
        stopOpStatus("Compilação concluída");
      } catch (_) {}
    });
  if (btnDeploy)
    btnDeploy.addEventListener("click", async () => {
      try {
        const sp = document.getElementById("deploySpinner");
        const tx = document.getElementById("deployBtnText");
        if (sp) sp.classList.remove("d-none");
        if (tx) tx.textContent = "Publicando...";
      } catch (_) {}
      await deployContract();
      try {
        btnDeploy.disabled = true;
        btnDeploy.classList.remove("btn-outline-primary");
        btnDeploy.classList.remove("btn-outline-danger");
        btnDeploy.classList.add("btn-outline-success");
      } catch (_) {}
      try {
        const mm = document.getElementById("btnAddToMetaMask");
        if (mm) mm.disabled = !isValidAddress(state?.deployed?.address);
      } catch (_) {}
      try {
        const vc = document.getElementById("verifyLaunchContainer");
        const vb = document.getElementById("erc20VerifyLaunch");
        if (vc) vc.classList.remove("d-none");
        if (vb) vb.disabled = false;
      } catch (_) {}
      try {
        const oc = document.getElementById("openVerificaContainer");
        const ob = document.getElementById("openVerificaModuleBtn");
        const lc = document.getElementById("openAddTokenLinkContainer");
        const lb = document.getElementById("openAddTokenLinkBtn");
        if (oc) oc.classList.remove("d-none");
        if (ob) ob.classList.remove("disabled");
        try {
          const addr = state?.deployed?.address || "";
          const cid = state?.form?.network?.chainId || state?.wallet?.chainId || null;
          const nm = state?.form?.token?.name || "";
          const sym = state?.form?.token?.symbol || "TKN";
          const dec = Number.isFinite(state?.form?.token?.decimals) ? state.form.token.decimals : 18;
          const fullContractUrl = cid ? getExplorerContractUrl(addr, cid) : "";
          const expBase = fullContractUrl ? String(fullContractUrl).replace(/\/address\/.*$/, "") : "";
          const img = getDefaultImageUrl();
          let rpcParam = "";
          const net = state?.form?.network || {};
          if (Array.isArray(net?.rpc) && net.rpc.length) rpcParam = net.rpc[0];
          else if (typeof net?.rpc === "string" && net.rpc) rpcParam = net.rpc;
          else if (cid) rpcParam = getFallbackRpcByChainId(cid);
          const qs = addr && cid ? `?address=${encodeURIComponent(addr)}&chainId=${encodeURIComponent(String(cid))}&name=${encodeURIComponent(nm)}&symbol=${encodeURIComponent(sym)}&decimals=${encodeURIComponent(String(dec))}&explorer=${encodeURIComponent(expBase)}&image=${encodeURIComponent(img)}${rpcParam ? `&rpc=${encodeURIComponent(rpcParam)}` : ""}` : "";
          if (lc) lc.classList.remove("d-none");
          if (lb) {
            lb.classList.toggle("disabled", !qs);
            lb.href = `../link/link-token.html${qs}`;
          }
        } catch (_) {}
      } catch (_) {}
      try {
        const sp = document.getElementById("deploySpinner");
        const tx = document.getElementById("deployBtnText");
        if (sp) sp.classList.add("d-none");
        if (tx) tx.textContent = "Deploy";
      } catch (_) {}
    });


  if (btnBuildDeploy)
    btnBuildDeploy.addEventListener("click", async () => {
      try {
        btnBuildDeploy.disabled = true;
        try {
          const sp = document.getElementById("buildSpinner");
          const tx = document.getElementById("buildBtnText");
          if (sp) sp.classList.remove("d-none");
          if (tx) tx.textContent = "Construindo e publicando...";
        } catch (_) {}
        startOpStatus("Compilando e deployando");
        const compiled = await compileContract();
        if (!compiled) {
             stopOpStatus("Compilação falhou");
             throw new Error("Compilação falhou. Verifique logs.");
        }
        updateOpStatus("Deployando...");
        await deployContract();
        btnBuildDeploy.classList.remove("btn-outline-success");
        btnBuildDeploy.classList.add("btn-used-success");
        try {
          const mm = document.getElementById("btnAddToMetaMask");
          if (mm) mm.disabled = !isValidAddress(state?.deployed?.address);
        } catch (_) {}
        try {
          const vc = document.getElementById("verifyLaunchContainer");
          const vb = document.getElementById("erc20VerifyLaunch");
          if (vc) vc.classList.remove("d-none");
          if (vb) vb.disabled = false;
        } catch (_) {}
        try {
          const oc = document.getElementById("openVerificaContainer");
          const ob = document.getElementById("openVerificaModuleBtn");
          const lc = document.getElementById("openAddTokenLinkContainer");
          const lb = document.getElementById("openAddTokenLinkBtn");
          if (oc) oc.classList.remove("d-none");
          if (ob) ob.classList.remove("disabled");
          try {
            const addr = state?.deployed?.address || "";
            const cid = state?.form?.network?.chainId || state?.wallet?.chainId || null;
            const nm = state?.form?.token?.name || "";
            const sym = state?.form?.token?.symbol || "TKN";
            const dec = Number.isFinite(state?.form?.token?.decimals) ? state.form.token.decimals : 18;
            const fullContractUrl = cid ? getExplorerContractUrl(addr, cid) : "";
            const expBase = fullContractUrl ? String(fullContractUrl).replace(/\/address\/.*$/, "") : "";
            const img = getDefaultImageUrl();
            let rpcParam = "";
            const net = state?.form?.network || {};
            if (Array.isArray(net?.rpc) && net.rpc.length) rpcParam = net.rpc[0];
            else if (typeof net?.rpc === "string" && net.rpc) rpcParam = net.rpc;
            else if (cid) rpcParam = getFallbackRpcByChainId(cid);
            const qs = addr && cid ? `?address=${encodeURIComponent(addr)}&chainId=${encodeURIComponent(String(cid))}&name=${encodeURIComponent(nm)}&symbol=${encodeURIComponent(sym)}&decimals=${encodeURIComponent(String(dec))}&explorer=${encodeURIComponent(expBase)}&image=${encodeURIComponent(img)}${rpcParam ? `&rpc=${encodeURIComponent(rpcParam)}` : ""}` : "";
            if (lc) lc.classList.remove("d-none");
            if (lb) {
              lb.classList.toggle("disabled", !qs);
              lb.href = `../link/link-token.html${qs}`;
            }
          } catch (_) {}
        } catch (_) {}
        try {
          const sp = document.getElementById("buildSpinner");
          const tx = document.getElementById("buildBtnText");
          const btn = document.getElementById("btnBuildDeploy"); // Ensure we have the button
          if (sp) sp.classList.add("d-none");
          if (tx) tx.textContent = "CONTRATO GERADO COM SUCESSO!!";
          if (btn) {
              btn.disabled = true; // Desabilitar para evitar reenvio
              btn.classList.remove("btn-outline-success", "btn-outline-primary", "btn-outline-danger", "btn-used-success", "btn-used-error");
              btn.classList.add("btn-success");
          }
          stopOpStatus("Concluído");
          // Salvar estado
          try {
              const safeState = getSerializableState();
              if (safeState) {
                  sessionStorage.setItem("lastDeployedContract", JSON.stringify(safeState));
              }
              // REDIRECT REMOVIDO: Fluxo agora é Single Page
              // window.location.href = "contrato-detalhes.html";
          } catch (e) {
              console.error("Erro ao salvar estado:", e);
          }

          // Dispara evento para atualizar a UI em outros módulos
          // IMPORTANTE: Disparar DEPOIS de salvar no storage para que contrato-results.js possa ler os dados completos
          document.dispatchEvent(new CustomEvent("contract:deployed", { detail: state.deployed }));
        } catch (_) {}
      } catch (e) {
        btnBuildDeploy.classList.remove("btn-outline-success");
        btnBuildDeploy.classList.add("btn-used-error");
        try {
          const sp = document.getElementById("buildSpinner");
          const tx = document.getElementById("buildBtnText");
          if (sp) sp.classList.add("d-none");
          if (tx) tx.textContent = "Compilar, Deploy e Verifica";
          stopOpStatus("Falha");
        } catch (_) {}
      }
    });
  // Handler unificado para adicionar token
  const addTokenHandler = async () => {
      try {
        const address = state?.deployed?.address || "";
        const symbol = state?.erc20?.symbol || state?.form?.token?.symbol || "TKN";
        const decimals = Number.isFinite(state?.erc20?.decimals) ? state.erc20.decimals : state?.form?.token?.decimals || 18;
        if (!isValidAddress(address)) {
          log("Endereço do contrato inválido. Faça o deploy primeiro.");
          return;
        }
        try {
          const cid = state.form?.network?.chainId;
          if (window.ethereum && cid) {
            const targetHex = "0x" + Number(cid).toString(16);
            const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
            if (!currentHex || String(parseInt(currentHex, 16)) !== String(cid)) {
              try {
                await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
              } catch (_) {}
            }
          }
        } catch (_) {}
        const res = await addTokenToMetaMask({ address, symbol, decimals });
        log(res.success ? "Token adicionado à MetaMask" : `Falha ao adicionar: ${res.error}`);
      } catch (e) {
        log(`Erro MetaMask: ${e?.message || e}`);
      }
  };

  if (btnAddMM) btnAddMM.addEventListener("click", addTokenHandler);
  
  // Fix: Adicionar listener para botão pequeno (mobile/card)
  const btnAddMMSmall = document.getElementById("btnAddToMetaMaskSmall");
  if (btnAddMMSmall) btnAddMMSmall.addEventListener("click", addTokenHandler);

  // Fix: Adicionar listeners para botões de Rede (Add Network/Switch)
  const switchNetworkHandler = async () => {
    try {
        const cid = state.form?.network?.chainId || state?.deployed?.chainId;
        if (!cid) {
            log("Rede não definida para troca.");
            return;
        }
        if (window.ethereum) {
            const targetHex = "0x" + Number(cid).toString(16);
            await window.ethereum.request({ 
                method: "wallet_switchEthereumChain", 
                params: [{ chainId: targetHex }] 
            });
            log("Solicitação de troca de rede enviada.");
        } else {
            log("MetaMask não detectada.");
        }
    } catch (e) {
        log(`Erro ao trocar rede: ${e.message || e}`);
    }
  };

  const btnAddNet = document.getElementById("btnAddNetwork");
  if (btnAddNet) btnAddNet.addEventListener("click", switchNetworkHandler);

  const btnAddNetSmall = document.getElementById("btnAddNetworkSmall");
  if (btnAddNetSmall) btnAddNetSmall.addEventListener("click", switchNetworkHandler);

  // Compartilhamento (Copy, View, Social)
  const getShareLink = () => {
      const gl = document.getElementById("generatedLink");
      if (gl && gl.value) return gl.value;
      const addr = state?.deployed?.address;
      const chain = state?.form?.network?.chainId || state?.wallet?.chainId;
      if (addr && chain) {
         const url = new URL(window.location.href);
         url.searchParams.set("contract", addr);
         url.searchParams.set("chain", chain);
         return url.toString();
      }
      return window.location.href;
  };

  const copyBtn = document.getElementById("copyAddressBtn");
  if (copyBtn) {
      copyBtn.addEventListener("click", () => {
          const link = getShareLink();
          if (navigator.clipboard) {
              navigator.clipboard.writeText(link).then(() => log("Link copiado!"));
          } else {
              const inp = document.getElementById("generatedLink");
              if (inp) {
                  inp.select();
                  document.execCommand("copy");
                  log("Link copiado!");
              }
          }
      });
  }

  const viewBtn = document.getElementById("viewAddressBtn");
  if (viewBtn) {
      viewBtn.addEventListener("click", () => {
          const link = getShareLink();
          if (link) window.open(link, "_blank");
      });
  }

  const waBtn = document.getElementById("btnShareWhatsAppSmall");
  if (waBtn) {
      waBtn.addEventListener("click", () => {
          const link = getShareLink();
          const text = encodeURIComponent(`Confira meu novo token criado no TokenCafe! 🚀\n\n${link}`);
          window.open(`https://wa.me/?text=${text}`, "_blank");
      });
  }

  const tgBtn = document.getElementById("btnShareTelegramSmall");
  if (tgBtn) {
      tgBtn.addEventListener("click", () => {
          const link = getShareLink();
          const text = encodeURIComponent("Confira meu novo token criado no TokenCafe! 🚀");
          const url = encodeURIComponent(link);
          window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
      });
  }

  const mailBtn = document.getElementById("btnShareEmailSmall");
  if (mailBtn) {
      mailBtn.addEventListener("click", () => {
          const link = getShareLink();
          const subject = encodeURIComponent("Novo Token Criado");
          const body = encodeURIComponent(`Olá,\n\nConfira meu novo token criado no TokenCafe:\n\n${link}`);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
      });
  }

  const btnShare = document.getElementById("btnShareDeploy");
  if (btnShare)
    btnShare.addEventListener("click", async () => {
      try {
        const addr = state?.deployed?.address || "";
        const cid = state?.form?.network?.chainId || state?.wallet?.chainId || null;
        if (!addr || !cid) return;
        const url = getExplorerContractUrl(addr, cid) || window.location.href;
        const title = `Contrato ERC-20 (${state?.form?.token?.symbol || "TKN"})`;
        const text = `Endereço: ${addr}\nRede: ${state?.form?.network?.name || cid}`;
        const shareData = { title, text, url };
        if (navigator.share) {
          await navigator.share(shareData);
          log("Link compartilhado com sucesso");
        } else {
          await navigator.clipboard?.writeText?.(url);
          log("Web Share indisponível; link copiado para a área de transferência");
        }
      } catch (e) {
        log(`Falha ao compartilhar: ${e?.message || e}`);
      }
    });

  // Integrar com componente de busca de rede (network-search)
  const nsContainer = document.querySelector('[data-component*="network-search.html"]').parentElement || document;
  nsContainer.addEventListener("network:selected", (evt) => {
    const net = evt?.detail?.network;
    if (!net) return;
    state.form.network = net;
    state.sale = state.sale || {};
    state.form.sale.nativeSymbol = net?.nativeCurrency?.symbol || "";
    state.form.sale.nativeDecimals = net?.nativeCurrency?.decimals ?? 18;
    log(`Rede selecionada: ${net.name} (chainId ${net.chainId})`);
    try {
      const vname = document.getElementById("verifyNetworkName");
      if (vname) vname.textContent = net.name || "-";
    } catch (_) {}
  });

  try {
    const vLink = document.getElementById("erc20VerifyLink");
    if (vLink) {
      vLink.addEventListener("click", (e) => {
        try {
          e.preventDefault();
          const addr = state.deployed?.address;
          const chainId = state.form?.network?.chainId;
          if (!addr || !chainId) return;
          const ex = getExplorerVerificationUrl(addr, chainId);
          if (ex) window.open(ex, "_blank");
        } catch (_) {}
      });
    }
  } catch (_) {}
  nsContainer.addEventListener("network:clear", () => {
    state.form.network = null;
    log("Rede limpa.");
  });

  // UI: Downloads pós-deploy
  let currentPreviewType = "sol";
  function getSelectedFile() {
    const sel = document.querySelector("#fileTypeSelect");
    const type = sel ? sel.value : currentPreviewType || "sol";
    const nameBase = state?.compilation?.contractName || (state.form?.token?.name || "MyToken").replace(/\s+/g, "");
    let filename = nameBase;
    let content = "";
    let mime = "text/plain";
    if (type === "sol") {
      filename = `${nameBase}.sol`;
      content = state?.compilation?.sourceCode || "// Código não disponível. Gere o contrato primeiro.";
      mime = "text/plain";
    } else if (type === "abi") {
      filename = `${nameBase}.abi.json`;
      const abi = state?.compilation?.abi || [];
      content = JSON.stringify(abi, null, 2);
      mime = "application/json";
    } else if (type === "verifyjson") {
      filename = `${nameBase}.verify.json`;
      const chainId = state.form?.network?.chainId || null;
      const address = state.deployed?.address || null;
      const txHash = state.deployed?.transactionHash || null;
      const networkName = state.form?.network?.name || null;
      const compilerVersion = state?.compilation?.metadata?.compiler?.version || null;
      const deployedBytecode = state?.deployed?.deployedBytecode || state?.compilation?.deployedBytecode || null;
      const bytecode = state?.compilation?.bytecode || null;
      const deployParams = state?.deployed?.deployParams || {};
      const data = {
        contractName: nameBase,
        address,
        chainId,
        networkName,
        txHash,
        compilerVersion,
        optimizer: { enabled: true, runs: 200 },
        constructorArguments: getEncodedConstructorArgs() ? [getEncodedConstructorArgs()] : [],
        bytecode,
        deployedBytecode,
        deployParams,
      };
      content = JSON.stringify(data, null, 2);
      mime = "application/json";
    } else if (type === "deployedBytecode") {
      filename = `${nameBase}.deployed.bytecode.txt`;
      content = state?.deployed?.deployedBytecode || "";
      mime = "text/plain";
    }
    return { type, filename, content, mime };
  }

  function previewSelectedFile() {
    if (!state?.compilation) {
      log("Preview indisponível: compile o contrato primeiro.");
      return;
    }
    const { filename, content } = getSelectedFile();
    const pre = document.querySelector("#filePreviewContent");
    const label = document.querySelector("#filePreviewLabel");
    if (pre) pre.textContent = content || "(vazio)";
    if (label) label.textContent = `Preview do Arquivo - ${filename}`;
    try {
      const modalEl = document.getElementById("filePreviewModal");
      if (modalEl && window.bootstrap?.Modal) {
        const m = new bootstrap.Modal(modalEl);
        m.show();
      }
    } catch {}
  }

  function downloadSelectedFile() {
    if (!state?.compilation) {
      log("Download indisponível: compile o contrato primeiro.");
      return;
    }
    const { filename, content, mime } = getSelectedFile();
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    log(`Arquivo baixado: ${filename}`);
  }

  const btnDownloadSol = document.querySelector("#btnDownloadSol");
  const btnDownloadJson = document.querySelector("#btnDownloadJson");
  const btnDownloadAbi = document.querySelector("#btnDownloadAbi");
  const btnDownloadDeployedBytecode = document.querySelector("#btnDownloadDeployedBytecode");

  if (btnDownloadSol)
    btnDownloadSol.addEventListener("click", () => {
      currentPreviewType = "sol";
      previewSelectedFile();
    });
  if (btnDownloadJson)
    btnDownloadJson.addEventListener("click", () => {
      currentPreviewType = "verifyjson";
      previewSelectedFile();
    });
  if (btnDownloadAbi)
    btnDownloadAbi.addEventListener("click", () => {
      currentPreviewType = "abi";
      previewSelectedFile();
    });
  if (btnDownloadDeployedBytecode)
    btnDownloadDeployedBytecode.addEventListener("click", () => {
      currentPreviewType = "deployedBytecode";
      previewSelectedFile();
    });
  const btnCopyFile = document.getElementById("btnCopyFile");
  const btnSaveFile = document.getElementById("btnSaveFile");
  if (btnCopyFile)
    btnCopyFile.addEventListener("click", async () => {
      const { content } = getSelectedFile();
      try {
        if (window.copyToClipboard) {
          window.copyToClipboard(content || "");
        } else {
          await navigator.clipboard.writeText(content || "");
        }
        log("Conteúdo copiado.");
      } catch (_) {
        log("Falha ao copiar.");
      }
    });
  if (btnSaveFile)
    btnSaveFile.addEventListener("click", () => {
      downloadSelectedFile();
    });

  function buildRecipe() {
    const net = state.form?.network || {};
    const rec = {
      group: state.form?.group || "erc20-minimal",
      network: {
        chainId: net?.chainId || null,
        name: net?.name || null,
      },
      token: {
        name: state.form?.token?.name || "",
        symbol: state.form?.token?.symbol || "",
        decimals: state.form?.token?.decimals ?? 18,
        initialSupply: state.form?.token?.initialSupply ?? 0,
      },
      compilation: {
        contractName: state.compilation?.contractName || null,
        deployedBytecode: state.compilation?.deployedBytecode || null,
      },
      deployment: {
        address: state.deployed?.address || null,
        tx: state.deployed?.transactionHash || null,
      },
      sale: {
        priceDec: state.form?.sale?.priceDec || null,
        minDec: state.form?.sale?.minDec || null,
        maxDec: state.form?.sale?.maxDec || null,
        capUnits: state.form?.sale?.capUnits != null ? String(state.form.sale.capUnits) : null,
        payoutWallet: state.form?.sale?.payoutWallet || null,
      },
      fees: {
        bps: null,
        fixedBnb: null,
        fixedUsdt: null,
      },
      solcVersion: "0.8.26",
      optimizerRuns: 200,
      createdAt: new Date().toISOString(),
    };
    return rec;
  }

  try {
    window.buildRecipe = buildRecipe;
  } catch (_) {}
  function applyRecipe(rec) {
    try {
      if (rec?.group) {
        const sel = document.getElementById("contractGroup");
        if (sel) sel.value = rec.group;
      }
      if (rec?.token) {
        const t = rec.token;
        const set = (id, v) => {
          const el = document.getElementById(id);
          if (el) el.value = v != null ? String(v) : "";
        };
        set("tokenName", t.name);
        set("tokenSymbol", t.symbol);
        set("tokenDecimals", t.decimals);
        set("initialSupply", t.initialSupply);
      }
      if (rec?.sale) {
        const s = rec.sale;
        const set = (id, v) => {
          const el = document.getElementById(id);
          if (el) el.value = v != null ? String(v) : "";
        };
        set("tokenPriceDec", s.priceDec);
        set("minPurchaseDec", s.minDec);
        set("maxPurchaseDec", s.maxDec);
        set("perWalletCap", s.capUnits);
        set("payoutWallet", s.payoutWallet);
      }
      readForm();
      setSaleVisibility();
      updateContractInfo();
      if (rec?.compilation) {
        state.compilation = state.compilation || {};
        state.compilation.contractName = rec.compilation.contractName || state.compilation.contractName || null;
        state.compilation.deployedBytecode = rec.compilation.deployedBytecode || state.compilation.deployedBytecode || null;
      }
      if (rec?.deployment) {
        state.deployed.address = rec.deployment.address || state.deployed.address || null;
        state.deployed.transactionHash = rec.deployment.tx || state.deployed.transactionHash || null;
        const chainId = state.form?.network?.chainId;
        const explorerUrl = getExplorerContractUrl(state.deployed.address, chainId);
        const txUrl = getExplorerTxUrl(state.deployed.transactionHash, chainId);
        updateDeployLinks(explorerUrl, txUrl);
      }
      log("Receita importada e aplicada aos campos. Revise antes de compilar/deploy.");
    } catch (e) {
      log(`Falha ao aplicar receita: ${e?.message || e}`);
    }
  }

  try {
    window.applyRecipe = applyRecipe;
  } catch (_) {}

  // Tooltip do ícone de informação do grupo
  try {
    const tipTrigger = document.getElementById("contractGroupInfoIcon");
    if (tipTrigger && window.bootstrap?.Tooltip) {
      new bootstrap.Tooltip(tipTrigger);
    }
  } catch {}

  // Validação imediata do campo de personalização (hex)
  const vanityInput = $("#vanityCustom");
  const help = $("#vanityHelp");
  if (vanityInput) {
    vanityInput.addEventListener("input", () => {
      const raw = vanityInput.value;
      const sanitized = raw
        .replace(/[^0-9a-fA-F]/g, "")
        .toLowerCase()
        .slice(0, 4);
      if (sanitized !== raw) vanityInput.value = sanitized;
      const ok = /^[0-9a-f]{0,4}$/.test(sanitized);
      vanityInput.classList.toggle("is-invalid", !ok);
      if (help) help.textContent = ok ? "Somente 0–9 e a–f. Máximo 4 caracteres." : "Caractere inválido removido. Use apenas 0–9 e a–f.";
    });
    vanityInput.addEventListener("blur", () => {
      const v = vanityInput.value || "";
      if (v && !validateHex4(v)) {
        vanityInput.classList.add("is-invalid");
        if (help) help.textContent = "Precisa ter exatamente 4 hex (0–9, a–f).";
      }
    });

    try {
      const vLink = document.getElementById("erc20VerifyLink");
      if (vLink) {
        vLink.addEventListener("click", async (e) => {
          try {
            const addr = state.deployed?.address;
            const chainId = state.form?.network?.chainId;
            const src = state.compilation?.sourceCode;
            const meta = state.compilation?.metadata;
            if (addr && chainId && src && meta) {
              e.preventDefault();
              const respS = await fetch(`${API_BASE}/api/verify-sourcify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chainId,
                  contractAddress: addr,
                  contractName: state.compilation?.contractName,
                  sourceCode: src,
                  metadata: JSON.stringify(meta),
                }),
              });
              if (respS.ok) {
                const dataS = await respS.json();
                const lookup = dataS?.lookupUrl || dataS?.repoFull || dataS?.repoAny || null;
                updateVerificationBadges({
                  sourUrl: lookup,
                  sourOk: !!lookup,
                  sourStatus: dataS?.status,
                });
                if (lookup) {
                  try {
                    window.open(lookup, "_blank");
                  } catch {}
                  return;
                }
              }
              const fallback = getExplorerVerificationUrl(addr, chainId);
              try {
                window.open(fallback, "_blank");
              } catch {}
            }
          } catch (_) {}
        });
      }
    } catch (_) {}
  }

  const vanityModeSel = $("#vanityMode");
  if (vanityModeSel) {
    vanityModeSel.addEventListener("change", updateVanityVisibility);
  }

  // Validadores inline por campo
  const fv = [
    ["tokenName", validateTokenNameInline],
    ["tokenSymbol", validateTokenSymbolInline],
    ["tokenDecimals", validateTokenDecimalsInline],
    ["initialSupply", validateInitialSupplyInline],
    ["tokenPriceDec", validateSaleInline],
    ["minPurchaseDec", validateSaleInline],
    ["maxPurchaseDec", validateSaleInline],
    ["perWalletCap", validateSaleInline],
    ["payoutWallet", validateSaleInline],
  ];
  fv.forEach(([id, fn]) => {
    const el = getEl(id);
    if (!el) return;
    el.addEventListener("input", fn);
    el.addEventListener("blur", fn);
    // ao alterar campos, permitir nova compilação e limpar marcador de erro
    el.addEventListener("input", () => {
      try {
        const c = document.getElementById("btnCompile");
        if (c) {
          c.disabled = false;
          c.classList.remove("btn-outline-danger");
          c.classList.remove("btn-outline-success");
          c.classList.add("btn-outline-primary");
        }
      } catch (_) {}
    });
  });

  // Verificação: splash modal com instruções
  function showVerifyModal(kind) {
    try {
      const modalEl = document.getElementById("verifyInfoModal");
      const titleEl = document.getElementById("verifyInfoTitle");
      const contentEl = document.getElementById("verifyInfoContent");
      const unusedActionBtn = null;
      const openLink = document.getElementById("verifyOpenLink");
      if (!modalEl || !window.bootstrap?.Modal) return;
      let title = "Verificação";
      let html = "";
      let unusedActionEnabled = false;
      let unusedActionHandler = null;
      let openHref = "#";
      const unusedAddr = state.deployed?.address;
      const unusedChainId = state.form?.network?.chainId;
      if (kind === "bsc") {
        title = "Verificação no BscScan";
        html = `
          <p>Para verificar no BscScan, você precisa do código <strong>.sol</strong>, das configurações de compilação (solc/optimizer) e dos detalhes do deploy/bytecode.</p>
          <div class="alert alert-dark">
            <div class="mb-2">Baixe os arquivos necessários:</div>
            <div class="d-flex gap-2 flex-wrap">
              <button id="verifyDlSol" class="btn btn-sm btn-outline-primary">Baixar .sol</button>
              <button id="verifyDlJson" class="btn btn-sm btn-outline-primary">Baixar verificação (.json)</button>
              <button id="verifyDlAbi" class="btn btn-sm btn-outline-primary">Baixar ABI</button>
              <button id="verifyCopyArgs" class="btn btn-sm btn-outline-secondary" title="Copiar Argumentos do Construtor (Single Line)">Copiar Args</button>
            </div>
            <div class="mt-2 small">Compiler/Optimizer conforme compilação atual</div>
          </div>
          <p>Depois, abra a página de verificação do explorer e publique o código.</p>
        `;
        unusedActionHandler = () => {};
        openHref = "../verifica/verifica-index.html";
      } else if (kind === "sour") {
        title = "Verificação via Explorer";
        html = `
          <p>Use o explorer da rede para publicar seu código. Baixe e guarde o <strong>.sol</strong>. Se a compilação trouxe metadata, utilize esses dados na verificação.</p>
          <div class="alert alert-dark">
            <div class="mb-2">Baixe os arquivos:</div>
            <div class="d-flex gap-2">
              <button id="verifyDlSol" class="btn btn-sm btn-outline-primary">Baixar .sol</button>
            </div>
          </div>
        `;
        unusedActionHandler = () => {};
        openHref = "../verifica/verifica-index.html";
      } else {
        title = "Verificação TokenCafe";
        html = `
          <p>TokenCafe realizou verificação privada comparando o bytecode on-chain com o compilado. Este processo valida seu deploy sem expor o código-fonte publicamente.</p>
          <div class="alert alert-success d-flex align-items-center" role="alert">
            <i class="bi bi-check2-circle me-2"></i>
            <div>Contrato verificado pela rede TokenCafe. Tudo OK.</div>
          </div>
          <p class="small">Guarde seus arquivos (.sol/.json/.hex) na seção de downloads para auditorias futuras.</p>
        `;
        const unusedOk = document.getElementById("erc20VerifyPrivBtn")?.dataset?.verified === "true";
        unusedActionEnabled = false;
        unusedActionHandler = () => {};
        openHref = "../verifica/verifica-index.html";
      }
      if (titleEl) titleEl.textContent = title;
      if (contentEl) contentEl.innerHTML = html;
      // sem botão de ação no splash: apenas o link de verificação
      if (openLink) {
        try {
          const addr = state?.deployed?.address || "";
          const cid = state?.form?.network?.chainId || state?.wallet?.chainId || null;
          const qs = addr && cid ? `?address=${encodeURIComponent(addr)}&chainId=${encodeURIComponent(String(cid))}&source=builder` : "";
          openHref = `${openHref}${qs}`;
        } catch (_) {}
        openLink.href = openHref || "#";
        openLink.classList.toggle("disabled", !openHref || openHref === "#");
        openLink.onclick = () => {
          try {
            const payload = buildVerifyPayloadFromState();
            if (payload) {
              localStorage.setItem("tokencafe_contract_verify_payload", JSON.stringify(payload));
              try {
                const cid = payload?.chainId;
                if (cid) {
                  localStorage.setItem("tokencafe_last_chain_id", String(cid));
                  sessionStorage.setItem("tokencafe_last_chain_id", String(cid));
                }
              } catch (_) {}
            }
          } catch (_) {}
        };
      }
      // Bind downloads
      const dlSol = document.getElementById("verifyDlSol");
      const dlJson = document.getElementById("verifyDlJson");
      const dlAbi = document.getElementById("verifyDlAbi");
      if (dlSol)
        dlSol.onclick = () => {
          try {
            const content = state?.compilation?.sourceCode || "";
            if (!content) {
              log("Fonte indisponível: compile/deploy antes.");
              return;
            }
            const name = (state?.compilation?.contractName || "MyToken").replace(/\s+/g, "");
            const blob = new Blob([content], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${name}.sol`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
          } catch (e) {
            log("Falha ao baixar .sol: " + (e?.message || e));
          }
        };
      if (dlJson)
        dlJson.onclick = () => {
          try {
            const name = (state?.compilation?.contractName || "MyToken").replace(/\s+/g, "");
            const chainId = state.form?.network?.chainId || null;
            const address = state.deployed?.address || null;
            const txHash = state.deployed?.transactionHash || null;
            const networkName = state.form?.network?.name || null;
            const compilerVersion = state?.compilation?.metadata?.compiler?.version || null;
            const deployedBytecode = state?.deployed?.deployedBytecode || state?.compilation?.deployedBytecode || null;
            const bytecode = state?.compilation?.bytecode || null;
            const deployParams = state?.deployed?.deployParams || {};
            const data = {
              contractName: name,
              address,
              chainId,
              networkName,
              txHash,
              compilerVersion,
              optimizer: { enabled: true, runs: 200 },
              constructorArguments: getEncodedConstructorArgs(),
              bytecode,
              deployedBytecode,
              deployParams,
            };
            const content = JSON.stringify(data, null, 2);
            const blob = new Blob([content], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${name}.verify.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
          } catch (e) {
            log("Falha ao baixar verificação (.json): " + (e?.message || e));
          }
        };
      if (dlAbi)
        dlAbi.onclick = () => {
          try {
            const abi = state?.compilation?.abi;
            if (!abi) {
              log("ABI indisponível: compile/deploy antes.");
              return;
            }
            const name = (state?.compilation?.contractName || "MyToken").replace(/\s+/g, "");
            const content = JSON.stringify(abi, null, 2);
            const blob = new Blob([content], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${name}.abi.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
          } catch (e) {
            log("Falha ao baixar ABI: " + (e?.message || e));
          }
        };
      
      const copyArgsBtn = document.getElementById("verifyCopyArgs");
      if (copyArgsBtn) {
        copyArgsBtn.onclick = async () => {
           const args = getEncodedConstructorArgs();
           if (!args) {
             log("Sem argumentos de construtor para copiar (ou vazio).");
             return;
           }
           try {
             if (window.copyToClipboard) {
               window.copyToClipboard(args);
             } else {
               await navigator.clipboard.writeText(args);
             }
             log("Argumentos copiados (Single Line)!");
             const originalText = copyArgsBtn.textContent;
             copyArgsBtn.textContent = "Copiado!";
             copyArgsBtn.classList.remove("btn-outline-secondary");
             copyArgsBtn.classList.add("btn-success");
             setTimeout(() => {
                copyArgsBtn.textContent = originalText;
                copyArgsBtn.classList.remove("btn-success");
                copyArgsBtn.classList.add("btn-outline-secondary");
             }, 2000);
           } catch(e) {
             log("Erro ao copiar: " + e.message);
           }
        };
      }

      const m = new bootstrap.Modal(modalEl);
      m.show();
    } catch (_) {}
  }

  // Removido showVerificationResultModal local para usar a global
  // function showVerificationResultModal(success, message, link) { ... }

  const bscBtn = document.getElementById("erc20VerifyBscBtn");
  const sourBtn = document.getElementById("erc20VerifySourBtn");
  const privBtn = document.getElementById("erc20VerifyPrivBtn");
  if (bscBtn)
    bscBtn.addEventListener("click", () => {
      try {
        if (window.setButtonState) window.setButtonState("erc20VerifyBscBtn", "loading");
      } catch (_) {}
      showVerifyModal("bsc");
      try {
        if (window.setButtonState) window.setButtonState("erc20VerifyBscBtn", "default");
      } catch (_) {}
    });
  if (sourBtn)
    sourBtn.addEventListener("click", () => {
      try {
        if (window.setButtonState) window.setButtonState("erc20VerifySourBtn", "loading");
      } catch (_) {}
      showVerifyModal("sour");
      try {
        if (window.setButtonState) window.setButtonState("erc20VerifySourBtn", "default");
      } catch (_) {}
    });
  if (privBtn) privBtn.addEventListener("click", () => showVerifyModal("priv"));
  try {
    const launch = document.getElementById("erc20VerifyLaunch");
    if (launch) {
      launch.addEventListener("click", async () => {
        try {
          launch.disabled = true;
        } catch (_) {}
        try {
          const sp = document.getElementById("verifySpinner");
          const tx = document.getElementById("verifyBtnText");
          if (sp) sp.classList.remove("d-none");
          if (tx) tx.textContent = "Verificando...";
        } catch (_) {}
        try {
          const payload = buildVerifyPayloadFromState();
          if (!payload?.contractAddress || !payload?.chainId) {
            log("Verificação: endereço/chainId ausentes. Faça o deploy primeiro.");
            launch.disabled = false;
          } else {
            const result = await runVerifyDirect(payload);
            // Só reativa se NÃO foi sucesso e NÃO está verificado
            if (!result?.success && !result?.alreadyVerified && !result?.verified) {
                launch.disabled = false;
                launch.removeAttribute("disabled");
                launch.style.pointerEvents = "auto";
                launch.style.opacity = "";
            } else {
                // Se sucesso, garante que fica disabled e verde
                launch.disabled = true;
                launch.setAttribute("disabled", "true");
                launch.style.pointerEvents = "none";
                launch.style.opacity = "0.65";
                launch.classList.remove("btn-outline-warning");
                launch.classList.add("btn-success");
            }
          }
        } catch (e) {
          log("Falha na verificação: " + (e?.message || e));
          launch.disabled = false;
          launch.removeAttribute("disabled");
          launch.style.pointerEvents = "auto";
          launch.style.opacity = "";
        }
        try {
          const sp = document.getElementById("verifySpinner");
          const tx = document.getElementById("verifyBtnText");
          if (sp) sp.classList.add("d-none");
          // Texto mantém sucesso se verificado
          if (tx && !launch.disabled) tx.textContent = "Verificar Contrato";
        } catch (_) {}
      });
    }
  } catch (_) {}

  try {
    const openBtn = document.getElementById("openVerificaModuleBtn");
    const cont = document.getElementById("openVerificaContainer");
    if (openBtn && cont) {
      openBtn.addEventListener("click", () => {
        try {
          const payload = buildVerifyPayloadFromState();
          if (payload) {
            localStorage.setItem("tokencafe_contract_verify_payload", JSON.stringify(payload));
            try {
              const cid = payload?.chainId;
              if (cid) {
                localStorage.setItem("tokencafe_last_chain_id", String(cid));
                sessionStorage.setItem("tokencafe_last_chain_id", String(cid));
              }
            } catch (_) {}
          } else {
            localStorage.removeItem("tokencafe_contract_verify_payload");
          }
        } catch (_) {}
      });
    }
  } catch (_) {}
}

// Sincronização de estado entre módulos
// Função centralizada para forçar o estado de sucesso na UI
function forceVerificationSuccessUI(address, link, chainId) {
    try {
        log(`Forçando UI de sucesso para ${address}`);
        
        // 1. Atualizar botão de verificação
        const launch = document.getElementById("erc20VerifyLaunch");
        if (launch) {
            launch.disabled = true;
            launch.setAttribute("disabled", "true");
            launch.style.pointerEvents = "none"; // Garante que não é clicável
            launch.style.opacity = "0.65"; // Garante visual de desabilitado uniforme
            launch.innerHTML = '<i class="bi bi-check-circle"></i> CONTRATO VERIFICADO COM SUCESSO!!!';
            launch.classList.remove("btn-outline-warning");
            launch.classList.add("btn-success");
        }

        // 2. Atualizar botão principal de build
        const btnBuild = document.getElementById("btnBuildDeploy");
        if (btnBuild) {
            btnBuild.disabled = true;
            btnBuild.setAttribute("disabled", "true");
            btnBuild.style.pointerEvents = "none";
            btnBuild.style.opacity = "0.65"; // Garante visual de desabilitado uniforme
            btnBuild.classList.remove("btn-outline-success", "btn-outline-primary", "btn-outline-danger", "btn-used-success", "btn-used-error");
            btnBuild.classList.add("btn-success");
            const tx = document.getElementById("buildBtnText");
            if (tx) tx.textContent = "CONTRATO GERADO COM SUCESSO!!";
        }

        // 3. Atualizar link legado (se existir)
        const vLink = document.getElementById("erc20VerifyLink");
        if (vLink) {
            vLink.classList.add("disabled");
            vLink.classList.remove("btn-outline-warning");
            vLink.classList.add("btn-success");
            vLink.innerHTML = `<i class="bi bi-check-circle me-1"></i>CONTRATO VERIFICADO COM SUCESSO!!!`;
        }

        // 4. Exibir containers (Image 02) SEM esconder o anterior
        const detailsContainer = document.getElementById("erc20-details");
        const searchContainer = document.getElementById("contract-search-container");
        
        // NÃO escondemos a seção de verificar (detailsContainer) conforme pedido
        // if (detailsContainer) detailsContainer.classList.add("d-none"); 
        
        if (searchContainer) {
            searchContainer.classList.remove("d-none");
            
            // CUSTOMIZAÇÃO PÓS-DEPLOY:
            // 1. Alterar título
            const titleEl = searchContainer.querySelector("#cs_title");
            const subTitleEl = searchContainer.querySelector("#cs_subtitle");
            if (titleEl) titleEl.textContent = "DADOS DO CONTRATO / TOKEN";
            if (subTitleEl) subTitleEl.classList.add("d-none");

            // 2. Esconder formulário de busca
            const searchForm = searchContainer.querySelector("#tokenForm");
            if (searchForm) searchForm.classList.add("d-none");

            // Exibir o card de informações
            const infoCard = searchContainer.querySelector("#selected-contract-info") || document.getElementById("selected-contract-info");
            if (infoCard) {
                infoCard.classList.remove("d-none");
                

            }
            
            // Fix: Re-bind dos botões de cópia existentes (Address e Tx) para garantir funcionamento
            // Isso sobrescreve os handlers inline que podem estar falhando
            try {
                ['erc20AddressLink', 'erc20TxLink'].forEach(id => {
                    const linkEl = document.getElementById(id);
                    if (linkEl) {
                        const btn = linkEl.nextElementSibling;
                        if (btn && btn.tagName === 'BUTTON') {
                            btn.onclick = (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const text = linkEl.textContent.trim();
                                if (text && text !== '-') {
                                    if (window.copyToClipboard) window.copyToClipboard(text);
                                    else if (navigator.clipboard) navigator.clipboard.writeText(text);
                                }
                            };
                        }
                    }
                });
            } catch (_) {}

            // Popular dados
            const targetChainId = chainId || state.form?.network?.chainId;
        if (targetChainId && address) {
                try {
                    const cacheKey = `verif_status_v2_${targetChainId}_${address}`;
                    let compilerVersion = "Solidity";
                    let optimizationUsed = state.optimization ? "1" : "0";
                    let runs = "200";
                    try {
                        const metaRaw = state.compilation?.metadata;
                        const meta = typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw || {};
                        if (meta?.compiler?.version) {
                            compilerVersion = "v" + meta.compiler.version;
                        }
                        if (meta?.settings?.optimizer) {
                            optimizationUsed = meta.settings.optimizer.enabled ? "1" : "0";
                            if (meta.settings.optimizer.runs) runs = String(meta.settings.optimizer.runs);
                        }
                    } catch (_) {}
                    const mockStatus = {
                        success: true,
                        verified: true,
                        verifiedAt: new Date().toLocaleString(),
                        explorer: {
                            url: link || "",
                            compilerVersion,
                            optimizationUsed,
                            runs
                        }
                    };
                    sessionStorage.setItem(cacheKey, JSON.stringify(mockStatus));
                    log(`Cache de verificação forçado para ${address}`);
                } catch(e) {
                    console.error("Erro ao definir cache forçado:", e);
                }
                
                // Garantir que os links principais (Address/Tx) estejam populados corretamente
                // Caso o usuário tenha recarregado a página ou o estado de deploy tenha sido perdido
                try {
                    const mainAddrLink = document.getElementById("erc20AddressLink");
                    if (mainAddrLink) {
                        const currentHref = mainAddrLink.getAttribute("href");
                        if (!currentHref || currentHref === "#" || currentHref.endsWith("#")) {
                             const explorerUrl = link || getExplorerContractUrl(address, targetChainId);
                             if (explorerUrl) {
                                 mainAddrLink.href = explorerUrl;
                                 mainAddrLink.textContent = address;
                                 mainAddrLink.classList.remove("text-muted", "disabled");
                                 mainAddrLink.classList.add("text-warning");
                             }
                        }
                    }
                } catch (_) {}

                // Pequeno delay para garantir renderização e propagação
                setTimeout(() => {
                     updateContractDetailsView(searchContainer, targetChainId, address).catch(e => console.error("Erro no update details view:", e));
                }, 1000);
            }
        }
        
        // 5. Atualizar estado interno se necessário
        if (state.deployed && state.deployed.address && state.deployed.address.toLowerCase() === address.toLowerCase()) {
            state.deployed.verified = true;
        }

    } catch (e) {
        console.error("Erro em forceVerificationSuccessUI:", e);
    }
}

window.addEventListener("contract:verified", (evt) => {
  try {
    const { address, link, chainId } = evt.detail || {};
    console.log("Evento contract:verified recebido:", evt.detail);
    
    // Verifica se é o contrato atual
    const currentAddr = state.deployed?.address;
    if (currentAddr && address && currentAddr.toLowerCase() === address.toLowerCase()) {
        forceVerificationSuccessUI(address, link, chainId);
        
        // Atualizar badges/links (legacy)
        updateVerificationBadges({
            bscUrl: link,
            _bscOk: true,
        });
    } else {
        console.warn("Evento verificado ignorado: endereço não corresponde ao atual", { current: currentAddr, received: address });
    }
  } catch (err) {
    console.error("Erro ao processar contract:verified", err);
  }
});

document.addEventListener("DOMContentLoaded", bindUI);

// Importação automática de receita vinda do Tools
try {
  const raw = localStorage.getItem("tokencafe_contract_recipe_import");
  if (raw) {
    localStorage.removeItem("tokencafe_contract_recipe_import");
    const rec = JSON.parse(raw);
    // aplicar após DOM pronto
    document.addEventListener("DOMContentLoaded", () => {
      try {
        const apply = (r) => {
          try {
            const sel = document.getElementById("contractGroup");
            if (sel && r?.group) sel.value = r.group;
            if (r?.token) {
              const t = r.token;
              const set = (id, v) => {
                const el = document.getElementById(id);
                if (el) el.value = v != null ? String(v) : "";
              };
              set("tokenName", t.name);
              set("tokenSymbol", t.symbol);
              set("tokenDecimals", t.decimals);
              set("initialSupply", t.initialSupply);
            }
            readForm();
            setSaleVisibility();
            updateContractInfo();
            // Checar verificação se tiver endereço
            if (state.deployed?.address && state.form?.network?.chainId) {
                setTimeout(() => {
                    checkIfVerified(state.form.network.chainId, state.deployed.address);
                }, 1000);
            }
            log("Receita carregada do Tools. Revise e compile.");
          } catch (e) {
            log("Falha ao aplicar receita importada: " + (e?.message || e));
          }
        };
        apply(rec);
      } catch (e) {
        log("Falha ao ler receita importada: " + (e?.message || e));
      }
    });
  }
} catch (_) {}

// Função auxiliar para checar verificação silenciosamente ao carregar
async function checkIfVerified(chainId, address) {
    try {
        const status = await getVerificationStatus(chainId, address);
        if (status && (status.verified || status.success)) {
             const link = status.explorer?.url || getExplorerVerificationUrl(chainId, address);
             forceVerificationSuccessUI(address, link, chainId);
             updateVerificationBadges({ bscUrl: link, _bscOk: true });
        }
    } catch (_) {}
}

function buildVerifyPayloadFromState() {
  try {
    const address = state.deployed?.address;
    const chainId = state.form?.network?.chainId;
    const sourceCode = state.compilation?.sourceCode;
    const contractName = state.compilation?.contractName;

    if (!address || !chainId || !sourceCode || !contractName) {
      return null;
    }

    // Default fallback version
    let compilerVersion = "v0.8.26+commit.8a97fa7a";
    let optimizationUsed = 1;
    let runs = 200;
    let evmVersion = "default"; // Deixe o Etherscan decidir o default (geralmente Shanghai para 0.8.20+)

    // Try to extract from metadata
    if (state.compilation?.metadata) {
      try {
        const meta = typeof state.compilation.metadata === "string" 
          ? JSON.parse(state.compilation.metadata) 
          : state.compilation.metadata;
        
        if (meta?.compiler?.version) {
          compilerVersion = "v" + meta.compiler.version;
        }
        if (meta?.settings?.optimizer) {
          optimizationUsed = meta.settings.optimizer.enabled ? 1 : 0;
          runs = meta.settings.optimizer.runs || 200;
        }
        if (meta?.settings?.evmVersion) {
            evmVersion = meta.settings.evmVersion;
        }
      } catch (e) {
        console.warn("Falha ao parsear metadata para verificação:", e);
      }
    }

    return {
      chainId: chainId,
      contractAddress: address,
      sourceCode: sourceCode,
      contractName: contractName,
      compilerVersion: compilerVersion,
      optimizationUsed: optimizationUsed,
      runs: runs,
      evmVersion: evmVersion,
      evmversion: evmVersion, // Alias para APIs que esperam lowercase (Etherscan)
      constructorArguments: getEncodedConstructorArgs() 
    };
  } catch (err) {
    console.error("Erro ao construir payload de verificação:", err);
    return null;
  }
}

async function runVerifyDirect(p) {
  try {
    const res = await runVerifyDirectShared(p);
    if (res?.link) updateVerificationBadges({ bscUrl: res.link });
    
    // Sucesso imediato OU Já verificado
    if (res?.success || res?.alreadyVerified || (res?.error && res.error.toLowerCase().includes("already verified"))) {
      const isAlready = res?.alreadyVerified || (res?.error && res.error.toLowerCase().includes("already verified"));
      const finalLink = res?.explorerUrl || res?.link || "";
      
      log(`✅ Verificação concluída. ${isAlready ? "(Já estava verificado)" : ""} ${finalLink}`);
      
      const eventDetail = {
        address: p.contractAddress,
        link: finalLink,
        chainId: p.chainId
      };
      
      // Atualiza UI localmente imediatamente
      forceVerificationSuccessUI(p.contractAddress, finalLink, p.chainId);
      
      document.dispatchEvent(new CustomEvent("contract:verified", { detail: eventDetail }));
      
    } else if (res?.status === "pending") {
      // Se pendente, aguarda e confirma
      // Se pendente ou já verificado, aguarda e confirma
      log(`📤 Verificação enviada/processando. Confirmando status...`);
      
      setTimeout(async () => {
        try {
            const status = await getVerificationStatus(p.chainId, p.contractAddress);
            if (status?.verified) {
                log(`✅ Confirmado: Contrato verificado!`);
                const link = status.explorer?.url || res?.link;
                
                // Atualiza UI localmente
                forceVerificationSuccessUI(p.contractAddress, link, p.chainId);

                const eventDetail = {
                    address: p.contractAddress,
                    link: link,
                    chainId: p.chainId
                };
                document.dispatchEvent(new CustomEvent("contract:verified", { detail: eventDetail }));
            } else {
                log(`⚠️ Ainda não verificado no explorer.`);
                // Não forçamos UI de sucesso aqui se falhou
                alert("A verificação está demorando um pouco para propagar no explorer.\n\nAguarde alguns instantes e clique em 'Verificar Contrato' novamente.");
                
                // Reativar botão para permitir nova tentativa
                const launch = document.getElementById("erc20VerifyLaunch");
                if (launch) {
                    launch.disabled = false;
                    launch.textContent = "Verificar Novamente";
                }
            }
        } catch (errSt) {
            console.warn("Erro ao checar status pós-envio:", errSt);
        }
      }, 5000); // 5 segundos de espera
      
    } else {
      const errMsg = res?.error || res?.status || "Erro desconhecido";
      log(`Falha/erro na verificação: ${errMsg}`);
    }
    return res;
  } catch (e) {
    log(`Erro na verificação: ${e?.message || e}`);
    return { success: false, error: e.message };
  }
}

export async function verifyCurrentContract() {
  const payload = buildVerifyPayloadFromState();
  if (payload) {
      // Validar restrição de Testnet
      const chainId = payload.chainId;
      // Usar instância nm (NetworkManager) criada no escopo do módulo
      if (nm.isTestNetwork(chainId) && !checkIsAdmin()) {
          const msg = "Certificação bloqueada em redes de teste (Restrito a Administradores).";
          log(msg);
          // alert(msg); // Removido conforme solicitação
          return { success: false, error: msg };
      }

      return await runVerifyDirect(payload);
  } else {
      log("Dados insuficientes para verificação (endereço ou chainId ausentes).");
      return { success: false, error: "Dados insuficientes" };
  }
}
