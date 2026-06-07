# TokenCafe — CLAUDE.md

> **Última revisão:** 2026-05-26 | Stack: PHP 8 · Vanilla JS ES Modules · Solidity ^0.8 · Hardhat · Bootstrap 5 Dark

---

## ⚡ PROTOCOLO OBRIGATÓRIO — EXECUTE ANTES DE QUALQUER TAREFA

```
╔══════════════════════════════════════════════════════════════╗
║  REGRA #0: ANTES DE ESCREVER UMA LINHA DE CÓDIGO, FAÇA:     ║
║  1. Ler este CLAUDE.md completo                              ║
║  2. Identificar módulos e arquivos envolvidos               ║
║  3. Verificar se existe código reutilizável em shared/       ║
║  4. Planejar sem quebrar a separação PHP (view) / JS (logic) ║
╚══════════════════════════════════════════════════════════════╝
```

**Checklist pré-task:**
- [ ] Li as Regras de Ouro (seção abaixo) e identifico qual se aplica?
- [ ] O código que preciso já existe em `assets/js/shared/`?
- [ ] Estou alterando um arquivo shared? → verificar TODOS os importers antes
- [ ] É alteração em contrato? → está em `contracts/core/`, não em `contracts/legado/`?
- [ ] Há risco de quebrar compatibilidade de assinatura de função?

---

## 📋 Visão Geral

**TokenCafe** é uma plataforma Web3 que democratiza a criação e deploy de tokens EVM. Usuários sem conhecimento técnico criam tokens ERC-20 com poucas configurações, pagam uma taxa e recebem o contrato deployado em produção.

| Camada | Tecnologia | Localização |
|--------|-----------|-------------|
| Portal | PHP 8 + Bootstrap 5 Dark | `index.php` → `includes/render.php` → `modules/` |
| Frontend Logic | Vanilla JS ES Modules | `assets/js/modules/` + `assets/js/shared/` |
| API (opcional) | Node.js + Express | `api/` (porta 3000) |
| Contratos | Solidity ^0.8 + Hardhat | `contracts/core/` |
| Redes alvo | BSC, ETH, Polygon, Arbitrum, Avalanche | mainnet + testnets |

**Modelo de negócio:** $25 USD por token criado → 80% plataforma + 10% indicador + 10% desconto para quem foi indicado.

---

## 🏗️ Arquitetura Real

### Fluxo de Roteamento PHP

```
http://localhost:8000/?page=contrato
  └─ index.php
       └─ includes/render.php   (roteamento + controle de acesso admin)
            └─ modules/{modulo}/{arquivo}.php  (view pura)
                  └─ <script type="module"> → assets/js/modules/{modulo}/{arquivo}.js
```

### Injeção de Dados PHP → JS

```php
<!-- CORRETO: PHP injeta dados, JS lê do global -->
<script>
  window.CONTRATO_CONFIG = <?php echo json_encode($config); ?>;
  window.TOKENCAFE_IS_ADMIN = <?php echo $isAdmin ? 'true' : 'false'; ?>;
</script>
<script type="module" src="assets/js/modules/contrato/contrato.js"></script>
```

```
NUNCA: JS inline com lógica em arquivos PHP
NUNCA: Lógica de negócio dentro de templates PHP
SEMPRE: window.MODULO_* para dados, módulo .js externo para lógica
```

### Estrutura de Diretórios Ativa

