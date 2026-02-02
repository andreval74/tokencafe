/**
 * SystemResponse.js
 * Gerencia a exibição de respostas do sistema via Modal (Sucesso/Erro/Resultado).
 * Substitui a antiga exibição inline.
 */
export class SystemResponse {
  constructor() {
    this.modalId = "systemResponseModal";
    this.modalInstance = null;
    this.config = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.ensureModalExists();
    this.initialized = true;
  }

  /**
   * Garante que o HTML do modal exista no DOM
   */
  ensureModalExists() {
    if (document.getElementById(this.modalId)) return;

    const modalHtml = `
      <div class="modal fade" id="${this.modalId}" tabindex="-1" aria-labelledby="${this.modalId}Label" aria-hidden="true" data-bs-backdrop="static">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content bg-dark text-light border-secondary shadow-lg">
            <div class="modal-header border-bottom border-secondary">
              <h5 class="modal-title d-flex align-items-center" id="${this.modalId}Label">
                <i id="sr-modal-icon-title" class="bi bi-info-circle me-2"></i>
                <span id="sr-modal-title">Resposta do Sistema</span>
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body text-center py-4">
              <div class="mb-3">
                <i id="sr-modal-main-icon" class="bi bi-check-circle text-success" style="font-size: 3rem;"></i>
              </div>
              <h5 id="sr-modal-subtitle" class="mb-3">Operação realizada com sucesso!</h5>
              
              <!-- Badge opcional -->
              <div id="sr-modal-badge" class="mb-3 d-none">
                <span id="sr-modal-badge-text" class="badge bg-success">Sucesso</span>
              </div>

              <!-- Conteúdo de Texto/Input -->
              <div id="sr-modal-input-container" class="d-none mb-3">
                <div class="input-group">
                  <input type="text" id="sr-modal-input" class="form-control bg-dark-subtle text-light border-secondary" readonly>
                  <button class="btn btn-outline-primary" type="button" id="sr-modal-btn-copy-input">
                    <i class="bi bi-clipboard"></i>
                  </button>
                </div>
              </div>

              <!-- Conteúdo HTML Customizado -->
              <div id="sr-modal-custom-content" class="d-none text-start bg-dark-subtle p-3 rounded border border-secondary"></div>
            </div>
            <div class="modal-footer border-top border-secondary justify-content-center flex-wrap" id="sr-modal-footer">
              <!-- Botões de Ação Dinâmicos -->
              <div id="sr-modal-actions" class="d-flex gap-2 flex-wrap justify-content-center w-100 mb-2 d-none">
                <!-- Injetados via JS -->
              </div>
              <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal" id="sr-modal-btn-ok">OK</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  /**
   * Exibe o modal de resposta
   * @param {Object} config
   */
  show(config) {
    // Garante que qualquer modal anterior seja fechado corretamente antes de abrir um novo
    this.hide();

    this.init();
    this.config = config || {};

    // Elements
    const titleEl = document.getElementById("sr-modal-title");
    const iconTitleEl = document.getElementById("sr-modal-icon-title");
    const mainIconEl = document.getElementById("sr-modal-main-icon");
    const subtitleEl = document.getElementById("sr-modal-subtitle");
    const badgeEl = document.getElementById("sr-modal-badge");
    const badgeTextEl = document.getElementById("sr-modal-badge-text");
    const inputContainer = document.getElementById("sr-modal-input-container");
    const inputEl = document.getElementById("sr-modal-input");
    const customContentEl = document.getElementById("sr-modal-custom-content");
    const actionsContainer = document.getElementById("sr-modal-actions");
    const okBtn = document.getElementById("sr-modal-btn-ok");
    const copyBtn = document.getElementById("sr-modal-btn-copy-input");

    // Re-bind actions to ensure current config context
    if (okBtn) {
      okBtn.onclick = () => {
        if (typeof this.config?.onClear === "function") {
          this.config.onClear();
        }
      };
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        const val = document.getElementById("sr-modal-input")?.value;
        if (val) this.copyToClipboard(val);
      };
    }

    // Defaults
    const title = config.title || "Resultado";
    const subtitle = config.subtitle || "Ação concluída";
    const iconClass = config.icon || "bi-check-circle";
    const isError = iconClass.includes("exclamation") || iconClass.includes("x-circle") || config.type === "error";

    // Set Content
    if (titleEl) titleEl.textContent = title;
    if (iconTitleEl) iconTitleEl.className = `bi ${iconClass} me-2 ${isError ? "text-danger" : "text-success"}`;
    if (mainIconEl) mainIconEl.className = `bi ${iconClass} ${isError ? "text-danger" : "text-success"}`;
    if (mainIconEl) mainIconEl.style.fontSize = "3rem";
    if (subtitleEl) subtitleEl.textContent = subtitle;

    // Badge
    if (badgeEl && badgeTextEl) {
      if (config.badge) {
        badgeTextEl.textContent = config.badge;
        badgeEl.classList.remove("d-none");
      } else {
        badgeEl.classList.add("d-none");
      }
    }

    // Input vs Custom Content
    if (config.htmlContent) {
      if (inputContainer) inputContainer.classList.add("d-none");
      if (customContentEl) {
        customContentEl.innerHTML = config.htmlContent;
        customContentEl.classList.remove("d-none");
      }
    } else if (config.content) {
      if (customContentEl) customContentEl.classList.add("d-none");
      if (inputContainer && inputEl) {
        inputEl.value = config.content;
        inputContainer.classList.remove("d-none");
      }
    } else {
      // Nada a mostrar
      if (inputContainer) inputContainer.classList.add("d-none");
      if (customContentEl) customContentEl.classList.add("d-none");
    }

    // Actions
    if (actionsContainer) {
      actionsContainer.innerHTML = "";
      const actions = config.actions || [];

      if (actions.length > 0) {
        actionsContainer.classList.remove("d-none");
        actions.forEach((action) => {
          const btn = this.createActionButton(action, config.content);
          if (btn) actionsContainer.appendChild(btn);
        });
      } else {
        actionsContainer.classList.add("d-none");
      }
    }

    // Show Modal
    const modalEl = document.getElementById(this.modalId);
    if (modalEl) {
      // Use Bootstrap API
      // @ts-ignore
      if (typeof bootstrap !== "undefined") {
        // @ts-ignore
        this.modalInstance = new bootstrap.Modal(modalEl);
        this.modalInstance.show();
      } else {
        // Fallback simples
        modalEl.classList.add("show");
        modalEl.style.display = "block";
        document.body.classList.add("modal-open");
        // Adicionar backdrop manualmente se necessário
      }
    }
  }

  createActionButton(action, content) {
    const btn = document.createElement("button");
    btn.className = "btn btn-outline-light btn-sm d-flex align-items-center gap-2";

    switch (action) {
      case "copy":
        btn.innerHTML = '<i class="bi bi-clipboard"></i> Copiar';
        btn.onclick = () => this.copyToClipboard(content);
        break;
      case "whatsapp":
        btn.innerHTML = '<i class="bi bi-whatsapp"></i> WhatsApp';
        btn.onclick = () => this.shareWhatsApp(content);
        break;
      case "telegram":
        btn.innerHTML = '<i class="bi bi-telegram"></i> Telegram';
        btn.onclick = () => this.shareTelegram(content);
        break;
      case "email":
        btn.innerHTML = '<i class="bi bi-envelope"></i> Email';
        btn.onclick = () => this.shareEmail(content);
        break;
      case "add_wallet":
        btn.innerHTML = '<i class="bi bi-wallet2"></i> Add Wallet';
        btn.onclick = () => this.addToWallet();
        break;
      case "open":
        btn.innerHTML = '<i class="bi bi-box-arrow-up-right"></i> Abrir';
        btn.onclick = () => {
          if (content) window.open(content, "_blank");
        };
        break;
      case "clear":
        btn.innerHTML = '<i class="bi bi-trash"></i> Limpar';
        btn.className = "btn btn-outline-danger btn-sm d-flex align-items-center gap-2";
        btn.onclick = () => {
          if (this.config.onClear) this.config.onClear();
          this.hide();
        };
        break;
      default:
        return null;
    }
    return btn;
  }

  hide() {
    // Tentativa principal usando Bootstrap
    if (this.modalInstance) {
      try {
        this.modalInstance.hide();
      } catch (e) {
        console.error("Erro ao fechar modal via Bootstrap:", e);
      }
    }

    // Fallback manual para esconder o elemento
    const modalEl = document.getElementById(this.modalId);
    if (modalEl) {
      modalEl.classList.remove("show");
      modalEl.style.display = "none";
      modalEl.setAttribute("aria-hidden", "true");
      modalEl.removeAttribute("aria-modal");
      modalEl.removeAttribute("role");
    }

    // Limpeza forçada e agressiva de backdrops e classes do body
    const forceCleanup = () => {
      // Remover todos os backdrops
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());

      // Limpar classes do body
      document.body.classList.remove("modal-open");

      // Resetar estilos inline que o Bootstrap adiciona
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };

    forceCleanup();
    // Repetir limpeza para garantir que animações não recriem o backdrop
    setTimeout(forceCleanup, 100);
    setTimeout(forceCleanup, 300);
  }

  // Métodos de Ação (Mantidos iguais)
  async addToWallet() {
    const data = this.config?.tokenData;
    if (!data || !data.address || !window.ethereum) {
      if (window.notify) window.notify("Dados incompletos ou carteira não encontrada.", "error");
      return;
    }
    try {
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: data.address,
            symbol: data.symbol || "TKN",
            decimals: data.decimals || 18,
            image: data.image || "",
          },
        },
      });
      if (window.notify) window.notify("Solicitação enviada!", "success");
    } catch (error) {
      console.error(error);
      if (window.notify) window.notify("Erro: " + error.message, "error");
    }
  }

  copyToClipboard(text) {
    if (!text) return;
    if (window.copyToClipboard) {
      window.copyToClipboard(text);
    } else {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          if (window.notify) window.notify("Copiado!", "success");
        })
        .catch(() => {});
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
