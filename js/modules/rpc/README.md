# Módulo RPC - TokenCafe

Este módulo fornece funcionalidades para o gerador de links RPC usado pelo rpc-index.html.

## Arquivos Ativos

### Core

- **`rpc-index.js`** - Interface principal para geração de links RPC
- **`debug-system.js`** - Sistema de debug e logs

### Integrações

- **`chainlist-integration.js`** - Integração com ChainList API
- **`network-icons.js`** - Gerenciador de ícones das redes

### Dados Centralizados

- **`shared/data/rpcs.json`** - Dados de RPCs das redes (fonte centralizada)

## Funcionalidades Principais

### 1. Conexão com Wallet

```javascript
import RPCCore from "./rpc-core.js";

const rpc = new RPCCore();

// Conectar wallet de forma simples
const resultado = await rpc.connectWalletSimple();
if (resultado.success) {
  console.log("Conectado:", resultado.account);
}
```

### 2. Adicionar Redes Populares

```javascript
// Adicionar Polygon
await rpc.addPopularNetwork("polygon");

// Adicionar BSC
await rpc.addPopularNetwork("bsc");

// Adicionar Avalanche
await rpc.addPopularNetwork("avalanche");
```

### 3. Criar Rede Customizada

```javascript
const redeCustomizada = rpc.createQuickNetwork({
  chainId: 1337,
  chainName: "Minha Rede Local",
  rpcUrl: "http://localhost:8545",
  symbol: "ETH",
  name: "Ethereum Local",
});

await rpc.addNetworkSimple(redeCustomizada);
```

### 4. Testar Conectividade RPC

```javascript
const teste = await rpc.testRpcUrl("https://polygon-rpc.com/");
if (teste.success) {
  console.log("RPC funcionando, latência:", teste.latency + "ms");
}
```

### 5. Trocar de Rede

```javascript
// Trocar para Polygon
await rpc.switchNetworkSimple("0x89");

// Trocar para BSC
await rpc.switchNetworkSimple("0x38");
```

### 6. Obter Informações da Rede Atual

```javascript
const info = await rpc.getCurrentNetworkSimple();
if (info.success) {
  console.log("Chain ID:", info.chainId);
  console.log("Conta conectada:", info.connectedAccount);
}
```

## Redes Pré-configuradas

O módulo inclui configurações para as seguintes redes populares:

- **ethereum** - Ethereum Mainnet
- **polygon** - Polygon Mainnet
- **bsc** - Binance Smart Chain
- **avalanche** - Avalanche Network

## Tratamento de Erros

Todos os métodos retornam objetos com a estrutura:

```javascript
// Sucesso
{
    success: true,
    // ... dados específicos
}

// Erro
{
    success: false,
    error: "Mensagem de erro detalhada"
}
```

## Exemplos Práticos

Veja o arquivo `rpc-examples.js` para exemplos completos de uso, incluindo:

- Fluxo completo de conexão e configuração
- Tratamento de erros
- Casos de uso comuns
- Boas práticas

## Melhorias Implementadas

1. **Métodos Simplificados** - Versões mais fáceis de usar dos métodos originais
2. **Tratamento de Erro Robusto** - Mensagens de erro claras e informativas
3. **Validação Automática** - Validação de dados de rede antes de enviar
4. **Configurações Pré-definidas** - Redes populares já configuradas
5. **Utilitários Auxiliares** - Funções para validação, formatação e testes
6. **Documentação Completa** - Exemplos e guias de uso

## Como Usar

1. Importe a classe principal:

```javascript
import RPCCore from "./js/modules/rpc/rpc-core.js";
```

2. Crie uma instância:

```javascript
const rpc = new RPCCore();
```

3. Use os métodos simplificados:

```javascript
// Conectar
await rpc.connectWalletSimple();

// Adicionar rede
await rpc.addPopularNetwork("polygon");

// Trocar rede
await rpc.switchNetworkSimple("0x89");
```

## Compatibilidade

- Requer MetaMask instalado
- Funciona com navegadores modernos
- Suporte a ES6 modules
- Compatible com frameworks como React, Vue, etc.
