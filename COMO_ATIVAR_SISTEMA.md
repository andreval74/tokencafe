# 🚀 GUIA PASSO A PASSO - ATIVAÇÃO COMPLETA DO TOKENCAFE

## 📋 **SITUAÇÃO ATUAL**
Você está tentando executar `npm start` mas está dando erro porque o Node.js não está instalado ou configurado corretamente.

## ✅ **SOLUÇÃO PASSO A PASSO**

### **PASSO 1: Instalar Node.js** 
1. **Acesse:** https://nodejs.org
2. **Baixe** a versão **LTS** (Long Term Support) - recomendada
3. **Execute** o instalador baixado
4. **Aceite** todas as configurações padrão
5. **Reinicie** o PowerShell após a instalação

### **PASSO 2: Verificar Instalação**
Abra um novo PowerShell e execute:
```powershell
node --version
npm --version
```
Deve aparecer as versões instaladas (exemplo: v18.17.0 e 9.6.7)

### **PASSO 3: Navegar até o Projeto**
```powershell
cd "C:\Users\User\Desktop\cafe\tokencafe"
```

### **PASSO 4: Instalar Dependências**
```powershell
npm install
```
Este comando vai baixar todas as bibliotecas necessárias (vai demorar alguns minutos)

### **PASSO 5: Iniciar o Servidor**
```powershell
npm start
```
ou
```powershell
npm run dev
```

### **PASSO 6: Acessar o Sistema**
Depois que o servidor iniciar, você verá algo como:
```
🚀 TokenCafe Server iniciado com sucesso!
🌐 Servidor: http://localhost:3001
📊 Dashboard: http://localhost:3001/dashboard
```

Agora acesse no navegador:
- **http://localhost:3001** - Página principal
- **http://localhost:3001/dashboard** - Dashboard principal
- **http://localhost:3001/dashboard/widgets** - Gerenciador de widgets
- **http://localhost:3001/dashboard/admin** - Painel administrativo
- **http://localhost:3001/dashboard/reports** - Analytics

## 🆘 **SE DER PROBLEMA:**

### **Problema: "npm não é reconhecido"**
**Solução:** Node.js não foi instalado corretamente
1. Reinstale o Node.js
2. Reinicie o computador
3. Abra um novo PowerShell

### **Problema: "Permission denied" ou erro de permissão**
**Solução:** Execute o PowerShell como Administrador
1. Clique direito no PowerShell
2. Selecione "Executar como administrador"

### **Problema: Erro durante npm install**
**Solução:** Limpe o cache e tente novamente
```powershell
npm cache clean --force
npm install
```

## 🧪 **ALTERNATIVA: TESTAR SEM NODE.JS**
Se não conseguir instalar o Node.js agora, você pode testar o sistema abrindo diretamente no navegador:

1. **Navegue até:** `C:\Users\User\Desktop\cafe\tokencafe`
2. **Abra no navegador:**
   - `test-system.html` - Sistema de testes completo
   - `pages/index.html` - Página principal
   - `dashboard/pages/widget-manager.html` - Gerenciador de widgets
   - `dashboard/pages/admin-panel.html` - Painel admin
   - `dashboard/pages/reports.html` - Analytics

## ⚡ **SCRIPT AUTOMÁTICO**
Execute o script que criei para você:
```powershell
.\start.ps1
```
Este script vai:
1. Verificar se Node.js está instalado
2. Instalar dependências se necessário  
3. Iniciar o servidor
4. Ou mostrar instruções se Node.js não estiver instalado

## 🎯 **RESULTADO ESPERADO**
Quando tudo estiver funcionando, você terá:
- ✅ Servidor rodando na porta 3001
- ✅ APIs funcionando (/api/auth, /api/widgets, etc.)
- ✅ Dashboards totalmente interativos
- ✅ Sistema Web3 integrado
- ✅ Real-time updates funcionando

## 📞 **PRECISA DE AJUDA?**
Se continuar com problemas, me informe:
1. Qual erro específico está aparecendo
2. Se conseguiu instalar o Node.js
3. Em que passo está travando