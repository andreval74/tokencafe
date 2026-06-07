/**
 * ================================================================================
 * TOKENCAFE - CONTRATO MANAGER (Unified)
 * ================================================================================
 * Controlador principal da página de construção de contratos.
 * Substitui o antigo novo-contrato.js e integra com o builder.js core.
 * ================================================================================
 */

import {
  state,
  readForm,
  validateForm,
  runAllFieldValidation,
  updateVanityVisibility,
  validateTokenNameInline,
  validateTokenSymbolInline,
  validateTokenDecimalsInline,
  validateInitialSupplyInline,
  validateSaleInline,
  updateContractInfo,
  CONTRACT_GROUPS,
  connectWallet,
} from "./builder.js";
import { getExplorerContractUrl, getExplorerTxUrl } from "../../shared/explorer-utils.js";
import { addTokenToMetaMask } from "../../shared/metamask-utils.js";
import { updateContractDetailsView } from "../../shared/contract-search.js";
import { checkConnectivity } from "../../shared/components/api-status.js";
import {
  initReferral,
  clearReferral,
  setNetworkSymbol,
} from "./referral.js";
import { registerModuleActions } from "../../shared/module-actions.js";
import { updateModelPrices, applyAffordabilityFilter } from "./model-pricing.js";

class TokenPageManager {
  constructor() {
    this.init();
  }

  getIsBusy() {
    try {
      return sessionStorage.getItem("tokencafe_contract_busy") === "1";
    } catch (_) {
      return false;
    }
  }

  setBusy(isBusy) {
    const busy = !!isBusy;
    try {
      sessionStorage.setItem("tokencafe_contract_busy", busy ? "1" : "0");
    } catch (_) {}

    const btnCreate = document.getElementById("btnCreateToken") || document.getElementById("btnDeploy");
    const btnClear = document.getElementById("btn-clear");
    const homeLink = document.getElementById("btnHome") || document.querySelector('#actions-section a[href*="page=tools"]');

    const setAnchorDisabled = (a, disabled) => {
      if (!a) return;
      if (disabled) {
        if (!a.dataset.tcHref) a.dataset.tcHref = a.getAttribute("href") || "";
        a.classList.add("disabled");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("tabindex", "-1");
        a.removeAttribute("href");
      } else {
        a.classList.remove("disabled");
        a.removeAttribute("aria-disabled");
        a.removeAttribute("tabindex");
        const href = a.dataset.tcHref || "";
        if (href) a.setAttribute("href", href);
      }
    };

    if (btnCreate) btnCreate.disabled = busy;
    if (btnClear) btnClear.disabled = busy;
    setAnchorDisabled(homeLink, busy);
  }

