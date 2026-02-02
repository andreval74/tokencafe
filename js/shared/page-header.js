// Header principal: gerencia botão de conexão e status de carteira
(() => {
  const btn = document.getElementById("connect-metamask-btn");
  if (!btn) return;

  try {
    const bind =
      window.bindWalletStatusUI ||
      function (cfg) {
        try {
          window.walletConnector?.bindStatusUI?.(cfg);
        } catch (_) {}
      };
    bind({
      addressEl: "#header-wallet-address",
      statusWrapperEl: "#header-wallet-status",
      connectBtnEl: "#connect-metamask-btn",
    });
  } catch (_) {}

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
    if (isWalletUiDisabled()) {
      btn.classList.add("btn-outline-warning");
      btn.classList.remove("btn-outline-success");
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
      btn.classList.remove("btn-outline-warning");
      btn.classList.add("btn-outline-success");
      btn.innerHTML = '<i class="bi bi-wallet2 me-1"></i>Conectado';
    } else {
      btn.classList.add("btn-outline-warning");
      btn.classList.remove("btn-outline-success");
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
    async () => {
      try {
        await window.walletConnector?.connect?.("metamask");
      } catch (e) {
        console.error("Erro ao conectar via header:", e);
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          if (typeof window.notify === "function") {
            window.notify("Erro ao conectar: " + (e.message || e), "error", { container });
          } else {
            console.error("Erro ao conectar: " + (e.message || e));
          }
        } catch (_) {}
      }
    },
    { capture: true },
  );
})();
