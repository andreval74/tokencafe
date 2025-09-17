import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ContractInfo } from '@/shared/types';

const contractsRouter = new Hono<{ Bindings: Env }>();

const contractInfoSchema = z.object({
  address: z.string().min(1),
  chainId: z.string().min(1),
});

// Known token contracts for popular networks
const KNOWN_CONTRACTS: Record<string, Record<string, ContractInfo>> = {
  '1': { // Ethereum Mainnet
    '0xa0b86a33e6224676003d3670f84d8811f75b4d97': {
      address: '0xa0b86a33e6224676003d3670f84d8811f75b4d97',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    '0xdac17f958d2ee523a2206206994597c13d831ec7': {
      address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
    },
    '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
      address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      name: 'Wrapped BTC',
      symbol: 'WBTC',
      decimals: 8,
    },
    '0x6b175474e89094c44da98b954eedeac495271d0f': {
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
    '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b': {
      address: '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b',
      name: 'Cronos',
      symbol: 'CRO',
      decimals: 8,
    },
    '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0': {
      address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
      name: 'Matic Token',
      symbol: 'MATIC',
      decimals: 18,
    },
    '0x514910771af9ca656af840dff83e8264ecf986ca': {
      address: '0x514910771af9ca656af840dff83e8264ecf986ca',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
    },
    '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': {
      address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      name: 'Uniswap',
      symbol: 'UNI',
      decimals: 18,
    },
    '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72': {
      address: '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',
      name: 'Ethereum Name Service',
      symbol: 'ENS',
      decimals: 18,
    },
  },
  '56': { // BSC
    '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': {
      address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 18,
    },
    '0x55d398326f99059ff775485246999027b3197955': {
      address: '0x55d398326f99059ff775485246999027b3197955',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 18,
    },
    '0xe9e7cea3dedca5984780bafc599bd69add087d56': {
      address: '0xe9e7cea3dedca5984780bafc599bd69add087d56',
      name: 'BUSD Token',
      symbol: 'BUSD',
      decimals: 18,
    },
    '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3': {
      address: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3',
      name: 'Dai Token',
      symbol: 'DAI',
      decimals: 18,
    },
    '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c': {
      address: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
      name: 'BTCB Token',
      symbol: 'BTCB',
      decimals: 18,
    },
    '0x2170ed0880ac9a755fd29b2688956bd959f933f8': {
      address: '0x2170ed0880ac9a755fd29b2688956bd959f933f8',
      name: 'Ethereum Token',
      symbol: 'ETH',
      decimals: 18,
    },
    '0xcc42724c6683b7e57334c4e856f4c9965ed682bd': {
      address: '0xcc42724c6683b7e57334c4e856f4c9965ed682bd',
      name: 'Matic Token',
      symbol: 'MATIC',
      decimals: 18,
    },
    '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd': {
      address: '0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
    },
    '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82': {
      address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
      name: 'PancakeSwap Token',
      symbol: 'CAKE',
      decimals: 18,
    },
  },
  '137': { // Polygon
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174': {
      address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': {
      address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
    },
    '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063': {
      address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
    '0x7ceb23fd6e088a8b7174c8d3de2e3287a8c5b0e0': {
      address: '0x7ceb23fd6e088a8b7174c8d3de2e3287a8c5b0e0',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6': {
      address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
      name: 'Wrapped BTC',
      symbol: 'WBTC',
      decimals: 8,
    },
    '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39': {
      address: '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
    },
    '0xb33eaad8d922b1083446dc23f610c2567fb5180f': {
      address: '0xb33eaad8d922b1083446dc23f610c2567fb5180f',
      name: 'Uniswap',
      symbol: 'UNI',
      decimals: 18,
    },
    '0xd6df932a45c0f255f85145f286ea0b292b21c90b': {
      address: '0xd6df932a45c0f255f85145f286ea0b292b21c90b',
      name: 'Aave Token',
      symbol: 'AAVE',
      decimals: 18,
    },
  },
  '42161': { // Arbitrum One
    '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8': {
      address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': {
      address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
    },
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': {
      address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
    '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f': {
      address: '0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f',
      name: 'Wrapped BTC',
      symbol: 'WBTC',
      decimals: 8,
    },
    '0xf97f4df75117a78c1a5a0dbb814af92458539fb4': {
      address: '0xf97f4df75117a78c1a5a0dbb814af92458539fb4',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
    },
    '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0': {
      address: '0xfa7f8980b0f1e64a2062791cc3b0871572f1f7f0',
      name: 'Uniswap',
      symbol: 'UNI',
      decimals: 18,
    },
  },
  '10': { // Optimism
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607': {
      address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': {
      address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
    },
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': {
      address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
    '0x68f180fcce6836688e9084f035309e29bf0a2095': {
      address: '0x68f180fcce6836688e9084f035309e29bf0a2095',
      name: 'Wrapped BTC',
      symbol: 'WBTC',
      decimals: 8,
    },
    '0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6': {
      address: '0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
    },
  },
  '250': { // Fantom
    '0x04068da6c83afcfa0e13ba15a6696662335d5b75': {
      address: '0x04068da6c83afcfa0e13ba15a6696662335d5b75',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    '0x049d68029688eabf473097a2fc38ef61633a3c7a': {
      address: '0x049d68029688eabf473097a2fc38ef61633a3c7a',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
    },
    '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e': {
      address: '0x8d11ec38a3eb5e956b052f67da8bdc9bef8abf3e',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
    '0x321162cd933e2be498cd2267a90534a804051b11': {
      address: '0x321162cd933e2be498cd2267a90534a804051b11',
      name: 'Wrapped BTC',
      symbol: 'WBTC',
      decimals: 8,
    },
    '0xb3654dc3d10ea7645f8319668e8f54d2574fbdc8': {
      address: '0xb3654dc3d10ea7645f8319668e8f54d2574fbdc8',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
    },
  },
  '43114': { // Avalanche
    '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664': {
      address: '0xa7d7079b0fead91f3e65f86e8915cb59c1a4c664',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7': {
      address: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7',
      name: 'Tether USD',
      symbol: 'USDT',
      decimals: 6,
    },
    '0xd586e7f844cea2f87f50152665bcbc2c279d8d70': {
      address: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70',
      name: 'Dai Stablecoin',
      symbol: 'DAI',
      decimals: 18,
    },
    '0x50b7545627a5162f82a992c33b87adc75187b218': {
      address: '0x50b7545627a5162f82a992c33b87adc75187b218',
      name: 'Wrapped BTC',
      symbol: 'WBTC',
      decimals: 8,
    },
    '0x5947bb275c521040051d82396192181b413227a3': {
      address: '0x5947bb275c521040051d82396192181b413227a3',
      name: 'ChainLink Token',
      symbol: 'LINK',
      decimals: 18,
    },
  },
  // Testnets
  '11155111': { // Sepolia
    '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238': {
      address: '0x1c7d4b196cb0c7b01d743fbc6116a902379c7238',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    '0x7169d38820dfd117c3fa1f22a697dba58d90ba06': {
      address: '0x7169d38820dfd117c3fa1f22a697dba58d90ba06',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  '80001': { // Mumbai
    '0x2058a9d7613eee744279e3856ef0eada5fcbaa7e': {
      address: '0x2058a9d7613eee744279e3856ef0eada5fcbaa7e',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    },
    '0xa02f6adc7926efebbd59fd43a84c371ffeadc047': {
      address: '0xa02f6adc7926efebbd59fd43a84c371ffeadc047',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  '97': { // BSC Testnet
    '0x64544969ed7ebf5f083679233325356ebe738930': {
      address: '0x64544969ed7ebf5f083679233325356ebe738930',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 18,
    },
  },
};

async function fetchContractFromRPC(address: string, chainId: string): Promise<ContractInfo | null> {
  try {
    // Basic address validation
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      return null;
    }

    const contractAddress = address.toLowerCase();

    // Check if it's in our known contracts first
    const chainContracts = KNOWN_CONTRACTS[chainId];
    if (chainContracts && chainContracts[contractAddress]) {
      return chainContracts[contractAddress];
    }

    // For unknown contracts, don't return fake data to avoid symbol mismatches
    // Return null so the user can configure manually with correct information
    return null;
  } catch (error) {
    console.error('Error fetching contract info:', error);
    return null;
  }
}

contractsRouter.post('/info', zValidator('json', contractInfoSchema), async (c) => {
  const { address, chainId } = c.req.valid('json');

  try {
    const contractInfo = await fetchContractFromRPC(address, chainId);

    if (!contractInfo) {
      return c.json({
        success: false,
        error: 'Contrato não encontrado ou inválido',
      }, 404);
    }

    return c.json({
      success: true,
      contract: contractInfo,
    });
  } catch (error) {
    console.error('Error getting contract info:', error);
    return c.json({
      success: false,
      error: 'Erro interno do servidor',
    }, 500);
  }
});

export default contractsRouter;
