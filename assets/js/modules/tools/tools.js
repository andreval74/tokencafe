import "../../shared/page-manager.js";
import { SEOManager } from "../../shared/seo-manager.js";
import { isWalletAdmin, getConnectedWalletAddress } from "../../shared/admin-security.js";

// window.initBaseSystem(); // Inicialização automática via import
window.createPageManager("tools");

const initSeo = () => {
  const seo = new SEOManager();
  seo.init("tools", {
    title: "TokenCafe Tools - Hub de Ferramentas",
    description: "Hub central de ferramentas TokenCafe - Acesse todas as funcionalidades Web3",
    url: window.location.href,
    image: "assets/imgs/tkncafe-semfundo.png",
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
          window.location.href = "index.php?page=contrato";
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

function stripToolsOverviewAboveModules() {
  try {
    const tabs = document.getElementById("toolsTabs");
    if (!tabs) return;
    const headerRow = tabs.closest(".d-flex") || tabs.closest("div");
    if (!headerRow) return;
    const parent = headerRow.parentElement;
    if (!parent) return;

    const toRemove = [];
    for (let el = headerRow.previousElementSibling; el; el = el.previousElementSibling) {
      toRemove.push(el);
    }
    toRemove.forEach((el) => {
      try {
        el.remove();
      } catch (_) {}
    });
  } catch (_) {}
}

// --- Access Control System ---
const accessControl = {
  
  async loadAdmins() {
    // Agora centralizado em admin-security.js
    console.log("Access Control: Using shared admin security module");
  },

  apply(walletAddress) {
    const tiles = document.querySelectorAll(".tool-tile");
    const isAdmin = isWalletAdmin(walletAddress);
    
    console.log(`Access Control: Applying rules for ${walletAddress || 'Guest'} (Admin: ${isAdmin})`);

    tiles.forEach((tile) => {
      tile.classList.remove("d-none");

      const status = String(tile.getAttribute("data-status") || "");
      const isFinished = status === "finished";
      const isAdminOnly = tile.getAttribute("data-admin-only") === "true";

      const badgeEl = tile.querySelector(".tool-tile-status");
      const linkEl = tile.querySelector("a.tool-link") || tile.querySelector("a");
      const iconEl = linkEl ? linkEl.querySelector("i") : null;

      const originalBadgeText = tile.getAttribute("data-badge-text") || (badgeEl ? badgeEl.textContent : "");
      const originalBadgeClass = tile.getAttribute("data-badge-class") || "";
      const originalHref = tile.getAttribute("data-href") || (linkEl ? linkEl.getAttribute("href") : "");
      const originalLinkLabel = tile.getAttribute("data-link-label") || (linkEl ? linkEl.textContent : "");
      const originalLinkAria = tile.getAttribute("data-link-aria-label") || (linkEl ? linkEl.getAttribute("aria-label") : "");
      const originalLinkIconClass = tile.getAttribute("data-link-icon-class") || (iconEl ? iconEl.className : "");
      const originalLinkClass = tile.getAttribute("data-link-class") || (linkEl ? linkEl.className : "");

      const locked = isAdminOnly && !isAdmin;

      if (locked) {
        tile.classList.add("disabled-tile");
        tile.setAttribute("aria-disabled", "true");

        if (badgeEl) {
          badgeEl.textContent = isFinished ? "Finalizado • ADM" : "Em Breve • ADM";
          badgeEl.className = "tool-tile-status badge bg-secondary";
        }

        if (linkEl) {
          linkEl.className = "tool-link btn btn-sm btn-outline-secondary rounded-3 w-100 disabled";
          linkEl.setAttribute("href", "#");
          linkEl.setAttribute("tabindex", "-1");
          linkEl.setAttribute("aria-disabled", "true");
          linkEl.setAttribute("aria-label", "Somente ADM");
          linkEl.textContent = "Somente ADM";
          if (iconEl) {
            iconEl.className = "bi bi-lock-fill me-1";
            linkEl.prepend(iconEl);
          }
        }
      } else {
        if (isAdminOnly) {
          tile.removeAttribute("aria-disabled");
          tile.classList.remove("disabled-tile");
          if (badgeEl) {
            badgeEl.textContent = originalBadgeText;
            badgeEl.className = `tool-tile-status badge ${originalBadgeClass}`.trim();
          }
          if (linkEl) {
            linkEl.className = originalLinkClass;
            if (originalHref) linkEl.setAttribute("href", originalHref);
            if (originalLinkAria) linkEl.setAttribute("aria-label", originalLinkAria);
            linkEl.removeAttribute("tabindex");
            linkEl.removeAttribute("aria-disabled");
            linkEl.textContent = originalLinkLabel;
            if (iconEl && originalLinkIconClass) {
              iconEl.className = originalLinkIconClass;
              linkEl.prepend(iconEl);
            }
          }
        } else {
          if (badgeEl) {
            badgeEl.textContent = originalBadgeText;
            if (originalBadgeClass) badgeEl.className = `tool-tile-status badge ${originalBadgeClass}`.trim();
          }
        }
      }

      if (isAdmin && !isFinished) tile.classList.add("tc-tool-tile--admin-preview");
      else tile.classList.remove("tc-tool-tile--admin-preview");
    });
  }
};

const initWhenReady = async () => {
  initSeo();
  stripToolsOverviewAboveModules();
  setTimeout(stripToolsOverviewAboveModules, 200);
  setupToolLinks();
  enableTooltips();
  setupImportRecipe();
  
  // Initialize Access Control
  await accessControl.loadAdmins();
  
  // Prioritize real connected wallet over localStorage
  const connectedAddr = await getConnectedWalletAddress();
  
  if (connectedAddr) {
      // Sync localStorage with real state
      localStorage.setItem("tokencafe_wallet_address", connectedAddr);
  } else {
      localStorage.removeItem("tokencafe_wallet_address");
  }

  const currentAddr = connectedAddr ? connectedAddr.toLowerCase() : null;
  console.log("Init Tools: Real connected address:", currentAddr);

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
       if (!addr) {
           accessControl.apply(null);
       } else {
           accessControl.apply(addr);
       }
    });
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWhenReady);
} else {
  initWhenReady();
}
