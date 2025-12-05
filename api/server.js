/**
 * xcafe Token API - Deploy Híbrido
 * API compila contratos, usuário paga deploy via MetaMask
 */

const express = require("express");
const cors = require("cors");
const solc = require("solc");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

// Função para converter endereço para checksum correto
function toChecksumAddress(address) {
  if (!address || !address.startsWith("0x")) {
    return address;
  }

  const ethers = require("ethers");
  try {
    return ethers.utils.getAddress(address.toLowerCase());
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
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Servir páginas e assets estáticos para testar a UI
app.use("/pages", express.static(path.join(__dirname, "..", "pages")));
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

// Logging middleware (opcional para debug)
if (process.env.NODE_ENV !== "production" || process.env.DEBUG === "true") {
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.path} - IP: ${req.ip}`);
    next();
  });
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minuto
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 10,
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
function normalizeSupply(totalSupply) {
  if (typeof totalSupply === "string") {
    // Aceitar apenas dígitos
    if (!/^\d+$/.test(totalSupply.trim())) return NaN;
    return parseInt(totalSupply.trim(), 10);
  }
  if (typeof totalSupply === "number") return totalSupply;
  return NaN;
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
    const { name, symbol, totalSupply, decimals = 18 } = req.body;

    if (!name || !symbol || totalSupply === undefined || totalSupply === null) {
      return res.status(400).json({
        success: false,
        error: "name, symbol e totalSupply são obrigatórios",
      });
    }
    // Valida supply
    const normalizedSupply = normalizeSupply(totalSupply);
    if (!Number.isFinite(normalizedSupply) || normalizedSupply <= 0) {
      return res.status(400).json({
        success: false,
        error: "totalSupply deve ser um número inteiro positivo",
      });
    }
    // Valida decimals
    const dec = parseInt(decimals, 10);
    if (!Number.isFinite(dec) || dec < 0 || dec > 18) {
      return res.status(400).json({
        success: false,
        error: "decimals deve estar entre 0 e 18",
      });
    }
    // Valida símbolo simples (opcional)
    const sym = String(symbol).trim();
    if (!sym || sym.length > 32) {
      return res.status(400).json({
        success: false,
        error: "symbol deve ter 1 a 32 caracteres",
      });
    }

    const contractName = sanitizeContractName(name);

    const sourceCode = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract ${contractName} {
    string public name = "${name}";
    string public symbol = "${symbol}";
    uint8 public decimals = ${decimals};
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor() {
        totalSupply = ${normalizedSupply} * 10**decimals;
        balanceOf[msg.sender] = totalSupply;
        emit Transfer(address(0), msg.sender, totalSupply);
    }
    
    function transfer(address to, uint256 value) public returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) public returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) public returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
}`.trim();

    // Compilar automaticamente
    const compiled = await compileContract(sourceCode, contractName);

    res.json({
      success: true,
      token: {
        name,
        symbol: sym,
        totalSupply: normalizedSupply,
        decimals: dec,
        contractName,
      },
      sourceCode,
      compilation: {
        abi: compiled.abi,
        bytecode: compiled.bytecode,
        metadata: compiled.metadata,
      },
      deployInstructions: {
        message: `Token ${name} (${symbol}) gerado e compilado!`,
        nextSteps: ["1. Conecte seu MetaMask", "2. Selecione a rede desejada", "3. Clique em 'Deploy Token'", "4. Pague o gas fee no MetaMask", "5. Aguarde confirmação na blockchain"],
      },
    });

    console.log(`✅ Token ${name} gerado e compilado`);
  } catch (error) {
    console.error(`❌ Erro ao gerar token: ${error.message}`);
    res.status(500).json({
      success: false,
      error: "Erro ao gerar token: " + error.message,
    });
  }
});

