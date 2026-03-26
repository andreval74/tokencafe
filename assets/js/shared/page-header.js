// Header principal: gerencia botão de conexão e status de carteira
(() => {
  const btn = document.getElementById("connect-metamask-btn");
  if (!btn) return;
  if (btn.classList.contains("badge")) return;

  const isWalletUiDisabled = () => {
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
  };

  const updateStatusByStatus = async () => {
    if (!btn) return;
    try {
      const addressEl = document.getElementById("header-wallet-address");
      if (addressEl) addressEl.textContent = "";
      const wrapper = document.getElementById("header-wallet-status");
      if (wrapper) wrapper.classList.add("d-none");
    } catch (_) {}

    if (isWalletUiDisabled()) {
      btn.classList.remove("btn-success");
      btn.classList.add("btn-outline-primary");
      btn.innerHTML = '<i class="bi bi-wallet2 me-1"></i>Conectar';
      return;
    }
    const status = window.walletConnector?.getStatus?.() || {};
    let connected = false;
    let unlocked = false;
    let accounts = [];
    if (window.ethereum && typeof window.ethereum.request === "function") {
      try {
        accounts = await window.ethereum.request({ method: "eth_accounts" });
      } catch (_) {
        accounts = [];
      }
      try {
        unlocked = !!(window.ethereum?._metamask?.isUnlocked ? await window.ethereum._metamask.isUnlocked() : Array.isArray(accounts) && accounts.length > 0);
      } catch (_) {
        unlocked = Array.isArray(accounts) && accounts.length > 0;
      }
    }
    const hasAccount = !!status.account || (Array.isArray(accounts) && accounts.length > 0);
    connected = hasAccount && !!status.sessionAuthorized && unlocked;
    if (connected) {
      btn.classList.remove("btn-outline-primary");
      btn.classList.add("btn-success");
      btn.innerHTML = '<i class="bi bi-wallet2 me-1"></i>Conectado';
    } else {
      btn.classList.remove("btn-success");
      btn.classList.add("btn-outline-primary");
      btn.innerHTML = '<i class="bi bi-wallet2 me-1"></i>Conectar';
    }
  };

  try {
    updateStatusByStatus();
  } catch {}

  const refresh = () => updateStatusByStatus();
  if (!isWalletUiDisabled()) {
    document.addEventListener("wallet:connected", refresh);
    document.addEventListener("wallet:disconnected", refresh);
    document.addEventListener("wallet:accountChanged", refresh);
  }

  btn.addEventListener(
    "click",
    async (e) => {
      e.preventDefault();
      try {
        const status = window.walletConnector?.getStatus?.() || {};
        if (status.isConnected && status.sessionAuthorized) {
          window.location.href = "tools.php";
          return;
        }
        await window.walletConnector?.connect?.("metamask");
      } catch (err) {
        console.error("Erro ao conectar via header:", err);
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          if (typeof window.notify === "function") {
            window.notify("Erro ao conectar: " + (err.message || err), "error", { container });
          }
        } catch (_) {}
      }
    },
    { capture: true },
  );
})();
