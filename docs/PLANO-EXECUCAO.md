# Plano de Execução TokenCafe

## Status do Sistema (tela `pages/tools.html`)

- Finalizado:
  - System Status `pages/tools.html:55-62`
  - Wallet Manager `pages/tools.html:65-76`
  - RPC Manager `pages/tools.html:79-90`
  - Link Generator `pages/tools.html:92-104`
  - Contracts Builder `pages/tools.html:106-118`
- Em Breve:
  - Mini Widget `pages/tools.html:120-132`
  - Gerenciador de Token `pages/tools.html:134-155`
  - Analytics `pages/tools.html:157-176`
  - Template Gallery `pages/tools.html:178-197`
  - System Settings / Dashboard (Admin) `pages/tools.html:199-228`

## Testes Agora

- [ ] API online: `GET /health` responde `ok`
- [ ] Compilação ERC‑20: `POST /api/generate-token` retorna `success` e `compilation.deployedBytecode` (`api/render-app/server.js:63-74`)
- [ ] Fallback: `POST /api/compile-only` retorna `success` e `compilation.deployedBytecode` (`api/render-app/server.js:78-82`)
- [ ] Deploy via MetaMask no Builder: endereço e tx atualizados na UI (`js/modules/contracts/builder.js:1031-1047`)
- [ ] Verificação privada automática: badge “TokenCafe” atualiza pós‑deploy (`js/modules/contracts/builder.js:892-929`)
- [ ] Leitura ERC‑20 pós‑deploy: `symbol/name/decimals/totalSupply` (`js/modules/contracts/builder.js:990-1019`)
- [ ] Widget simples (testnet): compra `buy()`/`buy(uint256)` (`assets/tokencafe-widget.min.js:572-605`)
- [ ] Compilação `TokenSale.sol`: sucesso e `deployedBytecode` gerado

## Execução Rápida (1–3 dias)

- [ ] ERC‑20 minimal: gerar, compilar e deployar (testnet → mainnet)
- [ ] Verificação privada automática pós‑deploy (sem publicar fonte)
- [ ] Contrato de venda: configurar cobrança por transação (`setPlatformFee`) (`contracts/TokenSale.sol:187-190`)
- [ ] Integrar Widget à venda (testnet) e validar compra
- [ ] Exportar “receita de deploy” (parâmetros da criação) para oficialização

## Execução Média (1–2 semanas)

- [ ] UI no Builder para configurar taxa de plataforma
- [ ] Factory de vendas para instanciar contratos com parâmetros e taxa (`contracts/TokenSaleFactory.sol:1-175`)
- [ ] Catálogo inicial (marketplace) listando vendas e preços por rede
- [ ] Relatórios de eventos (compras/fees) para dashboard
- [ ] Endpoint de deploy servidor (opcional) para automações controladas

## Execução Longo Prazo (3–6 semanas)

- [ ] Verificação oficial automatizada (Etherscan/BscScan/Sourcify) com publicação controlada de fonte
- [ ] Versões upgradeáveis (UUPS) para evolução do token
- [ ] Suporte multi‑chain ampliado (Ethereum, BSC, Polygon, Base, etc.)
- [ ] Assinaturas mensais liberando ferramentas avançadas (widget, catálogo, relatórios)
- [ ] Marketplace completo com descoberta e filtros

## Ideias / Backlog

- [ ] Endereços personalizados (vanity/CREATE2) para contratos
- [ ] Templates de venda (preço dinâmico, fases, whitelist)
- [ ] Oráculos de preço para exibir valores fiduciários
- [ ] Modo “teste‑oficial”: reaproveitar receita do testnet para clonagem na mainnet

## Controle de Progresso

- Marque os itens concluídos e registre novas ideias nesta lista.
- Priorize itens em Execução Rápida para lançar e iniciar retorno imediato.

## Histórico de Receitas

- 2025-11-14T16:15:53.485Z | export | CafeToken | chainId=97 | addr=0x0000000000000000000000000000000000000000 | tx=0xdeadbeef | group=erc20-minimal | dec=18 | supply=1000 | deployedBytecodeLen=6
- 2025-11-14T16:28:03.633Z | manual | Btcom | chainId=97 | addr=0xC13f599D809f1D74E540ea228baF2f9d5cCaE07B | tx=0xac559f154e1168af13c6b7be59148579fbef033bc4054a54a7c5c1e31eca098e | group=erc20-minimal | dec=18 | supply=1000000000 | deployedBytecodeLen=3464
- 2025-11-14T17:41:25.470Z | export | \_1teste | chainId=97 | addr=0x434A02E4D4A1c348E0a904753442a9f49b046a3F | tx=0x8c311b2603c19c81a384b6a2a803d8700c30176143f110d7e6141efa20374f24 | group=erc20-minimal | dec=18 | supply=1000000 | deployedBytecodeLen=3464
- 2025-11-14T17:50:24.831Z | import | \_1teste | chainId=97 | addr=0x434A02E4D4A1c348E0a904753442a9f49b046a3F | tx=0x8c311b2603c19c81a384b6a2a803d8700c30176143f110d7e6141efa20374f24 | group=erc20-minimal | dec=18 | supply=1000000 | deployedBytecodeLen=3464
- 2025-11-14T18:27:48.849Z | export | Btcom | chainId=97 | addr=0xBff2da28f7110495ed9a661ed77E1DdAf0d81dA8 | tx=0xfa1e4f25c75cc80160f33f4304937589bb7a43d3e579a93993e3b6b18d157915 | group=erc20-minimal | dec=18 | supply=2500000000 | deployedBytecodeLen=3464
- 2025-11-14T18:35:13.876Z | manual | SmartCafe | chainId=97 | addr=0x192212D7A0430848CBC897e5037a69f23F09EdB4 | tx=0xb216812ab334027ea69159b11395482b0a9d86da54461c027f3a70e6fa51995d | group=erc20-minimal | dec=18 | supply=1000000 | deployedBytecodeLen=3464
