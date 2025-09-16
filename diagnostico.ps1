# ⚠️ DIAGNÓSTICO: Node.js NÃO INSTALADO

Write-Host "
╔══════════════════════════════════════════════════════════════╗
║                    🔍 DIAGNÓSTICO TOKENCAFE                  ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Yellow

Write-Host "📋 Verificando sistema..." -ForegroundColor Cyan

# Verificar Node.js
Write-Host "`n🔍 Verificando Node.js..." -ForegroundColor White
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js ENCONTRADO: $nodeVersion" -ForegroundColor Green
        $nodeInstalled = $true
    } else {
        throw "Node.js não encontrado"
    }
} catch {
    Write-Host "❌ Node.js NÃO INSTALADO" -ForegroundColor Red
    $nodeInstalled = $false
}

# Verificar npm
if ($nodeInstalled) {
    Write-Host "`n🔍 Verificando npm..." -ForegroundColor White
    try {
        $npmVersion = npm --version 2>$null
        Write-Host "✅ npm ENCONTRADO: $npmVersion" -ForegroundColor Green
        $npmInstalled = $true
    } catch {
        Write-Host "❌ npm NÃO ENCONTRADO" -ForegroundColor Red
        $npmInstalled = $false
    }
}

# Verificar estrutura do projeto
Write-Host "`n🔍 Verificando estrutura do projeto..." -ForegroundColor White
if (Test-Path "package.json") {
    Write-Host "✅ package.json encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ package.json não encontrado" -ForegroundColor Red
}

if (Test-Path "api/server.js") {
    Write-Host "✅ Servidor backend encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Servidor backend não encontrado" -ForegroundColor Red
}

if (Test-Path "dashboard") {
    Write-Host "✅ Dashboards encontrados" -ForegroundColor Green
} else {
    Write-Host "❌ Dashboards não encontrados" -ForegroundColor Red
}

# Mostrar soluções
Write-Host "`n
╔══════════════════════════════════════════════════════════════╗
║                        🚀 SOLUÇÕES                          ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Yellow

if (!$nodeInstalled) {
    Write-Host "
🎯 PROBLEMA PRINCIPAL: Node.js não está instalado

📥 SOLUÇÃO RÁPIDA:
   1. Acesse: https://nodejs.org
   2. Clique em 'Download' (versão LTS recomendada)
   3. Execute o arquivo baixado
   4. Aceite todas as opções padrão
   5. Reinicie o PowerShell
   6. Execute este script novamente

⏱️  Tempo estimado: 5-10 minutos
" -ForegroundColor Cyan

    Write-Host "
🔄 Após instalar o Node.js, execute:
   cd 'C:\Users\User\Desktop\cafe\tokencafe'
   npm install
   npm start
" -ForegroundColor White

} else {
    Write-Host "✅ Node.js está instalado! Tentando iniciar o sistema..." -ForegroundColor Green
    
    if (!(Test-Path "node_modules")) {
        Write-Host "`n📦 Instalando dependências..." -ForegroundColor Cyan
        npm install
    }
    
    Write-Host "`n🚀 Iniciando servidor..." -ForegroundColor Cyan
    npm start
}

Write-Host "`n
🧪 ALTERNATIVA SEM NODE.JS:
   Para testar o sistema agora mesmo, abra no navegador:
   📁 test-system.html
   📁 pages/index.html
   📁 dashboard/pages/widget-manager.html
" -ForegroundColor DarkGray

Write-Host "`nPressione qualquer tecla para continuar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")