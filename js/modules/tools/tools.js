import "../../shared/base-system.js";
import "../../shared/page-manager.js";
import { SEOManager } from "../../shared/seo-manager.js";
import { isWalletAdmin } from "../../shared/admin-security.js";

// window.initBaseSystem(); // Inicialização automática via import
window.createPageManager("tools");

const initSeo = () => {
  const seo = new SEOManager();
  seo.init("tools", {
    title: "TokenCafe Tools - Hub de Ferramentas",
    description: "Hub central de ferramentas TokenCafe - Acesse todas as funcionalidades Web3",
    url: window.location.href,
    image: "/imgs/tkncafe-semfundo.png",
  });
};

function setupToolLinks() {
  const toolLinks = document.querySelectorAll(".tool-link");
  toolLinks.forEach((link) => {
    link.addEventListener("click", function () {
      console.log(`🔗 Navegando para: ${this.href}`);
    });
  });
  const statusTile = document.getElementById("systemStatusTile");
  if (statusTile) {
    statusTile.addEventListener("click", function (e) {
      e.preventDefault();
      const backendEnabled = !!window.RPC_BACKEND_ENABLED;
      const walletStatus = window.walletConnector?.getStatus?.();
      const isWalletConnected = !!walletStatus?.account;
      const msg = ["Status do Sistema Unificado:", "• RPCs locais (rpcs.json): OK", `• Backend RPC: ${backendEnabled ? "Ativo" : "Opcional/Desativado"}`, "• Link Generator: OK", `• Wallet: ${isWalletConnected ? "Conectada" : "Desconectada"}`].join("\n");
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify(msg.replaceAll("\n", "<br>"), "info", { container });
        } else {
          console.log(msg);
        }
      } catch (_) {}
    });
  }
}

function enableTooltips() {
  try {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (window.bootstrap && typeof window.bootstrap.Tooltip === "function") {
      [...tooltipTriggerList].forEach((el) => new window.bootstrap.Tooltip(el));
    }
  } catch {}
}

function setupImportRecipe() {
  const importBtn = document.getElementById("importRecipeBtn");
  const importInput = document.getElementById("importRecipeInput");
  if (importBtn && importInput) {
    importBtn.addEventListener("click", function () {
      importInput.click();
    });
    importInput.addEventListener("change", function (e) {
      const file = e.target && e.target.files && e.target.files[0] ? e.target.files[0] : null;
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const rec = JSON.parse(reader.result);
          localStorage.setItem("tokencafe_contract_recipe_import", JSON.stringify(rec));
          window.location.href = "modules/contracts/index.html";
        } catch (err) {
          try {
            const container = document.querySelector(".container, .container-fluid") || document.body;
            if (typeof window.notify === "function") {
              window.notify("Falha ao importar .json: " + (err && err.message ? err.message : err), "error", { container });
            } else {
              console.error("Falha ao importar .json:", err);
            }
          } catch (_) {}
        }
      };
      reader.readAsText(file);
    });
  }
}

// --- Access Control System ---
const accessControl = {
  
  async loadAdmins() {
    // Agora centralizado em admin-security.js
    console.log("Access Control: Using shared admin security module");
  },

  apply(walletAddress) {
    const tiles = document.querySelectorAll('.tool-tile');
    const isAdmin = isWalletAdmin(walletAddress);
    
    console.log(`Access Control: Applying rules for ${walletAddress || 'Guest'} (Admin: ${isAdmin})`);

    tiles.forEach(tile => {
      const isFinished = tile.getAttribute('data-status') === 'finished';
      
      if (isAdmin) {
        // Admin sees everything
        tile.classList.remove('d-none');
        // Optional: Add visual indicator for non-finished items being visible due to admin
        if (!isFinished) {
           tile.style.opacity = '0.8'; 
           tile.style.border = '1px dashed #666';
        } else {
           tile.style.opacity = '1';
           tile.style.border = '';
        }
      } else {
        // Regular user sees only finished items
        if (isFinished) {
          tile.classList.remove('d-none');
          tile.style.opacity = '1';
          tile.style.border = '';
        } else {
          tile.classList.add('d-none');
        }
      }
    });
  }
};

const initWhenReady = async () => {
  initSeo();
  setupToolLinks();
  enableTooltips();
  setupImportRecipe();
  
  // Initialize Access Control
  await accessControl.loadAdmins();
  
  // Initial check (from localStorage or window.ethereum if available immediately)
  const savedAddr = localStorage.getItem("tokencafe_wallet_address");
  // Normalize address if exists
  const currentAddr = savedAddr ? savedAddr.toLowerCase() : null;
  accessControl.apply(currentAddr);

  // Listen for wallet events
  document.addEventListener("wallet:connected", (e) => {
    const addr = e.detail.account ? e.detail.account.toLowerCase() : null;
    accessControl.apply(addr);
  });
  
  document.addEventListener("wallet:disconnected", () => {
    accessControl.apply(null);
  });
  
  // Listen for direct metamask changes as backup
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
       const addr = accounts.length > 0 ? accounts[0].toLowerCase() : null;
       accessControl.apply(addr);
    });
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWhenReady);
} else {
  initWhenReady();
}
