<?php

/**
 * Tools Dashboard — Hub central de ferramentas TokenCafe
 *
 * Fonte dos dados: system-settings.json (SSOT).
 * Tiles são gerados dinamicamente a partir de modules[], organizados pelos groups[].
 * Visibilidade determinada por tc_resolve_tile_state() — nunca inline.
 *
 * Regra de visibilidade:
 *   ADMIN  → vê TODOS os módulos. comingSoon/grupo-desativado → cinza "Em Breve".
 *   USUÁRIO → enabled=true + adminOnly=false → ATIVO. Tudo mais → oculto.
 */

require_once __DIR__ . "/../../includes/admin-config.php";

if (!function_exists('tokencafe_load_system_settings')) {
    require_once __DIR__ . "/../../includes/system-config.php";
}
$_tcSettings  = tokencafe_load_system_settings();
$_tcToolsMods = $_tcSettings['modules'] ?? [];
$_tcToolsGrps = $_tcSettings['groups']  ?? [];

// ── Constantes de compatibilidade mobile ─────────────────────────
define("TC_MOBILE_FULL",    "full");
define("TC_MOBILE_VIEW",    "view");
define("TC_MOBILE_DESKTOP", "desktop");

// ── Admin detection ───────────────────────────────────────────────
$_tcWalletKey = defined("TOKENCAFE_WALLET_COOKIE") ? (string) TOKENCAFE_WALLET_COOKIE : "tokencafe_wallet_address";
$_tcWalletRaw = isset($_COOKIE[$_tcWalletKey]) ? (string) $_COOKIE[$_tcWalletKey] : "";
$_tcWallet    = strtolower(trim(urldecode($_tcWalletRaw)));
$isAdmin      = tokencafe_is_admin_wallet($_tcWallet) || tokencafe_is_admin_bypass_active();

