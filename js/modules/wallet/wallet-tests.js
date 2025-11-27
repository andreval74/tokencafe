const $el = (id) => document.getElementById(id);

function log(msg, type = "info") {
  const el = $el("testLog");
  const icon = type === "error" ? "fa-circle-exclamation" : type === "success" ? "fa-check-circle" : "fa-info-circle";
  el.innerHTML = `<i class="fas ${icon} me-1"></i>${msg}`;
}

function renderDetected(available = {}) {
  const container = $el("walletsDetected");
  container.innerHTML = "";
  const labels = {
    metamask: { text: "MetaMask", cls: "bg-warning text-dark" },
    trust: { text: "Trust Wallet", cls: "bg-primary" },
    coinbase: { text: "Coinbase Wallet", cls: "bg-info text-dark" },
  };
  const keys = Object.keys(available || {}).filter((k) => available[k]);
  if (keys.length === 0) {
    container.innerHTML = '<span class="text-secondary">Nenhuma carteira detectada</span>';
    return;
  }
  keys.forEach((k) => {
    const { text, cls } = labels[k] || { text: k, cls: "bg-secondary" };
    const badge = document.createElement("span");
    badge.className = `badge badge-wallet ${cls}`;
    badge.textContent = text;
    container.appendChild(badge);
  });
}

function fillStatus(status) {
  $el("testAccount").value = status?.account ? (window.formatAddress ? window.formatAddress(status.account) : status.account) : "-";
  $el("testWallet").value = status?.wallet || "-";
  $el("testNetwork").value = status?.network?.name || status?.network?.fullName || "-";
  $el("testChainId").value = status?.chainId || "-";
  $el("testBalance").value = status?.balance ?? "-";
}

function pickPreferredWallet(avail = {}) {
  if (avail.metamask) return "metamask";
  if (avail.trust) return "trust";
  if (avail.coinbase) return "coinbase";
  return null;
}

function getProviderName() {
  if (!window.ethereum) return "Desconhecido";
  if (window.ethereum.isMetaMask) return "MetaMask";
  if (window.ethereum.isTrust || window.ethereum.isTrustWallet) return "Trust Wallet";
  if (window.ethereum.isCoinbaseWallet || window.ethereum.isToshi) return "Coinbase Wallet";
  if (window.ethereum.isBraveWallet) return "Brave Wallet";
  if (window.ethereum.isRabby) return "Rabby Wallet";
  return "Desconhecido";
}

async function detectWallets() {
  try {
    const available = await window.walletConnector.detectAvailableWallets();
    renderDetected(available);
    return available;
  } catch (e) {
    renderDetected({});
    log(`Falha ao detectar carteiras: ${e?.message || e}`, "error");
    return {};
  }
}

async function runAutoTest() {
  try {
    window.walletConnector.setDebug(true);
    try {
      await window.walletConnector.disconnect();
    } catch {}
    const detectedSection = $el("detectedSection");
    const detailsSection = $el("detailsSection");
    const report = $el("checkupReport");
    const resultsSection = $el("resultsSection");
    const resultsTbody = $el("resultsTbody");
    if (detectedSection) detectedSection.classList.add("d-none");
    if (detailsSection) detailsSection.classList.add("d-none");
    if (report) report.classList.add("d-none");
    if (resultsSection) resultsSection.classList.add("d-none");
    if (resultsTbody) resultsTbody.innerHTML = "";
    $el("walletsDetected").innerHTML = "";
    fillStatus({});
  } catch (e) {
    log(e?.message || e, "error");
  }
}

