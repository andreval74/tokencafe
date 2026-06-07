<?php
/* ============================================================================
   SAVE-SETTINGS.PHP — Endpoint AJAX para salvar system-settings.json
   Aceita somente POST com JSON body. Exige autenticação de chief admin.
   ============================================================================ */

require_once __DIR__ . "/../../includes/config.php";
require_once __DIR__ . "/../../includes/system-config.php";
require_once __DIR__ . "/../../includes/admin-config.php";

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
    exit;
}

// Autenticação: somente chief admin pode salvar
$cookieName = defined('TOKENCAFE_WALLET_COOKIE') ? TOKENCAFE_WALLET_COOKIE : 'tokencafe_wallet_address';
$wallet = isset($_COOKIE[$cookieName]) ? strtolower(trim(urldecode((string)$_COOKIE[$cookieName]))) : '';
$isAuth = tokencafe_is_chief_admin($wallet) || tokencafe_is_admin_bypass_active();

if (!$isAuth) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'Acesso negado — requer Chief Admin']);
    exit;
}

// Lê o body JSON
$raw = (string)@file_get_contents('php://input');
if ($raw === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Body vazio']);
    exit;
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'JSON inválido']);
    exit;
}

// Normaliza booleanos (vindos do JS como true/false, mas podem chegar como 1/0)
$data = tokencafe_normalize_settings_booleans($data);

// Regra: não permitir apagar sessão (group) se houver módulos apontando para ela
if (isset($data['groups']) && is_array($data['groups']) && isset($data['modules']) && is_array($data['modules'])) {
    $groupIds = [];
    foreach ($data['groups'] as $g) {
        if (!is_array($g)) continue;
        $id = trim((string)($g['id'] ?? ''));
        if ($id !== '') $groupIds[$id] = true;
    }
    $missing = [];
    foreach ($data['modules'] as $slug => $cfg) {
        if (!is_array($cfg)) continue;
        $gid = trim((string)($cfg['group'] ?? ''));
        if ($gid === '') continue;
        if (!isset($groupIds[$gid])) $missing[$gid] = true;
    }
    if (!empty($missing)) {
        http_response_code(400);
        echo json_encode([
            'ok' => false,
            'error' => 'Não é permitido remover uma sessão que ainda possui itens. Mova/desative os itens primeiro.',
            'groupsMissing' => array_values(array_keys($missing)),
        ]);
        exit;
    }
}

// Mescla com as settings atuais para não perder chaves não enviadas
$current = tokencafe_load_system_settings();
$merged  = tokencafe_deep_merge($current, $data);

$result = tokencafe_save_system_settings($merged);
if ($result['ok']) {
    echo json_encode(['ok' => true, 'message' => 'Configurações salvas com sucesso']);
} else {
    http_response_code(422);
    echo json_encode(['ok' => false, 'error' => $result['error'] ?? 'Erro desconhecido']);
}

// ── Normaliza booleanos recursivamente ───────────────────────────────────────
function tokencafe_normalize_settings_booleans(array $data): array
{
    $boolFields = ['enabled', 'adminOnly', 'comingSoon', 'sidebar', 'tools', 'mainnet', 'testnet',
                   'bypassEnabled', 'disableBarriers',
                   'referralEnabled', 'analyticsEnabled', 'widgetEnabled', 'verifyEnabled', 'maintenanceMode'];
    foreach ($data as $k => $v) {
        if (is_array($v)) {
            $data[$k] = tokencafe_normalize_settings_booleans($v);
        } elseif (in_array($k, $boolFields, true)) {
            $data[$k] = filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? (bool)$v;
        }
    }
    return $data;
}
