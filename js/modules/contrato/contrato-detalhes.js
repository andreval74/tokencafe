
import { updateContractDetailsView } from "../../shared/contract-search.js";
import { getExplorerContractUrl } from "./explorer-utils.js";
import { ShareManager } from "./share-manager.js";

class ContractDetailsManager {
    constructor() {
        this.state = null;
        this.init();
    }

    init() {
        console.log("ContractDetailsManager initialized");

        // 1. Check URL Params first (View Mode)
        const urlParams = new URLSearchParams(window.location.search);
        const urlAddress = urlParams.get('address');
        const urlChainId = urlParams.get('chainId');

        if (urlAddress && urlChainId) {
             this.initFromUrl(urlAddress, urlChainId);
             return;
        }

        // 2. Load State from SessionStorage (Deploy Mode)
        const stored = sessionStorage.getItem("lastDeployedContract");
        if (stored) {
             try {
                 this.state = JSON.parse(stored);
                 if (this.state && (this.state.deployed?.address || this.state.deployed?.contractAddress)) {
                     // Normalize address field if needed
                     if (!this.state.deployed.address && this.state.deployed.contractAddress) {
                         this.state.deployed.address = this.state.deployed.contractAddress;
                     }
                     this.initFromState();
                     return;
                 } else {
                     console.warn("Estado inválido ou incompleto:", this.state);
                 }
             } catch (e) {
                 console.error("Erro ao processar dados do contrato:", e);
             }
        }

        // 3. Empty State
        this.showEmptyState();
    }

    async initFromUrl(address, chainId) {
        try {
            console.log("Initializing from URL params:", address, chainId);
            
            // Mock minimal state for View Mode
            this.state = {
                deployed: { address: address },
                form: {
                    network: { chainId: chainId },
                    token: {
                        name: "Carregando...",
                        symbol: "...",
                        decimals: 18
                    }
                },
                compilation: null // No source code available in view mode
            };

            // Wait for shared components to load
            await this.waitForActionsComponent();

            // Setup UI for View Mode
            this.setupContractView();
            
            // Share Section
            const shareConfig = {
                address: address,
                chainId: chainId,
                name: "", // Will be updated by view?
                symbol: "",
                decimals: "18",
                rpc: "",
                explorer: getExplorerContractUrl(address, chainId)
            };
            
            try {
                const shareManager = new ShareManager(shareConfig);
                shareManager.setupUI();
            } catch (err) {
                console.error("Erro ao inicializar ShareManager:", err);
            }
            
            // Hide Downloads (no source)
            const filesSection = document.getElementById("files-section");
            if (filesSection) filesSection.classList.add("d-none");
            
            // Hide Status Alert
            const alertBox = document.getElementById("status-alert");
            if (alertBox) alertBox.classList.add("d-none");

        } catch (e) {
            console.error("Erro fatal em initFromUrl:", e);
        }
    }

    async initFromState() {
        try {
            console.log("Initializing from Session State (Fresh Deploy)");
            
            // Wait for shared components to load
            await this.waitForActionsComponent();
            
            // Show Success Alert
            const alertBox = document.getElementById("status-alert");
            if (alertBox) {
                alertBox.className = "alert alert-success border-success bg-dark-elevated text-success mb-4";
                alertBox.innerHTML = `
                    <h4 class="alert-heading"><i class="bi bi-check-circle-fill me-2"></i>Contrato Criado com Sucesso!</h4>
                    <p class="mb-0">Seu contrato foi implantado na blockchain. Abaixo estão os detalhes, opções de compartilhamento e arquivos para download.</p>
                `;
                alertBox.classList.remove("d-none");
            }

            const { deployed, form } = this.state;

            // Share Section
            const shareConfig = {
                address: deployed?.address,
                chainId: form.network?.chainId,
                name: form.token.name,
                symbol: form.token.symbol,
                decimals: form.token.decimals,
                rpc: form.network?.rpc?.[0],
                explorer: form.network?.explorers?.[0]?.url
            };
            
            try {
                const shareManager = new ShareManager(shareConfig);
                shareManager.setupUI();
            } catch (err) {
                 console.error("Erro ao inicializar ShareManager:", err);
            }

            this.setupDownloads();
            this.setupContractView();

        } catch (e) {
            console.error("Erro fatal em initFromState:", e);
            const alertBox = document.getElementById("status-alert");
            if (alertBox) {
                alertBox.className = "alert alert-danger";
                alertBox.textContent = "Erro interno ao carregar detalhes: " + e.message;
                alertBox.classList.remove("d-none");
            }
        }
    }

