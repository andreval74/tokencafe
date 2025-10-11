param([string]$ReceiptsDir="receipts", [string]$NodeExe="node")

if (!(Test-Path $ReceiptsDir)) {
  Write-Error "Pasta '$ReceiptsDir' não encontrada"; exit 1
}
if (!(Test-Path logs)) { New-Item -ItemType Directory -Path logs | Out-Null }

$files = Get-ChildItem -Path $ReceiptsDir -Filter *.json
foreach ($f in $files) {
  Write-Host "Processando" $f.FullName
  $log = "logs/deliver-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log"
  & $NodeExe scripts/deliver-token.js --receipt $f.FullName | Tee-Object -FilePath $log
}