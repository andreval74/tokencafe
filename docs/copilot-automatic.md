# Copilot Automatic – Integração do Contracts Builder com o Ecossistema TokenCafe

Este documento descreve a integração do módulo Contracts Builder e demais ferramentas do ecossistema (Token Manager, Verificador, Widgets) ao fluxo automatizado, garantindo uma experiência de usuário fluida e padronizada.

## Visão Geral

- **Painel principal**: `pages/tools.html` com tiles para abrir os módulos.
- **Módulo Contracts Builder**: `pages/modules/contrato/contrato-index.html` (antigo contracts/index.html) com suporte a BigInt para supplies massivos e deploy CREATE2.
- **Módulo Token Manager**: `pages/modules/tokens/token-add.html` para criação rápida de tokens ERC-20.
- **Módulo Verificador**: `pages/modules/verifica/verifica-index.html` para verificação de contratos no Explorer.
- **Módulo Widgets**: `pages/modules/widget/widget-index.html` e `widget-criar.html` para geração de widgets de venda.
- **Módulo Perfil**: `pages/modules/profile/user-profile.html` para gestão de identidade e visualização de ativos.
- **Módulo Links**: `pages/modules/link/link-index.html` para geração de links de compartilhamento.
- **Módulo RPC**: `pages/modules/rpc/rpc-index.html` para gestão de conexões de rede.
- **Script Central**: `js/shared/base-system.js` gerenciando utilitários globais (copiar, sanitização, toasts, conexão de carteira).

## Padrões de Interface e UX (Atualizado)

### 1. Botões "Limpar Dados"

- **Requisito**: Todos os formulários devem possuir um botão "Limpar Dados" ao final.
- **ID Padrão**: `#btnClearForm` ou `#btnClearData` / `#btnClearAll`.
- **Estilo**: Bootstrap 5, outline secondary.
  ```html
  <button id="btnClearForm" class="btn btn-outline-secondary">
    <i class="bi bi-eraser me-1"></i>
    Limpar Dados
  </button>
  ```
- **Comportamento**: Reseta o estado do formulário, limpa campos (inputs, selects, checkboxes), remove mensagens de validação e reseta variáveis de estado internas. **Importante**: Deve reabilitar botões de ação (Verificar/Validar) que foram desabilitados após sucesso.
- **Implementação**: Contracts Builder, Token Manager, Verificador, Widgets, Perfil, Links, RPC, Configurações, Analytics.

### 2. Ícones de Cópia

- **Requisito**: Todos os campos que exibem endereços de contrato, hashes de transação, códigos fonte ou links gerados devem possuir um botão de cópia ao lado.
- **Estilo**: Bootstrap Icons (`bi-clipboard`).
  ```html
  <button class="btn btn-outline-info" onclick="copyToClipboard('valor')" title="Copiar">
    <i class="bi bi-clipboard"></i>
  </button>
  ```
- **Função Global**: Utiliza `window.copyToClipboard(text)` (definida em `base-system.js`) para a ação de cópia.
- **Feedback**: Deve exibir uma mensagem de sucesso padronizada via `window.showFormSuccess("Endereço copiado!")` (toast/notificação).
- **Cobertura**: Endereços de carteira (Perfil), Contratos (Builder/Manager), Transações, Links Gerados.

### 3. Feedback de Verificação e Estado de Botões

- **Padrão Visual**: Utilização de **Bootstrap Modals** (`#verifyInfoModal`) para exibir o resultado da verificação.
- **Estados**:
  - **Sucesso**: Modal com ícone de sucesso (`bi-check-circle-fill`), mensagem detalhada (ex: "Contrato verificado com sucesso!") e botão para abrir o contrato no Explorer (se aplicável). **O botão de verificação deve mudar para um estado de "Validado" (ou ícone de check) e ser desabilitado para evitar submissões duplicadas.**
  - **Erro**: Modal com ícone de erro (`bi-exclamation-triangle-fill`) e mensagem explicativa do motivo da falha. O botão de verificação deve permanecer habilitado ou ser reabilitado para permitir nova tentativa.
  - **Pendente**: Modal com spinner de carregamento (`spinner-border`) e mensagem de progresso.
