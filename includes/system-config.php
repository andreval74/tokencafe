<?php
/* ============================================================================
   SYSTEM-CONFIG.PHP — Leitura e escrita de config/system-settings.json
   SSOT de todas as configurações dinâmicas do painel de administração.
   Não define constantes globais: retorna arrays para que render.php e
   admin-config.php consumam e decidam o que expor.
   ============================================================================ */

function tokencafe_system_settings_path(): string
{
    return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'system-settings.json';
}

/** Defaults completos — espelham o JSON inicial. */
function tokencafe_system_settings_defaults(): array
{
    return [
        'version' => '1.0',
        'updated' => gmdate('Y-m-d\TH:i:s\Z'),
        'groups' => [
            ['id' => 'ferramentas', 'label' => 'Ferramentas',      'icon' => 'bi-tools',          'highlight' => false, 'enabled' => true],
            ['id' => 'tokens',      'label' => 'Tokens',            'icon' => 'bi-coin',           'highlight' => false, 'enabled' => true],
            ['id' => 'analise',     'label' => 'Análise & Extras', 'icon' => 'bi-graph-up-arrow', 'highlight' => false, 'enabled' => true],
            ['id' => 'suporte',     'label' => 'Suporte',           'icon' => 'bi-headset',        'highlight' => false, 'enabled' => true],
            ['id' => 'legal',       'label' => 'Legal',             'icon' => 'bi-shield-check',   'highlight' => false, 'enabled' => true],
        ],
        'modules' => [
            // Ativos — visíveis para todos os usuários
            'contrato'     => ['group' => 'ferramentas', 'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Criar Token'],
            'wallet'       => ['group' => 'ferramentas', 'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Carteira'],
            'rpc'          => ['group' => 'ferramentas', 'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'RPC Manager'],
            'indicar'      => ['group' => '',            'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Indique & Ganhe'],
            'suporte'      => ['group' => 'suporte',     'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Suporte'],
            'ia-chat'      => ['group' => 'suporte',     'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'IA Chat'],
            'tokens'       => ['group' => 'tokens',      'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Meus Tokens'],
            'token-add'    => ['group' => 'tokens',      'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Adicionar Token'],
            'token-manager'=> ['group' => 'tokens',      'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Gerenciar Tokens'],
            'token-admin'  => ['group' => 'tokens',      'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Admin Token'],
            'analise'      => ['group' => 'analise',     'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Análise'],
            'link'         => ['group' => '',            'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Links'],
            'profile'      => ['group' => '',            'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Perfil'],
            // Em breve — admin vê em cinza; usuário não vê
            'analytics'    => ['group' => 'analise',     'enabled' => false, 'adminOnly' => false, 'comingSoon' => true,  'mainnet' => false, 'testnet' => false, 'label' => 'Analytics'],
            'widget'       => ['group' => 'analise',     'enabled' => false, 'adminOnly' => false, 'comingSoon' => true,  'mainnet' => false, 'testnet' => false, 'label' => 'Widget'],
            'templates'    => ['group' => 'analise',     'enabled' => false, 'adminOnly' => false, 'comingSoon' => true,  'mainnet' => false, 'testnet' => false, 'label' => 'Templates'],
            'verifica'     => ['group' => 'analise',     'enabled' => false, 'adminOnly' => false, 'comingSoon' => true,  'mainnet' => true,  'testnet' => true,  'label' => 'Verificar Contrato'],
            'settings'     => ['group' => 'analise',     'enabled' => false, 'adminOnly' => false, 'comingSoon' => true,  'mainnet' => true,  'testnet' => true,  'label' => 'Configurações'],
            // Admin only
            'relatorios'   => ['group' => '',            'enabled' => true,  'adminOnly' => true,  'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Relatórios'],
            'documentacao' => ['group' => '',            'enabled' => true,  'adminOnly' => true,  'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Documentação'],
            'admin-painel' => ['group' => '',            'enabled' => true,  'adminOnly' => true,  'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Painel Admin'],
            // Legal (site público) — configurável via settings (não fixo)
            'privacidade'        => ['group' => 'legal', 'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Privacidade',        'iconType' => 'bi', 'icon' => 'bi-shield-check'],
            'termos-e-servicos'  => ['group' => 'legal', 'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Termos',             'iconType' => 'bi', 'icon' => 'bi-file-earmark-text'],
            'social'             => ['group' => 'legal', 'enabled' => true,  'adminOnly' => false, 'comingSoon' => false, 'mainnet' => true,  'testnet' => true,  'label' => 'Social',             'iconType' => 'bi', 'icon' => 'bi-people'],
        ],
        'contracts' => [
            'modelPrices' => [
                'erc20-minimal'    => 40.00,
                'erc20-controls'   => 50.00,
                'erc20-advanced'   => 60.00,
                'erc20-directsale' => 80.00,
            ],
            'basePriceWei'      => '10000000000000000',
            'gasLimits' => [
                'erc20-minimal'    => 1200000,
                'erc20-controls'   => 1500000,
                'erc20-advanced'   => 2000000,
                'erc20-directsale' => 2500000,
            ],
            'factoryAddresses' => [
                '1' => '', '56' => '', '137' => '', '42161' => '',
                '43114' => '', '10' => '', '8453' => '',
                '97' => '', '11155111' => '',
            ],
            'platformWallet'    => '0x0b81337f18767565d2ea40913799317a25dc4bc5',
            'gasMarginPercent'  => 20,
        ],
        'permissions' => [
            'adminWallets'    => ['0x0b81337f18767565d2ea40913799317a25dc4bc5'],
            'chiefAdmin'      => '0x0b81337f18767565d2ea40913799317a25dc4bc5',
            'bypassEnabled'   => true,
            'disableBarriers' => false,
        ],
        'features' => [
            'referralEnabled'  => true,
            'analyticsEnabled' => false,
            'widgetEnabled'    => false,
            'verifyEnabled'    => false,
            'maintenanceMode'  => false,
        ],
        'customFunctions' => [],
    ];
}

/**
 * Lê system-settings.json. Retorna defaults se arquivo ausente ou inválido.
 * Mescla com defaults para garantir chaves novas adicionadas no código.
 */
function tokencafe_load_system_settings(): array
{
    static $cached = null;
    if ($cached !== null) return $cached;

    $defaults = tokencafe_system_settings_defaults();
    $path = tokencafe_system_settings_path();

    if (!is_file($path)) {
        $cached = $defaults;
        return $cached;
    }

    try {
        $raw = (string) @file_get_contents($path);
        if ($raw === '') {
            $cached = $defaults;
            return $cached;
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $cached = $defaults;
            return $cached;
        }
        // Mescla profunda para garantir novas chaves
        $cached = tokencafe_deep_merge($defaults, $data);
        // Normalizações (arrays numéricos como groups não são bem mesclados pelo deep_merge)
        $cached['groups'] = tokencafe_merge_groups_by_id($defaults['groups'] ?? [], $data['groups'] ?? []);
    } catch (Throwable) {
        $cached = $defaults;
    }
    return $cached;
}

function tokencafe_merge_groups_by_id(array $defaultsGroups, array $overrideGroups): array
{
    $baseById = [];
    foreach ($defaultsGroups as $g) {
        if (!is_array($g)) continue;
        $id = (string)($g['id'] ?? '');
        if ($id === '') continue;
        $baseById[$id] = $g;
    }

    $result = [];
    $seen = [];
    foreach ($overrideGroups as $g) {
        if (!is_array($g)) continue;
        $id = (string)($g['id'] ?? '');
        if ($id === '' || isset($seen[$id])) continue;
        $seen[$id] = true;
        $base = $baseById[$id] ?? [];
        $result[] = tokencafe_deep_merge($base, $g);
    }

    foreach ($defaultsGroups as $g) {
        if (!is_array($g)) continue;
        $id = (string)($g['id'] ?? '');
        if ($id === '' || isset($seen[$id])) continue;
        $seen[$id] = true;
        $result[] = $g;
    }

    return $result;
}

/**
 * Valida e salva as configurações em system-settings.json de forma atômica.
 * Retorna ['ok' => true] ou ['ok' => false, 'error' => 'mensagem'].
 */
function tokencafe_save_system_settings(array $data): array
{
    $errors = tokencafe_validate_system_settings($data);
    if ($errors) {
        return ['ok' => false, 'error' => implode('; ', $errors)];
    }

    $data['updated'] = gmdate('Y-m-d\TH:i:s\Z');

    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        return ['ok' => false, 'error' => 'Falha ao serializar JSON'];
    }

    $path = tokencafe_system_settings_path();
    $dir  = dirname($path);
    if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
        return ['ok' => false, 'error' => 'Não foi possível criar o diretório config/'];
    }

    // Escrita atômica: grava em temp e renomeia
    $tmp = $path . '.tmp.' . getmypid();
    $ok = @file_put_contents($tmp, $json, LOCK_EX);
    if ($ok === false) {
        @unlink($tmp);
        return ['ok' => false, 'error' => 'Falha ao escrever arquivo temporário'];
    }

    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return ['ok' => false, 'error' => 'Falha ao mover arquivo (rename)'];
    }

    // Invalida o cache estático
    // (em prod com opcache, o próximo request já lê o novo arquivo)
    if (function_exists('opcache_invalidate')) {
        @opcache_invalidate($path, true);
    }

    return ['ok' => true];
}

