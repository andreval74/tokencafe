import { 
  state, 
  compileContract, 
  deployPlaceholder, 
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
  getConstructorArgs
} from "./builder.js";
import { getExplorerContractUrl, getExplorerTxUrl } from "./explorer-utils.js";

class TokenPageManager {
  constructor() {
    this.init();
  }

  init() {
    console.log("TokenPageManager initialized (Single Page Mode)");
    
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
            this.updateGasEstimate();
        });
        // Initial update
        this.updateUIForGroup();
    }

    // Listen for contract type cards
    const cards = document.querySelectorAll('.contract-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
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

    // Listen for Tab changes
    const tabEls = document.querySelectorAll('button[data-bs-toggle="pill"]');
    tabEls.forEach(tabEl => {
        tabEl.addEventListener('shown.bs.tab', (event) => {
            const targetId = event.target.getAttribute('data-bs-target');
            if (targetId === '#pills-templates') {
                const selectedCard = document.querySelector('#pills-templates .contract-card.selected');
                if (selectedCard) selectedCard.click();
                else {
                    const firstCard = document.querySelector('#pills-templates .contract-card');
                    if (firstCard) firstCard.click();
                }
            }
        });
    });

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
        btnCreate.addEventListener("click", () => this.deploy());
    }
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

      const saleParams = document.getElementById("saleParams");
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
     const btn = document.getElementById("btnDeploy");
     
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

         if (!compileOk || !state.compilation || !state.compilation.bytecode) {
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
         
         const success = await deployPlaceholder();
         
         // 8. Success
         if (success) {
             this.showSuccessScreen();
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
      // 1. Unhide sections matching contrato-index.html structure
      const erc20Details = document.getElementById("erc20-details");
      const contractSearchContainer = document.getElementById("contract-search-container");
      const shareSection = document.getElementById("share-section");
      const filesSection = document.getElementById("files-section");
      
      if (erc20Details) erc20Details.classList.remove("d-none");
      if (contractSearchContainer) contractSearchContainer.classList.remove("d-none");
      if (shareSection) shareSection.classList.remove("d-none");
      if (filesSection) filesSection.classList.remove("d-none");

      // 2. Configure Contract Search Component (View Mode)
      // Hide search form
      const csRoot = document.getElementById("contract-search-root");
      if (csRoot) csRoot.classList.add("d-none");
      
      // Show details card
      const csInfo = document.getElementById("selected-contract-info");
      if (csInfo) csInfo.classList.remove("d-none");

      // Populate Token Details in Component
      const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
      
      const chainId = state.form.network?.chainId || 1;
      
      setTxt("cs_viewAddress", state.deployed.address || "-");
      setTxt("cs_viewChainId", chainId);
      setTxt("cs_viewName", state.form.token.name || "-");
      setTxt("cs_viewSymbol", state.form.token.symbol || "-");
      setTxt("cs_viewDecimals", state.form.token.decimals || "18");
      
      if (state.form.token.initialSupply) {
          setTxt("cs_viewSupply", String(state.form.token.initialSupply).replace(/\B(?=(\d{3})+(?!\d))/g, "."));
      }
      
      setTxt("cs_viewStatus", "Novo (Deploy)");
      setTxt("cs_viewTokenBalance", "-"); // Requires fetch
      setTxt("cs_viewNativeBalance", "-"); // Requires fetch
      setTxt("cs_viewCompilerVersion", "Solidity (Latest)"); // Approximate
      setTxt("cs_viewOptimization", "Enabled");
      
      // Update link hrefs in component
      const explorerContractUrl = getExplorerContractUrl(state.deployed.address, chainId);
      const csAddressLink = document.getElementById("cs_viewAddress");
      if (csAddressLink) csAddressLink.href = explorerContractUrl;

      // Update Top Section Links (erc20-details)
      const explorerTxUrl = getExplorerTxUrl(state.deployed.transactionHash, chainId);

      const erc20AddressLink = document.getElementById("erc20AddressLink");
      if (erc20AddressLink) {
          erc20AddressLink.textContent = state.deployed.address || "Endereço indisponível";
          erc20AddressLink.href = explorerContractUrl;
      }
      
      const erc20TxLink = document.getElementById("erc20TxLink");
      if (erc20TxLink) {
          erc20TxLink.textContent = state.deployed.transactionHash || "Hash indisponível";
          erc20TxLink.href = explorerTxUrl;
      }

      // Populate Share Link
      const generatedLink = document.getElementById("generatedLink");
      if (generatedLink) {
           const url = new URL(window.location.href);
           url.searchParams.set("contract", state.deployed.address);
           url.searchParams.set("chain", chainId);
           generatedLink.value = url.toString();
      }

      // Scroll to success
      if (erc20Details) {
          setTimeout(() => {
            erc20Details.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 100);
      }
      
      // Hide the processing status container to clean up view
      const deployContainer = document.getElementById("deployStatusContainer");
      if (deployContainer) deployContainer.classList.add("d-none");
  }
}

// Make available globally as 'wizard' to match HTML onclick="wizard.deploy()"
window.wizard = new TokenPageManager();
