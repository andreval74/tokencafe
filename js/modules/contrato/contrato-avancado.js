import { checkConnectivity } from "../../shared/components/api-status.js";
import { 
    state, 
    readForm, 
    runAllFieldValidation, 
    connectWallet,
    CONTRACT_GROUPS,
    updateVanityVisibility,
    validateForm,
    deployContract,
    compileContract,
    getSerializableState
} from "./builder.js";
import { walletConnector } from "../../shared/wallet-connector.js";
// import { compileContract } from "./builder.js"; // Import merged above
import { getExplorerContractUrl, getExplorerTxUrl } from "./explorer-utils.js";
import { addTokenToMetaMask } from "../../shared/metamask-utils.js";
import { getFallbackChainName, getFallbackExplorer, getFallbackRpc } from "../../shared/network-fallback.js";
import { updateContractDetailsView } from "../../shared/contract-search.js";

/**
 * =================================================================================
 * GERENCIADOR AVANÇADO DE TOKENS (AdvancedTokenPageManager)
 * =================================================================================
 * Responsável por gerenciar a UI e lógica do novo gerador de contratos avançados.
 * Integra-se ao builder.js para reutilizar validações e lógica de compilação.
 * 
 * Funcionalidades:
 * - Navegação em abas (Geral, Taxas, Opcionais, Swap, Resumo)
 * - Configuração visual de taxas (Liquidez, Marketing, Burn)
 * - Integração com carteira para auto-preenchimento de rede e endereços
 * - Validação e Compilação via builder.js
 * =================================================================================
 */
class AdvancedTokenPageManager {
    constructor() {
        this.init();
    }

    /**
     * Inicializa o gerenciador, configurando listeners e estado inicial.
     */
    init() {
        console.log("AdvancedTokenPageManager initialized");

        // Define o grupo de contrato para 'erc20-advanced' (compatibilidade com builder.js)
        const groupInput = document.getElementById("contractGroup");
        if (groupInput) {
            groupInput.value = "erc20-advanced";
        }
        
        // Initial summary update
        updateContractInfo();

        // Inicializa máscaras de input (ex: formatação de números)
        // initSupplyMask é tratado internamente pelo builder.js

        // Listen for contract verification success
        document.addEventListener("contract:verified", (e) => {
            const csContainer = document.getElementById("contract-search-container");
            const verifyBtn = document.getElementById("erc20VerifyLaunch");
            
            if (csContainer) {
                const statusEl = csContainer.querySelector("#cs_viewStatus");
                if (statusEl) {
                    statusEl.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>Verificado';
                    statusEl.className = "status-text text-success fw-bold";
                }
            }
            
            // Hide the verify button container/wrapper
            if (verifyBtn) {
                const wrapper = verifyBtn.closest(".mt-3"); // The div wrapper
                if (wrapper) wrapper.classList.add("d-none");
            }
            
            if (state.deployed) state.deployed.verified = true;
        });

        // Configura navegação entre abas
        this.bindTabNavigation();

        // Configura seleção de rede
        this.bindNetwork();

        // Configura toggles de visualização de taxas
        this.bindTaxToggles();

        // Configura Vanity Address
        this.bindVanity();

        // Configura atualização dinâmica do resumo
        this.bindSummaryUpdates();

        // Configura ação de deploy
        this.bindDeploy();

        // Configura botões de compartilhamento
        this.bindShareButtons();

        // Configura conexão com carteira e auto-preenchimento
        this.bindWallet();
        
        // Verifica status da API (Feedback visual)
        this.checkApiStatus();

        // Estado inicial da UI
        this.updateTaxVisibility();
    }

