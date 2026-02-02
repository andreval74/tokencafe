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
  compileContract, 
  deployContract, 
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
  getConstructorArgs,
  connectWallet,
  getSerializableState,
  verifyCurrentContract
} from "./builder.js";
import { getExplorerContractUrl, getExplorerTxUrl } from "./explorer-utils.js";
import { addTokenToMetaMask } from "../../shared/metamask-utils.js";
import { updateContractDetailsView } from "../../shared/contract-search.js";
import { checkConnectivity } from "../../shared/components/api-status.js";

class TokenPageManager {
  constructor() {
    this.init();
  }

  init() {
    console.log("TokenPageManager initialized (Single Page Mode)");
    
    // Check API Connectivity on load
    checkConnectivity(true);
    
    // Initial Contract Info Update
    updateContractInfo();
    
    // Listen for network selection
    document.addEventListener("network:selected", (e) => {
        if (e.detail && e.detail.network) {
            state.form.network = e.detail.network;
            console.log("Network updated:", state.form.network);
            this.updateGasEstimate();
        }
    });

    document.addEventListener("network:clear", () => {
        state.form.network = null;
        console.log("Network cleared");
        this.updateGasEstimate();
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
    });

    document.addEventListener("wallet:disconnected", () => {
        console.log("Wallet disconnected event received");
        state.wallet = { provider: null, signer: null, address: null, chainId: null };
        this.updateGasEstimate();
    });
    
    // Check if wallet is already connected via BaseSystem
    if (window.walletConnector && window.walletConnector.isConnected) {
        connectWallet().then(() => this.updateGasEstimate());
    }
    
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
            console.log("Create Token Button Clicked");
            this.deploy();
        });
    } else {
        console.error("btnCreateToken not found in DOM during init");
    }

    // Listen for Reset Button
    const btnReset = document.getElementById("btnResetForm");
    if (btnReset) {
        btnReset.addEventListener("click", () => this.resetForm());
    }

    // btnReloadApiStatus handled by ApiStatusComponent

    // Listen for contract verification success to auto-redirect
    document.addEventListener("contract:verified", (e) => {
        if (state.deployed?.address && e.detail?.address && 
            state.deployed.address.toLowerCase() === e.detail.address.toLowerCase()) {
            console.log("Verified event received, redirecting...");
            this.showSuccessScreen();
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

  async deploy() {
     const deployContainer = document.getElementById("deployStatusContainer");
     const statusText = document.getElementById("contractStatus");
     // Fix: Use correct button ID from contrato-index.html
     const btn = document.getElementById("btnCreateToken") || document.getElementById("btnDeploy");
     
     // 1. Validate Network
     if (!state.form.network || !state.form.network.chainId) {
         alert("Por favor, selecione uma rede (Blockchain) no topo da página.");
         window.scrollTo({ top: 0, behavior: 'smooth' });
         return;
     }

     // 2. Validate Form
     readForm();
     const uiOk = runAllFieldValidation(); // Shows red borders
     const logicOk = validateForm(); // Checks deeper logic
     
     if (!uiOk || !logicOk) {
         // Scroll to first error
         const firstInvalid = document.querySelector('.is-invalid');
         if (firstInvalid) {
             firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
             firstInvalid.focus();
         } else {
            alert("Verifique os campos destacados em vermelho ou mensagens de erro.");
         }
         return;
     }

     // 3. Connect Wallet if not connected
     if (!state.wallet.signer) {
         alert("Por favor, conecte sua carteira primeiro (botão no topo).");
         return;
     }

     // 4. Start Process
     if (deployContainer) deployContainer.classList.remove("d-none");
     if (btn) {
         btn.disabled = true;
         btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processando...`;
     }

     try {
         // 5. Compile
         if (statusText) statusText.textContent = "Compilando contrato...";
         const compileOk = await compileContract();

         if (!compileOk) {
             // Erro de conexão já tratado com alert em ensureServersOnline
             return;
         }

         if (!state.compilation || !state.compilation.bytecode) {
             throw new Error("Falha na geração do contrato. Verifique os logs e tente novamente.");
         }

         // Update Source Preview
         const sourceArea = document.getElementById("sourceCodePreview");
         if (sourceArea && state.compilation.sourceCode) {
             sourceArea.value = state.compilation.sourceCode;
         }

         // 6. Estimate
         await this.updateGasEstimate();

         // 7. Deploy
         if (statusText) statusText.textContent = "Aguardando confirmação na carteira...";
         
         const success = await deployContract();
         
         // 8. Success
         if (success) {
             const chainId = state.form?.network?.chainId;
             // Redes locais geralmente não verificam
             const isLocal = chainId == 1337 || chainId == 31337; 

             if (isLocal) {
                 this.showSuccessScreen();
                 return;
             }

             if (statusText) {
                 statusText.textContent = "Contrato criado. Iniciando verificação...";
                 statusText.className = "fw-bold text-info";
             }
             
             // Auto verification attempt
             const verifyRes = await verifyCurrentContract();
             
             // If immediate success or already verified
             if (verifyRes?.success || verifyRes?.alreadyVerified || (verifyRes?.error && String(verifyRes.error).toLowerCase().includes("already verified"))) {
                 this.showSuccessScreen();
                 return;
             }
             
             // If pending or failed, show manual controls
             if (statusText) {
                 statusText.innerHTML = `
                    <div class="mt-3 p-3 border rounded bg-dark-elevated">
                        <p class="mb-2 text-warning"><i class="bi bi-hourglass-split me-2"></i>Verificação em andamento ou pendente.</p>
                        <div class="d-flex gap-2 justify-content-center">
                            <button id="btnManualVerify" class="btn btn-warning btn-sm">
                                <i class="bi bi-shield-check me-1"></i> Tentar Verificar Novamente
                            </button>
                            <button id="btnSkipVerify" class="btn btn-outline-secondary btn-sm">
                                Pular e Continuar
                            </button>
                        </div>
                        <small class="d-block mt-2 text-muted">A verificação pode levar alguns segundos dependendo do explorador.</small>
                    </div>
                 `;
                 statusText.className = ""; // Remove default class to allow custom styling
                 
                 const btnMan = document.getElementById("btnManualVerify");
                 if (btnMan) {
                     btnMan.onclick = async (e) => {
                         e.preventDefault();
                         btnMan.disabled = true;
                         btnMan.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Verificando...';
                         
                         const res = await verifyCurrentContract();
                         
                         if (res?.success || res?.alreadyVerified || (res?.error && String(res.error).includes("already"))) {
                             this.showSuccessScreen();
                         } else {
                             btnMan.disabled = false;
                             btnMan.innerHTML = '<i class="bi bi-shield-check me-1"></i> Tentar Verificar Novamente';
                             alert("Ainda não verificado. Aguarde mais um pouco e tente novamente.");
                         }
                     };
                 }

                 const btnSkip = document.getElementById("btnSkipVerify");
                 if (btnSkip) {
                     btnSkip.onclick = (e) => {
                         e.preventDefault();
                         if (confirm("Se pular, o contrato pode não aparecer como verificado na próxima tela. Deseja continuar mesmo assim?")) {
                             this.showSuccessScreen();
                         }
                     };
                 }
             }
         }

     } catch (e) {
         console.error(e);
         if (statusText) statusText.textContent = "Erro: " + (e.message || e);
         if (statusText) statusText.className = "fw-bold text-danger";
         if (deployContainer) deployContainer.className = "mt-4 alert alert-danger bg-dark border-danger text-danger";
     } finally {
         if (btn) {
             btn.disabled = false;
             btn.innerHTML = `<i class="bi bi-check-lg me-2"></i> Criar Contrato`;
         }
     }
  }

  showSuccessScreen() {
     const deployContainer = document.getElementById("deployStatusContainer");
     if (deployContainer) deployContainer.classList.add("d-none");
     
     try {
         // Save state to sessionStorage for the details page
         const safeState = getSerializableState();
         if (safeState) {
             sessionStorage.setItem("lastDeployedContract", JSON.stringify(safeState));
             // Redirect to details page
             window.location.href = "contrato-detalhes.html";
         } else {
             throw new Error("Falha ao serializar estado do contrato.");
         }
     } catch (e) {
         console.error("Erro ao redirecionar:", e);
         alert("Contrato criado com sucesso! Redirecionando...");
         window.location.href = "contrato-detalhes.html";
     }
  }
}

// Make available globally as 'wizard' to match HTML onclick="wizard.deploy()"
window.wizard = new TokenPageManager();
