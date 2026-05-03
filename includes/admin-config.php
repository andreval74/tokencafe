<?php
/* Config de ADMIN (proteções desativadas no momento) */
if (!defined("TOKENCAFE_ADMIN_WALLETS")) {
  $admins = [
    "0x0b81337f18767565d2ea40913799317a25dc4bc5",
  ];
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
  } catch (Throwable $e) {}
  $admins = array_values(array_unique(array_map(fn ($x) => strtolower(trim((string) $x)), $admins)));
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
  define("TOKENCAFE_DISABLE_ADMIN_BARRIERS", true);
}

if (!defined("TOKENCAFE_CHIEF_ADMIN_WALLET")) {
  $envChief = getenv("TOKENCAFE_CHIEF_ADMIN_WALLET");
  if ($envChief !== false && trim($envChief) !== "") {
    define("TOKENCAFE_CHIEF_ADMIN_WALLET", strtolower(trim($envChief)));
  } else {
    $chief = is_array(TOKENCAFE_ADMIN_WALLETS) && count(TOKENCAFE_ADMIN_WALLETS) > 0 ? TOKENCAFE_ADMIN_WALLETS[0] : "";
    define("TOKENCAFE_CHIEF_ADMIN_WALLET", strtolower(trim((string) $chief)));
  }
}

if (!defined("TOKENCAFE_LOG_ARCHIVE_EMAIL")) {
  $envEmail = getenv("TOKENCAFE_LOG_ARCHIVE_EMAIL");
  define("TOKENCAFE_LOG_ARCHIVE_EMAIL", $envEmail !== false && trim($envEmail) !== "" ? trim((string) $envEmail) : "andreval74@gmail.com");
}

function tokencafe_is_admin_wallet(?string $address): bool
{
  if (defined("TOKENCAFE_DISABLE_ADMIN_BARRIERS") && TOKENCAFE_DISABLE_ADMIN_BARRIERS === true) return true;
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
  if (defined("TOKENCAFE_DISABLE_ADMIN_BARRIERS") && TOKENCAFE_DISABLE_ADMIN_BARRIERS === true) return true;
  if (!$address) return false;
  $addr = strtolower(trim($address));
  $chief = defined("TOKENCAFE_CHIEF_ADMIN_WALLET") ? (string) TOKENCAFE_CHIEF_ADMIN_WALLET : "";
  return $chief !== "" && $addr === $chief;
}
