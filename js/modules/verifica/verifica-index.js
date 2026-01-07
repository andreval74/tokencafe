import { getExplorerContractUrl } from "./explorer-utils.js";
import { completePayload, runVerifyDirect, getApiBase, getVerifyApiKey, getVerificationStatus } from "../../shared/verify-utils.js";

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
    let base = window.TOKENCAFE_API_BASE || window.localStorage?.getItem("api_base") || null;
    const siteHost = String(window.location.hostname || "");
    const isLocalSite = siteHost === "localhost" || siteHost === "127.0.0.1";
    let baseHost = null;
    try {
      if (base) baseHost = new URL(base).hostname;
    } catch (_) {}
    const sameHost = !!baseHost && baseHost === siteHost;
    if (sameHost) {
      if (el) el.classList.remove("d-none");
    }
    const btn = document.getElementById("apiFixBtn");
    if (btn)
      btn.onclick = function () {
        try {
          window.localStorage && window.localStorage.setItem("api_base", "https://tokencafe-api.onrender.com");
        } catch (_) {}
        window.location.reload();
      };
    const candidate = base || (isLocalSite ? "http://localhost:3000" : null) || "http://localhost:3000";
    const isRemoteCandidate = /tokencafe-api\.onrender\.com/.test(String(candidate));
    const ok = await (async () => {
      if (isRemoteCandidate) return false;
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 1000);
        const r = await fetch(`${candidate}/health`, { method: "GET", signal: ctrl.signal });
        clearTimeout(t);
        return r && r.ok;
      } catch (_) {
        return false;
      }
    })();
    if (!ok) {
      if (isLocalSite) {
        const localBase = "http://localhost:3000";
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 800);
          const r = await fetch(`${localBase}/health`, { method: "GET", signal: ctrl.signal });
          clearTimeout(t);
          if (r && r.ok) {
            base = localBase;
            window.localStorage && window.localStorage.setItem("api_base", base);
            console.warn("[verifica]", "API_BASE ajustado automaticamente para", base);
            return;
          }
        } catch (_) {}
      }
      base = "https://tokencafe-api.onrender.com";
      try {
        window.localStorage && window.localStorage.setItem("api_base", base);
        console.warn("[verifica]", "API_BASE ajustado automaticamente para", base);
      } catch (_) {}
    }
  } catch (_) {}
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
    return {
      chainId,
      contractAddress: get("f_address") || null,
      contractName: get("f_contractName") || null,
      compilerVersion: get("f_compilerVersion") || null,
      codeformat: get("f_codeformat") || "solidity-single-file",
      contractNameFQN: get("f_contractNameFQN") || null,
      optimizationUsed: get("f_optimizationUsed") === "0" ? 0 : 1,
      runs: parseInt(get("f_runs") || "200", 10),
      sourceCode: get("f_sourceCode") || null,
      metadata: get("f_metadata") || null,
    };
  } catch (_) {
    return null;
  }
}

async function ensureVerificationData(p) {
  let out = { ...p };
  try {
    if (!out.contractName && out.sourceCode) {
      const m = String(out.sourceCode).match(/contract\s+([A-Za-z0-9_]+)/);
      if (m && m[1]) out.contractName = m[1];
    }
  } catch (_) {}
  try {
    const apiKeyInput = document.getElementById("f_apiKey");
    const typedKey = apiKeyInput ? String(apiKeyInput.value || "") : "";
    if (typedKey) {
      out.apiKey = typedKey;
      try {
        window.localStorage && window.localStorage.setItem("bscscan_api_key", typedKey);
      } catch (_) {}
    }
  } catch (_) {}
  try {
    if (!out.apiKey) {
      const saved = getVerifyApiKey();
      if (saved) out.apiKey = saved;
    }
  } catch (_) {}
  try {
    if (!out.compilerVersion && out.metadata) {
      const meta = JSON.parse(out.metadata);
      const ver = meta?.compiler?.version || "";
      if (ver) out.compilerVersion = ver;
    }
  } catch (_) {}
  if (!out.compilerVersion && out.sourceCode && out.contractName) {
    const API_BASE = getApiBase();
    try {
      const resp = await fetch(`${API_BASE}/api/compile-only`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourceCode: out.sourceCode, contractName: out.contractName }) });
      const js = await resp.json().catch(() => null);
      if (js?.success && js?.compilation?.metadata) {
        try {
          const m = JSON.parse(js.compilation.metadata);
          const ver = m?.compiler?.version || "";
          if (ver) out.compilerVersion = ver;
        } catch (_) {}
        if (!out.metadata) out.metadata = js.compilation.metadata;
      }
    } catch (_) {}
  }
  if (!out.compilerVersion) {
    out.compilerVersion = out.compilerVersion || "v0.8.30+commit.73712a01";
  }
  // Ensure version starts with 'v' if it looks like a version number
  if (out.compilerVersion && !out.compilerVersion.startsWith("v") && /^[0-9]/.test(out.compilerVersion)) {
    out.compilerVersion = "v" + out.compilerVersion;
  }
  out.codeformat = out.codeformat || "solidity-single-file";
  out.optimizationUsed = out.optimizationUsed ?? 1;
  out.runs = out.runs ?? 200;
  return out;
}

