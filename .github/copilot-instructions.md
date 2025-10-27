# TokenCafe — Diretrizes completas para IA/Copilot (pt‑BR)

Este documento é a referência única de padronização para geração de código, documentação e mensagens de commit por IA/Copilot no TokenCafe. Deve estar sempre alinhado ao `readme.md` na raiz e evitar revisões futuras por redundância ou ambiguidade.

## Objetivo
- Padronizar arquitetura, estilo de código, estrutura de pastas e práticas.
- Garantir compatibilidade entre módulos e evitar duplicação de lógica.
- Alinhar respostas e commits da IA ao idioma e formato exigidos.

## Princípios Essenciais
- Escrever e responder exclusivamente em pt‑BR; evitar termos em inglês.
- Descrever a mudança antes do código e mostrar apenas trechos novos/modificados.
- Usar módulos unificados em `js/shared/` como fonte única de verdade.
- Não duplicar arquivos nem código; preferir composição e reutilização.
- Proibido scripts inline e CSS fora de `css/styles.css`.

## Convenções de Nomenclatura
- Arquivos: `kebab-case` (ex.: `wallet-connector.js`).
- Funções/variáveis: `camelCase` (ex.: `connectWallet`).
- Classes: `PascalCase` (ex.: `WalletConnector`).
- Namespaces globais: `window.TokenCafe.*` e objetos explícitos (evitar poluir `window`).

## Arquitetura e Stack
- Frontend: JavaScript ES6 vanilla + Bootstrap 5.
- Backend: Node.js e Flask (suporte duplo conforme necessidade).
- CSS: arquivo único `css/styles.css` com variáveis e utilitários.
- Ícones: preferir `bootstrap-icons`; usar `font-awesome` apenas quando necessário.

## Estrutura de Pastas (fonte única)
```
js/
  core/
  shared/        → módulos unificados (wallet-connector, network-manager, page-manager, seo-manager)
  middleware/
  routes/
  systems/
  modules/
pages/
  shared/        → components, layouts, data-component templates
css/             → styles.css, utility-classes.css
shared/data/     → rpcs.json, tokens.json, structured-data.json
```

## Módulos-Chave e Responsabilidades
- `js/shared/wallet-connector.js`: integração com carteiras (MetaMask, Trust, WalletConnect, Coinbase). Emite eventos `wallet:*` (connected, disconnected, accountChanged, chainChanged). Mantém cache e reconexão.
- `js/shared/network-manager.js`: gestão de redes blockchain, busca e validação, integração com `shared/data/rpcs.json`.
- `js/shared/page-manager.js`: inicialização de páginas, navegação, verificação de MetaMask, utilidades comuns.
- `js/shared/seo-manager.js`: SEO e dados estruturados.
- `js/modules/wallet/script.js`: camada de UI/estado da carteira; expõe conveniências via `window.TokenCafeWallet` e `window.walletManager`. Deve ser a única a vincular botões e atualizar UI.

## Compatibilidade e Legado (wallet)
- Eventos antigos (`walletConnected`, `walletDisconnected`, `chainChanged`) só via adaptadores. Preferir consumir `wallet:*` diretamente.
- Evitar múltiplas definições de `window.connectWallet`. Se existir, respeitar a existente e usar `TokenCafe.connectWalletAndRedirect` como utilitário.
- Gradualmente unificar em `wallet-connector` + `script.js`; evitar novos arquivos com lógica duplicada.

## Boas Práticas JS
- ES6 Modules, imports a partir de `js/shared/`.
- Usar `EventBus` (`js/core/event-bus.js`) para orquestração de eventos; evitar listeners duplicados.
- Usar `DependencyInjector` (`js/core/dependency-injector.js`) para serviços e utilitários.
- Evitar side-effects globais; preferir funções puras e classes com estado controlado.

## UI, Layout e Templates
- Bootstrap 5 + variáveis CSS; componentes e layouts em `pages/shared/`.
- Páginas montadas com `data-component` e inicializadas via `PageManager`.
- Sem CSS inline; customizações no `styles.css`.

## Dados Compartilhados
- `shared/data/rpcs.json`: catálogo de redes (ChainId, RPCs, explorers, moeda nativa).
- `shared/data/tokens.json`: tokens suportados.
- `shared/data/structured-data.json`: dados estruturados para SEO.
- Não duplicar dados; sempre consumir destes arquivos.

