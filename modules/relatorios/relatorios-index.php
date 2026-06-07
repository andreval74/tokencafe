<?php
/* ============================================================================
   LOGS-INDEX.PHP — Painel de Relatórios e BI de Acessos — TokenCafe
   Combina IPLogs (visitas de página) e SCLogs (ações on-chain) para gerar
   KPIs, ranking de páginas e tabela interativa com paginação e download.
   Acesso: admin chefe vê tudo; usuário comum vê só os próprios registros.
   JS: assets/js/modules/relatorios/relatorios-ui.js
   ============================================================================ */

$pageTitle            = "Relatórios - TokenCafe";
$pageDescription      = "Histórico de acessos e ações on-chain do portal TokenCafe.";
$pageKeywords         = "relatórios, logs, acessos, contratos, blockchain, analytics";
$headerVariant        = "module";
$moduleHeaderTitle    = "Relatórios";
$moduleHeaderSubtitle = "Acessos e Ações do Sistema";
$moduleHeaderIcon     = "bi-journal-text";
$moduleHeaderIconAlt  = "Relatórios";

require_once __DIR__ . "/../../includes/admin-config.php";

// ── Detecção de permissões ────────────────────────────────────────────────
$walletCookie     = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$walletCookieNorm = strtolower(trim(urldecode($walletCookie)));
$hasWallet        = $walletCookieNorm !== "";
$isChief          = $hasWallet && tokencafe_is_chief_admin($walletCookieNorm);

// ── Intervalo de datas (padrão: mês atual) ────────────────────────────────
$endDate    = isset($_GET["end"])   ? trim((string) $_GET["end"])   : "";
$startDate  = isset($_GET["start"]) ? trim((string) $_GET["start"]) : "";
$legacyDate = isset($_GET["date"])  ? trim((string) $_GET["date"])  : "";

if ($endDate === "" && $legacyDate !== "") $endDate = $legacyDate;
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate))   $endDate   = gmdate("Y-m-d");
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate))  $startDate = gmdate("Y-m-01", strtotime($endDate . " 00:00:00 UTC"));

$tsStart = strtotime($startDate . " 00:00:00 UTC");
$tsEnd   = strtotime($endDate   . " 00:00:00 UTC");
if ($tsStart === false || $tsEnd === false) {
  $endDate   = gmdate("Y-m-d");
  $startDate = gmdate("Y-m-01");
  $tsStart   = strtotime($startDate . " 00:00:00 UTC");
  $tsEnd     = strtotime($endDate   . " 00:00:00 UTC");
}
if ($tsStart > $tsEnd) {
  [$startDate, $endDate] = [$endDate, $startDate];
  [$tsStart,   $tsEnd]   = [$tsEnd,   $tsStart];
}

$maxDays  = 366;
$daysSpan = (int) floor(($tsEnd - $tsStart) / 86400) + 1;
if ($daysSpan > $maxDays) {
  $tsStart   = $tsEnd - (($maxDays - 1) * 86400);
  $startDate = gmdate("Y-m-d", $tsStart);
  $daysSpan  = $maxDays;
}

$fmtDateBr = function (string $d): string {
  $dt = DateTime::createFromFormat("Y-m-d", $d, new DateTimeZone("UTC"));
  return $dt ? $dt->format("d/m/Y") : $d;
};
$startDateDisplay = $fmtDateBr($startDate);
$endDateDisplay   = $fmtDateBr($endDate);

// ── Diretório dos arquivos de log ─────────────────────────────────────────
$logsDir = dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . "modules" . DIRECTORY_SEPARATOR
  . "logs" . DIRECTORY_SEPARATOR . "storage" . DIRECTORY_SEPARATOR . "admin-logs";

// ── Filtros ativos (sempre pela carteira conectada) ───────────────────────
$filterWallet   = $hasWallet ? $walletCookieNorm : "";
$filterChain    = "";
$filterContract = "";

$adminWalletDefault   = $filterWallet;
$adminChainDefault    = "";
$adminContractDefault = "";

// ── Parse de uma linha de log ─────────────────────────────────────────────
function tc_parse_log_line(string $line): ?array
{
  $line = trim($line);
  if ($line === "" || str_starts_with($line, "<?php")) return null;
  if ($line === "data;hora;ip;wallet;page" || $line === "data;hora;ip;wallet;page;chain;contract" || $line === "data;hora;ip;wallet;page;chain;contract;action") return null;

  if (str_contains($line, ";") && !str_starts_with($line, "[")) {
    $p = explode(";", $line);
    if (count($p) < 5) return null;
    return [
      "date" => trim((string) $p[0]),
      "time" => trim((string) $p[1]),
      "ip"       => trim((string) $p[2]),
      "wallet"   => trim((string) $p[3]),
      "page"     => trim((string) $p[4]),
      "chain"    => isset($p[5]) ? trim((string) $p[5]) : "",
      "contract" => isset($p[6]) ? trim((string) $p[6]) : "",
      "action"   => isset($p[7]) ? trim((string) $p[7]) : "",
    ];
  }
  if (!preg_match('/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\]\s*(.*)$/', $line, $m)) return null;

  $pairs = [];
  if (preg_match_all('/\b([a-zA-Z_]+)=([^\s]+)/', (string) $m[3], $mm, PREG_SET_ORDER)) {
    foreach ($mm as $q) $pairs[strtolower((string) $q[1])] = (string) $q[2];
  }
  $page = $pairs["page"] ?? "";
  if ($page === "" && isset($pairs["uri"])) {
    $q = parse_url((string) $pairs["uri"], PHP_URL_QUERY);
    if (is_string($q)) {
      parse_str($q, $qs);
      if (isset($qs["page"])) $page = (string) $qs["page"];
    }
  }
  return [
    "date" => $m[1],
    "time" => $m[2],
    "ip"       => $pairs["ip"]       ?? "",
    "wallet"   => $pairs["wallet"]   ?? "",
    "page"     => $page,
    "chain"    => $pairs["chain"]    ?? "",
    "contract" => $pairs["contract"] ?? "",
    "action"   => $pairs["action"]   ?? "",
  ];
}

function tc_read_log_rows(string $file, int $max = 5000): array
{
  if (!is_file($file)) return [];
  $content = @file($file, FILE_IGNORE_NEW_LINES);
  if (!is_array($content)) return [];
  $rows = [];
  foreach ($content as $line) {
    $r = tc_parse_log_line((string) $line);
    if ($r) $rows[] = $r;
  }
  $total = count($rows);
  return $total <= $max ? $rows : array_slice($rows, $total - $max);
}

function tc_apply_filters(array $rows, string $wallet, string $chain, string $contract): array
{
  $wallet   = strtolower(trim($wallet));
  $chain    = trim($chain);
  $contract = strtolower(trim($contract));
  return array_values(array_filter($rows, function ($r) use ($wallet, $chain, $contract) {
    if ($wallet   !== "" && strtolower((string) ($r["wallet"]   ?? "")) !== $wallet)   return false;
    if ($chain    !== "" && trim((string) ($r["chain"]    ?? "")) !== $chain)    return false;
    if ($contract !== "" && strtolower((string) ($r["contract"] ?? "")) !== $contract) return false;
    return true;
  }));
}

function tc_action_from_page(string $page): string
{
  $p = strtolower(trim($page));
  if ($p === "") return "other";
  $p = str_replace("_", "-", $p);

  if (str_contains($p, "contrato") && (str_contains($p, "criado") || str_contains($p, "deploy"))) return "deploy";
  if (str_contains($p, "contrato") && str_contains($p, "verificado")) return "verify_ok";
  if (str_contains($p, "contrato") && str_contains($p, "nao-verificado")) return "verify_fail";
  if (str_contains($p, "contrato") && str_contains($p, "detalhe")) return "view_contract";
  if (str_contains($p, "wallet")) return "wallet";
  if (str_contains($p, "rpc")) return "rpc";
  if (str_contains($p, "tools")) return "tools";

  return preg_replace('/[^a-z0-9_-]+/', '', $p) ?: "other";
}

