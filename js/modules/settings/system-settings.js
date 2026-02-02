import { checkConnectivity } from "../../shared/components/api-status.js";

/**
 * Sstema de Confguraes do TokenCafe
 * Gerenca todas as confguraes e preferncas do sstema
 */
class SystemSettngs {
  constructor() {
    this.settngs = {};
    this.defaultSettngs = this.getDefaultSettngs();
    this.pendngChanges = new Set();
    this.init();
  }

  /**
   * ncalza o sstema de confguraes
   */
  init() {
    this.loadSettngs();
    this.setupEventLsteners();
    this.setupTabs();
    this.setupSubTabs();
    this.loadNetworks();
    this.loadRPCProvders();
    this.applyCurrentSettngs();
  }

  /**
   * Confguraes padro do sstema
   */
  getDefaultSettngs() {
    return {
      // Geral
      language: "pt-BR",
      tmezone: "Amerca/Sao_Paulo",
      currency: "USD",
      autoSave: true,
      confrmActons: true,
      showTooltps: true,

      // Aparnca
      theme: "light",
      sdebarWdth: 280,
      compactMode: false,
      sdebarCollapse: false,
      prmaryColor: "#6366f1",
      secondaryColor: "#8b5cf6",
      successColor: "#10b981",
      errorColor: "#ef4444",

      // Notfcaes
      systemNotfcatons: true,
      errorNotfcatons: true,
      tokenCreated: true,
      tokenTransfer: true,
      prceAlerts: false,
      browserNotfcatons: true,
      emalNotfcatons: true,
      notfcatonSound: "default",

      // Segurana
      sessonTmeout: 30,
      requrePassword: true,
      twoFactorAuth: false,
      analytcsTrackng: false,
      crashReports: true,
      autoBackup: true,
      backupFrequency: "daly",

      // Blockchan
      gasPrce: 20,
      gasLmt: 21000,
      autoGasEstmate: true,

      // Avanado
      debugMode: false,
      testnetMode: false,
      cacheSze: 100,
      maxConnectons: 10,
      preloadData: true,
    };
  }

  /**
   * Confgura os event lsteners
   */
  setupEventLsteners() {
    // Tabs de navegao
    document.querySelectorAll(".settings-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => this.swtchTab(e.target.dataset.tab));
    });

    // Botes prncpas
    document.getElementById("saveAllSettingsBtn")?.addEventListener("click", () => this.saveAllSettngs());
    document.getElementById("resetSettingsBtn")?.addEventListener("click", () => this.resetToDefaults());
    document.getElementById("btnCheckSystemStatus")?.addEventListener("click", () => this.checkSystemStatus());

    // Confguraes geras
    this.setupGeneralLsteners();

    // Confguraes de aparnca
    this.setupAppearanceLsteners();

    // Confguraes de notfcaes
    this.setupNotfcatonLsteners();

    // Confguraes de segurana
    this.setupSecurtyLsteners();

    // Confguraes de blockchan
    this.setupBlockchanLsteners();

    // Confguraes avanadas
    this.setupAdvancedLsteners();

