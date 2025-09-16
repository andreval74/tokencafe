# 🧪 GUIA DE TESTES - TokenCafe

## 🌐 **TESTES VIA SERVIDOR (http://localhost:3001)**

### **🏠 Páginas Principais:**
```
✅ http://localhost:3001                    - Página principal (Landing page)
✅ http://localhost:3001/dashboard          - Dashboard principal  
✅ http://localhost:3001/test-system        - Sistema de testes
✅ http://localhost:3001/health             - Health check
✅ http://localhost:3001/api/test           - Teste API
```

## 📁 **ARQUIVOS PARA ABRIR DIRETAMENTE**

### **🏠 Páginas Principais:**
```
pages/index.html                           - Landing page principal
dasboard/main/dashboard.html               - Dashboard principal
test-system.html                           - Sistema completo de testes
```

### **📊 Dashboards Especializados:**
```
dasboard/admin/                            - Painel administrativo
dasboard/analytics/                        - Analytics e métricas  
dasboard/widgets/                          - Gerenciador de widgets
```

### **📖 Documentação e Guias:**
```
README.md                                  - Documentação principal
DEPLOYMENT_GUIDE.md                        - Guia de deployment
COMO_ATIVAR_SISTEMA.md                     - Como ativar sistema
TOKENCAFE_README.md                        - README específico
TOKENCAFE_EXECUTIVO.md                     - Resumo executivo
INSTRUCOES_ATIVACAO.html                   - Guia visual de ativação
INSTALACAO_NODEJS.html                     - Guia instalação Node.js
```

## 🔧 **ARQUIVOS DE CONFIGURAÇÃO E DESENVOLVIMENTO**

### **⚙️ Configurações:**
```
package.json                               - Dependências e scripts
.env.example                               - Variáveis de ambiente
start.ps1                                  - Script de inicialização
diagnostico.ps1                            - Diagnóstico do sistema
```

### **🐍 Versão Python (Alternativa):**
```
server_flask.py                            - Servidor Python Flask
requirements.txt                           - Dependências Python
```

## 🧪 **COMO TESTAR - PASSO A PASSO**

### **🌐 Método 1: Via Servidor Node.js (RECOMENDADO)**
```powershell
# 1. Garantir que servidor está rodando
# (Você já tem rodando em http://localhost:3001)

# 2. Abrir no navegador:
# http://localhost:3001
# http://localhost:3001/dashboard
# http://localhost:3001/test-system
```

### **📁 Método 2: Arquivos Locais (Para testes rápidos)**
```powershell
# Abrir diretamente no navegador:
.\pages\index.html
.\dasboard\main\dashboard.html
.\test-system.html

# Ou arrastar para o navegador
```

## 🎯 **ARQUIVOS MAIS IMPORTANTES PARA TESTAR**

### **🥇 PRIORIDADE ALTA:**
1. **http://localhost:3001** - Página principal funcionando
2. **http://localhost:3001/dashboard** - Dashboard principal
3. **http://localhost:3001/test-system** - Sistema de testes completo
4. **test-system.html** - Abrir diretamente para ver interface

### **🥈 PRIORIDADE MÉDIA:**  
5. **pages/index.html** - Landing page completa
6. **dasboard/main/dashboard.html** - Dashboard administrativo
7. **README.md** - Documentação do projeto

### **🥉 PRIORIDADE BAIXA:**
8. **DEPLOYMENT_GUIDE.md** - Para quando quiser publicar
9. **TOKENCAFE_EXECUTIVO.md** - Visão estratégica
10. **Arquivos em dasboard/admin/** - Painéis administrativos

## 🔥 **TESTES RECOMENDADOS AGORA:**

### **⚡ Teste Rápido (2 minutos):**
```
1. Abra: http://localhost:3001
2. Veja se carrega a página principal
3. Teste: http://localhost:3001/health
4. Confirme: {"status": "ok"}
```

### **🧪 Teste Completo (5 minutos):**
```
1. http://localhost:3001 - Interface principal
2. http://localhost:3001/dashboard - Dashboard
3. http://localhost:3001/test-system - Testes
4. Abrir: test-system.html - Interface local
5. Verificar: All funcionando
```

### **📊 Teste Avançado (10 minutos):**
```
1. Todos os testes acima +
2. Explorar: dasboard/main/dashboard.html
3. Ler: README.md
4. Verificar: shared/css/tokencafe.css
5. Testar: APIs em http://localhost:3001/api/
```

## 🚀 **COMANDOS ÚTEIS**

### **🔧 Terminal/PowerShell:**
```powershell
# Ver status do servidor
curl http://localhost:3001/health

# Testar API
curl http://localhost:3001/api/test

# Abrir páginas
start http://localhost:3001
start http://localhost:3001/dashboard
```

## ❓ **Qual Arquivo Você Quer Testar Primeiro?**

**Recomendo começar com:**
1. **http://localhost:3001** (página principal via servidor)
2. **test-system.html** (abrir diretamente)
3. **http://localhost:3001/test-system** (sistema de testes via servidor)

**Me fale qual quer testar e eu te ajudo!** 🎯