import { getExplorerContractUrl } from "./explorer-utils.js";
import { completePayload, runVerifyDirect, getApiBase, getVerifyApiKey, getVerificationStatus } from "../../shared/verify-utils.js";
import { checkConnectivity } from "../../shared/components/api-status.js";
import { initContainer } from "../../shared/contract-search.js";

const statusEl = document.getElementById("verifyStatus");
const runBtn = document.getElementById("runVerify");
const spinner = document.getElementById("verifySpinner");
const btnText = document.getElementById("verifyBtnText");

(function () {
  try {
    const origFetch = window.fetch;
    if (origFetch.isPatched) return; // Prevent double patching

    window.fetch = async function (url, opts) {
      try {
        const resp = await origFetch(url, opts);
        try {
          // Only log API calls if specifically debugging or if it's an error
          const shouldLog = /\/api\//.test(String(url));
          if (shouldLog) {
            const clone = resp.clone();
            const ct = String(clone.headers.get("content-type") || "");
            if (!resp.ok) {
              try {
                const txt = await clone.text();
                console.error("[verifica]", "Erro API", url, resp.status, txt);
              } catch (_) {
                console.error("[verifica]", "Erro API", url, resp.status);
              }
            } else {
              // Success - use debug level
              if (ct.includes("application/json")) {
                const data = await clone.json();
                console.debug("[verifica]", "Response", url, resp.status, data);
              } else {
                console.debug("[verifica]", "Response", url, resp.status);
              }
            }
          }
        } catch (_) {}
        return resp;
      } catch (e) {
        try {
          const u = String(url || "");
          const isHealth = /\/health\b/.test(u);
          const msg = e?.message || String(e);
          if (isHealth) console.warn("[verifica]", "Fetch health check error", u, msg);
          else console.error("[verifica]", "Fetch error", u, msg);
        } catch (_) {}
        throw e;
      }
    };
    window.fetch.isPatched = true;
  } catch (_) {}
  document.addEventListener("contract:clear", () => {
    clearForm();
  });

  // Matrix Flow Logic
  document.addEventListener("network:selected", (e) => {
    const net = e.detail.network;
    if (net) {
      const tokenSection = document.getElementById("token-section");
      if (tokenSection) tokenSection.classList.remove("d-none");
      
      // Atualizar campo hidden de chainId
      const fChainId = document.getElementById("f_chainId");
      if (fChainId) fChainId.value = net.chainId;

      // Se mudar a rede, esconder a seção de resultado até buscar novo contrato
      const generateSection = document.getElementById("generate-section");
      if (generateSection) generateSection.classList.add("d-none");
    }
  });

  document.addEventListener("contract:found", (e) => {
    const contract = e.detail.contract;
    if (contract) {
      const generateSection = document.getElementById("generate-section");
      const walletWarning = document.getElementById("walletWarning");
      const runVerifyBtn = document.getElementById("runVerify");
      const codeSourceSection = document.getElementById("codeSourceSection");
      const colContractName = document.getElementById("col-contract-name");
      const colCompilerVersion = document.getElementById("col-compiler-version");

      // generateSection visibility is now handled by checkVerifiedStatus
      // if (generateSection) generateSection.classList.remove("d-none");

      // Check if it is a wallet (EOA)
      const isWallet = contract.assetType === "wallet" || contract.isContract === false;

      if (isWallet) {
        if (walletWarning) walletWarning.classList.remove("d-none");
        if (runVerifyBtn) {
            runVerifyBtn.disabled = true;
        }
        if (codeSourceSection) codeSourceSection.classList.add("d-none");
        if (colContractName) colContractName.classList.add("d-none");
        if (colCompilerVersion) colCompilerVersion.classList.add("d-none");
        // Ensure generateSection is hidden for wallets
        if (generateSection) generateSection.classList.add("d-none");
      } else {
        if (walletWarning) walletWarning.classList.add("d-none");
        if (runVerifyBtn) runVerifyBtn.disabled = false;
        
        // RESET VISIBILITY: Hide form sections while checking status
        // This prevents the form from remaining visible if it was shown for a previous contract
        if (generateSection) generateSection.classList.add("d-none");
        if (codeSourceSection) codeSourceSection.classList.add("d-none");
        if (colContractName) colContractName.classList.add("d-none");
        if (colCompilerVersion) colCompilerVersion.classList.add("d-none");
        if (actionButtons) document.getElementById("actionButtons")?.classList.add("d-none");
        if (runVerifyBtn) runVerifyBtn.classList.add("d-none");

        // Auto-detect contract name on source code change
        const fSrc = document.getElementById("f_sourceCode");
    if (fSrc) {
      fSrc.addEventListener("input", () => {
        const val = fSrc.value || "";
        // Regex simples para capturar "contract NomeDoContrato"
        // Pega o último contrato definido ou tenta achar um que pareça o principal
        // Estratégia: pegar o último 'contract Xyz' que não seja interface ou library (embora library possa ser verificada)
        const matches = [...val.matchAll(/contract\s+([a-zA-Z0-9_]+)/g)];
        if (matches.length > 0) {
          // Assume o último contrato do arquivo como o principal (comum em arquivos flat)
          const lastMatch = matches[matches.length - 1];
          const name = lastMatch[1];
          const fName = document.getElementById("f_contractName");
          if (fName) fName.value = name;
        }
      });
    }

    // Tentar preencher campos se disponíveis
    if (contract.contractName) {
      const fName = document.getElementById("f_contractName");
      if (fName && !fName.value) fName.value = contract.contractName;
    }
        
        // Verificar status atual
        window.checkVerifiedStatus && window.checkVerifiedStatus(true, contract.contractAddress, contract.chainId);
      }
    }
  });

  const btnClearAll = document.getElementById("btnClearAll");
  if (btnClearAll) {
    btnClearAll.addEventListener("click", () => {
      // Limpar formulários e esconder seções
      clearForm();
      
      const generateSection = document.getElementById("generate-section");
      const walletWarning = document.getElementById("walletWarning");
      
      if (generateSection) generateSection.classList.add("d-none");
      if (walletWarning) walletWarning.classList.add("d-none");
      
      document.getElementById("col-contract-name")?.classList.add("d-none");
      document.getElementById("col-compiler-version")?.classList.add("d-none");

      // Disparar eventos de limpeza para componentes
      document.dispatchEvent(new CustomEvent("contract:clear"));
    });
  }

})();

