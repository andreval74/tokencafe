<?php
/* ============================================================================
   ADMIN-CONFIG.PHP — Configurações de administração do portal TokenCafe
   Define: lista de carteiras admin (TOKENCAFE_ADMIN_WALLETS), chefe admin
   (TOKENCAFE_CHIEF_ADMIN_WALLET), cookie de bypass, desativação de barreiras
   e e-mail de arquivamento de logs.
   Inclui funções auxiliares: tokencafe_is_admin_wallet(), tokencafe_is_chief_admin(),
   tokencafe_is_admin_bypass_enabled/active(), tokencafe_check_admin_bypass_key().
   Lido em head.php (antes da página carregar) para definir flags JS de admin.
   ============================================================================ */
// Carrega configurações dinâmicas do painel de administração
if (!function_exists('tokencafe_load_system_settings')) {
  require_once __DIR__ . "/system-config.php";
}
$_tcSysSettings = tokencafe_load_system_settings();

if (!defined("TOKENCAFE_ADMIN_WALLETS")) {
  // Prioridade: system-settings.json > config/admins.txt > hardcoded
  $admins = [];
  if (!empty($_tcSysSettings['permissions']['adminWallets']) && is_array($_tcSysSettings['permissions']['adminWallets'])) {
    $admins = array_map(fn($x) => strtolower(trim((string)$x)), $_tcSysSettings['permissions']['adminWallets']);
  } else {
    $admins = ["0x0b81337f18767565d2ea40913799317a25dc4bc5"];
  }
  try {
    $adminFile = __DIR__ . "/../config/admins.txt";
    if (is_file($adminFile)) {
      $lines = file($adminFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
      if (is_array($lines)) {
        foreach ($lines as $line) {
          $v = strtolower(trim((string) $line));
          if ($v === "") continue;
          if (str_starts_with($v, "#")) continue;
          $admins[] = $v;
        }
      }
    }
  } catch (Throwable $e) {
  }
  $admins = array_values(array_unique(array_filter($admins, fn($x) => $x !== "")));
  define("TOKENCAFE_ADMIN_WALLETS", $admins);
}

if (!defined("TOKENCAFE_WALLET_COOKIE")) {
  define("TOKENCAFE_WALLET_COOKIE", "tokencafe_wallet_address");
}

if (!defined("TOKENCAFE_ADMIN_BYPASS_COOKIE")) {
  define("TOKENCAFE_ADMIN_BYPASS_COOKIE", "tokencafe_admin_bypass");
}

if (!defined("TOKENCAFE_ADMIN_BYPASS_KEY")) {
  $env = getenv("TOKENCAFE_ADMIN_BYPASS_KEY");
  define("TOKENCAFE_ADMIN_BYPASS_KEY", $env !== false ? (string) $env : "");
}

if (!defined("TOKENCAFE_DISABLE_ADMIN_BARRIERS")) {
  $envDisable = getenv("TOKENCAFE_DISABLE_ADMIN_BARRIERS");
  $envDisable = $envDisable !== false ? strtolower(trim((string) $envDisable)) : "";
  define("TOKENCAFE_DISABLE_ADMIN_BARRIERS", in_array($envDisable, ["1", "true", "yes", "on"], true));
}

if (!defined("TOKENCAFE_CHIEF_ADMIN_WALLET")) {
  $envChief = getenv("TOKENCAFE_CHIEF_ADMIN_WALLET");
  if ($envChief !== false && trim($envChief) !== "") {
    define("TOKENCAFE_CHIEF_ADMIN_WALLET", strtolower(trim($envChief)));
  } elseif (!empty($_tcSysSettings['permissions']['chiefAdmin'])) {
    define("TOKENCAFE_CHIEF_ADMIN_WALLET", strtolower(trim((string)$_tcSysSettings['permissions']['chiefAdmin'])));
  } else {
    $chief = is_array(TOKENCAFE_ADMIN_WALLETS) && count(TOKENCAFE_ADMIN_WALLETS) > 0 ? TOKENCAFE_ADMIN_WALLETS[0] : "";
    define("TOKENCAFE_CHIEF_ADMIN_WALLET", strtolower(trim((string) $chief)));
  }
}

if (!defined("TOKENCAFE_LOG_ARCHIVE_EMAIL")) {
  $envEmail = getenv("TOKENCAFE_LOG_ARCHIVE_EMAIL");
  define("TOKENCAFE_LOG_ARCHIVE_EMAIL", $envEmail !== false && trim($envEmail) !== "" ? trim((string) $envEmail) : "andreval74@gmail.com");
}

// ── Preços por modelo de contrato (USD) — lidos de system-settings.json ──────
if (!defined("TOKENCAFE_MODEL_PRICES")) {
  $prices = !empty($_tcSysSettings['contracts']['modelPrices']) && is_array($_tcSysSettings['contracts']['modelPrices'])
    ? $_tcSysSettings['contracts']['modelPrices']
    : ["erc20-minimal" => 40.00, "erc20-controls" => 50.00, "erc20-advanced" => 60.00, "erc20-directsale" => 80.00];
  define("TOKENCAFE_MODEL_PRICES", $prices);
  unset($prices);
}


function tokencafe_is_admin_wallet(?string $address): bool
{
  if (!$address) return false;
  $addr = strtolower(trim($address));
  if ($addr === "") return false;
  $admins = TOKENCAFE_ADMIN_WALLETS;
  foreach ($admins as $a) {
    if (strtolower(trim((string) $a)) === $addr) return true;
  }
  return false;
}

function tokencafe_is_admin_bypass_enabled(): bool
{
  $key = defined("TOKENCAFE_ADMIN_BYPASS_KEY") ? (string) TOKENCAFE_ADMIN_BYPASS_KEY : "";
  return trim($key) !== "";
}

function tokencafe_is_admin_bypass_active(): bool
{
  $cookieName = defined("TOKENCAFE_ADMIN_BYPASS_COOKIE") ? (string) TOKENCAFE_ADMIN_BYPASS_COOKIE : "tokencafe_admin_bypass";
  $v = isset($_COOKIE[$cookieName]) ? (string) $_COOKIE[$cookieName] : "";
  $v = strtolower(trim($v));
  return in_array($v, ["1", "true", "yes", "on"], true);
}

function tokencafe_check_admin_bypass_key(?string $provided): bool
{
  $key = defined("TOKENCAFE_ADMIN_BYPASS_KEY") ? (string) TOKENCAFE_ADMIN_BYPASS_KEY : "";
  if (trim($key) === "") return false;
  $p = trim((string) ($provided ?? ""));
  if ($p === "") return false;
  if (function_exists("hash_equals")) return hash_equals($key, $p);
  return $key === $p;
}

function tokencafe_is_chief_admin(?string $address): bool
{
  if (!$address) return false;
  $addr = strtolower(trim($address));
  $chief = defined("TOKENCAFE_CHIEF_ADMIN_WALLET") ? (string) TOKENCAFE_CHIEF_ADMIN_WALLET : "";
  return $chief !== "" && $addr === $chief;
}
