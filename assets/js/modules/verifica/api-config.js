/**
 * TOKENCAFE API CONFIGURATION
 * Centralized configuration for API endpoints.
 * Automatically detects environment (Localhost vs Production)
 */

(function () {
  try {
    // 1. Check for overrides in URL or LocalStorage
    var override = null;
    try {
      var sp = new URLSearchParams(window.location.search || "");
      override = sp.get("api") || null;
    } catch (_) {}
    
    var stored = null;
    try {
      stored = window.localStorage ? window.localStorage.getItem("api_base") : null;
    } catch (_) {}

    // 2. Define defaults
    var localhostApi = "http://localhost:3000";
    var productionApi = "https://xcafe-token-api-hybrid.onrender.com";

    // 3. Detect environment
    var hostname = window.location.hostname;
    var isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

    // 4. Determine API Base
    var apiBase = productionApi; // Default to production

    if (override) {
        apiBase = override;
        console.log("[API Config] Using URL override:", apiBase);
    } else if (stored && override) { 
        // Logic fix: stored should only be used if explicitly set previously or if we want persistence.
        // For now, let's prioritize environment detection unless override is present.
        apiBase = stored;
    } else if (isLocalhost) {
        apiBase = localhostApi;
        console.log("[API Config] Localhost detected. Using local API:", apiBase);
    } else {
        apiBase = productionApi;
        console.log("[API Config] Production detected. Using production API:", apiBase);
    }

    // 5. Apply configuration
    window.TOKENCAFE_API_BASE = apiBase;

    // 6. Save to LocalStorage ONLY if it was an override (to persist user choice)
    try {
       if (override) {
           window.localStorage.setItem("api_base", apiBase);
       }
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
    // Fallback safety
    window.TOKENCAFE_API_BASE = "https://tokencafe.onrender.com";
  }
})();
