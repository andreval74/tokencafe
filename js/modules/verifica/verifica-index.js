import { getExplorerVerificationUrl, getExplorerContractUrl } from "./explorer-utils.js";

const statusEl = document.getElementById("verifyStatus");
const runBtn = document.getElementById("runVerify");
const openBtn = document.getElementById("openContractLink");
const spinner = document.getElementById("verifySpinner");
const btnText = document.getElementById("verifyBtnText");
const API_BASE = window.TOKENCAFE_API_BASE || window.localStorage?.getItem("api_base") || "http://localhost:3000";

(function () {
  try {
    const origFetch = window.fetch;
    window.fetch = async function (url, opts) {
      const resp = await origFetch(url, opts);
      try {
        const shouldLog = /\/api\//.test(String(url));
        if (shouldLog) {
          const clone = resp.clone();
          const ct = String(clone.headers.get("content-type") || "");
          if (ct.includes("application/json")) {
            const data = await clone.json();
            console.log("[verifica]", "Response", url, resp.status, data);
          } else {
            console.log("[verifica]", "Response", url, resp.status);
          }
        }
        if (String(url).includes("/api/verify-sourcify-upload") && resp.status === 404) {
          try {
            const el = document.getElementById("apiHelp");
            if (el) el.classList.remove("d-none");
          } catch (_) {}
        }
      } catch (_) {}
      return resp;
    };
  } catch (_) {}
})();

function ensureApiBase() {
  try {
    const el = document.getElementById("apiHelp");
    const base = window.TOKENCAFE_API_BASE || window.localStorage?.getItem("api_base") || null;
    const siteHost = String(window.location.hostname || "");
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

function getVerifyApiKey() {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    const q = sp.get("bscapi");
    if (q) {
      try {
        localStorage.setItem("bscscan_api_key", q);
      } catch (_) {}
      return q;
    }
  } catch (_) {}
  try {
    if (typeof window.TOKENCAFE_BSCSCAN_API_KEY !== "undefined" && window.TOKENCAFE_BSCSCAN_API_KEY) return window.TOKENCAFE_BSCSCAN_API_KEY;
  } catch (_) {}
  try {
    return localStorage.getItem("bscscan_api_key");
  } catch (_) {
    return null;
  }
}

function completePayload(p) {
  const meta = p?.metadata ? JSON.parse(p.metadata) : null;
  return {
    ...p,
    compilerVersion: p?.compilerVersion || meta?.compiler?.version || null,
    optimizationUsed: p?.optimizationUsed ?? true,
    runs: p?.runs ?? 200,
    codeformat: p?.codeformat || "solidity-single-file",
    contractNameFQN: p?.contractNameFQN || (p?.contractName ? `${p.contractName}.sol:${p.contractName}` : null),
    apiKey: p?.apiKey || getVerifyApiKey(),
  };
}

function setGlobalData(p) {
  try {
    const parsed = p?.metadata ? JSON.parse(p.metadata) : null;
    window.VERIFY_CONTRACT_DATA = { ...(window.VERIFY_CONTRACT_DATA || {}), ...p, parsedMetadata: parsed };
  } catch (_) {
    window.VERIFY_CONTRACT_DATA = { ...(window.VERIFY_CONTRACT_DATA || {}), ...p };
  }
}

function fillSourcifyHiddenForm(p) {
  try {
    const f = document.getElementById("sourcifyForm");
    if (!f) return;
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v != null ? String(v) : "";
    };
    set("sf_chainId", p?.chainId || "");
    set("sf_address", p?.contractAddress || "");
    set("sf_metadata", p?.metadata || "");
    set("sf_source", p?.sourceCode || "");
  } catch (_) {}
}

