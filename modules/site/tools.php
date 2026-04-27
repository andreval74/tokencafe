<?php
require_once __DIR__ . "/../../includes/admin-config.php";

function tc_tools_render_tile(array $tile): void
{
  $title = (string) ($tile["title"] ?? "");
  $desc = (string) ($tile["desc"] ?? "");
  $iconClass = (string) ($tile["iconClass"] ?? "");
  $ariaLabel = (string) ($tile["ariaLabel"] ?? $title);
  $id = $tile["id"] ?? null;

  $disabled = (bool) ($tile["disabled"] ?? false);
  $status = (string) ($tile["status"] ?? ($disabled ? "soon" : "finished"));

  $badgeText = (string) ($tile["badgeText"] ?? ($status === "finished" ? "Finalizado" : "Em Breve"));
  $badgeClass = (string) ($tile["badgeClass"] ?? ($status === "finished" ? "bg-success" : "bg-warning"));

  $href = (string) ($tile["href"] ?? "#");
  $linkLabel = (string) ($tile["linkLabel"] ?? ($disabled ? "Em breve" : "Abrir"));
  $linkAriaLabel = (string) ($tile["linkAriaLabel"] ?? $linkLabel);
  $linkIconClass = (string) ($tile["linkIconClass"] ?? ($disabled ? "bi bi-hourglass-split" : "bi bi-door-open"));
  $linkClass = (string) ($tile["linkClass"] ?? ($disabled ? "tool-link btn btn-sm btn-outline-secondary rounded-3 w-100 disabled" : "tool-link btn btn-sm tc-action-btn w-100"));

  $tileClass = "tool-tile" . ($disabled ? " disabled-tile" : "");
  $adminOnly = (bool) ($tile["adminOnly"] ?? false);

  $attrs = [
    "class" => $tileClass,
    "aria-label" => $ariaLabel,
    "data-status" => $status,
    "data-badge-text" => $badgeText,
    "data-badge-class" => $badgeClass,
    "data-href" => $href,
    "data-link-label" => $linkLabel,
    "data-link-aria-label" => $linkAriaLabel,
    "data-link-icon-class" => $linkIconClass,
    "data-link-class" => $linkClass,
  ];

  if ($id) {
    $attrs["id"] = (string) $id;
  }

  if ($disabled) {
    $attrs["aria-disabled"] = "true";
  }

  if ($adminOnly) $attrs["data-admin-only"] = "true";

  $attrStr = "";
  foreach ($attrs as $key => $value) {
    $attrStr .= " " . htmlspecialchars((string) $key, ENT_QUOTES, "UTF-8") . '="' . htmlspecialchars((string) $value, ENT_QUOTES, "UTF-8") . '"';
  }
?>

  <div<?= $attrStr ?>>
    <span class="tool-tile-status badge <?= htmlspecialchars($badgeClass, ENT_QUOTES, "UTF-8") ?>"><?= htmlspecialchars($badgeText, ENT_QUOTES, "UTF-8") ?></span>
    <div class="tool-tile-icon"><i class="<?= htmlspecialchars($iconClass, ENT_QUOTES, "UTF-8") ?>"></i></div>
    <div class="tool-tile-title"><?= htmlspecialchars($title, ENT_QUOTES, "UTF-8") ?></div>
    <div class="tool-tile-desc"><?= htmlspecialchars($desc, ENT_QUOTES, "UTF-8") ?></div>
    <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
      <?php if ($disabled) { ?>
        <a href="#" class="<?= htmlspecialchars($linkClass, ENT_QUOTES, "UTF-8") ?>" tabindex="-1" aria-disabled="true">
          <i class="<?= htmlspecialchars($linkIconClass, ENT_QUOTES, "UTF-8") ?> me-1"></i>
          <?= htmlspecialchars($linkLabel, ENT_QUOTES, "UTF-8") ?>
        </a>
      <?php } else { ?>
        <a href="<?= htmlspecialchars($href, ENT_QUOTES, "UTF-8") ?>" class="<?= htmlspecialchars($linkClass, ENT_QUOTES, "UTF-8") ?>" aria-label="<?= htmlspecialchars($linkAriaLabel, ENT_QUOTES, "UTF-8") ?>">
          <i class="<?= htmlspecialchars($linkIconClass, ENT_QUOTES, "UTF-8") ?> me-1"></i>
          <?= htmlspecialchars($linkLabel, ENT_QUOTES, "UTF-8") ?>
        </a>
      <?php } ?>
    </div>
    </div>

  <?php
}

