/**
 * SystemResponse.js
 * Gerencia a tela de resposta padrão do sistema (sucesso/resultado).
 */
export class SystemResponse {
  constructor() {
    this.container = null;
    this.config = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.container = document.getElementById("system-response-section");
    if (!this.container) return; // Componente ainda não carregado ou não presente

    // Attach listeners
    this.container.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.dataset.action;
      this.handleAction(action);
    });

    this.initialized = true;
  }

  /**
   * Exibe a tela de resposta
   * @param {Object} config
   * @param {string} config.title - Título da seção
   * @param {string} config.subtitle - Subtítulo da seção
   * @param {string} config.icon - Classe do ícone (ex: 'bi-check-circle')
   * @param {string} config.content - Conteúdo principal (link, hash, texto)
   * @param {string} config.badge - Texto do badge de sucesso (opcional)
   * @param {string[]} config.actions - Lista de ações visíveis: ['copy', 'whatsapp', 'telegram', 'email', 'open', 'clear']
   * @param {Function} config.onClear - Callback executado ao limpar/fechar
   */
  show(config) {
    if (!this.initialized) this.init();
    if (!this.container) return;

    this.config = config || {};
    
    // Set texts
    const titleEl = document.getElementById("sr-title");
    const subEl = document.getElementById("sr-subtitle");
    const iconEl = document.getElementById("sr-icon");
    const inputEl = document.getElementById("sr-result-input");
    const customEl = document.getElementById("sr-custom-content");
    const badgeEl = document.getElementById("sr-badge");
    const badgeTextEl = document.getElementById("sr-badge-text");

    if (titleEl) titleEl.textContent = config.title || "Resultado";
    if (subEl) subEl.textContent = config.subtitle || "Ação concluída com sucesso";
    if (iconEl) iconEl.className = `bi ${config.icon || "bi-check-circle"}`;
    
    // Content handling (Input vs Custom HTML)
    if (config.htmlContent && customEl) {
        if (inputEl) inputEl.classList.add("d-none");
        customEl.classList.remove("d-none");
        customEl.innerHTML = config.htmlContent;
    } else {
        if (customEl) customEl.classList.add("d-none");
        if (inputEl) {
            inputEl.classList.remove("d-none");
            inputEl.value = config.content || "";
        }
    }
    
    // Badge
    if (badgeEl && badgeTextEl) {
      if (config.badge) {
        badgeTextEl.textContent = config.badge;
        badgeEl.classList.remove("d-none");
      } else {
        badgeEl.classList.add("d-none");
      }
    }

    // Toggle Actions
    const allActions = ["copy", "whatsapp", "telegram", "email", "open", "clear", "add_wallet"];
    const visibleActions = config.actions || ["copy", "clear"];
    
    allActions.forEach(action => {
      const col = this.container.querySelector(`.sr-action-btn[data-type="${action}"]`);
      if (col) {
        if (visibleActions.includes(action)) {
          col.classList.remove("d-none");
        } else {
          col.classList.add("d-none");
        }
      }
    });

    // Show container
    this.container.classList.remove("d-none");
    
    // Scroll to view
    this.container.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  hide() {
    if (this.container) {
      this.container.classList.add("d-none");
    }
  }

  handleAction(action) {
    const content = this.config?.content || "";
    
    switch (action) {
      case "copy":
        this.copyToClipboard(content);
        break;
      case "whatsapp":
        this.shareWhatsApp(content);
        break;
      case "telegram":
        this.shareTelegram(content);
        break;
      case "email":
              this.shareEmail(content);
              break;
            case "add_wallet":
              this.addToWallet();
              break;
            case "open":
              if (content) window.open(content, "_blank");
              break;
      case "clear":
        this.hide();
        if (typeof this.config?.onClear === "function") {
          this.config.onClear();
        }
        break;
    }
  }

  async addToWallet() {
    const data = this.config?.tokenData;
    if (!data || !data.address || !window.ethereum) {
       if (window.notify) window.notify("Dados do token incompletos ou carteira não encontrada.", "error");
       return;
    }
    
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: data.address,
            symbol: data.symbol || 'TKN',
            decimals: data.decimals || 18,
            image: data.image || '',
          },
        },
      });
      if (window.notify) window.notify("Solicitação enviada à carteira!", "success");
    } catch (error) {
      console.error(error);
      if (window.notify) window.notify("Erro ao adicionar token: " + error.message, "error");
    }
  }

  copyToClipboard(text) {
    if (!text) return;
    if (window.copyToClipboard) {
      window.copyToClipboard(text);
    } else {
      navigator.clipboard.writeText(text).then(() => {
        if (window.notify) window.notify("Copiado com sucesso!", "success");
      }).catch(() => {
        if (window.notify) window.notify("Erro ao copiar.", "error");
      });
    }
  }

  shareWhatsApp(text) {
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  shareTelegram(text) {
    if (!text) return;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(text)}&text=TokenCafe%20Link`, "_blank");
  }

  shareEmail(text) {
    if (!text) return;
    window.open(`mailto:?subject=TokenCafe%20Link&body=${encodeURIComponent(text)}`, "_self");
  }
}