// ── Dados de apresentação por slug — apenas o que NÃO existe no settings ────
// label, icon, enabled, adminOnly, comingSoon, group → vêm do system-settings.json
// desc, mobile, linkLabel → específicos da tela tools
$_tcTileExtras = [
  'wallet'            => ['desc' => 'Veja seu saldo, endereço e rede conectada',                          'mobile' => TC_MOBILE_VIEW,    'linkLabel' => 'Abrir'],
  'rpc'               => ['desc' => 'Escolha a melhor conexão para a sua rede',                           'mobile' => TC_MOBILE_DESKTOP, 'linkLabel' => 'Abrir'],
  'contrato'          => ['desc' => 'Crie e publique seu token ERC-20 em poucos passos',                  'mobile' => TC_MOBILE_DESKTOP, 'linkLabel' => 'Começar'],
  'indicar'           => ['desc' => 'Compartilhe seu link e ganhe 10% a cada token criado',               'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Abrir'],
  'link'              => ['desc' => 'Gere links compartilháveis com seu código de referência',            'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Abrir'],
  'suporte'           => ['desc' => 'Fale com a equipe ou consulte as dúvidas frequentes',               'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Abrir'],
  'ia-chat'           => ['desc' => 'Assistente especialista em tokenização, ERC-20 e smart contracts',   'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Abrir'],
  'tokens'            => ['desc' => 'Gerencie todas as propriedades dos seus tokens',                     'mobile' => TC_MOBILE_VIEW,    'linkLabel' => 'Abrir'],
  'token-add'         => ['desc' => 'Adicione um token à sua lista de tokens gerenciados',                'mobile' => TC_MOBILE_VIEW,    'linkLabel' => 'Abrir'],
  'token-manager'     => ['desc' => 'Lista e gerencie todos os tokens criados pela sua carteira',         'mobile' => TC_MOBILE_VIEW,    'linkLabel' => 'Abrir'],
  'token-admin'       => ['desc' => 'Gerencie mint, burn e propriedades do seu token',                   'mobile' => TC_MOBILE_VIEW,    'linkLabel' => 'Abrir'],
  'analise'           => ['desc' => 'Analise e explore dados on-chain dos seus contratos',                'mobile' => TC_MOBILE_VIEW,    'linkLabel' => 'Abrir'],
  'analytics'         => ['desc' => 'Relatórios, insights e métricas da sua carteira',                   'mobile' => TC_MOBILE_VIEW,    'linkLabel' => 'Abrir'],
  'widget'            => ['desc' => 'Adicione a venda de tokens direto no seu site',                     'mobile' => TC_MOBILE_DESKTOP, 'linkLabel' => 'Abrir'],
  'templates'         => ['desc' => 'Modelos prontos para publicar seu token rapidamente',               'mobile' => TC_MOBILE_DESKTOP, 'linkLabel' => 'Abrir'],
  'verifica'          => ['desc' => 'Verifique e publique o código-fonte no explorer (BscScan/Etherscan)', 'mobile' => TC_MOBILE_DESKTOP, 'linkLabel' => 'Abrir'],
  'settings'          => ['desc' => 'Preferências e regras do sistema',                                  'mobile' => TC_MOBILE_DESKTOP, 'linkLabel' => 'Abrir'],
  'relatorios'        => ['desc' => 'Histórico de acessos e ações do portal TokenCafe',                  'mobile' => TC_MOBILE_DESKTOP, 'linkLabel' => 'Abrir'],
  'documentacao'      => ['desc' => 'Design system e padrões de UI',                                    'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Abrir'],
  'admin-painel'      => ['desc' => 'Controle central — módulos, contratos, permissões e features',     'mobile' => TC_MOBILE_DESKTOP, 'linkLabel' => 'Abrir'],
  'profile'           => ['desc' => 'Perfil público do criador de tokens',                               'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Abrir'],
  'privacidade'       => ['desc' => 'Política de privacidade da plataforma',                             'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Ler'],
  'termos-e-servicos' => ['desc' => 'Termos e condições de uso',                                        'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Ler'],
  'social'            => ['desc' => 'Redes sociais e comunidade TokenCafe',                              'mobile' => TC_MOBILE_FULL,    'linkLabel' => 'Ver'],
];

// ── Gera base de tiles a partir do settings ───────────────────────
// Label, icon e grupo vêm do JSON; desc/mobile/linkLabel vêm do lookup acima.
$_allTiles = [];
foreach ($_tcToolsMods as $_slug => $_cfg) {
    $_extras   = $_tcTileExtras[$_slug] ?? [];
    $_iconType = ($_cfg['iconType'] ?? 'bi') === 'class' ? 'class' : 'bi';
    $_label    = $_cfg['label'] ?? $_slug;
    $_allTiles[$_slug] = [
        'slug'          => $_slug,
        'title'         => $_label,
        'ariaLabel'     => $_label,
        'iconClass'     => $_iconType === 'class' ? $_cfg['icon'] : 'bi ' . $_cfg['icon'],
        'href'          => 'index.php?page=' . htmlspecialchars($_slug, ENT_QUOTES, 'UTF-8'),
        'desc'          => $_extras['desc']      ?? '',
        'mobile'        => $_extras['mobile']    ?? TC_MOBILE_DESKTOP,
        'linkLabel'     => $_extras['linkLabel'] ?? 'Abrir',
        'linkAriaLabel' => ($_extras['linkLabel'] ?? 'Abrir') . ' ' . $_label,
    ];
}
unset($_slug, $_cfg, $_extras, $_iconType, $_label);

