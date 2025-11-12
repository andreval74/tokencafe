// Contracts Builder
// Layout e UX alinhados ao LINK-INDEX e ao 20lab.app.
// Integra com carteira via ethers, usa busca de rede unificada e entradas decimais.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));
import { getExplorerContractUrl, getExplorerTxUrl, getExplorerVerificationUrl } from './explorer-utils.js';

// Estado simples do módulo
const state = {
  wallet: {
    provider: null,
    signer: null,
    address: null,
    chainId: null,
  },
  form: {
    group: 'erc20-minimal',
    network: null, // definido via network-search
    token: {
      name: '',
      symbol: '',
      decimals: 18,
      initialSupply: 1000000,
    },
    sale: {
      priceDec: '0.001',
      minDec: '0.005',
      maxDec: '1.0',
      capUnits: 0n,
      payoutWallet: '',
      nativeSymbol: '', // preenchido pela rede
      nativeDecimals: 18, // preenchido pela rede
    },
    vanity: {
      mode: 'none',
      custom: '',
    },
  },
  validated: false,
  deployed: {
    address: null,
    transactionHash: null,
  },
};

function log(msg) {
  const out = $('#output');
  const line = `[${new Date().toISOString()}] ${msg}`;
  out.value = `${out.value}\n${line}`.trim();
  out.scrollTop = out.scrollHeight;
}

// Informações dos grupos de contrato e compatibilidade
const CONTRACT_GROUPS = {
  'erc20-minimal': {
    title: 'ERC20-Minimal',
    summary: 'Token ERC20 básico com mint inicial e sem controles extras.',
    features: ['Transferências padrão', 'Supply inicial mintado ao deployer'],
    saleIntegration: false,
    order: ['Token'],
    notes: 'Ideal para começar simples. Complementos podem ser adicionados em versões upgradeáveis.'
  },
  'erc20-controls': {
    title: 'ERC20-Controls',
    summary: 'Token ERC20 com controles (pausable, blacklist/whitelist dependendo da configuração).',
    features: ['Pausar transferências', 'Controles de acesso'],
    saleIntegration: false,
    order: ['Token'],
    notes: 'Exige entendimento de funções administrativas. Bom para governança mínima.'
  },
  'erc20-directsale': {
    title: 'ERC20-DirectSale',
    summary: 'Token com venda direta embutida (compra em moeda nativa, parâmetros decimais).',
    features: ['Preço por token', 'Compra mínima/máxima', 'Recebimento em carteira definida'],
    saleIntegration: true,
    order: ['Token', 'Venda'],
    notes: 'Fluxo sequencial: primeiro token, depois venda direta. Valores aceitam decimais.'
  },
  'upgradeable-uups': {
    title: 'Upgradeable-UUPS (OmniToken)',
    summary: 'Token upgradeável via UUPS, permitindo evolução e módulos futuros.',
    features: ['Proxy UUPS', 'Atualizações seguras', 'Pode integrar venda'],
    saleIntegration: true,
    order: ['Proxy', 'Implantação lógica', 'Venda (opcional)'],
    notes: 'Base + complementos em ordem definida. Complementos dependem do estado atual do proxy.'
  },
  'tokensale-separado': {
    title: 'TokenSale-Separado',
    summary: 'Contrato de venda separado, vinculado a um token existente.',
    features: ['Vende token existente', 'Parâmetros decimais', 'Carteira de recebimento'],
    saleIntegration: true,
    order: ['Token existente', 'Venda'],
    notes: 'Requer endereço do token existente. Se não houver, este grupo não é aplicável.'
  }
};

function updateContractInfo() {
  const box = $('#contractGroupInfo');
  if (!box) return;
  const g = state.form.group || $('#contractGroup').value;
  const info = CONTRACT_GROUPS[g];
  if (!info) { box.innerHTML = ''; return; }
  const saleBadge = info.saleIntegration ? '<span class="badge bg-info ms-1">Inclui venda</span>' : '<span class="badge bg-secondary ms-1">Sem venda</span>';
  box.innerHTML = `
    <div class="alert alert-dark border p-3">
      <div class="d-flex align-items-center mb-1">
        <strong class="small">${info.title}</strong>
        ${saleBadge}
      </div>
      <div class="small mb-2">${info.summary}</div>
      <div class="small text-muted">Ordem: ${info.order.join(' → ')}</div>
      <div class="mt-2 small">Funções: ${info.features.join(', ')}</div>
      <div class="mt-2 small">Notas: ${info.notes}</div>
      <div class="mt-2 small">Complementos liberados quando houver contrato base (futuro).</div>
    </div>
  `;
}

function setSaleVisibility() {
  const show = ['erc20-directsale', 'upgradeable-uups'].includes(state.form.group);
  const node = $('#saleParams');
  if (node) node.classList.toggle('d-none', !show);
}

