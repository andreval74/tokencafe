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
  async function connectWalletAndRedirect(provider = 'metamask', redirectTarget) {
    try {
      if (!window.ethereum || (provider === 'metamask' && !window.ethereum.isMetaMask)) {
        alert('MetaMask não encontrado. Instale e habilite a extensão.');
        return;
      }

      // Força prompt de permissões (experiência de "trocar carteira")
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (permErr) {
        // Alguns providers podem não suportar; seguimos com a solicitação de contas
        console.debug('Permissão não solicitada ou já concedida:', permErr?.message || permErr);
      }

      // Solicita contas ao provider
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        alert('Nenhuma conta retornada pelo provider.');
        return;
      }

      // Sincroniza com o conector unificado, se disponível
      try {
        if (window.walletConnector && typeof window.walletConnector.connect === 'function') {
          await window.walletConnector.connect(provider);
        }
      } catch (syncErr) {
        console.warn('Falha ao sincronizar WalletConnector:', syncErr?.message || syncErr);
      }

      // Calcula destino padrão se não for informado
      var target = redirectTarget;
      if (!target) {
        const currentPath = window.location.pathname;
        target = currentPath.includes('/pages/') ? 'tools.html' : 'pages/tools.html';
      }

      // Redireciona
      window.location.href = target;
    } catch (e) {
      console.error('Erro na conexão de carteira:', e);
      alert(e?.message || 'Falha na conexão. Verifique sua carteira e tente novamente.');
    }
  }

  // Expõe função global conforme diretrizes de compatibilidade
  window.connectWallet = function () { return connectWalletAndRedirect('metamask'); };
  // Namespace
  if (!window.TokenCafe) window.TokenCafe = {};
  window.TokenCafe.connectWalletAndRedirect = connectWalletAndRedirect;

  // Vincula automaticamente botões padrão
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.btn-connect-wallet').forEach(function (btn) {
      btn.addEventListener('click', window.connectWallet);
    });
  });
})();