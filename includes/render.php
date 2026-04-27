<?php

/*
 * Renderizador central do TokenCafe:
 * - Captura o conteúdo do módulo (/modules/*) e injeta no main-layout.php
 * - Padroniza meta tags (via includes/head.php) e scripts (auto-carregamento por convenção)
 */

require_once __DIR__ . "/config.php";
require_once __DIR__ . "/admin-config.php";
require_once __DIR__ . "/log-mail.php";

function tokencafe_get_client_ip(): string
{
  $candidates = [
    "HTTP_CF_CONNECTING_IP",
    "HTTP_X_REAL_IP",
    "HTTP_X_FORWARDED_FOR",
    "REMOTE_ADDR",
  ];
  foreach ($candidates as $k) {
    if (!isset($_SERVER[$k])) continue;
    $raw = trim((string) $_SERVER[$k]);
    if ($raw === "") continue;
    if ($k === "HTTP_X_FORWARDED_FOR") {
      $parts = explode(",", $raw);
      $raw = trim((string) ($parts[0] ?? ""));
    }
    if ($raw === "") continue;
    return $raw;
  }
  return "";
}

function tokencafe_logs_dir(): string
{
  $root = dirname(__DIR__);
  return $root . DIRECTORY_SEPARATOR . "modules" . DIRECTORY_SEPARATOR . "logs" . DIRECTORY_SEPARATOR . "storage" . DIRECTORY_SEPARATOR . "logs";
}

function tokencafe_admin_logs_dir(): string
{
  $root = dirname(__DIR__);
  return $root . DIRECTORY_SEPARATOR . "modules" . DIRECTORY_SEPARATOR . "logs" . DIRECTORY_SEPARATOR . "storage" . DIRECTORY_SEPARATOR . "admin-logs";
}

function tokencafe_append_log(string $fileBase, string $line): void
{
  $dir = tokencafe_logs_dir();
  if (!is_dir($dir)) {
    @mkdir($dir, 0775, true);
  }
  if (!is_dir($dir)) return;
  $date = gmdate("Y-m-d");
  $file = $dir . DIRECTORY_SEPARATOR . $fileBase . "-" . $date . ".log";
  $line = rtrim($line);
  @file_put_contents($file, $line . "\n", FILE_APPEND | LOCK_EX);
}

function tokencafe_append_admin_log(string $type, string $line): void
{
  $dir = tokencafe_admin_logs_dir();
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
  if (!is_dir($dir)) return;
  $date = gmdate("Y-m-d");
  $base = $type === "ip" ? "IPLogs" : "SCLogs";
  $file = $dir . DIRECTORY_SEPARATOR . $base . "-" . $date . ".php";
  $line = rtrim($line);
  $key = "";
  try {
    $parts = explode(";", $line);
    if (count($parts) >= 5) {
      $key = trim((string) $parts[0]) . ";" . trim((string) $parts[1]) . ";" . trim((string) $parts[2]) . ";" . trim((string) $parts[3]) . ";" . trim((string) $parts[4]);
    }
  } catch (Throwable $e) {}
  $fh = @fopen($file, "c+b");
  if (!$fh) return;
  if (!@flock($fh, LOCK_EX)) { @fclose($fh); return; }
  try {
    $st = @fstat($fh);
    $size = is_array($st) && isset($st["size"]) ? (int) $st["size"] : 0;
    if ($size <= 0) {
      @fwrite($fh, "<?php exit; ?>\n");
      @fwrite($fh, "data;hora;ip;wallet;page;chain;contract\n");
    } else {
      if ($key !== "") {
        $tailBytes = 24000;
        $start = max(0, $size - $tailBytes);
        @fseek($fh, $start);
        $chunk = (string) @stream_get_contents($fh);
        $lines = preg_split("/\r?\n/", $chunk) ?: [];
        foreach ($lines as $ln) {
          $t = trim((string) $ln);
          if ($t === "" || str_starts_with($t, "<?php") || str_starts_with($t, "data;")) continue;
          $p = explode(";", $t);
          if (count($p) < 5) continue;
          $k2 = trim((string) $p[0]) . ";" . trim((string) $p[1]) . ";" . trim((string) $p[2]) . ";" . trim((string) $p[3]) . ";" . trim((string) $p[4]);
          if ($k2 === $key) {
            return;
          }
        }
      }
      $pos = $size - 1;
      while ($pos >= 0) {
        @fseek($fh, $pos);
        $ch = @fgetc($fh);
        if ($ch === "\n" || $ch === "\r") $pos--;
        else break;
      }
      $buf = "";
      while ($pos >= 0) {
        @fseek($fh, $pos);
        $ch = @fgetc($fh);
        if ($ch === "\n") break;
        $buf = $ch . $buf;
        $pos--;
      }
      if (trim($buf) === trim($line)) {
        return;
      }
    }
    @fseek($fh, 0, SEEK_END);
    @fwrite($fh, $line . "\n");
  } finally {
    @flock($fh, LOCK_UN);
    @fclose($fh);
  }
}