function updateVanityVisibility() {
  const modeEl = $('#vanityMode');
  const mode = modeEl ? modeEl.value : 'none';
  const customBox = $('#vanityCustomContainer');
  const showCustom = ['prefix-custom', 'suffix-custom'].includes(mode);
  if (customBox) customBox.classList.toggle('d-none', !showCustom);
  const helpEl = $('#vanityHelp');
  if (helpEl) helpEl.classList.toggle('d-none', !showCustom);
}

function readForm() {
  state.form.group = $('#contractGroup').value;
  state.form.token.name = $('#tokenName').value.trim();
  state.form.token.symbol = $('#tokenSymbol').value.trim().toUpperCase();
  state.form.token.decimals = parseInt($('#tokenDecimals').value || '18', 10);
  state.form.token.initialSupply = parseInt($('#initialSupply').value || '0', 10);

  // Entradas decimais (strings), não usar wei. Conversão será feita no backend.
  state.form.sale.priceDec = ($('#tokenPriceDec').value || '').trim();
  state.form.sale.minDec = ($('#minPurchaseDec').value || '').trim();
  state.form.sale.maxDec = ($('#maxPurchaseDec').value || '').trim();
  state.form.sale.capUnits = BigInt($('#perWalletCap').value || '0');
  state.form.sale.payoutWallet = ($('#payoutWallet').value || '').trim();

  state.form.vanity.mode = $('#vanityMode').value;
  state.form.vanity.custom = ($('#vanityCustom').value || '').trim();
}

function validateHex4(str) {
  // Aceitar apenas 0-9 e a-f (case-insensitive). Aviso: não garantimos maiúsculas/minúsculas no endereço.
  return /^[0-9a-f]{4}$/i.test(str);
}

function validateForm() {
  readForm();
  const errors = [];

  if (!state.form.token.name) errors.push('Nome do token é obrigatório.');
  if (!state.form.token.symbol) errors.push('Símbolo do token é obrigatório.');
  if (!/^[A-Z0-9]{3,8}$/.test(state.form.token.symbol)) {
    errors.push('Símbolo deve conter 3–8 caracteres A–Z e 0–9 (sem especiais).');
  }
  if (state.form.token.decimals < 0 || state.form.token.decimals > 18) {
    errors.push('Decimais devem estar entre 0 e 18.');
  }
  if (state.form.token.initialSupply < 0) errors.push('Supply inicial deve ser ≥ 0.');

  // Venda quando aplicável (entradas decimais)
  if (['erc20-directsale', 'upgradeable-uups'].includes(state.form.group)) {
    const toNum = (s) => Number(String(s).replace(',', '.'));
    const price = toNum(state.form.sale.priceDec);
    const min = toNum(state.form.sale.minDec);
    const max = toNum(state.form.sale.maxDec);
    if (!(price > 0)) errors.push('Preço por token deve ser um número decimal > 0.');
    if (min < 0) errors.push('Compra mínima deve ser ≥ 0.');
    if (max < 0) errors.push('Compra máxima deve ser ≥ 0.');
    if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
      errors.push('Compra máxima deve ser ≥ compra mínima.');
    }
    if (state.form.sale.payoutWallet && !/^0x[0-9a-fA-F]{40}$/.test(state.form.sale.payoutWallet)) {
      errors.push('Carteira de recebimento deve ser um endereço válido (0x...).');
    }
  }

  // Vanity
  const { mode, custom } = state.form.vanity;
  if (['prefix-custom', 'suffix-custom'].includes(mode)) {
    if (!validateHex4(custom)) errors.push('Custom deve ser 4 hex válidos (ex.: cafe, beef, dead).');
  }

  if (errors.length) {
    errors.forEach((e) => log(`Erro: ${e}`));
    state.validated = false;
    return false;
  }

  log('Validação concluída com sucesso. Entradas decimais e rede ok.');
  state.validated = true;
  return true;
}

// ---------- Validação visual inline ----------
function getEl(id) { return document.getElementById(id); }

function ensureInvalidFeedback(el) {
  if (!el) return null;
  let fb = el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains('invalid-feedback')
    ? el.nextElementSibling
    : null;
  if (!fb) {
    fb = document.createElement('div');
    fb.className = 'invalid-feedback';
    // colocar após o input dentro do mesmo container
    el.parentElement && el.parentElement.appendChild(fb);
  }
  return fb;
}

function setFieldInvalid(el, message) {
  if (!el) return false;
  el.classList.add('is-invalid');
  const fb = ensureInvalidFeedback(el);
  if (fb) fb.textContent = message || 'Campo inválido.';
  return false;
}

