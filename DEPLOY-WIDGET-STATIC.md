# 📦 Deploy do Widget TokenCafe (sem Flask)

## 🎯 Quando Usar Este Guia

Use este guia se você está hospedando o TokenCafe em:
- GitHub Pages
- Netlify
- Vercel
- Servidor estático (sem backend Python/Node)

## ⚠️ Limitação

Sem um servidor backend, o botão "Gerar Widget" **não salvará automaticamente** o JSON no servidor. Você precisará:

1. Baixar o JSON manualmente (botão "Download JSON")
2. Fazer upload para a pasta correta

## 📋 Passos para Deploy

### 1️⃣ Estrutura de Pastas

Certifique-se de que seu servidor tem esta estrutura:

```
seu-site/
├── assets/
│   └── tokencafe-widget.min.js
├── widget/
│   └── gets/
│       └── <owner-address>/
│           └── <widget-code>.json
├── pages/
│   └── modules/
│       └── widget/
│           ├── widget-teste.html
│           └── teste.html
└── (outros arquivos...)
```

### 2️⃣ Gerar Widget (Local ou Online)

1. Abra: `https://seu-site.com/pages/modules/widget/widget-teste.html`
2. Conecte MetaMask
3. Selecione a rede
4. Preencha o contrato Sale
5. Clique **"Validar Configuração"**
6. Clique **"Gerar Widget"**

Você verá:
```
ℹ️ Servidor Flask não disponível. Use "Download JSON" para salvar.
Widget gerado! Use "Download JSON" para salvar o arquivo.
```

### 3️⃣ Salvar JSON Manualmente

1. Clique no botão **"Download JSON"**
2. Será baixado um arquivo: `widget-tc-XXXXXXXXXX-XXXX.json`
3. Renomeie para: `<widget-code>.json` (ex: `tc-20251103-161933-y1ln-4bc5.json`)
4. Faça upload para: `widget/gets/<owner-address>/`

**Exemplo:**
```
Owner: 0x0b81337F18767565D2eA40913799317A25DC4bc5
Code: tc-20251103-161933-y1ln-4bc5

Upload para:
widget/gets/0x0b81337F18767565D2eA40913799317A25DC4bc5/tc-20251103-161933-y1ln-4bc5.json
```

### 4️⃣ Incorporar Widget

Use o snippet gerado:

```html
<!-- TokenCafe Widget -->
<script src="/assets/tokencafe-widget.min.js" async></script>
<div class="tokencafe-widget" 
     data-owner="0x0b81337F18767565D2eA40913799317A25DC4bc5"
     data-code="tc-20251103-161933-y1ln-4bc5"></div>
```

### 5️⃣ Verificar se Funciona

Abra a página com o widget incorporado. No console (F12):

```
[TokenCafe Widget] Carregando configuração de: /widget/gets/0x.../tc-....json
[TokenCafe Widget] Response status: 200
[TokenCafe Widget] Widget inicializado com sucesso
```

Se aparecer **404**, verifique:
- ✅ O arquivo JSON está na pasta correta?
- ✅ O nome do arquivo está correto (case-sensitive)?
- ✅ O owner address está em checksum format?

## 🚀 Automação (Opcional)

### GitHub Actions (para GitHub Pages)

Crie `.github/workflows/deploy-widget.yml`:

```yaml
name: Deploy Widget JSON

on:
  workflow_dispatch:
    inputs:
      json_content:
        description: 'Widget JSON content'
        required: true
      owner:
        description: 'Owner address'
        required: true
      code:
        description: 'Widget code'
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Create widget directory
        run: mkdir -p widget/gets/${{ github.event.inputs.owner }}
      
      - name: Save widget JSON
        run: echo '${{ github.event.inputs.json_content }}' > widget/gets/${{ github.event.inputs.owner }}/${{ github.event.inputs.code }}.json
      
      - name: Commit and push
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add widget/gets/
          git commit -m "Add widget ${{ github.event.inputs.code }}"
          git push
```

Depois de gerar o widget:
1. Copie o JSON completo
2. Vá em GitHub → Actions → "Deploy Widget JSON" → Run workflow
3. Cole o JSON, owner e code
4. Aguarde deploy

## 🔧 Servidor Backend Simples (Opcional)

Se quiser salvar automaticamente, implante um backend serverless:

### Netlify Functions

Crie `netlify/functions/save-widget.js`:

```javascript
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204 };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }
  
  const { owner, code, config } = JSON.parse(event.body);
  
  // Salvar no sistema de arquivos ou banco de dados
  // (Netlify não suporta escrita de arquivos, use Netlify CMS ou DB externa)
  
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      message: 'Widget salvo',
      path: `/widget/gets/${owner}/${code}.json`
    })
  };
};
```

### Vercel Serverless

Crie `api/widget/save.js`:

```javascript
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { owner, code, config } = req.body;
  
  // Salvar em Vercel KV, Supabase ou outro DB
  
  res.status(200).json({
    success: true,
    message: 'Widget salvo',
    path: `/widget/gets/${owner}/${code}.json`
  });
}
```

## 📝 Checklist de Deploy

- [ ] `assets/tokencafe-widget.min.js` está acessível
- [ ] Pasta `widget/gets/` existe e tem permissões corretas
- [ ] JSON do widget foi salvo manualmente no caminho correto
- [ ] Snippet foi copiado e colado na página de destino
- [ ] CORS está configurado (se assets em domínio diferente)
- [ ] Testou em localhost antes de fazer deploy
- [ ] Testou widget em produção (console F12 sem erros)

## 🐛 Troubleshooting

| Erro | Solução |
|------|---------|
| 404 no JSON | Verifique caminho: `/widget/gets/<owner>/<code>.json` |
| Widget não renderiza | Veja console F12; erro de carregamento do loader? |
| Botão Comprar não funciona | Veja se MetaMask está na rede correta (chainId) |
| Teste dá erro de gas | Sem carteira conectada, alguns RPCs não estimam gas |

---

**Resumo:** Em produção sem Flask, você gera o widget, baixa o JSON manualmente e faz upload para a pasta correta. O resto funciona igual!