function fillVisibleForm(p) {
  try {
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v != null ? String(v) : "";
    };
    set("f_address", p?.contractAddress || "");
    set("f_chainId", p?.chainId || "");
    set("f_contractName", p?.contractName || "");
    set("f_compilerVersion", p?.compilerVersion || "");
    const cf = document.getElementById("f_codeformat");
    if (cf) cf.value = p?.codeformat || "solidity-single-file";
    set("f_contractNameFQN", p?.contractNameFQN || (p?.contractName ? `${p.contractName}.sol:${p.contractName}` : ""));
    const opt = document.getElementById("f_optimizationUsed");
    if (opt) opt.value = p?.optimizationUsed === false ? "0" : "1";
    set("f_runs", p?.runs ?? 200);
    set("f_sourceCode", p?.sourceCode || "");
    set("f_metadata", p?.metadata || "");
    set("f_apiKey", p?.apiKey || "");
    set("f_constructorArgs", p?.constructorArguments || "");
    const cUrl = getExplorerContractUrl(p?.contractAddress, p?.chainId);
    if (openBtn) {
      openBtn.href = cUrl || "#";
      openBtn.classList.toggle("disabled", !cUrl);
    }
    setGlobalData(p);
    const t = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v != null && String(v).length ? String(v) : "-";
    };
    t("cardContractName", p?.contractName || "");
    t("cardTokenSymbolText", p?.tokenSymbol || "");
    t("cardFQN", p?.contractNameFQN || (p?.contractName ? `${p.contractName}.sol:${p.contractName}` : ""));
    t("cardChainIdText", p?.chainId || "");
    t("cardAddressText", p?.contractAddress || "");
    t("cardCompilerVersion", p?.compilerVersion || "");
    t("cardOptimization", p?.optimizationUsed === 0 || p?.optimizationUsed === false ? "0" : "1");
    t("cardRuns", p?.runs ?? 200);
    const langSel = document.getElementById("f_language");
    const langVal = p?.language || (langSel ? langSel.value : "");
    t("cardLanguage", langVal || "solidity");
    const cfSel = document.getElementById("f_codeformat");
    const cfVal = p?.codeformat || (cfSel ? cfSel.value : "");
    t("cardCodeformat", cfVal || "solidity-single-file");
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
      apiKey: get("f_apiKey") || getVerifyApiKey() || null,
      constructorArguments: get("f_constructorArgs") || null,
    };
  } catch (_) {
    return null;
  }
}

