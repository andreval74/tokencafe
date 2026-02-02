# Integração do Contrato de Venda com o Widget

Este documento explica como integrar o contrato de venda `TokenSale.sol` com o widget de compra de tokens.

## Visão Geral

O contrato de venda automatiza completamente o processo de compra e entrega de tokens, eliminando a necessidade de processos off-chain. Quando um usuário compra tokens através do widget, o pagamento é enviado diretamente para o contrato de venda, que automaticamente transfere os tokens para o comprador.

## Configuração do Widget

Para configurar o widget para usar o contrato de venda, edite o arquivo `pages/modules/widget/widget-teste.html` e atualize as seguintes configurações no objeto `CONFIG`:

```javascript
const CONFIG = {
  // ... outras configurações ...
  saleContractAddress: "0xENDERECO_DO_CONTRATO_IMPLANTADO", // Endereço do contrato TokenSale implantado
  // O widget chama automaticamente 'buy(quantity)' (TBNB) ou 'buyWithUSDT(quantity)' (USDT)
  // baseado na moeda selecionada, quando 'saleContractAddress' está definido corretamente.
  // ... outras configurações ...
};
```

## Preparação do Contrato

Antes de usar o contrato de venda, você precisa:

1. Implantar o contrato na rede usando o Remix IDE (veja `docs/contract-deployment.md`)
2. Depositar tokens no contrato para venda:
   - No Remix IDE, após a implantação, o contrato aparecerá na seção "Deployed Contracts"
   - Primeiro, aprove o contrato para gastar seus tokens usando a interface do token no BscScan
   - No Remix, use a função `depositTokens` do contrato implantado para depositar tokens

## Fluxo de Compra

### Compra com BNB

1. O usuário seleciona a quantidade de tokens e a moeda (TBNB)
2. O widget calcula o preço total
3. O usuário clica em "Comprar"
4. O widget chama o método `buy(quantity)` do contrato com o valor em BNB
5. O contrato:
   - Recebe o BNB
   - Transfere os tokens para o comprador
   - Envia o BNB para a carteira de destino

### Compra com USDT

1. O usuário seleciona a quantidade de tokens e a moeda (USDT)
2. O widget calcula o preço total
3. O usuário clica em "Comprar"
4. O widget aprova o contrato para gastar USDT do usuário
5. O widget chama o método `buyWithUSDT(quantity)` do contrato
6. O contrato:
   - Transfere USDT do usuário para a carteira de destino
   - Transfere os tokens para o comprador

## Vantagens da Integração On-Chain

1. **Automação completa**: Não é necessário processar entregas off-chain
2. **Segurança**: Todo o processo ocorre na blockchain, garantindo transparência
3. **Confiança**: Os compradores recebem os tokens automaticamente após o pagamento
4. **Eficiência**: Reduz a carga operacional de gerenciar entregas manuais

## Gerenciamento do Contrato via Remix

Após a implantação, você pode gerenciar o contrato diretamente pelo Remix IDE:

1. Acesse o Remix IDE: https://remix.ethereum.org/
2. Conecte-se à BSC Testnet via MetaMask
3. Na aba "Deploy & Run Transactions", use "At Address" para carregar o contrato existente:
   - Cole o endereço do contrato implantado
   - Clique em "At Address"
4. O contrato aparecerá na seção "Deployed Contracts" com todas as funções disponíveis:
   - `depositTokens`: Para adicionar mais tokens ao contrato
   - `withdrawTokens`: Para retirar tokens não vendidos
   - `updateBnbPrice`/`updateUsdtPrice`: Para atualizar os preços
   - `updateDestinationWallet`: Para alterar a carteira de destino dos pagamentos

## Solução de Problemas

### Tokens não são entregues

- Verifique se o contrato tem saldo suficiente de tokens
- Use o Remix para chamar `depositTokens(amount)` e adicionar mais tokens ao contrato
- Verifique o saldo do contrato usando a função `balanceOf` do token no BscScan

### Erro na transação

- Verifique se o endereço do contrato está correto em `saleContractAddress`
- Confirme que o ABI está correto e inclui os métodos necessários
- Verifique se o usuário tem saldo suficiente de BNB/USDT
- Verifique os logs de eventos no BscScan para identificar o problema

### Preços incorretos

- Use o Remix para atualizar os preços no contrato:
  - Chame `updateBnbPrice(newPrice)` para atualizar o preço em BNB
  - Chame `updateUsdtPrice(newPrice)` para atualizar o preço em USDT
- Certifique-se de que os preços no widget correspondem aos preços no contrato
