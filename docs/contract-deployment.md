# Guia de Implantação do Contrato de Venda usando Remix IDE

Este guia explica como compilar e implantar o contrato de venda `TokenSale.sol` na BSC Testnet usando exclusivamente o Remix IDE, sem necessidade de instalações locais.

## Pré-requisitos

1. Navegador web moderno (Chrome, Firefox, Edge)
2. Extensão MetaMask instalada e configurada com a BSC Testnet
3. TBNB na sua carteira para pagar taxas de implantação (obtenha em https://testnet.binance.org/faucet-smart)

## Passo 1: Acessar o Remix IDE

1. Acesse o Remix IDE em: https://remix.ethereum.org/

## Passo 2: Criar o Contrato no Remix

1. No Remix, clique no ícone de arquivo (primeiro ícone à esquerda)
2. Clique no botão "+" para criar um novo arquivo
3. Nomeie o arquivo como `TokenSale.sol`
4. Copie e cole o código do contrato abaixo:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function decimals() external view returns (uint8);
}

/**
 * @title TokenSale
 * @dev Contrato simples para venda de tokens que suporta pagamentos em BNB e USDT
 */
contract TokenSale {
    address public owner;
    address public saleToken;         // Token sendo vendido
    address public usdtToken;         // Endereço do contrato USDT
    address public destinationWallet; // Carteira que receberá os pagamentos

    uint256 public bnbPrice;          // Preço em BNB por token (em wei)
    uint256 public usdtPrice;         // Preço em USDT por token (considerando decimais do USDT)

    event TokensPurchased(
        address indexed buyer,
        uint256 amount,
        uint256 cost,
        string paymentMethod
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Apenas o proprietario pode chamar esta funcao");
        _;
    }

    constructor(
        address _saleToken,
        address _usdtToken,
        address _destinationWallet,
        uint256 _bnbPrice,
        uint256 _usdtPrice
    ) {
        owner = msg.sender;
        saleToken = _saleToken;
        usdtToken = _usdtToken;
        destinationWallet = _destinationWallet;
        bnbPrice = _bnbPrice;
        usdtPrice = _usdtPrice;
    }

    /**
     * @dev Compra tokens com BNB
     * @param quantity Quantidade de tokens a serem comprados
     */
    function buy(uint256 quantity) external payable {
        require(quantity > 0, "Quantidade deve ser maior que zero");
        uint256 totalCost = bnbPrice * quantity;
        require(msg.value >= totalCost, "BNB insuficiente enviado");

        // Transferir tokens para o comprador
        IERC20 token = IERC20(saleToken);
        require(token.balanceOf(address(this)) >= quantity, "Saldo de tokens insuficiente no contrato");

        // Transferir pagamento para a carteira de destino
        (bool sent, ) = destinationWallet.call{value: msg.value}("");
        require(sent, "Falha ao enviar BNB");

        // Transferir tokens para o comprador
        require(token.transfer(msg.sender, quantity), "Falha na transferencia de tokens");

        emit TokensPurchased(msg.sender, quantity, msg.value, "BNB");

        // Devolver BNB excedente, se houver
        uint256 excess = msg.value - totalCost;
        if (excess > 0) {
            (bool refundSent, ) = msg.sender.call{value: excess}("");
            require(refundSent, "Falha ao devolver BNB excedente");
        }
    }

    /**
     * @dev Compra tokens com USDT
     * @param quantity Quantidade de tokens a serem comprados
     */
    function buyWithUSDT(uint256 quantity) external {
        require(quantity > 0, "Quantidade deve ser maior que zero");

        IERC20 usdt = IERC20(usdtToken);
        IERC20 token = IERC20(saleToken);

        uint8 usdtDecimals = usdt.decimals();
        uint256 totalCost = usdtPrice * quantity;

        // Verificar se o contrato tem tokens suficientes
        require(token.balanceOf(address(this)) >= quantity, "Saldo de tokens insuficiente no contrato");

        // Transferir USDT do comprador para a carteira de destino
        require(usdt.transferFrom(msg.sender, destinationWallet, totalCost), "Falha na transferencia de USDT");

        // Transferir tokens para o comprador
        require(token.transfer(msg.sender, quantity), "Falha na transferencia de tokens");

        emit TokensPurchased(msg.sender, quantity, totalCost, "USDT");
    }

    /**
     * @dev Deposita tokens no contrato para venda
     * @param amount Quantidade de tokens a serem depositados
     */
    function depositTokens(uint256 amount) external {
        IERC20 token = IERC20(saleToken);
        require(token.transferFrom(msg.sender, address(this), amount), "Falha ao depositar tokens");
    }

    /**
     * @dev Retira tokens não vendidos do contrato
     * @param amount Quantidade de tokens a serem retirados
     */
    function withdrawTokens(uint256 amount) external onlyOwner {
        IERC20 token = IERC20(saleToken);
        require(token.transfer(owner, amount), "Falha ao retirar tokens");
    }

    /**
     * @dev Atualiza o preço em BNB por token
     * @param newPrice Novo preço em wei
     */
    function updateBnbPrice(uint256 newPrice) external onlyOwner {
        bnbPrice = newPrice;
    }

    /**
     * @dev Atualiza o preço em USDT por token
     * @param newPrice Novo preço considerando decimais do USDT
     */
    function updateUsdtPrice(uint256 newPrice) external onlyOwner {
        usdtPrice = newPrice;
    }

    /**
     * @dev Atualiza a carteira de destino
     * @param newWallet Nova carteira de destino
     */
    function updateDestinationWallet(address newWallet) external onlyOwner {
        require(newWallet != address(0), "Endereco invalido");
        destinationWallet = newWallet;
    }

    /**
     * @dev Atualiza o endereço do contrato USDT
     * @param newUsdtToken Novo endereço do contrato USDT
     */
    function updateUsdtToken(address newUsdtToken) external onlyOwner {
        require(newUsdtToken != address(0), "Endereco invalido");
        usdtToken = newUsdtToken;
    }
}
```

## Passo 3: Compilar o Contrato

1. Clique no ícone "Solidity Compiler" (segundo ícone à esquerda)
2. Selecione a versão do compilador: `0.8.17` (ou qualquer versão 0.8.x)
3. Marque a opção "Auto compile" (opcional)
4. Clique no botão "Compile TokenSale.sol"
5. Verifique se a compilação foi bem-sucedida (deve aparecer um ícone verde de verificação)

## Passo 4: Configurar MetaMask para BSC Testnet

1. Abra sua extensão MetaMask
2. Clique no seletor de rede (normalmente mostra "Ethereum Mainnet")
3. Clique em "Adicionar rede" e depois "Adicionar rede manualmente"
4. Preencha com os dados da BSC Testnet:
   - Nome da rede: `BSC Testnet`
   - Nova URL RPC: `https://bsc-testnet.publicnode.com`
   - ID da cadeia: `97`
   - Símbolo da moeda: `TBNB`
   - URL do explorador de blocos: `https://testnet.bscscan.com`
