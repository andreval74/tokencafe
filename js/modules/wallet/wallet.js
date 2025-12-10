/**
 * TokenCafe Wallet - Conexão centralizada MetaMask e redirecionamento
 * Mantém a lógica de conexão fora das páginas, seguindo diretrizes do projeto.
 */
(function () {
  /**
   * Solicita permissões e conexão da carteira como se o usuário fosse trocar de carteira,
   * depois sincroniza o estado unificado e redireciona para Tools.
   * @param {string} provider - tipo da carteira, padrão 'metamask'
   * @param {string} redirectTarget - destino de redirecionamento
   */
  async function connectWalletAndRedirect(provider = "metamask", redirectTarget) {
    try {
      // Delegar conexão ao WalletConnector centralizado
      if (!window.walletConnector || typeof window.walletConnector.connect !== "function") {
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          if (typeof window.notify === "function") {
            window.notify("Sistema de conexão indisponível. Atualize a página e tente novamente.", "error", { container });
          } else {
            console.error("Sistema de conexão indisponível. Atualize a página e tente novamente.");
          }
        } catch (_) {}
        return;
      }

      const result = await window.walletConnector.connect(provider);
      if (!result || !result.success) {
        try {
          const container = document.querySelector(".container, .container-fluid") || document.body;
          if (typeof window.notify === "function") {
            window.notify("Falha ao conectar a carteira.", "error", { container });
          } else {
            console.error("Falha ao conectar a carteira.");
          }
        } catch (_) {}
        return;
      }

      // Calcula destino padrão se não for informado
      var target = redirectTarget;
      if (!target) {
        const currentPath = window.location.pathname;
        target = currentPath.includes("/pages/") ? "tools.html" : "pages/tools.html";
      }

      // Redireciona
      window.location.href = target;
    } catch (e) {
      console.error("Erro na conexão de carteira:", e);
      try {
        const container = document.querySelector(".container, .container-fluid") || document.body;
        if (typeof window.notify === "function") {
          window.notify(e?.message || "Falha na conexão. Verifique sua carteira e tente novamente.", "error", { container });
        } else {
          console.error(e?.message || "Falha na conexão. Verifique sua carteira e tente novamente.");
        }
      } catch (_) {}
    }
  }

  // Expõe função global conforme diretrizes de compatibilidade
  window.connectWallet = function () {
    return connectWalletAndRedirect("metamask");
  };
  // Namespace
  if (!window.TokenCafe) window.TokenCafe = {};
  window.TokenCafe.connectWalletAndRedirect = connectWalletAndRedirect;

  // Vincula automaticamente botões padrão
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".btn-connect-wallet").forEach(function (btn) {
      btn.addEventListener("click", window.connectWallet);
    });
  });
})();
