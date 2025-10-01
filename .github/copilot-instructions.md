# TokenCafe - Instruções para Agentes de IA

## Visão Geral do Projeto
TokenCafe é um **ecossistema vivo de tokenização Web3** que democratiza a criação de tokens sem conhecimento técnico. Plataforma modular com arquitetura hierárquica focada em criação no-code, marketplace social, integração de carteiras e analytics. Construída com JavaScript ES6 vanilla, Bootstrap puro e suporte duplo de backend (Node.js/Flask).

## Arquitetura do Ecossistema

### Hierarquia Modular
```
js/
├── core/           # Sistemas centrais (event-bus, dependency-injector, logger)
├── middleware/     # Middlewares Express (auth, error-handler)
├── routes/         # Endpoints da API (auth, analytics, users, widgets)
├── systems/        # Lógica de negócio central (tokencafe-core, dashboard, templates)
└── modules/        # Módulos de funcionalidades (wallet, rpc, analytics, profile)
```

### Componentes-Chave
- **TokenCafeApp** (`js/core/TokenCafe-app.js`) - Coordenador central gerenciando todos os módulos
- **EventBus** (`js/core/event-bus.js`) - Padrão Observer para comunicação inter-módulos
- **DependencyInjector** (`js/core/dependency-injector.js`) - Container IoC para dependências de módulos
- **DashboardCore** (`js/modules/dashboard/dashboard-core.js`) - Navegação SPA e gerenciamento de páginas

### Camada de Dados
- **Config Centralizada**: `shared/data/chains.json` contém 80k+ definições de redes blockchain
- **Mock Data**: `shared/data/mock-data.js` para desenvolvimento/testes
- **Gerenciamento de Estado**: Objetos proxy com emissão automática de eventos nas mudanças

## Fluxos de Desenvolvimento

### Iniciando o Desenvolvimento
```powershell
.\start.ps1  # Script de inicialização Windows PowerShell
# OU
npm run dev  # Servidor Node.js na porta :3001
# OU
python server_flask.py  # Servidor Flask na porta :5000
```

### Regras de Organização de Arquivos
- **Templates**: Use atributos `data-component="name"` para carregamento dinâmico
- **CSS**: Apenas `css/styles.css` unificado (não crie arquivos CSS separados)
- **Nomenclatura**: kebab-case para arquivos (`dash-header.html`, `token-manager.js`)
- **Páginas**: Templates HTML em estrutura `pages/modules/[feature]/`

### UI Exclusivamente Bootstrap
- **Sem Classes CSS Customizadas**: Use APENAS classes utilitárias Bootstrap
- **Sistema de Grid**: `row`, `col-lg-4`, `col-md-6` para layouts responsivos
- **Cards**: Prefira `card h-100` para alturas uniformes
- **Cores**: `text-primary`, `bg-success`, `border-warning`
- **Espaçamento**: `py-5`, `mb-4`, `g-4` em vez de CSS customizado

## Convenções Críticas

### Comunicação Entre Módulos
```javascript
// Registrar módulo com injeção de dependência
window.DI.register('moduleName', ModuleClass, { singleton: true });

// Comunicação orientada a eventos
window.eventBus.emit('module:action', data);
window.eventBus.on('module:response', handler);
```

### Padrão de Navegação
- Use `window.navigateToSection(sectionName)` para roteamento SPA
- Definições de páginas no objeto `DashboardCore.pages`
- Carregamento de componentes via auto-detecção `data-component`

### Fluxo de Autenticação
- Tokens JWT gerenciados por middleware auth
- Estado do usuário em objetos proxy com atualizações automáticas da UI
- Controle de acesso baseado em função nas definições de página (`requiresAuth: true`)

### Integração de Carteiras
- Suporte a múltiplos provedores (MetaMask, WalletConnect, Trust, Coinbase)
- Troca de redes via lookup `shared/data/chains.json`
- Estado de conexão gerenciado através de `wallet/script.js`

## Princípios de Desenvolvimento (DEV.md)

### Regras Fixas
- **Sempre leia o README.md** para entender o sistema
- **Apenas Bootstrap**: Não crie classes CSS customizadas
- **Código Simples**: Prefira reutilizável e padronizado
- **Estrutura Separada**: HTML, CSS, JS em pastas organizadas
- **Nomenclatura Consistente**: kebab-case para arquivos

### Sistema de Templates
- **Header/Footer**: Versões específicas (`header.html` para index, `dash-header.html` para dashboard)
- **Template Loader**: Sempre use `template-loader.js` para carregamento dinâmico
- **Auto-detecção**: Templates detectados automaticamente via `data-component`

### JavaScript
- **Funções Globais**: Sempre declare `window.nomeFuncao = nomeFuncao`
- **Event Listeners**: Use `document.addEventListener('DOMContentLoaded')`
- **Modals**: Bootstrap modals com classes padronizadas
- **Feedback**: Use classes Bootstrap para feedback visual

## Sistema de Debug e Desenvolvimento

### Sistema de Debug Integrado
- `debug-system.js` no módulo RPC fornece logging abrangente
- Configure `debug: true` nas configs de módulo para saída verbosa
- Rastreamento de performance habilitado por padrão nos sistemas core

### Padrões Comuns
- **Registro de Módulos**: Sempre registre com DependencyInjector antes do uso
- **Tratamento de Erros**: Use middleware error-handler centralizado
- **Carregamento Assíncrono**: Lazy loading suportado para performance
- **Cache**: Cache de página com timeout de 5 minutos no DashboardCore

## Pontos de Integração

### APIs Externas
- **Integração ChainList**: Dados de blockchain ao vivo de chainlist.org
- **Provedores Web3**: Pacotes @web3-onboard/* para conexões de carteira
- **Sistema de Templates**: Carregamento dinâmico de componentes com cache

### Dependências Cross-Module
- Todos os módulos dependem do EventBus core para comunicação
- SharedUtilities (`js/core/shared_utilities_es6.js`) fornece funções comuns
- Sistema de Logger centralizado em `js/core/logger.js`

## Roadmap do Ecossistema Vivo

### Funcionalidades Prioritárias
- **Criação No-Code**: Tokens ERC-20/721 sem conhecimento técnico
- **Landing Pages Automáticas**: Geração automática com widget de compra
- **Marketplace Social**: Descoberta e interação com projetos tokenizados
- **IA Assistiva**: Suporte inteligente em todas as etapas
- **Multi-Chain**: Suporte a múltiplas blockchains

### Módulos em Desenvolvimento
- **Vanity Wallets**: Geração em massa de carteiras personalizadas
- **Widget de Compra**: Integração de compra direta e simplificada
- **Compartilhamento Rápido**: Links de tokens para MetaMask
- **TokenCafe Academy**: Conteúdos educativos e IA assistiva

## Arquivos-Chave para Entender
- `DEV.md` - Regras de desenvolvimento e padrões de código
- `README.md` - Visão geral completa e roadmap modular
- `TokenCafe - Ecossistema Vivo.md` - Visão estratégica e modelo de negócios
- `js/core/TokenCafe-app.js` - Coordenador principal da aplicação
- `js/systems/tokencafe-core.js` - Lógica de negócio central
- `shared/data/chains.json` - Definições de redes blockchain (80k+ linhas)
- `start.ps1` - Setup do ambiente de desenvolvimento