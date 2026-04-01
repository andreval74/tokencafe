<?php
require_once __DIR__ . "/../../includes/admin-config.php";

$walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$isChief = tokencafe_is_chief_admin($walletCookie);
if (!$isChief && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) $isChief = true;
$hasWallet = trim($walletCookie) !== "";

$endDate = isset($_GET["end"]) ? trim((string) $_GET["end"]) : "";
$startDate = isset($_GET["start"]) ? trim((string) $_GET["start"]) : "";
$legacyDate = isset($_GET["date"]) ? trim((string) $_GET["date"]) : "";

if ($endDate === "" && $legacyDate !== "") $endDate = $legacyDate;
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) $endDate = gmdate("Y-m-d");

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
  $startDate = gmdate("Y-m-01", strtotime($endDate . " 00:00:00 UTC"));
}

$tsStart = strtotime($startDate . " 00:00:00 UTC");
$tsEnd = strtotime($endDate . " 00:00:00 UTC");
if ($tsStart === false || $tsEnd === false) {
  $endDate = gmdate("Y-m-d");
  $startDate = gmdate("Y-m-01");
  $tsStart = strtotime($startDate . " 00:00:00 UTC");
  $tsEnd = strtotime($endDate . " 00:00:00 UTC");
}
if ($tsStart > $tsEnd) {
  $tmp = $startDate;
  $startDate = $endDate;
  $endDate = $tmp;
  $tsStart = strtotime($startDate . " 00:00:00 UTC");
  $tsEnd = strtotime($endDate . " 00:00:00 UTC");
}

$maxDays = 366;
$daysSpan = (int) floor(($tsEnd - $tsStart) / 86400) + 1;
if ($daysSpan > $maxDays) {
  $tsStart = $tsEnd - (($maxDays - 1) * 86400);
  $startDate = gmdate("Y-m-d", $tsStart);
  $daysSpan = $maxDays;
}

$root = dirname(__DIR__, 2);
$logsDir = $root . DIRECTORY_SEPARATOR . "modules" . DIRECTORY_SEPARATOR . "logs" . DIRECTORY_SEPARATOR . "storage" . DIRECTORY_SEPARATOR . "admin-logs";
$visitsFile = $logsDir . DIRECTORY_SEPARATOR . "IPLogs-" . $endDate . ".php";
$clientFile = $logsDir . DIRECTORY_SEPARATOR . "SCLogs-" . $endDate . ".php";

$filterWallet = "";
$filterChain = "";
$filterContract = "";
if ($isChief) {
  $filterWallet = strtolower(trim((string) ($_GET["f_wallet"] ?? "")));
  $filterChain = trim((string) ($_GET["f_chain"] ?? ""));
  $filterContract = strtolower(trim((string) ($_GET["f_contract"] ?? "")));
} else {
  if ($hasWallet) {
    $filterWallet = strtolower(trim($walletCookie));
    $filterChain = "";
    $filterContract = "";
  }
}

$normChain = function (string $chain): string {
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
};
$filterChain = $normChain($filterChain);

$walletCookieNorm = strtolower(trim($walletCookie));
$adminWalletDefault = $filterWallet;
$adminChainDefault = $filterChain;
$adminContractDefault = $filterContract;

function tc_parse_log_line(string $line): ?array
{
  $line = trim($line);
  if ($line === "") return null;
  if (str_starts_with($line, "<?php")) return null;
  if ($line === "data;hora;ip;wallet;page" || $line === "data;hora;ip;wallet;page;chain;contract") return null;

  if (str_contains($line, ";") && !str_starts_with($line, "[")) {
    $parts = explode(";", $line);
    if (count($parts) < 5) return null;
    return [
      "date" => trim((string) $parts[0]),
      "time" => trim((string) $parts[1]),
      "ip" => trim((string) $parts[2]),
      "wallet" => trim((string) $parts[3]),
      "page" => trim((string) $parts[4]),
      "chain" => isset($parts[5]) ? trim((string) $parts[5]) : "",
      "contract" => isset($parts[6]) ? trim((string) $parts[6]) : "",
    ];
  }

  if (!preg_match('/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\]\s*(.*)$/', $line, $m)) return null;

  $date = $m[1];
  $time = $m[2];
  $rest = (string) $m[3];
  $pairs = [];

  if (preg_match_all('/\b([a-zA-Z_]+)=([^\s]+)/', $rest, $mm, PREG_SET_ORDER)) {
    foreach ($mm as $p) {
      $k = strtolower((string) $p[1]);
      $v = (string) $p[2];
      $pairs[$k] = $v;
    }
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
    "date" => $date,
    "time" => $time,
    "ip" => $pairs["ip"] ?? "",
    "wallet" => $pairs["wallet"] ?? "",
    "page" => $page,
    "chain" => $pairs["chain"] ?? "",
    "contract" => $pairs["contract"] ?? "",
  ];
}

function tc_read_log_rows(string $file, int $max = 200): array
{
  if (!is_file($file)) return [];
  $content = @file($file, FILE_IGNORE_NEW_LINES);
  if (!is_array($content)) return [];
  $rows = [];
  foreach ($content as $line) {
    $r = tc_parse_log_line((string) $line);
    if (!$r) continue;
    $rows[] = $r;
  }
  $total = count($rows);
  if ($total <= $max) return $rows;
  return array_slice($rows, $total - $max);
}

function tc_preview_rows(array $rows, int $head = 1, int $tail = 3): array
{
  $total = count($rows);
  if ($total <= ($head + $tail)) return $rows;
  $out = [];
  for ($i = 0; $i < $head && $i < $total; $i++) $out[] = $rows[$i];
  $out[] = ["__ellipsis" => true];
  $start = max($head, $total - $tail);
  for ($i = $start; $i < $total; $i++) $out[] = $rows[$i];
  return $out;
}

