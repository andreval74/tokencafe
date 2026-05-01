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

const FALLBACK_EXPLORER_API_KEY = "I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5";
const VERIFICATION_CACHE_TTL_MS = 15000;

async function checkPrivateVerification(chainId, address) {
    try {
        const API_BASE = String(getApiBase() || "").replace(/\/$/, "");
        const cid = Number(chainId);
        const addr = String(address || "").trim();
        if (!cid || !/^0x[0-9a-fA-F]{40}$/.test(addr)) return null;

        let payload = null;
        try {
            const raw = sessionStorage.getItem("lastDeployedContract");
            const st = raw ? JSON.parse(raw) : null;
            const sAddr = String(st?.deployed?.address || st?.deployed?.contractAddress || "").trim();
            const sCid = Number(st?.form?.network?.chainId || st?.wallet?.chainId || 0);
            if (st && sAddr && sCid && sAddr.toLowerCase() === addr.toLowerCase() && sCid === cid) {
                const dep = String(st?.compilation?.deployedBytecode || st?.compilation?.deployedbytecode || "").trim();
                const src = String(st?.compilation?.sourceCode || st?.compilation?.sourcecode || "").trim();
                const cn = String(st?.compilation?.contractName || st?.compilation?.contractname || "").trim();
                if (dep) payload = { chainId: cid, contractAddress: addr, deployedBytecode: dep };
                else if (src && cn) payload = { chainId: cid, contractAddress: addr, sourceCode: src, contractName: cn };
            }
        } catch (_) {}

        if (!payload) {
            try {
                const raw = localStorage.getItem("tokencafe_contract_verify_payload");
                const p = raw ? JSON.parse(raw) : null;
                const pAddr = String(p?.contractAddress || "").trim();
                const pCid = Number(p?.chainId || 0);
                const src = String(p?.sourceCode || "").trim();
                const cn = String(p?.contractName || "").trim();
                if (p && pAddr && pCid && pAddr.toLowerCase() === addr.toLowerCase() && pCid === cid) {
                    if (src && cn) payload = { chainId: cid, contractAddress: addr, sourceCode: src, contractName: cn };
                }
            } catch (_) {}
        }

        if (!payload) return null;
        const resp = await fetch(`${API_BASE}/api/verify-private`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            credentials: "omit"
        });
        if (!resp.ok) return null;
        const js = await resp.json().catch(() => null);
        const match = !!(js?.match ?? js?.success);
        return {
            success: true,
            verified: match,
            error: false,
            message: match ? "Verificação privada por bytecode: ok" : "Verificação privada por bytecode: pendente",
            private: { match }
        };
    } catch (_) {
        return null;
    }
}

async function checkExplorerViaBackend(chainId, address) {
    try {
        const API_BASE = String(getApiBase() || "").replace(/\/$/, "");
        const cid = Number(chainId);
        const addr = String(address || "").trim();
        if (!cid || !/^0x[0-9a-fA-F]{40}$/.test(addr)) return null;

        const url = `${API_BASE}/api/explorer-getsourcecode?chainId=${encodeURIComponent(String(cid))}&address=${encodeURIComponent(addr)}`;
        const resp = await fetch(url, { method: "GET", credentials: "omit" });
        if (!resp.ok) return null;
        const js = await resp.json().catch(() => null);
        if (!js || js.success !== true) return null;
        return js;
    } catch (_) {
        return null;
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
    const apiKey = getVerifyApiKey() || FALLBACK_EXPLORER_API_KEY;
    
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

    const fetchJson = async (u) => {
        try {
            const resp = await fetch(u, { credentials: 'omit' });
            if (!resp.ok) {
                console.warn(`[verify-utils] Fallback fetch failed with status: ${resp.status}`);
                return { ok: false, data: null, error: `HTTP ${resp.status}` };
            }
            const data = await resp.json();
            return { ok: true, data, error: null };
        } catch (e) {
            console.warn("[verify-utils] Falha no fallback:", e);
            return { ok: false, data: null, error: e?.message || String(e) };
        }
    };

    const normalizeAddr = (a) => String(a || "").trim();
    const addrNorm = normalizeAddr(address);

    // Adiciona parâmetros V2 apenas se estivermos usando o endpoint Unified do Etherscan
    if (baseUrl.includes("etherscan.io/v2/")) {
        const key = getVerifyApiKey() || "";
        if (!key) {
            return {
                success: true,
                verified: false,
                error: false,
                message: "Consulta no explorer requer API key (não configurada).",
            };
        }
        url += `&chainid=${chainId}`;
        if (key) url += `&apikey=${key}`;
    } else {
        // Endpoints específicos (BscScan, PolygonScan, etc)
        const key = getVerifyApiKey();
        if (!key && (String(chainId) === "56" || String(chainId) === "97")) {
            url += `&apikey=${FALLBACK_EXPLORER_API_KEY}`;
        } else if (key) {
            url += `&apikey=${key}`;
        } else {
            return { success: false, verified: false, error: true, message: "API key não configurada para consulta no explorer." };
        }
    }

    try {
        console.log(`[verify-utils] Tentando fallback Explorer (${baseUrl.includes("v2") ? "V2" : "V1"}): ${url.replace(/apikey=[^&]*/, "apikey=HIDDEN")}`);

        let { ok, data } = await fetchJson(url);
        if (!ok) return { success: false, verified: false, error: true, message: "Falha ao consultar o explorer." };

        if (data && data.status === "0" && typeof data.result === "string") {
            const msg = data.result;
            if (msg.toLowerCase().includes("invalid api key") || msg.toLowerCase().includes("missing") || msg.toLowerCase().includes("apikey")) {
                return { success: true, verified: false, error: false, message: msg };
            }
        }
        
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
                     contractName: res.ContractName,
                     sourceCode: res.SourceCode,
                     abi: res.ABI,
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

export async function getVerificationStatusByGuid(chainId, guid) {
    try {
        const cid = Number(chainId);
        const g = String(guid || "").trim();
        if (!cid || !g) return { success: false, verified: false, error: true, message: "Dados inválidos" };
        
        const API_BASE = getApiBase();
        const url = `${String(API_BASE || "").replace(/\/$/, "")}/api/verify-bscscan-status`;
        
        const resp = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chainId: cid, guid: g })
        });
        
        const js = await resp.json().catch(() => null);
        const isVerified = !!js?.success;
        const message = String(js?.message || js?.result || js?.error || "");
        const lower = message.toLowerCase();
        const isPending = !isVerified && (lower.includes("pending") || lower.includes("in queue") || lower.includes("queue") || lower.includes("processing") || lower.includes("wait"));
        const isFail = !isVerified && !isPending && !!message;
        return {
            success: true,
            verified: isVerified,
            pending: isPending,
            failed: isFail,
            guid: g,
            message
        };
    } catch (e) {
        return { success: false, verified: false, error: true, message: e?.message || String(e) };
    }
}