async function runCompleteCheckup() {
  const btn = $el("btnTestConnect");
  const resultsSection = $el("resultsSection");
  const resultsTbody = $el("resultsTbody");
  const testSummary = $el("testSummary");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Executando checkup...';
  }
  if (resultsSection) resultsSection.classList.add("d-none");
  if (resultsTbody) resultsTbody.innerHTML = "";

  const checkResults = [];

  try {
    const hasProvider = typeof window.ethereum !== "undefined";
    checkResults.push({ test: "Suporte Web3", addr: "-", result: hasProvider ? "Ethereum provider detectado" : "Provider não encontrado", status: hasProvider ? "success" : "error" });

    const available = await window.walletConnector.detectAvailableWallets();
    const walletKeys = Object.keys(available || {}).filter((k) => available[k]);
    checkResults.push({ test: "Carteiras Instaladas", addr: "-", result: walletKeys.length > 0 ? `${walletKeys.length} carteira(s) detectada(s)` : "Nenhuma carteira detectada", status: walletKeys.length > 0 ? "success" : "warning" });

    if (hasProvider) {
      try {
        await window.ethereum.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] });
        checkResults.push({ test: "Permissões", addr: "-", result: "Permissões resetadas para forçar popup", status: "info" });
      } catch (e) {
        checkResults.push({ test: "Permissões", addr: "-", result: "Revogação não suportada ou já limpa", status: "info" });
      }
      try {
        const accountsReq = await window.ethereum.request({ method: "eth_requestAccounts" });
        const addr = Array.isArray(accountsReq) && accountsReq.length ? accountsReq[0] : "-";
        checkResults.push({ test: "Autorização de Contas", addr, result: addr !== "-" ? "Autorização concedida" : "Nenhuma conta retornada", status: addr !== "-" ? "success" : "warning" });
      } catch (e) {
        checkResults.push({ test: "Autorização de Contas", addr: "-", result: `Falha ao solicitar contas: ${e?.message || e}`, status: "error" });
      }
    }

    let currentStatus = window.walletConnector.getStatus();
    let connectAttempted = false;
    if (!currentStatus.isConnected && walletKeys.length > 0) {
      try {
        const preferred = pickPreferredWallet(available);
        const res = await window.walletConnector.connect(preferred);
        connectAttempted = true;
        checkResults.push({ test: "Teste de Conexão", addr: res.account, result: `Conexão com ${preferred} bem-sucedida`, status: "success" });
      } catch (e) {
        connectAttempted = true;
        checkResults.push({ test: "Teste de Conexão", addr: "-", result: `Falha: ${e.message}`, status: "error" });
      }
    }

    const finalStatus = window.walletConnector.getStatus();
    checkResults.push({ test: "Status de Conexão", addr: finalStatus.account || "-", result: finalStatus.isConnected ? `Conectado: ${finalStatus.wallet}` : walletKeys.length === 0 ? "Nenhuma carteira instalada" : "Não conectado", status: finalStatus.isConnected ? "success" : connectAttempted ? "error" : "info" });

    if (finalStatus.isConnected) {
      checkResults.push({ test: "Provider", addr: "-", result: getProviderName(), status: "success" });
      checkResults.push({ test: "Rede", addr: finalStatus.chainId || "-", result: finalStatus.network ? finalStatus.network.name : "Rede não identificada", status: finalStatus.network ? "success" : "warning" });
      if (finalStatus.network?.nativeCurrency) {
        checkResults.push({ test: "Moeda Nativa", addr: "-", result: `${finalStatus.network.nativeCurrency.name} (${finalStatus.network.nativeCurrency.symbol})`, status: "success" });
      }
      if (Array.isArray(finalStatus.network?.rpc) && finalStatus.network.rpc.length) {
        checkResults.push({ test: "RPC URL", addr: "-", result: finalStatus.network.rpc[0], status: "info" });
      }
      if (Array.isArray(finalStatus.network?.explorers) && finalStatus.network.explorers.length) {
        const exp = finalStatus.network.explorers[0];
        checkResults.push({ test: "Explorer", addr: "-", result: exp.url || "-", status: "info" });
      }
      try {
        const netVer = await window.ethereum.request({ method: "net_version" });
        checkResults.push({ test: "Versão da Rede", addr: "-", result: `${netVer}`, status: "info" });
      } catch {}
      checkResults.push({ test: "Saldo (ETH)", addr: finalStatus.account || "-", result: `${finalStatus.balance || "0"}`, status: "success" });
    }

    checkResults.push({ test: "WalletConnector", addr: "-", result: window.walletConnector ? "Módulo carregado" : "Módulo não encontrado", status: window.walletConnector ? "success" : "error" });
    checkResults.push({ test: "NetworkManager", addr: "-", result: window.networkManager ? "Módulo carregado" : "Módulo não encontrado", status: window.networkManager ? "success" : "error" });
  } catch (error) {
    checkResults.push({ test: "Erro Geral", addr: "-", result: error.message || "Erro desconhecido durante o checkup", status: "error" });
  }

  const successCount = checkResults.filter((r) => r.status === "success").length;
  const errorCount = checkResults.filter((r) => r.status === "error").length;
  const warningCount = checkResults.filter((r) => r.status === "warning").length;

  const statusText = (s) => (s === "success" ? "OK" : s === "warning" ? "Aviso" : s === "error" ? "Erro" : "Info");
  const badgeClass = (s) => (s === "success" ? "bg-success" : s === "warning" ? "bg-warning" : s === "error" ? "bg-danger" : "bg-info");

  
  resultsTbody.innerHTML = checkResults
    .map(
      (r) => `
        <tr>
          <td>${r.test}</td>
          <td class="monospace-input">${r.addr || "-"}</td>
          <td class="ps-3">${r.result || "-"}</td>
          <td class="text-end"><span class="badge ${badgeClass(r.status)}">${statusText(r.status)}</span></td>
        </tr>
      `,
    )
    .join("");

  testSummary.className = `alert ${errorCount ? "alert-danger" : warningCount ? "alert-warning" : "alert-success"} d-block`;
  testSummary.textContent = `Checkup: ${successCount} OK, ${warningCount} avisos, ${errorCount} erros`;
  resultsSection.classList.remove("d-none");

  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-plug me-1"></i> Testar Conexão';
  }

  log(`Checkup concluído: ${successCount} sucessos, ${warningCount} avisos, ${errorCount} erros`, errorCount > 0 ? "error" : warningCount > 0 ? "info" : "success");
}

