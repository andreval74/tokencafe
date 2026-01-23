(function () {
try {
  // Configuração global da API base
  if (!window.TOKENCAFE_API_BASE) {
    var origin = window.location.origin || "";
    // Se estiver rodando localmente (file:// ou localhost/127.0.0.1) mas porta diferente de 3000
    // assume-se que o backend está na porta padrão 3000 (ambiente dev/híbrido)
    if (origin.startsWith("file://") || ((origin.includes("localhost") || origin.includes("127.0.0.1")) && !origin.includes(":3000"))) {
      window.TOKENCAFE_API_BASE = "http://localhost:3000";
    } else if (origin && origin !== "null" && origin !== "file://") {
      window.TOKENCAFE_API_BASE = origin;
    } else {
      // Fallback final
      window.TOKENCAFE_API_BASE = "http://localhost:3000";
    }
    console.log("[API Config] Base configurada:", window.TOKENCAFE_API_BASE);
  }
} catch (e) {
  console.error("[API Config] Erro ao configurar base API:", e);
}
})();