$tiles = [
  [
    "status" => "finished",
    "ariaLabel" => "Carteira",
    "iconClass" => "bi bi-wallet2",
    "title" => "Carteira",
    "desc" => "Informações da sua carteira conectada",
    "href" => "index.php?page=wallet",
    "linkLabel" => "Abrir Módulo",
    "linkAriaLabel" => "Abrir Carteira",
  ],
  [
    "status" => "finished",
    "ariaLabel" => "RPC Manager",
    "iconClass" => "bi bi-diagram-3",
    "title" => "RPC Manager",
    "desc" => "Conexões RPC e redes",
    "href" => "index.php?page=rpc",
    "linkLabel" => "Abrir Módulo",
    "linkAriaLabel" => "Abrir RPC Manager",
  ],
  [
    "status" => "finished",
    "ariaLabel" => "Gerador de Links",
    "iconClass" => "bi bi-link-45deg",
    "title" => "Gerador de Links",
    "desc" => "Links para adicionar tokens",
    "href" => "index.php?page=link",
    "linkLabel" => "Abrir Módulo",
    "linkAriaLabel" => "Abrir Gerador de Links",
  ],
  [
    "status" => "finished",
    "ariaLabel" => "Contratos",
    "iconClass" => "bi bi-file-earmark-code",
    "title" => "Contratos",
    "desc" => "Crie, implante e valide contratos",
    "href" => "index.php?page=contrato",
    "linkLabel" => "Abrir Módulo",
    "linkAriaLabel" => "Abrir Contratos",
  ],
  [
    "status" => "finished",
    "ariaLabel" => "Verificação",
    "iconClass" => "bi bi-check2-circle",
    "title" => "Verificação",
    "desc" => "Verifique e publique o contrato no explorer",
    "href" => "index.php?page=verifica",
    "linkLabel" => "Abrir Módulo",
    "linkAriaLabel" => "Abrir Verificação",
  ],
  [
    "status" => "finished",
    "ariaLabel" => "Relatórios",
    "iconClass" => "bi bi-journal-text",
    "title" => "Relatórios",
    "desc" => "Relatórios técnicos de acesso",
    "href" => "index.php?page=logs",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Logs do Sistema",
    "adminOnly" => true,
  ],
  [
    "status" => "finished",
    "ariaLabel" => "Suporte",
    "iconClass" => "bi bi-headset",
    "title" => "Suporte",
    "desc" => "Envie um e-mail para obter ajuda.",
    "href" => "index.php?page=suporte",
    "linkLabel" => "Suporte Via Email",
    "linkAriaLabel" => "Abrir Suporte Técnico",
    "linkIconClass" => "bi bi-email",
  ],
  [
    "disabled" => true,
    "ariaLabel" => "Análise de Carteira",
    "iconClass" => "bi bi-graph-up-arrow",
    "title" => "Análise de Carteira",
    "desc" => "Relatórios, insights e métricas da sua carteira conectada",
  ],
  [
    "disabled" => true,
    "ariaLabel" => "Analise de Contratos",
    "iconClass" => "bi bi-graph-up",
    "title" => "Analise de Contratos",
    "desc" => "Relatórios, insights e métricas do seu contrato",
  ],
  [
    "disabled" => true,
    "ariaLabel" => "Widget",
    "iconClass" => "bi bi-rocket",
    "title" => "Widget",
    "desc" => "Venda de tokens plug & play",
  ],
  [
    "disabled" => true,
    "ariaLabel" => "Administração de Token",
    "iconClass" => "bi bi-coin",
    "title" => "Administração de Token",
    "desc" => "Gestão das propriedades dos tokens",
  ],
  [
    "disabled" => true,
    "ariaLabel" => "Template Gallery",
    "iconClass" => "bi bi-layers",
    "title" => "Template Gallery",
    "desc" => "Explore e gerencie templates",
  ],
  [
    "disabled" => true,
    "ariaLabel" => "System Settings",
    "iconClass" => "bi bi-gear",
    "title" => "System Settings",
    "desc" => "Preferências e configurações do sistema",
  ],
  [
    "disabled" => true,
    "ariaLabel" => "System Status",
    "id" => "systemStatusTile",
    "iconClass" => "bi bi-heart-pulse",
    "title" => "System Status",
    "desc" => "Verificar saúde do sistema, se todas as funcionalidades estão operacionais e atualizadas.",
  ],
  [
    "disabled" => true,
    "ariaLabel" => "Guia de Estilos",
    "iconClass" => "bi bi-palette",
    "title" => "Guia de Estilos",
    "desc" => "Referência de padrões de UI e CSS",
  ],
];

$walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$isAdmin = function_exists("tokencafe_is_admin_wallet") ? tokencafe_is_admin_wallet($walletCookie) : false;
if (
  !$isAdmin
  && trim($walletCookie) === ""
  && function_exists("tokencafe_is_admin_bypass_active")
  && tokencafe_is_admin_bypass_active()
) $isAdmin = true;

