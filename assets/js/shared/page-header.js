// Header principal: gerencia botão de conexão e status de carteira
(() => {
  const btn = document.getElementById("connect-metamask-btn");
  if (!btn) return;
  if (btn.classList.contains("badge")) return;

  const nav = document.querySelector("nav.navbar");
  const updateNavScrollState = () => {
    if (!nav) return;
    const scrolled = (window.scrollY || 0) > 8;
    nav.classList.toggle("tc-navbar-scrolled", scrolled);
  };

  const syncNavbarOffset = () => {
    try {
      if (!nav) return;
      const h = Math.max(0, Math.round(nav.getBoundingClientRect().height || 0));
      if (h > 0) document.documentElement.style.setProperty("--tc-navbar-offset", `${h}px`);
    } catch (_) {}
  };

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

  try {
    syncNavbarOffset();
    updateNavScrollState();
    window.addEventListener("scroll", updateNavScrollState, { passive: true });
    window.addEventListener("resize", syncNavbarOffset, { passive: true });
  } catch (_) {}

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
        // Padronização: ao clicar no botão do header, se já estiver conectado vai para o hub.
        // Se não estiver conectado, salva o destino e abre o fluxo de conexão.
        try {
          sessionStorage.setItem("tokencafe_post_connect_redirect", JSON.stringify({ href: "index.php?page=tools", ts: Date.now() }));
        } catch (_) {}
        if (status.isConnected && status.sessionAuthorized) {
          window.location.href = "index.php?page=tools";
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
