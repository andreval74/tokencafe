# ⚠️ DIAGNÓSTICO: Node.js NÃO INSTALADO

Write-Host "
╔══════════════════════════════════════════════════════════════╗
║                    🔍 DIAGNÓSTICO TOKENCAFE                  ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Yellow

Write-Host "📋 Verificando sistema..." -ForegroundColor Cyan

# Inicializar variáveis
$nodeInstalled = $false
$npmInstalled = $false

# Verificar Node.js
Write-Host "`n🔍 Verificando Node.js..." -ForegroundColor White
try {
    $nodeVersion = & node --version 2>$null
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
        $npmVersion = & npm --version 2>$null
        if ($npmVersion) {
            Write-Host "✅ npm ENCONTRADO: $npmVersion" -ForegroundColor Green
            $npmInstalled = $true
        } else {
            throw "npm não encontrado"
        }
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

if (Test-Path "js\server_simple.js") {
    Write-Host "✅ Servidor backend encontrado" -ForegroundColor Green
} else {
    Write-Host "❌ Servidor backend não encontrado" -ForegroundColor Red
}

if (Test-Path "pages") {
    Write-Host "✅ Páginas encontradas" -ForegroundColor Green
} else {
    Write-Host "❌ Páginas não encontradas" -ForegroundColor Red
}

if (Test-Path "js\modules") {
    Write-Host "✅ Módulos encontrados" -ForegroundColor Green
} else {
    Write-Host "❌ Módulos não encontrados" -ForegroundColor Red
}

# Mostrar soluções
Write-Host "`n
╔══════════════════════════════════════════════════════════════╗
║                        🚀 SOLUÇÕES                          ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Yellow

if (-not $nodeInstalled) {
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
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "`n📦 Instalando dependências..." -ForegroundColor Cyan
        & npm install
    }
    
    Write-Host "`n🚀 Iniciando servidor..." -ForegroundColor Cyan
    & npm start
}

Write-Host "`n
🧪 ALTERNATIVA SEM NODE.JS:
   Para testar o sistema agora mesmo, execute:
   python -m http.server 8000
   
   Depois abra no navegador:
   📁 http://localhost:8000/test-modules.html
   📁 http://localhost:8000/pages/dash-main.html
   📁 http://localhost:8000/pages/index.html
" -ForegroundColor DarkGray

Write-Host "`n💡 SISTEMA ATUAL:
   ✅ Sistema modular implementado
   ✅ 5 módulos funcionais
   ✅ Navegação dinâmica
   ✅ Interface responsiva
" -ForegroundColor Green

Write-Host "`nPressione qualquer tecla para continuar..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
