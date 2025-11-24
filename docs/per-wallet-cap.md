# Limite por Carteira (perWalletCap)

Este documento descreve como funciona o limite máximo de tokens por carteira (`perWalletCap`) no contrato de venda (`TokenSale.sol`) e como o widget lê e aplica esse limite automaticamente na interface.

## Visão Geral

- `perWalletCap` define a quantidade máxima de tokens que uma única carteira pode adquirir no total.
- `purchasedBy[address]` rastreia, on-chain, quanto cada endereço já comprou via a venda.
- As funções `buy()` e `buyWithUSDT()` verificam o cap antes de permitir a compra e atualizam `purchasedBy` após a transferência dos tokens.

## Atualização do Cap

Apenas o proprietário (`owner`) do contrato pode ajustar o limite:

```
function updatePerWalletCap(uint256 newCap) external onlyOwner {
    perWalletCap = newCap;
}
```

- Para remover o limite, defina `newCap = 0`.
- Para aplicar um limite, use um número inteiro correspondente à unidade do token (normalmente 18 decimais). Ex.: para limitar a 10.000 tokens, defina `newCap = 10000 * 10**decimals` se o contrato usar unidades absolutas; na versão atual, o cap é interpretado como quantidade de tokens já normalizada no front.

## Como o Widget Integra o Cap

- Na conexão e na detecção do contrato, o widget chama `perWalletCap()` e, se disponível, armazena o valor em `CONFIG.maxCompraPorCarteira`.
- A UI exibe a seção "Limite por Carteira" com:
  - Máximo permitido.
  - Disponível para compra agora (cap − saldo do comprador).
- O botão de compra é desativado quando a quantidade solicitada excede o disponível.

### Onde isso aparece no código

- `widget-teste.html`:
  - Lê `perWalletCap` em `primeContractStateAfterConnect()` e `detectContractInformation()`.
  - Mostra/atualiza a UI via `updateCapInfoDisplay()`.
  - Validação adicional em `updateIntermediateEstimateFromState()` quando o usuário muda a quantidade.

## Boas Práticas

- Sempre configure `destinationWallet` corretamente no deploy; sem isso, pagamentos podem falhar.
- Quando alterar `perWalletCap`, comunique no site e, opcionalmente, registre o ajuste em um evento on-chain.
- Teste cenários: dentro do cap, excedendo o cap, e cap desativado (`0`).

## Perguntas Frequentes

- O que acontece se `perWalletCap` não existir no contrato? O widget oculta a seção e usa `CONFIG.maxCompra` como fallback (se definido manualmente).
- O cap considera compras anteriores? Sim, `purchasedBy` acumula compras em `buy()`/`buyWithUSDT()`.
- Posso exibir o cap também em USDT? O cap é sobre quantidade de tokens; o preço em USDT/BNB não altera o cap.

## Próximos Passos

- Adicionar eventos `CapUpdated(uint256 newCap)` para rastreabilidade.
- Exibir uma nota na área de compra com o cap vigente.
- Documentar no `contract-deployment.md` a configuração de `perWalletCap` no Remix após o deploy.