window.checkVerifiedStatus = async function checkVerifiedStatus(force = false, optAddr = null, optChainId = null) {
  try {
    const now = Date.now();
    if (!force && window.__lastVerifiedCheck && now - window.__lastVerifiedCheck < 1000) return;
    window.__lastVerifiedCheck = now;

    const addr = optAddr || document.getElementById("f_address")?.value || "";
    const nsEl = document.getElementById("networkSearch");
    const cid = optChainId ? parseInt(optChainId, 10) : parseInt(document.getElementById("f_chainId")?.value || nsEl?.dataset?.chainId || "0", 10);

    // Elements
    const generateSection = document.getElementById("generate-section");
    const codeSourceSection = document.getElementById("codeSourceSection");
    const actionButtons = document.getElementById("actionButtons");
    const runBtn = document.getElementById("runVerify");
    const colCn = document.getElementById("col-contract-name");
    const colCv = document.getElementById("col-compiler-version");
    const sourceCodeActions = document.getElementById("sourceCodeActions");

    // Tenta encontrar o badge de várias formas
    let badge = document.getElementById("verifyStatusBadge");
    if (!badge) {
      badge = document.querySelector("#verifyStatusBadge");
    }
    if (!badge) {
      const comp = document.querySelector('[data-component*="contract-search.html"]');
      if (comp) badge = comp.querySelector("#verifyStatusBadge");
    }
    if (!badge) {
      // Tenta encontrar pelo container de badges
      const badges = document.getElementById("csBadges");
      if (badges) badge = badges.querySelector("#verifyStatusBadge");
    }

    if (!addr || !cid) {
      if (generateSection) generateSection.classList.add("d-none");
      if (codeSourceSection) codeSourceSection.classList.add("d-none");
      if (actionButtons) actionButtons.classList.add("d-none");
      if (badge) {
        badge.textContent = "-";
        badge.className = "badge bg-dark-elevated";
      }
      return;
    }

    if (badge) {
      badge.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>Verificando...';
      badge.className = "badge bg-secondary";
      badge.classList.remove("d-none");
    } else {
      console.warn("[verifica] Badge de status não encontrado no DOM");
    }

    const API_BASE = getApiBase();
    let js = null;
    try {
      js = await getVerificationStatus(cid, addr);
    } catch (e) {
      // Fallback para erro não tratado
      try {
        console.error("[verifica]", "Explorer status fetch falhou", e?.message || String(e));
        if (badge) {
          badge.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Erro na busca';
          badge.className = "badge bg-secondary";
          badge.title = "Clique para abrir verificação manual";
          badge.style.cursor = "pointer";
          badge.onclick = () => {
             if (confirm("Deseja abrir o formulário de verificação manual?")) {
                 if (generateSection) generateSection.classList.remove("d-none");
                 if (codeSourceSection) codeSourceSection.classList.remove("d-none");
                 if (actionButtons) actionButtons.classList.remove("d-none");
                 if (runBtn) runBtn.classList.remove("d-none");
                 if (colCn) colCn.classList.add("d-none");
                 if (colCv) colCv.classList.add("d-none");
             }
          };
        }
        
        // CORREÇÃO: Esconder formulário também no catch
        if (generateSection) generateSection.classList.add("d-none");
        if (codeSourceSection) codeSourceSection.classList.add("d-none");
        if (actionButtons) actionButtons.classList.add("d-none");
        if (runBtn) runBtn.classList.add("d-none");
      } catch (_) {}
      return;
    }

    if (js?.error) {
      console.warn("[verifica]", "Status check returned error:", js.message);
      console.log("[verifica] Full JS:", JSON.stringify(js));
      
      if (badge) {
        badge.innerHTML = '<i class="bi bi-exclamation-triangle me-1"></i>Erro na busca';
        badge.className = "badge bg-secondary";
        badge.title = js.message || "Erro desconhecido";
      }

      // NOVO COMPORTAMENTO: Esconder formulário em caso de erro para evitar poluição visual
      // O usuário pode clicar no badge ou usar um botão de "Forçar Verificação" se desejar (futura impl)
      if (generateSection) generateSection.classList.add("d-none");
      if (codeSourceSection) codeSourceSection.classList.add("d-none");
      if (actionButtons) actionButtons.classList.add("d-none");
      if (runBtn) runBtn.classList.add("d-none");

      // Adicionar link para forçar exibição manual se necessário
      if (badge && !badge.querySelector(".retry-link")) {
         // Pequeno hack para permitir retry clicando no badge
         badge.style.cursor = "pointer";
         badge.onclick = () => {
            if (confirm("Deseja abrir o formulário de verificação manual?")) {
                if (generateSection) generateSection.classList.remove("d-none");
                if (codeSourceSection) codeSourceSection.classList.remove("d-none");
                if (actionButtons) actionButtons.classList.remove("d-none");
                if (runBtn) runBtn.classList.remove("d-none");
                // Manter campos extras ocultos
                if (colCn) colCn.classList.add("d-none");
                if (colCv) colCv.classList.add("d-none");
            }
         };
         badge.title = "Clique para abrir verificação manual";
      }

      return;
    }

    const isVerified = !!js?.verified;
    console.log("[verifica]", "Verified status:", isVerified, "Contract:", addr);

    // Reset warning alert visibility
    // document.getElementById("verifiedWarningAlert")?.classList.add("d-none"); // REMOVIDO: Usar apenas o badge superior

    if (isVerified) {
      // VISUAL UPDATE: VERIFIED
      if (badge) {
        badge.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i>Verificado';
        badge.className = "badge bg-success";
        badge.classList.remove("d-none");
      }

      // HIDE FORM SECTIONS
      if (generateSection) generateSection.classList.add("d-none");
      if (colCn) colCn.classList.add("d-none");
      if (colCv) colCv.classList.add("d-none");
      if (codeSourceSection) codeSourceSection.classList.add("d-none");
      if (actionButtons) actionButtons.classList.add("d-none");
      if (runBtn) runBtn.classList.add("d-none");

      // SHOW WARNING: ALREADY VERIFIED
      let warningAlert = document.getElementById("verifiedWarningAlert");
      if (!warningAlert) {
          warningAlert = document.createElement("div");
          warningAlert.id = "verifiedWarningAlert";
          warningAlert.className = "alert alert-success mt-3 text-center";
          warningAlert.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Este contrato já foi verificado e seu código fonte está disponível.';
          // Insert after the search component or at the top of the main container
          const root = document.querySelector(".contract-search-component") || document.getElementById("generate-section")?.parentNode;
          if (root) root.appendChild(warningAlert);
      }
      warningAlert.classList.remove("d-none");

      // Populate hidden fields just in case
      if (js?.sourceCode) {
          const fSrc = document.getElementById("f_sourceCode");
          if (fSrc) {
              fSrc.value = js.sourceCode;
              fSrc.readOnly = true;
          }
      }
      if (js?.metadata) {
           const fMeta = document.getElementById("f_metadata");
           if (fMeta) fMeta.value = js.metadata;
      }

    } else {
      // VISUAL UPDATE: NOT VERIFIED
      if (badge) {
        badge.innerHTML = '<i class="bi bi-shield-x me-1"></i>Não verificado';
        badge.className = "badge bg-danger";
        badge.classList.remove("d-none");
      }
      
      // Hide warning if exists
      const warningAlert = document.getElementById("verifiedWarningAlert");
      if (warningAlert) warningAlert.classList.add("d-none");

      // SHOW FORM SECTIONS
      if (generateSection) generateSection.classList.remove("d-none");
      if (codeSourceSection) codeSourceSection.classList.remove("d-none");
      if (actionButtons) actionButtons.classList.remove("d-none");
      
      // SIMPLIFICATION: Keep extra fields HIDDEN by default
      if (colCn) colCn.classList.add("d-none");
      if (colCv) colCv.classList.add("d-none");
      
      if (sourceCodeActions) sourceCodeActions.classList.remove("d-none");
      const fSrc = document.getElementById("f_sourceCode");
      if (fSrc) fSrc.readOnly = false;

      if (runBtn) {
          runBtn.classList.remove("d-none");
          runBtn.disabled = false;
      }
    }

    if (btnText) btnText.textContent = isVerified ? "Já verificado" : "Verificar Contrato";

    // Texto do explorer status removido conforme solicitação
    const txtEl = document.getElementById("explorerStatusText");
    if (txtEl) txtEl.classList.add("d-none");

    try {
      const cn = js?.explorer?.contractName || "";
      const cv = js?.explorer?.compilerVersion || "";
      const nEl = document.getElementById("f_contractName");
      const vEl = document.getElementById("f_compilerVersion");
      if (nEl && cn && !nEl.value) nEl.value = cn;
      if (vEl && cv && !vEl.value) {
        vEl.value = cv;
        vEl.readOnly = true;
        const lock = document.getElementById("compVerLockIcon");
        const help = document.getElementById("compVerHelp");
        if (lock) lock.classList.toggle("d-none", false);
        if (help) help.classList.toggle("d-none", false);
      }
    } catch (_) {}
  } catch (_) {}
};

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
  const p1 = await ensureVerificationData(p0);
  const p = completePayload(p1);
  fillVisibleForm(p);
  const missing = [];
  if (!p.apiKey) missing.push("API Key");
  if (!p.sourceCode) missing.push("Código fonte");
  if (!p.contractName) missing.push("Nome do contrato");
  if (!p.compilerVersion) missing.push("Compiler Version");
  if (missing.length) {
    logStatus("Campos obrigatórios ausentes: " + missing.join(", "));
    try {
      runBtn.disabled = false;
      spinner.classList.add("d-none");
      btnText.textContent = "Verificar automaticamente";
    } catch (_) {}
    return;
  }
  const explorerUrl = getExplorerContractUrl(p.contractAddress, p.chainId);
  logStatus("Verificando...");
  const res = await runVerifyDirect(p);

  if (res?.success) {
    logStatus("Verificado no Explorer com sucesso!");
    const link = res?.link || explorerUrl;

    // Disable button on success
    try {
      if (runBtn) {
        runBtn.disabled = true;
        runBtn.classList.remove("btn-primary", "btn-outline-success");
        runBtn.classList.add("btn-success", "disabled");
        runBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Verificado';
      }
      if (spinner) spinner.classList.add("d-none");
    } catch (_) {}

    // Show success modal
    showVerificationResultModal(
      true,
      "Contrato Verificado com Sucesso!",
      `<div class="text-center">
         <div class="mb-3"><i class="bi bi-check-circle-fill text-success" style="font-size: 3rem;"></i></div>
         <p>O contrato foi verificado e publicado no explorer.</p>
         <p class="text-muted small">Agora qualquer pessoa pode ler o código fonte e interagir com segurança.</p>
       </div>`,
      link,
    );

    // Broadcast verification success
    try {
      const eventDetail = {
        contract: {
          chainId: p.chainId,
          contractAddress: p.contractAddress, // standard field
          address: p.contractAddress, // alias
          tokenSymbol: p.contractName || "Token", // Fallback
          status: "verified",
          link,
        },
      };
      document.dispatchEvent(new CustomEvent("contract:verified", { detail: eventDetail }));
    } catch (_) {}

    try {
      const histRaw = localStorage.getItem("tokencafe_verify_history");
      const hist = histRaw ? JSON.parse(histRaw) : [];
      hist.unshift({ ts: Date.now(), chainId: p.chainId, address: p.contractAddress, status: res.status, link });
      localStorage.setItem("tokencafe_verify_history", JSON.stringify(hist.slice(0, 10)));
    } catch (_) {}
    return; // Stop here to keep button disabled
  } else {
    if (res?.status === "missing_files") {
      logStatus("Arquivos ausentes: adicione metadata.json ou a fonte .sol antes de verificar.");
      showVerificationResultModal(
        false,
        "Arquivos Ausentes",
        `<div class="text-center">
           <div class="mb-3"><i class="bi bi-exclamation-triangle-fill text-warning" style="font-size: 3rem;"></i></div>
           <p>Faltam arquivos essenciais para verificação.</p>
           <p>Certifique-se de importar o código fonte (.sol) ou o arquivo de metadados (metadata.json).</p>
         </div>`,
        null,
      );
    } else {
      const sc = res?.statusCode ? ` (HTTP ${res.statusCode})` : "";
      const errMsg = res?.error || res?.status || "desconhecido";
      logStatus(`Falha/erro${sc}: ${errMsg}.`);

      showVerificationResultModal(
        false,
        "Falha na Verificação",
        `<div class="text-center">
           <div class="mb-3"><i class="bi bi-x-circle-fill text-danger" style="font-size: 3rem;"></i></div>
           <p>Ocorreu um erro ao tentar verificar o contrato.</p>
           <div class="alert alert-secondary mt-3 text-start small font-monospace">${errMsg}</div>
         </div>`,
        null,
      );
    }
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
        cls = "bg-info";
      }
    } else {
      if (badge) badge.classList.remove("d-none");
      txt = "Pronto para consulta de repositório";
      cls = "bg-info";
    }
    badge.textContent = txt;
    badge.className = "badge " + cls;
    checkVerifiedStatus();
    try {
      safeCheckExplorerStatus();
    } catch (_) {}
  } catch (_) {}
}

