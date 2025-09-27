// js/link-token.js
// Página de exibição do token - apenas exibição e adição à carteira
import LinkTokenDisplay from './link-token-display.js';

// Inicializar o sistema de exibição de token
const tokenDisplay = new LinkTokenDisplay();

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    tokenDisplay.init();
});

// Expor funções globais para compatibilidade
window.setupWalletButtons = async function(address, symbol, decimals, name, chainId) {
    return await tokenDisplay.setupWalletButtons(address, symbol, decimals, name, chainId);
};

window.addTokenToSpecificWallet = async function(wallet, address, symbol, decimals, name, chainId) {
    return await tokenDisplay.addTokenToSpecificWallet(wallet, address, symbol, decimals, name, chainId);
};

window.addTokenViaDeepLink = function(walletType, address, symbol, decimals, name, chainId) {
    return tokenDisplay.addTokenViaDeepLink(walletType, address, symbol, decimals, name, chainId);
};

