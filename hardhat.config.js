require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const accounts = process.env.DEPLOYER_PRIVATE_KEY
  ? [`0x${process.env.DEPLOYER_PRIVATE_KEY.replace(/^0x/, "")}`]
  : [];

/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },

  networks: {
    hardhat: {},

    // Testnets
    sepolia: {
      url: process.env.RPC_SEPOLIA || "https://rpc.sepolia.org",
      accounts,
    },
    mumbai: {
      url: process.env.RPC_MUMBAI || "https://rpc-mumbai.maticvigil.com",
      accounts,
    },
    bscTestnet: {
      url: process.env.RPC_BSC_TESTNET || "https://data-seed-prebsc-1-s1.binance.org:8545",
      accounts,
    },

    // Mainnets
    ethereum: {
      url: process.env.RPC_ETHEREUM || "https://eth.llamarpc.com",
      accounts,
    },
    polygon: {
      url: process.env.RPC_POLYGON || "https://polygon-rpc.com",
      accounts,
    },
    bsc: {
      url: process.env.RPC_BSC || "https://bsc-dataseed.binance.org",
      accounts,
    },
    arbitrum: {
      url: process.env.RPC_ARBITRUM || "https://arb1.arbitrum.io/rpc",
      accounts,
    },
    avalanche: {
      url: process.env.RPC_AVALANCHE || "https://api.avax.network/ext/bc/C/rpc",
      accounts,
    },
  },

  etherscan: {
    apiKey: {
      mainnet:    process.env.ETHERSCAN_API_KEY  || "",
      sepolia:    process.env.ETHERSCAN_API_KEY  || "",
      polygon:    process.env.POLYGONSCAN_API_KEY || "",
      bsc:        process.env.BSCSCAN_API_KEY    || "",
      bscTestnet: process.env.BSCSCAN_API_KEY    || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY  || "",
      avalanche:  process.env.SNOWTRACE_API_KEY  || "",
    },
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    coinmarketcap: process.env.CMC_API_KEY || "",
  },

  paths: {
    sources:   "./contracts/core",  // apenas contratos principais; legados ficam em contracts/
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};
