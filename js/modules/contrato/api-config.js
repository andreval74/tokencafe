// Config de API do TokenCafe (frontend)
// Por padrão usa localhost. Em produção, defina window.TOKENCAFE_API_BASE antes deste script
// ou altere abaixo para sua URL no Render.

(function () {
  var existing = typeof window.TOKENCAFE_API_BASE !== "undefined" ? window.TOKENCAFE_API_BASE : null;
  var stored = null;
  try {
    stored = window.localStorage ? window.localStorage.getItem("api_base") : null;
  } catch (_) {
    stored = null;
  }
  var override = null;
  try {
    var sp = new URLSearchParams(window.location.search || "");
    override = sp.get("api") || null;
  } catch (_) {
    override = null;
  }
  function isUrl(u) {
    try {
      return !!new URL(u);
    } catch (_) {
      return false;
    }
  }
  var pageProto = String(window.location.protocol || "");
  var pageHost = String(window.location.hostname || "");
  var isHttps = pageProto === "https:";
  var isLocalHost = pageHost === "localhost" || pageHost === "127.0.0.1";
  // Alterado para Render API como padrão conforme solicitação
  var prodDefault = "https://tokencafe.onrender.com";

  // Senior Fix: Prevent Mixed Content on Localhost
  // If we are running locally (HTTP), we can call HTTPS APIs (CORS might apply).
  // But we generally prefer the production API if local is not available.
  // The previous logic incorrectly blocked HTTPS on HTTP.
  
  // Logic: 
  // 1. Override (query param) has highest priority.
  // 2. Existing window/localStorage config has next priority.
  // 3. Fallback: Localhost is now default.
  
  var chosen = (isUrl(override) ? override : null) || existing || stored || prodDefault;
  try {
    var chosenUrl = new URL(chosen);
    var isHttpChosen = chosenUrl.protocol === "http:";
    var chosenIsLocalHost = ["localhost", "127.0.0.1"].indexOf(chosenUrl.hostname) !== -1;
    if (pageProto === "https:" && isHttpChosen) {
      if (!chosenIsLocalHost) {
        chosenUrl.protocol = "https:";
        chosen = chosenUrl.toString();
      } else {
        if (isUrl(override) && String(new URL(override).protocol) === "https:") {
          chosen = override;
        } else if (existing && isUrl(existing) && String(new URL(existing).protocol) === "https:") {
          chosen = existing;
        }
      }
    }
  } catch (_) {}
  window.TOKENCAFE_API_BASE = chosen;
  try {
    if (isUrl(chosen)) window.localStorage && window.localStorage.setItem("api_base", chosen);
  } catch (_) {}
  // Configuração automática da API Key do BscScan (se disponível)
  try {
    var sp2 = new URLSearchParams(window.location.search || "");
    var keyFromUrl = sp2.get("bscapi") || null;
    if (keyFromUrl) {
      try {
        window.localStorage && window.localStorage.setItem("bscscan_api_key", keyFromUrl);
      } catch (_) {}
      window.TOKENCAFE_BSCSCAN_API_KEY = keyFromUrl;
    } else {
      var keyStored = null;
      try {
        keyStored = window.localStorage ? window.localStorage.getItem("bscscan_api_key") : null;
      } catch (_) {
        keyStored = null;
      }
      if (typeof window.TOKENCAFE_BSCSCAN_API_KEY === "undefined" || !window.TOKENCAFE_BSCSCAN_API_KEY) {
        window.TOKENCAFE_BSCSCAN_API_KEY = keyStored || null;
      }
    }
  } catch (_) {}
})();
