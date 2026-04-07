<?php
/*
 * Entrada do Portal TokenCafe:
 * - Define qual módulo será exibido na Home
 * - Delega o render para o renderizador central (includes/render.php)
 */
try {
  $host = isset($_SERVER["HTTP_HOST"]) ? (string) $_SERVER["HTTP_HOST"] : "";
  $isLocal =
    $host === "localhost" ||
    str_starts_with($host, "localhost:") ||
    $host === "127.0.0.1" ||
    str_starts_with($host, "127.0.0.1:") ||
    $host === "::1" ||
    str_starts_with($host, "[::1]:");
  if ($isLocal) {
    ini_set("display_errors", "1");
    ini_set("display_startup_errors", "1");
    error_reporting(E_ALL);
  }
} catch (Throwable $e) {}
require_once __DIR__ . "/includes/config.php";
require __DIR__ . "/includes/render.php";

$page = isset($_GET["page"]) ? (string) $_GET["page"] : "home";
if (in_array($page, ["admin", "logs-resumo", "meu-dashboard"], true)) $page = "logs";
$resolved = tokencafe_resolve_page($page);

if ($resolved && is_file($resolved)) {
  $resolvedNorm = strtolower(str_replace("\\", "/", (string) $resolved));
  $isSiteView = str_contains($resolvedNorm, "/modules/site/") || str_ends_with($resolvedNorm, "modules/site/home.php") || str_ends_with($resolvedNorm, "modules/site/home-basica.php");
  $isAppShell = $page === "tools" || !$isSiteView;

  if ($isAppShell) {
    $guess = function_exists("__tokencafe_guess_title") ? __tokencafe_guess_title($resolved) : null;
    $options = [
      "bodyClass" => "bg-page-black",
      "showSidebar" => true,
      "headerVariant" => "module",
      "moduleHeaderTitle" => is_array($guess) && isset($guess["title"]) ? (string) $guess["title"] : "TokenCafe",
      "moduleHeaderSubtitle" => is_array($guess) && isset($guess["subtitle"]) ? (string) $guess["subtitle"] : "Dashboard",
      "moduleHeaderIcon" => is_array($guess) && isset($guess["icon"]) ? (string) $guess["icon"] : "bi-grid",
      "moduleHeaderIconAlt" => is_array($guess) && isset($guess["iconAlt"]) ? (string) $guess["iconAlt"] : "TokenCafe",
    ];

    if ($page === "tools") {
      $options["moduleHeaderTitle"] = "TokenCafe Tools";
      $options["moduleHeaderSubtitle"] = "Hub Central de Ferramentas Web3";
      $options["moduleHeaderIcon"] = "bi-tools";
      $options["moduleHeaderIconAlt"] = "Tools";
    }

    render_page($resolved, $options);
  } else {
    render_page($resolved, [
      "bodyClass" => "bg-page-black",
      "showSidebar" => false,
      "headerVariant" => "default",
    ]);
  }
} else {
  render_page(__DIR__ . "/modules/site/not-migrated.php", [
    "pageTitle" => "Módulo não migrado - TokenCafe",
    "bodyClass" => "bg-page-black",
    "showSidebar" => false,
    "headerVariant" => "default",
    "missingModule" => $page,
  ]);
}
