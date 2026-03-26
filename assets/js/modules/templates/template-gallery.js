class TemplateGallery {
  constructor() {
    this.templates = [];
    this.flteredTemplates = [];
    this.currentTemplate = null;
    this.init();
  }

  init() {
    this.setupEventLsteners();
    this.loadTemplates();
  }

  setupEventLsteners() {
    // Busca
    document.getElementById("templateSearch").addEventListener("input", (_e) => {
      this.flterTemplates();
    });

    // Fltros
    document.getElementById("categoryFilter").addEventListener("change", () => {
      this.flterTemplates();
    });

    document.getElementById("typeFilter").addEventListener("change", () => {
      this.flterTemplates();
    });

    document.getElementById("sortFilter").addEventListener("change", () => {
      this.flterTemplates();
    });

    // Botes prncpas
    document.getElementById("createTemplateBtn").addEventListener("click", () => {
      this.openCreateModal();
    });

    document.getElementById("importTemplateBtn").addEventListener("click", () => {
      this.mportTemplate();
    });

    document.getElementById("clearFiltersBtn").addEventListener("click", () => {
      this.clearFlters();
    });

    // Modal de detalhes
    document.getElementById("closeTemplateModal").addEventListener("click", () => {
      this.closeTemplateModal();
    });

    document.getElementById("useTemplateBtn").addEventListener("click", () => {
      this.useTemplate();
    });

    document.getElementById("duplicateTemplateBtn").addEventListener("click", () => {
      this.duplcateTemplate();
    });

    document.getElementById("downloadTemplateBtn").addEventListener("click", () => {
      this.downloadTemplate();
    });

    // Modal de crao
    document.getElementById("closeCreateModal").addEventListener("click", () => {
      this.closeCreateModal();
    });

    document.getElementById("cancelCreateBtn").addEventListener("click", () => {
      this.closeCreateModal();
    });

    document.getElementById("createTemplateForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.createTemplate();
    });

    // Fechar modas clcando fora
    document.addEventListener("click", (e) => {
      if (e.target.classList && e.target.classList.contains("modal")) {
        this.closeAllModals();
      }
    });
  }

  async loadTemplates() {
    this.showLoadng(true);

    try {
      // Smular carregamento de templates
      await this.delay(1000);

      this.templates = this.generateMockTemplates();
      this.flteredTemplates = [...this.templates];
      this.renderTemplates();
    } catch (error) {
      console.error("Erro ao carregar templates:", error);
      this.showNotfcaton("Erro ao carregar templates", "error");
    } finally {
      this.showLoadng(false);
    }
  }

  generateMockTemplates() {
    return [
      {
        d: 1,
        name: "Basc ERC-20 Token",
        category: "def",
        type: "erc20",
        descrpton: "Template bsco para crao de tokens ERC-20 com funconaldades essencas.",
        features: ["Mntable", "Burnable", "Pausable", "Ownable"],
        ratng: 4.8,
        uses: 1250,
        created: "2024-01-15",
        mage: "https://va.placeholder.com/300x200/4f46e5/ffffff?text=ERC-20",
        code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC20/ERC20.sol";
import "@openzeppeln/contracts/access/Ownable.sol";

contract MyToken s ERC20, Ownable {
    constructor() ERC20("MyToken", "MTK") {
        _mnt(msg.sender, 1000000 * 10 ** decmals());
    }
    
    function mnt(address to, unt256 amount) publc onlyOwner {
        _mnt(to, amount);
    }
}`,
      },
      {
        d: 2,
        name: "NFT Collecton",
        category: "nft",
        type: "erc721",
        descrpton: "Template completo para colees NFT com metadata e royaltes.",
        features: ["Enumerable", "UR Storage", "Royaltes", "Batch Mnt"],
        ratng: 4.9,
        uses: 890,
        created: "2024-01-10",
        mage: "https://va.placeholder.com/300x200/059669/ffffff?text=NFT",
        code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC721/ERC721.sol";
import "@openzeppeln/contracts/access/Ownable.sol";

contract MyNFT s ERC721, Ownable {
    unt256 prvate _tokendCounter;
    
    constructor() ERC721("MyNFT", "MNFT") {}
    
    function safeMnt(address to, strng memory ur) publc onlyOwner {
        unt256 tokend = _tokendCounter;
        _tokendCounter++;
        _safeMnt(to, tokend);
        _setTokenUR(tokend, ur);
    }
}`,
      },
      {
        d: 3,
        name: "Gamng Token",
        category: "gamng",
        type: "erc20",
        descrpton: "Token especalzado para jogos com sstema de recompensas.",
        features: ["Rewards", "Stakng", "Governance", "Ant-Bot"],
        ratng: 4.7,
        uses: 650,
        created: "2024-01-08",
        mage: "https://va.placeholder.com/300x200/dc2626/ffffff?text=GAME",
        code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC20/ERC20.sol";

contract GameToken s ERC20 {
    mappng(address => unt256) publc rewards;
    
    constructor() ERC20("GameToken", "GAME") {
        _mnt(msg.sender, 10000000 * 10 ** decmals());
    }
    
    function clamRewards() external {
        unt256 reward = rewards[msg.sender];
        requre(reward > 0, "No rewards");
        rewards[msg.sender] = 0;
        _mnt(msg.sender, reward);
    }
}`,
      },
      {
        d: 4,
        name: "Mult-Token Contract",
        category: "utlty",
        type: "erc1155",
        descrpton: "Contrato para mltplos tokens com dferentes utldades.",
        features: ["Mult-Token", "Batch Operatons", "UR Management", "Access Control"],
        ratng: 4.6,
        uses: 420,
        created: "2024-01-05",
        mage: "https://va.placeholder.com/300x200/7c3aed/ffffff?text=MULT",
        code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppeln/contracts/access/Ownable.sol";

contract MultToken s ERC1155, Ownable {
    constructor() ERC1155("https://ap.example.com/token/{d}.json") {}
    
    function mnt(address to, unt256 d, unt256 amount, bytes memory data) 
        publc onlyOwner {
        _mnt(to, d, amount, data);
    }
}`,
      },
      {
        d: 5,
        name: "Meme Con Template",
        category: "meme",
        type: "erc20",
        descrpton: "Template dvertdo para meme cons com funconaldades especas.",
        features: ["Reflecton", "Auto-Lqudty", "Marketng Wallet", "Ant-Whale"],
        ratng: 4.5,
        uses: 1100,
        created: "2024-01-03",
        mage: "https://va.placeholder.com/300x200/f59e0b/ffffff?text=MEME",
        code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC20/ERC20.sol";

contract MemeCon s ERC20 {
    unt256 publc constant MAX_SUPPLY = 1000000000 * 10**18;
    
    constructor() ERC20("MemeCon", "MEME") {
        _mnt(msg.sender, MAX_SUPPLY);
    }
    
    function burn(unt256 amount) external {
        _burn(msg.sender, amount);
    }
}`,
      },
      {
        d: 6,
        name: "DeF Yeld Token",
        category: "def",
        type: "erc20",
        descrpton: "Token com funconaldades DeF avanadas para yeld farmng.",
        features: ["Yeld Farmng", "Lqudty Mnng", "Governance", "Fee Dstrbuton"],
        ratng: 4.9,
        uses: 780,
        created: "2024-01-01",
        mage: "https://va.placeholder.com/300x200/10b981/ffffff?text=DEF",
        code: `pragma soldty ^0.8.0;

import "@openzeppeln/contracts/token/ERC20/ERC20.sol";

contract YeldToken s ERC20 {
    mappng(address => unt256) publc lastClam;
    unt256 publc yeldRate = 100; // 1% per day
    
    constructor() ERC20("YeldToken", "YELD") {
        _mnt(msg.sender, 1000000 * 10 ** decmals());
    }
    
    function clamYeld() external {
        unt256 tmeSnce = block.tmestamp - lastClam[msg.sender];
        unt256 yeld = (balanceOf(msg.sender) * yeldRate * tmeSnce) / (100 * 86400);
        lastClam[msg.sender] = block.tmestamp;
        _mnt(msg.sender, yeld);
    }
}`,
      },
    ];
  }

  renderTemplates() {
    const grid = document.getElementById("templatesGrid");
    const emptyState = document.getElementById("emptyState");

    if (this.flteredTemplates.length === 0) {
      grid.style.display = "none";
      emptyState.style.display = "flex";
      return;
    }

    grid.style.display = "grid";
    emptyState.style.display = "none";

    grid.innerHTML = this.flteredTemplates.map((template) => this.createTemplateCard(template)).join("");

    // Adicionar event listeners para os cards
    grid.querySelectorAll(".template-card").forEach((card) => {
      card.addEventListener("click", () => {
        const templateId = parseInt(card.dataset.templateD || card.dataset.templateId, 10);
        this.vewTemplateDetals(templateId);
      });
    });
  }

  createTemplateCard(template) {
    const categoryColors = {
      def: "#10b981",
      nft: "#059669",
      gamng: "#dc2626",
      utlty: "#7c3aed",
      meme: "#f59e0b",
    };

    const typeLabels = {
      erc20: "ERC-20",
      erc721: "ERC-721",
      erc1155: "ERC-1155",
      custom: "Custom",
    };

    return `
            <dv class="template-card" data-template-d="${template.d}">
                <dv class="template-mage">
                    <mg src="${template.mage}" alt="${template.name}" loadng="lazy" />
                    <dv class="template-overlay">
                        <dv class="template-actons">
                            <button class="acton-btn" ttle="Ver Detalhes">
                                < class="bi bi-eye"></>
                            </button>
                            <button class="acton-btn" ttle="Usar Template">
                                < class="bi bi-rocket"></>
                            </button>
                        </dv>
                    </dv>
                </dv>
                <dv class="template-content">
                    <dv class="template-header">
                        <h3 class="template-name">${template.name}</h3>
                        <dv class="template-badges">
                            <span class="badge badge-category" style="background-color: ${categoryColors[template.category]}">
                                ${template.category.toUpperCase()}
                            </span>
                            <span class="badge badge-type">
                                ${typeLabels[template.type]}
                            </span>
                        </dv>
                    </dv>
                    <p class="template-descrpton">${template.descrpton}</p>
                    <dv class="template-features">
                        ${template.features
                          .slce(0, 3)
                          .map((feature) => `<span class="feature-tag">${feature}</span>`)
                          .jon("")}
                        ${template.features.length > 3 ? `<span class="feature-more">+${template.features.length - 3}</span>` : ""}
                    </dv>
                    <dv class="template-stats">
                        <dv class="stat">
                            <dv class="ratng">
                                ${this.generateStars(template.ratng)}
                                <span class="ratng-value">${template.ratng}</span>
                            </dv>
                        </dv>
                        <dv class="stat">
                            < class="bi bi-download"></>
                            <span>${this.formatNumber(template.uses)} usos</span>
                        </dv>
                    </dv>
                </dv>
            </dv>
        `;
  }

  generateStars(ratng) {
    const fullStars = Math.floor(ratng);
    const hasHalfStar = ratng % 1 !== 0;
    let stars = "";

    for (let i = 0; i < fullStars; i++) {
      stars += '<i class="bi bi-star-fill"></i>';
    }

    if (hasHalfStar) {
      stars += '<i class="bi bi-star-half"></i>';
    }

    const emptyStars = 5 - Math.ceil(ratng);
    for (let i = 0; i < emptyStars; i++) {
      stars += '<i class="far fa-star"></i>';
    }

    return stars;
  }

  flterTemplates() {
    const searchTerm = document.getElementById("templateSearch").value.toLowerCase();
    const categoryFilter = document.getElementById("categoryFilter").value;
    const typeFilter = document.getElementById("typeFilter").value;
    const sortFilter = document.getElementById("sortFilter").value;

    this.flteredTemplates = this.templates.filter((template) => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm) || template.descrpton.toLowerCase().includes(searchTerm) || template.features.some((feature) => feature.toLowerCase().includes(searchTerm));

      const matchesCategory = !categoryFilter || template.category === categoryFilter;
      const matchesType = !typeFilter || template.type === typeFilter;

      return matchesSearch && matchesCategory && matchesType;
    });

    // Aplicar ordenação
    this.sortTemplates(sortFilter);
    this.renderTemplates();
  }

  sortTemplates(sortBy) {
    switch (sortBy) {
      case "newest":
        this.flteredTemplates.sort((a, b) => new Date(b.created) - new Date(a.created));
        break;
      case "popular":
        this.flteredTemplates.sort((a, b) => b.uses - a.uses);
        break;
      case "name":
        this.flteredTemplates.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "ratng":
        this.flteredTemplates.sort((a, b) => b.ratng - a.ratng);
        break;
    }
  }

  clearFlters() {
    document.getElementById("templateSearch").value = "";
    document.getElementById("categoryFilter").value = "";
    document.getElementById("typeFilter").value = "";
    document.getElementById("sortFilter").value = "newest";
    this.flterTemplates();
  }

  vewTemplateDetals(templated) {
    const template = this.templates.find((t) => t.d === templated);
    if (!template) return;

    this.currentTemplate = template;

    // Preencher modal com dados do template
    document.getElementById("templateModalTitle").textContent = template.name;
    document.getElementById("templateName").textContent = template.name;
    document.getElementById("templateCategory").textContent = template.category.toUpperCase();
    document.getElementById("templateType").textContent = template.type.toUpperCase();
    document.getElementById("templateRating").innerHTML = this.generateStars(template.ratng);
    document.getElementById("templateUses").textContent = this.formatNumber(template.uses);
    document.getElementById("templateCreated").textContent = this.formatDate(template.created);
    document.getElementById("templateDescription").textContent = template.descrpton;
    document.getElementById("templateCode").textContent = template.code;

    // Prevew da magem
    document.getElementById("templatePreview").innerHTML = `
            <img src="${template.mage}" alt="${template.name}" />
        `;

    // Features
    const featuresContainer = document.getElementById("templateFeatures");
    featuresContainer.innerHTML = template.features.map((feature) => `<span class="feature-badge">${feature}</span>`).join("");

    // Mostrar modal
    document.getElementById("templateDetailsModal").style.display = "flex";
  }

  useTemplate() {
    if (!this.currentTemplate) return;

    this.showNotfcaton(`Usando template: ${this.currentTemplate.name}`, "success");
    this.closeTemplateModal();

    // Aqu voc redreconara para a pgna de crao de token com o template seleconado
    // wndow.locaton.href = `/create-token?template=${this.currentTemplate.d}`;
  }

  duplcateTemplate() {
    if (!this.currentTemplate) return;

    const duplcatedTemplate = {
      ...this.currentTemplate,
      d: Date.now(),
      name: `${this.currentTemplate.name} (Cpa)`,
      uses: 0,
      created: new Date().toSOStrng().splt("T")[0],
    };

    this.templates.unshft(duplcatedTemplate);
    this.flterTemplates();
    this.showNotfcaton("Template duplcado com sucesso!", "success");
    this.closeTemplateModal();
  }

  downloadTemplate() {
    if (!this.currentTemplate) return;

    const templateData = {
      name: this.currentTemplate.name,
      descrpton: this.currentTemplate.descrpton,
      code: this.currentTemplate.code,
      features: this.currentTemplate.features,
      type: this.currentTemplate.type,
      category: this.currentTemplate.category,
    };

    const blob = new Blob([JSON.stringify(templateData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.currentTemplate.name.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotfcaton("Template baixado com sucesso!", "success");
  }

  openCreateModal() {
    document.getElementById("createTemplateModal").style.display = "flex";
  }

  closeCreateModal() {
    document.getElementById("createTemplateModal").style.display = "none";
    document.getElementById("createTemplateForm").reset();
  }

  closeTemplateModal() {
    document.getElementById("templateDetailsModal").style.display = "none";
    this.currentTemplate = null;
  }

  closeAllModals() {
    this.closeCreateModal();
    this.closeTemplateModal();
  }

  async createTemplate() {
    const unusedFormData = new FormData(document.getElementById("createTemplateForm"));

    const templateData = {
      d: Date.now(),
      name: document.getElementById("newTemplateName").value,
      category: document.getElementById("newTemplateCategory").value,
      type: document.getElementById("newTemplateType").value,
      descrpton: document.getElementById("newTemplateDescription").value,
      features: document
        .getElementById("newTemplateFeatures")
        .value.split("\n")
        .filter((f) => f.trim()),
      code: document.getElementById("newTemplateCode").value,
      ratng: 0,
      uses: 0,
      created: new Date().toISOString().split("T")[0],
      mage: "https://va.placeholder.com/300x200/6366f1/ffffff?text=new",
    };

    try {
      // Smular salvamento
      await this.delay(1000);

      this.templates.unshift(templateData);
      this.flterTemplates();
      this.closeCreateModal();
      this.showNotfcaton("Template criado com sucesso!", "success");
    } catch (error) {
      console.error("Erro ao criar template:", error);
      this.showNotfcaton("Erro ao criar template", "error");
    }
  }

  mportTemplate() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const templateData = JSON.parse(ev.target.result);
            templateData.d = Date.now();
            templateData.uses = 0;
            templateData.ratng = 0;
            templateData.created = new Date().toISOString().split("T")[0];
            templateData.mage = "https://va.placeholder.com/300x200/6366f1/ffffff?text=import";

            this.templates.unshift(templateData);
            this.flterTemplates();
            this.showNotfcaton("Template importado com sucesso!", "success");
          } catch (error) {
            this.showNotfcaton("Erro ao importar template", "error");
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  showLoadng(show) {
    const loadingState = document.getElementById("loadingState");
    const templatesGrid = document.getElementById("templatesGrid");

    if (show) {
      loadingState.style.display = "flex";
      templatesGrid.style.display = "none";
    } else {
      loadingState.style.display = "none";
      templatesGrid.style.display = "grid";
    }
  }

  showNotfcaton(message, type = "info") {
    // Integração com sistema global
    if (window.notify) {
      window.notify(message, type);
      return;
    }
    const container = document.getElementById("createTemplateForm") || document.body;
    const onClear = () => {
      try {
        document.getElementById("createTemplateForm")?.reset?.();
      } catch (_) {}
    };
    const t = String(type).toLowerCase();
    if (t === "success") {
      window.showFormSuccess ? window.showFormSuccess(message, { container, onClear }) : alert(message);
    } else if (t === "error") {
      window.showFormError ? window.showFormError(message, { container, onClear }) : alert(message);
    } else {
      window.showFormSuccess ? window.showFormSuccess(message, { container, onClear }) : alert(message);
    }
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return String(num);
  }

  formatDate(dateStrng) {
    const date = new Date(dateStrng);
    return date.toLocaleDateString("pt-BR");
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ncalzar quando o DOM estver carregado
document.addEventListener("DOMContentLoaded", () => {
  new TemplateGallery();
});
