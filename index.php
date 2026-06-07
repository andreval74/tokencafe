<?php
/* ============================================================================
   INDEX.PHP — Ponto de entrada e roteador principal do portal TokenCafe
   Lê ?page=<slug> e resolve o arquivo de módulo via tokencafe_resolve_page().
   Decide entre dois layouts:
     App Shell (tools, módulos internos, sessão autorizada) → sidebar + header module
     Site público (landing, páginas de conteúdo) → header padrão sem sidebar
   Redireciona para not-migrated.php quando o slug não tem arquivo mapeado.
   ============================================================================ */
try {
  $host = isset($_SERVER["HTTP_HOST"]) ? (string) $_SERVER["HTTP_HOST"] : "";
  $isLocal =
    $host === "localhost" ||
    str_starts_with($host, "localhost:") ||
    $host === "127.0.0.1" ||
    str_starts_with($host, "127.0.0.1:") ||
    $host === "::1" ||
    str_starts_with($host, "[::1]:");
  if ($isLocal) {
    ini_set("display_errors", "1");
    ini_set("display_startup_errors", "1");
    error_reporting(E_ALL);
  }
} catch (Throwable $e) {}
require_once __DIR__ . "/includes/config.php";
require __DIR__ . "/includes/render.php";

$page = isset($_GET["page"]) ? (string) $_GET["page"] : "home";
if (in_array($page, ["admin", "logs-resumo", "meu-dashboard"], true)) $page = "logs";
$resolved = tokencafe_resolve_page($page);

if ($resolved && is_file($resolved)) {
  $resolvedNorm = strtolower(str_replace("\\", "/", (string) $resolved));
  $isSiteView = str_contains($resolvedNorm, "/modules/site/") || str_contains($resolvedNorm, "/modules/indicacao/");
  $sessionCookieRaw = isset($_COOKIE["tokencafe_wallet_session_authorized"]) ? (string) $_COOKIE["tokencafe_wallet_session_authorized"] : "";
  $sessionCookieRaw = strtolower(trim(urldecode($sessionCookieRaw)));
  $isSessionAuthorized = in_array($sessionCookieRaw, ["1", "true", "yes", "on"], true);
  $isInShell = $isSessionAuthorized && in_array($page, ["tools", "suporte", "ia-chat", "privacidade", "termos-e-servicos", "documentacao", "social", "indicar", "indicacao"], true);
  $isAppShell = $isInShell || !$isSiteView;

  if ($isAppShell) {
    $guess = function_exists("__tokencafe_guess_title") ? __tokencafe_guess_title($resolved) : null;
    $options = [
      "bodyClass" => "bg-page-black",
      "showSidebar" => true,
      "headerVariant" => "module",
      "moduleHeaderTitle" => is_array($guess) && isset($guess["title"]) ? (string) $guess["title"] : "TokenCafe",
      "moduleHeaderSubtitle" => is_array($guess) && isset($guess["subtitle"]) ? (string) $guess["subtitle"] : "Dashboard",
      "moduleHeaderIcon" => is_array($guess) && isset($guess["icon"]) ? (string) $guess["icon"] : "bi-grid",
      "moduleHeaderIconAlt" => is_array($guess) && isset($guess["iconAlt"]) ? (string) $guess["iconAlt"] : "TokenCafe",
    ];

    if ($page === "tools") {
      $options["moduleHeaderTitle"] = "TokenCafe Tools";
      $options["moduleHeaderSubtitle"] = "Hub Central de Ferramentas Web3";
      $options["moduleHeaderIcon"] = "bi-tools";
      $options["moduleHeaderIconAlt"] = "Tools";
    }

    render_page($resolved, $options);
  } else {
    $isLanding = in_array($page, ["", "home", "entrada"], true);
    $options = [
      "bodyClass" => "bg-page-black" . ($isLanding ? " tc-entry-page" : ""),
      "showSidebar" => false,
      "headerVariant" => "default",
    ];
    if ($isLanding) {
      $options["pageTitle"]            = "TokenCafe — Crie seu Token ERC-20 em Minutos, Sem Código";
      $options["pageDescription"]      = "Plataforma no-code para criar, validar e publicar tokens ERC-20 em +30 blockchains. Sem cadastro, sem mensalidade, pague só quando publicar.";
      $options["pageKeywords"]         = "criar token, token ERC-20, smart contract, deploy blockchain, token sem código, web3, BNB, Ethereum, Polygon";
      $options["pageOgTitle"]          = "TokenCafe — Crie seu Token em Minutos";
      $options["pageOgDescription"]    = "Configure, valide e publique contratos inteligentes direto da sua carteira. Sem código, sem cadastro, sem mensalidade.";
      $options["pageOgImage"]          = "assets/imgs/tkncafe512x512.png";
      $options["pageTwitterTitle"]     = "TokenCafe — Crie seu Token ERC-20 em Minutos";
      $options["pageTwitterDescription"] = "Plataforma no-code para criar e publicar tokens em +30 blockchains. Pague só quando usar.";
      $options["pageTwitterImage"]     = "assets/imgs/tkncafe512x512.png";
      $options["pageCanonical"]        = "https://tokencafe.app/";
    }
    render_page($resolved, $options);
  }
} else {
  render_page(__DIR__ . "/modules/site/not-migrated.php", [
    "pageTitle"     => "Módulo não migrado - TokenCafe",
    "bodyClass"     => "bg-page-black",
    "showSidebar"   => false,
    "headerVariant" => "default",
    "missingModule" => $page,
  ]);
}
