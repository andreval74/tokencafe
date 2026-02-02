/**
 * ================================================================================
 * TOKENCAFE - PAGE MANAGER UNIFIED
 * ================================================================================
 * Sistema unificado para gerenciamento de páginas TokenCafe
 * Reutilizável em todas as páginas do sistema
 * ================================================================================
 */

import { walletConnector } from "../shared/wallet-connector.js";

class PageManager {
  constructor(pageType = "default") {
    this.pageType = pageType;
    this.initialized = false;
    this.connectBtn = null;

    // Configurações por tipo de página
    this.pageConfigs = {
      landing: {
        hasWalletConnect: false,
        hasAnimations: true,
        redirectTarget: "pages/index.html",
        autoConnectOnLoad: false,
      },
      main: {
        hasWalletConnect: true,
        hasAnimations: false,
        redirectTarget: "tools.html",
        autoConnectOnLoad: false,
      },
      tools: {
        hasWalletConnect: true,
        hasAnimations: false,
        redirectTarget: null,
        autoConnectOnLoad: true,
      },
      rpc: {
        hasWalletConnect: true,
        hasAnimations: false,
        requiresAuth: false,
        autoConnectOnLoad: false,
      },
      link: {
        hasWalletConnect: true,
        hasAnimations: false,
        requiresAuth: false,
        autoConnectOnLoad: false,
      },
      dashboard: {
        hasWalletConnect: true,
        hasAnimations: false,
        requiresAuth: false,
        autoConnectOnLoad: false,
      },
      default: {
        hasWalletConnect: false,
        hasAnimations: false,
        autoConnectOnLoad: false,
      },
    };
  }