function updateCompilerReadOnly() {
  try {
    const metaRaw = document.getElementById("f_metadata")?.value || "";
    const cv = document.getElementById("f_compilerVersion");
    const lock = document.getElementById("compVerLockIcon");
    const help = document.getElementById("compVerHelp");
    if (!cv) return;

    // Default latest version
    const LATEST_VERSION = "v0.8.30+commit.73712a01";
    let foundVersion = null;

    if (metaRaw) {
      try {
        const m = JSON.parse(metaRaw);
        foundVersion = m?.compiler?.version || null;
      } catch (_) {}
    }

    // Set version: from metadata OR latest
    if (foundVersion) {
        cv.value = foundVersion;
    } else {
        // Only overwrite if empty or not set to a specific version yet? 
        // User said: "se não tiver busque a ultima versão".
        // So if we don't have metadata version, we force latest.
        cv.value = LATEST_VERSION;
    }
    
    // Always readonly
    cv.readOnly = true;

    // Lock icon and help text always visible
    if (lock) lock.classList.remove("d-none");
    if (help) {
        help.textContent = foundVersion ? "Versão obtida do metadata.json" : "Versão padrão (última)";
        help.classList.remove("d-none");
    }
  } catch (_) {}
}

// Botão de busca no repositório removido
document.getElementById("runImportSources")?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    const input = document.getElementById("f_sourceFiles");
    const files = input?.files || [];
    if (!files || files.length === 0) return;
    let solFile = null;
    let metaFile = null;
    for (const f of files) {
      const name = String(f?.name || "").toLowerCase();
      if (!solFile && name.endsWith(".sol")) solFile = f;
      if (!metaFile && name.endsWith(".json")) metaFile = f;
    }
    if (metaFile) {
      const txt = await metaFile.text();
      try {
        const js = JSON.parse(txt);
        const metaEl = document.getElementById("f_metadata");
        if (metaEl) metaEl.value = txt;
        const ver = js?.compiler?.version || js?.version || "";
        const cv = document.getElementById("f_compilerVersion");
        if (cv && ver) {
          cv.value = String(ver);
          cv.readOnly = true;
        }
        const ct = js?.settings?.compilationTarget || {};
        const firstFile = Object.keys(ct)[0] || null;
        const cName = firstFile ? ct[firstFile] : null;
        if (cName) {
          const fqnEl = document.getElementById("f_contractNameFQN");
          if (fqnEl) fqnEl.value = `${firstFile}:${cName}`;
          const cnEl = document.getElementById("f_contractName");
          if (cnEl && !cnEl.value) cnEl.value = cName;
        }
      } catch {
        const metaEl2 = document.getElementById("f_metadata");
        if (metaEl2) metaEl2.value = txt;
      }
    }
    if (solFile) {
      const txt = await solFile.text();
      const srcEl = document.getElementById("f_sourceCode");
      if (srcEl) srcEl.value = txt;
      try {
        const m = txt.match(/contract\s+([A-Za-z0-9_]+)/);
        const cName = m && m[1] ? m[1] : "";
        const cnEl = document.getElementById("f_contractName");
        if (cnEl && cName && !cnEl.value) cnEl.value = cName;
        const fqnEl = document.getElementById("f_contractNameFQN");
        if (fqnEl && cName) fqnEl.value = `${solFile.name}:${cName}`;
      } catch {}
    }
    updateCompilerReadOnly();
    computeReadiness();
    logStatus("Arquivos importados.");
  } catch {}
});
document.getElementById("pasteSourceBtn")?.addEventListener("click", async (e) => {
  e.preventDefault();
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    const srcEl = document.getElementById("f_sourceCode");
    if (srcEl) srcEl.value = text;
    const prev = document.getElementById("cardSourcePreview");
    if (prev) prev.textContent = text || "-";

    // Tentativa simples de extrair o nome do contrato
    const m = text.match(/contract\s+([A-Za-z0-9_]+)/);
    const cName = m && m[1] ? m[1] : "";
    const cnEl = document.getElementById("f_contractName");
    if (cnEl && cName) cnEl.value = cName;

    computeReadiness();
    logStatus("Código colado da área de transferência.");
  } catch (err) {
    console.error(err);
    logStatus("Erro ao colar: " + err.message);
  }
});