async function ensureApiBase() {
  try {
    const el = document.getElementById("apiHelp");
    const btn = document.getElementById("apiFixBtn");
    const siteHost = String(window.location.hostname || "");
    const isLocalSite = siteHost === "localhost" || siteHost === "127.0.0.1";
    const prodBase = "https://tokencafe-api.onrender.com";
    
    // 1. Setup UI elements
    let currentBase = window.TOKENCAFE_API_BASE || window.localStorage?.getItem("api_base") || null;
    let baseHost = null;
    try { if (currentBase) baseHost = new URL(currentBase).hostname; } catch (_) {}
    
    if (!!baseHost && baseHost === siteHost && el) {
       el.classList.remove("d-none");
    }

    if (btn) {
        btn.onclick = function () {
            try { window.localStorage && window.localStorage.setItem("api_base", prodBase); } catch (_) {}
            window.location.reload();
        };
    }

    // 2. Smart Check Logic using centralized checkConnectivity
    // Se estiver em localhost, tenta local:3000 primeiro
    if (isLocalSite) {
        const localBase = "http://localhost:3000";
        const localOk = await checkConnectivity(false, localBase);
        if (localOk) {
            if (currentBase !== localBase) {
                 console.warn("[verifica] Auto-switching API to localhost");
                 window.localStorage && window.localStorage.setItem("api_base", localBase);
            }
            return;
        }
    }

    // Se não é local ou local falhou, verifica se o atual está online (ou fallback para prod)
    if (currentBase !== prodBase) {
        // Se o atual não é prod, verifica se está vivo. Se não, força prod.
        const currentOk = await checkConnectivity(false, currentBase);
        if (!currentOk) {
             console.warn("[verifica] API atual offline, fallback para produção");
             window.localStorage && window.localStorage.setItem("api_base", prodBase);
        }
    }
    // Se já é prod, assumimos que está ok ou o usuário deve esperar o wake-up (gerenciado pelo ApiStatusComponent na UI)

  } catch (e) {
      console.error("[verifica] ensureApiBase error", e);
  }
}

function logStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function getPayload() {
  try {
    const raw = localStorage.getItem("tokencafe_contract_verify_payload");
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function setGlobalData(p) {
  try {
    const parsed = p?.metadata ? JSON.parse(p.metadata) : null;
    window.VERIFY_CONTRACT_DATA = { ...(window.VERIFY_CONTRACT_DATA || {}), ...p, parsedMetadata: parsed };
  } catch (_) {
    window.VERIFY_CONTRACT_DATA = { ...(window.VERIFY_CONTRACT_DATA || {}), ...p };
  }
}

// Hidden form removido

function fillVisibleForm(p) {
  try {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v != null ? String(v) : "";
    };
    set("f_address", p?.contractAddress || "");
    set("f_chainId", p?.chainId || "");
    set("f_contractName", p?.contractName || "");
    set("f_sourceCode", p?.sourceCode || "");
    set("f_metadata", p?.metadata || "");

    setGlobalData(p);
    const t = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v != null && String(v).length ? String(v) : "-";
    };
    t("cardContractName", p?.contractName || "");
    t("cardFQN", p?.contractNameFQN || (p?.contractName ? `${p.contractName}.sol:${p.contractName}` : ""));
    t("cardChainIdText", p?.chainId || "");
    t("cardAddressText", p?.contractAddress || "");
    t("cardSourcePreview", p?.sourceCode || "");
    t("cardMetadataPreview", p?.metadata || "");
  } catch (_) {}
}

