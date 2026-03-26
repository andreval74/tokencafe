<?php

if (!defined("BASE_URL")) {
  $host = "";
  if (isset($_SERVER["HTTP_HOST"])) $host = (string) $_SERVER["HTTP_HOST"];
  else if (isset($_SERVER["SERVER_NAME"])) $host = (string) $_SERVER["SERVER_NAME"];

  $isLocalhost =
    $host === "localhost" ||
    str_starts_with($host, "localhost:") ||
    $host === "127.0.0.1" ||
    str_starts_with($host, "127.0.0.1:") ||
    $host === "::1" ||
    str_starts_with($host, "[::1]:");

  $base = $isLocalhost ? "/tokencafe/" : "/";

  if (!str_starts_with($base, "/")) $base = "/" . $base;
  if (!str_ends_with($base, "/")) $base .= "/";

  define("BASE_URL", $base);
}

if (!defined("ASSET_VERSION")) {
  define("ASSET_VERSION", "9.9");
}

if (!defined("TOKENCAFE_MAINTENANCE_MODE")) {
  $env = getenv("TOKENCAFE_MAINTENANCE_MODE");
  if ($env !== true) {
    $envVal = strtolower(trim((string) $env));
    define("TOKENCAFE_MAINTENANCE_MODE", in_array($envVal, ["1", "true", "yes", "on"], true));
  } else {
    define("TOKENCAFE_MAINTENANCE_MODE", !$isLocalhost);
  }
}