    /**
     * Gerencia a integração com a seleção de rede.
     */
    bindNetwork() {
        // Listener para quando uma rede é selecionada (manual ou auto)
        document.addEventListener("network:selected", (e) => {
            if (e.detail && e.detail.network) {
                console.log("ContratoAvancado: Rede atualizada via evento", e.detail.network);
                state.form.network = e.detail.network;
                
                // Atualiza também os decimais/símbolo nativos se disponíveis
                if (e.detail.network.nativeCurrency) {
                    if (e.detail.network.nativeCurrency.decimals) {
                        state.form.sale.nativeDecimals = e.detail.network.nativeCurrency.decimals;
                    }
                    if (e.detail.network.nativeCurrency.symbol) {
                        state.form.sale.nativeSymbol = e.detail.network.nativeCurrency.symbol;
                    }
                }
            }
        });

        // Listener para quando a rede é limpa
        document.addEventListener("network:clear", () => {
             console.log("ContratoAvancado: Rede limpa");
             state.form.network = null;
        });
        
        // Verifica se já existe uma rede selecionada no componente (caso de recarga ou cache)
        // O componente network-search pode já ter detectado a rede antes deste init rodar
        setTimeout(() => {
            const nsInput = document.getElementById("networkSearch");
            if (nsInput && nsInput.dataset.chainId && window.__selectedNetwork) {
                 state.form.network = window.__selectedNetwork;
                 console.log("ContratoAvancado: Rede recuperada do cache global", state.form.network);
            }
        }, 500);
    }

