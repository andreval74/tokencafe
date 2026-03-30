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
function tokencafe_archive_and_delete_file_local(string $filePath, string $reason): bool
{
  $to = defined("TOKENCAFE_LOG_ARCHIVE_EMAIL") ? (string) TOKENCAFE_LOG_ARCHIVE_EMAIL : "";
  $to = trim($to);
  if ($to === "") return false;
  $file = basename($filePath);
  $zipPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . "tokencafe-log-" . $file . "-" . gmdate("Ymd-His") . ".zip";
  $okZip = tokencafe_create_zip([$filePath], $zipPath);
  if (!$okZip) return false;
  $subject = "TokenCafe Logs Archive: " . $file . " (zip)";
  $body = "Motivo: " . $reason . "\nArquivo: " . $file . "\nData (UTC): " . gmdate("Y-m-d H:i:s") . "\n";
  $sent = tokencafe_send_mail_with_attachment($to, $subject, $body, $zipPath);
  @unlink($zipPath);
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