// ── tc_resolve_tile_state — única fonte de lógica de visibilidade ─
//
// ADMIN:
//   enabled=false | comingSoon=true              → cinza "Em Breve" (clicável)
//   enabled=true + comingSoon=false + adminOnly  → azul "ATIVO/ADM"
//   enabled=true + comingSoon=false              → verde "ATIVO"
//
// USUÁRIO:
//   enabled=false | adminOnly=true → null (completamente oculto)
//   enabled=true + adminOnly=false → ATIVO
function tc_resolve_tile_state(array $tile, array $cfg, bool $isAdmin): ?array
{
    $enabled    = $cfg['enabled']    ?? true;
    $comingSoon = $cfg['comingSoon'] ?? false;
    $adminOnly  = $cfg['adminOnly']  ?? false;

    if ($isAdmin) {
        if (!$enabled || $comingSoon) {
            $tile['badgeText']  = 'Em Breve';
            $tile['badgeClass'] = 'bg-secondary';
            $tile['status']     = 'soon';
            $tile['disabled']   = false;
            $tile['tileStyle']  = 'opacity:.6';
            $tile['linkClass']  = 'tool-link btn btn-sm btn-outline-secondary rounded-3 w-100';
        } elseif ($adminOnly) {
            $tile['badgeText']  = 'ATIVO/ADM';
            $tile['badgeClass'] = 'bg-primary';
            $tile['status']     = 'finished';
            $tile['disabled']   = false;
            $tile['tileStyle']  = 'background:rgba(13,110,253,.1);border-color:rgba(13,110,253,.35)';
            $tile['linkClass']  = 'tool-link btn btn-sm btn-outline-primary rounded-3 w-100';
        } else {
            $tile['badgeText']  = 'ATIVO';
            $tile['badgeClass'] = 'bg-success';
            $tile['status']     = 'finished';
            $tile['disabled']   = false;
        }
        return $tile;
    }

    if (!$enabled || $adminOnly) return null;

    $tile['badgeText']  = 'ATIVO';
    $tile['badgeClass'] = 'bg-success';
    $tile['status']     = 'finished';
    $tile['disabled']   = false;
    return $tile;
}

// ── Constrói $tilesPerGroup — organização espelha o admin panel ───
// Grupos enabled=false: admin vê tiles como "Em Breve"; usuário não vê.
$tilesPerGroup = [];

foreach ($_tcToolsGrps as $_grp) {
    $_gId      = $_grp['id']    ?? '';
    $_gLabel   = $_grp['label'] ?? $_gId;
    $_gIcon    = $_grp['icon']  ?? 'bi-grid';
    $_gHL      = !empty($_grp['highlight']);
    $_gEnabled = !array_key_exists('enabled', $_grp) || !empty($_grp['enabled']);

    $_section = ['id' => $_gId, 'label' => $_gLabel, 'icon' => $_gIcon, 'highlight' => $_gHL, 'tiles' => []];

    foreach (array_keys($_tcToolsMods) as $_slug) {
        if (($_tcToolsMods[$_slug]['group'] ?? '') !== $_gId) continue;
        if (!isset($_allTiles[$_slug])) continue;

        $_cfg = $_tcToolsMods[$_slug];
        if (!$_gEnabled) {
            if (!$isAdmin) continue;
            $_cfg['comingSoon'] = true; // grupo desativado → force "Em Breve" para admin
        }

        $_resolved = tc_resolve_tile_state($_allTiles[$_slug], $_cfg, $isAdmin);
        if ($_resolved !== null) {
            $_section['tiles'][] = $_resolved;
        }
    }

    if (!empty($_section['tiles'])) {
        $tilesPerGroup[] = $_section;
    }
}

// ── Módulos sem grupo (group="") — topo sem header de seção ───────
$_ungrouped = [];
foreach ($_tcToolsMods as $_slug => $_cfg) {
    if (($_cfg['group'] ?? '') !== '') continue;
    if (!isset($_allTiles[$_slug])) continue;
    $_resolved = tc_resolve_tile_state($_allTiles[$_slug], $_cfg, $isAdmin);
    if ($_resolved !== null) $_ungrouped[] = $_resolved;
}
unset($_grp, $_gId, $_gLabel, $_gIcon, $_gHL, $_gEnabled, $_section, $_slug, $_cfg, $_resolved);

