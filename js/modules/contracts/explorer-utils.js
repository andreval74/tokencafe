export function getExplorerVerificationUrl(address, chainId) {
  const id = String(chainId);
  const addr = String(address || "");
  const bases = {
    1: "https://etherscan.io",
    56: "https://bscscan.com",
    97: "https://testnet.bscscan.com",
    137: "https://polygonscan.com",
  };
  const base = bases[id] || "https://etherscan.io";
  const clean = base.replace(/\/$/, "");
  return `${clean}/address/${addr}`;
}

export function getExplorerBase(chainId) {
  const id = String(chainId);
  const bases = {
    1: "https://etherscan.io",
    56: "https://bscscan.com",
    97: "https://testnet.bscscan.com",
    137: "https://polygonscan.com",
  };
  return bases[id] || "https://etherscan.io";
}
