import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import solc from 'solc';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
const allowedOrigins = new Set([
  'https://tokencafe.app',
  'http://tokencafe.app',
  'https://www.tokencafe.app',
  'http://www.tokencafe.app',
  'https://api.tokencafe.app',
  'http://api.tokencafe.app',
  'https://tokencafe.onrender.com'
]);

function isLocalDevOrigin(origin) {
  try {
    const o = String(origin || '');
    if (!o) return false;
    if (/^https?:\/\/localhost(?::\d+)?$/i.test(o)) return true;
    if (/^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(o)) return true;
    if (/^https?:\/\/[\[]?::1[\]]?(?::\d+)?$/i.test(o)) return true;
    if (/^https?:\/\/(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)[0-9]{1,3}\.[0-9]{1,3}(?::\d+)?$/i.test(o)) return true;
    return false;
  } catch {
    return false;
  }
}

app.use(cors({
  origin: (origin, callback) => {
    const isProd = String(process.env.NODE_ENV).toLowerCase() === 'production';
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    const isRenderSubdomain = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin);
    if (isRenderSubdomain) return callback(null, true);
    if (!isProd && isLocalDevOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// Helper: sanitize contract name
function sanitizeContractName(rawName) {
  try {
    const base = String(rawName || '').trim();
    let cleaned = base.replace(/[^A-Za-z0-9_]/g, '');
    if (!cleaned) cleaned = 'Token';
    if (!/^[A-Za-z_]/.test(cleaned)) cleaned = `_${cleaned}`;
    if (cleaned.length > 64) cleaned = cleaned.slice(0, 64);
    return cleaned;
  } catch {
    return 'Token';
  }
}

// Helper: compile solidity using standard JSON
function compileSolidity(sourceCode, contractName) {
  const input = {
    language: 'Solidity',
    sources: { [`${contractName}.sol`]: { content: sourceCode } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'] } }
    }
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contractOut = output?.contracts?.[`${contractName}.sol`]?.[contractName];
  if (!contractOut) {
    const err = output?.errors?.map(e => e.formattedMessage).join('\n') || 'Unknown compile error';
    throw new Error(err);
  }
  const abi = contractOut.abi || [];
  const bytecode = contractOut.evm?.bytecode?.object || '';
  const deployedBytecode = contractOut.evm?.deployedBytecode?.object || '';
  return { abi, bytecode, deployedBytecode };
}

// Health
app.get('/health', (req, res) => {
  res.type('text/plain').send('ok');
});
app.options('/health', (req, res) => res.sendStatus(204));

// OPTIONS preflight for main endpoints
app.options('/api/generate-token', (req, res) => res.sendStatus(204));
app.options('/api/compile-only', (req, res) => res.sendStatus(204));
app.options('/api/verify-bscscan', (req, res) => res.sendStatus(204));
app.options('/api/verify-sourcify', (req, res) => res.sendStatus(204));
app.options('/api/verify-private', (req, res) => res.sendStatus(204));
app.options('/api/log-recipe', (req, res) => res.sendStatus(204));

// Generate-token: builds ERC-20 minimal source and compiles
app.post('/api/generate-token', (req, res) => {
  try {
    const { name, symbol, totalSupply, decimals } = req.body || {};
    if (!name || !symbol) return res.status(400).json({ error: 'Missing name or symbol' });
    const d = Number.isFinite(decimals) ? parseInt(decimals, 10) : 18;
    if (!Number.isFinite(d) || d < 0 || d > 18) return res.status(400).json({ error: 'Invalid decimals' });
    const tsStr = String(totalSupply ?? '0');
    const tsSan = tsStr.replace(/[^0-9]/g, '');
    const ts = parseInt(tsSan || '0', 10);
    if (!Number.isFinite(ts) || ts < 0) return res.status(400).json({ error: 'Invalid totalSupply' });

    const contractName = sanitizeContractName(name);
    const src = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.26;\n\ncontract ${contractName} {\n    string public name = "${String(name)}";\n    string public symbol = "${String(symbol)}";\n    uint8 public decimals = ${d};\n    uint256 public totalSupply;\n\n    mapping(address => uint256) public balanceOf;\n    mapping(address => mapping(address => uint256)) public allowance;\n\n    event Transfer(address indexed from, address indexed to, uint256 value);\n    event Approval(address indexed owner, address indexed spender, uint256 value);\n\n    constructor() {\n        totalSupply = ${ts} * 10**decimals;\n        balanceOf[msg.sender] = totalSupply;\n        emit Transfer(address(0), msg.sender, totalSupply);\n    }\n\n    function transfer(address to, uint256 value) public returns (bool) {\n        require(balanceOf[msg.sender] >= value, "Insufficient balance");\n        balanceOf[msg.sender] -= value;\n        balanceOf[to] += value;\n        emit Transfer(msg.sender, to, value);\n        return true;\n    }\n\n    function approve(address spender, uint256 value) public returns (bool) {\n        allowance[msg.sender][spender] = value;\n        emit Approval(msg.sender, spender, value);\n        return true;\n    }\n\n    function transferFrom(address from, address to, uint256 value) public returns (bool) {\n        require(balanceOf[from] >= value, "Insufficient balance");\n        require(allowance[from][msg.sender] >= value, "Allowance exceeded");\n        balanceOf[from] -= value;\n        balanceOf[to] += value;\n        allowance[from][msg.sender] -= value;\n        emit Transfer(from, to, value);\n        return true;\n    }\n}`;

    const { abi, bytecode, deployedBytecode } = compileSolidity(src, contractName);
    return res.json({
      success: true,
      token: { name, symbol, decimals: d, totalSupply: ts, contractName },
      sourceCode: src,
      compilation: { abi, bytecode, deployedBytecode }
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

// Compile-only: compiles provided source
app.post('/api/compile-only', (req, res) => {
  try {
    const { sourceCode, contractName } = req.body || {};
    if (!sourceCode || !contractName) return res.status(400).json({ error: 'Missing sourceCode or contractName' });
    const name = sanitizeContractName(contractName);
    const { abi, bytecode, deployedBytecode } = compileSolidity(String(sourceCode), name);
    return res.json({ success: true, contractName: name, compilation: { abi, bytecode, deployedBytecode } });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

function getExplorerVerificationUrl(chainId, address) {
  const addr = address || '';
  const map = {
    1: `https://etherscan.io/address/${addr}#code`,
    56: `https://bscscan.com/address/${addr}#code`,
    97: `https://testnet.bscscan.com/address/${addr}#code`,
    137: `https://polygonscan.com/address/${addr}#code`,
    8453: `https://basescan.org/address/${addr}#code`,
    11155111: `https://sepolia.etherscan.io/address/${addr}#code`
  };
  return map[Number(chainId)] || `https://etherscan.io/address/${addr}#code`;
}

app.post('/api/verify-bscscan', async (req, res) => {
  try {
    const { chainId, contractAddress } = req.body || {};
    if (!contractAddress || typeof chainId === 'undefined') {
      return res.status(400).json({ success: false, message: 'Missing chainId or contractAddress' });
    }
    const explorerUrl = getExplorerVerificationUrl(chainId, String(contractAddress));
    return res.json({ success: false, message: 'pending', explorerUrl });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

async function sourcifyRepoStatus(chainId, address) {
  const cid = Number(chainId);
  const addr = String(address || '').toLowerCase();
  const baseRepo = 'https://repo.sourcify.dev/contracts';
  const fullUrl = `${baseRepo}/full_match/${cid}/${addr}/`;
  const partialUrl = `${baseRepo}/partial_match/${cid}/${addr}/`;
  let full = false, partial = false;
  try { const r = await fetch(fullUrl, { method: 'GET' }); full = r.ok; } catch {}
  try { const r = await fetch(partialUrl, { method: 'GET' }); partial = r.ok; } catch {}
  const status = full ? 'perfect' : (partial ? 'partial' : 'none');
  const anyUrl = full ? fullUrl : (partial ? partialUrl : null);
  const lookupUrl = `https://sourcify.dev/server/files/${cid}/${addr}`;
  return { status, repoFull: full ? fullUrl : null, repoPartial: partial ? partialUrl : null, repoFilesAny: anyUrl, lookupUrl };
}

app.post('/api/verify-sourcify', async (req, res) => {
  try {
    const { chainId, contractAddress } = req.body || {};
    if (!contractAddress || typeof chainId === 'undefined') {
      return res.status(400).json({ success: false, error: 'Missing chainId or contractAddress' });
    }
    const out = await sourcifyRepoStatus(chainId, contractAddress);
    const success = out.status === 'perfect' || out.status === 'partial';
    return res.json({ success, ...out });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

function getRpcUrl(chainId) {
  const cid = Number(chainId);
  const map = {
    1: 'https://eth.llamarpc.com',
    56: 'https://bsc-dataseed1.binance.org/',
    97: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    137: 'https://polygon.llamarpc.com',
    8453: 'https://mainnet.base.org',
    11155111: 'https://rpc.sepolia.org'
  };
  return map[cid] || null;
}

async function fetchOnChainCode(rpcUrl, address) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'eth_getCode',
    params: [String(address), 'latest']
  };
  const resp = await fetch(rpcUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`RPC ${resp.status}`);
  const json = await resp.json();
  const code = json?.result || '0x';
  return String(code || '0x');
}

app.post('/api/verify-private', async (req, res) => {
  try {
    const { chainId, contractAddress, deployedBytecode: compiledDeployedBytecode, sourceCode, contractName, rpcUrl } = req.body || {};
    if (!contractAddress || typeof chainId === 'undefined') {
      return res.status(400).json({ success: false, error: 'Missing chainId or contractAddress' });
    }
    const url = rpcUrl || getRpcUrl(chainId);
    if (!url) return res.status(400).json({ success: false, error: 'RPC URL unavailable for this chainId' });

    let expected = String(compiledDeployedBytecode || '').trim();
    if (!expected && sourceCode && contractName) {
      const nameSan = sanitizeContractName(contractName);
      const { deployedBytecode } = compileSolidity(String(sourceCode), nameSan);
      expected = String(deployedBytecode || '').trim();
    }
    if (!expected) return res.status(400).json({ success: false, error: 'Missing deployedBytecode or sourceCode+contractName' });

    const onChain = await fetchOnChainCode(url, contractAddress);
    const a = (onChain || '').replace(/^0x/, '').toLowerCase();
    const b = (expected || '').replace(/^0x/, '').toLowerCase();
    const match = !!a && !!b && a === b;
    return res.json({ success: match, match, onChainLen: a.length, compiledLen: b.length });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

function ensureRecipeLogHeader(mdPath) {
  try {
    const exists = fs.existsSync(mdPath);
    if (!exists) return;
    const content = fs.readFileSync(mdPath, 'utf8');
    if (!/##\s*Histórico de Receitas/i.test(content)) {
      const append = `\n\n## Histórico de Receitas\n\n`;
      fs.appendFileSync(mdPath, append);
    }
  } catch {}
}

function formatRecipeLog(action, recipe) {
  const ts = new Date().toISOString();
  const name = String(recipe?.compilation?.contractName || recipe?.token?.name || '').replace(/\s+/g, '') || 'MyToken';
  const chainId = recipe?.network?.chainId ?? null;
  const addr = recipe?.deployment?.address || null;
  const tx = recipe?.deployment?.tx || null;
  const group = recipe?.group || null;
  const dec = recipe?.token?.decimals ?? null;
  const supply = recipe?.token?.initialSupply ?? null;
  const bb = String(recipe?.compilation?.deployedBytecode || '').length;
  const line = `- ${ts} | ${action} | ${name} | chainId=${chainId} | addr=${addr || '-'} | tx=${tx || '-'} | group=${group || '-'} | dec=${dec} | supply=${supply} | deployedBytecodeLen=${bb}`;
  return `${line}\n`;
}

app.post('/api/log-recipe', async (req, res) => {
  try {
    const { action, recipe } = req.body || {};
    if (!action || !recipe) return res.status(400).json({ success: false, error: 'Missing action or recipe' });
    const mdPath = path.resolve(__dirname, '../../docs/PLANO-EXECUCAO.md');
    ensureRecipeLogHeader(mdPath);
    const entry = formatRecipeLog(String(action), recipe);
    fs.appendFileSync(mdPath, entry);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TokenCafe Render API rodando na porta ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});
