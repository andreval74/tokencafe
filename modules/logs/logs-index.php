<?php
require_once __DIR__ . "/../../includes/admin-config.php";

$walletCookie = isset($_COOKIE[TOKENCAFE_WALLET_COOKIE]) ? (string) $_COOKIE[TOKENCAFE_WALLET_COOKIE] : "";
$isChief = tokencafe_is_chief_admin($walletCookie);
if (!$isChief && function_exists("tokencafe_is_admin_bypass_active") && tokencafe_is_admin_bypass_active()) $isChief = true;
$hasWallet = trim($walletCookie) !== "";

$date = isset($_GET["date"]) ? trim((string) $_GET["date"]) : "";
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
  $date = gmdate("Y-m-d");
}

$days = isset($_GET["days"]) ? (int) $_GET["days"] : 7;
if ($days < 1) $days = 1;
if ($days > 30) $days = 30;

$root = dirname(__DIR__, 2);
$logsDir = $root . DIRECTORY_SEPARATOR . "modules" . DIRECTORY_SEPARATOR . "logs" . DIRECTORY_SEPARATOR . "storage" . DIRECTORY_SEPARATOR . "admin-logs";
$visitsFile = $logsDir . DIRECTORY_SEPARATOR . "IPLogs-" . $date . ".php";
$clientFile = $logsDir . DIRECTORY_SEPARATOR . "SCLogs-" . $date . ".php";

$filterWallet = "";
$filterChain = "";
$filterContract = "";
if ($isChief) {
  $filterWallet = strtolower(trim((string) ($_GET["f_wallet"] ?? "")));
  $filterChain = trim((string) ($_GET["f_chain"] ?? ""));
  $filterContract = strtolower(trim((string) ($_GET["f_contract"] ?? "")));
} else {
  if ($hasWallet) {
    $filterWallet = strtolower(trim($walletCookie));
    $filterChain = trim((string) ($_COOKIE["tokencafe_chain_id"] ?? ""));
    $filterContract = strtolower(trim((string) ($_COOKIE["tokencafe_contract"] ?? "")));
  }
}

function tc_parse_log_line(string $line): ?array
{
  $line = trim($line);
  if ($line === "") return null;
  if (str_starts_with($line, "<?php")) return null;
  if ($line === "data;hora;ip;wallet;page" || $line === "data;hora;ip;wallet;page;chain;contract") return null;

  if (str_contains($line, ";") && !str_starts_with($line, "[")) {
    $parts = explode(";", $line);
    if (count($parts) < 5) return null;
    return [
      "date" => trim((string) $parts[0]),
      "time" => trim((string) $parts[1]),
      "ip" => trim((string) $parts[2]),
      "wallet" => trim((string) $parts[3]),
      "page" => trim((string) $parts[4]),
      "chain" => isset($parts[5]) ? trim((string) $parts[5]) : "",
      "contract" => isset($parts[6]) ? trim((string) $parts[6]) : "",
    ];
  }

  if (!preg_match('/^\[(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\]\s*(.*)$/', $line, $m)) return null;

  $date = $m[1];
  $time = $m[2];
  $rest = (string) $m[3];
  $pairs = [];

  if (preg_match_all('/\b([a-zA-Z_]+)=([^\s]+)/', $rest, $mm, PREG_SET_ORDER)) {
    foreach ($mm as $p) {
      $k = strtolower((string) $p[1]);
      $v = (string) $p[2];
      $pairs[$k] = $v;
    }
  }

  $page = $pairs["page"] ?? "";
  if ($page === "" && isset($pairs["uri"])) {
    $q = parse_url((string) $pairs["uri"], PHP_URL_QUERY);
    if (is_string($q)) {
      parse_str($q, $qs);
      if (isset($qs["page"])) $page = (string) $qs["page"];
    }
  }

  return [
    "date" => $date,
    "time" => $time,
    "ip" => $pairs["ip"] ?? "",
    "wallet" => $pairs["wallet"] ?? "",
    "page" => $page,
    "chain" => $pairs["chain"] ?? "",
    "contract" => $pairs["contract"] ?? "",
  ];
}

function tc_read_log_rows(string $file, int $max = 200): array
{
  if (!is_file($file)) return [];
  $content = @file($file, FILE_IGNORE_NEW_LINES);
  if (!is_array($content)) return [];
  $rows = [];
  foreach ($content as $line) {
    $r = tc_parse_log_line((string) $line);
    if (!$r) continue;
    $rows[] = $r;
  }
  $total = count($rows);
  if ($total <= $max) return $rows;
  return array_slice($rows, $total - $max);
}

