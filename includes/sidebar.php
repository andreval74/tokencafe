<?php
/* ============================================================================
   SIDEBAR — Menu lateral dinâmico — grupos lidos de system-settings.json
   ============================================================================ */

$currentPage = isset($_GET["page"]) ? strtolower((string) $_GET["page"]) : "";
$currentPage = preg_replace('/[^a-z0-9_-]+/', "", $currentPage);

/* Admin detection */
$walletCookie = strtolower(trim(urldecode(isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "")));
$isAdminSidebar = function_exists("tokencafe_is_admin_wallet") ? tokencafe_is_admin_wallet($walletCookie) : false;
if (!$isAdminSidebar && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) {
  $isAdminSidebar = true;
}
$isChief = function_exists("tokencafe_is_chief_admin") ? tokencafe_is_chief_admin($walletCookie) : false;
if (!$isChief && trim($walletCookie) === "" && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) {
  $isChief = true;
}

/* Settings */
if (!function_exists('tokencafe_load_system_settings')) {
  require_once __DIR__ . "/system-config.php";
}
$_tcSidebarSettings = tokencafe_load_system_settings();
$_tcSidebarModules  = $_tcSidebarSettings['modules'] ?? [];
$_tcSidebarGroups   = $_tcSidebarSettings['groups']  ?? [];

/**
 * Estado de visibilidade de um módulo para o sidebar.
 *   ADMIN: 'coming-soon' (cinza) | 'admin-only' (azul) | 'active' (verde)
 *   USUÁRIO: 'active' se enabled=true + adminOnly=false; null caso contrário
 */
$_sidebarModState = function (string $slug) use ($_tcSidebarModules, $isAdminSidebar): ?string {
  $cfg        = $_tcSidebarModules[$slug] ?? null;
  $enabled    = (bool)(($cfg['enabled']    ?? true));
  $comingSoon = (bool)(($cfg['comingSoon'] ?? false));
  $adminOnly  = (bool)(($cfg['adminOnly']  ?? false));

  if ($isAdminSidebar) {
    if (!$enabled || $comingSoon) return 'coming-soon';
    if ($adminOnly)               return 'admin-only';
    return 'active';
  }
  if (!$enabled || $adminOnly) return null;
  return 'active';
};

/** True se pelo menos um slug do grupo tem estado visível (!= null). */
function _tc_sidebar_group_visible(array $slugs, callable $stateResolver): bool
{
  foreach ($slugs as $slug) {
    if ($stateResolver($slug) !== null) return true;
  }
  return false;
}

/**
 * Renderiza um item de navegação.
 *   coming-soon → cinza + badge "Dev"
 *   admin-only  → fundo azul + badge "ADM"
 *   active      → link normal
 */
function _tc_sidebar_item(string $slug, string $label, string $iconType, string $icon, ?string $state, string $current, bool $isSub = true): void
{
  if ($state === null) return;
  $subClass  = $isSub ? ' tc-nav-sub' : '';
  $active    = $slug === $current ? ' active' : '';
  $href      = 'index.php?page=' . htmlspecialchars($slug, ENT_QUOTES, 'UTF-8');
  $iconType  = $iconType === 'class' ? 'class' : 'bi';
  $iconHtml  = $iconType === 'class'
    ? '<i class="' . htmlspecialchars($icon, ENT_QUOTES, 'UTF-8') . '"></i>'
    : '<i class="bi ' . htmlspecialchars($icon, ENT_QUOTES, 'UTF-8') . '"></i>';
  $labelHtml = '<span>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</span>';

  if ($state === 'coming-soon') {
    echo '<a href="' . $href . '" class="tc-nav-item' . $subClass . $active . '" style="opacity:.55" title="Em breve">'
      . $iconHtml . $labelHtml
      . '<span class="ms-auto badge bg-secondary" style="font-size:.55rem;padding:.2em .4em">Dev</span></a>';
    return;
  }
  if ($state === 'admin-only') {
    // Link normal com badge ADM — sem fundo colorido
    echo '<a href="' . $href . '" class="tc-nav-item' . $subClass . $active . '">'
      . $iconHtml . $labelHtml
      . '<span class="ms-auto badge bg-primary" style="font-size:.55rem;padding:.2em .4em">ADM</span></a>';
    return;
  }
  echo '<a href="' . $href . '" class="tc-nav-item' . $subClass . $active . '">' . $iconHtml . $labelHtml . '</a>';
}

