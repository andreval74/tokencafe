/**
 * TOKENCAFE API CONFIGURATION
 * Centralized configuration for API endpoints.
 * Automatically detects environment (Localhost vs Production)
 */

(function () {
  try {
    try {
      var sp = new URLSearchParams(window.location.search || "");
    } catch (_) {}

    // 2. Define defaults
    var productionApi = "https://tokencafe.onrender.com";
    var localApi      = "http://localhost:3000";

    // 3. Determine API Base
    // Prioridade: override manual → localhost (se estiver em dev) → produção
    var savedBase = null;
    try { savedBase = window.localStorage?.getItem("api_base_override") || null; } catch (_) {}

    var isLocalDev = (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
    );

    var apiBase = savedBase || (isLocalDev ? localApi : productionApi);

    // 5. Apply configuration
    window.TOKENCAFE_API_BASE = apiBase;

    // 6. Save to LocalStorage
    try {
       window.localStorage && window.localStorage.setItem("api_base", apiBase);
    } catch (_) {}
    
    // BscScan API Key handling (legacy support)
    try {
        var keyFromUrl = sp ? sp.get("bscapi") : null;
        if (keyFromUrl) {
            window.localStorage && window.localStorage.setItem("bscscan_api_key", keyFromUrl);
            window.TOKENCAFE_BSCSCAN_API_KEY = keyFromUrl;
        } else {
            var keyStored = window.localStorage ? window.localStorage.getItem("bscscan_api_key") : null;
            if (!window.TOKENCAFE_BSCSCAN_API_KEY && keyStored) {
                window.TOKENCAFE_BSCSCAN_API_KEY = keyStored;
            }
        }
    } catch (_) {}

  } catch (e) {
    console.error("[API Config] Critical error initializing API config:", e);
    window.TOKENCAFE_API_BASE = "https://tokencafe.onrender.com";
  }
})();