// ── Flat list para contadores do system-status-tile ───────────────
$tiles = !empty($tilesPerGroup)
    ? array_merge($_ungrouped, ...array_column($tilesPerGroup, 'tiles'))
    : $_ungrouped;

// ── Estado de sessão ──────────────────────────────────────────────
$sessionCookieRaw = isset($_COOKIE["tokencafe_wallet_session_authorized"]) ? (string) $_COOKIE["tokencafe_wallet_session_authorized"] : "";
$sessionCookieRaw = strtolower(trim(urldecode($sessionCookieRaw)));
$isConnected      = in_array($sessionCookieRaw, ["1", "true", "yes", "on"], true);

// ── Modo embed (sem header/footer) ────────────────────────────────
if (defined("TOKENCAFE_TOOLS_EMBED") && TOKENCAFE_TOOLS_EMBED) {
?>
  <div class="tool-tiles tc-tools-embed">
    <?php foreach ($tiles as $tile) { tc_tools_render_tile($tile); } ?>
  </div>
<?php
  return;
}

// ── Funções auxiliares ────────────────────────────────────────────

function tc_mobile_badge(string $mode): string
{
  switch ($mode) {
    case TC_MOBILE_FULL:
      return '<span class="tc-compat-badge tc-compat-full" title="Disponível em mobile e desktop">
                <i class="bi bi-phone"></i><i class="bi bi-laptop ms-1"></i>
              </span>';
    case TC_MOBILE_VIEW:
      return '<span class="tc-compat-badge tc-compat-view" title="Somente leitura no mobile — use o desktop para ações">
                <i class="bi bi-phone"></i><i class="bi bi-eye ms-1"></i>
              </span>';
    case TC_MOBILE_DESKTOP:
    default:
      return '<span class="tc-compat-badge tc-compat-desktop" title="Requer desktop para usar">
                <i class="bi bi-laptop"></i>
              </span>';
  }
}