- **Fluxo de Reset**: Para realizar uma nova verificação após o sucesso (ou resetar o processo), o usuário deve utilizar o botão **"Limpar Dados"**, que limpará o formulário e reabilitará os controles.
- **Integração**: O modal e comportamento devem ser consistentes nos módulos `contrato`, `tokens` (Token Manager/Add), `verifica` e `widgets`.

### 4. Conexão de Carteira

- Ações críticas (deploy, validação, assinatura) exigem conexão de carteira via `ethers.js`.
- Se não conectado, o sistema solicita conexão (`eth_requestAccounts`) ou alerta o usuário de forma explícita.
- Feedback visual de status da carteira no header.

### 5. Padrão de Apresentação de Dados (Ficha)

- **Contexto**: Utilizado para exibir informações de leitura (carteiras, contratos conectados, recibos) onde não há edição. Substitui formulários com inputs desabilitados (`readonly`).
- **Estrutura**: Card Bootstrap (`.card`), Grid (`.row .g-2 .small`).
- **Estilo**:
  - **Labels**: Texto padrão ou `text-muted`/`text-white-50`.
  - **Valores**: `.text-tokencafe` (Laranja padrão do sistema) para destaque.
  - **Alinhamento**: `d-flex align-items-baseline gap-2` (Label + Valor na mesma linha).
- **Ações Contextuais**: Botões pequenos (`btn-sm btn-link text-white p-0`) ao lado do valor para copiar (`bi-clipboard`) ou abrir link externo (`bi-box-arrow-up-right`).
- **Navegação**: Em telas puramente informativas (como Gerenciador de Carteira), substituir o botão "Limpar Dados" por um botão **"Home"** (`btn-outline-success` com ícone `bi-house-door`) que redireciona para o painel de ferramentas (`tools.html`).

## Detalhes Técnicos Implementados

### 5. Sincronização de Estado entre Módulos

- **Objetivo**: Manter o estado de verificação consistente quando o usuário opera em múltiplas abas ou módulos (ex: verifica em `verifica-index.html` e o status deve atualizar em `contrato-index.html`).
- **Mecanismo**: Uso de eventos customizados globais (`window.dispatchEvent` / `window.addEventListener`).
- **Eventos Principais**:
  - `contract:verified`: Emitido quando um contrato é verificado com sucesso. Contém `{ address, link, status }`. Outros módulos que exibem este contrato devem atualizar seu status para "Verificado" e desabilitar botões de ação redundantes.
  - `contract:clear`: Emitido ao limpar dados, sinalizando para resetar estados dependentes.
- **Implementação**:
  - Emissor: `verifica-index.js`, `builder.js` (ao completar verificação).
  - Ouvintes: `builder.js`, `link-index.js`, `verifica-index.js`.

### Contracts Builder

- **Suporte a BigInt**: Implementado em `api/server.js` e `js/modules/contrato/builder.js` para suportar supplies acima do limite de `Number.MAX_SAFE_INTEGER` (ex: 1e26).
- **Timeout Estendido**: Ajustado para 60s para acomodar o "cold start" do tier gratuito do Render.com.
- **Fluxo**: Validar -> Compilar (Backend) -> Deploy (MetaMask) -> Verificar (Backend/Explorer).

### Verificador

- **Reset por Evento**: Escuta o evento `contract:clear` para limpar dados quando solicitado por outros módulos ou pelo botão "Limpar Dados".
- **API Wrapper**: `js/modules/verifica/verifica-index.js` gerencia chamadas ao backend e atualiza a UI.

### Widgets

- **Padronização**: Adicionados botões de "Limpar Dados" e ícones de cópia para manter consistência com o restante do sistema.
- **Layout**: Uso de Bootstrap 5 e ícones Bootstrap Icons (`bi-*`).

## Grupos de Contratos (Modulares e Leves)

- `ERC20-Minimal`: token básico (nome, símbolo, decimais, supply inicial).
- `ERC20-Controls`: pausas, bloqueios, segurança operacional.
- `ERC20-DirectSale`: venda integrada BNB/tBNB com parâmetros (preço, limites, tesouraria).
- `Upgradeable-UUPS (OmniToken)`: evolução via proxy, mantendo endereço fixo.
- `TokenSale-Separado`: contrato de venda externo ao token (opcional).

## Próximos Passos

- Manter a consistência visual em novos módulos seguindo os padrões estabelecidos neste documento.
- Monitorar limites de API do Render.com e RPCs públicos.
- Expandir templates de widgets e relatórios analíticos.