/** Validação básica dos dados recebidos do painel admin. */
function tokencafe_validate_system_settings(array $data): array
{
    $errors = [];

    // groups
    if (isset($data['groups']) && is_array($data['groups'])) {
        foreach ($data['groups'] as $i => $g) {
            if (!is_array($g)) { $errors[] = "groups[$i] deve ser objeto"; continue; }
            if (empty($g['id']) || !preg_match('/^[a-z0-9-]+$/', (string)$g['id'])) {
                $errors[] = "groups[$i].id deve ser alfanumérico com hífens";
            }
            if (empty($g['label'])) {
                $errors[] = "groups[$i].label não pode ser vazio";
            }
        }
    }

    // modules
    if (isset($data['modules']) && is_array($data['modules'])) {
        foreach ($data['modules'] as $slug => $cfg) {
            if (!is_array($cfg)) { $errors[] = "modules.$slug deve ser objeto"; continue; }
            foreach (['enabled', 'adminOnly', 'comingSoon', 'mainnet', 'testnet'] as $boolKey) {
                if (isset($cfg[$boolKey]) && !is_bool($cfg[$boolKey])) {
                    $errors[] = "modules.$slug.$boolKey deve ser booleano";
                }
            }
        }
    }

    // contracts.modelPrices
    if (isset($data['contracts']['modelPrices']) && is_array($data['contracts']['modelPrices'])) {
        foreach ($data['contracts']['modelPrices'] as $k => $v) {
            if (!is_numeric($v) || (float)$v <= 0 || (float)$v > 99999) {
                $errors[] = "contracts.modelPrices.$k deve ser número entre 0 e 99999";
            }
        }
    }

    // contracts.gasLimits
    if (isset($data['contracts']['gasLimits']) && is_array($data['contracts']['gasLimits'])) {
        foreach ($data['contracts']['gasLimits'] as $k => $v) {
            if (!is_int($v) && !ctype_digit((string)$v)) {
                $errors[] = "contracts.gasLimits.$k deve ser inteiro";
            } elseif ((int)$v < 100000 || (int)$v > 10000000) {
                $errors[] = "contracts.gasLimits.$k deve estar entre 100000 e 10000000";
            }
        }
    }

    // contracts.factoryAddresses — vazios são permitidos
    if (isset($data['contracts']['factoryAddresses']) && is_array($data['contracts']['factoryAddresses'])) {
        foreach ($data['contracts']['factoryAddresses'] as $chainId => $addr) {
            if ($addr !== '' && !preg_match('/^0x[0-9a-fA-F]{40}$/', (string)$addr)) {
                $errors[] = "contracts.factoryAddresses.$chainId endereço ETH inválido";
            }
        }
    }

    // contracts.platformWallet
    if (!empty($data['contracts']['platformWallet'])) {
        if (!preg_match('/^0x[0-9a-fA-F]{40}$/', (string)$data['contracts']['platformWallet'])) {
            $errors[] = 'contracts.platformWallet endereço ETH inválido';
        }
    }

    // permissions.adminWallets
    if (isset($data['permissions']['adminWallets']) && is_array($data['permissions']['adminWallets'])) {
        if (count($data['permissions']['adminWallets']) === 0) {
            $errors[] = 'permissions.adminWallets não pode ser vazio';
        }
        foreach ($data['permissions']['adminWallets'] as $w) {
            if (!preg_match('/^0x[0-9a-fA-F]{40}$/', (string)$w)) {
                $errors[] = "permissions.adminWallets endereço inválido: $w";
            }
        }
    }

    // permissions.chiefAdmin
    if (!empty($data['permissions']['chiefAdmin'])) {
        if (!preg_match('/^0x[0-9a-fA-F]{40}$/', (string)$data['permissions']['chiefAdmin'])) {
            $errors[] = 'permissions.chiefAdmin endereço ETH inválido';
        }
    }

    // features — todos booleanos
    if (isset($data['features']) && is_array($data['features'])) {
        foreach ($data['features'] as $k => $v) {
            if (!is_bool($v)) {
                $errors[] = "features.$k deve ser booleano";
            }
        }
    }

    return $errors;
}

