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
     // Tenta pegar do localStorage se houver (feature futura)
     return window.localStorage?.getItem("default_bsc_api_key") || "";
  } catch (_) {
      return "";
  }
}

export function completePayload(payload) {
    // Garante campos mínimos
    if (!payload.module) payload.module = "contract";
    if (!payload.action) payload.action = "verifysourcecode";
    if (!payload.codeformat) payload.codeformat = "solidity-standard-json-input"; 
    // Se for single file, o backend ajusta ou o caller ajusta
    return payload;
}

export async function runVerifyDirect(payload) {
    const API_BASE = getApiBase();
    const url = `${API_BASE}/api/verify-contract`; // Proxy endpoint
    
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const js = await resp.json();
        return js;
    } catch (e) {
        return { status: "0", message: "Network/Server Error: " + String(e), result: "" };
    }
}

export async function getVerificationStatus(chainId, address) {
    const API_BASE = getApiBase();
    const url = `${API_BASE}/api/explorer-getsourcecode?chainId=${chainId}&address=${address}`;
    
    // Check cache
    const cacheKey = `verif_status_v2_${chainId}_${address}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch (_) {}
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
        
        const resp = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const js = await resp.json();
        
        // Cache ONLY if verified is true (to allow re-checking if verification is pending or failed previously)
        if (js && js.success && js.verified) {
            sessionStorage.setItem(cacheKey, JSON.stringify(js));
        }
        return js;
    } catch (e) {
        try {
            const shouldLog = !!window.DEBUG_VERIFY || window.localStorage?.getItem("debug_verify") === "1";
            if (shouldLog) console.error("[verify-utils] getVerificationStatus error:", e);
        } catch (_) {}
        // Return object with error property so caller handles it
        return { success: false, error: true, message: e.message || String(e) };
    }
}
