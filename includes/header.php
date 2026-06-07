<?php
/* ============================================================================
   HEADER.PHP — Cabeçalho global do portal TokenCafe
   Dois modos controlados por $headerVariant:
     "module" → monta data-attributes para tools-header.js renderizar a navbar
                das ferramentas (com chip de carteira e controles);
     qualquer outro valor → navbar Bootstrap padrão do site público.
   Lê variáveis opcionais: $moduleHeaderTitle, $moduleHeaderSubtitle,
   $moduleHeaderIcon, $moduleHeaderIconAlt.
   ============================================================================ */
$headerVariant = isset($headerVariant) && is_string($headerVariant) ? $headerVariant : "default";
$moduleHeaderTitle = isset($moduleHeaderTitle) && is_string($moduleHeaderTitle) ? $moduleHeaderTitle : "TokenCafe Tools";
$moduleHeaderSubtitle = isset($moduleHeaderSubtitle) && is_string($moduleHeaderSubtitle) ? $moduleHeaderSubtitle : "Hub Central de Ferramentas Web3";
$moduleHeaderIcon = isset($moduleHeaderIcon) && is_string($moduleHeaderIcon) ? $moduleHeaderIcon : "bi-tools";
$moduleHeaderIconAlt = isset($moduleHeaderIconAlt) && is_string($moduleHeaderIconAlt) ? $moduleHeaderIconAlt : "Tools";
?>

<?php if ($headerVariant === "module") { ?>
  <div
    data-component="tools-header.php"
    data-header-mode="app"
    data-icon="<?= htmlspecialchars($moduleHeaderIcon, ENT_QUOTES, "UTF-8") ?>"
    data-icon-alt="<?= htmlspecialchars($moduleHeaderIconAlt, ENT_QUOTES, "UTF-8") ?>"
    data-title="<?= htmlspecialchars($moduleHeaderTitle, ENT_QUOTES, "UTF-8") ?>"
    data-subtitle="<?= htmlspecialchars($moduleHeaderSubtitle, ENT_QUOTES, "UTF-8") ?>"></div>
<?php } else { ?>
  <header>
    <nav class="navbar navbar-expand-lg navbar-dark fixed-top tc-navbar">
      <div class="container">
        <a href="index.php" title="Home" class="navbar-brand d-flex align-items-center gap-2 text-no-decoration m-0">
          <img src="assets/imgs/tkncafe-semfundo.png" alt="TokenCafe Logo" class="logo-standard" />
          <div class="d-flex flex-column lh-1">
            <span class="fw-bold text-white fs-4">
              Token
              <span class="text-warning">Cafe</span>
            </span>
            <small class="text-white-50 text-small">Plataforma Web3</small>
          </div>
        </a>

        <button
          class="navbar-toggler border-0 shadow-sm"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarNav">

          <ul class="navbar-nav mx-auto gap-lg-1">
            <!--
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="index.php?page=suporte">
                <i class="bi bi-headset me-1"></i>
                Suporte
              </a>
            </li>


            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="index.php#comofunciona">
                <i class="bi bi-gear me-1"></i>
                Como Funciona
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="index.php#ecosistema">
                <i class="bi bi-boxes me-1"></i>
                Módulos
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link text-white-50 fw-medium neon-link-hover" href="index.php?page=social">
                <i class="bi bi-people me-1"></i>
                Social
              </a>
            </li>
            -->
          </ul>

          <div class="d-flex align-items-center gap-2">
            <!-- Indicar TokenCafe -->
            <a href="index.php?page=indicar" class="tc-hdr-btn tc-hdr-btn-share" title="Indique o TokenCafe e ganhe bônus">
              <i class="bi bi-share-fill"></i>
            </a>
            <!-- Tema -->
            <button id="theme-toggle" class="tc-hdr-btn tc-hdr-btn-theme" type="button" title="Alternar Tema">
              <i class="bi bi-sun" id="theme-icon"></i>
            </button>
            <!-- Idioma -->
            <button id="language-toggle-btn" class="tc-hdr-btn tc-hdr-btn-lang" type="button" title="Mudar Idioma">
              <i class="bi bi-globe" id="language-icon"></i>
            </button>
            <!-- IA Assistant -->
            <button id="tc-ia-header-btn" class="tc-hdr-btn tc-hdr-btn-ia" type="button" title="TokenCafe IA — Assistente">
              <i class="bi bi-robot"></i>
            </button>
            <!-- MetaMask -->
            <div id="header-wallet-status" class="d-none">
              <small class="text-white-50">
                <i class="bi bi-wallet2 me-1"></i>
                <span id="header-wallet-address"></span>
              </small>
            </div>

            <button id="connect-metamask-btn" class="btn btn-sm btn-primary fw-bold" type="button" title="Conectar MetaMask">
              <i class="bi bi-wallet2 me-1"></i>
              Conectar
            </button>
          </div>
        </div>
      </div>
    </nav>
  </header>
<?php } ?>
