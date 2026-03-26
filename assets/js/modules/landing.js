import { PageManager } from "../shared/page-manager.js";
import { SEOManager } from "../shared/seo-manager.js";

/**
 * Lógica da Landing Page (Raiz)
 */

// Inicializa sistemas
window.createPageManager("landing");

// Inicializa SEO com dados estruturados
const seoManager = new SEOManager();
seoManager.init("landing");
