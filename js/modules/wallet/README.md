# Módulo Wallet

Este módulo é responsável pela gestão de carteiras e conexões blockchain no TokenCafe.

## Estrutura de Arquivos

### `script.js`

- **Função**: Módulo principal de gerenciamento de carteira
- **Funcionalidades**:
  - Conexão e desconexão de carteiras (MetaMask, TrustWallet, WalletConnect)
  - Gerenciamento de saldo e tokens
  - Atualização da interface do usuário
  - Integração com diferentes redes blockchain
  - Cache de dados para melhor performance

### `rpcs.json` (movido para shared/data/)

- **Função**: Configuração de redes blockchain suportadas
- **Conteúdo**: Dados das chains incluindo Chain ID, RPC URLs, exploradores de bloco, moedas nativas

## Páginas Relacionadas

### `pages/modules/wallet-index.html`

- **Função**: Interface principal do módulo wallet
- **Localização**: Correta - dentro do diretório de páginas de módulos

## Funcionalidades Principais

1. **Conexão de Carteira**
   - Suporte a múltiplos provedores
   - Detecção automática de carteiras disponíveis
   - Gerenciamento de estado de conexão

2. **Gerenciamento de Saldo**
   - Atualização automática de saldos
   - Cache para otimização de performance
   - Tratamento de erros com fallback

3. **Troca de Redes**
   - Suporte a múltiplas redes

- Configuração dinâmica via shared/data/rpcs.json
  - Validação de redes suportadas

## Dependências

- Web3.js ou Ethers.js para interação blockchain
- Bootstrap para interface
- Font Awesome para ícones

## Localização

Todos os arquivos estão corretamente organizados:

- Módulo principal: `js/modules/wallet/`
- Páginas: `pages/modules/`
- Configurações: Dentro do módulo