function tc_action_label(string $action): string
{
  $a = strtolower(trim($action));
  return match ($a) {
    "deploy" => "Deploy",
    "verify_ok" => "Verificado",
    "verify_fail" => "Não verificado",
    "view_contract" => "Detalhes",
    "wallet" => "Wallet",
    "rpc" => "RPC",
    "tools" => "Tools",
    default => ucfirst(str_replace(["_", "-"], " ", ($a !== "" ? $a : "other"))),
  };
}

function tc_unique_count(array $rows, string $key): int
{
  $m = [];
  foreach ($rows as $r) {
    $v = (string) ($r[$key] ?? "");
    if ($v !== "") $m[$v] = 1;
  }
  return count($m);
}

function tc_unique_nonempty(array $rows, string $key): int
{
  $m = [];
  foreach ($rows as $r) {
    $v = strtolower(trim((string) ($r[$key] ?? "")));
    if ($v !== "") $m[$v] = true;
  }
  return count($m);
}

function tc_top_pages(array $rows, int $limit = 8): array
{
  $m = [];
  foreach ($rows as $r) {
    $p = (string) ($r["page"] ?? "");
    if ($p !== "") $m[$p] = ($m[$p] ?? 0) + 1;
  }
  arsort($m);
  $out = [];
  foreach ($m as $k => $v) {
    $out[] = ["page" => $k, "count" => (int) $v];
    if (count($out) >= $limit) break;
  }
  return $out;
}

function tc_top_ips(array $rows, int $limit = 8): array
{
  $m = [];
  foreach ($rows as $r) {
    $ip = (string) ($r["ip"] ?? "");
    if ($ip !== "") $m[$ip] = ($m[$ip] ?? 0) + 1;
  }
  arsort($m);
  $out = [];
  foreach ($m as $k => $v) {
    $out[] = ["ip" => $k, "count" => (int) $v];
    if (count($out) >= $limit) break;
  }
  return $out;
}

function tc_rate_per_hour(array $rows): float
{
  if (!$rows) return 0.0;
  $hrs = [];
  foreach ($rows as $r) {
    $h = (int) substr((string) ($r["time"] ?? ""), 0, 2);
    $hrs[$h] = true;
  }
  return count($rows) / max(1, count($hrs));
}

function tc_duration_human(int $secs): string
{
  if ($secs <= 0) return "0m";
  $days = intdiv($secs, 86400);
  $secs %= 86400;
  $hrs  = intdiv($secs, 3600);
  $secs %= 3600;
  $mins = intdiv($secs, 60);
  if ($days > 0) return $days . "d " . str_pad((string) $hrs,  2, "0", STR_PAD_LEFT) . "h " . str_pad((string) $mins, 2, "0", STR_PAD_LEFT) . "m";
  if ($hrs  > 0) return $hrs  . "h " . str_pad((string) $mins, 2, "0", STR_PAD_LEFT) . "m";
  return $mins . "m";
}

// ── Conta registros por dia, preenchendo dias sem dados com zero ──────────
function tc_daily_counts_range(array $rows, string $startDate, string $endDate): array
{
  $out = [];
  $ts  = strtotime($startDate . " 00:00:00 UTC");
  $te  = strtotime($endDate   . " 00:00:00 UTC");
  if ($ts === false || $te === false) return $out;
  for ($t = $ts; $t <= $te; $t += 86400) $out[gmdate("Y-m-d", $t)] = 0;
  foreach ($rows as $r) {
    $d = (string) ($r["date"] ?? "");
    if (isset($out[$d])) $out[$d]++;
  }
  return $out;
}

function tc_daily_unique_counts_range(array $rows, string $startDate, string $endDate, string $key): array
{
  $out = [];
  $ts  = strtotime($startDate . " 00:00:00 UTC");
  $te  = strtotime($endDate   . " 00:00:00 UTC");
  if ($ts === false || $te === false) return $out;
  for ($t = $ts; $t <= $te; $t += 86400) $out[gmdate("Y-m-d", $t)] = 0;

  $sets = [];
  foreach ($rows as $r) {
    $d = (string) ($r["date"] ?? "");
    if ($d === "" || !isset($out[$d])) continue;
    $v = trim((string) ($r[$key] ?? ""));
    if ($v === "") continue;
    $sets[$d][$v] = true;
  }
  foreach ($out as $d => $_) $out[$d] = isset($sets[$d]) ? count($sets[$d]) : 0;
  return $out;
}

function tc_svg_points(array $vals, int $W, int $H, float $maxVal): string
{
  $n = count($vals);
  if ($n === 0) return "";
  $pts = [];
  for ($i = 0; $i < $n; $i++) {
    $x = $n > 1 ? round($i / ($n - 1) * $W, 1) : round($W / 2, 1);
    $y = round($H - (($vals[$i] ?? 0) / $maxVal) * ($H - 5), 1);
    $pts[] = $x . "," . $y;
  }
  return implode(" ", $pts);
}

function tc_svg_area(array $vals, int $W, int $H, float $maxVal): string
{
  $n = count($vals);
  if ($n < 2) return "";
  $segs = [];
  for ($i = 0; $i < $n; $i++) {
    $x = round($i / ($n - 1) * $W, 1);
    $y = round($H - ($vals[$i] / $maxVal) * ($H - 5), 1);
    $segs[] = $x . " " . $y;
  }
  return "M " . implode(" L ", $segs) . " L " . round($W, 1) . " " . $H . " L 0 " . $H . " Z";
}

// ── Leitura e merge dos logs no intervalo selecionado ─────────────────────
$allUnifiedWindow = [];
for ($ts = $tsStart; $ts <= $tsEnd; $ts += 86400) {
  $d = gmdate("Y-m-d", $ts);
  $allUnifiedWindow = array_merge($allUnifiedWindow, tc_apply_filters(tc_read_log_rows($logsDir . DIRECTORY_SEPARATOR . "SCLogs-" . $d . ".php"),  $filterWallet, $filterChain, $filterContract));
}

foreach ($allUnifiedWindow as &$r) {
  $a = trim((string) ($r["action"] ?? ""));
  if ($a === "") $r["action"] = tc_action_from_page((string) ($r["page"] ?? ""));
}
unset($r);

// ── Separação: visitas (visit) vs ações ───────────────────────────────────
$allIpWindow = array_values(array_filter($allUnifiedWindow, function ($r) {
  return strtolower(trim((string) ($r["action"] ?? ""))) === "visit";
}));
$allClientWindow = array_values(array_filter($allUnifiedWindow, function ($r) {
  return strtolower(trim((string) ($r["action"] ?? ""))) !== "visit";
}));

// ── KPIs ──────────────────────────────────────────────────────────────────
$kpiTotalIp      = count($allIpWindow);
$kpiUniqueIp     = tc_unique_count($allIpWindow, "ip");
$kpiTotalClient  = count($allClientWindow);
$kpiUniqueWallet = tc_unique_count(array_merge($allIpWindow, $allClientWindow), "wallet");
$kpiUniquePages  = tc_unique_nonempty($allIpWindow, "page");

$minActTs = $maxActTs = null;
foreach ($allIpWindow as $r) {
  $t = strtotime(trim((string) ($r["date"] ?? "")) . " " . trim((string) ($r["time"] ?? "")) . " UTC");
  if ($t === false) continue;
  if ($minActTs === null || $t < $minActTs) $minActTs = $t;
  if ($maxActTs === null || $t > $maxActTs) $maxActTs = $t;
}
$activeDuration = ($minActTs !== null && $maxActTs !== null) ? tc_duration_human(max(0, (int) ($maxActTs - $minActTs))) : "0m";