/** Mescla profunda de dois arrays (o segundo sobrescreve o primeiro). */
function tokencafe_deep_merge(array $base, array $override): array
{
    foreach ($override as $k => $v) {
        if (is_array($v) && isset($base[$k]) && is_array($base[$k])) {
            $base[$k] = tokencafe_deep_merge($base[$k], $v);
        } else {
            $base[$k] = $v;
        }
    }
    return $base;
}

/**
 * Lê variáveis do api/.env e retorna como array associativo.
 * Ignora comentários (#) e linhas sem '='.
 * Usa static cache para não reler o arquivo em cada request.
 */
function tokencafe_load_api_env(): array {
    static $cached = null;
    if ($cached !== null) return $cached;
    $cached = [];
    $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . '.env';
    if (!is_file($path)) return $cached;
    foreach (@file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        [$k, $v] = array_pad(explode('=', $line, 2), 2, '');
        $cached[trim($k)] = trim($v);
    }
    return $cached;
}

/**
 * Atalho: retorna configurações de um módulo específico.
 * Nunca lança exceção — retorna array vazio se não encontrado.
 */
function tokencafe_module_config(string $slug): array
{
    $s = tokencafe_load_system_settings();
    return isset($s['modules'][$slug]) && is_array($s['modules'][$slug]) ? $s['modules'][$slug] : [];
}

/**
 * Retorna true se o módulo está habilitado (enabled = true).
 * Módulos desconhecidos são considerados habilitados por segurança retrocompatível.
 */
function tokencafe_module_enabled(string $slug): bool
{
    $cfg = tokencafe_module_config($slug);
    return empty($cfg) || !isset($cfg['enabled']) || (bool)$cfg['enabled'];
}
