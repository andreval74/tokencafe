import { BaseSystem } from "../shared/base-system.js";
import { PageManager } from "../shared/page-manager.js";
import { SEOManager } from "../shared/seo-manager.js";

/**
 * ================================================================================
 * TOKENCAFE - HOME MODULE (pages/index.html)
 * ================================================================================
 * Lógica da página inicial do aplicativo (Dashboard Entry)
 * Substitui scripts inline de pages/index.html
 * ================================================================================
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Inicializa BaseSystem
  const baseSystem = new BaseSystem();
  await baseSystem.init();
  console.log("🚀 BaseSystem iniciado (home)");

  // Inicializa PageManager
  window.createPageManager("main");

  // Inicializa SEO
  const seo = new SEOManager();
  seo.init("main", { name: "TokenCafe", url: window.location.href });

  // Lógica do CTA Inteligente
  initSmartCTA();
});

function initSmartCTA() {
  const btn = document.getElementById("connect-wallet-btn");
  if (!btn) return;

  function isWalletUiDisabled() {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get("wallet");
      if (q === "off") return true;
      if (q === "on") return false;
      const ls = localStorage.getItem("tokencafe_wallet_ui_disabled");
      return ls === "true";
    } catch (_) {
      return false;
    }
  }

  const setConnected = () => {
    btn.classList.remove("btn-outline-primary");
    btn.classList.add("btn-outline-success");
    btn.innerHTML = '<i class="bi bi-speedometer2 me-1"></i> Entrar no Dashboard';
    btn.onclick = () => {
      window.location.href = "/pages/tools.html";
    };
  };

  const setDisconnected = () => {
    btn.classList.remove("btn-outline-success");
    btn.classList.add("btn-outline-primary");
    btn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i> Conectar Carteira';
    btn.onclick = async () => {
      try {
        await window.walletConnector?.connect?.("metamask");
        window.location.href = "/pages/tools.html";
      } catch (e) {
        try {
            const container = document.querySelector(".container, .container-fluid") || document.body;
            if (typeof window.notify === "function") {
                window.notify("Conexão necessária: " + (e?.message || e), "error", { container });
            } else {
                console.error("Conexão necessária: " + (e?.message || e));
            }
        } catch (_) {}
      }
    };
  };

  async function checkConnectionStatus() {
    let connected = false;
    let unlocked = false;
    try {
        const status = window.walletConnector?.getStatus?.() || {};
        let accounts = [];
        if (window.ethereum && typeof window.ethereum.request === "function") {
            try { accounts = await window.ethereum.request({ method: "eth_accounts" }); } catch (_) { accounts = []; }
            try {
                unlocked = !!(window.ethereum?._metamask?.isUnlocked ? await window.ethereum._metamask.isUnlocked() : (Array.isArray(accounts) && accounts.length > 0));
            } catch (_) { unlocked = Array.isArray(accounts) && accounts.length > 0; }
        }
        const hasAccount = !!status.account || (Array.isArray(accounts) && accounts.length > 0);
        connected = hasAccount && !!status.sessionAuthorized && unlocked;
    } catch (_) {}
    return connected;
  }

  // Verificação inicial
  checkConnectionStatus().then(connected => {
      if (isWalletUiDisabled()) {
        setDisconnected();
      } else {
        if (connected) setConnected();
        else setDisconnected();
      }
  });

  // Listeners
  if (!isWalletUiDisabled()) {
    document.addEventListener("wallet:connected", setConnected);
    document.addEventListener("wallet:disconnected", setDisconnected);
    document.addEventListener("wallet:accountChanged", (ev) => {
      const acc = ev.detail?.account;
      if (acc) setConnected();
      else setDisconnected();
    });
  }
}
