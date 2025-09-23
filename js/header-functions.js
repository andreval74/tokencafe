// Header Functions - Funções globais para headers  
function connectWalletFromHeader() {
    console.log('connectWalletFromHeader() chamado');
    if (window.tokencafeWeb3) {
        window.tokencafeWeb3.connect();
    } else {
        console.error('Web3ConnectionManager não encontrado');
        alert('Erro: Sistema de conexão não disponível');
    }
}

function disconnectWalletFromHeader() {
    console.log('disconnectWalletFromHeader() chamado');
    if (window.tokencafeWeb3) {
        window.tokencafeWeb3.disconnect();  
    } else {
        console.error('Web3ConnectionManager não encontrado');
        alert('Erro: Sistema de desconexão não disponível');
    }
}

window.connectWalletFromHeader = connectWalletFromHeader;
window.disconnectWalletFromHeader = disconnectWalletFromHeader;
console.log('Header Functions carregadas');