/* Ícones por slug (apresentação — não vem do settings) */
$_tcSidebarIcons = [
  'contrato'      => 'bi-file-earmark-code',
  'wallet'        => 'bi-wallet2',
  'rpc'           => 'bi-diagram-3',
  'tokens'        => 'bi-coin',
  'token-add'     => 'bi-plus-circle',
  'token-manager' => 'bi-list-check',
  'token-admin'   => 'bi-terminal-fill',
  'analise'       => 'bi-patch-check',
  'analytics'     => 'bi-graph-up-arrow',
  'widget'        => 'bi-puzzle',
  'templates'     => 'bi-layers',
  'verifica'      => 'bi-shield-check',
  'settings'      => 'bi-gear',
  'documentacao'  => 'bi-book',
  'relatorios'    => 'bi-bar-chart-line',
  'admin-painel'  => 'bi-sliders',
  'suporte'       => 'bi-envelope',
  'ia-chat'       => 'bi-robot',
  'indicar'       => 'bi-share-fill',
  'link'          => 'bi-link-45deg',
  'profile'       => 'bi-person-circle',
];
?>

<aside class="tokencafe-sidebar d-flex flex-column">
  <nav aria-label="Menu Lateral" class="flex-grow-1" id="sidebarAccordion">

    <!-- ── Início ── -->
    <a href="index.php?page=tools"
      class="tc-nav-item<?= $currentPage === 'tools' ? ' active' : '' ?> mt-1">
      <i class="bi bi-house-door-fill"></i>
      <span>Início</span>
    </a>

    <!-- ── Grupos dinâmicos (todos os módulos, incluindo adminOnly) ── -->
    <div id="tc-sidebar-dynamic-groups">
    <?php foreach ($_tcSidebarGroups as $group):
        $gId    = preg_replace('/[^a-z0-9-]/', '-', strtolower($group['id'] ?? ''));
        $gLabel = $group['label']     ?? $gId;
        $gIcon  = $group['icon']      ?? 'bi-grid';
        $gHL    = !empty($group['highlight']); // sessão com destaque: cor laranja no cabeçalho
        $gEnabled = !array_key_exists('enabled', $group) || !empty($group['enabled']);
        $domId  = 'g-dyn-' . $gId;

      // Se a sessão estiver desativada:
      // - Usuário comum não vê
      // - Admin vê tudo em modo "coming-soon" (cinza), para manutenção
      $forceComingSoon = (!$gEnabled && $isAdminSidebar);
      if (!$gEnabled && !$isAdminSidebar) continue;

        // Todos os módulos do grupo — sem filtrar adminOnly (a visibilidade é gerida por $_sidebarModState)
        $gSlugs = array_keys(array_filter(
          $_tcSidebarModules,
          fn($cfg) => ($cfg['group'] ?? '') === ($group['id'] ?? '')
        ));

      if (empty($gSlugs) || (!$forceComingSoon && !_tc_sidebar_group_visible($gSlugs, $_sidebarModState))) continue;

        $open = in_array($currentPage, $gSlugs) ? 'show' : '';
      ?>
        <button class="tc-sidebar-group-btn" type="button"
          data-bs-toggle="collapse" data-bs-target="#<?= $domId ?>"
          aria-expanded="<?= $open ? 'true' : 'false' ?>" aria-controls="<?= $domId ?>"
        <?= $gHL ? 'style="color:#f97316"' : ($forceComingSoon ? 'style="opacity:.55"' : '') ?>>
          <i class="bi <?= htmlspecialchars($gIcon, ENT_QUOTES, 'UTF-8') ?> tc-sidebar-group-icon"></i>
          <span><?= htmlspecialchars($gLabel, ENT_QUOTES, 'UTF-8') ?></span>
        <?= $forceComingSoon ? '<span class="ms-auto badge bg-secondary" style="font-size:.55rem;padding:.2em .4em">OFF</span>' : '' ?>
          <i class="bi bi-chevron-down tc-sidebar-chevron"></i>
        </button>
        <div class="collapse <?= $open ?>" id="<?= $domId ?>" data-bs-parent="#sidebarAccordion">
          <?php foreach ($gSlugs as $slug):
            $cfg   = $_tcSidebarModules[$slug] ?? [];
            $label = $cfg['label'] ?? $slug;
            $iconType = ($cfg['iconType'] ?? 'bi') === 'class' ? 'class' : 'bi';
            $icon  = $cfg['icon'] ?? ($_tcSidebarIcons[$slug] ?? 'bi-box');
            if ($iconType === 'class' && trim((string)$icon) === '') {
              $iconType = 'bi';
              $icon = $_tcSidebarIcons[$slug] ?? 'bi-box';
            }
          _tc_sidebar_item($slug, $label, $iconType, $icon, $forceComingSoon ? 'coming-soon' : $_sidebarModState($slug), $currentPage);
          endforeach; ?>
        </div>
      <?php endforeach; ?>
    </div>

    <!-- ── Módulos sem sessão (group="") — aparecem como links diretos ── -->
    <div id="tc-sidebar-ungrouped">
      <?php
      $ungroupedSlugs = array_keys(array_filter(
        $_tcSidebarModules,
        fn($cfg, $slug) => ($cfg['group'] ?? '') === '' && $slug !== 'indicar',
        ARRAY_FILTER_USE_BOTH
      ));
      $hasUngrouped = !empty($ungroupedSlugs) && _tc_sidebar_group_visible($ungroupedSlugs, $_sidebarModState);
      if ($hasUngrouped): ?>
        <hr class="my-1 tc-sidebar-hr">
        <?php foreach ($ungroupedSlugs as $slug):
          $cfg   = $_tcSidebarModules[$slug] ?? [];
          $label = $cfg['label'] ?? $slug;
          $iconType = ($cfg['iconType'] ?? 'bi') === 'class' ? 'class' : 'bi';
          $icon  = $cfg['icon'] ?? ($_tcSidebarIcons[$slug] ?? 'bi-box');
          if ($iconType === 'class' && trim((string)$icon) === '') {
            $iconType = 'bi';
            $icon = $_tcSidebarIcons[$slug] ?? 'bi-box';
          }
          _tc_sidebar_item($slug, $label, $iconType, $icon, $_sidebarModState($slug), $currentPage, false);
        endforeach; ?>
      <?php endif; ?>
    </div>

  </nav>

  <!-- ── Indicar TokenCafe (link especial de fundo — group="" por design) ── -->
  <?php if ($_sidebarModState('indicar') === 'active'): ?>
    <a href="index.php?page=indicar" class="tc-nav-item tc-nav-referral-top" title="Indique o TokenCafe e ganhe 10% de bônus">
      <i class="bi bi-share-fill"></i>
      <span>Indique &amp; Ganhe</span>
      <span class="tc-nav-referral-badge ms-auto">+10%</span>
    </a>
  <?php endif; ?>

  <!-- ── Redes Sociais ── -->
  <div class="social-icons mt-auto pt-2 pb-1 d-flex justify-content-center align-items-center gap-1">
    <a href="https://www.instagram.com/tokencafeapp/" class="text-white-50 me-2 neon-icon-hover" title="Instagram">
      <i class="fa-brands fa-instagram fs-5"></i>
    </a>
    <a href="https://twitter.com/tokencafeapp" class="text-white-50 me-2 neon-icon-hover" title="Twitter/X">
      <i class="fa-brands fa-twitter fs-5"></i>
    </a>
    <a href="https://t.me/+O5b7SFmJX2UyYWQ5" class="text-white-50 me-2 neon-icon-hover" title="Telegram">
      <i class="fa-brands fa-telegram fs-5"></i>
    </a>
    <a href="https://wa.me/5543999446606" class="text-white-50 me-2 neon-icon-hover" title="WhatsApp">
      <i class="fa-brands fa-whatsapp fs-5"></i>
    </a>
  </div>

  <script>
    (function() {
      var logoutBtn = document.getElementById("sidebar-logout-btn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", async function(e) {
          e.preventDefault();
          e.stopPropagation();
          try {
            if (typeof window.handleLogout === "function") {
              await window.handleLogout();
              return;
            }
          } catch (_) {}
          try {
            localStorage.removeItem("tokencafe_wallet_cache");
          } catch (_) {}
          try {
            sessionStorage.removeItem("tokencafe_wallet_session_authorized");
          } catch (_) {}
          try {
            window.location.replace("index.php");
          } catch (_) {}
        });
      }
    })();
  </script>
</aside>