    // Modal de confrmao
    this.setupConfrmModal();
  }

  /**
   * Confgura lsteners das confguraes geras
   */
  setupGeneralLsteners() {
    const generalnputs = ["language", "tmezone", "currency", "autoSave", "confrmActons", "showTooltps"];

    generalnputs.forEach((d) => {
      const element = document.getElementById(d);
      if (element) {
        element.addEventListener("change", () => this.updateSettng(d, this.getElementValue(element)));
      }
    });
  }

  /**
   * Confgura lsteners das confguraes de aparnca
   */
  setupAppearanceLsteners() {
    // Seletor de tema
    document.querySelectorAll(".theme-option").forEach((opton) => {
      opton.addEventListener("click", () => this.selectTheme(opton.dataset.theme));
    });

    // Largura da sdebar
    const sdebarWdth = document.getElementById("sidebarWidth");
    sdebarWdth?.addEventListener("input", (e) => {
      const value = parseInt(e.target.value, 10);
      document.querySelector(".range-value").textContent = `${value}px`;
      this.updateSettng("sdebarWdth", value);
    });
    if (sdebarWdth) {
      sdebarWdth.addEventListener("input", (e) => {
        const value = e.target.value;
        document.querySelector(".range-value").textContent = `${value}px`;
        this.updateSettng("sdebarWdth", parseInt(value, 10));
      });
    }

    // Checkboxes de layout
    ["compactMode", "sdebarCollapse"].forEach((d) => {
      const element = document.getElementById(d);
      if (element) {
        element.addEventListener("change", () => this.updateSettng(d, element.checked));
      }
    });

    // Color pckers
    ["prmaryColor", "secondaryColor", "successColor", "errorColor"].forEach((d) => {
      const element = document.getElementById(d);
      if (element) {
        element.addEventListener("change", () => this.updateSettng(d, element.value));
      }
    });
  }

  /**
   * Confgura lsteners das confguraes de notfcaes
   */
  setupNotfcatonLsteners() {
    const notfcatonSettngs = ["systemNotfcatons", "errorNotfcatons", "tokenCreated", "tokenTransfer", "prceAlerts", "browserNotfcatons", "emalNotfcatons", "notfcatonSound"];

    notfcatonSettngs.forEach((d) => {
      const element = document.getElementById(d);
      if (element) {
        element.addEventListener("change", () => this.updateSettng(d, this.getElementValue(element)));
      }
    });
  }

  /**
   * Confgura lsteners das confguraes de segurana
   */
  setupSecurtyLsteners() {
    const securtySettngs = ["sessonTmeout", "requrePassword", "twoFactorAuth", "analytcsTrackng", "crashReports", "autoBackup", "backupFrequency"];

    securtySettngs.forEach((d) => {
      const element = document.getElementById(d);
      if (element) {
        element.addEventListener("change", () => this.updateSettng(d, this.getElementValue(element)));
      }
    });

    // Botes de backup
    document.getElementById("createBackupBtn")?.addEventListener("click", () => this.createBackup());
    document.getElementById("restoreBackupBtn")?.addEventListener("click", () => this.restoreBackup());
  }

  /**
   * Confgura lsteners das confguraes de blockchan
   */
  setupBlockchanLsteners() {
    const blockchanSettngs = ["gasPrce", "gasLmt", "autoGasEstmate"];

    blockchanSettngs.forEach((d) => {
      const element = document.getElementById(d);
      if (element) {
        element.addEventListener("change", () => this.updateSettng(d, this.getElementValue(element)));
      }
    });

    document.getElementById("addNetworkBtn")?.addEventListener("click", () => this.addNetwork());
  }

  /**
   * Confgura lsteners das confguraes avanadas
   */
  setupAdvancedLsteners() {
    const advancedSettngs = ["debugMode", "testnetMode", "cacheSze", "maxConnectons", "preloadData"];

    advancedSettngs.forEach((d) => {
      const element = document.getElementById(d);
      if (element) {
        element.addEventListener("change", () => this.updateSettng(d, this.getElementValue(element)));
      }
    });

    // Botes de aes avanadas
    document.getElementById("clearCacheBtn")?.addEventListener("click", () => this.clearCache());
    document.getElementById("exportSettingsBtn")?.addEventListener("click", () => this.exportSettngs());
    document.getElementById("importSettingsBtn")?.addEventListener("click", () => this.mportSettngs());
  }

  /**
   * Confgura o modal de confrmao
   */
  setupConfrmModal() {
    const unusedModal = document.getElementById("confirmModal");
    const closeBtn = document.getElementById("closeConfirmModal");
    const cancelBtn = document.getElementById("cancelConfirmBtn");
    const confrmBtn = document.getElementById("confirmActionBtn");

    [closeBtn, cancelBtn].forEach((btn) => {
      btn?.addEventListener("click", () => this.closeConfrmModal());
    });

    confrmBtn?.addEventListener("click", () => this.executeConfrmedActon());
  }

  /**
   * Confgura o sstema de tabs
   */
  setupTabs() {
    // Verifica se há um parâmetro de tab na URL
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");

    if (tabParam && document.querySelector(`[data-tab="${tabParam}"]`)) {
      this.swtchTab(tabParam);
    } else {
      // Atva a prmera tab por padro
      this.swtchTab("general");
    }
  }

  /**
   * Troca de tab atva
   */
  swtchTab(tabName) {
    // Remove classe atva de todas as tabs
    document.querySelectorAll(".settings-tab").forEach((tab) => {
      tab.classList.remove("active");
    });
    document.querySelectorAll(".settings-section").forEach((secton) => {
      secton.classList.remove("active");
    });

    // Atva a tab seleconada
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add("active");
    document.getElementById(tabName)?.classList.add("active");
  }

  /**
   * Confgura alternncia das sub-abas internas (nav-pills)
   */
  setupSubTabs() {
    document.querySelectorAll(".substep-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const target = e.currentTarget;
        const subtab = target.getAttribute("data-subtab");
        const section = target.closest(".settings-section");
        if (!section || !subtab) return;

        // Alterna estado visual das sub-abas
        section.querySelectorAll(".substep-tab").forEach((t) => t.classList.remove("active"));
        target.classList.add("active");

        // Exibe o painel correspondente
        section.querySelectorAll(".substep-pane").forEach((pane) => {
          if (pane.getAttribute("data-subtab") === subtab) {
            pane.classList.add("active");
          } else {
            pane.classList.remove("active");
          }
        });
      });
    });
  }

  /**
   * Carrega as confguraes salvas
   */
  loadSettngs() {
    try {
      const saved = localStorage.getItem("tokencafe_settngs");
      this.settngs = saved ? { ...this.defaultSettngs, ...JSON.parse(saved) } : { ...this.defaultSettngs };
    } catch (error) {
      console.error("Erro ao carregar confguraes:", error);
      this.settngs = { ...this.defaultSettngs };
    }
  }

  /**
   * Aplca as confguraes atuas na nterface
   */
  applyCurrentSettngs() {
    const idMap = {
      sdebarWdth: "sidebarWidth",
      prmaryColor: "primaryColor",
      tmezone: "timezone",
      confrmActons: "confirmActions",
      showTooltps: "showTooltips",
      secondaryColor: "secondaryColor",
      successColor: "successColor",
      errorColor: "errorColor",
      systemNotfcatons: "systemNotifications",
    };

    Object.keys(this.settngs).forEach((key) => {
      const elementId = idMap[key] || key;
      const element = document.getElementById(elementId);
      if (element) {
        this.setElementValue(element, this.settngs[key]);
      }
    });

    // Aplca tema
    this.applyTheme(this.settngs.theme);

    // Aplca largura da sdebar
    const sdebarWdth = document.getElementById("sidebarWidth");
    if (sdebarWdth) {
      document.querySelector(".range-value").textContent = `${this.settngs.sdebarWdth}px`;
    }

    // Aplca seleo de tema vsual
    document.querySelectorAll(".theme-option").forEach((opton) => {
      opton.classList.toggle("active", opton.dataset.theme === this.settngs.theme);
    });
  }

  /**
   * Atualza uma configuracao especfca
   */
  updateSettng(key, value) {
    this.settngs[key] = value;
    this.pendngChanges.add(key);

    // Auto-save se habltado
    if (this.settngs.autoSave) {
      this.saveSettngs();
    }

    // Aplca mudanas medatas
    this.applySettngChange(key, value);
  }

  /**
   * Aplca mudanas especfcas medatamente
   */
  applySettngChange(key, value) {
    switch (key) {
      case "theme":
        this.applyTheme(value);
        break;
      case "sdebarWdth":
        this.applySdebarWdth(value);
        break;
      case "compactMode":
        this.applyCompactMode(value);
        break;
      case "language":
        this.applyLanguage(value);
        break;
    }
  }

  /**
   * Aplca o tema seleconado
   */
  applyTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/g, "");
    document.body.classList.add(`theme-${theme}`);

    if (theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.classList.add(prefersDark ? "theme-dark" : "theme-light");
    }
  }

  /**
   * Aplca largura da sdebar
   */
  applySdebarWdth(wdth) {
    document.documentElement.style.setProperty("--sdebar-wdth", `${wdth}px`);
  }

  /**
   * Aplca modo compacto
   */
  applyCompactMode(compact) {
    document.body.classList.toggle("compact-mode", compact);
  }

  /**
   * Aplca doma
   */
  applyLanguage(language) {
    document.documentElement.lang = language;
    // Aqu voc mplementara a lgca de nternaconalzao
  }

  /**
   * Selecona um tema
   */
  selectTheme(theme) {
    document.querySelectorAll(".theme-option").forEach((opton) => {
      opton.classList.remove("active");
    });
    document.querySelector(`[data-theme="${theme}"]`).classList.add("active");
    this.updateSettng("theme", theme);
  }

  /**
   * Salva todas as confguraes
   */
  saveAllSettngs() {
    this.saveSettngs();
    this.showNotfcaton("Confguraes salvas com sucesso!", "success");
    this.pendngChanges.clear();
  }

  /**
   * Salva as confguraes no localStorage
   */
  saveSettngs() {
    try {
      localStorage.setItem("tokencafe_settngs", JSON.stringify(this.settngs));
    } catch (error) {
      console.error("Erro ao salvar confguraes:", error);
      this.showNotfcaton("Erro ao salvar confguraes", "error");
    }
  }

  /**
   * Restaura confguraes padro
   */
  resetToDefaults() {
    this.showConfrmModal("Restaurar Confguraes Padro", "Tem certeza que deseja restaurar todas as confguraes para os valores padro? Esta ao no pode ser desfeta.", () => {
      this.settngs = { ...this.defaultSettngs };
      this.applyCurrentSettngs();
      this.saveSettngs();
      this.showNotfcaton("Confguraes restauradas para o padro", "success");
      this.pendngChanges.clear();
    });
  }

  /**
   * Limpar dados (alias para resetToDefaults ou recarregar)
   * Neste contexto, optamos por recarregar as configurações salvas (descartar alterações não salvas)
   * ou restaurar padrões se o usuário desejar um reset completo.
   * Para atender ao pedido "limpar dados", vamos recarregar o estado salvo.
   */
  clearData() {
    this.showConfrmModal("Limpar Dados", "Deseja descartar todas as alterações não salvas e recarregar as configurações atuais?", () => {
      this.loadSettngs();
      this.applyCurrentSettngs();
      this.showNotfcaton("Dados recarregados com sucesso!", "success");
      this.pendngChanges.clear();
    });
  }

  /**
   * Carrega redes blockchan
   */
  loadNetworks() {
    const networkLst = document.getElementById("networkLst");
    if (!networkLst) return;

    const networks = [
      {
        d: "ethereum",
        name: "Ethereum Mannet",
        rpc: "https://mannet.nfura.o/v3/",
        actve: true,
      },
      {
        d: "polygon",
        name: "Polygon",
        rpc: "https://polygon-rpc.com/",
        actve: true,
      },
      {
        d: "bsc",
        name: "Bnance Smart Chan",
        rpc: "https://bsc-dataseed.bnance.org/",
        actve: false,
      },
      {
        d: "avalanche",
        name: "Avalanche",
        rpc: "https://ap.avax.network/ext/bc/C/rpc",
        actve: false,
      },
    ];

    networkLst.innerHTML = networks
      .map(
        (network) => `
            <div class="network-item">
                <div class="network-info">
                    <div class="network-name">${network.name}</div>
                    <div class="network-rpc">${network.rpc}</div>
                </div>
                <div class="network-actions">
                    <label class="switch">
                        <input type="checkbox" ${network.actve ? "checked" : ""} 
                               onchange="systemSettngs.toggleNetwork('${network.d}', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <button class="btn-icon" onclick="systemSettngs.edtNetwork('${network.d}')">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn-icon" onclick="systemSettngs.removeNetwork('${network.d}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  }

  /**
   * Carrega provedores RPC
   */
  loadRPCProvders() {
    const rpcProvders = document.getElementById("rpcProvders");
    if (!rpcProvders) return;

    const provders = [
      { name: "nfura", status: "connected", latency: "45ms" },
      { name: "Alchemy", status: "connected", latency: "52ms" },
      { name: "QuckNode", status: "dsconnected", latency: "--" },
    ];

    rpcProvders.innerHTML = provders
      .map(
        (provder) => `
            <div class="rpc-provider">
                <div class="provider-info">
                    <div class="provider-name">${provder.name}</div>
                    <div class="provider-status ${provder.status}">${provder.status}</div>
                </div>
                <div class="provider-latency">${provder.latency}</div>
                <button class="btn-icon" onclick="systemSettngs.testRPCProvder('${provder.name}')">
                    <i class="bi bi-arrow-repeat"></i>
                </button>
            </div>
        `,
      )
      .join("");
  }

  /**
   * Cra backup das confguraes
   */
  createBackup() {
    const backup = {
      settngs: this.settngs,
      tmestamp: new Date().toISOString(),
      version: "1.0.0",
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tokencafe-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showNotfcaton("Backup crado com sucesso!", "success");
  }

  /**
   * Restaura backup das confguraes
   */
  restoreBackup() {
    const nput = document.createElement("input");
    nput.type = "file";
    nput.accept = ".json";
    nput.onchange = (e) => {
      const fle = e.target.files[0];
      if (fle) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const backup = JSON.parse(e.target.result);
            if (backup.settngs) {
              this.settngs = { ...this.defaultSettngs, ...backup.settngs };
              this.applyCurrentSettngs();
              this.saveSettngs();
              this.showNotfcaton("Backup restaurado com sucesso!", "success");
            } else {
              throw new Error("Formato de backup nvldo");
            }
          } catch (error) {
            this.showNotfcaton("Erro ao restaurar backup: " + error.message, "error");
          }
        };
        reader.readAsText(fle);
      }
    };
    nput.click();
  }

  /**
   * Lmpa o cache do sstema
   */
  clearCache() {
    this.showConfrmModal("Lmpar Cache", "Tem certeza que deseja lmpar todo o cache? sso pode afetar a performance temporaramente.", () => {
      // Smula lmpeza de cache
      setTimeout(() => {
        this.showNotfcaton("Cache lmpo com sucesso!", "success");
      }, 1000);
    });
  }

  /**
   * Exporta confguraes
   */
  exportSettngs() {
    const blob = new Blob([JSON.stringify(this.settngs, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tokencafe-settngs.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * mporta confguraes
   */
  mportSettngs() {
    const nput = document.createElement("input");
    nput.type = "file";
    nput.accept = ".json";
    nput.onchange = (e) => {
      const fle = e.target.files[0];
      if (fle) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const mported = JSON.parse(e.target.result);
            this.settngs = { ...this.defaultSettngs, ...mported };
            this.applyCurrentSettngs();
            this.saveSettngs();
            this.showNotfcaton("Confguraes mportadas com sucesso!", "success");
          } catch (error) {
            this.showNotfcaton("Erro ao mportar confguraes", "error");
          }
        };
        reader.readAsText(fle);
      }
    };
    nput.click();
  }

  /**
   * Obtm o valor de um elemento
   */
  getElementValue(element) {
    if (element.type === "checkbox") {
      return element.checked;
    } else if (element.type === "number" || element.type === "range") {
      return parseInt(element.value);
    } else {
      return element.value;
    }
  }

  /**
   * Defne o valor de um elemento
   */
  setElementValue(element, value) {
    if (element.type === "checkbox") {
      element.checked = value;
    } else {
      element.value = value;
    }
  }

  /**
   * Mostra modal de confrmao
   */
  showConfrmModal(ttle, message, callback) {
    document.getElementById("confirmTitle").textContent = ttle;
    document.getElementById("confirmMessage").textContent = message;
    document.getElementById("confirmModal").classList.add("active");
    this.confrmCallback = callback;
  }

  /**
   * Fecha modal de confrmao
   */
  closeConfrmModal() {
    document.getElementById("confirmModal").classList.remove("active");
    this.confrmCallback = null;
  }

  /**
   * Executa ao confrmada
   */
  executeConfrmedActon() {
    if (this.confrmCallback) {
      this.confrmCallback();
    }
    this.closeConfrmModal();
  }

  /**
   * Verifica status do sistema
   */
  async checkSystemStatus() {
    const systemResponse = new window.SystemResponse();

    // Initial loading state
    if (window.showLoading) window.showLoading("Verificando status do sistema...");

    try {
      const results = {
        backend: { status: "pending", label: "API Backend" },
        blockchain: { status: "pending", label: "Blockchain (MetaMask)" },
        internet: { status: "pending", label: "Conexão Internet" },
      };

      // 1. Check Internet
      results.internet.status = navigator.onLine ? "ok" : "error";

      // 2. Check Backend
      const isBackendOk = await checkConnectivity(false);
      results.backend.status = isBackendOk ? "ok" : "error";

      // 3. Check Blockchain
      if (window.ethereum) {
        results.blockchain.status = "ok";
        try {
          // Just check if we can talk to it
          await window.ethereum.request({ method: "eth_chainId" });
        } catch (e) {
          // If user rejects or locked, it's still 'warning' or 'ok' presence wise
          results.blockchain.status = "warning";
        }
      } else {
        results.blockchain.status = "error";
      }

      // Build report
      const allOk = Object.values(results).every((r) => r.status === "ok");
      const hasError = Object.values(results).some((r) => r.status === "error");

      let htmlContent = '<div class="text-start mt-3"><ul class="list-group list-group-flush bg-transparent">';
      // Itera apenas pelos valores para evitar variável não utilizada
      for (const info of Object.values(results)) {
        let icon = "bi-check-circle-fill text-success";
        let color = "text-light";
        if (info.status === "error") {
          icon = "bi-x-circle-fill text-danger";
          color = "text-danger";
        }
        if (info.status === "warning") {
          icon = "bi-exclamation-triangle-fill text-warning";
          color = "text-warning";
        }

        htmlContent += `
                <li class="list-group-item d-flex justify-content-between align-items-center bg-transparent border-secondary ${color}">
                    <span>${info.label}</span>
                    <i class="bi ${icon} fs-5"></i>
                </li>`;
      }
      htmlContent += "</ul></div>";

      systemResponse.show({
        title: allOk ? "Sistema Operacional" : hasError ? "Problemas Detectados" : "Atenção Necessária",
        subtitle: allOk ? "Todos os sistemas estão funcionando normalmente." : "Verifique os detalhes abaixo.",
        icon: allOk ? "bi-hdd-network" : "bi-activity",
        htmlContent: htmlContent,
        badge: "Verificado em: " + new Date().toLocaleTimeString(),
        actions: ["clear"],
        onClear: () => {
          // Optional
        },
      });
    } catch (error) {
      console.error(error);
      if (window.notify) window.notify("Erro ao verificar status", "error");
    } finally {
      if (window.hideLoading) window.hideLoading();
    }
  }

  /**
   * Mostra notfcao na tela
   */
  showNotfcaton(message, type = "info") {
    // Integração com sistema global de notificações (Modal)
    if (window.notify) {
      window.notify(message, type);
      return;
    }

    // Fallback legado (caso window.notify não esteja carregado)
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

    // Tenta usar Bootstrap global
    if (typeof bootstrap !== "undefined" && bootstrap.Toast) {
      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
      toast.addEventListener("hidden.bs.toast", () => {
        document.body.removeChild(toast);
      });
    } else {
      // Fallback simples sem bootstrap js
      toast.style.display = "block";
      setTimeout(() => {
        toast.remove();
      }, 3000);
    }
  }

  // Mtodos para gerencamento de redes (placeholders)
  toggleNetwork(networkd, actve) {
    console.log(`Toggle network ${networkd}:`, actve);
  }

  edtNetwork(networkd) {
    console.log(`Edt network ${networkd}`);
  }

  removeNetwork(networkd) {
    console.log(`Remove network ${networkd}`);
  }

  addNetwork() {
    console.log("Add new network");
  }

  testRPCProvder(provderName) {
    console.log(`Test RPC provder ${provderName}`);
  }
}

// ncalza o sstema de confguraes quando a pgna carrega
let unusedSystemSettngs;
document.addEventListener("DOMContentLoaded", () => {
  unusedSystemSettngs = new SystemSettngs();
});

// Exporta para uso global
window.SystemSettngs = SystemSettngs;