function tc_preview_rows(array $rows, int $head = 1, int $tail = 3): array
{
  $total = count($rows);
  if ($total <= ($head + $tail)) return $rows;
  $out = [];
  for ($i = 0; $i < $head && $i < $total; $i++) $out[] = $rows[$i];
  $out[] = ["__ellipsis" => true];
  $start = max($head, $total - $tail);
  for ($i = $start; $i < $total; $i++) $out[] = $rows[$i];
  return $out;
}

function tc_apply_filters(array $rows, string $wallet, string $chain, string $contract): array
{
  $wallet = strtolower(trim($wallet));
  $chain = trim($chain);
  $contract = strtolower(trim($contract));
  return array_values(array_filter($rows, function ($r) use ($wallet, $chain, $contract) {
    if ($wallet !== "" && strtolower((string) ($r["wallet"] ?? "")) !== $wallet) return false;
    if ($chain !== "" && trim((string) ($r["chain"] ?? "")) !== $chain) return false;
    if ($contract !== "" && strtolower((string) ($r["contract"] ?? "")) !== $contract) return false;
    return true;
  }));
}

function tc_unique_count(array $rows, string $key): int
{
  $m = [];
  foreach ($rows as $r) {
    $v = isset($r[$key]) ? (string) $r[$key] : "";
    if ($v === "") continue;
    $m[$v] = 1;
  }
  return count($m);
}

function tc_top_pages(array $rows, int $limit = 8): array
{
  $m = [];
  foreach ($rows as $r) {
    $p = isset($r["page"]) ? (string) $r["page"] : "";
    if ($p === "") continue;
    $m[$p] = ($m[$p] ?? 0) + 1;
  }
  arsort($m);
  $out = [];
  foreach ($m as $k => $v) {
    $out[] = ["page" => $k, "count" => (int) $v];
    if (count($out) >= $limit) break;
  }
  return $out;
}

function tc_top_ips(array $rows, int $limit = 8): array
{
  $m = [];
  foreach ($rows as $r) {
    $ip = isset($r["ip"]) ? (string) $r["ip"] : "";
    if ($ip === "") continue;
    $m[$ip] = ($m[$ip] ?? 0) + 1;
  }
  arsort($m);
  $out = [];
  foreach ($m as $k => $v) {
    $out[] = ["ip" => $k, "count" => (int) $v];
    if (count($out) >= $limit) break;
  }
  return $out;
}

function tc_rate_per_hour(array $rows): float
{
  if (!$rows) return 0.0;
  $hrs = [];
  foreach ($rows as $r) {
    $t = isset($r["time"]) ? (string) $r["time"] : "";
    $h = (int) substr($t, 0, 2);
    $hrs[$h] = true;
  }
  $sofar = max(1, count($hrs));
  return count($rows) / $sofar;
}

$visitsRaw = tc_read_log_rows($visitsFile, 2000);
$clientRaw = tc_read_log_rows($clientFile, 2000);
$visits = tc_apply_filters($visitsRaw, $filterWallet, $filterChain, $filterContract);
$client = tc_apply_filters($clientRaw, $filterWallet, $filterChain, $filterContract);
$visitsPreview = tc_preview_rows($visits, 1, 3);
$clientPreview = tc_preview_rows($client, 1, 3);

$allIpWindow = [];
$allClientWindow = [];
for ($i = $days - 1; $i >= 0; $i--) {
  $d = gmdate("Y-m-d", strtotime($date . " 00:00:00 UTC") - ($i * 86400));
  $ipFile = $logsDir . DIRECTORY_SEPARATOR . "IPLogs-" . $d . ".php";
  $scFile = $logsDir . DIRECTORY_SEPARATOR . "SCLogs-" . $d . ".php";
  $ipRows = tc_apply_filters(tc_read_log_rows($ipFile, 5000), $filterWallet, $filterChain, $filterContract);
  $scRows = tc_apply_filters(tc_read_log_rows($scFile, 5000), $filterWallet, $filterChain, $filterContract);
  $allIpWindow = array_merge($allIpWindow, $ipRows);
  $allClientWindow = array_merge($allClientWindow, $scRows);
}

