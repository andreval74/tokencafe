// Contracts Builder
// Layout e UX alinhados ao LINK-INDEX e ao 20lab.app.
// Integra com carteira via ethers, usa busca de rede unificada e entradas decimais.

const $ = (sel) => document.querySelector(sel);
const unused$$ = (sel) => Array.from(document.querySelectorAll(sel));
function getDeployButton() {
  try {
    return document.getElementById("btnDeploy") || document.getElementById("btnBuildDeploy");
  } catch (_) {
    return null;
  }
}
import { getExplorerContractUrl, getExplorerTxUrl, getExplorerVerificationUrl } from "./explorer-utils.js";
import { getVerifyApiKey, getApiBase as getApiBaseShared, runVerifyDirect as runVerifyDirectShared } from "../../shared/verify-utils.js";
import { SharedUtilities } from "../../core/shared_utilities_es6.js";
import { addTokenToMetaMask } from "../../shared/metamask-utils.js";

// Estado simples do módulo
const state = {
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
    vanity: {
      mode: "none",
      custom: "",
    },
  },
  validated: false,
  deployed: {
    address: null,
    transactionHash: null,
  },
};

function log(msg) {
  try {
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
  } catch (_) {}
}

// Informações dos grupos de contrato e compatibilidade
const CONTRACT_GROUPS = {
  "erc20-minimal": {
    title: "ERC20-Minimal",
    summary: "Token ERC20 básico com mint inicial e sem controles extras.",
    features: ["Transferências padrão", "Supply inicial mintado ao deployer"],
    saleIntegration: false,
    order: ["Token"],
    notes: "Ideal para começar simples. Complementos podem ser adicionados em versões upgradeáveis.",
  },
  "erc20-controls": {
    title: "ERC20-Controls",
    summary: "Token ERC20 com controles (pausable, blacklist/whitelist dependendo da configuração).",
    features: ["Pausar transferências", "Controles de acesso"],
    saleIntegration: false,
    order: ["Token"],
    notes: "Exige entendimento de funções administrativas. Bom para governança mínima.",
  },
  "erc20-directsale": {
    title: "ERC20-DirectSale",
    summary: "Token com venda direta embutida (compra em moeda nativa, parâmetros decimais).",
    features: ["Preço por token", "Compra mínima/máxima", "Recebimento em carteira definida"],
    saleIntegration: true,
    order: ["Token", "Venda"],
    notes: "Fluxo sequencial: primeiro token, depois venda direta. Valores aceitam decimais.",
  },
  "upgradeable-uups": {
    title: "Upgradeable-UUPS (OmniToken)",
    summary: "Token upgradeável via UUPS, permitindo evolução e módulos futuros.",
    features: ["Proxy UUPS", "Atualizações seguras", "Pode integrar venda"],
    saleIntegration: true,
    order: ["Proxy", "Implantação lógica", "Venda (opcional)"],
    notes: "Base + complementos em ordem definida. Complementos dependem do estado atual do proxy.",
  },
  "tokensale-separado": {
    title: "TokenSale-Separado",
    summary: "Contrato de venda separado, vinculado a um token existente.",
    features: ["Vende token existente", "Parâmetros decimais", "Carteira de recebimento"],
    saleIntegration: true,
    order: ["Token existente", "Venda"],
    notes: "Requer endereço do token existente. Se não houver, este grupo não é aplicável.",
  },
};

function updateContractInfo() {
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
  const show = ["erc20-directsale", "upgradeable-uups"].includes(state.form.group);
  const node = $("#saleParams");
  if (node) node.classList.toggle("d-none", !show);
}

function updateVanityVisibility() {
  const modeEl = $("#vanityMode");
  const mode = modeEl ? modeEl.value : "none";
  const customBox = $("#vanityCustomContainer");
  const showCustom = ["prefix-custom", "suffix-custom"].includes(mode);
  if (customBox) customBox.classList.toggle("d-none", !showCustom);
  const helpEl = $("#vanityHelp");
  if (helpEl) helpEl.classList.toggle("d-none", !showCustom);
}