function clearFieldInvalid(el) {
  if (!el) return true;
  el.classList.remove('is-invalid');
  const fb = el.nextElementSibling && el.nextElementSibling.classList && el.nextElementSibling.classList.contains('invalid-feedback')
    ? el.nextElementSibling
    : null;
  if (fb) fb.textContent = '';
  return true;
}

function validateTokenNameInline() {
  const el = getEl('tokenName');
  const v = (el?.value || '').trim();
  if (!v) return setFieldInvalid(el, 'Informe o nome do token.');
  return clearFieldInvalid(el);
}

function validateTokenSymbolInline() {
  const el = getEl('tokenSymbol');
  let v = (el?.value || '').trim();
  // Sanitizar para maiúsculas A–Z e dígitos 0–9, no máx 8 chars
  const sanitized = v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (sanitized !== v) el.value = sanitized;
  v = sanitized;
  if (!v) return setFieldInvalid(el, 'Informe o símbolo do token.');
  if (!/^[A-Z0-9]{3,8}$/.test(v)) return setFieldInvalid(el, 'Símbolo deve ter 3–8 caracteres A–Z e 0–9 (sem especiais).');
  return clearFieldInvalid(el);
}

function validateTokenDecimalsInline() {
  const el = getEl('tokenDecimals');
  const val = parseInt((el?.value || '18'), 10);
  if (!Number.isFinite(val) || val < 0 || val > 18) {
    return setFieldInvalid(el, 'Decimais devem estar entre 0 e 18.');
  }
  return clearFieldInvalid(el);
}

function validateInitialSupplyInline() {
  const el = getEl('initialSupply');
  const val = parseInt((el?.value || '0'), 10);
  if (!Number.isFinite(val) || val < 0) {
    return setFieldInvalid(el, 'Supply inicial deve ser ≥ 0.');
  }
  return clearFieldInvalid(el);
}

function validateSaleInline() {
  const group = $('#contractGroup').value;
  const saleApplies = ['erc20-directsale', 'upgradeable-uups'].includes(group);
  const priceEl = getEl('tokenPriceDec');
  const minEl = getEl('minPurchaseDec');
  const maxEl = getEl('maxPurchaseDec');
  const capEl = getEl('perWalletCap');
  const payoutEl = getEl('payoutWallet');

  if (!saleApplies) {
    // limpar erros se venda não se aplica
    clearFieldInvalid(priceEl);
    clearFieldInvalid(minEl);
    clearFieldInvalid(maxEl);
    clearFieldInvalid(capEl);
    clearFieldInvalid(payoutEl);
    return true;
  }

  const toNum = (s) => Number(String(s).replace(',', '.'));
  const price = toNum(priceEl?.value || '');
  const min = toNum(minEl?.value || '');
  const max = toNum(maxEl?.value || '');
  let ok = true;
  if (!(price > 0)) ok = setFieldInvalid(priceEl, 'Preço por token deve ser > 0.'); else clearFieldInvalid(priceEl);
  if (!(min >= 0)) ok = setFieldInvalid(minEl, 'Compra mínima deve ser ≥ 0.'); else clearFieldInvalid(minEl);
  if (!(max >= 0)) ok = setFieldInvalid(maxEl, 'Compra máxima deve ser ≥ 0.'); else clearFieldInvalid(maxEl);
  if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
    ok = setFieldInvalid(maxEl, 'Compra máxima deve ser ≥ mínima.');
  }
  const capVal = parseInt((capEl?.value || '0'), 10);
  if (!Number.isFinite(capVal) || capVal < 0) ok = setFieldInvalid(capEl, 'Cap por carteira deve ser ≥ 0.'); else clearFieldInvalid(capEl);
  const pw = (payoutEl?.value || '').trim();
  if (pw && !/^0x[0-9a-fA-F]{40}$/.test(pw)) ok = setFieldInvalid(payoutEl, 'Endereço inválido (0x...).'); else clearFieldInvalid(payoutEl);
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

