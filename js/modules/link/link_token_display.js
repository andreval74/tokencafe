// Exibição de Token via Link Compartilhável (TokenCafe)
// Lê parâmetros da URL e preenche a UI; oferece adicionar à carteira

import { NetworkManager } from "../../shared/network-manager.js";

const networkManager = new NetworkManager();

function qs(id) {
  return document.getElementById(id);
}
function setText(id, v) {
  const el = qs(id);
  if (el) el.textContent = v ?? "";
}
function show(id) {
  const el = qs(id);
  if (el) el.classList.remove("d-none");
}
function hide(id) {
  const el = qs(id);
  if (el) el.classList.add("d-none");
}
function isValidAddress(addr) {
  return typeof addr === "string" && /^0x[a-fA-F0-9]{40}$/.test(addr);
}
function toast(msg, type = "info") {
  if (window.showToast) window.showToast(msg, type);
  else console.log(`[${type}] ${msg}`);
}

async function fetchMissingTokenFields(address, rpc) {
  if (typeof ethers === "undefined" || !rpc) return {};
  try {
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    const abi = ["function name() view returns (string)", "function symbol() view returns (string)", "function decimals() view returns (uint8)"];
    const c = new ethers.Contract(address, abi, provider);
    const [name, symbol, decimals] = await Promise.all([c.name().catch(() => ""), c.symbol().catch(() => ""), c.decimals().catch(() => 18)]);
    return { name, symbol, decimals };
  } catch {
    return {};
  }
}

async function init() {
  await networkManager.init().catch(() => {});
  const p = new URLSearchParams(location.search);
  const address = (p.get("address") || "").trim();
  const chainId = Number(p.get("chainId") || "0");
  let name = (p.get("name") || "").trim();
  let symbol = (p.get("symbol") || "").trim();
  let decimals = p.get("decimals");
  const image = (p.get("image") || "").trim();
  const rpc = (p.get("rpc") || "").trim();
  const explorer = (p.get("explorer") || "").trim();

  if (!isValidAddress(address) || !chainId) {
    show("error-state");
    setText("error-message", "Link inválido: endereço ou rede ausente");
    return;
  }

  if (!name || !symbol || !decimals) {
    const missing = await fetchMissingTokenFields(address, rpc);
    name = name || missing.name || "";
    symbol = symbol || missing.symbol || "";
    decimals = decimals || String(missing.decimals ?? 18);
  }

  const net = networkManager.getNetworkById(chainId);
  const chainName = net?.name ? `${net.name} (${chainId})` : `Chain ID ${chainId}`;
  setText("chain-name", chainName);
  setText("token-name", name || "-");
  setText("token-symbol", symbol || "-");
  setText("token-decimals", decimals || "18");
  setText("contract-address", address);
  hide("error-state");
  show("token-data");

  const copyBtn = qs("copyContractAddressButton");
  copyBtn?.addEventListener("click", () => {
    navigator.clipboard.writeText(address).then(() => toast("Endereço copiado", "success"));
  });

  const addBtn = qs("addToWalletButton");
  addBtn?.addEventListener("click", async () => {
    try {
      if (!window.ethereum) {
        toast("Carteira não detectada", "warning");
        return;
      }
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address,
            symbol: symbol || "TKN",
            decimals: parseInt(decimals || "18", 10),
            image,
          },
        },
      });
      toast("Token enviado para a carteira", "success");
    } catch (e) {
      toast(`Erro: ${e.message}`, "error");
    }
  });

  const explorerLink = qs("openExplorerLink");
  if (explorerLink && explorer) {
    explorerLink.classList.remove("d-none");
    explorerLink.addEventListener("click", () => {
      const url = `${explorer.replace(/\/$/, "")}/token/${address}`;
      window.open(url, "_blank");
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