function tokencafe_normalize_chain_id(string $chain): string
{
  $chain = trim($chain);
  if ($chain === "") return "";
  $lower = strtolower($chain);
  if (str_starts_with($lower, "0x")) {
    $hex = substr($lower, 2);
    if ($hex === "") return "";
    $n = hexdec($hex);
    return $n > 0 ? (string) $n : "";
  }
  if (preg_match('/^\d+$/', $chain)) return ltrim($chain, "0") !== "" ? ltrim($chain, "0") : "0";
  return $chain;
}

function tokencafe_contract_for_page(string $page, string $contractCookie): string
{
  $contractCookie = trim($contractCookie);
  if ($contractCookie === "") return "";
  $page = trim($page);
  if ($page === "") return "";
  if (stripos($page, "contrato") !== false) return $contractCookie;
  return "";
}

function tokencafe_is_valid_contract_address(string $addr): bool
{
  $addr = trim($addr);
  return $addr !== "" && preg_match('/^0x[a-f0-9]{40}$/i', $addr) === 1;
}

function tokencafe_contract_from_request(): string
{
  $addr = isset($_GET["address"]) ? (string) $_GET["address"] : (isset($_GET["contract"]) ? (string) $_GET["contract"] : "");
  $addr = trim($addr);
  if (!tokencafe_is_valid_contract_address($addr)) return "";
  return $addr;
}

function tokencafe_chain_from_request(): string
{
  $chain = isset($_GET["chainId"]) ? (string) $_GET["chainId"] : (isset($_GET["chain"]) ? (string) $_GET["chain"] : "");
  return tokencafe_normalize_chain_id($chain);
}

function tokencafe_apply_contract_context_from_request(string $page, string &$chain, string &$contract): void
{
  if (stripos($page, "contrato") === false) return;
  if ($contract === "") {
    $req = tokencafe_contract_from_request();
    if ($req !== "") {
      $contract = $req;
      @setcookie("tokencafe_contract", $req, ["path" => "/", "samesite" => "Lax"]);
    }
  }
  if ($chain === "") {
    $reqChain = tokencafe_chain_from_request();
    if ($reqChain !== "") {
      $chain = $reqChain;
      @setcookie("tokencafe_chain_id", $reqChain, ["path" => "/", "samesite" => "Lax"]);
    }
  }
}

function tokencafe_log_visit(string $pageHint = ""): void
{
  $d = gmdate("Y-m-d");
  $t = gmdate("H:i:s");
  $ip = tokencafe_get_client_ip();
  $wallet = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? strtolower(trim((string) $_COOKIE[TOKENCAFE_WALLET_COOKIE])) : "";
  $chain = isset($_COOKIE["tokencafe_chain_id"]) ? tokencafe_normalize_chain_id((string) $_COOKIE["tokencafe_chain_id"]) : "";
  $uri = isset($_SERVER["REQUEST_URI"]) ? (string) $_SERVER["REQUEST_URI"] : "";
  $page = trim((string) $pageHint);
  $contract = tokencafe_contract_for_page($page, isset($_COOKIE["tokencafe_contract"]) ? (string) $_COOKIE["tokencafe_contract"] : "");
  tokencafe_apply_contract_context_from_request($page, $chain, $contract);
  $line = "[" . $d . " " . $t . "] ip=" . $ip . ($wallet !== "" ? " wallet=" . $wallet : "") . " page=" . $page . " uri=" . $uri;
  tokencafe_append_log("visits", $line);
  tokencafe_append_admin_log("ip", $d . ";" . $t . ";" . $ip . ";" . $wallet . ";" . $page . ";" . $chain . ";" . $contract);
}

