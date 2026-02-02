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
  var proto = String(window.location.protocol || "");
  var host = String(window.location.hostname || "");
  var isHttps = proto === "https:";
  var isLocalHost = host === "localhost" || host === "127.0.0.1";
  // Alterado para localhost por padrão devido a instabilidade do Render
  var prodDefault = "http://localhost:3000";
  var chosen = (isUrl(override) ? override : null) || existing || stored || prodDefault;
  try {
    var pageProto = String(window.location.protocol || "");
    var chosenUrl = new URL(chosen);
    var isHttpChosen = chosenUrl.protocol === "http:";
    var isLocalHostChosen = ["localhost", "127.0.0.1"].indexOf(chosenUrl.hostname) !== -1;
    if (pageProto === "https:" && isHttpChosen) {
      if (!isLocalHostChosen) {
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

  // Configuração automática da API Key do BscScan
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
