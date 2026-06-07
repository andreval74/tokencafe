
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuthModal);
} else {
  initAuthModal();
}

// Detecta qual carteira está ativa no browser atual
function detectWalletType() {
  const eth = window.ethereum;
  if (!eth) return null;
  if (eth.isTrust || eth.isTrustWallet)  return "trust";
  if (eth.isCoinbaseWallet)              return "coinbase";
  if (eth.isMetaMask)                    return "metamask";
  if (typeof eth.request === "function") return "ethereum";
  return null;
}

// Retorna Set com as carteiras detectadas/instaladas
function detectInstalledWallets() {
  const installed = new Set();
  const providers = Array.isArray(window.ethereum?.providers)
    ? window.ethereum.providers
    : (window.ethereum ? [window.ethereum] : []);

  for (const p of providers) {
    const isTrust    = !!(p.isTrust || p.isTrustWallet);
    const isCoinbase = !!p.isCoinbaseWallet;
    const isMM       = !!p.isMetaMask && !isTrust && !isCoinbase;
    const isGeneric  = !isTrust && !isCoinbase && !isMM && typeof p.request === "function";

    if (isTrust)           installed.add("trust");
    if (isCoinbase)        installed.add("coinbase");
    if (isMM || isGeneric) installed.add("metamask");
  }

  // WalletConnect é protocolo — disponível no desktop sem instalação
  if (!isMobile()) installed.add("walletconnect");

  return installed;
}

function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function initAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;

  document.querySelectorAll(".wallet-option").forEach((opt) =>
    opt.addEventListener("click", handleWalletSelection)
  );
  document.getElementById("cancel-connection")?.addEventListener("click", () =>
    showStep("wallet-selection")
  );
  document.getElementById("back-to-selection")?.addEventListener("click", () =>
    showStep("wallet-selection")
  );

  applyWalletAvailabilityStates();
  modal.addEventListener("show.bs.modal", applyWalletAvailabilityStates);

  checkExistingConnection();
}

// Aplica estados visuais de disponibilidade em cada botão de carteira
function applyWalletAvailabilityStates() {
  const selectionEl = document.getElementById("wallet-selection");
  if (!selectionEl) return;

  const installed = detectInstalledWallets();
  const detected  = detectWalletType();

  selectionEl.querySelectorAll(".tc-wallet-banner").forEach((el) => el.remove());

  document.querySelectorAll(".wallet-option").forEach((btn) => {
    const walletType  = btn.dataset.wallet;
    const isAvailable = installed.has(walletType);
    const isDetected  = detected === walletType || (walletType === "metamask" && detected === "ethereum");

    btn.querySelectorAll(".tc-wallet-badge").forEach((el) => el.remove());

    if (isAvailable) {
      btn.disabled = false;
      btn.style.opacity = btn.style.filter = btn.style.cursor = btn.style.pointerEvents = "";

      if (isDetected) {
        btn.style.borderColor = "var(--tokencafe-primary, #f85d23)";
        btn.style.background  = "rgba(248,93,35,0.08)";
        const badge = document.createElement("span");
        badge.className = "tc-wallet-badge badge ms-2";
        badge.style.cssText = "background:var(--tokencafe-primary,#f85d23);color:#fff;font-size:0.65rem;vertical-align:middle;";
        badge.textContent = "Detectado";
        btn.querySelector("h6")?.appendChild(badge);
      } else {
        btn.style.borderColor = btn.style.background = "";
      }
    } else {
      btn.disabled = true;
      btn.style.opacity = "0.38";
      btn.style.filter  = "grayscale(0.85)";
      btn.style.cursor  = "not-allowed";
      btn.style.pointerEvents = "none";

      const small = btn.querySelector("small");
      if (small) small.textContent = "Não instalado";

      const badge = document.createElement("span");
      badge.className = "tc-wallet-badge badge ms-2";
      badge.style.cssText = "background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.45);font-size:0.65rem;vertical-align:middle;";
      badge.textContent = "Não instalado";
      btn.querySelector("h6")?.appendChild(badge);
    }
  });

  // Banner de orientação no mobile
  if (isMobile()) {
    const banner = document.createElement("div");
    banner.className = "tc-wallet-banner alert mb-3 py-2 px-3";

    if (detected && detected !== "ethereum") {
      banner.style.cssText = "background:rgba(248,93,35,0.10);border:1px solid rgba(248,93,35,0.25);border-radius:8px;font-size:0.82rem;color:rgba(255,255,255,0.85);";
      banner.innerHTML = `<i class="bi bi-phone me-1"></i> Carteira detectada: <strong>${getWalletName(detected)}</strong>. Toque nela para conectar.`;
    } else if (!detected) {
      banner.style.cssText = "background:rgba(59,130,246,0.10);border:1px solid rgba(59,130,246,0.25);border-radius:8px;font-size:0.82rem;color:rgba(255,255,255,0.8);";
      banner.innerHTML = `<i class="bi bi-info-circle me-1"></i> Abra este site pelo <strong>browser integrado</strong> do app da sua carteira para conectar.`;
    }

    if (banner.innerHTML) selectionEl.prepend(banner);
  }

  // Guia de instalação no rodapé
  const footerEl = selectionEl.querySelector(".text-center.mt-4");
  if (footerEl) {
    const onlyWalletConnect = installed.size === 1 && installed.has("walletconnect");
    if (installed.size === 0 || onlyWalletConnect) {
      footerEl.innerHTML = `<small class="text-muted"><i class="bi bi-exclamation-circle me-1"></i>Nenhuma carteira detectada. <a href="https://metamask.io" target="_blank" class="text-decoration-none">Instalar MetaMask</a></small>`;
    } else {
      footerEl.innerHTML = `<small class="text-muted"><i class="bi bi-info-circle me-1"></i>Não possui uma carteira? <a href="https://metamask.io" target="_blank" class="text-decoration-none">Instalar MetaMask</a></small>`;
    }
  }
}

