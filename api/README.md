# 🚀 xcafe Token API

API híbrida para compilação de contratos Solidity. O usuário paga o deploy via MetaMask.

## 📁 Estrutura

```text
api/
├── server.js                    # Servidor principal
├── package.json                 # Dependências Node.js
├── .env.template               # Template de configuração
├── check-config.js             # Script de verificação
├── CONFIGURACAO_COMPLETA.md    # Guia detalhado
├── PASSO_A_PASSO.md           # Tutorial passo-a-passo
├── RESUMO_CONFIGURACAO.md     # Configuração rápida
└── RENDER_CONFIG.txt          # Configurações do Render
```

## ⚡ Início Rápido

1. **Configurar ambiente:**

   ```bash
   cp .env.template .env
   npm install
   ```

2. **Verificar configuração:**

   ```bash
   node check-config.js
   ```

3. **Testar localmente:**

   ```bash
   npm start
   # Acessar: http://localhost:3000/health
   ```

## 🌐 Deploy no Render.com

Veja os arquivos de configuração:

- **Detalhado:** `CONFIGURACAO_COMPLETA.md`
- **Passo-a-passo:** `PASSO_A_PASSO.md`
- **Rápido:** `RESUMO_CONFIGURACAO.md`

## 📋 Endpoints

- `GET /health` - Status da API
- `POST /api/generate-token` - Gerar e compilar token ERC-20

## 🔧 Tecnologias

- **Node.js** - Runtime
- **Express** - Framework web
- **Solc** - Compilador Solidity
- **CORS** - Cross-origin requests
- **Rate Limiting** - Proteção contra spam

## 📞 Suporte

Para problemas de configuração, consulte os arquivos de documentação na pasta.