async function checkVerifiedStatus() {
  try {
    const addr = document.getElementById("f_address")?.value || "";
    const cid = parseInt(document.getElementById("f_chainId")?.value || document.getElementById("networkSearch")?.dataset?.chainId || "0", 10);
    if (!addr || !cid) return;
    let isVerified = false;
    let sourStatus = "";
    let httpCode = 0;
    try {
      const cResp = await fetch(`https://sourcify.dev/server/contract/${cid}/${addr.toLowerCase()}`);
      httpCode = cResp.status;
      if (cResp.ok) {
        const cj = await cResp.json();
        const st = String(cj?.status || "").toLowerCase();
        sourStatus = st;
        isVerified = st === "perfect" || st === "full";
      } else {
        isVerified = false;
      }
    } catch (_) {
      isVerified = false;
    }
    const txtEl = document.getElementById("sourcifyStatusText");
    if (isVerified) {
      logStatus("Contrato já verificado na rede.");
      if (runBtn) runBtn.disabled = true;
      if (btnText) btnText.textContent = "Já verificado";
      const badge = document.getElementById("verifyStatusBadge");
      if (badge) {
        badge.textContent = "Verificado";
        badge.className = "badge bg-success";
      }
      const cUrl = getExplorerContractUrl(addr, cid);
      if (openBtn) {
        openBtn.href = cUrl || "#";
        openBtn.classList.toggle("disabled", !cUrl);
      }
      if (txtEl) txtEl.textContent = sourStatus ? `Sourcify: ${sourStatus}` : "Sourcify: verificado";
    } else {
      const badge = document.getElementById("verifyStatusBadge");
      if (badge) {
        badge.textContent = "Não verificado";
        badge.className = "badge bg-warning";
      }
      if (runBtn) runBtn.disabled = false;
      if (btnText) btnText.textContent = "Verificar automaticamente";
      if (spinner) spinner.classList.add("d-none");
      if (txtEl) txtEl.textContent = httpCode ? `Sourcify: não verificado (HTTP ${httpCode})` : "Sourcify: não verificado";
    }
  } catch (_) {}
}

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
  const p = completePayload(p0);
  fillSourcifyHiddenForm(p);
  fillVisibleForm(p);
  try {
    console.log("[verify] start verify-auto", { address: p.contractAddress, chainId: p.chainId, compilerVersion: p.compilerVersion, hasMetadata: !!p.metadata });
  } catch (_) {}
  const explorerUrl = getExplorerContractUrl(p.contractAddress, p.chainId);
  if (openBtn) {
    openBtn.href = explorerUrl || "#";
    openBtn.classList.toggle("disabled", !explorerUrl);
  }
  try {
    logStatus("Tentando verificação automática...");
    const resp = await fetch(`${API_BASE}/api/verify-auto`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chainId: p.chainId, contractAddress: p.contractAddress }) });
    if (resp.ok) {
      const data = await resp.json();
      try {
        console.log("[verify] verify-auto response", data);
      } catch (_) {}
      const ok = !!data?.success || !!data?.verified;
      const link = data?.link || data?.lookupUrl || data?.explorerUrl || explorerUrl;
      if (ok) {
        const confirmed = await (async () => {
          try {
            const cResp = await fetch(`https://sourcify.dev/server/contract/${p.chainId}/${String(p.contractAddress).toLowerCase()}`);
            if (!cResp.ok) return false;
            const cj = await cResp.json();
            const st = String(cj?.status || "").toLowerCase();
            return st === "perfect" || st === "full";
          } catch (_) {
            return false;
          }
        })();
        if (confirmed) {
          logStatus("Verificação concluída.");
          if (openBtn) {
            openBtn.href = link || explorerUrl;
            openBtn.classList.remove("disabled");
          }
          try {
            const histRaw = localStorage.getItem("tokencafe_verify_history");
            const hist = histRaw ? JSON.parse(histRaw) : [];
            hist.unshift({ ts: Date.now(), chainId: p.chainId, address: p.contractAddress, status: "success", link });
            localStorage.setItem("tokencafe_verify_history", JSON.stringify(hist.slice(0, 10)));
          } catch (_) {}
        } else {
          try {
            logStatus("Publicando no Sourcify...");
            const up = await fetch(`${API_BASE}/api/verify-sourcify-upload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
            if (up.ok) {
              const uj = await up.json();
              if (uj?.success) {
                const confirmedUp = await (async () => {
                  try {
                    const c = await fetch(`https://sourcify.dev/server/contract/${p.chainId}/${String(p.contractAddress).toLowerCase()}`);
                    if (!c.ok) return false;
                    const cj = await c.json();
                    const st = String(cj?.status || "").toLowerCase();
                    return st === "perfect" || st === "full";
                  } catch (_) {
                    return false;
                  }
                })();
                const ulink = uj?.link || link || explorerUrl;
                if (confirmedUp) {
                  logStatus("Verificado no Sourcify.");
                  if (openBtn) {
                    openBtn.href = ulink;
                    openBtn.classList.remove("disabled");
                  }
                  try {
                    const histRaw = localStorage.getItem("tokencafe_verify_history");
                    const hist = histRaw ? JSON.parse(histRaw) : [];
                    hist.unshift({ ts: Date.now(), chainId: p.chainId, address: p.contractAddress, status: "sourcify", link: ulink });
                    localStorage.setItem("tokencafe_verify_history", JSON.stringify(hist.slice(0, 10)));
                  } catch (_) {}
                  return;
                }
              }
            }
          } catch (_) {}
          logStatus("Auto indisponível. Enviando ao explorer...");
          const hasKey = !!(p.apiKey || getVerifyApiKey());
          if (!hasKey) {
            const vUrl = getExplorerVerificationUrl(p.contractAddress, p.chainId);
            logStatus(`API Key ausente. Abra manualmente: ${vUrl}`);
            if (openBtn) {
              openBtn.href = vUrl || "#";
              openBtn.classList.remove("disabled");
            }
          } else {
            const respV = await fetch(`${API_BASE}/api/verify-bscscan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
            if (respV.ok) {
              const dataV = await respV.json();
              const vUrl = dataV?.explorerUrl || explorerUrl;
              const okV = !!dataV?.success;
              logStatus(okV ? "Verificação concluída (explorer)." : "Verificação enviada/pendente. Acompanhe no explorer.");
              if (openBtn) {
                openBtn.href = vUrl;
                openBtn.classList.remove("disabled");
              }
              try {
                const histRaw = localStorage.getItem("tokencafe_verify_history");
                const hist = histRaw ? JSON.parse(histRaw) : [];
                hist.unshift({ ts: Date.now(), chainId: p.chainId, address: p.contractAddress, status: okV ? "explorer-success" : "explorer-pending", link: vUrl });
                localStorage.setItem("tokencafe_verify_history", JSON.stringify(hist.slice(0, 10)));
              } catch (_) {}
              const guid = dataV?.guid || null;
              if (!okV && guid) {
                let tries = 0;
                const interval = setInterval(async () => {
                  tries++;
                  try {
                    const st = await fetch(`${API_BASE}/api/verify-bscscan-status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chainId: p.chainId, guid, apiKey: p.apiKey }) });
                    if (st.ok) {
                      const js = await st.json();
                      if (js?.success) {
                        clearInterval(interval);
                        logStatus("Verificação concluída (explorer).");
                        if (openBtn) {
                          openBtn.href = vUrl;
                          openBtn.classList.remove("disabled");
                        }
                      }
                    }
                  } catch (_) {}
                  if (tries >= 10) clearInterval(interval);
                }, 4000);
              }
            } else {
              const txtV = await respV.text();
              logStatus(`Falha no envio ao explorer: ${txtV}`);
            }
          }
        }
      } else {
        try {
          logStatus("Publicando no Sourcify...");
          const up = await fetch(`${API_BASE}/api/verify-sourcify-upload`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
          if (up.ok) {
            const uj = await up.json();
            if (uj?.success) {
              const confirmedUp = await (async () => {
                try {
                  const c = await fetch(`https://sourcify.dev/server/contract/${p.chainId}/${String(p.contractAddress).toLowerCase()}`);
                  if (!c.ok) return false;
                  const cj = await c.json();
                  const st = String(cj?.status || "").toLowerCase();
                  return st === "perfect" || st === "full";
                } catch (_) {
                  return false;
                }
              })();
              const ulink = uj?.link || link || explorerUrl;
              if (confirmedUp) {
                logStatus("Verificado no Sourcify.");
                if (openBtn) {
                  openBtn.href = ulink;
                  openBtn.classList.remove("disabled");
                }
                try {
                  const histRaw = localStorage.getItem("tokencafe_verify_history");
                  const hist = histRaw ? JSON.parse(histRaw) : [];
                  hist.unshift({ ts: Date.now(), chainId: p.chainId, address: p.contractAddress, status: "sourcify", link: ulink });
                  localStorage.setItem("tokencafe_verify_history", JSON.stringify(hist.slice(0, 10)));
                } catch (_) {}
                return;
              }
            }
          }
        } catch (_) {}
        logStatus("Auto indisponível. Enviando ao explorer...");
        const hasKey = !!(p.apiKey || getVerifyApiKey());
        if (!hasKey) {
          const vUrl = getExplorerVerificationUrl(p.contractAddress, p.chainId);
          logStatus(`API Key ausente. Abra manualmente: ${vUrl}`);
          if (openBtn) {
            openBtn.href = vUrl || "#";
            openBtn.classList.remove("disabled");
          }
        } else {
          const respV = await fetch(`${API_BASE}/api/verify-bscscan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
          if (respV.ok) {
            const dataV = await respV.json();
            const vUrl = dataV?.explorerUrl || explorerUrl;
            const okV = !!dataV?.success;
            logStatus(okV ? "Verificação concluída (explorer)." : "Verificação enviada/pendente. Acompanhe no explorer.");
            if (openBtn) {
              openBtn.href = vUrl;
              openBtn.classList.remove("disabled");
            }
            try {
              const histRaw = localStorage.getItem("tokencafe_verify_history");
              const hist = histRaw ? JSON.parse(histRaw) : [];
              hist.unshift({ ts: Date.now(), chainId: p.chainId, address: p.contractAddress, status: okV ? "explorer-success" : "explorer-pending", link: vUrl });
              localStorage.setItem("tokencafe_verify_history", JSON.stringify(hist.slice(0, 10)));
            } catch (_) {}
            const guid = dataV?.guid || null;
            if (!okV && guid) {
              let tries = 0;
              const interval = setInterval(async () => {
                tries++;
                try {
                  const st = await fetch(`${API_BASE}/api/verify-bscscan-status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chainId: p.chainId, guid, apiKey: p.apiKey }) });
                  if (st.ok) {
                    const js = await st.json();
                    if (js?.success) {
                      clearInterval(interval);
                      logStatus("Verificação concluída (explorer).");
                      if (openBtn) {
                        openBtn.href = vUrl;
                        openBtn.classList.remove("disabled");
                      }
                    }
                  }
                } catch (_) {}
                if (tries >= 10) clearInterval(interval);
              }, 4000);
            }
          } else {
            const txtV = await respV.text();
            logStatus(`Falha no envio ao explorer: ${txtV}`);
          }
        }
      }
    } else {
      const txt = await resp.text();
      logStatus(`Falha ao iniciar verificação automática: ${txt}. Iniciando fallback no explorer...`);
      const k2 = getVerifyApiKey();
      if (!k2) {
        const vUrl = getExplorerVerificationUrl(p.contractAddress, p.chainId);
        logStatus(`API Key ausente. Abra manualmente: ${vUrl}`);
        if (openBtn) {
          openBtn.href = vUrl || "#";
          openBtn.classList.remove("disabled");
        }
      } else {
        const respV = await fetch(`${API_BASE}/api/verify-bscscan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chainId: p.chainId, contractAddress: p.contractAddress, sourceCode: p.sourceCode, contractName: p.contractName, compilerVersion: p.compilerVersion, optimizationUsed: true, runs: 200, codeformat: "solidity-single-file", contractNameFQN: `${p.contractName}.sol:${p.contractName}`, apiKey: k2 }) });
        if (respV.ok) {
          const dataV = await respV.json();
          const vUrl = getExplorerVerificationUrl(p.contractAddress, p.chainId);
          const okV = !!dataV?.success;
          logStatus(okV ? "Verificação concluída (explorer)." : "Verificação enviada/pendente. Acompanhe no explorer.");
          if (openBtn) {
            openBtn.href = vUrl;
            openBtn.classList.remove("disabled");
          }
          try {
            const histRaw = localStorage.getItem("tokencafe_verify_history");
            const hist = histRaw ? JSON.parse(histRaw) : [];
            hist.unshift({ ts: Date.now(), chainId: p.chainId, address: p.contractAddress, status: okV ? "explorer-success" : "explorer-pending", link: vUrl });
            localStorage.setItem("tokencafe_verify_history", JSON.stringify(hist.slice(0, 10)));
          } catch (_) {}
          let tries = 0;
          const maxTries = 20;
          const interval = setInterval(async () => {
            tries++;
            try {
              const st = await fetch(`${API_BASE}/api/verify-bscscan-status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chainId: p.chainId, guid: dataV?.guid, apiKey: p.apiKey }) });
              if (st.ok) {
                const js = await st.json();
                if (js?.success) {
                  clearInterval(interval);
                  logStatus("Verificação concluída (explorer).");
                }
              }
            } catch (_) {}
            if (tries >= maxTries) clearInterval(interval);
          }, 5000);
        } else {
          const txtV = await respV.text();
          logStatus(`Falha no envio ao explorer: ${txtV}`);
        }
      }
    }
  } catch (e) {
    logStatus(`Erro na verificação: ${e?.message || e}. Abra manualmente o explorer.`);
  }
  try {
    runBtn.disabled = false;
    spinner.classList.add("d-none");
    btnText.textContent = "Verificar automaticamente";
  } catch (_) {}
}

