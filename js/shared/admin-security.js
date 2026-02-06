/**
 * Utilitários de Segurança e Administração
 * Centraliza verificação de permissões e listas de acesso
 */

// Lista de endereços autorizados como administradores
// Adicione aqui os endereços de carteira (em lowercase) que têm permissão total em redes de teste
export const ADMIN_WALLETS = [
    // Exemplo: "0x1234567890abcdef1234567890abcdef12345678",
    "0x0000000000000000000000000000000000000000" // Placeholder
];

/**
 * Verifica se um endereço é administrador
 * @param {string} address - Endereço da carteira para verificar
 * @returns {boolean}
 */
export function isWalletAdmin(address) {
    if (!address) return false;
    try {
        const addr = String(address).toLowerCase();
        return ADMIN_WALLETS.includes(addr);
    } catch (e) {
        console.error("Erro ao verificar admin:", e);
        return false;
    }
}

/**
 * Tenta obter o endereço da carteira conectada do provider global (window.ethereum)
 * Útil para contextos onde o 'state' da aplicação não está disponível diretamente
 * @returns {Promise<string|null>}
 */
export async function getConnectedWalletAddress() {
    if (typeof window !== 'undefined' && window.ethereum) {
        try {
             const accounts = await window.ethereum.request({ method: 'eth_accounts' });
             if (accounts && accounts.length > 0) {
                 return accounts[0];
             }
        } catch (e) {
            console.warn("Falha ao obter contas do ethereum:", e);
        }
    }
    return null;
}
