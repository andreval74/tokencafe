import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import solc from 'solc';

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
  'https://tokencafe.onrender.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    // Permite qualquer site publicado na Render (subdomínio .onrender.com) via HTTPS
    // Ex.: https://seu-site.onrender.com
    const isRenderSubdomain = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin);
    if (isRenderSubdomain) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
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
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } }
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
  return { abi, bytecode };
}

// Health
app.get('/health', (req, res) => {
  res.type('text/plain').send('ok');
});
app.options('/health', (req, res) => res.sendStatus(204));

// OPTIONS preflight for main endpoints
app.options('/api/generate-token', (req, res) => res.sendStatus(204));
app.options('/api/compile-only', (req, res) => res.sendStatus(204));

// Generate-token: builds ERC-20 minimal source and compiles
app.post('/api/generate-token', (req, res) => {
  try {
    const { name, symbol, totalSupply, decimals } = req.body || {};
    if (!name || !symbol) return res.status(400).json({ error: 'Missing name or symbol' });
    const d = Number.isFinite(decimals) ? parseInt(decimals, 10) : 18;
    if (!Number.isFinite(d) || d < 0 || d > 18) return res.status(400).json({ error: 'Invalid decimals' });
    const ts = parseInt(String(totalSupply || 0), 10);
    if (!Number.isFinite(ts) || ts < 0) return res.status(400).json({ error: 'Invalid totalSupply' });

    const contractName = sanitizeContractName(name);
    const src = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.26;\n\ncontract ${contractName} {\n    string public name = "${String(name)}";\n    string public symbol = "${String(symbol)}";\n    uint8 public decimals = ${d};\n    uint256 public totalSupply;\n\n    mapping(address => uint256) public balanceOf;\n    mapping(address => mapping(address => uint256)) public allowance;\n\n    event Transfer(address indexed from, address indexed to, uint256 value);\n    event Approval(address indexed owner, address indexed spender, uint256 value);\n\n    constructor() {\n        totalSupply = ${ts} * 10**decimals;\n        balanceOf[msg.sender] = totalSupply;\n        emit Transfer(address(0), msg.sender, totalSupply);\n    }\n\n    function transfer(address to, uint256 value) public returns (bool) {\n        require(balanceOf[msg.sender] >= value, "Insufficient balance");\n        balanceOf[msg.sender] -= value;\n        balanceOf[to] += value;\n        emit Transfer(msg.sender, to, value);\n        return true;\n    }\n\n    function approve(address spender, uint256 value) public returns (bool) {\n        allowance[msg.sender][spender] = value;\n        emit Approval(msg.sender, spender, value);\n        return true;\n    }\n\n    function transferFrom(address from, address to, uint256 value) public returns (bool) {\n        require(balanceOf[from] >= value, "Insufficient balance");\n        require(allowance[from][msg.sender] >= value, "Allowance exceeded");\n        balanceOf[from] -= value;\n        balanceOf[to] += value;\n        allowance[from][msg.sender] -= value;\n        emit Transfer(from, to, value);\n        return true;\n    }\n}`;

    const { abi, bytecode } = compileSolidity(src, contractName);
    return res.json({
      ok: true,
      token: { name, symbol, decimals: d, totalSupply: ts },
      sourceCode: src,
      contractName,
      abi,
      bytecode
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
    const { abi, bytecode } = compileSolidity(String(sourceCode), name);
    return res.json({ ok: true, contractName: name, abi, bytecode });
  } catch (err) {
    return res.status(500).json({ error: err?.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 TokenCafe Render API rodando na porta ${PORT}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});