async function connectWallet() {
  try {
    if (!window.ethereum) {
      log('MetaMask não encontrada. Instale a extensão para continuar.');
      return;
    }
    await window.ethereum.request({ method: 'eth_requestAccounts' });
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

 const API_BASE = window.TOKENCAFE_API_BASE || window.XCAFE_API_BASE || 'http://localhost:3000';

 async function compileContract() {
  // Validação visual inline dos campos
  const ok = runAllFieldValidation() && validateForm();
  if (!ok) {
    log('Corrija os erros nos campos antes de compilar.');
    return;
  }
  try {
    readForm();
    const name = state.form.token.name || 'MyToken';
    const symbol = state.form.token.symbol || 'MTK';
    const decimals = Number.isFinite(state.form.token.decimals) ? state.form.token.decimals : 18;
    const totalSupply = String(state.form.token.initialSupply || 0);

    log(`Compilando contrato via API: ${name} (${symbol}), supply ${totalSupply}, decimais ${decimals}...`);
    const resp = await fetch(`${API_BASE}/api/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, symbol, totalSupply, decimals })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`API retornou ${resp.status}: ${txt}`);
    }
  const data = await resp.json();
  if (!data?.success) throw new Error(data?.error || 'Falha na compilação');

  const { compilation, sourceCode, token } = data;
  state.compilation = {
    abi: compilation?.abi,
    bytecode: compilation?.bytecode,
    metadata: compilation?.metadata,
    sourceCode,
    contractName: token?.contractName || token?.name?.replace(/\s+/g, '') || 'MyToken'
  };
  log(`Compilação concluída com sucesso. ABI e bytecode prontos (${state.compilation.contractName}).`);
  const btnVerifyEl = document.querySelector('#btnVerify');
  if (btnVerifyEl) btnVerifyEl.disabled = false;
  $('#btnDeploy').disabled = false; // permite deploy imediato com MetaMask, se desejado
  // habilitar UI de arquivos (preview/download)
  const btnPrev = document.querySelector('#btnPreviewFile');
  const btnDown = document.querySelector('#btnDownloadFile');
  if (btnPrev) btnPrev.disabled = false;
  if (btnDown) btnDown.disabled = false;
} catch (err) {
  log(`Erro na compilação: ${err.message || err}`);
}
}

function verifyPlaceholder() {
  const contractAddr = state.deployed?.address;
  const chainId = state.form?.network?.chainId || state.wallet?.chainId;
  if (contractAddr && chainId) {
    const url = getExplorerVerificationUrl(contractAddr, chainId);
    log(`Abrindo verificação do contrato no explorer: ${url}`);
    try { window.open(url, '_blank'); } catch {}
    $('#btnDeploy').disabled = false;
    return;
  }
  log('Verificação iniciada (placeholder). Após o deploy, o botão abrirá o explorer na aba de verificação.');
  $('#btnDeploy').disabled = false;
}

async function deployPlaceholder() {
  const ok = runAllFieldValidation() && validateForm();
  if (!ok) {
    log('Corrija os erros nos campos antes de fazer o deploy.');
    return;
  }
  // Se temos artefatos compilados, preferir deploy via servidor
  if (state.compilation?.abi && state.compilation?.bytecode) {
    try {
      log('Iniciando deploy via servidor (chave segura, RPC configurado)...');
      const reqChainId = state.form?.network?.chainId || state.wallet?.chainId || null;
      const resp = await fetch(`${API_BASE}/api/deploy-server`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          abi: state.compilation.abi,
          bytecode: state.compilation.bytecode,
          constructorArgs: [],
          chainId: reqChainId
        })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`API retornou ${resp.status}: ${txt}`);
      }
      const data = await resp.json();
      if (!data?.success) throw new Error(data?.error || 'Falha no deploy servidor');

      const addr = data.contractAddress;
      const txh = data.transactionHash;
      state.deployed.address = addr || null;
      state.deployed.transactionHash = txh || null;
      log(`Deploy concluído: contrato em ${addr} (tx ${txh || '–'})`);
      const chainId = state.form?.network?.chainId || state.wallet?.chainId;
      const explorerUrl = data.explorerUrl || getExplorerContractUrl(addr, chainId);
      const txUrl = txh ? getExplorerTxUrl(txh, chainId) : null;
      if (explorerUrl) log(`Explorer (Contrato): ${explorerUrl}`);
      if (txUrl) log(`Explorer (Transação): ${txUrl}`);
      return;
    } catch (err) {
      log(`Erro no deploy servidor: ${err.message || err}`);
      // prosseguir para fluxo MetaMask se desejado
    }
  }
  // Caso não haja compilação disponível, ou servidor falhar, usar fluxo MetaMask (placeholder)
  if (!state.wallet.signer) {
    log('Conecte sua carteira para realizar o deploy pelo MetaMask.');
    return;
  }
  // Garantir que a rede selecionada corresponde à rede atual da carteira
  const selectedChainId = state.form?.network?.chainId;
  if (!selectedChainId) {
    log('Selecione a rede no topo antes de prosseguir com o deploy.');
    return;
  }
  try {
    const currentNet = await state.wallet.provider.getNetwork();
    if (currentNet.chainId !== selectedChainId) {
      log(`Carteira está na chain ${currentNet.chainId}. Tentando trocar para ${selectedChainId}...`);
      const hexChain = '0x' + Number(selectedChainId).toString(16);
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChain }],
        });
        const afterSwitch = await state.wallet.provider.getNetwork();
        state.wallet.chainId = afterSwitch.chainId;
        if (afterSwitch.chainId !== selectedChainId) {
          log('Não foi possível confirmar a troca de rede. Troque manualmente no MetaMask.');
          return;
        }
        log(`Rede alterada com sucesso para chainId ${afterSwitch.chainId}.`);
      } catch (err) {
        log(`Falha ao trocar rede automaticamente. Troque manualmente para ${state.form.network?.name} (chainId ${selectedChainId}). Erro: ${err?.message || err}`);
        return;
      }
    }
  } catch (e) {
    log(`Erro ao checar rede da carteira: ${e?.message || e}`);
    return;
  }
  // Deploy real via MetaMask (cliente) usando ethers.js
  try {
    if (!state.compilation?.abi || !state.compilation?.bytecode) {
      log('Compile o contrato antes do deploy. ABI/bytecode ausentes.');
      return;
    }
    if (!state.wallet?.signer) {
      log('Conecte sua carteira para assinar o deploy no MetaMask.');
      return;
    }

    const abi = state.compilation.abi;
    const bytecode = state.compilation.bytecode;
    const signer = state.wallet.signer;

    log('Preparando contrato para deploy com MetaMask...');
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
      log('Falha na estimativa de gas, usando gasLimit padrão 2,000,000.');
    }

    log('Enviando transação de deploy pelo MetaMask...');
    const contract = await factory.deploy(overrides);
    const tx = contract.deployTransaction;
    log(`Transação enviada: ${tx.hash}. Aguardando confirmação...`);
    state.deployed.transactionHash = tx.hash || null;

    // Aguarda confirmação com timeout/polling para evitar loop quando explorer fica "Indexing"
    let receipt;
    try {
      receipt = await tx.wait(1);
    } catch (waitErr) {
      log('Confirmação demorando, iniciando polling do receipt...');
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
        const nonce = typeof tx.nonce !== 'undefined' ? tx.nonce : null;
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
    log(`Deploy concluído no cliente. Contrato em ${addr || 'endereço pendente...'}.`);

    // Verificar on-chain se o endereço possui bytecode (confirma que é contrato e não EOA)
    try {
      if (addr) {
        const provider = state.wallet.provider;
        let code = await provider.getCode(addr);
        const start = Date.now();
        const timeoutMs = 30000; // até 30s esperando código aparecer
        while (code === '0x' && Date.now() - start < timeoutMs) {
          await new Promise((res) => setTimeout(res, 2000));
          code = await provider.getCode(addr);
        }
        if (code && code !== '0x') {
          log('Confirmação on-chain: endereço contém bytecode. É um contrato.');
          updateERC20Details(null, null, null, null, 'Contrato detectado on-chain', true);
        } else {
          log('Bytecode ainda não disponível no RPC. Provável indexação em andamento no nó/explorer.');
          updateERC20Details(null, null, null, null, 'Aguardando bytecode no RPC', true);
        }
      }
    } catch (codeErr) {
      log(`Falha ao verificar bytecode do contrato: ${codeErr?.message || codeErr}`);
      updateERC20Details(null, null, null, null, 'Falha ao verificar bytecode', true);
    }

    const chainId = state.form?.network?.chainId || state.wallet?.chainId;
    const explorerUrl = getExplorerContractUrl(addr, chainId);
    const txUrl = tx.hash ? getExplorerTxUrl(tx.hash, chainId) : null;
    if (explorerUrl) log(`Explorer (Contrato): ${explorerUrl}`);
    if (txUrl) log(`Explorer (Transação): ${txUrl}`);

    // Atualizar links na UI
    updateDeployLinks(explorerUrl, txUrl);

    // Habilitar verificação
  // verificação agora é automática; botão removido da UI

    // Verificação automática no BscScan (como no XCafe)
    try {
      const addrVerify = state.deployed?.address;
      const chainIdVerify = state.form?.network?.chainId || state.wallet?.chainId;
      const src = state.compilation?.sourceCode;
      const cname = state.compilation?.contractName;
      if (addrVerify && chainIdVerify && src && cname) {
        log('Iniciando verificação automática do contrato no BscScan...');
        const respV = await fetch(`${API_BASE}/api/verify-bscscan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: chainIdVerify,
            contractAddress: addrVerify,
            sourceCode: src,
            contractName: cname,
            optimizationUsed: true,
            runs: 200,
          })
        });
        if (respV.ok) {
          const dataV = await respV.json();
          const vUrl = dataV?.explorerUrl || getExplorerVerificationUrl(addrVerify, chainIdVerify);
          const ok = !!dataV?.success;
          if (ok) {
            log(`✅ Verificação concluída. Explorer: ${vUrl}`);
          } else {
            log(`📤 Verificação enviada (${dataV?.message || 'pending'}). Acompanhe: ${vUrl}`);
          }
          updateVerificationBadges({ bscUrl: vUrl, bscOk: ok });
        } else {
          const txtV = await respV.text();
          log(`Falha ao iniciar verificação no BscScan: ${txtV}`);
          updateVerificationBadges({ bscUrl: getExplorerVerificationUrl(addrVerify, chainIdVerify), bscOk: false });
        }
      } else {
        log('Verificação automática não iniciada: dados insuficientes (addr/chainId/source/contractName).');
      }
    } catch (verErr) {
      log(`Erro na verificação automática: ${verErr?.message || verErr}`);
    }

    // Fallback/Complemento: Verificação via Sourcify
    try {
      const addrVerify = state.deployed?.address;
      const chainIdVerify = state.form?.network?.chainId || state.wallet?.chainId;
      const src = state.compilation?.sourceCode;
      const cname = state.compilation?.contractName;
      const meta = state.compilation?.metadata;
      if (addrVerify && chainIdVerify && src && cname && meta) {
        log('Tentando verificação aberta via Sourcify...');
        const respS = await fetch(`${API_BASE}/api/verify-sourcify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: chainIdVerify,
            contractAddress: addrVerify,
            contractName: cname,
            sourceCode: src,
            metadata: JSON.stringify(meta)
          })
        });
        if (respS.ok) {
          const dataS = await respS.json();
          const lookup = dataS?.lookupUrl;
          const status = (dataS?.status || '').toLowerCase();
          const ok = status === 'perfect' || status === 'partial' || !!dataS?.success;
          if (ok) {
            const repoAny = dataS?.repoFilesAny;
            const repoFull = dataS?.repoFull;
            const repoPartial = dataS?.repoPartial;
            log(`✅ Sourcify status: ${status || 'desconhecido'} | Conferir: ${lookup}`);
            if (repoAny) log(`📁 Repositório (any): ${repoAny}`);
            if (repoFull) log(`📁 Repositório (full): ${repoFull}`);
            if (repoPartial) log(`📁 Repositório (partial): ${repoPartial}`);
          } else {
            const msg = dataS?.error || `Sourcify status: ${status || 'desconhecido'}`;
            log(`Falha na verificação via Sourcify: ${msg}`);
          }
          updateVerificationBadges({ sourUrl: lookup, sourOk: ok, sourStatus: status });
        } else {
          const txtS = await respS.text();
          log(`Erro HTTP no Sourcify: ${txtS}`);
          updateVerificationBadges({ sourUrl: null, sourOk: false });
        }
      } else {
        log('Verificação Sourcify não iniciada: faltam metadata/source/addr/chainId/contractName.');
      }
    } catch (sErr) {
      log(`Erro na verificação Sourcify: ${sErr?.message || sErr}`);
    }

    // Leitura simples ERC-20 para confirmar funcionalidade do contrato
    try {
      if (addr && abi && Array.isArray(abi)) {
        const provider = state.wallet.provider;
        const c = new ethers.Contract(addr, abi, provider);
        const hasFn = (n) => abi.some((i) => i?.type === 'function' && i?.name === n);
        let symVal = null, nameVal = null, decVal = null, supplyVal = null;
        if (hasFn('symbol')) {
          const sym = await c.symbol();
          symVal = sym;
          log(`ERC-20: symbol() = ${sym}`);
        }
        if (hasFn('name')) {
          const nm = await c.name();
          nameVal = nm;
          log(`ERC-20: name() = ${nm}`);
        }
        if (hasFn('decimals')) {
          const dec = await c.decimals();
          decVal = dec;
          log(`ERC-20: decimals() = ${dec}`);
        }
        if (hasFn('totalSupply')) {
          const ts = await c.totalSupply();
          const formatUnitsFn = (ethers?.utils && ethers.utils.formatUnits) ? ethers.utils.formatUnits : ethers?.formatUnits;
          const human = (decVal != null && formatUnitsFn) ? formatUnitsFn(ts, decVal) : (ts?.toString ? ts.toString() : String(ts));
          supplyVal = formatPtBR(human);
          log(`ERC-20: totalSupply() = ${supplyVal} (decimals=${decVal ?? '-'})`);
        }
        updateERC20Details(symVal, nameVal, decVal, supplyVal, 'Leitura ERC-20 ok', true);
      }
    } catch (readErr) {
      log(`Falha ao ler funções ERC-20: ${readErr?.message || readErr}`);
      updateERC20Details(null, null, null, null, 'Falha ao ler ERC-20', true);
    }
  } catch (err) {
    log(`Erro no deploy via MetaMask: ${err?.message || err}`);
  }
}

// Atualiza links de contrato e transação na UI abaixo dos botões
function updateDeployLinks(contractUrl, txUrl) {
  try {
    const aAddr = document.getElementById('erc20Address');
    const aTx = document.getElementById('erc20TxHash');
    const addrVal = state.deployed?.address || null;
    const txVal = state.deployed?.transactionHash || null;
    if (aAddr) {
      aAddr.href = contractUrl || '#';
      aAddr.textContent = addrVal || '-';
      aAddr.classList.toggle('disabled', !contractUrl);
    }
    if (aTx) {
      aTx.href = txUrl || '#';
      aTx.textContent = txVal || '-';
      aTx.classList.toggle('disabled', !txUrl);
    }
  } catch {}
}

// Atualiza badges de verificação BscScan/Sourcify
function updateVerificationBadges({ bscUrl, bscOk, bscStatus, sourUrl, sourOk, sourStatus }) {
  try {
    const bscEl = document.getElementById('erc20VerifyBsc');
    const sourEl = document.getElementById('erc20VerifySour');
    if (bscEl) {
      bscEl.href = bscUrl || '#';
      const bscTxt = bscOk ? (bscStatus ? `verificado (${bscStatus})` : 'verificado') : 'pendente';
      bscEl.textContent = bscTxt;
      bscEl.classList.toggle('bg-success', !!bscOk);
      bscEl.classList.toggle('bg-secondary', !bscOk);
    }
    if (sourEl) {
      sourEl.href = sourUrl || '#';
      let sourTxt = 'pendente';
      if (sourOk) {
        sourTxt = 'verificado';
        if (sourStatus === 'perfect') sourTxt = 'verificado (perfeito)';
        else if (sourStatus === 'partial') sourTxt = 'verificado (parcial)';
      }
      sourEl.textContent = sourTxt;
      sourEl.classList.toggle('bg-success', !!sourOk);
      sourEl.classList.toggle('bg-secondary', !sourOk);
    }
  } catch (e) {
    // silencioso
  }
}

// Atualiza seção de detalhes ERC-20 na UI
function updateERC20Details(symbol, name, decimals, supply, statusText, visible) {
  try {
    const container = document.getElementById('erc20-details');
    const st = document.getElementById('contractStatus');
    const elSym = document.getElementById('erc20Symbol');
    const elName = document.getElementById('erc20Name');
    const elDec = document.getElementById('erc20Decimals');
    const elSup = document.getElementById('erc20Supply');
    if (!container) return;
    if (typeof statusText === 'string' && st) st.textContent = statusText;
    if (elSym) elSym.textContent = symbol ?? elSym.textContent ?? '-';
    if (elName) elName.textContent = name ?? elName.textContent ?? '-';
    if (elDec) elDec.textContent = decimals != null ? String(decimals) : (elDec.textContent ?? '-');
    if (elSup) elSup.textContent = supply ?? elSup.textContent ?? '-';
    container.classList.toggle('d-none', !visible);
  } catch {}
}

// Formata números no padrão pt-BR (pontos para milhar, vírgula decimal)
function formatPtBR(value) {
  try {
    let s = typeof value === 'string' ? value : (value?.toString ? value.toString() : String(value));
    if (!s) return '-';
    const parts = s.split('.');
    let intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    let fracPart = (parts[1] || '').replace(/0+$/,'');
    return fracPart ? `${intPart},${fracPart}` : intPart;
  } catch (_) {
    return String(value ?? '-');
  }
}

// Inicializa carteira automaticamente se já estiver conectada no navegador
async function initWalletIfConnected() {
  try {
    if (!window.ethereum) return;
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    const { chainId } = await provider.getNetwork();
    state.wallet = { provider, signer, address, chainId };
    log(`Carteira detectada: ${address} (chainId ${chainId}).`);
  } catch (err) {
    // silencioso
  }
}

function bindUI() {
  // grupo altera visibilidade de venda
  $('#contractGroup').addEventListener('change', () => {
    readForm();
    setSaleVisibility();
    updateContractInfo();
    // Revalidar campos de venda quando o grupo muda
    validateSaleInline();
  });
  setSaleVisibility();
  updateContractInfo();
  updateVanityVisibility();

  const btnConnect = $('#btnConnect');
  // Inicializa carteira automaticamente, se houver
  initWalletIfConnected();
  $('#btnCompile').addEventListener('click', compileContract);
  // botão de verificação removido; verificação ocorre automaticamente pós-deploy
  $('#btnDeploy').addEventListener('click', deployPlaceholder);

  // Integrar com componente de busca de rede (network-search)
  const nsContainer = document.querySelector('[data-component*="network-search.html"]').parentElement || document;
  nsContainer.addEventListener('network:selected', (evt) => {
    const net = evt?.detail?.network;
    if (!net) return;
    state.form.network = net;
    state.sale = state.sale || {};
    state.form.sale.nativeSymbol = net?.nativeCurrency?.symbol || '';
    state.form.sale.nativeDecimals = net?.nativeCurrency?.decimals ?? 18;
    log(`Rede selecionada: ${net.name} (chainId ${net.chainId})`);
  });
  nsContainer.addEventListener('network:clear', () => {
    state.form.network = null;
    log('Rede limpa.');
  });

  // UI: Preview e Download de arquivos compilados
  function getSelectedFile() {
    const sel = document.querySelector('#fileTypeSelect');
    const type = sel ? sel.value : 'sol';
    const nameBase = state?.compilation?.contractName || (state.form?.token?.name || 'MyToken').replace(/\s+/g, '');
    let filename = nameBase;
    let content = '';
    let mime = 'text/plain';
    if (type === 'sol') {
      filename = `${nameBase}.sol`;
      content = state?.compilation?.sourceCode || '// Código não disponível. Gere o contrato primeiro.';
      mime = 'text/plain';
    } else if (type === 'abi') {
      filename = `${nameBase}.abi.json`;
      content = state?.compilation?.abi ? JSON.stringify(state.compilation.abi, null, 2) : '[]';
      mime = 'application/json';
    } else if (type === 'bytecode') {
      filename = `${nameBase}.bytecode.hex`;
      content = state?.compilation?.bytecode || '';
      mime = 'text/plain';
    }
    return { type, filename, content, mime };
  }

  function previewSelectedFile() {
    if (!state?.compilation) {
      log('Preview indisponível: compile o contrato primeiro.');
      return;
    }
    const { filename, content } = getSelectedFile();
    const pre = document.querySelector('#filePreviewContent');
    const label = document.querySelector('#filePreviewLabel');
    if (pre) pre.textContent = content || '(vazio)';
    if (label) label.textContent = `Preview do Arquivo - ${filename}`;
    try {
      const modalEl = document.getElementById('filePreviewModal');
      if (modalEl && window.bootstrap?.Modal) {
        const m = new bootstrap.Modal(modalEl);
        m.show();
      }
    } catch {}
  }

  function downloadSelectedFile() {
    if (!state?.compilation) {
      log('Download indisponível: compile o contrato primeiro.');
      return;
    }
    const { filename, content, mime } = getSelectedFile();
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    log(`Arquivo baixado: ${filename}`);
  }

  const btnPrev = document.querySelector('#btnPreviewFile');
  const btnDown = document.querySelector('#btnDownloadFile');
  if (btnPrev) btnPrev.addEventListener('click', previewSelectedFile);
  if (btnDown) btnDown.addEventListener('click', downloadSelectedFile);

  // Tooltip do ícone de informação do grupo
  try {
    const tipTrigger = document.getElementById('contractGroupInfoIcon');
    if (tipTrigger && window.bootstrap?.Tooltip) {
      new bootstrap.Tooltip(tipTrigger);
    }
  } catch {}

  // Validação imediata do campo de personalização (hex)
  const vanityInput = $('#vanityCustom');
  const help = $('#vanityHelp');
  if (vanityInput) {
    vanityInput.addEventListener('input', () => {
      const raw = vanityInput.value;
      const sanitized = raw.replace(/[^0-9a-fA-F]/g, '').toLowerCase().slice(0, 4);
      if (sanitized !== raw) vanityInput.value = sanitized;
      const ok = /^[0-9a-f]{0,4}$/.test(sanitized);
      vanityInput.classList.toggle('is-invalid', !ok);
      if (help) help.textContent = ok ? 'Somente 0–9 e a–f. Máximo 4 caracteres.' : 'Caractere inválido removido. Use apenas 0–9 e a–f.';
    });
    vanityInput.addEventListener('blur', () => {
      const v = vanityInput.value || '';
      if (v && !validateHex4(v)) {
        vanityInput.classList.add('is-invalid');
        if (help) help.textContent = 'Precisa ter exatamente 4 hex (0–9, a–f).';
      }
    });
  }

  const vanityModeSel = $('#vanityMode');
  if (vanityModeSel) {
    vanityModeSel.addEventListener('change', updateVanityVisibility);
  }

  // Validadores inline por campo
  const fv = [
    ['tokenName', validateTokenNameInline],
    ['tokenSymbol', validateTokenSymbolInline],
    ['tokenDecimals', validateTokenDecimalsInline],
    ['initialSupply', validateInitialSupplyInline],
    ['tokenPriceDec', validateSaleInline],
    ['minPurchaseDec', validateSaleInline],
    ['maxPurchaseDec', validateSaleInline],
    ['perWalletCap', validateSaleInline],
    ['payoutWallet', validateSaleInline],
  ];
  fv.forEach(([id, fn]) => {
    const el = getEl(id);
    if (!el) return;
    el.addEventListener('input', fn);
    el.addEventListener('blur', fn);
  });
}

document.addEventListener('DOMContentLoaded', bindUI);


