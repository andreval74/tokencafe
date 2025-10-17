Automação de Entrega Off‑Chain
==============================

Este guia mostra como entregar tokens ao comprador após o pagamento quando não há contrato de venda que faça o crédito automaticamente.

Pré‑requisitos
- Node.js instalado.
- Dependências: `npm i ethers dotenv` na raiz do projeto.
- A carteira admin deve possuir saldo suficiente do token para entregar ao comprador.

Configuração
1. Copie `.env.example` para `.env` e preencha:
   - `PRIVATE_KEY`: chave privada da carteira admin.
   - `READ_RPC`: RPC (ex.: `https://bsc-testnet.publicnode.com`).
   - `DEST_WALLET`: carteira que recebe o pagamento.
   - `TOKEN_ADDR`: contrato do token BEP20.
   - `USDT_ADDR`: contrato USDT (se aceitar USDT).
2. Crie a pasta `receipts/` para salvar recibos.

Gerar Recibo
1. No `pages/modules/widget/widget-teste.html`, efetue uma compra.
2. Clique em `Copiar recibo` e salve o conteúdo JSON em `receipts/compra.json`.

Entrega de Tokens (individual)
- Execute: `node scripts/deliver-token.js --receipt receipts/compra.json`
  - O script valida o pagamento e chama `transfer(buyer, amount)` no token.

Entrega de Tokens (sem arquivo de recibo)
- BNB: `node scripts/deliver-token.js --buyer 0x... --qty 100 --currency TBNB --tx 0x... --totalWei 100000000000000000`
- USDT: `node scripts/deliver-token.js --buyer 0x... --qty 100 --currency USDT --tx 0x... --totalUnits 25000000`

Processar em Lote (múltiplos recibos)
1. Coloque vários arquivos `.json` em `receipts/`.
2. Use o script PowerShell abaixo (Windows) para processar todos:
   ```powershell
   # scripts/process-receipts.ps1
   param([string]$ReceiptsDir="receipts", [string]$NodeExe="node")
   if (!(Test-Path $ReceiptsDir)) { Write-Error "Pasta '$ReceiptsDir' não encontrada"; exit 1 }
   if (!(Test-Path logs)) { New-Item -ItemType Directory -Path logs | Out-Null }
   $files = Get-ChildItem -Path $ReceiptsDir -Filter *.json
   foreach ($f in $files) {
     Write-Host "Processando" $f.FullName
     $log = "logs/deliver-" + (Get-Date -Format "yyyyMMdd-HHmmss") + ".log"
     & $NodeExe scripts/deliver-token.js --receipt $f.FullName | Tee-Object -FilePath $log
   }
   ```

Diagnóstico
- Chaves corretas no `.env`? `PRIVATE_KEY`, `TOKEN_ADDR`, `DEST_WALLET`.
- Recibo contém `buyer`, `qty`, `currency`, `txHash` e `totalWei/totalUnits`?
- A transação tem `status = 1` e destino correto (`DEST_WALLET`)?
- Saldo de tokens na carteira admin suficiente?
- RPC acessível e rede correta (BSC Testnet 97)?

Observações
- Sem contrato de venda, o pagamento não entrega tokens automaticamente. Este fluxo off‑chain cobre a lacuna.
- Para automação completa on‑chain, considere criar um contrato de venda `payable` e integrar no widget.