function tc_tools_render_tile(array $tile): void
{
  $title         = (string) ($tile["title"]         ?? "");
  $desc          = (string) ($tile["desc"]          ?? "");
  $iconClass     = (string) ($tile["iconClass"]     ?? "");
  $ariaLabel     = (string) ($tile["ariaLabel"]     ?? $title);
  $id            = $tile["id"] ?? null;
  $slotComponent = (string) ($tile["slotComponent"] ?? "");
  $mobile        = (string) ($tile["mobile"]        ?? TC_MOBILE_DESKTOP);

  $disabled   = (bool)   ($tile["disabled"]   ?? false);
  $status     = (string) ($tile["status"]     ?? "finished");
  $badgeText  = (string) ($tile["badgeText"]  ?? "ATIVO");
  $badgeClass = (string) ($tile["badgeClass"] ?? "bg-success");

  $href          = (string) ($tile["href"] ?? "#");
  $linkLabel     = (string) ($tile["linkLabel"]     ?? ($disabled ? "Em breve" : "Abrir"));
  $linkAriaLabel = (string) ($tile["linkAriaLabel"] ?? $linkLabel);
  $linkIconClass = (string) ($tile["linkIconClass"] ?? ($disabled ? "bi bi-hourglass-split" : "bi bi-arrow-right-circle"));
  $linkClass     = (string) ($tile["linkClass"]     ?? ($disabled
    ? "tool-link btn btn-sm btn-outline-secondary rounded-3 w-100 disabled"
    : "tool-link btn btn-sm tc-action-btn w-100"));

  $tileClass   = "tool-tile" . ($disabled ? " disabled-tile" : "");
  $tileStyle   = (string) ($tile["tileStyle"] ?? "");
  $hideActions = defined("TOKENCAFE_TOOLS_HIDE_ACTIONS") && TOKENCAFE_TOOLS_HIDE_ACTIONS;

  $attrs = [
    "class"                => $tileClass,
    "aria-label"           => $ariaLabel,
    "data-status"          => $status,
    "data-badge-text"      => $badgeText,
    "data-badge-class"     => $badgeClass,
    "data-href"            => $href,
    "data-link-label"      => $linkLabel,
    "data-link-aria-label" => $linkAriaLabel,
    "data-link-icon-class" => $linkIconClass,
    "data-link-class"      => $linkClass,
  ];
  if ($id)               $attrs["id"]           = (string) $id;
  if ($disabled)         $attrs["aria-disabled"] = "true";
  if ($tileStyle !== "") $attrs["style"]         = $tileStyle;

  $attrStr = "";
  foreach ($attrs as $k => $v) {
    $attrStr .= " " . htmlspecialchars($k, ENT_QUOTES, "UTF-8") . '="' . htmlspecialchars($v, ENT_QUOTES, "UTF-8") . '"';
  }
?>
  <div<?= $attrStr ?>>
    <div class="tc-tile-badges">
      <span class="tool-tile-status badge <?= htmlspecialchars($badgeClass, ENT_QUOTES, "UTF-8") ?>">
        <?= htmlspecialchars($badgeText, ENT_QUOTES, "UTF-8") ?>
      </span>
      <?= tc_mobile_badge($mobile) ?>
    </div>
    <div class="tool-tile-icon"><i class="<?= htmlspecialchars($iconClass, ENT_QUOTES, "UTF-8") ?>"></i></div>
    <div class="tool-tile-title"><?= htmlspecialchars($title, ENT_QUOTES, "UTF-8") ?></div>
    <div class="tool-tile-desc"><?= htmlspecialchars($desc, ENT_QUOTES, "UTF-8") ?></div>
    <?php if ($slotComponent !== ""): ?>
      <div class="tool-tile-slot" data-component="<?= htmlspecialchars($slotComponent, ENT_QUOTES, "UTF-8") ?>"></div>
    <?php endif; ?>
    <?php if (!$hideActions): ?>
      <div class="tool-tile-footer">
        <?php if ($disabled): ?>
          <span class="<?= htmlspecialchars($linkClass, ENT_QUOTES, "UTF-8") ?>" aria-disabled="true">
            <i class="<?= htmlspecialchars($linkIconClass, ENT_QUOTES, "UTF-8") ?> me-1"></i>
            <?= htmlspecialchars($linkLabel, ENT_QUOTES, "UTF-8") ?>
          </span>
        <?php else: ?>
          <a href="<?= htmlspecialchars($href, ENT_QUOTES, "UTF-8") ?>"
             class="<?= htmlspecialchars($linkClass, ENT_QUOTES, "UTF-8") ?>"
             aria-label="<?= htmlspecialchars($linkAriaLabel, ENT_QUOTES, "UTF-8") ?>">
            <i class="<?= htmlspecialchars($linkIconClass, ENT_QUOTES, "UTF-8") ?> me-1"></i>
            <?= htmlspecialchars($linkLabel, ENT_QUOTES, "UTF-8") ?>
          </a>
        <?php endif; ?>
      </div>
    <?php endif; ?>
  </div>
<?php
}
?>

  <?php if (!$isConnected): ?>
    <script>window.TOKENCAFE_IS_ADMIN = false;</script>
    <div class="tc-hex-hero-wrap">
      <div class="tc-hex-card">
        <div class="tc-hex-icon mx-auto">
          <i class="bi bi-cup-hot-fill"></i>
        </div>
        <h2 class="fw-bold text-white mb-1 fs-4">TokenCafe</h2>
        <p class="text-muted mb-0" style="font-size:.85rem">Web3 Token Studio &mdash; BSC &middot; ETH &middot; Polygon</p>
        <hr class="tc-hex-divider">
        <p class="text-muted mb-0" style="font-size:.88rem">
          Conecte sua carteira para criar tokens, gerenciar contratos e acessar todas as ferramentas Web3.
        </p>
        <div class="tc-hex-actions">
          <button id="tcToolsGuestConnectBtn" class="tc-btn-primary-ds px-5 py-2">
            <i class="bi bi-wallet2 me-2"></i>Conectar Carteira
          </button>
        </div>
        <div class="mt-3 d-flex gap-2 justify-content-center flex-wrap">
          <span class="tc-net-badge">BSC</span>
          <span class="tc-net-badge">ETH</span>
          <span class="tc-net-badge">Polygon</span>
          <span class="tc-net-badge">Arbitrum</span>
        </div>
      </div>
    </div>
    <script>
      (() => {
        const btn = document.getElementById("tcToolsGuestConnectBtn");
        if (!btn) return;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          try {
            sessionStorage.setItem("tokencafe_post_connect_redirect", JSON.stringify({ href: "index.php?page=tools", ts: Date.now() }));
          } catch (_) {}
          if (window.authModal?.show) { window.authModal.show(); }
          else { document.dispatchEvent(new CustomEvent("tc:open-auth-modal")); }
        });
      })();
    </script>

  <?php else: ?>
    <script>window.TOKENCAFE_IS_ADMIN = <?= $isAdmin ? "true" : "false" ?>;</script>

    <div class="tc-hex-hero-wrap">
      <div class="tc-hex-card">
        <div class="tc-hex-icon mx-auto">
          <i class="bi bi-cup-hot-fill"></i>
        </div>

        <div class="d-flex align-items-center justify-content-center gap-2 flex-wrap mb-3">
          <span class="tc-hex-wallet">
            <i class="bi bi-circle-fill" style="font-size:.45rem;color:#4ade80;vertical-align:middle"></i>
            <span id="tcDashWalletAddress">—</span>
          </span>
          <?php if ($isAdmin): ?>
            <span class="tc-hex-admin-badge">
              <i class="bi bi-shield-check"></i> Admin
            </span>
          <?php endif; ?>
        </div>

        <h3 class="fw-bold text-white mb-1">Seu Estúdio Web3</h3>
        <p class="text-muted mb-0" style="font-size:.85rem">Crie e gerencie tokens EVM sem código</p>

        <hr class="tc-hex-divider">

        <div class="tc-hex-actions">
          <a href="index.php?page=contrato" class="tc-btn-primary-ds px-4 py-2">
            <i class="bi bi-plus-circle me-2"></i>Criar Token
          </a>
          <a href="index.php?page=token-manager" class="btn btn-outline-secondary px-4 py-2 rounded-3">
            <i class="bi bi-coin me-2"></i>Meus Tokens
          </a>
        </div>

        <div class="mt-3 d-flex gap-2 justify-content-center flex-wrap">
          <span class="tc-net-badge active">BSC</span>
          <span class="tc-net-badge">ETH</span>
          <span class="tc-net-badge">Polygon</span>
          <span class="tc-net-badge">Arbitrum</span>
          <span class="tc-net-badge">Avalanche</span>
        </div>
      </div>
    </div>

    <script>
      (() => {
        const el = document.getElementById("tcDashWalletAddress");
        const fmt = (a) => a ? a.slice(0, 6) + "..." + a.slice(-4) : "";
        const addr = (window.ethereum?.selectedAddress) || (localStorage.getItem("tokencafe_wallet_address") || "");
        const update = (a) => {
          if (!el) return;
          el.textContent = fmt(a) || "Não conectada";
        };
        update(addr);
        document.addEventListener("wallet:connecting",    () => { if (el) el.textContent = "Conectando..."; });
        document.addEventListener("wallet:connected",      (e) => update(e?.detail?.account || ""));
        document.addEventListener("wallet:disconnected",   ()  => update(""));
        document.addEventListener("wallet:accountChanged", (e) => update(e?.detail?.account || ""));
      })();
    </script>

  <?php endif; ?>