function tc_apply_filters(array $rows, string $wallet, string $chain, string $contract): array
{
  $wallet = strtolower(trim($wallet));
  $chain = trim($chain);
  $contract = strtolower(trim($contract));
  return array_values(array_filter($rows, function ($r) use ($wallet, $chain, $contract) {
    if ($wallet !== "" && strtolower((string) ($r["wallet"] ?? "")) !== $wallet) return false;
    if ($chain !== "" && trim((string) ($r["chain"] ?? "")) !== $chain) return false;
    if ($contract !== "" && strtolower((string) ($r["contract"] ?? "")) !== $contract) return false;
    return true;
  }));
}

function tc_unique_count(array $rows, string $key): int
{
  $m = [];
  foreach ($rows as $r) {
    $v = isset($r[$key]) ? (string) $r[$key] : "";
    if ($v === "") continue;
    $m[$v] = 1;
  }
  return count($m);
}

function tc_top_pages(array $rows, int $limit = 8): array
{
  $m = [];
  foreach ($rows as $r) {
    $p = isset($r["page"]) ? (string) $r["page"] : "";
    if ($p === "") continue;
    $m[$p] = ($m[$p] ?? 0) + 1;
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
    $ip = isset($r["ip"]) ? (string) $r["ip"] : "";
    if ($ip === "") continue;
    $m[$ip] = ($m[$ip] ?? 0) + 1;
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
    $t = isset($r["time"]) ? (string) $r["time"] : "";
    $h = (int) substr($t, 0, 2);
    $hrs[$h] = true;
  }
  $sofar = max(1, count($hrs));
  return count($rows) / $sofar;
}

function tc_unique_nonempty(array $rows, string $key): int
{
  $m = [];
  foreach ($rows as $r) {
    $v = isset($r[$key]) ? trim((string) $r[$key]) : "";
    if ($v === "") continue;
    $m[strtolower($v)] = true;
  }
  return count($m);
}

function tc_duration_human(int $secs): string
{
  if ($secs <= 0) return "0m";
  $days = intdiv($secs, 86400);
  $secs = $secs % 86400;
  $hrs = intdiv($secs, 3600);
  $secs = $secs % 3600;
  $mins = intdiv($secs, 60);
  if ($days > 0) return $days . "d " . str_pad((string) $hrs, 2, "0", STR_PAD_LEFT) . "h " . str_pad((string) $mins, 2, "0", STR_PAD_LEFT) . "m";
  if ($hrs > 0) return $hrs . "h " . str_pad((string) $mins, 2, "0", STR_PAD_LEFT) . "m";
  return $mins . "m";
}

$allIpWindow = [];
$allClientWindow = [];
for ($ts = $tsStart; $ts <= $tsEnd; $ts += 86400) {
  $d = gmdate("Y-m-d", $ts);
  $ipFile = $logsDir . DIRECTORY_SEPARATOR . "IPLogs-" . $d . ".php";
  $scFile = $logsDir . DIRECTORY_SEPARATOR . "SCLogs-" . $d . ".php";
  $ipRows = tc_apply_filters(tc_read_log_rows($ipFile, 5000), $filterWallet, $filterChain, $filterContract);
  $scRows = tc_apply_filters(tc_read_log_rows($scFile, 5000), $filterWallet, $filterChain, $filterContract);
  $allIpWindow = array_merge($allIpWindow, $ipRows);
  $allClientWindow = array_merge($allClientWindow, $scRows);
}

$kpiTotalIp = count($allIpWindow);
$kpiUniqueIp = tc_unique_count($allIpWindow, "ip");
$kpiTotalClient = count($allClientWindow);
$kpiUniqueWallet = tc_unique_count(array_merge($allIpWindow, $allClientWindow), "wallet");

$projIp = (int) round(tc_rate_per_hour($allIpWindow) * 24);
$projClient = (int) round(tc_rate_per_hour($allClientWindow) * 24);
$kpiUniqueClientWallet = tc_unique_count($allClientWindow, "wallet");
$kpiUniquePages = tc_unique_nonempty($allIpWindow, "page");
$minActTs = null;
$maxActTs = null;
foreach ($allIpWindow as $r) {
  $dt = trim((string) ($r["date"] ?? "")) . " " . trim((string) ($r["time"] ?? ""));
  $ts = strtotime($dt . " UTC");
  if ($ts === false) continue;
  if ($minActTs === null || $ts < $minActTs) $minActTs = $ts;
  if ($maxActTs === null || $ts > $maxActTs) $maxActTs = $ts;
}
$activeDuration = ($minActTs !== null && $maxActTs !== null) ? tc_duration_human(max(0, (int) ($maxActTs - $minActTs))) : "0m";
$daysRunning = 0;
if ($isChief) {
  $minTs = null;
  $files = [];
  $a = @glob($logsDir . DIRECTORY_SEPARATOR . "IPLogs-*.php");
  $b = @glob($logsDir . DIRECTORY_SEPARATOR . "SCLogs-*.php");
  if (is_array($a)) $files = array_merge($files, $a);
  if (is_array($b)) $files = array_merge($files, $b);
  foreach ($files as $fp) {
    $bn = basename((string) $fp);
    if (!preg_match('/^(IPLogs|SCLogs)-(\d{4}-\d{2}-\d{2})\.php$/', $bn, $m)) continue;
    $ts = strtotime($m[2] . " 00:00:00 UTC");
    if ($ts === false) continue;
    if ($minTs === null || $ts < $minTs) $minTs = $ts;
  }
  if ($minTs !== null) {
    $now0 = strtotime(gmdate("Y-m-d") . " 00:00:00 UTC");
    if ($now0 !== false) $daysRunning = (int) floor(($now0 - $minTs) / 86400) + 1;
  }
}

$topIpPages = tc_top_pages($allIpWindow, 8);
$topIps = $isChief ? tc_top_ips($allIpWindow, 8) : [];

