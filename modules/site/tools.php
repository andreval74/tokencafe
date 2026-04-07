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

  $attrs = [
    "class" => $tileClass,
    "aria-label" => $ariaLabel,
  ];

  if ($id) {
    $attrs["id"] = (string) $id;
  }

  if ($disabled) {
    $attrs["aria-disabled"] = "true";
  }

  if ($status === "finished") {
    $attrs["data-status"] = "finished";
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
    "ariaLabel" => "Gerenciador de Carteira",
    "iconClass" => "bi bi-wallet2",
    "title" => "Gerenciador de Carteira",
    "desc" => "Visualize as informações da sua carteira conectada.",
    "href" => "index.php?page=wallet",
    "linkLabel" => "Abrir Módulo",
    "linkAriaLabel" => "Abrir Wallet Manager",
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
    "ariaLabel" => "Link Generator",
    "iconClass" => "bi bi-link-45deg",
    "title" => "Link Generator",
    "desc" => "Links para adicionar tokens",
    "href" => "index.php?page=link",
    "linkLabel" => "Abrir Módulo",
    "linkAriaLabel" => "Abrir Link Generator",
  ],
  [
    "status" => "finished",
    "ariaLabel" => "Gerador de Contratos",
    "iconClass" => "bi bi-file-earmark-code",
    "title" => "Gerador de Contratos",
    "desc" => "Crie, implante e valide contratos",
    "href" => "index.php?page=contrato",
    "linkLabel" => "Modo Básico",
    "linkAriaLabel" => "Abrir Contracts Builder",
  ],
  [
    "status" => "finished",
    "ariaLabel" => "Logs de Contratos",
    "iconClass" => "bi bi-journal-text",
    "title" => "Relatórios de Contratos",
    "desc" => "KPIs, projeções, top páginas e dados do dia.",
    "href" => "index.php?page=logs",
    "linkLabel" => "Abrir",
    "linkAriaLabel" => "Abrir Logs do Sistema",
  ],
  [
    "status" => "finished",
    "ariaLabel" => "Suporte Técnico",
    "iconClass" => "bi bi-headset",
    "title" => "Suporte Técnico",
    "desc" => "Envie um e-mail para obter ajuda.",
    "href" => "suporte.php",
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
$isChief = function_exists("tokencafe_is_chief_admin") ? tokencafe_is_chief_admin($walletCookie) : false;
if (!$isChief && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) $isChief = true;

if (!$isChief) {
  $tiles = array_values(array_filter($tiles, fn ($t) => (string)($t["title"] ?? "") !== "Relatórios de Contratos"));
}

$activeTiles = array_values(array_filter($tiles, fn ($t) => isset($t["status"]) && (string) $t["status"] === "finished"));
$upcomingTiles = array_values(array_filter($tiles, fn ($t) => isset($t["disabled"]) && (bool) $t["disabled"]));
?>

<div class="container-fluid py-4">
  <div class="tc-tools-hero mb-4">
    <h1 class="tc-tools-hero-title mb-1">Visão Geral</h1>
    <div class="tc-tools-hero-subtitle">Centro de comando do TokenCafe.</div>
  </div>

  <div class="row g-3 mb-4">
    <div class="col-12 col-lg-8">
      <div class="card bg-dark-elevated border-secondary h-100">
        <div class="card-body">
          <div class="d-flex align-items-start justify-content-between flex-wrap gap-3">
            <div>
              <div class="text-white-50 small">Carteira conectada</div>
              <div id="tcDashWalletAddress" class="fw-bold text-white">Não Conectado</div>
              <div class="text-white-50 small mt-2">Saldo e histórico: em breve</div>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <a href="index.php?page=wallet" class="btn btn-sm tc-action-btn"><i class="bi bi-wallet2 me-1"></i>Abrir Carteira</a>
              <a href="index.php?page=rpc" class="btn btn-sm btn-outline-secondary"><i class="bi bi-diagram-3 me-1"></i>RPC Manager</a>
              <a href="index.php?page=contrato" class="btn btn-sm btn-outline-secondary"><i class="bi bi-file-earmark-code me-1"></i>Contratos</a>
            </div>
          </div>

          <div class="row g-3 mt-2">
            <div class="col-12 col-md-4">
              <div class="text-white-50 small">Módulos ativos</div>
              <div class="fw-bold text-success"><?= (int) count($activeTiles) ?></div>
            </div>
            <div class="col-12 col-md-4">
              <div class="text-white-50 small">Pendentes</div>
              <div class="fw-bold text-warning"><?= (int) count($upcomingTiles) ?></div>
            </div>
            <div class="col-12 col-md-4">
              <div class="text-white-50 small">Ambiente</div>
              <div class="fw-bold text-white">App</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col-12 col-lg-4">
      <div class="card bg-dark-elevated border-secondary h-100">
        <div class="card-body">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="fw-bold text-white">Atalhos</div>
            <span class="badge bg-secondary">Acesso rápido</span>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <a href="index.php?page=link" class="btn btn-sm tc-action-btn"><i class="bi bi-link-45deg me-1"></i>Links</a>
            <?php if ($isChief) { ?>
              <a href="index.php?page=logs" class="btn btn-sm tc-action-btn"><i class="bi bi-journal-text me-1"></i>Relatórios</a>
            <?php } ?>
            <a href="suporte.php" class="btn btn-sm btn-outline-secondary"><i class="bi bi-headset me-1"></i>Suporte</a>
          </div>
          <div class="text-white-50 small mt-3">
            Use o menu lateral para navegar entre módulos mantendo o dashboard.
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="d-flex align-items-end justify-content-between flex-wrap gap-2 mb-3">
    <div>
      <div class="fw-bold text-white">Módulos</div>
      <div class="text-white-50 small">Gerencie acessos por categoria</div>
    </div>
    <ul class="nav nav-pills" id="toolsTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="toolsActiveTab" data-bs-toggle="tab" data-bs-target="#toolsActivePane" type="button" role="tab" aria-controls="toolsActivePane" aria-selected="true">
          Ativos <span class="badge bg-success ms-1"><?= (int) count($activeTiles) ?></span>
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="toolsSoonTab" data-bs-toggle="tab" data-bs-target="#toolsSoonPane" type="button" role="tab" aria-controls="toolsSoonPane" aria-selected="false">
          Em breve <span class="badge bg-warning text-dark ms-1"><?= (int) count($upcomingTiles) ?></span>
        </button>
      </li>
    </ul>
  </div>

  <div class="tab-content">
    <div class="tab-pane fade show active" id="toolsActivePane" role="tabpanel" aria-labelledby="toolsActiveTab" tabindex="0">
      <div class="tool-tiles mb-4">
        <?php foreach ($activeTiles as $tile) { tc_tools_render_tile($tile); } ?>
      </div>
    </div>
    <div class="tab-pane fade" id="toolsSoonPane" role="tabpanel" aria-labelledby="toolsSoonTab" tabindex="0">
      <div class="tool-tiles">
        <?php foreach ($upcomingTiles as $tile) { tc_tools_render_tile($tile); } ?>
      </div>
    </div>
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
