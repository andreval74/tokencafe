# restart-flask-hard.ps1
# Script para reinicio COMPLETO do servidor Flask
# Remove todos os processos Python, cache .pyc e reinicia limpo

Write-Host ""
Write-Host "=== REINICIO COMPLETO DO FLASK ===" -ForegroundColor Red
Write-Host ""

# 1. Matar TODOS os processos Python
Write-Host "[1/6] Matando todos os processos Python..." -ForegroundColor Yellow
Get-Process -Name python* -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "      Matando PID $($_.Id) - $($_.ProcessName)" -ForegroundColor DarkYellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 1

# 2. Verificar se ainda ha processos Python
$remaining = Get-Process -Name python* -ErrorAction SilentlyContinue
if ($remaining) {
    Write-Host "      AVISO: Ainda ha processos Python ativos:" -ForegroundColor Red
    $remaining | Format-Table Id, ProcessName, StartTime -AutoSize
} else {
    Write-Host "      OK: Nenhum processo Python ativo" -ForegroundColor Green
}

# 3. Remover todos os arquivos .pyc
Write-Host ""
Write-Host "[2/6] Limpando cache Python (.pyc)..." -ForegroundColor Yellow
$pycCount = 0
Get-ChildItem -Path . -Recurse -Filter *.pyc -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "      Removendo $($_.FullName)" -ForegroundColor DarkGray
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    $pycCount++
}
Write-Host "      OK: Removidos $pycCount arquivos .pyc" -ForegroundColor Green

# 4. Remover diretorios __pycache__
Write-Host ""
Write-Host "[3/6] Limpando __pycache__..." -ForegroundColor Yellow
$cacheCount = 0
Get-ChildItem -Path . -Recurse -Directory -Filter __pycache__ -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "      Removendo $($_.FullName)" -ForegroundColor DarkGray
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
    $cacheCount++
}
Write-Host "      OK: Removidos $cacheCount diretorios __pycache__" -ForegroundColor Green

# 5. Verificar se porta 5000 esta livre
Write-Host ""
Write-Host "[4/6] Verificando porta 5000..." -ForegroundColor Yellow
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($port5000) {
    Write-Host "      AVISO: Porta 5000 ainda em uso pelo PID $($port5000.OwningProcess)" -ForegroundColor Red
    $processUsing = Get-Process -Id $port5000.OwningProcess -ErrorAction SilentlyContinue
    if ($processUsing) {
        Write-Host "      Processo: $($processUsing.ProcessName)" -ForegroundColor DarkRed
        Write-Host "      Matando processo..." -ForegroundColor Yellow
        Stop-Process -Id $port5000.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "      OK: Porta 5000 livre" -ForegroundColor Green
}

# 6. Aguardar para garantir limpeza
Write-Host ""
Write-Host "[5/6] Aguardando 3 segundos para garantir limpeza completa..." -ForegroundColor Cyan
Start-Sleep -Seconds 3

# 7. Iniciar Flask
Write-Host ""
Write-Host "[6/6] Iniciando Flask servidor..." -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green
Write-Host ""
python server_flask.py
