import { networkManager } from "../../shared/network-manager.js";
import { SharedUtilities } from "../../core/shared_utilities_es6.js";
import { getFallbackExplorer, getFallbackRpc } from "../../shared/network-fallback.js";

const getWalletConnector = () => window.walletConnector;
const utils = new SharedUtilities();
const isValidAddress = (addr) => utils.isValidEthereumAddress(addr);

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await networkManager?.init?.();
  } catch (_) {}
  initWalletManager();
  await initViewOnlyFromParams();
});

function initWalletManager() {
  setupCopyButton("copyAddressBtn", "walletAddress");
  setupCopyButton("copyChainIdBtn", "chainId");
  setupCopyButton("copyRpcBtn", "rpcUrl");

  document.getElementById("openExplorerBtn")?.addEventListener("click", () => {
    const url = getTextValue("explorerUrlDisplay");
    if (url && url !== "-") window.open(url, "_blank");
  });

  document.getElementById("viewAddressBtn")?.addEventListener("click", () => {
    const url = getTextValue("explorerUrlDisplay");
    const addr = getTextValue("walletAddress");
    if (url && addr && url !== "-" && addr !== "-") {
      // Handle trailing slash
      const baseUrl = url.endsWith("/") ? url.slice(0, -1) : url;
      window.open(`${baseUrl}/address/${addr}`, "_blank");
    }
  });

  document.getElementById("shareAddressBtn")?.addEventListener("click", () => {
    const addr = getTextValue("walletAddress");
    if (addr && addr !== "-" && navigator.share) {
      navigator.share({ title: "Minha Carteira", text: addr }).catch(() => {});
    } else if (addr && addr !== "-") {
      if (window.copyToClipboard) {
        window.copyToClipboard(addr);
      }
    }
  });

  // Limpar Dados Button (agora Home)
  const btnClear = document.getElementById("btnClearAll") || document.getElementById("btn-clear-data");
  btnClear?.addEventListener("click", async () => {
    const wc = getWalletConnector();
    if (wc && typeof wc.disconnect === "function") {
      await wc.disconnect();
    }

    // Usa utilitário global se disponível, senão usa implementação local
    if (window.clearForm) {
      window.clearForm("wallet-info-section");
    }

    clearUI();
    if (window.showFormSuccess) window.showFormSuccess("Dados da carteira limpos com sucesso.");
  });

  // Listen for wallet events
  document.addEventListener("wallet:connected", (e) => updateUI(e.detail));
  document.addEventListener("wallet:disconnected", clearUI);
  document.addEventListener("wallet:chainChanged", async () => {
    // Refresh data
    const wc = getWalletConnector();
    if (wc) {
      const status = wc.getStatus();
      updateUI(status);
    }
  });

  // Initial check
  setTimeout(async () => {
    const wc = getWalletConnector();
    
    // Force check wallet status immediately
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
                // Se já tem contas conectadas no provider, força atualização
                if (wc) {
                    try {
                        if (typeof wc.setAccount === "function") {
                            await wc.setAccount(accounts[0]);
                        } else {
                            wc.currentAccount = accounts[0];
                        }
                    } catch (_) {}
                    // Força atualização do estado interno do conector
                    await wc.updateNetworkInfo();
                    await wc.updateBalance();
                    
                    const status = wc.getStatus();
                    
                    // Fallback se o conector não tiver atualizado
                    if (!status.account) status.account = accounts[0];
                    if (!status.chainId && window.ethereum) {
                        try {
                            status.chainId = await window.ethereum.request({ method: 'eth_chainId' });
                        } catch (e) { console.error(e); }
                    }
                    
                    updateUI(status);
                }
            }
        } catch (e) {
            console.error("Error checking initial status:", e);
        }
    } else if (wc) {
      const status = wc.getStatus();
      if (status.connected) {
        updateUI(status);
      }
    }
  }, 500);
}