// Tempo total de histórico disponível (só admin chefe)
$daysRunning = 0;
if ($isChief) {
  $minTs    = null;
  $logFiles = (array) @glob($logsDir . DIRECTORY_SEPARATOR . "SCLogs-*.php");
  foreach ($logFiles as $fp) {
    if (!preg_match('/^SCLogs-(\d{4}-\d{2}-\d{2})\.php$/', basename((string) $fp), $m)) continue;
    $t = strtotime($m[1] . " 00:00:00 UTC");
    if ($t !== false && ($minTs === null || $t < $minTs)) $minTs = $t;
  }
  if ($minTs !== null) {
    $now0 = strtotime(gmdate("Y-m-d") . " 00:00:00 UTC");
    if ($now0 !== false) $daysRunning = (int) floor(($now0 - $minTs) / 86400) + 1;
  }
}

$topIpPages = tc_top_pages($allIpWindow, 8);
$topIps     = $isChief ? tc_top_ips($allIpWindow, 8) : [];

// ── Ações por tipo (derivado de SCLogs) ───────────────────────────────────
$actionCounts = [];
foreach ($allClientWindow as $r) {
  $a = strtolower(trim((string) ($r["action"] ?? "")));
  if ($a === "") $a = "other";
  $actionCounts[$a] = ($actionCounts[$a] ?? 0) + 1;
}
arsort($actionCounts);
$topActions = [];
foreach ($actionCounts as $a => $cnt) {
  $topActions[] = ["action" => (string) $a, "label" => tc_action_label((string) $a), "count" => (int) $cnt];
  if (count($topActions) >= 8) break;
}
$maxActionCount = count($topActions) > 0 ? max(1, (int) ($topActions[0]["count"] ?? 1)) : 1;

// ── Tendência diária e SVG sparkline ─────────────────────────────────────
$dailyIp     = tc_daily_counts_range($allIpWindow,     $startDate, $endDate);
$dailySc     = tc_daily_counts_range($allClientWindow, $startDate, $endDate);
$dailyLabels = array_keys($dailyIp);
$dailyIpArr  = array_values($dailyIp);
$dailyScArr  = array_values($dailySc);
$nDays       = max(1, count($dailyIpArr));
$maxDayVal   = (float) max(1, max(array_merge($dailyIpArr ?: [0], $dailyScArr ?: [0])));
$svgW = 400;
$svgH = 60;
$ipPts  = tc_svg_points($dailyIpArr, $svgW, $svgH, $maxDayVal);
$scPts  = tc_svg_points($dailyScArr, $svgW, $svgH, $maxDayVal);
$ipArea = tc_svg_area($dailyIpArr,   $svgW, $svgH, $maxDayVal);
$scArea = tc_svg_area($dailyScArr,   $svgW, $svgH, $maxDayVal);

// ── Séries de KPI (únicos por dia) para drill-down no dashboard ───────────
$dailyUniqueIpArr     = array_values(tc_daily_unique_counts_range($allIpWindow, $startDate, $endDate, "ip"));
$dailyUniqueWalletArr = array_values(tc_daily_unique_counts_range(array_merge($allIpWindow, $allClientWindow), $startDate, $endDate, "wallet"));
$dailyUniquePagesArr  = array_values(tc_daily_unique_counts_range($allIpWindow, $startDate, $endDate, "page"));

// ── Dados leves do dashboard (cross-filter no frontend) ───────────────────
$dashByPage = [];
foreach ($topIpPages as $tp) {
  $page = (string) ($tp["page"] ?? "");
  if ($page === "") continue;
  $ipRows = array_values(array_filter($allIpWindow, fn($r) => (string) ($r["page"] ?? "") === $page));
  $scRows = array_values(array_filter($allClientWindow, fn($r) => (string) ($r["page"] ?? "") === $page));
  $dashByPage[$page] = [
    "ip" => array_values(tc_daily_counts_range($ipRows, $startDate, $endDate)),
    "sc" => array_values(tc_daily_counts_range($scRows, $startDate, $endDate)),
  ];
}

$walletTotals = [];
foreach (array_merge($allIpWindow, $allClientWindow) as $r) {
  $w = strtolower(trim((string) ($r["wallet"] ?? "")));
  if ($w === "") continue;
  $walletTotals[$w] = ($walletTotals[$w] ?? 0) + 1;
}
arsort($walletTotals);
$topWallets = array_slice(array_keys($walletTotals), 0, 5);

$dashByWallet = [];
$dashByWalletByPage = [];
foreach ($topWallets as $w) {
  $wIpRows = array_values(array_filter($allIpWindow, fn($r) => strtolower(trim((string) ($r["wallet"] ?? ""))) === $w));
  $wScRows = array_values(array_filter($allClientWindow, fn($r) => strtolower(trim((string) ($r["wallet"] ?? ""))) === $w));
  $ipDaily = array_values(tc_daily_counts_range($wIpRows, $startDate, $endDate));
  $scDaily = array_values(tc_daily_counts_range($wScRows, $startDate, $endDate));
  $totalDaily = [];
  for ($i = 0; $i < count($ipDaily); $i++) $totalDaily[$i] = (int) ($ipDaily[$i] ?? 0) + (int) ($scDaily[$i] ?? 0);
  $dashByWallet[$w] = ["ip" => $ipDaily, "sc" => $scDaily, "total" => $totalDaily];

  $dashByWalletByPage[$w] = [];
  foreach ($topIpPages as $tp) {
    $page = (string) ($tp["page"] ?? "");
    if ($page === "") continue;
    $wIpP = array_values(array_filter($wIpRows, fn($r) => (string) ($r["page"] ?? "") === $page));
    $wScP = array_values(array_filter($wScRows, fn($r) => (string) ($r["page"] ?? "") === $page));
    $ipP  = array_values(tc_daily_counts_range($wIpP, $startDate, $endDate));
    $scP  = array_values(tc_daily_counts_range($wScP, $startDate, $endDate));
    $totP = [];
    for ($i = 0; $i < count($ipP); $i++) $totP[$i] = (int) ($ipP[$i] ?? 0) + (int) ($scP[$i] ?? 0);
    $dashByWalletByPage[$w][$page] = ["ip" => $ipP, "sc" => $scP, "total" => $totP];
  }
}

$dashActionsByAction = [];
foreach ($topActions as $ta) {
  $a = (string) ($ta["action"] ?? "");
  if ($a === "") continue;
  $rows = array_values(array_filter($allClientWindow, fn($r) => strtolower(trim((string) ($r["action"] ?? ""))) === strtolower($a)));
  $dashActionsByAction[$a] = array_values(tc_daily_counts_range($rows, $startDate, $endDate));
}

$dashActionsByPage = [];
foreach ($topIpPages as $tp) {
  $page = (string) ($tp["page"] ?? "");
  if ($page === "") continue;
  $dashActionsByPage[$page] = [];
  foreach ($topActions as $ta) {
    $a = (string) ($ta["action"] ?? "");
    if ($a === "") continue;
    $rows = array_values(array_filter($allClientWindow, function ($r) use ($page, $a) {
      if ((string) ($r["page"] ?? "") !== $page) return false;
      return strtolower(trim((string) ($r["action"] ?? ""))) === strtolower($a);
    }));
    $dashActionsByPage[$page][$a] = array_values(tc_daily_counts_range($rows, $startDate, $endDate));
  }
}

$logsDashboard = [
  "svg" => ["w" => $svgW, "h" => $svgH],
  "labels" => $dailyLabels,
  "series" => ["ip" => $dailyIpArr, "sc" => $dailyScArr],
  "kpiSeries" => [
    "uniqueIp" => $dailyUniqueIpArr,
    "uniqueWallet" => $dailyUniqueWalletArr,
    "uniquePages" => $dailyUniquePagesArr,
  ],
  "topPages" => array_values(array_map(fn($t) => ["page" => (string) ($t["page"] ?? ""), "count" => (int) ($t["count"] ?? 0)], $topIpPages)),
  "byPage" => $dashByPage,
  "actions" => [
    "top" => $topActions,
    "byAction" => $dashActionsByAction,
    "byActionByPage" => $dashActionsByPage,
  ],
  "wallets" => [
    "top" => $topWallets,
    "byWallet" => $dashByWallet,
    "byWalletByPage" => $dashByWalletByPage,
  ],
];

