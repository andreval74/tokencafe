<?php
require_once __DIR__ . "/includes/admin-config.php";

$walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? strtolower(trim((string) $_COOKIE[TOKENCAFE_WALLET_COOKIE])) : "";

$type = isset($_GET["type"]) ? strtolower(trim((string) $_GET["type"])) : "";
$date = isset($_GET["date"]) ? trim((string) $_GET["date"]) : "";
$start = isset($_GET["start"]) ? trim((string) $_GET["start"]) : "";
$end = isset($_GET["end"]) ? trim((string) $_GET["end"]) : "";
$format = isset($_GET["format"]) ? strtolower(trim((string) $_GET["format"])) : "txt";
$fltPage = isset($_GET["page"]) ? strtolower(trim((string) $_GET["page"])) : "";
$fltIp = isset($_GET["ip"]) ? strtolower(trim((string) $_GET["ip"])) : "";
$fltWallet = isset($_GET["wallet"]) ? strtolower(trim((string) $_GET["wallet"])) : "";
$fltContract = isset($_GET["contract"]) ? strtolower(trim((string) $_GET["contract"])) : "";
$fltHour = isset($_GET["hour"]) ? trim((string) $_GET["hour"]) : "";
if (!in_array($type, ["visits", "client", "ip", "sc"], true)) {
  http_response_code(400);
  echo "Tipo inválido.";
  exit;
}

$rangeMode = preg_match('/^\d{4}-\d{2}-\d{2}$/', $start) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $end);
if (!$rangeMode) {
  if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo "Data inválida.";
    exit;
  }
}

function file_for_date(string $type, string $date): string {
  if ($type === "ip" || $type === "sc") {
    $base = $type === "ip" ? "IPLogs" : "SCLogs";
    return __DIR__ . "/modules/logs/storage/admin-logs/" . $base . "-" . $date . ".php";
  }
  return __DIR__ . "/modules/logs/storage/logs/" . $type . "-" . $date . ".log";
}

$files = [];
if ($rangeMode) {
  $tsStart = strtotime($start . " 00:00:00 UTC");
  $tsEnd = strtotime($end . " 00:00:00 UTC");
  if ($tsStart === false || $tsEnd === false) {
    http_response_code(400);
    echo "Período inválido.";
    exit;
  }
  if ($tsStart > $tsEnd) { $tmp = $start; $start = $end; $end = $tmp; $tsStart = strtotime($start . " 00:00:00 UTC"); $tsEnd = strtotime($end . " 00:00:00 UTC"); }
  $maxDays = 366;
  $days = (int) floor(($tsEnd - $tsStart) / 86400) + 1;
  if ($days > $maxDays) {
    http_response_code(400);
    echo "Período muito grande (máx. 366 dias).";
    exit;
  }
  for ($ts = $tsStart; $ts <= $tsEnd; $ts += 86400) {
    $d = gmdate("Y-m-d", $ts);
    $p = file_for_date($type, $d);
    if (is_file($p)) $files[] = $p;
  }
  if (!$files) {
    http_response_code(404);
    echo "Arquivos não encontrados no período.";
    exit;
  }
} else {
  $file = file_for_date($type, $date);
  if (!is_file($file)) {
    http_response_code(404);
    echo "Arquivo não encontrado.";
    exit;
  }
  $files = [$file];
  $start = $date;
  $end = $date;
}

function dl_txt(string $path): void {
  header("Content-Type: text/plain; charset=utf-8");
  header("Content-Disposition: attachment; filename=\"" . preg_replace('/\.(php|log)$/', '.txt', basename($path)) . "\"");
  header("X-Content-Type-Options: nosniff");
  $fh = @fopen($path, "rb");
  if (!$fh) {
    readfile($path);
    exit;
  }
  $first = true;
  while (!feof($fh)) {
    $line = fgets($fh);
    if ($line === false) break;
    if ($first) {
      $first = false;
      if (str_starts_with(trim($line), "<?php")) continue;
    }
    echo $line;
  }
  fclose($fh);
  exit;
}

