
import { walletConnector } from "../shared/wallet-connector.js";

export class UnifiedHeader {
  constructor() {
    // Aguardar DOM estar pronto se necessário
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.init());
    } else {
      this.init();
    }
  }

  init() {
    // Encontrar o elemento pai (placeholder) para ler configurações
    const navbar = document.getElementById("main-navbar");
    if (!navbar) return;

    // O container é o elemento que possui o atributo data-component
    // Como o conteúdo foi injetado via innerHTML, o navbar é filho direto dele
    const container = navbar.parentElement;
    
    // Ler configurações (prioridade: body dataset > container dataset > default)
    this.mode = document.body.dataset.headerMode || container.dataset.headerMode || "landing";
    this.title = container.dataset.title || "";
    this.subtitle = container.dataset.subtitle || "";
    
    console.log(`UnifiedHeader: Iniciando em modo '${this.mode}'`);

    // Configurar UI
    this.setupSubtitle();
    this.renderNavItems();
    this.renderActions();
    
    // Inicializar listeners
    this.bindEvents();
  }

  setupSubtitle() {
    const el = document.getElementById("header-subtitle");
    if (el && this.subtitle) {
      el.textContent = this.subtitle;
      el.classList.remove("d-none");
      el.classList.add("d-md-block"); // Garante visibilidade em desktop
    }
  }

  renderNavItems() {
    const container = document.getElementById("header-nav-items");
    if (!container) return;

    if (this.mode === "app") {
      // Modo App: Navegação principal vazia (itens movidos para a direita/actions)
      container.innerHTML = "";
    } else {
      // Modo Landing: Navegação completa
      container.innerHTML = `
        <li class="nav-item"><a class="nav-link text-white-50 hover-text-white" href="/index.html#token">Token</a></li>
        <li class="nav-item"><a class="nav-link text-white-50 hover-text-white" href="/index.html#comofunciona">Como Funciona</a></li>
        <li class="nav-item"><a class="nav-link text-white-50 hover-text-white" href="/index.html#ecosistema">EcoSistema</a></li>
        <li class="nav-item"><a class="nav-link text-white-50 hover-text-white" href="/index.html#precos">Preços</a></li>
        <li class="nav-item"><a class="nav-link text-white-50 hover-text-white" href="/index.html#suporte">Suporte</a></li>
      `;
    }
  }

  renderActions() {
    const container = document.getElementById("header-actions");
    if (!container) return;

    if (this.mode === "app") {
      // Modo App: Menu Horizontal (Home, Suporte, Carteira)
      container.innerHTML = `
        <a href="/pages/tools.html" class="d-flex align-items-center text-decoration-none text-white-50 nav-hover-effect" title="Home">
          <i class="bi bi-house-door-fill fs-5"></i>
          <span class="ms-2 fw-medium d-none d-md-block">Home</span>
        </a>

        <a href="/pages/suporte.html" class="d-flex align-items-center text-decoration-none text-white-50 nav-hover-effect" title="Suporte">
          <i class="bi bi-headset fs-5"></i>
          <span class="ms-2 fw-medium d-none d-md-block">Suporte</span>
        </a>

        <div class="d-flex align-items-center" id="wallet-section">
            <!-- Status (Conectado) -->
            <span id="wallet-address-badge" class="badge bg-success me-2 d-none">
                <i class="bi bi-check2 me-1"></i>
                <span id="wallet-address-text"></span>
            </span>

            <!-- Conectar (Desconectado) -->
            <button id="btn-connect-wallet" class="btn-reset d-flex align-items-center text-white-50 nav-hover-effect" title="Conectar Carteira">
                <i class="bi bi-wallet2 fs-5"></i>
                <span class="ms-2 fw-medium d-none d-md-block">Conectar</span>
            </button>

            <!-- Sair -->
            <button id="btn-disconnect-wallet" class="badge bg-danger border-0 d-none ms-1" title="Sair">
                <i class="bi bi-box-arrow-right"></i>
            </button>
        </div>
      `;
      
      this.initAppWalletLogic();
      
    } else {
      // Landing Mode: Botões padrão
      container.innerHTML = `
        <button id="theme-toggle-btn" class="btn btn-sm btn-transparent-warning me-2" title="Alternar Tema"><i class="bi bi-sun"></i></button>
        <button id="connect-landing-btn" class="btn btn-sm btn-outline-primary fw-bold" data-action="connect-wallet">Conectar</button>
      `;
      
      // Monitorar status para o botão da landing
      const btn = document.getElementById("connect-landing-btn");
      if (btn) {
        this.updateLandingButton(btn);
        document.addEventListener("wallet:connected", () => this.updateLandingButton(btn));
        document.addEventListener("wallet:disconnected", () => this.updateLandingButton(btn));
        document.addEventListener("wallet:accountChanged", () => this.updateLandingButton(btn));
      }
    }
  }
  
  updateLandingButton(btn) {
      const status = window.walletConnector?.getStatus?.() || {};
      if (status.account) {
          btn.innerHTML = '<i class="bi bi-wallet2 me-1"></i>Conectado';
          btn.classList.remove("btn-outline-primary");
          btn.classList.add("btn-outline-success");
      } else {
          btn.innerHTML = 'Conectar';
          btn.classList.add("btn-outline-primary");
          btn.classList.remove("btn-outline-success");
      }
  }

  initAppWalletLogic() {
    // Bind click events
    const connectBtn = document.getElementById("btn-connect-wallet");
    const disconnectBtn = document.getElementById("btn-disconnect-wallet");
    
    if (connectBtn) {
        connectBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.walletConnector?.connect?.("metamask");
        });
    }
    
    if (disconnectBtn) {
        disconnectBtn.addEventListener("click", (e) => {
            e.preventDefault();
            window.walletConnector?.disconnect?.();
        });
    }

    // Tenta vincular UI imediatamente
    this.tryBindWalletUI();

    // E também observa eventos de carregamento da carteira se necessário
    document.addEventListener("wallet:ready", () => this.tryBindWalletUI());
  }

  tryBindWalletUI() {
     if (window.bindWalletStatusUI) {
        // Mapeia os elementos do unified header para o sistema de carteira
        window.bindWalletStatusUI({
            addressEl: "#wallet-address-text",
            statusWrapperEl: "#wallet-address-badge",
            disconnectBtnEl: "#btn-disconnect-wallet",
            connectBtnEl: "#btn-connect-wallet"
        });
    }
  }
  
  bindEvents() {
    // Theme toggle
    const themeBtn = document.getElementById("theme-toggle-btn");
    if (themeBtn) {
        themeBtn.addEventListener("click", () => {
            // Lógica de tema (se houver sistema global)
            document.body.classList.toggle("light-theme");
        });
    }
  }
}

// Instanciar
new UnifiedHeader();
