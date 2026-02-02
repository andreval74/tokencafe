
import { WalletConnector } from "../../shared/wallet-connector.js";

// Variáveis globais
let provider;
let metamaskBlacklisted = false;
const fallbackRpcs = [
  "https://data-seed-prebsc-1-s1.binance.org:8545/", // Binance oficial testnet
  "https://data-seed-prebsc-2-s1.binance.org:8545/", // Binance oficial testnet
  "https://bsc-testnet.public.blastapi.io", // BlastAPI testnet
  "https://bsc-testnet-rpc.publicnode.com", // PublicNode testnet
  "https://data-seed-prebsc-1-s2.binance.org:8545/", // Binance backup
  "https://data-seed-prebsc-2-s2.binance.org:8545/", // Binance backup
  "https://bsc-testnet.blockpi.network/v1/rpc/public", // BlockPI testnet
  "https://endpoints.omniatech.io/v1/bsc/testnet/public", // OmniaTech testnet
];

// Conexão centralizada de carteira no Widget usando WalletConnector
async function connectWallet(providerName = "metamask") {
  try {
    if (!window.walletConnector || typeof window.walletConnector.connect !== "function") {
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify("Sistema de conexão de carteira indisponível. Atualize a página e tente novamente.", "error", { container });
        } else {
          console.error("Sistema de conexão de carteira indisponível. Atualize a página e tente novamente.");
        }
      } catch (_) {}
      return;
    }
    const result = await window.walletConnector.connect(providerName);
    if (!result || !result.success) {
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify("Falha ao conectar a carteira.", "error", { container });
        } else {
          console.error("Falha ao conectar a carteira.");
        }
      } catch (_) {}
      return;
    }
    console.log("Carteira conectada:", result.account);
    const statusEl = document.getElementById("contract-validation-status");
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify("Carteira conectada. Você pode validar e testar o contrato.", "success", { container });
      }
    } catch (_) {}
  } catch (e) {
    console.error("Erro na conexão de carteira:", e);
    try {
      const container = document.querySelector(".container, .container-fluid") || document.body;
      if (typeof window.notify === "function") {
        window.notify(e?.message || "Falha na conexão. Verifique sua carteira e tente novamente.", "error", { container });
      } else {
        console.error(e?.message || "Falha na conexão. Verifique sua carteira e tente novamente.");
      }
    } catch (_) {}
  }
}

// Função para exibir modal de resultado da verificação (Delegada para global)
function showVerificationResultModal(title, message, type = 'info', link = null) {
  if (window.showVerificationResultModal) {
    window.showVerificationResultModal(type === 'success', title, message, link);
  } else {
    alert(`${title}\n${message}`);
  }
}

// Configurar botão Limpar Dados
function setupClearButton() {
  const btn = document.getElementById('btnClearForm');
  if (btn) {
    btn.addEventListener('click', () => {
      // Limpar inputs
      const inputs = ['deployedContractAddress', 'contractTokenAddress'];
      inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      // Limpar status
      const statusEl = document.getElementById('contract-validation-status');
      if (statusEl) statusEl.innerHTML = '';

      // Resetar botão de Testar
      const goToStep5Btn = document.getElementById("goToStep5");
      if (goToStep5Btn) {
        goToStep5Btn.disabled = true;
        goToStep5Btn.classList.remove("btn-outline-primary");
        goToStep5Btn.classList.add("btn-secondary");
      }

      // Habilitar botão de validar se estiver desabilitado
      const validateBtn = document.getElementById("btnValidateContract");
      if (validateBtn) {
        validateBtn.disabled = false;
        validateBtn.innerHTML = 'Validar Contrato';
      }

      if (window.showFormSuccess) {
        window.showFormSuccess("Dados limpos com sucesso!");
      } else if (typeof window.notify === 'function') {
        window.notify("Dados limpos com sucesso!", "success");
      }
    });
  }
}