async function handleWalletSelection(e) {
  const requestedType = e.currentTarget.dataset.wallet;
  const walletType    = resolveWalletType(requestedType, detectWalletType());

  showStep("wallet-connecting");
  updateConnectingMessage(`Conectando com ${getWalletName(walletType)}...`);

  try {
    let connected = false;

    if (walletType === "metamask")       connected = await connectMetaMask();
    else if (walletType === "trust")     connected = await connectTrustWallet();
    else if (walletType === "coinbase")  connected = await connectCoinbase();
    else if (walletType === "walletconnect") connected = await connectWalletConnect();
    else                                 connected = await connectGenericEthereum();

    if (connected) {
      let chainId, account;
      if (window.ethereum) {
        chainId = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
        const accounts = await window.ethereum.request({ method: "eth_accounts" }).catch(() => []);
        account = accounts?.[0];
      }
      // Conecta diretamente com a rede atual da carteira — sem bloqueio por rede
      await handleConnectionSuccess(account, chainId);
    }
  } catch (error) {
    handleConnectionError(error);
  }
}

// Resolve qual provider usar: se pediu MetaMask mas está em outro browser, usa a carteira detectada
function resolveWalletType(requested, detected) {
  if (requested === "walletconnect") return "walletconnect";
  if (!detected) return requested;
  if (requested === detected) return requested;
  if (requested === "metamask" && detected !== "metamask") return detected;
  return requested;
}

// ── Conexão por tipo de carteira ──────────────────────────────────

async function connectViaProvider(walletType) {
  if (window.walletConnector && typeof window.walletConnector.connect === "function") {
    try {
      const res = await window.walletConnector.connect(walletType);
      if (res?.success) return true;
    } catch (_) {}
  }
  if (!window.ethereum || typeof window.ethereum.request !== "function") return false;
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return Array.isArray(accounts) && accounts.length > 0;
}

async function connectMetaMask() {
  if (!window.ethereum) {
    if (isMobile()) {
      const url = window.location.host + window.location.pathname + window.location.search;
      window.location.href = `https://metamask.app.link/dapp/${url}`;
      return false;
    }
    throw new Error("MetaMask não encontrado. Instale a extensão ou abra pelo app MetaMask.");
  }
  return await connectViaProvider("metamask");
}

async function connectTrustWallet() {
  if (!window.ethereum) {
    if (isMobile()) {
      window.location.href = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
      return false;
    }
    throw new Error("Trust Wallet não encontrada. Abra pelo app Trust Wallet.");
  }
  return await connectViaProvider("trust");
}