function tokencafe_log_client_access(string $pageHint = ""): void
{
  $d = gmdate("Y-m-d");
  $t = gmdate("H:i:s");
  $ip = tokencafe_get_client_ip();
  $wallet = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? strtolower(trim((string) $_COOKIE[TOKENCAFE_WALLET_COOKIE])) : "";
  $chain = isset($_COOKIE["tokencafe_chain_id"]) ? tokencafe_normalize_chain_id((string) $_COOKIE["tokencafe_chain_id"]) : "";
  $page = trim((string) $pageHint);
  $contract = tokencafe_contract_for_page($page, isset($_COOKIE["tokencafe_contract"]) ? (string) $_COOKIE["tokencafe_contract"] : "");
  tokencafe_apply_contract_context_from_request($page, $chain, $contract);
  $line = "[" . $d . " " . $t . "] ip=" . $ip . ($wallet !== "" ? " wallet=" . $wallet : "") . " page=" . $page;
  tokencafe_append_log("client", $line);
  tokencafe_append_admin_log("sc", $d . ";" . $t . ";" . $ip . ";" . $wallet . ";" . $page . ";" . $chain . ";" . $contract);
}

function tokencafe_admin_log_should_cleanup_today(): bool
{
  $dir = tokencafe_admin_logs_dir();
  if (!is_dir($dir)) return true;
  $flag = $dir . DIRECTORY_SEPARATOR . ".cleanup-last.txt";
  $today = gmdate("Y-m-d");
  $last = "";
  try { if (is_file($flag)) $last = trim((string) file_get_contents($flag)); } catch (Throwable $e) {}
  if ($last === $today) return false;
  try { @file_put_contents($flag, $today, LOCK_EX); } catch (Throwable $e) {}
  return true;
}

function tokencafe_archive_and_delete_file(string $filePath, string $reason): bool
{
  $to = defined("TOKENCAFE_LOG_ARCHIVE_EMAIL") ? (string) TOKENCAFE_LOG_ARCHIVE_EMAIL : "";
  $to = trim($to);
  if ($to === "") return false;
  $file = basename($filePath);
  $tmpTxt = sys_get_temp_dir() . DIRECTORY_SEPARATOR . preg_replace('/\.(php|log)$/', '', $file) . "-" . gmdate("Ymd-His") . ".txt";
  $in = @fopen($filePath, "rb");
  $out = @fopen($tmpTxt, "wb");
  if (!$in || !$out) {
    if (is_resource($in)) fclose($in);
    if (is_resource($out)) fclose($out);
    @unlink($tmpTxt);
    return false;
  }
  $first = true;
  while (!feof($in)) {
    $line = fgets($in);
    if ($line === false) break;
    if ($first) {
      $first = false;
      if (str_starts_with(trim($line), "<?php")) continue;
    }
    fwrite($out, $line);
  }
  fclose($in);
  fclose($out);
  $subject = "TokenCafe Logs Archive: " . preg_replace('/\.(php|log)$/', '.txt', $file);
  $body = "Motivo: " . $reason . "\nArquivo: " . $file . "\nData (UTC): " . gmdate("Y-m-d H:i:s") . "\n";
  $sent = tokencafe_send_mail_with_attachment($to, $subject, $body, $tmpTxt);
  @unlink($tmpTxt);
  if (!$sent) return false;
  @unlink($filePath);
  return true;
}

