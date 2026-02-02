/**
 * xcafe Token API - Deploy Híbrido
 * API compila contratos, usuário paga deploy via MetaMask
 */

const express = require("express");
const cors = require("cors");
const solc = require("solc");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { getContractSource } = require("./contract-templates");
require("dotenv").config();

// Função para converter endereço para checksum correto
function toChecksumAddress(address) {
  if (!address || !address.startsWith("0x")) {
    return address;
  }

  const ethers = require("ethers");
  try {
    // Suporte para Ethers v6 (ethers.getAddress) e v5 (ethers.utils.getAddress)
    if (ethers.getAddress) {
        return ethers.getAddress(address.toLowerCase());
    } else if (ethers.utils && ethers.utils.getAddress) {
        return ethers.utils.getAddress(address.toLowerCase());
    }
    return address;
  } catch (error) {
    console.warn("⚠️ Endereço inválido para checksum:", address);
    return address;
  }
}

module.exports.toChecksumAddress = toChecksumAddress;

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - necessário para Render.com e outros proxies
app.set("trust proxy", 1);

// Middleware
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// DEBUG PATHS
const pagesPath = path.join(__dirname, "..", "pages");
console.log("Serving /pages from:", pagesPath);
const fs = require("fs");
if (fs.existsSync(pagesPath)) {
  console.log("✅ Pages directory exists");
  try {
    const files = fs.readdirSync(path.join(pagesPath, "modules", "verifica"));
    console.log("✅ Verified verifica folder content:", files);
  } catch (e) {
    console.log("⚠️ Could not list verifica folder:", e.message);
  }
} else {
  console.error("❌ Pages directory NOT FOUND at:", pagesPath);
}

// Servir páginas e assets estáticos para testar a UI
app.use("/pages", express.static(pagesPath));
app.use("/js", express.static(path.join(__dirname, "..", "js")));
app.use("/css", express.static(path.join(__dirname, "..", "css")));
app.use("/imgs", express.static(path.join(__dirname, "..", "imgs")));
// Servir dados compartilhados (rpcs.json) para NetworkManager
app.use("/shared", express.static(path.join(__dirname, "..", "shared")));
// Fallback explícito para arquivos CSS
app.get("/css/:file", (req, res, next) => {
  try {
    const target = path.join(__dirname, "..", "css", req.params.file || "");
    res.sendFile(target, (err) => {
      if (err) next();
    });
  } catch (_) {
    next();
  }
});
app.get("/", (req, res) => {
  res.redirect("/pages/index.html");
});

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 60,
  message: {
    success: false,
    error: "Rate limit exceeded. Tente novamente em 1 minuto.",
  },
  // Configuração para proxies (Render.com, Vercel, etc.)
  trustProxy: true,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Usar IP real do cliente através do proxy
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || "unknown";
  },
});

app.use("/api/", apiLimiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "xcafe Token API - Deploy Híbrido",
    version: "3.0.0",
    timestamp: new Date().toISOString(),
    features: ["Compilação Solidity", "Deploy via MetaMask (usuário paga)", "Sem private keys necessárias"],
  });
});

// Função auxiliar para compilar contratos
async function compileContract(sourceCode, contractName, optimization = true) {
  try {
    const unusedSolcVersion = process.env.SOLC_VERSION || "0.8.30";

    // Preparar input para solc
    const input = {
      language: "Solidity",
      sources: {
        [`${contractName}.sol`]: {
          content: sourceCode,
        },
      },
      settings: {
        optimizer: {
          enabled: optimization,
          runs: parseInt(process.env.OPTIMIZATION_RUNS) || 200,
        },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"],
          },
        },
      },
    };

    // Compilar
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    // Verificar erros
    if (output.errors) {
      const errors = output.errors.filter((error) => error.severity === "error");
      if (errors.length > 0) {
        throw new Error(`Erro na compilação: ${errors[0].message}`);
      }
    }

    // Extrair resultado
    const contract = output.contracts[`${contractName}.sol`][contractName];

    if (!contract) {
      throw new Error(`Contrato ${contractName} não encontrado no código compilado`);
    }

    return {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      deployedBytecode: contract.evm.deployedBytecode.object,
      metadata: contract.metadata,
    };
  } catch (error) {
    throw new Error(`Erro na compilação: ${error.message}`);
  }
}