function getExplorerApiUrl(chainId) {
  const cid = parseInt(chainId, 10);
  if (cid === 1) return "https://api.etherscan.io/api";
  if (cid === 11155111) return "https://api-sepolia.etherscan.io/api";
  if (cid === 56) return "https://api.bscscan.com/api";
  if (cid === 97) return "https://api-testnet.bscscan.com/api";
  if (cid === 137) return "https://api.polygonscan.com/api";
  if (cid === 8453) return "https://api.basescan.org/api";
  return "https://api.etherscan.io/api";
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

app.post("/api/verify-auto", async (req, res) => {
  try {
    const chainId = parseInt(req.body?.chainId || 0, 10);
    const address = String(req.body?.contractAddress || "").toLowerCase();
    if (!chainId || !/^0x[0-9a-fA-F]{40}$/.test(address)) return res.status(400).json({ success: false, error: "Dados inválidos" });
    const c = await fetch(`https://sourcify.dev/server/contract/${chainId}/${address}`);
    if (!c.ok) return res.json({ success: false, status: "unverified" });
    const cj = await c.json();
    const st = String(cj?.status || "").toLowerCase();
    const ok = st === "perfect" || st === "full";
    const link = `https://sourcify.dev/server/files/${chainId}/${address}`;
    return res.json({ success: ok, verified: ok, status: st, link, lookupUrl: ok ? link : undefined });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

app.post("/api/verify-sourcify-upload", async (req, res) => {
  try {
    const p = req.body || {};
    const chainId = parseInt(p.chainId || 0, 10);
    const address = String(p.contractAddress || "").toLowerCase();
    const metadata = p.metadata || "";
    const sourceCode = p.sourceCode || "";
    if (!chainId || !/^0x[0-9a-fA-F]{40}$/.test(address) || (!metadata && !sourceCode)) return res.status(400).json({ success: false, error: "Dados inválidos" });
    const form = new FormData();
    form.append("chain", String(chainId));
    form.append("address", address);
    if (metadata) form.append("files", new Blob([metadata], { type: "application/json" }), "metadata.json");
    if (sourceCode) {
      let fn = "contract.sol";
      const fqn = p.contractNameFQN || "";
      const cName = p.contractName || "";
      if (fqn && fqn.includes(":")) {
        const pathPart = fqn.split(":")[0];
        fn = pathPart.endsWith(".sol") ? pathPart : `${pathPart}.sol`;
      } else if (cName) {
        fn = `${cName}.sol`;
      }
      form.append("files", new Blob([sourceCode], { type: "text/plain" }), fn);
    }
    const resp = await fetch("https://sourcify.dev/server/verify", { method: "POST", body: form });
    const ok = resp.ok;
    const link = `https://sourcify.dev/server/files/${chainId}/${address}`;
    if (!ok) {
      const txt = await resp.text();
      return res.status(502).json({ success: false, error: txt });
    }
    return res.json({ success: true, link });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

app.post("/api/verify-sourcify", async (req, res) => {
  try {
    const p = req.body || {};
    const chainId = parseInt(p.chainId || 0, 10);
    const address = String(p.contractAddress || "").toLowerCase();
    const metadata = p.metadata || "";
    const sourceCode = p.sourceCode || "";
    if (!chainId || !/^0x[0-9a-fA-F]{40}$/.test(address) || (!metadata && !sourceCode)) return res.status(400).json({ success: false, error: "Dados inválidos" });
    const form = new FormData();
    form.append("chain", String(chainId));
    form.append("address", address);
    if (metadata) form.append("files", new Blob([metadata], { type: "application/json" }), "metadata.json");
    if (sourceCode) {
      let fn = "contract.sol";
      const fqn = p.contractNameFQN || "";
      const cName = p.contractName || "";
      if (fqn && fqn.includes(":")) {
        const pathPart = fqn.split(":")[0];
        fn = pathPart.endsWith(".sol") ? pathPart : `${pathPart}.sol`;
      } else if (cName) {
        fn = `${cName}.sol`;
      }
      form.append("files", new Blob([sourceCode], { type: "text/plain" }), fn);
    }
    const resp = await fetch("https://sourcify.dev/server/verify", { method: "POST", body: form });
    const ok = resp.ok;
    const link = `https://sourcify.dev/server/files/${chainId}/${address}`;
    if (!ok) {
      const txt = await resp.text();
      return res.status(502).json({ success: false, error: txt });
    }
    return res.json({ success: true, link });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

app.post("/api/verify-bscscan", async (req, res) => {
  try {
    const p = req.body || {};
    const chainId = parseInt(p.chainId || 0, 10);
    const addr = toChecksumAddress(p.contractAddress || "");
    const apiKey = p.apiKey || "";
    const sourceCode = p.sourceCode || "";
    const contractName = p.contractName || "";
    const compilerVersion = p.compilerVersion || "";
    const optimizationUsed = p.optimizationUsed === 0 || p.optimizationUsed === false ? 0 : 1;
    const runs = parseInt(p.runs || 200, 10);
    const codeformat = p.codeformat || "solidity-single-file";
    const constructorArguments = (p.constructorArguments || "").replace(/^0x/, "");
    if (!chainId || !addr || !apiKey || !sourceCode || !contractName || !compilerVersion) return res.status(400).json({ success: false, error: "Campos obrigatórios ausentes" });
    const form = new URLSearchParams();
    form.append("apikey", apiKey);
    form.append("module", "contract");
    form.append("action", "verifysourcecode");
    form.append("contractaddress", addr);
    form.append("sourceCode", sourceCode);
    form.append("codeformat", codeformat);
    form.append("contractname", contractName);
    form.append("compilerversion", compilerVersion);
    form.append("optimizationUsed", String(optimizationUsed));
    form.append("runs", String(runs));
    if (constructorArguments) form.append("constructorArguments", constructorArguments);
    const url = getExplorerApiUrl(chainId);
    const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    const js = await resp.json();
    const ok = String(js?.status || "") === "1";
    const guid = js?.result || null;
    const explorerUrl = getExplorerVerificationUrl(chainId, addr);
    return res.json({ success: ok, guid, explorerUrl, message: js?.message });
  } catch (e) {
    return res.status(500).json({ success: false, error: e?.message || String(e) });
  }
});

app.post("/api/verify-bscscan-status", async (req, res) => {
  try {
    const chainId = parseInt(req.body?.chainId || 0, 10);
    const apiKey = req.body?.apiKey || "";
    const guid = req.body?.guid || "";
    if (!chainId || !apiKey || !guid) return res.status(400).json({ success: false, error: "Dados inválidos" });
    const url = getExplorerApiUrl(chainId);
    const qs = new URLSearchParams();
    qs.append("apikey", apiKey);
    qs.append("module", "contract");
    qs.append("action", "checkverifystatus");
    qs.append("guid", guid);
    const resp = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: qs });
    const js = await resp.json();
    const ok = String(js?.status || "") === "1";
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
  res.status(404).json({
    success: false,
    error: "Endpoint não encontrado",
    availableEndpoints: ["GET /health", "POST /api/compile-only", "POST /api/generate-token"],
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