document.getElementById("clearSourceBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  try {
    const srcEl = document.getElementById("f_sourceCode");
    if (srcEl) srcEl.value = "";
    const prev = document.getElementById("cardSourcePreview");
    if (prev) prev.textContent = "-";
    const cnEl = document.getElementById("f_contractName");
    if (cnEl) cnEl.value = "";

    computeReadiness();
    logStatus("Código fonte limpo.");
  } catch (_) {}
});

document.getElementById("f_metadata")?.addEventListener("input", updateCompilerReadOnly);
document.getElementById("f_metadata")?.addEventListener("change", updateCompilerReadOnly);

document.getElementById("f_address")?.addEventListener("input", () => {
  updateOpenContractLink();
  computeReadiness();
  try {
    safeCheckExplorerStatus();
  } catch (_) {}
});
document.getElementById("f_chainId")?.addEventListener("input", () => {
  updateOpenContractLink();
  computeReadiness();
  try {
    safeCheckExplorerStatus();
  } catch (_) {}
});

const nsContainer = document.querySelector('[data-component*="network-search.html"]')?.parentElement || document;
nsContainer.addEventListener("network:selected", (evt) => {
  try {
    const net = evt && evt.detail ? evt.detail.network : null;
    const srcTag = evt && evt.detail ? evt.detail.source || "unknown" : "unknown";
    if (srcTag !== "user") return;
    if (!net) return;
    const cidEl = document.getElementById("f_chainId");
    if (cidEl) cidEl.value = String(net.chainId);
    const addr = document.getElementById("f_address")?.value || "";
    const cUrl = getExplorerContractUrl(addr, net.chainId);

    // Show contract section when network is selected
    const cSec = document.getElementById("contract-section");
    if (cSec) cSec.classList.remove("d-none");

    const openBtn = document.getElementById("explorerVerifyLink");
    if (openBtn) {
      openBtn.href = cUrl || "#";
      openBtn.classList.toggle("disabled", !cUrl);
    }
    // Sem autofill automático por repositório
    computeReadiness();
    try {
      safeCheckExplorerStatus();
    } catch (_) {}
  } catch (_) {}
});
nsContainer.addEventListener("network:clear", () => {
  try {
    // Hide contract section when network is cleared
    const cSec = document.getElementById("contract-section");
    if (cSec) cSec.classList.add("d-none");

    const cidEl = document.getElementById("f_chainId");
    if (cidEl) cidEl.value = "";
  } catch (_) {}
  computeReadiness();
});