5. Clique em "Salvar"
6. Certifique-se de ter TBNB na sua carteira (use o faucet: https://testnet.binance.org/faucet-smart)

## Passo 5: Implantar o Contrato

1. Clique no ícone "Deploy & Run Transactions" (terceiro ícone à esquerda)
2. No campo "ENVIRONMENT", selecione "Injected Provider - MetaMask"
3. MetaMask solicitará conexão com o Remix, aprove a conexão
4. Verifique se está conectado à BSC Testnet
5. No campo "CONTRACT", selecione "TokenSale"
6. Expanda a seção "DEPLOY" para preencher os parâmetros do construtor:
   - `_saleToken`: `0x2cf724171a998C3d470048AC2F1b187a48A5cafE` (endereço do token que será vendido)
   - `_usdtToken`: `0x337610d27c682E347C9cD60BD4b3b107C9d34dDd` (endereço do USDT na BSC Testnet)
   - `_destinationWallet`: `0xEe02E32d8d2888E9f1D6d13391E716Bc7F41f6Ae` (carteira que receberá os pagamentos)
   - `_bnbPrice`: `1000000000000000` (0.001 BNB em wei - preço por token)
   - `_usdtPrice`: `250000` (0.25 USDT considerando 6 decimais)
7. Clique no botão "Deploy"
8. MetaMask abrirá para confirmar a transação, verifique os detalhes e confirme
9. Aguarde a transação ser confirmada
10. Após a implantação, o contrato aparecerá na seção "Deployed Contracts"
11. **IMPORTANTE**: Anote o endereço do contrato implantado (aparece ao lado do nome do contrato)

## Passo 6: Verificar o Contrato no BscScan (Opcional)

1. Acesse https://testnet.bscscan.com/
2. Pesquise pelo endereço do contrato implantado
3. Na página do contrato, clique na aba "Contract"
4. Clique no botão "Verify and Publish"
5. Selecione "Solidity (Single file)" como tipo de compilador
6. Preencha as informações:
   - Versão do compilador: `v0.8.17+commit.8df45f5f` (ou a versão que você usou)
   - Licença: `MIT`
7. Clique em "Continue"
8. Cole o código do contrato (sem modificações)
9. Clique em "Verify and Publish"
10. Se tudo estiver correto, o contrato será verificado e seu código ficará visível no BscScan

## Passo 7: Interagir com o Contrato

Após a implantação, você pode interagir com o contrato diretamente pelo Remix:

1. Na seção "Deployed Contracts", expanda o contrato implantado
2. Você verá todas as funções do contrato disponíveis para interação

### Depositar Tokens no Contrato

Para que o contrato funcione, você precisa depositar tokens nele:

1. Primeiro, aprove o contrato para gastar seus tokens:
   - Use a interface do token (0x2cf724171a998C3d470048AC2F1b187a48A5cafE) no BscScan ou outro método
   - Chame a função `approve` com o endereço do contrato implantado e a quantidade de tokens
2. No Remix, use a função `depositTokens` para depositar tokens no contrato

## Passo 8: Atualizar o Widget

Após a implantação bem-sucedida, atualize o arquivo `pages/modules/widget/widget-teste.html` com o endereço do contrato implantado:

```javascript
const CONFIG = {
  // ... outras configurações ...
  saleContractAddress: "ENDEREÇO_DO_CONTRATO_IMPLANTADO", // Substitua pelo endereço real
  // ... outras configurações ...
};
```

## Solução de Problemas

### Erro na Implantação

- Verifique se você tem TBNB suficiente para pagar as taxas de gás
- Confirme se todos os parâmetros do construtor estão corretos

### Erro ao Depositar Tokens

- Verifique se você aprovou o contrato para gastar seus tokens
- Confirme se você tem tokens suficientes na sua carteira

### Erro na Compra

- Verifique se o contrato tem tokens suficientes depositados
- Confirme se o preço e os parâmetros estão configurados corretamente
