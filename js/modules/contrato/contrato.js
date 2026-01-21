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
  getConstructorArgs
} from "./builder.js";
import { getExplorerContractUrl, getExplorerTxUrl } from "./explorer-utils.js";
import { addTokenToMetaMask } from "../../shared/metamask-utils.js";
import { updateContractDetailsView } from "../../shared/contract-search.js";
import { getFallbackRpc, getFallbackExplorer } from "../../shared/network-fallback.js";

class TokenPageManager {
  constructor() {
    this.init();
  }

  init() {
    console.log("TokenPageManager initialized (Single Page Mode)");
    
    this.setupShareButtons();
    
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

    const btnReloadApi = document.getElementById("btnReloadApiStatus");
    if (btnReloadApi) {
        btnReloadApi.addEventListener("click", () => window.location.reload());
    }

    const btnIaSuggest = document.getElementById("btnIaSuggest");
    if (btnIaSuggest) {
        btnIaSuggest.addEventListener("click", () => {
            alert("Funcionalidade de IA em breve!");
        });
    }

    const copyTextFromLink = (linkId) => {
        const el = document.getElementById(linkId);
        const text = el && el.textContent ? el.textContent.trim() : "";
        if (text && window.copyToClipboard) {
            window.copyToClipboard(text);
        }
    };

    const btnCopyContractAddress = document.getElementById("btnCopyContractAddress");
    if (btnCopyContractAddress) {
        btnCopyContractAddress.addEventListener("click", () => copyTextFromLink("erc20AddressLink"));
    }

    const btnCopyContractTx = document.getElementById("btnCopyContractTx");
    if (btnCopyContractTx) {
        btnCopyContractTx.addEventListener("click", () => copyTextFromLink("erc20TxLink"));
    }
  }

  setupShareButtons() {
    const getShareLink = () => {
        const gl = document.getElementById("generatedLink");
        if (gl && gl.value) return gl.value;
        const addr = state?.deployed?.address;
        const chain = state?.form?.network?.chainId || state?.wallet?.chainId;
        if (addr && chain) {
             const sharePath = "/pages/modules/link/link-token.html";
             const params = new URLSearchParams({
                  address: addr,
                  chainId: String(chain),
                  name: state?.form?.token?.name || "",
                  symbol: state?.form?.token?.symbol || "",
                  decimals: state?.form?.token?.decimals || "18",
                  image: "",
                  rpc: state?.form?.network?.rpc?.[0] || "",
                  explorer: state?.form?.network?.explorers?.[0]?.url || ""
             });
             return `${window.location.origin}${sharePath}?${params.toString()}`;
        }
        return window.location.href;
    };

    const copyBtn = document.getElementById("copyAddressBtn");
    if (copyBtn) {
        copyBtn.addEventListener("click", () => {
            const link = getShareLink();
            if (!link) return;
            let copied = false;
            try {
                if (window.copyToClipboard) {
                    window.copyToClipboard(link);
                    copied = true;
                }
            } catch (_) {}
            if (!copied && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
                navigator.clipboard.writeText(link).catch(() => {});
                copied = true;
            }
            if (!copied) {
                try {
                    const ta = document.createElement("textarea");
                    ta.value = link;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand("copy");
                    ta.remove();
                    copied = true;
                } catch (_) {}
            }
            if (!copied) return;
            const icon = copyBtn.querySelector("i");
            if (icon) {
                const old = icon.className;
                icon.className = "bi bi-check2 text-success";
                setTimeout(() => {
                    icon.className = old;
                }, 1500);
            }
        });
    }

    const viewBtn = document.getElementById("viewAddressBtn");
    if (viewBtn) {
        viewBtn.addEventListener("click", () => {
            window.open(getShareLink(), "_blank");
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
            const text = encodeURIComponent(`Confira meu novo token criado no TokenCafe! 🚀`);
            window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, "_blank");
        });
    }

    const emailBtn = document.getElementById("btnShareEmailSmall");
    if (emailBtn) {
        emailBtn.addEventListener("click", () => {
             const link = getShareLink();
             const subject = encodeURIComponent("Novo Token Criado");
             const body = encodeURIComponent(`Confira este token: ${link}`);
             window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
        });
    }

