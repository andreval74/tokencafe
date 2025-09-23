# 🗄️ DATABASE SCHEMA ANALYSIS
## Baseado nos Mock Data para Migração Futura

> **Estratégia:** Desenvolver com mock-data.js → Analisar campos usados → Criar schema otimizado → Migrar

## 📊 TABELAS IDENTIFICADAS

### **1. 👥 TABELA: users**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- bcrypt hash
    role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
    wallet VARCHAR(42) UNIQUE, -- Ethereum address
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    widgets_count INTEGER DEFAULT 0,
    total_volume BIGINT DEFAULT 0, -- em wei ou centavos
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet ON users(wallet);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
```

### **2. 🔐 TABELA: user_permissions**
```sql
-- Separar permissions em tabela própria (normalização)
CREATE TABLE user_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(50) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission)
);

-- Permissions possíveis: 'read', 'write', 'admin', 'analytics', 'users', 'moderate'
```

### **3. 🎛️ TABELA: widgets**
```sql
CREATE TABLE widgets (
    id VARCHAR(50) PRIMARY KEY, -- 'w1', 'w2', etc.
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'price', 'portfolio', 'news'
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    config JSONB, -- Configurações específicas do widget
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_widgets_user_id ON widgets(user_id);
CREATE INDEX idx_widgets_type ON widgets(type);
CREATE INDEX idx_widgets_active ON widgets(is_active);
```

### **4. 📈 TABELA: analytics_data**
```sql
-- Para dados históricos de analytics
CREATE TABLE analytics_snapshots (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL,
    total_users INTEGER,
    active_users INTEGER,
    total_volume BIGINT,
    total_widgets INTEGER,
    growth_rate DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_date ON analytics_snapshots(snapshot_date);
```

### **5. 📊 TABELA: user_growth_history**
```sql
-- Para tracking do crescimento mensal
CREATE TABLE user_growth_history (
    id SERIAL PRIMARY KEY,
    month VARCHAR(10), -- 'Jan', 'Feb', etc.
    year INTEGER,
    user_count INTEGER,
    volume BIGINT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, year)
);
```

## 🔄 PLANO DE MIGRAÇÃO

### **FASE 1: Setup Inicial**
```bash
# Instalar dependências
npm install sequelize pg bcryptjs
npm install --save-dev sequelize-cli

# Configurar banco
npx sequelize-cli init
```

### **FASE 2: Criar Models**
```javascript
// models/User.js
const User = sequelize.define('User', {
    name: DataTypes.STRING,
    email: { type: DataTypes.STRING, unique: true },
    password: DataTypes.STRING,
    role: { 
        type: DataTypes.ENUM('admin', 'user', 'moderator'),
        defaultValue: 'user'
    },
    wallet: { type: DataTypes.STRING(42), unique: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    lastLogin: DataTypes.DATE,
    widgetsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    totalVolume: { type: DataTypes.BIGINT, defaultValue: 0 }
});
```

### **FASE 3: Substituição Sistemática**
```javascript
// ❌ Antes (mock):
const { mockUsers, findUserByEmail } = require('../shared/data/mock-data');
const user = findUserByEmail(email);

// ✅ Depois (database):
const { User } = require('../models');
const user = await User.findOne({ where: { email } });
```

### **FASE 4: Data Seeding**
```javascript
// seeders/demo-users.js - Usar os dados do mock como seed inicial
const mockData = require('../shared/data/mock-data');
await User.bulkCreate(mockData.mockUsers);
```

## 🎯 BENEFÍCIOS DESTA ABORDAGEM

### ✅ **Desenvolvimento Rápido:**
- Sem setup complexo inicial
- Foco nas funcionalidades
- Testes imediatos

### ✅ **Schema Otimizado:**
- Campos realmente necessários
- Relacionamentos testados
- Tipos de dados corretos

### ✅ **Migração Segura:**
- Dados de teste prontos
- Estrutura validada
- Rollback possível

## 📝 TODO PARA MIGRAÇÃO

- [ ] Continuar desenvolvendo com mock
- [ ] Identificar novos campos necessários
- [ ] Testar todas as queries
- [ ] Configurar PostgreSQL
- [ ] Criar migrations
- [ ] Implementar models
- [ ] Substituir mock por database
- [ ] Migrar dados existentes
- [ ] Testes de performance

## 💡 OBSERVAÇÕES

1. **Permissions como JSON vs Tabela:** Analisar se vale separar ou manter como JSONB
2. **Volume em BIGINT:** Para suportar valores grandes de crypto
3. **Widget Config como JSONB:** Flexibilidade para diferentes tipos
4. **Índices otimizados:** Baseados nas consultas mais frequentes

Esta análise será atualizada conforme o sistema evolui!