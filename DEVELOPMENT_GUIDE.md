# TokenCafe - Guia de Desenvolvimento

## 🚀 Início Rápido

### Pré-requisitos
- Node.js 16+ instalado
- NPM ou Yarn
- Editor de código (VS Code recomendado)

### Instalação
```bash
# Clone o repositório
git clone [repository-url]
cd tokencafe

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
node js/server_simple.js
```

### Primeiro Acesso
Após iniciar o servidor, acesse:
- **Aplicação**: http://localhost:3001
- **Dashboard**: http://localhost:3001/dashboard
- **Health Check**: http://localhost:3001/health

## 📁 Estrutura de Desenvolvimento

### Convenções de Nomenclatura
- **Arquivos**: kebab-case (ex: `user-profile.js`)
- **Classes**: PascalCase (ex: `UserProfile`)
- **Funções**: camelCase (ex: `getUserProfile`)
- **Constantes**: UPPER_SNAKE_CASE (ex: `API_BASE_URL`)

### Organização de Código
```
js/
├── core/           # Funcionalidades centrais (não modificar sem necessidade)
├── middleware/     # Middlewares Express
├── routes/         # Endpoints da API
├── systems/        # Sistemas principais da aplicação
└── modules/        # Módulos específicos de funcionalidade
```

## 🔧 Desenvolvimento de Módulos

### Criando um Novo Módulo

1. **Crie a estrutura básica**:
```javascript
// js/modules/meu-modulo/index.js
class MeuModulo {
    constructor(dependencies = {}) {
        this.logger = dependencies.logger;
        this.eventBus = dependencies.eventBus;
        this.initialized = false;
    }

    async initialize() {
        try {
            this.logger.info('Inicializando MeuModulo');
            // Lógica de inicialização
            this.initialized = true;
            this.eventBus.emit('module:meu-modulo:initialized');
        } catch (error) {
            this.logger.error('Erro ao inicializar MeuModulo', { error });
            throw error;
        }
    }

    // Métodos do módulo
    async minhaFuncionalidade() {
        if (!this.initialized) {
            throw new Error('Módulo não inicializado');
        }
        // Implementação
    }
}

module.exports = MeuModulo;
```

2. **Registre no sistema de dependências**:
```javascript
// js/core/dependency-injector.js
// Adicione na lista de módulos
this.modules.set('meuModulo', {
    path: './modules/meu-modulo',
    dependencies: ['logger', 'eventBus']
});
```

### Criando Rotas da API

```javascript
// js/routes/meu-modulo-routes.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const logger = require('../core/logger');

const router = express.Router();

// GET /api/meu-modulo
router.get('/', auth, async (req, res) => {
    try {
        logger.info('Requisição GET /api/meu-modulo', { userId: req.user?.id });
        
        // Lógica da rota
        const data = await getMeuModuloData();
        
        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        logger.error('Erro em GET /api/meu-modulo', { error, userId: req.user?.id });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

// POST /api/meu-modulo
router.post('/', [
    auth,
    body('nome').notEmpty().withMessage('Nome é obrigatório'),
    body('email').isEmail().withMessage('Email inválido')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        // Lógica da rota
        const result = await createMeuModuloItem(req.body);
        
        res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        logger.error('Erro em POST /api/meu-modulo', { error, body: req.body });
        res.status(500).json({
            success: false,
            message: 'Erro interno do servidor'
        });
    }
});

module.exports = router;
```

### Criando Templates

```javascript
// js/modules/meu-modulo/template.js
class MeuModuloTemplate {
    constructor(templateSystem) {
        this.templateSystem = templateSystem;
    }

    async render(containerId, data = {}) {
        try {
            // Registrar componente se necessário
            await this.templateSystem.registerComponent('meu-componente', {
                template: 'modules/meu-modulo/template.html',
                dependencies: ['jquery'],
                cache: true
            });

            // Carregar e renderizar
            await this.templateSystem.loadComponent('meu-componente', containerId, data);
        } catch (error) {
            console.error('Erro ao renderizar template:', error);
        }
    }
}

module.exports = MeuModuloTemplate;
```

## 🎯 Boas Práticas

### Logging
```javascript
// Use o logger centralizado
const logger = require('../core/logger');

// Diferentes níveis de log
logger.debug('Informação de debug', { data: debugData });
logger.info('Operação realizada com sucesso', { userId: 123 });
logger.warn('Situação que requer atenção', { warning: details });
logger.error('Erro crítico', { error: errorObject, context: additionalInfo });
```

