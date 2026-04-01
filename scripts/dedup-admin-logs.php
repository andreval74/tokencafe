<?php
declare(strict_types=1);

function admin_logs_dir(): string {
    return __DIR__ . "/../modules/logs/storage/admin-logs";
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
        if ($t === "data;hora;ip;wallet;page" || $t === "data;hora;ip;wallet;page;chain;contract") {
            if (!$headerWritten) {
                $out[] = "data;hora;ip;wallet;page;chain;contract";
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
