<?php
/*
 * Layout mestre do TokenCafe:
 * - Inclui head/header/footer padronizados (includes/)
 * - Injeta o HTML do módulo em $module_content
 * - Pode ocultar header/sidebar via opções do render_page()
 */
require_once __DIR__ . "/includes/config.php";
?>
<!doctype html>
<html lang="pt-BR">
  <?php include __DIR__ . "/includes/head.php"; ?>

  <body class="<?= htmlspecialchars($bodyClass ?? "bg-page-black", ENT_QUOTES, "UTF-8") ?>">
    <?php if (!isset($showHeader) || $showHeader) { ?>
      <?php include __DIR__ . "/includes/header.php"; ?>
    <?php } ?>
    <?php if (isset($showSidebar) && $showSidebar === true) { ?>
      <?php include __DIR__ . "/includes/sidebar.php"; ?>
    <?php } ?>

    <main id="app-content" class="tokencafe-app-content">
      <?php echo $module_content ?? ""; ?>
    </main>

    <?php include __DIR__ . "/includes/footer.php"; ?>