```
tokencafe/
├─ index.php                    ← Ponto de entrada único
├─ main-layout.php              ← Layout mestre (sidebar + head + footer)
├─ includes/
│  ├─ config.php                ← BASE_URL, constantes globais, ASSET_VERSION
│  ├─ render.php                ← Roteador + proteção admin por página
│  ├─ admin-config.php          ← Lógica de autenticação admin (PHP)
│  ├─ head.php                  ← <head> com assets versionados
│  ├─ header.php                ← Header fixo
│  ├─ sidebar.php               ← Menu lateral
│  └─ footer.php                ← Footer + carregamento de JS globais
│
├─ modules/                     ← Views PHP (renderização pura — zero lógica)
│  ├─ contrato/                 ← Criação de token (fluxo principal da plataforma)
│  ├─ rpc/                      ← Gerenciador de redes RPC
│  ├─ wallet/                   ← Gerenciador de carteira
│  ├─ tokens/                   ← Listagem de tokens criados
│  ├─ token-admin/              ← Administração de tokens (admin only)
│  ├─ widget/                   ← Widget de venda embeddable (em desenvolvimento)
│  ├─ link/                     ← Gerador de links compartilháveis com ?ref=
│  ├─ analytics/                ← Analytics de contratos
│  ├─ templates/                ← Template gallery (coming soon)
│  ├─ settings/                 ← Configurações do sistema (admin)
│  ├─ profile/                  ← Perfil público do criador
│  ├─ logs/                     ← Relatórios de acesso (admin only)
│  ├─ analise/                  ← Análise de carteira
│  ├─ network/                  ← Info de redes
│  ├─ suporte/                  ← IA Chat (Groq + fallback Anthropic)
│  ├─ modals/                   ← Modais globais (auth, confirm, referral, cafeIA)
│  ├─ widgets/                  ← Widgets injetáveis (cafeIA flutuante)
│  └─ site/                     ← Páginas informativas (termos, privacidade, social…)
│
├─ assets/
│  ├─ js/
│  │  ├─ shared/                ← 🔥 JS compartilhado — afeta TODA a plataforma
│  │  ├─ modules/               ← JS específico por módulo
│  │  └─ ai/                    ← Diagnóstico e IA (diagnostics.js é CRÍTICO)
│  ├─ css/
│  └─ imgs/
│
├─ contracts/
│  ├─ core/                     ← ✅ Contratos ATIVOS (usar sempre estes)
│  │  ├─ TokenCafeFactory.sol   ← Fábrica principal com referral on-chain
│  │  └─ TokenCafeERC20.sol     ← Template ERC-20 instanciado pela factory
│  └─ legado/                   ← ⚠️ DESCONTINUADOS — apenas referência histórica
│
├─ api/                         ← Backend Node.js — compilação Solidity (porta 3000)
├─ docs/                        ← Documentação técnica por módulo/feature
└─ test/                        ← Testes (Hardhat + Playwright E2E)
```

---

## 📦 Módulos — Estado Real (2026-05-29)

### ✅ Prontos e Ativos

| Módulo | Rota (`?page=`) | JS Principal | Descrição |
|--------|----------------|-------------|-----------|
| **contrato** | `contrato` | `contrato/contrato.js` + `builder.js` | Criação de token ERC-20 (fluxo central) |
| **rpc** | `rpc` | `rpc/rpc-logic.js` + `rpc/rpc-index.js` | Gerenciar redes e RPCs EVM |
| **wallet** | `wallet` | `wallet/wallet-index.js` | Carteira conectada, saldo, rede |
| **tokens** | `token-manager` | `tokens/token-manager.js` | Tokens criados (localStorage) |
| **token-add** | `token-add` | `tokens/token_add.js` | Adicionar token à lista |
| **link** | `link` | `link/link-index.js` | Gerador de links compartilháveis com `?ref=` |
| **link-token** | `link-token` | `link/link-token.js` | Recepção de link — adicionar token à carteira |
| **token-admin** | `token-admin` | `modules/token-admin-index.js` | Admin de token (mint, burn, propriedades) |
| **logs** | `logs` | `logs/logs-ui.js` | Logs admin (IP + SC) |
| **analise** | `analise` | `analise/analise-index.js` | Análise de contratos on-chain |
| **suporte** | `ia-chat` | `suporte/ia-chat.js` | Chat IA (Groq + fallback Anthropic) |
| **profile** | `profile` | `profile/user-profile.js` | Perfil público do criador |

> **Componentes compartilhados** (não são páginas, carregados via `data-component="..."`):
> - `modules/network/network-search.php` + `network-info-card.php` — busca de redes
> - `modules/contrato/contract-search.php` + `contract-actions.php` + `contract-info-card.php` — busca de contrato
> - `modules/system-status/system-status-tile.php` — painel de status do sistema
> - `includes/section-title.php`, `includes/section-footer.php`, `includes/api-status.php`

### 🔄 Em Desenvolvimento