// Função para verificar se endereço é válido
function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Função para inicializar provider
async function initializeProvider(useMetaMask = true) {
  if (!window.ethereum || metamaskBlacklisted) {
    return false;
  }

  try {
    // Usar 'any' para evitar falhas de detecção de rede
    const provider = new ethers.providers.Web3Provider(window.ethereum, "any");

    // Teste rigoroso: usar exatamente a mesma operação que está falhando
    // Usar endereço de contrato BSC TESTNET conhecido (PancakeSwap Router Testnet)
    const testContractAddress = "0xD99D1c33F9fC3444f8101754aBC46c52416550D1";

    // Criar promise com timeout de 3 segundos
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Timeout: MetaMask não respondeu em 3 segundos")), 3000);
    });

    // Testar getCode() com timeout - exatamente a operação que está falhando
    const codePromise = provider.getCode(testContractAddress);

    await Promise.race([codePromise, timeoutPromise]);

    console.log("✅ MetaMask passou no teste rigoroso de getCode()");
    return true;
  } catch (error) {
    console.warn("❌ MetaMask falhou no teste rigoroso:", error.message);

    // Blacklist imediata para qualquer erro relacionado a RPC
    if (error.message.includes("Internal JSON-RPC error") || error.message.includes("Timeout") || error.message.includes("missing trie node") || error.code === -32603 || error.code === -32002) {
      metamaskBlacklisted = true;
      console.warn("🚫 MetaMask foi adicionado à blacklist devido a problemas de RPC detectados no teste rigoroso");
    }
    return false;
  }
}

// Função auxiliar para criar providers alternativos
async function getAlternativeProviders(skipMetaMask = false) {
  const providers = [];

  // Testar MetaMask primeiro antes de adicionar à lista (a menos que seja ignorado)
  let metamaskWorking = false;
  if (!skipMetaMask) {
    metamaskWorking = await initializeProvider(true);
  }

  if (metamaskWorking) {
    console.log("MetaMask está funcionando, adicionando à lista de providers");
    providers.push(new ethers.providers.Web3Provider(window.ethereum));
  } else {
    console.log(skipMetaMask ? "Ignorando MetaMask por escolha, usando RPCs públicos" : "MetaMask não está disponível ou com problemas, usando apenas RPCs públicos");

    // Mostrar feedback imediato para o usuário
    const statusEl = document.getElementById("contract-validation-status");
    if (statusEl) {
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          if (skipMetaMask) {
            window.notify("Validando usando RPCs públicos da BSC Testnet (ignorando MetaMask).", "success", { container });
          } else {
            window.notify("MetaMask indisponível. Usando RPCs públicos BSC...", "warning", { container });
          }
        }
      } catch (_) {}
    }
  }

  // Melhores RPCs BSC TESTNET de 2024 (ordenados por performance)
  const bscRPCs = [
    "https://data-seed-prebsc-1-s1.binance.org:8545/", // Binance oficial testnet
    "https://data-seed-prebsc-2-s1.binance.org:8545/", // Binance oficial testnet
    "https://bsc-testnet.public.blastapi.io", // BlastAPI testnet
    "https://bsc-testnet-rpc.publicnode.com", // PublicNode testnet
    "https://data-seed-prebsc-1-s2.binance.org:8545/", // Binance backup
    "https://data-seed-prebsc-2-s2.binance.org:8545/", // Binance backup
    "https://bsc-testnet.blockpi.network/v1/rpc/public", // BlockPI testnet
    "https://endpoints.omniatech.io/v1/bsc/testnet/public", // OmniaTech testnet
  ];

  bscRPCs.forEach((rpc) => {
    try {
      // SOLUÇÃO RADICAL: Provider com configuração estática completa da BSC TESTNET
      // Não permite detecção automática de rede para evitar "could not detect network"
      const networkConfig = {
        name: "bsc-testnet",
        chainId: 97,
        ensAddress: null,
        _defaultProvider: null,
      };

      const provider = new ethers.providers.StaticJsonRpcProvider(rpc, networkConfig);

      // Forçar configuração estática para evitar detecção automática
      provider._network = networkConfig;
      provider.detectNetwork = () => Promise.resolve(networkConfig);

      providers.push(provider);
    } catch (e) {
      console.warn(`Falha ao criar provider para ${rpc}:`, e);
    }
  });

  return providers;
}