### Tratamento de Erros
```javascript
// Sempre trate erros adequadamente
try {
    const result = await operacaoRiscosa();
    return result;
} catch (error) {
    logger.error('Erro na operação', { error, context: 'funcaoEspecifica' });
    
    // Re-throw se necessário ou retorne erro tratado
    throw new Error('Falha na operação: ' + error.message);
}
```

### Validação de Dados
```javascript
// Use express-validator para validação
const { body, param, query, validationResult } = require('express-validator');

// Validações comuns
body('email').isEmail().normalizeEmail(),
body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
param('id').isMongoId().withMessage('ID inválido'),
query('page').optional().isInt({ min: 1 }).toInt()
```

### Eventos
```javascript
// Use o event bus para comunicação entre módulos
const eventBus = require('../core/event-bus');

// Emitir eventos
eventBus.emit('user:created', { userId: newUser.id, email: newUser.email });

// Escutar eventos
eventBus.on('user:created', (data) => {
    logger.info('Novo usuário criado', data);
    // Lógica adicional
});
```

## 🧪 Testes

### Estrutura de Testes
```javascript
// tests/meu-modulo.test.js
const MeuModulo = require('../js/modules/meu-modulo');
const logger = require('../js/core/logger');
const eventBus = require('../js/core/event-bus');

describe('MeuModulo', () => {
    let meuModulo;

    beforeEach(() => {
        meuModulo = new MeuModulo({ logger, eventBus });
    });

    test('deve inicializar corretamente', async () => {
        await meuModulo.initialize();
        expect(meuModulo.initialized).toBe(true);
    });

    test('deve executar funcionalidade principal', async () => {
        await meuModulo.initialize();
        const result = await meuModulo.minhaFuncionalidade();
        expect(result).toBeDefined();
    });
});
```

## 🔍 Debug

### Logs de Debug
```javascript
// Ative logs de debug definindo NODE_ENV
process.env.NODE_ENV = 'development';

// Use logger.debug para informações detalhadas
logger.debug('Estado do módulo', { 
    initialized: this.initialized,
    dependencies: Object.keys(this.dependencies)
});
```

### Ferramentas Úteis
- **Chrome DevTools**: Para debug frontend
- **Node.js Inspector**: Para debug backend
- **Winston Dashboard**: Para visualizar logs
- **Postman**: Para testar APIs

## 📦 Deploy

### Preparação para Produção
```bash
# Instale apenas dependências de produção
npm ci --only=production

# Configure variáveis de ambiente
cp .env.example .env
# Edite .env com valores de produção

# Inicie em modo produção
NODE_ENV=production node js/server_simple.js
```

### Variáveis de Ambiente
```bash
# .env
NODE_ENV=production
PORT=3001
JWT_SECRET=seu_jwt_secret_super_seguro
LOG_LEVEL=info
```

## 🚨 Troubleshooting

### Problemas Comuns

1. **Módulo não carrega**:
   - Verifique se está registrado no dependency-injector
   - Confirme se as dependências estão corretas
   - Verifique logs de erro

2. **Erro de autenticação**:
   - Verifique se JWT_SECRET está configurado
   - Confirme se o token está sendo enviado corretamente
   - Verifique logs do middleware de auth

3. **Template não renderiza**:
   - Confirme se o arquivo HTML existe
   - Verifique se as dependências estão carregadas
   - Verifique console do browser para erros

### Logs Úteis
```bash
# Ver logs em tempo real
tail -f logs/combined.log

# Ver apenas erros
tail -f logs/error.log

# Filtrar logs por módulo
grep "MeuModulo" logs/combined.log
```

## 📚 Recursos Adicionais

- [Documentação da Arquitetura](./ARCHITECTURE.md)
- [Express.js Documentation](https://expressjs.com/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [JWT.io](https://jwt.io/)
- [Express Validator](https://express-validator.github.io/)

## 🤝 Contribuindo

1. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
2. Siga as convenções de código estabelecidas
3. Adicione testes para novas funcionalidades
4. Atualize a documentação se necessário
5. Faça commit com mensagens descritivas
6. Abra um Pull Request

---

**Dúvidas?** Consulte a documentação ou abra uma issue no repositório.