| Módulo | Rota | Status |
|--------|------|--------|
| **widget** | `widget` | JS concluído (`widget-simple.js`) — factory pendente de deploy para ativação on-chain |
| **analytics** | `analytics` | JS refatorado — dados reais do localStorage; dados on-chain (holders/volume) aguardam TheGraph (Fase 3) |
| **contrato-avancado** | `contrato-avancado` | Configurações avançadas de contrato |

### 📋 "Em Breve" (Bloqueados)

| Módulo | Bloqueador Principal |
|--------|---------------------|
| **verifica** | `EXPLORER_API_KEY` no `.env` + ativar rota no frontend (`render.php`) |
| **templates** | Definição de catálogo de templates |
| **settings** | Configurações de sistema (UI pronta, falta backend de persistência) |

### 🔴 BLOQUEADOR CRÍTICO ATIVO

```
FACTORY_ADDRESSES em assets/js/modules/contrato/factory-config.js está VAZIO.
O flow on-chain completo (createToken via Factory) não funciona sem deploy.

Para desbloquear:
  npx hardhat run scripts/deploy-factory.js --network bscMainnet
  Adicionar endereço resultante em factory-config.js → FACTORY_ADDRESSES[56] = "0x..."
  Testar: fluxo criação de token → pagamento on-chain → evento TokenCreated
```

---

## 🔑 Regras de Ouro (NUNCA quebrar)

### 1️⃣ Separação Absoluta: PHP renderiza, JS faz lógica

```
PHP  → SOMENTE: HTML + echo $var + injeção via window.MODULO_*
JS   → TODA lógica: eventos, DOM, chamadas API, Web3, validações
```

```
NUNCA misturar responsabilidades nem pastas:
Back-end (PHP de controle/IO) fica em includes/ e endpoints (api/ ou modules/**/save-*.php).
Front-end (view) fica em modules/**.php (HTML) + assets/css (estilo) + assets/js (lógica).
```

### 2️⃣ SSOT — Single Source of Truth

Antes de criar qualquer função, verificar se ela existe em `assets/js/shared/`. Se sim: **importe**, não copie. Atualizar um shared = todos os importers recebem a melhoria automaticamente.

```js
// ✅ Correto
import { getConnectedWallet } from '../../shared/wallet-connector.js';

// ❌ Errado — duplicar a lógica de wallet no módulo
function getWallet() { /* mesma coisa que wallet-connector.js */ }
```

### 3️⃣ Erros EVM Sempre Tratados

```js
try {
  const tx = await contract.createToken(params, { value: price });
  const receipt = await tx.wait();
  return { success: true, txHash: receipt.transactionHash };
} catch (err) {
  // err.reason existe em revertes com mensagem; err.data?.message em erros custom
  const message = err.reason || err.data?.message || err.message || 'Erro desconhecido';
  return { success: false, error: message };
}
```

### 4️⃣ Módulos JS — Uma Responsabilidade Por Arquivo

Cada `.js` faz exatamente uma coisa. Arquivo com mais de 300 linhas: avaliar extração de sub-módulo.

### 5️⃣ Autonomia para Refatorar

Bug ou violação de arquitetura detectada? Refatore. Condição obrigatória: manter compatibilidade de assinatura (nome, parâmetros, retorno). Se precisar quebrar: versione (`arquivo-v1.js`) e atualize todos os importers.

### 6️⃣ Comentários Apenas Para o "Por Quê"

```js
// ❌ // Chama a função de compilação
// ✅ // Usa compile-only pois o deploy acontece via MetaMask no browser (sem chave server-side)
```

### 7️⃣ Nunca Deletar Código Ativo Sem Versionar

Arquivos substituídos ficam como `nome-v1.js` com comentário de data e motivo. Facilita rollback.

### 8️⃣ Não Criar Arquivos Desnecessários

Antes de criar um arquivo, verificar se o código pode ser adicionado a um existente. Cada arquivo tem custo de manutenção e carregamento. Manter o menor número de arquivos possível.

### 9️⃣ CSS Sempre no Arquivo de Estilos — Nunca Inline

Todo estilo visual deve estar em `assets/css/styles.css` usando classes existentes. Inline styles em templates PHP ou HTML violam a separação e tornam a manutenção visual impossível de centralizar. Criar classes novas somente quando nenhuma existente é adequada.

