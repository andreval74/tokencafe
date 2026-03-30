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
  $options = [
    "bodyClass" => "bg-page-black",
    "showSidebar" => false,
  ];

  if ($page === "tools") {
    $options["headerVariant"] = "module";
    $options["showHeader"] = false;
  }

  render_page($resolved, $options);
} else {
  render_page(__DIR__ . "/modules/site/not-migrated.php", [
    "pageTitle" => "Módulo não migrado - TokenCafe",
    "bodyClass" => "bg-page-black",
    "showSidebar" => false,
    "missingModule" => $page,
  ]);
}