function readForm() {
  state.form.group = $("#contractGroup").value;
  state.form.token.name = String($("#tokenName").value || "").replace(/\s+$/u, "");
  state.form.token.symbol = String($("#tokenSymbol").value || "").replace(/\s+$/u, "").toUpperCase();
  state.form.token.decimals = parseInt($("#tokenDecimals").value || "18", 10);
  {
    const raw = String($("#initialSupply").value || "").replace(/\s+$/u, "");
    const sanitized = raw.replace(/[^0-9]/g, "");
    state.form.token.initialSupply = parseInt(sanitized || "0", 10);
  }

  // Entradas decimais (strings), não usar wei. Conversão será feita no backend.
  state.form.sale.priceDec = String($("#tokenPriceDec").value || "").replace(/\s+$/u, "");
  state.form.sale.minDec = String($("#minPurchaseDec").value || "").replace(/\s+$/u, "");
  state.form.sale.maxDec = String($("#maxPurchaseDec").value || "").replace(/\s+$/u, "");
  state.form.sale.capUnits = BigInt($("#perWalletCap").value || "0");
  state.form.sale.payoutWallet = String($("#payoutWallet").value || "").replace(/\s+$/u, "");

  state.form.vanity.mode = $("#vanityMode").value;
  state.form.vanity.custom = String($("#vanityCustom").value || "").replace(/\s+$/u, "");
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

function validateForm() {
  readForm();
  const errors = [];

  if (!state.form.token.name) errors.push("Nome do token é obrigatório.");
  if (!state.form.token.symbol) errors.push("Símbolo do token é obrigatório.");
  if (!/^[A-Z0-9]{3,8}$/.test(state.form.token.symbol)) {
    errors.push("Símbolo deve conter 3–8 caracteres A–Z e 0–9 (sem especiais).");
  }
  if (state.form.token.decimals < 0 || state.form.token.decimals > 18) {
    errors.push("Decimais devem estar entre 0 e 18.");
  }
  if (state.form.token.initialSupply < 0) errors.push("Supply inicial deve ser ≥ 0.");

  // Venda quando aplicável (entradas decimais)
  if (["erc20-directsale", "upgradeable-uups"].includes(state.form.group)) {
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

function validateTokenNameInline() {
  const el = getEl("tokenName");
  const v = String(el?.value || "");
  if (!v) return setFieldInvalid(el, "Informe o nome do token.");
  return clearFieldInvalid(el);
}

function validateTokenSymbolInline() {
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

function validateTokenDecimalsInline() {
  const el = getEl("tokenDecimals");
  const val = parseInt(el?.value || "18", 10);
  if (!Number.isFinite(val) || val < 0 || val > 18) {
    return setFieldInvalid(el, "Decimais devem estar entre 0 e 18.");
  }
  return clearFieldInvalid(el);
}

function validateInitialSupplyInline() {
  const el = getEl("initialSupply");
  const val = parseInt(el?.value || "0", 10);
  if (!Number.isFinite(val) || val < 0) {
    return setFieldInvalid(el, "Supply inicial deve ser ≥ 0.");
  }
  return clearFieldInvalid(el);
}

function validateSaleInline() {
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

function runAllFieldValidation() {
  let ok = true;
  ok = validateTokenNameInline() && ok;
  ok = validateTokenSymbolInline() && ok;
  ok = validateTokenDecimalsInline() && ok;
  ok = validateInitialSupplyInline() && ok;
  ok = validateSaleInline() && ok;
  // vanity custom já tem validação/sanitização própria; manter comportamento atual
  return ok;
}

async function unusedConnectWallet() {
  try {
    if (!window.ethereum) {
      log("MetaMask não encontrada. Instale a extensão para continuar.");
      return;
    }
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const { chainId } = await provider.getNetwork();
    state.wallet = { provider, signer, address, chainId };
    log(`Carteira conectada: ${address} (chainId ${chainId})`);
  } catch (err) {
    log(`Falha ao conectar carteira: ${err.message || err}`);
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
  const url = `${apiBase}/health`;
  const start = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 7000);
    const resp = await fetch(url, { method: "GET", signal: controller.signal });
    clearTimeout(t);
    const ms = Date.now() - start;
    if (resp.ok) {
      let info = "";
      try {
        const txt = await resp.text();
        info = txt ? ` | Body: ${txt.slice(0, 120)}...` : "";
      } catch (_) {}
      log(`Conectividade OK: GET /health (${resp.status}) em ${ms}ms${info}`);
      return true;
    } else {
      log(`Conectividade falhou: GET /health retornou ${resp.status} em ${ms}ms`);
      return false;
    }
  } catch (err) {
    const ms = Date.now() - start;
    const msg = err?.message || String(err);
    log(`Conectividade falhou: GET /health erro (${msg}) em ${ms}ms`);
    if (msg.includes("Failed to fetch") || msg.includes("abort")) {
      const pageProto = window.location.protocol;
      const apiProto = (() => {
        try {
          return new URL(apiBase).protocol;
        } catch {
          return "unknown:";
        }
      })();
      log(`Dica: verifique CORS e mixed content. Página: ${pageProto}, API: ${apiProto}, online=${navigator.onLine}`);
    }
    return false;
  }
}

async function fetchWithDiagnostics(url, options = {}) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutMs = options.timeoutMs || 15000;
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

function unusedGenerateTokenSource(name, symbol, decimals, totalSupplyInt) {
  // Redireciona para a versão corrigida V2
  return generateTokenSourceV2(name, symbol, decimals, totalSupplyInt);
}

// V2: fonte ERC-20 corrigida para fallback de compilação
function generateTokenSourceV2(name, symbol, decimals, totalSupplyInt) {
  try {
    const contractName = sanitizeContractName(name);
    const d = parseInt(decimals, 10);
    const ts = parseInt(totalSupplyInt, 10);
    const src = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.26;\n\ncontract ${contractName} {\n    string public name = "${String(name)}";\n    string public symbol = "${String(symbol)}";\n    uint8 public decimals = ${d};\n    uint256 public totalSupply;\n\n    mapping(address => uint256) public balanceOf;\n    mapping(address => mapping(address => uint256)) public allowance;\n\n    event Transfer(address indexed from, address indexed to, uint256 value);\n    event Approval(address indexed owner, address indexed spender, uint256 value);\n\n    constructor() {\n        totalSupply = ${ts} * 10**decimals;\n        balanceOf[msg.sender] = totalSupply;\n        emit Transfer(address(0), msg.sender, totalSupply);\n    }\n\n    function transfer(address to, uint256 value) public returns (bool) {\n        require(balanceOf[msg.sender] >= value, "Insufficient balance");\n        balanceOf[msg.sender] -= value;\n        balanceOf[to] += value;\n        emit Transfer(msg.sender, to, value);\n        return true;\n    }\n\n    function approve(address spender, uint256 value) public returns (bool) {\n        allowance[msg.sender][spender] = value;\n        emit Approval(msg.sender, spender, value);\n        return true;\n    }\n\n    function transferFrom(address from, address to, uint256 value) public returns (bool) {\n        require(balanceOf[from] >= value, "Insufficient balance");\n        require(allowance[from][msg.sender] >= value, "Allowance exceeded");\n        balanceOf[from] -= value;\n        balanceOf[to] += value;\n        allowance[from][msg.sender] -= value;\n        emit Transfer(from, to, value);\n        return true;\n    }\n}`;
    return { contractName, sourceCode: src.trim() };
  } catch (_) {
    const fallbackName = sanitizeContractName("Token");
    const src = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.26;\n\ncontract ${fallbackName} {\n    string public name = "Token";\n    string public symbol = "TKN";\n    uint8 public decimals = 18;\n    uint256 public totalSupply;\n\n    mapping(address => uint256) public balanceOf;\n    mapping(address => mapping(address => uint256)) public allowance;\n\n    event Transfer(address indexed from, address indexed to, uint256 value);\n    event Approval(address indexed owner, address indexed spender, uint256 value);\n\n    constructor() {\n        totalSupply = 1000000 * 10**decimals;\n        balanceOf[msg.sender] = totalSupply;\n        emit Transfer(address(0), msg.sender, totalSupply);\n    }\n}`;
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
    deployServer: await probeEndpoint(apiBase, "/api/deploy-server"),
    verifyBscscan: await probeEndpoint(apiBase, "/api/verify-bscscan"),
    verifySourcify: await probeEndpoint(apiBase, "/api/verify-sourcify"),
    verifyPrivate: await probeEndpoint(apiBase, "/api/verify-private"),
    logRecipe: await probeEndpoint(apiBase, "/api/log-recipe"),
  };
  renderApiStatus(statusMap);
}

const API_BASE = getApiBase();
async function compileContract() {
  // Validação visual inline dos campos
  const ok = runAllFieldValidation() && validateForm();
  if (!ok) {
    log("Corrija os erros nos campos antes de compilar.");
    return;
  }
  try {
    let base = getApiBase();
    const okConn = await checkApiConnectivity(base);
    if (!okConn) {
      const local = "http://localhost:3000";
      base = local;
      setApiBase(local);
    }

    readForm();
    const name = state.form.token.name || "MyToken";
    const symbol = state.form.token.symbol || "MTK";
    const decimals = Number.isFinite(state.form.token.decimals) ? state.form.token.decimals : 18;
    const totalSupply = Number.isFinite(state.form.token.initialSupply) ? state.form.token.initialSupply : 0;

    const payload = { name, symbol, totalSupply, decimals };
    log(`Compilando contrato via API: ${name} (${symbol}), supply ${totalSupply}, decimais ${decimals}...`);
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
    log(`Compilação concluída com sucesso. ABI e bytecode prontos (${state.compilation.contractName}).`);

    {
      const d = getDeployButton();
      if (d) d.disabled = false;
    }
    try {
      const nm = state.form?.token?.name || "MyToken";
      const sym = state.form?.token?.symbol || "TKN";
      const dec = Number.isFinite(state.form?.token?.decimals) ? state.form.token.decimals : 18;
      const supHuman = formatPtBR(state.form?.token?.initialSupply ?? 0);
      updateERC20Details(sym, nm, dec, supHuman, "Compilado (artefatos prontos)", true);
    } catch (_) {}
    try {
      const c = document.getElementById("btnCompile");
      if (c) c.disabled = true;
    } catch (_) {}
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
        const totalSupplyInt = typeof totalSupplyRaw === "string" ? parseInt(totalSupplyRaw, 10) : Number(totalSupplyRaw);
        log(`Tentando fallback: gerar código local e compilar (${base}/api/compile-only)...`);
        const src = generateTokenSourceV2(name, symbol, decimals, totalSupplyInt);
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
        try {
          const c = document.getElementById("btnCompile");
          if (c) c.disabled = true;
        } catch (_) {}
        return; // encerrar após fallback com sucesso
      } catch (fbErr) {
        log(`Fallback de compilação falhou: ${fbErr?.message || fbErr}`);
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
        const totalSupplyInt = typeof totalSupplyRaw === "string" ? parseInt(totalSupplyRaw, 10) : Number(totalSupplyRaw);
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
      } catch (fbErr) {
        log(`Fallback de compilação falhou: ${fbErr?.message || fbErr}`);
      }
    }
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

async function deployPlaceholder() {
  const ok = runAllFieldValidation() && validateForm();
  if (!ok) {
    log("Corrija os erros nos campos antes de fazer o deploy.");
    return;
  }
  startOpStatus("Deploy em andamento");
  // Se temos artefatos compilados, preferir deploy via servidor
  if (state.compilation?.abi && state.compilation?.bytecode) {
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
          constructorArgs: [],
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
    log("Conecte sua carteira para realizar o deploy pelo MetaMask.");
    stopOpStatus("Carteira não conectada");
    return;
  }
  // Garantir que a rede selecionada corresponde à rede atual da carteira
  const selectedChainId = state.form?.network?.chainId;
  if (!selectedChainId) {
    log("Selecione a rede no topo antes de prosseguir com o deploy.");
    stopOpStatus("Rede não selecionada");
    return;
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
          return;
        }
        log(`Rede alterada com sucesso para chainId ${afterSwitch.chainId}.`);
      } catch (err) {
        log(`Falha ao trocar rede automaticamente. Troque manualmente para ${state.form.network?.name} (chainId ${selectedChainId}). Erro: ${err?.message || err}`);
        stopOpStatus("Falha ao trocar rede");
        return;
      }
    }
  } catch (e) {
    log(`Erro ao checar rede da carteira: ${e?.message || e}`);
    stopOpStatus("Erro ao checar rede");
    return;
  }
  // Deploy real via MetaMask (cliente) usando ethers.js
  try {
    if (!state.compilation?.abi || !state.compilation?.bytecode) {
      log("Compile o contrato antes do deploy. ABI/bytecode ausentes.");
      stopOpStatus("ABI/bytecode ausentes");
      return;
    }
    if (!state.wallet?.signer) {
      log("Conecte sua carteira para assinar o deploy no MetaMask.");
      stopOpStatus("Carteira não conectada");
      return;
    }

    const abi = state.compilation.abi;
    const bytecode = state.compilation.bytecode;
    const signer = state.wallet.signer;

    log("Preparando contrato para deploy com MetaMask...");
    startOpStatus("Deploy via MetaMask");
    const factory = new ethers.ContractFactory(abi, bytecode, signer);

    // Tentar estimar gas para o deploy; usar fallback se falhar
    let overrides = {};
    try {
      const deployTx = factory.getDeployTransaction();
      const estimated = await signer.estimateGas(deployTx);
      // pequeno buffer (+20%) para evitar underestimation
      const buff = estimated.mul ? estimated.mul(120).div(100) : estimated * 1.2;
      overrides.gasLimit = buff;
      log(`Gas estimado para deploy: ${estimated.toString ? estimated.toString() : String(estimated)} (com buffer).`);
    } catch (e) {
      overrides.gasLimit = 2000000;
      log("Falha na estimativa de gas, usando gasLimit padrão 2,000,000.");
    }

    log("Enviando transação de deploy pelo MetaMask...");
    const contract = await factory.deploy(overrides);
    const tx = contract.deployTransaction;
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
      if (payload) await runVerifyDirect(payload);
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

// Atualiza links de contrato e transação na UI abaixo dos botões
function updateDeployLinks(contractUrl, txUrl) {
  try {
    const aAddr = document.getElementById("erc20Address");
    const aTx = document.getElementById("erc20TxHash");
    const container = document.getElementById("erc20-details");
    const addrVal = state.deployed?.address || null;
    const txVal = state.deployed?.transactionHash || null;
    if (aAddr) {
      aAddr.href = contractUrl || "#";
      aAddr.textContent = addrVal || "-";
      aAddr.classList.toggle("disabled", !contractUrl);
    }
    if (aTx) {
      aTx.href = txUrl || "#";
      aTx.textContent = txVal || "-";
      aTx.classList.toggle("disabled", !txUrl);
    }
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
    let url = null;
    url = bscUrl || sourUrl || (addrVerify && chainIdVerify ? getExplorerVerificationUrl(addrVerify, chainIdVerify) : null);
    if (link) {
      link.href = url || "#";
      const clickable = !!(addrVerify && chainIdVerify);
      link.classList.toggle("disabled", !clickable);
      try {
        const hasMeta = !!state?.compilation?.metadata;
        const netName = state.form?.network?.name || (chainIdVerify ? getNetworkNameByChainId(chainIdVerify) : "-") || "-";
        link.textContent = `${hasMeta ? "Verificar automaticamente" : "Abrir verificação"} (${netName})`;
        link.title = hasMeta ? "Verificação automática via Sourcify" : "Abrir verificador do explorer da rede";
        if (window.bootstrap?.Tooltip) new bootstrap.Tooltip(link);
      } catch (_) {}
    }
  } catch (_) {}
}

function getNetworkNameByChainId(chainId) {
  try {
    const nm = window.networkManager;
    const net = nm?.getNetworkById?.(chainId);
    return net?.name || `chainId ${chainId}`;
  } catch (_) {
    return `chainId ${chainId}`;
  }
}

let opTimer = null;
let opStartedAt = 0;
function setStatusContainerVisible() {
  try {
    const c = document.getElementById("erc20-details");
    if (c) c.classList.remove("d-none");
  } catch (_) {}
}
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
    setStatusContainerVisible();
    const st = document.getElementById("contractStatus");
    if (st) st.textContent = `${message} — tempo: 0:00`;
    if (opTimer) clearInterval(opTimer);
    opTimer = setInterval(() => {
      try {
        const el = document.getElementById("contractStatus");
        if (el) el.textContent = `${message} — tempo: ${formatElapsed(Date.now() - opStartedAt)}`;
      } catch (_) {}
    }, 1000);
  } catch (_) {}
}
function updateOpStatus(message) {
  try {
    const st = document.getElementById("contractStatus");
    if (st) st.textContent = `${message} — tempo: ${formatElapsed(Date.now() - opStartedAt)}`;
  } catch (_) {}
}
function stopOpStatus(finalMessage) {
  try {
    if (opTimer) {
      clearInterval(opTimer);
      opTimer = null;
    }
    const st = document.getElementById("contractStatus");
    if (st) st.textContent = `${finalMessage} — tempo: ${formatElapsed(Date.now() - opStartedAt)}`;
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
    if (elSym) elSym.textContent = symbol ?? elSym.textContent ?? "-";
    if (elName) elName.textContent = name ?? elName.textContent ?? "-";
    if (elDec) elDec.textContent = decimals != null ? String(decimals) : (elDec.textContent ?? "-");
    if (elSup) elSup.textContent = supply != null ? String(supply) : (elSup.textContent ?? "-");
    container.classList.toggle("d-none", !visible);
    if (state.deployed?.address) container.classList.remove("d-none");
  } catch {}
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
    // Não ajustar automaticamente a seleção de rede ou campo de busca
  } catch (err) {
    // silencioso
  }
}