---

## 🧱 Smart Contracts

### Contratos Core (Usar Sempre Estes)

| Contrato | Arquivo | Descrição |
|----------|---------|-----------|
| **TokenCafeFactory** | `contracts/core/TokenCafeFactory.sol` | Deploy de ERC-20 + referral on-chain |
| **TokenCafeERC20** | `contracts/core/TokenCafeERC20.sol` | Template ERC-20 instanciado pela factory |

### Funções da Factory

```solidity
createToken(params)                                          // preço cheio, moeda nativa
createTokenWithReferral(params, referrer)                    // 90% preço; plataforma 80% + referrer 10%
createTokenWithERC20(params, currency)                       // preço cheio, ERC-20 (USDT, etc.)
createTokenWithERC20AndReferral(params, currency, referrer)  // ERC-20 + referral
```

**Modelo de taxas:** `basePrice = 100%` → criador paga `90%` → plataforma `80%` + indicador `10%` + criador economiza `10%`

### Grupos de Contratos (Estratégia de Deploy)

| Grupo | Features | Deploy Via |
|-------|---------|-----------|
| `erc20-minimal` | Transfer / Approve / TransferFrom básicos | Factory (1 tx) |
| `erc20-controls` | Ownable + Pausable + Terminate | Factory (1 tx) |
| `erc20-directsale` | ERC-20 + venda BNB integrada | Compile + Deploy |
| `tokensale-separado` | Contrato de venda dedicado para token externo | Compile + Deploy |
| `upgradeable-uups` | Proxy UUPS para upgrades futuros | Compile + Deploy |

### Contratos Legados (`contracts/legado/`)

Mantidos **apenas para referência histórica**. Não usar para novos deploys.
Ver `docs/contract-deployment.md` para tutorial de uso do `TokenSale.sol` via Remix (widget legado).

### Compilação e Testes

```bash
npm run compile                         # Compila contracts/core/
npm run test                            # 24 testes Hardhat (todos passando)
npm run test:e2e                        # Testes E2E Playwright
npx hardhat run scripts/deploy-factory.js --network bscTestnet   # Deploy factory
```

> **Hardhat config:** `paths.sources = "./contracts/core"` — evita conflito com legados.

---

## 🌐 Padrões Web3

### Conexão de Carteira

```js
// Sempre via shared/wallet-connector.js — não reimplementar
import { getConnectedWallet } from '../../shared/wallet-connector.js';
const wallet = await getConnectedWallet(); // { address, signer, provider, chainId }
```

### Chamadas On-Chain

```js
import { ethers } from 'ethers';
// Leitura (sem gas, sem carteira)
const contract = new ethers.Contract(address, ABI, provider);
const balance = await contract.balanceOf(userAddress);

// Escrita (requer signer da carteira)
const contractWithSigner = contract.connect(signer);
const tx = await contractWithSigner.transfer(to, amount);
await tx.wait(); // Aguarda confirmação on-chain
```

### Multi-Chain — Prioridade de Deploy

```
BSC Mainnet (56) → Base → Polygon → ETH Mainnet
```

Configurações de rede em `assets/js/modules/contrato/factory-config.js`.
RPCs em `assets/js/shared/data/rpcs.json`.

### Auth Modal (Carteiras)

```js
// Abrir modal de conexão de carteira:
window.authModal.show();
// ou via evento:
document.dispatchEvent(new CustomEvent('tc:open-auth-modal'));
```

Sempre presente no DOM via `includes/footer.php` + flag `$GLOBALS['__tc_auth_modal_rendered']`.

---

## 🔐 Segurança e Admin

### Sistema de Admin (Dupla Validação: PHP + JS)

```php
// PHP server-side: includes/admin-config.php
// Admin = wallet na lista fixa OU config/admins.txt OU cookie bypass ativo
```

```js
// JS client-side: assets/js/shared/admin-security.js
// Admin = wallet em ADMIN_WALLETS (validação independente do PHP)
import { checkIsAdmin } from '../../shared/admin-security.js';
```

