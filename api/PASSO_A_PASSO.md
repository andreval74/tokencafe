# 🚀 CONFIGURAÇÃO XCAFE API - PASSO A PASSO

## ✅ **PASSO 1: PREPARAR ARQUIVOS LOCAIS**

### 1.1 Criar arquivo .env

```env
# Copie o arquivo .env.template para .env na pasta api/
# Ou crie manualmente com o conteúdo:

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

### 1.2 Instalar dependências

```powershell
cd api
npm install
```

### 1.3 Verificar configuração

```powershell
node check-config.js
```

## ✅ **PASSO 2: CONFIGURAR RENDER.COM**

### 2.1 Criar conta no Render

- Acesse: <https://render.com>
- Faça login com GitHub

### 2.2 Criar Web Service

- **New** → **Web Service**
- **Connect GitHub** → Selecionar repositório
- **Configurações:**

```render
  Name: xcafe-token-api
  Environment: Node
  Region: Oregon (US West)
  Branch: main
  Root Directory: api
  Build Command: npm install
  Start Command: npm start
```

### 2.3 Environment Variables (EXATO)

**Clique em "Environment" e adicione:**

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `SOLC_VERSION` | `0.8.26` |
| `OPTIMIZATION_ENABLED` | `true` |
| `OPTIMIZATION_RUNS` | `200` |
| `RATE_LIMIT_WINDOW` | `60000` |
| `RATE_LIMIT_MAX_REQUESTS` | `10` |
| `BSC_MAINNET_RPC` | `https://bsc-dataseed1.binance.org/` |
| `BSC_TESTNET_RPC` | `https://data-seed-prebsc-1-s1.binance.org:8545/` |

### 2.4 Deploy

- Clique **"Create Web Service"**
- Aguarde build e deploy (2-5 minutos)

## ✅ **PASSO 3: TESTAR API**

### 3.1 Health Check

Acesse: `https://seu-service-name.onrender.com/health`

**Deve retornar:**

```json
{
  "success": true,
  "message": "xcafe Token API - Deploy Híbrido",
  "version": "3.0.0"
}
```

### 3.2 Teste de compilação

```bash
curl -X POST https://seu-service.onrender.com/api/generate-token \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","symbol":"TEST","totalSupply":"1000000"}'
```

## ✅ **PASSO 4: ATUALIZAR FRONTEND**

### 4.1 Editar xcafe-hybrid-api.js

Linha ~5, alterar:

```javascript
this.apiBaseUrl = 'https://SEU-SERVICE-NAME.onrender.com';
```

### 4.2 Testar integração

- Abra `add-index.html`
- Preencha formulário
- Clique "Criar Token"
- Deve funcionar sem erros

## 🆘 **RESOLUÇÃO DE PROBLEMAS**

### ❌ Erro: "Application failed to respond"

**Solução:** Verificar logs no Render dashboard

### ❌ Erro: "Cannot find module"

**Solução:**

```powershell
cd api
npm install
git add .
git commit -m "fix: add dependencies"  
git push
```

### ❌ Erro: "Environment variable not found"

**Solução:** Verificar todas as variables no Render

### ❌ Erro: "Compilation failed"

**Solução:** Verificar se SOLC_VERSION = 0.8.26

### ❌ Frontend não conecta

**Solução:** Verificar URL da API no código

## ✅ **CHECKLIST FINAL**

- [ ] ✅ Health check funcionando
- [ ] ✅ API generate-token funcionando  
- [ ] ✅ Frontend conectando à API
- [ ] ✅ Deploy de token funcionando
- [ ] ✅ Verificação no BSCScan funcionando

## 📞 **SUPORTE TÉCNICO**

**URLs importantes:**

- Render Dashboard: <https://dashboard.render.com>
- Logs da API: Dashboard → Services → Logs
- BSCScan Testnet: <https://testnet.bscscan.com>

**Comandos úteis:**

```powershell
# Verificar configuração local
cd api && node check-config.js

# Testar local
npm run dev

# Ver logs
git log --oneline -10
```
