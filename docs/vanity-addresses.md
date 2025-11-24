# Endereços Personalizados com CREATE2 ("cafe")

Este documento explica como gerar contratos com endereços contendo um prefixo ou sufixo específico (ex.: "cafe") usando CREATE2.

## Conceitos

- Address CREATE2: `addr = keccak256(0xff ++ deployer ++ salt ++ initCodeHash)[12:]`.
- `deployer`: endereço do `CafeDeployer`.
- `salt`: valor arbitrário escolhido para buscar o padrão.
- `initCodeHash`: hash do bytecode do contrato que será implantado.

## Processo

1. Calcular `initCodeHash` (com `CafeDeployer.getInitCodeHash(bytecode)`).
2. Buscar `salt` off-chain que produza o padrão desejado (prefixo/sufixo) no address.
3. Implantar com `CafeDeployer.deploy(salt, bytecode)` (ou `deployWithValue` para construtores payable).

## Prefixo vs Sufixo

- Prefixo (início do address): geralmente mais rápido de encontrar.
- Sufixo (final do address): possível, mas normalmente mais custoso computacionalmente.
- Padrão de 4 dígitos hex (ex.: "cafe"): estimativa de 1/65536 tentativas em média.

## Opções de Personalização

- Padrão do ecossistema: sufixo "cafe".
- Custom de 4 dígitos: usuário escolhe prefixo ou sufixo (ex.: "beef", "dead").
- Sem personalização: deploy direto sem busca de salt.

## Observações

- Endereço do proxy (no UUPS) deve ser o personalizado; as implementações (FILHOS) podem ter endereço qualquer.
- O custo/tempo depende do padrão e da rede; fazemos o pré-cálculo antes do deploy.
- Addresses são hexadecimais; exibição pode ser minúscula/maiúscula conforme preferir.

## Segurança

- O `CafeDeployer` é determinístico; qualquer um pode verificar o address antes do deploy.
- Registre `salt` e `initCodeHash` usados para transparência.
