# 🚀 Guia Rápido - TokenCafe Widget System

## ✅ Problema Resolvido

O widget agora **salva automaticamente** o JSON no servidor quando você clica em "Gerar Widget". Antes, só baixava localmente.

## 📋 Como Usar

### 1️⃣ Iniciar o Servidor

**Opção A - Script Automático (Recomendado):**
```powershell
.\start-flask.ps1
```

**Opção B - Manual:**
```powershell
python server_flask.py
```

O servidor iniciará na porta **5000**.

### 2️⃣ Gerar um Widget

1. Abra: `http://localhost:5000/pages/modules/widget/widget-criar.html`
2. Conecte sua carteira MetaMask
3. Selecione a rede (ex: BSC Testnet)
4. Preencha o contrato Sale
5. Clique em **"Validar Configuração"** (aguarde os ✅)
6. Clique em **"Gerar Widget"**

### 3️⃣ Verificar se Salvou

Veja no console do navegador (F12):
```
✅ JSON salvo no servidor: /widget/gets/0x.../tc-20251103-....json
```

### 4️⃣ Testar o Widget Gerado

Abra: `http://localhost:5000/pages/modules/widget/widget-demo.html`

Ou crie sua própria página HTML:
```html
<!DOCTYPE html>
<html>
<body>
  <!-- Cole o snippet gerado aqui -->
  <div class="tokencafe-widget" 
       data-owner="0x..."
       data-code="tc-..."></div>
  
  <script src="/assets/tokencafe-widget.min.js"></script>
</body>
</html>
```

## 🔧 O Que Foi Alterado

### Backend (Flask)
- ✅ Nova rota: `POST /api/widget/save`
  - Recebe: `{ owner, code, config }`
  - Salva em: `widget/gets/<owner>/<code>.json`
- ✅ Rota para servir JSONs: `GET /widget/**`
- ✅ Rota para servir assets: `GET /assets/**`

### Frontend (widget-simple.js)
- ✅ Após gerar widget, chama `/api/widget/save`
- ✅ Logs detalhados sobre o salvamento
- ✅ Toast de sucesso/aviso se falhar

### Widget Loader (tokencafe-widget.min.js)
- ✅ Logs detalhados de carregamento
- ✅ Busca decimals corretos do token
- ✅ Teste robusto com/sem carteira

## 🐛 Troubleshooting

### Widget não aparece (tela em branco)

**1. Verifique o console do navegador (F12 → Console):**
```
[TokenCafe Widget] Script carregado...
[TokenCafe Widget] Encontrados 1 widget(s)...
[TokenCafe Widget] Carregando configuração de: /widget/gets/...
```

**2. Se aparecer "HTTP 404":**
- O JSON não foi salvo no servidor
- Volte para `widget-criar.html` e gere novamente
- Verifique se aparece "✅ JSON salvo no servidor"

**3. Se aparecer "HTTP 500":**
- Problema no Flask
- Veja o terminal do servidor Flask
- Pode ser erro de permissão de escrita

### Botão "Comprar" não funciona

**1. Verifique se está na rede correta:**
- Abra MetaMask
- Veja se o ChainId está correto (ex: 97 para BSC Testnet)

**2. Verifique os logs do console:**
```
[TokenCafe Widget] Token decimals: 18
[TokenCafe Widget] Comprando: 100 tokens...
```

**3. Erros comuns:**
- `Troque para a rede correta` → Mude a rede no MetaMask
- `Saldo insuficiente` → Adicione BNB de teste
- `Transação rejeitada` → Você cancelou no MetaMask

## 📁 Estrutura de Arquivos

```
tokencafe/
├── server_flask.py          ← Servidor Flask (porta 5000)
├── start-flask.ps1           ← Script de inicialização
├── assets/
│   └── tokencafe-widget.min.js  ← Loader do widget
├── widget/
│   └── gets/
│       └── <owner>/
│           └── <code>.json   ← Configs dos widgets
├── pages/modules/widget/
│   ├── widget-criar.html     ← Admin (gerador)
│   └── widget-demo.html      ← Demo externa
└── js/modules/widget/
    ├── widget-simple.js      ← Lógica admin/preview
    └── widget-generator.js   ← Funções de geração
```

## ✨ Próximos Passos

- [ ] Deploy em produção (Heroku/Vercel)
- [ ] Autenticação para salvar widgets
- [ ] Dashboard de widgets criados
- [ ] Análise de uso (cliques, compras)
- [ ] Temas customizáveis via UI