**Páginas com bloqueio server-side (não-admin redirecionado):** `analytics`, `widget`, `templates`, `settings`, `tokens`, `token-add`, `token-manager`, `documentacao`, `verifica`

Ver `docs/ADMIN-USUARIO-REGRAS.md` para tabela completa de permissões.

### Variáveis de Ambiente

```env
# Deploy de Contracts
DEPLOYER_PRIVATE_KEY=<chave_sem_0x>
PLATFORM_WALLET=<endereço_taxas>         # ⚠️ Migrar para Gnosis Safe (risco crítico)
BASE_PRICE_WEI=<preço_em_wei>

# Admin
TOKENCAFE_ADMIN_BYPASS_KEY=<chave_secreta>
TOKENCAFE_CHIEF_ADMIN_WALLET=<wallet_principal>
TOKENCAFE_DISABLE_ADMIN_BARRIERS=false   # NUNCA true em produção

# API / Explorer
EXPLORER_API_KEY=<bscscan_ou_etherscan>  # Necessário para módulo verifica
NODE_ENV=development
PORT=3000
```

---

## 🔥 JS Shared — Arquivos Críticos

> Modificar qualquer arquivo deste grupo afeta **toda a plataforma**. Verificar todos os importers antes de alterar.

| Arquivo | Responsabilidade | Criticidade |
|---------|----------------|------------|
| `shared/base-system.js` | Click handler global, connect-wallet, mobile overlay, component loader | 🔴 Máxima |
| `ai/diagnostics.js` | Diagnóstico de erros EVM | 🔴 Máxima — importado estaticamente por base-system |
| `shared/api-config.js` | URL única da API — **NUNCA duplicar** | 🔴 Alta |
| `shared/wallet-connector.js` | Abstração Web3-Onboard | 🔴 Alta |
| `shared/admin-security.js` | Validação admin client-side | 🟡 Alta |
| `shared/contract-search.js` | Busca e interação com contratos on-chain | 🟡 Alta |
| `shared/network-search.js` | Componente declarativo de busca de redes (usado via data-component) | 🟡 Alta |
| `shared/url-params.js` | Captura `?ref=` da URL, persiste 7 dias localStorage | 🟡 Média |
| `shared/token-storage.js` | Registro localStorage de tokens criados | 🟡 Média |
| `shared/referral-share.js` | Links compartilháveis com `?ref=0xWALLET` | 🟡 Média |
| `shared/ia-widget.js` | Widget IA flutuante (CafeIA) — cria UI via JS, sem PHP | 🟢 Normal |
| `shared/tools-header.js` | Header fixo das páginas de módulo | 🟢 Normal |
| `shared/page-header.js` | Auto-inject em todas as views (render.php) | 🟢 Normal |
| `shared/network-manager.js` | Gestão de rede atual conectada | 🟢 Normal |
| `shared/shared_utilities_es6.js` | Utilitários genéricos reutilizáveis | 🟢 Normal |

---

## 📡 API Backend (Node.js)

Roda em `http://localhost:3000`. Usada principalmente para compilação Solidity server-side.

| Método | Rota | Uso |
|--------|------|-----|
| GET | `/health` | Status da API |
| POST | `/api/tokens/generate` | Gera + compila token ERC-20 |
| POST | `/api/tokens/compile-only` | Somente compila (sem gerar código-fonte) |

> **MongoDB/Redis:** Instalados mas sem uso em lógica de negócio real. Não criar novas dependências neles sem necessidade clara.

---

## 🔧 Ambiente de Desenvolvimento

```bash
npm run serve        # Portal PHP em http://localhost:8000 (obrigatório)
npm run dev          # API Node.js em http://localhost:3000 (opcional)
npm run compile      # Compilar contracts/core/
npm run test         # Hardhat tests
npm run test:e2e     # Playwright E2E
npm run lint         # ESLint
npm run format       # Prettier
npm run docs         # JSDoc
```

**ASSET_VERSION** — definido em `includes/config.php`. Versão atual: `9.49`. Incrementar ao deployar novos assets para forçar cache bust.

---

## 📝 Convenções de Código

### Nomenclatura

```js
const getUserPortfolio = async () => {}  // camelCase — funções e variáveis
const PLATFORM_FEE = 0.80;              // UPPER_SNAKE_CASE — constantes
class ContractManager {}                // PascalCase — classes
```

