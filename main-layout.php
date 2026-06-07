<?php
/* ============================================================================
   MAIN-LAYOUT.PHP — Layout mestre do portal TokenCafe
   Montagem da página HTML completa: <html> → head → body → sidebar →
   header → conteúdo do módulo ($module_content) → footer → </html>.
   Controlado pelas opções do render_page() definidas em index.php:
     $bodyClass       → classe CSS do <body>
     $showSidebar     → exibe includes/sidebar.php (app shell)
     $showHeader      → exibe includes/header.php (padrão true)
   Inclui sempre: head.php, footer.php.
   ============================================================================ */
require_once __DIR__ . "/includes/config.php";
?>
<!doctype html>
<html lang="pt-BR">
  <?php include __DIR__ . "/includes/head.php"; ?>

  <body class="<?= htmlspecialchars($bodyClass ?? "bg-page-black", ENT_QUOTES, "UTF-8") ?>">
    <?php if (isset($showSidebar) && $showSidebar === true) { ?>
      <?php include __DIR__ . "/includes/sidebar.php"; ?>
    <?php } ?>

    <main id="app-content" class="tokencafe-app-content">
      <?php if (!isset($showHeader) || $showHeader) { ?>
        <?php include __DIR__ . "/includes/header.php"; ?>
      <?php } ?>

      <?php echo $module_content ?? ""; ?>

      <?php include __DIR__ . "/includes/footer.php"; ?>
    </main>
  </body>
</html>