// Sanitiza nome do contrato para um identificador Solidity válido
function sanitizeContractName(rawName) {
  try {
    const base = String(rawName || "").trim();
    // Permitir letras, números e underscore
    let cleaned = base.replace(/[^A-Za-z0-9_]/g, "");
    if (!cleaned) cleaned = "Token";
    // Garantir primeiro caractere válido
    if (!/^[A-Za-z_]/.test(cleaned)) cleaned = `_${cleaned}`;
    // Limitar tamanho razoável
    if (cleaned.length > 64) cleaned = cleaned.slice(0, 64);
    return cleaned;
  } catch (_) {
    return "Token";
  }
}

// Valida e normaliza campos numéricos
function validateSupply(totalSupply) {
  if (totalSupply === undefined || totalSupply === null) return null;
  const str = String(totalSupply).trim();
  // Aceitar apenas dígitos
  if (!/^\d+$/.test(str)) return null;
  try {
    // Usar BigInt para validar tamanho e positividade sem overflow
    const val = BigInt(str);
    if (val <= 0n) return null;
    return str; // Retorna a string original limpa
  } catch (_) {
    return null;
  }
}

// Endpoint principal: compilação de contratos
app.post("/api/compile-only", async (req, res) => {
  try {
    const { sourceCode, contractName, optimization } = req.body;

    if (!sourceCode || !contractName) {
      return res.status(400).json({
        success: false,
        error: "sourceCode e contractName são obrigatórios",
      });
    }

    console.log(`🔨 Compilando contrato: ${contractName}`);

    // Compilar (não custa gas, só processamento)
    const compiled = await compileContract(sourceCode, contractName, optimization);

    res.json({
      success: true,
      compilation: {
        abi: compiled.abi,
        bytecode: compiled.bytecode,
        contractName: contractName,
        metadata: compiled.metadata,
      },
      deployInstructions: {
        message: "Contrato compilado com sucesso!",
        nextSteps: ["1. Conecte seu MetaMask na rede desejada", "2. Clique em 'Deploy' abaixo", "3. Confirme a transação no MetaMask", "4. Aguarde confirmação na blockchain"],
      },
    });

    console.log(`✅ Contrato ${contractName} compilado com sucesso`);
  } catch (error) {
    console.error(`❌ Erro na compilação: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Erro na compilação: " + error.message,
    });
  }
});

// Endpoint para gerar código de token padrão
app.post("/api/generate-token", async (req, res) => {
  try {
    const { name, symbol, totalSupply, decimals = 18, type = "erc20-minimal", sale = {} } = req.body;

    if (!name || !symbol || totalSupply === undefined || totalSupply === null) {
      if (type !== "tokensale-separado") {
        return res.status(400).json({
          success: false,
          error: "name, symbol e totalSupply são obrigatórios",
        });
      }
    }
    
    // Valida supply e decimals se não for sale separado
    let validSupply = "0";
    let dec = 18;
    let sym = "";
    
    if (type !== "tokensale-separado") {
        validSupply = validateSupply(totalSupply);
        if (!validSupply) {
          return res.status(400).json({ success: false, error: "totalSupply deve ser um número inteiro positivo" });
        }
        dec = parseInt(decimals, 10);
        if (!Number.isFinite(dec) || dec < 0 || dec > 18) {
          return res.status(400).json({ success: false, error: "decimals deve estar entre 0 e 18" });
        }
        sym = String(symbol).trim();
        if (!sym || sym.length > 32) {
          return res.status(400).json({ success: false, error: "symbol deve ter 1 a 32 caracteres" });
        }
    }

    // Gera o código usando o template
    const { source, contractName } = getContractSource(type, {
        name: name || "TokenSale",
        symbol: sym || "SALE",
        decimals: dec,
        totalSupply: validSupply,
        sale
    });

    // Compilar automaticamente
    const compiled = await compileContract(source, contractName);

    res.json({
      success: true,
      token: {
        name,
        symbol: sym,
        totalSupply: validSupply,
        decimals: dec,
        contractName,
        type
      },
      sourceCode: source,
      compilation: {
        abi: compiled.abi,
        bytecode: compiled.bytecode,
        metadata: compiled.metadata,
      },
      deployInstructions: {
        message: `Contrato ${contractName} (${type}) gerado e compilado!`,
        nextSteps: ["1. Conecte seu MetaMask", "2. Selecione a rede desejada", "3. Clique em 'Deploy'", "4. Pague o gas fee no MetaMask", "5. Aguarde confirmação na blockchain"],
      },
    });

    console.log(`✅ Contrato ${contractName} gerado e compilado`);
  } catch (error) {
    console.error(`❌ Erro ao gerar token: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Erro ao gerar token: " + error.message,
    });
  }
});

