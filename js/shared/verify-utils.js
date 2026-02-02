// Utilitários de verificação via Explorer (BscScan/Etherscan)
// Padroniza coleta de API key, montagem de payload e fluxo de verificação

export function getApiBase() {
  try {
    // 1. Prioridade Absoluta: Configuração Global (api-config.js)
    if (typeof window.TOKENCAFE_API_BASE !== 'undefined') {
        return window.TOKENCAFE_API_BASE;
    }

    // 2. Fallback Seguro para Produção (se config falhar)
    return "https://tokencafe.onrender.com";
  } catch (_) {
    return "https://tokencafe.onrender.com";
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
    if (!payload.codeformat) payload.codeformat = "solidity-single-file"; 
    // Se for single file, o backend ajusta ou o caller ajusta
    return payload;
}

async function verifyWithExplorerV2(payload) {
    const chainId = payload.chainId;
    // Use default key if none provided (common public key)
    const apiKey = getVerifyApiKey() || "I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5"; 
    
    // Construct params
    const params = new URLSearchParams();
    params.append("apikey", apiKey);
    params.append("module", "contract");
    params.append("action", "verifysourcecode");
    params.append("contractaddress", payload.contractAddress);
    params.append("sourceCode", payload.sourceCode);
    params.append("codeformat", payload.codeformat || "solidity-single-file");
    params.append("contractname", payload.contractName);
    params.append("compilerversion", payload.compilerVersion);
    params.append("optimizationUsed", payload.optimizationUsed ? "1" : "0");
    params.append("runs", String(payload.runs || 200));
    if (payload.evmVersion) params.append("evmVersion", payload.evmVersion);
    if (payload.constructorArguments) {
        // Ensure single line for constructor arguments
        params.append("constructorArguments", payload.constructorArguments.replace(/^0x/, "").replace(/[\r\n]/g, ""));
    }
    params.append("licenseType", "3");

    const url = `https://api.etherscan.io/v2/api?chainid=${chainId}`;
    
    try {
        console.log(`[verify-utils] Tentando verificação client-side V2: ${url}`);
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString()
        });
        const js = await resp.json();
        return js;
    } catch (e) {
        return { status: "0", message: "Client-side V2 Error: " + String(e), result: "" };
    }
}

export async function runVerifyDirect(payload) {
    const API_BASE = getApiBase();
    const url = `${API_BASE}/api/verify-bscscan`; // Proxy endpoint
    
    let backendError = null;

    // 1. Tenta Backend Primeiro
    try {
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const result = await resp.json();
        
        // Se sucesso ou pendente (status 1), retorna
        if (result.success || result.status === "1") {
            return result;
        }
        // Captura erro do backend
        backendError = result.message || result.error || "Erro desconhecido no backend";
        console.warn("[verify-utils] Backend falhou:", backendError);
    } catch (e) {
        backendError = String(e);
        console.warn("[verify-utils] Conexão com backend falhou:", e);
    }

    // 2. Fallback Client-Side (Browser -> Etherscan V2)
    // Útil se o backend estiver desatualizado ou com problemas de rota
    console.log("[verify-utils] Tentando fallback client-side...");
    const v2Res = await verifyWithExplorerV2(payload);
    
    if (v2Res && v2Res.status === "1") {
        return { 
            success: true, 
            message: "pending", 
            guid: v2Res.result, 
            explorerUrl: "" 
        };
    } else {
        return {
            status: "0",
            success: false,
            message: `Backend: ${backendError} | Client-side: ${v2Res?.result || v2Res?.message || "Falhou"}`,
            result: v2Res?.result || ""
        };
    }
}

const EXPLORER_APIS = {
    // Mapeamento de APIs Explorer por Chain ID
    // NOTA: BSC (56/97) removidos daqui para forçar fallback para Etherscan V2 Unified
    // pois os endpoints V1 (api.bscscan.com) estão depreciados/instáveis.
    // UPDATE: BSC Testnet (97) está explicitamente falhando com V1.
    // UPDATE: Etherscan V2 Unified suporta BSC (Chain ID 56/97).
    "1": "https://api.etherscan.io/api",              // ETH Mainnet
    "11155111": "https://api-sepolia.etherscan.io/api",// Sepolia
    "137": "https://api.polygonscan.com/api",         // Polygon
    "80001": "https://api-testnet.polygonscan.com/api"// Mumbai
};

async function checkExplorerDirectly(chainId, address) {
    // Abordagem Híbrida: Usa endpoints específicos quando disponíveis, ou fallback para Etherscan V2 Unified
    let baseUrl = EXPLORER_APIS[String(chainId)];
    
    // Se não estiver na lista legado/específica, tenta o V2 Unified do Etherscan
    // Isso cobre BSC (56/97) e outras redes EVM compatíveis
    if (!baseUrl) {
        baseUrl = "https://api.etherscan.io/v2/api";
    }

    let url = `${baseUrl}?module=contract&action=getsourcecode&address=${address}`;

    // Adiciona parâmetros V2 apenas se estivermos usando o endpoint Unified do Etherscan
    if (baseUrl.includes("etherscan.io/v2/")) {
        url += `&chainid=${chainId}`;
        // Usa chave conhecida válida se disponível, caso contrário tenta sem ou com a padrão
        const key = getVerifyApiKey() || "I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5"; 
        url += `&apikey=${key}`;
    } else {
        // Endpoints específicos (BscScan, PolygonScan, etc)
        const key = getVerifyApiKey();
        // Se for BSC, podemos tentar usar a chave conhecida se o usuário não forneceu uma
        if (!key && (String(chainId) === "56" || String(chainId) === "97")) {
             // Chave de fallback para BSC
             url += `&apikey=I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5`;
        } else if (key) {
             url += `&apikey=${key}`;
        }
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
             console.warn("[verify-utils] API Deprecated warning received.");
             // Não tentamos retry automático V2 aqui para evitar loops complexos.
             // Com as URLs corretas configuradas no EXPLORER_APIS, isso deve ser raro.
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

// Função checkExplorerDirectlyV2Only removida para evitar redundância.
// A lógica de fallback agora é tratada inteiramente em checkExplorerDirectly via configuração correta de EXPLORER_APIS.

export async function getVerificationStatus(chainId, address, forceRefresh = false) {
    // Check cache first
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

    // Backend atual não possui endpoint para consultar status por endereço (apenas por GUID).
    // Portanto, usamos diretamente o fallback para APIs do Explorer.
    try {
        const directResult = await checkExplorerDirectly(chainId, address);
        if (directResult) {
            // Cache se verificado com sucesso
            if (directResult.verified) {
                 sessionStorage.setItem(cacheKey, JSON.stringify(directResult));
            }
            return directResult;
        }
        return { success: false, verified: false };
    } catch (e) {
        console.warn("[verify-utils] getVerificationStatus error:", e);
        return { success: false, error: true, message: e.message || String(e) };
    }
}
