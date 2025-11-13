# 📋 CONFIGURAÇÃO COMPLETA - xcafe Token API

## 🚨 **ATENÇÃO: Configure TODOS os itens para evitar erros**

---

## 📁 **1. ARQUIVO .env (Obrigatório para desenvolvimento local)**

Crie o arquivo `.env` na pasta `api/` com o conteúdo exato:

```env
# ===== CONFIGURAÇÕES BÁSICAS =====
NODE_ENV=production
PORT=3000
DEBUG=false

# ===== BLOCKCHAIN RPCs (URLs Públicas - FUNCIONAM SEM CHAVE) =====
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
ETHEREUM_RPC=https://eth.llamarpc.com
POLYGON_RPC=https://polygon.llamarpc.com

# ===== COMPILADOR SOLIDITY =====
SOLC_VERSION=0.8.26
OPTIMIZATION_ENABLED=true
OPTIMIZATION_RUNS=200
COMPILE_TIMEOUT=120000

# ===== RATE LIMITING =====
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10

# ===== LOGGING =====
LOG_LEVEL=info

# ===== APENAS PARA API ESTENDIDA (se usando deploy automático) =====
# DEPLOYER_PRIVATE_KEY=sua_private_key_sem_0x_prefix
# JWT_SECRET=jwt_secret_minimo_32_caracteres_muito_forte
```

---

## 📦 **2. PACKAGE.JSON (Verificar dependências)**

Verifique se o `package.json` tem todas as dependências:

```json
{
  "name": "xcafe-token-api-hybrid",
  "version": "3.0.0",
  "description": "API híbrida para compilação de contratos",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "install-deps": "npm install"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5", 
    "express-rate-limit": "^6.7.0",
    "solc": "^0.8.26",
    "helmet": "^6.1.5",
    "dotenv": "^16.0.3",
    "compression": "^1.7.4",
    "winston": "^3.8.2"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 🌐 **3. CONFIGURAÇÃO DO RENDER.COM**

### **3.1 Criação do Service**

```text
Name: xcafe-token-api-hybrid
Environment: Node
Region: Oregon (US West) 
Branch: main
Root Directory: api/
Build Command: npm install
Start Command: npm start
```

### **3.2 Environment Variables (COPIAR EXATO)**

**BÁSICAS (Obrigatórias):**

```text
PORT=10000
NODE_ENV=production
TRUST_PROXY=true
DEBUG=false
SOLC_VERSION=0.8.30
OPTIMIZATION_ENABLED=true
OPTIMIZATION_RUNS=200
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
LOG_LEVEL=info
```

**BLOCKCHAIN RPCs (URLs Públicas):**

```text
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
ETHEREUM_RPC=https://eth.llamarpc.com
POLYGON_RPC=https://polygon.llamarpc.com
```

**APENAS SE USAR DEPLOY AUTOMÁTICO:**

```text
DEPLOYER_PRIVATE_KEY=[SUA_PRIVATE_KEY_SEM_0x]
JWT_SECRET=[STRING_ALEATORIA_32_CHARS_MINIMO]
```

---

## 🛠️ **4. COMANDOS DE INSTALAÇÃO LOCAL**

```powershell
# 1. Navegar para pasta da API
cd api

# 2. Instalar dependências
npm install

# 3. Criar arquivo .env (copiar o conteúdo acima)
# Use o bloco de notas para criar .env na pasta api/

# 4. Testar localmente (opcional)
npm run dev

# 5. Testar endpoint
# http://localhost:3000/health
```

---

## 🔍 **5. TESTES DE VERIFICAÇÃO**

### **5.1 Health Check**

URL: `https://sua-api.onrender.com/health`

**Resposta esperada:**

```json
{
  "success": true,
  "message": "xcafe Token API - Deploy Híbrido",
  "version": "3.0.0",
  "timestamp": "2025-09-01T...",
  "features": [
    "Compilação Solidity",
    "Deploy via MetaMask (usuário paga)",
    "Sem private keys necessárias"
  ]
}
```

### **5.2 Teste de Compilação**

```bash
curl -X POST https://sua-api.onrender.com/api/generate-token \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Token",
    "symbol": "TEST",
    "totalSupply": "1000000",
    "decimals": 18
  }'
```

**Resposta esperada:**

```json
{
  "success": true,
  "token": {...},
  "sourceCode": "// SPDX-License-Identifier: MIT...",
  "compilation": {
    "abi": [...],
    "bytecode": "0x608060405234801561000f57..."
  }
}
```

---

## ⚠️ **6. PROBLEMAS COMUNS E SOLUÇÕES**

### **6.1 Erro: "Cannot find module 'solc'"**

**Solução:** Instalar dependências

```powershell
cd api
npm install
```

### **6.2 Erro: "SOLC_VERSION not defined"**

**Solução:** Verificar arquivo .env ou environment variables

### **6.3 Erro: "Rate limit exceeded"**

**Solução:** Aguardar 1 minuto ou ajustar RATE_LIMIT_MAX_REQUESTS

### **6.4 Erro: "Port already in use"**

**Solução:** Mudar PORT no .env ou matar processo:

```powershell
netstat -ano | findstr :3000
taskkill /PID [NUMERO_PID] /F
```

### **6.5 Erro de Compilação Solidity**

**Solução:** Verificar versão do solc

```bash
# Na pasta api/
npm list solc
# Se não for 0.8.26, instalar:
npm install solc@0.8.26
```

---

## 🔗 **7. ATUALIZAÇÃO DO FRONTEND**

No arquivo `js/xcafe-hybrid-api.js`, atualizar:

```javascript
class XcafeHybridAPI {
    constructor() {
        // SUBSTITUIR pela URL real do Render
        this.apiBaseUrl = 'https://sua-api.onrender.com';
        this.provider = null;
        this.signer = null;
    }
```

---

## ✅ **8. CHECKLIST FINAL**

### **Arquivos Criados/Verificados:**

- [ ] `api/.env` (com todas as variáveis)
- [ ] `api/package.json` (dependências corretas)
- [ ] `api/server.js` (código principal)

### **Render.com Configurado:**

- [ ] Service criado
- [ ] Environment Variables definidas
- [ ] Deploy realizado com sucesso
- [ ] Health check funcionando

### **Frontend Atualizado:**

- [ ] URL da API atualizada
- [ ] Testes realizados
- [ ] Deploy funciona end-to-end

### **Testes Realizados:**

- [ ] Health check: ✅
- [ ] Compilação: ✅  
- [ ] Deploy via frontend: ✅
- [ ] Verificação no BSCScan: ✅

---

## 🆘 **SUPORTE**

Se ainda houver erros após seguir TODOS os passos:

1. **Verificar logs do Render:** Dashboard → Logs
2. **Testar local primeiro:** `npm run dev`
3. **Verificar Network tab:** F12 → Network → Erros de API
4. **Verificar console:** F12 → Console → Mensagens de erro

**URLs importantes:**

- API Health: `https://sua-api.onrender.com/health`
- Render Dashboard: `https://dashboard.render.com`
- BSCScan Testnet: `https://testnet.bscscan.com`