function tokencafe_cleanup_admin_logs(int $daysToKeep = 365): void
{
  if ($daysToKeep < 1) $daysToKeep = 1;
  if (!tokencafe_admin_log_should_cleanup_today()) return;
  $dir = tokencafe_admin_logs_dir();
  if (!is_dir($dir)) return;
  $threshold = strtotime(gmdate("Y-m-d") . " 00:00:00 UTC") - ($daysToKeep * 86400);
  $filesIp = @glob($dir . DIRECTORY_SEPARATOR . "IPLogs-*.php");
  $filesSc = @glob($dir . DIRECTORY_SEPARATOR . "SCLogs-*.php");
  $files = [];
  if (is_array($filesIp)) $files = array_merge($files, $filesIp);
  if (is_array($filesSc)) $files = array_merge($files, $filesSc);
  if (!$files) return;

  $toArchive = [];
  foreach ($files as $fp) {
    $bn = basename((string) $fp);
    if (!preg_match('/^(IPLogs|SCLogs)-(\d{4}-\d{2}-\d{2})\.php$/', $bn, $m)) continue;
    $d = $m[2];
    $ts = strtotime($d . " 00:00:00 UTC");
    if ($ts === false) continue;
    if ($ts >= $threshold) continue;
    $toArchive[] = (string) $fp;
  }

  if (!$toArchive) return;
  $to = defined("TOKENCAFE_LOG_ARCHIVE_EMAIL") ? (string) TOKENCAFE_LOG_ARCHIVE_EMAIL : "";
  $to = trim($to);
  if ($to === "") return;
  foreach ($toArchive as $fp) {
    tokencafe_archive_and_delete_file((string) $fp, "auto-retencao-" . $daysToKeep . "-dias");
  }
}

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
    "logs" => "Logs do Sistema",
    "settings" => "Configurações do Sistema",
    "templates" => "Template Gallery",
    "analytics" => "Analytics",
    "profile" => "Perfil",
    "admin" => "Logs do Sistema",
    "widget" => "Widget",
    "social" => "Impacto Social",
    "suporte" => "Suporte",
    "privacidade" => "Privacidade",
    "termos e servicos" => "Termos e Serviços",
    "style guide" => "Documentação",
  ];
  if (isset($known[$titleLower])) $title = $known[$titleLower];

  $subtitle = "TokenCafe Tools";
  if ($titleLower === "logs") $subtitle = "Relatórios técnicos de acesso";
  if ($titleLower === "admin") $subtitle = "Relatórios técnicos de acesso";

  return [
    "title" => $title,
    "subtitle" => $subtitle,
    "icon" => "bi-grid",
    "iconAlt" => $title,
  ];
}

function tokencafe_resolve_page(string $page): ?string
{
  $page = strtolower(trim($page));
  $page = preg_replace('/[^a-z0-9_-]+/', "", $page);
  if ($page === "" || $page === "home") return __DIR__ . "/../modules/site/home-basica.php";

  $map = [
    "home-basica" => __DIR__ . "/../modules/site/home-basica.php",
    "home-dev" => __DIR__ . "/../modules/site/home.php",
    "tools" => __DIR__ . "/../modules/site/tools.php",
    "maintenance" => __DIR__ . "/../modules/site/maintenance.php",
    "logs" => __DIR__ . "/../modules/logs/logs-index.php",
    "admin" => __DIR__ . "/../modules/logs/logs-index.php",
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
    "widget" => __DIR__ . "/../modules/widget/widget-index.php",
    "social" => __DIR__ . "/../modules/site/social.php",
    "suporte" => __DIR__ . "/../modules/site/suporte.php",
    "privacidade" => __DIR__ . "/../modules/site/privacidade.php",
    "termos-e-servicos" => __DIR__ . "/../modules/site/termos-e-servicos.php",
    "documentacao" => __DIR__ . "/../modules/site/style-guide.php",
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
  $pageHint = isset($_GET["page"]) ? (string) $_GET["page"] : basename((string)($_SERVER["SCRIPT_NAME"] ?? ""));
  tokencafe_log_visit($pageHint);
  tokencafe_cleanup_admin_logs(365);

  $walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
  $isAdmin = tokencafe_is_admin_wallet($walletCookie);
  if (!$isAdmin && tokencafe_is_admin_bypass_active()) $isAdmin = true;

  try {
    $key = isset($_GET["admin_key"]) ? (string) $_GET["admin_key"] : "";
    if (!$isAdmin && tokencafe_check_admin_bypass_key($key)) {
      $cookieName = defined("TOKENCAFE_ADMIN_BYPASS_COOKIE") ? (string) TOKENCAFE_ADMIN_BYPASS_COOKIE : "tokencafe_admin_bypass";
      $secure = !empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off";
      setcookie($cookieName, "1", [
        "expires" => time() + 60 * 60 * 12,
        "path" => "/",
        "secure" => $secure,
        "httponly" => false,
        "samesite" => "Lax",
      ]);
      $isAdmin = true;
    }
  } catch (Throwable $e) {}

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
  $isClientArea = !$isSiteView;
  if ($isClientArea) tokencafe_log_client_access($pageHint !== "" ? $pageHint : $viewRelNorm);

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

