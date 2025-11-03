# test-widget-api.ps1
# Script para testar a API de widget com curl

Write-Host ""
Write-Host "=== TESTE API WIDGET SAVE ===" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://localhost:5000/api/widget/save"

# 1. Testar OPTIONS (preflight CORS)
Write-Host "[1/3] Testando OPTIONS (CORS Preflight)..." -ForegroundColor Yellow
Write-Host "URL: $apiUrl" -ForegroundColor Gray
Write-Host "Comando: curl -X OPTIONS -v $apiUrl" -ForegroundColor DarkGray
Write-Host ""

$optionsResponse = curl.exe -X OPTIONS -v $apiUrl 2>&1
Write-Host $optionsResponse
Write-Host ""

# 2. Testar POST com JSON valido
Write-Host "[2/3] Testando POST com JSON valido..." -ForegroundColor Yellow

$testJson = @{
    owner = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
    code = "test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    config = @{
        owner = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1"
        code = "test-api"
        network = @{
            name = "BSC Testnet"
            chainId = 97
            rpcUrl = "https://bsc-testnet.publicnode.com"
        }
        contracts = @{
            sale = "0x1234567890123456789012345678901234567890"
            receiverWallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
            token = "0x9876543210987654321098765432109876543210"
        }
        purchase = @{
            functionName = "buy"
            argsMode = "amountOnly"
        }
        ui = @{
            theme = "light"
            language = "pt-BR"
        }
        meta = @{
            createdAt = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
            createdBy = "test-script"
        }
    }
} | ConvertTo-Json -Depth 10

$jsonFile = "test-widget-payload.json"
$testJson | Out-File -FilePath $jsonFile -Encoding UTF8
Write-Host "JSON payload salvo em: $jsonFile" -ForegroundColor Gray
Write-Host ""

$postResponse = curl.exe -X POST $apiUrl -H "Content-Type: application/json" -d "@$jsonFile" -v 2>&1
Write-Host $postResponse
Write-Host ""

# 3. Verificar se arquivo foi criado
Write-Host "[3/3] Verificando se arquivo JSON foi criado..." -ForegroundColor Yellow
$expectedPath = "widget\gets\0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1\test-*.json"
$files = Get-ChildItem -Path $expectedPath -ErrorAction SilentlyContinue
if ($files) {
    Write-Host "      OK: Arquivo(s) criado(s):" -ForegroundColor Green
    $files | ForEach-Object {
        Write-Host "         $($_.FullName)" -ForegroundColor Gray
    }
} else {
    Write-Host "      ERRO: Nenhum arquivo encontrado em $expectedPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== FIM DO TESTE ===" -ForegroundColor Cyan
Write-Host ""

# Limpar arquivo temporario
if (Test-Path $jsonFile) {
    Remove-Item $jsonFile -Force
}
