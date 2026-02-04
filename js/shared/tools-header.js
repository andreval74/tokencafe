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
      const walletDisplay = el.querySelector("#connected-wallet-display");
      const btnCopy = el.querySelector("#btn-copy-wallet");

      if (window.bindWalletStatusUI) {
        window.bindWalletStatusUI({
          addressEl: addrText,
          // Removed statusWrapperEl to prevent auto-display of the badge
          // statusWrapperEl: addrEl, 
          connectBtnEl: btnConnect,
          // logoutBtnEl removed to keep it always visible
          // logoutBtnEl: btnLogout,
        });
      }

      // Logic to update new UI elements (Button Color + Wallet Display below)
      const updateHeaderUI = (address) => {
        if (address) {
          // Connected
          if (walletDisplay) {
            walletDisplay.textContent = address;
            walletDisplay.classList.remove("text-muted");
            walletDisplay.classList.add("text-success");
          }
          if (btnCopy) {
            btnCopy.classList.remove("d-none");
            // Set click handler
            btnCopy.onclick = (e) => {
              e.preventDefault();
              navigator.clipboard.writeText(address).then(() => {
                 const icon = btnCopy.querySelector("i");
                 if(icon) {
                     icon.className = "bi bi-check-lg";
                     setTimeout(() => icon.className = "bi bi-clipboard", 1500);
                 }
              }).catch(err => console.error("Falha ao copiar", err));
            };
          }
        } else {
          // Disconnected
          if (walletDisplay) {
            walletDisplay.textContent = "Não Conectado";
            walletDisplay.classList.remove("text-success");
            walletDisplay.classList.add("text-muted");
          }
          if (btnCopy) {
            btnCopy.classList.add("d-none");
          }
        }
      };

      // Initial check strategy:
      // 1. Try localStorage (TokenCafe persistence)
      // 2. Try window.ethereum.selectedAddress (MetaMask direct injection)
      const checkInitialStatus = () => {
        let savedAddr = localStorage.getItem("tokencafe_wallet_address");
        
        // Fallback: Check if MetaMask is already injected and has a selected address
        if (!savedAddr && window.ethereum && window.ethereum.selectedAddress) {
           savedAddr = window.ethereum.selectedAddress;
           // Sync localStorage if found directly
           localStorage.setItem("tokencafe_wallet_address", savedAddr);
        }

        updateHeaderUI(savedAddr);
      };

      checkInitialStatus();

      // Listen for TokenCafe system events
      document.addEventListener("wallet:connected", (e) => {
        updateHeaderUI(e.detail.account);
      });
      document.addEventListener("wallet:disconnected", () => {
        updateHeaderUI(null);
      });

      // Listen for Direct MetaMask events (Fail-safe)
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
          if (accounts.length > 0) {
            updateHeaderUI(accounts[0]);
          } else {
            updateHeaderUI(null);
          }
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
