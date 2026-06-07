<?php
/* ============================================================================
   CONFIG.PHP — Configurações globais do portal TokenCafe
   Define BASE_URL, constantes de ambiente (dev/prod), locale,
   e helpers de segurança usados por todos os módulos PHP.
   Incluído por main-layout.php antes de qualquer módulo ser carregado.
   ============================================================================ */

if (!defined("BASE_URL")) {
  $base = "/";
  $scriptName = isset($_SERVER["SCRIPT_NAME"]) ? (string) $_SERVER["SCRIPT_NAME"] : "";
  if ($scriptName !== "") {
    $dir = str_replace("\\", "/", dirname($scriptName));
    if ($dir === "" || $dir === ".") $dir = "/";
    if ($dir !== "/" && !str_starts_with($dir, "/")) $dir = "/" . $dir;
    $base = $dir;
  }
  if (!str_starts_with($base, "/")) $base = "/" . $base;
  if (!str_ends_with($base, "/")) $base .= "/";
  define("BASE_URL", $base);
}

if (!defined("ASSET_VERSION")) {
  define("ASSET_VERSION", "9.82");
}

if (!function_exists("tokencafe_asset_url")) {
  function tokencafe_asset_url(string $path): string
  {
    $path = ltrim($path, "/");
    if ($path === "") return $path;
    if (str_contains($path, "://")) return $path;
    if (!str_starts_with($path, "assets/")) return $path;
    if (str_contains($path, "?")) return $path;

    $projectRoot = dirname(__DIR__);
    $fsPath = $projectRoot . DIRECTORY_SEPARATOR . str_replace("/", DIRECTORY_SEPARATOR, $path);
    $v = null;
    if (is_file($fsPath)) {
      $t = @filemtime($fsPath);
      if ($t !== false) $v = (string) $t;
    }
    if ($v === null) $v = defined("ASSET_VERSION") ? (string) ASSET_VERSION : "1";
    return $path . "?v=" . rawurlencode($v);
  }
}

if (!defined("TOKENCAFE_MAINTENANCE_MODE")) {
  $env = getenv("TOKENCAFE_MAINTENANCE_MODE");
  if ($env !== false) {
    $envVal = strtolower(trim((string) $env));
    define("TOKENCAFE_MAINTENANCE_MODE", in_array($envVal, ["1", "true", "yes", "on"], true));
  } else {
    define("TOKENCAFE_MAINTENANCE_MODE", false);
  }
}