## Fluxo de Desenvolvimento (alinhado ao README)
- Servidor Flask: `python server_flask.py`.
- Dev server simples: `python -m http.server <porta>`.
- Testes: `npm test`.
- Build: `npm run build`.
- Lint: `npm run lint`.

## Segurança
- Nunca expor dados sensíveis; usar `.env`.
- Autenticação com JWT e middleware `auth`.
- Controle de acesso por rota/configuração (`requiresAuth: true`).

## Padrões de Resposta da IA
- Indicar arquivo e contexto antes do bloco de código.
- Mostrar somente o trecho novo/modificado.
- Explicar a mudança em até 3 linhas objetivas.
- Acrescentar sugestões opcionais somente se agregarem valor.

## Commits e Geração por IA
- Mensagens em português (pt‑BR), no modo imperativo, curtas e claras.
- Formato: `tipo: ação breve`, tipos aceitos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`.
- Exemplos: `feat: adiciona integração com novo módulo`, `fix: corrige erro de conexão de carteira`, `chore: atualiza dependências`.

## Debug e Testes
- Usar `debug-system.js` e logs estratégicos durante desenvolvimento.
- Listar causas prováveis (5) e priorizar as 2 principais antes de corrigir.
- Desativar logs e testes temporários antes de produção.

## Diretrizes de Dependências
- Preferir versões estáveis; evitar dependências não utilizadas.
- Não injetar scripts externos manualmente nas páginas; usar módulos e importações.
- Respeitar `package.json` e manter consistência com `lock`.

## Checklist de Entrega (evitar retrabalho)
- [ ] Mudanças descritas antes do código, em pt‑BR.
- [ ] Apenas trechos modificados exibidos.
- [ ] Sem duplicações de arquivos/lógica; uso de `js/shared/`.
- [ ] Sem scripts inline ou CSS fora de `styles.css`.
- [ ] UI inicializada via `PageManager`; componentes em `pages/shared/`.
- [ ] Dados consumidos de `shared/data/*`.
- [ ] Commits no formato padronizado.
- [ ] README atualizado quando necessário.

## Regra de Ouro
Usar módulos unificados de `js/shared/` e evitar qualquer duplicação de código ou responsabilidades. Sempre preferir composição e reutilização.

## Alinhamento com README.md
- ES6 Modules, variáveis CSS e Bootstrap são obrigatórios.
- Sem estilos inline; usar classes e variáveis em `styles.css`.
- Comandos de desenvolvimento e testes iguais aos listados em README.

---
Fonte primária das diretrizes: `agents.json` (agente TokenCafe oficial). O Copilot/IA deve considerar este arquivo e o `README.md` sempre.
## Padrão de Botões (Bootstrap 5) — TokenCafe

Para garantir consistência visual e facilitar manutenção, adote SEMPRE as variantes padrão do Bootstrap 5 para botões de ação, com os seguintes mapeamentos e estilos globais:

- Ação principal (submit, conectar, executar): usar `btn btn-primary`.
  - No TokenCafe, `btn-primary` é estilizado com degradê laranja.
- Ação secundária (alternativas não destrutivas): usar `btn btn-secondary` ou `btn btn-outline-secondary` conforme contexto.
- Ação de limpeza/cancelamento em páginas de testes: usar `btn btn-dark` (cinza escuro padronizado).
- Ações destrutivas (remover/excluir): usar `btn btn-danger`.
- Links suaves e auxiliares: usar `btn btn-outline-light` ou `btn btn-link`.

Diretrizes de uso:
- Não utilizar classes customizadas para variantes (ex.: evitar `btn-tokencafe` em novos códigos). Preferir `btn-primary` e demais variantes padrão.
- Em páginas de testes, manter apenas dois botões: "Executar Testes" (`btn-primary`) e "Limpar Resultados" (`btn-dark`).
- Exibir indicador de carregamento (spinner) durante processamento de requisições longas.

Exemplos:
```html
<!-- Principal -->
<button class="btn btn-primary">Executar Testes</button>

<!-- Limpar -->
<button class="btn btn-dark">Limpar Resultados</button>

<!-- Secundário -->
<button class="btn btn-outline-secondary">Opção</button>
```

Aplicar este padrão em todo o site, especialmente em formulários e páginas de testes.

## Padrão de RPC e Widgets (Reutilizável)

Para manter consistência e evitar reimplementações, widgets devem seguir o padrão de exibição e sincronização de RPC:
- Usar `input#rpcUrl` como campo oculto para valor de RPC.
- Exibir RPC clicável com `a#rpcUrlText` contendo `span#rpcUrlCode` para o texto da URL.
- Sincronizar automaticamente via função do módulo (`applyRpcFromSystem`), consumindo `walletConnector.getStatus()` e `networkManager.getNetworkById(chainId)`.
- Atualizar `rpcUrl`, `rpcUrlCode`, `rpcUrlText` em `init`, `wallet:connected` e `wallet:chainChanged`.
- Reaproveitar marcação do módulo Link (`link-index.html`) quando aplicável.
- Proibido scripts inline; inicializar via `PageManager`.

Exemplo de uso (JS módulo do widget):
```js
function applyRpcFromSystem() {
  const status = window.walletConnector?.getStatus?.();
  const rpcUrl = status?.network?.rpc?.[0]
    || (status?.chainId ? window.networkManager?.getNetworkById(parseInt(status.chainId, 16))?.rpc?.[0] : '')
    || (window.networkManager?.getPopularNetworks?.(1)?.[0]?.rpc?.[0])
    || 'https://bsc-testnet.publicnode.com';
  document.getElementById('rpcUrl')?.setAttribute('value', rpcUrl);
  document.getElementById('rpcUrlCode')?.replaceChildren(document.createTextNode(rpcUrl));
  const a = document.getElementById('rpcUrlText'); if (a) a.href = rpcUrl;
}
```

### Paleta TokenCafe aplicada às variantes (detalhes)

- `btn-primary`: gradiente laranja baseado em `--tokencafe-primary`; hover/focus levemente mais escuro.
- `btn-dark`: cinza escuro padronizado (`#2b2b2b` → `#222` em hover/focus`) para limpar/cancelar em páginas de testes.
- `btn-secondary`: cinza clássico para ações secundárias não destrutivas.
- `btn-success`: verde (`--tokencafe-success`) com hover mais escuro para confirmar operações.
- `btn-danger`: vermelho (`--tokencafe-danger`) com hover mais escuro para ações destrutivas.
- `btn-warning`: amarelo/laranja (`--tokencafe-warning`), texto escuro para alto contraste.
- `btn-info`: azul (`--tokencafe-info`), hover/focus levemente escurecido.

Observações:
- Evitar classes customizadas em variantes de botão; usar sempre as variantes Bootstrap 5 acima.
- Em páginas de testes, ao acionar “Limpar Resultados”, realizar `walletConnector.disconnect()` quando disponível.

## Componente de Busca de Rede Blockchain (Unificado)

Padrão único para busca de redes em todas as páginas (RPC, Link, Wallet, Widgets), evitando duplicação de markup e lógica.

- Arquivo de componente: `pages/shared/components/network-search.html`.
- Script unificado: `js/shared/network-search.js` (usa `js/shared/network-manager.js`).
- Inserção via `data-component` no HTML:

```html
<div data-component="shared/components/network-search.html"
     data-ns-placeholder="Digite o nome da rede ou Chain ID (ex: Ethereum, Polygon, 1, 137)"
     data-ns-min-chars="2"
     data-ns-show-popular="true"></div>
```

Diretrizes:
- Sem scripts inline; inicializar via `base-system.js`.
- IDs internos padronizados: `#networkSearch` (input) e `#networkAutocomplete` (lista).
- Comentários claros em PT‑BR no componente e script.
- Emissão de eventos: `network:search`, `network:selected`, `network:clear`.
- Debounce padrão (250 ms) e fallback para redes populares via `NetworkManager.getPopularNetworks`.
- Reutilizar estilos existentes (`.network-autocomplete`), sem CSS duplicado.

Testes e validação:
- Validar na página `pages/modules/rpc/rpc-index.html` com o servidor local.
- Digitar “Ethereum”, “137” ou “Polygon” para verificar autocomplete e seleção.
- Garantir que a integração com módulos existentes consuma os eventos corretamente.