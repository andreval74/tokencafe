<?php
/* ============================================================================
   ADMIN-PAINEL — Painel de Administração Central do TokenCafe
   Controla módulos, contratos, permissões, redes e feature flags.
   Acesso exclusivo: chief admin (via includes/render.php → adminOnlyPages).
   ============================================================================ */

require_once __DIR__ . "/../../includes/system-config.php";
require_once __DIR__ . "/../../includes/admin-config.php";

$settings    = tokencafe_load_system_settings();
$modules     = $settings['modules']     ?? [];
$groups      = $settings['groups']      ?? [];
$contracts   = $settings['contracts']   ?? [];
$permissions = $settings['permissions'] ?? [];
$features    = $settings['features']    ?? [];
$customFns   = $settings['customFunctions'] ?? [];

// ── Lê status das API keys do api/.env (somente presença — nunca o valor) ──
$apiEnvVars = tokencafe_load_api_env();
$groqConfigured     = !empty($apiEnvVars['GROQ_API_KEY']);
$anthropicConfigured = !empty($apiEnvVars['ANTHROPIC_API_KEY']);
$explorerConfigured  = !empty($apiEnvVars['EXPLORER_API_KEY']);

// Mapa de ícones por módulo
$moduleIcons = [
  'contrato'     => 'bi-file-earmark-code',
  'wallet'       => 'bi-wallet2',
  'rpc'          => 'bi-diagram-3',
  'analytics'    => 'bi-graph-up-arrow',
  'tokens'       => 'bi-coin',
  'token-add'    => 'bi-plus-circle',
  'token-manager' => 'bi-list-check',
  'widget'       => 'bi-puzzle',
  'indicar'      => 'bi-share-fill',
  'analise'      => 'bi-patch-check',
  'verifica'     => 'bi-shield-check',
  'token-admin'  => 'bi-terminal-fill',
  'settings'     => 'bi-gear',
  'templates'    => 'bi-layers',
  'relatorios'   => 'bi-bar-chart-line',
  'suporte'      => 'bi-envelope',
  'ia-chat'      => 'bi-robot',
  'link'         => 'bi-link-45deg',
  'profile'      => 'bi-person-circle',
  'documentacao' => 'bi-book',
  'admin-painel' => 'bi-sliders',
];

// Redes conhecidas para a aba Contratos / Factory
$knownNetworks = [
  '56'      => 'BNB Smart Chain',
  '1'       => 'Ethereum',
  '137'     => 'Polygon',
  '42161'   => 'Arbitrum One',
  '43114'   => 'Avalanche C-Chain',
  '10'      => 'Optimism',
  '8453'    => 'Base',
  '97'      => 'BSC Testnet',
  '11155111' => 'Sepolia',
];

function _b(array $arr, string $key): bool
{
  return !empty($arr[$key]);
}
function _chk(bool $val): string
{
  return $val ? 'checked' : '';
}
function _val(array $arr, string $key, $default = '')
{
  return htmlspecialchars((string)($arr[$key] ?? $default), ENT_QUOTES, 'UTF-8');
}
?>

