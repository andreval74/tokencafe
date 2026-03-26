// Explorer URL helpers for TokenCafe (ported from xcafe logic)
// Provides contract, transaction, and verification URLs per chainId

export function getExplorerContractUrl(contractAddress, chainId) {
  const addr = contractAddress || "";
  const map = {
    1: `https://etherscan.io/address/${addr}`,
    56: `https://bscscan.com/address/${addr}`,
    97: `https://testnet.bscscan.com/address/${addr}`,
    137: `https://polygonscan.com/address/${addr}`,
    8453: `https://basescan.org/address/${addr}`,
    11155111: `https://sepolia.etherscan.io/address/${addr}`,
  };
  return map[chainId] || `https://etherscan.io/address/${addr}`;
}

export function getExplorerTxUrl(txHash, chainId) {
  const tx = txHash || "";
  const map = {
    1: `https://etherscan.io/tx/${tx}`,
    56: `https://bscscan.com/tx/${tx}`,
    97: `https://testnet.bscscan.com/tx/${tx}`,
    137: `https://polygonscan.com/tx/${tx}`,
    8453: `https://basescan.org/tx/${tx}`,
    11155111: `https://sepolia.etherscan.io/tx/${tx}`,
  };
  return map[chainId] || `https://etherscan.io/tx/${tx}`;
}

export function getExplorerVerificationUrl(contractAddress, chainId) {
  const addr = contractAddress || "";
  const map = {
    1: `https://etherscan.io/address/${addr}#code`,
    56: `https://bscscan.com/address/${addr}#code`,
    97: `https://testnet.bscscan.com/address/${addr}#code`,
    137: `https://polygonscan.com/address/${addr}#code`,
    8453: `https://basescan.org/address/${addr}#code`,
    11155111: `https://sepolia.etherscan.io/address/${addr}#code`,
  };
  return map[chainId] || `https://etherscan.io/address/${addr}#code`;
}