document.addEventListener("DOMContentLoaded", async () => {
  ensureApiBase();
  clearForm();
  logStatus("");
  try {
    updateCompilerReadOnly();
    computeReadiness();
    try {
      safeCheckExplorerStatus();
    } catch (_) {}
  } catch (_) {}
  // Importação rápida via URL (GitHub/raw): ?src=URL&meta=URL&name=ContractName
  try {
    const sp = new URLSearchParams(window.location.search || "");
    const srcUrl = sp.get("src");
    const metaUrl = sp.get("meta");
    const name = sp.get("name");
    if (srcUrl) {
      try {
        const resp = await fetch(srcUrl);
        if (resp.ok) {
          const txt = await resp.text();
          const srcEl = document.getElementById("f_sourceCode");
          if (srcEl) srcEl.value = txt;
          const prev = document.getElementById("cardSourcePreview");
          if (prev) prev.textContent = txt || "-";
          if (name) {
            const nEl = document.getElementById("f_contractName");
            if (nEl) nEl.value = name;
            const tEl = document.getElementById("cardContractName");
            if (tEl) tEl.textContent = name;
          }
          logStatus("Código fonte importado via URL.");
        }
      } catch (_) {}
    }
    if (metaUrl) {
      try {
        const r2 = await fetch(metaUrl);
        if (r2.ok) {
          const txt = await r2.text();
          const metaEl = document.getElementById("f_metadata");
          if (metaEl) metaEl.value = txt;
          const prev = document.getElementById("cardMetadataPreview");
          if (prev) prev.textContent = txt || "-";
          updateCompilerReadOnly();
          logStatus("Metadata importado via URL.");
        }
      } catch (_) {}
    }
    computeReadiness();
  } catch (_) {}
});

