<?php
require __DIR__ . "/includes/render.php";

$m = isset($_GET["m"]) ? (string) $_GET["m"] : "";
$m = trim($m);

if ($m === "") {
  http_response_code(400);
  echo "Parâmetro obrigatório ausente: m";
  exit;
}

if (!preg_match('/^[a-zA-Z0-9_\\/-]+$/', $m)) {
  http_response_code(400);
  echo "Parâmetro inválido: m";
  exit;
}

if (str_contains($m, "..")) {
  http_response_code(400);
  echo "Parâmetro inválido: m";
  exit;
}

$view = __DIR__ . "/modules/" . $m . ".php";

render_page($view, [
  "headerVariant" => "module",
  "bodyClass" => "bg-page-black",
  "showSidebar" => true
]);