    waitForActionsComponent() {
        return new Promise((resolve) => {
            let attempts = 0;
            const check = () => {
                attempts++;
                // Check for a key element from contract-actions.html
                const el = document.getElementById("generatedLink");
                if (el) {
                    resolve();
                } else if (attempts > 50) { // 5 seconds
                    console.warn("Timeout waiting for contract-actions component");
                    resolve(); // Resolve anyway to avoid blocking
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    showEmptyState() {
        const alertBox = document.getElementById("status-alert");
        if (alertBox) {
            alertBox.className = "alert alert-secondary border-secondary bg-dark-elevated text-light mb-4";
            alertBox.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="bi bi-info-circle me-3 fs-4 text-muted"></i>
                    <div>
                        <h5 class="mb-1">Nenhum contrato recém-criado</h5>
                        <p class="mb-0 small text-muted">Nenhum dado de deploy recente encontrado. <a href="contrato-index.html" class="alert-link">Criar novo contrato</a>.</p>
                    </div>
                </div>
            `;
            alertBox.classList.remove("d-none");
        }
        document.getElementById("files-section")?.classList.add("d-none");
        document.getElementById("share-section")?.classList.add("d-none");
        // Manter busca visível para não deixar a página totalmente vazia
        document.getElementById("contract-search-container")?.classList.remove("d-none");
    }

    setupContractView() {
        // Wait for component loader (if necessary) or try immediately
        const container = document.getElementById("contract-search-container");
        let attempts = 0;
        const maxAttempts = 50; // 10 seconds timeout

        const tryUpdate = async () => {
            attempts++;
            // Check if inner HTML structure is present (cs_viewAddress is a good indicator)
            const viewAddr = document.getElementById("cs_viewAddress");
            
            if (viewAddr) {
                this.populateContractDetails();
            } else {
                if (attempts >= maxAttempts) {
                    console.warn("Timeout waiting for contract-search component. Attempting fallback load...");
                    
                    // Fallback: Tentar carregar manualmente se o BaseSystem falhar
                    try {
                        const resp = await fetch("../../../pages/shared/components/contract-search.html");
                        if (resp.ok) {
                            const html = await resp.text();
                            const target = container.querySelector('[data-component]') || container;
                            target.innerHTML = html;
                            
                            // Re-check immediately
                            setTimeout(() => {
                                if (document.getElementById("cs_viewAddress")) {
                                    this.populateContractDetails();
                                } else {
                                    this.showErrorState("Falha ao renderizar componente de detalhes.");
                                }
                            }, 100);
                            return;
                        }
                    } catch (e) {
                        console.error("Fallback load failed:", e);
                    }

                    this.showErrorState("Componente de detalhes demorou a carregar. Tente recarregar a página.");
                    return;
                }
                // Retry
                setTimeout(tryUpdate, 200);
            }
        };

        tryUpdate();
    }

    showErrorState(msg) {
        const alertBox = document.getElementById("status-alert");
        if (alertBox && !alertBox.classList.contains("alert-success")) {
            alertBox.className = "alert alert-warning";
            alertBox.textContent = `Aviso: ${msg}`;
            alertBox.classList.remove("d-none");
        }
    }

    async populateContractDetails() {
        const { deployed, form } = this.state;
        const chainId = form.network?.chainId || 1;
        const address = deployed?.address;

        if (!address) return;

        // Manually populate the view fields for immediate feedback
        const setText = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
        
        setText("cs_viewAddress", address);
        setText("cs_viewChainId", chainId);
        setText("cs_viewName", form.token.name || "-");
        setText("cs_viewSymbol", form.token.symbol || "-");
        setText("cs_viewDecimals", form.token.decimals || "18");
        
        if (form.token.initialSupply) {
            setText("cs_viewSupply", String(form.token.initialSupply).replace(/\B(?=(\d{3})+(?!\d))/g, "."));
        }
        
        setText("cs_viewStatus", "Novo (Deploy)");
        
        // Links
        const explorerContractUrl = getExplorerContractUrl(address, chainId);
        const addrLink = document.getElementById("cs_viewAddress");
        if (addrLink) addrLink.href = explorerContractUrl;

        // Show the info card
        const infoCard = document.getElementById("selected-contract-info");
        if (infoCard) infoCard.classList.remove("d-none");
        
        // Hide the search bar input group
        const searchInputGroup = document.querySelector("#contract-search-container .input-group");
        if (searchInputGroup) searchInputGroup.classList.add("d-none");

        // Trigger robust update from contract-search.js
        try {
            const container = document.getElementById("contract-search-container");
            await updateContractDetailsView(container, chainId, address);
        } catch (e) {
            console.error("Erro ao atualizar view detalhada:", e);
        }
    }

    setupDownloads() {
        const { compilation, form } = this.state;
        
        const downloadFile = (filename, content, type = "text/plain") => {
            try {
                const blob = new Blob([content], { type });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (e) {
                console.error("Erro ao fazer download:", e);
                alert("Erro ao iniciar download: " + e.message);
            }
        };

        const contractName = compilation?.contractName || "Contract";

        // .sol
        const btnSol = document.getElementById("btnDownloadSol");
        if (btnSol && compilation?.sourceCode) {
            btnSol.onclick = () => {
                downloadFile(`${contractName}.sol`, compilation.sourceCode);
            };
            btnSol.disabled = false;
        } else if (btnSol) {
            btnSol.disabled = true;
        }

        // .json (Standard JSON Input)
        const btnJson = document.getElementById("btnDownloadJson");
        if (btnJson && compilation?.input) {
            btnJson.onclick = () => {
                try {
                    // Formatar o JSON para ficar legível
                    const content = JSON.stringify(JSON.parse(compilation.input), null, 2);
                    downloadFile(`${contractName}_StandardInput.json`, content, "application/json");
                } catch(e) {
                    downloadFile(`${contractName}_Input.json`, compilation.input, "application/json");
                }
            };
            btnJson.disabled = false;
        } else if (btnJson) {
            btnJson.disabled = true;
        }

        // ABI
        const btnAbi = document.getElementById("btnDownloadAbi");
        if (btnAbi && compilation?.abi) {
            btnAbi.onclick = () => {
                const content = JSON.stringify(compilation.abi, null, 2);
                downloadFile(`${contractName}_ABI.json`, content, "application/json");
            };
            btnAbi.disabled = false;
        } else if (btnAbi) {
            btnAbi.disabled = true;
        }

        // Bytecode
        const btnByte = document.getElementById("btnDownloadDeployedBytecode");
        if (btnByte && compilation?.bytecode) {
            btnByte.onclick = () => {
                downloadFile(`${contractName}_Bytecode.txt`, compilation.bytecode);
            };
            btnByte.disabled = false;
        } else if (btnByte) {
            btnByte.disabled = true;
        }
    }
}

new ContractDetailsManager();