try {
  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach(function (tooltipTriggerEl) {
    try {
      new bootstrap.Tooltip(tooltipTriggerEl);
    } catch (_) {}
  });
} catch (_) {}

document.getElementById("runVerify")?.addEventListener("click", runVerify);
document.getElementById("runExplorerDirect")?.addEventListener("click", runExplorerDirect);

try {
  document.getElementById("copySourceBtn")?.addEventListener("click", () => {
    try {
      const txt = document.getElementById("f_sourceCode")?.value || document.getElementById("cardSourcePreview")?.textContent || "";
      if (txt) window.copyToClipboard(txt);
    } catch (_) {}
  });
  document.getElementById("copyMetadataBtn")?.addEventListener("click", () => {
    try {
      const txt = document.getElementById("f_metadata")?.value || document.getElementById("cardMetadataPreview")?.textContent || "";
      if (txt) window.copyToClipboard(txt);
    } catch (_) {}
  });
  document.getElementById("importSourceBtn")?.addEventListener("click", () => {
    document.getElementById("importSourceFile")?.click();
  });
  document.getElementById("importSourceFile")?.addEventListener("change", async (e) => {
    try {
      const f = e.target?.files?.[0];
      if (!f) return;
      const txt = await f.text();
      const srcEl = document.getElementById("f_sourceCode");
      if (srcEl) srcEl.value = txt;
      const prev = document.getElementById("cardSourcePreview");
      if (prev) prev.textContent = txt || "-";
      computeReadiness();
      logStatus("Código fonte importado.");
    } catch (_) {}
  });
  document.getElementById("importMetadataBtn")?.addEventListener("click", () => {
    document.getElementById("importMetadataFile")?.click();
  });
  document.getElementById("importMetadataFile")?.addEventListener("change", async (e) => {
    try {
      const f = e.target?.files?.[0];
      if (!f) return;
      const txt = await f.text();
      const metaEl = document.getElementById("f_metadata");
      if (metaEl) metaEl.value = txt;
      const prev = document.getElementById("cardMetadataPreview");
      if (prev) prev.textContent = txt || "-";
      updateCompilerReadOnly();
      computeReadiness();
      logStatus("Metadata importado.");
    } catch (_) {}
  });
} catch (_) {}

