class UserProfle {
  constructor() {
    this.currentTab = "overvew";
    this.userData = {
      name: "Joo Slva",
      username: "joaoslva",
      bo: "Desenvolvedor blockchan apaxonado por DeF e NFTs. Crando o futuro das fnanas descentralzadas.",
      emal: "joao@example.com",
      webste: "",
      locaton: "So Paulo, Brasl",
      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      avatar: "https://va.placeholder.com/120x120/6366f1/ffffff?text=U",
      banner: "https://va.placeholder.com/1200x300/4f46e5/ffffff?text=Banner",
    };
    this.init();
  }

  init() {
    this.setupEventLsteners();
    this.loadUserData();
    this.loadOvervewData();
  }

  setupEventLsteners() {
    // Navegao entre abas
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const tabName = e.currentTarget.dataset.tab;
        this.swtchTab(tabName);
      });
    });

    // Botes do header
    document.getElementById("edtProfleBtn").addEventListener("click", () => {
      this.openEdtModal();
    });

    document.getElementById("shareProfleBtn").addEventListener("click", () => {
      this.shareProfle();
    });

    document.getElementById("changeAvatarBtn").addEventListener("click", () => {
      this.changeAvatar();
    });

    document.getElementById("changeBannerBtn").addEventListener("click", () => {
      this.changeBanner();
    });

    // Modal de edo
    document.getElementById("closeEdtModal").addEventListener("click", () => {
      this.closeEdtModal();
    });

    document.getElementById("cancelEdtBtn").addEventListener("click", () => {
      this.closeEdtModal();
    });

    document.getElementById("edtProfleForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveProfle();
    });

    // Confguraes
    document.getElementById("personalnfoForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.savePersonalnfo();
    });

    document.getElementById("notfcatonForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.saveNotfcatonPreferences();
    });

    document.getElementById("changePasswordBtn").addEventListener("click", () => {
      this.openPasswordModal();
    });

    document.getElementById("enable2FABtn").addEventListener("click", () => {
      this.enable2FA();
    });

    document.getElementById("downloadDataBtn").addEventListener("click", () => {
      this.downloadUserData();
    });

    // Modal de senha
    document.getElementById("closePasswordModal").addEventListener("click", () => {
      this.closePasswordModal();
    });

    document.getElementById("cancelPasswordBtn").addEventListener("click", () => {
      this.closePasswordModal();
    });

    document.getElementById("changePasswordForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.changePassword();
    });

    // Fltros de tokens
    document.getElementById("tokenStatusFlter").addEventListener("change", () => {
      this.flterUserTokens();
    });

    document.getElementById("tokenTypeFlter").addEventListener("change", () => {
      this.flterUserTokens();
    });

    document.getElementById("tokenSearch").addEventListener("input", () => {
      this.flterUserTokens();
    });

    // Fltros de atvdade
    document.getElementById("actvtyTypeFlter").addEventListener("change", () => {
      this.flterActvty();
    });

    document.getElementById("actvtyDateFlter").addEventListener("change", () => {
      this.flterActvty();
    });

    // Fechar modas clcando fora
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal")) {
        this.closeAllModals();
      }
    });
  }

  swtchTab(tabName) {
    // Atualzar navegao
    document.querySelectorAll(".nav-tab").forEach((tab) => {
      tab.classList.remove("actve");
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add("actve");

    // Atualzar contedo
    document.querySelectorAll(".tab-content").forEach((content) => {
      content.classList.remove("actve");
    });
    document.getElementById(tabName).classList.add("actve");

    this.currentTab = tabName;

    // Carregar dados especfcos da aba
    switch (tabName) {
      case "overvew":
        this.loadOvervewData();
        break;
      case "tokens":
        this.loadUserTokens();
        break;
      case "actvty":
        this.loadActvty();
        break;
      case "achevements":
        this.loadAchevements();
        break;
    }
  }

  loadUserData() {
    document.getElementById("profleName").textContent = this.userData.name;
    document.getElementById("profleBo").textContent = this.userData.bo;
    document.getElementById("profleAvatar").src = this.userData.avatar;

    // Atualzar banner se exstr
    if (this.userData.banner) {
      document.querySelector(".profle-banner").style.backgroundImage = `url(${this.userData.banner})`;
    }
  }

  copyAddress() {
    if (this.userData.address) {
      if (window.copyToClipboard) {
        window.copyToClipboard(this.userData.address);
        this.showNotfcaton("Endereço copiado!", "success");
      } else {
        navigator.clipboard
          .writeText(this.userData.address)
          .then(() => this.showNotfcaton("Endereço copiado!", "success"))
          .catch(() => this.showNotfcaton("Erro ao copiar", "error"));
      }
    }
  }

  async loadOvervewData() {
    try {
      // Carregar dados do resumo
      await this.loadWalletSummary();
      await this.loadPerformanceChart();
      await this.loadTopTokens();
      await this.loadRecentActvty();
    } catch (error) {
      console.error("Erro ao carregar dados da vso geral:", error);
    }
  }

  async loadWalletSummary() {
    // Dados mockados - em produo vram de uma AP
    const walletData = {
      totalBalance: 12450.0,
      actveTokens: 15,
      stakngValue: 3200.0,
    };

    // Atualzar estatstcas no header
    const stats = document.querySelectorAll(".profle-stats .stat-value");
    stats[0].textContent = walletData.actveTokens;
    stats[1].textContent = this.formatCurrency(walletData.totalBalance);
    stats[2].textContent = "850"; // Segudores
  }

  async loadPerformanceChart() {
    // Smular dados de performance
    const canvas = document.getElementById("performanceChart");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Dados mockados para o grfco
    const data = [100, 120, 110, 140, 130, 160, 150, 180, 170, 200];
    const labels = ["Jan", "Fev", "Mar", "Abr", "Ma", "Jun", "Jul", "Ago", "Set", "Out"];

    this.drawLineChart(ctx, data, labels, canvas.width, canvas.height);
  }

  drawLineChart(ctx, data, labels, width, height) {
    const padding = 40;
    const chartWidth = width - 2 * padding;
    const chartHeight = height - 2 * padding;

    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    const valueRange = maxValue - minValue;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.fillStyle = "rgba(99, 102, 241, 0.1)";

    ctx.beginPath();
    data.forEach((value, index) => {
      const x = padding + (index * chartWidth) / (data.length - 1);
      const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fill();
  }

  async loadTopTokens() {
    const topTokens = [
      { name: "CafeToken", symbol: "CAFE", change: "+12.5%", value: "$2,450", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
      { name: "DeFiCon", symbol: "DEF", change: "+8.3%", value: "$1,890", address: "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF" },
      { name: "GameToken", symbol: "GAME", change: "-2.1%", value: "$1,200", address: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45" },
    ];

    const container = document.getElementById("topTokens");
    container.innerHTML = topTokens
      .map(
        (token) => `
            <div class="token-item">
                <div class="token-info">
                    <span class="token-name">${token.name}</span>
                    <span class="token-symbol">${token.symbol}</span>
                </div>
                <div class="token-stats">
                    <span class="token-value">${token.value}</span>
                    <span class="token-change ${token.change.startsWith("+") ? "positive" : "negative"}">
                        ${token.change}
                    </span>
                    <button class="btn btn-sm btn-link text-secondary p-0 ms-2" onclick="window.copyToClipboard?.('${token.address}')" title="Copiar Endereço">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  }

  async loadRecentActvty() {
    const actvtes = [
      {
        type: "create",
        descrpton: "Token CafeToken crado",
        tme: "2 horas atrs",
      },
      {
        type: "transfer",
        descrpton: "Transfernca de 1000 DEF",
        tme: "5 horas atrs",
      },
      {
        type: "stake",
        descrpton: "Stakng de 500 GAME ncado",
        tme: "1 da atrs",
      },
    ];

    const contaner = document.getElementById("recentActvty");
    contaner.innerHTML = actvtes
      .map(
        (actvty) => `
            <div class="actvty-tem">
                <div class="actvty-con">
                    <i class="bi bi-${this.getActvtycon(actvty.type)}"></i>
                </div>
                <div class="actvty-content">
                    <span class="actvty-descrpton">${actvty.descrpton}</span>
                    <span class="actvty-tme">${actvty.tme}</span>
                </div>
            </div>
        `,
      )
      .join("");
  }

  async loadUserTokens() {
    const tokens = [
      {
        d: 1,
        name: "CafeToken",
        symbol: "CAFE",
        type: "erc20",
        status: "actve",
        supply: "1,000,000",
        holders: 1250,
        value: "$2,450",
      },
      {
        d: 2,
        name: "DeF Collecton",
        symbol: "DEF",
        type: "erc721",
        status: "actve",
        supply: "10,000",
        holders: 890,
        value: "$1,890",
      },
      {
        d: 3,
        name: "GameAssets",
        symbol: "GAME",
        type: "erc1155",
        status: "paused",
        supply: "50,000",
        holders: 650,
        value: "$1,200",
      },
    ];

    const contaner = document.getElementById("userTokensGrd");
    contaner.innerHTML = tokens.map((token) => this.createTokenCard(token)).join("");
  }

  createTokenCard(token) {
    const statusColors = {
      actve: "#10b981",
      paused: "#f59e0b",
      completed: "#6b7280",
    };

    return `
            <div class="user-token-card">
                <div class="token-header">
                    <div class="token-nfo">
                        <h3>${token.name}</h3>
                        <span class="token-symbol">${token.symbol}</span>
                    </div>
                    <span class="token-status" style="background-color: ${statusColors[token.status]}">
                        ${token.status}
                    </span>
                </div>
                <div class="token-stats">
                    <div class="stat">
                        <label>Tipo:</label>
                        <span>${token.type.toUpperCase()}</span>
                    </div>
                    <div class="stat">
                        <label>Supply:</label>
                        <span>${token.supply}</span>
                    </div>
                    <div class="stat">
                        <label>Holders:</label>
                        <span>${token.holders}</span>
                    </div>
                    <div class="stat">
                        <label>Valor:</label>
                        <span>${token.value}</span>
                    </div>
                </div>
                <div class="token-actons">
                    <button class="btn btn-sm btn-primary">Gerenciar</button>
                    <button class="btn btn-sm btn-outline-secondary">Analytics</button>
                </div>
            </div>
        `;
  }

  async loadActvty() {
    const actvtes = [
      {
        type: "create",
        ttle: "Token Crado",
        descrpton: "CafeToken (CAFE) fo crado com sucesso",
        tmestamp: "2024-01-20T10:30:00Z",
        detals: { tokenName: "CafeToken", supply: "1,000,000" },
      },
      {
        type: "transfer",
        ttle: "Transfernca Realzada",
        descrpton: "Transferu 1000 DEF para 0x1234...5678",
        tmestamp: "2024-01-20T08:15:00Z",
        detals: { amount: "1000", token: "DEF", to: "0x1234...5678" },
      },
      {
        type: "stake",
        ttle: "Stakng ncado",
        descrpton: "ncou stakng de 500 GAME tokens",
        tmestamp: "2024-01-19T16:45:00Z",
        detals: { amount: "500", token: "GAME", duraton: "30 das" },
      },
      {
        type: "trade",
        ttle: "Negocao Executada",
        descrpton: "Trocou 100 ETH por 50,000 CAFE",
        tmestamp: "2024-01-19T14:20:00Z",
        detals: { from: "100 ETH", to: "50,000 CAFE" },
      },
    ];

    const contaner = document.getElementById("actvtyTmelne");
    contaner.innerHTML = actvtes.map((actvty) => this.createActvtytem(actvty)).join("");
  }

  createActvtytem(actvty) {
    const date = new Date(actvty.tmestamp);
    const formattedDate = date.toLocaleDateString("pt-BR");
    const formattedTme = date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `
            <div class="tmelne-tem">
                <div class="tmelne-marker">
                    <i class="bi bi-${this.getActvtycon(actvty.type)}"></i>
                </div>
                <div class="tmelne-content">
                    <div class="tmelne-header">
                        <h4>${actvty.ttle}</h4>
                        <span class="tmelne-date">${formattedDate} às ${formattedTme}</span>
                    </div>
                    <p class="tmelne-descrpton">${actvty.descrpton}</p>
                    <div class="tmelne-detals">
                        ${Object.entries(actvty.detals)
                          .map(([key, value]) => `<span class="detal-tem"><strong>${key}:</strong> ${value}</span>`)
                          .join("")}
                    </div>
                </div>
            </div>
        `;
  }

  async loadAchevements() {
    const achevements = [
      {
        d: 1,
        name: "Prmero Token",
        descrpton: "Crou seu prmero token",
        con: "trophy",
        earned: true,
        date: "2024-01-15",
      },
      {
        d: 2,
        name: "Token Popular",
        descrpton: "Token com mas de 1000 holders",
        con: "users",
        earned: true,
        date: "2024-01-18",
      },
      {
        d: 3,
        name: "Volume Mlonro",
        descrpton: "Atngu $1M em volume total",
        con: "chart-lne",
        earned: true,
        date: "2024-01-20",
      },
      {
        d: 4,
        name: "Coleconador NFT",
        descrpton: "Crou 5 colees NFT",
        con: "mages",
        earned: false,
        progress: 60,
      },
      {
        d: 5,
        name: "DeF Master",
        descrpton: "mplementou 10 contratos DeF",
        con: "cons",
        earned: false,
        progress: 30,
      },
    ];

    const contaner = document.getElementById("achevementsGrd");
    contaner.innerHTML = achevements.map((achevement) => this.createAchevementCard(achevement)).join("");
  }

  createAchevementCard(achevement) {
    return `
            <div class="achevement-card ${achevement.earned ? "earned" : "locked"}">
                <div class="achevement-con">
                    <i class="bi bi-${achevement.con}"></i>
                </div>
                <div class="achevement-content">
                    <h3>${achevement.name}</h3>
                    <p>${achevement.descrpton}</p>
                    ${
                      achevement.earned
                        ? `<span class="achevement-date">Conqustado em ${this.formatDate(achevement.date)}</span>`
                        : `<div class="achevement-progress">
                            <div class="progress">
                                <div class="progress-bar" style="width: ${achevement.progress}%"></div>
                            </div>
                            <span class="progress-text">${achevement.progress}%</span>
                        </div>`
                    }
                </div>
            </div>
        `;
  }

  flterUserTokens() {
    // mplementar fltros de tokens
    const statusFlter = document.getElementById("tokenStatusFlter").value;
    const typeFlter = document.getElementById("tokenTypeFlter").value;
    const searchTerm = document.getElementById("tokenSearch").value.toLowerCase();

    // Lgca de fltro sera mplementada aqu
    console.log("Fltrando tokens:", { statusFlter, typeFlter, searchTerm });
  }

  flterActvty() {
    // mplementar fltros de atvdade
    const typeFlter = document.getElementById("actvtyTypeFlter").value;
    const dateFlter = document.getElementById("actvtyDateFlter").value;

    console.log("Fltrando atvdades:", { typeFlter, dateFlter });
  }

  openEdtModal() {
    // Preencher formulro com dados atuas
    document.getElementById("edtName").value = this.userData.name;
    document.getElementById("edtUsername").value = this.userData.username;
    document.getElementById("edtBo").value = this.userData.bo;
    document.getElementById("edtWebste").value = this.userData.webste;
    document.getElementById("edtLocaton").value = this.userData.locaton;

    document.getElementById("edtProfleModal").style.display = "flex";
  }

  closeEdtModal() {
    document.getElementById("edtProfleModal").style.display = "none";
  }

  async saveProfle() {
    const formData = {
      name: document.getElementById("edtName").value,
      username: document.getElementById("edtUsername").value,
      bo: document.getElementById("edtBo").value,
      webste: document.getElementById("edtWebste").value,
      locaton: document.getElementById("edtLocaton").value,
    };

    try {
      // Smular salvamento
      await this.delay(1000);

      // Atualzar dados locas
      Object.assign(this.userData, formData);
      this.loadUserData();

      this.closeEdtModal();
      this.showNotfcaton("Perfl atualzado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao salvar perfl:", error);
      this.showNotfcaton("Erro ao salvar perfl", "error");
    }
  }

  shareProfle() {
    const profleUrl = `${window.location.origin}/profle/${this.userData.username}`;

    if (navigator.share) {
      navigator.share({
        ttle: `Perfl de ${this.userData.name}`,
        text: this.userData.bo,
        url: profleUrl,
      });
    } else if (window.copyToClipboard) {
      window.copyToClipboard(profleUrl);
      this.showNotfcaton("Link copiado!", "success");
    } else {
      // Fallback para copiar URL
      navigator.clipboard
        .writeText(profleUrl)
        .then(() => this.showNotfcaton("Link copiado!", "success"))
        .catch(() => this.showNotfcaton("Erro ao copiar", "error"));
    }
  }

  clearData() {
    if (confirm("Deseja limpar todos os dados e recarregar o perfil?")) {
      this.loadUserData();
      this.loadOvervewData();
      if (document.getElementById("personalInfoForm")) {
        document.getElementById("personalInfoForm").reset();
      }
      this.showNotfcaton("Dados recarregados com sucesso!", "success");
    }
  }

  changeAvatar() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e2) => {
          this.userData.avatar = e2.target.result;
          document.getElementById("profleAvatar").src = e2.target.result;
          this.showNotfcaton("Avatar atualzado!", "success");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  changeBanner() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e2) => {
          this.userData.banner = e2.target.result;
          document.querySelector(".profle-banner").style.backgroundImage = `url(${e2.target.result})`;
          this.showNotfcaton("Banner atualzado!", "success");
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  async savePersonalnfo() {
    try {
      await this.delay(1000);
      this.showNotfcaton("nformaes pessoas salvas!", "success");
    } catch (error) {
      this.showNotfcaton("Erro ao salvar nformaes", "error");
    }
  }

  async saveNotfcatonPreferences() {
    try {
      await this.delay(1000);
      this.showNotfcaton("Preferncas de notfcao salvas!", "success");
    } catch (error) {
      this.showNotfcaton("Erro ao salvar preferncas", "error");
    }
  }

  openPasswordModal() {
    document.getElementById("changePasswordModal").style.display = "flex";
  }

  closePasswordModal() {
    document.getElementById("changePasswordModal").style.display = "none";
    document.getElementById("changePasswordForm").reset();
  }

  async changePassword() {
    const unusedCurrentPassword = document.getElementById("currentPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confrmPassword = document.getElementById("confrmPassword").value;

    if (newPassword !== confrmPassword) {
      this.showNotfcaton("As senhas no concdem", "error");
      return;
    }

    try {
      await this.delay(1000);
      this.closePasswordModal();
      this.showNotfcaton("Senha alterada com sucesso!", "success");
    } catch (error) {
      this.showNotfcaton("Erro ao alterar senha", "error");
    }
  }

  enable2FA() {
    this.showNotfcaton("Funconaldade 2FA em desenvolvmento", "info");
  }

  downloadUserData() {
    const userData = {
      profle: this.userData,
      tokens: [], // Sera preenchdo com dados reas
      actvtes: [], // Sera preenchdo com dados reas
      achevements: [], // Sera preenchdo com dados reas
    };

    const blob = new Blob([JSON.stringify(userData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tokencafe_user_data_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotfcaton("Dados baxados com sucesso!", "success");
  }

  closeAllModals() {
    this.closeEdtModal();
    this.closePasswordModal();
  }

  getActivityIcon(type) {
    const icons = {
      create: "plus-circle",
      transfer: "arrow-left-right",
      trade: "graph-up",
      stake: "lock",
    };
    return icons[type] || "circle";
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }

  formatDate(dateStrng) {
    return new Date(dateStrng).toLocaleDateString("pt-BR");
  }

  showNotfcaton(message, type = "info") {
    // Integração com sistema global
    if (window.notify) {
      window.notify(message, type);
      return;
    }

    // Fallback simples
    const toast = document.createElement("div");
    toast.className = `toast align-items-center text-white bg-${type === "error" ? "danger" : "success"} border-0 position-fixed bottom-0 end-0 m-3`;
    toast.style.zIndex = "9999";
    toast.innerHTML = `
      <div class="d-flex">
        <div class="toast-body">
          ${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    `;
    document.body.appendChild(toast);

    if (typeof bootstrap !== "undefined" && bootstrap.Toast) {
      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
      toast.addEventListener("hidden.bs.toast", () => {
        document.body.removeChild(toast);
      });
    } else {
      toast.style.display = "block";
      setTimeout(() => toast.remove(), 3000);
    }
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ncalzar quando o DOM estver carregado
document.addEventListener("DOMContentLoaded", () => {
  new UserProfle();
});