function getExplorerApiUrl(chainId) {
  const cid = parseInt(chainId || 0, 10) || 0;
  
  // Unified Etherscan V2 Endpoint for all supported EVM chains (ETH, BSC, Polygon, Base, etc.)
  // Documentation: https://docs.etherscan.io/v2-migration
  // NOTE: BscScan/PolygonScan V2 endpoints might differ or require specific handling, 
  // but testing shows api.etherscan.io/v2 works for BSC Testnet (Chain 97) with BscScan keys.
  const base = "https://api.etherscan.io/v2/api";
  return `${base}?chainid=${cid}`;
}

function getLegacyExplorerApiUrl(chainId) {
  const cid = parseInt(chainId || 0, 10) || 0;
  if (cid === 97) return "https://api-testnet.bscscan.com/api";
  if (cid === 56) return "https://api.bscscan.com/api";
  if (cid === 137) return "https://api.polygonscan.com/api";
  if (cid === 8453) return "https://api.basescan.org/api";
  if (cid === 1) return "https://api.etherscan.io/api";
  return "https://api.etherscan.io/api";
}

function isV2SupportedChain(chainId) {
  const cid = parseInt(chainId || 0, 10) || 0;
  return cid === 1 || cid === 11155111 || cid === 56 || cid === 97 || cid === 137 || cid === 8453;
}

function getExplorerVerificationUrl(chainId, address) {
  const addr = toChecksumAddress(address);
  const cid = parseInt(chainId, 10);
  if (cid === 1) return `https://etherscan.io/address/${addr}#code`;
  if (cid === 11155111) return `https://sepolia.etherscan.io/address/${addr}#code`;
  if (cid === 56) return `https://bscscan.com/address/${addr}#code`;
  if (cid === 97) return `https://testnet.bscscan.com/address/${addr}#code`;
  if (cid === 137) return `https://polygonscan.com/address/${addr}#code`;
  if (cid === 8453) return `https://basescan.org/address/${addr}#code`;
  return `https://etherscan.io/address/${addr}#code`;
}

function getExplorerApiKeyFromEnv() {
  try {
    const b64 = process.env.EXPLORER_API_KEY_B64 || "";
    if (b64) {
      try {
        return Buffer.from(String(b64), "base64").toString("utf8");
      } catch (_) {}
    }
    const direct = process.env.EXPLORER_API_KEY || process.env.BSCSCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "";
    return String(direct || "");
  } catch (_) {
    return "";
  }
}