    /**
     * Gerencia a navegação das abas do formulário.
     */
    bindTabNavigation() {
        // Botões de navegação (Próximo/Voltar)
        const navBtns = document.querySelectorAll('[data-go-to-tab]');
        
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.getAttribute('data-go-to-tab');
                const targetTabBtn = document.getElementById(`${targetId}-tab`);
                
                if (targetTabBtn) {
                    console.log(`Navegando para: ${targetId}`);
                    
                    // Se for botão de avançar (Próximo), validar a aba atual antes
                    // Botões 'Voltar' geralmente são btn-outline-secondary, 'Próximo' são btn-warning
                    if (btn.classList.contains('btn-warning')) { 
                        // Identificar aba atual
                        const activeTab = document.querySelector('.tab-pane.active');
                        if (activeTab) {
                            if (!this.validateTab(activeTab)) {
                                console.warn("Validação falhou na aba atual.");
                                // Feedback visual simples se toast não existir
                                if (!document.querySelector('.toast-container')) {
                                    alert("Por favor, preencha todos os campos obrigatórios marcados em vermelho.");
                                }
                                return; // Se inválido, não avança
                            }
                        }
                    }
                    
                    // Remove estado disabled temporariamente para permitir navegação programática
                    targetTabBtn.classList.remove('disabled');
                    targetTabBtn.removeAttribute('disabled');
                    targetTabBtn.setAttribute('aria-disabled', 'false');

                    // Ativa a aba via Bootstrap API
                    try {
                        if (window.bootstrap && window.bootstrap.Tab) {
                            const tab = window.bootstrap.Tab.getOrCreateInstance(targetTabBtn);
                            tab.show();
                        } else {
                            // Fallback: simula clique na aba
                            targetTabBtn.click();
                        }
                    } catch (err) {
                        console.error("Erro ao alternar aba via Bootstrap:", err);
                        targetTabBtn.click(); // Tentativa final
                    }
                    
                    // Rola para o topo do formulário
                    setTimeout(() => {
                        document.getElementById('generatorTabs')?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                } else {
                    console.error(`Botão de aba alvo não encontrado: ${targetId}-tab`);
                }
            });
        });
    }

    /**
     * Valida os campos da aba atual antes de prosseguir.
     * @param {HTMLElement} tabElement Elemento da aba atual
     * @returns {boolean} True se válido
     */
    validateTab(tabElement) {
        // Seleciona inputs requeridos visíveis na aba
        const inputs = tabElement.querySelectorAll('input[required], select[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
                
                // Remove erro ao digitar
                input.addEventListener('input', () => {
                    input.classList.remove('is-invalid');
                }, { once: true });
            }
        });
        
        if (!isValid) {
            // Feedback simples (pode ser melhorado com toasts)
            const firstInvalid = tabElement.querySelector('.is-invalid');
            if (firstInvalid) firstInvalid.focus();
        }
        
        return isValid;
    }

    /**
     * Configura os switches que mostram/escondem opções de taxas.
     */
    bindTaxToggles() {
        const toggle = (chkId, divId) => {
            const chk = document.getElementById(chkId);
            const div = document.getElementById(divId);
            if (chk && div) {
                chk.addEventListener('change', () => {
                    div.classList.toggle('d-none', !chk.checked);
                    this.updateSummary(); // Atualiza resumo ao mudar toggle
                });
            }
        };

        toggle('checkLiquidityTax', 'liquidityTaxOptions');
        toggle('checkWalletTax', 'walletTaxOptions');
        toggle('checkBurnTax', 'burnTaxOptions');
    }

    /**
     * Configura atualizações do resumo final.
     */
    bindSummaryUpdates() {
        // Atualiza ao entrar na aba de resumo
        const summaryTabBtn = document.getElementById('summary-tab');
        if (summaryTabBtn) {
            summaryTabBtn.addEventListener('shown.bs.tab', () => {
                this.updateSummary();
            });
        }

        // Atualiza ao alterar qualquer input
        const inputs = document.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.updateSummary());
        });

        // Escuta evento de deploy concluído (emitido pelo builder.js)
        document.addEventListener("contract:deployed", () => {
            this.updateSummary();
        });
    }

    /**
     * Atualiza o resumo do token na aba "Resumo".
     * Popula o card "DADOS DO CONTRATO / TOKEN" (Unified View).
     */
    updateSummary() {
        // Garante que o state.form esteja atualizado com os dados dos inputs
        readForm(); 

        // 1. Renderiza dados básicos (sempre visíveis)
        this.renderBasicSummary();

        // 2. Renderiza lista de recursos (sempre visível se houver recursos)
        this.renderResources();

        // 3. Atualiza estado de deploy
        const statusIndicator = document.getElementById("deploy-status-indicator");
        const addrLink = document.getElementById("erc20AddressLink");
        const txLink = document.getElementById("erc20TxLink");
        const btnCopyAddr = document.getElementById("btnCopyContractAddress");
        const btnCopyTx = document.getElementById("btnCopyContractTx");
        
        if (state.deployed?.address) {
            // DEPLOYED STATE
            if (statusIndicator) {
                statusIndicator.innerHTML = `
                    <span class="badge bg-success me-2">Sucesso</span>
                    <small class="text-success fw-bold">Contrato gerado e implantado!</small>
                `;
            }

            const chainId = state.form.network?.chainId || 1;
            const explorerUrl = getFallbackExplorer(chainId);
            const addressUrl = explorerUrl ? `${explorerUrl}/address/${state.deployed.address}` : "#";
            const txUrl = explorerUrl ? `${explorerUrl}/tx/${state.deployed.transactionHash}` : "#";

            if (addrLink) {
                addrLink.textContent = state.deployed.address;
                addrLink.href = addressUrl;
                addrLink.classList.remove("text-muted", "pointer-events-none");
                addrLink.classList.add("text-info");
            }
            if (txLink) {
                txLink.textContent = state.deployed.transactionHash;
                txLink.href = txUrl;
                txLink.classList.remove("text-muted", "pointer-events-none");
                txLink.classList.add("text-info");
            }

            if (btnCopyAddr) btnCopyAddr.classList.remove("d-none");
            if (btnCopyTx) btnCopyTx.classList.remove("d-none");

            // Popula a visualização final detalhada (Search Component & Share)
            this.populateFinalView();

        } else {
            // PENDING STATE
            if (statusIndicator) {
                statusIndicator.innerHTML = `
                   <span class="badge bg-secondary me-2">Pendente</span>
                   <small class="text-muted">Aguardando geração do contrato...</small>
                `;
            }
            
            if (addrLink) {
                addrLink.textContent = "-";
                addrLink.href = "#";
                addrLink.classList.add("text-muted", "pointer-events-none");
                addrLink.classList.remove("text-info");
            }
            if (txLink) {
                txLink.textContent = "-";
                txLink.href = "#";
                txLink.classList.add("text-muted", "pointer-events-none");
                txLink.classList.remove("text-info");
            }

            if (btnCopyAddr) btnCopyAddr.classList.add("d-none");
            if (btnCopyTx) btnCopyTx.classList.add("d-none");
        }
    }

    renderBasicSummary() {
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };

        const f = state.form.token;
        const net = state.form.network;

        setTxt("sumTokenName", f.name || "-");
        setTxt("sumTokenSymbol", f.symbol || "-");
        
        if (f.initialSupply) {
            setTxt("sumInitialSupply", String(f.initialSupply).replace(/\B(?=(\d{3})+(?!\d))/g, "."));
        } else {
            setTxt("sumInitialSupply", "-");
        }
        
        setTxt("sumTokenDecimals", f.decimals || "18");
        setTxt("sumNetworkName", net ? (net.name || `Chain ${net.chainId}`) : "Não selecionada");
    }

    /**
     * Popula a visualização final do contrato (pós-deploy) reutilizando o componente de busca.
     * Preenche os campos manualmente para garantir feedback imediato sem depender de indexadores externos.
     */
    populateFinalView() {
        if (!state.deployed) return;

        // 1. Unhide standard sections
        const sections = [
            "erc20-details",
            "contract-search-container",
            "share-section",
            "files-section"
        ];
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove("d-none");
        });

        // Populate Share Link
        const generatedLinkInput = document.getElementById("generatedLink");
        if (generatedLinkInput) {
             generatedLinkInput.value = this.getShareLink();
        }

        // 2. Prepare Data
        const form = state.form?.token || {};
        const net = state.form?.network || {};
        const chainId = state.deployed.chainId || net.chainId;
        const address = state.deployed.address;
        const txHash = state.deployed.transactionHash;

        const explorerUrl = state.deployed.explorerUrl || getFallbackExplorer(chainId);
        const addressUrl = explorerUrl ? `${explorerUrl}/address/${address}` : null;
        const txUrl = explorerUrl ? `${explorerUrl}/tx/${txHash}` : null;

        // 3. Populate ERC20 Details (Top Box)
        const addrLink = document.getElementById("erc20AddressLink");
        if (addrLink) {
            addrLink.textContent = address || "-";
            if (addressUrl) addrLink.href = addressUrl;
        }

        const txLink = document.getElementById("erc20TxLink");
        if (txLink) {
            txLink.textContent = txHash || "-";
            if (txUrl) txLink.href = txUrl;
        }

        // 4. Populate Contract Search Component (Detailed View)
        // Note: The component is inside #contract-search-container
        const csContainer = document.getElementById("contract-search-container");
        if (csContainer) {
             // Hide Search Form, Show Result Card
             const searchForm = csContainer.querySelector("#contract-search-root");
             const detailsCard = csContainer.querySelector("#selected-contract-info");
             
             if (searchForm) searchForm.classList.add("d-none");
             if (detailsCard) detailsCard.classList.remove("d-none");

             // Helper to set text/link inside component
             const setText = (sel, val) => {
                 const el = csContainer.querySelector(sel);
                 if (el) el.textContent = val;
             };
             const setLink = (sel, val, href) => {
                 const el = csContainer.querySelector(sel);
                 if (el) {
                     el.textContent = val;
                     if (href) {
                         el.href = href;
                         el.classList.remove("text-muted", "text-body");
                         el.classList.add("text-tokencafe");
                     } else {
                         el.removeAttribute("href");
                     }
                 }
             };

             const netName = net.name || `Chain ID ${chainId}`;
             setText("#cs_viewChainId", `${chainId} - ${netName}`);
             
             setLink("#cs_viewAddress", address, addressUrl);

             setText("#cs_viewName", form.name || "-");
             setText("#cs_viewSymbol", form.symbol || "-");
             setText("#cs_viewDecimals", form.decimals || "18");

             let supplyFmt = form.initialSupply || "-";
             try {
                 supplyFmt = Number(supplyFmt).toLocaleString('pt-BR');
             } catch (_) {}
             setText("#cs_viewSupply", supplyFmt);
             
             // Status e Saldos
             const statusEl = csContainer.querySelector("#cs_viewStatus");
             if (state.deployed.verified) {
                 if (statusEl) {
                     statusEl.innerHTML = '<i class="bi bi-patch-check-fill me-1"></i>Verificado';
                     statusEl.className = "status-text text-success fw-bold";
                 }
                 // Hide verify button in top box if verified
                 const verifyBtn = document.getElementById("erc20VerifyLaunch");
                 if (verifyBtn) verifyBtn.closest(".mt-3")?.classList.add("d-none");
             } else {
                 if (statusEl) {
                     statusEl.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Sucesso (Deploy)';
                     statusEl.className = "status-text text-primary fw-bold";
                 }
             }

             setText("#cs_viewTokenBalance", supplyFmt);
             setText("#cs_viewNativeBalance", "0.00");
             setText("#cs_viewCompilerVersion", "v0.8.20+commit.a1b79de6");
             setText("#cs_viewOptimization", "Enabled (Runs: 200)");
             setText("#cs_viewOtherSettings", "License: MIT | EVM: Paris");
             setText("#cs_viewPairAddress", "Não criado");
        }
    }

    /**
     * Renderiza a lista de recursos ativos.
     */
    renderResources() {
        const container = document.getElementById("contract-resources-display");
        const list = document.getElementById("resources-list");
        
        if (!container || !list) return;

        list.innerHTML = "";

        // Collect active features directly from DOM for immediate feedback
        const features = [];
        const check = (id, label, icon) => {
            const el = document.getElementById(id);
            if (el && el.checked) {
                features.push({ label, icon });
            }
        };

        check("checkMintable", "Mintable", "bi-printer");
        check("checkBurnable", "Burnable", "bi-fire");
        check("checkPausable", "Pausable", "bi-pause-circle");
        check("checkAntibot", "Anti-Bot", "bi-robot");
        check("checkRecoverable", "Recoverable", "bi-arrow-counterclockwise");
        check("checkBlacklist", "Blacklist", "bi-slash-circle");
        check("checkOwnable", "Ownable", "bi-person-badge");
        check("checkRoles", "Roles", "bi-people");
        check("checkPermit", "Permit", "bi-file-earmark-check");
        check("checkVotes", "Votes", "bi-megaphone");
        check("checkFlashMint", "FlashMint", "bi-lightning");
        check("checkSnapshots", "Snapshots", "bi-camera");
        check("checkMaxWallet", "Max Wallet", "bi-wallet2");
        check("checkMaxTx", "Max Tx", "bi-arrow-left-right");

        // Tax toggles
        if (document.getElementById("checkLiquidityTax")?.checked) features.push({ label: "Liquidez Auto", icon: "bi-droplet" });
        if (document.getElementById("checkWalletTax")?.checked) features.push({ label: "Taxa Carteira", icon: "bi-wallet" });
        if (document.getElementById("checkBurnTax")?.checked) features.push({ label: "Taxa Queima", icon: "bi-fire" });

        if (features.length > 0) {
            container.classList.remove("d-none");
            features.forEach(feat => {
                const col = document.createElement("div");
                col.className = "col-6 col-md-4 col-lg-3";
                col.innerHTML = `
                    <div class="d-flex align-items-center p-2 rounded border border-secondary bg-dark-elevated">
                        <i class="bi ${feat.icon} text-warning fs-5 me-2"></i>
                        <span class="text-white small fw-bold">${feat.label}</span>
                    </div>
                `;
                list.appendChild(col);
            });
        } else {
            container.classList.add("d-none");
        }
    }

    /**
     * Atualiza visibilidade inicial das taxas (caso recarregue com checkbox marcado).
     */
    updateTaxVisibility() {
        const ids = ['checkLiquidityTax', 'checkWalletTax', 'checkBurnTax'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.dispatchEvent(new Event('change'));
        });
    }

    /**
     * Vincula a seção de personalização de endereço (Vanity Address).
     */
    bindVanity() {
        const vanityMode = document.getElementById("vanityMode");
        if (vanityMode) {
            vanityMode.addEventListener("change", () => {
                updateVanityVisibility();
            });
            // Initial update
            updateVanityVisibility();
        }
    }

    /**
     * Gera o link de compartilhamento do token.
     * @returns {string} URL de compartilhamento
     */
    getShareLink() {
        // Se o input já tiver valor, usa ele (preserva edições manuais se houver)
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
    }

    /**
     * Configura botões de compartilhamento e adição de rede/token.
     */
    bindShareButtons() {
        // Copiar Link
        const copyBtn = document.getElementById("copyAddressBtn");
        if (copyBtn) {
            copyBtn.addEventListener("click", () => {
                const link = this.getShareLink();
                if (!link) return;
                
                navigator.clipboard.writeText(link).then(() => {
                    const icon = copyBtn.querySelector("i");
                    if (icon) {
                        const old = icon.className;
                        icon.className = "bi bi-check2 text-success";
                        setTimeout(() => icon.className = old, 1500);
                    }
                }).catch(() => {});
            });
        }

        // Visualizar Link
        const viewBtn = document.getElementById("viewAddressBtn");
        if (viewBtn) {
            viewBtn.addEventListener("click", () => {
                window.open(this.getShareLink(), "_blank");
            });
        }

        // WhatsApp
        const waBtn = document.getElementById("btnShareWhatsAppSmall");
        if (waBtn) {
            waBtn.addEventListener("click", () => {
                const link = this.getShareLink();
                const text = encodeURIComponent(`Confira meu novo token criado no TokenCafe! 🚀\n\n${link}`);
                window.open(`https://wa.me/?text=${text}`, "_blank");
            });
        }
        
        // Telegram
        const tgBtn = document.getElementById("btnShareTelegramSmall");
        if (tgBtn) {
            tgBtn.addEventListener("click", () => {
                const link = this.getShareLink();
                const text = encodeURIComponent(`Confira meu novo token criado no TokenCafe! 🚀`);
                window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${text}`, "_blank");
            });
        }

        // Email
        const emailBtn = document.getElementById("btnShareEmailSmall");
        if (emailBtn) {
            emailBtn.addEventListener("click", () => {
                const link = this.getShareLink();
                const subject = encodeURIComponent("Novo Token Criado");
                const body = encodeURIComponent(`Confira este token: ${link}`);
                window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
            });
        }

        // Adicionar Rede
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
                                // Erro 4902: Chain not added
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
                        alert("Rede adicionada/trocada com sucesso!");
                    } catch (e) {
                        console.error(e);
                        alert("Erro ao adicionar rede: " + (e.message || e));
                    }
                } catch (e) {
                    console.error(e);
                }
            };
        }

        // Adicionar Token
        const addTokenBtn = document.getElementById("btnAddToMetaMaskSmall");
        if (addTokenBtn) {
            addTokenBtn.onclick = async () => {
                const address = state?.deployed?.address;
                const symbol = state?.form?.token?.symbol || "TKN";
                const decimals = state?.form?.token?.decimals || 18;
                
                if (!address) return alert("Contrato não implantado ainda.");
                
                if (addTokenBtn.disabled) return;
                addTokenBtn.disabled = true;
                
                try {
                    const res = await addTokenToMetaMask({ address, symbol, decimals });
                    if (!res.success) {
                        alert("Erro ao adicionar token: " + res.error);
                    } else {
                        alert("Solicitação enviada para a carteira!");
                    }
                } catch (e) {
                    console.error(e);
                    alert("Erro ao processar: " + e.message);
                } finally {
                    setTimeout(() => addTokenBtn.disabled = false, 2000);
                }
            };
        }
    }

    /**
     * Vincula o botão de deploy à lógica de compilação e publicação.
     */
    bindDeploy() {
        const btnCreate = document.getElementById("btnCreateToken");
        if (btnCreate) {
            btnCreate.addEventListener("click", (e) => {
                if (e) e.preventDefault();
                this.deploy();
            });
        }
        
        // Reset button
        const btnReset = document.getElementById("btnResetForm");
        if (btnReset) {
            btnReset.addEventListener("click", () => window.location.reload());
        }
    }

    /**
     * Executa o fluxo completo de criação do token: Validação -> Compilação -> Deploy.
     */
    async deploy() {
        const deployContainer = document.getElementById("deployStatusContainer");
        const statusText = document.getElementById("contractStatus");
        const btn = document.getElementById("btnCreateToken");
        
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
                throw new Error("Falha na compilação. Verifique os logs.");
            }

            // 6. Deploy
            if (statusText) statusText.textContent = "Solicitando assinatura da transação...";
            const success = await deployContract(); // This handles the actual deploy via builder.js logic
            
            if (success) {
                // Save state to sessionStorage for the details page
                const safeState = getSerializableState();
                if (safeState) {
                    sessionStorage.setItem("lastDeployedContract", JSON.stringify(safeState));
                    // Redirect to details page
                    window.location.href = "contrato-detalhes.html";
                } else {
                    console.error("Falha ao serializar estado.");
                    alert("Contrato criado, mas houve erro ao salvar estado. Redirecionando...");
                    window.location.href = "contrato-detalhes.html";
                }
            }
            
        } catch (err) {
            console.error(err);
            alert(`Erro no processo: ${err.message || err}`);
            if (deployContainer) deployContainer.classList.add("d-none");
        } finally {
             if (btn) {
                 btn.disabled = false;
                 btn.innerHTML = `<i class="bi bi-rocket-takeoff me-2"></i> CRIAR CONTRATO`;
             }
        }
    }
    
    /**
     * Gerencia conexão com carteira e preenchimento automático de campos.
     * Utiliza eventos do módulo de carteira (wallet-connector.js).
     */
    bindWallet() {
        // Função auxiliar para atualizar UI baseada no status
        const updateDisplay = (status) => {
            const walletInput = document.getElementById("walletAddressField");

            // Atualiza Carteira
            if (walletInput) {
                if (status && status.account) {
                    walletInput.value = status.account;
                } else {
                    walletInput.value = "";
                    walletInput.placeholder = "Nenhuma carteira conectada";
                }
            }
            
            // A atualização da Rede agora é gerenciada automaticamente pelo componente network-search.js
            // que possui sua própria lógica de auto-detecção (autoDetectNetwork).
        };

        // Configura botão de copiar carteira
        const copyBtn = document.getElementById("btnCopyWallet");
        if (copyBtn) {
            // Remove listener anterior para evitar duplicidade (se houver recargas)
            const newBtn = copyBtn.cloneNode(true);
            copyBtn.parentNode.replaceChild(newBtn, copyBtn);
            
            newBtn.addEventListener("click", () => {
                const walletInput = document.getElementById("walletAddressField");
                if (walletInput && walletInput.value) {
                    navigator.clipboard.writeText(walletInput.value);
                    const originalIcon = newBtn.innerHTML;
                    newBtn.innerHTML = '<i class="bi bi-check text-success"></i>';
                    setTimeout(() => newBtn.innerHTML = originalIcon, 1500);
                }
            });
        }

        // Escuta eventos padronizados do sistema de carteira
        document.addEventListener("wallet:connected", (e) => updateDisplay(e.detail));
        document.addEventListener("wallet:accountChanged", (e) => updateDisplay(e.detail));
        document.addEventListener("wallet:chainChanged", (e) => updateDisplay(e.detail));
        document.addEventListener("wallet:disconnected", () => updateDisplay({ account: null, chainId: null }));

        // DETECÇÃO AUTOMÁTICA AO INICIAR
        const tryAutoDetect = async () => {
            // 1. Tenta via WalletConnector (preferencial)
            if (typeof walletConnector !== 'undefined') {
                const status = walletConnector.getStatus();
                if (status.isConnected || status.account) {
                    console.log("Detectada conexão prévia via WalletConnector:", status);
                    updateDisplay(status);
                    return;
                }
                
                // Tenta reconexão silenciosa se o conector existir mas não estiver conectado
                if (walletConnector.connectSilent) {
                     walletConnector.connectSilent().then(res => {
                        if (res && res.account) updateDisplay(res);
                     }).catch(() => {});
                }
            }
            
            // 2. Tenta via State global
            if (typeof state !== 'undefined' && state.wallet && state.wallet.account) {
                updateDisplay(state.wallet);
                return;
            }

            // 3. Fallback: Tenta ler diretamente do Provider (MetaMask) sem popup
            if (window.ethereum) {
                try {
                    // Tenta selectedAddress (propriedade síncrona legada mas rápida)
                    if (window.ethereum.selectedAddress) {
                         updateDisplay({ account: window.ethereum.selectedAddress });
                    }
                    
                    // Tenta eth_accounts (assíncrono, verifica permissões já concedidas)
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts && accounts.length > 0) {
                        updateDisplay({ account: accounts[0] });
                    }
                } catch (err) {
                    console.warn("Erro na auto-detecção de carteira:", err);
                }
            }
        };

        // Executa detecção
        tryAutoDetect();
    }

    /**
     * Verifica disponibilidade da API (Backend).
     * Reutiliza lógica centralizada do ApiStatusComponent.
     */
    async checkApiStatus() {
        // Exibe durante a checagem
        await checkConnectivity(true);
    }

    /**
     * Injeta campos específicos da UI avançada no estado global (builder.js).
     * REMOVIDO: Lógica movida para readForm() em builder.js
     */
    injectAdvancedState() {
       // Lógica centralizada em builder.js
    }
}

// Inicializa o gerenciador quando o DOM estiver pronto
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        new AdvancedTokenPageManager();
    });
} else {
    new AdvancedTokenPageManager();
}