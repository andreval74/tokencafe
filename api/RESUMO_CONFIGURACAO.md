# ⚡ CONFIGURAÇÃO RÁPIDA - xcafe API

## 🎯 **3 ARQUIVOS ESSENCIAIS**

### 1. `.env` (criar na pasta api/)

```env
NODE_ENV=production
PORT=3000
SOLC_VERSION=0.8.26
OPTIMIZATION_ENABLED=true
OPTIMIZATION_RUNS=200
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=10
BSC_MAINNET_RPC=https://bsc-dataseed1.binance.org/
BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
```

### 2. `package.json` (verificar dependências)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5", 
    "express-rate-limit": "^6.7.0",
    "solc": "^0.8.26",
    "helmet": "^6.1.5",
    "dotenv": "^16.0.3",
    "compression": "^1.7.4",
    "winston": "^3.8.2"
  }
}
```

### 3. `server.js` (já existe)

## 🚀 **RENDER.COM - 10 CONFIGURAÇÕES**

| Configuração | Valor |
|--------------|--------|
| **Name** | `xcafe-token-api` |
| **Environment** | `Node` |
| **Root Directory** | `api` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **NODE_ENV** | `production` |
| **PORT** | `10000` |
| **TRUST_PROXY** | `true` |
| **DEBUG** | `false` |
| **SOLC_VERSION** | `0.8.26` |
| **OPTIMIZATION_RUNS** | `200` |
| **BSC_TESTNET_RPC** | `https://data-seed-prebsc-1-s1.binance.org:8545/` |

## ✅ **COMANDOS ESSENCIAIS**

```powershell
# 1. Instalar dependências
cd api
npm install

# 2. Verificar configuração  
node check-config.js

# 3. Testar local (opcional)
npm run dev

# 4. Fazer commit e push
git add .
git commit -m "config: update API settings"
git push
```

## 🔗 **ATUALIZAR FRONTEND**

Arquivo: `js/xcafe-hybrid-api.js`

```javascript
// Linha ~5 - SUBSTITUIR pela URL do Render
this.apiBaseUrl = 'https://SEU-SERVICE.onrender.com';
```

## 🧪 **TESTE FINAL**

1. **Health Check**: `https://sua-api.onrender.com/health`
2. **Deve retornar**: `{"success": true, "message": "xcafe Token API..."}`
3. **Frontend**: Criar token deve funcionar
4. **BSCScan**: Verificação deve funcionar

## 🆘 **ERRO COMUM**

### Erro: "Cannot find module 'solc'"

```powershell
cd api
npm install solc@0.8.26
git add package*.json
git commit -m "fix: update solc version" 
git push
```

---

## ✅ Seguindo esses passos, a API funcionará 100%
