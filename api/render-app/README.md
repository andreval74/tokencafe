# TokenCafe Render API (mínima)

API mínima para TokenCafe, pronta para deploy no Render, com endpoints:

- `GET /health` – verificação de saúde
- `POST /api/generate-token` – gera fonte ERC‑20 mínimo e compila
- `POST /api/compile-only` – compila uma fonte fornecida

## Rodar localmente

```bash
cd api/render-app
npm install
npm start
# Health: http://localhost:3000/health
```

## Deploy no Render (Blueprint)

1. Faça push deste repositório para GitHub/GitLab.
2. No Render, crie um novo Blueprint a partir do arquivo `render.yaml` na raiz.
3. O serviço `tokencafe-api` usará `api/render-app` como root, com `npm install` e `npm start`.
4. Após deploy, copie a URL pública, por exemplo: `https://tokencafe.onrender.com`.
5. No frontend, ajuste o endpoint:
   - `localStorage.setItem('api_base', 'https://tokencafe.onrender.com')`
   - Recarregue a página e verifique os badges em "Status da API".

## Observações

- CORS liberado para testes; ajuste origens se necessário em produção.
- Compilação usa `solc` via Standard JSON com optimizer runs=200.
- Nomes de contrato são sanitizados para compatibilidade do compilador.