function buildPayloadFromForm() {
  try {
    const get = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : "";
    };
    const nsEl = document.getElementById("networkSearch");
    const chainIdRaw = document.getElementById("f_chainId")?.value || nsEl?.dataset?.chainId || "0";
    const chainId = parseInt(chainIdRaw || "0", 10);
    const sourceCode = get("f_sourceCode") || null;
    
    // Tenta recuperar constructorArguments do contexto global se disponível
    let constructorArguments = window.VERIFY_CONTRACT_DATA?.constructorArguments || "";
    // Garante single-line para evitar erro "Multi-line input is not supported"
    if (constructorArguments && typeof constructorArguments === "string") {
        constructorArguments = constructorArguments.replace(/[\r\n]/g, "");
    }
    
    // Tenta recuperar evmVersion do contexto global
    const evmVersion = window.VERIFY_CONTRACT_DATA?.evmVersion || window.VERIFY_CONTRACT_DATA?.evmversion || "default";

    return {
      chainId,
      contractAddress: get("f_address") || null,
      contractName: get("f_contractName") || null,
      compilerVersion: get("f_compilerVersion") || null,
      codeformat: get("f_codeformat") || "solidity-single-file",
      contractNameFQN: get("f_contractNameFQN") || null,
      optimizationUsed: get("f_optimizationUsed") === "0" ? 0 : 1,
      runs: parseInt(get("f_runs") || "200", 10),
      sourceCode: sourceCode,
      metadata: get("f_metadata") || null,
      constructorArguments: constructorArguments,
      evmVersion: evmVersion,
      evmversion: evmVersion
    };
  } catch (_) {
    return null;
  }
}

async function ensureVerificationData(p) {
  let out = { ...p };
  try {
    if (out.sourceCode && !out.contractName) {
      const matches = [...out.sourceCode.matchAll(/contract\s+([a-zA-Z0-9_]+)/g)];
      if (matches.length > 0) {
        out.contractName = matches[matches.length - 1][1];
      }
    }
  } catch (_) {}
  return out;
}

if (runBtn) {
  runBtn.addEventListener("click", () => runVerify());
}

// Inicialização segura
document.addEventListener("DOMContentLoaded", async () => {
  await ensureApiBase();

  // Verificar se há payload salvo
  const payload = getPayload();
  if (payload) {
    fillVisibleForm(payload);
    computeReadiness();
  }

  // Monitorar mudanças no form para atualizar badge
  const inputs = ["f_address", "f_chainId", "f_sourceCode", "f_metadata", "f_contractName", "f_compilerVersion"];
  inputs.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", computeReadiness);
  });
  
  // Garantir inicialização do componente de busca
  const container = document.querySelector('[data-component="shared/components/contract-search.html"]');
  if (container) {
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (container.getAttribute("data-cs-initialized") === "true") {
            clearInterval(interval);
        } else if (container.children.length > 0) {
            initContainer(container);
        }
        if (attempts > 50) clearInterval(interval);
    }, 100);
  }
});

