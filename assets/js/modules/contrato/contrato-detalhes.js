
import { updateContractDetailsView, initContainer, updateVerificationBadge } from "../../shared/contract-search.js";
import { getExplorerContractUrl } from "./explorer-utils.js";
import { checkIsAdmin } from "./builder.js";
import { getVerificationStatus } from "../../shared/verify-utils.js";

class ContractDetailsManager {
    constructor() {
        this.state = null;
        this.verifPoll = null;
        this._walletListenersAttached = false;
        this.init();
    }

    applyShareAccessControl() {
        try {
            const barriersDisabled = window.TOKENCAFE_DISABLE_ADMIN_BARRIERS === true;
            const isAdmin =
                barriersDisabled ||
                (typeof checkIsAdmin === "function" && checkIsAdmin()) ||
                window.TOKENCAFE_IS_ADMIN === true;
            
            const files = document.getElementById("files-section");
            if (files) files.classList.toggle("d-none", !isAdmin);
        } catch (_) {}
    }

    attachWalletListeners() {
        try {
            if (this._walletListenersAttached) return;
            this._walletListenersAttached = true;

            const rerun = async () => {
                try {
                    if (this.state) this.setupDownloads();
                } catch (_) {}
                try {
                    this.applyShareAccessControl();
                } catch (_) {}
            };

            document.addEventListener("wallet:connected", rerun);
            document.addEventListener("wallet:disconnected", rerun);

            try {
                if (window.ethereum && typeof window.ethereum.on === "function") {
                    window.ethereum.on("accountsChanged", () => rerun());
                    window.ethereum.on("chainChanged", () => setTimeout(rerun, 300));
                }
            } catch (_) {}
        } catch (_) {}
    }

    resolveCompilationForDownloads() {
        try {
            const currentAddr = String(this.state?.deployed?.address || this.state?.deployed?.contractAddress || "").toLowerCase();
            const currentCid = Number(this.state?.form?.network?.chainId || this.state?.wallet?.chainId || 0);
            if (!currentAddr || !currentCid) return;

            if (this.state?.compilation?.sourceCode || this.state?.compilation?.input || this.state?.compilation?.abi || this.state?.compilation?.bytecode) {
                return;
            }

            // 1) Prefer artefatos completos da sessão de deploy
            try {
                const raw = sessionStorage.getItem("lastDeployedContract");
                const st = raw ? JSON.parse(raw) : null;
                const sAddr = String(st?.deployed?.address || st?.deployed?.contractAddress || "").toLowerCase();
                const sCid = Number(st?.form?.network?.chainId || st?.wallet?.chainId || 0);
                if (st && sAddr === currentAddr && sCid === currentCid && st?.compilation) {
                    this.state.compilation = { ...(this.state.compilation || {}), ...st.compilation };
                    return;
                }
            } catch (_) {}

            // 2) Fallback parcial: payload de verificação salvo (fonte do contrato)
            try {
                const raw = localStorage.getItem("tokencafe_contract_verify_payload");
                const p = raw ? JSON.parse(raw) : null;
                const pAddr = String(p?.contractAddress || "").toLowerCase();
                const pCid = Number(p?.chainId || 0);
                const src = String(p?.sourceCode || "").trim();
                if (p && pAddr === currentAddr && pCid === currentCid && src) {
                    const contractName = String(p?.contractName || "Contract").trim() || "Contract";
                    const inputObj = {
                        language: "Solidity",
                        sources: { [`${contractName}.sol`]: { content: src } },
                        settings: {
                            optimizer: {
                                enabled: p?.optimizationUsed === 0 || p?.optimizationUsed === "0" ? false : true,
                                runs: Number.isFinite(Number(p?.runs)) ? Number(p.runs) : 200
                            },
                            evmVersion: p?.evmVersion || p?.evmversion || "default"
                        }
                    };
                    this.state.compilation = {
                        ...(this.state.compilation || {}),
                        contractName,
                        sourceCode: src,
                        input: JSON.stringify(inputObj)
                    };
                }
            } catch (_) {}
        } catch (_) {}
    }

