<?php
/**
 * Router script para o servidor PHP built-in (npm run serve / php -S).
 *
 * Intercepta requisições de .js e .css para forçar revalidação de cache,
 * resolvendo o problema de módulos ES cacheados entre refreshes (Ctrl+F5).
 *
 * Para tudo mais (PHP, imagens, fontes…) retorna false e deixa o servidor
 * built-in servir normalmente.
 */

$uri  = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$file = __DIR__ . $uri;

if (preg_match('/\.(js|css)$/', $uri) && is_file($file)) {
    // no-store: browser nunca armazena — sempre busca do servidor.
    // Cobre o PHP built-in server (Apache usa .htaccess para o mesmo efeito).
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');

    $ext = strtolower(pathinfo($uri, PATHINFO_EXTENSION));
    if ($ext === 'js') {
        header('Content-Type: application/javascript; charset=UTF-8');
    } else {
        header('Content-Type: text/css; charset=UTF-8');
    }

    readfile($file);
    return true;
}

// Delega ao servidor built-in (PHP, imagens, etc.)
return false;
