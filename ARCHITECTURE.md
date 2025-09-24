# TokenCafe - Arquitetura do Sistema

## 📋 Visão Geral

O TokenCafe foi completamente reorganizado em uma arquitetura modular e hierárquica, seguindo as melhores práticas de desenvolvimento JavaScript. Esta documentação descreve a nova estrutura e como trabalhar com ela.

## 🏗️ Estrutura de Diretórios

```
js/
├── core/                    # Núcleo do sistema
│   ├── TokenCafe-app.js    # Coordenador principal
│   ├── dependency-injector.js # Injeção de dependências
│   ├── event-bus.js        # Sistema de eventos
│   ├── logger.js           # Sistema de logging
│   └── shared-utilities.js # Utilitários compartilhados
├── middleware/             # Middlewares
│   ├── auth.js            # Autenticação
│   └── error-handler.js   # Tratamento de erros
├── routes/                # Rotas da API
│   ├── analytics-routes.js # Rotas de analytics
│   ├── auth-routes.js     # Rotas de autenticação
│   ├── users.js           # Rotas de usuários
│   └── widgets.js         # Rotas de widgets
├── systems/               # Sistemas principais
│   ├── analytics-core.js  # Core de analytics
│   ├── dashboard-core.js  # Core do dashboard
│   ├── template-system.js # Sistema de templates
│   ├── tokencafe-core.js  # Core principal
│   ├── wallet.js          # Sistema de carteira
│   └── widget-system.js   # Sistema de widgets
└── modules/               # Módulos específicos
    ├── analytics/         # Módulo de analytics
    ├── profile/           # Módulo de perfil
    ├── settings/          # Módulo de configurações
    ├── support/           # Módulo de suporte
    ├── templates/         # Templates modulares
    └── tokens/            # Módulo de tokens
```

## 🔧 Componentes Principais

### Core (js/core/)
- **TokenCafe-app.js**: Coordenador principal que inicializa todos os sistemas
- **dependency-injector.js**: Gerencia dependências entre módulos
- **event-bus.js**: Sistema centralizado de comunicação por eventos
- **logger.js**: Sistema unificado de logging com Winston
- **shared-utilities.js**: Utilitários compartilhados (DOM, merge, debug)

### Middleware (js/middleware/)
- **auth.js**: Middleware de autenticação JWT
- **error-handler.js**: Middleware global de tratamento de erros

### Routes (js/routes/)
- **analytics-routes.js**: API endpoints para dados de analytics
- **auth-routes.js**: API endpoints para autenticação
- **users.js**: API endpoints para gerenciamento de usuários
- **widgets.js**: API endpoints para widgets

### Systems (js/systems/)
- **template-system.js**: Sistema avançado de templates com componentes
- **dashboard-core.js**: Gerenciamento do dashboard
- **analytics-core.js**: Processamento de dados de analytics
- **wallet.js**: Integração com carteiras Web3
- **widget-system.js**: Gerenciamento de widgets dinâmicos

## 🚀 Como Usar

### Inicialização
```javascript
// O sistema é inicializado automaticamente via TokenCafe-app.js
// Todos os módulos são carregados via dependency injection
```

### Sistema de Templates
```javascript
// Registrar um novo componente
templateSystem.registerComponent('meu-componente', {
    template: 'path/to/template.html',
    dependencies: ['jquery', 'bootstrap'],
    cache: true
});

// Carregar componente
await templateSystem.loadComponent('meu-componente');
```

### Sistema de Eventos
```javascript
// Emitir evento
eventBus.emit('user:login', { userId: 123 });

// Escutar evento
eventBus.on('user:login', (data) => {
    console.log('Usuário logado:', data.userId);
});
```

### Logging
```javascript
const logger = require('./core/logger');

logger.info('Informação importante');
logger.error('Erro crítico', { error: err });
logger.debug('Debug info', { data: debugData });
```

## 📦 Dependências

### Principais
- **express**: Framework web
- **winston**: Sistema de logging
- **jsonwebtoken**: Autenticação JWT
- **bcryptjs**: Hash de senhas
- **express-validator**: Validação de dados

### Desenvolvimento
- **cors**: CORS middleware
- **helmet**: Segurança HTTP
- **morgan**: Logging HTTP

## 🔒 Segurança

- Autenticação JWT implementada
- Middleware de segurança (helmet)
- Validação de entrada de dados
- Hash seguro de senhas (bcrypt)
- Tratamento seguro de erros (sem exposição em produção)

## 🧪 Testes

O servidor pode ser testado executando:
```bash
node js/server_simple.js
```

Endpoints disponíveis:
- `http://localhost:3001` - Página principal
- `http://localhost:3001/dashboard` - Dashboard
- `http://localhost:3001/health` - Health check
- `http://localhost:3001/api/test` - API de teste

## 📈 Performance

- Sistema de cache para templates
- Carregamento dinâmico de módulos
- Injeção de dependências otimizada
- Logging estruturado para monitoramento

## 🔄 Fluxo de Dados

1. **Inicialização**: TokenCafe-app.js coordena a inicialização
2. **Carregamento**: tokencafe-loader.js carrega módulos conforme necessário
3. **Comunicação**: event-bus.js facilita comunicação entre módulos
4. **Templates**: template-system.js gerencia componentes UI
5. **Dados**: Rotas processam requisições e retornam dados
6. **Logging**: Todas as operações são logadas via logger.js

## 🛠️ Desenvolvimento

Para adicionar novos módulos:
1. Crie o arquivo na pasta apropriada (modules/, systems/, routes/)
2. Registre dependências no dependency-injector.js
3. Adicione eventos necessários via event-bus.js
4. Implemente logging adequado
5. Teste a integração

## 📚 Próximos Passos

- Implementar testes automatizados
- Adicionar documentação de API
- Configurar CI/CD
- Implementar monitoramento avançado