async function runExplorerDirect() {
  try {
    const p = completePayload(buildPayloadFromForm());
    if (!p || !p.contractAddress || !p.chainId || !p.sourceCode || !p.contractName) {
      logStatus("Preencha o formulário acima com todos os campos.");
      return;
    }
    const hasKey = !!(p.apiKey || getVerifyApiKey());
    if (!hasKey) {
      const vUrl = getExplorerVerificationUrl(p.contractAddress, p.chainId);
      logStatus(`API Key ausente. Abra manualmente: ${vUrl}`);
      if (openBtn) {
        openBtn.href = vUrl || "#";
        openBtn.classList.remove("disabled");
      }
      return;
    }
    logStatus("Enviando verificação ao explorer (direto)...");
    const respV = await fetch(`${API_BASE}/api/verify-bscscan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
    if (respV.ok) {
      const dataV = await respV.json();
      const vUrl = dataV?.explorerUrl || getExplorerVerificationUrl(p.contractAddress, p.chainId);
      const okV = !!dataV?.success;
      if (openBtn) {
        openBtn.href = vUrl || "#";
        openBtn.classList.remove("disabled");
      }
      logStatus(okV ? "Verificação concluída (explorer)." : "Verificação enviada/pendente. Acompanhe no explorer.");
      const guid = dataV?.guid || null;
      if (!okV && guid) {
        let tries = 0;
        const maxTries = 20;
        const interval = setInterval(async () => {
          tries++;
          try {
            const st = await fetch(`${API_BASE}/api/verify-bscscan-status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chainId: p.chainId, guid, apiKey: p.apiKey }) });
            if (st.ok) {
              const js = await st.json();
              if (js?.success) {
                clearInterval(interval);
                logStatus("Verificação concluída (explorer).");
              }
            }
          } catch (_) {}
          if (tries >= maxTries) clearInterval(interval);
        }, 5000);
      }
    } else {
      const txtV = await respV.text();
      logStatus(`Falha no envio ao explorer: ${txtV}`);
    }
  } catch (e) {
    logStatus(`Erro: ${e?.message || e}`);
  }
}

