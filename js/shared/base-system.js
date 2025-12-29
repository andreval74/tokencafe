/**
 * ================================================================================
 * TOKENCAFE - BASE SYSTEM UNIFIED
 * ================================================================================
 * Sistema base unificado para inicialização de módulos TokenCafe
 * Substitui todos os scripts inline repetitivos
 * ================================================================================
 */

import { SharedUtilities } from "../core/shared_utilities_es6.js";
import { walletConnector } from "../shared/wallet-connector.js";
import { networkManager } from "../shared/network-manager.js";
import { SystemResponse } from "../shared/system-response.js";

class BaseSystem {
  constructor() {
    this.initialized = false;
    this.toastContainer = null;
  }

  /**
   * Inicializar sistema base
   */
  async init() {
    if (this.initialized || window.__BaseSystemInitialized) return;
    window.__BaseSystemInitialized = true;

    console.log("🚀 TokenCafe - Base System Unified iniciando...");

    // Aguardar DOM estar pronto
    if (document.readyState === "loading") {
      await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve));
    }

    // Disponibilizar módulos globalmente
    this.setupGlobalModules();

    // Configurar utilitários globais
    this.setupGlobalUtilities();

    // Configurar sistema de toast
    this.setupToastSystem();

    // Carregar componentes automaticamente
    this.loadComponents();

    await this.enforceAuthGuard();

    await this.bindWalletInfoSection();

    this.initialized = true;
    console.log("✅ Base System Unified inicializado");
  }

  /**
   * Disponibilizar módulos unificados globalmente
   */
  setupGlobalModules() {
    window.SharedUtilities = SharedUtilities;
    window.walletConnector = walletConnector;
    window.networkManager = networkManager;
    window.SystemResponse = SystemResponse;

    console.log("📦 Módulos unificados disponibilizados globalmente");
  }

  /**
   * Configurar utilitários globais
   */
  setupGlobalUtilities() {
    // Shorthand para querySelector
    window.$ = (selector) => document.querySelector(selector);
    window.$$ = (selector) => document.querySelectorAll(selector);

    // Função para mostrar loading
    window.showLoading = (show = true) => {
      const loader = document.getElementById("loading-screen");
      if (loader) {
        loader.style.display = show ? "flex" : "none";
      }
    };

    // Compatibilidade: esconder loading (alias para showLoading(false))
    window.hideLoading = () => {
      try {
        // Suporte a overlay usado em alguns layouts
        const overlay = window.$ ? $("#loading-overlay") : document.getElementById("loading-overlay");
        if (overlay && overlay.remove) overlay.remove();
      } catch {}
      window.showLoading(false);
    };

    // Compatibilidade: formatar endereço de carteira
    const utilsInstance = new SharedUtilities();
    window.formatAddress = (address, startChars = 6, endChars = 4) => {
      try {
        return utilsInstance.formatAddress(address, startChars, endChars);
      } catch {
        if (!address) return "";
        if (String(address).length <= startChars + endChars) return address;
        return `${String(address).slice(0, startChars)}...${String(address).slice(-endChars)}`;
      }
    };

    // Global copyToClipboard
    window.copyToClipboard = async (text) => {
      if (!text) return;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
          if (window.showFormSuccess) window.showFormSuccess("Copiado para a área de transferência!");
          else if (window.notify) window.notify("Copiado!", "success");
        } else {
          // Fallback
          const textArea = document.createElement("textarea");
          textArea.value = text;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand('copy');
            if (window.showFormSuccess) window.showFormSuccess("Copiado para a área de transferência!");
            else if (window.notify) window.notify("Copiado!", "success");
          } catch (err) {
            console.error('Fallback: Oops, unable to copy', err);
            if (window.showFormError) window.showFormError("Falha ao copiar");
            else if (window.notify) window.notify("Falha ao copiar", "error");
          }
          document.body.removeChild(textArea);
        }
      } catch (err) {
        console.error('Failed to copy: ', err);
        if (window.showFormError) window.showFormError("Falha ao copiar");
        else if (window.notify) window.notify("Falha ao copiar", "error");
      }
    };

    window.closeModalById = (id) => {
      try {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = "none";
      } catch (_) {}
    };

    // Helper: delega binding de status da carteira ao módulo wallet
    window.bindWalletStatusUI = (config = {}) => {
      try {
        if (window.walletConnector && typeof window.walletConnector.bindStatusUI === "function") {
          window.walletConnector.bindStatusUI(config);
        }
      } catch (_) {}
    };

    // Função para scroll to top
    window.scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    console.log("🛠️ Utilitários globais configurados");

    document.addEventListener("click", async (e) => {
      const connectBtn = e.target.closest('[data-action="connect-wallet"]');
      if (connectBtn) {
        e.preventDefault();
        try {
          await window.walletConnector?.connect?.("metamask");
          window.location.href = "/pages/tools.html";
        } catch (_) {}
        return;
      }
      const scrollBtn = e.target.closest('[data-action="scroll-to-top"]');
      if (scrollBtn) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      const reloadBtn = e.target.closest('[data-action="reload-page"]') || e.target.closest('#btnClearAll');
      if (reloadBtn) {
        e.preventDefault();
        // Forçar limpeza de inputs para evitar restauração de cache do navegador
        try {
          const inputs = document.querySelectorAll("input, textarea");
          inputs.forEach(el => el.value = "");
        } catch (_) {}
        window.location.reload();
      }
    });

    // Sanitização global de campos: exposta como função reutilizável
    // Evita duplicação e garante padrão em todo o ecossistema
    window.bindInputSanitizer = (unusedOptions = {}) => {
      if (unusedOptions && typeof unusedOptions === "object") {
        void unusedOptions;
      }
      // Guard para evitar múltiplos binds
      if (window.__inputSanitizerBound) return;
      window.__inputSanitizerBound = true;

      // Regras de sanitização
      const shouldSanitize = (el) => {
        if (!el || el.disabled) return false;
        const tag = (el.tagName || "").toLowerCase();
        if (tag !== "input" && tag !== "textarea") return false;
        if (el.dataset && String(el.dataset.trim).toLowerCase() === "off") return false;
        return true;
      };
      const trimTrailing = (v) => (typeof v === "string" ? v.replace(/\s+$/u, "") : v);
      const trimFull = (v) => (typeof v === "string" ? v.replace(/\s+$/u, "") : v);
      const collapseSpaces = (v) => (typeof v === "string" ? v.replace(/\s{2,}/g, " ") : v);
      const getMode = (el) => {
        const d = String(el?.dataset?.trim || "").toLowerCase();
        if (d === "off") return "off";
        if (d === "collapse") return "collapse";
        return "default";
      };

      // Removido: não sanitizar enquanto digita

      // Ao sair do campo: trim completo
      ["change", "blur"].forEach((ev) => {
        document.addEventListener(
          ev,
        (e) => {
          const el = e.target;
          if (!shouldSanitize(el)) return;
          const mode = getMode(el);
          const before = el.value;
          let after = trimFull(before);
          if (mode === "collapse") after = collapseSpaces(after);
          if (after !== before) el.value = after;
        },
        true,
      );
      });
    };

    // Aplicar por padrão em todas as páginas que carregam o Base System
    window.bindInputSanitizer();

    // Padronização: delega mensagens de sucesso para o Modal SystemResponse
    window.showFormSuccess = (message, _opts = {}) => {
      try {
        if (window.SystemResponse) {
            const sys = new window.SystemResponse();
            sys.show({
                type: 'success',
                title: 'Sucesso',
                subtitle: message,
                content: _opts.content || '',
                onClear: _opts.onClear
            });
            return;
        }

        const container = _opts?.container || (document.querySelector(".container, .container-fluid") || document.body);
        if (typeof window.notify === "function") {
          return window.notify(String(message || "Sucesso"), "success", { container });
        }
        if (window.SuccessErrorUI?.showSuccess) return window.SuccessErrorUI.showSuccess(message, {});
        console.log(message);
        return null;
      } catch (_) {
        return null;
      }
    };

    // Padronização: delega mensagens de erro para notify
    window.showFormError = (message, _opts = {}) => {
      try {
        if (window.SystemResponse) {
            const sys = new window.SystemResponse();
            sys.show({
                type: 'error',
                title: 'Erro',
                subtitle: message,
                content: _opts.content || '',
                onClear: _opts.onClear
            });
            return;
        }

        const container = _opts?.container || (document.querySelector(".container, .container-fluid") || document.body);
        if (typeof window.notify === "function") {
          return window.notify(String(message || "Erro"), "error", { container });
        }
        if (window.SuccessErrorUI?.showError) return window.SuccessErrorUI.showError(message, {});
        console.error(message);
        return null;
      } catch (_) {
        return null;
      }
    };

    // Padronização: modal de resultado de verificação
    window.showVerificationResultModal = (success, title, contentHtml, linkUrl) => {
      try {
        if (window.SystemResponse) {
           const sys = new window.SystemResponse();
           
           let finalContent = contentHtml || '';
           if (linkUrl) {
               finalContent += `
               <div class="mt-3 text-center">
                   <a href="${linkUrl}" target="_blank" rel="noopener" class="btn btn-outline-success">
                       <i class="bi bi-box-arrow-up-right me-2"></i>Abrir no Explorer
                   </a>
               </div>
               `;
           }
           
           sys.show({
               type: success ? 'success' : 'error',
               title: title || (success ? 'Sucesso' : 'Erro'),
               subtitle: '', 
               content: finalContent
           });
           return;
        }

        const modalEl = document.getElementById('verifyInfoModal');
        if (!modalEl) {
           // Se não houver modal, tenta usar notify
           if (success) window.showFormSuccess(title || "Verificado com sucesso!");
           else window.showFormError(title || "Falha na verificação");
           return;
        }
        
        const titleEl = document.getElementById('verifyInfoTitle');
        const contentEl = document.getElementById('verifyInfoContent');
        const linkEl = document.getElementById('verifyOpenLink');
        
        if (titleEl) {
          titleEl.textContent = title;
          titleEl.className = success ? "modal-title text-success" : "modal-title text-danger";
        }
        
        if (contentEl) {
          contentEl.innerHTML = contentHtml;
        }
        
        if (linkEl) {
          if (linkUrl) {
            linkEl.href = linkUrl;
            linkEl.classList.remove('d-none');
            linkEl.textContent = "Abrir no Explorer";
          } else {
            linkEl.classList.add('d-none');
          }
        }
        
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
          const modal = new bootstrap.Modal(modalEl);
          modal.show();
        } else {
          modalEl.style.display = 'block';
          modalEl.classList.add('show');
          // Simple close handler for fallback
          const closeBtns = modalEl.querySelectorAll('[data-bs-dismiss="modal"]');
          closeBtns.forEach(btn => {
             btn.onclick = () => {
                 modalEl.style.display = 'none';
                 modalEl.classList.remove('show');
             };
          });
        }
      } catch (e) {
        console.error("Error showing verification modal:", e);
      }
    };

    document.addEventListener("form:success", (e) => {
      try {
        const d = e?.detail || {};
        window.showFormSuccess(String(d.message || "Sucesso"), { container: d.container, onClear: d.onClear });
      } catch (_) {}
    });

    document.addEventListener("form:error", (e) => {
      try {
        const d = e?.detail || {};
        window.showFormError(String(d.message || "Erro"), { container: d.container, onClear: d.onClear });
      } catch (_) {}
    });
  }

  /**
   * Configurar sistema de toast
   */
  setupToastSystem() {
    window.showToast = () => {};
    console.log("🍞 Toasts desativados");
  }

  async enforceAuthGuard() {
    try {
      const path = String(window.location.pathname || "");
      const requiresAuth = path.includes("/pages/modules/") || path.endsWith("/pages/tools.html");
      if (!requiresAuth) return;

      const status = window.walletConnector?.getStatus?.() || {};
      let ok = !!status.account;

      if (!ok && window.ethereum && typeof window.ethereum.request === "function") {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          ok = Array.isArray(accounts) && accounts.length > 0;
        } catch (_) {
          ok = false;
        }
      }

      if (ok) {
        await this.applyConnectedNetworkDefault();
      } else {
        let connected = false;
        try {
          if (window.ethereum && typeof window.ethereum.request === "function") {
            const accs = await window.ethereum.request({ method: "eth_accounts" }).catch(() => []);
            if (Array.isArray(accs) && accs.length > 0) {
              try {
                await window.walletConnector?.connectSilent?.("metamask");
                connected = true;
              } catch (_) {}
            }
          }
          if (!connected) {
            if (!window.__tokencafe_auto_connect_initiated) {
              window.__tokencafe_auto_connect_initiated = true;
              if (window.authModal && typeof window.authModal.show === "function") {
                try {
                  window.authModal.show();
                } catch (_) {}
              } else {
                try {
                  await window.walletConnector?.connect?.("metamask");
                  connected = true;
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
        const status2 = window.walletConnector?.getStatus?.() || {};
        const ok2 = !!status2.account;
        if (connected || ok2) {
          await this.applyConnectedNetworkDefault();
        } else {
          const base = this.getBasePath();
          const target = base.includes("../") ? `${base}index.html` : `${base}pages/index.html`;
          window.location.href = target;
          return;
        }
      }

      document.addEventListener("wallet:disconnected", async () => {
        try {
          try {
            await window.walletConnector?.connectSilent?.("metamask");
          } catch (_) {}
          const s = window.walletConnector?.getStatus?.() || {};
          if (!s.account) {
            try {
              await window.walletConnector?.connect?.("metamask");
            } catch (_) {
              const base = this.getBasePath();
              const target = base.includes("../") ? `${base}index.html` : `${base}pages/index.html`;
              window.location.href = target;
            }
          }
        } catch (_) {}
      });
    } catch (_) {}
  }

  async applyConnectedNetworkDefault() {
    try {
      let chainId = null;
      let account = null;
      const st = window.walletConnector?.getStatus?.() || {};
      account = st.account || null;
      chainId = st.chainId || null;
      if (!chainId && window.ethereum && typeof window.ethereum.request === "function") {
        try {
          const hex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
          chainId = hex ? parseInt(hex, 16) : null;
        } catch (_) {}
      }
      // Não preencher automaticamente campos de busca de rede nem bloquear readOnly
      // Mantém apenas status visual de conexão geral
      const statusBox = document.getElementById("connectionStatus");
      const statusMsg = document.getElementById("statusMessage");
      if (statusBox && statusMsg && account) {
        statusBox.className = "alert alert-success d-block mb-3";
        statusMsg.textContent = `Conectado: ${window.formatAddress?.(account)}`;
      }
    } catch (_) {}
  }

  async applyNetworkSelectionMode() {
    try {
      const ns = document.getElementById("networkSearch");
      if (ns) {
        ns.readOnly = false;
        try { delete ns.dataset.chainId; } catch (_) {}
        const ac = document.getElementById("networkAutocomplete");
        if (ac) ac.classList.remove("d-none");
        if (!ns.placeholder) ns.placeholder = "Buscar por nome, chainId ou símbolo";
      }
      const nd = document.getElementById("network-display");
      if (nd) {
        nd.readOnly = false;
      }
      const statusBox = document.getElementById("connectionStatus");
      const statusMsg = document.getElementById("statusMessage");
      if (statusBox && statusMsg) {
        statusBox.className = "alert alert-warning d-block mb-3";
        statusMsg.textContent = "Carteira não conectada. Selecione uma rede.";
      }
    } catch (_) {}
  }

  async bindWalletInfoSection() {
    try {
      const addressEl = document.getElementById("walletAddress");
      const chainIdEl = document.getElementById("chainId");
      const nameEl = document.getElementById("networkName");
      const nativeNameEl = document.getElementById("nativeCurrency");
      const symbolEl = document.getElementById("currencySymbol");
      const balanceEl = document.getElementById("balance");
      const rpcEl = document.getElementById("rpcUrl");
      const expEl = document.getElementById("explorerUrl");
      const section = document.getElementById("wallet-info-section");
      const statusBox = document.getElementById("connectionStatus");
      const statusMsg = document.getElementById("statusMessage");

      if (!addressEl && !chainIdEl && !nameEl && !nativeNameEl && !symbolEl && !balanceEl && !rpcEl && !expEl) return;

      const refresh = async () => {
        try {
          const status = window.walletConnector?.getStatus?.() || {};
          let account = status.account;
          let chainId = null;
          if (window.ethereum && typeof window.ethereum.request === "function") {
            try {
              const accounts = await window.ethereum.request({ method: "eth_accounts" }).catch(() => []);
              account = Array.isArray(accounts) && accounts.length ? accounts[0] : account || null;
            } catch (_) {}
            try {
              const hex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
              chainId = hex ? parseInt(hex, 16) : null;
            } catch (_) {}
          } else {
            chainId = status.chainId != null ? status.chainId : null;
          }
          if (!window.ethereum) {
            if (statusBox && statusMsg) {
              statusBox.className = "alert alert-warning d-block mb-3";
              statusMsg.textContent = "Carteira não detectada. Instale MetaMask.";
            }
          } else if (!account) {
            if (statusBox && statusMsg) {
              statusBox.className = "alert alert-warning d-block mb-3";
              statusMsg.textContent = "Carteira bloqueada ou não autorizada. Autorize no MetaMask.";
            }
          } else {
            if (statusBox && statusMsg) {
              statusBox.className = "alert alert-success d-block mb-3";
              statusMsg.textContent = "Carteira conectada com sucesso.";
            }
          }

          if (addressEl) addressEl.value = account || "-";
          if (chainIdEl) chainIdEl.value = chainId != null ? String(chainId) : "-";

          try {
            if (window.networkManager?.getAllNetworks) {
              await window.networkManager.getAllNetworks();
            }
          } catch (_) {}
          const net = chainId != null ? window.networkManager?.getNetworkById?.(chainId) : null;
          if (nameEl) nameEl.value = net?.name || "-";
          if (nativeNameEl) nativeNameEl.value = net?.nativeCurrency?.name || "-";
          if (symbolEl) symbolEl.value = net?.nativeCurrency?.symbol || "-";
          const rpc = Array.isArray(net?.rpc) ? net.rpc[0] || "-" : typeof net?.rpc === "string" ? net.rpc : "-";
          if (rpcEl) rpcEl.value = rpc;
          const exp = Array.isArray(net?.explorers) && net.explorers.length ? net.explorers[0].url || net.explorers[0] : "-";
          if (expEl) expEl.value = exp;

          try {
            await window.walletConnector?.updateBalance?.();
          } catch {}
          if (balanceEl) balanceEl.value = window.walletConnector?.balance || "-";

          if (section) section.classList.remove("d-none");
        } catch (_) {}
      };

      await refresh();
      if (window.ethereum && typeof window.ethereum.on === "function") {
        window.ethereum.on("chainChanged", refresh);
        window.ethereum.on("accountsChanged", refresh);
      }
      try {
        document.addEventListener("wallet:chainChanged", refresh);
        document.addEventListener("wallet:connected", refresh);
        document.addEventListener("wallet:accountChanged", refresh);
        document.addEventListener("wallet:disconnected", refresh);
        document.addEventListener("network:switchResult", refresh);
      } catch (_) {}
    } catch (_) {}
  }

  /**
   * Carregar componentes automaticamente
   */
  async loadComponents() {
    const componentsToLoad = document.querySelectorAll("[data-component]");

    for (const element of componentsToLoad) {
      await this.loadComponent(element);
    }

    if (componentsToLoad.length > 0) {
      console.log(`📦 ${componentsToLoad.length} componentes carregados automaticamente`);
    }
  }

  /**
   * Carregar um componente específico
   */
  async loadComponent(element) {
    const componentName = element.getAttribute("data-component");
    if (!componentName) return;

    try {
      // Determinar caminho baseado na localização atual
      const basePath = this.getBasePath();

      // Tentar em múltiplos locais priorizando a raiz de pages para evitar 404s
      const candidatePaths = [`${basePath}pages/${componentName}`, `${basePath}pages/shared/${componentName}`, `${basePath}pages/modules/${componentName}`];

      let finalResponse = null;
      let resolvedPath = null;

      for (const path of candidatePaths) {
        const response = await fetch(path);
        if (response.ok) {
          finalResponse = response;
          resolvedPath = path;
          break;
        }
      }

      if (finalResponse && finalResponse.ok) {
        const content = await finalResponse.text();
        element.innerHTML = content;

        // Executar scripts do componente carregado (preserva atributos como type="module")
        const scripts = element.querySelectorAll("script");
        scripts.forEach((script) => {
          if (script.src) {
            const newScript = document.createElement("script");
            let src = script.getAttribute("src");
            try {
              // Se for caminho absoluto (começa com '/'), prefixar com basePath para funcionar em páginas aninhadas
              if (src && src.startsWith("/")) {
                const base = this.getBasePath();
                src = `${base}${src.slice(1)}`;
              }
            } catch (_) {}
            newScript.src = src;
            if (script.type) newScript.type = script.type; // preserva tipo
            document.head.appendChild(newScript);
          } else {
            try {
              // Caso não seja necessário executar inline, injeta preservando type
              const newScript = document.createElement("script");
              if (script.type) newScript.type = script.type; // preserva tipo
              newScript.textContent = script.textContent;
              document.head.appendChild(newScript);
            } catch (err) {
              console.error("Erro ao executar script do componente:", err);
              const newScript = document.createElement("script");
              if (script.type) newScript.type = script.type; // preserva tipo
              newScript.textContent = script.textContent;
              document.head.appendChild(newScript);
            }
          }
        });

        console.log(`🔗 Componente '${componentName}' carregado de: ${resolvedPath}`);
      } else {
        console.warn(`⚠️ Componente '${componentName}' não encontrado nos caminhos:`, candidatePaths);
      }
    } catch (error) {
      console.warn(`⚠️ Erro ao carregar componente ${componentName}:`, error);
    }
  }

  /**
   * Determinar caminho base baseado na localização atual
   */
  getBasePath() {
    const path = window.location.pathname;

    if (path.includes("/pages/modules/")) {
      return "../../../";
    } else if (path.includes("/pages/")) {
      return "../";
    } else {
      return "./";
    }
  }

  /**
   * Configurar estado da aplicação (para páginas que precisam)
   */
  setupAppState(initialState = {}) {
    window.appState = new Proxy(initialState, {
      set(target, property, value) {
        const oldValue = target[property];
        target[property] = value;

        // Emitir evento quando estado muda
        if (oldValue !== value) {
          window.dispatchEvent(
            new CustomEvent("appStateChange", {
              detail: { property, value, oldValue },
            }),
          );
        }

        return true;
      },
    });

    console.log("📊 Estado da aplicação configurado");
  }
}

// Função factory para inicializar o sistema base
window.initBaseSystem = function (appState = null) {
  const baseSystem = new BaseSystem();

  if (appState) {
    baseSystem.setupAppState(appState);
  }

  baseSystem.init().catch((error) => {
    console.error("❌ Erro ao inicializar Base System:", error);
  });

  return baseSystem;
};

// Auto-inicializar se for importado diretamente
const baseSystem = new BaseSystem();
baseSystem.init().catch((error) => {
  console.error("❌ Erro ao auto-inicializar Base System:", error);
});

export { BaseSystem };
export default baseSystem;
