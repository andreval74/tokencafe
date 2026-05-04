
import { addTokenToMetaMask } from "../../shared/metamask-utils.js";

export class ShareManager {
    constructor(config) {
        this.config = config; // { address, chainId, name, symbol, decimals, rpc, explorer }
        console.log("ShareManager initialized with config:", config);
    }

    getShareLink() {
        const params = new URLSearchParams({
            address: this.config.address || "",
            chainId: String(this.config.chainId || 1),
            name: this.config.name || "",
            symbol: this.config.symbol || "",
            decimals: this.config.decimals || "18",
            image: "",
            rpc: this.config.rpc || "",
            explorer: this.config.explorer || ""
        });

        // Determine correct base path
        let shareUrl;
        
        // Handle file:// protocol or non-root server paths
        if (window.location.protocol === 'file:') {
            // Attempt to resolve relative to current location if known structure
            // Assumes structure: .../modules/contrato/contrato-detalhes (view do módulo)
            // Target: .../modules/link/link-token.php
            const currentPath = window.location.pathname;
            if (currentPath.includes("/modules/contrato/")) {
                // Go up one level to 'modules' then into 'link'
                const basePath = currentPath.substring(0, currentPath.lastIndexOf("/modules/contrato/"));
                shareUrl = `file://${basePath}/modules/link/link-token.php`;
            } else {
                // Fallback to absolute assumption or relative
                shareUrl = "../link/link-token.html"; // Relative from contract folder
            }
        } else {
            const u = new URL("index.php?page=link-token", document.baseURI);
            params.forEach((v, k) => u.searchParams.append(k, v));
            return u.toString();
        }

        return `${shareUrl}?${params.toString()}`;
    }

    setupUI(containerId = "share-section") {
        console.log("ShareManager setupUI called");
        const link = this.getShareLink();
        console.log("Generated Share Link:", link);
        
        const input = document.getElementById("generatedLink");
        if (input) {
            input.value = link;
            console.log("Input #generatedLink updated");
        } else {
            console.warn("Input #generatedLink not found in DOM");
        }

        // Helper for button listeners
        const addListener = (id, fn) => {
            const el = document.getElementById(id);
            if (el) {
                el.onclick = (e) => {
                    if(e) e.preventDefault();
                    fn();
                };
            } else {
                console.warn(`Button #${id} not found in DOM`);
            }
        };

        // Copy Address
        addListener("copyAddressBtn", () => {
            const btnCopy = document.getElementById("copyAddressBtn");
            navigator.clipboard.writeText(link).then(() => {
                const i = btnCopy?.querySelector("i");
                if (i) {
                    const originalClass = i.className;
                    i.className = "bi bi-check2 text-success";
                    setTimeout(() => i.className = originalClass, 2000);
                }
            }).catch(err => console.error("Clipboard error:", err));
        });

        // View Address
        addListener("viewAddressBtn", () => window.open(link, "_blank"));

        // Socials
        addListener("btnShareWhatsAppSmall", () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(link)}`, "_blank"));
        addListener("btnShareTelegramSmall", () => window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Confira meu novo token!")}`, "_blank"));
        addListener("btnShareEmailSmall", () => window.open(`mailto:?subject=Novo Token&body=${encodeURIComponent(link)}`, "_self"));
        
        // Wallet Actions
        addListener("btnAddNetworkSmall", () => {
             window.showDiagnosis?.("PRECONDITION", {
                 badge: "Para adicionar a rede, conecte a carteira.",
                 causes: ["Use o botão Conectar Carteira no topo.", "Verifique se está na rede correta."],
             });
        });

        addListener("btnAddToMetaMaskSmall", async () => {
            if (!this.config.address) {
                window.showFormError?.("Endereço do contrato não disponível.");
                return;
            }
            await addTokenToMetaMask({
                address: this.config.address,
                symbol: this.config.symbol,
                decimals: this.config.decimals,
                image: ""
            });
        });
    }
}
