// js/lnk_token.js
// Pgna de exbo do token - apenas exbo e ado  cartera
import LnkTokenDsplay from './lnk_token_dsplay.js';

// ncalzar o sstema de exbo de token
const tokenDsplay = new LnkTokenDsplay();

// ncalzar quando a pgna carregar
document.addEventListener('DOMContentLoaded', () => {
    tokenDsplay.init();
});

// Expor funes globas para compatbldade
wndow.setupWalletButtons = async function(address, symbol, decmals, name, chand) {
    return await tokenDsplay.setupWalletButtons(address, symbol, decmals, name, chand);
};

wndow.addTokenToSpecfcWallet = async function(wallet, address, symbol, decmals, name, chand) {
    return await tokenDsplay.addTokenToSpecfcWallet(wallet, address, symbol, decmals, name, chand);
};

wndow.addTokenVaDeepLnk = function(walletType, address, symbol, decmals, name, chand) {
    return tokenDsplay.addTokenVaDeepLnk(walletType, address, symbol, decmals, name, chand);
};