$kpiTotalIp = count($visits);
$kpiUniqueIp = tc_unique_count($visits, "ip");
$kpiTotalClient = count($client);
$kpiUniqueWallet = tc_unique_count(array_merge($visits, $client), "wallet");

$projIp = (int) round(tc_rate_per_hour($visits) * 24);
$projClient = (int) round(tc_rate_per_hour($client) * 24);

$topIpPages = tc_top_pages($allIpWindow, 8);
$topClientPages = tc_top_pages($allClientWindow, 8);
$topIps = $isChief ? tc_top_ips($allIpWindow, 8) : [];
$visitsDataJson = json_encode($visits, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

// Defaults: por padrão, todos os filtros iniciam em "Todos/Todas"
$defaultPage = "";
$defaultIp = "";
$defaultWallet = "";

// Opções para selects
$pageOptions = [];
foreach ($allIpWindow as $r) {
  $p = isset($r["page"]) ? (string) $r["page"] : "";
  if ($p !== "") $pageOptions[$p] = ($pageOptions[$p] ?? 0) + 1;
}
arsort($pageOptions);
$ipOptions = [];
if ($isChief) {
  foreach ($allIpWindow as $r) {
    $ip = isset($r["ip"]) ? (string) $r["ip"] : "";
    if ($ip !== "") $ipOptions[$ip] = ($ipOptions[$ip] ?? 0) + 1;
  }
  arsort($ipOptions);
}
$walletOptions = [];
if ($isChief) {
  foreach ($allIpWindow as $r) {
    $w = isset($r["wallet"]) ? strtolower((string) $r["wallet"]) : "";
    if ($w !== "") $walletOptions[$w] = ($walletOptions[$w] ?? 0) + 1;
  }
  arsort($walletOptions);
}
?>

<div class="container py-4 bg-page-black min-vh-100">
  <?php if (!$isChief && !$hasWallet) { ?>
    <div class="alert alert-warning">
      Conecte sua carteira para visualizar seu contexto de BI.
    </div>
  <?php } else { ?>
    <div class="tc-tools-hero mb-3">
      <h1 class="tc-tools-hero-title mb-1">Logs (BI)</h1>
      <div class="tc-tools-hero-subtitle">
        Painel unificado: KPIs, projeções, top páginas e amostra do dia. Admin pode investigar por Wallet/Rede/Contrato; usuário vê apenas seu contexto.
      </div>
    </div>

    <div class="row g-3 mb-3">
      <div class="col-12 col-md-3">
        <div class="tc-kpi tc-kpi--gold">
          <div class="tc-kpi-label"><i class="bi bi-globe2 me-1"></i>Acessos (IP)</div>
          <div class="tc-kpi-value"><?= (int) $kpiTotalIp ?></div>
          <div class="small text-white-50">Proj.: <?= (int) $projIp ?> / dia</div>
        </div>
      </div>
      <div class="col-12 col-md-3">
        <div class="tc-kpi tc-kpi--blue">
          <div class="tc-kpi-label"><i class="bi bi-person-badge me-1"></i>IPs Únicos</div>
          <div class="tc-kpi-value"><?= (int) $kpiUniqueIp ?></div>
          <div class="small text-white-50">Janela: <?= (int) $days ?> dias</div>
        </div>
      </div>
      <div class="col-12 col-md-3">
        <div class="tc-kpi tc-kpi--green">
          <div class="tc-kpi-label"><i class="bi bi-person-check me-1"></i>Área do Cliente</div>
          <div class="tc-kpi-value"><?= (int) $kpiTotalClient ?></div>
          <div class="small text-white-50">Proj.: <?= (int) $projClient ?> / dia</div>
        </div>
      </div>
      <div class="col-12 col-md-3">
        <div class="tc-kpi tc-kpi--orange">
          <div class="tc-kpi-label"><i class="bi bi-wallet2 me-1"></i>Wallets Únicas</div>
          <div class="tc-kpi-value"><?= (int) $kpiUniqueWallet ?></div>
          <div class="small text-white-50">IP + Cliente</div>
        </div>
      </div>
    </div>

    <div class="row g-3 align-items-end mb-3">
      <div class="col-12 col-md-4">
        <label class="form-label text-white-50 small mb-1"><i class="bi bi-calendar3 me-1"></i>Data</label>
        <input type="date" class="form-control" value="<?= htmlspecialchars($date, ENT_QUOTES, "UTF-8") ?>" id="logsDate" />
      </div>
      <div class="col-12 col-md-4">
        <label class="form-label text-white-50 small mb-1"><i class="bi bi-calendar-range me-1"></i>Janela (dias)</label>
        <select class="form-select" id="daysRange">
          <?php foreach ([7, 14, 30] as $opt) { ?>
            <option value="<?= $opt ?>" <?= $opt === $days ? "selected" : "" ?>>Últimos <?= $opt ?> dias</option>
          <?php } ?>
        </select>
      </div>
      <div class="col-12 col-md-4">
        <button class="btn btn-sm tc-action-btn w-100" id="btnLoadLogs">
          <i class="bi bi-arrow-repeat me-1"></i>
          Carregar
        </button>
      </div>
    </div>

    <?php /* Campos de busca por Wallet/Chain/Contrato removidos conforme solicitado */ ?>

    <div class="row g-3">
      <div class="col-12">
        <div class="tool-tile" style="min-height:auto;">
          <div class="d-flex align-items-center gap-2">
            <div class="tool-tile-icon"><i class="bi bi-globe2"></i></div>
            <div class="tool-tile-title m-0"><i class="bi bi-diagram-2 me-2 text-secondary"></i>Visitas (IPLogs)</div>
          </div>
          <div class="tool-tile-desc">Top páginas por acesso (janela) e amostra do dia.</div>
          <div class="tool-tile-footer d-flex flex-column gap-2 mt-2">
            <div class="table-responsive">
              <table class="table table-sm mb-0" id="topPagesTable" style="color: rgba(255,255,255,0.78);">
                <thead style="color: rgba(255,255,255,0.55);">
                  <tr>
                    <th>Página</th>
                    <th class="text-end">Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  <?php if (!$topIpPages) { ?>
                    <tr><td colspan="2" class="text-white-50">Sem registros.</td></tr>
                  <?php } else { foreach ($topIpPages as $t) { ?>
                    <tr><td><?= htmlspecialchars($t["page"], ENT_QUOTES, "UTF-8") ?></td><td class="text-end"><?= (int) $t["count"] ?></td></tr>
                  <?php } } ?>
                </tbody>
              </table>
            </div>

            <?php if ($isChief) { ?>
              <div class="table-responsive">
                <table class="table table-sm mb-0" style="color: rgba(255,255,255,0.78);">
                  <thead style="color: rgba(255,255,255,0.55);">
                    <tr>
                      <th>IP</th>
                      <th class="text-end">Acessos</th>
                    </tr>
                  </thead>
                  <tbody>
                    <?php if (!$topIps) { ?>
                      <tr><td colspan="2" class="text-white-50">Sem registros.</td></tr>
                    <?php } else { foreach ($topIps as $t) { ?>
                      <tr><td><?= htmlspecialchars($t["ip"], ENT_QUOTES, "UTF-8") ?></td><td class="text-end"><?= (int) $t["count"] ?></td></tr>
                    <?php } } ?>
                  </tbody>
                </table>
              </div>
            <?php } ?>

            <?php if ($isChief) { ?>
            <div class="row g-2 align-items-end">
              <div class="col-12 col-lg-4">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-file-code me-1"></i>Página (slug)</label>
                <div class="d-flex align-items-center gap-2">
                  <select class="form-select" id="fltPage">
                    <option value="">Todas</option>
                    <?php foreach ($pageOptions as $p => $cnt) { ?>
                      <option value="<?= htmlspecialchars($p, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($p, ENT_QUOTES, 'UTF-8') ?></option>
                    <?php } ?>
                  </select>
                </div>
              </div>
              <div class="col-6 col-lg-3">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-hdd-network me-1"></i>IP</label>
                <select class="form-select" id="fltIp">
                  <option value="">Todos</option>
                  <?php foreach ($ipOptions as $ip => $cnt) { ?>
                    <option value="<?= htmlspecialchars($ip, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($ip, ENT_QUOTES, 'UTF-8') ?></option>
                  <?php } ?>
                </select>
              </div>
              <div class="col-6 col-lg-3">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-wallet2 me-1"></i>Wallet</label>
                <select class="form-select" id="fltWallet">
                  <option value="">Todas</option>
                  <?php foreach ($walletOptions as $w => $cnt) { ?>
                    <option value="<?= htmlspecialchars($w, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars(substr($w,0,10).'...'.substr($w,-6), ENT_QUOTES, 'UTF-8') ?></option>
                  <?php } ?>
                </select>
              </div>
              <div class="col-6 col-lg-2">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-clock me-1"></i>Hora (HH)</label>
                <div class="input-group">
                  <input type="text" class="form-control" id="fltHour" placeholder="ex.: 14" />
                  <button class="btn tc-action-btn" id="btnApplyTableFilter" type="button" aria-label="Aplicar filtros">
                    <i class="bi bi-funnel"></i>
                  </button>
                  <button class="btn btn-outline-secondary" id="btnClearTableFilter" type="button" aria-label="Limpar filtros">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
            </div>
            <?php } else { ?>
            <div class="row g-2 align-items-end">
              <div class="col-12 col-lg-9">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-file-code me-1"></i>Página (slug)</label>
                <div class="d-flex align-items-center gap-2">
                  <select class="form-select" id="fltPage">
                    <option value="">Todas</option>
                    <?php foreach ($pageOptions as $p => $cnt) { ?>
                      <option value="<?= htmlspecialchars($p, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($p, ENT_QUOTES, 'UTF-8') ?></option>
                    <?php } ?>
                  </select>
                </div>
              </div>
              <div class="col-6 col-lg-3">
                <label class="form-label text-white-50 small mb-1"><i class="bi bi-clock me-1"></i>Hora (HH)</label>
                <div class="input-group">
                  <input type="text" class="form-control" id="fltHour" placeholder="ex.: 14" />
                  <button class="btn tc-action-btn" id="btnApplyTableFilter" type="button" aria-label="Aplicar filtros">
                    <i class="bi bi-funnel"></i>
                  </button>
                  <button class="btn btn-outline-secondary" id="btnClearTableFilter" type="button" aria-label="Limpar filtros">
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </div>
            </div>
            <?php } ?>
            <div class="table-responsive mt-1">
              <table class="table table-sm mb-0 w-100" style="color: rgba(255,255,255,0.78);">
                <thead style="color: rgba(255,255,255,0.55);">
                  <tr>
                    <th data-sort="date" class="tc-sortable"><i class="bi bi-calendar3 me-1"></i>Data<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="time" class="tc-sortable"><i class="bi bi-clock me-1"></i>Hora<span class="tc-sort-ind ms-1"></span></th>
                    <?php if ($isChief) { ?><th data-sort="ip" class="tc-sortable"><i class="bi bi-hdd-network me-1"></i>IP<span class="tc-sort-ind ms-1"></span></th><?php } ?>
                    <th data-sort="wallet" class="tc-sortable"><i class="bi bi-wallet2 me-1"></i>Wallet<span class="tc-sort-ind ms-1"></span></th>
                    <th data-sort="page" class="tc-sortable text-end" style="width: 160px;"><i class="bi bi-box-arrow-in-right me-1"></i>Page<span class="tc-sort-ind ms-1"></span></th>
                  </tr>
                </thead>
                <tbody id="visitsRows"></tbody>
              </table>
            </div>
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2" id="visitsPagerWrap">
              <div class="text-white-50 small d-flex align-items-center gap-2">
                <span id="visitsCountInfo"></span>
                <label class="ms-3 small">Linhas/página</label>
                <select class="form-select form-select-sm" id="pageSizeSel" style="width:auto;">
                  <option value="10" selected>10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
              <div class="d-flex align-items-center gap-1">
                <div class="btn-group btn-group-sm" id="visitsPager" style="display:none;"></div>
                <?php if ($isChief) { ?>
                  <button class="btn btn-sm tc-action-btn" id="btnDownloadLog" type="button">
                    <i class="bi bi-download me-1"></i>Baixar arquivo
                  </button>
                <?php } ?>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- SCLogs listing removido por redundância -->
    </div>

    <script>
      (function () {
        var btn = document.getElementById("btnLoadLogs");
        var d = document.getElementById("logsDate");
        var daysSel = document.getElementById("daysRange");
        if (!btn || !d) return;
        btn.addEventListener("click", function () {
          try {
            var url = new URL(window.location.href);
            url.searchParams.set("date", String(d.value || ""));
            if (daysSel) url.searchParams.set("days", String(daysSel.value || "7"));
            window.location.href = url.toString();
          } catch (_) {}
        });
        var apply = document.getElementById("btnApplyFilters");
        var clear = document.getElementById("btnClearFilters");
        if (apply) apply.addEventListener("click", function(){
          try {
            var url = new URL(window.location.href);
            url.searchParams.set("f_wallet", String(document.getElementById("fWallet")?.value || "").trim());
            url.searchParams.set("f_chain", String(document.getElementById("fChain")?.value || "").trim());
            url.searchParams.set("f_contract", String(document.getElementById("fContract")?.value || "").trim());
            window.location.href = url.toString();
          } catch (_) {}
        });
        if (clear) clear.addEventListener("click", function(){
          try {
            var url = new URL(window.location.href);
            url.searchParams.delete("f_wallet");
            url.searchParams.delete("f_chain");
            url.searchParams.delete("f_contract");
            window.location.href = url.toString();
          } catch (_) {}
        });

        // Filtro e paginação da tabela (10 por página; pager aparece se > 50)
        var data = <?= $visitsDataJson ?: "[]" ?>;
        var isChief = <?= $isChief ? "true" : "false" ?>;
        var pageSize = 10, cur = 1;
        var tBody = document.getElementById("visitsRows");
        var wrap = document.getElementById("visitsPagerWrap");
        var pager = document.getElementById("visitsPager");
        var info = document.getElementById("visitsCountInfo");
        function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
        var palette=['#d4af37','#2dd4bf','#60a5fa','#a78bfa','#f472b6','#f59e0b','#34d399','#fb7185','#f97316','#22c55e'];
        function hashKey(s){var h=0; for(var i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i); h|=0;} return Math.abs(h);}
        function pageChip(key){var k=String(key||''); var clr=palette[hashKey(k)%palette.length]; var bg=clr+'33'; var bd=clr+'55'; return '<span style="display:inline-block;padding:.15rem .5rem;border-radius:999px;background:'+bg+';border:1px solid '+bd+';color:'+clr+'">'+esc(k)+'</span>';}
        function applyTableFilter(){
          var p = String(document.getElementById("fltPage")?.value||"").toLowerCase().trim();
          var ip = String(document.getElementById("fltIp")?.value||"").toLowerCase().trim();
          var hh = String(document.getElementById("fltHour")?.value||"").trim();
          var w = String(document.getElementById("fltWallet")?.value||"").toLowerCase().trim();
          return data.filter(function(r){
            if (p && String(r.page||"").toLowerCase()!==p) return false;
            if (isChief && ip && String(r.ip||"").toLowerCase()!==ip) return false;
            if (isChief && w && String(r.wallet||"").toLowerCase()!==w) return false;
            if (hh && String(r.time||"").slice(0,2)!==hh) return false;
            return true;
          });
        }
        var sortKey=null, sortDir=1;
        function sortRows(rows){
          if(!sortKey) return rows;
          var k=sortKey; var dir=sortDir;
          return rows.slice().sort(function(a,b){
            var va=(a[k]||'').toString(); var vb=(b[k]||'').toString();
            if(k==='date'||k==='time'){ return dir*(va.localeCompare(vb)); }
            return dir*(va.localeCompare(vb));
          });
        }
        function renderPage(n){
          cur = n;
          var rows = sortRows(applyTableFilter());
          var total = rows.length;
          var start = (cur-1)*pageSize, end = Math.min(start+pageSize,total);
          var slice = rows.slice(start,end);
          var html="";
          if(!slice.length) html='<tr><td colspan="'+(isChief?5:4)+'" class="text-white-50">Sem registros.</td></tr>';
          else {
            slice.forEach(function(r){
              html+='<tr>'
                +'<td>'+esc(r.date||"")+'</td>'
                +'<td>'+esc(r.time||"")+'</td>';
              if(isChief) html+='<td>'+esc(r.ip||"")+'</td>';
              html+='<td style="max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+esc(r.wallet||"")+'</td>'
                +'<td class="text-end" style="width:160px;white-space:nowrap;">'+pageChip(r.page||"")+'</td>'
                +'</tr>';
            });
          }
          tBody.innerHTML=html;
          var shownFrom = total ? (start + 1) : 0;
          var shownTo = total ? end : 0;
          info.textContent='Mostrando '+shownFrom+'-'+shownTo+' de '+total;
          var pages=Math.ceil(total/pageSize);
          if(pages>1){
            pager.style.display="";
            var phtml="";
            var maxBtns=Math.min(8,pages);
            var startBtn=Math.max(1,Math.min(cur-3,pages-maxBtns+1));
            for(var i=0;i<maxBtns;i++){var idx=startBtn+i;phtml+='<button class="btn btn-outline-secondary '+(idx===cur?'active':'')+'" data-pg="'+idx+'">'+idx+'</button>';}
            pager.innerHTML=phtml;
            pager.querySelectorAll('button[data-pg]').forEach(function(b){b.addEventListener('click',function(){var n=parseInt(b.getAttribute('data-pg'),10);if(Number.isFinite(n)) renderPage(n);});});
          } else {
            pager.style.display="none";
            pager.innerHTML="";
          }
        }
        document.getElementById("btnApplyTableFilter")?.addEventListener("click",function(){renderPage(1);});
        document.getElementById("btnClearTableFilter")?.addEventListener("click",function(){
          try{["fltPage","fltIp","fltHour","fltWallet"].forEach(function(id){var el=document.getElementById(id); if(el){ if(el.tagName==='SELECT'){ el.selectedIndex=0; } else { el.value=""; } }}); try{document.getElementById("fltPage")?.dispatchEvent(new Event("change"));}catch(_){ } renderPage(1);}catch(_){}
        });
        renderPage(1);

        try{
          var rows=document.querySelectorAll('#topPagesTable tbody tr td:first-child');
          rows.forEach(function(td){ var txt=td.textContent||''; td.innerHTML=pageChip(txt); });
        }catch(_){}
        document.getElementById('pageSizeSel')?.addEventListener('change',function(){
          var v=parseInt(this.value,10); if(Number.isFinite(v)&&v>0){ pageSize=v; renderPage(1); }
        });
        function setSelectColor(sel, key){
          try{
            var k=String(key||'');
            if(!sel) return;
            if(!k){ sel.style.color=''; return; }
            var clr=palette[hashKey(k)%palette.length];
            sel.style.color=clr;
          }catch(_){}
        }
        document.querySelectorAll('th.tc-sortable')?.forEach(function(th){
          th.style.cursor='pointer';
          th.addEventListener('click',function(){
            var k=th.getAttribute('data-sort'); if(!k) return;
            try{
              document.querySelectorAll('th.tc-sortable .tc-sort-ind').forEach(function(s){ s.textContent=''; });
              var ind = th.querySelector('.tc-sort-ind');
              if(sortKey!==k){
                sortKey=k;
                sortDir=1;
                if(ind) ind.textContent = '▲';
              } else if (sortDir===1) {
                sortDir=-1;
                if(ind) ind.textContent = '▼';
              } else {
                sortKey=null;
                sortDir=1;
              }
            }catch(_){}
            renderPage(1);
          });
        });
        document.getElementById('btnDownloadLog')?.addEventListener('click',function(){
          var fmt = 'txt';
          var date = String(d.value || "<?= htmlspecialchars($date, ENT_QUOTES, "UTF-8") ?>");
          try{
            var fp = String(document.getElementById('fltPage')?.value || '').trim();
            var fip = String(document.getElementById('fltIp')?.value || '').trim();
            var fw = String(document.getElementById('fltWallet')?.value || '').trim();
            var fh = String(document.getElementById('fltHour')?.value || '').trim();
            var url = new URL('download-log.php', window.location.href);
            url.searchParams.set('type','ip');
            url.searchParams.set('date',date);
            url.searchParams.set('format',fmt);
            if(fp) url.searchParams.set('page', fp);
            if(fip) url.searchParams.set('ip', fip);
            if(fw) url.searchParams.set('wallet', fw);
            if(fh) url.searchParams.set('hour', fh);
            window.location.href = url.toString();
          } catch(_) {
            window.location.href = 'download-log.php?type=ip&date='+encodeURIComponent(date)+'&format='+encodeURIComponent(fmt);
          }
        });
        try{
          var fp=document.getElementById('fltPage');
          var fip=document.getElementById('fltIp'); var fw=document.getElementById('fltWallet');
          function upd(){
            var v=String(fp?.value||'');
            setSelectColor(fp, v);
            setSelectColor(fip, String(fip?.value||''));
            setSelectColor(fw, String(fw?.value||''));
          }
          if(fp) fp.addEventListener('change',upd);
          if(fip) fip.addEventListener('change',upd);
          if(fw) fw.addEventListener('change',upd);
          upd();
        }catch(_){}
      })();
    </script>

    <div class="mt-4 d-flex justify-content-end">
      <a href="index.php?page=tools" class="btn btn-outline-success px-4 fw-bold">
        <i class="bi bi-house-door me-2"></i>Home
      </a>
    </div>
  <?php } ?>
</div>