function clearForm() {
  try {
    const ids = ["f_address", "f_chainId", "f_contractName", "f_compilerVersion", "f_codeformat", "f_contractNameFQN", "f_optimizationUsed", "f_runs", "f_sourceCode", "f_metadata", "f_apiKey", "f_constructorArgs"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.tagName === "SELECT") el.value = el.querySelector("option")?.value || "";
      else el.value = "";
    }
    const resetTextIds = ["cardContractName", "cardTokenSymbolText", "cardFQN", "cardChainIdText", "cardAddressText", "cardCompilerVersion", "cardOptimization", "cardRuns", "cardLanguage", "cardCodeformat", "cardSourcePreview", "cardMetadataPreview", "erc20SymbolValue", "erc20DecimalsValue", "erc20SupplyValue", "erc20TokenBalanceValue", "erc20NativeBalanceValue"];
    for (const id of resetTextIds) {
      const el = document.getElementById(id);
      if (el) el.textContent = "-";
    }
    localStorage.removeItem("tokencafe_contract_verify_payload");
    logStatus("Formulário limpo.");
  } catch (_) {}
}

async function autofillFromSourcify() {
  try {
    const addr = document.getElementById("f_address")?.value || "";
    const chainId = parseInt(document.getElementById("f_chainId")?.value || "0", 10);
    if (!addr || !chainId) return;
    const resp = await fetch(`https://sourcify.dev/server/files/${chainId}/${addr}`);
    if (!resp.ok) return;
    const files = await resp.json();
    const metadataFile = Array.isArray(files) ? files.find((f) => f?.name === "metadata.json") : null;
    if (!metadataFile || !metadataFile.content) return;
    const meta = JSON.parse(metadataFile.content);
    const compTarget = meta?.settings?.compilationTarget || {};
    const firstFile = Object.keys(compTarget)[0] || null;
    const cName = firstFile ? compTarget[firstFile] : null;
    const srcContent = firstFile && meta?.sources?.[firstFile]?.content ? meta.sources[firstFile].content : null;
    const fqn = firstFile && cName ? `${firstFile}:${cName}` : null;
    const payload = {
      chainId,
      contractAddress: addr,
      contractName: cName || "",
      compilerVersion: meta?.compiler?.version || "",
      optimizationUsed: meta?.settings?.optimizer?.enabled ? 1 : 0,
      runs: meta?.settings?.optimizer?.runs ?? 200,
      codeformat: "solidity-single-file",
      contractNameFQN: fqn || (cName ? `${cName}.sol:${cName}` : null),
      sourceCode: srcContent || "",
      metadata: JSON.stringify(meta),
    };
    fillVisibleForm(payload);
    fillSourcifyHiddenForm(payload);
    try {
      const cv = document.getElementById("f_compilerVersion");
      if (cv && payload.compilerVersion) {
        cv.value = String(payload.compilerVersion);
        cv.readOnly = true;
      }
      const lock = document.getElementById("compVerLockIcon");
      const help = document.getElementById("compVerHelp");
      if (lock) lock.classList.toggle("d-none", !cv?.readOnly);
      if (help) help.classList.toggle("d-none", !cv?.readOnly);
    } catch (_) {}
    logStatus("Dados preenchidos automaticamente via Sourcify.");
    setGlobalData(payload);
    checkVerifiedStatus();
  } catch (_) {}
}

