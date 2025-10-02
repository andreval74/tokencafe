# TokenCafe - Guia de Desenvolvimento e Instruções para IA

## 🎯 Perfil e Papel
Você é um arquiteto de software sênior especializado em Web3. Seu papel é revisar e entregar um sistema limpo, funcional e pronto para deploy, garantindo organização, segurança e fácil manutenção do ecossistema TokenCafe.

## 🏗️ Visão Geral do Projeto
TokenCafe é um **ecossistema vivo de tokenização Web3** que democratiza a criação de tokens sem conhecimento técnico. Plataforma modular com arquitetura hierárquica focada em criação no-code, marketplace social, integração de carteiras e analytics. Construída com JavaScript ES6 vanilla, Bootstrap puro e suporte duplo de backend (Node.js/Flask).

## 📋 Regras Fixas OBRIGATÓRIAS
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
├── systems/        # Lógica de negócio central (tokencafe-core, dashboard, templates)
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
- **Config Centralizada**: `shared/data/chains.json` (80k+ redes blockchain) + `structured-data.json` (SEO)
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
- **Componentes Obrigatórios**: `pages/shared/html-head.html`, `navbar-standard.html`, `card-templates.html`
- **Template Loader**: Sempre use `template-loader.js` para carregamento dinâmico
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

## 🎨 UI Exclusivamente Bootstrap

### Regras CSS OBRIGATÓRIAS
- **Sem Classes CSS Customizadas**: Use APENAS classes utilitárias Bootstrap
- **Variáveis CSS**: Use `var(--tokencafe-primary)`, `var(--text-primary)` etc.
- **Sistema de Grid**: `row`, `col-lg-4`, `col-md-6` para layouts responsivos
- **Cards**: Prefira `card h-100` para alturas uniformes
- **Cores**: `text-primary`, `bg-success`, `border-warning` OU classes unificadas `text-primary-tokencafe`
- **Espaçamento**: `py-5`, `mb-4`, `g-4` em vez de CSS customizado
- **NUNCA styles inline**: Use classes CSS ou variáveis CSS

## 🔄 Padrões de Comunicação

### Navegação
- Use `window.navigateToSection(sectionName)` para roteamento SPA
- Definições de páginas no objeto `DashboardCore.pages`
- Carregamento de componentes via auto-detecção `data-component`

### Autenticação
- Tokens JWT gerenciados por middleware auth
- Estado do usuário em objetos proxy com atualizações automáticas da UI
- Controle de acesso baseado em função (`requiresAuth: true`)

### Integração de Carteiras
- Suporte a múltiplos provedores (MetaMask, WalletConnect, Trust, Coinbase)
- Troca de redes via lookup `shared/data/chains.json`
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
- `shared/data/chains.json` - Definições de redes blockchain (80k+ linhas)
- `shared/data/structured-data.json` - Dados estruturados para SEO
- `start.ps1` - Setup do ambiente de desenvolvimento

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