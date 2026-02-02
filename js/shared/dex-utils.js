export const DEX_CONFIG = {
    56: {
        name: "PancakeSwap V2",
        factory: "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73",
        weth: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", // WBNB
        usdt: "0x55d398326f99059fF775485246999027B3197955", // USDT-BEP20
        explorerToken: "https://bscscan.com/token/",
        explorerPair: "https://bscscan.com/address/"
    },
    97: {
        name: "PancakeSwap Testnet",
        factory: "0x6725F303b657a9451d8BA641348b6761a6CC7a17",
        weth: "0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd", // WBNB Testnet
        usdt: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd", // USDT Testnet (Exemplo comum)
        explorerToken: "https://testnet.bscscan.com/token/",
        explorerPair: "https://testnet.bscscan.com/address/"
    },
    1: {
        name: "Uniswap V2",
        factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
        weth: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        usdt: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        explorerToken: "https://etherscan.io/token/",
        explorerPair: "https://etherscan.io/address/"
    }
};

const PAIR_CODE_HASHES = {
    56: "0x00fb7f630766e6a796048ea87d01acd3068e8ff67d078148a3fa3f0438570530", // Pancake V2
    97: "0xd0d4c4cd0848c93cb4fd1f4988553f4434f201e27e28b232e42ce195803fb39a", // Pancake Testnet (Validar hash) - Usando RPC call é mais seguro
    1: "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // Uniswap V2
};

async function rpcCall(rpcUrl, method, params) {
    try {
        const resp = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params })
        });
        const json = await resp.json();
        return json.result;
    } catch (e) {
        return null;
    }
}

export async function findLiquidityPair(chainId, tokenAddress, rpcUrl) {
    const config = DEX_CONFIG[chainId];
    if (!config) return null;

    // Tentar par com WETH (WBNB)
    const pairWeth = await getPair(rpcUrl, config.factory, tokenAddress, config.weth);
    if (pairWeth && pairWeth !== "0x0000000000000000000000000000000000000000") {
        return {
            pairAddress: pairWeth,
            symbol: "BNB/ETH", // Genérico
            dexName: config.name,
            quoteToken: config.weth,
            type: "V2"
        };
    }

    // Tentar par com USDT se disponível
    if (config.usdt) {
        const pairUsdt = await getPair(rpcUrl, config.factory, tokenAddress, config.usdt);
        if (pairUsdt && pairUsdt !== "0x0000000000000000000000000000000000000000") {
            return {
                pairAddress: pairUsdt,
                symbol: "USDT",
                dexName: config.name,
                quoteToken: config.usdt,
                type: "V2"
            };
        }
    }

    return null;
}

async function getPair(rpcUrl, factory, tokenA, tokenB) {
    // getPair(address,address) selector: 0xe6a43905
    const data = "0xe6a43905" + 
        tokenA.replace("0x", "").padStart(64, "0").toLowerCase() + 
        tokenB.replace("0x", "").padStart(64, "0").toLowerCase();
    
    const result = await rpcCall(rpcUrl, "eth_call", [{
        to: factory,
        data: data
    }, "latest"]);

    if (!result || result === "0x") return null;
    
    // Parse address from 32-byte word (last 40 chars)
    // Result ex: 0x000000000000000000000000<address>
    const clean = result.replace(/^0x/, "");
    if (clean.length < 40) return null; // Invalid
    
    // Extract last 40 chars
    const addr = "0x" + clean.slice(-40);
    
    // Check for zero address
    if (/^0x0{40}$/.test(addr)) return null;
    
    return addr;
}
