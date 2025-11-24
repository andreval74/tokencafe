# Componente de Busca de Redes (Network Search)

Este componente centraliza a busca de redes blockchain por nome e Chain ID. A lista de resultados só aparece quando o usuário digita e, na página RPC, os detalhes da rede são exibidos/ocultados via botão de informações (I), não automaticamente.

## Uso

Inclua o componente via `data-component`:

```
<div data-component="shared/components/network-search.html"
     data-ns-placeholder="Digite o nome da rede ou Chain ID (ex: Ethereum, Polygon, 1, 137)"
     data-ns-min-chars="1"
     data-ns-show-popular="false">
</div>
```

- `data-ns-show-popular` deve ser `false` para que a lista não abra ao focar, aparecendo somente quando o usuário digitar.
- `data-ns-min-chars` controla o número mínimo de caracteres para iniciar a busca (padrão: `1`).
- O componente inclui dois botões ao lado do campo: `I` para alternar a visualização dos detalhes e `X` para limpar o campo.

## Eventos emitidos

- `network:search` com `{ query }` enquanto digita.
- `network:selected` com `{ network }` ao escolher um item da lista.
- `network:clear` quando o campo é apagado (via `X` ou limpeza programática).
- `network:toggleInfo` com `{ visible, network? }` ao clicar no `I` (exibe/esconde detalhes). Se `network` não for enviado, a página pode usar o `chainId` do input para recuperar.

## Integração na página RPC

O `rpc-logic.js` agora:

- Escuta `network:selected` para preencher o formulário da rede e avançar para a seção de configuração (`rpc-config-section`), sem exibir detalhes automaticamente.
- Escuta `network:toggleInfo` para mostrar/ocultar o card `selected-network-info` usando `showNetworkDetails(network)` e `hideNetworkDetails()`.
- Escuta `network:clear` para limpar o formulário e ocultar seções.

## Comportamento visual

- A lista de autocomplete não abre ao focar o campo.
- A lista aparece apenas após digitar ao menos `minChars` (padrão `1`).
- O botão `I` alterna a exibição dos detalhes abaixo do campo; novo clique oculta.
- O botão `X` limpa o campo, emite `network:clear` e oculta a lista.
- Ao selecionar uma rede, o campo é preenchido com o nome escolhido e a lista fecha.

## Observações

- Mensagens de Metamask indisponível são esperadas fora do navegador com extensão ativa e não impactam a busca.
- O componente é inicializado automaticamente em todas as instâncias presentes no DOM e suporta injeções dinâmicas via `MutationObserver`.
