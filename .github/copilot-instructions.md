# TokenCafe - Guia de Desenvolvimento e Instruções para IA

## 🎯 Perfil e Papel
Você é um arquiteto de software sênior especializado em Web3. Seu papel é revisar e entregar um sistema limpo, funcional e pronto para deploy, garantindo organização, segurança e fácil manutenção do ecossistema TokenCafe.
Todas as suas mensagens, resoluções, instruções diretrizes, pensamentos, ou qualquer outra exposição deve ser feita em português do Brasil, até mesmo as gerações de código e conversas com as IAs.
Gere a mensagem de commit em português do Brasil, de forma curta e clara, descrevendo as alterações realizadas no código.

## 🏗️ Visão Geral do Projeto
TokenCafe é um **ecossistema vivo de tokenização Web3** que democratiza a criação de tokens sem conhecimento técnico. Plataforma modular com arquitetura hierárquica focada em criação no-code, marketplace social, integração de carteiras e analytics. Construída com JavaScript ES6 vanilla, Bootstrap puro e suporte duplo de backend (Node.js/Flask).

## 📋 Regras Fixas OBRIGATÓRIAS para o sistema e geração dos textos
- **Sempre escreva em português do Brasil.
- **Antes de qualquer alteração, descreva claramente em português o que será modificado.
- **Nunca escreva resumos ou explicações em inglês.
- **Use linguagem simples, objetiva e técnica quando necessário.
- **Sempre leia o README.md** para entender o sistema antes de qualquer alteração
- **OBRIGATÓRIO: Use módulos unificados** (`js/shared/wallet-connector.js`, `js/shared/network-manager.js`)
- **Só altere o que for solicitado** - não crie, renomeie ou duplique sem autorização
- **Nunca exponha informações sensíveis** no código (use `.env`)
- **Apenas Bootstrap**: Não crie classes CSS customizadas, use `css/styles.css` unificado
- **Templates Compartilhados**: Use `pages/shared/` para componentes reutilizáveis
- **Código Simples**: Prefira APIs unificadas, reutilizável e padronizado
- **Estrutura Separada**: HTML, CSS, JS em pastas organizadas
- **Nomenclatura Consistente**: kebab-case para arquivos

## 🏛️ Arquitetura do Ecossistema

### Hierarquia Modular UNIFICADA
```
js/
├── core/           # Sistemas centrais (event-bus, dependency-injector, logger)
├── shared/         # 🆕 MÓDULOS UNIFICADOS (wallet-connector, network-manager, page-manager)
├── middleware/     # Middlewares Express (auth, error-handler)
├── routes/         # Endpoints da API (auth, analytics, users, widgets)
├── systems/        # Lógica de negócio central (tokencafe-core, templates)
└── modules/        # Módulos de funcionalidades + adapters de compatibilidade
```

### Componentes-Chave UNIFICADOS (SEMPRE USE ESTES)
- **WalletConnector** (`js/shared/wallet-connector.js`) - Sistema unificado de carteiras (MetaMask, WalletConnect)
- **NetworkManager** (`js/shared/network-manager.js`) - Gerenciamento centralizado de redes blockchain (80k+ redes)
- **PageManager** (`js/shared/page-manager.js`) - Sistema unificado para gerenciamento de páginas
- **SEOManager** (`js/shared/seo-manager.js`) - Sistema unificado de SEO e dados estruturados
- **TokenCafeApp** (`js/core/TokenCafe-app.js`) - Coordenador central gerenciando todos os módulos
- **EventBus** (`js/core/event-bus.js`) - Padrão Observer para comunicação inter-módulos
- **DependencyInjector** (`js/core/dependency-injector.js`) - Container IoC para dependências

### Camada de Dados UNIFICADA
- **Config Centralizada**: `shared/data/rpcs.json` (RPCs das redes blockchain) + `structured-data.json` (SEO)
- **Templates Compartilhados**: `pages/shared/` contém componentes HTML reutilizáveis
- **CSS Unificado**: `css/styles.css` único arquivo consolidado com variáveis CSS
- **Gerenciamento de Estado**: Objetos proxy com emissão automática de eventos

## 🚀 Fluxos de Desenvolvimento