    const addNetBtn = document.getElementById("btnAddNetworkSmall");
    if (addNetBtn) {
        addNetBtn.onclick = async () => {
            try {
                const net = state.form?.network;
                if (!net || !net.chainId) {
                    alert("Nenhuma rede definida.");
                    return;
                }
                if (!window.ethereum) {
                    alert("MetaMask não encontrada.");
                    return;
                }
                const targetHex = "0x" + Number(net.chainId).toString(16);
                try {
                    const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
                    if (!currentHex || String(parseInt(currentHex, 16)) !== String(net.chainId)) {
                        try {
                            await window.ethereum.request({
                                method: "wallet_switchEthereumChain",
                                params: [{ chainId: targetHex }],
                            });
                        } catch (switchErr) {
                            const code = switchErr && switchErr.code;
                            const msg = String((switchErr && switchErr.message) || "");
                            if (code === 4902 || /unrecognized|unknown/i.test(msg)) {
                                let rpcUrls = Array.isArray(net.rpc) && net.rpc.length ? net.rpc : [];
                                if (!rpcUrls.length) {
                                    const fbRpc = getFallbackRpc(net.chainId);
                                    if (fbRpc) rpcUrls = [fbRpc];
                                }
                                
                                let explorerUrl = net.explorers && net.explorers[0] && net.explorers[0].url ? net.explorers[0].url : "";
                                if (!explorerUrl) {
                                    const fbExp = getFallbackExplorer(net.chainId);
                                    if (fbExp) explorerUrl = fbExp;
                                }

                                const addParams = {
                                    chainId: targetHex,
                                    chainName: net.name || `Chain ${net.chainId}`,
                                    nativeCurrency: {
                                        name: net.nativeCurrency && net.nativeCurrency.name ? net.nativeCurrency.name : "Unknown",
                                        symbol: net.nativeCurrency && net.nativeCurrency.symbol ? net.nativeCurrency.symbol : "TKN",
                                        decimals: net.nativeCurrency && Number.isFinite(net.nativeCurrency.decimals) ? net.nativeCurrency.decimals : 18,
                                    },
                                    rpcUrls,
                                    blockExplorerUrls: explorerUrl ? [explorerUrl] : [],
                                };
                                await window.ethereum.request({
                                    method: "wallet_addEthereumChain",
                                    params: [addParams],
                                });
                            } else {
                                throw switchErr;
                            }
                        }
                    }
                    if (window.notify) {
                        window.notify("Rede enviada para a carteira", "success");
                    }
                } catch (e) {
                    console.error(e);
                    const text = e && e.message ? e.message : e;
                    if (window.notify) {
                        window.notify("Erro ao adicionar rede: " + text, "error");
                    } else {
                        alert("Erro ao adicionar rede: " + text);
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };
    }

    const addTokenBtn = document.getElementById("btnAddToMetaMaskSmall");
    if (addTokenBtn) {
        addTokenBtn.onclick = async () => {
             const address = state?.deployed?.address;
             const symbol = state?.form?.token?.symbol || "TKN";
             const decimals = state?.form?.token?.decimals || 18;
             
             if (!address) return alert("Contrato não implantado ainda.");
             
             // Prevent duplicate requests if user clicks fast
             if (addTokenBtn.disabled) return;
             addTokenBtn.disabled = true;
             
             try {
                const res = await addTokenToMetaMask({ address, symbol, decimals });
                if (!res.success) {
                    if (window.notify) window.notify("Erro ao adicionar token: " + res.error, "error");
                    else alert("Erro ao adicionar token: " + res.error);
                } else {
                    if (window.notify) window.notify("Solicitação enviada para a carteira", "success");
                }
             } finally {
                 addTokenBtn.disabled = false;
             }
        };
    }
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
         
         const success = await deployContract();
         
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
     const erc20Details = document.getElementById("erc20-details");
     const contractSearchContainer = document.getElementById("contract-search-container");
     const shareSection = document.getElementById("share-section");
     const filesSection = document.getElementById("files-section");
     
     if (erc20Details) erc20Details.classList.remove("d-none");
     if (contractSearchContainer) contractSearchContainer.classList.remove("d-none");
     if (shareSection) shareSection.classList.remove("d-none");
     if (filesSection) filesSection.classList.remove("d-none");

     const csRoot = document.getElementById("contract-search-root");
     if (csRoot) csRoot.classList.add("d-none");
     
     const csInfo = document.getElementById("selected-contract-info");
     if (csInfo) csInfo.classList.remove("d-none");

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
     setTxt("cs_viewTokenBalance", "-");
     setTxt("cs_viewNativeBalance", "-");
     setTxt("cs_viewCompilerVersion", "Solidity (Latest)");
     setTxt("cs_viewOptimization", "Enabled");
     
     const explorerContractUrl = getExplorerContractUrl(state.deployed.address, chainId);
     const csAddressLink = document.getElementById("cs_viewAddress");
     if (csAddressLink) csAddressLink.href = explorerContractUrl;

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

     const generatedLink = document.getElementById("generatedLink");
     if (generatedLink) {
          const sharePath = "/pages/modules/link/link-token.html";
          const params = new URLSearchParams({
              address: state.deployed.address,
              chainId: String(chainId),
              name: state.form.token.name || "",
              symbol: state.form.token.symbol || "",
              decimals: state.form.token.decimals || "18",
              image: "", 
              rpc: state.form.network?.rpc?.[0] || "",
              explorer: state.form.network?.explorers?.[0]?.url || ""
          });
          generatedLink.value = `${window.location.origin}${sharePath}?${params.toString()}`;
     }

     try {
       const csContainer = document.querySelector('#contract-search-container [data-component*="contract-search.html"]') || document.querySelector('[data-component*="contract-search.html"]');
       if (csContainer && state.deployed.address) {
         csContainer.setAttribute("data-chainid", String(chainId));
         const addrField = document.getElementById("f_address");
         const tokenField = document.getElementById("tokenAddress");
         const addr = state.deployed.address;
         if (addrField) addrField.value = addr;
         if (tokenField) tokenField.value = addr;
         updateContractDetailsView(csContainer, chainId, addr).catch(e => console.error("Erro ao atualizar detalhes do contrato:", e));
       }
     } catch (e) {
       console.error(e);
     }

     if (erc20Details) {
         setTimeout(() => {
           erc20Details.scrollIntoView({ behavior: "smooth", block: "center" });
         }, 100);
     }
     
     const deployContainer = document.getElementById("deployStatusContainer");
     if (deployContainer) deployContainer.classList.add("d-none");
 }
}

// Make available globally as 'wizard' to match HTML onclick="wizard.deploy()"
window.wizard = new TokenPageManager();
