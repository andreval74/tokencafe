/**
 * Utilitários de Segurança e Administração
 * Centraliza verificação de permissões e listas de acesso
 */

// Lista de endereços autorizados como administradores
// Lida de TC_SYSTEM_SETTINGS (injetado pelo PHP via head.php) com fallback hardcoded
export const ADMIN_WALLETS = (
    Array.isArray(window.TC_SYSTEM_SETTINGS?.permissions?.adminWallets) &&
    window.TC_SYSTEM_SETTINGS.permissions.adminWallets.length > 0
        ? window.TC_SYSTEM_SETTINGS.permissions.adminWallets
        : ["0x0b81337f18767565d2ea40913799317a25dc4bc5"]
);

const ADMIN_WALLETS_NORMALIZED = ADMIN_WALLETS.map((a) => {
    try { return String(a).toLowerCase(); } catch (_) { return ""; }
}).filter(Boolean);

/**
 * Verifica se um endereço é administrador
 * @param {string} address - Endereço da carteira para verificar
 * @returns {boolean}
 */
export function isWalletAdmin(address) {
    if (!address) return false;
    try {
        const addr = String(address).toLowerCase();
        return ADMIN_WALLETS_NORMALIZED.includes(addr);
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
