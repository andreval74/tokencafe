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
?>

<div data-component="tools-header.php" data-icon="bi-tools" data-icon-alt="TokenCafe" data-title="TokenCafe Tools"
  data-subtitle="Hub Central de Ferramentas Web3"></div>

<div class="container py-4 bg-page-black min-vh-100">
  <div class="tc-tools-hero mb-4">
    <h1 class="tc-tools-hero-title mb-1">O que você deseja realizar?</h1>
    <div class="tc-tools-hero-subtitle">Selecione um módulo abaixo para continuar.</div>
  </div>
  <div class="row">
    <div class="col-12">
      <div class="tool-tiles">
        <?php
        foreach ($tiles as $tile) {
          tc_tools_render_tile($tile);
        }
        ?>
      </div>

    </div>
  </div>
</div>



<div data-component="modules/modals/auth-modal.php"></div>
