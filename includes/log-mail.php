<?php

function tokencafe_get_mail_from(): string
{
  $env = getenv("TOKENCAFE_MAIL_FROM");
  if ($env !== false && trim((string) $env) !== "") return trim((string) $env);
  $host = strtolower((string)($_SERVER["HTTP_HOST"] ?? $_SERVER["SERVER_NAME"] ?? "tokencafe.app"));
  $host = preg_replace('/:\d+$/', "", $host);
  if ($host === "" || $host === "localhost") $host = "tokencafe.app";
  return "noreply@" . $host;
}

function tokencafe_send_mail_with_attachment(string $to, string $subject, string $body, string $filePath): bool
{
  if (!is_file($filePath)) return false;
  $from = tokencafe_get_mail_from();
  $filename = basename($filePath);
  $content = @file_get_contents($filePath);
  if ($content === false) return false;
  $ext = strtolower((string) pathinfo($filename, PATHINFO_EXTENSION));
  $mime = $ext === "zip" ? "application/zip" : "text/plain";

  $boundary = "tokencafe-" . bin2hex(random_bytes(12));
  $headers = [];
  $headers[] = "From: " . $from;
  $headers[] = "MIME-Version: 1.0";
  $headers[] = "Content-Type: multipart/mixed; boundary=\"" . $boundary . "\"";

  $msg = "";
  $msg .= "--" . $boundary . "\r\n";
  $msg .= "Content-Type: text/plain; charset=utf-8\r\n";
  $msg .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
  $msg .= $body . "\r\n";

  $msg .= "--" . $boundary . "\r\n";
  $msg .= "Content-Type: " . $mime . "; name=\"" . $filename . "\"\r\n";
  $msg .= "Content-Transfer-Encoding: base64\r\n";
  $msg .= "Content-Disposition: attachment; filename=\"" . $filename . "\"\r\n\r\n";
  $msg .= chunk_split(base64_encode($content)) . "\r\n";
  $msg .= "--" . $boundary . "--\r\n";

  return @mail($to, $subject, $msg, implode("\r\n", $headers));
}

function tokencafe_create_zip(array $files, string $zipPath): bool
{
  if (!class_exists("ZipArchive")) return false;
  $zip = new ZipArchive();
  if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) return false;
  foreach ($files as $fp) {
    $fp = (string) $fp;
    if ($fp === "" || !is_file($fp)) continue;
    $zip->addFile($fp, basename($fp));
  }
  $zip->close();
  return is_file($zipPath);
}