async function bindUI() {
  // grupo altera visibilidade de venda
  $("#contractGroup").addEventListener("change", () => {
    readForm();
    setSaleVisibility();
    updateContractInfo();
    // Revalidar campos de venda quando o grupo muda
    validateSaleInline();
  });
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
      await deployPlaceholder();
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
          const qs = (addr && cid)
            ? `?address=${encodeURIComponent(addr)}&chainId=${encodeURIComponent(String(cid))}&name=${encodeURIComponent(nm)}&symbol=${encodeURIComponent(sym)}&decimals=${encodeURIComponent(String(dec))}&explorer=${encodeURIComponent(expBase)}&image=${encodeURIComponent(img)}${rpcParam ? `&rpc=${encodeURIComponent(rpcParam)}` : ""}`
            : "";
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
        await compileContract();
        updateOpStatus("Deployando...");
        await deployPlaceholder();
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
            const qs = (addr && cid)
              ? `?address=${encodeURIComponent(addr)}&chainId=${encodeURIComponent(String(cid))}&name=${encodeURIComponent(nm)}&symbol=${encodeURIComponent(sym)}&decimals=${encodeURIComponent(String(dec))}&explorer=${encodeURIComponent(expBase)}&image=${encodeURIComponent(img)}${rpcParam ? `&rpc=${encodeURIComponent(rpcParam)}` : ""}`
              : "";
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
          if (sp) sp.classList.add("d-none");
          if (tx) tx.textContent = "Compilar, Deploy e Verifica";
          stopOpStatus("Concluído");
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
  if (btnAddMM)
    btnAddMM.addEventListener("click", async () => {
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
    });

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
        constructorArguments: [],
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

  const unusedBtnPrev = document.querySelector("#btnPreviewFile");
  const btnDownloadSol = document.querySelector("#btnDownloadSol");
  const btnDownloadJson = document.querySelector("#btnDownloadJson");
  const btnDownloadAbi = document.querySelector("#btnDownloadAbi");
  const btnDownloadDeployedBytecode = document.querySelector("#btnDownloadDeployedBytecode");
  function unusedDownloadSol() {
    if (!state?.compilation?.sourceCode) {
      log("Fonte indisponível: compile e faça deploy antes.");
      return;
    }
    const name = (state?.compilation?.contractName || "MyToken").replace(/\s+/g, "");
    const content = state.compilation.sourceCode;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.sol`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    log(`Arquivo baixado: ${name}.sol`);
  }
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
    btnCopyFile.addEventListener("click", () => {
      const { content } = getSelectedFile();
      try {
        navigator.clipboard.writeText(content || "");
        log("Conteúdo copiado.");
      } catch (_) {
        log("Falha ao copiar.");
      }
    });
  if (btnSaveFile)
    btnSaveFile.addEventListener("click", () => {
      downloadSelectedFile();
    });

  function unusedDownloadTextFile(name, content, mime) {
    const blob = new Blob([content], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }
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
            <div class="d-flex gap-2">
              <button id="verifyDlSol" class="btn btn-sm btn-outline-primary">Baixar .sol</button>
              <button id="verifyDlJson" class="btn btn-sm btn-outline-primary">Baixar verificação (.json)</button>
              <button id="verifyDlAbi" class="btn btn-sm btn-outline-primary">Baixar ABI</button>
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
              constructorArguments: [],
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
      const m = new bootstrap.Modal(modalEl);
      m.show();
    } catch (_) {}
  }
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
          } else {
            await runVerifyDirect(payload);
          }
        } catch (e) {
          log("Falha na verificação: " + (e?.message || e));
        }
        try {
          launch.disabled = false;
        } catch (_) {}
        try {
          const sp = document.getElementById("verifySpinner");
          const tx = document.getElementById("verifyBtnText");
          if (sp) sp.classList.add("d-none");
          if (tx) tx.textContent = "Verificar Contrato";
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

function buildVerifyPayloadFromState() {
  try {
    const addrVerify = state.deployed?.address;
    const chainIdVerify = state.form?.network?.chainId;
    const src = state.compilation?.sourceCode;
    const cname = state.compilation?.contractName;
    const meta = state.compilation?.metadata;
    const payload = {
      chainId: chainIdVerify,
      contractAddress: addrVerify,
      contractName: cname,
      sourceCode: src,
      metadata: meta ? JSON.stringify(meta) : undefined,
      compilerVersion: meta?.compiler?.version || null,
      optimizationUsed: true,
      runs: 200,
      codeformat: "solidity-single-file",
      contractNameFQN: cname ? `${cname}.sol:${cname}` : null,
      apiKey: getVerifyApiKey(),
    };
    return payload;
  } catch (_) {
    return null;
  }
}

async function runVerifyDirect(p) {
  try {
    const res = await runVerifyDirectShared(p);
    if (res?.link) updateVerificationBadges({ bscUrl: res.link });
    if (res?.success) {
      log(`✅ Verificação concluída (${res.status}). ${res.link || ""}`);
    } else if (res?.status === "pending") {
      log(`📤 Verificação enviada (explorer). ${res.link || ""}`);
    } else {
      log(`Falha/erro na verificação: ${res?.error || res?.status || "desconhecido"}`);
    }
  } catch (e) {
    log(`Erro na verificação: ${e?.message || e}`);
  }
}
