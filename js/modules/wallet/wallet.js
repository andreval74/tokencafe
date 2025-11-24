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
        alert("Sistema de conexão indisponível. Atualize a página e tente novamente.");
        return;
      }

      const result = await window.walletConnector.connect(provider);
      if (!result || !result.success) {
        alert("Falha ao conectar a carteira.");
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
      alert(e?.message || "Falha na conexão. Verifique sua carteira e tente novamente.");
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
