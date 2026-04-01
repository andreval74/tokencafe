<?php
require_once __DIR__ . "/includes/admin-config.php";
require_once __DIR__ . "/includes/render.php";

$wallet = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? strtolower(trim((string) $_COOKIE[TOKENCAFE_WALLET_COOKIE])) : "";
if ($wallet === "") {
  http_response_code(403);
  echo "Acesso negado.";
  exit;
}

$page = isset($_POST["page"]) ? trim((string) $_POST["page"]) : "";
if ($page === "" || !preg_match('/^[a-z0-9_-]{1,64}$/i', $page)) {
  http_response_code(400);
  echo "Parâmetro inválido.";
  exit;
}

$contract = isset($_POST["contract"]) ? trim((string) $_POST["contract"]) : "";
if ($contract !== "" && function_exists("tokencafe_is_valid_contract_address") && !tokencafe_is_valid_contract_address($contract)) {
  http_response_code(400);
  echo "Contrato inválido.";
  exit;
}
$chain = isset($_POST["chainId"]) ? trim((string) $_POST["chainId"]) : "";
if ($chain !== "" && function_exists("tokencafe_normalize_chain_id")) $chain = tokencafe_normalize_chain_id($chain);

if ($contract !== "") $_COOKIE["tokencafe_contract"] = $contract;
if ($chain !== "") $_COOKIE["tokencafe_chain_id"] = $chain;
if ($contract !== "") @setcookie("tokencafe_contract", $contract, ["path" => "/", "samesite" => "Lax"]);
if ($chain !== "") @setcookie("tokencafe_chain_id", $chain, ["path" => "/", "samesite" => "Lax"]);

tokencafe_log_client_access($page);
http_response_code(204);
exit;