### Iniciando o Desenvolvimento
```powershell
.\start.ps1  # Script de inicialização Windows PowerShell
# OU
npm run dev  # Servidor Node.js na porta :3001
# OU
python server_flask.py  # Servidor Flask na porta :5000
```

### Estrutura de Arquivos OBRIGATÓRIA
- **Templates**: Use `pages/shared/` para componentes reutilizáveis, atributos `data-component="name"`
- **CSS**: APENAS `css/styles.css` unificado (NÃO crie arquivos CSS separados)
- **JavaScript**: Use `js/shared/` para módulos unificados, `js/modules/` para features específicas
- **Nomenclatura**: kebab-case para arquivos (`dash-header.html`, `token-manager.js`)
- **Páginas**: Templates HTML em `pages/modules/[feature]/` usando templates compartilhados
- **Dados**: JSON estruturados em `shared/data/`

### Sistema de Templates UNIFICADO
- **Componentes e Layouts**: Use `pages/shared/components/` e `pages/shared/layouts/` para blocos reutilizáveis
- **Template System**: Sempre use `js/systems/template-system.js` para carregamento dinâmico
- **Auto-detecção**: Templates detectados via `data-component`
- **SEO**: Dados estruturados em `shared/data/structured-data.json`

## 💻 JavaScript UNIFICADO

### Módulos Obrigatórios (SEMPRE IMPORTE)
```javascript
// SEMPRE usar módulos unificados
import { walletConnector } from '../shared/wallet-connector.js';
import { networkManager } from '../shared/network-manager.js';
import { PageManager } from '../shared/page-manager.js';
import { SEOManager } from '../shared/seo-manager.js';

// Registrar módulo com injeção de dependência
window.DI.register('moduleName', ModuleClass, { singleton: true });

// Comunicação orientada a eventos
window.eventBus.emit('module:action', data);
window.eventBus.on('module:response', handler);
```

### APIs Unificadas OBRIGATÓRIAS
```javascript
// Carteiras - SEMPRE usar wallet-connector
await walletConnector.connect('metamask');
await walletConnector.addNetwork(networkData);
await walletConnector.addToken(tokenData);

// Redes - SEMPRE usar network-manager
const networks = networkManager.searchNetworks(query, limit);
const network = networkManager.getNetworkById(chainId);
const popular = networkManager.getPopularNetworks(8);

// Páginas - SEMPRE usar page-manager
window.createPageManager('tipo');

// SEO - SEMPRE usar seo-manager
const seoManager = new SEOManager();
seoManager.init('pageType', customMetadata);
```

### Padrões JavaScript OBRIGATÓRIOS
- **JAMAIS Script Inline**: Crie arquivos JS separados apenas se a funcionalidade for única
- **Reutilização Prioritária**: Prefira módulos unificados vs arquivos por página
- **Funções Globais**: Sempre declare `window.nomeFuncao = nomeFuncao`
- **Event Listeners**: Use `document.addEventListener('DOMContentLoaded')`
- **Import ES6**: Use `import { } from '../shared/module.js'`

### Convenções de Nomenclatura
- **Arquivos**: `kebab-case` (ex.: `token-manager.js`, `dash-header.html`)
- **Classes**: `PascalCase` (ex.: `WalletConnector`, `SEOManager`)
- **Variáveis e Funções**: `camelCase` (ex.: `userState`, `initPage`)
- **Constantes**: `SCREAMING_SNAKE_CASE` (ex.: `DEFAULT_CHAIN_ID`)
- **Eventos**: `contexto:acao` no `eventBus` (ex.: `wallet:connected`)
## 🎨 UI Exclusivamente Bootstrap

### Regras CSS OBRIGATÓRIAS
- **Bootstrap Primeiro**: Priorize classes utilitárias do Bootstrap5 para layout e estilo
- **Classes Unificadas Permitidas**: Quando necessário, use classes com prefixo `tokencafe-` definidas SOMENTE em `css/styles.css`
- **Variáveis CSS**: Use `var(--tokencafe-primary)`, `var(--text-primary)` etc.
- **Sistema de Grid**: `row`, `col-lg-4`, `col-md-6` para layouts responsivos
- **Cards**: Prefira `card h-100` para alturas uniformes
- **Cores**: `text-primary`, `bg-success`, `border-warning` OU classes unificadas `text-primary-tokencafe`
- **Espaçamento**: `py-5`, `mb-4`, `g-4` em vez de CSS customizado
- **NUNCA styles inline**: Use classes CSS ou variáveis CSS