async function connectCoinbase() {
  if (!window.ethereum) {
    if (isMobile()) {
      window.location.href = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(window.location.href)}`;
      return false;
    }
    throw new Error("Coinbase Wallet não encontrada. Abra pelo app Coinbase Wallet.");
  }
  return await connectViaProvider("coinbase");
}

async function connectGenericEthereum() {
  if (!window.ethereum || typeof window.ethereum.request !== "function") {
    throw new Error("Nenhuma carteira encontrada neste browser.");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return Array.isArray(accounts) && accounts.length > 0;
}

async function connectWalletConnect() {
  if (isMobile()) {
    try {
      if (typeof window.showFormError === "function") {
        window.showFormError("Use MetaMask ou Trust Wallet — abra o site pelo browser do app.");
      }
    } catch (_) {}
    return false;
  }
  throw new Error("WalletConnect (QR) não disponível. Use MetaMask ou Trust Wallet.");
}

// ── Pós-conexão ───────────────────────────────────────────────────

async function handleConnectionSuccess(account, chainId) {
  const addrEl = document.querySelector("#connected-address span");
  const netEl  = document.querySelector("#connected-network span");
  if (addrEl && account) addrEl.textContent = `${account.slice(0, 6)}...${account.slice(-4)}`;
  if (netEl && chainId)  netEl.textContent  = getNetworkName(chainId);

  showStep("connection-success");
  document.dispatchEvent(new CustomEvent("wallet:connected", { detail: { account, chainId } }));
  setTimeout(() => {
    window.authModal?.hide();
    setTimeout(() => { window.location.href = "index.php?page=tools"; }, 400);
  }, 800);
}

function handleConnectionError(error) {
  console.error("[AuthModal] Erro na conexão:", error);
  let msg = "Não foi possível conectar sua carteira.";
  if (error.code === 4001)    msg = "Conexão cancelada pelo usuário.";
  else if (error.code === -32002) msg = "Solicitação pendente — verifique sua carteira.";
  else if (error.message)     msg = error.message;
  const errEl = document.getElementById("error-message");
  if (errEl) errEl.textContent = msg;
  showStep("connection-error");
}

// ── Utilitários ───────────────────────────────────────────────────

function showStep(stepId) {
  document.querySelectorAll(".auth-step").forEach((s) => s.classList.add("d-none"));
  document.getElementById(stepId)?.classList.remove("d-none");
}

function updateConnectingMessage(msg) {
  const el = document.getElementById("connecting-message");
  if (el) el.textContent = msg;
}

function getWalletName(type) {
  return {
    metamask: "MetaMask", trust: "Trust Wallet",
    walletconnect: "WalletConnect", coinbase: "Coinbase Wallet",
    ethereum: "Carteira Detectada",
  }[type] || type;
}

function getNetworkName(chainId) {
  return {
    "0x1": "Ethereum Mainnet", "0x38": "BNB Smart Chain",
    "0x89": "Polygon", "0xa4b1": "Arbitrum One",
    "0xa": "Optimism", "0x2105": "Base", "0xe708": "Linea",
    "0x144": "zkSync Era", "0xfa": "Fantom",
  }[chainId?.toLowerCase?.()] || chainId || "Rede Desconhecida";
}

async function checkExistingConnection() {
  if (window.walletConnector) {
    const status = window.walletConnector.getStatus?.() || {};
    if (status.isConnected && status.account) return;
  }
  if (window.ethereum?.selectedAddress) {
    const chainId = await window.ethereum.request({ method: "eth_chainId" }).catch(() => null);
    document.dispatchEvent(new CustomEvent("wallet:connected", {
      detail: { account: window.ethereum.selectedAddress, chainId },
    }));
  }
}

// ── API pública do modal ──────────────────────────────────────────

window.authModal = {
  show: () => {
    const el = document.getElementById("authModal");
    if (!el) return;

    // Se só há uma carteira real instalada (WalletConnect não conta — é protocolo),
    // pula a tela de seleção e conecta direto, sem precisar o usuário escolher.
    const installed   = detectInstalledWallets();
    const realWallets = [...installed].filter(w => w !== "walletconnect");

    if (realWallets.length === 1) {
      const onlyWallet = realWallets[0];
      showStep("wallet-connecting");
      updateConnectingMessage(`Conectando com ${getWalletName(onlyWallet)}...`);
      try { bootstrap.Modal.getOrCreateInstance(el).show(); } catch (_) {}
      // Dispara a conexão automaticamente após o modal abrir
      setTimeout(() => {
        handleWalletSelection({ currentTarget: { dataset: { wallet: onlyWallet } } });
      }, 120);
      return;
    }

    showStep("wallet-selection");
    try { bootstrap.Modal.getOrCreateInstance(el).show(); } catch (_) {}
  },
  hide: () => {
    try {
      const el = document.getElementById("authModal");
      bootstrap.Modal.getOrCreateInstance(el).hide();
    } catch (_) {}
    setTimeout(() => {
      document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
      document.body.classList.remove("modal-open");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("padding-right");
    }, 350);
  },
};

document.addEventListener("tc:open-auth-modal", () => window.authModal?.show());

document.addEventListener("hidden.bs.modal", (e) => {
  if (e.target?.id !== "authModal") return;
  document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
  document.body.classList.remove("modal-open");
  document.body.style.removeProperty("overflow");
  document.body.style.removeProperty("padding-right");
});
