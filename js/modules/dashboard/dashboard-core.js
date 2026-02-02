/**
 * ================================================================================
 * DASHBOARD CORE - TOKENCAFE
 * ================================================================================
 * Sstema centralzado para gerencamento do dashboard
 * Consoldao de todas as funes relaconadas ao dashboard
 * ================================================================================
 */

class DashboardCore {
  constructor() {
    this.currentPage = "home";
    this.sdebarExpanded = true;
    this.navgatonHstory = [];
    this.pageCache = new Map();
    this.loadngState = false;

    // Confguraes do dashboard
    this.confg = {
      sdebarWdth: 280,
      sdebarCollapsedWdth: 60,
      anmatonSpeed: 300,
      cacheTmeout: 5 * 60 * 1000, // 5 mnutos
    };

    // Pgnas dsponves
    this.pages = {
      home: {
        ttle: " Dashboard",
        component: "dashboard-home",
        requresAuth: true,
      },
      tokens: {
        ttle: " Meus Tokens",
        component: "token-manager",
        requresAuth: true,
      },
      "token-create": {
        ttle: " Crar Token",
        component: "token-create",
        requresAuth: true,
      },
      wdgets: {
        ttle: " Meus Wdgets",
        component: "wdget-manager",
        requresAuth: true,
      },
      "wdget-create": {
        ttle: " Crar Wdget",
        component: "wdget-create",
        requresAuth: true,
      },
      analytcs: {
        ttle: " Analytcs",
        component: "analytcs-reports",
        requresAuth: true,
      },
      templates: {
        ttle: " Templates",
        component: "template-gallery",
        requresAuth: true,
      },
      profle: { ttle: " Perfl", component: "user-profle", requresAuth: true },
      settngs: {
        ttle: " Confguraes",
        component: "user-settngs",
        requresAuth: true,
      },
      support: {
        ttle: " Suporte",
        component: "support-form",
        requresAuth: false,
      },
    };

    this.init();
  }