function updateOpenContractLink() {
  try {
    const addr = document.getElementById("f_address")?.value || "";
    const cid = parseInt(document.getElementById("f_chainId")?.value || "0", 10);
    const cUrl = getExplorerContractUrl(addr, cid);
    if (openBtn) {
      openBtn.href = cUrl || "#";
      openBtn.classList.toggle("disabled", !cUrl);
    }
  } catch (_) {}
}

function computeReadiness() {
  try {
    const addr = document.getElementById("f_address")?.value || "";
    const nsEl = document.getElementById("networkSearch");
    const cid = String(document.getElementById("f_chainId")?.value || nsEl?.dataset?.chainId || "");
    const name = document.getElementById("f_contractName")?.value || "";
    const ver = document.getElementById("f_compilerVersion")?.value || "";
    const fqn = document.getElementById("f_contractNameFQN")?.value || "";
    const src = document.getElementById("f_sourceCode")?.value || "";
    const meta = document.getElementById("f_metadata")?.value || "";
    const api = document.getElementById("f_apiKey")?.value || "";
    const lang = document.getElementById("f_language")?.value || "";
    const badge = document.getElementById("verifyStatusBadge");
    if (!badge) return;
    let txt = "Aguardando";
    let cls = "bg-secondary";
    if (!addr || !cid || !lang) {
      txt = "Endereço, ChainId e Language obrigatórios";
      cls = "bg-danger";
    } else if (src || meta) {
      if (name && ver && (fqn || name)) {
        txt = api ? "Pronto (com explorer)" : "Pronto (Sourcify)";
        cls = "bg-success";
      } else {
        txt = "Dados do compilador incompletos";
        cls = "bg-warning";
      }
    } else {
      txt = "Pronto para consulta de repositório";
      cls = "bg-info";
    }
    badge.textContent = txt;
    badge.className = "badge " + cls;
    checkVerifiedStatus();
  } catch (_) {}
}

