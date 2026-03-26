# Sistema de Widgets TokenCafe - Versão Simplificada

## Visão Geral

Este sistema permite criar widgets de venda de tokens de forma simplificada, com apenas 3 campos principais e auto-detecção inteligente de parâmetros do contrato.

## 📋 Funcionalidades

### ✅ Interface Simplificada

- **3 Campos Principais**: Nome do Projeto, Blockchain, Endereço do Contrato
- **Auto-Detecção Inteligente**: Detecta automaticamente se o endereço é um token ERC20 ou contrato de venda
- **Deploy Automático**: Cria contratos de venda automaticamente quando um token é detectado

### ✅ Smart Contracts

- **TokenSaleFactory**: Fábrica para criar contratos de venda com comissão de 0.25%
- **TokenSaleProxy**: Intermediário para vendas com divisão automática de pagamento (95% para vendedor, 5% para TokenCafe)

### ✅ Multi-Blockchain

- **Binance Smart Chain (BSC)**: Mainnet e Testnet
- **Ethereum**: Mainnet, Goerli, Sepolia
- **Polygon**: Mainnet e Mumbai
- **Avalanche**: Mainnet e Fuji

### ✅ Integração com Carteiras

- MetaMask
- WalletConnect
- Coinbase Wallet
- Trust Wallet

## 🚀 Como Usar

### 1. Acessar a Interface

```
pages/modules/widget/widget-criar.html
```

### 2. Preencher os 3 Campos

1. **Nome do Projeto**: Nome do seu token/projeto
2. **Blockchain**: Selecione a rede desejada
3. **Endereço do Contrato**:
   - Se for um token ERC20: O sistema criará um contrato de venda automaticamente
   - Se for um contrato de venda existente: O sistema usará diretamente

### 3. Configurar Opções Avançadas (Opcional)

- Preço por Token
- Limites de Compra (mínimo/máximo)
- Textos personalizados do botão

### 4. Visualizar Preview

- Veja como o widget ficará antes de publicar
- Teste a funcionalidade de compra

### 5. Copiar Código ou Baixar Configuração

- **Copiar Código**: Copia o código HTML para incorporar o widget
- **Baixar Config**: Baixa arquivo JSON com as configurações

## 📁 Estrutura de Arquivos

```
pages/modules/widget/
├── widget-criar.html          # Interface principal de criação
├── gerar-widget.html          # Interface antiga (obsoleto)
└── README.md                  # Este arquivo

js/modules/widget/
├── widget-simple.js           # Lógica principal simplificada
├── contract-deployer.js       # Deploy automático de contratos
├── widget-generator.js        # Gerador de widgets (existente)
└── page-manager.js            # Gerenciador de páginas (existente)

contracts/
├── TokenSaleFactory.sol       # Fábrica de contratos de venda
└── TokenSaleProxy.sol         # Proxy intermediário com comissão

test/
└── test-widget-creation.html  # Página de testes
```

## 🔧 Arquivos Obsoletos (Para Exclusão)

```
pages/modules/widget/
├── index.html
├── configurar.html
├── embed.html
├── preview.html
└── gerar-widget.html (após migração completa)

js/modules/widget/
├── widget-config.js
├── widget-embed.js
└── widget-preview.js
```

## 🧪 Testes

Acesse a página de testes:

```
test/test-widget-creation.html
```

### Testes Disponíveis:

1. **Detecção de Token**: Verifica se tokens ERC20 são detectados corretamente
2. **Deploy de Contrato**: Testa criação automática de contratos de venda
3. **Conexão com Carteira**: Valida integração com MetaMask
4. **Geração de Widget**: Testa geração completa do widget

## 🔐 Segurança

- Validação de endereços Ethereum
- Verificação de contratos via Sourcify/Etherscan
- Deploy apenas de contratos auditados
- Comissão transparente de 0.25%

## 📊 Comissões

- **TokenCafe**: 0.25% sobre cada venda
- **Divisão Automática**: 95% para vendedor, 5% para TokenCafe
- **Sem Taxas Ocultas**: Todas as taxas são transparentes

## 🌐 Redes Suportadas

| Blockchain | Network | Chain ID | RPC URL                                    |
| ---------- | ------- | -------- | ------------------------------------------ |
| BSC        | Mainnet | 56       | https://bsc-dataseed.binance.org/          |
| BSC        | Testnet | 97       | https://bsc-testnet.publicnode.com         |
| Ethereum   | Mainnet | 1        | https://eth-mainnet.g.alchemy.com/v2/      |
| Ethereum   | Goerli  | 5        | https://goerli.infura.io/v3/               |
| Ethereum   | Sepolia | 11155111 | https://sepolia.infura.io/v3/              |
| Polygon    | Mainnet | 137      | https://polygon-rpc.com/                   |
| Polygon    | Mumbai  | 80001    | https://rpc-mumbai.maticvigil.com/         |
| Avalanche  | Mainnet | 43114    | https://api.avax.network/ext/bc/C/rpc      |
| Avalanche  | Fuji    | 43113    | https://api.avax-test.network/ext/bc/C/rpc |

## 📝 Exemplo de Uso

### Caso 1: Token Existente

1. Você tem um token ERC20 deployado
2. Insira o endereço do token
3. O sistema detecta automaticamente
4. Clique em "Criar Contrato de Venda"
5. Configure preço e limites
6. Gere o widget

### Caso 2: Contrato de Venda Existente

1. Você já tem um contrato de venda
2. Insira o endereço do contrato de venda
3. O sistema detecta automaticamente
4. Configure opções visuais
5. Gere o widget

## 🎨 Customização

### Cores e Estilos

O widget suporta temas claro e escuro, com opções de personalização de:

- Cores principais
- Cores de fundo
- Cores de texto
- Bordas e sombras

### Textos Personalizados

- Título do widget
- Descrição
- Texto do botão de compra
- Mensagens de status

## 🐛 Solução de Problemas

### Token não detectado

- Verifique se o endereço está correto
- Confirme se é um token ERC20 válido
- Verifique a blockchain selecionada

### Deploy falhou

- Verifique se você tem saldo suficiente para gás
- Confirme se está na rede correta
- Verifique permissões da MetaMask

### Widget não carrega

- Verifique a conexão com a blockchain
- Confirme se o contrato está ativo
- Verifique erros no console do navegador

## 📞 Suporte

Para dúvidas e suporte:

- Documentação completa: [Link]
- Comunidade: [Link]
- Suporte técnico: [Link]

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo
