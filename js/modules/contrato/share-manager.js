
import { addTokenToMetaMask } from "../../shared/metamask-utils.js";

export class ShareManager {
    constructor(config) {
        this.config = config; // { address, chainId, name, symbol, decimals, rpc, explorer }
    }

    getShareLink() {
        const sharePath = "/pages/modules/link/link-token.html";
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
        return `${window.location.origin}${sharePath}?${params.toString()}`;
    }

    setupUI(containerId = "share-section") {
        const link = this.getShareLink();
        
        const input = document.getElementById("generatedLink");
        if (input) input.value = link;

        // Helper for button listeners
        const addListener = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.onclick = fn;
        };

        // Copy Address
        addListener("copyAddressBtn", () => {
            const btnCopy = document.getElementById("copyAddressBtn");
            navigator.clipboard.writeText(link).then(() => {
                const i = btnCopy?.querySelector("i");
                if (i) {
                    i.className = "bi bi-check2 text-success";
                    setTimeout(() => i.className = "bi bi-clipboard", 2000);
                }
            });
        });

        // View Address
        addListener("viewAddressBtn", () => window.open(link, "_blank"));

        // Socials
        addListener("btnShareWhatsAppSmall", () => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(link)}`, "_blank"));
        addListener("btnShareTelegramSmall", () => window.open(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent("Confira meu novo token!")}`, "_blank"));
        addListener("btnShareEmailSmall", () => window.open(`mailto:?subject=Novo Token&body=${encodeURIComponent(link)}`, "_self"));
        
        // Wallet Actions
        addListener("btnAddNetworkSmall", () => {
             alert("Para adicionar a rede, use o botão Conectar Carteira no topo e verifique se está na rede correta.");
        });

        addListener("btnAddToMetaMaskSmall", async () => {
            if (!this.config.address) return;
            await addTokenToMetaMask({
                address: this.config.address,
                symbol: this.config.symbol,
                decimals: this.config.decimals,
                image: ""
            });
        });
    }
}
