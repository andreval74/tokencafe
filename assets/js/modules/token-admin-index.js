import { getApiBase } from "../shared/verify-utils.js";
import { registerModuleActions } from "../shared/module-actions.js";
import { populateContractInteract } from "../shared/contract-interact.js";
import { networkManager } from "../shared/network-manager.js";
import { getFallbackRpc } from "../shared/network-fallback.js";
import { loadContractFiles } from "../shared/file-viewer.js";

// -----------------------------------------------------------------------------
// Elementos da página
// -----------------------------------------------------------------------------

const abiStatus       = document.getElementById("ta_abiStatus");
const abiSpinner      = document.getElementById("ta_abiSpinner");
const abiStatusText   = document.getElementById("ta_abiStatusText");
const interactSection = document.getElementById("ta_interactSection");
const readContainer   = document.getElementById("ta_readFunctions");
const writeContainer  = document.getElementById("ta_writeFunctions");
const writeNotice     = document.getElementById("ta_writeWalletNotice");

// -----------------------------------------------------------------------------
// Estado
// -----------------------------------------------------------------------------

let currentChainId = null;
let currentContract = null;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function showAbiStatus(msg, loading = false) {
  if (!abiStatus) return;
  abiStatus.classList.toggle("d-none", !msg);
  if (abiSpinner) abiSpinner.classList.toggle("d-none", !loading);
  if (abiStatusText) abiStatusText.textContent = msg || "";
}

function resetInteract() {
  currentContract = null;
  interactSection?.classList.add("d-none");
  if (readContainer)  readContainer.innerHTML = "";
  if (writeContainer) writeContainer.innerHTML = "";
  writeNotice?.classList.add("d-none");
  document.getElementById("files-section")?.classList.add("d-none");
  showAbiStatus("");
}

// -----------------------------------------------------------------------------
// Verificação de propriedade do contrato (owner())
// -----------------------------------------------------------------------------

async function callOwnerFunction(address, chainId) {
  const data = "0x8da5cb5b"; // selector de owner()
  const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));

  // MetaMask primeiro se estiver na mesma rede
  if (window.ethereum?.request) {
    try {
      const curChain = await window.ethereum.request({ method: "eth_chainId" });
      if (parseInt(curChain, 16) === Number(chainId)) {
        const result = await Promise.race([
          window.ethereum.request({ method: "eth_call", params: [{ to: address, data }, "latest"] }),
          timeout(3000),
        ]);
        if (result && result !== "0x" && result.length >= 66) {
          return "0x" + result.slice(-40);
        }
        return null;
      }
    } catch (_) {}
  }

  // Fallback via RPC
  let rpc = "";
  try { rpc = await getFallbackRpc(chainId) || ""; } catch (_) {}
  if (!rpc) {
    const net = networkManager?.getNetworkById?.(Number(chainId));
    rpc = (Array.isArray(net?.rpc) ? net.rpc[0] : net?.rpc) || "";
  }
  if (!rpc) return null;

  try {
    const res = await Promise.race([
      fetch(rpc, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: address, data }, "latest"] }),
      }),
      timeout(3000),
    ]);
    const js = await res.json();
    if (js?.result && js.result !== "0x" && js.result.length >= 66) {
      return "0x" + js.result.slice(-40);
    }
  } catch (_) {}
  return null;
}

async function checkOwnership(address, chainId) {
  try {
    const ownerAddress = await callOwnerFunction(address, chainId);
    if (!ownerAddress) {
      return { isOwner: null, ownerAddress: null, message: "Contrato não possui função owner() — acesso liberado." };
    }
    if (!window.ethereum?.request) {
      return { isOwner: null, ownerAddress, message: "Carteira não conectada — conecte o MetaMask para verificar permissão." };
    }
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    const wallet = accounts?.[0]?.toLowerCase();
    if (!wallet) {
      return { isOwner: null, ownerAddress, message: "Carteira não conectada — conecte o MetaMask para verificar permissão." };
    }
    const isOwner = wallet === ownerAddress.toLowerCase();
    return {
      isOwner,
      ownerAddress,
      message: isOwner
        ? "Você é o proprietário deste contrato."
        : "Você não é o proprietário deste contrato e não pode enviar transações.",
    };
  } catch (_) {
    return { isOwner: null, ownerAddress: null, message: "Não foi possível verificar o proprietário." };
  }
}

// -----------------------------------------------------------------------------
// Carrega ABI e popula abas Ler / Escrever
// -----------------------------------------------------------------------------

async function loadAbiAndInteract(chainId, address) {
  showAbiStatus("Carregando ABI do contrato...", true);

  try {
    const apiBase = getApiBase();
    const url = `${apiBase}/api/explorer-getsourcecode?chainId=${chainId}&address=${encodeURIComponent(address)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!data?.success) throw new Error(data?.error || "Resposta inválida da API");

    const abiRaw = data.explorer?.abi || null;

    if (!abiRaw || abiRaw === "Contract source code not verified") {
      throw new Error("ABI não disponível — contrato não verificado nesta rede.");
    }

    const explorerSrc  = String(data.explorer?.sourceCode || "").trim();
    const explorerName = String(data.explorer?.contractName || "Contract").trim();
    const abiStr = typeof abiRaw === "string" ? abiRaw : JSON.stringify(abiRaw, null, 2);
    loadContractFiles({ sol: explorerSrc, abi: abiStr, contractName: explorerName }, { reset: true });

    showAbiStatus("Verificando proprietário do contrato...", true);
    const ownerCheck = await checkOwnership(address, chainId);
    showAbiStatus("");

    await populateContractInteract({
      abiRaw, chainId, address,
      readContainer, writeContainer,
      interactSection, writeNotice,
      ownerCheck,
      tokenHints: currentContract,
    });

  } catch (e) {
    showAbiStatus(`Erro: ${e?.message || String(e)}`);
  }
}

// -----------------------------------------------------------------------------
// Eventos
// -----------------------------------------------------------------------------

registerModuleActions({
  onClear: () => {
    resetInteract();
    const addrField = document.getElementById("f_address");
    if (addrField) addrField.value = "";
    const searchBtn = document.getElementById("contractSearchBtn");
    if (searchBtn) {
      searchBtn.removeAttribute("data-mode");
      searchBtn.classList.remove("tc-action-clear");
      searchBtn.classList.add("tc-action-search");
      const icon = searchBtn.querySelector("i");
      if (icon) icon.className = "bi bi-search";
    }
  },
});

document.addEventListener("network:selected", (e) => {
  const net = e.detail?.network;
  if (!net) return;
  currentChainId = net.chainId || null;
  resetInteract();
});

document.addEventListener("network:cleared", () => {
  currentChainId = null;
  resetInteract();
});

document.addEventListener("contract:found", (e) => {
  const contract = e.detail?.contract;
  if (!contract) return;

  if (contract.isContract === false) {
    showAbiStatus("Endereço identificado como Carteira (EOA) — sem contrato para interagir.");
    return;
  }

  const chainId = contract.chainId || currentChainId;
  const address = contract.contractAddress || contract.address || "";
  if (!chainId || !address) return;

  resetInteract();
  currentContract = contract;
  loadAbiAndInteract(chainId, address);
});

document.addEventListener("contract:clear", () => {
  resetInteract();
});