    async fetchDeployedBytecode(chainId, address) {
        try {
            const cid = Number(chainId);
            const addr = String(address || "").trim();
            if (!cid || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return "";

            try {
                if (window.ethereum?.request) {
                    const cur = await window.ethereum.request({ method: "eth_chainId" });
                    if (parseInt(cur, 16) === cid) {
                        const code = await window.ethereum.request({ method: "eth_getCode", params: [addr, "latest"] });
                        return typeof code === "string" ? code : "";
                    }
                }
            } catch (_) {}

            const candidates = [];
            if (cid === 97) candidates.push("https://bsc-testnet.publicnode.com", "https://endpoints.omniatech.io/v1/bsc-testnet/public");
            if (cid === 56) candidates.push("https://bsc-dataseed.binance.org", "https://rpc.ankr.com/bsc");

            for (const rpc of candidates) {
                try {
                    const resp = await fetch(rpc, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getCode", params: [addr, "latest"] })
                    });
                    const js = await resp.json().catch(() => null);
                    const code = js?.result ? String(js.result) : "";
                    if (code && code !== "0x") return code;
                } catch (_) {}
            }
        } catch (_) {}
        return "";
    }

    writeContractContext(address, chainId, pageName = "contrato-detalhes") {
        try {
            const addr = String(address || "").trim();
            const cid = Number(chainId);
            if (addr) document.cookie = `tokencafe_contract=${encodeURIComponent(addr)}; Path=/; SameSite=Lax`;
            if (cid && !isNaN(cid)) {
                const hex = "0x" + cid.toString(16);
                document.cookie = `tokencafe_chain_id=${encodeURIComponent(hex)}; Path=/; SameSite=Lax`;
            }
        } catch (_) {}
        try {
            const addr = String(address || "").trim();
            const cid = String(chainId || "").trim();
            const body = new URLSearchParams({ page: String(pageName || "contrato-detalhes") });
            if (addr) body.set("contract", addr);
            if (cid) body.set("chainId", cid);
            if (navigator.sendBeacon) {
                const blob = new Blob([body.toString()], { type: "application/x-www-form-urlencoded" });
                navigator.sendBeacon("log-event.php", blob);
            } else {
                fetch("log-event.php", { method: "POST", body, credentials: "include", keepalive: true, headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" } });
            }
        } catch (_) {}
    }

    startVerificationPolling(chainId, address) {
        try {
            if (this.verifPoll) return;
            const cid = String(chainId || "").trim();
            const addr = String(address || "").trim();
            if (!cid || !addr) return;
            let attempts = 0;
            const maxAttempts = 24;
            const poll = async () => {
                attempts++;
                if (attempts > maxAttempts) {
                    try { clearInterval(this.verifPoll); } catch (_) {}
                    this.verifPoll = null;
                    return;
                }
                try {
                    const js = await updateVerificationBadge(document, cid, addr, true);
                    if (js?.verified) {
                        try {
                            this.setupDownloads();
                        } catch (_) {}
                        try { clearInterval(this.verifPoll); } catch (_) {}
                        this.verifPoll = null;
                    }
                } catch (_) {}
            };
            const intervalMs = 3000;
            this.verifPoll = setInterval(poll, intervalMs);
            poll();
        } catch (_) {}
    }

    init() {
        console.log("ContractDetailsManager initialized");

        // 1. Check URL Params first (View Mode)
        const urlParams = new URLSearchParams(window.location.search);
        const urlAddress = urlParams.get('address');
        const urlChainId = urlParams.get('chainId');

        if (urlAddress && urlChainId) {
             try {
                 const stored = sessionStorage.getItem("lastDeployedContract");
                 const st = stored ? JSON.parse(stored) : null;
                 const sAddr = String(st?.deployed?.address || st?.deployed?.contractAddress || "").toLowerCase();
                 const sCid = String(st?.form?.network?.chainId || st?.wallet?.chainId || "").trim();
                 const uAddr = String(urlAddress || "").toLowerCase();
                 const uCid = String(urlChainId || "").trim();
                 if (st && sAddr && uAddr && sAddr === uAddr && sCid && uCid && sCid === uCid) {
                     this.state = st;
                     if (this.state.deployed && !this.state.deployed.address && this.state.deployed.contractAddress) {
                         this.state.deployed.address = this.state.deployed.contractAddress;
                     }
                     this.initFromState();
                     return;
                 }
             } catch (_) {}
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
            this.writeContractContext(address, chainId, "contrato-detalhes");
            
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
            this.startVerificationPolling(chainId, address);
            
            this.setupDownloads();
            this.applyShareAccessControl();
            this.attachWalletListeners();
            
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
            try {
                const addr = this.state?.deployed?.address || this.state?.deployed?.contractAddress || "";
                const cid = this.state?.form?.network?.chainId || "";
                this.writeContractContext(addr, cid, "contrato-detalhes");
                this.writeContractContext(addr, cid, "contrato_criado");
            } catch (_) {}
            
            // Wait for shared components to load
            await this.waitForActionsComponent();
            
            // Show Success Alert
            const alertBox = document.getElementById("status-alert");
            if (alertBox) {
                alertBox.className = "alert alert-success border-success bg-dark-elevated text-success mb-4";
                alertBox.innerHTML = `
                    <h4 class="alert-heading"><i class="bi bi-check-circle-fill me-2"></i>Contrato Criado com Sucesso!</h4>
                    <p class="mb-0">Seu contrato foi implantado na blockchain. Abaixo estão os detalhes e arquivos para download.</p>
                `;
                alertBox.classList.remove("d-none");
            }

            this.setupDownloads();
            this.applyShareAccessControl();
            this.attachWalletListeners();
            this.setupContractView();
            
            try {
                const addr = this.state?.deployed?.address || this.state?.deployed?.contractAddress || "";
                const cid = this.state?.form?.network?.chainId || "";
                if (addr && cid) this.startVerificationPolling(cid, addr);
            } catch (_) {}

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
                const el = document.getElementById("files-section") || document.getElementById("btnDownloadSol");
                if (el) {
                    console.log("Contract Actions component found after attempts:", attempts);
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
                        <p class="mb-0 small text-muted">Nenhum dado de deploy recente encontrado. <a href="index.php?page=contrato" class="alert-link">Criar novo contrato</a>.</p>
                    </div>
                </div>
            `;
            alertBox.classList.remove("d-none");
        }
        document.getElementById("files-section")?.classList.add("d-none");
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
                        const resp = await fetch("includes/shared/components/contract-search.php");
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

        // Hide the search bar input group
        const searchInputGroup = document.querySelector("#contract-search-container .input-group");
        if (searchInputGroup) searchInputGroup.classList.add("d-none");

        // Trigger robust update from contract-search.js
        try {
            const container = document.getElementById("contract-search-container");
            // Ensure component is initialized (listeners, etc)
            const componentEl = container.querySelector('[data-component]') || container;
            if (componentEl) initContainer(componentEl);
            
            // Only use preloaded data if we have real values (not placeholders from initFromUrl)
            let preloaded = null;
            if (form.token && form.token.name !== "Carregando...") {
                preloaded = {
                    tokenName: form.token.name,
                    tokenSymbol: form.token.symbol,
                    tokenDecimals: form.token.decimals,
                    tokenSupply: form.token.initialSupply,
                    txHash: deployed?.transactionHash || deployed?.txHash || ""
                };
            } else {
                preloaded = {
                    txHash: deployed?.transactionHash || deployed?.txHash || ""
                };
            }

            await updateContractDetailsView(componentEl, chainId, address, preloaded, { autoShowCard: true });
        } catch (e) {
            console.error("Erro ao atualizar view detalhada:", e);
        }
    }

    setupDownloads() {
        this.resolveCompilationForDownloads();
        const { compilation, form } = this.state;
        
        const container = document.getElementById("files-section");
        if (!container) return;
        
        const lockButtons = (message) => {
            const ids = ["btnDownloadSol", "btnDownloadJson", "btnDownloadAbi", "btnDownloadDeployedBytecode"];
            ids.forEach((id) => {
                const el = document.getElementById(id);
                if (!el) return;
                el.disabled = true;
                el.classList.add("disabled");
                el.setAttribute("aria-disabled", "true");
                el.onclick = (e) => {
                    try { e?.preventDefault?.(); } catch (_) {}
                    window.showFormError?.(message);
                };
            });
        };

        container.classList.remove("d-none");

        const currentAddr = String(this.state?.deployed?.address || this.state?.deployed?.contractAddress || "").trim();
        const currentCid = String(form?.network?.chainId || this.state?.wallet?.chainId || "").trim();

        const hasAnyFile =
            !!compilation?.sourceCode ||
            !!compilation?.input ||
            !!compilation?.abi ||
            !!compilation?.bytecode;

        if (!hasAnyFile) {
            try {
                if (!this._fetchingExplorerFiles && currentAddr && currentCid) {
                    this._fetchingExplorerFiles = true;
                    lockButtons("Carregando arquivos do explorer...");

                    let warn = document.getElementById("tcFilesUnavailable");
                    if (!warn) {
                        warn = document.createElement("div");
                        warn.id = "tcFilesUnavailable";
                        warn.className = "mt-2 small text-muted";
                        container.appendChild(warn);
                    }
                    warn.textContent = "Carregando código-fonte/ABI do explorer...";

                    getVerificationStatus(currentCid, currentAddr, true)
                        .then(async (js) => {
                            const next = { ...(this.state.compilation || {}) };

                            if (js?.contractName && !next.contractName) next.contractName = js.contractName;
                            if (js?.sourceCode && !next.sourceCode) next.sourceCode = js.sourceCode;
                            if (js?.abi && !next.abi) {
                                try {
                                    next.abi = typeof js.abi === "string" ? JSON.parse(js.abi) : js.abi;
                                } catch (_) {}
                            }

                            if (next.sourceCode && !next.input) {
                                const contractName = String(next.contractName || "Contract").trim() || "Contract";
                                const inputObj = {
                                    language: "Solidity",
                                    sources: { [`${contractName}.sol`]: { content: String(next.sourceCode) } },
                                    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "default" }
                                };
                                next.input = JSON.stringify(inputObj);
                            }

                            if (!next.bytecode) {
                                const code = await this.fetchDeployedBytecode(currentCid, currentAddr);
                                if (code) next.bytecode = code;
                            }

                            this.state.compilation = next;
                        })
                        .catch(() => {})
                        .finally(() => {
                            this._fetchingExplorerFiles = false;
                            try { this.setupDownloads(); } catch (_) {}
                        });
                    return;
                }
            } catch (_) {}

            lockButtons("Arquivos disponíveis apenas quando o contrato é criado pelo TokenCafe (sessão de deploy).");

            let warn = document.getElementById("tcFilesUnavailable");
            if (!warn) {
                warn = document.createElement("div");
                warn.id = "tcFilesUnavailable";
                warn.className = "mt-2 small text-muted";
                container.appendChild(warn);
            }
            warn.textContent = "Arquivos disponíveis apenas quando o contrato é criado pelo TokenCafe (sessão de deploy).";
            return;
        } else {
            const warn = document.getElementById("tcFilesUnavailable");
            if (warn) warn.remove();
        }

        const contractName = compilation?.contractName || "Contract";

        // .sol
        const btnSol = document.getElementById("btnDownloadSol");
        if (btnSol && compilation?.sourceCode) {
            btnSol.onclick = () => {
                this.showFileModal(`${contractName}.sol`, compilation.sourceCode);
            };
            btnSol.disabled = false;
            btnSol.classList.remove("disabled");
            btnSol.removeAttribute("aria-disabled");
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
                    this.showFileModal(`${contractName}_StandardInput.json`, content, "application/json");
                } catch(e) {
                    this.showFileModal(`${contractName}_Input.json`, compilation.input, "application/json");
                }
            };
            btnJson.disabled = false;
            btnJson.classList.remove("disabled");
            btnJson.removeAttribute("aria-disabled");
        } else if (btnJson) {
            btnJson.disabled = true;
        }

        // ABI
        const btnAbi = document.getElementById("btnDownloadAbi");
        if (btnAbi && compilation?.abi) {
            btnAbi.onclick = () => {
                const content = JSON.stringify(compilation.abi, null, 2);
                this.showFileModal(`${contractName}_ABI.json`, content, "application/json");
            };
            btnAbi.disabled = false;
            btnAbi.classList.remove("disabled");
            btnAbi.removeAttribute("aria-disabled");
        } else if (btnAbi) {
            btnAbi.disabled = true;
        }

        // Bytecode
        const btnByte = document.getElementById("btnDownloadDeployedBytecode");
        if (btnByte && compilation?.bytecode) {
            btnByte.onclick = () => {
                this.showFileModal(`${contractName}_Bytecode.txt`, compilation.bytecode);
            };
            btnByte.disabled = false;
            btnByte.classList.remove("disabled");
            btnByte.removeAttribute("aria-disabled");
        } else if (btnByte) {
            btnByte.disabled = true;
        }
    }

    showFileModal(filename, content, type = "text/plain") {
        const modalEl = document.getElementById("fileViewerModal");
        const contentEl = document.getElementById("fileViewerContent");
        const titleEl = document.getElementById("fileViewerModalLabel");
        const btnCopy = document.getElementById("btnModalCopy");
        const btnDownload = document.getElementById("btnModalDownload");

        if (!modalEl || !contentEl) {
            // Fallback: Download direto se modal não existir
            this.downloadFile(filename, content, type);
            return;
        }

        // Set Content
        titleEl.textContent = `Visualizar: ${filename}`;
        contentEl.value = content;

        // Clone buttons to remove old listeners
        const newBtnCopy = btnCopy.cloneNode(true);
        btnCopy.parentNode.replaceChild(newBtnCopy, btnCopy);
        
        const newBtnDownload = btnDownload.cloneNode(true);
        btnDownload.parentNode.replaceChild(newBtnDownload, btnDownload);

        // Copy Handler
        newBtnCopy.onclick = () => {
            navigator.clipboard.writeText(content).then(() => {
                const originalHtml = newBtnCopy.innerHTML;
                newBtnCopy.innerHTML = '<i class="bi bi-check-lg me-1"></i> Copiado!';
                newBtnCopy.classList.remove("btn-outline-light");
                newBtnCopy.classList.add("btn-success");
                setTimeout(() => {
                    newBtnCopy.innerHTML = originalHtml;
                    newBtnCopy.classList.add("btn-outline-light");
                    newBtnCopy.classList.remove("btn-success");
                }, 2000);
            }).catch(err => {
                console.error("Erro ao copiar:", err);
                window.showFormError?.("Erro ao copiar para área de transferência.");
            });
        };

        // Download Handler
        newBtnDownload.onclick = () => {
            this.downloadFile(filename, content, type);
        };

        // Show Modal
        try {
            // Assume bootstrap is available globally
            const bsModal = new bootstrap.Modal(modalEl);
            bsModal.show();
        } catch(e) {
            console.error("Bootstrap modal error:", e);
            // Fallback to download
            this.downloadFile(filename, content, type);
        }
    }

    downloadFile(filename, content, type = "text/plain") {
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
            window.showFormError?.("Erro ao iniciar download: " + e.message);
        }
    }
}

new ContractDetailsManager();
