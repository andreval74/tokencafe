# 🚀 **COMANDOS PARA CRIAR O TOKENCAFE**

## 📋 **COMANDOS PARA EXECUÇÃO IMEDIATA**

### **1. Criar Repositório GitHub**
```bash
# Navegar para o diretório tokencafe
cd C:\Users\User\Desktop\cafe\tokencafe

# Criar repositório no GitHub (execute no navegador ou GitHub CLI)
# https://github.com/new
# Nome: tokencafe
# Descrição: Ecossistema unificado de widgets de token - Inspirado na cultura cafeeira brasileira
# Público: Sim
```

### **2. Configurar Repositório Local**
```bash
# Inicializar Git (se ainda não foi feito)
git init

# Configurar remote
git remote add origin https://github.com/andreval74/tokencafe.git

# Configurar branch principal
git branch -M main
```

### **3. Criar Estrutura de Pastas**
```bash
# Criar estrutura completa
mkdir shared
mkdir shared\css
mkdir shared\js
mkdir shared\js\core
mkdir shared\js\modules
mkdir shared\js\components
mkdir shared\js\utils
mkdir shared\templates
mkdir shared\templates\headers
mkdir shared\templates\footers
mkdir shared\templates\modals
mkdir shared\assets
mkdir shared\assets\images
mkdir shared\assets\icons
mkdir shared\assets\fonts

mkdir pages
mkdir dashboards
mkdir dashboards\main
mkdir dashboards\widgets
mkdir dashboards\admin
mkdir dashboards\analytics

mkdir api
mkdir api\routes
mkdir api\models
mkdir api\middleware
mkdir api\config

mkdir docs
mkdir setup
mkdir tests
mkdir tests\unit
mkdir tests\integration
mkdir tests\e2e
```

### **4. Copiar Arquivos Criados**
```bash
# Copiar arquivos da sessão atual
copy TOKENCAFE_README.md README.md
copy TOKENCAFE_ROTEIRO.md docs\ROTEIRO.md
copy TOKENCAFE_STRUCTURE.md docs\STRUCTURE.md
copy TOKENCAFE_EXECUTIVO.md docs\EXECUTIVO.md
copy tokencafe-unified.css shared\css\tokencafe.css
copy tokencafe-app.js shared\js\core\tokencafe-app.js
```

### **5. Migrar Arquivos dos Sistemas Originais**
```bash
# Copiar do XCafe
copy ..\xcafe\index2.html pages\index.html
copy ..\xcafe\index3.html pages\index-alt.html

# Copiar do Widget
copy dashboard.html dashboards\main\dashboard.html
copy dash-header.html shared\templates\headers\dash-header.html
copy dash-footer.html shared\templates\footers\dash-footer.html
```

### **6. Criar Arquivos de Configuração**
```bash
# Criar .gitignore
echo node_modules/ > .gitignore
echo .env >> .gitignore
echo dist/ >> .gitignore
echo *.log >> .gitignore
echo .DS_Store >> .gitignore

# Criar .env.example
echo # TokenCafe Environment Variables > .env.example
echo NODE_ENV=development >> .env.example
echo PORT=3000 >> .env.example
echo API_URL=http://localhost:3000/api >> .env.example
echo BLOCKCHAIN_RPC_URL=your_rpc_url_here >> .env.example
```

### **7. Criar package.json**
```json
{
  "name": "tokencafe",
  "version": "1.0.0",
  "description": "Ecossistema unificado de widgets de token - Inspirado na cultura cafeeira brasileira",
  "main": "api/server.js",
  "scripts": {
    "dev": "node api/server.js",
    "build": "webpack --mode production",
    "test": "jest",
    "start": "node api/server.js",
    "lint": "eslint .",
    "docs": "jsdoc -c jsdoc.conf.json"
  },
  "keywords": [
    "tokencafe",
    "blockchain",
    "widgets",
    "tokens",
    "web3",
    "cafe",
    "brasil"
  ],
  "author": "TokenCafe Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "bootstrap": "^5.3.0",
    "web3": "^4.0.0"
  },
  "devDependencies": {
    "webpack": "^5.88.0",
    "jest": "^29.6.0",
    "eslint": "^8.45.0"
  }
}
```

### **8. Primeiro Commit**
```bash
# Adicionar todos os arquivos
git add .

# Commit inicial
git commit -m "🚀 Initial commit - TokenCafe ecosystem

✅ Unified architecture created
✅ Coffee theme implemented  
✅ Bootstrap 5 + CSS unified
✅ Main coordinator implemented
✅ Complete documentation
✅ Project structure defined

Based on XCafe + Widget systems
Inspired by Brazilian coffee culture ☕"

# Push para GitHub
git push -u origin main
```

