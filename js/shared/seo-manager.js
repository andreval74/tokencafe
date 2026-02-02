/**
 * TOKENCAFE - SISTEMA DE SEO E DADOS ESTRUTURADOS
 * =============================================
 * Sistema para carregamento dinâmico de metadados e dados estruturados
 */

class SEOManager {
  constructor() {
    this.structuredDataPath = "/shared/data/structured-data.json";
  }

  /**
   * Carrega e injeta dados estruturados JSON-LD no head
   */
  async loadStructuredData() {
    try {
      const candidatePaths = [this.structuredDataPath, "../shared/data/structured-data.json", "../../shared/data/structured-data.json"];
      let structuredData = null;
      for (const p of candidatePaths) {
        try {
          const resp = await fetch(p);
          if (resp && resp.ok) {
            structuredData = await resp.json();
            break;
          }
        } catch (_) {}
      }
      if (!structuredData) throw new Error("structured-data.json não encontrado");

      // Remove script existente se houver
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }

      // Cria novo script com dados estruturados
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData, null, 2);

      // Adiciona ao head
      document.head.appendChild(script);

      console.log("✅ Dados estruturados carregados:", structuredData.name);
      return structuredData;
    } catch (error) {
      console.error("❌ Erro ao carregar dados estruturados:", error);
      return null;
    }
  }

  /**
   * Atualiza metadados dinâmicos da página
   */
  updateMetadata(metadata) {
    if (metadata.title) {
      document.title = metadata.title;
      this.updateMetaTag("og:title", metadata.title);
      this.updateMetaTag("twitter:title", metadata.title);
    }

    if (metadata.description) {
      this.updateMetaTag("description", metadata.description);
      this.updateMetaTag("og:description", metadata.description);
      this.updateMetaTag("twitter:description", metadata.description);
    }

    if (metadata.image) {
      this.updateMetaTag("og:image", metadata.image);
      this.updateMetaTag("twitter:image", metadata.image);
    }

    if (metadata.url) {
      this.updateMetaTag("og:url", metadata.url);
      this.updateMetaTag("twitter:url", metadata.url);
      this.updateLinkTag("canonical", metadata.url);
    }
  }

  /**
   * Atualiza uma meta tag específica
   */
  updateMetaTag(name, content) {
    // Tenta diferentes seletores (name, property, itemprop)
    let meta = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`) || document.querySelector(`meta[itemprop="${name}"]`);

    if (meta) {
      meta.setAttribute("content", content);
    }
  }

  /**
   * Atualiza uma link tag específica
   */
  updateLinkTag(rel, href) {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (link) {
      link.setAttribute("href", href);
    }
  }

  /**
   * Gera dados estruturados específicos para diferentes tipos de página
   */
  generatePageSpecificData(pageType, customData = {}) {
    const baseData = {
      "@context": "https://schema.org",
      "@type": pageType === "landing" ? "SoftwareApplication" : "WebPage",
      name: customData.name || "TokenCafe",
      url: customData.url || window.location.href,
      inLanguage: "pt-BR",
    };

    // Adiciona dados específicos por tipo de página
    switch (pageType) {
      case "landing":
        return { ...baseData, applicationCategory: "FinanceApplication" };
      case "tools":
        return {
          ...baseData,
          "@type": "WebApplication",
          category: "WebDevelopment",
        };
      case "dashboard":
        return {
          ...baseData,
          "@type": "WebApplication",
          category: "UserInterface",
        };
      default:
        return baseData;
    }
  }

  /**
   * Inicializa o sistema SEO
   */
  async init(_pageType = "landing", customMetadata = {}) {
    console.log("🚀 Inicializando SEO Manager...");

    // Carrega dados estruturados
    await this.loadStructuredData();

    // Atualiza metadados se fornecidos
    if (Object.keys(customMetadata).length > 0) {
      this.updateMetadata(customMetadata);
    }

    console.log("✅ SEO Manager inicializado");
  }
}

// Exporta para uso global
window.SEOManager = SEOManager;

// Auto-inicialização se estiver na página principal
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.seoManager = new SEOManager();
  });
} else {
  window.seoManager = new SEOManager();
}

export { SEOManager };
