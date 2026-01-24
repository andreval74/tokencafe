// Utilitários de verificação via Explorer (BscScan/Etherscan)
// Padroniza coleta de API key, montagem de payload e fluxo de verificação

export function getApiBase() {
  try {
    // Prioriza configuração global do api-config.js (permite string vazia para caminhos relativos)
    if (typeof window.TOKENCAFE_API_BASE !== 'undefined') {
        return window.TOKENCAFE_API_BASE;
    }

    const fromWin = window.XCAFE_API_BASE; // Legado
    const fromLs = window.localStorage?.getItem("api_base");
    
    // Se definido (mesmo string vazia), retorna
    if (fromWin !== undefined && fromWin !== null) return fromWin;
    if (fromLs !== undefined && fromLs !== null) return fromLs;
    
    // Detecção automática de ambiente local/rede
    // User Update: SEMPRE usar Render
    return "https://xcafe-token-api-hybrid.onrender.com";
  } catch (_) {
    return "https://xcafe-token-api-hybrid.onrender.com";
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

const EXPLORER_APIS = {
    // V1 Endpoints (Deprecated but working for some)
    // We revert to V1 specific endpoints for networks where V2 enforces strict API Keys
    "97": "https://api-testnet.bscscan.com/api",      // BSC Testnet
    "56": "https://api.bscscan.com/api",              // BSC Mainnet
    "1": "https://api.etherscan.io/api",              // ETH Mainnet
    "11155111": "https://api-sepolia.etherscan.io/api",// Sepolia
    "137": "https://api.polygonscan.com/api",         // Polygon
    "80001": "https://api-testnet.polygonscan.com/api"// Mumbai
};

async function checkExplorerDirectly(chainId, address) {
    // HYBRID APPROACH: Use Legacy V1 for BSC/Polygon (less strict) and V2 for others
    // The previous V2-only approach failed because 'YourApiKeyToken' is rejected on some V2 chains
    let baseUrl = EXPLORER_APIS[String(chainId)];
    
    // If not in our legacy list, default to V2 Unified
    if (!baseUrl) {
        baseUrl = "https://api.etherscan.io/v2/api";
    }

    let url = `${baseUrl}?module=contract&action=getsourcecode&address=${address}`;

    // Add V2 params if needed
    if (baseUrl.includes("/v2/")) {
        url += `&chainid=${chainId}`;
        const key = getVerifyApiKey() || "YourApiKeyToken"; 
        url += `&apikey=${key}`;
    } else {
        // Legacy V1 often works without key or with "YourApiKeyToken"
        // We try without key first to avoid invalid key errors on some strict V1s
        const key = getVerifyApiKey();
        if (key) url += `&apikey=${key}`;
    }

    try {
        console.log(`[verify-utils] Tentando fallback Explorer (${baseUrl.includes("v2") ? "V2" : "V1"}): ${url.replace(/apikey=[^&]*/, "apikey=HIDDEN")}`);
        
        const resp = await fetch(url, { credentials: 'omit' });
        
        if (!resp.ok) {
            console.warn(`[verify-utils] Fallback fetch failed with status: ${resp.status}`);
            return null;
        }
        
        const data = await resp.json();
        
        // Handle V1 Deprecation Warning specifically
        if (data.status === "0" && data.result && typeof data.result === "string" && data.result.includes("deprecated")) {
             console.warn("[verify-utils] V1 Deprecated. Retrying with V2 Unified...");
             // Recursively try V2 if V1 fails explicitly due to deprecation
             return checkExplorerDirectlyV2Only(chainId, address);
        }

        if (data.status === "1" && data.result && data.result[0]) {
            const res = data.result[0];
            if (res.SourceCode && res.SourceCode.length > 0) {
                 console.log("[verify-utils] Fallback sucesso! Contrato verificado.");
                 return {
                     success: true,
                     verified: true,
                     verifiedAt: new Date().toISOString().split('T')[0],
                     compilerVersion: res.CompilerVersion,
                     explorer: {
                         optimizationUsed: res.OptimizationUsed,
                         runs: res.Runs,
                         compilerVersion: res.CompilerVersion,
                         licenseType: res.LicenseType,
                         evmVersion: res.EVMVersion,
                         proxy: res.Proxy
                     }
                 };
            } else {
                 return { success: true, verified: false };
            }
        }
    } catch (e) {
        console.warn("[verify-utils] Falha no fallback:", e);
    }
    return null;
}

// Helper for strict V2 retry
async function checkExplorerDirectlyV2Only(chainId, address) {
    const baseUrl = "https://api.etherscan.io/v2/api";
    // Usamos uma chave conhecida válida para V2 (BscScan Key funciona no Unified para BSC)
    // Fallback: Tenta pegar do storage ou usa a hardcoded que sabemos que funciona
    const key = getVerifyApiKey() || "I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5"; 
    
    // Tenta primeiro com a chave padrão/conhecida
    let url = `${baseUrl}?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${key}`;
    
    try {
        console.log(`[verify-utils] Tentando V2 (Retry) com chave: ${key}`);
        let resp = await fetch(url, { credentials: 'omit' });
        let data = await resp.json();
        
        // Se der erro de chave inválida, tenta UMA VEZ sem chave (alguns endpoints V2 aceitam low-rate limit sem chave)
        if (data.status === "0" && data.message === "NOTOK" && (data.result.includes("API Key") || data.result.includes("Missing/Invalid"))) {
             console.warn("[verify-utils] V2 rejeitou chave. Tentando sem chave...");
             url = `${baseUrl}?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}`; // Sem apikey
             resp = await fetch(url, { credentials: 'omit' });
             data = await resp.json();
        }

        if (data.status === "1" && data.result && data.result[0]) {
             const res = data.result[0];
             if (res.SourceCode && res.SourceCode.length > 0) {
                 console.log("[verify-utils] V2 Retry Sucesso!");
                 return {
                     success: true,
                     verified: true,
                     verifiedAt: new Date().toISOString().split('T')[0],
                     compilerVersion: res.CompilerVersion,
                     explorer: {
                         optimizationUsed: res.OptimizationUsed,
                         runs: res.Runs,
                         compilerVersion: res.CompilerVersion,
                         licenseType: res.LicenseType,
                         evmVersion: res.EVMVersion,
                         proxy: res.Proxy
                     }
                 };
             } else {
                 // Contrato existe mas não verificado
                 return { success: true, verified: false };
             }
        }
    } catch (e) {
        console.warn("[verify-utils] Erro fatal no V2 Retry:", e);
    }
    return null;
}

export async function getVerificationStatus(chainId, address, forceRefresh = false) {
    const API_BASE = getApiBase();
    const url = `${API_BASE}/api/explorer-getsourcecode?chainId=${chainId}&address=${address}`;
    
    // Check cache
    const cacheKey = `verif_status_v2_${chainId}_${address}`;
    if (forceRefresh) {
        sessionStorage.removeItem(cacheKey);
    } else {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (_) {}
        }
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
        // FALLBACK: Tentar verificar diretamente no Explorer (BscScan/Etherscan)
        // Isso resolve problemas de CORS ou indisponibilidade do backend Render
        try {
            const directResult = await checkExplorerDirectly(chainId, address);
            if (directResult) {
                // Cache se verificado com sucesso
                if (directResult.verified) {
                     sessionStorage.setItem(cacheKey, JSON.stringify(directResult));
                }
                return directResult;
            }
        } catch (_) {}
        
        try {
            // Log error by default to help debugging frontend integration issues
            // console.error("[verify-utils] getVerificationStatus error:", e, "URL:", url);
        } catch (_) {}
        // Return object with error property so caller handles it
        // Flag isNetworkError indicates the frontend could not reach the API
        return { success: false, error: true, isNetworkError: true, message: e.message || String(e) };
    }
}
