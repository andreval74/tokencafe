/**
 * factory-config.js
 * Mapeia chainId → endereço do TokenCafeFactory deployado.
 * Preencha após cada deploy com scripts/deploy-factory.js.
 */

// Lê endereços do painel de administração (TC_SYSTEM_SETTINGS injetado pelo PHP).
// Converte chaves string para number para manter compatibilidade com o código existente.
function _buildFactoryAddresses() {
    const raw = window.TC_SYSTEM_SETTINGS?.contracts?.factoryAddresses ?? {};
    const result = {};
    for (const [k, v] of Object.entries(raw)) {
        if (v && typeof v === 'string' && v.trim() !== '') {
            result[Number(k)] = v.trim();
        }
    }
    return result;
}

export const FACTORY_ADDRESSES = _buildFactoryAddresses();

/**
 * Stablecoins e tokens conhecidos por chain (para seletor de moeda ERC-20).
 * Só liste endereços verificados e amplamente usados.
 *
 * Estrutura: chainId → [{ address, symbol, name }]
 */
export const KNOWN_ERC20_CURRENCIES = {
  // Ethereum Mainnet
  1: [
    { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", name: "Tether USD" },
    { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC", name: "USD Coin" },
  ],
  // BNB Smart Chain
  56: [
    { address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", name: "Tether USD (BSC)" },
    { address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", name: "USD Coin (BSC)" },
  ],
  // Polygon
  137: [
    { address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", name: "Tether USD (Polygon)" },
    { address: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", symbol: "USDC", name: "USD Coin (Polygon)" },
  ],
  // Arbitrum One
  42161: [
    { address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", name: "Tether USD (Arbitrum)" },
    { address: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", symbol: "USDC", name: "USD Coin (Arbitrum)" },
  ],
  // Avalanche C-Chain
  43114: [
    { address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", symbol: "USDT", name: "Tether USD (Avalanche)" },
    { address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", name: "USD Coin (Avalanche)" },
  ],
  // Optimism
  10: [
    { address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", name: "Tether USD (Optimism)" },
    { address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", symbol: "USDC", name: "USD Coin (Optimism)" },
  ],
  // Base
  8453: [
    { address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", symbol: "USDT", name: "Tether USD (Base)" },
    { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", name: "USD Coin (Base)" },
  ],
  // BSC Testnet (para desenvolvimento)
  97: [
    // Adicionar endereços de mocks após deploy
  ],
  // Sepolia (para desenvolvimento)
  11155111: [
    // Adicionar endereços de mocks após deploy
  ],
};

/**
 * ABI mínima do TokenCafeFactory — todas as funções usadas pelo frontend.
 */
export const FACTORY_ABI = [
  // ── Views ─────────────────────────────────────────────────────────────────
  "function basePrice() view returns (uint256)",
  "function discountedPrice() view returns (uint256)",
  "function discountedPriceERC20(address currency) view returns (uint256)",
  "function currencyPrice(address currency) view returns (uint256)",
  "function paused() view returns (bool)",

  // ── createToken (preço cheio, moeda nativa) ───────────────────────────────
  "function createToken((string name, string symbol, uint8 decimals, uint256 initialSupply, address initialOwner, bool mintable, bool burnable, bool pausable) params) payable returns (address token)",

  // ── createTokenWithReferral (desconto 10%, moeda nativa) ──────────────────
  "function createTokenWithReferral((string name, string symbol, uint8 decimals, uint256 initialSupply, address initialOwner, bool mintable, bool burnable, bool pausable) params, address referrer) payable returns (address token)",

  // ── createTokenWithERC20 (preço cheio, ERC-20) ────────────────────────────
  "function createTokenWithERC20((string name, string symbol, uint8 decimals, uint256 initialSupply, address initialOwner, bool mintable, bool burnable, bool pausable) params, address currency) returns (address token)",

  // ── createTokenWithERC20AndReferral (desconto 10%, ERC-20) ────────────────
  "function createTokenWithERC20AndReferral((string name, string symbol, uint8 decimals, uint256 initialSupply, address initialOwner, bool mintable, bool burnable, bool pausable) params, address currency, address referrer) returns (address token)",

  // ── Eventos ───────────────────────────────────────────────────────────────
  "event TokenCreated(address indexed token, address indexed creator, address indexed referrer, string name, string symbol, uint256 feePaid, address currency)",
];

// ── Funções utilitárias ───────────────────────────────────────────────────────

/**
 * Retorna o endereço do factory para a chainId, ou null se não deployado.
 * @param {number|string|bigint} chainId
 * @returns {string|null}
 */
export function getFactoryAddress(chainId) {
  return FACTORY_ADDRESSES[Number(chainId)] || null;
}

/**
 * Retorna true se a rede tem factory deployado.
 * @param {number|string|bigint} chainId
 * @returns {boolean}
 */
export function hasFactory(chainId) {
  return Boolean(getFactoryAddress(chainId));
}

/**
 * Retorna a lista de moedas ERC-20 conhecidas para a rede.
 * Só inclui moedas que têm endereço configurado.
 *
 * @param {number|string|bigint} chainId
 * @returns {Array<{address: string, symbol: string, name: string}>}
 */
export function getKnownCurrencies(chainId) {
  return KNOWN_ERC20_CURRENCIES[Number(chainId)] || [];
}