$getStatus = fn ($t) => (string)($t["status"] ?? (((bool)($t["disabled"] ?? false)) ? "soon" : "finished"));

if (!$isAdmin) {
  // Usuário comum: exibe somente módulos ativos (sem "Em breve" e sem tiles de administração).
  $tiles = array_values(array_filter($tiles, fn ($t) => $getStatus($t) === "finished" && !(bool) ($t["adminOnly"] ?? false)));
}

$allTiles = array_values($tiles);
$activeTiles = array_values(array_filter($tiles, fn ($t) => $getStatus($t) === "finished"));
$upcomingTiles = array_values(array_filter($tiles, fn ($t) => $getStatus($t) === "soon"));
  ?>

<div class="container-fluid px-3 px-lg-4 py-4">
  <div class="d-flex align-items-end justify-content-between flex-wrap gap-2 mb-3">
    <div>
      <div class="fw-bold text-white">Módulos</div>
      <div class="text-white-50 small">Gerencie acessos por categoria</div>
    </div>
    <ul class="nav nav-pills tc-tools-tabs" id="toolsTabs" role="tablist">
      <?php if ($isAdmin) { ?>
        <li class="nav-item" role="presentation">
          <button class="nav-link tc-tools-tab active" id="toolsAllTab" data-bs-toggle="tab" data-bs-target="#toolsAllPane" type="button" role="tab" aria-controls="toolsAllPane" aria-selected="true">
            Todos <span class="badge tc-tools-tab-badge ms-1"><?= (int) count($allTiles) ?></span>
          </button>
        </li>
      <?php } ?>
      <li class="nav-item" role="presentation">
        <button class="nav-link tc-tools-tab <?= $isAdmin ? "" : "active" ?>" id="toolsActiveTab" data-bs-toggle="tab" data-bs-target="#toolsActivePane" type="button" role="tab" aria-controls="toolsActivePane" aria-selected="<?= $isAdmin ? "false" : "true" ?>">
          Ativos <span class="badge tc-tools-tab-badge ms-1"><?= (int) count($activeTiles) ?></span>
        </button>
      </li>
      <?php if ($isAdmin) { ?>
        <li class="nav-item" role="presentation">
          <button class="nav-link tc-tools-tab" id="toolsSoonTab" data-bs-toggle="tab" data-bs-target="#toolsSoonPane" type="button" role="tab" aria-controls="toolsSoonPane" aria-selected="false">
            Em breve <span class="badge tc-tools-tab-badge ms-1"><?= (int) count($upcomingTiles) ?></span>
          </button>
        </li>
      <?php } ?>
    </ul>
  </div>

  <div class="tab-content">
    <?php if ($isAdmin) { ?>
      <div class="tab-pane fade show active" id="toolsAllPane" role="tabpanel" aria-labelledby="toolsAllTab" tabindex="0">
        <div class="tool-tiles mb-4">
          <?php foreach ($allTiles as $tile) { tc_tools_render_tile($tile); } ?>
        </div>
      </div>
    <?php } ?>
    <div class="tab-pane fade <?= $isAdmin ? "" : "show active" ?>" id="toolsActivePane" role="tabpanel" aria-labelledby="toolsActiveTab" tabindex="0">
      <div class="tool-tiles mb-4">
        <?php foreach ($activeTiles as $tile) { tc_tools_render_tile($tile); } ?>
      </div>
    </div>
    <?php if ($isAdmin) { ?>
      <div class="tab-pane fade" id="toolsSoonPane" role="tabpanel" aria-labelledby="toolsSoonTab" tabindex="0">
        <div class="tool-tiles">
          <?php foreach ($upcomingTiles as $tile) { tc_tools_render_tile($tile); } ?>
        </div>
      </div>
    <?php } ?>
  </div>

  <script>
    try {
      const el = document.getElementById("tcDashWalletAddress");
      const addr = (window.ethereum && window.ethereum.selectedAddress) ? window.ethereum.selectedAddress : (localStorage.getItem("tokencafe_wallet_address") || "");
      if (el) el.textContent = addr ? addr : "Não Conectado";
      document.addEventListener("wallet:connected", (e) => {
        try {
          const a = e?.detail?.account || "";
          if (el) el.textContent = a ? a : "Não Conectado";
        } catch (_) {}
      });
      document.addEventListener("wallet:disconnected", () => {
        try {
          if (el) el.textContent = "Não Conectado";
        } catch (_) {}
      });
    } catch (_) {}
  </script>
</div>

<div data-component="modules/modals/auth-modal.php"></div>