function updateButtonStates() {
  const status = window.walletConnector.getStatus();
  const btnTest = $el("btnTestConnect");
  const btnClear = $el("btnClearResults");
  if (btnTest) {
    btnTest.disabled = false;
    btnTest.innerHTML = status.isConnected ? '<i class="fas fa-rotate me-1"></i> Re-testar Conexão' : '<i class="fas fa-plug me-1"></i> Testar Conexão';
  }
  if (btnClear) {
    btnClear.disabled = false;
  }
}

document.addEventListener("wallet:connected", () => {
  fillStatus(window.walletConnector.getStatus());
  updateButtonStates();
  log("Evento: carteira conectada", "success");
});

document.addEventListener("wallet:disconnected", () => {
  fillStatus(window.walletConnector.getStatus());
  updateButtonStates();
  log("Evento: carteira desconectada", "info");
});

document.addEventListener("wallet:error", (ev) => {
  const msg = ev.detail?.error || "Erro desconhecido";
  log(`Evento de erro: ${msg}`, "error");
});

function clearResultsUI() {
  try {
    window.walletConnector?.disconnect();
  } catch {}
  const resultsSection = $el("resultsSection");
  const resultsTbody = $el("resultsTbody");
  const testSummary = $el("testSummary");
  if (resultsSection) resultsSection.classList.add("d-none");
  if (resultsTbody) resultsTbody.innerHTML = "";
  if (testSummary) {
    testSummary.className = "alert alert-info d-none";
    testSummary.textContent = "";
  }
  const detectedSection = $el("detectedSection");
  const detailsSection = $el("detailsSection");
  const report = $el("checkupReport");
  if (detectedSection) detectedSection.classList.add("d-none");
  if (detailsSection) detailsSection.classList.add("d-none");
  if (report) report.classList.add("d-none");
  const walletsDetected = $el("walletsDetected");
  if (walletsDetected) walletsDetected.innerHTML = "";
  if (typeof fillStatus === "function") fillStatus({});
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await window.walletConnector.disconnect();
  } catch {}
  const btnTest = $el("btnTestConnect");
  const btnClear = $el("btnClearResults");
  if (btnTest) btnTest.addEventListener("click", runCompleteCheckup);
  if (btnClear) btnClear.addEventListener("click", clearResultsUI);
  runAutoTest();
  updateButtonStates();
});
