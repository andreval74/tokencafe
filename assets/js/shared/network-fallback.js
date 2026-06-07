/**
 * Utilitários de fallback de rede e explorer
 * Mantém endpoints públicos padrão e nomes para facilitar manutenção
 */
export function getFallbackRpc(chainId) {
  switch (Number(chainId)) {
    case 56:
      return "https://bsc-dataseed.binance.org";
    case 97:
      return "https://bsc-testnet.publicnode.com";
    case 1:
      return "https://eth.llamarpc.com";
    case 137:
      return "https://polygon-rpc.com";
    default:
      return "";
  }
}

export function getFallbackExplorer(chainId) {
  switch (Number(chainId)) {
    case 56:
      return "https://bscscan.com";
    case 97:
      return "https://testnet.bscscan.com";
    case 1:
      return "https://etherscan.io";
    case 137:
      return "https://polygonscan.com";
    default:
      return "";
  }
}

export function getFallbackChainName(chainId) {
  switch (Number(chainId)) {
    case 56:
      return "BNB Smart Chain";
    case 97:
      return "BNB Smart Chain Testnet";
    case 1:
      return "Ethereum Mainnet";
    case 137:
      return "Polygon Mainnet";
    default:
      return "";
  }
}

export function getFallbackNativeCurrency(chainId) {
  switch (Number(chainId)) {
    case 56:
      return { name: "BNB", symbol: "BNB", decimals: 18 };
    case 97:
      return { name: "BNB", symbol: "tBNB", decimals: 18 };
    case 1:
      return { name: "ETH", symbol: "ETH", decimals: 18 };
    case 137:
      return { name: "MATIC", symbol: "MATIC", decimals: 18 };
    default:
      return { name: "Unknown", symbol: "TKN", decimals: 18 };
  }
}

if (typeof window !== "undefined") {
  window.__tc_fallbacks = {
    getFallbackRpc,
    getFallbackExplorer,
    getFallbackChainName,
    getFallbackNativeCurrency,
  };
}