function parseChainId(raw) {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (v.startsWith("0x")) {
    const n = parseInt(v, 16);
    return Number.isFinite(n) ? n : null;
  }
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function formatWeiToNative(hexWei, decimals = 18, maxFrac = 6) {
  try {
    const bi = BigInt(hexWei);
    const base = 10n ** BigInt(decimals);
    const intPart = bi / base;
    const fracPart = bi % base;
    let frac = fracPart.toString().padStart(decimals, "0").slice(0, Math.max(0, maxFrac));
    frac = frac.replace(/0+$/u, "");
    return frac ? `${intPart.toString()}.${frac}` : intPart.toString();
  } catch (_) {
    return "-";
  }
}

async function fetchJsonWithTimeout(url, body, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchNativeBalance(rpcUrl, address) {
  if (!rpcUrl) return null;
  const body = { jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [String(address), "latest"] };
  const js = await fetchJsonWithTimeout(rpcUrl, body, 6000);
  const result = js?.result ? String(js.result) : "";
  if (!result || result === "0x") return "0x0";
  return result;
}

async function initViewOnlyFromParams() {
  try {
    const p = new URLSearchParams(window.location.search);
    const addr = p.get("address");
    const chainId = parseChainId(p.get("chainId"));
    const explorer = p.get("explorer") || "";
    if (!addr) return;
    await openAddressView(addr, chainId, explorer);
  } catch (_) {}
}

async function openAddressView(addressRaw, chainId, explorerOverride) {
  const address = String(addressRaw || "").trim();
  if (!isValidAddress(address)) {
    if (window.showFormError) window.showFormError("Endereço inválido.");
    return;
  }
  if (!chainId) {
    if (window.showFormError) window.showFormError("Rede não informada.");
    return;
  }

  const netMgr = networkManager || window.networkManager;
  const net = netMgr?.getNetworkById?.(chainId) || null;

  const name = net?.name || `Rede ${chainId}`;
  const nativeName = net?.nativeCurrency?.name || "Moeda Nativa";
  const nativeSymbol = net?.nativeCurrency?.symbol || "ETH";

  let rpc = (Array.isArray(net?.rpc) && net.rpc.length ? net.rpc[0] : "") || "";
  let explorer = net?.explorers?.[0]?.url || "";

  if (!rpc) rpc = getFallbackRpc(chainId);
  if (!explorer) explorer = getFallbackExplorer(chainId);
  if (explorerOverride) explorer = explorerOverride;

  const empty = document.getElementById("wallet-empty-state");
  if (empty) empty.classList.add("d-none");
  const section = document.getElementById("wallet-info-section");
  if (section) section.classList.remove("d-none");
  const statusEl = document.getElementById("walletStatusLabel");
  if (statusEl) {
    statusEl.classList.remove("text-success");
    statusEl.classList.add("text-info");
    statusEl.innerHTML = '<i class="bi bi-eye me-1"></i>Visualização pública';
  }

  setValue("walletAddress", address);
  setValue("chainId", chainId);
  setValue("networkName", name);
  setValue("nativeCurrency", nativeName);
  setValue("currencySymbol", nativeSymbol);
  setValue("rpcUrl", rpc || "-");
  setValue("explorerUrlDisplay", explorer || "-");

  if (Array.isArray(net?.rpc) && net.rpc.length > 1) setValue("customRpcs", net.rpc.slice(1).join("\n"));
  else setValue("customRpcs", "Nenhum RPC personalizado configurado");

  const explorerLink = document.getElementById("explorerLink");
  if (explorerLink) {
    if (explorer) {
      explorerLink.href = explorer;
      explorerLink.classList.remove("d-none");
    } else {
      explorerLink.href = "#";
      explorerLink.classList.add("d-none");
    }
  }

  setValue("balance", "Carregando...");
  const balHex = await fetchNativeBalance(rpc, address);
  if (balHex) setValue("balance", `${formatWeiToNative(balHex, 18, 6)} ${nativeSymbol}`);
  else setValue("balance", `0 ${nativeSymbol}`);
}

async function updateUI(data) {
  if (!data || !data.account) return;

  const empty = document.getElementById("wallet-empty-state");
  if (empty) empty.classList.add("d-none");

  const section = document.getElementById("wallet-info-section");
  if (section) section.classList.remove("d-none");

  setValue("walletAddress", data.account);
  const statusEl = document.getElementById("walletStatusLabel");
  if (statusEl) {
    statusEl.classList.remove("text-info");
    statusEl.classList.add("text-success");
    statusEl.innerHTML = '<i class="bi bi-circle-fill me-1"></i>Conectado';
  }
  
  // Format Chain ID
  let chainIdDisplay = data.chainId;
  if (data.chainId && String(data.chainId).startsWith("0x")) {
      chainIdDisplay = parseInt(data.chainId, 16);
  }
  setValue("chainId", chainIdDisplay);

  // Get Network Info
  let net = data.network;
  const netMgr = networkManager || window.networkManager;

  // Se não veio no data, tenta buscar no manager
  if (!net && data.chainId && netMgr) {
    net = netMgr.getNetworkById(data.chainId);
  }

  // Fallback visual se rede desconhecida
  if (net) {
    setValue("networkName", net.name);
    setValue("nativeCurrency", net.nativeCurrency?.name || "Unknown");
    setValue("currencySymbol", net.nativeCurrency?.symbol || "ETH");

    const rpc = Array.isArray(net.rpc) ? net.rpc[0] : net.rpc || "";
    setValue("rpcUrl", rpc);

    const explorer = Array.isArray(net.explorers) ? net.explorers[0]?.url || net.explorers[0] : "";
    setValue("explorerUrlDisplay", explorer);
    
    // Custom RPCs (se houver mais de um)
    if (Array.isArray(net.rpc) && net.rpc.length > 1) {
        const others = net.rpc.slice(1).join("\n");
        setValue("customRpcs", others);
    } else {
        setValue("customRpcs", "Nenhum RPC personalizado configurado");
    }
    
    const explorerLink = document.getElementById("explorerLink");
    if (explorerLink) {
        if (explorer) {
            explorerLink.href = explorer;
            explorerLink.classList.remove("d-none");
        } else {
            explorerLink.href = "#";
            explorerLink.classList.add("d-none");
        }
    }
  } else {
    setValue("networkName", "Desconhecida");
    setValue("nativeCurrency", "-");
    setValue("currencySymbol", "-");
    setValue("rpcUrl", "-");
    setValue("explorerUrlDisplay", "-");
    setValue("customRpcs", "Nenhum RPC personalizado configurado");
  }

  // Balance
  const wc = getWalletConnector();
  const symbol = net?.nativeCurrency?.symbol || "ETH";

  setValue("balance", "Carregando...");
  try {
    if (wc && typeof wc.setAccount === "function") {
      const st = wc.getStatus?.() || {};
      const stAcc = st?.account ? String(st.account).toLowerCase() : "";
      const nextAcc = String(data.account).toLowerCase();
      if (!stAcc || stAcc !== nextAcc) await wc.setAccount(data.account);
    }
  } catch (_) {}
  try {
    if (wc && typeof wc.updateBalance === "function") await wc.updateBalance();
  } catch (_) {}
  try {
    const st = wc?.getStatus?.() || {};
    const raw = st?.balance ?? wc?.balance ?? data.balance ?? "0.0000";
    setValue("balance", `${raw} ${symbol}`);
  } catch (_) {
    setValue("balance", `0.0000 ${symbol}`);
  }
}

function clearUI() {
  const empty = document.getElementById("wallet-empty-state");
  if (empty) empty.classList.remove("d-none");

  const section = document.getElementById("wallet-info-section");
  if (section) section.classList.add("d-none");

  setValue("walletAddress", "");
  setValue("chainId", "");
  setValue("networkName", "");
  setValue("nativeCurrency", "");
  setValue("currencySymbol", "");
  setValue("balance", "");
  setValue("rpcUrl", "");
  setValue("explorerUrlDisplay", "");
  setValue("customRpcs", "Nenhum RPC personalizado configurado");
}

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) {
    // console.log(`Setting ${id} to ${val}`); // Debug
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      el.value = val || "";
    } else {
      el.textContent = val || "-";
      // Força atualização visual em alguns navegadores se necessário
      el.style.display = 'none';
      el.offsetHeight; // trigger reflow
      el.style.display = '';
    }
  } else {
      // console.warn(`Element not found: ${id}`);
  }
}

function setupCopyButton(btnId, targetId) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener("click", () => {
            const val = getTextValue(targetId);
            if (val && val !== "-") {
                if (window.copyToClipboard) {
                    window.copyToClipboard(val);
                } else {
                    navigator.clipboard.writeText(val);
                }
            }
        });
    }
}

function getTextValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        return el.value;
    }
    return el.textContent;
}
