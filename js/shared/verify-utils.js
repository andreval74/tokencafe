// Utilitários de verificação via Explorer (BscScan/Etherscan)
// Padroniza coleta de API key, montagem de payload e fluxo de verificação

export function getApiBase() {
  try {
    const fromWin = window.TOKENCAFE_API_BASE || window.XCAFE_API_BASE || null;
    const fromLs = window.localStorage?.getItem("api_base") || null;
    const base = fromWin || fromLs || "http://localhost:3000";
    return base;
  } catch (_) {
    return "http://localhost:3000";
  }
}

export function getVerifyApiKey() {
  try {
    const sp = new URLSearchParams(window.location.search || "");
    const fromQuery = sp.get("bscapi");
    if (fromQuery) return fromQuery;
  } catch (_) {}
  try {
    if (typeof window.TOKENCAFE_BSCSCAN_API_KEY !== "undefined" && window.TOKENCAFE_BSCSCAN_API_KEY) {
      return window.TOKENCAFE_BSCSCAN_API_KEY;
    }
  } catch (_) {}
  try {
    return window.localStorage ? window.localStorage.getItem("bscscan_api_key") : null;
  } catch (_) {
    return null;
  }
}

export function completePayload(p) {
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

export async function runVerifyDirect(p) {
  const API_BASE = getApiBase();
  const addr = p?.contractAddress;
  const cid = p?.chainId;
  if (!addr || !cid) return { success: false, status: "invalid" };
  const p2 = completePayload(p);
  try {
    const up = await fetch(`${API_BASE}/api/verify-bscscan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p2),
    });
    const js = await up.json().catch(async () => ({ success: false, error: await up.text() }));
    if (!up.ok || !js?.success) {
      return { success: false, status: "error", error: js?.error || js?.message || "Falha no envio para explorer" };
    }
    const guid = js?.guid || "";
    const explorerUrl = js?.explorerUrl || null;
    if (!guid) return { success: false, status: "error", error: "GUID ausente" };
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      try {
        const chk = await fetch(`${API_BASE}/api/verify-bscscan-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chainId: cid, guid, apiKey: p2.apiKey }),
        });
        const cj = await chk.json();
        if (cj?.success) return { success: true, status: "explorer", link: explorerUrl || null };
      } catch (_) {}
    }
    return { success: false, status: "pending", link: explorerUrl || null };
  } catch (e) {
    return { success: false, status: "error", error: e?.message || String(e) };
  }
}

// Sem suporte a lote via explorer por enquanto