export async function getVerificationStatus(chainId, address, forceRefresh = false) {
    // Check cache first
    const addrKey = String(address || "").trim().toLowerCase();
    const cacheKey = `verif_status_v2_${chainId}_${addrKey}`;
    if (forceRefresh) {
        sessionStorage.removeItem(cacheKey);
    } else {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
            try {
                const obj = JSON.parse(cached);
                const ts = Number(obj?._ts || 0);
                if (!ts) return obj;
                if (Date.now() - ts < VERIFICATION_CACHE_TTL_MS) return obj;
            } catch (_) {}
        }
    }

    try {
        // 1) Se houver GUID salvo do envio de verificação, checar pelo endpoint de status (não exige API key no browser).
        try {
            const addrKey = String(address || "").toLowerCase();
            const cidKey = String(chainId || "");
            const guidKey = `tokencafe_verify_guid_${cidKey}_${addrKey}`;
            const guid = sessionStorage.getItem(guidKey) || localStorage.getItem(guidKey);
            if (guid) {
                const byGuid = await getVerificationStatusByGuid(chainId, guid);
                if (byGuid?.verified) {
                    const direct = await checkExplorerDirectly(chainId, address);
                    if (direct?.verified) {
                        sessionStorage.setItem(cacheKey, JSON.stringify(direct));
                        return direct;
                    }
                    sessionStorage.setItem(cacheKey, JSON.stringify(byGuid));
                    return byGuid;
                }
                if (byGuid?.pending) {
                    return { success: true, verified: false, error: true, message: byGuid.message || "pending", pending: true, guid: byGuid.guid };
                }
            }
        } catch (_) {}

        // 2) Verificação privada (sem explorer / sem API key) quando houver artefatos da sessão
        const priv = await checkPrivateVerification(chainId, address);
        if (priv) {
            const normalized = { ...priv, _ts: Date.now() };
            sessionStorage.setItem(cacheKey, JSON.stringify(normalized));
            if (normalized.verified) return normalized;
        }
        
        // 3) Preferir proxy no backend para consulta de verificação (evita exigência de API key no browser).
        const viaBackend = await checkExplorerViaBackend(chainId, address);
        if (viaBackend && typeof viaBackend.verified !== "undefined") {
            const normalized = {
                ...viaBackend,
                success: true,
                verified: !!viaBackend.verified,
                _ts: Date.now()
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(normalized));
            return normalized;
        }
        
        // 4) Fallback final: consulta direta no Explorer (pode exigir API key). Se falhar por API key, não marcar como "error" para não ficar girando infinito.
        const directResult = await checkExplorerDirectly(chainId, address);
        if (directResult) {
            const msg = String(directResult?.message || "");
            const lower = msg.toLowerCase();
            const apiKeyProblem = lower.includes("invalid api key") || lower.includes("missing") || lower.includes("apikey");
            const normalized = {
                ...directResult,
                success: true,
                verified: !!directResult.verified,
                error: apiKeyProblem ? false : !!directResult.error,
                _ts: Date.now()
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(normalized));
            return normalized;
        }
        const fallback = { success: true, verified: false, error: false, message: "Não foi possível consultar o explorer agora.", _ts: Date.now() };
        sessionStorage.setItem(cacheKey, JSON.stringify(fallback));
        return fallback;
    } catch (e) {
        console.warn("[verify-utils] getVerificationStatus error:", e);
        const fallback = { success: true, verified: false, error: false, message: e.message || String(e), _ts: Date.now() };
        try { sessionStorage.setItem(cacheKey, JSON.stringify(fallback)); } catch (_) {}
        return fallback;
    }
}
