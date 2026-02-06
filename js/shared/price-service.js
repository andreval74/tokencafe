
/**
 * Serviço para buscar preços de criptomoedas
 * Utiliza CoinGecko e Binance API como fallbacks
 */

const CACHE_DURATION = 60000; // 1 minuto de cache
const PRICE_CACHE = new Map();

export class PriceService {
    
    /**
     * Obtém o preço da moeda nativa da rede em USD
     * @param {number} chainId - ID da rede
     * @returns {Promise<number>} Preço em USD ou 0 se falhar
     */
    static async getNativeCoinPrice(chainId) {
        const symbol = this.getNativeSymbol(chainId);
        if (!symbol) return 0;

        // Check cache
        const cached = PRICE_CACHE.get(symbol);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            return cached.price;
        }

        let price = 0;
        
        // Tenta Binance API primeiro (mais rápido/confiável para majors)
        price = await this.fetchBinancePrice(symbol);
        
        // Fallback CoinGecko
        if (!price) {
            price = await this.fetchCoinGeckoPrice(symbol);
        }

        if (price > 0) {
            PRICE_CACHE.set(symbol, { price, timestamp: Date.now() });
        }

        return price;
    }

    static getNativeSymbol(chainId) {
        const id = parseInt(chainId);
        switch(id) {
            case 1: return "ETH"; // Ethereum
            case 56: return "BNB"; // BSC
            case 137: return "MATIC"; // Polygon
            case 43114: return "AVAX"; // Avalanche
            case 250: return "FTM"; // Fantom
            case 42161: return "ETH"; // Arbitrum (ETH)
            case 10: return "ETH"; // Optimism (ETH)
            case 8453: return "ETH"; // Base (ETH)
            case 324: return "ETH"; // zkSync (ETH)
            case 100: return "XDAI"; // Gnosis (pegged to DAI/USD approx, but technically xDai) -> DAI ~ 1 USD
            // Testnets
            case 97: return "BNB";
            case 11155111: return "ETH";
            case 5: return "ETH";
            case 80001: return "MATIC";
            default: return "ETH"; // Default assumption or return null
        }
    }

    static async fetchBinancePrice(symbol) {
        try {
            // Binance symbols are usually SYMBOLUSDT (e.g., BTCUSDT, ETHUSDT)
            // Handle exceptions if needed (MATIC -> POL in some contexts, but Binance still lists MATICUSDT usually)
            let pair = `${symbol}USDT`;
            if (symbol === "MATIC") pair = "MATICUSDT"; // Check if POL is used now? MATIC is still standard ticker for price
            
            const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${pair}`);
            if (!res.ok) return 0;
            const data = await res.json();
            return parseFloat(data.price);
        } catch (e) {
            // console.warn("Binance price fetch failed:", e);
            return 0;
        }
    }

    static async fetchCoinGeckoPrice(symbol) {
        try {
            const idMap = {
                "ETH": "ethereum",
                "BNB": "binancecoin",
                "MATIC": "matic-network",
                "AVAX": "avalanche-2",
                "FTM": "fantom",
                "XDAI": "xdai"
            };
            const id = idMap[symbol];
            if (!id) return 0;

            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
            if (!res.ok) return 0;
            const data = await res.json();
            return data[id]?.usd || 0;
        } catch (e) {
            // console.warn("CoinGecko price fetch failed:", e);
            return 0;
        }
    }
}
