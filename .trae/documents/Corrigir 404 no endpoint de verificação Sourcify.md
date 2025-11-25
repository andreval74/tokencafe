## Objetivo
- Corrigir o erro 404 ao verificar pelo Sourcify, garantindo que o frontend use o domínio correto da API em produção e fornecendo uma ajuda clara na UI quando a API estiver errada.

## Passos
1. Ajuste automático do `API_BASE` em produção
- Confirmar/ajustar a lógica para usar `https://tokencafe-api.onrender.com` quando o site estiver em HTTPS fora de localhost.

2. Ajuda na UI ao detectar 404/domínio incorreto
- Inserir um aviso na página de Verificação de Contrato que aparece quando:
  - O `API_BASE` aponta para o mesmo host do site estático.
  - Uma chamada ao endpoint `/api/verify-sourcify-upload` retornar 404.
- Oferecer botão “Usar API de produção” que define `localStorage.api_base = 'https://tokencafe-api.onrender.com'` e recarrega.

3. Testes
- Validar que `https://tokencafe-api.onrender.com/health` responde `ok`.
- Enviar `POST /api/compile-only` com um contrato simples para obter `metadata`.
- Enviar `POST /api/verify-sourcify-upload` com `chainId`, `contractAddress`, `contractName`, `sourceCode`, `metadata` e verificar resposta JSON (mesmo sem contrato válido, deve retornar sem 404).

## Entregáveis
- Atualização do frontend para detectar e corrigir automaticamente o domínio da API.
- Testes executados e resultados reportados em português.

## Observação
- Sem alterar fluxo funcional existente; apenas melhorar detecção e correção de configuração de API no frontend.