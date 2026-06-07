<?php
declare(strict_types=1);

function admin_logs_dir(): string {
    return __DIR__ . "/../modules/relatorios/storage/admin-logs";
}

function list_log_files(string $dir): array {
    $files = [];
    foreach (['IPLogs-*.php', 'SCLogs-*.php'] as $pattern) {
        foreach (glob($dir . DIRECTORY_SEPARATOR . $pattern) ?: [] as $fp) {
            if (is_file($fp)) $files[] = $fp;
        }
    }
    sort($files);
    return $files;
}

function ensure_sc_file(string $dir, string $date): string {
    $file = $dir . DIRECTORY_SEPARATOR . "SCLogs-" . $date . ".php";
    if (is_file($file)) return $file;
    @file_put_contents($file, "<?php exit; ?>\n" . "data;hora;ip;wallet;page;chain;contract;action\n", LOCK_EX);
    return $file;
}

function parse_csv_row(string $t): ?array {
    $t = trim($t);
    if ($t === "" || str_starts_with($t, "<?php")) return null;
    if (str_starts_with($t, "data;")) return null;
    $p = explode(";", $t);
    if (count($p) < 5) return null;
    return [
        "date" => trim((string) $p[0]),
        "time" => trim((string) $p[1]),
        "ip" => trim((string) ($p[2] ?? "")),
        "wallet" => trim((string) ($p[3] ?? "")),
        "page" => trim((string) ($p[4] ?? "")),
        "chain" => trim((string) ($p[5] ?? "")),
        "contract" => trim((string) ($p[6] ?? "")),
        "action" => trim((string) ($p[7] ?? "")),
    ];
}

function migrate_ip_to_sc(string $dir, string $ipFile): array {
    $bn = basename($ipFile);
    if (!preg_match('/^IPLogs-(\d{4}-\d{2}-\d{2})\.php$/', $bn, $m)) {
        return ["file" => $ipFile, "migrated" => 0];
    }
    $date = $m[1];
    $scFile = ensure_sc_file($dir, $date);
    $lines = @file($ipFile, FILE_IGNORE_NEW_LINES);
    if (!is_array($lines)) return ["file" => $ipFile, "migrated" => 0];

    $append = [];
    foreach ($lines as $ln) {
        $row = parse_csv_row((string) $ln);
        if (!$row) continue;
        $action = strtolower(trim((string) ($row["action"] ?? "")));
        if ($action !== "" && $action !== "visit") continue;
        $append[] =
            $row["date"] . ";" .
            $row["time"] . ";" .
            $row["ip"] . ";" .
            $row["wallet"] . ";" .
            $row["page"] . ";" .
            $row["chain"] . ";" .
            $row["contract"] . ";" .
            "visit";
    }

    if ($append) {
        @file_put_contents($scFile, implode("\n", $append) . "\n", FILE_APPEND | LOCK_EX);
    }

    return ["file" => $ipFile, "migrated" => count($append)];
}

function dedup_file(string $file): array {
    $lines = @file($file, FILE_IGNORE_NEW_LINES);
    if (!is_array($lines)) return ['file' => $file, 'kept' => 0, 'removed' => 0, 'changed' => false];

    $out = [];
    $seen = [];
    $kept = 0;
    $removed = 0;
    $headerWritten = false;

    foreach ($lines as $idx => $ln) {
        $raw = rtrim($ln, "\r\n");
        $t = trim($raw);
        if ($idx === 0 && str_starts_with($t, "<?php")) {
            $out[] = "<?php exit; ?>";
            $kept++;
            continue;
        }
        if (str_starts_with($t, "data;hora;ip;wallet;page")) {
            if (!$headerWritten) {
                $out[] = "data;hora;ip;wallet;page;chain;contract;action";
                $kept++;
                $headerWritten = true;
            }
            continue;
        }
        if ($t === "") continue;
        $p = explode(";", $t);
        if (count($p) >= 5) {
            $key = trim((string) $p[0]) . ";" . trim((string) $p[1]) . ";" . trim((string) $p[2]) . ";" . trim((string) $p[3]) . ";" . trim((string) $p[4]);
            if (isset($seen[$key])) {
                $removed++;
                continue;
            }
            $seen[$key] = true;
        }
        $out[] = $t;
        $kept++;
    }

    // Gravar somente se mudou
    $changed = (implode("\n", $lines) !== implode("\n", $out));
    if ($changed) {
        $bak = $file . "." . gmdate("Ymd-His") . ".bak";
        @copy($file, $bak);
        @file_put_contents($file, implode("\n", $out) . "\n");
    }

    return ['file' => $file, 'kept' => $kept, 'removed' => $removed, 'changed' => $changed];
}

function main(): int {
    $dir = admin_logs_dir();
    if (!is_dir($dir)) {
        echo "Diretório não encontrado: $dir" . PHP_EOL;
        return 1;
    }
    $doMigrate = in_array("--migrate-ip-to-sc", $_SERVER["argv"] ?? [], true);
    if ($doMigrate) {
        $ipFiles = glob($dir . DIRECTORY_SEPARATOR . "IPLogs-*.php") ?: [];
        $migrated = 0;
        foreach ($ipFiles as $fp) {
            $res = migrate_ip_to_sc($dir, (string) $fp);
            $migrated += (int) ($res["migrated"] ?? 0);
        }
        echo "Migração IPLogs -> SCLogs (visit): $migrated" . PHP_EOL;
    }
    $files = list_log_files($dir);
    if (!$files) {
        echo "Nenhum arquivo para processar em $dir" . PHP_EOL;
        return 0;
    }
    $totalRemoved = 0;
    foreach ($files as $fp) {
        $res = dedup_file($fp);
        $totalRemoved += $res['removed'];
        $mark = $res['changed'] ? "*" : "-";
        echo "{$mark} " . basename($res['file']) . " -> removidos: {$res['removed']}" . PHP_EOL;
    }
    echo "Total removido: $totalRemoved" . PHP_EOL;
    return 0;
}

exit(main());
