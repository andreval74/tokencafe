<?php

/*
 * Renderizador central do TokenCafe:
 * - Captura o conteúdo do módulo (/modules/*) e injeta no main-layout.php
 * - Padroniza meta tags (via includes/head.php) e scripts (auto-carregamento por convenção)
 */

require_once __DIR__ . "/config.php";
require_once __DIR__ . "/admin-config.php";

function __tokencafe_relpath(string $path, string $baseDir): string
{
  $baseDir = rtrim(str_replace(["/", "\\"], DIRECTORY_SEPARATOR, $baseDir), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
  $path = str_replace(["/", "\\"], DIRECTORY_SEPARATOR, $path);
  $baseLen = strlen($baseDir);
  if (DIRECTORY_SEPARATOR === "\\") {
    $pathLower = strtolower($path);
    $baseLower = strtolower($baseDir);
    if (str_starts_with($pathLower, $baseLower)) return substr($path, $baseLen);
  } else {
    if (str_starts_with($path, $baseDir)) return substr($path, $baseLen);
  }
  return $path;
}

function __tokencafe_guess_title(string $viewPath): string
{
  $base = pathinfo($viewPath, PATHINFO_FILENAME);
  $base = preg_replace('/[-_]+/u', " ", $base);
  $base = trim($base);
  if ($base === "") return "TokenCafe";
  if (function_exists("mb_convert_case")) $base = mb_convert_case($base, MB_CASE_TITLE, "UTF-8");
  else $base = ucwords(strtolower($base));
  return $base . " - TokenCafe";
}

function __tokencafe_guess_module_header(string $viewPath): array
{
  $base = pathinfo($viewPath, PATHINFO_FILENAME);
  $dirBase = basename(dirname($viewPath));

  $norm = strtolower($base);
  if (str_ends_with($norm, "-index") || str_ends_with($norm, "_index")) {
    $base = $dirBase;
  }

  $base = preg_replace('/[-_]+/u', " ", $base);
  $base = trim($base);
  if ($base === "") $base = "Módulo";
  if (function_exists("mb_convert_case")) $title = mb_convert_case($base, MB_CASE_TITLE, "UTF-8");
  else $title = ucwords(strtolower($base));

  $titleLower = strtolower($title);
  $known = [
    "wallet" => "Gerenciador de Carteira",
    "rpc" => "Gerenciador de RPCs",
    "link" => "Gerador de Links",
    "tokens" => "Gerenciador de Tokens",
    "token manager" => "Gerenciador de Tokens",
    "token add" => "Criar Token",
    "contrato" => "Gerador de Contratos",
    "verifica" => "Verificação de Contratos",
    "settings" => "Configurações do Sistema",
    "templates" => "Template Gallery",
    "analytics" => "Analytics",
    "profile" => "Perfil",
    "admin" => "Admin Dashboard",
    "widget" => "Widget",
  ];
  if (isset($known[$titleLower])) $title = $known[$titleLower];

  return [
    "title" => $title,
    "subtitle" => "TokenCafe Tools",
    "icon" => "bi-grid",
    "iconAlt" => $title,
  ];
}

function tokencafe_resolve_page(string $page): ?string
{
  $page = strtolower(trim($page));
  $page = preg_replace('/[^a-z0-9_-]+/', "", $page);
  if ($page === "" || $page === "home") return __DIR__ . "/../modules/site/home.php";

  $map = [
    "tools" => __DIR__ . "/../modules/site/tools.php",
    "maintenance" => __DIR__ . "/../modules/site/maintenance.php",
    "wallet" => __DIR__ . "/../modules/wallet/wallet-index.php",
    "rpc" => __DIR__ . "/../modules/rpc/rpc-index.php",
    "link" => __DIR__ . "/../modules/link/link-index.php",
    "link-token" => __DIR__ . "/../modules/link/link-token.php",
    "contrato" => __DIR__ . "/../modules/contrato/contrato-index.php",
    "contrato-avancado" => __DIR__ . "/../modules/contrato/contrato-avancado.php",
    "contrato-detalhes" => __DIR__ . "/../modules/contrato/contrato-detalhes.php",
    "tokens" => __DIR__ . "/../modules/tokens/token-manager.php",
    "token-add" => __DIR__ . "/../modules/tokens/token-add.php",
    "token-manager" => __DIR__ . "/../modules/tokens/token-manager.php",
    "verifica" => __DIR__ . "/../modules/verifica/verifica-index.php",
    "settings" => __DIR__ . "/../modules/settings/system-settings.php",
    "templates" => __DIR__ . "/../modules/templates/template-gallery.php",
    "analytics" => __DIR__ . "/../modules/analytics/analytics-reports.php",
    "profile" => __DIR__ . "/../modules/profile/user-profile.php",
    "admin" => __DIR__ . "/../modules/admin/activity-dashboard.php",
    "widget" => __DIR__ . "/../modules/widget/widget-index.php",
  ];

  return $map[$page] ?? null;
}

function render_page(string $viewPath, array $options = []): void
{
  $projectRoot = dirname(__DIR__);
  $viewPathReal = $viewPath;
  if (!is_file($viewPathReal)) {
    $candidate = $projectRoot . DIRECTORY_SEPARATOR . ltrim($viewPath, "\\/");
    if (is_file($candidate)) $viewPathReal = $candidate;
  }

  if (!is_file($viewPathReal)) {
    http_response_code(404);
    echo "View não encontrada: " . htmlspecialchars((string)$viewPath, ENT_QUOTES, "UTF-8");
    return;
  }

  $host = strtolower((string)($_SERVER["HTTP_HOST"] ?? $_SERVER["SERVER_NAME"] ?? "localhost"));
  $host = preg_replace('/:\d+$/', "", $host);
  $isLocal = in_array($host, ["localhost", "127.0.0.1", "::1"], true);

  $walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
  $isAdmin = tokencafe_is_admin_wallet($walletCookie);

  $maintenanceEnabled = defined("TOKENCAFE_MAINTENANCE_MODE") ? (bool) TOKENCAFE_MAINTENANCE_MODE : false;
  $maintenancePreview = $isAdmin && isset($_GET["maintenance"]) && (string) $_GET["maintenance"] === "1";

  if (($maintenanceEnabled && !$isLocal && !$isAdmin) || $maintenancePreview) {
    $maintenanceView = $projectRoot . DIRECTORY_SEPARATOR . "modules" . DIRECTORY_SEPARATOR . "site" . DIRECTORY_SEPARATOR . "maintenance.php";
    if (is_file($maintenanceView)) {
      $viewPathReal = $maintenanceView;
      $options["showHeader"] = false;
      $options["showSidebar"] = false;
      $options["showFooter"] = false;
      $options["disableBaseSystem"] = true;
      $options["disablePageHeader"] = true;
      $options["headerVariant"] = "default";
      $options["pageTitle"] = "Manutenção - TokenCafe";
      $options["pageRobots"] = "noindex,nofollow";
    }
  }

  $pageTitle = $options["pageTitle"] ?? __tokencafe_guess_title($viewPathReal);
  $pageDescription = $options["pageDescription"] ?? null;
  $pageKeywords = $options["pageKeywords"] ?? null;
  $pageOgTitle = $options["pageOgTitle"] ?? null;
  $pageOgDescription = $options["pageOgDescription"] ?? null;
  $pageOgImage = $options["pageOgImage"] ?? null;
  $pageCanonical = $options["pageCanonical"] ?? null;
  $pageRobots = $options["pageRobots"] ?? null;
  $pageTwitterTitle = $options["pageTwitterTitle"] ?? null;
  $pageTwitterDescription = $options["pageTwitterDescription"] ?? null;
  $pageTwitterImage = $options["pageTwitterImage"] ?? null;
  $pageHeadExtra = $options["pageHeadExtra"] ?? null;

  $bodyClass = $options["bodyClass"] ?? "bg-page-black";
  $showSidebar = array_key_exists("showSidebar", $options) ? (bool) $options["showSidebar"] : true;
  $showHeader = array_key_exists("showHeader", $options) ? (bool) $options["showHeader"] : true;
  $showFooter = array_key_exists("showFooter", $options) ? (bool) $options["showFooter"] : true;

  $viewRel = __tokencafe_relpath($viewPathReal, $projectRoot);
  $viewRelNorm = strtolower(str_replace("\\", "/", $viewRel));
  $isSiteView = str_starts_with($viewRelNorm, "modules/site/") || str_contains($viewRelNorm, "/modules/site/");

  $headerVariant = $options["headerVariant"] ?? ($isSiteView ? "default" : "module");
  $mh = __tokencafe_guess_module_header($viewPathReal);
  $moduleHeaderTitle = $options["moduleHeaderTitle"] ?? $mh["title"];
  $moduleHeaderSubtitle = $options["moduleHeaderSubtitle"] ?? $mh["subtitle"];
  $moduleHeaderIcon = $options["moduleHeaderIcon"] ?? $mh["icon"];
  $moduleHeaderIconAlt = $options["moduleHeaderIconAlt"] ?? $mh["iconAlt"];

  $includeEthers = array_key_exists("includeEthers", $options) ? (bool) $options["includeEthers"] : null;

  $GLOBALS["__tokencafe_page_scripts"] = [];
  $GLOBALS["__tokencafe_page_scripts_src"] = [];

  $enqueueScript = function (string $tag, ?string $src = null) {
    $GLOBALS["__tokencafe_page_scripts"][] = $tag;
    if ($src) $GLOBALS["__tokencafe_page_scripts_src"][] = $src;
  };

  $versionedSrc = function (string $src): string {
    if (!defined("ASSET_VERSION")) return $src;
    if (str_contains($src, "://")) return $src;
    if (!str_starts_with($src, "assets/")) return $src;
    if (str_contains($src, "?")) return $src;
    return $src . "?v=" . rawurlencode((string) ASSET_VERSION);
  };

  $enqueueScriptSrc = function (string $src, array $attrs = []) use ($enqueueScript, $versionedSrc) {
    $srcForTag = $versionedSrc($src);
    $attrStr = "";
    foreach ($attrs as $k => $v) {
      if ($v === true) $attrStr .= " " . htmlspecialchars((string)$k, ENT_QUOTES, "UTF-8");
      else if ($v !== false && $v !== null) $attrStr .= " " . htmlspecialchars((string)$k, ENT_QUOTES, "UTF-8") . "=\"" . htmlspecialchars((string)$v, ENT_QUOTES, "UTF-8") . "\"";
    }
    $enqueueScript('<script src="' . htmlspecialchars($srcForTag, ENT_QUOTES, "UTF-8") . '"' . $attrStr . "></script>", $src);
  };

  $enqueueModule = function (string $src) use ($enqueueScript) {
    $enqueueScript('<script type="module" src="' . htmlspecialchars($src, ENT_QUOTES, "UTF-8") . '"></script>', $src);
  };

  $GLOBALS["enqueue_script_src"] = $enqueueScriptSrc;
  $GLOBALS["enqueue_script_module"] = $enqueueModule;

  ob_start();
  $enqueue_script_src = $enqueueScriptSrc;
  $enqueue_script_module = $enqueueModule;
  include $viewPathReal;
  $module_content = ob_get_clean();

  $autoInclude = array_key_exists("autoScripts", $options) ? (bool) $options["autoScripts"] : true;
  if ($autoInclude) {
    $viewBase = pathinfo($viewPathReal, PATHINFO_FILENAME);

    $candidates = [
      ["assets/js/modules/{$viewBase}.js", true],
      ["assets/js/modules/{$viewBase}/{$viewBase}.js", true],
      ["assets/js/{$viewBase}.js", false],
    ];

    foreach ($candidates as [$src, $isModule]) {
      $fs = $projectRoot . str_replace("/", DIRECTORY_SEPARATOR, $src);
      if (!is_file($fs)) continue;
      if (in_array($src, $GLOBALS["__tokencafe_page_scripts_src"], true)) continue;
      if ($isModule) $enqueueModule($src);
      else $enqueueScriptSrc($src, []);
    }
  }

  $disablePageHeaderOpt = array_key_exists("disablePageHeader", $options) ? (bool) $options["disablePageHeader"] : false;
  $disablePageHeaderVar = isset($disablePageHeader) ? (bool) $disablePageHeader : false;
  $disablePageHeaderFinal = $disablePageHeaderOpt || $disablePageHeaderVar;
  if (!$disablePageHeaderFinal && !in_array("assets/js/shared/page-header.js", $GLOBALS["__tokencafe_page_scripts_src"], true)) {
    $enqueueModule("assets/js/shared/page-header.js");
  }

  $pageScripts = implode("\n", $GLOBALS["__tokencafe_page_scripts"]);

  include $projectRoot . DIRECTORY_SEPARATOR . "main-layout.php";
}