  init() {
    console.log("TokenPageManager initialized (Single Page Mode)");

    // Always reset busy state on fresh page load (prevents stuck disabled button)
    try { sessionStorage.setItem("tokencafe_contract_busy", "0"); } catch (_) {}

    // Check API Connectivity on load
    checkConnectivity(true);
    
    // Initial Contract Info Update
    updateContractInfo();
    
    // Listen for network selection
    document.addEventListener("network:selected", async (e) => {
        if (e.detail && e.detail.network) {
            state.form.network = e.detail.network;
            console.log("Network updated:", state.form.network);
            this.updateGasEstimate();
            updateModelPrices(e.detail.network.chainId);
            // Atualiza símbolo e inicializa referral se carteira conectada
            const sym = e.detail.network?.nativeCurrency?.symbol || "ETH";
            setNetworkSymbol(sym);
            if (state.wallet.provider) {
                await initReferral(e.detail.network.chainId, state.wallet.provider);
            }
        }
    });

    document.addEventListener("network:clear", () => {
        state.form.network = null;
        console.log("Network cleared");
        this.updateGasEstimate();
        updateModelPrices(null);
    });

    // Listen for contract group change
    const groupSelect = document.getElementById("contractGroup");
    if (groupSelect) {
        groupSelect.addEventListener("change", () => {
            this.updateUIForGroup();
            updateContractInfo();
            this.updateGasEstimate();
        });
        // Initial update
        this.updateUIForGroup();
    }

    // Listen for contract type cards
    const cards = document.querySelectorAll('.contract-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            if (card.classList.contains('disabled-option')) return;
            if (card.dataset.unaffordable === 'true') return; // saldo insuficiente
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            const val = card.dataset.value;
            const input = document.getElementById('contractGroup');
            if (input) {
                input.value = val;
                input.dispatchEvent(new Event('change'));
            }
        });
    });

    // Listen for Tab changes (Removed: Single Page Mode)
    // const tabEls = document.querySelectorAll('button[data-bs-toggle="pill"]');
    // ...

    // Listen for Vanity Mode changes
    const vanityMode = document.getElementById("vanityMode");
    if (vanityMode) {
        vanityMode.addEventListener("change", () => {
            updateVanityVisibility();
        });
        // Initial update
        updateVanityVisibility();
    }

    // Listen for Wallet Connection (Global Event from BaseSystem)
    document.addEventListener("wallet:connected", async (e) => {
        console.log("Wallet connected event received:", e.detail);
        await connectWallet(); // Sync builder.js state and populate fields
        this.updateGasEstimate();
        updateModelPrices(state.wallet.chainId);
        // Inicializa referral se rede já selecionada
        if (state.form.network?.chainId && state.wallet.provider) {
            const sym = state.form.network?.nativeCurrency?.symbol || "ETH";
            setNetworkSymbol(sym);
            await initReferral(state.form.network.chainId, state.wallet.provider);
        }
    });

    document.addEventListener("wallet:disconnected", () => {
        console.log("Wallet disconnected event received");
        state.wallet = { provider: null, signer: null, address: null, chainId: null };
        this.updateGasEstimate();
        updateModelPrices(null);
        applyAffordabilityFilter(null); // remove restrições ao desconectar
    });

    // Reavalia saldo quando o usuário troca de conta na carteira
    document.addEventListener("wallet:accountChanged", async (e) => {
        console.log("Wallet account changed:", e.detail);
        await connectWallet();
        this.updateGasEstimate();
        const chainId = state.form.network?.chainId || state.wallet.chainId;
        if (chainId) updateModelPrices(chainId);
    });
    
    // Check if wallet is already connected via BaseSystem
    if (window.walletConnector && window.walletConnector.isConnected) {
        connectWallet().then(() => {
            this.updateGasEstimate();
            updateModelPrices(state.wallet.chainId);
        });
    }

    // Re-check de saldo após 1.5s: garante que o filtro rode mesmo quando a
    // carteira ou o walletConnector terminam de inicializar depois dos módulos.
    setTimeout(() => {
        const chainId = state.form.network?.chainId || state.wallet?.chainId;
        if (chainId) updateModelPrices(chainId);
    }, 1500);
    
    // Listen for inputs to clear validation errors and update gas
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            if (input.classList.contains('is-invalid')) {
                input.classList.remove('is-invalid');
            }
            // Debounce gas update for text inputs
            if (this.gasTimeout) clearTimeout(this.gasTimeout);
            this.gasTimeout = setTimeout(() => this.updateGasEstimate(), 500);
        });
        
        input.addEventListener('change', () => {
             this.updateGasEstimate();
        });
    });

    // Listen for Create Token Button
    const btnCreate = document.getElementById("btnCreateToken");
    if (btnCreate) {
        console.log("Attaching click listener to btnCreateToken");
        btnCreate.addEventListener("click", (e) => {
            if (e) e.preventDefault();
            if (this.getIsBusy()) return;
            console.log("Create Token Button Clicked");
            this.deploy();
        });
    } else {
        console.error("btnCreateToken not found in DOM during init");
    }

    try {
      this.setBusy(false);
    } catch (_) {}

    // Listen for Reset Button
    const btnReset = document.getElementById("btnResetForm");
    if (btnReset) {
        btnReset.addEventListener("click", () => this.resetForm());
    }

    registerModuleActions({
        onClear: () => clearReferral(),
        isBusy: () => this.getIsBusy(),
    });

    // btnReloadApiStatus handled by ApiStatusComponent

    // Listen for contract verification success to auto-redirect
    document.addEventListener("contract:verified", (e) => {
        if (state.deployed?.address && e.detail?.address && 
            state.deployed.address.toLowerCase() === e.detail.address.toLowerCase()) {
            console.log("Verified event received, redirecting...");
            // showSuccessScreen removed — deploy flow moved to contrato-deploy.js;
        }
    });

  }

  resetForm() {
      window.location.reload();
  }

  updateUIForGroup() {
      const group = document.getElementById("contractGroup")?.value;
      const info = CONTRACT_GROUPS[group];
      if (!info) return;

      const useExisting = Boolean(info.useExistingToken);
      const saleIntegration = Boolean(info.saleIntegration);

      const existingContainer = document.getElementById("existingTokenContainer");
      const nameContainer = document.getElementById("tokenNameContainer");
      const symbolContainer = document.getElementById("tokenSymbolContainer");
      const decimalsContainer = document.getElementById("tokenDecimalsContainer"); 
      const supplyContainer = document.getElementById("initialSupplyContainer");

      if (existingContainer) existingContainer.classList.toggle("d-none", !useExisting);
      
      if (nameContainer) nameContainer.classList.toggle("d-none", useExisting);
      if (symbolContainer) symbolContainer.classList.toggle("d-none", useExisting);
      if (supplyContainer) supplyContainer.classList.toggle("d-none", useExisting);

      const saleParams = document.getElementById("sale-config-section");
      if (saleParams) saleParams.classList.toggle("d-none", !saleIntegration);
  }

  async updateGasEstimate() {
      const el = document.getElementById("gasEstimate");
      if (!el) return;

      if (!state.wallet.signer) {
          el.textContent = "Conecte a carteira";
          el.className = "badge bg-dark border border-secondary text-warning";
          return;
      }

      if (!state.compilation || !state.compilation.bytecode) {
          el.textContent = "Será calculado ao criar";
          el.className = "badge bg-dark border border-secondary text-secondary";
          return;
      }

      el.textContent = "Calculando...";
      el.className = "badge bg-dark border border-secondary text-info";

      try {
        if (typeof ethers === 'undefined') throw new Error("Ethers.js not loaded");
        
        const factory = new ethers.ContractFactory(
            state.compilation.abi,
            state.compilation.bytecode,
            state.wallet.signer
        );

        const args = getConstructorArgs();
        
        const deployTx = factory.getDeployTransaction(...args);
        const estimatedGas = await state.wallet.signer.estimateGas(deployTx);
        const gasPrice = await state.wallet.provider.getGasPrice();
        
        const costWei = estimatedGas.mul(gasPrice);
        const costEth = ethers.utils.formatEther(costWei);
        const symbol = state.form.network?.nativeCurrency?.symbol || "ETH";

        el.textContent = `~ ${parseFloat(costEth).toFixed(5)} ${symbol}`;
        el.className = "badge bg-dark border border-secondary text-success";
        el.title = `Gas Limit: ${estimatedGas.toString()}`;
      } catch (e) {
          console.warn("Gas estimation pending or failed:", e);
          el.textContent = "Será calculado ao criar";
          el.className = "badge bg-dark border border-secondary text-secondary";
      }
  }

  /**
   * Valida o formulário e avança para a página de deploy.
   * Nenhum compile/deploy acontece aqui — só validação e redirect.
   */
  async deploy() {
     const btn = document.getElementById("btnCreateToken") || document.getElementById("btnDeploy");

     // 1. Rede obrigatória
     if (!state.form.network?.chainId) {
         window.showFormError?.("Selecione uma rede (Blockchain) no topo da página.");
         window.scrollTo({ top: 0, behavior: "smooth" });
         return;
     }

     // 2. Validar campos
     readForm();
     if (!runAllFieldValidation() || !validateForm()) {
         const firstInvalid = document.querySelector(".is-invalid");
         if (firstInvalid) {
             firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
             firstInvalid.focus();
         } else {
             window.showFormError?.("Verifique os campos destacados em vermelho.");
         }
         return;
     }

     // 3. Salvar configuração e ir para a página de deploy
     try {
         if (btn) {
             btn.disabled = true;
             btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Avançando...`;
         }
         const config = {
             network:       state.form.network,
             group:         state.form.group,
             token:         { ...state.form.token },
             sale:          { ...state.form.sale },
             initialOwner:  state.form.initialOwner  || "",
             initialHolder: state.form.initialHolder || "",
             advanced:      state.form.advanced || null,
         };
         // BigInt (capUnits) não sobrevive JSON.stringify sem replacer
         sessionStorage.setItem("tokencafe_pending_deploy", JSON.stringify(config, (_, v) =>
             typeof v === "bigint" ? v.toString() : v
         ));
         window.location.href = "index.php?page=contrato-deploy";
     } catch (e) {
         console.error("Erro ao avançar:", e);
         window.showFormError?.("Erro ao avançar. Tente novamente.");
         if (btn) {
             btn.disabled = false;
             btn.innerHTML = `<i class="bi bi-arrow-right me-2"></i>Avançar`;
         }
     }

  }

}

// Make available globally as 'wizard' to match HTML onclick="wizard.deploy()"
window.wizard = new TokenPageManager();
