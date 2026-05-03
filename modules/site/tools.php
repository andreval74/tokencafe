<?php
require_once __DIR__ . "/../../includes/admin-config.php";

function tc_tools_render_tile(array $tile, bool $isAdmin): void
{
  $title = (string) ($tile["title"] ?? "");
  $desc = (string) ($tile["desc"] ?? "");
  $iconClass = (string) ($tile["iconClass"] ?? "");
  $ariaLabel = (string) ($tile["ariaLabel"] ?? $title);
  $id = $tile["id"] ?? null;
  $slotComponent = (string) ($tile["slotComponent"] ?? "");

  $disabled = (bool) ($tile["disabled"] ?? false);
  $status = (string) ($tile["status"] ?? ($disabled ? "soon" : "finished"));

  $badgeText = (string) ($tile["badgeText"] ?? ($status === "finished" ? "Finalizado" : "Em Breve"));
  $badgeClass = (string) ($tile["badgeClass"] ?? ($status === "finished" ? "bg-success" : "bg-warning"));

  $href = (string) ($tile["href"] ?? "#");
  if ($status === "soon" && $href !== "#" && $href !== "") {
    $disabled = false;
  }
  $linkLabel = (string) ($tile["linkLabel"] ?? ($disabled ? "Em breve" : "Abrir"));
  $linkAriaLabel = (string) ($tile["linkAriaLabel"] ?? $linkLabel);
  $linkIconClass = (string) ($tile["linkIconClass"] ?? ($disabled ? "bi bi-hourglass-split" : "bi bi-door-open"));
  $linkClass = (string) ($tile["linkClass"] ?? ($disabled ? "tool-link btn btn-sm btn-outline-secondary rounded-3 w-100 disabled" : "tool-link btn btn-sm tc-action-btn w-100"));

  $tileClass = "tool-tile" . ($disabled ? " disabled-tile" : "");

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
    <?php if ($slotComponent !== "") { ?>
      <div class="tool-tile-slot" data-component="<?= htmlspecialchars($slotComponent, ENT_QUOTES, "UTF-8") ?>"></div>
    <?php } ?>
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
    "ariaLabel" => "Contratos",
    "iconClass" => "bi bi-file-earmark-code",
    "title" => "Contratos",
    "desc" => "Crie, implante e valide contratos",
    "href" => "index.php?page=contrato",
    "linkLabel" => "Abrir Módulo",
    "linkAriaLabel" => "Abrir Contratos",
  ],
  [
    "status" => "soon",
    "disabled" => true,
    "ariaLabel" => "Verificação",
    "iconClass" => "bi bi-check2-circle",
    "title" => "Verificação",
    "desc" => "Verifique e publique o contrato no explorer",
    "href" => "index.php?page=verifica",
    "badgeText" => "EM BREVE",
    "badgeClass" => "bg-warning",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Verificação",
    "adminOnly" => true,
  ],
  [
    "status" => "soon",
    "disabled" => true,
    "ariaLabel" => "Relatórios",
    "iconClass" => "bi bi-journal-text",
    "title" => "Relatórios",
    "desc" => "Relatórios técnicos de acesso",
    "href" => "index.php?page=logs",
    "badgeText" => "EM BREVE",
    "badgeClass" => "bg-warning",
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
    "status" => "soon",
    "ariaLabel" => "Análise de Carteira",
    "iconClass" => "bi bi-graph-up-arrow",
    "title" => "Análise de Carteira",
    "desc" => "Relatórios, insights e métricas da sua carteira conectada",
    "href" => "index.php?page=analytics",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Análise de Carteira",
    "adminOnly" => true,
  ],
  [
    "disabled" => true,
    "status" => "soon",
    "ariaLabel" => "Analise de Contratos",
    "iconClass" => "bi bi-graph-up",
    "title" => "Analise de Contratos",
    "desc" => "Relatórios, insights e métricas do seu contrato",
    "href" => "index.php?page=analytics",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Análise de Contratos",
    "adminOnly" => true,
  ],
  [
    "disabled" => true,
    "status" => "soon",
    "ariaLabel" => "Widget",
    "iconClass" => "bi bi-rocket",
    "title" => "Widget",
    "desc" => "Venda de tokens plug & play",
    "href" => "index.php?page=widget",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Widget",
    "adminOnly" => true,
  ],
  [
    "disabled" => true,
    "status" => "soon",
    "ariaLabel" => "Administração de Token",
    "iconClass" => "bi bi-coin",
    "title" => "Administração de Token",
    "desc" => "Gestão das propriedades dos tokens",
    "href" => "index.php?page=tokens",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Administração de Token",
    "adminOnly" => true,
  ],
  [
    "disabled" => true,
    "status" => "soon",
    "ariaLabel" => "Template Gallery",
    "iconClass" => "bi bi-layers",
    "title" => "Template Gallery",
    "desc" => "Explore e gerencie templates",
    "href" => "index.php?page=templates",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Template Gallery",
    "adminOnly" => true,
  ],
  [
    "disabled" => true,
    "status" => "soon",
    "ariaLabel" => "System Settings",
    "iconClass" => "bi bi-gear",
    "title" => "System Settings",
    "desc" => "Preferências e regras do sistema",
    "href" => "index.php?page=settings",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir System Settings",
    "adminOnly" => true,
  ],
  [
    "disabled" => true,
    "status" => "soon",
    "ariaLabel" => "Guia de Estilos",
    "iconClass" => "bi bi-palette",
    "title" => "Guia de Estilos",
    "desc" => "Referência de padrões de UI e CSS",
    "href" => "index.php?page=documentacao",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Guia de Estilos",
    "adminOnly" => true,
  ],
];