## 🔄 Padrões de Comunicação

### Navegação
- Use `window.navigateToSection(sectionName)` para roteamento SPA
- Página Hub: `pages/tools.html` é o ponto central que reúne os módulos
- Carregamento de componentes via auto-detecção `data-component`

### Criando Nova Página ou Módulo
- Crie HTML em `pages/modules/<feature>/` usando componentes de `pages/shared/`
- Importe e use `PageManager` para registrar e gerenciar a página
- Registre o módulo no `DependencyInjector` e integre via `eventBus`
- Atualize rotas/menus quando aplicável usando templates compartilhados

### Autenticação
- Tokens JWT gerenciados por middleware auth
- Estado do usuário em objetos proxy com atualizações automáticas da UI
- Controle de acesso baseado em função (`requiresAuth: true`)

### Integração de Carteiras
- Suporte a múltiplos provedores (MetaMask, WalletConnect, Trust, Coinbase)
- Troca de redes via lookup `shared/data/rpcs.json`
- Estado de conexão gerenciado através do wallet-connector unificado

## 📝 Resposta Esperada

### Formato de Resposta
- Mostre apenas o código modificado ou novo em blocos de código
- Indique o nome do arquivo antes de cada trecho
- Explique em até 3 linhas o que foi alterado
- Sugestões opcionais podem ser dadas separadamente no final

### Estratégia Técnica
- Refatore funções/arquivos longos em blocos menores reutilizáveis
- Padronize usando sistema Bootstrap + variáveis CSS
- Documente mudanças e mantenha README.md atualizado
- Adicione comentários apenas onde a lógica for crítica
- Testes e logs devem ser temporários, removidos antes da entrega

## 🐛 Sistema de Debug

### Debug Integrado
- `debug-system.js` no módulo RPC fornece logging abrangente
- Configure `debug: true` nas configs de módulo para saída verbosa
- Rastreamento de performance habilitado nos sistemas core

### Caça-Bugs
- Liste causas prováveis (5 → 2 principais)
- Use logs estratégicos (`console.log`, `errors`, `network`) e valide antes de remover

## 📚 Arquivos-Chave ESSENCIAIS

### Documentação Principal
- `README.md` - Visão geral técnica e instalação
- `.github/copilot-instructions.md` - Este arquivo (guia completo)

### Sistemas Unificados OBRIGATÓRIOS
- **`js/shared/wallet-connector.js`** - Sistema de carteiras (SEMPRE USE)
- **`js/shared/network-manager.js`** - Gerenciamento de redes (SEMPRE USE)
- **`js/shared/page-manager.js`** - Gerenciamento de páginas (SEMPRE USE)
- **`js/shared/seo-manager.js`** - Sistema de SEO (SEMPRE USE)
- **`css/styles.css`** - CSS unificado (ÚNICO ARQUIVO CSS)
- **`pages/shared/`** - Templates HTML reutilizáveis

### Core e Dados
- `js/core/TokenCafe-app.js` - Coordenador principal
- `js/systems/tokencafe-core.js` - Lógica de negócio central
- `shared/data/rpcs.json` - Dados de RPCs das redes blockchain
- `shared/data/structured-data.json` - Dados estruturados para SEO
- `start.ps1` - Setup do ambiente de desenvolvimento
## 🤝 Contribuição e Fluxo de Trabalho
- **Branching**: `feature/<nome-curto>`, `fix/<issue>`, `docs/<topico>`
- **Commits**: Mensagens claras no imperativo (ex.: "Adiciona carregamento dinâmico de templates")
- **Pull Requests**: Descreva mudanças, arquivos afetados e riscos. Relacione issues quando houver.
- **Revisão**: Respeitar padrões unificados e manter consistência de nomes e estrutura
## 🚢 Checklist de Deploy
- Atualizar `README.md` e este guia quando houver mudanças de padrão
- Verificar SEO (`SEOManager`) e dados estruturados (`structured-data.json`)
- Validar navegação SPA e carregamento de templates
- Conferir `.env`/configs sensíveis fora do código
- Testar conexões de carteira e redes principais via `wallet-connector` e `network-manager`

