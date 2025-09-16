# 🚀 TokenCafe - Start Script
# Sistema de inicialização unificado

Write-Host "
╔══════════════════════════════════════════════════════════════╗
║                    ☕ TOKENCAFE UNIFICADO ☕                 ║
║                                                              ║
║  🚀 Sistema completo de widgets blockchain                   ║
║  🎯 Unificação XCafe + Widget sem perdas                     ║
║  ☕ Tema inspirado na cultura cafeeira brasileira            ║
╚══════════════════════════════════════════════════════════════╝
" -ForegroundColor Yellow

Write-Host "📋 Verificando estrutura do projeto..." -ForegroundColor Cyan

# Verificar se está no diretório correto
if (!(Test-Path "package.json")) {
    Write-Host "❌ Erro: Execute este script a partir da pasta raiz do projeto TokenCafe" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Estrutura do projeto verificada!" -ForegroundColor Green

# Verificar se Node.js está instalado
Write-Host "`n📦 Verificando Node.js..." -ForegroundColor Cyan
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "✅ Node.js encontrado: $nodeVersion" -ForegroundColor Green
        
        # Verificar se dependências estão instaladas
        if (!(Test-Path "node_modules")) {
            Write-Host "`n📥 Instalando dependências..." -ForegroundColor Cyan
            npm install
            Write-Host "✅ Dependências instaladas!" -ForegroundColor Green
        } else {
            Write-Host "✅ Dependências já instaladas!" -ForegroundColor Green
        }
        
        # Iniciar servidor
        Write-Host "`n🚀 Iniciando servidor TokenCafe..." -ForegroundColor Cyan
        Write-Host "
🌐 Servidor será iniciado em: http://localhost:3001
📊 Dashboard disponível em: http://localhost:3001/dashboard
🔧 API endpoints: http://localhost:3001/api/

Para parar o servidor: Ctrl+C
        " -ForegroundColor Yellow
        
        npm run dev
        
    } else {
        throw "Node.js não encontrado"
    }
} catch {
    Write-Host "⚠️  Node.js não encontrado ou não configurado no PATH" -ForegroundColor Yellow
    Write-Host "`n📖 Modo de demonstração ativado!" -ForegroundColor Cyan
    Write-Host "
🧪 Para testar o sistema sem Node.js:
   1. Abra o arquivo: test-system.html no navegador
   2. Navegue pelos dashboards diretamente:
      • pages/index.html
      • dashboard/main/dashboard.html  
      • dashboard/pages/widget-manager.html
      • dashboard/pages/admin-panel.html
      • dashboard/pages/reports.html

📥 Para instalar Node.js:
   1. Acesse: https://nodejs.org
   2. Baixe a versão LTS
   3. Execute este script novamente
    " -ForegroundColor White
    
    Write-Host "Press any key to continue..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}