// ── Totais explícitos para consistência nos números ───────────────────────
$totalRows    = $kpiTotalIp + $kpiTotalClient;
$maxPageCount = count($topIpPages) > 0 ? max(1, (int) ($topIpPages[0]["count"] ?? 1)) : 1;

// Evita inflar KPIs quando a própria página de logs é acessada agora
$toTs        = fn(string $d, string $h): int => ($t = strtotime(trim($d) . " " . trim($h) . " UTC")) !== false ? (int) $t : 0;
$nowTs       = time();
$allIpWindow = array_values(array_filter($allIpWindow, function ($r) use ($toTs, $nowTs) {
  if (stripos((string) ($r["page"] ?? ""), "logs") === false) return true;
  $t = $toTs((string) ($r["date"] ?? ""), (string) ($r["time"] ?? ""));
  return $t <= 0 || ($nowTs - $t) > 2;
}));

// ── Marca tipo para interatividade JS ────────────────────────────────────
foreach ($allIpWindow     as &$r) $r["type"] = "ip";
unset($r);
foreach ($allClientWindow as &$r) $r["type"] = "sc";
unset($r);

// ── Merge final para a tabela ─────────────────────────────────────────────
$allTableWindow = array_merge($allIpWindow, $allClientWindow);
$jsonSafeFlags  = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
$visitsDataJson = json_encode($allTableWindow, $jsonSafeFlags);

// ── Opções dos selects de filtro ──────────────────────────────────────────
$pageOptions = $ipOptions = $walletOptions = $contractOptions = [];
foreach ($allTableWindow as $r) {
  $p = (string) ($r["page"] ?? "");
  if ($p !== "") $pageOptions[$p] = ($pageOptions[$p] ?? 0) + 1;
  if ($isChief) {
    $ip = (string) ($r["ip"] ?? "");
    if ($ip !== "") $ipOptions[$ip] = ($ipOptions[$ip] ?? 0) + 1;
    $w  = strtolower((string) ($r["wallet"] ?? ""));
    if ($w !== "") $walletOptions[$w] = ($walletOptions[$w] ?? 0) + 1;
    $ct = strtolower(trim((string) ($r["contract"] ?? "")));
    if ($ct !== "") $contractOptions[$ct] = ($contractOptions[$ct] ?? 0) + 1;
  }
}
arsort($pageOptions);
arsort($ipOptions);
arsort($walletOptions);
arsort($contractOptions);

// ── Status de verificação dos contratos (derivado de SCLogs) ─────────────
$verifiedContracts = [];
$contractStatus    = [];
foreach ($allClientWindow as $r) {
  $ct = strtolower(trim((string) ($r["contract"] ?? "")));
  $p = strtolower((string) ($r["page"] ?? ""));
  if ($ct === "" || stripos($p, "contrato") === false) continue;
  $t = strtotime(trim((string) ($r["date"] ?? "")) . " " . trim((string) ($r["time"] ?? "")) . " UTC");
  $t = ($t === false ? 0 : (int) $t);
  if ($t <= 0) continue;
  if (stripos($p, "contrato_verificado") !== false) {
    if (($contractStatus[$ct]["ts"] ?? 0) <= 0 || $t >= $contractStatus[$ct]["ts"]) $contractStatus[$ct] = ["ts" => $t, "verified" => true];
  } elseif (stripos($p, "contrato_nao_verificado") !== false) {
    if (($contractStatus[$ct]["ts"] ?? 0) <= 0 || $t >= $contractStatus[$ct]["ts"]) $contractStatus[$ct] = ["ts" => $t, "verified" => false];
  }
}
foreach ($contractStatus as $addr => $st) $verifiedContracts[$addr] = (($st["verified"] ?? false) === true);

// ── Histórico completo da carteira ativa (varre TODOS os SCLogs disponíveis) ──
// Por quê: o usuário quer ver o perfil total, independente do período selecionado
$wStat = ["dep" => [], "chains" => [], "dates" => []];
if ($hasWallet) {
  $allSc = (array) @glob($logsDir . DIRECTORY_SEPARATOR . "SCLogs-*.php");
  sort($allSc);
  foreach ($allSc as $scFile) {
    foreach (tc_read_log_rows((string) $scFile, 4000) as $r) {
      if (strtolower(trim((string) ($r["wallet"] ?? ""))) !== $walletCookieNorm) continue;
      $act = strtolower(trim((string) ($r["action"]   ?? "")));
      $pg  = strtolower(trim((string) ($r["page"]     ?? "")));
      $ct  = strtolower(trim((string) ($r["contract"] ?? "")));
      $ch  = trim((string) ($r["chain"] ?? ""));
      $dt  = trim((string) ($r["date"]  ?? ""));
      $isDeploy = ($act === "deploy" || str_contains($pg, "contrato_criado") || $pg === "contrato-deploy");
      $isVerify = ($act === "verify_ok" || str_contains($pg, "contrato_verificado"));
      if ($isDeploy && $ct !== "") {
        if (!isset($wStat["dep"][$ct])) {
          $wStat["dep"][$ct] = ["chain" => $ch, "date" => $dt, "verified" => false];
          if ($ch && !in_array($ch, $wStat["chains"])) $wStat["chains"][] = $ch;
          if ($dt) $wStat["dates"][] = $dt;
        }
      }
      if ($isVerify && $ct !== "" && isset($wStat["dep"][$ct])) $wStat["dep"][$ct]["verified"] = true;
    }
  }
}
$wTotal    = count($wStat["dep"]);
$wVerified = count(array_filter($wStat["dep"], fn($c) => $c["verified"]));
$wPending  = $wTotal - $wVerified;
sort($wStat["dates"]);
$wFirst = $wStat["dates"] ? $fmtDateBr(reset($wStat["dates"])) : null;
$wLast  = $wStat["dates"] ? $fmtDateBr(end($wStat["dates"]))   : null;
// Redes: converte chainId numérico para nome legível
$chainNames = ["1" => "Ethereum", "56" => "BSC", "97" => "BSC Testnet", "137" => "Polygon", "43114" => "Avalanche", "42161" => "Arbitrum", "10" => "Optimism", "8453" => "Base", "11155111" => "Sepolia", "80001" => "Mumbai"];
$wChainLabels = array_map(fn($c) => $chainNames[$c] ?? "Chain $c", $wStat["chains"]);

// Dados de deploy histórico para injeção no JS — resolve o "Pendentes mostra 0"
// Por quê: allTableWindow é limitado ao período selecionado; contratos deployados em datas
// fora do intervalo não aparecem na tabela, mas $wStat escaneia TODOS os SCLogs.
$walletDeployRows   = [];
$walletAllVerified  = [];
if ($hasWallet) {
  foreach ($wStat["dep"] as $ct => $info) {
    $walletAllVerified[$ct] = (bool) ($info["verified"] ?? false);
    $walletDeployRows[] = [
      "date"     => (string) ($info["date"]  ?? ""),
      "time"     => "",
      "ip"       => "",
      "wallet"   => $walletCookieNorm,
      "page"     => "contrato_criado",
      "chain"    => (string) ($info["chain"] ?? ""),
      "contract" => (string) $ct,
      "action"   => "deploy",
      "type"     => "sc",
    ];
  }
}
?>

