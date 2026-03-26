<?php
$qs = isset($_SERVER["QUERY_STRING"]) ? (string) $_SERVER["QUERY_STRING"] : "";
$target = "index.php?page=contrato-detalhes" . ($qs !== "" ? "&" . $qs : "");
header("Location: " . $target, true, 302);
exit;

