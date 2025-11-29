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

class BaseSystem {
  constructor() {
    this.initialized = false;
    this.toastContainer = null;
  }

  /**
   * Inicializar sistema base
   */
  async init() {
    if (this.initialized) return;

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

      if (!ok && window.walletConnector && typeof window.walletConnector.connect === "function") {
        try {
          await window.walletConnector.connect("metamask");
          ok = true;
        } catch (e) {
          ok = false;
        }
      }

      if (!ok) {
        window.showToast?.("Conecte sua carteira para continuar", "error");
        return;
      }

      document.addEventListener("wallet:disconnected", async () => {
        try {
          try {
            await window.walletConnector?.connect?.("metamask");
          } catch (_) {
            window.showToast?.("Carteira desconectada. Conecte para continuar", "error");
          }
        } catch (_) {}
      });
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
