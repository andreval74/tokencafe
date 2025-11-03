# TokenCafe - Iniciar Servidor Flask
# Porta: 5000 (padrão Flask)

Write-Host "🐍 TokenCafe - Servidor Flask" -ForegroundColor Cyan
Write-Host "=" -ForegroundColor DarkGray * 50

# Verificar se Python está instalado
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python encontrado: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python não encontrado! Instale Python 3.8+" -ForegroundColor Red
    exit 1
}

# Verificar se Flask está instalado
Write-Host "`n📦 Verificando dependências..." -ForegroundColor Yellow

$flaskInstalled = python -c "import flask" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Flask não encontrado. Instalando..." -ForegroundColor Yellow
    pip install flask flask-cors pyjwt
} else {
    Write-Host "✓ Flask instalado" -ForegroundColor Green
}

# Iniciar servidor
Write-Host "`n🚀 Iniciando servidor Flask na porta 5000..." -ForegroundColor Cyan
Write-Host "📡 URLs disponíveis:" -ForegroundColor White
Write-Host "   • http://localhost:5000/" -ForegroundColor White
Write-Host "   • http://localhost:5000/pages/modules/widget/widget-teste.html" -ForegroundColor White
Write-Host "   • http://localhost:5000/pages/modules/widget/teste.html" -ForegroundColor White
Write-Host "`n💡 Pressione Ctrl+C para parar o servidor`n" -ForegroundColor DarkGray

python server_flask.py