// Funções de detecção e busca foram unificadas no módulo js/shared/contract-search.js

// Busca unificada: delegada ao módulo compartilhado js/shared/contract-search.js
// O módulo emite o evento `contract:found` com os dados consolidados.

document.addEventListener("contract:found", (e) => {
  try {
    const p = e && e.detail ? e.detail.contract : null;
    if (!p) return;

    // Se for carteira (EOA), limpar campos de verificação mas não emitir alerta duplicado
    if (p.assetType === "wallet" || p.isContract === false) {
      // Limpar campos de verificação para evitar confusão
      const vFields = ["f_contractName", "f_sourceCode", "f_metadata", "f_compilerVersion", "f_contractNameFQN"];
      vFields.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

      const vTexts = ["cardContractName", "cardFQN", "cardCompilerVersion", "cardSourcePreview", "cardMetadataPreview"];
      vTexts.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "-";
      });

      computeReadiness();
      return;
    }

    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v != null ? String(v) : "";
    };
    set("f_address", p.contractAddress || "");
    set("f_chainId", p.chainId || "");
    set("f_contractName", p.contractName || "");
    if ((!p.contractName || !String(p.contractName).length) && p.tokenName) {
      const cleaned = String(p.tokenName).replace(/\s+/g, "");
      set("f_contractName", cleaned);
    }
    set("f_contractNameFQN", p.contractNameFQN || "");
    set("f_compilerVersion", p.compilerVersion || "");
    set("f_sourceCode", p.sourceCode || "");
    set("f_metadata", p.metadata || "");
    set("f_runs", typeof p.runs === "number" ? p.runs : 200);
    const opt = document.getElementById("f_optimizationUsed");
    if (opt) opt.value = p.optimizationUsed ? "1" : "0";
    const setText = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v != null && String(v).length ? String(v) : "-";
    };
    setText("cardContractName", p.contractName || "");
    setText("cardTokenSymbolText", p.tokenSymbol || "");
    setText("cardFQN", p.contractNameFQN || (p.contractName ? `${p.contractName}.sol:${p.contractName}` : ""));
    setText("cardChainIdText", p.chainId || "");
    setText("cardAddressText", p.contractAddress || "");
    setText("cardCompilerVersion", p.compilerVersion || "");
    setText("cardOptimization", p.optimizationUsed === 0 || p.optimizationUsed === false ? "0" : "1");
    setText("cardRuns", p.runs ?? 200);
    const langSel = document.getElementById("f_language");
    setText("cardLanguage", langSel ? langSel.value : "solidity");
    const cfSel = document.getElementById("f_codeformat");
    setText("cardCodeformat", cfSel ? cfSel.value : "solidity-single-file");
    setText("cardSourcePreview", p.sourceCode || "");
    setText("cardMetadataPreview", p.metadata || "");
    setText("erc20DecimalsValue", p.tokenDecimals != null ? p.tokenDecimals : "");
    setText("erc20SupplyValue", p.tokenSupply || "");
    setText("erc20TokenBalanceValue", p.contractTokenBalance || "");
    setText("erc20NativeBalanceValue", p.contractNativeBalance || "");
    setText("erc20SymbolValue", p.tokenSymbol || "");
    updateCompilerReadOnly();
    computeReadiness();
    setGlobalData(p);
    checkVerifiedStatus(true);
  } catch (_) {}
});

try {
  document.addEventListener("network:required", () => {
    try {
      const cidEl = document.getElementById("f_chainId");
      if (cidEl) cidEl.value = "";
      // Mensagem removida a pedido do usuário
      // const statusEl = document.getElementById("verifyStatus");
      // if (statusEl) statusEl.textContent = "Selecione uma rede antes de verificar.";
      computeReadiness();
    } catch (_) {}
  });
} catch (_) {}
let _lastExplorerCheck = 0;
async function safeCheckExplorerStatus() {
  const now = Date.now();
  if (now - _lastExplorerCheck < 1500) return;
  _lastExplorerCheck = now;
  return checkExplorerStatus();
}