$isAdmin = true;

?>
<script>
  window.TOKENCAFE_IS_ADMIN = true;
</script>
<?php

$getStatus = fn ($t) => (string)($t["status"] ?? (((bool)($t["disabled"] ?? false)) ? "soon" : "finished"));
$tilesAll = $tiles;
$tilesStats = $tilesAll;
$totalModules = count($tilesStats);
$activeCount = count(array_filter($tilesStats, fn ($t) => $getStatus($t) === "finished"));
$soonCount = count(array_filter($tilesStats, fn ($t) => $getStatus($t) === "soon"));
  ?>

<div class="container-fluid px-3 px-lg-4 py-4">
  <div class="d-flex align-items-end justify-content-between flex-wrap gap-2 mb-3">
    <div>
      <div class="fw-bold text-white">Status do Sistema</div>
      <div class="text-white-50 small">Verificar saúde do sistema, se todas as funcionalidades estão operacionais e atualizadas.</div>
    </div>
  </div>

  <?php /* Contadores usados pelo componente de Status do Sistema */ ?>
  <div
    class="mb-3"
    data-component="modules/system-status/system-status-tile.php"
    data-mod-mode="<?= $isAdmin ? "admin" : "user" ?>"
    data-mod-active="<?= (int) $activeCount ?>"
    data-mod-soon="<?= (int) $soonCount ?>"
    data-mod-total="<?= (int) $totalModules ?>"
  ></div>

  <div class="d-flex align-items-end justify-content-between flex-wrap gap-2 mb-3">
    <div>
      <div class="fw-bold text-white">Módulos</div>
      <div class="text-white-50 small">Gerencie acessos por categoria</div>
    </div>
  </div>

  <!--
    OBS:
    - Removidas todas as barras de progresso (geral e por módulo) conforme solicitado.
    - Mantemos apenas indicadores de status e contagens no header de status.
  -->

  <div class="tool-tiles mb-4">
    <?php
      $tilesToRender = $isAdmin ? $tilesAll : $tiles;
      foreach ($tilesToRender as $tile) {
        tc_tools_render_tile($tile, $isAdmin);
      }
    ?>
  </div>

  <script>
    try {
      const el = document.getElementById("tcDashWalletAddress");
      const addr = (window.ethereum && window.ethereum.selectedAddress) ? window.ethereum.selectedAddress : (localStorage.getItem("tokencafe_wallet_address") || "");
      if (el) {
        el.textContent = addr ? addr : "Não Conectado";
        el.classList.remove("tc-status-ok", "tc-status-warn", "tc-status-bad");
        el.classList.add(addr ? "tc-status-ok" : "tc-status-bad");
      }
      document.addEventListener("wallet:connecting", () => {
        try {
          if (!el) return;
          el.textContent = "Conectando...";
          el.classList.remove("tc-status-ok", "tc-status-bad");
          el.classList.add("tc-status-warn");
        } catch (_) {}
      });
      document.addEventListener("wallet:connected", (e) => {
        try {
          const a = e?.detail?.account || "";
          if (el) {
            el.textContent = a ? a : "Não Conectado";
            el.classList.remove("tc-status-warn", "tc-status-bad");
            el.classList.add(a ? "tc-status-ok" : "tc-status-bad");
          }
        } catch (_) {}
      });
      document.addEventListener("wallet:disconnected", () => {
        try {
          if (el) {
            el.textContent = "Não Conectado";
            el.classList.remove("tc-status-ok", "tc-status-warn");
            el.classList.add("tc-status-bad");
          }
        } catch (_) {}
      });
    } catch (_) {}
  </script>
</div>

<div data-component="modules/modals/auth-modal.php"></div>
