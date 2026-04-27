## Relatório de Mudanças Pendentes (antes de descartar/reaplicar)

### Objetivo
Registrar de forma simples o que estava sendo alterado após o commit “correções de menu”, para reaplicar depois com segurança, aos poucos e testando.

### Base (versão ativa)
- Commit base: `85ae37e` (mensagem: “correções de menu”)

### Snapshot do que estava pendente para commit
- Arquivos modificados (28): `.gitignore`, `README.md`, `api/contract-templates.js`, `api/render-app/server.js`, vários módulos JS/PHP do sistema, `contracts/TokenSale.sol`.
- Arquivos novos (1): `docs/MAPA-MIGRACAO-TOKENCAFE.md`
- Pasta `docs/obsidian/`: removida do projeto (decisão: não usar mais Obsidian).

### Mudanças que afetaram diretamente a VERIFICAÇÃO (alta relevância)
- `assets/js/modules/contrato/builder.js`
  - Reativou o módulo: `VERIFICATION_MODULE_ENABLED = true`.
  - Ajustou UI/fluxos para respeitar o toggle (quando desligado, desabilita botões/links).
- `assets/js/shared/contract-search.js`
  - A seta ao lado de “Não verificado” passou a tentar verificação real (chama `runVerifyDirect` usando payload salvo do deploy) e depois atualiza o badge.
  - Passou a montar payload a partir do `sessionStorage.lastDeployedContract` e/ou `localStorage.tokencafe_contract_verify_payload`.
- `assets/js/shared/verify-utils.js`
  - Melhorou interpretação de respostas do backend (normaliza `pending`, `already verified`, etc.).
  - Passou a injetar `apiKey` no payload quando disponível.
  - Ajustou consulta de status para tentar backend antes do Explorer direto (depende do endpoint existir no backend em produção).
- `assets/js/modules/contrato/contrato-detalhes.js`
  - Corrigiu “timing” de admin: reavaliar downloads/verificação ao conectar/desconectar carteira, trocar conta ou rede.
  - Parou polling quando erro é terminal (API key/plano), para não entrar em loop infinito.
- `assets/js/shared/api-config.js` (+ duplicados em `assets/js/modules/*/api-config.js`)
  - Ajustou regra de seleção de API base para não ficar preso em localhost salvo.
- `api/render-app/server.js`
  - Adicionou `POST /api/explorer-getsourcecode` (consulta de status por endereço via backend).
  - Ajustou prioridade do erro (retornar `result` do explorer quando disponível).

### Separação: Visual/UX vs Lógica (para reaplicar com segurança)
#### Visual/UX (melhora experiência sem mudar regra de negócio)
- Exibir estados mais claros no badge de verificação (ex.: “Chave API”, “Aguardando”, “Verificar”) e melhorar títulos/ícones do status.
- Evitar “loop” visual repetitivo quando o erro é terminal (API key/plano) para não poluir o console e não confundir o usuário.
- Em testnet, quando não admin, não “sumir” com a seção de downloads: manter visível e apenas desabilitar botões, mostrando mensagem objetiva do motivo.
- Reavaliar UI automaticamente quando a carteira conecta/troca conta/rede (para não depender de reload manual).

#### Lógica/Infra (muda comportamento/integrações e deve ser reintroduzido por etapas)
- Reativar `VERIFICATION_MODULE_ENABLED` e religar rotas/botões de verificação no builder.
- Disparar verificação real pela seta (montagem de payload + chamada `runVerifyDirect`).
- Alterar fluxo de status para preferir backend antes de chamar Explorer direto.
- Adicionar no backend o endpoint `POST /api/explorer-getsourcecode` e ajustar prioridades de erro.
- Exigir/propagar API key válida para verificação/consulta no Explorer V2 (principalmente chainId 97).

### Por que “verificação funcionava” e passou a falhar
O problema não ficou apenas em “testnet vs admin”. Houve dois gargalos externos:
1) O backend em produção usado pela UI (`https://tokencafe.onrender.com`) responde `/health`, mas não expõe `POST /api/explorer-getsourcecode` (retornava 404). Sem isso, o frontend cai no Explorer direto.
2) O Explorer V2 (para chainId 97) retornou erros do tipo “Missing/Invalid API Key” / “Invalid API Key (#err2)”. Admin do sistema não consegue contornar a exigência do Explorer por chave válida/cobertura.

### O que seria realmente NECESSÁRIO (mínimo) para recuperar verificação de forma estável
1) Publicar (deploy) no backend que a UI usa o endpoint:
   - `POST /api/explorer-getsourcecode` (para status por endereço sem depender do browser).
2) Garantir uma API key válida no backend (variável de ambiente) com cobertura para a rede usada.
3) Reintroduzir as mudanças de UI/UX em commits pequenos:
   - Primeiro: backend + status.
   - Depois: seta de “verificar” + UX.
   - Por último: melhorias extras.

### Prompt sugerido para revisão futura (comparar base vs mudanças)
Cole este prompt quando for retomar:

“Você é um desenvolvedor sênior revisando um repositório. Compare o estado atual do branch (commit base `85ae37e` ‘correções de menu’) com as mudanças locais pendentes (working tree). Gere:
1) Uma lista simples do que mudou por área (Verificação, Deploy/Builder, UI/UX, Backend/API, Docs).
2) Para a área de verificação, identifique:
   - Quais arquivos mudaram,
   - Qual era o comportamento antigo,
   - Qual o comportamento novo,
   - Quais dependências externas existem (endpoints/keys/explorer),
   - O que pode quebrar em produção.
3) Proponha um plano de commits mínimos (1–3 commits) para reintroduzir a verificação com testes entre etapas.
4) Se houver risco alto, recomende manter ‘correções de menu’ e reintroduzir as mudanças em passos menores.
Responda em português (Brasil) e seja objetivo.”