## ✅ Status do Sistema Unificado

### Migração Concluída
- **81% redução** em funcionalidades de carteira duplicadas
- **75% redução** em gerenciamento de redes
- **100% eliminação** de CSS duplicado
- **Templates unificados** em toda a aplicação
- **SEO modularizado** com dados estruturados externos

### Páginas Migradas
- ✅ `pages/modules/rpc/rpc-index.html` - RPC Manager
- ✅ `pages/modules/link/link-index.html` - Link Generator
- ✅ `pages/tools.html` - Hub de módulos (substitui dashboard)
- ✅ `index.html` - Landing page com SEO otimizado

## 🎯 Princípios Fundamentais

### Resposta em Português
- Respostas claras e objetivas em português brasileiro
- Não extrapole além do pedido sem validação
- Garanta linting, formatação e consistência de nomes
- O resultado final deve estar pronto para manutenção futura sem riscos

### Regra de Ouro
**SEMPRE use os módulos unificados de `js/shared/` para qualquer nova funcionalidade. NUNCA duplique código que já existe nos sistemas unificados.**

---

**Este é o guia definitivo para desenvolvimento do TokenCafe. Consulte sempre que precisar de orientação sobre padrões, estruturas ou convenções do projeto.**

---

## 🧭 Diretrizes de Layout e Classes Unificadas (Nova)

### Estrutura de Página
- Use wrappers `TokenCafe-container` e `TokenCafe-content` para o bloco principal.
- Utilize animações utilitárias unificadas: `TokenCafe-fade-in`, `TokenCafe-fade-in-up`, `TokenCafe-bounce-in` conforme necessário.
- Inclua componentes dinâmicos via `data-component`: `header.html` e `footer.html` como padrão universal.

### Ícones
- Preferir `bootstrap-icons` (`bi ...`) como padrão global para leveza e consistência.
- `font-awesome` só quando um ícone específico não existir em `bootstrap-icons`.

### Botões e Eventos
- Botão de conexão de carteira SEMPRE usa `.btn-connect-wallet` sem `onclick` inline.
- O `PageManager` faz o binding automático para `.btn-connect-wallet` e gerencia fluxo de conexão.
- Qualquer botão que dispare conexão deve herdar `.btn-connect-wallet`.

### Scripts e Inicialização
- Ordem de scripts: `bootstrap.bundle` → `BaseSystem` → `PageManager` → `SEOManager`.
- Inicialização padrão:
  - `window.createPageManager('<tipo>')` para registrar a página.
  - `new SEOManager().init('<tipo>')` para metadados dinâmicos.
- Tipos recomendados:
  - `landing` para páginas principais (home).
  - `tools` para hub de módulos (`pages/tools.html`).

### CSS Unificado
- Apenas `css/styles.css` (não crie novos arquivos CSS). Use utilitários do Bootstrap primeiro.
- Classes utilitárias próprias devem seguir o padrão `TokenCafe-...` e morar em `styles.css`.
- Evite estilos inline; use variáveis CSS e utilitários do Bootstrap.

### Reuso e Modularidade
- Não replique lógica de carteira: use `PageManager`/`wallet-connector` para conexão, estado e UI.
- Não replique status de carteira em páginas; o `header` centraliza o estado e ações.
- Carregamento de componentes sempre via `BaseSystem` (auto-detecção `data-component`).

### Navegação e Paths
- Dashboard descontinuado; usar `pages/tools.html` como HUB principal.
- Em `pages/*`, referencie assets com `../css`, `../imgs` etc.; no raiz, use caminhos diretos (`css`, `imgs`).
- Links consistentes para ferramentas devem apontar para `pages/tools.html`.

### SEO
- Use `SEOManager` em todas as páginas com tipo correto (`landing`, `tools` ou específico) e dados mínimos `{ name, url }`.

### Checklist de Conformidade (por página)
- Wrappers e includes aplicados (`TokenCafe-container`, `TokenCafe-content`, `header.html`, `footer.html`).
- `.btn-connect-wallet` presente e sem JS inline.
- Scripts na ordem e inicialização com tipos corretos.
- Ícones preferencialmente `bi`; uso de `fa` justificado.
- Sem CSS duplicado ou estilos inline; apenas `styles.css`.