```php
function get_user_data() {}  // snake_case — funções PHP
$user_wallet = '';           // snake_case — variáveis PHP
define('BASE_URL', '');      // UPPER_CASE — constantes PHP
```

### Caminhos — Sempre Relativos (sem `/` inicial)

```php
✅ <script src="assets/js/modules/contrato/contrato.js"></script>
❌ <script src="/assets/js/modules/contrato/contrato.js"></script>
```

---

## 🚀 Roadmap Técnico

### ✅ FASE 1 — Concluída (2026-05-20)

- Sistema de indicação (referral) on-chain com 24 testes Hardhat passando
- `url-params.js` — captura e persiste `?ref=` automaticamente
- `token-storage.js` — registro localStorage de tokens criados
- `token-manager.js` — lista tokens reais do usuário (sem mock data)
- `referral-share.js` — links com `?ref=wallet` embutido em todos os compartilhamentos

### 🔄 FASE 2 — Próximas Ações (Ordenadas por ROI)

| # | Tarefa | Prioridade |
|---|--------|-----------|
| 1 | Deploy `TokenCafeFactory.sol` na BSC mainnet | 🔴 Crítico |
| 2 | Preencher `factory-config.js` com endereço real | 🔴 Crítico |
| 3 | Criar Gnosis Safe para `PLATFORM_WALLET` | 🔴 Crítico |
| 4 | ✅ UI completa do Widget de Vendas | concluído — `widget-simple.js` pronto, overrides de teste removidos |
| 5 | ✅ `require(referrer != msg.sender)` no contrato (anti-auto-referral) | concluído — `TokenCafeFactory.sol` L135 e L187 já implementado |
| 6 | ✅ Endpoint `/api/explorer-getsourcecode` para módulo Verifica | concluído — `api/server.js` GET+POST implementado com Etherscan V2 |
| 7 | ✅ Refatoração fluxo deploy: carteira fixada na pág. 1, sem duplicação de saldo/billing na pág. 2 | concluído — `contrato-deploy.js`, `fee-manager.js`, `contrato-deploy.php` simplificados |
| 8 | ✅ Seção "Transações na Blockchain" pós-deploy (TX hashes de taxa + referral + deploy) | concluído — `contrato-detalhes.js`, `contract-actions.php`, `builder.js` |
| 9 | ✅ Botão "Atualizar Verificação" visível para todos quando polling expirar | concluído — `contrato-detalhes.js` |

### 📋 FASE 3 — Planejada

- Integração TheGraph para queries rápidas de eventos on-chain
- Página de perfil público do criador (`?creator=0xWALLET`)
- Analytics por token (holders únicos, volume, gráfico de atividade)
- Template gallery completa
- Módulo de verificação de contratos em explorers (BSCScan / Etherscan)

---

## ⚠️ Armadilhas Conhecidas