function updateCompilerReadOnly() {
  try {
    const metaRaw = document.getElementById("f_metadata")?.value || "";
    const cv = document.getElementById("f_compilerVersion");
    const lock = document.getElementById("compVerLockIcon");
    const help = document.getElementById("compVerHelp");
    if (!cv) return;
    if (metaRaw) {
      try {
        const m = JSON.parse(metaRaw);
        const ver = m?.compiler?.version || "";
        if (ver) cv.value = String(ver);
        cv.readOnly = !!ver;
      } catch (_) {
        cv.readOnly = false;
      }
    } else {
      cv.readOnly = false;
    }
    if (lock) lock.classList.toggle("d-none", !cv.readOnly);
    if (help) help.classList.toggle("d-none", !cv.readOnly);
  } catch (_) {}
}

document.getElementById("clearFormBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  clearForm();
});
document.getElementById("runSourcifyDirect")?.addEventListener("click", (e) => {
  e.preventDefault();
  autofillFromSourcify();
});
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
document.getElementById("f_toggleApiKey")?.addEventListener("click", (e) => {
  e.preventDefault();
  const i = document.getElementById("f_apiKey");
  if (!i) return;
  i.type = i.type === "password" ? "text" : "password";
  e.target.textContent = i.type === "password" ? "Mostrar" : "Ocultar";
});
document.getElementById("apiKeyReveal")?.addEventListener("click", (e) => {
  e.preventDefault();
  const c = document.getElementById("apiKeyField");
  if (!c) return;
  c.classList.remove("d-none");
  e.target.classList.add("d-none");
});

