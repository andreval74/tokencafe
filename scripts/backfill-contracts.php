<?php
declare(strict_types=1);

function admin_logs_dir(): string {
  return __DIR__ . "/../modules/logs/storage/admin-logs";
}

function parse_argv(array $argv): array {
  $out = [
    "apply" => false,
    "window" => 300,
    "start" => "",
    "end" => "",
  ];
  foreach ($argv as $i => $a) {
    if ($i === 0) continue;
    $a = (string) $a;
    if ($a === "--apply") $out["apply"] = true;
    if (str_starts_with($a, "--window=")) $out["window"] = max(1, (int) substr($a, 9));
    if (str_starts_with($a, "--start=")) $out["start"] = trim(substr($a, 8));
    if (str_starts_with($a, "--end=")) $out["end"] = trim(substr($a, 6));
  }
  return $out;
}

function normalize_chain_id(string $chain): string {
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

function is_valid_contract(string $addr): bool {
  $addr = trim($addr);
  return $addr !== "" && preg_match('/^0x[a-f0-9]{40}$/i', $addr) === 1;
}

function is_contract_page(string $page): bool {
  return stripos($page, "contrato") !== false;
}

function parse_csv_line(string $line): ?array {
  $t = trim($line);
  if ($t === "" || str_starts_with($t, "<?php") || str_starts_with($t, "data;")) return null;
  $p = explode(";", $t);
  if (count($p) < 5) return null;
  return [
    "date" => (string) ($p[0] ?? ""),
    "time" => (string) ($p[1] ?? ""),
    "ip" => (string) ($p[2] ?? ""),
    "wallet" => strtolower(trim((string) ($p[3] ?? ""))),
    "page" => trim((string) ($p[4] ?? "")),
    "chain" => isset($p[5]) ? trim((string) $p[5]) : "",
    "contract" => isset($p[6]) ? trim((string) $p[6]) : "",
    "raw" => $t,
  ];
}

function row_to_csv(array $r): string {
  return $r["date"] . ";" . $r["time"] . ";" . $r["ip"] . ";" . $r["wallet"] . ";" . $r["page"] . ";" . $r["chain"] . ";" . $r["contract"];
}

function file_date(string $path): string {
  $bn = basename($path);
  if (preg_match('/^(IPLogs|SCLogs)-(\d{4}-\d{2}-\d{2})\.php$/', $bn, $m)) return (string) $m[2];
  return "";
}

function in_range(string $d, string $start, string $end): bool {
  if ($start !== "" && $d < $start) return false;
  if ($end !== "" && $d > $end) return false;
  return true;
}

function read_rows(string $path): array {
  $lines = @file($path, FILE_IGNORE_NEW_LINES);
  if (!is_array($lines)) return [];
  $out = [];
  foreach ($lines as $ln) {
    $r = parse_csv_line((string) $ln);
    if ($r) $out[] = $r;
  }
  return $out;
}

function to_ts(string $date, string $time): int {
  $ts = strtotime(trim($date) . " " . trim($time) . " UTC");
  return $ts === false ? 0 : (int) $ts;
}

function load_sc_index(string $dir, string $date, int $windowSec): array {
  $idx = [];
  $idxW = [];
  $dates = [];
  $ts0 = strtotime($date . " 00:00:00 UTC");
  if ($ts0 !== false) {
    $dates[] = gmdate("Y-m-d", $ts0 - 86400);
    $dates[] = gmdate("Y-m-d", $ts0);
    $dates[] = gmdate("Y-m-d", $ts0 + 86400);
  } else {
    $dates[] = $date;
  }
  foreach (array_unique($dates) as $d) {
    $fp = $dir . DIRECTORY_SEPARATOR . "SCLogs-" . $d . ".php";
    if (!is_file($fp)) continue;
    foreach (read_rows($fp) as $r) {
      $w = (string) ($r["wallet"] ?? "");
      $p = (string) ($r["page"] ?? "");
      $ct = (string) ($r["contract"] ?? "");
      if ($w === "" || $p === "" || !is_contract_page($p) || !is_valid_contract($ct)) continue;
      $ts = to_ts((string) $r["date"], (string) $r["time"]);
      if ($ts <= 0) continue;
      $key = $w . ";" . $p;
      $entry = [
        "ts" => $ts,
        "contract" => $ct,
        "chain" => normalize_chain_id((string) ($r["chain"] ?? "")),
        "page" => $p,
      ];
      $idx[$key][] = $entry;
      $idxW[$w][] = $entry;
    }
  }
  foreach ($idx as $k => $arr) {
    usort($arr, function ($a, $b) { return ($a["ts"] ?? 0) <=> ($b["ts"] ?? 0); });
    $idx[$k] = $arr;
  }
  foreach ($idxW as $k => $arr) {
    usort($arr, function ($a, $b) { return ($a["ts"] ?? 0) <=> ($b["ts"] ?? 0); });
    $idxW[$k] = $arr;
  }
  return ["byWalletPage" => $idx, "byWallet" => $idxW];
}

function backfill_ip_file(string $dir, string $path, int $windowSec, bool $apply): array {
  $date = file_date($path);
  $rows = @file($path, FILE_IGNORE_NEW_LINES);
  if (!is_array($rows)) return ["file" => $path, "changed" => false, "filled" => 0];
  $scIdx = $date !== "" ? load_sc_index($dir, $date, $windowSec) : ["byWalletPage" => [], "byWallet" => []];
  $scByWp = is_array($scIdx["byWalletPage"] ?? null) ? $scIdx["byWalletPage"] : [];
  $scByW = is_array($scIdx["byWallet"] ?? null) ? $scIdx["byWallet"] : [];

  $out = [];
  $filled = 0;
  foreach ($rows as $ln) {
    $t = rtrim((string) $ln, "\r\n");
    $r = parse_csv_line($t);
    if (!$r) {
      $out[] = $t;
      continue;
    }
    $page = (string) $r["page"];
    $wallet = (string) $r["wallet"];
    $contract = trim((string) $r["contract"]);
    $chain = normalize_chain_id((string) $r["chain"]);
    if ($contract === "" && $wallet !== "" && is_contract_page($page)) {
      $key = $wallet . ";" . $page;
      $ts = to_ts((string) $r["date"], (string) $r["time"]);
      $cands = [];
      if (isset($scByWp[$key])) $cands = $scByWp[$key];
      else if (isset($scByW[$wallet])) $cands = $scByW[$wallet];
      if ($ts > 0 && $cands) {
        $best = null;
        $bestDelta = $windowSec + 1;
        foreach ($cands as $cand) {
          $cts = (int) ($cand["ts"] ?? 0);
          if ($cts <= 0) continue;
          $delta = abs($cts - $ts);
          if ($delta > $windowSec) continue;
          if ($delta < $bestDelta) {
            $best = $cand;
            $bestDelta = $delta;
          } else if ($delta === $bestDelta && $best !== null && $chain !== "") {
            $candChain = (string) ($cand["chain"] ?? "");
            $bestChain = (string) ($best["chain"] ?? "");
            if ($candChain === $chain && $bestChain !== $chain) $best = $cand;
          }
        }
        if ($best && isset($best["contract"])) {
          $r["contract"] = (string) $best["contract"];
          if ($chain === "" && isset($best["chain"])) $r["chain"] = (string) $best["chain"];
          $filled++;
          $out[] = row_to_csv($r);
          continue;
        }
      }
    }
    $r["chain"] = $chain;
    $out[] = row_to_csv($r);
  }

  $changed = implode("\n", $rows) !== implode("\n", $out);
  if ($changed && $apply) {
    $bak = $path . "." . gmdate("Ymd-His") . ".bak";
    @copy($path, $bak);
    @file_put_contents($path, implode("\n", $out) . "\n");
  }
  return ["file" => $path, "changed" => $changed && $apply, "filled" => $filled];
}

function main(array $argv): int {
  $opt = parse_argv($argv);
  $dir = admin_logs_dir();
  if (!is_dir($dir)) {
    echo "Diretório não encontrado: " . $dir . PHP_EOL;
    return 1;
  }
  $window = (int) $opt["window"];
  $start = (string) $opt["start"];
  $end = (string) $opt["end"];
  $apply = (bool) $opt["apply"];

  $files = glob($dir . DIRECTORY_SEPARATOR . "IPLogs-*.php") ?: [];
  sort($files);
  $totalFilled = 0;
  $totalChanged = 0;
  foreach ($files as $fp) {
    $d = file_date((string) $fp);
    if ($d === "" || !in_range($d, $start, $end)) continue;
    $res = backfill_ip_file($dir, (string) $fp, $window, $apply);
    $totalFilled += (int) $res["filled"];
    if (!empty($res["changed"])) $totalChanged++;
    $mark = $apply ? (!empty($res["changed"]) ? "*" : "-") : "~";
    echo $mark . " " . basename((string) $fp) . " -> preenchidos: " . (int) $res["filled"] . PHP_EOL;
  }
  echo "Janela: " . $window . "s" . PHP_EOL;
  echo "Total preenchido: " . $totalFilled . PHP_EOL;
  echo "Arquivos alterados: " . $totalChanged . PHP_EOL;
  if (!$apply) echo "Modo simulação. Use --apply para gravar." . PHP_EOL;
  return 0;
}

exit(main($argv));
