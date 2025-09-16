# 📊 INVENTÁRIO COMPLETO - ASSETS ÚNICOS DOS REPOSITÓRIOS

## 🎯 **XCAFE - ASSETS ÚNICOS A PRESERVAR**

### **📁 Páginas HTML Principais**
- ✅ `index2.html` → JÁ MIGRADO para `pages/index.html`
- 🔄 `index3.html` → Migrar para `pages/index-alt.html` (funcionalidades avançadas)
- 🔄 `index3_unified.html` → Analisar unificação especial
- 🔄 `compra-token.html` → Migrar para `pages/buy-token.html`
- 🔄 `wallet.html` → Integrar em sistema de carteira unificado

### **📁 Componentes Específicos**
- 🔄 `header.html` → Migrar para `shared/templates/headers/main-header.html`
- 🔄 `footer.html` → Migrar para `shared/templates/footers/main-footer.html`
- 🔄 `add-index.html` → Funcionalidade de adição de índices
- 🔄 `add-rpc.html` → Configuração de RPCs customizadas

### **📁 CSS Únicos**
- 🔄 `styles/globals.css` → Extrair variáveis para `shared/css/variables.css`
- 🔄 `styles/xcafe-paginas.css` → Integrar em `tokencafe.css`

### **📁 JavaScript Únicos**
- 🔄 `js/auth-manager.js` → Base para `shared/js/modules/auth-unified.js`
- 🔄 `js/` (outros módulos) → Análise individual necessária

### **📁 Assets Visuais**
- 🔄 `imgs/` → Migrar para `shared/assets/images/xcafe/`
- 🔄 `chains.json` → Configuração de blockchain

### **📁 Funcionalidades Especiais**
- 🔄 `translations/` → Sistema de tradução
- 🔄 `googletrans.html` → Tradutor Google integrado
- 🔄 `debug-*.html` → Ferramentas de debug
- 🔄 `test-*.html` → Suíte de testes

## 🎯 **WIDGET - ASSETS ÚNICOS A PRESERVAR**

### **📁 Dashboard e Templates**
- ✅ `dashboard.html` → JÁ MIGRADO para `dashboard/main/dashboard.html`
- ✅ `dash-header.html` → Base para templates unificados
- ✅ `dash-footer.html` → Base para templates unificados
- 🔄 `admin-panel.html` → Migrar para `dashboards/admin/admin-panel.html`
- 🔄 `auth.html` → Integrar em sistema de auth unificado

### **📁 CSS Específicos**
- 🔄 `css/styles.css` → Extrair componentes únicos
- ✅ `tokencafe-unified.css` → BASE para CSS atual (já integrado)

### **📁 JavaScript Únicos**
- ✅ `tokencafe-app.js` → BASE para coordenador atual (já integrado)
- 🔄 `js/modules/` → Módulos específicos para migração
- 🔄 `js/shared/template-loader.js` → Sistema de templates
- 🔄 `js/shared/wallet.js` → Funcionalidades de carteira

### **📁 API Backend**
- 🔄 `server.py` → Base para API unificada em Node.js
- 🔄 `api/` → Endpoints existentes para portar
- 🔄 `admin-config.json` → Configurações administrativas

### **📁 Funcionalidades Avançadas**
- 🔄 `setup/` → Scripts de configuração
- 🔄 `contracts/` → Contratos inteligentes
- 🔄 `data/` → Estruturas de dados
- 🔄 `test-*.html` → Testes específicos

## 🚀 **PLANO DE BACKUP E MIGRAÇÃO SEGURA**

### **FASE 1: BACKUP COMPLETO** ✅
```bash
# Criar backup dos repositórios originais
cp -r ../cafe/xcafe ./backups/xcafe-original/
cp -r ../cafe/widget ./backups/widget-original/
```

### **FASE 2: MIGRAÇÃO PROGRESSIVA POR PRIORIDADE**

#### **🔥 ALTA PRIORIDADE (Funcionalidades Core)**
1. **XCafe**: `js/auth-manager.js` → `auth-unified.js`
2. **XCafe**: `styles/globals.css` → variáveis CSS
3. **Widget**: `js/shared/template-loader.js` → sistema templates
4. **Widget**: `server.py` endpoints → API Node.js
5. **XCafe**: `chains.json` → configuração blockchain

#### **⚡ MÉDIA PRIORIDADE (Funcionalidades Específicas)**  
1. **XCafe**: `index3.html` → página alternativa
2. **XCafe**: `compra-token.html` → compra de tokens
3. **Widget**: `admin-panel.html` → painel admin
4. **Widget**: `js/modules/` → módulos específicos
5. **XCafe**: `translations/` → sistema i18n

#### **📋 BAIXA PRIORIDADE (Melhorias)**
1. **XCafe**: `test-*.html` → suíte de testes
2. **XCafe**: `debug-*.html` → ferramentas debug  
3. **Widget**: `test-*.html` → testes widget
4. **Assets visuais** → imagens e ícones
5. **Documentação** → MDs específicos

## 📝 **CHECKLIST DE PRESERVAÇÃO**

### ✅ **FUNCIONALIDADES GARANTIDAS**
- [x] Sistema de autenticação Web3
- [x] Dashboard principal funcional
- [x] CSS unificado com tema café
- [x] Coordenador de módulos
- [x] Templates básicos
- [x] Estrutura de pastas completa

### 🔄 **PRÓXIMAS MIGRAÇÕES (SEM PERDAS)**
- [ ] Autenticação unificada (auth-manager.js)
- [ ] Sistema de templates (template-loader.js)
- [ ] Configurações blockchain (chains.json)
- [ ] Páginas especiais (index3.html, compra-token.html)
- [ ] API backend (server.py → server.js)
- [ ] Sistema de tradução
- [ ] Painel administrativo
- [ ] Suíte de testes

## 🛡️ **GARANTIAS ANTI-PERDAS**
1. **Backup completo** antes de cada migração
2. **Testes funcionais** após cada migração
3. **Rollback imediato** se houver problemas
4. **Validação módulo por módulo**
5. **Documentação de cada mudança**