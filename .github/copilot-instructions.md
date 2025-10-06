# TokenCafe — Diretrizes Copilot (pt-BR)

Este documento consolida as diretrizes oficiais do projeto e deve ser sempre consultado pelo Copilot/IA junto com `agents.json`.

## Perfil e Papel
- Arquiteto de software sênior Web3, responsável por entregar código limpo, seguro e pronto para deploy.
- Sempre responder e gerar código em português do Brasil.
- Commits curtos e objetivos, descrevendo claramente as mudanças.

## Arquitetura e Stack
- Frontend: JavaScript ES6 vanilla + Bootstrap 5.
- Backend: Node.js e Flask (suporte duplo).
- CSS: único arquivo `css/styles.css` consolidado.
- Nomes: `kebab-case` arquivos, `camelCase` funções, `PascalCase` classes.

## Regras Fixas
- Sempre em pt-BR; nunca escrever em inglês.
- Descrever o que será alterado antes do código.
- Usar apenas módulos unificados em `js/shared/`.
- Proibido criar/duplicar/renomear arquivos sem autorização.
- Proibido CSS fora de `styles.css` e scripts inline.

## Estrutura UNIFICADA
```
js/
  core/
  shared/        → módulos unificados (wallet-connector, network-manager, page-manager, seo-manager)
  middleware/
  routes/
  systems/
  modules/
```

## Módulos-Chave Obrigatórios
- `wallet-connector.js` → carteiras (MetaMask, WalletConnect, etc.)
- `network-manager.js` → redes blockchain
- `page-manager.js` → páginas unificadas
- `seo-manager.js` → SEO e dados estruturados

## Boas Práticas JS
- Nunca usar script inline.
- Preferir funções reutilizáveis e eventos (`window.eventBus`).
- Usar `DependencyInjector` e `EventBus` quando possível.
- Imports ES6 de `js/shared/`.

## UI e Layout
- Exclusivamente Bootstrap 5 + variáveis CSS.
- Layout com `TokenCafe-container` e `TokenCafe-content`.
- Sem CSS inline; usar classes Bootstrap ou `TokenCafe-*` em `styles.css`.
- Ícones: `bootstrap-icons` preferencial; `font-awesome` apenas se necessário.

## Fluxo de Desenvolvimento
- Inicialização: `npm run dev`, `python server_flask.py` ou `start.ps1`.
- Remover logs e testes temporários antes da entrega.
- Templates compartilhados em `pages/shared/`.
- Documentar mudanças relevantes no `README.md`.

## Templates e Páginas
- Componentes reutilizáveis em `pages/shared/`.
- Páginas compostas com `data-component`.
- Usar `PageManager` e `SEOManager` para inicialização.
- Hub principal: `pages/tools.html`.

## Segurança e Boas Práticas
- Nunca expor dados sensíveis; usar `.env`.
- JWT e middleware `auth` para autenticação.
- Controle de acesso (`requiresAuth: true`).

## Padrões de Resposta
- Mostrar apenas código novo/modificado em blocos.
- Indicar nome do arquivo antes do código.
- Explicar a mudança em até 3 linhas curtas.
- Sugestões opcionais ao final.

## Padrão de Commit
- Mensagens em português, curtas e claras.
- Exemplos: `feat: adiciona integração com novo módulo`, `fix: corrige erro de conexão de carteira`, `chore: atualiza dependências`.

### Commits e Geração por IA
- Quando solicitado a gerar o commit, a IA deve escrever a mensagem em **português do Brasil**, no modo imperativo e de forma objetiva.
- Evitar termos em inglês nas mensagens de commit; manter escopo curto e claro.
- Formato: `tipo: ação breve` com tipos `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.

## Debug e Testes
- Usar `debug-system.js` e logs estratégicos.
- Listar causas prováveis (5 → 2 principais) antes de corrigir.
- Desativar logs antes de produção.

## Regra de Ouro
**SEMPRE** usar módulos unificados de `js/shared/`. **NUNCA** duplicar código que já exista.

## Resultado Esperado
- Código modular, limpo, padronizado e pronto para deploy.
- Interface consistente com Bootstrap.
- Mensagens e commits em português.
- Respostas objetivas e técnicas.

---
Fonte primária das diretrizes: `agents.json` (agente TokenCafe oficial). O Copilot/IA deve considerar ambos os arquivos sempre.