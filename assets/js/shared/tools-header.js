const runWhenDomReady = (fn) => {
  try {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  } catch (_) {}
};

// Helpers compartilhados do Tools Header (usados em qualquer módulo/página que inclua este header).
const formatShort = (address) => {
  try {
    const s = String(address || "");
    if (s.length <= 12) return s;
    return `${s.slice(0, 6)}…${s.slice(-4)}`;
  } catch (_) {
    return String(address || "");
  }
};

// Retorna as contas autorizadas no provider atual (sem abrir popup).
const getAccounts = async () => {
  try {
    const accounts = await (window.ethereum?.request?.({ method: "eth_accounts" }) || Promise.resolve([]));
    return Array.isArray(accounts) ? accounts.filter(Boolean) : [];
  } catch (_) {
    return [];
  }
};

// Símbolo nativo da rede atual (ex: ETH, BNB).
const getSymbol = () => {
  try {
    const st = window.walletConnector?.getStatus?.();
    const fromStatus = st?.network?.nativeCurrency?.symbol || st?.network?.nativeCurrencySymbol || null;
    if (fromStatus) return String(fromStatus);
    const chainIdHex = st?.chainId || window.ethereum?.chainId || null;
    const chainIdDec = chainIdHex ? parseInt(String(chainIdHex), 16) : null;
    const net = chainIdDec && window.networkManager?.getNetworkById ? window.networkManager.getNetworkById(chainIdDec) : null;
    return String(net?.nativeCurrency?.symbol || net?.symbol || "ETH");
  } catch (_) {
    return "ETH";
  }
};

// Saldo nativo de uma conta na rede atual.
const fetchBalance = async (account) => {
  if (!account) return null;
  let weiHex = null;
  try {
    if (window.ethereum && typeof window.ethereum.request === "function") {
      weiHex = await window.ethereum.request({
        method: "eth_getBalance",
        params: [account, "latest"],
      });
    }
  } catch (_) {}
  if (!weiHex) {
    try {
      const st = window.walletConnector?.getStatus?.();
      const b = st?.balance;
      if (b !== undefined && b !== null && String(b) !== "") return String(b);
    } catch (_) {}
    return null;
  }
  try {
    if (typeof ethers !== "undefined" && (ethers?.utils?.formatEther || ethers?.formatEther)) {
      const ethVal = ethers?.utils?.formatEther ? ethers.utils.formatEther(weiHex) : ethers.formatEther(weiHex);
      const n = parseFloat(ethVal);
      if (!Number.isFinite(n)) return null;
      return n.toFixed(4);
    }
  } catch (_) {}
  return null;
};

