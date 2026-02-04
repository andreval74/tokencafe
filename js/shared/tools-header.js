// Componente Tools Header: preenche ícone/título/subtítulo e integra carteira
(() => {
  try {
    const containers = document.querySelectorAll('[data-component="tools-header.html"]');
    containers.forEach((el) => {
      const iconClass = el.dataset.icon;
      const iconAlt = el.dataset.iconAlt || "";
      const title = el.dataset.title;
      const subtitle = el.dataset.subtitle;

      const logoEl = el.querySelector("#tools-header-logo");
      const sysIconEl = el.querySelector("#tools-system-icon");
      const titleEl = el.querySelector("#tools-header-title");
      const subtitleEl = el.querySelector("#tools-header-subtitle");

      if (logoEl && !logoEl.src) logoEl.src = "../imgs/tkncafe-semfundo.png";
      if (logoEl && !logoEl.alt) logoEl.alt = "TokenCafe";

      if (sysIconEl && iconClass) {
        sysIconEl.className = `fas ${iconClass} me-2`;
        if (iconAlt) sysIconEl.setAttribute("aria-label", iconAlt);
      }

      if (titleEl && title) titleEl.textContent = title;
      if (subtitleEl && subtitle) subtitleEl.textContent = subtitle;

      const addrEl = el.querySelector("#wallet-address");
      const addrText = el.querySelector("#wallet-address-text");
      const btnConnect = el.querySelector("#btn-connect");
      const btnLogout = el.querySelector("#btn-logout");

      if (window.bindWalletStatusUI) {
        window.bindWalletStatusUI({
          addressEl: addrText,
          statusWrapperEl: addrEl,
          connectBtnEl: btnConnect,
          logoutBtnEl: btnLogout,
        });
      }

      if (btnConnect) {
        btnConnect.addEventListener(
          "click",
          async (e) => {
            e.preventDefault();
            try {
              await window.walletConnector?.connect?.("metamask");
            } catch (err) {
              console.warn("tools-header: falha ao conectar", err);
              try {
                const container = document.querySelector(".container, .container-fluid") || document.body;
                if (typeof window.notify === "function") {
                  window.notify("Erro ao conectar: " + (err?.message || err), "error", { container });
                } else {
                  console.error("Erro ao conectar: " + (err?.message || err));
                }
              } catch (_) {}
            }
          },
          { capture: true },
        );
      }

      if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
          try {
            await window.walletConnector?.disconnect?.();
          } catch {}
          try {
            window.walletConnector?.clearCache?.();
          } catch {}
          try {
            localStorage.removeItem("tokencafe_wallet_cache");
          } catch {}
          try {
            localStorage.removeItem("tokencafe_wallet_address");
          } catch {}
          try {
            sessionStorage.removeItem("tokencafe_wallet_session_authorized");
          } catch {}
          try {
            sessionStorage.removeItem("tokencafe_wallet_address");
          } catch {}
          try {
            if (window.ethereum && typeof window.ethereum.request === "function") {
              await window.ethereum.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
            }
          } catch {}
          try {
            window.location.href = "/pages/index.html";
          } catch {}
        });
      }
    });
  } catch (e) {
    console.warn("tools-header: falha ao popular variáveis", e);
  }
})();

// Aviso de dispositivo e bloqueio de menus no mobile
(() => {
  try {
    const noteEl = document.getElementById("device-note");
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isCoarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const isSmallViewport = window.innerWidth <= 768;
    const isMobile = Boolean(isMobileUA || (isCoarse && isSmallViewport));

    if (noteEl) {
      noteEl.classList.remove("text-success", "text-danger");
      // Sistema agora suporta mobile
      noteEl.textContent = ""; 
      noteEl.classList.add("d-none");
    }

    // Bloqueio de mobile removido para permitir acesso completo
    if (isMobile) {
       document.body.classList.add("is-mobile-device");
    }
  } catch (e) {
    console.warn("tools-header: falha ao configurar aviso de dispositivo", e);
  }
})();