async function runVerify() {
  try {
    runBtn.disabled = true;
    spinner.classList.remove("d-none");
    btnText.textContent = "Verificando...";
  } catch (_) {}
  const p0 = getPayload() || buildPayloadFromForm();
  if (!p0 || !p0.contractAddress || !p0.chainId) {
    logStatus("Endereço e ChainId são obrigatórios.");
    try {
      runBtn.disabled = false;
      spinner.classList.add("d-none");
      btnText.textContent = "Verificar automaticamente";
    } catch (_) {}
    return;
  }
  const p = await ensureVerificationData(p0);
  window.lastVerifyPayload = p;
  
  // Define helper global para download se não existir
  if (!window.downloadVerifyPayload) {
      window.downloadVerifyPayload = function() {
          if (!window.lastVerifyPayload) {
              alert("Nenhum payload disponível.");
              return;
          }
          const blob = new Blob([JSON.stringify(window.lastVerifyPayload, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `verify_${window.lastVerifyPayload.contractName || "contract"}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      };
  }

  try {
    const r = await runVerifyDirect(p);
    if (r.success) {
      logStatus("Verificação concluída com sucesso!");
      window.showVerificationResultModal(true, "Verificado com Sucesso!", "O contrato foi verificado e o código fonte publicado.", r.explorerUrl);
    } else {
      const msg = r.message || "Falha desconhecida";
      logStatus("Erro: " + msg);
      
      const errHtml = `
        <div class="text-danger mb-3">${msg}</div>
        <div class="alert alert-secondary text-light small">
            Se a verificação automática falhar, você pode tentar manualmente no Explorer usando o arquivo JSON abaixo.
        </div>
        <button class="btn btn-sm btn-outline-light w-100" onclick="window.downloadVerifyPayload()">
            <i class="bi bi-download me-2"></i>Baixar JSON para Verificação Manual
        </button>
      `;
      window.showVerificationResultModal(false, "Falha na Verificação", errHtml);
    }
  } catch (e) {
    logStatus("Erro na chamada: " + e.message);
    window.showVerificationResultModal(false, "Erro de Conexão", e.message);
  }
  try {
    if (runBtn) {
      runBtn.disabled = false;
      // Restore original state if needed, but keeping it simple
    }
    if (spinner) spinner.classList.add("d-none");
    if (btnText) btnText.textContent = "Verificar automaticamente";
  } catch (_) {}
}

// showVerificationResultModal removed - using global function from base-system.js

function clearForm() {
  try {
    const ids = ["f_address", "f_chainId", "f_contractName", "f_sourceCode", "f_metadata"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.tagName === "SELECT") el.value = el.querySelector("option")?.value || "";
      else el.value = "";
    }
    const resetTextIds = ["cardContractName", "cardFQN", "cardChainIdText", "cardAddressText", "cardSourcePreview", "cardMetadataPreview"];
    for (const id of resetTextIds) {
      const el = document.getElementById(id);
      if (el) el.textContent = "-";
    }

    // Reset verify button state
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.classList.remove("btn-success", "disabled");
      runBtn.classList.add("btn-outline-success");
      runBtn.innerHTML = '<span id="verifySpinner" class="spinner-border spinner-border-sm me-1 d-none" role="status" aria-hidden="true"></span><i class="bi bi-shield-check me-1"></i><span id="verifyBtnText">Verificar</span>';

      // Re-bind references if needed (though they are global/const)
      // const spinner = document.getElementById("verifySpinner");
      // const btnText = document.getElementById("verifyBtnText");
    }

    localStorage.removeItem("tokencafe_contract_verify_payload");
    // logStatus("Formulário limpo."); // Removido conforme solicitação
  } catch (_) {}
}

// Autofill via repositório removido

function updateOpenContractLink() {
  try {
    // Função mantida vazia para evitar erros de referência se chamada
  } catch (_) {}
}

async function checkExplorerStatus() {
  try {
    const addr = document.getElementById("f_address")?.value || "";
    const nsEl = document.getElementById("networkSearch");
    const cid = parseInt(document.getElementById("f_chainId")?.value || nsEl?.dataset?.chainId || "0", 10);
    if (!addr || !cid) return;
    const API_BASE = getApiBase();
    const resp = await fetch(`${API_BASE}/api/explorer-getsourcecode`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chainId: cid, address: addr }) });
    const js = await resp.json();
    const sec = document.getElementById("explorerSection");
    const txt = document.getElementById("explorerStatusText");
    const link = document.getElementById("explorerVerifyLink");
    const cUrl = getExplorerContractUrl(addr, cid);
    if (link) {
      link.href = cUrl || "#";
      link.textContent = cUrl ? "Abrir verificação no explorer" : "-";
    }
    if (sec) sec.classList.remove("d-none");
    if (txt) txt.textContent = js?.verified ? "Explorer: verificado" : "Explorer: não verificado";
  } catch (_) {}
}

function computeReadiness() {
  try {
    const addr = document.getElementById("f_address")?.value || "";
    const nsEl = document.getElementById("networkSearch");
    const cid = String(document.getElementById("f_chainId")?.value || nsEl?.dataset?.chainId || "");
    const src = document.getElementById("f_sourceCode")?.value || "";
    const meta = document.getElementById("f_metadata")?.value || "";
    const badge = document.getElementById("verifyStatusBadge");
    if (!badge) return;
    let txt = "Aguardando";
    let cls = "bg-dark-elevated";
    if (!addr || !cid) {
      if (badge) badge.classList.add("d-none");
      logStatus("");
    } else if (src || meta) {
      if (badge) badge.classList.remove("d-none");
      const cn = document.getElementById("f_contractName")?.value || "";
      const cv = document.getElementById("f_compilerVersion")?.value || "";
      if (cn && cv) {
        txt = "Pronto (Explorer)";
        cls = "bg-success";
      } else {
        txt = "Arquivos importados; preencha nome e versão";
        cls = "bg-warning";
      }
    }
    badge.textContent = txt;
    badge.className = `badge ${cls}`;
    badge.classList.remove("d-none");
  } catch (_) {}
}
