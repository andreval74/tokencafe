<?php
require_once __DIR__ . "/includes/admin-config.php";
require_once __DIR__ . "/includes/log-mail.php";

$walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$isChief = tokencafe_is_chief_admin($walletCookie);
if (!$isChief && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) $isChief = true;

if (!$isChief) {
  http_response_code(403);
  echo "Acesso negado.";
  exit;
}

$type = isset($_GET["type"]) ? strtolower(trim((string) $_GET["type"])) : "";
$date = isset($_GET["date"]) ? trim((string) $_GET["date"]) : "";
if (!in_array($type, ["ip", "sc"], true)) {
  http_response_code(400);
  echo "Tipo inválido.";
  exit;
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
  http_response_code(400);
  echo "Data inválida.";
  exit;
}

$base = $type === "ip" ? "IPLogs" : "SCLogs";
$file = __DIR__ . "/modules/logs/storage/admin-logs/" . $base . "-" . $date . ".php";
if (!is_file($file)) {
  http_response_code(404);
  echo "Arquivo não encontrado.";
  exit;
}

$ts = strtotime($date . " 00:00:00 UTC");
$threshold = strtotime(gmdate("Y-m-d") . " 00:00:00 UTC") - (365 * 86400);
if ($ts === false || $ts >= $threshold) {
  http_response_code(403);
  echo "Exclusão não permitida antes de 1 ano.";
  exit;
}

function tokencafe_archive_and_delete_file_local(string $filePath, string $reason): bool
{
  $to = defined("TOKENCAFE_LOG_ARCHIVE_EMAIL") ? (string) TOKENCAFE_LOG_ARCHIVE_EMAIL : "";
  $to = trim($to);
  if ($to === "") return false;
  $file = basename($filePath);
  $tmpTxt = sys_get_temp_dir() . DIRECTORY_SEPARATOR . preg_replace('/\.php$/', '', $file) . "-" . gmdate("Ymd-His") . ".txt";
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
  $subject = "TokenCafe Logs Archive: " . preg_replace('/\.php$/', '.txt', $file);
  $body = "Motivo: " . $reason . "\nArquivo: " . $file . "\nData (UTC): " . gmdate("Y-m-d H:i:s") . "\n";
  $sent = tokencafe_send_mail_with_attachment($to, $subject, $body, $tmpTxt);
  @unlink($tmpTxt);
  if (!$sent) return false;
  @unlink($filePath);
  return true;
}

$ok = tokencafe_archive_and_delete_file_local($file, "exclusao-manual");
if (!$ok) {
  http_response_code(500);
  echo "Falha ao enviar o arquivo por email. Exclusão cancelada.";
  exit;
}
header("Content-Type: text/plain; charset=utf-8");
echo "OK";
exit;
