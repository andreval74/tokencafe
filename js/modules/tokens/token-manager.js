/**
 * ================================================================================
 * TOKEN MANAGER MODULE - TOKENCAFE
 * ================================================================================
 * Módulo para gerenciamento completo de tokens criados pelo usuário
 * ================================================================================
 */

class TokenManager {
  constructor() {
    this.tokens = [];
    this.filteredTokens = [];
    this.currentFilter = "all";
    this.searchTerm = "";
    this.isLoading = false;
    this.init();
  }

  async init() {
    this.setupEventListeners();
    await this.loadTokens();
    this.renderTokens();
  }

  setupEventListeners() {
    const searchInput = document.getElementById("token-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value.toLowerCase();
        this.filterAndRenderTokens();
      });
    }

    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.currentFilter = e.target.dataset.filter;
        this.filterAndRenderTokens();
      });
    });

    const clearFiltersBtn = document.getElementById("tm-clear-filters");
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        this.searchTerm = "";
        this.currentFilter = "all";
        filterButtons.forEach((b) => {
          if (b.dataset.filter === "all") b.classList.add("active");
          else b.classList.remove("active");
        });
        this.filterAndRenderTokens();
      });
    }

    const clearDataBtn = document.getElementById("btn-clear-data");
    if (clearDataBtn) {
      clearDataBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        this.searchTerm = "";
        this.currentFilter = "all";
        filterButtons.forEach((b) => {
          if (b.dataset.filter === "all") b.classList.add("active");
          else b.classList.remove("active");
        });
        this.refreshTokens();
        this.showSuccess("Dados limpos e atualizados!");
      });
    }

    // Ações do cabeçalho do módulo (delegadas)
    document.addEventListener("click", (e) => {
      const createBtn = e.target.closest('[data-action="tm-create-token"]');
      if (createBtn) {
        e.preventDefault();
        try {
          location.href = "token-add.html";
        } catch (_) {}
        return;
      }
      const refreshBtn = e.target.closest('[data-action="tm-refresh-tokens"]');
      if (refreshBtn) {
        e.preventDefault();
        this.refreshTokens();
        return;
      }
    });

    const editForm = document.getElementById("edit-token-form");
    if (editForm) {
      editForm.addEventListener("submit", (e) => {
        e.preventDefault();
        this.saveTokenChanges();
      });
    }
    const grid = document.getElementById("tokens-grid");
    if (grid) {
      grid.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action]");
        if (!btn) return;
        const action = btn.dataset.action;
        const card = btn.closest(".token-card");
        const tokenId = card?.dataset?.tokenId;
        if (!tokenId) return;
        if (action === "view") this.viewDetails(tokenId);
        else if (action === "edit") this.editToken(tokenId);
        else if (action === "copy") {
          const t = this.tokens.find((x) => x.id === tokenId);
          if (t?.contractAddress) this.copyAddress(t.contractAddress);
        }
      });
    }
  }

  async loadTokens() {
    try {
      this.setLoadingState(true);
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Tentativas de integração com dados reais (quando disponíveis)
      const candidates = ["/api/tokens", typeof location !== "undefined" ? `${location.protocol}//${location.hostname}:3001/api/tokens` : null, "/shared/data/tokens.json"].filter(Boolean);

      let loaded = false;
      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            const entries = Array.isArray(data?.tokens) ? data.tokens : Array.isArray(data) ? data : [];
            if (entries.length > 0) {
              this.tokens = entries.map((t, i) => ({
                id: String(t.id ?? i + 1),
                name: t.name ?? "Token",
                symbol: t.symbol ?? "TKN",
                type: (t.type ?? "erc20").toLowerCase(),
                totalSupply: Number(t.totalSupply ?? 0),
                decimals: Number(t.decimals ?? 18),
                status: (t.status ?? "active").toLowerCase(),
                contractAddress: t.contractAddress ?? "-",
                network: t.network ?? "Desconhecida",
                createdAt: t.createdAt ?? new Date().toISOString().slice(0, 10),
                description: t.description ?? "",
                website: t.website ?? "",
                holders: Number(t.holders ?? 0),
                transactions: Number(t.transactions ?? 0),
              }));
              loaded = true;
              break;
            }
          }
        } catch (_) {
          // Ignorar erros e tentar próximo candidato
        }
      }

      // Fallback para dados mock locais
      if (!loaded) {
        this.tokens = [
          {
            id: "1",
            name: "MeuToken",
            symbol: "MTK",
            type: "erc20",
            totalSupply: 1000000,
            decimals: 18,
            status: "active",
            contractAddress: "0x1234...abcd",
            network: "Ethereum",
            createdAt: "2024-02-01",
            description: "Token utilitário da minha comunidade",
            website: "https://meutoken.com",
            holders: 102,
            transactions: 250,
          },
          {
            id: "2",
            name: "MyNFT",
            symbol: "MNFT",
            type: "erc721",
            totalSupply: 1000,
            decimals: 0,
            status: "active",
            contractAddress: "0xabcd...ef01",
            network: "Polygon",
            createdAt: "2024-03-15",
            description: "Coleção NFT exclusiva",
            website: "https://mynft.com",
            holders: 45,
            transactions: 89,
          },
          {
            id: "3",
            name: "TestToken",
            symbol: "TEST",
            type: "erc20",
            totalSupply: 500000,
            decimals: 18,
            status: "paused",
            contractAddress: "0x9876...5432",
            network: "BSC",
            createdAt: "2024-01-10",
            description: "Token de teste",
            holders: 12,
            transactions: 34,
          },
        ];
      }
      this.filteredTokens = [...this.tokens];
    } catch (error) {
      this.showError("Erro ao carregar tokens");
    } finally {
      this.setLoadingState(false);
    }
  }

  filterAndRenderTokens() {
    let filtered = [...this.tokens];
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((token) => {
        switch (this.currentFilter) {
          case "erc20":
            return token.type === "erc20";
          case "erc721":
            return token.type === "erc721";
          case "active":
            return token.status === "active";
          case "paused":
            return token.status === "paused";
          default:
            return true;
        }
      });
    }
    if (this.searchTerm) {
      filtered = filtered.filter((token) => token.name.toLowerCase().includes(this.searchTerm) || token.symbol.toLowerCase().includes(this.searchTerm) || (token.description || "").toLowerCase().includes(this.searchTerm));
    }
    this.filteredTokens = filtered;
    this.renderTokens();
  }

  renderTokens() {
    const grid = document.getElementById("tokens-grid");
    const emptyState = document.getElementById("empty-tokens-state");
    if (!grid) return;
    if (this.filteredTokens.length === 0) {
      grid.style.display = "none";
      if (emptyState) emptyState.style.display = "block";
      return;
    }
    if (emptyState) emptyState.style.display = "none";
    grid.style.display = "grid";
    grid.innerHTML = this.filteredTokens.map((token) => this.createTokenCard(token)).join("");
  }

  createTokenCard(token) {
    const tokenId = token.id;
    const statusText = token.status === "active" ? "Ativo" : "Pausado";
    const typeText = token.type.toUpperCase();
    return `
            <div class="token-card" data-token-id="${tokenId}">
                <div class="token-header">
                    <div class="token-type">${typeText}</div>
                    <div class="token-status">${statusText}</div>
                </div>
                <div class="token-info">
                    <h3 class="token-name">${token.name}</h3>
                    <p class="token-symbol">${token.symbol}</p>
                    <p class="token-type">${typeText}</p>
                </div>
                <div class="token-stats">
                    <div class="stat"><span class="stat-label">Supply:</span><span class="stat-value">${this.formatNumber(token.totalSupply)}</span></div>
                    <div class="stat"><span class="stat-label">Holders:</span><span class="stat-value">${token.holders}</span></div>
                    <div class="stat"><span class="stat-label">Network:</span><span class="stat-value">${token.network}</span></div>
                </div>
                <div class="token-actions">
                    <button class="btn btn-sm btn-outline-primary" data-action="view">Ver Detalhes</button>
                    <button class="btn btn-sm btn-outline-secondary" data-action="edit">Editar</button>
                    <button class="btn btn-sm btn-outline-secondary" data-action="copy">
                        <i class="bi bi-clipboard"></i> Copiar
                    </button>
                </div>
            </div>
        `;
  }

  viewDetails(tokenId) {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (!token) return;
    const content = document.getElementById("token-details-content");
    if (!content) return;
    content.innerHTML = `
            <div class="token-details">
                <div class="detail-section">
                    <h4>Informações Básicas</h4>
                    <div class="detail-grid">
                        <div class="detail-item"><label>Nome:</label><span>${token.name}</span></div>
                        <div class="detail-item"><label>Símbolo:</label><span>${token.symbol}</span></div>
                        <div class="detail-item"><label>Tipo:</label><span>${token.type.toUpperCase()}</span></div>
                        <div class="detail-item"><label>Status:</label><span class="status-${token.status}">${token.status}</span></div>
                    </div>
                </div>
                <div class="detail-section">
                    <h4>Contrato</h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Endereço:</label>
                            <span class="d-flex align-items-center gap-2">
                                ${token.contractAddress}
                                <button class="btn btn-sm btn-link p-0 text-primary" onclick="window.tokenManager.copyAddress('${token.contractAddress}')" title="Copiar">
                                    <i class="bi bi-clipboard"></i>
                                </button>
                            </span>
                        </div>
                        <div class="detail-item"><label>Rede:</label><span>${token.network}</span></div>
                        <div class="detail-item"><label>Decimais:</label><span>${token.decimals || "-"}</span></div>
                        <div class="detail-item"><label>Holders:</label><span>${token.holders}</span></div>
                        <div class="detail-item"><label>Transações:</label><span>${token.transactions}</span></div>
                        <div class="detail-item"><label>Criado em:</label><span>${this.formatDate(token.createdAt)}</span></div>
                    </div>
                </div>
                ${
                  token.description
                    ? `
                <div class="detail-section">
                    <h4>Descrição</h4>
                    <p>${token.description}</p>
                </div>`
                    : ""
                }
                <div class="detail-actions">
                    <button class="btn btn-outline-primary" onclick="window.open('https://etherscan.io/address/${token.contractAddress}', '_blank')">Ver no Explorer</button>
            ${token.website ? `<button class="btn btn-outline-primary" onclick="window.open('${token.website}', '_blank')">Website</button>` : ""}
                </div>
            </div>
        `;
    this.showModal("token-details-modal");
  }

  editToken(tokenId) {
    const token = this.tokens.find((t) => t.id === tokenId);
    if (!token) return;
    document.getElementById("edit-token-name").value = token.name;
    document.getElementById("edit-token-description").value = token.description || "";
    document.getElementById("edit-token-website").value = token.website || "";
    document.getElementById("edit-token-form").dataset.tokenId = tokenId;
    this.showModal("edit-token-modal");
  }

  async saveTokenChanges() {
    const form = document.getElementById("edit-token-form");
    const tokenId = form.dataset.tokenId;
    const updatedData = {
      name: document.getElementById("edit-token-name").value,
      description: document.getElementById("edit-token-description").value,
      website: document.getElementById("edit-token-website").value,
    };
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const tokenIndex = this.tokens.findIndex((t) => t.id === tokenId);
      if (tokenIndex !== -1) {
        this.tokens[tokenIndex] = {
          ...this.tokens[tokenIndex],
          ...updatedData,
        };
      }
      this.filterAndRenderTokens();
      this.closeModal("edit-token-modal");
      this.showSuccess("Token atualizado com sucesso!");
    } catch (error) {
      this.showError("Erro ao salvar alterações");
    }
  }

  async copyAddress(address) {
    if (window.copyToClipboard) {
      await window.copyToClipboard(address);
      this.showSuccess("Endereço copiado!");
    } else {
      try {
        await navigator.clipboard.writeText(address);
        this.showSuccess("Endereço copiado!");
      } catch (error) {
        this.showError("Erro ao copiar endereço");
      }
    }
  }

  async refreshTokens() {
    await this.loadTokens();
    this.filterAndRenderTokens();
    this.showSuccess("Tokens atualizados!");
  }

  setLoadingState(loading) {
    this.isLoading = loading;
    const loadingEl = document.getElementById("tokens-loading");
    const gridEl = document.getElementById("tokens-grid");
    if (loadingEl) loadingEl.style.display = loading ? "block" : "none";
    if (gridEl) gridEl.style.display = loading ? "none" : "grid";
  }

  showModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      let instance = bootstrap.Modal.getInstance(el);
      if (!instance) instance = new bootstrap.Modal(el, { backdrop: "static" });
      instance.show();
    } else {
      el.style.display = "flex";
    }
  }

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      const instance = bootstrap.Modal.getInstance(el) || new bootstrap.Modal(el);
      instance.hide();
    } else {
      el.style.display = "none";
    }
  }

  formatNumber(num) {
    return new Intl.NumberFormat("pt-BR").format(num);
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("pt-BR");
  }

  // Mensagens padronizadas: usa window.showFormSuccess se disponível
  showSuccess(message) {
    if (window.showFormSuccess) {
      window.showFormSuccess(message);
    } else if (typeof window.notify === "function") {
      window.notify(message, "success");
    } else {
      console.log("Sucesso:", message);
    }
  }

  // Mensagens padronizadas: usa window.showFormError se disponível
  showError(message) {
    if (window.showFormError) {
      window.showFormError(message);
    } else if (typeof window.notify === "function") {
      window.notify(message, "error");
    } else {
      console.error("Erro:", message);
    }
  }
}

window.refreshTokens = () => {
  if (window.tokenManager) {
    window.tokenManager.refreshTokens();
  }
};

window.closeModal = (modalId) => {
  if (window.tokenManager) {
    window.tokenManager.closeModal(modalId);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.tokenManager = new TokenManager();
});

console.log("Token Manager Module carregado");