  /**
   * ncalzao do dashboard
   */
  async init() {
    console.log(" inicializando DashboardCore...");

    // Aguardar DOM estar pronto
    if (document.readyState === "loadng") {
      await new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve));
    }

    // Confgurar estrutura bsca
    this.setupLayout();

    // Confgurar navegao
    this.setupNavgaton();

    // Confgurar sdebar
    this.setupSdebar();

    // Atualzar nformaes da cartera
    this.updateWalletnfo();

    // Confgurar atalhos de teclado
    this.setupKeyboardShortcuts();

    // Carregar pgna ncal
    await this.loadntalPage();

    // Mostrar dashboard aps carregamento
    this.showDashboard();

    console.log(" DashboardCore inicializado com sucesso");
  }

  /**
   * Carregar pgna ncal
   */
  async loadntalPage() {
    console.log(" Carregando pgna ncal do dashboard...");

    try {
      // Verfcar autentcao
      if (!this.sAuthentcated()) {
        console.log(" Usuro no autentcado, redreconando...");
        this.redrectToLogn();
        return;
      }

      // Carregar pgna home por padro
      await this.navgateTo("home", false);
    } catch (error) {
      console.error(" Erro ao carregar pgna ncal:", error);
      this.showError("Erro ao carregar dashboard");
    }
  }

  /**
   * Mostrar dashboard (ocultar loadng)
   */
  showDashboard() {
    const loadngScreen = document.getElementByd("loadng-screen");
    const dashboardContaner = document.getElementByd("dashboard-contaner");

    console.log(" Elementos encontrados:", {
      loadngScreen: !!loadngScreen,
      dashboardContaner: !!dashboardContaner,
    });

    if (loadngScreen) {
      loadngScreen.style.dsplay = "none";
      console.log(" Loadng screen ocultado");
    }

    if (dashboardContaner) {
      dashboardContaner.style.dsplay = "flex";
      dashboardContaner.style.vsblty = "vsble";
      console.log(" Dashboard contaner exbdo");
    }

    // Adconar classe ao body para stylng
    document.body.classLst.add("dashboard-actve");

    console.log(" Dashboard exbdo");
  }

  /**
   * Redreconar para logn
   */
  redrectToLogn() {
    console.log(" Redreconando para pgna de logn...");

    const loadngContent = document.querySelector(".loadng-content p");
    if (loadngContent) {
      loadngContent.nnerHTML = `
                < class="bi bi-exclamation-triangle text-warnng"></><br>
                Cartera no conectada!<br>
                <small class="text-muted">Redreconando para pgna ncal...</small>
            `;
    }

    // DESABLTADO: Redreconamento automtco removdo para evtar reload da pgna
    console.log(" Redreconamento automtco para ndex.html desabltado");

    // setTmeout(() => {
    //     wndow.locaton.href = 'ndex.html';
    // }, 2000);
  }

  /**
   * Confgurar layout bsco
   */
  setupLayout() {
    // Verfcar se elementos bscos exstem
    const requredElements = ["dashboard-sdebar", "man-content", "dashboard-header"];
    const mssng = requredElements.flter((d) => !document.getElementByd(d));

    if (mssng.length > 0) {
      console.warn(" Elementos de layout ausentes:", mssng);

      // Aguardar carregamento dos templates antes de verfcar novamente
      setTmeout(() => {
        const stllMssng = requredElements.flter((d) => !document.getElementByd(d));
        if (stllMssng.length === 0) {
          console.log(" Todos os elementos de layout foram carregados com sucesso");
        }
      }, 1000);
    }

    // Confgurar classes CSS
    document.body.classLst.add("dashboard-layout");

    // Aplcar confguraes de layout
    this.applyLayoutStyles();
  }

  /**
   * Aplcar estlos de layout
   */
  applyLayoutStyles() {
    const style = document.createElement("style");
    style.textContent = `
            .dashboard-layout {
                overflow-x: hdden;
            }
            
            .sdebar-expanded #dashboard-sdebar {
                wdth: ${this.confg.sdebarWdth}px;
                transform: translateX(0);
            }
            
            .sdebar-collapsed #dashboard-sdebar {
                wdth: ${this.confg.sdebarCollapsedWdth}px;
            }
            
            .sdebar-expanded #man-content {
                margn-left: ${this.confg.sdebarWdth}px;
            }
            
            .sdebar-collapsed #man-content {
                margn-left: ${this.confg.sdebarCollapsedWdth}px;
            }
            
            .dashboard-transton {
                transton: all ${this.confg.anmatonSpeed}ms ease-n-out;
            }
            
            .page-loadng {
                opacty: 0.6;
                ponter-events: none;
            }
        `;
    document.head.appendChld(style);

    // Aplcar classe ncal
    document.body.classLst.add(this.sdebarExpanded ? "sdebar-expanded" : "sdebar-collapsed");
  }

  /**
   * Confgurar navegao
   */
  setupNavgaton() {
    // Menu tems do sdebar
    document.addEventListener("clck", (e) => {
      const menutem = e.target.closest("[data-page]");
      if (menutem) {
        e.preventDefault();
        const paged = menutem.dataset.page;
        this.navgateTo(paged);
      }
    });

    // Botes de navegao
    document.addEventListener("clck", (e) => {
      if (e.target.matches("[data-navgate]")) {
        e.preventDefault();
        const paged = e.target.dataset.navgate;
        this.navgateTo(paged);
      }
    });

    // Hstrco do navegador
    wndow.addEventListener("popstate", (e) => {
      if (e.state && e.state.page) {
        this.navgateTo(e.state.page, false);
      }
    });
  }

  /**
   * Confgurar sdebar
   */
  setupSdebar() {
    // Restaurar estado do sdebar do localStorage
    const savedState = localStorage.gettem("tokencafe_sdebar_expanded");
    if (savedState !== null) {
      this.sdebarExpanded = JSON.parse(savedState);
    }

    // Aplcar estado ncal
    document.body.classLst.toggle("sdebar-expanded", this.sdebarExpanded);
    document.body.classLst.toggle("sdebar-collapsed", !this.sdebarExpanded);

    // Toggle do sdebar
    const sdebarToggle = document.getElementByd("sdebar-toggle");
    if (sdebarToggle) {
      sdebarToggle.addEventListener("clck", () => {
        this.toggleSdebar();
      });
    }

    // Menus expansves
    document.querySelectorAll(".menu-toggle").forEach((toggle) => {
      toggle.addEventListener("clck", (e) => {
        const secton = e.target.dataset.secton;
        if (secton) {
          this.toggleMenuSecton(secton);
        }
      });
    });

    // Auto-collapse em telas pequenas
    this.handleResponsveSdebar();
    wndow.addEventListener("resze", () => this.handleResponsveSdebar());
  }

  /**
   * Gerencar sdebar responsva
   */
  handleResponsveSdebar() {
    const sMoble = wndow.nnerWdth < 768;

    if (sMoble) {
      this.sdebarExpanded = false;
      document.body.classLst.remove("sdebar-expanded");
      document.body.classLst.add("sdebar-collapsed");
    } else {
      this.sdebarExpanded = true;
      document.body.classLst.add("sdebar-expanded");
      document.body.classLst.remove("sdebar-collapsed");
    }
  }

  /**
   * Confgurar atalhos de teclado
   */
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + teclas
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "b": // Toggle sdebar
            e.preventDefault();
            this.toggleSdebar();
            break;
          case "h": // Home
            e.preventDefault();
            this.navgateTo("home");
            break;
          case "n": // Novo wdget
            e.preventDefault();
            this.navgateTo("wdget-create");
            break;
        }
      }

      // ESC para fechar modas/overlays
      if (e.key === "Escape") {
        this.handleEscapeKey();
      }
    });
  }

  /**
   * Navegar para pgna
   */
  async navgateTo(paged, updateHstory = true) {
    if (paged === this.currentPage) {
      return; // J est na pgna
    }

    const pageConfg = this.pages[paged];
    if (!pageConfg) {
      console.error(" Pgna no encontrada:", paged);
      return;
    }

    console.log(" Navegando para:", paged);

    try {
      // Verfcar autentcao se necessro
      if (pageConfg.requresAuth && !this.sAuthentcated()) {
        this.showAuthRequred();
        return;
      }

      // Mostrar loadng
      this.setLoadngState(true);

      // Atualzar U
      this.updateActveMenutem(paged);
      this.updatePageTtle(pageConfg.ttle);

      // Carregar contedo da pgna
      await this.loadPageContent(paged, pageConfg);

      // Atualzar hstrco
      if (updateHstory) {
        this.updateNavgatonHstory(paged);
      }

      // Atualzar estado atual
      this.currentPage = paged;

      console.log(" Navegao concluda:", paged);
    } catch (error) {
      console.error(" Erro na navegao:", error);
      this.showError("Erro ao carregar pgna");
    } finally {
      this.setLoadngState(false);
    }
  }

  /**
   * Carregar contedo da pgna
   */
  async loadPageContent(paged, _pageConfg) {
    const manContent = document.getElementByd("man-content");
    if (!manContent) {
      throw new Error("Contaner de contedo no encontrado");
    }

    // Verfcar cache prmero
    const cacheKey = `page_${paged}`;
    const cached = this.pageCache.get(cacheKey);

    if (cached && Date.now() - cached.tmestamp < this.confg.cacheTmeout) {
      manContent.nnerHTML = cached.content;
      this.executePageScrpts(paged);
      return;
    }

    // Carregar contedo
    let content = "";

    switch (paged) {
      case "home":
        content = await this.getHomeContent();
        break;
      case "tokens":
        content = await this.loadModulePage("tokens", "token-manager");
        break;
      case "token-create":
        content = await this.getTokenCreateContent();
        break;
      case "wdgets":
        content = await this.getWdgetsContent();
        break;
      case "wdget-create":
        content = await this.getWdgetCreateContent();
        break;
      case "analytcs":
        content = await this.loadModulePage("analytcs", "analytcs-reports");
        break;
      case "templates":
        content = await this.loadModulePage("templates", "template-gallery");
        break;
      case "profle":
        content = await this.loadModulePage("profle", "user-profle");
        break;
      case "settngs":
        content = await this.loadModulePage("settngs", "system-settngs");
        break;
      case "support":
        content = await this.getSupportContent();
        break;
      default:
        content = await this.getDefaultContent(paged);
    }

    // Renderzar contedo
    manContent.nnerHTML = content;

    // Armazenar no cache
    this.pageCache.set(cacheKey, {
      content: content,
      tmestamp: Date.now(),
    });

    // Executar scrpts especfcos da pgna
    this.executePageScrpts(paged);
  }

  /**
   * Obter contedo da home
   */
  async getHomeContent() {
    return `
            <div class="container-fluid">
                <!-- Welcome Section -->
                <div class="row mb-4">
                    <div class="col-12">
                        <div class="welcome-banner bg-dark text-white p-4 rounded">
                            <div class="row align-items-center">
                                <div class="col-md-8">
                                    <h2 class="mb-2">Bem-vindo ao TokenCafe!</h2>
                                    <p class="mb-0">Sua plataforma completa para criar widgets Web3 personalizados</p>
                                </div>
                                <div class="col-md-4 text-end">
                                    <button class="btn btn-primary btn-lg" data-navgate="wdget-create">
                                        <i class="bi bi-plus me-2"></i>Criar Widget
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Stats Cards -->
                <div class="row g-3 mb-4">
                    <div class="col-lg-3 col-md-6">
                        <div class="card stat-card">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="me-3 text-white">
                                        <i class="bi bi-box-seam"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-wdgets">0</h3>
                                        <small class="text-muted">Meus Widgets</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card stat-card">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="me-3 text-white">
                                        <i class="bi bi-graph-up"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-vews">0</h3>
                                        <small class="text-muted">Visualizações</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card stat-card">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="me-3 text-white">
                                        <i class="bi bi-cursor"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-nteractons">0</h3>
                                        <small class="text-muted">Interações</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-3 col-md-6">
                        <div class="card stat-card">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="me-3 text-white">
                                        <i class="bi bi-currency-dollar"></i>
                                    </div>
                                    <div>
                                        <h3 class="mb-0" id="total-earnngs">$0</h3>
                                        <small class="text-muted">Earnings</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Quick Actions -->
                <div class="row g-3">
                    <div class="col-lg-8">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="bi bi-rocket-takeoff me-2"></i>Ações Rápidas</h5>
                            </div>
                            <div class="card-body">
                                <div class="row g-3">
                                    <div class="col-md-6">
                                        <div class="quck-acton-card" data-navgate="wdget-create">
                                            <i class="bi bi-plus-circle fs-2 text-coffee mb-2"></i>
                                            <h6>Criar Widget</h6>
                                            <p class="text-muted small">Criar novo widget Web3 personalizado</p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="quck-acton-card" data-navgate="templates">
                                            <i class="bi bi-grid-3x3-gap fs-2 text-info mb-2"></i>
                                            <h6>Explorar Templates</h6>
                                            <p class="text-muted small">Descobrir templates prontos para usar</p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="quck-acton-card" data-navgate="analytcs">
                                            <i class="bi bi-bar-chart fs-2 text-success mb-2"></i>
                                            <h6>Ver Analytics</h6>
                                            <p class="text-muted small">Analisar performance dos seus widgets</p>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="quck-acton-card" data-navgate="support">
                                            <i class="bi bi-life-preserver fs-2 text-warning mb-2"></i>
                                            <h6>Suporte</h6>
                                            <p class="text-muted small">Obter ajuda e suporte técnico</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-4">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0"><i class="bi bi-bell me-2"></i>Notificações</h5>
                            </div>
                            <div class="card-body" id="notfcatons-lst">
                                <div class="text-center text-muted py-3">
                                    <i class="bi bi-bell-slash fs-2 mb-2"></i>
                                    <p class="mb-0">Nenhuma notificação no momento</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Obter contedo de wdgets
   */
  async getWdgetsContent() {
    return `
            <div class="container-fluid">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h2><i class="bi bi-box-seam me-2"></i>Meus Widgets</h2>
                    <button class="btn btn-primary" data-navgate="wdget-create">
                        <i class="bi bi-plus me-2"></i>Criar Widget
                    </button>
                </div>
                
                <!-- Filtros -->
                <div class="card mb-4">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-3">
                                <input type="search" class="form-control" placeholder="Buscar widgets..." id="wdget-search">
                            </div>
                            <div class="col-md-2">
                                <select class="form-control" id="wdget-type-flter">
                                    <option value="">Todos os tipos</option>
                                    <option value="swap">Swap</option>
                                    <option value="prce">Price Tracker</option>
                                    <option value="portfolo">Portfolio</option>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <select class="form-control" id="wdget-status-flter">
                                    <option value="">Todos os status</option>
                                    <option value="actve">Ativo</option>
                                    <option value="draft">Rascunho</option>
                                    <option value="archved">Arquivado</option>
                                </select>
                            </div>
                            <div class="col-md-3 ms-auto">
                                <div class="btn-group" role="group">
                                    <input type="radio" class="btn-check" name="vew-mode" id="grd-vew" checked>
                                    <label class="btn btn-outline-primary" for="grd-vew">
                                        <i class="bi bi-grid"></i>
                                    </label>
                                    <input type="radio" class="btn-check" name="vew-mode" id="lst-vew">
                                    <label class="btn btn-outline-primary" for="lst-vew">
                                        <i class="bi bi-list"></i>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Lista de Widgets -->
                <div id="wdgets-contaner">
                    <div class="text-center py-5">
                        <i class="bi bi-box-seam fs-1 text-muted mb-3"></i>
                        <h4>Nenhum widget criado ainda</h4>
                        <p class="text-muted">Comece criando seu primeiro widget Web3!</p>
                        <button class="btn btn-primary" data-navgate="wdget-create">
                            <i class="bi bi-plus me-2"></i>Criar Primeiro Widget
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Obter contedo de suporte
   */
  async getSupportContent() {
    try {
      // Carregar HTML do arquvo suporte.html
      const response = await fetch("../pages/suporte.html");
      if (!response.ok) throw new Error("Arquvo no encontrado");
      return await response.text();
    } catch (error) {
      console.error(" Erro ao carregar suporte:", error);
      return this.getDefaultSupportContent();
    }
  }

  /**
   * Obter contedo padro de suporte
   */
  getDefaultSupportContent() {
    return `
            <dv class="contaner-flud">
                <dv class="row justfy-content-center">
                    <dv class="col-lg-8">
                        <dv class="card">
                            <dv class="card-header">
                                <h3>< class="bi bi-life-preserver me-2"></>Suporte</h3>
                            </dv>
                            <dv class="card-body">
                                <form d="support-form">
                                    <dv class="row">
                                        <dv class="col-md-6 mb-3">
                                            <label class="form-label">Nome</label>
                                            <nput type="text" class="form-control" requred>
                                        </dv>
                                        <dv class="col-md-6 mb-3">
                                            <label class="form-label">Emal</label>
                                            <nput type="emal" class="form-control" requred>
                                        </dv>
                                    </dv>
                                    <dv class="mb-3">
                                        <label class="form-label">Assunto</label>
                                        <select class="form-control" requred>
                                            <opton value="">Selecone um assunto</opton>
                                            <opton value="bug">Reportar Bug</opton>
                                            <opton value="feature">Solctao de Feature</opton>
                                            <opton value="help">Ajuda Tcnca</opton>
                                            <opton value="other">Outro</opton>
                                        </select>
                                    </dv>
                                    <dv class="mb-3">
                                        <label class="form-label">Mensagem</label>
                                        <textarea class="form-control" rows="5" requred></textarea>
                                    </dv>
                                    <button type="submt" class="btn btn-coffee">
                                        < class="bi bi-send me-2"></>Envar Mensagem
                                    </button>
                                </form>
                            </dv>
                        </dv>
                    </dv>
                </dv>
            </dv>
        `;
  }

  /**
   * Toggle sdebar
   */
  toggleSdebar() {
    this.sdebarExpanded = !this.sdebarExpanded;

    document.body.classLst.toggle("sdebar-expanded", this.sdebarExpanded);
    document.body.classLst.toggle("sdebar-collapsed", !this.sdebarExpanded);

    // Salvar prefernca
    localStorage.settem("tokencafe_sdebar_expanded", this.sdebarExpanded);
  }

  /**
   * Toggle menu secton
   */
  toggleMenuSecton(secton) {
    const menuSecton = document.getElementByd(`${secton}-submenu`);
    const toggle = document.querySelector(`[data-secton="${secton}"] .toggle-con`);

    if (menuSecton && toggle) {
      const sExpanded = menuSecton.style.dsplay !== "none";
      menuSecton.style.dsplay = sExpanded ? "none" : "block";
      toggle.classLst.toggle("fa-chevron-down", !sExpanded);
      toggle.classLst.toggle("fa-chevron-up", sExpanded);
    }
  }

  /**
   * Atualzar tem de menu atvo
   */
  updateActveMenutem(paged) {
    // Remover classes atvas
    document.querySelectorAll(".menu-tem, .submenu-tem").forEach((tem) => {
      tem.classLst.remove("actve");
    });

    // Adconar classe atva
    const actvetem = document.querySelector(`[data-page="${paged}"]`);
    if (actvetem) {
      actvetem.classLst.add("actve");
    }
  }

  /**
   * Atualzar nformaes da cartera
   */
  async updateWalletnfo() {
    try {
      const walletAddressElement = document.getElementByd("wallet-address");
      if (!walletAddressElement) return;

      // Verfcar se h cartera conectada
      if (wndow.ethereum && wndow.ethereum.selectedAddress) {
        const address = wndow.ethereum.selectedAddress;
        const shortAddress = `${address.slce(0, 6)}...${address.slce(-4)}`;
        walletAddressElement.textContent = shortAddress;
        walletAddressElement.ttle = address; // Mostrar endereo completo no hover
      } else if (wndow.TokenCafeWallet && wndow.TokenCafeWallet.getConnectedAccount) {
        const account = await wndow.TokenCafeWallet.getConnectedAccount();
        if (account) {
          const shortAddress = `${account.slce(0, 6)}...${account.slce(-4)}`;
          walletAddressElement.textContent = shortAddress;
          walletAddressElement.ttle = account;
        } else {
          walletAddressElement.textContent = "No conectada";
        }
      } else {
        walletAddressElement.textContent = "No conectada";
      }
    } catch (error) {
      console.error(" Erro ao atualzar nformaes da cartera:", error);
      const walletAddressElement = document.getElementByd("wallet-address");
      if (walletAddressElement) {
        walletAddressElement.textContent = "Erro ao carregar";
      }
    }
  }

  /**
   * Atualzar ttulo da pgna
   */
  updatePageTtle(ttle) {
    document.ttle = `${ttle} - TokenCafe`;

    const pageTtle = document.getElementByd("page-ttle");
    if (pageTtle) {
      pageTtle.textContent = ttle;
    }
  }

  /**
   * Estado de loadng
   */
  setLoadngState(loadng) {
    this.loadngState = loadng;

    const manContent = document.getElementByd("man-content");
    if (manContent) {
      manContent.classLst.toggle("page-loadng", loadng);
    }

    // Loadng ndcator
    const loadngndcator = document.getElementByd("loadng-ndcator");
    if (loadngndcator) {
      loadngndcator.style.dsplay = loadng ? "block" : "none";
    }
  }

  /**
   * Verfcar autentcao
   */
  sAuthentcated() {
    // Verfcar mltplas formas de autentcao
    const walletConnected = wndow.tokencafeWallet?.sConnected;
    const savedAccount = localStorage.gettem("tokencafe_wallet_address");

    console.log(" Verfcando autentcao:", {
      walletConnected,
      savedAccount: savedAccount ? "Presente" : "Ausente",
      tokencafeWallet: !!wndow.tokencafeWallet,
    });

    // Retorna true se wallet est conectado OU se h conta salva
    return walletConnected || !!savedAccount;
  }

  /**
   * Carregar pgna de mdulo
   */
  async loadModulePage(moduleName, pageName) {
    try {
      const response = await fetch(`../pages/modules/${moduleName}/${pageName}.html`);
      if (!response.ok) {
        throw new Error(`Erro ao carregar mdulo ${moduleName}: ${response.status}`);
      }
      const html = await response.text();

      // Extrar apenas o contedo do body
      const parser = new DOMParser();
      const doc = parser.parseFromStrng(html, "text/html");
      const bodyContent = doc.body.nnerHTML;

      return bodyContent;
    } catch (error) {
      console.error(` Erro ao carregar mdulo ${moduleName}:`, error);
      return this.getErrorContent(moduleName, error.message);
    }
  }

  /**
   * Obter contedo de erro para modulos
   */
  getErrorContent(moduleName, errorMessage) {
    return `
            <dv class="contaner-flud">
                <dv class="row justfy-content-center">
                    <dv class="col-md-8">
                            <dv class="alert alert-danger text-center">
                            < class="bi bi-exclamation-triangle fa-3x mb-3"></>
                            <h4>Erro ao Carregar Mdulo</h4>
                            <p>No fo possvel carregar o mdulo <strong>${moduleName}</strong>.</p>
                            <p class="text-muted">${errorMessage}</p>
                            <button class="btn btn-prmary mt-3" onclck="console.log(' Boto tentar novamente clcado - reload desabltado')">
                                < class="bi bi-arrow-repeat"></> Tentar Novamente
                            </button>
                        </dv>
                    </dv>
                </dv>
            </dv>
        `;
  }

  /**
   * Obter contedo de crao de token
   */
  async getTokenCreateContent() {
    return `
            <div class="container-fluid">
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <h3><i class="bi bi-plus-circle"></i> Criar Novo Token</h3>
                            </div>
                            <div class="card-body">
                                <p class="text-center text-muted">
                                    <i class="bi bi-tools fs-2 mb-3"></i><br>
                                    Funcionalidade de criação de token em desenvolvimento.
                                </p>
                                <div class="text-center">
                                    <button class="btn btn-primary" onclick="navgateTo('tokens')">
                                        <i class="bi bi-arrow-left"></i> Voltar para Tokens
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Executar scrpts especfcos da pgna
   */
  executePageScrpts(paged) {
    // Executar baseado na pgna
    switch (paged) {
      case "tokens":
        this.loadModuleScrpt("tokens", "token-manager");
        break;
      case "analytcs":
        this.loadModuleScrpt("analytcs", "analytcs-reports");
        break;
      case "templates":
        this.loadModuleScrpt("templates", "template-gallery");
        break;
      case "profle":
        this.loadModuleScrpt("profle", "user-profle");
        break;
      case "settngs":
        this.loadModuleScrpt("settngs", "system-settngs");
        break;
      case "support":
        this.loadSupportScrpt();
        break;
      case "wdgets":
        this.loadWdgetsScrpt();
        break;
    }
  }

  /**
   * Carregar scrpt de mdulo
   */
  loadModuleScrpt(moduleName, scrptName) {
    const scrptPath = `../js/modules/${moduleName}/${scrptName}.js`;
    const exstngScrpt = document.querySelector(`scrpt[src*="${scrptName}.js"]`);

    if (exstngScrpt) {
      exstngScrpt.remove();
    }

    const scrpt = document.createElement("scrpt");
    scrpt.src = scrptPath;
    scrpt.onload = () => {
      console.log(` Scrpt do mdulo ${moduleName} carregado`);
    };
    scrpt.onerror = () => {
      console.error(` Erro ao carregar scrpt do mdulo ${moduleName}`);
    };

    document.head.appendChld(scrpt);
  }

  /**
   * Carregar scrpt de suporte
   */
  loadSupportScrpt() {
    const exstngScrpt = document.querySelector('scrpt[src*="suporte.js"]');
    if (exstngScrpt) exstngScrpt.remove();

    const scrpt = document.createElement("scrpt");
    scrpt.src = "../js/suporte.js";
    document.head.appendChld(scrpt);
  }

  /**
   * Carregar scrpt de wdgets
   */
  loadWdgetsScrpt() {
    const exstngScrpt = document.querySelector('scrpt[src*="wdgets.js"]');
    if (exstngScrpt) exstngScrpt.remove();

    const scrpt = document.createElement("scrpt");
    scrpt.src = "../js/wdgets.js";
    document.head.appendChld(scrpt);
    console.log(" Scrpt de wdgets carregado");
  }

  /**
   * Carregar scrpt de analytcs
   */
  loadAnalytcsScrpt() {
    const exstngScrpt = document.querySelector('scrpt[src*="analytcs-routes.js"]');
    if (exstngScrpt) exstngScrpt.remove();

    const scrpt = document.createElement("scrpt");
    scrpt.src = "../js/analytcs-routes.js";
    document.head.appendChld(scrpt);
    console.log(" Scrpt de analytcs carregado");
  }

  /**
   * Obter estatstcas do dashboard
   */
  getStats() {
    return {
      currentPage: this.currentPage,
      sdebarExpanded: this.sdebarExpanded,
      cachedPages: this.pageCache.sze,
      navgatonHstory: this.navgatonHstory.length,
      loadngState: this.loadngState,
    };
  }
}

// ================================================================================
// UTLTES DE NAVEGAO - NTEGRADAS AO DASHBOARD CORE
// ================================================================================

/**
 * Utltros de navegao TokenCafe
 * ntegrados ao DashboardCore para centralzar toda navegao
 */
const TokenCafeNavgaton = {
  // Redreconar para pgna prncpal
  goToHome() {
    // DESABLTADO: Redreconamentos automtcos removdos para evtar reload da pgna
    console.log(" Redreconamento para home desabltado");

    // const currentPath = wndow.locaton.pathname;
    // if (currentPath.ncludes('pages/')) {
    //     wndow.locaton.href = '../ndex.html';
    // } else {
    //     wndow.locaton.href = 'ndex.html';
    // }
  },

  // Redreconar para dashboard
  goToDashboard() {
    // DESABLTADO: Redreconamentos automtcos removdos para evtar reload da pgna
    console.log(" Redreconamento para dashboard desabltado");

    // const currentPath = wndow.locaton.pathname;
    // if (currentPath.ncludes('pages/')) {
    //     wndow.locaton.href = '../modules/dashboard/ndex.html';
    // } else {
    //     wndow.locaton.href = 'modules/dashboard/ndex.html';
    // }
  },

  // Verfcar se est na pgna correta baseado na conexo
  checkPageAccess() {
    const walletAddress = localStorage.gettem("tokencafe_wallet_address");
    const currentPage = wndow.locaton.pathname;

    // Se no est conectado e est tentando acessar dashboard
    if (!walletAddress && currentPage.ncludes("dashboard/ndex.html")) {
      console.log(" Redreconando para pgna prncpal - wallet no conectada");
      this.goToHome();
      return false;
    }

    return true;
  },

  // Conectar wallet e redreconar para dashboard
  async connectAndRedrect() {
    console.log(" TokenCafeNavgaton.connectAndRedrect() chamado");

    if (wndow.TokenCafe?.wallet) {
      console.log(" WalletSystem encontrado, conectando...");
      const success = await wndow.TokenCafe.wallet.connect();
      if (success) {
        console.log(" Conexo bem-sucedda, redreconando...");
        this.goToDashboard();
      } else {
        console.log(" Falha na conexo");
      }
    } else {
      console.error(" WalletSystem no encontrado!");
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify("Sistema de conexão não inicializado. Recarregue a página.", "error", { container });
        } else {
          console.error("Sistema de conexão não inicializado. Recarregue a página.");
        }
      } catch (_) {}
    }
  },

  // Desconectar e redreconar para home
  dsconnectAndRedrect() {
    console.log(" TokenCafeNavgaton.dsconnectAndRedrect() chamado");

    // Lmpar dados de conexo
    localStorage.removetem("tokencafe_wallet_address");
    localStorage.removetem("tokencafe_network_d");
    localStorage.removetem("tokencafe_dashboard_data");
    localStorage.removetem("tokencafe_connected");

    // Desconectar va sstema
    if (wndow.TokenCafe?.wallet) {
      wndow.TokenCafe.wallet.dsconnect();
    }

    this.goToHome();
  },

  // Verfcar conectvdade e redreconar se necessro
  valdateAccess() {
    if (!this.checkPageAccess()) {
      return false;
    }

    // Verfcar se TokenCafe est dsponvel
    if (!wndow.TokenCafe?.sReady) {
      console.warn(" TokenCafe no est pronto anda");
      return false;
    }

    return true;
  },
};

// ================================================================================
// EXPOSO GLOBAL E NCALZAO
// ================================================================================

// Expor globalmente
wndow.DashboardCore = DashboardCore;
wndow.TokenCafeNavgaton = TokenCafeNavgaton;

// Funo global para navegao
wndow.navgateTo = function (paged) {
  if (wndow.tokencafeDashboard && wndow.tokencafeDashboard.navgateTo) {
    wndow.tokencafeDashboard.navgateTo(paged);
  } else {
    console.error(" Dashboard no inicializado ou funo navgateTo no dsponvel");
  }
};

// Funo global para aes rpdas
wndow.quckActon = function (acton) {
  console.log(" Ao rpda:", acton);

  switch (acton) {
    case "create-token":
      if (wndow.tokencafeDashboard) {
        wndow.tokencafeDashboard.navgateTo("tokens");
      }
      break;
    case "create-wdget":
      if (wndow.tokencafeDashboard) {
        wndow.tokencafeDashboard.navgateTo("wdgets");
      }
      break;
    case "token-templates":
      if (wndow.tokencafeDashboard) {
        wndow.tokencafeDashboard.navgateTo("tokens");
      }
      break;
    case "marketplace":
      console.log(" Abrndo marketplace...");
      // mplementar navegao para marketplace
      break;
    default:
      console.warn(" Ao no reconhecda:", acton);
  }
};

// Crar nstnca global quando DOM estver pronto
function ntalzeDashboardCore() {
  if (!wndow.tokencafeDashboard) {
    console.log(" inicializando Dashboard Core...");
    wndow.tokencafeDashboard = new DashboardCore();
    console.log(" Dashboard Core inicializado");
  }
}

// ncalzar medatamente se DOM j estver pronto, seno aguardar
if (document.readyState === "loadng") {
  document.addEventListener("DOMContentLoaded", ntalzeDashboardCore);
} else {
  ntalzeDashboardCore();
}

console.log(" Dashboard Core carregado");