| # | Armadilha | Consequência | Solução |
|---|-----------|-------------|---------|
| 1 | Path `/assets/...` com barra inicial | Quebra em qualquer rota que não seja raiz | Sempre relativo: `assets/...` |
| 2 | JS inline com lógica em PHP | Viola separação + impossível de testar | Arquivo externo em `assets/js/modules/` |
| 3 | Criar novo `api-config.js` | Desincronização de URLs da API | Usar `assets/js/shared/api-config.js` |
| 4 | Deletar `ai/diagnostics.js` | base-system.js quebra → plataforma para completamente | Nunca deletar este arquivo |
| 5 | `FACTORY_ADDRESSES` vazio | Flow on-chain não funciona (cai no fee-manager como fallback) | Deploy factory + preencher config |
| 6 | `TOKENCAFE_DISABLE_ADMIN_BARRIERS=true` em produção | Qualquer usuário vira admin | Manter sempre `false` |
| 7 | Hardcoded URLs | Quebra entre local/produção | Usar `BASE_URL` (PHP) ou `window.location.origin` (JS) |
| 8 | Chaves privadas no código | Risco de segurança crítico | Sempre `.env` + `.gitignore` |
| 9 | Envelopar componentes em `tcd-card` duplicado | UI fica com “box dentro de box” e ocupa espaço vertical | Cada seção (Detalhes, Análise, etc.) deve ter seu próprio card; componentes não devem adicionar um card externo se já renderizam cards internos |
| 9 | Usar contratos de `contracts/legado/` para novos deploys | Contratos sem suporte a referral e multi-chain | Usar `contracts/core/` |
| 10 | `PLATFORM_WALLET` sem multisig | Risco de perda de receita | Gnosis Safe urgente |
| 11 | Criar `rpc-manager.js` ou `rpc-interface.js` novos no módulo rpc | Esses são os nomes dos arquivos legados deletados | Usar `rpc-logic.js` + `rpc-index.js` |
| 12 | Widget CaféIA criado como PHP (`cafeIA-widget.php`) | ia-widget.js cria o widget via JS — não usar PHP para isso | Modificar só `assets/js/shared/ia-widget.js` |
| 13 | O auto-loader do render.php procura `assets/js/modules/{viewBase}.js` | Arquivos JS mal posicionados não são carregados | Checar a convenção antes de criar um módulo JS |
| 14 | `document.querySelector(".container-fluid")` em páginas com `tools-header.php` | Pega o navbar (1º `.container-fluid` no DOM), nunca o formulário — lock/operações JS ficam no elemento errado | Ancorar em elemento único da view: `document.querySelector("#meuElemento")?.closest(".container-fluid")` |
| 15 | `fetchWalletBalance()` via `window.ethereum.request` em wallets Web3-Onboard | Falha silenciosa com WalletConnect/Coinbase → saldo retorna `null` → lock de saldo nunca dispara | Usar `state.wallet.provider.getBalance(state.wallet.address)` como método primário |
| 16 | Adicionar seletor de "carteira de cobrança" na pág. 2 (deploy) | A carteira é fixada na pág. 1 por verificação de saldo — trocar aqui causa inconsistência e confusão | A carteira de pagamento = sempre `state.wallet.signer` (definida na pág. 1, não editável no deploy) |
| 17 | Usar `signer.getBalance()` para verificar saldo na pág. de deploy | Se o usuário usa WalletConnect ou troca de carteira, o provider de `window.ethereum` pode estar em rede diferente → saldo retorna 0 falso | Usar `walletConnector.getStatus().balance` (string, mesma fonte do header) e sobrescrever `_fees.isBalanceEnough` e `_fees.balanceCrypto` após `calculateFees` |
| 18 | `hydrateOwnerHolderDefaults()` chamado em `bindUI()` no load da pág. 1 | Preenche campos owner/holder com endereço stale do localStorage (pode ser carteira de admin) | Preencher SOMENTE via evento `wallet:connected` / `wallet:accountChanged` |

---

## 📚 Documentação por Módulo / Feature

| Arquivo | Descreve |
|---------|---------|
| `docs/ADMIN-USUARIO-REGRAS.md` | Tabela completa de permissões admin vs usuário por área |
| `docs/contract-workflow-cafe.md` | Grupos de contratos e fluxo de deploy no ecossistema |
| `docs/contract-deployment.md` | Tutorial Remix IDE para TokenSale.sol (legado — usado pelo widget) |
| `docs/contract-integration.md` | Como integrar contrato de venda com o widget |
| `docs/vanity-addresses.md` | CREATE2 — geração de endereços personalizados "cafe" |
| `docs/per-wallet-cap.md` | Limite de compra por carteira no contrato TokenSale |
| `docs/offchain-delivery.md` | Entrega off-chain de tokens (fallback sem contrato de venda) |
| `docs/network-search-component.md` | Componente declarativo de busca de redes (data-component) |
| `docs/modulo-rpc.md` | Módulo RPC — arquivos, eventos, compatibilidade mobile |
| `docs/modulo-widget.md` | Módulo Widget — fluxo, contratos, arquivos JS atuais |
| `docs/verificacao-requisitos.md` | O que falta para ativar o módulo de verificação de contratos |

---

## 🔗 Links

- **GitHub:** https://github.com/andreval74/tokencafe
- **Homepage:** https://tokencafe.app
- **Memória persistente:** `.claude/memory/` (contextualiza sessões futuras do Claude Code)