// Componente Tools Header: preenche ícone/título/subtítulo e integra carteira
const initToolsHeader = () => {
  try {
    try {
      if (window.__tokencafe_debug) console.log("[TC][ToolsHeader] init:start");
    } catch (_) {}
    const containers = document.querySelectorAll('[data-component="tools-header.php"]');
    containers.forEach((el) => {
      const iconClass = el.dataset.icon;
      const iconAlt = el.dataset.iconAlt || "";
      const title = el.dataset.title;
      const subtitle = el.dataset.subtitle;

      const logoEl = el.querySelector("#tools-header-logo");
      const sysIconEl = el.querySelector("#tools-system-icon");
      const titleEl = el.querySelector("#tools-header-title");
      const subtitleEl = el.querySelector("#tools-header-subtitle");

      if (logoEl && !logoEl.src) logoEl.src = "assets/imgs/tkncafe-semfundo.png";
      if (logoEl && !logoEl.alt) logoEl.alt = "TokenCafe";

      if (sysIconEl && iconClass) {
        sysIconEl.className = `fas ${iconClass} me-2`;
        if (iconAlt) sysIconEl.setAttribute("aria-label", iconAlt);
      }

      if (titleEl && title) titleEl.textContent = title;
      if (subtitleEl && subtitle) subtitleEl.textContent = subtitle;

      const btnConnect = el.querySelector("#connect-metamask-btn") || el.querySelector("#btn-connect");
      const btnLogout = el.querySelector("#btn-logout");
      const walletChipBtn = el.querySelector("#wallet-chip-btn");
      const walletChipAddress = el.querySelector("#wallet-chip-address");
      const walletChipBalance = el.querySelector("#wallet-chip-balance");
      const walletChipCaret = el.querySelector("#wallet-chip-caret");
      const walletChipMenu = el.querySelector("#wallet-chip-menu");
      const btnCopy = el.querySelector("#btn-copy-wallet");
      const sidebarToggleBtn = el.querySelector("#sidebar-toggle-btn");

      let currentAddress = null;

      // Atualiza estado visual do header e mantém o endereço atual para ações (copiar/trocar).
      // Regra visual:
      // - 1 conta: mostra o "chip" com endereço + saldo (sem dropdown).
      // - 2+ contas: o "chip" vira dropdown com a lista de contas e saldos.
      const setConnectedState = async (address) => {
        currentAddress = address ? String(address) : null;
        const connected = !!currentAddress;

        if (btnConnect) {
          btnConnect.classList.toggle("d-none", connected);
          btnConnect.hidden = connected;
        }
        if (btnLogout) {
          btnLogout.classList.toggle("d-none", !connected);
          btnLogout.hidden = !connected;
        }
        
        if (btnCopy) btnCopy.classList.toggle("d-none", !connected);

        if (!walletChipBtn || !walletChipAddress || !walletChipBalance) return;
        walletChipBtn.classList.toggle("d-none", !connected);
        if (!connected) {
          walletChipAddress.textContent = "";
          walletChipBalance.textContent = "";
          if (walletChipMenu) walletChipMenu.innerHTML = "";
          return;
        }

        try {
          const st = window.walletConnector?.getStatus?.();
          const stAcc = st?.account ? String(st.account).toLowerCase() : "";
          const nextAcc = String(currentAddress).toLowerCase();
          if (window.walletConnector?.setAccount && stAcc && stAcc !== nextAcc) {
            await window.walletConnector.setAccount(currentAddress);
          }
          if (window.walletConnector?.setAccount && !stAcc) {
            await window.walletConnector.setAccount(currentAddress);
          }
        } catch (_) {}

        walletChipAddress.textContent = formatShort(currentAddress);
        try {
          walletChipBtn.setAttribute("title", currentAddress);
        } catch (_) {}

        walletChipBalance.textContent = "…";
        try {
          await window.walletConnector?.updateNetworkInfo?.();
          await window.walletConnector?.updateBalance?.();
        } catch (_) {}
        const symbol = getSymbol();
        const bal = await fetchBalance(currentAddress);
        walletChipBalance.textContent = `${bal === null ? "—" : bal} ${symbol}`;

        await renderWalletMenu(currentAddress);

        if (btnCopy) {
          btnCopy.onclick = (e) => {
            try {
              e.preventDefault();
            } catch (_) {}
            try {
              if (!currentAddress) return;
              navigator.clipboard.writeText(currentAddress).then(() => {
                const icon = btnCopy.querySelector("i");
                if (icon) {
                  icon.className = "bi bi-check-lg";
                  setTimeout(() => (icon.className = "bi bi-clipboard"), 1500);
                }
              }).catch(() => {});
            } catch (_) {}
          };
        }
      };

      // Renderiza o dropdown com as contas autorizadas + saldo na rede atual.
      // A seleção aqui muda a "conta ativa do app" (via walletConnector.setAccount quando disponível).
      const renderWalletMenu = async (selected) => {
        if (!walletChipBtn || !walletChipMenu) return;
        const accounts = await getAccounts();
        const multi = accounts.length > 1;

        walletChipMenu.innerHTML = "";
        if (walletChipCaret) walletChipCaret.classList.toggle("d-none", !multi);

        if (!multi) {
          try {
            walletChipBtn.removeAttribute("data-bs-toggle");
          } catch (_) {}
          return;
        }

        try {
          walletChipBtn.setAttribute("data-bs-toggle", "dropdown");
          walletChipBtn.setAttribute("aria-expanded", "false");
        } catch (_) {}

        const symbol = getSymbol();
        const balances = await Promise.all(accounts.map((a) => fetchBalance(a)));
        const current = selected ? String(selected).toLowerCase() : "";

        walletChipMenu.innerHTML = accounts
          .map((a, idx) => {
            const isActive = current && String(a).toLowerCase() === current;
            const b = balances[idx];
            const bTxt = b === null ? "—" : b;
            return `
              <li>
                <button type="button" class="dropdown-item text-light ${isActive ? "active" : ""}" data-account="${a}">
                  <span class="fw-semibold">${formatShort(a)}</span>
                  <span class="ms-2 text-white-50">${bTxt} ${symbol}</span>
                </button>
              </li>
            `;
          })
          .join("");

        walletChipMenu.querySelectorAll("button[data-account]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const addr = btn.getAttribute("data-account");
            if (!addr) return;
            try {
              localStorage.setItem("tokencafe_wallet_address", String(addr));
            } catch (_) {}
            try {
              const ok = await window.walletConnector?.setAccount?.(addr);
              if (!ok) await setConnectedState(addr);
            } catch (_) {
              await setConnectedState(addr);
            }
          });
        });
      };

      // Initial check strategy:
      // Use localStorage as the "app-selected wallet" as long as it exists inside eth_accounts.
      // This prevents the UI from "jumping back" to the first authorized account after refresh.
      const checkInitialStatus = async () => {
        let providerAccounts = [];
        let preferred = "";
        try {
          preferred = String(localStorage.getItem("tokencafe_wallet_address") || "");
        } catch (_) {}

        const norm = (v) => {
          try {
            return String(v || "").toLowerCase();
          } catch (_) {
            return "";
          }
        };

        if (window.ethereum && typeof window.ethereum.request === "function") {
          try {
            const acc = await window.ethereum.request({ method: "eth_accounts" });
            providerAccounts = Array.isArray(acc) ? acc.filter(Boolean) : [];
          } catch (_) {}
        }

        const preferredNorm = norm(preferred);
        const providerSelectedNorm = norm(window.ethereum?.selectedAddress || "");
        const hasProvider = providerAccounts.length > 0;
        const picked =
          (preferredNorm ? providerAccounts.find((a) => norm(a) === preferredNorm) : null) ||
          (providerSelectedNorm ? providerAccounts.find((a) => norm(a) === providerSelectedNorm) : null) ||
          (hasProvider ? providerAccounts[0] : null);

        if (picked) {
          try {
            localStorage.setItem("tokencafe_wallet_address", String(picked));
          } catch (_) {}
          await setConnectedState(picked);
        } else {
          try {
            localStorage.removeItem("tokencafe_wallet_address");
          } catch (_) {}
          await setConnectedState(null);
        }
      };

      checkInitialStatus();

      try {
        const sidebar = document.querySelector(".tokencafe-sidebar");
        let backdrop = null;

        const closeSidebar = () => {
          try {
            sidebar?.classList?.remove("is-open");
          } catch (_) {}
          try {
            backdrop?.remove?.();
          } catch (_) {}
          backdrop = null;
        };

        const openSidebar = () => {
          try {
            if (!sidebar) return;
            sidebar.classList.add("is-open");
            if (!backdrop) {
              backdrop = document.createElement("div");
              backdrop.className = "tokencafe-sidebar-backdrop";
              backdrop.addEventListener("click", closeSidebar);
              document.body.appendChild(backdrop);
            }
          } catch (_) {}
        };

        const toggleSidebar = () => {
          try {
            if (!sidebar) return;
            if (sidebar.classList.contains("is-open")) closeSidebar();
            else openSidebar();
          } catch (_) {}
        };

        if (sidebarToggleBtn) {
          if (!sidebar) {
            sidebarToggleBtn.classList.add("d-none");
          } else {
            sidebarToggleBtn.addEventListener("click", (e) => {
              try {
                e?.preventDefault?.();
              } catch (_) {}
              toggleSidebar();
            });
          }
        }

        document.addEventListener("keydown", (e) => {
          if (String(e?.key || "") === "Escape") closeSidebar();
        });
      } catch (_) {}

      // Listen for TokenCafe system events
      document.addEventListener("wallet:connected", (e) => {
        try {
          const a = e?.detail?.account ? String(e.detail.account) : "";
          if (a) localStorage.setItem("tokencafe_wallet_address", a);
        } catch (_) {}
        setConnectedState(e.detail.account);
      });
      document.addEventListener("wallet:accountChanged", (e) => {
        const next = e?.detail?.account || null;
        setConnectedState(next);
        try {
          const url = new URL(window.location.href);
          const isTools = url.pathname.endsWith("/tools.php") || (url.pathname.endsWith("/index.php") && url.searchParams.get("page") === "tools");
          if (!isTools) return;
          const key = "tokencafe_tools_last_wallet_reload";
          const nextKey = String(next || "").toLowerCase();
          const prevKey = sessionStorage.getItem(key) || "";
          if (nextKey && prevKey !== nextKey) {
            sessionStorage.setItem(key, nextKey);
            window.location.reload();
          }
        } catch (_) {}
      });
      document.addEventListener("wallet:chainChanged", (e) => {
        const acc = e?.detail?.account || window.ethereum?.selectedAddress || null;
        setConnectedState(acc);
      });
      document.addEventListener("wallet:disconnected", () => {
        setConnectedState(null);
      });

      // Listen for Direct MetaMask events (Fail-safe)
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts) => {
          const next = (accounts && accounts.length > 0) ? accounts[0] : null;
          try {
            if (next) localStorage.setItem("tokencafe_wallet_address", String(next));
            else localStorage.removeItem("tokencafe_wallet_address");
          } catch (_) {}
          setConnectedState(next);
          try {
            const url = new URL(window.location.href);
            const isTools = url.pathname.endsWith("/tools.php") || (url.pathname.endsWith("/index.php") && url.searchParams.get("page") === "tools");
            if (!isTools) return;
            const key = "tokencafe_tools_last_wallet_reload";
            const nextKey = String(next || "").toLowerCase();
            const prevKey = sessionStorage.getItem(key) || "";
            if (nextKey && prevKey !== nextKey) {
              sessionStorage.setItem(key, nextKey);
              window.location.reload();
            }
          } catch (_) {}
        });
        window.ethereum.on("chainChanged", () => {
          setConnectedState(window.ethereum?.selectedAddress || null);
        });
      }

      if (btnConnect) {
        btnConnect.addEventListener(
          "click",
          async (e) => {
            e.preventDefault();
            try {
              try {
                if (window.__tokencafe_debug) console.log("[TC][ToolsHeader] connect:click");
              } catch (_) {}
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

      window.handleLogout =
        window.handleLogout ||
        (async function () {
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
            document.cookie = "tokencafe_wallet_address=; Path=/; Max-Age=0; SameSite=Lax";
          } catch {}
          try {
            document.cookie = "tokencafe_wallet_address=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
          } catch {}
          try {
            updateHeaderUI(null);
          } catch {}
          try {
            if (window.ethereum && typeof window.ethereum.request === "function") {
              await window.ethereum.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
            }
          } catch {}
          try {
            window.location.replace("index.php");
          } catch {}
        });

      if (btnLogout) {
        btnLogout.addEventListener("click", async (e) => {
          e.preventDefault();
          try {
            await window.handleLogout();
          } catch {}
        });
      }
    });
  } catch (e) {
    console.warn("tools-header: falha ao popular variáveis", e);
  }
};

// Aviso de dispositivo e bloqueio de menus no mobile
const initDeviceNote = () => {
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
};

runWhenDomReady(initToolsHeader);
runWhenDomReady(initDeviceNote);