## 🎯 **VERIFICAÇÃO DO SETUP**

### **Estrutura Esperada**
```
tokencafe/
├── 📚 docs/
│   ├── README.md
│   ├── ROTEIRO.md
│   ├── STRUCTURE.md
│   └── EXECUTIVO.md
├── 🎨 shared/
│   ├── css/
│   │   └── tokencafe.css
│   ├── js/
│   │   └── core/
│   │       └── tokencafe-app.js
│   └── templates/
├── 🏠 pages/
│   ├── index.html
│   └── index-alt.html
├── 📊 dashboards/
│   └── main/
│       └── dashboard.html
├── .gitignore
├── .env.example
├── package.json
└── README.md
```

### **Comandos de Teste**
```bash
# Verificar estrutura
dir /s

# Verificar Git
git status
git log --oneline

# Verificar arquivos principais
type README.md
type shared\css\tokencafe.css
type shared\js\core\tokencafe-app.js
```

## 🔧 **CONFIGURAÇÃO DO VSCODE**

### **Abrir no VSCode**
```bash
# Abrir projeto no VSCode
code .
```

### **Extensões Recomendadas**
- **Live Server**: Para desenvolvimento local
- **Prettier**: Formatação de código
- **ESLint**: Linting JavaScript
- **Bootstrap IntelliSense**: Autocomplete Bootstrap
- **GitLens**: Git integrado

### **Configurações do Workspace**
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "emmet.includeLanguages": {
    "javascript": "javascriptreact"
  },
  "files.associations": {
    "*.css": "css"
  }
}
```

## 🌐 **CONFIGURAÇÃO DO SERVIDOR LOCAL**

### **Servidor Simples (Python)**
```bash
# Navegar para o diretório
cd pages

# Iniciar servidor Python
python -m http.server 8000

# Acessar: http://localhost:8000
```

### **Servidor Node.js (Futuro)**
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev

# Acessar: http://localhost:3000
```

## 📋 **CHECKLIST FINAL**

### **Antes de Executar**
- [ ] ✅ Repositório GitHub criado
- [ ] ✅ Diretório tokencafe existe
- [ ] ✅ Git configurado
- [ ] ✅ VSCode instalado

### **Após Execução**
- [ ] 🔄 Estrutura de pastas criada
- [ ] 🔄 Arquivos copiados
- [ ] 🔄 Git inicializado
- [ ] 🔄 Primeiro commit feito
- [ ] 🔄 Push para GitHub realizado
- [ ] 🔄 VSCode configurado
- [ ] 🔄 Servidor local testado

## 🎉 **RESULTADO ESPERADO**

Após executar todos os comandos, você terá:

✅ **Repositório GitHub** tokencafe criado e configurado  
✅ **Estrutura completa** de pastas organizadas  
✅ **Arquivos migrados** dos sistemas XCafe e Widget  
✅ **CSS unificado** com tema café implementado  
✅ **Coordenador principal** JavaScript funcional  
✅ **Documentação completa** para manutenção  
✅ **VSCode configurado** para desenvolvimento  
✅ **Servidor local** funcionando  

## 🚀 **PRÓXIMOS PASSOS**

1. **Executar comandos** desta lista
2. **Testar funcionamento** básico
3. **Configurar webhooks** para deploy automático
4. **Implementar módulos** restantes
5. **Criar dashboards** completos
6. **Deploy em produção** (tokencafe.app)

---

## ☕ **COMANDO ÚNICO PARA WINDOWS**

```batch
@echo off
echo ☕ Criando TokenCafe - Ecossistema Unificado...
cd C:\Users\User\Desktop\cafe\tokencafe
git init
git remote add origin https://github.com/andreval74/tokencafe.git
git branch -M main

mkdir shared\css shared\js\core shared\js\modules shared\templates\headers shared\templates\footers pages dashboards\main api docs setup

copy ..\widget\TOKENCAFE_README.md README.md
copy ..\widget\tokencafe-unified.css shared\css\tokencafe.css
copy ..\widget\tokencafe-app.js shared\js\core\tokencafe-app.js
copy ..\xcafe\index2.html pages\index.html
copy ..\widget\dashboard.html dashboards\main\dashboard.html

echo node_modules/ > .gitignore
echo .env >> .gitignore

git add .
git commit -m "🚀 Initial commit - TokenCafe ecosystem ☕"
git push -u origin main

echo ✅ TokenCafe criado com sucesso!
echo 🌐 Acesse: https://github.com/andreval74/tokencafe
pause
```

---

*"Execute estes comandos e veja o TokenCafe ganhar vida!"* ☕🚀