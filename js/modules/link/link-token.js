import { NetworkManager } from "../../shared/network-manager.js";

const networkManager = new NetworkManager();

function toast(msg, type = "info") {
  if (typeof window.showToast === "function") {
    window.showToast(msg, type);
    return;
  }
  try {
    alert(msg);
  } catch (_) {
    console.log(`[${type}] ${msg}`);
  }
}

function isValidAddress(addr) {
  return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
}

function getFallbackRpc(chainId) {
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

function getFallbackExplorer(chainId) {
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

function getFallbackChainName(chainId) {
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

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text ?? "";
}

function renderSummary(params, network) {
  const address = params.get("address") || "";
  const name = params.get("name") || "";
  const symbol = params.get("symbol") || "";
  const decimals = params.get("decimals") || "";
  const chainId = params.get("chainId") || network?.chainId || "";
  const explorerParam = params.get("explorer") || "";
  const explorer = network?.explorers?.[0]?.url || explorerParam || getFallbackExplorer(chainId);
  const chainName = network?.name || getFallbackChainName(chainId);
  setText("viewAddress", address);
  setText("viewChainName", chainName);
  setText("viewChainId", String(chainId));
  setText("viewName", name);
  setText("viewSymbol", symbol);
  setText("viewDecimals", String(decimals));
  const exp = document.getElementById("viewExplorer");
  if (exp) {
    exp.href = explorer && isValidAddress(address) ? `${String(explorer).replace(/\/$/, "")}/address/${address}` : "#";
    exp.classList.toggle("disabled", !explorer || !isValidAddress(address));
  }
}

async function addToWallet(params, network) {
  try {
    if (!window.ethereum) {
      toast("Carteira não detectada", "warning");
      return;
    }
    const address = params.get("address") || "";
    const symbol = (params.get("symbol") || "TKN").slice(0, 32);
    const decimalsRaw = params.get("decimals") || "18";
    const decimals = parseInt(decimalsRaw, 10);
    const image = params.get("image") || "";
    if (!isValidAddress(address)) {
      toast("Endereço inválido", "error");
      return;
    }
    const chainId = Number(params.get("chainId") || network?.chainId);
    const targetHex = "0x" + Number(chainId).toString(16);
    const currentHex = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
    if (!currentHex || String(parseInt(currentHex, 16)) !== String(chainId)) {
      try {
        await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: targetHex }] });
      } catch (switchErr) {
        if (switchErr && (switchErr.code === 4902 || /unrecognized|unknown/i.test(String(switchErr.message || "")))) {
          const rpcUrls = Array.isArray(network?.rpc) && network.rpc.length ? network.rpc : [getFallbackRpc(chainId)].filter(Boolean);
          const explorerUrl = network?.explorers?.[0]?.url || getFallbackExplorer(chainId);
          const addParams = {
            chainId: targetHex,
            chainName: network?.name || getFallbackChainName(chainId) || `Chain ${chainId}`,
            nativeCurrency: {
              name: network?.nativeCurrency?.name || "Unknown",
              symbol: network?.nativeCurrency?.symbol || "TKN",
              decimals: network?.nativeCurrency?.decimals || 18,
            },
            rpcUrls,
            blockExplorerUrls: explorerUrl ? [explorerUrl] : [],
          };
          await window.ethereum.request({ method: "wallet_addEthereumChain", params: [addParams] });
        } else {
          throw switchErr;
        }
      }
    }
    await window.ethereum.request({
      method: "wallet_watchAsset",
      params: { type: "ERC20", options: { address, symbol, decimals, image } },
    });
    toast("Token enviado para a carteira", "success");
  } catch (e) {
    toast(`Erro ao adicionar token: ${e.message}`, "error");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(location.search);
  try {
    await networkManager.init();
  } catch {}
  let network = null;
  const cId = params.get("chainId");
  if (cId) {
    network = networkManager.getNetworkById(cId);
    const rpc = params.get("rpc");
    const explorer = params.get("explorer");
    if (network) {
      if (rpc && (!Array.isArray(network.rpc) || network.rpc.length === 0)) network.rpc = [rpc];
      if (explorer && (!Array.isArray(network.explorers) || network.explorers.length === 0)) network.explorers = [{ url: explorer }];
    }
  }
  renderSummary(params, network);
  const addBtn = document.getElementById("addToWalletButton");
  if (addBtn) {
    addBtn.addEventListener("click", () => addToWallet(params, network));
  }
});
