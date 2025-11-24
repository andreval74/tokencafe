# Copilot Automatic – Integração do Contracts Builder com o Ecossistema TokenCafe

Este documento descreve a integração do novo módulo Contracts Builder ao fluxo automatizado (Validar → Compilar → Verificar → Deploy), alinhado às experiências dos projetos xcafe e 20lab.app, mas com uma estrutura nova e focada em usuários sem prática com cripto.

## Visão Geral

- Painel principal: `pages/tools.html` com um tile para abrir o Contracts Builder.
- Módulo: `pages/modules/contracts/index.html` com formulários simples e claros.
- Script: `js/modules/contracts/builder.js` com validação, conexão de carteira e placeholders para compilação/verificação/deploy.
- Documentação complementar: `docs/contract-workflow-cafe.md` (fluxo de contratos), `docs/vanity-addresses.md` (endereços personalizados) e `contracts/CafeDeployer.sol` (CREATE2).

## Grupos de Contratos (Modulares e Leves)

- `ERC20-Minimal`: token básico (nome, símbolo, decimais, supply inicial).
- `ERC20-Controls`: pausas, bloqueios, segurança operacional.
- `ERC20-DirectSale`: venda integrada BNB/tBNB com parâmetros (preço, limites, tesouraria).
- `Upgradeable-UUPS (OmniToken)`: evolução via proxy, mantendo endereço fixo.
- `TokenSale-Separado`: contrato de venda externo ao token (opcional).

## Fluxo de Usuário

1. Abrir `Tools` e clicar em `Contracts Builder`.
2. Selecionar o grupo de contrato e a rede de destino.
3. Preencher parâmetros do token; quando aplicável, preencher parâmetros de venda.
4. Opcional: escolher personalização de endereço (prefixo/sufixo) via CREATE2.
5. Conectar carteira MetaMask e clicar `Validar`.
6. `Compilar`, `Verificar` e `Deploy` (placeholders que serão ligados ao backend).

## Integração Técnica

- Front-end: o módulo usa `ethers.js` para conexão de carteira e validação básica.
- Back-end (a ser integrado): Hardhat + OpenZeppelin para compilar, verificar e publicar; CafeDeployer para CREATE2.
- Padrões: semântica de preço/quantidade padronizada, segurança (ReentrancyGuard, checks-effects-interactions), UUPS com proxy para upgrades.

## Inspiração e Diferenciação

- Referência: `wizard.openzeppelin.com` para UX de composição de módulos.
- Diferenciação: nomes e agrupamentos próprios, voltados a simplicidade e onboarding, com foco em “tudo pronto” para quem não tem experiência.

## Próximos Passos

- Ligar os botões `Compilar`, `Verificar` e `Deploy` ao backend.
- Adicionar templates guiados e exemplos em cada grupo.
- Incluir métricas e logs integrados no painel Tools.