  /**
   * Inicializar sistema da página
   */
  async init() {
    if (this.initialized) return;

    console.log(`🚀 TokenCafe - Page Manager (${this.pageType}) iniciando...`);

    // Aguardar DOM estar pronto
    if (document.readyState === "loading") {
      await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve));
    }

    const config = this.pageConfigs[this.pageType] || this.pageConfigs.default;

    // Configurar elementos base
    this.setupBaseElements();

    // Configurar funcionalidades específicas
    if (config.hasWalletConnect) {
      await this.setupWalletFeatures();
    }

    if (config.hasAnimations) {
      this.setupAnimations();
    }

    // Validação de conexão foi centralizada no header; não checar por página

    // Configurar funções globais
    this.setupGlobalFunctions();

    this.initialized = true;
    console.log(`✅ Page Manager (${this.pageType}) inicializado`);
  }

  /**
   * Configurar elementos base da página
   */
  setupBaseElements() {
    // Encontrar botão de conexão priorizando o elemento BUTTON
    this.connectBtn = document.getElementById("connect-wallet-btn") || document.querySelector(".btn-connect-wallet") || document.querySelector('[onclick*="connectWallet"]') || document.getElementById("connect-text");
  }

  /**
   * Configurar recursos de carteira
   */
  async setupWalletFeatures() {
    // Sempre configurar eventos de carteira, mesmo sem botão presente
    this.setupWalletEvents();

    // Solicitar conexão no carregamento APENAS se configurado
    const config = this.pageConfigs[this.pageType] || {};
    if (config.autoConnectOnLoad) {
      await this.forceConnectOnLoad();
    }

    // Verificação inicial de conexão (se houver UI, atualiza estados)
    await this.checkInitialConnection();
  }

  /**
   * Forçar pedido de conexão ao carregar a página
   */
  async forceConnectOnLoad() {
    try {
      // Evitar prompts duplicados se já foi iniciado por outro componente (ex: header)
      if (window.__tokencafe_auto_connect_initiated) {
        return;
      }
      window.__tokencafe_auto_connect_initiated = true;
      // Tentar reconexão silenciosa se já houver contas autorizadas no provider
      let accounts = [];
      try {
        accounts = await (window.ethereum?.request?.({
          method: "eth_accounts",
        }) || Promise.resolve([]));
      } catch (_) {
        accounts = [];
      }

      if (Array.isArray(accounts) && accounts.length > 0) {
        try {
          // Sincroniza estado sem prompt
          await walletConnector.connectSilent("metamask");
          this.showSuccessState();
          return;
        } catch (_) {
          // Se falhar, segue para verificação padrão abaixo
        }
      }

      // Checar status (sessão autorizada previamente nesta aba)
      const status = walletConnector?.getStatus?.();
      const isConnected = !!status?.account && !!status?.sessionAuthorized;
      if (isConnected) {
        this.showSuccessState();
        return;
      }

      // Caso não haja contas e nem sessão autorizada, solicitar conexão
      await this.connectWallet();
    } catch (e) {
      console.warn("Falha ao solicitar conexão na carga da página:", e?.message || e);
    }
  }

  /**
   * Configurar eventos de carteira
   */
  setupWalletEvents() {
    // Funções globais para conectar carteira (compatíveis com HTML existente)
    window.connectWalletFromHeader = () => this.connectWallet();
    window.connectWallet = () => this.connectWallet();

    // Ouvir eventos globais de conexão para atualizar UI e redirecionar
    document.addEventListener("wallet:connected", (ev) => {
      try {
        const account = ev.detail?.account || walletConnector?.getStatus()?.account;
        this.showSuccessState(account);
        const config = this.pageConfigs[this.pageType] || {};
        if (config.redirectTarget) {
          setTimeout(() => this.redirectTo(config.redirectTarget), 800);
        }
      } catch (e) {
        console.warn("Falha ao processar wallet:connected no PageManager:", e.message);
      }
    });

    document.addEventListener("wallet:disconnected", () => {
      this.showConnectButton();
    });

    // Event listeners adicionais
    window.addEventListener("beforeunload", () => {
      // Cleanup se necessário
    });
  }

  /**
   * Verificar conexão inicial
   */
  async checkInitialConnection() {
    try {
      const status = walletConnector?.getStatus?.();
      const isConnected = !!status?.account && !!status?.sessionAuthorized;

      if (isConnected) {
        console.log("🔗 Carteira já conectada");
        this.showDashboardButton();
      } else {
        console.log("ℹ️ Nenhuma conexão anterior encontrada");
        this.showConnectButton();
      }
    } catch (error) {
      console.log("ℹ️ Verificação de conexão falhou, mantendo estado padrão");
      this.showConnectButton();
    }
  }

  /**
   * Conectar carteira usando sistema unificado
   */
  async connectWallet() {
    try {
      console.log("🔗 Abrindo seleção de carteira...");
      // Preferir modal de autenticação para escolha do provedor
      if (window.authModal && typeof window.authModal.show === "function") {
        window.authModal.show();
      } else {
        // Fallback para conexão padrão via WalletConnector
        this.showConnectingState();
        const result = await walletConnector.connect("metamask");
        if (result?.success) {
          this.showSuccessState();
          const config = this.pageConfigs[this.pageType];
          if (config.redirectTarget) {
            setTimeout(() => this.redirectTo(config.redirectTarget), 1200);
          }
        } else {
          throw new Error(result?.error || "Falha na conexão");
        }
      }
    } catch (error) {
      console.error("❌ Erro ao conectar:", error);
      this.showErrorState();
    }
  }

  /**
   * Estados visuais do botão
   */
  showConnectButton() {
    if (!this.connectBtn) return;

    this.connectBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-1"></i>Conectar Carteira';
    this.connectBtn.className = "btn btn-outline-primary btn-lg";
    this.connectBtn.onclick = () => this.connectWallet();
    this.connectBtn.disabled = false;
  }

  showConnectingState() {
    if (!this.connectBtn) return;

    this.connectBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Conectando...';
    this.connectBtn.className = "btn btn-outline-primary btn-lg";
    this.connectBtn.disabled = true;
  }

  showSuccessState() {
    if (!this.connectBtn) return;

    this.connectBtn.innerHTML = '<i class="bi bi-check me-1"></i>Conectado';
    this.connectBtn.className = "btn btn-outline-success btn-used-success btn-lg";
    this.connectBtn.disabled = true;
  }

  showDashboardButton() {
    if (!this.connectBtn) return;

    const config = this.pageConfigs[this.pageType];
    const target = config.redirectTarget || "";
    const buttonText = target.includes("tools") ? "Ir para Ferramentas" : config.redirectTarget ? "Ir para Dashboard" : "Dashboard";

    this.connectBtn.innerHTML = `<i class="bi bi-speedometer2 me-1"></i>${buttonText}`;
    this.connectBtn.className = "btn btn-outline-primary btn-lg";
    this.connectBtn.onclick = () => this.redirectTo(config.redirectTarget || "#");
    this.connectBtn.disabled = false;
  }

  showErrorState() {
    if (!this.connectBtn) return;

    this.connectBtn.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Erro - Tente Novamente';
    this.connectBtn.className = "btn btn-outline-danger btn-lg";
    this.connectBtn.disabled = false;

    // Resetar botão após 3 segundos
    setTimeout(() => {
      this.showConnectButton();
    }, 3000);
  }

  /**
   * Configurar animações
   */
  setupAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    }, observerOptions);

    // Observar elementos com animação
    const animatedElements = document.querySelectorAll(".TokenCafe-fade-in, .TokenCafe-fade-in-up");
    animatedElements.forEach((el) => observer.observe(el));
  }

  /**
   * Configurar funções globais
   */
  setupGlobalFunctions() {
    // Função global para desconexão
    window.TokenCafeWallet = {
      globalDisconnect: () => {
        console.log("Executando desconexão global...");
        walletConnector.disconnect();
        this.showConnectButton();
      },
    };

    // Função para navegação entre páginas
    window.navigateToApp = () => {
      const config = this.pageConfigs[this.pageType];
      this.redirectTo(config.redirectTarget || "pages/index.html");
    };
  }

  /**
   * Verificar autenticação obrigatória
   */
  async checkAuthRequired() {
    try {
      const isConnected = await walletConnector.isConnected();

      if (!isConnected) {
        console.log("❌ Autenticação necessária — solicitando conexão...");
        // Evitar prompt duplo: se já tentamos auto conectar nesta página, não reabrir
        if (!window.__tokencafe_auto_connect_initiated) {
          await this.connectWallet();
        }
        // Após solicitar, revalidar estado
        const nowConnected = await walletConnector.isConnected();
        if (!nowConnected) {
          console.log("❌ Autenticação não concedida, redirecionando...");
          this.redirectTo("../index.html");
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Erro na verificação de auth:", error);
      this.redirectTo("../index.html");
      return false;
    }
  }

  /**
   * Redirecionar para URL
   */
  redirectTo(url) {
    console.log(`🎯 Redirecionando para: ${url}`);
    window.location.href = url;
  }

  /**
   * Verificar se MetaMask está instalado
   */
  async checkMetaMaskInstallation() {
    if (typeof window.ethereum === "undefined") {
      console.log("❌ MetaMask não instalado");
      this.showInstallMetaMaskButton();
      return false;
    }
    return true;
  }

  /**
   * Mostrar botão para instalar MetaMask
   */
  showInstallMetaMaskButton() {
    if (!this.connectBtn) return;

    this.connectBtn.innerHTML = '<i class="bi bi-download me-1"></i>Instalar MetaMask';
    this.connectBtn.className = "btn btn-outline-warning btn-lg";
    this.connectBtn.onclick = () => {
      window.open("https://metamask.io/download/", "_blank");
    };
  }
}

// Função factory para criar PageManager configurado
window.createPageManager = function (pageType) {
  const manager = new PageManager(pageType);
  manager.init().catch((error) => {
    console.error(`❌ Erro ao inicializar Page Manager (${pageType}):`, error);
  });
  return manager;
};

export { PageManager };
export default PageManager;