document.getElementById("f_metadata")?.addEventListener("input", updateCompilerReadOnly);
document.getElementById("f_metadata")?.addEventListener("change", updateCompilerReadOnly);

document.getElementById("f_address")?.addEventListener("input", () => {
  updateOpenContractLink();
  computeReadiness();
});
document.getElementById("f_chainId")?.addEventListener("input", () => {
  updateOpenContractLink();
  computeReadiness();
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
    if (openBtn) {
      openBtn.href = cUrl || "#";
      openBtn.classList.toggle("disabled", !cUrl);
    }
    const src = document.getElementById("f_sourceCode")?.value || "";
    const meta = document.getElementById("f_metadata")?.value || "";
    if (!src && !meta && addr) autofillFromSourcify();
    computeReadiness();
  } catch (_) {}
});
nsContainer.addEventListener("network:clear", () => {
  try {
    const cidEl = document.getElementById("f_chainId");
    if (cidEl) cidEl.value = "";
  } catch (_) {}
  computeReadiness();
});

document.addEventListener("DOMContentLoaded", async () => {
  ensureApiBase();
  clearForm();
  logStatus("Informe a rede e o endereço do contrato para buscar os dados.");
  try {
    updateCompilerReadOnly();
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
      if (txt && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
    } catch (_) {}
  });
  document.getElementById("copyMetadataBtn")?.addEventListener("click", () => {
    try {
      const txt = document.getElementById("f_metadata")?.value || document.getElementById("cardMetadataPreview")?.textContent || "";
      if (txt && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
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
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v != null ? String(v) : "";
    };
    set("f_address", p.contractAddress || "");
    set("f_chainId", p.chainId || "");
    set("f_contractName", p.contractName || "");
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
    checkVerifiedStatus();
    try {
      const parts = [];
      if (p.tokenSymbol) parts.push(`Símbolo: ${p.tokenSymbol}`);
      if (p.tokenDecimals != null) parts.push(`Decimals: ${p.tokenDecimals}`);
      if (p.tokenSupply) parts.push(`Supply: ${p.tokenSupply}`);
      if (p.contractTokenBalance) parts.push(`Saldo contrato: ${p.contractTokenBalance}`);
      if (p.contractNativeBalance) parts.push(`Saldo nativo: ${p.contractNativeBalance}`);
      if (parts.length) logStatus(parts.join(" | "));
    } catch {}
  } catch (_) {}
});

try {
  document.addEventListener("network:required", () => {
    try {
      const cidEl = document.getElementById("f_chainId");
      if (cidEl) cidEl.value = "";
      const statusEl = document.getElementById("verifyStatus");
      if (statusEl) statusEl.textContent = "Selecione uma rede antes de verificar.";
      computeReadiness();
    } catch (_) {}
  });
} catch (_) {}
