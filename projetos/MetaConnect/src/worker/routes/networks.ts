import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { NetworkSearchResult } from '@/shared/types';

const networksRouter = new Hono<{ Bindings: Env }>();

// Known networks database - simplified version
const KNOWN_NETWORKS: Record<number, NetworkSearchResult> = {
  1: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    currency: 'ETH',
    rpcUrls: ['https://eth-mainnet.g.alchemy.com/v2/demo', 'https://mainnet.infura.io/v3/demo'],
    explorers: ['https://etherscan.io'],
  },
  11155111: {
    chainId: 11155111,
    name: 'Sepolia test network',
    currency: 'SEP',
    rpcUrls: ['https://rpc.sepolia.org', 'https://sepolia.infura.io/v3/demo'],
    explorers: ['https://sepolia.etherscan.io'],
  },
  56: {
    chainId: 56,
    name: 'BNB Smart Chain',
    currency: 'BNB',
    rpcUrls: ['https://bsc-dataseed.binance.org/', 'https://bsc-dataseed1.defibit.io/'],
    explorers: ['https://bscscan.com'],
  },
  137: {
    chainId: 137,
    name: 'Polygon Mainnet',
    currency: 'MATIC',
    rpcUrls: ['https://polygon-rpc.com/', 'https://rpc-mainnet.maticvigil.com/'],
    explorers: ['https://polygonscan.com'],
  },
  42161: {
    chainId: 42161,
    name: 'Arbitrum One',
    currency: 'ETH',
    rpcUrls: ['https://arb1.arbitrum.io/rpc', 'https://arbitrum-mainnet.infura.io/v3/demo'],
    explorers: ['https://arbiscan.io'],
  },
  10: {
    chainId: 10,
    name: 'Optimism',
    currency: 'ETH',
    rpcUrls: ['https://mainnet.optimism.io', 'https://optimism-mainnet.infura.io/v3/demo'],
    explorers: ['https://optimistic.etherscan.io'],
  },
  250: {
    chainId: 250,
    name: 'Fantom Opera',
    currency: 'FTM',
    rpcUrls: ['https://rpc.ftm.tools/', 'https://fantom-mainnet.gateway.pokt.network/v1/lb/62759259ea1b320039c9e7ac'],
    explorers: ['https://ftmscan.com'],
  },
  43114: {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    currency: 'AVAX',
    rpcUrls: ['https://api.avax.network/ext/bc/C/rpc', 'https://avalanche-mainnet.infura.io/v3/demo'],
    explorers: ['https://snowtrace.io'],
  },
  // Layer 2 & More chains
  25: {
    chainId: 25,
    name: 'Cronos',
    currency: 'CRO',
    rpcUrls: ['https://evm.cronos.org', 'https://evm-cronos.crypto.org'],
    explorers: ['https://cronoscan.com'],
  },
  1284: {
    chainId: 1284,
    name: 'Moonbeam',
    currency: 'GLMR',
    rpcUrls: ['https://rpc.api.moonbeam.network', 'https://moonbeam.public.blastapi.io'],
    explorers: ['https://moonscan.io'],
  },
  1285: {
    chainId: 1285,
    name: 'Moonriver',
    currency: 'MOVR',
    rpcUrls: ['https://rpc.api.moonriver.moonbeam.network', 'https://moonriver.public.blastapi.io'],
    explorers: ['https://moonriver.moonscan.io'],
  },
  100: {
    chainId: 100,
    name: 'Gnosis',
    currency: 'xDAI',
    rpcUrls: ['https://rpc.gnosischain.com', 'https://rpc.ankr.com/gnosis'],
    explorers: ['https://gnosisscan.io'],
  },
  42220: {
    chainId: 42220,
    name: 'Celo',
    currency: 'CELO',
    rpcUrls: ['https://forno.celo.org', 'https://rpc.ankr.com/celo'],
    explorers: ['https://celoscan.io'],
  },
  128: {
    chainId: 128,
    name: 'Huobi ECO Chain',
    currency: 'HT',
    rpcUrls: ['https://http-mainnet.hecochain.com', 'https://http-mainnet-node.huobichain.com'],
    explorers: ['https://hecoinfo.com'],
  },
  1666600000: {
    chainId: 1666600000,
    name: 'Harmony One',
    currency: 'ONE',
    rpcUrls: ['https://api.harmony.one', 'https://a.api.s0.t.hmny.io'],
    explorers: ['https://explorer.harmony.one'],
  },
  // Testnets
  80001: {
    chainId: 80001,
    name: 'Polygon Mumbai',
    currency: 'MATIC',
    rpcUrls: ['https://rpc-mumbai.maticvigil.com/', 'https://polygon-mumbai.infura.io/v3/demo'],
    explorers: ['https://mumbai.polygonscan.com'],
  },
  97: {
    chainId: 97,
    name: 'BNB Smart Chain Testnet',
    currency: 'tBNB',
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/', 'https://data-seed-prebsc-2-s1.binance.org:8545/'],
    explorers: ['https://testnet.bscscan.com'],
  },
  421613: {
    chainId: 421613,
    name: 'Arbitrum Goerli',
    currency: 'AGOR',
    rpcUrls: ['https://goerli-rollup.arbitrum.io/rpc', 'https://arbitrum-goerli.infura.io/v3/demo'],
    explorers: ['https://goerli.arbiscan.io'],
  },
  420: {
    chainId: 420,
    name: 'Optimism Goerli',
    currency: 'ETH',
    rpcUrls: ['https://goerli.optimism.io', 'https://optimism-goerli.infura.io/v3/demo'],
    explorers: ['https://goerli-optimism.etherscan.io'],
  },
  43113: {
    chainId: 43113,
    name: 'Avalanche Fuji',
    currency: 'AVAX',
    rpcUrls: ['https://api.avax-test.network/ext/bc/C/rpc', 'https://avalanche-fuji.infura.io/v3/demo'],
    explorers: ['https://testnet.snowtrace.io'],
  },
  4002: {
    chainId: 4002,
    name: 'Fantom Testnet',
    currency: 'FTM',
    rpcUrls: ['https://rpc.testnet.fantom.network/', 'https://fantom-testnet.public.blastapi.io'],
    explorers: ['https://testnet.ftmscan.com'],
  },
};

const searchSchema = z.object({
  query: z.string().min(1),
  searchBy: z.enum(['name', 'chainId']),
});

networksRouter.post('/search', zValidator('json', searchSchema), async (c) => {
  const { query, searchBy } = c.req.valid('json');

  try {
    let results: NetworkSearchResult[] = [];

    if (searchBy === 'chainId') {
      const chainId = parseInt(query);
      if (!isNaN(chainId) && KNOWN_NETWORKS[chainId]) {
        results = [KNOWN_NETWORKS[chainId]];
      }
    } else {
      // Search by name
      const searchTerm = query.toLowerCase();
      results = Object.values(KNOWN_NETWORKS).filter(network =>
        network.name.toLowerCase().includes(searchTerm) ||
        network.currency.toLowerCase().includes(searchTerm)
      );
    }

    return c.json({
      success: true,
      networks: results,
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Erro na busca de redes',
    }, 500);
  }
});

export default networksRouter;