// Função auxiliar SIMPLIFICADA para retry com diferentes providers
// FALLBACK DIRETO sem validações que causam problemas
async function retryWithProviders(operation, maxRetries = 8, skipMetaMask = false) {
  const providers = await getAlternativeProviders(skipMetaMask); // Agora é async
  let lastError;
  const backoffBaseMs = 300; // backoff exponencial leve

  if (providers.length === 0) {
    throw new Error("Nenhum provider disponível");
  }

  for (let i = 0; i < providers.length && i < maxRetries; i++) {
    try {
      const isMetaMask = providers[i] instanceof ethers.providers.Web3Provider;
      const providerName = isMetaMask ? "MetaMask" : `RPC BSC ${i + 1}`;

      console.log(`Tentativa ${i + 1} com provider ${providerName}`);

      // SOLUÇÃO RADICAL: Executar operação diretamente sem validações prévias
      return await operation(providers[i]);
    } catch (error) {
      lastError = error;
      console.warn(`Tentativa ${i + 1} falhou:`, error.message);

      // FALLBACK DIRETO: Qualquer erro, passa para o próximo provider
      // Não fazer distinção de tipos de erro para evitar complicações
      console.log(`🔄 Passando para próximo provider...`);
      // Backoff leve antes da próxima tentativa
      const delay = Math.min(backoffBaseMs * (i + 1), 2000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }
  }

  throw lastError;
}

// Função melhorada para verificar se contrato existe com fallback
async function checkContractExists(address, description = "contrato") {
  console.log(`🔍 [checkContractExists] Verificando existência de ${description}: ${address}`);

  if (!address || !isValidEthereumAddress(address)) {
    console.warn(`⚠️ [checkContractExists] Endereço inválido para ${description}`);
    return false;
  }

  let normalizedAddress;
  try {
    normalizedAddress = ethers.utils.getAddress(address);
  } catch (err) {
    console.warn(`⚠️ [checkContractExists] Erro na normalização de ${description}: ${err.message}`);
    return false;
  }

  // Tenta com provider atual (MetaMask)
  if (provider) {
    try {
      const code = await provider.getCode(normalizedAddress);
      const exists = code !== "0x";
      console.log(`✅ [checkContractExists] ${description} via MetaMask: ${exists ? "existe" : "não existe"}`);
      return exists;
    } catch (error) {
      console.warn(`❌ [checkContractExists] Erro via MetaMask para ${description}: ${error.message}`);
    }
  }

  // Fallback para RPCs diretos
  for (const rpcUrl of fallbackRpcs) {
    try {
      const fallbackProvider = new ethers.providers.JsonRpcProvider(rpcUrl);
      const code = await fallbackProvider.getCode(normalizedAddress);
      const exists = code !== "0x";
      console.log(`✅ [checkContractExists] ${description} via RPC ${rpcUrl}: ${exists ? "existe" : "não existe"}`);
      return exists;
    } catch (error) {
      console.warn(`❌ [checkContractExists] Erro via RPC ${rpcUrl} para ${description}: ${error.message}`);
      continue;
    }
  }

  console.error(`❌ [checkContractExists] Falha total ao verificar ${description}`);
  return false;
}

// Função melhorada para validar o contrato de venda
async function validateContractFunction() {
  console.log("🔧 [validateContractFunction] Iniciando validação do contrato");

  const btn = document.getElementById("btnValidateContract");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Validando...';
  }

  try {
    const contractAddressEl = document.getElementById("deployedContractAddress");
    const tokenAddressEl = document.getElementById("contractTokenAddress");

    if (!contractAddressEl || !tokenAddressEl) {
      throw new Error("Campos de endereço não encontrados na UI");
    }

    const contractAddress = String(contractAddressEl.value || "").replace(/\s+$/u, "");
    const tokenAddress = String(tokenAddressEl.value || "").replace(/\s+$/u, "");

    if (!contractAddress || !tokenAddress) {
      throw new Error("Por favor, informe os endereços do contrato e do token");
    }

    // Validar formato dos endereços
    if (!isValidEthereumAddress(contractAddress)) {
      throw new Error(`Endereço do contrato inválido: ${contractAddress}`);
    }

    if (!isValidEthereumAddress(tokenAddress)) {
      throw new Error(`Endereço do token inválido: ${tokenAddress}`);
    }

    showVerificationResultModal("Validando", "Verificando contratos na rede...", "pending");

    // Não obrigar conexão de carteira para validação de leitura
    if (!provider) {
      console.warn("🔗 [validateContractFunction] Provider padrão indisponível, usando RPCs públicos para validar");
    }

    // Verificar existência do contrato primeiro
    console.log("🔍 [validateContractFunction] Verificando existência do contrato...");
    const contractExists = await checkContractExists(contractAddress, "contrato de venda");

    if (!contractExists) {
      throw new Error("Contrato não encontrado ou sem código na BSC Testnet (97)");
    }

    // Verificar existência do token
    console.log("🔍 [validateContractFunction] Verificando existência do token...");
    const tokenExists = await checkContractExists(tokenAddress, "token");

    if (!tokenExists) {
      throw new Error("Token não encontrado no endereço informado");
    }

    console.log("✅ [validateContractFunction] Ambos os contratos existem, validando funções...");

    // Validar informações do contrato usando fallback robusto
    const { contractToken, tokenPrice, owner, isPaused } = await retryWithProviders(
      async (currentProvider) => {
        // Resgatar endereço do token: tentar várias assinaturas comuns
        let ct;
        try {
          const scSaleToken = new ethers.Contract(contractAddress, ["function saleToken() view returns (address)"], currentProvider);
          ct = await scSaleToken.saleToken();
        } catch (_) {
          try {
            const scToken = new ethers.Contract(contractAddress, ["function token() view returns (address)"], currentProvider);
            ct = await scToken.token();
          } catch (_) {
            try {
              const scTokenAddr = new ethers.Contract(contractAddress, ["function tokenAddress() view returns (address)"], currentProvider);
              ct = await scTokenAddr.tokenAddress();
            } catch (_) {
              try {
                const scPaymentToken = new ethers.Contract(contractAddress, ["function paymentToken() view returns (address)"], currentProvider);
                ct = await scPaymentToken.paymentToken();
              } catch (_) {
                const scGetToken = new ethers.Contract(contractAddress, ["function getToken() view returns (address)"], currentProvider);
                ct = await scGetToken.getToken();
              }
            }
          }
        }

        // Resgatar preço (BNB) preferencialmente; fallback para tokenPrice()
        let tp;
        try {
          const scBnbPrice = new ethers.Contract(contractAddress, ["function bnbPrice() view returns (uint256)"], currentProvider);
          tp = await scBnbPrice.bnbPrice();
        } catch (_) {
          const scTokenPrice = new ethers.Contract(contractAddress, ["function tokenPrice() view returns (uint256)"], currentProvider);
          tp = await scTokenPrice.tokenPrice();
        }

        // Owner
        let ow;
        try {
          const scOwner = new ethers.Contract(contractAddress, ["function owner() view returns (address)"], currentProvider);
          ow = await scOwner.owner();
        } catch (_) {
          const scGetOwner = new ethers.Contract(contractAddress, ["function getOwner() view returns (address)"], currentProvider);
          ow = await scGetOwner.getOwner();
        }

        // Pausa (opcional). Se não existir, assume false
        let ps = false;
        try {
          const scPaused = new ethers.Contract(contractAddress, ["function paused() view returns (bool)"], currentProvider);
          ps = await scPaused.paused();
        } catch (_) {
          try {
            const scIsPaused = new ethers.Contract(contractAddress, ["function isPaused() view returns (bool)"], currentProvider);
            ps = await scIsPaused.isPaused();
          } catch (_) {
            ps = false;
          }
        }

        return {
          contractToken: ct,
          tokenPrice: tp,
          owner: ow,
          isPaused: ps,
        };
      },
      8,
      true,
    );

    // Verificar se o token do contrato corresponde ao informado
    if (contractToken.toLowerCase() !== tokenAddress.toLowerCase()) {
      throw new Error(`Token do contrato (${contractToken}) não corresponde ao informado (${tokenAddress})`);
    }

    // Obter informações do token via fallback
    const { tokenName, tokenSymbol, tokenDecimals } = await retryWithProviders(
      async (currentProvider) => {
        const tc = new ethers.Contract(tokenAddress, ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)"], currentProvider);
        const [tn, ts, td] = await Promise.all([tc.name(), tc.symbol(), tc.decimals()]);
        return { tokenName: tn, tokenSymbol: ts, tokenDecimals: td };
      },
      8,
      true,
    );

    const priceInBNB = ethers.utils.formatEther(tokenPrice);

    const msg = `Contrato validado com sucesso!<br><br>
      <strong>Token:</strong> ${tokenName} (${tokenSymbol})<br>
      <strong>Preço:</strong> ${priceInBNB} BNB/token<br>
      <strong>Owner:</strong> ${owner}<br>
      <strong>Status:</strong> ${isPaused ? "Pausado" : "Ativo"}<br>
      <strong>Decimais:</strong> ${tokenDecimals}`;

    showVerificationResultModal("Sucesso", msg, "success");

    // Habilitar o botão "Testar Sistema"
    const goToStep5Btn = document.getElementById("goToStep5");
    if (goToStep5Btn) {
      goToStep5Btn.disabled = false;
      goToStep5Btn.classList.remove("btn-secondary");
      goToStep5Btn.classList.add("btn-outline-primary");
    }

    // Manter o botão validar desabilitado após sucesso
    if (btn) {
      btn.innerHTML = 'Validado <i class="bi bi-check-circle"></i>';
    }

  } catch (error) {
    console.error("Erro ao validar contrato:", error);

    let msg = error && error.message ? error.message : String(error);
    if (msg.includes("Internal JSON-RPC error") || msg.includes("-32603")) {
      msg = "Falha no RPC (MetaMask). Validando via RPCs públicos da BSC Testnet. Tente novamente.";
    } else if (msg.includes("CALL_EXCEPTION") || msg.includes("token()")) {
      msg = "A chamada token() reverteu. Verifique se o endereço é do contrato de venda correto e se a função token() existe no ABI.";
    }

    showVerificationResultModal("Erro na Validação", msg, "error");

    // Desabilitar o botão "Testar Sistema"
    const goToStep5Btn = document.getElementById("goToStep5");
    if (goToStep5Btn) {
      goToStep5Btn.disabled = true;
      goToStep5Btn.classList.remove("btn-outline-primary");
      goToStep5Btn.classList.add("btn-secondary");
    }

    // Reabilitar botão de validar em caso de erro
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Validar Contrato';
    }
  }
}

function setupCopyButtons() {
  const copyDeployedBtn = document.getElementById("copyDeployedContractBtn");
  if (copyDeployedBtn) {
    copyDeployedBtn.addEventListener("click", () => {
      const val = document.getElementById("deployedContractAddress")?.value || "";
      if (window.copyToClipboard) {
        window.copyToClipboard(val);
      } else {
        navigator.clipboard.writeText(val);
      }
    });
  }

  const copyTokenBtn = document.getElementById("copyContractTokenBtn");
  if (copyTokenBtn) {
    copyTokenBtn.addEventListener("click", () => {
      const val = document.getElementById("contractTokenAddress")?.value || "";
      if (window.copyToClipboard) {
        window.copyToClipboard(val);
      } else {
        navigator.clipboard.writeText(val);
      }
    });
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupClearButton();
  setupCopyButtons();
  
  const validateBtn = document.getElementById("btnValidateContract");
  if (validateBtn) {
    validateBtn.addEventListener("click", validateContractFunction);
  }

  // Attach to window for legacy support if needed, though we are removing inline calls
  window.connectWallet = connectWallet;
  window.validateContractFunction = validateContractFunction;
});