function dl_txt_range(array $paths, string $filename, bool $skipCsvHeaderOnNext = true): void {
  header("Content-Type: text/plain; charset=utf-8");
  header("Content-Disposition: attachment; filename=\"" . $filename . "\"");
  header("X-Content-Type-Options: nosniff");
  $firstFile = true;
  foreach ($paths as $path) {
    $fh = @fopen($path, "rb");
    if (!$fh) continue;
    $firstLine = true;
    while (!feof($fh)) {
      $line = fgets($fh);
      if ($line === false) break;
      $t = trim($line);
      if ($firstLine) {
        $firstLine = false;
        if (str_starts_with($t, "<?php")) continue;
      }
      if (!$firstFile && $skipCsvHeaderOnNext && ($t === "data;hora;ip;wallet;page" || $t === "data;hora;ip;wallet;page;chain;contract")) continue;
      echo $line;
    }
    fclose($fh);
    $firstFile = false;
  }
  exit;
}

function parse_line(string $line): ?array {
  $line = trim($line);
  if ($line === "" || str_starts_with($line, "<?php")) return null;
  if ($line === "data;hora;ip;wallet;page" || $line === "data;hora;ip;wallet;page;chain;contract") return null;
  if (str_contains($line, ";") && !str_starts_with($line, "[")) {
    $p = explode(";", $line);
    if (count($p) < 5) return null;
    return [
      "date" => $p[0] ?? "",
      "time" => $p[1] ?? "",
      "ip" => $p[2] ?? "",
      "wallet" => $p[3] ?? "",
      "page" => $p[4] ?? "",
      "chain" => $p[5] ?? "",
      "contract" => $p[6] ?? "",
    ];
  }
  if (preg_match('/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\]\s*(.*)$/', $line, $m)) {
    $date = $m[1]; $time = $m[2]; $rest = $m[3];
    $pairs = [];
    if (preg_match_all('/\b([a-zA-Z_]+)=([^\s]+)/', $rest, $mm, PREG_SET_ORDER)) {
      foreach ($mm as $q) $pairs[strtolower($q[1])] = $q[2];
    }
    $page = $pairs["page"] ?? "";
    if ($page === "" && isset($pairs["uri"])) {
      $q = parse_url((string) $pairs["uri"], PHP_URL_QUERY);
      if (is_string($q)) { parse_str($q, $qs); if (isset($qs["page"])) $page = (string) $qs["page"]; }
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
  return null;
}

function match_filters(array $row, string $page, string $ip, string $wallet, string $contract, string $hour): bool {
  if ($page !== "" && strtolower((string) ($row["page"] ?? "")) !== $page) return false;
  if ($ip !== "" && strtolower((string) ($row["ip"] ?? "")) !== $ip) return false;
  if ($wallet !== "" && strtolower((string) ($row["wallet"] ?? "")) !== $wallet) return false;
  if ($contract !== "" && strtolower((string) ($row["contract"] ?? "")) !== $contract) return false;
  if ($hour !== "") {
    $hh = substr((string) ($row["time"] ?? ""), 0, 2);
    if ($hh !== $hour) return false;
  }
  return true;
}

function dl_txt_filtered(string $path, string $page, string $ip, string $wallet, string $contract, string $hour): void {
  header("Content-Type: text/plain; charset=utf-8");
  header("Content-Disposition: attachment; filename=\"" . preg_replace('/\.(php|log)$/', '.txt', basename($path)) . "\"");
  header("X-Content-Type-Options: nosniff");
  echo "data;hora;ip;wallet;page;chain;contract\n";
  $lines = @file($path, FILE_IGNORE_NEW_LINES);
  if (!is_array($lines)) $lines = [];
  foreach ($lines as $ln) {
    $r = parse_line($ln);
    if (!$r) continue;
    if (!match_filters($r, $page, $ip, $wallet, $contract, $hour)) continue;
    echo ($r["date"] ?? "") . ";" . ($r["time"] ?? "") . ";" . ($r["ip"] ?? "") . ";" . ($r["wallet"] ?? "") . ";" . ($r["page"] ?? "") . ";" . ($r["chain"] ?? "") . ";" . ($r["contract"] ?? "") . "\n";
  }
  exit;
}

function dl_txt_filtered_range(array $paths, string $filename, string $page, string $ip, string $wallet, string $contract, string $hour): void {
  header("Content-Type: text/plain; charset=utf-8");
  header("Content-Disposition: attachment; filename=\"" . $filename . "\"");
  header("X-Content-Type-Options: nosniff");
  echo "data;hora;ip;wallet;page;chain;contract\n";
  foreach ($paths as $path) {
    $lines = @file($path, FILE_IGNORE_NEW_LINES);
    if (!is_array($lines)) continue;
    foreach ($lines as $ln) {
      $r = parse_line($ln);
      if (!$r) continue;
      if (!match_filters($r, $page, $ip, $wallet, $contract, $hour)) continue;
      echo ($r["date"] ?? "") . ";" . ($r["time"] ?? "") . ";" . ($r["ip"] ?? "") . ";" . ($r["wallet"] ?? "") . ";" . ($r["page"] ?? "") . ";" . ($r["chain"] ?? "") . ";" . ($r["contract"] ?? "") . "\n";
    }
  }
  exit;
}

function dl_txt_report_range(array $paths, string $filename, string $type, string $start, string $end, string $page, string $ip, string $wallet, string $contract, string $hour, bool $includeIp): void {
  header("Content-Type: text/plain; charset=utf-8");
  header("Content-Disposition: attachment; filename=\"" . $filename . "\"");
  header("X-Content-Type-Options: nosniff");
  $tLabel = $type === "ip" ? "IPLogs (Acessos)" : ($type === "sc" ? "SCLogs (Movimentações)" : strtoupper($type));
  echo "TokenCafe\n";
  echo "Relatório: " . $tLabel . "\n";
  echo "Gerado em (UTC): " . gmdate("Y-m-d H:i:s") . "\n";
  echo "Período: " . $start . " a " . $end . "\n";
  $filters = [];
  $filters[] = "página=" . ($page !== "" ? $page : "todas");
  if ($includeIp) $filters[] = "ip=" . ($ip !== "" ? $ip : "todos");
  $filters[] = "wallet=" . ($wallet !== "" ? $wallet : "todas");
  $filters[] = "contrato=" . ($contract !== "" ? $contract : "todos");
  $filters[] = "hora=" . ($hour !== "" ? $hour : "todas");
  echo "Filtros: " . implode(" | ", $filters) . "\n";
  echo "Colunas: data;hora;" . ($includeIp ? "ip;" : "") . "wallet;page;chain;contract\n";
  echo "Legenda: data=YYYY-MM-DD; hora=HH:MM:SS; chain=Chain ID; contract=Contrato\n";
  echo "\n";
  echo "data;hora;" . ($includeIp ? "ip;" : "") . "wallet;page;chain;contract\n";
  foreach ($paths as $path) {
    $lines = @file($path, FILE_IGNORE_NEW_LINES);
    if (!is_array($lines)) continue;
    foreach ($lines as $ln) {
      $r = parse_line($ln);
      if (!$r) continue;
      if (!match_filters($r, $page, $ip, $wallet, $contract, $hour)) continue;
      echo ($r["date"] ?? "") . ";" . ($r["time"] ?? "") . ";" . ($includeIp ? (($r["ip"] ?? "") . ";") : "") . ($r["wallet"] ?? "") . ";" . ($r["page"] ?? "") . ";" . ($r["chain"] ?? "") . ";" . ($r["contract"] ?? "") . "\n";
    }
  }
  exit;
}

function pdf_escape(string $s): string {
  return str_replace(["\\", "(", ")"], ["\\\\", "\\(", "\\)"], $s);
}

function dl_pdf(string $path, string $title, string $page, string $ip, string $wallet, string $contract, string $hour): void {
  $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if (!is_array($lines)) $lines = [];
  $rows = [];
  foreach ($lines as $ln) {
    $r = parse_line($ln);
    if ($r && match_filters($r, $page, $ip, $wallet, $contract, $hour)) $rows[] = $r;
  }
  dl_pdf_rows($rows, $title, preg_replace('/\.(php|log)$/', '.pdf', basename($path)));
}

function dl_pdf_rows(array $rows, string $title, string $filename): void {
  $max = min(count($rows), 1000);
  $content = "BT\n/F1 12 Tf\n72 800 Td\n(".pdf_escape($title).") Tj\n0 -18 Td\n";
  $content .= "(Data  Hora   IP                Wallet                          Page) Tj\n0 -14 Td\n";
  for ($i=0; $i<$max; $i++) {
    $r = $rows[$i];
    $line = sprintf("%-10s %-8s %-16s %-30s %s",
      $r["date"] ?? "", $r["time"] ?? "", substr($r["ip"] ?? "",0,16),
      substr($r["wallet"] ?? "",0,30), $r["page"] ?? ""
    );
    $content .= "(".pdf_escape($line).") Tj\n0 -14 Td\n";
  }
  $content .= "ET";
  $len = strlen($content);
  $objs = [];
  $objs[] = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  $objs[] = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  $objs[] = "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n";
  $objs[] = "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";
  $objs[] = "5 0 obj\n<< /Length $len >>\nstream\n$content\nendstream\nendobj\n";
  $pdf = "%PDF-1.4\n";
  $offsets = [0];
  foreach ($objs as $o) { $offsets[] = strlen($pdf); $pdf .= $o; }
  $xrefPos = strlen($pdf);
  $pdf .= "xref\n0 ".(count($objs)+1)."\n0000000000 65535 f \n";
  for ($i=1; $i<=count($objs); $i++) {
    $pdf .= sprintf("%010d 00000 n \n", $offsets[$i]);
  }
  $pdf .= "trailer\n<< /Root 1 0 R /Size ".(count($objs)+1)." >>\nstartxref\n".$xrefPos."\n%%EOF";
  header("Content-Type: application/pdf");
  header("Content-Disposition: attachment; filename=\"".$filename."\"");
  header("X-Content-Type-Options: nosniff");
  echo $pdf;
  exit;
}

$hasFilters = ($fltPage !== "" || $fltIp !== "" || $fltWallet !== "" || $fltHour !== "");
$baseName = ($type === "ip" ? "IPLogs" : ($type === "sc" ? "SCLogs" : $type));
$outName = $baseName . "-" . $start . ($start !== $end ? "_to_" . $end : "") . "." . ($format === "pdf" ? "pdf" : "txt");

$hasFilters = ($fltPage !== "" || $fltIp !== "" || $fltWallet !== "" || $fltHour !== "");
if ($format !== "pdf") {
  $includeIp = $isChief;
  dl_txt_report_range($files, $outName, $type, $start, $end, $fltPage, $fltIp, $fltWallet, $fltContract, $fltHour, $includeIp);
}

$title = ($type === "ip" ? "IPLogs " : ($type === "sc" ? "SCLogs " : "Logs ")) . $start . ($start !== $end ? " a " . $end : "");
if (count($files) === 1) {
  dl_pdf($files[0], $title, $fltPage, $fltIp, $fltWallet, $fltContract, $fltHour);
}
$rows = [];
foreach ($files as $path) {
  $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if (!is_array($lines)) continue;
  foreach ($lines as $ln) {
    $r = parse_line($ln);
    if ($r && match_filters($r, $fltPage, $fltIp, $fltWallet, $fltContract, $fltHour)) $rows[] = $r;
  }
}
dl_pdf_rows($rows, $title, $outName);
exit;