// Enriquecimento: preencher contrato na lista de visitas usando eventos da área do cliente (SCLogs)
// Regras: mesma wallet, página contendo "contrato" e contrato válido; janela de segurança forte (2s) e janela de fallback (5min)
$isValidContract = function (string $addr): bool {
  $addr = trim($addr);
  return $addr !== "" && preg_match('/^0x[a-f0-9]{40}$/i', $addr) === 1;
};
$toTs = function (string $d, string $h): int {
  $ts = strtotime(trim($d) . " " . trim($h) . " UTC");
  return $ts === false ? 0 : (int) $ts;
};
$isContractPage = function (string $p): bool {
  return stripos($p, "contrato") !== false;
};

$scIndex = [];
foreach ($allClientWindow as $r) {
  $d = trim((string) ($r["date"] ?? ""));
  $h = trim((string) ($r["time"] ?? ""));
  $w = strtolower(trim((string) ($r["wallet"] ?? "")));
  $p = trim((string) ($r["page"] ?? ""));
  $ct = trim((string) ($r["contract"] ?? ""));
  $ch = trim((string) ($r["chain"] ?? ""));
  if ($d === "" || $h === "" || $w === "" || $p === "" || !$isContractPage($p) || !$isValidContract($ct)) continue;
  $ts = $toTs($d, $h);
  if ($ts <= 0) continue;
  $key = $w . ";" . $p;
  $scIndex[$key][] = ["ts" => $ts, "contract" => $ct, "chain" => $ch];
}
foreach ($scIndex as $k => $arr) {
  usort($arr, function ($a, $b) { return ($a["ts"] ?? 0) <=> ($b["ts"] ?? 0); });
  $scIndex[$k] = $arr;
}

$windowStrongSec = 2;
$windowSoftSec = 300;
for ($i = 0, $n = count($allIpWindow); $i < $n; $i++) {
  $r = $allIpWindow[$i];
  $ct = trim((string) ($r["contract"] ?? ""));
  if ($ct !== "") continue;
  $d = trim((string) ($r["date"] ?? ""));
  $h = trim((string) ($r["time"] ?? ""));
  $w = strtolower(trim((string) ($r["wallet"] ?? "")));
  $p = trim((string) ($r["page"] ?? ""));
  if ($d === "" || $h === "" || $w === "" || $p === "" || !$isContractPage($p)) continue;
  $ts = $toTs($d, $h);
  if ($ts <= 0) continue;
  $key = $w . ";" . $p;
  if (!isset($scIndex[$key])) continue;
  $bestStrong = null;
  $bestStrongDelta = $windowStrongSec + 1;
  $bestSoft = null;
  $bestSoftDelta = $windowSoftSec + 1;
  $chainIp = trim((string) ($r["chain"] ?? ""));
  foreach ($scIndex[$key] as $cand) {
    $cts = (int) ($cand["ts"] ?? 0);
    if ($cts <= 0) continue;
    $delta = abs($cts - $ts);
    $candChain = trim((string) ($cand["chain"] ?? ""));
    if ($delta <= $windowStrongSec) {
      if ($delta < $bestStrongDelta) {
        $bestStrong = $cand;
        $bestStrongDelta = $delta;
      } else if ($delta === $bestStrongDelta && $bestStrong !== null && $chainIp !== "") {
        $bestChain = trim((string) ($bestStrong["chain"] ?? ""));
        if ($candChain === $chainIp && $bestChain !== $chainIp) $bestStrong = $cand;
      }
      continue;
    }
    if ($delta <= $windowSoftSec) {
      if ($delta < $bestSoftDelta) {
        $bestSoft = $cand;
        $bestSoftDelta = $delta;
      } else if ($delta === $bestSoftDelta && $bestSoft !== null && $chainIp !== "") {
        $bestChain = trim((string) ($bestSoft["chain"] ?? ""));
        if ($candChain === $chainIp && $bestChain !== $chainIp) $bestSoft = $cand;
      }
    }
  }
  $best = $bestStrong ?: $bestSoft;
  if ($best && isset($best["contract"])) {
    $allIpWindow[$i]["contract"] = (string) $best["contract"];
  }
}

// Evitar que o próprio carregamento da página de Logs infle os KPIs em tempo real
// Descarta entradas de "logs" registradas nos últimos 2s (UTC) para o contador da janela atual
$nowTs = time();
$allIpWindow = array_values(array_filter($allIpWindow, function ($r) use ($toTs, $nowTs) {
  $p = isset($r["page"]) ? (string) $r["page"] : "";
  if (stripos($p, "logs") === false) return true;
  $d = isset($r["date"]) ? (string) $r["date"] : "";
  $h = isset($r["time"]) ? (string) $r["time"] : "";
  $ts = $toTs($d, $h);
  if ($ts <= 0) return true;
  return ($nowTs - $ts) > 2;
}));