<div id="admin-painel-root"
  data-save-url="<?= htmlspecialchars(
                    rtrim(defined('BASE_URL') ? BASE_URL : '/', '/') . '/modules/admin-painel/save-settings.php',
                    ENT_QUOTES,
                    'UTF-8'
                  ) ?>">

  <!-- ── Cabeçalho ── -->
  <div class="tcd-card-head mb-3">
    <h4 class="tcd-title"><i class="bi bi-sliders me-2"></i>Painel de Administração</h4>
    <p class="tcd-subtitle text-secondary mb-0">Controle central do sistema TokenCafe — módulos, contratos, permissões, redes e features</p>
  </div>

  <!-- ── Toast de feedback ── -->
  <div id="ap-toast-wrap" aria-live="polite" aria-atomic="true" class="position-fixed bottom-0 end-0 p-3" style="z-index:9999">
    <div id="ap-toast" class="toast align-items-center text-bg-success border-0" role="alert">
      <div class="d-flex">
        <div class="toast-body" id="ap-toast-msg">Configurações salvas!</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
      </div>
    </div>
  </div>

  <div class="tc-modal-details-box p-0">

    <!-- ── Abas ── -->
    <ul class="nav nav-tabs px-3 pt-3" id="apTabs" role="tablist">
      <li class="nav-item" role="presentation">
        <button class="nav-link active" id="tab-modulos-btn" data-bs-toggle="tab" data-bs-target="#tab-modulos" type="button" role="tab">
          <i class="bi bi-grid me-1"></i>Módulos
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-contratos-btn" data-bs-toggle="tab" data-bs-target="#tab-contratos" type="button" role="tab">
          <i class="bi bi-file-earmark-code me-1"></i>Contratos
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-permissoes-btn" data-bs-toggle="tab" data-bs-target="#tab-permissoes" type="button" role="tab">
          <i class="bi bi-shield-lock me-1"></i>Permissões
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-redes-btn" data-bs-toggle="tab" data-bs-target="#tab-redes" type="button" role="tab">
          <i class="bi bi-globe me-1"></i>Redes
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-features-btn" data-bs-toggle="tab" data-bs-target="#tab-features" type="button" role="tab">
          <i class="bi bi-toggles me-1"></i>Features
        </button>
      </li>
      <li class="nav-item" role="presentation">
        <button class="nav-link" id="tab-integracoes-btn" data-bs-toggle="tab" data-bs-target="#tab-integracoes" type="button" role="tab">
          <i class="bi bi-plug me-1"></i>Integrações
        </button>
      </li>
    </ul>

    <div class="tab-content p-3">

      <!-- ════════════════════════════════════════
           ABA 1 — MÓDULOS
           ════════════════════════════════════════ -->
      <div class="tab-pane fade show active" id="tab-modulos" role="tabpanel">
        <!-- Cabeçalho da aba com botão de salvar -->
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-grid me-2"></i>Módulos</h6>
          <span class="badge bg-secondary" id="ap-autosave-status" aria-live="polite">Auto-save</span>
        </div>

        <!-- ── 1. Sessões do Menu ── -->
        <div class="tc-modal-details-box p-3 mb-3">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0 text-white"><i class="bi bi-bookmark-star me-2"></i>Sessões do Menu</h6>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="ap-add-group-btn">
              <i class="bi bi-plus-circle me-1"></i>Adicionar Sessão
            </button>
          </div>
          <p class="small text-secondary mb-3">
            Organize os módulos em sessões no sidebar. A ordem aqui define a ordem no menu.
          </p>
          <?php
          $groupItemCounts = [];
          foreach ($modules as $slug => $cfg) {
            $gid = (string)($cfg['group'] ?? '');
            if ($gid === '') continue;
            if (!isset($groupItemCounts[$gid])) $groupItemCounts[$gid] = 0;
            $groupItemCounts[$gid]++;
          }
          ?>
          <div id="ap-groups-list">
            <div class="d-flex gap-2 mb-2 align-items-center ap-cols-head ap-cols-head--groups">
              <span class="badge bg-dark border border-secondary text-secondary font-monospace ap-row-index">#</span>
              <div class="text-secondary small ap-group-label">Sessão</div>
              <div class="text-secondary small ap-group-icon-wrap">Ícone</div>
              <div class="text-secondary small ap-col-switch" title="Ativo">Ativo</div>
              <div class="text-secondary small ap-col-switch" title="Destaque">Destaque</div>
              <div class="text-secondary small ap-col-btn" title="Subir">↑</div>
              <div class="text-secondary small ap-col-btn" title="Descer">↓</div>
              <div class="text-secondary small ap-col-btn" title="Remover"><i class="bi bi-trash"></i></div>
            </div>
            <?php $groupIndex = 0; ?>
            <?php foreach ($groups as $g): ?>
              <?php $groupIndex++; ?>
              <?php
              $gid = (string)($g['id'] ?? '');
              $hasItems = !empty($groupItemCounts[$gid]);
              $gEnabled = !array_key_exists('enabled', $g) || !empty($g['enabled']);
              ?>
              <div class="d-flex gap-2 mb-2 align-items-center ap-group-row"
                data-group-id="<?= htmlspecialchars($gid, ENT_QUOTES, 'UTF-8') ?>"
                data-has-items="<?= $hasItems ? '1' : '0' ?>">
                <span class="badge bg-dark border border-secondary text-secondary font-monospace ap-row-index"><?= (int)$groupIndex ?></span>
                <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary ap-group-label"
                  value="<?= htmlspecialchars($g['label'] ?? '', ENT_QUOTES, 'UTF-8') ?>"
                  placeholder="Nome da sessão" maxlength="40">
                <div class="input-group input-group-sm ap-group-icon-wrap">
                  <span class="input-group-text bg-dark border-secondary">
                    <i class="bi <?= htmlspecialchars($g['icon'] ?? 'bi-grid', ENT_QUOTES, 'UTF-8') ?> ap-group-icon-preview"></i>
                  </span>
                  <input type="text" class="form-control bg-dark text-white border-secondary font-monospace ap-group-icon"
                    value="<?= htmlspecialchars($g['icon'] ?? 'bi-grid', ENT_QUOTES, 'UTF-8') ?>"
                    placeholder="bi-tools" maxlength="30" list="ap-bi-icons">
                </div>
                <div class="form-check form-switch mb-0 ap-col-switch ap-col-switch-center" title="Sessão ativa no menu">
                  <input class="form-check-input ap-group-enabled" type="checkbox" role="switch" aria-label="Sessão ativa"
                    <?= $gEnabled ? 'checked' : '' ?>>
                </div>
                <div class="form-check form-switch mb-0 ap-col-switch ap-col-switch-center" title="Destacar sessão no menu (cor laranja)">
                  <input class="form-check-input ap-group-highlight" type="checkbox" role="switch" aria-label="Destacar sessão"
                    <?= !empty($g['highlight']) ? 'checked' : '' ?>>
                </div>
                <button type="button" class="tc-icon-btn-ds ap-move-up" title="Subir" aria-label="Subir sessão">
                  <i class="bi bi-chevron-up"></i>
                </button>
                <button type="button" class="tc-icon-btn-ds ap-move-down" title="Descer" aria-label="Descer sessão">
                  <i class="bi bi-chevron-down"></i>
                </button>
                <button type="button"
                  class="tc-icon-btn-ds tc-action-clear ap-remove-group-btn <?= $hasItems ? 'opacity-50' : '' ?>"
                  title="<?= $hasItems ? 'Esta sessão tem itens. Mova/desative os itens antes de remover.' : 'Remover sessão' ?>"
                  aria-label="Remover sessão"
                  <?= $hasItems ? 'disabled' : '' ?>>
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            <?php endforeach; ?>
          </div>
        </div>

        <div class="tc-modal-details-box p-3 mb-3">
          <h6 class="mb-0 text-white mb-2"><i class="bi bi-search me-2"></i>Busca de Ícones</h6>
          <p class="small text-secondary mb-2">
            Clique em um campo de ícone (Sessão ou Módulo), pesquise aqui e clique no resultado para aplicar automaticamente.
          </p>
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-dark border-secondary"><i class="bi bi-search"></i></span>
            <input type="text" class="form-control bg-dark text-white border-secondary font-monospace"
              id="ap-icon-search" placeholder="bi-wallet2, bi-gear..." autocomplete="off">
          </div>
          <div class="mt-2 d-flex flex-wrap gap-1" id="ap-icon-results" aria-live="polite"></div>
        </div>

        <!-- ── 2. Módulos do Sistema (mesmo layout das sessões) ── -->
        <?php
        $modulesByGroup = [];
        foreach ($modules as $slug => $cfg) {
          $gid = (string)($cfg['group'] ?? '');
          if (!isset($modulesByGroup[$gid])) $modulesByGroup[$gid] = [];
          $modulesByGroup[$gid][$slug] = $cfg;
        }
        ?>
        <div class="tc-modal-details-box p-3">
          <h6 class="mb-0 text-white mb-2"><i class="bi bi-grid me-2"></i>Módulos do Sistema</h6>
          <p class="small text-secondary mb-3">A ordem dentro de cada sessão define a ordem dos itens no menu.</p>

          <div id="ap-modules-wrap">
            <?php foreach ($groups as $g): ?>
              <?php
              $gid = (string)($g['id'] ?? '');
              $gLabel = (string)($g['label'] ?? $gid);
              $gIcon = (string)($g['icon'] ?? 'bi-grid');
              $list = $modulesByGroup[$gid] ?? [];
              ?>
              <div class="tc-modal-details-box p-3 mb-3 ap-mod-group-box" data-group-id="<?= htmlspecialchars($gid, ENT_QUOTES, 'UTF-8') ?>">
                <div class="d-flex align-items-center justify-content-between mb-2 w-100">
                  <h6 class="mb-0 text-white">
                    <i class="bi <?= htmlspecialchars($gIcon, ENT_QUOTES, 'UTF-8') ?> me-2"></i><?= htmlspecialchars($gLabel, ENT_QUOTES, 'UTF-8') ?>
                  </h6>
                </div>
                <div class="d-flex gap-2 mb-2 align-items-center ap-cols-head ap-cols-head--mods">
                  <span class="badge bg-dark border border-secondary text-secondary font-monospace ap-row-index">#</span>
                  <div class="text-secondary small ap-mod-label">Módulo</div>
                  <div class="text-secondary small ap-mod-icon-cell">Ícone</div>
                  <div class="text-secondary small ap-col-btn" title="Mover"><i class="bi bi-arrow-left-right"></i></div>
                  <div class="d-flex align-items-center gap-2 flex-shrink-0 ap-mod-flags">
                    <span class="text-secondary small ap-col-flag" title="Ativo">Atv</span>
                    <span class="text-secondary small ap-col-flag" title="Só Admin">Adm</span>
                    <span class="text-secondary small ap-col-flag" title="Em Breve">Breve</span>
                  </div>
                  <div class="text-secondary small ap-col-btn" title="Subir">↑</div>
                  <div class="text-secondary small ap-col-btn" title="Descer">↓</div>
                </div>
                <div class="ap-modules-list" data-group-id="<?= htmlspecialchars($gid, ENT_QUOTES, 'UTF-8') ?>">
                  <?php foreach ($list as $slug => $cfg): ?>
                    <?php
                    $defaultIcon = $moduleIcons[$slug] ?? 'bi-box';
                    $iconValue = trim((string)($cfg['icon'] ?? $defaultIcon));
                    if ($iconValue === '') $iconValue = $defaultIcon;
                    $isClassIcon = str_contains($iconValue, ' ');
                    $iconClass = $isClassIcon ? $iconValue : ('bi ' . $iconValue);
                    ?>
                    <div class="d-flex gap-2 mb-2 align-items-center ap-mod-row"
                      data-module="<?= htmlspecialchars($slug, ENT_QUOTES, 'UTF-8') ?>"
                      data-default-icon="<?= htmlspecialchars($defaultIcon, ENT_QUOTES, 'UTF-8') ?>">
                      <span class="badge bg-dark border border-secondary text-secondary font-monospace ap-row-index">—</span>
                      <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary ap-mod-label"
                        data-field="label" value="<?= _val($cfg, 'label', $slug) ?>" maxlength="40" placeholder="Label">
                      <div class="d-flex gap-2 align-items-center ap-mod-icon-cell">
                        <div class="input-group input-group-sm ap-mod-icon-wrap">
                          <span class="input-group-text bg-dark border-secondary">
                            <i class="<?= htmlspecialchars($iconClass, ENT_QUOTES, 'UTF-8') ?> ap-mod-icon-preview"></i>
                          </span>
                          <input type="text" class="form-control bg-dark text-white border-secondary font-monospace ap-mod-icon"
                            value="<?= htmlspecialchars($iconValue, ENT_QUOTES, 'UTF-8') ?>"
                            placeholder="bi-grid ou 'bi bi-grid'"
                            maxlength="80" list="ap-bi-icons">
                        </div>
                      </div>
                      <button type="button" class="tc-icon-btn-ds ap-mod-move-open" title="Mover para outra sessão" aria-label="Mover módulo">
                        <i class="bi bi-arrow-left-right"></i>
                      </button>
                      <div class="ap-mod-move-pop d-none">
                        <select class="form-select form-select-sm bg-dark text-white border-secondary ap-mod-group" aria-label="Selecionar sessão do módulo">
                          <option value="">— sem sessão —</option>
                          <?php foreach ($groups as $g2): ?>
                            <option value="<?= htmlspecialchars($g2['id'] ?? '', ENT_QUOTES, 'UTF-8') ?>"
                              <?= ($cfg['group'] ?? '') === ($g2['id'] ?? '') ? 'selected' : '' ?>>
                              <?= htmlspecialchars($g2['label'] ?? '', ENT_QUOTES, 'UTF-8') ?>
                            </option>
                          <?php endforeach; ?>
                        </select>
                      </div>
                      <div class="d-flex align-items-center gap-2 flex-shrink-0 ap-mod-flags">
                        <div class="form-check form-switch mb-0 ap-col-flag ap-col-switch-center" title="Ativo">
                          <input class="form-check-input ap-mod-toggle" type="checkbox" data-field="enabled" <?= _chk(_b($cfg, 'enabled')) ?> role="switch" aria-label="Ativo">
                        </div>
                        <div class="form-check form-switch mb-0 ap-col-flag ap-col-switch-center" title="Só Admin">
                          <input class="form-check-input ap-mod-toggle" type="checkbox" data-field="adminOnly" <?= _chk(_b($cfg, 'adminOnly')) ?> role="switch" aria-label="Só Admin">
                        </div>
                        <div class="form-check form-switch mb-0 ap-col-flag ap-col-switch-center" title="Em Breve">
                          <input class="form-check-input ap-mod-toggle" type="checkbox" data-field="comingSoon" <?= _chk(_b($cfg, 'comingSoon')) ?> role="switch" aria-label="Em Breve">
                        </div>
                      </div>
                      <button type="button" class="tc-icon-btn-ds ap-mod-move-up" title="Subir" aria-label="Subir módulo"><i class="bi bi-chevron-up"></i></button>
                      <button type="button" class="tc-icon-btn-ds ap-mod-move-down" title="Descer" aria-label="Descer módulo"><i class="bi bi-chevron-down"></i></button>
                    </div>
                  <?php endforeach; ?>
                </div>
              </div>
            <?php endforeach; ?>

            <?php
            $ungrouped = $modulesByGroup[''] ?? [];
            ?>
            <div class="tc-modal-details-box p-3 ap-mod-group-box" data-group-id="">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0 text-white"><i class="bi bi-grid me-2"></i>Sem Sessão</h6>
              </div>
              <div class="d-flex gap-2 mb-2 align-items-center ap-cols-head ap-cols-head--mods">
                <span class="badge bg-dark border border-secondary text-secondary font-monospace ap-row-index">#</span>
                <div class="text-secondary small ap-mod-label">Módulo</div>
                <div class="text-secondary small ap-mod-icon-cell">Ícone</div>
                <div class="text-secondary small ap-col-btn" title="Mover"><i class="bi bi-arrow-left-right"></i></div>
                <div class="d-flex align-items-center gap-2 flex-shrink-0 ap-mod-flags">
                  <span class="text-secondary small ap-col-flag" title="Ativo">Atv</span>
                  <span class="text-secondary small ap-col-flag" title="Só Admin">Adm</span>
                  <span class="text-secondary small ap-col-flag" title="Em Breve">Breve</span>
                </div>
                <div class="text-secondary small ap-col-btn" title="Subir">↑</div>
                <div class="text-secondary small ap-col-btn" title="Descer">↓</div>
              </div>
              <div class="ap-modules-list" data-group-id="">
                <?php foreach ($ungrouped as $slug => $cfg): ?>
                  <?php
                  $defaultIcon = $moduleIcons[$slug] ?? 'bi-box';
                  $iconValue = trim((string)($cfg['icon'] ?? $defaultIcon));
                  if ($iconValue === '') $iconValue = $defaultIcon;
                  $isClassIcon = str_contains($iconValue, ' ');
                  $iconClass = $isClassIcon ? $iconValue : ('bi ' . $iconValue);
                  ?>
                  <div class="d-flex gap-2 mb-2 align-items-center ap-mod-row"
                    data-module="<?= htmlspecialchars($slug, ENT_QUOTES, 'UTF-8') ?>"
                    data-default-icon="<?= htmlspecialchars($defaultIcon, ENT_QUOTES, 'UTF-8') ?>">
                    <span class="badge bg-dark border border-secondary text-secondary font-monospace ap-row-index">—</span>
                    <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary ap-mod-label"
                      data-field="label" value="<?= _val($cfg, 'label', $slug) ?>" maxlength="40" placeholder="Label">
                    <div class="d-flex gap-2 align-items-center ap-mod-icon-cell">
                      <div class="input-group input-group-sm ap-mod-icon-wrap">
                        <span class="input-group-text bg-dark border-secondary">
                          <i class="<?= htmlspecialchars($iconClass, ENT_QUOTES, 'UTF-8') ?> ap-mod-icon-preview"></i>
                        </span>
                        <input type="text" class="form-control bg-dark text-white border-secondary font-monospace ap-mod-icon"
                          value="<?= htmlspecialchars($iconValue, ENT_QUOTES, 'UTF-8') ?>"
                          placeholder="bi-grid ou 'bi bi-grid'"
                          maxlength="80" list="ap-bi-icons">
                      </div>
                    </div>
                    <button type="button" class="tc-icon-btn-ds ap-mod-move-open" title="Mover para outra sessão" aria-label="Mover módulo">
                      <i class="bi bi-arrow-left-right"></i>
                    </button>
                    <div class="ap-mod-move-pop d-none">
                      <select class="form-select form-select-sm bg-dark text-white border-secondary ap-mod-group" aria-label="Selecionar sessão do módulo">
                        <option value="">— sem sessão —</option>
                        <?php foreach ($groups as $g2): ?>
                          <option value="<?= htmlspecialchars($g2['id'] ?? '', ENT_QUOTES, 'UTF-8') ?>"
                            <?= ($cfg['group'] ?? '') === ($g2['id'] ?? '') ? 'selected' : '' ?>>
                            <?= htmlspecialchars($g2['label'] ?? '', ENT_QUOTES, 'UTF-8') ?>
                          </option>
                        <?php endforeach; ?>
                      </select>
                    </div>
                    <div class="d-flex align-items-center gap-2 flex-shrink-0 ap-mod-flags">
                      <div class="form-check form-switch mb-0 ap-col-flag ap-col-switch-center" title="Ativo">
                        <input class="form-check-input ap-mod-toggle" type="checkbox" data-field="enabled" <?= _chk(_b($cfg, 'enabled')) ?> role="switch" aria-label="Ativo">
                      </div>
                      <div class="form-check form-switch mb-0 ap-col-flag ap-col-switch-center" title="Só Admin">
                        <input class="form-check-input ap-mod-toggle" type="checkbox" data-field="adminOnly" <?= _chk(_b($cfg, 'adminOnly')) ?> role="switch" aria-label="Só Admin">
                      </div>
                      <div class="form-check form-switch mb-0 ap-col-flag ap-col-switch-center" title="Em Breve">
                        <input class="form-check-input ap-mod-toggle" type="checkbox" data-field="comingSoon" <?= _chk(_b($cfg, 'comingSoon')) ?> role="switch" aria-label="Em Breve">
                      </div>
                    </div>
                    <button type="button" class="tc-icon-btn-ds ap-mod-move-up" title="Subir" aria-label="Subir módulo"><i class="bi bi-chevron-up"></i></button>
                    <button type="button" class="tc-icon-btn-ds ap-mod-move-down" title="Descer" aria-label="Descer módulo"><i class="bi bi-chevron-down"></i></button>
                  </div>
                <?php endforeach; ?>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           ABA 2 — CONTRATOS
           ════════════════════════════════════════ -->
      <div class="tab-pane fade" id="tab-contratos" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-file-earmark-code me-2"></i>Valores de Contrato</h6>
          <button type="button" class="btn btn-sm btn-success ap-save-btn" data-section="contracts">
            <i class="bi bi-check2-circle me-1"></i>Salvar Contratos
          </button>
        </div>

        <div class="row g-3">
          <!-- Preços dos Modelos -->
          <div class="col-md-6">
            <div class="tc-modal-details-box p-3">
              <h6 class="text-warning mb-3"><i class="bi bi-currency-dollar me-1"></i>Preços por Modelo (USD)</h6>
              <?php foreach (['erc20-minimal' => 'ERC-20 Minimal', 'erc20-controls' => 'ERC-20 Controls', 'erc20-advanced' => 'ERC-20 Advanced', 'erc20-directsale' => 'ERC-20 DirectSale'] as $key => $label): ?>
                <div class="mb-2 d-flex align-items-center gap-2">
                  <label class="form-label text-secondary mb-0 small" style="min-width:160px"><?= $label ?></label>
                  <div class="input-group input-group-sm">
                    <span class="input-group-text bg-dark text-secondary border-secondary">$</span>
                    <input type="number" min="1" max="99999" step="0.01"
                      class="form-control bg-dark text-white border-secondary ap-contract-price"
                      data-model="<?= $key ?>"
                      value="<?= htmlspecialchars((string)($contracts['modelPrices'][$key] ?? 0), ENT_QUOTES, 'UTF-8') ?>">
                    <span class="input-group-text bg-dark text-secondary border-secondary">USD</span>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
          </div>

          <!-- Gas Limits -->
          <div class="col-md-6">
            <div class="tc-modal-details-box p-3">
              <h6 class="text-info mb-3"><i class="bi bi-fuel-pump me-1"></i>Gas Limits por Modelo</h6>
              <?php foreach (['erc20-minimal' => 'ERC-20 Minimal', 'erc20-controls' => 'ERC-20 Controls', 'erc20-advanced' => 'ERC-20 Advanced', 'erc20-directsale' => 'ERC-20 DirectSale'] as $key => $label): ?>
                <div class="mb-2 d-flex align-items-center gap-2">
                  <label class="form-label text-secondary mb-0 small" style="min-width:160px"><?= $label ?></label>
                  <div class="input-group input-group-sm">
                    <input type="number" min="100000" max="10000000" step="100000"
                      class="form-control bg-dark text-white border-secondary ap-gas-limit"
                      data-model="<?= $key ?>"
                      value="<?= htmlspecialchars((string)($contracts['gasLimits'][$key] ?? 0), ENT_QUOTES, 'UTF-8') ?>">
                    <span class="input-group-text bg-dark text-secondary border-secondary">gas</span>
                  </div>
                </div>
              <?php endforeach; ?>
            </div>
          </div>

          <!-- Parâmetros On-Chain -->
          <div class="col-md-6">
            <div class="tc-modal-details-box p-3">
              <h6 class="text-success mb-3"><i class="bi bi-link-45deg me-1"></i>Parâmetros On-Chain</h6>
              <div class="mb-2">
                <label class="form-label text-secondary small mb-1">Base Price (wei)</label>
                <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary font-monospace"
                  id="ap-base-price-wei"
                  value="<?= _val($contracts, 'basePriceWei', '10000000000000000') ?>"
                  placeholder="10000000000000000">
              </div>
              <div class="mb-2">
                <label class="form-label text-secondary small mb-1">Margem de Gas (%)</label>
                <input type="number" min="0" max="100" step="1"
                  class="form-control form-control-sm bg-dark text-white border-secondary"
                  id="ap-gas-margin"
                  value="<?= _val($contracts, 'gasMarginPercent', '20') ?>">
              </div>
              <div class="mb-0">
                <label class="form-label text-secondary small mb-1">
                  Platform Wallet
                  <span class="badge bg-warning text-dark ms-1">⚠️ Gnosis Safe</span>
                </label>
                <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary font-monospace"
                  id="ap-platform-wallet"
                  value="<?= _val($contracts, 'platformWallet') ?>"
                  placeholder="0x..."
                  maxlength="42">
              </div>
            </div>
          </div>

          <!-- Factory Addresses -->
          <div class="col-12">
            <div class="tc-modal-details-box p-3">
              <h6 class="text-primary mb-3"><i class="bi bi-building me-1"></i>Endereços da Factory por Rede</h6>
              <div class="table-responsive">
                <table class="table table-dark table-sm align-middle mb-0">
                  <thead>
                    <tr class="text-secondary small">
                      <th style="width:220px">Rede</th>
                      <th style="width:80px">Chain ID</th>
                      <th>Endereço do Factory</th>
                      <th style="width:80px" class="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php foreach ($knownNetworks as $chainId => $netName):
                      $addr = $contracts['factoryAddresses'][$chainId] ?? '';
                      $isTestnet = in_array($chainId, ['97', '11155111']);
                    ?>
                      <tr>
                        <td>
                          <?php if ($isTestnet): ?>
                            <span class="badge bg-secondary me-1">Testnet</span>
                          <?php endif; ?>
                          <span class="text-light"><?= htmlspecialchars($netName, ENT_QUOTES, 'UTF-8') ?></span>
                        </td>
                        <td><code class="text-info"><?= htmlspecialchars($chainId, ENT_QUOTES, 'UTF-8') ?></code></td>
                        <td>
                          <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary font-monospace ap-factory-addr"
                            data-chain="<?= htmlspecialchars($chainId, ENT_QUOTES, 'UTF-8') ?>"
                            value="<?= htmlspecialchars($addr, ENT_QUOTES, 'UTF-8') ?>"
                            placeholder="0x...  (vazio = não deployado)"
                            maxlength="42">
                        </td>
                        <td class="text-center">
                          <?php if ($addr !== ''): ?>
                            <span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>OK</span>
                          <?php else: ?>
                            <span class="badge bg-warning text-dark"><i class="bi bi-exclamation-triangle me-1"></i>Vazio</span>
                          <?php endif; ?>
                        </td>
                      </tr>
                    <?php endforeach; ?>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           ABA 3 — PERMISSÕES
           ════════════════════════════════════════ -->
      <div class="tab-pane fade" id="tab-permissoes" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-shield-lock me-2"></i>Permissões e Acesso</h6>
          <button type="button" class="btn btn-sm btn-success ap-save-btn" data-section="permissions">
            <i class="bi bi-check2-circle me-1"></i>Salvar Permissões
          </button>
        </div>

        <div class="row g-3">
          <!-- Carteiras Admin -->
          <div class="col-12">
            <div class="tc-modal-details-box p-3">
              <h6 class="text-warning mb-3"><i class="bi bi-person-badge me-1"></i>Carteiras Admin</h6>
              <div id="ap-wallets-list">
                <?php foreach (($permissions['adminWallets'] ?? []) as $i => $w): ?>
                  <div class="d-flex gap-2 mb-2 ap-wallet-row">
                    <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary font-monospace ap-admin-wallet"
                      value="<?= htmlspecialchars($w, ENT_QUOTES, 'UTF-8') ?>"
                      placeholder="0x..."
                      maxlength="42">
                    <?php $isChiefWallet = strtolower($w) === strtolower($permissions['chiefAdmin'] ?? ''); ?>
                    <?php if ($isChiefWallet): ?>
                      <span class="badge bg-warning text-dark align-self-center" title="Chief Admin"><i class="bi bi-star-fill"></i> Chief</span>
                    <?php else: ?>
                      <button type="button" class="btn btn-sm btn-outline-danger ap-remove-wallet" title="Remover">
                        <i class="bi bi-x"></i>
                      </button>
                    <?php endif; ?>
                  </div>
                <?php endforeach; ?>
              </div>
              <button type="button" class="btn btn-sm btn-outline-secondary mt-2" id="ap-add-wallet-btn" aria-label="Adicionar Carteira">
                <i class="bi bi-plus-circle me-1"></i>Adicionar Carteira
              </button>
              <div class="mt-3">
                <label class="form-label text-secondary small mb-1">Chief Admin (⭐ recebe controle total)</label>
                <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary font-monospace"
                  id="ap-chief-admin"
                  value="<?= _val($permissions, 'chiefAdmin') ?>"
                  placeholder="0x..."
                  maxlength="42">
              </div>
            </div>
          </div>

          <!-- Bypass Admin -->
          <div class="col-md-6">
            <div class="tc-modal-details-box p-3">
              <h6 class="text-info mb-3"><i class="bi bi-key me-1"></i>Bypass Admin</h6>
              <div class="d-flex align-items-center gap-3 mb-3">
                <label class="form-label text-secondary mb-0">Bypass Habilitado</label>
                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" id="ap-bypass-enabled" role="switch"
                    <?= _chk(_b($permissions, 'bypassEnabled')) ?>>
                </div>
              </div>
              <p class="small text-secondary mb-0">
                <i class="bi bi-info-circle me-1"></i>
                A chave de bypass é configurada via variável de ambiente <code>TOKENCAFE_ADMIN_BYPASS_KEY</code>.
              </p>
            </div>
          </div>

          <!-- Barreiras Admin -->
          <div class="col-md-6">
            <div class="tc-modal-details-box p-3 border-danger">
              <h6 class="text-danger mb-3"><i class="bi bi-exclamation-triangle-fill me-1"></i>Zona de Perigo</h6>
              <div class="d-flex align-items-center gap-3">
                <label class="form-label text-secondary mb-0">Desativar Barreiras Admin</label>
                <div class="form-check form-switch mb-0">
                  <input class="form-check-input" type="checkbox" id="ap-disable-barriers" role="switch"
                    <?= _chk(_b($permissions, 'disableBarriers')) ?>>
                </div>
              </div>
              <p class="small text-danger mt-2 mb-0">
                <i class="bi bi-exclamation-circle me-1"></i>
                <strong>NUNCA ativar em produção.</strong> Qualquer usuário vira admin.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           ABA 4 — REDES
           ════════════════════════════════════════ -->
      <div class="tab-pane fade" id="tab-redes" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-globe me-2"></i>Redes por Módulo</h6>
          <button type="button" class="btn btn-sm btn-success ap-save-btn" data-section="modules">
            <i class="bi bi-check2-circle me-1"></i>Salvar Redes
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-dark table-hover table-sm align-middle">
            <thead>
              <tr class="text-secondary small">
                <th>Módulo</th>
                <th class="text-center">Mainnet</th>
                <th class="text-center">Testnet</th>
                <th class="text-secondary small">Observação</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($modules as $slug => $cfg):
                $icon = $moduleIcons[$slug] ?? 'bi-box';
              ?>
                <tr>
                  <td>
                    <span class="badge bg-dark border border-secondary text-secondary font-monospace small">
                      <i class="bi <?= $icon ?> me-1"></i><?= htmlspecialchars($slug, ENT_QUOTES, 'UTF-8') ?>
                    </span>
                  </td>
                  <td class="text-center">
                    <div class="form-check form-switch d-flex justify-content-center">
                      <input class="form-check-input ap-mod-toggle" type="checkbox"
                        data-module="<?= htmlspecialchars($slug, ENT_QUOTES, 'UTF-8') ?>"
                        data-field="mainnet"
                        <?= _chk(_b($cfg, 'mainnet')) ?> role="switch">
                    </div>
                  </td>
                  <td class="text-center">
                    <div class="form-check form-switch d-flex justify-content-center">
                      <input class="form-check-input ap-mod-toggle" type="checkbox"
                        data-module="<?= htmlspecialchars($slug, ENT_QUOTES, 'UTF-8') ?>"
                        data-field="testnet"
                        <?= _chk(_b($cfg, 'testnet')) ?> role="switch">
                    </div>
                  </td>
                  <td class="text-secondary small">
                    <?php if ($slug === 'widget'): ?>
                      Aguarda deploy da factory
                    <?php elseif ($slug === 'analytics'): ?>
                      Aguarda TheGraph
                    <?php elseif ($slug === 'verifica'): ?>
                      Requer EXPLORER_API_KEY
                    <?php endif; ?>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>

        <!-- Status das Redes -->
        <h6 class="text-white mt-4 mb-2"><i class="bi bi-hdd-network me-1"></i>Status das Redes (Factory)</h6>
        <div class="table-responsive">
          <table class="table table-dark table-sm align-middle mb-0">
            <thead>
              <tr class="text-secondary small">
                <th>Rede</th>
                <th>Chain ID</th>
                <th>Factory</th>
                <th class="text-center">Tipo</th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($knownNetworks as $chainId => $netName):
                $addr = $contracts['factoryAddresses'][$chainId] ?? '';
                $isTestnet = in_array($chainId, ['97', '11155111']);
              ?>
                <tr>
                  <td class="text-light"><?= htmlspecialchars($netName, ENT_QUOTES, 'UTF-8') ?></td>
                  <td><code class="text-info"><?= $chainId ?></code></td>
                  <td class="font-monospace small text-secondary">
                    <?= $addr !== '' ? htmlspecialchars(substr($addr, 0, 12) . '…' . substr($addr, -6), ENT_QUOTES, 'UTF-8') : '—' ?>
                  </td>
                  <td class="text-center">
                    <?php if ($addr !== ''): ?>
                      <span class="badge bg-success">Deployado</span>
                    <?php else: ?>
                      <span class="badge bg-warning text-dark">Pendente</span>
                    <?php endif; ?>
                  </td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           ABA 5 — FEATURES
           ════════════════════════════════════════ -->
      <div class="tab-pane fade" id="tab-features" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-toggles me-2"></i>Feature Flags</h6>
          <button type="button" class="btn btn-sm btn-success ap-save-btn" data-section="features">
            <i class="bi bi-check2-circle me-1"></i>Salvar Features
          </button>
        </div>

        <!-- Features do Sistema -->
        <div class="tc-modal-details-box p-3 mb-3">
          <h6 class="text-info mb-3"><i class="bi bi-toggle2-on me-1"></i>Funcionalidades do Sistema</h6>
          <?php
          $featuresMeta = [
            'referralEnabled'  => ['label' => 'Sistema de Indicação',   'desc' => 'Referral on-chain habilitado',             'danger' => false],
            'analyticsEnabled' => ['label' => 'Analytics (TheGraph)',    'desc' => 'Aguarda integração TheGraph',               'danger' => false],
            'widgetEnabled'    => ['label' => 'Widget de Venda',         'desc' => 'Aguarda deploy da factory',                 'danger' => false],
            'verifyEnabled'    => ['label' => 'Verificação Explorer',    'desc' => 'Requer EXPLORER_API_KEY no .env',           'danger' => false],
            'maintenanceMode'  => ['label' => 'Modo Manutenção',         'desc' => '⚠️ Redireciona TODOS os usuários',          'danger' => true],
          ];
          foreach ($featuresMeta as $key => $meta):
            $val = !empty($features[$key]);
          ?>
            <div class="d-flex align-items-center gap-3 mb-2 py-2 border-bottom border-secondary">
              <div class="form-check form-switch mb-0">
                <input class="form-check-input ap-feature-toggle" type="checkbox"
                  id="feat-<?= $key ?>" data-key="<?= $key ?>"
                  role="switch" <?= _chk($val) ?>>
              </div>
              <div class="flex-grow-1">
                <label class="form-label mb-0 <?= $meta['danger'] ? 'text-danger fw-bold' : 'text-white' ?>"
                  for="feat-<?= $key ?>">
                  <?= htmlspecialchars($meta['label'], ENT_QUOTES, 'UTF-8') ?>
                </label>
                <div class="small text-secondary"><?= htmlspecialchars($meta['desc'], ENT_QUOTES, 'UTF-8') ?></div>
              </div>
              <span class="badge <?= $val ? 'bg-success' : 'bg-secondary' ?> ap-feature-badge">
                <?= $val ? 'ON' : 'OFF' ?>
              </span>
            </div>
          <?php endforeach; ?>
        </div>

        <!-- Funções Customizadas -->
        <div class="tc-modal-details-box p-3">
          <h6 class="text-warning mb-3"><i class="bi bi-plus-square me-1"></i>Funções Customizadas</h6>
          <p class="small text-secondary mb-3">Registre flags/configurações adicionais à medida que o sistema cresce. Acessíveis em JS via <code>window.TC_SYSTEM_SETTINGS.customFunctions</code>.</p>
          <div id="ap-custom-fns-list">
            <?php if (empty($customFns)): ?>
              <p class="text-secondary small fst-italic" id="ap-custom-fns-empty">Nenhuma função customizada registrada.</p>
            <?php else: ?>
              <?php foreach ($customFns as $i => $fn): ?>
                <div class="d-flex gap-2 mb-2 ap-custom-fn-row">
                  <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary font-monospace"
                    placeholder="chave" value="<?= _val($fn, 'key') ?>" data-cf="key">
                  <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary"
                    placeholder="valor" value="<?= _val($fn, 'value') ?>" data-cf="value">
                  <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary"
                    placeholder="módulo" value="<?= _val($fn, 'module') ?>" data-cf="module" style="max-width:120px">
                  <input type="text" class="form-control form-control-sm bg-dark text-white border-secondary"
                    placeholder="descrição" value="<?= _val($fn, 'description') ?>" data-cf="description">
                  <button type="button" class="btn btn-sm btn-outline-danger ap-remove-custom-fn">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              <?php endforeach; ?>
            <?php endif; ?>
          </div>
          <button type="button" class="btn btn-sm btn-outline-warning mt-2" id="ap-add-custom-fn-btn">
            <i class="bi bi-plus-circle me-1"></i>Adicionar Função
          </button>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           ABA 6 — INTEGRAÇÕES
           ════════════════════════════════════════ -->
      <div class="tab-pane fade" id="tab-integracoes" role="tabpanel">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <h6 class="mb-0 text-white"><i class="bi bi-plug me-2"></i>Integrações Externas</h6>
          <button type="button" class="btn btn-sm btn-success" id="ap-save-api-keys-btn">
            <i class="bi bi-check2-circle me-1"></i>Salvar Integrações
          </button>
        </div>

        <p class="small text-secondary mb-3">
          <i class="bi bi-shield-lock me-1"></i>
          As chaves são gravadas diretamente em <code>api/.env</code> no servidor.
          Os valores <strong>nunca são exibidos</strong> — somente o status de configuração.
          Deixar o campo em branco mantém a chave atual.
        </p>

        <!-- Card: APIs de Inteligência Artificial -->
        <div class="tcd-card-head mb-1">
          <h6 class="tcd-title tc-text-sm"><i class="bi bi-robot me-1"></i>APIs de Inteligência Artificial</h6>
          <p class="tcd-subtitle text-secondary mb-0 small">Usadas pelo módulo de suporte IA (ia-chat). Groq é o primário (gratuito); Anthropic é fallback (pago).</p>
        </div>
        <div class="tc-modal-details-box p-3 mb-3">

          <!-- GROQ_API_KEY -->
          <div class="mb-3 pb-3 border-bottom border-secondary">
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="text-white fw-semibold small">GROQ_API_KEY</span>
              <?php if ($groqConfigured): ?>
                <span class="badge bg-success tc-status-text"><i class="bi bi-check-circle me-1"></i>Configurada</span>
              <?php else: ?>
                <span class="badge bg-warning text-dark tc-status-text"><i class="bi bi-exclamation-triangle me-1"></i>Vazia</span>
              <?php endif; ?>
            </div>
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-dark border-secondary text-secondary"><i class="bi bi-key"></i></span>
              <input type="password"
                id="ap-key-GROQ_API_KEY"
                class="form-control form-control-sm bg-dark text-white border-secondary ap-api-key-input"
                data-key-name="GROQ_API_KEY"
                placeholder="<?= $groqConfigured ? 'Deixe em branco para manter a chave atual' : 'Cole a nova chave aqui' ?>"
                autocomplete="new-password">
              <button class="btn btn-outline-secondary btn-sm ap-toggle-key-visibility" type="button" tabindex="-1" title="Mostrar/ocultar">
                <i class="bi bi-eye"></i>
              </button>
            </div>
            <div class="small text-secondary mt-1">
              Gratuito em <a href="https://console.groq.com/keys" target="_blank" rel="noopener" class="text-info">console.groq.com/keys</a>
            </div>
          </div>

          <!-- ANTHROPIC_API_KEY -->
          <div>
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="text-white fw-semibold small">ANTHROPIC_API_KEY</span>
              <?php if ($anthropicConfigured): ?>
                <span class="badge bg-success tc-status-text"><i class="bi bi-check-circle me-1"></i>Configurada</span>
              <?php else: ?>
                <span class="badge bg-warning text-dark tc-status-text"><i class="bi bi-exclamation-triangle me-1"></i>Vazia</span>
              <?php endif; ?>
            </div>
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-dark border-secondary text-secondary"><i class="bi bi-key"></i></span>
              <input type="password"
                id="ap-key-ANTHROPIC_API_KEY"
                class="form-control form-control-sm bg-dark text-white border-secondary ap-api-key-input"
                data-key-name="ANTHROPIC_API_KEY"
                placeholder="<?= $anthropicConfigured ? 'Deixe em branco para manter a chave atual' : 'Cole a nova chave aqui' ?>"
                autocomplete="new-password">
              <button class="btn btn-outline-secondary btn-sm ap-toggle-key-visibility" type="button" tabindex="-1" title="Mostrar/ocultar">
                <i class="bi bi-eye"></i>
              </button>
            </div>
            <div class="small text-secondary mt-1">
              Fallback pago — requerido somente se Groq não estiver configurado
            </div>
          </div>
        </div>

        <!-- Card: APIs de Explorer -->
        <div class="tcd-card-head mb-1">
          <h6 class="tcd-title tc-text-sm"><i class="bi bi-search me-1"></i>API de Explorer Blockchain</h6>
          <p class="tcd-subtitle text-secondary mb-0 small">Usada pelo módulo de verificação de contratos (verifica). Sem esta key, o sistema usa a API pública com rate limit reduzido.</p>
        </div>
        <div class="tc-modal-details-box p-3">

          <!-- EXPLORER_API_KEY -->
          <div>
            <div class="d-flex align-items-center gap-2 mb-2">
              <span class="text-white fw-semibold small">EXPLORER_API_KEY</span>
              <?php if ($explorerConfigured): ?>
                <span class="badge bg-success tc-status-text"><i class="bi bi-check-circle me-1"></i>Configurada</span>
              <?php else: ?>
                <span class="badge bg-warning text-dark tc-status-text"><i class="bi bi-exclamation-triangle me-1"></i>Vazia</span>
              <?php endif; ?>
            </div>
            <div class="input-group input-group-sm">
              <span class="input-group-text bg-dark border-secondary text-secondary"><i class="bi bi-key"></i></span>
              <input type="password"
                id="ap-key-EXPLORER_API_KEY"
                class="form-control form-control-sm bg-dark text-white border-secondary ap-api-key-input"
                data-key-name="EXPLORER_API_KEY"
                placeholder="<?= $explorerConfigured ? 'Deixe em branco para manter a chave atual' : 'Cole a nova chave aqui' ?>"
                autocomplete="new-password">
              <button class="btn btn-outline-secondary btn-sm ap-toggle-key-visibility" type="button" tabindex="-1" title="Mostrar/ocultar">
                <i class="bi bi-eye"></i>
              </button>
            </div>
            <div class="small text-secondary mt-1">
              <i class="bi bi-info-circle me-1"></i>
              Compatível com BscScan e Etherscan (Etherscan V2).
              Sem esta key, o módulo <strong>verifica</strong> usa a API pública (5 req/s).
              Obtenha em <a href="https://bscscan.com/myapikey" target="_blank" rel="noopener" class="text-info">bscscan.com/myapikey</a>
              ou <a href="https://etherscan.io/myapikey" target="_blank" rel="noopener" class="text-info">etherscan.io/myapikey</a>.
            </div>
          </div>
        </div>

      </div><!-- /tab-integracoes -->

    </div><!-- /tab-content -->
  </div><!-- /tc-modal-details-box -->
</div><!-- /admin-painel-root -->
<?php
// Carrega como script REGULAR (não módulo) para garantir execução síncrona
// no final do body — sem timing issues de ES module ou importmap.
// O auto-include do render.php vê que já está na lista e não duplica.
if (isset($enqueue_script_src) && is_callable($enqueue_script_src)) {
  ($enqueue_script_src)('assets/js/modules/admin-painel/admin-painel.js', []);
}
?>
