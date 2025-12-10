import "../../shared/base-system.js";
import "../../shared/page-manager.js";
import { SEOManager } from "../../shared/seo-manager.js";

window.initBaseSystem();
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

const initWhenReady = () => {
  initSeo();
  setupToolLinks();
  enableTooltips();
  setupImportRecipe();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWhenReady);
} else {
  initWhenReady();
}
