o que temos no arquivo:

1. Descrição da TokenCafe
2. Estrutura do repositório
3. Roadmap detalhado com módulos, prazos, responsáveis e KPIs
4. Princípios de desenvolvimento
5. Prompt para análise da pasta `projeto/`
6. Próximos passos imediatos
---

# README.md

# TokenCafe 🚀

TokenCafe é uma plataforma completa para gerenciamento de tokens e análise de dados financeiros, desenvolvida com arquitetura modular e tecnologias web modernas.

## ✨ Características

- **Dashboard Interativo**: Análise de dados em tempo real com gráficos dinâmicos
- **Autenticação Segura**: Sistema JWT com middleware de segurança
- **Carteiras Web3**: Integração completa com MetaMask e outras carteiras
- **Interface Responsiva**: Design moderno e adaptável
- **Sistema Modular**: Arquitetura organizada e escalável
- **Templates Dinâmicos**: Sistema avançado de componentes reutilizáveis
- **Logging Centralizado**: Monitoramento completo com Winston

## 🏗️ Arquitetura

O TokenCafe foi completamente reorganizado em uma **arquitetura modular hierárquica**:

```
js/
├── core/           # Núcleo do sistema (logger, event-bus, utilities)
├── middleware/     # Middlewares Express (auth, error-handler)
├── routes/         # Endpoints da API (auth, analytics, users, widgets)
├── systems/        # Sistemas principais (dashboard, templates, wallet)
└── modules/        # Módulos específicos (analytics, profile, settings)
```

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 16+
- NPM ou Yarn

### Instalação

1. **Clone e instale**:
```bash
git clone [repository-url]
cd tokencafe
npm install
```

2. **Configure o ambiente**:
```bash
cp .env.example .env
# Edite .env com suas configurações
```

3. **Inicie o servidor**:
```bash
node js/server_simple.js
```

### Acesso à Aplicação
- **Principal**: http://localhost:3001
- **Dashboard**: http://localhost:3001/dashboard  
- **Health Check**: http://localhost:3001/health
- **API Test**: http://localhost:3001/api/test

## 🛠️ Tecnologias

### Backend
- **Node.js** + **Express.js**: Framework web
- **Winston**: Sistema de logging
- **JWT**: Autenticação segura
- **bcryptjs**: Hash de senhas
- **Express Validator**: Validação de dados

### Frontend
- **JavaScript ES6+**: Programação moderna
- **Template System**: Componentes dinâmicos
- **Event Bus**: Comunicação entre módulos
- **Dependency Injection**: Gerenciamento de dependências

### Segurança
- **Helmet**: Proteção HTTP
- **CORS**: Controle de origem
- **JWT Middleware**: Autenticação de rotas
- **Error Handling**: Tratamento seguro de erros

## 📚 Documentação

- **[Arquitetura do Sistema](./ARCHITECTURE.md)**: Estrutura detalhada e componentes
- **[Guia de Desenvolvimento](./DEVELOPMENT_GUIDE.md)**: Como desenvolver e contribuir
- **[Reorganização Completa](./REORGANIZATION_COMPLETE.md)**: Histórico das mudanças

## 🔧 Desenvolvimento

### Estrutura de Módulos
```javascript
// Exemplo de módulo
class MeuModulo {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
    }

    async initialize() {
        this.logger.info('Módulo inicializado');
        this.eventBus.emit('module:ready', { name: 'MeuModulo' });
    }
}
```

### Sistema de Templates
```javascript
// Registrar componente
templateSystem.registerComponent('meu-componente', {
    template: 'path/to/template.html',
    dependencies: ['jquery'],
    cache: true
});

// Carregar componente
await templateSystem.loadComponent('meu-componente');
```

### API Routes
```javascript
// Rota protegida com validação
router.post('/api/data', [
    auth,
    body('name').notEmpty(),
    body('email').isEmail()
], async (req, res) => {
    // Lógica da rota
});
```

## 🧪 Testes

```bash
# Executar servidor de desenvolvimento
node js/server_simple.js

# Testar endpoints
curl http://localhost:3001/health
curl http://localhost:3001/api/test
```

## 📦 Deploy

### Produção
```bash
# Instalar dependências de produção
npm ci --only=production

# Configurar ambiente
NODE_ENV=production

# Iniciar servidor
NODE_ENV=production node js/server_simple.js
```

## 🤝 Contribuindo

1. **Fork** o projeto
2. **Crie** uma branch: `git checkout -b feature/nova-feature`
3. **Siga** as convenções do [Guia de Desenvolvimento](./DEVELOPMENT_GUIDE.md)
4. **Teste** suas mudanças
5. **Commit**: `git commit -m 'feat: adiciona nova feature'`
6. **Push**: `git push origin feature/nova-feature`
7. **Abra** um Pull Request

### Convenções
- **Arquivos**: kebab-case (`user-profile.js`)
- **Classes**: PascalCase (`UserProfile`)
- **Funções**: camelCase (`getUserProfile`)
- **Constantes**: UPPER_SNAKE_CASE (`API_BASE_URL`)

## 📊 Status do Projeto

- ✅ **Reorganização Modular**: Completa
- ✅ **Sistema de Templates**: Implementado
- ✅ **Integração Testada**: Funcionando
- ✅ **Documentação**: Atualizada
- 🔄 **Testes Automatizados**: Em desenvolvimento
- 🔄 **CI/CD**: Planejado

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Desenvolvido com ❤️ pela equipe TokenCafe**

---

## 🌐 Visão Geral

TokenCafe oferece um ecossistema completo e acessível para a criação e gestão de ativos digitais:

* Criação e gerenciamento de contratos inteligentes e tokens (ERC20/721).
* Integração Web3 com MetaMask, TrustWallet ou outras carteiras compatíveis.
* Dashboard, marketplace e rede social integrada para interação e engajamento.
* Biblioteca de conhecimento e IA assistiva para aprendizado e suporte.
* Sistema modular que permite lançar funcionalidades independentes, mas com máximo aproveitamento de código, estilos e componentes compartilhados.

---

## 🛠️ Estrutura do Repositório

```bash
tokencafe/
├── docs/              # Documentação geral, roadmap, changelog, whitepapers
├── public/            # HTMLs principais
│   ├── index.html     # Página "Em breve"
│   └── pages/         # Páginas oficiais do sistema
├── src/
│   ├── css/           # Estilos modularizados
│   ├── js/            # Funções JS (wallet, widgets, marketplace)
│   ├── components/    # Includes: headers, menus, footers
│   ├── contracts/     # Templates de contratos (ERC20/721/Sale)
│   └── api/           # Backend Node/Flask
├── shared/            # Recursos comuns (variáveis, helpers)
├── projeto/           # Pasta de consulta temporária, será removida
└── README.md          # Este arquivo
```

---

## 🔄 Princípios de Desenvolvimento

* **Separação de responsabilidades**: nada de misturar HTML, JS e CSS.
* **Reutilização máxima**: estilos, funções e componentes compartilhados entre módulos, estamos criando um ecosistema vivo.
* **Includes modulares**: menus, headers, footers e outros carregados dinamicamente.
* **Entrega incremental**: cada módulo lançado individualmente.
* **Contrato Sale único**: centralizar vendas em 1 contrato, com exceções documentadas.
* **Governança mínima inicial**: dois administradores.

---

## 🏗️ Roadmap Modular — Ordem de Implementação

## Roadmap TokenCafe — Desenvolvimento Modular

### Fase 1: Core & Lançamento Inicial (0-3 meses)
- **Página "Em Breve"**: Presença online. Responsável: Dev Team. Status: ✅ Finalizado.
- **Página oficial do site**: Explicações sobre o projeto e login via MetaMask. Responsáveis: Dev Team / Product Lead. Status: Em desenvolvimento.  
- **Acesso via Wallet**: Conexão Web3 e verificação de privilégios (usuário ou administrador). Responsável: Dev Team. Status: ✅ Finalizado.

### Fase 2: Funcionalidades Essenciais (3-6 meses)
- **Widget de Compra e Venda de Tokens**: Integração de compra direta e simplificada. Responsável: Dev Team. Status: Em progresso.  
- **Compartilhamento Rápido**: Criação de links de tokens para inclusão no MetaMask. Responsável: Dev Team. Status: Base pronta.  
- **Vanity Wallets**: Geração em massa de carteiras personalizadas para projetos. Responsável: Dev Team. Status: Base pronta.  
- **Contratos Personalizados**: Padronização e revisão de contratos já existentes. Responsáveis: Dev Team / Tech Lead. Status: Em revisão.

### Fase 3: Crescimento e Automação (6-12 meses)
- **Landing Pages Automáticas**: Criação automática de páginas para novos contratos. Responsáveis: Dev Team / Design. Status: Planejado.  
- **Marketplace de Tokens**: Listagem e gerenciamento de tokens criados na plataforma. Responsáveis: Product Lead / Dev Team. Status: Planejado.  
- **Biblioteca com IA**: Suporte automatizado, guias e recomendações inteligentes. Responsáveis: Dev Team / IA Team. Status: Planejado.

### Fase 4: Expansão e Interoperabilidade (12-24 meses)
- **Multi-Chain Support**: Integração com diversas blockchains para criar e negociar tokens. Responsável: Dev Team. Status: Planejado.  
- **Dashboard Administrativo**: Controle completo de usuários, métricas e módulos da plataforma. Responsáveis: Dev Team / Product Lead. Status: Planejado.  
- **Analytics e Reputação**: Métricas detalhadas de projetos, engajamento e confiabilidade. Responsável: Dev Team. Status: Planejado.

### Fase 5: Consolidação e Recursos Avançados (24+ meses)
- **Contrato Sale Único**: Centralizar vendas de tokens em um único contrato principal. Responsáveis: Dev Team / Legal. Status: Planejado.  
- **SDKs / APIs**: Permitir integrações externas e expansão do ecossistema. Responsável: Dev Team. Status: Planejado.  
- **DAO e Governança**: Descentralizar decisões da plataforma e participação da comunidade. Responsáveis: Product Lead / Community. Status: Planejado.  
- **On/Off-Ramp Fiat**: Entrada e saída de moeda fiduciária para usuários da plataforma. Responsáveis: Dev Team / Product Lead. Status: Futuro.

---

## 💻 Prompt para análise da pasta `projeto/`

🏗️ PROJETOS PRONTOS PARA INTEGRAÇÃO:
📊 Na pasta projetos encontrei:
token-calculadora/ 
apenas para consulta não vai ser integrado diretamente
Status: Pronto para integração
Funcionalidade: Calculadora de tokens, gerador de contratos
Valor: Core business - criação de tokens

MetaConnect/ 🔥
apenas para consulta não vai ser integrado diretamente
Status: Projeto TypeScript/Vite avançado
Funcionalidade: Conexão Web3 robusta
Valor: Infraestrutura crítica

tokenSale/ 🔥
apenas para consulta não vai ser integrado diretamente
Status: Sistema de vendas
Funcionalidade: Contratos de venda de tokens
Valor: Monetização direta

carteira-simulador/ 💡
este vamos integrar ao sistema, é o Vanity Wallets
Status: Para análise
Funcionalidade: Simulador de carteira
Valor: Ferramenta educativa

pix-usdt-backend/ 💡
em analise
Status: Para análise
Funcionalidade: Bridge PIX/USDT
Valor: On/off ramp brasileiro