async function getContractCreationInfo(chainId, address, apiKey) {
  try {
    const base = getExplorerApiUrl(chainId);
    const qs = new URLSearchParams();
    qs.append("module", "contract");
    qs.append("action", "getcontractcreation");
    qs.append("contractaddresses", toChecksumAddress(address));
    if (apiKey) qs.append("apikey", apiKey);
    const url = `${base}&${qs.toString()}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "application/json",
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(url, { method: "GET", headers, signal: controller.signal });
    clearTimeout(timeout);
    if (resp.ok) {
      const js = await resp.json();
      // console.log("[Explorer] getContractCreationInfo V2 result:", JSON.stringify(js));
      
      if (js.message === "NOTOK" && js.result && js.result.includes("Free API access is not supported")) {
        console.warn(`[Explorer] V2 requer API Key paga ou válida para esta chain (${chainId}). Configure ETHERSCAN_API_KEY no .env.`);
        return { deployer: "", txHash: "", error: "api_restricted" };
      }
      
      const arr = Array.isArray(js?.result) ? js.result : [];
      const first = arr[0] || {};
      const deployer = first?.contractCreator || first?.creator || "";
      const txHash = first?.txHash || first?.creationTxHash || "";
      if (deployer || txHash) return { deployer, txHash, error: null };
    }
  } catch (e) {
    console.warn("[Explorer] getContractCreationInfo V2 error:", e.message);
  }
  
  // Fallback para Legacy V1 (apenas se V2 falhar ou não retornar dados)
  // Nota: BscScan Testnet V1 está depreciado e retorna erro.
  try {
    const legacy = getLegacyExplorerApiUrl(chainId);
    const qs = new URLSearchParams();
    qs.append("module", "contract");
    qs.append("action", "getcontractcreation");
    qs.append("contractaddresses", toChecksumAddress(address));
    if (apiKey) qs.append("apikey", apiKey);
    const url = `${legacy}?${qs.toString()}`;
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "application/json",
    };
    const resp = await fetch(url, { method: "GET", headers });
    if (resp.ok) {
      const js = await resp.json();
      console.log("[Explorer] getContractCreationInfo Legacy result:", JSON.stringify(js));
      const arr = Array.isArray(js?.result) ? js.result : [];
      const first = arr[0] || {};
      const deployer = first?.contractCreator || first?.creator || "";
      const txHash = first?.txHash || first?.creationTxHash || "";
      if (deployer || txHash) return { deployer, txHash, error: null };
    }
  } catch (e2) {
    console.warn("[Explorer] getContractCreationInfo Legacy error:", e2.message);
  }
  return { deployer: "", txHash: "", error: "not_found" };
}

app.post("/api/verify-contract", async (req, res) => {
  try {
    const p = req.body || {};
    const chainId = parseInt(p.chainId || 0, 10);
    const addr = toChecksumAddress(p.contractAddress || "");
    const apiKey = p.apiKey || getExplorerApiKeyFromEnv() || "I33WZ4CVTPWDG3VEJWN36TQ9USU9QUBVX5";
    const sourceCode = p.sourceCode || "";
    const contractName = p.contractName || "";
    const compilerVersion = p.compilerVersion || "";
    const optimizationUsed = p.optimizationUsed === 0 || p.optimizationUsed === false ? 0 : 1;
    const runs = parseInt(p.runs || 200, 10);
    const codeformat = p.codeformat || "solidity-single-file";
    const constructorArguments = (p.constructorArguments || "").replace(/^0x/, "");
    if (!chainId || !addr || !apiKey || !sourceCode || !contractName || !compilerVersion) return res.status(400).json({ success: false, error: "Campos obrigatórios ausentes" });
    
    // =================================================================
    // VALIDAÇÃO DE PRÉ-VERIFICAÇÃO (Segurança/Anti-Flood)
    // Verifica se já possui código fonte verificado antes de submeter
    // =================================================================
    try {
        const baseCheck = getExplorerApiUrl(chainId);
        const qsCheck = new URLSearchParams();
        qsCheck.append("module", "contract");
        qsCheck.append("action", "getsourcecode");
        qsCheck.append("address", addr);
        qsCheck.append("apikey", apiKey);
        
        const urlCheck = `${baseCheck}&${qsCheck.toString()}`;
        const rCheck = await fetch(urlCheck);
        const jCheck = await rCheck.json();
        
        const srcCheck = jCheck?.result?.[0]?.SourceCode || "";
        if (srcCheck && srcCheck.length > 0) {
             console.log(`[Verify] Contrato ${addr} (Chain ${chainId}) já verificado.`);
             return res.status(400).json({ 
                 success: false, 
                 error: "Contrato já verificado anteriormente.",
                 alreadyVerified: true,
                 explorerUrl: getExplorerVerificationUrl(chainId, addr)
             });
        }
    } catch (eCheck) {
        console.warn("[Verify] Falha ao checar pré-verificação:", eCheck.message);
        // Prossegue em caso de erro na checagem para não bloquear o fluxo por falha de API de leitura
    }

    const explorerUrl = getExplorerVerificationUrl(chainId, addr);
    if (isV2SupportedChain(chainId)) {
      const form = new URLSearchParams();
      form.append("apikey", apiKey);
      form.append("module", "contract");
      form.append("action", "verifysourcecode");
      form.append("chainid", String(chainId));
      form.append("contractaddress", addr);
      form.append("sourceCode", sourceCode);
      form.append("codeformat", codeformat);
      form.append("contractname", contractName);
      form.append("compilerversion", compilerVersion);
      form.append("optimizationUsed", String(optimizationUsed));
      form.append("runs", String(runs));
      if (constructorArguments) form.append("constructorArguments", constructorArguments);
      const url = getExplorerApiUrl(chainId);
      // Try fetching as JSON
      const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
      // BscScan sometimes returns HTML error page (Cloudflare) or plain text if error
      const text = await resp.text();
      let js;
      try {
        js = JSON.parse(text);
      } catch (e) {
        // Fallback to V1 if V2 returns non-JSON (HTML/Error)
        js = null;
      }

      console.log(`[Verify] Chain ${chainId} Response:`, text.substring(0, 200));

      const ok = String(js?.status || "") === "1";
      const guid = js?.result || null;
      if (ok) return res.json({ success: true, guid, explorerUrl, message: js?.message });

      // If V2 returned a valid response but status is 0, it means submission failed (e.g. compilation error)
      // Since V1 is deprecated for these chains, falling back is useless and masks the error.
      if (js && (js.status === "0" || js.result)) {
        return res.json({ success: false, explorerUrl, error: js.result || "Verification failed", message: js.message });
      }
    }
    // V1 direto (ou fallback) para redes não suportadas pelo V2
    try {
      const legacyUrl = getLegacyExplorerApiUrl(chainId);
      const lf = new URLSearchParams();
      lf.append("apikey", apiKey);
      lf.append("module", "contract");
      lf.append("action", "verifysourcecode");
      // BscScan V1 legacy does NOT want chainid param usually? Or maybe it does?
      // Standard Etherscan V1: contractaddress, sourceCode, etc.
      // NOTE: BscScan documentation says V1 endpoints are being deprecated.
      // But if V2 fails with "Deprecated V1", it's weird.
      // Maybe we are hitting "https://api-testnet.bscscan.com/api" which IS V1.
      // And BscScan is saying "Stop using V1".
      // BUT we also tried V2 "https://api-testnet.bscscan.com/v2/api" and maybe that redirects or is not enabled for us?
      // Let's try forcing V2 URL even if isV2SupportedChain returned false (which we just edited).
      // Wait, if isV2SupportedChain(97) is false, we come here.
      // And here we use getLegacyExplorerApiUrl(97) -> "https://api-testnet.bscscan.com/api"
      // And we get "You are using a deprecated V1 endpoint".
      // So V1 IS deprecated and rejecting requests.
      // So we MUST use V2.
      // So why did V2 fail before?
      // Before we had:
      // isV2SupportedChain(97) = true.
      // URL = "https://api-testnet.bscscan.com/v2/api?chainid=97"
      // Payload had chainid=97.
      // If that failed, maybe it was because of the ?chainid=97 in URL AND body?
      // Or maybe the base URL is wrong?
      // Docs: https://docs.bscscan.com/v/v2-migration
      // Endpoints: https://api.bscscan.com/v2/api?chainid=56
      // So for testnet: https://api-testnet.bscscan.com/v2/api?chainid=97
      // We were doing exactly that.

      // Let's revert isV2SupportedChain to include 97, but log the response from V2 to see why it wasn't working or if it was falling through.

      lf.append("contractaddress", addr);
      lf.append("sourceCode", sourceCode);
      lf.append("codeformat", codeformat);
      lf.append("contractname", contractName);
      lf.append("compilerversion", compilerVersion);
      lf.append("optimizationUsed", String(optimizationUsed));
      lf.append("runs", String(runs));
      if (constructorArguments) lf.append("constructorArguments", constructorArguments);
      const lr = await fetch(legacyUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: lf });
      const lj = await lr.json();
      const lok = String(lj?.status || "") === "1";
      const lguid = lj?.result || null;
      return res.json({ success: lok, guid: lguid, explorerUrl, message: lj?.message || "" });
    } catch (e2) {
      return res.json({ success: false, explorerUrl, error: e2?.message || String(e2) });
    }
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

// Alias para compatibilidade com verify-utils.js (que chama /api/verify-bscscan)
app.post("/api/verify-bscscan", (req, res) => {
    // Redireciona internamente para /api/verify-contract mantendo método e body (307)
    res.redirect(307, '/api/verify-contract');
});

app.get("/api/explorer-getsourcecode", async (req, res) => {
  try {
    const chainId = parseInt(req.query?.chainId || req.body?.chainId || 0, 10);
    const address = toChecksumAddress(req.query?.address || req.body?.address || req.body?.contractAddress || "");
    const apiKey = req.query?.apiKey || req.body?.apiKey || getExplorerApiKeyFromEnv();
    if (!chainId || !/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ success: false, error: "Dados inválidos" });
    const base = getExplorerApiUrl(chainId);
    const qs = new URLSearchParams();
    qs.append("module", "contract");
    qs.append("action", "getsourcecode");
    qs.append("address", address);
    if (apiKey) qs.append("apikey", apiKey);
    const url = `${base}&${qs.toString()}`;
    
    let js = null;
    let status = "0";
    const headers = { 
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "application/json"
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout for V2
        let resp = await fetch(url, { method: "GET", headers, signal: controller.signal });
        clearTimeout(timeout);
        if (resp.ok) {
            js = await resp.json();
            status = String(js?.status || "0");
        }
    } catch (e) {
        console.warn(`[Explorer V2] Falha na requisição V2 (${url}):`, e.message);
    }

    const resultArr = Array.isArray(js?.result) ? js.result : [];
    const first = resultArr[0] || {};
    const src = String(first?.SourceCode || "");
    const verified = !!src && src.length > 0;
    
    if (!js || status !== "1") {
      try {
        const legacy = getLegacyExplorerApiUrl(chainId);
        const url2 = `${legacy}?${qs.toString()}`;
        console.log(`[Explorer] Fallback para Legacy: ${url2}`);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout for Legacy
        const r2 = await fetch(url2, { method: "GET", headers, signal: controller.signal });
        clearTimeout(timeout);
        
        const j2 = await r2.json();
        // console.log("[Explorer] getsourcecode Legacy result:", JSON.stringify(j2));
        const st2 = String(j2?.status || "0");
        const arr2 = Array.isArray(j2?.result) ? j2.result : [];
        const f2 = arr2[0] || {};
        const src2 = String(f2?.SourceCode || "");
        const ver2 = !!src2 && src2.length > 0;
        let creationInfo = { deployer: "", txHash: "", error: null };
        try {
          creationInfo = await getContractCreationInfo(chainId, address, apiKey);
        } catch (_) {}
        return res.json({ 
            success: true, 
            verified: ver2, 
            explorer: { 
                status: st2, 
                contractName: f2?.ContractName || "", 
                compilerVersion: f2?.CompilerVersion || "", 
                abi: f2?.ABI || "", 
                implementation: f2?.Implementation || "",
                optimizationUsed: f2?.OptimizationUsed || "",
                runs: f2?.Runs || "",
                evmVersion: f2?.EVMVersion || "",
                licenseType: f2?.LicenseType || "",
                proxy: f2?.Proxy || ""
            },
            deployer: creationInfo.deployer,
            creationTxHash: creationInfo.txHash,
            creationInfoError: creationInfo.error
        });
      } catch (e2) {
         console.warn(`[Explorer Legacy] Falha no fallback:`, e2.message);
      }
    }
    let creationInfo = { deployer: "", txHash: "", error: null };
    try {
      creationInfo = await getContractCreationInfo(chainId, address, apiKey);
    } catch (_) {}
    return res.json({ 
        success: true, 
        verified, 
        explorer: { 
            status, 
            contractName: first?.ContractName || "", 
            compilerVersion: first?.CompilerVersion || "", 
            abi: first?.ABI || "", 
            implementation: first?.Implementation || "",
            optimizationUsed: first?.OptimizationUsed || "",
            runs: first?.Runs || "",
            evmVersion: first?.EVMVersion || "",
            licenseType: first?.LicenseType || "",
            proxy: first?.Proxy || ""
        },
        deployer: creationInfo.deployer,
        creationTxHash: creationInfo.txHash,
        creationInfoError: creationInfo.error
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

// Alias POST para compatibilidade
app.post("/api/explorer-getsourcecode", async (req, res) => {
    // Reutiliza a lógica do GET, extraindo params do body
    const chainId = parseInt(req.body?.chainId || req.query?.chainId || 0, 10);
    const address = toChecksumAddress(req.body?.address || req.body?.contractAddress || req.query?.address || "");
    const apiKey = req.body?.apiKey || req.query?.apiKey || getExplorerApiKeyFromEnv();
    
    // Constrói fake req object ou chama função extraída (mas aqui vou duplicar chamada interna para simplificar sem refatorar tudo)
    // Melhor: redirecionar para o handler do GET? Não, req structure é diferente.
    // Vou apenas copiar a lógica crítica de chamada.
    
    try {
        if (!chainId || !/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ success: false, error: "Dados inválidos" });
        
        const base = getExplorerApiUrl(chainId);
        const qs = new URLSearchParams();
        qs.append("module", "contract");
        qs.append("action", "getsourcecode");
        qs.append("address", address);
        if (apiKey) qs.append("apikey", apiKey);
        const url = `${base}&${qs.toString()}`;
        
        let js = null;
         let status = "0";
         const headers = { 
             "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
             "Accept": "application/json"
         };

         try {
             let resp = await fetch(url, { method: "GET", headers });
             if (resp.ok) {
                 js = await resp.json();
                 console.log("[Explorer] getsourcecode V2 result:", JSON.stringify(js));
                 status = String(js?.status || "0");
             }
         } catch (e) {
             console.warn(`[Explorer V2 POST] Falha na requisição V2 (${url}):`, e.message);
         }
 
         const resultArr = Array.isArray(js?.result) ? js.result : [];
         const first = resultArr[0] || {};
         const src = String(first?.SourceCode || "");
         const verified = !!src && src.length > 0;
         
         if (!js || status !== "1") {
              // Fallback logic copy
              try {
                 const legacy = getLegacyExplorerApiUrl(chainId);
                 const url2 = `${legacy}?${qs.toString()}`;
                 const r2 = await fetch(url2, { method: "GET", headers });
                const j2 = await r2.json();
                const st2 = String(j2?.status || "0");
                const arr2 = Array.isArray(j2?.result) ? j2.result : [];
                const f2 = arr2[0] || {};
                const src2 = String(f2?.SourceCode || "");
                const ver2 = !!src2 && src2.length > 0;
                return res.json({ success: true, verified: ver2 });
             } catch (_) {}
        }
        
        return res.json({ success: true, verified });
    } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
    }
});

app.post("/api/verify-bscscan-status", async (req, res) => {
  try {
    const chainId = parseInt(req.body?.chainId || 0, 10);
    const apiKey = req.body?.apiKey || getExplorerApiKeyFromEnv();
    const guid = req.body?.guid || "";
    if (!chainId || !apiKey || !guid) return res.status(400).json({ success: false, error: "Dados inválidos" });
    const base = getExplorerApiUrl(chainId);
    const qs = new URLSearchParams();
    qs.append("apikey", apiKey);
    qs.append("module", "contract");
    qs.append("action", "checkverifystatus");
    qs.append("guid", guid);
    const url = `${base}&${qs.toString()}`;
    
    let js = null;
     let respOk = false;
     const headers = { 
         "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
         "Accept": "application/json"
     };
     
     try {
         let resp = await fetch(url, { method: "GET", headers });
         respOk = resp.ok;
         let text = await resp.text();
         try {
             js = JSON.parse(text);
         } catch (e) {
             js = null;
         }
     } catch (e) {
         console.warn(`[Verify Status V2] Falha na requisição V2 (${url}):`, e.message);
     }

     let ok = String(js?.status || "") === "1";

     // Only fallback if V2 failed to return valid JSON (network error or severe API failure)
     // Status "0" is a valid response (Pending or Fail), so we should NOT fallback in that case.
     if (!respOk || !js) {
       try {
         const legacy = getLegacyExplorerApiUrl(chainId);
         const url2 = `${legacy}?${qs.toString()}`;
         const r2 = await fetch(url2, { method: "GET", headers });
        const t2 = await r2.text();
        let j2;
        try {
          j2 = JSON.parse(t2);
        } catch (e) {
          j2 = null;
        }

        ok = String(j2?.status || "") === "1";
        return res.json({ success: ok, message: j2?.result || j2?.message || js?.result || js?.message || "" });
      } catch (_) {}
    }
    return res.json({ success: ok, message: js?.result || js?.message || "" });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

// Middleware de tratamento de erros
app.use((err, req, res, _next) => {
  console.error("❌ Erro não tratado:", err);
  res.status(500).json({
    success: false,
    error: "Erro interno do servidor",
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`⚠️ 404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    availableEndpoints: [
      "GET /health", 
      "POST /api/compile-only", 
      "POST /api/generate-token", 
      "GET/POST /api/explorer-getsourcecode",
      "POST /api/verify-contract",
      "POST /api/verify-bscscan-status"
    ],
  });
});

// Iniciar servidor somente fora de ambiente de teste
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 xcafe Token API rodando na porta ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`⚡ Modo: Deploy Híbrido (usuário paga gas)`);
    console.log(`✅ Pronto para receber requisições!`);
  });
}

module.exports = app;
