/**
 * ================================================================================
 * WALLET UI UPDATER - TOKENCAFE
 * ================================================================================
 * Responsável por atualizar a interface do usuário com base no estado da carteira
 * ================================================================================
 */

document.addEventListener('DOMContentLoaded', function() {
    // Expor a função de desconexão globalmente
    window.TokenCafeWallet = window.TokenCafeWallet || {};
    
    // Verificar se o sistema de carteira está disponível
    if (window.TokenCafe && window.TokenCafe.wallet) {
        // Usar o sistema de carteira existente
        window.TokenCafeWallet = window.TokenCafe.wallet;
    } else {
        // Criar funções de fallback
        window.TokenCafeWallet.disconnect = function() {
            console.log('📤 Desconectando via TokenCafeWallet...');
            
            // Limpar dados da sessão
            localStorage.removeItem('tokencafe_wallet_address');
            localStorage.removeItem('tokencafe_network_id');
            localStorage.removeItem('tokencafe_connection_time');
            localStorage.removeItem('tokencafe_connected');
            
            // COMENTADO: Redirecionamento removido para evitar reload da página
            // window.location.href = '../../../index.html';
            console.log('📤 Desconexão realizada - redirecionamento automático desabilitado');
        };
        
        // Função global de desconexão
        window.TokenCafeWallet.globalDisconnect = function() {
            console.log('📤 Desconexão global acionada');
            
            // Limpar dados da sessão
            localStorage.removeItem('tokencafe_wallet_address');
            localStorage.removeItem('tokencafe_network_id');
            localStorage.removeItem('tokencafe_connection_time');
            localStorage.removeItem('tokencafe_connected');
            
            // COMENTADO: Redirecionamento removido para evitar reload da página
            // window.location.href = '../../../index.html';
            console.log('📤 Desconexão global realizada - redirecionamento automático desabilitado');
        };
    }
    
    console.log('✅ Wallet UI Updater inicializado');
});