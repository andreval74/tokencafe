<?php
/* ============================================================================
   SAVE-API-KEYS.PHP — Endpoint AJAX para salvar chaves de API no api/.env
   Aceita somente POST com JSON body. Exige autenticação de chief admin.
   As keys NUNCA são retornadas nem expostas — somente gravadas no .env.
   ============================================================================ */

require_once __DIR__ . "/../../includes/config.php";
require_once __DIR__ . "/../../includes/admin-config.php";

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}

// Autenticação: somente chief admin (ou bypass ativo) pode alterar keys
$cookieName = defined('TOKENCAFE_WALLET_COOKIE') ? TOKENCAFE_WALLET_COOKIE : 'tokencafe_wallet_address';
$wallet  = isset($_COOKIE[$cookieName]) ? strtolower(trim(urldecode((string)$_COOKIE[$cookieName]))) : '';
$isAuth  = tokencafe_is_chief_admin($wallet) || tokencafe_is_admin_bypass_active();

if (!$isAuth) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Acesso negado — requer Chief Admin']);
    exit;
}

// Lê body JSON
$raw = (string)@file_get_contents('php://input');
if ($raw === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Body vazio']);
    exit;
}

$data = json_decode($raw, true);
if (!is_array($data) || !isset($data['keys']) || !is_array($data['keys'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido — esperado { "keys": {...} }']);
    exit;
}

// Chaves permitidas (whitelist explícita — nunca aceitar chaves arbitrárias)
$allowed = ['GROQ_API_KEY', 'ANTHROPIC_API_KEY', 'EXPLORER_API_KEY'];

$incoming = [];
foreach ($data['keys'] as $k => $v) {
    $k = trim((string)$k);
    $v = trim((string)$v);
    if (!in_array($k, $allowed, true)) continue;  // ignora chaves não autorizadas
    if ($v === '') continue;                        // ignora valores vazios — não sobrescreve com vazio
    $incoming[$k] = $v;
}

if (empty($incoming)) {
    echo json_encode(['ok' => true, 'message' => 'Nenhuma chave para atualizar']);
    exit;
}

// Caminho do .env (modules/admin-painel → raiz → api/.env)
$envPath = dirname(__DIR__, 2) . '/api/.env';

if (!is_file($envPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Arquivo api/.env não encontrado']);
    exit;
}

if (!is_writable($envPath)) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Arquivo api/.env sem permissão de escrita']);
    exit;
}

// Lê as linhas atuais
$lines = file($envPath, FILE_IGNORE_NEW_LINES);
if ($lines === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falha ao ler api/.env']);
    exit;
}

// Para cada key recebida: substituir linha existente ou marcar para adicionar
$updated  = array_fill_keys(array_keys($incoming), false);
$newLines = [];

foreach ($lines as $line) {
    $trimmed = ltrim($line);
    // Preserva comentários e linhas em branco intocados
    if ($trimmed === '' || str_starts_with($trimmed, '#')) {
        $newLines[] = $line;
        continue;
    }
    // Extrai KEY do lado esquerdo do primeiro "="
    $eqPos = strpos($line, '=');
    if ($eqPos === false) {
        $newLines[] = $line;
        continue;
    }
    $lineKey = trim(substr($line, 0, $eqPos));
    if (isset($incoming[$lineKey])) {
        // Substitui o valor mantendo a chave
        $newLines[] = $lineKey . '=' . $incoming[$lineKey];
        $updated[$lineKey] = true;
    } else {
        $newLines[] = $line;
    }
}

// Keys que não existiam ainda no arquivo → adicionar no final
foreach ($incoming as $k => $v) {
    if (!$updated[$k]) {
        $newLines[] = $k . '=' . $v;
    }
}

// Escreve o arquivo de volta (com LF — padrão Unix para .env)
$content = implode("\n", $newLines) . "\n";
$written = file_put_contents($envPath, $content, LOCK_EX);

if ($written === false) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Falha ao escrever api/.env']);
    exit;
}

$count = count($incoming);
echo json_encode([
    'ok'      => true,
    'message' => $count === 1
        ? '1 chave de API atualizada com sucesso'
        : $count . ' chaves de API atualizadas com sucesso'
]);
