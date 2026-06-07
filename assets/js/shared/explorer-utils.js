// Explorer URL helpers — fonte única para todo o sistema
// Uso: import { getExplorerContractUrl, getExplorerTxUrl, ... } from "../../shared/explorer-utils.js"

const EXPLORER_BASES = {
  1:        "https://etherscan.io",
  56:       "https://bscscan.com",
  97:       "https://testnet.bscscan.com",
  137:      "https://polygonscan.com",
  8453:     "https://basescan.org",
  11155111: "https://sepolia.etherscan.io",
};

function base(chainId) {
  return (EXPLORER_BASES[chainId] || EXPLORER_BASES[1]).replace(/\/$/, "");
}

export function getExplorerBase(chainId) {
  return base(chainId);
}

export function getExplorerContractUrl(contractAddress, chainId) {
  return `${base(chainId)}/address/${contractAddress || ""}`;
}

export function getExplorerTxUrl(txHash, chainId) {
  return `${base(chainId)}/tx/${txHash || ""}`;
}

export function getExplorerVerificationUrl(contractAddress, chainId) {
  return `${base(chainId)}/address/${contractAddress || ""}#code`;
}
