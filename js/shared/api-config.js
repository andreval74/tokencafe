(function () {
  try {
    // Configuração global da API base
    // Se já estiver definido (ex: via config anterior), não sobrescreve
    if (typeof window.TOKENCAFE_API_BASE === 'undefined') {
      var protocol = window.location.protocol;
      var hostname = window.location.hostname;
      var port = window.location.port;

      // FORCE RENDER URL AS DEFAULT
      // User request: "sempre ser executada pelo RENDER e não pelo localhost"
      window.TOKENCAFE_API_BASE = "https://xcafe-token-api-hybrid.onrender.com";
      
      console.log("[API Config] Base configurada (FORCE RENDER):", window.TOKENCAFE_API_BASE);
    }
  } catch (e) {
    console.error("[API Config] Erro ao configurar base API:", e);
    // Fallback para Render
    window.TOKENCAFE_API_BASE = "https://xcafe-token-api-hybrid.onrender.com";
  }
})();
