# Fluxo de Contratos no Ecosistema Cafe

Objetivo: permitir que o usuário autenticado via carteira crie, verifique, compile e faça deploy de contratos (com e sem venda), com opção de endereço personalizado (prefixo/sufixo) usando CREATE2, seguindo o padrão do 20lab.app.

## Visão Geral

- Login com carteira (MetaMask) e coleta de parâmetros via formulários.
- Seleção de um “grupo de contrato” para manter bytecode leve.
- Geração do contrato (template) com base nas opções do usuário.
- Compilação, verificação e deploy automatizados.
- Opcional: personalização de endereço com CREATE2 (prefixo/sufixo).

## Grupos de Contratos (para reduzir custo/complexidade)

- ERC20-Minimal: ERC-20 básico (transfer/approve/transferFrom), sem admin extra.
- ERC20-Controls: ERC-20 + Ownable/Pausable/Terminate, sem venda.
- ERC20-DirectSale: ERC-20 + venda BNB/tBNB integrada (buy, buy(quantity), price getters).
- TokenSale-Separado: contrato de venda dedicado (vende um token externo ERC-20).
- Upgradeable-UUPS: versão upgradeável dos anteriores (quando o usuário optar por upgrades futuros).
- Opcional: Mint/Burn, Permit (EIP-2612), Comissões/Proxy (apenas se necessário).

Cada grupo compila apenas o necessário, reduzindo o bytecode e o custo de verificação/deploy.

## Ferramentas

- OpenZeppelin Upgradeable (quando grupo upgradeável é escolhido).
- Hardhat + hardhat-ethers + hardhat-etherscan (verificação em explorers: BscScan/Etherscan).
- Ethers.js integrado ao front para assinar deploys com a carteira do usuário.

## Passos de Deploy (UUPS exemplo OmniToken)

1. Compilar contratos.
2. Deploy da implementação V1 (`OmniToken`).
3. Deploy do proxy `ERC1967Proxy` apontando para V1 e chamando `initialize(...)`.
4. (Opcional) Upgrade para V2 (`OmniTokenV2`) com `upgradeTo()` e `initializeV2(...)`.
5. Verificação nos explorers usando Hardhat Etherscan plugin.

## Endereço Personalizado (prefixo/sufixo "cafe")

- Usar `contracts/CafeDeployer.sol` para CREATE2.
- Calcular `initCodeHash` do bytecode do contrato.
- Buscar `salt` que produz address com prefixo/sufixo desejado (ex.: "cafe").
- Estimar tempo e custo conforme número de dígitos/padrão (prefixo tende a ser mais rápido que sufixo).
- O usuário escolhe: sem personalização, sufixo "cafe" padrão, ou prefixo/sufixo custom de 4 dígitos.

## Verificação em Rede

- Coletar parâmetros do construtor ou inicializador.
- Usar API Key do explorer (BSC/Ethereum) e scripts de verificação.
- Validar compatibilidade com a rede alvo (BSC testnet/mainnet, etc.).

## Segurança e Governança

- SomenteOwner em upgrades/alterações críticas.
- Pausa e término com defaults seguros (venda desativada por padrão).
- Testnet antes de mainnet; auditoria nas versões de lógica (FILHOS).

## Integração Front-end

- Forms para selecionar grupo e preencher parâmetros.
- Botões: Validar, Compilar, Verificar, Deploy.
- Feedback de status (logs e links para explorers).