<div class="container-fluid px-3 px-lg-4 py-4">

  <?php if (!$hasWallet) { ?>

    <!-- ── Carteira não conectada ─────────────────────────────────────── -->
    <div class="tcd-card text-center py-5">
      <div class="tc-page-hero-icon--sm mx-auto mb-3 d-flex align-items-center justify-content-center">
        <i class="bi bi-journal-text text-white fs-4"></i>
      </div>
      <h3 class="text-white mb-2">Conecte sua carteira</h3>
      <p class="tc-status-text mb-4">Conecte sua carteira para visualizar seu histórico de acessos e ações.</p>
      <button type="button" class="tc-btn-primary-ds px-5 py-2"
        onclick="document.dispatchEvent(new CustomEvent('tc:open-auth-modal'))">
        <i class="bi bi-wallet2 me-2"></i>Conectar carteira
      </button>
    </div>

  <?php } else { ?>

    <style>
      .tc-kpi-value {
        font-size: 1.05rem !important;
      }

      .tc-kpi-label {
        font-size: 0.67rem;
      }

      .tc-kpi[data-kpi-filter] {
        cursor: pointer;
        transition: box-shadow .15s, opacity .15s;
      }

      .tc-kpi[data-kpi-filter]:hover {
        opacity: .82;
      }

      .tc-kpi--active {
        box-shadow: 0 0 0 2px #60a5fa !important;
      }

      .tc-top-page[data-top-page],
      .tc-ip-chip {
        cursor: pointer;
        transition: opacity .12s;
      }

      .tc-top-page[data-top-page]:hover,
      .tc-ip-chip:hover {
        opacity: .72;
      }

      .tc-chip--active {
        box-shadow: 0 0 0 2px #60a5fa;
      }

      /* Chip compacto de filtro da carteira — segue padrão tc-filter-mode-btn */
      .tc-wkpi-chip {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        padding: 4px 12px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.5);
        cursor: pointer;
        transition: all .15s;
        white-space: nowrap;
        line-height: 1.25;
      }

      .tc-wkpi-chip:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.82);
        border-color: rgba(255, 255, 255, 0.22);
      }

      .tc-wkpi-chip .tc-wkpi-lbl {
        font-size: 0.6rem;
        opacity: 0.8;
      }

      .tc-wkpi-chip .tc-wkpi-cnt {
        font-size: 0.82rem;
        font-weight: 700;
        line-height: 1;
      }

      /* Cores base por tipo */
      .tc-wkpi-chip--green {
        color: rgba(74, 222, 128, 0.75);
        border-color: rgba(74, 222, 128, 0.22);
        background: rgba(74, 222, 128, 0.04);
      }

      .tc-wkpi-chip--blue {
        color: rgba(96, 165, 250, 0.75);
        border-color: rgba(96, 165, 250, 0.22);
        background: rgba(96, 165, 250, 0.04);
      }

      .tc-wkpi-chip--amber {
        color: rgba(251, 191, 36, 0.75);
        border-color: rgba(251, 191, 36, 0.22);
        background: rgba(251, 191, 36, 0.04);
      }

      /* Estado ativo por modo */
      .tc-wkpi-chip.tc-wkpi--active {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.28);
        color: rgba(255, 255, 255, 0.92);
      }

      .tc-wkpi-chip[data-wallet-filter="deploys"].tc-wkpi--active {
        background: rgba(74, 222, 128, 0.12);
        border-color: rgba(74, 222, 128, 0.38);
        color: #4ade80;
      }

      .tc-wkpi-chip[data-wallet-filter="verified"].tc-wkpi--active {
        background: rgba(96, 165, 250, 0.12);
        border-color: rgba(96, 165, 250, 0.38);
        color: #60a5fa;
      }

      .tc-wkpi-chip[data-wallet-filter="pending"].tc-wkpi--active {
        background: rgba(251, 191, 36, 0.12);
        border-color: rgba(251, 191, 36, 0.38);
        color: #fbbf24;
      }

      .tc-wkpi-chip[data-wallet-filter="views"].tc-wkpi--active {
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.78);
      }

      /* Info não-clicável (Rede, Período) */
      .tc-wkpi-info {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
        padding: 4px 10px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(255, 255, 255, 0.02);
        pointer-events: none;
        white-space: nowrap;
        line-height: 1.25;
      }

      .tc-wkpi-info .tc-wkpi-lbl {
        font-size: 0.58rem;
        color: rgba(255, 255, 255, 0.38);
      }

      .tc-wkpi-info .tc-wkpi-cnt {
        font-size: 0.72rem;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.68);
      }

      /* Botões de modo de filtro (legado — mantido para compatibilidade) */
      .tc-filter-mode-btn {
        font-size: 0.72rem;
        padding: 4px 10px;
        border-radius: 6px;
        border: 1px solid rgba(255, 255, 255, 0.14);
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.55);
        cursor: pointer;
        transition: all .15s;
        white-space: nowrap;
      }

      .tc-filter-mode-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255, 255, 255, 0.82);
      }

      .tc-filter-mode-btn--active {
        background: rgba(96, 165, 250, 0.16);
        border-color: rgba(96, 165, 250, 0.4);
        color: #60a5fa;
        font-weight: 600;
      }

      .tc-filter-mode-btn[data-mode="deploys"].tc-filter-mode-btn--active {
        background: rgba(74, 222, 128, 0.14);
        border-color: rgba(74, 222, 128, 0.35);
        color: #4ade80;
      }

      .tc-filter-mode-btn[data-mode="views"].tc-filter-mode-btn--active {
        background: rgba(255, 255, 255, 0.07);
        border-color: rgba(255, 255, 255, 0.22);
        color: rgba(255, 255, 255, 0.75);
      }

      /* Badges de ação na tabela de logs */
      .tc-action-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.65rem;
        font-weight: 600;
        padding: 2px 7px;
        border-radius: 999px;
        white-space: nowrap;
        letter-spacing: 0.01em;
      }

      .tc-action-badge--deploy {
        background: rgba(74, 222, 128, 0.15);
        color: #4ade80;
        border: 1px solid rgba(74, 222, 128, 0.3);
      }

      .tc-action-badge--mine {
        background: rgba(96, 165, 250, 0.12);
        color: #60a5fa;
        border: 1px solid rgba(96, 165, 250, 0.25);
        font-size: 0.6rem;
      }

      .tc-action-badge--verify {
        background: rgba(59, 130, 246, 0.15);
        color: #93c5fd;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }

      .tc-action-badge--fail {
        background: rgba(239, 68, 68, 0.12);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }

      .tc-action-badge--view {
        background: rgba(255, 255, 255, 0.06);
        color: rgba(255, 255, 255, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      .tc-action-badge--wallet {
        background: rgba(251, 191, 36, 0.12);
        color: #fbbf24;
        border: 1px solid rgba(251, 191, 36, 0.25);
      }

      .tc-action-badge--rpc {
        background: rgba(167, 139, 250, 0.12);
        color: #a78bfa;
        border: 1px solid rgba(167, 139, 250, 0.25);
      }

      .tc-action-badge--tools {
        background: rgba(249, 115, 22, 0.12);
        color: #fb923c;
        border: 1px solid rgba(249, 115, 22, 0.25);
      }

      .tc-action-badge--logs {
        background: rgba(255, 255, 255, 0.04);
        color: rgba(255, 255, 255, 0.4);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      /* Linha de deploy — destaque sutil */
      tr.tc-row-deploy td:first-child {
        border-left: 2px solid rgba(74, 222, 128, 0.4);
      }
    </style>

    <!-- ═══════════════════════════════════════════════════════════════
       01 · FILTROS DO PERÍODO
       Padrão: tcd-card-head (fora) + tc-modal-details-box (dentro)
  ═══════════════════════════════════════════════════════════════════ -->
    <div class="tcd-card mb-3">

      <div class="tcd-card-head mb-3">
        <div class="tcd-card-head-icon--blue">
          <i class="bi bi-funnel-fill"></i>
        </div>
        <div>
          <h3 style="color:#60a5fa">Filtros do Período</h3>
          <p>Intervalo de datas</p>
        </div>
      </div>

      <div class="tc-modal-details-box">

        <!-- Seleção de período -->
        <div class="d-flex flex-wrap gap-3 align-items-end">
          <div class="flex-grow-1" style="min-width:140px">
            <label class="tc-field-label"><i class="bi bi-calendar3 me-1"></i>Data início</label>
            <input type="date" class="tc-field-input" id="logsStart"
              value="<?= htmlspecialchars($startDate, ENT_QUOTES, "UTF-8") ?>" />
          </div>
          <div class="flex-grow-1" style="min-width:140px">
            <label class="tc-field-label"><i class="bi bi-calendar-range me-1"></i>Data fim</label>
            <input type="date" class="tc-field-input" id="logsEnd"
              value="<?= htmlspecialchars($endDate, ENT_QUOTES, "UTF-8") ?>" />
          </div>
          <div class="d-flex gap-2 flex-shrink-0">
            <button class="tc-btn-primary-ds" id="btnLoadLogs">
              <i class="bi bi-arrow-repeat me-1"></i>Carregar
            </button>
          </div>
        </div>

      </div><!-- /tc-modal-details-box -->
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
       02 · RESUMO DO PERÍODO — Dashboard interativo
  ═══════════════════════════════════════════════════════════════════ -->
    <div class="tcd-card mb-3">

      <div class="tcd-card-head mb-3">
        <div class="tcd-card-head-icon--green">
          <i class="bi bi-bar-chart-fill"></i>
        </div>
        <div>
          <h3 style="color:#4ade80">Resumo do Período</h3>
          <p><?= htmlspecialchars($startDateDisplay, ENT_QUOTES, "UTF-8") ?> → <?= htmlspecialchars($endDateDisplay, ENT_QUOTES, "UTF-8") ?></p>
        </div>
      </div>

      <div class="tc-modal-details-box">

        <!-- ── Chips (estilo "Sua Carteira") ───────────────────────────── -->
        <div class="d-flex flex-wrap gap-2 mb-2 align-items-center" id="periodKpiRow">

          <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi--active"
            data-kpi-filter="all" title="Mostrar o total (visitas + ações)">
            <span class="tc-wkpi-lbl"><i class="bi bi-list me-1"></i>Todos</span>
            <span class="tc-wkpi-cnt"><?= number_format($totalRows) ?></span>
          </button>

          <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi-chip--blue"
            data-kpi-filter="ip" title="Filtrar por visitas (IPLogs)">
            <span class="tc-wkpi-lbl"><i class="bi bi-eye me-1"></i>Visitas</span>
            <span class="tc-wkpi-cnt"><?= number_format($kpiTotalIp) ?></span>
          </button>

          <?php if ($kpiUniqueIp > 1): ?>
            <button type="button" class="tc-wkpi tc-wkpi-chip"
              data-kpi-series="uniqueIp" title="Mostrar IPs únicos no gráfico">
              <span class="tc-wkpi-lbl"><i class="bi bi-hdd-network me-1"></i>IPs únicos</span>
              <span class="tc-wkpi-cnt"><?= number_format($kpiUniqueIp) ?></span>
            </button>
          <?php else: ?>
            <span class="tc-wkpi-info">
              <span class="tc-wkpi-lbl"><i class="bi bi-hdd-network me-1"></i>IPs únicos</span>
              <span class="tc-wkpi-cnt"><?= number_format($kpiUniqueIp) ?></span>
            </span>
          <?php endif; ?>

          <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi-chip--green"
            data-kpi-filter="sc" title="Filtrar por ações (SCLogs)">
            <span class="tc-wkpi-lbl"><i class="bi bi-lightning-charge me-1"></i>Ações</span>
            <span class="tc-wkpi-cnt"><?= number_format($kpiTotalClient) ?></span>
          </button>

          <?php if ($kpiUniqueWallet > 1): ?>
            <button type="button" class="tc-wkpi tc-wkpi-chip"
              data-kpi-series="wallets" title="Mostrar movimentação por wallet no gráfico">
              <span class="tc-wkpi-lbl"><i class="bi bi-wallet2 me-1"></i>Carteiras</span>
              <span class="tc-wkpi-cnt"><?= number_format($kpiUniqueWallet) ?></span>
            </button>
          <?php else: ?>
            <span class="tc-wkpi-info">
              <span class="tc-wkpi-lbl"><i class="bi bi-wallet2 me-1"></i>Carteiras</span>
              <span class="tc-wkpi-cnt"><?= number_format($kpiUniqueWallet) ?></span>
            </span>
          <?php endif; ?>

          <?php if ($kpiUniquePages > 1): ?>
            <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi-chip--amber"
              data-kpi-series="uniquePages" title="Mostrar páginas únicas no gráfico">
              <span class="tc-wkpi-lbl"><i class="bi bi-file-earmark me-1"></i>Páginas</span>
              <span class="tc-wkpi-cnt"><?= number_format($kpiUniquePages) ?></span>
            </button>
          <?php else: ?>
            <span class="tc-wkpi-info">
              <span class="tc-wkpi-lbl"><i class="bi bi-file-earmark me-1"></i>Páginas</span>
              <span class="tc-wkpi-cnt"><?= number_format($kpiUniquePages) ?></span>
            </span>
          <?php endif; ?>

          <span class="tc-wkpi-info">
            <span class="tc-wkpi-lbl"><i class="bi bi-calendar3 me-1"></i>Dias</span>
            <span class="tc-wkpi-cnt"><?= number_format($daysSpan) ?></span>
          </span>

          <span class="tc-wkpi-info">
            <span class="tc-wkpi-lbl"><i class="bi bi-clock me-1"></i>Período ativo</span>
            <span class="tc-wkpi-cnt"><?= htmlspecialchars($activeDuration, ENT_QUOTES, "UTF-8") ?></span>
          </span>

          <?php if ($isChief && $daysRunning > 0): ?>
            <span class="tc-wkpi-info">
              <span class="tc-wkpi-lbl"><i class="bi bi-archive me-1"></i>Histórico total</span>
              <span class="tc-wkpi-cnt"><?= number_format($daysRunning) ?>d</span>
            </span>
          <?php endif; ?>

          <span class="tc-wkpi-info ms-auto">
            <span class="tc-wkpi-lbl"><i class="bi bi-calendar-range me-1"></i>Período</span>
            <span class="tc-wkpi-cnt"><?= htmlspecialchars($startDateDisplay, ENT_QUOTES, "UTF-8") ?> → <?= htmlspecialchars($endDateDisplay, ENT_QUOTES, "UTF-8") ?></span>
          </span>

        </div>

        <!-- ── Gráfico principal (full width) + legendas abaixo ───────────── -->
        <div class="mt-1 pt-3" style="border-top:1px solid rgba(255,255,255,0.07)">

          <div class="d-flex align-items-center gap-2 tc-status-text tc-text-sm mb-2">
            <i class="bi bi-graph-up me-1"></i>Tendência diária
          </div>

          <?php if ($nDays > 1 && $ipPts): ?>
            <div id="tcTrendWrap" style="position:relative;overflow:visible">
              <svg id="tcTrendSvg" viewBox="0 0 <?= $svgW ?> <?= $svgH ?>" width="100%" height="70"
                preserveAspectRatio="none" style="display:block;overflow:visible">
                <line x1="0" y1="<?= $svgH ?>" x2="<?= $svgW ?>" y2="<?= $svgH ?>"
                  stroke="rgba(255,255,255,0.08)" stroke-width="1" />
                <g id="tcTrendSeries"></g>
                <line id="tcTrendHoverLine" x1="0" y1="0" x2="0" y2="<?= $svgH ?>" stroke="rgba(255,255,255,0.16)" stroke-width="1" style="display:none" />
              </svg>
              <div id="tcTrendTooltip" class="d-none"
                style="position:absolute;left:0;top:0;transform:translate(-9999px,-9999px);pointer-events:none;background:rgba(0,0,0,0.78);border:1px solid rgba(255,255,255,0.14);border-radius:10px;padding:8px 10px;min-width:140px">
                <div style="font-size:0.68rem;color:rgba(255,255,255,0.85)" id="tcTrendTipDate"></div>
                <div style="font-size:0.7rem;margin-top:3px" id="tcTrendTipLines"></div>
              </div>
              <div id="tcTrendEmptyMsg" class="d-none"
                style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;background:rgba(0,0,0,0.25);border:1px solid rgba(255,255,255,0.06);border-radius:12px">
                <div style="max-width:520px">
                  <div style="font-size:0.78rem;color:rgba(255,255,255,0.92);font-weight:600">Seleção sem dados</div>
                  <div style="font-size:0.7rem;color:rgba(255,255,255,0.62);margin-top:4px">
                    A seleção não foi satisfatória. Favor reformular as escolhas.
                  </div>
                </div>
              </div>
            </div>
            <div id="tcTrendAxis" class="d-flex justify-content-between mt-1" style="font-size:0.6rem;color:rgba(255,255,255,0.28)">
              <span id="tcTrendLblLeft"><?= htmlspecialchars(substr($dailyLabels[0] ?? "", 5), ENT_QUOTES, "UTF-8") ?></span>
              <?php $mid = (int) floor(($nDays - 1) / 2); ?>
              <span id="tcTrendLblMid" class="<?= $nDays > 4 ? "" : "d-none" ?>"><?= htmlspecialchars(substr($dailyLabels[$mid] ?? "", 5), ENT_QUOTES, "UTF-8") ?></span>
              <span id="tcTrendLblRight"><?= htmlspecialchars(substr(end($dailyLabels) ?: "", 5), ENT_QUOTES, "UTF-8") ?></span>
            </div>
          <?php else: ?>
            <div class="tc-status-text tc-text-sm py-3 text-center" style="opacity:.5">Período único — sem tendência disponível</div>
          <?php endif; ?>

          <div class="d-flex gap-3 mt-3" style="flex-wrap:nowrap;align-items:flex-start">
            <div style="flex:1;min-width:0">
              <div class="d-flex align-items-center gap-2 tc-status-text tc-text-sm mb-2">
                <span><i class="bi bi-bar-chart-steps me-1"></i>Top páginas</span>
                <span id="tcTopPagesActiveFilter" class="ms-auto d-none"
                  style="font-size:0.65rem;color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);padding:2px 8px;border-radius:999px"></span>
              </div>
              <?php if ($topIpPages): foreach ($topIpPages as $idx => $tp):
                  if ($idx >= 8) break;
                  $pct   = $maxPageCount > 0 ? round((int) $tp["count"] / $maxPageCount * 100) : 0;
                  $label = (string) $tp["page"] === "index.php" ? "home" : (string) $tp["page"];
              ?>
                  <div class="d-flex align-items-center gap-2 mb-1 tc-top-page-row"
                    role="button" tabindex="0"
                    data-top-page="<?= htmlspecialchars((string) $tp["page"], ENT_QUOTES, "UTF-8") ?>"
                    data-top-page-idx="<?= (int) $idx ?>"
                    style="cursor:pointer;border-radius:8px;padding:2px 4px">
                    <span class="text-truncate" style="width:76px;font-size:0.67rem;color:rgba(255,255,255,0.55)"
                      title="<?= htmlspecialchars($label, ENT_QUOTES, "UTF-8") ?>">
                      <?= htmlspecialchars($label, ENT_QUOTES, "UTF-8") ?>
                    </span>
                    <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
                      <div style="height:100%;width:<?= $pct ?>%;background:linear-gradient(90deg,#60a5fa,#818cf8);border-radius:3px;transition:width .4s"></div>
                    </div>
                    <span style="font-size:0.63rem;min-width:34px;text-align:right;color:rgba(255,255,255,0.4)">
                      <?= number_format((int) $tp["count"]) ?>
                    </span>
                  </div>
              <?php endforeach;
              endif; ?>
            </div>

            <?php if ($kpiTotalClient > 0 && count($topActions) > 1): ?>
              <div id="tcActionsBox" style="flex:1;min-width:0">
                <div class="d-flex align-items-center gap-2 tc-status-text tc-text-sm mb-2">
                  <i class="bi bi-lightning-charge me-1"></i>Ações por tipo
                  <span id="tcActionsActiveFilter" class="ms-auto d-none"
                    style="font-size:0.65rem;color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);padding:2px 8px;border-radius:999px"></span>
                </div>
                <div>
                  <?php foreach ($topActions as $i => $ta):
                    $pct = $maxActionCount > 0 ? round((int) ($ta["count"] ?? 0) / $maxActionCount * 100) : 0;
                    $lbl = (string) ($ta["label"] ?? "");
                    $key = (string) ($ta["action"] ?? "");
                  ?>
                    <div class="d-flex align-items-center gap-2 mb-1 tc-action-type-row"
                      role="button" tabindex="0"
                      data-action-type="<?= htmlspecialchars($key, ENT_QUOTES, "UTF-8") ?>"
                      data-action-idx="<?= (int) $i ?>"
                      style="cursor:pointer;border-radius:8px;padding:2px 4px">
                      <span class="text-truncate" style="width:92px;font-size:0.67rem;color:rgba(255,255,255,0.55)"
                        title="<?= htmlspecialchars($lbl, ENT_QUOTES, "UTF-8") ?>">
                        <?= htmlspecialchars($lbl, ENT_QUOTES, "UTF-8") ?>
                      </span>
                      <div style="flex:1;height:6px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden">
                        <div style="height:100%;width:<?= $pct ?>%;background:rgba(255,255,255,0.16);border-radius:3px;transition:width .4s"></div>
                      </div>
                      <span style="font-size:0.63rem;min-width:34px;text-align:right;color:rgba(255,255,255,0.4)">
                        <?= number_format((int) ($ta["count"] ?? 0)) ?>
                      </span>
                    </div>
                  <?php endforeach; ?>
                </div>
              </div>
            <?php endif; ?>

            <div style="flex:1;min-width:0">
              <div class="d-flex align-items-center gap-2 tc-status-text tc-text-sm mb-2">
                <span><i class="bi bi-sliders me-1"></i>No gráfico</span>
                <span id="tcSeriesActiveFilter" class="ms-auto d-none"
                  style="font-size:0.65rem;color:rgba(255,255,255,0.75);background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.10);padding:2px 8px;border-radius:999px"></span>
              </div>
              <div id="tcTrendLegend"></div>
            </div>

          </div><!-- /d-flex gap-3 -->
        </div><!-- /mt-1 chart div -->

      </div><!-- /tc-modal-details-box, seção 02 -->
    </div><!-- /tcd-card, seção 02 RESUMO DO PERÍODO -->

    <!-- ═══════════════════════════════════════════════════════════════
       03 · RESUMO DA CARTEIRA ATIVA (card independente)
  ═══════════════════════════════════════════════════════════════════ -->
    <div class="tcd-card mb-3">
      <div class="tcd-card-head mb-3 align-items-start">
        <div class="tcd-card-head-icon--blue">
          <i class="bi bi-table"></i>
        </div>
        <div>
          <h3 class="mb-0">Relatório Detalhado</h3>
          <p class="mb-0">Visitas e ações (unificadas) — carregado sob demanda para economizar memória</p>
        </div>
        <button class="tc-btn-primary-ds px-4 py-2 ms-auto" id="btnLoadReport" type="button" style="display:none">
          <i class="bi bi-arrow-down-circle me-2"></i>Carregar Relatório Completo
        </button>
      </div>

      <!-- Relatório Completo -->
      <div id="reportPlaceholder" style="display:none"></div>
      <div id="tcReportBox">
        <div id="reportContent" style="display:none">
          <div class="tc-modal-details-box mb-3" id="tcReportQueryBox">
            <div class="tcd-card-head mb-2">
              <div class="tcd-card-head-icon--blue">
                <i class="bi bi-wallet2"></i>
              </div>
              <div class="flex-grow-1 min-width-0">
                <h3 class="mb-0" style="color:#60a5fa">Sua Carteira</h3>
                <p class="text-truncate" style="font-size:0.68rem;font-family:monospace;max-width:260px"
                  title="<?= htmlspecialchars($walletCookieNorm, ENT_QUOTES, "UTF-8") ?>">
                  <?= htmlspecialchars($walletCookieNorm, ENT_QUOTES, "UTF-8") ?>
                </p>
              </div>
            </div>

            <?php if ($wTotal === 0): ?>
              <div class="text-center py-3 tc-status-text" style="opacity:.6">
                <i class="bi bi-inbox me-2"></i>Nenhum deploy encontrado no histórico desta carteira.
                <div class="mt-1" style="font-size:0.7rem">O relatório abaixo pode conter contratos apenas visualizados/consultados (não criados por você).</div>
              </div>
            <?php else: ?>
              <div class="d-flex flex-wrap gap-2 mb-3 align-items-center" id="walletKpiRow">

                <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi--active"
                  data-wallet-filter="all" title="Ver todos os registros">
                  <span class="tc-wkpi-lbl"><i class="bi bi-list me-1"></i>Todos</span>
                  <span class="tc-wkpi-cnt"><?= $kpiTotalClient + $kpiTotalIp ?></span>
                </button>

                <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi-chip--green"
                  data-wallet-filter="deploys" title="Ver apenas meus deploys">
                  <span class="tc-wkpi-lbl"><i class="bi bi-rocket-takeoff me-1"></i>Meus deploys</span>
                  <span class="tc-wkpi-cnt"><?= $wTotal ?></span>
                </button>

                <?php if ($wVerified > 0): ?>
                  <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi-chip--blue"
                    data-wallet-filter="verified" title="Contratos verificados no explorer">
                    <span class="tc-wkpi-lbl"><i class="bi bi-patch-check me-1"></i>Verificados</span>
                    <span class="tc-wkpi-cnt"><?= $wVerified ?></span>
                  </button>
                <?php endif; ?>

                <?php if ($wPending > 0): ?>
                  <button type="button" class="tc-wkpi tc-wkpi-chip tc-wkpi-chip--amber"
                    data-wallet-filter="pending" title="Deploiados mas ainda não verificados">
                    <span class="tc-wkpi-lbl"><i class="bi bi-hourglass-split me-1"></i>Pendentes</span>
                    <span class="tc-wkpi-cnt"><?= $wPending ?></span>
                  </button>
                <?php endif; ?>

                <button type="button" class="tc-wkpi tc-wkpi-chip"
                  data-wallet-filter="views" title="Contratos apenas visualizados/consultados (não criados)">
                  <span class="tc-wkpi-lbl"><i class="bi bi-eye me-1"></i>Visualizações</span>
                  <span class="tc-wkpi-cnt"><?= max(0, $kpiTotalClient - $wTotal) ?></span>
                </button>

                <?php if ($wFirst): ?>
                  <span class="tc-wkpi-info ms-auto">
                    <span class="tc-wkpi-lbl"><i class="bi bi-calendar-range me-1"></i>Período</span>
                    <span class="tc-wkpi-cnt"><?= htmlspecialchars($wFirst, ENT_QUOTES, "UTF-8") ?><?php if ($wLast && $wLast !== $wFirst): ?> → <?= htmlspecialchars($wLast, ENT_QUOTES, "UTF-8") ?><?php endif; ?></span>
                  </span>
                <?php endif; ?>

                <div class="tc-status-text" style="font-size:0.67rem;opacity:.65">
                  <i class="bi bi-info-circle me-1" style="color:#60a5fa"></i>
                  No explorer, <em>Contract Creator</em> mostra a carteira deployer da plataforma — não a sua. Clique nos chips acima para filtrar o relatório.
                </div>
              </div>


            <?php endif; ?>



            <div class="d-flex flex-wrap gap-2 align-items-end mb-3">
              <div style="flex:1;min-width:240px">
                <label class="tc-field-label"><i class="bi bi-box me-1"></i>Contrato</label>
                <input type="text" class="tc-field-input tc-field-input--mono" id="fltContractQuery"
                  placeholder="0x... (busca parcial)" />
              </div>

              <div class="d-flex gap-2 align-items-end flex-shrink-0">
                <button class="tc-btn-test-ds" id="btnApplyTableFilter" type="button" title="Aplicar filtros">
                  <i class="bi bi-funnel"></i>
                </button>
                <button class="tc-btn-clear-ds" id="btnClearTableFilter" type="button" title="Limpar todos os filtros">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="tc-modal-details-box" id="tcReportTableBox">
            <div class="table-responsive">
              <table class="table table-sm table-hover mb-0 w-100"
                style="font-size:0.8rem;--bs-table-bg:transparent;--bs-table-color:rgba(255,255,255,0.92);--bs-table-hover-bg:rgba(255,255,255,0.04);--bs-table-striped-bg:rgba(255,255,255,0.03);--bs-table-border-color:rgba(255,255,255,0.08)">
                <thead>
                  <tr class="tc-status-text" style="font-size:0.75rem">
                    <th data-sort="when" class="tc-sortable text-nowrap"><i class="bi bi-calendar3 me-1"></i>Data/Hora<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="wallet" class="tc-sortable"><i class="bi bi-wallet2 me-1"></i>Wallet<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="contract" class="tc-sortable"><i class="bi bi-box me-1"></i>Contrato<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="page" class="tc-sortable text-end"><i class="bi bi-box-arrow-in-right me-1"></i>Página<span class="tc-sort-ind ms-1"></span></th>
                  </tr>
                </thead>
                <tbody id="visitsRows"></tbody>
              </table>
            </div>

            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3" id="visitsPagerWrap">
              <div class="d-flex align-items-center gap-2">
                <span id="visitsCountInfo" class="tc-status-text tc-text-sm"></span>
                <select class="tc-field-select ms-2" id="pageSizeSel" style="width:auto;padding:3px 8px">
                  <option value="10" selected>10 / pág</option>
                  <option value="25">25 / pág</option>
                  <option value="50">50 / pág</option>
                  <option value="100">100 / pág</option>
                </select>
              </div>
              <div class="d-flex align-items-center gap-2">
                <div class="btn-group btn-group-sm d-none" id="visitsPager"></div>
                <select class="tc-field-select" id="downloadTypeSel" style="width:auto;padding:3px 8px">
                  <option value="report" selected>Relatório (IP+SC)</option>
                  <option value="ip">Visitas (IPLogs)</option>
                  <option value="sc">Ações (SCLogs)</option>
                </select>
                <button class="tc-btn-test-ds tc-btn-sm-ds" id="btnDownloadLog" type="button">
                  <i class="bi bi-download me-1"></i>Baixar
                </button>
              </div>
            </div>
          </div>
        </div><!-- /reportContent -->
      </div><!-- /tcReportBox -->
    </div><!-- /tcd-card, seção 03 SUA CARTEIRA + RELATÓRIO -->

    <!-- Dados injetados para relatorios-ui.js -->
    <script>
      window.RELATORIOS_IS_CHIEF = <?= $isChief ? "true" : "false" ?>;
      window.RELATORIOS_ACTIVE_WALLET = <?= json_encode($walletCookieNorm, $jsonSafeFlags) ?>;
      window.RELATORIOS_VERIFIED_CONTRACTS = <?= json_encode($verifiedContracts, $jsonSafeFlags) ?: "{}" ?>;
      window.RELATORIOS_START_DATE = <?= json_encode($startDate, $jsonSafeFlags) ?>;
      window.RELATORIOS_END_DATE = <?= json_encode($endDate, $jsonSafeFlags) ?>;
      window.RELATORIOS_DASHBOARD = <?= json_encode($logsDashboard, $jsonSafeFlags) ?: "null" ?>;
      window.WALLET_DEPLOY_ROWS = <?= json_encode($walletDeployRows,  $jsonSafeFlags) ?: "[]" ?>;
      window.WALLET_ALL_VERIFIED = <?= json_encode($walletAllVerified, $jsonSafeFlags) ?: "{}" ?>;
    </script>
    <!-- Dados pesados: JSON inerte, parseado só ao clicar "Carregar" -->
    <script id="tc-relatorios-data-src" type="application/json">
      <?= $visitsDataJson ?: "[]" ?>
    </script>

    <!-- ── Rodapé ── -->
    <div class="tcd-card mt-3">
      <div class="d-flex flex-wrap gap-2 align-items-center">
        <a href="index.php?page=tools" class="tc-btn-home-ds px-4 py-2 text-decoration-none ms-auto">
          <i class="bi bi-house-door me-2"></i>Início
        </a>
      </div>
    </div>

  <?php } ?>
</div><!-- /container-fluid -->

<?php if (isset($enqueue_script_src)) {
  $enqueue_script_src("assets/js/modules/relatorios/relatorios-ui.js");
} ?>