$allTableWindow = array_merge($allIpWindow, $allClientWindow);
$visitsDataJson = json_encode($allTableWindow, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Defaults: por padrão, todos os filtros iniciam em "Todos/Todas"
$defaultPage = "";
$defaultIp = "";
$defaultWallet = "";

// Opções para selects
$pageOptions = [];
foreach ($allTableWindow as $r) {
  $p = isset($r["page"]) ? (string) $r["page"] : "";
  if ($p !== "") $pageOptions[$p] = ($pageOptions[$p] ?? 0) + 1;
}
arsort($pageOptions);
$ipOptions = [];
if ($isChief) {
  foreach ($allTableWindow as $r) {
    $ip = isset($r["ip"]) ? (string) $r["ip"] : "";
    if ($ip !== "") $ipOptions[$ip] = ($ipOptions[$ip] ?? 0) + 1;
  }
  arsort($ipOptions);
}
$walletOptions = [];
if ($isChief) {
  foreach ($allTableWindow as $r) {
    $w = isset($r["wallet"]) ? strtolower((string) $r["wallet"]) : "";
    if ($w !== "") $walletOptions[$w] = ($walletOptions[$w] ?? 0) + 1;
  }
  arsort($walletOptions);
}

$contractOptions = [];
if ($isChief) {
  foreach ($allTableWindow as $r) {
    $ct = isset($r["contract"]) ? strtolower(trim((string) $r["contract"])) : "";
    if ($ct !== "") $contractOptions[$ct] = ($contractOptions[$ct] ?? 0) + 1;
  }
  arsort($contractOptions);
}

function tc_explorer_contract_url(string $contract, string $chain): string
{
  $addr = trim($contract);
  $chain = trim($chain);
  $id = 1;
  if ($chain !== "") {
    $lower = strtolower($chain);
    if (str_starts_with($lower, "0x")) $id = (int) hexdec(substr($lower, 2));
    else if (preg_match('/^\d+$/', $chain)) $id = (int) $chain;
  }
  if ($id === 56) return "https://bscscan.com/address/" . $addr;
  if ($id === 97) return "https://testnet.bscscan.com/address/" . $addr;
  if ($id === 137) return "https://polygonscan.com/address/" . $addr;
  if ($id === 8453) return "https://basescan.org/address/" . $addr;
  if ($id === 11155111) return "https://sepolia.etherscan.io/address/" . $addr;
  return "https://etherscan.io/address/" . $addr;
}

// Contratos vistos no período e status de verificação (derivados de SCLogs)
$contractsInPeriod = [];
$verifiedContracts = [];
$contractStatus = [];
$canceledByWallet = [];
$hasAnyCancelations = false;
foreach ($allClientWindow as $r) {
  $wlt = isset($r["wallet"]) ? strtolower(trim((string) $r["wallet"])) : "";
  $ct = isset($r["contract"]) ? strtolower(trim((string) $r["contract"])) : "";
  $p = isset($r["page"]) ? strtolower((string) $r["page"]) : "";
  $ch = isset($r["chain"]) ? trim((string) $r["chain"]) : "";
  $d = isset($r["date"]) ? trim((string) $r["date"]) : "";
  $h = isset($r["time"]) ? trim((string) $r["time"]) : "";
  $ts = strtotime($d . " " . $h . " UTC");
  $ts = $ts === false ? 0 : (int) $ts;
  if (stripos($p, "contrato_cancelada") !== false) {
    $hasAnyCancelations = true;
    if ($wlt !== "") $canceledByWallet[$wlt] = (int) (($canceledByWallet[$wlt] ?? 0) + 1);
  }
  if ($ct === "" || stripos($p, "contrato") === false) continue;
  if (!isset($contractsInPeriod[$ct])) $contractsInPeriod[$ct] = ["chain" => $ch];
  if ($ch !== "" && ($contractsInPeriod[$ct]["chain"] ?? "") === "") $contractsInPeriod[$ct]["chain"] = $ch;
  if ($ts > 0) {
    if (stripos($p, "contrato_verificado") !== false) {
      $prev = $contractStatus[$ct]["ts"] ?? 0;
      if ($prev <= 0 || $ts >= $prev) $contractStatus[$ct] = ["ts" => $ts, "verified" => true];
    } else if (stripos($p, "contrato_nao_verificado") !== false) {
      $prev = $contractStatus[$ct]["ts"] ?? 0;
      if ($prev <= 0 || $ts >= $prev) $contractStatus[$ct] = ["ts" => $ts, "verified" => false];
    }
  }
}
foreach ($contractStatus as $addr => $st) {
  $verifiedContracts[$addr] = (($st["verified"] ?? false) === true);
}

$cancelCountForWallet = 0;
$filterWalletNorm = strtolower(trim((string) $filterWallet));
if ($filterWalletNorm !== "" && isset($canceledByWallet[$filterWalletNorm])) $cancelCountForWallet = (int) $canceledByWallet[$filterWalletNorm];
$showCancelHint = $isChief && $filterWalletNorm === "" && $hasAnyCancelations;
?>

<div class="container py-4 bg-page-black min-vh-100">
  <?php if (!$isChief && !$hasWallet) { ?>
    <div class="alert alert-warning">
      Conecte sua carteira para visualizar seu contexto de BI.
    </div>
  <?php } else { ?>
    <div class="tc-tools-hero mb-3">
      <h1 class="tc-tools-hero-title mb-1">Relatório de Acessos</h1>
    </div>

    <?php if ($isChief) { ?>
      <div class="row g-3 align-items-end mb-3">
        <div class="col-12 col-md-4">
          <label class="form-label text-white-50 small mb-1"><i class="bi bi-wallet2 me-1"></i>Wallet</label>
          <select class="form-select" id="fWallet">
            <option value="">Todas as wallets</option>
            <?php foreach ($walletOptions as $w => $cnt) { ?>
              <option value="<?= htmlspecialchars($w, ENT_QUOTES, 'UTF-8') ?>" <?= ($adminWalletDefault !== "" && strtolower($adminWalletDefault) === strtolower($w)) ? "selected" : "" ?>>
                <?= htmlspecialchars($w, ENT_QUOTES, 'UTF-8') ?> (<?= (int) $cnt ?>)
              </option>
            <?php } ?>
          </select>
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label text-white-50 small mb-1"><i class="bi bi-diagram-3 me-1"></i>Rede</label>
          <input type="hidden" id="fChain" value="<?= htmlspecialchars($adminChainDefault, ENT_QUOTES, "UTF-8") ?>" />
          <div class="tc-ns-compact" data-component="shared/components/network-search.php" data-ns-placeholder="Buscar rede (nome ou chainId)" data-ns-min-chars="1" data-ns-show-popular="false" data-ns-show-details-on-select="false" data-ns-auto-detect="false"></div>
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label text-white-50 small mb-1"><i class="bi bi-box me-1"></i>Contrato (opcional)</label>
          <input type="text" class="form-control" id="fContract" value="<?= htmlspecialchars($adminContractDefault, ENT_QUOTES, "UTF-8") ?>" placeholder="0x..." />
        </div>
      </div>
      <?php if ($filterWallet !== "" || $filterChain !== "" || $filterContract !== "") { ?>
        <div class="small text-white-50 mb-3">
          Investigação ativa: Wallet=<?= htmlspecialchars($filterWallet !== "" ? $filterWallet : "todas", ENT_QUOTES, "UTF-8") ?> · Rede=<?= htmlspecialchars($filterChain !== "" ? $filterChain : "todas", ENT_QUOTES, "UTF-8") ?> · Contrato=<?= htmlspecialchars($filterContract !== "" ? $filterContract : "todos", ENT_QUOTES, "UTF-8") ?>
        </div>
      <?php } ?>
    <?php } ?>

    <?php if (!$isChief) { ?>
      <div class="row g-3 align-items-end mb-3">
        <div class="col-12 col-md-6">
          <label class="form-label text-white-50 small mb-1"><i class="bi bi-wallet2 me-1"></i>Sua wallet</label>
          <input type="text" class="form-control" value="<?= htmlspecialchars(strtolower(trim($walletCookie)), ENT_QUOTES, "UTF-8") ?>" disabled />
        </div>
        <div class="col-12 col-md-6">
          <label class="form-label text-white-50 small mb-1"><i class="bi bi-diagram-3 me-1"></i>Rede</label>
          <input type="text" class="form-control" value="<?= htmlspecialchars((string) ($_COOKIE["tokencafe_chain_id"] ?? ""), ENT_QUOTES, "UTF-8") ?>" disabled />
        </div>
      </div>
    <?php } ?>

    <div class="row g-3 align-items-end mb-3">
      <div class="col-12 col-md-4">
        <label class="form-label text-white-50 small mb-1"><i class="bi bi-calendar3 me-1"></i>Data início</label>
        <input type="date" class="form-control" value="<?= htmlspecialchars($startDate, ENT_QUOTES, "UTF-8") ?>" id="logsStart" />
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label text-white-50 small mb-1"><i class="bi bi-calendar-range me-1"></i>Data fim</label>
        <input type="date" class="form-control" value="<?= htmlspecialchars($endDate, ENT_QUOTES, "UTF-8") ?>" id="logsEnd" />
      </div>
      <div class="col-12 col-md-4">
        <?php if ($isChief) { ?>
          <div class="d-flex gap-2">
            <button class="btn tc-action-btn flex-grow-1 h-control" id="btnLoadLogs">
              <i class="bi bi-arrow-repeat me-1"></i>
              Carregar
            </button>
            <button class="btn btn-outline-secondary h-control" id="btnClearInvestigation" title="Limpar filtros de investigação (wallet/rede/contrato)">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        <?php } else { ?>
          <div class="d-grid">
            <button class="btn tc-action-btn w-100 h-control" id="btnLoadLogs">
              <i class="bi bi-arrow-repeat me-1"></i>
              Carregar
            </button>
          </div>
        <?php } ?>
      </div>
    </div>

    <div class="d-flex flex-wrap align-items-center mb-3">
      <span class="tc-kpi-chip" data-kpi="Visitas" data-val="<?= (int) $kpiTotalIp ?>"></span>
      <span class="tc-kpi-chip" data-kpi="IPs" data-val="<?= (int) $kpiUniqueIp ?>"></span>
      <span class="tc-kpi-chip" data-kpi="Ações" data-val="<?= (int) $kpiTotalClient ?>"></span>
      <span class="tc-kpi-chip" data-kpi="Carteiras" data-val="<?= (int) $kpiUniqueWallet ?>"></span>
      <span class="tc-kpi-chip" data-kpi="Dias" data-val="<?= (int) $daysSpan ?>"></span>
      <span class="tc-kpi-chip" data-kpi="Páginas" data-val="<?= (int) $kpiUniquePages ?>"></span>
      <span class="tc-kpi-chip" data-kpi="Ativo" data-val="<?= htmlspecialchars($activeDuration, ENT_QUOTES, "UTF-8") ?>"></span>
    </div>

    <div class="row g-3">
      <div class="col-12">
        <div class="tool-tile">
          <div class="d-flex align-items-center gap-2">
            <div class="tool-tile-icon"><i class="bi bi-globe2"></i></div>
            <div class="tool-tile-title m-0"><i class="bi bi-diagram-2 me-2 text-secondary"></i>Movimentos (IP/SC)</div>
          </div>
          <div class="tool-tile-desc">Top páginas por acesso (janela), ações e amostra do dia.</div>
          <div class="tool-tile-footer d-flex flex-column gap-1 mt-1">
          <div class="d-flex flex-wrap align-items-center">
            <?php if (!$topIpPages) { ?>
              <span class="text-white-50">Sem registros.</span>
            <?php } else { foreach ($topIpPages as $t) { $pg = (string) $t["page"]; $ct = (int) $t["count"]; ?>
              <span class="tc-top-page" data-top-page="<?= htmlspecialchars($pg, ENT_QUOTES, "UTF-8") ?>" data-top-count="<?= (int) $ct ?>"></span>
            <?php } } ?>
          </div>

            <?php if ($isChief) { ?>
              <div class="mt-2">
                <div class="small text-white-50 mb-1">IPs (isto é IP, não é página)</div>
                <?php if (!$topIps) { ?>
                  <span class="text-white-50">Sem IPs destacados.</span>
                <?php } else { foreach ($topIps as $t) { $ip = (string) $t["ip"]; $ct=(int)$t["count"]; ?>
                  <span class="pg-chip">
                    <span class="pg-chip-label"><?= htmlspecialchars($ip, ENT_QUOTES, "UTF-8") ?></span>
                    <span class="pg-chip-count">(<?= $ct ?>)</span>
                  </span>
                <?php } } ?>
              </div>
            <?php } ?>

            <?php if ($isChief) { ?>
            <div class="row g-2 align-items-end">
              <div class="col-12 col-lg-3">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-file-code me-1"></i>Página (slug)</label>
                <div class="d-flex align-items-center gap-2">
                  <select class="form-select" id="fltPage">
                    <option value="">Todas as páginas</option>
                    <?php foreach ($pageOptions as $p => $cnt) { ?>
                      <?php $pl = $p === "index.php" ? "home" : $p; ?>
                      <option value="<?= htmlspecialchars($p, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($pl, ENT_QUOTES, 'UTF-8') ?> (<?= (int) $cnt ?>)</option>
                    <?php } ?>
                  </select>
                </div>
              </div>
              <div class="col-6 col-lg-2">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-hdd-network me-1"></i>IP</label>
                <select class="form-select" id="fltIp">
                  <option value="">Todos os IPs</option>
                  <?php foreach ($ipOptions as $ip => $cnt) { ?>
                    <option value="<?= htmlspecialchars($ip, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($ip, ENT_QUOTES, 'UTF-8') ?> (<?= (int) $cnt ?>)</option>
                  <?php } ?>
                </select>
              </div>
              <div class="col-6 col-lg-3">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-wallet2 me-1"></i>Wallet</label>
                <select class="form-select" id="fltWallet">
                  <option value="">Todas as wallets</option>
                  <?php foreach ($walletOptions as $w => $cnt) { ?>
                    <option value="<?= htmlspecialchars($w, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($w, ENT_QUOTES, 'UTF-8') ?> (<?= (int) $cnt ?>)</option>
                  <?php } ?>
                </select>
              </div>
              <div class="col-6 col-lg-2">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-box me-1"></i>Contrato</label>
                <select class="form-select" id="fltContract">
                  <option value="">Todos os contratos</option>
                  <?php if (!$contractOptions) { ?>
                    <option value="" disabled>(sem contratos no período)</option>
                  <?php } else { foreach ($contractOptions as $ct => $cnt) { ?>
                    <option value="<?= htmlspecialchars($ct, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($ct, ENT_QUOTES, 'UTF-8') ?> (<?= (int) $cnt ?>)</option>
                  <?php } } ?>
                </select>
              </div>
              <div class="col-6 col-lg-2">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-clock me-1"></i>Hora local (HH)</label>
                <div class="input-group">
                  <input type="text" class="form-control" id="fltHour" placeholder="ex.: 14" />
                  <button class="btn tc-action-btn" id="btnApplyTableFilter" type="button" aria-label="Aplicar filtros">
                    <i class="bi bi-funnel"></i>
                  </button>
                  <button class="btn btn-outline-secondary" id="btnClearTableFilter" type="button" aria-label="Limpar filtros">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
            </div>
            <?php } else { ?>
            <div class="row g-2 align-items-end">
              <div class="col-12 col-lg-9">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-file-code me-1"></i>Página (slug)</label>
                <div class="d-flex align-items-center gap-2">
                  <select class="form-select" id="fltPage">
                    <option value="">Todas as páginas</option>
                    <?php foreach ($pageOptions as $p => $cnt) { ?>
                      <?php $pl = $p === "index.php" ? "home" : $p; ?>
                      <option value="<?= htmlspecialchars($p, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($pl, ENT_QUOTES, 'UTF-8') ?> (<?= (int) $cnt ?>)</option>
                    <?php } ?>
                  </select>
                </div>
              </div>
              <div class="col-6 col-lg-3">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-clock me-1"></i>Hora local (HH)</label>
                <div class="input-group">
                  <input type="text" class="form-control" id="fltHour" placeholder="ex.: 14" />
                  <button class="btn tc-action-btn" id="btnApplyTableFilter" type="button" aria-label="Aplicar filtros">
                    <i class="bi bi-funnel"></i>
                  </button>
                  <button class="btn btn-outline-secondary" id="btnClearTableFilter" type="button" aria-label="Limpar filtros">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
            </div>
            <?php } ?>
            <div class="table-responsive mt-1">
              <table class="table table-sm mb-0 w-100">
                <thead class="text-white-50">
                  <tr>
                    <th data-sort="when" class="tc-sortable"><i class="bi bi-calendar3 me-1"></i>Data/Hora<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="chain" class="tc-sortable"><i class="bi bi-diagram-3 me-1"></i>Rede<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="wallet" class="tc-sortable"><i class="bi bi-wallet2 me-1"></i>Wallet<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="contract" class="tc-sortable"><i class="bi bi-box me-1"></i>Contrato<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="page" class="tc-sortable text-end tc-w-160"><i class="bi bi-box-arrow-in-right me-1"></i>Page<span class="tc-sort-ind ms-1"></span></th>
                  </tr>
                </thead>
                <tbody id="visitsRows"></tbody>
              </table>
            </div>
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2" id="visitsPagerWrap">
              <div class="text-white-50 small d-flex align-items-center gap-2">
                <span id="visitsCountInfo"></span>
                <label class="ms-3 small">Linhas/página</label>
                <select class="form-select form-select-sm w-auto" id="pageSizeSel">
                  <option value="10" selected>10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <div class="d-flex align-items-center gap-1">
                <div class="btn-group btn-group-sm d-none" id="visitsPager"></div>
                <?php if ($isChief || $hasWallet) { ?>
                  <button class="btn btn-sm tc-action-btn" id="btnDownloadLog" type="button">
                    <i class="bi bi-download me-1"></i>Baixar arquivo
                  </button>
                <?php } ?>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      (function () {
        var btn = document.getElementById("btnLoadLogs");
        var startEl = document.getElementById("logsStart");
        var endEl = document.getElementById("logsEnd");
        if (!btn || !startEl || !endEl) return;
        btn.addEventListener("click", function () {
          try {
            var url = new URL(window.location.href);
            url.searchParams.set("start", String(startEl.value || ""));
            url.searchParams.set("end", String(endEl.value || ""));
            url.searchParams.delete("date");
            url.searchParams.delete("days");
            var w = String(document.getElementById("fWallet")?.value || "").trim();
            var c = String(document.getElementById("fChain")?.value || "").trim();
            var ct = String(document.getElementById("fContract")?.value || "").trim();
            if (w) url.searchParams.set("f_wallet", w); else url.searchParams.delete("f_wallet");
            if (c) url.searchParams.set("f_chain", c); else url.searchParams.delete("f_chain");
            if (ct) url.searchParams.set("f_contract", ct); else url.searchParams.delete("f_contract");
            window.location.href = url.toString();
          } catch (_) {}
        });
        document.getElementById("btnClearInvestigation")?.addEventListener("click", function () {
          try {
            var url = new URL(window.location.href);
            url.searchParams.delete("f_wallet");
            url.searchParams.delete("f_chain");
            url.searchParams.delete("f_contract");
            window.location.href = url.toString();
          } catch (_) {}
        });

        document.addEventListener("network:selected", function (ev) {
          try {
            if (!ev || !ev.target || !ev.target.closest) return;
            if (!ev.target.closest(".tc-ns-compact")) return;
            var id = ev.detail && ev.detail.network ? ev.detail.network.chainId : null;
            var f = document.getElementById("fChain");
            if (f) f.value = id !== null && id !== undefined ? String(id) : "";
          } catch (_) {}
        });
        document.addEventListener("network:clear", function (ev) {
          try {
            if (!ev || !ev.target || !ev.target.closest) return;
            if (!ev.target.closest(".tc-ns-compact")) return;
            var f = document.getElementById("fChain");
            if (f) f.value = "";
          } catch (_) {}
        });

        // Filtro e paginação da tabela (10 por página; pager aparece se > 50)
        var data = <?= $visitsDataJson ?: "[]" ?>;
        var isChief = <?= $isChief ? "true" : "false" ?>;
        var verifiedContracts = <?= json_encode($verifiedContracts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: "{}" ?>;
        var pageSize = 10, cur = 1;
        var tBody = document.getElementById("visitsRows");
        var wrap = document.getElementById("visitsPagerWrap");
        var pager = document.getElementById("visitsPager");
        var info = document.getElementById("visitsCountInfo");
        function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
        function pageLabel(key){var k=String(key||''); return k==='index.php' ? 'home' : k;}
        function pageChip(key){var k=pageLabel(key); return '<span class="pg-chip tc-pill-chip">'+esc(k)+'</span>';}
        function pageChipCount(key, count){var k=pageLabel(key); return '<span class="pg-chip tc-pill-chip">'+esc(k)+' <span class="pg-chip-count">('+esc(String(count||0))+')</span></span>';}
        function formatLocal(dateStr, timeStr){
          try{
            var d=String(dateStr||'').trim();
            var t=String(timeStr||'').trim();
            if(!d||!t) return (d+' '+t).trim();
            var dt = new Date(d+'T'+t+'Z');
            if(isNaN(dt.getTime())) return (d+' '+t).trim();
            return dt.toLocaleString('pt-BR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'});
          }catch(_){ return (String(dateStr||'')+' '+String(timeStr||'')).trim(); }
        }
        function localHour(dateStr, timeStr){
          try{
            var d=String(dateStr||'').trim();
            var t=String(timeStr||'').trim();
            if(!d||!t) return '';
            var dt = new Date(d+'T'+t+'Z');
            if(isNaN(dt.getTime())) return '';
            return String(dt.getHours()).padStart(2,'0');
          }catch(_){ return ''; }
        }
        function applyTableFilter(){
          var p = String(document.getElementById("fltPage")?.value||"").toLowerCase().trim();
          var ip = String(document.getElementById("fltIp")?.value||"").toLowerCase().trim();
          var hh = String(document.getElementById("fltHour")?.value||"").trim();
          var w = String(document.getElementById("fltWallet")?.value||"").toLowerCase().trim();
          var ct = String(document.getElementById("fltContract")?.value||"").toLowerCase().trim();
          return data.filter(function(r){
            if (p && String(r.page||"").toLowerCase()!==p) return false;
            if (isChief && ip && String(r.ip||"").toLowerCase()!==ip) return false;
            if (isChief && w && String(r.wallet||"").toLowerCase()!==w) return false;
            if (isChief && ct && String(r.contract||"").toLowerCase()!==ct) return false;
            if (hh) {
              var lhh = localHour(r.date||"", r.time||"");
              if (!lhh || lhh !== hh) return false;
            }
            return true;
          });
        }
        var sortKey=null, sortDir=1;
        function sortRows(rows){
          if(!sortKey) return rows;
          var k=sortKey; var dir=sortDir;
          return rows.slice().sort(function(a,b){
            if(k==='when'){
              var wa=(String(a.date||'')+' '+String(a.time||'')).trim();
              var wb=(String(b.date||'')+' '+String(b.time||'')).trim();
              var c = wa.localeCompare(wb);
              if(c!==0) return dir*c;
              return dir*(String(a.chain||'').localeCompare(String(b.chain||'')));
            }
            var va=(a[k]||'').toString(); var vb=(b[k]||'').toString();
            return dir*(va.localeCompare(vb));
          });
        }
        function renderPage(n){
          cur = n;
          var rows = sortRows(applyTableFilter());
          var total = rows.length;
          var start = (cur-1)*pageSize, end = Math.min(start+pageSize,total);
          var slice = rows.slice(start,end);
          var html="";
          if(!slice.length) html='<tr><td colspan="5" class="text-white-50">Sem registros.</td></tr>';
          else {
            slice.forEach(function(r){
              var w = esc(r.wallet||"");
              var ctt = esc(r.contract||"");
              var cttRaw = String(r.contract||"").toLowerCase().trim();
              var whenTop = esc(formatLocal(r.date||"", r.time||""));
              var chain = esc(r.chain||"");
              var whenHtml = '<div class="text-nowrap">'+whenTop+'</div>';
              var ipMini = esc(r.ip||"");
              if(ipMini){ whenHtml += '<div class="text-white-50 text-small text-nowrap" title="Hora do servidor (UTC): '+esc(String(r.date||"")+' '+String(r.time||""))+'">IP: '+ipMini+'</div>'; }
              var wHtml = '<div class="tc-break-all tc-lh-11">'+w+'</div>';
              var cHtml = '';
              if(ctt){
                var chainNum = 1;
                try{
                  var chRaw = String(r.chain||"").trim().toLowerCase();
                  if(chRaw.startsWith("0x")) chainNum = parseInt(chRaw, 16) || 1;
                  else if(chRaw) chainNum = parseInt(chRaw, 10) || 1;
                }catch(_){}
                var addr = String(r.contract||"").trim();
                var hrefDetails = "index.php?page=contrato-detalhes&address=" + encodeURIComponent(addr) + "&chainId=" + encodeURIComponent(String(chainNum||""));
                var ok = !!verifiedContracts[cttRaw];
                var linkClass = ok ? "tc-contract-link tc-contract-link--ok" : "tc-contract-link tc-contract-link--bad";
                cHtml = '<a href="'+hrefDetails+'" target="_blank" rel="noopener" class="'+linkClass+' tc-break-all tc-lh-11">'+ctt+'</a>';
              }
              html+='<tr>'
                +'<td>'+whenHtml+'</td>';
              html+='<td>'+esc(r.chain||"")+'</td>'
                +'<td>'+wHtml+'</td>'
                +'<td>'+cHtml+'</td>'
                +'<td class="text-end tc-w-160 text-nowrap">'+pageChip(r.page||"")+'</td>'
                +'</tr>';
            });
          }
          tBody.innerHTML=html;
          var shownFrom = total ? (start + 1) : 0;
          var shownTo = total ? end : 0;
          info.textContent='Mostrando '+shownFrom+'-'+shownTo+' de '+total;
          var pages=Math.ceil(total/pageSize);
          if(pages>1){
            pager.classList.remove("d-none");
            var phtml="";
            var maxBtns=Math.min(8,pages);
            var startBtn=Math.max(1,Math.min(cur-3,pages-maxBtns+1));
            for(var i=0;i<maxBtns;i++){var idx=startBtn+i;phtml+='<button class="btn btn-outline-secondary '+(idx===cur?'active':'')+'" data-pg="'+idx+'">'+idx+'</button>';}
            pager.innerHTML=phtml;
            pager.querySelectorAll('button[data-pg]').forEach(function(b){b.addEventListener('click',function(){var n=parseInt(b.getAttribute('data-pg'),10);if(Number.isFinite(n)) renderPage(n);});});
          } else {
            pager.classList.add("d-none");
            pager.innerHTML="";
          }
        }
        document.getElementById("btnApplyTableFilter")?.addEventListener("click",function(){renderPage(1);});
        document.getElementById("btnClearTableFilter")?.addEventListener("click",function(){
          try{["fltPage","fltIp","fltHour","fltWallet","fltContract"].forEach(function(id){var el=document.getElementById(id); if(el){ if(el.tagName==='SELECT'){ el.selectedIndex=0; } else { el.value=""; } }}); try{document.getElementById("fltPage")?.dispatchEvent(new Event("change"));}catch(_){ } renderPage(1);}catch(_){}
        });
        renderPage(1);

        try{
          document.querySelectorAll('.tc-top-page').forEach(function(el){
            var p = String(el.getAttribute('data-top-page')||'');
            var c = String(el.getAttribute('data-top-count')||'0');
            el.innerHTML = pageChipCount(p, c);
          });
          document.querySelectorAll('.tc-kpi-chip').forEach(function(el){
            var k = String(el.getAttribute('data-kpi')||'');
            var v = String(el.getAttribute('data-val')||'');
            el.innerHTML = pageChipCount(k, v);
          });
        }catch(_){}
        document.getElementById('pageSizeSel')?.addEventListener('change',function(){
          var v=parseInt(this.value,10); if(Number.isFinite(v)&&v>0){ pageSize=v; renderPage(1); }
        });
        document.querySelectorAll('th.tc-sortable')?.forEach(function(th){
          th.style.cursor='pointer';
          th.addEventListener('click',function(){
            var k=th.getAttribute('data-sort'); if(!k) return;
            try{
              document.querySelectorAll('th.tc-sortable .tc-sort-ind').forEach(function(s){ s.textContent=''; });
              var ind = th.querySelector('.tc-sort-ind');
              if(sortKey!==k){
                sortKey=k;
                sortDir=1;
                if(ind) ind.textContent = '▲';
              } else if (sortDir===1) {
                sortDir=-1;
                if(ind) ind.textContent = '▼';
              } else {
                sortKey=null;
                sortDir=1;
              }
            }catch(_){}
            renderPage(1);
          });
        });
        document.getElementById('btnDownloadLog')?.addEventListener('click',function(){
          var fmt = 'txt';
          var start = String(startEl.value || "<?= htmlspecialchars($startDate, ENT_QUOTES, "UTF-8") ?>");
          var end = String(endEl.value || "<?= htmlspecialchars($endDate, ENT_QUOTES, "UTF-8") ?>");
          try{
            var fp = String(document.getElementById('fltPage')?.value || '').trim();
            var fip = String(document.getElementById('fltIp')?.value || '').trim();
            var fw = String(document.getElementById('fltWallet')?.value || '').trim();
            var fct = String(document.getElementById('fltContract')?.value || '').trim();
            var fh = String(document.getElementById('fltHour')?.value || '').trim();
            var url = new URL('download-log.php', window.location.href);
            url.searchParams.set('type','ip');
            url.searchParams.set('start',start);
            url.searchParams.set('end',end);
            url.searchParams.set('format',fmt);
            if(fp) url.searchParams.set('page', fp);
            if(fip) url.searchParams.set('ip', fip);
            if(fw) url.searchParams.set('wallet', fw);
            if(fct) url.searchParams.set('contract', fct);
            if(fh) url.searchParams.set('hour', fh);
            window.location.href = url.toString();
          } catch(_) {
            window.location.href = 'download-log.php?type=ip&start='+encodeURIComponent(start)+'&end='+encodeURIComponent(end)+'&format='+encodeURIComponent(fmt);
          }
        });
      })();
    </script>

    <div class="mt-4 d-flex justify-content-end">
      <a href="index.php?page=tools" class="btn btn-outline-success px-4 fw-bold">
        <i class="bi bi-house-door me-2"></i>Home
      </a>
    </div>
  <?php } ?>
</div>
